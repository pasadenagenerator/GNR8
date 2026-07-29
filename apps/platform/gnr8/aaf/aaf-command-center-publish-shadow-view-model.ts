import "server-only";

import {
  readPublishShadowResult,
} from "./aaf-publish-shadow-result-read-repository";
import {
  redactPublishShadowResultForActor,
  type PublishShadowRedactedField,
  type PublishShadowRedactedLink,
  type PublishShadowRedactedResultProjection,
  type PublishShadowRedactionRole,
} from "./aaf-publish-shadow-result-redaction";
import type {
  PublishShadowEnabledState,
  PublishShadowResultReadInput,
  PublishShadowResultReadModel,
  PublishShadowStatus,
} from "./aaf-publish-shadow-result-read-model";

export type CommandCenterPublishShadowSurfaceState =
  | "not_applicable"
  | "visible"
  | "empty"
  | "unavailable"
  | "forbidden";

export type CommandCenterPublishShadowSurfaceViewModel = {
  state: CommandCenterPublishShadowSurfaceState;
  projection: PublishShadowRedactedResultProjection | null;
  shadowStatusLabel: string;
  severityLabel: string;
  readinessLabel: string;
  freshnessLabel: string;
  operatorSummary: string;
  recommendedActionLabel: string;
  recommendedActionReasonLabel: string;
  ddomStatusLabel: string;
  ddomReadinessLabel: string;
  ddomFreshnessLabel: string;
  ddomCapturedAtLabel: string;
  publishTargetStatusLabel: string;
  publishTargetEnvironmentLabel: string;
  publishTargetStageLabel: string;
  approvalLaunchSignoffLabel: string;
  approvalPublishActivationLabel: string;
  approvalDecisionStatusLabel: string;
  evidenceStatusLabel: string;
  evidenceFreshnessLabel: string;
  sourceTruthSummaryLabel: string;
  warningSummaryLabel: string;
  limitationSummaryLabel: string;
  visibleLinks: PublishShadowRedactedLink[];
  boundaryLabels: string[];
  nonEnforcementLabel: string;
  derivedOnlyLabel: string;
};

export type CommandCenterPublishShadowSurfaceInput = {
  actorId: string | null;
  actorRole?: PublishShadowRedactionRole;
  actorTenantIds?: readonly string[];
  actorAgencyIds?: readonly string[];
  actorClientIds?: readonly string[];
  actorSiteIds?: readonly string[];
  actorSiteVersionIds?: readonly string[];
  tenantId?: string | null;
  agencyId?: string | null;
  clientId?: string | null;
  siteId: string | null | undefined;
  siteVersionId: string | null | undefined;
  runtimeArtifactId?: string | null;
  publishTargetId?: string | null;
  intendedPublishTarget?: string | null;
  intendedPublishStage?: string | null;
  trustedPublishEnvironment?: string | null;
  shadowEnabledState?: PublishShadowEnabledState;
};

export type CommandCenterPublishShadowSurfaceDependencies = {
  readPublishShadowResult?: (input: PublishShadowResultReadInput) => Promise<PublishShadowResultReadModel>;
  redactPublishShadowResultForActor?: typeof redactPublishShadowResultForActor;
};

const DEFAULT_BOUNDARY_LABELS = [
  "derived_only",
  "shadow_only",
  "non_enforcing",
  "publish_not_blocked",
];

function text(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function fieldLabel<T>(field: PublishShadowRedactedField<T>, fallback = "-"): string {
  if (field.visibility === "full" && field.value !== undefined) {
    if (Array.isArray(field.value)) return field.value.length > 0 ? field.value.join(", ") : fallback;
    return text(field.value, fallback);
  }
  if (field.visibility === "summarized" && field.summary) return field.summary;
  if (field.visibility === "redacted") return field.summary ?? "Restricted for this role.";
  if (field.visibility === "hidden") return "Hidden for this role.";
  if (field.visibility === "forbidden") return "Unavailable for this actor.";
  return fallback;
}

function fieldValue<T>(field: PublishShadowRedactedField<T>): T | null {
  return field.visibility === "full" && field.value !== undefined ? field.value : null;
}

function fieldArrayIncludes(field: PublishShadowRedactedField<string[]>, code: string): boolean {
  const values = fieldValue(field);
  return Array.isArray(values) && values.includes(code);
}

function linkIsVisible(link: PublishShadowRedactedLink): boolean {
  return link.visibility === "full" && Boolean(link.ref);
}

function stateForProjection(projection: PublishShadowRedactedResultProjection): CommandCenterPublishShadowSurfaceState {
  if (!projection.access.allowed || projection.visibility === "forbidden") return "forbidden";
  if (fieldArrayIncludes(projection.diagnostics.limitations, "publish_shadow_read_repository_unavailable")) return "unavailable";

  const status = fieldValue<PublishShadowStatus | null>(projection.status.shadowStatus);
  if (status === "shadow_not_enabled" || status === "shadow_not_available") return "empty";
  return "visible";
}

function safeUnavailableViewModel(): CommandCenterPublishShadowSurfaceViewModel {
  return {
    state: "unavailable",
    projection: null,
    shadowStatusLabel: "Unavailable",
    severityLabel: "-",
    readinessLabel: "Unavailable",
    freshnessLabel: "Unavailable",
    operatorSummary: "Publish shadow result is unavailable from the read model. Publish was not blocked by this result.",
    recommendedActionLabel: "Verify shadow observation availability through the source-owned workflow.",
    recommendedActionReasonLabel: "Read model unavailable.",
    ddomStatusLabel: "-",
    ddomReadinessLabel: "-",
    ddomFreshnessLabel: "-",
    ddomCapturedAtLabel: "-",
    publishTargetStatusLabel: "-",
    publishTargetEnvironmentLabel: "-",
    publishTargetStageLabel: "-",
    approvalLaunchSignoffLabel: "-",
    approvalPublishActivationLabel: "-",
    approvalDecisionStatusLabel: "-",
    evidenceStatusLabel: "-",
    evidenceFreshnessLabel: "-",
    sourceTruthSummaryLabel: "-",
    warningSummaryLabel: "-",
    limitationSummaryLabel: "Read model unavailable.",
    visibleLinks: [],
    boundaryLabels: DEFAULT_BOUNDARY_LABELS,
    nonEnforcementLabel: "Shadow-only, non-enforcing, non-blocking. Publish was not blocked by this result.",
    derivedOnlyLabel: "Command Center is a derived view and is not source truth.",
  };
}

function notApplicableViewModel(): CommandCenterPublishShadowSurfaceViewModel {
  return {
    state: "not_applicable",
    projection: null,
    shadowStatusLabel: "No active site version",
    severityLabel: "-",
    readinessLabel: "-",
    freshnessLabel: "-",
    operatorSummary: "Publish shadow readiness is not available until an active site version exists.",
    recommendedActionLabel: "Continue source-owned hosting and publish workflows outside PASR.",
    recommendedActionReasonLabel: "No site version is available for PASR lookup.",
    ddomStatusLabel: "-",
    ddomReadinessLabel: "-",
    ddomFreshnessLabel: "-",
    ddomCapturedAtLabel: "-",
    publishTargetStatusLabel: "-",
    publishTargetEnvironmentLabel: "-",
    publishTargetStageLabel: "-",
    approvalLaunchSignoffLabel: "-",
    approvalPublishActivationLabel: "-",
    approvalDecisionStatusLabel: "-",
    evidenceStatusLabel: "-",
    evidenceFreshnessLabel: "-",
    sourceTruthSummaryLabel: "-",
    warningSummaryLabel: "-",
    limitationSummaryLabel: "No PASR records were read because no site version is available.",
    visibleLinks: [],
    boundaryLabels: DEFAULT_BOUNDARY_LABELS,
    nonEnforcementLabel: "Shadow-only, non-enforcing, non-blocking. Publish was not blocked by this result.",
    derivedOnlyLabel: "Command Center is a derived view and is not source truth.",
  };
}

function viewModelFromProjection(projection: PublishShadowRedactedResultProjection): CommandCenterPublishShadowSurfaceViewModel {
  const sourceSummary = projection.sourceTruth.summary;
  const visibleLinks = [
    projection.ddomReadiness.snapshot,
    projection.publishTarget.sourceRef,
    projection.approval.approvalRequest,
    projection.approval.approvalDecision,
    projection.evidence.evidencePackage,
    ...projection.evidenceRefs,
  ].filter(linkIsVisible);

  return {
    state: stateForProjection(projection),
    projection,
    shadowStatusLabel: fieldLabel(projection.status.shadowStatus),
    severityLabel: fieldLabel(projection.status.severity),
    readinessLabel: fieldLabel(projection.status.readinessResult),
    freshnessLabel: fieldLabel(projection.status.projectionFreshness),
    operatorSummary: projection.summary.operatorSummary,
    recommendedActionLabel: projection.recommendedNextAction.label,
    recommendedActionReasonLabel: fieldLabel(projection.recommendedNextAction.reason),
    ddomStatusLabel: fieldLabel(projection.ddomReadiness.status),
    ddomReadinessLabel: fieldLabel(projection.ddomReadiness.readinessState),
    ddomFreshnessLabel: fieldLabel(projection.ddomReadiness.freshnessState),
    ddomCapturedAtLabel: fieldLabel(projection.ddomReadiness.capturedAt),
    publishTargetStatusLabel: fieldLabel(projection.publishTarget.status),
    publishTargetEnvironmentLabel: fieldLabel(projection.publishTarget.environment),
    publishTargetStageLabel: fieldLabel(projection.publishTarget.publishStage),
    approvalLaunchSignoffLabel: fieldLabel(projection.approval.launchSignoff),
    approvalPublishActivationLabel: fieldLabel(projection.approval.publishActivation),
    approvalDecisionStatusLabel: fieldLabel(projection.approval.decisionStatus),
    evidenceStatusLabel: fieldLabel(projection.evidence.packageStatus),
    evidenceFreshnessLabel: fieldLabel(projection.evidence.freshnessLabel),
    sourceTruthSummaryLabel: `${sourceSummary.availableCount} available, ${sourceSummary.missingCount} missing, ${sourceSummary.staleCount} stale`,
    warningSummaryLabel: fieldLabel(projection.diagnostics.warnings),
    limitationSummaryLabel: fieldLabel(projection.diagnostics.limitations),
    visibleLinks,
    boundaryLabels: projection.summary.boundaryLabels,
    nonEnforcementLabel: "Shadow-only, non-enforcing, non-blocking. Publish was not blocked by this result.",
    derivedOnlyLabel: "Command Center is a derived view and is not source truth.",
  };
}

export async function getCommandCenterPublishShadowSurfaceViewModel(
  input: CommandCenterPublishShadowSurfaceInput,
  deps: CommandCenterPublishShadowSurfaceDependencies = {},
): Promise<CommandCenterPublishShadowSurfaceViewModel> {
  const siteId = text(input.siteId, "");
  const siteVersionId = text(input.siteVersionId, "");
  if (!siteId || !siteVersionId) return notApplicableViewModel();

  const read = deps.readPublishShadowResult ?? readPublishShadowResult;
  const redact = deps.redactPublishShadowResultForActor ?? redactPublishShadowResultForActor;

  try {
    const rawReadModel = await read({
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId,
      siteVersionId,
      runtimeArtifactId: input.runtimeArtifactId,
      publishTargetId: input.publishTargetId,
      intendedPublishTarget: input.intendedPublishTarget ?? "production",
      intendedPublishStage: input.intendedPublishStage ?? "production",
      trustedPublishEnvironment: input.trustedPublishEnvironment ?? "production",
      actorType: "internal_command_center",
      actorId: input.actorId,
      actorRole: input.actorRole ?? "platform_superadmin",
      shadowEnabledState: input.shadowEnabledState,
    });
    const projection = redact(rawReadModel, {
      actor: {
        actorId: input.actorId,
        role: input.actorRole ?? "platform_superadmin",
        tenantIds: input.actorTenantIds,
        agencyIds: input.actorAgencyIds,
        clientIds: input.actorClientIds,
        siteIds: input.actorSiteIds ?? [siteId],
        siteVersionIds: input.actorSiteVersionIds ?? [siteVersionId],
      },
      surface: "command_center",
      subjectScope: {
        tenantId: input.tenantId,
        agencyId: input.agencyId,
        clientId: input.clientId,
        siteId,
        siteVersionId,
      },
    });
    return viewModelFromProjection(projection);
  } catch {
    return safeUnavailableViewModel();
  }
}
