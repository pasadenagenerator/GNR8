import assert from "node:assert/strict";
import test from "node:test";

import { createHostingOperationsRouteHandlers } from "@/app/api/gnr8/admin/hosting-operations/[siteId]/hosting-operations-route-handlers";
import type { HostingOperationsReadModel } from "@/gnr8/runtime/hosting-operations/hosting-operations-read-model";

function readModel(input?: Partial<HostingOperationsReadModel>): HostingOperationsReadModel {
  return {
    site: {
      siteId: "site_1",
      requestedSiteId: "site_1",
      runtimeSiteId: "site_1",
      canonicalSlug: "maver",
      found: true,
      lookupMode: "runtime_site_id",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
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
        dnsRecordValue: "cname.vercel-dns.com",
        dnsRecordPurpose: "routing",
        dnsInstructions: [
          {
            type: "cname",
            host: "www",
            value: "cname.vercel-dns.com",
            purpose: "routing",
            source: "inferred",
          },
        ],
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
    readinessDrilldown: {
      site: {
        state: "ready",
        blockers: [],
        warnings: [],
      },
      domains: {
        state: "ready",
        blockers: [],
        warnings: [],
      },
    },
    domainOperations: {
      domains: [
        {
          id: "domain_1",
          hostname: "www.example.com",
          status: "active",
          verificationStatus: "verified",
          active: true,
          lastCheckedAt: "2026-06-01T10:05:00.000Z",
          lastError: null,
          verificationReason: "domain_binding_active",
          dnsInstructions: [
            {
              recordType: "CNAME",
              host: "www",
              value: "cname.vercel-dns.com",
              expectedStatus: "routing_required",
            },
          ],
          diagnostics: {
            lastDomainCheck: "2026-06-01T10:05:00.000Z",
            lastVerificationResult: "active",
            verificationDiagnostics: ["DOMAIN_STATUS_CHECKED", "DNS_INSTRUCTIONS_PRESENT", "DOMAIN_BINDING_ACTIVE"],
          },
        },
      ],
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
          requestedSiteId: "missing",
          runtimeSiteId: null,
          canonicalSlug: null,
          found: false,
          lookupMode: "not_found",
          expectedIdentifier: "ownership_site_id_or_runtime_site_id",
        },
      }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/hosting-operations/missing"), {
    params: Promise.resolve({ siteId: "missing" }),
  });

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error: string; site: { found: boolean; requestedSiteId: string; lookupMode: string; expectedIdentifier: string } };
  assert.equal(body.error, "Hosting operations site not found");
  assert.equal(body.site.found, false);
  assert.equal(body.site.requestedSiteId, "missing");
  assert.equal(body.site.lookupMode, "not_found");
  assert.equal(body.site.expectedIdentifier, "ownership_site_id_or_runtime_site_id");
});

test("hosting operations route: returns read-only hosting payload for overview-emitted site id", async () => {
  let requestedSiteId = "";
  const overviewSiteId = "91fb0854-9b84-4c4b-aff4-777043ab6451";
  const handlers = createHostingOperationsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getHostingOperationsReadModel: async (siteId) => {
      requestedSiteId = siteId;
      return readModel({
        site: {
          siteId: overviewSiteId,
          requestedSiteId: overviewSiteId,
          runtimeSiteId: "runtime_site_91fb0854",
          canonicalSlug: "maver",
          found: true,
          lookupMode: "ownership_site_id",
          expectedIdentifier: "ownership_site_id_or_runtime_site_id",
        },
      });
    },
  });

  const response = await handlers.GET(new Request(`http://localhost/api/gnr8/admin/hosting-operations/${overviewSiteId}`), {
    params: Promise.resolve({ siteId: overviewSiteId }),
  });

  assert.equal(response.status, 200);
  assert.equal(requestedSiteId, overviewSiteId);
  const body = (await response.json()) as HostingOperationsReadModel;
  assert.equal(body.site.siteId, overviewSiteId);
  assert.equal(body.site.runtimeSiteId, "runtime_site_91fb0854");
  assert.equal(body.site.lookupMode, "ownership_site_id");
  assert.equal(body.runtime.activeVersion?.id, "version_1");
  assert.equal(body.domains[0]?.verified, true);
  assert.equal(body.readiness.state, "ready");
  assert.equal(body.domainOperations.domains[0]?.dnsInstructions[0]?.recordType, "CNAME");
  assert.equal(body.rollbackCandidates[0]?.siteVersionId, "version_0");
});
