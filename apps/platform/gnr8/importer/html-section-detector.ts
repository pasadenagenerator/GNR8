import {
  extractAllImgSrc,
  extractBodyHtml,
  extractElementFrom,
  extractFirstTagInnerText,
  extractTopLevelBlocksOrdered,
  innerHtmlOfElement,
  normalizeWhitespace,
  textFromHtml,
} from "@/gnr8/importer/html-utils";

import type { Gnr8Section, Gnr8SectionProps } from "@/gnr8/types/section";
import { randomUUID } from "crypto";

function dedupeKeepOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function estimateBlockScore(html: string): number {
  const txt = textFromHtml(html);
  const imgCount = extractAllImgSrc(html).length;
  return txt.length + imgCount * 20;
}

function filterLikelyMeaningfulBlocks(blocks: string[]): string[] {
  const cleaned = blocks.map((b) => b.trim()).filter(Boolean);
  if (cleaned.length <= 1) return cleaned;
  const scored = cleaned
    .map((b) => ({ b, score: estimateBlockScore(b) }))
    .filter((x) => x.score >= 120);
  return scored.length >= 2 ? scored.map((x) => x.b) : cleaned;
}

export function splitHtmlIntoBlocks(html: string): string[] {
  const body = extractBodyHtml(html);
  if (!body) return [];

  // Prefer explicit semantic blocks at top-level.
  const semantic = extractTopLevelBlocksOrdered(body, ["header", "section"]);
  if (semantic.length > 0) return filterLikelyMeaningfulBlocks(semantic);

  // Try splitting within <main>.
  const mainTop = extractTopLevelBlocksOrdered(body, ["main"])[0] ?? null;
  const main =
    mainTop ??
    (() => {
      const idx = body.toLowerCase().indexOf("<main");
      if (idx === -1) return null;
      return extractElementFrom(body, "main", idx);
    })();

  if (main) {
    const inner = innerHtmlOfElement(main, "main");
    const innerBlocks = extractTopLevelBlocksOrdered(inner, ["section", "div"]);
    if (innerBlocks.length > 0) return filterLikelyMeaningfulBlocks(innerBlocks);
    if (inner.trim()) return [inner.trim()];
  }

  // Fallback: large top-level div blocks.
  const divs = extractTopLevelBlocksOrdered(body, ["div"]);
  if (divs.length > 0) return filterLikelyMeaningfulBlocks(divs);

  return body.trim() ? [body.trim()] : [];
}

function makeSection(type: string, props?: Gnr8SectionProps): Gnr8Section {
  return { id: randomUUID(), type, props };
}

function detectHero(blockHtml: string): Gnr8Section | null {
  const headline = extractFirstTagInnerText(blockHtml, "h1");
  if (!headline) return null;

  // Avoid misclassifying dense blocks as hero.
  const h2Count = (blockHtml.match(/<h2\b/gi) ?? []).length;
  const h3Count = (blockHtml.match(/<h3\b/gi) ?? []).length;
  if (h2Count + h3Count >= 3) return null;

  const sub = extractFirstTagInnerText(blockHtml, "p") ?? undefined;
  return makeSection("hero.split", {
    headline,
    ...(sub ? { subheadline: sub } : {}),
  });
}

function detectFeatureGrid(blockHtml: string): Gnr8Section | null {
  // Repeated (h2|h3|h4) + p patterns.
  const re = /<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>\s*<p\b[^>]*>([\s\S]*?)<\s*\/\s*p\s*>/gi;
  const items: Array<{ title: string; text: string }> = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(blockHtml))) {
    const title = textFromHtml(m[2] ?? "");
    const text = textFromHtml(m[3] ?? "");
    if (!title || !text) continue;
    items.push({ title, text });
    if (items.length >= 12) break;
  }

  const deduped = dedupeKeepOrder(items.map((i) => `${i.title}|||${i.text}`)).map((k) => {
    const [title, text] = k.split("|||");
    return { title, text };
  });

  if (deduped.length < 2) return null;
  return makeSection("feature.grid", { items: deduped });
}

function detectLogoCloud(blockHtml: string): Gnr8Section | null {
  const logos = dedupeKeepOrder(extractAllImgSrc(blockHtml));
  if (logos.length < 3) return null;
  return makeSection("logo.cloud", { logos });
}

export function detectSectionFromHtmlBlock(blockHtml: string): Gnr8Section {
  const html = blockHtml.trim();
  if (!html) return makeSection("legacy.html", { html: "" });

  const hero = detectHero(html);
  if (hero) return hero;

  const feature = detectFeatureGrid(html);
  if (feature) return feature;

  const logos = detectLogoCloud(html);
  if (logos) return logos;

  return makeSection("legacy.html", { html });
}

export function tidyTitleFromHtml(html: string): string | undefined {
  const t = extractFirstTagInnerText(html, "title");
  if (!t) return undefined;
  const cleaned = normalizeWhitespace(t);
  return cleaned || undefined;
}

