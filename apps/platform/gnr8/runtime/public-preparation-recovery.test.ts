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
