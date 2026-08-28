import assert from "node:assert/strict";
import test from "node:test";

import {
  executeSingleSiteMvpOperatorAction,
  preflightSingleSiteMvpOperatorAction,
  readSingleSiteMvpOperatorStatus,
  type SingleSiteMvpOperatorActionInput,
} from "./single-site-mvp-operator-action-facade";
import {
  SINGLE_SITE_MVP_ORCHESTRATION_SERVICE_VERSION,
  type SingleSiteMvpNextOperationKey,
  type SingleSiteMvpOrchestrationStatusModel,
} from "./single-site-mvp-orchestration-service";
import { SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_CALLER_VERSION } from "./single-site-publish-operator-dry-run-caller";
import { SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION } from "./single-site-publish-wrapper-orchestrator";
import { SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_CALLER_VERSION } from "./single-site-shadow-publish-operator-caller";

const BASE_INPUT: SingleSiteMvpOperatorActionInput = {
  tenantId: "tenant-cutline-3",
  clientId: "client-cutline-3",
  siteId: "site-cutline-3",
  migrationId: "migration-cutline-3",
  candidateVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-cutline-3",
  runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-cutline-3",
  publishTargetRef: "gnr8:gnr8_publish_targets:production",
  actor: {
    actorType: "human",
    actorId: "superadmin-cutline-3",
    actorRole: "platform_superadmin",
  },
  correlationId: "corr-cutline-3",
  idempotencyKey: "idem-cutline-3",
  publishStage: "production",
  publishEnvironment: "production",
  expectedLaunchReadinessEvidenceRef: "aaf:evidence_package:evidence-cutline-3",
  expectedPublishActivationRequestRef: "request-cutline-3",
  expectedPublishActivationDecisionRef: "decision-cutline-3",
  expectedGateAttemptResultRef: "gate-cutline-3",
  expectedHandoffWatermark: "single-site-publish-activation-handoff:cutline-3",
  expectedGateInputWatermark: `single-site-publish-activation-gate-input:${"e".repeat(64)}`,
  allowWarningsWithLimitations: true,
};

const DRY_RUN_CONFIRMATION = {
  mode: "dry_run",
  dryRunOnly: true,
  publishes: false,
  runtimeMutation: false,
  migrationId: BASE_INPUT.migrationId,
  candidateSiteVersionRef: "site-version-cutline-3",
};

const SHADOW_CONFIRMATION = {
  mode: "shadow_publish",
  shadowPublish: true,
  dryRunOnly: false,
  publishMayExecute: true,
  runtimeMutationMayOccur: true,
  blockingEnforcementApplied: false,
  noAutomaticRollback: true,
  migrationId: BASE_INPUT.migrationId,
  candidateSiteVersionRef: "site-version-cutline-3",
  runtimeArtifactRef: "artifact-cutline-3",
  expectedPublishTargetRef: "production",
};

function status(nextOperationKey: SingleSiteMvpNextOperationKey): SingleSiteMvpOrchestrationStatusModel {
  const step = nextOperationKey === "run_shadow_publish" ? "operator_shadow_publish" : nextOperationKey === "run_operator_dry_run" ? "operator_dry_run" : "source_capture";
  return {
    orchestrationVersion: SINGLE_SITE_MVP_ORCHESTRATION_SERVICE_VERSION,
    generatedAt: "2026-08-13T12:00:00.000Z",
    identity: {
      tenantId: BASE_INPUT.tenantId,
      clientId: BASE_INPUT.clientId,
      siteId: BASE_INPUT.siteId,
      migrationId: BASE_INPUT.migrationId ?? null,
      candidateVersionRef: BASE_INPUT.candidateVersionRef ?? null,
      runtimeArtifactRef: BASE_INPUT.runtimeArtifactRef ?? null,
      publishTargetRef: BASE_INPUT.publishTargetRef ?? null,
      correlationId: BASE_INPUT.correlationId ?? null,
      actor: BASE_INPUT.actor,
    },
    boundary: {
      serverOnly: true,
      readOnly: true,
      advisoryOnly: true,
      mutatesSourceTruth: false,
      createsApprovals: false,
      createsAafRecords: false,
      createsGateAttempts: false,
      evaluatesGate: false,
      publishes: false,
      shadowPublishes: false,
      runtimeMutation: false,
      providerCalls: false,
      billingCalls: false,
      domainDnsCalls: false,
      routesAdded: false,
      uiAdded: false,
    },
    sourceSystemsRead: ["state_spine", "operator_audit"],
    stateReadModel: {
      available: true,
      readModelVersion: "test-read-model",
      currentState: "publish_ready",
      lifecycle: "active",
      recommendedNextAction: nextOperationKey,
    },
    publishOperatorProjection: {
      available: true,
      panelVersion: "test-panel",
      nextAction: nextOperationKey,
      readinessState: "ready",
    },
    steps: [
      {
        step,
        status: "ready",
        sourceOwner: "operator_audit",
        requiredRefs: ["safe_ref"],
        currentRefs: [{ key: "safe_ref", sourceOwner: "operator_audit", ref: "safe-ref-cutline-3" }],
        blockers: [],
        warnings: [],
        limitations: [],
        nextOperationKey,
        readOnly: true,
        mutatesSourceTruth: false,
        operatorActionAvailable: true,
      },
    ],
    nextOperation: {
      key: nextOperationKey,
      step,
      sourceOwner: "operator_audit",
      reason: "test advisory",
      requiredRefs: ["safe_ref"],
      currentRefs: [{ key: "safe_ref", sourceOwner: "operator_audit", ref: "safe-ref-cutline-3" }],
      readOnly: true,
      advisoryOnly: true,
      mutatesSourceTruth: false,
    },
    checklist: [
      {
        step,
        status: "ready",
        nextOperationKey,
        operatorActionAvailable: true,
        blockerCount: 0,
        warningCount: 0,
        limitationCount: 0,
        requiredRefsPresent: true,
        readOnly: true,
      },
    ],
    blockers: [],
    warnings: [],
    limitations: [],
  } as SingleSiteMvpOrchestrationStatusModel;
}

function depsFor(nextOperationKey: SingleSiteMvpNextOperationKey) {
  return {
    async readOrchestrationStatus() {
      return status(nextOperationKey);
    },
  };
}

function safeRefs() {
  return {
    tenantId: BASE_INPUT.tenantId,
    clientId: BASE_INPUT.clientId,
    siteId: BASE_INPUT.siteId,
    migrationId: BASE_INPUT.migrationId!,
    siteVersionId: "site-version-cutline-3",
    runtimeArtifactId: "artifact-cutline-3",
    publishTargetId: "production",
    publishStage: "production",
    publishEnvironment: "production",
    publishActivationRequestId: "request-cutline-3",
    publishActivationDecisionId: "decision-cutline-3",
    gateAttemptId: "gate-cutline-3",
    launchReadinessEvidenceId: "evidence-cutline-3",
    metadataWatermark: "metadata-watermark-cutline-3",
    handoffWatermark: BASE_INPUT.expectedHandoffWatermark!,
    gateInputWatermark: BASE_INPUT.expectedGateInputWatermark!,
    contextWatermark: "context-watermark-cutline-3",
  };
}

test("read status returns the redacted orchestration model", async () => {
  const result = await readSingleSiteMvpOperatorStatus(BASE_INPUT, depsFor("run_operator_dry_run"));

  assert.equal(result.allowed, true);
  assert.equal(result.reasonCode, "status_read_allowed");
  assert.equal(result.orchestrationStatus.nextOperation.key, "run_operator_dry_run");
  assert.equal("actor" in result.orchestrationStatus.identity, false);
  assert.equal(result.mutationFlags.facadeDirectRuntimeMutation, false);
});

test("preflight blocks a mismatched operation", async () => {
  const result = await preflightSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "run_shadow_publish" },
    depsFor("run_operator_dry_run"),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, "requested_operation_not_current_advisory");
  assert.equal(result.blockers.includes("single_site_mvp_operator_current_next_operation:run_operator_dry_run"), true);
});

test("preflight allows the current advisory operation", async () => {
  const result = await preflightSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "run_operator_dry_run" },
    depsFor("run_operator_dry_run"),
  );

  assert.equal(result.allowed, true);
  assert.equal(result.reasonCode, "preflight_allowed");
  assert.equal(result.warnings.includes("single_site_mvp_operator_explicit_confirmation_required_for_execution"), true);
});

test("preflight permits dry-run as the only safe diagnostic before shadow publish", async () => {
  const result = await preflightSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "run_operator_dry_run" },
    depsFor("run_shadow_publish"),
  );

  assert.equal(result.allowed, true);
  assert.equal(result.reasonCode, "safe_diagnostic_preflight_allowed");
});

test("non-executable advisory operations return manual or not implemented", async () => {
  const manual = await preflightSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "review_source_evidence" },
    depsFor("review_source_evidence"),
  );
  const notImplemented = await preflightSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "start_source_capture" },
    depsFor("start_source_capture"),
  );

  assert.equal(manual.allowed, false);
  assert.equal(manual.reasonCode, "manual_step_required");
  assert.equal(notImplemented.allowed, false);
  assert.equal(notImplemented.reasonCode, "not_implemented_for_mvp_cutline");
});

test("dry-run execution delegates only after correct confirmation validates", async () => {
  const calls: unknown[] = [];
  const canonicalCandidateRef = {
    role: "candidate_site_version",
    sourceSystem: "gnr8",
    sourceTable: "gnr8_runtime_site_versions",
    sourceRecordId: "site-version-cutline-3",
    sourceRef: "gnr8:gnr8_runtime_site_versions:site-version-cutline-3",
    sourceVersion: "persisted:v1",
    sourceWatermark: "updated_at:2026-08-21 06:18:00.763932+00",
    metadataJson: {
      tenantId: BASE_INPUT.tenantId,
      clientId: BASE_INPUT.clientId,
      siteId: BASE_INPUT.siteId,
      migrationId: BASE_INPUT.migrationId,
    },
  };
  const canonicalEvidenceRef = {
    role: "launch_readiness_evidence",
    sourceSystem: "aaf",
    sourceTable: "gnr8_aaf_evidence_packages",
    sourceRecordId: "evidence-cutline-3",
    sourceRef: "aaf:evidence_package:evidence-cutline-3",
    sourceVersion: "persisted:v1",
    sourceWatermark: `single-site-launch-readiness:${"d".repeat(64)}`,
  };
  const result = await executeSingleSiteMvpOperatorAction(
    {
      ...BASE_INPUT,
      candidateVersionRef: canonicalCandidateRef,
      expectedLaunchReadinessEvidenceRef: canonicalEvidenceRef,
      requestedOperationKey: "run_operator_dry_run",
      explicitConfirmation: DRY_RUN_CONFIRMATION,
      expectedGateAttemptResultRef: "gate-cutline-3",
      expectedGateAttemptResultDisplayRef: "aaf:action_gate_attempt:gate-cutline-3",
    },
    {
      ...depsFor("run_operator_dry_run"),
      async runSingleSitePublishOperatorDryRun(input) {
        calls.push(input);
        assert.equal(typeof input.request.candidateSiteVersionRef, "object");
        assert.deepEqual(input.request.candidateSiteVersionRef, {
          ...canonicalCandidateRef,
          contentHash: null,
        });
        assert.equal(input.request.expectedGateAttemptResultRef, "gate-cutline-3");
        assert.equal(input.request.expectedGateAttemptResultDisplayRef, "aaf:action_gate_attempt:gate-cutline-3");
        assert.equal(typeof input.request.expectedLaunchReadinessEvidenceRef, "object");
        assert.deepEqual(input.request.expectedLaunchReadinessEvidenceRef, {
          ...canonicalEvidenceRef,
          contentHash: null,
          metadataJson: undefined,
        });
        return {
          ok: true,
          callerVersion: SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_CALLER_VERSION,
          wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
          mode: "dry_run",
          preflightStatus: "caller_validated",
          resolverStatus: "complete",
          wrapperDryRunStatus: "dry_run_ready",
          metadataCompleteness: { status: "complete", complete: true, missingCodes: [], mismatchCodes: [], warningCodes: [] },
          blockerCodes: [],
          warnings: [],
          limitationCodes: [],
          safeRefs: safeRefs(),
          correlationId: BASE_INPUT.correlationId!,
          idempotencyKey: BASE_INPUT.idempotencyKey!,
          dryRun: true,
          publishes: false,
          runtimeMutation: false,
          blockingEnforcementApplied: false,
          createsAafRecords: false,
          createsGateAttempt: false,
          evaluatesGate: false,
          redactions: ["resolverResult"],
          flags: {
            dryRun: true,
            publishes: false,
            runtimeMutation: false,
            blockingEnforcementApplied: false,
            createsAafRecords: false,
            createsGateAttempt: false,
            evaluatesGate: false,
            pasrInvoked: false,
            createsDdomSnapshots: false,
            providerCalls: false,
            billingMutation: false,
            domainMutation: false,
            rollbackMutation: false,
            activePointerMutation: false,
            clientPortalExposure: false,
            opsInboxAction: false,
          },
        };
      },
    },
  );

  assert.equal(result.allowed, true);
  assert.equal(result.reasonCode, "execution_completed");
  assert.equal(result.executionResult?.operation, "run_operator_dry_run");
  assert.equal(result.mutationFlags.dryRun, true);
  assert.equal(result.mutationFlags.publishes, false);
  assert.equal(calls.length, 1);
});

test("dry-run execution blocks before delegation when confirmation is invalid", async () => {
  let calls = 0;
  const result = await executeSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "run_operator_dry_run", explicitConfirmation: { mode: "dry_run" } },
    {
      ...depsFor("run_operator_dry_run"),
      async runSingleSitePublishOperatorDryRun() {
        calls += 1;
        throw new Error("must not delegate");
      },
    },
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, "invalid_operation_request");
  assert.equal(result.blockers.includes("single_site_publish_operator_confirmation_invalid"), true);
  assert.equal(calls, 0);
});

test("shadow-publish blocks before execution when feature flag is off", async () => {
  let calls = 0;
  const result = await executeSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "run_shadow_publish", explicitConfirmation: SHADOW_CONFIRMATION },
    {
      ...depsFor("run_shadow_publish"),
      isShadowPublishFeatureEnabled: () => false,
      async runSingleSiteShadowPublishOperatorAction() {
        calls += 1;
        throw new Error("must not delegate");
      },
    },
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, "shadow_publish_feature_flag_disabled");
  assert.equal(calls, 0);
});

test("shadow-publish delegates only with feature flag and confirmation", async () => {
  const calls: unknown[] = [];
  const result = await executeSingleSiteMvpOperatorAction(
    { ...BASE_INPUT, requestedOperationKey: "run_shadow_publish", explicitConfirmation: SHADOW_CONFIRMATION },
    {
      ...depsFor("run_shadow_publish"),
      isShadowPublishFeatureEnabled: () => true,
      async runSingleSiteShadowPublishOperatorAction(input) {
        calls.push(input);
        return {
          ok: true,
          callerVersion: SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_CALLER_VERSION,
          wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
          mode: "shadow_publish",
          routeStatus: "shadow_publish_completed",
          preflightStatus: "caller_validated",
          resolverStatus: "complete",
          wrapperStatus: "published_via_existing_orchestrator",
          publishOrchestratorStatus: "called",
          publishOrchestrator: {
            status: "called",
            siteId: BASE_INPUT.siteId,
            siteVersionId: "site-version-cutline-3",
            artifactId: "artifact-cutline-3",
            publishStage: "production",
            pointerSwitch: "atomic_site_pointer_reassignment",
            activationOutcome: "atomic_site_pointer_reassignment",
            previousActivePointer: { siteVersionId: "old-version", artifactId: "old-artifact" },
            newActivePointer: { siteVersionId: "site-version-cutline-3", artifactId: "artifact-cutline-3" },
          },
          shadowGuardDiagnostics: null,
          metadataCompleteness: { status: "complete", complete: true, missingCodes: [], mismatchCodes: [], warningCodes: [] },
          blockerCodes: [],
          warnings: [],
          limitationCodes: [],
          safeRefs: safeRefs(),
          correlationId: BASE_INPUT.correlationId!,
          idempotencyKey: BASE_INPUT.idempotencyKey!,
          shadowPublish: true,
          dryRun: false,
          blockingEnforcementApplied: false,
          publishMayHaveExecuted: true,
          createsAafRecords: false,
          createsGateAttempt: false,
          evaluatesGate: false,
          redactions: ["rawPublishOrchestratorResult"],
          flags: {
            shadowPublish: true,
            dryRun: false,
            blockingEnforcementApplied: false,
            createsAafRecords: false,
            createsGateAttempt: false,
            evaluatesGate: false,
            pasrInvoked: false,
            createsDdomSnapshots: false,
            providerCalls: false,
            billingMutation: false,
            domainMutation: false,
            rollbackMutation: false,
            clientPortalExposure: false,
            opsInboxAction: false,
          },
        };
      },
    },
  );

  assert.equal(result.allowed, true);
  assert.equal(result.executionResult?.operation, "run_shadow_publish");
  assert.equal(result.mutationFlags.shadowPublish, true);
  assert.equal(result.mutationFlags.publishMayHaveExecuted, true);
  assert.equal(result.mutationFlags.facadeDirectRuntimeMutation, false);
  assert.equal(calls.length, 1);
});
