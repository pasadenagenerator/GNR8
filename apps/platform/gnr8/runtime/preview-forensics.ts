import crypto from "node:crypto";
import path from "node:path";

import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import type { Browser } from "playwright";

import { normalizePagePath } from "@/gnr8/runtime/deterministic";
import { resolveRawTemplateRouteMapFile } from "@/gnr8/runtime/raw-template-route-map-resolver";
import {
  getRawImportedSiteArtifact,
  getRawTemplateSiteArtifact,
  getRawTemplateSiteAsset,
  getSiteVersion,
  type RuntimeStoreDbClient,
} from "@/gnr8/runtime/runtime-store";
import { renderSiteVersionPreview } from "@/gnr8/runtime/unified-render-preview";
import type {
  CanonicalSiteVersionSnapshot,
  RawImportedSiteArtifact,
  RawTemplateSiteArtifact,
} from "@/gnr8/runtime/types";

export type PreviewForensicsLossStage = "import" | "preview_response" | "browser_runtime" | "none" | "unknown";
type StageName = "original" | "raw_artifact" | "preview_response" | "browser_dom";
type DiffName = "import_loss" | "preview_rewrite_runtime_loss" | "browser_script_mutation_loss";
type ForensicNode = DefaultTreeAdapterMap["node"];
type ForensicElement = DefaultTreeAdapterMap["element"];

export type PreviewForensicsHtmlArtifact = {
  stage: StageName;
  available: boolean;
  byteLength: number;
  sha256: string | null;
  html: string | null;
  unavailableReason: string | null;
};

type UrlChangeEvidence = {
  kind: string;
  before: string;
  after: string;
  reason: "same_basename" | "preview_asset_rewrite" | "external_to_preview_asset";
};

export type PreviewForensicsStageDiff = {
  name: DiffName;
  fromStage: StageName;
  toStage: StageName;
  missingStylesheets: string[];
  missingFonts: string[];
  missingImages: string[];
  missingScripts: string[];
  missingIframes: string[];
  missingMaps: string[];
  addedStylesheets: string[];
  addedFonts: string[];
  addedImages: string[];
  addedScripts: string[];
  addedIframes: string[];
  addedMaps: string[];
  duplicatedRootHomeBlocks: {
    fromCount: number;
    toCount: number;
    appeared: boolean;
  };
  changedBodyHtmlClasses: {
    htmlRemoved: string[];
    htmlAdded: string[];
    bodyRemoved: string[];
    bodyAdded: string[];
  };
  changedInlineStyles: {
    removed: string[];
    added: string[];
  };
  changedUrls: UrlChangeEvidence[];
  blockedOrRewrittenExternalRefs: {
    removedExternalRefs: string[];
    addedPreviewAssetRefs: string[];
    disabledScriptRefs: string[];
  };
};

export type PreviewForensicsReport = {
  routePath: string;
  sourceUrl: string | null;
  rawFilePath: string | null;
  stageWhereDuplicationAppears: PreviewForensicsLossStage;
  stageWhereFontBreaks: PreviewForensicsLossStage;
  stageWhereImagesBreak: PreviewForensicsLossStage;
  stageWhereMapBreaks: PreviewForensicsLossStage;
  topMissingAssets: string[];
  scriptMutationEvidence: {
    previewScriptCount: number;
    browserScriptCount: number;
    previewDisabledScriptCount: number;
    browserDisabledScriptCount: number;
    missingScriptsAfterBrowser: string[];
    addedScriptsAfterBrowser: string[];
    disabledScriptRefsAfterBrowser: string[];
  };
  cssCascadeEvidence: {
    originalCssOrder: string[];
    rawArtifactCssOrder: string[];
    previewResponseCssOrder: string[];
    browserDomCssOrder: string[];
    importCssOrderChanged: boolean;
    previewCssOrderChanged: boolean;
    browserCssOrderChanged: boolean;
    dongleDetectedByStage: Record<StageName, boolean>;
    classChanges: PreviewForensicsStageDiff["changedBodyHtmlClasses"][];
    inlineStyleChanges: PreviewForensicsStageDiff["changedInlineStyles"][];
  };
  iframeMapEvidence: {
    originalMapRefs: string[];
    rawArtifactMapRefs: string[];
    previewResponseMapRefs: string[];
    browserDomMapRefs: string[];
    missingMapRefsByStage: {
      import: string[];
      preview_response: string[];
      browser_runtime: string[];
    };
  };
  recommendedRootCause: string;
  diffs: PreviewForensicsStageDiff[];
  artifacts: PreviewForensicsHtmlArtifact[];
};

type HtmlInventory = {
  stage: StageName;
  html: string;
  htmlClasses: string[];
  bodyClasses: string[];
  htmlStyle: string | null;
  bodyStyle: string | null;
  inlineStyles: string[];
  stylesheetRefs: string[];
  fontRefs: string[];
  imageRefs: string[];
  scriptRefs: string[];
  iframeRefs: string[];
  mapRefs: string[];
  allUrls: Array<{ kind: string; value: string }>;
  cssOrder: string[];
  disabledScriptRefs: string[];
  inlineScriptCount: number;
  duplicateRootHomeBlockCount: number;
  dongleDetected: boolean;
};

export type PreviewForensicsCaptureResult =
  | { status: "captured"; html: string; url: string; waitMs: number }
  | { status: "unavailable"; html: null; url: string; waitMs: number; reason: string };

type ForensicsDependencies = {
  getSiteVersion: typeof getSiteVersion;
  getRawImportedSiteArtifact: typeof getRawImportedSiteArtifact;
  getRawTemplateSiteArtifact: typeof getRawTemplateSiteArtifact;
  getRawTemplateSiteAsset: typeof getRawTemplateSiteAsset;
  renderSiteVersionPreview: typeof renderSiteVersionPreview;
  fetchHtml: (url: string) => Promise<string | null>;
  captureBrowserDom: (input: { url: string; cookieHeader?: string | null; waitMs: number }) => Promise<PreviewForensicsCaptureResult>;
};

const defaultForensicsDependencies: ForensicsDependencies = {
  getSiteVersion,
  getRawImportedSiteArtifact,
  getRawTemplateSiteArtifact,
  getRawTemplateSiteAsset,
  renderSiteVersionPreview,
  fetchHtml: fetchOriginalHtml,
  captureBrowserDom: captureBrowserDomAfterRuntime,
};

function stableSha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isElement(node: ForensicNode): node is ForensicElement {
  return Boolean((node as ForensicElement).tagName);
}

function attrsFor(node: ForensicElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of node.attrs ?? []) attrs[attr.name.toLowerCase()] = attr.value;
  return attrs;
}

function walk(node: ForensicNode, visit: (node: ForensicElement) => void): void {
  if (isElement(node)) visit(node);
  for (const child of ("childNodes" in node ? node.childNodes ?? [] : [])) walk(child as ForensicNode, visit);
}

function nodeText(node: ForensicNode): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  return ("childNodes" in node ? node.childNodes ?? [] : [])
    .map((child) => nodeText(child as ForensicNode))
    .join(" ");
}

function splitTokens(value: string | null | undefined): string[] {
  return [...new Set(normalizeText(value).split(/\s+/).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeUrlRef(value: unknown): string | null {
  const raw = normalizeText(value).replaceAll("&amp;", "&");
  if (!raw || raw.startsWith("#")) return null;
  return raw;
}

function srcsetUrls(value: string): string[] {
  return normalizeText(value)
    .split(",")
    .map((entry) => normalizeUrlRef(entry.trim().split(/\s+/)[0]))
    .filter((entry): entry is string => Boolean(entry));
}

function styleUrls(value: string): string[] {
  return [...String(value ?? "").matchAll(/url\(\s*(['"]?)([^"')]+)\1\s*\)/gi)]
    .map((match) => normalizeUrlRef(match[2]))
    .filter((entry): entry is string => Boolean(entry));
}

function cssImportRefs(value: string): string[] {
  const source = String(value ?? "");
  const refs = [
    ...source.matchAll(/@import\s+url\(\s*(['"]?)([^"')\s]+)\1\s*\)/gi),
    ...source.matchAll(/@import\s+(['"])([^"']+)\1/gi),
  ];
  return refs.map((match) => normalizeUrlRef(match[2])).filter((entry): entry is string => Boolean(entry));
}

function isStylesheetRef(tagName: string, attrs: Record<string, string>, href: string): boolean {
  const rel = splitTokens(attrs.rel).map((item) => item.toLowerCase());
  if (rel.includes("stylesheet")) return true;
  if (rel.includes("preload") && normalizeText(attrs.as).toLowerCase() === "style") return true;
  if (normalizeText(attrs.type).toLowerCase() === "text/css") return true;
  return /\.css(?:[?#].*)?$/i.test(href) || isFontStylesheetRef(href) || tagName === "style";
}

function isFontStylesheetRef(value: string): boolean {
  return /fonts\.googleapis\.com\/css|fonts\.googleapis\.com\/icon|fonts\.gstatic\.com/i.test(value);
}

function isFontFileRef(value: string): boolean {
  return /\.(?:woff2?|ttf|otf|eot)(?:[?#].*)?$/i.test(value);
}

function isImageRef(value: string): boolean {
  return /\.(?:apng|avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)(?:[?#].*)?$/i.test(value);
}

function mapProviderForReference(value: string): string | null {
  const normalized = value.toLowerCase();
  if (/(?:maps\.googleapis\.com|google\.com\/maps|google\.[a-z.]+\/maps|google\.maps)/.test(normalized)) return "google_maps";
  if (/(?:openstreetmap\.org|osm\.org|tile\.openstreetmap\.org)/.test(normalized)) return "openstreetmap";
  if (/(?:leaflet|unpkg\.com\/leaflet|cdn\.jsdelivr\.net\/npm\/leaflet)/.test(normalized)) return "leaflet";
  if (/(?:mapbox\.com|api\.mapbox\.com|mapbox-gl)/.test(normalized)) return "mapbox";
  if (/(?:openlayers|ol\.js|cdn\.jsdelivr\.net\/npm\/ol\b)/.test(normalized)) return "openlayers";
  if (/(?:maptiler|here\.com|bing\.com\/maps|waze\.com|yandex\.[a-z.]+\/maps|\bmap\b|\bmaps\b|initmap)/.test(normalized)) {
    return "custom_embedded_map";
  }
  return null;
}

function unique(values: string[], limit = 60): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function setDiff(left: string[], right: string[], limit = 40): string[] {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item)).slice(0, limit);
}

function basenameForUrl(value: string): string {
  const withoutSuffix = value.split(/[?#]/, 1)[0] ?? value;
  try {
    const parsed = new URL(withoutSuffix, "https://example.invalid");
    return path.posix.basename(parsed.pathname).toLowerCase();
  } catch {
    return path.posix.basename(withoutSuffix).toLowerCase();
  }
}

function externalRef(value: string): boolean {
  return /^(?:https?:)?\/\//i.test(value);
}

function previewAssetRef(value: string): boolean {
  return value.includes("/api/gnr8/runtime/preview-assets/");
}

function rootHomeFingerprintFromElement(node: ForensicElement): string | null {
  const attrs = attrsFor(node);
  const tagName = node.tagName.toLowerCase();
  if (!["header", "main", "section", "article", "div", "nav"].includes(tagName)) return null;
  const classId = `${attrs.class ?? ""} ${attrs.id ?? ""} ${attrs.role ?? ""} ${attrs["data-section"] ?? ""} ${attrs["data-testid"] ?? ""}`.toLowerCase();
  const text = nodeText(node).replace(/\s+/g, " ").trim().toLowerCase();
  const headings: string[] = [];
  const hrefs: string[] = [];
  walk(node, (child) => {
    if (/^h[1-3]$/i.test(child.tagName)) headings.push(nodeText(child).replace(/\s+/g, " ").trim().toLowerCase());
    const href = attrsFor(child).href;
    if (href) hrefs.push(href.toLowerCase());
  });
  const routeMenuDetected = ["/project", "/people", "/news", "/blog", "/learn"].filter((route) =>
    hrefs.some((href) => href.includes(route)),
  ).length >= 3;
  const headingText = headings.join(" ");
  const rootMarkerDetected =
    /\b(?:viroidoc_root|home_intro|root_marker|hero-root|home-page|homepage|front-page|startseite)\b/i.test(classId) ||
    /\badvanced research on viroid pathogenesis\b/i.test(`${headingText} ${text}`) ||
    (routeMenuDetected && /\bviroidoc\b/i.test(`${headingText} ${text}`));
  const heroDetected = tagName === "header" || /\b(?:hero|masthead|intro|landing|home|root|welcome)\b/i.test(classId) || headings.length > 0;
  if (!rootMarkerDetected || !heroDetected) return null;
  return `root-home:${stableSha256([tagName, classId, headingText.slice(0, 240), text.slice(0, 360)].join("|")).slice(0, 12)}`;
}

function collectHtmlInventory(stage: StageName, html: string | null): HtmlInventory {
  const source = String(html ?? "");
  const doc = parse(source);
  let htmlEl: ForensicElement | null = null;
  let bodyEl: ForensicElement | null = null;
  const stylesheetRefs: string[] = [];
  const fontRefs: string[] = [];
  const imageRefs: string[] = [];
  const scriptRefs: string[] = [];
  const iframeRefs: string[] = [];
  const mapRefs: string[] = [];
  const inlineStyles: string[] = [];
  const cssOrder: string[] = [];
  const disabledScriptRefs: string[] = [];
  const allUrls: Array<{ kind: string; value: string }> = [];
  const rootFingerprints: string[] = [];
  let inlineScriptCount = 0;
  let dongleDetected = /\bdongle\b/i.test(source);

  walk(doc as ForensicNode, (node) => {
    const tag = node.tagName.toLowerCase();
    const attrs = attrsFor(node);
    if (tag === "html") htmlEl = node;
    if (tag === "body") bodyEl = node;
    const inlineStyle = normalizeText(attrs.style);
    if (inlineStyle) {
      inlineStyles.push(`${tag}:${inlineStyle.replace(/\s+/g, " ")}`);
      for (const ref of styleUrls(inlineStyle)) {
        allUrls.push({ kind: isImageRef(ref) ? "image" : isFontFileRef(ref) ? "font" : "style_url", value: ref });
        if (isImageRef(ref)) imageRefs.push(ref);
        if (isFontFileRef(ref)) fontRefs.push(ref);
      }
    }
    const rootFingerprint = rootHomeFingerprintFromElement(node);
    if (rootFingerprint) rootFingerprints.push(rootFingerprint);

    if (tag === "link") {
      const href = normalizeUrlRef(attrs.href);
      if (href) {
        allUrls.push({ kind: "link", value: href });
        if (isStylesheetRef(tag, attrs, href)) {
          stylesheetRefs.push(href);
          cssOrder.push(`link:${href}`);
        }
        if (isFontStylesheetRef(href) || isFontFileRef(href) || /\bdongle\b/i.test(href)) fontRefs.push(href);
        const provider = mapProviderForReference(href);
        if (provider) mapRefs.push(`${provider}:${href}`);
      }
    }

    if (tag === "style") {
      const css = nodeText(node);
      cssOrder.push("style:inline");
      if (/\bdongle\b/i.test(css)) dongleDetected = true;
      for (const ref of [...cssImportRefs(css), ...styleUrls(css)]) {
        allUrls.push({ kind: "style", value: ref });
        if (/\.css(?:[?#].*)?$/i.test(ref) || isFontStylesheetRef(ref)) stylesheetRefs.push(ref);
        if (isFontStylesheetRef(ref) || isFontFileRef(ref) || /\bdongle\b/i.test(ref)) fontRefs.push(ref);
        if (isImageRef(ref)) imageRefs.push(ref);
        const provider = mapProviderForReference(ref);
        if (provider) mapRefs.push(`${provider}:${ref}`);
      }
    }

    if (tag === "script") {
      const src = normalizeUrlRef(attrs.src);
      const disabled = attrs.type === "application/gnr8-disabled-script" || "data-gnr8-disabled-preview-script" in attrs;
      const ref = src ?? `inline-script:${inlineScriptCount + 1}:${nodeText(node).replace(/\s+/g, " ").slice(0, 80)}`;
      scriptRefs.push(ref);
      allUrls.push({ kind: "script", value: ref });
      if (disabled) disabledScriptRefs.push(ref);
      if (!src) inlineScriptCount += 1;
      const provider = mapProviderForReference(`${src ?? ""}\n${nodeText(node)}`);
      if (provider) mapRefs.push(`${provider}:${src ?? ref}`);
    }

    if (tag === "img" || tag === "source") {
      for (const attr of ["src", "data-src", "data-lazy-src", "data-original", "poster"]) {
        const ref = normalizeUrlRef(attrs[attr]);
        if (!ref) continue;
        imageRefs.push(ref);
        allUrls.push({ kind: "image", value: ref });
      }
      for (const attr of ["srcset", "data-srcset"]) {
        for (const ref of srcsetUrls(attrs[attr] ?? "")) {
          imageRefs.push(ref);
          allUrls.push({ kind: "image", value: ref });
        }
      }
    }

    if (tag === "iframe" || tag === "embed" || tag === "object") {
      const ref = normalizeUrlRef(attrs.src ?? attrs.data);
      if (ref) {
        iframeRefs.push(ref);
        allUrls.push({ kind: tag, value: ref });
        const provider = mapProviderForReference(ref);
        if (provider) mapRefs.push(`${provider}:${ref}`);
      }
    }
  });

  return {
    stage,
    html: source,
    htmlClasses: splitTokens(htmlEl ? attrsFor(htmlEl).class : ""),
    bodyClasses: splitTokens(bodyEl ? attrsFor(bodyEl).class : ""),
    htmlStyle: htmlEl ? normalizeText(attrsFor(htmlEl).style) || null : null,
    bodyStyle: bodyEl ? normalizeText(attrsFor(bodyEl).style) || null : null,
    inlineStyles: unique(inlineStyles, 120),
    stylesheetRefs: unique(stylesheetRefs),
    fontRefs: unique(fontRefs),
    imageRefs: unique(imageRefs),
    scriptRefs: unique(scriptRefs),
    iframeRefs: unique(iframeRefs),
    mapRefs: unique(mapRefs),
    allUrls: unique(allUrls.map((entry) => `${entry.kind}\0${entry.value}`), 200).map((entry) => {
      const [kind, value] = entry.split("\0");
      return { kind, value };
    }),
    cssOrder: unique(cssOrder, 120),
    disabledScriptRefs: unique(disabledScriptRefs),
    inlineScriptCount,
    duplicateRootHomeBlockCount: Math.max(0, rootFingerprints.length - new Set(rootFingerprints).size),
    dongleDetected,
  };
}

function changedUrls(left: HtmlInventory, right: HtmlInventory): UrlChangeEvidence[] {
  const out: UrlChangeEvidence[] = [];
  const missing = left.allUrls.filter((entry) => !right.allUrls.some((candidate) => candidate.kind === entry.kind && candidate.value === entry.value));
  const added = right.allUrls.filter((entry) => !left.allUrls.some((candidate) => candidate.kind === entry.kind && candidate.value === entry.value));
  for (const removed of missing) {
    const removedBase = basenameForUrl(removed.value);
    const match = added.find((candidate) => {
      if (candidate.kind !== removed.kind) return false;
      if (previewAssetRef(candidate.value) && externalRef(removed.value)) return true;
      return removedBase && basenameForUrl(candidate.value) === removedBase;
    });
    if (!match) continue;
    out.push({
      kind: removed.kind,
      before: removed.value,
      after: match.value,
      reason:
        previewAssetRef(match.value) && externalRef(removed.value)
          ? "external_to_preview_asset"
          : previewAssetRef(match.value)
            ? "preview_asset_rewrite"
            : "same_basename",
    });
    if (out.length >= 30) break;
  }
  return out;
}

function compareInventories(name: DiffName, left: HtmlInventory, right: HtmlInventory): PreviewForensicsStageDiff {
  return {
    name,
    fromStage: left.stage,
    toStage: right.stage,
    missingStylesheets: setDiff(left.stylesheetRefs, right.stylesheetRefs),
    missingFonts: setDiff(left.fontRefs, right.fontRefs),
    missingImages: setDiff(left.imageRefs, right.imageRefs),
    missingScripts: setDiff(left.scriptRefs, right.scriptRefs),
    missingIframes: setDiff(left.iframeRefs, right.iframeRefs),
    missingMaps: setDiff(left.mapRefs, right.mapRefs),
    addedStylesheets: setDiff(right.stylesheetRefs, left.stylesheetRefs),
    addedFonts: setDiff(right.fontRefs, left.fontRefs),
    addedImages: setDiff(right.imageRefs, left.imageRefs),
    addedScripts: setDiff(right.scriptRefs, left.scriptRefs),
    addedIframes: setDiff(right.iframeRefs, left.iframeRefs),
    addedMaps: setDiff(right.mapRefs, left.mapRefs),
    duplicatedRootHomeBlocks: {
      fromCount: left.duplicateRootHomeBlockCount,
      toCount: right.duplicateRootHomeBlockCount,
      appeared: right.duplicateRootHomeBlockCount > left.duplicateRootHomeBlockCount,
    },
    changedBodyHtmlClasses: {
      htmlRemoved: setDiff(left.htmlClasses, right.htmlClasses),
      htmlAdded: setDiff(right.htmlClasses, left.htmlClasses),
      bodyRemoved: setDiff(left.bodyClasses, right.bodyClasses),
      bodyAdded: setDiff(right.bodyClasses, left.bodyClasses),
    },
    changedInlineStyles: {
      removed: setDiff(left.inlineStyles, right.inlineStyles, 30),
      added: setDiff(right.inlineStyles, left.inlineStyles, 30),
    },
    changedUrls: changedUrls(left, right),
    blockedOrRewrittenExternalRefs: {
      removedExternalRefs: setDiff(
        left.allUrls.filter((entry) => externalRef(entry.value)).map((entry) => entry.value),
        right.allUrls.map((entry) => entry.value),
        30,
      ),
      addedPreviewAssetRefs: setDiff(
        right.allUrls.filter((entry) => previewAssetRef(entry.value)).map((entry) => entry.value),
        left.allUrls.map((entry) => entry.value),
        30,
      ),
      disabledScriptRefs: setDiff(right.disabledScriptRefs, left.disabledScriptRefs, 30),
    },
  };
}

function firstStageFor(diffs: PreviewForensicsStageDiff[], pick: (diff: PreviewForensicsStageDiff) => boolean): PreviewForensicsLossStage {
  const found = diffs.find(pick);
  if (!found) return "none";
  if (found.name === "import_loss") return "import";
  if (found.name === "preview_rewrite_runtime_loss") return "preview_response";
  if (found.name === "browser_script_mutation_loss") return "browser_runtime";
  return "unknown";
}

function artifactFor(stage: StageName, html: string | null, unavailableReason: string | null = null): PreviewForensicsHtmlArtifact {
  return {
    stage,
    available: html !== null,
    byteLength: html === null ? 0 : Buffer.byteLength(html),
    sha256: html === null ? null : stableSha256(html),
    html,
    unavailableReason,
  };
}

function cssOrderChanged(left: HtmlInventory, right: HtmlInventory): boolean {
  return JSON.stringify(left.cssOrder) !== JSON.stringify(right.cssOrder);
}

function recommendedRootCause(input: {
  duplication: PreviewForensicsLossStage;
  font: PreviewForensicsLossStage;
  images: PreviewForensicsLossStage;
  map: PreviewForensicsLossStage;
}): string {
  if (input.duplication === "browser_runtime") return "Duplication first appears after browser execution; isolate client-side mutation/runtime duplicate guard behavior before changing import or preview HTML.";
  if (input.duplication === "preview_response") return "Duplication appears between raw artifact and raw preview response; inspect raw preview route rewriting and duplicate injection guard output.";
  if (input.font === "preview_response") return "Font evidence is lost between raw artifact and raw preview response; inspect raw preview CSS/stylesheet rewrite evidence, especially Dongle and external font refs.";
  if (input.images === "preview_response") return "Image references are lost during raw preview response generation; inspect preview asset URL rewriting and file-map resolution.";
  if (input.map === "preview_response") return "Map iframe/script evidence is lost during raw preview response generation; inspect preview script policy and embed preservation evidence.";
  if (input.map === "browser_runtime") return "Map evidence changes only after browser execution; isolate map runtime scripts and post-load DOM mutation.";
  if (input.font === "import" || input.images === "import" || input.map === "import") return "Evidence is already missing from the persisted raw artifact; root cause is in original fetch/import persistence.";
  return "No deterministic loss stage detected from the provided artifacts.";
}

export function buildPreviewForensicsReport(input: {
  routePath: string;
  sourceUrl: string | null;
  rawFilePath: string | null;
  originalFetchedHtml: string | null;
  rawArtifactHtml: string | null;
  rawPreviewResponseHtml: string | null;
  browserDomHtml: string | null;
  unavailableReasons?: Partial<Record<StageName, string | null>>;
}): PreviewForensicsReport {
  const original = collectHtmlInventory("original", input.originalFetchedHtml);
  const rawArtifact = collectHtmlInventory("raw_artifact", input.rawArtifactHtml);
  const previewResponse = collectHtmlInventory("preview_response", input.rawPreviewResponseHtml);
  const browserDom = collectHtmlInventory("browser_dom", input.browserDomHtml);
  const diffs = [
    compareInventories("import_loss", original, rawArtifact),
    compareInventories("preview_rewrite_runtime_loss", rawArtifact, previewResponse),
    compareInventories("browser_script_mutation_loss", previewResponse, browserDom),
  ];
  const stageWhereDuplicationAppears = firstStageFor(diffs, (diff) => diff.duplicatedRootHomeBlocks.appeared);
  const stageWhereFontBreaks = firstStageFor(
    diffs,
    (diff) => diff.missingFonts.length > 0 || (diff.fromStage !== "browser_dom" && diff.toStage !== "original" && diff.missingStylesheets.some((ref) => /font|dongle/i.test(ref))),
  );
  const stageWhereImagesBreak = firstStageFor(diffs, (diff) => diff.missingImages.length > 0);
  const stageWhereMapBreaks = firstStageFor(diffs, (diff) => diff.missingMaps.length > 0 || diff.missingIframes.some((ref) => mapProviderForReference(ref)));
  const topMissingAssets = unique(
    diffs.flatMap((diff) => [
      ...diff.missingStylesheets,
      ...diff.missingFonts,
      ...diff.missingImages,
      ...diff.missingScripts,
      ...diff.missingIframes,
      ...diff.missingMaps,
    ]),
    30,
  );

  return {
    routePath: normalizePagePath(input.routePath),
    sourceUrl: input.sourceUrl,
    rawFilePath: input.rawFilePath,
    stageWhereDuplicationAppears,
    stageWhereFontBreaks,
    stageWhereImagesBreak,
    stageWhereMapBreaks,
    topMissingAssets,
    scriptMutationEvidence: {
      previewScriptCount: previewResponse.scriptRefs.length,
      browserScriptCount: browserDom.scriptRefs.length,
      previewDisabledScriptCount: previewResponse.disabledScriptRefs.length,
      browserDisabledScriptCount: browserDom.disabledScriptRefs.length,
      missingScriptsAfterBrowser: diffs[2].missingScripts,
      addedScriptsAfterBrowser: diffs[2].addedScripts,
      disabledScriptRefsAfterBrowser: diffs[2].blockedOrRewrittenExternalRefs.disabledScriptRefs,
    },
    cssCascadeEvidence: {
      originalCssOrder: original.cssOrder,
      rawArtifactCssOrder: rawArtifact.cssOrder,
      previewResponseCssOrder: previewResponse.cssOrder,
      browserDomCssOrder: browserDom.cssOrder,
      importCssOrderChanged: cssOrderChanged(original, rawArtifact),
      previewCssOrderChanged: cssOrderChanged(rawArtifact, previewResponse),
      browserCssOrderChanged: cssOrderChanged(previewResponse, browserDom),
      dongleDetectedByStage: {
        original: original.dongleDetected,
        raw_artifact: rawArtifact.dongleDetected,
        preview_response: previewResponse.dongleDetected,
        browser_dom: browserDom.dongleDetected,
      },
      classChanges: diffs.map((diff) => diff.changedBodyHtmlClasses),
      inlineStyleChanges: diffs.map((diff) => diff.changedInlineStyles),
    },
    iframeMapEvidence: {
      originalMapRefs: original.mapRefs,
      rawArtifactMapRefs: rawArtifact.mapRefs,
      previewResponseMapRefs: previewResponse.mapRefs,
      browserDomMapRefs: browserDom.mapRefs,
      missingMapRefsByStage: {
        import: diffs[0].missingMaps,
        preview_response: diffs[1].missingMaps,
        browser_runtime: diffs[2].missingMaps,
      },
    },
    recommendedRootCause: recommendedRootCause({
      duplication: stageWhereDuplicationAppears,
      font: stageWhereFontBreaks,
      images: stageWhereImagesBreak,
      map: stageWhereMapBreaks,
    }),
    diffs,
    artifacts: [
      artifactFor("original", input.originalFetchedHtml, input.unavailableReasons?.original ?? null),
      artifactFor("raw_artifact", input.rawArtifactHtml, input.unavailableReasons?.raw_artifact ?? null),
      artifactFor("preview_response", input.rawPreviewResponseHtml, input.unavailableReasons?.preview_response ?? null),
      artifactFor("browser_dom", input.browserDomHtml, input.unavailableReasons?.browser_dom ?? null),
    ],
  };
}

async function fetchOriginalHtml(url: string): Promise<string | null> {
  if (!url) return null;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "GNR8 preview forensics (+https://gnr8.local)",
    },
  });
  if (!response.ok) return null;
  return response.text();
}

export async function captureBrowserDomAfterRuntime(input: {
  url: string;
  cookieHeader?: string | null;
  waitMs?: number;
}): Promise<PreviewForensicsCaptureResult> {
  const waitMs = Math.max(0, Math.min(30_000, Math.floor(input.waitMs ?? 5_000)));
  let browser: Browser | null = null;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      extraHTTPHeaders: input.cookieHeader ? { cookie: input.cookieHeader } : undefined,
    });
    const page = await context.newPage();
    await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(waitMs);
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    await context.close();
    await browser.close();
    browser = null;
    return { status: "captured", html, url: input.url, waitMs };
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore cleanup failures; the capture error is more useful.
      }
    }
    return {
      status: "unavailable",
      html: null,
      url: input.url,
      waitMs,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function pickSourceUrl(input: {
  routeSourceUrl: string | null;
  routeFinalUrl: string | null;
  artifact: RawImportedSiteArtifact | RawTemplateSiteArtifact;
}): string | null {
  if (input.routeSourceUrl) return input.routeSourceUrl;
  if (input.routeFinalUrl) return input.routeFinalUrl;
  if (input.artifact.artifactType === "raw_imported_site") return input.artifact.metadata.sourceUrl || input.artifact.metadata.finalUrl || null;
  return null;
}

function previewUrlFor(input: { origin: string; siteVersionId: string; routePath: string }): string {
  const url = new URL(`/api/gnr8/runtime/versions/${encodeURIComponent(input.siteVersionId)}/preview`, input.origin);
  url.searchParams.set("mode", "raw_template_preview");
  url.searchParams.set("path", normalizePagePath(input.routePath));
  return url.toString();
}

export async function buildPreviewForensicsReportForRoute(input: {
  siteVersionId: string;
  routePath: string;
  origin: string;
  cookieHeader?: string | null;
  includeBrowserDom?: boolean;
  waitMs?: number;
  dbClient?: RuntimeStoreDbClient;
  deps?: Partial<ForensicsDependencies>;
}): Promise<PreviewForensicsReport> {
  const deps = { ...defaultForensicsDependencies, ...(input.deps ?? {}) };
  const siteVersion = (await deps.getSiteVersion(input.siteVersionId, { dbClient: input.dbClient })) as CanonicalSiteVersionSnapshot | null;
  if (!siteVersion) {
    return buildPreviewForensicsReport({
      routePath: input.routePath,
      sourceUrl: null,
      rawFilePath: null,
      originalFetchedHtml: null,
      rawArtifactHtml: null,
      rawPreviewResponseHtml: null,
      browserDomHtml: null,
      unavailableReasons: {
        original: "site_version_not_found",
        raw_artifact: "site_version_not_found",
        preview_response: "site_version_not_found",
        browser_dom: "site_version_not_found",
      },
    });
  }

  const importedArtifact = await deps.getRawImportedSiteArtifact(input.siteVersionId, { dbClient: input.dbClient });
  const templateArtifact = importedArtifact
    ? null
    : await deps.getRawTemplateSiteArtifact(input.siteVersionId, { dbClient: input.dbClient });
  const artifact = importedArtifact ?? templateArtifact;
  if (!artifact) {
    return buildPreviewForensicsReport({
      routePath: input.routePath,
      sourceUrl: null,
      rawFilePath: null,
      originalFetchedHtml: null,
      rawArtifactHtml: null,
      rawPreviewResponseHtml: null,
      browserDomHtml: null,
      unavailableReasons: {
        original: "raw_artifact_not_found",
        raw_artifact: "raw_artifact_not_found",
        preview_response: "raw_artifact_not_found",
        browser_dom: "raw_artifact_not_found",
      },
    });
  }

  const routeMapResolution = resolveRawTemplateRouteMapFile({
    siteVersionId: artifact.siteVersionId,
    requestedPath: input.routePath,
    entryHtmlPath: artifact.entryHtmlPath,
    fileMap: artifact.fileMap,
    importProvenanceSummary: siteVersion.importProvenanceSummary,
    routeMapServingEnabled: true,
  });
  const rawFilePath = routeMapResolution.outcome === "selected" ? routeMapResolution.rawFilePath : artifact.entryHtmlPath;
  const sourceUrl = pickSourceUrl({
    routeSourceUrl: routeMapResolution.outcome === "selected" || routeMapResolution.outcome === "file_missing" ? routeMapResolution.sourceUrl : null,
    routeFinalUrl: routeMapResolution.outcome === "selected" || routeMapResolution.outcome === "file_missing" ? routeMapResolution.finalUrl : null,
    artifact,
  });
  const [originalFetchedHtml, rawAsset, rawPreview] = await Promise.all([
    sourceUrl ? deps.fetchHtml(sourceUrl).catch(() => null) : Promise.resolve(null),
    deps.getRawTemplateSiteAsset({
      siteVersionId: input.siteVersionId,
      artifactId: artifact.id,
      filePath: rawFilePath,
      dbClient: input.dbClient,
    }),
    deps.renderSiteVersionPreview({
      siteVersionId: input.siteVersionId,
      path: input.routePath,
      mode: "raw_template_preview",
      requestCorrelationKey: `preview-forensics:${input.siteVersionId}:${normalizePagePath(input.routePath)}`,
      dbClient: input.dbClient,
    }),
  ]);
  const browserCapture = input.includeBrowserDom
    ? await deps.captureBrowserDom({
        url: previewUrlFor({ origin: input.origin, siteVersionId: input.siteVersionId, routePath: input.routePath }),
        cookieHeader: input.cookieHeader,
        waitMs: input.waitMs ?? 5_000,
      })
    : ({ status: "unavailable", html: null, url: "", waitMs: input.waitMs ?? 5_000, reason: "browser_capture_not_requested" } as const);

  return buildPreviewForensicsReport({
    routePath: input.routePath,
    sourceUrl,
    rawFilePath,
    originalFetchedHtml,
    rawArtifactHtml: rawAsset?.bytes.toString("utf8") ?? null,
    rawPreviewResponseHtml: rawPreview.html,
    browserDomHtml: browserCapture.html,
    unavailableReasons: {
      original: originalFetchedHtml ? null : sourceUrl ? "original_fetch_failed" : "source_url_unavailable",
      raw_artifact: rawAsset ? null : "raw_file_not_found",
      preview_response: null,
      browser_dom: browserCapture.status === "captured" ? null : browserCapture.reason,
    },
  });
}
