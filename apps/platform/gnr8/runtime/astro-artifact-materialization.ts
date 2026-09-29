import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import type { RuntimeArtifact } from "@/gnr8/runtime/types";

export const ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION =
  "gnr8-astro-runtime-artifact-materialization:v1" as const;

export type AstroRuntimeArtifactPromotionEvidence = {
  version: typeof ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION;
  candidateId: string;
  candidateContentSha256: string;
  candidateStorageSha256: string;
  sourceSnapshotSha256: string;
  exportSha256: string;
  convertedArtifactSha256: string;
  promotionIdentitySha256: string;
  actorUserId: string;
  idempotencyKey: string;
  htmlTransformation: "none";
  governanceEvaluation: {
    status: "evaluated" | "blocked";
    decision: string | null;
    blockerCodes: string[];
  };
};

export type AstroRuntimeArtifactBundle = Pick<
  RuntimeArtifact,
  | "siteId"
  | "siteVersionId"
  | "rendererCompatibilityVersion"
  | "htmlByPath"
  | "compiledTokenStyles"
  | "assetFingerprintMap"
  | "manifest"
  | "bundleSha256"
>;

export function computeRuntimeArtifactBundleSha256(input: {
  htmlByPath: Record<string, string>;
  compiledTokenStyles: string;
  assetFingerprintMap: Record<string, string>;
  manifest: Record<string, unknown>;
}): string {
  return sha256Hex(stableStringify(input));
}

export function readAstroRuntimeArtifactPromotionEvidence(
  manifest: Record<string, unknown> | null | undefined,
): AstroRuntimeArtifactPromotionEvidence | null {
  const value = manifest?.astroCandidatePromotion;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const evidence = value as Partial<AstroRuntimeArtifactPromotionEvidence>;
  if (
    evidence.version !== ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION ||
    typeof evidence.candidateId !== "string" ||
    typeof evidence.candidateContentSha256 !== "string" ||
    typeof evidence.candidateStorageSha256 !== "string" ||
    evidence.htmlTransformation !== "none"
  ) {
    return null;
  }
  return evidence as AstroRuntimeArtifactPromotionEvidence;
}

export function buildPreservedAstroArtifactBundleForPublish(input: {
  artifact: RuntimeArtifact;
  publishStage: RuntimeArtifact["publishStage"];
  shadowRestricted: boolean;
  enforcementDecision: string;
}): AstroRuntimeArtifactBundle | null {
  if (!readAstroRuntimeArtifactPromotionEvidence(input.artifact.manifest)) return null;
  const manifest = {
    ...input.artifact.manifest,
    publishStage: input.publishStage,
    shadowRestricted: input.shadowRestricted,
    enforcementDecision: input.enforcementDecision,
  };
  return {
    siteId: input.artifact.siteId,
    siteVersionId: input.artifact.siteVersionId,
    rendererCompatibilityVersion: input.artifact.rendererCompatibilityVersion,
    htmlByPath: structuredClone(input.artifact.htmlByPath),
    compiledTokenStyles: input.artifact.compiledTokenStyles,
    assetFingerprintMap: structuredClone(input.artifact.assetFingerprintMap),
    manifest,
    bundleSha256: computeRuntimeArtifactBundleSha256({
      htmlByPath: input.artifact.htmlByPath,
      compiledTokenStyles: input.artifact.compiledTokenStyles,
      assetFingerprintMap: input.artifact.assetFingerprintMap,
      manifest,
    }),
  };
}
