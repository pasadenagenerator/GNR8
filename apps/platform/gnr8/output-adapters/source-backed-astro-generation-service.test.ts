import assert from "node:assert/strict";
import test from "node:test";

import { computeRuntimeArtifactBundleSha256 } from "@/gnr8/runtime/astro-artifact-materialization";
import type { RuntimeArtifact } from "@/gnr8/runtime/types";

import { canonicalizeScopedImportArtifactBundle } from "./source-backed-astro-generation-service";

test("canonicalizes the known scoped-import post-hash manifest enrichment", () => {
  const artifact = fixtureArtifact();
  const result = canonicalizeScopedImportArtifactBundle(artifact);

  assert.ok(result);
  assert.notEqual(result.bundleSha256, artifact.bundleSha256);
  assert.equal(result.bundleSha256, computeRuntimeArtifactBundleSha256({
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
  }));
  assert.deepEqual(result.htmlByPath, artifact.htmlByPath);
  assert.deepEqual(result.manifest, artifact.manifest);
});

test("leaves canonical artifacts unchanged and rejects unrelated mismatches", () => {
  const legacy = fixtureArtifact();
  const canonical = canonicalizeScopedImportArtifactBundle(legacy);
  assert.ok(canonical);
  assert.equal(canonicalizeScopedImportArtifactBundle(canonical), canonical);

  assert.equal(canonicalizeScopedImportArtifactBundle({
    ...legacy,
    bundleSha256: "0".repeat(64),
  }), null);
  assert.equal(canonicalizeScopedImportArtifactBundle({
    ...legacy,
    manifest: { ...legacy.manifest, sourceKind: "another_importer" },
  }), null);
});

function fixtureArtifact(): RuntimeArtifact {
  const htmlByPath = { "/": "<!doctype html><html><body>CHS</body></html>" };
  const compiledTokenStyles = ":root{--color:#123}";
  const assetFingerprintMap = { "/logo.svg": "a".repeat(64) };
  const legacyManifest = { paths: ["/"], generatedAt: "deterministic" };
  return {
    id: "artifact-source",
    siteId: "site-source",
    siteVersionId: "version-source",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath,
    compiledTokenStyles,
    assetFingerprintMap,
    manifest: {
      ...legacyManifest,
      sourceKind: "scoped_pipeline_import",
      latestRawPreviewValidationEvidence: { evidenceSha256: "b".repeat(64) },
      rawPreviewValidationEvidence: { evidenceSha256: "b".repeat(64) },
      multiPagePreviewValidation: { status: "passed" },
    },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: [],
      pageRolloutPolicyState: [],
      pageEnforcementState: { shadow: [], canary: [], production: [] },
      siteGateState: "READY",
      siteRolloutPolicyState: "READY",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow",
    },
    bundleSha256: computeRuntimeArtifactBundleSha256({
      htmlByPath,
      compiledTokenStyles,
      assetFingerprintMap,
      manifest: legacyManifest,
    }),
    createdAt: "2026-10-14T00:00:00.000Z",
  };
}
