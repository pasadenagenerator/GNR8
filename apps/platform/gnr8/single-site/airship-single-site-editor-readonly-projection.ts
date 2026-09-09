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

export type AirshipSingleSiteDraftFieldKey = "headline" | "subheading" | "ctaLabel";
export type AirshipSingleSiteDraftStatus = "proposed" | "accepted" | "rejected" | "edited";

export type AirshipSingleSiteImprovementDraft = {
  id: string;
  fieldKey?: AirshipSingleSiteDraftFieldKey;
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

export type AirshipImportedSiteEditableSection = {
  key: "hero" | "cta" | "source";
  label: string;
  detail: string;
  mappedDraftFieldIds: string[];
  sourceStatus: string;
};

export type AirshipImportedSiteSourceEvidenceSummary = {
  status: "source_supported" | "partial_evidence" | "missing_evidence";
  detail: string;
  evidenceItems: SingleSiteStudioReadonlyProjection["sourceEvidence"];
};

export type AirshipImportedSiteEditorModel = {
  siteLabel: string;
  sourceUrl: string;
  liveUrl: string | null;
  sourceEvidenceSummary: AirshipImportedSiteSourceEvidenceSummary;
  editableSections: AirshipImportedSiteEditableSection[];
  draftFields: Array<{
    fieldKey: AirshipSingleSiteDraftFieldKey;
    draftId: string;
    label: string;
    sectionKey: "hero" | "cta";
    sourceStatus: string;
  }>;
  latestDraft: {
    draftId: string | null;
    draftStatus: string | null;
    version: number | null;
    lastSavedAt: string | null;
  };
  latestInternalPreviewCandidate: AirshipDraftCandidatePreviewRef | null;
  publishedVersionRefs: {
    siteVersionId: string | null;
    runtimeArtifactId: string | null;
    liveUrl: string | null;
    activePointer: SingleSiteStudioReadonlyProjection["summary"]["activePointer"];
    publishedCandidate: string;
  };
};

export type AirshipSingleSiteEditorReadonlyProjection = {
  version: typeof AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION;
  generatedAt: string;
  routeHref: string;
  state: SingleSiteStudioReadonlyProjection["state"];
  migrationId: string | null;
  importedSite: string;
  sourceUrl: string;
  importedSiteModel: AirshipImportedSiteEditorModel;
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

function domainFromUrl(value: string | null | undefined): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname.replace(/^www\./i, "");
  } catch {
    return normalized.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0]?.trim() || null;
  }
}

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function humanSiteLabel(studioModel: SingleSiteStudioReadonlyProjection): string {
  return text(studioModel.summary.site) ?? domainFromUrl(studioModel.summary.sourceUrl) ?? "Imported single-site";
}

function organizationLabel(siteLabel: string): string {
  const fromDomain = siteLabel.split(".")[0]?.trim();
  if (!fromDomain) return siteLabel;
  return fromDomain
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.length <= 4 ? part.toUpperCase() : sentenceCase(part.toLocaleLowerCase("en-US")))
    .join(" ");
}

function slugPart(value: string): string {
  const normalized = value
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "imported-site";
}

export function airshipDraftIdForImportedSiteField(input: {
  migrationId: string | null;
  siteLabel: string;
  fieldKey: AirshipSingleSiteDraftFieldKey;
}): string {
  const migrationPart = slugPart(input.migrationId ?? input.siteLabel);
  return `airship-${migrationPart}-home-${input.fieldKey}`;
}

export function airshipDraftFieldKey(draft: Pick<AirshipSingleSiteImprovementDraft, "id" | "targetSectionPage"> & {
  fieldKey?: unknown;
}): AirshipSingleSiteDraftFieldKey | null {
  if (draft.fieldKey === "headline" || draft.fieldKey === "subheading" || draft.fieldKey === "ctaLabel") return draft.fieldKey;
  const haystack = `${draft.id} ${draft.targetSectionPage}`.toLocaleLowerCase("en-US");
  if (/cta|call.to.action|button|contact/.test(haystack)) return "ctaLabel";
  if (/subheading|subheadline|subtitle|value.proposition|body|description/.test(haystack)) return "subheading";
  if (/headline|heading|hero|h1|title/.test(haystack)) return "headline";
  return null;
}

function evidenceText(studioModel: SingleSiteStudioReadonlyProjection): string {
  return studioModel.sourceEvidence
    .map((item) => [item.label, item.status, item.detail].map((part) => text(part)).filter(Boolean).join(": "))
    .filter(Boolean)
    .join("\n");
}

function quotedEvidenceValues(value: string): string[] {
  const matches = Array.from(value.matchAll(/[`"“”']([^`"“”']{2,220})[`"“”']/g))
    .map((match) => text(match[1]))
    .filter((part): part is string => Boolean(part));
  return Array.from(new Set(matches));
}

function evidenceRowsFor(input: {
  studioModel: SingleSiteStudioReadonlyProjection;
  patterns: RegExp[];
}): SingleSiteStudioReadonlyProjection["sourceEvidence"] {
  return input.studioModel.sourceEvidence.filter((item) => {
    const haystack = `${item.label} ${item.status} ${item.detail}`;
    return input.patterns.some((pattern) => pattern.test(haystack));
  });
}

function firstQuotedEvidence(input: {
  studioModel: SingleSiteStudioReadonlyProjection;
  rowPatterns: RegExp[];
  valuePatterns?: RegExp[];
}): string | null {
  const rows = evidenceRowsFor({ studioModel: input.studioModel, patterns: input.rowPatterns });
  const candidates = quotedEvidenceValues(rows.map((row) => row.detail).join("\n"));
  const matched = input.valuePatterns
    ? candidates.find((candidate) => input.valuePatterns?.some((pattern) => pattern.test(candidate)))
    : candidates[0];
  return text(matched) ?? null;
}

function firstEmail(value: string): string | null {
  return text(value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]);
}

function firstPhone(value: string): string | null {
  return text(value.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/)?.[0]);
}

function sourceEvidenceSummary(studioModel: SingleSiteStudioReadonlyProjection): AirshipImportedSiteSourceEvidenceSummary {
  const items = studioModel.sourceEvidence;
  const present = items.filter((item) => /present|accepted|captured|available/i.test(item.status)).length;
  if (present > 0) {
    return {
      status: present >= 2 ? "source_supported" : "partial_evidence",
      detail: `${present} source evidence item(s) available for ${humanSiteLabel(studioModel)}.`,
      evidenceItems: items,
    };
  }
  return {
    status: items.length > 0 ? "partial_evidence" : "missing_evidence",
    detail: items[0]?.detail ?? "No source evidence rows were available for this imported-site editor projection.",
    evidenceItems: items,
  };
}

function deriveImportedSiteDraftTexts(studioModel: SingleSiteStudioReadonlyProjection): {
  headline: string | null;
  subheading: string | null;
  ctaLabel: string | null;
  secondaryContactText: string | null;
} {
  const siteLabel = humanSiteLabel(studioModel);
  const organization = organizationLabel(siteLabel);
  const evidence = evidenceText(studioModel);
  const headline = firstQuotedEvidence({
    studioModel,
    rowPatterns: [/hero|headline|h1|title|identity|metadata|text/i],
    valuePatterns: [/[^@]{5,}/],
  });
  const subheading = firstQuotedEvidence({
    studioModel,
    rowPatterns: [/subheading|value|service|position|description|text|metadata/i],
    valuePatterns: [/.{45,}/],
  });
  const explicitCta = firstQuotedEvidence({
    studioModel,
    rowPatterns: [/cta|call.to.action|contact|button|form|email/i],
  });
  const email = firstEmail(evidence);
  const phone = firstPhone(evidence);
  const ctaLabel = explicitCta ?? (email ? `Contact ${organization} at ${email}` : null);
  return {
    headline,
    subheading,
    ctaLabel,
    secondaryContactText: email ? (phone ? `${email} / ${phone}` : email) : phone,
  };
}

function draftFieldSourceSummary(input: {
  studioModel: SingleSiteStudioReadonlyProjection;
  fieldKey: AirshipSingleSiteDraftFieldKey;
  fallback: string;
}): string {
  const patterns = input.fieldKey === "headline"
    ? [/hero|headline|h1|title|identity|metadata|text/i]
    : input.fieldKey === "subheading"
      ? [/subheading|value|service|position|description|text|metadata/i]
      : [/cta|call.to.action|contact|button|form|email/i];
  const rows = evidenceRowsFor({ studioModel: input.studioModel, patterns });
  const detail = rows.map((row) => row.detail).find((value) => text(value));
  return text(detail) ?? input.fallback;
}

function importedSiteDrafts(input: {
  migrationId: string | null;
  studioModel: SingleSiteStudioReadonlyProjection;
}): AirshipSingleSiteImprovementDraft[] {
  const siteLabel = humanSiteLabel(input.studioModel);
  const organization = organizationLabel(siteLabel);
  const texts = deriveImportedSiteDraftTexts(input.studioModel);
  const configs: Array<{
    fieldKey: AirshipSingleSiteDraftFieldKey;
    targetSectionPage: string;
    proposedTextContent: string | null;
    reasonForChange: string;
    previewImpact: string;
    fallbackSummary: string;
  }> = [
    {
      fieldKey: "headline",
      targetSectionPage: "Homepage / hero headline",
      proposedTextContent: texts.headline,
      reasonForChange: `Keep the first-viewport headline anchored to captured ${siteLabel} source evidence.`,
      previewImpact: `Airship draft preview opens with source-supported ${siteLabel} homepage headline copy.`,
      fallbackSummary: `No source-supported hero headline text was available for ${siteLabel}.`,
    },
    {
      fieldKey: "subheading",
      targetSectionPage: "Homepage / hero subheading",
      proposedTextContent: texts.subheading,
      reasonForChange: `Condense source-supported ${siteLabel} positioning into a scannable first-viewport value proposition.`,
      previewImpact: `Airship draft preview explains ${organization}'s source-supported focus under the headline.`,
      fallbackSummary: `No source-supported hero subheading text was available for ${siteLabel}.`,
    },
    {
      fieldKey: "ctaLabel",
      targetSectionPage: "Homepage / contact call-to-action",
      proposedTextContent: texts.ctaLabel,
      reasonForChange: `Keep the primary action tied to captured ${siteLabel} contact evidence.`,
      previewImpact: "Airship draft preview shows a source-supported contact CTA; it is not wired to mutate or publish production content.",
      fallbackSummary: `No source-supported contact CTA text was available for ${siteLabel}.`,
    },
  ];

  return configs
    .filter((config) => text(config.proposedTextContent))
    .map((config) => ({
      id: airshipDraftIdForImportedSiteField({
        migrationId: input.migrationId,
        siteLabel,
        fieldKey: config.fieldKey,
      }),
      fieldKey: config.fieldKey,
      targetSectionPage: config.targetSectionPage,
      currentTextContentSummary: draftFieldSourceSummary({
        studioModel: input.studioModel,
        fieldKey: config.fieldKey,
        fallback: config.fallbackSummary,
      }),
      proposedTextContent: config.proposedTextContent ?? "",
      reasonForChange: config.reasonForChange,
      status: "proposed",
      previewImpact: config.previewImpact,
    }));
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
      return "The accepted MVP clone preserves imported-site contact access, but no deterministic edit exists to promote contact actions.";
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

export function airshipChsDraftContainsForbiddenMaverCopy(value: unknown): boolean {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return AIRSHIP_CHS_FORBIDDEN_DRAFT_PATTERNS.some((pattern) => pattern.test(serialized));
}

function assertChsDraftIdentity(drafts: AirshipSingleSiteImprovementDraft[]) {
  if (airshipChsDraftContainsForbiddenMaverCopy(drafts)) {
    throw new Error("Airship CHS draft identity violation: Maver transport copy is not allowed in CHS drafts.");
  }
}

function chsSourceEvidenceAllowsForbiddenMaverCopy(input: {
  studioModel: SingleSiteStudioReadonlyProjection;
  migrationId: string | null;
}): boolean {
  if (input.migrationId !== AIRSHIP_CHS_MIGRATION_ID) return true;
  return airshipChsDraftContainsForbiddenMaverCopy(evidenceText(input.studioModel));
}

function persistedDraftForMigration(input: {
  draft: AirshipSingleSiteDraftRecord | null | undefined;
  migrationId: string | null;
  studioModel: SingleSiteStudioReadonlyProjection;
}): AirshipSingleSiteDraftRecord | null {
  const { draft, migrationId } = input;
  if (!draft || !migrationId || draft.migrationId !== migrationId) return null;
  if (!chsSourceEvidenceAllowsForbiddenMaverCopy({ studioModel: input.studioModel, migrationId }) && airshipChsDraftContainsForbiddenMaverCopy(draft.draftEdits)) return null;
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
    const generatedField = airshipDraftFieldKey(generated);
    const persisted = persistedDraft.draftEdits.find((draft) =>
      draft.id === generated.id || (generatedField && airshipDraftFieldKey(draft) === generatedField)
    );
    if (!persisted) return generated;
    return {
      ...generated,
      proposedTextContent: persisted.proposedTextContent,
      status: persisted.status,
    };
  }).filter((draft) => generatedById.has(draft.id));
}

function effectivePreviewText(
  fieldKey: AirshipSingleSiteDraftFieldKey,
  drafts: AirshipSingleSiteImprovementDraft[],
  generatedDrafts: AirshipSingleSiteImprovementDraft[],
): string | null {
  const draft = drafts.find((item) => airshipDraftFieldKey(item) === fieldKey);
  if (!draft) return null;
  if (draft.status !== "rejected") return draft.proposedTextContent;
  return generatedDrafts.find((item) => airshipDraftFieldKey(item) === fieldKey)?.proposedTextContent ?? null;
}

function draftPreview(
  drafts: AirshipSingleSiteImprovementDraft[],
  generatedDrafts: AirshipSingleSiteImprovementDraft[],
  persistedDraft: AirshipSingleSiteDraftRecord | null,
  studioModel: SingleSiteStudioReadonlyProjection,
): AirshipSingleSiteDraftPreview | null {
  const headline = effectivePreviewText("headline", drafts, generatedDrafts);
  const subheading = effectivePreviewText("subheading", drafts, generatedDrafts);
  const primaryCtaLabel = effectivePreviewText("ctaLabel", drafts, generatedDrafts);
  if (!headline || !subheading) return null;
  const siteLabel = humanSiteLabel(studioModel);
  const fallbackContact = deriveImportedSiteDraftTexts(studioModel).secondaryContactText;

  return {
    label: "AI draft preview",
    appliedToLiveSite: false,
    persistence: persistedDraft ? "saved_airship_draft" : "browser_local_only",
    note: persistedDraft
      ? "Saved Airship draft preview only. Not applied to live site. Not published."
      : "Unsaved Airship draft preview only. Browser edits are not live, not published, and not persisted as production content.",
    hero: {
      eyebrow: organizationLabel(siteLabel),
      headline,
      subheading,
      primaryCtaLabel,
      secondaryContactText: fallbackContact,
    },
  };
}

function editableSections(drafts: AirshipSingleSiteImprovementDraft[]): AirshipImportedSiteEditableSection[] {
  const idsFor = (fieldKeys: AirshipSingleSiteDraftFieldKey[]) =>
    drafts.filter((draft) => {
      const fieldKey = airshipDraftFieldKey(draft);
      return fieldKey ? fieldKeys.includes(fieldKey) : false;
    }).map((draft) => draft.id);
  return [
    {
      key: "hero",
      label: "Hero / intro",
      detail: "Headline, subheading, spacing, tint",
      mappedDraftFieldIds: idsFor(["headline", "subheading"]),
      sourceStatus: idsFor(["headline", "subheading"]).length >= 2 ? "source-supported hero draft fields" : "partial source-supported hero draft fields",
    },
    {
      key: "cta",
      label: "CTA",
      detail: "Primary action label and color",
      mappedDraftFieldIds: idsFor(["ctaLabel"]),
      sourceStatus: idsFor(["ctaLabel"]).length > 0 ? "source-supported CTA draft field" : "CTA draft field unavailable from source evidence",
    },
    {
      key: "source",
      label: "Source material",
      detail: "Imported-site evidence and internal draft refs",
      mappedDraftFieldIds: drafts.map((draft) => draft.id),
      sourceStatus: "source material readback only",
    },
  ];
}

function importedSiteEditorModel(input: {
  studioModel: SingleSiteStudioReadonlyProjection;
  migrationId: string | null;
  drafts: AirshipSingleSiteImprovementDraft[];
  persistedDraft: AirshipSingleSiteDraftRecord | null;
  airshipDraftCandidate: AirshipDraftCandidatePreviewRef | null;
}): AirshipImportedSiteEditorModel {
  const siteLabel = humanSiteLabel(input.studioModel);
  return {
    siteLabel,
    sourceUrl: input.studioModel.summary.sourceUrl,
    liveUrl: text(input.studioModel.summary.liveSiteUrl),
    sourceEvidenceSummary: sourceEvidenceSummary(input.studioModel),
    editableSections: editableSections(input.drafts),
    draftFields: input.drafts.map((draft) => ({
      fieldKey: airshipDraftFieldKey(draft),
      draftId: draft.id,
      label: draft.targetSectionPage,
      sectionKey: airshipDraftFieldKey(draft) === "ctaLabel" ? "cta" : "hero",
      sourceStatus: draft.currentTextContentSummary,
    })).filter((draft): draft is AirshipImportedSiteEditorModel["draftFields"][number] => Boolean(draft.fieldKey)),
    latestDraft: {
      draftId: input.persistedDraft?.id ?? null,
      draftStatus: input.persistedDraft?.draftStatus ?? null,
      version: input.persistedDraft?.version ?? null,
      lastSavedAt: input.persistedDraft?.updatedAt ?? null,
    },
    latestInternalPreviewCandidate: input.airshipDraftCandidate,
    publishedVersionRefs: {
      siteVersionId: input.studioModel.previews.improvedCandidate.siteVersionId,
      runtimeArtifactId: input.studioModel.previews.improvedCandidate.runtimeArtifactId,
      liveUrl: text(input.studioModel.summary.liveSiteUrl),
      activePointer: input.studioModel.summary.activePointer,
      publishedCandidate: input.studioModel.summary.publishedCandidate,
    },
  };
}

export function buildAirshipSingleSiteEditorReadonlyProjection(input: AirshipBuildInput): AirshipSingleSiteEditorReadonlyProjection {
  const migrationId = text(input.migrationId) ?? input.studioModel.migrationId;
  const routeHref = `/gnr8/airship/single-site${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`;
  const generatedDrafts = importedSiteDrafts({ migrationId, studioModel: input.studioModel });
  if (migrationId === AIRSHIP_CHS_MIGRATION_ID && !chsSourceEvidenceAllowsForbiddenMaverCopy({ studioModel: input.studioModel, migrationId })) {
    assertChsDraftIdentity(generatedDrafts);
  }
  const persistedDraft = persistedDraftForMigration({
    draft: input.persistedDraft,
    migrationId,
    studioModel: input.studioModel,
  });
  const drafts = mergePersistedDrafts(generatedDrafts, persistedDraft);
  const styleSettings = persistedStyleSettings(persistedDraft);
  const deterministicEditableChangesGenerated = drafts.length > 0 || input.studioModel.improvementSummary.noDeterministicContentChanges === false;
  const siteLabel = humanSiteLabel(input.studioModel);
  const modelSourceUrl = input.studioModel.summary.sourceUrl;
  const modelLiveSiteUrl = text(input.studioModel.summary.liveSiteUrl) ?? modelSourceUrl;
  const importedModel = importedSiteEditorModel({
    studioModel: input.studioModel,
    migrationId,
    drafts,
    persistedDraft,
    airshipDraftCandidate: input.airshipDraftCandidate ?? null,
  });

  return {
    version: AIRSHIP_SINGLE_SITE_EDITOR_PROJECTION_VERSION,
    generatedAt: input.generatedAt ?? input.studioModel.generatedAt,
    routeHref,
    state: input.studioModel.state,
    migrationId,
    importedSite: siteLabel,
    sourceUrl: modelSourceUrl,
    importedSiteModel: importedModel,
    studioSourceTruth: input.studioModel.sourceTruth ?? null,
    liveSiteUrl: modelLiveSiteUrl,
    liveSiteLabel: "Live site",
    mvpStatus: input.studioModel.summary.mvpStatus,
    aiImprovementStatus: {
      label: deterministicEditableChangesGenerated ? "Editable AI draft generated" : "No concrete editable AI changes generated",
      detail: drafts.length > 0
        ? persistedDraft
          ? `${drafts.length} Airship draft edit(s) loaded from persistent draft storage. Saved Airship draft. Not applied to live site. Not published.`
          : `${drafts.length} proposed Airship draft edit(s) generated for the imported ${siteLabel} homepage from source evidence. Browser edits are local-only and are not applied to the live site.`
        : `${input.studioModel.improvementSummary.headline} ${importedModel.sourceEvidenceSummary.detail}`,
      deterministicEditableChangesGenerated,
    },
    previews: {
      originalClone: input.studioModel.previews.originalClone,
      currentImprovedPublished: input.studioModel.previews.improvedCandidate,
      currentLivePublished: input.studioModel.previews.improvedCandidate,
      airshipDraftCandidate: input.airshipDraftCandidate ?? null,
    },
    links: {
      liveSite: modelLiveSiteUrl,
      airshipEditor: `/gnr8/airship/single-site/editor${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`,
      singleSiteStudio: `/gnr8/command-center/single-site-studio${migrationId ? `?migrationId=${encodeURIComponent(migrationId)}` : ""}`,
      diagnostics: input.studioModel.diagnosticsHref,
    },
    draftPanel: {
      title: "AI improvement draft",
      emptyMessage: "No concrete editable AI changes have been generated yet.",
      drafts,
      draftPreview: draftPreview(drafts, generatedDrafts, persistedDraft, input.studioModel),
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
  const migrationId = text(input.migrationId);
  const studioModel = await getSingleSiteStudioReadonlyProjection({ migrationId });
  let persistedDraft: AirshipSingleSiteDraftRecord | null = null;
  if (migrationId) {
    try {
      persistedDraft = await new AirshipSingleSiteDraftService().readCurrentDraft(migrationId);
    } catch {
      persistedDraft = null;
    }
  }
  let airshipDraftCandidate: AirshipDraftCandidatePreviewRef | null = null;
  if (migrationId) {
    try {
      airshipDraftCandidate = await readLatestAirshipSingleSiteDraftCandidatePreview({
        migrationId,
        draftId: persistedDraft?.id ?? null,
      });
    } catch {
      airshipDraftCandidate = null;
    }
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
    migrationId: text(input.model.migrationId) ?? "",
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
