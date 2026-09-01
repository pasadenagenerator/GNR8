import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import { GET, POST } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { setPreviewRouteDependenciesForTest } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-dependencies";

function extractInjectedGalleryRuntimeShim(html: string): string {
  const startToken = "<script>(function(){";
  const start = html.indexOf(startToken);
  assert.notEqual(start, -1, "expected injected gallery runtime shim script start token");
  const endToken = "</script>";
  const end = html.indexOf(endToken, start);
  assert.notEqual(end, -1, "expected injected gallery runtime shim script end token");
  return html.slice(start + "<script>".length, end);
}

function extractInjectedScriptContaining(html: string, marker: string): string {
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `expected marker ${marker}`);
  const scriptStart = html.lastIndexOf("<script>", markerIndex);
  assert.notEqual(scriptStart, -1, "expected script start before marker");
  const scriptEnd = html.indexOf("</script>", markerIndex);
  assert.notEqual(scriptEnd, -1, "expected script end after marker");
  return html.slice(scriptStart + "<script>".length, scriptEnd);
}

function extractParseSettingFunctionFromInjectedShim(injectedShim: string): (dataSettings: string, key: string) => number | null {
  const startToken = "function parseSetting(dataSettings,key){";
  const start = injectedShim.indexOf(startToken);
  assert.notEqual(start, -1, "expected parseSetting function in injected shim");
  const endToken = "}\nfunction isLikelyControlNode";
  const end = injectedShim.indexOf(endToken, start);
  assert.notEqual(end, -1, "expected parseSetting function end marker in injected shim");
  const functionSource = injectedShim.slice(start, end + 1);
  return new Function(`${functionSource}; return parseSetting;`)() as (dataSettings: string, key: string) => number | null;
}

function createNoopDbClient(onRelease: () => void = () => {}) {
  return {
    query: async () => ({ rows: [] }),
    release: onRelease,
  } as never;
}

function mockPreviewDeps(canShowContentDebug: boolean): () => void {
  return setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: "<!doctype html><html><body><h1>Preview Site</h1></body></html>",
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "runtime",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
        contentDebug: {
          siteVersionId: "sv_preview_1",
          rawTemplateArtifactFound: true,
          draftOverrideCount: 0,
          publishedOverrideCount: 0,
          mergedOverrideCount: 0,
          appliedCount: 0,
          skippedCount: 0,
          skippedDiagnostics: [],
          slotKeys: [],
        },
      }) as never,
    canShowContentDebug: async () => canShowContentDebug,
  });
}

test("preview route: __debug=content denied renders normal preview without debug panel", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?__debug=content"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Preview Site/);
    assert.doesNotMatch(html, /data-gnr8-runtime-debug="1"/);
  } finally {
    restoreDeps();
  }
});

test("preview route: unresolved agency scope renders an internal preview unavailable page", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => null,
    requireAgencyActionContext: async () => {
      throw new Error("requireAgencyActionContext should not be called");
    },
    renderSiteVersionPreview: async () => {
      throw new Error("renderSiteVersionPreview should not be called");
    },
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.match(html, /Internal Preview Unavailable/);
    assert.match(html, /Unable to resolve agency scope for this site version/);
    assert.doesNotMatch(html, /preview route available/i);
  } finally {
    restoreDeps();
  }
});

test("preview route: __debug=content granted renders debug panel", async () => {
  const restoreDeps = mockPreviewDeps(true);
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?__debug=content"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Preview Site/);
    assert.match(html, /data-gnr8-runtime-debug="1"/);
  } finally {
    restoreDeps();
  }
});

test("preview route: __debug=multipage_validation returns operator JSON payload", async () => {
  let releaseCount = 0;
  const restoreDeps = setPreviewRouteDependenciesForTest({
    acquireRuntimeDbClient: async () => createNoopDbClient(() => {
      releaseCount += 1;
    }),
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: "<!doctype html><html><body><h1>Preview Site</h1></body></html>",
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        path: "/about",
        source: "raw_template_site",
        previewMode: "raw_template_preview",
        previewRuntimeSummary: {
          rendererContractAvailable: false,
          finalSiteModelAvailable: false,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: false,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: ["MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS"],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 0,
        fallbackUsed: false,
        multiPagePreviewValidation: {
          status: "ready_with_warnings",
          summary: {
            discoveredRoutes: 2,
            fetchedPages: 2,
            assembledPages: 2,
            validPreviewRoutes: 2,
            missingPreviewRoutes: 1,
            rewrittenLinks: 3,
            skippedLinks: 1,
          },
          routes: [
            { routePath: "/", rawFilePath: "index.html", sourceUrl: null, status: "valid", diagnostics: [] },
            {
              routePath: "/missing",
              rawFilePath: "pages/missing/index.html",
              sourceUrl: "https://example.com/missing",
              status: "missing_file",
              diagnostics: ["MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE"],
            },
          ],
          links: [
            {
              status: "skipped_route_missing",
              count: 1,
              sampleMissingRoutes: ["/missing"],
              diagnostics: ["MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED"],
            },
          ],
          blockers: [],
          warnings: ["missing_link_routes:/missing"],
          diagnostics: ["MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS"],
        },
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=raw_template_preview&path=%2Fabout&__debug=multipage_validation"),
      { params: Promise.resolve({ siteVersionId: "sv_preview_1" }) },
    );
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(payload.multiPagePreviewValidation.status, "ready_with_warnings");
    assert.equal(payload.multiPagePreviewValidation.summary.missingPreviewRoutes, 1);
    assert.deepEqual(payload.multiPagePreviewValidation.links[0].sampleMissingRoutes, ["/missing"]);
    assert.equal(response.headers.get("x-gnr8-raw-db-client-acquisitions"), "1");
    assert.equal(response.headers.get("x-gnr8-raw-db-client-releases"), "1");
    assert.equal(response.headers.get("x-gnr8-raw-db-leak-suspected"), "false");
    assert.equal(releaseCount, 1);
  } finally {
    restoreDeps();
  }
});

test("preview route: repeated raw preview requests reuse and release one db client per request", async () => {
  let acquireCount = 0;
  let releaseCount = 0;
  const agencyDbClients: unknown[] = [];
  const renderDbClients: unknown[] = [];
  const restoreDeps = setPreviewRouteDependenciesForTest({
    acquireRuntimeDbClient: async () => {
      acquireCount += 1;
      return createNoopDbClient(() => {
        releaseCount += 1;
      });
    },
    resolveAgencyIdForSiteVersion: async (_siteVersionId, options) => {
      agencyDbClients.push(options?.dbClient);
      return "agency_1";
    },
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async (input) => {
      renderDbClients.push(input.dbClient);
      const pathValue = String(input.path ?? "/");
      return {
        html: `<!doctype html><html><body><h1>${pathValue}</h1></body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        path: pathValue,
        source: "raw_template_site",
        previewMode: "raw_template_preview",
        previewRuntimeSummary: {
          rendererContractAvailable: false,
          finalSiteModelAvailable: false,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: false,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
          rawTemplatePreviewEvidence: {
            selectedRoutePath: pathValue,
            selectedRawFilePath: pathValue === "/" ? "index.html" : "pages/news/index.html",
            rewrittenLinkCount: 0,
            dbReadCount: Number(input.initialDbReadCount ?? 0) + 3,
            dbClientAcquisitionCount: 1,
            rawPreviewDbClientAcquisitionCount: 1,
            rawPreviewDbClientReleaseCount: 0,
            rawPreviewDbReadCount: Number(input.initialDbReadCount ?? 0) + 3,
            rawPreviewDbClientLeakSuspected: true,
            dbClientReusePath: input.dbClientReusePath,
          },
        },
        rawTemplatePreviewEvidence: {
          selectedRoutePath: pathValue,
          selectedRawFilePath: pathValue === "/" ? "index.html" : "pages/news/index.html",
          rewrittenLinkCount: 0,
          dbReadCount: Number(input.initialDbReadCount ?? 0) + 3,
          dbClientAcquisitionCount: 1,
          rawPreviewDbClientAcquisitionCount: 1,
          rawPreviewDbClientReleaseCount: 0,
          rawPreviewDbReadCount: Number(input.initialDbReadCount ?? 0) + 3,
          rawPreviewDbClientLeakSuspected: true,
          dbClientReusePath: input.dbClientReusePath,
        },
        renderedCaptureUsed: false,
        domSize: 10,
        fallbackUsed: false,
      } as never;
    },
    canShowContentDebug: async () => false,
  });
  try {
    const paths = ["/news", "/", "/news", "/"];
    for (const pathValue of paths) {
      const response = await GET(
        new Request(`https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=raw_template_preview&path=${encodeURIComponent(pathValue)}`),
        { params: Promise.resolve({ siteVersionId: "sv_preview_1" }) },
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-gnr8-raw-db-client-acquisitions"), "1");
      assert.equal(response.headers.get("x-gnr8-raw-db-client-releases"), "1");
      assert.equal(response.headers.get("x-gnr8-raw-db-leak-suspected"), "false");
      assert.equal(response.headers.get("x-gnr8-raw-db-client-reuse-path"), "raw_preview_route_request_client");
    }
  } finally {
    restoreDeps();
  }

  assert.equal(acquireCount, 4);
  assert.equal(releaseCount, 4);
  assert.equal(acquireCount, releaseCount);
  assert.equal(agencyDbClients.every(Boolean), true);
  assert.equal(renderDbClients.every(Boolean), true);
  assert.equal(new Set(renderDbClients).size, 4);
});

test("preview route: transformed final output normalizes double-prefixed preview-assets URLs only", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<img src="/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/uploads/gallery/one.jpg" />
<img src="/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/uploads/gallery/two.jpg" />
<a href="/api/other/endpoint?id=1">other-api</a>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
        contentDebug: {
          siteVersionId: "sv_preview_1",
          rawTemplateArtifactFound: true,
          draftOverrideCount: 0,
          publishedOverrideCount: 0,
          mergedOverrideCount: 0,
          appliedCount: 0,
          skippedCount: 0,
          skippedDiagnostics: [],
          slotKeys: [],
        },
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.equal(html.includes("/preview-assets/site_preview_1/sv_preview_1/api/gnr8/runtime/preview-assets/"), false);
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_preview_1\/sv_preview_1\/uploads\/gallery\/one\.jpg/);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN/);
    assert.match(html, /PREVIEW_GALLERY_LIST_MARKER_CLEANUP/);
    assert.match(html, /PREVIEW_GALLERY_ARROW_POSITION_NORMALIZED/);
    assert.match(html, /PREVIEW_GALLERY_THUMBNAIL_NORMALIZATION_APPLIED/);
    assert.match(html, /tileAspectRatio:"1 \/ 1"/);
    assert.match(html, /var imagenr=parseSetting\(dataSettings,"imagenr"\)\|\|12/);
    assert.match(html, /var pageSize=imagenr/);
    assert.match(html, /var end=Math\.min\(anchors\.length,start\+pageSize\)/);
    assert.match(html, /pageImageCounts/);
    assert.match(html, /PAGED_GALLERY_CONTROLS_NOT_WIRED/);
    assert.match(html, /unifiedGridDisabled:true/);
    assert.doesNotMatch(html, /PREVIEW_GALLERY_UNIFIED_GRID_STATUS/);
    assert.doesNotMatch(html, /PREVIEW_GALLERY_UNIFIED_GRID_APPLIED/);
    assert.doesNotMatch(html, /gnr8-gallery-unified-grid/);
    assert.match(html, /imagecols/);
    assert.match(html, /imagenr/);
    assert.match(html, /pageSize/);
    assert.match(html, /pageCount/);
    assert.match(html, /pageImageCounts/);
    assert.match(html, /gridTemplateColumns/);
    assert.match(html, /PREVIEW_SERVICE_WORKER_BLOCKED/);
    assert.match(html, /PREVIEW_REQUEST_NOISE_CLASSIFIED/);
    assert.match(html, /PREVIEW_REQUEST_NOISE_SUPPRESSED/);
    assert.match(html, /PREVIEW_LEGACY_BACKEND_NOOP_RESPONSE/);
    assert.match(html, /PREVIEW_ANALYTICS_BLOCKED/);
    assert.match(html, /reasonCode/);
    assert.match(html, /handled/);
    assert.match(html, /ignored/);
    assert.match(html, /correlationKey/);
    assert.match(html, /SERVICE_WORKER_REQUEST/);
    assert.match(html, /EXTERNAL_ANALYTICS_REQUEST/);
    assert.match(html, /LEGACY_BACKEND_REQUEST/);
    assert.match(html, /DYNAMIC_ASSET_REQUEST/);
    assert.match(html, /PREFETCH_REQUEST/);
    assert.equal(html.includes("/^\\/legal\\d+$/i"), true);
    assert.equal(html.includes("downloadvcard=1"), true);
    assert.equal(html.includes("/sw-cleanup\\.js$/i"), true);
    assert.equal(html.includes("api\\.php"), true);
    assert.equal(html.includes("google-analytics\\.com"), true);
  } finally {
    restoreDeps();
  }
});

test("preview route: __debug=gallery_runtime injects paged-gallery diagnostics", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?__debug=gallery_runtime"),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN/);
    assert.match(html, /PREVIEW_GALLERY_LIST_MARKER_CLEANUP/);
    assert.match(html, /PREVIEW_GALLERY_ARROW_POSITION_NORMALIZED/);
    assert.match(html, /PREVIEW_GALLERY_THUMBNAIL_NORMALIZATION_APPLIED/);
    assert.match(html, /tileAspectRatio:"1 \/ 1"/);
    assert.match(html, /var imagenr=parseSetting\(dataSettings,"imagenr"\)\|\|12/);
    assert.match(html, /var pageSize=imagenr/);
    assert.match(html, /var end=Math\.min\(anchors\.length,start\+pageSize\)/);
    assert.match(html, /pageImageCounts/);
    assert.match(html, /unifiedGridDisabled:true/);
    assert.doesNotMatch(html, /PREVIEW_GALLERY_UNIFIED_GRID_STATUS/);
    assert.doesNotMatch(html, /PREVIEW_GALLERY_UNIFIED_GRID_APPLIED/);
    assert.doesNotMatch(html, /gnr8-gallery-unified-grid/);
    assert.match(html, /payload\.moduleId!=="m4695"/);
    assert.match(html, /moduleEl\.classList\.contains\("module"\)/);
    assert.match(html, /moduleEl\.classList\.contains\("gallery"\)/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output injects map module detection and fallback diagnostics", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<section id="m777" class="module osmap" data-req="osmap">
  <div class="map-shell"></div>
</section>
<div>Litostrojska cesta 40, Ljubljana, Slovenia</div>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /PREVIEW_MAP_MODULE_DETECTED/);
    assert.match(html, /data-req="osmap"/);
    assert.match(html, /moduleId:moduleId/);
    assert.match(html, /providerType/);
    assert.match(html, /detectionReason/);
    assert.match(html, /PREVIEW_MAP_SITE_IDENTITY_DETECTED/);
    assert.match(html, /PREVIEW_MAP_LOCATION_EXTRACTED/);
    assert.match(html, /PREVIEW_MAP_COORDINATES_EXTRACTED/);
    assert.match(html, /PREVIEW_MAP_INPLACE_REPLACEMENT_APPLIED/);
    assert.match(html, /PREVIEW_MAP_FALLBACK_APPLIED/);
    assert.match(html, /PREVIEW_MAP_SPACING_STATUS/);
    assert.match(html, /PREVIEW_MAP_SPACING_FIX_APPLIED/);
    assert.match(html, /PREVIEW_MAP_RUNTIME_INIT_FAILED/);
    assert.match(html, /OSMAP_JSON_ENDPOINT_UNAVAILABLE/);
    assert.match(html, /gnr8-map-fallback/);
    assert.match(html, /function detectMapRenderNode\(moduleEl\)/);
    assert.match(html, /replacementStrategy:replacementStrategy/);
    assert.match(html, /while\(renderNode\.firstChild\)\{renderNode\.removeChild\(renderNode\.firstChild\);\}/);
    assert.match(html, /renderNode\.appendChild\(host\)/);
    assert.match(html, /openstreetmap\.org\/export\/embed\.html/);
    assert.match(html, /Litostrojska cesta 40, Ljubljana, Slovenia/);
    assert.match(html, /confidence/);
    assert.match(html, /siteIdentity/);
    assert.match(html, /rejectedAddressCandidates/);
    assert.match(html, /knownFallbackUsed/);
    assert.match(html, /addressUsed:fallback\.addressUsed/);
    assert.match(html, /coordinatesConfidence/);
    assert.match(html, /precisionSource/);
    assert.match(html, /maxSpacingApplied/);
  } finally {
    restoreDeps();
  }
});

test("preview route: map fallback supports placeholder path when location cannot be extracted", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<section id="m778" class="module map" data-req="map">
  <div class="map-shell"></div>
</section>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /fallbackType:iframeUsed\?"iframe":"placeholder"/);
    assert.match(html, /Open map/);
    assert.match(html, /Location unavailable/);
    assert.match(html, /knownFallbackUsed:location\.knownFallbackUsed===true/);
    assert.match(html, /PREVIEW_MAP_SITE_IDENTITY_DETECTED/);
  } finally {
    restoreDeps();
  }
});

test("preview route: map fallback shim is scoped to map modules and does not alter gallery diagnostics", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed&__debug=gallery_runtime"),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED/);
    assert.match(html, /PREVIEW_MAP_MODULE_DETECTED/);
    assert.match(html, /PREVIEW_MAP_SPACING_STATUS/);
    assert.match(html, /PREVIEW_MAP_SPACING_FIX_APPLIED/);
    assert.match(html, /detectMapModule/);
    assert.match(html, /data-gnr8-map-fallback/);
    assert.match(html, /function applyFallback\(moduleEl,moduleId,location,correlationKey\)/);
    assert.match(html, /function normalizeMapSpacing\(moduleEl,host,moduleId,correlationKey\)/);
    assert.match(html, /PREVIEW_MAP_INPLACE_REPLACEMENT_APPLIED/);
    assert.match(html, /PREVIEW_MAP_COORDINATES_EXTRACTED/);
    assert.match(html, /isSpacerElement/);
    assert.match(html, /spacerNodesRemoved/);
    assert.match(html, /normalizedWrapperCount/);
    assert.match(html, /maxSpacingApplied/);
    assert.match(html, /if\(!detected\)return;/);
  } finally {
    restoreDeps();
  }
});

test("preview route: map fallback prioritizes explicit coordinates over address fallback and uses coordinate iframe query", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<section id="m780" class="module osmap" data-req="osmap" data-lat="46.056946" data-lng="14.505751" data-address="Road 99, Berlin">
  <div class="map-shell"><iframe src="https://www.openstreetmap.org/export/embed.html?bbox=14.49%2C46.04%2C14.52%2C46.07&layer=mapnik&marker=46.056946%2C14.505751"></iframe></div>
</section>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /coordinates_config/);
    assert.match(html, /PREVIEW_MAP_COORDINATES_EXTRACTED/);
    assert.match(html, /coordinatesUsed:fallback\.coordinatesUsed/);
    assert.match(html, /openstreetmap\.org\/export\/embed\.html\?bbox=/);
    assert.match(html, /marker=/);
    assert.match(html, /if\(location&&location\.lat!==null&&location\.lng!==null\)/);
    assert.match(html, /return "https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox="/);
    assert.match(html, /PREVIEW_MAP_EMBED_URL_NORMALIZED/);
    assert.match(html, /previousUrlType/);
    assert.match(html, /finalUrlType/);
  } finally {
    restoreDeps();
  }
});

test("preview route: map location extraction rejects wrong candidates and gates Roboplast fallback behind site identity", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<div style="margin-top:420px"></div>
<section id="m779" class="module osmap" data-req="osmap">
  <div>Road 1, Berlin, Germany</div>
</section>
<div id="hero" style="margin-top:96px">Hero spacing</div>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /rejectedAddressCandidates\.push/);
    assert.match(html, /knownRoboplastAddress/);
    assert.match(html, /knownFallbackUsed:location\.knownFallbackUsed===true/);
    assert.match(html, /siteIdentity:location\.siteIdentity\|\|"unknown"/);
    assert.match(html, /if\(!address&&identity\.siteIdentity==="roboplast"\)/);
    assert.match(html, /PREVIEW_MAP_LOCATION_EXTRACTED/);
    assert.match(html, /PREVIEW_MAP_SITE_IDENTITY_DETECTED/);
    assert.match(html, /PREVIEW_MAP_SPACING_STATUS/);
    assert.match(html, /PREVIEW_MAP_FALLBACK_APPLIED/);
    assert.match(html, /addressUsed:fallback\.addressUsed/);
  } finally {
    restoreDeps();
  }
});

test("preview route: Maver page never uses Roboplast fallback and uses Maver address", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<section id="m781" class="module osmap" data-req="osmap"><div class="map-shell"></div></section>
<footer>Parking and workshop facilities are at Jagrova ulica 14, Sela, Lavrica, 1291 Škofljica. Kontakt: Tel: +386 (0)1 366 38 36 Fax: +386 (0)1 366 38 38 GSM: +386 (0)41 269 064 E-mail: transporti.maver@siol.net</footer>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /maver_transport/);
    assert.match(html, /BRAND_MAVER_TRANSPORT/);
    assert.match(html, /Jagrova ulica 14, Sela, Lavrica, 1291 Škofljica/);
    assert.match(html, /knownMaverCoordinates=\{lat:45\.996816,lng:14\.589487\}/);
    assert.match(html, /known_maver_site_address_coordinates/);
    assert.match(html, /siteSpecificCoordinatesUsed=true/);
    assert.match(html, /PREVIEW_MAP_SITE_SPECIFIC_COORDINATES_USED/);
    assert.match(html, /confidence:"known_site_address"/);
    assert.match(html, /finalUrlType:finalUrlType/);
    assert.match(html, /iframeUsed:!!iframeSrc/);
    assert.match(html, /PREVIEW_MAP_RENDER_DECISION/);
    assert.match(html, /hasKnownSiteCoordinates:location\.siteSpecificCoordinatesUsed===true/);
    assert.match(html, /fallbackReason:fallbackReason/);
    assert.match(html, /host\.className="gnr8-map-iframe-host"/);
    assert.doesNotMatch(html, /host\.className="gnr8-map-fallback";\s*host\.setAttribute\("data-gnr8-map-fallback","1"\);\s*var iframe=document\.createElement\("iframe"\)/);
    assert.match(html, /var finalUrlType=iframeSrc\?"embed":"placeholder";/);
    assert.match(html, /return "https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox="/);
    assert.match(html, /marker=/);
    assert.match(html, /45\.996816/);
    assert.match(html, /14\.589487/);
    assert.doesNotMatch(html, /<iframe[^>]+openstreetmap\.org\/search\?query=/);
    assert.doesNotMatch(html, /iframe\.src="https:\/\/www\.openstreetmap\.org\/search\?query=/);
    assert.match(html, /PREVIEW_MAP_EMBED_URL_NORMALIZED/);
    assert.match(html, /if\(location\.siteSpecificCoordinatesUsed===true&&location\.lat!==null&&location\.lng!==null\)/);
    assert.match(html, /recordAddressCandidate\(pageWideCandidate,"page_wide_contact_text","page_wide_text"\)/);
  } finally {
    restoreDeps();
  }
});

test("preview route: generic unknown site with address only still uses placeholder fallback link", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<section id="m782" class="module osmap" data-req="osmap"><div class="map-shell"></div></section>
<footer>Address: Litostrojska cesta 40, Ljubljana, Slovenia</footer>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Map preview fallback active\./);
    assert.match(html, /host\.className="gnr8-map-fallback"/);
    assert.match(html, /openLink\.href="https:\/\/www\.openstreetmap\.org\/search\?query="\+encodeURIComponent\(location\.address\)/);
    assert.match(html, /fallbackType:iframeUsed\?"iframe":"placeholder"/);
    assert.match(html, /PREVIEW_MAP_FALLBACK_APPLIED/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed back-to-top shim parses and avoids unsafe regex patterns", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    const shim = extractInjectedScriptContaining(html, "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");
    assert.doesNotThrow(() => new Function(shim), "expected back-to-top shim to parse as JavaScript");
    assert.doesNotMatch(shim, /scrollto\\s*\\\*\\s*\\\(/);
    assert.doesNotMatch(shim, /scrolltos\*\\\(\|scrolls\*tos\*top\|backs\*tos\*top\|totop/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed request-noise hardening shim parses without dangling catch", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    const shim = extractInjectedScriptContaining(html, "PREVIEW_REQUEST_NOISE_CLASSIFIED");
    assert.doesNotThrow(() => new Function(shim), "expected request-noise hardening shim to parse as JavaScript");
    assert.match(shim, /try\{\nif\(typeof window\.fetch==="function"\)\{/);
    assert.match(shim, /\}catch\(err\)\{emit\("PREVIEW_RUNTIME_MODULE_INIT_BLOCKED"/);
    assert.match(shim, /swContainer\.register=blockRegister/);
    assert.match(shim, /ServiceWorkerContainer\.prototype\.register=blockRegister/);
    assert.match(shim, /if\(sameOrigin\)\{/);
    assert.match(shim, /return originalRegister\(scriptURL\)/);
    assert.match(shim, /OPTIONAL_DOCUMENT_PREFETCH/);
    assert.match(shim, /responseForPrefetch/);
    assert.match(shim, /preview_noop_lang/);
    assert.match(shim, /preview_legacy_backend_noop/);
    assert.match(shim, /LEGACY_AJAX_HTML_PREVIEW_NOOP/);
    assert.match(shim, /this\.status=noopResponse\.status;this\.responseText=noopResponse\.body/);
    assert.match(shim, /requestType!=="EXTERNAL_ANALYTICS_REQUEST"/);
    assert.match(shim, /normalizedKey/);
    assert.match(shim, /PREVIEW_REQUEST_NOISE_SUPPRESSED/);
    assert.match(shim, /if\(prefetchResponse\)\{return Promise\.resolve\(prefetchResponse\);\}/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed request-noise shim includes legacy lang noop payload shape compatible with lang.js", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    const shim = extractInjectedScriptContaining(html, "PREVIEW_REQUEST_NOISE_CLASSIFIED");
    assert.match(shim, /language:"sl"/);
    assert.match(shim, /translations:\{\}/);
    assert.match(shim, /data:\{lang:"sl",labels:\{\},translations:\{\}\}/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed request-noise shim suppresses quicklink prefetch noise targets", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    const shim = extractInjectedScriptContaining(html, "PREVIEW_REQUEST_NOISE_CLASSIFIED");
    assert.match(shim, /\^\\\/legal\\d\+\$\/i/);
    assert.match(shim, /downloadvcard=1/i);
    assert.match(shim, /OPTIONAL_DOCUMENT_PREFETCH/);
    assert.match(shim, /status:204/);
  } finally {
    restoreDeps();
  }
});

test("preview route: request-noise shim is injected in head before inline service-worker scripts", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><head><script>navigator.serviceWorker.register('/sw-cleanup.js');</script></head><body><h1>Preview Site</h1></body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    const shimIndex = html.indexOf("PREVIEW_REQUEST_NOISE_CLASSIFIED");
    const swRegisterIndex = html.indexOf("navigator.serviceWorker.register('/sw-cleanup.js')");
    assert.notEqual(shimIndex, -1);
    assert.notEqual(swRegisterIndex, -1);
    assert.ok(shimIndex < swRegisterIndex, "request-noise shim should be injected before inline service-worker registration calls");
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed injected gallery runtime shim parses with paged-gallery diagnostics", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed&__debug=gallery_runtime"),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const html = await response.text();
    assert.equal(response.status, 200);

    const injectedShim = extractInjectedGalleryRuntimeShim(html);
    assert.doesNotThrow(() => new Function(injectedShim), "expected injected shim to parse as JavaScript");
    assert.match(injectedShim, /PREVIEW_GALLERY_PAGED_LAYOUT_STATUS/);
    assert.match(injectedShim, /PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED/);
    assert.match(injectedShim, /PREVIEW_GALLERY_PAGE_SWITCH/);
    assert.match(injectedShim, /PREVIEW_GALLERY_THUMBNAIL_NORMALIZATION_APPLIED/);
    assert.match(injectedShim, /PREVIEW_GALLERY_LIST_MARKER_CLEANUP/);
    assert.match(injectedShim, /PREVIEW_GALLERY_ARROW_POSITION_NORMALIZED/);
    assert.match(injectedShim, /PREVIEW_GALLERY_PAGED_VISIBILITY_STATUS/);
    assert.match(injectedShim, /PREVIEW_GALLERY_PAGED_VISIBILITY_FIX_APPLIED/);
    assert.match(injectedShim, /PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN/);
    assert.match(injectedShim, /PAGED_GALLERY_CONTROLS_NOT_WIRED/);
    assert.doesNotMatch(injectedShim, /PREVIEW_GALLERY_UNIFIED_GRID_STATUS/);
    assert.doesNotMatch(injectedShim, /PREVIEW_GALLERY_UNIFIED_GRID_APPLIED/);
    assert.match(injectedShim, /collectGalleryAnchors/);
    assert.match(injectedShim, /isExcludedControlAnchor/);
    assert.match(injectedShim, /ensurePagesHost/);
    assert.match(injectedShim, /ensurePage/);
    assert.match(injectedShim, /page\.style\.display="grid"/);
    assert.match(injectedShim, /page0\.style\.display="grid"/);
    assert.match(injectedShim, /page1\.style\.display="none"/);
    assert.match(injectedShim, /pagesHost\.style\.visibility="visible"/);
    assert.match(injectedShim, /moduleEl\.style\.visibility="visible"/);
    assert.match(injectedShim, /PAGED_CONTROLS_UNWIRED_PAGE0_ENFORCED/);
    assert.match(injectedShim, /page0VisibleImageCount/);
    assert.match(injectedShim, /firstPage0ImageSize/);
    assert.match(injectedShim, /clientWidth/);
    assert.match(injectedShim, /clientHeight/);
    assert.match(injectedShim, /naturalWidth/);
    assert.match(injectedShim, /naturalHeight/);
    assert.match(injectedShim, /var pageSize=imagenr/);
    assert.match(injectedShim, /var pageCount=Math\.max\(1,Math\.ceil\(anchors\.length\/pageSize\)\)/);
    assert.match(injectedShim, /setActivePage\(pagesHost,0\)/);
    assert.match(injectedShim, /visibilityDetails=applyPagedVisibilityFix/);
    assert.match(injectedShim, /reasonCode:"PAGED_LAYOUT_ACTIVE_VISIBILITY_PRESERVED"/);
    assert.match(injectedShim, /activePageBefore/);
    assert.match(injectedShim, /activePageAfter/);
    assert.match(injectedShim, /visiblePageIndex/);
    assert.match(injectedShim, /arrowHandlersAttached/);
    assert.match(injectedShim, /img\.style\.objectFit="cover"/);
    assert.match(injectedShim, /img\.style\.objectPosition="center"/);
    assert.match(injectedShim, /img\.style\.width="100%"/);
    assert.match(injectedShim, /img\.style\.height="100%"/);
    assert.match(injectedShim, /img\.removeAttribute\("width"\)/);
    assert.match(injectedShim, /img\.removeAttribute\("height"\)/);
    assert.match(injectedShim, /img\.style\.removeProperty\("max-width"\)/);
    assert.match(injectedShim, /img\.style\.removeProperty\("aspect-ratio"\)/);
    assert.match(injectedShim, /img\.style\.removeProperty\("transform"\)/);
    assert.match(injectedShim, /anchor\.style\.aspectRatio="1 \/ 1"/);
    assert.match(injectedShim, /anchor\.style\.overflow="hidden"/);
    assert.match(injectedShim, /anchor\.style\.position="relative"/);
    assert.match(injectedShim, /tileAspectRatio:"1 \/ 1"/);
    assert.match(injectedShim, /listMarkersSuppressed:listMarkerNormalization\.listMarkersSuppressed/);
    assert.match(injectedShim, /removedBulletNodeCount/);
    assert.match(injectedShim, /listContainersNormalized/);
    assert.match(injectedShim, /styleTag\.textContent="#"\+String\(payload\.moduleId\)\+"/);
    assert.match(injectedShim, /#"\+String\(payload\.moduleId\)\+" ul,#"\+String\(payload\.moduleId\)\+" ol,#"\+String\(payload\.moduleId\)\+" li/);
    assert.match(injectedShim, /li::marker\{content:none !important;\}/);
    assert.match(injectedShim, /node\.style\.setProperty\("list-style","none","important"\)/);
    assert.match(injectedShim, /node\.style\.setProperty\("padding","0","important"\)/);
    assert.match(injectedShim, /node\.style\.setProperty\("margin","0","important"\)/);
    assert.match(injectedShim, /moduleEl\.style\.position="relative"/);
    assert.match(injectedShim, /node\.style\.position="absolute"/);
    assert.match(injectedShim, /node\.style\.top="50%"/);
    assert.match(injectedShim, /node\.style\.transform="translateY\(-50%\)"/);
    assert.match(injectedShim, /node\.style\.left="-44px"/);
    assert.match(injectedShim, /node\.style\.right="-44px"/);
    assert.match(injectedShim, /node\.style\.pointerEvents="auto"/);
    assert.doesNotMatch(injectedShim, /moduleEl\.querySelectorAll\("ul,ol,li"\)/);
    assert.doesNotMatch(injectedShim, /\/\\\\\\\\\/uploads\\\\\\\\\//);
  } finally {
    restoreDeps();
  }
});

test("preview route: injected shim keeps paged split logic for 12 + 3 and only one page visible at init", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed&__debug=gallery_runtime"),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const html = await response.text();
    const injectedShim = extractInjectedGalleryRuntimeShim(html);
    assert.match(injectedShim, /var imagenr=parseSetting\(dataSettings,"imagenr"\)\|\|12/);
    assert.match(injectedShim, /var pageSize=imagenr/);
    assert.match(injectedShim, /var start=i\*pageSize/);
    assert.match(injectedShim, /var end=Math\.min\(anchors\.length,start\+pageSize\)/);
    assert.match(injectedShim, /setActivePage\(pagesHost,0\)/);
    assert.match(injectedShim, /page0\.style\.display==="grid"/);
    assert.match(injectedShim, /page1Hidden:!page1\|\|page1\.style\.display==="none"/);
    assert.match(injectedShim, /leftArrowDetected/);
    assert.match(injectedShim, /rightArrowDetected/);
    assert.match(injectedShim, /arrowsPositioned/);
    assert.match(injectedShim, /overlapProtectionApplied/);
  } finally {
    restoreDeps();
  }
});

test("preview route: injected shim keeps captions hidden and preserves img alt attributes", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed&__debug=gallery_runtime"),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const html = await response.text();
    const injectedShim = extractInjectedGalleryRuntimeShim(html);

    assert.match(injectedShim, /hideThumbnailCaptions/);
    assert.match(injectedShim, /node\.style\.display="none"/);
    assert.match(injectedShim, /PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN/);
    assert.doesNotMatch(injectedShim, /removeAttribute\("alt"\)/);
    assert.doesNotMatch(injectedShim, /\.alt\s*=/);
    assert.doesNotMatch(injectedShim, /setAttribute\("alt"/);
  } finally {
    restoreDeps();
  }
});

test("preview route: injected shim parseSetting parses imagecols and imagenr from comma-separated data-settings", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed&__debug=gallery_runtime"),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const html = await response.text();
    const injectedShim = extractInjectedGalleryRuntimeShim(html);
    const parseSetting = extractParseSettingFunctionFromInjectedShim(injectedShim);
    assert.equal(parseSetting("imagecols=4,imagenr=12", "imagecols"), 4);
    assert.equal(parseSetting("imagecols=4,imagenr=12", "imagenr"), 12);
  } finally {
    restoreDeps();
  }
});

test("preview route: injected shim parseSetting parses semicolon and ampersand separators", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await GET(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed&__debug=gallery_runtime"),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const html = await response.text();
    const injectedShim = extractInjectedGalleryRuntimeShim(html);
    const parseSetting = extractParseSettingFunctionFromInjectedShim(injectedShim);
    assert.equal(parseSetting("foo=1; imagecols=5; bar=2", "imagecols"), 5);
    assert.equal(parseSetting("foo=1&imagenr=9&bar=2", "imagenr"), 9);
    assert.equal(parseSetting("imagecols='6'&imagenr=\"11\"", "imagecols"), 6);
    assert.equal(parseSetting("imagecols='6'&imagenr=\"11\"", "imagenr"), 11);
  } finally {
    restoreDeps();
  }
});

test("preview route: POST module request with dm returns deterministic unsupported-module payload instead of 405", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await POST(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed&dm=m1830", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const payload = JSON.parse(await response.text()) as {
      ok: boolean;
      reasonCode: string;
      siteVersionId: string;
      mode: string | null;
      dm: string | null;
    };
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(payload.ok, false);
    assert.equal(payload.reasonCode, "UNSUPPORTED_DM_MODULE_REQUEST");
    assert.equal(payload.siteVersionId, "sv_preview_1");
    assert.equal(payload.mode, "transformed");
    assert.equal(payload.dm, "m1830");
  } finally {
    restoreDeps();
  }
});

test("preview route: POST module request without dm returns explicit bad-request payload", async () => {
  const restoreDeps = mockPreviewDeps(false);
  try {
    const response = await POST(
      new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      },
    );
    const payload = JSON.parse(await response.text()) as {
      ok: boolean;
      reasonCode: string;
      siteVersionId: string;
      mode: string | null;
      dm: string | null;
    };
    assert.equal(response.status, 400);
    assert.equal(payload.ok, false);
    assert.equal(payload.reasonCode, "MISSING_DM_QUERY");
    assert.equal(payload.siteVersionId, "sv_preview_1");
    assert.equal(payload.mode, "transformed");
    assert.equal(payload.dm, null);
  } finally {
    restoreDeps();
  }
});

test("preview route: repeated transformed requests resolve consistently without dependency churn", async () => {
  let renderCalls = 0;
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () => {
      renderCalls += 1;
      return {
        html: "<!doctype html><html><body><h1>Preview Site</h1></body></html>",
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      } as never;
    },
    canShowContentDebug: async () => false,
  });
  try {
    const runs = 40;
    for (let index = 0; index < runs; index += 1) {
      const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
        params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
      });
      assert.equal(response.status, 200);
    }
    assert.equal(renderCalls, 40);
  } finally {
    restoreDeps();
  }
});


test("preview route: transformed output restores native back-to-top with native-only diagnostic only", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body><a href="#" data-req="scrollTop" class="scrollIcon bottom_right">Top</a></body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    const shim = extractInjectedScriptContaining(html, "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");
    assert.equal(response.status, 200);
    assert.match(html, /PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_NATIVE_ASSET_STATUS/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_NATIVE_RUNTIME_STATUS/);
    assert.match(shim, /nativeSelector='a\.scrollIcon\[data-req="scrollTop"\],a\.scrollIcon\.bottom_right\[href="#"\],a\[data-req="scrollTop"\]'/);
    assert.match(shim, /nativeFound:!!nativeEl/);
    assert.match(shim, /nativeHasHiddenClass:nativeHiddenClass/);
    assert.match(shim, /nativeClickWired:nativeClickWired/);
    assert.match(shim, /nativeVisualUntouched:true/);
    assert.match(shim, /localStylesheetHrefCount:localStylesheetHrefs\.length/);
    assert.match(shim, /stylesheetHrefs:stylesheetHrefs/);
    assert.match(shim, /localStylesheetHrefs:localStylesheetHrefs/);
    assert.match(shim, /fallbackAllowed:false/);
    assert.match(shim, /glyphInjected:false/);
    assert.match(shim, /visualBoxNormalized:false/);
    assert.match(shim, /siteVersionId:payload\.siteVersionId/);
    assert.match(shim, /correlationKey:correlationKey/);
    assert.match(shim, /window\.scrollTo\(\{top:0,behavior:"smooth"\}\)/);
    assert.doesNotMatch(shim, /gnr8-native-scrollicon-glyph/);
    assert.doesNotMatch(shim, /width:44px/);
    assert.doesNotMatch(shim, /height:44px/);
    assert.doesNotMatch(shim, /border-radius:9999px/);
    assert.doesNotMatch(shim, /PREVIEW_BACK_TO_TOP_NATIVE_ICON_RENDERED/);
    assert.doesNotMatch(shim, new RegExp(["gnr8", "preview", "backtotop", "fallback"].join("-")));
  } finally {
    restoreDeps();
  }
});

test("preview route: source uses static native restore only without observer, timer, or fallback creation", async () => {
  const routeSource = readFileSync(
    path.resolve(process.cwd(), "app/api/gnr8/runtime/versions/[siteVersionId]/preview/route.ts"),
    "utf-8",
  );
  const fnMatch = routeSource.match(
    /function injectBackToTopRuntimeCompatibility\(input: \{ html: string; siteVersionId: string \}\): string \{[\s\S]*?return `\$\{input\.html\}\$\{script\}`;\n\}/,
  );
  assert.ok(fnMatch, "expected injectBackToTopRuntimeCompatibility function in route source");
  const backToTopBlock = fnMatch?.[0] ?? "";
  assert.match(backToTopBlock, /PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS/);
  assert.match(backToTopBlock, /PREVIEW_BACK_TO_TOP_NATIVE_ASSET_STATUS/);
  assert.match(backToTopBlock, /PREVIEW_BACK_TO_TOP_NATIVE_RUNTIME_STATUS/);
  assert.match(backToTopBlock, /nativeFound:\!\!nativeEl/);
  assert.match(backToTopBlock, /nativeHasHiddenClass:nativeHiddenClass/);
  assert.match(backToTopBlock, /nativeClickWired:nativeClickWired/);
  assert.match(backToTopBlock, /nativeVisualUntouched:true/);
  assert.match(backToTopBlock, /localStylesheetHrefCount:localStylesheetHrefs\.length/);
  assert.match(backToTopBlock, /fallbackAllowed:false/);
  assert.match(backToTopBlock, /glyphInjected:false/);
  assert.match(backToTopBlock, /visualBoxNormalized:false/);
  assert.doesNotMatch(backToTopBlock, /createElement\("button"\)/);
  assert.doesNotMatch(backToTopBlock, /gnr8-native-scrollicon-glyph/);
  assert.doesNotMatch(backToTopBlock, /width:44px/);
  assert.doesNotMatch(backToTopBlock, /height:44px/);
  assert.doesNotMatch(backToTopBlock, /border-radius:9999px/);
  assert.doesNotMatch(backToTopBlock, /PREVIEW_BACK_TO_TOP_NATIVE_ICON_RENDERED/);
  assert.doesNotMatch(backToTopBlock, new RegExp(["gnr8", "preview", "backtotop", "fallback"].join("-")));
  assert.match(backToTopBlock, /nativeSelector='a\.scrollIcon\[data-req="scrollTop"\],a\.scrollIcon\.bottom_right\[href="#"\],a\[data-req="scrollTop"\]'/);
});

test("preview route: transformed output never includes fallback back-to-top markers", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body><a href="#" data-req="scrollTop" class="scrollIcon bottom_right">Top</a></body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    const forbiddenMarkers = [
      ["gnr8", "preview", "backtotop", "fallback"].join("-"),
      ["data", "gnr8", "backtotop", "fallback"].join("-"),
      ["PREVIEW_BACK_TO_TOP_FALLBACK", "APPLIED"].join("_"),
      ["RUNTIME_SIGNAL", "FALLBACK"].join("_"),
      ["fallbackInjected", " true"].join(":"),
      ["finalButtonSource", '"fallback"'].join(":"),
      ["finalButtonSource", ' "fallback"'].join(":"),
      "gnr8-native-scrollicon-glyph",
      "data-gnr8-native-scrollicon-glyph",
      "width:44px",
      "height:44px",
      "border-radius:9999px",
      "PREVIEW_BACK_TO_TOP_NATIVE_ICON_RENDERED",
    ];
    for (const marker of forbiddenMarkers) {
      assert.equal(html.includes(marker), false, `transformed preview html must not include fallback marker: ${marker}`);
    }
  } finally {
    restoreDeps();
  }
});

test("repo guard: fallback back-to-top markers are banned from source", async () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const forbiddenMarkers = [
    ["gnr8", "preview", "backtotop", "fallback"].join("-"),
    ["data", "gnr8", "backtotop", "fallback"].join("-"),
    ["PREVIEW_BACK_TO_TOP_FALLBACK", "APPLIED"].join("_"),
    ["RUNTIME_SIGNAL", "FALLBACK"].join("_"),
    ["fallbackInjected", " true"].join(":"),
    ["finalButtonSource", '"fallback"'].join(":"),
    ["finalButtonSource", ' "fallback"'].join(":"),
  ];
  for (const marker of forbiddenMarkers) {
    const result = spawnSync("rg", ["-n", "--hidden", "--glob", "!.git", marker, repoRoot], {
      encoding: "utf-8",
    });
    assert.equal(result.status, 1, `forbidden marker detected in repository source: ${marker}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
});

test("preview route: Roboplast-like fixture keeps native scrollIcon and local stylesheet semantics without fallback markers", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><head><link rel="stylesheet" href="/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/assets/stylesheet/site.css"></head><body><a href="#" data-req="scrollTop" class="scrollIcon hidden bottom_right">Top</a></body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    const shim = extractInjectedScriptContaining(html, "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");
    assert.equal(response.status, 200);
    assert.match(html, /PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS/);
    assert.match(shim, /fallbackAllowed:false/);
    assert.match(shim, /glyphInjected:false/);
    assert.match(shim, /visualBoxNormalized:false/);
    assert.match(shim, /nativeVisualUntouched:true/);
    assert.match(shim, /localStylesheetHrefCount:localStylesheetHrefs\.length/);
    assert.match(shim, /nativeFound:\!\!nativeEl/);
    assert.equal(html.includes(["gnr8", "preview", "backtotop", "fallback"].join("-")), false);
    assert.equal(html.includes(["data", "gnr8", "backtotop", "fallback"].join("-")), false);
    assert.equal(html.includes(["PREVIEW_BACK_TO_TOP_FALLBACK", "APPLIED"].join("_")), false);
    assert.equal(html.includes(["RUNTIME_SIGNAL", "FALLBACK"].join("_")), false);
    assert.equal(html.includes(["fallbackInjected", " true"].join(":")), false);
    assert.equal(html.includes(["finalButtonSource", '"fallback"'].join(":")), false);
    assert.equal(html.includes(["finalButtonSource", ' "fallback"'].join(":")), false);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed map fallback for Roboplast remains active with back-to-top shim disabled", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<section id="m777" class="module osmap" data-req="osmap"><div class="map-shell"></div></section>
<div>Litostrojska cesta 40, Ljubljana, Slovenia</div>
<a href="#" data-req="scrollTop" class="scrollIcon bottom_right">Top</a>
</body></html>`,
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        source: "preview",
        previewMode: "transformed",
        previewRuntimeSummary: {
          rendererContractAvailable: true,
          finalSiteModelAvailable: true,
          renderedWithFallback: false,
          matchedPageId: null,
          contentResolutionApplied: true,
          resolvedContentCount: 0,
          unresolvedContentCount: 0,
          contentResolutionDegraded: false,
          contentResolutionDiagnostics: [],
          previewDiagnostics: [],
          familyRenderUsed: false,
          familyRenderMode: null,
          familyRenderFamilyId: null,
          familyRenderFallbackToPage: false,
          familyRenderDiagnosticsCount: 0,
        },
        renderedCaptureUsed: false,
        domSize: 100,
        fallbackUsed: false,
      }) as never,
    canShowContentDebug: async () => false,
  });
  try {
    const response = await GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/versions/sv_preview_1/preview?mode=transformed"), {
      params: Promise.resolve({ siteVersionId: "sv_preview_1" }),
    });
    const html = await response.text();
    const shim = extractInjectedScriptContaining(html, "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");
    assert.equal(response.status, 200);
    assert.match(html, /PREVIEW_MAP_MODULE_DETECTED/);
    assert.match(html, /PREVIEW_MAP_FALLBACK_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_STATUS/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_NATIVE_ASSET_STATUS/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_NATIVE_RUNTIME_STATUS/);
    assert.doesNotMatch(shim, /MutationObserver/);
    assert.doesNotMatch(shim, /setTimeout\(/);
    assert.doesNotMatch(shim, /setInterval\(/);
  } finally {
    restoreDeps();
  }
});
