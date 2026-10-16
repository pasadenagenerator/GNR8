import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { computeLocalPathCandidate } from "@/gnr8/validation/runtime/url-single-page-import";

import {
  assertPersistedCaptureDependencyEvidence,
  deriveDependencySuccessorSiteVersionId,
  findUnresolvedRetainedStylesheetDependencies,
  planReachableRetainedStaticDependencies,
  planRetainedFontDependencies,
  planRetainedLocalStylesheetRoots,
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
    rawReference: "/assets/style_asset/85344934d15f-fa-solid-900.woff2?v=1#font",
    filePaths: paths,
  }), "assets/style_asset/85344934d15f-fa-solid-900.woff2");
  assert.equal(resolveRetainedCssDependencyPath({
    stylesheetPath: "assets/stylesheet/f625c4a163d0-external-libs.css",
    rawReference: "../../outside.png",
    filePaths: paths,
  }), null);
});

test("persisted owned font rewrites resolve repeatedly without source-network fallback", () => {
  const stylesheetPath = "assets/stylesheet/25b8024875fc-css.css";
  const fontPaths = Array.from({ length: 18 }, (_, index) => `assets/style_asset/${String(index).padStart(2, "0")}-font.ttf`);
  const sourceUrls = fontPaths.map((_, index) => `https://fonts.gstatic.com/s/chs/font-${index}.ttf`);
  const cssBytes = Buffer.from(fontPaths.map((path) => `@font-face{src:url('/${path}?v=1#font')}`).join(""), "utf8");
  const files = [
    {
      path: stylesheetPath,
      mediaType: "text/css; charset=utf-8",
      sizeBytes: cssBytes.byteLength,
      sha256: createHash("sha256").update(cssBytes).digest("hex"),
      bytes: cssBytes,
    },
    ...fontPaths.map((path, index) => {
      const bytes = Buffer.from([0, 1, 0, 0, index, 0, 0, 0, 0, 0, 0, 0]);
      return {
        path,
        mediaType: "font/ttf",
        sizeBytes: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes,
      };
    }),
  ];
  const rewrites = [
    { from: "https://fonts.googleapis.com/css?family=CHS", to: `/${stylesheetPath}`, reused: true },
    ...fontPaths.map((path, index) => ({ from: sourceUrls[index]!, to: `/${path}`, reused: true })),
  ];
  const input = {
    files,
    stylesheetRewrites: rewrites,
    filePaths: new Set(files.map((file) => file.path)),
    rootStylesheetPaths: [stylesheetPath],
  };

  const first = planReachableRetainedStaticDependencies(input);
  const retry = planReachableRetainedStaticDependencies(input);
  assert.deepEqual(first, retry);
  assert.deepEqual(first.missingUrls, []);
  assert.deepEqual(first.reusedUrls, sourceUrls.sort());
});

test("persisted capture evidence rejects wrong ownership, missing owned files, and traversal", () => {
  const bytes = Buffer.from("body{}", "utf8");
  const row = {
    path: "assets/stylesheet/site.css",
    mediaType: "text/css; charset=utf-8",
    sizeBytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes,
  };
  const artifact = {
    id: "raw-owned",
    siteId: "site-owned",
    siteVersionId: "version-owned",
    fileMap: {
      [row.path]: {
        path: row.path,
        mediaType: row.mediaType,
        sizeBytes: row.sizeBytes,
        sha256: row.sha256,
      },
    },
  };
  const base = {
    files: [row],
    artifact,
    expectedArtifactId: artifact.id,
    expectedSiteId: artifact.siteId,
    expectedSiteVersionId: artifact.siteVersionId,
  };

  assert.throws(() => assertPersistedCaptureDependencyEvidence({
    ...base,
    expectedArtifactId: "raw-other-owner",
    ownedRewrites: [],
  }), /astro_derived_capture_owned_dependency_wrong_owner/);
  assert.throws(() => assertPersistedCaptureDependencyEvidence({
    ...base,
    ownedRewrites: [{ from: "https://fonts.example/font.ttf", to: "/assets/style_asset/missing.ttf" }],
  }), /astro_derived_capture_owned_dependency_missing:assets\/style_asset\/missing\.ttf/);
  assert.throws(() => assertPersistedCaptureDependencyEvidence({
    ...base,
    ownedRewrites: [{ from: "https://fonts.example/font.ttf", to: "/../../outside.ttf" }],
  }), /astro_derived_capture_owned_dependency_path_invalid/);
  assert.throws(() => assertPersistedCaptureDependencyEvidence({
    ...base,
    files: [{ ...row, mediaType: "application/octet-stream" }],
    ownedRewrites: [],
  }), /astro_derived_capture_parent_file_mismatch:assets\/stylesheet\/site\.css/);
});

test("retained font planner resolves exact source URLs and reuses matching immutable bytes", () => {
  const stylesheetUrl = "https://fonts.prod.extra-cdn.com/css?family=Roboto";
  const missingFontUrl = "https://font-files.prod.extra-cdn.com/roboto/missing.ttf";
  const reusedFontUrl = "https://font-files.prod.extra-cdn.com/roboto/reused.ttf";
  const stylesheetPath = computeLocalPathCandidate({ resolvedUrl: stylesheetUrl, assetKind: "stylesheet" });
  const reusedPath = computeLocalPathCandidate({ resolvedUrl: reusedFontUrl, assetKind: "style_asset" });
  const cssBytes = Buffer.from([
    `@font-face{font-family:Roboto;src:url('${missingFontUrl}') format('truetype')}`,
    `@font-face{font-family:Roboto;src:url('${reusedFontUrl}') format('truetype')}`,
  ].join(""), "utf8");
  const files = [{
    path: stylesheetPath,
    mediaType: "text/css",
    sizeBytes: cssBytes.byteLength,
    sha256: createHash("sha256").update(cssBytes).digest("hex"),
    bytes: cssBytes,
  }];

  assert.deepEqual(planRetainedFontDependencies({
    files,
    stylesheetRewrites: [{ from: stylesheetUrl, to: `/${stylesheetPath}`, reused: true }],
    filePaths: new Set([stylesheetPath, reusedPath]),
  }), {
    missingUrls: [missingFontUrl],
    reusedUrls: [reusedFontUrl],
  });
});

test("dependency closure follows reachable imports and ignores unrelated retained CSS", () => {
  const rootCss = Buffer.from("@import './nested.css'; .hero{background:url('../images/hero.png')}", "utf8");
  const nestedCss = Buffer.from("@font-face{font-family:Roboto;src:url('../style_asset/font.ttf')}", "utf8");
  const unrelatedCss = Buffer.from(".unused{background:url('https://example.com/not-reachable.png')}", "utf8");
  const file = (path: string, mediaType: string, bytes: Buffer) => ({
    path,
    mediaType,
    sizeBytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes,
  });
  const files = [
    file("assets/stylesheet/root.css", "text/css", rootCss),
    file("assets/stylesheet/nested.css", "text/css", nestedCss),
    file("assets/stylesheet/unrelated.css", "text/css", unrelatedCss),
    file("assets/images/hero.png", "image/png", Buffer.from("png")),
    file("assets/style_asset/font.ttf", "font/ttf", Buffer.from([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
  ];

  assert.deepEqual(findUnresolvedRetainedStylesheetDependencies({
    files,
    rootStylesheetPaths: ["assets/stylesheet/root.css"],
  }), []);

  assert.deepEqual(findUnresolvedRetainedStylesheetDependencies({
    files: files.filter((entry) => entry.path !== "assets/style_asset/font.ttf"),
    rootStylesheetPaths: ["assets/stylesheet/root.css"],
  }), ["assets/stylesheet/nested.css->../style_asset/font.ttf"]);

  const unusedBytes = Buffer.from(".unused{background:url('../../site/css/images/missing.png')}", "utf8");
  assert.deepEqual(findUnresolvedRetainedStylesheetDependencies({
    files: [file("assets/stylesheet/unused.css", "text/css", unusedBytes)],
    rootStylesheetPaths: ["assets/stylesheet/unused.css"],
    knownUnusedDependencyUrls: ["https://cdn.example.test/site/css/images/missing.png"],
    stylesheetSourceUrlsByPath: {
      "assets/stylesheet/unused.css": "https://cdn.example.test/a/b/unused.css",
    },
  }), []);
});

test("retained local stylesheet roots preserve query identity and drive one reachable static graph", () => {
  const sourceUrl = "https://www.chs.si/";
  const userStyleUrl = "https://www.chs.si/assets/user-style.css?1791785941";
  const importedCssUrl = "https://fonts.prod.extra-cdn.com/css?family=Roboto";
  const mapImageUrl = "https://maps.gstatic.com/tactile/omnibox/reveal-entity-icons-20131112.png";
  const userStylePath = "assets/user-style.css";
  const importedCssPath = "assets/stylesheet/25b8024875fc-css.css";
  const htmlBytes = Buffer.from(`<script>l.href='/assets/user-style.css?1791785941'</script>`, "utf8");
  const userStyleBytes = Buffer.from(`@import url('${importedCssUrl}');.directions{background:url('//maps.gstatic.com/tactile/omnibox/reveal-entity-icons-20131112.png')}`, "utf8");
  const importedCssBytes = Buffer.from("@font-face{src:url('https://font-files.prod.extra-cdn.com/roboto.ttf')}", "utf8");
  const row = (path: string, mediaType: string, bytes: Buffer) => ({
    path,
    mediaType,
    sizeBytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes,
  });
  const files = [
    row("index.html", "text/html", htmlBytes),
    row(userStylePath, "text/css", userStyleBytes),
    row(importedCssPath, "text/css", importedCssBytes),
  ];
  const roots = planRetainedLocalStylesheetRoots({
    htmlFiles: [files[0]!],
    filePaths: new Set(files.map((entry) => entry.path)),
    sourceUrl,
  });
  assert.deepEqual(roots, [{ from: userStyleUrl, to: `/${userStylePath}`, reused: true }]);

  const graph = planReachableRetainedStaticDependencies({
    files,
    stylesheetRewrites: [
      ...roots,
      { from: importedCssUrl, to: `/${importedCssPath}`, reused: true },
    ],
    filePaths: new Set(files.map((entry) => entry.path)),
    rootStylesheetPaths: roots.map((entry) => entry.to.replace(/^\/+/, "")),
  });
  assert.deepEqual(graph.reachableStylesheetPaths, [importedCssPath, userStylePath].sort());
  assert.deepEqual(graph.missingUrls, [
    "https://font-files.prod.extra-cdn.com/roboto.ttf",
    mapImageUrl,
  ].sort());

  assert.deepEqual(planReachableRetainedStaticDependencies({
    files,
    stylesheetRewrites: [
      ...roots,
      { from: importedCssUrl, to: `/${importedCssPath}`, reused: true },
    ],
    filePaths: new Set(files.map((entry) => entry.path)),
    rootStylesheetPaths: roots.map((entry) => entry.to.replace(/^\/+/, "")),
    knownUnusedDependencyUrls: [mapImageUrl],
  }).missingUrls, ["https://font-files.prod.extra-cdn.com/roboto.ttf"]);
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
