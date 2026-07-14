import type { CandidateConfidence, CandidateEvidenceRef, CandidateType } from "./candidate-discovery-contract";

export const SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION = "WU-2" as const;

export const SOURCE_WEBSITE_KNOWLEDGE_STATES = [
  "observed",
  "structured",
  "candidate",
  "reviewed",
  "confirmed_source_fact",
  "rejected",
  "conflicting",
  "missing",
  "unavailable",
] as const;
export type SourceWebsiteKnowledgeState = (typeof SOURCE_WEBSITE_KNOWLEDGE_STATES)[number];

export const SOURCE_WEBSITE_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type SourceWebsiteConfidenceLevel = (typeof SOURCE_WEBSITE_CONFIDENCE_LEVELS)[number];

export const SOURCE_WEBSITE_READINESS_STATUSES = [
  "not_ready",
  "partially_ready",
  "ready_for_business_discovery",
  "blocked",
  "stale",
  "invalid",
] as const;
export type SourceWebsiteReadinessStatus = (typeof SOURCE_WEBSITE_READINESS_STATUSES)[number];

export const SOURCE_WEBSITE_READINESS_DIMENSION_KEYS = [
  "source_acquisition",
  "route_coverage",
  "navigation_coverage",
  "structure_coverage",
  "content_coverage",
  "asset_inventory",
  "candidate_coverage",
  "candidate_review",
  "visual_identity_signals",
  "business_signal_candidates",
  "evidence_quality",
  "unresolved_conflicts",
] as const;
export type SourceWebsiteReadinessDimensionKey = (typeof SOURCE_WEBSITE_READINESS_DIMENSION_KEYS)[number];

export type SourceWebsiteUnderstandingArtifactReference = {
  kind: string;
  artifactId: string | null;
  canonicalId?: string | null;
  version?: string | number | null;
  status?: string | null;
  createdAt?: string | null;
  persistedAt?: string | null;
  source: "import" | "raw_artifact" | "semantic_import" | "evidence_capture" | "candidate_discovery" | "candidate_review" | "reconstruction_package" | "structure_plan" | "runtime_summary";
};

export type SourceWebsiteUnderstandingLineage = {
  siteVersionId: string;
  dryRunId: string | null;
  contractVersion: typeof SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION;
  sourceArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  evidenceArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  candidateArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  reviewArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  reconstructionArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  planningContextArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  deterministicInputs: {
    siteVersionId: string;
    dryRunId: string | null;
    contractVersion: typeof SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION;
    artifactIds: string[];
  };
};

export type SourceWebsiteConfidence = {
  level: SourceWebsiteConfidenceLevel;
  reasons: string[];
};

export type SourceWebsiteLimitation = {
  limitationId: string;
  severity: "info" | "warning" | "blocking";
  code: string;
  message: string;
  sourceRefs: string[];
};

export type SourceWebsiteDiagnostic = {
  code: string;
  message: string;
  sourceRefs: string[];
};

export type SourceWebsiteIdentity = {
  siteVersionId: string;
  dryRunId: string | null;
  sourceUrl: string | null;
  finalUrl: string | null;
  hostname: string | null;
  connectorType: string | null;
  importIdentity: string | null;
  importedAt: string | null;
  captureCompletedAt: string | null;
  sourceAvailability: "available" | "partial" | "failed" | "unavailable";
  languageSignals: SourceLanguageSignal[];
  evidenceRefs: string[];
};

export type SourceRouteUnderstanding = {
  routeId: string;
  routePath: string;
  sourceUrl: string | null;
  title: string | null;
  purposeCandidate: string | null;
  state: SourceWebsiteKnowledgeState;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
  limitations: string[];
};

export type SourcePageUnderstanding = {
  pageId: string;
  routePath: string;
  title: string | null;
  sourceUrl: string | null;
  availability: "available" | "partial" | "unavailable";
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
  limitations: string[];
};

export type SourceNavigationUnderstanding = {
  navigationId: string;
  routePath: string | null;
  label: string;
  href: string | null;
  navigationKind: "primary" | "secondary" | "footer" | "utility" | "contact" | "external" | "social" | "unresolved";
  state: SourceWebsiteKnowledgeState;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
  sourceCandidateId: string | null;
};

export type SourceSectionUnderstanding = {
  sectionId: string;
  routePath: string | null;
  order: number;
  heading: string | null;
  semanticType: string | null;
  observedBoundary: boolean;
  plannedOnly: boolean;
  state: SourceWebsiteKnowledgeState;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
  sourceCandidateId: string | null;
  limitations: string[];
};

export type SourceContentUnderstanding = {
  contentId: string;
  routePath: string | null;
  bodyTextAvailable: boolean;
  classificationStatus: SourceWebsiteKnowledgeState;
  headings: string[];
  contentThemes: string[];
  visibleMessages: string[];
  ctaSignals: string[];
  contactSignals: string[];
  forms: Array<{ action: string | null; method: string | null; fieldCount: number }>;
  downloads: string[];
  metadata: Record<string, string>;
  structuredDataAvailable: boolean;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
  limitations: string[];
};

export type SourceAssetUsageReference = {
  routePath: string | null;
  usageKind: "html_reference" | "css_reference" | "semantic_image" | "header_navigation" | "unknown";
  evidenceRefs: string[];
};

export type SourceAssetUnderstanding = {
  assetId: string;
  path: string;
  filename: string;
  mediaType: string;
  sizeBytes: number | null;
  sha256: string | null;
  assetKind: "image" | "svg" | "icon" | "font" | "video" | "document" | "stylesheet" | "script" | "html" | "other";
  dimensions: { width: number | null; height: number | null } | null;
  usages: SourceAssetUsageReference[];
  altText: string | null;
  repeatedUsageCount: number;
  inventoryState: SourceWebsiteKnowledgeState;
  evidenceState: SourceWebsiteKnowledgeState;
  candidateMeaningState: SourceWebsiteKnowledgeState;
  candidateMeaning: string | null;
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  previewHref: string | null;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
  limitations: string[];
};

export type SourceLogoCandidate = {
  candidateId: string;
  assetPath: string | null;
  label: string;
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  signals: string[];
  previewHref: string | null;
  evidenceRefs: string[];
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
};

export type SourceColorSignal = {
  signalId: string;
  value: string | null;
  label: string;
  source: "style_signal_model" | "computed_style" | "css" | "unavailable";
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
};

export type SourceTypographySignal = {
  signalId: string;
  family: string;
  role: "heading" | "body" | "local_font_file" | "icon_font" | "unknown";
  source: "style_signal_model" | "semantic_import" | "asset_inventory" | "computed_style";
  localAvailability: "available" | "external" | "unknown";
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
};

export type SourceIconStyleSignal = {
  signalId: string;
  label: string;
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
};

export type SourceImageStyleSignal = {
  signalId: string;
  label: string;
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
};

export type SourceVisualIdentitySignals = {
  logoCandidates: SourceLogoCandidate[];
  colorSignals: SourceColorSignal[];
  typographySignals: SourceTypographySignal[];
  iconStyleSignals: SourceIconStyleSignal[];
  imageStyleSignals: SourceImageStyleSignal[];
  unresolvedSignals: string[];
  limitations: SourceWebsiteLimitation[];
};

export type SourceOfferingCandidate = {
  candidateId: string;
  label: string;
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  source: "candidate_discovery" | "navigation" | "heading" | "semantic_import" | "unclassified_evidence";
  evidenceRefs: string[];
  reviewState: "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable";
  conflicts: string[];
  limitations: string[];
};

export type SourceAudienceCandidate = SourceOfferingCandidate;
export type SourceTrustCandidate = SourceOfferingCandidate;
export type SourceGoalCandidate = SourceOfferingCandidate;
export type SourceIdentityCandidate = SourceOfferingCandidate;
export type SourceDifferentiatorCandidate = SourceOfferingCandidate;

export type SourceGeographicSignal = {
  signalId: string;
  label: string;
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
};

export type SourceLanguageSignal = {
  signalId: string;
  language: string | null;
  source: "semantic_import" | "html_metadata" | "unavailable";
  state: SourceWebsiteKnowledgeState;
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
};

export type SourceBusinessSignalCandidates = {
  offerings: SourceOfferingCandidate[];
  audiences: SourceAudienceCandidate[];
  trust: SourceTrustCandidate[];
  goals: SourceGoalCandidate[];
  identity: SourceIdentityCandidate[];
  differentiators: SourceDifferentiatorCandidate[];
  geography: SourceGeographicSignal[];
  languages: SourceLanguageSignal[];
  unresolvedEvidence: string[];
  limitations: SourceWebsiteLimitation[];
};

export type SourceTechnicalSignals = {
  title: string | null;
  meta: Record<string, string>;
  canonicalUrl: string | null;
  headingStructure: string[];
  structuredDataAvailable: boolean;
  robotsEvidence: string[];
  sitemapEvidence: string[];
  languageMetadata: SourceLanguageSignal[];
  accessibilityObservations: string[];
  externalScripts: string[];
  technologyHints: string[];
  widgets: string[];
  socialMetadata: string[];
  confidence: SourceWebsiteConfidence;
  evidenceRefs: string[];
};

export type SourceWebsiteReadinessDimension = {
  key: SourceWebsiteReadinessDimensionKey;
  status: "ok" | "partial" | "missing" | "blocked" | "stale" | "conflicting";
  summary: string;
  evidenceRefs: string[];
};

export type SourceWebsiteReadiness = {
  status: SourceWebsiteReadinessStatus;
  conservativeBusinessDiscoveryCanProceed: boolean;
  summary: string;
  dimensions: SourceWebsiteReadinessDimension[];
  blockers: SourceWebsiteLimitation[];
};

export type SourceWebsiteUnderstandingProjection = {
  projectionId: string;
  contractVersion: typeof SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION;
  generatedAt: string;
  siteVersionId: string;
  dryRunId: string | null;
  connectorType: string | null;
  sourceIdentity: SourceWebsiteIdentity;
  sourceArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  evidenceArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  candidateArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  reviewArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  reconstructionArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  planningContextArtifactRefs: SourceWebsiteUnderstandingArtifactReference[];
  pages: SourcePageUnderstanding[];
  routes: SourceRouteUnderstanding[];
  navigation: SourceNavigationUnderstanding[];
  sections: SourceSectionUnderstanding[];
  content: SourceContentUnderstanding[];
  assets: SourceAssetUnderstanding[];
  visualIdentitySignals: SourceVisualIdentitySignals;
  businessSignalCandidates: SourceBusinessSignalCandidates;
  technicalSignals: SourceTechnicalSignals;
  readiness: SourceWebsiteReadiness;
  confidence: SourceWebsiteConfidence;
  limitations: SourceWebsiteLimitation[];
  diagnostics: SourceWebsiteDiagnostic[];
  lineage: SourceWebsiteUnderstandingLineage;
};

export type SourceWebsiteUnderstandingValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type ReviewedCandidateState = {
  candidateId: string;
  decision: "approved" | "rejected" | "deferred";
  reviewEventId: string;
};

export type SourceWebsiteUnderstandingCandidateInput = {
  candidateId: string;
  candidateType: CandidateType;
  candidateStatus: string;
  routePath?: string;
  confidence: CandidateConfidence;
  sourceEvidenceRefs: CandidateEvidenceRef[];
  sourceDryRunRefs: CandidateEvidenceRef[];
  limitations: Array<{ code: string; message: string; severity: string; sourceRef?: string }>;
  diagnostics: string[];
};
