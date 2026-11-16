import test from 'node:test';
import assert from 'node:assert/strict';
import {SupabaseAstroCandidateRuntimeArtifactStore} from './astro-candidate-runtime-artifact-store';
import {generatedArtifactGitPackage} from '../site/generated-artifact-git-archive';

test('candidate context hydrates Git HTML/CSS and preserves legacy database reads',async()=>{
  const version='11111111-1111-4111-8111-111111111111';
  const ref={scope:{agencyId:'22222222-2222-4222-8222-222222222222',
    clientId:'33333333-3333-4333-8333-333333333333',siteId:'44444444-4444-4444-8444-444444444444'},
    repository:'owner/site',commit:'a'.repeat(40),manifestPath:`generated/${version}/.gnr8-generated-manifest.json`,
    manifestSha256:'b'.repeat(64),routes:[],styles:{path:'styles.css',bytes:0,sha256:'c'.repeat(64)},
    runtimeManifest:{path:'runtime-manifest.json',bytes:0,sha256:'d'.repeat(64)}};
  let git=true,reads=0;
  const versionRow={id:version,site_id:'runtime-site',version_no:1,state:'READY_FOR_REVIEW',
    source:'manual',actor:'operator',renderer_compatibility_version:'v1',
    import_provenance_summary:null,artifact_id:'artifact',created_at:'2026-11-07T00:00:00Z'};
  const artifactRow={id:'artifact',site_id:'runtime-site',site_version_id:version,
    renderer_compatibility_version:'v1',html_by_path:{'/':'legacy'},compiled_token_styles:'legacy-css',
    asset_fingerprint_map:{},manifest:{generatedGitArchive:ref},publish_stage:'shadow',
    shadow_restricted:true,artifact_governance:{},bundle_sha256:'hash',created_at:'2026-11-07T00:00:00Z'};
  const client={from(table:string){const q={select(){return q},eq(){return q},order(){return q},limit(){
    if(table==='gnr8_runtime_site_versions')return Promise.resolve({data:[versionRow],error:null});
    if(table==='gnr8_runtime_page_versions')return Promise.resolve({data:[],error:null});
    if(table==='gnr8_runtime_artifacts')return Promise.resolve({data:[{...artifactRow,manifest:git?artifactRow.manifest:{}}],error:null});
    if(table==='gnr8_runtime_active_pointers')return Promise.resolve({data:[],error:null});
    throw Error(table);
  },then(resolve:(value:unknown)=>void){
    if(table==='gnr8_runtime_page_versions')resolve({data:[],error:null});
    else if(table==='gnr8_runtime_preview_host_bindings')resolve({data:null,error:null,count:0});
    else throw Error(table);
  }};return q;}};
  const cache={hydrate:async()=>{reads++;return {htmlByPath:{'/':'<h1>Git</h1>'},compiledTokenStyles:'git-css'};},
    restoreManifest:async()=>({generatedGitArchive:ref,generatedOutputSourceWorkspace:{files:[{path:'src/index.astro',contents:'source'}]}})};
  const store=new SupabaseAstroCandidateRuntimeArtifactStore(client as never,cache as never);
  const first=await store.readContext(version);
  assert.deepEqual(first?.artifact?.htmlByPath,{'/':'<h1>Git</h1>'});
  assert.equal(first?.artifact?.compiledTokenStyles,'git-css');assert.equal(reads,1);
  assert.equal(((first?.artifact?.manifest.generatedOutputSourceWorkspace as {files:{contents:string}[]})?.files[0])?.contents,'source');
  const source=await store.readSourceContext(version);
  assert.equal(((source?.artifact.manifest.generatedOutputSourceWorkspace as {files:{contents:string}[]})?.files[0])?.contents,'source');
  assert.equal(reads,1,'source read does not download generated HTML');
  git=false;
  const legacy=await store.readContext(version);
  assert.deepEqual(legacy?.artifact?.htmlByPath,{'/':'legacy'});
  assert.equal(legacy?.artifact?.compiledTokenStyles,'legacy-css');assert.equal(reads,1);
});

test('candidate compare-and-set writes route hashes and no HTML/CSS for Git-backed output',async()=>{
  const version='11111111-1111-4111-8111-111111111111';
  const input={scope:{agencyId:'22222222-2222-4222-8222-222222222222',
    clientId:'33333333-3333-4333-8333-333333333333',siteId:'44444444-4444-4444-8444-444444444444'},
    runtimeSiteId:'runtime-site',siteVersionId:version,htmlByPath:{'/':'<h1>Git</h1>'},
    compiledTokenStyles:'body{color:red}',manifest:{kind:'candidate',generatedOutputSourceWorkspace:{
      files:[{path:'src/index.astro',contents:'source',bytes:6,sha256:'a'.repeat(64)}]}},
    target:{owner:'owner',ownerId:10,repository:'site',repositoryId:12,token:'token'}};
  const pkg=generatedArtifactGitPackage(input);
  const ref={scope:input.scope,repository:'owner/site',commit:'a'.repeat(40),
    manifestPath:pkg.manifestPath,manifestSha256:pkg.manifestSha256,
    routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,runtimeManifest:pkg.descriptor.runtimeManifest};
  let written:Record<string,unknown>|null=null;
  const client={from(){const q={update(value:Record<string,unknown>){written=value;return q;},
    eq(){return q;},select(){return Promise.resolve({data:[{id:'artifact'}],error:null});}};return q;}};
  const store=new SupabaseAstroCandidateRuntimeArtifactStore(client as never);
  const result=await store.compareAndSetArtifact({expectedBundleSha256:'before',artifact:{
    id:'artifact',siteId:'runtime-site',siteVersionId:version,rendererCompatibilityVersion:'v1',
    bundleSha256:'after',htmlByPath:input.htmlByPath,compiledTokenStyles:input.compiledTokenStyles,
    assetFingerprintMap:{},manifest:{...input.manifest,generatedGitArchive:ref},
    publishStage:'shadow',shadowRestricted:true,artifactGovernance:{} as never,
  }});
  assert.equal(result,'updated');
  assert.equal(written?.compiled_token_styles,'');
  assert.notEqual((written?.html_by_path as Record<string,string>)['/'],input.htmlByPath['/']);
  assert.equal(JSON.stringify(written?.manifest).includes('"contents"'),false);
});
