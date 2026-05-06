import assert from "node:assert/strict";
import test from "node:test";

import { createPreviewAssetsRouteHandlers } from "@/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/preview-assets-route-handlers";

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
