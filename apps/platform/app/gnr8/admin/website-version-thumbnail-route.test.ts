import assert from "node:assert/strict";
import test from "node:test";

import { createWebsiteVersionThumbnailRouteHandlers } from "./workspace/[siteVersionId]/thumbnails/website-version-thumbnail-route-handlers";
import { buildWebsiteVersionThumbnailArtifact } from "@/gnr8/architecture/website-version-thumbnail-builder";
import { sha256Hex } from "@/gnr8/runtime/deterministic";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAJLOA/xDk8O2AAAAAElFTkSuQmCC", "base64");

const thumbnail = buildWebsiteVersionThumbnailArtifact({
  source: {
    siteVersionId: SITE_VERSION_ID,
    sourceSiteId: "odv",
    dryRunId: null,
    versionKind: "original_source",
    iterationNumber: null,
    sourceArtifactId: "raw-artifact",
    sourceArtifactKind: "raw_imported_site",
    generatedProposalBundleId: null,
    generatedProposalBundleSha256: null,
    sourceScreenshotArtifactId: "raw-artifact:screenshot",
    sourceScreenshotContentHash: sha256Hex(PNG),
  },
  captureMethod: "reused_evidence_capture_screenshot",
  captureTimestamp: "2026-07-16T10:00:00.000Z",
  viewport: { width: 2, height: 2, deviceScaleFactor: 1, fullPage: false },
  image: { mediaType: "image/png", width: 2, height: 2, contentBase64: PNG.toString("base64") },
});

function handlers(input: { authorized?: boolean; generated?: boolean } = {}) {
  return createWebsiteVersionThumbnailRouteHandlers({
    requireSuperadminUserId: async () => {
      if (input.authorized === false) throw new Error("Forbidden: superadmin only");
      return "superadmin";
    },
    loadOriginal: async () => thumbnail,
    loadGenerated: async () => input.generated ? { ...thumbnail, versionKind: "generated_iteration", iterationNumber: 1 } : null as any,
  });
}

test("thumbnail route requires superadmin", async () => {
  const response = await handlers({ authorized: false }).GET(new Request("https://app.test/thumb"), {
    params: Promise.resolve({ siteVersionId: SITE_VERSION_ID }),
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json() as { code: string }).code, "SUPERADMIN_REQUIRED");
});

test("thumbnail route serves original bytes with immutable private headers", async () => {
  const response = await handlers().GET(new Request("https://app.test/thumb"), {
    params: Promise.resolve({ siteVersionId: SITE_VERSION_ID }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("content-length"), String(PNG.byteLength));
  assert.equal(response.headers.get("etag"), `"sha256-${thumbnail.contentHash}"`);
  assert.equal(response.headers.get("cache-control")?.includes("private"), true);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(Buffer.from(await response.arrayBuffer()).equals(PNG), true);
});

test("thumbnail route does not synthesize missing generated thumbnails", async () => {
  const response = await handlers().GET(new Request("https://app.test/thumb"), {
    params: Promise.resolve({ siteVersionId: SITE_VERSION_ID, iteration: "1" }),
  });
  assert.equal(response.status, 404);
  assert.equal((await response.json() as { code: string }).code, "THUMBNAIL_UNAVAILABLE");
});
