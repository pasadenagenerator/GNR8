import assert from 'node:assert/strict';
import test from 'node:test';
import {generatedArtifactGitPackage} from '../site/generated-artifact-git-archive';
import {sha256Hex,stableStringify} from './deterministic';
import {createArtifact} from './runtime-store';

test('Git-backed import writes references, not website bytes, through the runtime artifact writer',async()=>{
  const siteVersionId='44444444-4444-4444-8444-444444444444';
  const html='<h1>UNIQUE_IMPORTED_HTML_BODY</h1>';
  const css='body{color:UNIQUE_IMPORTED_CSS_BODY}';
  const sourceMigrationPayload={pages:[{contentModel:{title:'UNIQUE_IMPORTED_SOURCE_TEXT'}}]};
  const cmsSlotSources=[{slotKey:'hero.title',sourceText:'UNIQUE_IMPORTED_SLOT_TEXT'}];
  const manifest={kind:'scoped_pipeline_import',sourceMigrationPayload,
    sourceMigrationPayloadSha256:sha256Hex(stableStringify(sourceMigrationPayload)),
    cmsSlotSources,cmsSlotSourcesSha256:sha256Hex(stableStringify(cmsSlotSources)),
    generatedOutputSourceWorkspace:{files:[{path:'src/pages/index.astro',
      contents:'UNIQUE_IMPORTED_PROJECT_FILE',base64:'VU5JUVVFX0lNUE9SVEVEX0JBU0U2NA==',
      sha256:'a'.repeat(64),bytes:28}]}};
  const pkg=generatedArtifactGitPackage({
    scope:{agencyId:'11111111-1111-4111-8111-111111111111',
      clientId:'22222222-2222-4222-8222-222222222222',
      siteId:'33333333-3333-4333-8333-333333333333'},
    runtimeSiteId:'site_123',siteVersionId,htmlByPath:{'/':html},
    compiledTokenStyles:css,manifest,
    target:{owner:'owner',ownerId:1,repository:'site',repositoryId:1,token:'local-test-only'},
  });
  const ref={scope:pkg.descriptor.scope,repository:'owner/site',commit:'b'.repeat(40),
    manifestPath:pkg.manifestPath,manifestSha256:pkg.manifestSha256,
    routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,
    runtimeManifest:pkg.descriptor.runtimeManifest};
  const inserts:Array<{sql:string;values:unknown[]}>=[];
  const db={query:async(sql:string,values:unknown[]=[])=>(
    sql.includes('insert into public.gnr8_runtime_artifacts')
      ? (inserts.push({sql,values}),{rows:[{id:'artifact_123'}],rowCount:1})
      : {rows:[],rowCount:0})};
  const result=await createArtifact({siteId:'site_123',siteVersionId,
    rendererCompatibilityVersion:'gnr8-renderer-v1',bundleSha256:'c'.repeat(64),
    htmlByPath:{'/':html},compiledTokenStyles:css,assetFingerprintMap:{},
    manifest:{...manifest,generatedGitArchive:ref},publishStage:'shadow',
    shadowRestricted:true,artifactGovernance:{} as Parameters<typeof createArtifact>[0]['artifactGovernance'],
    dbClient:db as never});
  assert.equal(result.artifactId,'artifact_123');
  assert.equal(inserts.length,1);
  const values=inserts[0]!.values;
  assert.deepEqual(JSON.parse(values[4] as string),{'/':ref.routes[0]!.sha256});
  assert.equal(values[5],'');
  const storedManifest=JSON.parse(values[7] as string);
  assert.deepEqual(storedManifest.generatedGitArchive,ref);
  assert.equal('sourceMigrationPayload' in storedManifest,false);
  assert.equal('cmsSlotSources' in storedManifest,false);
  assert.deepEqual(storedManifest.generatedOutputSourceWorkspace.files,[{
    path:'src/pages/index.astro',sha256:'a'.repeat(64),bytes:28}]);
  const databaseValues=JSON.stringify(values);
  for(const body of [html,css,'UNIQUE_IMPORTED_SOURCE_TEXT','UNIQUE_IMPORTED_SLOT_TEXT',
    'UNIQUE_IMPORTED_PROJECT_FILE','VU5JUVVFX0lNUE9SVEVEX0JBU0U2NA=='])
    assert.equal(databaseValues.includes(body),false,`database insert contains ${body}`);
});
