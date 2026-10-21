/** Local replay bridge. Only external authentication and provider I/O are replaced. */
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import type { AstroSourceSnapshot } from "../output-adapters/astro-static-site-workspace-preparation";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { createStackiDraftRouteHandlers } from "./stacki-draft-route-handlers";
import { parseStackiRecord, type StackiDraftScope } from "./stacki-draft-contract";
import { prepareStackiSourceProject } from "./stacki-source-project";
import { rewriteRawTemplateCssForRuntime } from "../../src/public-site/raw-template-runtime";

export const STACKI_PROOF_ASSET_PREFIX = "/api/gnr8/runtime/preview-assets/retained-northstar/44444444-4444-4444-8444-444444444444/assets/";

const scope: StackiDraftScope = {
    agencyId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222",
    siteId: "33333333-3333-4333-8333-333333333333", siteVersionId: "44444444-4444-4444-8444-444444444444",
  };
const actor = { userId: "55555555-5555-4555-8555-555555555555", agencyId: scope.agencyId };
const context = { params: Promise.resolve({ clientId: scope.clientId, siteId: scope.siteId, siteVersionId: scope.siteVersionId }) };
const url = `https://gnr8-proof.invalid/checkpoint?agencyId=${scope.agencyId}`;

/** Fixture acquisition is injected; source validation, prepare route, storage and
 * readback are the real implementation used by GNR8. No hosted API is called. */
export async function prepareStackiThroughGnr8(input: {
  source: string; draft: string; storageRoot: string; snapshot: AstroSourceSnapshot;
}) {
  const transport = createStackiLocalStorage(input.storageRoot);
  const sourceArtifactId = "66666666-6666-4666-8666-666666666666";
  const sourceFiles = await Promise.all(input.snapshot.files.map(async file => ({
    ...file, role: "source", contents: await readFile(join(input.source, file.path), "utf8"),
  })));
  const assetEvidence = input.snapshot.files.filter(file => file.path.startsWith("public/assets/")).map(file => ({
    path: STACKI_PROOF_ASSET_PREFIX + file.path.slice("public/assets/".length),
    mediaType: file.path.endsWith(".css") ? "text/css" : "image/svg+xml",
    sizeBytes: file.bytes, sha256: file.sha256,
  }));
  const handlers = createStackiDraftRouteHandlers({
    enabled: () => true,
    authorize: async selected => { assert.deepEqual(selected, scope); return actor; },
    store: () => new SupabaseStackiDraftStore(transport.client, transport.bucket),
    source: async () => (await prepareStackiSourceProject({
      workspace: { adapterId: "astro-static-site", adapterVersion: "gnr8-output-adapter-selection:v1",
        sourceSiteVersionId: scope.siteVersionId, sourceArtifactId, files: sourceFiles, assetEvidence },
      binding: { runtimeSiteId: "retained-northstar", sourceSiteVersionId: scope.siteVersionId,
        sourceArtifactId, sourceSnapshotSha256: input.snapshot.aggregateSha256,
        requiredAssets: assetEvidence.map(({ path, sha256 }) => ({ path, sha256 })) },
      readVerifiedAsset: async (asset, path, allowedPaths) => {
        const body = await readFile(join(input.source, "public", path));
        assert.equal(createHash("sha256").update(body).digest("hex"), asset.sha256);
        assert.equal(body.length, asset.sizeBytes);
        return path.endsWith(".css") ? Buffer.from(rewriteRawTemplateCssForRuntime({
          css: body.toString(), siteId: "retained-northstar", siteVersionId: scope.siteVersionId,
          assetFilePath: path, fileMapPaths: new Set(allowedPaths), versionCssUrls: true,
        })) : body;
      },
    })).files,
  });
  const response = await handlers.PREPARE(new Request(url, {
    method: "POST", headers: { origin: "https://gnr8-proof.invalid", "content-type": "application/json" }, body: "{}",
  }), context);
  const result = await response.json();
  assert.equal(response.status, 201, JSON.stringify(result));
  const loaded = await handlers.GET(new Request(url), context);
  assert.equal(loaded.status, 200);
  const checkpoint = parseStackiRecord((await loaded.json()).checkpoint, scope, result.revision);
  await materialize(input.draft, checkpoint.files);
  return { revision: checkpoint.revision, sourceSnapshotSha256: input.snapshot.aggregateSha256,
    acquisition: "retained local generator fixture; hosted source composition not executed",
    preparedViaRoute: true, materializedAssetCount: assetEvidence.length,
    storageRequests: transport.calls.length };
}

export async function recoverStackiThroughGnr8(input: {
  draft: string; checkpoint: string; restored: string; storageRoot: string; snapshot: AstroSourceSnapshot;
  expectedRevision?: number;
}) {
  const first = createStackiLocalStorage(input.storageRoot);
  let authorizedRequests = 0;
  const authorize = async (selected: StackiDraftScope) => {
    assert.deepEqual(selected, scope);
    authorizedRequests++;
    return actor;
  };
  const saveRoutes = createStackiDraftRouteHandlers({
    enabled: () => true, authorize,
    store: () => new SupabaseStackiDraftStore(first.client, first.bucket),
  });
  const files = await Promise.all(input.snapshot.files.map(async file => ({
    path: file.path, base64: (await readFile(join(input.checkpoint, file.path))).toString("base64"),
  })));
  const response = await saveRoutes.POST(new Request(url, {
    method: "POST", headers: { origin: "https://gnr8-proof.invalid", "content-type": "application/json" },
    body: JSON.stringify({ expectedRevision: input.expectedRevision ?? 0, files }),
  }), context);
  const saved = await response.json();
  assert.equal(response.status, 200, JSON.stringify(saved));
  assert.equal(saved.revision, (input.expectedRevision ?? 0) + 1);
  // Remove BOTH local copies. Recovery must now read through the production
  // route/store code and real SDK with the retained provider-transport objects.
  await rm(input.draft, { recursive: true });
  await rm(input.checkpoint, { recursive: true });
  const second = createStackiLocalStorage(input.storageRoot);
  const readRoutes = createStackiDraftRouteHandlers({
    enabled: () => true, authorize,
    store: () => new SupabaseStackiDraftStore(second.client, second.bucket),
  });
  const restoredResponse = await readRoutes.GET(new Request(url), context);
  assert.equal(restoredResponse.status, 200);
  const result = await restoredResponse.json();
  const restored = parseStackiRecord(result.checkpoint, scope, saved.revision);
  assert.equal(restored.sha256, saved.sha256);
  await materialize(input.restored, restored.files);
  return {
    transport: "real Supabase SDK with local filesystem fetch; no hosted Supabase",
    authentication: "injected owner identity; hosted login not exercised",
    revision: restored.revision, checkpointSha256: restored.sha256, authorizedRequests,
    localDraftAndCheckpointDeleted: true,
    saveStorageRequests: first.calls.length, recoveryStorageRequests: second.calls.length,
  };
}

async function materialize(root: string, files: Array<{ path: string; base64: string }>) {
  await mkdir(root, { recursive: false });
  for (const file of files) {
    const path = join(root, file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(file.base64, "base64"), { flag: "wx" });
  }
}
