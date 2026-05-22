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

function normalizeGovernanceSnapshot(value: unknown): ProviderHandoffReadinessDebugModel["governanceSnapshot"] {
  const snapshot = normalizeObject(value);
  const reviewSummary = normalizeObject(snapshot.reviewSummary);
  return {
    snapshotId: normalizeToken(snapshot.snapshotId),
    handoffId: normalizeToken(snapshot.handoffId),
    correlationKey: normalizeToken(snapshot.correlationKey),
    readinessStatus: normalizeToken(snapshot.readinessStatus),
    executionBlocked: Boolean(snapshot.executionBlocked),
    diagnostics: normalizeList(snapshot.diagnostics),
    createdAt: normalizeToken(snapshot.createdAt),
    reviewSummary: {
      reviewSummaryStatus: normalizeToken(reviewSummary.reviewSummaryStatus),
      reviewCount: Number.isFinite(reviewSummary.reviewCount) ? Number(reviewSummary.reviewCount) : 0,
      latestReviewer: normalizeToken(reviewSummary.latestReviewer),
      latestCreatedAt: normalizeToken(reviewSummary.latestCreatedAt),
      latestReason: normalizeToken(reviewSummary.latestReason),
      intentOnly: Boolean(reviewSummary.intentOnly),
      executionBlocked: Boolean(reviewSummary.executionBlocked),
    },
  };
}

type ReadinessPageFetchResult = {
  model: ProviderHandoffReadinessDebugModel;
  fetchError: string | null;
  operatorReviewFetchError: string | null;
};

const DEFAULT_REVIEW_SUMMARY: ProviderHandoffReadinessDebugModel["operatorReviewSummary"] = {
  reviewSummaryStatus: "no_reviews",
  reviewCount: 0,
  latestReviewer: "",
  latestCreatedAt: "",
  latestReason: "",
  intentOnly: true,
  executionBlocked: true,
};

type FetchReadinessModelDeps = {
  fetchImpl?: typeof fetch;
  headersImpl?: typeof headers;
};

async function fetchReadinessModel(
  handoffId: string,
  deps: FetchReadinessModelDeps = {},
): Promise<ReadinessPageFetchResult> {
  const incomingHeaders = await (deps.headersImpl ?? headers)();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const proto = normalizeToken(incomingHeaders.get("x-forwarded-proto")) || "http";
  const host = normalizeToken(incomingHeaders.get("x-forwarded-host")) || normalizeToken(incomingHeaders.get("host")) || "localhost:3000";
  const endpoint = `${proto}://${host}/api/gnr8/runtime/provider-handoffs/${encodeURIComponent(handoffId)}/readiness`;
  const reviewsEndpoint = `${proto}://${host}/api/gnr8/admin/provider-handoffs/${encodeURIComponent(handoffId)}/reviews`;
  const cookie = normalizeToken(incomingHeaders.get("cookie"));
  const requestHeaders = cookie ? { cookie } : undefined;

  try {
    const response = await fetchImpl(endpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

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
      governanceSnapshot: normalizeGovernanceSnapshot(payload.governanceSnapshot),
      operatorReviews: [],
      operatorReviewSummary: DEFAULT_REVIEW_SUMMARY,
      operatorReviewIntentOnly: true,
    };

    if (!response.ok) {
      return {
        model,
        fetchError: normalizeToken(payload.error) || `HTTP_${response.status}`,
        operatorReviewFetchError: null,
      };
    }

    let operatorReviewFetchError: string | null = null;
    try {
      const reviewsResponse = await fetchImpl(reviewsEndpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
      const reviewsPayload = (await reviewsResponse.json().catch(() => ({}))) as Record<string, unknown>;
      model.operatorReviews = normalizeReviewList(reviewsPayload.reviews);
      model.operatorReviewSummary = normalizeReviewSummary(reviewsPayload.reviewSummary);
      model.operatorReviewIntentOnly = Boolean(reviewsPayload.intentOnly);
      if (!reviewsResponse.ok) {
        operatorReviewFetchError = normalizeToken(reviewsPayload.error) || `HTTP_${reviewsResponse.status}`;
      }
    } catch (error) {
      operatorReviewFetchError = error instanceof Error ? error.message : "Unknown fetch error";
    }

    return {
      model,
      fetchError: null,
      operatorReviewFetchError,
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
        governanceSnapshot: undefined,
        operatorReviews: [],
        operatorReviewSummary: DEFAULT_REVIEW_SUMMARY,
        operatorReviewIntentOnly: true,
      },
      fetchError: error instanceof Error ? error.message : "Unknown fetch error",
      operatorReviewFetchError: null,
    };
  }
}

export default async function ProviderHandoffReadinessDebugPage(props: PageProps) {
  const { handoffId } = await props.params;
  const normalizedHandoffId = normalizeToken(handoffId);
  const { model, fetchError, operatorReviewFetchError } = await fetchReadinessModel(normalizedHandoffId);

  return <ProviderHandoffReadinessDebugView model={model} fetchError={fetchError} operatorReviewFetchError={operatorReviewFetchError} />;
}
