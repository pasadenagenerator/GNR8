import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createSingleSitePublishOperatorDryRunRouteHandlers } from "@/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers";
import type {
  SingleSitePublishOperatorActionAuditActor,
  SingleSitePublishOperatorActionAuditInput,
  SingleSitePublishOperatorActionAuditRow,
} from "@/gnr8/single-site/single-site-publish-operator-action-audit";
import {
  SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_CALLER_VERSION,
  validateSingleSitePublishOperatorDryRunRequest,
  type SingleSitePublishOperatorDryRunRequest,
} from "@/gnr8/single-site/single-site-publish-operator-dry-run-caller";
import {
  SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
  type SingleSitePublishWrapperInput,
  type SingleSitePublishWrapperResult,
} from "@/gnr8/single-site/single-site-publish-wrapper-orchestrator";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(TEST_DIR, "../../../../..");
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const CALLER_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/single-site-publish-operator-dry-run-caller.ts");
const ROUTE_HANDLER_SOURCE = path.join(
  APP_ROOT,
  "api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts",
);
const GENERIC_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts");
const CLIENT_CONTENT_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts");
const OPS_INBOX_PAGE_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/page.tsx");
const OPS_INBOX_SHELL_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx");

const BASE_REQUEST: SingleSitePublishOperatorDryRunRequest = {
  mode: "dry_run",
  tenantId: "tenant-mvp54",
  clientId: "client-mvp54",
  siteId: "site-mvp54",
  migrationId: "migration-mvp54",
  candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-mvp54",
  runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-mvp54",
  expectedPublishTargetRef: "gnr8:gnr8_publish_targets:production",
  publishStage: "production",
  publishEnvironment: "production",
  expectedLaunchReadinessEvidenceRef: "aaf:evidence_package:evidence-mvp54",
  expectedPublishActivationRequestRef: "request-mvp54",
  expectedPublishActivationDecisionRef: "decision-mvp54",
  expectedGateAttemptResultRef: "gate-mvp54",
  expectedHandoffWatermark: "single-site-publish-activation-handoff:mvp54",
  expectedGateInputWatermark: `single-site-publish-activation-gate-input:${"c".repeat(64)}`,
  operatorConfirmation: {
    mode: "dry_run",
    dryRunOnly: true,
    publishes: false,
    runtimeMutation: false,
    migrationId: "migration-mvp54",
    candidateSiteVersionRef: "site-version-mvp54",
  },
  idempotencyKey: "idem-mvp54",
  correlationId: "corr-mvp54",
  allowWarningsWithLimitations: true,
};

function canonicalRef(sourceTable: string, sourceRecordId: string, sourceWatermark: string, metadataJson: Record<string, unknown> = {}) {
  return {
    role: sourceTable === "gnr8_runtime_site_versions" ? "candidate_site_version" : sourceTable === "gnr8_runtime_artifacts" ? "runtime_artifact" : "publish_target",
    sourceSystem: "gnr8",
    sourceTable,
    sourceRecordId,
    sourceRef: `gnr8:${sourceTable}:${sourceRecordId}`,
    sourceVersion: "persisted:v1",
    sourceWatermark,
    metadataJson,
  };
}

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/single-site-publish/dry-run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

type FakeAuditServiceOptions = {
  failCreate?: boolean;
  failStarted?: boolean;
  failComplete?: boolean;
  failPreflight?: boolean;
};

function fakeAuditService(options: FakeAuditServiceOptions = {}) {
  const actions: SingleSitePublishOperatorActionAuditRow[] = [];
  const events: string[] = [];
  return {
    actions,
    events,
    async createOrReuseAction(input: SingleSitePublishOperatorActionAuditInput) {
      if (options.failCreate) throw new Error("audit create failed");
      const existing = actions.find((action) => action.idempotency_key === input.idempotencyKey);
      if (existing) return { action: existing, reusedExisting: true, eventActions: ["action_requested" as const], refRoles: [] };
      const action = {
        id: `audit-${actions.length + 1}`,
        tenant_id: input.tenantId,
        client_id: input.clientId,
        site_id: input.siteId,
        migration_id: input.migrationId,
        mode: input.mode,
        route_action_source: input.routeActionSource,
        actor_id: input.actor.actorId,
        actor_type: input.actor.actorType,
        actor_role: input.actor.actorRole,
        confirmation_marker: input.confirmationMarker,
        candidate_site_version_ref: input.candidateSiteVersionRef,
        runtime_artifact_ref: input.runtimeArtifactRef,
        publish_target_ref: input.publishTargetRef,
        publish_stage: input.publishStage,
        publish_environment: input.publishEnvironment,
        launch_readiness_evidence_ref: input.launchReadinessEvidenceRef,
        publish_activation_request_ref: input.publishActivationRequestRef,
        publish_activation_decision_ref: input.publishActivationDecisionRef,
        gate_attempt_result_ref: input.gateAttemptResultRef,
        handoff_watermark: input.handoffWatermark,
        gate_input_watermark: input.gateInputWatermark,
        idempotency_key: input.idempotencyKey,
        correlation_id: input.correlationId,
        semantic_fingerprint: "fingerprint",
        status: "requested",
        result_summary_json: {},
        redacted_diagnostics_json: {},
        limitation_summary_json: {},
        error_summary_json: {},
        started_at: "2026-08-06T00:00:00.000Z",
        completed_at: null,
        created_at: "2026-08-06T00:00:00.000Z",
        updated_at: "2026-08-06T00:00:00.000Z",
        privacy_label: "internal_operational",
        retention_class: "compliance_long",
      } satisfies SingleSitePublishOperatorActionAuditRow;
      actions.push(action);
      events.push("action_requested");
      return { action, reusedExisting: false, eventActions: ["action_requested" as const], refRoles: [] };
    },
    async markDryRunStarted(input: { actor: SingleSitePublishOperatorActionAuditActor }) {
      if (options.failStarted) throw new Error("audit started failed");
      assert.equal(input.actor.actorRole, "platform_superadmin");
      events.push("dry_run_started");
    },
    async markPreflightFailed() {
      if (options.failPreflight) throw new Error("audit preflight failed");
      actions.at(-1)!.status = "preflight_failed";
      events.push("preflight_failed");
      return actions.at(-1)!;
    },
    async markDryRunCompleted() {
      if (options.failComplete) throw new Error("audit complete failed");
      actions.at(-1)!.status = "dry_run_completed";
      events.push("dry_run_completed");
      return actions.at(-1)!;
    },
  };
}

function wrapperResult(overrides: Partial<SingleSitePublishWrapperResult> = {}): SingleSitePublishWrapperResult {
  return {
    wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
    status: "dry_run_ready",
    strictContextSummary: {
      tenantId: BASE_REQUEST.tenantId,
      clientId: BASE_REQUEST.clientId,
      siteId: BASE_REQUEST.siteId,
      migrationId: BASE_REQUEST.migrationId,
      siteVersionId: "site-version-mvp54",
      runtimeArtifactId: "artifact-mvp54",
      publishTargetId: "production",
      publishStage: "production",
      publishEnvironment: "production",
      publishActivationRequestId: "request-mvp54",
      publishActivationDecisionId: "decision-mvp54",
      gateAttemptId: "gate-mvp54",
      launchReadinessEvidenceId: "evidence-mvp54",
      metadataWatermark: "metadata-watermark-mvp54",
      handoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
      gateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
      contextWatermark: "context-watermark-mvp54",
    },
    metadataHandoffCompleteness: {
      status: "complete",
      complete: true,
      missingCodes: [],
      mismatchCodes: [],
      warningCodes: ["limitations_carried_forward"],
      safeIds: {
        tenantId: BASE_REQUEST.tenantId,
        clientId: BASE_REQUEST.clientId,
        siteId: BASE_REQUEST.siteId,
        migrationId: BASE_REQUEST.migrationId,
        siteVersionId: "site-version-mvp54",
        runtimeArtifactId: "artifact-mvp54",
        publishTargetId: "production",
        publishStage: "production",
        publishEnvironment: "production",
        publishActivationRequestId: "request-mvp54",
        publishActivationDecisionId: "decision-mvp54",
        gateAttemptId: "gate-mvp54",
        launchReadinessEvidenceId: "evidence-mvp54",
        metadataWatermark: "metadata-watermark-mvp54",
        handoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
        gateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
        contextWatermark: "context-watermark-mvp54",
      },
    },
    resolverDiagnostics: {
      status: "complete",
      complete: true,
      blockerCodes: [],
      missingCodes: [],
      mismatchCodes: [],
      staleCodes: [],
      warningCodes: ["limitations_carried_forward"],
      transactionCapturedAt: "2026-08-06T00:00:00.000Z",
      safeIds: {
        siteId: BASE_REQUEST.siteId,
        siteVersionId: "site-version-mvp54",
        runtimeArtifactId: "artifact-mvp54",
        publishTargetId: "production",
        publishActivationRequestId: "request-mvp54",
        publishActivationDecisionId: "decision-mvp54",
        gateAttemptId: "gate-mvp54",
      },
    },
    resolverResult: {
      resolverVersion: "mvp-49-publish-activation-metadata-resolver:v1",
      publishActivationMetadataHandoff: null,
      diagnostics: {
        status: "complete",
        complete: true,
        blockerCodes: [],
        missingCodes: [],
        mismatchCodes: [],
        staleCodes: [],
        warningCodes: ["limitations_carried_forward"],
        transactionCapturedAt: "2026-08-06T00:00:00.000Z",
        safeIds: {
          siteId: BASE_REQUEST.siteId,
          siteVersionId: "site-version-mvp54",
          runtimeArtifactId: "artifact-mvp54",
          publishTargetId: "production",
          publishActivationRequestId: "request-mvp54",
          publishActivationDecisionId: "decision-mvp54",
          gateAttemptId: "gate-mvp54",
        },
      },
      metadataWatermark: "metadata-watermark-mvp54",
      flags: {
        readOnly: true,
        createsAafRecords: false,
        createsGateAttempt: false,
        evaluatesGate: false,
        pasrInvoked: false,
        createsDdomSnapshots: false,
        providerCalls: false,
        publishes: false,
        runtimeMutation: false,
        enforcementApplied: false,
      },
    },
    publishOrchestratorResult: { secret: "must-not-leak" } as never,
    publishOrchestratorInput: { rawEvidence: "must-not-leak" } as never,
    limitations: { readiness: [{ code: "dns_waiting", secret: "must-not-leak" }], decision: [], combined: [] },
    warnings: ["limitations_carried_forward"],
    blockerCodes: [],
    dryRun: true,
    publishes: false,
    runtimeMutation: false,
    flags: {
      wrapperOnly: true,
      shadowOnly: true,
      blockingEnforcementApplied: false,
      publishesOnlyThroughExistingOrchestrator: true,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
      pasrInvokedByWrapper: false,
      createsDdomSnapshots: false,
      providerCalls: false,
    },
    ...overrides,
  };
}

test("authorized superadmin can run single-site publish operator dry-run", async () => {
  const wrapperInputs: SingleSitePublishWrapperInput[] = [];
  const auditService = fakeAuditService();
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService,
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperInputs.push(input);
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.callerVersion, SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_CALLER_VERSION);
  assert.equal(body.mode, "dry_run");
  assert.equal(body.dryRun, true);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(body.blockingEnforcementApplied, false);
  assert.equal(body.createsAafRecords, false);
  assert.equal(body.createsGateAttempt, false);
  assert.equal(body.evaluatesGate, false);
  assert.equal(wrapperInputs.length, 1);
  assert.equal(wrapperInputs[0]!.enabled, true);
  assert.equal(wrapperInputs[0]!.mode, "shadow_publish");
  assert.equal(wrapperInputs[0]!.dryRun, true);
  assert.equal(wrapperInputs[0]!.actor.actorRole, "platform_superadmin");
  assert.equal(wrapperInputs[0]!.actor.actorId, "superadmin-mvp54");
  assert.deepEqual(auditService.events, ["action_requested", "dry_run_started", "dry_run_completed"]);
});

test("canonical persisted metadata reaches the wrapper without synthetic string fallback", async () => {
  const wrapperInputs: SingleSitePublishWrapperInput[] = [];
  const auditService = fakeAuditService();
  const canonicalRequest = {
    ...BASE_REQUEST,
    candidateSiteVersionRef: canonicalRef("gnr8_runtime_site_versions", "site-version-mvp54", "updated_at:2026-08-21 06:18:00.763932+00", {
      tenantId: BASE_REQUEST.tenantId,
      clientId: BASE_REQUEST.clientId,
      siteId: BASE_REQUEST.siteId,
      migrationId: BASE_REQUEST.migrationId,
    }),
    runtimeArtifactRef: canonicalRef("gnr8_runtime_artifacts", "artifact-mvp54", "bundle_sha256:artifact-mvp54", {
      tenantId: BASE_REQUEST.tenantId,
      clientId: BASE_REQUEST.clientId,
      siteId: BASE_REQUEST.siteId,
      migrationId: BASE_REQUEST.migrationId,
    }),
    expectedPublishTargetRef: canonicalRef("gnr8_publish_targets", "production", "ptt-1:gnr8_publish_targets:production", {
      environment: "production",
      publishStage: "production",
      status: "active",
    }),
    expectedLaunchReadinessEvidenceRef: canonicalRef("gnr8_aaf_evidence_packages", "evidence-mvp54", `single-site-launch-readiness:${"d".repeat(64)}`),
    expectedGateAttemptResultRef: {
      gateAttemptId: "gate-mvp54",
      gateAttemptRef: "aaf:action_gate_attempt:gate-mvp54",
      tenantId: BASE_REQUEST.tenantId,
      clientId: BASE_REQUEST.clientId,
      siteId: BASE_REQUEST.siteId,
      migrationId: BASE_REQUEST.migrationId,
      candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-mvp54",
      runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-mvp54",
      publishTargetRef: "gnr8:gnr8_publish_targets:production",
      publishStage: "production",
      publishEnvironment: "production",
      semanticHandoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
      semanticGateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
    },
  };
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService,
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperInputs.push(input);
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request(canonicalRequest));
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(wrapperInputs.length, 1);
  assert.equal(typeof wrapperInputs[0]!.candidateSiteVersionRef, "object");
  assert.equal(typeof wrapperInputs[0]!.runtimeArtifactRef, "object");
  assert.equal(typeof wrapperInputs[0]!.expectedPublishTargetRef, "object");
  assert.equal((wrapperInputs[0]!.candidateSiteVersionRef as { sourceWatermark: string }).sourceWatermark, "updated_at:2026-08-21 06:18:00.763932+00");
  assert.equal((wrapperInputs[0]!.runtimeArtifactRef as { sourceWatermark: string }).sourceWatermark, "bundle_sha256:artifact-mvp54");
  assert.equal(wrapperInputs[0]!.expectedGateAttemptResultRef, "gate-mvp54");
  assert.equal(auditService.actions[0]!.gate_attempt_result_ref, "aaf:action_gate_attempt:gate-mvp54");
});

test("dry-run contract rejects display gate refs in the raw gate id slot", () => {
  const validation = validateSingleSitePublishOperatorDryRunRequest({
    ...BASE_REQUEST,
    expectedGateAttemptResultRef: "aaf:action_gate_attempt:gate-mvp54",
  });

  assert.equal(validation.valid, false);
  if (validation.valid) return;
  assert.equal(validation.errors.includes("single_site_publish_operator_expectedGateAttemptResultRef_raw_id_required"), true);
});

test("production publish target requires production stage and environment", () => {
  const validation = validateSingleSitePublishOperatorDryRunRequest({
    ...BASE_REQUEST,
    publishStage: "shadow",
    publishEnvironment: "preview",
    expectedPublishTargetRef: canonicalRef("gnr8_publish_targets", "production", "ptt-1:gnr8_publish_targets:production", {
      environment: "production",
      publishStage: "production",
      status: "active",
    }),
  });

  assert.equal(validation.valid, false);
  if (validation.valid) return;
  assert.equal(validation.errors.includes("single_site_publish_operator_publish_environment_mismatch"), true);
  assert.equal(validation.errors.includes("single_site_publish_operator_publish_stage_mismatch"), true);
});

test("mismatched canonical candidate, artifact, target, gate, and watermarks are rejected before wrapper invocation", async () => {
  let wrapperCalls = 0;
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService: fakeAuditService(),
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request({
    ...BASE_REQUEST,
    candidateSiteVersionRef: canonicalRef("gnr8_runtime_site_versions", "site-version-mvp54", "updated_at:canonical", { siteId: "wrong-site" }),
    runtimeArtifactRef: canonicalRef("gnr8_runtime_artifacts", "artifact-mvp54", "bundle_sha256:canonical", { migrationId: "wrong-migration" }),
    expectedPublishTargetRef: canonicalRef("gnr8_publish_targets", "production", "ptt-1:gnr8_publish_targets:production", { environment: "production", publishStage: "production", status: "disabled" }),
    expectedGateAttemptResultRef: {
      gateAttemptId: "gate-mvp54",
      gateAttemptRef: "aaf:action_gate_attempt:other-gate",
      tenantId: "wrong-tenant",
      candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:other-version",
      runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:other-artifact",
      publishTargetRef: "gnr8:gnr8_publish_targets:shadow",
      semanticHandoffWatermark: "single-site-publish-activation-gate-handoff:wrong",
      semanticGateInputWatermark: `single-site-publish-activation-gate-input:${"f".repeat(64)}`,
    },
  }));
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_candidateSiteVersionRef_siteId_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_runtimeArtifactRef_migrationId_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_publish_target_status_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_gate_attempt_ref_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_gate_attempt_handoff_watermark_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_gate_attempt_gate_input_watermark_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_gate_attempt_candidate_site_version_ref_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_gate_attempt_runtime_artifact_ref_mismatch"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_gate_attempt_publish_target_ref_mismatch"), true);
  assert.equal(wrapperCalls, 0);
});

test("unauthorized actors fail closed before wrapper invocation", async () => {
  for (const error of [
    new Error("Unauthorized"),
    new Error("Forbidden: superadmin only"),
    new Error("Forbidden: agency owner denied"),
    new Error("Forbidden: client reviewer denied"),
    new Error("Forbidden: ops inbox actor denied"),
  ]) {
    let wrapperCalls = 0;
    const auditService = fakeAuditService();
    const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
      auditService,
      requireSuperadminUserId: async () => {
        throw error;
      },
      wrapperDependencies: {
        publishSingleSiteApprovedCandidateShadow: async () => {
          wrapperCalls += 1;
          return wrapperResult();
        },
      },
    });

    const response = await handlers.POST(request(BASE_REQUEST));
    const body = (await response.json()) as { ok: boolean; publishes: boolean; runtimeMutation: boolean };

    assert.equal(body.ok, false);
    assert.equal(body.publishes, false);
    assert.equal(body.runtimeMutation, false);
    assert.equal(wrapperCalls, 0);
    assert.equal(response.status === 401 || response.status === 403, true);
    assert.deepEqual(auditService.events, []);
  }
});

test("missing required fields fail before wrapper invocation", async () => {
  let wrapperCalls = 0;
  const auditService = fakeAuditService();
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService,
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(
    request({
      ...BASE_REQUEST,
      expectedGateInputWatermark: "",
      operatorConfirmation: {
        ...BASE_REQUEST.operatorConfirmation,
        candidateSiteVersionRef: "other-site-version",
      },
    }),
  );
  const body = (await response.json()) as { diagnostics: string[]; publishes: boolean; runtimeMutation: boolean };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_expectedGateInputWatermark_missing"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_confirmation_invalid"), true);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(wrapperCalls, 0);
  assert.deepEqual(auditService.events, ["action_requested", "preflight_failed"]);
});

test("execute and shadow-publish request fields are rejected before wrapper invocation", async () => {
  const validation = validateSingleSitePublishOperatorDryRunRequest({
    ...BASE_REQUEST,
    mode: "shadow_publish",
    dryRun: false,
    enabled: true,
    publishOrchestratorInput: { siteVersionId: "site-version-mvp54" },
  });

  assert.equal(validation.valid, false);
  if (validation.valid) return;
  assert.equal(validation.errors.includes("single_site_publish_operator_mode_dry_run_required"), true);
  assert.equal(validation.errors.includes("single_site_publish_operator_execution_field_forbidden:dryRun"), true);
  assert.equal(validation.errors.includes("single_site_publish_operator_execution_field_forbidden:enabled"), true);
  assert.equal(validation.errors.includes("single_site_publish_operator_execution_field_forbidden:publishOrchestratorInput"), true);
});

test("wrapper execute mode is never called and publish orchestrator is not directly callable", async () => {
  let wrapperCalls = 0;
  let directPublishOrchestratorCalls = 0;
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService: fakeAuditService(),
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperCalls += 1;
        if (input.dryRun !== true || input.mode !== "shadow_publish") {
          directPublishOrchestratorCalls += 1;
          throw new Error("execute mode reached");
        }
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; dryRun: boolean; publishes: boolean; runtimeMutation: boolean };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.dryRun, true);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(wrapperCalls, 1);
  assert.equal(directPublishOrchestratorCalls, 0);
});

test("wrapper blocked result remains safely dry-run and non-mutating", async () => {
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService: fakeAuditService(),
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () =>
        wrapperResult({
          status: "preflight_blocked",
          metadataHandoffCompleteness: {
            status: "incomplete",
            complete: false,
            missingCodes: ["publish_activation_decision_missing"],
            mismatchCodes: [],
            warningCodes: [],
            safeIds: wrapperResult().strictContextSummary,
          },
          blockerCodes: ["publish_activation_decision_missing"],
          dryRun: true,
          publishes: false,
          runtimeMutation: false,
        }),
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as {
    ok: boolean;
    preflightStatus: string;
    wrapperDryRunStatus: string;
    blockerCodes: string[];
    publishes: boolean;
    runtimeMutation: boolean;
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.preflightStatus, "wrapper_blocked");
  assert.equal(body.wrapperDryRunStatus, "preflight_blocked");
  assert.deepEqual(body.blockerCodes, ["publish_activation_decision_missing"]);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
});

test("safe operator response redacts raw wrapper internals", async () => {
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService: fakeAuditService(),
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => wrapperResult(),
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as Record<string, unknown>;
  const json = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal("resolverResult" in body, false);
  assert.equal("publishOrchestratorInput" in body, false);
  assert.equal("publishOrchestratorResult" in body, false);
  assert.equal(json.includes("must-not-leak"), false);
  assert.deepEqual(body.limitationCodes, ["dns_waiting"]);
  assert.equal(Array.isArray(body.redactions), true);
});

test("dry-run audit create failure fails safely before wrapper invocation", async () => {
  let wrapperCalls = 0;
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService: fakeAuditService({ failCreate: true }),
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; error: string; publishes: boolean; runtimeMutation: boolean };

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.error, "SINGLE_SITE_PUBLISH_OPERATOR_AUDIT_FAILED");
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(wrapperCalls, 0);
});

test("dry-run completion audit failure fails route safely after non-mutating wrapper result", async () => {
  let wrapperCalls = 0;
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService: fakeAuditService({ failComplete: true }),
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; error: string; publishes: boolean; runtimeMutation: boolean };

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.error, "SINGLE_SITE_PUBLISH_OPERATOR_AUDIT_FAILED");
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(wrapperCalls, 1);
});

test("source guardrails keep MVP-54 away from publish execution and excluded surfaces", () => {
  const callerSource = readFileSync(CALLER_SOURCE, "utf8");
  const routeSource = readFileSync(ROUTE_HANDLER_SOURCE, "utf8");
  const newSources = `${callerSource}\n${routeSource}`;
  const genericPublishRoute = readFileSync(GENERIC_PUBLISH_ROUTE_SOURCE, "utf8");
  const clientContentPublishRoute = readFileSync(CLIENT_CONTENT_PUBLISH_ROUTE_SOURCE, "utf8");
  const opsInboxSources = `${readFileSync(OPS_INBOX_PAGE_SOURCE, "utf8")}\n${readFileSync(OPS_INBOX_SHELL_SOURCE, "utf8")}`;

  assert.doesNotMatch(newSources, /from\s+["'][^"']*publish-activation-orchestrator|switchActivePointer\s*\(|archivePublishedVersionsExcept\s*\(/);
  assert.doesNotMatch(newSources, /createActionGateAttempt|createApprovalRequest|createApprovalDecision|AafWriterRepository|publish-activation-gate-evaluator/);
  assert.doesNotMatch(newSources, /readPasr|pasrSource|pasrObserver|aaf-publish-activation-shadow-observer/);
  assert.doesNotMatch(newSources, /ddom-readiness|createDdomReadinessSnapshot|manualSnapshot|liveDns/i);
  assert.doesNotMatch(newSources, /vercel|openprovider|registrar|dns-provider|stripe\.|new Stripe|ai_execution/i);
  assert.doesNotMatch(newSources, /billingMutation:\s*true|domainMutation:\s*true|entitlementService|subscriptionService|new Stripe|stripe\./i);
  assert.doesNotMatch(newSources, /app\/api\/gnr8\/runtime\/versions|app\/api\/gnr8\/clients|ops-inbox/);

  assert.doesNotMatch(genericPublishRoute, /single-site-publish-operator-dry-run|single-site-publish\/dry-run|publishSingleSiteApprovedCandidateShadow/);
  assert.doesNotMatch(clientContentPublishRoute, /single-site-publish-operator-dry-run|single-site-publish\/dry-run|publishSingleSiteApprovedCandidateShadow/);
  assert.doesNotMatch(opsInboxSources, /single-site-publish-operator-dry-run|single-site-publish\/dry-run|publishSingleSiteApprovedCandidateShadow/);
});
