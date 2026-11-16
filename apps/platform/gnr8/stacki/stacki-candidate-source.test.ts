import assert from "node:assert/strict";
import test from "node:test";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createStackiRecord, type StackiDraftFile } from "./stacki-draft-contract";
import { selectStackiCandidateSource, STACKI_CANONICAL_RELATION } from "./stacki-candidate-source";
import { prepareAstroStaticSiteSourceWorkspace } from "../output-adapters/astro-static-site-workspace-preparation";

const scope = { agencyId: "10000000-0000-4000-8000-000000000001", clientId: "10000000-0000-4000-8000-000000000002",
  siteId: "10000000-0000-4000-8000-000000000003", siteVersionId: "10000000-0000-4000-8000-000000000004" };
const actor = "10000000-0000-4000-8000-000000000005";
const img = "/api/gnr8/runtime/preview-assets/runtime/capture/image.png";
const img2 = "/api/gnr8/runtime/preview-assets/runtime/capture/other.png";
const file = (path: string, body: string): StackiDraftFile => ({ path, base64: Buffer.from(body).toString("base64") });
const html = `<html><head><title>Source</title></head><body><nav><a href="/about">About</a></nav><h1>Original text</h1><img src="${img}" alt="Original"><form data-gnr8-contact="v1"><input name="email"></form></body></html>`;
const baseline = [file("package.json", '{"scripts":{"build":"astro build"}}'), file("astro.config.mjs", "export default {}"),
  file("src/pages/index.astro", html), file("src/pages/about/index.astro", html), file(`public${img}`, "image"), file(`public${img2}`, "other")];
const sourcePaths = baseline.filter(f => !f.path.startsWith("public/api/")).map(f => f.path);
function select(body = html.replace("Original text", "Edited text").replace(`src="${img}"`, `src="${img2}"`), mutate?: (files: StackiDraftFile[]) => void) {
  const files = baseline.map(f => ({ ...f })); files[2] = file(files[2].path, body); mutate?.(files);
  const checkpoint = createStackiRecord(scope, actor, { expectedRevision: 2, files });
  const input = { checkpoint, scope, expectedRevision: 3, expectedSha256: checkpoint.sha256, baseline, sourcePaths, ownedImagePaths: [img, img2] };
  return { input, result: () => selectStackiCandidateSource(input) };
}

test("exact saved text and image selection retain every route and canonical identities", async () => {
  const f = select(), result = f.result();
  assert.equal(result.binding.sha256, f.input.checkpoint.sha256);
  assert.equal(result.binding.canonicalRelation, STACKI_CANONICAL_RELATION);
  assert.deepEqual(result.binding.scope, scope);
  assert.equal(result.files.find(f => f.path === "src/pages/about/index.astro")!.body.toString(), html);
  assert.deepEqual(result.changes.map(c => c.kind), ["text", "image"]);
  const workspace = await prepareAstroStaticSiteSourceWorkspace({ files: result.files });
  try {
    assert.equal(workspace.sourceSnapshot.aggregateSha256, result.sourceSnapshot.aggregateSha256);
    for (const file of result.files) assert.deepEqual(await readFile(join(workspace.workspacePath, file.path)), file.body);
  } finally { await rm(workspace.workspacePath, { recursive: true, force: true }); }
});

test("wrong ownership, selected revision and checkpoint hash fail closed", () => {
  const f = select();
  assert.throws(() => selectStackiCandidateSource({ ...f.input, scope: { ...scope, siteId: actor } }), /INTEGRITY_FAILED/);
  assert.throws(() => selectStackiCandidateSource({ ...f.input, expectedRevision: 2 }), /INTEGRITY_FAILED/);
  assert.throws(() => selectStackiCandidateSource({ ...f.input, expectedSha256: "0".repeat(64) }), /SELECTION_STALE/);
});

test("later saves cannot alter an explicitly selected earlier immutable revision", () => {
  const a = select(), b = select(html.replace("Original text", "Later text"));
  assert.notEqual(a.result().binding.sha256, b.result().binding.sha256);
  assert.deepEqual(a.result(), a.result());
});

test("routes, assets, native contact settings and navigation cannot be silently dropped or replaced", () => {
  for (const change of [
    html.replace('href="/about"', 'href="/missing"'),
    html.replace('data-gnr8-contact="v1"', 'data-gnr8-contact="other"'),
    html.replace("Original text", "{process.env.SECRET}"),
    html.replace("Original text", "<script>alert(1)</script>"),
    html.replace(`src="${img}"`, 'src="/uploads/new.png"'),
    `---\nthrow new Error('execute');\n---\n${html}`,
  ]) assert.throws(() => select(change).result(), /STACKI_CANDIDATE_/);
  assert.throws(() => select(html, files => files.pop()).result(), /FILE_SET_UNSUPPORTED/);
  assert.throws(() => select(html, files => { files[0] = file("package.json", "{}"); }).result(), /CODE_OR_ASSET_CHANGE_UNSUPPORTED/);
  assert.throws(() => select(html, files => { files[4] = file(files[4].path, "new image"); }).result(), /CODE_OR_ASSET_CHANGE_UNSUPPORTED/);
  const f = select();
  assert.throws(() => selectStackiCandidateSource({ ...f.input, sourcePaths: sourcePaths.filter(p => !p.includes("about")) }), /SOURCE_INVALID/);
});

test("editor metadata may change without being executed or losing the full checkpoint binding", () => {
  const f = select(html, files => files.push(file(".studio-state/project.json", '{"ui":"changed"}')));
  assert.equal(f.result().files.length, sourcePaths.length);
  assert.equal(f.result().binding.sha256, f.input.checkpoint.sha256);
});

test('uploaded images are retained as exact build inputs; executable SVG is rejected', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
  const f = select(html.replace(`src="${img}"`, 'src="/saved.svg"'), files => files.push(file('public/saved.svg', svg)));
  assert.equal(f.result().files.find(f => f.path === 'public/saved.svg')?.body.toString(), svg);
  assert.equal(f.result().uploadedImages['saved.svg'].mediaType, 'image/svg+xml');
  assert.throws(() => select(html, files => files.push(file('public/script.svg', '<svg><script>alert(1)</script></svg>'))).result(), /FILE_SET_UNSUPPORTED/);
});

test('Stacki src uploads retain original bytes and a deterministic public mirror; collisions fail', () => {
  const image=Buffer.from('RIFF1234WEBPimage').toString('base64');
  const f=select(html.replace(`src="${img}"`,'src="/src/logo.webp"'), files=>files.push({path:'src/logo.webp',base64:image}));
  const selected=f.result();
  assert.equal(selected.files.find(f=>f.path==='src/logo.webp')?.body.toString('base64'),image);
  assert.equal(selected.files.find(f=>f.path==='public/src/logo.webp')?.body.toString('base64'),image);
  assert.equal(selected.uploadedImages['src/logo.webp'].mediaType,'image/webp');
  assert.throws(()=>select(html,files=>files.push(file('src/unsafe.js','throw 1'))).result(),/FILE_SET_UNSUPPORTED/);
  assert.throws(()=>select(html,files=>files.push({path:'src/logo.webp',base64:image},file('public/src/logo.webp','RIFFxxxxWEBPother'))).result(),/FILE_SET_UNSUPPORTED/);
});

test('only the generated non-form announcement can be removed, with all other source exact', () => {
  const announcement='<div class="engagement promomessage" data-gnr8-announcement="v1"><button data-gnr8-close-announcement="">Close</button><h2>Notice</h2><a href="/about">Details</a></div>';
  const f=select(html);
  f.input.baseline=f.input.baseline.map(entry=>entry.path==='src/pages/index.astro'?file(entry.path,html.replace('</body>',announcement+'</body>')):entry);
  assert.deepEqual(f.result().changes.map(c=>c.kind),['announcement-removal']);
  for(const forbidden of ['<form><input name="email"></form>','<script>run()</script>','<nav>Keep me</nav>']){
    f.input.baseline=f.input.baseline.map(entry=>entry.path==='src/pages/index.astro'?file(entry.path,html.replace('</body>',announcement.replace('<h2>Notice</h2>',forbidden)+'</body>')):entry);
    assert.throws(()=>f.result(),/SOURCE_STRUCTURE_UNSUPPORTED/);
  }
});

test('existing static style blocks accept bounded layout changes while preserving exact source and executable boundaries',()=>{
 const original=html.replace('</head>','<style is:global>.container{display:flex;width:100%}</style></head>').replace('<body>','<body class="container module">');
 const updated=original.replace('width:100%','width:80%;left:0;right:0').replace('</style>','.module{padding-inline:15px;max-width:40%}</style>');
 const f=select(updated);f.input.baseline=f.input.baseline.map(entry=>entry.path==='src/pages/index.astro'?file(entry.path,original):entry);
 const result=f.result();assert.equal(result.files.find(f=>f.path==='src/pages/index.astro')!.body.toString(),updated);
 assert.deepEqual(result.changes.map(c=>c.kind),['style']);assert.equal(result.binding.sha256,f.input.checkpoint.sha256);
 for(const body of [updated.replace('width:80%','width:var(--x)'),updated.replace('is:global','is:inline'),updated.replace('</style>','</style><script>run()</script>'),updated.replace('</head>','<style>.module{width:40%}</style></head>')]){
  const bad=select(body);bad.input.baseline=f.input.baseline;assert.throws(()=>bad.result(),/STACKI_CANDIDATE_/);
 }
});

test('Studio may remove fixed image dimensions, preserving every byte of other attributes and source',()=>{
 const original=html.replace('alt="Original"','alt="Original" width="599" height="77"');
 const updated=original.replace('width="599"','').replace('height="77"','');
 const f=select(updated);f.input.baseline=f.input.baseline.map(entry=>entry.path==='src/pages/index.astro'?file(entry.path,original):entry);
 assert.equal(f.result().files.find(f=>f.path==='src/pages/index.astro')!.body.toString(),updated);
 assert.deepEqual(f.result().changes.map(c=>c.kind),['image-layout','image-layout']);
 for(const body of [updated.replace('alt="Original"',''),updated.replace(`src="${img}"`,''),updated.replace('name="email"',''),original.replace('width="599"','width="{secret}"')]){
  const bad=select(body);bad.input.baseline=f.input.baseline;assert.throws(()=>bad.result(),/STACKI_CANDIDATE_/);
 }
});
