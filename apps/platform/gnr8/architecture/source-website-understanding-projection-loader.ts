import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import { validateCandidateDiscoveryResult, type CandidateDiscoveryResult } from "./candidate-discovery-contract";
import { validateCandidateReviewPackage, type CandidateReviewPackage } from "./candidate-review-contract";
import { validateReconstructionPackage, type ReconstructionPackage } from "./reconstruction-package-contract";
import { validateStructurePlan, type StructurePlan } from "./structure-plan-contract";
import {
  buildSourceWebsiteUnderstandingProjection,
  validateSourceWebsiteUnderstandingProjection,
  type SourceWebsiteUnderstandingBuilderInput,
} from "./source-website-understanding-projection-builder";
import type {
  SourceWebsiteDiagnostic,
  SourceWebsiteUnderstandingProjection,
  SourceWebsiteUnderstandingValidationResult,
} from "./source-website-understanding-projection-contract";

type StoredArtifact = Record<string, unknown>;

type LoaderSiteVersion = Pick<CanonicalSiteVersionSnapshot, "id" | "siteId" | "createdAt" | "importProvenanceSummary">;

export type SourceWebsiteUnderstandingProjectionLoaderOptions = RuntimeStoreDbOptions & {
  generatedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<LoaderSiteVersion | null>;
  getRawImportedSiteArtifact?: (siteVersionId: string) => Promise<RawImportedSiteArtifact | null>;
};

export type SourceWebsiteUnderstandingProjectionLoaderResult =
  | {
    status: "valid" | "partial";
    projection: SourceWebsiteUnderstandingProjection;
    validation: SourceWebsiteUnderstandingValidationResult;
    diagnostics: SourceWebsiteDiagnostic[];
  }
  | {
    status: "blocked" | "invalid";
    projection: SourceWebsiteUnderstandingProjection | null;
    validation: SourceWebsiteUnderstandingValidationResult;
    diagnostics: SourceWebsiteDiagnostic[];
  };

function isRecord(value: unknown): value is StoredArtifact {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function artifacts(summary: RuntimeImportProvenanceSummary | null | undefined, collectionKey: string, latestKey: string): StoredArtifact[] {
  const record = summary as Record<string, unknown> | null | undefined;
  const values: unknown[] = [];
  if (Array.isArray(record?.[collectionKey])) values.push(...record[collectionKey]);
  if (record?.[latestKey] !== undefined) values.push(record[latestKey]);
  return values.filter(isRecord);
}

function latestArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  collectionKey: string;
  latestKey: string;
  kind: string;
  dryRunId?: string | null;
}): StoredArtifact | null {
  const pointer = (input.summary as Record<string, unknown> | null | undefined)?.[input.latestKey];
  if (
    isRecord(pointer) &&
    (pointer.kind === input.kind || pointer.artifactKind === input.kind) &&
    pointer.siteVersionId === input.siteVersionId &&
    (!input.dryRunId || pointer.dryRunId === input.dryRunId)
  ) {
    return pointer;
  }
  return artifacts(input.summary, input.collectionKey, input.latestKey)
    .filter((artifact) =>
      (artifact.kind === input.kind || artifact.artifactKind === input.kind) &&
      artifact.siteVersionId === input.siteVersionId &&
      (!input.dryRunId || artifact.dryRunId === input.dryRunId))
    .sort((left, right) =>
      String(left.persistedAt ?? left.createdAt ?? "").localeCompare(String(right.persistedAt ?? right.createdAt ?? "")) ||
      String(left.artifactId ?? "").localeCompare(String(right.artifactId ?? "")))
    .at(-1) ?? null;
}

function artifactById(summary: RuntimeImportProvenanceSummary | null | undefined, collectionKey: string, latestKey: string, artifactId: string | null): StoredArtifact | null {
  if (!artifactId) return null;
  return artifacts(summary, collectionKey, latestKey).find((artifact) => artifact.artifactId === artifactId) ?? null;
}

function firstLimitedDryRun(summary: RuntimeImportProvenanceSummary | null | undefined, siteVersionId: string, dryRunId: string | null) {
  const pointer = summary?.latestFirstLimitedDryRunOutputArtifact;
  if (pointer && pointer.siteVersionId === siteVersionId && (!dryRunId || pointer.dryRunId === dryRunId)) return pointer.output;
  return (summary?.firstLimitedDryRunOutputArtifacts ?? [])
    .filter((artifact) => artifact.siteVersionId === siteVersionId && (!dryRunId || artifact.dryRunId === dryRunId))
    .sort((left, right) => left.persistedAt.localeCompare(right.persistedAt) || left.artifactId.localeCompare(right.artifactId))
    .at(-1)?.output ?? null;
}

function parseCandidateDiscovery(artifact: StoredArtifact | null, diagnostics: SourceWebsiteDiagnostic[]): CandidateDiscoveryResult | null {
  if (!artifact) return null;
  const validation = validateCandidateDiscoveryResult(artifact.result);
  if (!validation.valid) {
    diagnostics.push({ code: "CANDIDATE_DISCOVERY_INVALID", message: validation.errors.join("; "), sourceRefs: [text(artifact.artifactId) ?? "candidate_discovery_result"] });
    return null;
  }
  return artifact.result as CandidateDiscoveryResult;
}

function parseCandidateReview(artifact: StoredArtifact | null, diagnostics: SourceWebsiteDiagnostic[]): CandidateReviewPackage | null {
  if (!artifact) return null;
  const validation = validateCandidateReviewPackage(artifact.package);
  if (!validation.valid) {
    diagnostics.push({ code: "CANDIDATE_REVIEW_INVALID", message: validation.errors.join("; "), sourceRefs: [text(artifact.artifactId) ?? "candidate_review_package"] });
    return null;
  }
  return artifact.package as CandidateReviewPackage;
}

function parseReconstruction(artifact: StoredArtifact | null, diagnostics: SourceWebsiteDiagnostic[]): ReconstructionPackage | null {
  if (!artifact) return null;
  const validation = validateReconstructionPackage(artifact.package);
  if (!validation.valid) {
    diagnostics.push({ code: "RECONSTRUCTION_PACKAGE_INVALID", message: validation.errors.join("; "), sourceRefs: [text(artifact.artifactId) ?? "reconstruction_package"] });
    return null;
  }
  return artifact.package as ReconstructionPackage;
}

function parseStructurePlan(artifact: StoredArtifact | null, diagnostics: SourceWebsiteDiagnostic[]): StructurePlan | null {
  if (!artifact) return null;
  const validation = validateStructurePlan(artifact.plan);
  if (!validation.valid) {
    diagnostics.push({ code: "STRUCTURE_PLAN_INVALID", message: validation.errors.join("; "), sourceRefs: [text(artifact.artifactId) ?? "structure_plan"] });
    return null;
  }
  return artifact.plan as StructurePlan;
}

async function defaultGetSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions): Promise<LoaderSiteVersion | null> {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultGetRawImportedSiteArtifact(siteVersionId: string, options: RuntimeStoreDbOptions): Promise<RawImportedSiteArtifact | null> {
  const { getRawImportedSiteArtifact } = await import("../runtime/runtime-store");
  return getRawImportedSiteArtifact(siteVersionId, options);
}

function resultStatus(input: {
  projection: SourceWebsiteUnderstandingProjection | null;
  validation: SourceWebsiteUnderstandingValidationResult;
}): SourceWebsiteUnderstandingProjectionLoaderResult["status"] {
  if (!input.projection) return "blocked";
  if (!input.validation.valid) return "invalid";
  return input.projection.readiness.status === "ready_for_business_discovery" ? "valid" : "partial";
}

export async function loadSourceWebsiteUnderstandingProjection(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: SourceWebsiteUnderstandingProjectionLoaderOptions;
}): Promise<SourceWebsiteUnderstandingProjectionLoaderResult> {
  const options = input.options ?? {};
  const diagnostics: SourceWebsiteDiagnostic[] = [];
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    return {
      status: "blocked",
      projection: null,
      validation: { valid: false, errors: ["site version is missing"], warnings: [] },
      diagnostics: [{ code: "SITE_VERSION_MISSING", message: "Runtime site version was not found.", sourceRefs: [input.siteVersionId] }],
    };
  }

  const rawImportedSiteArtifact = options.getRawImportedSiteArtifact
    ? await options.getRawImportedSiteArtifact(input.siteVersionId)
    : await defaultGetRawImportedSiteArtifact(input.siteVersionId, options);
  const summary = siteVersion.importProvenanceSummary ?? null;

  const candidateDiscoveryArtifact = latestArtifact({
    summary,
    siteVersionId: input.siteVersionId,
    collectionKey: "candidateDiscoveryResultArtifacts",
    latestKey: "latestCandidateDiscoveryResultArtifact",
    kind: "candidate_discovery_result",
    dryRunId: input.dryRunId,
  });
  const candidateDiscoveryResult = parseCandidateDiscovery(candidateDiscoveryArtifact, diagnostics);
  const dryRunId = input.dryRunId ?? candidateDiscoveryResult?.dryRunId ?? null;
  const candidateReviewArtifact = latestArtifact({
    summary,
    siteVersionId: input.siteVersionId,
    collectionKey: "candidateReviewPackageArtifacts",
    latestKey: "latestCandidateReviewPackageArtifact",
    kind: "candidate_review_package",
    dryRunId,
  });
  const candidateReviewPackage = parseCandidateReview(candidateReviewArtifact, diagnostics);
  const reconstructionPackageArtifact = latestArtifact({
    summary,
    siteVersionId: input.siteVersionId,
    collectionKey: "reconstructionPackageArtifacts",
    latestKey: "latestReconstructionPackageArtifact",
    kind: "reconstruction_package",
    dryRunId,
  });
  const reconstructionPackage = parseReconstruction(reconstructionPackageArtifact, diagnostics);
  const structurePlanArtifact = latestArtifact({
    summary,
    siteVersionId: input.siteVersionId,
    collectionKey: "structurePlanArtifacts",
    latestKey: "latestStructurePlanArtifact",
    kind: "structure_plan",
    dryRunId,
  });
  const structurePlan = parseStructurePlan(structurePlanArtifact, diagnostics);
  const linkedDiscoveryId = candidateReviewPackage?.candidateDiscoveryArtifactId ?? null;
  if (linkedDiscoveryId && candidateDiscoveryArtifact?.artifactId !== linkedDiscoveryId) {
    const linked = artifactById(summary, "candidateDiscoveryResultArtifacts", "latestCandidateDiscoveryResultArtifact", linkedDiscoveryId);
    if (linked) diagnostics.push({
      code: "CANDIDATE_DISCOVERY_LATEST_DIFFERS_FROM_REVIEW_LINEAGE",
      message: "Latest Candidate Discovery differs from the Candidate Review lineage; projection keeps exact artifact refs visible.",
      sourceRefs: [linkedDiscoveryId],
    });
  }

  const builderInput: SourceWebsiteUnderstandingBuilderInput = {
    siteVersionId: input.siteVersionId,
    sourceSiteId: siteVersion.siteId,
    generatedAt: options.generatedAt,
    siteVersionCreatedAt: siteVersion.createdAt,
    rawImportedSiteArtifact,
    provenanceSummary: summary,
    evidenceCaptureBaseline: summary?.evidenceCaptureBaselineArtifact ?? null,
    firstLimitedDryRunOutput: firstLimitedDryRun(summary, input.siteVersionId, dryRunId),
    candidateDiscoveryArtifact,
    candidateDiscoveryResult,
    candidateReviewArtifact,
    candidateReviewPackage,
    reconstructionPackageArtifact,
    reconstructionPackage,
    structurePlanArtifact,
    structurePlan,
  };
  const projection = buildSourceWebsiteUnderstandingProjection(builderInput);
  if (diagnostics.length > 0) projection.diagnostics.push(...diagnostics);
  const validation = validateSourceWebsiteUnderstandingProjection(projection);
  const status = resultStatus({ projection, validation });
  return { status, projection, validation, diagnostics: [...projection.diagnostics] } as SourceWebsiteUnderstandingProjectionLoaderResult;
}
