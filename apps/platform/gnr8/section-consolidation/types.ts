export type ConsolidationDiagnosticCode =
  | "SECTION_CONSOLIDATION_APPLIED"
  | "SECTION_MERGE_HEAVY"
  | "SECTION_MERGE_MINIMAL"
  | "SECTION_BOUNDARY_UNCERTAIN"
  | "FOOTER_FALSE_POSITIVE_PREVENTED"
  | "NAVBAR_BOUNDARY_PROTECTED";

export type ConsolidationDiagnostic = {
  code: ConsolidationDiagnosticCode;
  severity: "info" | "warning";
  message: string;
  details?: Record<string, unknown>;
};

export type RawBlock = {
  id: string;
  domPath: string;
  tagName: string;
  ordinalIndex: number;
  parentDomPath: string;
  domDepth: number;
  className: string | null;
  role: string | null;
  ariaLabel: string | null;
  textExcerpt: string | null;
  preservedMarkupHtml: string | null;
  childElementCount: number;
  textWordCount: number;
  textDensity: number;
  nodeComplexity: number;
  layoutHintDepth: number;
  hasHeading: boolean;
  hasImages: boolean;
  hasCTA: boolean;
  anchorCount: number;
  hasFooterHint: boolean;
  hasNavHint: boolean;
  hasLegalHint: boolean;
  hasContactHint: boolean;
  repetitionHint: number;
};

export type SectionGroup = {
  id: string;
  blockIds: string[];
  domIndexStart: number;
  domIndexEnd: number;
  rationale: string[];
  mergeDecisions: string[];
};

export type ConsolidatedSection = {
  id: string;
  blockIds: string[];
  domIndexStart: number;
  domIndexEnd: number;
  sourceDomPaths: string[];
  signals: {
    hasHeading: boolean;
    hasImages: boolean;
    hasCTA: boolean;
    textDensity: number;
    textWordCount: number;
    nodeComplexity: number;
    headingCount: number;
    imageCount: number;
    ctaCount: number;
    anchorCount: number;
    footerHintCount: number;
    navHintCount: number;
    legalHintCount: number;
    contactHintCount: number;
    repetitionScore: number;
  };
  candidates: {
    heroCandidate: number;
    ctaCandidate: number;
    contentCandidate: number;
    footerCandidate: number;
    servicesCandidate: number;
    galleryCandidate: number;
  };
  confidence: number;
  rationale: string[];
  mergeDecisions: string[];
};

export type SectionConsolidationResult = {
  mode: "standard" | "aggressive";
  deepFragmentationDetected: boolean;
  inputBlockCount: number;
  outputSectionCount: number;
  diagnostics: ConsolidationDiagnostic[];
  groups: SectionGroup[];
  sections: ConsolidatedSection[];
};
