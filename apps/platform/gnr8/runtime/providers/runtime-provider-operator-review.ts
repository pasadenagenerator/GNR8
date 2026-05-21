import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifact } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff";

export type RuntimeProviderOperatorReviewStatus =
  | "pending_review"
  | "approved_for_future_execution"
  | "rejected"
  | "needs_changes";

export type RuntimeProviderOperatorReviewDiagnosticCode =
  | "OPERATOR_REVIEW_CREATED"
  | "OPERATOR_REVIEW_REJECTED"
  | "OPERATOR_REVIEW_NEEDS_CHANGES";

export type RuntimeProviderOperatorReviewArtifact = {
  reviewId: string;
  handoffId: string;
  correlationKey: string;
  reviewerRef: string;
  reviewStatus: RuntimeProviderOperatorReviewStatus;
  reviewReason: string;
  createdAt: string;
};

export type RuntimeProviderOperatorReviewResult = {
  reviewArtifact: RuntimeProviderOperatorReviewArtifact | null;
  executionBlocked: true;
  executionAuthorized: false;
  intentOnly: true;
  blockedReasons: string[];
  diagnostics: string[];
  correlationKey: string;
};

type HandoffReference = Pick<RuntimeProviderExecutionHandoffArtifact, "handoffId" | "correlationKey">;

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function resolveDiagnostics(status: RuntimeProviderOperatorReviewStatus): [RuntimeProviderOperatorReviewDiagnosticCode, string] {
  if (status === "rejected") return ["OPERATOR_REVIEW_REJECTED", "REVIEW_REJECTED"];
  if (status === "needs_changes") return ["OPERATOR_REVIEW_NEEDS_CHANGES", "REVIEW_NEEDS_CHANGES"];
  return ["OPERATOR_REVIEW_CREATED", `REVIEW_STATUS_${status.toUpperCase()}`];
}

function resolveMissingReferences(input: {
  handoffRef: Partial<HandoffReference> | null | undefined;
  reviewerRef: unknown;
}): string[] {
  const missing: string[] = [];
  if (!sanitizeToken(input.handoffRef?.handoffId)) missing.push("handoffId");
  if (!sanitizeToken(input.handoffRef?.correlationKey)) missing.push("handoffCorrelationKey");
  if (!sanitizeToken(input.reviewerRef)) missing.push("reviewerRef");
  return missing.sort((a, b) => a.localeCompare(b));
}

export function createRuntimeProviderOperatorReview(input: {
  handoffRef: Partial<HandoffReference> | null | undefined;
  reviewerRef: string;
  reviewStatus: RuntimeProviderOperatorReviewStatus;
  reviewReason?: string;
  createdAt?: string;
}): RuntimeProviderOperatorReviewResult {
  const missingReferences = resolveMissingReferences({
    handoffRef: input.handoffRef,
    reviewerRef: input.reviewerRef,
  });

  const fallbackCorrelationKey = createRuntimeCorrelationKey({
    diagnostic: "OPERATOR_REVIEW_FAILED_CLOSED",
    missingReferences: missingReferences.join(","),
    requestedStatus: input.reviewStatus,
  });

  if (missingReferences.length > 0) {
    return {
      reviewArtifact: null,
      executionBlocked: true,
      executionAuthorized: false,
      intentOnly: true,
      blockedReasons: [`missing_required_operator_review_references:${missingReferences.join(",")}`],
      diagnostics: ["OPERATOR_REVIEW_REJECTED:MISSING_REQUIRED_REFERENCES"],
      correlationKey: fallbackCorrelationKey,
    };
  }

  const handoffId = sanitizeToken(input.handoffRef?.handoffId);
  const handoffCorrelationKey = sanitizeToken(input.handoffRef?.correlationKey);
  const reviewerRef = sanitizeToken(input.reviewerRef);
  const reviewReason = sanitizeToken(input.reviewReason) || "operator_review_recorded";
  const createdAt = sanitizeToken(input.createdAt) || new Date(0).toISOString();

  const correlationKey = createRuntimeCorrelationKey({
    handoffCorrelationKey,
    handoffId,
    reviewerRef,
    reviewStatus: input.reviewStatus,
    reviewReason,
    createdAt,
  });

  const reviewId = createRuntimeCorrelationKey({
    operatorReviewCorrelationKey: correlationKey,
  });

  const reviewArtifact: RuntimeProviderOperatorReviewArtifact = {
    reviewId,
    handoffId,
    correlationKey,
    reviewerRef,
    reviewStatus: input.reviewStatus,
    reviewReason,
    createdAt,
  };

  const [diagnosticCode, reasonCode] = resolveDiagnostics(input.reviewStatus);

  return {
    reviewArtifact,
    executionBlocked: true,
    executionAuthorized: false,
    intentOnly: true,
    blockedReasons: uniqueSorted([
      "provider_execution_disabled_control_plane_boundary",
      input.reviewStatus === "approved_for_future_execution"
        ? "approved_for_future_execution_is_intent_only_not_execution"
        : "operator_review_requires_control_plane_boundary",
    ]),
    diagnostics: [`${diagnosticCode}:${reasonCode}`],
    correlationKey,
  };
}
