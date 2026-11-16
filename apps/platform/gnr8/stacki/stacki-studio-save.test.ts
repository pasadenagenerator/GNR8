import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const compiled = buildSync({entryPoints:[fileURLToPath(new URL('./stacki-studio-save.tsx',import.meta.url))],bundle:true,write:false,format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime']}).outputFiles[0].text;
async function editor({unchanged=true, storedPending=false, delayed=false, requestPending=false, currentSource="", confirmedSource="", restoredRevision=3, storageMode='gnr8'}={}) {
 const callbacks:Record<string,Function>={}, storage=new Map<string,string>(), sent:any[]=[];
 if(storedPending)storage.set('gnr8:pending-save',JSON.stringify({operationId:'pending',expectedRevision:3,generation:0}));
 const config={platformOrigin:'https://platform.invalid',sessionId:'session',revision:3,sourceUnchanged:unchanged,sourceSha256:currentSource,storage:storageMode};
 storage.set('gnr8:revision',String(restoredRevision));
 const jsx=(type:any,props:any)=>({type,props});let effect:Function|undefined,release:Function=()=>{};
 const platform={postMessage:(message:any)=>sent.push(message)};
 const exports:any={};
 const api=runInNewContext(compiled+';module.exports',{module:{exports},exports,require:(name:string)=>name==='react'?{useEffect:(fn:Function)=>{effect=fn;},useState:()=>[0,()=>{}]}:{jsx,jsxs:jsx,Fragment:'fragment'},
  window:{document:{getElementById:()=>({inert:false})},addEventListener:(name:string,fn:Function)=>callbacks[name]=fn,close:()=>{}},
  sessionStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)},
  crypto:webcrypto,fetch:async()=>({ok:true,json:async()=>config}),setTimeout,clearTimeout,Date,console});
 const finishRequest=requestPending ? api.gnr8Request({method:"POST"}) : ()=>{};
 api.registerGnr8Document({whenSaved:()=>delayed?new Promise(resolve=>release=resolve):Promise.resolve()});
 api.Gnr8Save();effect!();await tick();
 callbacks.message({origin:config.platformOrigin,source:platform,data:{type:'gnr8:connect',sessionId:'session',revision:restoredRevision,sourceSha256:confirmedSource}});
 await tick();
 const state=()=>api.Gnr8Save().props.children[1].props.children;
 const save=()=>api.Gnr8Save().props.children[0].props.onClick();
 const receipt=(ok=true)=>{const op=sent.filter(x=>x.type==='gnr8:save').at(-1);callbacks.message({origin:config.platformOrigin,source:platform,data:{type:'gnr8:save-result',sessionId:'session',operationId:op.operationId,ok,revision:4,sha256:'a'.repeat(64),sourceSha256:confirmedSource,reason:'STACKI_DRAFT_CONFLICT'}});};
 return {api,state,save,receipt,sent,finishRequest,release:()=>release(),storage};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('fresh verified source is saved; mismatched source remains dirty',async()=>{
 assert.equal((await editor()).state(),'Saved to GNR8 · revision 3');
 assert.equal((await editor({unchanged:false})).state(),'Unsaved changes');
});
test('GitHub mode labels confirmed saves and undo edits as unsaved',async()=>{
 const e=await editor({storageMode:'github'});
 assert.equal(e.state(),'Saved to GitHub · revision 3');
 e.api.gnr8Dirty();
 assert.equal(e.state(),'Unsaved changes');
 const save=e.save();await tick();e.receipt();await save;await tick();
 assert.equal(e.state(),'Saved to GitHub · revision 4');
});
test('an edit during initialization cannot be cleared by its delayed response',async()=>{
 const e=await editor({delayed:true});e.api.gnr8Dirty();e.release();await tick();assert.equal(e.state(),'Unsaved changes');
});
test('failed save preserves pending operation; retry recovers it without a second operation',async()=>{
 const e=await editor();e.api.gnr8Dirty();const first=e.save();await tick();e.receipt(false);await first;await tick();
 assert.match(e.state(),/^Save failed: Conflicting revision/);assert(e.storage.has('gnr8:pending-save'));
 const second=e.save();await tick();e.receipt();await second;await tick();
 const ops=e.sent.filter(x=>x.type==='gnr8:save');assert.equal(ops[0].operationId,ops[1].operationId);
 assert.equal(e.state(),'Saved to GNR8 · revision 4');assert(!e.storage.has('gnr8:pending-save'));
});
test('newer edit while ambiguous save is pending survives recovery',async()=>{
 const e=await editor({storedPending:true});assert.equal(e.state(),'Save not confirmed · retry Save');
 e.api.gnr8Dirty();const save=e.save();await tick();e.receipt();await save;await tick();assert.equal(e.state(),'Unsaved changes');
});

test('initialization waits for an in-flight project write before accepting clean source',async()=>{
 const e=await editor({requestPending:true});assert.equal(e.state(),'Unsaved changes');
 e.finishRequest();await new Promise(resolve=>setTimeout(resolve,70));
 assert.equal(e.state(),'Saved to GNR8 · revision 3');
});

test('reload accepts only matching source from the trusted GNR8 receipt',async()=>{
 const hash='b'.repeat(64);
 assert.equal((await editor({unchanged:false,currentSource:hash,confirmedSource:hash,restoredRevision:4})).state(),'Saved to GNR8 · revision 4');
 assert.equal((await editor({unchanged:false,currentSource:'c'.repeat(64),confirmedSource:hash,restoredRevision:4})).state(),'Unsaved changes');
 assert.equal((await editor({unchanged:false,currentSource:hash,restoredRevision:4})).state(),'Unsaved changes');
});
test('reload retry checks saved content and clears ambiguous status only on exact match',async()=>{
 const hash='b'.repeat(64);const e=await editor({storedPending:true,unchanged:false,currentSource:hash,confirmedSource:hash});
 e.save();await tick();e.receipt();await tick();assert.equal(e.state(),'Saved to GNR8 · revision 4');
 e.save();await tick();e.receipt();await tick();
 const ops=e.sent.filter(x=>x.type==='gnr8:save');assert.equal(ops[0].operationId,ops[1].operationId);
});
