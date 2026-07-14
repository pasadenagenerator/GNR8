import assert from "node:assert/strict";
import test from "node:test";

import type { RawImportedSiteArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import { loadSourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-loader";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";

function rawImportedSiteArtifact(): RawImportedSiteArtifact {
  return {
    id: "raw-import-loader",
    artifactType: "raw_imported_site",
    siteId: "source-site",
    siteVersionId: SITE_VERSION_ID,
    entryHtmlPath: "index.html",
    assetBasePath: "assets",
    createdAt: "2026-07-14T00:00:00.000Z",
    metadata: {
      sourceUrl: "https://source.example/",
      finalUrl: "https://source.example/",
      htmlByteLength: 12000,
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
    },
    fileMap: {
      "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 12000, sha256: "html" },
      "assets/logo.png": { path: "assets/logo.png", mediaType: "image/png", sizeBytes: 2000, sha256: "logo" },
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
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    semanticImport: {
      sourceMode: "raw_html_only",
      captureMode: "rendered_browser",
      title: "Source Example",
      language: "en",
      navigation: [{ label: "Contact", href: "/contact" }],
      hero: null,
      sections: [],
      assets: {
        images: [{ src: "assets/logo.png", alt: "Logo", role: "logo", sectionId: null }],
        groupedByRole: { logo: ["assets/logo.png"], hero_image: [], gallery_image: [], service_image: [], testimonial_avatar: [], content_image: [], icon: [], unknown: [] },
        knownAssets: [],
      },
      diagnostics: [],
    },
  } as RuntimeImportProvenanceSummary;
}

test("loader composes existing site version and raw import data without persistence", async () => {
  let getSiteVersionCalls = 0;
  let getRawImportedSiteArtifactCalls = 0;
  const result = await loadSourceWebsiteUnderstandingProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      generatedAt: "2026-07-14T00:00:00.000Z",
      getSiteVersion: async () => {
        getSiteVersionCalls += 1;
        return {
          id: SITE_VERSION_ID,
          siteId: "source-site",
          createdAt: "2026-07-14T00:00:00.000Z",
          importProvenanceSummary: provenanceSummary(),
        };
      },
      getRawImportedSiteArtifact: async () => {
        getRawImportedSiteArtifactCalls += 1;
        return rawImportedSiteArtifact();
      },
    },
  });

  assert.equal(getSiteVersionCalls, 1);
  assert.equal(getRawImportedSiteArtifactCalls, 1);
  assert.notEqual(result.projection, null);
  assert.equal(result.projection?.sourceSiteId, "source-site");
  assert.equal(result.projection?.sourceIdentity.sourceSiteId, "source-site");
  assert.equal(result.projection?.sourceIdentity.sourceUrl, "https://source.example/");
  assert.equal(result.projection?.visualIdentitySignals.logoCandidates.length, 1);
  assert.deepEqual(result.validation.errors, []);
});

test("loader blocks when the site version is missing", async () => {
  const result = await loadSourceWebsiteUnderstandingProjection({
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
