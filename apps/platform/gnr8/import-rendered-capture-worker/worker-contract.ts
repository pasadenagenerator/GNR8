import type {
  ComputedStyleSample,
  RenderedCaptureDiagnostic,
  RenderedCaptureReadinessPolicy,
  RenderedCaptureViewport,
} from "../import-rendered-capture/rendered-capture-contract";
import type { LayoutGeometryEvidence } from "../architecture/evidence-capture-layout-contract";

export const RENDERED_CAPTURE_WORKER_CONTRACT_VERSION = "1.0.0" as const;

export type RenderedCaptureWorkerRuntimeKind = "nodejs" | "edge" | "unknown";

export type RenderedCaptureWorkerFailureClass =
  | "environment_unsupported"
  | "browser_launch_failed"
  | "navigation_failed"
  | "dom_empty_after_render"
  | "style_sampling_failed"
  | "screenshot_failed"
  | "timed_out"
  | "internal_error";

export type RenderedCaptureArtifactStorage =
  | "object_storage"
  | "shared_storage"
  | "inline"
  | "none";

export type RenderedCaptureWorkerArtifactRef = {
  artifactType: "rendered_dom_html" | "computed_style_samples_json" | "screenshot_png";
  captureType: "desktop_viewport" | "desktop_fullpage" | null;
  storage: RenderedCaptureArtifactStorage;
  uri: string | null;
  mediaType: string | null;
  sha256: string | null;
  byteLength: number | null;
};

export type RenderedCaptureWorkerRequest = {
  kind: "rendered_capture_worker_request_v1";
  contractVersion: typeof RENDERED_CAPTURE_WORKER_CONTRACT_VERSION;
  requestId: string;
  importId: string;
  sourceUrl: string;
  trace: {
    agencyId: string | null;
    clientId: string | null;
    siteId: string | null;
  };
  capture: {
    viewport: RenderedCaptureViewport;
    readinessPolicy: RenderedCaptureReadinessPolicy;
    captureScreenshots: boolean;
    captureComputedStyles: boolean;
    captureRenderedDom: boolean;
    timeoutBudgetMs: number;
  };
};

export type RenderedCaptureWorkerRequestLike = {
  requestId: string;
  importId: string;
  sourceUrl: string;
  trace?: {
    agencyId?: string | null;
    clientId?: string | null;
    siteId?: string | null;
  } | null;
  capture: {
    viewport: RenderedCaptureViewport;
    readinessPolicy: RenderedCaptureReadinessPolicy;
    captureScreenshots?: boolean;
    captureComputedStyles?: boolean;
    captureRenderedDom?: boolean;
    timeoutBudgetMs: number;
  };
};

export type RenderedCaptureWorkerEnvironmentTruth = {
  runtimeKind: RenderedCaptureWorkerRuntimeKind;
  environmentSupported: boolean;
  browserPackageAvailable: boolean;
  browserBinaryAvailable: boolean;
  supportDecision:
    | "supported"
    | "runtime_incompatible"
    | "package_missing"
    | "binary_missing"
    | "launch_incompatible"
    | "unknown";
};

export type RenderedCaptureWorkerQualitySummary = {
  renderedDomQuality: "strong" | "weak" | "unusable";
  domLength: number;
  meaningfulNodeCount: number;
  screenshotCount: number;
  computedStyleSampleCount: number;
};

export type RenderedCaptureWorkerResponse = {
  kind: "rendered_capture_worker_response_v1";
  contractVersion: typeof RENDERED_CAPTURE_WORKER_CONTRACT_VERSION;
  requestId: string;
  status: "available" | "partial" | "failed" | "unsupported";
  environment: RenderedCaptureWorkerEnvironmentTruth;
  artifacts: RenderedCaptureWorkerArtifactRef[];
  computedStyleSamples: ComputedStyleSample[];
  layoutGeometryEvidence?: LayoutGeometryEvidence[];
  diagnostics: RenderedCaptureDiagnostic[];
  qualitySummary: RenderedCaptureWorkerQualitySummary;
  failure: {
    failureClass: RenderedCaptureWorkerFailureClass;
    failureCode: string | null;
    retryable: boolean;
    message: string | null;
  } | null;
  timings: {
    queueLatencyMs: number | null;
    executionMs: number | null;
    totalMs: number | null;
  };
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const floored = Math.floor(value);
  if (floored < min) return min;
  if (floored > max) return max;
  return floored;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function createRenderedCaptureWorkerRequest(input: {
  requestId: string;
  importId: string;
  sourceUrl: string;
  viewport: RenderedCaptureViewport;
  readinessPolicy: RenderedCaptureReadinessPolicy;
  timeoutBudgetMs: number;
  trace?: {
    agencyId?: string | null;
    clientId?: string | null;
    siteId?: string | null;
  };
  captureScreenshots?: boolean;
  captureComputedStyles?: boolean;
  captureRenderedDom?: boolean;
}): RenderedCaptureWorkerRequest {
  return {
    kind: "rendered_capture_worker_request_v1",
    contractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
    requestId: normalizeText(input.requestId),
    importId: normalizeText(input.importId),
    sourceUrl: normalizeText(input.sourceUrl),
    trace: {
      agencyId: normalizeText(input.trace?.agencyId) || null,
      clientId: normalizeText(input.trace?.clientId) || null,
      siteId: normalizeText(input.trace?.siteId) || null,
    },
    capture: {
      viewport: {
        width: clampInt(input.viewport.width, 320, 3840),
        height: clampInt(input.viewport.height, 320, 3840),
      },
      readinessPolicy: {
        navigationTimeoutMs: clampInt(input.readinessPolicy.navigationTimeoutMs, 1_000, 120_000),
        networkQuietTimeoutMs: clampInt(input.readinessPolicy.networkQuietTimeoutMs, 250, 30_000),
        domStabilizationWindowMs: clampInt(input.readinessPolicy.domStabilizationWindowMs, 250, 30_000),
        domStabilizationPollMs: clampInt(input.readinessPolicy.domStabilizationPollMs, 50, 5_000),
        maxTotalCaptureMs: clampInt(input.readinessPolicy.maxTotalCaptureMs, 1_000, 180_000),
        shellContentMinLength:
          typeof input.readinessPolicy.shellContentMinLength === "number"
            ? clampInt(input.readinessPolicy.shellContentMinLength, 0, 50_000)
            : undefined,
        shellDetectionRetryCount:
          typeof input.readinessPolicy.shellDetectionRetryCount === "number"
            ? clampInt(input.readinessPolicy.shellDetectionRetryCount, 0, 5)
            : undefined,
        shellDetectionRetryDelayMs:
          typeof input.readinessPolicy.shellDetectionRetryDelayMs === "number"
            ? clampInt(input.readinessPolicy.shellDetectionRetryDelayMs, 0, 15_000)
            : undefined,
      },
      captureScreenshots: input.captureScreenshots ?? true,
      captureComputedStyles: input.captureComputedStyles ?? true,
      captureRenderedDom: input.captureRenderedDom ?? true,
      timeoutBudgetMs: clampInt(input.timeoutBudgetMs, 1_000, 180_000),
    },
  };
}

export function canonicalizeRenderedCaptureWorkerRequest(
  request: RenderedCaptureWorkerRequestLike,
): RenderedCaptureWorkerRequest {
  return createRenderedCaptureWorkerRequest({
    requestId: request.requestId,
    importId: request.importId,
    sourceUrl: request.sourceUrl,
    viewport: request.capture.viewport,
    readinessPolicy: request.capture.readinessPolicy,
    timeoutBudgetMs: request.capture.timeoutBudgetMs,
    trace: request.trace ?? undefined,
    captureScreenshots: request.capture.captureScreenshots,
    captureComputedStyles: request.capture.captureComputedStyles,
    captureRenderedDom: request.capture.captureRenderedDom,
  });
}
