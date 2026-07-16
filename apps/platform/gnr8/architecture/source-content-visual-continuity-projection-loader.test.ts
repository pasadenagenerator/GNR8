import assert from "node:assert/strict";
import test from "node:test";

import type { RawImportedSiteArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import { loadSourceContentVisualContinuityProjection } from "./source-content-visual-continuity-projection-loader";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";

function rawImportedSiteArtifact(): RawImportedSiteArtifact {
  return {
    id: "raw-import-continuity",
    artifactType: "raw_imported_site",
    siteId: "source-site-continuity",
    siteVersionId: SITE_VERSION_ID,
    entryHtmlPath: "index.html",
    assetBasePath: "assets",
    createdAt: "2026-07-16T00:00:00.000Z",
    metadata: {
      sourceUrl: "https://source.example/",
      finalUrl: "https://source.example/",
      htmlByteLength: 12000,
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: 2, externalFallbackAssetCount: 0 },
    },
    fileMap: {
      "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 12000, sha256: "html" },
      "uploads/logo.png": { path: "uploads/logo.png", mediaType: "image/png", sizeBytes: 2000, sha256: "logo" },
      "fonts/fontello.woff2": { path: "fonts/fontello.woff2", mediaType: "font/woff2", sizeBytes: 500, sha256: "fontello" },
    },
  };
}

function provenanceSummary(): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    sourceMode: "rendered_dom",
    captureMode: "rendered_browser",
    importFidelityStatus: "high_fidelity_import",
    renderedCaptureStatus: "available",
    renderedDomQuality: "strong",
    screenshotCount: 1,
    computedStyleSampleCount: 1,
    renderedCapture: {
      used: true,
      status: "available",
      quality: "strong",
      domLength: 100,
      nodeCount: 10,
      styleSampleCount: 1,
      styleCoverage: 1,
      screenshots: { viewport: true, fullPage: true },
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
        screenshot: "captured",
        styleSampling: "captured",
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: "index.html",
      responseHtmlPath: "index.html",
      entryHtmlPath: "index.html",
      renderedCaptureManifestPath: "capture.json",
      acquisitionEvidencePath: "acquisition.json",
      renderedDomPath: "rendered.html",
      computedStylesPath: "styles.json",
      renderedViewportScreenshotPath: "viewport.png",
      renderedFullpageScreenshotPath: "fullpage.png",
      screenshotPaths: ["fullpage.png"],
    },
    styleSignals: {
      kind: "style_signal_model_v2",
      version: "2.0.0",
      sourceMode: "computed_style",
      provenance: { sourceMode: "computed_style", computedStyle: { used: true, sampleCount: 1, coverage: 1 }, fallbackUsed: false, diagnostics: [] },
      colors: { backgroundTone: "light", primaryAccent: "#111111", secondaryAccent: null, neutralPalette: [], ctaColorHint: null },
      typography: { headingFontFamily: null, bodyFontFamily: null, headingCategory: "unknown", bodyCategory: "unknown", scaleHint: "unknown", weightContrastHint: "unknown" },
      spacing: { rhythm: "unknown", sectionSpacingHint: "unknown", layoutDensity: "unknown" },
      surfaces: { radiusHint: "unknown", shadowHint: "unknown" },
      cta: { prominence: "unknown", styleHint: "unknown" },
      visualToneHint: "unknown",
      diagnostics: [],
    },
    semanticImport: {
      sourceMode: "raw_html_only",
      captureMode: "rendered_browser",
      title: "Source Example",
      language: "en",
      navigation: [{ label: "Contact", href: "/contact" }],
      hero: { title: "Source Example", subtitle: "Original message", cta: { label: "Contact us", url: "/contact" }, image: { src: "uploads/logo.png", alt: "Logo" }, confidence: 0.8, diagnostics: [] },
      sections: [{ id: "hero", type: "hero", title: "Source Example", intro: "Original message", items: [], images: [{ src: "uploads/logo.png", alt: "Logo", role: "logo" }], ctas: [{ label: "Contact us", url: "/contact" }], forms: [], confidence: 0.8, diagnostics: [] }],
      assets: {
        images: [{ src: "uploads/logo.png", alt: "Logo", role: "logo", sectionId: "hero" }],
        groupedByRole: { logo: ["uploads/logo.png"], hero_image: [], gallery_image: [], service_image: [], testimonial_avatar: [], content_image: [], icon: [], unknown: [] },
        knownAssets: [],
      },
      diagnostics: [],
    },
  } as RuntimeImportProvenanceSummary;
}

test("loader composes VCU projection from existing WU/import loaders without persistence", async () => {
  let getSiteVersionCalls = 0;
  let getRawImportedSiteArtifactCalls = 0;
  const result = await loadSourceContentVisualContinuityProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      generatedAt: "2026-07-16T00:00:00.000Z",
      getSiteVersion: async () => {
        getSiteVersionCalls += 1;
        return {
          id: SITE_VERSION_ID,
          siteId: "source-site-continuity",
          createdAt: "2026-07-16T00:00:00.000Z",
          importProvenanceSummary: provenanceSummary(),
        };
      },
      getRawImportedSiteArtifact: async () => {
        getRawImportedSiteArtifactCalls += 1;
        return rawImportedSiteArtifact();
      },
    },
  });

  assert.equal(getSiteVersionCalls, 2);
  assert.equal(getRawImportedSiteArtifactCalls, 1);
  assert.notEqual(result.projection, null);
  assert.equal(result.projection?.sourceSiteId, "source-site-continuity");
  assert.equal(result.projection?.sourceScreenshots.length, 2);
  assert.equal(result.projection?.sourceScreenshots.some((screenshot) => screenshot.screenshotId.includes("fullpage.png")), true);
  assert.equal(result.projection?.visualIdentitySignals.logoCandidates.length, 1);
  assert.equal(result.validation.errors.length, 0);
});

test("loader blocks cleanly when WU composition cannot load the site version", async () => {
  const result = await loadSourceContentVisualContinuityProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      getSiteVersion: async () => null,
      getRawImportedSiteArtifact: async () => rawImportedSiteArtifact(),
    },
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.projection, null);
  assert.equal(result.validation.valid, false);
  assert.equal(result.diagnostics.some((item) => item.code === "SITE_VERSION_MISSING"), true);
});
