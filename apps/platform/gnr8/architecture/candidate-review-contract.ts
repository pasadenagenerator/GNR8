/**
 * Phase 8D-1 Candidate Review contract.
 *
 * This module defines immutable, attributed review events and a derived latest
 * decision projection. It does not persist or execute reviews, reconstruct or
 * generate output, call AI systems, or publish artifacts.
 */

export const CANDIDATE_REVIEW_DECISIONS = ["approved", "rejected", "deferred"] as const;
export type CandidateReviewDecision = (typeof CANDIDATE_REVIEW_DECISIONS)[number];

export type CandidateReviewEvent = {
  readonly reviewEventId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly candidateId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly reviewerRef: string;
  readonly decision: CandidateReviewDecision;
  readonly decidedAt: string;
  readonly supersedesReviewEventId: string | null;
  readonly rationale?: string;
  readonly diagnostics: readonly string[];
};

export type CandidateReviewLatestDecision = CandidateReviewEvent;

export type CandidateReviewPackage = {
  readonly reviewPackageId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly reviewEvents: readonly CandidateReviewEvent[];
  readonly latestDecisions: readonly CandidateReviewLatestDecision[];
  readonly reviewedCandidateCount: number;
  readonly approvedCount: number;
  readonly rejectedCount: number;
  readonly deferredCount: number;
  readonly diagnostics: readonly string[];
  readonly createdAt: string;
};

export type CandidateReviewValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const CANDIDATE_REVIEW_FORBIDDEN_FIELDS = [
  "reactOutput",
  "generatedOutputs",
  "generatedBlocks",
  "generatedContent",
  "designTokens",
  "publishingArtifacts",
  "reconstructionArtifacts",
  "executionArtifacts",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function identityKey(event: Pick<CandidateReviewEvent, "candidateDiscoveryArtifactId" | "candidateId">): string {
  return JSON.stringify([event.candidateDiscoveryArtifactId, event.candidateId]);
}

function compareByDecisionTimeAndId(
  left: CandidateReviewEvent,
  right: CandidateReviewEvent,
): number {
  const timeDifference = Date.parse(left.decidedAt) - Date.parse(right.decidedAt);
  return timeDifference || left.reviewEventId.localeCompare(right.reviewEventId);
}

function isValidSupersession(
  event: CandidateReviewEvent,
  eventsById: ReadonlyMap<string, CandidateReviewEvent>,
): boolean {
  if (event.supersedesReviewEventId === null || event.supersedesReviewEventId === event.reviewEventId) {
    return false;
  }
  const superseded = eventsById.get(event.supersedesReviewEventId);
  return (
    superseded !== undefined &&
    identityKey(event) === identityKey(superseded) &&
    event.siteVersionId === superseded.siteVersionId &&
    event.dryRunId === superseded.dryRunId
  );
}

/**
 * Derives one attributed decision per candidate artifact instance. A valid
 * supersession removes its target from head consideration; unrelated heads
 * fall back to decidedAt and then reviewEventId ordering.
 */
export function deriveLatestCandidateReviewDecisions(
  reviewEvents: readonly CandidateReviewEvent[],
): CandidateReviewLatestDecision[] {
  const eventsById = new Map(reviewEvents.map((event) => [event.reviewEventId, event]));
  const eventsByIdentity = new Map<string, CandidateReviewEvent[]>();

  for (const event of reviewEvents) {
    const key = identityKey(event);
    const events = eventsByIdentity.get(key) ?? [];
    events.push(event);
    eventsByIdentity.set(key, events);
  }

  return [...eventsByIdentity.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, events]) => {
      const supersededIds = new Set(
        events
          .filter((event) => isValidSupersession(event, eventsById))
          .map((event) => event.supersedesReviewEventId as string),
      );
      const heads = events.filter((event) => !supersededIds.has(event.reviewEventId));
      const candidates = heads.length > 0 ? heads : events;
      const latest = [...candidates].sort(compareByDecisionTimeAndId).at(-1) as CandidateReviewEvent;
      return { ...latest, diagnostics: [...latest.diagnostics] };
    });
}

function validateStringArray(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") errors.push(`${path}[${index}] must be a string`);
  }
}

function validateEventShape(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  for (const field of [
    "reviewEventId",
    "candidateDiscoveryArtifactId",
    "candidateId",
    "siteVersionId",
    "dryRunId",
    "reviewerRef",
  ] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`${path}.${field} is required`);
  }
  if (!CANDIDATE_REVIEW_DECISIONS.includes(value.decision as never)) {
    errors.push(`${path}.decision must be approved, rejected, or deferred`);
  }
  if (!isTimestamp(value.decidedAt)) errors.push(`${path}.decidedAt must be a valid timestamp`);
  if (value.supersedesReviewEventId !== null && !isNonEmptyString(value.supersedesReviewEventId)) {
    errors.push(`${path}.supersedesReviewEventId must be null or a non-empty string`);
  }
  if (value.rationale !== undefined && typeof value.rationale !== "string") {
    errors.push(`${path}.rationale must be a string when present`);
  }
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
}

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if (!isObject(value) && !Array.isArray(value)) return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (CANDIDATE_REVIEW_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Candidate Review packages`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateSupersessionGraph(events: readonly CandidateReviewEvent[], errors: string[]): void {
  const eventsById = new Map<string, CandidateReviewEvent>();
  for (const [index, event] of events.entries()) {
    if (eventsById.has(event.reviewEventId)) {
      errors.push(`reviewEvents[${index}].reviewEventId must be unique`);
    } else {
      eventsById.set(event.reviewEventId, event);
    }
  }

  for (const [index, event] of events.entries()) {
    if (event.supersedesReviewEventId === null) continue;
    const target = eventsById.get(event.supersedesReviewEventId);
    if (target === undefined) {
      errors.push(`reviewEvents[${index}].supersedesReviewEventId must reference a review event`);
    } else if (target.reviewEventId === event.reviewEventId) {
      errors.push(`reviewEvents[${index}] must not supersede itself`);
    } else if (identityKey(target) !== identityKey(event)) {
      errors.push(`reviewEvents[${index}] must supersede the same candidate artifact instance`);
    }
  }

  for (const [index, event] of events.entries()) {
    const visited = new Set<string>();
    let current: CandidateReviewEvent | undefined = event;
    while (current !== undefined && current.supersedesReviewEventId !== null) {
      if (visited.has(current.reviewEventId)) {
        errors.push(`reviewEvents[${index}] contains a supersession cycle`);
        break;
      }
      visited.add(current.reviewEventId);
      current = eventsById.get(current.supersedesReviewEventId);
    }
  }
}

function sameDecision(
  actual: CandidateReviewLatestDecision,
  expected: CandidateReviewLatestDecision,
): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function validateCandidateReviewPackage(reviewPackage: unknown): CandidateReviewValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(reviewPackage)) {
    return { valid: false, errors: ["Candidate Review package must be an object"], warnings };
  }

  validateForbiddenFields(reviewPackage, "", errors, new WeakSet<object>());
  for (const field of ["reviewPackageId", "candidateDiscoveryArtifactId", "siteVersionId", "dryRunId"] as const) {
    if (!isNonEmptyString(reviewPackage[field])) errors.push(`${field} is required`);
  }
  if (!isTimestamp(reviewPackage.createdAt)) errors.push("createdAt must be a valid timestamp");
  validateStringArray(reviewPackage.diagnostics, "diagnostics", errors);

  const reviewEvents: CandidateReviewEvent[] = [];
  if (!Array.isArray(reviewPackage.reviewEvents)) {
    errors.push("reviewEvents must be an array");
  } else {
    for (const [index, event] of reviewPackage.reviewEvents.entries()) {
      validateEventShape(event, `reviewEvents[${index}]`, errors);
      if (!isObject(event)) continue;
      if (event.candidateDiscoveryArtifactId !== reviewPackage.candidateDiscoveryArtifactId) {
        errors.push(`reviewEvents[${index}].candidateDiscoveryArtifactId must match the package`);
      }
      if (event.siteVersionId !== reviewPackage.siteVersionId) {
        errors.push(`reviewEvents[${index}].siteVersionId must match the package`);
      }
      if (event.dryRunId !== reviewPackage.dryRunId) {
        errors.push(`reviewEvents[${index}].dryRunId must match the package`);
      }
      reviewEvents.push(event as CandidateReviewEvent);
    }
    validateSupersessionGraph(reviewEvents, errors);
  }

  const latestDecisions: CandidateReviewLatestDecision[] = [];
  if (!Array.isArray(reviewPackage.latestDecisions)) {
    errors.push("latestDecisions must be an array");
  } else {
    const identities = new Set<string>();
    for (const [index, decision] of reviewPackage.latestDecisions.entries()) {
      validateEventShape(decision, `latestDecisions[${index}]`, errors);
      if (!isObject(decision)) continue;
      const typedDecision = decision as CandidateReviewLatestDecision;
      const key = identityKey(typedDecision);
      if (identities.has(key)) errors.push(`latestDecisions[${index}] duplicates a candidate artifact instance`);
      identities.add(key);
      latestDecisions.push(typedDecision);
    }
  }

  if (Array.isArray(reviewPackage.reviewEvents) && Array.isArray(reviewPackage.latestDecisions)) {
    const expected = deriveLatestCandidateReviewDecisions(reviewEvents);
    if (
      expected.length !== latestDecisions.length ||
      expected.some((decision, index) => !sameDecision(latestDecisions[index], decision))
    ) {
      errors.push("latestDecisions must exactly match decisions derived from reviewEvents");
    }
  }

  const expectedCounts = {
    reviewedCandidateCount: latestDecisions.length,
    approvedCount: latestDecisions.filter(({ decision }) => decision === "approved").length,
    rejectedCount: latestDecisions.filter(({ decision }) => decision === "rejected").length,
    deferredCount: latestDecisions.filter(({ decision }) => decision === "deferred").length,
  };
  for (const [field, expected] of Object.entries(expectedCounts)) {
    const actual = reviewPackage[field];
    if (!Number.isInteger(actual) || Number(actual) < 0) {
      errors.push(`${field} must be a non-negative integer`);
    } else if (actual !== expected) {
      errors.push(`${field} must equal ${expected}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export type CreateEmptyCandidateReviewPackageInput = Pick<
  CandidateReviewPackage,
  "candidateDiscoveryArtifactId" | "siteVersionId" | "dryRunId"
>;

export function createEmptyCandidateReviewPackage(
  input: CreateEmptyCandidateReviewPackageInput,
): CandidateReviewPackage {
  return {
    reviewPackageId: `candidate-review:${input.candidateDiscoveryArtifactId}`,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    reviewEvents: [],
    latestDecisions: [],
    reviewedCandidateCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    deferredCount: 0,
    diagnostics: [],
    createdAt: new Date().toISOString(),
  };
}
