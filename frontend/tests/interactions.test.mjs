import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";
import { publishedSlugs } from "../scripts/generate-static-posts.mjs";

// Exercise the real handler and SQL on SQLite; only adapt D1's async API.
const slugs = JSON.parse(readFileSync(new URL("../generated/static-post-slugs.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../functions/api/[[path]].ts", import.meta.url), "utf8")
  .replace('import staticPostSlugs from "../../generated/static-post-slugs.json";',
    `const staticPostSlugs = ${JSON.stringify(slugs)};`);
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../backend-worker/schema.sql", import.meta.url), "utf8"));
  const DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async all() { return { results: statement.all(...args) }; },
        async first() { return statement.get(...args) || null; },
        async run() {
          const result = statement.run(...args);
          return { meta: { last_row_id: Number(result.lastInsertRowid) } };
        },
      };
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
  };
  async function request(slug, suffix, method = "GET", payload) {
    const response = await onRequest({
      request: new Request(`https://example.test/api/posts/${slug}/${suffix}`, {
        method,
        ...(payload ? { body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } } : {}),
      }),
      env: { DB },
    });
    return { status: response.status, data: await response.json() };
  }
  return { sqlite, request };
}

test("new Markdown post works without a D1 post row: read, toggle, comment and delete", async () => {
  const { sqlite, request } = fixture();
  try {
    const slug = "outside-the-classroom";
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM post").get().n, 0);
    assert.deepEqual((await request(slug, "interactions")).data, {
      post_slug: slug, likes: 0, favorites: 0, liked: false, favorited: false,
    });
    for (const [route, count, active] of [["like", "likes", "liked"], ["favorite", "favorites", "favorited"]]) {
      const added = await request(slug, route, "POST", { client_id: "test-client" });
      assert.equal(added.status, 200);
      assert.equal(added.data[count], 1);
      assert.equal(added.data[active], true);
      const removed = await request(slug, route, "POST", { client_id: "test-client" });
      assert.equal(removed.data[count], 0);
      assert.equal(removed.data[active], false);
    }
    const comment = await request(slug, "comments", "POST", { body: "回归测试", client_id: "test-client" });
    assert.equal(comment.status, 201);
    assert.equal((await request(slug, "comments")).data.length, 1);
    assert.equal((await request(slug, `comments/${comment.data.id}`, "DELETE", { client_id: "another-client" })).status, 403);
    assert.equal((await request(slug, `comments/${comment.data.id}`, "DELETE", { client_id: "test-client" })).status, 200);
    assert.deepEqual((await request(slug, "comments")).data, []);
  } finally { sqlite.close(); }
});

test("database-only published posts retain counts; unpublished and unknown posts reject writes", async () => {
  const { sqlite, request } = fixture();
  try {
    sqlite.exec(`INSERT INTO post (slug, title) VALUES ('online-only', 'Online');
      INSERT INTO post (slug, title, published) VALUES ('draft-only', 'Draft', 0);
      INSERT INTO "like" (post_slug, client_id) VALUES ('online-only', 'reader');`);
    const existing = await request("online-only", "interactions?client_id=reader");
    assert.equal(existing.status, 200);
    assert.equal(existing.data.likes, 1);
    assert.equal(existing.data.liked, true);
    for (const slug of ["unknown", "draft-only"]) {
      assert.equal((await request(slug, "interactions")).status, 404);
      for (const route of ["like", "favorite", "comments"]) {
        assert.equal((await request(slug, route, "POST", { client_id: "reader", body: "test" })).status, 404);
      }
    }
    assert.equal((await request("online-only", "like", "POST", {})).status, 422);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM "like"').get().n, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM comment").get().n, 0);
  } finally { sqlite.close(); }
});

test("allowlist follows filenames, explicit slugs and published state", () => {
  const dir = mkdtempSync(join(tmpdir(), "blog-static-posts-"));
  try {
    writeFileSync(join(dir, "new.md"), "---\r\ntitle: New\r\n---\r\nBody");
    writeFileSync(join(dir, "alias.md"), '---\nslug: "custom-slug"\npublished: true\n---\nBody');
    writeFileSync(join(dir, "draft.md"), '---\npublished: false\n---\nDraft');
    assert.deepEqual(publishedSlugs(pathToFileURL(dir + "/")), ["custom-slug", "new"]);
  } finally { rmSync(dir, { recursive: true }); }
});
