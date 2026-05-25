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
function normalizeGovernanceTimeline(value: unknown): NonNullable<ProviderHandoffReadinessDebugModel["governanceTimeline"]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeObject(entry))
    .map((snapshot) => ({
      snapshotId: normalizeToken(snapshot.snapshotId),
      createdAt: normalizeToken(snapshot.createdAt),
      reviewSummaryStatus: normalizeToken(snapshot.reviewSummaryStatus),
      reviewCount: Number.isFinite(snapshot.reviewCount) ? Number(snapshot.reviewCount) : 0,
      readinessStatus: normalizeToken(snapshot.readinessStatus),
      diagnostics: normalizeList(snapshot.diagnostics),
    }))
    .filter((snapshot) => snapshot.snapshotId && snapshot.createdAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.snapshotId.localeCompare(a.snapshotId));
}
const DEFAULT_GOVERNANCE_AUTHORIZATION: NonNullable<ProviderHandoffReadinessDebugModel["governanceAuthorization"]> = {
  authorizationId: "",
  handoffId: "",
  correlationKey: "",
  authorizationStatus: "not_requested",
  authorizationReason: "",
  intentOnly: true,
  executionBlocked: true,
  createdAt: "",
  diagnostics: ["GOVERNANCE_AUTHORIZATION_INTENT_ONLY"],
};
const DEFAULT_GOVERNANCE_DECISION_PACKAGE: NonNullable<ProviderHandoffReadinessDebugModel["governanceDecisionPackage"]> = {
  packageId: "",
  recommendedAction: "failed_closed",
  executionBlocked: true,
  reviewStatus: "no_reviews",
  authorizationStatus: "not_requested",
  snapshotCount: 0,
  diagnostics: ["GOVERNANCE_DECISION_PACKAGE_FAILED_CLOSED"],
};
const DEFAULT_EXECUTION_READINESS_GATE: NonNullable<ProviderHandoffReadinessDebugModel["executionReadinessGate"]> = {
  gateId: "",
  gateStatus: "execution_disabled",
  executionAllowed: false,
  executionBlocked: true,
  blockingReasons: ["global_execution_boundary_active"],
  requiredConditions: [],
  diagnostics: ["EXECUTION_READINESS_GATE_CREATED"],
};
function normalizeGovernanceDecisionPackage(
  value: unknown,
): NonNullable<ProviderHandoffReadinessDebugModel["governanceDecisionPackage"]> {
  const decisionPackage = normalizeObject(value);
  const signals = normalizeObject(decisionPackage.decisionSignals);
  const timelineSummary = normalizeObject(decisionPackage.timelineSummary);
  return {
    packageId: normalizeToken(decisionPackage.packageId),
    recommendedAction: normalizeToken(signals.recommendedAction) || "failed_closed",
    executionBlocked: Boolean(decisionPackage.executionBlocked),
    reviewStatus: normalizeToken(signals.reviewStatus) || "no_reviews",
    authorizationStatus: normalizeToken(signals.authorizationStatus) || "not_requested",
    snapshotCount: Number.isFinite(timelineSummary.snapshotCount) ? Number(timelineSummary.snapshotCount) : 0,
    diagnostics: normalizeList(decisionPackage.diagnostics),
  };
}
function normalizeExecutionReadinessGate(
  value: unknown,
): NonNullable<ProviderHandoffReadinessDebugModel["executionReadinessGate"]> {
  const gate = normalizeObject(value);
  const requiredConditionsRaw = Array.isArray(gate.requiredConditions) ? gate.requiredConditions : [];
  return {
    gateId: normalizeToken(gate.gateId),
    gateStatus: normalizeToken(gate.gateStatus) || "execution_disabled",
    executionAllowed: false,
    executionBlocked: true,
    blockingReasons: normalizeList(gate.blockingReasons),
    requiredConditions: requiredConditionsRaw
      .map((entry) => normalizeObject(entry))
      .map((entry) => ({
        condition: normalizeToken(entry.condition),
        status: (normalizeToken(entry.status) || "not_applicable") as "passed" | "failed" | "not_applicable",
        reason: normalizeToken(entry.reason),
      }))
      .filter((entry) => entry.condition.length > 0),
    diagnostics: normalizeList(gate.diagnostics),
  };
}

function normalizeGovernanceAuthorization(
  value: unknown,
  summaryValue?: unknown,
): NonNullable<ProviderHandoffReadinessDebugModel["governanceAuthorization"]> {
  const authorization = normalizeObject(value);
  const summary = normalizeObject(summaryValue);
  const status = normalizeToken(authorization.authorizationStatus) || normalizeToken(summary.authorizationStatus) || "not_requested";
  const reason = normalizeToken(authorization.authorizationReason) || normalizeToken(summary.authorizationReason);
  const diagnostics = normalizeList([
    ...(DEFAULT_GOVERNANCE_AUTHORIZATION.diagnostics ?? []),
    ...normalizeList(authorization.diagnostics),
  ]);
  return {
    authorizationId: normalizeToken(authorization.authorizationId) || normalizeToken(summary.latestAuthorizationId),
    handoffId: normalizeToken(authorization.handoffId),
    correlationKey: normalizeToken(authorization.correlationKey),
    authorizationStatus: status,
    authorizationReason: reason,
    intentOnly: true,
    executionBlocked: true,
    createdAt: normalizeToken(authorization.createdAt) || normalizeToken(summary.latestCreatedAt),
    diagnostics,
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
  const governanceTimelineEndpoint = `${proto}://${host}/api/gnr8/admin/provider-handoffs/${encodeURIComponent(handoffId)}/governance-timeline`;
  const governanceAuthorizationEndpoint = `${proto}://${host}/api/gnr8/admin/provider-handoffs/${encodeURIComponent(handoffId)}/authorization`;
  const governanceDecisionPackageEndpoint = `${proto}://${host}/api/gnr8/admin/provider-handoffs/${encodeURIComponent(handoffId)}/decision-package`;
  const executionReadinessGateEndpoint = `${proto}://${host}/api/gnr8/admin/provider-handoffs/${encodeURIComponent(handoffId)}/execution-readiness-gate`;
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
      governanceTimeline: [],
      governanceAuthorization: DEFAULT_GOVERNANCE_AUTHORIZATION,
      governanceDecisionPackage: DEFAULT_GOVERNANCE_DECISION_PACKAGE,
      executionReadinessGate: DEFAULT_EXECUTION_READINESS_GATE,
    };

    if (!response.ok) {
      return {
        model,
        fetchError: normalizeToken(payload.error) || `HTTP_${response.status}`,
        operatorReviewFetchError: null,
      };
    }

    let operatorReviewFetchError: string | null = null;
    let governanceTimelineError: string | null = null;
    let governanceAuthorizationError: string | null = null;
    let governanceDecisionPackageError: string | null = null;
    let executionReadinessGateError: string | null = null;
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
    try {
      const authorizationResponse = await fetchImpl(governanceAuthorizationEndpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
      const authorizationPayload = (await authorizationResponse.json().catch(() => ({}))) as Record<string, unknown>;
      model.governanceAuthorization = normalizeGovernanceAuthorization(
        authorizationPayload.authorization,
        authorizationPayload.authorizationSummary,
      );
      if (!authorizationResponse.ok) {
        governanceAuthorizationError = normalizeToken(authorizationPayload.error) || `HTTP_${authorizationResponse.status}`;
      }
    } catch (error) {
      governanceAuthorizationError = error instanceof Error ? error.message : "Unknown fetch error";
    }
    try {
      const decisionPackageResponse = await fetchImpl(governanceDecisionPackageEndpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
      const decisionPackagePayload = (await decisionPackageResponse.json().catch(() => ({}))) as Record<string, unknown>;
      model.governanceDecisionPackage = normalizeGovernanceDecisionPackage(decisionPackagePayload.decisionPackage);
      if (!decisionPackageResponse.ok) {
        governanceDecisionPackageError = normalizeToken(decisionPackagePayload.error) || `HTTP_${decisionPackageResponse.status}`;
      }
    } catch (error) {
      governanceDecisionPackageError = error instanceof Error ? error.message : "Unknown fetch error";
    }
    try {
      const gateResponse = await fetchImpl(executionReadinessGateEndpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
      const gatePayload = (await gateResponse.json().catch(() => ({}))) as Record<string, unknown>;
      model.executionReadinessGate = normalizeExecutionReadinessGate(gatePayload.executionReadinessGate);
      if (!gateResponse.ok) {
        executionReadinessGateError = normalizeToken(gatePayload.error) || `HTTP_${gateResponse.status}`;
      }
    } catch (error) {
      executionReadinessGateError = error instanceof Error ? error.message : "Unknown fetch error";
    }
    try {
      const timelineResponse = await fetchImpl(governanceTimelineEndpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
      const timelinePayload = (await timelineResponse.json().catch(() => ({}))) as Record<string, unknown>;
      model.governanceTimeline = normalizeGovernanceTimeline(timelinePayload.snapshots);
      if (!timelineResponse.ok) {
        governanceTimelineError = normalizeToken(timelinePayload.error) || `HTTP_${timelineResponse.status}`;
      }
    } catch (error) {
      governanceTimelineError = error instanceof Error ? error.message : "Unknown fetch error";
    }
    if (governanceTimelineError) {
      model.diagnostics = normalizeList([...model.diagnostics, `GOVERNANCE_TIMELINE_FETCH_ERROR:${governanceTimelineError}`]);
    }
    if (governanceAuthorizationError) {
      model.diagnostics = normalizeList([...model.diagnostics, `GOVERNANCE_AUTHORIZATION_FETCH_ERROR:${governanceAuthorizationError}`]);
    }
    if (governanceDecisionPackageError) {
      model.diagnostics = normalizeList([...model.diagnostics, `GOVERNANCE_DECISION_PACKAGE_FETCH_ERROR:${governanceDecisionPackageError}`]);
    }
    if (executionReadinessGateError) {
      model.diagnostics = normalizeList([...model.diagnostics, `EXECUTION_READINESS_GATE_FETCH_ERROR:${executionReadinessGateError}`]);
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
        governanceTimeline: [],
        governanceAuthorization: DEFAULT_GOVERNANCE_AUTHORIZATION,
        governanceDecisionPackage: DEFAULT_GOVERNANCE_DECISION_PACKAGE,
        executionReadinessGate: DEFAULT_EXECUTION_READINESS_GATE,
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
