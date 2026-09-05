import "server-only";

import {
  SINGLE_SITE_INTERNAL_MVP_ACCEPTANCE_EVIDENCE,
} from "./single-site-publish-operator-readonly-projection";
import {
  getSingleSiteStudioReadonlyProjection,
  type SingleSiteStudioReadonlyProjection,
  type SingleSiteStudioRecommendation,
} from "./single-site-studio-readonly-projection";
import {
  AirshipSingleSiteDraftService,
  AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION,
  DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS,
  sanitizeDraftStyleSettings,
  type AirshipSingleSiteDraftRecord,
  type AirshipSingleSiteDraftStyleSettings,
} from "./airship-single-site-draft-service";
import {
  readLatestAirshipSingleSiteDraftCandidatePreview,
  type AirshipDraftCandidatePreviewRef,
} from "./airship-single-site-draft-candidate-service";

export const AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION = "airship-1-single-site-editor-readonly:v1" as const;
export type { AirshipSingleSiteDraftStyleSettings };

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
  persistence: "browser_local_only" | "saved_airship_draft";
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
  studioSourceTruth: {
    tenantId: string | null;
    clientId: string | null;
    siteId: string | null;
    ownershipSiteId: string | null;
    runtimeSiteId: string | null;
  } | null;
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
    currentLivePublished: SingleSiteStudioReadonlyProjection["previews"]["improvedCandidate"];
    airshipDraftCandidate: AirshipDraftCandidatePreviewRef | null;
  };
  links: {
    liveSite: string;
    airshipEditor: string;
    singleSiteStudio: string;
    diagnostics: string | null;
  };
  draftPanel: {
    title: "AI improvement draft";
    emptyMessage: "No concrete editable AI changes have been generated yet.";
    drafts: AirshipSingleSiteImprovementDraft[];
    draftPreview: AirshipSingleSiteDraftPreview | null;
    controlMode: "persistent_airship_draft";
    controlNote: string;
    persistence: {
      label: "Saved Airship draft" | "Unsaved Airship draft";
      draftId: string | null;
      draftStatus: string | null;
      version: number | null;
      lastSavedAt: string | null;
      styleSettings: AirshipSingleSiteDraftStyleSettings;
      notAppliedToLiveSite: true;
      notPublished: true;
    };
    recommendationMaterial: AirshipSingleSiteRecommendationMaterial[];
  };
  flags: {
    readOnly: false;
    mutatesProductionData: false;
    mutatesDraftData: true;
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
  persistedDraft?: AirshipSingleSiteDraftRecord | null;
  airshipDraftCandidate?: AirshipDraftCandidatePreviewRef | null;
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

export function chsDrafts(migrationId: string | null): AirshipSingleSiteImprovementDraft[] {
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

function persistedDraftForMigration(draft: AirshipSingleSiteDraftRecord | null | undefined, migrationId: string | null): AirshipSingleSiteDraftRecord | null {
  if (!draft || !migrationId || draft.migrationId !== migrationId) return null;
  if (airshipChsDraftContainsForbiddenMaverCopy(draft.draftEdits)) return null;
  return draft;
}

function persistedStyleSettings(draft: AirshipSingleSiteDraftRecord | null): AirshipSingleSiteDraftStyleSettings {
  return draft
    ? sanitizeDraftStyleSettings(draft.metadata.styleSettings)
    : DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS;
}

function mergePersistedDrafts(
  generatedDrafts: AirshipSingleSiteImprovementDraft[],
  persistedDraft: AirshipSingleSiteDraftRecord | null,
): AirshipSingleSiteImprovementDraft[] {
  if (!persistedDraft) return generatedDrafts;
  const generatedById = new Map(generatedDrafts.map((draft) => [draft.id, draft]));
  return generatedDrafts.map((generated) => {
    const persisted = persistedDraft.draftEdits.find((draft) => draft.id === generated.id);
    if (!persisted) return generated;
    return {
      ...generated,
      proposedTextContent: persisted.proposedTextContent,
      status: persisted.status,
    };
  }).filter((draft) => generatedById.has(draft.id));
}

function effectivePreviewText(
  draftId: string,
  drafts: AirshipSingleSiteImprovementDraft[],
  generatedDrafts: AirshipSingleSiteImprovementDraft[],
): string | null {
  const draft = drafts.find((item) => item.id === draftId);
  if (!draft) return null;
  if (draft.status !== "rejected") return draft.proposedTextContent;
  return generatedDrafts.find((item) => item.id === draftId)?.proposedTextContent ?? null;
}

function draftPreview(
  drafts: AirshipSingleSiteImprovementDraft[],
  generatedDrafts: AirshipSingleSiteImprovementDraft[],
  persistedDraft: AirshipSingleSiteDraftRecord | null,
): AirshipSingleSiteDraftPreview | null {
  const headline = effectivePreviewText("airship-chs-home-hero-headline", drafts, generatedDrafts);
  const subheading = effectivePreviewText("airship-chs-home-hero-value-proposition", drafts, generatedDrafts);
  const primaryCtaLabel = effectivePreviewText("airship-chs-home-contact-cta", drafts, generatedDrafts);
  if (!headline || !subheading) return null;

  return {
    label: "AI draft preview",
    appliedToLiveSite: false,
    persistence: persistedDraft ? "saved_airship_draft" : "browser_local_only",
    note: persistedDraft
      ? "Saved Airship draft preview only. Not applied to live site. Not published."
      : "Unsaved Airship draft preview only. Browser edits are not live, not published, and not persisted as production content.",
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
  const generatedDrafts = chsDrafts(migrationId);
  const persistedDraft = persistedDraftForMigration(input.persistedDraft, migrationId);
  const drafts = mergePersistedDrafts(generatedDrafts, persistedDraft);
  const styleSettings = persistedStyleSettings(persistedDraft);
  const deterministicEditableChangesGenerated = drafts.length > 0 || input.studioModel.improvementSummary.noDeterministicContentChanges === false;

  return {
    version: AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION,
    generatedAt: input.generatedAt ?? input.studioModel.generatedAt,
    routeHref,
    state: input.studioModel.state,
    migrationId,
    importedSite: input.studioModel.summary.site,
    sourceUrl: input.studioModel.summary.sourceUrl,
    studioSourceTruth: input.studioModel.sourceTruth ?? null,
    liveSiteUrl: input.studioModel.summary.liveSiteUrl,
    liveSiteLabel: "Live site",
    mvpStatus: input.studioModel.summary.mvpStatus,
    aiImprovementStatus: {
      label: deterministicEditableChangesGenerated ? "Editable AI draft generated" : "No concrete editable AI changes generated",
      detail: drafts.length > 0
        ? persistedDraft
          ? `${drafts.length} Airship draft edit(s) loaded from persistent draft storage. Saved Airship draft. Not applied to live site. Not published.`
          : `${drafts.length} proposed Airship draft edit(s) generated for the imported CHS homepage. Browser edits are local-only and are not applied to the live site.`
        : input.studioModel.improvementSummary.headline,
      deterministicEditableChangesGenerated,
    },
    previews: {
      originalClone: input.studioModel.previews.originalClone,
      currentImprovedPublished: input.studioModel.previews.improvedCandidate,
      currentLivePublished: input.studioModel.previews.improvedCandidate,
      airshipDraftCandidate: input.airshipDraftCandidate ?? null,
    },
    links: {
      liveSite: input.studioModel.summary.liveSiteUrl,
      airshipEditor: `/gnr8/airship/single-site/editor${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`,
      singleSiteStudio: `/gnr8/command-center/single-site-studio${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`,
      diagnostics: input.studioModel.diagnosticsHref,
    },
    draftPanel: {
      title: "AI improvement draft",
      emptyMessage: "No concrete editable AI changes have been generated yet.",
      drafts,
      draftPreview: draftPreview(drafts, generatedDrafts, persistedDraft),
      controlMode: "persistent_airship_draft",
      controlNote: "Save, accept, and reject update only the saved Airship draft workspace. Not applied to live site. Not published.",
      persistence: {
        label: persistedDraft ? "Saved Airship draft" : "Unsaved Airship draft",
        draftId: persistedDraft?.id ?? null,
        draftStatus: persistedDraft?.draftStatus ?? null,
        version: persistedDraft?.version ?? null,
        lastSavedAt: persistedDraft?.updatedAt ?? null,
        styleSettings,
        notAppliedToLiveSite: true,
        notPublished: true,
      },
      recommendationMaterial: recommendationMaterial(input.studioModel.improvementSummary.recommendations),
    },
    flags: {
      readOnly: false,
      mutatesProductionData: false,
      mutatesDraftData: true,
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
  let persistedDraft: AirshipSingleSiteDraftRecord | null = null;
  try {
    persistedDraft = await new AirshipSingleSiteDraftService().readCurrentDraft(migrationId);
  } catch {
    persistedDraft = null;
  }
  let airshipDraftCandidate: AirshipDraftCandidatePreviewRef | null = null;
  try {
    airshipDraftCandidate = await readLatestAirshipSingleSiteDraftCandidatePreview({
      migrationId,
      draftId: persistedDraft?.id ?? null,
    });
  } catch {
    airshipDraftCandidate = null;
  }
  return buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId,
    studioModel,
    persistedDraft,
    airshipDraftCandidate,
    generatedAt: studioModel.generatedAt,
  });
}

export function buildAirshipSingleSiteDraftSeed(input: {
  model: AirshipSingleSiteEditorReadonlyProjection;
}): Omit<import("./airship-single-site-draft-service").AirshipSingleSiteDraftSeed, "draftEdits"> & {
  draftEdits: import("./airship-single-site-draft-service").AirshipSingleSiteDraftEdit[];
} {
  return {
    migrationId: text(input.model.migrationId) ?? AIRSHIP_CHS_MIGRATION_ID,
    tenantId: input.model.studioSourceTruth?.tenantId ?? null,
    clientId: input.model.studioSourceTruth?.clientId ?? null,
    siteId: input.model.studioSourceTruth?.siteId ?? null,
    agencyId: null,
    sourceUrl: input.model.sourceUrl,
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: input.model.previews.originalClone.siteVersionId,
      originalCloneRuntimeArtifactId: input.model.previews.originalClone.runtimeArtifactId,
      improvedCandidateSiteVersionId: input.model.previews.currentImprovedPublished.siteVersionId,
      improvedCandidateRuntimeArtifactId: input.model.previews.currentImprovedPublished.runtimeArtifactId,
    },
    draftEdits: input.model.draftPanel.drafts.map((draft) => ({
      id: draft.id,
      targetSectionPage: draft.targetSectionPage,
      currentTextContentSummary: draft.currentTextContentSummary,
      proposedTextContent: draft.proposedTextContent,
      reasonForChange: draft.reasonForChange,
      status: draft.status === "accepted" || draft.status === "rejected" || draft.status === "edited" ? draft.status : "proposed",
      previewImpact: draft.previewImpact,
    })),
    metadata: {
      serviceVersion: AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION,
      projectionVersion: AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION,
      previewPersistence: input.model.draftPanel.draftPreview?.persistence ?? "browser_local_only",
      liveSiteUrl: input.model.liveSiteUrl,
      liveBoundary: "not_applied_to_live_site",
      styleSettings: input.model.draftPanel.persistence.styleSettings,
    },
  };
}
