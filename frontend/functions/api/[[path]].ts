/**
 * Cloudflare Pages Function — public blog interaction API.
 *
 * Phase 1+2: anonymous comment / like / favorite / post-read flow,
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
 *   GET    /visits                            → { pv, uv } (Cloudflare Analytics API, 5min D1 cache)
 *
 * D1 binding: env.DB.
 * Visits: env.CLOUDFLARE_API_TOKEN + env.CLOUDFLARE_ZONE_ID (Pages env vars).
 */

interface Env {
  DB: D1Database;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
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
  const path = url.pathname.replace(/^\/api\/?/, "");
  const method = ctx.request.method;

  // Run schema migration once per isolate (idempotent, never blocks requests).
  if (!migrated) {
    try {
      await migrateCommentTable(ctx);
    } catch {
      // Migration failure must NOT block requests — old comments simply
      // lack client_id, which only affects self-deletion, not reading.
    }
    migrated = true;
  }

  try {
    if (path === "posts" && method === "GET") {
      return await listPosts(ctx);
    }
    const single = path.match(/^posts\/([^/]+)$/);
    if (single && method === "GET") {
      return await getPost(ctx, decodeURIComponent(single[1]));
    }
    const cmts = path.match(/^posts\/([^/]+)\/comments$/);
    if (cmts && method === "GET") {
      const cid = url.searchParams.get("client_id") || "";
      return await listComments(ctx, decodeURIComponent(cmts[1]), cid);
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
    if (fav && method === "POST") {
      return await toggleInteraction(ctx, decodeURIComponent(fav[1]), "favorite");
    }
    if (path === "visits" && method === "GET") {
      return await getVisits(ctx);
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
 * Add client_id column + indexes if missing (idempotent).
 * Wrapped in try/catch by caller — never blocks requests.
 */
async function migrateCommentTable(ctx: PagesFunction<Env>): Promise<void> {
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

async function listPosts(ctx: PagesFunction<Env>): Promise<Response> {
  // Exclude body — list page only needs metadata.
  const { results } = await ctx.env.DB.prepare(
    `SELECT slug, title, date, excerpt, source, category, tags, published, sort_order, created_at, updated_at FROM post WHERE published = 1 ORDER BY sort_order ASC, date DESC`
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
  if (!clientId || c.client_id !== clientId) {
    return jsonError(403, "无权删除这条评论");
  }

  await ctx.env.DB.prepare(`DELETE FROM comment WHERE id = ?`)
    .bind(commentId)
    .run();
  return json({ ok: true });
}

/**
 * Single-query interactions lookup.
 * Combines 5 separate D1 round-trips into 1 using subqueries.
 */
async function getInteractions(
  ctx: PagesFunction<Env>,
  slug: string,
  clientId: string
): Promise<Response> {
  const row = await ctx.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM "like" WHERE post_slug = ?) AS likes,
       (SELECT COUNT(*) FROM favorite WHERE post_slug = ?) AS favorites,
       EXISTS(SELECT 1 FROM post WHERE slug = ?) AS exists_val,
       ? != '' AND EXISTS(SELECT 1 FROM "like" WHERE post_slug = ? AND client_id = ?) AS liked,
       ? != '' AND EXISTS(SELECT 1 FROM favorite WHERE post_slug = ? AND client_id = ?) AS favorited
    `
  )
    .bind(slug, slug, slug, clientId, slug, clientId, clientId, slug, clientId)
    .first<{
      likes: number;
      favorites: number;
      exists_val: number;
      liked: number;
      favorited: number;
    }>();

  if (!row || !row.exists_val) return jsonError(404, "文章不存在");

  return json({
    post_slug: slug,
    likes: row.likes ?? 0,
    favorites: row.favorites ?? 0,
    liked: !!row.liked,
    favorited: !!row.favorited,
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

  // Check post exists + check existing interaction in 1 query.
  const existing = await ctx.env.DB.prepare(
    `SELECT
       (SELECT 1 FROM post WHERE slug = ?) AS post_exists,
       (SELECT id FROM ${table === "like" ? '"like"' : "favorite"} WHERE post_slug = ? AND client_id = ?) AS existing_id
    `
  )
    .bind(slug, slug, clientId)
    .first<{ post_exists: number; existing_id: number | null }>();

  if (!existing || !existing.post_exists) {
    return jsonError(404, "文章不存在");
  }

  if (existing.existing_id) {
    await ctx.env.DB.prepare(
      `DELETE FROM ${table === "like" ? '"like"' : "favorite"} WHERE id = ?`
    )
      .bind(existing.existing_id)
      .run();
  } else {
    await ctx.env.DB.prepare(
      `INSERT INTO ${table === "like" ? '"like"' : "favorite"} (post_slug, client_id) VALUES (?, ?)`
    )
      .bind(slug, clientId)
      .run();
  }

  // Return updated interactions (single query via getInteractions).
  return getInteractions(ctx, slug, clientId);
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

async function getVisits(ctx: PagesFunction<Env>): Promise<Response> {
  const cacheHeaders = {
    "Content-Type": "application/json",
    ...CORS,
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
