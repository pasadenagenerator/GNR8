import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { setPreviewRouteDependenciesForTest } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-dependencies";

function extractInjectedGalleryRuntimeShim(html: string): string {
  const startToken = "<script>(function(){var payload=";
  const start = html.indexOf(startToken);
  assert.notEqual(start, -1, "expected injected gallery runtime shim script start token");
  const endToken = "</script>";
  const end = html.indexOf(endToken, start);
  assert.notEqual(end, -1, "expected injected gallery runtime shim script end token");
  return html.slice(start + "<script>".length, end);
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
    assert.match(html, /\/api\/gnr8\/runtime\/preview-assets\/site_preview_1\/sv_preview_1\/uploads\/gallery\/two\.jpg/);
    assert.match(html, /\/api\/other\/endpoint\?id=1/);
    assert.match(html, /PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED/);
    assert.match(html, /PREVIEW_GALLERY_INIT_COMPLETED/);
    assert.match(html, /PREVIEW_GALLERY_VISIBILITY_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_VISIBILITY_FIX_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_LAYOUT_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_LAYOUT_FIX_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_LAYOUT_GEOMETRY_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_LAYOUT_GEOMETRY_FIX_APPLIED/);
    assert.match(html, /gnr8-gallery-visibility-compat/);
    assert.match(html, /gnr8-gallery-layout-compat/);
    assert.match(html, /GALLERY_IMAGES_LOAD_BUT_HIDDEN_BY_CSS/);
    assert.match(html, /MODULE_HIDDEN_STYLE_NORMALIZED/);
    assert.match(html, /STACKED_LAYOUT_DETECTED_GRID_APPLIED/);
    assert.match(html, /hiddenImageCountBeforeFix/);
    assert.match(html, /visibleImageCountAfterFix/);
    assert.match(html, /moduleCssBefore/);
    assert.match(html, /moduleCssAfter/);
    assert.match(html, /firstImageCssBefore/);
    assert.match(html, /firstImageCssAfter/);
    assert.match(html, /payload\.moduleId==="m4695"/);
    assert.match(html, /state\.moduleEl\.classList\.contains\("module"\)/);
    assert.match(html, /state\.moduleEl\.classList\.contains\("gallery"\)/);
    assert.match(html, /imagecols\\s\*\[:=\]\\s\*\["'\]\?\(\\d\{1,2\}\)/);
    assert.match(html, /imagecols===4/);
    assert.match(html, /state\.moduleEl\.style\.visibility="visible"/);
    assert.match(html, /state\.moduleEl\.style\.opacity="1"/);
    assert.match(html, /directGridAnchors\.forEach/);
    assert.match(html, /state\.imgs\.forEach/);
    assert.match(html, /layoutContainer\.style\.gridTemplateColumns="repeat\(4, minmax\(0, 1fr\)\)"/);
    assert.match(html, /layoutContainer\.style\.gap="12px"/);
    assert.match(html, /img\.style\.setProperty\("height","auto","important"\)/);
    assert.match(html, /img\.style\.objectFit="contain"/);
    assert.match(html, /arrowsExcludedFromGrid/);
    assert.match(html, /detectedColumnCountBefore/);
    assert.match(html, /detectedColumnCountAfter/);
    assert.match(html, /selectedLayoutContainer/);
    assert.match(html, /selectedContainerClientWidth/);
    assert.match(html, /galleryAnchorCount/);
    assert.match(html, /anchorsAreDirectChildren/);
    assert.match(html, /return moduleHidden\|\|firstImageHidden\|\|firstAnchorHidden/);
    assert.match(html, /if\(computeGalleryHiddenByLoadedState\(state\)\)return"GALLERY_IMAGES_LOAD_BUT_HIDDEN_BY_CSS"/);
    assert.match(html, /if\(!state\.hasMonogalleryFn\|\|!state\.hasLightboxFn\)return"GALLERY_PLUGIN_DEPENDENCY_MISSING"/);
    const injectedShim = extractInjectedGalleryRuntimeShim(html);
    assert.doesNotThrow(() => {
      // Parsing as a function body catches malformed try/catch and similar syntax errors in inline script assembly.
      new Function(injectedShim);
    });
  } finally {
    restoreDeps();
  }
});

test("preview route: __debug=gallery_runtime injects isolated runtime-module diagnostics", async () => {
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
    assert.match(html, /PREVIEW_GALLERY_INIT_COMPLETED/);
    assert.match(html, /PREVIEW_GALLERY_VISIBILITY_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_VISIBILITY_FIX_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_LAYOUT_STATUS/);
    assert.match(html, /PREVIEW_GALLERY_LAYOUT_FIX_APPLIED/);
    assert.match(html, /PREVIEW_GALLERY_LAYOUT_GEOMETRY_STATUS/);
    assert.match(html, /GALLERY_IMAGES_LOAD_BUT_HIDDEN_BY_CSS/);
    assert.match(html, /MODULE_HIDDEN_STYLE_NORMALIZED/);
    assert.match(html, /JQUERY_READY_EXCEPTION_ISOLATED/);
    assert.match(html, /document\.getElementById\(payload\.moduleId\)/);
    assert.doesNotMatch(html, /querySelectorAll\("img"\)\.forEach\(function\(img\)/);
    assert.match(html, /payload\.moduleId!=="m4695"/);
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
