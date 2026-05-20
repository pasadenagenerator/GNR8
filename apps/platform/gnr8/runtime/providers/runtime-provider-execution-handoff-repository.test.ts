import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import {
  createExecutionHandoffInsertRows,
  mapExecutionHandoffArtifactRow,
  mapExecutionHandoffArtifactToRow,
  type RuntimeProviderExecutionHandoffArtifactRecord,
} from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import {
  createProviderExecutionHandoffArtifacts,
  getProviderExecutionHandoffByHandoffId,
  getProviderExecutionHandoffsByCorrelationKey,
  getProviderExecutionHandoffsBySite,
} from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_TABLE_MESSAGE = `relation "public.gnr8_runtime_provider_execution_handoffs" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function buildArtifact(
  input?: Partial<RuntimeProviderExecutionHandoffArtifactRecord>,
): RuntimeProviderExecutionHandoffArtifactRecord {
  const nonce = randomUUID();
  return {
    handoffId: `handoff_${nonce}`,
    artifactId: `approval_artifact_${nonce}`,
    siteId: `site_${nonce}`,
    siteVersionId: `sv_${nonce}`,
    providerId: "mock_provider",
    environment: "sandbox",
    capability: "dns",
    operationKind: "upsert_dns_record",
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "ready",
    plannedJobIds: ["job_1", "job_2"],
    warnings: ["warn_1"],
    blockers: [],
    correlationKey: `corr_${nonce}`,
    createdAt: "2026-05-19T12:00:00.000Z",
    updatedAt: "2026-05-19T12:00:00.000Z",
    ...input,
  };
}

async function cleanup(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getSuperadminPool().query(`delete from public.gnr8_runtime_provider_execution_handoffs where id = any($1::text[])`, [ids]);
}

function getMissingTableSkipReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
    return "Skipping DB-backed runtime provider execution handoff repository tests: DATABASE_URL is not configured for local integration runs.";
  }
  if (!error.message.includes(MISSING_TABLE_MESSAGE)) return null;
  return `Skipping DB-backed runtime provider execution handoff repository tests: missing migration table public.gnr8_runtime_provider_execution_handoffs (${MISSING_TABLE_MESSAGE}).`;
}

let dbSkipReasonPromise: Promise<string | null> | null = null;

async function getRepositoryDbSkipReason(): Promise<string | null> {
  if (!dbSkipReasonPromise) {
    dbSkipReasonPromise = (async () => {
      try {
        await getSuperadminPool().query(`select 1 from public.gnr8_runtime_provider_execution_handoffs limit 1`);
        return null;
      } catch (error) {
        const skipReason = getMissingTableSkipReason(error);
        if (skipReason) return skipReason;
        throw error;
      }
    })();
  }
  return dbSkipReasonPromise;
}

async function skipIfRepositoryTableMissing(t: TestContext): Promise<boolean> {
  const skipReason = await getRepositoryDbSkipReason();
  if (!skipReason) return false;
  t.skip(skipReason);
  return true;
}

test("runtime provider execution handoff repository: helper row mapping roundtrip", () => {
  const artifact = buildArtifact();
  const row = mapExecutionHandoffArtifactToRow(artifact);
  const roundtrip = mapExecutionHandoffArtifactRow(row);

  assert.equal(roundtrip.handoffId, artifact.handoffId);
  assert.equal(roundtrip.artifactId, artifact.artifactId);
  assert.equal(roundtrip.siteId, artifact.siteId);
  assert.equal(roundtrip.siteVersionId, artifact.siteVersionId);
  assert.equal(roundtrip.providerId, artifact.providerId);
  assert.equal(roundtrip.environment, artifact.environment);
  assert.equal(roundtrip.capability, artifact.capability);
  assert.equal(roundtrip.operationKind, artifact.operationKind);
  assert.equal(roundtrip.approvalStatus, artifact.approvalStatus);
  assert.equal(roundtrip.riskLevel, artifact.riskLevel);
  assert.equal(roundtrip.handoffStatus, artifact.handoffStatus);
  assert.deepEqual(roundtrip.plannedJobIds, artifact.plannedJobIds);
  assert.deepEqual(roundtrip.warnings, artifact.warnings);
  assert.deepEqual(roundtrip.blockers, artifact.blockers);
  assert.equal(roundtrip.correlationKey, artifact.correlationKey);
  assert.equal(roundtrip.createdAt, artifact.createdAt);
  assert.equal(roundtrip.updatedAt, artifact.updatedAt);
});

test("runtime provider execution handoff repository: helper deterministic ordering", () => {
  const artifacts = [
    buildArtifact({ handoffId: "handoff_c", correlationKey: "corr_c" }),
    buildArtifact({ handoffId: "handoff_a", correlationKey: "corr_a" }),
    buildArtifact({ handoffId: "handoff_b", correlationKey: "corr_b" }),
    buildArtifact({ handoffId: "handoff_a2", correlationKey: "corr_a" }),
  ];

  const rows = createExecutionHandoffInsertRows(artifacts);
  assert.deepEqual(
    rows.map((row) => [row.correlation_key, row.id]),
    [
      ["corr_a", "handoff_a"],
      ["corr_a", "handoff_a2"],
      ["corr_b", "handoff_b"],
      ["corr_c", "handoff_c"],
    ],
  );
});

test("runtime provider execution handoff repository: create/read roundtrip", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const artifact = buildArtifact();
  try {
    const inserted = await createProviderExecutionHandoffArtifacts([artifact]);
    assert.equal(inserted.length, 1);
    assert.deepEqual(inserted[0], artifact);

    const byHandoffId = await getProviderExecutionHandoffByHandoffId(artifact.handoffId);
    assert.deepEqual(byHandoffId, artifact);
  } finally {
    await cleanup([artifact.handoffId]);
  }
});

test("runtime provider execution handoff repository: duplicate insert ignored", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const sharedCorrelation = `corr_duplicate_${randomUUID()}`;
  const first = buildArtifact({ handoffId: `handoff_first_${randomUUID()}`, correlationKey: sharedCorrelation });
  const second = buildArtifact({ handoffId: `handoff_second_${randomUUID()}`, correlationKey: sharedCorrelation });

  try {
    const inserted = await createProviderExecutionHandoffArtifacts([second, first]);
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.handoffId, first.handoffId);
    assert.equal(inserted[0]?.correlationKey, sharedCorrelation);

    const stored = await getProviderExecutionHandoffsByCorrelationKey(sharedCorrelation);
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.handoffId, first.handoffId);
  } finally {
    await cleanup([first.handoffId, second.handoffId]);
  }
});

test("runtime provider execution handoff repository: deterministic site ordering", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const siteId = `site_sort_${randomUUID()}`;
  const secondCreated = "2026-05-19T12:01:00.000Z";
  const firstCreated = "2026-05-19T12:00:00.000Z";

  const a = buildArtifact({
    handoffId: "handoff_sort_01",
    siteId,
    correlationKey: `corr_sort_1_${randomUUID()}`,
    createdAt: secondCreated,
    updatedAt: secondCreated,
  });
  const b = buildArtifact({
    handoffId: "handoff_sort_00",
    siteId,
    correlationKey: `corr_sort_2_${randomUUID()}`,
    createdAt: firstCreated,
    updatedAt: firstCreated,
  });
  const c = buildArtifact({
    handoffId: "handoff_sort_02",
    siteId,
    correlationKey: `corr_sort_3_${randomUUID()}`,
    createdAt: secondCreated,
    updatedAt: secondCreated,
  });

  try {
    await createProviderExecutionHandoffArtifacts([a, b, c]);
    const bySite = await getProviderExecutionHandoffsBySite(siteId);
    assert.deepEqual(
      bySite.map((entry) => entry.handoffId),
      [b.handoffId, a.handoffId, c.handoffId],
    );
  } finally {
    await cleanup([a.handoffId, b.handoffId, c.handoffId]);
  }
});

test("runtime provider execution handoff repository: correlation lookup", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const sharedCorrelation = `corr_lookup_${randomUUID()}`;
  const artifact = buildArtifact({ correlationKey: sharedCorrelation });
  try {
    await createProviderExecutionHandoffArtifacts([artifact]);
    const byCorrelation = await getProviderExecutionHandoffsByCorrelationKey(sharedCorrelation);
    assert.equal(byCorrelation.length, 1);
    assert.equal(byCorrelation[0]?.handoffId, artifact.handoffId);
  } finally {
    await cleanup([artifact.handoffId]);
  }
});

test("runtime provider execution handoff repository: no execution side effects", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const artifact = buildArtifact({
    handoffStatus: "blocked",
    plannedJobIds: ["job_manual_only"],
    warnings: ["manual_review_only"],
    blockers: ["execution_blocked"],
  });

  try {
    await createProviderExecutionHandoffArtifacts([artifact]);
    const stored = await getProviderExecutionHandoffByHandoffId(artifact.handoffId);

    assert.equal(stored?.handoffStatus, "blocked");
    assert.deepEqual(stored?.plannedJobIds, artifact.plannedJobIds);
    assert.deepEqual(stored?.warnings, artifact.warnings);
    assert.deepEqual(stored?.blockers, artifact.blockers);
  } finally {
    await cleanup([artifact.handoffId]);
  }
});
