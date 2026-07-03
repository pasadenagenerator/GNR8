/**
 * Phase MVP-1E Website Design Brief artifact persistence.
 *
 * Stores validated Website Design Brief artifacts in the existing site-version
 * import-provenance boundary. It adds no schema, provider, prompt, generation,
 * compliance, approval, publishing, UI, or API behavior.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION } from "./website-design-brief-builder";
import {
  validateWebsiteDesignBrief,
  type WebsiteDesignBriefArtifact,
  type WebsiteDesignBriefStatus,
  type WebsiteDesignBriefValidationResult,
} from "./website-design-brief-contract";

export const WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND = "website_design_brief" as const;

export type WebsiteDesignBriefArtifactRecord = {
  kind: typeof WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND;
  artifactKind: typeof WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  websiteDesignBriefId: string;
  siteVersionId: string;
  dryRunId: string;
  sourceDigitalBusinessTwinId: string;
  sourceBusinessAlignmentId: string;
  status: Exclude<WebsiteDesignBriefStatus, "invalid" | "stale">;
  sectionCount: number;
  limitationCount: number;
  contractVersion: string;
  runtimeVersion: typeof WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION;
  createdAt: string;
  persistedAt: string;
  artifact: WebsiteDesignBriefArtifact;
  validation: WebsiteDesignBriefValidationResult;
  diagnostics: string[];
};

export type WebsiteDesignBriefArtifactReference = Omit<WebsiteDesignBriefArtifactRecord, "artifact">;

export type WebsiteDesignBriefProvenanceSummary = RuntimeImportProvenanceSummary & {
  websiteDesignBriefArtifacts?: WebsiteDesignBriefArtifactRecord[];
  latestWebsiteDesignBriefArtifact?: WebsiteDesignBriefArtifactRecord | null;
};

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type WebsiteDesignBriefPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class WebsiteDesignBriefPersistenceValidationError extends Error {
  readonly validation: WebsiteDesignBriefValidationResult;

  constructor(validation: WebsiteDesignBriefValidationResult) {
    super("WebsiteDesignBriefArtifact is invalid and was not persisted.");
    this.name = "WebsiteDesignBriefPersistenceValidationError";
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
  validation: WebsiteDesignBriefValidationResult;
  siteVersionId: string;
  dryRunId: string;
  artifact: WebsiteDesignBriefArtifact;
}): WebsiteDesignBriefValidationResult {
  const errors = [...input.validation.errors];
  if (input.artifact.status === "invalid" || input.artifact.status === "stale") {
    errors.push("Website Design Brief artifact status must not be invalid or stale for persistence");
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

function semanticArtifact(artifact: WebsiteDesignBriefArtifact): Omit<WebsiteDesignBriefArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function semanticFingerprint(artifact: WebsiteDesignBriefArtifact): string {
  return sha256Hex(stableStringify({
    artifact: semanticArtifact(artifact),
    runtimeVersion: WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION,
    contractVersion: artifact.contractVersion,
  }));
}

function createArtifactId(input: {
  artifact: WebsiteDesignBriefArtifact;
  persistedAt: string;
}): string {
  return `website_design_brief_${sha256Hex(stableStringify({
    artifact: input.artifact,
    runtimeVersion: WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION,
    persistedAt: input.persistedAt,
  })).slice(0, 32)}`;
}

function toArtifactReference(artifact: WebsiteDesignBriefArtifactRecord): WebsiteDesignBriefArtifactReference {
  const { artifact: _artifact, ...reference } = artifact;
  return cloneJson(reference);
}

function isValidArtifact(value: unknown): value is WebsiteDesignBriefArtifactRecord {
  if (!isRecord(value)) return false;
  const record = value as Partial<WebsiteDesignBriefArtifactRecord>;
  if (record.kind !== WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND) return false;
  if (record.artifactKind !== WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND) return false;
  if (record.artifactVersion !== 1) return false;
  if (
    record.status !== "draft" &&
    record.status !== "partial" &&
    record.status !== "valid" &&
    record.status !== "blocked"
  ) return false;
  if (!record.artifact || record.validation?.valid !== true) return false;
  if (!validateWebsiteDesignBrief(record.artifact).valid) return false;
  if (record.artifact.status === "invalid" || record.artifact.status === "stale") return false;
  if (record.artifact.status !== record.status) return false;
  if (record.artifact.websiteDesignBriefId !== record.websiteDesignBriefId) return false;
  if (record.artifact.siteVersionId !== record.siteVersionId) return false;
  if (record.artifact.dryRunId !== record.dryRunId) return false;
  if (record.artifact.sourceDigitalBusinessTwinId !== record.sourceDigitalBusinessTwinId) return false;
  if (record.artifact.sourceBusinessAlignmentId !== record.sourceBusinessAlignmentId) return false;
  return true;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): WebsiteDesignBriefArtifactRecord[] {
  const provenance = summary as WebsiteDesignBriefProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.websiteDesignBriefArtifacts)
    ? provenance.websiteDesignBriefArtifacts.filter(isValidArtifact)
    : [];
}

function readStoredArtifactValues(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): unknown[] {
  const provenance = summary as WebsiteDesignBriefProvenanceSummary | null | undefined;
  return Array.isArray(provenance?.websiteDesignBriefArtifacts)
    ? provenance.websiteDesignBriefArtifacts
    : [];
}

function selectLatestArtifact(input: {
  artifacts: WebsiteDesignBriefArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): WebsiteDesignBriefArtifactRecord | null {
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

export async function persistWebsiteDesignBrief(input: {
  siteVersionId: string;
  dryRunId: string;
  artifact: WebsiteDesignBriefArtifact;
  options?: WebsiteDesignBriefPersistenceOptions;
}): Promise<WebsiteDesignBriefArtifactReference> {
  const validation = mergeValidation({
    validation: validateWebsiteDesignBrief(input.artifact),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    artifact: input.artifact,
  });
  if (!validation.valid) throw new WebsiteDesignBriefPersistenceValidationError(validation);

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for Website Design Brief persistence: ${input.siteVersionId}`);
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
  const artifactRecord: WebsiteDesignBriefArtifactRecord = {
    kind: WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND,
    artifactKind: WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({ artifact: input.artifact, persistedAt }),
    websiteDesignBriefId: input.artifact.websiteDesignBriefId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceDigitalBusinessTwinId: input.artifact.sourceDigitalBusinessTwinId,
    sourceBusinessAlignmentId: input.artifact.sourceBusinessAlignmentId,
    status: input.artifact.status as WebsiteDesignBriefArtifactRecord["status"],
    sectionCount: input.artifact.sections.length,
    limitationCount: input.artifact.limitations.length,
    contractVersion: input.artifact.contractVersion,
    runtimeVersion: WEBSITE_DESIGN_BRIEF_RUNTIME_VERSION,
    createdAt: input.artifact.createdAt,
    persistedAt,
    artifact: cloneJson(input.artifact),
    validation: cloneJson(validation),
    diagnostics: ["WEBSITE_DESIGN_BRIEF_ARTIFACT_VALIDATION_PASSED"],
  };

  const nextSummary: WebsiteDesignBriefProvenanceSummary = {
    ...existingSummary,
    websiteDesignBriefArtifacts: [
      ...readStoredArtifactValues(existingSummary),
      artifactRecord,
    ] as WebsiteDesignBriefArtifactRecord[],
    latestWebsiteDesignBriefArtifact: artifactRecord,
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
    throw new Error(`Website Design Brief persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifactRecord);
}

export async function loadLatestWebsiteDesignBrief(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: WebsiteDesignBriefPersistenceOptions;
}): Promise<WebsiteDesignBriefArtifactRecord | null> {
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

export async function loadWebsiteDesignBriefById(input: {
  siteVersionId: string;
  artifactId: string;
  options?: WebsiteDesignBriefPersistenceOptions;
}): Promise<WebsiteDesignBriefArtifactRecord | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;
  const artifact = readArtifacts(siteVersion.importProvenanceSummary).find((candidate) =>
    candidate.siteVersionId === input.siteVersionId && candidate.artifactId === input.artifactId);
  return artifact ? cloneJson(artifact) : null;
}
