import "server-only";

import {
  readSingleSiteMvpOrchestrationStatus,
  SINGLE_SITE_MVP_NEXT_OPERATION_KEYS,
  type SingleSiteMvpNextOperationKey,
  type SingleSiteMvpOperatorActor,
  type SingleSiteMvpOrchestrationReadDependencies,
  type SingleSiteMvpOrchestrationStatusModel,
} from "./single-site-mvp-orchestration-service";
import {
  runSingleSitePublishOperatorDryRun,
  validateSingleSitePublishOperatorDryRunRequest,
  type SingleSitePublishOperatorDryRunCallerDependencies,
  type SingleSitePublishOperatorDryRunActor,
  type SingleSitePublishOperatorDryRunCanonicalRef,
  type SingleSitePublishOperatorDryRunSafeResult,
} from "./single-site-publish-operator-dry-run-caller";
import {
  runSingleSiteShadowPublishOperatorAction,
  validateSingleSiteShadowPublishOperatorRequest,
  type SingleSiteShadowPublishOperatorActor,
  type SingleSiteShadowPublishOperatorCallerDependencies,
  type SingleSiteShadowPublishOperatorSafeResult,
} from "./single-site-shadow-publish-operator-caller";

export const SINGLE_SITE_MVP_OPERATOR_ACTION_FACADE_VERSION =
  "mvp-cutline-3-single-site-mvp-operator-action-facade:v1" as const;

export const SINGLE_SITE_MVP_OPERATOR_ACTION_MUTATION_FLAGS = {
  facadeCreatesAafRecords: false,
  facadeCreatesGateAttempts: false,
  facadeEvaluatesGate: false,
  facadeInvokesPasr: false,
  facadeCreatesDdomSnapshots: false,
  facadeProviderCalls: false,
  facadeBillingCalls: false,
  facadeDomainDnsCalls: false,
  facadeDirectRuntimeMutation: false,
  facadeDirectPublishTargetMutation: false,
  facadeDirectActivePointerMutation: false,
  facadeDirectRollbackMutation: false,
  commandCenterUiAdded: false,
  clientPortalExposure: false,
  opsInboxAction: false,
} as const;

export type SingleSiteMvpOperatorActionMode = "preflight" | "execute";

export type SingleSiteMvpOperatorActionReasonCode =
  | "status_read_allowed"
  | "preflight_allowed"
  | "safe_diagnostic_preflight_allowed"
  | "execution_completed"
  | "invalid_identity"
  | "invalid_requested_operation"
  | "requested_operation_not_current_advisory"
  | "manual_step_required"
  | "not_implemented_for_mvp_cutline"
  | "confirmation_required"
  | "invalid_operation_request"
  | "shadow_publish_feature_flag_disabled"
  | "execution_failed";

export type SingleSiteMvpOperatorActionExecutionResult =
  | {
      operation: "run_operator_dry_run";
      ok: boolean;
      mode: "dry_run";
      preflightStatus: SingleSitePublishOperatorDryRunSafeResult["preflightStatus"];
      wrapperStatus: SingleSitePublishOperatorDryRunSafeResult["wrapperDryRunStatus"];
      resolverStatus: SingleSitePublishOperatorDryRunSafeResult["resolverStatus"];
      metadataCompleteness: SingleSitePublishOperatorDryRunSafeResult["metadataCompleteness"];
      blockerCodes: string[];
      warningCodes: string[];
      limitationCodes: string[];
      safeRefs: SingleSitePublishOperatorDryRunSafeResult["safeRefs"];
      correlationId: string;
      idempotencyKey: string;
      dryRun: true;
      publishes: false;
      runtimeMutation: false;
      publishMayHaveExecuted: false;
      createsAafRecords: false;
      createsGateAttempt: false;
      evaluatesGate: false;
      redactions: string[];
    }
  | {
      operation: "run_shadow_publish";
      ok: boolean;
      mode: "shadow_publish";
      routeStatus: SingleSiteShadowPublishOperatorSafeResult["routeStatus"];
      preflightStatus: SingleSiteShadowPublishOperatorSafeResult["preflightStatus"];
      wrapperStatus: SingleSiteShadowPublishOperatorSafeResult["wrapperStatus"];
      resolverStatus: SingleSiteShadowPublishOperatorSafeResult["resolverStatus"];
      publishOrchestratorStatus: SingleSiteShadowPublishOperatorSafeResult["publishOrchestratorStatus"];
      publishOrchestrator: SingleSiteShadowPublishOperatorSafeResult["publishOrchestrator"];
      shadowGuardDiagnostics: SingleSiteShadowPublishOperatorSafeResult["shadowGuardDiagnostics"];
      metadataCompleteness: SingleSiteShadowPublishOperatorSafeResult["metadataCompleteness"];
      blockerCodes: string[];
      warningCodes: string[];
      limitationCodes: string[];
      safeRefs: SingleSiteShadowPublishOperatorSafeResult["safeRefs"];
      correlationId: string;
      idempotencyKey: string;
      shadowPublish: true;
      dryRun: false;
      publishMayHaveExecuted: boolean;
      createsAafRecords: false;
      createsGateAttempt: false;
      evaluatesGate: false;
      redactions: string[];
    };

export type SingleSiteMvpOperatorActionInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId?: string | null;
  candidateVersionRef?: SingleSitePublishOperatorDryRunCanonicalRef | null;
  runtimeArtifactRef?: SingleSitePublishOperatorDryRunCanonicalRef | null;
  publishTargetRef?: SingleSitePublishOperatorDryRunCanonicalRef | null;
  requestedOperationKey?: SingleSiteMvpNextOperationKey | string | null;
  actor: SingleSiteMvpOperatorActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  explicitConfirmation?: unknown;
  publishStage?: "shadow" | "canary" | "production" | string | null;
  publishEnvironment?: string | null;
  expectedLaunchReadinessEvidenceRef?: SingleSitePublishOperatorDryRunCanonicalRef | null;
  expectedPublishActivationRequestRef?: string | null;
  expectedPublishActivationDecisionRef?: string | null;
  expectedGateAttemptResultRef?: string | null;
  expectedGateAttemptResultDisplayRef?: string | null;
  expectedHandoffWatermark?: string | null;
  expectedGateInputWatermark?: string | null;
  allowWarningsWithLimitations?: boolean;
  maxGateAgeMs?: number | null;
  evaluatedAt?: string | null;
  requestId?: string | null;
};

export type SingleSiteMvpOperatorActionStatus = {
  orchestrationVersion: SingleSiteMvpOrchestrationStatusModel["orchestrationVersion"];
  generatedAt: string;
  identity: Omit<SingleSiteMvpOrchestrationStatusModel["identity"], "actor">;
  boundary: SingleSiteMvpOrchestrationStatusModel["boundary"];
  sourceSystemsRead: SingleSiteMvpOrchestrationStatusModel["sourceSystemsRead"];
  stateReadModel: SingleSiteMvpOrchestrationStatusModel["stateReadModel"];
  publishOperatorProjection: SingleSiteMvpOrchestrationStatusModel["publishOperatorProjection"];
  nextOperation: SingleSiteMvpOrchestrationStatusModel["nextOperation"];
  steps: SingleSiteMvpOrchestrationStatusModel["steps"];
  checklist: SingleSiteMvpOrchestrationStatusModel["checklist"];
  blockers: string[];
  warnings: string[];
  limitations: string[];
};

export type SingleSiteMvpOperatorActionOutput = {
  facadeVersion: typeof SINGLE_SITE_MVP_OPERATOR_ACTION_FACADE_VERSION;
  orchestrationStatus: SingleSiteMvpOperatorActionStatus;
  requestedOperation: SingleSiteMvpNextOperationKey | string | null;
  allowed: boolean;
  reasonCode: SingleSiteMvpOperatorActionReasonCode;
  blockers: string[];
  warnings: string[];
  limitations: string[];
  safeRefs: SingleSiteMvpOrchestrationStatusModel["nextOperation"]["currentRefs"];
  executionResult: SingleSiteMvpOperatorActionExecutionResult | null;
  mutationFlags: typeof SINGLE_SITE_MVP_OPERATOR_ACTION_MUTATION_FLAGS & {
    dryRun: boolean;
    shadowPublish: boolean;
    publishes: boolean;
    runtimeMutation: boolean;
    publishMayHaveExecuted: boolean;
  };
  correlationId: string | null;
  idempotencyKey: string | null;
  redactions: string[];
};

export type SingleSiteMvpOperatorActionFacadeDependencies = SingleSiteMvpOrchestrationReadDependencies & {
  readOrchestrationStatus?: typeof readSingleSiteMvpOrchestrationStatus;
  runSingleSitePublishOperatorDryRun?: typeof runSingleSitePublishOperatorDryRun;
  runSingleSiteShadowPublishOperatorAction?: typeof runSingleSiteShadowPublishOperatorAction;
  dryRunDependencies?: SingleSitePublishOperatorDryRunCallerDependencies;
  shadowPublishDependencies?: SingleSiteShadowPublishOperatorCallerDependencies;
  isShadowPublishFeatureEnabled?: () => boolean;
};

const EXECUTABLE_OPERATION_KEYS = new Set<SingleSiteMvpNextOperationKey>([
  "run_operator_dry_run",
  "run_shadow_publish",
]);

const MANUAL_OPERATION_KEYS = new Set<SingleSiteMvpNextOperationKey>([
  "review_source_evidence",
  "review_clone",
  "review_improved_candidate",
  "blocked_manual_resolution_required",
  "verify_online_site",
  "closeout_mvp_site",
  "no_action",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const normalized = text(value);
  return normalized ? normalized : null;
}

function refDisplayText(value: SingleSitePublishOperatorDryRunCanonicalRef | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return nullableText(value);
  return nullableText(value.sourceRef) ?? nullableText(value.sourceRecordId);
}

function identityErrors(input: Pick<SingleSiteMvpOperatorActionInput, "tenantId" | "clientId" | "siteId" | "actor">): string[] {
  const errors: string[] = [];
  if (!text(input.tenantId)) errors.push("single_site_mvp_operator_tenant_id_missing");
  if (!text(input.clientId)) errors.push("single_site_mvp_operator_client_id_missing");
  if (!text(input.siteId)) errors.push("single_site_mvp_operator_site_id_missing");
  if (!input.actor || input.actor.actorType !== "human" || !text(input.actor.actorId) || input.actor.actorRole !== "platform_superadmin") {
    errors.push("single_site_mvp_operator_server_actor_invalid");
  }
  return errors;
}

function readDependencies(dependencies: SingleSiteMvpOperatorActionFacadeDependencies): SingleSiteMvpOrchestrationReadDependencies {
  return {
    stateReader: dependencies.stateReader,
    publishOperatorProjectionReader: dependencies.publishOperatorProjectionReader,
    generatedAt: dependencies.generatedAt,
  };
}

function isKnownOperation(value: unknown): value is SingleSiteMvpNextOperationKey {
  return SINGLE_SITE_MVP_NEXT_OPERATION_KEYS.includes(value as SingleSiteMvpNextOperationKey);
}

function isExecutableOperation(value: unknown): value is "run_operator_dry_run" | "run_shadow_publish" {
  return value === "run_operator_dry_run" || value === "run_shadow_publish";
}

function isSafeDiagnosticOperation(input: {
  requestedOperation: SingleSiteMvpNextOperationKey;
  recommendedOperation: SingleSiteMvpNextOperationKey;
}): boolean {
  return input.requestedOperation === "run_operator_dry_run" && input.recommendedOperation === "run_shadow_publish";
}

function isShadowPublishFeatureEnabled(): boolean {
  return ["1", "true", "enabled", "on", "shadow_publish"].includes(
    String(process.env.GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION ?? "").trim().toLowerCase(),
  );
}

function redactedStatus(status: SingleSiteMvpOrchestrationStatusModel): SingleSiteMvpOperatorActionStatus {
  const { actor: _actor, ...identity } = status.identity;
  return {
    orchestrationVersion: status.orchestrationVersion,
    generatedAt: status.generatedAt,
    identity,
    boundary: status.boundary,
    sourceSystemsRead: status.sourceSystemsRead,
    stateReadModel: status.stateReadModel,
    publishOperatorProjection: status.publishOperatorProjection,
    nextOperation: status.nextOperation,
    steps: status.steps,
    checklist: status.checklist,
    blockers: status.blockers,
    warnings: status.warnings,
    limitations: status.limitations,
  };
}

function mutationFlags(overrides: {
  dryRun?: boolean;
  shadowPublish?: boolean;
  publishes?: boolean;
  runtimeMutation?: boolean;
  publishMayHaveExecuted?: boolean;
} = {}): SingleSiteMvpOperatorActionOutput["mutationFlags"] {
  return {
    ...SINGLE_SITE_MVP_OPERATOR_ACTION_MUTATION_FLAGS,
    dryRun: overrides.dryRun ?? false,
    shadowPublish: overrides.shadowPublish ?? false,
    publishes: overrides.publishes ?? false,
    runtimeMutation: overrides.runtimeMutation ?? false,
    publishMayHaveExecuted: overrides.publishMayHaveExecuted ?? false,
  };
}

function output(input: {
  status: SingleSiteMvpOrchestrationStatusModel;
  requestedOperation: SingleSiteMvpNextOperationKey | string | null;
  allowed: boolean;
  reasonCode: SingleSiteMvpOperatorActionReasonCode;
  blockers?: string[];
  warnings?: string[];
  limitations?: string[];
  executionResult?: SingleSiteMvpOperatorActionExecutionResult | null;
  mutationFlags?: SingleSiteMvpOperatorActionOutput["mutationFlags"];
  correlationId?: string | null;
  idempotencyKey?: string | null;
}): SingleSiteMvpOperatorActionOutput {
  return {
    facadeVersion: SINGLE_SITE_MVP_OPERATOR_ACTION_FACADE_VERSION,
    orchestrationStatus: redactedStatus(input.status),
    requestedOperation: input.requestedOperation,
    allowed: input.allowed,
    reasonCode: input.reasonCode,
    blockers: [...(input.blockers ?? [])].sort(),
    warnings: [...(input.warnings ?? [])].sort(),
    limitations: [...(input.limitations ?? [])].sort(),
    safeRefs: input.status.nextOperation.currentRefs,
    executionResult: input.executionResult ?? null,
    mutationFlags: input.mutationFlags ?? mutationFlags(),
    correlationId: input.correlationId ?? input.status.identity.correlationId,
    idempotencyKey: input.idempotencyKey ?? null,
    redactions: [
      "serverActor",
      "requestActorOverrides",
      "resolverResult",
      "publishActivationMetadataHandoff",
      "publishOrchestratorInput",
      "rawPublishOrchestratorResult",
      "rawAafPayload",
      "rawSqlErrors",
      "stackTraces",
      "providerSecrets",
      "billingData",
      "paymentData",
    ],
  };
}

async function readStatus(
  input: SingleSiteMvpOperatorActionInput,
  dependencies: SingleSiteMvpOperatorActionFacadeDependencies,
): Promise<SingleSiteMvpOrchestrationStatusModel> {
  const reader = dependencies.readOrchestrationStatus ?? readSingleSiteMvpOrchestrationStatus;
  return reader(
    {
      tenantId: text(input.tenantId),
      clientId: text(input.clientId),
      siteId: text(input.siteId),
      migrationId: nullableText(input.migrationId),
      candidateVersionRef: refDisplayText(input.candidateVersionRef),
      runtimeArtifactRef: refDisplayText(input.runtimeArtifactRef),
      publishTargetRef: refDisplayText(input.publishTargetRef),
      actor: input.actor,
      correlationId: nullableText(input.correlationId),
    },
    readDependencies(dependencies),
  );
}

function existingCallerBody(input: SingleSiteMvpOperatorActionInput, mode: "dry_run" | "shadow_publish"): Record<string, unknown> {
  return {
    mode,
    tenantId: text(input.tenantId),
    clientId: text(input.clientId),
    siteId: text(input.siteId),
    migrationId: text(input.migrationId),
    candidateSiteVersionRef: input.candidateVersionRef,
    runtimeArtifactRef: input.runtimeArtifactRef,
    expectedPublishTargetRef: input.publishTargetRef,
    publishStage: text(input.publishStage),
    publishEnvironment: text(input.publishEnvironment),
    expectedLaunchReadinessEvidenceRef: input.expectedLaunchReadinessEvidenceRef,
    expectedPublishActivationRequestRef: text(input.expectedPublishActivationRequestRef),
    expectedPublishActivationDecisionRef: text(input.expectedPublishActivationDecisionRef),
    expectedGateAttemptResultRef: text(input.expectedGateAttemptResultRef),
    ...(mode === "dry_run" && text(input.expectedGateAttemptResultDisplayRef)
      ? { expectedGateAttemptResultDisplayRef: text(input.expectedGateAttemptResultDisplayRef) }
      : {}),
    expectedHandoffWatermark: text(input.expectedHandoffWatermark),
    expectedGateInputWatermark: text(input.expectedGateInputWatermark),
    operatorConfirmation: input.explicitConfirmation,
    idempotencyKey: text(input.idempotencyKey),
    correlationId: text(input.correlationId),
    ...(input.allowWarningsWithLimitations === undefined ? {} : { allowWarningsWithLimitations: input.allowWarningsWithLimitations }),
    ...(input.maxGateAgeMs === undefined ? {} : { maxGateAgeMs: input.maxGateAgeMs }),
    ...(input.evaluatedAt === undefined ? {} : { evaluatedAt: input.evaluatedAt }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
  };
}

function executionActor(input: SingleSiteMvpOperatorActionInput): SingleSitePublishOperatorDryRunActor & SingleSiteShadowPublishOperatorActor {
  return {
    actorType: "human",
    actorId: text(input.actor.actorId),
    actorRole: "platform_superadmin",
  };
}

function dryRunExecutionResult(result: SingleSitePublishOperatorDryRunSafeResult): SingleSiteMvpOperatorActionExecutionResult {
  return {
    operation: "run_operator_dry_run",
    ok: result.ok,
    mode: result.mode,
    preflightStatus: result.preflightStatus,
    wrapperStatus: result.wrapperDryRunStatus,
    resolverStatus: result.resolverStatus,
    metadataCompleteness: result.metadataCompleteness,
    blockerCodes: result.blockerCodes,
    warningCodes: result.warnings,
    limitationCodes: result.limitationCodes,
    safeRefs: result.safeRefs,
    correlationId: result.correlationId,
    idempotencyKey: result.idempotencyKey,
    dryRun: true,
    publishes: false,
    runtimeMutation: false,
    publishMayHaveExecuted: false,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    redactions: result.redactions,
  };
}

function shadowPublishExecutionResult(result: SingleSiteShadowPublishOperatorSafeResult): SingleSiteMvpOperatorActionExecutionResult {
  return {
    operation: "run_shadow_publish",
    ok: result.ok,
    mode: result.mode,
    routeStatus: result.routeStatus,
    preflightStatus: result.preflightStatus,
    wrapperStatus: result.wrapperStatus,
    resolverStatus: result.resolverStatus,
    publishOrchestratorStatus: result.publishOrchestratorStatus,
    publishOrchestrator: result.publishOrchestrator,
    shadowGuardDiagnostics: result.shadowGuardDiagnostics,
    metadataCompleteness: result.metadataCompleteness,
    blockerCodes: result.blockerCodes,
    warningCodes: result.warnings,
    limitationCodes: result.limitationCodes,
    safeRefs: result.safeRefs,
    correlationId: result.correlationId,
    idempotencyKey: result.idempotencyKey,
    shadowPublish: true,
    dryRun: false,
    publishMayHaveExecuted: result.publishMayHaveExecuted,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    redactions: result.redactions,
  };
}

export async function readSingleSiteMvpOperatorStatus(
  input: SingleSiteMvpOperatorActionInput,
  dependencies: SingleSiteMvpOperatorActionFacadeDependencies = {},
): Promise<SingleSiteMvpOperatorActionOutput> {
  const errors = identityErrors(input);
  const status = await readStatus(input, dependencies);
  if (errors.length > 0) {
    return output({
      status,
      requestedOperation: null,
      allowed: false,
      reasonCode: "invalid_identity",
      blockers: errors,
      correlationId: nullableText(input.correlationId),
      idempotencyKey: nullableText(input.idempotencyKey),
    });
  }
  return output({
    status,
    requestedOperation: null,
    allowed: true,
    reasonCode: "status_read_allowed",
    warnings: status.warnings,
    limitations: status.limitations,
    correlationId: nullableText(input.correlationId),
    idempotencyKey: nullableText(input.idempotencyKey),
  });
}

export async function preflightSingleSiteMvpOperatorAction(
  input: SingleSiteMvpOperatorActionInput,
  dependencies: SingleSiteMvpOperatorActionFacadeDependencies = {},
): Promise<SingleSiteMvpOperatorActionOutput> {
  const status = await readStatus(input, dependencies);
  const identityBlockers = identityErrors(input);
  if (identityBlockers.length > 0) {
    return output({
      status,
      requestedOperation: nullableText(input.requestedOperationKey),
      allowed: false,
      reasonCode: "invalid_identity",
      blockers: identityBlockers,
      correlationId: nullableText(input.correlationId),
      idempotencyKey: nullableText(input.idempotencyKey),
    });
  }

  const requestedOperation = nullableText(input.requestedOperationKey);
  if (!isKnownOperation(requestedOperation)) {
    return output({
      status,
      requestedOperation,
      allowed: false,
      reasonCode: "invalid_requested_operation",
      blockers: ["single_site_mvp_operator_requested_operation_invalid"],
      correlationId: nullableText(input.correlationId),
      idempotencyKey: nullableText(input.idempotencyKey),
    });
  }

  const recommendedOperation = status.nextOperation.key;
  const diagnosticAllowed = isSafeDiagnosticOperation({ requestedOperation, recommendedOperation });
  if (requestedOperation !== recommendedOperation && !diagnosticAllowed) {
    return output({
      status,
      requestedOperation,
      allowed: false,
      reasonCode: "requested_operation_not_current_advisory",
      blockers: [`single_site_mvp_operator_current_next_operation:${recommendedOperation}`],
      warnings: status.warnings,
      limitations: status.limitations,
      correlationId: nullableText(input.correlationId),
      idempotencyKey: nullableText(input.idempotencyKey),
    });
  }

  if (!EXECUTABLE_OPERATION_KEYS.has(requestedOperation)) {
    return output({
      status,
      requestedOperation,
      allowed: false,
      reasonCode: MANUAL_OPERATION_KEYS.has(requestedOperation) ? "manual_step_required" : "not_implemented_for_mvp_cutline",
      blockers: [`single_site_mvp_operator_${requestedOperation}_not_executable_in_mvp_cutline_3`],
      warnings: status.warnings,
      limitations: status.limitations,
      correlationId: nullableText(input.correlationId),
      idempotencyKey: nullableText(input.idempotencyKey),
    });
  }

  return output({
    status,
    requestedOperation,
    allowed: true,
    reasonCode: diagnosticAllowed ? "safe_diagnostic_preflight_allowed" : "preflight_allowed",
    blockers: status.nextOperation.step ? status.steps.find((item) => item.step === status.nextOperation.step)?.blockers ?? [] : [],
    warnings: ["single_site_mvp_operator_explicit_confirmation_required_for_execution", ...status.warnings],
    limitations: status.limitations,
    correlationId: nullableText(input.correlationId),
    idempotencyKey: nullableText(input.idempotencyKey),
  });
}

export async function executeSingleSiteMvpOperatorAction(
  input: SingleSiteMvpOperatorActionInput,
  dependencies: SingleSiteMvpOperatorActionFacadeDependencies = {},
): Promise<SingleSiteMvpOperatorActionOutput> {
  const preflight = await preflightSingleSiteMvpOperatorAction(input, dependencies);
  if (!preflight.allowed || !isExecutableOperation(preflight.requestedOperation)) {
    return preflight;
  }
  if (!input.explicitConfirmation) {
    return {
      ...preflight,
      allowed: false,
      reasonCode: "confirmation_required",
      blockers: ["single_site_mvp_operator_explicit_confirmation_required"],
      executionResult: null,
      mutationFlags: mutationFlags(),
    };
  }

  if (preflight.requestedOperation === "run_operator_dry_run") {
    const validation = validateSingleSitePublishOperatorDryRunRequest(existingCallerBody(input, "dry_run"));
    if (!validation.valid) {
      return {
        ...preflight,
        allowed: false,
        reasonCode: "invalid_operation_request",
        blockers: validation.errors,
        executionResult: null,
        mutationFlags: mutationFlags(),
      };
    }
    const runner = dependencies.runSingleSitePublishOperatorDryRun ?? runSingleSitePublishOperatorDryRun;
    const result = await runner({
      request: validation.request,
      actor: executionActor(input),
      dependencies: dependencies.dryRunDependencies,
    });
    return {
      ...preflight,
      allowed: result.ok,
      reasonCode: result.ok ? "execution_completed" : "execution_failed",
      blockers: result.blockerCodes,
      warnings: result.warnings,
      limitations: result.limitationCodes,
      executionResult: dryRunExecutionResult(result),
      mutationFlags: mutationFlags({ dryRun: true }),
    };
  }

  const shadowFeatureEnabled = dependencies.isShadowPublishFeatureEnabled ?? isShadowPublishFeatureEnabled;
  if (!shadowFeatureEnabled()) {
    return {
      ...preflight,
      allowed: false,
      reasonCode: "shadow_publish_feature_flag_disabled",
      blockers: ["single_site_shadow_publish_operator_flag_disabled"],
      executionResult: null,
      mutationFlags: mutationFlags(),
    };
  }
  const validation = validateSingleSiteShadowPublishOperatorRequest(existingCallerBody(input, "shadow_publish"));
  if (!validation.valid) {
    return {
      ...preflight,
      allowed: false,
      reasonCode: "invalid_operation_request",
      blockers: validation.errors,
      executionResult: null,
      mutationFlags: mutationFlags(),
    };
  }
  const runner = dependencies.runSingleSiteShadowPublishOperatorAction ?? runSingleSiteShadowPublishOperatorAction;
  const result = await runner({
    request: validation.request,
    actor: executionActor(input),
    dependencies: dependencies.shadowPublishDependencies,
  });
  return {
    ...preflight,
    allowed: result.ok,
    reasonCode: result.ok ? "execution_completed" : "execution_failed",
    blockers: result.blockerCodes,
    warnings: result.warnings,
    limitations: result.limitationCodes,
    executionResult: shadowPublishExecutionResult(result),
    mutationFlags: mutationFlags({
      shadowPublish: true,
      publishes: result.publishMayHaveExecuted,
      runtimeMutation: result.publishMayHaveExecuted,
      publishMayHaveExecuted: result.publishMayHaveExecuted,
    }),
  };
}
