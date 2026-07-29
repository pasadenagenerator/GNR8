import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getCommandCenterPublishShadowSurfaceViewModel,
} from "./aaf-command-center-publish-shadow-view-model";
import {
  buildPublishShadowResultReadModel,
  type PublishShadowRawDdomSnapshotRow,
  type PublishShadowRawEvidencePackageRow,
  type PublishShadowRawGateAttemptRow,
  type PublishShadowRawSourceRefRow,
  type PublishShadowResultRepositorySnapshot,
} from "./aaf-publish-shadow-result-read-model";

const TENANT_ID = "tenant-test";
const CLIENT_ID = "client-test";
const SITE_ID = "site-test";
const SITE_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const ARTIFACT_ID = "33333333-3333-4333-8333-333333333333";
const EVIDENCE_ID = "11111111-1111-4111-8111-111111111111";
const DDOM_ID = "44444444-4444-4444-8444-444444444444";
const APPROVAL_DECISION_ID = "55555555-5555-4555-8555-555555555555";
const GATE_ATTEMPT_ID = "66666666-6666-4666-8666-666666666666";
const POLICY_EVALUATION_ID = "77777777-7777-4777-8777-777777777777";
const APPROVAL_REQUEST_ID = "88888888-8888-4888-8888-888888888888";
const AUDIT_EVENT_ID = "99999999-9999-4999-8999-999999999999";
const RAW_SOURCE_REF = `gnr8:gnr8_ddom_readiness_snapshots:${DDOM_ID}`;
const RAW_IDEMPOTENCY_KEY = "idem-sensitive-test";

const HOSTING_DETAIL_PAGE = new URL("../../app/gnr8/command-center/hosting/[siteId]/page.tsx", import.meta.url);

function evidence(overrides: Partial<PublishShadowRawEvidencePackageRow> = {}): PublishShadowRawEvidencePackageRow {
  return {
    id: EVIDENCE_ID,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    site_version_id: SITE_VERSION_ID,
    package_type: "publish_activation_evidence",
    subject_type: "site_version",
    subject_id: SITE_VERSION_ID,
    status: "created",
    created_by_actor_type: "human",
    created_by_actor_id: "operator-sensitive-test",
    created_at: "2026-07-28T08:00:00.000Z",
    source_watermark: "siteVersion:wm|runtimeArtifact:wm|activePointer:wm|publishTarget:wm|domainReadiness:wm",
    freshness_label: "fresh",
    expires_at: null,
    limitations_json: { missingSourceTruth: [], limitations: [], warnings: [] },
    correlation_id: "corr-sensitive-test",
    causation_id: null,
    idempotency_key: RAW_IDEMPOTENCY_KEY,
    request_id: null,
    ...overrides,
  };
}

function sourceRef(key: string, table: string, id: string, overrides: Partial<PublishShadowRawSourceRefRow> = {}): PublishShadowRawSourceRefRow {
  return {
    id: `${id}-ref`,
    evidence_package_id: EVIDENCE_ID,
    source_system: "gnr8",
    source_table: table,
    source_record_id: id,
    source_version: "v1",
    source_watermark: `${key}:wm`,
    captured_at: "2026-07-28T08:00:00.000Z",
    query_ref: `aaf_publish_activation_source_reader:v1:${key}`,
    snapshot_ref: key === "domainReadiness" ? RAW_SOURCE_REF : `gnr8:${table}:${id}`,
    metadata_json: {
      sourceKey: key,
      freshnessStatus: "fresh",
      staleReason: null,
      watermarkMetadata: { canonicalWatermark: `${key}:wm` },
      limitations: [],
    },
    ...overrides,
  };
}

function sourceRefs(overrides: Partial<Record<string, PublishShadowRawSourceRefRow | null>> = {}): PublishShadowRawSourceRefRow[] {
  const refs: Record<string, PublishShadowRawSourceRefRow | null> = {
    siteVersion: sourceRef("siteVersion", "gnr8_runtime_site_versions", SITE_VERSION_ID),
    runtimeArtifact: sourceRef("runtimeArtifact", "gnr8_runtime_artifacts", ARTIFACT_ID),
    activePointer: sourceRef("activePointer", "gnr8_runtime_active_pointers", SITE_ID),
    publishTarget: sourceRef("publishTarget", "gnr8_publish_targets", "production"),
    domainReadiness: sourceRef("domainReadiness", "gnr8_ddom_readiness_snapshots", DDOM_ID),
    contentOverridePublishedState: sourceRef("contentOverridePublishedState", "gnr8_content_overrides", "site_version:published"),
    publishActivationApproval: sourceRef("publishActivationApproval", "gnr8_aaf_approval_decisions", APPROVAL_DECISION_ID),
    ...overrides,
  };
  return Object.values(refs).filter((row): row is PublishShadowRawSourceRefRow => Boolean(row));
}

function ddom(overrides: Partial<PublishShadowRawDdomSnapshotRow> = {}): PublishShadowRawDdomSnapshotRow {
  return {
    id: DDOM_ID,
    readiness_state: "ready",
    readiness_blockers: [],
    readiness_warnings: [],
    freshness_state: "fresh",
    fresh_until: "2026-07-29T08:00:00.000Z",
    stale_reason: null,
    captured_at: "2026-07-28T08:00:00.000Z",
    source_watermark: "domainReadiness:wm",
    created_at: "2026-07-28T08:00:00.000Z",
    ...overrides,
  };
}

function gate(overrides: Partial<PublishShadowRawGateAttemptRow> = {}): PublishShadowRawGateAttemptRow {
  return {
    id: GATE_ATTEMPT_ID,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    site_version_id: SITE_VERSION_ID,
    action_key: "publish.activation",
    scope: "publish_activation",
    subject_type: "site_version",
    subject_id: SITE_VERSION_ID,
    actor_type: "human",
    actor_id: "operator-sensitive-test",
    actor_role: "agency_admin",
    policy_evaluation_id: POLICY_EVALUATION_ID,
    evidence_package_id: EVIDENCE_ID,
    approval_request_id: APPROVAL_REQUEST_ID,
    approval_decision_id: APPROVAL_DECISION_ID,
    pre_action_audit_event_id: AUDIT_EVENT_ID,
    outcome_audit_event_id: null,
    gate_result: "allowed",
    fail_closed_reason: null,
    correlation_id: "corr-sensitive-test",
    causation_id: null,
    idempotency_key: RAW_IDEMPOTENCY_KEY,
    request_id: null,
    started_at: "2026-07-28T08:00:00.000Z",
    completed_at: "2026-07-28T08:00:01.000Z",
    created_at: "2026-07-28T08:00:01.000Z",
    ...overrides,
  };
}

function snapshot(overrides: Partial<PublishShadowResultRepositorySnapshot> = {}): PublishShadowResultRepositorySnapshot {
  return {
    capturedAt: "2026-07-28T08:00:00.000Z",
    input: {
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      siteId: SITE_ID,
      siteVersionId: SITE_VERSION_ID,
      runtimeArtifactId: ARTIFACT_ID,
      intendedPublishTarget: "production",
      intendedPublishStage: "production",
      trustedPublishEnvironment: "production",
      correlationId: "corr-sensitive-test",
      idempotencyKey: RAW_IDEMPOTENCY_KEY,
      shadowEnabledState: "enabled",
      generatedAt: "2026-07-28T08:10:00.000Z",
    },
    evidencePackage: evidence(),
    sourceRefs: sourceRefs(),
    freshnessChecks: [],
    gateAttempt: gate(),
    policyEvaluation: {
      id: POLICY_EVALUATION_ID,
      result: "approval_required",
      policy_version: "PASR-2-shadow",
      scope: "publish_activation",
      action_key: "publish.activation",
      subject_type: "site_version",
      subject_id: SITE_VERSION_ID,
      approval_request_id: APPROVAL_REQUEST_ID,
      approval_decision_id: APPROVAL_DECISION_ID,
      evidence_package_id: EVIDENCE_ID,
      blocker_codes: [],
      stale_reason: null,
      audit_event_id: AUDIT_EVENT_ID,
      evaluated_at: "2026-07-28T08:00:00.000Z",
      correlation_id: "corr-sensitive-test",
      idempotency_key: `${RAW_IDEMPOTENCY_KEY}:policy`,
    },
    auditEvent: {
      id: AUDIT_EVENT_ID,
      event_name: "aaf.gate.allowed",
      event_family: "publish",
      severity: "notice",
      subject_type: "site_version",
      subject_id: SITE_VERSION_ID,
      policy_evaluation_id: POLICY_EVALUATION_ID,
      evidence_package_id: EVIDENCE_ID,
      approval_request_id: APPROVAL_REQUEST_ID,
      approval_decision_id: APPROVAL_DECISION_ID,
      payload_json: { nonExecuting: true, gateResult: "allowed", blockerCodes: [] },
      correlation_id: "corr-sensitive-test",
      idempotency_key: `${RAW_IDEMPOTENCY_KEY}:audit`,
      created_at: "2026-07-28T08:00:00.000Z",
    },
    ddomSnapshot: ddom(),
    publishTarget: {
      id: "production",
      environment: "production",
      target_kind: "public_runtime",
      publish_stage: "production",
      status: "active",
      policy_version: "ptt-1",
      requires_aaf: true,
      requires_ddom_snapshot: true,
      requires_launch_signoff: false,
      allowed_artifact_stages: ["production"],
      limitations_json: {},
      source_watermark: "publishTarget:wm",
      created_at: "2026-07-28T08:00:00.000Z",
      updated_at: "2026-07-28T08:00:00.000Z",
    },
    approvalTimeline: {
      approval_request_id: APPROVAL_REQUEST_ID,
      approval_decision_id: APPROVAL_DECISION_ID,
      scope: "publish_activation",
      subject_type: "site_version",
      subject_id: SITE_VERSION_ID,
      request_status: "requested",
      request_policy_version: "PASR-2-shadow",
      request_created_at: "2026-07-28T07:00:00.000Z",
      requested_expires_at: null,
      decision_status: "granted",
      decided_at: "2026-07-28T07:10:00.000Z",
      decision_policy_version: "PASR-2-shadow",
      evidence_package_id: EVIDENCE_ID,
      policy_evaluation_id: POLICY_EVALUATION_ID,
      decision_expires_at: null,
      revocations_json: [],
      supersessions_json: [],
      partial_timeline_json: [],
    },
    runtimeContext: {
      siteVersion: { id: SITE_VERSION_ID, site_id: SITE_ID, state: "APPROVED", artifact_id: ARTIFACT_ID, updated_at: "2026-07-28T08:00:00.000Z" },
      runtimeArtifact: { id: ARTIFACT_ID, site_id: SITE_ID, site_version_id: SITE_VERSION_ID, publish_stage: "production", created_at: "2026-07-28T08:00:00.000Z" },
      activePointer: { site_id: SITE_ID, active_site_version_id: "00000000-0000-4000-8000-000000000000", active_artifact_id: "00000000-0000-4000-8000-000000000001", updated_at: "2026-07-28T07:00:00.000Z" },
    },
    limitations: [],
    ...overrides,
  };
}

async function view(overrides: Partial<PublishShadowResultRepositorySnapshot> = {}, input = {}) {
  return getCommandCenterPublishShadowSurfaceViewModel(
    {
      actorId: "viewer-test",
      actorRole: "platform_superadmin",
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      siteId: SITE_ID,
      siteVersionId: SITE_VERSION_ID,
      runtimeArtifactId: ARTIFACT_ID,
      ...input,
    },
    {
      readPublishShadowResult: async () => buildPublishShadowResultReadModel(snapshot(overrides)),
    },
  );
}

test("authorized Command Center role sees redacted shadow status and non-enforcement labels", async () => {
  const model = await view();

  assert.equal(model.state, "visible");
  assert.equal(model.shadowStatusLabel, "shadow_ready");
  assert.equal(model.nonEnforcementLabel.includes("non-enforcing"), true);
  assert.equal(model.nonEnforcementLabel.includes("Publish was not blocked"), true);
  assert.equal(model.derivedOnlyLabel.includes("derived view"), true);
  assert.equal(model.projection?.derivedOnly, true);
  assert.equal(model.projection?.publishActionBlocked, false);
});

test("missing DDOM snapshot is non-blocking and recommends manual DDOM workflow outside PASR when permitted", async () => {
  const model = await view({
    evidencePackage: evidence({ limitations_json: { missingSourceTruth: ["domainReadiness"], limitations: ["missing_source_truth_present"] } }),
    sourceRefs: sourceRefs({ domainReadiness: null }),
    ddomSnapshot: null,
  });

  assert.equal(model.shadowStatusLabel, "shadow_missing_ddom_snapshot");
  assert.equal(model.ddomStatusLabel, "missing");
  assert.equal(model.recommendedActionLabel, "Refresh domain readiness through the DDOM workflow.");
  assert.equal(model.projection?.recommendedNextAction.actionKey, "run_ddom_manual_trigger_outside_pasr");
  assert.equal(model.projection?.ddomReadiness.createsSnapshot, false);
  assert.equal(model.projection?.publishActionBlocked, false);
});

test("missing publish activation approval is surfaced as non-blocking", async () => {
  const model = await view({
    gateAttempt: gate({ gate_result: "approval_required", approval_request_id: null, approval_decision_id: null }),
    policyEvaluation: {
      ...snapshot().policyEvaluation!,
      result: "approval_required",
      approval_request_id: null,
      approval_decision_id: null,
      blocker_codes: ["approval_missing"],
    },
    approvalTimeline: null,
  });

  assert.equal(model.shadowStatusLabel, "shadow_missing_publish_activation_approval");
  assert.equal(model.approvalPublishActivationLabel, "missing");
  assert.equal(model.recommendedActionLabel, "Route publish activation approval in AAF.");
  assert.equal(model.projection?.recommendedNextAction.blocksCurrentPublish, false);
});

test("shadow disabled or no records returns a safe empty state", async () => {
  const model = await view({
    input: { tenantId: TENANT_ID, clientId: CLIENT_ID, siteId: SITE_ID, siteVersionId: SITE_VERSION_ID, shadowEnabledState: "disabled" },
    evidencePackage: null,
    sourceRefs: [],
    freshnessChecks: [],
    gateAttempt: null,
    policyEvaluation: null,
    auditEvent: null,
    ddomSnapshot: null,
    publishTarget: null,
    approvalTimeline: null,
    limitations: ["shadow_observation_records_not_found"],
  });

  assert.equal(model.state, "empty");
  assert.equal(model.shadowStatusLabel, "shadow_not_enabled");
  assert.equal(model.operatorSummary.includes("did not block publish"), true);
});

test("read model unavailable returns a safe unavailable state", async () => {
  const model = await view({
    evidencePackage: null,
    sourceRefs: [],
    freshnessChecks: [],
    gateAttempt: null,
    policyEvaluation: null,
    auditEvent: null,
    ddomSnapshot: null,
    publishTarget: null,
    approvalTimeline: null,
    limitations: ["publish_shadow_read_repository_unavailable"],
  });

  assert.equal(model.state, "unavailable");
  assert.equal(model.limitationSummaryLabel.includes("publish_shadow_read_repository_unavailable"), true);
  assert.equal(model.nonEnforcementLabel.includes("non-blocking"), true);
});

test("client reviewer is forbidden and receives no shadow diagnostics", async () => {
  const model = await view({}, { actorRole: "client_reviewer" });

  assert.equal(model.state, "forbidden");
  assert.equal(model.projection?.access.allowed, false);
  assert.equal(model.projection?.visibility, "forbidden");
  assert.equal(JSON.stringify(model).includes(EVIDENCE_ID), false);
  assert.equal(JSON.stringify(model).includes(RAW_SOURCE_REF), false);
});

test("redacted roles do not expose raw refs or idempotency keys", async () => {
  const model = await view(
    {},
    {
      actorRole: "agency_admin",
      actorTenantIds: [TENANT_ID],
      actorClientIds: [CLIENT_ID],
      actorSiteIds: [SITE_ID],
      actorSiteVersionIds: [SITE_VERSION_ID],
    },
  );
  const serialized = JSON.stringify(model);

  assert.equal(model.state, "visible");
  assert.equal(serialized.includes(RAW_SOURCE_REF), false);
  assert.equal(serialized.includes(RAW_IDEMPOTENCY_KEY), false);
  assert.equal(serialized.includes("operator-sensitive-test"), false);
});

test("adapter only calls PASR read model and redaction dependencies", async () => {
  let readCalls = 0;
  const model = await getCommandCenterPublishShadowSurfaceViewModel(
    {
      actorId: "viewer-test",
      actorRole: "platform_superadmin",
      siteId: SITE_ID,
      siteVersionId: SITE_VERSION_ID,
    },
    {
      readPublishShadowResult: async () => {
        readCalls += 1;
        return buildPublishShadowResultReadModel(snapshot());
      },
    },
  );

  assert.equal(readCalls, 1);
  assert.equal(model.projection?.createsApproval, false);
  assert.equal(model.projection?.createsDdomSnapshot, false);
  assert.equal(model.projection?.mutatesSourceTruth, false);
});

test("hosting detail UI labels shadow surfacing and adds no PASR action controls", async () => {
  const source = await readFile(HOSTING_DETAIL_PAGE, "utf8");
  const panelStart = source.indexOf("function publishShadowPanel");
  const panelEnd = source.indexOf("export default async function", panelStart);
  const panelSource = source.slice(panelStart, panelEnd);

  assert.equal(panelSource.includes("Publish Shadow Readiness"), true);
  assert.equal(panelSource.includes("Shadow-only"), true);
  assert.equal(panelSource.includes("Non-blocking"), true);
  assert.equal(panelSource.includes("Derived Command Center view"), true);
  assert.equal(panelSource.includes("<button"), false);
  assert.equal(panelSource.includes("HostingDomainRecheckButton"), false);
});
