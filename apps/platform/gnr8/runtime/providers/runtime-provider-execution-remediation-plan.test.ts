import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderExecutionPreconditionsLedger } from "@/gnr8/runtime/providers/runtime-provider-execution-preconditions-ledger";
import { createRuntimeProviderExecutionRemediationPlan } from "@/gnr8/runtime/providers/runtime-provider-execution-remediation-plan";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

function handoff(overrides: Partial<RuntimeProviderExecutionHandoffArtifactRecord> = {}): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    providerId: "mock_provider",
    environment: "sandbox",
    capability: "domain_dns",
    operationKind: "upsert_dns_records",
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "ready",
    plannedJobIds: ["job_1"],
    warnings: [],
    blockers: [],
    correlationKey: "corr_1",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

function createLedger(input: {
  approvalStatus?: string;
  handoffStatus?: string;
  plannedJobIds?: string[];
}) {
  return createRuntimeProviderExecutionPreconditionsLedger({
    handoffArtifact: handoff({
      approvalStatus: input.approvalStatus ?? "approved",
      handoffStatus: input.handoffStatus ?? "ready",
      plannedJobIds: input.plannedJobIds ?? ["job_1"],
    }),
    reviewSummary: {
      reviewSummaryStatus: "approved_for_future_execution",
      reviewCount: 1,
      latestReviewer: "reviewer_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "reason",
      intentOnly: true,
      executionBlocked: true,
    },
    authorizationSummary: {
      authorizationStatus: "authorized_for_future_execution",
      authorizationReason: "reason",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 1,
      latestAuthorizationId: "auth_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
    },
    sandboxGateReady: true,
    globalExecutionBoundaryActive: true,
  });
}

test("execution remediation plan: blocked approval", () => {
  const plan = createRuntimeProviderExecutionRemediationPlan({ executionPreconditionsLedger: createLedger({ approvalStatus: "blocked" }) });

  assert.equal(plan.executionAllowed, false);
  assert.equal(plan.overallStatus, "blocked");
  assert.equal(plan.actions.some((action) => action.priority === "critical" && action.reason === "Approval status is blocked."), true);
  assert.equal(
    plan.actions.some((action) => action.recommendedAction === "Review approval workflow before execution eligibility can be evaluated."),
    true,
  );
});

test("execution remediation plan: missing jobs", () => {
  const plan = createRuntimeProviderExecutionRemediationPlan({ executionPreconditionsLedger: createLedger({ plannedJobIds: [] }) });

  assert.equal(plan.overallStatus, "missing_requirements");
  assert.equal(
    plan.actions.some((action) => action.priority === "high" && action.recommendedAction === "Create deterministic planned jobs before execution readiness evaluation."),
    true,
  );
});

test("execution remediation plan: handoff blocked", () => {
  const plan = createRuntimeProviderExecutionRemediationPlan({ executionPreconditionsLedger: createLedger({ handoffStatus: "blocked" }) });

  assert.equal(plan.overallStatus, "blocked");
  assert.equal(
    plan.actions.some((action) => action.priority === "critical" && action.recommendedAction === "Resolve handoff blockers and regenerate readiness evidence."),
    true,
  );
});

test("execution remediation plan: global execution boundary", () => {
  const plan = createRuntimeProviderExecutionRemediationPlan({ executionPreconditionsLedger: createLedger({}) });

  assert.equal(
    plan.actions.some((action) => action.priority === "normal" && action.recommendedAction === "Execution boundary intentionally active. No action required."),
    true,
  );
});

test("execution remediation plan: empty satisfied state", () => {
  const ledger = createLedger({});
  ledger.requirements = [];
  const plan = createRuntimeProviderExecutionRemediationPlan({ executionPreconditionsLedger: ledger });

  assert.equal(plan.actions.length, 0);
  assert.equal(plan.overallStatus, "ready_but_execution_disabled");
  assert.equal(plan.summary, "All evidence conditions satisfied; execution remains intentionally disabled.");
});

test("execution remediation plan: executionAllowed always false", () => {
  const plan = createRuntimeProviderExecutionRemediationPlan({ executionPreconditionsLedger: createLedger({}) });
  assert.equal(plan.executionAllowed, false);
  assert.equal(plan.executionBlocked, true);
  assert.equal(plan.intentOnly, true);
});
