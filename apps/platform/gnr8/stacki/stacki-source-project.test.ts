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
