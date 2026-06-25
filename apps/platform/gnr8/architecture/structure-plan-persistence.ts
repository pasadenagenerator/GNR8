/**
 * Phase 8F-6 Structure Plan persistence.
 *
 * Stores validated, metadata-only Structure Plans in the existing site-version
 * import-provenance boundary. It does not plan content, plan layout, generate,
 * execute, call AI systems, dispatch workers, change schema, or publish.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { validateReconstructionPackage, type ReconstructionPackage } from "./reconstruction-package-contract";
import {
  validateStructurePlan,
  type StructurePlan,
  type StructurePlanCandidateRef,
  type StructurePlanValidationResult,
} from "./structure-plan-contract";

export const STRUCTURE_PLAN_ARTIFACT_KIND = "structure_plan" as const;

export type StructurePlanArtifactRecord = {
  kind: typeof STRUCTURE_PLAN_ARTIFACT_KIND;
  artifactKind: typeof STRUCTURE_PLAN_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  structurePlanId: string;
  reconstructionPackageArtifactId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
  status: "valid" | "blocked";
  plannedRouteCount: number;
  plannedNavigationCount: number;
  plannedSectionCount: number;
  assignmentCount: number;
  blockedCandidateCount: number;
  contractVersion: string;
  createdAt: string;
  persistedAt: string;
  plan: StructurePlan;
  validation: StructurePlanValidationResult;
  diagnostics: string[];
};

export type StructurePlanArtifactReference = Omit<StructurePlanArtifactRecord, "plan">;

export type StructurePlanProvenanceSummary = RuntimeImportProvenanceSummary & {
  structurePlanArtifacts?: StructurePlanArtifactRecord[];
  latestStructurePlanArtifact?: StructurePlanArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

type ReconstructionPackageArtifactRecordLike = {
  kind: "reconstruction_package";
  artifactKind: "reconstruction_package";
  artifactVersion: 1;
  artifactId: string;
  reconstructionPackageId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
  status: "valid" | "blocked";
  contractVersion: string;
  package: ReconstructionPackage;
};

export type StructurePlanPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class StructurePlanPersistenceValidationError extends Error {
  readonly validation: StructurePlanValidationResult;

  constructor(validation: StructurePlanValidationResult) {
    super("StructurePlan is invalid and was not persisted.");
    this.name = "StructurePlanPersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
  collectionKey: "reconstructionPackageArtifacts" | "structurePlanArtifacts",
  latestKey: "latestReconstructionPackageArtifact" | "latestStructurePlanArtifact",
): unknown[] {
  const provenance = summary as Record<string, unknown> | null | undefined;
  const values: unknown[] = [];
  if (Array.isArray(provenance?.[collectionKey])) values.push(...provenance[collectionKey]);
  if (provenance?.[latestKey] !== undefined) values.push(provenance[latestKey]);
  return values;
}

function isValidReconstructionPackageArtifact(value: unknown): value is ReconstructionPackageArtifactRecordLike {
  if (!isRecord(value)) return false;
  const artifact = value as Partial<ReconstructionPackageArtifactRecordLike> & {
    validation?: { valid?: unknown };
  };
  return artifact.kind === "reconstruction_package" &&
    artifact.artifactKind === "reconstruction_package" &&
    artifact.artifactVersion === 1 &&
    (artifact.status === "valid" || artifact.status === "blocked") &&
    artifact.validation?.valid === true &&
    artifact.package !== undefined &&
    validateReconstructionPackage(artifact.package).valid &&
    artifact.reconstructionPackageId === artifact.package.reconstructionPackageId &&
    artifact.candidateReviewPackageArtifactId === artifact.package.candidateReviewPackageArtifactId &&
    artifact.candidateDiscoveryArtifactId === artifact.package.candidateDiscoveryArtifactId &&
    artifact.siteVersionId === artifact.package.siteVersionId &&
    artifact.dryRunId === artifact.package.dryRunId &&
    artifact.status === artifact.package.reconstructionPackageStatus;
}

function readReconstructionPackageArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): ReconstructionPackageArtifactRecordLike[] {
  return readArtifactValues(summary, "reconstructionPackageArtifacts", "latestReconstructionPackageArtifact")
    .filter(isValidReconstructionPackageArtifact);
}

function readReconstructionPackageArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  artifactId: string;
}): ReconstructionPackageArtifactRecordLike | null {
  return readReconstructionPackageArtifacts(input.summary).find((artifact) =>
    artifact.artifactId === input.artifactId) ?? null;
}

function selectLatestReconstructionPackageArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  dryRunId: string;
}): ReconstructionPackageArtifactRecordLike | null {
  const provenance = input.summary as Record<string, unknown> | null | undefined;
  const pointer = provenance?.latestReconstructionPackageArtifact;
  if (
    isValidReconstructionPackageArtifact(pointer) &&
    pointer.siteVersionId === input.siteVersionId &&
    pointer.dryRunId === input.dryRunId
  ) {
    return pointer;
  }

  return readReconstructionPackageArtifacts(input.summary)
    .filter((artifact) => artifact.siteVersionId === input.siteVersionId && artifact.dryRunId === input.dryRunId)
    .slice()
    .sort((left, right) =>
      String((left as { persistedAt?: string }).persistedAt ?? "").localeCompare(
        String((right as { persistedAt?: string }).persistedAt ?? ""),
      ) ||
      left.artifactId.localeCompare(right.artifactId))
    .at(-1) ?? null;
}

function toStructurePlanCandidateRef(candidateRef: ReconstructionPackage["approvedCandidateRefs"][number]): StructurePlanCandidateRef {
  return {
    candidateId: candidateRef.candidateId,
    candidateType: candidateRef.candidateType,
    ...(candidateRef.routePath !== undefined ? { routePath: candidateRef.routePath } : {}),
    decisionReviewEventId: candidateRef.decisionReviewEventId,
    ...(candidateRef.sourceCandidateRefs !== undefined ? { sourceCandidateRefs: [...candidateRef.sourceCandidateRefs] } : {}),
    ...(candidateRef.evidenceRefs !== undefined ? { evidenceRefs: [...candidateRef.evidenceRefs] } : {}),
  };
}

function mergeValidation(input: {
  validation: StructurePlanValidationResult;
  siteVersionId: string;
  dryRunId: string;
  reconstructionPackageArtifactId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  contractVersion: string;
  plan: StructurePlan;
  reconstructionPackageArtifact: ReconstructionPackageArtifactRecordLike | null;
  latestReconstructionPackageArtifact: ReconstructionPackageArtifactRecordLike | null;
}): StructurePlanValidationResult {
  const errors = [...input.validation.errors];
  const plan = input.plan;

  if (plan.structurePlanStatus !== "valid" && plan.structurePlanStatus !== "blocked") {
    errors.push("structurePlanStatus must be valid or blocked for persistence");
  }
  if (plan.siteVersionId !== input.siteVersionId) {
    errors.push("plan.siteVersionId must match persisted siteVersionId");
  }
  if (plan.dryRunId !== input.dryRunId) {
    errors.push("plan.dryRunId must match persisted dryRunId");
  }
  if (plan.reconstructionPackageArtifactId !== input.reconstructionPackageArtifactId) {
    errors.push("plan.reconstructionPackageArtifactId must match persisted reconstructionPackageArtifactId");
  }
  if (plan.candidateReviewPackageArtifactId !== input.candidateReviewPackageArtifactId) {
    errors.push("plan.candidateReviewPackageArtifactId must match persisted candidateReviewPackageArtifactId");
  }
  if (plan.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId) {
    errors.push("plan.candidateDiscoveryArtifactId must match persisted candidateDiscoveryArtifactId");
  }
  if (plan.contractVersion !== input.contractVersion) {
    errors.push("plan.contractVersion must match persisted contractVersion");
  }

  const reconstructionArtifact = input.reconstructionPackageArtifact;
  const reconstructionPackage = reconstructionArtifact?.package;
  if (!reconstructionArtifact || !reconstructionPackage || !validateReconstructionPackage(reconstructionPackage).valid) {
    errors.push("reconstructionPackageArtifactId must reference a valid persisted Reconstruction Package artifact");
  } else {
    if (
      reconstructionArtifact.siteVersionId !== input.siteVersionId ||
      reconstructionPackage.siteVersionId !== input.siteVersionId
    ) {
      errors.push("Reconstruction Package artifact siteVersionId must match persisted siteVersionId");
    }
    if (
      reconstructionArtifact.dryRunId !== input.dryRunId ||
      reconstructionPackage.dryRunId !== input.dryRunId
    ) {
      errors.push("Reconstruction Package artifact dryRunId must match persisted dryRunId");
    }
    if (
      reconstructionArtifact.candidateReviewPackageArtifactId !== input.candidateReviewPackageArtifactId ||
      reconstructionPackage.candidateReviewPackageArtifactId !== input.candidateReviewPackageArtifactId
    ) {
      errors.push("Reconstruction Package artifact candidateReviewPackageArtifactId must match persisted candidateReviewPackageArtifactId");
    }
    if (
      reconstructionArtifact.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId ||
      reconstructionPackage.candidateDiscoveryArtifactId !== input.candidateDiscoveryArtifactId
    ) {
      errors.push("Reconstruction Package artifact candidateDiscoveryArtifactId must match persisted candidateDiscoveryArtifactId");
    }
    if (plan.lineage.reconstructionPackageId !== reconstructionPackage.reconstructionPackageId) {
      errors.push("plan.lineage.reconstructionPackageId must match the Reconstruction Package");
    }
    if (plan.lineage.reconstructionPackageStatus !== reconstructionPackage.reconstructionPackageStatus) {
      errors.push("plan.lineage.reconstructionPackageStatus must match the Reconstruction Package");
    }
    if (plan.lineage.reconstructionPackageContractVersion !== reconstructionPackage.contractVersion) {
      errors.push("plan.lineage.reconstructionPackageContractVersion must match the Reconstruction Package contractVersion");
    }
    if (
      stableStringify(plan.lineage.includedCandidateRefs) !==
      stableStringify(reconstructionPackage.approvedCandidateRefs.map(toStructurePlanCandidateRef))
    ) {
      errors.push("plan.lineage.includedCandidateRefs must match the Reconstruction Package approvedCandidateRefs");
    }
    if (plan.lineage.includedCandidateRefs.length !== reconstructionPackage.eligibilitySummary.includedCount) {
      errors.push("plan.lineage.includedCandidateRefs must reconcile with Reconstruction Package includedCount");
    }
  }

  if (input.latestReconstructionPackageArtifact?.artifactId !== input.reconstructionPackageArtifactId) {
    errors.push("reconstructionPackageArtifactId must match the latest Reconstruction Package artifact for this lineage");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticPlan(plan: StructurePlan): Omit<StructurePlan, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = plan;
  return semantic;
}

function semanticFingerprint(input: {
  plan: StructurePlan;
  contractVersion: string;
}): string {
  return sha256Hex(stableStringify({
    plan: semanticPlan(input.plan),
    contractVersion: input.contractVersion,
  }));
}

function createArtifactId(input: {
  plan: StructurePlan;
  contractVersion: string;
  persistedAt: string;
}): string {
  return `structure_plan_${sha256Hex(stableStringify(input)).slice(0, 32)}`;
}

function blockedCandidateCount(plan: StructurePlan): number {
  const unresolvedAssignmentCount = plan.assignments.filter((assignment) => assignment.targetKind === "unresolved").length;
  return plan.structurePlanStatus === "blocked"
    ? plan.lineage.includedCandidateRefs.length + unresolvedAssignmentCount
    : unresolvedAssignmentCount;
}

function toArtifactReference(artifact: StructurePlanArtifactRecord): StructurePlanArtifactReference {
  const { plan: _plan, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is StructurePlanArtifactRecord {
  if (!isRecord(value)) return false;
  const artifact = value as Partial<StructurePlanArtifactRecord>;
  return artifact.kind === STRUCTURE_PLAN_ARTIFACT_KIND &&
    artifact.artifactKind === STRUCTURE_PLAN_ARTIFACT_KIND &&
    artifact.artifactVersion === 1 &&
    (artifact.status === "valid" || artifact.status === "blocked") &&
    artifact.validation?.valid === true &&
    artifact.plan !== undefined &&
    validateStructurePlan(artifact.plan).valid &&
    artifact.structurePlanId === artifact.plan.structurePlanId &&
    artifact.reconstructionPackageArtifactId === artifact.plan.reconstructionPackageArtifactId &&
    artifact.candidateReviewPackageArtifactId === artifact.plan.candidateReviewPackageArtifactId &&
    artifact.candidateDiscoveryArtifactId === artifact.plan.candidateDiscoveryArtifactId &&
    artifact.siteVersionId === artifact.plan.siteVersionId &&
    artifact.dryRunId === artifact.plan.dryRunId &&
    artifact.status === artifact.plan.structurePlanStatus;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): StructurePlanArtifactRecord[] {
  const provenance = summary as StructurePlanProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.structurePlanArtifacts)
    ? provenance.structurePlanArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as StructurePlanProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.structurePlanArtifacts)
    ? provenance.structurePlanArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: StructurePlanArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): StructurePlanArtifactRecord | null {
  return input.artifacts
    .filter((artifact) =>
      artifact.siteVersionId === input.siteVersionId &&
      (input.dryRunId === undefined || artifact.dryRunId === input.dryRunId))
    .slice()
    .sort((left, right) =>
      left.persistedAt.localeCompare(right.persistedAt) ||
      left.artifactId.localeCompare(right.artifactId))
    .at(-1) ?? null;
}

function readLatestPointer(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  dryRunId?: string;
}): StructurePlanArtifactRecord | null {
  const provenance = input.summary as StructurePlanProvenanceSummary | null | undefined;
  const artifact = provenance?.latestStructurePlanArtifact;
  if (!isValidArtifact(artifact) || artifact.siteVersionId !== input.siteVersionId) return null;
  if (input.dryRunId !== undefined && artifact.dryRunId !== input.dryRunId) return null;
  return artifact;
}

async function defaultGetSiteVersion(
  siteVersionId: string,
  options: RuntimeStoreDbOptions,
): Promise<PersistenceSiteVersion | null> {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultSetSiteVersionImportProvenanceSummary(
  input: { siteVersionId: string; importProvenanceSummary: RuntimeImportProvenanceSummary },
  options: RuntimeStoreDbOptions,
): Promise<{ affectedRows: number }> {
  const { setSiteVersionImportProvenanceSummary } = await import("../runtime/runtime-store");
  return setSiteVersionImportProvenanceSummary(input, options);
}

export async function persistStructurePlan(input: {
  siteVersionId: string;
  dryRunId: string;
  reconstructionPackageArtifactId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  plan: StructurePlan;
  contractVersion: string;
  options?: StructurePlanPersistenceOptions;
}): Promise<StructurePlanArtifactReference> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Structure Plan persistence: ${input.siteVersionId}`);
  }

  const validation = mergeValidation({
    validation: validateStructurePlan(input.plan),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    reconstructionPackageArtifactId: input.reconstructionPackageArtifactId,
    candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    contractVersion: input.contractVersion,
    plan: input.plan,
    reconstructionPackageArtifact: readReconstructionPackageArtifact({
      summary: siteVersion.importProvenanceSummary,
      artifactId: input.reconstructionPackageArtifactId,
    }),
    latestReconstructionPackageArtifact: selectLatestReconstructionPackageArtifact({
      summary: siteVersion.importProvenanceSummary,
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
    }),
  });
  if (!validation.valid) throw new StructurePlanPersistenceValidationError(validation);

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const latestForDryRun = readLatestPointer({
    summary: existingSummary,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  }) ?? selectLatestArtifact({
      artifacts: previousArtifacts,
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
    });
  const fingerprint = semanticFingerprint({
    plan: input.plan,
    contractVersion: input.contractVersion,
  });
  if (
    latestForDryRun &&
    latestForDryRun.reconstructionPackageArtifactId === input.reconstructionPackageArtifactId &&
    latestForDryRun.structurePlanId === input.plan.structurePlanId &&
    latestForDryRun.contractVersion === input.contractVersion
  ) {
    if (semanticFingerprint({
      plan: latestForDryRun.plan,
      contractVersion: latestForDryRun.contractVersion,
    }) === fingerprint) {
      return toArtifactReference(latestForDryRun);
    }
    throw new StructurePlanPersistenceValidationError({
      valid: false,
      errors: ["StructurePlan content diverges for the same Reconstruction Package artifact and contract version"],
      warnings: [...validation.warnings],
    });
  }

  const status = input.plan.structurePlanStatus;
  if (status !== "valid" && status !== "blocked") {
    throw new StructurePlanPersistenceValidationError(validation);
  }

  const persistedAt = options.persistedAt ?? new Date().toISOString();
  const artifact: StructurePlanArtifactRecord = {
    kind: STRUCTURE_PLAN_ARTIFACT_KIND,
    artifactKind: STRUCTURE_PLAN_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({
      plan: input.plan,
      contractVersion: input.contractVersion,
      persistedAt,
    }),
    structurePlanId: input.plan.structurePlanId,
    reconstructionPackageArtifactId: input.reconstructionPackageArtifactId,
    candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    status,
    plannedRouteCount: input.plan.plannedRoutes.length,
    plannedNavigationCount: input.plan.plannedNavigation.length,
    plannedSectionCount: input.plan.plannedSections.length,
    assignmentCount: input.plan.assignments.length,
    blockedCandidateCount: blockedCandidateCount(input.plan),
    contractVersion: input.contractVersion,
    createdAt: input.plan.createdAt,
    persistedAt,
    plan: cloneJson(input.plan),
    validation: cloneJson(validation),
    diagnostics: ["STRUCTURE_PLAN_VALIDATION_PASSED"],
  };
  const nextSummary: StructurePlanProvenanceSummary = {
    ...existingSummary,
    structurePlanArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifact,
    ] as StructurePlanArtifactRecord[],
    latestStructurePlanArtifact: artifact,
  };

  const write = options.setSiteVersionImportProvenanceSummary
    ? await options.setSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      })
    : await defaultSetSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      }, options);
  if (write.affectedRows <= 0) {
    throw new Error(`Structure Plan persistence affected 0 rows for site version ${input.siteVersionId}`);
  }
  return toArtifactReference(artifact);
}

export async function loadLatestStructurePlan(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: StructurePlanPersistenceOptions;
}): Promise<StructurePlanArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readLatestPointer({
    summary: siteVersion.importProvenanceSummary,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  }) ?? selectLatestArtifact({
      artifacts: readArtifacts(siteVersion.importProvenanceSummary),
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
    });
  return artifact ? cloneJson(artifact) : null;
}

export async function loadStructurePlanById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: StructurePlanPersistenceOptions;
}): Promise<StructurePlanArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
