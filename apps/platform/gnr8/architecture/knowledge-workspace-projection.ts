import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type {
  BusinessFoundationKnowledgeGroupProjection,
  GenerationBusinessFoundationProjection,
  ImportedAssetPreviewProjection,
  ProductKnowledgeGapProjection,
} from "./generation-business-foundation-projection";
import { loadGenerationBusinessFoundationProjection } from "./generation-business-foundation-projection";
import type {
  GenerationEvolutionDashboardProjection,
  GenerationIterationProjection,
} from "./generation-evolution-dashboard-projection";
import { loadGenerationEvolutionDashboardProjection } from "./generation-evolution-dashboard-projection";
import type {
  SourceBusinessSignalCandidates,
  SourceWebsiteUnderstandingProjection,
  SourceWebsiteUnderstandingValidationResult,
} from "./source-website-understanding-projection-contract";
import {
  loadSourceContentVisualContinuityProjection,
  type SourceContentVisualContinuityProjectionLoaderResult,
} from "./source-content-visual-continuity-projection-loader";
import { loadSourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-loader";
import {
  loadGeneratedWebsiteVersionThumbnail,
  loadOriginalWebsiteVersionThumbnail,
} from "./website-version-thumbnail-persistence";
import type { WebsiteVersionThumbnailArtifact } from "./website-version-thumbnail-contract";

export type WorkspaceState = "Known" | "Unknown" | "Needs confirmation";

export type KnowledgeWorkspaceOriginalVisualKind =
  | "persisted_original_source_thumbnail"
  | "source_screenshot"
  | "source_preview"
  | "representative_source_asset"
  | "unavailable";

export type KnowledgeWorkspaceGeneratedPreviewKind =
  | "live_generated_proposal_preview"
  | "persisted_generated_thumbnail"
  | "bundle_cover_image"
  | "live_preview_available"
  | "generated_unavailable";

export type KnowledgeWorkspaceVisualPreviewProjection = {
  title: string;
  kind: KnowledgeWorkspaceOriginalVisualKind | KnowledgeWorkspaceGeneratedPreviewKind;
  label: string;
  href: string | null;
  imageHref: string | null;
  unavailableReason: string | null;
  altText: string;
  badges: string[];
};

export type KnowledgeWorkspaceHeroProjection = {
  businessName: string;
  originalWebsiteUrl: string | null;
  currentGenerationCycle: string;
  currentIteration: number;
  overallUnderstandingState: string;
  currentConfidence: string;
  currentRecommendation: string;
  currentEvolutionState: string;
  currentComplianceState: string;
  overallInterpretation: string;
  overallRecommendation: string;
  importState: string;
  discoveredAssetCount: number | string;
  discoveredSectionCount: number | string;
  latestProposalState: string;
  originalVisual: KnowledgeWorkspaceVisualPreviewProjection;
  latestPreview: KnowledgeWorkspaceVisualPreviewProjection;
  unresolvedSignals: string[];
  links: {
    originalWebsiteHref: string | null;
    latestProposalPreviewHref: string | null;
    evolutionHref: string;
    businessFoundationHref: string;
    websiteUnderstandingHref: string;
    continuityHref: string;
  };
};

export type KnowledgeWorkspaceVersionProjection = {
  label: string;
  kind: "original" | "generated" | "future";
  emphasis: "primary" | "standard" | "quiet";
  badges: string[];
  previewHref: string | null;
  previewImageHref: string | null;
  previewKind: KnowledgeWorkspaceOriginalVisualKind | KnowledgeWorkspaceGeneratedPreviewKind;
  previewLabel: string;
  previewUnavailableReason: string | null;
  quarantineState: string;
  status: string;
  majorImprovement: string;
  majorLimitation: string;
  openPreviewHref: string | null;
  transitionFromPrevious: string | null;
};

export type KnowledgeWorkspaceSummaryItemProjection = {
  label: string;
  state: string;
  detail: string;
};

export type KnowledgeWorkspaceKnownUnknownProjection = {
  knownObserved: KnowledgeWorkspaceSummaryItemProjection[];
  needsConfirmation: KnowledgeWorkspaceSummaryItemProjection[];
};

export type KnowledgeWorkspaceVisualIdentityProjection = {
  logoCandidate: {
    previewHref: string | null;
    label: string;
    status: string;
    unavailableReason: string | null;
  };
  primaryColors: Array<{ label: string; value: string; status: string }>;
  typographyCandidates: Array<{ family: string; source: string; status: string }>;
  importedImages: ImportedAssetPreviewProjection[];
  importedIcons: ImportedAssetPreviewProjection[];
  importedFonts: ImportedAssetPreviewProjection[];
  unavailableReasons: string[];
};

export type KnowledgeWorkspaceRecognizableProjection = {
  summary: string;
  logoCandidate: {
    previewHref: string | null;
    label: string;
    confidence: string;
    confirmationRequirement: string;
    unavailableReason: string | null;
  };
  representativeImages: Array<{
    previewHref: string;
    label: string;
    state: string;
    altText: string;
  }>;
  colorSignals: Array<{
    value: string;
    role: string;
    state: string;
  }>;
  typographySummary: Array<{
    family: string;
    role: string;
    state: string;
  }>;
  navigationLabels: string[];
  ctaLabels: string[];
  contactSignals: string[];
  keyContent: string[];
  layoutContinuity: string[];
  href: string;
};

export type KnowledgeWorkspaceContinuityItemProjection = {
  label: "Logo candidate" | "Main images" | "Colors" | "Typography" | "Navigation" | "Content" | "CTA" | "Contact";
  state: string;
  detail: string;
  previewHref?: string | null;
  values: string[];
};

export type KnowledgeWorkspaceContinuityProjection = {
  summary: string;
  items: KnowledgeWorkspaceContinuityItemProjection[];
  href: string;
};

export type KnowledgeWorkspaceStoryStepProjection = {
  label: string;
  summary: string;
  href: string;
};

export type KnowledgeWorkspaceGapProjection = {
  label: string;
  group: "critical_before_next_generation" | "important_for_recognizability" | "future_enrichment";
  state: "critical" | "missing" | "partial" | "unresolved" | "known";
  whyItMatters: string;
  currentEvidence: string;
  afterConfirmation: string;
};

export type KnowledgeWorkspaceHealthProjection = {
  label: string;
  state: string;
  detail: string;
};

export type KnowledgeWorkspaceAdvancedProjection = {
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunIds: string[];
  generationIds: string[];
  artifactExplorer: Array<{ label: string; kind: string; artifactId: string | null; status: string | null }>;
  evidenceCounts: Array<{ label: string; value: number | string }>;
  diagnostics: string[];
  limitations: string[];
};

export type KnowledgeWorkspaceNextActionProjection = {
  label: string;
  reason: string;
  targetHref: string | null;
};

export type KnowledgeWorkspaceProjection = {
  siteVersionId: string;
  hero: KnowledgeWorkspaceHeroProjection;
  versions: KnowledgeWorkspaceVersionProjection[];
  businessUnderstanding: KnowledgeWorkspaceKnownUnknownProjection;
  visualIdentity: KnowledgeWorkspaceVisualIdentityProjection;
  recognizable: KnowledgeWorkspaceRecognizableProjection;
  continuity: KnowledgeWorkspaceContinuityProjection;
  transformationStory: KnowledgeWorkspaceStoryStepProjection[];
  gaps: KnowledgeWorkspaceGapProjection[];
  health: KnowledgeWorkspaceHealthProjection[];
  nextActions: KnowledgeWorkspaceNextActionProjection[];
  advanced: KnowledgeWorkspaceAdvancedProjection;
  sourceProjectionStatus: "valid" | "partial" | "blocked" | "invalid";
};

export type KnowledgeWorkspaceProjectionOptions = RuntimeStoreDbOptions & {
  loadOriginalThumbnail?: typeof loadOriginalWebsiteVersionThumbnail;
  loadGeneratedThumbnail?: typeof loadGeneratedWebsiteVersionThumbnail;
};

function readable(value: string | number | null | undefined, fallback = "not available"): string {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized.replaceAll("_", " ") : fallback;
}

function isInternalIdentifier(value: string | null | undefined): boolean {
  return /^site[_-][a-z0-9-]+$/i.test(String(value ?? "").trim());
}

function hostnameFromUrl(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname || null;
  } catch {
    return normalized.includes(".") && !normalized.includes(" ") ? normalized : null;
  }
}

function heroIdentity(input: {
  businessName: string | null | undefined;
  sourceHostname: string | null | undefined;
  sourceUrl: string | null | undefined;
}): string {
  const businessName = String(input.businessName ?? "").trim();
  if (businessName && !isInternalIdentifier(businessName)) return businessName;
  return input.sourceHostname ?? hostnameFromUrl(input.sourceUrl) ?? "Website identity unavailable";
}

function first<T>(values: T[], predicate: (item: T) => boolean): T | null {
  return values.find(predicate) ?? null;
}

function groupByLabel(groups: BusinessFoundationKnowledgeGroupProjection[], label: string): BusinessFoundationKnowledgeGroupProjection | null {
  return groups.find((group) => group.label.toLowerCase() === label.toLowerCase()) ?? null;
}

type SourceBusinessLabelCandidateKey = "offerings" | "audiences" | "trust" | "goals" | "identity" | "differentiators";

function sourceCandidateLabels(candidates: SourceBusinessSignalCandidates | null, key: SourceBusinessLabelCandidateKey): string[] {
  const value = candidates?.[key];
  return Array.isArray(value)
    ? value.map((item) => readable(item.label, "")).filter(Boolean)
    : [];
}

function sourceNeedsConfirmation(candidates: SourceBusinessSignalCandidates | null, key: SourceBusinessLabelCandidateKey): string[] {
  const value = candidates?.[key];
  return Array.isArray(value)
    ? value
      .filter((item) => item.state !== "confirmed_source_fact")
      .map((item) => readable(item.label, "unresolved candidate"))
    : [];
}

function firstText(values: Array<string | null | undefined>, fallback: string): string {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) ?? fallback;
}

function summaryItem(label: string, state: string, detail: string): KnowledgeWorkspaceSummaryItemProjection {
  return { label, state: readable(state), detail: readable(detail, "No persisted detail is available.") };
}

function businessUnderstandingCards(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
}): KnowledgeWorkspaceKnownUnknownProjection {
  const groups = input.business.knowledgeGroups;
  const sourceCandidates = input.source?.businessSignalCandidates ?? null;
  const identity = groupByLabel(groups, "Identity");
  const offerings = groupByLabel(groups, "Offerings");
  const trust = groupByLabel(groups, "Trust");
  const content = groupByLabel(groups, "Content");
  const identitySignal = firstText([
    input.business.summary.businessName,
    input.business.summary.businessIdentity,
    identity?.statements[0]?.statement,
    input.source?.sourceIdentity.hostname,
  ], "Identity signal is not confirmed.");
  const websitePurpose = firstText([
    input.business.summary.businessPurpose,
    input.business.narrative.websitePurpose,
    content?.statements[0]?.statement,
  ], "Website purpose is not confirmed.");
  const contactPath = firstText([
    input.source?.content.flatMap((item) => item.contactSignals)[0],
    input.business.narrative.digitalPresence,
  ], "Contact path is unresolved.");
  const trustPresence = firstText([
    input.business.narrative.trustSignals[0],
    trust?.statements[0]?.statement,
  ], "Trust/contact evidence is not confirmed.");
  const sourceStructure = input.source
    ? `${input.source.navigation.length} navigation label(s), ${input.source.sections.filter((section) => !section.plannedOnly).length} observed section(s)`
    : "Source structure projection is unavailable.";
  const contentAvailability = input.source?.content.some((item) => item.bodyTextAvailable)
    ? "Visible source content is available."
    : "Visible source content is partial or unavailable.";

  return {
    knownObserved: [
      summaryItem("Identity signal", input.business.productAttentionSummary.businessIdentity, identitySignal),
      summaryItem("Website purpose", input.business.productAttentionSummary.websitePurpose, websitePurpose),
      summaryItem("Contact path", contactPath === "Contact path is unresolved." ? "unresolved" : "observed", contactPath),
      summaryItem("Trust/contact presence", trustPresence === "Trust/contact evidence is not confirmed." ? "unresolved" : "observed", trustPresence),
      summaryItem("Source structure", input.source ? "observed" : "unavailable", sourceStructure),
      summaryItem("Content availability", input.source?.content.some((item) => item.bodyTextAvailable) ? "observed" : "partial", contentAvailability),
    ],
    needsConfirmation: [
      summaryItem("Exact offerings", input.business.productAttentionSummary.offerings, offerings?.missing[0] ?? sourceNeedsConfirmation(sourceCandidates, "offerings")[0] ?? "Confirm the service portfolio before the next generation."),
      summaryItem("Primary audience", input.business.productAttentionSummary.audience, input.business.audience.missingAudienceKnowledge[0] ?? sourceNeedsConfirmation(sourceCandidates, "audiences")[0] ?? "Confirm who the website should primarily persuade."),
      summaryItem("Canonical brand identity", input.business.visualIdentity.logo.status, input.business.visualIdentity.logo.assetReference ?? "Confirm which source identity signal is canonical."),
      summaryItem("Differentiators", sourceCandidateLabels(sourceCandidates, "differentiators").length > 0 ? "partial" : "missing", sourceCandidateLabels(sourceCandidates, "differentiators")[0] ?? "Confirm what makes the business distinct."),
      summaryItem("Canonical typography", input.business.visualIdentity.typography.length > 0 ? "candidate" : "missing", input.business.visualIdentity.typography[0]?.family ?? "Confirm which typography signals should carry forward."),
      summaryItem("Canonical colors", input.business.visualIdentity.primaryColors.length > 0 ? "candidate" : "missing", input.business.visualIdentity.primaryColors[0]?.value ?? "Confirm observed color signals before treating them as brand colors."),
    ],
  };
}

function originalVisualPreview(input: {
  business: GenerationBusinessFoundationProjection;
  continuityResult: SourceContentVisualContinuityProjectionLoaderResult;
  source: SourceWebsiteUnderstandingProjection | null;
  thumbnail: WebsiteVersionThumbnailArtifact | null;
}): KnowledgeWorkspaceVisualPreviewProjection {
  if (input.thumbnail) {
    return {
      title: "Original Website",
      kind: "persisted_original_source_thumbnail",
      label: "Original source screenshot thumbnail",
      href: input.business.sourceWebsite.url ?? input.source?.sourceIdentity.sourceUrl ?? null,
      imageHref: `/gnr8/admin/workspace/${input.thumbnail.siteVersionId}/thumbnails/original`,
      unavailableReason: null,
      altText: "Persisted thumbnail derived from original source screenshot evidence",
      badges: ["source baseline", "persisted screenshot", "presentation thumbnail"],
    };
  }
  const continuity = input.continuityResult.projection;
  const sourceScreenshot = continuity?.sourceScreenshots
    .filter((screenshot) => screenshot.availability === "available" && Boolean(screenshot.safeAccessRef))
    .toSorted((left, right) => {
      const rank = (value: typeof left) => value.completeness === "full_page" ? 0 : value.completeness === "viewport" ? 1 : 2;
      return rank(left) - rank(right) || left.screenshotId.localeCompare(right.screenshotId);
    })[0] ?? null;
  if (sourceScreenshot?.safeAccessRef) {
    return {
      title: "Original Website",
      kind: "source_screenshot",
      label: sourceScreenshot.completeness === "full_page" ? "Original source screenshot" : "Original source viewport screenshot",
      href: input.business.sourceWebsite.url ?? input.source?.sourceIdentity.sourceUrl ?? null,
      imageHref: sourceScreenshot.safeAccessRef,
      unavailableReason: null,
      altText: "Persisted source screenshot for the original website",
      badges: ["source baseline", "source fidelity reference"],
    };
  }

  const sourceUrl = input.business.sourceWebsite.url ?? input.source?.sourceIdentity.sourceUrl ?? null;
  return {
    title: "Original Website",
    kind: sourceUrl ? "source_preview" : "unavailable",
    label: sourceUrl ? "Original website link available" : "Original source thumbnail unavailable",
    href: sourceUrl,
    imageHref: null,
    unavailableReason: sourceUrl ? "No persisted original-source thumbnail is available. Representative imported images are not used as original website thumbnails." : "No safe original visual source is available.",
    altText: "Original website visual preview unavailable",
    badges: sourceUrl ? ["source baseline", "open original website"] : ["unavailable"],
  };
}

function generatedVisualPreview(iteration: GenerationIterationProjection | null, thumbnail: WebsiteVersionThumbnailArtifact | null = null): KnowledgeWorkspaceVisualPreviewProjection {
  if (iteration && thumbnail) {
    return {
      title: "Latest Proposal",
      kind: "persisted_generated_thumbnail",
      label: `Iteration ${iteration.iteration} generated proposal thumbnail`,
      href: iteration.preview.route,
      imageHref: `/gnr8/admin/workspace/${thumbnail.siteVersionId}/thumbnails/iterations/${iteration.iteration}`,
      unavailableReason: null,
      altText: `Persisted thumbnail derived from ${iteration.label} durable generated proposal preview`,
      badges: [`Iteration ${iteration.iteration}`, "quarantined", "not approved", "not published", "presentation thumbnail"],
    };
  }
  if (iteration?.preview.available) {
    return {
      title: "Latest Proposal",
      kind: "live_generated_proposal_preview",
      label: "Live generated proposal preview",
      href: iteration.preview.route,
      imageHref: null,
      unavailableReason: null,
      altText: `${iteration.label} live generated proposal preview`,
      badges: [`Iteration ${iteration.iteration}`, "quarantined", "not approved", "not published"],
    };
  }
  if (iteration?.preview.route) {
    return {
      title: "Latest Proposal",
      kind: "live_preview_available",
      label: "Live proposal preview available",
      href: iteration.preview.route,
      imageHref: null,
      unavailableReason: iteration.preview.unavailableReason ?? "Preview requires authenticated access or has no persisted visual snapshot.",
      altText: `${iteration.label} generated proposal preview available`,
      badges: [`Iteration ${iteration.iteration}`, "quarantined", "open preview"],
    };
  }
  return {
    title: "Latest Proposal",
    kind: "generated_unavailable",
    label: "Generated proposal preview unavailable",
    href: null,
    imageHref: null,
    unavailableReason: "No generated proposal preview is available from persisted iteration evidence.",
    altText: "Generated proposal preview unavailable",
    badges: ["unavailable"],
  };
}

function versionCards(input: {
  business: GenerationBusinessFoundationProjection;
  evolution: GenerationEvolutionDashboardProjection;
  continuityResult: SourceContentVisualContinuityProjectionLoaderResult;
  source: SourceWebsiteUnderstandingProjection | null;
  originalThumbnail: WebsiteVersionThumbnailArtifact | null;
  generatedThumbnails: Map<number, WebsiteVersionThumbnailArtifact>;
}): KnowledgeWorkspaceVersionProjection[] {
  const originalPreview = originalVisualPreview({ business: input.business, continuityResult: input.continuityResult, source: input.source, thumbnail: input.originalThumbnail });
  const iterations = [1, 2].map((iterationNumber): KnowledgeWorkspaceVersionProjection => {
    const iteration = input.evolution.iterations.find((item) => item.iteration === iterationNumber) ?? null;
    const generatedPreview = generatedVisualPreview(iteration, input.generatedThumbnails.get(iterationNumber) ?? null);
    if (!iteration) {
      return {
        label: `Iteration ${iterationNumber}`,
        kind: "generated",
        emphasis: iterationNumber === 2 ? "primary" : "standard",
        badges: ["Not available"],
        previewHref: null,
        previewImageHref: null,
        previewKind: "generated_unavailable",
        previewLabel: "Generated proposal preview unavailable",
        previewUnavailableReason: `Iteration ${iterationNumber} is not persisted yet.`,
        quarantineState: "not generated",
        status: "not available",
        majorImprovement: "no persisted proposal is available",
        majorLimitation: "empty until this iteration exists",
        openPreviewHref: null,
        transitionFromPrevious: iterationNumber === 1 ? "Initial proposal established a governed generation baseline." : "Messages, trust signals, and constraints improved. No regressions were observed.",
      };
    }
    return {
      label: iteration.label,
      kind: "generated",
      emphasis: iteration.iteration === 2 || iteration.iteration === input.evolution.cycle.currentIteration ? "primary" : "standard",
      badges: [
        iteration.iteration === input.evolution.cycle.currentIteration ? "Latest proposal available" : null,
        iteration.iteration === 2 ? "Iteration 2" : null,
        "Quarantined generated proposal",
        iteration.preview.available ? "Preview available" : "Preview unavailable",
        iteration.compliance.status ? readable(iteration.compliance.status) : null,
      ].filter((value): value is string => Boolean(value)),
      previewHref: generatedPreview.href,
      previewImageHref: generatedPreview.imageHref,
      previewKind: generatedPreview.kind,
      previewLabel: generatedPreview.label,
      previewUnavailableReason: iteration.preview.available ? null : iteration.preview.unavailableReason,
      quarantineState: "quarantined",
      status: readable(iteration.status),
      majorImprovement: improvementState(iteration),
      majorLimitation: readable(iteration.evolution?.limitations[0] ?? iteration.compliance.recommendation, "No persisted limitation is available."),
      openPreviewHref: iteration.preview.route,
      transitionFromPrevious: iteration.iteration === 1
        ? "Initial proposal established a governed generation baseline."
        : transitionSummary(input.evolution.evolution),
    };
  });
  return [
    {
      label: "Original Website",
      kind: "original",
      emphasis: "standard",
      badges: originalPreview.badges,
      previewHref: input.business.sourceWebsite.url,
      previewImageHref: originalPreview.imageHref,
      previewKind: originalPreview.kind,
      previewLabel: originalPreview.label,
      previewUnavailableReason: originalPreview.unavailableReason,
      quarantineState: "source baseline",
      status: readable(input.business.sourceWebsite.status, "import status unavailable"),
      majorImprovement: "source baseline",
      majorLimitation: "original material still needs interpretation before regeneration",
      openPreviewHref: input.business.sourceWebsite.url,
      transitionFromPrevious: null,
    },
    ...iterations,
    {
      label: "Future iterations",
      kind: "future",
      emphasis: "quiet",
      badges: ["Not generated"],
      previewHref: null,
      previewImageHref: null,
      previewKind: "generated_unavailable",
      previewLabel: "Future step",
      previewUnavailableReason: "Future iterations are not persisted yet.",
      quarantineState: "available after confirmation and future runtime authorization",
      status: "not generated",
      majorImprovement: "empty until operator confirmation unlocks the next proposal",
      majorLimitation: readable(input.evolution.cycle.latestRecommendation, "Use current gaps before regenerating."),
      openPreviewHref: null,
      transitionFromPrevious: "Available after confirmation and future runtime authorization.",
    },
  ];
}

function transitionSummary(evolution: GenerationEvolutionDashboardProjection["evolution"]): string {
  if (!evolution) return "No persisted transition analysis is available for this step.";
  if (evolution.meaningfulImprovement && evolution.noRegressions) {
    return "Messages, trust signals, and constraints improved. No regressions were observed.";
  }
  if (evolution.meaningfulImprovement) return "Persisted Evolution Analysis reports meaningful improvement.";
  if (evolution.noRegressions) return "No regressions were observed in persisted Evolution Analysis.";
  return readable(evolution.overallAssessment, "Persisted transition analysis is available without a concise improvement signal.");
}

function bestOriginalPreview(assets: ImportedAssetPreviewProjection[]): ImportedAssetPreviewProjection | null {
  return storyAssetPreviews(assets)[0] ?? null;
}

function storyAssetPreviews(assets: ImportedAssetPreviewProjection[]): ImportedAssetPreviewProjection[] {
  return assets
    .filter((asset) => Boolean(asset.previewHref))
    .toSorted((left, right) => assetStoryRank(left) - assetStoryRank(right));
}

function assetStoryRank(asset: ImportedAssetPreviewProjection): number {
  const filename = asset.filename.toLowerCase();
  const utilityAsset = /\b(loading|loader|spinner|placeholder|favicon|sprite)\b/.test(filename);
  const typeRank =
    asset.type === "content_image" ? 0 :
      asset.type === "decorative_image" ? 10 :
        asset.type === "logo_candidate" ? 30 :
          asset.type === "icon" ? 80 :
            120;
  const mediaRank =
    /^image\/jpe?g$/i.test(asset.mediaType) ? 0 :
      /^image\/webp$/i.test(asset.mediaType) ? 4 :
        /^image\/png$/i.test(asset.mediaType) ? 8 :
          /^image\/svg\+xml$/i.test(asset.mediaType) ? 18 :
            40;
  const sizeRank = -Math.min(Math.floor((asset.sizeBytes ?? 0) / 50_000), 12);

  return (utilityAsset ? 1_000 : 0) + typeRank + mediaRank + sizeRank;
}

function improvementState(iteration: GenerationIterationProjection): string {
  if (iteration.evolution?.meaningfulImprovement) return "meaningful improvement";
  if (iteration.evolution?.improvedCategories.length) return "improved categories present";
  if (iteration.iteration === 1) return "baseline generated proposal";
  return readable(iteration.evolution?.overallAssessment, "improvement state unavailable");
}

function visualIdentity(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
}): KnowledgeWorkspaceVisualIdentityProjection {
  const businessLogo = input.business.visualIdentity.logo;
  const sourceLogo = input.source?.visualIdentitySignals.logoCandidates[0] ?? null;
  const logoPreviewHref = businessLogo.previewHref ?? sourceLogo?.previewHref ?? null;
  const images = storyAssetPreviews(input.business.importedAssets.previews)
    .filter((asset) => asset.type === "content_image" || asset.type === "decorative_image" || asset.type === "logo_candidate");
  const icons = input.business.importedAssets.previews.filter((asset) => asset.type === "icon");
  const fonts = input.business.importedAssets.previews.filter((asset) => asset.type === "font");
  const unavailableReasons = [
    logoPreviewHref ? null : businessLogo.unavailableMessage ?? "No confirmed logo candidate is available.",
    input.business.visualIdentity.primaryColors.length === 0 ? "No canonical brand colors are persisted." : null,
    input.business.visualIdentity.typography.length === 0 ? "No canonical typography candidates are persisted." : null,
    images.length === 0 ? "No imported image previews are available through existing preview-assets routes." : null,
    icons.length === 0 ? "No imported icons are currently classified in the product projection." : null,
    fonts.length === 0 ? "No imported fonts are currently classified in the product projection." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    logoCandidate: {
      previewHref: logoPreviewHref,
      label: businessLogo.assetReference ?? sourceLogo?.label ?? "Logo candidate",
      status: readable(businessLogo.status ?? sourceLogo?.state, "unavailable"),
      unavailableReason: logoPreviewHref ? null : businessLogo.unavailableMessage ?? "No confirmed logo candidate is available.",
    },
    primaryColors: [...input.business.visualIdentity.primaryColors, ...input.business.visualIdentity.secondaryColors].map((color) => ({
      label: color.label,
      value: color.value,
      status: readable(color.status),
    })),
    typographyCandidates: input.business.visualIdentity.typography.map((font) => ({
      family: font.family,
      source: font.source,
      status: font.locallyAvailable === null ? "availability unknown" : font.locallyAvailable ? "local font available" : "not locally available",
    })),
    importedImages: images,
    importedIcons: icons,
    importedFonts: fonts,
    unavailableReasons,
  };
}

function continuityItem(input: {
  label: KnowledgeWorkspaceContinuityItemProjection["label"];
  state: string | null | undefined;
  detail: string;
  values?: string[];
  previewHref?: string | null;
}): KnowledgeWorkspaceContinuityItemProjection {
  return {
    label: input.label,
    state: readable(input.state, "unavailable"),
    detail: input.detail,
    previewHref: input.previewHref ?? null,
    values: input.values?.filter(Boolean).slice(0, 6) ?? [],
  };
}

function sourceContinuity(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
  continuityResult: SourceContentVisualContinuityProjectionLoaderResult;
  siteVersionId: string;
}): KnowledgeWorkspaceContinuityProjection {
  const continuity = input.continuityResult.projection;
  const logo = continuity?.visualIdentitySignals.logoCandidates[0] ?? null;
  const imageCandidates = continuity?.visualIdentitySignals.imageCandidates ?? [];
  const typography = continuity?.visualIdentitySignals.typographyCandidates ?? [];
  const colorSignals = continuity?.visualIdentitySignals.colorSignals ?? [];
  const ctaSignals = input.source?.content.flatMap((item) => item.ctaSignals) ?? [];
  const contactSignals = input.source?.content.flatMap((item) => item.contactSignals) ?? [];
  const navigationLabels = input.source?.navigation.map((item) => item.label) ?? [];
  const contentBlocks = continuity?.contentBlocks ?? [];

  return {
    summary: continuity?.readiness.summary ?? "Source content and visual continuity is unavailable for this site version.",
    href: `/gnr8/admin/continuity/${input.siteVersionId}`,
    items: [
      continuityItem({
        label: "Logo candidate",
        state: logo?.continuityRecommendation ?? input.business.visualIdentity.logo.status,
        detail: logo?.sourceReference ?? input.business.visualIdentity.logo.assetReference ?? "No confirmed logo candidate is available.",
        previewHref: logo?.previewRef ?? input.business.visualIdentity.logo.previewHref,
        values: logo ? [logo.mediaType, logo.licensingSourceStatus, logo.reviewState] : [],
      }),
      continuityItem({
        label: "Main images",
        state: imageCandidates.length > 0 ? "candidate" : "unavailable",
        detail: imageCandidates.length > 0 ? `${imageCandidates.length} image candidate(s) are available for review.` : "No main image candidates are available.",
        previewHref: imageCandidates.find((item) => Boolean(item.previewRef))?.previewRef ?? input.business.importedAssets.previews.find((asset) => Boolean(asset.previewHref))?.previewHref ?? null,
        values: imageCandidates.map((item) => `${readable(item.roleCandidate)}: ${item.sourceReference}`),
      }),
      continuityItem({
        label: "Colors",
        state: colorSignals.length > 0 || input.business.visualIdentity.primaryColors.length > 0 ? "candidate" : "unavailable",
        detail: colorSignals.length > 0 ? `${colorSignals.length} source color signal(s) are available.` : "No canonical brand colors are persisted.",
        values: colorSignals.length > 0
          ? colorSignals.map((item) => `${item.normalizedValue} (${readable(item.candidateRole)})`)
          : input.business.visualIdentity.primaryColors.map((item) => `${item.value} (${item.label})`),
      }),
      continuityItem({
        label: "Typography",
        state: typography.length > 0 || input.business.visualIdentity.typography.length > 0 ? "candidate" : "unavailable",
        detail: typography.length > 0 ? `${typography.length} typography candidate(s) are available.` : "No canonical typography candidates are persisted.",
        values: typography.length > 0
          ? typography.map((item) => `${item.family} (${readable(item.roleCandidate)})`)
          : input.business.visualIdentity.typography.map((item) => `${item.family} (${item.source})`),
      }),
      continuityItem({
        label: "Navigation",
        state: navigationLabels.length > 0 ? "observed" : "unavailable",
        detail: navigationLabels.length > 0 ? `${navigationLabels.length} navigation label(s) were observed.` : "Navigation labels are unavailable.",
        values: navigationLabels,
      }),
      continuityItem({
        label: "Content",
        state: contentBlocks.length > 0 ? "candidate" : "unavailable",
        detail: contentBlocks.length > 0 ? `${contentBlocks.length} original content block(s) are available for preservation decisions.` : "Original content blocks are unavailable.",
        values: contentBlocks.map((item) => `${readable(item.contentType)}: ${item.originalText}`),
      }),
      continuityItem({
        label: "CTA",
        state: ctaSignals.length > 0 ? "observed" : "unavailable",
        detail: ctaSignals.length > 0 ? `${ctaSignals.length} call-to-action signal(s) were observed.` : "No call-to-action signals are available.",
        values: ctaSignals,
      }),
      continuityItem({
        label: "Contact",
        state: contactSignals.length > 0 ? "observed" : "unavailable",
        detail: contactSignals.length > 0 ? `${contactSignals.length} contact signal(s) were observed.` : "No contact signals are available.",
        values: contactSignals,
      }),
    ],
  };
}

function recognizable(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
  continuityResult: SourceContentVisualContinuityProjectionLoaderResult;
  siteVersionId: string;
}): KnowledgeWorkspaceRecognizableProjection {
  const continuity = input.continuityResult.projection;
  const logo = continuity?.visualIdentitySignals.logoCandidates[0] ?? null;
  const imageCandidates = continuity?.visualIdentitySignals.imageCandidates ?? [];
  const colorSignals = continuity?.visualIdentitySignals.colorSignals ?? [];
  const typography = continuity?.visualIdentitySignals.typographyCandidates ?? [];
  const representativeImages = imageCandidates
    .filter((item) => Boolean(item.previewRef))
    .toSorted((left, right) => {
      const rank = (role: string) => role === "hero" ? 0 : role === "content" || role === "product_service" ? 1 : role === "gallery" ? 2 : 5;
      return rank(left.roleCandidate) - rank(right.roleCandidate) || left.candidateId.localeCompare(right.candidateId);
    })
    .slice(0, 6)
    .map((item) => ({
      previewHref: item.previewRef ?? "",
      label: readable(item.roleCandidate, "unknown role"),
      state: readable(item.continuityRecommendation ?? item.reviewState, "candidate"),
      altText: `Representative imported image candidate: ${readable(item.roleCandidate, "unknown role")}`,
    }))
    .filter((item) => item.previewHref);
  const fallbackImages = representativeImages.length > 0 ? [] : storyAssetPreviews(input.business.importedAssets.previews)
    .filter((asset) => asset.previewHref && (asset.type === "content_image" || asset.type === "decorative_image"))
    .slice(0, 4)
    .map((asset) => ({
      previewHref: asset.previewHref ?? "",
      label: asset.type === "decorative_image" ? "decorative image candidate" : "source image candidate",
      state: "representative imported image",
      altText: "Representative imported image from source asset evidence",
    }));
  const typographySummary = typography.length > 0
    ? typography
      .toSorted((left, right) => left.family.localeCompare(right.family) || left.roleCandidate.localeCompare(right.roleCandidate))
      .filter((item, index, all) => all.findIndex((candidate) => candidate.family === item.family && candidate.roleCandidate === item.roleCandidate) === index)
      .slice(0, 5)
      .map((item) => ({
        family: item.family,
        role: item.roleCandidate === "icon_font" ? "icon font evidence" : readable(item.roleCandidate, "typography candidate"),
        state: readable(item.continuityRecommendation ?? item.reviewState, "candidate"),
      }))
    : input.business.visualIdentity.typography
      .slice(0, 4)
      .map((item) => ({
        family: item.family,
        role: item.family.toLowerCase().includes("fontello") ? "icon font evidence" : "typography candidate",
        state: item.locallyAvailable === null ? "availability unknown" : item.locallyAvailable ? "observed local file" : "observed external/fallback",
      }));
  const contentBlocks = continuity?.contentBlocks ?? [];
  const ctaLabels = input.source?.content.flatMap((item) => item.ctaSignals).slice(0, 4) ?? [];
  const contactSignals = input.source?.content.flatMap((item) => item.contactSignals).slice(0, 4) ?? [];
  return {
    summary: continuity?.readiness.summary ?? "Recognizable source continuity is composed from existing VCU and source-understanding evidence.",
    logoCandidate: {
      previewHref: logo?.previewRef ?? input.business.visualIdentity.logo.previewHref,
      label: "Candidate logo - confirmation required",
      confidence: readable(logo?.confidence.level ?? input.business.visualIdentity.confidence, "confidence unavailable"),
      confirmationRequirement: "Candidate logo - confirmation required",
      unavailableReason: logo?.previewRef || input.business.visualIdentity.logo.previewHref ? null : "No safe logo candidate preview is available.",
    },
    representativeImages: representativeImages.length > 0 ? representativeImages : fallbackImages,
    colorSignals: (colorSignals.length > 0 ? colorSignals.map((item) => ({
      value: item.normalizedValue,
      role: readable(item.candidateRole),
      state: readable(item.knowledgeState, "candidate/unresolved"),
    })) : [...input.business.visualIdentity.primaryColors, ...input.business.visualIdentity.secondaryColors].map((item) => ({
      value: item.value,
      role: readable(item.label),
      state: item.status === "observed" ? "candidate/unresolved" : readable(item.status),
    }))).slice(0, 8),
    typographySummary,
    navigationLabels: input.source?.navigation.map((item) => item.label).filter(Boolean).slice(0, 6) ?? [],
    ctaLabels,
    contactSignals,
    keyContent: contentBlocks
      .filter((item) => ["title", "heading", "cta", "contact_detail", "service_offer_text"].includes(item.contentType))
      .map((item) => item.originalText)
      .filter(Boolean)
      .slice(0, 6),
    layoutContinuity: [
      ...(continuity?.layoutContinuity.routeStructure.slice(0, 4) ?? []),
      ...(continuity?.layoutContinuity.sectionSequence.map((item) => item.heading ?? readable(item.semanticType, "")).filter(Boolean).slice(0, 4) ?? []),
    ].slice(0, 6),
    href: `/gnr8/admin/continuity/${input.siteVersionId}`,
  };
}

function gapMap(gaps: ProductKnowledgeGapProjection[]): Map<string, ProductKnowledgeGapProjection> {
  return new Map(gaps.map((gap) => [gap.label.toLowerCase(), gap]));
}

function knowledgeGaps(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
}): KnowledgeWorkspaceGapProjection[] {
  const productGaps = gapMap(input.business.productKnowledgeGaps);
  const gapFor = (label: string, fallback: KnowledgeWorkspaceGapProjection): KnowledgeWorkspaceGapProjection => {
    const gap = productGaps.get(label.toLowerCase());
    if (!gap) return fallback;
    return {
      label,
      group: gapGroupFor(label),
      state: gap.status,
      whyItMatters: gap.generationImpact,
      currentEvidence: gap.summary,
      afterConfirmation: afterConfirmationFor(label),
    };
  };
  const ranked: KnowledgeWorkspaceGapProjection[] = [
    gapFor("Audience", {
      label: "Audience",
      group: "critical_before_next_generation",
      state: input.business.audience.knownAudience.length > 0 ? "known" : "missing",
      whyItMatters: "Audience knowledge shapes messaging, proof, calls to action, and prioritization.",
      currentEvidence: input.business.audience.knownAudience.length > 0 ? "Persisted audience statements are available." : "No confirmed target audience is available.",
      afterConfirmation: afterConfirmationFor("Audience"),
    }),
    gapFor("Offerings", {
      label: "Offerings",
      group: "critical_before_next_generation",
      state: input.business.offerings.knownOfferings.length > 0 ? "known" : "missing",
      whyItMatters: "Offerings determine service hierarchy and the content structure of generated pages.",
      currentEvidence: input.business.offerings.knownOfferings.length > 0 ? "Persisted offering statements are available." : "No confirmed service portfolio is available.",
      afterConfirmation: afterConfirmationFor("Offerings"),
    }),
    gapFor("Brand", {
      label: "Brand",
      group: "important_for_recognizability",
      state: input.business.visualIdentity.logo.status === "detected" || input.business.visualIdentity.primaryColors.length > 0 ? "partial" : "missing",
      whyItMatters: "Brand confidence keeps generated proposals from inventing identity, tone, or visual emphasis.",
      currentEvidence: input.business.visualIdentity.logo.assetReference ?? "No confirmed brand identity is available.",
      afterConfirmation: afterConfirmationFor("Brand"),
    }),
    {
      label: "Differentiators",
      group: "future_enrichment",
      state: sourceCandidateLabels(input.source?.businessSignalCandidates ?? null, "differentiators").length > 0 ? "partial" : "missing",
      whyItMatters: "Differentiators help generated proposals avoid generic positioning.",
      currentEvidence: sourceCandidateLabels(input.source?.businessSignalCandidates ?? null, "differentiators").join("; ") || "No differentiator candidates are available.",
      afterConfirmation: afterConfirmationFor("Differentiators"),
    },
    {
      label: "Trust signals",
      group: "future_enrichment",
      state: input.business.narrative.trustSignals.length > 0 ? "known" : "missing",
      whyItMatters: "Trust signals influence credibility sections, proof blocks, and conversion confidence.",
      currentEvidence: input.business.narrative.trustSignals.length > 0 ? input.business.narrative.trustSignals.join("; ") : "No confirmed trust signals are available.",
      afterConfirmation: afterConfirmationFor("Trust signals"),
    },
    gapFor("Typography", {
      label: "Typography",
      group: "important_for_recognizability",
      state: input.business.visualIdentity.typography.length > 0 ? "partial" : "missing",
      whyItMatters: "Typography controls whether generated proposals can match the original brand voice visually.",
      currentEvidence: input.business.visualIdentity.typography.length > 0 ? "Typography candidates are available from persisted evidence." : "No canonical typography candidates are persisted.",
      afterConfirmation: afterConfirmationFor("Typography"),
    }),
    gapFor("Colors", {
      label: "Colors",
      group: "important_for_recognizability",
      state: input.business.visualIdentity.primaryColors.length > 0 ? "partial" : "missing",
      whyItMatters: "Color confidence controls visual brand fidelity without inventing a palette.",
      currentEvidence: input.business.visualIdentity.primaryColors.length > 0 ? "Observed color candidates exist, but canonical brand confirmation may still be missing." : "No canonical brand colors are persisted.",
      afterConfirmation: afterConfirmationFor("Colors"),
    }),
    gapFor("Logo confirmation", {
      label: "Logo confirmation",
      group: "important_for_recognizability",
      state: input.business.visualIdentity.logo.status === "detected" ? "partial" : "missing",
      whyItMatters: "Logo confirmation prevents decorative or unrelated images from becoming brand identity.",
      currentEvidence: input.business.visualIdentity.logo.assetReference ?? "No confirmed logo asset is available.",
      afterConfirmation: afterConfirmationFor("Logo confirmation"),
    }),
  ];
  return ranked.filter((gap) => gap.state !== "known");
}

function gapGroupFor(label: string): KnowledgeWorkspaceGapProjection["group"] {
  const normalized = label.toLowerCase();
  if (normalized.includes("audience") || normalized.includes("offering")) return "critical_before_next_generation";
  if (normalized.includes("logo") || normalized.includes("brand") || normalized.includes("color") || normalized.includes("typography")) return "important_for_recognizability";
  return "future_enrichment";
}

function afterConfirmationFor(label: string): string {
  switch (label) {
    case "Audience":
      return "Messaging and proof can be shaped around the right visitor before the next proposal.";
    case "Offerings":
      return "The next proposal can organize services and calls to action with less guesswork.";
    case "Brand":
      return "Visual and voice choices can preserve the source identity more confidently.";
    case "Differentiators":
      return "The next proposal can avoid generic positioning.";
    case "Trust signals":
      return "Credibility sections can use confirmed proof without strengthening unsupported claims.";
    case "Typography":
      return "The proposal can preserve the source visual voice without inventing a type system.";
    case "Colors":
      return "The proposal can carry forward the source palette with clearer brand confidence.";
    case "Logo confirmation":
      return "The proposal can use the right identity asset and avoid promoting a decorative image.";
    default:
      return "The next proposal can use this knowledge with clearer operator confidence.";
  }
}

function health(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
  evolution: GenerationEvolutionDashboardProjection;
}): KnowledgeWorkspaceHealthProjection[] {
  return [
    {
      label: "Website Structure",
      state: readable(input.source?.readiness.dimensions.find((item) => item.key === "structure_coverage")?.status, "unavailable"),
      detail: input.source?.readiness.dimensions.find((item) => item.key === "structure_coverage")?.summary ?? "Website structure is unavailable from the current persisted source evidence.",
    },
    {
      label: "Business Understanding",
      state: input.business.productAttentionSummary.businessIdentity === "understood" ? "Understood" : "Partial",
      detail: input.business.hero.missingKnowledgeSummary,
    },
    {
      label: "Visual Identity",
      state: readable(input.business.visualIdentity.status),
      detail: input.business.visualIdentity.limitations[0] ?? "Visual identity uses persisted candidates only.",
    },
    {
      label: "Content Continuity",
      state: readable(input.source?.readiness.dimensions.find((item) => item.key === "content_coverage")?.status, input.source ? "partial" : "unavailable"),
      detail: input.source?.content.some((item) => item.bodyTextAvailable)
        ? "Source content is present for continuity review."
        : "Content continuity remains partial in existing source evidence.",
    },
    {
      label: "Proposal Quality",
      state: readable(input.evolution.cycle.latestEvolutionAssessment ?? input.evolution.cycle.overallTrajectory),
      detail: input.evolution.evolution?.meaningfulImprovement ? "Latest evolution reports meaningful improvement." : "Latest evolution does not report a confirmed meaningful-improvement signal.",
    },
    {
      label: "Compliance",
      state: readable(input.evolution.cycle.latestComplianceStatus, "compliance unavailable"),
      detail: readable(input.evolution.cycle.latestRecommendation, "No persisted compliance recommendation is available."),
    },
    {
      label: "Evolution",
      state: readable(input.evolution.cycle.overallTrajectory, "evolution unavailable"),
      detail: input.evolution.evolution?.meaningfulImprovement ? "Evolution history reports meaningful improvement." : "Evolution history remains available without a confirmed meaningful-improvement signal.",
    },
    {
      label: "Overall Readiness",
      state: input.business.productKnowledgeGaps.length > 0 ? "Ready for focused regeneration planning" : "Ready for regeneration",
      detail: input.business.productKnowledgeGaps[0]?.summary ?? "No product-facing gap is currently highlighted.",
    },
  ];
}

function unresolvedSignals(summary: GenerationBusinessFoundationProjection["productAttentionSummary"]): string[] {
  return [
    summary.businessIdentity === "unresolved" ? "Identity unresolved" : null,
    summary.websitePurpose === "unresolved" ? "Purpose unresolved" : null,
    summary.offerings === "unresolved" ? "Offerings unresolved" : null,
    summary.audience === "unresolved" ? "Audience unresolved" : null,
    summary.visualIdentity === "detected" ? null : "Visual identity unresolved",
    summary.generationReadiness === "ready" ? null : "Generation readiness partial",
  ].filter((item): item is string => Boolean(item));
}

function nextActions(input: {
  gaps: KnowledgeWorkspaceGapProjection[];
  hero: KnowledgeWorkspaceHeroProjection;
}): KnowledgeWorkspaceNextActionProjection[] {
  const actions: KnowledgeWorkspaceNextActionProjection[] = [];
  const add = (label: string, reason: string, targetHref: string | null) => {
    if (!actions.some((action) => action.label === label)) actions.push({ label, reason, targetHref });
  };

  for (const gap of input.gaps) {
    if (gap.label === "Offerings") add("Confirm Offerings", gap.afterConfirmation, input.hero.links.businessFoundationHref);
    if (gap.label === "Audience") add("Confirm Audience", gap.afterConfirmation, input.hero.links.businessFoundationHref);
    if (gap.label === "Logo confirmation" || gap.label === "Brand") add("Review Logo Candidate", "Confirm which original asset should carry the brand identity.", input.hero.links.continuityHref);
    if (gap.label === "Typography") add("Review Typography", gap.afterConfirmation, input.hero.links.continuityHref);
    if (gap.label === "Colors") add("Review Brand Colors", gap.afterConfirmation, input.hero.links.continuityHref);
  }

  add("Future step: Proposal v3", "Available after confirmation and future runtime authorization.", null);
  return actions.slice(0, 6);
}

function overallInterpretation(input: {
  evolution: GenerationEvolutionDashboardProjection;
  gaps: KnowledgeWorkspaceGapProjection[];
}): string {
  const latestCompliance = readable(input.evolution.cycle.latestComplianceStatus, "compliance unavailable").toLowerCase();
  const improvement = readable(input.evolution.cycle.latestEvolutionAssessment ?? input.evolution.cycle.overallTrajectory);
  const hasImprovement = improvement.toLowerCase().includes("meaningful improvement") || input.evolution.evolution?.meaningfulImprovement;
  const hasBusinessCriticalGap = input.gaps.some((gap) => gap.group === "critical_before_next_generation");
  const hasRecognizabilityGap = input.gaps.some((gap) => gap.group === "important_for_recognizability");
  if (hasImprovement && latestCompliance.includes("non compliant")) {
    return "Iteration 2 is meaningfully better than Iteration 1, but the website is not ready for approval because offerings, audience, and visual identity still need confirmation.";
  }
  if (hasImprovement && (hasBusinessCriticalGap || hasRecognizabilityGap)) {
    return "The latest proposal improved, but unresolved business and recognizability signals should be confirmed before approval.";
  }
  if (latestCompliance.includes("non compliant")) {
    return "The latest proposal still does not satisfy the generation contract and should be treated as focused improvement material.";
  }
  return "The Workspace has enough persisted evidence to inspect the current website state and choose the next focused action.";
}

function overallRecommendation(input: {
  gaps: KnowledgeWorkspaceGapProjection[];
  fallback: string;
}): string {
  const firstCritical = input.gaps.find((gap) => gap.group === "critical_before_next_generation");
  if (firstCritical?.label === "Offerings") return "Confirm Offerings";
  if (firstCritical?.label === "Audience") return "Confirm Audience";
  if (firstCritical) return `Confirm ${firstCritical.label}`;
  const recognizability = input.gaps.find((gap) => gap.group === "important_for_recognizability");
  if (recognizability) return `Review ${recognizability.label}`;
  return readable(input.fallback, "Review persisted evidence before the next proposal.");
}

function advanced(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
  sourceValidation: SourceWebsiteUnderstandingValidationResult | null;
  evolution: GenerationEvolutionDashboardProjection;
  originalThumbnail: WebsiteVersionThumbnailArtifact | null;
  generatedThumbnails: Map<number, WebsiteVersionThumbnailArtifact>;
}): KnowledgeWorkspaceAdvancedProjection {
  const generationIds = input.evolution.iterations.flatMap((iteration) =>
    iteration.artifacts
      .filter((artifact) => artifact.kind === "generated_website_proposal")
      .map((artifact) => artifact.artifactId)
      .filter((value): value is string => Boolean(value)));
  const dryRunIds = [
    input.business.dryRunId,
    input.source?.dryRunId,
    input.evolution.dryRunId,
  ].filter((value): value is string => Boolean(value));
  const limitations = [
    ...input.business.visualIdentity.limitations,
    ...input.business.missingKnowledge.unknown,
    ...(input.source?.limitations.map((item) => `${item.code}: ${item.message}`) ?? []),
    ...(input.evolution.evolution?.limitations ?? []),
  ];

  return {
    siteVersionId: input.business.siteVersionId,
    sourceSiteId: input.business.sourceSiteId ?? input.source?.sourceSiteId ?? null,
    dryRunIds: [...new Set(dryRunIds)],
    generationIds,
    artifactExplorer: [
      ...input.business.artifactExplorer,
      ...input.evolution.artifactLineage,
      input.originalThumbnail ? {
        label: "Original Thumbnail",
        kind: input.originalThumbnail.artifactKind,
        artifactId: input.originalThumbnail.artifactId,
        status: input.originalThumbnail.availability.status,
      } : null,
      ...[...input.generatedThumbnails.entries()].map(([iteration, thumbnail]) => ({
        label: `Iteration ${iteration} Thumbnail`,
        kind: thumbnail.artifactKind,
        artifactId: thumbnail.artifactId,
        status: thumbnail.availability.status,
      })),
    ].filter((artifact): artifact is NonNullable<typeof artifact> => Boolean(artifact)).map((artifact) => ({
      label: artifact.label,
      kind: artifact.kind,
      artifactId: artifact.artifactId,
      status: artifact.status,
    })),
    evidenceCounts: [
      { label: "Business evidence", value: input.business.advancedTechnical.evidenceCount },
      { label: "Source routes", value: input.source?.routes.length ?? "unavailable" },
      { label: "Source assets", value: input.source?.assets.length ?? "unavailable" },
      { label: "Evolution evidence", value: input.evolution.iterations.reduce((total, iteration) => total + iteration.compliance.evidenceCount, 0) },
      { label: "Validation warnings", value: input.sourceValidation?.warnings.length ?? "unavailable" },
    ],
    diagnostics: [
      ...input.business.diagnostics,
      ...(input.source?.diagnostics.map((item) => `${item.code}: ${item.message}`) ?? []),
      ...input.evolution.diagnostics,
    ],
    limitations: [...new Set(limitations)],
  };
}

export async function loadKnowledgeWorkspaceProjection(input: {
  siteVersionId: string;
  options?: KnowledgeWorkspaceProjectionOptions;
}): Promise<KnowledgeWorkspaceProjection> {
  const options = input.options ?? {};
  const [business, evolution, sourceResult, continuityResult] = await Promise.all([
    loadGenerationBusinessFoundationProjection({ siteVersionId: input.siteVersionId, options }),
    loadGenerationEvolutionDashboardProjection({ siteVersionId: input.siteVersionId, options }),
    loadSourceWebsiteUnderstandingProjection({ siteVersionId: input.siteVersionId, options }),
    loadSourceContentVisualContinuityProjection({ siteVersionId: input.siteVersionId, options }),
  ]);
  const loadOriginalThumbnail = options.loadOriginalThumbnail ?? loadOriginalWebsiteVersionThumbnail;
  const loadGeneratedThumbnail = options.loadGeneratedThumbnail ?? loadGeneratedWebsiteVersionThumbnail;
  const [originalThumbnail, generated1Thumbnail, generated2Thumbnail] = await Promise.all([
    loadOriginalThumbnail({ siteVersionId: input.siteVersionId, options }),
    loadGeneratedThumbnail({ siteVersionId: input.siteVersionId, iteration: 1, options }),
    loadGeneratedThumbnail({ siteVersionId: input.siteVersionId, iteration: 2, options }),
  ]);
  const generatedThumbnails = new Map<number, WebsiteVersionThumbnailArtifact>(
    [[1, generated1Thumbnail], [2, generated2Thumbnail]].filter((entry): entry is [number, WebsiteVersionThumbnailArtifact] => Boolean(entry[1])),
  );
  const source = sourceResult.projection;
  const latestIteration = evolution.iterations.at(-1) ?? null;
  const latestBusinessIteration = business.generatedIterations.find((iteration) => iteration.isLatest) ?? business.generatedIterations.at(-1) ?? null;
  const gaps = knowledgeGaps({ business, source });
  const originalVisual = originalVisualPreview({ business, continuityResult, source, thumbnail: originalThumbnail });
  const latestPreview = generatedVisualPreview(latestIteration, latestIteration ? generatedThumbnails.get(latestIteration.iteration) ?? null : null);
  const recommendation = overallRecommendation({
    gaps,
    fallback: evolution.cycle.latestRecommendation ?? latestIteration?.compliance.recommendation ?? "Use current knowledge gaps before regeneration.",
  });
  const hero: KnowledgeWorkspaceHeroProjection = {
    businessName: heroIdentity({
      businessName: business.hero.businessName,
      sourceHostname: source?.sourceIdentity.hostname,
      sourceUrl: business.sourceWebsite.url ?? source?.sourceIdentity.sourceUrl ?? null,
    }),
    originalWebsiteUrl: business.sourceWebsite.url ?? source?.sourceIdentity.sourceUrl ?? null,
    currentGenerationCycle: evolution.cycle.generationCycleLabel,
    currentIteration: evolution.cycle.currentIteration,
    overallUnderstandingState: source?.readiness.status ? readable(source.readiness.status) : business.hero.currentState,
    currentConfidence: business.hero.understandingConfidence ?? source?.confidence.level ?? "confidence unavailable",
    currentRecommendation: recommendation,
    currentEvolutionState: readable(evolution.cycle.latestEvolutionAssessment ?? evolution.cycle.overallTrajectory),
    currentComplianceState: readable(evolution.cycle.latestComplianceStatus, "compliance unavailable"),
    overallInterpretation: overallInterpretation({ evolution, gaps }),
    overallRecommendation: recommendation,
    importState: readable(business.sourceWebsite.status ?? source?.sourceIdentity.sourceAvailability, "import state unavailable"),
    discoveredAssetCount: source?.assets.length ?? business.importedAssets.total ?? "unavailable",
    discoveredSectionCount: source?.sections.filter((section) => !section.plannedOnly).length ?? "unavailable",
    latestProposalState: latestBusinessIteration?.previewAvailable || latestIteration?.preview.available ? "Latest proposal available" : "Latest proposal unavailable",
    originalVisual,
    latestPreview,
    unresolvedSignals: unresolvedSignals(business.productAttentionSummary),
    links: {
      originalWebsiteHref: business.hero.primaryLinks.originalWebsiteHref ?? source?.sourceIdentity.sourceUrl ?? null,
      latestProposalPreviewHref: latestBusinessIteration?.previewHref ?? latestIteration?.preview.route ?? null,
      evolutionHref: `/gnr8/admin/evolution/${input.siteVersionId}`,
      businessFoundationHref: `/gnr8/admin/business-foundation/${input.siteVersionId}`,
      websiteUnderstandingHref: `/gnr8/admin/website-understanding/${input.siteVersionId}`,
      continuityHref: `/gnr8/admin/continuity/${input.siteVersionId}`,
    },
  };

  return {
    siteVersionId: input.siteVersionId,
    hero,
    versions: versionCards({ business, evolution, continuityResult, source, originalThumbnail, generatedThumbnails }),
    businessUnderstanding: businessUnderstandingCards({ business, source }),
    visualIdentity: visualIdentity({ business, source }),
    recognizable: recognizable({ business, source, continuityResult, siteVersionId: input.siteVersionId }),
    continuity: sourceContinuity({ business, source, continuityResult, siteVersionId: input.siteVersionId }),
    transformationStory: [
      { label: "Business Foundation", summary: "Supporting inspection page for the persisted business meaning behind the Workspace.", href: `/gnr8/admin/business-foundation/${input.siteVersionId}` },
      { label: "Website Understanding", summary: "Supporting inspection page for imported source structure, content, assets, and candidate signals.", href: `/gnr8/admin/website-understanding/${input.siteVersionId}` },
      { label: "Source Content & Visual Continuity", summary: "Supporting inspection page for what original content and visual materials can be preserved or need confirmation.", href: `/gnr8/admin/continuity/${input.siteVersionId}` },
      { label: "Generation Evolution", summary: "Supporting inspection page for generated proposal iterations, compliance, and evolution analysis.", href: `/gnr8/admin/evolution/${input.siteVersionId}` },
    ],
    gaps,
    health: health({ business, source, evolution }),
    nextActions: nextActions({ gaps, hero }),
    advanced: advanced({ business, source, sourceValidation: sourceResult.validation, evolution, originalThumbnail, generatedThumbnails }),
    sourceProjectionStatus: sourceResult.status,
  };
}
