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

export type WorkspaceState = "Known" | "Unknown" | "Needs confirmation";

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
  importState: string;
  discoveredAssetCount: number | string;
  discoveredSectionCount: number | string;
  latestProposalState: string;
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
  previewUnavailableReason: string | null;
  status: string;
  majorImprovement: string;
  majorLimitation: string;
  openPreviewHref: string | null;
};

export type KnowledgeWorkspaceKnowledgeCardProjection = {
  label: string;
  known: string[];
  unknown: string[];
  needsConfirmation: string[];
  confidence: string;
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
  businessUnderstanding: KnowledgeWorkspaceKnowledgeCardProjection[];
  visualIdentity: KnowledgeWorkspaceVisualIdentityProjection;
  continuity: KnowledgeWorkspaceContinuityProjection;
  transformationStory: KnowledgeWorkspaceStoryStepProjection[];
  gaps: KnowledgeWorkspaceGapProjection[];
  health: KnowledgeWorkspaceHealthProjection[];
  nextActions: KnowledgeWorkspaceNextActionProjection[];
  advanced: KnowledgeWorkspaceAdvancedProjection;
  sourceProjectionStatus: "valid" | "partial" | "blocked" | "invalid";
};

export type KnowledgeWorkspaceProjectionOptions = RuntimeStoreDbOptions;

function readable(value: string | number | null | undefined, fallback = "not available"): string {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized.replaceAll("_", " ") : fallback;
}

function first<T>(values: T[], predicate: (item: T) => boolean): T | null {
  return values.find(predicate) ?? null;
}

function groupByLabel(groups: BusinessFoundationKnowledgeGroupProjection[], label: string): BusinessFoundationKnowledgeGroupProjection | null {
  return groups.find((group) => group.label.toLowerCase() === label.toLowerCase()) ?? null;
}

function knowledgeCard(input: {
  label: string;
  known?: string[];
  unknown?: string[];
  needsConfirmation?: string[];
  confidence?: string | null;
}): KnowledgeWorkspaceKnowledgeCardProjection {
  return {
    label: input.label,
    known: input.known?.filter(Boolean) ?? [],
    unknown: input.unknown?.filter(Boolean) ?? [],
    needsConfirmation: input.needsConfirmation?.filter(Boolean) ?? [],
    confidence: readable(input.confidence, "confidence unavailable"),
  };
}

function cardFromGroup(label: string, group: BusinessFoundationKnowledgeGroupProjection | null): KnowledgeWorkspaceKnowledgeCardProjection {
  return knowledgeCard({
    label,
    known: group?.statements.map((item) => item.statement) ?? [],
    unknown: group?.missing ?? [`${label} is not confirmed in persisted business knowledge.`],
    needsConfirmation: group?.statements
      .filter((item) => item.confidence.level !== "HIGH")
      .map((item) => item.statement) ?? [],
    confidence: group?.confidence.level,
  });
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

function businessUnderstandingCards(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
}): KnowledgeWorkspaceKnowledgeCardProjection[] {
  const groups = input.business.knowledgeGroups;
  const sourceCandidates = input.source?.businessSignalCandidates ?? null;
  const identity = groupByLabel(groups, "Identity");
  const offerings = groupByLabel(groups, "Offerings");
  const goals = groupByLabel(groups, "Goals");
  const trust = groupByLabel(groups, "Trust");
  const brand = groupByLabel(groups, "Brand");
  const content = groupByLabel(groups, "Content");

  return [
    cardFromGroup("Identity", identity),
    knowledgeCard({
      label: "Purpose",
      known: [input.business.summary.businessPurpose, input.business.narrative.websitePurpose].filter((value): value is string => Boolean(value)),
      unknown: input.business.summary.businessPurpose ? [] : ["Website purpose is not available as persisted business knowledge."],
      needsConfirmation: input.business.productAttentionSummary.websitePurpose === "understood" ? [] : ["Confirm the purpose before relying on it for generated messaging."],
      confidence: input.business.summary.businessConfidence.level,
    }),
    cardFromGroup("Offerings", offerings),
    knowledgeCard({
      label: "Audience",
      known: input.business.audience.knownAudience.map((item) => item.statement),
      unknown: input.business.audience.missingAudienceKnowledge.length > 0 ? input.business.audience.missingAudienceKnowledge : sourceCandidateLabels(sourceCandidates, "audiences").length === 0 ? ["Target audience is not confirmed."] : [],
      needsConfirmation: sourceNeedsConfirmation(sourceCandidates, "audiences"),
      confidence: input.business.audience.confidence.level,
    }),
    cardFromGroup("Goals", goals),
    cardFromGroup("Trust", trust),
    cardFromGroup("Brand", brand),
    cardFromGroup("Content", content),
  ];
}

function versionCards(input: {
  business: GenerationBusinessFoundationProjection;
  evolution: GenerationEvolutionDashboardProjection;
}): KnowledgeWorkspaceVersionProjection[] {
  const originalPreview = first(input.business.importedAssets.previews, (asset) => Boolean(asset.previewHref)) ?? null;
  const iterations = [1, 2].map((iterationNumber): KnowledgeWorkspaceVersionProjection => {
    const iteration = input.evolution.iterations.find((item) => item.iteration === iterationNumber) ?? null;
    if (!iteration) {
      return {
        label: `Iteration ${iterationNumber}`,
        kind: "generated",
        emphasis: iterationNumber === 2 ? "primary" : "standard",
        badges: ["Not available"],
        previewHref: null,
        previewImageHref: null,
        previewUnavailableReason: `Iteration ${iterationNumber} is not persisted yet.`,
        status: "not available",
        majorImprovement: "no persisted proposal is available",
        majorLimitation: "empty until this iteration exists",
        openPreviewHref: null,
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
      ].filter((value): value is string => Boolean(value)),
      previewHref: iteration.preview.route,
      previewImageHref: null,
      previewUnavailableReason: iteration.preview.available ? null : iteration.preview.unavailableReason,
      status: readable(iteration.status),
      majorImprovement: improvementState(iteration),
      majorLimitation: readable(iteration.evolution?.limitations[0] ?? iteration.compliance.recommendation, "No persisted limitation is available."),
      openPreviewHref: iteration.preview.route,
    };
  });
  return [
    {
      label: "Original Website",
      kind: "original",
      emphasis: "standard",
      badges: ["Source baseline", "Original website"],
      previewHref: input.business.sourceWebsite.url,
      previewImageHref: originalPreview?.previewHref ?? null,
      previewUnavailableReason: originalPreview?.previewHref ? null : input.business.importedAssets.unavailableMessage ?? "No safe imported preview image is available from persisted assets.",
      status: readable(input.business.sourceWebsite.status, "import status unavailable"),
      majorImprovement: "source baseline",
      majorLimitation: "original material still needs interpretation before regeneration",
      openPreviewHref: input.business.sourceWebsite.url,
    },
    ...iterations,
    {
      label: "Future iterations",
      kind: "future",
      emphasis: "quiet",
      badges: ["Not generated"],
      previewHref: null,
      previewImageHref: null,
      previewUnavailableReason: "Future iterations are not persisted yet.",
      status: "not generated",
      majorImprovement: "empty until operator confirmation unlocks the next proposal",
      majorLimitation: readable(input.evolution.cycle.latestRecommendation, "Use current gaps before regenerating."),
      openPreviewHref: null,
    },
  ];
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
  const images = input.business.importedAssets.previews.filter((asset) => asset.type === "content_image" || asset.type === "decorative_image" || asset.type === "logo_candidate");
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
      state: gap.status,
      whyItMatters: gap.generationImpact,
      currentEvidence: gap.summary,
      afterConfirmation: afterConfirmationFor(label),
    };
  };
  const ranked: KnowledgeWorkspaceGapProjection[] = [
    gapFor("Audience", {
      label: "Audience",
      state: input.business.audience.knownAudience.length > 0 ? "known" : "missing",
      whyItMatters: "Audience knowledge shapes messaging, proof, calls to action, and prioritization.",
      currentEvidence: input.business.audience.knownAudience.length > 0 ? "Persisted audience statements are available." : "No confirmed target audience is available.",
      afterConfirmation: afterConfirmationFor("Audience"),
    }),
    gapFor("Offerings", {
      label: "Offerings",
      state: input.business.offerings.knownOfferings.length > 0 ? "known" : "missing",
      whyItMatters: "Offerings determine service hierarchy and the content structure of generated pages.",
      currentEvidence: input.business.offerings.knownOfferings.length > 0 ? "Persisted offering statements are available." : "No confirmed service portfolio is available.",
      afterConfirmation: afterConfirmationFor("Offerings"),
    }),
    gapFor("Brand", {
      label: "Brand",
      state: input.business.visualIdentity.logo.status === "detected" || input.business.visualIdentity.primaryColors.length > 0 ? "partial" : "missing",
      whyItMatters: "Brand confidence keeps generated proposals from inventing identity, tone, or visual emphasis.",
      currentEvidence: input.business.visualIdentity.logo.assetReference ?? "No confirmed brand identity is available.",
      afterConfirmation: afterConfirmationFor("Brand"),
    }),
    {
      label: "Differentiators",
      state: sourceCandidateLabels(input.source?.businessSignalCandidates ?? null, "differentiators").length > 0 ? "partial" : "missing",
      whyItMatters: "Differentiators help generated proposals avoid generic positioning.",
      currentEvidence: sourceCandidateLabels(input.source?.businessSignalCandidates ?? null, "differentiators").join("; ") || "No differentiator candidates are available.",
      afterConfirmation: afterConfirmationFor("Differentiators"),
    },
    {
      label: "Trust signals",
      state: input.business.narrative.trustSignals.length > 0 ? "known" : "missing",
      whyItMatters: "Trust signals influence credibility sections, proof blocks, and conversion confidence.",
      currentEvidence: input.business.narrative.trustSignals.length > 0 ? input.business.narrative.trustSignals.join("; ") : "No confirmed trust signals are available.",
      afterConfirmation: afterConfirmationFor("Trust signals"),
    },
    gapFor("Typography", {
      label: "Typography",
      state: input.business.visualIdentity.typography.length > 0 ? "partial" : "missing",
      whyItMatters: "Typography controls whether generated proposals can match the original brand voice visually.",
      currentEvidence: input.business.visualIdentity.typography.length > 0 ? "Typography candidates are available from persisted evidence." : "No canonical typography candidates are persisted.",
      afterConfirmation: afterConfirmationFor("Typography"),
    }),
    gapFor("Colors", {
      label: "Colors",
      state: input.business.visualIdentity.primaryColors.length > 0 ? "partial" : "missing",
      whyItMatters: "Color confidence controls visual brand fidelity without inventing a palette.",
      currentEvidence: input.business.visualIdentity.primaryColors.length > 0 ? "Observed color candidates exist, but canonical brand confirmation may still be missing." : "No canonical brand colors are persisted.",
      afterConfirmation: afterConfirmationFor("Colors"),
    }),
    gapFor("Logo confirmation", {
      label: "Logo confirmation",
      state: input.business.visualIdentity.logo.status === "detected" ? "partial" : "missing",
      whyItMatters: "Logo confirmation prevents decorative or unrelated images from becoming brand identity.",
      currentEvidence: input.business.visualIdentity.logo.assetReference ?? "No confirmed logo asset is available.",
      afterConfirmation: afterConfirmationFor("Logo confirmation"),
    }),
  ];
  return ranked.filter((gap) => gap.state !== "known");
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
      label: "Generation Quality",
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
      label: "Readiness",
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

  add("Generate Proposal v3", readable(input.hero.currentRecommendation, "Use confirmed knowledge before the next proposal."), null);
  return actions.slice(0, 6);
}

function advanced(input: {
  business: GenerationBusinessFoundationProjection;
  source: SourceWebsiteUnderstandingProjection | null;
  sourceValidation: SourceWebsiteUnderstandingValidationResult | null;
  evolution: GenerationEvolutionDashboardProjection;
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
    ].map((artifact) => ({
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
  const source = sourceResult.projection;
  const latestIteration = evolution.iterations.at(-1) ?? null;
  const latestBusinessIteration = business.generatedIterations.find((iteration) => iteration.isLatest) ?? business.generatedIterations.at(-1) ?? null;
  const hero: KnowledgeWorkspaceHeroProjection = {
    businessName: business.hero.businessName ?? source?.sourceIdentity.hostname ?? "Website identity unavailable",
    originalWebsiteUrl: business.sourceWebsite.url ?? source?.sourceIdentity.sourceUrl ?? null,
    currentGenerationCycle: evolution.cycle.generationCycleLabel,
    currentIteration: evolution.cycle.currentIteration,
    overallUnderstandingState: source?.readiness.status ? readable(source.readiness.status) : business.hero.currentState,
    currentConfidence: business.hero.understandingConfidence ?? source?.confidence.level ?? "confidence unavailable",
    currentRecommendation: readable(evolution.cycle.latestRecommendation ?? latestIteration?.compliance.recommendation, "Use current knowledge gaps before regeneration."),
    currentEvolutionState: readable(evolution.cycle.latestEvolutionAssessment ?? evolution.cycle.overallTrajectory),
    currentComplianceState: readable(evolution.cycle.latestComplianceStatus, "compliance unavailable"),
    importState: readable(business.sourceWebsite.status ?? source?.sourceIdentity.sourceAvailability, "import state unavailable"),
    discoveredAssetCount: source?.assets.length ?? business.importedAssets.total ?? "unavailable",
    discoveredSectionCount: source?.sections.filter((section) => !section.plannedOnly).length ?? "unavailable",
    latestProposalState: latestBusinessIteration?.previewAvailable || latestIteration?.preview.available ? "Latest proposal available" : "Latest proposal unavailable",
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
  const gaps = knowledgeGaps({ business, source });

  return {
    siteVersionId: input.siteVersionId,
    hero,
    versions: versionCards({ business, evolution }),
    businessUnderstanding: businessUnderstandingCards({ business, source }),
    visualIdentity: visualIdentity({ business, source }),
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
    advanced: advanced({ business, source, sourceValidation: sourceResult.validation, evolution }),
    sourceProjectionStatus: sourceResult.status,
  };
}
