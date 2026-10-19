import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readProtectedPreviewAsset } from "../preview-assets/[siteId]/[siteVersionId]/[...assetPath]/protected-preview-asset";
import { createPreviewAssetsRouteHandlers } from "../preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers";

const input = { siteId: "site_one", siteVersionId: "11111111-1111-4111-8111-111111111111", path: "assets/logo.png" };
function fixture() {
  const bytes = Buffer.from("retained bytes");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const entry = { path: input.path, sizeBytes: bytes.length, sha256, mediaType: "image/png" };
  const artifact = { id: "artifact", file_map: { [input.path]: entry } };
  const file = { media_type: entry.mediaType, file_size_bytes: bytes.length, sha256, content_bytes: `\\x${bytes.toString("hex")}` };
  const reads: string[] = [];
  const deps = {
    enabled: () => true,
    authenticate: async () => "superadmin",
    ownership: async (version: string, site: string) => { assert.equal(version, input.siteVersionId); assert.equal(site, input.siteId); return {} as never; },
    client: () => ({ from(table: string) {
      reads.push(table);
      return { select() { return this; }, eq() { return this; }, in() { return this; }, async limit() { return { data: table.endsWith("_files") ? [file] : [artifact], error: null }; } };
    } }) as never,
  };
  return { deps, file, entry, reads, bytes };
}

test("protected asset uses the authenticated stateless path before any pg acquisition", async () => {
  const f = fixture();
  const route = createPreviewAssetsRouteHandlers({
    readProtectedPreviewAsset: args => readProtectedPreviewAsset(args, f.deps),
    acquireRuntimeDbClient: async () => { throw new Error("session pool must not be touched"); },
  });
  const response = await route.GET(new Request("https://review.invalid/asset"), { params: Promise.resolve({ ...input, assetPath: input.path.split("/") }) });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), f.bytes);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-gnr8-raw-db-client-acquisitions"), "0");
});

test("auth and ownership denials do not read asset bytes; disabled paths retain existing behavior", async () => {
  const f = fixture();
  assert.equal((await readProtectedPreviewAsset(input, { ...f.deps, authenticate: async () => { throw new Error("Unauthorized"); } }))?.status, 401);
  assert.equal((await readProtectedPreviewAsset(input, { ...f.deps, ownership: async () => { throw new Error("mismatch"); } }))?.status, 500);
  assert.deepEqual(f.reads, []);
  assert.equal(await readProtectedPreviewAsset(input, { ...f.deps, enabled: () => false }), null);
  assert.equal(await readProtectedPreviewAsset({ ...input, path: "script.js" }, f.deps), null);
});

test("manifest and persisted byte integrity fail closed", async () => {
  for (const corruption of ["digest", "size", "mime", "encoding", "manifest"] as const) {
    const f = fixture();
    if (corruption === "digest") f.file.sha256 = "0".repeat(64);
    if (corruption === "size") f.file.file_size_bytes++;
    if (corruption === "mime") f.file.media_type = "text/html";
    if (corruption === "encoding") f.file.content_bytes = "not bytea";
    if (corruption === "manifest") f.entry.sha256 = "0".repeat(64);
    assert.equal((await readProtectedPreviewAsset(input, f.deps))?.status, 500, corruption);
  }
});
