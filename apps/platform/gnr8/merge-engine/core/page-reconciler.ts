import type { GeneratedPage } from "../../design-adapter";
import type { CanonicalPage, CanonicalSection } from "../../architecture/canonical-import-models";
import { pushConflict, pushDiagnostic } from "../diagnostics/merge-diagnostics";
import { reconcileSections } from "./section-reconciler";
import type { FinalPageModel, MergeContext } from "../types/merge-types";

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  let normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized.toLowerCase();
}

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function collectSectionsForPage(input: {
  pageId: string;
  importSectionsByPage: Map<string, CanonicalSection[]>;
}): CanonicalSection[] {
  return [...(input.importSectionsByPage.get(input.pageId) ?? [])].sort((a, b) => a.order - b.order || stringCmp(a.id, b.id));
}

export function reconcilePages(input: { context: MergeContext }): FinalPageModel[] {
  const { context } = input;
  const importPages = [...context.canonicalStructure.pages].sort((a, b) => stringCmp(a.path, b.path) || stringCmp(a.id, b.id));
  const designPages = [...context.design.pages].sort((a, b) => stringCmp(a.path, b.path) || stringCmp(a.id, b.id));

  const importSectionsByPage = new Map<string, CanonicalSection[]>();
  for (const section of context.canonicalStructure.sections) {
    if (!importSectionsByPage.has(section.pageId)) {
      importSectionsByPage.set(section.pageId, []);
    }
    importSectionsByPage.get(section.pageId)?.push(section);
  }

  const designPagesByPath = new Map<string, GeneratedPage[]>();
  for (const page of designPages) {
    const key = normalizePath(page.path);
    const list = designPagesByPath.get(key) ?? [];
    list.push(page);
    designPagesByPath.set(key, list);
  }

  for (const [path, pages] of designPagesByPath.entries()) {
    if (pages.length > 1) {
      pushDiagnostic(context, {
        code: "MERGE_DUPLICATE_DESIGN_PAGE_CANDIDATE",
        severity: "warning",
        message: `Multiple design pages map to path '${path}'. Using deterministic first candidate.`,
        details: {
          designPageIds: pages.map((page) => page.id).sort((a, b) => stringCmp(a, b)),
        },
      });
    }
  }

  const matchedDesignPageIds = new Set<string>();
  const mergedPages: FinalPageModel[] = [];

  for (const importPage of importPages) {
    const normalizedPath = normalizePath(importPage.path);
    const candidates = (designPagesByPath.get(normalizedPath) ?? []).slice().sort((a, b) => stringCmp(a.id, b.id));
    const designPage = candidates.length > 0 ? candidates[0] : undefined;
    if (designPage) {
      matchedDesignPageIds.add(designPage.id);
    }

    if (!designPage) {
      pushConflict(context, {
        type: "missing_design_page",
        resolution: "used_import",
        details: {
          importPageId: importPage.id,
          path: importPage.path,
        },
      });
      pushDiagnostic(context, {
        code: "MERGE_IMPORT_PAGE_PRESERVED",
        severity: "info",
        message: `Preserved import page '${importPage.id}' because no design page matched '${importPage.path}'.`,
        pageId: importPage.id,
      });
    }

    const basePage: FinalPageModel = {
      id: importPage.id,
      path: importPage.path,
      role: importPage.purpose,
      title: importPage.title,
      routeNodeId: importPage.routeNodeId,
      seo: {
        titleContentIds: importPage.seoContentIds,
        descriptionContentIds: importPage.seoContentIds,
      },
      sections: [],
      globalRegionIds: importPage.globalRegionIds,
      provenance: {
        source: designPage ? "merged" : "import",
        sourceId: designPage ? `${importPage.id}|${designPage.id}` : importPage.id,
        rationale: designPage
          ? "Route anchored to import page and merged with matched design page by normalized path."
          : "Route and page preserved from import because no design match existed.",
        confidence: designPage ? Math.max(0.55, designPage.confidence) : 1,
      },
    };

    basePage.sections = reconcileSections({
      page: basePage,
      importSections: collectSectionsForPage({ pageId: importPage.id, importSectionsByPage }),
      designSections: designPage?.sections ?? [],
      context,
    });

    mergedPages.push(basePage);
  }

  const designOnlyPages = designPages.filter((page) => !matchedDesignPageIds.has(page.id));

  for (const designPage of designOnlyPages) {
    pushConflict(context, {
      type: "missing_import_page",
      resolution: context.options.structureMode === "prefer_design" ? "used_design" : "skipped",
      details: {
        designPageId: designPage.id,
        path: designPage.path,
        confidence: designPage.confidence,
      },
    });

    const shouldInclude =
      context.options.structureMode === "prefer_design" ||
      (context.options.structureMode === "hybrid" && designPage.confidence >= 0.75);

    pushDiagnostic(context, {
      code: shouldInclude ? "MERGE_DESIGN_PAGE_INCLUDED" : "MERGE_DESIGN_PAGE_SKIPPED",
      severity: "warning",
      message: shouldInclude
        ? `Design-only page '${designPage.id}' included after diagnostic review.`
        : `Design-only page '${designPage.id}' skipped because import routes are authoritative in this mode.`,
      pageId: designPage.id,
      details: {
        structureMode: context.options.structureMode,
        confidence: designPage.confidence,
      },
    });

    if (!shouldInclude) continue;

    const syntheticImportPage: CanonicalPage = {
      id: designPage.id,
      path: designPage.path,
      title: null,
      purpose: "unknown",
      routeNodeId: designPage.id,
      sectionIds: designPage.sections.map((section) => section.id),
      globalRegionIds: [],
      seoContentIds: [],
    };

    const finalPage: FinalPageModel = {
      id: syntheticImportPage.id,
      path: syntheticImportPage.path,
      role: syntheticImportPage.purpose,
      title: syntheticImportPage.title,
      routeNodeId: syntheticImportPage.routeNodeId,
      seo: {
        titleContentIds: [],
        descriptionContentIds: [],
      },
      sections: [],
      globalRegionIds: [],
      provenance: {
        source: "design",
        sourceId: designPage.id,
        rationale: "Design-only page included under structure mode rules.",
        confidence: designPage.confidence,
      },
    };

    finalPage.sections = reconcileSections({
      page: finalPage,
      importSections: [],
      designSections: designPage.sections,
      context,
    });

    mergedPages.push(finalPage);
  }

  return mergedPages
    .slice()
    .sort((a, b) => stringCmp(a.path, b.path) || stringCmp(a.id, b.id))
    .map((page) => ({
      ...page,
      sections: page.sections
        .slice()
        .sort((a, b) => a.order - b.order || stringCmp(a.id, b.id))
        .map((section, index) => ({ ...section, order: index })),
    }));
}
