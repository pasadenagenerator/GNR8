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
  compliance: string;
  recommendation: string;
  improvementState: string;
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

export type KnowledgeWorkspaceProjection = {
  siteVersionId: string;
  hero: KnowledgeWorkspaceHeroProjection;
  versions: KnowledgeWorkspaceVersionProjection[];
  businessUnderstanding: KnowledgeWorkspaceKnowledgeCardProjection[];
  visualIdentity: KnowledgeWorkspaceVisualIdentityProjection;
  transformationStory: KnowledgeWorkspaceStoryStepProjection[];
  gaps: KnowledgeWorkspaceGapProjection[];
  health: KnowledgeWorkspaceHealthProjection[];
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
  const iterations = input.evolution.iterations.map((iteration): KnowledgeWorkspaceVersionProjection => ({
    label: iteration.label,
    kind: "generated",
    emphasis: iteration.iteration === input.evolution.cycle.currentIteration ? "primary" : "standard",
    badges: [
      iteration.iteration === input.evolution.cycle.currentIteration ? "Latest iteration" : null,
      "Quarantined generated proposal",
      iteration.preview.available ? "Preview available" : "Preview unavailable",
    ].filter((value): value is string => Boolean(value)),
    previewHref: iteration.preview.route,
    previewImageHref: null,
    previewUnavailableReason: iteration.preview.available ? null : iteration.preview.unavailableReason,
    status: readable(iteration.status),
    compliance: readable(iteration.compliance.status, "compliance unavailable"),
    recommendation: readable(iteration.compliance.recommendation ?? iteration.evolution?.recommendedNextAction, "No persisted recommendation is available."),
    improvementState: improvementState(iteration),
    openPreviewHref: iteration.preview.route,
  }));
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
      compliance: "not evaluated as a generated proposal",
      recommendation: "Use as the source reference for understanding and comparison.",
      improvementState: "source baseline",
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
      compliance: "not evaluated",
      recommendation: readable(input.evolution.cycle.latestRecommendation, "Use current gaps before regenerating."),
      improvementState: "planned after operator review",
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
    };
  };
  return [
    gapFor("Audience", {
      label: "Audience",
      state: input.business.audience.knownAudience.length > 0 ? "known" : "missing",
      whyItMatters: "Audience knowledge shapes messaging, proof, calls to action, and prioritization.",
      currentEvidence: input.business.audience.knownAudience.length > 0 ? "Persisted audience statements are available." : "No confirmed target audience is available.",
    }),
    gapFor("Offerings", {
      label: "Offerings",
      state: input.business.offerings.knownOfferings.length > 0 ? "known" : "missing",
      whyItMatters: "Offerings determine service hierarchy and the content structure of generated pages.",
      currentEvidence: input.business.offerings.knownOfferings.length > 0 ? "Persisted offering statements are available." : "No confirmed service portfolio is available.",
    }),
    gapFor("Brand", {
      label: "Brand",
      state: input.business.visualIdentity.logo.status === "detected" || input.business.visualIdentity.primaryColors.length > 0 ? "partial" : "missing",
      whyItMatters: "Brand confidence keeps generated proposals from inventing identity, tone, or visual emphasis.",
      currentEvidence: input.business.visualIdentity.logo.assetReference ?? "No confirmed brand identity is available.",
    }),
    {
      label: "Differentiators",
      state: sourceCandidateLabels(input.source?.businessSignalCandidates ?? null, "differentiators").length > 0 ? "partial" : "missing",
      whyItMatters: "Differentiators help generated proposals avoid generic positioning.",
      currentEvidence: sourceCandidateLabels(input.source?.businessSignalCandidates ?? null, "differentiators").join("; ") || "No differentiator candidates are available.",
    },
    {
      label: "Trust signals",
      state: input.business.narrative.trustSignals.length > 0 ? "known" : "missing",
      whyItMatters: "Trust signals influence credibility sections, proof blocks, and conversion confidence.",
      currentEvidence: input.business.narrative.trustSignals.length > 0 ? input.business.narrative.trustSignals.join("; ") : "No confirmed trust signals are available.",
    },
    gapFor("Typography", {
      label: "Typography",
      state: input.business.visualIdentity.typography.length > 0 ? "partial" : "missing",
      whyItMatters: "Typography controls whether generated proposals can match the original brand voice visually.",
      currentEvidence: input.business.visualIdentity.typography.length > 0 ? "Typography candidates are available from persisted evidence." : "No canonical typography candidates are persisted.",
    }),
    gapFor("Colors", {
      label: "Colors",
      state: input.business.visualIdentity.primaryColors.length > 0 ? "partial" : "missing",
      whyItMatters: "Color confidence controls visual brand fidelity without inventing a palette.",
      currentEvidence: input.business.visualIdentity.primaryColors.length > 0 ? "Observed color candidates exist, but canonical brand confirmation may still be missing." : "No canonical brand colors are persisted.",
    }),
    gapFor("Logo confirmation", {
      label: "Logo confirmation",
      state: input.business.visualIdentity.logo.status === "detected" ? "partial" : "missing",
      whyItMatters: "Logo confirmation prevents decorative or unrelated images from becoming brand identity.",
      currentEvidence: input.business.visualIdentity.logo.assetReference ?? "No confirmed logo asset is available.",
    }),
  ];
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
  const [business, evolution, sourceResult] = await Promise.all([
    loadGenerationBusinessFoundationProjection({ siteVersionId: input.siteVersionId, options }),
    loadGenerationEvolutionDashboardProjection({ siteVersionId: input.siteVersionId, options }),
    loadSourceWebsiteUnderstandingProjection({ siteVersionId: input.siteVersionId, options }),
  ]);
  const source = sourceResult.projection;
  const latestIteration = evolution.iterations.at(-1) ?? null;
  const latestBusinessIteration = business.generatedIterations.find((iteration) => iteration.isLatest) ?? business.generatedIterations.at(-1) ?? null;

  return {
    siteVersionId: input.siteVersionId,
    hero: {
      businessName: business.hero.businessName ?? source?.sourceIdentity.hostname ?? "Website identity unavailable",
      originalWebsiteUrl: business.sourceWebsite.url ?? source?.sourceIdentity.sourceUrl ?? null,
      currentGenerationCycle: evolution.cycle.generationCycleLabel,
      currentIteration: evolution.cycle.currentIteration,
      overallUnderstandingState: source?.readiness.status ? readable(source.readiness.status) : business.hero.currentState,
      currentConfidence: business.hero.understandingConfidence ?? source?.confidence.level ?? "confidence unavailable",
      currentRecommendation: readable(evolution.cycle.latestRecommendation ?? latestIteration?.compliance.recommendation, "Use current knowledge gaps before regeneration."),
      currentEvolutionState: readable(evolution.cycle.latestEvolutionAssessment ?? evolution.cycle.overallTrajectory),
      currentComplianceState: readable(evolution.cycle.latestComplianceStatus, "compliance unavailable"),
      links: {
        originalWebsiteHref: business.hero.primaryLinks.originalWebsiteHref ?? source?.sourceIdentity.sourceUrl ?? null,
        latestProposalPreviewHref: latestBusinessIteration?.previewHref ?? latestIteration?.preview.route ?? null,
        evolutionHref: `/gnr8/admin/evolution/${input.siteVersionId}`,
        businessFoundationHref: `/gnr8/admin/business-foundation/${input.siteVersionId}`,
        websiteUnderstandingHref: `/gnr8/admin/website-understanding/${input.siteVersionId}`,
        continuityHref: `/gnr8/admin/continuity/${input.siteVersionId}`,
      },
    },
    versions: versionCards({ business, evolution }),
    businessUnderstanding: businessUnderstandingCards({ business, source }),
    visualIdentity: visualIdentity({ business, source }),
    transformationStory: [
      { label: "Website imported", summary: "The original website became the source baseline.", href: `/gnr8/admin/website-understanding/${input.siteVersionId}` },
      { label: "Website understood", summary: "Structure, content, assets, and source signals were projected.", href: `/gnr8/admin/website-understanding/${input.siteVersionId}` },
      { label: "Business understood", summary: "Business meaning was projected as operator-readable foundation knowledge.", href: `/gnr8/admin/business-foundation/${input.siteVersionId}` },
      { label: "Website planned", summary: "Website intent became a generation-ready plan without exposing internals here.", href: `/gnr8/admin/business-foundation/${input.siteVersionId}` },
      { label: "Website generated", summary: "Generated proposal previews became available as read-only iterations.", href: latestBusinessIteration?.previewHref ?? `/gnr8/admin/evolution/${input.siteVersionId}` },
      { label: "Website evaluated", summary: "Generated output was checked against the current contract.", href: `/gnr8/admin/evolution/${input.siteVersionId}` },
      { label: "Website improved", summary: "Evolution compares iterations and keeps the improvement history reachable.", href: `/gnr8/admin/evolution/${input.siteVersionId}` },
    ],
    gaps: knowledgeGaps({ business, source }),
    health: health({ business, source, evolution }),
    advanced: advanced({ business, source, sourceValidation: sourceResult.validation, evolution }),
    sourceProjectionStatus: sourceResult.status,
  };
}
