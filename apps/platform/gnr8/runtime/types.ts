import type { Gnr8Page } from "@/gnr8/types/page";
import type { PageEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";
import type { PageMigrationGateResult } from "@/gnr8/migration/quality-gates/page-quality-gate";
import type { PageRolloutPolicyResult } from "@/gnr8/migration/policy/page-rollout-policy";
import type { StyleSignalModel } from "@/gnr8/style-signals";
import type {
  AliasDiscoveryEvidence,
  CanonicalDiscoveryEvidence,
  MultipageImportSummary,
  MultipageImportTree,
  RedirectDiscoveryEvidence,
  RoutePriorityBalancingEvidence,
  SitemapDiscoveryEvidence,
} from "@/gnr8/multipage-import/types/contracts";
import type { SiteTree, SiteTreeSummary } from "@/gnr8/site-tree";
import type { FamilyHandoffModel, TemplateFamiliesSummary } from "@/gnr8/family-mode";
import type { SemanticImportCaptureMode, SemanticImportResult } from "@/gnr8/import-semantic/semantic-import-engine";
import type { EvidenceCaptureBaselineArtifactRecord } from "@/gnr8/architecture/evidence-capture-baseline-artifact";

export const RENDERER_COMPATIBILITY_VERSION = "gnr8-renderer-v1" as const;

export type SiteVersionState = "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export type AuditSource = "migration" | "ai" | "manual";

export type SemanticSignal = {
  label: string;
  confidence: number;
  source: AuditSource;
};

export type ImportFidelityScore = {
  structureScore: number;
  styleScore: number;
  contentScore: number;
  layoutScore: number;
  overallScore: number;
  fidelityLevel: "low" | "medium" | "high";
};

export type MultiPageDiscoverySourceContext = "nav" | "header" | "footer" | "body" | "unknown";

export type MultiPageDiscoveryLinkStatus = "discovered" | "skipped";

export type MultiPageDiscoveryLinkEntry = {
  originalHref: string;
  absoluteUrl: string | null;
  normalizedUrl: string | null;
  normalizedRoutePath: string | null;
  depth: number;
  sourceContext: MultiPageDiscoverySourceContext;
  sourceClassification: "anchor" | "form_action";
  status: MultiPageDiscoveryLinkStatus;
  skippedReason: string | null;
};

export type MultiPageDiscoveryManifest = {
  kind: "multi_page_discovery_manifest_v1";
  seedUrl: string;
  normalizedSeedUrl: string | null;
  normalizedSeedRoute: string | null;
  discoveredPages: MultiPageDiscoveryLinkEntry[];
  skippedLinks: MultiPageDiscoveryLinkEntry[];
  routeCandidates: string[];
  routePriorityBalancing?: RoutePriorityBalancingEvidence;
  routeGovernance?: Array<{
    routePath: string;
    normalizedUrl: string | null;
    status: "allowed" | "disallowed" | "unknown";
    matchedRule: {
      directive: "allow" | "disallow";
      userAgent: string;
      path: string;
    } | null;
  }>;
  normalizedUrls: Array<{
    originalHref: string;
    absoluteUrl: string | null;
    normalizedUrl: string | null;
    normalizedRoutePath: string | null;
    changed: boolean;
  }>;
  depth: {
    seedDepth: number;
    maxDiscoveredDepth: number;
  };
  limitsApplied: {
    maxDiscoveredUrls: number;
    maxDepth: number;
    maxLinksPerPage: number;
    maxTemplateLinksPerRoute: number;
    maxSitemaps?: number;
    maxUrlsFromSitemaps?: number;
    maxNestedSitemaps?: number;
  };
  diagnostics: string[];
  generatedAt: string;
};

export type MultiPageSitemapDiscoverySummary = SitemapDiscoveryEvidence;

export type MultiPageCanonicalDiscoverySummary = CanonicalDiscoveryEvidence;

export type MultiPageRedirectDiscoverySummary = RedirectDiscoveryEvidence;

export type MultiPageAliasDiscoverySummary = AliasDiscoveryEvidence;

export type MultiPageRobotsDiscoverySummary = {
  robotsUrl: string | null;
  fetchedState: "fetched" | "not_found" | "failed" | "unavailable" | "invalid_seed" | "parse_failed";
  sitemapDeclarations: string[];
  allowRules: Array<{
    userAgent: string;
    path: string;
  }>;
  disallowRules: Array<{
    userAgent: string;
    path: string;
  }>;
  routeGovernanceSummary: {
    allowed: number;
    disallowed: number;
    unknown: number;
  };
  diagnostics: string[];
};

export type MultiPageHtmlAcquisitionStatus = "fetched" | "failed" | "skipped";

export type MultiPageHtmlAcquisitionPageEntry = {
  originalHref: string;
  normalizedUrl: string | null;
  finalUrl: string | null;
  normalizedRoutePath: string | null;
  finalNormalizedRoutePath: string | null;
  depth: number;
  status: MultiPageHtmlAcquisitionStatus;
  httpStatusCode: number | null;
  contentType: string | null;
  byteSize: number;
  bodySha256: string | null;
  bodyPath: string | null;
  redirected: boolean;
  redirectCount: number;
  diagnostics: string[];
  skippedReason: string | null;
  failureReason: string | null;
};

export type MultiPageHtmlAcquisitionManifest = {
  kind: "multi_page_html_acquisition_manifest_v1";
  seedUrl: string;
  normalizedSeedUrl: string | null;
  pages: MultiPageHtmlAcquisitionPageEntry[];
  limitsApplied: {
    maxPages: number;
    maxBytesPerPage: number;
    requestTimeoutMs: number;
  };
  summary: {
    fetchedPageCount: number;
    failedPageCount: number;
    skippedPageCount: number;
  };
  diagnostics: string[];
  generatedAt: string;
};

export type MultiPageHtmlAcquisitionSummary = {
  enabled: boolean;
  fetchedPageCount: number;
  failedPageCount: number;
  skippedPageCount: number;
  manifestRef: string | null;
  diagnostics: string[];
};

export type MultiPageRawArtifactAssemblyRouteEntry = {
  routePath: string;
  sourceUrl: string;
  finalUrl: string;
  rawFilePath: string;
  bodySha256: string;
  byteSize: number;
  status: "assembled";
};

export type MultiPageRawArtifactAssemblyExcludedEntry = {
  routePath: string | null;
  sourceUrl: string | null;
  finalUrl: string | null;
  rawFilePath: string | null;
  bodySha256: string | null;
  byteSize: number;
  status: "excluded";
  reason: string;
};

export type MultiPageRawArtifactAssemblyManifest = {
  kind: "multi_page_raw_artifact_assembly_manifest_v1";
  enabled: true;
  seedUrl: string;
  normalizedSeedUrl: string | null;
  assembledPageCount: number;
  excludedPageCount: number;
  failedPageCount: number;
  routeMap: MultiPageRawArtifactAssemblyRouteEntry[];
  htmlPathMap: Record<string, string>;
  excludedPages: MultiPageRawArtifactAssemblyExcludedEntry[];
  failedPages: MultiPageHtmlAcquisitionPageEntry[];
  manifestPath: string | null;
  diagnostics: string[];
  generatedAt: string;
};

export type MultiPageRawArtifactAssemblySummary = {
  enabled: boolean;
  assembledPageCount: number;
  excludedPageCount: number;
  routeMapRef: string | null;
  diagnostics: string[];
};

export type MultiPageDiscoverySummary = {
  enabled: boolean;
  discoveredPageCount: number;
  skippedLinkCount: number;
  routeCandidateCount: number;
  manifestRef: string | null;
  diagnostics: string[];
  htmlAcquisition?: MultiPageHtmlAcquisitionSummary;
  rawArtifactAssembly?: MultiPageRawArtifactAssemblySummary;
};

export type RuntimeImportProvenanceSummary = {
  kind: "runtime_import_provenance_summary_v1";
  executionIdentity?: {
    snapshotId: string;
    snapshotRunId: string;
    snapshotStableRootDirAbs: string;
    snapshotRunRootDirAbs: string;
    requestId: string | null;
  };
  captureMode?: SemanticImportCaptureMode;
  sourceMode: "rendered_dom" | "raw_html_fallback";
  importFidelityStatus: "high_fidelity_import" | "degraded_import" | "capture_failed";
  renderedCaptureStatus: "available" | "partial" | "failed";
  renderedDomQuality: "strong" | "weak" | "unusable";
  importFidelityScore?: ImportFidelityScore | null;
  screenshotCount: number;
  computedStyleSampleCount: number;
  renderedCapture: {
    used: boolean;
    status: "available" | "partial" | "failed";
    quality: "strong" | "weak" | "unusable";
    domLength: number;
    nodeCount: number;
    styleSampleCount: number;
    styleCoverage: number;
    screenshots: {
      viewport: boolean;
      fullPage: boolean;
    };
    execution: {
      runtimeKind: "nodejs" | "edge" | "unknown";
      environmentSupported: boolean;
      browserPackageAvailable: boolean;
      browserBinaryAvailable: boolean;
      environmentStatus: "supported" | "unsupported" | "unknown";
      failureCategory: "environment" | "page" | "none";
      failureCode: string | null;
      browserLaunch: "not_attempted" | "succeeded" | "failed";
      navigation: "not_attempted" | "succeeded" | "failed";
      dom: "not_attempted" | "captured" | "empty_or_failed";
      screenshot: "none" | "captured";
      styleSampling: "not_attempted" | "captured" | "failed_or_empty";
    };
  };
  importDiagnosticCodes: string[];
  pageVersionDeduplication?: {
    kind: "runtime_page_version_deduplication_v1";
    duplicateCount: number;
    diagnostics: string[];
    entries: Array<{
      siteVersionId?: string | null;
      routePath: string;
      duplicateRoutePaths?: string[];
      pageId: string | null;
      selectedSourceUrl: string | null;
      duplicateSourceUrls: string[];
      duplicateSourcePaths: string[];
      duplicatePageIds: string[];
    }>;
  } | null;
  captureEvidence: {
    selectedSourceHtmlPath: string | null;
    responseHtmlPath: string | null;
    entryHtmlPath: string | null;
    renderedCaptureManifestPath: string | null;
    acquisitionEvidencePath: string | null;
    renderedDomPath: string | null;
    computedStylesPath: string | null;
    layoutGeometryPath?: string | null;
    renderedViewportScreenshotPath: string | null;
    renderedFullpageScreenshotPath: string | null;
    screenshotPaths: string[];
  };
  captureJob?: {
    jobId: string | null;
    status:
      | "queued"
      | "running"
      | "completed"
      | "completed_partial"
      | "failed_transient"
      | "failed_terminal"
      | "timed_out"
      | "cancelled"
      | null;
    attemptCount: number;
    maxAttempts: number;
    failureClass: "transient" | "terminal" | "unsupported_environment" | "timeout" | "none" | null;
    failureCode: string | null;
    timeoutBudgetMs: number | null;
    createdAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
  workerHealth?: {
    enabled: boolean;
    reachable: boolean;
    browserAvailable: boolean;
    queueHealthy: boolean;
    status: "healthy" | "disabled" | "misconfigured" | "unreachable" | "unauthorized" | "execution_failed" | "timed_out" | "unknown";
    reason: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastFailureClass: string | null;
    lastFailureCode: string | null;
  } | null;
  styleSignals: StyleSignalModel | null;
  semanticImport?: SemanticImportResult | null;
  multipageImport?: {
    summary: MultipageImportSummary;
    tree: MultipageImportTree | null;
  } | null;
  multiPageDiscovery?: {
    summary: MultiPageDiscoverySummary;
    manifest: MultiPageDiscoveryManifest | null;
    canonicalDiscovery?: MultiPageCanonicalDiscoverySummary | null;
    redirectDiscovery?: MultiPageRedirectDiscoverySummary | null;
    aliasDiscovery?: MultiPageAliasDiscoverySummary | null;
    robotsDiscovery?: MultiPageRobotsDiscoverySummary | null;
    sitemapDiscovery?: MultiPageSitemapDiscoverySummary | null;
    acquisition?: MultiPageHtmlAcquisitionManifest | null;
    rawArtifactAssembly?: MultiPageRawArtifactAssemblyManifest | null;
  } | null;
  siteTree?: {
    summary: SiteTreeSummary;
    tree: SiteTree | null;
  } | null;
  templateFamilies?: {
    summary: TemplateFamiliesSummary;
    families: FamilyHandoffModel | null;
  } | null;
  evidenceCaptureBaselineArtifact?: EvidenceCaptureBaselineArtifactRecord | null;
};

export type StyleTokenRecord = Record<string, string>;

export type AssetGraphItem = {
  path: string;
  mediaType: string;
  required?: boolean;
};

export type StructureSection = {
  id: string;
  type: string;
  order: number;
};

export type StructureModel = {
  sections: StructureSection[];
};

export type ContentModel = {
  sectionProps: Record<string, Record<string, unknown>>;
};

export type PublishStage = "shadow" | "canary" | "production";

export type PageMigrationGovernanceSnapshot = {
  pageStructuralConfidence: number;
  weakSectionIds: string[];
  structuralAnomalies: string[];
  pageMigrationGate: PageMigrationGateResult;
  pageRolloutPolicy: PageRolloutPolicyResult;
  pageEnforcement: PageEnforcementByStage;
};

export type CanonicalPageVersionInput = {
  pageId: string;
  path: string;
  title: string | null;
  structureModel: StructureModel;
  contentModel: ContentModel;
  styleTokens: StyleTokenRecord;
  assetGraph: AssetGraphItem[];
  semanticSignals: SemanticSignal[];
  migrationGovernance?: PageMigrationGovernanceSnapshot | null;
  source: AuditSource;
  actor: string;
};

export type CanonicalSiteMigrationInput = {
  siteId: string;
  sourceUrl: string;
  actor: string;
  pages: CanonicalPageVersionInput[];
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type CanonicalPageVersionSnapshot = CanonicalPageVersionInput & {
  id: string;
  siteVersionId: string;
  createdAt: string;
};

export type CanonicalSiteVersionSnapshot = {
  id: string;
  siteId: string;
  versionNo: number;
  state: SiteVersionState;
  source: AuditSource;
  actor: string;
  createdAt: string;
  rendererCompatibilityVersion: string;
  artifactId: string | null;
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
  pages: CanonicalPageVersionSnapshot[];
};

export type RuntimeArtifact = {
  id: string;
  siteId: string;
  siteVersionId: string;
  rendererCompatibilityVersion: string;
  htmlByPath: Record<string, string>;
  compiledTokenStyles: string;
  assetFingerprintMap: Record<string, string>;
  manifest: Record<string, unknown>;
  publishStage: PublishStage;
  shadowRestricted: boolean;
  artifactGovernance: {
    pageGateState: string[];
    pageRolloutPolicyState: string[];
    pageEnforcementState: {
      shadow: string[];
      canary: string[];
      production: string[];
    };
    siteGateState: string;
    siteRolloutPolicyState: string;
    siteEnforcementState: {
      shadow: string;
      canary: string;
      production: string;
    };
    publishStage: PublishStage;
  };
  bundleSha256: string;
  createdAt: string;
};

export type RawTemplateSiteFileMeta = {
  path: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
};

export type RawTemplateSiteArtifact = {
  id: string;
  artifactType: "raw_template_site";
  siteId: string;
  siteVersionId: string;
  entryHtmlPath: string;
  assetBasePath: string;
  fileMap: Record<string, RawTemplateSiteFileMeta>;
  createdAt: string;
};

export type RawImportedSiteArtifactDiagnostics = {
  codes: string[];
};

export type RawImportedSiteArtifactMetadata = {
  sourceUrl: string;
  finalUrl: string | null;
  htmlByteLength: number;
  multiPage?: {
    enabled: boolean;
    pageCount: number;
    routeMapRef: string;
  };
  diagnostics: RawImportedSiteArtifactDiagnostics;
  assetSummary: {
    persistedAssetCount: number;
    externalFallbackAssetCount: number;
  };
};

export type RawImportedSiteArtifact = {
  id: string;
  artifactType: "raw_imported_site";
  siteId: string;
  siteVersionId: string;
  entryHtmlPath: string;
  assetBasePath: string;
  fileMap: Record<string, RawTemplateSiteFileMeta>;
  metadata: RawImportedSiteArtifactMetadata;
  createdAt: string;
};

export type RenderMode = "PREVIEW" | "PUBLISH";

export type VersionScopedFormSubmission = {
  siteId: string;
  siteVersionId: string;
  pagePath: string;
  formId: string;
  payload: Record<string, unknown>;
  actor: string;
};

export type ImportedMigrationInput = {
  slug: string;
  sourceUrl: string;
  actor: string;
  page: Gnr8Page;
};
