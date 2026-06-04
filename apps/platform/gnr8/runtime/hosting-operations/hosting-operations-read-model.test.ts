import assert from "node:assert/strict";
import test from "node:test";

import {
  getHostingOperationsReadModel,
  type HostingOperationsReadModelDependencies,
} from "@/gnr8/runtime/hosting-operations/hosting-operations-read-model";
import { createRuntimeDomainReadinessReport } from "@/gnr8/runtime/readiness/runtime-domain-readiness";
import { createRuntimeSiteReadinessReport } from "@/gnr8/runtime/readiness/runtime-site-readiness";
import { resolveRuntimeSiteVersion } from "@/gnr8/runtime/resolution/runtime-resolution";
import type { RuntimeDomainHostBinding, RuntimeSiteResolutionBinding } from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

const activeVersionId = "11111111-1111-4111-8111-111111111111";
const rollbackVersionId = "22222222-2222-4222-8222-222222222222";
const activeArtifactId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const rollbackArtifactId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function siteBinding(): RuntimeSiteResolutionBinding {
  return {
    siteId: "site_1",
    canonicalSlug: "maver",
    activeSiteVersionId: activeVersionId,
    latestImportedSiteVersionId: activeVersionId,
    publishedSiteVersionId: activeVersionId,
    previewSiteVersionId: activeVersionId,
    candidateSiteVersions: [
      {
        siteVersionId: rollbackVersionId,
        versionNo: 1,
        state: "ARCHIVED",
        artifactId: rollbackArtifactId,
        createdAt: "2026-05-30T10:00:00.000Z",
      },
      {
        siteVersionId: activeVersionId,
        versionNo: 2,
        state: "PUBLISHED",
        artifactId: activeArtifactId,
        createdAt: "2026-06-01T10:00:00.000Z",
      },
    ],
  };
}

function domainRows(): RuntimeDomainHostBinding[] {
  return [
    {
      id: "domain_1",
      siteId: "site_1",
      siteVersionId: activeVersionId,
      domain: "www.example.com",
      status: "active",
      domainType: "subdomain",
      verificationType: "cname",
      verificationValue: "verify.example",
      verificationHost: "_verify.www",
      dnsRecordType: "cname",
      dnsRecordHost: "www",
      dnsRecordValue: "cname.vercel-dns.com",
      dnsRecordPurpose: "routing",
      dnsInstructions: null,
      lastCheckedAt: "2026-06-01T11:00:00.000Z",
      vercelDomainId: "vercel_domain_1",
      createdAt: "2026-05-31T10:00:00.000Z",
      updatedAt: "2026-06-01T11:00:00.000Z",
    },
  ];
}

function siteVersion(input: {
  id: string;
  versionNo: number;
  state: CanonicalSiteVersionSnapshot["state"];
  artifactId: string;
  createdAt: string;
}): CanonicalSiteVersionSnapshot {
  return {
    id: input.id,
    siteId: "site_1",
    versionNo: input.versionNo,
    state: input.state,
    source: "migration",
    actor: "operator:test",
    createdAt: input.createdAt,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: input.artifactId,
    importProvenanceSummary: {
      kind: "runtime_import_provenance_summary_v1",
      sourceMode: "rendered_dom",
      importFidelityStatus: "degraded_import",
      renderedCaptureStatus: "partial",
      renderedDomQuality: "weak",
      screenshotCount: 1,
      computedStyleSampleCount: 3,
      renderedCapture: {
        used: true,
        status: "partial",
        quality: "weak",
        domLength: 100,
        nodeCount: 10,
        styleSampleCount: 3,
        styleCoverage: 0.5,
        screenshots: { viewport: true, fullPage: false },
        execution: {
          runtimeKind: "nodejs",
          environmentSupported: true,
          browserPackageAvailable: true,
          browserBinaryAvailable: true,
          environmentStatus: "supported",
          failureCategory: "page",
          failureCode: "CAPTURE_WARN_PAGE",
          browserLaunch: "succeeded",
          navigation: "succeeded",
          dom: "captured",
          screenshot: "captured",
          styleSampling: "captured",
        },
      },
      importDiagnosticCodes: ["ASSET_FALLBACK_WARN"],
      captureEvidence: {
        selectedSourceHtmlPath: null,
        responseHtmlPath: null,
        entryHtmlPath: "index.html",
        renderedCaptureManifestPath: null,
        acquisitionEvidencePath: null,
        renderedDomPath: null,
        computedStylesPath: null,
        renderedViewportScreenshotPath: null,
        renderedFullpageScreenshotPath: null,
        screenshotPaths: [],
      },
      styleSignals: null,
    },
    pages: [],
  };
}

function runtimeArtifact(): RuntimeArtifact {
  return {
    id: activeArtifactId,
    siteId: "site_1",
    siteVersionId: activeVersionId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<html></html>", "/about": "<html></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: { "assets/logo.png": "sha" },
    manifest: {},
    publishStage: "production",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: [],
      pageRolloutPolicyState: [],
      pageEnforcementState: { shadow: [], canary: [], production: [] },
      siteGateState: "passed",
      siteRolloutPolicyState: "production_ready",
      siteEnforcementState: { shadow: "passed", canary: "passed", production: "passed" },
      publishStage: "production",
    },
    bundleSha256: "bundle_sha",
    createdAt: "2026-06-01T10:30:00.000Z",
  };
}

function deps(): Partial<HostingOperationsReadModelDependencies> {
  return {
    getRuntimeSiteResolutionBinding: async () => siteBinding(),
    getRuntimeSiteDomainReadinessBinding: async () => ({
      siteId: "site_1",
      canonicalSlug: "maver",
      primaryHost: "maver.source.test",
      internalPreviewHost: "maver.preview.test",
      customDomains: ["www.example.com"],
      activeDomainBindingHost: "www.example.com",
      domainBindingCandidates: [
        {
          host: "maver.preview.test",
          source: "runtime_host_binding",
          status: "ACTIVE",
          isInternalHost: true,
          isActive: true,
        },
        {
          host: "www.example.com",
          source: "runtime_domain_binding",
          status: "active",
          isInternalHost: false,
          isActive: true,
        },
      ],
    }),
    listDomainHostBindingsForSite: async () => domainRows(),
    listPreviouslyPublishedVersions: async () => [
      { id: activeVersionId, artifactId: activeArtifactId },
      { id: rollbackVersionId, artifactId: rollbackArtifactId },
    ],
    getSiteVersion: async (siteVersionId) =>
      siteVersionId === activeVersionId
        ? siteVersion({
            id: activeVersionId,
            versionNo: 2,
            state: "PUBLISHED",
            artifactId: activeArtifactId,
            createdAt: "2026-06-01T10:00:00.000Z",
          })
        : siteVersion({
            id: rollbackVersionId,
            versionNo: 1,
            state: "ARCHIVED",
            artifactId: rollbackArtifactId,
            createdAt: "2026-05-30T10:00:00.000Z",
          }),
    getArtifactById: async () => runtimeArtifact(),
    getRawImportedSiteArtifact: async () => ({
      id: "raw_1",
      artifactType: "raw_imported_site",
      siteId: "site_1",
      siteVersionId: activeVersionId,
      entryHtmlPath: "index.html",
      assetBasePath: "assets",
      fileMap: {
        "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 20, sha256: "html_sha" },
        "assets/logo.png": { path: "assets/logo.png", mediaType: "image/png", sizeBytes: 30, sha256: "asset_sha" },
      },
      metadata: {
        sourceUrl: "https://example.com",
        finalUrl: "https://example.com/",
        htmlByteLength: 20,
        diagnostics: { codes: ["RAW_IMPORT_WARN"] },
        assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 1 },
      },
      createdAt: "2026-06-01T10:20:00.000Z",
    }),
    getRawTemplateSiteArtifact: async () => null,
    getActivePointerForSite: async () => ({ siteVersionId: activeVersionId, artifactId: activeArtifactId }),
    createRuntimeSiteReadinessReport,
    createRuntimeDomainReadinessReport,
    resolveRuntimeSiteVersion,
  };
}

test("hosting operations read model: resolves active version and artifact", async () => {
  const model = await getHostingOperationsReadModel("site_1", deps());

  assert.equal(model.runtime.activeVersion?.id, activeVersionId);
  assert.equal(model.runtime.activeVersion?.versionNo, 2);
  assert.equal(model.runtime.activeArtifact?.id, activeArtifactId);
  assert.equal(model.runtime.activeArtifact?.artifactType, "runtime_artifact");
  assert.equal(model.runtime.activePointer?.artifactId, activeArtifactId);
});

test("hosting operations read model: exposes domain visibility and readiness aggregation", async () => {
  const model = await getHostingOperationsReadModel("site_1", deps());

  assert.equal(model.domains.length, 1);
  assert.equal(model.domains[0]?.host, "www.example.com");
  assert.equal(model.domains[0]?.verified, true);
  assert.equal(model.readiness.state, "ready");
  assert.deepEqual(model.readiness.blockers, []);
  assert.equal(model.readiness.site?.hasActivePointer, true);
  assert.equal(model.readiness.domains?.hasActiveDomainBinding, true);
});

test("hosting operations read model: exposes rollback candidates excluding active version", async () => {
  const model = await getHostingOperationsReadModel("site_1", deps());

  assert.equal(model.rollbackCandidates.length, 1);
  assert.equal(model.rollbackCandidates[0]?.siteVersionId, rollbackVersionId);
  assert.equal(model.rollbackCandidates[0]?.artifactId, rollbackArtifactId);
  assert.equal(model.rollbackCandidates[0]?.versionNo, 1);
});

test("hosting operations read model: aggregates asset diagnostics", async () => {
  const model = await getHostingOperationsReadModel("site_1", deps());

  assert.equal(model.assets.counts.htmlPaths, 2);
  assert.equal(model.assets.counts.fingerprintedAssets, 1);
  assert.equal(model.assets.counts.rawFiles, 2);
  assert.equal(model.assets.counts.persistedAssets, 1);
  assert.equal(model.assets.counts.externalFallbackAssets, 1);
  assert.deepEqual(model.assets.diagnostics.codes, ["ASSET_FALLBACK_WARN", "RAW_IMPORT_WARN"]);
  assert.equal(model.diagnostics.latestFailures.includes("CAPTURE_WARN_PAGE"), true);
});
