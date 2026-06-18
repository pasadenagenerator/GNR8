import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

import {
  CANDIDATE_TYPES,
  validateCandidateDiscoveryResult,
  type Candidate,
  type CandidateConfidence,
  type CandidateEvidenceRef,
  type CandidateLimitation,
  type CandidateStatus,
  type CandidateType,
} from "./candidate-discovery-contract";
import type { CandidateDiscoveryResultProvenanceSummary } from "./candidate-discovery-persistence";
import {
  CANDIDATE_REVIEW_DECISIONS,
  deriveLatestCandidateReviewDecisions,
  validateCandidateReviewPackage,
  type CandidateReviewDecision,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";
import {
  CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND,
  type CandidateReviewPackageProvenanceSummary,
  type CandidateReviewPersistenceOptions,
} from "./candidate-review-persistence";

export type CandidateReviewSurfaceState = "missing" | "invalid" | "ready";
export type CandidateReviewSurfaceAttentionState =
  | "empty_review_package"
  | "all_candidates_unreviewed"
  | "stale"
  | "has_superseded_events";

export type CandidateReviewSurfaceCandidateContext = {
  candidateId: string;
  candidateType: CandidateType;
  candidateStatus: CandidateStatus;
  routePath?: string;
  confidence: CandidateConfidence;
  sourceEvidenceRefs: CandidateEvidenceRef[];
  sourceDryRunRefs: CandidateEvidenceRef[];
  limitations: CandidateLimitation[];
  diagnostics: string[];
};

export type CandidateReviewSurfaceDecision = {
  reviewEventId: string;
  candidateId: string;
  decision: CandidateReviewDecision;
  reviewerRef: string;
  decidedAt: string;
  rationale?: string;
  supersedesReviewEventId: string | null;
  diagnostics: string[];
  candidate: CandidateReviewSurfaceCandidateContext;
};

export type CandidateReviewSurfaceEvent = CandidateReviewEvent & {
  superseded: boolean;
  chainHeadReviewEventId: string | null;
};

export type CandidateReviewSurfaceCandidateGroups<T> = {
  routes: T[];
  navigation: T[];
  sectionsByRoute: Array<{ routePath: string; candidates: T[] }>;
  unscopedSections: T[];
};

export type CandidateReviewSurfaceProjection = {
  siteVersionId: string;
  artifact: {
    kind: typeof CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND;
    artifactId: string | null;
    artifactVersion: number | null;
    reviewPackageId: string | null;
    candidateDiscoveryArtifactId: string | null;
    siteVersionId: string;
    dryRunId: string | null;
    contractVersion: string | null;
    createdAt: string | null;
    persistedAt: string | null;
    isLatestReviewArtifact: boolean;
  } | null;
  validation: {
    status: "valid" | "invalid" | "unavailable";
    errors: string[];
    warnings: string[];
  };
  linkedCandidateDiscovery: {
    artifactId: string;
    latestArtifactId: string | null;
    discoveryId: string;
    siteVersionId: string;
    dryRunId: string;
    candidateCount: number;
    candidateTypesPresent: CandidateType[];
    validationStatus: "valid" | "invalid";
    stale: boolean;
  } | null;
  counts: {
    candidates: number;
    reviewed: number;
    unreviewed: number;
    approved: number;
    rejected: number;
    deferred: number;
    reviewEvents: number;
    supersededEvents: number;
  };
  groupedLatestDecisions: Record<
    CandidateReviewDecision,
    CandidateReviewSurfaceCandidateGroups<CandidateReviewSurfaceDecision>
  >;
  unreviewedCandidates: CandidateReviewSurfaceCandidateGroups<CandidateReviewSurfaceCandidateContext>;
  reviewEventHistory: CandidateReviewSurfaceEvent[];
  state: CandidateReviewSurfaceState;
  attentionStates: CandidateReviewSurfaceAttentionState[];
  diagnostics: {
    artifact: string[];
    package: string[];
    reviewEvents: string[];
    candidateDiscovery: string[];
  };
};

type StoredArtifact = Record<string, unknown>;
type SurfaceSiteVersion = { importProvenanceSummary?: RuntimeImportProvenanceSummary | null };

function isRecord(value: unknown): value is StoredArtifact {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emptyGroups<T>(): CandidateReviewSurfaceCandidateGroups<T> {
  return { routes: [], navigation: [], sectionsByRoute: [], unscopedSections: [] };
}

function emptyCounts(): CandidateReviewSurfaceProjection["counts"] {
  return {
    candidates: 0,
    reviewed: 0,
    unreviewed: 0,
    approved: 0,
    rejected: 0,
    deferred: 0,
    reviewEvents: 0,
    supersededEvents: 0,
  };
}

function emptyDecisionGroups(): CandidateReviewSurfaceProjection["groupedLatestDecisions"] {
  return { approved: emptyGroups(), rejected: emptyGroups(), deferred: emptyGroups() };
}

function missingProjection(siteVersionId: string): CandidateReviewSurfaceProjection {
  return {
    siteVersionId,
    artifact: null,
    validation: { status: "unavailable", errors: [], warnings: [] },
    linkedCandidateDiscovery: null,
    counts: emptyCounts(),
    groupedLatestDecisions: emptyDecisionGroups(),
    unreviewedCandidates: emptyGroups(),
    reviewEventHistory: [],
    state: "missing",
    attentionStates: [],
    diagnostics: {
      artifact: ["CANDIDATE_REVIEW_PACKAGE_MISSING"],
      package: [],
      reviewEvents: [],
      candidateDiscovery: [],
    },
  };
}

function groupByDiscoveryOrder<T>(
  candidates: Candidate[],
  select: (candidate: Candidate) => T | null,
): CandidateReviewSurfaceCandidateGroups<T> {
  const groups = emptyGroups<T>();
  const sections = new Map<string, T[]>();
  for (const candidate of candidates) {
    const item = select(candidate);
    if (item === null) continue;
    if (candidate.candidateType === "route") groups.routes.push(item);
    else if (candidate.candidateType === "navigation") groups.navigation.push(item);
    else if (candidate.routePath) {
      const existing = sections.get(candidate.routePath);
      if (existing) existing.push(item);
      else {
        const routeCandidates = [item];
        sections.set(candidate.routePath, routeCandidates);
        groups.sectionsByRoute.push({ routePath: candidate.routePath, candidates: routeCandidates });
      }
    } else groups.unscopedSections.push(item);
  }
  return groups;
}

function candidateContext(candidate: Candidate): CandidateReviewSurfaceCandidateContext {
  return cloneJson(candidate);
}

function reviewEnvelopeErrors(input: {
  artifact: StoredArtifact;
  siteVersionId: string;
  reviewPackage: CandidateReviewPackage | null;
}): string[] {
  const { artifact, reviewPackage, siteVersionId } = input;
  const errors: string[] = [];
  if (artifact.kind !== CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND) errors.push("artifact kind is invalid");
  if (artifact.artifactKind !== CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND) errors.push("artifactKind is invalid");
  if (artifact.artifactVersion !== 1) errors.push("artifactVersion must be 1");
  if (artifact.validationStatus !== "valid") errors.push("validationStatus must be valid");
  if (artifact.siteVersionId !== siteVersionId) errors.push("artifact siteVersionId does not match requested site version");
  for (const field of [
    "artifactId", "reviewPackageId", "candidateDiscoveryArtifactId", "dryRunId",
    "contractVersion", "createdAt", "persistedAt",
  ] as const) {
    if (!safeString(artifact[field])) errors.push(`${field} is required`);
  }
  if (!isRecord(artifact.validation) || artifact.validation.valid !== true) {
    errors.push("persisted validation metadata is invalid");
  }
  if (reviewPackage) {
    for (const field of ["reviewPackageId", "candidateDiscoveryArtifactId", "siteVersionId", "dryRunId", "createdAt"] as const) {
      if (artifact[field] !== reviewPackage[field]) errors.push(`package ${field} does not match artifact metadata`);
    }
    for (const field of ["reviewedCandidateCount", "approvedCount", "rejectedCount", "deferredCount"] as const) {
      if (artifact[field] !== reviewPackage[field]) errors.push(`package ${field} does not match artifact metadata`);
    }
  }
  return errors;
}

function discoveryEnvelopeErrors(input: {
  artifact: StoredArtifact;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
}): string[] {
  const errors: string[] = [];
  const result = input.artifact.result;
  if (input.artifact.kind !== "candidate_discovery_result" || input.artifact.artifactKind !== "candidate_discovery_result") {
    errors.push("linked Candidate Discovery artifact kind is invalid");
  }
  if (input.artifact.artifactId !== input.candidateDiscoveryArtifactId) errors.push("linked Candidate Discovery artifactId does not match review lineage");
  if (input.artifact.siteVersionId !== input.siteVersionId) errors.push("linked Candidate Discovery siteVersionId does not match review lineage");
  if (input.artifact.dryRunId !== input.dryRunId) errors.push("linked Candidate Discovery dryRunId does not match review lineage");
  if (!isRecord(result)) return [...errors, "linked Candidate Discovery result is missing"];
  if (result.siteVersionId !== input.siteVersionId) errors.push("linked Candidate Discovery result siteVersionId does not match review lineage");
  if (result.dryRunId !== input.dryRunId) errors.push("linked Candidate Discovery result dryRunId does not match review lineage");
  return errors;
}

function artifactMetadata(input: {
  artifact: StoredArtifact;
  siteVersionId: string;
  latestReviewArtifactId: string | null;
}): NonNullable<CandidateReviewSurfaceProjection["artifact"]> {
  return {
    kind: CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND,
    artifactId: safeString(input.artifact.artifactId),
    artifactVersion: safeNumber(input.artifact.artifactVersion),
    reviewPackageId: safeString(input.artifact.reviewPackageId),
    candidateDiscoveryArtifactId: safeString(input.artifact.candidateDiscoveryArtifactId),
    siteVersionId: input.siteVersionId,
    dryRunId: safeString(input.artifact.dryRunId),
    contractVersion: safeString(input.artifact.contractVersion),
    createdAt: safeString(input.artifact.createdAt),
    persistedAt: safeString(input.artifact.persistedAt),
    isLatestReviewArtifact: safeString(input.artifact.artifactId) === input.latestReviewArtifactId,
  };
}

export function projectCandidateReviewSurface(input: {
  siteVersionId: string;
  artifact: unknown;
  linkedCandidateDiscoveryArtifact: unknown;
  latestReviewArtifactId?: string | null;
  latestCandidateDiscoveryArtifactId?: string | null;
}): CandidateReviewSurfaceProjection {
  if (!isRecord(input.artifact)) return missingProjection(input.siteVersionId);

  const artifact = input.artifact;
  const metadata = artifactMetadata({
    artifact,
    siteVersionId: input.siteVersionId,
    latestReviewArtifactId: input.latestReviewArtifactId ?? safeString(artifact.artifactId),
  });
  const packageValidation = validateCandidateReviewPackage(artifact.package);
  const reviewPackage = packageValidation.valid ? cloneJson(artifact.package) as CandidateReviewPackage : null;
  const persistedValidation = isRecord(artifact.validation) ? artifact.validation : null;
  const warnings = [
    ...safeStrings(persistedValidation?.warnings),
    ...packageValidation.warnings,
  ];
  const artifactErrors = reviewEnvelopeErrors({ artifact, siteVersionId: input.siteVersionId, reviewPackage });
  const packageErrors = [...safeStrings(persistedValidation?.errors), ...packageValidation.errors];
  const linkedArtifact = isRecord(input.linkedCandidateDiscoveryArtifact)
    ? input.linkedCandidateDiscoveryArtifact
    : null;
  const candidateDiscoveryErrors: string[] = [];
  let candidates: Candidate[] = [];
  let linkedCandidateDiscovery: CandidateReviewSurfaceProjection["linkedCandidateDiscovery"] = null;

  if (reviewPackage && linkedArtifact) {
    const discoveryValidation = validateCandidateDiscoveryResult(linkedArtifact.result);
    candidateDiscoveryErrors.push(...discoveryValidation.errors);
    candidateDiscoveryErrors.push(...discoveryEnvelopeErrors({
      artifact: linkedArtifact,
      candidateDiscoveryArtifactId: reviewPackage.candidateDiscoveryArtifactId,
      siteVersionId: reviewPackage.siteVersionId,
      dryRunId: reviewPackage.dryRunId,
    }));
    if (!isRecord(linkedArtifact.validation) || linkedArtifact.validation.valid !== true) {
      candidateDiscoveryErrors.push("linked Candidate Discovery persisted validation is invalid");
    }
    if (discoveryValidation.valid && isRecord(linkedArtifact.result)) {
      const result = cloneJson(linkedArtifact.result) as {
        discoveryId: string;
        candidates: Candidate[];
        candidateTypesPresent: CandidateType[];
      };
      candidates = result.candidates;
      const latestArtifactId = input.latestCandidateDiscoveryArtifactId ?? null;
      linkedCandidateDiscovery = {
        artifactId: reviewPackage.candidateDiscoveryArtifactId,
        latestArtifactId,
        discoveryId: result.discoveryId,
        siteVersionId: reviewPackage.siteVersionId,
        dryRunId: reviewPackage.dryRunId,
        candidateCount: candidates.length,
        candidateTypesPresent: CANDIDATE_TYPES.filter((type) => result.candidateTypesPresent.includes(type)),
        validationStatus: candidateDiscoveryErrors.length === 0 ? "valid" : "invalid",
        stale: latestArtifactId !== null && latestArtifactId !== reviewPackage.candidateDiscoveryArtifactId,
      };
    }
  } else if (reviewPackage) {
    candidateDiscoveryErrors.push("linked Candidate Discovery artifact is missing");
  }

  const reviewEventErrors: string[] = [];
  if (reviewPackage && candidates.length >= 0) {
    const candidateIds = new Set(candidates.map((candidate) => candidate.candidateId));
    for (const event of reviewPackage.reviewEvents) {
      if (!candidateIds.has(event.candidateId)) reviewEventErrors.push(`review event candidate is missing from linked Discovery: ${event.candidateId}`);
    }
  }
  const allErrors = [...artifactErrors, ...packageErrors, ...candidateDiscoveryErrors, ...reviewEventErrors];
  const baseDiagnostics = {
    artifact: safeStrings(artifact.diagnostics),
    package: reviewPackage ? [...reviewPackage.diagnostics, ...packageErrors] : packageErrors,
    reviewEvents: reviewPackage
      ? [...reviewPackage.reviewEvents.flatMap((event) => event.diagnostics), ...reviewEventErrors]
      : reviewEventErrors,
    candidateDiscovery: [
      ...safeStrings(linkedArtifact?.diagnostics),
      ...(isRecord(linkedArtifact?.result) ? safeStrings(linkedArtifact.result.diagnostics) : []),
      ...candidateDiscoveryErrors,
    ],
  };

  if (allErrors.length > 0 || !reviewPackage || !linkedCandidateDiscovery) {
    return {
      siteVersionId: input.siteVersionId,
      artifact: metadata,
      validation: { status: "invalid", errors: [...new Set(allErrors)], warnings: [...new Set(warnings)] },
      linkedCandidateDiscovery,
      counts: emptyCounts(),
      groupedLatestDecisions: emptyDecisionGroups(),
      unreviewedCandidates: emptyGroups(),
      reviewEventHistory: [],
      state: "invalid",
      attentionStates: [],
      diagnostics: baseDiagnostics,
    };
  }

  const latestDecisions = deriveLatestCandidateReviewDecisions(reviewPackage.reviewEvents);
  const decisionsByCandidate = new Map(latestDecisions.map((decision) => [decision.candidateId, decision]));
  const decisionItems = new Map(candidates.map((candidate) => {
    const decision = decisionsByCandidate.get(candidate.candidateId);
    return [candidate.candidateId, decision ? {
      reviewEventId: decision.reviewEventId,
      candidateId: decision.candidateId,
      decision: decision.decision,
      reviewerRef: decision.reviewerRef,
      decidedAt: decision.decidedAt,
      ...(decision.rationale === undefined ? {} : { rationale: decision.rationale }),
      supersedesReviewEventId: decision.supersedesReviewEventId,
      diagnostics: [...decision.diagnostics],
      candidate: candidateContext(candidate),
    } satisfies CandidateReviewSurfaceDecision : null] as const;
  }));
  const groupedLatestDecisions = Object.fromEntries(CANDIDATE_REVIEW_DECISIONS.map((decision) => [
    decision,
    groupByDiscoveryOrder(candidates, (candidate) => {
      const item = decisionItems.get(candidate.candidateId);
      return item?.decision === decision ? item : null;
    }),
  ])) as CandidateReviewSurfaceProjection["groupedLatestDecisions"];
  const unreviewedCandidates = groupByDiscoveryOrder(candidates, (candidate) =>
    decisionsByCandidate.has(candidate.candidateId) ? null : candidateContext(candidate));
  const supersededIds = new Set(reviewPackage.reviewEvents
    .map((event) => event.supersedesReviewEventId)
    .filter((eventId): eventId is string => eventId !== null));
  const headsByCandidate = new Map(latestDecisions.map((decision) => [decision.candidateId, decision.reviewEventId]));
  const reviewEventHistory = [...cloneJson(reviewPackage.reviewEvents)]
    .sort((left, right) => left.decidedAt.localeCompare(right.decidedAt) || left.reviewEventId.localeCompare(right.reviewEventId))
    .map((event) => ({
      ...event,
      superseded: supersededIds.has(event.reviewEventId),
      chainHeadReviewEventId: headsByCandidate.get(event.candidateId) ?? null,
    }));
  const counts: CandidateReviewSurfaceProjection["counts"] = {
    candidates: candidates.length,
    reviewed: latestDecisions.length,
    unreviewed: candidates.length - latestDecisions.length,
    approved: latestDecisions.filter((event) => event.decision === "approved").length,
    rejected: latestDecisions.filter((event) => event.decision === "rejected").length,
    deferred: latestDecisions.filter((event) => event.decision === "deferred").length,
    reviewEvents: reviewPackage.reviewEvents.length,
    supersededEvents: supersededIds.size,
  };
  const attentionStates: CandidateReviewSurfaceAttentionState[] = [];
  if (reviewPackage.reviewEvents.length === 0 && latestDecisions.length === 0) attentionStates.push("empty_review_package");
  if (candidates.length > 0 && latestDecisions.length === 0) attentionStates.push("all_candidates_unreviewed");
  if (linkedCandidateDiscovery.stale) attentionStates.push("stale");
  if (supersededIds.size > 0) attentionStates.push("has_superseded_events");

  return {
    siteVersionId: input.siteVersionId,
    artifact: metadata,
    validation: { status: "valid", errors: [], warnings: [...new Set(warnings)] },
    linkedCandidateDiscovery,
    counts,
    groupedLatestDecisions,
    unreviewedCandidates,
    reviewEventHistory,
    state: "ready",
    attentionStates,
    diagnostics: baseDiagnostics,
  };
}

function collectArtifacts(summary: RuntimeImportProvenanceSummary | null | undefined, field: "review" | "discovery"): StoredArtifact[] {
  const values: unknown[] = [];
  if (field === "review") {
    const provenance = summary as CandidateReviewPackageProvenanceSummary | null | undefined;
    if (provenance?.latestCandidateReviewPackageArtifact) values.push(provenance.latestCandidateReviewPackageArtifact);
    if (Array.isArray(provenance?.candidateReviewPackageArtifacts)) values.push(...provenance.candidateReviewPackageArtifacts);
  } else {
    const provenance = summary as CandidateDiscoveryResultProvenanceSummary | null | undefined;
    if (provenance?.latestCandidateDiscoveryResultArtifact) values.push(provenance.latestCandidateDiscoveryResultArtifact);
    if (Array.isArray(provenance?.candidateDiscoveryResultArtifacts)) values.push(...provenance.candidateDiscoveryResultArtifacts);
  }
  return values.filter(isRecord);
}

function latestReviewArtifact(summary: RuntimeImportProvenanceSummary | null | undefined, siteVersionId: string): StoredArtifact | null {
  const provenance = summary as CandidateReviewPackageProvenanceSummary | null | undefined;
  const pointer = provenance?.latestCandidateReviewPackageArtifact;
  if (isRecord(pointer) && pointer.siteVersionId === siteVersionId) return pointer;
  return collectArtifacts(summary, "review")
    .filter((artifact) => artifact.siteVersionId === siteVersionId && (
      artifact.kind === CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND || artifact.artifactKind === CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND))
    .sort((left, right) => String(left.persistedAt ?? "").localeCompare(String(right.persistedAt ?? "")) ||
      String(left.artifactId ?? "").localeCompare(String(right.artifactId ?? "")))
    .at(-1) ?? null;
}

async function defaultGetSiteVersion(siteVersionId: string, options: CandidateReviewPersistenceOptions): Promise<SurfaceSiteVersion | null> {
  const { getSiteVersion } = await import("@/gnr8/runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

export async function loadLatestCandidateReviewSurfaceProjection(input: {
  siteVersionId: string;
  options?: CandidateReviewPersistenceOptions;
}): Promise<CandidateReviewSurfaceProjection> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return missingProjection(input.siteVersionId);
  const summary = siteVersion.importProvenanceSummary;
  const reviewArtifact = latestReviewArtifact(summary, input.siteVersionId);
  if (!reviewArtifact) return missingProjection(input.siteVersionId);
  const discoveryArtifacts = collectArtifacts(summary, "discovery");
  const linkedArtifactId = safeString(reviewArtifact.candidateDiscoveryArtifactId) ??
    (isRecord(reviewArtifact.package) ? safeString(reviewArtifact.package.candidateDiscoveryArtifactId) : null);
  const linkedArtifact = discoveryArtifacts.find((artifact) => artifact.artifactId === linkedArtifactId) ?? null;
  const latestDiscoveryPointer = (summary as CandidateDiscoveryResultProvenanceSummary | null | undefined)
    ?.latestCandidateDiscoveryResultArtifact;
  return projectCandidateReviewSurface({
    siteVersionId: input.siteVersionId,
    artifact: reviewArtifact,
    linkedCandidateDiscoveryArtifact: linkedArtifact,
    latestReviewArtifactId: safeString(reviewArtifact.artifactId),
    latestCandidateDiscoveryArtifactId: isRecord(latestDiscoveryPointer) ? safeString(latestDiscoveryPointer.artifactId) : null,
  });
}
