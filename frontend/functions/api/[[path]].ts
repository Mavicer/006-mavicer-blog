/**
 * Cloudflare Pages Function — public blog interaction API.
 *
 * Phase 1+2: the anonymous comment / like / favorite / post-read flow,
 * plus comment self-deletion keyed by browser client_id.
 *
 * Routes (mounted under /api by Pages):
 *   GET    /posts
 *   GET    /posts/:slug
 *   GET    /posts/:slug/comments?client_id=
 *   POST   /posts/:slug/comments            body: { body, author_name?, client_id }
 *   DELETE /posts/:slug/comments/:id         body: { client_id }
 *   GET    /posts/:slug/interactions?client_id=
 *   POST   /posts/:slug/like                body: { client_id }
 *   POST   /posts/:slug/favorite            body: { client_id }
 *
 * D1 binding: env.DB. Response shape mirrors the FastAPI backend so the
 * frontend (lib/api.ts) needs zero changes: errors return { detail } and
 * the same status codes (403 / 404 / 422 / 409) it already parses.
 */

interface Env {
  DB: D1Database;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: CORS });

let migrated = false;

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const path = url.pathname.replace(/^\/api\/?/, ""); // strip "/api"
  const method = ctx.request.method;

  if (ctx.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Run schema migration once per isolate (idempotent).
  if (!migrated) {
    await migrateCommentTable(ctx);
    migrated = true;
  }

  try {
    // GET /posts
    if (path === "posts" && method === "GET") {
      return await listPosts(ctx);
    }
    // GET /posts/:slug
    const single = path.match(/^posts\/([^/]+)$/);
    if (single && method === "GET") {
      return await getPost(ctx, decodeURIComponent(single[1]));
    }
    // GET/POST /posts/:slug/comments
    const cmts = path.match(/^posts\/([^/]+)\/comments$/);
    if (cmts && method === "GET") {
      const cid = url.searchParams.get("client_id") || "";
      return await listComments(ctx, decodeURIComponent(cmts[1]), cid);
    }
    if (cmts && method === "POST") {
      return await createComment(ctx, decodeURIComponent(cmts[1]));
    }
    // DELETE /posts/:slug/comments/:id
    const del = path.match(/^posts\/([^/]+)\/comments\/(\d+)$/);
    if (del && method === "DELETE") {
      return await deleteComment(ctx, decodeURIComponent(del[1]), Number(del[2]));
    }
    // GET /posts/:slug/interactions
    const inter = path.match(/^posts\/([^/]+)\/interactions$/);
    if (inter && method === "GET") {
      const clientId = url.searchParams.get("client_id") || "";
      return await getInteractions(ctx, decodeURIComponent(inter[1]), clientId);
    }
    // POST /posts/:slug/like
    const like = path.match(/^posts\/([^/]+)\/like$/);
    if (like && method === "POST") {
      return await toggleInteraction(ctx, decodeURIComponent(like[1]), "like");
    }
    // POST /posts/:slug/favorite
    const fav = path.match(/^posts\/([^/]+)\/favorite$/);
    if (fav && method === "POST") {
      return await toggleInteraction(ctx, decodeURIComponent(fav[1]), "favorite");
    }

    return jsonError(404, "Not Found");
  } catch (e: any) {
    return jsonError(500, e?.message || "Internal Server Error");
  }
};

// ── helpers ──────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function jsonError(status: number, detail: string): Response {
  return json({ detail }, status);
}

async function readBody(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function tagsList(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Add client_id column to the comment table if missing (idempotent).
 * Old comments get the default empty string and are only deletable by owner.
 */
async function migrateCommentTable(ctx: PagesFunction<Env>): Promise<void> {
  const { results } = await ctx.env.DB.prepare(`PRAGMA table_info(comment)`).all<{
    name: string;
  }>();
  const hasCol = results.some((r) => r.name === "client_id");
  if (!hasCol) {
    await ctx.env.DB.prepare(`ALTER TABLE comment ADD COLUMN client_id TEXT NOT NULL DEFAULT ''`).run();
  }
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

async function listPosts(ctx: PagesFunction<Env>): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(
    `SELECT * FROM post WHERE published = 1 ORDER BY sort_order ASC, date DESC`
  ).all<PostRow>();
  return json(results.map(postOut));
}

async function getPost(ctx: PagesFunction<Env>, slug: string): Promise<Response> {
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
  created_at: string;
  updated_at: string;
}

function commentOut(c: CommentRow, requestingClientId: string) {
  return {
    id: c.id,
    post_slug: c.post_slug,
    body: c.body,
    author_name: c.author_name,
    created_at: c.created_at,
    updated_at: c.updated_at,
    is_own: !!requestingClientId && c.client_id === requestingClientId,
  };
}

async function listComments(
  ctx: PagesFunction<Env>,
  slug: string,
  requestingClientId: string
): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(
    `SELECT * FROM comment WHERE post_slug = ? ORDER BY created_at DESC`
  )
    .bind(slug)
    .all<CommentRow>();
  return json(results.map((c) => commentOut(c, requestingClientId)));
}

async function createComment(ctx: PagesFunction<Env>, slug: string): Promise<Response> {
  const payload = await readBody(ctx.request);
  // post must exist
  const p = await ctx.env.DB.prepare(`SELECT slug FROM post WHERE slug = ?`)
    .bind(slug)
    .first();
  if (!p) return jsonError(404, "文章不存在");

  const body = (payload.body || "").toString().trim();
  if (!body) return jsonError(422, "评论不能为空");

  const author = ((payload.author_name || "").toString().trim() || "访客").slice(0, 60);
  const clientId = (payload.client_id || "").toString().trim().slice(0, 120);
  const now = new Date().toISOString();

  const result = await ctx.env.DB.prepare(
    `INSERT INTO comment (post_slug, body, author_name, client_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(slug, body, author, clientId, now, now)
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

async function deleteComment(
  ctx: PagesFunction<Env>,
  slug: string,
  commentId: number
): Promise<Response> {
  const payload = await readBody(ctx.request);
  const clientId = (payload.client_id || "").toString().trim();

  const c = await ctx.env.DB.prepare(
    `SELECT client_id FROM comment WHERE id = ? AND post_slug = ?`
  )
    .bind(commentId, slug)
    .first<{ client_id: string }>();

  if (!c) return jsonError(404, "评论不存在");

  // Only the original author (matching client_id) may delete their own comment.
  if (!clientId || c.client_id !== clientId) {
    return jsonError(403, "无权删除这条评论");
  }

  await ctx.env.DB.prepare(`DELETE FROM comment WHERE id = ?`)
    .bind(commentId)
    .run();
  return json({ ok: true });
}

async function getInteractions(
  ctx: PagesFunction<Env>,
  slug: string,
  clientId: string
): Promise<Response> {
  if (!(await postExists(ctx, slug))) return jsonError(404, "文章不存在");

  const likes = await ctx.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM "like" WHERE post_slug = ?`
  )
    .bind(slug)
    .first<{ c: number }>();
  const favorites = await ctx.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM favorite WHERE post_slug = ?`
  )
    .bind(slug)
    .first<{ c: number }>();
  const liked = clientId
    ? await ctx.env.DB.prepare(
        `SELECT id FROM "like" WHERE post_slug = ? AND client_id = ?`
      )
        .bind(slug, clientId)
        .first()
    : null;
  const favorited = clientId
    ? await ctx.env.DB.prepare(
        `SELECT id FROM favorite WHERE post_slug = ? AND client_id = ?`
      )
        .bind(slug, clientId)
        .first()
    : null;

  return json({
    post_slug: slug,
    likes: likes?.c ?? 0,
    favorites: favorites?.c ?? 0,
    liked: !!liked,
    favorited: !!favorited,
  });
}

async function toggleInteraction(
  ctx: PagesFunction<Env>,
  slug: string,
  table: "like" | "favorite"
): Promise<Response> {
  const payload = await readBody(ctx.request);
  const clientId = (payload.client_id || "").toString().trim();
  if (!clientId) return jsonError(422, "client_id 不能为空");

  if (!(await postExists(ctx, slug))) return jsonError(404, "文章不存在");

  const existing = await ctx.env.DB.prepare(
    `SELECT id FROM ${table === "like" ? '"like"' : "favorite"} WHERE post_slug = ? AND client_id = ?`
  )
    .bind(slug, clientId)
    .first();

  if (existing) {
    await ctx.env.DB.prepare(
      `DELETE FROM ${table === "like" ? '"like"' : "favorite"} WHERE id = ?`
    )
      .bind(existing.id)
      .run();
  } else {
    await ctx.env.DB.prepare(
      `INSERT INTO ${table === "like" ? '"like"' : "favorite"} (post_slug, client_id) VALUES (?, ?)`
    )
      .bind(slug, clientId)
      .run();
  }

  return getInteractions(ctx, slug, clientId);
}

async function postExists(ctx: PagesFunction<Env>, slug: string): Promise<boolean> {
  const p = await ctx.env.DB.prepare(`SELECT slug FROM post WHERE slug = ?`)
    .bind(slug)
    .first();
  return !!p;
}
