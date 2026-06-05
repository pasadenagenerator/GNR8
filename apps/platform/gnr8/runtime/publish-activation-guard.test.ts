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

test("publish activation guard passes for Maver-like imported artifact when production lineage is complete", () => {
  const artifact = makeArtifact();
  artifact.id = "63556056-8c1a-4629-abb7-4e73accc48d0";
  artifact.siteId = "site_7c77126de646f746b3bd";
  artifact.siteVersionId = "88253466-783e-4484-8b68-df6c83b8a11c";
  artifact.publishStage = "production";
  artifact.artifactGovernance.publishStage = "production";
  artifact.artifactGovernance.pageEnforcementState.production = ["ALLOW"];
  artifact.artifactGovernance.siteEnforcementState.production = "ALLOW";
  artifact.manifest = {
    ...artifact.manifest,
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    publishStage: "production",
  };

  const result = evaluatePublishActivationCandidate({
    candidateRef: `runtime-site-version:${artifact.siteVersionId}`,
    candidateState: "READY_FOR_SHADOW_BIND",
    shadowEligibilityState: "ALLOWED",
    artifactId: artifact.id,
    siteVersionId: artifact.siteVersionId,
    expectedSiteId: artifact.siteId,
    expectedSiteVersionId: artifact.siteVersionId,
    expectedArtifactId: artifact.id,
    expectedRendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    expectedPublishStage: "production",
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

test("publish activation guard reports the actual mismatched lineage field", () => {
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
    expectedPublishStage: "production",
    artifact,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "PUBLISH_LINEAGE_MISMATCH");
  assert.deepEqual(result.details?.mismatchFields, ["artifactPublishStage", "artifactGovernancePublishStage"]);
  assert.match(JSON.stringify(result.details?.lineageDetails), /artifactPublishStage/);
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
