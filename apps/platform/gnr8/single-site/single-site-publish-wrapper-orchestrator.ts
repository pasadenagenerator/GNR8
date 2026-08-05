import "server-only";

import { createHash } from "node:crypto";

import type { publishApprovedSiteVersion as publishApprovedSiteVersionImpl } from "../runtime/publish-activation-orchestrator";
import type { PublishActivationEnforcementGuardPolicy, PublishActivationEnforcementGuardRef } from "./publish-activation-enforcement-guard";
import {
  normalizePublishActivationMetadataHandoff,
  type NormalizedPublishActivationMetadataHandoff,
  type PublishActivationMetadataHandoff,
} from "./publish-activation-metadata-handoff";
import {
  readAndResolveSingleSitePublishActivationMetadataHandoff,
  type PublishActivationMetadataResolverActor,
  type PublishActivationMetadataResolverDiagnostics,
  type PublishActivationMetadataResolverReadRepositoryLike,
  type PublishActivationMetadataResolverResult,
} from "./publish-activation-metadata-resolver";

export const SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION = "mvp-52-single-site-publish-wrapper-orchestrator:v1" as const;

export const SINGLE_SITE_PUBLISH_WRAPPER_FLAGS = {
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
} as const;

export type SingleSitePublishWrapperExecutionMode = "shadow_publish";
export type SingleSitePublishWrapperStatus =
  | "dry_run_ready"
  | "published_via_existing_orchestrator"
  | "preflight_blocked"
  | "resolver_unavailable"
  | "orchestrator_failed";

export type SingleSitePublishWrapperActor = PublishActivationMetadataResolverActor;
export type SingleSitePublishWrapperPublishStage = "shadow" | "canary" | "production";
export type SingleSitePublishWrapperPublishApprovedSiteVersion = typeof publishApprovedSiteVersionImpl;

export type SingleSitePublishWrapperInput = {
  enabled?: boolean;
  mode?: SingleSitePublishWrapperExecutionMode | null;
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  candidateSiteVersionRef: PublishActivationEnforcementGuardRef | string;
  runtimeArtifactRef: PublishActivationEnforcementGuardRef | string;
  publishStage: SingleSitePublishWrapperPublishStage | string;
  publishEnvironment: string;
  actor: SingleSitePublishWrapperActor;
  correlationId: string;
  idempotencyKey: string;
  expectedPublishTargetRef?: PublishActivationEnforcementGuardRef | string | null;
  expectedLaunchReadinessEvidenceRef?: PublishActivationEnforcementGuardRef | string | null;
  expectedPublishActivationRequestRef?: string | null;
  expectedPublishActivationDecisionRef?: string | null;
  expectedGateAttemptResultRef?: string | null;
  expectedHandoffWatermark?: string | null;
  expectedGateInputWatermark?: string | null;
  allowWarningsWithLimitations?: boolean;
  maxGateAgeMs?: number | null;
  evaluatedAt?: string | Date | null;
  requestId?: string | null;
  dryRun?: boolean;
  repository?: PublishActivationMetadataResolverReadRepositoryLike;
  policy?: PublishActivationEnforcementGuardPolicy;
};

export type SingleSitePublishStrictContextSummary = {
  tenantId: string | null;
  clientId: string | null;
  siteId: string | null;
  migrationId: string | null;
  siteVersionId: string | null;
  runtimeArtifactId: string | null;
  publishTargetId: string | null;
  publishStage: string | null;
  publishEnvironment: string | null;
  publishActivationRequestId: string | null;
  publishActivationDecisionId: string | null;
  gateAttemptId: string | null;
  launchReadinessEvidenceId: string | null;
  metadataWatermark: string | null;
  handoffWatermark: string | null;
  gateInputWatermark: string | null;
  contextWatermark: string | null;
};

export type SingleSitePublishWrapperMetadataCompleteness = {
  status: "complete" | "incomplete";
  complete: boolean;
  missingCodes: string[];
  mismatchCodes: string[];
  warningCodes: string[];
  safeIds: SingleSitePublishStrictContextSummary;
};

export type SingleSitePublishPreparedContext = {
  wrapperVersion: typeof SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION;
  strictContextSummary: SingleSitePublishStrictContextSummary;
  publishActivationMetadataHandoff: NormalizedPublishActivationMetadataHandoff;
  metadataHandoffCompleteness: SingleSitePublishWrapperMetadataCompleteness;
  resolverResult: PublishActivationMetadataResolverResult;
  resolverDiagnostics: PublishActivationMetadataResolverDiagnostics;
  limitations: NonNullable<NormalizedPublishActivationMetadataHandoff["limitations"]> | null;
  warnings: string[];
  publishOrchestratorInput: Parameters<SingleSitePublishWrapperPublishApprovedSiteVersion>[0];
};

export type SingleSitePublishWrapperResult = {
  wrapperVersion: typeof SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION;
  status: SingleSitePublishWrapperStatus;
  strictContextSummary: SingleSitePublishStrictContextSummary;
  metadataHandoffCompleteness: SingleSitePublishWrapperMetadataCompleteness | null;
  resolverDiagnostics: PublishActivationMetadataResolverDiagnostics | null;
  resolverResult?: PublishActivationMetadataResolverResult | null;
  publishOrchestratorResult?: Awaited<ReturnType<SingleSitePublishWrapperPublishApprovedSiteVersion>> | null;
  publishOrchestratorInput?: Parameters<SingleSitePublishWrapperPublishApprovedSiteVersion>[0] | null;
  limitations: NonNullable<NormalizedPublishActivationMetadataHandoff["limitations"]> | null;
  warnings: string[];
  blockerCodes: string[];
  dryRun: boolean;
  publishes: boolean;
  runtimeMutation: boolean;
  flags: typeof SINGLE_SITE_PUBLISH_WRAPPER_FLAGS;
};

export type SingleSitePublishWrapperDependencies = {
  metadataResolver?: typeof readAndResolveSingleSitePublishActivationMetadataHandoff;
  publishApprovedSiteVersion?: SingleSitePublishWrapperPublishApprovedSiteVersion;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value ?? null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined && typeof entry !== "function")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

function sourceId(refOrId: PublishActivationEnforcementGuardRef | string | null | undefined): string | null {
  if (!refOrId) return null;
  if (typeof refOrId === "string") {
    const normalized = text(refOrId);
    if (!normalized) return null;
    return text(normalized.split(":").at(-1)) ?? normalized;
  }
  return text(refOrId.sourceRecordId);
}

function sourceRef(refOrId: PublishActivationEnforcementGuardRef | string | null | undefined): string | null {
  if (!refOrId) return null;
  if (typeof refOrId === "string") return text(refOrId);
  return text(refOrId.sourceRef) ?? text(refOrId.sourceRecordId);
}

function sameRef(expected: PublishActivationEnforcementGuardRef | string | null | undefined, actual: PublishActivationEnforcementGuardRef | string | null | undefined): boolean {
  const expectedId = sourceId(expected);
  const actualId = sourceId(actual);
  if (expectedId && actualId && expectedId === actualId) return true;
  const expectedRef = sourceRef(expected);
  const actualRef = sourceRef(actual);
  return Boolean(expectedRef && actualRef && expectedRef === actualRef);
}

function refMatchesText(expected: string | null | undefined, values: readonly (string | null | undefined)[]): boolean {
  const normalized = text(expected);
  if (!normalized) return true;
  return values.map(text).some((value) => value === normalized);
}

function emptySummary(input?: Partial<SingleSitePublishWrapperInput>): SingleSitePublishStrictContextSummary {
  return {
    tenantId: text(input?.tenantId),
    clientId: text(input?.clientId),
    siteId: text(input?.siteId),
    migrationId: text(input?.migrationId),
    siteVersionId: sourceId(input?.candidateSiteVersionRef),
    runtimeArtifactId: sourceId(input?.runtimeArtifactRef),
    publishTargetId: sourceId(input?.expectedPublishTargetRef),
    publishStage: text(input?.publishStage),
    publishEnvironment: text(input?.publishEnvironment),
    publishActivationRequestId: text(input?.expectedPublishActivationRequestRef),
    publishActivationDecisionId: text(input?.expectedPublishActivationDecisionRef),
    gateAttemptId: text(input?.expectedGateAttemptResultRef),
    launchReadinessEvidenceId: sourceId(input?.expectedLaunchReadinessEvidenceRef),
    metadataWatermark: null,
    handoffWatermark: text(input?.expectedHandoffWatermark),
    gateInputWatermark: text(input?.expectedGateInputWatermark),
    contextWatermark: null,
  };
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

export function buildSingleSitePublishContextWatermark(input: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(stableValue(input))).digest("hex");
  return `single-site-publish-wrapper-context:${digest}`;
}

function requiredPreflightBlockers(input: SingleSitePublishWrapperInput): string[] {
  const blockers: string[] = [];
  if (input.enabled !== true && input.mode !== "shadow_publish") blockers.push("single_site_publish_wrapper_explicit_mode_required");
  if (!text(input.tenantId)) blockers.push("single_site_publish_wrapper_tenant_id_missing");
  if (!text(input.clientId)) blockers.push("single_site_publish_wrapper_client_id_missing");
  if (!text(input.siteId)) blockers.push("single_site_publish_wrapper_site_id_missing");
  if (!text(input.migrationId)) blockers.push("single_site_publish_wrapper_migration_id_missing");
  if (!sourceId(input.candidateSiteVersionRef)) blockers.push("single_site_publish_wrapper_candidate_site_version_ref_missing");
  if (!sourceId(input.runtimeArtifactRef)) blockers.push("single_site_publish_wrapper_runtime_artifact_ref_missing");
  if (!["shadow", "canary", "production"].includes(String(text(input.publishStage) ?? ""))) blockers.push("single_site_publish_wrapper_publish_stage_invalid");
  if (!text(input.publishEnvironment)) blockers.push("single_site_publish_wrapper_publish_environment_missing");
  if (!input.actor?.actorId || !text(input.actor.actorId)) blockers.push("single_site_publish_wrapper_actor_id_missing");
  if (!input.actor?.actorRole || !text(input.actor.actorRole)) blockers.push("single_site_publish_wrapper_actor_role_missing");
  if (!text(input.correlationId)) blockers.push("single_site_publish_wrapper_correlation_id_missing");
  if (!text(input.idempotencyKey)) blockers.push("single_site_publish_wrapper_idempotency_key_missing");
  return blockers;
}

function expectedMismatchCodes(input: SingleSitePublishWrapperInput, metadata: NormalizedPublishActivationMetadataHandoff): string[] {
  const mismatches: string[] = [];
  if (!sameRef(input.candidateSiteVersionRef, metadata.candidateSiteVersionRef)) mismatches.push("single_site_publish_wrapper_candidate_site_version_ref_mismatch");
  if (!sameRef(input.runtimeArtifactRef, metadata.runtimeArtifactRef)) mismatches.push("single_site_publish_wrapper_runtime_artifact_ref_mismatch");
  if (input.expectedPublishTargetRef && !sameRef(input.expectedPublishTargetRef, metadata.publishTargetRef)) mismatches.push("single_site_publish_wrapper_publish_target_ref_mismatch");
  if (input.expectedLaunchReadinessEvidenceRef && !sameRef(input.expectedLaunchReadinessEvidenceRef, metadata.gateAttemptResultRef?.evidencePackageId)) {
    mismatches.push("single_site_publish_wrapper_launch_readiness_evidence_ref_mismatch");
  }
  if (!refMatchesText(input.expectedPublishActivationRequestRef, [metadata.publishActivationRequestRef.id, metadata.publishActivationRequestRef.ref])) {
    mismatches.push("single_site_publish_wrapper_publish_activation_request_ref_mismatch");
  }
  if (!refMatchesText(input.expectedPublishActivationDecisionRef, [metadata.publishActivationDecisionRef.id, metadata.publishActivationDecisionRef.ref])) {
    mismatches.push("single_site_publish_wrapper_publish_activation_decision_ref_mismatch");
  }
  if (!refMatchesText(input.expectedGateAttemptResultRef, [metadata.gateAttemptResultRef?.gateAttemptId, metadata.gateAttemptResultRef?.gateAttemptRef])) {
    mismatches.push("single_site_publish_wrapper_gate_attempt_result_ref_mismatch");
  }
  if (!refMatchesText(input.expectedHandoffWatermark, [metadata.handoffWatermark])) mismatches.push("single_site_publish_wrapper_handoff_watermark_mismatch");
  if (!refMatchesText(input.expectedGateInputWatermark, [metadata.gateInputWatermark])) mismatches.push("single_site_publish_wrapper_gate_input_watermark_mismatch");
  return uniqueSorted(mismatches);
}

function summarizeContext(metadata: NormalizedPublishActivationMetadataHandoff, input: SingleSitePublishWrapperInput): SingleSitePublishStrictContextSummary {
  const summary = {
    tenantId: metadata.tenantId,
    clientId: metadata.clientId,
    siteId: metadata.siteId,
    migrationId: metadata.migrationId,
    siteVersionId: metadata.candidateSiteVersionRef?.sourceRecordId ?? sourceId(input.candidateSiteVersionRef),
    runtimeArtifactId: metadata.runtimeArtifactRef?.sourceRecordId ?? sourceId(input.runtimeArtifactRef),
    publishTargetId: metadata.publishTargetRef?.sourceRecordId ?? sourceId(input.expectedPublishTargetRef),
    publishStage: metadata.publishStage,
    publishEnvironment: metadata.publishEnvironment,
    publishActivationRequestId: metadata.publishActivationRequestRef.id,
    publishActivationDecisionId: metadata.publishActivationDecisionRef.id,
    gateAttemptId: metadata.gateAttemptResultRef?.gateAttemptId ?? null,
    launchReadinessEvidenceId: metadata.gateAttemptResultRef?.evidencePackageId ?? sourceId(input.expectedLaunchReadinessEvidenceRef),
    metadataWatermark: metadata.metadataWatermark,
    handoffWatermark: metadata.handoffWatermark,
    gateInputWatermark: metadata.gateInputWatermark,
    contextWatermark: null,
  };
  return {
    ...summary,
    contextWatermark: buildSingleSitePublishContextWatermark({
      wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
      tenantId: summary.tenantId,
      clientId: summary.clientId,
      siteId: summary.siteId,
      migrationId: summary.migrationId,
      siteVersionId: summary.siteVersionId,
      runtimeArtifactId: summary.runtimeArtifactId,
      publishTargetId: summary.publishTargetId,
      publishStage: summary.publishStage,
      publishEnvironment: summary.publishEnvironment,
      publishActivationRequestId: summary.publishActivationRequestId,
      publishActivationDecisionId: summary.publishActivationDecisionId,
      gateAttemptId: summary.gateAttemptId,
      launchReadinessEvidenceId: summary.launchReadinessEvidenceId,
      metadataWatermark: summary.metadataWatermark,
      handoffWatermark: summary.handoffWatermark,
      gateInputWatermark: summary.gateInputWatermark,
    }),
  };
}

function completeness(input: {
  normalized: NormalizedPublishActivationMetadataHandoff | null;
  handoffDiagnostics: ReturnType<typeof normalizePublishActivationMetadataHandoff>["diagnostics"];
  expectedMismatches?: string[];
  summary: SingleSitePublishStrictContextSummary;
}): SingleSitePublishWrapperMetadataCompleteness {
  const mismatchCodes = uniqueSorted([...input.handoffDiagnostics.mismatchCodes, ...(input.expectedMismatches ?? [])]);
  const complete = Boolean(input.normalized) && input.handoffDiagnostics.complete && mismatchCodes.length === 0;
  return {
    status: complete ? "complete" : "incomplete",
    complete,
    missingCodes: uniqueSorted(input.handoffDiagnostics.missingCodes),
    mismatchCodes,
    warningCodes: uniqueSorted(input.handoffDiagnostics.warningCodes),
    safeIds: input.summary,
  };
}

function blockedResult(input: {
  status?: Extract<SingleSitePublishWrapperStatus, "preflight_blocked" | "resolver_unavailable">;
  summary: SingleSitePublishStrictContextSummary;
  metadataHandoffCompleteness?: SingleSitePublishWrapperMetadataCompleteness | null;
  resolverResult?: PublishActivationMetadataResolverResult | null;
  resolverDiagnostics?: PublishActivationMetadataResolverDiagnostics | null;
  blockerCodes: string[];
  warnings?: string[];
  dryRun: boolean;
}): SingleSitePublishWrapperResult {
  return {
    wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
    status: input.status ?? "preflight_blocked",
    strictContextSummary: input.summary,
    metadataHandoffCompleteness: input.metadataHandoffCompleteness ?? null,
    resolverDiagnostics: input.resolverDiagnostics ?? input.resolverResult?.diagnostics ?? null,
    resolverResult: input.resolverResult ?? null,
    publishOrchestratorResult: null,
    publishOrchestratorInput: null,
    limitations: null,
    warnings: uniqueSorted(input.warnings ?? []),
    blockerCodes: uniqueSorted(input.blockerCodes),
    dryRun: input.dryRun,
    publishes: false,
    runtimeMutation: false,
    flags: SINGLE_SITE_PUBLISH_WRAPPER_FLAGS,
  };
}

async function defaultPublishApprovedSiteVersion(input: Parameters<SingleSitePublishWrapperPublishApprovedSiteVersion>[0]): ReturnType<SingleSitePublishWrapperPublishApprovedSiteVersion> {
  const mod = await import("../runtime/publish-activation-orchestrator");
  return mod.publishApprovedSiteVersion(input) as ReturnType<SingleSitePublishWrapperPublishApprovedSiteVersion>;
}

export async function prepareSingleSitePublishContext(
  input: SingleSitePublishWrapperInput,
  dependencies: Pick<SingleSitePublishWrapperDependencies, "metadataResolver"> = {},
): Promise<
  | { ok: true; context: SingleSitePublishPreparedContext }
  | { ok: false; result: SingleSitePublishWrapperResult }
> {
  const dryRun = input.dryRun === true;
  const preflightBlockers = requiredPreflightBlockers(input);
  if (preflightBlockers.length > 0) {
    return {
      ok: false,
      result: blockedResult({
        summary: emptySummary(input),
        blockerCodes: preflightBlockers,
        dryRun,
      }),
    };
  }

  const publishStage = text(input.publishStage) as SingleSitePublishWrapperPublishStage;
  const resolverInput = {
    tenantId: text(input.tenantId)!,
    clientId: text(input.clientId)!,
    siteId: text(input.siteId)!,
    migrationId: text(input.migrationId)!,
    candidateSiteVersionRef: input.candidateSiteVersionRef,
    runtimeArtifactRef: input.runtimeArtifactRef,
    publishStage,
    publishEnvironment: text(input.publishEnvironment)!,
    actor: {
      actorType: input.actor.actorType,
      actorId: text(input.actor.actorId)!,
      actorRole: text(input.actor.actorRole)!,
    },
    correlationId: text(input.correlationId)!,
    idempotencyKey: text(input.idempotencyKey)!,
    expectedPublishTargetRef: input.expectedPublishTargetRef ?? null,
    expectedPublishActivationRequestRef: text(input.expectedPublishActivationRequestRef),
    expectedPublishActivationDecisionRef: text(input.expectedPublishActivationDecisionRef),
    expectedGateAttemptResultRef: text(input.expectedGateAttemptResultRef),
    expectedHandoffWatermark: text(input.expectedHandoffWatermark),
    expectedGateInputWatermark: text(input.expectedGateInputWatermark),
    maxGateAgeMs: input.maxGateAgeMs ?? input.policy?.maxGateAgeMs,
    allowWarningsWithLimitations: input.allowWarningsWithLimitations ?? input.policy?.allowWarningsWithLimitations,
    evaluatedAt: input.evaluatedAt ?? null,
    requestId: text(input.requestId),
    repository: input.repository,
  };

  let resolverResult: PublishActivationMetadataResolverResult;
  try {
    const resolver = dependencies.metadataResolver ?? readAndResolveSingleSitePublishActivationMetadataHandoff;
    resolverResult = await resolver(resolverInput);
  } catch (error) {
    return {
      ok: false,
      result: blockedResult({
        status: "resolver_unavailable",
        summary: emptySummary(input),
        blockerCodes: ["single_site_publish_wrapper_resolver_error"],
        warnings: [error instanceof Error ? error.message : String(error)],
        dryRun,
      }),
    };
  }

  if (!resolverResult.diagnostics.complete || !resolverResult.publishActivationMetadataHandoff) {
    const readFailure = resolverResult.diagnostics.blockerCodes.includes("read_failure") || resolverResult.diagnostics.missingCodes.includes("publish_activation_metadata_resolver_read_failure");
    return {
      ok: false,
      result: blockedResult({
        status: readFailure ? "resolver_unavailable" : "preflight_blocked",
        summary: {
          ...emptySummary(input),
          ...resolverResult.diagnostics.safeIds,
          metadataWatermark: resolverResult.metadataWatermark,
          contextWatermark: buildSingleSitePublishContextWatermark({
            wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
            resolverDiagnostics: resolverResult.diagnostics,
            metadataWatermark: resolverResult.metadataWatermark,
          }),
        },
        resolverResult,
        blockerCodes: [
          ...resolverResult.diagnostics.blockerCodes,
          ...resolverResult.diagnostics.missingCodes,
          ...resolverResult.diagnostics.mismatchCodes,
          ...resolverResult.diagnostics.staleCodes,
          "single_site_publish_wrapper_resolver_incomplete",
        ],
        warnings: resolverResult.diagnostics.warningCodes,
        dryRun,
      }),
    };
  }

  const handoff = normalizePublishActivationMetadataHandoff(resolverResult.publishActivationMetadataHandoff as PublishActivationMetadataHandoff, {
    siteId: text(input.siteId)!,
    siteVersionId: sourceId(input.candidateSiteVersionRef)!,
    runtimeArtifactId: sourceId(input.runtimeArtifactRef)!,
    publishStage,
  });
  const normalized = handoff.normalized;
  const summary = normalized ? summarizeContext(normalized, input) : emptySummary(input);
  const expectedMismatches = normalized ? expectedMismatchCodes(input, normalized) : [];
  const metadataHandoffCompleteness = completeness({
    normalized,
    handoffDiagnostics: handoff.diagnostics,
    expectedMismatches,
    summary,
  });

  if (!normalized || !metadataHandoffCompleteness.complete) {
    return {
      ok: false,
      result: blockedResult({
        summary,
        metadataHandoffCompleteness,
        resolverResult,
        blockerCodes: [
          ...metadataHandoffCompleteness.missingCodes,
          ...metadataHandoffCompleteness.mismatchCodes,
          "single_site_publish_wrapper_metadata_handoff_incomplete",
        ],
        warnings: [...resolverResult.diagnostics.warningCodes, ...metadataHandoffCompleteness.warningCodes],
        dryRun,
      }),
    };
  }

  const publishOrchestratorInput: Parameters<SingleSitePublishWrapperPublishApprovedSiteVersion>[0] = {
    siteVersionId: normalized.candidateSiteVersionRef!.sourceRecordId,
    actor: text(input.actor.actorId)!,
    stage: publishStage,
    publishActivationShadowGateEnabled: false,
    publishActivationEnforcementShadowEnabled: true,
    publishActivationMetadataHandoff: normalized,
  };

  return {
    ok: true,
    context: {
      wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
      strictContextSummary: summary,
      publishActivationMetadataHandoff: normalized,
      metadataHandoffCompleteness,
      resolverResult,
      resolverDiagnostics: resolverResult.diagnostics,
      limitations: normalized.limitations ?? null,
      warnings: uniqueSorted([...resolverResult.diagnostics.warningCodes, ...metadataHandoffCompleteness.warningCodes]),
      publishOrchestratorInput,
    },
  };
}

export async function publishSingleSiteApprovedCandidateShadow(
  input: SingleSitePublishWrapperInput,
  dependencies: SingleSitePublishWrapperDependencies = {},
): Promise<SingleSitePublishWrapperResult> {
  const prepared = await prepareSingleSitePublishContext(input, dependencies);
  if (!prepared.ok) return prepared.result;

  if (input.dryRun === true) {
    return {
      wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
      status: "dry_run_ready",
      strictContextSummary: prepared.context.strictContextSummary,
      metadataHandoffCompleteness: prepared.context.metadataHandoffCompleteness,
      resolverDiagnostics: prepared.context.resolverDiagnostics,
      resolverResult: prepared.context.resolverResult,
      publishOrchestratorResult: null,
      publishOrchestratorInput: prepared.context.publishOrchestratorInput,
      limitations: prepared.context.limitations,
      warnings: prepared.context.warnings,
      blockerCodes: [],
      dryRun: true,
      publishes: false,
      runtimeMutation: false,
      flags: SINGLE_SITE_PUBLISH_WRAPPER_FLAGS,
    };
  }

  try {
    const publishApproved = dependencies.publishApprovedSiteVersion ?? defaultPublishApprovedSiteVersion;
    const publishOrchestratorResult = await publishApproved(prepared.context.publishOrchestratorInput);
    return {
      wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
      status: "published_via_existing_orchestrator",
      strictContextSummary: prepared.context.strictContextSummary,
      metadataHandoffCompleteness: prepared.context.metadataHandoffCompleteness,
      resolverDiagnostics: prepared.context.resolverDiagnostics,
      resolverResult: prepared.context.resolverResult,
      publishOrchestratorResult,
      publishOrchestratorInput: prepared.context.publishOrchestratorInput,
      limitations: prepared.context.limitations,
      warnings: prepared.context.warnings,
      blockerCodes: [],
      dryRun: false,
      publishes: true,
      runtimeMutation: true,
      flags: SINGLE_SITE_PUBLISH_WRAPPER_FLAGS,
    };
  } catch (error) {
    return {
      wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
      status: "orchestrator_failed",
      strictContextSummary: prepared.context.strictContextSummary,
      metadataHandoffCompleteness: prepared.context.metadataHandoffCompleteness,
      resolverDiagnostics: prepared.context.resolverDiagnostics,
      resolverResult: prepared.context.resolverResult,
      publishOrchestratorResult: null,
      publishOrchestratorInput: prepared.context.publishOrchestratorInput,
      limitations: prepared.context.limitations,
      warnings: uniqueSorted([...prepared.context.warnings, error instanceof Error ? error.message : String(error)]),
      blockerCodes: ["single_site_publish_wrapper_orchestrator_failed"],
      dryRun: false,
      publishes: false,
      runtimeMutation: false,
      flags: SINGLE_SITE_PUBLISH_WRAPPER_FLAGS,
    };
  }
}
