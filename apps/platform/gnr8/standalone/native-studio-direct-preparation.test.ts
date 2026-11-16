import test from 'node:test';
import assert from 'node:assert/strict';
import { runDirectNativeStudioPreparation } from './native-studio-direct-preparation';
import { publicationSelectionForArtifact } from './publication-contract';
import { exportStandaloneProject } from './standalone-export';
import { persistVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { createHash } from 'node:crypto';
const id=(n:number)=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const scope={agencyId:id(1),clientId:id(2),siteId:id(3),siteVersionId:id(4)};
const baseline=[
 {path:'package.json',base64:Buffer.from('{"dependencies":{"astro":"5.18.2"}}').toString('base64')},
 {path:'src/pages/index.astro',base64:Buffer.from('<h1>Confirmed source</h1>').toString('base64')},
];
function fixture(){
 const calls:string[]=[];
 const artifact={id:id(5),bundleSha256:'a'.repeat(64),manifest:{
  generatedOutputSourceWorkspace:{adapterId:'astro-static-site',assetEvidence:[]},
 }};
 const input=publicationSelectionForArtifact(scope,artifact);
 const context={artifact};
 let changed=false,owner=scope.agencyId;
 const deps={
  client:()=>({}) as any,actor:async()=>{calls.push('actor');},
  site:()=>({siteId:scope.siteId}),artifactVersion:async()=>scope.siteVersionId,
  ownership:async()=>({agencyId:owner,organizationId:scope.clientId,ownershipSiteId:scope.siteId}),
  confirm:async()=>{calls.push('confirm');return {artifactVersionId:scope.siteVersionId,
   captureVersionId:scope.siteVersionId,routes:['/'],confirmationSha256:changed?'b'.repeat(64):'c'.repeat(64)};},
  source:async()=>context,
  revision:async()=>{throw Error('unexpected revision');},
  loadSource:async()=>baseline,planAssets:async()=>({entries:[],read:async()=>[]}),
  export:exportStandaloneProject,store:()=>({}),
  record:async()=>{calls.push('record');},
  persist:async(value:{exported:{manifestSha256:string};confirmationSha256:string})=>{
   calls.push('persist');
   assert.equal(value.confirmationSha256,'c'.repeat(64));
   return {receipt:{identitySha256:'d'.repeat(64),sourceManifestSha256:value.exported.manifestSha256,
    version:'1.4.2',files:[{}]},reused:false};
  },
 };
 return {input,calls,deps,change:()=>{changed=true;},deny:()=>{owner=id(99);}};
}
test('direct preparation exports a confirmed Astro selection and stores source without a Vercel release',async()=>{
 const f=fixture();
 const result=await runDirectNativeStudioPreparation({scope,input:f.input,actor:id(6)},f.deps as any);
 assert.equal(result.hosted,false);
 assert.equal(result.files,1);
 assert.deepEqual(f.calls,['actor','confirm','confirm','actor','persist','record']);
});
test('changed confirmation and foreign ownership stop before a source receipt',async()=>{
 const stale=fixture();
 const original=stale.deps.export;
 stale.deps.export=async(input:any)=>{const result=await original(input);stale.change();return result;};
 await assert.rejects(runDirectNativeStudioPreparation({scope,input:stale.input,actor:id(6)},stale.deps as any),/confirmation_stale/);
 assert.equal(stale.calls.includes('persist'),false);
 const foreign=fixture();foreign.deny();
 await assert.rejects(runDirectNativeStudioPreparation({scope,input:foreign.input,actor:id(6)},foreign.deps as any),/ownership_mismatch/);
 assert.deepEqual(foreign.calls,['actor']);
});
test('direct Worker path writes and reuses exact Studio bytes from the selected Astro source',
 {skip:!process.env.STACKI_RELEASE_FILE&&'Set STACKI_RELEASE_FILE'},async()=>{
 const f=fixture(),objects=new Map<string,unknown>(),bytes=new Map<string,Buffer>();
 const site={siteId:scope.siteId,repository:'example/website',repositoryId:'123',branch:'main',
  studioOrigin:'https://website.example.com',accountId:'a'.repeat(32),appId:'456',
  installationId:'789',clientId:'Iv1.example'};
 f.deps.site=()=>site;
 f.deps.store=()=>({read:async(key:string)=>objects.get(key)??null,
  getBytes:async(hash:string)=>bytes.get(hash),putBytes:async(hash:string,body:Buffer)=>{
   assert.equal(hash,createHash('sha256').update(body).digest('hex'));bytes.set(hash,body);
  },put:async(key:string,value:unknown)=>{if(objects.has(key))assert.deepEqual(objects.get(key),value);objects.set(key,value);return value;}});
 (f.deps as any).record=async(store:any,key:string,value:unknown)=>store.put(key,value);
 f.deps.persist=(value:any)=>persistVerifiedAstroStudio({...value,releaseFile:process.env.STACKI_RELEASE_FILE});
 const first=await runDirectNativeStudioPreparation({scope,input:f.input,actor:id(6)},f.deps as any);
 const second=await runDirectNativeStudioPreparation({scope,input:f.input,actor:id(6)},f.deps as any);
 assert.equal(first.hosted,false);assert.equal(first.reused,false);assert.equal(second.reused,true);
 assert.equal(first.sourceId,second.sourceId);assert.equal(objects.size,2);
 assert([...bytes.values()].some(body=>body.includes('Confirmed source')));
});
