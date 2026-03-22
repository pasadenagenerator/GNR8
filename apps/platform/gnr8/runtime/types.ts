import type { Gnr8Page } from "@/gnr8/types/page";

export const RENDERER_COMPATIBILITY_VERSION = "gnr8-renderer-v1" as const;

export type SiteVersionState = "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export type AuditSource = "migration" | "ai" | "manual";

export type SemanticSignal = {
  label: string;
  confidence: number;
  source: AuditSource;
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

export type CanonicalPageVersionInput = {
  pageId: string;
  path: string;
  title: string | null;
  structureModel: StructureModel;
  contentModel: ContentModel;
  styleTokens: StyleTokenRecord;
  assetGraph: AssetGraphItem[];
  semanticSignals: SemanticSignal[];
  source: AuditSource;
  actor: string;
};

export type CanonicalSiteMigrationInput = {
  siteId: string;
  sourceUrl: string;
  actor: string;
  pages: CanonicalPageVersionInput[];
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
