import {
  ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
  computeRuntimeArtifactBundleSha256,
  readAstroRuntimeArtifactPromotionEvidence,
  type AstroRuntimeArtifactPromotionEvidence,
} from "@/gnr8/runtime/astro-artifact-materialization";
import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import { evaluatePublishEnforcement } from "@/gnr8/runtime/publish-enforcement";
import { evaluateRuntimeArtifactServingEligibility } from "@/gnr8/runtime/publish-enforcement";
import { runRenderIntegrityGate } from "@/gnr8/runtime/render-integrity-gate";
import type { RuntimeArtifact } from "@/gnr8/runtime/types";

import type {
  AstroCandidateRuntimeArtifactContext,
  AstroCandidateRuntimeArtifactStore,
} from "./astro-candidate-runtime-artifact-store";
import type {
  AstroProductionCandidateOwnership,
  AstroProductionCandidateRecord,
} from "./astro-production-candidate-record";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MAX_IDENTITY_LENGTH = 512;

export type AstroCandidatePromotionInput = {
  actorUserId: string;
  siteVersionId: string;
  candidateId: string;
  expectedContentSha256: string;
  expectedStorageSha256: string;
  idempotencyKey: string;
};

export type AstroCandidatePromotionDependencies = {
  resolveOwnership(input: { siteVersionId: string }): Promise<AstroProductionCandidateOwnership>;
  readCandidate(input: {
    candidateId: string;
    trustedScope: AstroProductionCandidateOwnership;
  }): Promise<AstroProductionCandidateRecord>;
  runtimeStore: AstroCandidateRuntimeArtifactStore;
};

export type AstroCandidatePromotionResult = {
  status: "materialized" | "idempotent";
  candidateId: string;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  runtimeBundleSha256: string;
  candidateContentSha256: string;
  candidateStorageSha256: string;
  sourceSnapshotSha256: string;
  exportSha256: string;
  convertedArtifactSha256: string;
  htmlPreservedExactly: true;
  cssPreservedExactly: true;
  materialization: "complete";
  persistence: "complete";
  governance: {
    status: "evaluated" | "blocked";
    decision: string | null;
    blockerCodes: string[];
  };
  workflowHandoff: {
    recognized: true;
    approvalState: string;
    publishStage: "shadow";
    servingEligible: boolean;
    servingEligibilityReason: string;
    readyForShadowActivation: boolean;
    blockerCodes: string[];
  };
  activePointerChanged: false;
  previewBindingsChanged: false;
  published: false;
};

export type AstroCandidatePromotionErrorCode =
  | "invalid_request"
  | "ownership_mismatch"
  | "candidate_hash_mismatch"
  | "runtime_context_missing"
  | "runtime_artifact_binding_missing"
  | "runtime_artifact_lineage_mismatch"
  | "runtime_artifact_in_use"
  | "render_integrity_denied"
  | "promotion_conflict"
  | "persistence_ambiguous"
  | "unavailable";

export class AstroCandidatePromotionError extends Error {
  readonly code: AstroCandidatePromotionErrorCode;
  readonly blockerCodes: string[];

  constructor(code: AstroCandidatePromotionErrorCode, message: string, blockerCodes: string[] = [code]) {
    super(message);
    this.name = "AstroCandidatePromotionError";
    this.code = code;
    this.blockerCodes = blockerCodes;
  }
}

export function createAstroCandidatePromotionService(dependencies: AstroCandidatePromotionDependencies) {
  return async function promoteAstroCandidate(
    rawInput: AstroCandidatePromotionInput,
  ): Promise<AstroCandidatePromotionResult> {
    const input = validateInput(rawInput);
    const ownership = await dependencies.resolveOwnership({ siteVersionId: input.siteVersionId });
    if (ownership.siteVersionId !== input.siteVersionId) {
      throw promotionError("ownership_mismatch", "Authoritative ownership does not match the selected site version.");
    }

    const record = await dependencies.readCandidate({
      candidateId: input.candidateId,
      trustedScope: ownership,
    });
    if (!sameOwnership(record.identity, ownership)) {
      throw promotionError("ownership_mismatch", "Candidate ownership does not match the authoritative scope.");
    }
    if (
      record.candidate.contentSha256 !== input.expectedContentSha256 ||
      record.storageSha256 !== input.expectedStorageSha256
    ) {
      throw promotionError("candidate_hash_mismatch", "Selected candidate hashes do not match the stored immutable record.");
    }

    const initial = await readRuntimeContext(dependencies.runtimeStore, input.siteVersionId);
    assertRuntimeContext(initial, ownership);
    const artifact = initial.artifact!;
    const existingEvidence = readAstroRuntimeArtifactPromotionEvidence(artifact.manifest);
    if (existingEvidence) {
      if (samePromotedCandidate(existingEvidence, record) && preservesCandidateBytes(artifact, record)) {
        return resultFromStoredContext({ context: initial, record, status: "idempotent" });
      }
      throw promotionError(
        "promotion_conflict",
        "The selected site version already contains a different promoted Astro candidate.",
      );
    }
    if (initial.activePointerReferencesArtifact || initial.previewBindingCount > 0) {
      throw promotionError(
        "runtime_artifact_in_use",
        "The existing runtime artifact is referenced by an active pointer or preview binding.",
        [
          ...(initial.activePointerReferencesArtifact ? ["runtime_artifact_active_pointer_reference"] : []),
          ...(initial.previewBindingCount > 0 ? ["runtime_artifact_preview_binding_reference"] : []),
        ],
      );
    }

    const integrity = runRenderIntegrityGate({
      siteVersion: initial.siteVersion,
      htmlByPath: record.candidate.htmlByPath,
      assetFingerprintMap: record.candidate.assetFingerprintMap,
    });
    if (!integrity.ok) {
      throw promotionError(
        "render_integrity_denied",
        "Stored Astro output failed the runtime render-integrity gate.",
        integrity.issues.map((issue) => `render_integrity:${issue.code}:${issue.pagePath ?? "unknown"}`),
      );
    }

    const governance = evaluateGovernance(initial);
    const promotionIdentitySha256 = sha256Hex(stableStringify({
      version: ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
      candidateId: record.identity.candidateId,
      siteVersionId: record.identity.siteVersionId,
      candidateContentSha256: record.candidate.contentSha256,
      candidateStorageSha256: record.storageSha256,
    }));
    const evidence: AstroRuntimeArtifactPromotionEvidence = {
      version: ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
      candidateId: record.identity.candidateId,
      candidateContentSha256: record.candidate.contentSha256,
      candidateStorageSha256: record.storageSha256,
      sourceSnapshotSha256: record.candidate.manifest.provenance.sourceSnapshotSha256,
      exportSha256: record.candidate.manifest.provenance.exportSha256,
      convertedArtifactSha256: record.candidate.manifest.provenance.convertedArtifactSha256,
      promotionIdentitySha256,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      htmlTransformation: "none",
      governanceEvaluation: {
        status: governance.status,
        decision: governance.decision,
        blockerCodes: governance.blockerCodes,
      },
    };
    const manifest: Record<string, unknown> = {
      siteId: ownership.runtimeSiteId,
      siteVersionId: ownership.siteVersionId,
      rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
      renderMode: "PUBLISH",
      generatedAt: "deterministic",
      paths: ["/"],
      assetFingerprints: structuredClone(record.candidate.assetFingerprintMap),
      artifactSource: "astro_candidate_materialization",
      astroCandidateManifest: structuredClone(record.candidate.manifest),
      astroCandidateRecord: {
        schemaVersion: record.schemaVersion,
        recordKind: record.recordKind,
        identity: structuredClone(record.identity),
        registration: structuredClone(record.registration),
        storageSha256: record.storageSha256,
      },
      astroCandidatePromotion: evidence,
      publishStage: "shadow",
      shadowRestricted: governance.shadowRestricted,
      enforcementDecision: governance.decision,
    };
    const bundleSha256 = computeRuntimeArtifactBundleSha256({
      htmlByPath: record.candidate.htmlByPath,
      compiledTokenStyles: record.candidate.compiledTokenStyles,
      assetFingerprintMap: record.candidate.assetFingerprintMap,
      manifest,
    });
    const target: RuntimeArtifact = {
      ...artifact,
      siteId: ownership.runtimeSiteId,
      siteVersionId: ownership.siteVersionId,
      rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
      htmlByPath: structuredClone(record.candidate.htmlByPath),
      compiledTokenStyles: record.candidate.compiledTokenStyles,
      assetFingerprintMap: structuredClone(record.candidate.assetFingerprintMap),
      manifest,
      publishStage: "shadow",
      shadowRestricted: governance.shadowRestricted,
      artifactGovernance: governance.artifactGovernance,
      bundleSha256,
    };

    const write = await dependencies.runtimeStore.compareAndSetArtifact({
      expectedBundleSha256: artifact.bundleSha256,
      artifact: target,
    });
    const reconciled = await readRuntimeContext(dependencies.runtimeStore, input.siteVersionId);
    assertRuntimeContext(reconciled, ownership);
    const reconciledEvidence = readAstroRuntimeArtifactPromotionEvidence(reconciled.artifact?.manifest);
    if (
      reconciledEvidence &&
      samePromotedCandidate(reconciledEvidence, record) &&
      preservesCandidateBytes(reconciled.artifact!, record) &&
      reconciled.artifact!.bundleSha256 === bundleSha256
    ) {
      return resultFromStoredContext({
        context: reconciled,
        record,
        status: write === "updated" ? "materialized" : "idempotent",
      });
    }
    if (write === "not_updated") {
      throw promotionError("promotion_conflict", "Concurrent promotion changed the runtime artifact.");
    }
    throw promotionError(
      write === "unavailable" ? "persistence_ambiguous" : "unavailable",
      "Runtime artifact persistence could not be reconciled to the requested promotion.",
    );
  };
}

function evaluateGovernance(context: AstroCandidateRuntimeArtifactContext): {
  status: "evaluated" | "blocked";
  decision: string | null;
  blockerCodes: string[];
  shadowRestricted: boolean;
  artifactGovernance: RuntimeArtifact["artifactGovernance"];
} {
  try {
    const evaluated = evaluatePublishEnforcement({ siteVersion: context.siteVersion, stage: "shadow" });
    return {
      status: "evaluated",
      decision: evaluated.adapter.decision,
      blockerCodes: evaluated.adapter.decision === "DENY" ? ["publish_enforcement_denied"] : [],
      shadowRestricted: evaluated.shadowRestricted || evaluated.adapter.decision === "DENY",
      artifactGovernance: evaluated.artifactGovernance,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "publish_enforcement_evaluation_failed";
    const blocker = message.includes("requires page migration governance")
      ? "page_migration_governance_missing"
      : "publish_enforcement_evaluation_failed";
    return {
      status: "blocked",
      decision: null,
      blockerCodes: [blocker],
      shadowRestricted: true,
      artifactGovernance: {} as RuntimeArtifact["artifactGovernance"],
    };
  }
}

function resultFromStoredContext(input: {
  context: AstroCandidateRuntimeArtifactContext;
  record: AstroProductionCandidateRecord;
  status: "materialized" | "idempotent";
}): AstroCandidatePromotionResult {
  const artifact = input.context.artifact!;
  const evidence = readAstroRuntimeArtifactPromotionEvidence(artifact.manifest)!;
  const serving = evaluateRuntimeArtifactServingEligibility({ artifact, servingStage: "shadow" });
  const blockerCodes = [
    ...evidence.governanceEvaluation.blockerCodes,
    ...(["APPROVED", "PUBLISHED"].includes(input.context.siteVersion.state)
      ? []
      : [`site_version_state_${input.context.siteVersion.state.toLowerCase()}`]),
    ...(serving.allow ? [] : [serving.reason]),
  ];
  return {
    status: input.status,
    candidateId: input.record.identity.candidateId,
    siteId: input.record.identity.runtimeSiteId,
    siteVersionId: input.record.identity.siteVersionId,
    runtimeArtifactId: artifact.id,
    runtimeBundleSha256: artifact.bundleSha256,
    candidateContentSha256: input.record.candidate.contentSha256,
    candidateStorageSha256: input.record.storageSha256,
    sourceSnapshotSha256: input.record.candidate.manifest.provenance.sourceSnapshotSha256,
    exportSha256: input.record.candidate.manifest.provenance.exportSha256,
    convertedArtifactSha256: input.record.candidate.manifest.provenance.convertedArtifactSha256,
    htmlPreservedExactly: true,
    cssPreservedExactly: true,
    materialization: "complete",
    persistence: "complete",
    governance: {
      status: evidence.governanceEvaluation.status,
      decision: evidence.governanceEvaluation.decision,
      blockerCodes: [...evidence.governanceEvaluation.blockerCodes],
    },
    workflowHandoff: {
      recognized: true,
      approvalState: input.context.siteVersion.state,
      publishStage: "shadow",
      servingEligible: serving.allow,
      servingEligibilityReason: serving.reason,
      readyForShadowActivation: blockerCodes.length === 0,
      blockerCodes: [...new Set(blockerCodes)].sort(),
    },
    activePointerChanged: false,
    previewBindingsChanged: false,
    published: false,
  };
}

function validateInput(input: AstroCandidatePromotionInput): AstroCandidatePromotionInput {
  for (const value of [input.actorUserId, input.siteVersionId, input.candidateId, input.idempotencyKey]) {
    if (!boundedText(value)) throw promotionError("invalid_request", "Promotion selection is invalid.");
  }
  if (!SHA256_PATTERN.test(input.expectedContentSha256) || !SHA256_PATTERN.test(input.expectedStorageSha256)) {
    throw promotionError("invalid_request", "Promotion hash selection is invalid.");
  }
  return { ...input };
}

async function readRuntimeContext(
  store: AstroCandidateRuntimeArtifactStore,
  siteVersionId: string,
): Promise<AstroCandidateRuntimeArtifactContext> {
  let context: AstroCandidateRuntimeArtifactContext | null;
  try {
    context = await store.readContext(siteVersionId);
  } catch (error) {
    if (error instanceof AstroCandidatePromotionError) throw error;
    throw promotionError("unavailable", "Runtime artifact context is unavailable.");
  }
  if (!context) throw promotionError("runtime_context_missing", "Selected runtime site version does not exist.");
  return context;
}

function assertRuntimeContext(
  context: AstroCandidateRuntimeArtifactContext,
  ownership: AstroProductionCandidateOwnership,
): void {
  if (context.siteVersion.id !== ownership.siteVersionId || context.siteVersion.siteId !== ownership.runtimeSiteId) {
    throw promotionError("ownership_mismatch", "Runtime artifact context does not match authoritative ownership.");
  }
  if (!context.siteVersion.artifactId || !context.artifact) {
    throw promotionError(
      "runtime_artifact_binding_missing",
      "Selected site version has no existing runtime artifact insertion point.",
    );
  }
  if (
    context.artifact.id !== context.siteVersion.artifactId ||
    context.artifact.siteId !== ownership.runtimeSiteId ||
    context.artifact.siteVersionId !== ownership.siteVersionId
  ) {
    throw promotionError("runtime_artifact_lineage_mismatch", "Runtime artifact binding lineage is inconsistent.");
  }
}

function sameOwnership(
  identity: AstroProductionCandidateRecord["identity"],
  ownership: AstroProductionCandidateOwnership,
): boolean {
  return identity.runtimeSiteId === ownership.runtimeSiteId &&
    identity.siteVersionId === ownership.siteVersionId &&
    identity.ownershipSiteId === ownership.ownershipSiteId &&
    identity.organizationId === ownership.organizationId &&
    identity.agencyId === ownership.agencyId;
}

function samePromotedCandidate(
  evidence: AstroRuntimeArtifactPromotionEvidence,
  record: AstroProductionCandidateRecord,
): boolean {
  return evidence.candidateId === record.identity.candidateId &&
    evidence.candidateContentSha256 === record.candidate.contentSha256 &&
    evidence.candidateStorageSha256 === record.storageSha256;
}

function preservesCandidateBytes(artifact: RuntimeArtifact, record: AstroProductionCandidateRecord): boolean {
  return stableStringify(artifact.htmlByPath) === stableStringify(record.candidate.htmlByPath) &&
    artifact.compiledTokenStyles === record.candidate.compiledTokenStyles &&
    stableStringify(artifact.assetFingerprintMap) === stableStringify(record.candidate.assetFingerprintMap);
}

function boundedText(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_IDENTITY_LENGTH &&
    value === value.trim() &&
    !value.includes("\0");
}

function promotionError(
  code: AstroCandidatePromotionErrorCode,
  message: string,
  blockers?: string[],
): AstroCandidatePromotionError {
  return new AstroCandidatePromotionError(code, message, blockers);
}
