import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { createProviderHandoffReadinessDevSeed } from "@/gnr8/runtime/providers/provider-handoff-readiness-dev-seed";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_TABLE_MESSAGE = `relation "public.gnr8_runtime_provider_execution_handoffs" does not exist`;
const MISSING_DB_CONFIG_MESSAGE =
  `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function getDbSkipReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
    return "Skipping DB-backed provider handoff readiness dev seed persistence smoke test: DATABASE_URL is not configured for local integration runs.";
  }
  if (error.message.includes(MISSING_TABLE_MESSAGE)) {
    return `Skipping DB-backed provider handoff readiness dev seed persistence smoke test: missing migration table public.gnr8_runtime_provider_execution_handoffs (${MISSING_TABLE_MESSAGE}).`;
  }
  return null;
}

let dbSkipReasonPromise: Promise<string | null> | null = null;

async function getRepositoryDbSkipReason(): Promise<string | null> {
  if (!dbSkipReasonPromise) {
    dbSkipReasonPromise = (async () => {
      try {
        const pool = getSuperadminPool();
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

test("provider handoff readiness dev seed: persisted handoff can be read back and readiness remains execution-blocked", async (t) => {
  if (await skipIfDbUnavailable(t)) return;

  const seed = await createProviderHandoffReadinessDevSeed({ nodeEnv: "test" });
  const persisted = await getProviderExecutionHandoffByHandoffId(seed.handoffId);

  assert.ok(persisted);
  assert.equal(persisted?.handoffId, seed.handoffId);
  assert.equal(seed.readinessUiPath, `/gnr8/admin/provider-handoffs/${seed.handoffId}/readiness`);
  assert.equal(seed.workerPickupEvidence.executionBlocked, true);
  assert.equal(seed.workerPickupEvidence.nextAllowedAction, "control_plane_review_and_dry_run_artifact_inspection_only");
  assert.equal(seed.workerPickupEvidence.diagnostics.some((entry) => entry.includes("OPENPROVIDER")), false);
  assert.equal(seed.workerPickupEvidence.diagnostics.some((entry) => entry.includes("DNS_WRITE")), false);
  assert.equal(seed.workerPickupEvidence.diagnostics.some((entry) => entry.includes("EXECUTION_PATH")), false);
});
