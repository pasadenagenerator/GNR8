import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildPublishActivationGateHandoff } from "./publish-activation-gate-handoff";
import {
  PUBLISH_ACTIVATION_DECISION_READ_BOUNDARY_FLAGS,
  buildPublishActivationDecisionReadModelFromSnapshot,
  type BuildPublishActivationDecisionReadModelInput,
} from "./publish-activation-decision-read-model";
import type { PublishActivationDecisionReadSnapshot } from "./publish-activation-decision-read-repository";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATHS = [
  path.join(DIR, "publish-activation-decision-read-repository.ts"),
  path.join(DIR, "publish-activation-decision-read-model.ts"),
  path.join(DIR, "publish-activation-gate-handoff.ts"),
];

const TENANT_ID = "tenant-mvp43";
const CLIENT_ID = "client-mvp43";
const SITE_ID = "site-mvp43";
const MIGRATION_ID = "migration-mvp43";
const REQUEST_ID = "request-mvp43";
const DECISION_ID = "decision-mvp43";
const EVIDENCE_ID = "evidence-mvp43";
const READINESS_ID = "readiness-mvp43";
const SITE_VERSION_ID = "site-version-mvp43";
const ARTIFACT_ID = "artifact-mvp43";
const PUBLISH_TARGET_ID = "production";

function input(overrides: Partial<BuildPublishActivationDecisionReadModelInput> = {}): BuildPublishActivationDecisionReadModelInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    publishActivationRequestId: REQUEST_ID,
    publishActivationDecisionId: DECISION_ID,
    launchReadinessEvidencePackageId: EVIDENCE_ID,
    expectedLaunchReadinessEvidenceWatermark: "wm:evidence",
    improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", SITE_VERSION_ID),
    improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", ARTIFACT_ID),
    publishTargetRef: ref("gnr8_publish_targets", PUBLISH_TARGET_ID),
    ...overrides,
  };
}

function ref(sourceTable: string, sourceRecordId: string, sourceWatermark = `wm:${sourceRecordId}`) {
  return { sourceSystem: "gnr8", sourceTable, sourceRecordId, sourceWatermark, sourceVersion: "v1", sourceRef: `gnr8:${sourceTable}:${sourceRecordId}` };
}

function payload(overrides: Record<string, unknown> = {}) {
  const requiredDimensions = ["launch_approval", "content_approval", "improved_candidate", "publish_target", "domain_readiness"];
  return {
    identity: {
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      siteId: SITE_ID,
      migrationId: MIGRATION_ID,
      launchReadinessRecordId: READINESS_ID,
    },
    readinessStatus: "ready",
    dimensionStatuses: Object.fromEntries(requiredDimensions.map((dimension) => [dimension, { status: "ready", required: true, freshnessStatus: "fresh", sourceWatermark: `wm:${dimension}` }])),
    requiredDimensions,
    freshness: [
      { key: "launch_readiness_record", required: true, status: "ready", freshnessStatus: "fresh", sourceWatermark: "wm:readiness", acceptedLimitation: false },
      ...requiredDimensions.map((dimension) => ({ key: dimension, required: true, status: "ready", freshnessStatus: "fresh", sourceWatermark: `wm:${dimension}`, acceptedLimitation: false })),
    ],
    acceptedLimitations: [],
    unresolvedNonP0Blockers: [],
    blockedDimensions: [],
    sourceRefs: {
      improved_candidate_site_version: [ref("gnr8_runtime_site_versions", SITE_VERSION_ID)],
      improved_runtime_artifact: [ref("gnr8_runtime_artifacts", ARTIFACT_ID)],
      publish_target: [ref("gnr8_publish_targets", PUBLISH_TARGET_ID)],
    },
    sourceWatermarks: {
      launch_readiness_record: "wm:readiness",
      improved_candidate: `wm:${SITE_VERSION_ID}`,
      publish_target: `wm:${PUBLISH_TARGET_ID}`,
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
    hash: `hash-${role}-mvp43`,
    snapshot_ref: `gnr8:${sourceTable}:${sourceRecordId}`,
    metadata_json: { refRole: role },
  };
}

function snapshot(overrides: Partial<PublishActivationDecisionReadSnapshot> = {}): PublishActivationDecisionReadSnapshot {
  const base: PublishActivationDecisionReadSnapshot = {
    transactionCapturedAt: "2026-08-05T10:00:00.000Z",
    request: {
      id: REQUEST_ID,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      site_id: SITE_ID,
      scope: "publish_activation",
      subject_type: "site_version",
      subject_id: SITE_VERSION_ID,
      site_version_id: SITE_VERSION_ID,
      status: "requested",
      policy_version: "MVP-41",
      requested_expires_at: null,
    },
    decisions: [
      {
        id: DECISION_ID,
        approval_request_id: REQUEST_ID,
        status: "granted",
        policy_version: "MVP-41",
        evidence_package_id: EVIDENCE_ID,
        policy_evaluation_id: "policy-eval-mvp43",
        decided_at: "2026-08-05T10:01:00.000Z",
        expires_at: null,
        revoked: false,
        superseded: false,
      },
    ],
    selectedDecision: {
      id: DECISION_ID,
      approval_request_id: REQUEST_ID,
      status: "granted",
      policy_version: "MVP-41",
      evidence_package_id: EVIDENCE_ID,
      policy_evaluation_id: "policy-eval-mvp43",
      decided_at: "2026-08-05T10:01:00.000Z",
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
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      site_id: SITE_ID,
      site_version_id: SITE_VERSION_ID,
      package_type: "single_site_launch_readiness_evidence",
      subject_type: "single_site_launch_readiness_package",
      subject_id: READINESS_ID,
      status: "created",
      freshness_label: "fresh",
      source_watermark: "wm:evidence",
      content_hash: "hash-evidence-mvp43",
      limitations_json: payload(),
    },
    evidenceSourceRefs: [
      sourceRefRow("improved_candidate_site_version", "gnr8_runtime_site_versions", SITE_VERSION_ID),
      sourceRefRow("improved_runtime_artifact", "gnr8_runtime_artifacts", ARTIFACT_ID),
      sourceRefRow("publish_target", "gnr8_publish_targets", PUBLISH_TARGET_ID),
    ],
    freshnessRows: [{ id: "freshness-mvp43", evidence_package_id: EVIDENCE_ID, result: "fresh", current_source_watermark: "wm:evidence", expires_at: null }],
    policyRows: [{ id: "policy-eval-mvp43", approval_request_id: REQUEST_ID, result: "approval_required", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: SITE_VERSION_ID, policy_version: "MVP-41" }],
    auditEvents: [{ id: "audit-mvp43", approval_decision_id: DECISION_ID, approval_request_id: REQUEST_ID, evidence_package_id: EVIDENCE_ID, payload_json: { semanticWatermark: "wm:decision", limitationsCarriedForward: [] } }],
    auditRefs: [{ id: "audit-ref", audit_event_id: "audit-mvp43", ref_role: "launch_readiness_evidence", ref_type: "aaf_evidence_package", ref_id: EVIDENCE_ID, source_system: "gnr8", source_table: "gnr8_aaf_evidence_packages", source_watermark: "wm:evidence" }],
    launchReadinessRecord: null,
    launchReadinessRefs: [],
    publishTarget: null,
  };
  return { ...base, ...overrides };
}

test("granted decision creates handoff-ready model and non-executing handoff", () => {
  const model = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot());
  const handoff = buildPublishActivationGateHandoff(model);
  assert.equal(model.validationSummary.status, "handoff_ready");
  assert.equal(model.flags.publishActivationApproved, true);
  assert.equal(model.flags.readyForGateEvaluation, true);
  assert.equal(model.flags.readyForPublishExecution, false);
  assert.equal(model.flags.createsAafRecords, false);
  assert.equal(model.flags.createsGateAttempt, false);
  assert.equal(model.flags.evaluatesGate, false);
  assert.equal(model.flags.publishes, false);
  assert.equal(handoff.status, "handoff_ready");
  assert.equal(handoff.flags.gatePass, false);
  assert.equal(handoff.flags.publishPermission, false);
  assert.equal(handoff.gateInputPreview?.siteVersionId, SITE_VERSION_ID);
});

test("granted_with_limitations carries launch readiness and decision limitations", () => {
  const limitedSnapshot = snapshot({
    selectedDecision: { ...snapshot().selectedDecision!, status: "granted_with_limitations" },
    decisions: [{ ...snapshot().selectedDecision!, status: "granted_with_limitations" }],
    evidencePackage: { ...snapshot().evidencePackage!, limitations_json: payload({ readinessStatus: "ready_with_limitations", acceptedLimitations: ["launch limitation"] }) },
    auditEvents: [{ ...snapshot().auditEvents[0]!, payload_json: { semanticWatermark: "wm:limited-decision", limitationsCarriedForward: ["launch limitation", "approval window only"] } }],
  });
  const model = buildPublishActivationDecisionReadModelFromSnapshot(input(), limitedSnapshot);
  assert.equal(model.validationSummary.status, "decision_granted_with_limitations");
  assert.deepEqual(model.readinessLimitations, ["launch limitation"]);
  assert.deepEqual(model.decisionLimitations, ["launch limitation", "approval window only"]);
  assert.equal(buildPublishActivationGateHandoff(model).status, "handoff_ready");
});

test("rejected decision is not handoff ready", () => {
  const rejected = snapshot({ selectedDecision: { ...snapshot().selectedDecision!, status: "rejected" }, decisions: [{ ...snapshot().selectedDecision!, status: "rejected" }] });
  const model = buildPublishActivationDecisionReadModelFromSnapshot(input(), rejected);
  const handoff = buildPublishActivationGateHandoff(model);
  assert.equal(model.validationSummary.status, "decision_rejected");
  assert.equal(model.nextAction, "review_rejected_decision");
  assert.equal(handoff.status, "handoff_blocked");
  assert.ok(handoff.blockerSummary.blockers.includes("approval_rejected"));
});

test("missing request and missing decision block distinctly", () => {
  const missingRequest = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ request: null, requestEvidenceLinks: [], policyRows: [] }));
  assert.equal(missingRequest.validationSummary.status, "not_requested");
  assert.equal(missingRequest.nextAction, "request_publish_activation");

  const missingDecision = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ selectedDecision: null, decisions: [], decisionEvidenceLinks: [] }));
  assert.equal(missingDecision.validationSummary.status, "decision_missing");
  assert.equal(missingDecision.nextAction, "await_publish_activation_decision");
});

test("wrong scope/action/evidence type block", () => {
  const wrongScope = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ request: { ...snapshot().request!, scope: "launch_signoff" } }));
  assert.ok(wrongScope.validationSummary.blockerCodes.includes("request_scope_mismatch"));

  const wrongAction = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ policyRows: [{ ...snapshot().policyRows[0]!, action_key: "publish" }] }));
  assert.ok(wrongAction.validationSummary.blockerCodes.includes("request_policy_evaluation_missing"));

  const wrongEvidence = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ evidencePackage: { ...snapshot().evidencePackage!, package_type: "publish_activation_evidence" } }));
  assert.equal(wrongEvidence.validationSummary.status, "handoff_blocked");
  assert.ok(wrongEvidence.validationSummary.blockerCodes.includes("evidence_type_mismatch"));
});

test("stale or blocked launch readiness evidence blocks", () => {
  const stale = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ freshnessRows: [{ ...snapshot().freshnessRows[0]!, result: "stale" }] }));
  assert.equal(stale.validationSummary.status, "evidence_stale");
  assert.equal(stale.nextAction, "refresh_launch_readiness_evidence");

  const blocked = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ evidencePackage: { ...snapshot().evidencePackage!, limitations_json: payload({ readinessStatus: "blocked" }) } }));
  assert.equal(blocked.validationSummary.status, "handoff_blocked");
  assert.ok(blocked.validationSummary.blockerCodes.includes("readiness_status_blocked"));
});

test("missing candidate, artifact, or publish target refs block", () => {
  for (const [role, expected] of [
    ["improved_candidate_site_version", "improved_candidate_site_version_ref_missing"],
    ["improved_runtime_artifact", "improved_runtime_artifact_ref_missing"],
    ["publish_target", "publish_target_ref_missing"],
  ] as const) {
    const model = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ evidenceSourceRefs: snapshot().evidenceSourceRefs.filter((row) => (row.metadata_json as { refRole?: string }).refRole !== role), evidencePackage: { ...snapshot().evidencePackage!, limitations_json: payload({ sourceRefs: {} }) } }));
    assert.equal(model.validationSummary.status, "handoff_blocked");
    assert.ok(model.validationSummary.blockerCodes.includes(expected));
  }
});

test("conflicting decisions block", () => {
  const conflict = { ...snapshot().selectedDecision!, id: "decision-other", status: "granted" };
  const model = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ conflictingDecisions: [snapshot().selectedDecision!, conflict], activeDecisions: [snapshot().selectedDecision!, conflict] }));
  assert.equal(model.validationSummary.status, "handoff_blocked");
  assert.ok(model.validationSummary.blockerCodes.includes("conflicting_active_publish_activation_decisions"));
});

test("request pending projects await decision", () => {
  const model = buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ selectedDecision: null, decisions: [], decisionEvidenceLinks: [] }));
  assert.equal(model.nextAction, "await_publish_activation_decision");
});

test("handoff watermark deterministic and excludes transaction timestamp", () => {
  const first = buildPublishActivationGateHandoff(buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ transactionCapturedAt: "2026-08-05T10:00:00.000Z" })));
  const second = buildPublishActivationGateHandoff(buildPublishActivationDecisionReadModelFromSnapshot(input(), snapshot({ transactionCapturedAt: "2026-08-05T11:00:00.000Z" })));
  assert.equal(first.semanticHandoffWatermark, second.semanticHandoffWatermark);
  assert.equal(first.watermarks.readModel, second.watermarks.readModel);
});

test("source guardrails avoid AAF writes, gate attempts, PASR, DDOM, provider, publish, rollback, and runtime calls", () => {
  const source = SOURCE_PATHS.map((sourcePath) => fs.readFileSync(sourcePath, "utf8")).join("\n");
  assert.doesNotMatch(source, /createApproval(Request|Decision)Transaction|createEvidencePackageTransaction|insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(source, /createGateAttemptTransaction|createActionGateAttempt|evaluatePublishActivationGateDryRun|AafActionGateValidatorFacade/);
  assert.doesNotMatch(source, /PublishActivationSourceReader|shadowObserver|pasr.*observer|pasr_observer/i);
  assert.doesNotMatch(source, /createDdomReadinessSnapshot|manualSnapshot|ddom-readiness-snapshot-writer|ddom-readiness-manual/i);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|publish-enforcement|publish-safety|publish-activation-guard/);
  assert.doesNotMatch(source, /checkDomainStatus|openprovider|vercel\.|stripe\.|new Stripe|ai_execution|provider.*execute/i);
  assert.equal(PUBLISH_ACTIVATION_DECISION_READ_BOUNDARY_FLAGS.createsAafRecords, false);
});
