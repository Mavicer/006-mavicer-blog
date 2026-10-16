import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { HttpError, json, readBody, rateLimit, type Context } from "./http";

export type User = {
  id: string; username: string; display_name: string; is_owner: boolean;
  must_change_password: boolean; created_at: string;
};
type UserRow = Omit<User, "is_owner" | "must_change_password"> & {
  is_owner: number; must_change_password: number; password_hash: string;
};
const COOKIE = "__Host-blog_session";
const SESSION_SECONDS = 30 * 86400;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const publicUser = (row: UserRow): User => ({
  id: row.id, username: row.username, display_name: row.display_name,
  is_owner: !!row.is_owner, must_change_password: !!row.must_change_password, created_at: row.created_at,
});

// OWASP's 16 MiB scrypt profile; native crypto avoids a JS/WASM password KDF.
// Parameters and salt are versioned in the stored hash for future upgrades.
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64,
    { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 },
    (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$16384$8$5$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts.slice(0, 4).join("$") !== "scrypt$16384$8$5" || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  return timingSafeEqual(await derive(password, parts[4]), Buffer.from(parts[5], "hex"));
}
function passwordInput(value: unknown, minimum = 1): string {
  if (typeof value !== "string" || value.length < minimum || value.length > 128) throw new HttpError(422, "密码长度无效");
  return value;
}
function memberPassword(value: unknown): string {
  const password = passwordInput(value, 8);
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new HttpError(422, "密码至少 8 位，且需同时包含字母和数字");
  return password;
}
function usernameInput(value: unknown): string {
  if (typeof value !== "string") throw new HttpError(422, "用户名格式无效");
  const name = value.trim().normalize("NFKC").toLowerCase();
  if (!/^[\p{L}\p{N}_]{2,30}$/u.test(name)) throw new HttpError(422, "用户名需为 2–30 个中文、字母、数字或下划线");
  return name;
}
function cookie(token: string, maxAge = SESSION_SECONDS): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function sessionToken(request: Request): string {
  const value = request.headers.get("Cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1) || "";
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "";
}
export async function currentUser(ctx: Context): Promise<User | null> {
  const token = sessionToken(ctx.request);
  if (!token) return null;
  const row = await ctx.env.DB.prepare(`SELECT u.* FROM blog_session s JOIN blog_user u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).bind(hashToken(token), Math.floor(Date.now() / 1000)).first<UserRow>();
  return row ? publicUser(row) : null;
}
export async function requireUser(ctx: Context, allowPasswordChange = false): Promise<User> {
  const user = await currentUser(ctx);
  if (!user) throw new HttpError(401, "请先登录账号");
  if (user.must_change_password && !allowPasswordChange) throw new HttpError(403, "请先在账户页修改临时密码");
  return user;
}
async function startSession(ctx: Context, row: UserRow, status = 200): Promise<Response> {
  const token = randomBytes(32).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const old = sessionToken(ctx.request);
  const results = await ctx.env.DB.batch([
    ctx.env.DB.prepare(`DELETE FROM blog_session WHERE expires_at <= ? OR token_hash = ?`).bind(now, old ? hashToken(old) : ""),
    ctx.env.DB.prepare(`DELETE FROM account_rate_limit WHERE expires_at <= ?`).bind(now),
    ctx.env.DB.prepare(`INSERT INTO blog_session (token_hash, user_id, expires_at) SELECT ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM blog_user WHERE id = ? AND password_hash = ?)`)
      .bind(hashToken(token), row.id, now + SESSION_SECONDS, row.id, row.password_hash),
  ]);
  if (results[2].meta.changes !== 1) throw new HttpError(401, "账号凭据已更新，请重新登录");
  return json({ user: publicUser(row) }, status, { "Set-Cookie": cookie(token) });
}

export async function authRoute(ctx: Context, path: string): Promise<Response | null> {
  const method = ctx.request.method;
  const ip = ctx.request.headers.get("CF-Connecting-IP") || "local";
  if (path === "auth/me" && method === "GET") return json(await requireUser(ctx, true));
  if (path === "auth/logout" && method === "POST") {
    const token = sessionToken(ctx.request);
    if (token) await ctx.env.DB.prepare(`DELETE FROM blog_session WHERE token_hash = ?`).bind(hashToken(token)).run();
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
  }
  if (path === "auth/register" && method === "POST") {
    await rateLimit(ctx, "register", ip, 5, 3600);
    const body = await readBody(ctx.request);
    const username = usernameInput(body.username);
    const password = memberPassword(body.password);
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : username;
    if (!displayName || displayName.length > 40) throw new HttpError(422, "昵称需为 1–40 个字符");
    const row: UserRow = { id: crypto.randomUUID(), username, display_name: displayName, password_hash: await hashPassword(password), is_owner: 0, must_change_password: 0, created_at: new Date().toISOString() };
    const inserted = await ctx.env.DB.prepare(`INSERT INTO blog_user (id, username, display_name, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(username) DO NOTHING RETURNING id`).bind(row.id, username, displayName, row.password_hash, row.created_at).first();
    if (!inserted) throw new HttpError(409, "用户名已被使用");
    return startSession(ctx, row, 201);
  }
  if (path === "auth/login" && method === "POST") {
    await rateLimit(ctx, "login-ip", ip, 30, 900);
    const body = await readBody(ctx.request);
    const username = usernameInput(body.username);
    const password = passwordInput(body.password);
    await rateLimit(ctx, "login-user", username, 15, 900);
    const row = await ctx.env.DB.prepare(`SELECT * FROM blog_user WHERE username = ?`).bind(username).first<UserRow>();
    // Do the same KDF work for unknown users to avoid an account timing oracle.
    const dummy = "scrypt$16384$8$5$" + "0".repeat(32) + "$" + "0".repeat(128);
    if (!(await verifyPassword(password, row?.password_hash || dummy)) || !row) throw new HttpError(401, "用户名或密码错误");
    return startSession(ctx, row);
  }
  if (path === "auth/password" && method === "POST") {
    const user = await requireUser(ctx, true);
    await rateLimit(ctx, "password", user.id, 5, 900);
    const body = await readBody(ctx.request);
    const oldPassword = passwordInput(body.current_password);
    const newPassword = user.is_owner ? passwordInput(body.new_password, 6) : memberPassword(body.new_password);
    if (oldPassword === newPassword) throw new HttpError(422, "新密码应与原密码不同");
    const row = await ctx.env.DB.prepare(`SELECT * FROM blog_user WHERE id = ?`).bind(user.id).first<UserRow>();
    if (!row || !(await verifyPassword(oldPassword, row.password_hash))) throw new HttpError(401, "原密码错误");
    const hash = await hashPassword(newPassword);
    await ctx.env.DB.batch([
      ctx.env.DB.prepare(`UPDATE blog_user SET password_hash = ?, must_change_password = 0 WHERE id = ?`).bind(hash, user.id),
      ctx.env.DB.prepare(`DELETE FROM blog_session WHERE user_id = ?`).bind(user.id),
    ]);
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
  }
  if (path === "admin/users" || /^admin\/users\/[^/]+\/reset-password$/.test(path)) {
    const owner = await requireUser(ctx);
    if (!owner.is_owner) throw new HttpError(403, "需要管理员权限");
    if (path === "admin/users" && method === "GET") {
      const { results } = await ctx.env.DB.prepare(`SELECT id, username, display_name, is_owner, must_change_password, created_at FROM blog_user ORDER BY created_at DESC LIMIT 200`).all<UserRow>();
      return json(results.map(publicUser));
    }
    if (method === "POST") {
      await rateLimit(ctx, "admin-reset", owner.id, 10, 3600);
      const body = await readBody(ctx.request);
      const row = await ctx.env.DB.prepare(`SELECT * FROM blog_user WHERE id = ?`).bind(owner.id).first<UserRow>();
      if (!row || !(await verifyPassword(passwordInput(body.current_password), row.password_hash))) throw new HttpError(401, "管理员密码错误");
      const id = decodeURIComponent(path.split("/")[2]);
      const target = await ctx.env.DB.prepare(`SELECT id, is_owner FROM blog_user WHERE id = ?`).bind(id).first<UserRow>();
      if (!target) throw new HttpError(404, "账号不存在");
      if (target.is_owner) throw new HttpError(403, "管理员请使用账户页修改自己的密码");
      const temporary = randomBytes(18).toString("base64url");
      const hash = await hashPassword(temporary);
      await ctx.env.DB.batch([
        ctx.env.DB.prepare(`UPDATE blog_user SET password_hash = ?, must_change_password = 1 WHERE id = ?`).bind(hash, id),
        ctx.env.DB.prepare(`DELETE FROM blog_session WHERE user_id = ?`).bind(id),
      ]);
      return json({ temporary_password: temporary });
    }
  }
  return null;
}
