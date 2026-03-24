import { buildDeterministicArtifactBundle } from "@/gnr8/runtime/artifact-builder";
import { evaluatePublishEnforcement } from "@/gnr8/runtime/publish-enforcement";
import { assertPublishSafety } from "@/gnr8/runtime/publish-safety-check";
import { runRenderIntegrityGate } from "@/gnr8/runtime/render-integrity-gate";
import {
  archivePublishedVersionsExcept,
  bindArtifactToVersion,
  createArtifact,
  getActivePointerForSite,
  getArtifactById,
  getSiteVersion,
  switchActivePointer,
} from "@/gnr8/runtime/runtime-store";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";

export async function publishApprovedSiteVersion(input: { siteVersionId: string; actor: string; stage?: "shadow" | "canary" | "production" }) {
  const siteVersion = await getSiteVersion(input.siteVersionId);
  if (!siteVersion) throw new Error("SiteVersion not found");
  if (siteVersion.state !== "APPROVED") {
    throw new Error(`SiteVersion must be APPROVED before publish (current: ${siteVersion.state})`);
  }
  const publishStage = input.stage ?? "production";

  const enforcement = evaluatePublishEnforcement({
    siteVersion,
    stage: publishStage,
  });
  if (enforcement.adapter.decision === "DENY") {
    throw new Error(`publish_enforcement_denied:${JSON.stringify(enforcement.adapter)}`);
  }
  if (enforcement.adapter.decision === "REVIEW_ONLY" && publishStage !== "shadow") {
    throw new Error(`publish_enforcement_review_only_shadow_required:${JSON.stringify(enforcement.adapter)}`);
  }

  const artifactBundle = buildDeterministicArtifactBundle({
    siteVersion,
    renderMode: "PUBLISH",
  });

  const integrity = runRenderIntegrityGate({
    siteVersion,
    htmlByPath: artifactBundle.htmlByPath,
    assetFingerprintMap: artifactBundle.assetFingerprintMap,
  });

  if (!integrity.ok) {
    const msg = integrity.issues.map((issue) => `${issue.code}:${issue.message}`).join("; ");
    throw new Error(`render-integrity-gate failed: ${msg}`);
  }

  const artifact = await createArtifact({
    siteId: artifactBundle.siteId,
    siteVersionId: artifactBundle.siteVersionId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    bundleSha256: artifactBundle.bundleSha256,
    htmlByPath: artifactBundle.htmlByPath,
    compiledTokenStyles: artifactBundle.compiledTokenStyles,
    assetFingerprintMap: artifactBundle.assetFingerprintMap,
    manifest: {
      ...artifactBundle.manifest,
      publishStage,
      shadowRestricted: enforcement.shadowRestricted,
      enforcementDecision: enforcement.adapter.decision,
    },
    publishStage,
    shadowRestricted: enforcement.shadowRestricted,
    artifactGovernance: enforcement.artifactGovernance,
  });

  await bindArtifactToVersion({
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
  });

  await switchActivePointer({
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
  });

  const storedArtifact = await getArtifactById(artifact.artifactId);
  const activePointer = await getActivePointerForSite(siteVersion.siteId);

  assertPublishSafety({
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    artifact: storedArtifact,
    activePointer,
  });

  await transitionSiteVersionState({
    siteVersionId: siteVersion.id,
    nextState: "PUBLISHED",
    actor: input.actor,
    source: "manual",
    details: {
      artifactId: artifact.artifactId,
      bundleSha256: artifactBundle.bundleSha256,
    },
  });

  await archivePublishedVersionsExcept({
    siteId: siteVersion.siteId,
    keepSiteVersionId: siteVersion.id,
    actor: input.actor,
  });

  return {
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    publishStage,
    shadowRestricted: enforcement.shadowRestricted,
    enforcement: enforcement.adapter,
    bundleSha256: artifactBundle.bundleSha256,
    pointerSwitch: "atomic_site_pointer_reassignment",
  };
}
