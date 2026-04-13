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
  const phaseTimeoutCode = firstCode([
    "CAPTURE_PHASE_STABILIZATION_TIMED_OUT",
    "CAPTURE_PHASE_DOM_SERIALIZATION_TIMED_OUT",
    "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_TIMED_OUT",
    "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT",
    "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_TIMED_OUT",
    "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_TIMED_OUT",
    "CAPTURE_PHASE_RESPONSE_ASSEMBLY_TIMED_OUT",
  ]);
  if (phaseTimeoutCode) {
    return {
      failureClass: "timed_out",
      failureCode: phaseTimeoutCode,
      retryable: true,
      message: "Capture timed out during post-navigation phase",
    };
  }
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

type WorkerRequestInvalidField = {
  path: string;
  expected: string;
  actual: string;
};

export type RenderedCaptureWorkerRequestValidationError = {
  code: "INVALID_WORKER_REQUEST";
  message: string;
  details: {
    expectedKind: RenderedCaptureWorkerRequest["kind"];
    expectedContractVersion: typeof RENDERED_CAPTURE_WORKER_CONTRACT_VERSION;
    missingFields: string[];
    invalidFields: WorkerRequestInvalidField[];
  };
};

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function hasOwnField(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function validateRequestPayloadShape(payload: unknown): {
  request: RenderedCaptureWorkerRequest | null;
  error: RenderedCaptureWorkerRequestValidationError | null;
} {
  const missingFields: string[] = [];
  const invalidFields: WorkerRequestInvalidField[] = [];

  const payloadRecord = isObjectRecord(payload) ? payload : null;
  const wrappedRequest = payloadRecord && isObjectRecord(payloadRecord.request) ? payloadRecord.request : null;
  const root =
    wrappedRequest && payloadRecord !== null && !hasOwnField(payloadRecord, "kind")
      ? wrappedRequest
      : payloadRecord ?? null;
  if (!root) {
    return {
      request: null,
      error: {
        code: "INVALID_WORKER_REQUEST",
        message: "Rendered capture worker request contract is invalid.",
        details: {
          expectedKind: "rendered_capture_worker_request_v1",
          expectedContractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
          missingFields: [],
          invalidFields: [
            {
              path: "$",
              expected: "object",
              actual: describeType(payload),
            },
          ],
        },
      },
    };
  }

  const requireString = (path: string, value: unknown): void => {
    if (typeof value !== "string") {
      invalidFields.push({
        path,
        expected: "string",
        actual: describeType(value),
      });
      return;
    }
    if (!normalizeText(value)) {
      invalidFields.push({
        path,
        expected: "non-empty string",
        actual: "empty_string",
      });
    }
  };

  const requireBoolean = (path: string, value: unknown): void => {
    if (typeof value !== "boolean") {
      invalidFields.push({
        path,
        expected: "boolean",
        actual: describeType(value),
      });
    }
  };

  const requireFiniteNumber = (path: string, value: unknown): void => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      invalidFields.push({
        path,
        expected: "finite number",
        actual: describeType(value),
      });
    }
  };

  const requiredRootFields = ["kind", "contractVersion", "requestId", "importId", "sourceUrl", "trace", "capture"];
  for (const field of requiredRootFields) {
    if (!hasOwnField(root, field)) missingFields.push(field);
  }

  if (hasOwnField(root, "kind") && root.kind !== "rendered_capture_worker_request_v1") {
    invalidFields.push({
      path: "kind",
      expected: "rendered_capture_worker_request_v1",
      actual: typeof root.kind === "string" ? root.kind : describeType(root.kind),
    });
  }
  if (hasOwnField(root, "contractVersion") && root.contractVersion !== RENDERED_CAPTURE_WORKER_CONTRACT_VERSION) {
    invalidFields.push({
      path: "contractVersion",
      expected: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
      actual: typeof root.contractVersion === "string" ? root.contractVersion : describeType(root.contractVersion),
    });
  }

  if (hasOwnField(root, "requestId")) requireString("requestId", root.requestId);
  if (hasOwnField(root, "importId")) requireString("importId", root.importId);
  if (hasOwnField(root, "sourceUrl")) requireString("sourceUrl", root.sourceUrl);

  if (hasOwnField(root, "trace")) {
    if (!isObjectRecord(root.trace)) {
      invalidFields.push({
        path: "trace",
        expected: "object",
        actual: describeType(root.trace),
      });
    } else {
      const traceRequired = ["agencyId", "clientId", "siteId"];
      for (const field of traceRequired) {
        if (!hasOwnField(root.trace, field)) missingFields.push(`trace.${field}`);
      }
      const traceEntries: Array<{ key: keyof typeof root.trace; path: string }> = [
        { key: "agencyId", path: "trace.agencyId" },
        { key: "clientId", path: "trace.clientId" },
        { key: "siteId", path: "trace.siteId" },
      ];
      for (const entry of traceEntries) {
        const value = root.trace[entry.key];
        if (value !== null && typeof value !== "string") {
          invalidFields.push({
            path: entry.path,
            expected: "string|null",
            actual: describeType(value),
          });
        }
      }
    }
  }

  if (hasOwnField(root, "capture")) {
    if (!isObjectRecord(root.capture)) {
      invalidFields.push({
        path: "capture",
        expected: "object",
        actual: describeType(root.capture),
      });
    } else {
      const captureRequired = [
        "viewport",
        "readinessPolicy",
        "captureScreenshots",
        "captureComputedStyles",
        "captureRenderedDom",
        "timeoutBudgetMs",
      ];
      for (const field of captureRequired) {
        if (!hasOwnField(root.capture, field)) missingFields.push(`capture.${field}`);
      }

      if (hasOwnField(root.capture, "viewport")) {
        if (!isObjectRecord(root.capture.viewport)) {
          invalidFields.push({
            path: "capture.viewport",
            expected: "object",
            actual: describeType(root.capture.viewport),
          });
        } else {
          if (!hasOwnField(root.capture.viewport, "width")) missingFields.push("capture.viewport.width");
          if (!hasOwnField(root.capture.viewport, "height")) missingFields.push("capture.viewport.height");
          if (hasOwnField(root.capture.viewport, "width")) requireFiniteNumber("capture.viewport.width", root.capture.viewport.width);
          if (hasOwnField(root.capture.viewport, "height")) requireFiniteNumber("capture.viewport.height", root.capture.viewport.height);
        }
      }

      if (hasOwnField(root.capture, "readinessPolicy")) {
        if (!isObjectRecord(root.capture.readinessPolicy)) {
          invalidFields.push({
            path: "capture.readinessPolicy",
            expected: "object",
            actual: describeType(root.capture.readinessPolicy),
          });
        } else {
          const readinessRequired = [
            "navigationTimeoutMs",
            "networkQuietTimeoutMs",
            "domStabilizationWindowMs",
            "domStabilizationPollMs",
            "maxTotalCaptureMs",
          ];
          for (const field of readinessRequired) {
            if (!hasOwnField(root.capture.readinessPolicy, field)) missingFields.push(`capture.readinessPolicy.${field}`);
          }

          if (hasOwnField(root.capture.readinessPolicy, "navigationTimeoutMs")) {
            requireFiniteNumber(
              "capture.readinessPolicy.navigationTimeoutMs",
              root.capture.readinessPolicy.navigationTimeoutMs,
            );
          }
          if (hasOwnField(root.capture.readinessPolicy, "networkQuietTimeoutMs")) {
            requireFiniteNumber(
              "capture.readinessPolicy.networkQuietTimeoutMs",
              root.capture.readinessPolicy.networkQuietTimeoutMs,
            );
          }
          if (hasOwnField(root.capture.readinessPolicy, "domStabilizationWindowMs")) {
            requireFiniteNumber(
              "capture.readinessPolicy.domStabilizationWindowMs",
              root.capture.readinessPolicy.domStabilizationWindowMs,
            );
          }
          if (hasOwnField(root.capture.readinessPolicy, "domStabilizationPollMs")) {
            requireFiniteNumber(
              "capture.readinessPolicy.domStabilizationPollMs",
              root.capture.readinessPolicy.domStabilizationPollMs,
            );
          }
          if (hasOwnField(root.capture.readinessPolicy, "maxTotalCaptureMs")) {
            requireFiniteNumber("capture.readinessPolicy.maxTotalCaptureMs", root.capture.readinessPolicy.maxTotalCaptureMs);
          }
          if (
            hasOwnField(root.capture.readinessPolicy, "shellContentMinLength") &&
            root.capture.readinessPolicy.shellContentMinLength !== undefined
          ) {
            requireFiniteNumber(
              "capture.readinessPolicy.shellContentMinLength",
              root.capture.readinessPolicy.shellContentMinLength,
            );
          }
          if (
            hasOwnField(root.capture.readinessPolicy, "shellDetectionRetryCount") &&
            root.capture.readinessPolicy.shellDetectionRetryCount !== undefined
          ) {
            requireFiniteNumber(
              "capture.readinessPolicy.shellDetectionRetryCount",
              root.capture.readinessPolicy.shellDetectionRetryCount,
            );
          }
          if (
            hasOwnField(root.capture.readinessPolicy, "shellDetectionRetryDelayMs") &&
            root.capture.readinessPolicy.shellDetectionRetryDelayMs !== undefined
          ) {
            requireFiniteNumber(
              "capture.readinessPolicy.shellDetectionRetryDelayMs",
              root.capture.readinessPolicy.shellDetectionRetryDelayMs,
            );
          }
        }
      }

      if (hasOwnField(root.capture, "captureScreenshots")) {
        requireBoolean("capture.captureScreenshots", root.capture.captureScreenshots);
      }
      if (hasOwnField(root.capture, "captureComputedStyles")) {
        requireBoolean("capture.captureComputedStyles", root.capture.captureComputedStyles);
      }
      if (hasOwnField(root.capture, "captureRenderedDom")) {
        requireBoolean("capture.captureRenderedDom", root.capture.captureRenderedDom);
      }
      if (hasOwnField(root.capture, "timeoutBudgetMs")) {
        requireFiniteNumber("capture.timeoutBudgetMs", root.capture.timeoutBudgetMs);
      }
    }
  }

  if (missingFields.length > 0 || invalidFields.length > 0) {
    return {
      request: null,
      error: {
        code: "INVALID_WORKER_REQUEST",
        message: "Rendered capture worker request contract is invalid.",
        details: {
          expectedKind: "rendered_capture_worker_request_v1",
          expectedContractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
          missingFields: [...new Set(missingFields)].sort((a, b) => a.localeCompare(b)),
          invalidFields,
        },
      },
    };
  }

  return {
    request: root as RenderedCaptureWorkerRequest,
    error: null,
  };
}

export function parseRenderedCaptureWorkerRequestDetailed(payload: unknown): {
  request: RenderedCaptureWorkerRequest | null;
  error: RenderedCaptureWorkerRequestValidationError | null;
} {
  return validateRequestPayloadShape(payload);
}

export function parseRenderedCaptureWorkerRequest(payload: unknown): RenderedCaptureWorkerRequest | null {
  return validateRequestPayloadShape(payload).request;
}
