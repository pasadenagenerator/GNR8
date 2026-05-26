import assert from "node:assert/strict";
import test from "node:test";

import { createOpenproviderDomainsRouteHandlers } from "@/app/api/gnr8/admin/providers/openprovider/domains/openprovider-domains-route-handlers";

test("openprovider domains route: requires superadmin", async () => {
  const handlers = createOpenproviderDomainsRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: not superadmin");
    },
  });

  const response = await handlers.GET();
  assert.equal(response.status, 403);
  const body = (await response.json()) as { executionAllowed: boolean; executionBlocked: boolean; readOnly: boolean };
  assert.equal(body.readOnly, true);
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
});

test("openprovider domains route: returns inventory with execution blocked", async () => {
  const handlers = createOpenproviderDomainsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    readOpenproviderDomainInventory: async () => ({
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      diagnostics: [
        "OPENPROVIDER_DOMAIN_INVENTORY_READ_STARTED",
        "OPENPROVIDER_READ_ONLY_BOUNDARY_CONFIRMED",
        "OPENPROVIDER_DOMAIN_INVENTORY_READ_SUCCEEDED",
      ],
      domains: [
        {
          domain: "example.com",
          provider: "openprovider",
          status: "active",
          expiryDate: "2030-01-02T00:00:00.000Z",
          nameservers: ["ns1.example.net"],
          rawRef: "op_1",
        },
      ],
    }),
  });

  const response = await handlers.GET();
  assert.equal(response.status, 200);
  const body = (await response.json()) as { executionAllowed: boolean; executionBlocked: boolean; readOnly: boolean; domains: unknown[] };
  assert.equal(body.readOnly, true);
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.domains.length, 1);
});
