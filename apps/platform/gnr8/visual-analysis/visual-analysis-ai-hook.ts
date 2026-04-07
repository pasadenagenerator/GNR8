import type {
  VisualPageObservation,
  VisualScreenshotInput,
  VisualSectionObservation,
  VisualStyleFamily,
} from "./visual-analysis-model";

export type VisualAnalysisInterpreterOutput = {
  styleFamilyHint?: VisualStyleFamily;
  pageObservationHints?: Array<Partial<VisualPageObservation> & { pageId: string }>;
  sectionObservationHints?: Array<Partial<VisualSectionObservation> & { pageId: string; sectionId: string; ordinalIndex: number }>;
  rationale?: string[];
};

export type VisualAnalysisInterpreterProvider = {
  name: string;
  interpretVisualInput?: (input: VisualScreenshotInput) => VisualAnalysisInterpreterOutput | null;
};
