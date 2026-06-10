import path from "node:path";
import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

const CSS_URL_PATTERN = /url\(\s*(['"]?)([^"')]+)\1\s*\)/gi;
const CSS_IMPORT_URL_PATTERN = /@import\s+url\(\s*(["']?)([^"')\s]+)\1\s*\)([^;]*)(;?)/gi;
const CSS_IMPORT_STRING_PATTERN = /@import\s+(["'])([^"']+)\1([^;]*)(;?)/gi;
const ASSET_ROUTE_PREFIX = "/api/gnr8/runtime/preview-assets";
const OSMAP_IFRAME_FALLBACK_TYPE = "osm_iframe";
const OSMAP_LINK_FALLBACK_TYPE = "osm_link_card";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

type RewriteContext = {
  siteId: string;
  siteVersionId: string;
  contextFilePath: string;
  fileMapPaths?: ReadonlySet<string>;
};

type RuntimeDebugContext = {
  siteId: string;
  siteVersionId: string;
  bindingStatus: string;
  details?: Record<string, unknown>;
};

export type RawTemplateRuntimeDiagnostic = {
  code: "OSMAP_JSON_ENDPOINT_UNAVAILABLE" | "OSMAP_PUBLIC_IFRAME_FALLBACK_INJECTED" | "OSMAP_PUBLIC_LINK_FALLBACK_INJECTED";
  moduleId: string;
  address: string;
  fallbackType: typeof OSMAP_IFRAME_FALLBACK_TYPE | typeof OSMAP_LINK_FALLBACK_TYPE;
  coordinates?: { lat: number; lng: number; source: string } | null;
};

export type RawTemplateRuntimeRewriteResult = {
  html: string;
  diagnostics: RawTemplateRuntimeDiagnostic[];
};

function normalizeTemplatePath(value: string): string {
  const normalized = String(value ?? "").trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized) return "";
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) return "";
  return segments.join("/");
}

function safeDecodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isImageAssetPath(value: string): boolean {
  return /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(String(value ?? ""));
}

function resizedImageFallbackCandidates(candidate: string): string[] {
  const normalized = normalizeTemplatePath(candidate);
  if (!normalized || !isImageAssetPath(normalized)) return [];
  const ext = path.posix.extname(normalized);
  if (!ext) return [];
  const dir = path.posix.dirname(normalized);
  const basename = path.posix.basename(normalized, ext);
  const fallbackBasenames = [
    basename.replace(/-\d{2,5}x\d{2,5}(?:_\d{2,5}x\d{2,5})?$/i, ""),
    basename.replace(/-scaled$/i, ""),
  ].filter((value) => value && value !== basename);
  return fallbackBasenames
    .map((name) => normalizeTemplatePath(path.posix.join(dir === "." ? "" : dir, `${name}${ext}`)))
    .filter(Boolean);
}

function splitUrlSuffix(value: string): { pathname: string; suffix: string } {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return { pathname: "", suffix: "" };
  const queryStart = trimmed.indexOf("?");
  const hashStart = trimmed.indexOf("#");
  const cutoff =
    queryStart < 0
      ? hashStart < 0
        ? -1
        : hashStart
      : hashStart < 0
        ? queryStart
        : Math.min(queryStart, hashStart);
  if (cutoff < 0) return { pathname: trimmed, suffix: "" };
  return {
    pathname: trimmed.slice(0, cutoff),
    suffix: trimmed.slice(cutoff),
  };
}

function splitPreviewUrlSuffix(value: string): { pathname: string; suffix: string } {
  const trimmed = String(value ?? "").trim();
  const queryStart = trimmed.indexOf("?");
  const hashStart = trimmed.indexOf("#");
  const cutoff =
    queryStart < 0
      ? hashStart < 0
        ? -1
        : hashStart
      : hashStart < 0
        ? queryStart
        : Math.min(queryStart, hashStart);
  if (cutoff < 0) return { pathname: trimmed, suffix: "" };
  return { pathname: trimmed.slice(0, cutoff), suffix: trimmed.slice(cutoff) };
}

function resolveAssetPathFromReference(input: { reference: string; contextFilePath: string; fileMapPaths?: ReadonlySet<string> }): string | null {
  const reference = String(input.reference ?? "").trim().replaceAll("\\", "/");
  if (!reference) return null;

  const lower = reference.toLowerCase();
  if (
    lower.startsWith("data:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("tel:")
  ) {
    return null;
  }

  if (reference.startsWith("#")) return null;

  const normalizedContextPath = normalizeTemplatePath(input.contextFilePath) || "index.html";
  const contextDir = path.posix.dirname(normalizedContextPath);
  const { pathname } = splitPreviewUrlSuffix(reference);
  const pathnameVariants = [...new Set([pathname, safeDecodePath(pathname)].filter(Boolean))];
  const candidates: Array<string | null> = [];
  let parsed: URL | null = null;
  try {
    parsed = /^\/\//.test(pathname) ? new URL(`https:${pathname}`) : /^[a-z][a-z0-9+.-]*:/i.test(pathname) ? new URL(pathname) : null;
  } catch {
    parsed = null;
  }

  if (parsed) {
    const pathOnly = normalizeTemplatePath(parsed.pathname);
    const hostnames = new Set([parsed.hostname]);
    if (parsed.hostname.startsWith("www.")) hostnames.add(parsed.hostname.slice(4));
    else hostnames.add(`www.${parsed.hostname}`);
    for (const host of hostnames) {
      candidates.push(normalizeTemplatePath(`${host}${parsed.pathname}`));
    }
    candidates.push(pathOnly);
    if (pathOnly) candidates.push(normalizeTemplatePath(path.posix.join("/", contextDir === "." ? "" : contextDir, pathOnly)));
  } else {
    for (const variant of pathnameVariants) {
      if (variant.startsWith("/")) {
        candidates.push(normalizeTemplatePath(variant));
      } else {
        candidates.push(normalizeTemplatePath(path.posix.join("/", contextDir === "." ? "" : contextDir, variant)));
        candidates.push(normalizeTemplatePath(variant));
      }
    }
  }

  const normalizedCandidates = [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))];
  if (normalizedCandidates.length === 0) return null;
  if (!input.fileMapPaths) return normalizedCandidates[0] ?? null;
  const expandedCandidates = [...new Set(normalizedCandidates.flatMap((candidate) => [candidate, ...resizedImageFallbackCandidates(candidate)]))];
  for (const candidate of expandedCandidates) {
    if (input.fileMapPaths.has(candidate)) return candidate;
  }
  for (const candidate of expandedCandidates) {
    const suffix = `/${candidate}`;
    const match = [...input.fileMapPaths].find((filePath) => filePath.endsWith(suffix));
    if (match) return match;
  }
  return null;
}

function buildPreviewAssetUrl(input: { siteId: string; siteVersionId: string; assetPath: string; suffix: string }): string {
  return `${ASSET_ROUTE_PREFIX}/${encodeURIComponent(input.siteId)}/${encodeURIComponent(input.siteVersionId)}/${input.assetPath}${input.suffix}`;
}

export function rewriteAssetReferenceToRuntime(input: {
  reference: string;
  siteId: string;
  siteVersionId: string;
  contextFilePath: string;
  fileMapPaths?: ReadonlySet<string>;
}): string | null {
  if (String(input.reference ?? "").trim().startsWith(ASSET_ROUTE_PREFIX)) return String(input.reference ?? "").trim();
  const { pathname, suffix } = splitUrlSuffix(input.reference);
  const assetPath = resolveAssetPathFromReference({
    reference: pathname,
    contextFilePath: input.contextFilePath,
    fileMapPaths: input.fileMapPaths,
  });
  if (!assetPath) return null;
  return buildPreviewAssetUrl({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    assetPath,
    suffix,
  });
}

function rewriteCssImportTokens(css: string, context: RewriteContext): string {
  const rewriteUrlImport = (full: string, quote: string, rawValue: string, media: string, semicolon: string) => {
    const rewritten = rewriteAssetReferenceToRuntime({
      reference: String(rawValue ?? ""),
      siteId: context.siteId,
      siteVersionId: context.siteVersionId,
      contextFilePath: context.contextFilePath,
      fileMapPaths: context.fileMapPaths,
    });
    if (!rewritten) return full;
    const safeQuote = quote || "";
    return `@import url(${safeQuote}${rewritten}${safeQuote})${media ?? ""}${semicolon ?? ""}`;
  };
  const rewriteStringImport = (full: string, quote: string, rawValue: string, media: string, semicolon: string) => {
    const rewritten = rewriteAssetReferenceToRuntime({
      reference: String(rawValue ?? ""),
      siteId: context.siteId,
      siteVersionId: context.siteVersionId,
      contextFilePath: context.contextFilePath,
      fileMapPaths: context.fileMapPaths,
    });
    if (!rewritten) return full;
    return `@import ${quote}${rewritten}${quote}${media ?? ""}${semicolon ?? ""}`;
  };
  return String(css ?? "")
    .replace(CSS_IMPORT_URL_PATTERN, rewriteUrlImport)
    .replace(CSS_IMPORT_STRING_PATTERN, rewriteStringImport);
}

function rewriteCssUrlTokens(css: string, context: RewriteContext): string {
  return rewriteCssImportTokens(String(css ?? ""), context).replace(CSS_URL_PATTERN, (full, quote, rawValue) => {
    const rewritten = rewriteAssetReferenceToRuntime({
      reference: String(rawValue ?? ""),
      siteId: context.siteId,
      siteVersionId: context.siteVersionId,
      contextFilePath: context.contextFilePath,
      fileMapPaths: context.fileMapPaths,
    });
    if (!rewritten) return full;
    const safeQuote = quote || "";
    return `url(${safeQuote}${rewritten}${safeQuote})`;
  });
}

function rewriteTagAttributes(html: string, context: RewriteContext): string {
  const attributePattern = /(\s(?:src|href)\s*=\s*)(["'])([^"']*)(\2)/gi;
  return html.replace(attributePattern, (full, prefix, quote, value, closingQuote) => {
    const rewritten = rewriteAssetReferenceToRuntime({
      reference: String(value ?? ""),
      siteId: context.siteId,
      siteVersionId: context.siteVersionId,
      contextFilePath: context.contextFilePath,
      fileMapPaths: context.fileMapPaths,
    });
    if (!rewritten) return full;
    return `${prefix}${quote}${rewritten}${closingQuote}`;
  });
}

function rewriteInlineStyleAttributes(html: string, context: RewriteContext): string {
  const stylePattern = /(\sstyle\s*=\s*)(["'])([\s\S]*?)(\2)/gi;
  return html.replace(stylePattern, (full, prefix, quote, value, closingQuote) => {
    const rewrittenCss = rewriteCssUrlTokens(String(value ?? ""), context);
    if (rewrittenCss === value) return full;
    return `${prefix}${quote}${rewrittenCss}${closingQuote}`;
  });
}

function rewriteStyleTagBlocks(html: string, context: RewriteContext): string {
  return html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, css) => {
    const rewrittenCss = rewriteCssUrlTokens(String(css ?? ""), context);
    if (rewrittenCss === css) return full;
    return `<style${attrs}>${rewrittenCss}</style>`;
  });
}

export function injectBaseTag(html: string): string {
  const source = String(html ?? "");
  if (/<base\b/i.test(source)) return source;

  const headMatch = /<head\b[^>]*>/i.exec(source);
  if (!headMatch || headMatch.index < 0) {
    return `<!doctype html><html><head><base href="/" data-gnr8-runtime="1" /></head><body>${source}</body></html>`;
  }

  const insertAt = headMatch.index + headMatch[0].length;
  return `${source.slice(0, insertAt)}<base href="/" data-gnr8-runtime="1" />${source.slice(insertAt)}`;
}

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asElement(node: Node | null | undefined): Element | null {
  if (!node || typeof (node as any).tagName !== "string") return null;
  return node as Element;
}

function childrenOf(node: Node | null | undefined): Node[] {
  if (!node || !Array.isArray((node as any).childNodes)) return [];
  return (node as any).childNodes as Node[];
}

function attrValue(node: Element, name: string): string {
  const attrs = Array.isArray((node as any).attrs) ? ((node as any).attrs as Array<{ name: string; value: string }>) : [];
  const hit = attrs.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  return String(hit?.value ?? "").trim();
}

function classList(node: Element): Set<string> {
  return new Set(
    attrValue(node, "class")
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function hasClasses(node: Element, classes: string[]): boolean {
  const values = classList(node);
  return classes.every((className) => values.has(className));
}

function findAncestorElement(node: Element, predicate: (element: Element) => boolean): Element | null {
  let current: Node | null = (node as any).parentNode ?? null;
  while (current) {
    const element = asElement(current);
    if (element && predicate(element)) return element;
    current = (current as any).parentNode ?? null;
  }
  return null;
}

function collectElements(root: Node, predicate: (element: Element) => boolean): Element[] {
  const out: Element[] = [];
  const walk = (node: Node) => {
    const element = asElement(node);
    if (element && predicate(element)) out.push(element);
    for (const child of childrenOf(node)) walk(child);
  };
  walk(root);
  return out;
}

function sourceRange(node: Element): { startOffset: number; endOffset: number } | null {
  const location = (node as any).sourceCodeLocation as { startOffset?: number; endOffset?: number } | undefined;
  const startOffset = Number(location?.startOffset);
  const endOffset = Number(location?.endOffset);
  if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset) || startOffset < 0 || endOffset <= startOffset) return null;
  return { startOffset, endOffset };
}

function parseCoordinatePair(input: { lat?: string | null; lng?: string | null }): { lat: number; lng: number } | null {
  const rawLat = String(input.lat ?? "").trim();
  const rawLng = String(input.lng ?? "").trim();
  if (!rawLat || !rawLng) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function parseZoom(value: string): number {
  const zoom = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(zoom)) return 16;
  return Math.max(1, Math.min(19, zoom));
}

function normalizeAddressForKnownCoordinates(address: string): string {
  return String(address ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,\s]+/g, " ")
    .trim()
    .toLowerCase();
}

function knownCoordinatesForAddress(address: string): { lat: number; lng: number; source: string } | null {
  const normalized = normalizeAddressForKnownCoordinates(address);
  if (/dolenjska cesta 328\b/.test(normalized) && /\b(?:lavrica|skofljica|slovenia|slovenija)\b/.test(normalized)) {
    return { lat: 46.0008729, lng: 14.5545172, source: "known_maver_public_address_osm_lookup" };
  }
  if (/jagrova ulica 14\b/.test(normalized) && /\b(?:sela|lavrica|skofljica)\b/.test(normalized)) {
    return { lat: 45.996816, lng: 14.589487, source: "known_maver_site_address_coordinates" };
  }
  if (/litostrojska cesta 40\b/.test(normalized) && /\bljubljana\b/.test(normalized)) {
    return { lat: 46.07827, lng: 14.49097, source: "known_roboplast_site_address_coordinates" };
  }
  return null;
}

function extractOsmapCoordinates(input: { container: Element; osmapModule: Element; address: string }): { lat: number; lng: number; source: string } | null {
  const containerCoordinates = parseCoordinatePair({
    lat: attrValue(input.container, "data-lat") || attrValue(input.container, "data-latitude"),
    lng: attrValue(input.container, "data-lng") || attrValue(input.container, "data-lon") || attrValue(input.container, "data-longitude"),
  });
  if (containerCoordinates) return { ...containerCoordinates, source: "container_data_attributes" };

  const moduleCoordinates = parseCoordinatePair({
    lat: attrValue(input.osmapModule, "data-lat") || attrValue(input.osmapModule, "data-latitude"),
    lng: attrValue(input.osmapModule, "data-lng") || attrValue(input.osmapModule, "data-lon") || attrValue(input.osmapModule, "data-longitude"),
  });
  if (moduleCoordinates) return { ...moduleCoordinates, source: "module_data_attributes" };

  return knownCoordinatesForAddress(input.address);
}

function buildOpenStreetMapEmbedSrc(input: { lat: number; lng: number; zoom: number }): string {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const zoom = parseZoom(String(input.zoom));
  const delta = zoom >= 16 ? 0.006 : zoom >= 14 ? 0.012 : 0.03;
  const bbox = [(lng - delta).toFixed(6), (lat - delta).toFixed(6), (lng + delta).toFixed(6), (lat + delta).toFixed(6)].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat.toFixed(7)},${lng.toFixed(7)}`)}`;
}

function buildOsmapLinkFallbackContainer(input: { address: string }): string {
  const escapedAddress = escapeHtml(input.address);
  const href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(input.address)}`;
  return `<div class="map-container gnr8-osmap-fallback" data-address="${escapedAddress}" data-gnr8-osmap-fallback="${OSMAP_LINK_FALLBACK_TYPE}" style="min-height:260px;display:grid;place-items:center;padding:18px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:center;box-sizing:border-box"><div style="display:grid;gap:10px;max-width:520px"><strong style="font-size:18px;line-height:1.25">Location</strong><span style="font-size:15px;line-height:1.45">${escapedAddress}</span><a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;justify-content:center;justify-self:center;padding:9px 13px;border-radius:6px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700">Open in OpenStreetMap</a></div></div>`;
}

function buildOsmapIframeFallbackContainer(input: {
  address: string;
  coordinates: { lat: number; lng: number; source: string };
  zoom: number;
}): string {
  const escapedAddress = escapeHtml(input.address);
  const href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(input.address)}`;
  const iframeSrc = buildOpenStreetMapEmbedSrc({ lat: input.coordinates.lat, lng: input.coordinates.lng, zoom: input.zoom });
  return `<div class="map-container gnr8-osmap-fallback" data-address="${escapedAddress}" data-gnr8-osmap-fallback="${OSMAP_IFRAME_FALLBACK_TYPE}" data-gnr8-coordinate-source="${escapeHtml(input.coordinates.source)}" style="min-height:320px;display:grid;grid-template-rows:minmax(260px,1fr) auto;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-sizing:border-box;overflow:hidden"><iframe src="${escapeHtml(iframeSrc)}" title="Location map for ${escapedAddress}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" style="display:block;width:100%;height:100%;min-height:260px;border:0"></iframe><div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 12px;background:#ffffff;border-top:1px solid #e2e8f0;font-size:14px;line-height:1.35"><span>${escapedAddress}</span><a href="${href}" target="_blank" rel="noopener noreferrer" style="color:#0f172a;font-weight:700;text-decoration:underline;text-underline-offset:2px">Open in OpenStreetMap</a></div></div>`;
}

function resolvePublicOsmapIframeFallbackEnabled(): boolean {
  return String(process.env.GNR8_OSMAP_PUBLIC_IFRAME_FALLBACK ?? "").trim() !== "0";
}

export function injectMonoOsmapPublicFallback(
  html: string,
  options: { iframeFallbackEnabled?: boolean } = {},
): RawTemplateRuntimeRewriteResult {
  const source = String(html ?? "");
  if (!source || !/osmap/i.test(source) || !/map-container/i.test(source)) {
    return { html: source, diagnostics: [] };
  }
  const iframeFallbackEnabled = options.iframeFallbackEnabled ?? resolvePublicOsmapIframeFallbackEnabled();

  const root = parse(source, { sourceCodeLocationInfo: true }) as unknown as Node;
  const replacements: Array<{
    startOffset: number;
    endOffset: number;
    moduleId: string;
    address: string;
    replacement: string;
    fallbackType: typeof OSMAP_IFRAME_FALLBACK_TYPE | typeof OSMAP_LINK_FALLBACK_TYPE;
    coordinates: { lat: number; lng: number; source: string } | null;
  }> = [];

  const containers = collectElements(root, (element) => {
    return (element.tagName || "").toLowerCase() === "div" && hasClasses(element, ["map-container"]);
  });

  for (const container of containers) {
    const osmapModule = findAncestorElement(container, (element) => {
      return (element.tagName || "").toLowerCase() === "div" && hasClasses(element, ["module", "map", "osmap"]);
    });
    if (!osmapModule) continue;

    const address = attrValue(container, "data-address");
    if (!address) continue;

    const range = sourceRange(container);
    if (!range) continue;
    const coordinates = extractOsmapCoordinates({ container, osmapModule, address });
    const zoom = parseZoom(attrValue(container, "data-zoom") || attrValue(osmapModule, "data-zoom"));
    const fallbackType = iframeFallbackEnabled && coordinates ? OSMAP_IFRAME_FALLBACK_TYPE : OSMAP_LINK_FALLBACK_TYPE;

    replacements.push({
      ...range,
      moduleId: attrValue(osmapModule, "id") || "unknown",
      address,
      replacement:
        fallbackType === OSMAP_IFRAME_FALLBACK_TYPE && coordinates
          ? buildOsmapIframeFallbackContainer({ address, coordinates, zoom })
          : buildOsmapLinkFallbackContainer({ address }),
      fallbackType,
      coordinates,
    });
  }

  if (replacements.length === 0) return { html: source, diagnostics: [] };

  const sorted = replacements.sort((left, right) => right.startOffset - left.startOffset);
  let rewritten = source;
  for (const replacement of sorted) {
    rewritten = `${rewritten.slice(0, replacement.startOffset)}${replacement.replacement}${rewritten.slice(replacement.endOffset)}`;
  }

  const diagnostics = replacements.flatMap((replacement): RawTemplateRuntimeDiagnostic[] => [
    {
      code: "OSMAP_JSON_ENDPOINT_UNAVAILABLE",
      moduleId: replacement.moduleId,
      address: replacement.address,
      fallbackType: replacement.fallbackType,
      coordinates: replacement.coordinates,
    },
    {
      code:
        replacement.fallbackType === OSMAP_IFRAME_FALLBACK_TYPE
          ? "OSMAP_PUBLIC_IFRAME_FALLBACK_INJECTED"
          : "OSMAP_PUBLIC_LINK_FALLBACK_INJECTED",
      moduleId: replacement.moduleId,
      address: replacement.address,
      fallbackType: replacement.fallbackType,
      coordinates: replacement.coordinates,
    },
  ]);

  return { html: rewritten, diagnostics };
}

export function injectRuntimeDebugPanel(input: { html: string; debug: RuntimeDebugContext }): string {
  const detailRows = Object.entries(input.debug.details ?? {})
    .map(([key, value]) => `<div>${escapeHtml(key)}: ${escapeHtml(typeof value === "string" ? value : JSON.stringify(value))}</div>`)
    .join("");
  const panelHtml = `<aside data-gnr8-runtime-debug="1" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;background:rgba(15,23,42,0.94);color:#e2e8f0;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;padding:10px 12px;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,0.25);max-width:min(92vw,560px)"><strong style="display:block;margin-bottom:6px;color:#93c5fd">GNR8 Debug</strong><div>siteId: ${escapeHtml(input.debug.siteId)}</div><div>versionId: ${escapeHtml(input.debug.siteVersionId)}</div><div>binding: ${escapeHtml(input.debug.bindingStatus)}</div>${detailRows}</aside>`;
  const source = String(input.html ?? "");
  const bodyClose = /<\/body>/i;
  if (bodyClose.test(source)) {
    return source.replace(bodyClose, `${panelHtml}</body>`);
  }
  return `${source}${panelHtml}`;
}

export function rewriteRawTemplateHtmlForRuntime(input: {
  html: string;
  siteId: string;
  siteVersionId: string;
  resolvedFilePath: string;
}): string {
  return rewriteRawTemplateHtmlForRuntimeWithDiagnostics(input).html;
}

export function rewriteRawTemplateHtmlForRuntimeWithDiagnostics(input: {
  html: string;
  siteId: string;
  siteVersionId: string;
  resolvedFilePath: string;
}): RawTemplateRuntimeRewriteResult {
  const context: RewriteContext = {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    contextFilePath: input.resolvedFilePath,
  };

  let rewritten = rewriteTagAttributes(String(input.html ?? ""), context);
  rewritten = rewriteInlineStyleAttributes(rewritten, context);
  rewritten = rewriteStyleTagBlocks(rewritten, context);
  rewritten = injectBaseTag(rewritten);
  return injectMonoOsmapPublicFallback(rewritten);
}

export function rewriteRawTemplateCssForRuntime(input: {
  css: string;
  siteId: string;
  siteVersionId: string;
  assetFilePath: string;
  fileMapPaths?: ReadonlySet<string>;
}): string {
  return rewriteCssUrlTokens(String(input.css ?? ""), {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    contextFilePath: input.assetFilePath,
    fileMapPaths: input.fileMapPaths,
  });
}

export function resolveAssetMediaType(input: { filePath: string; mediaType?: string | null }): string {
  const extension = path.posix.extname(String(input.filePath ?? "").toLowerCase());
  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "application/javascript; charset=utf-8";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    case ".eot":
      return "application/vnd.ms-fontobject";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".ico":
      return "image/x-icon";
    case ".bmp":
      return "image/bmp";
    default:
      break;
  }
  const provided = String(input.mediaType ?? "").trim();
  return provided || "application/octet-stream";
}
