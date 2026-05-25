import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRuntimeProviderGovernanceAuthorizationSummary,
  createRuntimeProviderGovernanceAuthorization,
} from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";

test("governance authorization: create intent artifact", () => {
  const result = createRuntimeProviderGovernanceAuthorization({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    authorizationStatus: "pending_authorization",
    authorizationReason: "awaiting review",
    createdAt: "2026-05-25T00:00:00.000Z",
  });

  assert.equal(result.artifact?.authorizationStatus, "pending_authorization");
  assert.equal(result.intentOnly, true);
  assert.equal(result.executionBlocked, true);
  assert.equal(result.diagnostics.includes("GOVERNANCE_AUTHORIZATION_CREATED"), true);
  assert.equal(result.diagnostics.includes("GOVERNANCE_AUTHORIZATION_INTENT_ONLY"), true);
});

test("governance authorization: denied diagnostic emitted", () => {
  const result = createRuntimeProviderGovernanceAuthorization({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    authorizationStatus: "denied",
    authorizationReason: "rejected",
    createdAt: "2026-05-25T00:00:00.000Z",
  });

  assert.equal(result.artifact?.authorizationStatus, "denied");
  assert.equal(result.diagnostics.includes("GOVERNANCE_AUTHORIZATION_DENIED"), true);
  assert.equal(result.executionBlocked, true);
});

test("governance authorization: summary follows latest intent", () => {
  const first = createRuntimeProviderGovernanceAuthorization({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    authorizationStatus: "pending_authorization",
    createdAt: "2026-05-25T00:00:00.000Z",
  }).artifact;
  const second = createRuntimeProviderGovernanceAuthorization({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    authorizationStatus: "authorized_for_future_execution",
    authorizationReason: "future intent",
    createdAt: "2026-05-25T00:00:01.000Z",
  }).artifact;

  assert.ok(first);
  assert.ok(second);
  const summary = buildRuntimeProviderGovernanceAuthorizationSummary({ artifacts: [second, first] });
  assert.equal(summary.summary.authorizationStatus, "authorized_for_future_execution");
  assert.equal(summary.summary.executionBlocked, true);
  assert.equal(summary.summary.intentOnly, true);
  assert.equal(summary.summary.authorizationCount, 2);
});

test("governance authorization: authorized_for_future_execution stays non-executable", () => {
  const result = createRuntimeProviderGovernanceAuthorization({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    authorizationStatus: "authorized_for_future_execution",
    authorizationReason: "future intent",
    createdAt: "2026-05-25T00:00:00.000Z",
  });

  assert.equal(result.intentOnly, true);
  assert.equal(result.executionBlocked, true);
  assert.equal(
    result.blockedReasons.includes("authorized_for_future_execution_is_intent_only_not_execution_authorization"),
    true,
  );
});

test("governance authorization: fail closed on missing references", () => {
  const result = createRuntimeProviderGovernanceAuthorization({
    handoffRef: { handoffId: " ", correlationKey: " " },
    authorizationStatus: "pending_authorization",
  });

  assert.equal(result.artifact, null);
  assert.equal(result.executionBlocked, true);
  assert.equal(result.diagnostics.includes("GOVERNANCE_AUTHORIZATION_FAILED_CLOSED"), true);
});
