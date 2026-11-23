import test from 'node:test';
import assert from 'node:assert/strict';
import { readVerifiedNativeStudioAccessForPreparation, runDirectNativeStudioPreparation } from './native-studio-direct-preparation';
import { configuredNativeStudioDirectSourceSite } from './native-studio-bootstrap-site';
import { fingerprint, publicationSelectionForArtifact } from './publication-contract';
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
  export:exportStandaloneProject,store:()=>({}),access:async()=>undefined,
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
test('a changed target during export stops before saving native source',async()=>{
 const f=fixture();
 let reads=0;
 f.deps.site=()=>({siteId:scope.siteId,repository:++reads===1?'example/site':'example/other'});
 await assert.rejects(runDirectNativeStudioPreparation({scope,input:f.input,actor:id(6)},f.deps as any),
  /native_studio_site_stale/);
 assert.equal(f.calls.includes('persist'),false);
});

test('new-site direct preparation is gated and resolves a scoped bootstrap site',async()=>{
 let ready=false;
 let bindingUnavailable=false;
 const client={from(name:string){const filters:Record<string,string>={};
  const query={eq(key:string,value:string){filters[key]=value;return query;},
   async maybeSingle(){assert.equal(filters.site_id??filters.id,scope.siteId);
    assert.equal(filters.agency_id,scope.agencyId);assert.equal(filters.client_id??filters.org_id,scope.clientId);
    return {error:name==='gnr8_native_studio_bindings'&&bindingUnavailable?{message:'unavailable'}:null,
     data:name==='gnr8_native_studio_bindings'?(ready?{
     site_id:scope.siteId,agency_id:scope.agencyId,client_id:scope.clientId,
     studio_origin:'https://site.app.pasadenagenerator.com',
     repository:'pasadenagenerator/gnr8-site-3333',repository_id:456,
     branch:'retained/branch',cloudflare_account_id:'a'.repeat(32),
     github_app_id:'456',github_installation_id:'789',github_client_id:'Iv1.example',
     studio_worker:`gnr8-${scope.siteId}-studio`,site_worker:`gnr8-${scope.siteId}-site`,
     draft_bucket:`gnr8-${scope.siteId}-drafts`,verified_at:new Date().toISOString(),
    }:null)
     :name==='sites'?{domain:'site.app.pasadenagenerator.com'}:{
     github_owner:'pasadenagenerator',github_owner_id:123,github_owner_kind:'User',
     repository:'gnr8-site-3333',repository_id:456,binding_state:'bound'}};}};
  return {select:()=>query};}} as any;
 const env={GNR8_NATIVE_STUDIO_PREPARE_ENABLED:'1',GNR8_NATIVE_STUDIO_BOOTSTRAP_ENABLED:'1',
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),
  GNR8_NATIVE_STUDIO_GITHUB_APP_ID:'456',
  GNR8_NATIVE_STUDIO_GITHUB_INSTALLATION_ID:'789',
  GNR8_NATIVE_STUDIO_GITHUB_CLIENT_ID:'Iv1.example'};
 assert.equal((await configuredNativeStudioDirectSourceSite(scope,client,env)).branch,
  'codex/native-stacki');
 ready=true;
 const existing=await configuredNativeStudioDirectSourceSite(scope,client,
  {...env,GNR8_NATIVE_STUDIO_GITHUB_APP_ID:undefined});
 assert.equal(existing.branch,'retained/branch');
 ready=false;
 bindingUnavailable=true;
 await assert.rejects(configuredNativeStudioDirectSourceSite(scope,client,env),
  /native_studio_binding_unavailable/);
 bindingUnavailable=false;
 await assert.rejects(configuredNativeStudioDirectSourceSite(scope,client,
  {...env,GNR8_NATIVE_STUDIO_PREPARE_ENABLED:'0'}),/native_studio_disabled/);
 const f=fixture();
 (f.deps as any).client=()=>client;
 (f.deps as any).site=(target:typeof scope)=>configuredNativeStudioDirectSourceSite(target,client,env);
 const persist=f.deps.persist;
 (f.deps as any).persist=async(value:any)=>{
  assert.equal(value.site.repository,'pasadenagenerator/gnr8-site-3333');
  assert.equal(value.site.branch,'codex/native-stacki');
  return persist(value);
 };
 const prepared=await runDirectNativeStudioPreparation({scope,input:f.input,actor:id(6)},
  f.deps as any);
 assert.equal(prepared.sourceId,'d'.repeat(64));
 assert.equal(prepared.requestId,fingerprint({input:f.input,
  confirmationSha256:'c'.repeat(64)}));
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

test('new-site Access source requires bound app, exact current policy and repeated freshness',async()=>{
 const f=fixture();
 const site={siteId:scope.siteId,repository:'example/website',repositoryId:'123',branch:'main',
  studioOrigin:'https://website.example.com',accountId:'a'.repeat(32),appId:'456',
  installationId:'789',clientId:'Iv1.example'};
 const appId='44444444-4444-4444-8444-444444444444';
 const aud='b'.repeat(64),teamDomain='gnr8.cloudflareaccess.com';
 const credential='access-manager-token-value-1234567890',zoneId='c'.repeat(32);
 const env={GNR8_NATIVE_STUDIO_ACCESS_SETUP_ENABLED:'1',
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER:credential,
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID:zoneId};
 const target={scope,accountId:site.accountId,studioOrigin:site.studioOrigin,
  repository:site.repository,repositoryId:123};
 const name=`gnr8-${scope.siteId}-studio-access`,domain='website.example.com/studio';
 const identity=createHash('sha256').update(JSON.stringify({scope,accountId:site.accountId,
  zoneId,studioOrigin:site.studioOrigin,repository:site.repository,repositoryId:123,
  name,domain})).digest('hex');
 const admins=['access:owner@example.com'];
 const objects=new Map<string,unknown>([
  ['native-studio/access-app-create-intent-v1.json',{identity,target,zoneId,name,domain}],
  ['native-studio/access-app-bound-v1.json',{identity,appId,aud,teamDomain}],
  ['native-studio/access-policy-create-intent-v1.json',{identity:fingerprint({scope,target,
   accountId:site.accountId,appId,principals:admins}),scope,accountId:site.accountId,
   appId,target,principals:admins}],
 ]);
 const store={read:async(key:string)=>objects.get(key)??null};
 const client={} as any;
 const deps={candidates:async()=>admins.map(principal=>({principal,userId:id(6),role:'owner'})),
  app:async()=>({state:'observed-access-app',appId,aud,teamDomain,
   studioOrigin:site.studioOrigin,accountId:site.accountId}),
  transport:async()=>Response.json({success:true,result:[{decision:'allow',
   include:[{email:{email:'owner@example.com'}}]}],
   result_info:{page:1,count:1,total_count:1,total_pages:1}})};
 assert.deepEqual(await readVerifiedNativeStudioAccessForPreparation(scope,client,site,
  store as any,env,deps as any),{version:2,provider:'access',aud,teamDomain,admins});
 objects.delete('native-studio/access-app-bound-v1.json');
 await assert.rejects(readVerifiedNativeStudioAccessForPreparation(scope,client,site,
  store as any,env,deps as any),/access_binding_missing/);
 objects.clear();
 assert.equal(await readVerifiedNativeStudioAccessForPreparation({ ...scope,
  siteId:'2e7146cd-e516-4088-94ad-6cac90cb17f4' },client,site,
  store as any,env,deps as any),undefined);
 objects.set('native-studio/access-app-bound-v1.json',{identity,appId,aud,teamDomain});
 f.deps.site=()=>site;
 const access={version:2,provider:'access',aud,teamDomain,admins};
 let reads=0;
 (f.deps as any).access=async()=>{reads++;return reads===1?access:{...access,aud:'d'.repeat(64)};};
 await assert.rejects(runDirectNativeStudioPreparation({scope,input:f.input,actor:id(6)},
  f.deps as any),/native_studio_access_stale/);
 assert.equal(f.calls.includes('persist'),false);
 (f.deps as any).access=async()=>access;
 const persist=f.deps.persist;
 (f.deps as any).persist=async(value:any)=>{
  assert.deepEqual(value.access,access);
  return persist(value);
 };
 const prepared=await runDirectNativeStudioPreparation({scope,input:f.input,actor:id(6)},
  f.deps as any);
 assert.equal(prepared.sourceId,'d'.repeat(64));
 assert.equal(prepared.requestId,fingerprint({input:f.input,
  confirmationSha256:'c'.repeat(64),access}));
});
