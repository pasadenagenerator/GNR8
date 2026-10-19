import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverPreparedPublicSiteToUnpublished, switchActivePointer } from './runtime-store';

const input={siteId:'site-one',siteVersionId:'11111111-1111-4111-8111-111111111111',artifactId:'22222222-2222-4222-8222-222222222222',expectedBundleSha256:'a'.repeat(64),actor:'operator'};
function database(changed=false) {
  const writes:string[]=[];
  let pointer: {active_site_version_id:string;active_artifact_id:string}|null={active_site_version_id:input.siteVersionId,active_artifact_id:changed?'other':input.artifactId};
  const client={async query(sql:string){
    if(sql.includes('from public.gnr8_runtime_artifacts')) return{rows:[{id:input.artifactId,site_id:input.siteId,site_version_id:input.siteVersionId,bundle_sha256:input.expectedBundleSha256,
      manifest:{publicPreparation:{version:'gnr8-astro-public-preparation:v1',host:'test.example.com',expectedActivePointer:null,sourceSiteVersionId:'source',sourceArtifactId:'source-artifact',sourceCandidateId:'source-candidate',sourceArtifactSha256:'b'.repeat(64),sourceCandidateContentSha256:'c'.repeat(64),sourceTechnicalEvidenceSha256:'d'.repeat(64)}}}]};
    if(sql.includes('select') && sql.includes('from public.gnr8_runtime_active_pointers')) return{rows:pointer?[pointer]:[]};
    if(sql.startsWith('delete from public.gnr8_runtime_active_pointers')){writes.push(sql);pointer=null;}
    if(sql.startsWith('update public.gnr8_runtime_domain_host_bindings') || sql.startsWith('insert into public.gnr8_runtime_version_audit')) writes.push(sql);
    return{rows:[]};
  }};
  return{client:client as never,writes,pointer:()=>pointer};
}
test('recovery clears only its exact pointer and binding, preserves immutable data, and is idempotent',async()=>{
  const db=database();
  assert.deepEqual(await recoverPreparedPublicSiteToUnpublished({...input,dbClient:db.client}),{recovered:true});
  assert.equal(db.pointer(),null);assert.equal(db.writes.length,3);
  assert.deepEqual(await recoverPreparedPublicSiteToUnpublished({...input,dbClient:db.client}),{recovered:false});
  assert.ok(db.writes.every(s=>!s.startsWith('delete from public.gnr8_runtime_artifacts') && !s.startsWith('delete from public.gnr8_runtime_site_versions')));
});
test('recovery and first publication refuse another active publication',async()=>{
  const db=database(true);
  await assert.rejects(recoverPreparedPublicSiteToUnpublished({...input,dbClient:db.client}),/pointer_changed/);
  await assert.rejects(switchActivePointer({...input,dbClient:db.client}),/baseline_changed/);
  assert.equal(db.writes.length,0);
});

test('contact update switches only its baseline and domain together; exact parent can be restored',async()=>{
  const oldVersion='33333333-3333-4333-8333-333333333333',oldArtifact='44444444-4444-4444-8444-444444444444';
  const base={version:'gnr8-astro-public-preparation:v1',host:'test.example.com',expectedActivePointer:null,sourceSiteVersionId:'capture',sourceArtifactId:'capture-artifact',sourceCandidateId:'candidate',sourceArtifactSha256:'b'.repeat(64),sourceCandidateContentSha256:'c'.repeat(64),sourceTechnicalEvidenceSha256:'d'.repeat(64)};
  const parent={id:oldArtifact,site_id:input.siteId,site_version_id:oldVersion,bundle_sha256:'e'.repeat(64),manifest:{publicPreparation:base}};
  const update={id:input.artifactId,site_id:input.siteId,site_version_id:input.siteVersionId,bundle_sha256:input.expectedBundleSha256,manifest:{publicPreparation:{...base,version:'gnr8-astro-public-contact-update:v1',sourceSiteVersionId:oldVersion,sourceArtifactId:oldArtifact,sourceArtifactSha256:parent.bundle_sha256,expectedActivePointer:{siteVersionId:oldVersion,artifactId:oldArtifact},contactRecipientChange:{from:'before@example.com',to:'after@example.com',requestedByActor:'owner'}}}};
  let pointer={active_site_version_id:oldVersion,active_artifact_id:oldArtifact},domainVersion=oldVersion;
  const writes:string[]=[];
  const db={async query(sql:string,args:unknown[]=[]){
    if(sql.includes('from public.gnr8_runtime_artifacts'))return{rows:[args[0]===oldArtifact?parent:update]};
    if(sql.includes('select') && sql.includes('from public.gnr8_runtime_active_pointers'))return{rows:[pointer]};
    if(sql.startsWith('select id from public.gnr8_runtime_domain_host_bindings'))return{rows:args[1]===domainVersion?[{id:'domain'}]:[]};
    if(sql.startsWith('update public.gnr8_runtime_domain_host_bindings')){assert.equal(args[1],domainVersion);domainVersion=String(args[3]);writes.push('domain');return{rows:[{id:'domain'}]};}
    if(sql.includes('insert into public.gnr8_runtime_active_pointers')){assert.equal(domainVersion,args[1]);pointer={active_site_version_id:String(args[1]),active_artifact_id:String(args[2])};writes.push('pointer');}
    return{rows:[]};
  }};
  const activate=()=>switchActivePointer({...input,dbClient:db as never});
  pointer.active_artifact_id='unrelated';
  await assert.rejects(activate(),/baseline_changed/);assert.deepEqual(writes,[]);
  pointer.active_artifact_id=oldArtifact;domainVersion='unrelated';
  await assert.rejects(activate(),/domain_not_ready/);assert.deepEqual(writes,[]);
  domainVersion=oldVersion;
  await assert.rejects(recoverPreparedPublicSiteToUnpublished({...input,dbClient:db as never}),/selection_mismatch/);
  assert.equal((await activate()).switched,true);
  assert.deepEqual(writes,['domain','pointer']);assert.equal(domainVersion,input.siteVersionId);
  assert.equal((await activate()).switched,false);assert.equal(writes.length,2);
  assert.equal((await switchActivePointer({siteId:input.siteId,siteVersionId:oldVersion,artifactId:oldArtifact,dbClient:db as never})).switched,true);
  assert.equal(domainVersion,oldVersion);assert.equal(pointer.active_artifact_id,oldArtifact);
  assert.equal(parent.bundle_sha256,'e'.repeat(64));
});
