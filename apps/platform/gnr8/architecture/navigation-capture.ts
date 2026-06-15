import * as parse5 from "parse5";

import type {
  CaptureExpansionConfidenceLevel,
  LayoutGeometryEvidence,
  NavigationEvidence,
  NavigationEvidenceItem,
  SectionBoundaryEvidence,
} from "./evidence-capture-layout-contract";

type ParsedNode = {
  nodeName?: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: ParsedNode[];
  parentNode?: ParsedNode;
  value?: string;
};

type LinkCandidate = NavigationEvidenceItem & {
  selector: string;
  confidenceRank: number;
  sourceEvidenceRefs: string[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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

function assignParents(node: ParsedNode): void {
  for (const child of children(node)) {
    child.parentNode = node;
    assignParents(child);
  }
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

function textContent(node: ParsedNode): string {
  const parts: string[] = [];
  walk(node, (item) => {
    if (item.nodeName === "#text") parts.push(normalizeText(item.value));
  });
  return normalizeText(parts.join(" "));
}

function ancestors(node: ParsedNode): ParsedNode[] {
  const items: ParsedNode[] = [];
  let current = node.parentNode;
  while (current) {
    if (isElement(current)) items.push(current);
    current = current.parentNode;
  }
  return items;
}

function descendantLinkCount(node: ParsedNode): number {
  let count = 0;
  walk(node, (item) => {
    if (normalizeText(item.tagName).toLowerCase() === "a" && normalizeText(attr(item, "href"))) count += 1;
  });
  return count;
}

function isNavigationRole(role: string): boolean {
  return role === "navigation" || role === "menu" || role === "menubar";
}

function confidenceRank(confidenceLevel: CaptureExpansionConfidenceLevel): number {
  if (confidenceLevel === "HIGH") return 3;
  if (confidenceLevel === "MEDIUM") return 2;
  return 1;
}

function rankConfidence(rank: number): CaptureExpansionConfidenceLevel {
  if (rank >= 3) return "HIGH";
  if (rank >= 2) return "MEDIUM";
  return "LOW";
}

function collectSourceRefs(input: {
  selectors: Set<string>;
  layoutRegionsBySelector: Map<string, string>;
  sectionNavigationBySelector: Map<string, string>;
}): string[] {
  const refs = new Set<string>();
  for (const selector of input.selectors) {
    const layoutRef = input.layoutRegionsBySelector.get(selector);
    const sectionRef = input.sectionNavigationBySelector.get(selector);
    if (layoutRef) refs.add(layoutRef);
    if (sectionRef) refs.add(sectionRef);
  }
  return [...refs].sort();
}

function classifyLink(input: {
  ancestorNodes: ParsedNode[];
  ancestorSelectors: Set<string>;
  layoutRegionsBySelector: Map<string, string>;
  sectionNavigationBySelector: Map<string, string>;
}): { confidenceLevel: CaptureExpansionConfidenceLevel; sourceEvidenceRefs: string[] } | null {
  const sourceEvidenceRefs = collectSourceRefs({
    selectors: input.ancestorSelectors,
    layoutRegionsBySelector: input.layoutRegionsBySelector,
    sectionNavigationBySelector: input.sectionNavigationBySelector,
  });

  const insideExplicitNavigation = input.ancestorNodes.some((ancestor) => {
    const tagName = normalizeText(ancestor.tagName).toLowerCase();
    const role = normalizeText(attr(ancestor, "role")).toLowerCase();
    return tagName === "nav" || isNavigationRole(role);
  });
  if (insideExplicitNavigation) return { confidenceLevel: "HIGH", sourceEvidenceRefs };

  const insideHeaderNavigationRegion = input.ancestorNodes.some((ancestor) => {
    const tagName = normalizeText(ancestor.tagName).toLowerCase();
    const selector = selectorFor(ancestor);
    return tagName === "header" && input.sectionNavigationBySelector.has(selector);
  });
  if (insideHeaderNavigationRegion) return { confidenceLevel: "HIGH", sourceEvidenceRefs };

  const inRepeatedNavigationLikeLinks = input.ancestorNodes.some((ancestor) => {
    const tagName = normalizeText(ancestor.tagName).toLowerCase();
    const markerText = attrText(ancestor);
    const linkCount = descendantLinkCount(ancestor);
    if (linkCount < 2) return false;
    return (
      tagName === "ul" ||
      tagName === "ol" ||
      tagName === "header" ||
      tagName === "footer" ||
      /\b(?:nav|menu|links|navbar|navigation)\b/i.test(markerText)
    );
  });
  if (inRepeatedNavigationLikeLinks) return { confidenceLevel: "MEDIUM", sourceEvidenceRefs };

  const inferredNavigationContainer = input.ancestorNodes.some((ancestor) =>
    /\b(?:nav|menu|links|navbar|navigation)\b/i.test(attrText(ancestor)),
  );
  if (inferredNavigationContainer) return { confidenceLevel: "LOW", sourceEvidenceRefs };

  return null;
}

export function createNavigationEvidence(input: {
  routePath: string;
  renderedHtml?: string | null;
  layoutGeometryEvidence: LayoutGeometryEvidence[];
  sectionBoundaryEvidence: SectionBoundaryEvidence[];
}): NavigationEvidence[] {
  const renderedHtml = normalizeText(input.renderedHtml);
  if (!renderedHtml) return [];

  const root = parse5.parse(renderedHtml, { sourceCodeLocationInfo: false }) as unknown as ParsedNode;
  assignParents(root);

  const routePath = normalizeText(input.routePath) || "/";
  const layoutRegionsBySelector = new Map<string, string>();
  for (const evidence of input.layoutGeometryEvidence) {
    for (const region of evidence.regions) {
      const selector = normalizeText(region.selector);
      if (selector) layoutRegionsBySelector.set(selector, region.regionId);
    }
  }

  const sectionNavigationBySelector = new Map<string, string>();
  for (const section of input.sectionBoundaryEvidence) {
    if (section.regionType !== "navigation") continue;
    const selector = normalizeText(section.selector);
    if (selector) sectionNavigationBySelector.set(selector, section.sectionId);
  }

  const candidates: LinkCandidate[] = [];
  let domPosition = 0;
  walk(root, (node) => {
    if (normalizeText(node.tagName).toLowerCase() !== "a") return;
    const href = normalizeText(attr(node, "href"));
    if (!href) return;

    const label = normalizeText(textContent(node) || attr(node, "aria-label") || attr(node, "title"));
    if (!label) return;

    const selector = selectorFor(node);
    const ancestorNodes = ancestors(node);
    const ancestorSelectors = new Set(ancestorNodes.map(selectorFor).filter(Boolean));
    const classification = classifyLink({
      ancestorNodes,
      ancestorSelectors,
      layoutRegionsBySelector,
      sectionNavigationBySelector,
    });
    if (!classification) return;
    const sourceEvidenceRefs = new Set(classification.sourceEvidenceRefs);
    if (sourceEvidenceRefs.size === 0) sourceEvidenceRefs.add(selector);
    domPosition += 1;
    candidates.push({
      label,
      href,
      position: domPosition,
      confidenceLevel: classification.confidenceLevel,
      confidenceRank: confidenceRank(classification.confidenceLevel),
      sourceEvidenceRefs: [...sourceEvidenceRefs].sort(),
      selector,
    });
  });

  const deduped = new Map<string, LinkCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.label.toLowerCase()}\u0000${candidate.href}`;
    const existing = deduped.get(key);
    if (!existing || candidate.confidenceRank > existing.confidenceRank) {
      deduped.set(key, candidate);
      continue;
    }
    if (existing && candidate.confidenceRank === existing.confidenceRank) {
      for (const ref of candidate.sourceEvidenceRefs) existing.sourceEvidenceRefs.push(ref);
      existing.sourceEvidenceRefs = [...new Set(existing.sourceEvidenceRefs)].sort();
    }
  }

  const navigationItems = [...deduped.values()]
    .filter((candidate) => candidate.confidenceRank > 1 || candidate.sourceEvidenceRefs.length > 0)
    .sort((left, right) => {
      const positionDelta = left.position - right.position;
      if (positionDelta !== 0) return positionDelta;
      return left.href.localeCompare(right.href);
    })
    .map((candidate, index): NavigationEvidenceItem => ({
      label: candidate.label,
      href: candidate.href,
      position: index + 1,
      confidenceLevel: rankConfidence(candidate.confidenceRank),
    }));

  if (navigationItems.length === 0) return [];

  const sourceEvidenceRefs = [...new Set([...deduped.values()].flatMap((candidate) => candidate.sourceEvidenceRefs))].sort();
  return [
    {
      routePath,
      navigationItems,
      navigationCount: navigationItems.length,
      sourceEvidenceRefs,
    },
  ];
}
