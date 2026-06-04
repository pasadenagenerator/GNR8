import assert from "node:assert/strict";
import test from "node:test";

import { createHostingOperationsRouteHandlers } from "@/app/api/gnr8/admin/hosting-operations/[siteId]/hosting-operations-route-handlers";
import type { HostingOperationsReadModel } from "@/gnr8/runtime/hosting-operations/hosting-operations-read-model";

function readModel(input?: Partial<HostingOperationsReadModel>): HostingOperationsReadModel {
  return {
    site: {
      siteId: "site_1",
      canonicalSlug: "maver",
      found: true,
    },
    runtime: {
      activeVersion: {
        id: "version_1",
        versionNo: 2,
        state: "PUBLISHED",
        createdAt: "2026-06-01T10:00:00.000Z",
        artifactId: "artifact_1",
        rendererCompatibilityVersion: "gnr8-renderer-v1",
      },
      activeArtifact: {
        id: "artifact_1",
        artifactType: "runtime_artifact",
        siteVersionId: "version_1",
        publishStage: "production",
        bundleSha256: "sha",
        createdAt: "2026-06-01T10:01:00.000Z",
        entryHtmlPath: null,
        assetBasePath: null,
      },
      activePointer: { siteVersionId: "version_1", artifactId: "artifact_1" },
      resolution: null,
    },
    publish: {
      lastPublish: {
        siteVersionId: "version_1",
        versionNo: 2,
        artifactId: "artifact_1",
        publishedAt: "2026-06-01T10:00:00.000Z",
        state: "PUBLISHED",
      },
      history: [],
    },
    domains: [
      {
        id: "domain_1",
        host: "www.example.com",
        status: "active",
        verified: true,
        lastCheckedAt: "2026-06-01T10:05:00.000Z",
        siteVersionId: "version_1",
        verificationType: "cname",
        verificationHost: "_verify",
        dnsRecordType: "cname",
        dnsRecordHost: "www",
        dnsRecordPurpose: "routing",
        createdAt: "2026-06-01T09:00:00.000Z",
        updatedAt: "2026-06-01T10:05:00.000Z",
      },
    ],
    readiness: {
      state: "ready",
      blockers: [],
      warnings: [],
      site: null,
      domains: null,
    },
    assets: {
      artifactId: "artifact_1",
      artifactType: "runtime_artifact",
      counts: {
        htmlPaths: 1,
        fingerprintedAssets: 1,
        rawFiles: 0,
        persistedAssets: 0,
        externalFallbackAssets: 0,
      },
      diagnostics: {
        healthy: true,
        codes: [],
        warnings: [],
        failures: [],
      },
    },
    diagnostics: {
      latestRuntimeDiagnostics: {
        resolution: null,
        importProvenanceSummary: null,
        artifactGovernance: null,
        rawImportMetadata: null,
      },
      latestFailures: [],
      codes: [],
    },
    rollbackCandidates: [
      {
        siteVersionId: "version_0",
        versionNo: 1,
        artifactId: "artifact_0",
        publishedAt: "2026-05-31T10:00:00.000Z",
        state: "ARCHIVED",
        isActive: false,
      },
    ],
    ...input,
  };
}

test("hosting operations route: requires superadmin", async () => {
  const handlers = createHostingOperationsRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    getHostingOperationsReadModel: async () => readModel(),
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/hosting-operations/site_1"), {
    params: Promise.resolve({ siteId: "site_1" }),
  });

  assert.equal(response.status, 403);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "Forbidden: superadmin only");
});

test("hosting operations route: rejects empty site id", async () => {
  let readModelCalls = 0;
  const handlers = createHostingOperationsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getHostingOperationsReadModel: async () => {
      readModelCalls += 1;
      return readModel();
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/hosting-operations/%20"), {
    params: Promise.resolve({ siteId: " " }),
  });

  assert.equal(response.status, 400);
  assert.equal(readModelCalls, 0);
});

test("hosting operations route: returns 404 when read model has no site", async () => {
  const handlers = createHostingOperationsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getHostingOperationsReadModel: async () =>
      readModel({
        site: {
          siteId: "missing",
          canonicalSlug: null,
          found: false,
        },
      }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/hosting-operations/missing"), {
    params: Promise.resolve({ siteId: "missing" }),
  });

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error: string; site: { found: boolean } };
  assert.equal(body.error, "Hosting operations site not found");
  assert.equal(body.site.found, false);
});

test("hosting operations route: returns read-only hosting payload", async () => {
  let requestedSiteId = "";
  const handlers = createHostingOperationsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getHostingOperationsReadModel: async (siteId) => {
      requestedSiteId = siteId;
      return readModel();
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/hosting-operations/site_1"), {
    params: Promise.resolve({ siteId: "site_1" }),
  });

  assert.equal(response.status, 200);
  assert.equal(requestedSiteId, "site_1");
  const body = (await response.json()) as HostingOperationsReadModel;
  assert.equal(body.runtime.activeVersion?.id, "version_1");
  assert.equal(body.domains[0]?.verified, true);
  assert.equal(body.readiness.state, "ready");
  assert.equal(body.rollbackCandidates[0]?.siteVersionId, "version_0");
});
