import type {
  SourceWebsiteConfidenceLevel,
  SourceWebsiteKnowledgeState,
  SourceWebsiteUnderstandingArtifactReference,
} from "./source-website-understanding-projection-contract";

export const SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION = "VCU-2" as const;

export const CONTINUITY_KNOWLEDGE_STATES = [
  "observed",
  "structured",
  "candidate",
  "reviewed",
  "confirmed_source_fact",
  "rejected",
  "conflicting",
  "missing",
  "unavailable",
] as const satisfies readonly SourceWebsiteKnowledgeState[];
export type ContinuityKnowledgeState = (typeof CONTINUITY_KNOWLEDGE_STATES)[number];

export const CONTINUITY_STATES = [
  "preserve_candidate",
  "improve_candidate",
  "reuse_candidate",
  "exclude_candidate",
  "confirmation_required",
  "licensing_unresolved",
  "technically_unusable",
] as const;
export type SourceContinuityState = (typeof CONTINUITY_STATES)[number];

export const SOURCE_CONTENT_TRANSFORMATION_POLICIES = [
  "PRESERVE_VERBATIM",
  "PRESERVE_WITH_CLEANUP",
  "IMPROVE_PRESERVING_MEANING",
  "SUMMARIZE",
  "RESTRUCTURE",
  "EXCLUDE",
  "REQUIRE_CONFIRMATION",
  "PROHIBIT_AUTOMATIC_GENERATION",
] as const;
export type SourceContentTransformationPolicy = (typeof SOURCE_CONTENT_TRANSFORMATION_POLICIES)[number];

export const SOURCE_ASSET_REUSE_STATES = [
  "safe_to_reuse",
  "candidate_for_reuse",
  "requires_confirmation",
  "licensing_unresolved",
  "technically_unusable",
  "low_quality",
  "duplicate",
  "decorative",
  "prohibited",
  "unresolved",
] as const;
export type SourceAssetReuseState = (typeof SOURCE_ASSET_REUSE_STATES)[number];

export const SOURCE_IMAGE_ROLE_CANDIDATES = [
  "logo",
  "hero",
  "content",
  "gallery",
  "background",
  "icon",
  "decorative",
  "testimonial",
  "team_person",
  "location",
  "product_service",
  "unknown",
] as const;
export type SourceImageRoleCandidate = (typeof SOURCE_IMAGE_ROLE_CANDIDATES)[number];

export const CONTINUITY_READINESS_STATUSES = [
  "not_ready",
  "partially_ready",
  "ready_for_design_enrichment",
  "ready_for_generation_delivery",
  "blocked",
  "stale",
  "invalid",
] as const;
export type ContinuityReadinessStatus = (typeof CONTINUITY_READINESS_STATUSES)[number];

export const CONTINUITY_READINESS_DIMENSIONS = [
  "source_content_capture",
  "content_identity",
  "content_structure",
  "content_classification",
  "transformation_policy_coverage",
  "asset_inventory",
  "asset_usage_evidence",
  "asset_role_coverage",
  "logo_candidate_coverage",
  "image_candidate_coverage",
  "typography_coverage",
  "color_signal_coverage",
  "visual_style_coverage",
  "layout_continuity",
  "screenshot_availability",
  "asset_access_readiness",
  "candidate_review_coverage",
  "licensing_source_status",
  "unresolved_conflicts",
  "generation_delivery_readiness",
] as const;
export type ContinuityReadinessDimensionKey = (typeof CONTINUITY_READINESS_DIMENSIONS)[number];

export type ContinuityConfidence = {
  level: SourceWebsiteConfidenceLevel;
  reasons: string[];
};

export type ContinuityArtifactReference = SourceWebsiteUnderstandingArtifactReference;

export type SourceContentVisualContinuityLineage = {
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  contractVersion: typeof SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION;
  sourceWebsiteUnderstandingProjectionId: string;
  sourceArtifactRefs: ContinuityArtifactReference[];
  evidenceArtifactRefs: ContinuityArtifactReference[];
  candidateArtifactRefs: ContinuityArtifactReference[];
  reviewArtifactRefs: ContinuityArtifactReference[];
  screenshotArtifactRefs: ContinuityArtifactReference[];
  deterministicInputs: {
    siteVersionId: string;
    sourceSiteId: string | null;
    dryRunId: string | null;
    contractVersion: typeof SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION;
    sourceWebsiteUnderstandingProjectionId: string;
    artifactIds: string[];
  };
};

export type SourceContinuityIdentity = {
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  sourceUrl: string | null;
  finalUrl: string | null;
  hostname: string | null;
  connectorType: string | null;
  sourceWebsiteUnderstandingProjectionId: string;
  sourceAvailability: "available" | "partial" | "failed" | "unavailable";
  evidenceRefs: string[];
};

export type SourceContentEvidenceReference = {
  refId: string;
  source: "source_website_understanding" | "semantic_import" | "evidence_capture" | "candidate_discovery" | "candidate_review" | "raw_artifact" | "runtime_summary";
  routePath?: string | null;
  sourceArtifactRefs?: ContinuityArtifactReference[];
};

export type SourceContentStructureReference = {
  routePath: string | null;
  pageId: string | null;
  sourceSectionId: string | null;
  sectionId: string | null;
  sectionOrder: number | null;
  headingHierarchy: string[];
  semanticRole: string | null;
  ctaRelationship: string | null;
  contactPathRelationship: string | null;
};

export type SourceContentBlock = {
  blockId: string;
  routePath: string | null;
  pageRef: string | null;
  sourceSectionRef: string | null;
  contentType:
    | "title"
    | "metadata"
    | "heading"
    | "paragraph"
    | "list"
    | "navigation_label"
    | "cta"
    | "contact_detail"
    | "service_offer_text"
    | "audience_language"
    | "trust_statement"
    | "differentiator"
    | "geographic_statement"
    | "multilingual_content"
    | "footer_text"
    | "legal_text"
    | "alt_text"
    | "structured_data_text"
    | "unclassified_body_copy";
  originalText: string;
  normalizedTextHash: string;
  sourceOrder: number;
  sourceEvidenceRefs: SourceContentEvidenceReference[];
  sourceArtifactRefs: ContinuityArtifactReference[];
  language: string | null;
  knowledgeState: ContinuityKnowledgeState;
  confidence: ContinuityConfidence;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  structure: SourceContentStructureReference;
  limitations: string[];
};

export type SourceContentContinuityCandidate = {
  candidateId: string;
  contentBlockId: string;
  continuityState: SourceContinuityState;
  proposedPolicy: SourceContentTransformationPolicy;
  reasonCode: string;
  reviewRequirement: "none" | "recommended" | "required";
  evidenceRefs: string[];
  confidence: ContinuityConfidence;
  knowledgeState: ContinuityKnowledgeState;
  limitations: string[];
};

export type SourceAssetUsageEvidence = {
  usageId: string;
  usageKind:
    | "page_use"
    | "section_use"
    | "hero_use"
    | "header_use"
    | "footer_use"
    | "navigation_use"
    | "css_background_use"
    | "inline_image_use"
    | "structured_data_reference"
    | "repeated_use"
    | "favicon_manifest_use"
    | "font_face_use"
    | "unknown";
  routePath: string | null;
  sourceSectionRef: string | null;
  evidenceRefs: string[];
};

export type SourceAssetReuseCandidate = {
  reuseState: SourceAssetReuseState;
  continuityState: SourceContinuityState;
  reasonCode: string;
  reviewRequirement: "none" | "recommended" | "required";
  licensingSourceStatus: "available" | "missing" | "unresolved" | "not_applicable";
  evidenceRefs: string[];
  confidence: ContinuityConfidence;
  limitations: string[];
};

export type SourceAssetContinuityItem = {
  assetId: string;
  sourceAssetId: string;
  safeReference: string;
  filename: string;
  mediaType: string;
  assetCategory: "image" | "svg" | "logo_candidate" | "icon" | "font" | "video" | "document" | "favicon" | "manifest_asset" | "other";
  contentHash: string | null;
  sizeBytes: number | null;
  dimensions: { width: number | null; height: number | null } | null;
  sourceArtifactRefs: ContinuityArtifactReference[];
  sourcePageUsage: string[];
  sourceSectionUsage: string[];
  usageEvidence: SourceAssetUsageEvidence[];
  headerNavigationUsage: boolean;
  cssBackgroundUsage: boolean;
  repeatedUsage: boolean;
  altText: string | null;
  safePreviewRef: string | null;
  classificationState: ContinuityKnowledgeState;
  candidateMeaning: string | null;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  reuseCandidate: SourceAssetReuseCandidate;
  confidence: ContinuityConfidence;
  limitations: string[];
};

export type SourceLogoContinuityCandidate = {
  candidateId: string;
  sourceAssetId: string;
  sourceReference: string;
  previewRef: string | null;
  mediaType: string;
  dimensions: { width: number | null; height: number | null } | null;
  fileSizeBytes: number | null;
  altText: string | null;
  structuredLogoMetadata: string[];
  headerNavigationUsage: boolean;
  repeatedUsage: boolean;
  sourceEvidenceRefs: string[];
  confidence: ContinuityConfidence;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  licensingSourceStatus: "available" | "missing" | "unresolved" | "not_applicable";
  continuityRecommendation: SourceContinuityState;
  limitations: string[];
};

export type SourceImageContinuityCandidate = {
  candidateId: string;
  sourceAssetId: string;
  roleCandidate: SourceImageRoleCandidate;
  sourceReference: string;
  previewRef: string | null;
  confidence: ContinuityConfidence;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  licensingSourceStatus: "available" | "missing" | "unresolved" | "not_applicable";
  continuityRecommendation: SourceContinuityState;
  evidenceRefs: string[];
  limitations: string[];
};

export type SourceTypographyContinuityCandidate = {
  candidateId: string;
  family: string;
  roleCandidate: "heading" | "body" | "icon_font" | "local_font_file" | "fallback_system" | "unknown";
  fontFiles: string[];
  weights: string[];
  styles: string[];
  localOrExternalAvailability: "local" | "external" | "unknown";
  headingUsage: boolean;
  bodyUsage: boolean;
  iconFontUsage: boolean;
  sourceEvidenceRefs: string[];
  licenseSourceStatus: "available" | "missing" | "unresolved" | "not_applicable";
  confidence: ContinuityConfidence;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  continuityRecommendation: SourceContinuityState;
  limitations: string[];
};

export type SourceColorContinuitySignal = {
  signalId: string;
  value: string;
  normalizedValue: string;
  sourceDeclaration: string | null;
  usage: string[];
  candidateRole: "primary_candidate" | "secondary_candidate" | "accent_candidate" | "background_candidate" | "text_candidate" | "generic_ui_color" | "uncertain";
  frequency: number | null;
  contrastContext: string | null;
  evidenceRefs: string[];
  confidence: ContinuityConfidence;
  knowledgeState: ContinuityKnowledgeState;
  limitations: string[];
};

export type SourceVisualStyleContinuitySignal = {
  signalId: string;
  signalType: "icon_style" | "image_style" | "button_style" | "spacing" | "radius" | "shadows" | "visual_density" | "alignment" | "grid_layout_tendency" | "repeated_pattern";
  label: string;
  knowledgeState: ContinuityKnowledgeState;
  evidenceRefs: string[];
  confidence: ContinuityConfidence;
  limitations: string[];
};

export type SourceLayoutSectionReference = {
  sectionId: string;
  sourceSectionId: string | null;
  routePath: string | null;
  order: number;
  heading: string | null;
  semanticType: string | null;
  observedLayoutState: ContinuityKnowledgeState;
  continuityState: SourceContinuityState;
  structurePlanContextOnly: boolean;
  evidenceRefs: string[];
  limitations: string[];
};

export type SourceLayoutContinuity = {
  routeStructure: string[];
  sectionSequence: SourceLayoutSectionReference[];
  headingHierarchy: string[];
  heroPresence: ContinuityKnowledgeState;
  headerFooterEvidence: ContinuityKnowledgeState;
  geometryEvidence: ContinuityKnowledgeState;
  responsiveEvidence: ContinuityKnowledgeState;
  layoutScreenshots: string[];
  futureDesignIntentSeparated: boolean;
  limitations: string[];
};

export type SourceScreenshotReference = {
  screenshotId: string;
  routePath: string | null;
  sourceUrl: string | null;
  viewport: string | null;
  dimensions: { width: number | null; height: number | null } | null;
  capturedAt: string | null;
  completeness: "viewport" | "full_page" | "partial" | "unknown";
  safeAccessRef: string | null;
  evidenceRefs: string[];
  lineage: ContinuityArtifactReference[];
  availability: "available" | "unavailable";
  limitations: string[];
};

export type ContinuityReadinessDimension = {
  key: ContinuityReadinessDimensionKey;
  status: "ok" | "partial" | "missing" | "blocked" | "stale" | "conflicting";
  summary: string;
  evidenceRefs: string[];
};

export type ContinuityLimitation = {
  limitationId: string;
  severity: "info" | "warning" | "blocking";
  code: string;
  message: string;
  sourceRefs: string[];
  state: ContinuityKnowledgeState;
};

export type ContinuityDiagnostic = {
  code: string;
  message: string;
  sourceRefs: string[];
};

export type ContinuityReadiness = {
  status: ContinuityReadinessStatus;
  readyForDesignEnrichment: boolean;
  readyForGenerationDelivery: boolean;
  summary: string;
  dimensions: ContinuityReadinessDimension[];
  blockers: ContinuityLimitation[];
};

export type SourceContentVisualContinuityProjection = {
  projectionId: string;
  contractVersion: typeof SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION;
  generatedAt: string;
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  connectorType: string | null;
  sourceWebsiteUnderstandingProjectionId: string;
  sourceArtifactRefs: ContinuityArtifactReference[];
  evidenceArtifactRefs: ContinuityArtifactReference[];
  candidateArtifactRefs: ContinuityArtifactReference[];
  reviewArtifactRefs: ContinuityArtifactReference[];
  screenshotArtifactRefs: ContinuityArtifactReference[];
  sourceIdentity: SourceContinuityIdentity;
  contentBlocks: SourceContentBlock[];
  contentTransformationCandidates: SourceContentContinuityCandidate[];
  assetContinuity: SourceAssetContinuityItem[];
  visualIdentitySignals: {
    logoCandidates: SourceLogoContinuityCandidate[];
    imageCandidates: SourceImageContinuityCandidate[];
    typographyCandidates: SourceTypographyContinuityCandidate[];
    colorSignals: SourceColorContinuitySignal[];
    visualStyleSignals: SourceVisualStyleContinuitySignal[];
    unresolvedSignals: string[];
  };
  layoutContinuity: SourceLayoutContinuity;
  sourceScreenshots: SourceScreenshotReference[];
  thumbnailReadiness: {
    originalSourceScreenshotAvailable: boolean;
    safeScreenshotReferenceAvailable: boolean;
    suitableForWorkspaceThumbnail: boolean;
    blockers: string[];
  };
  readiness: ContinuityReadiness;
  confidence: ContinuityConfidence;
  limitations: ContinuityLimitation[];
  diagnostics: ContinuityDiagnostic[];
  lineage: SourceContentVisualContinuityLineage;
};

export type ContinuityValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};
