export const RENDERED_CAPTURE_FOUNDATION_VERSION = "1.0.0" as const;

export type CaptureSourceMode = "raw_html" | "rendered_dom";

export type RenderedCaptureStatus = "available" | "partial" | "unavailable" | "failed";

export type RenderedCaptureDiagnosticCode =
  | "CAPTURE_JOB_QUEUED"
  | "CAPTURE_JOB_STARTED"
  | "CAPTURE_JOB_RETRIED"
  | "CAPTURE_JOB_TIMED_OUT"
  | "CAPTURE_JOB_FAILED_TRANSIENT"
  | "CAPTURE_JOB_FAILED_TERMINAL"
  | "CAPTURE_JOB_COMPLETED_PARTIAL"
  | "CAPTURE_JOB_COMPLETED"
  | "CAPTURE_WORKER_HEALTH_UNAVAILABLE"
  | "CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED"
  | "CAPTURE_WORKER_URL_RESOLVED"
  | "CAPTURE_WORKER_REQUEST_BUILT"
  | "CAPTURE_WORKER_HTTP_REQUEST_SENT"
  | "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED"
  | "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED"
  | "CAPTURE_WORKER_RESPONSE_PARSED"
  | "CAPTURE_WORKER_RESPONSE_SHAPE_INVALID"
  | "CAPTURE_WORKER_REQUEST_STARTED"
  | "CAPTURE_WORKER_REQUEST_FAILED"
  | "CAPTURE_WORKER_DISABLED"
  | "CAPTURE_WORKER_NOT_CONFIGURED"
  | "CAPTURE_WORKER_HTTP_ERROR"
  | "CAPTURE_WORKER_TIMEOUT"
  | "CAPTURE_WORKER_UNAUTHORIZED"
  | "CAPTURE_WORKER_EXECUTION_FAILED"
  | "CAPTURE_WORKER_UNAVAILABLE"
  | "CAPTURE_WORKER_RESPONSE_INVALID"
  | "CAPTURE_WORKER_EMPTY_RENDER_RESULT"
  | "CAPTURE_WORKER_RENDERED_DOM_USED"
  | "CAPTURE_WORKER_FALLBACK_TO_RAW_HTML"
  | "RENDERED_CAPTURE_RUNTIME_ENVIRONMENT"
  | "PLAYWRIGHT_PACKAGE_CHECK"
  | "PLAYWRIGHT_BINARY_CHECK"
  | "PLAYWRIGHT_IMPORT_FAILED"
  | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED"
  | "PLAYWRIGHT_BROWSER_CONTEXT_FAILED"
  | "PLAYWRIGHT_LAUNCH_TIMEOUT"
  | "PLAYWRIGHT_EXECUTABLE_MISSING"
  | "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED"
  | "RENDERED_CAPTURE_SUPPORT_DECISION"
  | "ENVIRONMENT_UNSUPPORTED"
  | "BROWSER_LAUNCH_STARTED"
  | "BROWSER_LAUNCH_SUCCEEDED"
  | "BROWSER_LAUNCH_FAILED"
  | "PAGE_CREATION_STARTED"
  | "PAGE_CREATION_SUCCEEDED"
  | "NAVIGATION_STARTED"
  | "NAVIGATION_SUCCEEDED"
  | "NAVIGATION_FAILED"
  | "READINESS_WAIT_STARTED"
  | "READINESS_WAIT_COMPLETED"
  | "SCREENSHOT_CAPTURE_STARTED"
  | "SCREENSHOT_CAPTURE_SUCCEEDED"
  | "SCREENSHOT_FAILED"
  | "DOM_SERIALIZATION_STARTED"
  | "DOM_SERIALIZATION_SUCCEEDED"
  | "DOM_EMPTY_AFTER_RENDER"
  | "STYLE_SAMPLING_STARTED"
  | "STYLE_SAMPLING_SUCCEEDED"
  | "STYLE_SAMPLING_FAILED"
  | "CLEANUP_STARTED"
  | "CLEANUP_COMPLETED"
  | "RENDERED_CAPTURE_UNAVAILABLE"
  | "RENDERED_CAPTURE_BROWSER_START_FAILED"
  | "BROWSER_NAVIGATION_FAILED"
  | "RENDERED_CAPTURE_TIMEOUT"
  | "RENDERED_CAPTURE_PARTIAL"
  | "RENDERED_CAPTURE_SCREENSHOT_ONLY"
  | "RENDERED_CAPTURE_DOM_SERIALIZATION_FAILED"
  | "RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION"
  | "RENDERED_CAPTURE_STYLE_SAMPLING_FAILED"
  | "RENDERED_CAPTURE_DOM_STILL_SHELL"
  | "RENDERED_CAPTURE_RECOVERED_ON_RETRY"
  | "RENDERED_CAPTURE_FAILED"
  | "SCREENSHOT_CAPTURE_FAILED"
  | "COMPUTED_STYLE_SAMPLE_WEAK"
  | "CAPTURE_PHASE_STABILIZATION_STARTED"
  | "CAPTURE_PHASE_STABILIZATION_COMPLETED"
  | "CAPTURE_PHASE_STABILIZATION_TIMED_OUT"
  | "CAPTURE_PHASE_STABILIZATION_FAILED"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_STARTED"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_COMPLETED"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_TIMED_OUT"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_FAILED"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_STARTED"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_COMPLETED"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_TIMED_OUT"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_FAILED"
  | "CAPTURE_PHASE_STYLE_SAMPLING_STARTED"
  | "CAPTURE_PHASE_STYLE_SAMPLING_COMPLETED"
  | "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT"
  | "CAPTURE_PHASE_STYLE_SAMPLING_FAILED"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_STARTED"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_COMPLETED"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_TIMED_OUT"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_FAILED"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_STARTED"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_COMPLETED"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_TIMED_OUT"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_FAILED"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_STARTED"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_COMPLETED"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_TIMED_OUT"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_FAILED";

export type RenderedCaptureDiagnostic = {
  code: RenderedCaptureDiagnosticCode;
  message: string;
  severity: "info" | "warning" | "error";
  details?: Record<string, unknown>;
};

export type RenderedDocumentSnapshot = {
  kind: "rendered_document_snapshot_v1";
  sourceUrl: string;
  htmlPathAbs: string;
  htmlSha256: string;
  readinessState: "network_quiet" | "dom_stable" | "timeout_partial" | "failed";
};

export type RenderedScreenshotArtifact = {
  kind: "rendered_screenshot_artifact_v1";
  screenshotId: string;
  captureType: "desktop_viewport" | "desktop_fullpage";
  filePathAbs: string;
  width: number;
  height: number;
  fullPage: boolean;
};

export type ComputedStyleSample = {
  kind: "computed_style_sample_v1";
  sampleId: string;
  target: "root" | "header_nav" | "hero" | "h1" | "h2" | "h3" | "body_text" | "primary_cta" | "card" | "footer";
  selector: string;
  tagName: string | null;
  className: string | null;
  styles: {
    fontFamily: string | null;
    fontSize: string | null;
    fontWeight: string | null;
    lineHeight: string | null;
    color: string | null;
    backgroundColor: string | null;
    borderRadius: string | null;
    paddingTop: string | null;
    paddingRight: string | null;
    paddingBottom: string | null;
    paddingLeft: string | null;
  };
};

export type RenderedCaptureResult = {
  kind: "rendered_capture_result_v1";
  version: typeof RENDERED_CAPTURE_FOUNDATION_VERSION;
  status: RenderedCaptureStatus;
  sourceMode: CaptureSourceMode;
  documents: RenderedDocumentSnapshot[];
  screenshots: RenderedScreenshotArtifact[];
  computedStyleSamples: ComputedStyleSample[];
  renderedObservedAssetUrls: string[];
  diagnostics: RenderedCaptureDiagnostic[];
};

export type RenderedCaptureReadinessPolicy = {
  navigationTimeoutMs: number;
  networkQuietTimeoutMs: number;
  domStabilizationWindowMs: number;
  domStabilizationPollMs: number;
  maxTotalCaptureMs: number;
  shellContentMinLength?: number;
  shellDetectionRetryCount?: number;
  shellDetectionRetryDelayMs?: number;
};

export type RenderedCaptureViewport = {
  width: number;
  height: number;
};

export type RenderedCaptureExecutorInput = {
  sourceUrl: string;
  snapshotRootDirAbs: string;
  viewport: RenderedCaptureViewport;
  readiness: RenderedCaptureReadinessPolicy;
};

export type RenderedCaptureExecutorDocument = {
  html: string;
  readinessState: RenderedDocumentSnapshot["readinessState"];
};

export type RenderedCaptureExecutorScreenshot = {
  captureType: RenderedScreenshotArtifact["captureType"];
  bytes: Uint8Array;
  width: number;
  height: number;
  fullPage: boolean;
};

export type RenderedCaptureExecutorResult = {
  status: RenderedCaptureStatus;
  document: RenderedCaptureExecutorDocument | null;
  screenshots: RenderedCaptureExecutorScreenshot[];
  computedStyleSamples: ComputedStyleSample[];
  renderedObservedAssetUrls: string[];
  diagnostics: RenderedCaptureDiagnostic[];
};

export type RenderedCaptureExecutor = (input: RenderedCaptureExecutorInput) => Promise<RenderedCaptureExecutorResult>;
