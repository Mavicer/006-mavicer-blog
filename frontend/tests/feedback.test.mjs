import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { fixture } from "./helpers/api.mjs";
const message = () => ({ category: "bug", body: "按钮不工作 <script>alert(1)</script>", submission_key: randomUUID() });
test("anonymous submission and owner-only read", async () => {
 const f=fixture(); try {
  const body=message();
  assert.equal((await f.request('/feedback',{method:'POST',body})).status,201);
  assert.deepEqual((await f.request('/feedback')).data.items,[]);
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

test("anonymous receipts isolate visitors and cannot take over a submission key",async()=>{
 const f=fixture();try{
  const first={...message(),receipt_token:'a'.repeat(64)};
  const second={...message(),receipt_token:'b'.repeat(64),body:'second visitor'};
  assert.equal((await f.request('/feedback',{method:'POST',body:first})).status,201);
  assert.equal((await f.request('/feedback',{method:'POST',body:second})).status,201);
  const own=token=>f.request('/feedback',{headers:{'X-Feedback-Token':token}});
  const a=await own(first.receipt_token),b=await own(second.receipt_token);
  assert.equal(a.data.items.length,1);assert.equal(a.data.items[0].body,first.body);
  assert.equal(b.data.items.length,1);assert.equal(b.data.items[0].body,second.body);
  assert.deepEqual((await own('c'.repeat(64))).data.items,[]);
  assert.equal((await f.request('/feedback',{method:'POST',body:{...first,receipt_token:second.receipt_token}})).status,409);
  assert.equal((await own(second.receipt_token)).data.items.length,1);
  assert.equal((await f.request('/feedback',{method:'POST',body:first})).status,201);
  assert.equal((await own(first.receipt_token)).data.items.length,1);
  const receipt=f.sqlite.prepare('SELECT receipt_hash FROM private_feedback_receipt LIMIT 1').get();
  assert.notEqual(receipt.receipt_hash,first.receipt_token);
 }finally{f.sqlite.close();}
});
test("owner unread count persists; marking a snapshot does not clear later messages",async()=>{
 const f=fixture();try{
  const owner=await f.register('owner');f.sqlite.prepare("UPDATE blog_user SET is_owner=1 WHERE username='owner'").run();
  const member=await f.register('member');
  assert.equal((await f.request('/admin/feedback/unread')).status,401);
  assert.equal((await f.request('/admin/feedback/unread',{cookie:member.cookie})).status,403);
  const token='d'.repeat(64);
  await f.request('/feedback',{method:'POST',body:{...message(),receipt_token:token}});
  let rows=(await f.request('/admin/feedback',{cookie:owner.cookie})).data.items;
  const firstId=rows[0].id;
  await f.request('/feedback',{method:'POST',body:{...message(),receipt_token:token}});
  const unread=()=>f.request('/admin/feedback/unread',{cookie:owner.cookie});
  assert.equal((await unread()).data.unread,2);
  assert.equal((await f.request('/admin/feedback/read',{method:'POST',cookie:member.cookie,body:{ids:[firstId]}})).status,403);
  assert.equal((await f.request('/admin/feedback/read',{method:'POST',cookie:owner.cookie,body:{ids:[firstId]}})).status,200);
  assert.equal((await unread()).data.unread,1);
  assert.equal((await f.request('/feedback',{headers:{'X-Feedback-Token':token}})).data.items.find(x=>x.id===firstId).read_at !== null,true);
  await f.request('/admin/feedback/read',{method:'POST',cookie:owner.cookie,body:{ids:[firstId]}});
  assert.equal((await unread()).data.unread,1);
  rows=(await f.request('/admin/feedback',{cookie:owner.cookie})).data.items;
  assert.equal(rows.length,2);assert.equal(rows[0].read_at,null);
 }finally{f.sqlite.close();}
});
test("legacy messages remain owner-only and cannot be claimed by knowing the old submission id",async()=>{
 const f=fixture();try{
  const legacy=message();await f.request('/feedback',{method:'POST',body:legacy});
  assert.equal((await f.request('/feedback',{method:'POST',body:{...legacy,receipt_token:'e'.repeat(64)}})).status,409);
  assert.deepEqual((await f.request('/feedback',{headers:{'X-Feedback-Token':'e'.repeat(64)}})).data.items,[]);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM private_feedback').get().n,1);
 }finally{f.sqlite.close();}
});
