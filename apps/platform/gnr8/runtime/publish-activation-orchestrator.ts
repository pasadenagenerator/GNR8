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
  type PublishActivationMetadataHandoff,
} from "@/gnr8/single-site/publish-activation-metadata-handoff";
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

export type PublishActivationEnforcementShadowObservation = {
  enabled: true;
  available: boolean;
  shadowOnly: true;
  enforcementApplied: false;
  publishActionBlocked: false;
  guardMode: PublishActivationEnforcementGuardResult["mode"] | "unavailable" | "error";
  guardAllowed: boolean | null;
  guardReason: string;
  blockerCodes: string[];
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
  guardMode?: PublishActivationEnforcementShadowObservation["guardMode"];
}): PublishActivationEnforcementShadowObservation {
  return {
    enabled: true,
    available: false,
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    guardMode: input.guardMode ?? "unavailable",
    guardAllowed: null,
    guardReason: input.reason,
    blockerCodes: input.blockerCodes,
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
    guardMode: observation.guardMode,
    guardReason: observation.guardReason,
    blockerCodes: observation.blockerCodes,
    matchedRefsCount: observation.matchedRefsCount,
    safeIds: observation.safeIds,
    correlationId: observation.correlationId,
    idempotencyKey: observation.idempotencyKey,
    ...extra,
  });
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

  if (!handoff.diagnostics.complete || !normalized?.gateAttemptResultRef || !normalized.publishTargetRef || !normalized.candidateSiteVersionRef || !normalized.runtimeArtifactRef) {
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
      blockerCodes,
    });
    enforcementShadowDiagnosticLog("[gnr8.single-site.mvp48] publish activation enforcement metadata handoff unavailable", observation, {
      metadataHandoffStatus: handoff.diagnostics.status,
      metadataWarningCodes: handoff.diagnostics.warningCodes,
    });
    return observation;
  }

  try {
    const guard = input.guard ?? readAndEvaluatePublishActivationEnforcementGuard;
    const result = await guard({
      tenantId: normalized.tenantId!,
      clientId: normalized.clientId!,
      siteId: input.siteId,
      migrationId: normalized.migrationId!,
      candidateSiteVersionRef: normalized.candidateSiteVersionRef,
      runtimeArtifactRef: normalized.runtimeArtifactRef,
      publishTargetRef: normalized.publishTargetRef,
      publishStage: input.publishStage,
      publishEnvironment: normalized.publishEnvironment!,
      publishActivationDecisionRef: {
        id: publishActivationDecisionId,
        ref: normalized.publishActivationDecisionRef.ref,
        status: normalized.publishActivationDecisionRef.status,
      },
      gateAttemptResultRef: normalized.gateAttemptResultRef,
      handoffWatermark: normalized.handoffWatermark!,
      gateInputWatermark: normalized.gateInputWatermark!,
      actor: {
        actorType: normalized.actorType,
        actorId: input.actor,
        actorRole: normalized.actorRole,
      },
      correlationId: normalized.correlationId,
      idempotencyKey: normalized.idempotencyKey,
      requestId: normalized.requestId,
      policy: normalized.policy,
      repository: normalized.repository,
    });
    const observation: PublishActivationEnforcementShadowObservation = {
      enabled: true,
      available: true,
      shadowOnly: true,
      enforcementApplied: false,
      publishActionBlocked: false,
      guardMode: result.mode,
      guardAllowed: result.allowed,
      guardReason: result.reason,
      blockerCodes: result.blockerCodes,
      matchedRefsCount: matchedRefsCount(result),
      safeIds: {
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        runtimeArtifactId: input.runtimeArtifactId,
        publishTargetId: result.matchedRefs.publishTargetId ?? publishTargetId,
        gateAttemptId: result.matchedRefs.gateAttemptId ?? gateAttemptId,
        publishActivationDecisionId: result.matchedRefs.publishActivationDecisionId ?? publishActivationDecisionId,
      },
      correlationId: result.diagnosticRefs.correlationId ?? correlationId,
      idempotencyKey: result.diagnosticRefs.idempotencyKey ?? idempotencyKey,
    };
    enforcementShadowDiagnosticLog("[gnr8.single-site.mvp48] publish activation enforcement metadata handoff observed", observation, {
      guardAllowed: result.allowed,
      guardWouldBlockIfWired: result.flags.publishActionBlockedWouldBlockIfWired,
      metadataHandoffWatermark: normalized.metadataWatermark,
      metadataWarningCodes: handoff.diagnostics.warningCodes,
    });
    return observation;
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
      reason: "publish activation enforcement shadow guard error",
      blockerCodes: ["publish_activation_enforcement_shadow_guard_error"],
      guardMode: "error",
    });
    enforcementShadowDiagnosticLog("[gnr8.single-site.mvp48] publish activation enforcement metadata handoff failed open", observation, {
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
