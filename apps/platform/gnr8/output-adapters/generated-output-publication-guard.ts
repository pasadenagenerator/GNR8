import "server-only";

import {
  ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
  computeRuntimeArtifactBundleSha256,
  readAstroRuntimeArtifactPromotionEvidence,
} from "@/gnr8/runtime/astro-artifact-materialization";
import type { CanonicalSiteVersionSnapshot, PublishStage, RuntimeArtifact } from "@/gnr8/runtime/types";

import {
  ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID,
  ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND,
  ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
} from "./astro-production-candidate-record";
import { ASTRO_STATIC_EXPORT_MANIFEST_VERSION } from "./astro-static-site-build-export-proof";
import {
  GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION,
  type GeneratedOutputPublicationDecision,
} from "./generated-output-eligibility";
import {
  ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
  ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
} from "./astro-static-site-internal-preview-bridge";

export type GeneratedOutputProvenanceClassification =
  | { kind: "source_migration" }
  | {
      kind: "supported_generated_output";
      candidateId: string;
      candidateContentSha256: string;
      candidateStorageSha256: string;
    }
  | { kind: "unknown_or_mixed_provenance"; blockerCodes: string[] };

export type GeneratedOutputPublicationDecisionResolver = (input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  publishStage: PublishStage;
  provenance: Extract<GeneratedOutputProvenanceClassification, { kind: "supported_generated_output" }>;
}) => Promise<GeneratedOutputPublicationDecision>;

export class GeneratedOutputPublicationBlockedError extends Error {
  readonly code = "generated_output_publication_blocked";
  readonly blockerCodes: string[];

  constructor(message: string, blockerCodes: string[]) {
    super(message);
    this.name = "GeneratedOutputPublicationBlockedError";
    this.blockerCodes = [...new Set(blockerCodes)].sort();
  }
}

export function classifyGeneratedOutputProvenance(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact | null;
}): GeneratedOutputProvenanceClassification {
  const siteProvenance = record(input.siteVersion.importProvenanceSummary);
  const generatedSiteMarker = Boolean(siteProvenance &&
    ("generatedAstroEvaluation" in siteProvenance || siteProvenance.kind === "astro_generated_content_successor_v1"));
  const artifact = input.artifact;
  if (!artifact) {
    return generatedSiteMarker
      ? { kind: "unknown_or_mixed_provenance", blockerCodes: ["generated_artifact_missing"] }
      : { kind: "source_migration" };
  }

  const hasAstroMarkers = [
    "astroCandidateManifest",
    "astroCandidateRecord",
    "astroCandidatePromotion",
  ].some((key) => key in artifact.manifest) || artifact.manifest.artifactSource === "astro_candidate_materialization";
  if (!hasAstroMarkers && !generatedSiteMarker) return { kind: "source_migration" };

  const blockers: string[] = [];
  const promotion = readAstroRuntimeArtifactPromotionEvidence(artifact.manifest);
  const candidateManifest = record(artifact.manifest.astroCandidateManifest);
  const candidateRecord = record(artifact.manifest.astroCandidateRecord);
  const identity = record(candidateRecord?.identity);
  const registration = record(candidateRecord?.registration);
  const provenance = record(candidateManifest?.provenance);
  const ownership = record(candidateManifest?.ownership);
  const assetHandling = record(candidateManifest?.assetHandling);

  if (!promotion || promotion.version !== ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION) {
    blockers.push("generated_promotion_provenance_invalid");
  }
  if (
    artifact.manifest.artifactSource !== "astro_candidate_materialization" ||
    candidateRecord?.schemaVersion !== ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION ||
    candidateRecord?.recordKind !== ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND ||
    candidateManifest?.adapterId !== ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID ||
    candidateManifest?.conversionVersion !== ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION ||
    provenance?.exportManifestVersion !== ASTRO_STATIC_EXPORT_MANIFEST_VERSION ||
    assetHandling?.mode !== ASTRO_INTERNAL_PREVIEW_ASSET_MODE
  ) {
    blockers.push("generated_adapter_version_unsupported");
  }
  if (
    !promotion ||
    identity?.candidateId !== promotion.candidateId ||
    identity?.runtimeSiteId !== artifact.siteId ||
    identity?.siteVersionId !== artifact.siteVersionId ||
    ownership?.siteId !== artifact.siteId ||
    ownership?.siteVersionId !== artifact.siteVersionId ||
    candidateRecord?.storageSha256 !== promotion.candidateStorageSha256 ||
    provenance?.sourceSnapshotSha256 !== promotion.sourceSnapshotSha256 ||
    provenance?.exportSha256 !== promotion.exportSha256 ||
    provenance?.convertedArtifactSha256 !== promotion.candidateContentSha256 ||
    promotion.convertedArtifactSha256 !== promotion.candidateContentSha256 ||
    promotion.htmlTransformation !== "none" ||
    typeof registration?.producerKind !== "string" ||
    typeof registration?.producerVersion !== "string"
  ) {
    blockers.push("generated_provenance_lineage_invalid");
  }
  if (computeArtifactBundleSha256(artifact) !== artifact.bundleSha256) {
    blockers.push("generated_artifact_bundle_hash_mismatch");
  }
  if (blockers.length > 0 || !promotion) {
    return { kind: "unknown_or_mixed_provenance", blockerCodes: [...new Set(blockers)].sort() };
  }
  return {
    kind: "supported_generated_output",
    candidateId: promotion.candidateId,
    candidateContentSha256: promotion.candidateContentSha256,
    candidateStorageSha256: promotion.candidateStorageSha256,
  };
}

export async function enforceGeneratedOutputPublicationEligibility(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact | null;
  publishStage: PublishStage;
  resolver?: GeneratedOutputPublicationDecisionResolver;
}): Promise<GeneratedOutputPublicationDecision | null> {
  const provenance = classifyGeneratedOutputProvenance(input);
  if (provenance.kind === "source_migration") return null;
  if (provenance.kind === "unknown_or_mixed_provenance") {
    throw new GeneratedOutputPublicationBlockedError(
      "Generated-output provenance is unknown, mixed, or incomplete.",
      provenance.blockerCodes,
    );
  }
  if (!input.artifact) {
    throw new GeneratedOutputPublicationBlockedError("Generated runtime artifact is missing.", ["generated_artifact_missing"]);
  }
  if (!input.resolver) {
    throw new GeneratedOutputPublicationBlockedError(
      "Generated-output eligibility evidence resolver is unavailable.",
      ["generated_output_eligibility_evidence_unavailable"],
    );
  }

  let decision: GeneratedOutputPublicationDecision;
  try {
    decision = await input.resolver({
      siteVersion: input.siteVersion,
      artifact: input.artifact,
      publishStage: input.publishStage,
      provenance,
    });
  } catch {
    throw new GeneratedOutputPublicationBlockedError(
      "Generated-output eligibility evidence could not be resolved.",
      ["generated_output_eligibility_evidence_read_failed"],
    );
  }
  const bindingBlockers = generatedDecisionBindingBlockers({
    decision,
    artifact: input.artifact,
    publishStage: input.publishStage,
    provenance,
  });
  const blockers = [...decision.blockerReasons.map((item) => item.code), ...bindingBlockers];
  if (
    decision.policyVersion !== GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION ||
    decision.technical.status !== "PASS" ||
    decision.review.status !== "APPROVED" ||
    decision.activation !== "READY_FOR_TARGET_READINESS" ||
    blockers.length > 0
  ) {
    throw new GeneratedOutputPublicationBlockedError(
      "Generated output is not eligible to continue to target-readiness and activation checks.",
      blockers.length > 0 ? blockers : ["generated_output_publication_not_eligible"],
    );
  }
  return structuredClone(decision);
}

export function assertGeneratedOutputDecisionStillBound(input: {
  decision: GeneratedOutputPublicationDecision | null;
  artifact: RuntimeArtifact;
}): void {
  if (!input.decision) return;
  const blockers: string[] = [];
  if (input.decision.technical.artifactId !== input.artifact.id) blockers.push("generated_output_artifact_changed");
  if (input.decision.technical.artifactBundleSha256 !== input.artifact.bundleSha256) blockers.push("generated_output_content_changed");
  if (computeArtifactBundleSha256(input.artifact) !== input.artifact.bundleSha256) {
    blockers.push("generated_output_artifact_bundle_hash_mismatch");
  }
  if (blockers.length > 0) {
    throw new GeneratedOutputPublicationBlockedError(
      "Generated output changed after eligibility/review evaluation.",
      blockers,
    );
  }
}

function generatedDecisionBindingBlockers(input: {
  decision: GeneratedOutputPublicationDecision;
  artifact: RuntimeArtifact;
  publishStage: PublishStage;
  provenance: Extract<GeneratedOutputProvenanceClassification, { kind: "supported_generated_output" }>;
}): string[] {
  const blockers: string[] = [];
  if (input.decision.technical.artifactId !== input.artifact.id) blockers.push("generated_output_artifact_mismatch");
  if (input.decision.technical.artifactBundleSha256 !== input.artifact.bundleSha256) blockers.push("generated_output_bundle_mismatch");
  if (input.decision.technical.candidateId !== input.provenance.candidateId) blockers.push("generated_output_candidate_mismatch");
  if (input.decision.technical.candidateContentSha256 !== input.provenance.candidateContentSha256) {
    blockers.push("generated_output_candidate_content_mismatch");
  }
  if (input.artifact.publishStage !== input.publishStage) {
    blockers.push("generated_output_artifact_stage_mismatch");
  }
  if (!input.decision.technical.scope.allowedPublishStages.includes(input.publishStage)) {
    blockers.push("generated_output_publish_stage_unsupported");
  }
  return blockers;
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function computeArtifactBundleSha256(artifact: RuntimeArtifact): string {
  return computeRuntimeArtifactBundleSha256({
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
  });
}
