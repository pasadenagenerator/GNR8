import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderHandoffReadinessDevSeed,
  type ProviderHandoffReadinessDevSeedDependencies,
} from "@/gnr8/runtime/providers/provider-handoff-readiness-dev-seed";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

function createRecord(input: Partial<RuntimeProviderExecutionHandoffArtifactRecord> = {}): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: "handoff_seed_1",
    artifactId: "approval_seed_1",
    siteId: "dev_readiness_seed_site",
    siteVersionId: "dev_readiness_seed_site_version",
    providerId: "openprovider",
    environment: "sandbox",
    capability: "dns",
    operationKind: "upsert_dns_record",
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "ready",
    plannedJobIds: ["job_1"],
    warnings: [],
    blockers: [],
    correlationKey: "corr_seed",
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    ...input,
  };
}

function createDeps(): ProviderHandoffReadinessDevSeedDependencies {
  const record = createRecord();
  return {
    createRuntimeProviderOperationBundleFromRequest: async () =>
      ({
        bundle: { correlationKey: "corr_seed" },
        approvalRequirement: {},
        approvalArtifact: {
          artifactId: "approval_seed_1",
          siteId: record.siteId,
          siteVersionId: record.siteVersionId,
          providerId: "openprovider",
          environment: "sandbox",
          capability: "dns",
          operationKind: "upsert_dns_record",
          bundleStatus: "ready_for_manual",
          approvalStatus: "approved",
          requiredApprovals: [],
          summary: "summary",
          riskLevel: "low",
          reviewerChecklist: [],
          warnings: [],
          blockers: [],
          correlationKey: "corr_seed",
        },
        handoffArtifact: {
          handoffId: record.handoffId,
          artifactId: record.artifactId,
          siteId: record.siteId,
          siteVersionId: record.siteVersionId,
          providerId: record.providerId,
          environment: record.environment,
          capability: record.capability,
          operationKind: record.operationKind,
          approvalStatus: record.approvalStatus,
          riskLevel: record.riskLevel,
          handoffStatus: record.handoffStatus,
          plannedJobIds: record.plannedJobIds,
          warnings: record.warnings,
          blockers: record.blockers,
          correlationKey: "corr_seed",
        },
        workerPickupEvidence: {},
        correlationKey: "corr_seed",
      }) as never,
    createProviderOperationApprovalArtifacts: async () => [],
    createProviderExecutionHandoffArtifacts: async () => [],
    getProviderExecutionHandoffsByCorrelationKey: async () => [record],
    createRuntimeProviderWorkerPickupReadinessEvidence: () =>
      ({
        handoffRef: record.handoffId,
        providerRef: "openprovider",
        jobRefs: ["job_1"],
        approvalRef: record.artifactId,
        approvalStatus: "approved",
        readinessStatus: "pickup_ready",
        executionBlocked: true,
        blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
        diagnostics: ["PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"],
        nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
        correlationKey: "corr_seed",
      }) as never,
  };
}

test("provider handoff readiness dev seed: blocked in production", async () => {
  await assert.rejects(
    createProviderHandoffReadinessDevSeed({ nodeEnv: "production" }),
    /provider_handoff_readiness_dev_seed_blocked_in_production/,
  );
});

test("provider handoff readiness dev seed: returns handoff id and readiness url in dev", async () => {
  const seed = await createProviderHandoffReadinessDevSeed({ nodeEnv: "development" }, createDeps());
  assert.equal(seed.label, "DEV_TEST_ONLY_PROVIDER_HANDOFF_SEED");
  assert.equal(seed.handoffId, "handoff_seed_1");
  assert.equal(seed.readinessUiPath, "/gnr8/admin/provider-handoffs/handoff_seed_1/readiness");
  assert.equal(seed.reusedExisting, true);
  assert.equal(seed.workerPickupEvidence.executionBlocked, true);
});

test("provider handoff readiness dev seed: no provider/dns/openprovider/external execution path is invoked", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  }) as typeof fetch;

  try {
    const seed = await createProviderHandoffReadinessDevSeed({ nodeEnv: "test" }, createDeps());
    assert.equal(seed.workerPickupEvidence.executionBlocked, true);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
