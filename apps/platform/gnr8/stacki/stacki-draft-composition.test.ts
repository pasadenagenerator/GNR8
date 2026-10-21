import test from "node:test";
import assert from "node:assert/strict";
import { createConfiguredStackiDraftRoutes } from "./stacki-draft-composition";
import * as route from "../../app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/stacki-drafts/[siteVersionId]/route";
import * as prepareRoute from "../../app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/stacki-drafts/[siteVersionId]/prepare/route";
import * as sessionRoute from "../../app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/stacki-drafts/[siteVersionId]/session/route";

test("configured route remains off without explicit activation and performs no provider call", async () => {
  const previous = process.env.GNR8_STACKI_DRAFTS_ENABLED;
  delete process.env.GNR8_STACKI_DRAFTS_ENABLED;
  try {
    const context = { params: Promise.resolve({ clientId: "unused", siteId: "unused", siteVersionId: "unused" }) };
    const request = new Request("https://gnr8.invalid/checkpoint");
    const configured = createConfiguredStackiDraftRoutes();
    for (const handler of [configured.GET, route.GET, route.POST, configured.PREPARE, prepareRoute.POST]) {
      const response = await handler(request, context);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { ok: false, reason: "STACKI_DRAFTS_DISABLED" });
    }
    assert.equal(route.runtime, "nodejs");
    assert.equal(route.dynamic, "force-dynamic");
    assert.equal(prepareRoute.runtime, "nodejs");
    assert.equal(prepareRoute.dynamic, "force-dynamic");
    const sessionResponse = await sessionRoute.POST(request, context);
    assert.equal(sessionResponse.status, 404);
    assert.equal((await sessionResponse.json()).reason, "STACKI_SESSIONS_DISABLED");
  } finally {
    if (previous === undefined) delete process.env.GNR8_STACKI_DRAFTS_ENABLED;
    else process.env.GNR8_STACKI_DRAFTS_ENABLED = previous;
  }
});
