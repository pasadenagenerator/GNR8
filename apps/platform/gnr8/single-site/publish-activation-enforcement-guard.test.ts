import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PublishActivationEnforcementGuardRepositorySnapshot } from "./publish-activation-enforcement-guard";
import {
  buildPublishActivationEnforcementGuardInputWatermark,
  evaluatePublishActivationEnforcementGuard,
  readAndEvaluatePublishActivationEnforcementGuard,
  type EvaluatePublishActivationEnforcementGuardInput,
} from "./publish-activation-enforcement-guard";

const NOW = "2026-08-05T12:00:00.000Z";
const FRESH_GATE_TIME = "2026-08-05T11:55:00.000Z";
const OLD_GATE_TIME = "2026-08-03T11:55:00.000Z";
const GATE_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const DECISION_ID = "33333333-3333-4333-8333-333333333333";
const EVIDENCE_ID = "44444444-4444-4444-8444-444444444444";
const POLICY_ID = "55555555-5555-4555-8555-555555555555";
const CANDIDATE_ID = "66666666-6666-4666-8666-666666666666";
const ARTIFACT_ID = "77777777-7777-4777-8777-777777777777";
const PUBLISH_TARGET_ID = "production";

function ref(role: string, sourceTable: string, sourceRecordId: string) {
  return {
    role,
    sourceSystem: "gnr8",
    sourceTable,
    sourceRecordId,
    sourceVersion: "v1",
    sourceWatermark: `wm:${sourceRecordId}`,
    sourceRef: `gnr8:${sourceTable}:${sourceRecordId}`,
  };
}

function snapshot(overrides: Partial<PublishActivationEnforcementGuardRepositorySnapshot> = {}): PublishActivationEnforcementGuardRepositorySnapshot {
  return {
    transactionCapturedAt: NOW,
    gateAttempt: {
      id: GATE_ID,
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      site_version_id: CANDIDATE_ID,
      scope: "publish_activation",
      action_key: "publish.activation",
      subject_type: "site_version",
      subject_id: CANDIDATE_ID,
      gate_result: "allowed",
      approval_request_id: REQUEST_ID,
      approval_decision_id: DECISION_ID,
      evidence_package_id: EVIDENCE_ID,
      policy_evaluation_id: POLICY_ID,
      created_at: FRESH_GATE_TIME,
      completed_at: FRESH_GATE_TIME,
      correlation_id: "corr-1",
      idempotency_key: "idem-gate-1",
    },
    conflictingNewerGateAttempts: [],
    approvalRequest: {
      id: REQUEST_ID,
      scope: "publish_activation",
      subject_type: "site_version",
      subject_id: CANDIDATE_ID,
      status: "requested",
    },
    approvalDecision: {
      id: DECISION_ID,
      approval_request_id: REQUEST_ID,
      status: "granted",
      expires_at: null,
      revoked: false,
      superseded: false,
    },
    approvalRevoked: false,
    approvalSuperseded: false,
    publishTarget: {
      id: PUBLISH_TARGET_ID,
      status: "active",
      environment: "production",
      publish_stage: "production",
      source_watermark: "ptt-1:gnr8_publish_targets:production",
    },
    ...overrides,
  };
}

function input(overrides: Partial<EvaluatePublishActivationEnforcementGuardInput> = {}): EvaluatePublishActivationEnforcementGuardInput {
  return {
    tenantId: "tenant-1",
    clientId: "client-1",
    siteId: "site-1",
    migrationId: "migration-1",
    candidateSiteVersionRef: ref("candidate_site_version", "gnr8_runtime_site_versions", CANDIDATE_ID),
    runtimeArtifactRef: ref("runtime_artifact", "gnr8_runtime_artifacts", ARTIFACT_ID),
    publishTargetRef: ref("publish_target", "gnr8_publish_targets", PUBLISH_TARGET_ID),
    publishStage: "production",
    publishEnvironment: "production",
    publishActivationDecisionRef: { id: DECISION_ID, ref: `gnr8:aaf_decision:${DECISION_ID}`, status: "granted" },
    gateAttemptResultRef: {
      gateAttemptId: GATE_ID,
      gateResult: "allowed",
      evaluationStatus: "allowed",
      policyResult: "approval_required",
      approvalRequestId: REQUEST_ID,
      approvalDecisionId: DECISION_ID,
      evidencePackageId: EVIDENCE_ID,
      policyEvaluationId: POLICY_ID,
      scope: "publish_activation",
      action: "publish.activation",
      subjectType: "site_version",
      subjectId: CANDIDATE_ID,
      tenantId: "tenant-1",
      clientId: "client-1",
      siteId: "site-1",
      migrationId: "migration-1",
      candidateSiteVersionRef: ref("candidate_site_version", "gnr8_runtime_site_versions", CANDIDATE_ID),
      runtimeArtifactRef: ref("runtime_artifact", "gnr8_runtime_artifacts", ARTIFACT_ID),
      publishTargetRef: ref("publish_target", "gnr8_publish_targets", PUBLISH_TARGET_ID),
      publishStage: "production",
      publishEnvironment: "production",
      semanticHandoffWatermark: "handoff-wm-1",
      semanticGateInputWatermark: "gate-input-wm-1",
      createdAt: FRESH_GATE_TIME,
      completedAt: FRESH_GATE_TIME,
      correlationId: "corr-gate-1",
      idempotencyKey: "idem-gate-1",
      blockerCodes: [],
      warnings: [],
      limitations: { readiness: [], decision: [], combined: [] },
    },
    handoffWatermark: "handoff-wm-1",
    gateInputWatermark: "gate-input-wm-1",
    actor: { actorType: "human", actorId: "release-1", actorRole: "release_operator" },
    correlationId: "corr-1",
    idempotencyKey: "idem-1",
    evaluatedAt: NOW,
    policy: { maxGateAgeMs: 60 * 60 * 1000, rereadAaf: true, rereadPublishTarget: true, detectConflictingNewerGate: true },
    repositorySnapshot: snapshot(),
    ...overrides,
  };
}

test("allowed persisted gate passes without applying enforcement or publishing", () => {
  const result = evaluatePublishActivationEnforcementGuard(input());
  assert.equal(result.allowed, true);
  assert.equal(result.mode, "pass");
  assert.equal(result.blockerCodes.length, 0);
  assert.equal(result.flags.readOnly, true);
  assert.equal(result.flags.enforcementEvaluated, true);
  assert.equal(result.flags.enforcementApplied, false);
  assert.equal(result.flags.publishActionBlockedWouldBlockIfWired, false);
  assert.equal(result.flags.publishes, false);
  assert.equal(result.flags.runtimeMutation, false);
  assert.equal(result.flags.providerCalls, false);
  assert.equal(result.flags.createsAafRecords, false);
  assert.equal(result.flags.createsGateAttempt, false);
  assert.equal(result.flags.evaluatesGate, false);
  assert.equal(result.flags.pasrInvoked, false);
});

test("semantic guard input watermark is deterministic", () => {
  const one = buildPublishActivationEnforcementGuardInputWatermark(input());
  const two = buildPublishActivationEnforcementGuardInputWatermark(input({ correlationId: "different-correlation" }));
  assert.equal(one, two);
  assert.match(one, /^single-site-publish-activation-enforcement-guard:/);
});

test("warning or limitations gate blocks by default and passes only with explicit policy", () => {
  const limited = input({
    gateAttemptResultRef: {
      ...(input().gateAttemptResultRef as Record<string, unknown>),
      evaluationStatus: "warning",
      warnings: ["limitations_carried_forward"],
      limitations: { readiness: ["accepted readiness limitation"], decision: [], combined: ["accepted readiness limitation"] },
    } as unknown as EvaluatePublishActivationEnforcementGuardInput["gateAttemptResultRef"],
  });
  const blocked = evaluatePublishActivationEnforcementGuard(limited);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.blockerCodes.includes("publish_activation_limitations_not_accepted"));

  const allowed = evaluatePublishActivationEnforcementGuard({
    ...limited,
    policy: { ...limited.policy, allowWarningsWithLimitations: true },
  });
  assert.equal(allowed.allowed, true);
  assert.ok(allowed.warnings.includes("limitations_explicitly_accepted_by_policy"));
});

test("blocked and approval-required gate results fail closed", () => {
  for (const gateResult of ["blocked", "approval_required"] as const) {
    const result = evaluatePublishActivationEnforcementGuard(input({
      gateAttemptResultRef: { ...(input().gateAttemptResultRef as Record<string, unknown>), gateResult } as EvaluatePublishActivationEnforcementGuardInput["gateAttemptResultRef"],
      repositorySnapshot: snapshot({ gateAttempt: { ...snapshot().gateAttempt!, gate_result: gateResult } }),
    }));
    assert.equal(result.allowed, false);
    assert.ok(result.blockerCodes.some((code) => code.includes(gateResult)));
  }
});

test("stale gate blocks", () => {
  const result = evaluatePublishActivationEnforcementGuard(input({
    gateAttemptResultRef: { ...(input().gateAttemptResultRef as Record<string, unknown>), createdAt: OLD_GATE_TIME, completedAt: OLD_GATE_TIME } as EvaluatePublishActivationEnforcementGuardInput["gateAttemptResultRef"],
    repositorySnapshot: snapshot({ gateAttempt: { ...snapshot().gateAttempt!, created_at: OLD_GATE_TIME, completed_at: OLD_GATE_TIME } }),
  }));
  assert.equal(result.allowed, false);
  assert.ok(result.blockerCodes.includes("publish_activation_gate_stale"));
});

test("wrong candidate, artifact, target, stage, and identity block", () => {
  const cases: Array<[string, Partial<EvaluatePublishActivationEnforcementGuardInput>, string]> = [
    ["candidate", { candidateSiteVersionRef: ref("candidate_site_version", "gnr8_runtime_site_versions", "wrong-candidate") }, "publish_activation_candidate_mismatch"],
    ["artifact", { runtimeArtifactRef: ref("runtime_artifact", "gnr8_runtime_artifacts", "wrong-artifact") }, "publish_activation_artifact_mismatch"],
    ["target", { publishTargetRef: ref("publish_target", "gnr8_publish_targets", "staging") }, "publish_activation_target_mismatch"],
    ["stage", { publishStage: "canary" }, "publish_activation_stage_mismatch"],
    ["tenant", { tenantId: "wrong-tenant" }, "publish_activation_identity_mismatch"],
    ["client", { clientId: "wrong-client" }, "publish_activation_identity_mismatch"],
    ["site", { siteId: "wrong-site" }, "publish_activation_identity_mismatch"],
    ["migration", { migrationId: "wrong-migration" }, "publish_activation_identity_mismatch"],
  ];
  for (const [, overrides, code] of cases) {
    const result = evaluatePublishActivationEnforcementGuard(input(overrides));
    assert.equal(result.allowed, false);
    assert.ok(result.blockerCodes.includes(code), `${code} missing from ${result.blockerCodes.join(",")}`);
  }
});

test("revoked, superseded, expired, and rejected decisions block when reread is available", () => {
  const cases: Array<[string, PublishActivationEnforcementGuardRepositorySnapshot, string]> = [
    ["revoked", snapshot({ approvalRevoked: true, approvalDecision: { ...snapshot().approvalDecision!, revoked: true } }), "publish_activation_approval_revoked"],
    ["superseded", snapshot({ approvalSuperseded: true, approvalDecision: { ...snapshot().approvalDecision!, superseded: true } }), "publish_activation_approval_superseded"],
    ["expired", snapshot({ approvalDecision: { ...snapshot().approvalDecision!, expires_at: "2026-08-05T11:00:00.000Z" } }), "publish_activation_approval_expired"],
    ["rejected", snapshot({ approvalDecision: { ...snapshot().approvalDecision!, status: "rejected" } }), "publish_activation_approval_rejected"],
  ];
  for (const [, repositorySnapshot, code] of cases) {
    const result = evaluatePublishActivationEnforcementGuard(input({ repositorySnapshot }));
    assert.equal(result.allowed, false);
    assert.ok(result.blockerCodes.includes(code), `${code} missing from ${result.blockerCodes.join(",")}`);
  }
});

test("disabled and retired publish targets block when reread is available", () => {
  for (const status of ["disabled", "retired"]) {
    const result = evaluatePublishActivationEnforcementGuard(input({
      repositorySnapshot: snapshot({ publishTarget: { ...snapshot().publishTarget!, status } }),
    }));
    assert.equal(result.allowed, false);
    assert.ok(result.blockerCodes.includes("publish_activation_target_inactive"));
  }
});

test("handoff and gate input watermark mismatches block", () => {
  const handoff = evaluatePublishActivationEnforcementGuard(input({ handoffWatermark: "wrong-handoff" }));
  assert.equal(handoff.allowed, false);
  assert.ok(handoff.blockerCodes.includes("publish_activation_handoff_watermark_mismatch"));

  const gateInput = evaluatePublishActivationEnforcementGuard(input({ gateInputWatermark: "wrong-gate-input" }));
  assert.equal(gateInput.allowed, false);
  assert.ok(gateInput.blockerCodes.includes("publish_activation_gate_input_watermark_mismatch"));
});

test("missing required input, missing gate, read failure, and conflicting newer gate block", async () => {
  const missingInput = evaluatePublishActivationEnforcementGuard(input({ tenantId: "" }));
  assert.equal(missingInput.allowed, false);
  assert.ok(missingInput.blockerCodes.includes("publish_activation_required_tenant_id_missing"));

  const missingGate = evaluatePublishActivationEnforcementGuard(input({ gateAttemptResultRef: null }));
  assert.equal(missingGate.allowed, false);
  assert.ok(missingGate.blockerCodes.includes("publish_activation_required_gate_attempt_result_ref_missing"));

  const readFailure = await readAndEvaluatePublishActivationEnforcementGuard({
    ...input({ repositorySnapshot: undefined }),
    repository: { readSnapshot: async () => { throw new Error("db unavailable"); } },
  });
  assert.equal(readFailure.allowed, false);
  assert.ok(readFailure.blockerCodes.includes("publish_activation_gate_read_failed"));

  const conflict = evaluatePublishActivationEnforcementGuard(input({
    repositorySnapshot: snapshot({ conflictingNewerGateAttempts: [{ id: "newer-gate", gate_result: "blocked" }] }),
  }));
  assert.equal(conflict.allowed, false);
  assert.ok(conflict.blockerCodes.includes("publish_activation_gate_conflict"));
});

test("emergency bypass is disabled by default and explicit when enabled", () => {
  const disabled = evaluatePublishActivationEnforcementGuard(input({ bypass: { requested: true, reason: "incident recovery" } }));
  assert.equal(disabled.allowed, false);
  assert.ok(disabled.blockerCodes.includes("publish_activation_emergency_bypass_disabled"));

  const enabled = evaluatePublishActivationEnforcementGuard(input({
    bypass: { requested: true, reason: "incident recovery" },
    policy: { emergencyBypass: { enabled: true } },
  }));
  assert.equal(enabled.allowed, true);
  assert.equal(enabled.mode, "bypass");
  assert.equal(enabled.bypassUsed, true);
  assert.equal(enabled.flags.bypassUsed, true);
  assert.ok(enabled.warnings.includes("residual_risk_publish_activation_gate_not_proven"));
  assert.equal(enabled.flags.publishes, false);
});

test("guard module does not import publish, rollback, PASR, DDOM, provider, or write primitives", () => {
  const source = readFileSync(path.resolve(process.cwd(), "apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts"), "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*(publish-activation-orchestrator|runtime-store|rollback-switch|publish-activation-guard|publish-enforcement|publish-safety-check)[^"']*["']/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(aaf-publish-activation-source-reader|aaf-publish-activation-shadow-observer|ddom|provider|vercel|openprovider|stripe|dns)[^"']*["']/i);
  assert.doesNotMatch(source, /\b(validateGate|createActionGateAttempt|createApprovalRequest|createApprovalDecision|switchActivePointer|rollbackToSiteVersionArtifact|publishApprovedSiteVersion|observePublishActivationShadowGate)\b/);
});
