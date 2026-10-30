import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
async function load(path){const {outputFiles}=await build({entryPoints:[new URL(path,import.meta.url).pathname],bundle:true,platform:"browser",format:"esm",write:false,define:{'import.meta.env.VITE_NEXUS_ANNOUNCEMENT':'"0"','import.meta.env.VITE_NEXUS_LAUNCHED':'"0"','import.meta.env.VITE_NEXUS_URL':'"https://nexus.mavicer.cc/"'}});return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);}
const service=await load('../src/services/featureReleases.ts');
const nav=await load('../src/config/nav.ts');
const release={id:'example-v1',releasedAt:'2026-10-30T00:00:00+08:00'};
const start=Date.parse(release.releasedAt);
const makeStore=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}};
test('notice starts on release and expires at exactly five days, never on first visit',()=>{
 const store=makeStore();assert.equal(service.isFeatureUnread(release,store,start-1),false);assert.equal(service.isFeatureUnread(release,store,start),true);assert.equal(service.isFeatureUnread(release,store,start+service.FEATURE_NOTICE_MS-1),true);assert.equal(service.isFeatureUnread(release,store,start+service.FEATURE_NOTICE_MS),false);assert.equal(service.isFeatureUnread(release,store,start+30*86400000),false);
});
test('opening the feature persists read status; a different release remains independent',()=>{
 const store=makeStore();service.markFeatureRead(release,store);assert.equal(service.isFeatureUnread(release,store,start+100),false);assert.equal(service.isFeatureUnread({...release,id:'another-v1'},store,start+100),true);assert.equal(service.isFeatureUnread({...release,id:'example-v2'},store,start+100),true);
});
test('blocked storage or invalid release date cannot cause a persistent red dot',()=>{
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};assert.equal(service.isFeatureUnread(release,blocked,start),false);assert.equal(service.markFeatureRead(release,blocked),false);assert.equal(service.isFeatureUnread({...release,releasedAt:'invalid'},makeStore(),start),false);
});
test('Nexus replaces category in its existing slot only after launch',()=>{
 const before=nav.buildNavItems(false,'https://nexus.mavicer.cc/');const after=nav.buildNavItems(true,'https://nexus.mavicer.cc/');const i=before.findIndex(x=>x.label==='分类');assert(i>=0);assert.equal(after.length,before.length);assert.equal(after[i].label,'Nexus');assert.equal(after[i].external,true);assert(!after.some(x=>x.label==='分类'));assert.deepEqual(before.filter((_,j)=>i!==j),after.filter((_,j)=>i!==j));
});
