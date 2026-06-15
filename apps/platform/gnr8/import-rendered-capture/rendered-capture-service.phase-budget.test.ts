import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_RENDERED_CAPTURE_READINESS_POLICY,
  getPostNavigationPhaseOrderForTesting,
  runCapturePhaseForTesting,
  runRenderedCapture,
} from "@/gnr8/import-rendered-capture/rendered-capture-service";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("phase runner records start/completion with duration", async () => {
  const phase = await runCapturePhaseForTesting({
    phase: "dom_serialization",
    readiness: { ...DEFAULT_RENDERED_CAPTURE_READINESS_POLICY, maxTotalCaptureMs: 30_000 },
    operation: async () => {
      await sleep(10);
      return "ok";
    },
  });

  assert.equal(phase.result.timedOut, false);
  assert.equal(phase.result.failed, false);
  assert.equal(phase.result.value, "ok");
  assert.ok(phase.diagnostics.some((entry) => entry.code === "CAPTURE_PHASE_DOM_SERIALIZATION_STARTED"));
  assert.ok(phase.diagnostics.some((entry) => entry.code === "CAPTURE_PHASE_DOM_SERIALIZATION_COMPLETED"));
});

test("phase runner classifies DOM serialization timeout", async () => {
  const phase = await runCapturePhaseForTesting({
    phase: "dom_serialization",
    readiness: { ...DEFAULT_RENDERED_CAPTURE_READINESS_POLICY, maxTotalCaptureMs: 20 },
    operation: async () => {
      await sleep(60);
      return "late";
    },
  });

  assert.equal(phase.result.timedOut, true);
  assert.ok(phase.diagnostics.some((entry) => entry.code === "CAPTURE_PHASE_DOM_SERIALIZATION_TIMED_OUT"));
  assert.ok(phase.diagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_TIMEOUT"));
});

test("phase runner classifies screenshot timeout", async () => {
  const phase = await runCapturePhaseForTesting({
    phase: "screenshot_viewport",
    readiness: { ...DEFAULT_RENDERED_CAPTURE_READINESS_POLICY, maxTotalCaptureMs: 20 },
    operation: async () => {
      await sleep(60);
      return new Uint8Array([1, 2, 3]);
    },
  });

  assert.equal(phase.result.timedOut, true);
  assert.ok(phase.diagnostics.some((entry) => entry.code === "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_TIMED_OUT"));
});

test("phase runner classifies style sampling timeout", async () => {
  const phase = await runCapturePhaseForTesting({
    phase: "style_sampling",
    readiness: { ...DEFAULT_RENDERED_CAPTURE_READINESS_POLICY, maxTotalCaptureMs: 20 },
    operation: async () => {
      await sleep(60);
      return [];
    },
  });

  assert.equal(phase.result.timedOut, true);
  assert.ok(phase.diagnostics.some((entry) => entry.code === "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT"));
});

test("post-navigation phase ordering prioritizes DOM then viewport screenshot then styles", () => {
  assert.deepEqual(getPostNavigationPhaseOrderForTesting(), [
    "dom_serialization",
    "screenshot_viewport",
    "style_sampling",
    "screenshot_fullpage",
    "asset_manifest_finalization",
    "response_assembly",
  ]);
});

test("runRenderedCapture preserves partial artifacts when later phase timeout is reported", async () => {
  const snapshotRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-rendered-capture-phase-test-"));
  const result = await runRenderedCapture({
    sourceUrl: "https://example.com",
    snapshotRootDirAbs,
    executor: async () => ({
      status: "partial",
      document: {
        html: "<html><body><main>hello</main></body></html>",
        readinessState: "dom_stable",
      },
      screenshots: [
        {
          captureType: "desktop_viewport",
          bytes: new Uint8Array([137, 80, 78, 71]),
          width: 1366,
          height: 768,
          fullPage: false,
        },
      ],
      computedStyleSamples: [],
      layoutGeometryEvidence: [],
      renderedObservedAssetUrls: [],
      diagnostics: [
        {
          code: "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT",
          severity: "warning",
          message: "style timed out",
        },
        {
          code: "RENDERED_CAPTURE_TIMEOUT",
          severity: "warning",
          message: "timed out",
        },
      ],
    }),
  });

  assert.equal(result.status, "partial");
  assert.equal(result.documents.length, 1);
  assert.equal(result.screenshots.length, 1);
  assert.ok(result.diagnostics.some((entry) => entry.code === "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT"));
  assert.equal(fs.existsSync(result.documents[0]!.htmlPathAbs), true);
  assert.equal(fs.existsSync(result.screenshots[0]!.filePathAbs), true);
});

test("runRenderedCapture upgrades unavailable to partial when browser artifacts exist", async () => {
  const snapshotRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-rendered-capture-status-upgrade-test-"));
  const result = await runRenderedCapture({
    sourceUrl: "https://example.com",
    snapshotRootDirAbs,
    executor: async () => ({
      status: "unavailable",
      document: {
        html: "<html><body><main>rendered evidence</main></body></html>",
        readinessState: "dom_stable",
      },
      screenshots: [],
      computedStyleSamples: [],
      layoutGeometryEvidence: [],
      renderedObservedAssetUrls: [],
      diagnostics: [],
    }),
  });

  assert.equal(result.status, "partial");
  assert.equal(result.sourceMode, "rendered_dom");
  assert.equal(result.documents.length, 1);
});

test("runRenderedCapture keeps unavailable when no browser artifacts exist", async () => {
  const snapshotRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-rendered-capture-status-unavailable-test-"));
  const result = await runRenderedCapture({
    sourceUrl: "https://example.com",
    snapshotRootDirAbs,
    executor: async () => ({
      status: "unavailable",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      layoutGeometryEvidence: [],
      renderedObservedAssetUrls: [],
      diagnostics: [],
    }),
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.sourceMode, "raw_html");
  assert.equal(result.documents.length, 0);
});

test("runRenderedCapture preserves unsupported classification from runtime diagnostics", async () => {
  const snapshotRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-rendered-capture-status-unsupported-test-"));
  const result = await runRenderedCapture({
    sourceUrl: "https://example.com",
    snapshotRootDirAbs,
    executor: async () => ({
      status: "unavailable",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      layoutGeometryEvidence: [],
      renderedObservedAssetUrls: [],
      diagnostics: [
        {
          code: "ENVIRONMENT_UNSUPPORTED",
          severity: "error",
          message: "runtime unsupported",
          details: { reason: "LAUNCH_PROBE_FAILED" },
        },
      ],
    }),
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.diagnostics.some((entry) => entry.code === "ENVIRONMENT_UNSUPPORTED"), true);
});

test("runRenderedCapture downgrades available to failed when no rendered evidence exists", async () => {
  const snapshotRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-rendered-capture-status-failed-test-"));
  const result = await runRenderedCapture({
    sourceUrl: "https://example.com",
    snapshotRootDirAbs,
    executor: async () => ({
      status: "available",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      layoutGeometryEvidence: [],
      renderedObservedAssetUrls: [],
      diagnostics: [],
    }),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.sourceMode, "raw_html");
  assert.equal(result.documents.length, 0);
  assert.equal(result.screenshots.length, 0);
  assert.equal(result.computedStyleSamples.length, 0);
});

test("runRenderedCapture keeps partial when at least one rendered evidence artifact exists", async () => {
  const snapshotRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-rendered-capture-status-partial-style-test-"));
  const result = await runRenderedCapture({
    sourceUrl: "https://example.com",
    snapshotRootDirAbs,
    executor: async () => ({
      status: "partial",
      document: null,
      screenshots: [],
      computedStyleSamples: [
        {
          kind: "computed_style_sample_v1",
          sampleId: "sample-1",
          target: "root",
          selector: "body",
          tagName: "BODY",
          className: null,
          styles: {
            fontFamily: "sans-serif",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            color: "rgb(0, 0, 0)",
            backgroundColor: "rgb(255, 255, 255)",
            borderRadius: "0px",
            paddingTop: "0px",
            paddingRight: "0px",
            paddingBottom: "0px",
            paddingLeft: "0px",
          },
        },
      ],
      layoutGeometryEvidence: [],
      renderedObservedAssetUrls: [],
      diagnostics: [],
    }),
  });

  assert.equal(result.status, "partial");
  assert.equal(result.sourceMode, "raw_html");
  assert.equal(result.documents.length, 0);
  assert.equal(result.computedStyleSamples.length, 1);
});
