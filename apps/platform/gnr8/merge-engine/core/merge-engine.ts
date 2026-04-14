import { sortConflicts, sortDiagnostics, pushDiagnostic } from "../diagnostics/merge-diagnostics";
import { bindContentToPage } from "./content-binder";
import { reconcilePages } from "./page-reconciler";
import { mergeTokens } from "./token-merger";
import type {
  FinalGlobalRegion,
  FinalNavigationTree,
  FinalReusableComponent,
  FinalRoute,
  FinalSite,
  FinalSiteModel,
  MergeContext,
  MergeEngineInput,
} from "../types/merge-types";
import { DEFAULT_MERGE_OPTIONS } from "../types/merge-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function createContext(input: MergeEngineInput): MergeContext {
  const options = {
    ...DEFAULT_MERGE_OPTIONS,
    ...(input.options ?? {}),
  };

  const recordsById = new Map(input.canonical.content.records.map((record) => [record.id, record]));

  const bindingsBySectionId = new Map<string, typeof input.canonical.content.bindings>();
  const bindingsByOwnerId = new Map<string, typeof input.canonical.content.bindings>();

  for (const binding of input.canonical.content.bindings) {
    const sectionBucket = bindingsBySectionId.get(binding.targetId) ?? [];
    sectionBucket.push(binding);
    bindingsBySectionId.set(binding.targetId, sectionBucket);

    const ownerBucket = bindingsByOwnerId.get(binding.targetId) ?? [];
    ownerBucket.push(binding);
    bindingsByOwnerId.set(binding.targetId, ownerBucket);
  }

  return {
    canonicalStructure: input.canonical.structure,
    canonicalContent: input.canonical.content,
    canonicalStyle: input.canonical.style,
    canonicalProvenance: input.canonical.provenance,
    design: input.design,
    recordsById,
    bindingsBySectionId,
    bindingsByOwnerId,
    options,
    diagnostics: [],
    conflicts: [],
  };
}

function buildFinalRoutes(context: MergeContext): FinalRoute[] {
  return context.canonicalStructure.routeTree
    .slice()
    .sort((a, b) => a.order - b.order || stringCmp(a.path, b.path) || stringCmp(a.id, b.id))
    .map((route) => ({
      id: route.id,
      path: route.path,
      pageId: route.pageId,
      parentRouteId: route.parentRouteId,
      titleHint: route.titleHint,
      order: route.order,
      status: route.status,
    }));
}

function buildNavigation(context: MergeContext): FinalNavigationTree[] {
  return context.canonicalStructure.navigationTrees
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .map((tree) => ({
      id: tree.id,
      scope: tree.scope,
      ownerId: tree.ownerId,
      items: tree.items
        .slice()
        .sort((a, b) => a.order - b.order || stringCmp(a.id, b.id))
        .map((item) => ({
          id: item.id,
          labelContentId: item.labelContentId,
          href: item.href,
          targetRouteId: item.targetRouteId,
          order: item.order,
          isExternal: item.isExternal,
        })),
    }));
}

function buildGlobalRegions(context: MergeContext): FinalGlobalRegion[] {
  return context.canonicalStructure.globalRegions
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .map((region) => ({
      id: region.id,
      type: region.type,
      label: region.label,
      navigationTreeId: region.navigationTreeId,
      sectionIds: [...region.sectionIds].sort((a, b) => stringCmp(a, b)),
      pageIds: context.canonicalStructure.pages
        .filter((page) => page.globalRegionIds.includes(region.id))
        .map((page) => page.id)
        .sort((a, b) => stringCmp(a, b)),
      provenance: {
        source: "import",
        sourceId: region.id,
        rationale: "Global region preserved from canonical import structure.",
        confidence: 1,
      },
    }));
}

function buildReusableComponents(context: MergeContext): FinalReusableComponent[] {
  return context.canonicalStructure.sharedPatterns
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .map((pattern) => ({
      id: pattern.id,
      kind: pattern.patternKind,
      sourcePatternId: pattern.id,
      sectionIds: pattern.sectionIds.slice().sort((a, b) => stringCmp(a, b)),
      reusable: pattern.reusable,
      confidence: pattern.confidence,
      provenance: {
        source: "import",
        sourceId: pattern.id,
        rationale: "Reusable component pattern inherited from canonical shared pattern detection.",
        confidence: pattern.confidence === "high" ? 1 : pattern.confidence === "medium" ? 0.75 : 0.5,
      },
    }));
}

function buildSite(context: MergeContext): FinalSite {
  return {
    id: context.canonicalStructure.siteId,
    locale: context.canonicalStructure.locale,
    defaultPageId: context.canonicalStructure.defaultPageId,
    routes: buildFinalRoutes(context),
    navigation: buildNavigation(context),
    provenance: {
      importRunId: context.canonicalProvenance.importRunId,
      sourceFingerprint: context.canonicalProvenance.sourceFingerprint,
      capturedAtIso: context.canonicalProvenance.capturedAtIso,
      mergeModes: context.options,
      designPagesCount: context.design.pages.length,
      designWarningsCount: context.design.warnings.length,
    },
  };
}

function absorbDesignWarnings(context: MergeContext): void {
  for (const warning of context.design.warnings.slice().sort((a, b) => stringCmp(a.code, b.code))) {
    pushDiagnostic(context, {
      code: `DESIGN_${warning.code}`,
      severity: "warning",
      message: warning.message,
      details: {
        targetId: warning.targetId,
      },
    });
  }

  if (context.design.pages.length === 0) {
    pushDiagnostic(context, {
      code: "MERGE_EMPTY_DESIGN_RESPONSE",
      severity: "warning",
      message: "Design response contains no pages; merge will preserve imported structure.",
    });
  }
}

export function mergeCanonicalWithDesign(input: MergeEngineInput): FinalSiteModel {
  const context = createContext(input);
  absorbDesignWarnings(context);

  const pages = reconcilePages({ context })
    .map((page) => bindContentToPage({ page, context }))
    .sort((a, b) => stringCmp(a.path, b.path) || stringCmp(a.id, b.id));

  const tokens = mergeTokens(context);
  const site = buildSite(context);

  return {
    site,
    pages,
    globalRegions: buildGlobalRegions(context),
    tokens,
    reusableComponents: buildReusableComponents(context),
    diagnostics: sortDiagnostics(context.diagnostics),
    conflicts: sortConflicts(context.conflicts),
  };
}
