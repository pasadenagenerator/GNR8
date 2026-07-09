/**
 * Phase MVP-1H Provider Generation Payload artifact persistence.
 *
 * Stores validated ProviderGenerationPayload artifacts in the existing
 * site-version import-provenance boundary. It adds no schema, provider calls,
 * prompt execution, generated website persistence, compliance, approval,
 * publishing, UI, API, worker, DNS, deployment, or production mutation.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_VERSION } from "./codex-task-provider-payload-builder";
import {
  validateProviderGenerationPayload,
  type ProviderGenerationPayload,
  type ProviderGenerationPayloadStatus,
  type ProviderGenerationPayloadValidationResult,
} from "./provider-generation-payload-contract";

export const PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND = "provider_generation_payload" as const;

export type ProviderGenerationPayloadArtifactRecord = {
  kind: typeof PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND;
  artifactKind: typeof PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  providerGenerationPayloadId: string;
  providerType: "codex";
  payloadKind: "codex_task";
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  sourceGenerationImprovementPlanId?: string;
  sourceGenerationImprovementPlanArtifactId?: string;
  status: Exclude<ProviderGenerationPayloadStatus, "invalid" | "stale">;
  constraintCount: number;
  validationExpectationCount: number;
  limitationCount: number;
  contractVersion: string;
  runtimeVersion: string;
  createdAt: string;
  persistedAt: string;
  artifact: ProviderGenerationPayload;
  validation: ProviderGenerationPayloadValidationResult;
  diagnostics: string[];
};

export type ProviderGenerationPayloadArtifactReference = Omit<ProviderGenerationPayloadArtifactRecord, "artifact">;

export type ProviderGenerationPayloadProvenanceSummary = RuntimeImportProvenanceSummary & {
  providerGenerationPayloadArtifacts?: ProviderGenerationPayloadArtifactRecord[];
  latestProviderGenerationPayloadArtifact?: ProviderGenerationPayloadArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type ProviderGenerationPayloadPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class ProviderGenerationPayloadPersistenceValidationError extends Error {
  readonly validation: ProviderGenerationPayloadValidationResult;

  constructor(validation: ProviderGenerationPayloadValidationResult) {
    super("ProviderGenerationPayload is invalid and was not persisted.");
    this.name = "ProviderGenerationPayloadPersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mergeValidation(input: {
  validation: ProviderGenerationPayloadValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: ProviderGenerationPayload;
}): ProviderGenerationPayloadValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Provider Generation Payload status must not be invalid or stale for persistence");
  }
  if (input.artifact.siteVersionId !== input.siteVersionId) {
    errors.push("artifact.siteVersionId must match persisted siteVersionId");
  }
  if (input.artifact.dryRunId !== input.dryRunId) {
    errors.push("artifact.dryRunId must match persisted dryRunId");
  }
  if (input.artifact.lineage.siteVersionId !== input.siteVersionId) {
    errors.push("artifact.lineage.siteVersionId must match persisted siteVersionId");
  }
  if (input.artifact.lineage.dryRunId !== input.dryRunId) {
    errors.push("artifact.lineage.dryRunId must match persisted dryRunId");
  }
  if (input.artifact.sourceWebsiteGenerationPackageId !== input.artifact.lineage.sourceWebsiteGenerationPackageId) {
    errors.push("artifact.sourceWebsiteGenerationPackageId must match artifact.lineage.sourceWebsiteGenerationPackageId");
  }
  if (input.artifact.sourceWebsiteGenerationPackageArtifactId !== input.artifact.lineage.sourceWebsiteGenerationPackageArtifactId) {
    errors.push("artifact.sourceWebsiteGenerationPackageArtifactId must match artifact.lineage.sourceWebsiteGenerationPackageArtifactId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(artifact: ProviderGenerationPayload): Omit<ProviderGenerationPayload, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function runtimeVersionForArtifact(artifact: ProviderGenerationPayload): string {
  const diagnostic = artifact.diagnostics.find((item) =>
    item.startsWith("PROVIDER_GENERATION_PAYLOAD_V2_RUNTIME_VERSION:"));
  return diagnostic?.split(":").slice(1).join(":") || CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_VERSION;
}

function semanticFingerprint(artifact: ProviderGenerationPayload): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: runtimeVersionForArtifact(artifact),
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: ProviderGenerationPayload;
  persistedAt: string;
}): string {
  return `provider_generation_payload_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: runtimeVersionForArtifact(input.artifact),
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(artifact: ProviderGenerationPayloadArtifactRecord): ProviderGenerationPayloadArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is ProviderGenerationPayloadArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<ProviderGenerationPayloadArtifactRecord>;
  if (record.kind !== PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND) return false;
  if (record.artifactKind !== PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "draft" &&
    record.status !== "ready" &&
    record.status !== "valid" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateProviderGenerationPayload(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.providerGenerationPayloadId !== record.providerGenerationPayloadId) return false;
  if (record.artifact.providerType !== record.providerType) return false;
  if (record.artifact.payloadKind !== record.payloadKind) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageId !== record.sourceWebsiteGenerationPackageId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageArtifactId !== record.sourceWebsiteGenerationPackageArtifactId) return false;
  if (record.artifact.sourceGenerationImprovementPlanId !== record.sourceGenerationImprovementPlanId) return false;
  if (record.artifact.sourceGenerationImprovementPlanArtifactId !== record.sourceGenerationImprovementPlanArtifactId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): ProviderGenerationPayloadArtifactRecord[] {
  const provenance = summary as ProviderGenerationPayloadProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.providerGenerationPayloadArtifacts)
    ? provenance.providerGenerationPayloadArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as ProviderGenerationPayloadProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.providerGenerationPayloadArtifacts)
    ? provenance.providerGenerationPayloadArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: ProviderGenerationPayloadArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): ProviderGenerationPayloadArtifactRecord | null {
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

export async function persistProviderGenerationPayload(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: ProviderGenerationPayload;
  options?: ProviderGenerationPayloadPersistenceOptions;
}): Promise<ProviderGenerationPayloadArtifactReference> {
  const validation = mergeValidation({
    validation: validateProviderGenerationPayload(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new ProviderGenerationPayloadPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Provider Generation Payload persistence: ${input.siteVersionId}`);
  }

  const existingSummary = siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const latest = selectLatestArtifact({
    artifacts: previousArtifacts,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });
  const fingerprint = semanticFingerprint(input.artifact);
  if (latest && semanticFingerprint(latest.artifact) === fingerprint) {
    return toArtifactReference(latest);
  }

  const persistedAt = options.persistedAt ?? new Date().toISOString();
  const artifactRecord: ProviderGenerationPayloadArtifactRecord = {
    kind: PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND,
    artifactKind: PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    providerGenerationPayloadId: input.artifact.providerGenerationPayloadId,
    providerType: input.artifact.providerType,
    payloadKind: input.artifact.payloadKind,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceWebsiteGenerationPackageId: input.artifact.sourceWebsiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.artifact.sourceWebsiteGenerationPackageArtifactId,
    sourceGenerationImprovementPlanId: input.artifact.sourceGenerationImprovementPlanId,
    sourceGenerationImprovementPlanArtifactId: input.artifact.sourceGenerationImprovementPlanArtifactId,
    status: input.artifact.status as ProviderGenerationPayloadArtifactRecord["status"],
    constraintCount: input.artifact.preservedConstraints.length,
    validationExpectationCount: input.artifact.validationExpectations.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: runtimeVersionForArtifact(input.artifact),
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["PROVIDER_GENERATION_PAYLOAD_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: ProviderGenerationPayloadProvenanceSummary = {
    ...existingSummary,
    providerGenerationPayloadArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as ProviderGenerationPayloadArtifactRecord[],
    latestProviderGenerationPayloadArtifact: artifactRecord,
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
    throw new Error(`Provider Generation Payload persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestProviderGenerationPayload(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: ProviderGenerationPayloadPersistenceOptions;
}): Promise<ProviderGenerationPayloadArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = selectLatestArtifact({
    artifacts: readArtifacts(siteVersion.importProvenanceSummary),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });
  return artifact ? cloneJson(artifact) : null;
}

export async function loadProviderGenerationPayloadById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: ProviderGenerationPayloadPersistenceOptions;
}): Promise<ProviderGenerationPayloadArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
