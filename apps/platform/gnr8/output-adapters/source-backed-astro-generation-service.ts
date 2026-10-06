import "server-only";

import { createHash } from "node:crypto";

import type { SiteAstroGenerationRequestedPayload } from "@gnr8/runtime-contracts";

import { computeRuntimeArtifactBundleSha256 } from "@/gnr8/runtime/astro-artifact-materialization";
import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getArtifactById,
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  getSiteVersion,
  linkRuntimeSiteVersionOwnershipIfAllowed,
} from "@/gnr8/runtime/runtime-store";
import { RENDERER_COMPATIBILITY_VERSION } from "@/gnr8/runtime/types";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";
import {
  completeQueuedAstroGenerationAction,
  failQueuedAstroGenerationAction,
} from "@/gnr8/site-actions/astro-generation-action-repository";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import { SupabaseAstroCandidateRuntimeArtifactStore } from "./astro-candidate-runtime-artifact-store";
import {
  createAstroCandidatePromotionService,
  evaluateAstroCandidateGovernance,
} from "./astro-candidate-promotion-service";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import { createAstroProductionCandidateId } from "./astro-production-candidate-record";
import { GatewayBackedAstroProductionCandidateRepository } from "./astro-production-candidate-repository";
import { InMemoryAstroCandidateRegistrationRetryContextStore } from "./astro-production-candidate-registration-contract";
import { createAstroProductionCandidateRegistrationService } from "./astro-production-candidate-registration-service";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import {
  createSourceBackedAstroCandidateProducer,
  SOURCE_BACKED_ASTRO_PRODUCER_KIND,
  SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
} from "./chs-astro-candidate-producer";
import { createBuildEvidenceForCandidate } from "./generated-output-evidence";
import { selectOutputAdapter } from "./output-adapter-selection";
import {
  createSourceBackedAstroGenerationInput,
  loadSourceBackedAstroHtmlByPath,
} from "./source-backed-astro-input";

export type SourceBackedAstroGenerationResult = {
  generationSiteVersionId: string;
  candidateId: string;
  artifactId: string;
  artifactBundleSha256: string;
  routePaths: string[];
  variantId: string;
};

export async function runSourceBackedAstroGeneration(
  payload: SiteAstroGenerationRequestedPayload,
): Promise<SourceBackedAstroGenerationResult> {
  try {
    const sourceVersion = await getSiteVersion(payload.sourceSiteVersionId);
    if (!sourceVersion || sourceVersion.siteId !== payload.runtimeSiteId || sourceVersion.artifactId !== payload.sourceArtifactId) {
      throw new Error("astro_generation_source_lineage_mismatch");
    }
    const [sourceArtifact, rawArtifact] = await Promise.all([
      getArtifactById(payload.sourceArtifactId),
      getRawImportedSiteArtifact(payload.sourceSiteVersionId),
    ]);
    if (!sourceArtifact || sourceArtifact.siteVersionId !== sourceVersion.id || !rawArtifact) {
      throw new Error("astro_generation_source_artifact_missing");
    }

    const sourceHtmlByPath = await loadSourceBackedAstroHtmlByPath({
      siteVersion: sourceVersion,
      rawArtifact,
      getRawAsset: getRawTemplateSiteAsset,
    });
    const generationInput = createSourceBackedAstroGenerationInput({
      siteVersion: sourceVersion,
      artifact: sourceArtifact,
      rawArtifact,
      htmlByPath: sourceHtmlByPath,
      acceptedFunctionalReductions: payload.acceptedFunctionalReductions,
    });
    const selection = selectOutputAdapter({
      generationKind: "new",
      siteClass: "static-business-site",
      requiredCapabilities: generationInput.capabilities,
      requestedAdapterId: payload.requestedAdapterId ?? null,
    });
    if (selection.status === "unsupported") {
      throw new Error(`unsupported_capability:${selection.unsupportedCapabilities.join(",") || selection.reason}`);
    }
    if (selection.adapterId !== "astro-static-site") {
      throw new Error("astro_generation_worker_received_legacy_adapter");
    }

    const identities = deriveIdentities(payload.actionId);
    let generationVersion = await getSiteVersion(identities.generationSiteVersionId);
    if (!generationVersion) {
      await createSiteVersionFromMigration({
        siteId: payload.runtimeSiteId,
        siteVersionId: identities.generationSiteVersionId,
        sourceUrl: rawArtifact.metadata.finalUrl ?? rawArtifact.metadata.sourceUrl,
        actor: payload.actor,
        pages: sourceVersion.pages,
        importProvenanceSummary: sourceVersion.importProvenanceSummary,
        rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
        createSourceHostBinding: false,
      });
      await linkRuntimeSiteVersionOwnershipIfAllowed({
        siteVersionId: identities.generationSiteVersionId,
        ownershipSiteId: payload.ownershipSiteId,
      });
      generationVersion = await getSiteVersion(identities.generationSiteVersionId);
    }
    if (!generationVersion || generationVersion.siteId !== payload.runtimeSiteId) {
      throw new Error("astro_generation_version_conflict");
    }

    const serviceClient = getSupabaseServiceRoleClient();
    if (!serviceClient) throw new Error("astro_generation_service_role_unavailable");
    const candidateClient = serviceClient as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
    const ownershipResolver = new SupabaseAstroCandidateOwnershipResolver(() => candidateClient);
    const repository = new GatewayBackedAstroProductionCandidateRepository({
      gateway: new SupabaseAstroProductionCandidateGateway(() => candidateClient),
    });
    const runtimeStore = new SupabaseAstroCandidateRuntimeArtifactStore(serviceClient);
    const ownership = await ownershipResolver.resolve({
      siteVersionId: identities.generationSiteVersionId,
      expectedRuntimeSiteId: payload.runtimeSiteId,
    });
    const producer = createSourceBackedAstroCandidateProducer({
      content: generationInput.content,
      inputId: identities.producerInputId,
      verification: generationInput.verification,
      ownedAssetFingerprints: generationInput.ownedAssetFingerprints,
      now: () => payload.requestedAt,
    });
    const register = createAstroProductionCandidateRegistrationService({
      authenticateSuperadmin: async () => payload.actor,
      resolveOwnership: (input) => ownershipResolver.resolve(input),
      producer,
      repository,
      retryContexts: new InMemoryAstroCandidateRegistrationRetryContextStore(),
      now: () => new Date(payload.requestedAt),
    });
    await register({
      operationId: identities.registrationOperationId,
      siteVersionId: identities.generationSiteVersionId,
      producer: { kind: SOURCE_BACKED_ASTRO_PRODUCER_KIND, version: SOURCE_BACKED_ASTRO_PRODUCER_VERSION },
      syntheticInput: { fixtureId: identities.producerInputId },
    });
    const candidateId = createAstroProductionCandidateId(identities.registrationOperationId);
    const receipt = producer.readBuildReceipt(candidateId);
    if (!receipt) throw new Error("astro_generation_build_receipt_missing");
    const record = await repository.read({ candidateId, trustedScope: ownership });

    if (!generationVersion.artifactId) {
      const enforcement = evaluateAstroCandidateGovernance(generationVersion);
      const manifest = {
        siteId: payload.runtimeSiteId,
        siteVersionId: generationVersion.id,
        rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
        renderMode: "PUBLISH",
        generatedAt: "deterministic",
        paths: Object.keys(record.candidate.htmlByPath).sort(),
        artifactSource: "astro_candidate_preallocation",
        candidateId,
        publishStage: "shadow",
        shadowRestricted: enforcement.shadowRestricted,
        enforcementDecision: enforcement.decision,
        governanceEvaluation: {
          status: enforcement.status,
          blockerCodes: enforcement.blockerCodes,
        },
      };
      const created = await createArtifact({
        siteId: payload.runtimeSiteId,
        siteVersionId: generationVersion.id,
        rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
        bundleSha256: computeRuntimeArtifactBundleSha256({
          htmlByPath: record.candidate.htmlByPath,
          compiledTokenStyles: record.candidate.compiledTokenStyles,
          assetFingerprintMap: record.candidate.assetFingerprintMap,
          manifest,
        }),
        htmlByPath: record.candidate.htmlByPath,
        compiledTokenStyles: record.candidate.compiledTokenStyles,
        assetFingerprintMap: record.candidate.assetFingerprintMap,
        manifest,
        publishStage: "shadow",
        shadowRestricted: enforcement.shadowRestricted,
        artifactGovernance: enforcement.artifactGovernance,
      });
      await bindArtifactToVersion({
        siteVersionId: generationVersion.id,
        artifactId: created.artifactId,
        rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
      });
      generationVersion = await getSiteVersion(generationVersion.id);
      if (!generationVersion?.artifactId) throw new Error("astro_generation_artifact_preallocation_failed");
    }

    const buildEvidence = createBuildEvidenceForCandidate({
      record,
      receipt,
      sourceCapture: {
        sourceUrl: rawArtifact.metadata.finalUrl ?? rawArtifact.metadata.sourceUrl,
        snapshotId: sourceVersion.importProvenanceSummary?.executionIdentity?.snapshotId ?? sourceVersion.id,
        snapshotRunId: sourceVersion.importProvenanceSummary?.executionIdentity?.snapshotRunId ?? sourceVersion.id,
        capturedAt: new Date(rawArtifact.createdAt).toISOString(),
        runtimeSiteId: payload.runtimeSiteId,
        siteVersionId: sourceVersion.id,
        artifactId: sourceArtifact.id,
        artifactBundleSha256: sourceArtifact.bundleSha256,
        htmlSha256: sha256Hex(sourceArtifact.htmlByPath["/"] ?? ""),
      },
      contentManifest: generationInput.contentManifest,
      submissionAttestation: {
        mode: "direct_server_execution",
        operationId: payload.actionId,
        packageSha256: sha256Hex(stableStringify(receipt)),
        submittedByActorId: payload.actor,
        receivedAt: receipt.buildCompletedAt,
      },
    });
    const promote = createAstroCandidatePromotionService({
      resolveOwnership: (input) => ownershipResolver.resolve(input),
      readCandidate: (input) => repository.read(input),
      runtimeStore,
    });
    const promoted = await promote({
      actorUserId: payload.actor,
      siteVersionId: generationVersion.id,
      candidateId,
      expectedContentSha256: record.candidate.contentSha256,
      expectedStorageSha256: record.storageSha256,
      idempotencyKey: `site-action:${payload.actionId}:astro-promotion`,
      generatedOutputEvidence: {
        buildEvidence,
        contentManifest: generationInput.contentManifest,
        sourceWorkspace: payload.acceptedFunctionalReductions
          ? {
              ...generationInput.sourceManifest,
              acceptedFunctionalReductions: {
                ...generationInput.sourceManifest.acceptedFunctionalReductions,
                scope: "generation-action",
                acceptedByActor: payload.actor,
                acceptedAt: payload.requestedAt,
              },
            }
          : generationInput.sourceManifest,
      },
    });
    const reviewedVersion = await getSiteVersion(generationVersion.id);
    if (reviewedVersion?.state === "DRAFT") {
      await transitionSiteVersionState({
        siteVersionId: generationVersion.id,
        nextState: "READY_FOR_REVIEW",
        actor: payload.actor,
        source: "ai",
        details: {
          workflow: "gnr8-source-backed-astro-generation:v1",
          adapterId: selection.adapterId,
          adapterVersion: selection.adapterVersion,
          candidateId,
        },
      });
    } else if (reviewedVersion?.state !== "READY_FOR_REVIEW") {
      throw new Error(`astro_generation_review_state_conflict:${reviewedVersion?.state ?? "missing"}`);
    }
    await completeQueuedAstroGenerationAction({
      actionId: payload.actionId,
      ownershipSiteId: payload.ownershipSiteId,
      variantId: identities.variantId,
      siteVersionId: generationVersion.id,
      strategy: payload.strategy || "corporate_balanced",
      label: `Astro redesign · ${payload.strategy || "Balanced"}`,
      diagnostics: [
        `adapter:${selection.adapterId}@${selection.adapterVersion}`,
        `candidate:${candidateId}`,
        `routes:${generationInput.outputPaths.join(",")}`,
        ...(payload.acceptedFunctionalReductions ? [
          `accepted-functional-reduction:${payload.acceptedFunctionalReductions.kind}`,
          `accepted-functional-reduction:contact-mailto:${payload.acceptedFunctionalReductions.contactEmail}`,
          "accepted-functional-reduction:comments:source-article-links",
        ] : []),
      ],
    });
    return {
      generationSiteVersionId: generationVersion.id,
      candidateId,
      artifactId: promoted.runtimeArtifactId,
      artifactBundleSha256: promoted.runtimeBundleSha256,
      routePaths: [...generationInput.outputPaths],
      variantId: identities.variantId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "astro_generation_failed";
    await failQueuedAstroGenerationAction({
      actionId: payload.actionId,
      ownershipSiteId: payload.ownershipSiteId,
      message,
    }).catch(() => undefined);
    throw error;
  }
}

export function deriveSourceBackedAstroGenerationIdentities(actionId: string) {
  return deriveIdentities(actionId);
}

function deriveIdentities(actionId: string) {
  const seed = stableStringify({ version: "gnr8-source-backed-astro-generation:v1", actionId });
  return {
    generationSiteVersionId: deterministicUuid(`${seed}:site-version`),
    registrationOperationId: deterministicUuid(`${seed}:registration`),
    producerInputId: `site-action:${actionId}`,
    variantId: deterministicUuid(`${seed}:variant`),
  };
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(createHash("sha256").update(seed).digest().subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
