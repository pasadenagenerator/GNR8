import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  evaluatePublishActivationEnforcementGuard,
  type EvaluatePublishActivationEnforcementGuardInput,
} from "./publish-activation-enforcement-guard";
import { normalizePublishActivationMetadataHandoff } from "./publish-activation-metadata-handoff";
import {
  PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
  buildPublishActivationMetadataResolverWatermark,
  readAndResolveSingleSitePublishActivationMetadataHandoff,
  resolveSingleSitePublishActivationMetadataHandoff,
  type PublishActivationMetadataResolverInput,
  type PublishActivationMetadataResolverRepositorySnapshot,
} from "./publish-activation-metadata-resolver";

const NOW = "2026-08-05T12:00:00.000Z";
const FRESH_GATE_TIME = "2026-08-05T11:55:00.000Z";
const OLD_GATE_TIME = "2026-08-03T11:55:00.000Z";
const REQUEST_ID = "request-mvp49";
const DECISION_ID = "decision-mvp49";
const EVIDENCE_ID = "evidence-mvp49";
const READINESS_ID = "readiness-mvp49";
const GATE_ID = "gate-mvp49";
const POLICY_ID = "policy-mvp49";
const AUDIT_ID = "audit-mvp49";
const CANDIDATE_ID = "site-version-mvp49";
const ARTIFACT_ID = "artifact-mvp49";
const PUBLISH_TARGET_ID = "production";
const GATE_INPUT_WATERMARK = `single-site-publish-activation-gate-input:${"a".repeat(64)}`;

function ref(sourceTable: string, sourceRecordId: string, sourceWatermark = `wm:${sourceRecordId}`) {
  return {
    role: sourceTable === "gnr8_publish_targets" ? "publish_target" : sourceTable === "gnr8_runtime_artifacts" ? "runtime_artifact" : "candidate_site_version",
    sourceSystem: "gnr8",
    sourceTable,
    sourceRecordId,
    sourceVersion: "v1",
    sourceWatermark,
    sourceRef: `gnr8:${sourceTable}:${sourceRecordId}`,
  };
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    identity: {
      tenantId: "tenant-mvp49",
      clientId: "client-mvp49",
      siteId: "site-mvp49",
      migrationId: "migration-mvp49",
      launchReadinessRecordId: READINESS_ID,
    },
    readinessStatus: "ready",
    acceptedLimitations: [],
    unresolvedNonP0Blockers: [],
    blockedDimensions: [],
    sourceRefs: {
      improved_candidate_site_version: [ref("gnr8_runtime_site_versions", CANDIDATE_ID)],
      improved_runtime_artifact: [ref("gnr8_runtime_artifacts", ARTIFACT_ID)],
      publish_target: [ref("gnr8_publish_targets", PUBLISH_TARGET_ID)],
    },
    ...overrides,
  };
}

function sourceRefRow(role: string, sourceTable: string, sourceRecordId: string, sourceWatermark = `wm:${sourceRecordId}`) {
  return {
    id: `source-${role}`,
    evidence_package_id: EVIDENCE_ID,
    source_system: "gnr8",
    source_table: sourceTable,
    source_record_id: sourceRecordId,
    source_version: "v1",
    source_watermark: sourceWatermark,
    hash: `hash-${role}`,
    snapshot_ref: `gnr8:${sourceTable}:${sourceRecordId}`,
    metadata_json: { refRole: role },
  };
}

function snapshot(overrides: Partial<PublishActivationMetadataResolverRepositorySnapshot> = {}): PublishActivationMetadataResolverRepositorySnapshot {
  const decisionSnapshot = {
    transactionCapturedAt: NOW,
    request: {
      id: REQUEST_ID,
      tenant_id: "tenant-mvp49",
      client_id: "client-mvp49",
      site_id: "site-mvp49",
      scope: "publish_activation",
      subject_type: "site_version",
      subject_id: CANDIDATE_ID,
      site_version_id: CANDIDATE_ID,
      status: "requested",
      policy_version: "MVP-49",
      reason: { semanticWatermark: "wm:request" },
    },
    decisions: [
      {
        id: DECISION_ID,
        approval_request_id: REQUEST_ID,
        status: "granted",
        policy_version: "MVP-49",
        evidence_package_id: EVIDENCE_ID,
        policy_evaluation_id: "decision-policy",
        decided_at: "2026-08-05T11:50:00.000Z",
        expires_at: null,
        revoked: false,
        superseded: false,
      },
    ],
    selectedDecision: {
      id: DECISION_ID,
      approval_request_id: REQUEST_ID,
      status: "granted",
      policy_version: "MVP-49",
      evidence_package_id: EVIDENCE_ID,
      policy_evaluation_id: "decision-policy",
      decided_at: "2026-08-05T11:50:00.000Z",
      expires_at: null,
      revoked: false,
      superseded: false,
    },
    activeDecisions: [],
    conflictingDecisions: [],
    requestEvidenceLinks: [{ id: "request-link", approval_request_id: REQUEST_ID, evidence_package_id: EVIDENCE_ID, link_role: "publish_activation_request_launch_readiness_evidence" }],
    decisionEvidenceLinks: [{ id: "decision-link", approval_request_id: REQUEST_ID, approval_decision_id: DECISION_ID, evidence_package_id: EVIDENCE_ID, link_role: "publish_activation_decision_launch_readiness_evidence" }],
    evidencePackage: {
      id: EVIDENCE_ID,
      tenant_id: "tenant-mvp49",
      client_id: "client-mvp49",
      site_id: "site-mvp49",
      site_version_id: CANDIDATE_ID,
      package_type: "single_site_launch_readiness_evidence",
      subject_type: "single_site_launch_readiness_package",
      subject_id: READINESS_ID,
      status: "created",
      freshness_label: "fresh",
      source_watermark: "wm:evidence",
      content_hash: "hash-evidence",
      limitations_json: payload(),
    },
    evidenceSourceRefs: [
      sourceRefRow("improved_candidate_site_version", "gnr8_runtime_site_versions", CANDIDATE_ID),
      sourceRefRow("improved_runtime_artifact", "gnr8_runtime_artifacts", ARTIFACT_ID),
      sourceRefRow("publish_target", "gnr8_publish_targets", PUBLISH_TARGET_ID),
    ],
    freshnessRows: [{ id: "freshness", evidence_package_id: EVIDENCE_ID, result: "fresh", current_source_watermark: "wm:evidence", expires_at: null }],
    policyRows: [{ id: "request-policy", approval_request_id: REQUEST_ID, result: "approval_required", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: CANDIDATE_ID, policy_version: "MVP-49" }],
    auditEvents: [{ id: AUDIT_ID, approval_request_id: REQUEST_ID, approval_decision_id: DECISION_ID, evidence_package_id: EVIDENCE_ID, payload_json: { semanticWatermark: "wm:decision", limitationsCarriedForward: [] } }],
    auditRefs: [],
    launchReadinessRecord: null,
    launchReadinessRefs: [],
    publishTarget: {
      id: PUBLISH_TARGET_ID,
      status: "active",
      environment: "production",
      publish_stage: "production",
      source_watermark: `wm:${PUBLISH_TARGET_ID}`,
    },
  };
  return {
    transactionCapturedAt: NOW,
    decisionSnapshot,
    gateAttempt: {
      id: GATE_ID,
      tenant_id: "tenant-mvp49",
      client_id: "client-mvp49",
      site_id: "site-mvp49",
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
      pre_action_audit_event_id: AUDIT_ID,
      causation_id: `mvp-44-test:${GATE_INPUT_WATERMARK}`,
      correlation_id: "corr-gate",
      idempotency_key: "idem-gate",
      created_at: FRESH_GATE_TIME,
      completed_at: FRESH_GATE_TIME,
    },
    gatePolicyEvaluation: { id: POLICY_ID, result: "approval_required", blocker_codes: [] },
    gateAuditEvent: { id: AUDIT_ID, payload_json: { nonExecuting: true } },
    conflictingNewerGateAttempts: [],
    ...overrides,
  };
}

function input(overrides: Partial<PublishActivationMetadataResolverInput> = {}): PublishActivationMetadataResolverInput {
  return {
    tenantId: "tenant-mvp49",
    clientId: "client-mvp49",
    siteId: "site-mvp49",
    migrationId: "migration-mvp49",
    candidateSiteVersionRef: ref("gnr8_runtime_site_versions", CANDIDATE_ID),
    runtimeArtifactRef: ref("gnr8_runtime_artifacts", ARTIFACT_ID),
    publishStage: "production",
    publishEnvironment: "production",
    actor: { actorType: "human", actorId: "release-operator", actorRole: "release_operator" },
    correlationId: "corr-resolver",
    idempotencyKey: "idem-resolver",
    expectedPublishTargetRef: ref("gnr8_publish_targets", PUBLISH_TARGET_ID),
    expectedGateInputWatermark: GATE_INPUT_WATERMARK,
    maxGateAgeMs: 60 * 60 * 1000,
    evaluatedAt: NOW,
    repositorySnapshot: snapshot(),
    ...overrides,
  };
}

function guardInputFromMetadata(metadata: NonNullable<ReturnType<typeof resolveSingleSitePublishActivationMetadataHandoff>["publishActivationMetadataHandoff"]>): EvaluatePublishActivationEnforcementGuardInput {
  return {
    tenantId: metadata.tenantId!,
    clientId: metadata.clientId!,
    siteId: metadata.siteId!,
    migrationId: metadata.migrationId!,
    candidateSiteVersionRef: metadata.candidateSiteVersionRef,
    runtimeArtifactRef: metadata.runtimeArtifactRef,
    publishTargetRef: metadata.publishTargetRef,
    publishStage: metadata.publishStage!,
    publishEnvironment: metadata.publishEnvironment!,
    publishActivationDecisionRef: metadata.publishActivationDecisionRef,
    gateAttemptResultRef: metadata.gateAttemptResultRef,
    handoffWatermark: metadata.handoffWatermark!,
    gateInputWatermark: metadata.gateInputWatermark!,
    actor: { actorType: "human", actorId: "release-operator", actorRole: "release_operator" },
    correlationId: metadata.correlationId,
    idempotencyKey: metadata.idempotencyKey,
    evaluatedAt: NOW,
    policy: { maxGateAgeMs: 60 * 60 * 1000, allowWarningsWithLimitations: true, rereadAaf: false, rereadPublishTarget: false, detectConflictingNewerGate: false },
  };
}

test("complete persisted chain resolves complete MVP-48 metadata", () => {
  const result = resolveSingleSitePublishActivationMetadataHandoff(input());
  assert.equal(result.diagnostics.complete, true);
  assert.ok(result.publishActivationMetadataHandoff);
  assert.equal(result.publishActivationMetadataHandoff.sourceType, "single_site_publish_activation");
  assert.equal(result.publishActivationMetadataHandoff.candidateSiteVersionRef?.sourceRecordId, CANDIDATE_ID);
  assert.equal(result.publishActivationMetadataHandoff.runtimeArtifactRef?.sourceRecordId, ARTIFACT_ID);
  assert.equal(result.publishActivationMetadataHandoff.publishTargetRef?.sourceRecordId, PUBLISH_TARGET_ID);
  assert.equal(result.publishActivationMetadataHandoff.gateAttemptResultRef?.gateAttemptId, GATE_ID);
  assert.equal(result.publishActivationMetadataHandoff.gateInputWatermark, GATE_INPUT_WATERMARK);
  assert.match(result.publishActivationMetadataHandoff.metadataWatermark, /^single-site-publish-activation-metadata-handoff:[0-9a-f]{64}$/);
});

test("granted_with_limitations carries limitations only when explicitly allowed", () => {
  const limitedSnapshot = snapshot({
    decisionSnapshot: {
      ...snapshot().decisionSnapshot,
      selectedDecision: { ...snapshot().decisionSnapshot.selectedDecision!, status: "granted_with_limitations" },
      decisions: [{ ...snapshot().decisionSnapshot.selectedDecision!, status: "granted_with_limitations" }],
      evidencePackage: {
        ...snapshot().decisionSnapshot.evidencePackage!,
        limitations_json: payload({ readinessStatus: "ready_with_limitations", acceptedLimitations: ["launch limitation"] }),
      },
      auditEvents: [{ ...snapshot().decisionSnapshot.auditEvents[0]!, payload_json: { semanticWatermark: "wm:decision", limitationsCarriedForward: ["launch limitation", "approval window only"] } }],
    },
  });
  const blocked = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: limitedSnapshot }));
  assert.equal(blocked.diagnostics.complete, false);
  assert.ok(blocked.diagnostics.blockerCodes.includes("publish_activation_limitations_not_accepted"));

  const allowed = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: limitedSnapshot, allowWarningsWithLimitations: true }));
  assert.equal(allowed.diagnostics.complete, true);
  assert.deepEqual(allowed.publishActivationMetadataHandoff?.limitations, {
    readiness: ["launch limitation"],
    decision: ["launch limitation", "approval window only"],
    combined: ["launch limitation", "launch limitation", "approval window only"],
  });
});

test("missing request, decision, and gate result return incomplete diagnostics", () => {
  const missingRequest = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: snapshot({ decisionSnapshot: { ...snapshot().decisionSnapshot, request: null, requestEvidenceLinks: [], policyRows: [] } }) }));
  assert.equal(missingRequest.diagnostics.complete, false);
  assert.ok(missingRequest.diagnostics.missingCodes.includes("publish_activation_request_missing"));

  const missingDecision = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: snapshot({ decisionSnapshot: { ...snapshot().decisionSnapshot, selectedDecision: null, decisions: [], decisionEvidenceLinks: [] } }) }));
  assert.equal(missingDecision.diagnostics.complete, false);
  assert.ok(missingDecision.diagnostics.missingCodes.includes("publish_activation_decision_missing"));

  const missingGate = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: snapshot({ gateAttempt: null }) }));
  assert.equal(missingGate.diagnostics.complete, false);
  assert.ok(missingGate.diagnostics.missingCodes.includes("publish_activation_gate_missing"));
});

test("rejected decision and blocked gate fail closed as incomplete", () => {
  const rejected = resolveSingleSitePublishActivationMetadataHandoff(input({
    repositorySnapshot: snapshot({
      decisionSnapshot: {
        ...snapshot().decisionSnapshot,
        selectedDecision: { ...snapshot().decisionSnapshot.selectedDecision!, status: "rejected" },
        decisions: [{ ...snapshot().decisionSnapshot.selectedDecision!, status: "rejected" }],
      },
    }),
  }));
  assert.equal(rejected.diagnostics.complete, false);
  assert.ok(rejected.diagnostics.blockerCodes.includes("publish_activation_approval_rejected"));

  const blockedGate = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: snapshot({ gateAttempt: { ...snapshot().gateAttempt!, gate_result: "blocked" } }) }));
  assert.equal(blockedGate.diagnostics.complete, false);
  assert.ok(blockedGate.diagnostics.blockerCodes.includes("publish_activation_gate_blocked"));
});

test("wrong candidate, artifact, target, and stage return incomplete", () => {
  for (const [overrides, expected] of [
    [{ candidateSiteVersionRef: ref("gnr8_runtime_site_versions", "wrong-candidate") }, "publish_activation_candidate_mismatch"],
    [{ runtimeArtifactRef: ref("gnr8_runtime_artifacts", "wrong-artifact") }, "publish_activation_artifact_mismatch"],
    [{ expectedPublishTargetRef: ref("gnr8_publish_targets", "staging") }, "publish_activation_target_mismatch"],
    [{ publishStage: "canary" }, "publish_activation_stage_mismatch"],
    [{ publishEnvironment: "staging" }, "publish_activation_stage_mismatch"],
  ] as Array<[Partial<PublishActivationMetadataResolverInput>, string]>) {
    const result = resolveSingleSitePublishActivationMetadataHandoff(input(overrides));
    assert.equal(result.diagnostics.complete, false);
    assert.ok([...result.diagnostics.mismatchCodes, ...result.diagnostics.blockerCodes].includes(expected), `${expected} missing`);
  }
});

test("stale gate, inactive target, and conflicting newer gate return incomplete", () => {
  const stale = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: snapshot({ gateAttempt: { ...snapshot().gateAttempt!, created_at: OLD_GATE_TIME, completed_at: OLD_GATE_TIME } }) }));
  assert.equal(stale.diagnostics.complete, false);
  assert.ok(stale.diagnostics.staleCodes.includes("publish_activation_gate_stale"));

  for (const status of ["disabled", "retired"]) {
    const inactive = resolveSingleSitePublishActivationMetadataHandoff(input({
      repositorySnapshot: snapshot({ decisionSnapshot: { ...snapshot().decisionSnapshot, publishTarget: { ...snapshot().decisionSnapshot.publishTarget!, status } } }),
    }));
    assert.equal(inactive.diagnostics.complete, false);
    assert.ok(inactive.diagnostics.blockerCodes.includes("publish_activation_target_inactive"));
  }

  const conflict = resolveSingleSitePublishActivationMetadataHandoff(input({ repositorySnapshot: snapshot({ conflictingNewerGateAttempts: [{ id: "newer-gate" }] }) }));
  assert.equal(conflict.diagnostics.complete, false);
  assert.ok(conflict.diagnostics.blockerCodes.includes("publish_activation_gate_conflict"));
});

test("metadata resolver watermark is deterministic", () => {
  const first = buildPublishActivationMetadataResolverWatermark({ b: 2, a: 1 });
  const second = buildPublishActivationMetadataResolverWatermark({ a: 1, b: 2 });
  assert.equal(first, second);
  assert.match(first, /^single-site-publish-activation-metadata-resolver:[0-9a-f]{64}$/);
});

test("resolver output passes MVP-48 helper completeness and MVP-46 guard consumption", () => {
  const result = resolveSingleSitePublishActivationMetadataHandoff(input({ allowWarningsWithLimitations: true }));
  assert.ok(result.publishActivationMetadataHandoff);
  const helper = normalizePublishActivationMetadataHandoff(result.publishActivationMetadataHandoff);
  assert.equal(helper.diagnostics.complete, true);

  const guard = evaluatePublishActivationEnforcementGuard(guardInputFromMetadata(result.publishActivationMetadataHandoff));
  assert.equal(guard.allowed, true);
  assert.equal(guard.mode, "pass");
});

test("read failure returns incomplete without throwing", async () => {
  const result = await readAndResolveSingleSitePublishActivationMetadataHandoff({
    ...input({ repositorySnapshot: undefined }),
    repository: { readSnapshot: async () => { throw new Error("db unavailable"); } },
  });
  assert.equal(result.diagnostics.complete, false);
  assert.ok(result.diagnostics.blockerCodes.includes("read_failure"));
  assert.ok(result.diagnostics.missingCodes.includes("publish_activation_metadata_resolver_read_failure"));
});

test("resolver source stays read-only and does not call gate evaluation or side-effect systems", () => {
  const source = readFileSync(path.resolve(process.cwd(), "apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts"), "utf8");
  assert.doesNotMatch(source, /evaluatePublishActivationGateFromHandoff|SingleSitePublishActivationGateEvaluator|AafActionGateValidatorFacade/);
  assert.doesNotMatch(source, /createApprovalRequest|createApprovalDecision|createActionGateAttempt|insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(source, /from\s+["'][^"']*(pasr|ddom|domain|dns|provider|vercel|openprovider|stripe|ai)[^"']*["']/i);
  assert.doesNotMatch(source, /\b(PublishActivationSourceReader|createDdomReadinessSnapshot|manualSnapshot|checkDomainStatus|new Stripe)\b/);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact/);
  assert.equal(PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS.readOnly, true);
  assert.equal(PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS.createsAafRecords, false);
});
