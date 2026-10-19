import assert from 'node:assert/strict';
import test from 'node:test';
import { readPublishedRetainedAsset } from './published-retained-asset';
import { evaluateRuntimeArtifactServingEligibility } from '@/gnr8/runtime/publish-enforcement';

function fixture() {
  const host='test.example.com', siteId='runtime-one', sourceVersion='capture-one', activeVersion='public-one';
  const path='images/photo.jpg', url=`/api/gnr8/runtime/preview-assets/${siteId}/${sourceVersion}/${path}`, sha='a'.repeat(64);
  const artifact={site_id:siteId,site_version_id:activeVersion,publish_stage:'production',shadow_restricted:false,
    asset_fingerprint_map:{[url]:sha},manifest:{publicPreparation:{version:'gnr8-astro-public-preparation:v1',host},generatedOutputBuildEvidence:{sourceCapture:{runtimeSiteId:siteId,siteVersionId:sourceVersion}},generatedOutputContentManifest:{requiredAssets:[{path:url,sha256:sha}]}}};
  const pointer={active_site_version_id:activeVersion,active_artifact_id:'artifact-one'};
  const binding={site_id:siteId,site_version_id:activeVersion,status:'active'};
  let reads=0;
  const deps={client:()=>({from(table:string){return{select(){return this},eq(){return this},async maybeSingle(){return{data:table.endsWith('domain_host_bindings')?binding:table.endsWith('active_pointers')?pointer:artifact,error:null}}}}}) as never,
    ownership:async()=>({ownershipSiteId:'owner-one',organizationId:'org-one'}) as never,
    readAsset:async(input:{expectedSha256?:string})=>{reads++;assert.equal(input.expectedSha256,sha);return new Response('verified bytes')}};
  return{input:{host,siteId,siteVersionId:sourceVersion,path},deps,artifact,pointer,binding,reads:()=>reads};
}
test('active public binding authorizes only its owned source assets and expected hash',async()=>{
  const f=fixture();assert.equal((await readPublishedRetainedAsset(f.input,f.deps))?.status,200);assert.equal(f.reads(),1);
  for(const invalid of [{...f.input,host:'other.example.com'},{...f.input,siteId:'other-site'},{...f.input,siteVersionId:'other-version'},{...f.input,path:'missing.jpg'}])
    assert.equal((await readPublishedRetainedAsset(invalid,f.deps))?.status,403);
  f.pointer.active_site_version_id='other';assert.equal((await readPublishedRetainedAsset(f.input,f.deps))?.status,403);assert.equal(f.reads(),1);
});
test('prepared output never serves on the old source host',()=>{
  const f=fixture();
  const artifact={manifest:{publicPreparation:{version:'gnr8-astro-public-preparation:v1',host:f.input.host,expectedActivePointer:null,sourceArtifactId:'a',sourceSiteVersionId:'v',sourceCandidateId:'c',sourceArtifactSha256:'a'.repeat(64),sourceCandidateContentSha256:'b'.repeat(64),sourceTechnicalEvidenceSha256:'c'.repeat(64)}},artifactGovernance:{siteEnforcementState:{production:'ALLOW'},pageEnforcementState:{production:['ALLOW']}}} as never;
  assert.equal(evaluateRuntimeArtifactServingEligibility({artifact,servingStage:'production',host:f.input.host}).allow,true);
  assert.equal(evaluateRuntimeArtifactServingEligibility({artifact,servingStage:'production',host:'original.example.com'}).allow,false);
});
