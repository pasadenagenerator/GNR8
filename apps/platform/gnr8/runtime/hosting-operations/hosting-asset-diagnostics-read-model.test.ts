import assert from "node:assert/strict";
import test from "node:test";

import {
  createHostingAssetDiagnosticsReadModel,
  HOSTING_ASSET_DIAGNOSTIC_REMEDIATION_BY_CODE,
  HOSTING_ASSET_DIAGNOSTIC_SEVERITY_BY_CODE,
} from "@/gnr8/runtime/hosting-operations/hosting-asset-diagnostics-read-model";
import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeArtifact } from "@/gnr8/runtime/types";

function runtimeArtifact(input?: { assetFingerprintMap?: Record<string, string> }): RuntimeArtifact {
  return {
    id: "artifact_1",
    siteId: "site_1",
    siteVersionId: "version_1",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<html></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: input?.assetFingerprintMap ?? {},
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
    bundleSha256: "sha",
    createdAt: "2026-06-01T10:00:00.000Z",
  };
}

function siteVersion(): CanonicalSiteVersionSnapshot {
  return {
    id: "version_1",
    siteId: "site_1",
    versionNo: 1,
    state: "PUBLISHED",
    source: "migration",
    actor: "operator:test",
    createdAt: "2026-06-01T10:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: "artifact_1",
    pages: [
      {
        id: "page_1",
        siteVersionId: "version_1",
        pageId: "home",
        path: "/",
        title: "Home",
        structureModel: { sections: [{ id: "hero", type: "hero", order: 0 }] },
        contentModel: { sectionProps: { hero: { headline: "Hello" } } },
        styleTokens: {},
        assetGraph: [{ path: "assets/hero.png", mediaType: "image/png", required: true }],
        semanticSignals: [],
        source: "migration",
        actor: "operator:test",
        createdAt: "2026-06-01T10:00:00.000Z",
      },
    ],
  };
}

function rawImportedArtifact(input?: { codes?: string[]; externalFallbackAssetCount?: number; includeEntryHtml?: boolean }): RawImportedSiteArtifact {
  return {
    id: "raw_1",
    artifactType: "raw_imported_site",
    siteId: "site_1",
    siteVersionId: "version_1",
    entryHtmlPath: "index.html",
    assetBasePath: "assets",
    fileMap:
      input?.includeEntryHtml === false
        ? {}
        : {
            "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 20, sha256: "html_sha" },
          },
    metadata: {
      sourceUrl: "https://example.com",
      finalUrl: "https://example.com/",
      htmlByteLength: 20,
      diagnostics: { codes: input?.codes ?? [] },
      assetSummary: {
        persistedAssetCount: input?.includeEntryHtml === false ? 0 : 1,
        externalFallbackAssetCount: input?.externalFallbackAssetCount ?? 0,
      },
    },
    createdAt: "2026-06-01T10:00:00.000Z",
  };
}

test("hosting asset diagnostics read model: missing required runtime asset renders as critical evidence", () => {
  const model = createHostingAssetDiagnosticsReadModel({
    activeVersion: siteVersion(),
    runtimeArtifact: runtimeArtifact({ assetFingerprintMap: {} }),
    rawArtifact: null,
    importProvenanceSummary: null,
  });

  assert.equal(model.summary.total, 1);
  assert.equal(model.summary.critical, 1);
  assert.equal(model.entries[0]?.assetPath, "assets/hero.png");
  assert.equal(model.entries[0]?.severity, "critical");
  assert.equal(model.entries[0]?.diagnosticCode, "asset_lookup_failed");
  assert.equal(model.entries[0]?.remediation, "Verify artifact asset registration.");
});

test("hosting asset diagnostics read model: missing persisted asset diagnostics render", () => {
  const model = createHostingAssetDiagnosticsReadModel({
    activeVersion: null,
    runtimeArtifact: null,
    rawArtifact: rawImportedArtifact({ codes: ["missing_local_asset"], includeEntryHtml: false }),
    importProvenanceSummary: null,
  });

  assert.equal(model.summary.critical, 2);
  assert.equal(model.entries.some((entry) => entry.assetPath === "index.html" && entry.diagnosticCode === "missing_asset"), true);
  assert.equal(model.entries.some((entry) => entry.assetPath === "(raw import artifact)" && entry.diagnosticCode === "missing_asset"), true);
});

test("hosting asset diagnostics read model: fallback diagnostics render as warnings", () => {
  const model = createHostingAssetDiagnosticsReadModel({
    activeVersion: null,
    runtimeArtifact: null,
    rawArtifact: rawImportedArtifact({ externalFallbackAssetCount: 2 }),
    importProvenanceSummary: null,
  });

  assert.equal(model.summary.total, 1);
  assert.equal(model.summary.warning, 1);
  assert.equal(model.entries[0]?.assetPath, "(2 external fallback assets)");
  assert.equal(model.entries[0]?.diagnosticCode, "external_fallback");
  assert.equal(model.entries[0]?.fallbackStatus, "active");
  assert.equal(model.entries[0]?.remediation, "Persist asset locally to remove source dependency.");
});

test("hosting asset diagnostics read model: severity and remediation mappings are stable", () => {
  assert.deepEqual(HOSTING_ASSET_DIAGNOSTIC_SEVERITY_BY_CODE, {
    missing_asset: "critical",
    external_fallback: "warning",
    asset_lookup_failed: "critical",
    source_proxy_dependency: "warning",
    fallback_resolved: "info",
  });
  assert.deepEqual(HOSTING_ASSET_DIAGNOSTIC_REMEDIATION_BY_CODE, {
    missing_asset: "Re-import or regenerate the affected artifact.",
    external_fallback: "Persist asset locally to remove source dependency.",
    asset_lookup_failed: "Verify artifact asset registration.",
    source_proxy_dependency: "Persist the affected source artifact locally before relying on it for production investigation.",
    fallback_resolved: "No action required; keep the fallback evidence for audit traceability.",
  });
});

test("hosting asset diagnostics read model: empty state has no diagnostics", () => {
  const model = createHostingAssetDiagnosticsReadModel({
    activeVersion: null,
    runtimeArtifact: runtimeArtifact({ assetFingerprintMap: { "assets/hero.png": "sha" } }),
    rawArtifact: rawImportedArtifact(),
    importProvenanceSummary: null,
  });

  assert.deepEqual(model.summary, { total: 0, critical: 0, warning: 0, info: 0 });
  assert.deepEqual(model.entries, []);
});
