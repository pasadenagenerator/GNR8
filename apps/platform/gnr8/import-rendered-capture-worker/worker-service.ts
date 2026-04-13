import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_RENDERED_CAPTURE_READINESS_POLICY,
  DEFAULT_RENDERED_CAPTURE_VIEWPORT,
  runRenderedCapture,
} from "../import-rendered-capture";
import type {
  RenderedCaptureDiagnostic,
  RenderedCaptureReadinessPolicy,
  RenderedCaptureResult,
} from "../import-rendered-capture/rendered-capture-contract";
import {
  RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
  type RenderedCaptureWorkerArtifactRef,
  type RenderedCaptureWorkerFailureClass,
  type RenderedCaptureWorkerRequest,
  type RenderedCaptureWorkerResponse,
} from "./worker-contract";

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

function nowMs(): number {
  return Date.now();
}

function pushDiagnostic(
  diagnostics: RenderedCaptureDiagnostic[],
  input: {
    code: RenderedCaptureDiagnostic["code"];
    message: string;
    severity?: RenderedCaptureDiagnostic["severity"];
    details?: Record<string, unknown>;
  },
): void {
  diagnostics.push({
    code: input.code,
    message: input.message,
    severity: input.severity ?? "info",
    details: input.details,
  });
}

function toDataUri(mediaType: string, bytes: Buffer): string {
  return `data:${mediaType};base64,${bytes.toString("base64")}`;
}

function pickFailure(diagnostics: RenderedCaptureDiagnostic[]): {
  failureClass: RenderedCaptureWorkerFailureClass;
  failureCode: string | null;
  retryable: boolean;
  message: string | null;
} | null {
  const firstCode = (codes: string[]): string | null => {
    for (const diagnostic of diagnostics) {
      const code = normalizeText(diagnostic.code);
      if (codes.includes(code)) return code;
    }
    return null;
  };

  const probeFailureCode = firstCode([
    "PLAYWRIGHT_IMPORT_FAILED",
    "PLAYWRIGHT_BROWSER_LAUNCH_FAILED",
    "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
    "PLAYWRIGHT_LAUNCH_TIMEOUT",
    "PLAYWRIGHT_EXECUTABLE_MISSING",
    "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED",
  ]);
  if (probeFailureCode) {
    return {
      failureClass: "browser_launch_failed",
      failureCode: probeFailureCode,
      retryable: probeFailureCode === "PLAYWRIGHT_LAUNCH_TIMEOUT",
      message: "Playwright launch probe failed",
    };
  }

  const environmentCode = firstCode(["ENVIRONMENT_UNSUPPORTED", "RENDERED_CAPTURE_UNAVAILABLE"]);
  if (environmentCode) {
    return {
      failureClass: "environment_unsupported",
      failureCode: environmentCode,
      retryable: false,
      message: "Rendered capture environment unsupported",
    };
  }

  const browserCode = firstCode(["BROWSER_LAUNCH_FAILED", "RENDERED_CAPTURE_BROWSER_START_FAILED"]);
  if (browserCode) {
    return {
      failureClass: "browser_launch_failed",
      failureCode: browserCode,
      retryable: false,
      message: "Browser launch failed",
    };
  }

  const navigationCode = firstCode(["NAVIGATION_FAILED", "BROWSER_NAVIGATION_FAILED"]);
  if (navigationCode) {
    return {
      failureClass: "navigation_failed",
      failureCode: navigationCode,
      retryable: true,
      message: "Navigation failed",
    };
  }

  const domCode = firstCode(["DOM_EMPTY_AFTER_RENDER", "RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION"]);
  if (domCode) {
    return {
      failureClass: "dom_empty_after_render",
      failureCode: domCode,
      retryable: true,
      message: "Rendered DOM empty after navigation",
    };
  }

  const styleCode = firstCode(["STYLE_SAMPLING_FAILED", "RENDERED_CAPTURE_STYLE_SAMPLING_FAILED"]);
  if (styleCode) {
    return {
      failureClass: "style_sampling_failed",
      failureCode: styleCode,
      retryable: true,
      message: "Computed style sampling failed",
    };
  }

  const screenshotCode = firstCode(["SCREENSHOT_FAILED", "SCREENSHOT_CAPTURE_FAILED"]);
  if (screenshotCode) {
    return {
      failureClass: "screenshot_failed",
      failureCode: screenshotCode,
      retryable: true,
      message: "Screenshot capture failed",
    };
  }

  const timeoutCode = firstCode(["RENDERED_CAPTURE_TIMEOUT"]);
  if (timeoutCode) {
    return {
      failureClass: "timed_out",
      failureCode: timeoutCode,
      retryable: true,
      message: "Capture timed out",
    };
  }

  const genericFailure = firstCode(["RENDERED_CAPTURE_FAILED"]);
  if (genericFailure) {
    return {
      failureClass: "internal_error",
      failureCode: genericFailure,
      retryable: false,
      message: "Rendered capture failed",
    };
  }

  return null;
}

function resolveEnvironmentTruth(result: RenderedCaptureResult): RenderedCaptureWorkerResponse["environment"] {
  const diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics : [];
  const byCode = (code: string): RenderedCaptureDiagnostic | null => {
    for (const entry of diagnostics) {
      if (normalizeText(entry.code) === code) return entry;
    }
    return null;
  };

  const supportDecision = byCode("RENDERED_CAPTURE_SUPPORT_DECISION");
  const runtimeProbe = byCode("RENDERED_CAPTURE_RUNTIME_ENVIRONMENT");
  const packageCheck = byCode("PLAYWRIGHT_PACKAGE_CHECK");
  const binaryCheck = byCode("PLAYWRIGHT_BINARY_CHECK");

  const runtimeKindRaw =
    normalizeText(supportDecision?.details?.runtimeKind) ||
    normalizeText(runtimeProbe?.details?.runtimeKind) ||
    normalizeText(runtimeProbe?.details?.runtime);

  const runtimeKind = runtimeKindRaw === "nodejs" || runtimeKindRaw === "edge" ? runtimeKindRaw : "unknown";

  const environmentSupported =
    typeof supportDecision?.details?.supported === "boolean"
      ? supportDecision.details.supported
      : result.status !== "unavailable";

  const browserPackageAvailable =
    typeof packageCheck?.details?.available === "boolean"
      ? packageCheck.details.available
      : typeof supportDecision?.details?.browserPackageAvailable === "boolean"
        ? supportDecision.details.browserPackageAvailable
        : false;

  const browserBinaryAvailable =
    typeof binaryCheck?.details?.available === "boolean"
      ? binaryCheck.details.available
      : typeof supportDecision?.details?.browserBinaryAvailable === "boolean"
        ? supportDecision.details.browserBinaryAvailable
        : false;

  const rawReason = normalizeText(supportDecision?.details?.reason).toLowerCase();
  const mappedSupportDecision: RenderedCaptureWorkerResponse["environment"]["supportDecision"] =
    rawReason.includes("runtime")
      ? "runtime_incompatible"
      : rawReason.includes("package")
        ? "package_missing"
        : rawReason.includes("binary")
          ? "binary_missing"
          : rawReason.includes("launch") || rawReason.includes("context")
            ? "launch_incompatible"
            : environmentSupported
              ? "supported"
              : "unknown";

  return {
    runtimeKind,
    environmentSupported,
    browserPackageAvailable,
    browserBinaryAvailable,
    supportDecision: mappedSupportDecision,
  };
}

function clampReadiness(input: {
  policy: RenderedCaptureReadinessPolicy;
  timeoutBudgetMs: number;
}): RenderedCaptureReadinessPolicy {
  const budget = Math.max(1_000, Math.min(180_000, Math.floor(input.timeoutBudgetMs)));
  return {
    ...input.policy,
    navigationTimeoutMs: Math.min(input.policy.navigationTimeoutMs, budget),
    networkQuietTimeoutMs: Math.min(input.policy.networkQuietTimeoutMs, budget),
    domStabilizationWindowMs: Math.min(input.policy.domStabilizationWindowMs, budget),
    maxTotalCaptureMs: Math.min(input.policy.maxTotalCaptureMs, budget),
  };
}

function meaningfulNodeCountFromHtml(html: string): number {
  return (html.match(/<(main|section|article|nav|aside|h1|h2|h3|p|li|a)\b/gi) ?? []).length;
}

function collectArtifacts(input: {
  result: RenderedCaptureResult;
}): RenderedCaptureWorkerArtifactRef[] {
  const artifacts: RenderedCaptureWorkerArtifactRef[] = [];
  const renderedHtmlPath = input.result.documents[0]?.htmlPathAbs;

  if (renderedHtmlPath && fs.existsSync(renderedHtmlPath)) {
    const htmlBytes = fs.readFileSync(renderedHtmlPath);
    artifacts.push({
      artifactType: "rendered_dom_html",
      captureType: null,
      storage: "inline",
      uri: toDataUri("text/html", htmlBytes),
      mediaType: "text/html",
      sha256: sha256Hex(htmlBytes),
      byteLength: htmlBytes.byteLength,
    });
  }

  const computedStyleBytes = Buffer.from(JSON.stringify(input.result.computedStyleSamples), "utf8");
  artifacts.push({
    artifactType: "computed_style_samples_json",
    captureType: null,
    storage: "inline",
    uri: toDataUri("application/json", computedStyleBytes),
    mediaType: "application/json",
    sha256: sha256Hex(computedStyleBytes),
    byteLength: computedStyleBytes.byteLength,
  });

  for (const screenshot of input.result.screenshots) {
    if (!fs.existsSync(screenshot.filePathAbs)) continue;
    const bytes = fs.readFileSync(screenshot.filePathAbs);
    artifacts.push({
      artifactType: "screenshot_png",
      captureType: screenshot.captureType,
      storage: "inline",
      uri: toDataUri("image/png", bytes),
      mediaType: "image/png",
      sha256: sha256Hex(bytes),
      byteLength: bytes.byteLength,
    });
  }

  return artifacts;
}

function responseStatusFromCapture(result: RenderedCaptureResult): RenderedCaptureWorkerResponse["status"] {
  if (result.status === "unavailable") return "unsupported";
  if (result.status === "failed") return "failed";
  if (result.status === "partial") return "partial";
  return "available";
}

export async function executeRenderedCaptureWorkerRequest(input: {
  request: RenderedCaptureWorkerRequest;
}): Promise<RenderedCaptureWorkerResponse> {
  const startedAt = nowMs();
  const request = input.request;
  const diagnostics: RenderedCaptureDiagnostic[] = [
    {
      code: "CAPTURE_WORKER_REQUEST_STARTED",
      severity: "info",
      message: "Capture worker received request",
      details: {
        requestId: request.requestId,
        importId: request.importId,
        sourceUrl: request.sourceUrl,
      },
    },
  ];

  const workerRootAbs = path.resolve(os.tmpdir(), "gnr8-rendered-capture-worker", request.requestId || `req-${Date.now()}`);
  fs.mkdirSync(workerRootAbs, { recursive: true });

  try {
    const readiness = clampReadiness({
      policy: {
        ...DEFAULT_RENDERED_CAPTURE_READINESS_POLICY,
        ...request.capture.readinessPolicy,
      },
      timeoutBudgetMs: request.capture.timeoutBudgetMs,
    });

    const result = await runRenderedCapture({
      sourceUrl: request.sourceUrl,
      snapshotRootDirAbs: workerRootAbs,
      viewport: {
        ...DEFAULT_RENDERED_CAPTURE_VIEWPORT,
        ...request.capture.viewport,
      },
      readinessPolicy: readiness,
    });

    const status = responseStatusFromCapture(result);
    const mergedDiagnostics = [...diagnostics, ...result.diagnostics];
    const failure = pickFailure(mergedDiagnostics);
    const artifacts = collectArtifacts({ result });
    const domArtifact = artifacts.find((artifact) => artifact.artifactType === "rendered_dom_html");
    const domLength = domArtifact?.byteLength ?? 0;
    const domHtml = domArtifact?.uri ? Buffer.from(domArtifact.uri.split(",")[1] ?? "", "base64").toString("utf8") : "";

    if (result.sourceMode === "rendered_dom") {
      pushDiagnostic(mergedDiagnostics, {
        code: "CAPTURE_WORKER_RENDERED_DOM_USED",
        message: "Capture worker produced usable rendered DOM",
        details: {
          requestId: request.requestId,
          domLength,
        },
      });
    }

    return {
      kind: "rendered_capture_worker_response_v1",
      contractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
      requestId: request.requestId,
      status,
      environment: resolveEnvironmentTruth(result),
      artifacts,
      computedStyleSamples: result.computedStyleSamples,
      diagnostics: mergedDiagnostics,
      qualitySummary: {
        renderedDomQuality: result.sourceMode === "rendered_dom" ? (status === "available" ? "strong" : "weak") : "unusable",
        domLength,
        meaningfulNodeCount: domHtml ? meaningfulNodeCountFromHtml(domHtml) : 0,
        screenshotCount: result.screenshots.length,
        computedStyleSampleCount: result.computedStyleSamples.length,
      },
      failure,
      timings: {
        queueLatencyMs: null,
        executionMs: nowMs() - startedAt,
        totalMs: nowMs() - startedAt,
      },
    };
  } catch (error) {
    const failedDiagnostics = [...diagnostics];
    pushDiagnostic(failedDiagnostics, {
      code: "CAPTURE_WORKER_REQUEST_FAILED",
      severity: "error",
      message: "Capture worker failed to execute request",
      details: {
        requestId: request.requestId,
        error: toErrorString(error),
      },
    });
    pushDiagnostic(failedDiagnostics, {
      code: "RENDERED_CAPTURE_FAILED",
      severity: "error",
      message: "Rendered capture worker execution failed",
      details: { error: toErrorString(error) },
    });
    pushDiagnostic(failedDiagnostics, {
      code: "RENDERED_CAPTURE_UNAVAILABLE",
      severity: "warning",
      message: "Rendered capture worker execution failed; importer should use fallback",
      details: { error: toErrorString(error) },
    });

    return {
      kind: "rendered_capture_worker_response_v1",
      contractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
      requestId: request.requestId,
      status: "failed",
      environment: {
        runtimeKind: "nodejs",
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        supportDecision: "unknown",
      },
      artifacts: [],
      computedStyleSamples: [],
      diagnostics: failedDiagnostics,
      qualitySummary: {
        renderedDomQuality: "unusable",
        domLength: 0,
        meaningfulNodeCount: 0,
        screenshotCount: 0,
        computedStyleSampleCount: 0,
      },
      failure: {
        failureClass: "internal_error",
        failureCode: "CAPTURE_WORKER_REQUEST_FAILED",
        retryable: true,
        message: toErrorString(error),
      },
      timings: {
        queueLatencyMs: null,
        executionMs: nowMs() - startedAt,
        totalMs: nowMs() - startedAt,
      },
    };
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseRenderedCaptureWorkerRequest(payload: unknown): RenderedCaptureWorkerRequest | null {
  if (!isObjectRecord(payload)) return null;
  if (payload.kind !== "rendered_capture_worker_request_v1") return null;
  if (payload.contractVersion !== RENDERED_CAPTURE_WORKER_CONTRACT_VERSION) return null;
  if (!isObjectRecord(payload.capture)) return null;
  if (!isObjectRecord(payload.capture.viewport)) return null;
  if (!isObjectRecord(payload.capture.readinessPolicy)) return null;
  if (typeof payload.requestId !== "string" || typeof payload.importId !== "string" || typeof payload.sourceUrl !== "string") return null;
  return payload as RenderedCaptureWorkerRequest;
}
