import assert from "node:assert/strict";
import test from "node:test";

import { computeRuntimeArtifactBundleSha256 } from "@/gnr8/runtime/astro-artifact-materialization";
import type { RuntimeArtifact } from "@/gnr8/runtime/types";

import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";
import { resolveChsAstroEvaluationInput } from "./chs-astro-evaluation-input";
import { CHS_ASTRO_EXPORT_VERIFICATION } from "./chs-astro-source-content";

const SOURCE_HASH = "a".repeat(64);
const EXPORT_HASH = "b".repeat(64);
const CONVERTED_HASH = "d".repeat(64);
const CONTENT_HASH = CONVERTED_HASH;

test("generated CHS evaluation resolves verified rendered HTML and records its immutable hash lineage", () => {
  const artifact = generatedArtifact();
  const retained = structuredClone(artifact);
  const resolved = resolveChsAstroEvaluationInput(artifact);

  assert.equal(resolved.html, artifact.htmlByPath["/"]);
  assert.equal(resolved.provenance.inputKind, "validated_rendered_html");
  assert.equal(resolved.provenance.sourceArtifactId, artifact.id);
  assert.equal(resolved.provenance.sourceSnapshotSha256, SOURCE_HASH);
  assert.equal(resolved.provenance.exportSha256, EXPORT_HASH);
  assert.equal(resolved.provenance.candidateContentSha256, CONTENT_HASH);
  assert.equal(resolved.provenance.convertedArtifactSha256, CONVERTED_HASH);
  assert.equal(resolved.provenance.runtimeBundleSha256, artifact.bundleSha256);
  assert.match(resolved.provenance.htmlSha256, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(resolved.html, /^---/);
  assert.deepEqual(artifact, retained, "retained artifact bytes and hashes must not be mutated during evaluation");
});

test("generated CHS evaluation does not fall back when the retained artifact is unavailable", () => {
  assert.throws(
    () => resolveChsAstroEvaluationInput(null),
    new RegExp(`CHS_ASTRO_EVALUATION_VALIDATED_ARTIFACT_MISSING:${CHS_ASTRO_EVALUATION.sourceSiteVersionId}`),
  );
});

test("generated CHS evaluation rejects non-generated, tampered, incomplete, and unsupported artifacts", () => {
  const withoutPromotion = generatedArtifact();
  delete withoutPromotion.manifest.astroCandidatePromotion;
  withoutPromotion.bundleSha256 = bundleHash(withoutPromotion);
  assert.throws(
    () => resolveChsAstroEvaluationInput(withoutPromotion),
    /CHS_ASTRO_EVALUATION_GENERATED_PROVENANCE_MISSING/,
  );

  const tampered = generatedArtifact();
  tampered.htmlByPath["/"] += "tampered";
  assert.throws(
    () => resolveChsAstroEvaluationInput(tampered),
    /CHS_ASTRO_EVALUATION_RUNTIME_BUNDLE_HASH_MISMATCH/,
  );

  const missingContent = generatedArtifact();
  missingContent.htmlByPath["/"] = "<!doctype html><html><body>incomplete</body></html>";
  missingContent.bundleSha256 = bundleHash(missingContent);
  assert.throws(
    () => resolveChsAstroEvaluationInput(missingContent),
    /CHS_ASTRO_EVALUATION_REQUIRED_CONTENT_MISSING/,
  );

  const unsupported = generatedArtifact();
  unsupported.htmlByPath["/about"] = unsupported.htmlByPath["/"]!;
  unsupported.bundleSha256 = bundleHash(unsupported);
  assert.throws(
    () => resolveChsAstroEvaluationInput(unsupported),
    /CHS_ASTRO_EVALUATION_UNSUPPORTED_OUTPUT_CAPABILITY/,
  );

  const unsafe = generatedArtifact();
  unsafe.htmlByPath["/"] = unsafe.htmlByPath["/"]!.replace("</body>", "<script>alert('unsafe')</script></body>");
  unsafe.bundleSha256 = bundleHash(unsafe);
  assert.throws(
    () => resolveChsAstroEvaluationInput(unsafe),
    /cannot contain scripts/,
  );

  const externalReference = generatedArtifact();
  externalReference.htmlByPath["/"] = externalReference.htmlByPath["/"]!.replace("</head>", '<link rel="stylesheet" href="https://example.com/site.css"></head>');
  externalReference.bundleSha256 = bundleHash(externalReference);
  assert.throws(
    () => resolveChsAstroEvaluationInput(externalReference),
    /cannot contain linked resources/,
  );
});

function generatedArtifact(): RuntimeArtifact {
  const html = `<!doctype html><html><head>${CHS_ASTRO_EXPORT_VERIFICATION.expectedContent[0]}</head><body>${CHS_ASTRO_EXPORT_VERIFICATION.expectedContent.slice(1).map((value) => `<p>${value}</p>`).join("")}</body></html>`;
  const manifest: Record<string, unknown> = {
    astroCandidateManifest: {
      provenance: {
        sourceSnapshotSha256: SOURCE_HASH,
        exportSha256: EXPORT_HASH,
        convertedArtifactSha256: CONVERTED_HASH,
      },
    },
    astroCandidatePromotion: {
      version: "gnr8-astro-runtime-artifact-materialization:v1",
      candidateId: "candidate-chs",
      candidateContentSha256: CONTENT_HASH,
      candidateStorageSha256: "e".repeat(64),
      sourceSnapshotSha256: SOURCE_HASH,
      exportSha256: EXPORT_HASH,
      convertedArtifactSha256: CONVERTED_HASH,
      promotionIdentitySha256: "f".repeat(64),
      actorUserId: "actor",
      idempotencyKey: "idempotency",
      htmlTransformation: "none",
      governanceEvaluation: { status: "evaluated", decision: "ALLOW", blockerCodes: [] },
    },
  };
  const artifact: RuntimeArtifact = {
    id: "23000000-0000-4233-8233-000000000001",
    siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: CHS_ASTRO_EVALUATION.sourceSiteVersionId,
    rendererCompatibilityVersion: "test",
    htmlByPath: { "/": html },
    compiledTokenStyles: CHS_ASTRO_EXPORT_VERIFICATION.expectedThemeToken,
    assetFingerprintMap: { "_astro/site.css": "1".repeat(64) },
    manifest,
    publishStage: "shadow",
    shadowRestricted: true,
    artifactGovernance: {
      pageGateState: [],
      pageRolloutPolicyState: [],
      pageEnforcementState: { shadow: [], canary: [], production: [] },
      siteGateState: "SITE_CANARY_READY",
      siteRolloutPolicyState: "CANARY_ONLY",
      siteEnforcementState: { shadow: "ALLOW", canary: "ALLOW", production: "DENY" },
      publishStage: "shadow",
    },
    bundleSha256: "",
    createdAt: "2026-09-30T12:00:00.000Z",
  };
  artifact.bundleSha256 = bundleHash(artifact);
  return artifact;
}

function bundleHash(artifact: RuntimeArtifact): string {
  return computeRuntimeArtifactBundleSha256({
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
  });
}
