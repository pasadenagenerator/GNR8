import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
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
  } finally {
    restoreDeps();
  }
});
