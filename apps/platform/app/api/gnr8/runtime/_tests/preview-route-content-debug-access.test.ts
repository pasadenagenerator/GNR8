import assert from "node:assert/strict";
import test from "node:test";

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
    assert.match(html, /knownFallbackUsed:location\.knownFallbackUsed===true/);
    assert.doesNotMatch(html, /<iframe[^>]+openstreetmap\.org\/search\?query=/);
    assert.match(html, /PREVIEW_MAP_EMBED_URL_NORMALIZED/);
    assert.match(html, /recordAddressCandidate\(pageWideCandidate,"page_wide_contact_text","page_wide_text"\)/);
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
    const shim = extractInjectedScriptContaining(html, "PREVIEW_BACK_TO_TOP_DEDUPED");
    assert.doesNotThrow(() => new Function(shim), "expected back-to-top shim to parse as JavaScript");
    assert.doesNotMatch(shim, /scrollto\\s*\\\*\\s*\\\(/);
    assert.doesNotMatch(shim, /scrolltos\*\\\(\|scrolls\*tos\*top\|backs\*tos\*top\|totop/);
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

test("preview route: transformed output injects back-to-top restore compatibility diagnostics", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<a id="scroll-top-control" class="scrolltop back-to-top" href="#top" style="display:none;visibility:hidden;opacity:0">Top</a>
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
    assert.match(html, /PREVIEW_BACK_TO_TOP_DETECTED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_RESTORED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_CLICK_HANDLED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_THEME_APPLIED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_ICON_NORMALIZED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_DEDUPED/);
    assert.match(html, /fallbackInjectionPrevented/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_CANDIDATES_SNAPSHOT/);
    assert.match(html, /finalButtonSource:"original"/);
    assert.match(html, /passName:passName/);
    assert.match(html, /visibleCandidateCountAfter/);
    assert.match(html, /iconTypeDetected/);
    assert.match(html, /whiteForegroundApplied/);
    assert.match(html, /detectedAccentColor/);
    assert.match(html, /detectionSource/);
    assert.match(html, /contrastColor/);
    assert.match(html, /existingElementFound/);
    assert.match(html, /fallbackInjected/);
    assert.match(html, /correlationKey/);
    assert.match(html, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
    assert.match(html, /a\[href='#top'\]/);
    assert.match(html, /scrolltop/);
    assert.match(html, /back-to-top/);
    assert.match(html, /cssVars=\["--primary","--primary-color","--accent","--accent-color","--theme-color"\]/);
    assert.match(html, /meta\[name='theme-color'\]/);
    assert.match(html, /prominent:/);
    assert.match(html, /existing_backtotop:bg/);
    assert.match(html, /fallback_neutral_dark/);
    assert.match(html, /el\.style\.fill=contrast/);
    assert.match(html, /el\.style\.stroke=contrast/);
    assert.match(html, /node\.setAttribute\("fill","#fff"\)/);
    assert.match(html, /node\.setAttribute\("stroke","#fff"\)/);
    assert.match(html, /\[data-gnr8-backtotop-restored\]::before/);
    assert.match(html, /icon_normalized/);
    assert.match(html, /hiddenDuplicateCount/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output injects back-to-top fallback and prevents duplicate fallback", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<script>window.legacyTopScroll=true;function onepage_up(){return true;}</script>
<div>no explicit back-to-top node</div>
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
    assert.match(html, /PREVIEW_BACK_TO_TOP_FALLBACK_APPLIED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_THEME_APPLIED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_ICON_NORMALIZED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_DEDUPED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_CANDIDATES_SNAPSHOT/);
    assert.match(html, /finalButtonSource:"fallback"/);
    assert.match(html, /Back to top/);
    assert.match(html, /gnr8-preview-backtotop-fallback/);
    assert.match(html, /if\(!fallbackCandidate&&!hasRuntimeSignals\(\)\)return;/);
    assert.match(html, /var rescannedCandidates=findCandidateElements\(\);/);
    assert.match(html, /if\(rescannedOriginal\)\{/);
    assert.match(html, /data-gnr8-backtotop-hidden-duplicate/);
    assert.match(html, /fallback\.style\.color="#fff"/);
    assert.match(html, /fallback\.style\.background="#1f2937"/);
    assert.match(html, /fallback\.style\.boxShadow="0 2px 6px rgba\(0,0,0,0.16\)"/);
    assert.doesNotMatch(html, /fallback\.style\.boxShadow="0 6px 16px rgba\(0,0,0,0.18\)"/);
    assert.match(html, /applyTheme\(fallback,detectedTheme,false,true\)/);
    assert.match(html, /normalizeIconForeground\(fallback,false,true\)/);
    assert.match(html, /window\.addEventListener\("load",function\(\)\{runDedupePass\("window_load"\);\}\)/);
    assert.match(html, /schedulePass\("delayed_500ms",500\)/);
    assert.match(html, /schedulePass\("delayed_1500ms",1500\)/);
    assert.match(html, /runDedupePass\("mutation_observer"\)/);
    assert.match(html, /new MutationObserver/);
    assert.match(html, /\[data-gnr8-backtotop-fallback\]::after/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output dedupes existing original over duplicate gnr8 fallback", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<a id="scroll-top-control" class="scrolltop back-to-top" href="#top">Top</a>
<button id="gnr8-preview-backtotop-fallback" data-gnr8-backtotop-fallback="1" aria-label="Back to top">↑</button>
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
    assert.match(html, /PREVIEW_BACK_TO_TOP_FALLBACK_SUPPRESSED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_DEDUPED/);
    assert.match(html, /finalButtonSource:"original"/);
    assert.match(html, /originalCandidateCount:originalCandidateCount/);
    assert.match(html, /fallbackCandidateCount:fallbackCandidateCount/);
    assert.match(html, /suppressedFallbackCount:suppressedFallbackCount/);
    assert.match(html, /hideDuplicate\(node\)/);
    assert.match(html, /suppressFallbackCandidate\(candidate\)/);
    assert.match(html, /style\.setProperty\("display","none","important"\)/);
    assert.match(html, /style\.setProperty\("visibility","hidden","important"\)/);
    assert.match(html, /style\.setProperty\("pointer-events","none","important"\)/);
    assert.match(html, /if\(isVisibleCandidate\(candidates\[v\]\)\)visibleAfter\+=1;/);
    assert.match(html, /candidateCount/);
    assert.match(html, /originalCandidateCount/);
    assert.match(html, /fallbackCandidateCount/);
    assert.match(html, /hiddenDuplicateCount/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output hides unusable original and falls back to gnr8 button", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<div hidden><a id="scroll-top-control" class="scrolltop back-to-top" href="#top">Top</a></div>
<script>window.scrollToTop=function(){return true;}</script>
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
    assert.match(html, /isPotentiallyUsableOriginal/);
    assert.match(html, /function getPreferredOriginal\(candidates\)/);
    assert.match(html, /hasVerticalUpEvidence/);
    assert.match(html, /if\(clickable&&hasVerticalUpEvidence&&strongCount>=2\)return true;/);
    assert.match(html, /detectRoboplastOriginalCandidate/);
    assert.match(html, /finalButtonSource:"fallback"/);
    assert.match(html, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output icon normalization handles svg, stroke, font, pseudo/text, fallback, and restored markup", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<a id="scroll-top-control" class="scrolltop back-to-top" href="#top">
  <svg><path fill="#000" stroke="#000" d="M0 0L1 1"></path></svg>
  <i class="fa fa-arrow-up"></i>
  <span>↑</span>
</a>
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
    assert.match(html, /node\.style\.fill="#fff"/);
    assert.match(html, /node\.style\.stroke="#fff"/);
    assert.match(html, /node\.style\.color="#fff"/);
    assert.match(html, /\[data-gnr8-backtotop-restored\], \[data-gnr8-backtotop-restored\] \*, \[data-gnr8-backtotop-restored\]::before, \[data-gnr8-backtotop-restored\]::after/);
    assert.match(html, /\[data-gnr8-backtotop-fallback\], \[data-gnr8-backtotop-fallback\] \*, \[data-gnr8-backtotop-fallback\]::before, \[data-gnr8-backtotop-fallback\]::after/);
    assert.match(html, /iconTypeDetected:iconTypeDetected/);
    assert.match(html, /whiteForegroundApplied:true/);
    assert.match(html, /normalizeIconForeground\(existing,true,false\)/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output includes Roboplast-style floating circular up-chevron original detection without href", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body><div>roboplast</div></body></html>`,
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
    assert.match(html, /PREVIEW_BACK_TO_TOP_RUNTIME_ORIGINAL_DETECTED/);
    assert.match(html, /detectRoboplastOriginalCandidate/);
    assert.match(html, /ROBOPLAST_BLUE_CIRCLE_MIN_SIZE/);
    assert.match(html, /ROBOPLAST_BLUE_MIN_B/);
    assert.match(html, /detectRuntimeBehaviorSignals/);
    assert.match(html, /runtimeBehaviorDetected/);
    assert.match(html, /iconEvidence/);
    assert.match(html, /positionEvidence/);
    assert.match(html, /className/);
    assert.match(html, /detectionReason/);
    assert.match(html, /circularShape/);
    assert.match(html, /isBlueLike/);
    assert.match(html, /HORIZONTAL_NAV_TOKEN_LIST/);
    assert.match(html, /STRONG_UP_TOKEN_LIST/);
    assert.match(html, /hasVerticalUpEvidence/);
    assert.match(html, /hrefStrong=href==="#top"/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_FALSE_POSITIVE_EXCLUDED/);
    assert.match(html, /SLIDER_OR_HORIZONTAL_NAV_ARROW/);
    assert.match(html, /excludedFalsePositiveCount/);
    assert.match(html, /el\.style\.right="20px"/);
    assert.match(html, /el\.style\.bottom="20px"/);
    assert.match(html, /el\.removeAttribute\("data-gnr8-backtotop-restored"\)/);
    assert.match(html, /el\.removeAttribute\("data-gnr8-backtotop-hidden-duplicate"\)/);
    assert.match(html, /el\.style\.display=""/);
    assert.match(html, /el\.style\.position="fixed"/);
    assert.match(html, /fa-angle-up/);
    assert.match(html, /fa-chevron-up/);
    assert.match(html, /icon-up/);
    assert.match(html, /fixedLike/);
    assert.match(html, /bottomRightish/);
    assert.match(html, /smallButton/);
    assert.match(html, /position:style\?String\(style\.position\|\|""\):""/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output excludes slider left arrow and preserves original href top candidate", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<button id="hero-prev" class="slider arrow-left slick-prev" aria-label="previous">‹</button>
<a id="scroll-top-control" class="scrolltop back-to-top" href="#top">Top</a>
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
    assert.match(html, /PREVIEW_BACK_TO_TOP_FALSE_POSITIVE_EXCLUDED/);
    assert.match(html, /reasonCode:"SLIDER_OR_HORIZONTAL_NAV_ARROW"/);
    assert.match(html, /finalButtonSource:"original"/);
    assert.match(html, /excludedFalsePositiveCount/);
    assert.match(html, /hrefStrong=href==="#top"/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output excludes slider right arrow and injects fallback when no up evidence exists", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<button id="hero-next" class="carousel-next swiper-button-next" aria-label="next">›</button>
<script>window.legacyTopScroll=true;function onepage_up(){return true;}</script>
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
    assert.match(html, /PREVIEW_BACK_TO_TOP_FALSE_POSITIVE_EXCLUDED/);
    assert.match(html, /finalButtonSource:"fallback"/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_FALLBACK_APPLIED/);
    assert.match(html, /visibleCandidateCountAfter/);
    assert.match(html, /fallbackInjectionPrevented:false/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output guards fallback injection when runtime original exists and keeps one visible candidate", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<div>roboplast runtime original guard</div>
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
    assert.match(html, /runtime_original_rescan/);
    assert.match(html, /deduped_original_rescan/);
    assert.match(html, /fallbackInjectionPrevented:true/);
    assert.match(html, /finalButtonSource:"original"/);
    assert.match(html, /visibleCandidateCountAfter/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed output includes deterministic back-to-top accent detection heuristics", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><head><meta name="theme-color" content="#cc0000"></head><body>
<style>:root{--primary:#cc0000;--accent:#bb1111;}</style>
<a class="btn red-link" href="#top">Top</a>
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
    assert.match(html, /function pickAccentColor\(existing\)/);
    assert.match(html, /--primary/);
    assert.match(html, /meta_theme_color/);
    assert.match(html, /redBonus=/);
    assert.match(html, /function contrastColorFor\(bg\)/);
  } finally {
    restoreDeps();
  }
});

test("preview route: transformed map fallback for Roboplast remains active with back-to-top compatibility present", async () => {
  const restoreDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_1" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
<section id="m777" class="module osmap" data-req="osmap"><div class="map-shell"></div></section>
<div>Litostrojska cesta 40, Ljubljana, Slovenia</div>
<a class="onepage-up" href="#top">Top</a>
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
    assert.match(html, /PREVIEW_MAP_FALLBACK_APPLIED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_DETECTED/);
    assert.match(html, /PREVIEW_BACK_TO_TOP_RESTORED/);
    assert.doesNotMatch(html, /PREVIEW_BACK_TO_TOP_FALLBACK_APPLIED.*PREVIEW_BACK_TO_TOP_FALLBACK_APPLIED/);
  } finally {
    restoreDeps();
  }
});
