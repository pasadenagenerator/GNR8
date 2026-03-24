import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";
import { randomUUID } from "crypto";
import { extractAllAnchorLinks, extractAllImgSrc, textFromHtml } from "@/gnr8/importer/html-utils";
import type { LayoutNodeHint } from "@/gnr8/migration/layout-graph/layout-graph-types";

import {
  buildLayoutGraphFromSnapshotHtml,
  collectSemanticLayoutHints,
  mapBlockOrdinalToLayoutHint,
} from "@/gnr8/migration/layout-graph/layout-graph-builder";

import {
  detectSectionFromHtmlBlock,
  splitHtmlIntoBlocks,
  tidyTitleFromHtml,
} from "@/gnr8/importer/html-section-detector";

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
      return 0;
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
  const topLevelHints = input.hints.filter((h) => h.depth === 1);
  const availableTopLevel = topLevelHints.filter((h) => !input.usedHintIds.has(h.id));

  const scored = availableTopLevel
    .map((hint) => ({ hint, score: blockCompatibilityScore(input.blockHtml, hint) }))
    .sort((a, b) => b.score - a.score || a.hint.domIndexStart - b.hint.domIndexStart);

  const best = scored[0];
  if (best && best.score >= 3) {
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

export type HtmlImportInput = {
  slug: string;
  title?: string;
  html: string;
};

export function importHtmlToPage(input: HtmlImportInput): Gnr8Page {
  const slug = String(input.slug ?? "").trim();
  const html = String(input.html ?? "");
  const title = (input.title ?? "").trim() || tidyTitleFromHtml(html);

  const layoutGraph = buildLayoutGraphFromSnapshotHtml({
    html,
    pathSeed: slug || "snapshot:index.html",
  });
  const layoutHints = collectSemanticLayoutHints(layoutGraph);
  const usedHintIds = new Set<string>();

  const blocks = splitHtmlIntoBlocks(html);
  const sections: Gnr8Section[] =
    blocks.length > 0
      ? blocks.map((b, i) =>
          detectSectionFromHtmlBlock(b, {
            layoutHint: resolveLayoutHintForBlock({
              blockHtml: b,
              blockOrdinal: i,
              hints: layoutHints,
              usedHintIds,
            }),
          }),
        )
      : [
          detectSectionFromHtmlBlock(html, {
            layoutHint: resolveLayoutHintForBlock({
              blockHtml: html,
              blockOrdinal: 0,
              hints: layoutHints,
              usedHintIds,
            }),
          }),
        ];

  return {
    id: randomUUID(),
    slug,
    ...(title ? { title } : {}),
    sections,
  };
}
