import assert from "node:assert/strict";
import { createHash, scryptSync } from "node:crypto";
import test from "node:test";
import { fixture } from "./helpers/api.mjs";

const blob = (text) => createHash("sha1").update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest("hex");
const route = "/admin/publishing";
const input = () => ({ request_id: crypto.randomUUID(), action: "create", slug: "publishing-test", title: "测试标题", category: "随笔", tags: ["测试"], excerpt: "", mode: "plain", body: "第一句。\n第二句。\n\n另一个自然段。" });

async function setup(t) {
  const f = fixture({ env: { GITHUB_PUBLISH_TOKEN: "test-only-credential" } });
  const owner = await f.register("管理员");
  f.sqlite.prepare("UPDATE blog_user SET is_owner = 1 WHERE id = ?").run(owner.data.user.id);
  const files = new Map(), commits = [], calls = [];
  let loseResponse = false, conclusion = null, marker = [];
  t.mock.method(globalThis, "fetch", async (url, options = {}) => {
    const u = new URL(url); calls.push({ url: u, options });
    if (u.origin === "https://blog-cmc.pages.dev") return Response.json({ articles: marker });
    assert.equal(u.origin, "https://api.github.com");
    assert.equal(options.headers.Authorization, "Bearer test-only-credential");
    const prefix = "/repos/Mavicer/006-mavicer-blog/";
    assert.ok(u.pathname.startsWith(prefix));
    const resource = u.pathname.slice(prefix.length);
    if (resource.startsWith("contents/")) {
      const path = resource.slice(9);
      if (options.method === "PUT") {
        const data = JSON.parse(options.body), current = files.get(path);
        assert.equal(data.branch, "main");
        if ((current?.sha || undefined) !== data.sha) return Response.json({}, { status: 409 });
        const text = Buffer.from(data.content, "base64").toString("utf8");
        files.set(path, { type: "file", encoding: "base64", content: data.content, sha: blob(text), size: Buffer.byteLength(text), path });
        const sha = createHash("sha1").update(data.message).digest("hex");
        commits.unshift({ sha, commit: { message: data.message } });
        if (loseResponse) { loseResponse = false; throw new Error("response lost after write"); }
        return Response.json({ commit: { sha } });
      }
      assert.equal(u.searchParams.get("ref"), "main");
      return Response.json(files.get(path) || {}, { status: files.has(path) ? 200 : 404 });
    }
    if (resource === "commits") return Response.json(commits);
    if (/commits\/[^/]+\/check-runs/.test(resource)) return Response.json({ check_runs: [{ name: "Cloudflare Pages", status: conclusion ? "completed" : "in_progress", conclusion }] });
    assert.fail(`Unexpected external request: ${u.pathname}`);
  });
  t.after(() => f.sqlite.close());
  const send = (body) => f.request(route, { method: "POST", cookie: owner.cookie, body });
  const status = (id) => { f.sqlite.exec("UPDATE article_publish_job SET checked_at = 0"); return f.request(`${route}/jobs/${id}`, { cookie: owner.cookie }); };
  return { ...f, owner, files, commits, calls, send, status, lose: () => { loseResponse = true; }, check: (value) => { conclusion = value; }, visible: (value) => { marker = value; } };
}

test("Chinese usernames and distinct member/admin password rules use database roles", async () => {
  const f = fixture(); try {
    for (const password of ["12345678", "abcdefgh", "abc1234"]) {
      assert.equal((await f.request("/auth/register", { method: "POST", body: { username: "中文访客", password } })).status, 422);
    }
    const user = await f.register("中文访客", { password: "abc12345" });
    const salt = "1".repeat(32), password = "123789";
    const hash = `scrypt$16384$8$5$${salt}$${scryptSync(password, salt, 64, { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 }).toString("hex")}`;
    f.sqlite.prepare("UPDATE blog_user SET password_hash = ?, is_owner = 1 WHERE id = ?").run(hash, user.data.user.id);
    const login = await f.request("/auth/login", { method: "POST", body: { username: "中文访客", password } });
    assert.equal(login.status, 200); assert.equal(login.data.user.is_owner, true);
    assert.equal((await f.request("/auth/login", { method: "POST", body: { username: "不存在", password } })).status, 401);
  } finally { f.sqlite.close(); }
});

test("publishing requires an authenticated database owner and rejects path traversal", async (t) => {
  const f = await setup(t), member = await f.register("member");
  assert.equal((await f.request(route, { method: "POST", body: input() })).status, 401);
  assert.equal((await f.request(route, { method: "POST", body: input(), cookie: member.cookie })).status, 403);
  assert.equal((await f.send({ ...input(), slug: "../../secrets" })).status, 422);
  assert.equal(f.calls.length, 0);
});

test("plain text preserves paragraphs; duplicate requests write one commit; deployment needs exact public version", async (t) => {
  const f = await setup(t), body = input();
  const first = await f.send(body);
  assert.equal(first.status, 202); assert.equal(first.data.state, "submitted");
  const file = f.files.get("frontend/src/data/posts/publishing-test.md");
  assert.ok(Buffer.from(file.content, "base64").toString("utf8").endsWith("第一句。第二句。\n\n另一个自然段。\n"));
  assert.equal((await f.send(body)).data.commit_sha, first.data.commit_sha);
  assert.equal(f.commits.length, 1);
  assert.equal((await f.send({ ...body, title: "different" })).status, 409);
  f.check("success");
  assert.equal((await f.status(body.request_id)).data.state, "submitted");
  f.visible([{ slug: body.slug, sha: "old-version" }]);
  assert.equal((await f.status(body.request_id)).data.state, "submitted");
  f.visible([{ slug: body.slug, sha: file.sha }]);
  assert.equal((await f.status(body.request_id)).data.state, "published");
});

test("editing preserves original metadata and indented Markdown; stale versions never overwrite", async (t) => {
  const f = await setup(t), path = "frontend/src/data/posts/publishing-test.md";
  const original = '---\ntitle: Before\ndate: "2024-01-02"\ncustom: { nested: true }\n---\n\nOriginal\n';
  f.files.set(path, { type: "file", encoding: "base64", content: Buffer.from(original).toString("base64"), sha: blob(original), size: original.length, path });
  const bad = await f.send({ ...input(), action: "update", sha: "stale" });
  assert.equal(bad.status, 409); assert.equal(f.commits.length, 0);
  const body = { ...input(), action: "update", sha: blob(original), mode: "markdown", body: "    code()\n\nParagraph" };
  assert.equal((await f.send(body)).data.state, "submitted");
  const text = Buffer.from(f.files.get(path).content, "base64").toString("utf8");
  assert.match(text, /date: "2024-01-02"/); assert.match(text, /custom: \{"nested":true\}/);
  assert.ok(text.endsWith("    code()\n\nParagraph\n"));
  assert.equal((await f.send({ ...body, request_id: crypto.randomUUID() })).status, 409);
  assert.equal(f.commits.length, 1);
});

test("lost GitHub responses recover the original commit without resubmitting", async (t) => {
  const f = await setup(t), body = input(); f.lose();
  assert.equal((await f.send(body)).data.state, "uncertain");
  assert.equal((await f.status(body.request_id)).data.state, "building");
  assert.equal((await f.send(body)).data.state, "building");
  assert.equal(f.commits.length, 1);
  f.check("failure");
  const failed = await f.status(body.request_id);
  assert.equal(failed.data.state, "failed"); assert.ok(failed.data.commit_sha);
  assert.equal(f.files.size, 1);
});
