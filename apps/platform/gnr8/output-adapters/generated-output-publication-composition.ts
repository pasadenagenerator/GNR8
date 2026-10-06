import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import { SupabaseAstroCandidateRuntimeArtifactStore } from "./astro-candidate-runtime-artifact-store";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import { GatewayBackedAstroProductionCandidateRepository } from "./astro-production-candidate-repository";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import { AstroProductionCandidatePreviewConfigurationError } from "./astro-production-candidate-preview-feature-gate";
import {
  readGeneratedOutputBuildEvidence,
  readGeneratedOutputContentManifest,
} from "./generated-output-evidence";
import {
  createGeneratedOutputReviewRecord,
  evaluateGeneratedOutputPublicationDecision,
  evaluateGeneratedOutputTechnicalEligibility,
  validateGeneratedOutputReviewRecord,
  type GeneratedOutputBuildEvidence,
  type GeneratedOutputPublicationDecision,
  type GeneratedOutputReviewRecord,
} from "./generated-output-eligibility";
import {
  classifyGeneratedOutputProvenance,
  type GeneratedOutputPublicationDecisionResolver,
} from "./generated-output-publication-guard";

type AuditRow = {
  actor: string;
  details: Record<string, unknown> | null;
  timestamp: string;
  from_state: string | null;
  to_state: string;
};

type Composition = {
  client: SupabaseClient;
  runtimeStore: SupabaseAstroCandidateRuntimeArtifactStore;
  ownershipResolver: SupabaseAstroCandidateOwnershipResolver;
  candidateRepository: GatewayBackedAstroProductionCandidateRepository;
};

export type GeneratedOutputReviewModel = {
  siteVersionId: string;
  state: string;
  artifactId: string;
  artifactBundleSha256: string;
  candidateId: string;
  candidateContentSha256: string;
  candidateStorageSha256: string;
  sourceCapture: GeneratedOutputBuildEvidence["sourceCapture"];
  adapterId: GeneratedOutputBuildEvidence["adapterId"];
  producer: string;
  outputPaths: string[];
  requiredAssetCount: number;
  unsupportedCapabilities: string[];
  buildEvidenceSha256: string;
  contentManifestSha256: string;
  decision: GeneratedOutputPublicationDecision;
};

function createComposition(): Composition {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new AstroProductionCandidatePreviewConfigurationError();
  const candidateClient = client as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
  return {
    client,
    runtimeStore: new SupabaseAstroCandidateRuntimeArtifactStore(client),
    ownershipResolver: new SupabaseAstroCandidateOwnershipResolver(() => candidateClient),
    candidateRepository: new GatewayBackedAstroProductionCandidateRepository({
      gateway: new SupabaseAstroProductionCandidateGateway(() => candidateClient),
    }),
  };
}

export function createGeneratedOutputPublicationDecisionResolver(): GeneratedOutputPublicationDecisionResolver {
  const composition = createComposition();
  return async (input) => resolveDecision(composition, input);
}

export async function readGeneratedOutputReviewModel(siteVersionId: string): Promise<GeneratedOutputReviewModel> {
  const composition = createComposition();
  const context = await composition.runtimeStore.readContext(siteVersionId);
  if (!context?.artifact) throw new Error("generated_output_review_target_missing");
  const provenance = classifyGeneratedOutputProvenance({ siteVersion: context.siteVersion, artifact: context.artifact });
  if (provenance.kind !== "supported_generated_output") {
    throw new Error("generated_output_review_target_unsupported");
  }
  const decision = await resolveDecision(composition, {
    siteVersion: context.siteVersion,
    artifact: context.artifact,
    publishStage: context.artifact.publishStage,
    provenance,
  });
  const buildEvidence = readGeneratedOutputBuildEvidence(context.artifact.manifest);
  const contentManifest = readGeneratedOutputContentManifest(context.artifact.manifest);
  if (!buildEvidence || !contentManifest) throw new Error("generated_output_review_evidence_missing");
  return {
    siteVersionId,
    state: context.siteVersion.state,
    artifactId: context.artifact.id,
    artifactBundleSha256: context.artifact.bundleSha256,
    candidateId: provenance.candidateId,
    candidateContentSha256: provenance.candidateContentSha256,
    candidateStorageSha256: provenance.candidateStorageSha256,
    sourceCapture: structuredClone(buildEvidence.sourceCapture),
    adapterId: buildEvidence.adapterId,
    producer: `${buildEvidence.producerKind}:${buildEvidence.producerVersion}`,
    outputPaths: [...contentManifest.scope.outputPaths],
    requiredAssetCount: contentManifest.requiredAssets.length,
    unsupportedCapabilities: [...contentManifest.scope.unsupportedCapabilities],
    buildEvidenceSha256: buildEvidence.evidenceSha256,
    contentManifestSha256: contentManifest.manifestSha256,
    decision,
  };
}

export async function approveGeneratedOutputReview(input: {
  siteVersionId: string;
  reviewerActorId: string;
  expectedArtifactId: string;
  expectedArtifactBundleSha256: string;
  expectedCandidateId: string;
  expectedCandidateContentSha256: string;
  expectedContentManifestSha256: string;
  expectedTechnicalEvaluationSha256: string;
}): Promise<{ status: "approved" | "idempotent"; review: GeneratedOutputReviewRecord; decision: GeneratedOutputPublicationDecision }> {
  const before = await readGeneratedOutputReviewModel(input.siteVersionId);
  assertExpectedReviewSelection(before, input);
  if (before.decision.review.status === "APPROVED") {
    const review = await readLatestReview(createComposition().client, input.siteVersionId);
    if (!review) throw new Error("generated_output_review_readback_missing");
    return { status: "idempotent", review, decision: before.decision };
  }
  if (before.state !== "READY_FOR_REVIEW") throw new Error(`generated_output_review_state_invalid:${before.state}`);
  if (before.decision.technical.status !== "PASS") throw new Error("generated_output_technical_review_blocked");

  const reviewedAt = new Date().toISOString();
  const review = createGeneratedOutputReviewRecord({
    reviewId: `generated_output_review_${sha256Hex(stableStringify({
      siteVersionId: input.siteVersionId,
      artifactId: before.artifactId,
      technicalEvaluationSha256: before.decision.technical.evidenceSha256,
      reviewerActorId: input.reviewerActorId,
    })).slice(0, 32)}`,
    decision: "APPROVED",
    policyVersion: before.decision.policyVersion,
    artifactId: before.artifactId,
    artifactBundleSha256: before.artifactBundleSha256,
    candidateId: before.candidateId,
    candidateContentSha256: before.candidateContentSha256,
    contentManifestSha256: before.contentManifestSha256,
    technicalEvaluationSha256: before.decision.technical.evidenceSha256,
    reviewerActorId: input.reviewerActorId,
    reviewedAt,
  });

  try {
    const mod = await import("@/gnr8/runtime/version-lifecycle-enforcer");
    await mod.transitionSiteVersionState({
      siteVersionId: input.siteVersionId,
      nextState: "APPROVED",
      actor: input.reviewerActorId,
      source: "manual",
      details: {
        workflow: "gnr8-generated-output-review:v1",
        generatedOutputReview: review,
      },
    });
  } catch (error) {
    const reconciled = await readGeneratedOutputReviewModel(input.siteVersionId).catch(() => null);
    if (reconciled?.decision.review.status !== "APPROVED") throw error;
  }

  const after = await readGeneratedOutputReviewModel(input.siteVersionId);
  if (after.decision.review.status !== "APPROVED" || after.decision.activation !== "READY_FOR_TARGET_READINESS") {
    throw new Error("generated_output_review_readback_mismatch");
  }
  const storedReview = await readLatestReview(createComposition().client, input.siteVersionId);
  if (!storedReview || storedReview.reviewSha256 !== review.reviewSha256) {
    throw new Error("generated_output_review_record_mismatch");
  }
  return { status: "approved", review: storedReview, decision: after.decision };
}

async function resolveDecision(
  composition: Composition,
  input: Parameters<GeneratedOutputPublicationDecisionResolver>[0],
): Promise<GeneratedOutputPublicationDecision> {
  const buildEvidence = readGeneratedOutputBuildEvidence(input.artifact.manifest);
  const contentManifest = readGeneratedOutputContentManifest(input.artifact.manifest);
  if (!buildEvidence || !contentManifest) throw new Error("generated_output_evidence_missing");
  const ownership = await composition.ownershipResolver.resolve({
    siteVersionId: input.siteVersion.id,
    expectedRuntimeSiteId: input.siteVersion.siteId,
  });
  const [record, captureContext, review] = await Promise.all([
    composition.candidateRepository.read({ candidateId: input.provenance.candidateId, trustedScope: ownership }),
    composition.runtimeStore.readContext(buildEvidence.sourceCapture.siteVersionId),
    readLatestReview(composition.client, input.siteVersion.id),
  ]);
  const technical = evaluateGeneratedOutputTechnicalEligibility({
    siteVersion: input.siteVersion,
    artifact: input.artifact,
    authoritativeOwnership: ownership,
    candidateRecord: record,
    buildEvidence,
    contentManifest,
    sourceCaptureSiteVersion: captureContext?.siteVersion ?? null,
    sourceCaptureArtifact: captureContext?.artifact ?? null,
  });
  if (!technical.scope.allowedPublishStages.includes(input.publishStage)) {
    return evaluateGeneratedOutputPublicationDecision({ technical, review: null });
  }
  return evaluateGeneratedOutputPublicationDecision({ technical, review });
}

export async function readLatestReview(client: SupabaseClient, siteVersionId: string): Promise<GeneratedOutputReviewRecord | null> {
  const result = await client
    .from("gnr8_runtime_version_audit")
    .select("actor,details,timestamp,from_state,to_state")
    .eq("site_version_id", siteVersionId)
    .eq("to_state", "APPROVED")
    .order("timestamp", { ascending: false })
    .limit(20);
  if (result.error || !Array.isArray(result.data)) throw new Error("generated_output_review_store_unavailable");
  for (const row of result.data as unknown as AuditRow[]) {
    const review = validateGeneratedOutputReviewRecord(row.details?.generatedOutputReview);
    if (review && review.reviewerActorId === row.actor) return review;
  }
  return null;
}

function assertExpectedReviewSelection(
  model: GeneratedOutputReviewModel,
  input: Parameters<typeof approveGeneratedOutputReview>[0],
): void {
  const matches = model.artifactId === input.expectedArtifactId &&
    model.artifactBundleSha256 === input.expectedArtifactBundleSha256 &&
    model.candidateId === input.expectedCandidateId &&
    model.candidateContentSha256 === input.expectedCandidateContentSha256 &&
    model.contentManifestSha256 === input.expectedContentManifestSha256 &&
    model.decision.technical.evidenceSha256 === input.expectedTechnicalEvaluationSha256;
  if (!matches) throw new Error("generated_output_review_selection_stale");
}
