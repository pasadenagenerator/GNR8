/**
 * Phase MVP-1F Website Generation Package artifact persistence.
 *
 * Stores validated Website Generation Package artifacts in the existing
 * site-version import-provenance boundary. It adds no schema, provider,
 * prompt, external AI, generation, compliance, approval, publishing, UI, API,
 * or worker behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION } from "./website-generation-package-builder";
import {
  validateWebsiteGenerationPackage,
  type WebsiteGenerationPackageArtifact,
  type WebsiteGenerationPackageStatus,
  type WebsiteGenerationValidationResult,
} from "./website-generation-package-contract";

export const WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND = "website_generation_package" as const;

export type WebsiteGenerationPackageArtifactRecord = {
  kind: typeof WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND;
  artifactKind: typeof WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  websiteGenerationPackageId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceWebsiteDesignBriefId: string;
  status: Exclude<WebsiteGenerationPackageStatus, "invalid" | "stale">;
  objectiveCount: number;
  audienceCount: number;
  messageCount: number;
  pageContractCount: number;
  sectionContractCount: number;
  contentRequirementCount: number;
  constraintCount: number;
  validationExpectationCount: number;
  limitationCount: number;
  contractVersion: string;
  runtimeVersion: typeof WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: WebsiteGenerationPackageArtifact;
  validation: WebsiteGenerationValidationResult;
  diagnostics: string[];
};

export type WebsiteGenerationPackageArtifactReference = Omit<WebsiteGenerationPackageArtifactRecord, "artifact">;

export type WebsiteGenerationPackageProvenanceSummary = RuntimeImportProvenanceSummary & {
  websiteGenerationPackageArtifacts?: WebsiteGenerationPackageArtifactRecord[];
  latestWebsiteGenerationPackageArtifact?: WebsiteGenerationPackageArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type WebsiteGenerationPackagePersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class WebsiteGenerationPackagePersistenceValidationError extends Error {
  readonly validation: WebsiteGenerationValidationResult;

  constructor(validation: WebsiteGenerationValidationResult) {
    super("WebsiteGenerationPackageArtifact is invalid and was not persisted.");
    this.name = "WebsiteGenerationPackagePersistenceValidationError";
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
  validation: WebsiteGenerationValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: WebsiteGenerationPackageArtifact;
}): WebsiteGenerationValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Website Generation Package artifact status must not be invalid or stale for persistence");
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
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
}

function semanticArtifact(artifact: WebsiteGenerationPackageArtifact): Omit<WebsiteGenerationPackageArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: WebsiteGenerationPackageArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: WebsiteGenerationPackageArtifact;
  persistedAt: string;
}): string {
  return `website_generation_package_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(artifact: WebsiteGenerationPackageArtifactRecord): WebsiteGenerationPackageArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is WebsiteGenerationPackageArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<WebsiteGenerationPackageArtifactRecord>;
  if (record.kind !== WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND) return false;
  if (record.artifactKind !== WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "draft" &&
    record.status !== "partial" &&
    record.status !== "valid" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateWebsiteGenerationPackage(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.websiteGenerationPackageId !== record.websiteGenerationPackageId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceWebsiteDesignBriefId !== record.sourceWebsiteDesignBriefId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): WebsiteGenerationPackageArtifactRecord[] {
  const provenance = summary as WebsiteGenerationPackageProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.websiteGenerationPackageArtifacts)
    ? provenance.websiteGenerationPackageArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as WebsiteGenerationPackageProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.websiteGenerationPackageArtifacts)
    ? provenance.websiteGenerationPackageArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: WebsiteGenerationPackageArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): WebsiteGenerationPackageArtifactRecord | null {
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

export async function persistWebsiteGenerationPackage(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: WebsiteGenerationPackageArtifact;
  options?: WebsiteGenerationPackagePersistenceOptions;
}): Promise<WebsiteGenerationPackageArtifactReference> {
  const validation = mergeValidation({
    validation: validateWebsiteGenerationPackage(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new WebsiteGenerationPackagePersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Website Generation Package persistence: ${input.siteVersionId}`);
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
  const artifactRecord: WebsiteGenerationPackageArtifactRecord = {
    kind: WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND,
    artifactKind: WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    websiteGenerationPackageId: input.artifact.websiteGenerationPackageId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceWebsiteDesignBriefId: input.artifact.sourceWebsiteDesignBriefId,
    status: input.artifact.status as WebsiteGenerationPackageArtifactRecord["status"],
    objectiveCount: input.artifact.generationObjectives.length,
    audienceCount: input.artifact.audience.length,
    messageCount: input.artifact.messages.length,
    pageContractCount: input.artifact.pageContracts.length,
    sectionContractCount: input.artifact.sectionContracts.length,
    contentRequirementCount: input.artifact.contentRequirements.length,
    constraintCount: input.artifact.constraints.length,
    validationExpectationCount: input.artifact.validationContract.expectations.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: WEBSITE_GENERATION_PACKAGE_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["WEBSITE_GENERATION_PACKAGE_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: WebsiteGenerationPackageProvenanceSummary = {
    ...existingSummary,
    websiteGenerationPackageArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as WebsiteGenerationPackageArtifactRecord[],
    latestWebsiteGenerationPackageArtifact: artifactRecord,
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
    throw new Error(`Website Generation Package persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestWebsiteGenerationPackage(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: WebsiteGenerationPackagePersistenceOptions;
}): Promise<WebsiteGenerationPackageArtifactRecord | null> {
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

export async function loadWebsiteGenerationPackageById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: WebsiteGenerationPackagePersistenceOptions;
}): Promise<WebsiteGenerationPackageArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
