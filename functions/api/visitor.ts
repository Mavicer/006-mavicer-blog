// Cloudflare Pages Function — visitor counter
// Place at: functions/api/visitor.ts
// Accessible at: https://mavicer.cc/api/visitor
//
// Uses D1 binding named "DB" (configured in Pages dashboard).
//
// PV: total row count (= every API call ever)
// UV: distinct visitor_hash in last 24 hours
// visitor_hash = SHA-256(IP + User-Agent), truncated to 16 hex chars

const UV_WINDOW_HOURS = 24;
const ALLOWED_ORIGINS = [
  "https://mavicer.cc",
  "https://www.mavicer.cc",
  "http://localhost:5173",
  "http://localhost:5174",
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const origin = request.headers.get("Origin") || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };

  try {
    // ── Generate visitor hash ──────────────────────────────
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "unknown";
    const ua = request.headers.get("User-Agent") || "unknown";

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(ip + "|" + ua)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const visitorHash = hashArray
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // ── Insert visit record ────────────────────────────────
    await env.DB.prepare(
      "INSERT INTO visits (visitor_hash) VALUES (?)"
    )
      .bind(visitorHash)
      .run();

    // ── Count PV (total rows) ──────────────────────────────
    const pvResult = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM visits"
    ).first();
    const pv = (pvResult?.count as number) || 0;

    // ── Count UV (unique hashes in last 24h) ───────────────
    const uvResult = await env.DB.prepare(
      `SELECT COUNT(DISTINCT visitor_hash) as count
       FROM visits
       WHERE created_at >= datetime('now', '-${UV_WINDOW_HOURS} hours')`
    ).first();
    const uv = (uvResult?.count as number) || 0;

    return new Response(JSON.stringify({ uv, pv }), { headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ uv: 0, pv: 0, error: "DB unavailable" }),
      { headers }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get("Origin") || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

interface Env {
  DB: D1Database;
}
