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
  PublishShadowSeverity,
  PublishShadowStatus,
} from "./aaf-publish-shadow-result-read-model";

export type PublishShadowOpsInboxSurfaceState =
  | "visible"
  | "empty"
  | "unavailable"
  | "forbidden"
  | "not_applicable";

export type PublishShadowOpsInboxDerivedItemType =
  | "publish_shadow_missing_ddom_snapshot"
  | "publish_shadow_stale_ddom_snapshot"
  | "publish_shadow_missing_publish_target"
  | "publish_shadow_missing_publish_activation_approval"
  | "publish_shadow_gate_not_ready"
  | "publish_shadow_evaluation_failed"
  | "publish_shadow_source_truth_stale"
  | "publish_shadow_source_truth_missing";

export type PublishShadowOpsInboxDerivedWorkItem = {
  key: string;
  type: PublishShadowOpsInboxDerivedItemType;
  lifecycleState: "derived_open" | "derived_stale" | "derived_blocked";
  shadowOnly: true;
  derivedOnly: true;
  nonEnforcing: true;
  nonBlocking: true;
  sourceOfTruthLabel: "Derived from PASR-6 redacted publish shadow projection.";
  severity: PublishShadowSeverity;
  title: string;
  summary: string;
  siteLabel: string;
  siteVersionSummary: string;
  recommendedNextActionLabel: string;
  recommendedNextActionOwnerRole: PublishShadowRedactedResultProjection["recommendedNextAction"]["ownerRole"];
  refs: PublishShadowRedactedLink[];
  refSummaries: string[];
  limitationsSummary: string;
  freshnessSummary: string;
  createdAt: string | null;
  observedAt: string | null;
  labels: readonly [
    "shadow-only",
    "derived-only",
    "non-enforcing",
    "non-blocking",
  ];
  hasActionPayload: false;
  actionButtons: [];
};

export type PublishShadowOpsInboxViewModel = {
  state: PublishShadowOpsInboxSurfaceState;
  projection: PublishShadowRedactedResultProjection | null;
  items: PublishShadowOpsInboxDerivedWorkItem[];
  emptyStateLabel: string;
  unavailableStateLabel: string;
  boundaryLabels: string[];
};

export type PublishShadowOpsInboxInput = {
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

export type PublishShadowOpsInboxDependencies = {
  readPublishShadowResult?: (input: PublishShadowResultReadInput) => Promise<PublishShadowResultReadModel>;
  redactPublishShadowResultForActor?: typeof redactPublishShadowResultForActor;
};

const DERIVATION_POLICY_VERSION = "pasr-8-derived-ops-inbox:v1";
const BOUNDARY_LABELS = ["derived_only", "shadow_only", "non_enforcing", "publish_not_blocked"];
const ITEM_LABELS = ["shadow-only", "derived-only", "non-enforcing", "non-blocking"] as const;

const STATUS_TO_ITEM: Partial<Record<PublishShadowStatus, PublishShadowOpsInboxDerivedItemType>> = {
  shadow_missing_ddom_snapshot: "publish_shadow_missing_ddom_snapshot",
  shadow_stale_ddom_snapshot: "publish_shadow_stale_ddom_snapshot",
  shadow_missing_publish_target: "publish_shadow_missing_publish_target",
  shadow_missing_publish_activation_approval: "publish_shadow_missing_publish_activation_approval",
  shadow_gate_not_ready: "publish_shadow_gate_not_ready",
  shadow_evaluation_failed: "publish_shadow_evaluation_failed",
  shadow_stale_source_truth: "publish_shadow_source_truth_stale",
  shadow_missing_source_truth: "publish_shadow_source_truth_missing",
};

const DEFAULT_SEVERITY: Record<PublishShadowOpsInboxDerivedItemType, PublishShadowSeverity> = {
  publish_shadow_missing_ddom_snapshot: "high",
  publish_shadow_stale_ddom_snapshot: "medium",
  publish_shadow_missing_publish_target: "high",
  publish_shadow_missing_publish_activation_approval: "high",
  publish_shadow_gate_not_ready: "high",
  publish_shadow_evaluation_failed: "high",
  publish_shadow_source_truth_stale: "medium",
  publish_shadow_source_truth_missing: "high",
};

function text(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function visibleFieldValue<T>(field: PublishShadowRedactedField<T>): T | null {
  return field.visibility === "full" && field.value !== undefined ? field.value : null;
}

function fieldDisplayLabel<T>(field: PublishShadowRedactedField<T>, fallback = "-"): string {
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

function visibleRef(link: PublishShadowRedactedLink): PublishShadowRedactedLink | null {
  return link.visibility === "full" && Boolean(link.ref) ? link : null;
}

function linkSummary(link: PublishShadowRedactedLink): string | null {
  if (link.visibility === "full" && link.ref) return `${link.label}: ${link.ref}`;
  if (link.visibility === "summarized" || link.visibility === "redacted") return link.label;
  return null;
}

function safeKeySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || "unknown";
}

function stableFieldSegment(field: PublishShadowRedactedField<string | null>, visiblePrefix: string, redactedFallback: string): string {
  const value = visibleFieldValue(field);
  if (value) return `${visiblePrefix}:${safeKeySegment(value)}`;
  if (field.visibility === "summarized" && field.summary) return `${redactedFallback}:${safeKeySegment(field.summary)}`;
  return redactedFallback;
}

function stableLinkSegment(link: PublishShadowRedactedLink, fallback: string): string {
  if (link.visibility === "full" && link.ref) return safeKeySegment(link.ref);
  if ((link.visibility === "summarized" || link.visibility === "redacted") && link.label) return safeKeySegment(link.label);
  return fallback;
}

function stableSourceSegment(type: PublishShadowOpsInboxDerivedItemType, projection: PublishShadowRedactedResultProjection): string {
  if (type === "publish_shadow_missing_ddom_snapshot" || type === "publish_shadow_stale_ddom_snapshot") {
    return stableLinkSegment(projection.ddomReadiness.snapshot, `ddom:${fieldDisplayLabel(projection.ddomReadiness.status, "restricted")}`);
  }
  if (type === "publish_shadow_missing_publish_target") {
    return stableLinkSegment(
      projection.publishTarget.sourceRef,
      stableFieldSegment(projection.publishTarget.publishTargetId, "publish-target", "publish-target:restricted"),
    );
  }
  if (type === "publish_shadow_missing_publish_activation_approval") {
    return stableLinkSegment(
      projection.approval.approvalDecision,
      stableLinkSegment(projection.approval.approvalRequest, `approval:${fieldDisplayLabel(projection.approval.publishActivation, "restricted")}`),
    );
  }
  if (type === "publish_shadow_gate_not_ready") {
    return stableLinkSegment(
      projection.gateDryRunStatus.gateAttempt,
      `gate:${fieldDisplayLabel(projection.gateDryRunStatus.gateResult, "restricted")}:${fieldDisplayLabel(projection.gateDryRunStatus.policyResult, "restricted")}`,
    );
  }
  if (type === "publish_shadow_evaluation_failed") {
    return stableLinkSegment(
      projection.evidence.evidencePackage,
      `evaluation:${fieldDisplayLabel(projection.status.shadowStatus, "restricted")}`,
    );
  }
  const categories =
    type === "publish_shadow_source_truth_missing"
      ? projection.sourceTruth.summary.missingCategories
      : projection.sourceTruth.summary.staleCategories;
  return `source-truth:${categories.length > 0 ? categories.map(safeKeySegment).join("_") : "restricted"}`;
}

function itemTitle(type: PublishShadowOpsInboxDerivedItemType): string {
  switch (type) {
    case "publish_shadow_missing_ddom_snapshot":
      return "Publish shadow is missing a DDOM readiness snapshot";
    case "publish_shadow_stale_ddom_snapshot":
      return "Publish shadow has a stale DDOM readiness snapshot";
    case "publish_shadow_missing_publish_target":
      return "Publish shadow is missing publish target source truth";
    case "publish_shadow_missing_publish_activation_approval":
      return "Publish shadow is missing publish activation approval";
    case "publish_shadow_gate_not_ready":
      return "Publish shadow gate dry-run is not ready";
    case "publish_shadow_evaluation_failed":
      return "Publish shadow evaluation failed";
    case "publish_shadow_source_truth_stale":
      return "Publish shadow source truth is stale";
    case "publish_shadow_source_truth_missing":
      return "Publish shadow source truth is missing";
  }
}

function lifecycleFor(type: PublishShadowOpsInboxDerivedItemType): PublishShadowOpsInboxDerivedWorkItem["lifecycleState"] {
  if (type === "publish_shadow_stale_ddom_snapshot" || type === "publish_shadow_source_truth_stale") return "derived_stale";
  if (type === "publish_shadow_gate_not_ready") return "derived_blocked";
  return "derived_open";
}

function refsForProjection(projection: PublishShadowRedactedResultProjection): {
  refs: PublishShadowRedactedLink[];
  refSummaries: string[];
} {
  const links = [
    projection.ddomReadiness.snapshot,
    projection.publishTarget.sourceRef,
    projection.approval.approvalRequest,
    projection.approval.approvalDecision,
    projection.evidence.evidencePackage,
    projection.gateDryRunStatus.approvalDecision,
    projection.gateDryRunStatus.gateAttempt,
    projection.gateDryRunStatus.auditEvent,
    ...projection.evidenceRefs,
    ...projection.recommendedNextAction.requiredRefs,
  ];
  const refs = links.map(visibleRef).filter((link): link is PublishShadowRedactedLink => Boolean(link));
  const refSummaries = [...new Set(links.map(linkSummary).filter((summary): summary is string => Boolean(summary)))];
  return { refs, refSummaries };
}

function stateForProjection(projection: PublishShadowRedactedResultProjection): PublishShadowOpsInboxSurfaceState {
  if (!projection.access.allowed || projection.visibility === "forbidden") return "forbidden";
  if (fieldDisplayLabel(projection.diagnostics.limitations, "").includes("publish_shadow_read_repository_unavailable")) {
    return "unavailable";
  }
  const status = visibleFieldValue<PublishShadowStatus | null>(projection.status.shadowStatus);
  if (status === "shadow_not_enabled" || status === "shadow_not_available" || status === "shadow_ready" || status === "shadow_ready_with_warnings") {
    return "empty";
  }
  return STATUS_TO_ITEM[status ?? "shadow_not_available"] ? "visible" : "empty";
}

export function mapPublishShadowProjectionToOpsInboxWorkItems(
  projection: PublishShadowRedactedResultProjection,
): PublishShadowOpsInboxDerivedWorkItem[] {
  if (!projection.access.allowed || projection.visibility === "forbidden") return [];

  const status = visibleFieldValue<PublishShadowStatus | null>(projection.status.shadowStatus);
  const type = status ? STATUS_TO_ITEM[status] : undefined;
  if (!type) return [];

  const siteSegment = stableFieldSegment(projection.subject.siteId, "site", "site:redacted-scope");
  const versionSegment = stableFieldSegment(projection.subject.siteVersionId, "version", "version:redacted-scope");
  const sourceSegment = stableSourceSegment(type, projection);
  const key = [
    "ops",
    type,
    siteSegment,
    versionSegment,
    sourceSegment,
    DERIVATION_POLICY_VERSION,
  ].map(safeKeySegment).join(":");
  const severity = visibleFieldValue<PublishShadowSeverity | null>(projection.status.severity) ?? DEFAULT_SEVERITY[type];
  const { refs, refSummaries } = refsForProjection(projection);

  return [
    {
      key,
      type,
      lifecycleState: lifecycleFor(type),
      shadowOnly: true,
      derivedOnly: true,
      nonEnforcing: true,
      nonBlocking: true,
      sourceOfTruthLabel: "Derived from PASR-6 redacted publish shadow projection.",
      severity,
      title: itemTitle(type),
      summary: `${projection.summary.operatorSummary} This Ops Inbox item is derived-only, shadow-only, non-enforcing, and non-blocking.`,
      siteLabel: fieldDisplayLabel(projection.subject.siteId, "Site scope restricted."),
      siteVersionSummary: fieldDisplayLabel(projection.subject.siteVersionId, "Site version scope restricted."),
      recommendedNextActionLabel: projection.recommendedNextAction.label,
      recommendedNextActionOwnerRole: projection.recommendedNextAction.ownerRole,
      refs,
      refSummaries,
      limitationsSummary: fieldDisplayLabel(projection.diagnostics.limitations, "No displayed limitations."),
      freshnessSummary: projection.summary.freshnessSummary,
      createdAt: visibleFieldValue(projection.evidence.evidenceCreatedAt) ?? projection.generatedAt,
      observedAt: projection.generatedAt,
      labels: ITEM_LABELS,
      hasActionPayload: false,
      actionButtons: [],
    },
  ];
}

export function buildPublishShadowOpsInboxViewModelFromProjection(
  projection: PublishShadowRedactedResultProjection,
): PublishShadowOpsInboxViewModel {
  const state = stateForProjection(projection);
  const items = state === "visible" ? mapPublishShadowProjectionToOpsInboxWorkItems(projection) : [];
  return {
    state,
    projection,
    items,
    emptyStateLabel: "No derived publish shadow exception work items are open for this redacted projection.",
    unavailableStateLabel: "Publish shadow Ops Inbox derivation is unavailable from the redacted projection. No publish behavior changed.",
    boundaryLabels: [...BOUNDARY_LABELS],
  };
}

export function buildPublishShadowOpsInboxNotApplicableViewModel(): PublishShadowOpsInboxViewModel {
  return {
    state: "not_applicable",
    projection: null,
    items: [],
    emptyStateLabel: "Publish shadow Ops Inbox derivation requires a site and site version.",
    unavailableStateLabel: "Publish shadow Ops Inbox derivation was not attempted.",
    boundaryLabels: [...BOUNDARY_LABELS],
  };
}

export async function getPublishShadowOpsInboxViewModel(
  input: PublishShadowOpsInboxInput,
  deps: PublishShadowOpsInboxDependencies = {},
): Promise<PublishShadowOpsInboxViewModel> {
  const siteId = text(input.siteId, "");
  const siteVersionId = text(input.siteVersionId, "");
  if (!siteId || !siteVersionId) return buildPublishShadowOpsInboxNotApplicableViewModel();

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
      actorType: "internal_ops_inbox",
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
      surface: "ops_inbox",
      subjectScope: {
        tenantId: input.tenantId,
        agencyId: input.agencyId,
        clientId: input.clientId,
        siteId,
        siteVersionId,
      },
    });
    return buildPublishShadowOpsInboxViewModelFromProjection(projection);
  } catch {
    return {
      state: "unavailable",
      projection: null,
      items: [],
      emptyStateLabel: "No derived publish shadow exception work items are open.",
      unavailableStateLabel: "Publish shadow Ops Inbox derivation is unavailable. No publish behavior changed.",
      boundaryLabels: [...BOUNDARY_LABELS],
    };
  }
}
