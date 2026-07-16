import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type {
  SourceAssetUnderstanding,
  SourceContentUnderstanding,
  SourceSectionUnderstanding,
  SourceWebsiteUnderstandingProjection,
} from "./source-website-understanding-projection-contract";
import {
  CONTINUITY_KNOWLEDGE_STATES,
  CONTINUITY_READINESS_DIMENSIONS,
  CONTINUITY_READINESS_STATUSES,
  CONTINUITY_STATES,
  SOURCE_ASSET_REUSE_STATES,
  SOURCE_CONTENT_TRANSFORMATION_POLICIES,
  SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION,
  SOURCE_IMAGE_ROLE_CANDIDATES,
  type ContinuityConfidence,
  type ContinuityDiagnostic,
  type ContinuityLimitation,
  type ContinuityReadiness,
  type ContinuityReadinessDimension,
  type ContinuityValidationResult,
  type SourceAssetContinuityItem,
  type SourceAssetReuseCandidate,
  type SourceAssetUsageEvidence,
  type SourceColorContinuitySignal,
  type SourceContentBlock,
  type SourceContentContinuityCandidate,
  type SourceContentTransformationPolicy,
  type SourceContentVisualContinuityProjection,
  type SourceContinuityState,
  type SourceImageContinuityCandidate,
  type SourceImageRoleCandidate,
  type SourceLayoutContinuity,
  type SourceLayoutSectionReference,
  type SourceLogoContinuityCandidate,
  type SourceScreenshotReference,
  type SourceTypographyContinuityCandidate,
  type SourceVisualStyleContinuitySignal,
} from "./source-content-visual-continuity-projection-contract";

export type NormalizedSourceScreenshotInput = {
  screenshotId: string;
  routePath?: string | null;
  sourceUrl?: string | null;
  viewport?: string | null;
  dimensions?: { width: number | null; height: number | null } | null;
  capturedAt?: string | null;
  completeness?: SourceScreenshotReference["completeness"];
  safeAccessRef?: string | null;
  evidenceRefs?: string[];
  availability?: SourceScreenshotReference["availability"];
};

export type SourceContentVisualContinuityProjectionBuilderInput = {
  sourceWebsiteUnderstandingProjection: SourceWebsiteUnderstandingProjection;
  generatedAt?: string;
  sourceScreenshots?: NormalizedSourceScreenshotInput[];
  downstreamInputs?: unknown;
};

export const SOURCE_CONTENT_VISUAL_CONTINUITY_FORBIDDEN_FIELDS = [
  "digitalBusinessTwin",
  "businessUnderstandingReport",
  "businessAlignment",
  "websiteDesignBrief",
  "websiteGenerationPackage",
  "providerGenerationPayload",
  "providerPayload",
  "generatedWebsiteProposal",
  "generatedProposal",
  "generatedProposalBundle",
  "observedWebsiteModel",
  "compliance",
  "complianceReport",
  "improvementPlan",
  "evolutionAnalysis",
  "businessApproval",
  "publishingState",
  "deploymentState",
  "generatedIterations",
  "generatedContent",
  "canonicalBrandIdentity",
  "canonicalPalette",
  "canonicalLogo",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) => left.localeCompare(right));
}

function confidence(level: ContinuityConfidence["level"], reasons: string[]): ContinuityConfidence {
  return { level, reasons: uniqueSorted(reasons) };
}

function stableId(prefix: string, parts: unknown): string {
  return `${prefix}:${sha256Hex(stableStringify(parts)).slice(0, 18)}`;
}

function normalizedTextHash(value: string): string {
  return sha256Hex(value.replace(/\s+/g, " ").trim().toLocaleLowerCase());
}

function limitation(input: {
  code: string;
  message: string;
  severity?: ContinuityLimitation["severity"];
  sourceRefs?: string[];
  state?: ContinuityLimitation["state"];
}): ContinuityLimitation {
  return {
    limitationId: stableId("continuity-limitation", input),
    code: input.code,
    message: input.message,
    severity: input.severity ?? "warning",
    sourceRefs: uniqueSorted(input.sourceRefs ?? []),
    state: input.state ?? "observed",
  };
}

function diagnostic(code: string, message: string, sourceRefs: string[] = []): ContinuityDiagnostic {
  return { code, message, sourceRefs: uniqueSorted(sourceRefs) };
}

function artifactIds(projection: SourceContentVisualContinuityProjection): string[] {
  return uniqueSorted([
    ...projection.sourceArtifactRefs,
    ...projection.evidenceArtifactRefs,
    ...projection.candidateArtifactRefs,
    ...projection.reviewArtifactRefs,
    ...projection.screenshotArtifactRefs,
  ].map((ref) => ref.artifactId ?? ref.canonicalId ?? ""));
}

function sourceRefs(refs: string[]): Array<{ refId: string; source: "source_website_understanding" }> {
  return uniqueSorted(refs).map((refId) => ({ refId, source: "source_website_understanding" }));
}

function routePageRef(projection: SourceWebsiteUnderstandingProjection, routePath: string | null): string | null {
  return projection.pages.find((page) => page.routePath === routePath)?.pageId ?? null;
}

function nearestSection(projection: SourceWebsiteUnderstandingProjection, routePath: string | null, order: number): SourceSectionUnderstanding | null {
  const sections = projection.sections.filter((section) => !section.plannedOnly && (routePath === null || section.routePath === routePath || section.routePath === null));
  return sections[order % Math.max(1, sections.length)] ?? null;
}

function addContentBlock(input: {
  blocks: SourceContentBlock[];
  projection: SourceWebsiteUnderstandingProjection;
  routePath: string | null;
  sourceSection: SourceSectionUnderstanding | null;
  contentType: SourceContentBlock["contentType"];
  originalText: string | null;
  sourceOrder: number;
  evidenceRefs: string[];
  language: string | null;
  knowledgeState?: SourceContentBlock["knowledgeState"];
  confidence?: ContinuityConfidence;
  reviewState?: SourceContentBlock["reviewState"];
  limitations?: string[];
}): void {
  const originalText = text(input.originalText);
  if (!originalText) return;
  const structure = {
    routePath: input.routePath,
    pageId: routePageRef(input.projection, input.routePath),
    sourceSectionId: input.sourceSection?.sourceSectionId ?? null,
    sectionId: input.sourceSection?.sectionId ?? null,
    sectionOrder: input.sourceSection?.order ?? null,
    headingHierarchy: input.projection.technicalSignals.headingStructure,
    semanticRole: input.sourceSection?.semanticType ?? null,
    ctaRelationship: input.contentType === "cta" ? "direct_cta_label" : null,
    contactPathRelationship: input.contentType === "contact_detail" ? "direct_contact_signal" : null,
  };
  input.blocks.push({
    blockId: stableId("source-content-block", {
      siteVersionId: input.projection.siteVersionId,
      type: input.contentType,
      routePath: input.routePath,
      originalText,
      sourceOrder: input.sourceOrder,
    }),
    routePath: input.routePath,
    pageRef: structure.pageId,
    sourceSectionRef: structure.sectionId,
    contentType: input.contentType,
    originalText,
    normalizedTextHash: normalizedTextHash(originalText),
    sourceOrder: input.sourceOrder,
    sourceEvidenceRefs: sourceRefs(input.evidenceRefs.length > 0 ? input.evidenceRefs : ["source-website-understanding:content"]),
    sourceArtifactRefs: input.projection.evidenceArtifactRefs,
    language: input.language,
    knowledgeState: input.knowledgeState ?? "structured",
    confidence: input.confidence ?? confidence("MEDIUM", ["Existing Source Website Understanding content signal is available."]),
    reviewState: input.reviewState ?? "not_applicable",
    structure,
    limitations: input.limitations ?? [],
  });
}

function buildContentBlocks(projection: SourceWebsiteUnderstandingProjection): SourceContentBlock[] {
  const blocks: SourceContentBlock[] = [];
  const language = projection.sourceIdentity.languageSignals[0]?.language ?? null;
  let order = 0;
  addContentBlock({
    blocks,
    projection,
    routePath: "/",
    sourceSection: projection.sections.find((section) => section.heading === projection.technicalSignals.title) ?? projection.sections.find((section) => !section.plannedOnly) ?? null,
    contentType: "title",
    originalText: projection.technicalSignals.title,
    sourceOrder: order++,
    evidenceRefs: projection.technicalSignals.evidenceRefs,
    language,
    confidence: projection.technicalSignals.confidence,
  });
  for (const nav of projection.navigation) {
    addContentBlock({
      blocks,
      projection,
      routePath: nav.routePath,
      sourceSection: null,
      contentType: nav.navigationKind === "contact" ? "contact_detail" : "navigation_label",
      originalText: nav.label,
      sourceOrder: order++,
      evidenceRefs: nav.evidenceRefs,
      language,
      knowledgeState: nav.state,
      confidence: nav.confidence,
      reviewState: nav.reviewState,
    });
  }
  for (const content of projection.content) {
    content.headings.forEach((heading, index) => addContentBlock({
      blocks,
      projection,
      routePath: content.routePath,
      sourceSection: nearestSection(projection, content.routePath, index),
      contentType: "heading",
      originalText: heading,
      sourceOrder: order++,
      evidenceRefs: content.evidenceRefs,
      language,
      knowledgeState: content.classificationStatus,
      confidence: content.confidence,
      limitations: content.limitations,
    }));
    content.visibleMessages.forEach((message, index) => addContentBlock({
      blocks,
      projection,
      routePath: content.routePath,
      sourceSection: nearestSection(projection, content.routePath, index),
      contentType: "paragraph",
      originalText: message,
      sourceOrder: order++,
      evidenceRefs: content.evidenceRefs,
      language,
      knowledgeState: content.classificationStatus,
      confidence: content.confidence,
      limitations: content.limitations,
    }));
    content.ctaSignals.forEach((cta, index) => addContentBlock({
      blocks,
      projection,
      routePath: content.routePath,
      sourceSection: nearestSection(projection, content.routePath, index),
      contentType: /contact|kontakt|call|email/i.test(cta) ? "contact_detail" : "cta",
      originalText: cta,
      sourceOrder: order++,
      evidenceRefs: content.evidenceRefs,
      language,
      knowledgeState: content.classificationStatus,
      confidence: content.confidence,
    }));
    for (const [key, value] of Object.entries(content.metadata)) {
      addContentBlock({
        blocks,
        projection,
        routePath: content.routePath,
        sourceSection: null,
        contentType: "metadata",
        originalText: `${key}: ${value}`,
        sourceOrder: order++,
        evidenceRefs: content.evidenceRefs,
        language,
        knowledgeState: content.classificationStatus,
        confidence: content.confidence,
      });
    }
  }
  for (const signal of projection.businessSignalCandidates.offerings) {
    addContentBlock({ blocks, projection, routePath: null, sourceSection: null, contentType: "service_offer_text", originalText: signal.label, sourceOrder: order++, evidenceRefs: signal.evidenceRefs, language, knowledgeState: signal.state, confidence: signal.confidence, reviewState: signal.reviewState, limitations: signal.limitations });
  }
  for (const signal of projection.businessSignalCandidates.audiences) {
    addContentBlock({ blocks, projection, routePath: null, sourceSection: null, contentType: "audience_language", originalText: signal.label, sourceOrder: order++, evidenceRefs: signal.evidenceRefs, language, knowledgeState: signal.state, confidence: signal.confidence, reviewState: signal.reviewState, limitations: signal.limitations });
  }
  for (const signal of projection.businessSignalCandidates.trust) {
    addContentBlock({ blocks, projection, routePath: null, sourceSection: null, contentType: "trust_statement", originalText: signal.label, sourceOrder: order++, evidenceRefs: signal.evidenceRefs, language, knowledgeState: signal.state, confidence: signal.confidence, reviewState: signal.reviewState, limitations: signal.limitations });
  }
  for (const asset of projection.assets.filter((item) => item.altText)) {
    addContentBlock({ blocks, projection, routePath: asset.usages[0]?.routePath ?? null, sourceSection: null, contentType: "alt_text", originalText: asset.altText, sourceOrder: order++, evidenceRefs: asset.evidenceRefs, language, knowledgeState: asset.evidenceState, confidence: asset.confidence, limitations: asset.limitations });
  }
  return blocks.sort((left, right) => left.sourceOrder - right.sourceOrder || left.blockId.localeCompare(right.blockId));
}

function policyForBlock(block: SourceContentBlock): {
  policy: SourceContentTransformationPolicy;
  continuityState: SourceContinuityState;
  reasonCode: string;
  reviewRequirement: SourceContentContinuityCandidate["reviewRequirement"];
} {
  if (block.reviewState === "rejected") return { policy: "EXCLUDE", continuityState: "exclude_candidate", reasonCode: "review_rejected_source_candidate", reviewRequirement: "none" };
  if (block.contentType === "title") return { policy: "PRESERVE_VERBATIM", continuityState: "preserve_candidate", reasonCode: "business_name_or_title_directly_observed", reviewRequirement: "recommended" };
  if (block.contentType === "contact_detail") return { policy: "PRESERVE_VERBATIM", continuityState: "preserve_candidate", reasonCode: "contact_detail_directly_observed", reviewRequirement: "recommended" };
  if (block.contentType === "navigation_label") return { policy: "PRESERVE_WITH_CLEANUP", continuityState: "preserve_candidate", reasonCode: "navigation_label_can_be_cleaned_without_rewriting_meaning", reviewRequirement: "recommended" };
  if (block.contentType === "legal_text" || /privacy|terms|gdpr|cookie|legal|impressum|zasebnost|pogoji/i.test(block.originalText)) {
    return { policy: "REQUIRE_CONFIRMATION", continuityState: "confirmation_required", reasonCode: "legal_text_requires_confirmation", reviewRequirement: "required" };
  }
  if (block.contentType === "service_offer_text" && ["reviewed", "confirmed_source_fact", "structured"].includes(block.knowledgeState)) {
    return { policy: "IMPROVE_PRESERVING_MEANING", continuityState: "improve_candidate", reasonCode: "explicit_service_copy_can_be_improved_without_new_claims", reviewRequirement: "required" };
  }
  if (block.contentType === "audience_language") return { policy: "REQUIRE_CONFIRMATION", continuityState: "confirmation_required", reasonCode: "audience_language_is_inferred_or_candidate_only", reviewRequirement: "required" };
  if (block.contentType === "trust_statement") return { policy: "PRESERVE_VERBATIM", continuityState: "preserve_candidate", reasonCode: "trust_claim_must_not_be_strengthened", reviewRequirement: "required" };
  if (/placeholder|lorem ipsum|test content/i.test(block.originalText)) return { policy: "EXCLUDE", continuityState: "exclude_candidate", reasonCode: "placeholder_text_observed", reviewRequirement: "required" };
  return { policy: "REQUIRE_CONFIRMATION", continuityState: "confirmation_required", reasonCode: "unclassified_body_copy_requires_confirmation", reviewRequirement: "required" };
}

function buildTransformationCandidates(blocks: SourceContentBlock[]): SourceContentContinuityCandidate[] {
  return blocks.map((block) => {
    const policy = policyForBlock(block);
    return {
      candidateId: stableId("source-content-policy", { blockId: block.blockId, policy }),
      contentBlockId: block.blockId,
      continuityState: policy.continuityState,
      proposedPolicy: policy.policy,
      reasonCode: policy.reasonCode,
      reviewRequirement: policy.reviewRequirement,
      evidenceRefs: block.sourceEvidenceRefs.map((ref) => ref.refId),
      confidence: block.confidence,
      knowledgeState: block.knowledgeState === "confirmed_source_fact" ? "reviewed" : block.knowledgeState,
      limitations: [
        ...block.limitations,
        "No text transformation has been performed by this projection.",
      ],
    };
  });
}

function assetCategory(asset: SourceAssetUnderstanding): SourceAssetContinuityItem["assetCategory"] {
  if (asset.candidateMeaning === "logo_candidate") return "logo_candidate";
  if (asset.assetKind === "svg") return "svg";
  if (asset.assetKind === "image") return "image";
  if (asset.assetKind === "icon") return "icon";
  if (asset.assetKind === "font") return "font";
  if (asset.assetKind === "video") return "video";
  if (asset.assetKind === "document") return "document";
  if (/favicon/i.test(asset.path)) return "favicon";
  if (/manifest/i.test(asset.path)) return "manifest_asset";
  return "other";
}

function reuseCandidate(asset: SourceAssetUnderstanding): SourceAssetReuseCandidate {
  if (asset.previewHref === null && ["image", "svg", "icon"].includes(asset.assetKind)) {
    return { reuseState: "technically_unusable", continuityState: "technically_unusable", reasonCode: "safe_preview_reference_unavailable", reviewRequirement: "required", licensingSourceStatus: "unresolved", evidenceRefs: asset.evidenceRefs, confidence: confidence("LOW", ["Safe preview/access reference is unavailable."]), limitations: ["Preview availability is required for operator inspection and still would not authorize reuse."] };
  }
  if (asset.candidateMeaningState === "rejected") {
    return { reuseState: "prohibited", continuityState: "exclude_candidate", reasonCode: "candidate_rejected", reviewRequirement: "none", licensingSourceStatus: "unresolved", evidenceRefs: asset.evidenceRefs, confidence: confidence("LOW", ["Candidate review rejected this source meaning."]), limitations: ["Rejected source candidates remain traceable but are not reuse-authorized."] };
  }
  if (asset.candidateMeaning === "logo_candidate") {
    return { reuseState: "licensing_unresolved", continuityState: "licensing_unresolved", reasonCode: "logo_candidate_requires_confirmation_and_source_license", reviewRequirement: "required", licensingSourceStatus: "unresolved", evidenceRefs: asset.evidenceRefs, confidence: asset.confidence, limitations: ["Candidate does not mean confirmed brand asset.", "Missing licensing/source state blocks automatic reuse."] };
  }
  if (asset.assetKind === "font") {
    return { reuseState: "licensing_unresolved", continuityState: "licensing_unresolved", reasonCode: "font_license_unresolved", reviewRequirement: "required", licensingSourceStatus: "unresolved", evidenceRefs: asset.evidenceRefs, confidence: asset.confidence, limitations: ["Font file existence does not authorize reuse."] };
  }
  return { reuseState: "requires_confirmation", continuityState: "confirmation_required", reasonCode: "asset_role_or_license_unconfirmed", reviewRequirement: "required", licensingSourceStatus: "unresolved", evidenceRefs: asset.evidenceRefs, confidence: asset.confidence, limitations: ["File existence and preview availability do not authorize reuse."] };
}

function usageKind(kind: SourceAssetUnderstanding["usages"][number]["usageKind"]): SourceAssetUsageEvidence["usageKind"] {
  if (kind === "semantic_image") return "inline_image_use";
  if (kind === "header_navigation") return "header_use";
  if (kind === "css_reference") return "css_background_use";
  if (kind === "html_reference") return "page_use";
  return "unknown";
}

function buildAssetContinuity(projection: SourceWebsiteUnderstandingProjection): SourceAssetContinuityItem[] {
  return projection.assets.map((asset) => ({
    assetId: stableId("continuity-asset", { sourceAssetId: asset.assetId, path: asset.path }),
    sourceAssetId: asset.assetId,
    safeReference: asset.path,
    filename: asset.filename,
    mediaType: asset.mediaType,
    assetCategory: assetCategory(asset),
    contentHash: asset.sha256,
    sizeBytes: asset.sizeBytes,
    dimensions: asset.dimensions,
    sourceArtifactRefs: projection.sourceArtifactRefs,
    sourcePageUsage: uniqueSorted(asset.usages.map((usage) => usage.routePath ?? "").filter(Boolean)),
    sourceSectionUsage: [],
    usageEvidence: asset.usages.map((usage, index) => ({
      usageId: stableId("continuity-asset-usage", { assetId: asset.assetId, usage, index }),
      usageKind: usageKind(usage.usageKind),
      routePath: usage.routePath,
      sourceSectionRef: null,
      evidenceRefs: usage.evidenceRefs,
    })),
    headerNavigationUsage: asset.usages.some((usage) => usage.usageKind === "header_navigation"),
    cssBackgroundUsage: asset.usages.some((usage) => usage.usageKind === "css_reference"),
    repeatedUsage: asset.repeatedUsageCount > 1,
    altText: asset.altText,
    safePreviewRef: asset.previewHref,
    classificationState: asset.candidateMeaningState === "confirmed_source_fact" ? "reviewed" : asset.candidateMeaningState,
    candidateMeaning: asset.candidateMeaning,
    reviewState: asset.reviewState,
    reuseCandidate: reuseCandidate(asset),
    confidence: asset.confidence,
    limitations: asset.limitations,
  })).sort((left, right) => left.safeReference.localeCompare(right.safeReference));
}

function imageRole(asset: SourceAssetContinuityItem): SourceImageRoleCandidate {
  const lower = `${asset.safeReference} ${asset.altText ?? ""} ${asset.candidateMeaning ?? ""}`.toLowerCase();
  if (asset.assetCategory === "logo_candidate" || lower.includes("logo")) return "logo";
  if (lower.includes("hero")) return "hero";
  if (asset.assetCategory === "icon") return "icon";
  if (lower.includes("background")) return "background";
  if (lower.includes("gallery")) return "gallery";
  return ["image", "svg", "logo_candidate", "icon"].includes(asset.assetCategory) ? "unknown" : "unknown";
}

function buildLogoCandidates(assets: SourceAssetContinuityItem[]): SourceLogoContinuityCandidate[] {
  return assets.filter((asset) => asset.assetCategory === "logo_candidate").map((asset) => ({
    candidateId: stableId("continuity-logo", { sourceAssetId: asset.sourceAssetId, safeReference: asset.safeReference }),
    sourceAssetId: asset.sourceAssetId,
    sourceReference: asset.safeReference,
    previewRef: asset.safePreviewRef,
    mediaType: asset.mediaType,
    dimensions: asset.dimensions,
    fileSizeBytes: asset.sizeBytes,
    altText: asset.altText,
    structuredLogoMetadata: asset.candidateMeaning ? [asset.candidateMeaning] : [],
    headerNavigationUsage: asset.headerNavigationUsage,
    repeatedUsage: asset.repeatedUsage,
    sourceEvidenceRefs: asset.usageEvidence.flatMap((usage) => usage.evidenceRefs),
    confidence: asset.confidence,
    reviewState: asset.reviewState,
    licensingSourceStatus: asset.reuseCandidate.licensingSourceStatus,
    continuityRecommendation: "licensing_unresolved",
    limitations: ["Candidate does not mean confirmed brand asset.", ...asset.reuseCandidate.limitations],
  }));
}

function buildImageCandidates(assets: SourceAssetContinuityItem[]): SourceImageContinuityCandidate[] {
  return assets.filter((asset) => ["image", "svg", "logo_candidate", "icon"].includes(asset.assetCategory)).map((asset) => {
    const roleCandidate = imageRole(asset);
    return {
      candidateId: stableId("continuity-image", { sourceAssetId: asset.sourceAssetId, roleCandidate }),
      sourceAssetId: asset.sourceAssetId,
      roleCandidate,
      sourceReference: asset.safeReference,
      previewRef: asset.safePreviewRef,
      confidence: asset.confidence.level === "HIGH" && roleCandidate === "unknown" ? confidence("MEDIUM", asset.confidence.reasons) : asset.confidence,
      reviewState: asset.reviewState,
      licensingSourceStatus: asset.reuseCandidate.licensingSourceStatus,
      continuityRecommendation: asset.reuseCandidate.continuityState,
      evidenceRefs: asset.usageEvidence.flatMap((usage) => usage.evidenceRefs),
      limitations: roleCandidate === "unknown" ? ["Image role is unresolved; no new image classifier runs in VCU-2."] : asset.reuseCandidate.limitations,
    };
  });
}

function buildTypography(projection: SourceWebsiteUnderstandingProjection, assets: SourceAssetContinuityItem[]): SourceTypographyContinuityCandidate[] {
  const fontAssetsByName = new Map(assets.filter((asset) => asset.assetCategory === "font").map((asset) => [asset.filename.replace(/\.(woff2?|ttf|otf|eot)$/i, "").toLocaleLowerCase(), asset]));
  return projection.visualIdentitySignals.typographySignals.map((signal) => {
    const role = signal.role === "heading" || signal.role === "body" || signal.role === "icon_font" || signal.role === "local_font_file" ? signal.role : "unknown";
    const file = fontAssetsByName.get(signal.family.toLocaleLowerCase());
    const iconFont = role === "icon_font" || /fontello|icon|glyph/i.test(signal.family);
    return {
      candidateId: stableId("continuity-typography", { family: signal.family, role }),
      family: signal.family,
      roleCandidate: iconFont ? "icon_font" : role,
      fontFiles: file ? [file.safeReference] : [],
      weights: [],
      styles: [],
      localOrExternalAvailability: signal.localAvailability === "available" ? "local" : "unknown",
      headingUsage: role === "heading",
      bodyUsage: role === "body",
      iconFontUsage: iconFont,
      sourceEvidenceRefs: signal.evidenceRefs,
      licenseSourceStatus: "unresolved",
      confidence: signal.confidence,
      reviewState: "not_applicable",
      continuityRecommendation: "licensing_unresolved",
      limitations: [
        "Typography is a source signal, not canonical typography.",
        ...(iconFont ? ["Icon-font evidence must not be promoted to brand/body/heading typography without explicit evidence."] : []),
      ],
    };
  });
}

function colorRole(label: string): SourceColorContinuitySignal["candidateRole"] {
  const lower = label.toLocaleLowerCase();
  if (lower.includes("primary")) return "primary_candidate";
  if (lower.includes("secondary")) return "secondary_candidate";
  if (lower.includes("accent") || lower.includes("cta")) return "accent_candidate";
  if (lower.includes("neutral") || lower.includes("background")) return "background_candidate";
  return "uncertain";
}

function buildColorSignals(projection: SourceWebsiteUnderstandingProjection): SourceColorContinuitySignal[] {
  return projection.visualIdentitySignals.colorSignals.flatMap((signal) => {
    const value = text(signal.value);
    if (!value) return [];
    return [{
      signalId: stableId("continuity-color", { value, label: signal.label }),
      value,
      normalizedValue: value.toLocaleLowerCase(),
      sourceDeclaration: signal.label,
      usage: [signal.label],
      candidateRole: colorRole(signal.label),
      frequency: null,
      contrastContext: null,
      evidenceRefs: signal.evidenceRefs,
      confidence: signal.confidence,
      knowledgeState: signal.state === "confirmed_source_fact" ? "reviewed" as const : signal.state,
      limitations: ["Color signal is not a canonical palette entry."],
    }];
  });
}

function buildVisualStyleSignals(projection: SourceWebsiteUnderstandingProjection): SourceVisualStyleContinuitySignal[] {
  return [
    ...projection.visualIdentitySignals.iconStyleSignals.map((signal) => ({
      signalId: stableId("continuity-style", { type: "icon_style", id: signal.signalId }),
      signalType: "icon_style" as const,
      label: signal.label,
      knowledgeState: signal.state === "confirmed_source_fact" ? "reviewed" as const : signal.state,
      evidenceRefs: signal.evidenceRefs,
      confidence: signal.confidence,
      limitations: [],
    })),
    ...projection.visualIdentitySignals.imageStyleSignals.map((signal) => ({
      signalId: stableId("continuity-style", { type: "image_style", id: signal.signalId }),
      signalType: "image_style" as const,
      label: signal.label,
      knowledgeState: signal.state === "confirmed_source_fact" ? "reviewed" as const : signal.state,
      evidenceRefs: signal.evidenceRefs,
      confidence: signal.confidence,
      limitations: [],
    })),
  ];
}

function buildLayoutContinuity(projection: SourceWebsiteUnderstandingProjection, screenshots: SourceScreenshotReference[]): SourceLayoutContinuity {
  const sectionSequence: SourceLayoutSectionReference[] = projection.sections.map((section) => ({
    sectionId: section.sectionId,
    sourceSectionId: section.sourceSectionId,
    routePath: section.routePath,
    order: section.order,
    heading: section.heading,
    semanticType: section.semanticType,
    observedLayoutState: section.plannedOnly ? "unavailable" : section.state === "confirmed_source_fact" ? "reviewed" : section.state,
    continuityState: section.plannedOnly ? "confirmation_required" as const : "preserve_candidate" as const,
    structurePlanContextOnly: section.plannedOnly,
    evidenceRefs: section.evidenceRefs,
    limitations: section.plannedOnly ? ["StructurePlan context is separated from observed source layout."] : section.limitations,
  })).sort((left, right) => left.order - right.order);
  return {
    routeStructure: projection.routes.map((route) => route.routePath),
    sectionSequence,
    headingHierarchy: projection.technicalSignals.headingStructure,
    heroPresence: sectionSequence.some((section) => section.semanticType === "hero") ? "structured" : "missing",
    headerFooterEvidence: sectionSequence.some((section) => /header|footer|navigation/i.test(section.semanticType ?? "")) ? "structured" : "missing",
    geometryEvidence: projection.evidenceArtifactRefs.length > 0 ? "observed" : "missing",
    responsiveEvidence: "unavailable",
    layoutScreenshots: screenshots.map((screenshot) => screenshot.screenshotId),
    futureDesignIntentSeparated: true,
    limitations: ["Layout continuity preserves source relationships; it does not require pixel-identical regeneration."],
  };
}

function buildScreenshots(projection: SourceWebsiteUnderstandingProjection, inputs: NormalizedSourceScreenshotInput[]): SourceScreenshotReference[] {
  return inputs.map((input) => ({
    screenshotId: input.screenshotId,
    routePath: input.routePath ?? "/",
    sourceUrl: input.sourceUrl ?? projection.sourceIdentity.sourceUrl,
    viewport: input.viewport ?? null,
    dimensions: input.dimensions ?? null,
    capturedAt: input.capturedAt ?? projection.sourceIdentity.captureCompletedAt,
    completeness: input.completeness ?? "unknown",
    safeAccessRef: input.safeAccessRef ?? null,
    evidenceRefs: input.evidenceRefs ?? [`source-screenshot:${input.screenshotId}`],
    lineage: projection.evidenceArtifactRefs,
    availability: input.availability ?? "available",
    limitations: input.safeAccessRef ? [] : ["Screenshot evidence exists, but no safe screenshot access reference is available."],
  }));
}

function dimension(key: ContinuityReadinessDimension["key"], status: ContinuityReadinessDimension["status"], summary: string, evidenceRefs: string[] = []): ContinuityReadinessDimension {
  return { key, status, summary, evidenceRefs };
}

function buildReadiness(input: {
  projection: SourceWebsiteUnderstandingProjection;
  contentBlocks: SourceContentBlock[];
  transformationCandidates: SourceContentContinuityCandidate[];
  assets: SourceAssetContinuityItem[];
  logoCandidates: SourceLogoContinuityCandidate[];
  imageCandidates: SourceImageContinuityCandidate[];
  typography: SourceTypographyContinuityCandidate[];
  colors: SourceColorContinuitySignal[];
  visualStyles: SourceVisualStyleContinuitySignal[];
  layout: SourceLayoutContinuity;
  screenshots: SourceScreenshotReference[];
  limitations: ContinuityLimitation[];
}): ContinuityReadiness {
  const unresolvedReuse = input.assets.filter((asset) => asset.reuseCandidate.reuseState !== "safe_to_reuse").length;
  const dims: ContinuityReadinessDimension[] = [
    dimension("source_content_capture", input.contentBlocks.length > 0 ? "partial" : "missing", `${input.contentBlocks.length} source content block(s) projected.`),
    dimension("content_identity", input.contentBlocks.every((block) => block.normalizedTextHash) ? "ok" : "missing", "Every projected text block carries a deterministic text hash."),
    dimension("content_structure", input.contentBlocks.some((block) => block.structure.sectionId) ? "partial" : "missing", "Source route/section relationships remain visible where WU exposes them."),
    dimension("content_classification", input.contentBlocks.some((block) => block.contentType !== "unclassified_body_copy") ? "partial" : "missing", "Classification is conservative and source-level only."),
    dimension("transformation_policy_coverage", input.transformationCandidates.length === input.contentBlocks.length ? "ok" : "partial", `${input.transformationCandidates.length} policy candidate(s) projected.`),
    dimension("asset_inventory", input.assets.length > 0 ? "ok" : "missing", `${input.assets.length} source asset(s) projected.`),
    dimension("asset_usage_evidence", input.assets.some((asset) => asset.usageEvidence.length > 0) ? "partial" : "missing", "Asset usage is reused from existing structured evidence only."),
    dimension("asset_role_coverage", input.imageCandidates.some((candidate) => candidate.roleCandidate !== "unknown") ? "partial" : "missing", "Image roles remain unresolved unless upstream evidence supports them."),
    dimension("logo_candidate_coverage", input.logoCandidates.length > 0 ? "partial" : "missing", `${input.logoCandidates.length} logo candidate(s), none confirmed.`),
    dimension("image_candidate_coverage", input.imageCandidates.length > 0 ? "partial" : "missing", `${input.imageCandidates.length} image candidate(s) projected.`),
    dimension("typography_coverage", input.typography.length > 0 ? "partial" : "missing", `${input.typography.length} typography signal(s) projected.`),
    dimension("color_signal_coverage", input.colors.length > 0 ? "partial" : "missing", `${input.colors.length} color signal(s) projected; no canonical palette.`),
    dimension("visual_style_coverage", input.visualStyles.length > 0 ? "partial" : "missing", `${input.visualStyles.length} structured visual-style signal(s) projected.`),
    dimension("layout_continuity", input.layout.sectionSequence.length > 0 ? "partial" : "missing", `${input.layout.sectionSequence.length} source/planning section relationship(s) projected.`),
    dimension("screenshot_availability", input.screenshots.length > 0 ? "partial" : "missing", input.screenshots.length > 0 ? `${input.screenshots.length} source screenshot reference(s) projected.` : "No existing source screenshot reference is available."),
    dimension("asset_access_readiness", input.assets.some((asset) => asset.safePreviewRef) ? "partial" : "missing", "Safe preview references are exposed only when existing hardened routes exist."),
    dimension("candidate_review_coverage", input.projection.reviewArtifactRefs.length > 0 ? "partial" : "missing", input.projection.reviewArtifactRefs.length > 0 ? "Candidate Review lineage is available." : "Candidate Review is missing."),
    dimension("licensing_source_status", unresolvedReuse === 0 && input.assets.length > 0 ? "ok" : "blocked", unresolvedReuse === 0 ? "All assets have reuse authorization." : `${unresolvedReuse} asset(s) have unresolved reuse/licensing status.`),
    dimension("unresolved_conflicts", input.limitations.some((item) => item.state === "conflicting") ? "conflicting" : "ok", "Conflicts remain explicit; none are synthesized by VCU-2."),
    dimension("generation_delivery_readiness", "blocked", "Generation delivery is blocked until confirmation, licensing, and downstream enrichment are explicitly implemented."),
  ];
  const blockers = [
    ...input.limitations.filter((item) => item.severity === "blocking"),
    ...(unresolvedReuse > 0 ? [limitation({ code: "ASSET_REUSE_NOT_AUTHORIZED", message: "One or more source assets lack reuse/licensing authorization.", severity: "blocking", state: "missing" })] : []),
  ];
  const canDesign = input.contentBlocks.length > 0 && input.assets.length > 0 && blockers.every((item) => item.code === "ASSET_REUSE_NOT_AUTHORIZED");
  return {
    status: blockers.some((item) => item.code !== "ASSET_REUSE_NOT_AUTHORIZED") ? "blocked" : canDesign ? "ready_for_design_enrichment" : "partially_ready",
    readyForDesignEnrichment: canDesign,
    readyForGenerationDelivery: false,
    summary: canDesign
      ? "Continuity materials are sufficient for conservative future design enrichment, with confirmation and licensing gaps still blocking delivery."
      : "Continuity remains partial; missing source evidence or blocking limitations must stay visible.",
    dimensions: dims,
    blockers,
  };
}

function collectLimitations(projection: SourceWebsiteUnderstandingProjection, screenshots: SourceScreenshotReference[]): ContinuityLimitation[] {
  const limitations = projection.limitations.map((item) => limitation({
    code: item.code,
    message: item.message,
    severity: item.severity,
    sourceRefs: item.sourceRefs,
    state: item.state ?? "observed",
  }));
  if (projection.visualIdentitySignals.unresolvedSignals.length > 0) {
    limitations.push(limitation({
      code: "VISUAL_SIGNALS_UNRESOLVED",
      message: projection.visualIdentitySignals.unresolvedSignals.join("; "),
      sourceRefs: ["source-website-understanding:visualIdentitySignals"],
      state: "unavailable",
    }));
  }
  if (screenshots.length === 0) {
    limitations.push(limitation({
      code: "SOURCE_SCREENSHOT_UNAVAILABLE",
      message: "No existing source screenshot reference was available to VCU-2; no screenshot capture or thumbnail generation was attempted.",
      sourceRefs: ["source-website-understanding:evidenceArtifactRefs"],
      state: "unavailable",
    }));
  }
  return limitations;
}

function projectionIdentity(input: Omit<SourceContentVisualContinuityProjection, "projectionId">): string {
  const normalized = { ...input, generatedAt: null };
  return `source_content_visual_continuity_${sha256Hex(stableStringify(normalized)).slice(0, 32)}`;
}

export function buildSourceContentVisualContinuityProjection(input: SourceContentVisualContinuityProjectionBuilderInput): SourceContentVisualContinuityProjection {
  const wu = input.sourceWebsiteUnderstandingProjection;
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const screenshots = buildScreenshots(wu, input.sourceScreenshots ?? []);
  const contentBlocks = buildContentBlocks(wu);
  const contentTransformationCandidates = buildTransformationCandidates(contentBlocks);
  const assetContinuity = buildAssetContinuity(wu);
  const logoCandidates = buildLogoCandidates(assetContinuity);
  const imageCandidates = buildImageCandidates(assetContinuity);
  const typographyCandidates = buildTypography(wu, assetContinuity);
  const colorSignals = buildColorSignals(wu);
  const visualStyleSignals = buildVisualStyleSignals(wu);
  const layoutContinuity = buildLayoutContinuity(wu, screenshots);
  const limitations = collectLimitations(wu, screenshots);
  const readiness = buildReadiness({
    projection: wu,
    contentBlocks,
    transformationCandidates: contentTransformationCandidates,
    assets: assetContinuity,
    logoCandidates,
    imageCandidates,
    typography: typographyCandidates,
    colors: colorSignals,
    visualStyles: visualStyleSignals,
    layout: layoutContinuity,
    screenshots,
    limitations,
  });
  const diagnostics = [
    ...wu.diagnostics.map((item) => diagnostic(item.code, item.message, item.sourceRefs)),
    ...(input.downstreamInputs ? [diagnostic("DOWNSTREAM_INPUT_REJECTED", "Downstream/generated inputs are forbidden for VCU-2 and were not consumed.", [])] : []),
  ];
  const screenshotArtifactRefs = screenshots.flatMap((screenshot) => screenshot.lineage);
  const withoutId: Omit<SourceContentVisualContinuityProjection, "projectionId"> = {
    contractVersion: SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION,
    generatedAt,
    siteVersionId: wu.siteVersionId,
    sourceSiteId: wu.sourceSiteId,
    dryRunId: wu.dryRunId,
    connectorType: wu.connectorType,
    sourceWebsiteUnderstandingProjectionId: wu.projectionId,
    sourceArtifactRefs: wu.sourceArtifactRefs,
    evidenceArtifactRefs: wu.evidenceArtifactRefs,
    candidateArtifactRefs: wu.candidateArtifactRefs,
    reviewArtifactRefs: wu.reviewArtifactRefs,
    screenshotArtifactRefs,
    sourceIdentity: {
      siteVersionId: wu.siteVersionId,
      sourceSiteId: wu.sourceSiteId,
      dryRunId: wu.dryRunId,
      sourceUrl: wu.sourceIdentity.sourceUrl,
      finalUrl: wu.sourceIdentity.finalUrl,
      hostname: wu.sourceIdentity.hostname,
      connectorType: wu.sourceIdentity.connectorType,
      sourceWebsiteUnderstandingProjectionId: wu.projectionId,
      sourceAvailability: wu.sourceIdentity.sourceAvailability,
      evidenceRefs: wu.sourceIdentity.evidenceRefs,
    },
    contentBlocks,
    contentTransformationCandidates,
    assetContinuity,
    visualIdentitySignals: {
      logoCandidates,
      imageCandidates,
      typographyCandidates,
      colorSignals,
      visualStyleSignals,
      unresolvedSignals: wu.visualIdentitySignals.unresolvedSignals,
    },
    layoutContinuity,
    sourceScreenshots: screenshots,
    thumbnailReadiness: {
      originalSourceScreenshotAvailable: screenshots.length > 0,
      safeScreenshotReferenceAvailable: screenshots.some((screenshot) => Boolean(screenshot.safeAccessRef)),
      suitableForWorkspaceThumbnail: screenshots.some((screenshot) => Boolean(screenshot.safeAccessRef) && screenshot.availability === "available"),
      blockers: screenshots.length === 0
        ? ["No original-source screenshot reference is available."]
        : screenshots.some((screenshot) => Boolean(screenshot.safeAccessRef))
          ? []
          : ["Original-source screenshot exists without a safe access reference."],
    },
    readiness,
    confidence: confidence(readiness.readyForDesignEnrichment ? "MEDIUM" : "LOW", [
      readiness.summary,
      "Continuity confidence is fail-closed and does not use downstream evidence.",
    ]),
    limitations,
    diagnostics,
    lineage: {
      siteVersionId: wu.siteVersionId,
      sourceSiteId: wu.sourceSiteId,
      dryRunId: wu.dryRunId,
      contractVersion: SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION,
      sourceWebsiteUnderstandingProjectionId: wu.projectionId,
      sourceArtifactRefs: wu.sourceArtifactRefs,
      evidenceArtifactRefs: wu.evidenceArtifactRefs,
      candidateArtifactRefs: wu.candidateArtifactRefs,
      reviewArtifactRefs: wu.reviewArtifactRefs,
      screenshotArtifactRefs,
      deterministicInputs: {
        siteVersionId: wu.siteVersionId,
        sourceSiteId: wu.sourceSiteId,
        dryRunId: wu.dryRunId,
        contractVersion: SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION,
        sourceWebsiteUnderstandingProjectionId: wu.projectionId,
        artifactIds: [],
      },
    },
  };
  const projection = { projectionId: projectionIdentity(withoutId), ...withoutId };
  projection.lineage.deterministicInputs.artifactIds = artifactIds(projection);
  const finalProjectionId = projectionIdentity({ ...projection, projectionId: undefined } as unknown as Omit<SourceContentVisualContinuityProjection, "projectionId">);
  return { ...projection, projectionId: finalProjectionId };
}

function validateNoForbiddenFields(value: unknown, path: string, errors: string[], seen: WeakSet<object>): void {
  if ((!isRecord(value) && !Array.isArray(value)) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (SOURCE_CONTENT_VISUAL_CONTINUITY_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nextPath} is forbidden in Source Content & Visual Continuity Projection`);
    }
    validateNoForbiddenFields(nested, nextPath, errors, seen);
  }
}

function validateUnique(ids: string[], path: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${path} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function pathLooksUnsafe(value: string): boolean {
  return value.startsWith("/") || value.includes("..") || /^[a-z]+:\/\//i.test(value) || value.startsWith("~");
}

function validateConfidence(value: ContinuityConfidence, path: string, errors: string[]): void {
  if (!["LOW", "MEDIUM", "HIGH"].includes(value?.level)) errors.push(`${path}.level must be LOW, MEDIUM, or HIGH`);
  if (!Array.isArray(value?.reasons)) errors.push(`${path}.reasons must be an array`);
}

export function validateSourceContentVisualContinuityProjection(value: unknown): ContinuityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["Projection must be an object"], warnings };
  validateNoForbiddenFields(value, "", errors, new WeakSet<object>());
  const projection = value as SourceContentVisualContinuityProjection;
  if (projection.contractVersion !== SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION) errors.push("contractVersion must be VCU-2");
  if (!text(projection.projectionId)) errors.push("projectionId is required");
  if (!text(projection.siteVersionId)) errors.push("siteVersionId is required");
  if (projection.sourceSiteId !== projection.sourceIdentity?.sourceSiteId) errors.push("sourceSiteId must match sourceIdentity.sourceSiteId");
  if (projection.sourceWebsiteUnderstandingProjectionId !== projection.sourceIdentity?.sourceWebsiteUnderstandingProjectionId) errors.push("source WU projection ID must match source identity");
  if (projection.sourceWebsiteUnderstandingProjectionId !== projection.lineage?.sourceWebsiteUnderstandingProjectionId) errors.push("source WU projection ID must match lineage");
  if (!CONTINUITY_READINESS_STATUSES.includes(projection.readiness?.status as never)) errors.push("readiness.status is invalid");
  validateConfidence(projection.confidence, "confidence", errors);
  for (const key of CONTINUITY_READINESS_DIMENSIONS) {
    if (!projection.readiness?.dimensions?.some((item) => item.key === key)) errors.push(`readiness dimension ${key} is missing`);
  }
  validateUnique((projection.contentBlocks ?? []).map((item) => item.blockId), "contentBlocks", errors);
  validateUnique((projection.assetContinuity ?? []).map((item) => item.assetId), "assetContinuity", errors);
  validateUnique((projection.visualIdentitySignals?.logoCandidates ?? []).map((item) => item.candidateId), "logoCandidates", errors);
  validateUnique((projection.visualIdentitySignals?.typographyCandidates ?? []).map((item) => item.candidateId), "typographyCandidates", errors);
  for (const [index, block] of (projection.contentBlocks ?? []).entries()) {
    if (!CONTINUITY_KNOWLEDGE_STATES.includes(block.knowledgeState as never)) errors.push(`contentBlocks[${index}].knowledgeState is invalid`);
    if (!block.normalizedTextHash) errors.push(`contentBlocks[${index}].normalizedTextHash is required`);
    if (["observed", "structured", "candidate", "reviewed", "confirmed_source_fact", "rejected", "conflicting"].includes(block.knowledgeState) && block.sourceEvidenceRefs.length === 0) {
      errors.push(`contentBlocks[${index}] requires evidence refs`);
    }
    validateConfidence(block.confidence, `contentBlocks[${index}].confidence`, errors);
  }
  for (const [index, candidate] of (projection.contentTransformationCandidates ?? []).entries()) {
    if (!SOURCE_CONTENT_TRANSFORMATION_POLICIES.includes(candidate.proposedPolicy as never)) errors.push(`contentTransformationCandidates[${index}].proposedPolicy is invalid`);
    if (!CONTINUITY_STATES.includes(candidate.continuityState as never)) errors.push(`contentTransformationCandidates[${index}].continuityState is invalid`);
    if (!projection.contentBlocks.some((block) => block.blockId === candidate.contentBlockId)) errors.push(`contentTransformationCandidates[${index}] references missing content block`);
    if (candidate.evidenceRefs.length === 0) errors.push(`contentTransformationCandidates[${index}] requires evidence refs`);
    validateConfidence(candidate.confidence, `contentTransformationCandidates[${index}].confidence`, errors);
  }
  for (const [index, asset] of (projection.assetContinuity ?? []).entries()) {
    if (pathLooksUnsafe(asset.safeReference)) errors.push(`assetContinuity[${index}].safeReference exposes an unsafe path`);
    if (!SOURCE_ASSET_REUSE_STATES.includes(asset.reuseCandidate.reuseState as never)) errors.push(`assetContinuity[${index}].reuseState is invalid`);
    if (asset.reuseCandidate.reuseState === "safe_to_reuse" && asset.reuseCandidate.licensingSourceStatus !== "available") errors.push(`assetContinuity[${index}] cannot be safe_to_reuse without available licensing/source status`);
    if (asset.classificationState === "confirmed_source_fact") errors.push(`assetContinuity[${index}] promotes asset classification to confirmed source fact`);
    validateConfidence(asset.confidence, `assetContinuity[${index}].confidence`, errors);
  }
  for (const [index, logo] of (projection.visualIdentitySignals?.logoCandidates ?? []).entries()) {
    if (logo.continuityRecommendation === "reuse_candidate" || logo.licensingSourceStatus === "available") {
      errors.push(`logoCandidates[${index}] must remain candidate/unresolved, not confirmed reuse`);
    }
  }
  for (const [index, image] of (projection.visualIdentitySignals?.imageCandidates ?? []).entries()) {
    if (!SOURCE_IMAGE_ROLE_CANDIDATES.includes(image.roleCandidate as never)) errors.push(`imageCandidates[${index}].roleCandidate is invalid`);
  }
  for (const [index, typography] of (projection.visualIdentitySignals?.typographyCandidates ?? []).entries()) {
    if (/fontello|icon|glyph/i.test(typography.family) && (typography.headingUsage || typography.bodyUsage) && !typography.iconFontUsage) {
      errors.push(`typographyCandidates[${index}] promotes icon font to heading/body typography`);
    }
  }
  if (projection.visualIdentitySignals?.colorSignals?.some((signal) => signal.knowledgeState === "confirmed_source_fact")) {
    errors.push("color signals must not become canonical palette facts");
  }
  if (projection.layoutContinuity?.futureDesignIntentSeparated !== true) errors.push("layout continuity must separate future design intent");
  if (projection.readiness?.readyForGenerationDelivery && projection.readiness.status !== "ready_for_generation_delivery") {
    errors.push("readyForGenerationDelivery requires ready_for_generation_delivery status");
  }
  const expectedArtifactIds = artifactIds(projection);
  const actualArtifactIds = [...(projection.lineage?.deterministicInputs?.artifactIds ?? [])].sort();
  if (expectedArtifactIds.length !== actualArtifactIds.length || expectedArtifactIds.some((id, index) => id !== actualArtifactIds[index])) {
    errors.push("lineage.deterministicInputs.artifactIds must match projected artifact refs");
  }
  const expectedId = projectionIdentity({ ...projection, projectionId: undefined } as unknown as Omit<SourceContentVisualContinuityProjection, "projectionId">);
  if (projection.projectionId !== expectedId) warnings.push("projectionId does not match normalized projection content");
  return { valid: errors.length === 0, errors, warnings };
}
