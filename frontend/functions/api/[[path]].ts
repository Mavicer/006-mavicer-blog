/**
 * Cloudflare Pages Function — public blog interaction API.
 *
 * Anonymous likes; server-authenticated account comments and favorites.
 * Legacy anonymous comments and favorite counts remain readable.
 *
 * Routes (mounted under /api by Pages):
 *   GET    /posts
 *   GET    /posts/:slug
 *   GET    /posts/:slug/comments
 *   POST   /posts/:slug/comments            body: { body } (session required)
 *   PATCH  /posts/:slug/comments/:id         body: { body } (owner only)
 *   DELETE /posts/:slug/comments/:id         (session required)
 *   GET    /posts/:slug/interactions?client_id=
 *   POST   /posts/:slug/like                body: { client_id }
 *   PUT/DELETE /posts/:slug/favorite       (session required)
 *   GET/POST /visits                          → { pv, online } (first-party D1 counter)
 *
 * D1 binding: env.DB.
 */

import staticPostSlugs from "../../generated/static-post-slugs.json";
import staticPostCatalog from "../../generated/static-posts.json";
import { authRoute, currentUser, requireUser, type User } from "../../server/auth";
import { ensureAccounts } from "../../server/schema";
import { publishingRoute } from "../../server/publishing";
import { checkWrite, HttpError, json, readBody, rateLimit, type Context as ApiContext } from "../../server/http";
import { visitsRoute } from "../../server/visits";

import { nexusSsoRoute } from "../../server/nexus-sso";

const staticPosts = new Set(staticPostSlugs);

async function postExists(ctx: ApiContext, slug: string): Promise<boolean> {
  if (staticPosts.has(slug)) return true;
  const row = await ctx.env.DB.prepare(
    `SELECT slug FROM post WHERE slug = ? AND published = 1`
  ).bind(slug).first();
  return !!row;
}

let migrated = false;

export const onRequest: PagesFunction<import("../../server/http").Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const method = ctx.request.method;

  try {
    checkWrite(ctx.request);
    await ensureAccounts(ctx);
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (path === "health" && method === "GET") return json({ ok: true });
    if (path === "visits") return await visitsRoute(ctx);

    // Legacy comment indexes are independent of the accounts schema.
    if (!migrated) {
      try { await migrateCommentTable(ctx); migrated = true; }
      catch { /* Retry the legacy migration on the next request. */ }
    }

    const sso = await nexusSsoRoute(ctx, path);
    if (sso) return sso;
    const auth = await authRoute(ctx, path);
    if (auth) return auth;
    const publishing = await publishingRoute(ctx, path);
    if (publishing) return publishing;
    if (path === "me/favorites" && method === "GET") return await myFavorites(ctx);
    if (path === "posts" && method === "GET") {
      return await listPosts(ctx);
    }
    const single = path.match(/^posts\/([^/]+)$/);
    if (single && method === "GET") {
      return await getPost(ctx, decodeURIComponent(single[1]));
    }
    const cmts = path.match(/^posts\/([^/]+)\/comments$/);
    if (cmts && method === "GET") {
      return await listComments(ctx, decodeURIComponent(cmts[1]));
    }
    if (cmts && method === "POST") {
      return await createComment(ctx, decodeURIComponent(cmts[1]));
    }
    const comment = path.match(/^posts\/([^/]+)\/comments\/(\d+)$/);
    if (comment && method === "PATCH") {
      return await updateComment(ctx, decodeURIComponent(comment[1]), Number(comment[2]));
    }
    if (comment && method === "DELETE") {
      return await deleteComment(ctx, decodeURIComponent(comment[1]), Number(comment[2]));
    }
    const inter = path.match(/^posts\/([^/]+)\/interactions$/);
    if (inter && method === "GET") {
      const clientId = url.searchParams.get("client_id") || "";
      return await getInteractions(ctx, decodeURIComponent(inter[1]), clientId);
    }
    const like = path.match(/^posts\/([^/]+)\/like$/);
    if (like && method === "POST") {
      return await toggleInteraction(ctx, decodeURIComponent(like[1]), "like");
    }
    const fav = path.match(/^posts\/([^/]+)\/favorite$/);
    if (fav && ["POST", "PUT", "DELETE"].includes(method)) {
      return await saveFavorite(ctx, decodeURIComponent(fav[1]));
    }

    return jsonError(404, "Not Found");
  } catch (e: any) {
    if (e instanceof HttpError) return jsonError(e.status, e.message);
    const requestId = crypto.randomUUID();
    console.error(JSON.stringify({ event: "api_error", requestId, method, path, message: String(e?.message || e) }));
    return json({ detail: "服务暂时不可用，请稍后重试", request_id: requestId }, 503);
  }
};

// ── helpers ──────────────────────────────────────────────────────────

function jsonError(status: number, detail: string): Response {
  return json({ detail }, status);
}

function tagsList(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Add client_id column + indexes if missing (idempotent).
 * Wrapped in try/catch by caller — never blocks requests.
 */
async function migrateCommentTable(ctx: ApiContext): Promise<void> {
  const { results } = await ctx.env.DB.prepare(`PRAGMA table_info(comment)`).all<{
    name: string;
  }>();
  const hasCol = results.some((r) => r.name === "client_id");
  if (!hasCol) {
    try {
      await ctx.env.DB.prepare(
        `ALTER TABLE comment ADD COLUMN client_id TEXT NOT NULL DEFAULT ''`
      ).run();
    } catch {
      // "duplicate column name" — another isolate beat us to it. Safe to ignore.
    }
  }
  // Ensure indexes exist (idempotent, no-op if already present).
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_comment_slug ON comment(post_slug)`
    ),
    ctx.env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_like_slug_client ON "like"(post_slug, client_id)`
    ),
    ctx.env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_fav_slug_client ON favorite(post_slug, client_id)`
    ),
  ]);
}

// ── endpoints ────────────────────────────────────────────────────────

interface PostRow {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  source: string;
  category: string;
  tags: string;
  body: string;
  published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function postOut(p: PostRow) {
  return {
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt,
    source: p.source,
    category: p.category,
    tags: tagsList(p.tags),
  };
}

function postDetail(p: PostRow) {
  return { ...postOut(p), body: p.body };
}

async function listPosts(ctx: ApiContext): Promise<Response> {
  // Exclude body — list page only needs metadata.
  const { results } = await ctx.env.DB.prepare(
    `SELECT slug, title, date, excerpt, source, category, tags, published, sort_order, created_at, updated_at FROM post WHERE published = 1 ORDER BY sort_order ASC, date DESC`
  ).all<PostRow>();
  return json(results.map(postOut));
}

async function getPost(ctx: ApiContext, slug: string): Promise<Response> {
  const p = await ctx.env.DB.prepare(`SELECT * FROM post WHERE slug = ?`)
    .bind(slug)
    .first<PostRow>();
  if (!p || !p.published) return jsonError(404, "文章不存在");
  return json(postDetail(p));
}

interface CommentRow {
  id: number;
  post_slug: string;
  body: string;
  author_name: string;
  client_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

function commentOut(c: CommentRow, user: User | null) {
  return {
    id: c.id,
    post_slug: c.post_slug,
    body: c.body,
    author_name: c.author_name,
    created_at: c.created_at,
    updated_at: c.updated_at,
    is_own: !!user && c.user_id === user.id,
  };
}

async function listComments(
  ctx: ApiContext,
  slug: string
): Promise<Response> {
  const user = await currentUser(ctx);
  const { results } = await ctx.env.DB.prepare(
    `SELECT * FROM comment WHERE post_slug = ? ORDER BY created_at DESC LIMIT 500`
  )
    .bind(slug)
    .all<CommentRow>();
  return json(results.map((c) => commentOut(c, user)));
}

async function createComment(ctx: ApiContext, slug: string): Promise<Response> {
  const user = await requireUser(ctx);
  await rateLimit(ctx, "comment", user.id, 20, 3600);
  const payload = await readBody(ctx.request);
  if (!(await postExists(ctx, slug))) return jsonError(404, "文章不存在");

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 3000) return jsonError(422, "评论需为 1–3000 个字符");

  const author = user.display_name;
  const now = new Date().toISOString();

  const result = await ctx.env.DB.prepare(
    `INSERT INTO comment (post_slug, body, author_name, client_id, user_id, created_at, updated_at) VALUES (?, ?, ?, '', ?, ?, ?)`
  )
    .bind(slug, body, author, user.id, now, now)
    .run();
  const id = result.meta?.last_row_id as number;

  return json(
    {
      id,
      post_slug: slug,
      body,
      author_name: author,
      created_at: now,
      updated_at: now,
      is_own: true,
    },
    201
  );
}

async function updateComment(ctx: ApiContext, slug: string, commentId: number): Promise<Response> {
  const user = await requireUser(ctx);
  if (!user.is_owner) return jsonError(403, "仅博主可编辑评论");
  await rateLimit(ctx, "comment-edit", user.id, 120, 3600);
  const payload = await readBody(ctx.request);
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 3000) return jsonError(422, "评论需为 1–3000 个字符");

  // Keep the original author and publication time; only the owner can edit.
  const comment = await ctx.env.DB.prepare(
    `UPDATE comment SET body = ?, updated_at = ? WHERE id = ? AND post_slug = ? RETURNING *`
  ).bind(body, new Date().toISOString(), commentId, slug).first<CommentRow>();
  if (!comment) return jsonError(404, "评论不存在");
  return json(commentOut(comment, user));
}

async function deleteComment(
  ctx: ApiContext,
  slug: string,
  commentId: number
): Promise<Response> {
  const user = await requireUser(ctx);

  const c = await ctx.env.DB.prepare(
    `SELECT user_id FROM comment WHERE id = ? AND post_slug = ?`
  )
    .bind(commentId, slug)
    .first<{ user_id: string | null }>();

  if (!c) return jsonError(404, "评论不存在");
  if (!user.is_owner && c.user_id !== user.id) {
    return jsonError(403, "无权撤回这条评论");
  }

  const result = await ctx.env.DB.prepare(`DELETE FROM comment WHERE id = ? AND post_slug = ?`)
    .bind(commentId, slug)
    .run();
  if (!result.meta.changes) return jsonError(404, "评论不存在");
  return json({ ok: true });
}

/**
 * Count and browser-state lookup in one query after validating the article.
 */
async function getInteractions(
  ctx: ApiContext,
  slug: string,
  clientId: string
): Promise<Response> {
  if (!(await postExists(ctx, slug))) return jsonError(404, "文章不存在");
  const user = await currentUser(ctx);
  const row = await ctx.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM "like" WHERE post_slug = ?) AS likes,
       ((SELECT COUNT(*) FROM favorite WHERE post_slug = ?) + (SELECT COUNT(*) FROM account_favorite WHERE post_slug = ?)) AS favorites,
       ? != '' AND EXISTS(SELECT 1 FROM "like" WHERE post_slug = ? AND client_id = ?) AS liked,
       EXISTS(SELECT 1 FROM account_favorite WHERE post_slug = ? AND user_id = ?) AS favorited
    `
  )
    .bind(slug, slug, slug, clientId, slug, clientId, slug, user?.id || "")
    .first<{
      likes: number;
      favorites: number;
      liked: number;
      favorited: number;
    }>();

  if (!row) throw new Error("Missing interaction counts");

  return json({
    post_slug: slug,
    likes: row.likes ?? 0,
    favorites: row.favorites ?? 0,
    liked: !!row.liked,
    favorited: !!row.favorited,
  });
}

async function toggleInteraction(ctx: ApiContext, slug: string, _table: "like"): Promise<Response> {
  const payload = await readBody(ctx.request);
  const clientId = typeof payload.client_id === "string" ? payload.client_id.trim() : "";
  if (!clientId || clientId.length > 120) return jsonError(422, "无效的浏览器标识");
  if (!(await postExists(ctx, slug))) return jsonError(404, "文章不存在");
  await rateLimit(ctx, "like", ctx.request.headers.get("CF-Connecting-IP") || clientId, 60, 60);
  let desired = payload.liked;
  if (typeof desired !== "boolean") {
    desired = !(await ctx.env.DB.prepare(`SELECT id FROM "like" WHERE post_slug = ? AND client_id = ?`).bind(slug, clientId).first());
  }
  if (desired) {
    // A repeated request cannot create duplicate likes.
    await ctx.env.DB.prepare(`INSERT INTO "like" (post_slug, client_id) SELECT ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM "like" WHERE post_slug = ? AND client_id = ?)`)
      .bind(slug, clientId, slug, clientId).run();
  } else {
    await ctx.env.DB.prepare(`DELETE FROM "like" WHERE post_slug = ? AND client_id = ?`).bind(slug, clientId).run();
  }
  return getInteractions(ctx, slug, clientId);
}

async function saveFavorite(ctx: ApiContext, slug: string): Promise<Response> {
  const user = await requireUser(ctx);
  if (ctx.request.method === "POST") throw new HttpError(405, "请使用 PUT 收藏或 DELETE 取消收藏");
  if (!(await postExists(ctx, slug))) return jsonError(404, "文章不存在");
  await rateLimit(ctx, "favorite", user.id, 120, 60);
  if (ctx.request.method === "PUT") {
    await ctx.env.DB.prepare(`INSERT OR IGNORE INTO account_favorite (user_id, post_slug, created_at) VALUES (?, ?, ?)`)
      .bind(user.id, slug, new Date().toISOString()).run();
  } else {
    await ctx.env.DB.prepare(`DELETE FROM account_favorite WHERE user_id = ? AND post_slug = ?`).bind(user.id, slug).run();
  }
  return getInteractions(ctx, slug, new URL(ctx.request.url).searchParams.get("client_id") || "");
}

async function myFavorites(ctx: ApiContext): Promise<Response> {
  const user = await requireUser(ctx);
  const { results } = await ctx.env.DB.prepare(`SELECT f.post_slug, p.* FROM account_favorite f
    LEFT JOIN post p ON p.slug = f.post_slug WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 500`)
    .bind(user.id).all<PostRow & { post_slug: string }>();
  const catalog = new Map(staticPostCatalog.map((p) => [p.slug, p]));
  return json(results.flatMap<Record<string, unknown>>((row) => {
    const local = catalog.get(row.post_slug);
    if (local) return [local];
    return row.published ? [{ ...postOut(row), published: true, sortOrder: row.sort_order }] : [];
  }));
}
