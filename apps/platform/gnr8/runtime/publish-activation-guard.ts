import type { PublishStage, RuntimeArtifact } from "@/gnr8/runtime/types";

export type PublishActivationFailureCode =
  | "PUBLISH_CANDIDATE_REF_MISSING"
  | "PUBLISH_ARTIFACT_READ_FAILED"
  | "PUBLISH_ARTIFACT_PAYLOAD_INVALID"
  | "PUBLISH_GOVERNANCE_MISSING"
  | "PUBLISH_LINEAGE_MISMATCH"
  | "PUBLISH_ROOT_PATH_MISSING"
  | "PUBLISH_ENFORCEMENT_DENIED"
  | "PUBLISH_POINTER_SWITCH_FAILED";

export type PublishActivationSafeNoopCode = "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP";

export type PublishActivationOutcome =
  | { ok: true }
  | {
      ok: false;
      code: PublishActivationFailureCode;
      message: string;
      details?: Record<string, unknown>;
    };

export type PublishActivationNoopOutcome = {
  ok: true;
  code: PublishActivationSafeNoopCode;
  message: string;
};

function readManifestString(input: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!input) return null;
  const value = input[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readManifestPaths(input: Record<string, unknown> | null | undefined): string[] {
  if (!input) return [];
  const paths = input["paths"];
  if (!Array.isArray(paths)) return [];
  return paths.filter((value): value is string => typeof value === "string");
}

function hasNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasRequiredGovernance(governance: RuntimeArtifact["artifactGovernance"] | null | undefined): boolean {
  if (!governance) return false;

  return (
    hasNonEmptyStringArray(governance.pageGateState) &&
    hasNonEmptyStringArray(governance.pageRolloutPolicyState) &&
    hasNonEmptyStringArray(governance.pageEnforcementState.shadow) &&
    hasNonEmptyStringArray(governance.pageEnforcementState.canary) &&
    hasNonEmptyStringArray(governance.pageEnforcementState.production) &&
    hasNonEmptyString(governance.siteGateState) &&
    hasNonEmptyString(governance.siteRolloutPolicyState) &&
    hasNonEmptyString(governance.siteEnforcementState.shadow) &&
    hasNonEmptyString(governance.siteEnforcementState.canary) &&
    hasNonEmptyString(governance.siteEnforcementState.production) &&
    (governance.publishStage === "shadow" || governance.publishStage === "canary" || governance.publishStage === "production")
  );
}

export function evaluatePublishActivationCandidate(input: {
  candidateRef: string | null | undefined;
  candidateState: string | null | undefined;
  shadowEligibilityState: string | null | undefined;
  artifactId: string | null | undefined;
  siteVersionId: string | null | undefined;
  expectedSiteId: string;
  expectedSiteVersionId: string;
  expectedArtifactId: string;
  expectedRendererCompatibilityVersion: string;
  expectedPublishStage: PublishStage;
  artifact: RuntimeArtifact | null;
}): PublishActivationOutcome {
  if (!input.candidateRef || input.candidateRef.trim().length === 0) {
    return {
      ok: false,
      code: "PUBLISH_CANDIDATE_REF_MISSING",
      message: "Publish activation candidate reference is missing.",
    };
  }

  if (!input.artifact) {
    return {
      ok: false,
      code: "PUBLISH_ARTIFACT_READ_FAILED",
      message: "Publish artifact could not be loaded for activation.",
      details: { artifactId: input.expectedArtifactId, candidateRef: input.candidateRef },
    };
  }

  if (
    !input.artifactId ||
    !input.siteVersionId ||
    input.artifactId.trim().length === 0 ||
    input.siteVersionId.trim().length === 0 ||
    !input.candidateState ||
    input.candidateState.trim().length === 0
  ) {
    return {
      ok: false,
      code: "PUBLISH_ARTIFACT_PAYLOAD_INVALID",
      message: "Publish candidate payload is missing required activation fields.",
      details: {
        artifactIdPresent: Boolean(input.artifactId),
        siteVersionIdPresent: Boolean(input.siteVersionId),
        candidateStatePresent: Boolean(input.candidateState),
      },
    };
  }

  if (input.candidateState !== "READY_FOR_SHADOW_BIND" || input.shadowEligibilityState !== "ALLOWED") {
    return {
      ok: false,
      code: "PUBLISH_ENFORCEMENT_DENIED",
      message: "Publish candidate is not eligible for activation.",
      details: {
        candidateState: input.candidateState,
        shadowEligibilityState: input.shadowEligibilityState,
      },
    };
  }

  const artifact = input.artifact;
  const rootHtml = String(artifact.htmlByPath["/"] ?? "").trim();
  const manifestSiteId = readManifestString(artifact.manifest, "siteId");
  const manifestSiteVersionId = readManifestString(artifact.manifest, "siteVersionId");
  const manifestRendererCompatibilityVersion = readManifestString(artifact.manifest, "rendererCompatibilityVersion");
  const manifestPaths = readManifestPaths(artifact.manifest);
  const rootListedInManifest = manifestPaths.includes("/");

  if (!rootHtml || !rootListedInManifest) {
    return {
      ok: false,
      code: "PUBLISH_ROOT_PATH_MISSING",
      message: "Publish artifact does not expose root path integrity for activation.",
      details: {
        rootHtmlPresent: rootHtml.length > 0,
        manifestHasRootPath: rootListedInManifest,
      },
    };
  }

  if (!hasRequiredGovernance(artifact.artifactGovernance)) {
    return {
      ok: false,
      code: "PUBLISH_GOVERNANCE_MISSING",
      message: "Publish artifact governance is missing or empty.",
      details: {
        pagesWithMigrationGovernance: Array.isArray(artifact.artifactGovernance?.pageGateState)
          ? artifact.artifactGovernance.pageGateState.length
          : 0,
      },
    };
  }

  const lineageMatches =
    input.artifactId === input.expectedArtifactId &&
    input.siteVersionId === input.expectedSiteVersionId &&
    artifact.id === input.expectedArtifactId &&
    artifact.siteId === input.expectedSiteId &&
    artifact.siteVersionId === input.expectedSiteVersionId &&
    artifact.rendererCompatibilityVersion === input.expectedRendererCompatibilityVersion &&
    artifact.publishStage === input.expectedPublishStage &&
    artifact.artifactGovernance.publishStage === input.expectedPublishStage &&
    manifestSiteId === input.expectedSiteId &&
    manifestSiteVersionId === input.expectedSiteVersionId &&
    manifestRendererCompatibilityVersion === input.expectedRendererCompatibilityVersion;

  if (!lineageMatches) {
    return {
      ok: false,
      code: "PUBLISH_LINEAGE_MISMATCH",
      message: "Publish candidate lineage does not match siteVersion/artifact identity.",
      details: {
        candidateArtifactId: input.artifactId,
        expectedArtifactId: input.expectedArtifactId,
        candidateSiteVersionId: input.siteVersionId,
        expectedSiteVersionId: input.expectedSiteVersionId,
        artifactSiteVersionId: artifact.siteVersionId,
      },
    };
  }

  return { ok: true };
}

export function evaluatePointerSwitchReadiness(input: {
  targetSiteVersionId: string;
  targetArtifactId: string;
  activePointer: { siteVersionId: string; artifactId: string } | null;
}): PublishActivationOutcome | PublishActivationNoopOutcome {
  if (
    input.activePointer &&
    input.activePointer.siteVersionId === input.targetSiteVersionId &&
    input.activePointer.artifactId === input.targetArtifactId
  ) {
    return {
      ok: true,
      code: "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
      message: "Publish target is already active; pointer switch is a safe no-op.",
    };
  }

  return { ok: true };
}
