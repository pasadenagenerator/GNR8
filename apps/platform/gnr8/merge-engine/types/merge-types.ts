import type {
  CanonicalContentBinding,
  CanonicalContentInventory,
  CanonicalContentRecord,
  CanonicalImportBundle,
  CanonicalSectionRole,
  CanonicalSiteStructure,
  CanonicalStyleCgpModel,
} from "../../architecture/canonical-import-models";
import type { NormalizedDesignResult } from "../../design-adapter";

export type CanonicalImportModel = CanonicalImportBundle;

export type MergeEngineInput = {
  canonical: CanonicalImportModel;
  design: NormalizedDesignResult;
  options?: MergeOptions;
};

export type MergeOptions = {
  structureMode?: "preserve_import" | "prefer_design" | "hybrid";
  styleMode?: "preserve_import" | "prefer_design" | "hybrid";
  contentMode?: "preserve_import";
  unknownComponentPolicy?: "wrap_as_generic" | "drop" | "diagnose";
};

export type MergeDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  pageId?: string;
  sectionId?: string;
  details?: Record<string, unknown>;
};

export type MergeConflict = {
  type:
    | "missing_import_page"
    | "missing_design_page"
    | "section_mismatch"
    | "component_unmapped"
    | "token_conflict"
    | "content_binding_missing"
    | "layout_override_rejected";
  resolution: "used_import" | "used_design" | "merged" | "fallback_generic" | "skipped";
  details?: Record<string, unknown>;
};

export type FinalSiteModel = {
  site: FinalSite;
  pages: FinalPageModel[];
  globalRegions: FinalGlobalRegion[];
  tokens: FinalTokenSet;
  reusableComponents: FinalReusableComponent[];
  diagnostics: MergeDiagnostic[];
  conflicts: MergeConflict[];
};

export type FinalSite = {
  id: string;
  locale: string;
  defaultPageId: string | null;
  routes: FinalRoute[];
  navigation: FinalNavigationTree[];
  provenance: {
    importRunId: string;
    sourceFingerprint: string;
    capturedAtIso: string;
    mergeModes: Required<MergeOptions>;
    designPagesCount: number;
    designWarningsCount: number;
  };
};

export type FinalRoute = {
  id: string;
  path: string;
  pageId: string | null;
  parentRouteId: string | null;
  titleHint: string | null;
  order: number;
  status: "resolved" | "placeholder";
};

export type FinalNavigationTree = {
  id: string;
  scope: "global" | "page";
  ownerId: string;
  items: Array<{
    id: string;
    labelContentId: string;
    href: string;
    targetRouteId: string | null;
    order: number;
    isExternal: boolean;
  }>;
};

export type FinalPageModel = {
  id: string;
  path: string;
  role: string;
  title: string | null;
  routeNodeId: string;
  seo: {
    titleContentIds: string[];
    descriptionContentIds: string[];
  };
  sections: FinalSectionModel[];
  globalRegionIds: string[];
  provenance: FinalProvenance;
};

export type FinalSectionSemanticRole =
  | CanonicalSectionRole
  | "content"
  | "pricing"
  | "section_heading";

export type FinalSectionModel = {
  id: string;
  pageId: string;
  semanticRole: FinalSectionSemanticRole;
  layoutRole: string;
  order: number;
  components: FinalComponentModel[];
  contentBindings: FinalComponentContentBinding[];
  styleRefs: FinalStyleRefs;
  provenance: FinalProvenance;
};

export type FinalComponentKind =
  | "hero"
  | "section_heading"
  | "rich_text"
  | "image"
  | "cta_group"
  | "card_grid"
  | "gallery"
  | "testimonial"
  | "pricing"
  | "faq"
  | "footer_block"
  | "container"
  | "generic";

export type FinalComponentSlot = {
  key: string;
  valueType: "text" | "rich_text" | "image" | "url" | "list" | "unknown";
  sourceHint: string | null;
};

export type FinalComponentModel = {
  id: string;
  sectionId: string;
  kind: FinalComponentKind;
  mappedType: string;
  variant: string;
  order: number;
  slots: FinalComponentSlot[];
  tokenRefs: string[];
  fallback: {
    wrappedAsGeneric: boolean;
    reason: string | null;
    rawMetadata: Record<string, unknown> | null;
  };
  provenance: FinalProvenance;
};

export type FinalComponentContentBinding = {
  id: string;
  componentId: string;
  sectionId: string;
  slotPath: string;
  contentId: string;
  confidence: number;
  source: "canonical_binding" | "heuristic";
};

export type FinalStyleRefs = {
  colorTokenIds: string[];
  typographyTokenIds: string[];
  spacingTokenIds: string[];
  gradientIds: string[];
};

export type FinalGlobalRegion = {
  id: string;
  type: "header" | "footer" | "announcement" | "utility" | "unknown";
  label: string;
  navigationTreeId: string | null;
  sectionIds: string[];
  pageIds: string[];
  provenance: FinalProvenance;
};

export type FinalTokenSet = {
  colors: FinalColorToken[];
  typography: FinalTypographyToken[];
  spacing: FinalSpacingToken[];
  surface: {
    radiusScalePx: number[];
    borderStyle: "none" | "subtle" | "strong" | "mixed";
    shadowStyle: "flat" | "soft" | "elevated" | "mixed";
    provenance: FinalProvenance[];
  };
  componentProfile: {
    buttons: CanonicalStyleCgpModel["componentProfile"]["buttons"];
    inputs: CanonicalStyleCgpModel["componentProfile"]["inputs"];
    media: CanonicalStyleCgpModel["componentProfile"]["media"];
    sectionTone: string;
    provenance: FinalProvenance[];
  };
  gradients: Array<{
    id: string;
    cssValue: string;
    provenance: FinalProvenance[];
  }>;
};

export type FinalColorToken = {
  id: string;
  name: string;
  semanticRole: string;
  valueHex8: string;
  provenance: FinalProvenance[];
};

export type FinalTypographyToken = {
  id: string;
  role: string;
  family: string;
  weight: number;
  sizePx: number;
  lineHeight: number;
  letterSpacing: number;
  provenance: FinalProvenance[];
};

export type FinalSpacingToken = {
  id: string;
  name: string;
  px: number;
  provenance: FinalProvenance[];
};

export type FinalReusableComponent = {
  id: string;
  kind: string;
  sourcePatternId: string | null;
  sectionIds: string[];
  reusable: boolean;
  confidence: "low" | "medium" | "high";
  provenance: FinalProvenance;
};

export type FinalProvenance = {
  source: "import" | "design" | "merged";
  sourceId: string;
  rationale: string;
  confidence: number;
};

export type MergeContext = {
  canonicalStructure: CanonicalSiteStructure;
  canonicalContent: CanonicalContentInventory;
  canonicalStyle: CanonicalStyleCgpModel;
  canonicalProvenance: CanonicalImportModel["provenance"];
  design: NormalizedDesignResult;
  recordsById: Map<string, CanonicalContentRecord>;
  bindingsBySectionId: Map<string, CanonicalContentBinding[]>;
  bindingsByOwnerId: Map<string, CanonicalContentBinding[]>;
  options: Required<MergeOptions>;
  diagnostics: MergeDiagnostic[];
  conflicts: MergeConflict[];
};

export const DEFAULT_MERGE_OPTIONS: Required<MergeOptions> = {
  structureMode: "hybrid",
  styleMode: "hybrid",
  contentMode: "preserve_import",
  unknownComponentPolicy: "wrap_as_generic",
};
