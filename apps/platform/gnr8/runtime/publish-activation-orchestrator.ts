import { randomUUID } from "node:crypto";

import { buildDeterministicArtifactBundle } from "@/gnr8/runtime/artifact-builder";
import {
  isPublishActivationShadowGateEnabled,
  observePublishActivationShadowGate,
  type PublishActivationShadowObserverInput,
  type PublishActivationShadowResult,
} from "@/gnr8/aaf/aaf-publish-activation-shadow-observer";
import {
  readAndEvaluatePublishActivationEnforcementGuard,
  type PublishActivationEnforcementGuardActor,
  type PublishActivationEnforcementGuardPolicy,
  type PublishActivationEnforcementGuardReadRepositoryLike,
  type PublishActivationEnforcementGuardRef,
  type PublishActivationEnforcementGuardResult,
  type PublishActivationPersistedGateResultRef,
} from "@/gnr8/single-site/publish-activation-enforcement-guard";
import {
  normalizePublishActivationMetadataHandoff,
  type NormalizedPublishActivationMetadataHandoff,
  type PublishActivationMetadataHandoff,
} from "@/gnr8/single-site/publish-activation-metadata-handoff";
import {
  readAndResolveSingleSitePublishActivationMetadataHandoff,
  type PublishActivationMetadataResolverActor,
  type PublishActivationMetadataResolverReadRepositoryLike,
  type PublishActivationMetadataResolverResult,
} from "@/gnr8/single-site/publish-activation-metadata-resolver";
import {
  evaluatePointerSwitchReadiness,
  evaluatePublishActivationCandidate,
  type PublishActivationFailureCode,
} from "@/gnr8/runtime/publish-activation-guard";
import { evaluatePublishEnforcement } from "@/gnr8/runtime/publish-enforcement";
import { assertPublishSafety } from "@/gnr8/runtime/publish-safety-check";
import { runRenderIntegrityGate } from "@/gnr8/runtime/render-integrity-gate";
import {
  archivePublishedVersionsExcept,
  bindArtifactToVersion,
  createArtifact,
  getActivePointerForSite,
  getArtifactById,
  getOwnershipSiteSummary,
  getRuntimeSiteVersionOwnershipSnapshot,
  recordPublishActivationAudit,
  getSiteVersion,
  refreshArtifactForVersionPublishCandidate,
  switchActivePointer,
  type RuntimeStoreDbClient,
} from "@/gnr8/runtime/runtime-store";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";

function throwPublishActivationFailure(code: PublishActivationFailureCode, message: string, details?: Record<string, unknown>): never {
  throw new Error(`${code}:${JSON.stringify({ message, details: details ?? {} })}`);
}

export type PublishActivationShadowScope = {
  tenantId: string;
  clientId?: string | null;
  actorRole?: string | null;
};

export type PublishActivationShadowObserver = (input: PublishActivationShadowObserverInput) => Promise<PublishActivationShadowResult>;

export type PublishActivationEnforcementShadowMetadata = PublishActivationMetadataHandoff & {
  tenantId?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  migrationId?: string | null;
  candidateSiteVersionRef?: PublishActivationEnforcementGuardRef | string | null;
  runtimeArtifactRef?: PublishActivationEnforcementGuardRef | string | null;
  publishTargetRef?: PublishActivationEnforcementGuardRef | string | null;
  publishStage?: string | null;
  publishEnvironment?: string | null;
  publishActivationRequestRef?: {
    id?: string | null;
    ref?: string | null;
    status?: string | null;
  } | null;
  publishActivationDecisionRef?: {
    id?: string | null;
    ref?: string | null;
    status?: string | null;
  } | null;
  gateAttemptResultRef?: PublishActivationPersistedGateResultRef | null;
  handoffWatermark?: string | null;
  gateInputWatermark?: string | null;
  actorType?: PublishActivationEnforcementGuardActor["actorType"];
  actorRole?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  policy?: PublishActivationEnforcementGuardPolicy;
  repository?: PublishActivationEnforcementGuardReadRepositoryLike;
};

export type PublishActivationEnforcementShadowGuard = typeof readAndEvaluatePublishActivationEnforcementGuard;

export type PublishActivationMetadataResolverShadowInput = {
  tenantId?: string | null;
  clientId?: string | null;
  migrationId?: string | null;
  publishEnvironment?: string | null;
  actorRole?: string | null;
  actorType?: PublishActivationMetadataResolverActor["actorType"];
  correlationId?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  expectedPublishTargetRef?: PublishActivationEnforcementGuardRef | string | null;
  expectedPublishActivationRequestRef?: string | null;
  expectedPublishActivationDecisionRef?: string | null;
  expectedGateAttemptResultRef?: string | null;
  expectedHandoffWatermark?: string | null;
  expectedGateInputWatermark?: string | null;
  maxGateAgeMs?: number | null;
  allowWarningsWithLimitations?: boolean;
  evaluatedAt?: string | Date | null;
  repository?: PublishActivationMetadataResolverReadRepositoryLike;
};

export type PublishActivationMetadataResolverShadow = typeof readAndResolveSingleSitePublishActivationMetadataHandoff;

export type PublishActivationEnforcementShadowObservation = {
  enabled: true;
  available: boolean;
  shadowOnly: true;
  enforcementApplied: false;
  publishActionBlocked: false;
  metadataSource: "explicit" | "resolved" | "missing" | "incomplete" | "resolver_error";
  resolverStatus: "not_needed" | "not_available" | "complete" | "incomplete" | "error";
  resolverReason: string | null;
  guardMode: PublishActivationEnforcementGuardResult["mode"] | "unavailable" | "error";
  guardAllowed: boolean | null;
  guardReason: string;
  blockerCodes: string[];
  missingMetadataCodes: string[];
  matchedRefsCount: number;
  safeIds: {
    siteId: string;
    siteVersionId: string;
    runtimeArtifactId: string;
    publishTargetId: string | null;
    gateAttemptId: string | null;
    publishActivationDecisionId: string | null;
  };
  correlationId: string | null;
  idempotencyKey: string | null;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function publishActivationShadowGateEnabled(override?: boolean): boolean {
  return override === true || (override !== false && isPublishActivationShadowGateEnabled());
}

function flagEnabled(value: string | undefined): boolean {
  return ["1", "true", "enabled", "on", "shadow"].includes(String(value ?? "").trim().toLowerCase());
}

export function isPublishActivationEnforcementGateShadowEnabled(): boolean {
  return flagEnabled(process.env.GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW);
}

function publishActivationEnforcementShadowEnabled(override?: boolean): boolean {
  return override === true || (override !== false && isPublishActivationEnforcementGateShadowEnabled());
}

function matchedRefsCount(result: PublishActivationEnforcementGuardResult): number {
  return Object.values(result.matchedRefs).filter((value) => text(value)).length;
}

function refId(ref: PublishActivationEnforcementGuardRef | string | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") {
    const normalized = text(ref);
    if (!normalized) return null;
    return text(normalized.split(":").at(-1)) ?? normalized;
  }
  return text(ref.sourceRecordId);
}

function gateAttemptRefId(ref: PublishActivationPersistedGateResultRef | string | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") return refId(ref);
  return text(ref.gateAttemptId) ?? refId(ref.gateAttemptRef);
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function unavailableEnforcementShadowObservation(input: {
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  publishTargetId: string | null;
  gateAttemptId: string | null;
  publishActivationDecisionId: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  reason: string;
  blockerCodes: string[];
  missingMetadataCodes?: string[];
  metadataSource?: PublishActivationEnforcementShadowObservation["metadataSource"];
  resolverStatus?: PublishActivationEnforcementShadowObservation["resolverStatus"];
  resolverReason?: string | null;
  guardMode?: PublishActivationEnforcementShadowObservation["guardMode"];
}): PublishActivationEnforcementShadowObservation {
  return {
    enabled: true,
    available: false,
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    metadataSource: input.metadataSource ?? "missing",
    resolverStatus: input.resolverStatus ?? "not_available",
    resolverReason: input.resolverReason ?? null,
    guardMode: input.guardMode ?? "unavailable",
    guardAllowed: null,
    guardReason: input.reason,
    blockerCodes: input.blockerCodes,
    missingMetadataCodes: input.missingMetadataCodes ?? input.blockerCodes,
    matchedRefsCount: 0,
    safeIds: {
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      publishTargetId: input.publishTargetId,
      gateAttemptId: input.gateAttemptId,
      publishActivationDecisionId: input.publishActivationDecisionId,
    },
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

function enforcementShadowDiagnosticLog(
  message: string,
  observation: PublishActivationEnforcementShadowObservation,
  extra?: Record<string, unknown>,
): void {
  console.info(message, {
    shadowEnabled: true,
    shadowAvailable: observation.available,
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    metadataSource: observation.metadataSource,
    resolverStatus: observation.resolverStatus,
    resolverReason: observation.resolverReason,
    guardMode: observation.guardMode,
    guardReason: observation.guardReason,
    blockerCodes: observation.blockerCodes,
    missingMetadataCodes: observation.missingMetadataCodes,
    matchedRefsCount: observation.matchedRefsCount,
    safeIds: observation.safeIds,
    correlationId: observation.correlationId,
    idempotencyKey: observation.idempotencyKey,
    ...extra,
  });
}

function resolverIdentityMissingCodes(input: {
  tenantId: unknown;
  clientId: unknown;
  migrationId: unknown;
  publishEnvironment: unknown;
  actorRole: unknown;
  correlationId: unknown;
  idempotencyKey: unknown;
}): string[] {
  const required = {
    tenant_id: input.tenantId,
    client_id: input.clientId,
    migration_id: input.migrationId,
    publish_environment: input.publishEnvironment,
    actor_role: input.actorRole,
    correlation_id: input.correlationId,
    idempotency_key: input.idempotencyKey,
  };
  return Object.entries(required)
    .filter(([, value]) => !text(value))
    .map(([field]) => `publish_activation_metadata_resolver_shadow_${field}_missing`);
}

function buildMetadataResolverShadowInput(input: {
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  actor: string;
  publishStage: "shadow" | "canary" | "production";
  metadata: NormalizedPublishActivationMetadataHandoff | null;
  resolverInput?: PublishActivationMetadataResolverShadowInput | null;
}):
  | {
      ok: true;
      value: Parameters<PublishActivationMetadataResolverShadow>[0];
    }
  | {
      ok: false;
      missingCodes: string[];
    } {
  const resolverInput = input.resolverInput ?? null;
  const tenantId = text(resolverInput?.tenantId) ?? input.metadata?.tenantId ?? null;
  const clientId = text(resolverInput?.clientId) ?? input.metadata?.clientId ?? null;
  const migrationId = text(resolverInput?.migrationId) ?? input.metadata?.migrationId ?? null;
  const publishEnvironment = text(resolverInput?.publishEnvironment) ?? input.metadata?.publishEnvironment ?? null;
  const actorRole = text(resolverInput?.actorRole) ?? input.metadata?.actorRole ?? null;
  const correlationId = text(resolverInput?.correlationId) ?? text(input.metadata?.correlationId);
  const idempotencyKey = text(resolverInput?.idempotencyKey) ?? text(input.metadata?.idempotencyKey);
  const missingCodes = resolverIdentityMissingCodes({
    tenantId,
    clientId,
    migrationId,
    publishEnvironment,
    actorRole,
    correlationId,
    idempotencyKey,
  });
  if (missingCodes.length > 0) return { ok: false, missingCodes };

  const expectedGateAttemptResultRef =
    text(resolverInput?.expectedGateAttemptResultRef) ??
    gateAttemptRefId(input.metadata?.gateAttemptResultRef) ??
    null;

  return {
    ok: true,
    value: {
      tenantId: tenantId!,
      clientId: clientId!,
      siteId: input.siteId,
      migrationId: migrationId!,
      candidateSiteVersionRef: input.metadata?.candidateSiteVersionRef ?? `runtime-site-version:${input.siteVersionId}`,
      runtimeArtifactRef: input.metadata?.runtimeArtifactRef ?? `runtime-artifact:${input.runtimeArtifactId}`,
      publishStage: input.publishStage,
      publishEnvironment: publishEnvironment!,
      actor: {
        actorType: resolverInput?.actorType ?? input.metadata?.actorType ?? "human",
        actorId: input.actor,
        actorRole: actorRole!,
      },
      correlationId: correlationId!,
      idempotencyKey: idempotencyKey!,
      expectedPublishTargetRef: resolverInput?.expectedPublishTargetRef ?? input.metadata?.publishTargetRef ?? null,
      expectedPublishActivationRequestRef:
        text(resolverInput?.expectedPublishActivationRequestRef) ??
        input.metadata?.publishActivationRequestRef.id ??
        input.metadata?.publishActivationRequestRef.ref ??
        null,
      expectedPublishActivationDecisionRef:
        text(resolverInput?.expectedPublishActivationDecisionRef) ??
        input.metadata?.publishActivationDecisionRef.id ??
        input.metadata?.publishActivationDecisionRef.ref ??
        null,
      expectedGateAttemptResultRef,
      expectedHandoffWatermark: text(resolverInput?.expectedHandoffWatermark) ?? input.metadata?.handoffWatermark ?? null,
      expectedGateInputWatermark: text(resolverInput?.expectedGateInputWatermark) ?? input.metadata?.gateInputWatermark ?? null,
      maxGateAgeMs: resolverInput?.maxGateAgeMs ?? input.metadata?.policy?.maxGateAgeMs,
      allowWarningsWithLimitations: resolverInput?.allowWarningsWithLimitations ?? input.metadata?.policy?.allowWarningsWithLimitations,
      evaluatedAt: resolverInput?.evaluatedAt ?? null,
      requestId: text(resolverInput?.requestId) ?? input.metadata?.requestId ?? null,
      repository: resolverInput?.repository,
    },
  };
}

async function resolvePublishActivationShadowScope(input: {
  siteVersionId: string;
  providedScope?: PublishActivationShadowScope | null;
  dbClient?: RuntimeStoreDbClient;
}): Promise<PublishActivationShadowScope | null> {
  const providedTenantId = text(input.providedScope?.tenantId);
  if (providedTenantId && input.providedScope?.clientId !== undefined) {
    return {
      tenantId: providedTenantId,
      clientId: text(input.providedScope.clientId),
      actorRole: text(input.providedScope.actorRole),
    };
  }

  const ownership = await getRuntimeSiteVersionOwnershipSnapshot(input.siteVersionId, { dbClient: input.dbClient });
  const ownershipSite = ownership?.ownershipSiteId
    ? await getOwnershipSiteSummary(ownership.ownershipSiteId, { dbClient: input.dbClient })
    : null;
  const tenantId = providedTenantId ?? text(ownershipSite?.agencyId);
  if (!tenantId) return null;
  return {
    tenantId,
    clientId: input.providedScope?.clientId === undefined ? text(ownershipSite?.orgId) : text(input.providedScope.clientId),
    actorRole: text(input.providedScope?.actorRole),
  };
}

export async function runPublishActivationEnforcementShadowObservation(input: {
  enabled?: boolean;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  actor: string;
  publishStage: "shadow" | "canary" | "production";
  metadata?: PublishActivationEnforcementShadowMetadata | null;
  metadataResolverInput?: PublishActivationMetadataResolverShadowInput | null;
  metadataResolver?: PublishActivationMetadataResolverShadow;
  guard?: PublishActivationEnforcementShadowGuard;
}): Promise<PublishActivationEnforcementShadowObservation | null> {
  if (!publishActivationEnforcementShadowEnabled(input.enabled)) return null;

  const metadata = input.metadata ?? null;
  const handoff = normalizePublishActivationMetadataHandoff(metadata, {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    runtimeArtifactId: input.runtimeArtifactId,
    publishStage: input.publishStage,
  });
  const normalized = handoff.normalized;
  const publishTargetId = handoff.diagnostics.safeIds.publishTargetId;
  const gateAttemptId = handoff.diagnostics.safeIds.gateAttemptId;
  const publishActivationDecisionId = handoff.diagnostics.safeIds.publishActivationDecisionId;
  const correlationId = normalized?.correlationId ?? text(metadata?.correlationId);
  const idempotencyKey = normalized?.idempotencyKey ?? text(metadata?.idempotencyKey);
  const blockerCodes = [
    ...handoff.diagnostics.missingCodes,
    ...handoff.diagnostics.mismatchCodes,
  ];

  let effectiveHandoff = handoff;
  let effectiveNormalized = normalized;
  let metadataSource: PublishActivationEnforcementShadowObservation["metadataSource"] = handoff.diagnostics.complete ? "explicit" : metadata ? "incomplete" : "missing";
  let resolverStatus: PublishActivationEnforcementShadowObservation["resolverStatus"] = handoff.diagnostics.complete ? "not_needed" : "not_available";
  let resolverReason: string | null = handoff.diagnostics.complete ? null : "publish activation metadata resolver shadow identity unavailable";
  let resolverResult: PublishActivationMetadataResolverResult | null = null;

  if (!handoff.diagnostics.complete) {
    const resolverSeedMetadata = normalized && metadata
      ? {
          ...normalized,
          actorRole: text(metadata.actorRole) ?? "",
          correlationId: text(metadata.correlationId) ?? "",
          idempotencyKey: text(metadata.idempotencyKey) ?? "",
        }
      : normalized;
    const resolverShadowInput = buildMetadataResolverShadowInput({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      actor: input.actor,
      publishStage: input.publishStage,
      metadata: resolverSeedMetadata,
      resolverInput: input.metadataResolverInput ?? null,
    });

    if (!resolverShadowInput.ok) {
      const observation = unavailableEnforcementShadowObservation({
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        runtimeArtifactId: input.runtimeArtifactId,
        publishTargetId,
        gateAttemptId,
        publishActivationDecisionId,
        correlationId,
        idempotencyKey,
        reason: "publish activation enforcement shadow metadata unavailable",
        blockerCodes: uniqueSorted([...blockerCodes, ...resolverShadowInput.missingCodes]),
        missingMetadataCodes: uniqueSorted([...handoff.diagnostics.missingCodes, ...resolverShadowInput.missingCodes]),
        metadataSource,
        resolverStatus,
        resolverReason,
      });
      enforcementShadowDiagnosticLog("[gnr8.single-site.mvp50] publish activation metadata resolver shadow unavailable", observation, {
        metadataHandoffStatus: handoff.diagnostics.status,
        metadataWarningCodes: handoff.diagnostics.warningCodes,
      });
      return observation;
    }

    try {
      const resolver = input.metadataResolver ?? readAndResolveSingleSitePublishActivationMetadataHandoff;
      resolverResult = await resolver(resolverShadowInput.value);
      resolverStatus = resolverResult.diagnostics.complete ? "complete" : "incomplete";
      resolverReason = resolverResult.diagnostics.complete
        ? "publish activation metadata resolved"
        : "publish activation metadata resolver returned incomplete diagnostics";
      if (resolverResult.publishActivationMetadataHandoff && resolverResult.diagnostics.complete) {
        effectiveHandoff = normalizePublishActivationMetadataHandoff(resolverResult.publishActivationMetadataHandoff, {
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          runtimeArtifactId: input.runtimeArtifactId,
          publishStage: input.publishStage,
        });
        effectiveNormalized = effectiveHandoff.normalized;
        metadataSource = effectiveHandoff.diagnostics.complete ? "resolved" : "incomplete";
      }
    } catch (error) {
      const observation = unavailableEnforcementShadowObservation({
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        runtimeArtifactId: input.runtimeArtifactId,
        publishTargetId,
        gateAttemptId,
        publishActivationDecisionId,
        correlationId,
        idempotencyKey,
        reason: "publish activation metadata resolver shadow error",
        blockerCodes: uniqueSorted([...blockerCodes, "publish_activation_metadata_resolver_shadow_error"]),
        missingMetadataCodes: handoff.diagnostics.missingCodes,
        metadataSource: "resolver_error",
        resolverStatus: "error",
        resolverReason: error instanceof Error ? error.message : String(error),
      });
      enforcementShadowDiagnosticLog("[gnr8.single-site.mvp50] publish activation metadata resolver shadow failed open", observation);
      return observation;
    }
  }

  const effectivePublishTargetId = effectiveHandoff.diagnostics.safeIds.publishTargetId;
  const effectiveGateAttemptId = effectiveHandoff.diagnostics.safeIds.gateAttemptId;
  const effectivePublishActivationDecisionId = effectiveHandoff.diagnostics.safeIds.publishActivationDecisionId;
  const effectiveCorrelationId = effectiveNormalized?.correlationId ?? correlationId;
  const effectiveIdempotencyKey = effectiveNormalized?.idempotencyKey ?? idempotencyKey;
  const effectiveBlockerCodes = uniqueSorted([
    ...effectiveHandoff.diagnostics.missingCodes,
    ...effectiveHandoff.diagnostics.mismatchCodes,
    ...(resolverResult?.diagnostics.blockerCodes ?? []),
    ...(resolverResult?.diagnostics.staleCodes ?? []),
  ]);

  if (!effectiveHandoff.diagnostics.complete || !effectiveNormalized?.gateAttemptResultRef || !effectiveNormalized.publishTargetRef || !effectiveNormalized.candidateSiteVersionRef || !effectiveNormalized.runtimeArtifactRef) {
    const observation = unavailableEnforcementShadowObservation({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      publishTargetId: effectivePublishTargetId,
      gateAttemptId: effectiveGateAttemptId,
      publishActivationDecisionId: effectivePublishActivationDecisionId,
      correlationId: effectiveCorrelationId,
      idempotencyKey: effectiveIdempotencyKey,
      reason: "publish activation enforcement shadow metadata unavailable",
      blockerCodes: effectiveBlockerCodes,
      missingMetadataCodes: uniqueSorted([
        ...effectiveHandoff.diagnostics.missingCodes,
        ...(resolverResult?.diagnostics.missingCodes ?? []),
        ...(resolverResult?.diagnostics.mismatchCodes ?? []),
      ]),
      metadataSource,
      resolverStatus,
      resolverReason,
    });
    enforcementShadowDiagnosticLog("[gnr8.single-site.mvp50] publish activation enforcement metadata unavailable", observation, {
      metadataHandoffStatus: effectiveHandoff.diagnostics.status,
      metadataWarningCodes: effectiveHandoff.diagnostics.warningCodes,
      resolverBlockerCodes: resolverResult?.diagnostics.blockerCodes ?? [],
      resolverMissingCodes: resolverResult?.diagnostics.missingCodes ?? [],
      resolverMismatchCodes: resolverResult?.diagnostics.mismatchCodes ?? [],
      resolverStaleCodes: resolverResult?.diagnostics.staleCodes ?? [],
    });
    return observation;
  }

  try {
    const guard = input.guard ?? readAndEvaluatePublishActivationEnforcementGuard;
    const result = await guard({
      tenantId: effectiveNormalized.tenantId!,
      clientId: effectiveNormalized.clientId!,
      siteId: input.siteId,
      migrationId: effectiveNormalized.migrationId!,
      candidateSiteVersionRef: effectiveNormalized.candidateSiteVersionRef,
      runtimeArtifactRef: effectiveNormalized.runtimeArtifactRef,
      publishTargetRef: effectiveNormalized.publishTargetRef,
      publishStage: input.publishStage,
      publishEnvironment: effectiveNormalized.publishEnvironment!,
      publishActivationDecisionRef: {
        id: effectivePublishActivationDecisionId,
        ref: effectiveNormalized.publishActivationDecisionRef.ref,
        status: effectiveNormalized.publishActivationDecisionRef.status,
      },
      gateAttemptResultRef: effectiveNormalized.gateAttemptResultRef,
      handoffWatermark: effectiveNormalized.handoffWatermark!,
      gateInputWatermark: effectiveNormalized.gateInputWatermark!,
      actor: {
        actorType: effectiveNormalized.actorType,
        actorId: input.actor,
        actorRole: effectiveNormalized.actorRole,
      },
      correlationId: effectiveNormalized.correlationId,
      idempotencyKey: effectiveNormalized.idempotencyKey,
      requestId: effectiveNormalized.requestId,
      policy: effectiveNormalized.policy,
      repository: effectiveNormalized.repository,
    });
    const observation: PublishActivationEnforcementShadowObservation = {
      enabled: true,
      available: true,
      shadowOnly: true,
      enforcementApplied: false,
      publishActionBlocked: false,
      metadataSource,
      resolverStatus,
      resolverReason,
      guardMode: result.mode,
      guardAllowed: result.allowed,
      guardReason: result.reason,
      blockerCodes: result.blockerCodes,
      missingMetadataCodes: [],
      matchedRefsCount: matchedRefsCount(result),
      safeIds: {
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        runtimeArtifactId: input.runtimeArtifactId,
        publishTargetId: result.matchedRefs.publishTargetId ?? effectivePublishTargetId,
        gateAttemptId: result.matchedRefs.gateAttemptId ?? effectiveGateAttemptId,
        publishActivationDecisionId: result.matchedRefs.publishActivationDecisionId ?? effectivePublishActivationDecisionId,
      },
      correlationId: result.diagnosticRefs.correlationId ?? effectiveCorrelationId,
      idempotencyKey: result.diagnosticRefs.idempotencyKey ?? effectiveIdempotencyKey,
    };
    enforcementShadowDiagnosticLog("[gnr8.single-site.mvp50] publish activation enforcement metadata observed", observation, {
      guardAllowed: result.allowed,
      guardWouldBlockIfWired: result.flags.publishActionBlockedWouldBlockIfWired,
      metadataHandoffWatermark: effectiveNormalized.metadataWatermark,
      metadataWarningCodes: effectiveHandoff.diagnostics.warningCodes,
    });
    return observation;
  } catch (error) {
    const observation = unavailableEnforcementShadowObservation({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      publishTargetId: effectivePublishTargetId,
      gateAttemptId: effectiveGateAttemptId,
      publishActivationDecisionId: effectivePublishActivationDecisionId,
      correlationId: effectiveCorrelationId,
      idempotencyKey: effectiveIdempotencyKey,
      reason: "publish activation enforcement shadow guard error",
      blockerCodes: ["publish_activation_enforcement_shadow_guard_error"],
      metadataSource,
      resolverStatus,
      resolverReason,
      guardMode: "error",
    });
    enforcementShadowDiagnosticLog("[gnr8.single-site.mvp50] publish activation enforcement metadata guard failed open", observation, {
      error: error instanceof Error ? error.message : String(error),
    });
    return observation;
  }
}

export async function runPublishActivationShadowGateObservation(input: {
  enabled?: boolean;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  actor: string;
  publishStage: "shadow" | "canary" | "production";
  scope?: PublishActivationShadowScope | null;
  dbClient?: RuntimeStoreDbClient;
  observer?: PublishActivationShadowObserver;
}): Promise<PublishActivationShadowResult | null> {
  if (!publishActivationShadowGateEnabled(input.enabled)) return null;

  try {
    const scope = await resolvePublishActivationShadowScope({
      siteVersionId: input.siteVersionId,
      providedScope: input.scope ?? null,
      dbClient: input.dbClient,
    });
    if (!scope) {
      console.info("[gnr8.aaf.pasr2] publish activation shadow gate unavailable", {
        shadowOnly: true,
        enforcementApplied: false,
        publishActionBlocked: false,
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        runtimeArtifactId: input.runtimeArtifactId,
        failureReason: "missing_publish_activation_shadow_scope",
      });
      return null;
    }

    const shadowEvaluationId = randomUUID();
    const observer = input.observer ?? observePublishActivationShadowGate;
    const result = await observer({
      tenantId: scope.tenantId,
      clientId: scope.clientId ?? null,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      intendedPublishTarget: "production",
      trustedPublishEnvironment: "production",
      intendedPublishStage: input.publishStage,
      contentOverrideStateRequired: false,
      launchSignoffRequiredByPolicy: false,
      actorType: "human",
      actorId: input.actor,
      actorRole: scope.actorRole ?? "agency_admin",
      correlationId: `pasr-2-shadow:${shadowEvaluationId}`,
      idempotencyKey: `pasr-2-shadow:${shadowEvaluationId}`,
      policyVersion: "PASR-2-shadow",
    });
    console.info("[gnr8.aaf.pasr2] publish activation shadow gate observed", {
      shadowOnly: result.shadowOnly,
      enforcementApplied: result.enforcementApplied,
      publishActionBlocked: result.publishActionBlocked,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      readinessResult: result.readinessResult,
      missingSourceTruth: result.missingSourceTruth,
      staleSourceTruth: result.staleSourceTruth,
      ddomReadinessSnapshotStatus: result.ddomReadinessSnapshotStatus.status,
      gateResult: result.gateDryRunStatus.gateResult,
      correlationId: result.correlationId,
      shadowEvaluationId: result.shadowEvaluationId,
      failureReason: result.failureReason,
    });
    return result;
  } catch (error) {
    console.info("[gnr8.aaf.pasr2] publish activation shadow gate failed open", {
      shadowOnly: true,
      enforcementApplied: false,
      publishActionBlocked: false,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function executeMigrationPublishActivation(input: {
  candidateRef: string;
  candidateState: string;
  shadowEligibilityState: string;
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  expectedRendererCompatibilityVersion: string;
  expectedPublishStage: "shadow" | "canary" | "production";
  actor: string;
  dbClient?: RuntimeStoreDbClient;
}) {
  const dbOptions = { dbClient: input.dbClient };
  const storedArtifact = await getArtifactById(input.artifactId, dbOptions);
  const candidateValidation = evaluatePublishActivationCandidate({
    candidateRef: input.candidateRef,
    candidateState: input.candidateState,
    shadowEligibilityState: input.shadowEligibilityState,
    artifactId: input.artifactId,
    siteVersionId: input.siteVersionId,
    expectedSiteId: input.siteId,
    expectedSiteVersionId: input.siteVersionId,
    expectedArtifactId: input.artifactId,
    expectedRendererCompatibilityVersion: input.expectedRendererCompatibilityVersion,
    expectedPublishStage: input.expectedPublishStage,
    artifact: storedArtifact,
  });
  if (!candidateValidation.ok) {
    throwPublishActivationFailure(candidateValidation.code, candidateValidation.message, candidateValidation.details);
  }
  if (!storedArtifact) {
    throwPublishActivationFailure("PUBLISH_ARTIFACT_READ_FAILED", "Publish artifact could not be loaded for activation.", {
      artifactId: input.artifactId,
      siteVersionId: input.siteVersionId,
    });
  }

  const activePointer = await getActivePointerForSite(input.siteId, dbOptions);
  const pointerReadiness = evaluatePointerSwitchReadiness({
    targetSiteVersionId: input.siteVersionId,
    targetArtifactId: input.artifactId,
    activePointer,
  });

  if (pointerReadiness.ok && "code" in pointerReadiness) {
    const noopPointer = activePointer;
    await recordPublishActivationAudit({
      siteVersionId: input.siteVersionId,
      actor: input.actor,
      source: "migration",
      details: {
        candidateRef: input.candidateRef,
        artifactId: input.artifactId,
        activationOutcome: "SAFE_NOOP",
        switched: false,
        previousActivePointer: noopPointer,
        newActivePointer: noopPointer,
      },
      dbClient: input.dbClient,
    });
    return {
      switched: false,
      previousActivePointer: noopPointer,
      newActivePointer: noopPointer,
      activationOutcome: "SAFE_NOOP" as const,
    };
  }

  let pointerSwitchResult: { switched: boolean; previousActivePointer: { siteVersionId: string; artifactId: string } | null };
  try {
    pointerSwitchResult = await switchActivePointer({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      artifactId: input.artifactId,
      dbClient: input.dbClient,
    });
  } catch (error) {
    throwPublishActivationFailure("PUBLISH_POINTER_SWITCH_FAILED", "active pointer switch failed", {
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      artifactId: input.artifactId,
      error: String((error as Error)?.message ?? error),
    });
  }

  const activePointerAfterSwitch = await getActivePointerForSite(input.siteId, dbOptions);
  assertPublishSafety({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    artifactId: input.artifactId,
    rendererCompatibilityVersion: input.expectedRendererCompatibilityVersion,
    artifact: storedArtifact,
    activePointer: activePointerAfterSwitch,
  });

  await recordPublishActivationAudit({
    siteVersionId: input.siteVersionId,
    actor: input.actor,
    source: "migration",
    details: {
      candidateRef: input.candidateRef,
      artifactId: input.artifactId,
      activationOutcome: "ACTIVATED",
      switched: pointerSwitchResult.switched,
      previousActivePointer: pointerSwitchResult.previousActivePointer,
      newActivePointer: activePointerAfterSwitch,
    },
    dbClient: input.dbClient,
  });

  return {
    switched: pointerSwitchResult.switched,
    previousActivePointer: pointerSwitchResult.previousActivePointer,
    newActivePointer: activePointerAfterSwitch,
    activationOutcome: "ACTIVATED" as const,
  };
}

export async function publishApprovedSiteVersion(input: {
  siteVersionId: string;
  actor: string;
  stage?: "shadow" | "canary" | "production";
  dbClient?: RuntimeStoreDbClient;
  publishActivationShadowGateEnabled?: boolean;
  publishActivationShadowScope?: PublishActivationShadowScope | null;
  publishActivationShadowObserver?: PublishActivationShadowObserver;
  publishActivationEnforcementShadowEnabled?: boolean;
  publishActivationMetadataHandoff?: PublishActivationMetadataHandoff | null;
  publishActivationEnforcementShadowMetadata?: PublishActivationEnforcementShadowMetadata | null;
  publishActivationMetadataResolverShadowInput?: PublishActivationMetadataResolverShadowInput | null;
  publishActivationMetadataResolverShadow?: PublishActivationMetadataResolverShadow;
  publishActivationEnforcementShadowGuard?: PublishActivationEnforcementShadowGuard;
}) {
  const dbOptions = { dbClient: input.dbClient };
  const siteVersion = await getSiteVersion(input.siteVersionId, dbOptions);
  if (!siteVersion) throw new Error("SiteVersion not found");
  if (siteVersion.state !== "APPROVED" && siteVersion.state !== "PUBLISHED") {
    throw new Error(`SiteVersion must be APPROVED before publish (current: ${siteVersion.state})`);
  }
  const publishStage = input.stage ?? "production";

  if (siteVersion.state === "PUBLISHED") {
    if (!siteVersion.artifactId) {
      throwPublishActivationFailure("PUBLISH_ARTIFACT_PAYLOAD_INVALID", "Published siteVersion is missing artifact binding.", {
        siteVersionId: siteVersion.id,
      });
    }

    let storedArtifact = await getArtifactById(siteVersion.artifactId, dbOptions);
    const resolvedPublishStage = input.stage ?? storedArtifact?.publishStage ?? "production";
    if (input.stage && storedArtifact) {
      const enforcement = evaluatePublishEnforcement({
        siteVersion,
        stage: resolvedPublishStage,
      });
      if (enforcement.adapter.decision === "DENY") {
        throw new Error(`publish_enforcement_denied:${JSON.stringify(enforcement.adapter)}`);
      }
      if (enforcement.adapter.decision === "REVIEW_ONLY" && resolvedPublishStage !== "shadow") {
        throw new Error(`publish_enforcement_review_only_shadow_required:${JSON.stringify(enforcement.adapter)}`);
      }

      const artifactBundle = buildDeterministicArtifactBundle({
        siteVersion,
        renderMode: "PUBLISH",
      });
      const integrity = runRenderIntegrityGate({
        siteVersion,
        htmlByPath: artifactBundle.htmlByPath,
        assetFingerprintMap: artifactBundle.assetFingerprintMap,
      });
      if (!integrity.ok) {
        const msg = integrity.issues.map((issue) => `${issue.code}:${issue.message}`).join("; ");
        throw new Error(`render-integrity-gate failed: ${msg}`);
      }

      await refreshArtifactForVersionPublishCandidate({
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        artifactId: siteVersion.artifactId,
        rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
        bundleSha256: artifactBundle.bundleSha256,
        htmlByPath: artifactBundle.htmlByPath,
        compiledTokenStyles: artifactBundle.compiledTokenStyles,
        assetFingerprintMap: artifactBundle.assetFingerprintMap,
        manifest: {
          ...artifactBundle.manifest,
          publishStage: resolvedPublishStage,
          shadowRestricted: enforcement.shadowRestricted,
          enforcementDecision: enforcement.adapter.decision,
        },
        publishStage: resolvedPublishStage,
        shadowRestricted: enforcement.shadowRestricted,
        artifactGovernance: enforcement.artifactGovernance,
        dbClient: input.dbClient,
      });
      storedArtifact = await getArtifactById(siteVersion.artifactId, dbOptions);
    }
    const candidateValidation = evaluatePublishActivationCandidate({
      candidateRef: `runtime-site-version:${siteVersion.id}`,
      candidateState: "READY_FOR_SHADOW_BIND",
      shadowEligibilityState: "ALLOWED",
      artifactId: siteVersion.artifactId,
      siteVersionId: siteVersion.id,
      expectedSiteId: siteVersion.siteId,
      expectedSiteVersionId: siteVersion.id,
      expectedArtifactId: siteVersion.artifactId,
      expectedRendererCompatibilityVersion: siteVersion.rendererCompatibilityVersion,
      expectedPublishStage: resolvedPublishStage,
      artifact: storedArtifact,
    });
    if (!candidateValidation.ok) {
      throwPublishActivationFailure(candidateValidation.code, candidateValidation.message, candidateValidation.details);
    }
    if (!storedArtifact) {
      throwPublishActivationFailure("PUBLISH_ARTIFACT_READ_FAILED", "Publish artifact could not be loaded for activation.", {
        artifactId: siteVersion.artifactId,
      });
    }

    const activePointer = await getActivePointerForSite(siteVersion.siteId, dbOptions);
    const pointerReadiness = evaluatePointerSwitchReadiness({
      targetSiteVersionId: siteVersion.id,
      targetArtifactId: siteVersion.artifactId,
      activePointer,
    });
    if (pointerReadiness.ok && "code" in pointerReadiness) {
      await runPublishActivationShadowGateObservation({
        enabled: input.publishActivationShadowGateEnabled,
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        runtimeArtifactId: siteVersion.artifactId,
        actor: input.actor,
        publishStage: resolvedPublishStage,
        scope: input.publishActivationShadowScope ?? null,
        dbClient: input.dbClient,
        observer: input.publishActivationShadowObserver,
      });
      await runPublishActivationEnforcementShadowObservation({
        enabled: input.publishActivationEnforcementShadowEnabled,
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        runtimeArtifactId: siteVersion.artifactId,
        actor: input.actor,
        publishStage: resolvedPublishStage,
        metadata: input.publishActivationMetadataHandoff ?? input.publishActivationEnforcementShadowMetadata ?? null,
        metadataResolverInput: input.publishActivationMetadataResolverShadowInput ?? null,
        metadataResolver: input.publishActivationMetadataResolverShadow,
        guard: input.publishActivationEnforcementShadowGuard,
      });
      return {
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        artifactId: siteVersion.artifactId,
        publishStage: resolvedPublishStage,
        shadowRestricted: storedArtifact.shadowRestricted,
        bundleSha256: storedArtifact.bundleSha256,
        pointerSwitch: "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
        previousActivePointer: activePointer,
        activationOutcome: pointerReadiness.code,
      };
    }

    await runPublishActivationShadowGateObservation({
      enabled: input.publishActivationShadowGateEnabled,
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      runtimeArtifactId: siteVersion.artifactId,
      actor: input.actor,
      publishStage: resolvedPublishStage,
      scope: input.publishActivationShadowScope ?? null,
      dbClient: input.dbClient,
      observer: input.publishActivationShadowObserver,
    });
    await runPublishActivationEnforcementShadowObservation({
      enabled: input.publishActivationEnforcementShadowEnabled,
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      runtimeArtifactId: siteVersion.artifactId,
      actor: input.actor,
      publishStage: resolvedPublishStage,
      metadata: input.publishActivationMetadataHandoff ?? input.publishActivationEnforcementShadowMetadata ?? null,
      metadataResolverInput: input.publishActivationMetadataResolverShadowInput ?? null,
      metadataResolver: input.publishActivationMetadataResolverShadow,
      guard: input.publishActivationEnforcementShadowGuard,
    });

    let pointerSwitchResult: { switched: boolean; previousActivePointer: { siteVersionId: string; artifactId: string } | null };
    try {
      pointerSwitchResult = await switchActivePointer({
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        artifactId: siteVersion.artifactId,
        dbClient: input.dbClient,
      });
    } catch (error) {
      throwPublishActivationFailure("PUBLISH_POINTER_SWITCH_FAILED", "active pointer switch failed", {
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        artifactId: siteVersion.artifactId,
        error: String((error as Error)?.message ?? error),
      });
    }

    return {
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      artifactId: siteVersion.artifactId,
      publishStage: resolvedPublishStage,
      shadowRestricted: storedArtifact.shadowRestricted,
      bundleSha256: storedArtifact.bundleSha256,
      pointerSwitch: pointerSwitchResult.switched ? "atomic_site_pointer_reassignment" : "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
      previousActivePointer: pointerSwitchResult.previousActivePointer,
      activationOutcome: "already_published_pointer_reconciled",
    };
  }

  const enforcement = evaluatePublishEnforcement({
    siteVersion,
    stage: publishStage,
  });
  if (enforcement.adapter.decision === "DENY") {
    throw new Error(`publish_enforcement_denied:${JSON.stringify(enforcement.adapter)}`);
  }
  if (enforcement.adapter.decision === "REVIEW_ONLY" && publishStage !== "shadow") {
    throw new Error(`publish_enforcement_review_only_shadow_required:${JSON.stringify(enforcement.adapter)}`);
  }

  const artifactBundle = buildDeterministicArtifactBundle({
    siteVersion,
    renderMode: "PUBLISH",
  });

  const integrity = runRenderIntegrityGate({
    siteVersion,
    htmlByPath: artifactBundle.htmlByPath,
    assetFingerprintMap: artifactBundle.assetFingerprintMap,
  });

  if (!integrity.ok) {
    const msg = integrity.issues.map((issue) => `${issue.code}:${issue.message}`).join("; ");
    throw new Error(`render-integrity-gate failed: ${msg}`);
  }

  const artifact = await createArtifact({
    siteId: artifactBundle.siteId,
    siteVersionId: artifactBundle.siteVersionId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    bundleSha256: artifactBundle.bundleSha256,
    htmlByPath: artifactBundle.htmlByPath,
    compiledTokenStyles: artifactBundle.compiledTokenStyles,
    assetFingerprintMap: artifactBundle.assetFingerprintMap,
    manifest: {
      ...artifactBundle.manifest,
      publishStage,
      shadowRestricted: enforcement.shadowRestricted,
      enforcementDecision: enforcement.adapter.decision,
    },
    publishStage,
    shadowRestricted: enforcement.shadowRestricted,
    artifactGovernance: enforcement.artifactGovernance,
    dbClient: input.dbClient,
  });

  await bindArtifactToVersion({
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    dbClient: input.dbClient,
  });
  await refreshArtifactForVersionPublishCandidate({
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    bundleSha256: artifactBundle.bundleSha256,
    htmlByPath: artifactBundle.htmlByPath,
    compiledTokenStyles: artifactBundle.compiledTokenStyles,
    assetFingerprintMap: artifactBundle.assetFingerprintMap,
    manifest: {
      ...artifactBundle.manifest,
      publishStage,
      shadowRestricted: enforcement.shadowRestricted,
      enforcementDecision: enforcement.adapter.decision,
    },
    publishStage,
    shadowRestricted: enforcement.shadowRestricted,
    artifactGovernance: enforcement.artifactGovernance,
    dbClient: input.dbClient,
  });

  const storedArtifact = await getArtifactById(artifact.artifactId, dbOptions);
  const activePointer = await getActivePointerForSite(siteVersion.siteId, dbOptions);
  const candidateValidation = evaluatePublishActivationCandidate({
    candidateRef: `runtime-site-version:${siteVersion.id}`,
    candidateState: "READY_FOR_SHADOW_BIND",
    shadowEligibilityState: "ALLOWED",
    artifactId: artifact.artifactId,
    siteVersionId: siteVersion.id,
    expectedSiteId: siteVersion.siteId,
    expectedSiteVersionId: siteVersion.id,
    expectedArtifactId: artifact.artifactId,
    expectedRendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    expectedPublishStage: publishStage,
    artifact: storedArtifact,
  });
  if (!candidateValidation.ok) {
    throwPublishActivationFailure(candidateValidation.code, candidateValidation.message, candidateValidation.details);
  }

  const pointerReadiness = evaluatePointerSwitchReadiness({
    targetSiteVersionId: siteVersion.id,
    targetArtifactId: artifact.artifactId,
    activePointer,
  });
  const pointerOutcome =
    pointerReadiness.ok && "code" in pointerReadiness ? pointerReadiness.code : "atomic_site_pointer_reassignment";

  await runPublishActivationShadowGateObservation({
    enabled: input.publishActivationShadowGateEnabled,
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    runtimeArtifactId: artifact.artifactId,
    actor: input.actor,
    publishStage,
    scope: input.publishActivationShadowScope ?? null,
    dbClient: input.dbClient,
    observer: input.publishActivationShadowObserver,
  });
  await runPublishActivationEnforcementShadowObservation({
    enabled: input.publishActivationEnforcementShadowEnabled,
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    runtimeArtifactId: artifact.artifactId,
    actor: input.actor,
    publishStage,
    metadata: input.publishActivationMetadataHandoff ?? input.publishActivationEnforcementShadowMetadata ?? null,
    metadataResolverInput: input.publishActivationMetadataResolverShadowInput ?? null,
    metadataResolver: input.publishActivationMetadataResolverShadow,
    guard: input.publishActivationEnforcementShadowGuard,
  });

  let pointerSwitchResult: { switched: boolean; previousActivePointer: { siteVersionId: string; artifactId: string } | null };
  try {
    pointerSwitchResult = await switchActivePointer({
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      artifactId: artifact.artifactId,
      dbClient: input.dbClient,
    });
  } catch (error) {
    throwPublishActivationFailure("PUBLISH_POINTER_SWITCH_FAILED", "active pointer switch failed", {
      siteId: siteVersion.siteId,
      siteVersionId: siteVersion.id,
      artifactId: artifact.artifactId,
      error: String((error as Error)?.message ?? error),
    });
  }

  const activePointerAfterSwitch = await getActivePointerForSite(siteVersion.siteId, dbOptions);
  assertPublishSafety({
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    artifact: storedArtifact,
    activePointer: activePointerAfterSwitch,
  });

  await transitionSiteVersionState({
    siteVersionId: siteVersion.id,
    nextState: "PUBLISHED",
    actor: input.actor,
    source: "manual",
    details: {
      artifactId: artifact.artifactId,
      bundleSha256: artifactBundle.bundleSha256,
      previousActivePointer: pointerSwitchResult.previousActivePointer,
      pointerOutcome,
    },
    dbClient: input.dbClient,
  });

  await archivePublishedVersionsExcept({
    siteId: siteVersion.siteId,
    keepSiteVersionId: siteVersion.id,
    actor: input.actor,
    dbClient: input.dbClient,
  });

  return {
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    artifactId: artifact.artifactId,
    publishStage,
    shadowRestricted: enforcement.shadowRestricted,
    enforcement: enforcement.adapter,
    bundleSha256: artifactBundle.bundleSha256,
    pointerSwitch: pointerSwitchResult.switched ? "atomic_site_pointer_reassignment" : "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP",
    previousActivePointer: pointerSwitchResult.previousActivePointer,
    activationOutcome: pointerOutcome,
  };
}
