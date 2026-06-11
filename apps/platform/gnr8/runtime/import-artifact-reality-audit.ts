import crypto from "node:crypto";

import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

export type ImportArtifactRealityAuditInput = {
  routePath: string;
  sourceUrl: string;
  rawFilePath: string;
  sourceHtml: string;
  rawArtifactHtml: string;
  browserDomHtml?: string | null;
};

export type RefSample = {
  ref: string;
  kind: string;
};

export type InlineBlockSignature = {
  index: number;
  sha256: string;
  length: number;
  signature: string;
};

export type HtmlDocumentEvidence = {
  title: string | null;
  htmlClass: string | null;
  htmlStyle: string | null;
  bodyClass: string | null;
  bodyStyle: string | null;
  stylesheetLinks: string[];
  inlineStyleBlocks: InlineBlockSignature[];
  cssImportRefs: string[];
  cssFontFaceRefs: string[];
  googleFontRefs: string[];
  scriptRefs: string[];
  inlineScripts: InlineBlockSignature[];
  imageRefs: string[];
  srcsetRefs: string[];
  lazyImageAttrs: RefSample[];
  iframeEmbedObjectRefs: string[];
  mapRefs: RefSample[];
  formRefs: RefSample[];
  galleryRefs: RefSample[];
  accessibilityWidgetRefs: RefSample[];
  allRefs: RefSample[];
  dongleDeclarations: string[];
};

export type ImportArtifactRealityAuditReport = {
  routePath: string;
  sourceUrl: string;
  rawFilePath: string;
  sourceHtmlHash: string;
  rawArtifactHtmlHash: string;
  htmlChanged: boolean;
  missingStylesheetsInArtifact: string[];
  missingScriptsInArtifact: string[];
  missingImagesInArtifact: string[];
  missingIframesInArtifact: string[];
  missingFontSourcesInArtifact: string[];
  missingMapRefsInArtifact: string[];
  missingFormRefsInArtifact: string[];
  missingGalleryRefsInArtifact: string[];
  sourceOnlyExternalRefs: RefSample[];
  artifactOnlyRefs: RefSample[];
  dongleEvidence: {
    sourceHasDongleDeclaration: boolean;
    artifactHasDongleDeclaration: boolean;
    sourceDongleFontSources: string[];
    artifactDongleFontSources: string[];
    artifactKeepsDongleDeclarationWithoutSource: boolean;
  };
  mapEvidence: {
    sourceMapRefs: RefSample[];
    artifactMapRefs: RefSample[];
    browserDomMapRefs: RefSample[];
    embeddedMapInSourceHtml: boolean;
    externalDirectionsLinkOnlyInSourceHtml: boolean;
    monoMapWidgetInSourceHtml: boolean;
    jsGeneratedMapLikely: boolean;
    rawHtmlCapturable: boolean;
  };
  galleryEvidence: {
    sourceGalleryRefs: RefSample[];
    artifactGalleryRefs: RefSample[];
    galleryRefsMissingInArtifact: boolean;
  };
  formEvidence: {
    sourceFormRefs: RefSample[];
    artifactFormRefs: RefSample[];
    formRefsMissingInArtifact: boolean;
  };
  accessibilityWidgetEvidence: {
    sourceRefs: RefSample[];
    artifactRefs: RefSample[];
    yAccessibilityPresentInSource: boolean;
    yAccessibilityPresentInArtifact: boolean;
    yAccessibilityMissingInArtifact: boolean;
    yAccessibilityPossiblyRewritten: boolean;
  };
  importLossStageRecommendation: string;
  sourceSummary: Pick<
    HtmlDocumentEvidence,
    | "title"
    | "htmlClass"
    | "htmlStyle"
    | "bodyClass"
    | "bodyStyle"
    | "stylesheetLinks"
    | "inlineStyleBlocks"
    | "cssImportRefs"
    | "cssFontFaceRefs"
    | "googleFontRefs"
    | "scriptRefs"
    | "inlineScripts"
    | "imageRefs"
    | "srcsetRefs"
    | "lazyImageAttrs"
    | "iframeEmbedObjectRefs"
  >;
  artifactSummary: Pick<
    HtmlDocumentEvidence,
    | "title"
    | "htmlClass"
    | "htmlStyle"
    | "bodyClass"
    | "bodyStyle"
    | "stylesheetLinks"
    | "inlineStyleBlocks"
    | "cssImportRefs"
    | "cssFontFaceRefs"
    | "googleFontRefs"
    | "scriptRefs"
    | "inlineScripts"
    | "imageRefs"
    | "srcsetRefs"
    | "lazyImageAttrs"
    | "iframeEmbedObjectRefs"
  >;
};

const MAX_LIST_ITEMS = 30;
const MAX_REF_SAMPLES = 24;

const LAZY_IMAGE_ATTRS = new Set([
  "data-src",
  "data-srcset",
  "data-original",
  "data-lazy",
  "data-lazy-src",
  "data-lazy-srcset",
  "data-bg",
  "data-bg-src",
  "data-background",
  "data-background-image",
  "data-thumb",
]);

const MAP_PATTERN =
  /\b(?:google(?:apis)?\.com\/maps|maps\.google|openstreetmap|osm|leaflet|mapbox|openlayers|ol\.js|mono[_-]?(?:map|osmap)|osmap|map-container|data-req-lazy=["'][^"']*(?:mapbox|leaflet|osmap)|google\.com\/maps\/dir)\b/i;
const EMBEDDED_MAP_PATTERN = /\b(?:google(?:apis)?\.com\/maps\/embed|openstreetmap\.org\/export\/embed|mapbox|leaflet|openlayers|osmap|map-container)\b/i;
const DIRECTIONS_MAP_PATTERN = /\b(?:google\.com\/maps\/dir|maps\.google\.[^/]+\/maps\/dir|openstreetmap\.org\/directions|openstreetmap\.org\/search)\b/i;
const FORM_PATTERN = /\b(?:form|contact|oneclickcontact|recaptcha|hcaptcha|turnstile|captcha|mailchimp|sendgrid|hubspot|newsletter|comment)\b/i;
const GALLERY_PATTERN = /\b(?:gallery|galerija|lightbox|slider|carousel|swiper|slick|fancybox|photoswipe|magnific|glide|splide)\b/i;
const ACCESSIBILITY_PATTERN = /\b(?:yaccessibility|accessibility|a11y|userway|accessibe|pojo-a11y|enable[_-]?accessibility)\b/i;
const GOOGLE_FONT_PATTERN = /\b(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\b/i;
const DONGLE_PATTERN = /\bdongle\b/i;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function compactWhitespace(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => String(value ?? "").trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function topStrings(values: Iterable<string>, max = MAX_LIST_ITEMS): string[] {
  return uniqueSorted(values).slice(0, max);
}

function refKey(sample: RefSample): string {
  return `${sample.kind}:${sample.ref}`;
}

function topRefSamples(values: Iterable<RefSample>, max = MAX_REF_SAMPLES): RefSample[] {
  const byKey = new Map<string, RefSample>();
  for (const sample of values) {
    const ref = String(sample.ref ?? "").trim();
    const kind = String(sample.kind ?? "").trim();
    if (!ref || !kind) continue;
    const normalized = { ref, kind };
    if (!byKey.has(refKey(normalized))) byKey.set(refKey(normalized), normalized);
  }
  return [...byKey.values()].sort((left, right) => refKey(left).localeCompare(refKey(right))).slice(0, max);
}

function setDifference(left: Iterable<string>, right: Iterable<string>): string[] {
  const rightSet = new Set(uniqueSorted(right));
  return topStrings(uniqueSorted(left).filter((value) => !rightSet.has(value)));
}

function sampleDifference(left: Iterable<RefSample>, right: Iterable<RefSample>): RefSample[] {
  const rightSet = new Set(topRefSamples(right, Number.POSITIVE_INFINITY).map(refKey));
  return topRefSamples(
    topRefSamples(left, Number.POSITIVE_INFINITY).filter((sample) => !rightSet.has(refKey(sample))),
    MAX_REF_SAMPLES,
  );
}

function isExternalRef(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^\/\//.test(value);
}

function getAttr(element: Element, name: string): string | null {
  const attr = element.attrs.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
  return attr?.value?.trim() || null;
}

function hasRel(element: Element, token: string): boolean {
  return (getAttr(element, "rel") ?? "")
    .split(/\s+/)
    .map((value) => value.toLowerCase())
    .includes(token.toLowerCase());
}

function isElement(node: Node): node is Element {
  return "tagName" in node && typeof node.tagName === "string";
}

function childNodes(node: Node): Node[] {
  return "childNodes" in node && Array.isArray(node.childNodes) ? (node.childNodes as Node[]) : [];
}

function textContent(node: Node): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  return childNodes(node).map(textContent).join("");
}

function createInlineSignature(value: string, index: number): InlineBlockSignature {
  const normalized = compactWhitespace(value);
  return {
    index,
    sha256: sha256(value),
    length: value.length,
    signature: normalized.slice(0, 180),
  };
}

function cssImportRefs(css: string): string[] {
  const refs: string[] = [];
  for (const match of css.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?/gi)) {
    refs.push(String(match[2] ?? "").trim());
  }
  return topStrings(refs);
}

function cssFontFaceRefs(css: string): string[] {
  const refs: string[] = [];
  for (const block of css.matchAll(/@font-face\s*\{([\s\S]*?)\}/gi)) {
    const body = String(block[1] ?? "");
    for (const match of body.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
      refs.push(String(match[2] ?? "").trim());
    }
  }
  return topStrings(refs);
}

function dongleDeclarationsFromCss(css: string): string[] {
  const declarations: string[] = [];
  for (const match of css.matchAll(/font-family\s*:\s*[^;{}]*\bdongle\b[^;{}]*/gi)) {
    declarations.push(compactWhitespace(match[0] ?? ""));
  }
  for (const block of css.matchAll(/@font-face\s*\{[\s\S]*?\bdongle\b[\s\S]*?\}/gi)) {
    declarations.push(compactWhitespace(block[0] ?? "").slice(0, 180));
  }
  return topStrings(declarations);
}

function splitSrcset(value: string): string[] {
  return topStrings(
    String(value ?? "")
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean),
  );
}

function addCategorizedRef(target: RefSample[], ref: string, kind: string): void {
  const normalized = String(ref ?? "").trim();
  if (!normalized) return;
  target.push({ ref: normalized, kind });
}

function refMatches(samples: RefSample[], pattern: RegExp): RefSample[] {
  return topRefSamples(samples.filter((sample) => pattern.test(`${sample.kind}:${sample.ref}`)));
}

export function extractHtmlDocumentEvidence(html: string): HtmlDocumentEvidence {
  const document = parse(html || "");
  const stylesheetLinks: string[] = [];
  const styleTexts: string[] = [];
  const scriptRefs: string[] = [];
  const scriptTexts: string[] = [];
  const imageRefs: string[] = [];
  const srcsetRefs: string[] = [];
  const lazyImageAttrs: RefSample[] = [];
  const iframeEmbedObjectRefs: string[] = [];
  const allRefs: RefSample[] = [];
  let title: string | null = null;
  let htmlClass: string | null = null;
  let htmlStyle: string | null = null;
  let bodyClass: string | null = null;
  let bodyStyle: string | null = null;

  function visit(node: Node): void {
    if (isElement(node)) {
      const tagName = node.tagName.toLowerCase();
      if (tagName === "title" && title === null) title = compactWhitespace(textContent(node)) || null;
      if (tagName === "html") {
        htmlClass = getAttr(node, "class");
        htmlStyle = getAttr(node, "style");
      }
      if (tagName === "body") {
        bodyClass = getAttr(node, "class");
        bodyStyle = getAttr(node, "style");
      }
      if (tagName === "link" && hasRel(node, "stylesheet")) {
        const href = getAttr(node, "href");
        if (href) {
          stylesheetLinks.push(href);
          addCategorizedRef(allRefs, href, "stylesheet");
        }
      }
      if (tagName === "style") styleTexts.push(textContent(node));
      if (tagName === "script") {
        const src = getAttr(node, "src");
        if (src) {
          scriptRefs.push(src);
          addCategorizedRef(allRefs, src, "script");
        } else {
          scriptTexts.push(textContent(node));
        }
      }
      if (tagName === "img") {
        const src = getAttr(node, "src");
        if (src) {
          imageRefs.push(src);
          addCategorizedRef(allRefs, src, "image");
        }
      }
      if (tagName === "source" || tagName === "img") {
        const srcset = getAttr(node, "srcset");
        for (const ref of splitSrcset(srcset ?? "")) {
          srcsetRefs.push(ref);
          addCategorizedRef(allRefs, ref, "srcset");
        }
      }
      if (tagName === "iframe" || tagName === "embed") {
        const src = getAttr(node, "src");
        if (src) {
          iframeEmbedObjectRefs.push(src);
          addCategorizedRef(allRefs, src, tagName);
        }
      }
      if (tagName === "object") {
        const data = getAttr(node, "data");
        if (data) {
          iframeEmbedObjectRefs.push(data);
          addCategorizedRef(allRefs, data, "object");
        }
      }
      if (tagName === "a") {
        const href = getAttr(node, "href");
        if (href) addCategorizedRef(allRefs, href, "anchor");
      }
      if (tagName === "form") {
        const action = getAttr(node, "action") ?? "";
        const method = getAttr(node, "method") ?? "get";
        const id = getAttr(node, "id") ?? getAttr(node, "name") ?? "";
        addCategorizedRef(allRefs, `form:${method}:${action}:${id}`, "form");
      }

      for (const attr of node.attrs) {
        const attrName = attr.name.toLowerCase();
        const attrValue = String(attr.value ?? "").trim();
        if (!attrValue) continue;
        if (attrName === "style") styleTexts.push(attrValue);
        if (LAZY_IMAGE_ATTRS.has(attrName)) {
          addCategorizedRef(lazyImageAttrs, attrValue, attrName);
          addCategorizedRef(allRefs, attrValue, attrName);
        }
        if (/^(?:href|src|data|action|poster|content)$/.test(attrName) && GOOGLE_FONT_PATTERN.test(attrValue)) {
          addCategorizedRef(allRefs, attrValue, attrName);
        }
        if (MAP_PATTERN.test(`${tagName} ${attrName} ${attrValue}`)) {
          addCategorizedRef(allRefs, attrValue || `${tagName}:${attrName}`, `map:${tagName}:${attrName}`);
        }
        if (FORM_PATTERN.test(`${tagName} ${attrName} ${attrValue}`)) {
          addCategorizedRef(allRefs, attrValue || `${tagName}:${attrName}`, `form:${tagName}:${attrName}`);
        }
        if (GALLERY_PATTERN.test(`${tagName} ${attrName} ${attrValue}`)) {
          addCategorizedRef(allRefs, attrValue || `${tagName}:${attrName}`, `gallery:${tagName}:${attrName}`);
        }
        if (ACCESSIBILITY_PATTERN.test(`${tagName} ${attrName} ${attrValue}`)) {
          addCategorizedRef(allRefs, attrValue || `${tagName}:${attrName}`, `accessibility:${tagName}:${attrName}`);
        }
      }
    }
    for (const child of childNodes(node)) visit(child);
  }

  visit(document as Node);

  for (const css of styleTexts) {
    for (const ref of cssImportRefs(css)) addCategorizedRef(allRefs, ref, "css-import");
    for (const ref of cssFontFaceRefs(css)) addCategorizedRef(allRefs, ref, "css-font-face");
  }
  for (const script of scriptTexts) {
    if (MAP_PATTERN.test(script)) addCategorizedRef(allRefs, `inline-script:${sha256(script).slice(0, 12)}`, "map:inline-script");
    if (FORM_PATTERN.test(script)) addCategorizedRef(allRefs, `inline-script:${sha256(script).slice(0, 12)}`, "form:inline-script");
    if (GALLERY_PATTERN.test(script)) addCategorizedRef(allRefs, `inline-script:${sha256(script).slice(0, 12)}`, "gallery:inline-script");
    if (ACCESSIBILITY_PATTERN.test(script)) addCategorizedRef(allRefs, `inline-script:${sha256(script).slice(0, 12)}`, "accessibility:inline-script");
  }

  const inlineStyleBlocks = styleTexts.map(createInlineSignature);
  const inlineScripts = scriptTexts.map(createInlineSignature);
  const cssImports = styleTexts.flatMap(cssImportRefs);
  const fontFaceRefs = styleTexts.flatMap(cssFontFaceRefs);
  const googleFontRefs = topStrings(
    [...stylesheetLinks, ...cssImports, ...fontFaceRefs, ...topRefSamples(allRefs).map((sample) => sample.ref)].filter((ref) =>
      GOOGLE_FONT_PATTERN.test(ref),
    ),
  );
  const dongleDeclarations = topStrings([
    ...styleTexts.flatMap(dongleDeclarationsFromCss),
    ...stylesheetLinks.filter((ref) => DONGLE_PATTERN.test(ref)),
    ...googleFontRefs.filter((ref) => DONGLE_PATTERN.test(ref)),
  ]);

  return {
    title,
    htmlClass,
    htmlStyle,
    bodyClass,
    bodyStyle,
    stylesheetLinks: topStrings(stylesheetLinks),
    inlineStyleBlocks,
    cssImportRefs: topStrings(cssImports),
    cssFontFaceRefs: topStrings(fontFaceRefs),
    googleFontRefs,
    scriptRefs: topStrings(scriptRefs),
    inlineScripts,
    imageRefs: topStrings(imageRefs),
    srcsetRefs: topStrings(srcsetRefs),
    lazyImageAttrs: topRefSamples(lazyImageAttrs),
    iframeEmbedObjectRefs: topStrings(iframeEmbedObjectRefs),
    mapRefs: refMatches(allRefs, MAP_PATTERN),
    formRefs: refMatches(allRefs, FORM_PATTERN),
    galleryRefs: refMatches(allRefs, GALLERY_PATTERN),
    accessibilityWidgetRefs: refMatches(allRefs, ACCESSIBILITY_PATTERN),
    allRefs: topRefSamples(allRefs, Number.POSITIVE_INFINITY),
    dongleDeclarations,
  };
}

function relevantFontSources(evidence: HtmlDocumentEvidence): string[] {
  return topStrings([...evidence.googleFontRefs, ...evidence.cssFontFaceRefs, ...evidence.cssImportRefs.filter((ref) => GOOGLE_FONT_PATTERN.test(ref))]);
}

function missingCategorizedRefs(source: RefSample[], artifact: RefSample[]): string[] {
  return topStrings(sampleDifference(source, artifact).map((sample) => sample.ref));
}

function hasYAccessibility(samples: RefSample[]): boolean {
  return samples.some((sample) => /\byaccessibility\b/i.test(`${sample.kind}:${sample.ref}`));
}

function buildRecommendation(input: {
  missingSourceRefs: boolean;
  jsGeneratedMapLikely: boolean;
  missingFontSources: boolean;
  missingScripts: boolean;
  missingMapRefs: boolean;
  missingFormRefs: boolean;
  missingGalleryRefs: boolean;
}): string {
  if (input.jsGeneratedMapLikely && !input.missingSourceRefs) {
    return "raw_html_capture_limit: browser DOM evidence contains map refs absent from live source HTML, so a raw-HTML importer cannot capture that map without rendered DOM capture.";
  }
  if (!input.missingSourceRefs) {
    return "no_import_ref_loss_detected: source and artifact refs match within audited categories.";
  }
  const losses = [
    input.missingFontSources ? "font_source" : null,
    input.missingScripts ? "script" : null,
    input.missingMapRefs ? "map" : null,
    input.missingFormRefs ? "form" : null,
    input.missingGalleryRefs ? "gallery" : null,
  ].filter(Boolean);
  return `raw_import_artifact_loss_suspected: source HTML refs are absent from persisted raw artifact (${losses.join(", ") || "general_ref"}). Investigate importer acquisition/persistence before preview rendering.`;
}

export function buildImportArtifactRealityAuditReport(input: ImportArtifactRealityAuditInput): ImportArtifactRealityAuditReport {
  const source = extractHtmlDocumentEvidence(input.sourceHtml);
  const artifact = extractHtmlDocumentEvidence(input.rawArtifactHtml);
  const browserDom = input.browserDomHtml ? extractHtmlDocumentEvidence(input.browserDomHtml) : null;

  const missingStylesheetsInArtifact = setDifference(source.stylesheetLinks, artifact.stylesheetLinks);
  const missingScriptsInArtifact = setDifference(source.scriptRefs, artifact.scriptRefs);
  const missingImagesInArtifact = topStrings([
    ...setDifference(source.imageRefs, artifact.imageRefs),
    ...setDifference(source.srcsetRefs, artifact.srcsetRefs),
    ...missingCategorizedRefs(source.lazyImageAttrs, artifact.lazyImageAttrs),
  ]);
  const missingIframesInArtifact = setDifference(source.iframeEmbedObjectRefs, artifact.iframeEmbedObjectRefs);
  const sourceFontSources = relevantFontSources(source);
  const artifactFontSources = relevantFontSources(artifact);
  const missingFontSourcesInArtifact = setDifference(sourceFontSources, artifactFontSources);
  const missingMapRefsInArtifact = missingCategorizedRefs(source.mapRefs, artifact.mapRefs);
  const missingFormRefsInArtifact = missingCategorizedRefs(source.formRefs, artifact.formRefs);
  const missingGalleryRefsInArtifact = missingCategorizedRefs(source.galleryRefs, artifact.galleryRefs);
  const sourceOnlyExternalRefs = topRefSamples(sampleDifference(source.allRefs.filter((sample) => isExternalRef(sample.ref)), artifact.allRefs));
  const artifactOnlyRefs = topRefSamples(sampleDifference(artifact.allRefs, source.allRefs));
  const browserDomMapRefs = browserDom?.mapRefs ?? [];
  const embeddedMapInSourceHtml =
    source.iframeEmbedObjectRefs.some((ref) => EMBEDDED_MAP_PATTERN.test(ref)) ||
    source.mapRefs.some((sample) => EMBEDDED_MAP_PATTERN.test(`${sample.kind}:${sample.ref}`));
  const sourceHasOnlyDirections =
    source.mapRefs.length > 0 &&
    source.mapRefs.every((sample) => DIRECTIONS_MAP_PATTERN.test(sample.ref)) &&
    !embeddedMapInSourceHtml;
  const monoMapWidgetInSourceHtml = source.mapRefs.some((sample) => /\b(?:mono[_-]?map|osmap|map-container)\b/i.test(`${sample.kind}:${sample.ref}`));
  const jsGeneratedMapLikely = source.mapRefs.length === 0 && browserDomMapRefs.length > 0;
  const rawHtmlCapturable = source.mapRefs.length > 0;
  const yAccessibilityPresentInSource = hasYAccessibility(source.accessibilityWidgetRefs);
  const yAccessibilityPresentInArtifact = hasYAccessibility(artifact.accessibilityWidgetRefs);
  const yAccessibilityMissingInArtifact = yAccessibilityPresentInSource && !yAccessibilityPresentInArtifact;
  const yAccessibilityPossiblyRewritten =
    yAccessibilityPresentInSource &&
    yAccessibilityPresentInArtifact &&
    sampleDifference(source.accessibilityWidgetRefs, artifact.accessibilityWidgetRefs).length > 0;
  const missingSourceRefs =
    missingStylesheetsInArtifact.length > 0 ||
    missingScriptsInArtifact.length > 0 ||
    missingImagesInArtifact.length > 0 ||
    missingIframesInArtifact.length > 0 ||
    missingFontSourcesInArtifact.length > 0 ||
    missingMapRefsInArtifact.length > 0 ||
    missingFormRefsInArtifact.length > 0 ||
    missingGalleryRefsInArtifact.length > 0 ||
    yAccessibilityMissingInArtifact;

  return {
    routePath: input.routePath,
    sourceUrl: input.sourceUrl,
    rawFilePath: input.rawFilePath,
    sourceHtmlHash: sha256(input.sourceHtml),
    rawArtifactHtmlHash: sha256(input.rawArtifactHtml),
    htmlChanged: sha256(input.sourceHtml) !== sha256(input.rawArtifactHtml),
    missingStylesheetsInArtifact,
    missingScriptsInArtifact,
    missingImagesInArtifact,
    missingIframesInArtifact,
    missingFontSourcesInArtifact,
    missingMapRefsInArtifact,
    missingFormRefsInArtifact,
    missingGalleryRefsInArtifact,
    sourceOnlyExternalRefs,
    artifactOnlyRefs,
    dongleEvidence: {
      sourceHasDongleDeclaration: source.dongleDeclarations.length > 0,
      artifactHasDongleDeclaration: artifact.dongleDeclarations.length > 0,
      sourceDongleFontSources: sourceFontSources.filter((ref) => DONGLE_PATTERN.test(ref)),
      artifactDongleFontSources: artifactFontSources.filter((ref) => DONGLE_PATTERN.test(ref)),
      artifactKeepsDongleDeclarationWithoutSource:
        artifact.dongleDeclarations.length > 0 && artifactFontSources.filter((ref) => DONGLE_PATTERN.test(ref)).length === 0,
    },
    mapEvidence: {
      sourceMapRefs: source.mapRefs,
      artifactMapRefs: artifact.mapRefs,
      browserDomMapRefs,
      embeddedMapInSourceHtml,
      externalDirectionsLinkOnlyInSourceHtml: sourceHasOnlyDirections,
      monoMapWidgetInSourceHtml,
      jsGeneratedMapLikely,
      rawHtmlCapturable,
    },
    galleryEvidence: {
      sourceGalleryRefs: source.galleryRefs,
      artifactGalleryRefs: artifact.galleryRefs,
      galleryRefsMissingInArtifact: missingGalleryRefsInArtifact.length > 0,
    },
    formEvidence: {
      sourceFormRefs: source.formRefs,
      artifactFormRefs: artifact.formRefs,
      formRefsMissingInArtifact: missingFormRefsInArtifact.length > 0,
    },
    accessibilityWidgetEvidence: {
      sourceRefs: source.accessibilityWidgetRefs,
      artifactRefs: artifact.accessibilityWidgetRefs,
      yAccessibilityPresentInSource,
      yAccessibilityPresentInArtifact,
      yAccessibilityMissingInArtifact,
      yAccessibilityPossiblyRewritten,
    },
    importLossStageRecommendation: buildRecommendation({
      missingSourceRefs,
      jsGeneratedMapLikely,
      missingFontSources: missingFontSourcesInArtifact.length > 0,
      missingScripts: missingScriptsInArtifact.length > 0,
      missingMapRefs: missingMapRefsInArtifact.length > 0,
      missingFormRefs: missingFormRefsInArtifact.length > 0,
      missingGalleryRefs: missingGalleryRefsInArtifact.length > 0,
    }),
    sourceSummary: {
      title: source.title,
      htmlClass: source.htmlClass,
      htmlStyle: source.htmlStyle,
      bodyClass: source.bodyClass,
      bodyStyle: source.bodyStyle,
      stylesheetLinks: source.stylesheetLinks,
      inlineStyleBlocks: source.inlineStyleBlocks,
      cssImportRefs: source.cssImportRefs,
      cssFontFaceRefs: source.cssFontFaceRefs,
      googleFontRefs: source.googleFontRefs,
      scriptRefs: source.scriptRefs,
      inlineScripts: source.inlineScripts,
      imageRefs: source.imageRefs,
      srcsetRefs: source.srcsetRefs,
      lazyImageAttrs: source.lazyImageAttrs,
      iframeEmbedObjectRefs: source.iframeEmbedObjectRefs,
    },
    artifactSummary: {
      title: artifact.title,
      htmlClass: artifact.htmlClass,
      htmlStyle: artifact.htmlStyle,
      bodyClass: artifact.bodyClass,
      bodyStyle: artifact.bodyStyle,
      stylesheetLinks: artifact.stylesheetLinks,
      inlineStyleBlocks: artifact.inlineStyleBlocks,
      cssImportRefs: artifact.cssImportRefs,
      cssFontFaceRefs: artifact.cssFontFaceRefs,
      googleFontRefs: artifact.googleFontRefs,
      scriptRefs: artifact.scriptRefs,
      inlineScripts: artifact.inlineScripts,
      imageRefs: artifact.imageRefs,
      srcsetRefs: artifact.srcsetRefs,
      lazyImageAttrs: artifact.lazyImageAttrs,
      iframeEmbedObjectRefs: artifact.iframeEmbedObjectRefs,
    },
  };
}
