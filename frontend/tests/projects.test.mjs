import assert from 'node:assert/strict';
import { build } from 'esbuild';
import test from 'node:test';
const { outputFiles } = await build({ entryPoints: [new URL('../functions/api/projects.ts', import.meta.url).pathname], bundle: true, format: 'esm', write: false });
const { onRequestGet } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
test('projects cache successes, reject upstream errors and preserve genuine empty results', async () => {
const originalFetch = globalThis.fetch;
const originalCaches = globalThis.caches;
try {
let saved, calls=0; const pending=[];
globalThis.caches={default:{match:async()=>saved?.clone(),put:async(k,v)=>{saved=v;}}};
const ctx={request:new Request('https://blog.example/api/projects?retry=1'),waitUntil(p){pending.push(p);}};
const repo={name:'007-visuallab',fork:false,html_url:'https://github.com/Mavicer/007-visuallab',updated_at:'2026-10-19T00:00:00Z'};
globalThis.fetch=async()=>{calls++; return Response.json([repo,{...repo,fork:true}]);};
let r=await onRequestGet(ctx); assert.equal(r.status,200); assert.equal((await r.json()).length,1); await Promise.all(pending);
r=await onRequestGet(ctx); assert.equal(calls,1); assert.equal(r.status,200);
saved=null;
for(const value of [Response.json({message:'rate limit'},{status:403}),Response.json({message:'bad'}),Response.json([{name:'bad'}])]){
 globalThis.fetch=async()=>value; r=await onRequestGet(ctx); assert.equal(r.status,503); assert.equal(saved,null);
}
globalThis.fetch=async()=>Response.json([]); r=await onRequestGet(ctx);assert.deepEqual(await r.json(),[]);
console.log('API: success/filter/cache/403/invalid payload/empty list passed');

} finally { globalThis.fetch=originalFetch; if (originalCaches) globalThis.caches=originalCaches; else delete globalThis.caches; }
});
