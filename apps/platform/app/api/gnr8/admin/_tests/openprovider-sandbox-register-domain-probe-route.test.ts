import assert from "node:assert/strict";
import test from "node:test";

import { createOpenproviderSandboxRegisterDomainProbeRouteHandlers } from "@/app/api/gnr8/admin/providers/openprovider/sandbox/register-domain-probe/openprovider-sandbox-register-domain-probe-route-handlers";

test("openprovider sandbox register-domain probe route: requires superadmin", async () => {
  const handlers = createOpenproviderSandboxRegisterDomainProbeRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: not superadmin");
    },
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/providers/openprovider/sandbox/register-domain-probe", {
      method: "POST",
      body: JSON.stringify({ domain: "levi-testis.com" }),
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(response.status, 403);
  const body = (await response.json()) as { executionAllowed: boolean; executionBlocked: boolean; diagnostics: string[] };
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_BOUNDARY_CONFIRMED"), true);
});

test("openprovider sandbox register-domain probe route: validates domain", async () => {
  const handlers = createOpenproviderSandboxRegisterDomainProbeRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/providers/openprovider/sandbox/register-domain-probe", {
      method: "POST",
      body: JSON.stringify({ domain: "" }),
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { diagnostics: string[] };
  assert.equal(body.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_INVALID_DOMAIN"), true);
});

test("openprovider sandbox register-domain probe route: returns probe summary", async () => {
  const handlers = createOpenproviderSandboxRegisterDomainProbeRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    runOpenproviderSandboxRegisterDomainProbe: async () => ({
      provider: "openprovider",
      environment: "sandbox",
      adminOnly: true,
      diagnosticOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      persisted: false,
      domain: "levi-testis.com",
      probedAt: "2026-05-27T00:00:00.000Z",
      success: true,
      status: 200,
      summary: {
        topLevelKeys: ["code", "desc", "data"],
        responseCode: "0",
        responseDesc: "Command completed successfully",
      },
      diagnostics: [
        "OPENPROVIDER_SANDBOX_REGISTER_PROBE_STARTED",
        "OPENPROVIDER_SANDBOX_REGISTER_PROBE_AUTH_SUCCEEDED",
        "OPENPROVIDER_SANDBOX_REGISTER_PROBE_REQUEST_SENT",
        "OPENPROVIDER_SANDBOX_REGISTER_PROBE_SUCCEEDED",
        "OPENPROVIDER_SANDBOX_REGISTER_PROBE_BOUNDARY_CONFIRMED",
      ],
    }),
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/providers/openprovider/sandbox/register-domain-probe", {
      method: "POST",
      body: JSON.stringify({ domain: "levi-testis.com" }),
      headers: { "content-type": "application/json" },
    }),
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as { success: boolean; executionAllowed: boolean; executionBlocked: boolean; persisted: boolean; diagnostics: string[] };
  assert.equal(body.success, true);
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.persisted, false);
  assert.equal(body.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_SUCCEEDED"), true);
});
