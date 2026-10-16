import assert from "node:assert/strict";
import test from "node:test";

import { createAstroRuntimeReviewRouteHandlers } from "./runtime-review-route-handlers";

const SITE_ID = "test_runtime_e2e_site_chs_astro_eval_7f13c9";
const HOST = "chs-astro-eval.staging.gnr8.test";

test("runtime review authenticates before resolving a server-owned target", async () => {
  const calls: string[] = [];
  const handlers = createAstroRuntimeReviewRouteHandlers({
    requireSuperadminUserId: async () => {
      calls.push("auth");
      throw new Error("Unauthorized");
    },
    getRuntimeSiteSummary: async () => {
      calls.push("site");
      return null;
    },
  });
  const response = await handlers.GET(request(), context());
  assert.equal(response.status, 401);
  assert.deepEqual(calls, ["auth"]);
});

test("runtime review renders only the active artifact for the server-owned staging shadow host", async () => {
  let renderInput: unknown = null;
  const handlers = createAstroRuntimeReviewRouteHandlers({
    requireSuperadminUserId: async () => "actor",
    isFeatureEnabled: () => true,
    isPreviewEnvironment: () => true,
    getRuntimeSiteSummary: async () => ({ siteId: SITE_ID, sourceUrl: `https://${HOST}/`, sourceHost: HOST }),
    getActiveHostBindingForHost: async () => ({ siteId: SITE_ID, host: HOST, status: "ACTIVE", bindingKind: "shadow" }),
    getActivePointerForSite: async () => ({
      siteVersionId: "11111111-1111-4111-8111-111111111111",
      artifactId: "22222222-2222-4222-8222-222222222222",
    }),
    renderRuntime: async (input) => {
      renderInput = input;
      return new Response("<!doctype html><title>Home | CHS</title>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  });
  const response = await handlers.GET(request(), context());
  assert.equal(response.status, 200);
  assert.deepEqual(renderInput, { path: "/", host: HOST, rawHost: HOST });
  assert.equal(response.headers.get("x-gnr8-runtime-review"), "active-artifact");
  assert.equal(response.headers.get("x-gnr8-runtime-site-id"), SITE_ID);
  assert.match(await response.text(), /Home \| CHS/);
});

test("runtime review rejects arbitrary sites, non-shadow bindings, and non-root paths", async (t) => {
  const base = {
    requireSuperadminUserId: async () => "actor",
    isFeatureEnabled: () => true,
    isPreviewEnvironment: () => true,
    getActivePointerForSite: async () => ({
      siteVersionId: "11111111-1111-4111-8111-111111111111",
      artifactId: "22222222-2222-4222-8222-222222222222",
    }),
    renderRuntime: async () => new Response("unexpected"),
  };
  await t.test("customer host", async () => {
    const handlers = createAstroRuntimeReviewRouteHandlers({
      ...base,
      getRuntimeSiteSummary: async () => ({ siteId: SITE_ID, sourceUrl: "https://customer.example/", sourceHost: "customer.example" }),
    });
    assert.equal((await handlers.GET(request(), context())).status, 404);
  });
  await t.test("cross-site binding", async () => {
    const handlers = createAstroRuntimeReviewRouteHandlers({
      ...base,
      getRuntimeSiteSummary: async () => ({ siteId: SITE_ID, sourceUrl: `https://${HOST}/`, sourceHost: HOST }),
      getActiveHostBindingForHost: async () => ({ siteId: "other-site", host: HOST, status: "ACTIVE", bindingKind: "shadow" }),
    });
    assert.equal((await handlers.GET(request(), context())).status, 404);
  });
  await t.test("non-shadow binding", async () => {
    const handlers = createAstroRuntimeReviewRouteHandlers({
      ...base,
      getRuntimeSiteSummary: async () => ({ siteId: SITE_ID, sourceUrl: `https://${HOST}/`, sourceHost: HOST }),
      getActiveHostBindingForHost: async () => ({ siteId: SITE_ID, host: HOST, status: "ACTIVE", bindingKind: "production" }),
    });
    assert.equal((await handlers.GET(request(), context())).status, 404);
  });
  await t.test("non-root path", async () => {
    const handlers = createAstroRuntimeReviewRouteHandlers({
      ...base,
      getRuntimeSiteSummary: async () => ({ siteId: SITE_ID, sourceUrl: `https://${HOST}/`, sourceHost: HOST }),
    });
    assert.equal((await handlers.GET(request("/news"), context())).status, 404);
  });
});

function request(path = "/"): Request {
  return new Request(`https://preview.example/api/gnr8/admin/runtime-review/${SITE_ID}?path=${encodeURIComponent(path)}`, {
    headers: { "x-gnr8-internal-runtime-host": "other-site.staging.gnr8.test" },
  });
}

function context() {
  return { params: Promise.resolve({ siteId: SITE_ID }) };
}
