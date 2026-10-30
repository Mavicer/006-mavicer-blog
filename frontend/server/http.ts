export interface Env extends Cloudflare.Env {
  NEXUS_ORIGIN?: string;
  NEXUS_SSO_SECRET?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  GITHUB_PUBLISH_TOKEN?: string;
}
export type Context = Parameters<PagesFunction<Env>>[0];

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  } });
}

// Cookie-authenticated writes must originate from this exact site. JSON plus
// strict Origin checks also block form-based CSRF, including login CSRF.
export function checkWrite(request: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("Origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    throw new HttpError(403, "请从本站发起操作");
  }
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "请求需要使用 JSON 格式");
  }
}

export async function readBody(request: Request, limit = 16_384): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("Content-Length")) > limit) throw new HttpError(413, "内容过长");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "请求内容不能为空");
  let total = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new HttpError(413, "内容过长"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value;
  } catch { throw new HttpError(400, "无效的 JSON 内容"); }
}

// Atomically counted in D1 so limits survive cold starts and multiple isolates.
// Keys contain hashes, never raw IP addresses, passwords or session cookies.
export async function rateLimit(ctx: Context, scope: string, identity: string, max: number, seconds: number): Promise<void> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  const key = scope + ":" + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  const row = await ctx.env.DB.prepare(`INSERT INTO account_rate_limit (key, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET hits = CASE WHEN expires_at <= ? THEN 1 ELSE hits + 1 END,
    expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    RETURNING hits`).bind(key, now + seconds, now, now).first<{ hits: number }>();
  if (!row || row.hits > max) throw new HttpError(429, "操作过于频繁，请稍后再试");
}
