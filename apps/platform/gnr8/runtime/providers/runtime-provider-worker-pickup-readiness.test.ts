import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeProviderExecutionHandoffArtifact } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff";
import {
  createRuntimeProviderWorkerPickupReadinessEvidence,
  createRuntimeProviderWorkerPickupReadinessReport,
  simulateRuntimeProviderWorkerPickupReadiness,
} from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

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

test("worker pickup simulation: approved handoff is pickup-ready but execution-blocked", () => {
  const result = simulateRuntimeProviderWorkerPickupReadiness({
    handoffArtifact: baseHandoffArtifact({ approvalStatus: "approved", handoffStatus: "ready" }),
  });

  assert.equal(result.readinessStatus, "pickup_ready");
  assert.equal(result.executionBlocked, true);
  assert.deepEqual(result.diagnostics, [
    { code: "WORKER_PICKUP_SIMULATION_STARTED", reasonCode: "SIMULATION_STARTED" },
    {
      code: "WORKER_PICKUP_SIMULATION_READY_BLOCKED",
      reasonCode: "PICKUP_READY_EXECUTION_BLOCKED_BY_CONTROL_PLANE_BOUNDARY",
    },
  ]);
  assert.equal(result.nextAllowedAction, "control_plane_review_and_dry_run_artifact_inspection_only");
});

test("worker pickup simulation: missing required handoff data fails closed", () => {
  const result = simulateRuntimeProviderWorkerPickupReadiness({
    handoffArtifact: { ...baseHandoffArtifact(), handoffId: " ", plannedJobIds: undefined },
  });

  assert.equal(result.readinessStatus, "failed_closed");
  assert.equal(result.executionBlocked, true);
  assert.equal(result.blockedReasons.some((reason) => reason.includes("missing_required_handoff_fields")), true);
  assert.equal(
    result.diagnostics.some((entry) => entry.code === "WORKER_PICKUP_SIMULATION_FAILED_CLOSED"),
    true,
  );
});

test("worker pickup simulation: not-approved handoff is not pickup-ready", () => {
  const result = simulateRuntimeProviderWorkerPickupReadiness({
    handoffArtifact: baseHandoffArtifact({ approvalStatus: "pending", handoffStatus: "ready" }),
  });

  assert.equal(result.readinessStatus, "pickup_not_ready");
  assert.equal(result.executionBlocked, true);
  assert.equal(result.blockedReasons.includes("approval_status_approved"), true);
  assert.deepEqual(result.diagnostics, [
    { code: "WORKER_PICKUP_SIMULATION_STARTED", reasonCode: "SIMULATION_STARTED" },
    { code: "WORKER_PICKUP_SIMULATION_NOT_READY", reasonCode: "PICKUP_NOT_READY_FROM_HANDOFF_CONDITIONS" },
  ]);
});

test("worker pickup simulation: execution intent is explicitly blocked", () => {
  const result = simulateRuntimeProviderWorkerPickupReadiness({
    handoffArtifact: baseHandoffArtifact(),
    executionIntent: "execute",
  });

  assert.equal(result.readinessStatus, "pickup_not_ready");
  assert.equal(result.executionBlocked, true);
  assert.deepEqual(result.blockedReasons, ["execution_intent_blocked"]);
  assert.deepEqual(result.diagnostics, [
    { code: "WORKER_PICKUP_SIMULATION_STARTED", reasonCode: "SIMULATION_STARTED" },
    { code: "WORKER_PICKUP_SIMULATION_EXECUTION_INTENT_BLOCKED", reasonCode: "EXECUTION_INTENT_NOT_ALLOWED" },
  ]);
});

test("worker pickup simulation: deterministic and stable shape", () => {
  const left = simulateRuntimeProviderWorkerPickupReadiness({
    handoffArtifact: baseHandoffArtifact({ plannedJobIds: ["job_2", "job_1"] }),
  });
  const right = simulateRuntimeProviderWorkerPickupReadiness({
    handoffArtifact: baseHandoffArtifact({ plannedJobIds: ["job_1", "job_2"] }),
  });

  assert.deepEqual(left, right);
});

test("worker pickup simulation: does not invoke external execution paths", () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch must not be called in pickup simulation");
  }) as typeof fetch;

  try {
    const result = simulateRuntimeProviderWorkerPickupReadiness({
      handoffArtifact: baseHandoffArtifact(),
    });
    assert.equal(result.executionBlocked, true);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker pickup evidence: valid simulation produces stable evidence", () => {
  const left = createRuntimeProviderWorkerPickupReadinessEvidence({
    handoffArtifact: baseHandoffArtifact({ plannedJobIds: ["job_2", "job_1"] }),
  });
  const right = createRuntimeProviderWorkerPickupReadinessEvidence({
    handoffArtifact: baseHandoffArtifact({ plannedJobIds: ["job_1", "job_2"] }),
  });

  assert.equal(left.handoffRef, "handoff_1");
  assert.equal(left.providerRef, "mock_provider");
  assert.equal(left.approvalRef, "artifact_1");
  assert.equal(left.readinessStatus, "pickup_ready");
  assert.equal(left.executionBlocked, true);
  assert.equal(left.nextAllowedAction, "control_plane_review_and_dry_run_artifact_inspection_only");
  assert.equal(left.diagnostics.includes("PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"), true);
  assert.deepEqual(left, right);
});

test("worker pickup evidence: blocked reasons and diagnostics preserved from simulation", () => {
  const evidence = createRuntimeProviderWorkerPickupReadinessEvidence({
    handoffArtifact: baseHandoffArtifact({ approvalStatus: "pending", handoffStatus: "ready", plannedJobIds: [] }),
  });

  assert.equal(evidence.executionBlocked, true);
  assert.equal(evidence.blockedReasons.includes("approval_status_approved"), true);
  assert.equal(evidence.blockedReasons.includes("has_planned_jobs"), true);
  assert.equal(evidence.diagnostics.includes("WORKER_PICKUP_SIMULATION_NOT_READY:PICKUP_NOT_READY_FROM_HANDOFF_CONDITIONS"), true);
});

test("worker pickup evidence: missing required fields fails closed", () => {
  const evidence = createRuntimeProviderWorkerPickupReadinessEvidence({
    handoffArtifact: { ...baseHandoffArtifact(), handoffId: " ", plannedJobIds: undefined },
  });

  assert.equal(evidence.executionBlocked, true);
  assert.equal(evidence.readinessStatus, "failed_closed");
  assert.equal(evidence.blockedReasons.includes("worker_pickup_evidence_failed_closed"), true);
  assert.equal(
    evidence.diagnostics.includes("PROVIDER_WORKER_PICKUP_EVIDENCE_FAILED_CLOSED:SIMULATION_FAILED_CLOSED"),
    true,
  );
  assert.equal(
    evidence.diagnostics.some((entry) => entry.startsWith("WORKER_PICKUP_SIMULATION_FAILED_CLOSED:")),
    true,
  );
});

test("worker pickup evidence: does not invoke provider/dns/external execution paths", () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch must not be called while building worker pickup evidence");
  }) as typeof fetch;

  try {
    const evidence = createRuntimeProviderWorkerPickupReadinessEvidence({
      handoffArtifact: baseHandoffArtifact(),
    });
    assert.equal(evidence.executionBlocked, true);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
