import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

import {
  CANDIDATE_CONFIDENCE_LEVELS,
  CANDIDATE_TYPES,
  validateCandidateDiscoveryResult,
  type Candidate,
  type CandidateConfidence,
  type CandidateDiscoveryValidationResult,
  type CandidateEvidenceRef,
  type CandidateLimitation,
  type CandidateStatus,
  type CandidateType,
} from "./candidate-discovery-contract";
import {
  CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
  type CandidateDiscoveryPersistenceOptions,
  type CandidateDiscoveryResultProvenanceSummary,
} from "./candidate-discovery-persistence";

export type CandidateDiscoverySurfaceEmptyState =
  | "missing"
  | "invalid"
  | "blocked"
  | "no_candidates"
  | "candidates_with_limitations"
  | "candidates_with_blockers"
  | "ready";

export type CandidateDiscoverySurfaceCandidate = {
  candidateId: string;
  candidateType: CandidateType;
  candidateStatus: CandidateStatus;
  confidence: CandidateConfidence;
  routePath?: string;
  sourceEvidenceRefs: CandidateEvidenceRef[];
  sourceDryRunRefs: CandidateEvidenceRef[];
  limitations: CandidateLimitation[];
  diagnostics: string[];
};

export type CandidateDiscoverySurfaceProjection = {
  siteVersionId: string;
  artifact: {
    kind: typeof CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND;
    artifactId: string | null;
    artifactVersion: number | null;
    discoveryId: string | null;
    siteVersionId: string;
    dryRunId: string | null;
    builderVersion: string | null;
    contractVersion: string | null;
    createdAt: string | null;
    persistedAt: string | null;
  } | null;
  validation: {
    status: "valid" | "invalid" | "unavailable";
    errors: string[];
    warnings: string[];
  };
  counts: {
    total: number;
    byType: Record<CandidateType, number>;
    byConfidence: Record<CandidateConfidence["level"], number>;
    limitations: number;
    blockers: number;
  };
  candidateTypesPresent: CandidateType[];
  groups: {
    routes: CandidateDiscoverySurfaceCandidate[];
    navigation: CandidateDiscoverySurfaceCandidate[];
    sectionsByRoute: Array<{
      routePath: string;
      candidates: CandidateDiscoverySurfaceCandidate[];
    }>;
    unscopedSections: CandidateDiscoverySurfaceCandidate[];
  };
  limitations: CandidateLimitation[];
  diagnostics: string[];
  emptyState: CandidateDiscoverySurfaceEmptyState;
};

type SurfaceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

type StoredArtifact = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emptyCounts(): CandidateDiscoverySurfaceProjection["counts"] {
  return {
    total: 0,
    byType: { route: 0, navigation: 0, section: 0 },
    byConfidence: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    limitations: 0,
    blockers: 0,
  };
}

function missingProjection(siteVersionId: string): CandidateDiscoverySurfaceProjection {
  return {
    siteVersionId,
    artifact: null,
    validation: { status: "unavailable", errors: [], warnings: [] },
    counts: emptyCounts(),
    candidateTypesPresent: [],
    groups: { routes: [], navigation: [], sectionsByRoute: [], unscopedSections: [] },
    limitations: [],
    diagnostics: ["CANDIDATE_DISCOVERY_RESULT_MISSING"],
    emptyState: "missing",
  };
}

function persistedValidation(value: unknown): CandidateDiscoveryValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      errors: ["persisted validation metadata is missing"],
      warnings: [],
    };
  }
  return {
    valid: value.valid === true,
    errors: safeStrings(value.errors),
    warnings: safeStrings(value.warnings),
  };
}

function envelopeErrors(input: {
  artifact: StoredArtifact;
  siteVersionId: string;
}): string[] {
  const { artifact, siteVersionId } = input;
  const errors: string[] = [];
  if (artifact.kind !== CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND) {
    errors.push("artifact kind is invalid");
  }
  if (artifact.artifactKind !== CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND) {
    errors.push("artifactKind is invalid");
  }
  if (artifact.artifactVersion !== 1) errors.push("artifactVersion must be 1");
  if (artifact.validationStatus !== "valid") errors.push("validationStatus must be valid");
  if (artifact.siteVersionId !== siteVersionId) errors.push("artifact siteVersionId does not match requested site version");
  if (!safeString(artifact.artifactId)) errors.push("artifactId is required");
  if (!safeString(artifact.discoveryId)) errors.push("discoveryId is required");
  if (!safeString(artifact.dryRunId)) errors.push("dryRunId is required");
  if (!safeString(artifact.builderVersion)) errors.push("builderVersion is required");
  if (!safeString(artifact.contractVersion)) errors.push("contractVersion is required");
  if (!safeString(artifact.createdAt)) errors.push("createdAt is required");
  if (!safeString(artifact.persistedAt)) errors.push("persistedAt is required");

  if (isRecord(artifact.result)) {
    if (artifact.result.siteVersionId !== artifact.siteVersionId) errors.push("result siteVersionId does not match artifact lineage");
    if (artifact.result.dryRunId !== artifact.dryRunId) errors.push("result dryRunId does not match artifact lineage");
    if (artifact.result.discoveryId !== artifact.discoveryId) errors.push("result discoveryId does not match artifact lineage");
    if (artifact.result.candidateCount !== artifact.candidateCount) errors.push("result candidateCount does not match artifact metadata");
    if (JSON.stringify(artifact.result.candidateTypesPresent) !== JSON.stringify(artifact.candidateTypesPresent)) {
      errors.push("result candidateTypesPresent does not match artifact metadata");
    }
    if (Array.isArray(artifact.result.limitations)) {
      const blockerCount = artifact.result.limitations.filter((limitation) =>
        isRecord(limitation) && limitation.severity === "blocker").length;
      if (artifact.result.limitations.length !== artifact.limitationCount) {
        errors.push("result limitation count does not match artifact metadata");
      }
      if (blockerCount !== artifact.blockerCount) {
        errors.push("result blocker count does not match artifact metadata");
      }
    }
  }
  return errors;
}

function groupCandidates(candidates: Candidate[]): CandidateDiscoverySurfaceProjection["groups"] {
  const routes: CandidateDiscoverySurfaceCandidate[] = [];
  const navigation: CandidateDiscoverySurfaceCandidate[] = [];
  const sectionsByRoute: CandidateDiscoverySurfaceProjection["groups"]["sectionsByRoute"] = [];
  const sectionGroups = new Map<string, CandidateDiscoverySurfaceCandidate[]>();
  const unscopedSections: CandidateDiscoverySurfaceCandidate[] = [];

  for (const candidate of cloneJson(candidates)) {
    if (candidate.candidateType === "route") {
      routes.push(candidate);
    } else if (candidate.candidateType === "navigation") {
      navigation.push(candidate);
    } else if (candidate.routePath) {
      const group = sectionGroups.get(candidate.routePath);
      if (group) {
        group.push(candidate);
      } else {
        const candidatesForRoute = [candidate];
        sectionGroups.set(candidate.routePath, candidatesForRoute);
        sectionsByRoute.push({ routePath: candidate.routePath, candidates: candidatesForRoute });
      }
    } else {
      unscopedSections.push(candidate);
    }
  }

  return { routes, navigation, sectionsByRoute, unscopedSections };
}

function classifyEmptyState(input: {
  candidates: Candidate[];
  limitations: CandidateLimitation[];
  diagnostics: string[];
}): CandidateDiscoverySurfaceEmptyState {
  const resultBlockers = input.limitations.some((limitation) => limitation.severity === "blocker");
  const candidateLimitations = input.candidates.flatMap((candidate) => candidate.limitations);
  const candidateBlockers = candidateLimitations.some((limitation) => limitation.severity === "blocker");
  if (input.candidates.length === 0) {
    const blockedDiagnostic = input.diagnostics.some((diagnostic) => diagnostic.toUpperCase().includes("BLOCK"));
    return resultBlockers || blockedDiagnostic ? "blocked" : "no_candidates";
  }
  if (resultBlockers || candidateBlockers) return "candidates_with_blockers";
  if (input.limitations.length > 0 || candidateLimitations.length > 0) return "candidates_with_limitations";
  return "ready";
}

export function projectCandidateDiscoverySurface(input: {
  siteVersionId: string;
  artifact: unknown;
}): CandidateDiscoverySurfaceProjection {
  if (!isRecord(input.artifact)) return missingProjection(input.siteVersionId);

  const artifact = input.artifact;
  const storedValidation = persistedValidation(artifact.validation);
  const currentValidation = validateCandidateDiscoveryResult(artifact.result);
  const errors = [
    ...(!storedValidation.valid ? ["persisted validation metadata is invalid"] : []),
    ...storedValidation.errors,
    ...currentValidation.errors,
    ...envelopeErrors({ artifact, siteVersionId: input.siteVersionId }),
  ];
  const warnings = [...storedValidation.warnings, ...currentValidation.warnings];
  const artifactMetadata: NonNullable<CandidateDiscoverySurfaceProjection["artifact"]> = {
    kind: CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
    artifactId: safeString(artifact.artifactId),
    artifactVersion: safeNumber(artifact.artifactVersion),
    discoveryId: safeString(artifact.discoveryId),
    siteVersionId: input.siteVersionId,
    dryRunId: safeString(artifact.dryRunId),
    builderVersion: safeString(artifact.builderVersion),
    contractVersion: safeString(artifact.contractVersion),
    createdAt: safeString(artifact.createdAt),
    persistedAt: safeString(artifact.persistedAt),
  };
  const artifactDiagnostics = safeStrings(artifact.diagnostics);

  if (errors.length > 0) {
    return {
      siteVersionId: input.siteVersionId,
      artifact: artifactMetadata,
      validation: { status: "invalid", errors, warnings },
      counts: emptyCounts(),
      candidateTypesPresent: [],
      groups: { routes: [], navigation: [], sectionsByRoute: [], unscopedSections: [] },
      limitations: [],
      diagnostics: [...artifactDiagnostics, ...errors, ...warnings],
      emptyState: "invalid",
    };
  }

  const result = cloneJson(artifact.result) as {
    candidates: Candidate[];
    candidateTypesPresent: CandidateType[];
    limitations: CandidateLimitation[];
    diagnostics: string[];
  };
  const counts = emptyCounts();
  counts.total = result.candidates.length;
  for (const candidate of result.candidates) {
    counts.byType[candidate.candidateType] += 1;
    counts.byConfidence[candidate.confidence.level] += 1;
  }
  counts.limitations = result.limitations.length;
  counts.blockers = result.limitations.filter((limitation) => limitation.severity === "blocker").length;
  const diagnostics = [...artifactDiagnostics, ...result.diagnostics, ...warnings];

  return {
    siteVersionId: input.siteVersionId,
    artifact: artifactMetadata,
    validation: { status: "valid", errors: [], warnings },
    counts,
    candidateTypesPresent: CANDIDATE_TYPES.filter((type) => result.candidateTypesPresent.includes(type)),
    groups: groupCandidates(result.candidates),
    limitations: result.limitations,
    diagnostics,
    emptyState: classifyEmptyState({
      candidates: result.candidates,
      limitations: result.limitations,
      diagnostics,
    }),
  };
}

function collectStoredArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): StoredArtifact[] {
  const provenance = summary as CandidateDiscoveryResultProvenanceSummary | null | undefined;
  const values: unknown[] = [];
  if (provenance?.latestCandidateDiscoveryResultArtifact) {
    values.push(provenance.latestCandidateDiscoveryResultArtifact);
  }
  if (Array.isArray(provenance?.candidateDiscoveryResultArtifacts)) {
    values.push(...provenance.candidateDiscoveryResultArtifacts);
  }
  return values.filter((value): value is StoredArtifact =>
    isRecord(value) && (
      value.kind === CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND ||
      value.artifactKind === CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND
    ));
}

function selectLatestStoredArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  dryRunId?: string;
}): StoredArtifact | null {
  const matches = collectStoredArtifacts(input.summary).filter((artifact) =>
    artifact.siteVersionId === input.siteVersionId &&
    (input.dryRunId === undefined || artifact.dryRunId === input.dryRunId));
  return matches
    .slice()
    .sort((left, right) =>
      String(left.persistedAt ?? "").localeCompare(String(right.persistedAt ?? "")) ||
      String(left.artifactId ?? "").localeCompare(String(right.artifactId ?? "")))
    .at(-1) ?? null;
}

async function defaultGetSiteVersion(
  siteVersionId: string,
  options: CandidateDiscoveryPersistenceOptions,
): Promise<SurfaceSiteVersion | null> {
  const { getSiteVersion } = await import("@/gnr8/runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

export async function loadLatestCandidateDiscoverySurfaceProjection(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: CandidateDiscoveryPersistenceOptions;
}): Promise<CandidateDiscoverySurfaceProjection> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return missingProjection(input.siteVersionId);

  const artifact = selectLatestStoredArtifact({
    summary: siteVersion.importProvenanceSummary,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });
  return artifact
    ? projectCandidateDiscoverySurface({ siteVersionId: input.siteVersionId, artifact })
    : missingProjection(input.siteVersionId);
}

export const CANDIDATE_DISCOVERY_SURFACE_CONFIDENCE_LEVELS = CANDIDATE_CONFIDENCE_LEVELS;
