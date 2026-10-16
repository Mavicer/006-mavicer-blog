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
 *   DELETE /posts/:slug/comments/:id         (session required)
 *   GET    /posts/:slug/interactions?client_id=
 *   POST   /posts/:slug/like                body: { client_id }
 *   PUT/DELETE /posts/:slug/favorite       (session required)
 *   GET    /visits                            → { pv, uv } (Cloudflare Analytics API, 5min D1 cache)
 *
 * D1 binding: env.DB.
 * Visits: env.CLOUDFLARE_API_TOKEN + env.CLOUDFLARE_ZONE_ID (Pages env vars).
 */

import staticPostSlugs from "../../generated/static-post-slugs.json";
import staticPostCatalog from "../../generated/static-posts.json";
import { authRoute, currentUser, requireUser, type User } from "../../server/auth";
import { ensureAccounts } from "../../server/schema";
import { checkWrite, HttpError, json, readBody, rateLimit, type Context as ApiContext } from "../../server/http";

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

    // The older visits migration is independent of the accounts schema.
    if (!migrated) {
      try { await migrateCommentTable(ctx); migrated = true; }
      catch { /* The visits route can retry on the next request. */ }
    }

    const auth = await authRoute(ctx, path);
    if (auth) return auth;
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
    const del = path.match(/^posts\/([^/]+)\/comments\/(\d+)$/);
    if (del && method === "DELETE") {
      return await deleteComment(ctx, decodeURIComponent(del[1]), Number(del[2]));
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
    if (path === "visits" && method === "GET") {
      return await getVisits(ctx);
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
    ctx.env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS visits_cache (
        id INTEGER PRIMARY KEY,
        pv INTEGER NOT NULL DEFAULT 0,
        uv INTEGER NOT NULL DEFAULT 0,
        pv_base INTEGER NOT NULL DEFAULT 0,
        pv_anchor_date TEXT NOT NULL DEFAULT '',
        fetched_at TEXT NOT NULL DEFAULT ''
      )`
    ),
  ]);
  // Add archive columns to a pre-existing visits_cache (idempotent). The table
  // was originally created with only (id, pv, uv, fetched_at); pv_base /
  // pv_anchor_date power the archive+delta counter and must be backfilled.
  const vInfo = await ctx.env.DB.prepare(`PRAGMA table_info(visits_cache)`).all<{
    name: string;
  }>();
  const vCols = new Set(vInfo.results.map((r) => r.name));
  for (const [col, decl] of [
    ["pv_base", "INTEGER NOT NULL DEFAULT 0"],
    ["pv_anchor_date", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!vCols.has(col)) {
      try {
        await ctx.env.DB.prepare(
          `ALTER TABLE visits_cache ADD COLUMN ${col} ${decl}`
        ).run();
      } catch {
        // "duplicate column name" — another isolate beat us to it.
      }
    }
  }
  // Seed the archive base on the pre-existing cache row. The table predates the
  // archive+delta counter: the row was written by the old rolling-window logic
  // with a (bot-inflated) multi-day pageViews total in `pv`, and the ALTER
  // TABLE above left pv_base=0 / pv_anchor_date=''. Stamp the user-provided
  // lifetime baseline and invalidate the stale `pv`/`fetched_at` so the next
  // request recomputes lifetime_pv = base + fresh delta instead of serving the
  // wrong total. Idempotent: only touches rows still in the un-seeded state.
  await ctx.env.DB.prepare(
    `UPDATE visits_cache
       SET pv_base = ?, pv_anchor_date = ?, pv = 0, fetched_at = ''
     WHERE id = 1 AND pv_base = 0 AND pv_anchor_date = ''`
  )
    .bind(PV_BASE_INITIAL, PV_ANCHOR_DATE)
    .run();
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
    return jsonError(403, "无权删除这条评论");
  }

  await ctx.env.DB.prepare(`DELETE FROM comment WHERE id = ?`)
    .bind(commentId)
    .run();
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
  return json(results.flatMap((row) => {
    const local = catalog.get(row.post_slug);
    if (local) return [local];
    return row.published ? [{ ...postOut(row), published: true, sortOrder: row.sort_order }] : [];
  }));
}

// ── visits (Cloudflare Analytics API, 5min D1 cache) ──────────────

const VISITS_CACHE_TTL_MIN = 5;
// Cloudflare Analytics retains ~52w1d1h (1 year) of daily HTTP data on this
// plan — requesting older data returns a quota error. We only ever query a
// recent window, so this is a safe, generous cap.
const CF_LOOKBACK_DAYS = 360;
const DAY_MS = 86_400_000;

// Archive+delta counter: the site's lifetime page views (as of an anchor
// date) are frozen as `pv_base` in D1. Each request adds Cloudflare's pageViews
// for [anchor+1d .. today] on top, giving an unbounded-lifetime count from a
// source that itself only retains ~1 year.
//
//   lifetime_pv = pv_base + Σ pageViews over (anchor_date, today]
//
// The anchor advances lazily: whenever we fetch fresh, if the current window
// would re-count a day already inside `pv_base`, we roll the base forward and
// re-anchor to yesterday. This keeps the delta window short and monotonic.
const PV_BASE_INITIAL = 131; // user-provided lifetime PV as of the anchor date
// Anchor date: the last day INCLUDED in pv_base. Delta starts the day after.
const PV_ANCHOR_DATE = "2026-08-13";

interface CacheRow {
  id: number;
  pv: number;
  uv: number;
  pv_base: number;
  pv_anchor_date: string;
  fetched_at: string;
}

async function getVisits(ctx: ApiContext): Promise<Response> {
  const cacheHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300",
  };

  // 1. Check D1 cache (5min TTL).
  const cached = await ctx.env.DB.prepare(
    `SELECT pv, uv, pv_base, pv_anchor_date, fetched_at FROM visits_cache WHERE id = 1`
  ).first<CacheRow>();
  const fresh =
    cached &&
    cached.fetched_at &&
    new Date(cached.fetched_at).getTime() >
      Date.now() - VISITS_CACHE_TTL_MIN * 60 * 1000;
  if (fresh) {
    return new Response(JSON.stringify({ pv: cached!.pv }), {
      headers: cacheHeaders,
    });
  }

  // 2. Resolve the archive base. If no row exists yet, or the row is still in
  //    its un-seeded state (pv_base=0 / anchor='' from the ALTER TABLE default
  //    on a pre-existing row), seed it with the built-in initial values;
  //    otherwise reuse whatever was persisted.
  const seededBase = cached && cached.pv_base > 0 ? cached.pv_base : PV_BASE_INITIAL;
  const seededAnchor =
    cached && cached.pv_anchor_date ? cached.pv_anchor_date : PV_ANCHOR_DATE;
  let pvBase = seededBase;
  let anchorDate = seededAnchor;

  // 3. Fetch recent page views from Cloudflare GraphQL Analytics API.
  const token = ctx.env.CLOUDFLARE_API_TOKEN;
  const zoneId = ctx.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
    // Not configured — serve stale cache if present, else the base alone.
    const fallback = cached?.pv ?? pvBase;
    return new Response(JSON.stringify({ pv: fallback }), {
      headers: cacheHeaders,
    });
  }

  try {
    // Window starts the day AFTER the anchor (delta only) and ends today.
    // If the anchor is today or in the future (e.g. just seeded), the window
    // is empty and lifetime_pv == pv_base.
    const anchorMs = new Date(anchorDate + "T00:00:00Z").getTime();
    const deltaStartMs = anchorMs + DAY_MS; // day after anchor
    const todayStartMs = new Date(
      new Date().toISOString().slice(0, 10) + "T00:00:00Z"
    ).getTime();

    let pvDelta = 0;
    if (deltaStartMs <= todayStartMs) {
      const since = new Date(deltaStartMs).toISOString().slice(0, 10);
      const until = new Date().toISOString().slice(0, 10);
      const gqlRes = await fetch(
        "https://api.cloudflare.com/client/v4/graphql",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // httpRequests1dGroups: zone-level daily HTTP analytics.
            // sum.pageViews = page views (访问量). Field name verified via
            // GraphQL schema introspection.
            query: `query($zoneTag:String!, $since:Date!, $until:Date!){
              viewer { zones(filter:{zoneTag:$zoneTag}) {
                httpRequests1dGroups(limit:1000, filter:{date_geq:$since, date_leq:$until}) {
                  sum { pageViews }
                }
              }}
            }`,
            variables: { zoneTag: zoneId, since, until },
          }),
        }
      );
      const body: any = await gqlRes.json();
      const groups =
        body?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
      for (const g of groups) {
        pvDelta += Number(g?.sum?.pageViews || 0);
      }
    }

    const lifetimePv = pvBase + pvDelta;

    // 4. Persist cache. uv is no longer surfaced; keep the column for schema
    //    continuity but store 0. Anchor/base stay as-is (they advance only if
    //    we ever implement a roll-forward; see comment on PV_ANCHOR_DATE).
    const now = new Date().toISOString();
    await ctx.env.DB.prepare(
      `INSERT INTO visits_cache (id, pv, uv, pv_base, pv_anchor_date, fetched_at)
       VALUES (1, ?, 0, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET pv=excluded.pv, pv_base=excluded.pv_base,
        pv_anchor_date=excluded.pv_anchor_date, fetched_at=excluded.fetched_at`
    )
      .bind(lifetimePv, pvBase, anchorDate, now)
      .run();

    return new Response(JSON.stringify({ pv: lifetimePv }), {
      headers: cacheHeaders,
    });
  } catch {
    // Upstream failure — serve stale cache if present, else the base alone.
    const fallback = cached?.pv ?? pvBase;
    return new Response(JSON.stringify({ pv: fallback }), {
      headers: cacheHeaders,
    });
  }
}
