import { normalizePagePath } from "@/gnr8/runtime/deterministic";
import { safeDecodeURIComponent } from "@/gnr8/runtime/raw-preview-uri-decoding";
import type {
  MultiPageRawArtifactAssemblyRouteEntry,
  RawTemplateSiteFileMeta,
  RuntimeImportProvenanceSummary,
} from "@/gnr8/runtime/types";

export const RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC = {
  MULTIPAGE_ROUTE_MAP_SELECTED: "MULTIPAGE_ROUTE_MAP_SELECTED",
  MULTIPAGE_ROUTE_MAP_MISS: "MULTIPAGE_ROUTE_MAP_MISS",
  MULTIPAGE_ROUTE_MAP_FILE_MISSING: "MULTIPAGE_ROUTE_MAP_FILE_MISSING",
  MULTIPAGE_ROUTE_MAP_DISABLED: "MULTIPAGE_ROUTE_MAP_DISABLED",
  MULTIPAGE_ROUTE_MAP_ROOT_SELECTED: "MULTIPAGE_ROUTE_MAP_ROOT_SELECTED",
} as const;

export type RawTemplateRouteMapDiagnosticCode =
  (typeof RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC)[keyof typeof RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC];

export type RawTemplateRouteMapResolution =
  | {
      outcome: "selected";
      diagnosticCode:
        | typeof RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_SELECTED
        | typeof RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_ROOT_SELECTED;
      siteVersionId: string;
      requestedPath: string;
      routePath: string;
      rawFilePath: string;
      sourceUrl: string | null;
      finalUrl: string | null;
    }
  | {
      outcome: "miss";
      diagnosticCode: typeof RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_MISS;
      siteVersionId: string;
      requestedPath: string;
      routePath: string;
    }
  | {
      outcome: "file_missing";
      diagnosticCode: typeof RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_FILE_MISSING;
      siteVersionId: string;
      requestedPath: string;
      routePath: string;
      rawFilePath: string;
      sourceUrl: string | null;
      finalUrl: string | null;
    }
  | {
      outcome: "disabled";
      diagnosticCode: typeof RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_DISABLED;
      siteVersionId: string;
      requestedPath: string;
      routePath: string;
      reasonCode: "explicit_option_disabled" | "route_map_missing";
    };

function stripUrlSuffix(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const queryIndex = raw.indexOf("?");
  const hashIndex = raw.indexOf("#");
  const cutoff =
    queryIndex < 0
      ? hashIndex
      : hashIndex < 0
        ? queryIndex
        : Math.min(queryIndex, hashIndex);
  return cutoff < 0 ? raw : raw.slice(0, cutoff);
}

function safeDecodePath(value: string): string {
  return safeDecodeURIComponent(value).value;
}

export function normalizeRawTemplateRouteMapPath(value: string): string {
  const withoutSuffix = safeDecodePath(stripUrlSuffix(value)).replaceAll("\\", "/");
  const normalized = normalizePagePath(withoutSuffix).replace(/\/+$/, "") || "/";
  if (normalized === "/" || normalized.toLowerCase() === "/index.html") return "/";
  const withoutIndex = normalized.replace(/\/index\.html$/i, "");
  return withoutIndex || "/";
}

function normalizeRawFilePath(value: string): string {
  return String(value ?? "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== ".")
    .join("/");
}

export function routeMapFromProvenance(
  provenance: RuntimeImportProvenanceSummary | null | undefined,
): MultiPageRawArtifactAssemblyRouteEntry[] {
  const assembly = provenance?.multiPageDiscovery?.rawArtifactAssembly ?? null;
  if (!assembly?.enabled || !Array.isArray(assembly.routeMap)) return [];
  return assembly.routeMap.filter((entry) => entry?.status === "assembled" && Boolean(entry.rawFilePath));
}

export function resolveRawTemplateRouteMapFile(input: {
  siteVersionId: string;
  requestedPath: string;
  entryHtmlPath: string;
  fileMap: Record<string, RawTemplateSiteFileMeta>;
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
  routeMapServingEnabled: boolean;
}): RawTemplateRouteMapResolution {
  const requestedPath = normalizeRawTemplateRouteMapPath(input.requestedPath);
  const routeMap = routeMapFromProvenance(input.importProvenanceSummary);
  if (!input.routeMapServingEnabled || routeMap.length === 0) {
    return {
      outcome: "disabled",
      diagnosticCode: RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_DISABLED,
      siteVersionId: input.siteVersionId,
      requestedPath,
      routePath: requestedPath,
      reasonCode: input.routeMapServingEnabled ? "route_map_missing" : "explicit_option_disabled",
    };
  }

  const byRoute = new Map<string, MultiPageRawArtifactAssemblyRouteEntry>();
  for (const entry of routeMap) {
    const routePath = normalizeRawTemplateRouteMapPath(entry.routePath);
    if (!byRoute.has(routePath)) byRoute.set(routePath, entry);
  }

  if (requestedPath === "/") {
    const rootEntry = byRoute.get("/") ?? null;
    const rawFilePath = normalizeRawFilePath(rootEntry?.rawFilePath ?? input.entryHtmlPath) || "index.html";
    if (!input.fileMap[rawFilePath]) {
      return {
        outcome: "file_missing",
        diagnosticCode: RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_FILE_MISSING,
        siteVersionId: input.siteVersionId,
        requestedPath,
        routePath: "/",
        rawFilePath,
        sourceUrl: rootEntry?.sourceUrl ?? null,
        finalUrl: rootEntry?.finalUrl ?? null,
      };
    }
    return {
      outcome: "selected",
      diagnosticCode: RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_ROOT_SELECTED,
      siteVersionId: input.siteVersionId,
      requestedPath,
      routePath: "/",
      rawFilePath,
      sourceUrl: rootEntry?.sourceUrl ?? null,
      finalUrl: rootEntry?.finalUrl ?? null,
    };
  }

  const entry = byRoute.get(requestedPath) ?? null;
  if (!entry) {
    return {
      outcome: "miss",
      diagnosticCode: RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_MISS,
      siteVersionId: input.siteVersionId,
      requestedPath,
      routePath: requestedPath,
    };
  }

  const rawFilePath = normalizeRawFilePath(entry.rawFilePath);
  if (!rawFilePath || !input.fileMap[rawFilePath]) {
    return {
      outcome: "file_missing",
      diagnosticCode: RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_FILE_MISSING,
      siteVersionId: input.siteVersionId,
      requestedPath,
      routePath: normalizeRawTemplateRouteMapPath(entry.routePath),
      rawFilePath,
      sourceUrl: entry.sourceUrl ?? null,
      finalUrl: entry.finalUrl ?? null,
    };
  }

  return {
    outcome: "selected",
    diagnosticCode: RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_SELECTED,
    siteVersionId: input.siteVersionId,
    requestedPath,
    routePath: normalizeRawTemplateRouteMapPath(entry.routePath),
    rawFilePath,
    sourceUrl: entry.sourceUrl ?? null,
    finalUrl: entry.finalUrl ?? null,
  };
}
