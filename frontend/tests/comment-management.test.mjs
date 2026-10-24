import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./helpers/api.mjs";

const collection = "/posts/outside-the-classroom/comments";
const route = (id) => `${collection}/${id}`;
async function accounts(f) {
  const author = await f.register("author"), other = await f.register("other"), owner = await f.register("owner");
  f.sqlite.prepare("UPDATE blog_user SET is_owner = 1 WHERE id = ?").run(owner.data.user.id);
  const created = await f.request(collection, { method: "POST", cookie: author.cookie, body: { body: "原始评论" } });
  assert.equal(created.status, 201);
  return { author, other, owner, comment: created.data };
}

test("only the authenticated owner can edit; author and forged owner claims cannot", async () => {
  const f = fixture(); try {
    const { author, other, owner, comment } = await accounts(f);
    for (const [cookie, expected] of [["", 401], [author.cookie, 403], [other.cookie, 403]]) {
      assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie,
        body: { body: "越权改写", is_owner: true, user_id: owner.data.user.id }, headers: { Authorization: "Bearer forged" } })).status, expected);
    }
    const updated = await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie,
      body: { body: "  博主修订\n第二行  ", author_name: "冒充作者", user_id: owner.data.user.id, created_at: "forged" } });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.body, "博主修订\n第二行");
    assert.equal(updated.data.author_name, comment.author_name);
    assert.equal(updated.data.created_at, comment.created_at);
    assert.equal(updated.data.is_own, false);
    assert.ok(Date.parse(updated.data.updated_at) >= Date.parse(comment.updated_at));
    assert.equal(f.sqlite.prepare("SELECT user_id FROM comment WHERE id = ?").get(comment.id).user_id, author.data.user.id);
    assert.equal((await f.request(collection, { cookie: author.cookie })).data[0].is_own, true);
    assert.equal((await f.request(collection)).data[0].body, updated.data.body);
  } finally { f.sqlite.close(); }
});

test("invalid edits, cross-site requests and wrong article IDs cannot change a comment", async () => {
  const f = fixture(); try {
    const { owner, comment } = await accounts(f);
    for (const body of ["", " \n ", "x".repeat(3001), 123, null]) {
      assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: { body } })).status, 422);
    }
    assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: "invalid-json" })).status, 400);
    assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: { body: "x" }, headers: { Origin: "https://evil.test" } })).status, 403);
    assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: { body: "x" }, headers: { "Content-Type": "text/plain" } })).status, 415);
    assert.equal((await f.request(`/posts/wrong/comments/${comment.id}`, { method: "PATCH", cookie: owner.cookie, body: { body: "x" } })).status, 404);
    assert.equal((await f.request(route(9999), { method: "PATCH", cookie: owner.cookie, body: { body: "x" } })).status, 404);
    assert.equal((await f.request(collection)).data[0].body, comment.body);
    assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: { body: "x".repeat(3000) } })).status, 200);
    f.sqlite.exec("UPDATE account_rate_limit SET hits = 120 WHERE key LIKE 'comment-edit:%'");
    assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: { body: "rate-limited" } })).status, 429);
    f.sqlite.exec("UPDATE blog_session SET expires_at = 1");
    for (const method of ["PATCH", "DELETE"]) assert.equal((await f.request(route(comment.id), { method, cookie: owner.cookie, body: { body: "x" } })).status, 401);
    assert.equal((await f.request(collection)).data[0].body.length, 3000);
  } finally { f.sqlite.close(); }
});

test("authors withdraw their own edited comments; owners withdraw any comment; deleted IDs cannot be edited", async () => {
  const f = fixture(); try {
    const { author, other, owner, comment } = await accounts(f);
    assert.equal((await f.request(route(comment.id), { method: "DELETE", cookie: other.cookie, body: { user_id: author.data.user.id, is_owner: true } })).status, 403);
    assert.equal((await f.request(`/posts/wrong/comments/${comment.id}`, { method: "DELETE", cookie: owner.cookie })).status, 404);
    await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: { body: "已修订" } });
    assert.equal((await f.request(route(comment.id), { method: "DELETE", cookie: author.cookie })).status, 200);
    assert.equal((await f.request(route(comment.id), { method: "DELETE", cookie: author.cookie })).status, 404);
    assert.equal((await f.request(route(comment.id), { method: "PATCH", cookie: owner.cookie, body: { body: "不能复活" } })).status, 404);
    const next = await f.request(collection, { method: "POST", cookie: other.cookie, body: { body: "另一条评论" } });
    assert.equal((await f.request(route(next.data.id), { method: "DELETE", cookie: owner.cookie })).status, 200);
    assert.deepEqual((await f.request(collection)).data, []);
  } finally { f.sqlite.close(); }
});

test("legacy comments remain unclaimable but owner can manage them; password-reset users cannot write", async () => {
  const f = fixture({ legacy: true }); try {
    const { author, owner, comment } = await accounts(f);
    assert.equal((await f.request(route(1), { method: "PATCH", cookie: author.cookie, body: { body: "认领旧评论", client_id: "known-client" } })).status, 403);
    const updated = await f.request(route(1), { method: "PATCH", cookie: owner.cookie, body: { body: "修订历史评论" } });
    assert.equal(updated.status, 200); assert.equal(updated.data.author_name, "旧访客");
    assert.equal(updated.data.is_own, false);
    assert.equal((await f.request(route(1), { method: "DELETE", cookie: owner.cookie })).status, 200);
    const own = await f.request(collection, { method: "POST", cookie: owner.cookie, body: { body: "博主留言" } });
    assert.equal((await f.request(route(own.data.id), { method: "PATCH", cookie: owner.cookie, body: { body: "博主修订自己的留言" } })).data.is_own, true);
    f.sqlite.prepare("UPDATE blog_user SET must_change_password = 1 WHERE id = ?").run(owner.data.user.id);
    for (const method of ["PATCH", "DELETE"]) assert.equal((await f.request(route(comment.id), { method, cookie: owner.cookie, body: { body: "x" } })).status, 403);
    assert.equal((await f.request(collection)).data.find(c => c.id === comment.id).body, "原始评论");
  } finally { f.sqlite.close(); }
});
