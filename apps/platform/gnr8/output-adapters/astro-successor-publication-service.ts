import "server-only";

import { createHash } from "node:crypto";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { buildCanonicalMigrationInput } from "@/gnr8/runtime/migration-factory";
import {
  ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
  computeRuntimeArtifactBundleSha256,
  readAstroRuntimeArtifactPromotionEvidence,
} from "@/gnr8/runtime/astro-artifact-materialization";
import { stableStringify } from "@/gnr8/runtime/deterministic";
import { publishApprovedSiteVersion } from "@/gnr8/runtime/publish-activation-orchestrator";
import { evaluatePublishEnforcement } from "@/gnr8/runtime/publish-enforcement";
import {
  bindArtifactToVersion,
  bindHostToSite,
  createArtifact,
  createSiteVersionFromMigration,
  getActiveHostBindingForHost,
  getActivePointerForSite,
  getArtifactById,
  getRuntimeSiteSummary,
  getRuntimeSiteVersionOwnershipSnapshot,
  getSiteVersion,
  linkRuntimeSiteVersionOwnershipIfAllowed,
} from "@/gnr8/runtime/runtime-store";
import { rollbackToSiteVersionArtifact } from "@/gnr8/runtime/rollback-switch";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";
import type {
  CanonicalSiteVersionSnapshot,
  RuntimeArtifact,
  RuntimeImportProvenanceSummary,
} from "@/gnr8/runtime/types";

import type { AstroCandidatePromotionResult } from "./astro-candidate-promotion-service";
import {
  createAstroProductionCandidateId,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
  type AstroProductionCandidateRegistrationContext,
} from "./astro-production-candidate-record";
import type { AstroProductionCandidateCreateResult } from "./astro-production-candidate-repository";
import {
  computeAstroInternalPreviewCandidateContentSha256,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";

export const ASTRO_SUCCESSOR_PUBLICATION_VERSION = "gnr8-astro-successor-publication:v1" as const;
export const ASTRO_SUCCESSOR_PRODUCER_KIND = "astro_successor_candidate_rebind" as const;
export const ASTRO_SUCCESSOR_PRODUCER_VERSION = "v1" as const;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type AstroSuccessorPublicationInput = {
  actorUserId: string;
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  sourceCandidateId: string;
  sourceArtifactId: string;
  expectedSourceContentSha256: string;
  expectedSourceStorageSha256: string;
  expectedActivePointer: { siteVersionId: string; artifactId: string };
  expectedInternalHost: string;
  stage: "shadow";
};

export type AstroSuccessorOperationIdentity = {
  successorSiteVersionId: string;
  successorCandidateOperationId: string;
  successorCandidateId: string;
  correlationId: string;
  idempotencyKey: string;
};

export type AstroSuccessorPublicationResult = {
  operationVersion: typeof ASTRO_SUCCESSOR_PUBLICATION_VERSION;
  status: "published";
  stage: "shadow";
  source: {
    siteVersionId: string;
    artifactId: string;
    candidateId: string;
    contentSha256: string;
    storageSha256: string;
  };
  successor: {
    siteVersionId: string;
    versionNo: number;
    artifactId: string;
    candidateId: string;
    candidateContentSha256: string;
    candidateStorageSha256: string;
    state: "PUBLISHED";
  };
  lineage: {
    producerKind: typeof ASTRO_SUCCESSOR_PRODUCER_KIND;
    producerVersion: typeof ASTRO_SUCCESSOR_PRODUCER_VERSION;
    producerRef: string;
    htmlPreservedExactly: true;
    cssPreservedExactly: true;
  };
  governance: AstroCandidatePromotionResult["governance"] & {
    pageStructuralConfidence: number;
    pageGateDecision: string;
    shadowEnforcementDecision: string;
  };
  approval: {
    readyForReview: true;
    approved: true;
    actorUserId: string;
  };
  pointer: {
    before: { siteVersionId: string; artifactId: string };
    after: { siteVersionId: string; artifactId: string };
    firstPublishSwitch: string;
    idempotentRepeat: "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP";
  };
  artifact: {
    bundleSha256: string;
    publishStage: "shadow";
    artifactSource: "astro_candidate_materialization";
    fallbackUsed: false;
  };
  servingRecovery: {
    baselineRestorationPerformed: boolean;
    hostBindingBefore: string;
    hostBindingAfter: "shadow";
  };
};

type CandidateRepository = {
  read(input: {
    candidateId: string;
    trustedScope: AstroProductionCandidateOwnership;
  }): Promise<AstroProductionCandidateRecord>;
  create(input: {
    candidate: AstroInternalPreviewCandidate;
    trustedScope: AstroProductionCandidateOwnership;
    registration: AstroProductionCandidateRegistrationContext;
  }): Promise<AstroProductionCandidateCreateResult>;
};

export type AstroSuccessorPublicationDependencies = {
  resolveOwnership(input: { siteVersionId: string; expectedRuntimeSiteId?: string }): Promise<AstroProductionCandidateOwnership>;
  candidateRepository: CandidateRepository;
  promoteCandidate(input: {
    actorUserId: string;
    siteVersionId: string;
    candidateId: string;
    expectedContentSha256: string;
    expectedStorageSha256: string;
    idempotencyKey: string;
  }): Promise<AstroCandidatePromotionResult>;
  getSiteVersion: typeof getSiteVersion;
  getRuntimeSiteSummary: typeof getRuntimeSiteSummary;
  getActiveHostBindingForHost: typeof getActiveHostBindingForHost;
  getActivePointerForSite: typeof getActivePointerForSite;
  getArtifactById: typeof getArtifactById;
  getRuntimeSiteVersionOwnershipSnapshot: typeof getRuntimeSiteVersionOwnershipSnapshot;
  createSiteVersionFromMigration: typeof createSiteVersionFromMigration;
  linkRuntimeSiteVersionOwnershipIfAllowed: typeof linkRuntimeSiteVersionOwnershipIfAllowed;
  createArtifact: typeof createArtifact;
  bindArtifactToVersion: typeof bindArtifactToVersion;
  bindHostToSite: typeof bindHostToSite;
  transitionSiteVersionState: typeof transitionSiteVersionState;
  publishApprovedSiteVersion: typeof publishApprovedSiteVersion;
  rollbackToSiteVersionArtifact: typeof rollbackToSiteVersionArtifact;
};

export class AstroSuccessorPublicationError extends Error {
  readonly code: string;
  readonly blockerCodes: string[];

  constructor(code: string, message: string, blockerCodes: string[] = [code]) {
    super(message);
    this.name = "AstroSuccessorPublicationError";
    this.code = code;
    this.blockerCodes = blockerCodes;
  }
}

export function deriveAstroSuccessorOperationIdentity(input: {
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  sourceCandidateId: string;
}): AstroSuccessorOperationIdentity {
  const seed = stableStringify({
    version: ASTRO_SUCCESSOR_PUBLICATION_VERSION,
    runtimeSiteId: input.runtimeSiteId,
    sourceSiteVersionId: input.sourceSiteVersionId,
    sourceCandidateId: input.sourceCandidateId,
  });
  const successorSiteVersionId = deterministicUuid(`${seed}:site-version`);
  const successorCandidateOperationId = deterministicUuid(`${seed}:candidate-operation`);
  return {
    successorSiteVersionId,
    successorCandidateOperationId,
    successorCandidateId: createAstroProductionCandidateId(successorCandidateOperationId),
    correlationId: `astro-successor:${successorSiteVersionId}`,
    idempotencyKey: `astro-successor:${successorCandidateOperationId}`,
  };
}

export function buildSuccessorBoundAstroCandidate(input: {
  source: AstroProductionCandidateRecord;
  successorSiteVersionId: string;
  successorCandidateId: string;
  createdAt: string;
}): AstroInternalPreviewCandidate {
  const candidate: AstroInternalPreviewCandidate = {
    ...structuredClone(input.source.candidate),
    id: input.successorCandidateId,
    siteVersionId: input.successorSiteVersionId,
    manifest: {
      ...structuredClone(input.source.candidate.manifest),
      ownership: {
        siteId: input.source.identity.runtimeSiteId,
        siteVersionId: input.successorSiteVersionId,
      },
      provenance: {
        ...structuredClone(input.source.candidate.manifest.provenance),
        convertedArtifactSha256: "0".repeat(64),
      },
      lifecycle: {
        storage: "caller_owned_in_memory",
        lifetime: "proof_invocation_only",
        durableRegistration: false,
      },
    },
    contentSha256: "0".repeat(64),
    createdAt: normalizeIsoTimestamp(input.createdAt),
  };
  const contentSha256 = computeAstroInternalPreviewCandidateContentSha256(candidate);
  candidate.contentSha256 = contentSha256;
  candidate.manifest.provenance.convertedArtifactSha256 = contentSha256;
  return candidate;
}

export function createAstroSuccessorPublicationService(
  dependencies: AstroSuccessorPublicationDependencies,
) {
  return async function publishAstroSuccessor(
    rawInput: AstroSuccessorPublicationInput,
  ): Promise<AstroSuccessorPublicationResult> {
    const input = validateInput(rawInput);
    const operation = deriveAstroSuccessorOperationIdentity(input);

    const [sourceVersion, runtimeSite, hostBinding, initialPointer, sourceOwnership, existingSuccessorAtStart] = await Promise.all([
      dependencies.getSiteVersion(input.sourceSiteVersionId),
      dependencies.getRuntimeSiteSummary(input.runtimeSiteId),
      dependencies.getActiveHostBindingForHost(input.expectedInternalHost),
      dependencies.getActivePointerForSite(input.runtimeSiteId),
      dependencies.resolveOwnership({
        siteVersionId: input.sourceSiteVersionId,
        expectedRuntimeSiteId: input.runtimeSiteId,
      }),
      dependencies.getSiteVersion(operation.successorSiteVersionId),
    ]);
    if (!sourceVersion || sourceVersion.siteId !== input.runtimeSiteId) {
      throw publicationError("source_version_mismatch", "The selected source version does not belong to the runtime site.");
    }
    if (sourceVersion.artifactId !== input.sourceArtifactId) {
      throw publicationError("source_artifact_mismatch", "The selected source artifact is not bound to the source version.");
    }
    if (!runtimeSite || runtimeSite.id !== input.runtimeSiteId) {
      throw publicationError("runtime_site_missing", "The selected runtime site is unavailable.");
    }
    if (
      !hostBinding ||
      hostBinding.siteId !== input.runtimeSiteId ||
      hostBinding.host !== input.expectedInternalHost ||
      hostBinding.status !== "ACTIVE"
    ) {
      throw publicationError("internal_host_binding_mismatch", "The internal host is not actively bound to the runtime site.");
    }
    assertPointerAllowed({
      actual: initialPointer,
      expected: input.expectedActivePointer,
      successorSiteVersionId: operation.successorSiteVersionId,
      successorArtifactId: existingSuccessorAtStart?.artifactId ?? null,
    });

    const sourceCandidate = await dependencies.candidateRepository.read({
      candidateId: input.sourceCandidateId,
      trustedScope: sourceOwnership,
    });
    if (
      sourceCandidate.candidate.contentSha256 !== input.expectedSourceContentSha256 ||
      sourceCandidate.storageSha256 !== input.expectedSourceStorageSha256
    ) {
      throw publicationError("source_candidate_hash_mismatch", "The source candidate hashes changed from the selected evidence.");
    }
    const sourceArtifact = await dependencies.getArtifactById(input.sourceArtifactId);
    if (!sourceArtifact || sourceArtifact.siteVersionId !== input.sourceSiteVersionId) {
      throw publicationError("source_artifact_missing", "The source materialized artifact is unavailable.");
    }
    assertPreservedBytes(sourceArtifact, sourceCandidate, "source_artifact_bytes_mismatch");

    const importedPage = importHtmlToPage({
      slug: "/",
      html: sourceCandidate.candidate.htmlByPath["/"],
    });
    const migrationDiagnostics = importedPage.migrationDiagnostics;
    const sourcePage = sourceVersion.pages.find((page) => page.path === "/");
    if (!sourcePage || !migrationDiagnostics) {
      throw publicationError("generated_content_governance_unavailable", "Generated Astro HTML could not produce page governance evidence.");
    }
    const lineage = {
      kind: "astro_generated_content_successor_v1",
      operationVersion: ASTRO_SUCCESSOR_PUBLICATION_VERSION,
      runtimeSiteId: input.runtimeSiteId,
      sourceSiteVersionId: input.sourceSiteVersionId,
      sourceArtifactId: input.sourceArtifactId,
      sourceCandidateId: input.sourceCandidateId,
      sourceContentSha256: input.expectedSourceContentSha256,
      sourceStorageSha256: input.expectedSourceStorageSha256,
      governanceInput: "stored_candidate_html_bytes",
    } as unknown as RuntimeImportProvenanceSummary;

    let successorVersion = await dependencies.getSiteVersion(operation.successorSiteVersionId);
    if (!successorVersion) {
      const canonical = buildCanonicalMigrationInput({
        sourceUrl: runtimeSite.sourceUrl,
        page: importedPage,
        actor: input.actorUserId,
      });
      const page = canonical.pages[0]!;
      const created = await dependencies.createSiteVersionFromMigration({
        ...canonical,
        siteId: input.runtimeSiteId,
        sourceUrl: runtimeSite.sourceUrl,
        actor: input.actorUserId,
        siteVersionId: operation.successorSiteVersionId,
        createSourceHostBinding: false,
        importProvenanceSummary: lineage,
        pages: [{
          ...page,
          pageId: sourcePage.pageId,
          semanticSignals: [
            ...page.semanticSignals,
            { label: "astro.successor.source_candidate", confidence: 1, source: "migration" },
          ],
          actor: input.actorUserId,
        }],
        rendererCompatibilityVersion: sourceCandidate.candidate.rendererCompatibilityVersion,
      });
      successorVersion = await dependencies.getSiteVersion(created.siteVersionId);
    }
    assertSuccessorVersion(successorVersion, {
      runtimeSiteId: input.runtimeSiteId,
      lineage,
      pageId: sourcePage.pageId,
    });

    const ownershipLink = await dependencies.linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId: operation.successorSiteVersionId,
      ownershipSiteId: sourceOwnership.ownershipSiteId,
    });
    if (ownershipLink.ownershipSiteId !== sourceOwnership.ownershipSiteId) {
      throw publicationError("successor_ownership_mismatch", "Successor ownership could not be linked to the authoritative site.");
    }
    const successorOwnership = await dependencies.resolveOwnership({
      siteVersionId: operation.successorSiteVersionId,
      expectedRuntimeSiteId: input.runtimeSiteId,
    });
    assertSameOwnershipExceptVersion(sourceOwnership, successorOwnership);

    const successorCandidate = buildSuccessorBoundAstroCandidate({
      source: sourceCandidate,
      successorSiteVersionId: operation.successorSiteVersionId,
      successorCandidateId: operation.successorCandidateId,
      createdAt: successorVersion!.createdAt,
    });
    let successorCandidateRecord: AstroProductionCandidateRecord;
    try {
      successorCandidateRecord = await dependencies.candidateRepository.read({
        candidateId: operation.successorCandidateId,
        trustedScope: successorOwnership,
      });
    } catch (error) {
      if (!isMissingCandidateError(error)) throw error;
      const created = await dependencies.candidateRepository.create({
        candidate: successorCandidate,
        trustedScope: successorOwnership,
        registration: {
          registeredByActorId: input.actorUserId,
          producerKind: ASTRO_SUCCESSOR_PRODUCER_KIND,
          producerVersion: ASTRO_SUCCESSOR_PRODUCER_VERSION,
          producerRef: input.sourceCandidateId,
          idempotencyKey: operation.idempotencyKey,
          correlationId: operation.correlationId,
        },
      });
      successorCandidateRecord = created.record;
    }
    assertSuccessorCandidate(successorCandidateRecord, {
      candidate: successorCandidate,
      sourceCandidateId: input.sourceCandidateId,
    });

    successorVersion = await dependencies.getSiteVersion(operation.successorSiteVersionId);
    if (!successorVersion) throw publicationError("successor_version_missing", "Successor version disappeared before materialization.");
    const enforcement = evaluatePublishEnforcement({ siteVersion: successorVersion, stage: "shadow" });
    if (enforcement.adapter.decision === "DENY") {
      throw publicationError(
        "generated_content_governance_denied",
        "Generated Astro content failed shadow publish governance.",
        ["publish_enforcement_denied"],
      );
    }

    let artifact = successorVersion.artifactId
      ? await dependencies.getArtifactById(successorVersion.artifactId)
      : null;
    if (!artifact) {
      const manifest = {
        siteId: input.runtimeSiteId,
        siteVersionId: operation.successorSiteVersionId,
        rendererCompatibilityVersion: successorCandidate.rendererCompatibilityVersion,
        renderMode: "PUBLISH",
        generatedAt: "deterministic",
        paths: ["/"],
        assetFingerprints: structuredClone(successorCandidate.assetFingerprintMap),
        artifactSource: "astro_successor_preallocation",
        parentCandidateId: input.sourceCandidateId,
        successorCandidateId: operation.successorCandidateId,
        htmlTransformation: "none",
        publishStage: "shadow",
        shadowRestricted: enforcement.shadowRestricted,
        enforcementDecision: enforcement.adapter.decision,
      };
      const bundleSha256 = computeRuntimeArtifactBundleSha256({
        htmlByPath: successorCandidate.htmlByPath,
        compiledTokenStyles: successorCandidate.compiledTokenStyles,
        assetFingerprintMap: successorCandidate.assetFingerprintMap,
        manifest,
      });
      const created = await dependencies.createArtifact({
        siteId: input.runtimeSiteId,
        siteVersionId: operation.successorSiteVersionId,
        rendererCompatibilityVersion: successorCandidate.rendererCompatibilityVersion,
        bundleSha256,
        htmlByPath: successorCandidate.htmlByPath,
        compiledTokenStyles: successorCandidate.compiledTokenStyles,
        assetFingerprintMap: successorCandidate.assetFingerprintMap,
        manifest,
        publishStage: "shadow",
        shadowRestricted: enforcement.shadowRestricted,
        artifactGovernance: enforcement.artifactGovernance,
      });
      await dependencies.bindArtifactToVersion({
        siteVersionId: operation.successorSiteVersionId,
        artifactId: created.artifactId,
        rendererCompatibilityVersion: successorCandidate.rendererCompatibilityVersion,
      });
      artifact = await dependencies.getArtifactById(created.artifactId);
    }
    if (!artifact || artifact.siteVersionId !== operation.successorSiteVersionId) {
      throw publicationError("successor_artifact_missing", "Successor artifact allocation is unavailable.");
    }

    const promotion = await dependencies.promoteCandidate({
      actorUserId: input.actorUserId,
      siteVersionId: operation.successorSiteVersionId,
      candidateId: operation.successorCandidateId,
      expectedContentSha256: successorCandidateRecord.candidate.contentSha256,
      expectedStorageSha256: successorCandidateRecord.storageSha256,
      idempotencyKey: `${operation.idempotencyKey}:promotion`,
    });
    if (promotion.governance.status !== "evaluated" || promotion.governance.decision === "DENY") {
      throw publicationError(
        "generated_content_governance_denied",
        "Successor materialization did not produce publishable governance evidence.",
        promotion.governance.blockerCodes,
      );
    }

    successorVersion = await dependencies.getSiteVersion(operation.successorSiteVersionId);
    if (!successorVersion) throw publicationError("successor_version_missing", "Successor version disappeared before review.");
    const auditDetails = {
      workflow: ASTRO_SUCCESSOR_PUBLICATION_VERSION,
      sourceSiteVersionId: input.sourceSiteVersionId,
      sourceArtifactId: input.sourceArtifactId,
      sourceCandidateId: input.sourceCandidateId,
      successorCandidateId: operation.successorCandidateId,
      governanceInput: "stored_candidate_html_bytes",
      pageStructuralConfidence: migrationDiagnostics.pageStructuralConfidence,
      pageGateDecision: migrationDiagnostics.pageMigrationGate.state,
      shadowEnforcementDecision: enforcement.adapter.decision,
      candidateContentSha256: successorCandidateRecord.candidate.contentSha256,
      candidateStorageSha256: successorCandidateRecord.storageSha256,
    };
    if (successorVersion.state === "DRAFT") {
      await dependencies.transitionSiteVersionState({
        siteVersionId: successorVersion.id,
        nextState: "READY_FOR_REVIEW",
        actor: input.actorUserId,
        source: "manual",
        details: { ...auditDetails, reviewOutcome: "governance_checks_passed" },
      });
      successorVersion = await dependencies.getSiteVersion(successorVersion.id);
    }
    if (successorVersion?.state === "READY_FOR_REVIEW") {
      await dependencies.transitionSiteVersionState({
        siteVersionId: successorVersion.id,
        nextState: "APPROVED",
        actor: input.actorUserId,
        source: "manual",
        details: { ...auditDetails, approvalOutcome: "approved_after_actual_checks" },
      });
      successorVersion = await dependencies.getSiteVersion(successorVersion.id);
    }
    if (!successorVersion || !["APPROVED", "PUBLISHED"].includes(successorVersion.state)) {
      throw publicationError("successor_not_approved", "Successor did not reach the approved lifecycle state.");
    }

    const preActivation = await rereadActivationSelection(dependencies, {
      input,
      operation,
      successorCandidateRecord,
      expectedOwnershipSiteId: sourceOwnership.ownershipSiteId,
    });
    const servingRecovery = await prepareShadowHostForActivation(dependencies, {
      input,
      operation,
      successorArtifactId: preActivation.artifact.id,
      pointer: preActivation.pointer,
    });
    assertPointerAllowed({
      actual: servingRecovery.pointer,
      expected: input.expectedActivePointer,
      successorSiteVersionId: operation.successorSiteVersionId,
      successorArtifactId: preActivation.artifact.id,
    });

    const firstPublish = await dependencies.publishApprovedSiteVersion({
      siteVersionId: operation.successorSiteVersionId,
      actor: input.actorUserId,
      stage: "shadow",
    });
    const afterFirstPointer = await dependencies.getActivePointerForSite(input.runtimeSiteId);
    if (
      afterFirstPointer?.siteVersionId !== operation.successorSiteVersionId ||
      afterFirstPointer.artifactId !== preActivation.artifact.id
    ) {
      throw publicationError("activation_readback_mismatch", "Persisted active pointer does not identify the published successor.");
    }

    const repeatPublish = await dependencies.publishApprovedSiteVersion({
      siteVersionId: operation.successorSiteVersionId,
      actor: input.actorUserId,
      stage: "shadow",
    });
    if (repeatPublish.pointerSwitch !== "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP") {
      throw publicationError("publish_idempotency_failed", "Repeated shadow publish was not an active-pointer safe no-op.");
    }

    const [publishedVersion, storedArtifact, finalPointer] = await Promise.all([
      dependencies.getSiteVersion(operation.successorSiteVersionId),
      dependencies.getArtifactById(preActivation.artifact.id),
      dependencies.getActivePointerForSite(input.runtimeSiteId),
    ]);
    if (!publishedVersion || publishedVersion.state !== "PUBLISHED" || publishedVersion.artifactId !== preActivation.artifact.id) {
      throw publicationError("published_version_readback_mismatch", "Published successor state could not be independently verified.");
    }
    if (!storedArtifact || !finalPointer) {
      throw publicationError("published_artifact_readback_mismatch", "Published successor artifact could not be independently verified.");
    }
    assertPreservedBytes(storedArtifact, successorCandidateRecord, "published_artifact_bytes_mismatch");
    const promotionEvidence = readAstroRuntimeArtifactPromotionEvidence(storedArtifact.manifest);
    if (
      !promotionEvidence ||
      promotionEvidence.candidateId !== operation.successorCandidateId ||
      storedArtifact.publishStage !== "shadow"
    ) {
      throw publicationError("published_artifact_provenance_mismatch", "Published artifact lost its Astro promotion provenance.");
    }

    return {
      operationVersion: ASTRO_SUCCESSOR_PUBLICATION_VERSION,
      status: "published",
      stage: "shadow",
      source: {
        siteVersionId: input.sourceSiteVersionId,
        artifactId: input.sourceArtifactId,
        candidateId: input.sourceCandidateId,
        contentSha256: input.expectedSourceContentSha256,
        storageSha256: input.expectedSourceStorageSha256,
      },
      successor: {
        siteVersionId: publishedVersion.id,
        versionNo: publishedVersion.versionNo,
        artifactId: storedArtifact.id,
        candidateId: operation.successorCandidateId,
        candidateContentSha256: successorCandidateRecord.candidate.contentSha256,
        candidateStorageSha256: successorCandidateRecord.storageSha256,
        state: "PUBLISHED",
      },
      lineage: {
        producerKind: ASTRO_SUCCESSOR_PRODUCER_KIND,
        producerVersion: ASTRO_SUCCESSOR_PRODUCER_VERSION,
        producerRef: input.sourceCandidateId,
        htmlPreservedExactly: true,
        cssPreservedExactly: true,
      },
      governance: {
        ...promotion.governance,
        pageStructuralConfidence: migrationDiagnostics.pageStructuralConfidence,
        pageGateDecision: migrationDiagnostics.pageMigrationGate.state,
        shadowEnforcementDecision: enforcement.adapter.decision,
      },
      approval: {
        readyForReview: true,
        approved: true,
        actorUserId: input.actorUserId,
      },
      pointer: {
        before: input.expectedActivePointer,
        after: finalPointer,
        firstPublishSwitch: firstPublish.pointerSwitch,
        idempotentRepeat: "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
      },
      artifact: {
        bundleSha256: storedArtifact.bundleSha256,
        publishStage: "shadow",
        artifactSource: "astro_candidate_materialization",
        fallbackUsed: false,
      },
      servingRecovery: {
        baselineRestorationPerformed: servingRecovery.baselineRestorationPerformed,
        hostBindingBefore: servingRecovery.hostBindingBefore,
        hostBindingAfter: "shadow",
      },
    };
  };
}

async function prepareShadowHostForActivation(
  dependencies: AstroSuccessorPublicationDependencies,
  context: {
    input: AstroSuccessorPublicationInput;
    operation: AstroSuccessorOperationIdentity;
    successorArtifactId: string;
    pointer: { siteVersionId: string; artifactId: string } | null;
  },
): Promise<{
  pointer: { siteVersionId: string; artifactId: string } | null;
  baselineRestorationPerformed: boolean;
  hostBindingBefore: string;
}> {
  const binding = await dependencies.getActiveHostBindingForHost(context.input.expectedInternalHost);
  if (
    !binding ||
    binding.siteId !== context.input.runtimeSiteId ||
    binding.host !== context.input.expectedInternalHost ||
    binding.status !== "ACTIVE"
  ) {
    throw publicationError("preactivation_host_binding_mismatch", "Internal host binding changed before activation.");
  }
  if (binding.bindingKind === "shadow") {
    return {
      pointer: context.pointer,
      baselineRestorationPerformed: false,
      hostBindingBefore: binding.bindingKind,
    };
  }

  assertPointerAllowed({
    actual: context.pointer,
    expected: context.input.expectedActivePointer,
    successorSiteVersionId: context.operation.successorSiteVersionId,
    successorArtifactId: context.successorArtifactId,
  });
  const pointerIsSuccessor =
    context.pointer?.siteVersionId === context.operation.successorSiteVersionId &&
    context.pointer.artifactId === context.successorArtifactId;
  if (pointerIsSuccessor) {
    const restoration = await dependencies.rollbackToSiteVersionArtifact({
      siteVersionId: context.input.expectedActivePointer.siteVersionId,
    });
    if (
      restoration.siteId !== context.input.runtimeSiteId ||
      restoration.artifactId !== context.input.expectedActivePointer.artifactId ||
      restoration.previousActivePointer?.siteVersionId !== context.operation.successorSiteVersionId ||
      restoration.previousActivePointer.artifactId !== context.successorArtifactId
    ) {
      throw publicationError("baseline_restoration_mismatch", "Supported baseline restoration did not reconcile the expected successor pointer.");
    }
  }

  await dependencies.bindHostToSite({
    siteId: context.input.runtimeSiteId,
    host: context.input.expectedInternalHost,
    status: "ACTIVE",
    bindingKind: "shadow",
  });
  const [correctedBinding, correctedPointer] = await Promise.all([
    dependencies.getActiveHostBindingForHost(context.input.expectedInternalHost),
    dependencies.getActivePointerForSite(context.input.runtimeSiteId),
  ]);
  if (
    correctedBinding?.siteId !== context.input.runtimeSiteId ||
    correctedBinding.host !== context.input.expectedInternalHost ||
    correctedBinding.status !== "ACTIVE" ||
    correctedBinding.bindingKind !== "shadow"
  ) {
    throw publicationError("shadow_host_binding_mismatch", "Internal host binding did not persist the shadow serving stage.");
  }
  if (
    correctedPointer?.siteVersionId !== context.input.expectedActivePointer.siteVersionId ||
    correctedPointer.artifactId !== context.input.expectedActivePointer.artifactId
  ) {
    throw publicationError("baseline_restoration_readback_mismatch", "Expected baseline pointer was not preserved before shadow reactivation.");
  }
  return {
    pointer: correctedPointer,
    baselineRestorationPerformed: pointerIsSuccessor,
    hostBindingBefore: binding.bindingKind,
  };
}

async function rereadActivationSelection(
  dependencies: AstroSuccessorPublicationDependencies,
  context: {
    input: AstroSuccessorPublicationInput;
    operation: AstroSuccessorOperationIdentity;
    successorCandidateRecord: AstroProductionCandidateRecord;
    expectedOwnershipSiteId: string;
  },
): Promise<{
  version: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  pointer: { siteVersionId: string; artifactId: string } | null;
}> {
  const [version, ownership, pointer] = await Promise.all([
    dependencies.getSiteVersion(context.operation.successorSiteVersionId),
    dependencies.getRuntimeSiteVersionOwnershipSnapshot(context.operation.successorSiteVersionId),
    dependencies.getActivePointerForSite(context.input.runtimeSiteId),
  ]);
  if (!version || !["APPROVED", "PUBLISHED"].includes(version.state) || !version.artifactId) {
    throw publicationError("preactivation_version_mismatch", "Successor approval or artifact binding changed before activation.");
  }
  if (ownership?.ownershipSiteId !== context.expectedOwnershipSiteId || ownership.siteId !== context.input.runtimeSiteId) {
    throw publicationError("preactivation_ownership_mismatch", "Successor ownership changed before activation.");
  }
  const artifact = await dependencies.getArtifactById(version.artifactId);
  if (!artifact || artifact.siteVersionId !== version.id || artifact.siteId !== context.input.runtimeSiteId) {
    throw publicationError("preactivation_artifact_mismatch", "Successor artifact lineage changed before activation.");
  }
  assertPreservedBytes(artifact, context.successorCandidateRecord, "preactivation_artifact_bytes_mismatch");
  const evidence = readAstroRuntimeArtifactPromotionEvidence(artifact.manifest);
  if (
    !evidence ||
    evidence.version !== ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION ||
    evidence.candidateId !== context.operation.successorCandidateId ||
    evidence.candidateContentSha256 !== context.successorCandidateRecord.candidate.contentSha256 ||
    evidence.candidateStorageSha256 !== context.successorCandidateRecord.storageSha256
  ) {
    throw publicationError("preactivation_provenance_mismatch", "Successor promotion provenance changed before activation.");
  }
  return { version, artifact, pointer };
}

function validateInput(input: AstroSuccessorPublicationInput): AstroSuccessorPublicationInput {
  if (
    !input ||
    input.stage !== "shadow" ||
    !boundedText(input.actorUserId) ||
    !boundedText(input.runtimeSiteId) ||
    !boundedText(input.sourceSiteVersionId) ||
    !boundedText(input.sourceCandidateId) ||
    !boundedText(input.sourceArtifactId) ||
    !SHA256_PATTERN.test(input.expectedSourceContentSha256) ||
    !SHA256_PATTERN.test(input.expectedSourceStorageSha256) ||
    !boundedText(input.expectedActivePointer?.siteVersionId) ||
    !boundedText(input.expectedActivePointer?.artifactId) ||
    !isNormalizedHost(input.expectedInternalHost)
  ) {
    throw publicationError("invalid_request", "Astro successor publication request is invalid.");
  }
  return structuredClone(input);
}

function assertSuccessorVersion(
  version: CanonicalSiteVersionSnapshot | null,
  expected: { runtimeSiteId: string; lineage: RuntimeImportProvenanceSummary; pageId: string },
): asserts version is CanonicalSiteVersionSnapshot {
  if (
    !version ||
    version.siteId !== expected.runtimeSiteId ||
    stableStringify(version.importProvenanceSummary) !== stableStringify(expected.lineage) ||
    version.pages.length !== 1 ||
    version.pages[0]?.pageId !== expected.pageId ||
    version.pages[0]?.path !== "/" ||
    !version.pages[0]?.migrationGovernance
  ) {
    throw publicationError("successor_lineage_conflict", "Existing successor identity does not match the requested immutable lineage.");
  }
}

function assertSuccessorCandidate(
  record: AstroProductionCandidateRecord,
  expected: { candidate: AstroInternalPreviewCandidate; sourceCandidateId: string },
): void {
  if (
    stableStringify(record.candidate) !== stableStringify({
      ...expected.candidate,
      manifest: {
        ...expected.candidate.manifest,
        lifecycle: {
          storage: "supabase_postgres",
          lifetime: "retained_until_explicit_authorized_deletion",
          durableRegistration: true,
        },
      },
    }) ||
    record.registration.producerKind !== ASTRO_SUCCESSOR_PRODUCER_KIND ||
    record.registration.producerVersion !== ASTRO_SUCCESSOR_PRODUCER_VERSION ||
    record.registration.producerRef !== expected.sourceCandidateId
  ) {
    throw publicationError("successor_candidate_conflict", "Existing successor candidate does not match the requested parent lineage.");
  }
}

function assertPreservedBytes(
  artifact: RuntimeArtifact,
  candidate: AstroProductionCandidateRecord,
  code: string,
): void {
  if (
    stableStringify(artifact.htmlByPath) !== stableStringify(candidate.candidate.htmlByPath) ||
    artifact.compiledTokenStyles !== candidate.candidate.compiledTokenStyles ||
    stableStringify(artifact.assetFingerprintMap) !== stableStringify(candidate.candidate.assetFingerprintMap)
  ) {
    throw publicationError(code, "Stored runtime artifact does not preserve the selected Astro HTML/CSS bytes.");
  }
}

function assertSameOwnershipExceptVersion(
  source: AstroProductionCandidateOwnership,
  successor: AstroProductionCandidateOwnership,
): void {
  if (
    source.runtimeSiteId !== successor.runtimeSiteId ||
    source.ownershipSiteId !== successor.ownershipSiteId ||
    source.organizationId !== successor.organizationId ||
    source.agencyId !== successor.agencyId
  ) {
    throw publicationError("successor_ownership_mismatch", "Successor authoritative ownership differs from its source.");
  }
}

function assertPointerAllowed(input: {
  actual: { siteVersionId: string; artifactId: string } | null;
  expected: { siteVersionId: string; artifactId: string };
  successorSiteVersionId: string;
  successorArtifactId: string | null;
}): void {
  const baseline = input.actual?.siteVersionId === input.expected.siteVersionId &&
    input.actual.artifactId === input.expected.artifactId;
  const alreadyTarget = input.successorArtifactId !== null &&
    input.actual?.siteVersionId === input.successorSiteVersionId &&
    input.actual.artifactId === input.successorArtifactId;
  if (!baseline && !alreadyTarget) {
    throw publicationError("active_pointer_conflict", "Active pointer differs from the expected baseline or the idempotent successor target.");
  }
}

function isMissingCandidateError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "missing",
  );
}

function deterministicUuid(seed: string): string {
  const bytes = createHash("sha256").update(seed, "utf8").digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function boundedText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512 && value === value.trim() && !value.includes("\0");
}

function isNormalizedHost(value: unknown): value is string {
  return boundedText(value) && value === value.toLowerCase() && !value.includes(":") && !value.includes("/");
}

function normalizeIsoTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw publicationError("successor_timestamp_invalid", "Successor creation time is not a valid timestamp.");
  }
  return new Date(timestamp).toISOString();
}

function publicationError(code: string, message: string, blockers?: string[]): AstroSuccessorPublicationError {
  return new AstroSuccessorPublicationError(code, message, blockers);
}
