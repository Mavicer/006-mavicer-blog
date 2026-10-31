import { requireUser } from "./auth";
import { HttpError, json, readBody, rateLimit, type Context } from "./http";

const tokenValid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
async function ensureFeedback(ctx: Context) {
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS private_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, submission_key TEXT NOT NULL UNIQUE, category TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`),
    ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS private_feedback_receipt (submission_key TEXT PRIMARY KEY, receipt_hash TEXT NOT NULL)`),
    ctx.env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_feedback_receipt_hash ON private_feedback_receipt(receipt_hash)`),
    ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS private_feedback_read (feedback_id INTEGER PRIMARY KEY, read_at TEXT NOT NULL)`),
  ]);
}
export async function feedbackRoute(ctx: Context, path: string): Promise<Response | null> {
  if (!["feedback", "admin/feedback", "admin/feedback/unread", "admin/feedback/read"].includes(path)) return null;
  const method = ctx.request.method;
  if (path.startsWith("admin/")) {
    const user = await requireUser(ctx);
    if (!user.is_owner) throw new HttpError(403, "仅博主可查看留言");
    if (method !== (path.endsWith("/read") ? "POST" : "GET")) throw new HttpError(405, "不支持此操作");
  } else if (!["GET", "POST"].includes(method)) throw new HttpError(405, "不支持此操作");
  await ensureFeedback(ctx);
  if (path === "admin/feedback/unread") {
    const row = await ctx.env.DB.prepare(`SELECT COUNT(*) AS unread FROM private_feedback f LEFT JOIN private_feedback_read r ON r.feedback_id=f.id WHERE r.feedback_id IS NULL`).first<{ unread: number }>();
    return json({ unread: row?.unread || 0 });
  }
  if (path === "admin/feedback/read") {
    const { ids } = await readBody(ctx.request);
    if (!Array.isArray(ids) || !ids.length || ids.length > 50 || !ids.every(id => Number.isSafeInteger(id) && id > 0)) throw new HttpError(400, "请选择要标为已读的留言");
    const now = new Date().toISOString();
    await ctx.env.DB.batch(ids.map(id => ctx.env.DB.prepare(`INSERT OR IGNORE INTO private_feedback_read (feedback_id,read_at) SELECT id,? FROM private_feedback WHERE id=?`).bind(now,id)));
    return json({ ok: true });
  }
  if (method === "GET") {
    const raw = new URL(ctx.request.url).searchParams.get("before");
    const before = raw ? Number(raw) : Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(before) || before < 1) throw new HttpError(400, "分页参数有误");
    let query = `SELECT f.id,f.category,f.body,f.created_at,r.read_at FROM private_feedback f LEFT JOIN private_feedback_read r ON r.feedback_id=f.id`;
    let statement;
    if (path === "admin/feedback") statement = ctx.env.DB.prepare(`${query} WHERE f.id < ? ORDER BY f.id DESC LIMIT 51`).bind(before);
    else {
      const token = ctx.request.headers.get("X-Feedback-Token");
      if (!token) return json({ items: [], hasMore: false });
      if (!tokenValid(token)) throw new HttpError(400, "留言凭证无效");
      query += ` JOIN private_feedback_receipt p ON p.submission_key=f.submission_key`;
      statement = ctx.env.DB.prepare(`${query} WHERE p.receipt_hash=? AND f.id < ? ORDER BY f.id DESC LIMIT 51`).bind(await digest(token), before);
    }
    const rows = await statement.all();
    return json({ items: rows.results.slice(0,50), hasMore: rows.results.length > 50 });
  }
  const data = await readBody(ctx.request, 16_384);
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const category = data.category, key = data.submission_key, token = data.receipt_token;
  if (!body || body.length > 2000) throw new HttpError(400, "请输入 1—2000 字的留言");
  if (!["bug", "suggestion", "other"].includes(String(category))) throw new HttpError(400, "请选择留言类型");
  if (typeof key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new HttpError(400, "投稿标识无效，请刷新后重试");
  if (token !== undefined && !tokenValid(token)) throw new HttpError(400, "留言凭证无效");
  const day = new Date().toISOString().slice(0, 10);
  await rateLimit(ctx, "feedback", `${day}:${ctx.request.headers.get("CF-Connecting-IP") || "unknown"}`, 5, 600);
  const now = new Date().toISOString();
  if (tokenValid(token)) {
    const hash = await digest(token);
    // Atomic claim and insert. Retrying a key cannot claim somebody else's or a legacy message.
    await ctx.env.DB.batch([
      ctx.env.DB.prepare(`INSERT OR IGNORE INTO private_feedback_receipt (submission_key,receipt_hash) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM private_feedback WHERE submission_key=?)`).bind(key,hash,key),
      ctx.env.DB.prepare(`INSERT OR IGNORE INTO private_feedback (submission_key,category,body,created_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM private_feedback_receipt WHERE submission_key=? AND receipt_hash=?)`).bind(key,category,body,now,key,hash),
    ]);
    const owned = await ctx.env.DB.prepare(`SELECT f.id FROM private_feedback f JOIN private_feedback_receipt p ON p.submission_key=f.submission_key WHERE f.submission_key=? AND p.receipt_hash=?`).bind(key,hash).first();
    if (!owned) throw new HttpError(409, "投稿标识已使用，请刷新后重试");
  } else {
    // Compatibility with already-open clients from the previous release.
    await ctx.env.DB.prepare(`INSERT OR IGNORE INTO private_feedback (submission_key,category,body,created_at) VALUES (?,?,?,?)`).bind(key,category,body,now).run();
  }
  return json({ ok: true }, 201);
}
