import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { createRuntimeProviderOperatorReview } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import { getProviderOperatorReviewsByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-operator-review-repository";
import { createProviderOperatorReviewArtifacts } from "@/gnr8/runtime/providers/runtime-provider-operator-review-repository";
import type {
  RuntimeProviderOperatorReviewArtifact,
  RuntimeProviderOperatorReviewStatus,
} from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

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

const ALLOWED_REVIEW_STATUSES = new Set([
  "pending_review",
  "approved_for_future_execution",
  "rejected",
  "needs_changes",
] as const satisfies readonly RuntimeProviderOperatorReviewStatus[]);

type ReviewCreateRequest = {
  reviewStatus?: string;
  reviewReason?: string;
};

type ProviderHandoffOperatorReviewsRouteDependencies = {
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  getProviderOperatorReviewsByHandoffId: typeof getProviderOperatorReviewsByHandoffId;
  createProviderOperatorReviewArtifacts: typeof createProviderOperatorReviewArtifacts;
  requireAgencyActionContext: typeof requireAgencyActionContext;
  requireSuperadminUserId: typeof requireSuperadminUserId;
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

function sanitizeReviewReason(value: unknown): string {
  const normalized = sanitizeToken(value);
  if (!normalized) return "";
  const redacted = SECRET_LIKE.test(normalized) ? "[redacted]" : normalized;
  return redacted.slice(0, 2000);
}

function isAllowedReviewStatus(value: string): value is RuntimeProviderOperatorReviewStatus {
  return ALLOWED_REVIEW_STATUSES.has(value as RuntimeProviderOperatorReviewStatus);
}

function parseSuperadminAuthError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return { status: 401, message: "Unauthorized" };
  if (error.message.startsWith("Forbidden")) return { status: 403, message: "Forbidden: superadmin only" };
  return null;
}

export function createProviderHandoffOperatorReviewsRouteHandlers(
  deps: Partial<ProviderHandoffOperatorReviewsRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffOperatorReviewsRouteDependencies = {
    getProviderExecutionHandoffByHandoffId,
    getProviderOperatorReviewsByHandoffId,
    createProviderOperatorReviewArtifacts,
    requireAgencyActionContext,
    requireSuperadminUserId,
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
    async POST(request: Request, context: { params: Promise<{ handoffId: string }> }): Promise<Response> {
      const diagnostics: string[] = ["OPERATOR_REVIEW_CREATE_REQUEST_RECEIVED"];
      try {
        const reviewerRef = sanitizeToken(await resolvedDeps.requireSuperadminUserId());
        const { handoffId } = await context.params;
        const normalizedHandoffId = sanitizeToken(handoffId);
        if (!normalizedHandoffId) {
          return Response.json(
            { ok: false, executionBlocked: true, intentOnly: true, diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED:MISSING_HANDOFF_ID"]) },
            { status: 400 },
          );
        }

        const handoff = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!handoff) {
          return Response.json(
            { ok: false, executionBlocked: true, intentOnly: true, diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED:HANDOFF_NOT_FOUND"]) },
            { status: 404 },
          );
        }

        const payload = ((await request.json()) ?? {}) as ReviewCreateRequest;
        const reviewStatus = sanitizeToken(payload.reviewStatus);
        if (!isAllowedReviewStatus(reviewStatus)) {
          return Response.json(
            {
              ok: false,
              executionBlocked: true,
              intentOnly: true,
              diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED:INVALID_REVIEW_STATUS"]),
            },
            { status: 400 },
          );
        }

        const reviewResult = createRuntimeProviderOperatorReview({
          handoffRef: {
            handoffId: normalizedHandoffId,
            correlationKey: sanitizeToken(handoff.correlationKey),
          },
          reviewerRef,
          reviewStatus,
          reviewReason: sanitizeReviewReason(payload.reviewReason) || "operator_review_recorded",
          createdAt: new Date().toISOString(),
        });

        if (!reviewResult.reviewArtifact) {
          return Response.json(
            {
              ok: false,
              executionBlocked: true,
              intentOnly: true,
              diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED"]),
            },
            { status: 400 },
          );
        }

        const persisted = await resolvedDeps.createProviderOperatorReviewArtifacts([reviewResult.reviewArtifact]);
        const persistedReview = persisted[0];
        if (!persistedReview) {
          return Response.json(
            {
              ok: false,
              executionBlocked: true,
              intentOnly: true,
              diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED:PERSISTENCE_EMPTY"]),
            },
            { status: 500 },
          );
        }

        diagnostics.push("OPERATOR_REVIEW_PERSISTED", "OPERATOR_REVIEW_INTENT_ONLY_CONFIRMED");
        return Response.json(
          {
            ok: true,
            review: sanitizeReview(persistedReview),
            executionBlocked: true,
            intentOnly: true,
            diagnostics: uniqueSorted(diagnostics),
          },
          { status: 200 },
        );
      } catch (error) {
        const authError = parseSuperadminAuthError(error);
        if (authError) {
          return Response.json(
            {
              error: authError.message,
              executionBlocked: true,
              intentOnly: true,
              diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED"]),
            },
            { status: authError.status },
          );
        }
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message, executionBlocked: true, intentOnly: true, diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED"]) }, { status: mapped.status });
        }
        return Response.json(
          { ok: false, executionBlocked: true, intentOnly: true, diagnostics: uniqueSorted([...diagnostics, "OPERATOR_REVIEW_CREATE_FAILED_CLOSED"]) },
          { status: 500 },
        );
      }
    },
  };
}
