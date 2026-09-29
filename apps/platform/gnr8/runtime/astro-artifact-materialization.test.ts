import assert from "node:assert/strict";
import test from "node:test";

import {
  ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
  buildPreservedAstroArtifactBundleForPublish,
  computeRuntimeArtifactBundleSha256,
} from "@/gnr8/runtime/astro-artifact-materialization";
import type { RuntimeArtifact } from "@/gnr8/runtime/types";

test("publish bundle preserves promoted Astro HTML/CSS and recomputes established bundle semantics", () => {
  const artifact = promotedArtifact();
  const bundle = buildPreservedAstroArtifactBundleForPublish({
    artifact,
    publishStage: "production",
    shadowRestricted: false,
    enforcementDecision: "ALLOW",
  });
  assert.ok(bundle);
  assert.deepEqual(bundle.htmlByPath, artifact.htmlByPath);
  assert.equal(bundle.compiledTokenStyles, artifact.compiledTokenStyles);
  assert.deepEqual(bundle.assetFingerprintMap, artifact.assetFingerprintMap);
  assert.equal(bundle.manifest.publishStage, "production");
  assert.equal(bundle.manifest.enforcementDecision, "ALLOW");
  assert.equal(bundle.bundleSha256, computeRuntimeArtifactBundleSha256({
    htmlByPath: bundle.htmlByPath,
    compiledTokenStyles: bundle.compiledTokenStyles,
    assetFingerprintMap: bundle.assetFingerprintMap,
    manifest: bundle.manifest,
  }));
});

test("non-Astro runtime artifacts continue through the canonical fallback path", () => {
  const artifact = promotedArtifact();
  artifact.manifest = { siteId: artifact.siteId, paths: ["/"] };
  assert.equal(buildPreservedAstroArtifactBundleForPublish({
    artifact,
    publishStage: "shadow",
    shadowRestricted: true,
    enforcementDecision: "REVIEW_ONLY",
  }), null);
});

function promotedArtifact(): RuntimeArtifact {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    siteId: "runtime-site",
    siteVersionId: "22222222-2222-4222-8222-222222222222",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<!doctype html><html><head><style>.hero{color:red}</style></head><body><main class=\"hero\">Astro</main></body></html>" },
    compiledTokenStyles: ".hero{color:red}",
    assetFingerprintMap: { "styles/site.css": "a".repeat(64) },
    manifest: {
      siteId: "runtime-site",
      siteVersionId: "22222222-2222-4222-8222-222222222222",
      paths: ["/"],
      astroCandidatePromotion: {
        version: ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
        candidateId: "astro_candidate_33333333333343338333333333333333",
        candidateContentSha256: "b".repeat(64),
        candidateStorageSha256: "c".repeat(64),
        sourceSnapshotSha256: "d".repeat(64),
        exportSha256: "e".repeat(64),
        convertedArtifactSha256: "b".repeat(64),
        promotionIdentitySha256: "f".repeat(64),
        actorUserId: "superadmin",
        idempotencyKey: "promotion",
        htmlTransformation: "none",
        governanceEvaluation: { status: "evaluated", decision: "ALLOW", blockerCodes: [] },
      },
    },
    publishStage: "shadow",
    shadowRestricted: true,
    artifactGovernance: {} as RuntimeArtifact["artifactGovernance"],
    bundleSha256: "0".repeat(64),
    createdAt: "2026-09-29T00:00:00.000Z",
  };
}
