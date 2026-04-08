import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { RenderedCaptureExecutorResult } from "../../gnr8/import-rendered-capture";
import type { JsonValue } from "../../gnr8/import/import-contract";
import { stableStringify } from "../../gnr8/migration/runtime/diagnostics";
import { importPublicSinglePageUrlToSnapshot } from "../../gnr8/validation/runtime/url-single-page-import";

import { runBetaExportOperatorFlow } from "./beta-export-operator";
import { runUrlImportOperatorFlow, urlImportOperatorResponseStableJson } from "./url-import-operator";

type MockResponseDef = {
  status: number;
  headers?: Record<string, string>;
  body: string | Uint8Array;
};

function mockFetchFromTable(table: Record<string, MockResponseDef>): (input: string | URL | Request) => Promise<Response> {
  return async (input) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : String(input);

    const hit = table[url];
    if (!hit) {
      throw new Error(`unexpected_fetch_url:${url}`);
    }

    const body: BodyInit = typeof hit.body === "string" ? hit.body : Buffer.from(hit.body);
    return new Response(body, {
      status: hit.status,
      headers: hit.headers,
    });
  };
}

function fileSha256(absPath: string): string {
  const bytes = fs.readFileSync(absPath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function listFilesRecursively(absRoot: string): string[] {
  const out: string[] = [];
  const stack = [absRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const abs = path.resolve(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile()) out.push(abs);
    }
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function withEnv(input: { key: string; value?: string }, fn: () => Promise<void>): Promise<void> {
  const previous = process.env[input.key];
  if (typeof input.value === "string") process.env[input.key] = input.value;
  else delete process.env[input.key];
  return fn().finally(() => {
    if (typeof previous === "string") process.env[input.key] = previous;
    else delete process.env[input.key];
  });
}

function mockRenderedCaptureExecutor(result: RenderedCaptureExecutorResult) {
  return async (): Promise<RenderedCaptureExecutorResult> => result;
}

test("url import snapshot generation remains deterministic for identical URL + response set", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-determinism-"));

  const sourceUrl = "https://Example.com/landing?b=2&a=1#section";
  const fetchImpl = mockFetchFromTable({
    "https://example.com/landing?b=2&a=1": {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: [
        "<!doctype html>",
        "<html><head>",
        "<link rel=\"stylesheet\" href=\"/styles/site.css\">",
        "</head><body>",
        "<img data-src=\"images/logo.png\" srcset=\"images/logo.png 1x, //example.com/images/logo@2x.png 2x\">",
        "<script src=\"//cdn.example.net/app.js\"></script>",
        "</body></html>",
      ].join(""),
    },
    "https://example.com/styles/site.css": {
      status: 200,
      headers: { "content-type": "text/css" },
      body: "body { color: #111; background-image:url('../images/bg.jpg'); }",
    },
    "https://example.com/images/logo.png": {
      status: 200,
      headers: { "content-type": "image/png" },
      body: new Uint8Array([137, 80, 78, 71]),
    },
    "https://example.com/images/logo@2x.png": {
      status: 200,
      headers: { "content-type": "image/png" },
      body: new Uint8Array([137, 80, 78, 71, 1]),
    },
    "https://example.com/images/bg.jpg": {
      status: 200,
      headers: { "content-type": "image/jpeg" },
      body: new Uint8Array([255, 216, 255, 224]),
    },
    "https://cdn.example.net/app.js": {
      status: 200,
      headers: { "content-type": "application/javascript" },
      body: "console.log('ok')",
    },
  });

  const a = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl,
  });

  const b = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl,
  });

  assert.equal(a.snapshotId, b.snapshotId);
  assert.equal(a.normalizedUrl, "https://example.com/landing?b=2&a=1");

  const filesA = listFilesRecursively(a.snapshotRootDirAbs)
    .map((abs) => ({ rel: path.relative(a.snapshotRootDirAbs, abs).replaceAll(path.sep, "/"), sha: fileSha256(abs) }))
    .sort((x, y) => x.rel.localeCompare(y.rel));

  const filesB = listFilesRecursively(b.snapshotRootDirAbs)
    .map((abs) => ({ rel: path.relative(b.snapshotRootDirAbs, abs).replaceAll(path.sep, "/"), sha: fileSha256(abs) }))
    .sort((x, y) => x.rel.localeCompare(y.rel));

  assert.equal(stableStringify(filesA as unknown as JsonValue), stableStringify(filesB as unknown as JsonValue));
  assert.equal(stableStringify(a.fetchManifest as unknown as JsonValue), stableStringify(b.fetchManifest as unknown as JsonValue));
  assert.equal(stableStringify(a.importDiagnostics as unknown as JsonValue), stableStringify(b.importDiagnostics as unknown as JsonValue));
});

test("rendered capture unavailable falls back to raw_html and preserves raw response html", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-rendered-fallback-"));
  const sourceUrl = "https://fallback-rendered.example.com/";

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl: mockFetchFromTable({
      [sourceUrl]: {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: "<!doctype html><html><body><h1>Raw Fallback</h1></body></html>",
      },
    }),
    renderedCaptureExecutor: mockRenderedCaptureExecutor({
      status: "unavailable",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics: [
        {
          code: "RENDERED_CAPTURE_UNAVAILABLE",
          severity: "warning",
          message: "mock unavailable",
        },
      ],
    }),
  });

  assert.equal(snapshot.sourceMode, "raw_html_fallback");
  assert.equal(snapshot.sourceSelection.sourceMode, "raw_html_fallback");
  assert.equal(snapshot.sourceSelection.fidelityStatus, "degraded_import");
  assert.equal(snapshot.renderedCapture.status, "unavailable");
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_CAPTURE_UNAVAILABLE"));
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RAW_HTML_FALLBACK_USED"));
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "IMPORT_FIDELITY_DEGRADED"));
  assert.equal(fs.existsSync(snapshot.responseHtmlPathAbs), true);
  assert.equal(fs.existsSync(snapshot.entryHtmlPathAbs), true);
  assert.equal(fs.readFileSync(snapshot.responseHtmlPathAbs, "utf8").includes("Raw Fallback"), true);
  assert.equal(fs.readFileSync(snapshot.entryHtmlPathAbs, "utf8").includes("Raw Fallback"), true);
});

test("rendered capture contract is persisted and rendered_dom becomes primary snapshot source", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-rendered-primary-"));
  const sourceUrl = "https://rendered-primary.example.com/";
  const screenshotBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl: mockFetchFromTable({
      [sourceUrl]: {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: "<!doctype html><html><body><h1>Raw Source</h1></body></html>",
      },
      "https://rendered-primary.example.com/app.css": {
        status: 200,
        headers: { "content-type": "text/css" },
        body: "body{font-family:system-ui}",
      },
    }),
    renderedCaptureExecutor: mockRenderedCaptureExecutor({
      status: "available",
      document: {
        html: "<!doctype html><html><body><h1>Rendered Source</h1><a class='cta'>Start</a></body></html>",
        readinessState: "dom_stable",
      },
      screenshots: [
        {
          captureType: "desktop_viewport",
          bytes: screenshotBytes,
          width: 1366,
          height: 768,
          fullPage: false,
        },
      ],
      computedStyleSamples: [
        {
          kind: "computed_style_sample_v1",
          sampleId: "sample-root",
          target: "root",
          selector: "body",
          tagName: "body",
          className: null,
          styles: {
            fontFamily: "Inter",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            color: "rgb(0,0,0)",
            backgroundColor: "rgb(255,255,255)",
            borderRadius: "0px",
            paddingTop: "0px",
            paddingRight: "0px",
            paddingBottom: "0px",
            paddingLeft: "0px",
          },
        },
      ],
      renderedObservedAssetUrls: ["https://rendered-primary.example.com/app.css"],
      diagnostics: [
        {
          code: "RENDERED_CAPTURE_TIMEOUT",
          severity: "warning",
          message: "mock timeout partial",
        },
      ],
    }),
  });

  assert.equal(snapshot.sourceMode, "rendered_dom");
  assert.equal(snapshot.sourceSelection.sourceMode, "rendered_dom");
  assert.equal(snapshot.sourceSelection.fidelityStatus, "high_fidelity_import");
  assert.equal(snapshot.renderedCapture.status, "available");
  assert.equal(snapshot.renderedCapture.documents.length, 1);
  assert.equal(snapshot.renderedCapture.screenshots.length, 1);
  assert.equal(snapshot.renderedCapture.computedStyleSamples.length, 1);
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_CAPTURE_TIMEOUT"));
  assert.ok(fs.readFileSync(snapshot.entryHtmlPathAbs, "utf8").includes("Rendered Source"));

  const screenshotPath = snapshot.renderedCapture.screenshots[0]?.filePathAbs;
  assert.ok(typeof screenshotPath === "string" && fs.existsSync(screenshotPath));
});

test("rendered capture failure emits diagnostics and still returns snapshot output", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-rendered-failed-"));
  const sourceUrl = "https://rendered-failed.example.com/";

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl: mockFetchFromTable({
      [sourceUrl]: {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: "<!doctype html><html><body><h1>Fallback on failure</h1></body></html>",
      },
    }),
    renderedCaptureExecutor: mockRenderedCaptureExecutor({
      status: "failed",
      document: null,
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics: [
        {
          code: "RENDERED_CAPTURE_FAILED",
          severity: "error",
          message: "mock rendered capture failed",
        },
      ],
    }),
  });

  assert.equal(snapshot.sourceMode, "raw_html_fallback");
  assert.equal(snapshot.sourceSelection.fidelityStatus, "capture_failed");
  assert.equal(snapshot.renderedCapture.status, "failed");
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_CAPTURE_FAILED"));
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_DOM_REQUIRED_BUT_UNAVAILABLE"));
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RAW_HTML_FALLBACK_USED"));
  assert.equal(fs.existsSync(snapshot.entryHtmlPathAbs), true);
});

test("weak rendered DOM snapshot degrades to explicit raw_html_fallback mode", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-rendered-weak-"));
  const sourceUrl = "https://rendered-weak.example.com/";

  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl: mockFetchFromTable({
      [sourceUrl]: {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: "<!doctype html><html><body><main><h1>Raw Backup</h1><p>Use me</p></main></body></html>",
      },
    }),
    renderedCaptureExecutor: mockRenderedCaptureExecutor({
      status: "available",
      document: {
        html: "<!doctype html><html><body><main id='app-shell'></main></body></html>",
        readinessState: "dom_stable",
      },
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics: [],
    }),
  });

  assert.equal(snapshot.sourceMode, "raw_html_fallback");
  assert.equal(snapshot.sourceSelection.fidelityStatus, "degraded_import");
  assert.equal(snapshot.sourceSelection.renderedDomQuality.quality, "weak");
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RENDERED_DOM_EMPTY_OR_WEAK"));
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "RAW_HTML_FALLBACK_USED"));
  assert.ok(snapshot.importDiagnostics.issues.some((issue) => issue.code === "IMPORT_FIDELITY_DEGRADED"));
});

test("url import operator runs imported snapshot through pipeline and materialize mode", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-materialize-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://pilot.example.com/",
      executionMode: "materialize",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: mockFetchFromTable({
        "https://pilot.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            "<link rel=\"stylesheet\" href=\"/assets/styles.css\">",
            "</head><body>",
            "<main><h1>Pilot</h1></main>",
            "<img src=\"/assets/logo.svg\">",
            "</body></html>",
          ].join(""),
        },
        "https://pilot.example.com/assets/styles.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "main{padding:12px}",
        },
        "https://pilot.example.com/assets/logo.svg": {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
          body: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
        },
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  assert.equal(response.sourceKind, "imported_url_snapshot");
  assert.equal(response.summary.importStatus, "success");
  assert.equal(response.summary.pipelineStatus, "success");
  assert.equal(response.executionMode, "materialize");
  assert.equal(response.result.executionResult.executionMode, "materialize");
  assert.equal(response.result.executionResult.materialization.outputRootPath, outputRootDir);
  assert.ok(response.result.executionResult.status === "executed" || response.result.executionResult.status === "executed_with_warnings");
});

test("pipeline succeeds when rendered capture is unavailable and reports raw_html source mode", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-no-rendered-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://no-rendered.example.com/",
      executionMode: "materialize",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: mockFetchFromTable({
        "https://no-rendered.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: "<!doctype html><html><body><h1>No rendered</h1></body></html>",
        },
      }),
      renderedCaptureExecutor: mockRenderedCaptureExecutor({
        status: "unavailable",
        document: null,
        screenshots: [],
        computedStyleSamples: [],
        renderedObservedAssetUrls: [],
        diagnostics: [
          {
            code: "RENDERED_CAPTURE_UNAVAILABLE",
            severity: "warning",
            message: "mock unavailable",
          },
        ],
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;
  assert.equal(response.summary.structureSourceMode, "raw_html_fallback");
  assert.equal(response.summary.fidelityStatus, "degraded_import");
  assert.equal(response.summary.fidelityDegraded, true);
  assert.equal(response.summary.renderedCaptureStatus, "unavailable");
  assert.equal(response.summary.renderedDomCaptured, false);
  assert.equal(response.summary.screenshotCount, 0);
  assert.equal(response.summary.computedStyleSampleCount, 0);
  assert.equal(response.result.pipelineResult.status, "success");
});

test("url import hardens image/style assets and filters non-visual script/jsonld noise from exported markup", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-fidelity-noise-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://fidelity.example.com/",
      executionMode: "materialize",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: mockFetchFromTable({
        "https://fidelity.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            "<link rel=\"stylesheet\" href=\"/assets/site.css\">",
            "</head><body>",
            "<div id=\"hero\">",
            "<script type=\"application/ld+json\">{\"@context\":\"https://schema.org\",\"name\":\"Leak\"}</script>",
            "<script>window.dataLayer = window.dataLayer || []; gtag('config', 'G-LEAK');</script>",
            "<noscript>Google Tag Manager (noscript)</noscript>",
            "<img data-src=\"/assets/lazy-hero.jpg\" srcset=\"/assets/hero-1x.jpg 1x, //fidelity.example.com/assets/hero-2x.jpg 2x\" alt=\"Hero\">",
            "<a class=\"gallery-item\" href=\"/assets/gallery/full.webp\"><img src=\"data:image/gif;base64,R0lGODlhAQABAAAAACw=\" alt=\"Gallery\"></a>",
            "<picture><source srcset=\"/assets/hero-2x.jpg 2x, /assets/hero-1x.jpg 1x\"><img src=\"/assets/placeholder.png\" alt=\"Picture Hero\"></picture>",
            "</div>",
            "</body></html>",
          ].join(""),
        },
        "https://fidelity.example.com/assets/site.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: ".hero{background-image:url('../img/bg.jpg')}",
        },
        "https://fidelity.example.com/assets/lazy-hero.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 0]),
        },
        "https://fidelity.example.com/assets/hero-1x.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 1]),
        },
        "https://fidelity.example.com/assets/hero-2x.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 2]),
        },
        "https://fidelity.example.com/assets/img/bg.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 3]),
        },
        "https://fidelity.example.com/assets/gallery/full.webp": {
          status: 200,
          headers: { "content-type": "image/webp" },
          body: new Uint8Array([82, 73, 70, 70, 1]),
        },
        "https://fidelity.example.com/assets/placeholder.png": {
          status: 404,
          headers: { "content-type": "text/plain" },
          body: "missing placeholder",
        },
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const snapshotHtml = fs.readFileSync(response.snapshot.entryHtmlPathAbs, "utf8");
  assert.ok(snapshotHtml.includes('src="/assets/image/'));
  assert.ok(snapshotHtml.includes('srcset="/assets/image/'));
  assert.ok(snapshotHtml.includes('<a class="gallery-item" href="/assets/image/'));

  const snapshotStylesheetAbs = listFilesRecursively(response.snapshot.snapshotRootDirAbs).find((abs) =>
    abs.replaceAll(path.sep, "/").includes("/assets/stylesheet/"),
  );
  assert.ok(snapshotStylesheetAbs);
  const snapshotStylesheet = fs.readFileSync(snapshotStylesheetAbs!, "utf8");
  assert.ok(snapshotStylesheet.includes("../style_asset/"));

  const fetchManifestAttributes = response.snapshot.fetchManifest.map((entry) => entry.attribute);
  assert.ok(fetchManifestAttributes.includes("data-src"));
  assert.ok(fetchManifestAttributes.includes("srcset"));

  const exportedIndexAbs = path.resolve(outputRootDir, "index.html");
  const exportedHtml = fs.readFileSync(exportedIndexAbs, "utf8");
  assert.ok(!exportedHtml.includes("schema.org"));
  assert.ok(!exportedHtml.includes("window.dataLayer"));
  assert.ok(!exportedHtml.includes("gtag("));
  assert.ok(!exportedHtml.includes("Google Tag Manager (noscript)"));
  assert.ok(!exportedHtml.includes('src="/assets/'));
  assert.ok(!exportedHtml.includes('href="/assets/'));
  assert.ok(exportedHtml.includes('href="./assets/stylesheet/'));
  assert.ok(exportedHtml.includes('src="assets/image/'));

  const exportedFiles = listFilesRecursively(outputRootDir).map((abs) => abs.replaceAll(path.sep, "/"));
  const exportedStylesheetAbs = exportedFiles.find((abs) => abs.includes("/assets/stylesheet/"));
  assert.ok(exportedStylesheetAbs);
  const exportedStylesheet = fs.readFileSync(exportedStylesheetAbs!, "utf8");
  assert.ok(exportedStylesheet.includes("../style_asset/"));
});

test("url import captures fetchable head stylesheets and promotes header/logo placeholder image wrappers deterministically", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-primary-style-logo-promo-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://brand.example.com/",
      executionMode: "materialize",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: mockFetchFromTable({
        "https://brand.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            '<link rel="stylesheet" href="/assets/main.css">',
            '<link rel="stylesheet preload" href="/assets/theme.css?ver=3">',
            '<link rel="stylesheet" href="https://cdn.example.net/remote.css">',
            "</head><body>",
            '<header class="site-header">',
            '  <a class="logo-link" href="/assets/brand/logo.svg">',
            '    <img class="brand-logo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Company Logo">',
            "  </a>",
            "</header>",
            '<section class="content-card">',
            '  <a href="/assets/cards/photo.jpg"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Photo"></a>',
            "</section>",
            "</body></html>",
          ].join(""),
        },
        "https://brand.example.com/assets/main.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "body{margin:0}",
        },
        "https://brand.example.com/assets/theme.css?ver=3": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: ".theme{color:#111}",
        },
        "https://brand.example.com/assets/brand/logo.svg": {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
          body: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
        },
        "https://brand.example.com/assets/cards/photo.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 9]),
        },
        "https://cdn.example.net/remote.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "body{font-family:serif}",
        },
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const importCodes = response.snapshot.importDiagnostics.issues.map((issue) => issue.code);
  assert.ok(importCodes.includes("PRIMARY_STYLESHEET_DETECTED"));
  assert.ok(importCodes.includes("PRIMARY_STYLESHEET_SELECTED"));
  assert.ok(importCodes.includes("PRIMARY_STYLESHEET_CAPTURED"));
  assert.ok(!importCodes.includes("PRIMARY_STYLESHEET_NOT_USED_IN_FINAL_HTML"));

  const capturedPrimaryStylesheets = response.snapshot.fetchManifest.filter(
    (entry) =>
      entry.tag === "link" &&
      entry.attribute === "href" &&
      entry.assetKind === "stylesheet" &&
      entry.fetchStatus === "fetched" &&
      typeof entry.localPath === "string" &&
      entry.localPath.includes("assets/stylesheet/"),
  );
  assert.ok(capturedPrimaryStylesheets.length >= 2);

  const snapshotHtml = fs.readFileSync(response.snapshot.entryHtmlPathAbs, "utf8");
  assert.match(snapshotHtml, /<img class="brand-logo" src="\/assets\/image\//);
  assert.match(snapshotHtml, /<section class="content-card">[\s\S]*<img src="data:image\/gif;base64/);

  const exportedIndexAbs = path.resolve(outputRootDir, "index.html");
  const exportedHtml = fs.readFileSync(exportedIndexAbs, "utf8");
  const exportedStylesheetHrefs = [...exportedHtml.matchAll(/<link[^>]*rel="[^"]*stylesheet[^"]*"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(exportedStylesheetHrefs.length >= 2);
  assert.match(exportedStylesheetHrefs[0] ?? "", /^\.\/assets\/stylesheet\//);
  assert.match(exportedHtml, /<img class="brand-logo" src="assets\/image\//);
  assert.ok(exportedHtml.includes('href="https://cdn.example.net/remote.css"'));

  const second = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://brand.example.com/",
      executionMode: "materialize",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: mockFetchFromTable({
        "https://brand.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            '<link rel="stylesheet" href="/assets/main.css">',
            '<link rel="stylesheet preload" href="/assets/theme.css?ver=3">',
            '<link rel="stylesheet" href="https://cdn.example.net/remote.css">',
            "</head><body>",
            '<header class="site-header">',
            '  <a class="logo-link" href="/assets/brand/logo.svg">',
            '    <img class="brand-logo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Company Logo">',
            "  </a>",
            "</header>",
            '<section class="content-card">',
            '  <a href="/assets/cards/photo.jpg"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Photo"></a>',
            "</section>",
            "</body></html>",
          ].join(""),
        },
        "https://brand.example.com/assets/main.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "body{margin:0}",
        },
        "https://brand.example.com/assets/theme.css?ver=3": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: ".theme{color:#111}",
        },
        "https://brand.example.com/assets/brand/logo.svg": {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
          body: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
        },
        "https://brand.example.com/assets/cards/photo.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 9]),
        },
        "https://cdn.example.net/remote.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "body{font-family:serif}",
        },
      }),
    },
  );
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const exportedHtmlSecond = fs.readFileSync(exportedIndexAbs, "utf8");
  assert.equal(exportedHtmlSecond, exportedHtml);
  assert.equal(
    stableStringify(response.snapshot.importDiagnostics as unknown as JsonValue),
    stableStringify(second.snapshot.importDiagnostics as unknown as JsonValue),
  );
});

test("transporti-style regression guard: gallery placeholders remain visible and remote-first stylesheet does not displace copied local stylesheet", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-transporti-regression-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");
  const sourceUrl = "https://transporti-like.example.com/";

  function fetchTable() {
    return mockFetchFromTable({
      "https://transporti-like.example.com/": {
        status: 200,
        headers: { "content-type": "text/html" },
        body: [
          "<!doctype html>",
          "<html><head>",
          '<link rel="stylesheet" href="https://cdn.example.net/reset.css">',
          '<link rel="stylesheet" href="/assets/site-theme.css">',
          "</head><body>",
          '<section class="gallery-grid">',
          '  <a class="gallery-item" href="/assets/gallery/full.webp">',
          '    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" alt="Gallery">',
          "  </a>",
          "</section>",
          "</body></html>",
        ].join(""),
      },
      "https://transporti-like.example.com/assets/site-theme.css": {
        status: 200,
        headers: { "content-type": "text/css" },
        body: ".gallery-grid{display:grid}",
      },
      "https://transporti-like.example.com/assets/gallery/full.webp": {
        status: 200,
        headers: { "content-type": "image/webp" },
        body: new Uint8Array([82, 73, 70, 70, 2]),
      },
      "https://cdn.example.net/reset.css": {
        status: 200,
        headers: { "content-type": "text/css" },
        body: "html,body{margin:0}",
      },
    });
  }

  const first = await runUrlImportOperatorFlow(
    { sourceUrl, executionMode: "materialize" },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: fetchTable(),
    },
  );

  assert.equal(first.ok, true);
  if (!first.ok) return;

  const snapshotHtml = fs.readFileSync(first.snapshot.entryHtmlPathAbs, "utf8");
  assert.match(snapshotHtml, /<a class="gallery-item" href="\/assets\/image\//);
  assert.match(snapshotHtml, /<img src="\/assets\/image\//);
  assert.ok(!snapshotHtml.includes('src="data:image/png;base64'));

  const exportedIndexAbs = path.resolve(outputRootDir, "index.html");
  const exportedHtml = fs.readFileSync(exportedIndexAbs, "utf8");
  const stylesheetHrefs = [...exportedHtml.matchAll(/<link[^>]*rel="[^"]*stylesheet[^"]*"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(stylesheetHrefs.length >= 2);
  assert.match(stylesheetHrefs[0] ?? "", /^\.\/assets\/stylesheet\//);
  assert.equal(stylesheetHrefs.some((href) => href === "https://cdn.example.net/reset.css"), true);
  assert.match(exportedHtml, /<img src="assets\/image\//);

  const second = await runUrlImportOperatorFlow(
    { sourceUrl, executionMode: "materialize" },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: fetchTable(),
    },
  );

  assert.equal(second.ok, true);
  if (!second.ok) return;
  const exportedHtmlSecond = fs.readFileSync(exportedIndexAbs, "utf8");
  assert.equal(exportedHtmlSecond, exportedHtml);
});

test("non-fatal asset fetch issues remain visible and do not unnecessarily block", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-warnings-"));

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://warn.example.com/",
      executionMode: "simulation",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      fetchImpl: mockFetchFromTable({
        "https://warn.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            "<link rel=\"stylesheet\" href=\"/ok.css\">",
            "<link rel=\"stylesheet\" href=\"/missing-theme.css\">",
            "</head><body>",
            "<img src=\"/missing.png\">",
            "</body></html>",
          ].join(""),
        },
        "https://warn.example.com/ok.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "body{font-family:sans-serif}",
        },
        "https://warn.example.com/missing-theme.css": {
          status: 404,
          headers: { "content-type": "text/plain" },
          body: "not found",
        },
        "https://warn.example.com/missing.png": {
          status: 404,
          headers: { "content-type": "text/plain" },
          body: "not found",
        },
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  assert.equal(response.summary.importStatus, "success_with_warnings");
  assert.equal(response.summary.pipelineStatus, "success");
  assert.equal(response.summary.executionStatus === "executed" || response.summary.executionStatus === "executed_with_warnings", true);

  const snapshotWarningCodes = response.snapshot.importDiagnostics.issues.map((issue) => issue.code);
  assert.ok(snapshotWarningCodes.includes("ASSET_FETCH_NON_OK"));
  assert.ok(snapshotWarningCodes.includes("PRIMARY_STYLESHEET_FETCH_FAILED"));
  assert.ok(!snapshotWarningCodes.includes("PRIMARY_STYLESHEET_CAPTURED"));

  const importIssueCodes = response.result.importOutput.importDiagnostics.issues.map((issue) => issue.code);
  assert.ok(importIssueCodes.includes("missing_local_asset"));

  const snapshotHtml = fs.readFileSync(response.snapshot.entryHtmlPathAbs, "utf8");
  assert.ok(snapshotHtml.includes('href="/missing-theme.css"'));
});

test("existing fixture-based operator flow remains unchanged", async () => {
  const fixtureResponse = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "simulation",
  });

  assert.equal(fixtureResponse.ok, true);
  if (!fixtureResponse.ok) return;
  assert.equal(fixtureResponse.fixtureId, "real-site-01");

  const stable = urlImportOperatorResponseStableJson(
    await runUrlImportOperatorFlow(
      {
        sourceUrl: "https://minimal.example.com/",
        executionMode: "simulation",
      },
      {
        snapshotRootDirAbs: fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-min-")),
        fetchImpl: mockFetchFromTable({
          "https://minimal.example.com/": {
            status: 200,
            headers: { "content-type": "text/html" },
            body: "<!doctype html><html><body><h1>ok</h1></body></html>",
          },
        }),
      },
    ),
  );

  assert.equal(typeof stable, "string");
  assert.ok(stable.length > 10);
});

test("url import operator defaults to tmp snapshot root on Vercel runtime and works in simulation/materialize", async () => {
  await withEnv({ key: "VERCEL", value: "1" }, async () => {
    const sourceUrl = "https://vercel-mode.example.com/";
    const fetchImpl = mockFetchFromTable({
      [sourceUrl]: {
        status: 200,
        headers: { "content-type": "text/html" },
        body: "<!doctype html><html><body><h1>vercel mode</h1></body></html>",
      },
    });

    const simulation = await runUrlImportOperatorFlow(
      { sourceUrl, executionMode: "simulation" },
      {
        fetchImpl,
      },
    );
    assert.equal(simulation.ok, true);
    if (!simulation.ok) return;

    const expectedTmpPrefix = path.resolve(os.tmpdir(), "gnr8", "validation", "url-import-snapshots");
    assert.ok(simulation.snapshot.snapshotRootDirAbs.startsWith(expectedTmpPrefix));

    const materialize = await runUrlImportOperatorFlow(
      { sourceUrl, executionMode: "materialize" },
      {
        fetchImpl,
      },
    );
    assert.equal(materialize.ok, true);
    if (!materialize.ok) return;

    assert.ok(materialize.snapshot.snapshotRootDirAbs.startsWith(expectedTmpPrefix));
    assert.ok(
      materialize.result.executionResult.status === "executed" ||
        materialize.result.executionResult.status === "executed_with_warnings",
    );
  });
});
