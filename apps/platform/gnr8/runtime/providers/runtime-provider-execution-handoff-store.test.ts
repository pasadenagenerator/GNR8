import assert from "node:assert/strict";
import test from "node:test";

import {
  createExecutionHandoffInsertRows,
  mapExecutionHandoffArtifactRow,
  mapExecutionHandoffArtifactToRow,
} from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

function buildArtifact(input?: Partial<RuntimeProviderExecutionHandoffArtifactRecord>): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: "handoff_1",
    artifactId: "approval_artifact_1",
    siteId: "site_1",
    siteVersionId: "sv_1",
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
    correlationKey: "corr_b",
    createdAt: "2026-05-19T12:00:00.000Z",
    updatedAt: "2026-05-19T12:00:00.000Z",
    ...input,
  };
}

test("runtime provider execution handoff store: roundtrip row mapping", () => {
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

test("runtime provider execution handoff store: deterministic ordering", () => {
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

test("runtime provider execution handoff store: JSON preservation", () => {
  const artifact = buildArtifact({
    plannedJobIds: ["job_z", "job_a"],
    warnings: ["warn_b", "warn_a"],
    blockers: ["blocker_b", "blocker_a"],
  });

  const row = mapExecutionHandoffArtifactToRow(artifact);
  const roundtrip = mapExecutionHandoffArtifactRow(row);

  assert.deepEqual(roundtrip.plannedJobIds, ["job_z", "job_a"]);
  assert.deepEqual(roundtrip.warnings, ["warn_b", "warn_a"]);
  assert.deepEqual(roundtrip.blockers, ["blocker_b", "blocker_a"]);
});

test("runtime provider execution handoff store: optional siteVersionId", () => {
  const artifact = buildArtifact({ siteVersionId: undefined });

  const row = mapExecutionHandoffArtifactToRow(artifact);
  const roundtrip = mapExecutionHandoffArtifactRow(row);

  assert.equal(row.site_version_id, null);
  assert.equal(roundtrip.siteVersionId, undefined);
});

test("runtime provider execution handoff store: no mutation side effects", () => {
  const artifact = buildArtifact({
    plannedJobIds: ["job_1", "job_2"],
    warnings: ["warn_1", "warn_2"],
    blockers: ["blocker_1"],
  });

  const before = JSON.stringify(artifact);
  const beforePlannedJobIds = JSON.stringify(artifact.plannedJobIds);
  const beforeWarnings = JSON.stringify(artifact.warnings);
  const beforeBlockers = JSON.stringify(artifact.blockers);

  const row = mapExecutionHandoffArtifactToRow(artifact);
  createExecutionHandoffInsertRows([artifact]);

  assert.equal(JSON.stringify(artifact), before);
  assert.equal(JSON.stringify(artifact.plannedJobIds), beforePlannedJobIds);
  assert.equal(JSON.stringify(artifact.warnings), beforeWarnings);
  assert.equal(JSON.stringify(artifact.blockers), beforeBlockers);

  assert.equal(row.created_at, artifact.createdAt);
  assert.equal(row.updated_at, artifact.updatedAt);
});
