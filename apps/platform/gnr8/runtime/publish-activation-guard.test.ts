import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePointerSwitchReadiness, evaluatePublishActivationCandidate } from "@/gnr8/runtime/publish-activation-guard";
import type { RuntimeArtifact } from "@/gnr8/runtime/types";

function makeArtifact(): RuntimeArtifact {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    siteId: "site-1",
    siteVersionId: "22222222-2222-4222-8222-222222222222",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: {
      "/": "<!doctype html><html><body>ok</body></html>",
      "/about": "<!doctype html><html><body>about</body></html>",
    },
    compiledTokenStyles: ":root {}",
    assetFingerprintMap: {},
    manifest: {
      siteId: "site-1",
      siteVersionId: "22222222-2222-4222-8222-222222222222",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      paths: ["/", "/about"],
    },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["SHADOW_READY"],
      pageRolloutPolicyState: ["SHADOW_ONLY"],
      pageEnforcementState: {
        shadow: ["ALLOW"],
        canary: ["DENY"],
        production: ["DENY"],
      },
      siteGateState: "SITE_SHADOW_ONLY",
      siteRolloutPolicyState: "SITE_SHADOW_ONLY",
      siteEnforcementState: {
        shadow: "ALLOW",
        canary: "DENY",
        production: "DENY",
      },
      publishStage: "shadow",
    },
    bundleSha256: "abc123",
    createdAt: "2026-03-25T00:00:00.000Z",
  };
}

test("publish activation guard passes for valid candidate/artifact lineage", () => {
  const artifact = makeArtifact();
  const result = evaluatePublishActivationCandidate({
    candidateRef: "/tmp/shadow-bind-ready.json",
    candidateState: "READY_FOR_SHADOW_BIND",
    shadowEligibilityState: "ALLOWED",
    artifactId: artifact.id,
    siteVersionId: artifact.siteVersionId,
    expectedSiteId: artifact.siteId,
    expectedSiteVersionId: artifact.siteVersionId,
    expectedArtifactId: artifact.id,
    expectedRendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    expectedPublishStage: "shadow",
    artifact,
  });
  assert.deepEqual(result, { ok: true });
});

test("publish activation guard denies missing governance payload", () => {
  const artifact = makeArtifact();
  artifact.artifactGovernance.pageGateState = [];
  const result = evaluatePublishActivationCandidate({
    candidateRef: "/tmp/shadow-bind-ready.json",
    candidateState: "READY_FOR_SHADOW_BIND",
    shadowEligibilityState: "ALLOWED",
    artifactId: artifact.id,
    siteVersionId: artifact.siteVersionId,
    expectedSiteId: artifact.siteId,
    expectedSiteVersionId: artifact.siteVersionId,
    expectedArtifactId: artifact.id,
    expectedRendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    expectedPublishStage: "shadow",
    artifact,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "PUBLISH_GOVERNANCE_MISSING");
});

test("publish activation guard denies lineage mismatch", () => {
  const artifact = makeArtifact();
  const result = evaluatePublishActivationCandidate({
    candidateRef: "/tmp/shadow-bind-ready.json",
    candidateState: "READY_FOR_SHADOW_BIND",
    shadowEligibilityState: "ALLOWED",
    artifactId: artifact.id,
    siteVersionId: artifact.siteVersionId,
    expectedSiteId: artifact.siteId,
    expectedSiteVersionId: "different-site-version",
    expectedArtifactId: artifact.id,
    expectedRendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    expectedPublishStage: "shadow",
    artifact,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "PUBLISH_LINEAGE_MISMATCH");
});

test("pointer switch readiness returns explicit idempotent safe no-op", () => {
  const result = evaluatePointerSwitchReadiness({
    targetSiteVersionId: "sv_1",
    targetArtifactId: "a_1",
    activePointer: { siteVersionId: "sv_1", artifactId: "a_1" },
  });
  assert.equal(result.ok, true);
  if (!("code" in result)) return;
  assert.equal(result.code, "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP");
});
