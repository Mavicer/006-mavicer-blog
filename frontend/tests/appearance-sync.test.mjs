import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const {outputFiles}=await build({entryPoints:[new URL('../src/appearance-bridge.ts',import.meta.url).pathname],bundle:true,platform:'browser',format:'esm',write:false,define:{'import.meta.env.VITE_NEXUS_URL':'"https://nexus.mavicer.cc/"','import.meta.env.VITE_NEXUS_LAUNCHED':'"0"','import.meta.env.VITE_NEXUS_ANNOUNCEMENT':'"0"'}});
const {savedSnapshot,acceptsAppearanceRequest}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
const store=v=>({getItem:k=>v[k]??null});
test('unset, default-auto, blocked and corrupt preferences preserve receiver defaults',()=>{
 for(const s of [store({}),store({MAVICER_THEME_MODE:'auto'}),store({MAVICER_APPEARANCE_V1:'invalid'}),{getItem(){throw Error('blocked')}}])assert.equal(savedSnapshot(s).configured,false);
});
test('saved appearance and pinned theme are read from the blog without writing Nexus preferences',()=>{
 const s=savedSnapshot(store({MAVICER_THEME_MODE:'dark',MAVICER_APPEARANCE_V1:JSON.stringify({background:'alpine',cardOpacity:73,fontSize:18,brightness:90,blur:4,scrollBlur:false})}));
 assert.equal(s.configured,true);assert.equal(s.theme,'dark');assert.equal(s.settings.background,'alpine');assert.equal(s.settings.cardOpacity,73);assert.equal(s.settings.fontSize,18);
 assert.equal(savedSnapshot(store({MAVICER_THEME_MODE:'light'})).configured,true);
});
test('appearance bridge rejects other origins and malformed requests',()=>{
 const data={type:'NEXUS_APPEARANCE_REQUEST',nonce:'12345678-1234-4321-8765-123456789012'};
 assert.equal(acceptsAppearanceRequest({origin:'https://nexus.mavicer.cc',data},'https://nexus.mavicer.cc'),true);
 assert.equal(acceptsAppearanceRequest({origin:'https://evil.test',data},'https://nexus.mavicer.cc'),false);
 assert.equal(acceptsAppearanceRequest({origin:'https://nexus.mavicer.cc',data:{...data,nonce:'x'}},'https://nexus.mavicer.cc'),false);
});
