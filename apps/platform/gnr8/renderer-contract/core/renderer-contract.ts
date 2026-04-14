import type { FinalGlobalRegion } from "../../merge-engine";
import { sortRenderDiagnostics } from "../diagnostics/render-diagnostics";
import { transformPageToRenderPage } from "./page-render-transformer";
import { resolveTheme } from "./theme-resolver";
import type {
  ReactRenderGlobalRegion,
  ReactRenderSiteModel,
  RendererContractContext,
  RendererContractInput,
  RendererContractOptions,
} from "../types/renderer-types";

export const DEFAULT_RENDERER_CONTRACT_OPTIONS: Required<RendererContractOptions> = {
  fallbackMode: "safe",
  includeDiagnostics: true,
  includeProvenance: false,
  componentMappingMode: "normalized_only",
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function transformGlobalRegion(input: {
  region: FinalGlobalRegion;
  includeProvenance: boolean;
}): ReactRenderGlobalRegion {
  const { region, includeProvenance } = input;
  return {
    regionId: region.id,
    type: region.type,
    label: region.label,
    navigationTreeId: region.navigationTreeId,
    sectionIds: [...region.sectionIds].sort((a, b) => stringCmp(a, b)),
    pageIds: [...region.pageIds].sort((a, b) => stringCmp(a, b)),
    ...(includeProvenance
      ? {
          provenance: {
            source: region.provenance.source,
            sourceId: region.provenance.sourceId,
            rationale: region.provenance.rationale,
            confidence: region.provenance.confidence,
          },
        }
      : {}),
  };
}

export function createReactRendererContract(input: RendererContractInput): ReactRenderSiteModel {
  const options: Required<RendererContractOptions> = {
    ...DEFAULT_RENDERER_CONTRACT_OPTIONS,
    ...(input.options ?? {}),
  };

  const context: RendererContractContext = {
    input,
    options,
    diagnostics: [],
  };

  const seenPageIds = new Set<string>();
  const pages = input.site.pages
    .slice()
    .sort((a, b) => stringCmp(a.path, b.path) || stringCmp(a.id, b.id))
    .map((page) => {
      if (seenPageIds.has(page.id)) {
        context.diagnostics.push({
          code: "RENDER_PAGE_ID_DUPLICATE",
          severity: "warning",
          message: `Duplicate page id '${page.id}' detected during renderer transformation.`,
          pageId: page.id,
        });
      }
      seenPageIds.add(page.id);

      return transformPageToRenderPage({
        page,
        context,
      });
    });

  const seenRegionIds = new Set<string>();
  const globalRegions = input.site.globalRegions
    .slice()
    .sort((a, b) => stringCmp(a.id, b.id))
    .map((region) => {
      if (seenRegionIds.has(region.id)) {
        context.diagnostics.push({
          code: "RENDER_GLOBAL_REGION_ID_DUPLICATE",
          severity: "warning",
          message: `Duplicate global region id '${region.id}' detected during renderer transformation.`,
        });
      }
      seenRegionIds.add(region.id);
      return transformGlobalRegion({
        region,
        includeProvenance: options.includeProvenance,
      });
    });

  const theme = resolveTheme({
    site: input.site.site,
    tokens: input.site.tokens,
    includeProvenance: options.includeProvenance,
    context,
  });

  const diagnostics = sortRenderDiagnostics(context.diagnostics);

  return {
    site: {
      siteId: input.site.site.id,
      locale: input.site.site.locale,
      defaultPageId: input.site.site.defaultPageId,
      routes: input.site.site.routes
        .slice()
        .sort((a, b) => a.order - b.order || stringCmp(a.path, b.path) || stringCmp(a.id, b.id))
        .map((route) => ({
          routeId: route.id,
          path: route.path,
          pageId: route.pageId,
          parentRouteId: route.parentRouteId,
          order: route.order,
          status: route.status,
        })),
    },
    pages,
    globalRegions,
    theme,
    diagnostics: options.includeDiagnostics ? diagnostics : [],
  };
}
