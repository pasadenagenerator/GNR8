import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { AafGateValidationInput, AafGateValidationResult } from "../aaf/aaf-policy-gate-facade";
import type { PublishActivationGateHandoffPackage } from "./publish-activation-gate-handoff";
import {
  PUBLISH_ACTIVATION_GATE_EVALUATOR_FLAGS,
  SingleSitePublishActivationGateEvaluator,
  buildPublishActivationGateInputFromHandoff,
  buildPublishActivationSemanticGateInputWatermark,
  type EvaluatePublishActivationGateFromHandoffInput,
} from "./publish-activation-gate-evaluator";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.join(DIR, "publish-activation-gate-evaluator.ts");

const TENANT_ID = "tenant-mvp44";
const CLIENT_ID = "client-mvp44";
const SITE_ID = "site-mvp44";
const MIGRATION_ID = "migration-mvp44";
const REQUEST_ID = "request-mvp44";
const DECISION_ID = "decision-mvp44";
const EVIDENCE_ID = "evidence-mvp44";
const SITE_VERSION_ID = "site-version-mvp44";
const ARTIFACT_ID = "artifact-mvp44";
const PUBLISH_TARGET_ID = "production";

class FakeGateValidator {
  calls: AafGateValidationInput[] = [];
  nextResult?: Partial<AafGateValidationResult>;
  throwError: Error | null = null;

  async validateGate(input: AafGateValidationInput): Promise<AafGateValidationResult> {
    this.calls.push(input);
    if (this.throwError) throw this.throwError;
    const gateResult = this.nextResult?.gateResult ?? "allowed";
    return {
      gateResult,
      policyEvaluation: this.nextResult?.policyEvaluation ?? { id: "policy-eval-mvp44", result: "approval_required" },
      gateAttempt: this.nextResult?.gateAttempt ?? { id: "gate-attempt-mvp44", gate_result: gateResult },
      preActionAuditEvent: this.nextResult?.preActionAuditEvent ?? { id: "audit-mvp44", event_family: "publish" },
      blockerCodes: this.nextResult?.blockerCodes ?? [],
      failClosedReason: this.nextResult?.failClosedReason ?? null,
    };
  }
}

function ref(role: string, sourceTable: string, sourceRecordId: string, sourceWatermark = `wm:${sourceRecordId}`) {
  return {
    role,
    sourceSystem: "gnr8",
    sourceTable,
    sourceRecordId,
    sourceVersion: "v1",
    sourceWatermark,
    sourceRef: `gnr8:${sourceTable}:${sourceRecordId}`,
    contentHash: `hash:${sourceRecordId}`,
    metadataJson: { role },
  };
}

function handoff(overrides: Partial<PublishActivationGateHandoffPackage> = {}): PublishActivationGateHandoffPackage {
  const candidate = ref("improved_candidate_site_version", "gnr8_runtime_site_versions", SITE_VERSION_ID);
  const artifact = ref("improved_runtime_artifact", "gnr8_runtime_artifacts", ARTIFACT_ID);
  const publishTarget = ref("publish_target", "gnr8_publish_targets", PUBLISH_TARGET_ID);
  const base: PublishActivationGateHandoffPackage = {
    handoffVersion: "mvp-43-publish-activation-gate-handoff:v1",
    readModelVersion: "mvp-43-publish-activation-decision-read-model:v1",
    status: "handoff_ready",
    identity: { tenantId: TENANT_ID, clientId: CLIENT_ID, siteId: SITE_ID, migrationId: MIGRATION_ID },
    decision: {
      id: DECISION_ID,
      ref: `aaf:approval_decision:${DECISION_ID}`,
      status: "granted",
      semanticWatermark: "wm:decision",
    },
    request: {
      id: REQUEST_ID,
      ref: `aaf:approval_request:${REQUEST_ID}`,
      status: "requested",
      semanticWatermark: "wm:request",
    },
    launchReadinessEvidence: {
      packageId: EVIDENCE_ID,
      packageRef: `aaf:evidence_package:${EVIDENCE_ID}`,
      sourceWatermark: "wm:evidence",
      readinessStatus: "ready",
    },
    candidateSiteVersionRef: candidate,
    runtimeArtifactRef: artifact,
    publishTargetRef: publishTarget,
    limitations: { readiness: [], decision: [], combined: [] },
    sourceRefs: [candidate, artifact, publishTarget],
    auditRefs: [ref("launch_readiness_evidence", "gnr8_aaf_evidence_packages", EVIDENCE_ID, "wm:evidence")],
    watermarks: {
      readModel: "wm:read-model",
      request: "wm:request",
      decision: "wm:decision",
      launchReadinessEvidence: "wm:evidence",
      candidateSiteVersion: `wm:${SITE_VERSION_ID}`,
      runtimeArtifact: `wm:${ARTIFACT_ID}`,
      publishTarget: `wm:${PUBLISH_TARGET_ID}`,
    },
    freshnessSummary: { status: "fresh", currentSourceWatermark: "wm:evidence", expiresAt: null, rowsRead: 1 },
    blockerSummary: { blockers: [], missing: [], stale: [], warnings: [], conflictingDecisionIds: [] },
    gateInputPreview: {
      previewOnly: true,
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      siteId: SITE_ID,
      siteVersionId: SITE_VERSION_ID,
      runtimeArtifactId: ARTIFACT_ID,
      intendedPublishTarget: PUBLISH_TARGET_ID,
      publishActivationApproval: { approvalRequestId: REQUEST_ID, approvalDecisionId: DECISION_ID, scope: "publish_activation" },
      evidencePackageId: EVIDENCE_ID,
      policyVersion: "MVP-41",
      sourceRefs: {
        siteVersion: { sourceTable: candidate.sourceTable, sourceRecordId: SITE_VERSION_ID, currentWatermark: candidate.sourceWatermark, evidenceWatermark: candidate.sourceWatermark },
        runtimeArtifact: { sourceTable: artifact.sourceTable, sourceRecordId: ARTIFACT_ID, currentWatermark: artifact.sourceWatermark, evidenceWatermark: artifact.sourceWatermark },
        activePointer: { sourceTable: "mvp43_handoff_preview_only_no_active_pointer_read", sourceRecordId: SITE_ID, currentWatermark: "preview_only_not_gate_input_complete", evidenceWatermark: "preview_only_not_gate_input_complete" },
        publishTarget: { sourceTable: publishTarget.sourceTable, sourceRecordId: PUBLISH_TARGET_ID, currentWatermark: publishTarget.sourceWatermark, evidenceWatermark: publishTarget.sourceWatermark },
        domainReadiness: { sourceTable: "mvp43_handoff_preview_only_launch_readiness_domain_ref", sourceRecordId: SITE_ID, currentWatermark: "wm:evidence", evidenceWatermark: "wm:evidence" },
        contentOverridePublishedState: null,
      },
    },
    semanticHandoffWatermark: "single-site-publish-activation-gate-handoff:wm-mvp44",
    flags: {
      derivedOnly: true,
      mutatesSourceTruth: false,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
      publishes: false,
      readyForPublishExecution: false,
      handoffOnly: true,
      publishActivationApproved: true,
      readyForGateEvaluation: true,
      gatePass: false,
      publishPermission: false,
    },
  };
  return { ...base, ...overrides };
}

function input(overrides: Partial<EvaluatePublishActivationGateFromHandoffInput> = {}): EvaluatePublishActivationGateFromHandoffInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    handoff: handoff(),
    actor: { actorType: "human", actorId: "operator-mvp44", actorRole: "release_operator" },
    correlationId: "corr-mvp44",
    idempotencyKey: "idem-mvp44",
    ...overrides,
  };
}

async function evaluate(overrides: Partial<EvaluatePublishActivationGateFromHandoffInput> = {}, fake = new FakeGateValidator()) {
  const evaluator = new SingleSitePublishActivationGateEvaluator(fake);
  const result = await evaluator.evaluatePublishActivationGateFromHandoff(input(overrides));
  return { result, fake };
}

test("publish activation gate evaluator is server-only and import-isolated from publish/runtime/provider paths", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /createApproval(Request|Decision)|createApprovalRequestTransaction|createApprovalDecisionTransaction/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(pasr|publish-activation-source|shadow-observer)|PublishActivationSourceReader|shadowObserver/i);
  assert.doesNotMatch(source, /createDdomReadinessSnapshot|manualSnapshot|ddom-readiness-snapshot-writer|ddom-readiness-manual/i);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|publish-enforcement|publish-safety|publish-activation-guard/);
  assert.doesNotMatch(source, /checkDomainStatus|openprovider|vercel\.|stripe\.|new Stripe|ai_execution|provider.*execute/i);
});

test("valid handoff builds deterministic AAF gate input and evaluates without publishing or enforcement", async () => {
  const { result, fake } = await evaluate();
  assert.equal(result.gateEvaluated, true);
  assert.equal(result.evaluationStatus, "allowed");
  assert.equal(result.gateResult, "allowed");
  assert.equal(result.gateAttemptId, "gate-attempt-mvp44");
  assert.equal(result.auditEventId, "audit-mvp44");
  assert.equal(result.flags, PUBLISH_ACTIVATION_GATE_EVALUATOR_FLAGS);
  assert.equal(result.flags.enforcementApplied, false);
  assert.equal(result.flags.publishActionBlocked, false);
  assert.equal(result.flags.publishes, false);
  assert.equal(result.flags.runtimeMutation, false);
  assert.equal(result.flags.providerCalls, false);
  assert.equal(result.flags.pasrInvoked, false);
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0]?.scope, "publish_activation");
  assert.equal(fake.calls[0]?.actionKey, "publish.activation");
  assert.equal(fake.calls[0]?.subjectType, "site_version");
  assert.equal(fake.calls[0]?.subjectId, SITE_VERSION_ID);
  assert.equal(fake.calls[0]?.approvalRequestId, REQUEST_ID);
  assert.equal(fake.calls[0]?.approvalDecisionId, DECISION_ID);
  assert.equal(fake.calls[0]?.evidencePackageId, EVIDENCE_ID);
  assert.equal(fake.calls[0]?.requiredEvidenceType, null);
  assert.equal(fake.calls[0]?.auditRequired, true);
  assert.equal(fake.calls[0]?.auditEventFamily, "publish");
});

test("semantic gate input watermark is deterministic and carried into AAF causation for drift detection", () => {
  const first = buildPublishActivationSemanticGateInputWatermark(input());
  const { correlationId: _correlationId, idempotencyKey: _idempotencyKey, ...watermarkInput } = input();
  const second = buildPublishActivationSemanticGateInputWatermark(watermarkInput);
  assert.equal(first, second);
  const gateInput = buildPublishActivationGateInputFromHandoff(input({ causationId: "upstream-cause" }));
  assert.equal(gateInput.semanticGateInputWatermark, first);
  assert.match(String(gateInput.aafGateValidationInput.causationId), /^upstream-cause:single-site-publish-activation-gate-input:/);
});

test("granted_with_limitations evaluates as warning and carries limitations", async () => {
  const limited = handoff({
    decision: { ...handoff().decision, status: "granted_with_limitations" },
    launchReadinessEvidence: { ...handoff().launchReadinessEvidence, readinessStatus: "ready_with_limitations" },
    limitations: {
      readiness: ["readiness limitation"],
      decision: ["approval limited to production target"],
      combined: ["readiness limitation", "approval limited to production target"],
    },
  });
  const { result } = await evaluate({ handoff: limited });
  assert.equal(result.gateResult, "allowed");
  assert.equal(result.evaluationStatus, "warning");
  assert.deepEqual(result.limitations.combined, ["readiness limitation", "approval limited to production target"]);
  assert.ok(result.warnings.includes("limitations_carried_forward"));
});

for (const [name, packageOverride, expected] of [
  ["missing handoff", null, "handoff_missing"],
  ["handoff not ready", handoff({ status: "handoff_blocked" }), "handoff_status_handoff_blocked"],
  ["missing decision", handoff({ decision: { ...handoff().decision, id: null, ref: null, status: null } }), "decision_missing"],
  ["rejected decision", handoff({ decision: { ...handoff().decision, status: "rejected" } }), "decision_rejected"],
  ["wrong scope", handoff({ blockerSummary: { ...handoff().blockerSummary, blockers: ["request_scope_mismatch"] } }), "request_scope_mismatch"],
  ["wrong action", handoff({ blockerSummary: { ...handoff().blockerSummary, blockers: ["request_action_mismatch"] } }), "request_action_mismatch"],
  ["wrong evidence package type", handoff({ blockerSummary: { ...handoff().blockerSummary, blockers: ["evidence_type_mismatch"] } }), "evidence_type_mismatch"],
  ["missing candidate ref", handoff({ candidateSiteVersionRef: null }), "candidate_site_version_ref_missing"],
  ["missing artifact ref", handoff({ runtimeArtifactRef: null }), "runtime_artifact_ref_missing"],
  ["missing publish target ref", handoff({ publishTargetRef: null }), "publish_target_ref_missing"],
  ["request pending", handoff({ request: { ...handoff().request, status: "pending" } }), "request_status_pending"],
  ["PASR-ready-only status without decision", handoff({ decision: { ...handoff().decision, id: null, ref: null, status: null }, blockerSummary: { ...handoff().blockerSummary, warnings: ["pasr_ready"] } }), "decision_missing"],
  ["launch readiness evidence without MVP-42 decision", handoff({ decision: { ...handoff().decision, id: null, ref: null, status: null } }), "decision_missing"],
  ["Command Center status alone", handoff({ decision: { ...handoff().decision, id: null, ref: null, status: null }, blockerSummary: { ...handoff().blockerSummary, warnings: ["command_center_ready"] } }), "decision_missing"],
  ["Ops Inbox status alone", handoff({ decision: { ...handoff().decision, id: null, ref: null, status: null }, blockerSummary: { ...handoff().blockerSummary, warnings: ["ops_inbox_resolved"] } }), "decision_missing"],
  ["AI provider output alone", handoff({ decision: { ...handoff().decision, id: null, ref: null, status: null }, blockerSummary: { ...handoff().blockerSummary, warnings: ["ai_output_ready"] } }), "decision_missing"],
] as const) {
  test(`${name} fails closed before AAF gate evaluation`, async () => {
    const fake = new FakeGateValidator();
    const { result } = await evaluate({ handoff: packageOverride }, fake);
    assert.equal(result.gateEvaluated, false);
    assert.equal(result.gateResult, "fail_closed");
    assert.ok(result.blockerCodes.includes(expected));
    assert.equal(fake.calls.length, 0);
  });
}

test("blocked handoff, missing refs, and watermark mismatch fail closed", async () => {
  const blocked = await evaluate({ handoff: handoff({ blockerSummary: { ...handoff().blockerSummary, blockers: ["blocked_dimensions_present"] } }) });
  assert.equal(blocked.result.gateEvaluated, false);
  assert.ok(blocked.result.blockerCodes.includes("blocked_dimensions_present"));

  const missingExpected = await evaluate({ expectedHandoffWatermark: "other-watermark" });
  assert.equal(missingExpected.result.gateEvaluated, false);
  assert.ok(missingExpected.result.blockerCodes.includes("expected_handoff_watermark_mismatch"));

  const wrongPublishTarget = await evaluate({ expectedPublishTargetRef: "staging" });
  assert.equal(wrongPublishTarget.result.gateEvaluated, false);
  assert.ok(wrongPublishTarget.result.blockerCodes.includes("expected_publish_target_ref_mismatch"));
});

test("facade blocked result remains non-enforcing and non-publishing", async () => {
  const fake = new FakeGateValidator();
  fake.nextResult = { gateResult: "blocked", blockerCodes: ["approval_scope_or_subject_mismatch"] };
  const { result } = await evaluate({}, fake);
  assert.equal(result.gateEvaluated, true);
  assert.equal(result.evaluationStatus, "blocked");
  assert.equal(result.flags.enforcementApplied, false);
  assert.equal(result.flags.publishActionBlocked, false);
  assert.equal(result.flags.publishes, false);
  assert.ok(result.blockerCodes.includes("approval_scope_or_subject_mismatch"));
});

test("idempotent replay reuses facade result and semantic drift conflicts are surfaced", async () => {
  const fake = new FakeGateValidator();
  const evaluator = new SingleSitePublishActivationGateEvaluator(fake);
  const first = await evaluator.evaluatePublishActivationGateFromHandoff(input());
  const second = await evaluator.evaluatePublishActivationGateFromHandoff(input());
  assert.equal(first.gateAttemptId, second.gateAttemptId);
  assert.equal(fake.calls.length, 2);

  fake.throwError = new Error("AAF idempotency conflict in gnr8_aaf_action_gate_attempts for key idem-mvp44: semantic payload drift in causation_id");
  await assert.rejects(
    () => evaluator.evaluatePublishActivationGateFromHandoff(input({ handoff: handoff({ semanticHandoffWatermark: "single-site-publish-activation-gate-handoff:drift" }) })),
    /PublishActivationGateEvaluatorIdempotencyConflictError|idempotency conflict/i,
  );
});
