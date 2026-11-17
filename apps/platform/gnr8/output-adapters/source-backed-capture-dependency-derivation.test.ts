import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { captureAssetsForAdditionalHtmlPages, computeLocalPathCandidate } from "@/gnr8/validation/runtime/url-single-page-import";
import { hashedImportAssetPath } from "@/gnr8/validation/runtime/retained-css-dependency-path";

import {
  assertDerivedCaptureGitResumeLineage,
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
  restoreRetainedStylesheetReferences,
  existingCssDependencyManifest,
  planRetainedFallbackImages,
  trustedOriginsForStylesheets,
  rewriteRetainedFallbackImages,
} from "./source-backed-capture-dependency-derivation";
import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

const EXTERNAL_LIBS = "https://site-assets.cdnmns.com/a2e388a232383bbdcb49c06780087e3f/css/external-libs.css?1791454204350";
const GRIDS = "https://site-assets.cdnmns.com/a2e388a232383bbdcb49c06780087e3f/css/grids.css?1791454204350";
const GOOGLE = "https://fonts.googleapis.com/css?family=IBM+Plex+Sans:400,700&display=swap&subset=latin-ext";
const EXTRA_CDN = "https://fonts.prod.extra-cdn.com/css?family=Roboto+Condensed:300,700|Roboto:400&display=swap";

test('derived capture cannot resume a byte-backed record from a Git-backed parent',()=>{
  const version='44444444-4444-4444-8444-444444444444';
  const scope={agencyId:'11111111-1111-4111-8111-111111111111',
    clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'};
  const parent={metadata:{gitArchive:{scope,commit:'a'.repeat(40)}}} as never;
  const rawWithoutGit={metadata:{}} as never;
  const rawWithGit={metadata:{gitArchive:{scope,commit:'b'.repeat(40),
    manifestPath:`raw-import/${version}/.gnr8-import-manifest.json`}}} as never;
  const artifactWithoutGit={manifest:{}} as never;
  const artifactWithGit={manifest:{generatedGitArchive:{scope,commit:'c'.repeat(40),
    manifestPath:`generated/${version}/.gnr8-generated-manifest.json`}}} as never;
  assert.throws(()=>assertDerivedCaptureGitResumeLineage({parentRawArtifact:parent,derivedSiteVersionId:version,
    resumableRawArtifact:rawWithoutGit,resumableArtifact:null}),/astro_derived_capture_raw_git_lineage_missing/);
  assert.throws(()=>assertDerivedCaptureGitResumeLineage({parentRawArtifact:parent,derivedSiteVersionId:version,
    resumableRawArtifact:rawWithGit,resumableArtifact:artifactWithoutGit}),/astro_derived_capture_generated_git_lineage_missing/);
  assert.throws(()=>assertDerivedCaptureGitResumeLineage({parentRawArtifact:parent,derivedSiteVersionId:version,
    resumableRawArtifact:{metadata:{gitArchive:{scope:{...scope,siteId:'other'},commit:'b'.repeat(40),
      manifestPath:`raw-import/${version}/.gnr8-import-manifest.json`}}} as never,
    resumableArtifact:artifactWithGit}),/astro_derived_capture_raw_git_lineage_mismatch/);
  assert.throws(()=>assertDerivedCaptureGitResumeLineage({parentRawArtifact:parent,derivedSiteVersionId:version,
    resumableRawArtifact:rawWithGit,
    resumableArtifact:{manifest:{generatedGitArchive:{scope,manifestPath:'generated/other/.gnr8-generated-manifest.json'}}} as never,
  }),/astro_derived_capture_generated_git_lineage_mismatch/);
  assert.doesNotThrow(()=>assertDerivedCaptureGitResumeLineage({parentRawArtifact:parent,derivedSiteVersionId:version,
    resumableRawArtifact:rawWithGit,resumableArtifact:artifactWithGit}));
  assert.doesNotThrow(()=>assertDerivedCaptureGitResumeLineage({parentRawArtifact:{metadata:{}} as never,
    derivedSiteVersionId:version,resumableRawArtifact:rawWithoutGit,resumableArtifact:artifactWithoutGit}));
});

test("restored capture aliases survive acquisition and persisted readback without asset fetches", async () => {
  const sourceUrl = "https://example.test/cache/bundle/style.css";
  const cssPath = "assets/stylesheet/123456789abc-style.css";
  const imagePath = "assets/style_asset/abcdef123456-pixel.png";
  const mistakenUrl = "https://example.test/cache/style_asset/abcdef123456-pixel.png";
  const alias = hashedImportAssetPath(mistakenUrl, "style_asset", "abcdef123456-pixel.png");
  const row = (path: string, bytes: Buffer, mediaType: string) => ({
    path, bytes, mediaType, sizeBytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  const files = [
    row(cssPath, Buffer.from(`.one{background:url(/${alias})}.two{background:url(/cache/style_asset/abcdef123456-pixel.png)}`), "text/css"),
    row(imagePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64"), "image/png"),
    row("url-fetch-manifest.json", Buffer.from(JSON.stringify([
      { assetKind: "stylesheet", fetchStatus: "fetched", localPath: cssPath, resolvedUrl: sourceUrl },
    ])), "application/json"),
  ];
  const originalHash = files[0]!.sha256;
  const restored = restoreRetainedStylesheetReferences(files);
  assert.equal(restored.changed, true);
  assert.equal(files[0]!.sha256, originalHash, "original immutable rows are untouched");
  assert.deepEqual(planReachableRetainedStaticDependencies({
    files: restored.files, stylesheetRewrites: restored.rewrites,
    filePaths: new Set(files.map((file) => file.path)), rootStylesheetPaths: [cssPath],
  }).missingUrls, []);
  const workspace = await mkdtemp(join(tmpdir(), "gnr8-restored-css-test-"));
  try {
    for (const file of restored.files) {
      await mkdir(dirname(join(workspace, file.path)), { recursive: true });
      await writeFile(join(workspace, file.path), file.bytes);
    }
    const captured = await captureAssetsForAdditionalHtmlPages({
      pages: [{ pageUrl: "https://example.test/", bodyPath: join(workspace, "probe.html"), html: `<link rel="stylesheet" href="${sourceUrl}">` }],
      snapshotRootDirAbs: workspace,
      existingFetchManifest: [{
        tag: "link", attribute: "href", occurrence: 0, rawRef: sourceUrl, resolvedUrl: sourceUrl,
        localPath: cssPath, assetKind: "stylesheet", fetchStatus: "fetched", httpStatus: 200,
        contentType: "text/css", byteLength: restored.files[0]!.sizeBytes,
      }, ...existingCssDependencyManifest({
        parentFiles: restored.files, stylesheetRewrites: restored.rewrites,
        filePaths: new Set(files.map((file) => file.path)), startingOccurrence: 1,
      })],
      fetchImpl: async () => { assert.fail("owned dependency must not be fetched"); },
    });
    assert.equal(captured.summary.failedRequiredAssetCount, 0);
    const reread = await Promise.all(restored.files.map(async (file) => row(file.path, await readFile(join(workspace, file.path)), file.mediaType)));
    assert.deepEqual(findUnresolvedRetainedStylesheetDependencies({ files: reread, rootStylesheetPaths: [cssPath] }), []);
    assert.equal(restoreRetainedStylesheetReferences(reread).changed, false);
  } finally { await rm(workspace, { recursive: true, force: true }); }
  const tampered = files.map((file) => file.path === "url-fetch-manifest.json" ? { ...file, sha256: "wrong" } : file);
  assert.equal(restoreRetainedStylesheetReferences(tampered).changed, false);
});

test("stylesheet planning ignores commented links and includes protocol-relative font CSS", () => {
  const bytes = Buffer.from('<!-- <link rel="stylesheet" href="https://old.test/missing.css"> --><link rel="stylesheet" href="//fonts.test/styles"><a href="/assets/not-a-stylesheet.css">x</a>');
  const htmlFiles = [{ path: "index.html", bytes, mediaType: "text/html", sizeBytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }];
  assert.deepEqual(planStylesheetDependencies({ htmlFiles, filePaths: new Set(), removeFormCaptcha: false, sourceUrl: "https://example.test/" }).missingUrls, ["https://fonts.test/styles"]);
});

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


test("paired noscript images use the existing bounded acquisition and retained rewrite, without crawling links",async()=>{
 const imageUrl='https://example.test/uploads/figure..png';
 const html='<html><body><img src="data:image/png;base64,AA=="><noscript data-lazyload-src="/uploads/figure..png"><img src="/uploads/figure..png" alt="Diagram"></noscript><a href="https://other.test/product">Product</a></body></html>';
 const bytes=Buffer.from(html), file={path:'pages/help/index.html',bytes,mediaType:'text/html',sizeBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 const input={htmlFiles:[file],filePaths:new Set<string>(),sourceUrl:'https://example.test/',pageUrls:new Map([[file.path,'https://example.test/help']])};
 const plan=planRetainedFallbackImages(input);
 assert.deepEqual(plan,[{htmlPath:file.path,reference:'/uploads/figure..png',sourceUrl:imageUrl}]);
 assert.deepEqual(planRetainedFallbackImages({...input,sourceMediaLinks:[imageUrl]}),[]);
 assert.deepEqual(planRetainedFallbackImages({...input,sourceMediaLinks:[imageUrl+'?different=1']}),plan);
 assert.deepEqual(planRetainedFallbackImages({...input,filePaths:new Set(['uploads/figure..png'])}),[]);
 assert.deepEqual(planRetainedFallbackImages({...input,htmlFiles:[{...file,bytes:Buffer.from(html.replaceAll('/uploads/figure..png','https://other.test/figure.png'))}]}),[]);
 const workspace=await mkdtemp(join(tmpdir(),'gnr8-fallback-image-'));
 try {
  const requests:string[]=[];
  const captured=await captureAssetsForAdditionalHtmlPages({pages:[{pageUrl:input.sourceUrl,bodyPath:join(workspace,'probe.html'),html:`<img src="${plan[0]!.sourceUrl}">`}],snapshotRootDirAbs:workspace,existingFetchManifest:[],fetchImpl:async url=>{
   requests.push(String(url));
   assert.equal(String(url),imageUrl);
   return new Response(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64'),{headers:{'content-type':'image/png'}});
  }});
  assert.equal(captured.summary.failedRequiredAssetCount,0); assert.deepEqual(requests,[imageUrl]);
  const entry=captured.manifestEntries.find(entry=>entry.fetchStatus==='fetched')!;
  const rewritten=rewriteRetainedFallbackImages(html,[{...plan[0]!,to:`/${entry.localPath}`}]);
  assert.match(rewritten,/alt="Diagram"/);assert.match(rewritten,/https:\/\/other.test\/product/);
  assert.ok(rewritten.includes(`src="/${entry.localPath}"`));
  assert.ok((await readFile(join(workspace,entry.localPath!))).length > 0);
  assert.deepEqual(planRetainedFallbackImages({...input,htmlFiles:[{...file,bytes:Buffer.from(rewritten)}],filePaths:new Set([entry.localPath!])}),[]);
 } finally {await rm(workspace,{recursive:true,force:true});}
});

test('recognized font stylesheet permits only its exact font-file origin',()=>{
 assert.ok(trustedOriginsForStylesheets(['https://fonts.prod.extra-cdn.com/css?family=Exo']).includes('https://font-files.prod.extra-cdn.com'));
 assert.ok(!trustedOriginsForStylesheets(['https://fonts.prod.extra-cdn.com.attacker.test/css']).includes('https://font-files.prod.extra-cdn.com'));
});

test('additional capture fetches only explicitly selected inert script dependencies',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gnr8-retained-script-'));
 const source='https://example.com/wp-content/cache/wpfc-minified/a/theme.js';
 const requested:string[]=[];
 const input={pages:[{pageUrl:'https://example.com/',bodyPath:join(root,'index.html'),html:`<!doctype html><html><head><script src="${source}"></script><script src="https://example.com/unselected.js"></script></head><body></body></html>`}],snapshotRootDirAbs:root,
 fetchImpl:async(url:unknown)=>{requested.push(String(url));return new Response('window.retainedNeverExecuted=true;',{status:200,headers:{'content-type':'application/javascript'}})}};
 try{
  await captureAssetsForAdditionalHtmlPages(input);assert.deepEqual(requested,[]);
  const result=await captureAssetsForAdditionalHtmlPages({...input,retainedScriptDependencyUrls:[source]});
  assert.deepEqual(requested,[source]);
  const entry=result.manifestEntries.find(entry=>entry.resolvedUrl===source)!;
  assert.equal(entry.fetchStatus,'fetched');assert.equal(entry.assetKind,'script');
  assert.equal(await readFile(join(root,entry.localPath!),'utf8'),'window.retainedNeverExecuted=true;');
 }finally{await rm(root,{recursive:true,force:true})}
});
