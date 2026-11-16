import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createAstroStaticSiteProjectManifest } from "../output-adapters/astro-static-site-adapter";
import { astroDevServerSmokeProofFixture } from "../output-adapters/astro-static-site-dev-server-smoke-proof";
import { createAstroStaticSiteSourceSnapshot } from "../output-adapters/astro-static-site-workspace-preparation";
import { rewriteRawTemplateCssForRuntime } from "../../src/public-site/raw-template-runtime";
import { prepareStackiSourceProject } from "./stacki-source-project";

const runtimeSiteId = "runtime-site";
const sourceSiteVersionId = "11111111-1111-4111-8111-111111111111";
const sourceArtifactId = "22222222-2222-4222-8222-222222222222";
const prefix = `/api/gnr8/runtime/preview-assets/${runtimeSiteId}/${sourceSiteVersionId}/`;
const hash = (body: Buffer) => createHash("sha256").update(body).digest("hex");

function fixture() {
  const assets: Record<string, { body: Buffer; mediaType: string }> = {
    "css/main.css": { body: Buffer.from('@import "./nested/theme.css";'), mediaType: "text/css" },
    "css/nested/theme.css": { body: Buffer.from('.hero{background:url("../../images/hero.png")}'), mediaType: "text/css" },
    "images/hero.png": { body: Buffer.from([137, 80, 78, 71, 0, 255]), mediaType: "image/png" },
    "unused.png": { body: Buffer.from("unused"), mediaType: "image/png" },
  };
  const manifest = createAstroStaticSiteProjectManifest({ ...astroDevServerSmokeProofFixture(), pages: [{
    path: "/", title: "Retained source", headHtml: `<link rel="stylesheet" href="${prefix}css/main.css">`,
    bodyHtml: `<h1>Retained page</h1><img src="${prefix}images/hero.png" alt="Hero">`,
  }] });
  const files = manifest.files.map(file => ({ ...file, bytes: Buffer.byteLength(file.contents), sha256: hash(Buffer.from(file.contents)) }));
  const assetEvidence = Object.entries(assets).map(([path, asset]) => ({
    path: prefix + path, mediaType: asset.mediaType, sizeBytes: asset.body.length, sha256: hash(asset.body),
  }));
  const workspace = { adapterId: "astro-static-site", adapterVersion: "gnr8-output-adapter-selection:v1",
    sourceSiteVersionId, sourceArtifactId, files, assetEvidence };
  const binding = { runtimeSiteId, sourceSiteVersionId, sourceArtifactId,
    sourceSnapshotSha256: createAstroStaticSiteSourceSnapshot(files.map(file => ({ path: file.path, body: Buffer.from(file.contents) }))).aggregateSha256,
    requiredAssets: assetEvidence.filter(asset => !asset.path.endsWith("unused.png")).map(({ path, sha256 }) => ({ path, sha256 })) };
  const reads: string[] = [];
  const readVerifiedAsset = async (_asset: unknown, path: string, allowedPaths: string[]) => {
    reads.push(path);
    const value = assets[path];
    return path.endsWith(".css") ? Buffer.from(rewriteRawTemplateCssForRuntime({
      css: value.body.toString(), siteId: runtimeSiteId, siteVersionId: sourceSiteVersionId,
      assetFilePath: path, fileMapPaths: new Set(allowedPaths), versionCssUrls: true,
    })) : value.body;
  };
  return { assets, workspace, binding, reads, readVerifiedAsset };
}

test("retained Astro source stays byte-exact and nested CSS/binary assets work at the editor origin", async () => {
  const f = fixture();
  const result = await prepareStackiSourceProject(f);
  const files = new Map(result.files.map(file => [file.path, Buffer.from(file.base64, "base64")]));
  for (const file of f.workspace.files) assert.equal(files.get(file.path)?.toString(), file.contents);
  assert.deepEqual(files.get(`public${prefix}images/hero.png`), f.assets["images/hero.png"].body);
  assert.match(files.get(`public${prefix}css/main.css`)!.toString(), /preview-assets\/runtime-site\/.*\/css\/nested\/theme\.css/);
  assert.match(files.get(`public${prefix}css/nested/theme.css`)!.toString(), /preview-assets\/runtime-site\/.*\/images\/hero\.png/);
  assert(!f.reads.includes("unused.png"));
  assert.equal(result.assetCount, 3);
  assert.equal(result.sourceSnapshotSha256, f.binding.sourceSnapshotSha256);
});

test("source lineage, per-file bytes and aggregate identity are verified before asset reads", async () => {
  for (const change of [
    (f: ReturnType<typeof fixture>) => { f.workspace.sourceArtifactId = "foreign"; },
    (f: ReturnType<typeof fixture>) => { f.workspace.files[0].contents += "tamper"; },
    (f: ReturnType<typeof fixture>) => { f.binding.sourceSnapshotSha256 = "0".repeat(64); },
    (f: ReturnType<typeof fixture>) => { f.workspace.assetEvidence[0].path = prefix.replace(runtimeSiteId, "another-site") + "main.css"; },
    (f: ReturnType<typeof fixture>) => { f.binding.requiredAssets[0].sha256 = "0".repeat(64); },
    (f: ReturnType<typeof fixture>) => { f.binding.requiredAssets.push(f.binding.requiredAssets[0]); },
  ]) {
    const f = fixture(); change(f);
    await assert.rejects(prepareStackiSourceProject(f), /STACKI_SOURCE_PROJECT_INVALID/);
    assert.equal(f.reads.length, 0);
  }
});

test("oversize assets and path traversal fail before fetching; corrupt binary bytes cannot be saved", async () => {
  const huge = fixture();
  huge.workspace.assetEvidence[0].sizeBytes = 2 * 1024 * 1024;
  await assert.rejects(prepareStackiSourceProject(huge), /TOO_LARGE/);
  assert.equal(huge.reads.length, 0);
  const traversal = fixture();
  traversal.workspace.assetEvidence[0].path = prefix + "../escape.css";
  traversal.binding.requiredAssets[0].path = prefix + "../escape.css";
  await assert.rejects(prepareStackiSourceProject(traversal), /CHECKPOINT_INVALID/);
  assert.equal(traversal.reads.length, 0);
  const corrupted = fixture();
  const originalRead = corrupted.readVerifiedAsset;
  corrupted.readVerifiedAsset = async (asset, path, allowedPaths) =>
    path.endsWith(".png") ? Buffer.from("corrupted") : originalRead(asset, path, allowedPaths);
  await assert.rejects(prepareStackiSourceProject(corrupted), /SOURCE_PROJECT_INVALID/);
});

test('immutable runtime dependencies do not consume editable checkpoint limits',async()=>{
 const f=fixture();f.workspace.assetEvidence[0]!.sizeBytes=2*1024*1024;
 const result=await prepareStackiSourceProject({...f,assetMode:'runtime-overlay'});
 assert.equal(f.reads.length,0);
 assert.equal(result.runtimeAssets?.length,3);
 assert.ok(result.files.every(file=>!file.path.startsWith('public/api/')));
 const config=Buffer.from(result.files.find(file=>file.path==='astro.config.mjs')!.base64,'base64').toString();
 assert.match(config,/gnr8-retained-assets-v1/);assert.match(config,/apply:'serve'/);
 const huge=fixture();huge.workspace.files[0]!.contents='x'.repeat(2*1024*1024);
 await assert.rejects(prepareStackiSourceProject({...huge,assetMode:'runtime-overlay'}),/SOURCE_PROJECT_INVALID/);
 const unsafe=fixture();unsafe.workspace.assetEvidence[0]!.path=prefix+'../escape';
 unsafe.binding.requiredAssets[0]!.path=prefix+'../escape';
 await assert.rejects(prepareStackiSourceProject({...unsafe,assetMode:'runtime-overlay'}),/SOURCE_PROJECT_INVALID/);
});

test('explicit Astro 7 baseline preserves every unrelated byte and binds the old source hash', async () => {
  const { prepareStackiAstro7Baseline } = await import('./stacki-source-project');
  const pkg = { name: 'home', version: '0.0.0', private: true, type: 'module', scripts: {
    dev: 'astro dev --host 127.0.0.1 --port 4321', build: 'astro build', preview: 'astro preview --host 127.0.0.1 --port 4321',
  }, dependencies: { astro: '^5.0.0' } };
  const { projectStackiRetainedAssets } = await import('./stacki-retained-assets');
  const config = projectStackiRetainedAssets([{path:'astro.config.mjs',base64:Buffer.from('import { defineConfig } from "astro/config";\n\nexport default defineConfig({\n  output: "static",\n});\n').toString('base64')}], [])[0]!;
  const files = [{ path: 'package.json', base64: Buffer.from(JSON.stringify(pkg)).toString('base64') },
    config,
    { path: 'src/pages/index.astro', base64: Buffer.from('<h1>Preserve me</h1>').toString('base64') }];
  const before = structuredClone(files);
  const snapshot = createAstroStaticSiteSourceSnapshot(files.map(f => ({ path: f.path, body: Buffer.from(f.base64, 'base64') })));
  const result = prepareStackiAstro7Baseline({ files, expectedSourceSnapshotSha256: snapshot.aggregateSha256 });
  assert.deepEqual(files, before);
  for (const f of files.filter(f=>!result.changedPaths.some(p=>p===f.path))) assert.deepEqual(result.files.find(g=>g.path===f.path),f);
  assert.deepEqual(result.changedPaths, ['package.json', 'astro.config.mjs']);
  const actualConfig=Buffer.from(result.files.find(f=>f.path==='astro.config.mjs')!.base64,'base64').toString();
  assert.equal(actualConfig.replace('build:{cssMinify:false},',''),Buffer.from(config.base64,'base64').toString());
  const unknown=files.map(f=>f.path==='astro.config.mjs'?{...f,base64:Buffer.from('export default {}').toString('base64')}:f);
  assert.throws(()=>prepareStackiAstro7Baseline({files:unknown,expectedSourceSnapshotSha256:createAstroStaticSiteSourceSnapshot(unknown.map(f=>({path:f.path,body:Buffer.from(f.base64,'base64')}))).aggregateSha256}));
  assert.notEqual(result.sourceSnapshot.aggregateSha256, snapshot.aggregateSha256);
  assert.equal(JSON.parse(Buffer.from(result.files.find(f=>f.path==='package.json')!.base64, 'base64').toString()).dependencies.astro, '7.4.4');
  assert.equal(result.derivedFromSourceSnapshot.aggregateSha256, snapshot.aggregateSha256);
  const { createStackiRecord } = await import('./stacki-draft-contract');
  const { selectStackiCandidateSource } = await import('./stacki-candidate-source');
  const scope = {agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333',siteVersionId:'44444444-4444-4444-8444-444444444444'};
  const checkpoint=createStackiRecord(scope,'55555555-5555-4555-8555-555555555555',{expectedRevision:0,files:result.files});
  const selection={checkpoint,scope,expectedRevision:checkpoint.revision,expectedSha256:checkpoint.sha256,baseline:files,sourcePaths:files.map(f=>f.path),ownedImagePaths:[]};
  assert.throws(()=>selectStackiCandidateSource(selection),/CODE_OR_ASSET_CHANGE_UNSUPPORTED/);
  assert.doesNotThrow(()=>selectStackiCandidateSource({...selection,baseline:result.files}));

  assert.throws(() => prepareStackiAstro7Baseline({ files, expectedSourceSnapshotSha256: '0'.repeat(64) }));
  for (const bad of [{ ...pkg, scripts: { ...pkg.scripts, postinstall: 'unreviewed' } }, { ...pkg, dependencies: { astro: '^5.0.0', unreviewed: '1.0.0' } }]) {
    const changed = [{ ...files[0], base64: Buffer.from(JSON.stringify(bad)).toString('base64') }, ...files.slice(1)];
    const expectedSourceSnapshotSha256 = createAstroStaticSiteSourceSnapshot(changed.map(f => ({path:f.path,body:Buffer.from(f.base64,'base64')}))).aggregateSha256;
    assert.throws(() => prepareStackiAstro7Baseline({ files: changed, expectedSourceSnapshotSha256 }));
  }
  const locked = [...files, { path: 'package-lock.json', base64: Buffer.from('{}').toString('base64') }];
  const lockedHash = createAstroStaticSiteSourceSnapshot(locked.map(f => ({path:f.path,body:Buffer.from(f.base64,'base64')}))).aggregateSha256;
  assert.throws(() => prepareStackiAstro7Baseline({ files: locked, expectedSourceSnapshotSha256: lockedHash }));
});
