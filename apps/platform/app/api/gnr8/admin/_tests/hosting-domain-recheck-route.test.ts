import assert from "node:assert/strict";
import test from "node:test";

import { createHostingDomainRecheckRouteHandlers } from "@/app/api/gnr8/admin/hosting-operations/[siteId]/domains/[domainId]/recheck/hosting-domain-recheck-route-handlers";

test("hosting domain recheck route: requires superadmin", async () => {
  let recheckCalls = 0;
  const handlers = createHostingDomainRecheckRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    resolveRuntimeHostingOperationsSiteIdentity: async () => ({
      requestedSiteId: "site_1",
      runtimeSiteId: "site_1",
      lookupMode: "runtime_site_id",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
    }),
    recheckHostingDomain: async () => {
      recheckCalls += 1;
      return null;
    },
  });

  const response = await handlers.POST(new Request("http://localhost/recheck", { method: "POST" }), {
    params: Promise.resolve({ siteId: "site_1", domainId: "domain_1" }),
  });

  assert.equal(response.status, 403);
  assert.equal(recheckCalls, 0);
});

test("hosting domain recheck route: rejects empty identifiers before recheck", async () => {
  let recheckCalls = 0;
  const handlers = createHostingDomainRecheckRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    resolveRuntimeHostingOperationsSiteIdentity: async () => ({
      requestedSiteId: "site_1",
      runtimeSiteId: "site_1",
      lookupMode: "runtime_site_id",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
    }),
    recheckHostingDomain: async () => {
      recheckCalls += 1;
      return null;
    },
  });

  const response = await handlers.POST(new Request("http://localhost/recheck", { method: "POST" }), {
    params: Promise.resolve({ siteId: " ", domainId: "domain_1" }),
  });

  assert.equal(response.status, 400);
  assert.equal(recheckCalls, 0);
});

test("hosting domain recheck route: returns refreshed status payload", async () => {
  let received: { siteId: string; domainId: string } | null = null;
  const handlers = createHostingDomainRecheckRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    resolveRuntimeHostingOperationsSiteIdentity: async (siteId) => ({
      requestedSiteId: siteId,
      runtimeSiteId: "runtime_site_1",
      lookupMode: "ownership_site_id",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
    }),
    recheckHostingDomain: async (input) => {
      received = { siteId: input.siteId, domainId: input.domainId };
      return {
        siteId: input.siteId,
        domainId: input.domainId,
        hostname: "www.example.com",
        previousStatus: "pending",
        newStatus: "verifying",
        diagnostics: ["DNS_INSTRUCTIONS_COMPUTED"],
        timestamp: "2026-06-01T10:00:00.000Z",
      };
    },
  });

  const response = await handlers.POST(new Request("http://localhost/recheck", { method: "POST" }), {
    params: Promise.resolve({ siteId: "ownership_site_1", domainId: "domain_1" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { siteId: "runtime_site_1", domainId: "domain_1" });
  const body = (await response.json()) as { previousStatus: string; newStatus: string; diagnostics: string[] };
  assert.equal(body.previousStatus, "pending");
  assert.equal(body.newStatus, "verifying");
  assert.deepEqual(body.diagnostics, ["DNS_INSTRUCTIONS_COMPUTED"]);
});

test("hosting domain recheck route: fail closed when site or domain is missing", async () => {
  const missingSiteHandlers = createHostingDomainRecheckRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    resolveRuntimeHostingOperationsSiteIdentity: async () => ({
      requestedSiteId: "missing",
      runtimeSiteId: null,
      lookupMode: "not_found",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
    }),
    recheckHostingDomain: async () => {
      throw new Error("should not recheck missing site");
    },
  });

  const missingSite = await missingSiteHandlers.POST(new Request("http://localhost/recheck", { method: "POST" }), {
    params: Promise.resolve({ siteId: "missing", domainId: "domain_1" }),
  });

  assert.equal(missingSite.status, 404);

  const missingDomainHandlers = createHostingDomainRecheckRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    resolveRuntimeHostingOperationsSiteIdentity: async () => ({
      requestedSiteId: "site_1",
      runtimeSiteId: "site_1",
      lookupMode: "runtime_site_id",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
    }),
    recheckHostingDomain: async () => null,
  });

  const missingDomain = await missingDomainHandlers.POST(new Request("http://localhost/recheck", { method: "POST" }), {
    params: Promise.resolve({ siteId: "site_1", domainId: "missing" }),
  });

  assert.equal(missingDomain.status, 404);
});
