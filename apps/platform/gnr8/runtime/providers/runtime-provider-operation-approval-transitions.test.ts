import assert from "node:assert/strict";
import test from "node:test";

import {
  applyProviderOperationApprovalStateTransition,
  canTransitionProviderOperationApprovalState,
  createProviderOperationApprovalTransitionReport,
  type ProviderOperationApprovalState,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-transitions";
import type { RuntimeProviderOperationApprovalArtifact } from "@/gnr8/runtime/providers/runtime-provider-operation-approval-artifact";

function buildApprovalArtifact(overrides: Partial<RuntimeProviderOperationApprovalArtifact> = {}): RuntimeProviderOperationApprovalArtifact {
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
    warnings: [],
    blockers: [],
    correlationKey: "artifact_corr",
    ...overrides,
  };
}

function expectApplied(previousState: ProviderOperationApprovalState, requestedState: ProviderOperationApprovalState): void {
  const report = createProviderOperationApprovalTransitionReport(previousState, requestedState);
  assert.equal(report.status, "applied");
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.blockers, []);
}

test("runtime provider operation approval transitions: all allowed transitions", () => {
  expectApplied("pending", "approved");
  expectApplied("pending", "rejected");
  expectApplied("pending", "expired");
  expectApplied("pending", "blocked");

  assert.equal(canTransitionProviderOperationApprovalState("pending", "approved"), true);
  assert.equal(canTransitionProviderOperationApprovalState("pending", "blocked"), true);
});

test("runtime provider operation approval transitions: approved terminal", () => {
  const requested: ProviderOperationApprovalState[] = ["pending", "approved", "rejected", "expired", "blocked"];
  for (const requestedState of requested) {
    const report = createProviderOperationApprovalTransitionReport("approved", requestedState);
    assert.equal(report.status, "rejected");
    assert.deepEqual(report.warnings, ["invalid_transition"]);
  }
});

test("runtime provider operation approval transitions: rejected terminal", () => {
  const requested: ProviderOperationApprovalState[] = ["pending", "approved", "rejected", "expired", "blocked"];
  for (const requestedState of requested) {
    const report = createProviderOperationApprovalTransitionReport("rejected", requestedState);
    assert.equal(report.status, "rejected");
    assert.deepEqual(report.warnings, ["invalid_transition"]);
  }
});

test("runtime provider operation approval transitions: expired terminal", () => {
  const requested: ProviderOperationApprovalState[] = ["pending", "approved", "rejected", "expired", "blocked"];
  for (const requestedState of requested) {
    const report = createProviderOperationApprovalTransitionReport("expired", requestedState);
    assert.equal(report.status, "rejected");
    assert.deepEqual(report.warnings, ["invalid_transition"]);
  }
});

test("runtime provider operation approval transitions: blocked terminal", () => {
  const requested: ProviderOperationApprovalState[] = ["pending", "approved", "rejected", "expired", "blocked"];
  for (const requestedState of requested) {
    const report = createProviderOperationApprovalTransitionReport("blocked", requestedState);
    assert.equal(report.status, "rejected");
    assert.deepEqual(report.warnings, ["invalid_transition"]);
  }
});

test("runtime provider operation approval transitions: blocked artifact cannot approve", () => {
  const report = applyProviderOperationApprovalStateTransition(
    buildApprovalArtifact({ approvalStatus: "blocked" }),
    "pending",
    "approved",
  );
  assert.equal(report.status, "rejected");
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.blockers, ["blocked_artifact_cannot_be_approved"]);
});

test("runtime provider operation approval transitions: live artifact cannot approve", () => {
  const report = applyProviderOperationApprovalStateTransition(
    buildApprovalArtifact({ environment: "live" }),
    "pending",
    "approved",
  );
  assert.equal(report.status, "rejected");
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.blockers, ["live_environment_cannot_be_approved"]);
});

test("runtime provider operation approval transitions: stable key and deterministic blocker ordering", () => {
  const first = buildApprovalArtifact({ artifactId: "approval_artifact_stable", environment: "live", approvalStatus: "blocked" });
  const second = buildApprovalArtifact({ artifactId: "approval_artifact_stable", environment: "live", approvalStatus: "blocked" });

  const left = applyProviderOperationApprovalStateTransition(first, "pending", "approved");
  const right = applyProviderOperationApprovalStateTransition(second, "pending", "approved");

  assert.deepEqual(left.blockers, ["blocked_artifact_cannot_be_approved", "live_environment_cannot_be_approved"]);
  assert.equal(left.correlationKey, right.correlationKey);
});

test("runtime provider operation approval transitions: no mutation side effects", () => {
  const artifact = buildApprovalArtifact({
    warnings: ["warn_1"],
    blockers: ["blocker_1"],
  });
  const before = JSON.stringify(artifact);

  applyProviderOperationApprovalStateTransition(artifact, "pending", "approved");

  assert.equal(JSON.stringify(artifact), before);
});
