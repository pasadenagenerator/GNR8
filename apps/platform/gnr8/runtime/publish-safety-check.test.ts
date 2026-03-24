import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePublishSafety } from "@/gnr8/runtime/publish-safety-check";
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
    publishStage: "production",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["PRODUCTION_CANDIDATE"],
      pageRolloutPolicyState: ["CANARY_ALLOWED"],
      pageEnforcementState: {
        shadow: ["ALLOW"],
        canary: ["ALLOW"],
        production: ["ALLOW"],
      },
      siteGateState: "SITE_PRODUCTION_READY",
      siteRolloutPolicyState: "SITE_CANARY_ALLOWED",
      siteEnforcementState: {
        shadow: "ALLOW",
        canary: "ALLOW",
        production: "ALLOW",
      },
      publishStage: "production",
    },
    bundleSha256: "abc123",
    createdAt: "2026-03-23T00:00:00.000Z",
  };
}

test("evaluatePublishSafety passes for consistent artifact and pointer", () => {
  const artifact = makeArtifact();
  const result = evaluatePublishSafety({
    siteId: "site-1",
    siteVersionId: "22222222-2222-4222-8222-222222222222",
    artifactId: artifact.id,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifact,
    activePointer: {
      siteVersionId: "22222222-2222-4222-8222-222222222222",
      artifactId: artifact.id,
    },
  });

  assert.deepEqual(result, { ok: true });
});

test("evaluatePublishSafety reports root path and manifest/pointer consistency issues", () => {
  const artifact = makeArtifact();
  artifact.htmlByPath = { "/about": "<html>about</html>" };
  artifact.manifest = {
    siteId: "wrong-site",
    siteVersionId: "wrong-version",
    rendererCompatibilityVersion: "wrong-renderer",
    paths: ["/about"],
  };

  const result = evaluatePublishSafety({
    siteId: "site-1",
    siteVersionId: "22222222-2222-4222-8222-222222222222",
    artifactId: artifact.id,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifact,
    activePointer: {
      siteVersionId: "different-version",
      artifactId: "different-artifact",
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  const codes = new Set(result.issues.map((issue) => issue.code));
  assert.equal(codes.has("ROOT_PATH_MISSING"), true);
  assert.equal(codes.has("MANIFEST_INCONSISTENT"), true);
  assert.equal(codes.has("ACTIVE_POINTER_MISMATCH"), true);
});
