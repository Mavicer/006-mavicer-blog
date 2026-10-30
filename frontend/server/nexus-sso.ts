import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { currentUser, sessionToken } from "./auth";
import { HttpError, json, readBody, rateLimit, type Context } from "./http";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const opaque = () => randomBytes(32).toString("base64url");
const valid = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
const redirect = (url: string) => new Response(null, {status: 302, headers: {Location: url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}});

async function ensureSchema(ctx: Context) {
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS nexus_sso_code (code_hash TEXT PRIMARY KEY, session_hash TEXT NOT NULL, challenge TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at INTEGER NOT NULL)`),
    ctx.env.DB.prepare(`CREATE TABLE IF NOT EXISTS nexus_sso_grant (token_hash TEXT PRIMARY KEY, session_hash TEXT NOT NULL, expires_at INTEGER NOT NULL)`),
    ctx.env.DB.prepare(`CREATE INDEX IF NOT EXISTS nexus_sso_grant_expiry ON nexus_sso_grant(expires_at)`),
  ]);
}
function client(ctx: Context) {
  const secret = ctx.env.NEXUS_SSO_SECRET;
  const origin = ctx.env.NEXUS_ORIGIN;
  if (!secret || Buffer.byteLength(secret) < 32 || !origin) throw new HttpError(503, "Nexus 登录尚未配置");
  const u = new URL(origin);
  if (u.origin !== origin || (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname))) throw new HttpError(503, "Nexus 地址配置无效");
  return { secret, origin, callback: origin + "/api/auth/blog/callback" };
}
function authenticate(ctx: Context, secret: string) {
  const supplied = ctx.request.headers.get("authorization") || "";
  const expected = "Bearer " + secret;
  if (!timingSafeEqual(createHash("sha256").update(supplied).digest(), createHash("sha256").update(expected).digest())) throw new HttpError(401, "客户端认证失败");
}

export async function nexusSsoRoute(ctx: Context, path: string): Promise<Response | null> {
  if (!path.startsWith("auth/nexus/")) return null;
  const cfg = client(ctx);
  const url = new URL(ctx.request.url);
  const now = Math.floor(Date.now() / 1000);
  await ensureSchema(ctx);
  if (path === "auth/nexus/authorize" && ctx.request.method === "GET") {
    const p = url.searchParams;
    if (p.get("client_id") !== "nexus" || p.get("redirect_uri") !== cfg.callback || !valid(p.get("state")) || !valid(p.get("code_challenge")) || p.get("code_challenge_method") !== "S256") throw new HttpError(400, "授权参数无效");
    const returnUrl = new URL(cfg.callback);
    returnUrl.searchParams.set("state", p.get("state")!);
    const user = await currentUser(ctx);
    if (!user || user.must_change_password) {
      if (p.get("prompt") === "none") {returnUrl.searchParams.set("error", "login_required"); return redirect(returnUrl.toString());}
      if (user?.must_change_password) return redirect("/account");
      return redirect("/login?next=" + encodeURIComponent(url.pathname + url.search));
    }
    await rateLimit(ctx, "nexus-authorize", user.id, 30, 60);
    const code = opaque();
    await ctx.env.DB.batch([
      ctx.env.DB.prepare(`DELETE FROM nexus_sso_code WHERE expires_at <= ?`).bind(now),
      ctx.env.DB.prepare(`DELETE FROM nexus_sso_grant WHERE expires_at <= ? OR NOT EXISTS (SELECT 1 FROM blog_session s WHERE s.token_hash = nexus_sso_grant.session_hash)`).bind(now),
      ctx.env.DB.prepare(`INSERT INTO nexus_sso_code (code_hash, session_hash, challenge, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(hash(code), hash(sessionToken(ctx.request)), p.get("code_challenge"), cfg.callback, now + 60),
    ]);
    returnUrl.searchParams.set("code", code);
    return redirect(returnUrl.toString());
  }
  if (ctx.request.method !== "POST") throw new HttpError(405, "请求方法无效");
  authenticate(ctx, cfg.secret);
  const body = await readBody(ctx.request);
  if (path === "auth/nexus/token") {
    if (!valid(body.code) || typeof body.code_verifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier) || body.redirect_uri !== cfg.callback) throw new HttpError(400, "授权码参数无效");
    const challenge = createHash("sha256").update(body.code_verifier).digest("base64url");
    const row = await ctx.env.DB.prepare(`DELETE FROM nexus_sso_code WHERE code_hash = ? AND challenge = ? AND redirect_uri = ? AND expires_at > ? RETURNING session_hash`)
      .bind(hash(body.code), challenge, cfg.callback, now).first<{session_hash: string}>();
    if (!row) throw new HttpError(401, "授权码无效或已使用");
    const session = await ctx.env.DB.prepare(`SELECT s.expires_at FROM blog_session s JOIN blog_user u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.must_change_password = 0`).bind(row.session_hash, now).first<{expires_at: number}>();
    if (!session) throw new HttpError(401, "博客会话已失效");
    const token = opaque();
    await ctx.env.DB.prepare(`INSERT INTO nexus_sso_grant (token_hash, session_hash, expires_at) VALUES (?, ?, ?)`).bind(hash(token), row.session_hash, session.expires_at).run();
    return json({ access_token: token, expires_at: session.expires_at });
  }
  if (!valid(body.token)) throw new HttpError(400, "会话参数无效");
  if (path === "auth/nexus/introspect") {
    const user = await ctx.env.DB.prepare(`SELECT u.id, u.username, u.display_name, u.is_owner FROM nexus_sso_grant g
      JOIN blog_session s ON s.token_hash = g.session_hash JOIN blog_user u ON u.id = s.user_id
      WHERE g.token_hash = ? AND g.expires_at > ? AND s.expires_at > ? AND u.must_change_password = 0`)
      .bind(hash(body.token), now, now).first<{id:string; username:string; display_name:string; is_owner:number}>();
    return json(user ? { active: true, user: {...user, is_owner: !!user.is_owner} } : {active: false});
  }
  if (path === "auth/nexus/logout") {
    await ctx.env.DB.prepare(`DELETE FROM blog_session WHERE token_hash IN (SELECT session_hash FROM nexus_sso_grant WHERE token_hash = ?)`).bind(hash(body.token)).run();
    await ctx.env.DB.prepare(`DELETE FROM nexus_sso_grant WHERE token_hash = ?`).bind(hash(body.token)).run();
    return json({ok: true});
  }
  throw new HttpError(404, "接口不存在");
}
