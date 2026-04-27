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
    getRawTemplateSiteAsset: async () =>
      ({
        mediaType: "text/css; charset=utf-8",
        sizeBytes: 19,
        sha256: "abc",
        bytes: Buffer.from("body{color:#111;}", "utf8"),
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
  assert.equal(await response.text(), "body{color:#111;}");
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
