import type { Gnr8Page } from "@/gnr8/types/page";
import type { PageEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";
import type { PageMigrationGateResult } from "@/gnr8/migration/quality-gates/page-quality-gate";
import type { PageRolloutPolicyResult } from "@/gnr8/migration/policy/page-rollout-policy";
import type { StyleSignalModel } from "@/gnr8/style-signals";

export const RENDERER_COMPATIBILITY_VERSION = "gnr8-renderer-v1" as const;

export type SiteVersionState = "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export type AuditSource = "migration" | "ai" | "manual";

export type SemanticSignal = {
  label: string;
  confidence: number;
  source: AuditSource;
};

export type RuntimeImportProvenanceSummary = {
  kind: "runtime_import_provenance_summary_v1";
  sourceMode: "rendered_dom" | "raw_html_fallback";
  importFidelityStatus: "high_fidelity_import" | "degraded_import" | "capture_failed";
  renderedCaptureStatus: "available" | "unavailable" | "failed";
  renderedDomQuality: "strong" | "weak" | "unusable";
  screenshotCount: number;
  computedStyleSampleCount: number;
  importDiagnosticCodes: string[];
  captureEvidence: {
    selectedSourceHtmlPath: string | null;
    responseHtmlPath: string | null;
    entryHtmlPath: string | null;
    renderedCaptureManifestPath: string | null;
    acquisitionEvidencePath: string | null;
    screenshotPaths: string[];
  };
  styleSignals: StyleSignalModel | null;
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
