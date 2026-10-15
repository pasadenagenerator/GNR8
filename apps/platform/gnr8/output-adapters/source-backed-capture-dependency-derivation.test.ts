import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { computeLocalPathCandidate } from "@/gnr8/validation/runtime/url-single-page-import";

import {
  deriveDependencySuccessorSiteVersionId,
  planStylesheetDependencies,
  planRetainedStylesheetImports,
  refreshDerivedHtmlProvenance,
  resolveRetainedCssDependencyPath,
} from "./source-backed-capture-dependency-derivation";
import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

const EXTERNAL_LIBS = "https://site-assets.cdnmns.com/a2e388a232383bbdcb49c06780087e3f/css/external-libs.css?1791454204350";
const GRIDS = "https://site-assets.cdnmns.com/a2e388a232383bbdcb49c06780087e3f/css/grids.css?1791454204350";
const GOOGLE = "https://fonts.googleapis.com/css?family=IBM+Plex+Sans:400,700&display=swap&subset=latin-ext";
const EXTRA_CDN = "https://fonts.prod.extra-cdn.com/css?family=Roboto+Condensed:300,700|Roboto:400&display=swap";

test("immutable dependency completion uses a stable successor identity", () => {
  const parent = "8701e904-75f3-44d4-a669-e660f9792693";
  const successor = deriveDependencySuccessorSiteVersionId(parent);
  assert.equal(successor, deriveDependencySuccessorSiteVersionId(parent));
  assert.notEqual(successor, parent);
  assert.match(successor, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("derived capture planner reuses exact deterministic CSS paths and fetches only missing dependencies", () => {
  const externalPath = computeLocalPathCandidate({ resolvedUrl: EXTERNAL_LIBS, assetKind: "stylesheet" });
  assert.equal(externalPath, "assets/stylesheet/f625c4a163d0-external-libs.css");
  const html = [
    "<!doctype html><html><head>",
    `<link rel="stylesheet" href="${EXTERNAL_LIBS}">`,
    `<link rel="stylesheet" href="${GRIDS}">`,
    `<link rel="stylesheet" href="${GOOGLE.replaceAll("&", "&amp;")}">`,
    '<link rel="stylesheet" href="https://site-assets.cdnmns.com/site/css/hcaptcha.css">',
    '<link rel="stylesheet" href="/assets/style_asset/icons.woff2">',
    "</head><body></body></html>",
  ].join("");
  const bytes = Buffer.from(html, "utf8");
  const plan = planStylesheetDependencies({
    htmlFiles: [{
      path: "index.html",
      mediaType: "text/html",
      sizeBytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes,
    }],
    filePaths: new Set([externalPath, "assets/style_asset/icons.woff2"]),
    removeFormCaptcha: true,
  });

  assert.deepEqual(plan.rewrites, [{ from: EXTERNAL_LIBS, to: `/${externalPath}`, reused: true }]);
  assert.deepEqual(plan.missingUrls, [GOOGLE, GRIDS].sort());
});

test("derived capture plans extensionless external CSS imports as authenticated stylesheet dependencies", () => {
  const sourcePath = computeLocalPathCandidate({ resolvedUrl: EXTERNAL_LIBS, assetKind: "stylesheet" });
  const importedPath = computeLocalPathCandidate({ resolvedUrl: EXTRA_CDN, assetKind: "stylesheet" });
  const sourceBytes = Buffer.from(`@import url('${EXTRA_CDN}'); .hero{display:block}`, "utf8");
  const file = {
    path: sourcePath,
    mediaType: "text/css",
    sizeBytes: sourceBytes.byteLength,
    sha256: createHash("sha256").update(sourceBytes).digest("hex"),
    bytes: sourceBytes,
  };

  assert.deepEqual(planRetainedStylesheetImports({
    files: [file],
    stylesheetRewrites: [{ from: EXTERNAL_LIBS, to: `/${sourcePath}`, reused: true }],
    filePaths: new Set([sourcePath]),
  }), { missingUrls: [EXTRA_CDN], reusedUrls: [] });

  assert.deepEqual(planRetainedStylesheetImports({
    files: [file],
    stylesheetRewrites: [{ from: EXTERNAL_LIBS, to: `/${sourcePath}`, reused: true }],
    filePaths: new Set([sourcePath, importedPath]),
  }), { missingUrls: [], reusedUrls: [EXTRA_CDN] });
});

test("derived capture plans absolute imports from owned CSS without requiring a source URL mapping", () => {
  const sourceBytes = Buffer.from(`@import url('${EXTRA_CDN}'); .hero{display:block}`, "utf8");
  const ownedPath = "assets/stylesheet/0025bae6c842-user-style.css";
  assert.deepEqual(planRetainedStylesheetImports({
    files: [{
      path: ownedPath,
      mediaType: "text/css; charset=utf-8",
      sizeBytes: sourceBytes.byteLength,
      sha256: createHash("sha256").update(sourceBytes).digest("hex"),
      bytes: sourceBytes,
    }],
    stylesheetRewrites: [],
    filePaths: new Set([ownedPath]),
  }), { missingUrls: [EXTRA_CDN], reusedUrls: [] });
});

test("derived-from-derived capture can plan nested imports from inherited immutable rewrites", () => {
  const sourcePath = computeLocalPathCandidate({ resolvedUrl: EXTERNAL_LIBS, assetKind: "stylesheet" });
  const sourceBytes = Buffer.from(`@import '${EXTRA_CDN}';`, "utf8");
  const inheritedRewrite = { from: EXTERNAL_LIBS, to: `/${sourcePath}`, reused: true };

  assert.deepEqual(planRetainedStylesheetImports({
    files: [{
      path: sourcePath,
      mediaType: "text/css",
      sizeBytes: sourceBytes.byteLength,
      sha256: createHash("sha256").update(sourceBytes).digest("hex"),
      bytes: sourceBytes,
    }],
    stylesheetRewrites: [inheritedRewrite],
    filePaths: new Set([sourcePath]),
  }).missingUrls, [EXTRA_CDN]);
});

test("retained CSS dependencies resolve from the immutable stylesheet path before remote fallback", () => {
  const paths = new Set([
    "assets/stylesheet/f625c4a163d0-external-libs.css",
    "assets/style_asset/85344934d15f-fa-solid-900.woff2",
  ]);
  assert.equal(resolveRetainedCssDependencyPath({
    stylesheetPath: "assets/stylesheet/f625c4a163d0-external-libs.css",
    rawReference: "../style_asset/85344934d15f-fa-solid-900.woff2?#iefix",
    filePaths: paths,
  }), "assets/style_asset/85344934d15f-fa-solid-900.woff2");
  assert.equal(resolveRetainedCssDependencyPath({
    stylesheetPath: "assets/stylesheet/f625c4a163d0-external-libs.css",
    rawReference: "../../outside.png",
    filePaths: paths,
  }), null);
});

test("derived capture refreshes rewritten route hashes and invalidates only current validation binding", () => {
  const provenance = {
    kind: "runtime_import_provenance_summary_v1",
    sourceMode: "rendered_dom",
    importFidelityStatus: "high_fidelity_import",
    renderedCaptureStatus: "available",
    renderedDomQuality: "strong",
    screenshotCount: 0,
    computedStyleSampleCount: 0,
    renderedCapture: {
      used: true,
      status: "available",
      quality: "strong",
      domLength: 1,
      nodeCount: 1,
      styleSampleCount: 0,
      styleCoverage: 0,
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
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: null,
      responseHtmlPath: null,
      entryHtmlPath: null,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    captureJob: null,
    workerHealth: null,
    styleSignals: null,
    currentRawPreviewValidationEvidence: { artifactId: "parent" },
    currentMultiPagePreviewValidation: { status: "passed" },
    historicalValidation: { artifactId: "parent" },
    multiPageDiscovery: {
      summary: { enabled: true, discoveredPageCount: 1, skippedLinkCount: 0, routeCandidateCount: 1, manifestRef: null, diagnostics: [] },
      manifest: null,
      rawArtifactAssembly: {
        kind: "multi_page_raw_artifact_assembly_manifest_v1",
        enabled: true,
        seedUrl: "https://www.chs.si/",
        normalizedSeedUrl: "https://www.chs.si/",
        assembledPageCount: 1,
        excludedPageCount: 0,
        failedPageCount: 0,
        routeMap: [{ routePath: "/", sourceUrl: "https://www.chs.si/", finalUrl: "https://www.chs.si/", rawFilePath: "index.html", bodySha256: "before", byteSize: 10, status: "assembled" }],
        htmlPathMap: { "/": "index.html" },
        excludedPages: [],
        failedPages: [],
        manifestPath: null,
        diagnostics: [],
        generatedAt: "2026-10-15T00:00:00.000Z",
      },
    },
  } as unknown as RuntimeImportProvenanceSummary & Record<string, unknown>;

  refreshDerivedHtmlProvenance(provenance, [{ path: "index.html", afterSha256: "after", byteSize: 42 }]);

  assert.equal(provenance.multiPageDiscovery?.rawArtifactAssembly?.routeMap[0]?.bodySha256, "after");
  assert.equal(provenance.multiPageDiscovery?.rawArtifactAssembly?.routeMap[0]?.byteSize, 42);
  assert.equal(provenance.currentRawPreviewValidationEvidence, null);
  assert.equal(provenance.currentMultiPagePreviewValidation, null);
  assert.deepEqual(provenance.historicalValidation, { artifactId: "parent" });
});
