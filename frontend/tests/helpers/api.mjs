import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
const { outputFiles } = await build({ entryPoints: [new URL("../../functions/api/[[path]].ts", import.meta.url).pathname], bundle: true, platform: "node", format: "esm", write: false, banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(process.cwd() + "/package.json");' } });
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);
export const password = "test-password-only-2026";
const slug = "outside-the-classroom";
const post = (route) => `/posts/${slug}/${route}`;

export function fixture({ legacy = false, failMigration = false, env = {} } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../../backend-worker/schema.sql", import.meta.url), "utf8"));
  if (legacy) sqlite.exec(`INSERT INTO comment (post_slug, body, author_name, client_id) VALUES ('${slug}', '历史评论', '旧访客', 'known-client'); INSERT INTO favorite (post_slug, client_id) VALUES ('${slug}', 'known-client');`);
  let shouldFail = failMigration;
  const DB = {
    prepare(sql) {
      if (shouldFail && sql.includes("CREATE TABLE IF NOT EXISTS blog_user")) { shouldFail = false; throw new Error("simulated migration error"); }
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async all() { return { results: sqlite.prepare(sql).all(...args) }; },
        async first() { return sqlite.prepare(sql).get(...args) || null; },
        async run() { const result = sqlite.prepare(sql).run(...args); return { meta: { last_row_id: Number(result.lastInsertRowid), changes: result.changes } }; },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  async function request(path, { method = "GET", body, cookie = "", headers = {} } = {}) {
    const response = await onRequest({ request: new Request(`https://example.test/api${path}`, {
      method, headers: { Cookie: cookie, ...(method !== "GET" ? { "Content-Type": "application/json", Origin: "https://example.test" } : {}), ...headers },
      ...(method !== "GET" ? { body: typeof body === "string" ? body : JSON.stringify(body || {}) } : {}),
    }), env: { DB, ...env } });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("Set-Cookie")?.split(";")[0] || "", headers: response.headers };
  }
  async function register(username = "alice", extra = {}) {
    const result = await request("/auth/register", { method: "POST", body: { username, password, display_name: username, ...extra } });
    assert.equal(result.status, 201, JSON.stringify(result.data)); return result;
  }
  return { sqlite, DB, request, register };
}

