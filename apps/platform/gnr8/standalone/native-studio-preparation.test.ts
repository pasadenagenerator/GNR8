import assert from 'node:assert/strict';
import test from 'node:test';
import { runNativeStudioPreparation } from './native-studio-preparation';
const id='11111111-1111-4111-8111-111111111111';
const scope={agencyId:id,clientId:id,siteId:id};
const releaseId='a'.repeat(64);
const site={siteId:id,repository:'example/site'};
const release={id:releaseId,input:{selection:{scope:{...scope,siteVersionId:id}}},foundation:{confirmationSha256:'c'.repeat(64),transformIdentity:'transform'}};
const build={sourceUnchanged:true,foundation:release.foundation};
test('native preparation authorizes before reading and persists one selected release',async()=>{
 const calls:string[]=[];
 const deps={client:()=>({}) as any,actor:async()=>{calls.push('actor');},
  ownership:async()=>({agencyId:id,organizationId:id,ownershipSiteId:id}) as any,
  site:()=>site,store:()=>({read:async(key:string)=>{calls.push('read');return key.endsWith('/build.json')?build:release;}}) as any,
  confirm:async()=>{calls.push('confirm');return {artifactVersionId:id} as any;},
  persist:async()=>{calls.push('persist');return {receipt:{sourceManifestSha256:'b'.repeat(64),version:'1.4.2',files:[{}]},reused:false};}} as any;
 const result=await runNativeStudioPreparation({scope,releaseId,actor:id},deps);
 assert.deepEqual(calls,['actor','read','read','confirm','actor','persist']);
 assert.equal(result.hosted,false);
 await assert.rejects(runNativeStudioPreparation({scope,releaseId,actor:id},
  {...deps,store:()=>({read:async(key:string)=>key.endsWith('/build.json')?null:release}) as any}),/build_unverified/);
 await assert.rejects(runNativeStudioPreparation({scope,releaseId,actor:id},
  {...deps,confirm:async()=>{throw Error('native_studio_confirmation_stale');}}),/confirmation_stale/);
 await assert.rejects(runNativeStudioPreparation({scope,releaseId,actor:id},
  {...deps,ownership:async()=>({agencyId:'other'}) as any}),/ownership_mismatch/);
 assert.deepEqual(calls,['actor','read','read','confirm','actor','persist','actor','actor','read','read','actor','read','read']);
});
