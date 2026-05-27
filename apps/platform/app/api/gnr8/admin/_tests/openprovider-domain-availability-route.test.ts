import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createOpenproviderDomainAvailabilityRouteHandlers } from "@/app/api/gnr8/admin/providers/openprovider/domain-availability/openprovider-domain-availability-route-handlers";

test("openprovider availability route: requires superadmin", async () => {
  const handlers = createOpenproviderDomainAvailabilityRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: not superadmin");
    },
  });

  const response = await handlers.GET(new Request("https://example.com/api/gnr8/admin/providers/openprovider/domain-availability?domain=gnr8-test.com"));
  assert.equal(response.status, 403);
  const body = (await response.json()) as { readOnly: boolean; executionAllowed: boolean; executionBlocked: boolean; status: string };
  assert.equal(body.readOnly, true);
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.status, "failed_closed");
});

test("openprovider availability route: requires domain query", async () => {
  const handlers = createOpenproviderDomainAvailabilityRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
  });

  const response = await handlers.GET(new Request("https://example.com/api/gnr8/admin/providers/openprovider/domain-availability"));
  assert.equal(response.status, 400);
  const body = (await response.json()) as { status: string; available: string };
  assert.equal(body.status, "failed_closed");
  assert.equal(body.available, "unknown");
});

test("openprovider availability route: returns normalized availability", async () => {
  const handlers = createOpenproviderDomainAvailabilityRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    readOpenproviderDomainAvailability: async (domain: string) => ({
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      domain,
      available: true,
      status: "available",
      checkedAt: "2026-05-26T00:00:00.000Z",
      diagnostics: [
        "OPENPROVIDER_AVAILABILITY_STARTED",
        "OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED",
        "OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED",
        "OPENPROVIDER_AVAILABILITY_SUCCEEDED",
      ],
    }),
  });

  const response = await handlers.GET(new Request("https://example.com/api/gnr8/admin/providers/openprovider/domain-availability?domain=GNR8-test.com"));
  assert.equal(response.status, 200);
  const body = (await response.json()) as { readOnly: boolean; executionAllowed: boolean; executionBlocked: boolean; available: boolean; status: string; domain: string };
  assert.equal(body.readOnly, true);
  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.available, true);
  assert.equal(body.status, "available");
  assert.equal(body.domain, "gnr8-test.com");
});

test("openprovider availability route: no mutation endpoints exported", () => {
  const source = readFileSync(
    new URL("../providers/openprovider/domain-availability/route.ts", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("export const GET"), true);
  assert.equal(source.includes("export const POST"), false);
  assert.equal(source.includes("export const PUT"), false);
  assert.equal(source.includes("export const PATCH"), false);
  assert.equal(source.includes("export const DELETE"), false);
});
