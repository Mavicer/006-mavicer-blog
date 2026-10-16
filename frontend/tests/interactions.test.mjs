import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
import test from "node:test";
import { publishedSlugs } from "../scripts/generate-static-posts.mjs";

import { fixture, password } from "./helpers/api.mjs";
const slug = "outside-the-classroom";
const post = (route) => `/posts/${slug}/${route}`;

test("anonymous likes work; comments and account favorites require a real session", async () => {
  const f = fixture(); try {
    assert.equal((await f.request(post("interactions"))).status, 200);
    const liked = await f.request(post("like"), { method: "POST", body: { client_id: "browser", liked: true } });
    assert.equal(liked.data.likes, 1);
    await f.request(post("like"), { method: "POST", body: { client_id: "browser", liked: true } });
    assert.equal((await f.request(post("interactions"))).data.likes, 1);
    for (const [route, method] of [[post("comments"), "POST"], [post("favorite"), "PUT"], ["/me/favorites", "GET"]]) {
      const result = await f.request(route, { method, body: { client_id: "fake", user_id: "fake", body: "fake" }, headers: { Authorization: "Bearer forged", Cookie: "__Host-blog_session=forged" } });
      assert.equal(result.status, 401);
    }
  } finally { f.sqlite.close(); }
});

test("registration uses real hashes, host-only cookies, and never accepts owner claims", async () => {
  const f = fixture(); try {
    const alice = await f.register("Alice", { is_owner: true, owner_key: "anything" });
    assert.equal(alice.data.user.is_owner, false);
    assert.equal(alice.data.user.username, "alice");
    assert.equal("password_hash" in alice.data.user, false);
    assert.match(alice.headers.get("Set-Cookie"), /HttpOnly; Secure; SameSite=Lax/);
    assert.equal(alice.headers.get("Cache-Control"), "no-store");
    const stored = f.sqlite.prepare("SELECT password_hash FROM blog_user").get().password_hash;
    assert.match(stored, /^scrypt\$/); assert.equal(stored.includes(password), false);
    assert.equal((await f.request("/auth/me", { cookie: alice.cookie })).data.id, alice.data.user.id);
    const duplicate = await f.request("/auth/register", { method: "POST", body: { username: "ALICE", password } });
    assert.equal(duplicate.status, 409);
    assert.equal((await f.request("/admin/users", { cookie: alice.cookie })).status, 403);
    assert.equal((await f.request("/auth/login", { method: "POST", body: { username: "alice", password: "incorrect-password" } })).status, 401);
    const login = await f.request("/auth/login", { method: "POST", body: { username: "ALICE", password } });
    assert.equal(login.status, 200);
    assert.notEqual(login.cookie, alice.cookie);
  } finally { f.sqlite.close(); }
});

test("favorites persist across sessions, are idempotent, and remain isolated between accounts", async () => {
  const f = fixture(); try {
    const a = await f.register("alice"), b = await f.register("bob");
    for (let i = 0; i < 2; i++) assert.equal((await f.request(post("favorite"), { method: "PUT", cookie: a.cookie })).data.favorites, 1);
    const saved = await f.request("/me/favorites", { cookie: a.cookie });
    assert.equal(saved.data[0].title, "在课堂之外");
    assert.deepEqual((await f.request("/me/favorites", { cookie: b.cookie })).data, []);
    assert.equal((await f.request(post("interactions"), { cookie: b.cookie })).data.favorited, false);
    await f.request(post("favorite"), { method: "DELETE", cookie: b.cookie });
    assert.equal((await f.request("/me/favorites", { cookie: a.cookie })).data.length, 1);
    const second = await f.request("/auth/login", { method: "POST", body: { username: "alice", password } });
    assert.equal((await f.request("/me/favorites", { cookie: second.cookie })).data.length, 1);
    await f.request(post("favorite"), { method: "DELETE", cookie: a.cookie });
    assert.deepEqual((await f.request("/me/favorites", { cookie: second.cookie })).data, []);
  } finally { f.sqlite.close(); }
});

test("comment authors and deletion permissions come only from authenticated accounts", async () => {
  const f = fixture(); try {
    const a = await f.register("alice"), b = await f.register("bob");
    const comment = await f.request(post("comments"), { method: "POST", cookie: a.cookie, body: { body: "真实评论", user_id: b.data.user.id, author_name: "冒充管理员" } });
    assert.equal(comment.status, 201); assert.equal(comment.data.author_name, "alice");
    const route = post(`comments/${comment.data.id}`);
    assert.equal((await f.request(route, { method: "DELETE", cookie: b.cookie })).status, 403);
    assert.equal((await f.request(post("comments"), { cookie: a.cookie })).data[0].is_own, true);
    assert.equal((await f.request(post("comments"), { cookie: b.cookie })).data[0].is_own, false);
    assert.equal((await f.request(route, { method: "DELETE" })).status, 401);
    assert.equal((await f.request(route, { method: "DELETE", cookie: a.cookie })).status, 200);
    assert.deepEqual((await f.request(post("comments"))).data, []);
  } finally { f.sqlite.close(); }
});

test("legacy comments and anonymous favorite counts survive migration without being claimable", async () => {
  const f = fixture({ legacy: true }); try {
    const a = await f.register("alice");
    const inter = await f.request(post("interactions?client_id=known-client"), { cookie: a.cookie });
    assert.equal(inter.data.favorites, 1); assert.equal(inter.data.favorited, false);
    const comments = await f.request(post("comments?client_id=known-client"), { cookie: a.cookie });
    assert.equal(comments.data[0].body, "历史评论"); assert.equal(comments.data[0].is_own, false);
    assert.equal((await f.request(post("comments/1"), { method: "DELETE", cookie: a.cookie, body: { client_id: "known-client" } })).status, 403);
    f.sqlite.prepare("UPDATE blog_user SET is_owner = 1 WHERE id = ?").run(a.data.user.id);
    assert.equal((await f.request(post("comments/1"), { method: "DELETE", cookie: a.cookie })).status, 200);
  } finally { f.sqlite.close(); }
});

test("logout, expiry and password changes invalidate server sessions", async () => {
  const f = fixture(); try {
    const a = await f.register("alice");
    await f.request("/auth/logout", { method: "POST", cookie: a.cookie });
    assert.equal((await f.request("/auth/me", { cookie: a.cookie })).status, 401);
    const login = await f.request("/auth/login", { method: "POST", body: { username: "alice", password } });
    const other = await f.request("/auth/login", { method: "POST", body: { username: "alice", password } });
    assert.equal((await f.request("/auth/password", { method: "POST", cookie: login.cookie, body: { current_password: password, new_password: "new-test-password-2026" } })).status, 200);
    assert.equal((await f.request("/auth/me", { cookie: other.cookie })).status, 401);
    assert.equal((await f.request("/auth/login", { method: "POST", body: { username: "alice", password } })).status, 401);
    const fresh = await f.request("/auth/login", { method: "POST", body: { username: "alice", password: "new-test-password-2026" } });
    assert.equal(fresh.status, 200);
    f.sqlite.exec("UPDATE blog_session SET expires_at = 1");
    assert.equal((await f.request("/auth/me", { cookie: fresh.cookie })).status, 401);
  } finally { f.sqlite.close(); }
});

test("admin reset revokes sessions and requires a fresh password before interactions", async () => {
  const f = fixture(); try {
    const owner = await f.register("owner"), member = await f.register("alice");
    f.sqlite.prepare("UPDATE blog_user SET is_owner = 1 WHERE id = ?").run(owner.data.user.id);
    const route = `/admin/users/${member.data.user.id}/reset-password`;
    assert.equal((await f.request(route, { method: "POST", cookie: member.cookie, body: { current_password: password } })).status, 403);
    const reset = await f.request(route, { method: "POST", cookie: owner.cookie, body: { current_password: password } });
    assert.equal(reset.status, 200); assert.ok(reset.data.temporary_password.length >= 12);
    assert.equal((await f.request("/auth/me", { cookie: member.cookie })).status, 401);
    const login = await f.request("/auth/login", { method: "POST", body: { username: "alice", password: reset.data.temporary_password } });
    assert.equal(login.status, 200); assert.equal(login.data.user.must_change_password, true);
    assert.equal((await f.request(post("favorite"), { method: "PUT", cookie: login.cookie })).status, 403);
    assert.equal((await f.request("/auth/password", { method: "POST", cookie: login.cookie, body: { current_password: reset.data.temporary_password, new_password: "changed-again-for-test-2" } })).status, 200);
  } finally { f.sqlite.close(); }
});

test("CSRF, malformed JSON, input limits, brute-force limits and invalid articles are rejected", async () => {
  const f = fixture(); try {
    assert.equal((await f.request("/auth/register", { method: "POST", headers: { Origin: "https://evil.test" } })).status, 403);
    assert.equal((await f.request("/auth/register", { method: "POST", body: "not-json" })).status, 400);
    assert.equal((await f.request("/auth/register", { method: "POST", body: { username: "x", password: "short" } })).status, 422);
    assert.equal((await f.request("/auth/login", { method: "POST", body: "x".repeat(17000) })).status, 413);
    assert.equal((await f.request(post("comments"), { method: "POST", headers: { "Content-Type": "text/plain" } })).status, 415);
    const a = await f.register("alice");
    for (const [path, method, body] of [["/posts/unknown/favorite", "PUT", {}], ["/posts/unknown/comments", "POST", { body: "test" }]]) {
      assert.equal((await f.request(path, { method, body, cookie: a.cookie })).status, 404);
    }
    assert.equal((await f.request(post("comments"), { method: "POST", cookie: a.cookie, body: { body: "x".repeat(3001) } })).status, 422);
    f.sqlite.exec("UPDATE account_rate_limit SET hits = 100 WHERE key LIKE 'login-ip:%'");
    // First create the rate bucket, then exhaust it without 30 expensive KDFs.
    await f.request("/auth/login", { method: "POST", body: { username: "alice", password } });
    f.sqlite.exec("UPDATE account_rate_limit SET hits = 100 WHERE key LIKE 'login-ip:%'");
    assert.equal((await f.request("/auth/login", { method: "POST", body: { username: "alice", password } })).status, 429);
  } finally { f.sqlite.close(); }
});

test("failed migration returns 503 and is retried; database-only posts still work", async () => {
  const f = fixture({ failMigration: true }); try {
    assert.equal((await f.request("/health")).status, 503);
    assert.equal((await f.request("/health")).status, 200);
    f.sqlite.exec(`INSERT INTO post (slug, title) VALUES ('online-only', 'Online'); INSERT INTO "like" (post_slug, client_id) VALUES ('online-only', 'reader');`);
    const inter = await f.request("/posts/online-only/interactions?client_id=reader");
    assert.equal(inter.status, 200); assert.equal(inter.data.likes, 1); assert.equal(inter.data.liked, true);
  } finally { f.sqlite.close(); }
});

test("static allowlist handles CRLF, custom slugs and unpublished posts", () => {
  const dir = mkdtempSync(join(tmpdir(), "blog-static-posts-")); try {
    writeFileSync(join(dir, "new.md"), "---\r\ntitle: New\r\n---\r\nBody");
    writeFileSync(join(dir, "alias.md"), '---\nslug: "custom-slug"\npublished: true\n---\nBody');
    writeFileSync(join(dir, "draft.md"), '---\npublished: false\n---\nDraft');
    assert.deepEqual(publishedSlugs(pathToFileURL(dir + "/")), ["custom-slug", "new"]);
  } finally { rmSync(dir, { recursive: true }); }
});
