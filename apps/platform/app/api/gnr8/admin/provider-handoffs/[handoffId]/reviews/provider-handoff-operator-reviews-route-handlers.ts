import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { getProviderOperatorReviewsByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-operator-review-repository";
import type { RuntimeProviderOperatorReviewArtifact } from "@/gnr8/runtime/providers/runtime-provider-operator-review";

type ReadOnlyOperatorReview = {
  reviewId: string;
  handoffId: string;
  correlationKey: string;
  reviewerRef: string;
  reviewStatus: string;
  reviewReason: string;
  createdAt: string;
};

export type ProviderHandoffOperatorReviewsResponse = {
  reviews: Readonly<ReadOnlyOperatorReview[]>;
  executionBlocked: true;
  intentOnly: true;
  diagnostics: string[];
};

type ProviderHandoffOperatorReviewsRouteDependencies = {
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  getProviderOperatorReviewsByHandoffId: typeof getProviderOperatorReviewsByHandoffId;
  requireAgencyActionContext: typeof requireAgencyActionContext;
};

const SECRET_LIKE = /(token|secret|password|credential|api[_-]?key|bearer|private[_-]?key)/i;

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sanitizeReview(review: RuntimeProviderOperatorReviewArtifact): ReadOnlyOperatorReview {
  const sanitizeSafeText = (value: unknown): string => {
    const token = sanitizeToken(value);
    return SECRET_LIKE.test(token) ? "[redacted]" : token;
  };
  return {
    reviewId: sanitizeToken(review.reviewId),
    handoffId: sanitizeToken(review.handoffId),
    correlationKey: sanitizeToken(review.correlationKey),
    reviewerRef: sanitizeSafeText(review.reviewerRef),
    reviewStatus: sanitizeToken(review.reviewStatus),
    reviewReason: sanitizeSafeText(review.reviewReason),
    createdAt: sanitizeToken(review.createdAt),
  };
}

export function createProviderHandoffOperatorReviewsRouteHandlers(
  deps: Partial<ProviderHandoffOperatorReviewsRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffOperatorReviewsRouteDependencies = {
    getProviderExecutionHandoffByHandoffId,
    getProviderOperatorReviewsByHandoffId,
    requireAgencyActionContext,
    ...deps,
  };

  return {
    async GET(_request: Request, context: { params: Promise<{ handoffId: string }> }): Promise<Response> {
      try {
        const { handoffId } = await context.params;
        const normalizedHandoffId = sanitizeToken(handoffId);
        if (!normalizedHandoffId) {
          return Response.json(
            { reviews: [], executionBlocked: true, intentOnly: true, diagnostics: ["OPERATOR_REVIEW_FAILED_CLOSED:MISSING_HANDOFF_ID"] },
            { status: 400 },
          );
        }

        const handoff = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!handoff) {
          return Response.json(
            { reviews: [], executionBlocked: true, intentOnly: true, diagnostics: ["OPERATOR_REVIEW_FAILED_CLOSED:HANDOFF_NOT_FOUND"] },
            { status: 404 },
          );
        }

        await resolvedDeps.requireAgencyActionContext({ action: "run_migration" });

        const result = await resolvedDeps.getProviderOperatorReviewsByHandoffId(normalizedHandoffId);
        const diagnostics = uniqueSorted(["OPERATOR_REVIEW_READ", ...result.diagnostics]);
        return Response.json(
          {
            reviews: result.reviews.map(sanitizeReview),
            executionBlocked: true,
            intentOnly: true,
            diagnostics,
          } satisfies ProviderHandoffOperatorReviewsResponse,
          { status: 200 },
        );
      } catch (error) {
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message }, { status: mapped.status });
        }
        return Response.json(
          { reviews: [], executionBlocked: true, intentOnly: true, diagnostics: ["OPERATOR_REVIEW_FAILED_CLOSED"] },
          { status: 500 },
        );
      }
    },
  };
}
