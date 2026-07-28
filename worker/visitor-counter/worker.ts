// Cloudflare Worker — Visitor Counter API
// Deploy: npx wrangler deploy
//
// Endpoint: GET /api/visitor
// Response: { "uv": 123, "pv": 456 }
//
// PV: total row count in `visits` table (= every API call ever)
// UV: unique visitor_hash values in the last 24 hours
//
// visitor_hash = SHA-256 of (CF-Connecting-IP or X-Forwarded-For or "unknown")
//                 + User-Agent, truncated to 16 hex chars.
//                 Raw IP is never stored.

const UV_WINDOW_HOURS = 24;
const ALLOWED_ORIGINS = [
  "https://mavicer.cc",
  "https://www.mavicer.cc",
  "http://localhost:5174",
  "http://localhost:4173",
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }

    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers,
      });
    }

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
      // If DB not ready yet, return zeros so frontend doesn't crash
      return new Response(JSON.stringify({ uv: 0, pv: 0, error: "DB unavailable" }), {
        headers,
        status: 200,
      });
    }
  },
};

interface Env {
  DB: D1Database;
}
