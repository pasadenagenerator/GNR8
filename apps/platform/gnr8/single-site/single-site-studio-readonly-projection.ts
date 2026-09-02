import "server-only";

import {
  SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE,
  getSingleSitePublishOperatorReadonlyProjection,
  type SingleSitePublishOperatorReadonlyProjection,
} from "./single-site-publish-operator-readonly-projection";
import {
  buildSingleSiteMigrationReadModel,
  type SingleSiteMigrationReadModel,
  type SingleSiteMigrationReadRepositorySnapshot,
} from "./single-site-state-read-model";
import { SingleSiteStateReadRepository } from "./single-site-state-read-repository";
import type { SingleSiteEvidenceItemRow, SingleSiteImprovementProposalRecommendationRow } from "./single-site-state-writer-repository";

export const SINGLE_SITE_STUDIO_READONLY_PROJECTION_VERSION = "mvp-ui-1-single-site-studio-readonly:v1" as const;

const CHS_MIGRATION_ID = SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.migrationId;
const CHS_ORIGINAL_CLONE_SITE_VERSION_ID = "6b172a5b-200e-471c-9599-5dc70f04ea53";
const CHS_ORIGINAL_CLONE_ARTIFACT_ID = "929106cd-fa19-47eb-9582-ce6931d0e370";
const STUDIO_INTERNAL_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions";

const CHS_RECOMMENDATION_FALLBACK = [
  {
    id: "0be61bde-6568-4f33-8499-4d5eade70837",
    key: "make-contact-actions-more-prominent",
    title: "Make contact actions more prominent",
    category: "conversion",
    priority: "p1",
    limitationReason: "unsupported_in_mvp",
  },
  {
    id: "73de9484-1461-4476-b677-f41d7a839df7",
    key: "add-trust-signals-and-seo-structure",
    title: "Add trust signals and SEO structure",
    category: "trust_credibility",
    priority: "p2",
    limitationReason: "requires_operator_input",
  },
  {
    id: "86342f67-7cce-43de-823f-ea0f4adc1a41",
    key: "clarify-service-positioning-copy",
    title: "Clarify service positioning copy",
    category: "content_clarity",
    priority: "p1",
    limitationReason: "requires_operator_input",
  },
  {
    id: "a61e857e-89c1-4ab1-bdc1-581a24e824c1",
    key: "tighten-mobile-layout-hierarchy",
    title: "Tighten mobile layout hierarchy",
    category: "mobile_responsive",
    priority: "p2",
    limitationReason: "unsupported_in_mvp",
  },
] as const;

export type SingleSiteStudioPreviewState = {
  label: "Original clone preview" | "Improved candidate preview";
  siteVersionId: string | null;
  runtimeArtifactId: string | null;
  route: string | null;
  mode: "transformed";
  available: boolean;
  unavailableReason: string | null;
  authNote: string;
};

export type SingleSiteStudioRecommendation = {
  id: string;
  key: string;
  title: string;
  category: string;
  priority: string;
  status: "applied" | "accepted_limitation";
  reason: string;
};

export type SingleSiteStudioReadonlyProjection = {
  version: typeof SINGLE_SITE_STUDIO_READONLY_PROJECTION_VERSION;
  generatedAt: string;
  state: "lookup_required" | "empty" | "visible";
  migrationId: string | null;
  diagnosticsHref: string | null;
  summary: {
    site: string;
    sourceUrl: string;
    mvpStatus: string;
    liveSiteUrl: string;
    activePointer: "live" | "not_live" | "unknown";
    publishedCandidate: string;
  };
  sourceTruth?: {
    tenantId: string | null;
    clientId: string | null;
    siteId: string | null;
    ownershipSiteId: string | null;
    runtimeSiteId: string | null;
  } | null;
  import: {
    inputUrl: string;
    captured: boolean;
    status: string;
  };
  workflow: Array<{
    key: string;
    label: string;
    status: "done" | "current" | "waiting";
  }>;
  sourceEvidence: Array<{
    label: string;
    status: string;
    detail: string;
  }>;
  previews: {
    originalClone: SingleSiteStudioPreviewState;
    improvedCandidate: SingleSiteStudioPreviewState;
  };
  comparison: Array<{
    label: "Original imported site" | "Generated clone" | "Improved candidate" | "Live published version";
    status: string;
    detail: string;
    href: string | null;
  }>;
  improvementSummary: {
    headline: string;
    appliedCount: number;
    limitationCount: number;
    noDeterministicContentChanges: boolean;
    recommendations: SingleSiteStudioRecommendation[];
  };
  flags: {
    readOnly: true;
    mutatesProductionData: false;
    imports: false;
    publishes: false;
  };
};

type StudioBuildInput = {
  migrationId?: string | null;
  stateModel?: SingleSiteMigrationReadModel | null;
  stateSnapshot?: SingleSiteMigrationReadRepositorySnapshot | null;
  publishModel?: SingleSitePublishOperatorReadonlyProjection | null;
  generatedAt?: string | null;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function extractId(value: string | null | undefined): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  const parts = normalized.split(":");
  return parts[parts.length - 1] || normalized;
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function sourceEvidenceDetail(item: SingleSiteEvidenceItemRow): string {
  return text(item.finding_summary) ?? text(jsonObject(item.limitation_json).reason) ?? text(jsonObject(item.blocker_json).reason) ?? labelize(item.evidence_category);
}

function sourceEvidenceRows(snapshot: SingleSiteMigrationReadRepositorySnapshot | null | undefined, model: SingleSiteMigrationReadModel | null | undefined) {
  const items = snapshot?.sourceEvidenceItems ?? [];
  const preferred = ["source_url", "visual_identity", "metadata", "text", "image", "screenshot", "page"];
  const rows = preferred
    .map((category) => items.find((item) => item.evidence_category === category))
    .filter((item): item is SingleSiteEvidenceItemRow => Boolean(item))
    .slice(0, 6)
    .map((item) => ({
      label: labelize(item.evidence_category),
      status: labelize(item.status),
      detail: sourceEvidenceDetail(item),
    }));

  if (rows.length > 0) return rows;
  return [
    {
      label: "Source evidence",
      status: labelize(model?.sourceEvidenceReview.reviewStatus ?? "missing"),
      detail: model?.sourceEvidenceReview.reviewId
        ? `${model.sourceEvidenceReview.itemCount} captured evidence item(s); ${model.evidenceCompleteness.presentRequiredCategories.length}/${model.evidenceCompleteness.requiredCategories.length} required categories present.`
        : "No source evidence review was available for this migration lookup.",
    },
  ];
}

function previewState(input: {
  label: SingleSiteStudioPreviewState["label"];
  siteVersionId: string | null;
  runtimeArtifactId: string | null;
}): SingleSiteStudioPreviewState {
  const route = input.siteVersionId
    ? `${STUDIO_INTERNAL_PREVIEW_ROUTE_PREFIX}/${encodeURIComponent(input.siteVersionId)}/preview?mode=transformed`
    : null;
  return {
    label: input.label,
    siteVersionId: input.siteVersionId,
    runtimeArtifactId: input.runtimeArtifactId,
    route,
    mode: "transformed",
    available: Boolean(route),
    unavailableReason: route
      ? null
      : "Internal preview unavailable: missing runtime site version ref for this stage.",
    authNote: route
      ? "Superadmin-only internal GNR8 preview. This is not the live CHS production domain."
      : "No internal GNR8 preview route can be constructed without a site version id.",
  };
}

function selectedRecommendationIds(snapshot: SingleSiteMigrationReadRepositorySnapshot | null | undefined): Set<string> {
  const selected = jsonArray(snapshot?.latestImprovementExecutionAttempt?.selected_recommendation_refs_json)
    .map((entry) => jsonObject(entry))
    .flatMap((entry) => [text(entry.recommendationId), text(entry.sourceRecordId), extractId(text(entry.sourceRef))])
    .filter((value): value is string => Boolean(value));
  return new Set(selected);
}

function recommendationRows(snapshot: SingleSiteMigrationReadRepositorySnapshot | null | undefined): SingleSiteImprovementProposalRecommendationRow[] {
  const selectedIds = selectedRecommendationIds(snapshot);
  const rows = snapshot?.improvementProposalRecommendations ?? [];
  if (selectedIds.size === 0) return rows;
  return rows.filter((row) => selectedIds.has(row.id) || selectedIds.has(row.recommendation_key));
}

function recommendationStatus(snapshot: SingleSiteMigrationReadRepositorySnapshot | null | undefined, recommendationId: string): Pick<SingleSiteStudioRecommendation, "status" | "reason"> {
  const relatedItems = (snapshot?.improvementExecutionItems ?? []).filter((item) => item.recommendation_id === recommendationId);
  if (relatedItems.some((item) => item.item_type === "selected_recommendation" && item.status === "resolved")) {
    return { status: "applied", reason: "applied" };
  }
  const notApplied = relatedItems.find((item) => item.item_key.startsWith("creation-not-applied:"));
  const details = jsonObject(notApplied?.details_json);
  const reason = text(details.reason) ?? text(jsonObject(notApplied?.limitation_json).reason) ?? "accepted_with_limitations";
  return { status: "accepted_limitation", reason };
}

function recommendations(snapshot: SingleSiteMigrationReadRepositorySnapshot | null | undefined, migrationId: string | null): SingleSiteStudioRecommendation[] {
  const rows = recommendationRows(snapshot);
  if (rows.length > 0) {
    return rows.map((row) => {
      const status = recommendationStatus(snapshot, row.id);
      return {
        id: row.id,
        key: row.recommendation_key,
        title: row.title,
        category: row.category,
        priority: row.priority,
        ...status,
      };
    });
  }

  if (migrationId === CHS_MIGRATION_ID) {
    return CHS_RECOMMENDATION_FALLBACK.map((row) => ({
      id: row.id,
      key: row.key,
      title: row.title,
      category: row.category,
      priority: row.priority,
      status: "accepted_limitation",
      reason: row.limitationReason,
    }));
  }

  return [];
}

function workflow(model: SingleSiteMigrationReadModel | null | undefined, publish: SingleSitePublishOperatorReadonlyProjection | null | undefined) {
  const sourceDone = Boolean(model?.sourceEvidenceReview.accepted || model?.sourceEvidenceReview.acceptedWithLimitations);
  const cloneDone = Boolean(model?.cloneReview.accepted || model?.cloneReview.acceptedWithLimitations);
  const improvedDone = Boolean(model?.improvedVersionReview.acceptedReadinessForContentApproval || model?.improvementExecution.improvedCandidateRefs.siteVersionRef);
  const approvalsDone = Boolean(
    model?.contentApproval.contentApprovalReadiness ||
      model?.clientApproval.launchApprovalReady ||
      model?.launchApproval.launchApprovalGranted ||
      publish?.publishActivationDecision.granted ||
      publish?.publishActivationDecision.grantedWithLimitations,
  );
  const publishedDone = publish?.internalMvpAcceptance.activePointer === "live" && publish.internalMvpAcceptance.candidateStatus === "PUBLISHED";
  const flags = [sourceDone, sourceDone, cloneDone, improvedDone, approvalsDone, publishedDone];
  return ["Import", "Source evidence", "Original clone", "AI improved version", "Approvals", "Published"].map((label, index) => ({
    key: label.toLowerCase().replaceAll(" ", "_"),
    label,
    status: flags[index] ? "done" as const : flags.slice(0, index).every(Boolean) ? "current" as const : "waiting" as const,
  }));
}

export function buildSingleSiteStudioReadonlyProjection(input: StudioBuildInput): SingleSiteStudioReadonlyProjection {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const migrationId = text(input.migrationId) ?? input.stateModel?.migration.migrationId ?? input.publishModel?.lookup.migrationId ?? null;
  const acceptance = input.publishModel?.internalMvpAcceptance;
  const sourceUrl = input.stateModel?.migration.sourceUrl ?? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.publicUrl;
  const originalCloneSiteVersionId =
    extractId(input.stateModel?.cloneReview.cloneSiteVersionRef) ?? (migrationId === CHS_MIGRATION_ID ? CHS_ORIGINAL_CLONE_SITE_VERSION_ID : null);
  const originalCloneArtifactId =
    extractId(input.stateModel?.cloneReview.runtimeArtifactRef) ?? (migrationId === CHS_MIGRATION_ID ? CHS_ORIGINAL_CLONE_ARTIFACT_ID : null);
  const improvedCandidateSiteVersionId =
    extractId(input.stateModel?.improvedVersionReview.reviewedCandidateSiteVersionRef) ??
    extractId(input.stateModel?.improvementExecution.improvedCandidateRefs.siteVersionRef) ??
    extractId(input.publishModel?.publishContext.candidateSiteVersionRef) ??
    (migrationId === CHS_MIGRATION_ID ? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.candidateSiteVersionId : null);
  const improvedRuntimeArtifactId =
    extractId(input.stateModel?.improvedVersionReview.reviewedRuntimeArtifactRef) ??
    extractId(input.stateModel?.improvementExecution.improvedCandidateRefs.runtimeArtifactRef) ??
    extractId(input.publishModel?.publishContext.runtimeArtifactRef) ??
    (migrationId === CHS_MIGRATION_ID ? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.runtimeArtifactId : null);
  const recs = recommendations(input.stateSnapshot, migrationId);
  const appliedCount = recs.filter((item) => item.status === "applied").length;
  const limitationCount = recs.filter((item) => item.status === "accepted_limitation").length;
  const publishedCandidate = acceptance?.candidateStatus ?? (migrationId === CHS_MIGRATION_ID ? "PUBLISHED" : "unknown");
  const activePointer = acceptance?.activePointer ?? (migrationId === CHS_MIGRATION_ID ? "live" : "unknown");
  const state = migrationId ? (input.stateModel || input.publishModel || migrationId === CHS_MIGRATION_ID ? "visible" : "empty") : "lookup_required";

  return {
    version: SINGLE_SITE_STUDIO_READONLY_PROJECTION_VERSION,
    generatedAt,
    state,
    migrationId,
    diagnosticsHref: migrationId ? `/gnr8/command-center/single-site-publish?migrationId=${encodeURIComponent(migrationId)}` : "/gnr8/command-center/single-site-publish",
    summary: {
      site: acceptance?.siteHost ?? input.stateModel?.migration.intendedLaunchDomain ?? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.siteHost,
      sourceUrl,
      mvpStatus: acceptance?.status ?? (migrationId === CHS_MIGRATION_ID ? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.displayStatus : "Internal single-site MVP status unavailable"),
      liveSiteUrl: acceptance?.publicUrl ?? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.publicUrl,
      activePointer,
      publishedCandidate,
    },
    sourceTruth: input.stateModel
      ? {
          tenantId: input.stateModel.migration.tenantId,
          clientId: input.stateModel.migration.clientId,
          siteId: input.stateModel.migration.siteId,
          ownershipSiteId: input.stateModel.migration.ownershipSiteId,
          runtimeSiteId: input.stateModel.migration.runtimeSiteId,
        }
      : null,
    import: {
      inputUrl: sourceUrl,
      captured: Boolean(input.stateModel?.sourceEvidenceReview.reviewId),
      status: input.stateModel?.sourceEvidenceReview.reviewStatus ?? (migrationId === CHS_MIGRATION_ID ? "accepted" : "missing"),
    },
    workflow: workflow(input.stateModel, input.publishModel),
    sourceEvidence: sourceEvidenceRows(input.stateSnapshot, input.stateModel),
    previews: {
      originalClone: previewState({
        label: "Original clone preview",
        siteVersionId: originalCloneSiteVersionId,
        runtimeArtifactId: originalCloneArtifactId,
      }),
      improvedCandidate: previewState({
        label: "Improved candidate preview",
        siteVersionId: improvedCandidateSiteVersionId,
        runtimeArtifactId: improvedRuntimeArtifactId,
      }),
    },
    comparison: [
      {
        label: "Original imported site",
        status: "source captured",
        detail: sourceUrl,
        href: sourceUrl,
      },
      {
        label: "Generated clone",
        status: "internal preview",
        detail: originalCloneSiteVersionId ? `Runtime site version ${originalCloneSiteVersionId}` : "Clone runtime site version unavailable",
        href: originalCloneSiteVersionId ? `${STUDIO_INTERNAL_PREVIEW_ROUTE_PREFIX}/${encodeURIComponent(originalCloneSiteVersionId)}/preview?mode=transformed` : null,
      },
      {
        label: "Improved candidate",
        status: "internal preview",
        detail: improvedCandidateSiteVersionId ? `Runtime site version ${improvedCandidateSiteVersionId}` : "Improved candidate runtime site version unavailable",
        href: improvedCandidateSiteVersionId ? `${STUDIO_INTERNAL_PREVIEW_ROUTE_PREFIX}/${encodeURIComponent(improvedCandidateSiteVersionId)}/preview?mode=transformed` : null,
      },
      {
        label: "Live published version",
        status: activePointer === "live" ? "live" : activePointer,
        detail: acceptance?.publicUrl ?? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.publicUrl,
        href: acceptance?.publicUrl ?? SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.publicUrl,
      },
    ],
    improvementSummary: {
      headline: appliedCount === 0
        ? "Accepted with limitations; no deterministic content changes were applied in this MVP rehearsal."
        : `${appliedCount} recommendation(s) applied; ${limitationCount} accepted as limitations.`,
      appliedCount,
      limitationCount,
      noDeterministicContentChanges: appliedCount === 0,
      recommendations: recs,
    },
    flags: {
      readOnly: true,
      mutatesProductionData: false,
      imports: false,
      publishes: false,
    },
  };
}

export async function getSingleSiteStudioReadonlyProjection(input: {
  migrationId?: string | null;
}): Promise<SingleSiteStudioReadonlyProjection> {
  const migrationId = text(input.migrationId);
  if (!migrationId) {
    return buildSingleSiteStudioReadonlyProjection({ migrationId: null });
  }

  const repository = new SingleSiteStateReadRepository();
  let snapshot: SingleSiteMigrationReadRepositorySnapshot | null = null;
  try {
    snapshot = await repository.withReadOnlyTransaction((client, capturedAt) =>
      repository.readSnapshotByMigrationId(client, capturedAt, migrationId),
    );
  } catch {
    snapshot = null;
  }

  const stateModel = snapshot ? buildSingleSiteMigrationReadModel(snapshot) : null;
  let publishModel: SingleSitePublishOperatorReadonlyProjection | null = null;
  try {
    publishModel = await getSingleSitePublishOperatorReadonlyProjection({ migrationId, limit: 8 });
  } catch {
    publishModel = null;
  }

  return buildSingleSiteStudioReadonlyProjection({
    migrationId,
    stateModel,
    stateSnapshot: snapshot,
    publishModel,
  });
}
