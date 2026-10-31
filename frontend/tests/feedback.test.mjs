import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { fixture } from "./helpers/api.mjs";
const message = () => ({ category: "bug", body: "按钮不工作 <script>alert(1)</script>", submission_key: randomUUID() });
test("anonymous submission and owner-only read", async () => {
 const f=fixture(); try {
  const body=message();
  assert.equal((await f.request('/feedback',{method:'POST',body})).status,201);
  assert.equal((await f.request('/feedback')).status,405);
  assert.equal((await f.request('/admin/feedback')).status,401);
  const member=await f.register();
  assert.equal((await f.request('/admin/feedback',{cookie:member.cookie})).status,403);
  const owner=await f.register('owner');
  f.sqlite.prepare('UPDATE blog_user SET is_owner=1 WHERE username=?').run('owner');
  const result=await f.request('/admin/feedback',{cookie:owner.cookie});
  assert.equal(result.status,200);assert.equal(result.data.items[0].body,body.body);
  assert.equal(result.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(f.sqlite.prepare('PRAGMA table_info(private_feedback)').all().map(x=>x.name),['id','submission_key','category','body','created_at']);
 } finally { f.sqlite.close(); }
});
test("validation, retry deduplication, abuse limit and cross-site rejection",async()=>{
 const f=fixture();try{
  assert.equal((await f.request('/feedback',{method:'POST',body:{...message(),body:'   '}})).status,400);
  assert.equal((await f.request('/feedback',{method:'POST',body:{...message(),body:'x'.repeat(2001)}})).status,400);
  assert.equal((await f.request('/feedback',{method:'POST',body:message(),headers:{Origin:'https://evil.test'}})).status,403);
  const body=message();
  for(let i=0;i<2;i++)assert.equal((await f.request('/feedback',{method:'POST',body})).status,201);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM private_feedback').get().n,1);
  for(let i=0;i<3;i++)assert.equal((await f.request('/feedback',{method:'POST',body:message()})).status,201);
  assert.equal((await f.request('/feedback',{method:'POST',body:message()})).status,429);
 }finally{f.sqlite.close();}
});
