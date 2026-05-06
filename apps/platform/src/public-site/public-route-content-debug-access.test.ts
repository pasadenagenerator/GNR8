import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "@/app/(public)/[[...slug]]/route";
import { __setPublicRouteDependenciesForTest } from "@/app/(public)/[[...slug]]/public-route-handlers";
import { __setPublicRuntimeRenderDependenciesForTest } from "@/src/public-site/public-runtime-render";

function mockRawTemplateDeps() {
  return __setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath: async () =>
      ({
        outcome: "raw_template_hit",
        host: "client-domain.com",
        siteId: "site_public_1",
        siteVersionId: "sv_public_1",
        domain: "client-domain.com",
        bindingId: "binding_1",
        status: "active",
        normalizedPath: "/",
        resolvedFilePath: "index.html",
        html: "<!doctype html><html><body><h1>Client Site</h1></body></html>",
      }) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics: async () => {
      throw new Error("artifact resolver should not run when raw-template resolves");
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  });
}

test("anonymous public request with __debug=content does not render debug panel", async () => {
  const restoreDeps = mockRawTemplateDeps();
  const restoreRouteDeps = __setPublicRouteDependenciesForTest({
    canShowContentDebug: async () => false,
  });

  try {
    const response = await GET(new Request("https://client-domain.com/?__debug=content") as never, {
      params: Promise.resolve({ slug: [] }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Client Site/);
    assert.doesNotMatch(html, /data-gnr8-runtime-debug="1"/);
  } finally {
    restoreRouteDeps();
    restoreDeps();
  }
});

test("authorized debug request renders debug panel", async () => {
  const restoreDeps = mockRawTemplateDeps();
  const restoreRouteDeps = __setPublicRouteDependenciesForTest({
    canShowContentDebug: async () => true,
  });

  try {
    const response = await GET(new Request("https://client-domain.com/?__debug=content") as never, {
      params: Promise.resolve({ slug: [] }),
    });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Client Site/);
    assert.match(html, /data-gnr8-runtime-debug="1"/);
  } finally {
    restoreRouteDeps();
    restoreDeps();
  }
});
