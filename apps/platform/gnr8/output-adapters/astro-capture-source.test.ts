import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAstroCaptureSource } from './astro-capture-source';

test('Lumos regeneration resolves the saved guide capture, not its build dependency derivative', async () => {
  const original = { id:'original', siteId:'site', artifactId:'original-artifact' };
  const derived = { id:'derived', siteId:'site', artifactId:'derived-artifact' };
  const selected = { id:'generated', siteId:'site', artifactId:'generated-artifact' };
  const artifact = { id:selected.artifactId, siteVersionId:selected.id, manifest:{
    generatedOutputBuildEvidence:{sourceCapture:{siteVersionId:derived.id,artifactId:derived.artifactId}},
    generatedOutputSourceWorkspace:{lumosBrand:{format:'gnr8-lumos-brand:v1',siteVersionId:original.id,artifactId:'original-raw',revision:1}},
  }};
  const deps = {
    getSiteVersion:async(id:string)=>id===original.id?original:id===derived.id?derived:null,
    getArtifactById:async(id:string)=>({id,siteVersionId:id===original.artifactId?original.id:derived.id}),
    getRawImportedSiteArtifact:async(id:string)=>({id:id===original.id?'original-raw':'derived-raw',siteId:'site',siteVersionId:id}),
  };
  const resolve=()=>resolveAstroCaptureSource(selected as never,artifact as never,'astro-static-site',deps as never);
  assert.equal((await resolve()).sourceVersion.id,original.id);
  original.siteId='foreign';
  await assert.rejects(resolve(),/source_capture_lineage_missing/);
  original.siteId='site';artifact.manifest.generatedOutputSourceWorkspace.lumosBrand.artifactId='wrong';
  await assert.rejects(resolve(),/source_capture_lineage_missing/);
});
