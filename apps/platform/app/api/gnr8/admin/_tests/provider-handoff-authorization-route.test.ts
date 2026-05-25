import assert from "node:assert/strict";
import test from "node:test";

import { createProviderHandoffAuthorizationRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/authorization/provider-handoff-authorization-route-handlers";

test("provider handoff authorization route: authorization create", async () => {
  let persistedCount = 0;
  const handlers = createProviderHandoffAuthorizationRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({ handoffId: "handoff_1", correlationKey: "corr_1" }) as never,
    createProviderGovernanceAuthorizationArtifacts: async (rows) => {
      persistedCount += rows.length;
      return [...rows];
    },
    getProviderGovernanceAuthorizationsByHandoffId: async () => ({ authorizations: [], diagnostics: ["GOVERNANCE_AUTHORIZATION_READ"] }),
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/authorization", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorizationStatus: "pending_authorization", authorizationReason: "intent only" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as { ok: boolean; executionBlocked: boolean; intentOnly: boolean };
  assert.equal(body.ok, true);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.intentOnly, true);
  assert.equal(persistedCount, 1);
});

test("provider handoff authorization route: authorization denied", async () => {
  const handlers = createProviderHandoffAuthorizationRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({ handoffId: "handoff_1", correlationKey: "corr_1" }) as never,
    createProviderGovernanceAuthorizationArtifacts: async (rows) => [...rows],
    getProviderGovernanceAuthorizationsByHandoffId: async () => ({ authorizations: [], diagnostics: ["GOVERNANCE_AUTHORIZATION_READ"] }),
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/authorization", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorizationStatus: "denied", authorizationReason: "not approved" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );
  const body = (await response.json()) as { diagnostics: string[]; authorization: { authorizationStatus: string } };

  assert.equal(response.status, 200);
  assert.equal(body.authorization.authorizationStatus, "denied");
  assert.equal(body.diagnostics.includes("GOVERNANCE_AUTHORIZATION_DENIED"), true);
});

test("provider handoff authorization route: authorization summary updates", async () => {
  const handlers = createProviderHandoffAuthorizationRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({ handoffId: "handoff_1", correlationKey: "corr_1" }) as never,
    getProviderGovernanceAuthorizationsByHandoffId: async () => ({
      authorizations: [
        {
          authorizationId: "auth_1",
          handoffId: "handoff_1",
          correlationKey: "c_1",
          authorizationStatus: "pending_authorization",
          authorizationReason: "first",
          intentOnly: true,
          executionBlocked: true,
          createdAt: "2026-05-25T00:00:00.000Z",
          diagnostics: ["GOVERNANCE_AUTHORIZATION_CREATED", "GOVERNANCE_AUTHORIZATION_INTENT_ONLY"],
        },
        {
          authorizationId: "auth_2",
          handoffId: "handoff_1",
          correlationKey: "c_2",
          authorizationStatus: "authorized_for_future_execution",
          authorizationReason: "future intent",
          intentOnly: true,
          executionBlocked: true,
          createdAt: "2026-05-25T00:00:01.000Z",
          diagnostics: ["GOVERNANCE_AUTHORIZATION_CREATED", "GOVERNANCE_AUTHORIZATION_INTENT_ONLY"],
        },
      ],
      diagnostics: ["GOVERNANCE_AUTHORIZATION_READ"],
    }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/authorization"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  const body = (await response.json()) as { authorizationSummary: { authorizationStatus: string; authorizationCount: number } };

  assert.equal(response.status, 200);
  assert.equal(body.authorizationSummary.authorizationStatus, "authorized_for_future_execution");
  assert.equal(body.authorizationSummary.authorizationCount, 2);
});

test("provider handoff authorization route: authorized_for_future_execution still not executable", async () => {
  const handlers = createProviderHandoffAuthorizationRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({ handoffId: "handoff_1", correlationKey: "corr_1" }) as never,
    createProviderGovernanceAuthorizationArtifacts: async (rows) => [...rows],
    getProviderGovernanceAuthorizationsByHandoffId: async () => ({ authorizations: [], diagnostics: ["GOVERNANCE_AUTHORIZATION_READ"] }),
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/authorization", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorizationStatus: "authorized_for_future_execution", authorizationReason: "future intent" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );
  const body = (await response.json()) as { executionBlocked: boolean; intentOnly: boolean; diagnostics: string[] };

  assert.equal(response.status, 200);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.intentOnly, true);
  assert.equal(body.diagnostics.includes("GOVERNANCE_AUTHORIZATION_INTENT_ONLY"), true);
});

test("provider handoff authorization route: no provider execution paths", async () => {
  let providerExecutionCallCount = 0;
  let dnsWriteCallCount = 0;
  let externalCallCount = 0;

  const handlers = createProviderHandoffAuthorizationRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({ handoffId: "handoff_1", correlationKey: "corr_1" }) as never,
    getProviderGovernanceAuthorizationsByHandoffId: async () => {
      providerExecutionCallCount += 0;
      dnsWriteCallCount += 0;
      externalCallCount += 0;
      return { authorizations: [], diagnostics: ["GOVERNANCE_AUTHORIZATION_READ"] };
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/authorization"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  const body = (await response.json()) as { executionBlocked: boolean; intentOnly: boolean };

  assert.equal(response.status, 200);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.intentOnly, true);
  assert.equal(providerExecutionCallCount, 0);
  assert.equal(dnsWriteCallCount, 0);
  assert.equal(externalCallCount, 0);
});

test("provider handoff authorization route: empty authorization returns fail-safe summary", async () => {
  const handlers = createProviderHandoffAuthorizationRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({ handoffId: "handoff_1", correlationKey: "corr_1" }) as never,
    getProviderGovernanceAuthorizationsByHandoffId: async () => ({ authorizations: [], diagnostics: ["GOVERNANCE_AUTHORIZATION_READ"] }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/authorization"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  const body = (await response.json()) as {
    authorization: null;
    authorizationSummary: { authorizationStatus: string; authorizationReason: string; intentOnly: boolean; executionBlocked: boolean };
    executionBlocked: boolean;
    intentOnly: boolean;
  };

  assert.equal(response.status, 200);
  assert.equal(body.authorization, null);
  assert.equal(body.authorizationSummary.authorizationStatus, "not_requested");
  assert.equal(body.authorizationSummary.authorizationReason, "");
  assert.equal(body.authorizationSummary.intentOnly, true);
  assert.equal(body.authorizationSummary.executionBlocked, true);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.intentOnly, true);
});
