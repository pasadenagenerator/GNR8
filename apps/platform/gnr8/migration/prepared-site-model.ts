import type { AssetKind, AssetReferenceKind, AssetValidationStatus } from "../import/import-contract";
import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import { parse } from "parse5";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";
import { extractDeterministicMinimalSourceMarkupHtml } from "./source-markup-preservation";
import { consolidateSections, type RawBlock, type SectionConsolidationResult } from "../section-consolidation";

export const PREPARED_SITE_MODEL_VERSION = "1.7.0" as const;

export type PreparedSitePreparationStatus = "ready" | "ready_with_warnings" | "blocked";

export type PreparedDocumentOriginalKind = "entry_html" | "html_document";

export type PreparedDocumentRecord = {
  id: string;
  path: string;
  isEntry: boolean;
  originalKind: PreparedDocumentOriginalKind;

  normalizedHtmlAvailable: boolean;
  serializedDomAvailable: boolean;
  nodeCount: number;
  parseWarningCount: number;
  decodingHadErrors: boolean;
  effectivelyEmpty: boolean;

  contentSha256: string;
  byteLength: number;

  assetReferenceIds: string[];

  /**
   * Compact, deterministic structural outline of `<body>` suitable for phase-1 layout preparation.
   * This avoids duplicating full DOM payloads while enabling stable block extraction later.
   *
   * `null` when no serialized DOM snapshot was available for this document.
   */
  domOutline: PreparedDocumentDomOutline | null;
  fidelity: PreparedDocumentFidelityProjection;
  semantic: PreparedPageSemanticModel | null;
};

export type SemanticConfidence = "low" | "medium" | "high";

export type SemanticDiagnosticCode =
  | "SEMANTIC_SECTION_LOW_CONFIDENCE"
  | "SEMANTIC_PAGE_TYPE_UNKNOWN"
  | "BRAND_SIGNAL_WEAK"
  | "CTA_PRIMARY_UNCLEAR"
  | "HERO_SECTION_UNCLEAR"
  | "NAVIGATION_SECTION_UNCLEAR"
  | "FOOTER_SECTION_UNCLEAR"
  | "SECTION_CONSOLIDATION_APPLIED"
  | "SECTION_MERGE_HEAVY"
  | "SECTION_MERGE_MINIMAL"
  | "SECTION_BOUNDARY_UNCERTAIN"
  | "FOOTER_FALSE_POSITIVE_PREVENTED";

export type SemanticDiagnostic = {
  code: SemanticDiagnosticCode;
  severity: "info" | "warning";
  message: string;
  pageId: string | null;
  sectionId: string | null;
};

export type SectionSemanticType =
  | "header"
  | "navigation"
  | "hero"
  | "cta"
  | "about"
  | "services"
  | "features"
  | "gallery"
  | "testimonials"
  | "contact"
  | "footer"
  | "unknown";

export type HeroCompositionHint = "text_only" | "split_media" | "centered_cta" | "image_first" | "unknown";

export type SectionDensitySignal = {
  textDensity: number;
  imageDensity: number;
  headingDensity: number;
  ctaDensity: number;
  repetitionDensity: number;
  readabilityTendency: "compact" | "balanced" | "readable";
};

export type CtaCandidate = {
  label: string;
  confidence: SemanticConfidence;
  rationale: string[];
};

export type SectionSemanticModel = {
  sectionId: string;
  sourceDomPath: string;
  sourceDomPaths: string[];
  blockIds: string[];
  domIndexStart: number;
  domIndexEnd: number;
  consolidatedBlockCount: number;
  consolidationConfidence: number;
  consolidationRationale: string[];
  consolidationMergeDecisions: string[];
  ordinalIndex: number;
  inferredType: SectionSemanticType;
  confidence: SemanticConfidence;
  rationale: string[];
  candidateSignals: {
    heroCandidate: number;
    ctaCandidate: number;
    contentCandidate: number;
    footerCandidate: number;
  };
  heroComposition: HeroCompositionHint | null;
  mediaDensity: number;
  galleryLikeConfidence: SemanticConfidence;
  ctaCandidates: CtaCandidate[];
  likelyPrimaryCta: CtaCandidate | null;
  density: SectionDensitySignal;
};

export type BrandSignalModel = {
  dominantColors: string[];
  accentColors: string[];
  neutralPaletteHints: string[];
  fontFamilyHints: string[];
  fontCategoryHints: Array<"sans" | "serif" | "display" | "monospace">;
  visualTone: "formal" | "playful" | "neutral";
  confidence: SemanticConfidence;
  rationale: string[];
};

export type PageSemanticType =
  | "home"
  | "about"
  | "services"
  | "contact"
  | "product_landing"
  | "gallery_portfolio"
  | "unknown";

export type PageSemanticModel = {
  pageType: PageSemanticType;
  confidence: SemanticConfidence;
  rationale: string[];
  styleFamily: "corporate" | "service" | "gallery" | "editorial" | "unknown";
};

export type PreparedPageSemanticModel = {
  kind: "prepared_page_semantic_model_v1";
  consolidation: {
    mode: SectionConsolidationResult["mode"];
    deepFragmentationDetected: boolean;
    inputBlockCount: number;
    outputSectionCount: number;
  };
  page: PageSemanticModel;
  sections: SectionSemanticModel[];
  ctaCandidates: CtaCandidate[];
  primaryCta: CtaCandidate | null;
  brandSignals: BrandSignalModel;
  diagnostics: SemanticDiagnostic[];
};

export type PreparedSiteModel = {
  kind: "prepared_site_model_v1";
  modelVersion: typeof PREPARED_SITE_MODEL_VERSION;

  source: {
    importContractVersion: ImportOutput["contractVersion"];
    importManifestVersion: ImportManifest["manifestVersion"];
    fingerprints: ImportOutput["documentMeta"]["fingerprints"];

    sourceKind: ImportManifest["sourceKind"];
    entryHtmlPath: string | null;
    htmlFilePaths: string[];
    assetsDirPath: string | null;
  };

  status: PreparedSitePreparationStatus;

  siteSummary: {
    documentCount: number;
    entryDocumentId: string | null;
    documentsWithNormalizedHtmlCount: number;
    documentsWithDomCount: number;
    totalNodeCount: number;
    totalParseWarningCount: number;
    effectivelyEmpty: boolean;
  };

  preparedAssets: {
    assetFiles: {
      totalCount: number;
    };
    references: {
      totalCount: number;
      referencesByAssetKind: Record<AssetKind, number>;
      referencesByReferenceKind: Record<AssetReferenceKind, number>;
      referencesByValidationStatus: Record<AssetValidationStatus, number>;
      existingLocalCount: number;
      missingLocalCount: number;
    };
  };

  diagnostics: {
    import: {
      totalCount: number;
      infoCount: number;
      warningCount: number;
      errorCount: number;
      fatalCount: number;
      codes: string[];
      issueIds: string[];
    };
  };

  documents: PreparedDocumentRecord[];
};

export type PreparedDocumentStylesheetLink = {
  href: string;
  attrs: Array<{ name: string; value: string }>;
};

export type PreparedDocumentFidelityProjection = {
  kind: "prepared_document_fidelity_projection_v1";
  htmlLang: string | null;
  title: string | null;
  metaCharset: string | null;
  metaViewport: string | null;
  metaDescription: string | null;
  bodyClass: string | null;
  bodyId: string | null;
  stylesheetLinks: PreparedDocumentStylesheetLink[];
};

export type PreparedDocumentDomOutline = {
  kind: "prepared_document_dom_outline_v1";
  bodyAvailable: boolean;
  bodyChildElements: PreparedDomOutlineElement[];
};

export type PreparedDomOutlineElement = {
  tagName: string;
  domPath: string;
  ordinalIndex: number;
  nthOfType: number;
  className: string | null;
  id: string | null;
  role: string | null;
  ariaLabel: string | null;
  href: string | null;
  childElementCount: number;
  directTextPresent: boolean;
  textPresent: boolean;
  /**
   * Deterministic, compact text excerpt derived from the element subtree.
   * - `null` when no non-whitespace text nodes were found.
   * - Intended for phase-1 preview visibility only (not design fidelity).
   */
  textExcerpt: string | null;
  /**
   * Deterministic minimal source-markup fragment from this subtree.
   * - Fixed element/attribute whitelist only.
   * - `null` when nothing preservable exists for this subtree.
   */
  preservedMarkupHtml: string | null;
  /**
   * True when subtree contains only non-visual script/style/noscript/template structures
   * (optionally wrapped by neutral containers) and has no visible text.
   */
  nonVisualOnlySubtree: boolean;
  childElements: PreparedDomOutlineElement[];
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function computeStatus(importOutput: ImportOutput, importManifest: ImportManifest): PreparedSitePreparationStatus {
  const blocked = importOutput.status === "failed" || importManifest.status === "failed";
  if (blocked) return "blocked";
  if (importManifest.status === "success_with_warnings") return "ready_with_warnings";
  return "ready";
}

function documentIdForPath(path: string): string {
  return sha256Hex(`prepared_document_v1:${path}`);
}

function isElement(node: unknown): node is { tagName: string; childNodes?: unknown[] } {
  return !!node && typeof node === "object" && typeof (node as { tagName?: unknown }).tagName === "string";
}

function walkDom(node: unknown, visit: (n: unknown) => void): void {
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    visit(current);
    const childNodes = (current as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (let i = childNodes.length - 1; i >= 0; i--) stack.push(childNodes[i]);
    }
    const content = (current as { content?: unknown }).content;
    if (content && typeof content === "object") stack.push(content);
  }
}

const NON_VISUAL_TEXT_EXCERPT_DROP_SUBTREE_TAGS = new Set<string>([
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "object",
  "canvas",
  "svg",
]);

const NON_VISUAL_ONLY_CONTENT_TAGS = new Set<string>(["script", "style", "noscript", "template"]);
const NON_VISUAL_ONLY_NEUTRAL_CONTAINER_TAGS = new Set<string>([
  "article",
  "body",
  "div",
  "footer",
  "header",
  "main",
  "nav",
  "section",
  "span",
]);

function walkDomForVisibleText(node: unknown, visit: (n: unknown) => void): void {
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    visit(current);
    if (isElement(current) && NON_VISUAL_TEXT_EXCERPT_DROP_SUBTREE_TAGS.has(current.tagName.toLowerCase())) continue;
    const childNodes = (current as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (let i = childNodes.length - 1; i >= 0; i--) stack.push(childNodes[i]);
    }
    const content = (current as { content?: unknown }).content;
    if (content && typeof content === "object") stack.push(content);
  }
}

function findFirstElementByTagName(root: unknown, tagNameLower: string): unknown | null {
  let found: unknown | null = null;
  walkDom(root, (n) => {
    if (found) return;
    if (!isElement(n)) return;
    if (n.tagName.toLowerCase() === tagNameLower) found = n;
  });
  return found;
}

function getAttr(node: unknown, attrName: string): string | null {
  if (!node || typeof node !== "object") return null;
  const attrs = (node as { attrs?: { name?: string; value?: string }[] }).attrs;
  if (!Array.isArray(attrs)) return null;
  const lower = attrName.toLowerCase();
  for (const a of attrs) {
    if (String(a.name ?? "").toLowerCase() === lower) return String(a.value ?? "");
  }
  return null;
}

function getAttrsPreservingOrder(node: unknown): Array<{ name: string; value: string }> {
  if (!node || typeof node !== "object") return [];
  const attrs = (node as { attrs?: { name?: string; value?: string }[] }).attrs;
  if (!Array.isArray(attrs)) return [];
  const out: Array<{ name: string; value: string }> = [];
  for (const attr of attrs) {
    const name = String(attr.name ?? "").trim();
    if (name.length === 0) continue;
    out.push({ name, value: String(attr.value ?? "") });
  }
  return out;
}

function walkElementsInDocumentOrder(root: unknown, visit: (node: unknown) => void): void {
  if (!root || typeof root !== "object") return;
  const childNodes = (root as { childNodes?: unknown[] }).childNodes;
  if (Array.isArray(childNodes)) {
    for (const child of childNodes) {
      if (!child || typeof child !== "object") continue;
      if (isElement(child)) visit(child);
      walkElementsInDocumentOrder(child, visit);
    }
  }
  const content = (root as { content?: unknown }).content;
  if (content && typeof content === "object") {
    if (isElement(content)) visit(content);
    walkElementsInDocumentOrder(content, visit);
  }
}

function textFromSubtree(node: unknown): string {
  let out = "";
  walkDom(node, (n) => {
    if (!n || typeof n !== "object") return;
    const nodeName = String((n as { nodeName?: unknown }).nodeName ?? "");
    if (nodeName !== "#text") return;
    out += textValueFromNode(n);
  });
  return normalizeWhitespace(out);
}

function metaContentByName(head: unknown, targetName: string): string | null {
  let value: string | null = null;
  walkElementsInDocumentOrder(head, (node) => {
    if (value !== null) return;
    if (!isElement(node)) return;
    if (node.tagName.toLowerCase() !== "meta") return;
    const name = getAttr(node, "name");
    if (name === null || name.toLowerCase() !== targetName.toLowerCase()) return;
    const content = getAttr(node, "content");
    if (content === null || content.trim().length === 0) return;
    value = content;
  });
  return value;
}

function metaCharset(head: unknown): string | null {
  let value: string | null = null;
  walkElementsInDocumentOrder(head, (node) => {
    if (value !== null) return;
    if (!isElement(node)) return;
    if (node.tagName.toLowerCase() !== "meta") return;
    const charset = getAttr(node, "charset");
    if (charset === null || charset.trim().length === 0) return;
    value = charset;
  });
  return value;
}

function isStylesheetRel(rel: string | null): boolean {
  if (rel === null) return false;
  const tokens = rel
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return tokens.includes("stylesheet");
}

function extractStylesheetLinks(head: unknown): PreparedDocumentStylesheetLink[] {
  const links: PreparedDocumentStylesheetLink[] = [];
  walkElementsInDocumentOrder(head, (node) => {
    if (!isElement(node)) return;
    if (node.tagName.toLowerCase() !== "link") return;
    const href = getAttr(node, "href");
    if (href === null || href.trim().length === 0) return;
    if (!isStylesheetRel(getAttr(node, "rel"))) return;
    links.push({
      href,
      attrs: getAttrsPreservingOrder(node),
    });
  });
  return links;
}

function createFidelityProjectionFromSerializedDom(serializedDom: string): PreparedDocumentFidelityProjection {
  const document = parse(serializedDom);
  const html = findFirstElementByTagName(document, "html");
  const head = findFirstElementByTagName(document, "head");
  const body = findFirstElementByTagName(document, "body");
  const titleNode = head ? findFirstElementByTagName(head, "title") : null;

  return {
    kind: "prepared_document_fidelity_projection_v1",
    htmlLang: html ? getAttr(html, "lang") : null,
    title: titleNode ? textFromSubtree(titleNode) || null : null,
    metaCharset: head ? metaCharset(head) : null,
    metaViewport: head ? metaContentByName(head, "viewport") : null,
    metaDescription: head ? metaContentByName(head, "description") : null,
    bodyClass: body ? getAttr(body, "class") : null,
    bodyId: body ? getAttr(body, "id") : null,
    stylesheetLinks: head ? extractStylesheetLinks(head) : [],
  };
}

const DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS = 160;

function normalizeWhitespace(input: string): string {
  // Stable: collapse all whitespace sequences to single spaces and trim ends.
  return input.replaceAll(/\s+/g, " ").trim();
}

function escapeTextForExcerpt(raw: unknown): string {
  return String(raw ?? "");
}

function textValueFromNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const raw = (node as { value?: unknown; data?: unknown }).value ?? (node as { data?: unknown }).data ?? "";
  return escapeTextForExcerpt(raw);
}

function hasDirectNonWhitespaceTextChild(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const children = (node as { childNodes?: unknown[] }).childNodes;
  if (!Array.isArray(children) || children.length === 0) return false;
  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const nodeName = String((child as { nodeName?: unknown }).nodeName ?? "");
    if (nodeName !== "#text") continue;
    if (textValueFromNode(child).trim().length > 0) return true;
  }
  return false;
}

function computeTextExcerptFromSubtree(node: unknown): string | null {
  // Deterministic: traverse text nodes in document order, normalize whitespace, cap length.
  let sawNonWhitespace = false;
  let collected = "";
  let done = false;

  walkDomForVisibleText(node, (n) => {
    if (done) return;
    if (!n || typeof n !== "object") return;
    const nodeName = String((n as { nodeName?: unknown }).nodeName ?? "");
    if (nodeName !== "#text") return;

    const raw = (n as { value?: unknown; data?: unknown }).value ?? (n as { data?: unknown }).data ?? "";
    const rawStr = escapeTextForExcerpt(raw);
    if (rawStr.trim().length > 0) sawNonWhitespace = true;
    collected += rawStr;

    // Stop early to keep processing bounded; normalization/truncation happens after.
    if (collected.length >= DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS * 2) done = true;
  });

  if (!sawNonWhitespace) return null;

  const normalized = normalizeWhitespace(collected);
  if (normalized.length <= DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS) return normalized;

  // Stable truncation marker; avoids embedding large DOM payloads.
  const head = normalized.slice(0, Math.max(0, DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS - 1)).trimEnd();
  return `${head}…`;
}

function isNonVisualOnlySubtree(node: unknown): boolean {
  let sawPotentialVisualContent = false;

  function visit(current: unknown, insideNonVisual: boolean): void {
    if (sawPotentialVisualContent || !current || typeof current !== "object") return;
    const nodeName = String((current as { nodeName?: unknown }).nodeName ?? "");
    if (nodeName === "#text") {
      if (!insideNonVisual && textValueFromNode(current).trim().length > 0) sawPotentialVisualContent = true;
      return;
    }
    if (!isElement(current)) return;

    const tag = current.tagName.toLowerCase();
    const nextInsideNonVisual = insideNonVisual || NON_VISUAL_ONLY_CONTENT_TAGS.has(tag);
    if (!nextInsideNonVisual && !NON_VISUAL_ONLY_NEUTRAL_CONTAINER_TAGS.has(tag)) sawPotentialVisualContent = true;

    const childNodes = (current as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (const child of childNodes) visit(child, nextInsideNonVisual);
    }
    const content = (current as { content?: unknown }).content;
    if (content && typeof content === "object") visit(content, nextInsideNonVisual);
  }

  visit(node, false);
  return !sawPotentialVisualContent;
}

function buildChildElements(parent: unknown, parentDomPath: string): PreparedDomOutlineElement[] {
  if (!parent || typeof parent !== "object") return [];
  const childNodes = (parent as { childNodes?: unknown[] }).childNodes ?? [];
  const elementChildren = childNodes.filter(isElement);
  const typeCounts = new Map<string, number>();
  const out: PreparedDomOutlineElement[] = [];

  for (let i = 0; i < elementChildren.length; i++) {
    const el = elementChildren[i]!;
    const tagName = el.tagName.toLowerCase();
    const nthOfType = (typeCounts.get(tagName) ?? 0) + 1;
    typeCounts.set(tagName, nthOfType);

    const domPath = `${parentDomPath}>${tagName}:nth-of-type(${nthOfType})`;
    const childElements = buildChildElements(el, domPath);
    const textExcerpt = computeTextExcerptFromSubtree(el);
    const preservedMarkupHtml = extractDeterministicMinimalSourceMarkupHtml(el);

    out.push({
      tagName,
      domPath,
      ordinalIndex: i,
      nthOfType,
      className: getAttr(el, "class"),
      id: getAttr(el, "id"),
      role: getAttr(el, "role"),
      ariaLabel: getAttr(el, "aria-label"),
      href: getAttr(el, "href"),
      childElementCount: childElements.length,
      directTextPresent: hasDirectNonWhitespaceTextChild(el),
      textPresent: textExcerpt !== null,
      textExcerpt,
      preservedMarkupHtml,
      nonVisualOnlySubtree: isNonVisualOnlySubtree(el),
      childElements,
    });
  }

  return out;
}

function createDomOutlineFromSerializedDom(serializedDom: string): PreparedDocumentDomOutline {
  const document = parse(serializedDom);
  const body = findFirstElementByTagName(document, "body");

  if (!body || typeof body !== "object") {
    return { kind: "prepared_document_dom_outline_v1", bodyAvailable: false, bodyChildElements: [] };
  }

  const bodyChildElements = buildChildElements(body, "html>body");
  return { kind: "prepared_document_dom_outline_v1", bodyAvailable: true, bodyChildElements };
}

function toCanonicalDocumentList(documents: ImportOutput["rawDomSnapshot"]["documents"]): ImportOutput["rawDomSnapshot"]["documents"] {
  const sorted = [...documents].sort((a, b) => {
    if (a.path !== b.path) return stringCmp(a.path, b.path);
    if (a.contentSha256 !== b.contentSha256) return stringCmp(a.contentSha256, b.contentSha256);
    if (a.byteLength !== b.byteLength) return a.byteLength - b.byteLength;
    return 0;
  });

  const out: ImportOutput["rawDomSnapshot"]["documents"] = [];
  const seen = new Set<string>();
  for (const doc of sorted) {
    if (seen.has(doc.path)) continue;
    seen.add(doc.path);
    out.push(doc);
  }
  return out;
}

const CTA_PATTERN = /\b(get started|start|book|contact|call|buy|shop|demo|learn more|sign up|join|quote|request|schedule|consult)\b/gi;
const CONTACT_PATTERN = /\b(contact|email|phone|tel|address|location|office|support|help)\b/gi;
const SERVICES_PATTERN = /\b(service|services|solution|solutions|offering|offerings|capability|capabilities)\b/gi;
const ABOUT_PATTERN = /\b(about|company|team|mission|story|who we are)\b/gi;
const FEATURES_PATTERN = /\b(feature|features|benefit|benefits|why us|value)\b/gi;
const GALLERY_PATTERN = /\b(gallery|portfolio|project|projects|case study|work)\b/gi;
const TESTIMONIAL_PATTERN = /\b(testimonial|testimonials|review|reviews|client story|trusted by)\b/gi;
const LEGAL_PATTERN = /\b(copyright|privacy|terms|rights reserved)\b/gi;
const COLOR_VALUE_PATTERN = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b|(?:rgb|rgba|hsl|hsla)\([^)]*\)/gi;
const FONT_DECLARATION_PATTERN = /font-family\s*:\s*([^;}{]+)/gi;

function normalizeToken(input: string | null): string {
  return String(input ?? "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, " ")
    .trim();
}

function stripHtml(input: string): string {
  return normalizeWhitespace(input.replaceAll(/<[^>]+>/g, " "));
}

function countRegex(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

function confidenceFromScore(score: number): SemanticConfidence {
  if (score >= 0.78) return "high";
  if (score >= 0.52) return "medium";
  return "low";
}

function sectionSemanticId(input: { pageId: string; sourceDomPath: string; ordinalIndex: number }): string {
  return sha256Hex(
    stableStringify({
      kind: "prepared_section_semantic_v1",
      pageId: input.pageId,
      sourceDomPath: input.sourceDomPath,
      ordinalIndex: input.ordinalIndex,
    }),
  );
}

function flattenElementsInOrder(elements: PreparedDomOutlineElement[]): PreparedDomOutlineElement[] {
  const out: PreparedDomOutlineElement[] = [];
  const stack = [...elements].reverse();
  while (stack.length > 0) {
    const current = stack.pop()!;
    out.push(current);
    for (let i = current.childElements.length - 1; i >= 0; i--) stack.push(current.childElements[i]!);
  }
  return out;
}

function extractBoundaryChildren(bodyChildElements: PreparedDomOutlineElement[]): PreparedDomOutlineElement[] {
  let boundaryChildren = bodyChildElements;
  while (boundaryChildren.length === 1) {
    const only = boundaryChildren[0]!;
    if (only.directTextPresent) break;
    if (only.childElementCount >= 1) {
      boundaryChildren = only.childElements;
      continue;
    }
    break;
  }
  return boundaryChildren;
}

function extractSemanticBoundaryChildren(bodyChildElements: PreparedDomOutlineElement[]): PreparedDomOutlineElement[] {
  let boundaryChildren = bodyChildElements;
  while (boundaryChildren.length === 1) {
    const only = boundaryChildren[0]!;
    if (only.childElementCount === 0) break;
    const hasStructuralChildren = only.childElements.some((child) =>
      ["header", "nav", "main", "section", "article", "footer", "form"].includes(child.tagName)
    );
    const wrapperLikely = hasStructuralChildren || only.childElementCount >= 3;

    if (only.directTextPresent && !wrapperLikely) break;
    boundaryChildren = only.childElements;
  }
  return boundaryChildren;
}

function readFontFamiliesFromCssText(cssText: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = FONT_DECLARATION_PATTERN.exec(cssText)) !== null) {
    const raw = String(match[1] ?? "");
    const families = raw
      .split(",")
      .map((f) => f.replaceAll(/["']/g, "").trim())
      .filter((f) => f.length > 0);
    out.push(...families);
  }
  return uniqueSortedStrings(out);
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].filter((v) => v.trim().length > 0).sort(stringCmp);
}

function pickVisualToneFromSignals(input: {
  ctaCount: number;
  headingCount: number;
  gallerySections: number;
  textDensityAvg: number;
}): BrandSignalModel["visualTone"] {
  if (input.gallerySections >= 1 || input.ctaCount >= 5) return "playful";
  if (input.textDensityAvg >= 0.55 && input.headingCount <= 8) return "formal";
  return "neutral";
}

function parentDomPathFromPath(domPath: string): string {
  const idx = domPath.lastIndexOf(">");
  if (idx <= 0) return "";
  return domPath.slice(0, idx);
}

function domDepthFromPath(domPath: string): number {
  if (!domPath) return 0;
  return domPath.split(">").length;
}

function toRawSemanticBlock(section: PreparedDomOutlineElement, ordinalIndex: number): RawBlock {
  const flat = flattenElementsInOrder([section]);
  const markup = section.preservedMarkupHtml ?? "";
  const normalizedText = normalizeWhitespace(`${stripHtml(markup)} ${section.textExcerpt ?? ""}`);
  const words = normalizedText.length > 0 ? normalizedText.split(/\s+/).length : 0;
  const lowerText = normalizedText.toLowerCase();
  const headingCount = flat.reduce((sum, el) => sum + (/^h[1-6]$/.test(el.tagName) ? 1 : 0), 0);
  const mediaCount = flat.reduce((sum, el) => sum + (["img", "picture", "figure", "video", "canvas", "svg"].includes(el.tagName) ? 1 : 0), 0);
  const buttonLikeCount = countRegex(lowerText, CTA_PATTERN);
  const footerHints = normalizeToken(`${section.domPath} ${section.className ?? ""} ${section.id ?? ""}`);
  const repetitionHint = Math.min(
    1,
    countRegex(footerHints, /\b(card|grid|feature|service|item|tile|gallery|portfolio)\b/gi) / 4,
  );
  return {
    id: `raw-block:${section.domPath}:${String(ordinalIndex)}`,
    domPath: section.domPath,
    tagName: section.tagName,
    ordinalIndex,
    parentDomPath: parentDomPathFromPath(section.domPath),
    domDepth: domDepthFromPath(section.domPath),
    className: section.className,
    role: section.role,
    ariaLabel: section.ariaLabel,
    textExcerpt: section.textExcerpt,
    preservedMarkupHtml: section.preservedMarkupHtml,
    childElementCount: section.childElementCount,
    textWordCount: words,
    textDensity: Math.min(1, words / 180),
    nodeComplexity: flat.length,
    layoutHintDepth: domDepthFromPath(section.domPath),
    hasHeading: headingCount > 0,
    hasImages: mediaCount > 0,
    hasCTA: buttonLikeCount > 0 || /<a\b|<button\b/i.test(markup),
    hasFooterHint: section.tagName === "footer" || footerHints.includes("footer"),
    hasNavHint:
      section.tagName === "header" ||
      section.tagName === "nav" ||
      footerHints.includes("header") ||
      footerHints.includes("nav"),
    hasLegalHint: countRegex(lowerText, LEGAL_PATTERN) > 0,
    hasContactHint: countRegex(lowerText, CONTACT_PATTERN) > 0 || countRegex(markup.toLowerCase(), /mailto:|tel:/gi) > 0,
    repetitionHint,
  };
}

function classifyConsolidatedSection(input: {
  section: SectionConsolidationResult["sections"][number];
  ordinalIndex: number;
  sectionCount: number;
}): {
  inferredType: SectionSemanticType;
  confidence: SemanticConfidence;
  rationale: string[];
  heroComposition: HeroCompositionHint | null;
  mediaDensity: number;
  galleryLikeConfidence: SemanticConfidence;
  ctaCandidates: CtaCandidate[];
  likelyPrimaryCta: CtaCandidate | null;
  density: SectionDensitySignal;
  candidateSignals: SectionSemanticModel["candidateSignals"];
} {
  const signals = input.section.signals;
  const candidates = input.section.candidates;
  const topWindow = input.ordinalIndex <= 1;
  const bottomWindow = input.ordinalIndex >= Math.max(0, input.sectionCount - 2);

  const scores: Record<SectionSemanticType, number> = {
    header: 0,
    navigation: 0,
    hero: candidates.heroCandidate,
    cta: candidates.ctaCandidate,
    about: 0,
    services: candidates.servicesCandidate,
    features: candidates.servicesCandidate * 0.85,
    gallery: candidates.galleryCandidate,
    testimonials: 0,
    contact: signals.contactHintCount > 0 ? 0.68 : 0,
    footer: candidates.footerCandidate,
    unknown: 0.24,
  };

  if (topWindow && signals.navHintCount > 0) {
    scores.navigation += 0.82;
    scores.header += 0.6;
  }
  if (topWindow && signals.hasHeading && (signals.hasImages || signals.hasCTA)) scores.hero += 0.24;
  if (signals.hasCTA && signals.textWordCount <= 120) scores.cta += 0.18;
  if (signals.repetitionScore >= 0.35 && signals.hasImages) scores.gallery += 0.14;
  if (signals.repetitionScore >= 0.35 && signals.textWordCount >= 24) {
    scores.services += 0.14;
    scores.features += 0.1;
  }
  if (bottomWindow && (signals.footerHintCount > 0 || signals.legalHintCount > 0)) scores.footer += 0.24;
  if (signals.footerHintCount > 0 && signals.hasCTA && signals.hasHeading && signals.textWordCount > 20) {
    scores.footer = Math.max(0, scores.footer - 0.2);
  }
  if (signals.textWordCount >= 40 && scores.hero < 0.55 && scores.footer < 0.55) {
    scores.about += 0.36;
    scores.features += 0.22;
  }
  if (signals.contactHintCount > 0 && signals.hasCTA) scores.contact += 0.12;

  const ranked = (Object.keys(scores) as SectionSemanticType[])
    .map((k) => ({ type: k, score: scores[k] }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : stringCmp(a.type, b.type)));

  const best = ranked[0]!;
  const second = ranked[1]!;
  const rawConfidence = Math.max(0, Math.min(1, best.score + Math.min(0.2, (best.score - second.score) * 0.35)));
  const confidence = confidenceFromScore(rawConfidence);

  let heroComposition: HeroCompositionHint | null = null;
  if (best.type === "hero") {
    if (signals.hasHeading && signals.hasImages) heroComposition = "split_media";
    else if (signals.hasHeading && signals.hasCTA) heroComposition = "centered_cta";
    else if (signals.hasImages) heroComposition = "image_first";
    else if (signals.hasHeading) heroComposition = "text_only";
    else heroComposition = "unknown";
  }

  const ctaCandidates: CtaCandidate[] = signals.hasCTA
    ? [
        {
          label: "Primary action",
          confidence: candidates.ctaCandidate >= 0.72 ? "high" : "medium",
          rationale: [
            `section_cta_candidate=${candidates.ctaCandidate.toFixed(2)}`,
            `section_cta_count=${String(signals.ctaCount)}`,
          ],
        },
      ]
    : [];

  const textDensity = signals.textDensity;
  const mediaDensity = Math.min(1, signals.imageCount / Math.max(1, input.section.blockIds.length * 1.2));
  const headingDensity = Math.min(1, signals.headingCount / Math.max(1, input.section.blockIds.length));
  const ctaDensity = Math.min(1, signals.ctaCount / Math.max(1, signals.textWordCount / 30));
  const repetitionDensity = Math.min(1, signals.repetitionScore);

  return {
    inferredType: best.score < 0.5 ? "unknown" : best.type,
    confidence,
    rationale: uniqueSortedStrings([
      ...input.section.rationale,
      `semantic_score=${best.score.toFixed(2)}`,
      `semantic_runner_up=${second.type}:${second.score.toFixed(2)}`,
      `semantic_confidence=${rawConfidence.toFixed(2)}`,
    ]),
    heroComposition,
    mediaDensity: Number(mediaDensity.toFixed(3)),
    galleryLikeConfidence: confidenceFromScore(Math.min(1, candidates.galleryCandidate)),
    ctaCandidates,
    likelyPrimaryCta: ctaCandidates[0] ?? null,
    density: {
      textDensity: Number(textDensity.toFixed(3)),
      imageDensity: Number(mediaDensity.toFixed(3)),
      headingDensity: Number(headingDensity.toFixed(3)),
      ctaDensity: Number(ctaDensity.toFixed(3)),
      repetitionDensity: Number(repetitionDensity.toFixed(3)),
      readabilityTendency:
        textDensity >= 0.66 ? "readable" : textDensity >= 0.35 ? "balanced" : "compact",
    },
    candidateSignals: {
      heroCandidate: Number(candidates.heroCandidate.toFixed(3)),
      ctaCandidate: Number(candidates.ctaCandidate.toFixed(3)),
      contentCandidate: Number(candidates.contentCandidate.toFixed(3)),
      footerCandidate: Number(candidates.footerCandidate.toFixed(3)),
    },
  };
}

function classifySection(input: {
  section: PreparedDomOutlineElement;
  ordinalIndex: number;
  sectionCount: number;
}): {
  inferredType: SectionSemanticType;
  confidence: SemanticConfidence;
  rationale: string[];
  heroComposition: HeroCompositionHint | null;
  mediaDensity: number;
  galleryLikeConfidence: SemanticConfidence;
  ctaCandidates: CtaCandidate[];
  likelyPrimaryCta: CtaCandidate | null;
  density: SectionDensitySignal;
} {
  const flat = flattenElementsInOrder([input.section]);
  const markup = input.section.preservedMarkupHtml ?? "";
  const normalizedText = normalizeWhitespace(`${stripHtml(markup)} ${input.section.textExcerpt ?? ""}`);
  const words = normalizedText.length > 0 ? normalizedText.split(/\s+/).length : 0;
  const lowerText = normalizedText.toLowerCase();
  const headingCount = flat.reduce((sum, el) => sum + (/^h[1-6]$/.test(el.tagName) ? 1 : 0), 0);
  const anchorCount = countRegex(markup, /<a\b/gi);
  const buttonLikeCount = countRegex(lowerText, CTA_PATTERN);
  const imageLikeCount = flat.reduce((sum, el) => sum + (el.tagName === "img" || el.tagName === "picture" || el.tagName === "figure" ? 1 : 0), 0);
  const mediaCount = flat.reduce((sum, el) => sum + (["img", "picture", "figure", "video", "canvas", "svg"].includes(el.tagName) ? 1 : 0), 0);
  const formCount = flat.reduce((sum, el) => sum + (el.tagName === "form" ? 1 : 0), 0);
  const paragraphCount = flat.reduce((sum, el) => sum + (el.tagName === "p" ? 1 : 0), 0);
  const cardWords = countRegex(`${input.section.domPath} ${input.section.className ?? ""} ${input.section.id ?? ""}`.toLowerCase(), /\b(card|grid|feature|service|item|tile)\b/gi);
  const contactSignalCount = countRegex(lowerText, CONTACT_PATTERN) + countRegex(markup.toLowerCase(), /mailto:|tel:/gi);
  const legalSignalCount = countRegex(lowerText, LEGAL_PATTERN);
  const gallerySignalCount = countRegex(lowerText, GALLERY_PATTERN) + countRegex(`${input.section.domPath} ${input.section.className ?? ""}`, GALLERY_PATTERN);
  const testimonialSignalCount = countRegex(lowerText, TESTIMONIAL_PATTERN);
  const servicesSignalCount = countRegex(lowerText, SERVICES_PATTERN);
  const aboutSignalCount = countRegex(lowerText, ABOUT_PATTERN);
  const featuresSignalCount = countRegex(lowerText, FEATURES_PATTERN);
  const topWindow = input.ordinalIndex <= 2;
  const bottomWindow = input.ordinalIndex >= Math.max(0, input.sectionCount - 2);

  const textDensity = Math.min(1, words / 180);
  const imageDensity = Math.min(1, mediaCount / Math.max(1, flat.length));
  const headingDensity = Math.min(1, headingCount / Math.max(1, flat.length * 0.6));
  const ctaDensity = Math.min(1, buttonLikeCount / Math.max(1, words / 25));
  const repetitionDensity = Math.min(1, cardWords / 6);
  const readabilityTendency: SectionDensitySignal["readabilityTendency"] = textDensity >= 0.66
    ? "readable"
    : textDensity >= 0.35
    ? "balanced"
    : "compact";

  const baseRationale: string[] = [];
  const scores: Record<SectionSemanticType, number> = {
    header: 0,
    navigation: 0,
    hero: 0,
    cta: 0,
    about: 0,
    services: 0,
    features: 0,
    gallery: 0,
    testimonials: 0,
    contact: 0,
    footer: 0,
    unknown: 0.2,
  };

  const tag = input.section.tagName;
  const role = normalizeToken(input.section.role);
  const aria = normalizeToken(input.section.ariaLabel);
  const domSignals = normalizeToken(`${input.section.domPath} ${input.section.className ?? ""} ${input.section.id ?? ""}`);

  if (tag === "header" || domSignals.includes("header")) {
    scores.header += 0.85;
    baseRationale.push("header_tag_or_hint");
  }
  if (tag === "nav" || role.includes("navigation") || aria.includes("navigation") || domSignals.includes("nav")) {
    scores.navigation += 0.92;
    baseRationale.push("navigation_tag_or_role");
  }
  if (topWindow && (headingCount > 0 || mediaCount > 0)) {
    scores.hero += 0.38;
    baseRationale.push("top_block_prominence");
  }
  if (headingCount > 0 && mediaCount > 0 && words >= 12 && words <= 180) {
    scores.hero += 0.42;
    baseRationale.push("heading_media_prominence");
  }
  if (domSignals.includes("hero") || domSignals.includes("banner") || domSignals.includes("masthead")) {
    scores.hero += 0.45;
    baseRationale.push("hero_name_hint");
  }
  if (buttonLikeCount > 0) {
    scores.cta += Math.min(0.56, 0.18 * buttonLikeCount);
    baseRationale.push("cta_action_language");
  }
  if (servicesSignalCount > 0) scores.services += Math.min(0.58, 0.2 * servicesSignalCount);
  if (featuresSignalCount > 0 || (cardWords >= 2 && headingCount >= 2)) scores.features += 0.52;
  if (aboutSignalCount > 0) scores.about += Math.min(0.5, 0.2 * aboutSignalCount);
  if (gallerySignalCount > 0 || (imageLikeCount >= 3 && textDensity <= 0.35)) scores.gallery += 0.72;
  if (mediaCount >= 2 && textDensity <= 0.45) scores.gallery += 0.56;
  if (testimonialSignalCount > 0) scores.testimonials += Math.min(0.65, 0.24 * testimonialSignalCount);
  if (contactSignalCount > 0 || formCount > 0) scores.contact += 0.74;
  if (tag === "footer" || domSignals.includes("footer")) {
    scores.footer += 0.9;
    baseRationale.push("footer_tag_or_hint");
  }
  if (bottomWindow && (legalSignalCount > 0 || contactSignalCount > 0 || anchorCount >= 3)) {
    scores.footer += 0.34;
    baseRationale.push("bottom_legal_or_link_cluster");
  }
  if (topWindow && anchorCount >= 4) {
    scores.navigation += 0.34;
    scores.header += 0.2;
  }
  if (topWindow && headingCount >= 1 && buttonLikeCount >= 1 && mediaCount >= 1) scores.hero += 0.44;
  if (formCount > 0) scores.contact += 0.3;
  if (mediaCount >= 4 && textDensity <= 0.28) scores.gallery += 0.25;

  const ranked = (Object.keys(scores) as SectionSemanticType[])
    .map((k) => ({ type: k, score: scores[k] }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : stringCmp(a.type, b.type)));

  const best = ranked[0]!;
  const second = ranked[1]!;
  const rawConfidence = Math.max(0, Math.min(1, best.score + Math.min(0.18, (best.score - second.score) * 0.4)));
  const confidence = confidenceFromScore(rawConfidence);

  let heroComposition: HeroCompositionHint | null = null;
  if (best.type === "hero") {
    if (mediaCount > 0 && headingCount > 0) heroComposition = "split_media";
    else if (buttonLikeCount > 0 && headingCount > 0) heroComposition = "centered_cta";
    else if (mediaCount > 0 && headingCount === 0) heroComposition = "image_first";
    else if (headingCount > 0) heroComposition = "text_only";
    else heroComposition = "unknown";
  }

  const ctaLabels = uniqueSortedStrings(
    (markup.match(/>([^<>]{2,64})<\/a>/gi) ?? [])
      .map((m) => normalizeWhitespace(stripHtml(m)))
      .filter((label) => countRegex(label.toLowerCase(), CTA_PATTERN) > 0),
  );
  const ctaCandidates: CtaCandidate[] = ctaLabels.slice(0, 4).map((label, idx) => ({
    label,
    confidence: idx === 0 && buttonLikeCount >= 2 ? "high" : buttonLikeCount > 0 ? "medium" : "low",
    rationale: [
      `cta_phrase_match=${countRegex(label.toLowerCase(), CTA_PATTERN)}`,
      `section_cta_count=${buttonLikeCount}`,
    ],
  }));
  const likelyPrimaryCta = ctaCandidates[0] ?? null;

  return {
    inferredType: best.score < 0.52 ? "unknown" : best.type,
    confidence,
    rationale: uniqueSortedStrings([
      ...baseRationale,
      `words=${String(words)}`,
      `headingCount=${String(headingCount)}`,
      `mediaCount=${String(mediaCount)}`,
      `ctaCount=${String(buttonLikeCount)}`,
      `score=${best.score.toFixed(2)}`,
    ]),
    heroComposition,
    mediaDensity: Number(imageDensity.toFixed(3)),
    galleryLikeConfidence: confidenceFromScore(Math.min(1, scores.gallery)),
    ctaCandidates,
    likelyPrimaryCta,
    density: {
      textDensity: Number(textDensity.toFixed(3)),
      imageDensity: Number(imageDensity.toFixed(3)),
      headingDensity: Number(headingDensity.toFixed(3)),
      ctaDensity: Number(ctaDensity.toFixed(3)),
      repetitionDensity: Number(repetitionDensity.toFixed(3)),
      readabilityTendency,
    },
  };
}

function inferPageSemantic(input: {
  sourcePath: string;
  title: string | null;
  isEntry: boolean;
  sections: SectionSemanticModel[];
}): PageSemanticModel {
  const bag = `${input.sourcePath} ${input.title ?? ""}`.toLowerCase();
  const counts = input.sections.reduce(
    (acc, s) => {
      acc[s.inferredType] = (acc[s.inferredType] ?? 0) + 1;
      return acc;
    },
    {} as Record<SectionSemanticType, number>,
  );
  const hasHero = (counts.hero ?? 0) > 0;
  const hasNav = (counts.navigation ?? 0) > 0 || (counts.header ?? 0) > 0;
  const hasFooter = (counts.footer ?? 0) > 0;

  if (/\babout|team|company|mission\b/.test(bag) || (counts.about ?? 0) > 0) {
    return { pageType: "about", confidence: "high", rationale: ["about_keywords_or_sections"], styleFamily: "corporate" };
  }
  if (/\bservice|solution|consult|agency\b/.test(bag) || (counts.services ?? 0) + (counts.features ?? 0) >= 2) {
    return { pageType: "services", confidence: "high", rationale: ["services_keywords_or_repeated_service_blocks"], styleFamily: "service" };
  }
  if (/\bcontact|support\b/.test(bag) || (counts.contact ?? 0) > 0) {
    return { pageType: "contact", confidence: "high", rationale: ["contact_keywords_or_contact_section"], styleFamily: "service" };
  }
  if (/\bportfolio|gallery|projects?\b/.test(bag) || (counts.gallery ?? 0) > 0) {
    return { pageType: "gallery_portfolio", confidence: "medium", rationale: ["gallery_keywords_or_media_sections"], styleFamily: "gallery" };
  }
  if (/\bproduct|pricing|plan|feature\b/.test(bag)) {
    return { pageType: "product_landing", confidence: "medium", rationale: ["product_or_pricing_keywords"], styleFamily: "service" };
  }
  if (input.isEntry && hasHero && hasNav && hasFooter) {
    return { pageType: "home", confidence: "high", rationale: ["entry_page_with_hero_nav_footer"], styleFamily: "corporate" };
  }
  if (input.isEntry) {
    return { pageType: "home", confidence: "medium", rationale: ["entry_page_default_home"], styleFamily: "unknown" };
  }
  return { pageType: "unknown", confidence: "low", rationale: ["no_strong_page_type_signal"], styleFamily: "unknown" };
}

function extractBrandSignals(input: {
  htmlText: string;
  stylesheetHrefs: string[];
  bodyClass: string | null;
  sections: SectionSemanticModel[];
}): BrandSignalModel {
  const colorMatches = uniqueSortedStrings((input.htmlText.match(COLOR_VALUE_PATTERN) ?? []).map((v) => v.toLowerCase()));
  const fontsFromCss = readFontFamiliesFromCssText(input.htmlText);
  const hrefTokens = input.stylesheetHrefs.map((h) => normalizeToken(h)).join(" ");
  const bodyToken = normalizeToken(input.bodyClass);
  const fontHints = uniqueSortedStrings([
    ...fontsFromCss,
    ...(hrefTokens.includes("serif") || bodyToken.includes("serif") ? ["serif-family"] : []),
    ...(hrefTokens.includes("sans") || bodyToken.includes("sans") ? ["sans-family"] : []),
    ...(hrefTokens.includes("mono") || bodyToken.includes("mono") ? ["monospace-family"] : []),
  ]);

  const fontCategoryHints: BrandSignalModel["fontCategoryHints"] = [];
  if (fontHints.some((f) => /mono/.test(f))) fontCategoryHints.push("monospace");
  if (fontHints.some((f) => /serif/.test(f))) fontCategoryHints.push("serif");
  if (fontHints.some((f) => /sans|system|ui-/.test(f))) fontCategoryHints.push("sans");
  if (fontHints.some((f) => /display|headline/.test(f))) fontCategoryHints.push("display");

  const gallerySections = input.sections.filter((s) => s.inferredType === "gallery").length;
  const ctaCount = input.sections.reduce((sum, section) => sum + section.ctaCandidates.length, 0);
  const headingCount = input.sections.reduce((sum, section) => sum + (section.density.headingDensity > 0 ? 1 : 0), 0);
  const textDensityAvg = input.sections.length > 0
    ? input.sections.reduce((sum, section) => sum + section.density.textDensity, 0) / input.sections.length
    : 0;

  const dominantColors = colorMatches.slice(0, 2);
  const accentColors = colorMatches.slice(2, 4);
  const neutralPaletteHints = uniqueSortedStrings([
    ...(colorMatches.some((c) => /#(?:f{3}|f{6}|eee|ddd|ccc)/.test(c)) ? ["light-neutral"] : []),
    ...(colorMatches.some((c) => /#(?:0{3}|111|222|333)/.test(c)) ? ["dark-neutral"] : []),
    ...(colorMatches.length === 0 ? ["neutral-unknown"] : []),
  ]);

  const confidence = confidenceFromScore(
    Math.min(
      1,
      (dominantColors.length >= 1 ? 0.42 : 0) +
        (accentColors.length >= 1 ? 0.18 : 0) +
        (fontHints.length >= 1 ? 0.28 : 0) +
        (fontCategoryHints.length >= 1 ? 0.12 : 0),
    ),
  );

  return {
    dominantColors,
    accentColors,
    neutralPaletteHints,
    fontFamilyHints: fontHints.slice(0, 4),
    fontCategoryHints: uniqueSortedStrings(fontCategoryHints).filter((v): v is BrandSignalModel["fontCategoryHints"][number] =>
      v === "sans" || v === "serif" || v === "display" || v === "monospace"
    ),
    visualTone: pickVisualToneFromSignals({
      ctaCount,
      headingCount,
      gallerySections,
      textDensityAvg: Number(textDensityAvg.toFixed(3)),
    }),
    confidence,
    rationale: uniqueSortedStrings([
      `colorSignals=${String(colorMatches.length)}`,
      `fontHints=${String(fontHints.length)}`,
      `gallerySections=${String(gallerySections)}`,
      `ctaCount=${String(ctaCount)}`,
    ]),
  };
}

function buildPageSemanticModel(input: {
  pageId: string;
  sourcePath: string;
  isEntry: boolean;
  title: string | null;
  htmlText: string;
  stylesheetHrefs: string[];
  bodyClass: string | null;
  bodyChildElements: PreparedDomOutlineElement[];
}): PreparedPageSemanticModel {
  const boundaryChildren = extractSemanticBoundaryChildren(input.bodyChildElements);
  const rawBlocks = boundaryChildren.map((section, idx) => toRawSemanticBlock(section, idx));
  const blockByDomPath = new Map(boundaryChildren.map((section) => [section.domPath, section]));
  const consolidation = consolidateSections({ blocks: rawBlocks });
  const sectionCount = consolidation.sections.length;
  const sections = consolidation.sections.map((consolidated, idx) => {
    const classified = classifyConsolidatedSection({
      section: consolidated,
      ordinalIndex: idx,
      sectionCount,
    });
    const sourceDomPath = consolidated.sourceDomPaths[0] ?? `consolidated:${String(idx)}`;
    const sectionId = sectionSemanticId({ pageId: input.pageId, sourceDomPath, ordinalIndex: idx });
    const sourceBlock = blockByDomPath.get(sourceDomPath);
    return {
      sectionId,
      sourceDomPath,
      sourceDomPaths: consolidated.sourceDomPaths,
      blockIds: consolidated.blockIds,
      domIndexStart: consolidated.domIndexStart,
      domIndexEnd: consolidated.domIndexEnd,
      consolidatedBlockCount: consolidated.blockIds.length,
      consolidationConfidence: consolidated.confidence,
      consolidationRationale: consolidated.rationale,
      consolidationMergeDecisions: consolidated.mergeDecisions,
      ordinalIndex: idx,
      ...classified,
      density: {
        ...classified.density,
        textDensity:
          sourceBlock && classified.density.textDensity === 0
            ? Number(Math.min(1, (sourceBlock.textExcerpt?.split(/\s+/).length ?? 0) / 180).toFixed(3))
            : classified.density.textDensity,
      },
    } satisfies SectionSemanticModel;
  });

  const page = inferPageSemantic({
    sourcePath: input.sourcePath,
    title: input.title,
    isEntry: input.isEntry,
    sections,
  });
  const allCtas = sections.flatMap((section) => section.ctaCandidates);
  const primaryCta = allCtas[0] ?? null;
  const brandSignals = extractBrandSignals({
    htmlText: input.htmlText,
    stylesheetHrefs: input.stylesheetHrefs,
    bodyClass: input.bodyClass,
    sections,
  });

  const diagnostics: SemanticDiagnostic[] = [];
  for (const consolidationDiagnostic of consolidation.diagnostics) {
    diagnostics.push({
      code: consolidationDiagnostic.code,
      severity: consolidationDiagnostic.severity,
      message: consolidationDiagnostic.message,
      pageId: input.pageId,
      sectionId: null,
    });
  }
  if (page.pageType === "unknown") {
    diagnostics.push({
      code: "SEMANTIC_PAGE_TYPE_UNKNOWN",
      severity: "warning",
      message: "Page type could not be classified with high confidence.",
      pageId: input.pageId,
      sectionId: null,
    });
  }
  for (const section of sections) {
    if (section.confidence === "low") {
      diagnostics.push({
        code: "SEMANTIC_SECTION_LOW_CONFIDENCE",
        severity: "info",
        message: "Section semantic classification confidence is low.",
        pageId: input.pageId,
        sectionId: section.sectionId,
      });
    }
  }
  if (!sections.some((section) => section.inferredType === "hero")) {
    diagnostics.push({
      code: "HERO_SECTION_UNCLEAR",
      severity: "info",
      message: "Hero section was not confidently detected.",
      pageId: input.pageId,
      sectionId: null,
    });
  }
  if (!sections.some((section) => section.inferredType === "navigation" || section.inferredType === "header")) {
    diagnostics.push({
      code: "NAVIGATION_SECTION_UNCLEAR",
      severity: "info",
      message: "Navigation/header section was not confidently detected.",
      pageId: input.pageId,
      sectionId: null,
    });
  }
  if (!sections.some((section) => section.inferredType === "footer")) {
    diagnostics.push({
      code: "FOOTER_SECTION_UNCLEAR",
      severity: "info",
      message: "Footer section was not confidently detected.",
      pageId: input.pageId,
      sectionId: null,
    });
  }
  if (brandSignals.confidence === "low") {
    diagnostics.push({
      code: "BRAND_SIGNAL_WEAK",
      severity: "info",
      message: "Brand signal extraction is weak due to limited deterministic source hints.",
      pageId: input.pageId,
      sectionId: null,
    });
  }
  if (allCtas.length === 0) {
    diagnostics.push({
      code: "CTA_PRIMARY_UNCLEAR",
      severity: "info",
      message: "Primary CTA could not be determined from deterministic signals.",
      pageId: input.pageId,
      sectionId: null,
    });
  }

  return {
    kind: "prepared_page_semantic_model_v1",
    consolidation: {
      mode: consolidation.mode,
      deepFragmentationDetected: consolidation.deepFragmentationDetected,
      inputBlockCount: consolidation.inputBlockCount,
      outputSectionCount: consolidation.outputSectionCount,
    },
    page,
    sections,
    ctaCandidates: allCtas,
    primaryCta,
    brandSignals,
    diagnostics,
  };
}

export function createPreparedSiteModel(input: {
  importOutput: ImportOutput;
  importManifest: ImportManifest;
}): PreparedSiteModel {
  const { importOutput, importManifest } = input;

  const docs = toCanonicalDocumentList(importOutput.rawDomSnapshot.documents);

  const referenceIdsByDocumentPath = new Map<string, string[]>();
  for (const ref of importOutput.assetRegistry.references) {
    const list = referenceIdsByDocumentPath.get(ref.fromDocumentPath);
    if (list) list.push(ref.id);
    else referenceIdsByDocumentPath.set(ref.fromDocumentPath, [ref.id]);
  }
  for (const [docPath, ids] of referenceIdsByDocumentPath) {
    ids.sort(stringCmp);
    referenceIdsByDocumentPath.set(docPath, ids);
  }

  const entryPath = importManifest.entryHtmlPath;
  const documents: PreparedDocumentRecord[] = [];

  let documentsWithNormalizedHtmlCount = 0;
  let documentsWithDomCount = 0;
  let totalNodeCount = 0;
  let totalParseWarningCount = 0;
  let effectivelyEmpty = true;

  for (const doc of docs) {
    const normalizedHtmlAvailable = doc.text.length > 0;
    const serializedDomAvailable = doc.dom !== null && doc.dom.serializedDom.length > 0;
    const nodeCount = doc.dom?.nodeCount ?? 0;
    const parseWarningCount = doc.dom?.parseWarnings.length ?? 0;
    const decodingHadErrors = doc.decoding.hadDecodingErrors;
    const docEffectivelyEmpty = doc.text.trim().length === 0;
    const isEntry = entryPath !== null && doc.path === entryPath;
    const domOutline = serializedDomAvailable ? createDomOutlineFromSerializedDom(doc.dom?.serializedDom ?? "") : null;
    const fidelity: PreparedDocumentFidelityProjection = serializedDomAvailable
      ? createFidelityProjectionFromSerializedDom(doc.dom?.serializedDom ?? "")
      : {
          kind: "prepared_document_fidelity_projection_v1",
          htmlLang: null,
          title: null,
          metaCharset: null,
          metaViewport: null,
          metaDescription: null,
          bodyClass: null,
          bodyId: null,
          stylesheetLinks: [],
        };
    const semantic = domOutline
      ? buildPageSemanticModel({
          pageId: documentIdForPath(doc.path),
          sourcePath: doc.path,
          isEntry,
          title: fidelity.title,
          htmlText: doc.text,
          stylesheetHrefs: fidelity.stylesheetLinks.map((link) => link.href),
          bodyClass: fidelity.bodyClass,
          bodyChildElements: domOutline.bodyChildElements,
        })
      : null;

    if (normalizedHtmlAvailable) documentsWithNormalizedHtmlCount++;
    if (doc.dom) documentsWithDomCount++;
    totalNodeCount += nodeCount;
    totalParseWarningCount += parseWarningCount;
    if (!docEffectivelyEmpty) effectivelyEmpty = false;

    const assetReferenceIds = referenceIdsByDocumentPath.get(doc.path) ?? [];

    documents.push({
      id: documentIdForPath(doc.path),
      path: doc.path,
      isEntry,
      originalKind: isEntry ? "entry_html" : "html_document",
      normalizedHtmlAvailable,
      serializedDomAvailable,
      nodeCount,
      parseWarningCount,
      decodingHadErrors,
      effectivelyEmpty: docEffectivelyEmpty,
      contentSha256: doc.contentSha256,
      byteLength: doc.byteLength,
      assetReferenceIds,
      domOutline,
      fidelity,
      semantic,
    });
  }

  const entryDocumentId =
    entryPath === null ? null : documents.find((d) => d.path === entryPath)?.id ?? null;

  const issueIds = importOutput.importDiagnostics.issues.map((i) => i.id).slice().sort(stringCmp);
  const codes = [...new Set(importManifest.diagnostics.codes)].sort(stringCmp);

  const status = computeStatus(importOutput, importManifest);

  return {
    kind: "prepared_site_model_v1",
    modelVersion: PREPARED_SITE_MODEL_VERSION,
    source: {
      importContractVersion: importOutput.contractVersion,
      importManifestVersion: importManifest.manifestVersion,
      fingerprints: importManifest.fingerprints,
      sourceKind: importManifest.sourceKind,
      entryHtmlPath: importManifest.entryHtmlPath,
      htmlFilePaths: [...importManifest.htmlFilePaths].slice().sort(stringCmp),
      assetsDirPath: importManifest.assetsDirPath,
    },
    status,
    siteSummary: {
      documentCount: documents.length,
      entryDocumentId,
      documentsWithNormalizedHtmlCount,
      documentsWithDomCount,
      totalNodeCount,
      totalParseWarningCount,
      effectivelyEmpty,
    },
    preparedAssets: {
      assetFiles: {
        totalCount: importManifest.assets.totalAssetFiles,
      },
      references: {
        totalCount: importManifest.assets.totalAssets,
        referencesByAssetKind: importManifest.assets.referencesByAssetKind,
        referencesByReferenceKind: importManifest.assets.referencesByReferenceKind,
        referencesByValidationStatus: importManifest.assets.referencesByValidationStatus,
        existingLocalCount: importManifest.assets.existingLocalCount,
        missingLocalCount: importManifest.assets.missingLocalCount,
      },
    },
    diagnostics: {
      import: {
        totalCount: importManifest.diagnostics.totalCount,
        infoCount: importManifest.diagnostics.infoCount,
        warningCount: importManifest.diagnostics.warningCount,
        errorCount: importManifest.diagnostics.errorCount,
        fatalCount: importManifest.diagnostics.fatalCount,
        codes,
        issueIds,
      },
    },
    documents,
  };
}
