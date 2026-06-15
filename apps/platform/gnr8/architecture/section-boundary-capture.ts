import crypto from "node:crypto";
import * as parse5 from "parse5";

import type {
  CaptureExpansionConfidenceLevel,
  EvidenceBoundingBox,
  LayoutGeometryEvidence,
  LayoutGeometryRegion,
  SectionBoundaryEvidence,
  SectionBoundaryRegionType,
} from "./evidence-capture-layout-contract";
import { normalizeLayoutGeometryBoundingBox } from "./layout-geometry-capture";

type ParsedNode = {
  nodeName?: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: ParsedNode[];
  parentNode?: ParsedNode;
  value?: string;
};

type DomRegionFacts = {
  selector: string;
  tagName: string;
  role: string | null;
  attributeText: string;
  textLength: number;
  containsH1: boolean;
  containsPrimaryCta: boolean;
  containsNav: boolean;
  containsForm: boolean;
  imageCount: number;
  hasGalleryMarker: boolean;
  hasMapMarker: boolean;
};

type SectionClassification = {
  regionType: SectionBoundaryRegionType;
  confidenceLevel: CaptureExpansionConfidenceLevel;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function attr(node: ParsedNode, name: string): string | null {
  const match = node.attrs?.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return match ? normalizeText(match.value) || null : null;
}

function attrText(node: ParsedNode): string {
  return (node.attrs ?? [])
    .filter((item) => ["id", "class", "role", "aria-label", "data-role", "data-testid"].includes(item.name.toLowerCase()))
    .map((item) => item.value)
    .join(" ")
    .toLowerCase();
}

function isElement(node: ParsedNode): boolean {
  return Boolean(node.tagName);
}

function children(node: ParsedNode): ParsedNode[] {
  return node.childNodes ?? [];
}

function elementChildren(node: ParsedNode): ParsedNode[] {
  return children(node).filter(isElement);
}

function safeIdent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function nthOfType(node: ParsedNode): number {
  const tagName = normalizeText(node.tagName).toLowerCase();
  const siblings = node.parentNode ? elementChildren(node.parentNode) : [];
  let index = 1;
  for (const sibling of siblings) {
    if (sibling === node) return index;
    if (normalizeText(sibling.tagName).toLowerCase() === tagName) index += 1;
  }
  return index;
}

function selectorFor(node: ParsedNode): string {
  const tagName = normalizeText(node.tagName).toLowerCase();
  if (!tagName) return "";
  if (tagName === "body") return "body";
  const id = attr(node, "id");
  if (id) return `${tagName}#${safeIdent(id)}`;

  const segments: string[] = [];
  let current: ParsedNode | undefined = node;
  while (current && isElement(current) && normalizeText(current.tagName).toLowerCase() !== "html") {
    const currentTag = normalizeText(current.tagName).toLowerCase();
    if (currentTag === "body") {
      segments.unshift("body");
      break;
    }
    const currentId = attr(current, "id");
    if (currentId) {
      segments.unshift(`${currentTag}#${safeIdent(currentId)}`);
      break;
    }
    segments.unshift(`${currentTag}:nth-of-type(${nthOfType(current)})`);
    current = current.parentNode;
  }
  return segments.join(" > ");
}

function walk(node: ParsedNode, visit: (node: ParsedNode) => void): void {
  visit(node);
  for (const child of children(node)) walk(child, visit);
}

function textLength(node: ParsedNode): number {
  let length = 0;
  walk(node, (item) => {
    if (item.nodeName === "#text") length += normalizeText(item.value).length;
  });
  return length;
}

function nodeHasPrimaryCta(node: ParsedNode): boolean {
  const tagName = normalizeText(node.tagName).toLowerCase();
  const role = attr(node, "role")?.toLowerCase() ?? "";
  const markerText = attrText(node);
  return (
    tagName === "button" ||
    role === "button" ||
    (tagName === "a" && /\b(?:cta|btn|button|primary)\b/i.test(markerText))
  );
}

function nodeHasMapMarker(node: ParsedNode): boolean {
  const tagName = normalizeText(node.tagName).toLowerCase();
  const markerText = [
    attrText(node),
    attr(node, "src") ?? "",
    attr(node, "href") ?? "",
  ].join(" ").toLowerCase();
  if (tagName === "iframe" && /\b(?:google\.com\/maps|maps\.google|openstreetmap|osm\.org|mapbox)\b/i.test(markerText)) return true;
  return /\b(?:map|maps|mapbox|leaflet|openstreetmap|google-map|google_map|osm-map|map-container)\b/i.test(markerText);
}

function nodeHasGalleryMarker(node: ParsedNode): boolean {
  return /\b(?:gallery|carousel|slider|swiper|slick|lightbox|fancybox)\b/i.test(attrText(node));
}

function buildDomRegionFacts(renderedHtml: string): Map<string, DomRegionFacts> {
  const root = parse5.parse(renderedHtml, { sourceCodeLocationInfo: false }) as unknown as ParsedNode;
  const facts = new Map<string, DomRegionFacts>();

  walk(root, (node) => {
    if (!isElement(node)) return;
    const selector = selectorFor(node);
    if (!selector) return;

    let containsH1 = false;
    let containsPrimaryCta = false;
    let containsNav = false;
    let containsForm = false;
    let imageCount = 0;
    let hasGalleryMarker = false;
    let hasMapMarker = false;
    let nestedAttributeText = "";

    walk(node, (nested) => {
      if (!isElement(nested)) return;
      const tagName = normalizeText(nested.tagName).toLowerCase();
      const role = attr(nested, "role")?.toLowerCase() ?? "";
      nestedAttributeText = `${nestedAttributeText} ${attrText(nested)}`;
      if (tagName === "h1") containsH1 = true;
      if (nodeHasPrimaryCta(nested)) containsPrimaryCta = true;
      if (tagName === "nav" || role === "navigation" || role === "menu" || role === "menubar") containsNav = true;
      if (tagName === "form") containsForm = true;
      if (tagName === "img" || tagName === "picture") imageCount += 1;
      if (nodeHasGalleryMarker(nested)) hasGalleryMarker = true;
      if (nodeHasMapMarker(nested)) hasMapMarker = true;
    });

    facts.set(selector, {
      selector,
      tagName: normalizeText(node.tagName).toLowerCase(),
      role: attr(node, "role"),
      attributeText: nestedAttributeText.toLowerCase(),
      textLength: textLength(node),
      containsH1,
      containsPrimaryCta,
      containsNav,
      containsForm,
      imageCount,
      hasGalleryMarker,
      hasMapMarker,
    });
  });

  return facts;
}

function hasPositiveBox(box: EvidenceBoundingBox): boolean {
  return box.width > 0 && box.height > 0;
}

function stableSectionBoundaryId(input: {
  routePath: string;
  selector: string;
  boundingBox: EvidenceBoundingBox;
  regionType: SectionBoundaryRegionType;
}): string {
  const hash = crypto
    .createHash("sha256")
    .update(
      [
        normalizeText(input.routePath) || "/",
        normalizeText(input.selector),
        input.boundingBox.x,
        input.boundingBox.y,
        input.boundingBox.width,
        input.boundingBox.height,
        input.regionType,
      ].join(":"),
    )
    .digest("hex")
    .slice(0, 12);
  return `section-boundary-${hash}`;
}

function isNearTop(region: LayoutGeometryRegion, evidence: LayoutGeometryEvidence): boolean {
  return region.boundingBox.y <= Math.max(240, evidence.viewportHeight * 0.45);
}

function isLarge(region: LayoutGeometryRegion, evidence: LayoutGeometryEvidence): boolean {
  return (
    region.boundingBox.width >= evidence.viewportWidth * 0.5 &&
    region.boundingBox.height >= Math.max(220, evidence.viewportHeight * 0.25)
  );
}

function classifyRegion(
  evidence: LayoutGeometryEvidence,
  region: LayoutGeometryRegion,
  facts: DomRegionFacts | null,
): SectionClassification {
  const tagName = region.tagName.toLowerCase();
  const role = normalizeText(region.role).toLowerCase();
  const selector = region.selector.toLowerCase();
  const markerText = [selector, facts?.attributeText ?? "", facts?.role ?? ""].join(" ");

  if (tagName === "nav" || role === "navigation" || role === "menu" || role === "menubar" || facts?.containsNav === true || /\b(?:nav|menu)\b/i.test(markerText)) {
    return { regionType: "navigation", confidenceLevel: tagName === "nav" || role === "navigation" ? "HIGH" : "MEDIUM" };
  }

  if (tagName === "footer" || role === "contentinfo" || /\bfooter\b/i.test(markerText)) {
    return { regionType: "footer", confidenceLevel: tagName === "footer" || role === "contentinfo" ? "HIGH" : "MEDIUM" };
  }

  if (tagName === "aside" || role === "complementary" || /\bsidebar\b/i.test(markerText)) {
    return { regionType: "sidebar", confidenceLevel: tagName === "aside" || role === "complementary" ? "HIGH" : "MEDIUM" };
  }

  if (facts?.containsForm === true || /\bform\b/i.test(markerText)) {
    return { regionType: "form", confidenceLevel: facts?.containsForm === true ? "HIGH" : "MEDIUM" };
  }

  if (facts?.hasMapMarker === true || /\b(?:map|maps|mapbox|leaflet|openstreetmap|google-map|osm-map|map-container)\b/i.test(markerText)) {
    return { regionType: "map", confidenceLevel: facts?.hasMapMarker === true ? "HIGH" : "MEDIUM" };
  }

  if (facts?.hasGalleryMarker === true || Number(facts?.imageCount ?? 0) >= 3) {
    return { regionType: "gallery", confidenceLevel: facts?.hasGalleryMarker === true ? "HIGH" : "MEDIUM" };
  }

  if (
    (tagName === "section" || tagName === "header") &&
    isNearTop(region, evidence) &&
    isLarge(region, evidence) &&
    (facts?.containsH1 === true || facts?.containsPrimaryCta === true)
  ) {
    return { regionType: "hero", confidenceLevel: facts?.containsH1 === true ? "HIGH" : "MEDIUM" };
  }

  if ((tagName === "main" || tagName === "section") && (region.childCount > 0 || Number(facts?.textLength ?? 0) > 0)) {
    return { regionType: "content", confidenceLevel: tagName === "main" ? "HIGH" : "MEDIUM" };
  }

  return { regionType: "unknown", confidenceLevel: "LOW" };
}

export function createSectionBoundaryEvidence(input: {
  layoutGeometryEvidence: LayoutGeometryEvidence[];
  renderedHtml?: string | null;
}): SectionBoundaryEvidence[] {
  const renderedHtml = normalizeText(input.renderedHtml);
  const domFactsBySelector = renderedHtml ? buildDomRegionFacts(renderedHtml) : new Map<string, DomRegionFacts>();
  const sectionEvidence: SectionBoundaryEvidence[] = [];

  for (const evidence of input.layoutGeometryEvidence) {
    const routePath = normalizeText(evidence.routePath) || "/";
    const candidateRegions = evidence.regions.filter((region) => region.tagName.toLowerCase() !== "body");
    const regions = candidateRegions.length > 0 ? candidateRegions : evidence.regions;

    for (const region of regions) {
      const selector = normalizeText(region.selector);
      const boundingBox = normalizeLayoutGeometryBoundingBox(region.boundingBox);
      if (!selector || !hasPositiveBox(boundingBox)) continue;

      const classification = classifyRegion(evidence, { ...region, boundingBox }, domFactsBySelector.get(selector) ?? null);
      sectionEvidence.push({
        sectionId: stableSectionBoundaryId({
          routePath,
          selector,
          boundingBox,
          regionType: classification.regionType,
        }),
        routePath,
        selector,
        boundingBox,
        regionType: classification.regionType,
        confidenceLevel: classification.confidenceLevel,
      });
    }
  }

  return sectionEvidence.sort((left, right) => {
    const yDelta = left.boundingBox.y - right.boundingBox.y;
    if (yDelta !== 0) return yDelta;
    const xDelta = left.boundingBox.x - right.boundingBox.x;
    if (xDelta !== 0) return xDelta;
    return left.selector.localeCompare(right.selector);
  });
}
