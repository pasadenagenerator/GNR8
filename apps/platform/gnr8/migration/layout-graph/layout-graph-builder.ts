import { parse } from "parse5";

import { sha256Hex } from "@/gnr8/runtime/deterministic";

import type { LayoutGraph, LayoutAnomaly, LayoutNodeHint } from "./layout-graph-types";
import type { LayoutNode, LayoutNodeType, LayoutSignals } from "./layout-node-types";

type RawElementNode = {
  tagName: string;
  attrs?: Array<{ name?: string; value?: string }>;
  childNodes?: unknown[];
};

type RawTextNode = {
  nodeName?: string;
  value?: string;
};

type ClassifiedNode = {
  node: LayoutNode;
};

function asElement(node: unknown): RawElementNode | null {
  if (!node || typeof node !== "object") return null;
  const tagName = (node as { tagName?: unknown }).tagName;
  if (typeof tagName !== "string") return null;
  return node as RawElementNode;
}

function childElements(node: RawElementNode): RawElementNode[] {
  const out: RawElementNode[] = [];
  const children = Array.isArray(node.childNodes) ? node.childNodes : [];
  for (const child of children) {
    const asEl = asElement(child);
    if (asEl) out.push(asEl);
  }
  return out;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function attr(node: RawElementNode, name: string): string {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  const wanted = name.toLowerCase();
  for (const a of attrs) {
    if (String(a.name ?? "").toLowerCase() === wanted) return String(a.value ?? "");
  }
  return "";
}

function idClassSignal(node: RawElementNode): string {
  return `${attr(node, "id")} ${attr(node, "class")}`.toLowerCase();
}

function subtreeStats(node: RawElementNode): {
  textLength: number;
  linkCount: number;
  imageCount: number;
  headingCount: number;
  formControlCount: number;
  elementCount: number;
  legalKeywordHits: number;
} {
  const stack: unknown[] = [node];
  let textLength = 0;
  let linkCount = 0;
  let imageCount = 0;
  let headingCount = 0;
  let formControlCount = 0;
  let elementCount = 0;
  let legalKeywordHits = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;

    const asEl = asElement(current);
    if (asEl) {
      elementCount += 1;
      const tag = asEl.tagName.toLowerCase();
      if (tag === "a") linkCount += 1;
      if (tag === "img" || tag === "picture" || tag === "figure") imageCount += 1;
      if (tag === "h1" || tag === "h2" || tag === "h3") headingCount += 1;
      if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") formControlCount += 1;

      const textHints = idClassSignal(asEl);
      if (/\b(legal|privacy|terms|gdpr|copyright|cookies?)\b/i.test(textHints)) legalKeywordHits += 1;

      const children = Array.isArray(asEl.childNodes) ? asEl.childNodes : [];
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
      continue;
    }

    const asText = current as RawTextNode;
    if (asText.nodeName === "#text") {
      const normalized = normalizeWhitespace(String(asText.value ?? ""));
      if (!normalized) continue;
      textLength += normalized.length;
      if (/\b(legal|privacy|terms|gdpr|copyright|all rights reserved|cookies?)\b/i.test(normalized)) {
        legalKeywordHits += 1;
      }
    }
  }

  return {
    textLength,
    linkCount,
    imageCount,
    headingCount,
    formControlCount,
    elementCount,
    legalKeywordHits,
  };
}

function round2(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function buildSignals(input: {
  node: RawElementNode;
  textLength: number;
  linkCount: number;
  imageCount: number;
  headingCount: number;
  elementCount: number;
}): LayoutSignals {
  const sectionLikeTag = /^(main|section|article|header|footer|nav|aside|form)$/i.test(input.node.tagName);
  const classHint = idClassSignal(input.node);

  const textDensity = input.textLength / Math.max(1, input.elementCount);
  const imageDensity = input.imageCount / Math.max(1, input.elementCount);
  const linkDensity = input.linkCount / Math.max(1, input.elementCount);

  let sectionBreakConfidence = sectionLikeTag ? 0.82 : 0.3;
  if (/\b(section|band|block|row|container|wrap|content)\b/.test(classHint)) sectionBreakConfidence += 0.08;
  if (/\b(hero|banner|intro)\b/.test(classHint)) sectionBreakConfidence += 0.08;
  if (/\b(nav|menu|footer|header)\b/.test(classHint)) sectionBreakConfidence += 0.05;

  let visualClusterConfidence = 0.1;
  if (input.imageCount >= 3) visualClusterConfidence += 0.55;
  if (imageDensity >= 0.35) visualClusterConfidence += 0.2;
  if (/\b(gallery|portfolio|lightbox|photos|slider|carousel)\b/.test(classHint)) visualClusterConfidence += 0.2;

  return {
    textDensity: round2(textDensity),
    imageDensity: round2(imageDensity),
    linkDensity: round2(linkDensity),
    headingPresence: input.headingCount > 0,
    sectionBreakConfidence: round2(Math.min(1, sectionBreakConfidence)),
    visualClusterConfidence: round2(Math.min(1, visualClusterConfidence)),
  };
}

function classifyType(input: {
  node: RawElementNode;
  depth: number;
  domIndexStart: number;
  domMaxIndex: number;
  stats: ReturnType<typeof subtreeStats>;
  signals: LayoutSignals;
}): LayoutNodeType {
  const tag = input.node.tagName.toLowerCase();
  const hints = idClassSignal(input.node);
  const nearEnd = input.domIndexStart >= Math.floor(input.domMaxIndex * 0.7);

  if (tag === "nav") return "nav";
  if (tag === "header") return "header";
  if (tag === "footer") return "footer";
  if (tag === "form") return "form";

  if (/(^|\b)(nav|menu|navbar)(\b|$)/.test(hints) && input.signals.linkDensity >= 0.25) return "nav";
  if (/(^|\b)(footer|site-footer)(\b|$)/.test(hints)) return "footer";
  if (/(^|\b)(legal|privacy|terms|gdpr|copyright)(\b|$)/.test(hints) && nearEnd) return "legal";

  if ((tag === "section" || tag === "div" || tag === "aside") && input.stats.formControlCount >= 2) return "form";

  const galleryHint = /\b(gallery|portfolio|lightbox|photos|carousel|slider)\b/.test(hints);
  if (galleryHint || (input.stats.imageCount >= 3 && input.signals.visualClusterConfidence >= 0.6 && input.signals.textDensity < 50)) {
    return "gallery";
  }

  const looksHeroByHint = /\b(hero|banner|masthead|intro)\b/.test(hints);
  const heroWindow = input.domIndexStart <= Math.max(6, Math.floor(input.domMaxIndex * 0.35));
  const heroTextRange = input.stats.textLength >= 20 && input.stats.textLength <= 650;
  const notNavLike = input.signals.linkDensity < 0.22;
  if ((looksHeroByHint || (input.signals.headingPresence && heroWindow && heroTextRange)) && notNavLike && input.depth <= 3) {
    return "hero";
  }

  if (input.stats.legalKeywordHits >= 2 && nearEnd) return "legal";

  if (tag === "main" || tag === "section" || tag === "article") return "section";
  if (input.stats.textLength > 30 || input.signals.sectionBreakConfidence >= 0.6) return "section";

  return "unknown";
}

function nodeIdFor(pathSeed: string, depth: number, domIndexStart: number, tagName: string): string {
  return sha256Hex(`layout_node_v1:${pathSeed}:${depth}:${domIndexStart}:${tagName}`);
}

function findFirstByTagName(root: unknown, tagNameLower: string): RawElementNode | null {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    const asEl = asElement(current);
    if (asEl && asEl.tagName.toLowerCase() === tagNameLower) return asEl;
    const childNodes = (current as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (let i = childNodes.length - 1; i >= 0; i--) stack.push(childNodes[i]);
    }
  }
  return null;
}

function collectDomMaxIndex(root: RawElementNode): number {
  let count = -1;
  const stack: RawElementNode[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    count += 1;
    const children = childElements(current);
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
  }
  return Math.max(count, 0);
}

function buildLayoutNodeTree(input: {
  element: RawElementNode;
  depth: number;
  nextDomIndex: { value: number };
  pathSeed: string;
  domMaxIndex: number;
  nodeIndex: Map<string, LayoutNode>;
}): ClassifiedNode {
  const domIndexStart = input.nextDomIndex.value;
  input.nextDomIndex.value += 1;

  const childrenClassified: ClassifiedNode[] = [];
  for (const child of childElements(input.element)) {
    childrenClassified.push(
      buildLayoutNodeTree({
        element: child,
        depth: input.depth + 1,
        nextDomIndex: input.nextDomIndex,
        pathSeed: input.pathSeed,
        domMaxIndex: input.domMaxIndex,
        nodeIndex: input.nodeIndex,
      }),
    );
  }

  const domIndexEnd = childrenClassified.length > 0 ? childrenClassified[childrenClassified.length - 1]!.node.domIndexEnd : domIndexStart;

  const stats = subtreeStats(input.element);
  const signals = buildSignals({
    node: input.element,
    textLength: stats.textLength,
    linkCount: stats.linkCount,
    imageCount: stats.imageCount,
    headingCount: stats.headingCount,
    elementCount: stats.elementCount,
  });

  const type = classifyType({
    node: input.element,
    depth: input.depth,
    domIndexStart,
    domMaxIndex: input.domMaxIndex,
    stats,
    signals,
  });

  const node: LayoutNode = {
    id: nodeIdFor(input.pathSeed, input.depth, domIndexStart, input.element.tagName),
    type,
    depth: input.depth,
    domIndexStart,
    domIndexEnd,
    children: childrenClassified.map((c) => c.node),
    signals,
  };

  input.nodeIndex.set(node.id, node);

  return {
    node,
  };
}

function validateRanges(root: LayoutNode): LayoutAnomaly[] {
  const anomalies: LayoutAnomaly[] = [];

  const stack: LayoutNode[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;

    let previousStart = -1;
    for (const child of current.children) {
      if (child.domIndexStart < current.domIndexStart || child.domIndexEnd > current.domIndexEnd) {
        anomalies.push({
          code: "CHILD_RANGE_OUTSIDE_PARENT",
          message: `child range [${child.domIndexStart},${child.domIndexEnd}] outside parent [${current.domIndexStart},${current.domIndexEnd}]`,
          nodeId: child.id,
        });
      }
      if (child.domIndexStart < previousStart) {
        anomalies.push({
          code: "NON_MONOTONIC_CHILD_ORDER",
          message: "children are not in DOM order",
          nodeId: current.id,
        });
      }
      previousStart = child.domIndexStart;
      stack.push(child);
    }
  }

  return anomalies;
}

export function buildLayoutGraphFromSnapshotHtml(input: { html: string; pathSeed?: string }): LayoutGraph {
  const html = String(input.html ?? "");
  const pathSeed = String(input.pathSeed ?? "snapshot:index.html");

  const nodeIndex = new Map<string, LayoutNode>();
  const anomalies: LayoutAnomaly[] = [];

  const parsed = parse(html);
  const body = findFirstByTagName(parsed, "body");

  if (!body) {
    const fallbackRoot: LayoutNode = {
      id: nodeIdFor(pathSeed, 0, 0, "root"),
      type: "unknown",
      depth: 0,
      domIndexStart: 0,
      domIndexEnd: 0,
      children: [],
      signals: {
        textDensity: 0,
        imageDensity: 0,
        linkDensity: 0,
        headingPresence: false,
        sectionBreakConfidence: 0,
        visualClusterConfidence: 0,
      },
    };
    nodeIndex.set(fallbackRoot.id, fallbackRoot);
    anomalies.push({ code: "MISSING_BODY", message: "Snapshot has no <body> element." });
    return { root: fallbackRoot, nodeIndex, anomalies };
  }

  const bodyChildren = childElements(body);
  if (bodyChildren.length === 0) {
    anomalies.push({ code: "EMPTY_BODY", message: "Snapshot body has no element children." });
  }

  const domMaxIndex = collectDomMaxIndex(body);
  const nextDomIndex = { value: 0 };

  const classifiedChildren = bodyChildren.map((el) =>
    buildLayoutNodeTree({
      element: el,
      depth: 1,
      nextDomIndex,
      pathSeed,
      domMaxIndex,
      nodeIndex,
    }),
  );

  const root: LayoutNode = {
    id: nodeIdFor(pathSeed, 0, 0, "root"),
    type: "unknown",
    depth: 0,
    domIndexStart: 0,
    domIndexEnd: Math.max(0, nextDomIndex.value - 1),
    children: classifiedChildren.map((c) => c.node),
    signals: {
      textDensity: 0,
      imageDensity: 0,
      linkDensity: 0,
      headingPresence: classifiedChildren.some((c) => c.node.signals.headingPresence),
      sectionBreakConfidence: 1,
      visualClusterConfidence: 0,
    },
  };

  nodeIndex.set(root.id, root);
  anomalies.push(...validateRanges(root));

  return {
    root,
    nodeIndex,
    anomalies,
  };
}

function collectNodesInDomOrder(root: LayoutNode): LayoutNode[] {
  const out: LayoutNode[] = [];
  const stack: LayoutNode[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    out.push(current);
    for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]!);
  }
  return out.sort((a, b) => {
    if (a.domIndexStart !== b.domIndexStart) return a.domIndexStart - b.domIndexStart;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.id.localeCompare(b.id);
  });
}

export function collectSemanticLayoutHints(graph: LayoutGraph): LayoutNodeHint[] {
  return collectNodesInDomOrder(graph.root)
    .filter((n) => n.depth > 0)
    .map((n) => ({
      id: n.id,
      type: n.type,
      depth: n.depth,
      domIndexStart: n.domIndexStart,
      domIndexEnd: n.domIndexEnd,
      signals: n.signals,
    }));
}

export function mapBlockOrdinalToLayoutHint(input: {
  hints: LayoutNodeHint[];
  blockOrdinal: number;
}): LayoutNodeHint | null {
  if (input.blockOrdinal < 0) return null;
  const topLevel = input.hints.filter((h) => h.depth === 1).sort((a, b) => a.domIndexStart - b.domIndexStart);
  const exact = topLevel[input.blockOrdinal] ?? null;
  if (exact) return exact;
  const fallback = input.hints.sort((a, b) => a.domIndexStart - b.domIndexStart)[input.blockOrdinal] ?? null;
  return fallback;
}
