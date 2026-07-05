/**
 * Phase MVP-1K-1 Generated Website Proposal artifact persistence.
 *
 * Stores validated quarantined proposal artifacts in the existing site-version
 * import-provenance boundary. It adds no schema, provider call, AI execution,
 * generated website execution, observation, compliance, approval, publishing,
 * UI, API, worker, DNS, deployment, or production mutation behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION,
} from "./generated-website-proposal-import";
import {
  validateGeneratedWebsiteProposal,
  type GeneratedWebsiteProposalArtifact,
  type GeneratedWebsiteProposalStatus,
  type GeneratedWebsiteProposalValidationResult,
} from "./generated-website-proposal-contract";

export const GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND = "generated_website_proposal" as const;

export type GeneratedWebsiteProposalArtifactRecord = {
  kind: typeof GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND;
  artifactKind: typeof GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  generatedWebsiteProposalId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceProviderGenerationPayloadId: string;
  sourceProviderGenerationPayloadArtifactId: string;
  sourceWebsiteGenerationPackageId: string;
  sourceWebsiteGenerationPackageArtifactId: string;
  outputBundleId: string;
  operatorAttestationId: string;
  status: Exclude<GeneratedWebsiteProposalStatus, "invalid">;
  readiness: GeneratedWebsiteProposalArtifact["validationReadiness"]["readiness"];
  readyForCompliance: boolean;
  limitationCount: number;
  diagnosticCount: number;
  contractVersion: string;
  runtimeVersion: typeof GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: GeneratedWebsiteProposalArtifact;
  validation: GeneratedWebsiteProposalValidationResult;
  diagnostics: string[];
};

export type GeneratedWebsiteProposalArtifactReference = Omit<GeneratedWebsiteProposalArtifactRecord, "artifact">;

export type GeneratedWebsiteProposalProvenanceSummary = RuntimeImportProvenanceSummary & {
  generatedWebsiteProposalArtifacts?: GeneratedWebsiteProposalArtifactRecord[];
  latestGeneratedWebsiteProposalArtifact?: GeneratedWebsiteProposalArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type GeneratedWebsiteProposalPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class GeneratedWebsiteProposalPersistenceValidationError extends Error {
  readonly validation: GeneratedWebsiteProposalValidationResult;

  constructor(validation: GeneratedWebsiteProposalValidationResult) {
    super("GeneratedWebsiteProposalArtifact is invalid and was not persisted.");
    this.name = "GeneratedWebsiteProposalPersistenceValidationError";
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
  validation: GeneratedWebsiteProposalValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: GeneratedWebsiteProposalArtifact;
}): GeneratedWebsiteProposalValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid") {
    errors.push("Generated Website Proposal status must not be invalid for persistence");
  }
  if (input.artifact.status === "compliance_ready") {
    if (input.artifact.validationReadiness.readiness !== "ready") {
      errors.push("compliance_ready Generated Website Proposal requires validationReadiness.readiness ready");
    }
    if (input.artifact.validationReadiness.readyForCompliance !== true) {
      errors.push("compliance_ready Generated Website Proposal requires readyForCompliance true");
    }
    if (input.artifact.validationReadiness.blockers.length > 0) {
      errors.push("compliance_ready Generated Website Proposal requires no validationReadiness blockers");
    }
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
  if (input.artifact.sourceProviderGenerationPayloadId !== input.artifact.lineage.sourceProviderGenerationPayloadId) {
    errors.push("artifact.sourceProviderGenerationPayloadId must match artifact.lineage.sourceProviderGenerationPayloadId");
  }
  if (input.artifact.sourceWebsiteGenerationPackageId !== input.artifact.lineage.sourceWebsiteGenerationPackageId) {
    errors.push("artifact.sourceWebsiteGenerationPackageId must match artifact.lineage.sourceWebsiteGenerationPackageId");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(
  artifact: GeneratedWebsiteProposalArtifact,
): Omit<GeneratedWebsiteProposalArtifact, "createdAt" | "lineage"> & {
  lineage: Omit<GeneratedWebsiteProposalArtifact["lineage"], "importedAt">;
} {
  const { createdAt: _createdAt, lineage, ...semantic } = artifact;
  const { importedAt: _importedAt, ...semanticLineage } = lineage;
  return {
    ...semantic,
    lineage: semanticLineage,
  };
}

function semanticFingerprint(artifact: GeneratedWebsiteProposalArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: GeneratedWebsiteProposalArtifact;
  persistedAt: string;
}): string {
  return `generated_website_proposal_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(
  artifact: GeneratedWebsiteProposalArtifactRecord,
): GeneratedWebsiteProposalArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is GeneratedWebsiteProposalArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<GeneratedWebsiteProposalArtifactRecord>;
  if (record.kind !== GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND) return false;
  if (record.artifactKind !== GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "received" &&
    record.status !== "quarantined" &&
    record.status !== "blocked" &&
    record.status !== "superseded" &&
    record.status !== "compliance_ready"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateGeneratedWebsiteProposal(record.artifact).valid) return false;
  if (record.artifact.status === "invalid") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.status === "compliance_ready" && record.artifact.validationReadiness.readyForCompliance !== true) {
    return false;
  }
  if (record.artifact.generatedWebsiteProposalId !== record.generatedWebsiteProposalId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceProviderGenerationPayloadId !== record.sourceProviderGenerationPayloadId) return false;
  if (record.artifact.sourceWebsiteGenerationPackageId !== record.sourceWebsiteGenerationPackageId) return false;
  if (record.artifact.lineage.sourceProviderGenerationPayloadArtifactId !== record.sourceProviderGenerationPayloadArtifactId) {
    return false;
  }
  if (record.artifact.lineage.sourceWebsiteGenerationPackageArtifactId !== record.sourceWebsiteGenerationPackageArtifactId) {
    return false;
  }
  if (record.artifact.outputBundle.outputBundleId !== record.outputBundleId) return false;
  if (record.artifact.operatorAttestation.attestationId !== record.operatorAttestationId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): GeneratedWebsiteProposalArtifactRecord[] {
  const provenance = summary as GeneratedWebsiteProposalProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generatedWebsiteProposalArtifacts)
    ? provenance.generatedWebsiteProposalArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as GeneratedWebsiteProposalProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.generatedWebsiteProposalArtifacts)
    ? provenance.generatedWebsiteProposalArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: GeneratedWebsiteProposalArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): GeneratedWebsiteProposalArtifactRecord | null {
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

export async function persistGeneratedWebsiteProposal(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: GeneratedWebsiteProposalArtifact;
  options?: GeneratedWebsiteProposalPersistenceOptions;
}): Promise<GeneratedWebsiteProposalArtifactReference> {
  const validation = mergeValidation({
    validation: validateGeneratedWebsiteProposal(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new GeneratedWebsiteProposalPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Generated Website Proposal persistence: ${input.siteVersionId}`);
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
  const artifactRecord: GeneratedWebsiteProposalArtifactRecord = {
    kind: GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND,
    artifactKind: GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    generatedWebsiteProposalId: input.artifact.generatedWebsiteProposalId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceProviderGenerationPayloadId: input.artifact.sourceProviderGenerationPayloadId,
    sourceProviderGenerationPayloadArtifactId: input.artifact.lineage.sourceProviderGenerationPayloadArtifactId,
    sourceWebsiteGenerationPackageId: input.artifact.sourceWebsiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: input.artifact.lineage.sourceWebsiteGenerationPackageArtifactId,
    outputBundleId: input.artifact.outputBundle.outputBundleId,
    operatorAttestationId: input.artifact.operatorAttestation.attestationId,
    status: input.artifact.status as GeneratedWebsiteProposalArtifactRecord["status"],
    readiness: input.artifact.validationReadiness.readiness,
    readyForCompliance: input.artifact.validationReadiness.readyForCompliance,
    limitationCount: input.artifact.limitations.length,
    diagnosticCount: input.artifact.diagnostics.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["GENERATED_WEBSITE_PROPOSAL_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: GeneratedWebsiteProposalProvenanceSummary = {
    ...existingSummary,
    generatedWebsiteProposalArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as GeneratedWebsiteProposalArtifactRecord[],
    latestGeneratedWebsiteProposalArtifact: artifactRecord,
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
    throw new Error(`Generated Website Proposal persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestGeneratedWebsiteProposal(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: GeneratedWebsiteProposalPersistenceOptions;
}): Promise<GeneratedWebsiteProposalArtifactRecord | null> {
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

export async function loadGeneratedWebsiteProposalById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: GeneratedWebsiteProposalPersistenceOptions;
}): Promise<GeneratedWebsiteProposalArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
