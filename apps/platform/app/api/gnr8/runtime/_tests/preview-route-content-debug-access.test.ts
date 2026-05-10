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
    assert.match(html, /PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED/);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN/);
    assert.match(html, /payload\.moduleId!=="m4695"/);
    assert.match(html, /moduleEl\.classList\.contains\("module"\)/);
    assert.match(html, /moduleEl\.classList\.contains\("gallery"\)/);
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
    assert.match(injectedShim, /page1\.style\.display=controlsWired\?"grid":"none"/);
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
    assert.doesNotMatch(injectedShim, /\/\\\\\\\\\/uploads\\\\\\\\\//);
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
