import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest,
  buildSingleSitePublishOperatorActionAuditInputFromShadowPublishRequest,
  redactAuditDiagnostics,
  SingleSitePublishOperatorActionAuditService,
  type SingleSitePublishOperatorActionAuditActor,
  type SingleSitePublishOperatorActionAuditEventInput,
  type SingleSitePublishOperatorActionAuditInput,
  type SingleSitePublishOperatorActionAuditPgClient,
  type SingleSitePublishOperatorActionAuditRefInput,
  type SingleSitePublishOperatorActionAuditRepositoryLike,
  type SingleSitePublishOperatorActionAuditRow,
} from "./single-site-publish-operator-action-audit";
import type { SingleSitePublishOperatorDryRunRequest, SingleSitePublishOperatorDryRunSafeResult } from "./single-site-publish-operator-dry-run-caller";
import type { SingleSiteShadowPublishOperatorRequest, SingleSiteShadowPublishOperatorSafeResult } from "./single-site-shadow-publish-operator-caller";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const actor: SingleSitePublishOperatorActionAuditActor = {
  actorType: "human",
  actorId: "superadmin-mvp57",
  actorRole: "platform_superadmin",
};

const DRY_RUN_REQUEST: SingleSitePublishOperatorDryRunRequest = {
  mode: "dry_run",
  tenantId: "tenant-mvp57",
  clientId: "client-mvp57",
  siteId: "site-mvp57",
  migrationId: "migration-mvp57",
  candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-mvp57",
  runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-mvp57",
  expectedPublishTargetRef: "gnr8:gnr8_publish_targets:production",
  publishStage: "production",
  publishEnvironment: "production",
  expectedLaunchReadinessEvidenceRef: "aaf:evidence_package:evidence-mvp57",
  expectedPublishActivationRequestRef: "request-mvp57",
  expectedPublishActivationDecisionRef: "decision-mvp57",
  expectedGateAttemptResultRef: "gate-mvp57",
  expectedHandoffWatermark: "single-site-publish-activation-handoff:mvp57",
  expectedGateInputWatermark: `single-site-publish-activation-gate-input:${"e".repeat(64)}`,
  operatorConfirmation: {
    mode: "dry_run",
    dryRunOnly: true,
    publishes: false,
    runtimeMutation: false,
    migrationId: "migration-mvp57",
    candidateSiteVersionRef: "site-version-mvp57",
  },
  idempotencyKey: "idem-mvp57",
  correlationId: "corr-mvp57",
};

const SHADOW_REQUEST: SingleSiteShadowPublishOperatorRequest = {
  mode: "shadow_publish",
  tenantId: DRY_RUN_REQUEST.tenantId,
  clientId: DRY_RUN_REQUEST.clientId,
  siteId: DRY_RUN_REQUEST.siteId,
  migrationId: DRY_RUN_REQUEST.migrationId,
  candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-mvp57",
  runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-mvp57",
  expectedPublishTargetRef: "gnr8:gnr8_publish_targets:production",
  publishStage: DRY_RUN_REQUEST.publishStage,
  publishEnvironment: DRY_RUN_REQUEST.publishEnvironment,
  expectedLaunchReadinessEvidenceRef: "aaf:evidence_package:evidence-mvp57",
  expectedPublishActivationRequestRef: DRY_RUN_REQUEST.expectedPublishActivationRequestRef,
  expectedPublishActivationDecisionRef: DRY_RUN_REQUEST.expectedPublishActivationDecisionRef,
  expectedGateAttemptResultRef: DRY_RUN_REQUEST.expectedGateAttemptResultRef,
  expectedHandoffWatermark: DRY_RUN_REQUEST.expectedHandoffWatermark,
  expectedGateInputWatermark: DRY_RUN_REQUEST.expectedGateInputWatermark,
  operatorConfirmation: {
    mode: "shadow_publish",
    shadowPublish: true,
    dryRunOnly: false,
    publishMayExecute: true,
    runtimeMutationMayOccur: true,
    blockingEnforcementApplied: false,
    noAutomaticRollback: true,
    migrationId: "migration-mvp57",
    candidateSiteVersionRef: "site-version-mvp57",
    runtimeArtifactRef: "artifact-mvp57",
    expectedPublishTargetRef: "production",
  },
  idempotencyKey: DRY_RUN_REQUEST.idempotencyKey,
  correlationId: DRY_RUN_REQUEST.correlationId,
};

class FakeAuditRepository implements SingleSitePublishOperatorActionAuditRepositoryLike {
  readonly actions: SingleSitePublishOperatorActionAuditRow[] = [];
  readonly refs: SingleSitePublishOperatorActionAuditRefInput[] = [];
  readonly events: SingleSitePublishOperatorActionAuditEventInput[] = [];
  readonly writes: string[] = [];
  private nextId = 1;

  async withTransaction<T>(fn: (tx: SingleSitePublishOperatorActionAuditPgClient) => Promise<T>): Promise<T> {
    return fn({ async query() { return { rows: [], rowCount: 0 }; } });
  }

  async getActionByIdempotencyKey(_tx: SingleSitePublishOperatorActionAuditPgClient, idempotencyKey: string): Promise<SingleSitePublishOperatorActionAuditRow | null> {
    return this.actions.find((action) => action.idempotency_key === idempotencyKey) ?? null;
  }

  async getActionById(_tx: SingleSitePublishOperatorActionAuditPgClient, actionId: string): Promise<SingleSitePublishOperatorActionAuditRow | null> {
    return this.actions.find((action) => action.id === actionId) ?? null;
  }

  async insertAction(_tx: SingleSitePublishOperatorActionAuditPgClient, row: Record<string, unknown>): Promise<SingleSitePublishOperatorActionAuditRow> {
    this.writes.push("gnr8_single_site_publish_operator_actions");
    const action = {
      id: `action-${this.nextId++}`,
      started_at: "2026-08-06T00:00:00.000Z",
      completed_at: null,
      created_at: "2026-08-06T00:00:00.000Z",
      updated_at: "2026-08-06T00:00:00.000Z",
      ...row,
    } as SingleSitePublishOperatorActionAuditRow;
    this.actions.push(action);
    return action;
  }

  async updateActionStatus(_tx: SingleSitePublishOperatorActionAuditPgClient, input: Record<string, unknown>): Promise<SingleSitePublishOperatorActionAuditRow> {
    this.writes.push("gnr8_single_site_publish_operator_actions");
    const action = this.actions.find((item) => item.id === input.actionId);
    assert.ok(action);
    action.status = input.status as SingleSitePublishOperatorActionAuditRow["status"];
    action.result_summary_json = input.resultSummaryJson ?? action.result_summary_json;
    action.redacted_diagnostics_json = input.redactedDiagnosticsJson ?? action.redacted_diagnostics_json;
    action.limitation_summary_json = input.limitationSummaryJson ?? action.limitation_summary_json;
    action.error_summary_json = input.errorSummaryJson ?? action.error_summary_json;
    action.completed_at = input.completed ? "2026-08-06T00:00:01.000Z" : action.completed_at;
    return action;
  }

  async insertRefIfNeeded(_tx: SingleSitePublishOperatorActionAuditPgClient, input: SingleSitePublishOperatorActionAuditRefInput): Promise<{ reusedExisting: boolean }> {
    this.writes.push("gnr8_single_site_publish_operator_action_refs");
    if (this.refs.some((ref) => ref.idempotencyKey === input.idempotencyKey)) return { reusedExisting: true };
    this.refs.push(input);
    return { reusedExisting: false };
  }

  async insertEventIfNeeded(_tx: SingleSitePublishOperatorActionAuditPgClient, input: SingleSitePublishOperatorActionAuditEventInput): Promise<{ reusedExisting: boolean }> {
    this.writes.push("gnr8_single_site_publish_operator_action_events");
    if (this.events.some((event) => event.idempotencyKey === input.idempotencyKey)) return { reusedExisting: true };
    this.events.push(input);
    return { reusedExisting: false };
  }
}

function service(repo = new FakeAuditRepository()) {
  return { repo, service: new SingleSitePublishOperatorActionAuditService(repo) };
}

function dryAuditInput(overrides: Partial<SingleSitePublishOperatorActionAuditInput> = {}): SingleSitePublishOperatorActionAuditInput {
  return {
    ...buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest({ request: DRY_RUN_REQUEST, actor }),
    ...overrides,
  };
}

function shadowAuditInput(): SingleSitePublishOperatorActionAuditInput {
  return buildSingleSitePublishOperatorActionAuditInputFromShadowPublishRequest({ request: SHADOW_REQUEST, actor });
}

function dryRunResult(overrides: Partial<SingleSitePublishOperatorDryRunSafeResult> = {}): SingleSitePublishOperatorDryRunSafeResult {
  return {
    ok: true,
    callerVersion: "mvp-54-single-site-publish-operator-dry-run-caller:v1",
    wrapperVersion: "mvp-52-single-site-publish-wrapper-orchestrator:v1",
    mode: "dry_run",
    preflightStatus: "caller_validated",
    resolverStatus: "complete",
    wrapperDryRunStatus: "dry_run_ready",
    metadataCompleteness: { status: "complete", complete: true, missingCodes: [], mismatchCodes: [], warningCodes: [] },
    blockerCodes: [],
    warnings: [],
    limitationCodes: ["dns_waiting"],
    safeRefs: { tenantId: "tenant-mvp57", clientId: "client-mvp57", siteId: "site-mvp57", migrationId: "migration-mvp57", siteVersionId: "site-version-mvp57", runtimeArtifactId: "artifact-mvp57", publishTargetId: "production", publishStage: "production", publishEnvironment: "production", publishActivationRequestId: "request-mvp57", publishActivationDecisionId: "decision-mvp57", gateAttemptId: "gate-mvp57", launchReadinessEvidenceId: "evidence-mvp57", metadataWatermark: "metadata-watermark-mvp57", handoffWatermark: DRY_RUN_REQUEST.expectedHandoffWatermark, gateInputWatermark: DRY_RUN_REQUEST.expectedGateInputWatermark, contextWatermark: "context-watermark-mvp57" },
    correlationId: "corr-mvp57",
    idempotencyKey: "idem-mvp57",
    dryRun: true,
    publishes: false,
    runtimeMutation: false,
    blockingEnforcementApplied: false,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    redactions: ["rawSqlErrors", "stackTraces", "providerSecrets", "billingData"],
    flags: {} as never,
    ...overrides,
  };
}

function shadowResult(overrides: Partial<SingleSiteShadowPublishOperatorSafeResult> = {}): SingleSiteShadowPublishOperatorSafeResult {
  return {
    ok: true,
    callerVersion: "mvp-56-single-site-shadow-publish-operator-caller:v1",
    wrapperVersion: "mvp-52-single-site-publish-wrapper-orchestrator:v1",
    mode: "shadow_publish",
    routeStatus: "shadow_publish_completed",
    preflightStatus: "caller_validated",
    resolverStatus: "complete",
    wrapperStatus: "published_via_existing_orchestrator",
    publishOrchestratorStatus: "called",
    publishOrchestrator: { status: "called", siteId: "site-mvp57", siteVersionId: "site-version-mvp57", artifactId: "artifact-mvp57", publishStage: "production", pointerSwitch: "atomic_site_pointer_reassignment", activationOutcome: "atomic_site_pointer_reassignment", previousActivePointer: { siteVersionId: "old", artifactId: "old-artifact" }, newActivePointer: { siteVersionId: "site-version-mvp57", artifactId: "artifact-mvp57" } },
    shadowGuardDiagnostics: { available: true, guardMode: "shadow_observed", guardAllowed: false, guardReason: "publish_activation_shadow_guard_blocked", blockerCodes: ["publish_activation_missing_dns_readiness"], enforcementApplied: false },
    metadataCompleteness: { status: "complete", complete: true, missingCodes: [], mismatchCodes: [], warningCodes: [] },
    blockerCodes: [],
    warnings: [],
    limitationCodes: ["dns_waiting"],
    safeRefs: dryRunResult().safeRefs,
    correlationId: "corr-mvp57",
    idempotencyKey: "idem-mvp57",
    shadowPublish: true,
    dryRun: false,
    blockingEnforcementApplied: false,
    publishMayHaveExecuted: true,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    redactions: ["rawPublishOrchestratorResult", "rawSqlErrors", "stackTraces", "providerSecrets", "billingData"],
    flags: {} as never,
    ...overrides,
  };
}

test("audit create/reuse persists requested action, refs, and event idempotently", async () => {
  const { repo, service: subject } = service();
  const first = await subject.createOrReuseAction(dryAuditInput());
  const second = await subject.createOrReuseAction(dryAuditInput());

  assert.equal(first.action.id, second.action.id);
  assert.equal(second.reusedExisting, true);
  assert.equal(repo.actions.length, 1);
  assert.equal(repo.refs.length, 10);
  assert.deepEqual(repo.events.map((event) => event.eventAction), ["action_requested"]);
  assert.equal(repo.refs.some((ref) => ref.refRole === "candidate_site_version"), true);
  assert.equal(repo.refs.some((ref) => ref.refRole === "operator_confirmation"), true);
});

test("audit idempotency detects semantic drift", async () => {
  const { service: subject } = service();
  await subject.createOrReuseAction(dryAuditInput());

  await assert.rejects(
    () => subject.createOrReuseAction(dryAuditInput({ siteId: "site-drift" })),
    SingleSiteIdempotencyConflictError,
  );
});

test("audit refs/events append without duplicate idempotent replay", async () => {
  const { repo, service: subject } = service();
  const audit = await subject.createOrReuseAction(dryAuditInput());

  await subject.markDryRunStarted({ actionId: audit.action.id, actor, correlationId: "corr-mvp57", idempotencyKey: "idem-mvp57" });
  await subject.markDryRunStarted({ actionId: audit.action.id, actor, correlationId: "corr-mvp57", idempotencyKey: "idem-mvp57" });

  assert.deepEqual(repo.events.map((event) => event.eventAction), ["action_requested", "dry_run_started"]);
});

test("redaction removes unsafe diagnostic fields and values", () => {
  const redacted = redactAuditDiagnostics({
    status: "failed",
    reasonCode: "publish_activation_missing_dns_readiness",
    rawSqlError: "select * from secrets",
    stackTrace: "boom",
    providerSecret: "token-123",
    nested: { stripePaymentData: "card", blockerCodes: ["safe_code", "secret_token"] },
  });
  const json = JSON.stringify(redacted);

  assert.equal(redacted.status, "failed");
  assert.equal(redacted.reasonCode, "publish_activation_missing_dns_readiness");
  assert.equal(json.includes("rawSqlError"), false);
  assert.equal(json.includes("stackTrace"), false);
  assert.equal(json.includes("providerSecret"), false);
  assert.equal(json.includes("stripePaymentData"), false);
  assert.equal(json.includes("secret_token"), false);
});

test("mark dry-run completed stores safe summaries and result refs", async () => {
  const { repo, service: subject } = service();
  const audit = await subject.createOrReuseAction(dryAuditInput());

  const updated = await subject.markDryRunCompleted({ actionId: audit.action.id, actor, correlationId: "corr-mvp57", idempotencyKey: "idem-mvp57", result: dryRunResult() });

  assert.equal(updated.status, "dry_run_completed");
  assert.equal(updated.completed_at, "2026-08-06T00:00:01.000Z");
  assert.equal(repo.refs.some((ref) => ref.refRole === "wrapper_result"), true);
  assert.equal(repo.refs.some((ref) => ref.refRole === "limitation"), true);
  assert.deepEqual(repo.events.map((event) => event.eventAction), ["action_requested", "dry_run_completed", "diagnostics_recorded", "redaction_applied"]);
});

test("mark shadow-publish started and completed records lifecycle", async () => {
  const { repo, service: subject } = service();
  const audit = await subject.createOrReuseAction(shadowAuditInput());

  await subject.markShadowPublishStarted({ actionId: audit.action.id, actor, correlationId: "corr-mvp57", idempotencyKey: "idem-mvp57" });
  const updated = await subject.markShadowPublishCompleted({ actionId: audit.action.id, actor, correlationId: "corr-mvp57", idempotencyKey: "idem-mvp57", result: shadowResult() });

  assert.equal(updated.status, "shadow_publish_completed");
  assert.equal(repo.refs.some((ref) => ref.refRole === "publish_result"), true);
  assert.equal(repo.refs.some((ref) => ref.refRole === "guard_diagnostic"), true);
  assert.deepEqual(repo.events.map((event) => event.eventAction), ["action_requested", "shadow_publish_started", "redaction_applied", "shadow_publish_completed", "diagnostics_recorded", "redaction_applied"]);
});

test("mark shadow-publish failed records safe failure diagnostics", async () => {
  const { repo, service: subject } = service();
  const audit = await subject.createOrReuseAction(shadowAuditInput());
  await subject.markShadowPublishStarted({ actionId: audit.action.id, actor, correlationId: "corr-mvp57", idempotencyKey: "idem-mvp57" });

  const updated = await subject.markShadowPublishFailed({
    actionId: audit.action.id,
    actor,
    correlationId: "corr-mvp57",
    idempotencyKey: "idem-mvp57",
    result: shadowResult({ ok: false, routeStatus: "publish_orchestrator_failed", wrapperStatus: "orchestrator_failed", publishOrchestratorStatus: "failed", blockerCodes: ["single_site_publish_wrapper_orchestrator_failed"] }),
  });

  assert.equal(updated.status, "shadow_publish_failed");
  assert.equal(repo.events.some((event) => event.eventAction === "shadow_publish_failed"), true);
  assert.equal(JSON.stringify(updated.redacted_diagnostics_json).includes("single_site_publish_wrapper_orchestrator_failed"), true);
});

test("preflight failure status is persisted with redacted codes", async () => {
  const { repo, service: subject } = service();
  const audit = await subject.createOrReuseAction(dryAuditInput());
  const updated = await subject.markPreflightFailed({
    actionId: audit.action.id,
    actor,
    correlationId: "corr-mvp57",
    idempotencyKey: "idem-mvp57",
    errorCode: "INVALID_SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_REQUEST",
    diagnostics: ["single_site_publish_operator_confirmation_invalid", "secret_token_should_redact"],
  });

  assert.equal(updated.status, "preflight_failed");
  assert.equal(JSON.stringify(updated.error_summary_json).includes("secret_token_should_redact"), false);
  assert.equal(repo.events.at(-1)?.eventAction, "redaction_applied");
});

test("audit service writes only MVP-57 audit table family", async () => {
  const { repo, service: subject } = service();
  const audit = await subject.createOrReuseAction(dryAuditInput());
  await subject.markDryRunCompleted({ actionId: audit.action.id, actor, correlationId: "corr-mvp57", idempotencyKey: "idem-mvp57", result: dryRunResult() });

  assert.deepEqual(
    Array.from(new Set(repo.writes)).sort(),
    [
      "gnr8_single_site_publish_operator_action_events",
      "gnr8_single_site_publish_operator_action_refs",
      "gnr8_single_site_publish_operator_actions",
    ],
  );
});
