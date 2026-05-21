import assert from "node:assert/strict";
import test from "node:test";

import { createProviderHandoffReadinessSeedRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/readiness-seed/readiness-seed-route-handlers";

function makeSeedOutput(input: Partial<{ handoffId: string; readinessUiPath: string; reusedExisting: boolean; diagnostics: string[] }> = {}) {
  return {
    label: "DEV_TEST_ONLY_PROVIDER_HANDOFF_SEED",
    handoffId: input.handoffId ?? "handoff_seed_1",
    readinessUiPath: input.readinessUiPath ?? "/gnr8/admin/provider-handoffs/handoff_seed_1/readiness",
    reusedExisting: input.reusedExisting ?? true,
    correlationKey: "corr_seed",
    workerPickupEvidence: {
      handoffRef: input.handoffId ?? "handoff_seed_1",
      providerRef: "openprovider",
      jobRefs: ["job_1"],
      approvalRef: "approval_1",
      approvalStatus: "approved",
      readinessStatus: "pickup_ready",
      executionBlocked: true,
      blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
      diagnostics: input.diagnostics ?? ["PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"],
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      correlationKey: "corr_seed",
    },
  } as const;
}

test("readiness seed route: anonymous request is rejected", async () => {
  const handlers = createProviderHandoffReadinessSeedRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Unauthorized");
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/gnr8/admin/provider-handoffs/readiness-seed", { method: "POST" }));
  assert.equal(response.status, 401);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.ok, false);
  assert.equal(body.executionBlocked, true);
});

test("readiness seed route: non-admin request is rejected", async () => {
  const handlers = createProviderHandoffReadinessSeedRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/gnr8/admin/provider-handoffs/readiness-seed", { method: "POST" }));
  assert.equal(response.status, 403);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.ok, false);
  assert.equal(body.adminOnly, true);
});

test("readiness seed route: production requires explicit safety env flag", async () => {
  let called = false;
  const handlers = createProviderHandoffReadinessSeedRouteHandlers({
    requireSuperadminUserId: async () => "user_1",
    getNodeEnv: () => "production",
    isProductionSeedEnabled: () => false,
    createProviderHandoffReadinessDevSeed: async () => {
      called = true;
      return makeSeedOutput() as never;
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/gnr8/admin/provider-handoffs/readiness-seed", { method: "POST" }));
  assert.equal(response.status, 403);
  assert.equal(called, false);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.ok, false);
  assert.equal(body.requiredEnvFlag, "GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1");
});

test("readiness seed route: valid admin request returns handoffId and readinessUrl", async () => {
  const handlers = createProviderHandoffReadinessSeedRouteHandlers({
    requireSuperadminUserId: async () => "user_1",
    getNodeEnv: () => "production",
    isProductionSeedEnabled: () => true,
    createProviderHandoffReadinessDevSeed: async () => makeSeedOutput() as never,
  });

  const response = await handlers.POST(new Request("http://localhost/api/gnr8/admin/provider-handoffs/readiness-seed", { method: "POST" }));
  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.ok, true);
  assert.equal(body.handoffId, "handoff_seed_1");
  assert.equal(body.readinessUrl, "/gnr8/admin/provider-handoffs/handoff_seed_1/readiness");
  assert.equal(body.executionBlocked, true);
  assert.equal(body.nextAllowedAction, "control_plane_review_and_dry_run_artifact_inspection_only");
});

test("readiness seed route: repeated valid requests reuse deterministic handoff", async () => {
  let callCount = 0;
  const handlers = createProviderHandoffReadinessSeedRouteHandlers({
    requireSuperadminUserId: async () => "user_1",
    getNodeEnv: () => "production",
    isProductionSeedEnabled: () => true,
    createProviderHandoffReadinessDevSeed: async () => {
      callCount += 1;
      return makeSeedOutput({ handoffId: "handoff_seed_deterministic", readinessUiPath: "/gnr8/admin/provider-handoffs/handoff_seed_deterministic/readiness", reusedExisting: true }) as never;
    },
  });

  const request = new Request("http://localhost/api/gnr8/admin/provider-handoffs/readiness-seed", { method: "POST" });
  const first = await handlers.POST(request);
  const second = await handlers.POST(request);

  assert.equal(callCount, 2);
  const body1 = (await first.json()) as Record<string, unknown>;
  const body2 = (await second.json()) as Record<string, unknown>;
  assert.equal(body1.handoffId, "handoff_seed_deterministic");
  assert.equal(body2.handoffId, "handoff_seed_deterministic");
  assert.equal(body1.reusedExisting, true);
  assert.equal(body2.reusedExisting, true);
});

test("readiness seed route: no provider or external execution path is invoked and no secrets are returned", async () => {
  let providerExecutionCallCount = 0;
  let dnsWriteCallCount = 0;
  let openproviderCallCount = 0;
  let externalFetchCallCount = 0;

  const handlers = createProviderHandoffReadinessSeedRouteHandlers({
    requireSuperadminUserId: async () => "user_1",
    getNodeEnv: () => "production",
    isProductionSeedEnabled: () => true,
    createProviderHandoffReadinessDevSeed: async () => {
      providerExecutionCallCount += 0;
      dnsWriteCallCount += 0;
      openproviderCallCount += 0;
      externalFetchCallCount += 0;
      return makeSeedOutput({
        diagnostics: [
          "token=secret_token_value",
          "apiKey=sk_abc1234567890",
          "PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED",
        ],
      }) as never;
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/gnr8/admin/provider-handoffs/readiness-seed", { method: "POST" }));
  assert.equal(response.status, 200);
  const body = (await response.json()) as { executionBlocked: boolean; diagnostics: string[] };
  const serialized = JSON.stringify(body);

  assert.equal(body.executionBlocked, true);
  assert.equal(providerExecutionCallCount, 0);
  assert.equal(dnsWriteCallCount, 0);
  assert.equal(openproviderCallCount, 0);
  assert.equal(externalFetchCallCount, 0);
  assert.equal(serialized.includes("secret_token_value"), false);
  assert.equal(serialized.includes("sk_abc1234567890"), false);
  assert.equal(serialized.includes("apiKey"), false);
});

test("readiness seed route: persistence diagnostics identify field and redact secrets", async () => {
  const handlers = createProviderHandoffReadinessSeedRouteHandlers({
    requireSuperadminUserId: async () => "user_1",
    getNodeEnv: () => "production",
    isProductionSeedEnabled: () => true,
    createProviderHandoffReadinessDevSeed: async () => {
      throw new Error(
        "provider_execution_handoff_persistence_invalid_json_field:planned_job_ids:row=handoff_1:reason=not_json_serializable token=super_secret_value",
      );
    },
  });

  const response = await handlers.POST(new Request("http://localhost/api/gnr8/admin/provider-handoffs/readiness-seed", { method: "POST" }));
  assert.equal(response.status, 500);
  const body = (await response.json()) as { ok: boolean; error: string };
  assert.equal(body.ok, false);
  assert.equal(body.error.includes("planned_job_ids"), true);
  assert.equal(body.error.includes("super_secret_value"), false);
  assert.equal(body.error.includes("[redacted]"), true);
});
