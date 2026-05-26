import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createOpenproviderDnsRouteHandlers } from "@/app/api/gnr8/admin/providers/openprovider/dns/openprovider-dns-route-handlers";

test("openprovider dns route: requires superadmin", async () => {
  const handlers = createOpenproviderDnsRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: not superadmin");
    },
  });

  const response = await handlers.GET();
  assert.equal(response.status, 403);
  const body = (await response.json()) as { readOnly: boolean; executionAllowed: boolean; executionBlocked: boolean };
  assert.equal(body.readOnly, true);
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
});

test("openprovider dns route: returns dns inventory", async () => {
  const handlers = createOpenproviderDnsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    readOpenproviderDnsRecordInventory: async () => ({
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      diagnostics: [
        "OPENPROVIDER_DNS_READ_STARTED",
        "OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED",
        "OPENPROVIDER_DNS_READ_SUCCEEDED",
      ],
      domains: [
        {
          domain: "example.com",
          records: [{ name: "@", type: "A", value: "1.2.3.4", ttl: 3600 }],
        },
      ],
    }),
  });

  const response = await handlers.GET();
  assert.equal(response.status, 200);
  const body = (await response.json()) as { domains: unknown[]; executionBlocked: boolean; executionAllowed: boolean; readOnly: boolean };
  assert.equal(body.readOnly, true);
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.domains.length, 1);
});

test("openprovider dns route: no mutation endpoints exported", () => {
  const source = readFileSync(
    new URL("../providers/openprovider/dns/route.ts", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("export const GET"), true);
  assert.equal(source.includes("export const POST"), false);
  assert.equal(source.includes("export const PUT"), false);
  assert.equal(source.includes("export const PATCH"), false);
  assert.equal(source.includes("export const DELETE"), false);
});
