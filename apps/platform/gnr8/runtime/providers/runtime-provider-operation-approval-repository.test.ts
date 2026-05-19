import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import {
  createApprovalInsertRows,
  mapApprovalArtifactRow,
  mapApprovalArtifactToRow,
  type RuntimeProviderOperationApprovalArtifactRecord,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-store";
import {
  createProviderOperationApprovalArtifacts,
  getProviderOperationApprovalByArtifactId,
  getProviderOperationApprovalsByCorrelationKey,
  getProviderOperationApprovalsBySite,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-repository";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_TABLE_MESSAGE = `relation "public.gnr8_runtime_provider_operation_approvals" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function buildArtifact(
  input?: Partial<RuntimeProviderOperationApprovalArtifactRecord>,
): RuntimeProviderOperationApprovalArtifactRecord {
  const nonce = randomUUID();
  return {
    artifactId: `approval_artifact_${nonce}`,
    siteId: `site_${nonce}`,
    siteVersionId: `sv_${nonce}`,
    providerId: "mock_provider",
    environment: "sandbox",
    capability: "dns",
    operationKind: "upsert_dns_record",
    bundleStatus: "ready_for_mock",
    approvalStatus: "required",
    requiredApprovals: ["sandbox_provider_action"],
    summary: "provider=mock_provider; environment=sandbox; operation=upsert_dns_record; approval=required; risk=low",
    riskLevel: "low",
    reviewerChecklist: ["verify_provider", "verify_environment"],
    warnings: ["warn_1"],
    blockers: [],
    correlationKey: `corr_${nonce}`,
    createdAt: "2026-05-19T11:00:00.000Z",
    updatedAt: "2026-05-19T11:00:00.000Z",
    ...input,
  };
}

async function cleanup(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getSuperadminPool().query(`delete from public.gnr8_runtime_provider_operation_approvals where id = any($1::text[])`, [ids]);
}

function getMissingTableSkipReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
    return "Skipping DB-backed runtime provider operation approval repository tests: DATABASE_URL is not configured for local integration runs.";
  }
  if (!error.message.includes(MISSING_TABLE_MESSAGE)) return null;
  return `Skipping DB-backed runtime provider operation approval repository tests: missing migration table public.gnr8_runtime_provider_operation_approvals (${MISSING_TABLE_MESSAGE}).`;
}

let dbSkipReasonPromise: Promise<string | null> | null = null;

async function getRepositoryDbSkipReason(): Promise<string | null> {
  if (!dbSkipReasonPromise) {
    dbSkipReasonPromise = (async () => {
      try {
        await getSuperadminPool().query(`select 1 from public.gnr8_runtime_provider_operation_approvals limit 1`);
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

test("runtime provider operation approval repository: helper row mapping roundtrip", () => {
  const artifact = buildArtifact();
  const row = mapApprovalArtifactToRow(artifact);
  const roundtrip = mapApprovalArtifactRow(row);

  assert.equal(roundtrip.artifactId, artifact.artifactId);
  assert.equal(roundtrip.siteId, artifact.siteId);
  assert.equal(roundtrip.siteVersionId, artifact.siteVersionId);
  assert.equal(roundtrip.providerId, artifact.providerId);
  assert.equal(roundtrip.environment, artifact.environment);
  assert.equal(roundtrip.capability, artifact.capability);
  assert.equal(roundtrip.operationKind, artifact.operationKind);
  assert.equal(roundtrip.approvalStatus, artifact.approvalStatus);
  assert.equal(roundtrip.riskLevel, artifact.riskLevel);
  assert.deepEqual(roundtrip.requiredApprovals, artifact.requiredApprovals);
  assert.deepEqual(roundtrip.reviewerChecklist, artifact.reviewerChecklist);
  assert.deepEqual(roundtrip.warnings, artifact.warnings);
  assert.deepEqual(roundtrip.blockers, artifact.blockers);
  assert.equal(roundtrip.correlationKey, artifact.correlationKey);
  assert.equal(roundtrip.createdAt, artifact.createdAt);
  assert.equal(roundtrip.updatedAt, artifact.updatedAt);
});

test("runtime provider operation approval repository: helper deterministic ordering", () => {
  const artifacts = [
    buildArtifact({ artifactId: "approval_artifact_c", correlationKey: "corr_c" }),
    buildArtifact({ artifactId: "approval_artifact_a", correlationKey: "corr_a" }),
    buildArtifact({ artifactId: "approval_artifact_b", correlationKey: "corr_b" }),
    buildArtifact({ artifactId: "approval_artifact_a2", correlationKey: "corr_a" }),
  ];

  const rows = createApprovalInsertRows(artifacts);
  assert.deepEqual(
    rows.map((row) => [row.correlation_key, row.id]),
    [
      ["corr_a", "approval_artifact_a"],
      ["corr_a", "approval_artifact_a2"],
      ["corr_b", "approval_artifact_b"],
      ["corr_c", "approval_artifact_c"],
    ],
  );
});

test("runtime provider operation approval repository: create/read roundtrip", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const artifact = buildArtifact();
  try {
    const inserted = await createProviderOperationApprovalArtifacts([artifact]);
    assert.equal(inserted.length, 1);
    assert.deepEqual(inserted[0], artifact);

    const byArtifactId = await getProviderOperationApprovalByArtifactId(artifact.artifactId);
    assert.deepEqual(byArtifactId, artifact);
  } finally {
    await cleanup([artifact.artifactId]);
  }
});

test("runtime provider operation approval repository: duplicate insert ignored", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const sharedCorrelation = `corr_duplicate_${randomUUID()}`;
  const first = buildArtifact({ artifactId: `approval_artifact_first_${randomUUID()}`, correlationKey: sharedCorrelation });
  const second = buildArtifact({ artifactId: `approval_artifact_second_${randomUUID()}`, correlationKey: sharedCorrelation });

  try {
    const inserted = await createProviderOperationApprovalArtifacts([second, first]);
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.artifactId, first.artifactId);
    assert.equal(inserted[0]?.correlationKey, sharedCorrelation);

    const stored = await getProviderOperationApprovalsByCorrelationKey(sharedCorrelation);
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.artifactId, first.artifactId);
  } finally {
    await cleanup([first.artifactId, second.artifactId]);
  }
});

test("runtime provider operation approval repository: deterministic site ordering", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const siteId = `site_sort_${randomUUID()}`;
  const secondCreated = "2026-05-19T11:01:00.000Z";
  const firstCreated = "2026-05-19T11:00:00.000Z";

  const a = buildArtifact({
    artifactId: "approval_artifact_sort_01",
    siteId,
    correlationKey: `corr_sort_1_${randomUUID()}`,
    createdAt: secondCreated,
    updatedAt: secondCreated,
  });
  const b = buildArtifact({
    artifactId: "approval_artifact_sort_00",
    siteId,
    correlationKey: `corr_sort_2_${randomUUID()}`,
    createdAt: firstCreated,
    updatedAt: firstCreated,
  });
  const c = buildArtifact({
    artifactId: "approval_artifact_sort_02",
    siteId,
    correlationKey: `corr_sort_3_${randomUUID()}`,
    createdAt: secondCreated,
    updatedAt: secondCreated,
  });

  try {
    await createProviderOperationApprovalArtifacts([a, b, c]);
    const bySite = await getProviderOperationApprovalsBySite(siteId);
    assert.deepEqual(
      bySite.map((entry) => entry.artifactId),
      [b.artifactId, a.artifactId, c.artifactId],
    );
  } finally {
    await cleanup([a.artifactId, b.artifactId, c.artifactId]);
  }
});

test("runtime provider operation approval repository: correlation lookup", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const sharedCorrelation = `corr_lookup_${randomUUID()}`;
  const artifact = buildArtifact({ correlationKey: sharedCorrelation });
  try {
    await createProviderOperationApprovalArtifacts([artifact]);
    const byCorrelation = await getProviderOperationApprovalsByCorrelationKey(sharedCorrelation);
    assert.equal(byCorrelation.length, 1);
    assert.equal(byCorrelation[0]?.artifactId, artifact.artifactId);
  } finally {
    await cleanup([artifact.artifactId]);
  }
});

test("runtime provider operation approval repository: no execution side effects", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;

  const artifact = buildArtifact({
    summary: "provider=mock_provider; environment=sandbox; operation=manual_instruction; approval=required; risk=low",
    warnings: ["manual_review_only"],
    blockers: ["execution_blocked"],
  });

  try {
    await createProviderOperationApprovalArtifacts([artifact]);
    const stored = await getProviderOperationApprovalByArtifactId(artifact.artifactId);

    assert.equal(stored?.bundleStatus, "ready_for_manual");
    assert.deepEqual(stored?.warnings, artifact.warnings);
    assert.deepEqual(stored?.blockers, artifact.blockers);
    assert.equal(stored?.summary.includes("risk="), true);
  } finally {
    await cleanup([artifact.artifactId]);
  }
});
