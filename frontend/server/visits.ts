import { checkWrite, HttpError, json, rateLimit, readBody, type Context } from "./http";

const ONLINE_SECONDS = 90;
const COOKIE = "blog_presence";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCTION_HOSTS = new Set(["mavicer.cc", "www.mavicer.cc", "blog-cmc.pages.dev"]);
const BOT = /bot\b|crawler|spider|headless|curl\/|wget\/|python-requests|httpclient|uptime|lighthouse|facebookexternalhit|slackbot|bytespider/i;

async function ensureVisits(ctx: Context): Promise<void> {
  const db = ctx.env.DB;
  if (await db.prepare("SELECT version FROM app_migration WHERE version = 'visits-v1'").first()) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS blog_visit_total (
      id INTEGER PRIMARY KEY CHECK (id = 1), pv INTEGER NOT NULL CHECK (pv >= 0))`),
    // Seed only once. Rebuilds, cold starts and deploys must never reset the total.
    db.prepare("INSERT OR IGNORE INTO blog_visit_total (id, pv) VALUES (1, 650)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS blog_visit_presence (
      id TEXT PRIMARY KEY, last_seen INTEGER NOT NULL)`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_visit_presence_seen ON blog_visit_presence(last_seen)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS blog_visit_event (
      id TEXT PRIMARY KEY, browser_id TEXT NOT NULL, path TEXT NOT NULL, created_at INTEGER NOT NULL,
      counted INTEGER NOT NULL CHECK (counted IN (0, 1)))`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_visit_event_browser_path ON blog_visit_event(browser_id, path, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_visit_event_created ON blog_visit_event(created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS blog_visit_pending (
      id TEXT PRIMARY KEY, browser_id TEXT NOT NULL, path TEXT NOT NULL, started_at INTEGER NOT NULL)`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_visit_pending_started ON blog_visit_pending(started_at)"),
    // The trigger and unique event ID keep counting atomic, including retries.
    db.prepare(`CREATE TRIGGER IF NOT EXISTS count_blog_visit AFTER INSERT ON blog_visit_event
      WHEN NEW.counted = 1
      BEGIN UPDATE blog_visit_total SET pv = pv + 1 WHERE id = 1; END`),
    db.prepare("INSERT OR IGNORE INTO app_migration (version) VALUES ('visits-v1')"),
  ]);
}

async function summary(ctx: Context, now: number): Promise<{ pv: number; online: number }> {
  const row = await ctx.env.DB.prepare(`SELECT pv,
    (SELECT COUNT(*) FROM blog_visit_presence WHERE last_seen > ?) AS online
    FROM blog_visit_total WHERE id = 1`).bind(now - ONLINE_SECONDS).first<{ pv: number; online: number }>();
  if (!row) throw new Error("Visitor counter is not initialized");
  return row;
}

export async function visitsRoute(ctx: Context): Promise<Response> {
  const request = ctx.request;
  if (!["GET", "POST"].includes(request.method)) return json({ detail: "Method Not Allowed" }, 405, { Allow: "GET, POST" });
  await ensureVisits(ctx);
  const now = Math.floor(Date.now() / 1000);
  if (request.method === "GET") return json(await summary(ctx, now));

  checkWrite(request);
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin) throw new HttpError(403, "请从本站发起操作");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // Pages previews share D1 with production, but must never inflate its counter.
  if ((!PRODUCTION_HOSTS.has(url.hostname) && !local) || BOT.test(request.headers.get("User-Agent") || "")) {
    return json(await summary(ctx, now));
  }
  const body = await readBody(request, 2048);
  if (!["start", "pageview", "heartbeat"].includes(String(body.kind))) throw new HttpError(422, "无效的访问事件");
  if (typeof body.path !== "string" || !body.path.startsWith("/") || body.path.startsWith("//") ||
      body.path.length > 256 || /[?#\x00-\x20\x7f]/.test(body.path)) throw new HttpError(422, "无效的页面路径");
  if (body.kind !== "heartbeat" && (typeof body.event_id !== "string" || !UUID.test(body.event_id))) {
    throw new HttpError(422, "无效的访问事件");
  }
  if (/^\/(admin|account|login|register)(\/|$)/.test(body.path)) return json(await summary(ctx, now));

  await rateLimit(ctx, "visits-ip", request.headers.get("CF-Connecting-IP") || "local", 120, 60);
  const cookie = request.headers.get("Cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  const browserId = cookie && UUID.test(cookie) ? cookie : crypto.randomUUID();
  await rateLimit(ctx, "visits-browser", browserId, 30, 60);

  const db = ctx.env.DB;
  const statements: D1PreparedStatement[] = [];
  if (body.kind === "start") {
    // Presence starts immediately. Only cumulative page views wait ten seconds.
    statements.push(db.prepare(`INSERT OR IGNORE INTO blog_visit_pending (id, browser_id, path, started_at)
      VALUES (?, ?, ?, ?)`).bind(body.event_id, browserId, body.path, now));
  }
  if (body.kind === "pageview") {
    const pending = await db.prepare(`SELECT started_at FROM blog_visit_pending
      WHERE id = ? AND browser_id = ? AND path = ?`).bind(body.event_id, browserId, body.path).first<{ started_at: number }>();
    if (!pending || now < pending.started_at + 10 || now > pending.started_at + 900) {
      throw new HttpError(409, "请在页面停留满 10 秒后再上报");
    }
    // The same page refreshed within 30 seconds is merged; a different page
    // or a later return is a new visit. Heartbeats never increment page views.
    statements.push(db.prepare(`INSERT OR IGNORE INTO blog_visit_event (id, browser_id, path, created_at, counted)
      SELECT ?, ?, ?, ?, CASE WHEN EXISTS (
        SELECT 1 FROM blog_visit_event WHERE browser_id = ? AND path = ? AND counted = 1 AND created_at > ?)
      THEN 0 ELSE 1 END`)
      .bind(body.event_id, browserId, body.path, now, browserId, body.path, now - 30));
  }
  if (body.kind === "start" || body.kind === "pageview") {
    statements.push(db.prepare(`INSERT INTO blog_visit_presence (id, last_seen) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET last_seen = MAX(last_seen, excluded.last_seen)`).bind(browserId, now));
  }
  if (body.kind === "heartbeat") {
    const active = await db.prepare("SELECT id FROM blog_visit_presence WHERE id = ?").bind(browserId).first();
    if (!active) throw new HttpError(409, "访问会话需要重新确认");
    statements.push(db.prepare("UPDATE blog_visit_presence SET last_seen = MAX(last_seen, ?) WHERE id = ?").bind(now, browserId));
  }
  statements.push(
    db.prepare("DELETE FROM blog_visit_presence WHERE last_seen <= ?").bind(now - 1800),
    db.prepare("DELETE FROM blog_visit_event WHERE created_at < ?").bind(now - 86400),
    db.prepare("DELETE FROM blog_visit_pending WHERE started_at < ?").bind(now - 900),
    db.prepare("DELETE FROM account_rate_limit WHERE key LIKE 'visits-%' AND expires_at < ?").bind(now - 3600),
  );
  await db.batch(statements);
  return json(await summary(ctx, now), 200, {
    "Set-Cookie": `${COOKIE}=${browserId}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`,
  });
}
