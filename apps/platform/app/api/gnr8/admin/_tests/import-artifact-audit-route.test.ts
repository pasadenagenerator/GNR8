import assert from "node:assert/strict";
import test from "node:test";

import { createImportArtifactAuditRouteHandlers } from "@/app/api/gnr8/admin/import-artifact-audit/import-artifact-audit-route-handlers";
import type { RuntimeStoreDbClient } from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact } from "@/gnr8/runtime/types";

const fakeDbClient = {} as RuntimeStoreDbClient;

function siteVersion(): CanonicalSiteVersionSnapshot {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    siteId: "site_1",
    versionNo: 1,
    state: "READY",
    source: "IMPORT",
    actor: "test",
    createdAt: "2026-06-01T00:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: null,
    importProvenanceSummary: null,
    pages: [],
  } as CanonicalSiteVersionSnapshot;
}

function rawArtifact(): RawImportedSiteArtifact {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    artifactType: "raw_imported_site",
    siteId: "site_1",
    siteVersionId: "11111111-1111-4111-8111-111111111111",
    entryHtmlPath: "index.html",
    assetBasePath: ".",
    fileMap: {
      "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 46, sha256: "sha" },
    },
    metadata: {
      sourceUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      htmlByteLength: 46,
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
    },
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

test("import artifact audit route requires superadmin", async () => {
  const handlers = createImportArtifactAuditRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });

  const response = await handlers.GET(new Request("https://app.test/api/gnr8/admin/import-artifact-audit?siteVersionId=11111111-1111-4111-8111-111111111111"));

  assert.equal(response.status, 403);
});

test("import artifact audit route returns compact JSON report", async () => {
  const handlers = createImportArtifactAuditRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    withSuperadminClient: async (fn) => fn(fakeDbClient),
    getSiteVersion: async () => siteVersion(),
    getRawImportedSiteArtifact: async () => rawArtifact(),
    getRawTemplateSiteAsset: async () => ({
      mediaType: "text/html",
      sizeBytes: 46,
      sha256: "sha",
      bytes: Buffer.from('<!doctype html><html><head><title>Artifact</title></head><body></body></html>', "utf8"),
    }),
    fetch: async () => new Response('<!doctype html><html><head><title>Source</title><script src="/assets/source.js"></script></head><body></body></html>'),
  });

  const response = await handlers.GET(new Request("https://app.test/api/gnr8/admin/import-artifact-audit?siteVersionId=11111111-1111-4111-8111-111111111111&path=/"));
  const body = (await response.json()) as { ok: boolean; report: { sourceUrl: string; rawFilePath: string; missingScriptsInArtifact: string[] } };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.report.sourceUrl, "https://example.com/");
  assert.equal(body.report.rawFilePath, "index.html");
  assert.deepEqual(body.report.missingScriptsInArtifact, ["/assets/source.js"]);
});
