import assert from "node:assert/strict";
import test from "node:test";

import {
  createApprovalInsertRows,
  mapApprovalArtifactRow,
  mapApprovalArtifactToRow,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-store";
import type { RuntimeProviderOperationApprovalArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-operation-approval-store";

function buildArtifact(input?: Partial<RuntimeProviderOperationApprovalArtifactRecord>): RuntimeProviderOperationApprovalArtifactRecord {
  return {
    artifactId: "approval_artifact_1",
    siteId: "site_1",
    siteVersionId: "sv_1",
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
    correlationKey: "corr_b",
    createdAt: "2026-05-19T11:00:00.000Z",
    updatedAt: "2026-05-19T11:00:00.000Z",
    ...input,
  };
}

test("runtime provider operation approval store: roundtrip row mapping", () => {
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

test("runtime provider operation approval store: deterministic ordering", () => {
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

test("runtime provider operation approval store: stable correlation key", () => {
  const first = buildArtifact({ correlationKey: "corr_stable", warnings: ["z", "a"], blockers: ["b", "c"] });
  const second = buildArtifact({ correlationKey: "corr_stable", warnings: ["a", "z"], blockers: ["c", "b"] });

  const left = mapApprovalArtifactToRow(first);
  const right = mapApprovalArtifactToRow(second);

  assert.equal(left.correlation_key, right.correlation_key);
});

test("runtime provider operation approval store: no mutation side effects", () => {
  const artifact = buildArtifact({
    requiredApprovals: ["sandbox_provider_action"],
    reviewerChecklist: ["verify_provider", "verify_environment"],
    warnings: ["warn_1", "warn_2"],
    blockers: ["blocker_1"],
  });

  const before = JSON.stringify(artifact);
  const beforeRequired = JSON.stringify(artifact.requiredApprovals);
  const beforeChecklist = JSON.stringify(artifact.reviewerChecklist);
  const beforeWarnings = JSON.stringify(artifact.warnings);
  const beforeBlockers = JSON.stringify(artifact.blockers);

  const row = mapApprovalArtifactToRow(artifact);
  createApprovalInsertRows([artifact]);

  assert.equal(JSON.stringify(artifact), before);
  assert.equal(JSON.stringify(artifact.requiredApprovals), beforeRequired);
  assert.equal(JSON.stringify(artifact.reviewerChecklist), beforeChecklist);
  assert.equal(JSON.stringify(artifact.warnings), beforeWarnings);
  assert.equal(JSON.stringify(artifact.blockers), beforeBlockers);

  assert.equal(row.created_at, artifact.createdAt);
  assert.equal(row.updated_at, artifact.updatedAt);
});
