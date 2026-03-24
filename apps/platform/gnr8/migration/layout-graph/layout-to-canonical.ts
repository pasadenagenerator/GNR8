import { extractBodyHtml, extractElementFrom, extractTopLevelBlocksOrdered, innerHtmlOfElement, textFromHtml } from "@/gnr8/importer/html-utils";
import { extractAllAnchorLinks, extractAllImgSrc } from "@/gnr8/importer/html-utils";

import { collectSemanticLayoutHints, mapBlockOrdinalToLayoutHint } from "@/gnr8/migration/layout-graph/layout-graph-builder";
import type { LayoutGraph, LayoutNodeHint } from "@/gnr8/migration/layout-graph/layout-graph-types";
import type { LayoutNodeType } from "@/gnr8/migration/layout-graph/layout-node-types";
import { computeStructuralConfidence, type StructuralConfidenceComponents } from "@/gnr8/migration/layout-graph/structural-confidence";
import { deterministicId } from "@/gnr8/runtime/deterministic";

export type CanonicalLayoutIntent =
  | "header_nav"
  | "hero"
  | "body"
  | "gallery_media"
  | "form_contact"
  | "footer_legal"
  | "unknown";

export type CanonicalLayoutGroup = {
  id: string;
  order: number;
  intent: CanonicalLayoutIntent;
  domIndexStart: number;
  domIndexEnd: number;
  sourceNodeTypes: LayoutNodeType[];
  confidence: number;
};

export type CanonicalLayoutBlockPlan = {
  blockHtml: string;
  blockOrdinal: number;
  group: CanonicalLayoutGroup;
  layoutHint: LayoutNodeHint | null;
  structuralConfidence: number;
  confidenceComponents: StructuralConfidenceComponents;
  anomalies: string[];
};

function round2(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mapNodeTypeToIntent(type: LayoutNodeType): CanonicalLayoutIntent {
  switch (type) {
    case "header":
    case "nav":
      return "header_nav";
    case "hero":
      return "hero";
    case "gallery":
      return "gallery_media";
    case "form":
      return "form_contact";
    case "footer":
    case "legal":
      return "footer_legal";
    case "section":
      return "body";
    case "unknown":
    default:
      return "unknown";
  }
}

function baseConfidenceForType(type: LayoutNodeType): number {
  switch (type) {
    case "header":
    case "nav":
    case "hero":
    case "footer":
    case "legal":
      return 0.82;
    case "gallery":
    case "form":
      return 0.78;
    case "section":
      return 0.68;
    case "unknown":
    default:
      return 0.45;
  }
}

function structuralConfidenceForHint(hint: LayoutNodeHint): number {
  const base = baseConfidenceForType(hint.type);
  const sectionBreak = Number(hint.signals.sectionBreakConfidence ?? 0);
  const visualCluster = Number(hint.signals.visualClusterConfidence ?? 0);

  const blended =
    base * 0.55 +
    clamp01(sectionBreak) * 0.3 +
    (hint.type === "gallery" ? clamp01(visualCluster) * 0.15 : 0.05);

  return round2(clamp01(blended));
}

function shouldKeepHint(hint: LayoutNodeHint): boolean {
  if (hint.depth <= 2) return true;
  return hint.type === "hero" || hint.type === "gallery" || hint.type === "form" || hint.type === "nav" || hint.type === "footer" || hint.type === "legal";
}

function buildCanonicalGroups(graph: LayoutGraph): CanonicalLayoutGroup[] {
  const hints = collectSemanticLayoutHints(graph)
    .filter((hint) => shouldKeepHint(hint))
    .sort((a, b) => a.domIndexStart - b.domIndexStart || a.depth - b.depth || a.id.localeCompare(b.id));

  const groups: CanonicalLayoutGroup[] = [];

  for (const hint of hints) {
    const nextIntent = mapNodeTypeToIntent(hint.type);
    const confidence = structuralConfidenceForHint(hint);

    const prev = groups[groups.length - 1] ?? null;
    const canMerge =
      prev &&
      prev.intent === nextIntent &&
      hint.domIndexStart <= prev.domIndexEnd + 2;

    if (canMerge && prev) {
      prev.domIndexEnd = Math.max(prev.domIndexEnd, hint.domIndexEnd);
      if (!prev.sourceNodeTypes.includes(hint.type)) prev.sourceNodeTypes.push(hint.type);
      prev.confidence = round2(clamp01((prev.confidence + confidence) / 2));
      continue;
    }

    groups.push({
      id: deterministicId("layout-group", `${hint.domIndexStart}:${hint.domIndexEnd}:${nextIntent}:${hint.id}`),
      order: groups.length,
      intent: nextIntent,
      domIndexStart: hint.domIndexStart,
      domIndexEnd: hint.domIndexEnd,
      sourceNodeTypes: [hint.type],
      confidence,
    });
  }

  const meaningful = groups.filter((group) => group.intent !== "unknown");
  const result = meaningful.length > 0 ? meaningful : groups;
  return result.map((group, index) => ({ ...group, order: index }));
}

function normalizeCanonicalFlow(groups: CanonicalLayoutGroup[]): CanonicalLayoutGroup[] {
  const seen = new Set<CanonicalLayoutIntent>();
  const normalized: CanonicalLayoutGroup[] = [];

  for (const group of groups) {
    if (seen.has(group.intent)) continue;
    seen.add(group.intent);
    normalized.push(group);
  }

  const source = normalized.length > 0 ? normalized : groups;
  return source.map((group, index) => ({ ...group, order: index }));
}

function estimateBlockScore(html: string): number {
  const txt = textFromHtml(html);
  const imgCount = extractAllImgSrc(html).length;
  return txt.length + imgCount * 20;
}

function filterLikelyMeaningfulBlocks(blocks: string[]): string[] {
  const cleaned = blocks.map((block) => block.trim()).filter(Boolean);
  if (cleaned.length <= 1) return cleaned;

  const scored = cleaned
    .map((block) => ({ block, score: estimateBlockScore(block) }))
    .filter((entry) => entry.score >= 120);

  return scored.length >= 2 ? scored.map((entry) => entry.block) : cleaned;
}

function expandMainBlock(mainBlockHtml: string): string[] {
  const inner = innerHtmlOfElement(mainBlockHtml, "main");
  if (!inner) return [];

  const innerSemantic = extractTopLevelBlocksOrdered(inner, ["section", "article", "form", "div", "nav", "header", "footer"]);
  if (innerSemantic.length > 0) return filterLikelyMeaningfulBlocks(innerSemantic);

  return inner.trim() ? [inner.trim()] : [];
}

function splitHtmlIntoCanonicalBlocks(html: string): string[] {
  const body = extractBodyHtml(html);
  if (!body) return [];

  const topLevel = extractTopLevelBlocksOrdered(body, ["header", "nav", "main", "section", "article", "footer", "form", "div"]);
  if (topLevel.length > 0) {
    const expanded: string[] = [];
    for (const block of topLevel) {
      if (/^\s*<main\b/i.test(block)) {
        const mainExpanded = expandMainBlock(block);
        if (mainExpanded.length > 0) {
          expanded.push(...mainExpanded);
          continue;
        }
      }
      expanded.push(block);
    }

    const meaningful = filterLikelyMeaningfulBlocks(expanded);
    if (meaningful.length > 0) return meaningful;
  }

  const mainTop = extractTopLevelBlocksOrdered(body, ["main"])[0] ?? null;
  const main =
    mainTop ??
    (() => {
      const idx = body.toLowerCase().indexOf("<main");
      if (idx === -1) return null;
      return extractElementFrom(body, "main", idx);
    })();

  if (main) {
    const expanded = expandMainBlock(main);
    if (expanded.length > 0) return expanded;
  }

  const divs = extractTopLevelBlocksOrdered(body, ["div"]);
  if (divs.length > 0) return filterLikelyMeaningfulBlocks(divs);

  return body.trim() ? [body.trim()] : [];
}

function blockCompatibilityScore(blockHtml: string, hint: LayoutNodeHint): number {
  const lower = blockHtml.toLowerCase();
  const textLen = textFromHtml(blockHtml).length;
  const linkCount = extractAllAnchorLinks(blockHtml, 40).length;
  const imageCount = extractAllImgSrc(blockHtml).length;

  const hasFooterTag = /<footer\b/i.test(blockHtml);
  const hasNavTag = /<nav\b/i.test(blockHtml);
  const hasForm = /<form\b|<input\b|<textarea\b|<select\b/i.test(blockHtml);
  const hasH1 = /<h1\b/i.test(blockHtml);
  const hasLegalWords = /\b(legal|privacy|terms|gdpr|copyright|cookies?)\b/i.test(lower);
  const hasHeroWords = /\b(hero|banner|intro|masthead)\b/i.test(lower);
  const hasGalleryWords = /\b(gallery|portfolio|lightbox|slider|carousel)\b/i.test(lower);

  switch (hint.type) {
    case "nav":
      return (hasNavTag ? 8 : 0) + (linkCount >= 2 ? 4 : 0) + (textLen <= 500 ? 2 : -2);
    case "footer":
      return (hasFooterTag ? 8 : 0) + (hasLegalWords ? 4 : 0) + (hint.domIndexStart >= 2 ? 1 : 0);
    case "legal":
      return (hasLegalWords ? 8 : 0) + (hasFooterTag ? 2 : 0);
    case "hero":
      return (hasH1 ? 6 : 0) + (hasHeroWords ? 3 : 0) + (imageCount >= 1 ? 2 : 0) + (linkCount <= 2 ? 1 : -1);
    case "gallery":
      return (hasGalleryWords ? 6 : 0) + (imageCount >= 3 ? 4 : imageCount >= 2 ? 1 : -2);
    case "form":
      return hasForm ? 8 : -3;
    case "header":
      return (hasNavTag ? 4 : 0) + (hasH1 ? 2 : 0);
    case "section":
      return textLen > 20 ? 2 : 0;
    case "unknown":
    default:
      return 0;
  }
}

function resolveLayoutHintForBlock(input: {
  blockHtml: string;
  blockOrdinal: number;
  hints: LayoutNodeHint[];
  usedHintIds: Set<string>;
}): LayoutNodeHint | null {
  const availableHints = input.hints
    .filter((hint) => hint.depth > 0 && hint.depth <= 4)
    .filter((hint) => !input.usedHintIds.has(hint.id));

  const scored = availableHints
    .map((hint) => ({ hint, score: blockCompatibilityScore(input.blockHtml, hint) }))
    .sort((a, b) => b.score - a.score || a.hint.depth - b.hint.depth || a.hint.domIndexStart - b.hint.domIndexStart);

  const best = scored[0];
  if (best && best.score >= 2) {
    input.usedHintIds.add(best.hint.id);
    return best.hint;
  }

  const ordinalFallback = mapBlockOrdinalToLayoutHint({
    hints: input.hints,
    blockOrdinal: input.blockOrdinal,
  });
  if (ordinalFallback) input.usedHintIds.add(ordinalFallback.id);
  return ordinalFallback;
}

function assignGroupForBlock(input: {
  groups: CanonicalLayoutGroup[];
  blockOrdinal: number;
}): CanonicalLayoutGroup {
  const groups = input.groups;
  const byIndex = groups[input.blockOrdinal] ?? null;
  if (byIndex) return byIndex;
  const bodyGroup = groups.find((group) => group.intent === "body") ?? null;
  if (bodyGroup) return bodyGroup;
  return groups[groups.length - 1] ?? {
    id: deterministicId("layout-group", "unknown"),
    order: 0,
    intent: "unknown",
    domIndexStart: 0,
    domIndexEnd: 0,
    sourceNodeTypes: ["unknown"],
    confidence: 0.35,
  };
}

function collectNeighborSignals(input: {
  hints: LayoutNodeHint[];
  layoutHint: LayoutNodeHint | null;
}): LayoutNodeHint["signals"][] {
  if (!input.layoutHint) return [];
  const ordered = input.hints
    .slice()
    .sort((a, b) => a.domIndexStart - b.domIndexStart || a.depth - b.depth || a.id.localeCompare(b.id));
  const currentIndex = ordered.findIndex((hint) => hint.id === input.layoutHint?.id);
  if (currentIndex === -1) return [];
  const out: LayoutNodeHint["signals"][] = [];
  const prev = ordered[currentIndex - 1];
  const next = ordered[currentIndex + 1];
  if (prev) out.push(prev.signals);
  if (next) out.push(next.signals);
  return out;
}

export function buildLayoutToCanonicalBridge(input: {
  html: string;
  layoutGraph: LayoutGraph;
}): {
  groups: CanonicalLayoutGroup[];
  blocks: CanonicalLayoutBlockPlan[];
} {
  const groups = normalizeCanonicalFlow(buildCanonicalGroups(input.layoutGraph));
  const hints = collectSemanticLayoutHints(input.layoutGraph);
  const usedHintIds = new Set<string>();

  const rawBlocks = splitHtmlIntoCanonicalBlocks(input.html);

  const plannedBlocks = rawBlocks.map((blockHtml, blockOrdinal) => {
    const layoutHint = resolveLayoutHintForBlock({
      blockHtml,
      blockOrdinal,
      hints,
      usedHintIds,
    });

    const group = assignGroupForBlock({ groups, blockOrdinal });

    const structural = computeStructuralConfidence(
      {
        blockHtml,
        blockOrdinal,
        group,
        layoutHint: layoutHint ? { type: layoutHint.type, depth: layoutHint.depth } : null,
      },
      {
        primary: layoutHint?.signals ?? null,
        neighbors: collectNeighborSignals({ hints, layoutHint }),
      },
    );

    return {
      blockHtml,
      blockOrdinal,
      group,
      layoutHint,
      structuralConfidence: structural.score,
      confidenceComponents: structural.components,
      anomalies: structural.anomalies,
    } satisfies CanonicalLayoutBlockPlan;
  });

  const sorted = plannedBlocks.slice().sort((a, b) => {
    if (a.group.order !== b.group.order) return a.group.order - b.group.order;
    return a.blockOrdinal - b.blockOrdinal;
  });

  const ordered = sorted.map((plan, index) => ({ ...plan, blockOrdinal: index }));

  return {
    groups,
    blocks: ordered,
  };
}
