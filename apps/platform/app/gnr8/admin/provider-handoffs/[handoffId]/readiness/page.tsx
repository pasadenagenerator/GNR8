import { headers } from "next/headers";

import { ProviderHandoffReadinessDebugView, type ProviderHandoffReadinessDebugModel } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ handoffId: string }>;
};

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeReviewList(values: unknown): ProviderHandoffReadinessDebugModel["operatorReviews"] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeObject(value))
    .map((review) => ({
      reviewId: normalizeToken(review.reviewId),
      reviewerRef: normalizeToken(review.reviewerRef),
      reviewStatus: normalizeToken(review.reviewStatus),
      reviewReason: normalizeToken(review.reviewReason),
      createdAt: normalizeToken(review.createdAt),
    }))
    .filter((review) => review.reviewId && review.reviewerRef && review.reviewStatus && review.createdAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.reviewId.localeCompare(b.reviewId));
}

function normalizeReviewSummary(value: unknown): ProviderHandoffReadinessDebugModel["operatorReviewSummary"] {
  const summary = normalizeObject(value);
  return {
    reviewSummaryStatus: normalizeToken(summary.reviewSummaryStatus),
    reviewCount: Number.isFinite(summary.reviewCount) ? Number(summary.reviewCount) : 0,
    latestReviewer: normalizeToken(summary.latestReviewer),
    latestCreatedAt: normalizeToken(summary.latestCreatedAt),
    latestReason: normalizeToken(summary.latestReason),
    intentOnly: Boolean(summary.intentOnly),
    executionBlocked: Boolean(summary.executionBlocked),
  };
}

async function fetchReadinessModel(handoffId: string): Promise<{ model: ProviderHandoffReadinessDebugModel; fetchError: string | null }> {
  const incomingHeaders = await headers();
  const proto = normalizeToken(incomingHeaders.get("x-forwarded-proto")) || "http";
  const host = normalizeToken(incomingHeaders.get("x-forwarded-host")) || normalizeToken(incomingHeaders.get("host")) || "localhost:3000";
  const endpoint = `${proto}://${host}/api/gnr8/runtime/provider-handoffs/${encodeURIComponent(handoffId)}/readiness`;

  try {
    const reviewsEndpoint = `${proto}://${host}/api/gnr8/admin/provider-handoffs/${encodeURIComponent(handoffId)}/reviews`;
    const [response, reviewsResponse] = await Promise.all([
      fetch(endpoint, { method: "GET", cache: "no-store" }),
      fetch(reviewsEndpoint, { method: "GET", cache: "no-store" }),
    ]);
    const payload = (await response.json()) as Record<string, unknown>;
    const reviewsPayload = (await reviewsResponse.json()) as Record<string, unknown>;

    const model: ProviderHandoffReadinessDebugModel = {
      handoffId,
      readinessStatus: normalizeToken(payload.readinessStatus),
      executionBlocked: Boolean(payload.executionBlocked),
      blockedReasons: normalizeList(payload.blockedReasons),
      nextAllowedAction: normalizeToken(payload.nextAllowedAction),
      correlationKey: normalizeToken(payload.correlationKey),
      diagnostics: normalizeList(payload.diagnostics),
      handoffArtifact: (payload.handoffArtifact as ProviderHandoffReadinessDebugModel["handoffArtifact"]) ?? null,
      workerPickupEvidence: (payload.workerPickupEvidence as ProviderHandoffReadinessDebugModel["workerPickupEvidence"]) ?? {},
      operatorReviews: normalizeReviewList(reviewsPayload.reviews),
      operatorReviewSummary: normalizeReviewSummary(reviewsPayload.reviewSummary),
      operatorReviewIntentOnly: Boolean(reviewsPayload.intentOnly),
    };

    return {
      model,
      fetchError:
        response.ok && reviewsResponse.ok
          ? null
          : normalizeToken(payload.error) || normalizeToken(reviewsPayload.error) || `HTTP_${response.status}`,
    };
  } catch (error) {
    return {
      model: {
        handoffId,
        readinessStatus: "failed_closed",
        executionBlocked: true,
        blockedReasons: ["readiness_fetch_failed_closed"],
        nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
        correlationKey: "",
        diagnostics: ["PROVIDER_HANDOFF_DEBUG_FETCH_FAILED"],
        handoffArtifact: null,
        workerPickupEvidence: {},
        operatorReviews: [],
        operatorReviewSummary: {
          reviewSummaryStatus: "no_reviews",
          reviewCount: 0,
          latestReviewer: "",
          latestCreatedAt: "",
          latestReason: "",
          intentOnly: true,
          executionBlocked: true,
        },
        operatorReviewIntentOnly: true,
      },
      fetchError: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

export default async function ProviderHandoffReadinessDebugPage(props: PageProps) {
  const { handoffId } = await props.params;
  const normalizedHandoffId = normalizeToken(handoffId);
  const { model, fetchError } = await fetchReadinessModel(normalizedHandoffId);

  return <ProviderHandoffReadinessDebugView model={model} fetchError={fetchError} />;
}
