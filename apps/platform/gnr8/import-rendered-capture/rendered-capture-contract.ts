export const RENDERED_CAPTURE_FOUNDATION_VERSION = "1.0.0" as const;

export type CaptureSourceMode = "raw_html" | "rendered_dom";

export type RenderedCaptureStatus = "available" | "partial" | "unavailable" | "failed";

export type RenderedCaptureDiagnosticCode =
  | "RENDERED_CAPTURE_RUNTIME_ENVIRONMENT"
  | "PLAYWRIGHT_PACKAGE_CHECK"
  | "PLAYWRIGHT_BINARY_CHECK"
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
  | "COMPUTED_STYLE_SAMPLE_WEAK";

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
