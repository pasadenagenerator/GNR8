import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { setPreviewRouteDependenciesForTest } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-dependencies";

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
    assert.match(html, /gnr8-gallery-visibility-compat/);
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
    assert.match(html, /JQUERY_READY_EXCEPTION_ISOLATED/);
    assert.match(html, /document\.getElementById\(payload\.moduleId\)/);
    assert.doesNotMatch(html, /querySelectorAll\("img"\)\.forEach\(function\(img\)/);
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
