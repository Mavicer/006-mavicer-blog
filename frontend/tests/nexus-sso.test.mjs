import assert from "node:assert/strict";
import {createHash, randomBytes} from "node:crypto";
import test from "node:test";
import {fixture} from "./helpers/api.mjs";
const secret="local-test-only-"+"x".repeat(40), nexus="https://nexus.mavicer.cc";
const opaque=()=>randomBytes(32).toString("base64url");
const digest=s=>createHash("sha256").update(s).digest("base64url");
const auth={Authorization:`Bearer ${secret}`};
async function setup(){
 const f=fixture({origin:"https://mavicer.cc",env:{NEXUS_ORIGIN:nexus,NEXUS_SSO_SECRET:secret}});
 const account=await f.register();
 async function authorize(cookie=account.cookie, changes={}){
   const state=opaque(),verifier=opaque();
   const params=new URLSearchParams({client_id:"nexus",redirect_uri:nexus+"/api/auth/blog/callback",state,code_challenge:digest(verifier),code_challenge_method:"S256",...changes});
   const response=await import("esbuild").then(async ({build})=>{
     // Test the actual route handler with a real SQLite D1 adapter.
     const {outputFiles}=await build({entryPoints:[new URL('../server/nexus-sso.ts',import.meta.url).pathname],bundle:true,platform:"node",format:"esm",write:false});
     const {nexusSsoRoute}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
     return nexusSsoRoute({request:new Request("https://mavicer.cc/api/auth/nexus/authorize?"+params,{headers:{Cookie:cookie}}),env:{DB:f.DB,NEXUS_ORIGIN:nexus,NEXUS_SSO_SECRET:secret}},"auth/nexus/authorize");
   });
   return {response,state,verifier,code:new URL(response.headers.get("Location"),"https://mavicer.cc").searchParams.get("code")};
 }
 return {...f,account,authorize};
}
const post=(f,path,body,headers=auth)=>f.request('/auth/nexus/'+path,{method:'POST',body,headers});
test('authorization requires exact callback, anonymous silent entry returns cleanly, PKCE code is single-use',async()=>{
 const f=await setup();try{
  const silent=await f.authorize('',{prompt:'none'});assert.equal(new URL(silent.response.headers.get('location')).searchParams.get('error'),'login_required');
  const a=await f.authorize();assert(a.code);
  const body={code:a.code,code_verifier:a.verifier,redirect_uri:nexus+'/api/auth/blog/callback'};
  assert.equal((await post(f,'token',body,{})).status,401);
  assert.equal((await post(f,'token',{...body,redirect_uri:'https://evil.test/callback'})).status,400);
  assert.equal((await post(f,'token',{...body,code_verifier:opaque()})).status,401);
  const granted=await post(f,'token',body);assert.equal(granted.status,200);
  assert.equal((await post(f,'token',body)).status,401);
  assert.equal((await post(f,'introspect',{token:granted.data.access_token})).data.user.id,f.account.data.user.id);
 }finally{f.sqlite.close();}
});
test('blog logout, password reset and Nexus logout revoke the shared identity; owner status stays live',async()=>{
 const f=await setup();try{
  async function grant(){const a=await f.authorize();return (await post(f,'token',{code:a.code,code_verifier:a.verifier,redirect_uri:nexus+'/api/auth/blog/callback'})).data.access_token;}
  const token=await grant();
  f.sqlite.prepare('UPDATE blog_user SET is_owner=1 WHERE id=?').run(f.account.data.user.id);
  assert.equal((await post(f,'introspect',{token})).data.user.is_owner,true);
  f.sqlite.prepare('UPDATE blog_user SET must_change_password=1 WHERE id=?').run(f.account.data.user.id);
  assert.equal((await post(f,'introspect',{token})).data.active,false);
  f.sqlite.prepare('UPDATE blog_user SET must_change_password=0 WHERE id=?').run(f.account.data.user.id);
  assert.equal((await post(f,'logout',{token})).status,200);
  assert.equal((await f.request('/auth/me',{cookie:f.account.cookie})).status,401);
  assert.equal((await post(f,'introspect',{token})).data.active,false);
  const other=await f.register('another');const a=await f.authorize(other.cookie);
  const second=(await post(f,'token',{code:a.code,code_verifier:a.verifier,redirect_uri:nexus+'/api/auth/blog/callback'})).data.access_token;
  await f.request('/auth/logout',{method:'POST',cookie:other.cookie});
  assert.equal((await post(f,'introspect',{token:second})).data.active,false);
 }finally{f.sqlite.close();}
});
