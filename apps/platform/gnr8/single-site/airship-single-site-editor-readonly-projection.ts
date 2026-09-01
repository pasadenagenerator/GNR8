import "server-only";

import {
  SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE,
} from "./single-site-publish-operator-readonly-projection";
import {
  getSingleSiteStudioReadonlyProjection,
  type SingleSiteStudioReadonlyProjection,
  type SingleSiteStudioRecommendation,
} from "./single-site-studio-readonly-projection";

export const AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION = "airship-1-single-site-editor-readonly:v1" as const;

export const AIRSHIP_CHS_MIGRATION_ID = SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE.migrationId;

export type AirshipSingleSiteDraftStatus = "proposed" | "accepted" | "rejected" | "edited";

export type AirshipSingleSiteImprovementDraft = {
  id: string;
  targetSectionPage: string;
  currentTextContentSummary: string;
  proposedTextContent: string;
  reasonForChange: string;
  status: AirshipSingleSiteDraftStatus;
  previewImpact: string;
};

export type AirshipSingleSiteRecommendationMaterial = {
  id: string;
  key: string;
  title: string;
  targetSectionPage: string;
  currentTextContentSummary: string;
  proposedTextContent: string;
  reasonForChange: string;
  sourceStatus: SingleSiteStudioRecommendation["status"];
  limitationReason: string;
  previewImpact: string;
};

export type AirshipSingleSiteEditorReadonlyProjection = {
  version: typeof AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION;
  generatedAt: string;
  routeHref: string;
  state: SingleSiteStudioReadonlyProjection["state"];
  migrationId: string | null;
  importedSite: string;
  sourceUrl: string;
  liveSiteUrl: string;
  liveSiteLabel: string;
  mvpStatus: string;
  aiImprovementStatus: {
    label: string;
    detail: string;
    deterministicEditableChangesGenerated: boolean;
  };
  previews: {
    originalClone: SingleSiteStudioReadonlyProjection["previews"]["originalClone"];
    currentImprovedPublished: SingleSiteStudioReadonlyProjection["previews"]["improvedCandidate"];
  };
  links: {
    liveSite: string;
    singleSiteStudio: string;
    diagnostics: string | null;
  };
  draftPanel: {
    title: "AI improvement draft";
    emptyMessage: "No concrete editable AI changes have been generated yet.";
    drafts: AirshipSingleSiteImprovementDraft[];
    recommendationMaterial: AirshipSingleSiteRecommendationMaterial[];
  };
  flags: {
    readOnly: true;
    mutatesProductionData: false;
    imports: false;
    publishes: false;
    dryRuns: false;
    shadowPublishes: false;
    activePointerMutation: false;
  };
};

type AirshipBuildInput = {
  migrationId?: string | null;
  studioModel: SingleSiteStudioReadonlyProjection;
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

function targetForRecommendationKey(key: string): string {
  switch (key) {
    case "make-contact-actions-more-prominent":
      return "Global header and contact call-to-action areas";
    case "add-trust-signals-and-seo-structure":
      return "Homepage trust signals and SEO structure";
    case "clarify-service-positioning-copy":
      return "Homepage service positioning copy";
    case "tighten-mobile-layout-hierarchy":
      return "Mobile layout hierarchy across the single page";
    default:
      return "Imported single-site page";
  }
}

function currentSummaryForRecommendationKey(key: string): string {
  switch (key) {
    case "make-contact-actions-more-prominent":
      return "The accepted MVP clone preserves CHS contact access, but no deterministic edit exists to promote contact actions.";
    case "add-trust-signals-and-seo-structure":
      return "The accepted MVP clone carries source-derived content, but trust-signal and SEO refinements still need operator-supplied facts.";
    case "clarify-service-positioning-copy":
      return "The accepted MVP clone keeps source positioning, but no exact replacement copy has been generated for service clarity.";
    case "tighten-mobile-layout-hierarchy":
      return "The accepted MVP clone has an improved candidate preview, but no deterministic mobile hierarchy edit is available in Airship yet.";
    default:
      return "The accepted MVP contains a recommendation or limitation, but no exact current content excerpt was captured as an editable draft.";
  }
}

function proposedContentForRecommendation(recommendation: SingleSiteStudioRecommendation): string {
  return `Recommendation source material only: ${recommendation.title}. No exact replacement text or content block has been generated.`;
}

function previewImpactForRecommendation(recommendation: SingleSiteStudioRecommendation): string {
  if (recommendation.status === "applied") return "Would be visible in the improved candidate preview once represented as a concrete draft.";
  return `Accepted limitation: ${labelize(recommendation.reason)}. No preview-changing edit is available from this recommendation yet.`;
}

function recommendationMaterial(recommendations: SingleSiteStudioRecommendation[]): AirshipSingleSiteRecommendationMaterial[] {
  return recommendations.map((recommendation) => ({
    id: recommendation.id,
    key: recommendation.key,
    title: recommendation.title,
    targetSectionPage: targetForRecommendationKey(recommendation.key),
    currentTextContentSummary: currentSummaryForRecommendationKey(recommendation.key),
    proposedTextContent: proposedContentForRecommendation(recommendation),
    reasonForChange: recommendation.title,
    sourceStatus: recommendation.status,
    limitationReason: recommendation.reason,
    previewImpact: previewImpactForRecommendation(recommendation),
  }));
}

export function buildAirshipSingleSiteEditorReadonlyProjection(input: AirshipBuildInput): AirshipSingleSiteEditorReadonlyProjection {
  const migrationId = text(input.migrationId) ?? input.studioModel.migrationId;
  const routeHref = `/gnr8/airship/single-site${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`;
  const deterministicEditableChangesGenerated = input.studioModel.improvementSummary.noDeterministicContentChanges === false;
  const drafts: AirshipSingleSiteImprovementDraft[] = [];

  return {
    version: AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION,
    generatedAt: input.generatedAt ?? input.studioModel.generatedAt,
    routeHref,
    state: input.studioModel.state,
    migrationId,
    importedSite: input.studioModel.summary.site,
    sourceUrl: input.studioModel.summary.sourceUrl,
    liveSiteUrl: input.studioModel.summary.liveSiteUrl,
    liveSiteLabel: "Live site",
    mvpStatus: input.studioModel.summary.mvpStatus,
    aiImprovementStatus: {
      label: deterministicEditableChangesGenerated ? "Editable AI draft generated" : "No concrete editable AI changes generated",
      detail: input.studioModel.improvementSummary.headline,
      deterministicEditableChangesGenerated,
    },
    previews: {
      originalClone: input.studioModel.previews.originalClone,
      currentImprovedPublished: input.studioModel.previews.improvedCandidate,
    },
    links: {
      liveSite: input.studioModel.summary.liveSiteUrl,
      singleSiteStudio: `/gnr8/command-center/single-site-studio${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`,
      diagnostics: input.studioModel.diagnosticsHref,
    },
    draftPanel: {
      title: "AI improvement draft",
      emptyMessage: "No concrete editable AI changes have been generated yet.",
      drafts,
      recommendationMaterial: recommendationMaterial(input.studioModel.improvementSummary.recommendations),
    },
    flags: {
      readOnly: true,
      mutatesProductionData: false,
      imports: false,
      publishes: false,
      dryRuns: false,
      shadowPublishes: false,
      activePointerMutation: false,
    },
  };
}

export async function getAirshipSingleSiteEditorReadonlyProjection(input: {
  migrationId?: string | null;
}): Promise<AirshipSingleSiteEditorReadonlyProjection> {
  const migrationId = text(input.migrationId) ?? AIRSHIP_CHS_MIGRATION_ID;
  const studioModel = await getSingleSiteStudioReadonlyProjection({ migrationId });
  return buildAirshipSingleSiteEditorReadonlyProjection({ migrationId, studioModel });
}
