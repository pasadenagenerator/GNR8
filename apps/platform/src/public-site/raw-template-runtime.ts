import path from "node:path";
import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

const CSS_URL_PATTERN = /url\(\s*(['"]?)([^"')]+)\1\s*\)/gi;
const ASSET_ROUTE_PREFIX = "/api/gnr8/runtime/preview-assets";
const OSMAP_FALLBACK_TYPE = "osm_link_card";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

type RewriteContext = {
  siteId: string;
  siteVersionId: string;
  contextFilePath: string;
};

type RuntimeDebugContext = {
  siteId: string;
  siteVersionId: string;
  bindingStatus: string;
  details?: Record<string, unknown>;
};

export type RawTemplateRuntimeDiagnostic = {
  code: "OSMAP_JSON_ENDPOINT_UNAVAILABLE" | "OSMAP_PUBLIC_FALLBACK_INJECTED";
  moduleId: string;
  address: string;
  fallbackType: typeof OSMAP_FALLBACK_TYPE;
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

function resolveAssetPathFromReference(input: { reference: string; contextFilePath: string }): string | null {
  const reference = String(input.reference ?? "").trim().replaceAll("\\", "/");
  if (!reference) return null;

  const lower = reference.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("//") ||
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

  const isAssetsPath = (candidate: string): boolean => {
    const segments = normalizeTemplatePath(candidate).split("/").filter(Boolean);
    const index = segments.indexOf("assets");
    return index >= 0 && index < segments.length - 1;
  };

  if (reference.startsWith("/assets/")) {
    const normalizedAbsolute = normalizeTemplatePath(reference);
    return isAssetsPath(normalizedAbsolute) ? normalizedAbsolute : null;
  }

  if (reference.startsWith("assets/")) {
    const normalizedDirect = normalizeTemplatePath(reference);
    return isAssetsPath(normalizedDirect) ? normalizedDirect : null;
  }

  if (reference.startsWith("./") || reference.startsWith("../")) {
    const resolved = path.posix.normalize(path.posix.join(contextDir, reference));
    const normalizedResolved = normalizeTemplatePath(resolved);
    return isAssetsPath(normalizedResolved) ? normalizedResolved : null;
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
}): string | null {
  const { pathname, suffix } = splitUrlSuffix(input.reference);
  const assetPath = resolveAssetPathFromReference({
    reference: pathname,
    contextFilePath: input.contextFilePath,
  });
  if (!assetPath) return null;
  return buildPreviewAssetUrl({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    assetPath,
    suffix,
  });
}

function rewriteCssUrlTokens(css: string, context: RewriteContext): string {
  return String(css ?? "").replace(CSS_URL_PATTERN, (full, quote, rawValue) => {
    const rewritten = rewriteAssetReferenceToRuntime({
      reference: String(rawValue ?? ""),
      siteId: context.siteId,
      siteVersionId: context.siteVersionId,
      contextFilePath: context.contextFilePath,
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

function buildOsmapFallbackContainer(input: { address: string }): string {
  const escapedAddress = escapeHtml(input.address);
  const href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(input.address)}`;
  return `<div class="map-container gnr8-osmap-fallback" data-address="${escapedAddress}" data-gnr8-osmap-fallback="${OSMAP_FALLBACK_TYPE}" style="min-height:260px;display:grid;place-items:center;padding:18px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:center;box-sizing:border-box"><div style="display:grid;gap:10px;max-width:520px"><strong style="font-size:18px;line-height:1.25">Location</strong><span style="font-size:15px;line-height:1.45">${escapedAddress}</span><a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;justify-content:center;justify-self:center;padding:9px 13px;border-radius:6px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700">Open in OpenStreetMap</a></div></div>`;
}

export function injectMonoOsmapPublicFallback(html: string): RawTemplateRuntimeRewriteResult {
  const source = String(html ?? "");
  if (!source || !/osmap/i.test(source) || !/map-container/i.test(source) || !/data-address/i.test(source)) {
    return { html: source, diagnostics: [] };
  }

  const root = parse(source, { sourceCodeLocationInfo: true }) as unknown as Node;
  const replacements: Array<{
    startOffset: number;
    endOffset: number;
    moduleId: string;
    address: string;
    replacement: string;
  }> = [];

  const containers = collectElements(root, (element) => {
    return (element.tagName || "").toLowerCase() === "div" && hasClasses(element, ["map-container"]) && Boolean(attrValue(element, "data-address"));
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

    replacements.push({
      ...range,
      moduleId: attrValue(osmapModule, "id") || "unknown",
      address,
      replacement: buildOsmapFallbackContainer({ address }),
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
      fallbackType: OSMAP_FALLBACK_TYPE,
    },
    {
      code: "OSMAP_PUBLIC_FALLBACK_INJECTED",
      moduleId: replacement.moduleId,
      address: replacement.address,
      fallbackType: OSMAP_FALLBACK_TYPE,
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
}): string {
  return rewriteCssUrlTokens(String(input.css ?? ""), {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    contextFilePath: input.assetFilePath,
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
