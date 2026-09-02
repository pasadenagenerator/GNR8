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
  persistence: "generated_read_only";
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

  return [
    {
      id: "airship-chs-home-hero-headline",
      targetSectionPage: "Homepage / hero headline",
      currentTextContentSummary: "The imported homepage hero/title is source-derived and reads as the company name, `TRANSPORTI MAVER D.O.O.`, before the service value is clear.",
      proposedTextContent: "Prevozi vozil po Evropi od leta 1982",
      reasonForChange: "Lead with the concrete service and longevity so visitors understand the offer before reading supporting company details.",
      status: "proposed",
      previewImpact: "AI draft preview headline changes from a company-name-only first impression to a service-led transport promise.",
    },
    {
      id: "airship-chs-home-hero-value-proposition",
      targetSectionPage: "Homepage / hero subheading",
      currentTextContentSummary: "The source text explains the fleet and European coverage later in the page: 15 auto transporters, EU destinations, EU 6 trucks, direct delivery, guarded parking, and workshop support.",
      proposedTextContent: "S 15 avtotransporterji za Nemcijo, Italijo, Spanijo, Svico in Francijo poskrbimo za zanesljiv prevzem, zbirnik in dostavo vozil do stranke ali varovanega parkirisca.",
      reasonForChange: "Condense the strongest source facts into one first-viewport value proposition without adding new claims outside the imported content.",
      status: "proposed",
      previewImpact: "AI draft preview adds a scannable service summary under the hero headline.",
    },
    {
      id: "airship-chs-home-contact-cta",
      targetSectionPage: "Homepage / contact call-to-action",
      currentTextContentSummary: "A safe contact target exists in the source material: the homepage includes `Kontakt`, phone links, and email links for Transporti Maver.",
      proposedTextContent: "Posljite povprasevanje za prevoz vozila",
      reasonForChange: "Make the contact action outcome-specific while keeping it tied to the existing contact section and source contact channels.",
      status: "proposed",
      previewImpact: "AI draft preview shows a clearer primary contact CTA; it is not wired to mutate or publish production content.",
    },
  ];
}

function draftPreview(drafts: AirshipSingleSiteImprovementDraft[]): AirshipSingleSiteDraftPreview | null {
  const headline = drafts.find((draft) => draft.id === "airship-chs-home-hero-headline")?.proposedTextContent;
  const subheading = drafts.find((draft) => draft.id === "airship-chs-home-hero-value-proposition")?.proposedTextContent;
  const primaryCtaLabel = drafts.find((draft) => draft.id === "airship-chs-home-contact-cta")?.proposedTextContent ?? null;
  if (!headline || !subheading) return null;

  return {
    label: "AI draft preview",
    appliedToLiveSite: false,
    persistence: "generated_read_only",
    note: "Generated Airship draft preview only. These proposed edits are not live, not published, and not persisted as production content.",
    hero: {
      eyebrow: "TRANSPORTI MAVER D.O.O.",
      headline,
      subheading,
      primaryCtaLabel,
      secondaryContactText: "+386 (0)1 366 38 36 - transporti.maver@siol.net",
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
        ? `${drafts.length} proposed Airship draft edit(s) generated for the imported homepage. Draft edits are read-only in this phase and are not applied to the live site.`
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
      controlNote: "Accept, reject, and save are disabled because this Airship phase generates a read-only draft preview without production persistence.",
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
