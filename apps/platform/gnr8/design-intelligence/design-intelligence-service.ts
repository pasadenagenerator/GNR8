import type { PreparedDocumentRecord, PreparedDomOutlineElement, PreparedSiteModel } from "../migration/prepared-site-model";
import { sha256Hex, stableStringify } from "../migration/runtime/diagnostics";
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

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
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
  };
}

function inferPageType(page: DesignPageInput): { pageType: PageType; confidence: number } {
  const bag = `${page.sourcePath} ${page.title ?? ""}`.toLowerCase();
  if (/about|team|company|mission/.test(bag)) return { pageType: "about", confidence: 0.86 };
  if (/service|consult|agency|solutions/.test(bag)) return { pageType: "services", confidence: 0.82 };
  if (/pricing|product|shop|feature|plan/.test(bag)) return { pageType: "product", confidence: 0.8 };
  if (/landing|campaign/.test(bag)) return { pageType: "landing", confidence: 0.78 };
  if (page.isEntry || page.sourcePath === "index.html") return { pageType: "home", confidence: 0.7 };
  return { pageType: "unknown", confidence: 0.48 };
}

function pickStrategy(input: {
  page: DesignPageInput;
  pageType: PageType;
}): { strategy: LayoutStrategy; confidence: number; rationale: DesignRationale } {
  const heroCandidate = input.page.sections.find((s) => s.ordinalIndex === 0) ?? null;

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
}): {
  visualTreatment: SectionVisualTreatment;
  emphasis: SectionDecision["emphasis"];
  confidence: number;
  rationale: DesignRationale[];
} {
  const r: DesignRationale[] = [];

  if (input.semanticType === "hero") {
    if (input.section.hasHeadingSignal && input.section.mediaCount > 0) {
      r.push({
        code: "HERO_SPLIT_HEADING_WITH_MEDIA",
        summary: "Hero uses split layout because heading and media are both present.",
        basedOn: ["hasHeadingSignal=true", "mediaCount>0"],
      });
      return { visualTreatment: "hero_split", emphasis: "primary", confidence: 0.9, rationale: r };
    }
    if (input.section.mediaCount > 0) {
      r.push({
        code: "HERO_IMAGE_FIRST",
        summary: "Hero uses image-first treatment because media is present without a strong heading signal.",
        basedOn: ["hasHeadingSignal=false", "mediaCount>0"],
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
      return { visualTreatment: "cta_emphasized", emphasis: "primary", confidence: 0.87, rationale: r };
    }
    if (input.section.ctaCandidateCount > 0) {
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

function typographyFromStrategy(strategy: LayoutStrategy): DesignModel["typographyScale"] {
  if (strategy === "editorial_readable") return { profile: "readable", headingScale: "regular", bodyScale: "relaxed" };
  if (strategy === "cta_focused") return { profile: "marketing", headingScale: "large", bodyScale: "regular" };
  return { profile: "balanced", headingScale: "regular", bodyScale: "regular" };
}

function spacingFromStrategy(strategy: LayoutStrategy, pageType: PageType): DesignModel["spacingScale"] {
  if (strategy === "visual_gallery") return { rhythm: "airy", sectionGap: "lg", contentGap: "md" };
  if (strategy === "editorial_readable") return { rhythm: "calm", sectionGap: "md", contentGap: "lg" };
  if (strategy === "cta_focused") return { rhythm: "balanced", sectionGap: "md", contentGap: "sm" };
  if (pageType === "about") return { rhythm: "calm", sectionGap: "md", contentGap: "md" };
  return { rhythm: "balanced", sectionGap: "md", contentGap: "md" };
}

function colorSystemFromPage(page: DesignPageInput): DesignModel["colorSystem"] {
  const primary = page.brandSignals.primaryColorHint;
  const secondary = page.brandSignals.secondaryColorHint;
  const tone = page.ctaCandidateCount >= 3 ? "energetic" : page.contentDensity >= 0.6 ? "calm" : "neutral";

  return {
    mode: primary || secondary ? "source_derived" : "neutral_fallback",
    tone,
    primaryHint: primary,
    secondaryHint: secondary,
  };
}

function safeDefaultModel(input: DesignIntelligenceInput, message: string): DesignModel {
  const entryPage = input.pages.find((p) => p.isEntry) ?? input.pages[0] ?? null;

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
    diagnostics: {
      codes: ["DESIGN_INTELLIGENCE_DEFAULTED"],
      issues: [
        {
          code: "DESIGN_INTELLIGENCE_DEFAULTED",
          severity: "warning",
          message,
          pageId: entryPage?.pageId ?? null,
        },
      ],
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
    const bodyChildren = doc.domOutline?.bodyChildElements ?? [];
    const extracted = extractBlocksFromBodyWithWrapperPromotion({ bodyChildElements: bodyChildren });
    const sections = extracted.boundaryChildren.map((child) => toSectionInput(doc.id, child)).sort((a, b) => {
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
      brandSignals: {
        primaryColorHint: null,
        secondaryColorHint: null,
        typographyHint: doc.fidelity.bodyClass,
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
  };
}

export function createDesignModelFromInput(input: DesignIntelligenceInput): DesignModel {
  if (input.pages.length === 0) {
    return safeDefaultModel(input, "No pages available for design classification.");
  }

  const diagnostics: DesignIntelligenceDiagnostic[] = [];
  const modelRationale: DesignRationale[] = [];
  const pageStrategies: DesignModel["pageStrategies"] = [];
  const sectionDecisions: SectionDecision[] = [];

  for (const page of input.pages) {
    const inferredPageType = inferPageType(page);
    const strategy = pickStrategy({ page, pageType: inferredPageType.pageType });

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

  const diagnosticCodes = [...new Set(diagnostics.map((d) => d.code))].sort(stringCmp);
  const status: DesignModel["status"] = diagnostics.length > 0 ? "ready_with_warnings" : "ready";

  return {
    kind: "design_model_v1",
    version: DESIGN_MODEL_VERSION,
    source: input.preparedSite,
    status,
    pageType: globalPageType,
    layoutStrategy: globalStrategy,
    pageStrategies: orderedPageStrategies,
    sectionDecisions: orderedSectionDecisions,
    typographyScale: typographyFromStrategy(globalStrategy),
    spacingScale: spacingFromStrategy(globalStrategy, globalPageType),
    colorSystem: colorSystemFromPage(primaryPageInput),
    componentVariants: componentVariantsFromDecisions(orderedSectionDecisions),
    rationale: modelRationale,
    diagnostics: {
      codes: diagnosticCodes,
      issues: diagnostics,
    },
  };
}

export function createDesignModel(preparedSite: PreparedSiteModel): DesignModel {
  try {
    const input = createDesignIntelligenceInputFromPreparedSite(preparedSite);
    return createDesignModelFromInput(input);
  } catch (error) {
    const input = createDesignIntelligenceInputFromPreparedSite(preparedSite);
    const message = error instanceof Error ? error.message : "unknown_design_intelligence_error";
    return safeDefaultModel(input, `Design Intelligence fallback activated: ${message}`);
  }
}
