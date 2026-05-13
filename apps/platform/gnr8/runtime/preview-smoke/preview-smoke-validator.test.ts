import assert from "node:assert/strict";
import test from "node:test";

import { runPreviewSmokeValidation, type PreviewSmokeTarget } from "@/gnr8/runtime/preview-smoke/preview-smoke-validator";
import { GET as previewRouteGet } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { setPreviewRouteDependenciesForTest } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-dependencies";
import { createPreviewAssetsRouteHandlers } from "@/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers";

function makeHeaders(values: Record<string, string>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(values)) {
    headers.set(key, value);
  }
  return headers;
}

test("preview smoke validator: reports pass with deterministic transformed fixture", async () => {
  const assetCalls: string[] = [];
  const target: PreviewSmokeTarget = {
    siteLabel: "Maver",
    expectedSiteId: "site_preview_1",
    siteVersionId: "sv_preview_1",
    identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
    requiredAssets: [
      { label: "hero", path: "uploads/KcGdxACT/hero-01.jpg", required: true },
      { label: "stylesheet", path: "assets/user-style.css", required: true },
    ],
    optionalNoiseAssets: ["legal1", "uploads/docs/missing.pdf"],
  };

  const previewHtml = `<!doctype html><html><head><title>maver transport</title></head><body>
  <a href="#" data-req="scrollTop" class="scrollIcon bottom_right">Top</a>
  <section id="m777" class="module osmap" data-req="osmap"></section>
  <section id="m4695" class="module gallery"></section>
  <script>console.info("PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");console.info("PREVIEW_GALLERY_PAGED_LAYOUT_STATUS");console.info("PREVIEW_MAP_MODULE_DETECTED");</script>
  </body></html>`;

  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async () => ({
        status: 200,
        body: previewHtml,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "transformed_artifact",
        }),
      }),
      fetchPreviewAsset: async ({ assetPath }) => {
        assetCalls.push(assetPath);
        if (assetPath === "legal1" || assetPath.endsWith(".pdf")) {
          return { status: 404, body: "missing" };
        }
        return { status: 200, body: "ok" };
      },
    },
    target,
  );

  assert.equal(summary.pass, true);
  assert.equal(summary.previewMode, "transformed");
  assert.equal(summary.sourceMode, "transformed_artifact");
  assert.equal(summary.nativeBackToTopStatus, "present");
  assert.equal(summary.mapStatus, "present");
  assert.equal(summary.galleryStatus, "present");
  assert.equal(summary.assetChecks.length, 2);
  assert.deepEqual(assetCalls.sort(), ["assets/user-style.css", "legal1", "uploads/KcGdxACT/hero-01.jpg", "uploads/docs/missing.pdf"].sort());
  assert.equal(summary.nonBlockingNoise.length, 2);
  assert.equal(summary.nonBlockingNoise[0]?.classification.length > 0, true);
});

test("preview smoke validator: fails when forbidden fallback marker appears", async () => {
  const fallbackMarker = ["PREVIEW_BACK_TO_TOP_FALLBACK", "APPLIED"].join("_");
  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async () => ({
        status: 200,
        body: `<html><body>${fallbackMarker}<a class="scrollIcon">Top</a><section class="gallery"></section><section data-req="osmap"></section>roboplast PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS</body></html>`,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "raw_template_site",
        }),
      }),
      fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
    },
    {
      siteLabel: "Roboplast",
      expectedSiteId: "site_preview_2",
      siteVersionId: "sv_preview_2",
      identitySignals: ["roboplast", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      requiredAssets: [{ label: "stylesheet", path: "assets/stylesheet/site.css", required: true }],
    },
  );

  assert.equal(summary.pass, false);
  assert.equal(summary.forbiddenMarkerChecks.some((entry) => entry.marker === fallbackMarker && !entry.ok), true);
});

test("preview smoke validator: fails when duplicated preview-assets prefix exists", async () => {
  const html = "<html><body>maver PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS <a data-req=\"scrollTop\" class=\"scrollIcon\">Top</a><div class=\"gallery\"></div><section data-req=\"osmap\"></section><img src=\"/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/uploads/x.jpg\"/></body></html>";

  const summary = await runPreviewSmokeValidation(
    {
      fetchPreviewHtml: async () => ({
        status: 200,
        body: html,
        headers: makeHeaders({
          "x-gnr8-preview-mode": "transformed",
          "x-gnr8-preview-source": "transformed_artifact",
        }),
      }),
      fetchPreviewAsset: async () => ({ status: 200, body: "ok" }),
    },
    {
      siteLabel: "Maver",
      expectedSiteId: "site_preview_1",
      siteVersionId: "sv_preview_1",
      identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
      requiredAssets: [{ label: "hero", path: "uploads/KcGdxACT/hero-01.jpg", required: true }],
    },
  );

  assert.equal(summary.pass, false);
  assert.equal(summary.forbiddenMarkerChecks.some((entry) => entry.marker === "duplicated_preview_assets_prefix_absent" && !entry.ok), true);
});

test("preview smoke validator: route harness mode validates auth-gated preview route and preview-assets locally", async () => {
  const restorePreviewDeps = setPreviewRouteDependenciesForTest({
    resolveAgencyIdForSiteVersion: async () => "agency_preview_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_preview_1", actorMode: "agency_member" }) as never,
    renderSiteVersionPreview: async () =>
      ({
        html: `<!doctype html><html><body>
          <h1>maver transport</h1>
          <a href="#" data-req="scrollTop" class="scrollIcon bottom_right">Top</a>
          <section id="m777" class="module osmap" data-req="osmap"></section>
          <section id="m4695" class="module gallery"></section>
          <img src="/api/gnr8/runtime/preview-assets/site_preview_1/sv_preview_1/uploads/KcGdxACT/hero-01.jpg"/>
          <script>console.info("PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS");console.info("PREVIEW_GALLERY_PAGED_LAYOUT_STATUS");console.info("PREVIEW_MAP_MODULE_DETECTED");</script>
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
  const assetHandlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () => ({ outcome: "domain_miss", host: "app.pasadenagenerator.com", reasonCode: "domain_not_found" }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_preview_1",
    requireAgencyActionContext: async () => ({ agencyId: "agency_preview_1", actorMode: "agency_member" }) as never,
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {
          "uploads/KcGdxACT/hero-01.jpg": { path: "uploads/KcGdxACT/hero-01.jpg", mediaType: "image/jpeg", sizeBytes: 4, sha256: "h1" },
          "assets/user-style.css": { path: "assets/user-style.css", mediaType: "text/css; charset=utf-8", sizeBytes: 18, sha256: "h2" },
        },
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 2, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async ({ filePath }) => {
      if (filePath === "uploads/KcGdxACT/hero-01.jpg") {
        return { mediaType: "image/jpeg", sizeBytes: 4, sha256: "h1", bytes: Buffer.from([255, 216, 255, 217]) } as never;
      }
      if (filePath === "assets/user-style.css") {
        return { mediaType: "text/css; charset=utf-8", sizeBytes: 18, sha256: "h2", bytes: Buffer.from("body{color:#111;}", "utf8") } as never;
      }
      return null;
    },
  });

  try {
    const summary = await runPreviewSmokeValidation(
      {
        fetchPreviewHtml: async ({ siteVersionId, previewPath, previewMode }) => {
          const response = await previewRouteGet(
            new Request(
              `https://app.pasadenagenerator.com/api/gnr8/runtime/versions/${siteVersionId}/preview?mode=${previewMode}&path=${encodeURIComponent(previewPath)}`,
              { headers: { host: "app.pasadenagenerator.com", "x-forwarded-host": "app.pasadenagenerator.com" } },
            ),
            { params: Promise.resolve({ siteVersionId }) },
          );
          return { status: response.status, body: await response.text(), headers: response.headers };
        },
        fetchPreviewAsset: async ({ siteId, siteVersionId, assetPath }) => {
          const response = await assetHandlers.GET(
            new Request(`https://app.pasadenagenerator.com/api/gnr8/runtime/preview-assets/${siteId}/${siteVersionId}/${assetPath}`),
            {
              params: Promise.resolve({
                siteId,
                siteVersionId,
                assetPath: assetPath.split("/").filter(Boolean),
              }),
            },
          );
          return { status: response.status, body: await response.text(), headers: response.headers };
        },
      },
      {
        siteLabel: "Maver",
        expectedSiteId: "site_preview_1",
        siteVersionId: "sv_preview_1",
        identitySignals: ["maver", "PREVIEW_BACK_TO_TOP_NATIVE_ONLY_STATUS"],
        requiredAssets: [
          { label: "hero", path: "uploads/KcGdxACT/hero-01.jpg", required: true },
          { label: "stylesheet", path: "assets/user-style.css", required: true },
        ],
      },
    );

    assert.equal(summary.previewStatus, 200);
    assert.equal(summary.previewMode, "transformed");
    assert.equal(summary.sourceMode, "preview");
    assert.equal(summary.assetChecks.every((entry) => entry.status === 200), true);
    assert.equal(summary.pass, true);
  } finally {
    restorePreviewDeps();
  }
});
