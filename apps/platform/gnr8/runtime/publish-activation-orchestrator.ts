import { buildDeterministicArtifactBundle } from "@/gnr8/runtime/artifact-builder";
import {
  evaluatePointerSwitchReadiness,
  evaluatePublishActivationCandidate,
  type PublishActivationFailureCode,
} from "@/gnr8/runtime/publish-activation-guard";
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

function throwPublishActivationFailure(code: PublishActivationFailureCode, message: string, details?: Record<string, unknown>): never {
  throw new Error(`${code}:${JSON.stringify({ message, details: details ?? {} })}`);
}

export async function publishApprovedSiteVersion(input: { siteVersionId: string; actor: string; stage?: "shadow" | "canary" | "production" }) {
  const siteVersion = await getSiteVersion(input.siteVersionId);
  if (!siteVersion) throw new Error("SiteVersion not found");
  if (siteVersion.state !== "APPROVED" && siteVersion.state !== "PUBLISHED") {
    throw new Error(`SiteVersion must be APPROVED before publish (current: ${siteVersion.state})`);
  }
  const publishStage = input.stage ?? "production";

  if (siteVersion.state === "PUBLISHED") {
    if (!siteVersion.artifactId) {
      throwPublishActivationFailure("PUBLISH_ARTIFACT_PAYLOAD_INVALID", "Published siteVersion is missing artifact binding.", {
        siteVersionId: siteVersion.id,
      });
    }

    const storedArtifact = await getArtifactById(siteVersion.artifactId);
    const resolvedPublishStage = input.stage ?? storedArtifact?.publishStage ?? "production";
    const candidateValidation = evaluatePublishActivationCandidate({
      candidateRef: `runtime-site-version:${siteVersion.id}`,
      candidateState: "READY_FOR_SHADOW_BIND",
      shadowEligibilityState: "ALLOWED",
      artifactId: siteVersion.artifactId,
      siteVersionId: siteVersion.id,
      expectedSiteId: siteVersion.siteId,
      expectedSiteVersionId: siteVersion.id,
      expectedArtifactId: siteVersion.artifactId,
      expectedRendererCompatibilityVersion: siteVersion.rendererCompatibilityVersion,
      expectedPublishStage: resolvedPublishStage,
      artifact: storedArtifact,
    });
    if (!candidateValidation.ok) {
      throwPublishActivationFailure(candidateValidation.code, candidateValidation.message, candidateValidation.details);
    }
    if (!storedArtifact) {
      throwPublishActivationFailure("PUBLISH_ARTIFACT_READ_FAILED", "Publish artifact could not be loaded for activation.", {
        artifactId: siteVersion.artifactId,
      });
    }

    const activePointer = await getActivePointerForSite(siteVersion.siteId);
    const pointerReadiness = evaluatePointerSwitchReadiness({
      targetSiteVersionId: siteVersion.id,
      targetArtifactId: siteVersion.artifactId,
      activePointer,
    });
    if (pointerReadiness.ok && "code" in pointerReadiness) {
      return {
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        artifactId: siteVersion.artifactId,
        publishStage: resolvedPublishStage,
        shadowRestricted: storedArtifact.shadowRestricted,
        bundleSha256: storedArtifact.bundleSha256,
        pointerSwitch: "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
        previousActivePointer: activePointer,
        activationOutcome: pointerReadiness.code,
      };
    }

    let pointerSwitchResult: { switched: boolean; previousActivePointer: { siteVersionId: string; artifactId: string } | null };
    try {
      pointerSwitchResult = await switchActivePointer({
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        artifactId: siteVersion.artifactId,
      });
    } catch (error) {
      throwPublishActivationFailure("PUBLISH_POINTER_SWITCH_FAILED", "active pointer switch failed", {
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        artifactId: siteVersion.artifactId,
        error: String((error as Error)?.message ?? error),
      });
    }

    return {
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      artifactId: siteVersion.artifactId,
      publishStage: resolvedPublishStage,
      shadowRestricted: storedArtifact.shadowRestricted,
      bundleSha256: storedArtifact.bundleSha256,
      pointerSwitch: pointerSwitchResult.switched ? "atomic_site_pointer_reassignment" : "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
      previousActivePointer: pointerSwitchResult.previousActivePointer,
      activationOutcome: "already_published_pointer_reconciled",
    };
  }

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

  const storedArtifact = await getArtifactById(artifact.artifactId);
  const activePointer = await getActivePointerForSite(siteVersion.siteId);
  const candidateValidation = evaluatePublishActivationCandidate({
    candidateRef: `runtime-site-version:${siteVersion.id}`,
    candidateState: "READY_FOR_SHADOW_BIND",
    shadowEligibilityState: "ALLOWED",
    artifactId: artifact.artifactId,
    siteVersionId: siteVersion.id,
    expectedSiteId: siteVersion.siteId,
    expectedSiteVersionId: siteVersion.id,
    expectedArtifactId: artifact.artifactId,
    expectedRendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    expectedPublishStage: publishStage,
    artifact: storedArtifact,
  });
  if (!candidateValidation.ok) {
    throwPublishActivationFailure(candidateValidation.code, candidateValidation.message, candidateValidation.details);
  }

  const pointerReadiness = evaluatePointerSwitchReadiness({
    targetSiteVersionId: siteVersion.id,
    targetArtifactId: artifact.artifactId,
    activePointer,
  });
  const pointerOutcome =
    pointerReadiness.ok && "code" in pointerReadiness ? pointerReadiness.code : "atomic_site_pointer_reassignment";

  let pointerSwitchResult: { switched: boolean; previousActivePointer: { siteVersionId: string; artifactId: string } | null };
  try {
    pointerSwitchResult = await switchActivePointer({
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      artifactId: artifact.artifactId,
    });
  } catch (error) {
    throwPublishActivationFailure("PUBLISH_POINTER_SWITCH_FAILED", "active pointer switch failed", {
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      artifactId: artifact.artifactId,
      error: String((error as Error)?.message ?? error),
    });
  }

  const activePointerAfterSwitch = await getActivePointerForSite(siteVersion.siteId);
  assertPublishSafety({
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    artifact: storedArtifact,
    activePointer: activePointerAfterSwitch,
  });

  await transitionSiteVersionState({
    siteVersionId: siteVersion.id,
    nextState: "PUBLISHED",
    actor: input.actor,
    source: "manual",
    details: {
      artifactId: artifact.artifactId,
      bundleSha256: artifactBundle.bundleSha256,
      previousActivePointer: pointerSwitchResult.previousActivePointer,
      pointerOutcome,
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
    pointerSwitch: pointerSwitchResult.switched ? "atomic_site_pointer_reassignment" : "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
    previousActivePointer: pointerSwitchResult.previousActivePointer,
    activationOutcome: pointerOutcome,
  };
}
