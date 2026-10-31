import { requireUser } from "./auth";
import { HttpError, json, readBody, rateLimit, type Context } from "./http";

export async function feedbackRoute(ctx: Context, path: string): Promise<Response | null> {
  if (path !== "feedback" && path !== "admin/feedback") return null;
  const method = ctx.request.method;
  if (path === "admin/feedback") {
    const user = await requireUser(ctx);
    if (!user.is_owner) throw new HttpError(403, "仅博主可查看留言");
    if (method !== "GET") throw new HttpError(405, "不支持此操作");
  } else if (method !== "POST") {
    throw new HttpError(405, "不支持此操作");
  }
  await ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS private_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT, submission_key TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
  )`).run();
  if (path === "admin/feedback") {
    const raw = new URL(ctx.request.url).searchParams.get("before");
    const before = raw ? Number(raw) : Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(before) || before < 1) throw new HttpError(400, "分页参数有误");
    const rows = await ctx.env.DB.prepare(`SELECT id, category, body, created_at FROM private_feedback WHERE id < ? ORDER BY id DESC LIMIT 51`).bind(before).all();
    const items = rows.results.slice(0, 50);
    return json({ items, hasMore: rows.results.length > 50 });
  }
  const data = await readBody(ctx.request, 16_384);
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const category = data.category;
  const key = data.submission_key;
  if (!body || body.length > 2000) throw new HttpError(400, "请输入 1—2000 字的留言");
  if (!["bug", "suggestion", "other"].includes(String(category))) throw new HttpError(400, "请选择留言类型");
  if (typeof key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new HttpError(400, "投稿标识无效，请刷新后重试");
  // Separate abuse counter; no account, IP, user agent or fingerprint is stored with a message.
  const day = new Date().toISOString().slice(0, 10);
  await rateLimit(ctx, "feedback", `${day}:${ctx.request.headers.get("CF-Connecting-IP") || "unknown"}`, 5, 600);
  await ctx.env.DB.prepare(`INSERT OR IGNORE INTO private_feedback (submission_key, category, body, created_at) VALUES (?, ?, ?, ?)`).bind(key, category, body, new Date().toISOString()).run();
  return json({ ok: true }, 201);
}
