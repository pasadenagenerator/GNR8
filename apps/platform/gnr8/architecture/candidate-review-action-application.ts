/**
 * Phase 8D-11 Candidate Review Action application.
 *
 * Applies one backend review action to one authoritative package snapshot. It
 * creates no route, UI action, reconstruction, generated output, or publishing
 * behavior.
 */

import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  createCandidateReviewEventFromAction,
  validateCandidateReviewActionRequest,
  type CandidateReviewActionRequest,
  type CandidateReviewActionResult,
  type CandidateReviewActionValidationResult,
} from "./candidate-review-action-contract";
import {
  deriveLatestCandidateReviewDecisions,
  validateCandidateReviewPackage,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";
import {
  loadCandidateReviewPackageById,
  loadCandidateReviewPackageByReviewEventId,
  persistCandidateReviewPackage,
  type CandidateReviewPackageArtifactRecord,
  type CandidateReviewPackageArtifactReference,
  type CandidateReviewPersistenceOptions,
} from "./candidate-review-persistence";

const BASE_ARTIFACT_DIAGNOSTIC = "CANDIDATE_REVIEW_ACTION_BASE_ARTIFACT_ID=";

export type CandidateReviewActionApplicationInput = {
  readonly request: CandidateReviewActionRequest;
  readonly latestCandidateReviewPackage: CandidateReviewPackageArtifactRecord;
  readonly candidateDiscoveryResult: CandidateDiscoveryResult;
  readonly contractVersion: string;
  readonly createdAt?: string;
  readonly persistenceOptions?: CandidateReviewPersistenceOptions;
};

export type CandidateReviewActionApplicationResult = {
  readonly actionResult: CandidateReviewActionResult;
  readonly candidateReviewPackage: CandidateReviewPackage | null;
  readonly baseCandidateReviewPackageArtifactId: string;
  readonly resultingCandidateReviewPackageArtifact: CandidateReviewPackageArtifactReference | null;
  readonly replayed: boolean;
};

function artifactReference(
  artifact: CandidateReviewPackageArtifactRecord,
): CandidateReviewPackageArtifactReference {
  const { package: _package, ...reference } = artifact;
  return structuredClone(reference);
}

function rejectedResult(
  request: CandidateReviewActionRequest,
  errors: readonly string[],
): CandidateReviewActionResult {
  const validation: CandidateReviewActionValidationResult = {
    valid: false,
    errors: [...errors],
    warnings: [],
  };
  return {
    actionId: typeof request?.actionId === "string" ? request.actionId : "",
    accepted: false,
    validation,
    candidateReviewEvent: null,
    diagnostics: [...errors],
  };
}

function rejectedApplicationResult(
  input: CandidateReviewActionApplicationInput,
  errors: readonly string[],
): CandidateReviewActionApplicationResult {
  return {
    actionResult: rejectedResult(input.request, errors),
    candidateReviewPackage: null,
    baseCandidateReviewPackageArtifactId:
      typeof input.request?.target?.candidateReviewPackageArtifactId === "string"
        ? input.request.target.candidateReviewPackageArtifactId
        : "",
    resultingCandidateReviewPackageArtifact: null,
    replayed: false,
  };
}

function currentHead(
  reviewPackage: CandidateReviewPackage,
  candidateId: string,
): CandidateReviewEvent | null {
  return reviewPackage.latestDecisions.find((event) =>
    event.candidateDiscoveryArtifactId === reviewPackage.candidateDiscoveryArtifactId &&
    event.candidateId === candidateId) ?? null;
}

function actionEventWithBase(
  event: CandidateReviewEvent,
  baseArtifactId: string,
): CandidateReviewEvent {
  return Object.freeze({
    ...event,
    diagnostics: Object.freeze([
      ...event.diagnostics,
      `${BASE_ARTIFACT_DIAGNOSTIC}${baseArtifactId}`,
    ]),
  });
}

function sameEvent(left: CandidateReviewEvent, right: CandidateReviewEvent): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createPackage(
  base: CandidateReviewPackage,
  event: CandidateReviewEvent,
  createdAt: string,
): CandidateReviewPackage {
  const reviewEvents = Object.freeze([...base.reviewEvents, event]);
  const latestDecisions = Object.freeze(
    deriveLatestCandidateReviewDecisions(reviewEvents).map((decision) => Object.freeze({
      ...decision,
      diagnostics: Object.freeze([...decision.diagnostics]),
    })),
  );
  return Object.freeze({
    reviewPackageId: base.reviewPackageId,
    candidateDiscoveryArtifactId: base.candidateDiscoveryArtifactId,
    siteVersionId: base.siteVersionId,
    dryRunId: base.dryRunId,
    reviewEvents,
    latestDecisions,
    reviewedCandidateCount: latestDecisions.length,
    approvedCount: latestDecisions.filter(({ decision }) => decision === "approved").length,
    rejectedCount: latestDecisions.filter(({ decision }) => decision === "rejected").length,
    deferredCount: latestDecisions.filter(({ decision }) => decision === "deferred").length,
    diagnostics: Object.freeze([...base.diagnostics]),
    createdAt,
  });
}

async function classifyReplay(
  input: CandidateReviewActionApplicationInput,
): Promise<CandidateReviewActionApplicationResult | null> {
  const request = input.request;
  if (
    typeof request?.actionId !== "string" ||
    typeof request?.target?.siteVersionId !== "string" ||
    typeof request?.target?.candidateDiscoveryArtifactId !== "string"
  ) return null;

  const resultingArtifact = await loadCandidateReviewPackageByReviewEventId({
    siteVersionId: request.target.siteVersionId,
    candidateDiscoveryArtifactId: request.target.candidateDiscoveryArtifactId,
    reviewEventId: `candidate-review-event:${request.actionId}`,
    options: input.persistenceOptions,
  });
  if (!resultingArtifact) return null;

  const baseArtifact = await loadCandidateReviewPackageById({
    siteVersionId: request.target.siteVersionId,
    artifactId: request.target.candidateReviewPackageArtifactId,
    options: input.persistenceOptions,
  });
  const existingEvent = resultingArtifact.package.reviewEvents.find(
    ({ reviewEventId }) => reviewEventId === `candidate-review-event:${request.actionId}`,
  );
  if (!baseArtifact || !existingEvent) {
    return rejectedApplicationResult(input, ["CANDIDATE_REVIEW_ACTION_IDEMPOTENCY_CONFLICT"]);
  }

  const expected = createCandidateReviewEventFromAction(
    request,
    baseArtifact.package,
    currentHead(baseArtifact.package, request.target.candidateId),
    {
      linkedCandidateDiscoveryResult: input.candidateDiscoveryResult,
      latestCandidateReviewPackageArtifactId: baseArtifact.artifactId,
    },
  );
  if (!expected.accepted || !expected.candidateReviewEvent) {
    return rejectedApplicationResult(input, [
      "CANDIDATE_REVIEW_ACTION_IDEMPOTENCY_CONFLICT",
      ...expected.diagnostics,
    ]);
  }
  const expectedEvent = actionEventWithBase(expected.candidateReviewEvent, baseArtifact.artifactId);
  if (!sameEvent(existingEvent, expectedEvent)) {
    return rejectedApplicationResult(input, ["CANDIDATE_REVIEW_ACTION_IDEMPOTENCY_CONFLICT"]);
  }

  return {
    actionResult: { ...expected, candidateReviewEvent: existingEvent },
    candidateReviewPackage: structuredClone(resultingArtifact.package),
    baseCandidateReviewPackageArtifactId: baseArtifact.artifactId,
    resultingCandidateReviewPackageArtifact: artifactReference(resultingArtifact),
    replayed: true,
  };
}

export async function applyCandidateReviewAction(
  input: CandidateReviewActionApplicationInput,
): Promise<CandidateReviewActionApplicationResult> {
  const requestValidation = validateCandidateReviewActionRequest(
    input.request,
    input.latestCandidateReviewPackage.package,
    { linkedCandidateDiscoveryResult: input.candidateDiscoveryResult },
  );
  if (!requestValidation.valid) {
    return rejectedApplicationResult(input, requestValidation.errors);
  }

  const replay = await classifyReplay(input);
  if (replay) return replay;

  const baseArtifact = input.latestCandidateReviewPackage;
  if (input.request.target.candidateReviewPackageArtifactId !== baseArtifact.artifactId) {
    return rejectedApplicationResult(input, ["CANDIDATE_REVIEW_PACKAGE_STALE"]);
  }

  const actionResult = createCandidateReviewEventFromAction(
    input.request,
    baseArtifact.package,
    currentHead(baseArtifact.package, input.request.target.candidateId),
    {
      linkedCandidateDiscoveryResult: input.candidateDiscoveryResult,
      latestCandidateReviewPackageArtifactId: baseArtifact.artifactId,
    },
  );
  if (!actionResult.accepted || !actionResult.candidateReviewEvent) {
    return {
      actionResult,
      candidateReviewPackage: null,
      baseCandidateReviewPackageArtifactId: baseArtifact.artifactId,
      resultingCandidateReviewPackageArtifact: null,
      replayed: false,
    };
  }

  const event = actionEventWithBase(actionResult.candidateReviewEvent, baseArtifact.artifactId);
  const candidateReviewPackage = createPackage(
    baseArtifact.package,
    event,
    input.createdAt ?? new Date().toISOString(),
  );
  const packageValidation = validateCandidateReviewPackage(candidateReviewPackage);
  if (!packageValidation.valid) {
    return rejectedApplicationResult(input, [
      "CANDIDATE_REVIEW_ACTION_PACKAGE_VALIDATION_FAILED",
      ...packageValidation.errors,
    ]);
  }

  const persistedArtifact = await persistCandidateReviewPackage({
    siteVersionId: input.request.target.siteVersionId,
    candidateDiscoveryArtifactId: input.request.target.candidateDiscoveryArtifactId,
    reviewPackage: candidateReviewPackage,
    contractVersion: input.contractVersion,
    expectedLatestArtifactId: baseArtifact.artifactId,
    options: input.persistenceOptions,
  });

  return {
    actionResult: { ...actionResult, candidateReviewEvent: event },
    candidateReviewPackage,
    baseCandidateReviewPackageArtifactId: baseArtifact.artifactId,
    resultingCandidateReviewPackageArtifact: persistedArtifact,
    replayed: false,
  };
}
