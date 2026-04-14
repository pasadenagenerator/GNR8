import type { ReactRenderSiteModel, RenderDiagnostic } from "@/gnr8/renderer-contract";

import type { RealReactRendererOptions, ResolvedRoutePage } from "@/gnr8/react-renderer/types/renderer-runtime-types";

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function normalizeRoutePath(path: string): string {
  const withoutHash = path.split("#", 1)[0] ?? "/";
  const withoutQuery = withoutHash.split("?", 1)[0] ?? "/";
  const trimmed = withoutQuery.trim();

  if (trimmed.length === 0) return "/";
  if (trimmed === "/") return "/";

  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const stripped = prefixed.replace(/\/+$/g, "");
  return stripped.length === 0 ? "/" : stripped;
}

export function resolveRoutePage(input: {
  siteModel: ReactRenderSiteModel;
  routePath: string;
  options: Required<RealReactRendererOptions>;
  diagnostics: RenderDiagnostic[];
}): ResolvedRoutePage {
  const { siteModel, routePath, options, diagnostics } = input;
  const normalizedPath = normalizeRoutePath(routePath);

  const sortedRoutes = siteModel.site.routes
    .slice()
    .sort((a, b) => a.order - b.order || stringCmp(a.path, b.path) || stringCmp(a.routeId, b.routeId));

  const matchedRoute = sortedRoutes.find((route) => normalizeRoutePath(route.path) === normalizedPath) ?? null;

  if (!matchedRoute) {
    diagnostics.push({
      code: "RUNTIME_ROUTE_NOT_FOUND",
      severity: options.fallbackMode === "strict" ? "error" : "warning",
      message: `No route matched '${normalizedPath}'. Rendered deterministic not-found fallback.`,
      details: {
        routePath: normalizedPath,
      },
    });

    return {
      matchedRoutePath: null,
      matchedPageId: null,
      matchedPage: null,
    };
  }

  if (!matchedRoute.pageId) {
    diagnostics.push({
      code: "RUNTIME_ROUTE_PAGE_UNRESOLVED",
      severity: options.fallbackMode === "strict" ? "error" : "warning",
      message: `Route '${matchedRoute.path}' has no resolved pageId. Rendered deterministic not-found fallback.`,
      details: {
        routePath: matchedRoute.path,
        routeId: matchedRoute.routeId,
      },
    });

    return {
      matchedRoutePath: matchedRoute.path,
      matchedPageId: null,
      matchedPage: null,
    };
  }

  const page = siteModel.pages.find((candidate) => candidate.pageId === matchedRoute.pageId) ?? null;
  if (!page) {
    diagnostics.push({
      code: "RUNTIME_ROUTE_PAGE_UNRESOLVED",
      severity: options.fallbackMode === "strict" ? "error" : "warning",
      message: `Route '${matchedRoute.path}' points to missing page '${matchedRoute.pageId}'. Rendered deterministic not-found fallback.`,
      pageId: matchedRoute.pageId,
      details: {
        routePath: matchedRoute.path,
        routeId: matchedRoute.routeId,
      },
    });

    return {
      matchedRoutePath: matchedRoute.path,
      matchedPageId: matchedRoute.pageId,
      matchedPage: null,
    };
  }

  return {
    matchedRoutePath: matchedRoute.path,
    matchedPageId: page.pageId,
    matchedPage: page,
  };
}

export function normalizeRoutePathForTesting(path: string): string {
  return normalizeRoutePath(path);
}
