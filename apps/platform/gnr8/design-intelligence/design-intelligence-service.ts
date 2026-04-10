import type { PreparedDocumentRecord, PreparedDomOutlineElement, PreparedSiteModel } from "../migration/prepared-site-model";
import { sha256Hex, stableStringify } from "../migration/runtime/diagnostics";
import type {
  AiDesignSuggestion,
  AiDesignSuggestionInput,
  AiSectionSuggestion,
  AiSuggestionConfidence,
  AiSuggestionMergeDecision,
  AiSuggestionMergeResult,
} from "./ai-suggestion-model";
import type { DesignIntelligenceAiSuggestionService } from "./design-intelligence-ai-hook";
import type { VisualAnalysisModel, VisualPageObservation } from "../visual-analysis/visual-analysis-model";
import { extractStyleSignalModel, type StyleSignalModel } from "../style-signals";
import {
  DESIGN_MODEL_VERSION,
  type ComponentVariantMap,
  type DesignIntelligenceDiagnostic,
  type DesignIntelligenceInput,
  type DesignModel,
  type DesignPageInput,
  type DesignRationale,
  type DesignSemanticSectionInput,
  type LayoutStrategy,
  type PageType,
  type SectionDecision,
  type SectionSemanticType,
  type SectionVisualTreatment,
} from "./design-model";

const MEDIA_TAGS = new Set(["img", "picture", "figure", "video", "svg", "canvas"]);
const CTA_PATTERN = /\b(get started|start now|book|contact|call|buy|shop|demo|learn more|sign up|join|quote|request)\b/gi;
const ALLOWED_LAYOUT_STRATEGIES: readonly LayoutStrategy[] = [
  "corporate_balanced",
  "cta_focused",
  "editorial_readable",
  "visual_gallery",
  "service_split_layout",
] as const;
const ALLOWED_SEMANTIC_TYPES: readonly SectionSemanticType[] = ["header", "hero", "content", "cta", "gallery", "footer", "unknown"] as const;
const ALLOWED_VISUAL_TREATMENTS: readonly SectionVisualTreatment[] = [
  "hero_centered",
  "hero_split",
  "hero_image_first",
  "readable_single_column",
  "content_two_column",
  "cta_emphasized",
  "cta_secondary",
  "cta_inline",
  "gallery_grid",
  "gallery_featured_grid",
  "header_compact",
  "footer_compact",
  "footer_multi_column",
  "generic_balanced",
] as const;
const ALLOWED_EMPHASIS: readonly SectionDecision["emphasis"][] = ["primary", "secondary", "neutral"] as const;

const ALLOWED_TREATMENTS_BY_SEMANTIC: Record<SectionSemanticType, readonly SectionVisualTreatment[]> = {
  header: ["header_compact", "generic_balanced"],
  hero: ["hero_centered", "hero_split", "hero_image_first", "generic_balanced"],
  content: ["readable_single_column", "content_two_column", "generic_balanced"],
  cta: ["cta_emphasized", "cta_secondary", "cta_inline", "generic_balanced"],
  gallery: ["gallery_grid", "gallery_featured_grid", "generic_balanced"],
  footer: ["footer_compact", "footer_multi_column", "generic_balanced"],
  unknown: ["generic_balanced"],
};

const CONFIDENCE_RANK: Record<AiSuggestionConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

type BuildDesignModelOptions = {
  aiSuggestionService?: DesignIntelligenceAiSuggestionService | null;
  enableAiSuggestions?: boolean;
  visualAnalysis?: VisualAnalysisModel | null;
  styleSignals?: StyleSignalModel | null;
};

export type DesignIntelligenceBuildResult = {
  deterministicDesignModel: DesignModel;
  aiSuggestionInput: AiDesignSuggestionInput | null;
  aiSuggestionMerge: AiSuggestionMergeResult;
  designModel: DesignModel;
};

type AttemptedAiSuggestion = {
  status: "unavailable" | "no_suggestion" | "suggested" | "malformed";
  suggestion: AiDesignSuggestion | null;
  reason: string;
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort(stringCmp);
}

function isAllowedValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isAiSuggestionConfidence(value: unknown): value is AiSuggestionConfidence {
  return value === "low" || value === "medium" || value === "high";
}

function countPattern(text: string, pattern: RegExp): number {
  const normalized = text.trim();
  if (normalized.length === 0) return 0;
  const matches = normalized.match(pattern);
  return matches ? matches.length : 0;
}

function hasHeadingSignal(input: { sourceTagName: string; textExcerpt: string | null; ordinalIndex: number }): boolean {
  const tag = input.sourceTagName.toLowerCase();
  if (tag === "h1" || tag === "h2" || tag === "h3") return true;
  const text = String(input.textExcerpt ?? "").trim();
  if (text.length === 0) return false;
  if (input.ordinalIndex === 0 && text.length <= 90) return true;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.length > 0 && words.length <= 12;
}

function sectionIdFor(input: { pageId: string; sourceDomPath: string; ordinalIndex: number }): string {
  return sha256Hex(
    stableStringify({
      kind: "design_section_v1",
      pageId: input.pageId,
      sourceDomPath: input.sourceDomPath,
      ordinalIndex: input.ordinalIndex,
    }),
  );
}

function extractBlocksFromBodyWithWrapperPromotion(input: {
  bodyChildElements: NonNullable<PreparedDocumentRecord["domOutline"]>["bodyChildElements"];
}): {
  boundaryChildren: NonNullable<PreparedDocumentRecord["domOutline"]>["bodyChildElements"];
} {
  let boundaryChildren = input.bodyChildElements;

  while (boundaryChildren.length === 1) {
    const only = boundaryChildren[0]!;
    if (only.directTextPresent) break;
    if (only.childElementCount >= 1) {
      boundaryChildren = only.childElements;
      continue;
    }
    break;
  }

  return { boundaryChildren };
}

function flattenOutlineElements(elements: PreparedDomOutlineElement[]): PreparedDomOutlineElement[] {
  const out: PreparedDomOutlineElement[] = [];
  const stack = [...elements].reverse();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    out.push(current);
    for (let i = current.childElements.length - 1; i >= 0; i -= 1) stack.push(current.childElements[i]!);
  }
  return out;
}

function toSectionInput(pageId: string, element: PreparedDomOutlineElement): DesignSemanticSectionInput {
  const textExcerpt = element.textExcerpt;
  const textLen = String(textExcerpt ?? "").trim().length;
  const textDensity = Math.min(1, textLen / 260);
  const tagLower = element.tagName.toLowerCase();
  const mediaCount = MEDIA_TAGS.has(tagLower) || /gallery|image|media|photo|portfolio/.test(element.domPath.toLowerCase()) ? 1 : 0;
  const ctaCandidateCount = countPattern(String(textExcerpt ?? ""), CTA_PATTERN);

  return {
    sectionId: sectionIdFor({ pageId, sourceDomPath: element.domPath, ordinalIndex: element.ordinalIndex }),
    pageId,
    sourceDomPath: element.domPath,
    sourceTagName: element.tagName,
    ordinalIndex: element.ordinalIndex,
    childElementCount: element.childElementCount,
    textExcerpt,
    directTextPresent: element.directTextPresent,
    textDensity,
    mediaCount,
    ctaCandidateCount,
    hasHeadingSignal: hasHeadingSignal({ sourceTagName: element.tagName, textExcerpt, ordinalIndex: element.ordinalIndex }),
    inferredType: "unknown",
    semanticConfidence: "low",
    semanticRationale: ["fallback_outline_section_input"],
    heroComposition: null,
    mediaDensity: mediaCount > 0 ? 0.6 : 0,
    galleryLikeConfidence: mediaCount > 0 ? "medium" : "low",
    readabilityTendency: textDensity >= 0.62 ? "readable" : textDensity >= 0.35 ? "balanced" : "compact",
  };
}

function inferPageType(page: DesignPageInput): { pageType: PageType; confidence: number } {
  const bag = `${page.sourcePath} ${page.title ?? ""}`.toLowerCase();
  const sectionTypeCounts = page.sections.reduce(
    (acc, section) => {
      acc[section.inferredType] = (acc[section.inferredType] ?? 0) + 1;
      return acc;
    },
    {} as Record<DesignSemanticSectionInput["inferredType"], number>,
  );

  if (/about|team|company|mission/.test(bag) || (sectionTypeCounts.about ?? 0) >= 1) return { pageType: "about", confidence: 0.88 };
  if (/service|consult|agency|solutions/.test(bag) || (sectionTypeCounts.services ?? 0) + (sectionTypeCounts.features ?? 0) >= 2)
    return { pageType: "services", confidence: 0.84 };
  if (/contact|support/.test(bag) || (sectionTypeCounts.contact ?? 0) >= 1) return { pageType: "landing", confidence: 0.72 };
  if (/pricing|product|shop|feature|plan/.test(bag)) return { pageType: "product", confidence: 0.82 };
  if (/gallery|portfolio|project/.test(bag) || (sectionTypeCounts.gallery ?? 0) >= 1) return { pageType: "landing", confidence: 0.74 };
  if (/landing|campaign/.test(bag)) return { pageType: "landing", confidence: 0.78 };
  if (page.isEntry || page.sourcePath === "index.html") {
    const hasHero = page.sections.some((s) => s.inferredType === "hero");
    const hasNav = page.sections.some((s) => s.inferredType === "navigation" || s.inferredType === "header");
    const hasFooter = page.sections.some((s) => s.inferredType === "footer");
    return { pageType: "home", confidence: hasHero && hasNav && hasFooter ? 0.84 : 0.7 };
  }
  return { pageType: "unknown", confidence: 0.48 };
}

function styleEvidenceStrength(style: StyleSignalModel): "weak" | "medium" | "strong" {
  const coverage = style.provenance.computedStyle.coverage;
  const sampleCount = style.provenance.computedStyle.sampleCount;
  const hasWeakDiag = style.diagnostics.some((diag) => diag.code === "STYLE_SIGNAL_WEAK");
  if (hasWeakDiag) return "weak";
  if (sampleCount >= 5 || coverage >= 0.45) return "strong";
  if (sampleCount >= 3 || coverage >= 0.2 || style.sourceMode === "mixed") return "medium";
  return "weak";
}

function pickStrategy(input: {
  page: DesignPageInput;
  pageType: PageType;
  visualObservation?: VisualPageObservation | null;
  styleSignals: StyleSignalModel;
}): { strategy: LayoutStrategy; confidence: number; rationale: DesignRationale } {
  const heroCandidate = input.page.sections.find((s) => s.ordinalIndex === 0) ?? null;
  const visual = input.visualObservation ?? null;
  const style = input.styleSignals;
  const styleStrength = styleEvidenceStrength(style);

  if (styleStrength !== "weak" && style.cta.prominence === "high" && style.cta.styleHint !== "text_link") {
    return {
      strategy: "cta_focused",
      confidence: styleStrength === "strong" ? 0.86 : 0.8,
      rationale: {
        code: "STRATEGY_STYLE_CTA_PROMINENCE",
        summary: "Selected cta_focused from strong style CTA prominence signals.",
        basedOn: [
          `styleSource=${style.sourceMode}`,
          `styleStrength=${styleStrength}`,
          `ctaProminence=${style.cta.prominence}`,
          `ctaStyle=${style.cta.styleHint}`,
        ],
      },
    };
  }

  if (styleStrength !== "weak" && style.colors.backgroundTone === "dark" && style.colors.primaryAccent) {
    return {
      strategy: "visual_gallery",
      confidence: styleStrength === "strong" ? 0.81 : 0.75,
      rationale: {
        code: "STRATEGY_STYLE_DARK_ACCENT",
        summary: "Selected visual_gallery due to dark background and strong accent style profile.",
        basedOn: [
          `styleSource=${style.sourceMode}`,
          `styleStrength=${styleStrength}`,
          `backgroundTone=${style.colors.backgroundTone}`,
          `primaryAccent=${style.colors.primaryAccent}`,
        ],
      },
    };
  }

  if (
    styleStrength === "strong" &&
    (style.visualToneHint === "premium" || style.visualToneHint === "editorial" || style.typography.headingCategory === "serif")
  ) {
    return {
      strategy: "editorial_readable",
      confidence: 0.8,
      rationale: {
        code: "STRATEGY_STYLE_EDITORIAL_PREMIUM",
        summary: "Selected editorial_readable due to premium/editorial typography and spacing profile.",
        basedOn: [
          `styleVisualTone=${style.visualToneHint}`,
          `headingCategory=${style.typography.headingCategory}`,
          `spacingRhythm=${style.spacing.rhythm}`,
        ],
      },
    };
  }

  if (visual && visual.confidence === "high" && visual.dominantVisualStyleFamily !== "unknown") {
    return {
      strategy: visual.dominantVisualStyleFamily,
      confidence: 0.88,
      rationale: {
        code: "STRATEGY_VISUAL_STYLE_HINT",
        summary: "Selected strategy from high-confidence screenshot-assisted visual style hint.",
        basedOn: [
          `visualStyle=${visual.dominantVisualStyleFamily}`,
          `visualConfidence=${visual.confidence}`,
        ],
      },
    };
  }

  if (visual && visual.confidence !== "low" && visual.ctaProminence === "low" && input.page.ctaCandidateCount > 0) {
    return {
      strategy: "cta_focused",
      confidence: 0.76,
      rationale: {
        code: "STRATEGY_VISUAL_CTA_REINFORCEMENT",
        summary: "Selected cta_focused to reinforce weak visual CTA prominence.",
        basedOn: [
          `visualCtaProminence=${visual.ctaProminence}`,
          `ctaCandidates=${input.page.ctaCandidateCount}`,
        ],
      },
    };
  }

  if (input.page.visualDensity >= 0.6) {
    return {
      strategy: "visual_gallery",
      confidence: 0.86,
      rationale: {
        code: "STRATEGY_VISUAL_GALLERY",
        summary: "Selected visual_gallery due to media-forward page density.",
        basedOn: [`visualDensity=${input.page.visualDensity.toFixed(2)}`],
      },
    };
  }

  if (input.page.ctaCandidateCount >= 3) {
    return {
      strategy: "cta_focused",
      confidence: 0.85,
      rationale: {
        code: "STRATEGY_CTA_FOCUSED",
        summary: "Selected cta_focused because multiple CTA candidates were detected.",
        basedOn: [`ctaCandidates=${input.page.ctaCandidateCount}`],
      },
    };
  }

  if (input.page.contentDensity >= 0.62 && input.page.visualDensity <= 0.25) {
    return {
      strategy: "editorial_readable",
      confidence: 0.82,
      rationale: {
        code: "STRATEGY_EDITORIAL_READABLE",
        summary: "Selected editorial_readable for text-dense, low-media content.",
        basedOn: [
          `contentDensity=${input.page.contentDensity.toFixed(2)}`,
          `visualDensity=${input.page.visualDensity.toFixed(2)}`,
        ],
      },
    };
  }

  if (input.pageType === "services" && heroCandidate && heroCandidate.hasHeadingSignal && heroCandidate.mediaCount > 0) {
    return {
      strategy: "service_split_layout",
      confidence: 0.78,
      rationale: {
        code: "STRATEGY_SERVICE_SPLIT",
        summary: "Selected service_split_layout due to services context with hero heading and media.",
        basedOn: ["pageType=services", "heroHeading=true", "heroMedia=true"],
      },
    };
  }

  return {
    strategy: "corporate_balanced",
    confidence: input.pageType === "about" ? 0.74 : 0.62,
    rationale: {
      code: "STRATEGY_CORPORATE_BALANCED_DEFAULT",
      summary: "Selected corporate_balanced as the safe deterministic default.",
      basedOn: [`pageType=${input.pageType}`],
    },
  };
}

function inferSemanticType(section: DesignSemanticSectionInput): SectionSemanticType {
  if (section.inferredType === "navigation" || section.inferredType === "header") return "header";
  if (section.inferredType === "hero") return "hero";
  if (section.inferredType === "cta" || section.inferredType === "contact") return "cta";
  if (section.inferredType === "gallery") return "gallery";
  if (section.inferredType === "footer") return "footer";
  if (section.inferredType === "about" || section.inferredType === "services" || section.inferredType === "features" || section.inferredType === "testimonials")
    return "content";

  const tag = section.sourceTagName.toLowerCase();
  const pathLower = section.sourceDomPath.toLowerCase();

  if (tag === "header" || tag === "nav" || pathLower.includes("header") || pathLower.includes("nav")) return "header";
  if (tag === "footer" || pathLower.includes("footer")) return "footer";
  if (section.ordinalIndex === 0 && (section.hasHeadingSignal || section.mediaCount > 0 || pathLower.includes("hero"))) return "hero";
  if (pathLower.includes("hero") || pathLower.includes("banner")) return "hero";
  if (section.mediaCount > 0 || pathLower.includes("gallery") || pathLower.includes("portfolio")) return "gallery";
  if (section.ctaCandidateCount > 1 || pathLower.includes("cta") || pathLower.includes("contact")) return "cta";
  if (section.textDensity >= 0.25) return "content";
  return "unknown";
}

function pickSectionTreatment(input: {
  semanticType: SectionSemanticType;
  section: DesignSemanticSectionInput;
  strategy: LayoutStrategy;
  ctaPrimarySectionId: string | null;
  styleSignals: StyleSignalModel;
}): {
  visualTreatment: SectionVisualTreatment;
  emphasis: SectionDecision["emphasis"];
  confidence: number;
  rationale: DesignRationale[];
} {
  const r: DesignRationale[] = [];

  if (input.semanticType === "hero") {
    if (input.section.heroComposition === "split_media" || (input.section.hasHeadingSignal && input.section.mediaCount > 0)) {
      r.push({
        code: "HERO_SPLIT_HEADING_WITH_MEDIA",
        summary: "Hero uses split layout because heading and media are both present.",
        basedOn: ["hasHeadingSignal=true", "mediaCount>0", `heroComposition=${String(input.section.heroComposition)}`],
      });
      return { visualTreatment: "hero_split", emphasis: "primary", confidence: input.section.semanticConfidence === "high" ? 0.92 : 0.86, rationale: r };
    }
    if (input.section.heroComposition === "image_first" || input.section.mediaCount > 0 || input.section.mediaDensity >= 0.55) {
      r.push({
        code: "HERO_IMAGE_FIRST",
        summary: "Hero uses image-first treatment because media is present without a strong heading signal.",
        basedOn: ["hasHeadingSignal=false", "mediaCount>0", `mediaDensity=${input.section.mediaDensity.toFixed(2)}`],
      });
      return { visualTreatment: "hero_image_first", emphasis: "primary", confidence: 0.78, rationale: r };
    }
    r.push({
      code: "HERO_CENTERED_DEFAULT",
      summary: "Hero uses centered treatment as a safe textual default.",
      basedOn: ["mediaCount=0"],
    });
    return { visualTreatment: "hero_centered", emphasis: "primary", confidence: 0.72, rationale: r };
  }

  if (input.semanticType === "content") {
    if (input.section.textDensity >= 0.6 && input.section.mediaCount === 0) {
      r.push({
        code: "CONTENT_READABLE_SINGLE_COLUMN",
        summary: "Readable single-column treatment selected due to high text density and low media support.",
        basedOn: [`textDensity=${input.section.textDensity.toFixed(2)}`, "mediaCount=0"],
      });
      return { visualTreatment: "readable_single_column", emphasis: "neutral", confidence: 0.86, rationale: r };
    }
    r.push({
      code: "CONTENT_TWO_COLUMN_BALANCED",
      summary: "Balanced two-column treatment selected for mixed content density.",
      basedOn: [`textDensity=${input.section.textDensity.toFixed(2)}`],
    });
    return { visualTreatment: "content_two_column", emphasis: "neutral", confidence: 0.7, rationale: r };
  }

  if (input.semanticType === "cta") {
    const isPrimary = input.ctaPrimarySectionId === input.section.sectionId;
    const styleIndicatesStrongCta =
      input.styleSignals.cta.prominence === "high" &&
      (input.styleSignals.cta.styleHint === "solid_button" || input.styleSignals.cta.styleHint === "outline_button");
    const styleIndicatesInlineCta =
      input.styleSignals.cta.styleHint === "text_link" || input.styleSignals.cta.prominence === "low";
    if (isPrimary) {
      r.push({
        code: "CTA_EMPHASIZED_PRIMARY",
        summary: "Primary CTA emphasis selected because this section has strongest CTA signal.",
        basedOn: [
          `strategy=${input.strategy}`,
          `ctaCandidates=${input.section.ctaCandidateCount}`,
          `isPrimary=${String(isPrimary)}`,
        ],
      });
      return { visualTreatment: styleIndicatesInlineCta ? "cta_secondary" : "cta_emphasized", emphasis: "primary", confidence: 0.87, rationale: r };
    }
    if (styleIndicatesStrongCta && input.section.ctaCandidateCount > 0) {
      r.push({
        code: "CTA_SECONDARY_STYLE_STRONG",
        summary: "Secondary CTA treatment selected because style indicates strong button affordance.",
        basedOn: [`styleHint=${input.styleSignals.cta.styleHint}`, `styleProminence=${input.styleSignals.cta.prominence}`],
      });
      return { visualTreatment: "cta_secondary", emphasis: "secondary", confidence: 0.78, rationale: r };
    }
    if (input.section.ctaCandidateCount > 0 && !styleIndicatesInlineCta) {
      r.push({
        code: "CTA_SECONDARY",
        summary: "Secondary CTA treatment selected because another section is primary CTA.",
        basedOn: [`ctaCandidates=${input.section.ctaCandidateCount}`],
      });
      return { visualTreatment: "cta_secondary", emphasis: "secondary", confidence: 0.75, rationale: r };
    }
    r.push({
      code: "CTA_INLINE_FALLBACK",
      summary: "Inline CTA fallback selected due to weak CTA signal.",
      basedOn: ["weakCtaSignal"],
    });
    return { visualTreatment: "cta_inline", emphasis: "secondary", confidence: 0.55, rationale: r };
  }

  if (input.semanticType === "gallery") {
    if (input.section.childElementCount >= 6 || input.strategy === "visual_gallery") {
      r.push({
        code: "GALLERY_GRID",
        summary: "Gallery uses grid treatment for media-forward section density.",
        basedOn: [`childElementCount=${input.section.childElementCount}`, `strategy=${input.strategy}`],
      });
      return { visualTreatment: "gallery_grid", emphasis: "neutral", confidence: 0.84, rationale: r };
    }
    r.push({
      code: "GALLERY_FEATURED_GRID",
      summary: "Gallery uses featured+grid treatment for lighter media sections.",
      basedOn: [`childElementCount=${input.section.childElementCount}`],
    });
    return { visualTreatment: "gallery_featured_grid", emphasis: "neutral", confidence: 0.72, rationale: r };
  }

  if (input.semanticType === "header") {
    r.push({
      code: "HEADER_COMPACT",
      summary: "Header uses compact treatment for deterministic navigation clarity.",
      basedOn: ["semanticType=header"],
    });
    return { visualTreatment: "header_compact", emphasis: "neutral", confidence: 0.88, rationale: r };
  }

  if (input.semanticType === "footer") {
    if (input.section.childElementCount >= 4) {
      r.push({
        code: "FOOTER_MULTI_COLUMN",
        summary: "Footer uses multi-column treatment because section has multiple child groups.",
        basedOn: [`childElementCount=${input.section.childElementCount}`],
      });
      return { visualTreatment: "footer_multi_column", emphasis: "neutral", confidence: 0.8, rationale: r };
    }
    r.push({
      code: "FOOTER_COMPACT",
      summary: "Footer uses compact treatment for low-density footer content.",
      basedOn: [`childElementCount=${input.section.childElementCount}`],
    });
    return { visualTreatment: "footer_compact", emphasis: "neutral", confidence: 0.74, rationale: r };
  }

  r.push({
    code: "GENERIC_BALANCED_FALLBACK",
    summary: "Generic balanced treatment selected due to low semantic confidence.",
    basedOn: ["semanticType=unknown"],
  });
  return { visualTreatment: "generic_balanced", emphasis: "neutral", confidence: 0.5, rationale: r };
}

function componentVariantsFromDecisions(decisions: SectionDecision[]): ComponentVariantMap {
  const hero = decisions.find((d) => d.semanticType === "hero")?.visualTreatment ?? "hero_centered";
  const cta = decisions.find((d) => d.semanticType === "cta" && d.emphasis === "primary")?.visualTreatment ??
    decisions.find((d) => d.semanticType === "cta")?.visualTreatment ??
    "cta_inline";
  const content = decisions.find((d) => d.semanticType === "content")?.visualTreatment ?? "content_two_column";
  const gallery = decisions.find((d) => d.semanticType === "gallery")?.visualTreatment ?? "gallery_grid";
  const footer = decisions.find((d) => d.semanticType === "footer")?.visualTreatment ?? "footer_compact";

  return {
    hero: hero === "hero_split" ? "split" : hero === "hero_image_first" ? "image_first" : "centered",
    cta: cta === "cta_emphasized" ? "emphasized" : cta === "cta_secondary" ? "secondary" : "inline",
    content: content === "readable_single_column" ? "single_column" : "two_column",
    gallery: gallery === "gallery_featured_grid" ? "featured_grid" : "grid",
    footer: footer === "footer_multi_column" ? "multi_column" : "compact",
  };
}

function typographyFromStrategy(strategy: LayoutStrategy, styleSignals: StyleSignalModel): DesignModel["typographyScale"] {
  if (styleSignals.typography.scaleHint === "large" || styleSignals.cta.prominence === "high") {
    return { profile: "marketing", headingScale: "large", bodyScale: "regular" };
  }
  if (
    styleSignals.typography.headingCategory === "serif" ||
    styleSignals.visualToneHint === "premium" ||
    styleSignals.visualToneHint === "editorial"
  ) {
    return { profile: "readable", headingScale: "regular", bodyScale: "relaxed" };
  }
  if (strategy === "editorial_readable") return { profile: "readable", headingScale: "regular", bodyScale: "relaxed" };
  if (strategy === "cta_focused") return { profile: "marketing", headingScale: "large", bodyScale: "regular" };
  return { profile: "balanced", headingScale: "regular", bodyScale: "regular" };
}

function spacingFromStrategy(
  strategy: LayoutStrategy,
  pageType: PageType,
  visualObservation: VisualPageObservation | null | undefined,
  styleSignals: StyleSignalModel,
): DesignModel["spacingScale"] {
  if (styleSignals.spacing.rhythm !== "unknown" || styleSignals.spacing.sectionSpacingHint !== "unknown") {
    if (styleSignals.spacing.rhythm === "tight" || styleSignals.spacing.layoutDensity === "dense") {
      return { rhythm: "dense", sectionGap: "sm", contentGap: "sm" };
    }
    if (styleSignals.spacing.rhythm === "airy" || styleSignals.spacing.layoutDensity === "airy") {
      return { rhythm: "airy", sectionGap: "lg", contentGap: "md" };
    }
  }

  if (visualObservation && visualObservation.confidence !== "low") {
    if (visualObservation.spacingRhythm === "tight" || visualObservation.readabilityTendency === "dense") {
      return { rhythm: "calm", sectionGap: "lg", contentGap: "lg" };
    }
    if (visualObservation.spacingRhythm === "airy" || visualObservation.readabilityTendency === "calm") {
      return { rhythm: "airy", sectionGap: "lg", contentGap: "md" };
    }
  }
  if (strategy === "visual_gallery") return { rhythm: "airy", sectionGap: "lg", contentGap: "md" };
  if (strategy === "editorial_readable") return { rhythm: "calm", sectionGap: "md", contentGap: "lg" };
  if (strategy === "cta_focused") return { rhythm: "balanced", sectionGap: "md", contentGap: "sm" };
  if (pageType === "about") return { rhythm: "calm", sectionGap: "md", contentGap: "md" };
  return { rhythm: "balanced", sectionGap: "md", contentGap: "md" };
}

function colorSystemFromPage(page: DesignPageInput, styleSignals: StyleSignalModel): DesignModel["colorSystem"] {
  const primary = styleSignals.colors.primaryAccent ?? page.brandSignals.primaryColorHint;
  const secondary = styleSignals.colors.secondaryAccent ?? page.brandSignals.secondaryColorHint;
  const tone = styleSignals.visualToneHint === "playful" || page.brandSignals.visualTone === "playful"
    ? "energetic"
    : styleSignals.visualToneHint === "premium" || styleSignals.visualToneHint === "editorial" || page.brandSignals.visualTone === "formal"
    ? "calm"
    : page.ctaCandidateCount >= 3
    ? "energetic"
    : page.contentDensity >= 0.6
    ? "calm"
    : "neutral";

  return {
    mode: primary || secondary ? "source_derived" : "neutral_fallback",
    tone,
    primaryHint: primary,
    secondaryHint: secondary,
  };
}

function emptyAiMergeResult(status: AiSuggestionMergeResult["status"], reason: string): AiSuggestionMergeResult {
  return {
    status,
    suggestion: null,
    acceptedCount: 0,
    rejectedCount: 0,
    ignoredCount: 1,
    decisions: [
      {
        target: "page_strategy",
        sectionId: null,
        status: "ignored",
        reasonCode: status === "unavailable" ? "AI_SUGGESTION_UNAVAILABLE" : "AI_SUGGESTION_NOT_APPLICABLE",
        message: reason,
      },
    ],
    rationale: [
      {
        code: status === "unavailable" ? "AI_DESIGN_ASSIST_UNAVAILABLE" : "AI_DESIGN_ASSIST_NOT_APPLIED",
        summary: reason,
        basedOn: ["deterministic_fallback=true"],
      },
    ],
  };
}

function visualSummaryFromInput(visual: VisualAnalysisModel | null | undefined): DesignModel["visualAnalysis"] {
  if (!visual) {
    return {
      status: "unavailable",
      confidence: "low",
      dominantVisualStyleFamily: "unknown",
      heroProminence: "medium",
      visualDensity: "medium",
      spacingRhythm: "balanced",
      readabilityTendency: "balanced",
      imageTextBalance: "balanced",
      ctaProminence: "medium",
      diagnostics: ["VISUAL_ANALYSIS_UNAVAILABLE"],
    };
  }

  return {
    status: visual.status,
    confidence: visual.confidence,
    dominantVisualStyleFamily: visual.pageObservations.dominantVisualStyleFamily,
    heroProminence: visual.pageObservations.heroProminence,
    visualDensity: visual.pageObservations.visualDensity,
    spacingRhythm: visual.pageObservations.spacingRhythm,
    readabilityTendency: visual.pageObservations.readabilityTendency,
    imageTextBalance: visual.pageObservations.imageTextBalance,
    ctaProminence: visual.pageObservations.ctaProminence,
    diagnostics: uniqueSortedStrings(visual.diagnostics.map((d) => d.code)),
  };
}

function safeDefaultModel(input: DesignIntelligenceInput, message: string): DesignModel {
  const entryPage = input.pages.find((p) => p.isEntry) ?? input.pages[0] ?? null;
  const styleSignals = input.styleSignals ?? extractStyleSignalModel({});

  return {
    kind: "design_model_v1",
    version: DESIGN_MODEL_VERSION,
    source: input.preparedSite,
    status: "ready_with_warnings",
    pageType: "unknown",
    layoutStrategy: "corporate_balanced",
    pageStrategies: input.pages.map((p) => ({
      pageId: p.pageId,
      sourcePath: p.sourcePath,
      pageType: "unknown",
      layoutStrategy: "corporate_balanced",
      confidence: 0.4,
    })),
    sectionDecisions: [],
    typographyScale: { profile: "balanced", headingScale: "regular", bodyScale: "regular" },
    spacingScale: { rhythm: "balanced", sectionGap: "md", contentGap: "md" },
    colorSystem: {
      mode: entryPage?.brandSignals.primaryColorHint ? "source_derived" : "neutral_fallback",
      tone: "neutral",
      primaryHint: entryPage?.brandSignals.primaryColorHint ?? null,
      secondaryHint: entryPage?.brandSignals.secondaryColorHint ?? null,
    },
    componentVariants: {
      hero: "centered",
      cta: "inline",
      content: "two_column",
      gallery: "grid",
      footer: "compact",
    },
    rationale: [
      {
        code: "DESIGN_DEFAULT_SAFE_FALLBACK",
        summary: "Design Intelligence fell back to deterministic defaults due to weak or ambiguous structure.",
        basedOn: [message],
      },
    ],
    aiAssistance: {
      enabled: false,
      status: "unavailable",
      acceptedCount: 0,
      rejectedCount: 0,
      ignoredCount: 1,
      mergeDecisions: [
        {
          target: "page_strategy",
          sectionId: null,
          status: "ignored",
          reasonCode: "AI_SUGGESTION_UNAVAILABLE",
          message: "AI suggestion layer was not run because deterministic fallback was triggered.",
        },
      ],
      rationale: ["AI suggestion layer unavailable; deterministic fallback retained."],
    },
    visualAnalysis: visualSummaryFromInput(input.visualAnalysis ?? null),
    styleSignals,
    diagnostics: {
      codes: ["DESIGN_INTELLIGENCE_DEFAULTED", "AI_DESIGN_SUGGESTION_UNAVAILABLE"],
      issues: [
        {
          code: "DESIGN_INTELLIGENCE_DEFAULTED",
          severity: "warning",
          message,
          pageId: entryPage?.pageId ?? null,
        },
        {
          code: "AI_DESIGN_SUGGESTION_UNAVAILABLE",
          severity: "info",
          message: "AI suggestion layer skipped because deterministic fallback was used.",
          pageId: entryPage?.pageId ?? null,
        },
      ],
    },
  };
}

function toDeterministicModel(input: DesignIntelligenceInput): DesignModel {
  if (input.pages.length === 0) {
    return safeDefaultModel(input, "No pages available for design classification.");
  }

  const diagnostics: DesignIntelligenceDiagnostic[] = [];
  const styleSignals = input.styleSignals ?? extractStyleSignalModel({});
  const modelRationale: DesignRationale[] = [];
  const pageStrategies: DesignModel["pageStrategies"] = [];
  const sectionDecisions: SectionDecision[] = [];
  const visualByPageId = new Map((input.visualAnalysis?.pageObservationsByPage ?? []).map((v) => [v.pageId, v]));

  for (const page of input.pages) {
    for (const semanticDiagnostic of page.semanticDiagnostics) {
      diagnostics.push({
        code: "DESIGN_INTELLIGENCE_LOW_CONFIDENCE",
        severity: semanticDiagnostic.severity === "warning" ? "warning" : "info",
        message: `Semantic diagnostic (${semanticDiagnostic.code}): ${semanticDiagnostic.message}`,
        pageId: page.pageId,
      });
    }

    const inferredPageType = inferPageType(page);
    const visualObservation = visualByPageId.get(page.pageId) ?? null;
    const strategy = pickStrategy({ page, pageType: inferredPageType.pageType, visualObservation, styleSignals });

    pageStrategies.push({
      pageId: page.pageId,
      sourcePath: page.sourcePath,
      pageType: inferredPageType.pageType,
      layoutStrategy: strategy.strategy,
      confidence: Number(Math.min(inferredPageType.confidence, strategy.confidence).toFixed(3)),
    });
    modelRationale.push(strategy.rationale);

    if (page.sections.length === 0) {
      diagnostics.push({
        code: "DESIGN_INTELLIGENCE_DEFAULTED",
        severity: "warning",
        message: "No section candidates found; using safe defaults for this page.",
        pageId: page.pageId,
      });
      continue;
    }

    if (inferredPageType.confidence < 0.55 || strategy.confidence < 0.55) {
      diagnostics.push({
        code: "DESIGN_INTELLIGENCE_LOW_CONFIDENCE",
        severity: "info",
        message: "Low confidence classification detected; deterministic fallback strategy retained.",
        pageId: page.pageId,
      });
    }

    const ctaSections = page.sections.filter((s) => s.ctaCandidateCount > 0 || s.sourceDomPath.toLowerCase().includes("cta"));
    const ctaPrimary = ctaSections
      .slice()
      .sort((a, b) => {
        if (a.ctaCandidateCount !== b.ctaCandidateCount) return b.ctaCandidateCount - a.ctaCandidateCount;
        return a.ordinalIndex - b.ordinalIndex;
      })[0] ?? null;

    for (const section of page.sections) {
      const semanticType = inferSemanticType(section);
      const picked = pickSectionTreatment({
        semanticType,
        section,
        strategy: strategy.strategy,
        ctaPrimarySectionId: ctaPrimary?.sectionId ?? null,
        styleSignals,
      });

      sectionDecisions.push({
        sectionId: section.sectionId,
        pageId: section.pageId,
        sourceDomPath: section.sourceDomPath,
        ordinalIndex: section.ordinalIndex,
        semanticType,
        visualTreatment: picked.visualTreatment,
        emphasis: picked.emphasis,
        confidence: Number(picked.confidence.toFixed(3)),
        rationale: picked.rationale,
      });
    }
  }

  const orderedPageStrategies = pageStrategies.slice().sort((a, b) => {
    if (a.sourcePath !== b.sourcePath) return stringCmp(a.sourcePath, b.sourcePath);
    if (a.pageId !== b.pageId) return stringCmp(a.pageId, b.pageId);
    return 0;
  });

  const primaryPage = orderedPageStrategies.find((p) => input.pages.find((page) => page.pageId === p.pageId)?.isEntry) ?? orderedPageStrategies[0]!;

  const orderedSectionDecisions = sectionDecisions.slice().sort((a, b) => {
    if (a.pageId !== b.pageId) return stringCmp(a.pageId, b.pageId);
    if (a.ordinalIndex !== b.ordinalIndex) return a.ordinalIndex - b.ordinalIndex;
    return stringCmp(a.sectionId, b.sectionId);
  });

  const primaryPageInput = input.pages.find((p) => p.pageId === primaryPage.pageId) ?? input.pages[0]!;
  const primaryPageVisual = visualByPageId.get(primaryPage.pageId) ?? input.visualAnalysis?.pageObservationsByPage[0] ?? null;
  const globalStrategy = primaryPage.layoutStrategy;
  const globalPageType = primaryPage.pageType;

  if (orderedSectionDecisions.length === 0) {
    diagnostics.push({
      code: "DESIGN_INTELLIGENCE_DEFAULTED",
      severity: "warning",
      message: "No section decisions produced; fallback variants were emitted.",
      pageId: primaryPage.pageId,
    });
  }

  for (const visualDiagnostic of input.visualAnalysis?.diagnostics ?? []) {
    diagnostics.push({
      code: visualDiagnostic.code,
      severity: visualDiagnostic.severity,
      message: visualDiagnostic.message,
      pageId: visualDiagnostic.pageId,
    });
  }

  const diagnosticCodes = uniqueSortedStrings(diagnostics.map((d) => d.code));
  const status: DesignModel["status"] = diagnostics.some((d) => d.severity === "warning") ? "ready_with_warnings" : "ready";

  return {
    kind: "design_model_v1",
    version: DESIGN_MODEL_VERSION,
    source: input.preparedSite,
    status,
    pageType: globalPageType,
    layoutStrategy: globalStrategy,
    pageStrategies: orderedPageStrategies,
    sectionDecisions: orderedSectionDecisions,
    typographyScale: typographyFromStrategy(globalStrategy, styleSignals),
    spacingScale: spacingFromStrategy(globalStrategy, globalPageType, primaryPageVisual, styleSignals),
    colorSystem: colorSystemFromPage(primaryPageInput, styleSignals),
    componentVariants: componentVariantsFromDecisions(orderedSectionDecisions),
    rationale: modelRationale,
    aiAssistance: {
      enabled: false,
      status: "unavailable",
      acceptedCount: 0,
      rejectedCount: 0,
      ignoredCount: 1,
      mergeDecisions: [
        {
          target: "page_strategy",
          sectionId: null,
          status: "ignored",
          reasonCode: "AI_SUGGESTION_UNAVAILABLE",
          message: "AI suggestion layer not enabled for this run.",
        },
      ],
      rationale: ["AI suggestion layer disabled; deterministic model retained."],
    },
    visualAnalysis: visualSummaryFromInput(input.visualAnalysis ?? null),
    styleSignals,
    diagnostics: {
      codes: diagnosticCodes,
      issues: diagnostics,
    },
  };
}

function buildAiSuggestionInput(input: DesignIntelligenceInput, deterministic: DesignModel): AiDesignSuggestionInput {
  const primaryHints = uniqueSortedStrings(
    input.pages.map((p) => p.brandSignals.primaryColorHint).filter((v): v is string => Boolean(v && v.trim().length > 0)),
  );
  const secondaryHints = uniqueSortedStrings(
    input.pages.map((p) => p.brandSignals.secondaryColorHint).filter((v): v is string => Boolean(v && v.trim().length > 0)),
  );
  const typographyHints = uniqueSortedStrings(
    input.pages.map((p) => p.brandSignals.typographyHint).filter((v): v is string => Boolean(v && v.trim().length > 0)),
  );

  const sectionDecisionById = new Map(deterministic.sectionDecisions.map((d) => [d.sectionId, d]));

  return {
    kind: "ai_design_suggestion_input_v1",
    preparedSiteFingerprint: sha256Hex(stableStringify(input.preparedSite.fingerprints)),
    pages: input.pages.map((page) => {
      const pageTypeGuess = inferPageType(page).pageType;
      const deterministicStrategy = deterministic.pageStrategies.find((p) => p.pageId === page.pageId)?.layoutStrategy ?? null;

      return {
        pageId: page.pageId,
        sourcePath: page.sourcePath,
        isEntry: page.isEntry,
        pageTypeGuess,
        contentDensity: page.contentDensity,
        visualDensity: page.visualDensity,
        ctaCandidateCount: page.ctaCandidateCount,
        deterministicStrategy,
        sectionSummaries: page.sections.map((section) => {
          const deterministicDecision = sectionDecisionById.get(section.sectionId) ?? null;
          return {
            sectionId: section.sectionId,
            pageId: section.pageId,
            sourceDomPath: section.sourceDomPath,
            ordinalIndex: section.ordinalIndex,
            semanticGuess: inferSemanticType(section),
            textDensity: section.textDensity,
            mediaDensity: section.mediaCount > 0 ? 1 : 0,
            ctaCandidates: section.ctaCandidateCount,
            deterministicDecision:
              deterministicDecision === null
                ? null
                : {
                    semanticType: deterministicDecision.semanticType,
                    visualTreatment: deterministicDecision.visualTreatment,
                    emphasis: deterministicDecision.emphasis,
                    confidence: deterministicDecision.confidence,
                  },
          };
        }),
      };
    }),
    brandSignalSummary: {
      primaryColorHints: primaryHints,
      secondaryColorHints: secondaryHints,
      typographyHints,
    },
    deterministicBaseline: {
      pageType: deterministic.pageType,
      layoutStrategy: deterministic.layoutStrategy,
      sectionDecisionCount: deterministic.sectionDecisions.length,
    },
  };
}

function normalizeAiSuggestion(raw: AiDesignSuggestion | null): AttemptedAiSuggestion {
  if (raw === null) {
    return {
      status: "no_suggestion",
      suggestion: null,
      reason: "AI provider returned no suggestion payload.",
    };
  }

  const asUnknown = raw as unknown as {
    kind?: unknown;
    version?: unknown;
    sectionSuggestions?: unknown;
    confidence?: { overall?: unknown };
  };

  if (
    asUnknown.kind !== "ai_design_suggestion_v1" ||
    typeof asUnknown.version !== "string" ||
    !Array.isArray(asUnknown.sectionSuggestions) ||
    !isAiSuggestionConfidence(asUnknown.confidence?.overall)
  ) {
    return {
      status: "malformed",
      suggestion: null,
      reason: "AI provider returned malformed suggestion payload; deterministic baseline retained.",
    };
  }

  return {
    status: "suggested",
    suggestion: raw,
    reason: "AI suggestion payload accepted for merge validation.",
  };
}

function attemptAiSuggestion(input: {
  enabled: boolean;
  service: DesignIntelligenceAiSuggestionService | null;
  suggestionInput: AiDesignSuggestionInput;
}): AttemptedAiSuggestion {
  if (!input.enabled || !input.service) {
    return {
      status: "unavailable",
      suggestion: null,
      reason: "AI suggestion service unavailable; deterministic baseline retained.",
    };
  }

  try {
    return normalizeAiSuggestion(input.service.requestAiDesignSuggestions(input.suggestionInput));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown_ai_suggestion_error";
    return {
      status: "unavailable",
      suggestion: null,
      reason: `AI suggestion request failed (${msg}); deterministic baseline retained.`,
    };
  }
}

function makeDecision(input: {
  target: AiSuggestionMergeDecision["target"];
  sectionId: string | null;
  status: AiSuggestionMergeDecision["status"];
  reasonCode: AiSuggestionMergeDecision["reasonCode"];
  message: string;
}): AiSuggestionMergeDecision {
  return {
    target: input.target,
    sectionId: input.sectionId,
    status: input.status,
    reasonCode: input.reasonCode,
    message: input.message,
  };
}

function appendDecisionRationale(decisions: AiSuggestionMergeDecision[]): DesignRationale[] {
  return decisions.map((decision, idx) => ({
    code: `AI_MERGE_${String(idx + 1).padStart(2, "0")}_${decision.reasonCode}`,
    summary: decision.message,
    basedOn: [
      `target=${decision.target}`,
      `sectionId=${decision.sectionId ?? "page"}`,
      `status=${decision.status}`,
      `reasonCode=${decision.reasonCode}`,
    ],
  }));
}

function shouldAllowSectionSuggestion(input: {
  suggestion: AiSectionSuggestion;
  baseline: SectionDecision;
}): { allowed: boolean; reason: string } {
  const confidenceRank = CONFIDENCE_RANK[input.suggestion.confidence];
  if (confidenceRank <= CONFIDENCE_RANK.low) return { allowed: false, reason: "AI section suggestion confidence is low." };
  if (input.suggestion.confidence === "medium" && input.baseline.confidence > 0.72) {
    return {
      allowed: false,
      reason: "AI section suggestion confidence is medium and deterministic baseline confidence is already high.",
    };
  }
  return { allowed: true, reason: "AI confidence is eligible for deterministic merge." };
}

function mergeAiSuggestion(input: {
  deterministic: DesignModel;
  attempted: AttemptedAiSuggestion;
}): {
  merge: AiSuggestionMergeResult;
  finalModel: DesignModel;
  additionalDiagnostics: DesignIntelligenceDiagnostic[];
} {
  const baseline = input.deterministic;

  if (input.attempted.status === "unavailable") {
    const merge = emptyAiMergeResult("unavailable", input.attempted.reason);
    return {
      merge,
      finalModel: {
        ...baseline,
        aiAssistance: {
          enabled: false,
          status: merge.status,
          acceptedCount: merge.acceptedCount,
          rejectedCount: merge.rejectedCount,
          ignoredCount: merge.ignoredCount,
          mergeDecisions: merge.decisions,
          rationale: merge.rationale.map((r) => r.summary),
        },
      },
      additionalDiagnostics: [
        {
          code: "AI_DESIGN_SUGGESTION_UNAVAILABLE",
          severity: "warning",
          message: input.attempted.reason,
          pageId: null,
        },
      ],
    };
  }

  if (input.attempted.status === "malformed") {
    const merge = {
      ...emptyAiMergeResult("rejected", input.attempted.reason),
      decisions: [
        makeDecision({
          target: "page_strategy",
          sectionId: null,
          status: "rejected",
          reasonCode: "AI_SUGGESTION_MALFORMED",
          message: input.attempted.reason,
        }),
      ],
      rejectedCount: 1,
      ignoredCount: 0,
    } satisfies AiSuggestionMergeResult;

    return {
      merge: { ...merge, rationale: appendDecisionRationale(merge.decisions) },
      finalModel: {
        ...baseline,
        aiAssistance: {
          enabled: true,
          status: merge.status,
          acceptedCount: merge.acceptedCount,
          rejectedCount: merge.rejectedCount,
          ignoredCount: merge.ignoredCount,
          mergeDecisions: merge.decisions,
          rationale: appendDecisionRationale(merge.decisions).map((r) => r.summary),
        },
      },
      additionalDiagnostics: [
        {
          code: "AI_DESIGN_SUGGESTION_MALFORMED",
          severity: "warning",
          message: input.attempted.reason,
          pageId: null,
        },
      ],
    };
  }

  if (input.attempted.status === "no_suggestion") {
    const merge = emptyAiMergeResult("no_suggestion", input.attempted.reason);
    return {
      merge,
      finalModel: {
        ...baseline,
        aiAssistance: {
          enabled: true,
          status: merge.status,
          acceptedCount: merge.acceptedCount,
          rejectedCount: merge.rejectedCount,
          ignoredCount: merge.ignoredCount,
          mergeDecisions: merge.decisions,
          rationale: merge.rationale.map((r) => r.summary),
        },
      },
      additionalDiagnostics: [],
    };
  }

  const suggestion = input.attempted.suggestion!;
  const decisions: AiSuggestionMergeDecision[] = [];
  let acceptedCount = 0;
  let rejectedCount = 0;
  let ignoredCount = 0;

  let mergedLayoutStrategy = baseline.layoutStrategy;
  const mergedPageStrategies = baseline.pageStrategies.map((p) => ({ ...p }));
  const mergedSectionDecisions = baseline.sectionDecisions.map((s) => ({ ...s, rationale: [...s.rationale] }));
  const sectionById = new Map(mergedSectionDecisions.map((s) => [s.sectionId, s]));

  const overallConfidence = suggestion.confidence.overall;
  if (!isAllowedValue(suggestion.pageStrategySuggestion, ALLOWED_LAYOUT_STRATEGIES)) {
    if (typeof suggestion.pageStrategySuggestion === "string") {
      decisions.push(
        makeDecision({
          target: "page_strategy",
          sectionId: null,
          status: "rejected",
          reasonCode: "AI_SUGGESTION_UNKNOWN_VALUE",
          message: `AI page strategy '${suggestion.pageStrategySuggestion}' is not recognized and was rejected.`,
        }),
      );
      rejectedCount++;
    }
  } else if (overallConfidence === "high") {
    mergedLayoutStrategy = suggestion.pageStrategySuggestion;
    const primary = mergedPageStrategies.find((p) => p.layoutStrategy === baseline.layoutStrategy) ?? mergedPageStrategies[0] ?? null;
    if (primary) primary.layoutStrategy = suggestion.pageStrategySuggestion;
    decisions.push(
      makeDecision({
        target: "page_strategy",
        sectionId: null,
        status: "accepted",
        reasonCode: "AI_SUGGESTION_ACCEPTED",
        message: `Accepted AI page strategy '${suggestion.pageStrategySuggestion}' with high confidence.`,
      }),
    );
    acceptedCount++;
  } else {
    decisions.push(
      makeDecision({
        target: "page_strategy",
        sectionId: null,
        status: "ignored",
        reasonCode: "AI_SUGGESTION_LOW_CONFIDENCE",
        message: "Ignored AI page strategy suggestion because overall confidence is not high.",
      }),
    );
    ignoredCount++;
  }

  for (const sectionSuggestion of suggestion.sectionSuggestions) {
    const target = sectionById.get(sectionSuggestion.sectionId);
    if (!target) {
      decisions.push(
        makeDecision({
          target: "section",
          sectionId: sectionSuggestion.sectionId,
          status: "rejected",
          reasonCode: "AI_SUGGESTION_UNKNOWN_SECTION",
          message: `AI suggested section '${sectionSuggestion.sectionId}', which does not exist in deterministic section decisions.`,
        }),
      );
      rejectedCount++;
      continue;
    }

    const allow = shouldAllowSectionSuggestion({ suggestion: sectionSuggestion, baseline: target });
    if (!allow.allowed) {
      decisions.push(
        makeDecision({
          target: "section",
          sectionId: sectionSuggestion.sectionId,
          status: "ignored",
          reasonCode: "AI_SUGGESTION_LOW_CONFIDENCE",
          message: allow.reason,
        }),
      );
      ignoredCount++;
      continue;
    }

    let semanticType = target.semanticType;
    if (sectionSuggestion.semanticTypeSuggestion !== undefined) {
      if (!isAllowedValue(sectionSuggestion.semanticTypeSuggestion, ALLOWED_SEMANTIC_TYPES)) {
        decisions.push(
          makeDecision({
            target: "section",
            sectionId: sectionSuggestion.sectionId,
            status: "rejected",
            reasonCode: "AI_SUGGESTION_UNKNOWN_VALUE",
            message: `AI semantic suggestion '${String(sectionSuggestion.semanticTypeSuggestion)}' is not recognized.`,
          }),
        );
        rejectedCount++;
        continue;
      }
      if (target.semanticType !== "unknown" && target.semanticType !== sectionSuggestion.semanticTypeSuggestion) {
        decisions.push(
          makeDecision({
            target: "section",
            sectionId: sectionSuggestion.sectionId,
            status: "rejected",
            reasonCode: "AI_SUGGESTION_CONFLICT_WITH_STRUCTURE",
            message: "AI semantic suggestion conflicts with deterministic structural classification.",
          }),
        );
        rejectedCount++;
        continue;
      }
      semanticType = sectionSuggestion.semanticTypeSuggestion;
    }

    if (sectionSuggestion.visualTreatmentSuggestion !== undefined) {
      if (!isAllowedValue(sectionSuggestion.visualTreatmentSuggestion, ALLOWED_VISUAL_TREATMENTS)) {
        decisions.push(
          makeDecision({
            target: "section",
            sectionId: sectionSuggestion.sectionId,
            status: "rejected",
            reasonCode: "AI_SUGGESTION_UNKNOWN_VALUE",
            message: `AI visual treatment '${String(sectionSuggestion.visualTreatmentSuggestion)}' is not recognized.`,
          }),
        );
        rejectedCount++;
        continue;
      }
      const allowedTreatments = ALLOWED_TREATMENTS_BY_SEMANTIC[semanticType];
      if (!allowedTreatments.includes(sectionSuggestion.visualTreatmentSuggestion)) {
        decisions.push(
          makeDecision({
            target: "section",
            sectionId: sectionSuggestion.sectionId,
            status: "rejected",
            reasonCode: "AI_SUGGESTION_CONFLICT_WITH_STRUCTURE",
            message: `AI visual treatment '${sectionSuggestion.visualTreatmentSuggestion}' is not valid for semantic type '${semanticType}'.`,
          }),
        );
        rejectedCount++;
        continue;
      }
      target.visualTreatment = sectionSuggestion.visualTreatmentSuggestion;
    }

    if (sectionSuggestion.emphasisSuggestion !== undefined) {
      if (!isAllowedValue(sectionSuggestion.emphasisSuggestion, ALLOWED_EMPHASIS)) {
        decisions.push(
          makeDecision({
            target: "section",
            sectionId: sectionSuggestion.sectionId,
            status: "rejected",
            reasonCode: "AI_SUGGESTION_UNKNOWN_VALUE",
            message: `AI emphasis '${String(sectionSuggestion.emphasisSuggestion)}' is not recognized.`,
          }),
        );
        rejectedCount++;
        continue;
      }
      target.emphasis = sectionSuggestion.emphasisSuggestion;
    }

    target.semanticType = semanticType;
    target.rationale = [
      ...target.rationale,
      {
        code: "AI_SECTION_SUGGESTION_ACCEPTED",
        summary: "Applied AI section suggestion after deterministic merge validation.",
        basedOn: [
          `confidence=${sectionSuggestion.confidence}`,
          `rationale=${sectionSuggestion.rationale.join(" | ") || "none"}`,
        ],
      },
    ];

    decisions.push(
      makeDecision({
        target: "section",
        sectionId: sectionSuggestion.sectionId,
        status: "accepted",
        reasonCode: "AI_SUGGESTION_ACCEPTED",
        message: `Accepted AI suggestion for section '${sectionSuggestion.sectionId}'.`,
      }),
    );
    acceptedCount++;
  }

  const mergeRationale = appendDecisionRationale(decisions);
  const mergeStatus: AiSuggestionMergeResult["status"] =
    acceptedCount > 0 ? "merged" : rejectedCount > 0 ? "rejected" : "suggested";

  const merge: AiSuggestionMergeResult = {
    status: mergeStatus,
    suggestion,
    acceptedCount,
    rejectedCount,
    ignoredCount,
    decisions,
    rationale: mergeRationale,
  };

  const finalModel: DesignModel = {
    ...baseline,
    layoutStrategy: mergedLayoutStrategy,
    pageStrategies: mergedPageStrategies,
    sectionDecisions: mergedSectionDecisions,
    typographyScale: typographyFromStrategy(mergedLayoutStrategy, baseline.styleSignals),
    spacingScale: spacingFromStrategy(mergedLayoutStrategy, baseline.pageType, null, baseline.styleSignals),
    componentVariants: componentVariantsFromDecisions(mergedSectionDecisions),
    rationale: [...baseline.rationale, ...mergeRationale],
    aiAssistance: {
      enabled: true,
      status: merge.status,
      acceptedCount,
      rejectedCount,
      ignoredCount,
      mergeDecisions: decisions,
      rationale: mergeRationale.map((r) => r.summary),
    },
  };

  const additionalDiagnostics: DesignIntelligenceDiagnostic[] = [];
  if (acceptedCount > 0) {
    additionalDiagnostics.push({
      code: "AI_DESIGN_SUGGESTION_ACCEPTED",
      severity: "info",
      message: `Accepted ${acceptedCount} AI design suggestion(s).`,
      pageId: null,
    });
  }
  if (rejectedCount > 0) {
    additionalDiagnostics.push({
      code: "AI_DESIGN_SUGGESTION_REJECTED",
      severity: "info",
      message: `Rejected ${rejectedCount} AI design suggestion(s).`,
      pageId: null,
    });
  }
  if (ignoredCount > 0) {
    additionalDiagnostics.push({
      code: "AI_DESIGN_SUGGESTION_LOW_CONFIDENCE",
      severity: "info",
      message: `Ignored ${ignoredCount} AI design suggestion(s) due to confidence policy or non-applicability.`,
      pageId: null,
    });
  }

  return {
    merge,
    finalModel,
    additionalDiagnostics,
  };
}

function finalizeWithDiagnostics(model: DesignModel, addedDiagnostics: DesignIntelligenceDiagnostic[]): DesignModel {
  const issues = [...model.diagnostics.issues, ...addedDiagnostics];
  const codes = uniqueSortedStrings(issues.map((d) => d.code));
  const hasWarning = issues.some((d) => d.severity === "warning");
  return {
    ...model,
    status: hasWarning ? "ready_with_warnings" : "ready",
    diagnostics: {
      codes,
      issues,
    },
  };
}

export function createDesignIntelligenceInputFromPreparedSite(preparedSite: PreparedSiteModel): DesignIntelligenceInput {
  const pages: DesignPageInput[] = [];

  const docs = [...preparedSite.documents].sort((a, b) => {
    if (a.path !== b.path) return stringCmp(a.path, b.path);
    if (a.id !== b.id) return stringCmp(a.id, b.id);
    return 0;
  });

  for (const doc of docs) {
    let sections: DesignSemanticSectionInput[];

    if (doc.semantic && doc.semantic.sections.length > 0) {
      const outlineIndex = new Map(
        flattenOutlineElements(doc.domOutline?.bodyChildElements ?? []).map((candidate) => [candidate.domPath, candidate]),
      );
      sections = doc.semantic.sections.map((section) => {
        const sourceDomPaths = section.sourceDomPaths.length > 0 ? section.sourceDomPaths : [section.sourceDomPath];
        const source = sourceDomPaths.map((path) => outlineIndex.get(path) ?? null).find((value) => value !== null) ?? null;
        const mergedTextExcerpt = sourceDomPaths
          .map((path) => outlineIndex.get(path)?.textExcerpt ?? "")
          .filter((value) => value.trim().length > 0)
          .join(" ")
          .trim();
        const textExcerpt =
          source?.textExcerpt ??
          (mergedTextExcerpt.length > 0 ? mergedTextExcerpt : null);
        const sectionHasHeadingSignal = source
          ? hasHeadingSignal({
              sourceTagName: source.tagName,
              textExcerpt: source.textExcerpt,
              ordinalIndex: source.ordinalIndex,
            })
          : section.inferredType === "hero";

        return {
          sectionId: section.sectionId,
          pageId: doc.id,
          sourceDomPath: section.sourceDomPath,
          sourceTagName: source?.tagName ?? "section",
          ordinalIndex: section.ordinalIndex,
          childElementCount: source?.childElementCount ?? 0,
          textExcerpt,
          directTextPresent: source?.directTextPresent ?? false,
          textDensity: section.density.textDensity,
          mediaCount: Math.max(0, Math.round(section.mediaDensity * 4)),
          ctaCandidateCount: section.ctaCandidates.length,
          hasHeadingSignal: sectionHasHeadingSignal,
          inferredType: section.inferredType,
          semanticConfidence: section.confidence,
          semanticRationale: [...section.rationale, ...section.consolidationRationale],
          heroComposition: section.heroComposition,
          mediaDensity: section.mediaDensity,
          galleryLikeConfidence: section.galleryLikeConfidence,
          readabilityTendency: section.density.readabilityTendency,
        };
      });
    } else {
      const bodyChildren = doc.domOutline?.bodyChildElements ?? [];
      const extracted = extractBlocksFromBodyWithWrapperPromotion({ bodyChildElements: bodyChildren });
      sections = extracted.boundaryChildren.map((child) => toSectionInput(doc.id, child));
    }

    sections = sections.sort((a, b) => {
      if (a.ordinalIndex !== b.ordinalIndex) return a.ordinalIndex - b.ordinalIndex;
      if (a.sourceDomPath !== b.sourceDomPath) return stringCmp(a.sourceDomPath, b.sourceDomPath);
      return stringCmp(a.sectionId, b.sectionId);
    });

    const textDensityAvg = sections.length > 0 ? sections.reduce((sum, s) => sum + s.textDensity, 0) / sections.length : 0;
    const mediaCount = sections.reduce((sum, s) => sum + s.mediaCount, 0);
    const visualDensity = sections.length > 0 ? Math.min(1, mediaCount / Math.max(1, sections.length)) : 0;
    const ctaCandidateCount = sections.reduce((sum, s) => sum + s.ctaCandidateCount, 0);

    pages.push({
      pageId: doc.id,
      sourcePath: doc.path,
      isEntry: doc.isEntry,
      title: doc.fidelity.title,
      sections,
      contentDensity: Number(textDensityAvg.toFixed(3)),
      visualDensity: Number(visualDensity.toFixed(3)),
      ctaCandidateCount,
      primaryCtaLabel: doc.semantic?.primaryCta?.label ?? null,
      semanticDiagnostics: (doc.semantic?.diagnostics ?? []).map((diagnostic) => ({
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.message,
        sectionId: diagnostic.sectionId,
      })),
      brandSignals: {
        primaryColorHint: doc.semantic?.brandSignals.dominantColors[0] ?? null,
        secondaryColorHint: doc.semantic?.brandSignals.accentColors[0] ?? null,
        typographyHint: doc.fidelity.bodyClass,
        dominantColors: doc.semantic?.brandSignals.dominantColors ?? [],
        accentColors: doc.semantic?.brandSignals.accentColors ?? [],
        neutralPaletteHints: doc.semantic?.brandSignals.neutralPaletteHints ?? [],
        fontFamilyHints: doc.semantic?.brandSignals.fontFamilyHints ?? [],
        fontCategoryHints: doc.semantic?.brandSignals.fontCategoryHints ?? [],
        visualTone: doc.semantic?.brandSignals.visualTone ?? "neutral",
        confidence: doc.semantic?.brandSignals.confidence ?? "low",
        rationale: doc.semantic?.brandSignals.rationale ?? ["brand_signal_fallback"],
      },
    });
  }

  return {
    preparedSite: {
      preparedSiteKind: preparedSite.kind,
      preparedSiteModelVersion: preparedSite.modelVersion,
      importContractVersion: preparedSite.source.importContractVersion,
      importManifestVersion: preparedSite.source.importManifestVersion,
      fingerprints: preparedSite.source.fingerprints,
    },
    pages,
    visualAnalysis: null,
    styleSignals: extractStyleSignalModel({
      preparedSite,
    }),
  };
}

export function createDesignModelFromInput(input: DesignIntelligenceInput): DesignModel {
  return toDeterministicModel(input);
}

export function createDesignIntelligenceResultFromInput(
  input: DesignIntelligenceInput,
  options?: BuildDesignModelOptions,
): DesignIntelligenceBuildResult {
  const enrichedInput: DesignIntelligenceInput = {
    ...input,
    visualAnalysis: options?.visualAnalysis ?? input.visualAnalysis ?? null,
    styleSignals: options?.styleSignals ?? input.styleSignals ?? null,
  };
  const deterministicDesignModel = toDeterministicModel(enrichedInput);
  const suggestionInput = buildAiSuggestionInput(enrichedInput, deterministicDesignModel);
  const attempted = attemptAiSuggestion({
    enabled: options?.enableAiSuggestions ?? Boolean(options?.aiSuggestionService),
    service: options?.aiSuggestionService ?? null,
    suggestionInput,
  });

  const merged = mergeAiSuggestion({ deterministic: deterministicDesignModel, attempted });
  const designModel = finalizeWithDiagnostics(merged.finalModel, merged.additionalDiagnostics);

  return {
    deterministicDesignModel,
    aiSuggestionInput: suggestionInput,
    aiSuggestionMerge: merged.merge,
    designModel,
  };
}

export function createDesignIntelligenceResult(
  preparedSite: PreparedSiteModel,
  options?: BuildDesignModelOptions,
): DesignIntelligenceBuildResult {
  try {
    const input = {
      ...createDesignIntelligenceInputFromPreparedSite(preparedSite),
      styleSignals: options?.styleSignals ?? undefined,
    };
    return createDesignIntelligenceResultFromInput(input, options);
  } catch (error) {
    const input = {
      ...createDesignIntelligenceInputFromPreparedSite(preparedSite),
      visualAnalysis: options?.visualAnalysis ?? null,
      styleSignals: options?.styleSignals ?? undefined,
    };
    const message = error instanceof Error ? error.message : "unknown_design_intelligence_error";
    const fallback = safeDefaultModel(input, `Design Intelligence fallback activated: ${message}`);
    const merge = emptyAiMergeResult("unavailable", "AI suggestion layer was not run because deterministic fallback was activated.");
    return {
      deterministicDesignModel: fallback,
      aiSuggestionInput: buildAiSuggestionInput(input, fallback),
      aiSuggestionMerge: merge,
      designModel: fallback,
    };
  }
}

export function createDesignModel(preparedSite: PreparedSiteModel): DesignModel {
  return createDesignIntelligenceResult(preparedSite).designModel;
}
