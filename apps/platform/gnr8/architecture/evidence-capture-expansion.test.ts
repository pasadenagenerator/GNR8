import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRenderedHtmlHash,
  extractLoadedFontInventory,
  extractWidgetInventory,
  normalizeCapturedRouteIdentity,
} from "./evidence-capture-expansion";
import { buildEvidenceCaptureBaselineArtifact } from "./evidence-capture-baseline-artifact";
import { buildEvidenceCaptureBaselineGeometrySummary } from "../site/evidence-capture-baseline-read-model";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";

function provenance(): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    executionIdentity: {
      snapshotId: "snapshot-1",
      snapshotRunId: "run-1",
      snapshotStableRootDirAbs: "/tmp/stable",
      snapshotRunRootDirAbs: "/tmp/run",
      requestId: "request-1",
    },
    captureMode: "rendered_dom",
    sourceMode: "rendered_dom",
    importFidelityStatus: "degraded_import",
    renderedCaptureStatus: "available",
    renderedDomQuality: "strong",
    screenshotCount: 0,
    computedStyleSampleCount: 1,
    renderedCapture: {
      used: true,
      status: "available",
      quality: "strong",
      domLength: 100,
      nodeCount: 10,
      styleSampleCount: 1,
      styleCoverage: 0.1,
      screenshots: { viewport: false, fullPage: false },
      execution: {
        runtimeKind: "nodejs",
        environmentSupported: true,
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: "supported",
        failureCategory: "none",
        failureCode: null,
        browserLaunch: "succeeded",
        navigation: "succeeded",
        dom: "captured",
        screenshot: "none",
        styleSampling: "captured",
      },
    },
    importDiagnosticCodes: ["RENDERED_CAPTURE_USED"],
    captureEvidence: {
      selectedSourceHtmlPath: "/tmp/run/rendered/dom.html",
      responseHtmlPath: "/tmp/run/response.html",
      entryHtmlPath: "/tmp/run/index.html",
      renderedCaptureManifestPath: "/tmp/run/rendered-capture.json",
      acquisitionEvidencePath: "/tmp/run/acquisition-evidence.json",
      renderedDomPath: "/tmp/run/rendered/dom.html",
      computedStylesPath: "/tmp/run/rendered/computed-styles.json",
      layoutGeometryPath: "/tmp/run/rendered/layout-geometry.json",
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    captureJob: null,
    workerHealth: null,
    styleSignals: null,
    semanticImport: null,
    multipageImport: null,
    multiPageDiscovery: null,
    siteTree: null,
    templateFamilies: null,
  } as RuntimeImportProvenanceSummary;
}

test("CASE 1 Route normalization deterministic", () => {
  const input = {
    sourceUrl: "https://www.example.com/About/?utm=1#top",
    finalUrl: "https://example.com/About/",
    routePath: "/About/",
  };

  assert.deepEqual(normalizeCapturedRouteIdentity(input), normalizeCapturedRouteIdentity(input));
});

test("CASE 2 Equivalent URLs normalize identically", () => {
  const left = normalizeCapturedRouteIdentity({
    sourceUrl: "http://www.example.com/about/index.html?utm=1#hero",
    routePath: "/about/index.html",
  });
  const right = normalizeCapturedRouteIdentity({
    sourceUrl: "https://example.com/about/",
    routePath: "/about/",
  });

  assert.equal(left.routeIdentity, right.routeIdentity);
  assert.equal(left.routePath, right.routePath);
});

test("CASE 3 Rendered HTML hash stable", () => {
  const html = "<main><h1>Hello</h1></main>";

  assert.equal(buildRenderedHtmlHash(html), buildRenderedHtmlHash(html));
});

test("CASE 4 Whitespace normalization", () => {
  assert.equal(
    buildRenderedHtmlHash("<main><h1>Hello</h1><p>World</p></main>"),
    buildRenderedHtmlHash("<main>\n  <h1>Hello</h1>\n  <p>World</p>\n</main>"),
  );
});

test("CASE 5 Google Fonts inventory", () => {
  const fonts = extractLoadedFontInventory({
    renderedHtml: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">',
  });

  assert.deepEqual(fonts.map((font) => font.providerClassification), ["google_fonts"]);
  assert.equal(fonts[0]?.family, "Inter");
});

test("CASE 6 Local font inventory", () => {
  const fonts = extractLoadedFontInventory({
    renderedHtml: "<style>@font-face{font-family:'Brand Sans';src:url('/fonts/brand.woff2') format('woff2');}</style>",
  });

  assert.equal(fonts[0]?.family, "Brand Sans");
  assert.equal(fonts[0]?.providerClassification, "local");
});

test("CASE 7 Map widget detection", () => {
  const widgets = extractWidgetInventory({
    renderedHtml: '<iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>',
  });

  assert.equal(widgets[0]?.type, "map");
  assert.equal(widgets[0]?.classification, "google_maps");
});

test("CASE 8 Gallery widget detection", () => {
  const widgets = extractWidgetInventory({
    renderedHtml: '<section class="photo-gallery swiper"><img src="/one.jpg"></section>',
  });

  assert.equal(widgets.some((widget) => widget.type === "gallery" && widget.classification === "gallery"), true);
});

test("CASE 9 Form widget detection", () => {
  const widgets = extractWidgetInventory({
    renderedHtml: '<form action="/contact" method="post"><input name="email"></form>',
  });

  assert.equal(widgets[0]?.type, "form");
  assert.equal(widgets[0]?.classification, "native_form");
});

test("CASE 10 Accessibility overlay detection", () => {
  const widgets = extractWidgetInventory({
    renderedHtml: '<script src="https://cdn.userway.org/widget.js"></script>',
  });

  assert.equal(widgets[0]?.type, "accessibility_overlay");
  assert.equal(widgets[0]?.classification, "accessibility_overlay");
});

test("CASE 11 Chat widget detection", () => {
  const widgets = extractWidgetInventory({
    renderedHtml: '<script src="https://embed.tawk.to/site/default"></script>',
  });

  assert.equal(widgets[0]?.type, "chat_widget");
  assert.equal(widgets[0]?.classification, "chat_widget");
});

test("CASE 12 Embedded video detection", () => {
  const widgets = extractWidgetInventory({
    renderedHtml: '<iframe src="https://www.youtube.com/embed/abc123"></iframe>',
  });

  assert.equal(widgets[0]?.type, "embedded_video");
  assert.equal(widgets[0]?.classification, "youtube");
});

test("CASE 13 Unknown widget classification", () => {
  const widgets = extractWidgetInventory({
    renderedHtml: '<script src="https://widgets.example.com/embed.js"></script>',
  });

  assert.equal(widgets[0]?.type, "unknown");
  assert.equal(widgets[0]?.classification, "unknown");
});

test("CASE 14 Deterministic enrichment", () => {
  const renderedHtml = [
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&display=swap">',
    '<main><form action="/contact"></form><iframe src="https://www.google.com/maps/embed?pb=abc"></iframe></main>',
  ].join("");
  const input = {
    sourceUrl: "https://www.example.com/contact/",
    finalUrl: "https://example.com/contact",
    routePath: "/contact/",
    renderedHtml,
    computedStyleSamples: [
      {
        styles: {
          fontFamily: "Inter, sans-serif",
        },
      },
    ],
    importProvenanceSummary: provenance(),
  };

  const left = buildEvidenceCaptureBaselineArtifact(input);
  const right = buildEvidenceCaptureBaselineArtifact(input);

  assert.deepEqual(left.evidence, right.evidence);
  assert.equal(left.routeIdentity, "example.com/contact");
  assert.equal(left.evidence.rendered.renderedHtmlHash, buildRenderedHtmlHash(renderedHtml));
  assert.equal(left.evidence.computedStyle.fontsDetected.some((font) => font.providerClassification === "google_fonts"), true);
  assert.equal(left.evidence.widgets.inventory.some((widget) => widget.type === "map"), true);
  assert.equal(left.evidence.widgets.forms.length, 1);
});

test("CASE 15 Layout geometry persists in baseline artifact and read model", () => {
  const artifact = buildEvidenceCaptureBaselineArtifact({
    sourceUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    routePath: "/",
    renderedHtml: "<main><h1>Hello</h1></main>",
    importProvenanceSummary: provenance(),
    layoutGeometryEvidence: [
      {
        routePath: "/source-route",
        viewportWidth: 1366,
        viewportHeight: 768,
        documentHeight: 1800,
        capturedAt: "2026-06-15T10:00:00.000Z",
        regions: [
          {
            regionId: "layout-region-main",
            tagName: "main",
            role: "main",
            selector: "body > main:nth-of-type(1)",
            boundingBox: { x: 0, y: 72, width: 1366, height: 600 },
            childCount: 1,
          },
          {
            regionId: "layout-region-link",
            tagName: "a",
            role: null,
            selector: "a",
            boundingBox: { x: 24, y: 100, width: 40, height: 20 },
            childCount: 0,
          },
        ],
      },
    ],
  });
  const geometry = artifact.captureExpansionEvidence.layoutGeometryEvidence[0]!;
  const summary = buildEvidenceCaptureBaselineGeometrySummary(artifact);

  assert.equal(artifact.persistedRefs.layoutGeometryRef?.uri, "/tmp/run/rendered/layout-geometry.json");
  assert.equal(geometry.routePath, "/");
  assert.deepEqual(geometry.regions.map((region) => region.tagName), ["main"]);
  assert.deepEqual(summary, {
    geometryCaptured: true,
    regionCount: 1,
    viewport: {
      width: 1366,
      height: 768,
    },
  });
  assert.equal(artifact.evidence.layout.aboveFoldRegions.length, 1);
});
