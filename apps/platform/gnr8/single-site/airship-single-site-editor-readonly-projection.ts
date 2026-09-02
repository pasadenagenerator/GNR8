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

export type AirshipSingleSiteDraftPreview = {
  label: "AI draft preview";
  appliedToLiveSite: false;
  persistence: "browser_local_only";
  note: string;
  hero: {
    eyebrow: string;
    headline: string;
    subheading: string;
    primaryCtaLabel: string | null;
    secondaryContactText: string | null;
  };
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
    draftPreview: AirshipSingleSiteDraftPreview | null;
    controlMode: "disabled_read_only_generated_draft";
    controlNote: string;
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

export const AIRSHIP_CHS_FORBIDDEN_DRAFT_PATTERNS = [
  /transporti\s+maver/i,
  /maver/i,
  /prevozi\s+vozil/i,
  /prevozi\s+po\s+evropi/i,
  /avto\s*transporter/i,
  /avtotransporter/i,
  /prevoz\s+vozil/i,
  /transportimaver/i,
] as const;

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

function chsDrafts(migrationId: string | null): AirshipSingleSiteImprovementDraft[] {
  if (migrationId !== AIRSHIP_CHS_MIGRATION_ID) return [];

  const drafts: AirshipSingleSiteImprovementDraft[] = [
    {
      id: "airship-chs-home-hero-headline",
      targetSectionPage: "Homepage / hero headline",
      currentTextContentSummary: "Captured CHS homepage evidence includes the hero line `Less risk. More control. Better IT.` and the CHS identity in the page title and footer.",
      proposedTextContent: "Less risk. More control. Better IT.",
      reasonForChange: "Keep the first-viewport headline anchored to CHS source copy and make the CHS identity explicit without introducing outside claims.",
      status: "proposed",
      previewImpact: "AI draft preview opens with the CHS homepage headline instead of unrelated company or transport copy.",
    },
    {
      id: "airship-chs-home-hero-value-proposition",
      targetSectionPage: "Homepage / hero subheading",
      currentTextContentSummary: "Captured CHS source evidence says CHS delivers advanced solutions in cybersecurity, data systems, and hybrid infrastructure across the Adriatic region.",
      proposedTextContent: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
      reasonForChange: "Condense the source-supported service description into a clearer first-viewport value proposition.",
      status: "proposed",
      previewImpact: "AI draft preview explains CHS's IT focus in one scannable line under the headline.",
    },
    {
      id: "airship-chs-home-contact-cta",
      targetSectionPage: "Homepage / contact call-to-action",
      currentTextContentSummary: "Captured CHS source evidence includes `Contact us`, `sales@chs.si`, and a homepage contact form.",
      proposedTextContent: "Contact CHS at sales@chs.si",
      reasonForChange: "Make the contact action clearer while staying tied to source-supported CHS contact evidence.",
      status: "proposed",
      previewImpact: "AI draft preview shows a clearer CHS contact CTA; it is not wired to mutate or publish production content.",
    },
  ];

  assertChsDraftIdentity(drafts);
  return drafts;
}

export function airshipChsDraftContainsForbiddenMaverCopy(value: unknown): boolean {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return AIRSHIP_CHS_FORBIDDEN_DRAFT_PATTERNS.some((pattern) => pattern.test(serialized));
}

function assertChsDraftIdentity(drafts: AirshipSingleSiteImprovementDraft[]) {
  if (airshipChsDraftContainsForbiddenMaverCopy(drafts)) {
    throw new Error("Airship CHS draft identity violation: Maver transport copy is not allowed in CHS drafts.");
  }
}

function draftPreview(drafts: AirshipSingleSiteImprovementDraft[]): AirshipSingleSiteDraftPreview | null {
  const headline = drafts.find((draft) => draft.id === "airship-chs-home-hero-headline")?.proposedTextContent;
  const subheading = drafts.find((draft) => draft.id === "airship-chs-home-hero-value-proposition")?.proposedTextContent;
  const primaryCtaLabel = drafts.find((draft) => draft.id === "airship-chs-home-contact-cta")?.proposedTextContent ?? null;
  if (!headline || !subheading) return null;

  return {
    label: "AI draft preview",
    appliedToLiveSite: false,
    persistence: "browser_local_only",
    note: "Local Airship draft preview only. Browser edits are not live, not published, and not persisted as production content.",
    hero: {
      eyebrow: "CHS d.o.o.",
      headline,
      subheading,
      primaryCtaLabel,
      secondaryContactText: "Parmova ulica 51, Ljubljana",
    },
  };
}

export function buildAirshipSingleSiteEditorReadonlyProjection(input: AirshipBuildInput): AirshipSingleSiteEditorReadonlyProjection {
  const migrationId = text(input.migrationId) ?? input.studioModel.migrationId;
  const routeHref = `/gnr8/airship/single-site${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`;
  const drafts = chsDrafts(migrationId);
  const deterministicEditableChangesGenerated = drafts.length > 0 || input.studioModel.improvementSummary.noDeterministicContentChanges === false;

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
      detail: drafts.length > 0
        ? `${drafts.length} proposed Airship draft edit(s) generated for the imported CHS homepage. Browser edits are local-only and are not applied to the live site.`
        : input.studioModel.improvementSummary.headline,
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
      draftPreview: draftPreview(drafts),
      controlMode: "disabled_read_only_generated_draft",
      controlNote: "Accept, reject, and save are disabled because this Airship phase supports browser-local draft editing only; persistence is not enabled.",
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
