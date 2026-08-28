import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createSingleSitePublishOperatorDryRunRouteHandlers } from "@/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers";
import { createSingleSiteShadowPublishRouteHandlers } from "@/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers";
import type {
  SingleSitePublishOperatorActionAuditActor,
  SingleSitePublishOperatorActionAuditInput,
  SingleSitePublishOperatorActionAuditRow,
} from "@/gnr8/single-site/single-site-publish-operator-action-audit";
import type { SingleSitePublishOperatorDryRunRequest } from "@/gnr8/single-site/single-site-publish-operator-dry-run-caller";
import {
  SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_CALLER_VERSION,
  validateSingleSiteShadowPublishOperatorRequest,
  type SingleSiteShadowPublishOperatorRequest,
} from "@/gnr8/single-site/single-site-shadow-publish-operator-caller";
import {
  SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
  type SingleSitePublishWrapperInput,
  type SingleSitePublishWrapperResult,
} from "@/gnr8/single-site/single-site-publish-wrapper-orchestrator";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(TEST_DIR, "../../../../..");
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const CALLER_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/single-site-shadow-publish-operator-caller.ts");
const ROUTE_HANDLER_SOURCE = path.join(
  APP_ROOT,
  "api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts",
);
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/single-site-publish/shadow-publish/route.ts");
const DRY_RUN_CALLER_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/single-site-publish-operator-dry-run-caller.ts");
const DRY_RUN_ROUTE_HANDLER_SOURCE = path.join(
  APP_ROOT,
  "api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts",
);
const GENERIC_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts");
const CLIENT_CONTENT_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts");
const CLIENT_CONTENT_ROLLBACK_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/clients/[clientId]/sites/[siteId]/content/rollback/route.ts");
const OPS_INBOX_PAGE_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/page.tsx");
const OPS_INBOX_SHELL_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx");

const BASE_REQUEST: SingleSiteShadowPublishOperatorRequest = {
  mode: "shadow_publish",
  tenantId: "tenant-mvp56",
  clientId: "client-mvp56",
  siteId: "site-mvp56",
  migrationId: "migration-mvp56",
  candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-mvp56",
  runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-mvp56",
  expectedPublishTargetRef: "gnr8:gnr8_publish_targets:production",
  publishStage: "production",
  publishEnvironment: "production",
  expectedLaunchReadinessEvidenceRef: "aaf:evidence_package:evidence-mvp56",
  expectedPublishActivationRequestRef: "request-mvp56",
  expectedPublishActivationDecisionRef: "decision-mvp56",
  expectedGateAttemptResultRef: "gate-mvp56",
  expectedHandoffWatermark: "single-site-publish-activation-handoff:mvp56",
  expectedGateInputWatermark: `single-site-publish-activation-gate-input:${"d".repeat(64)}`,
  operatorConfirmation: {
    mode: "shadow_publish",
    shadowPublish: true,
    dryRunOnly: false,
    publishMayExecute: true,
    runtimeMutationMayOccur: true,
    blockingEnforcementApplied: false,
    noAutomaticRollback: true,
    migrationId: "migration-mvp56",
    candidateSiteVersionRef: "site-version-mvp56",
    runtimeArtifactRef: "artifact-mvp56",
    expectedPublishTargetRef: "production",
  },
  idempotencyKey: "idem-mvp56",
  correlationId: "corr-mvp56",
  allowWarningsWithLimitations: true,
};

const DRY_RUN_REQUEST: SingleSitePublishOperatorDryRunRequest = {
  mode: "dry_run",
  tenantId: BASE_REQUEST.tenantId,
  clientId: BASE_REQUEST.clientId,
  siteId: BASE_REQUEST.siteId,
  migrationId: BASE_REQUEST.migrationId,
  candidateSiteVersionRef: BASE_REQUEST.candidateSiteVersionRef,
  runtimeArtifactRef: BASE_REQUEST.runtimeArtifactRef,
  expectedPublishTargetRef: BASE_REQUEST.expectedPublishTargetRef,
  publishStage: BASE_REQUEST.publishStage,
  publishEnvironment: BASE_REQUEST.publishEnvironment,
  expectedLaunchReadinessEvidenceRef: BASE_REQUEST.expectedLaunchReadinessEvidenceRef,
  expectedPublishActivationRequestRef: BASE_REQUEST.expectedPublishActivationRequestRef,
  expectedPublishActivationDecisionRef: BASE_REQUEST.expectedPublishActivationDecisionRef,
  expectedGateAttemptResultRef: BASE_REQUEST.expectedGateAttemptResultRef,
  expectedHandoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
  expectedGateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
  operatorConfirmation: {
    mode: "dry_run",
    dryRunOnly: true,
    publishes: false,
    runtimeMutation: false,
    migrationId: BASE_REQUEST.migrationId,
    candidateSiteVersionRef: "site-version-mvp56",
  },
  idempotencyKey: BASE_REQUEST.idempotencyKey,
  correlationId: BASE_REQUEST.correlationId,
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
  return new Request("https://app.test/api/gnr8/admin/single-site-publish/shadow-publish", {
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
    async markPreflightFailed() {
      if (options.failPreflight) throw new Error("audit preflight failed");
      actions.at(-1)!.status = "preflight_failed";
      events.push("preflight_failed");
      return actions.at(-1)!;
    },
    async markShadowPublishStarted(input: { actor: SingleSitePublishOperatorActionAuditActor }) {
      if (options.failStarted) throw new Error("audit started failed");
      assert.equal(input.actor.actorRole, "platform_superadmin");
      actions.at(-1)!.status = "shadow_publish_started";
      events.push("shadow_publish_started");
      return actions.at(-1)!;
    },
    async markShadowPublishCompleted() {
      if (options.failComplete) throw new Error("audit completion failed");
      actions.at(-1)!.status = "shadow_publish_completed";
      events.push("shadow_publish_completed");
      return actions.at(-1)!;
    },
    async markShadowPublishFailed() {
      if (options.failComplete) throw new Error("audit completion failed");
      actions.at(-1)!.status = "shadow_publish_failed";
      events.push("shadow_publish_failed");
      return actions.at(-1)!;
    },
    async markDryRunStarted() {
      if (options.failStarted) throw new Error("audit started failed");
      events.push("dry_run_started");
    },
    async markDryRunCompleted() {
      if (options.failComplete) throw new Error("audit completion failed");
      events.push("dry_run_completed");
      return actions.at(-1)!;
    },
  };
}

function wrapperResult(overrides: Partial<SingleSitePublishWrapperResult> = {}): SingleSitePublishWrapperResult {
  const safeRefs = {
    tenantId: BASE_REQUEST.tenantId,
    clientId: BASE_REQUEST.clientId,
    siteId: BASE_REQUEST.siteId,
    migrationId: BASE_REQUEST.migrationId,
    siteVersionId: "site-version-mvp56",
    runtimeArtifactId: "artifact-mvp56",
    publishTargetId: "production",
    publishStage: "production",
    publishEnvironment: "production",
    publishActivationRequestId: "request-mvp56",
    publishActivationDecisionId: "decision-mvp56",
    gateAttemptId: "gate-mvp56",
    launchReadinessEvidenceId: "evidence-mvp56",
    metadataWatermark: "metadata-watermark-mvp56",
    handoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
    gateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
    contextWatermark: "context-watermark-mvp56",
  };
  return {
    wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
    status: "published_via_existing_orchestrator",
    strictContextSummary: safeRefs,
    metadataHandoffCompleteness: {
      status: "complete",
      complete: true,
      missingCodes: [],
      mismatchCodes: [],
      warningCodes: ["limitations_carried_forward"],
      safeIds: safeRefs,
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
        siteVersionId: "site-version-mvp56",
        runtimeArtifactId: "artifact-mvp56",
        publishTargetId: "production",
        publishActivationRequestId: "request-mvp56",
        publishActivationDecisionId: "decision-mvp56",
        gateAttemptId: "gate-mvp56",
      },
    },
    resolverResult: { rawResolverSecret: "must-not-leak" } as never,
    publishOrchestratorResult: {
      siteId: BASE_REQUEST.siteId,
      siteVersionId: "site-version-mvp56",
      artifactId: "artifact-mvp56",
      publishStage: "production",
      pointerSwitch: "atomic_site_pointer_reassignment",
      previousActivePointer: { siteVersionId: "old-version", artifactId: "old-artifact", raw: "must-not-leak" },
      newActivePointer: { siteVersionId: "site-version-mvp56", artifactId: "artifact-mvp56", raw: "must-not-leak" },
      activationOutcome: "atomic_site_pointer_reassignment",
      publishActivationEnforcementShadowObservation: {
        available: true,
        guardMode: "shadow_observed",
        guardAllowed: false,
        guardReason: "publish_activation_shadow_guard_blocked",
        blockerCodes: ["publish_activation_missing_dns_readiness"],
        rawGuardSecret: "must-not-leak",
      },
      rawProviderPayload: "must-not-leak",
    } as never,
    publishOrchestratorInput: { rawEvidence: "must-not-leak" } as never,
    limitations: { readiness: [{ code: "dns_waiting", secret: "must-not-leak" }], decision: [], combined: [] },
    warnings: ["limitations_carried_forward"],
    blockerCodes: [],
    dryRun: false,
    publishes: true,
    runtimeMutation: true,
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

test("feature flag off denies before auth, wrapper, or resolver", async () => {
  let authCalls = 0;
  let wrapperCalls = 0;
  const auditService = fakeAuditService();
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService,
    isFeatureEnabled: () => false,
    requireSuperadminUserId: async () => {
      authCalls += 1;
      return "superadmin-mvp56";
    },
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
    log: () => {},
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; publishMayHaveExecuted: boolean; diagnostics: string[] };

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.publishMayHaveExecuted, false);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_flag_disabled"), true);
  assert.equal(authCalls, 0);
  assert.equal(wrapperCalls, 0);
  assert.deepEqual(auditService.events, []);
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
    const handlers = createSingleSiteShadowPublishRouteHandlers({
      auditService,
      isFeatureEnabled: () => true,
      requireSuperadminUserId: async () => {
        throw error;
      },
      wrapperDependencies: {
        publishSingleSiteApprovedCandidateShadow: async () => {
          wrapperCalls += 1;
          return wrapperResult();
        },
      },
      log: () => {},
    });

    const response = await handlers.POST(request(BASE_REQUEST));
    const body = (await response.json()) as { ok: boolean; publishMayHaveExecuted: boolean };

    assert.equal(body.ok, false);
    assert.equal(body.publishMayHaveExecuted, false);
    assert.equal(wrapperCalls, 0);
    assert.equal(response.status === 401 || response.status === 403, true);
    assert.deepEqual(auditService.events, []);
  }
});

test("body actor overrides and unknown execution fields are denied before wrapper", async () => {
  let wrapperCalls = 0;
  const auditService = fakeAuditService();
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService,
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
    log: () => {},
  });

  const response = await handlers.POST(
    request({
      ...BASE_REQUEST,
      actor: { actorRole: "platform_superadmin", actorId: "body-override" },
      actorRole: "platform_superadmin",
      dryRun: false,
    }),
  );
  const body = (await response.json()) as { diagnostics: string[]; publishMayHaveExecuted: boolean };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_actor_override_forbidden:actor"), true);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_actor_override_forbidden:actorRole"), true);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_execution_field_forbidden:dryRun"), true);
  assert.equal(body.publishMayHaveExecuted, false);
  assert.equal(wrapperCalls, 0);
  assert.deepEqual(auditService.events, ["action_requested", "preflight_failed"]);
});

test("missing confirmation, wrong mode, and missing refs fail before wrapper", async () => {
  let wrapperCalls = 0;
  const auditService = fakeAuditService();
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService,
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
    log: () => {},
  });

  const response = await handlers.POST(
    request({
      ...BASE_REQUEST,
      mode: "dry_run",
      runtimeArtifactRef: "",
      expectedGateInputWatermark: "",
      operatorConfirmation: undefined,
    }),
  );
  const body = (await response.json()) as { diagnostics: string[]; publishMayHaveExecuted: boolean };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_mode_shadow_publish_required"), true);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_runtimeArtifactRef_missing"), true);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_expectedGateInputWatermark_missing"), true);
  assert.equal(body.diagnostics.includes("single_site_shadow_publish_operator_confirmation_invalid"), true);
  assert.equal(body.publishMayHaveExecuted, false);
  assert.equal(wrapperCalls, 0);
  assert.deepEqual(auditService.events, ["action_requested", "preflight_failed"]);
});

test("validator rejects dry-run mode directly", () => {
  const validation = validateSingleSiteShadowPublishOperatorRequest({
    ...BASE_REQUEST,
    mode: "dry_run",
  });

  assert.equal(validation.valid, false);
  if (!validation.valid) {
    assert.equal(validation.errors.includes("single_site_shadow_publish_operator_mode_shadow_publish_required"), true);
  }
});

test("wrapper preflight blocked returns a safe failure without publish execution", async () => {
  const auditService = fakeAuditService();
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService,
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
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
          publishOrchestratorResult: null,
          dryRun: false,
          publishes: false,
          runtimeMutation: false,
        }),
    },
    log: () => {},
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as {
    ok: boolean;
    routeStatus: string;
    wrapperStatus: string;
    publishOrchestratorStatus: string;
    publishMayHaveExecuted: boolean;
    blockerCodes: string[];
  };

  assert.equal(response.status, 409);
  assert.equal(body.ok, false);
  assert.equal(body.routeStatus, "wrapper_preflight_blocked");
  assert.equal(body.wrapperStatus, "preflight_blocked");
  assert.equal(body.publishOrchestratorStatus, "not_called");
  assert.equal(body.publishMayHaveExecuted, false);
  assert.deepEqual(body.blockerCodes, ["publish_activation_decision_missing"]);
  assert.deepEqual(auditService.events, ["action_requested", "shadow_publish_started", "shadow_publish_failed"]);
});

test("valid request calls wrapper execute mode exactly once", async () => {
  const wrapperInputs: SingleSitePublishWrapperInput[] = [];
  const logEvents: Array<{ event: string; details: Record<string, unknown> }> = [];
  const auditService = fakeAuditService();
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService,
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperInputs.push(input);
        return wrapperResult();
      },
    },
    log: (event, details) => logEvents.push({ event, details }),
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.callerVersion, SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_CALLER_VERSION);
  assert.equal(body.mode, "shadow_publish");
  assert.equal(body.shadowPublish, true);
  assert.equal(body.dryRun, false);
  assert.equal(body.blockingEnforcementApplied, false);
  assert.equal(body.publishMayHaveExecuted, true);
  assert.equal(body.createsAafRecords, false);
  assert.equal(body.createsGateAttempt, false);
  assert.equal(body.evaluatesGate, false);
  assert.equal(wrapperInputs.length, 1);
  assert.equal(wrapperInputs[0]!.enabled, true);
  assert.equal(wrapperInputs[0]!.mode, "shadow_publish");
  assert.equal(wrapperInputs[0]!.dryRun, false);
  assert.equal(wrapperInputs[0]!.actor.actorRole, "platform_superadmin");
  assert.equal(wrapperInputs[0]!.actor.actorId, "superadmin-mvp56");
  assert.equal(logEvents.at(-1)?.details.blockingEnforcementApplied, false);
  assert.deepEqual(auditService.events, ["action_requested", "shadow_publish_started", "shadow_publish_completed"]);
});

test("canonical persisted metadata reaches shadow-publish wrapper without synthetic string fallback", async () => {
  const wrapperInputs: SingleSitePublishWrapperInput[] = [];
  const auditService = fakeAuditService();
  const canonicalRequest = {
    ...BASE_REQUEST,
    candidateSiteVersionRef: canonicalRef("gnr8_runtime_site_versions", "site-version-mvp56", "updated_at:2026-08-28 08:30:00+00", {
      tenantId: BASE_REQUEST.tenantId,
      clientId: BASE_REQUEST.clientId,
      siteId: BASE_REQUEST.siteId,
      migrationId: BASE_REQUEST.migrationId,
    }),
    runtimeArtifactRef: canonicalRef("gnr8_runtime_artifacts", "artifact-mvp56", "bundle_sha256:artifact-mvp56", {
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
    expectedLaunchReadinessEvidenceRef: canonicalRef("gnr8_aaf_evidence_packages", "evidence-mvp56", `single-site-launch-readiness:${"e".repeat(64)}`),
    expectedGateAttemptResultRef: {
      gateAttemptId: "gate-mvp56",
      gateAttemptRef: "aaf:action_gate_attempt:gate-mvp56",
      tenantId: BASE_REQUEST.tenantId,
      clientId: BASE_REQUEST.clientId,
      siteId: BASE_REQUEST.siteId,
      migrationId: BASE_REQUEST.migrationId,
      candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-mvp56",
      runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-mvp56",
      publishTargetRef: "gnr8:gnr8_publish_targets:production",
      publishStage: "production",
      publishEnvironment: "production",
      semanticHandoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
      semanticGateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
    },
  };
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService,
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperInputs.push(input);
        return wrapperResult();
      },
    },
    log: () => {},
  });

  const response = await handlers.POST(request(canonicalRequest));
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(wrapperInputs.length, 1);
  assert.equal(wrapperInputs[0]!.dryRun, false);
  assert.equal(typeof wrapperInputs[0]!.candidateSiteVersionRef, "object");
  assert.equal(typeof wrapperInputs[0]!.runtimeArtifactRef, "object");
  assert.equal(typeof wrapperInputs[0]!.expectedPublishTargetRef, "object");
  assert.equal((wrapperInputs[0]!.candidateSiteVersionRef as { sourceWatermark: string }).sourceWatermark, "updated_at:2026-08-28 08:30:00+00");
  assert.equal((wrapperInputs[0]!.runtimeArtifactRef as { sourceWatermark: string }).sourceWatermark, "bundle_sha256:artifact-mvp56");
  assert.equal(wrapperInputs[0]!.expectedGateAttemptResultRef, "gate-mvp56");
  assert.equal(auditService.actions[0]!.candidate_site_version_ref, "gnr8:gnr8_runtime_site_versions:site-version-mvp56");
  assert.equal(auditService.actions[0]!.gate_attempt_result_ref, "aaf:action_gate_attempt:gate-mvp56");
});

test("publish orchestrator failure is projected safely without rollback or retry", async () => {
  const auditService = fakeAuditService();
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService,
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () =>
        wrapperResult({
          status: "orchestrator_failed",
          publishOrchestratorResult: null,
          blockerCodes: ["single_site_publish_wrapper_orchestrator_failed"],
          warnings: ["database unavailable with secret_token_mvp56"],
          dryRun: false,
          publishes: false,
          runtimeMutation: false,
        }),
    },
    log: () => {},
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as {
    ok: boolean;
    routeStatus: string;
    publishOrchestratorStatus: string;
    publishMayHaveExecuted: boolean;
    warnings: string[];
  };
  const json = JSON.stringify(body);

  assert.equal(response.status, 502);
  assert.equal(body.ok, false);
  assert.equal(body.routeStatus, "publish_orchestrator_failed");
  assert.equal(body.publishOrchestratorStatus, "failed");
  assert.equal(body.publishMayHaveExecuted, true);
  assert.deepEqual(body.warnings, ["single_site_shadow_publish_warning_redacted"]);
  assert.equal(json.includes("secret_token_mvp56"), false);
  assert.deepEqual(auditService.events, ["action_requested", "shadow_publish_started", "shadow_publish_failed"]);
});

test("shadow-publish audit create failure blocks before wrapper execution", async () => {
  let wrapperCalls = 0;
  const logEvents: Array<{ event: string; details: Record<string, unknown> }> = [];
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService: fakeAuditService({ failCreate: true }),
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
    log: (event, details) => logEvents.push({ event, details }),
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; error: string; publishMayHaveExecuted: boolean };

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.error, "SINGLE_SITE_SHADOW_PUBLISH_AUDIT_FAILED");
  assert.equal(body.publishMayHaveExecuted, false);
  assert.equal(wrapperCalls, 0);
  assert.equal(logEvents.some((entry) => entry.details.routeStatus === "audit_failed_before_wrapper"), true);
});

test("shadow-publish started audit failure blocks before wrapper execution", async () => {
  let wrapperCalls = 0;
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService: fakeAuditService({ failStarted: true }),
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
    log: () => {},
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; error: string; publishMayHaveExecuted: boolean };

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.error, "SINGLE_SITE_SHADOW_PUBLISH_AUDIT_FAILED");
  assert.equal(body.publishMayHaveExecuted, false);
  assert.equal(wrapperCalls, 0);
});

test("shadow-publish completion audit failure logs and preserves wrapper result", async () => {
  let wrapperCalls = 0;
  const logEvents: Array<{ event: string; details: Record<string, unknown> }> = [];
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService: fakeAuditService({ failComplete: true }),
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
    log: (event, details) => logEvents.push({ event, details }),
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; routeStatus: string; publishMayHaveExecuted: boolean };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.routeStatus, "shadow_publish_completed");
  assert.equal(body.publishMayHaveExecuted, true);
  assert.equal(wrapperCalls, 1);
  assert.equal(logEvents.some((entry) => entry.event === "shadow_publish_audit_completion_failed" && entry.details.wrapperResultPreserved === true), true);
});

test("safe response redacts raw wrapper and orchestrator internals", async () => {
  const handlers = createSingleSiteShadowPublishRouteHandlers({
    auditService: fakeAuditService(),
    isFeatureEnabled: () => true,
    requireSuperadminUserId: async () => "superadmin-mvp56",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => wrapperResult(),
    },
    log: () => {},
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
  assert.deepEqual(body.shadowGuardDiagnostics, {
    available: true,
    guardMode: "shadow_observed",
    guardAllowed: false,
    guardReason: "publish_activation_shadow_guard_blocked",
    blockerCodes: ["publish_activation_missing_dns_readiness"],
    enforcementApplied: false,
  });
});

test("MVP-54 dry-run route still calls wrapper dry-run only", async () => {
  const wrapperInputs: SingleSitePublishWrapperInput[] = [];
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    auditService: fakeAuditService(),
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperInputs.push(input);
        return wrapperResult({
          status: "dry_run_ready",
          publishOrchestratorResult: null,
          dryRun: true,
          publishes: false,
          runtimeMutation: false,
        });
      },
    },
  });

  const response = await handlers.POST(request(DRY_RUN_REQUEST));
  const body = (await response.json()) as { ok: boolean; dryRun: boolean; publishes: boolean; runtimeMutation: boolean };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.dryRun, true);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(wrapperInputs.length, 1);
  assert.equal(wrapperInputs[0]!.mode, "shadow_publish");
  assert.equal(wrapperInputs[0]!.dryRun, true);
});

test("source guardrails keep MVP-56 inside the internal admin route boundary", () => {
  const callerSource = readFileSync(CALLER_SOURCE, "utf8");
  const routeHandlerSource = readFileSync(ROUTE_HANDLER_SOURCE, "utf8");
  const routeSource = readFileSync(ROUTE_SOURCE, "utf8");
  const dryRunSources = `${readFileSync(DRY_RUN_CALLER_SOURCE, "utf8")}\n${readFileSync(DRY_RUN_ROUTE_HANDLER_SOURCE, "utf8")}`;
  const newSources = `${callerSource}\n${routeHandlerSource}\n${routeSource}`;
  const genericPublishRoute = readFileSync(GENERIC_PUBLISH_ROUTE_SOURCE, "utf8");
  const clientContentRoutes = `${readFileSync(CLIENT_CONTENT_PUBLISH_ROUTE_SOURCE, "utf8")}\n${readFileSync(CLIENT_CONTENT_ROLLBACK_ROUTE_SOURCE, "utf8")}`;
  const opsInboxSources = `${readFileSync(OPS_INBOX_PAGE_SOURCE, "utf8")}\n${readFileSync(OPS_INBOX_SHELL_SOURCE, "utf8")}`;

  assert.match(routeSource, /api\/gnr8\/admin|createSingleSiteShadowPublishRouteHandlers|runtime = "nodejs"/);
  assert.match(routeHandlerSource, /GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION|requireSuperadminUserId/);
  assert.doesNotMatch(newSources, /from\s+["'][^"']*publish-activation-orchestrator|switchActivePointer\s*\(|archivePublishedVersionsExcept\s*\(|createArtifact\s*\(|bindArtifactToVersion\s*\(/);
  assert.doesNotMatch(newSources, /createActionGateAttempt|createApprovalRequest|createApprovalDecision|AafWriterRepository|publish-activation-gate-evaluator/);
  assert.doesNotMatch(newSources, /readPasr|pasrSource|pasrObserver|aaf-publish-activation-shadow-observer/);
  assert.doesNotMatch(newSources, /ddom-readiness|createDdomReadinessSnapshot|manualSnapshot|liveDns/i);
  assert.doesNotMatch(newSources, /from\s+["'][^"']*(vercel|openprovider|registrar|dns-provider|stripe|billing|entitlement|ai)[^"']*["']/i);
  assert.doesNotMatch(newSources, /new Stripe|stripe\.|checkDomainStatus|activateDomain|registerDomain|createDdom|manualSnapshot|evaluatePublishActivationGate/i);
  assert.doesNotMatch(newSources, /app\/api\/gnr8\/runtime\/versions|app\/api\/gnr8\/clients|ops-inbox/);

  assert.match(dryRunSources, /dryRun:\s*true/);
  assert.doesNotMatch(dryRunSources, /dryRun:\s*false/);
  assert.doesNotMatch(genericPublishRoute, /single-site-publish\/shadow-publish|single-site-shadow-publish|runSingleSiteShadowPublishOperatorAction/);
  assert.doesNotMatch(clientContentRoutes, /single-site-publish\/shadow-publish|single-site-shadow-publish|runSingleSiteShadowPublishOperatorAction/);
  assert.doesNotMatch(opsInboxSources, /single-site-publish\/shadow-publish|single-site-shadow-publish|runSingleSiteShadowPublishOperatorAction/);
});
