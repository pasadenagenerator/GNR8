import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { RenderedCaptureWorkerClient } from "@/gnr8/import-rendered-capture-worker";
import { parseRenderedCaptureWorkerRequestDetailed } from "@/gnr8/import-rendered-capture-worker/worker-service";
import { importPublicSinglePageUrlToSnapshot } from "@/gnr8/validation/runtime/url-single-page-import";

function makeHtmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

test("url import retries transient worker-unavailable response and completes with rendered DOM", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-reliability-"));
  const entryHtml = "<!doctype html><html><body><main><h1>Raw entry</h1><p>raw fallback text</p></main></body></html>";
  const renderedHtml =
    "<!doctype html><html><body><main><h1>Rendered capture headline</h1><section><p>This rendered page includes enough deterministic content to be strongly selected as authoritative import source in reliability tests.</p></section></main></body></html>";

  let workerCallCount = 0;
  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      workerCallCount += 1;
      if (workerCallCount === 1) {
        return {
          kind: "rendered_capture_worker_response_v1",
          contractVersion: "1.0.0",
          requestId: request.requestId,
          status: "unsupported",
          environment: {
            runtimeKind: "unknown",
            environmentSupported: false,
            browserPackageAvailable: false,
            browserBinaryAvailable: false,
            supportDecision: "unknown",
          },
          artifacts: [],
          computedStyleSamples: [],
          diagnostics: [{ code: "CAPTURE_WORKER_TIMEOUT", severity: "warning", message: "timeout" }],
          qualitySummary: {
            renderedDomQuality: "unusable",
            domLength: 0,
            meaningfulNodeCount: 0,
            screenshotCount: 0,
            computedStyleSampleCount: 0,
          },
          failure: {
            failureClass: "environment_unsupported",
            failureCode: "WORKER_TIMEOUT",
            retryable: true,
            message: "transient timeout",
          },
          timings: {
            queueLatencyMs: null,
            executionMs: 10,
            totalMs: 10,
          },
        };
      }

      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "available",
        environment: {
          runtimeKind: "nodejs",
          environmentSupported: true,
          browserPackageAvailable: true,
          browserBinaryAvailable: true,
          supportDecision: "supported",
        },
        artifacts: [
          {
            artifactType: "rendered_dom_html",
            captureType: null,
            storage: "inline",
            uri: `data:text/html;base64,${Buffer.from(renderedHtml, "utf8").toString("base64")}`,
            mediaType: "text/html",
            sha256: "rendered-sha",
            byteLength: Buffer.byteLength(renderedHtml),
          },
        ],
        computedStyleSamples: [],
        diagnostics: [],
        qualitySummary: {
          renderedDomQuality: "strong",
          domLength: renderedHtml.length,
          meaningfulNodeCount: 12,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: null,
        timings: {
          queueLatencyMs: null,
          executionMs: 12,
          totalMs: 12,
        },
      };
    },
  };

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-url-import-retryable-worker",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(workerCallCount, 2);
  assert.equal(snapshot.sourceMode, "rendered_dom");
  assert.equal(snapshot.renderedCaptureReliability.job?.status, "completed");
  assert.equal(snapshot.renderedCaptureReliability.job?.attemptCount, 2);
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_JOB_RETRIED"));
});

test("url import surfaces terminal fallback reason when worker capture fails terminally", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-terminal-fallback-"));
  const entryHtml =
    "<!doctype html><html><body><main><h1>Fallback page</h1><p>Raw HTML remains usable for degraded import when worker capture fails terminally.</p></main></body></html>";

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "unsupported",
        environment: {
          runtimeKind: "edge",
          environmentSupported: false,
          browserPackageAvailable: false,
          browserBinaryAvailable: false,
          supportDecision: "runtime_incompatible",
        },
        artifacts: [],
        computedStyleSamples: [],
        diagnostics: [{ code: "ENVIRONMENT_UNSUPPORTED", severity: "warning", message: "unsupported runtime" }],
        qualitySummary: {
          renderedDomQuality: "unusable",
          domLength: 0,
          meaningfulNodeCount: 0,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "environment_unsupported",
          failureCode: "ENVIRONMENT_UNSUPPORTED",
          retryable: false,
          message: "unsupported runtime",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: 8,
          totalMs: 8,
        },
      };
    },
  };

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-url-import-terminal-fallback",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(snapshot.sourceMode, "raw_html_fallback");
  assert.equal(snapshot.renderedCaptureReliability.job?.status, "failed_terminal");
  const fallbackDiagnostic = snapshot.importDiagnostics.issues.find((issue) => issue.code === "CAPTURE_WORKER_FALLBACK_TO_RAW_HTML");
  assert.ok(fallbackDiagnostic);
  assert.equal((fallbackDiagnostic?.details as { fallbackReason?: string } | null)?.fallbackReason, "capture_failed_terminal");
});

test("url import persists misconfigured worker health truth without collapsing to generic health unavailable", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-worker-misconfigured-"));
  const entryHtml = "<!doctype html><html><body><main><h1>Entry</h1><p>content</p></main></body></html>";

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "unsupported",
        environment: {
          runtimeKind: "unknown",
          environmentSupported: false,
          browserPackageAvailable: false,
          browserBinaryAvailable: false,
          supportDecision: "unknown",
        },
        artifacts: [],
        computedStyleSamples: [],
        diagnostics: [{ code: "CAPTURE_WORKER_NOT_CONFIGURED", severity: "warning", message: "missing config" }],
        qualitySummary: {
          renderedDomQuality: "unusable",
          domLength: 0,
          meaningfulNodeCount: 0,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "environment_unsupported",
          failureCode: "WORKER_UNAVAILABLE",
          retryable: false,
          message: "not configured",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: 5,
          totalMs: 5,
        },
      };
    },
  };

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-url-import-worker-misconfigured",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_WORKER_NOT_CONFIGURED"));
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_WORKER_HEALTH_UNAVAILABLE"), false);
  assert.equal(snapshot.renderedCaptureReliability.workerHealth?.status, "misconfigured");
  assert.equal(snapshot.renderedCaptureReliability.workerHealth?.reason, "worker_not_configured");
});

test("url import persists launch-probe failure code without collapsing to generic environment code", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-launch-probe-failure-"));
  const entryHtml = "<!doctype html><html><body><main><h1>Entry</h1><p>content</p></main></body></html>";

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "unsupported",
        environment: {
          runtimeKind: "nodejs",
          environmentSupported: false,
          browserPackageAvailable: true,
          browserBinaryAvailable: false,
          supportDecision: "launch_incompatible",
        },
        artifacts: [],
        computedStyleSamples: [],
        diagnostics: [
          { code: "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED", severity: "error", message: "sandbox blocked" },
          { code: "ENVIRONMENT_UNSUPPORTED", severity: "error", message: "launch probe failed" },
        ],
        qualitySummary: {
          renderedDomQuality: "unusable",
          domLength: 0,
          meaningfulNodeCount: 0,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "browser_launch_failed",
          failureCode: "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED",
          retryable: false,
          message: "sandbox blocked",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: 6,
          totalMs: 6,
        },
      };
    },
  };

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-url-import-launch-probe-failure",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(snapshot.sourceMode, "raw_html_fallback");
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED"));
  const acquisitionEvidence = JSON.parse(fs.readFileSync(path.resolve(snapshot.snapshotRootDirAbs, "acquisition-evidence.json"), "utf8"));
  assert.equal(acquisitionEvidence.renderedCapture.executionTruth.failureCategory, "environment");
  assert.equal(acquisitionEvidence.renderedCapture.executionTruth.failureCode, "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED");
});

test("url import sends worker payload that passes contract validation and continues execution", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-request-contract-pass-"));
  const entryHtml = "<!doctype html><html><body><main><h1>Entry</h1><p>content</p></main></body></html>";
  let parsePassed = false;

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      const parsed = parseRenderedCaptureWorkerRequestDetailed(request);
      parsePassed = Boolean(parsed.request) && !parsed.error;
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "failed",
        environment: {
          runtimeKind: "nodejs",
          environmentSupported: true,
          browserPackageAvailable: true,
          browserBinaryAvailable: true,
          supportDecision: "supported",
        },
        artifacts: [],
        computedStyleSamples: [],
        diagnostics: [{ code: "NAVIGATION_FAILED", severity: "warning", message: "simulated execution failure" }],
        qualitySummary: {
          renderedDomQuality: "unusable",
          domLength: 0,
          meaningfulNodeCount: 0,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "navigation_failed",
          failureCode: "NAVIGATION_FAILED",
          retryable: true,
          message: "simulated execution failure",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: 4,
          totalMs: 4,
        },
      };
    },
  };

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-url-import-contract-pass",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(parsePassed, true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => String(issue.code) === "INVALID_WORKER_REQUEST"), false);
});
