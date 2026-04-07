export const VISUAL_ANALYSIS_MODEL_VERSION = "1.0.0" as const;
export const VISUAL_SCREENSHOT_INPUT_VERSION = "1.0.0" as const;

export type VisualConfidence = "low" | "medium" | "high";

export type VisualStyleFamily =
  | "corporate_balanced"
  | "editorial_readable"
  | "visual_gallery"
  | "cta_focused"
  | "service_split_layout"
  | "unknown";

export type VisualHeroProminence = "low" | "medium" | "high";
export type VisualDensityLevel = "low" | "medium" | "high";
export type VisualSpacingRhythm = "tight" | "balanced" | "airy";
export type VisualReadabilityTendency = "calm" | "balanced" | "dense";
export type VisualImageTextBalance = "image_dominant" | "balanced" | "text_dominant";
export type VisualCtaProminence = "low" | "medium" | "high";
export type VisualSectionProminence = "low" | "medium" | "high";

export type VisualAnalysisDiagnosticCode =
  | "VISUAL_ANALYSIS_UNAVAILABLE"
  | "VISUAL_ANALYSIS_LOW_CONFIDENCE"
  | "VISUAL_ANALYSIS_SECTION_ALIGNMENT_WEAK"
  | "VISUAL_ANALYSIS_SCREENSHOT_MISSING"
  | "VISUAL_ANALYSIS_PAGE_METRICS_MISSING";

export type VisualAnalysisDiagnostic = {
  code: VisualAnalysisDiagnosticCode;
  severity: "info" | "warning";
  message: string;
  pageId: string | null;
  sectionId: string | null;
};

export type VisualPageObservation = {
  pageId: string;
  dominantVisualStyleFamily: VisualStyleFamily;
  heroProminence: VisualHeroProminence;
  visualDensity: VisualDensityLevel;
  spacingRhythm: VisualSpacingRhythm;
  readabilityTendency: VisualReadabilityTendency;
  imageTextBalance: VisualImageTextBalance;
  ctaProminence: VisualCtaProminence;
  confidence: VisualConfidence;
  rationale: string[];
};

export type VisualSectionObservation = {
  pageId: string;
  sectionId: string;
  ordinalIndex: number;
  prominence: VisualSectionProminence;
  observationType: "balanced_content" | "media_forward_section" | "compressed_text_block" | "standout_cta_band" | "repeated_card_grid";
  confidence: VisualConfidence;
  rationale: string[];
};

export type VisualAnalysisModel = {
  kind: "visual_analysis_model_v1";
  version: typeof VISUAL_ANALYSIS_MODEL_VERSION;
  status: "available" | "unavailable";
  source: {
    inputKind: "visual_screenshot_input_v1" | "none";
    screenshotCount: number;
    hasSectionHints: boolean;
    hasAlignmentHints: boolean;
  };
  pageObservations: {
    dominantVisualStyleFamily: VisualStyleFamily;
    heroProminence: VisualHeroProminence;
    visualDensity: VisualDensityLevel;
    spacingRhythm: VisualSpacingRhythm;
    readabilityTendency: VisualReadabilityTendency;
    imageTextBalance: VisualImageTextBalance;
    ctaProminence: VisualCtaProminence;
  };
  pageObservationsByPage: VisualPageObservation[];
  sectionObservations: VisualSectionObservation[];
  confidence: VisualConfidence;
  rationale: string[];
  diagnostics: VisualAnalysisDiagnostic[];
};

export type VisualScreenshotReference = {
  screenshotId: string;
  pageId: string;
  source: {
    kind: "file_path" | "url" | "preview_artifact_ref";
    value: string;
  };
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  };
};

export type VisualPageMetricHint = {
  pageId: string;
  heroTopViewportCoverage: number;
  imageAreaRatio: number;
  textAreaRatio: number;
  whitespaceRatio: number;
  aboveFoldPrimaryCtaContrast: number;
  sectionRepetitionScore: number;
  footerHeightRatio: number;
};

export type VisualSectionBoundingHint = {
  pageId: string;
  sectionId: string;
  ordinalIndex: number;
  topRatio: number;
  heightRatio: number;
  textWeight: number;
  mediaWeight: number;
  ctaWeight: number;
  visualDistinctiveness: number;
};

export type VisualSemanticAlignmentHint = {
  pageId: string;
  expectedSectionIds: string[];
};

export type VisualScreenshotInput = {
  kind: "visual_screenshot_input_v1";
  version: typeof VISUAL_SCREENSHOT_INPUT_VERSION;
  screenshots: VisualScreenshotReference[];
  pageMetrics?: VisualPageMetricHint[];
  sectionBoundingHints?: VisualSectionBoundingHint[];
  semanticAlignmentHints?: VisualSemanticAlignmentHint[];
};
