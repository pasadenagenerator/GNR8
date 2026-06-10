import assert from "node:assert/strict";
import test from "node:test";

import { createPreviewAssetsRouteHandlers as createPreviewAssetsRouteHandlersBase } from "@/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers";

type PreviewAssetRouteOverrides = Parameters<typeof createPreviewAssetsRouteHandlersBase>[0];

function createPreviewAssetsRouteHandlers(overrides: PreviewAssetRouteOverrides = {}) {
  return createPreviewAssetsRouteHandlersBase({
    resolveRawTemplateSiteForDomainAndPath: async ({ host }) =>
      ({
        outcome: "raw_template_miss",
        host: String(host ?? ""),
        normalizedPath: "/",
        siteId: null,
        siteVersionId: null,
        domain: null,
        bindingId: null,
        status: null,
        legacyDomainSiteVersionId: null,
        activePointerSiteVersionId: null,
        activeArtifactId: null,
        diagnostics: [],
        reasonCode: "domain_not_found",
      }) as never,
    ...overrides,
  });
}

function getParams() {
  return Promise.resolve({
    siteId: "site_1",
    siteVersionId: "sv_1",
    assetPath: ["assets", "main.css"],
  });
}

test("custom-domain asset request is allowed without dashboard auth when host matches active domain binding", async () => {
  let authCalls = 0;
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => {
      authCalls += 1;
      return { actorMode: "agency_member", agencyId: "agency_1" } as never;
    },
    getRawTemplateSiteArtifact: async () =>
      ({
        id: "artifact_1",
        artifactType: "raw_template_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: "assets",
        fileMap: {},
        createdAt: "2026-04-27T00:00:00.000Z",
      }) as never,
    getRawImportedSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () =>
      ({
        mediaType: "text/css; charset=utf-8",
        sizeBytes: 44,
        sha256: "abc",
        bytes: Buffer.from(".hero{background:url('../assets/bg.jpg');}", "utf8"),
      }) as never,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/main.css", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    { params: getParams() },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(
    await response.text(),
    ".hero{background:url('/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/bg.jpg');}",
  );
  assert.equal(authCalls, 0);
});

test("active host-binding raw asset request is allowed without dashboard auth for same active site/version", async () => {
  let authCalls = 0;
  const handlers = createPreviewAssetsRouteHandlers({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "maver.app.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        siteResolution: "host_match",
        matchKind: "host_match",
        domain: null,
        bindingId: "host_binding_1",
        status: "ACTIVE",
        legacyDomainSiteVersionId: null,
        activePointerSiteVersionId: "sv_1",
        activeArtifactId: "runtime_artifact_1",
        diagnostics: [{ code: "host_match_raw_template_selected" }],
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<html><head><title>Transporti Maver d.o.o.</title></head></html>",
      }) as never,
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_miss",
        host: "maver.app.pasadenagenerator.com",
        reasonCode: "domain_not_found",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => {
      authCalls += 1;
      return { actorMode: "agency_member", agencyId: "agency_1" } as never;
    },
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://maver.si",
          finalUrl: "https://maver.si",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-06-05T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () =>
      ({
        mediaType: "text/css; charset=utf-8",
        sizeBytes: 16,
        sha256: "abc",
        bytes: Buffer.from("body{margin:0}", "utf8"),
      }) as never,
  });

  const response = await handlers.GET(
    new Request("https://maver.app.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/main.css", {
      headers: { host: "maver.app.pasadenagenerator.com" },
    }),
    { params: getParams() },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "body{margin:0}");
  assert.equal(authCalls, 0);
});

test("active host-binding raw asset request is forbidden for wrong site/version", async () => {
  let authCalls = 0;
  const handlers = createPreviewAssetsRouteHandlers({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "maver.app.pasadenagenerator.com",
        siteId: "site_active",
        siteVersionId: "sv_active",
        siteResolution: "host_match",
        matchKind: "host_match",
        domain: null,
        bindingId: "host_binding_1",
        status: "ACTIVE",
        legacyDomainSiteVersionId: null,
        activePointerSiteVersionId: "sv_active",
        activeArtifactId: "runtime_artifact_1",
        diagnostics: [{ code: "host_match_raw_template_selected" }],
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<html></html>",
      }) as never,
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_miss",
        host: "maver.app.pasadenagenerator.com",
        reasonCode: "domain_not_found",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => {
      authCalls += 1;
      return { actorMode: "agency_member", agencyId: "agency_1" } as never;
    },
  });

  const response = await handlers.GET(
    new Request("https://maver.app.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/main.css", {
      headers: { host: "maver.app.pasadenagenerator.com" },
    }),
    { params: getParams() },
  );

  assert.equal(response.status, 403);
  assert.equal(await response.text(), "forbidden");
  assert.equal(authCalls, 0);
});

test("non-matching host requires dashboard auth path", async () => {
  let authCalls = 0;
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_miss",
        host: "app.pasadenagenerator.com",
        reasonCode: "domain_not_found",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => {
      authCalls += 1;
      return { actorMode: "agency_member", agencyId: "agency_1" } as never;
    },
    getRawTemplateSiteArtifact: async () =>
      ({
        id: "artifact_1",
        artifactType: "raw_template_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: "assets",
        fileMap: {},
        createdAt: "2026-04-27T00:00:00.000Z",
      }) as never,
    getRawImportedSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () =>
      ({
        mediaType: "text/css; charset=utf-8",
        sizeBytes: 19,
        sha256: "abc",
        bytes: Buffer.from("body{color:#111;}", "utf8"),
      }) as never,
  });

  const response = await handlers.GET(new Request("https://app.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/main.css"), {
    params: getParams(),
  });

  assert.equal(response.status, 200);
  assert.equal(authCalls, 1);
});

test("custom-domain asset request is denied when host binding resolves to different site/version", async () => {
  let authCalls = 0;
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_other",
        siteVersionId: "sv_other",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_other",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => {
      authCalls += 1;
      return { actorMode: "agency_member", agencyId: "agency_1" } as never;
    },
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/main.css", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    { params: getParams() },
  );

  assert.equal(response.status, 403);
  assert.equal(await response.text(), "forbidden");
  assert.equal(authCalls, 0);
});

test("preview assets route serves persisted raw imported-site assets when available", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () =>
      ({
        mediaType: "application/javascript; charset=utf-8",
        sizeBytes: 18,
        sha256: "abc",
        bytes: Buffer.from("console.log('ok')", "utf8"),
      }) as never,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/app.js", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["assets", "app.js"],
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/javascript; charset=utf-8");
  assert.equal(await response.text(), "console.log('ok')");
});

test("preview assets route returns 200 with content-type for Maver baseline asset set", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {
          "uploads/KcGdxACT/hero-01.jpg": { path: "uploads/KcGdxACT/hero-01.jpg", mediaType: "image/jpeg", sizeBytes: 4, sha256: "h1" },
          "uploads/QBSeVQys/overlay.png": { path: "uploads/QBSeVQys/overlay.png", mediaType: "image/png", sizeBytes: 4, sha256: "h2" },
          "assets/user-style.css": { path: "assets/user-style.css", mediaType: "text/css; charset=utf-8", sizeBytes: 18, sha256: "h3" },
        },
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 3, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async ({ filePath }) => {
      if (filePath === "uploads/KcGdxACT/hero-01.jpg") {
        return { mediaType: "image/jpeg", sizeBytes: 4, sha256: "h1", bytes: Buffer.from([255, 216, 255, 217]) } as never;
      }
      if (filePath === "uploads/QBSeVQys/overlay.png") {
        return { mediaType: "image/png", sizeBytes: 4, sha256: "h2", bytes: Buffer.from([137, 80, 78, 71]) } as never;
      }
      if (filePath === "assets/user-style.css") {
        return { mediaType: "text/css; charset=utf-8", sizeBytes: 18, sha256: "h3", bytes: Buffer.from("body{color:#111;}", "utf8") } as never;
      }
      return null;
    },
  });

  const cases = [
    {
      requestUrl: "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/KcGdxACT/hero-01.jpg",
      assetPath: ["uploads", "KcGdxACT", "hero-01.jpg"],
      contentType: "image/jpeg",
    },
    {
      requestUrl: "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/QBSeVQys/overlay.png",
      assetPath: ["uploads", "QBSeVQys", "overlay.png"],
      contentType: "image/png",
    },
    {
      requestUrl: "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/user-style.css?1749115631",
      assetPath: ["assets", "user-style.css"],
      contentType: "text/css; charset=utf-8",
    },
  ];

  for (const testCase of cases) {
    const response = await handlers.GET(new Request(testCase.requestUrl, { headers: { host: "beauty-clinic.pasadenagenerator.com" } }), {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: testCase.assetPath,
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), testCase.contentType);
  }
});

test("preview assets route resolves persisted css file when asset path contains encoded query suffix", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {
          "assets/user-style.css": { path: "assets/user-style.css", mediaType: "text/css; charset=utf-8", sizeBytes: 18, sha256: "h3" },
        },
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async ({ filePath }) =>
      filePath === "assets/user-style.css"
        ? ({
            mediaType: "text/css; charset=utf-8",
            sizeBytes: 18,
            sha256: "h3",
            bytes: Buffer.from("body{color:#111;}", "utf8"),
          } as never)
        : null,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/user-style.css%3F1749115631", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["assets", "user-style.css%3F1749115631"],
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(response.headers.get("x-gnr8-preview-asset-path"), "assets/user-style.css");
});

test("preview assets route prefers raw imported-site artifact over raw template artifact when both exist", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () =>
      ({
        id: "artifact_template_1",
        artifactType: "raw_template_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: "assets",
        fileMap: {},
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteAsset: async () =>
      ({
        mediaType: "application/javascript; charset=utf-8",
        sizeBytes: 26,
        sha256: "abc",
        bytes: Buffer.from("console.log('imported-first')", "utf8"),
      }) as never,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/assets/app.js", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["assets", "app.js"],
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "console.log('imported-first')");
});

test("preview assets route resolves uploads lookup candidates on raw imported-site artifact", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async ({ filePath }) =>
      filePath === "uploads/logo.png"
        ? ({
            mediaType: "image/png",
            sizeBytes: 4,
            sha256: "abc",
            bytes: Buffer.from([137, 80, 78, 71]),
          } as never)
        : null,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/logo.png", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["logo.png"],
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-gnr8-preview-asset-path"), "uploads/logo.png");
});

test("preview assets route returns 200 for exact persisted uploads asset path", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async ({ filePath }) =>
      filePath === "uploads/oFPgBb3g/767x0_2560x0/roboplast_tiskarna_plakat_ofset_B1.jpg"
        ? ({
            mediaType: "image/jpeg",
            sizeBytes: 4,
            sha256: "abc",
            bytes: Buffer.from([255, 216, 255, 217]),
          } as never)
        : null,
  });

  const response = await handlers.GET(
    new Request(
      "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/oFPgBb3g/767x0_2560x0/roboplast_tiskarna_plakat_ofset_B1.jpg",
      { headers: { host: "beauty-clinic.pasadenagenerator.com" } },
    ),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["uploads", "oFPgBb3g", "767x0_2560x0", "roboplast_tiskarna_plakat_ofset_B1.jpg"],
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("x-gnr8-preview-asset-path"), "uploads/oFPgBb3g/767x0_2560x0/roboplast_tiskarna_plakat_ofset_B1.jpg");
});

test("preview assets route returns deterministic 404 for missing upload asset", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => null,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/missing.png", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["uploads", "missing.png"],
      }),
    },
  );

  assert.equal(response.status, 404);
  assert.equal(await response.text(), "not found");
  assert.equal(response.headers.get("x-gnr8-preview-asset-diagnostic"), "PREVIEW_ASSET_ROUTE_FILE_NOT_FOUND");
  assert.equal(response.headers.get("x-gnr8-preview-asset-miss-reason"), "missing_imported_file");
});

test("preview assets route marks missing optional pdf upload as non-blocking optional document asset", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 0, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => null,
  });

  const response = await handlers.GET(
    new Request(
      "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/GpTlYiuH/RoboplastPDFpredstavitev2022.pdf",
      { headers: { host: "beauty-clinic.pasadenagenerator.com" } },
    ),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["uploads", "GpTlYiuH", "RoboplastPDFpredstavitev2022.pdf"],
      }),
    },
  );

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-gnr8-preview-asset-miss-reason"), "missing_imported_file");
  assert.equal(response.headers.get("x-gnr8-preview-asset-reason-code"), "OPTIONAL_DOCUMENT_ASSET_MISSING");
});

test("preview assets route classifies legal prefetch URLs as prefetch noise", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({ outcome: "domain_hit", host: "beauty-clinic.pasadenagenerator.com", siteId: "site_1", siteVersionId: "sv_1", domain: "beauty-clinic.pasadenagenerator.com", status: "active", bindingId: "binding_1" }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({ id: "artifact_imported_1", artifactType: "raw_imported_site", siteId: "site_1", siteVersionId: "sv_1", entryHtmlPath: "index.html", assetBasePath: ".", fileMap: {}, metadata: {}, createdAt: "2026-05-06T00:00:00.000Z" }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => null,
  });
  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/legal1", { headers: { host: "beauty-clinic.pasadenagenerator.com" } }),
    { params: Promise.resolve({ siteId: "site_1", siteVersionId: "sv_1", assetPath: ["legal1"] }) },
  );
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-gnr8-preview-asset-miss-reason"), "prefetch_noise");
});

test("preview assets route classifies dynamic download query endpoints", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({ outcome: "domain_hit", host: "beauty-clinic.pasadenagenerator.com", siteId: "site_1", siteVersionId: "sv_1", domain: "beauty-clinic.pasadenagenerator.com", status: "active", bindingId: "binding_1" }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({ id: "artifact_imported_1", artifactType: "raw_imported_site", siteId: "site_1", siteVersionId: "sv_1", entryHtmlPath: "index.html", assetBasePath: ".", fileMap: {}, metadata: {}, createdAt: "2026-05-06T00:00:00.000Z" }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => null,
  });
  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/?downloadVcard=1", { headers: { host: "beauty-clinic.pasadenagenerator.com" } }),
    { params: Promise.resolve({ siteId: "site_1", siteVersionId: "sv_1", assetPath: [] }) },
  );
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-gnr8-preview-asset-miss-reason"), "dynamic_download_endpoint");
});

test("preview assets route returns DB lookup diagnostic on asset query failure", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => {
      throw new Error("db down");
    },
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/logo.png", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["uploads", "logo.png"],
      }),
    },
  );

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("x-gnr8-preview-asset-diagnostic"), "PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR");
});

test("preview assets route returns file read diagnostic when bytes access fails", async () => {
  const brokenAsset = {
    mediaType: "image/png",
    sizeBytes: 4,
    sha256: "abc",
    get bytes() {
      throw new Error("cannot read bytes");
    },
  };
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => brokenAsset as never,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/logo.png", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["uploads", "logo.png"],
      }),
    },
  );

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("x-gnr8-preview-asset-diagnostic"), "PREVIEW_ASSET_ROUTE_FILE_READ_ERROR");
});

test("preview assets route falls back uploads variant path to original upload path", async () => {
  const loggedEvents: string[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    loggedEvents.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    const handlers = createPreviewAssetsRouteHandlers({
      resolveDomainSiteVersionForHost: async () =>
        ({
          outcome: "domain_hit",
          host: "beauty-clinic.pasadenagenerator.com",
          siteId: "site_1",
          siteVersionId: "sv_1",
          domain: "beauty-clinic.pasadenagenerator.com",
          status: "active",
          bindingId: "binding_1",
        }) as never,
      resolveAgencyIdForSiteVersion: async () => "agency_1",
      requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
      getRawImportedSiteArtifact: async () =>
        ({
          id: "artifact_imported_1",
          artifactType: "raw_imported_site",
          siteId: "site_1",
          siteVersionId: "sv_1",
          entryHtmlPath: "index.html",
          assetBasePath: ".",
          fileMap: {},
          metadata: {
            sourceUrl: "https://example.com",
            finalUrl: "https://www.example.com",
            htmlByteLength: 123,
            diagnostics: { codes: [] },
            assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
          },
          createdAt: "2026-05-06T00:00:00.000Z",
        }) as never,
      getRawTemplateSiteArtifact: async () => null,
      getRawTemplateSiteAsset: async ({ filePath }) =>
        filePath === "uploads/VmPFXCum/image.png"
          ? ({
              mediaType: "image/png",
              sizeBytes: 4,
              sha256: "abc",
              bytes: Buffer.from([137, 80, 78, 71]),
            } as never)
          : null,
    });

    const response = await handlers.GET(
      new Request(
        "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/image.png",
        {
          headers: { host: "beauty-clinic.pasadenagenerator.com" },
        },
      ),
      {
        params: Promise.resolve({
          siteId: "site_1",
          siteVersionId: "sv_1",
          assetPath: ["uploads", "VmPFXCum", "236x0_247x0", "image.png"],
        }),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-gnr8-preview-asset-path"), "uploads/VmPFXCum/image.png");
    assert.equal(loggedEvents.some((entry) => entry.includes("CONTENT_ASSET_VARIANT_FALLBACK_USED")), true);
  } finally {
    console.info = originalInfo;
  }
});

test("preview assets route logs variant not found when uploads variant and original are missing", async () => {
  const loggedEvents: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    loggedEvents.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    const handlers = createPreviewAssetsRouteHandlers({
      resolveDomainSiteVersionForHost: async () =>
        ({
          outcome: "domain_hit",
          host: "beauty-clinic.pasadenagenerator.com",
          siteId: "site_1",
          siteVersionId: "sv_1",
          domain: "beauty-clinic.pasadenagenerator.com",
          status: "active",
          bindingId: "binding_1",
        }) as never,
      resolveAgencyIdForSiteVersion: async () => "agency_1",
      requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
      getRawImportedSiteArtifact: async () =>
        ({
          id: "artifact_imported_1",
          artifactType: "raw_imported_site",
          siteId: "site_1",
          siteVersionId: "sv_1",
          entryHtmlPath: "index.html",
          assetBasePath: ".",
          fileMap: {},
          metadata: {
            sourceUrl: "https://example.com",
            finalUrl: "https://www.example.com",
            htmlByteLength: 123,
            diagnostics: { codes: [] },
            assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
          },
          createdAt: "2026-05-06T00:00:00.000Z",
        }) as never,
      getRawTemplateSiteArtifact: async () => null,
      getRawTemplateSiteAsset: async () => null,
    });

    const response = await handlers.GET(
      new Request(
        "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/767x0_2560x0/image.png",
        {
          headers: { host: "beauty-clinic.pasadenagenerator.com" },
        },
      ),
      {
        params: Promise.resolve({
          siteId: "site_1",
          siteVersionId: "sv_1",
          assetPath: ["uploads", "VmPFXCum", "767x0_2560x0", "image.png"],
        }),
      },
    );

    assert.equal(response.status, 404);
    assert.equal(loggedEvents.some((entry) => entry.includes("CONTENT_ASSET_VARIANT_NOT_FOUND")), true);
  } finally {
    console.warn = originalWarn;
  }
});

test("preview assets route returns diagnostic 404 when file_map entry exists but file row is missing", async () => {
  const loggedEvents: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    loggedEvents.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    const handlers = createPreviewAssetsRouteHandlers({
      resolveDomainSiteVersionForHost: async () =>
        ({
          outcome: "domain_hit",
          host: "beauty-clinic.pasadenagenerator.com",
          siteId: "site_1",
          siteVersionId: "sv_1",
          domain: "beauty-clinic.pasadenagenerator.com",
          status: "active",
          bindingId: "binding_1",
        }) as never,
      resolveAgencyIdForSiteVersion: async () => "agency_1",
      requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
      getRawImportedSiteArtifact: async () =>
        ({
          id: "artifact_imported_1",
          artifactType: "raw_imported_site",
          siteId: "site_1",
          siteVersionId: "sv_1",
          entryHtmlPath: "index.html",
          assetBasePath: ".",
          fileMap: {
            "uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png": {
              path: "uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png",
              mediaType: "image/png",
              sizeBytes: 100,
              sha256: "abc",
            },
          },
          metadata: {
            sourceUrl: "https://example.com",
            finalUrl: "https://www.example.com",
            htmlByteLength: 123,
            diagnostics: { codes: [] },
            assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
          },
          createdAt: "2026-05-06T00:00:00.000Z",
        }) as never,
      getRawTemplateSiteArtifact: async () => null,
      getRawTemplateSiteAsset: async () => null,
    });

    const response = await handlers.GET(
      new Request(
        "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/ROBOPLAST-znak-02-134x136px.png",
        {
          headers: { host: "beauty-clinic.pasadenagenerator.com" },
        },
      ),
      {
        params: Promise.resolve({
          siteId: "site_1",
          siteVersionId: "sv_1",
          assetPath: ["uploads", "VmPFXCum", "236x0_247x0", "ROBOPLAST-znak-02-134x136px.png"],
        }),
      },
    );

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-gnr8-preview-asset-diagnostic"), "PREVIEW_ASSET_ROUTE_PATH_MISMATCH");
    assert.equal(response.headers.get("x-gnr8-preview-asset-miss-reason"), "missing_imported_file");
    assert.equal(loggedEvents.some((entry) => entry.includes("RAW_IMPORT_FILE_MAP_ENTRY_FOUND_WITHOUT_FILE_ROW")), true);
  } finally {
    console.warn = originalWarn;
  }
});

test("preview assets route decodes percent-encoded path segments and resolves persisted file", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_1",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async ({ filePath }) =>
      filePath === "uploads/VmPFXCum/236x0_247x0/logo mark.png"
        ? ({
            mediaType: "image/png",
            sizeBytes: 4,
            sha256: "abc",
            bytes: Buffer.from([137, 80, 78, 71]),
          } as never)
        : null,
  });

  const response = await handlers.GET(
    new Request(
      "https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/VmPFXCum/236x0_247x0/logo%20mark.png",
      {
        headers: { host: "beauty-clinic.pasadenagenerator.com" },
      },
    ),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["uploads", "VmPFXCum", "236x0_247x0", "logo%20mark.png"],
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-gnr8-preview-asset-path"), "uploads/VmPFXCum/236x0_247x0/logo mark.png");
});

test("preview assets route handles malformed percent path segments without throwing", async () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  try {
    const handlers = createPreviewAssetsRouteHandlers({
      resolveDomainSiteVersionForHost: async () =>
        ({
          outcome: "domain_hit",
          host: "beauty-clinic.pasadenagenerator.com",
          siteId: "site_1",
          siteVersionId: "sv_1",
          domain: "beauty-clinic.pasadenagenerator.com",
          status: "active",
          bindingId: "binding_1",
        }) as never,
      resolveAgencyIdForSiteVersion: async () => "agency_1",
      requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
      getRawImportedSiteArtifact: async () =>
        ({
          id: "artifact_imported_1",
          artifactType: "raw_imported_site",
          siteId: "site_1",
          siteVersionId: "sv_1",
          entryHtmlPath: "index.html",
          assetBasePath: ".",
          fileMap: {
            "uploads/bad%ZZ.png": { mediaType: "image/png", sizeBytes: 4, sha256: "abc" },
          },
          metadata: {
            sourceUrl: "https://example.com",
            finalUrl: "https://www.example.com",
            htmlByteLength: 123,
            diagnostics: { codes: [] },
            assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
          },
          createdAt: "2026-05-06T00:00:00.000Z",
        }) as never,
      getRawTemplateSiteArtifact: async () => null,
      getRawTemplateSiteAsset: async ({ filePath }) =>
        filePath === "uploads/bad%ZZ.png"
          ? ({
              mediaType: "image/png",
              sizeBytes: 4,
              sha256: "abc",
              bytes: Buffer.from([137, 80, 78, 71]),
            } as never)
          : null,
    });

    const response = await handlers.GET(
      new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/bad%ZZ.png", {
        headers: { host: "beauty-clinic.pasadenagenerator.com" },
      }),
      {
        params: Promise.resolve({
          siteId: "site_1",
          siteVersionId: "sv_1",
          assetPath: ["uploads", "bad%ZZ.png"],
        }),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-gnr8-preview-asset-path"), "uploads/bad%ZZ.png");
    assert.equal(warnings.some((entry) => String(entry[0]).includes("RAW_PREVIEW_URI_DECODE_WARNING")), true);
  } finally {
    console.warn = originalWarn;
  }
});

test("preview assets route returns explicit artifact mismatch diagnostic for site mismatch", async () => {
  const handlers = createPreviewAssetsRouteHandlers({
    resolveDomainSiteVersionForHost: async () =>
      ({
        outcome: "domain_hit",
        host: "beauty-clinic.pasadenagenerator.com",
        siteId: "site_1",
        siteVersionId: "sv_1",
        domain: "beauty-clinic.pasadenagenerator.com",
        status: "active",
        bindingId: "binding_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    requireAgencyActionContext: async () => ({ actorMode: "agency_member", agencyId: "agency_1" } as never),
    getRawImportedSiteArtifact: async () =>
      ({
        id: "artifact_imported_1",
        artifactType: "raw_imported_site",
        siteId: "site_other",
        siteVersionId: "sv_1",
        entryHtmlPath: "index.html",
        assetBasePath: ".",
        fileMap: {},
        metadata: {
          sourceUrl: "https://example.com",
          finalUrl: "https://www.example.com",
          htmlByteLength: 123,
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
        },
        createdAt: "2026-05-06T00:00:00.000Z",
      }) as never,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => null,
  });

  const response = await handlers.GET(
    new Request("https://beauty-clinic.pasadenagenerator.com/api/gnr8/runtime/preview-assets/site_1/sv_1/uploads/logo.png", {
      headers: { host: "beauty-clinic.pasadenagenerator.com" },
    }),
    {
      params: Promise.resolve({
        siteId: "site_1",
        siteVersionId: "sv_1",
        assetPath: ["uploads", "logo.png"],
      }),
    },
  );

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-gnr8-preview-asset-diagnostic"), "PREVIEW_ASSET_ROUTE_ARTIFACT_MISMATCH");
});
