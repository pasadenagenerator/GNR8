import type { DesignRationale, LayoutStrategy, SectionDecision, SectionSemanticType, SectionVisualTreatment } from "./design-model";

export const AI_DESIGN_SUGGESTION_VERSION = "1.0.0" as const;

export type AiSuggestionConfidence = "low" | "medium" | "high";

export type AiSuggestionSource = {
  provider: string;
  model: string | null;
};

export type AiSectionSuggestion = {
  sectionId: string;
  pageId: string;
  semanticTypeSuggestion?: SectionSemanticType;
  visualTreatmentSuggestion?: SectionVisualTreatment;
  emphasisSuggestion?: SectionDecision["emphasis"];
  confidence: AiSuggestionConfidence;
  rationale: string[];
};

export type AiDesignSuggestion = {
  kind: "ai_design_suggestion_v1";
  version: typeof AI_DESIGN_SUGGESTION_VERSION;
  source: AiSuggestionSource;
  pageStrategySuggestion?: LayoutStrategy;
  sectionSuggestions: AiSectionSuggestion[];
  rationale: string[];
  confidence: {
    overall: AiSuggestionConfidence;
    bySection?: Record<string, AiSuggestionConfidence>;
  };
};

export type AiSuggestionMergeDecision = {
  target: "page_strategy" | "section";
  sectionId: string | null;
  status: "accepted" | "rejected" | "ignored";
  reasonCode:
    | "AI_SUGGESTION_ACCEPTED"
    | "AI_SUGGESTION_UNAVAILABLE"
    | "AI_SUGGESTION_MALFORMED"
    | "AI_SUGGESTION_LOW_CONFIDENCE"
    | "AI_SUGGESTION_UNKNOWN_VALUE"
    | "AI_SUGGESTION_UNKNOWN_SECTION"
    | "AI_SUGGESTION_CONFLICT_WITH_STRUCTURE"
    | "AI_SUGGESTION_NOT_APPLICABLE";
  message: string;
};

export type AiSuggestionMergeResult = {
  status: "unavailable" | "no_suggestion" | "suggested" | "merged" | "rejected";
  suggestion: AiDesignSuggestion | null;
  acceptedCount: number;
  rejectedCount: number;
  ignoredCount: number;
  decisions: AiSuggestionMergeDecision[];
  rationale: DesignRationale[];
};

export type AiSectionInputSummary = {
  sectionId: string;
  pageId: string;
  sourceDomPath: string;
  ordinalIndex: number;
  semanticGuess: SectionSemanticType;
  textDensity: number;
  mediaDensity: number;
  ctaCandidates: number;
  deterministicDecision: {
    semanticType: SectionSemanticType;
    visualTreatment: SectionVisualTreatment;
    emphasis: SectionDecision["emphasis"];
    confidence: number;
  } | null;
};

export type AiPageInputSummary = {
  pageId: string;
  sourcePath: string;
  isEntry: boolean;
  pageTypeGuess: string;
  contentDensity: number;
  visualDensity: number;
  ctaCandidateCount: number;
  deterministicStrategy: LayoutStrategy | null;
  sectionSummaries: AiSectionInputSummary[];
};

export type AiDesignSuggestionInput = {
  kind: "ai_design_suggestion_input_v1";
  preparedSiteFingerprint: string;
  pages: AiPageInputSummary[];
  brandSignalSummary: {
    primaryColorHints: string[];
    secondaryColorHints: string[];
    typographyHints: string[];
  };
  deterministicBaseline: {
    pageType: string;
    layoutStrategy: LayoutStrategy;
    sectionDecisionCount: number;
  };
};
