import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { RenderedCaptureWorkerClient } from "@/gnr8/import-rendered-capture-worker";
import { parseRenderedCaptureWorkerRequestDetailed } from "@/gnr8/import-rendered-capture-worker/worker-service";
import { importPublicSinglePageUrlToSnapshot } from "@/gnr8/validation/runtime/url-single-page-import";

function unsupportedWorkerClient(): RenderedCaptureWorkerClient {
  return {
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
          executionMs: 2,
          totalMs: 2,
        },
      };
    },
  };
}

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

test("url import preserves timeout fallback reason for HTTP 200 worker execution timeouts", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-timeout-fallback-"));
  const entryHtml =
    "<!doctype html><html><body><main><h1>Fallback page</h1><p>Worker timeout should preserve timeout truth in diagnostics and evidence.</p></main></body></html>";

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
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
        diagnostics: [{ code: "RENDERED_CAPTURE_TIMEOUT", severity: "warning", message: "capture timed out" }],
        qualitySummary: {
          renderedDomQuality: "unusable",
          domLength: 0,
          meaningfulNodeCount: 0,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "timed_out",
          failureCode: "RENDERED_CAPTURE_TIMEOUT",
          retryable: false,
          message: "timed out",
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
    requestId: "req-url-import-timeout-fallback",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(snapshot.sourceMode, "raw_html_fallback");
  assert.equal(snapshot.renderedCaptureReliability.job?.status, "timed_out");
  assert.equal(snapshot.renderedCaptureReliability.workerHealth?.status, "timed_out");
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_WORKER_HTTP_ERROR"), false);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_WORKER_UNAVAILABLE"), false);
  const fallbackDiagnostic = snapshot.importDiagnostics.issues.find((issue) => issue.code === "CAPTURE_WORKER_FALLBACK_TO_RAW_HTML");
  assert.ok(fallbackDiagnostic);
  assert.equal((fallbackDiagnostic?.details as { fallbackReason?: string } | null)?.fallbackReason, "capture_timed_out");
});

test("url import accepts worker success truth even when timeout diagnostic is present", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-timeout-stale-success-"));
  const entryHtml = "<!doctype html><html><body><main><h1>Entry</h1><p>backup content</p></main></body></html>";
  const renderedHtml =
    "<!doctype html><html><body><main><h1>Rendered title</h1><section><p>Rendered content that should remain selected despite stale timeout diagnostics.</p></section></main></body></html>";
  const viewportPng = Buffer.from([137, 80, 78, 71, 1, 2, 3, 4]);

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
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
            sha256: "rendered-dom",
            byteLength: Buffer.byteLength(renderedHtml),
          },
          {
            artifactType: "screenshot_png",
            captureType: "desktop_viewport",
            storage: "inline",
            uri: `data:image/png;base64,${viewportPng.toString("base64")}`,
            mediaType: "image/png",
            sha256: "viewport-shot",
            byteLength: viewportPng.byteLength,
          },
        ],
        computedStyleSamples: [],
        diagnostics: [
          { code: "NAVIGATION_SUCCEEDED", severity: "info", message: "navigation succeeded" },
          { code: "RENDERED_CAPTURE_TIMEOUT", severity: "warning", message: "stale timeout diagnostic" },
        ],
        qualitySummary: {
          renderedDomQuality: "strong",
          domLength: renderedHtml.length,
          meaningfulNodeCount: 16,
          screenshotCount: 1,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "timed_out",
          failureCode: "RENDERED_CAPTURE_TIMEOUT",
          retryable: false,
          message: "stale timeout",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: 15,
          totalMs: 15,
        },
      };
    },
  };

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-url-import-timeout-stale-success",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(snapshot.sourceMode, "rendered_dom");
  assert.equal(snapshot.sourceSelection.sourceMode, "rendered_dom");
  assert.equal(snapshot.sourceSelection.fidelityStatus, "high_fidelity_import");
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_WORKER_RESULT_ACCEPTED"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "WORKER_SUCCESS_RESPONSE_ACCEPTED"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "WORKER_RENDERED_PAYLOAD_HYDRATED"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_PRIMARY_SELECTED_AFTER_SUCCESS"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_SUMMARY_HYDRATED_FROM_WORKER_SUCCESS"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_ARTIFACT_PERSISTED"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_CAPTURE_ACCEPTED"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_WORKER_FALLBACK_TO_RAW_HTML"), false);
  assert.equal(snapshot.renderedCaptureReliability.job?.status, "completed");
  const renderedDomCanonicalPath = path.resolve(snapshot.snapshotRootDirAbs, "rendered", "dom.html");
  const renderedScreenshotCanonicalPath = path.resolve(snapshot.snapshotRootDirAbs, "rendered", "screenshot.png");
  const renderedMetadataCanonicalPath = path.resolve(snapshot.snapshotRootDirAbs, "rendered", "metadata.json");
  assert.equal(fs.existsSync(renderedDomCanonicalPath), true);
  assert.equal(fs.existsSync(renderedScreenshotCanonicalPath), true);
  assert.equal(fs.existsSync(renderedMetadataCanonicalPath), true);
  const renderedMetadata = JSON.parse(fs.readFileSync(renderedMetadataCanonicalPath, "utf8")) as { status?: string; domSize?: number };
  assert.equal(renderedMetadata.status, "success");
  assert.equal(Number(renderedMetadata.domSize) > 0, true);
});

test("url import fetches CSS url() upload image assets from style blocks and inline styles", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-css-upload-assets-"));
  const sourceUrl = "https://transportimaver.si/";
  const heroUrl = "https://app.pasadenagenerator.com/uploads/KcGdxACT/hero-01.jpg";
  const overlayUrl = "https://app.pasadenagenerator.com/uploads/QBSeVQys/overlay.png";
  const entryHtml = `<!doctype html>
<html>
  <head>
    <style>
      .hero { background-image: url('${heroUrl}'); }
    </style>
  </head>
  <body>
    <section class="hero" style="background-image:url('${overlayUrl}')"></section>
  </body>
</html>`;

  const imageBytes = Buffer.from([137, 80, 78, 71, 1, 2, 3, 4]);
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-css-upload-assets",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (input) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url === sourceUrl) return makeHtmlResponse(entryHtml);
      if (url === heroUrl || url === overlayUrl) {
        return new Response(imageBytes, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }
      return new Response("not found", { status: 404 });
    },
  });

  const persistedUrlTargets = new Set(
    snapshot.importDiagnostics.issues
      .filter((issue) => issue.code === "RAW_IMPORT_HTML_IMAGE_ASSET_PERSISTED")
      .map((issue) => issue.targetUrl),
  );
  assert.ok(persistedUrlTargets.has(heroUrl));
  assert.ok(persistedUrlTargets.has(overlayUrl));
  assert.ok(fs.existsSync(path.resolve(snapshot.snapshotRootDirAbs, "uploads/KcGdxACT/hero-01.jpg")));
  assert.ok(fs.existsSync(path.resolve(snapshot.snapshotRootDirAbs, "uploads/QBSeVQys/overlay.png")));
});

test("url import accepts worker partial success as degraded usable rendered truth", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-partial-success-"));
  const entryHtml = "<!doctype html><html><body><main><h1>Entry</h1><p>backup content</p></main></body></html>";
  const renderedHtml = "<!doctype html><html><body><main><h1>Rendered</h1><p>usable partial evidence</p></main></body></html>";
  const viewportPng = Buffer.from([137, 80, 78, 71, 9, 8, 7, 6]);

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "partial",
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
            sha256: "rendered-dom-partial",
            byteLength: Buffer.byteLength(renderedHtml),
          },
          {
            artifactType: "screenshot_png",
            captureType: "desktop_viewport",
            storage: "inline",
            uri: `data:image/png;base64,${viewportPng.toString("base64")}`,
            mediaType: "image/png",
            sha256: "viewport-shot-partial",
            byteLength: viewportPng.byteLength,
          },
        ],
        computedStyleSamples: [],
        diagnostics: [{ code: "CAPTURE_PHASE_RESPONSE_ASSEMBLY_COMPLETED", severity: "info", message: "assembly completed" }],
        qualitySummary: {
          renderedDomQuality: "weak",
          domLength: renderedHtml.length,
          meaningfulNodeCount: 8,
          screenshotCount: 1,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "timed_out",
          failureCode: "RENDERED_CAPTURE_TIMEOUT",
          retryable: false,
          message: "partial timeout",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: 18,
          totalMs: 18,
        },
      };
    },
  };

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    requestId: "req-url-import-partial-success",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(snapshot.sourceMode, "rendered_dom");
  assert.equal(snapshot.sourceSelection.fidelityStatus, "degraded_import");
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "WORKER_SUCCESS_PARTIAL_RENDER_ACCEPTED"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_SUCCESS_DEGRADED_BUT_USABLE"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RAW_HTML_FALLBACK_USED"), false);
});

test("url import sanitizes contradictory failed worker status when success evidence is usable", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-url-import-contradictory-success-"));
  const entryHtml = "<!doctype html><html><body><main><h1>Entry</h1><p>backup content</p></main></body></html>";
  const renderedHtml = "<!doctype html><html><body><main><h1>Recovered</h1><p>contradictory payload still usable</p></main></body></html>";

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
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
        artifacts: [
          {
            artifactType: "rendered_dom_html",
            captureType: null,
            storage: "inline",
            uri: `data:text/html;base64,${Buffer.from(renderedHtml, "utf8").toString("base64")}`,
            mediaType: "text/html",
            sha256: "rendered-dom-contradictory",
            byteLength: Buffer.byteLength(renderedHtml),
          },
        ],
        computedStyleSamples: [
          {
            kind: "computed_style_sample_v1",
            sampleId: "s1",
            target: "body_text",
            selector: "body",
            tagName: "body",
            className: null,
            styles: {
              fontFamily: "Arial, sans-serif",
              fontSize: "16px",
              fontWeight: "400",
              lineHeight: "24px",
              color: "#111111",
              backgroundColor: "#ffffff",
              borderRadius: "0px",
              paddingTop: "0px",
              paddingRight: "0px",
              paddingBottom: "0px",
              paddingLeft: "0px",
            },
          },
        ],
        diagnostics: [{ code: "NAVIGATION_SUCCEEDED", severity: "info", message: "navigation succeeded" }],
        qualitySummary: {
          renderedDomQuality: "strong",
          domLength: renderedHtml.length,
          meaningfulNodeCount: 12,
          screenshotCount: 0,
          computedStyleSampleCount: 1,
        },
        failure: {
          failureClass: "dom_empty_after_render",
          failureCode: "DOM_EMPTY_AFTER_RENDER",
          retryable: false,
          message: "stale failure",
        },
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
    requestId: "req-url-import-contradictory-success",
    fetchImpl: async () => makeHtmlResponse(entryHtml),
    renderedCaptureWorkerClient: workerClient,
  });

  assert.equal(snapshot.sourceMode, "rendered_dom");
  assert.equal(snapshot.renderedCapture.status, "partial");
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "WORKER_SUCCESS_RESPONSE_ACCEPTED"), true);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "WORKER_SUCCESS_RESPONSE_REJECTED"), false);
  assert.equal(snapshot.importDiagnostics.issues.some((issue) => issue.code === "CAPTURE_WORKER_FALLBACK_TO_RAW_HTML"), false);
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

test("site import intake succeeds for valid html url", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-intake-valid-html-"));
  const html = "<!doctype html><html><body><main><h1>Hello</h1><img src=\"/logo.png\" /></main></body></html>";
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    fetchImpl: async (url) => {
      if (String(url).includes("logo.png")) return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      return makeHtmlResponse(html);
    },
    renderedCaptureWorkerClient: {
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
            executionMs: 2,
            totalMs: 2,
          },
        };
      },
    },
  });
  assert.equal(snapshot.importIntake?.ok, true);
  assert.equal(snapshot.importIntake?.reasonCode, "ok");
  assert.equal(snapshot.importIntake?.rawHtmlAvailable, true);
  assert.equal((snapshot.importIntake?.htmlByteLength ?? 0) > 0, true);
});

test("site import intake keeps raw html fallback when rendered capture is unavailable", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-intake-rendered-fallback-"));
  const html = "<!doctype html><html><body><main><h1>Fallback</h1><p>raw html available</p></main></body></html>";
  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "unsupported",
        environment: { runtimeKind: "edge", environmentSupported: false, browserPackageAvailable: false, browserBinaryAvailable: false, supportDecision: "runtime_incompatible" },
        artifacts: [],
        computedStyleSamples: [],
        diagnostics: [{ code: "ENVIRONMENT_UNSUPPORTED", severity: "warning", message: "unsupported" }],
        qualitySummary: { renderedDomQuality: "unusable", domLength: 0, meaningfulNodeCount: 0, screenshotCount: 0, computedStyleSampleCount: 0 },
        failure: { failureClass: "environment_unsupported", failureCode: "ENVIRONMENT_UNSUPPORTED", retryable: false, message: "unsupported" },
        timings: { queueLatencyMs: null, executionMs: 5, totalMs: 5 },
      };
    },
  };
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    fetchImpl: async () => makeHtmlResponse(html),
    renderedCaptureWorkerClient: workerClient,
  });
  assert.equal(snapshot.sourceMode, "raw_html_fallback");
  assert.equal(snapshot.importIntake?.ok, true);
  assert.equal(snapshot.importIntake?.reasonCode, "ok");
});

test("site import intake returns clear failure for empty html", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-intake-empty-html-"));
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    fetchImpl: async () => makeHtmlResponse("   "),
  });
  assert.equal(snapshot.importIntake?.ok, false);
  assert.equal(snapshot.importIntake?.reasonCode, "empty_html");
});

test("site import intake returns clear failure for invalid url", async () => {
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "notaurl",
  });
  assert.equal(snapshot.importIntake?.ok, false);
  assert.equal(snapshot.importIntake?.reasonCode, "invalid_url");
});

test("site import intake returns clear failure for non-html response", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-intake-non-html-"));
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://example.com/",
    snapshotRootDirAbs: tmpRoot,
    fetchImpl: async () =>
      new Response("{\"ok\":true}", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  assert.equal(snapshot.importIntake?.ok, false);
  assert.equal(snapshot.importIntake?.reasonCode, "unsupported_response_content_type");
});

test("raw html import discovers and persists img src logo under normalized original path", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-src-logo-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><p>This raw imported page contains enough deterministic content to remain usable and allows logo asset discovery in import tests.</p><img src="${logoPath}" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const evidencePath = path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json");
  const evidence = JSON.parse(await fs.promises.readFile(evidencePath, "utf8")) as Array<Record<string, unknown>>;
  const found = evidence.find(
    (entry) => String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png") && entry.persisted === true && entry.fetchStatus === "fetched",
  );
  assert.ok(found);
  assert.ok(found.normalizedLocalPath);
  const persistedPath = path.resolve(snapshot.snapshotRootDirAbs, String(found.normalizedLocalPath));
  assert.equal(fs.existsSync(persistedPath), true);
  assert.equal(
    evidence.some((entry) => String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png") && entry.persisted === true),
    true,
  );
  const resolutionPath = path.resolve(snapshot.snapshotRootDirAbs, "preview-asset-resolution.json");
  const resolution = JSON.parse(await fs.promises.readFile(resolutionPath, "utf8")) as Array<Record<string, unknown>>;
  const resolutionHit = resolution.find((entry) => String(entry.originalHtmlValue).includes("ROBOPLAST-znak-02-134x136px.png"));
  assert.ok(resolutionHit);
  assert.equal(resolutionHit.fileMapMatched, true);
  assert.equal(resolutionHit.fileFound, true);
  assert.equal(resolutionHit.routeStatus, 200);
});

test("persisted img asset rewrites to preview-assets URL when runtime ids are present", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-runtime-rewrite-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><img src="${logoPath}" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(
    writtenHtml.includes(
      "/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png",
    ),
    true,
  );
  const resolution = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "preview-asset-resolution.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  const resolutionHit = resolution.find((entry) => String(entry.originalHtmlValue).includes("ROBOPLAST-znak-02-134x136px.png"));
  assert.ok(resolutionHit);
  assert.equal(resolutionHit?.rewriteMode, "preview_assets_route");
  assert.equal(resolutionHit?.siteId, "site_1");
  assert.equal(resolutionHit?.siteVersionId, "sv_1");
});

test("preview-assets img src is not rewritten again when already route-shaped", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-rewrite-idempotent-src-"));
  const existingPreviewSrc =
    "/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><img src="${existingPreviewSrc}" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async () => makeHtmlResponse(html),
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(writtenHtml.includes(`${existingPreviewSrc}/api/gnr8/runtime/preview-assets/`), false);
  const diagnostics = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "url-import-diagnostics.json"), "utf8"),
  ) as { issues: Array<{ code?: string; details?: { reasonCode?: string } | null }> };
  assert.equal(
    diagnostics.issues.some((issue) => issue.code === "PREVIEW_HTML_IMAGE_REWRITE_SKIPPED" && issue.details?.reasonCode === "ALREADY_PREVIEW_ASSET_URL"),
    true,
  );
});

test("double-prefixed preview-assets img src is normalized", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-rewrite-double-prefix-src-"));
  const html = `<!doctype html><html><body><main><img src="/api/gnr8/runtime/preview-assets/site_1/sv_1/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async () => makeHtmlResponse(html),
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(writtenHtml.includes("/preview-assets/site_1/sv_1/api/gnr8/runtime/preview-assets/"), false);
  assert.equal(
    writtenHtml.includes("/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png"),
    true,
  );
  const diagnostics = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "url-import-diagnostics.json"), "utf8"),
  ) as { issues: Array<{ code?: string; details?: { reasonCode?: string } | null }> };
  assert.equal(
    diagnostics.issues.some((issue) => issue.code === "PREVIEW_HTML_IMAGE_REWRITE_APPLIED" && issue.details?.reasonCode === "DOUBLE_PREFIX_NORMALIZED"),
    true,
  );
});

test("preview-assets srcset URLs are not double-rewritten", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-rewrite-idempotent-srcset-"));
  const previewSrcset =
    "/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png 1x";
  const html = `<!doctype html><html><body><main><img src="/placeholder.png" srcset="${previewSrcset}" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async () => makeHtmlResponse(html),
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(writtenHtml.includes("/preview-assets/site_1/sv_1/api/gnr8/runtime/preview-assets/"), false);
  assert.equal(writtenHtml.includes(previewSrcset), true);
});

test("gallery data-image preview-assets URL is not wrapped again", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-gallery-rewrite-idempotent-data-image-"));
  const existingPreviewSrc =
    "/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/gallery/roboplast-gallery-1.jpg";
  const html = `<!doctype html><html><body><main><div class="gallery-item" data-image="${existingPreviewSrc}"></div></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async () => makeHtmlResponse(html),
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(writtenHtml.includes(`${existingPreviewSrc}/api/gnr8/runtime/preview-assets/`), false);
  const diagnostics = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "url-import-diagnostics.json"), "utf8"),
  ) as { issues: Array<{ code?: string; details?: { reasonCode?: string } | null }> };
  assert.equal(
    diagnostics.issues.some(
      (issue) => issue.code === "PREVIEW_GALLERY_IMAGE_REWRITE_SKIPPED" && issue.details?.reasonCode === "ALREADY_PREVIEW_ASSET_URL",
    ),
    true,
  );
});

test("gallery data-gallery double-prefixed preview-assets URL is normalized", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-gallery-rewrite-double-prefix-data-gallery-"));
  const html =
    "<!doctype html><html><body><main><div data-gallery=\"/api/gnr8/runtime/preview-assets/site_1/sv_1/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/gallery/roboplast-gallery-2.jpg\"></div></main></body></html>";
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async () => makeHtmlResponse(html),
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(writtenHtml.includes("/preview-assets/site_1/sv_1/api/gnr8/runtime/preview-assets/"), false);
  assert.equal(writtenHtml.includes("/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/gallery/roboplast-gallery-2.jpg"), true);
  const diagnostics = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "url-import-diagnostics.json"), "utf8"),
  ) as { issues: Array<{ code?: string; details?: { reasonCode?: string } | null }> };
  assert.equal(
    diagnostics.issues.some(
      (issue) =>
        issue.code === "PREVIEW_GALLERY_IMAGE_DOUBLE_PREFIX_NORMALIZED" && issue.details?.reasonCode === "DOUBLE_PREFIX_NORMALIZED",
    ),
    true,
  );
});

test("gallery data-req JSON payload double-prefixed preview-assets URL is normalized", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-gallery-rewrite-double-prefix-data-req-json-"));
  const dataReq = JSON.stringify({
    images: [
      {
        imageUrl:
          "/api/gnr8/runtime/preview-assets/site_1/sv_1/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/gallery/roboplast-gallery-3.jpg",
      },
    ],
  });
  const html = `<!doctype html><html><body><main><img src="/placeholder.png" data-req='${dataReq}'></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async () => makeHtmlResponse(html),
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(writtenHtml.includes("/preview-assets/site_1/sv_1/api/gnr8/runtime/preview-assets/"), false);
  assert.equal(writtenHtml.includes("/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/gallery/roboplast-gallery-3.jpg"), true);
});

test("background inline style image URLs remain unchanged by preview image rewrite", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-background-inline-style-unchanged-"));
  const backgroundUrl = "/uploads/gallery/background-image.jpg";
  const html = `<!doctype html><html><body><main><div style="background-image:url('${backgroundUrl}')"></div></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async () => makeHtmlResponse(html),
  });
  const writtenHtml = await fs.promises.readFile(snapshot.entryHtmlPathAbs, "utf8");
  assert.equal(writtenHtml.includes(`background-image:url('${backgroundUrl}')`), true);
  assert.equal(writtenHtml.includes("/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/gallery/background-image.jpg"), false);
});

test("persisted img asset records runtime ids missing when absent", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-runtime-missing-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><img src="${logoPath}" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const resolution = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "preview-asset-resolution.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  const resolutionHit = resolution.find((entry) => String(entry.originalHtmlValue).includes("ROBOPLAST-znak-02-134x136px.png"));
  assert.ok(resolutionHit);
  assert.equal(resolutionHit?.rewriteMode, "snapshot_local");
  assert.equal(resolutionHit?.reasonCode, "RUNTIME_IDS_MISSING_SNAPSHOT_LOCAL_PREVIEW");
  const diagnostics = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "url-import-diagnostics.json"), "utf8"),
  ) as { issues: Array<{ code?: string }> };
  assert.equal(
    diagnostics.issues.some((issue) => issue.code === "PREVIEW_HTML_IMAGE_REWRITE_RUNTIME_IDS_MISSING"),
    true,
  );
});

test("raw html import discovers and persists data-src logo candidate", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-data-src-logo-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/logo-data-src.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><p>This raw imported page contains enough deterministic content to remain usable and allows data-src logo discovery in import tests.</p><img src="/placeholder.png" data-src="${logoPath}" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("/uploads/VmPFXCum/236x0_247x0/logo-data-src.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      if (String(url).includes("/placeholder.png")) {
        return new Response("png", { status: 404, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const evidencePath = path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json");
  const evidence = JSON.parse(await fs.promises.readFile(evidencePath, "utf8")) as Array<Record<string, unknown>>;
  const found = evidence.find((entry) => String(entry.originalValue).includes("logo-data-src.png") && entry.persisted === true);
  assert.ok(found);
  assert.ok(found.normalizedLocalPath);
  const persistedPath = path.resolve(snapshot.snapshotRootDirAbs, String(found.normalizedLocalPath));
  assert.equal(fs.existsSync(persistedPath), true);
  assert.equal(
    evidence.some(
      (entry) =>
        String(entry.originalValue).includes("logo-data-src.png") &&
        entry.persisted === true &&
        entry.fetchStatus === "fetched",
    ),
    true,
  );
});

test("raw html import discovers and persists img data-lazyload-src logo candidate", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-data-lazyload-src-logo-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><p>Deterministic lazy image attribute discovery should fetch and persist the real logo.</p><img src="/placeholder.png" data-lazyload-src="${logoPath}" alt="logo"></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const evidencePath = path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json");
  const evidence = JSON.parse(await fs.promises.readFile(evidencePath, "utf8")) as Array<Record<string, unknown>>;
  const found = evidence.find(
    (entry) =>
      entry.originalAttribute === "data-lazyload-src" &&
      String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png") &&
      entry.persisted === true,
  );
  assert.ok(found);
  assert.equal(found?.sourceContext, "html");
});

test("raw html import discovers and persists noscript img src logo candidate", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-noscript-src-logo-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><noscript><img src="${logoPath}" alt="logo"></noscript></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const evidence = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  const found = evidence.find(
    (entry) => entry.originalAttribute === "src" && String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png"),
  );
  assert.ok(found);
  assert.equal(found?.sourceContext, "noscript");
  assert.equal(found?.persisted, true);
});

test("raw html import discovers and persists noscript img data-lazyload-src logo candidate", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-noscript-data-lazyload-src-logo-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><noscript><img src="/placeholder.png" data-lazyload-src="${logoPath}" alt="logo"></noscript></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const evidence = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  const found = evidence.find(
    (entry) =>
      entry.originalAttribute === "data-lazyload-src" &&
      String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png") &&
      entry.sourceContext === "noscript",
  );
  assert.ok(found);
  assert.equal(found?.persisted, true);
});

test("raw html import discovers noscript img srcset logo candidates", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-noscript-srcset-logo-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><noscript><img srcset="${logoPath} 1x, /uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-268x272px.png 2x" alt="logo"></noscript></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png") || String(url).includes("ROBOPLAST-znak-02-268x272px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const evidence = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  assert.equal(
    evidence.some(
      (entry) =>
        entry.originalAttribute === "srcset" &&
        String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png") &&
        entry.sourceContext === "noscript",
    ),
    true,
  );
});

test("noscript image fetch failure is recorded without breaking import", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-noscript-missing-logo-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><noscript><img src="${logoPath}" alt="logo"></noscript></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
      }
      return makeHtmlResponse(html);
    },
  });
  assert.equal(snapshot.importIntake?.ok, true);
  const evidence = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  assert.equal(
    evidence.some(
      (entry) =>
        String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png") &&
        entry.sourceContext === "noscript" &&
        entry.fetchStatus === "fetch_failed" &&
        entry.persisted === false,
    ),
    true,
  );
});

test("image discovery evidence records fetch failure without breaking import", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-evidence-miss-"));
  const html =
    "<!doctype html><html><body><main><h1>Roboplast</h1><p>This raw imported page remains usable even when an image fetch fails, and evidence should capture that miss.</p><img src=\"/uploads/missing-logo.png\" alt=\"logo\"></main></body></html>";
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("/uploads/missing-logo.png")) {
        return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
      }
      return makeHtmlResponse(html);
    },
  });
  assert.equal(snapshot.importIntake?.ok, true);
  const evidencePath = path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json");
  const evidence = JSON.parse(await fs.promises.readFile(evidencePath, "utf8")) as Array<Record<string, unknown>>;
  assert.equal(
    evidence.some(
      (entry) =>
        String(entry.originalValue).includes("missing-logo.png") &&
        entry.persisted === false &&
        entry.fetchStatus === "fetch_failed",
    ),
    true,
  );
  const resolutionPath = path.resolve(snapshot.snapshotRootDirAbs, "preview-asset-resolution.json");
  const resolution = JSON.parse(await fs.promises.readFile(resolutionPath, "utf8")) as Array<Record<string, unknown>>;
  const miss = resolution.find((entry) => String(entry.originalHtmlValue).includes("missing-logo.png"));
  assert.ok(miss);
  assert.equal(miss.fileFound, false);
  assert.equal(miss.routeStatus, 404);
  const diagnostics = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "url-import-diagnostics.json"), "utf8"),
  ) as { issues: Array<{ code?: string }> };
  assert.equal(diagnostics.issues.some((issue) => issue.code === "PREVIEW_HTML_IMAGE_REWRITE_FILEMAP_MISS"), true);
});

test("noscript Roboplast logo participates in rewrite decision evidence", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-image-noscript-rewrite-evidence-"));
  const logoPath = "/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png";
  const html = `<!doctype html><html><body><main><h1>Roboplast</h1><noscript><img src="${logoPath}" alt="logo"></noscript></main></body></html>`;
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.roboplast.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_1",
    siteVersionId: "sv_1",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("ROBOPLAST-znak-02-134x136px.png")) {
        return new Response("png", { status: 200, headers: { "content-type": "image/png" } });
      }
      return makeHtmlResponse(html);
    },
  });
  const resolution = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "preview-asset-resolution.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  const hit = resolution.find((entry) => String(entry.originalHtmlValue).includes("ROBOPLAST-znak-02-134x136px.png"));
  assert.ok(hit);
  assert.equal(hit?.rewriteMode, "preview_assets_route");
  const discovery = JSON.parse(
    await fs.promises.readFile(path.resolve(snapshot.snapshotRootDirAbs, "image-asset-discovery.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
  const found = discovery.find((entry) => String(entry.originalValue).includes("ROBOPLAST-znak-02-134x136px.png"));
  assert.equal(found?.sourceContext, "noscript");
});

test("script-assigned root-relative stylesheet is fetched and persisted at local assets path", async () => {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-script-stylesheet-preserve-"));
  const html = [
    "<!doctype html><html><head><script>",
    "var cb=function(){var l=document.createElement('link'); l.rel='stylesheet'; l.href='/assets/user-style.css?1749115631';};",
    "cb();",
    "</script></head><body><main><h1>Maver</h1></main></body></html>",
  ].join("");
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: "https://www.transportimaver.si/",
    snapshotRootDirAbs: tmpRoot,
    siteId: "site_test",
    siteVersionId: "sv_test",
    renderedCaptureWorkerClient: unsupportedWorkerClient(),
    fetchImpl: async (url) => {
      if (String(url).includes("/assets/user-style.css?1749115631")) {
        return new Response("body{opacity:1}", { status: 200, headers: { "content-type": "text/css; charset=utf-8" } });
      }
      return makeHtmlResponse(html);
    },
  });

  const persistedCssAbs = path.resolve(snapshot.snapshotRootDirAbs, "assets/user-style.css");
  const persistedCss = await fs.promises.readFile(persistedCssAbs, "utf8");
  assert.match(persistedCss, /opacity:1/);
});
