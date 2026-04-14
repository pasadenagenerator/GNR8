import type { GeneratedSection } from "../../design-adapter";
import type { CanonicalSection } from "../../architecture/canonical-import-models";
import { pushConflict, pushDiagnostic } from "../diagnostics/merge-diagnostics";
import { mapDesignComponent } from "./component-mapper";
import type {
  FinalComponentModel,
  FinalPageModel,
  FinalSectionModel,
  FinalSectionSemanticRole,
  MergeContext,
} from "../types/merge-types";

const ROLE_ALIAS: Record<string, FinalSectionSemanticRole> = {
  navigation: "navigation",
  hero: "hero",
  about: "about",
  services: "services",
  service: "services",
  features: "features",
  feature: "features",
  gallery: "gallery",
  metrics: "metrics",
  testimonial: "testimonials",
  testimonials: "testimonials",
  faq: "faq",
  pricing: "pricing",
  cta: "cta",
  contact: "contact",
  footer: "footer",
  content: "content",
  section_heading: "section_heading",
  unknown: "unknown",
};

function normalizeRole(role: string): FinalSectionSemanticRole {
  const normalized = role.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return ROLE_ALIAS[normalized] ?? "unknown";
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .sort((a, b) => a.localeCompare(b));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function readImportSectionHint(section: CanonicalSection, context: MergeContext): string {
  const bindings = context.bindingsBySectionId.get(section.id) ?? [];
  const titleLike = bindings
    .filter((binding) => {
      const key = binding.fieldKey.toLowerCase();
      return key.includes("title") || key.includes("heading") || key.includes("headline");
    })
    .map((binding) => context.recordsById.get(binding.contentId))
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .map((record) => (typeof record.value === "string" ? record.value : ""))
    .join(" ")
    .trim();

  return `${section.role} ${titleLike}`.trim();
}

function readDesignSectionHint(section: GeneratedSection): string {
  const propsText = section.components
    .flatMap((component) =>
      Object.entries(component.props)
        .filter(([, value]) => typeof value === "string")
        .map(([, value]) => String(value)),
    )
    .join(" ");

  return `${section.role} ${propsText}`.trim();
}

function createImportFallbackComponent(section: CanonicalSection): FinalComponentModel {
  return {
    id: `${section.id}::import_container`,
    sectionId: section.id,
    kind: "container",
    mappedType: "import_section_container",
    variant: "default",
    order: 0,
    slots: [{ key: "content", valueType: "unknown", sourceHint: null }],
    tokenRefs: [],
    fallback: {
      wrappedAsGeneric: false,
      reason: null,
      rawMetadata: null,
    },
    provenance: {
      source: "import",
      sourceId: section.id,
      rationale: "Fallback import container preserves section when no design component mapped.",
      confidence: 1,
    },
  };
}

function scoreMatch(input: {
  importSection: CanonicalSection;
  designSection: GeneratedSection;
  importIndex: number;
  designIndex: number;
  context: MergeContext;
}): { score: number; roleMatch: boolean; titleSimilarity: number; positionScore: number } {
  const { importSection, designSection, importIndex, designIndex, context } = input;
  const importRole = normalizeRole(importSection.role);
  const designRole = normalizeRole(designSection.role);
  const roleMatch = importRole === designRole;

  const importHintTokens = tokenize(readImportSectionHint(importSection, context));
  const designHintTokens = tokenize(readDesignSectionHint(designSection));
  const titleSimilarity = jaccardSimilarity(importHintTokens, designHintTokens);

  const positionGap = Math.abs(importIndex - designIndex);
  const positionScore = Math.max(0, 10 - positionGap * 2);

  const score = (roleMatch ? 100 : 0) + Math.round(titleSimilarity * 20) + positionScore;
  return { score, roleMatch, titleSimilarity, positionScore };
}

export function reconcileSections(input: {
  page: FinalPageModel;
  importSections: CanonicalSection[];
  designSections: GeneratedSection[];
  context: MergeContext;
}): FinalSectionModel[] {
  const { page, importSections, designSections, context } = input;

  const importOrdered = [...importSections].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const designOrdered = [...designSections].sort((a, b) => a.id.localeCompare(b.id));

  const matchedImportIds = new Set<string>();
  const matchedDesignIds = new Set<string>();

  const pairs: Array<{
    importSection: CanonicalSection;
    designSection: GeneratedSection;
    score: number;
    titleSimilarity: number;
    positionScore: number;
  }> = [];

  for (let dIdx = 0; dIdx < designOrdered.length; dIdx += 1) {
    const designSection = designOrdered[dIdx];
    let best:
      | {
          importSection: CanonicalSection;
          score: number;
          titleSimilarity: number;
          positionScore: number;
        }
      | null = null;

    for (let iIdx = 0; iIdx < importOrdered.length; iIdx += 1) {
      const importSection = importOrdered[iIdx];
      if (matchedImportIds.has(importSection.id)) continue;

      const score = scoreMatch({
        importSection,
        designSection,
        importIndex: iIdx,
        designIndex: dIdx,
        context,
      });

      const threshold = context.options.structureMode === "prefer_design" ? 30 : 40;
      if (score.score < threshold) continue;

      if (!best || score.score > best.score || (score.score === best.score && importSection.id < best.importSection.id)) {
        best = {
          importSection,
          score: score.score,
          titleSimilarity: score.titleSimilarity,
          positionScore: score.positionScore,
        };
      }
    }

    if (best) {
      matchedImportIds.add(best.importSection.id);
      matchedDesignIds.add(designSection.id);
      pairs.push({
        importSection: best.importSection,
        designSection,
        score: best.score,
        titleSimilarity: best.titleSimilarity,
        positionScore: best.positionScore,
      });

      pushDiagnostic(context, {
        code: "MERGE_SECTION_MATCHED",
        severity: "info",
        message: `Matched design section '${designSection.id}' with import section '${best.importSection.id}'.`,
        pageId: page.id,
        sectionId: best.importSection.id,
        details: {
          score: best.score,
          titleSimilarity: best.titleSimilarity,
          positionScore: best.positionScore,
          role: best.importSection.role,
        },
      });
    }
  }

  const mergedSections = pairs.map((pair) => {
    const mappedComponents = pair.designSection.components
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((component, index) =>
        mapDesignComponent({
          component,
          sectionId: pair.importSection.id,
          order: index,
          context,
        }),
      )
      .filter((component): component is FinalComponentModel => Boolean(component));

    const components = mappedComponents.length > 0 ? mappedComponents : [createImportFallbackComponent(pair.importSection)];

    return {
      id: pair.importSection.id,
      pageId: page.id,
      semanticRole: normalizeRole(pair.importSection.role),
      layoutRole: pair.designSection.layoutType,
      order: pair.importSection.order,
      components,
      contentBindings: [],
      styleRefs: {
        colorTokenIds: [],
        typographyTokenIds: [],
        spacingTokenIds: [],
        gradientIds: [],
      },
      provenance: {
        source: "merged" as const,
        sourceId: `${pair.importSection.id}|${pair.designSection.id}`,
        rationale: "Import section anchor matched with design layout proposal.",
        confidence: Math.min(1, Math.max(0, pair.score / 120)),
      },
    } satisfies FinalSectionModel;
  });

  const importOnlySections = importOrdered.filter((section) => !matchedImportIds.has(section.id));
  const designOnlySections = designOrdered.filter((section) => !matchedDesignIds.has(section.id));

  const importOnlyFinal = importOnlySections.map((section) => {
    pushConflict(context, {
      type: "section_mismatch",
      resolution: "used_import",
      details: {
        pageId: page.id,
        sectionId: section.id,
        reason: "missing_design_section_match",
      },
    });

    pushDiagnostic(context, {
      code: "MERGE_IMPORT_SECTION_PRESERVED",
      severity: "info",
      message: `Preserved import section '${section.id}' without design match.`,
      pageId: page.id,
      sectionId: section.id,
    });

    return {
      id: section.id,
      pageId: page.id,
      semanticRole: normalizeRole(section.role),
      layoutRole: "import_preserved",
      order: section.order,
      components: [createImportFallbackComponent(section)],
      contentBindings: [],
      styleRefs: {
        colorTokenIds: [],
        typographyTokenIds: [],
        spacingTokenIds: [],
        gradientIds: [],
      },
      provenance: {
        source: "import" as const,
        sourceId: section.id,
        rationale: "Import section kept due to no design candidate.",
        confidence: 1,
      },
    } satisfies FinalSectionModel;
  });

  const designOnlyFinal = designOnlySections
    .map((section, index) => {
      const canInclude =
        context.options.structureMode === "prefer_design" ||
        (context.options.structureMode === "hybrid" && section.confidence >= 0.7);

      if (!canInclude) {
        pushConflict(context, {
          type: "section_mismatch",
          resolution: "skipped",
          details: {
            pageId: page.id,
            designSectionId: section.id,
            reason: "design_section_confidence_or_mode",
            confidence: section.confidence,
          },
        });

        pushDiagnostic(context, {
          code: "MERGE_DESIGN_SECTION_SKIPPED",
          severity: "warning",
          message: `Skipped design-only section '${section.id}'.`,
          pageId: page.id,
          details: {
            confidence: section.confidence,
            structureMode: context.options.structureMode,
          },
        });

        return null;
      }

      const mappedComponents = section.components
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((component, componentOrder) =>
          mapDesignComponent({
            component,
            sectionId: section.id,
            order: componentOrder,
            context,
          }),
        )
        .filter((component): component is FinalComponentModel => Boolean(component));

      const createdSection: FinalSectionModel = {
        id: section.id,
        pageId: page.id,
        semanticRole: normalizeRole(section.role),
        layoutRole: section.layoutType,
        order: importOnlyFinal.length + mergedSections.length + index,
        components: mappedComponents.length > 0 ? mappedComponents : [createImportFallbackComponent({
          id: section.id,
          pageId: page.id,
          role: "unknown",
          order: importOnlyFinal.length + mergedSections.length + index,
          domSignature: "design_only",
          contentBindingIds: [],
          sharedPatternId: null,
          evidenceRefs: [],
          confidence: "low",
        })],
        contentBindings: [],
        styleRefs: {
          colorTokenIds: [],
          typographyTokenIds: [],
          spacingTokenIds: [],
          gradientIds: [],
        },
        provenance: {
          source: "design",
          sourceId: section.id,
          rationale: "Design-only section admitted by structure mode.",
          confidence: section.confidence,
        },
      };

      pushConflict(context, {
        type: "section_mismatch",
        resolution: "used_design",
        details: {
          pageId: page.id,
          designSectionId: section.id,
          reason: "design_only_section_included",
          confidence: section.confidence,
        },
      });

      pushDiagnostic(context, {
        code: "MERGE_DESIGN_SECTION_INCLUDED",
        severity: "warning",
        message: `Included design-only section '${section.id}'.`,
        pageId: page.id,
        sectionId: section.id,
        details: {
          confidence: section.confidence,
          structureMode: context.options.structureMode,
        },
      });

      return createdSection;
    })
    .filter((section): section is FinalSectionModel => Boolean(section));

  const ordered = (() => {
    if (context.options.structureMode === "prefer_design") {
      return [...mergedSections, ...designOnlyFinal, ...importOnlyFinal];
    }
    return [...mergedSections, ...importOnlyFinal, ...designOnlyFinal];
  })()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((section, index) => ({ ...section, order: index }));

  return ordered;
}
