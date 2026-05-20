import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeProviderExecutionHandoffArtifact } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff";
import { createRuntimeProviderWorkerPickupReadinessReport } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

function baseHandoffArtifact(
  overrides: Partial<RuntimeProviderExecutionHandoffArtifact> = {},
): RuntimeProviderExecutionHandoffArtifact {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    providerId: "mock_provider",
    environment: "sandbox",
    capability: "dns",
    operationKind: "upsert_dns_record",
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "ready",
    plannedJobIds: ["job_2", "job_1"],
    warnings: [],
    blockers: [],
    correlationKey: "handoff_correlation_1",
    ...overrides,
  };
}

test("worker pickup readiness: ready approved mock handoff", () => {
  const report = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ providerId: "mock_provider", approvalStatus: "approved", handoffStatus: "ready" }),
  );

  assert.equal(report.readinessStatus, "ready_for_worker");
  assert.deepEqual(report.missingConditions, []);
  assert.deepEqual(report.blockers, []);
});

test("worker pickup readiness: ready approved manual handoff", () => {
  const report = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ providerId: "manual", approvalStatus: "approved", handoffStatus: "ready", plannedJobIds: ["job_1"] }),
  );

  assert.equal(report.readinessStatus, "ready_for_worker");
  assert.deepEqual(report.missingConditions, []);
  assert.deepEqual(report.blockers, []);
});

test("worker pickup readiness: live blocked", () => {
  const report = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ environment: "live", handoffStatus: "blocked" }),
  );

  assert.equal(report.readinessStatus, "blocked");
  assert.equal(report.blockers.includes("live_environment_provider_execution_blocked"), true);
});

test("worker pickup readiness: blocked handoff blocked", () => {
  const report = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ handoffStatus: "blocked" }),
  );

  assert.equal(report.readinessStatus, "blocked");
  assert.equal(report.blockers.includes("handoff_status_blocked"), true);
});

test("worker pickup readiness: missing planned jobs not_ready or blocked according to rule", () => {
  const manual = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ providerId: "manual", plannedJobIds: [] }),
  );
  const executable = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ providerId: "mock_provider", plannedJobIds: [] }),
  );

  assert.equal(manual.readinessStatus, "not_ready");
  assert.equal(executable.readinessStatus, "blocked");
  assert.equal(executable.blockers.includes("executable_provider_handoff_has_no_planned_jobs"), true);
});

test("worker pickup readiness: unapproved handoff not_ready or blocked", () => {
  const notReady = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ approvalStatus: "pending", handoffStatus: "ready" }),
  );
  const blocked = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ approvalStatus: "pending", handoffStatus: "blocked" }),
  );

  assert.equal(notReady.readinessStatus, "not_ready");
  assert.equal(blocked.readinessStatus, "blocked");
  assert.equal(blocked.blockers.includes("approval_status_not_approved_when_handoff_blocked"), true);
});

test("worker pickup readiness: deterministic ordering and stable key", () => {
  const left = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ plannedJobIds: ["job_2", "job_1"], approvalStatus: "pending", handoffStatus: "blocked" }),
  );
  const right = createRuntimeProviderWorkerPickupReadinessReport(
    baseHandoffArtifact({ plannedJobIds: ["job_1", "job_2"], approvalStatus: "pending", handoffStatus: "blocked" }),
  );

  assert.deepEqual(left.requiredConditions, [
    "handoff_status_ready",
    "non_live_environment",
    "has_planned_jobs",
    "approval_status_approved",
  ]);
  assert.deepEqual(left.satisfiedConditions, ["non_live_environment", "has_planned_jobs"]);
  assert.deepEqual(left.missingConditions, ["handoff_status_ready", "approval_status_approved"]);
  assert.deepEqual(left.warnings, right.warnings);
  assert.deepEqual(left.blockers, right.blockers);
  assert.equal(left.correlationKey, right.correlationKey);
});

test("worker pickup readiness: no side effects", () => {
  const handoffArtifact = baseHandoffArtifact({ plannedJobIds: ["job_2", "job_1"], warnings: ["z", "a"], blockers: ["y", "b"] });
  const before = JSON.stringify(handoffArtifact);

  createRuntimeProviderWorkerPickupReadinessReport(handoffArtifact);

  assert.equal(JSON.stringify(handoffArtifact), before);
});
