import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderExecutionPreconditionsLedger } from "@/gnr8/runtime/providers/runtime-provider-execution-preconditions-ledger";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

function buildHandoff(overrides: Partial<RuntimeProviderExecutionHandoffArtifactRecord> = {}): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "11111111-1111-1111-1111-111111111111",
    siteVersionId: "22222222-2222-2222-2222-222222222222",
    providerId: "openprovider_sandbox",
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

test("execution preconditions ledger: blocked handoff -> blocked", () => {
  const ledger = createRuntimeProviderExecutionPreconditionsLedger({
    handoffArtifact: buildHandoff({ handoffStatus: "blocked" }),
    reviewSummary: {
      reviewSummaryStatus: "approved_for_future_execution",
      reviewCount: 1,
      latestReviewer: "reviewer_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "ok",
      intentOnly: true,
      executionBlocked: true,
    },
    authorizationSummary: {
      authorizationStatus: "authorized_for_future_execution",
      authorizationReason: "ok",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 1,
      latestAuthorizationId: "auth_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
    },
  });

  assert.equal(ledger.overallStatus, "blocked");
  assert.equal(ledger.executionAllowed, false);
  assert.equal(ledger.executionBlocked, true);
  assert.equal(ledger.blockedRequirements.some((requirement) => requirement.requirementId === "execution_handoff_status_not_blocked"), true);
  assert.equal(ledger.diagnostics.includes("EXECUTION_PRECONDITIONS_BLOCKED"), true);
});

test("execution preconditions ledger: missing jobs -> incomplete", () => {
  const ledger = createRuntimeProviderExecutionPreconditionsLedger({
    handoffArtifact: buildHandoff({ plannedJobIds: [] }),
    reviewSummary: {
      reviewSummaryStatus: "approved_for_future_execution",
      reviewCount: 1,
      latestReviewer: "reviewer_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "ok",
      intentOnly: true,
      executionBlocked: true,
    },
    authorizationSummary: {
      authorizationStatus: "authorized_for_future_execution",
      authorizationReason: "ok",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 1,
      latestAuthorizationId: "auth_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
    },
  });

  assert.equal(ledger.overallStatus, "incomplete");
  assert.equal(ledger.missingRequirements.some((requirement) => requirement.requirementId === "execution_planned_jobs_present"), true);
  assert.equal(ledger.diagnostics.includes("EXECUTION_PRECONDITIONS_INCOMPLETE"), true);
});

test("execution preconditions ledger: all satisfied + boundary active -> satisfied_but_execution_disabled", () => {
  const ledger = createRuntimeProviderExecutionPreconditionsLedger({
    handoffArtifact: buildHandoff(),
    reviewSummary: {
      reviewSummaryStatus: "approved_for_future_execution",
      reviewCount: 1,
      latestReviewer: "reviewer_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "ok",
      intentOnly: true,
      executionBlocked: true,
    },
    authorizationSummary: {
      authorizationStatus: "authorized_for_future_execution",
      authorizationReason: "ok",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 1,
      latestAuthorizationId: "auth_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
    },
    globalExecutionBoundaryActive: true,
  });

  assert.equal(ledger.overallStatus, "satisfied_but_execution_disabled");
  assert.equal(ledger.executionAllowed, false);
  assert.equal(ledger.executionBlocked, true);
  assert.equal(ledger.diagnostics.includes("EXECUTION_PRECONDITIONS_EXECUTION_DISABLED"), true);
});
