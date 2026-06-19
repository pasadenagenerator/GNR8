/**
 * Phase 8D-9 Candidate Review Action contract.
 *
 * This module validates one review action and can create one immutable review
 * event. It does not mutate or persist packages, expose UI, reconstruct,
 * generate output, execute work, or publish artifacts.
 */

import {
  validateCandidateDiscoveryResult,
  type CandidateDiscoveryResult,
} from "./candidate-discovery-contract";
import {
  validateCandidateReviewPackage,
  type CandidateReviewDecision,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";

export const CANDIDATE_REVIEW_ACTION_TYPES = ["approve", "reject", "defer"] as const;
export type CandidateReviewActionType = (typeof CANDIDATE_REVIEW_ACTION_TYPES)[number];

export const CANDIDATE_REVIEW_ACTION_DECISIONS = {
  approve: "approved",
  reject: "rejected",
  defer: "deferred",
} as const satisfies Readonly<Record<CandidateReviewActionType, CandidateReviewDecision>>;

export const CANDIDATE_REVIEW_FORBIDDEN_ACTION_TYPES = [
  "edit",
  "modify",
  "generate",
  "reconstruct",
  "publish",
  "execute",
  "accept_for_execution",
] as const;

export const CANDIDATE_REVIEW_ACTION_FORBIDDEN_FIELDS = [
  "reactOutput",
  "generatedOutputs",
  "generatedBlocks",
  "generatedContent",
  "designTokens",
  "publishingArtifacts",
  "reconstructionArtifacts",
  "executionArtifacts",
] as const;

export type CandidateReviewActionActor = {
  readonly actorRef: string;
  readonly actorRole: "superadmin";
};

export type CandidateReviewActionTarget = {
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly candidateId: string;
  readonly candidateReviewPackageArtifactId: string;
};

export type CandidateReviewActionRequest = {
  readonly actionId: string;
  readonly actionType: CandidateReviewActionType;
  readonly actor: CandidateReviewActionActor;
  readonly target: CandidateReviewActionTarget;
  readonly rationale: string;
  readonly requestedAt: string;
};

export type CandidateReviewActionValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};

export type CandidateReviewActionResult = {
  readonly actionId: string;
  readonly accepted: boolean;
  readonly validation: CandidateReviewActionValidationResult;
  readonly candidateReviewEvent: CandidateReviewEvent | null;
  readonly diagnostics: readonly string[];
};

export type CandidateReviewActionValidationContext = {
  readonly linkedCandidateDiscoveryResult?: CandidateDiscoveryResult;
  readonly latestCandidateReviewPackageArtifactId?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if ((!isObject(value) && !Array.isArray(value)) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (CANDIDATE_REVIEW_ACTION_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Candidate Review actions`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

export function validateCandidateReviewActionRequest(
  request: unknown,
  existingPackage: CandidateReviewPackage,
  context: CandidateReviewActionValidationContext = {},
): CandidateReviewActionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(request)) {
    return { valid: false, errors: ["Candidate Review action request must be an object"], warnings };
  }

  validateForbiddenFields(request, "", errors, new WeakSet<object>());
  if (!isNonEmptyString(request.actionId)) errors.push("actionId is required");
  if (!CANDIDATE_REVIEW_ACTION_TYPES.includes(request.actionType as never)) {
    errors.push("actionType must be approve, reject, or defer");
  }
  if (!isNonEmptyString(request.rationale)) errors.push("rationale is required");
  if (!isTimestamp(request.requestedAt)) errors.push("requestedAt must be a valid timestamp");

  const actor = request.actor;
  if (!isObject(actor)) {
    errors.push("actor must be an object");
  } else {
    if (!isNonEmptyString(actor.actorRef)) errors.push("actor.actorRef is required");
    if (actor.actorRole !== "superadmin") errors.push("actor.actorRole must be superadmin");
  }

  const target = request.target;
  if (!isObject(target)) {
    errors.push("target must be an object");
  } else {
    for (const field of [
      "siteVersionId",
      "dryRunId",
      "candidateDiscoveryArtifactId",
      "candidateId",
      "candidateReviewPackageArtifactId",
    ] as const) {
      if (!isNonEmptyString(target[field])) errors.push(`target.${field} is required`);
    }

    const packageValidation = validateCandidateReviewPackage(existingPackage);
    if (!packageValidation.valid) {
      errors.push(...packageValidation.errors.map((error) => `existingPackage: ${error}`));
    }
    if (target.siteVersionId !== existingPackage.siteVersionId) {
      errors.push("target.siteVersionId must match the Candidate Review package");
    }
    if (target.dryRunId !== existingPackage.dryRunId) {
      errors.push("target.dryRunId must match the Candidate Review package");
    }
    if (target.candidateDiscoveryArtifactId !== existingPackage.candidateDiscoveryArtifactId) {
      errors.push("target.candidateDiscoveryArtifactId must match the Candidate Review package");
    }

    const latestArtifactId = context.latestCandidateReviewPackageArtifactId;
    if (latestArtifactId !== undefined && target.candidateReviewPackageArtifactId !== latestArtifactId) {
      errors.push("target.candidateReviewPackageArtifactId is stale");
    }

    const discovery = context.linkedCandidateDiscoveryResult;
    if (discovery !== undefined) {
      const discoveryValidation = validateCandidateDiscoveryResult(discovery);
      if (!discoveryValidation.valid) {
        errors.push(...discoveryValidation.errors.map((error) => `linkedCandidateDiscoveryResult: ${error}`));
      }
      if (target.siteVersionId !== discovery.siteVersionId) {
        errors.push("target.siteVersionId must match the linked Candidate Discovery result");
      }
      if (target.dryRunId !== discovery.dryRunId) {
        errors.push("target.dryRunId must match the linked Candidate Discovery result");
      }
      if (!discovery.candidates.some(({ candidateId }) => candidateId === target.candidateId)) {
        errors.push("target.candidateId must exist in the linked Candidate Discovery result");
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function rejectedResult(actionId: unknown, validation: CandidateReviewActionValidationResult): CandidateReviewActionResult {
  const diagnostics = validation.errors.length > 0
    ? [...validation.errors]
    : ["Candidate Review action request was rejected"];
  return {
    actionId: typeof actionId === "string" ? actionId : "",
    accepted: false,
    validation,
    candidateReviewEvent: null,
    diagnostics,
  };
}

export function createCandidateReviewEventFromAction(
  request: CandidateReviewActionRequest,
  existingPackage: CandidateReviewPackage,
  currentLatestDecision: CandidateReviewEvent | null = null,
  context: CandidateReviewActionValidationContext = {},
): CandidateReviewActionResult {
  const validation = validateCandidateReviewActionRequest(request, existingPackage, context);
  if (!validation.valid) return rejectedResult(request.actionId, validation);

  const packageHead = existingPackage.latestDecisions.find(
    (event) =>
      event.candidateDiscoveryArtifactId === request.target.candidateDiscoveryArtifactId &&
      event.candidateId === request.target.candidateId,
  ) ?? null;
  const headErrors: string[] = [];
  if (currentLatestDecision !== null) {
    if (
      currentLatestDecision.candidateDiscoveryArtifactId !== request.target.candidateDiscoveryArtifactId ||
      currentLatestDecision.candidateId !== request.target.candidateId ||
      currentLatestDecision.siteVersionId !== request.target.siteVersionId ||
      currentLatestDecision.dryRunId !== request.target.dryRunId
    ) {
      headErrors.push("current latest decision must match the action target lineage");
    }
  }
  if ((packageHead?.reviewEventId ?? null) !== (currentLatestDecision?.reviewEventId ?? null)) {
    headErrors.push("current latest decision must match the Candidate Review package head");
  }
  if (headErrors.length > 0) {
    return rejectedResult(request.actionId, { valid: false, errors: headErrors, warnings: [] });
  }

  const candidateReviewEvent: CandidateReviewEvent = Object.freeze({
    reviewEventId: `candidate-review-event:${request.actionId}`,
    candidateDiscoveryArtifactId: request.target.candidateDiscoveryArtifactId,
    candidateId: request.target.candidateId,
    siteVersionId: request.target.siteVersionId,
    dryRunId: request.target.dryRunId,
    reviewerRef: request.actor.actorRef,
    decision: CANDIDATE_REVIEW_ACTION_DECISIONS[request.actionType],
    decidedAt: request.requestedAt,
    supersedesReviewEventId: currentLatestDecision?.reviewEventId ?? null,
    rationale: request.rationale,
    diagnostics: Object.freeze([] as string[]),
  });

  return {
    actionId: request.actionId,
    accepted: true,
    validation,
    candidateReviewEvent,
    diagnostics: [],
  };
}
