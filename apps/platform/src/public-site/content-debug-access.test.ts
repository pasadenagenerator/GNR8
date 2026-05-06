import assert from "node:assert/strict";
import test from "node:test";

import { ResolveCurrentAgencyError } from "@/src/auth/resolve-current-agency";
import { __setContentDebugAccessDependenciesForTest, canShowContentDebug } from "@/src/public-site/content-debug-access";

test("content debug access: valid token grants access", async () => {
  const previous = process.env.GNR8_CONTENT_DEBUG_TOKEN;
  process.env.GNR8_CONTENT_DEBUG_TOKEN = "secret-token";
  const restore = __setContentDebugAccessDependenciesForTest({
    requireSuperadminUserId: async () => {
      throw new Error("Unauthorized");
    },
    resolveCurrentUserAgency: async () => {
      throw new Error("should not be called when token is valid");
    },
  });

  try {
    const allowed = await canShowContentDebug(
      new Request("https://example.com/?__debug=content", { headers: { "x-gnr8-debug-token": "secret-token" } }),
    );
    assert.equal(allowed, true);
  } finally {
    restore();
    if (previous === undefined) delete process.env.GNR8_CONTENT_DEBUG_TOKEN;
    else process.env.GNR8_CONTENT_DEBUG_TOKEN = previous;
  }
});

test("content debug access: invalid token does not grant access", async () => {
  const previous = process.env.GNR8_CONTENT_DEBUG_TOKEN;
  process.env.GNR8_CONTENT_DEBUG_TOKEN = "secret-token";
  const restore = __setContentDebugAccessDependenciesForTest({
    requireSuperadminUserId: async () => {
      throw new Error("Unauthorized");
    },
    resolveCurrentUserAgency: async () => {
      throw new ResolveCurrentAgencyError("UNAUTHORIZED", "Unauthorized");
    },
  });

  try {
    const allowed = await canShowContentDebug(
      new Request("https://example.com/?__debug=content", { headers: { "x-gnr8-debug-token": "wrong-token" } }),
    );
    assert.equal(allowed, false);
  } finally {
    restore();
    if (previous === undefined) delete process.env.GNR8_CONTENT_DEBUG_TOKEN;
    else process.env.GNR8_CONTENT_DEBUG_TOKEN = previous;
  }
});
