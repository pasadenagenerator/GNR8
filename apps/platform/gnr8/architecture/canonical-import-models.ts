/**
 * Canonical import contracts for GNR8.
 *
 * These types define the product-level truth model produced by importer normalization.
 * They are intentionally vendor-neutral and renderer-neutral.
 */

export const CANONICAL_IMPORT_MODEL_VERSION = "1.0.0" as const;

export type CanonicalLayerScope = "global" | "page" | "section" | "component_pattern";

export type CanonicalConfidenceLevel = "low" | "medium" | "high";

export type CanonicalEvidenceKind =
  | "dom_signal"
  | "computed_style"
  | "asset_scan"
  | "metadata"
  | "heuristic"
  | "manual_override";

export type CanonicalEvidenceRef = {
  id: string;
  kind: CanonicalEvidenceKind;
  sourcePath: string;
  domPath: string | null;
  note: string;
  confidence: number;
};

export type CanonicalImportProvenance = {
  importRunId: string;
  sourceUrl: string | null;
  sourceFingerprint: string;
  capturedAtIso: string;
  modelVersion: typeof CANONICAL_IMPORT_MODEL_VERSION;
};

export type CanonicalRouteNode = {
  id: string;
  path: string;
  pageId: string | null;
  parentRouteId: string | null;
  titleHint: string | null;
  order: number;
  status: "resolved" | "placeholder";
};

export type CanonicalNavigationItem = {
  id: string;
  labelContentId: string;
  href: string;
  targetRouteId: string | null;
  order: number;
  isExternal: boolean;
};

export type CanonicalNavigationTree = {
  id: string;
  scope: "global" | "page";
  ownerId: string;
  items: CanonicalNavigationItem[];
};

export type CanonicalGlobalRegionType = "header" | "footer" | "announcement" | "utility" | "unknown";

export type CanonicalGlobalRegion = {
  id: string;
  type: CanonicalGlobalRegionType;
  label: string;
  navigationTreeId: string | null;
  sectionIds: string[];
  evidenceRefs: string[];
};

export type CanonicalSectionRole =
  | "navigation"
  | "hero"
  | "about"
  | "services"
  | "features"
  | "gallery"
  | "metrics"
  | "testimonials"
  | "faq"
  | "cta"
  | "contact"
  | "footer"
  | "custom"
  | "unknown";

export type CanonicalSection = {
  id: string;
  pageId: string;
  role: CanonicalSectionRole;
  order: number;
  domSignature: string;
  contentBindingIds: string[];
  sharedPatternId: string | null;
  evidenceRefs: string[];
  confidence: CanonicalConfidenceLevel;
};

export type CanonicalPagePurpose = "home" | "about" | "services" | "contact" | "product" | "landing" | "blog" | "legal" | "unknown";

export type CanonicalPage = {
  id: string;
  path: string;
  title: string | null;
  purpose: CanonicalPagePurpose;
  routeNodeId: string;
  sectionIds: string[];
  globalRegionIds: string[];
  seoContentIds: string[];
};

export type CanonicalSharedComponentPattern = {
  id: string;
  patternKind: "card_grid" | "testimonial_list" | "faq_list" | "feature_grid" | "metric_strip" | "custom";
  signature: string;
  sectionIds: string[];
  reusable: boolean;
  confidence: CanonicalConfidenceLevel;
};

export type CanonicalSiteStructure = {
  siteId: string;
  locale: string;
  defaultPageId: string | null;
  pages: CanonicalPage[];
  routeTree: CanonicalRouteNode[];
  sections: CanonicalSection[];
  globalRegions: CanonicalGlobalRegion[];
  navigationTrees: CanonicalNavigationTree[];
  sharedPatterns: CanonicalSharedComponentPattern[];
};

export type CanonicalContentType =
  | "plain_text"
  | "rich_text"
  | "heading"
  | "subheading"
  | "cta_label"
  | "cta_url"
  | "image"
  | "icon"
  | "svg"
  | "logo"
  | "background"
  | "gradient"
  | "badge"
  | "list_item"
  | "card_title"
  | "card_body"
  | "metric_label"
  | "metric_value"
  | "testimonial_quote"
  | "testimonial_author"
  | "faq_question"
  | "faq_answer"
  | "form_label"
  | "form_placeholder"
  | "contact_field"
  | "legal_text"
  | "nav_label"
  | "seo_title"
  | "seo_description";

export type CanonicalMediaValue = {
  assetRef: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type CanonicalStructuredValue = {
  entries: Array<Record<string, string>>;
};

export type CanonicalContentValue = string | CanonicalMediaValue | CanonicalStructuredValue;

export type CanonicalContentRecord = {
  id: string;
  type: CanonicalContentType;
  scope: CanonicalLayerScope;
  ownerId: string;
  locale: string;
  value: CanonicalContentValue;
  required: boolean;
  editable: boolean;
  validation: {
    maxLength: number | null;
    pattern: string | null;
    format: "none" | "url" | "email" | "phone";
  };
  evidenceRefs: string[];
};

export type CanonicalContentBinding = {
  id: string;
  contentId: string;
  targetKind: "page" | "section" | "global_region" | "shared_pattern";
  targetId: string;
  fieldKey: string;
  order: number;
};

export type CanonicalReusableContentGroup = {
  id: string;
  label: string;
  contentIds: string[];
  scope: "global" | "component_pattern";
};

export type CanonicalContentInventory = {
  records: CanonicalContentRecord[];
  bindings: CanonicalContentBinding[];
  reusableGroups: CanonicalReusableContentGroup[];
};

export type CanonicalTokenOrigin = "observed" | "inferred" | "design_override";

export type CanonicalColorToken = {
  id: string;
  name: string;
  valueHex8: string;
  semanticRole:
    | "background"
    | "surface"
    | "text_primary"
    | "text_secondary"
    | "accent"
    | "border"
    | "success"
    | "warning"
    | "danger"
    | "unknown";
  origin: CanonicalTokenOrigin;
  confidence: number;
  evidenceRefs: string[];
};

export type CanonicalTypographyToken = {
  id: string;
  role: "display" | "heading" | "body" | "caption" | "button";
  family: string;
  weight: number;
  sizePx: number;
  lineHeight: number;
  letterSpacing: number;
  origin: CanonicalTokenOrigin;
  confidence: number;
  evidenceRefs: string[];
};

export type CanonicalSpacingToken = {
  id: string;
  name: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  px: number;
  origin: CanonicalTokenOrigin;
  confidence: number;
  evidenceRefs: string[];
};

export type CanonicalSurfaceProfile = {
  radiusScalePx: number[];
  borderStyle: "none" | "subtle" | "strong" | "mixed";
  shadowStyle: "flat" | "soft" | "elevated" | "mixed";
  evidenceRefs: string[];
};

export type CanonicalComponentStyleProfile = {
  buttons: {
    variants: Array<"solid" | "outline" | "ghost" | "link">;
    cornerStyle: "sharp" | "rounded" | "pill" | "mixed";
    prominence: "low" | "medium" | "high";
  };
  inputs: {
    border: "none" | "thin" | "thick" | "mixed";
    cornerStyle: "sharp" | "rounded" | "pill" | "mixed";
  };
  media: {
    treatment: "edge_to_edge" | "framed" | "carded" | "mixed";
    saturationHint: "muted" | "balanced" | "vivid" | "unknown";
  };
  sectionTone: "minimal" | "editorial" | "corporate" | "playful" | "premium" | "unknown";
};

export type CanonicalBrandAsset = {
  id: string;
  kind: "logo" | "icon" | "illustration" | "photo";
  assetRef: string;
  usage: "primary" | "secondary" | "decorative";
};

export type CanonicalStyleCgpModel = {
  colorTokens: CanonicalColorToken[];
  typographyTokens: CanonicalTypographyToken[];
  spacingTokens: CanonicalSpacingToken[];
  surfaceProfile: CanonicalSurfaceProfile;
  componentProfile: CanonicalComponentStyleProfile;
  gradients: Array<{ id: string; cssValue: string; origin: CanonicalTokenOrigin; evidenceRefs: string[] }>;
  brandAssets: CanonicalBrandAsset[];
};

export type CanonicalImportBundle = {
  kind: "canonical_import_bundle_v1";
  version: typeof CANONICAL_IMPORT_MODEL_VERSION;
  provenance: CanonicalImportProvenance;
  evidence: CanonicalEvidenceRef[];
  structure: CanonicalSiteStructure;
  content: CanonicalContentInventory;
  style: CanonicalStyleCgpModel;
  diagnostics: Array<{
    code: string;
    severity: "info" | "warning";
    message: string;
    refId: string | null;
  }>;
};
