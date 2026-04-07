import type { PreparedSiteModel } from "../migration/prepared-site-model";
import type { AiSuggestionMergeResult } from "./ai-suggestion-model";

export const DESIGN_MODEL_VERSION = "1.0.0" as const;

export type PageType = "home" | "about" | "services" | "product" | "landing" | "unknown";

export type LayoutStrategy =
  | "corporate_balanced"
  | "cta_focused"
  | "editorial_readable"
  | "visual_gallery"
  | "service_split_layout";

export type SectionSemanticType =
  | "header"
  | "hero"
  | "content"
  | "cta"
  | "gallery"
  | "footer"
  | "unknown";

export type SectionVisualTreatment =
  | "hero_centered"
  | "hero_split"
  | "hero_image_first"
  | "readable_single_column"
  | "content_two_column"
  | "cta_emphasized"
  | "cta_secondary"
  | "cta_inline"
  | "gallery_grid"
  | "gallery_featured_grid"
  | "header_compact"
  | "footer_compact"
  | "footer_multi_column"
  | "generic_balanced";

export type TypographyScale = {
  profile: "balanced" | "readable" | "marketing";
  headingScale: "tight" | "regular" | "large";
  bodyScale: "compact" | "regular" | "relaxed";
};

export type SpacingScale = {
  rhythm: "calm" | "balanced" | "dense" | "airy";
  sectionGap: "sm" | "md" | "lg";
  contentGap: "sm" | "md" | "lg";
};

export type ColorSystem = {
  mode: "source_derived" | "neutral_fallback";
  tone: "calm" | "neutral" | "energetic";
  primaryHint: string | null;
  secondaryHint: string | null;
};

export type ComponentVariantMap = {
  hero: "centered" | "split" | "image_first";
  cta: "emphasized" | "secondary" | "inline";
  content: "single_column" | "two_column";
  gallery: "grid" | "featured_grid";
  footer: "compact" | "multi_column";
};

export type DesignRationale = {
  code: string;
  summary: string;
  basedOn: string[];
};

export type SectionDecision = {
  sectionId: string;
  pageId: string;
  sourceDomPath: string;
  ordinalIndex: number;
  semanticType: SectionSemanticType;
  visualTreatment: SectionVisualTreatment;
  emphasis: "primary" | "secondary" | "neutral";
  confidence: number;
  rationale: DesignRationale[];
};

export type DesignIntelligenceDiagnostic = {
  code:
    | "DESIGN_INTELLIGENCE_DEFAULTED"
    | "DESIGN_INTELLIGENCE_LOW_CONFIDENCE"
    | "AI_DESIGN_SUGGESTION_UNAVAILABLE"
    | "AI_DESIGN_SUGGESTION_ACCEPTED"
    | "AI_DESIGN_SUGGESTION_REJECTED"
    | "AI_DESIGN_SUGGESTION_LOW_CONFIDENCE"
    | "AI_DESIGN_SUGGESTION_MALFORMED";
  severity: "warning" | "info";
  message: string;
  pageId: string | null;
};

export type DesignAiAssistanceSummary = {
  enabled: boolean;
  status: AiSuggestionMergeResult["status"];
  acceptedCount: number;
  rejectedCount: number;
  ignoredCount: number;
  mergeDecisions: AiSuggestionMergeResult["decisions"];
  rationale: string[];
};

export type DesignModel = {
  kind: "design_model_v1";
  version: typeof DESIGN_MODEL_VERSION;

  source: {
    preparedSiteKind: PreparedSiteModel["kind"];
    preparedSiteModelVersion: PreparedSiteModel["modelVersion"];
    importContractVersion: PreparedSiteModel["source"]["importContractVersion"];
    importManifestVersion: PreparedSiteModel["source"]["importManifestVersion"];
    fingerprints: PreparedSiteModel["source"]["fingerprints"];
  };

  status: "ready" | "ready_with_warnings";
  pageType: PageType;
  layoutStrategy: LayoutStrategy;

  pageStrategies: {
    pageId: string;
    sourcePath: string;
    pageType: PageType;
    layoutStrategy: LayoutStrategy;
    confidence: number;
  }[];

  sectionDecisions: SectionDecision[];
  typographyScale: TypographyScale;
  spacingScale: SpacingScale;
  colorSystem: ColorSystem;
  componentVariants: ComponentVariantMap;
  rationale: DesignRationale[];
  aiAssistance: DesignAiAssistanceSummary;

  diagnostics: {
    codes: string[];
    issues: DesignIntelligenceDiagnostic[];
  };
};

export type DesignSemanticSectionInput = {
  sectionId: string;
  pageId: string;
  sourceDomPath: string;
  sourceTagName: string;
  ordinalIndex: number;
  childElementCount: number;
  textExcerpt: string | null;
  directTextPresent: boolean;
  textDensity: number;
  mediaCount: number;
  ctaCandidateCount: number;
  hasHeadingSignal: boolean;
};

export type DesignPageInput = {
  pageId: string;
  sourcePath: string;
  isEntry: boolean;
  title: string | null;
  sections: DesignSemanticSectionInput[];
  contentDensity: number;
  visualDensity: number;
  ctaCandidateCount: number;
  brandSignals: {
    primaryColorHint: string | null;
    secondaryColorHint: string | null;
    typographyHint: string | null;
  };
};

export type DesignIntelligenceInput = {
  preparedSite: DesignModel["source"];
  pages: DesignPageInput[];
};

export type DesignIntelligenceAiHook = {
  name: string;
  requestAiDesignSuggestions?: (input: import("./ai-suggestion-model").AiDesignSuggestionInput) => import("./ai-suggestion-model").AiDesignSuggestion | null;
};
