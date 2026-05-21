import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import { createAgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";
import {
  createProviderExecutionHandoffArtifacts,
  getProviderExecutionHandoffByHandoffId,
} from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import {
  createProviderOperationApprovalArtifacts,
  getProviderOperationApprovalByArtifactId,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-repository";
import { createRuntimeProviderOperationBundleFromRequest } from "@/gnr8/runtime/providers/runtime-provider-operation-orchestrator";
import { createRuntimeProviderWorkerPickupReadinessEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_APPROVAL_TABLE_MESSAGE = `relation "public.gnr8_runtime_provider_operation_approvals" does not exist`;
const MISSING_HANDOFF_TABLE_MESSAGE = `relation "public.gnr8_runtime_provider_execution_handoffs" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function getDbSkipReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
    return "Skipping DB-backed provider orchestrator persistence smoke test: DATABASE_URL is not configured for local integration runs.";
  }
  if (error.message.includes(MISSING_APPROVAL_TABLE_MESSAGE)) {
    return `Skipping DB-backed provider orchestrator persistence smoke test: missing migration table public.gnr8_runtime_provider_operation_approvals (${MISSING_APPROVAL_TABLE_MESSAGE}).`;
  }
  if (error.message.includes(MISSING_HANDOFF_TABLE_MESSAGE)) {
    return `Skipping DB-backed provider orchestrator persistence smoke test: missing migration table public.gnr8_runtime_provider_execution_handoffs (${MISSING_HANDOFF_TABLE_MESSAGE}).`;
  }
  return null;
}

let dbSkipReasonPromise: Promise<string | null> | null = null;

async function getRepositoryDbSkipReason(): Promise<string | null> {
  if (!dbSkipReasonPromise) {
    dbSkipReasonPromise = (async () => {
      try {
        const pool = getSuperadminPool();
        await pool.query(`select 1 from public.gnr8_runtime_provider_operation_approvals limit 1`);
        await pool.query(`select 1 from public.gnr8_runtime_provider_execution_handoffs limit 1`);
        return null;
      } catch (error) {
        const skipReason = getDbSkipReason(error);
        if (skipReason) return skipReason;
        throw error;
      }
    })();
  }
  return dbSkipReasonPromise;
}

async function skipIfDbUnavailable(t: TestContext): Promise<boolean> {
  const skipReason = await getRepositoryDbSkipReason();
  if (!skipReason) return false;
  t.skip(skipReason);
  return true;
}

async function cleanup(approvalId: string, handoffId: string): Promise<void> {
  const pool = getSuperadminPool();
  await pool.query(`delete from public.gnr8_runtime_provider_execution_handoffs where id = any($1::text[])`, [[handoffId]]);
  await pool.query(`delete from public.gnr8_runtime_provider_operation_approvals where id = any($1::text[])`, [[approvalId]]);
}

test("runtime provider orchestrator persistence smoke: persisted control-plane artifacts support handoff/evidence inspection", async (t) => {
  if (await skipIfDbUnavailable(t)) return;

  const nonce = randomUUID().replace(/-/g, "");
  const output = await createRuntimeProviderOperationBundleFromRequest({
    siteId: `site_orchestrator_smoke_${nonce}`,
    siteVersionId: `sv_orchestrator_smoke_${nonce}`,
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    agencyProviderSettings: [
      createAgencyProviderSettings({
        id: `settings_openprovider_sandbox_${nonce}`,
        agencyId: `agency_${nonce}`,
        providerId: "openprovider",
        environment: "sandbox",
        credentialReference: `openprovider-sandbox-${nonce}`,
        enabled: true,
        capabilities: ["dns", "domains"],
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ],
    executionEnvironment: "sandbox",
  });

  const persistedAt = "2026-05-21T00:00:00.000Z";
  const approvalRecord = {
    ...output.approvalArtifact,
    createdAt: persistedAt,
    updatedAt: persistedAt,
  };
  const handoffRecord = {
    ...output.handoffArtifact,
    createdAt: persistedAt,
    updatedAt: persistedAt,
  };

  try {
    await createProviderOperationApprovalArtifacts([approvalRecord]);
    await createProviderExecutionHandoffArtifacts([handoffRecord]);

    const persistedApproval = await getProviderOperationApprovalByArtifactId(output.approvalArtifact.artifactId);
    const persistedHandoff = await getProviderExecutionHandoffByHandoffId(output.handoffArtifact.handoffId);

    assert.ok(persistedApproval);
    assert.ok(persistedHandoff);

    assert.equal(persistedHandoff?.artifactId, output.handoffArtifact.artifactId);
    assert.equal(persistedHandoff?.handoffId, output.handoffArtifact.handoffId);
    assert.equal(persistedHandoff?.correlationKey, output.handoffArtifact.correlationKey);
    assert.deepEqual(persistedHandoff?.plannedJobIds, output.handoffArtifact.plannedJobIds);
    assert.deepEqual(persistedHandoff?.blockers, output.handoffArtifact.blockers);
    assert.deepEqual(persistedHandoff?.warnings, output.handoffArtifact.warnings);

    const reconstructedEvidence = createRuntimeProviderWorkerPickupReadinessEvidence({
      handoffArtifact: persistedHandoff,
      executionIntent: "control_plane_simulation_only",
    });

    assert.equal(reconstructedEvidence.handoffRef, output.workerPickupEvidence.handoffRef);
    assert.equal(reconstructedEvidence.approvalRef, output.workerPickupEvidence.approvalRef);
    assert.equal(reconstructedEvidence.correlationKey, output.workerPickupEvidence.correlationKey);
    assert.equal(reconstructedEvidence.executionBlocked, true);
    assert.equal(
      reconstructedEvidence.nextAllowedAction,
      "control_plane_review_and_dry_run_artifact_inspection_only",
    );

    assert.equal(reconstructedEvidence.diagnostics.some((entry) => entry.includes("EXECUTION_PATH")), false);
    assert.equal(reconstructedEvidence.diagnostics.some((entry) => entry.includes("OPENPROVIDER")), false);
    assert.equal(reconstructedEvidence.diagnostics.some((entry) => entry.includes("DNS_WRITE")), false);

    assert.equal(persistedApproval?.artifactId, output.approvalArtifact.artifactId);
    assert.equal(persistedApproval?.correlationKey, output.approvalArtifact.correlationKey);
    assert.equal(persistedApproval?.siteId, output.approvalArtifact.siteId);
    assert.equal(persistedHandoff?.siteId, output.handoffArtifact.siteId);
  } finally {
    await cleanup(output.approvalArtifact.artifactId, output.handoffArtifact.handoffId);
  }
});
