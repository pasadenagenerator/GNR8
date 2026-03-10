import {
  extractAllImgSrc,
  extractAllAnchorLinks,
  extractBodyHtml,
  extractElementFrom,
  extractFirstButtonText,
  extractFirstImgAlt,
  extractFirstTagInnerText,
  extractTopLevelBlocksOrdered,
  innerHtmlOfElement,
  normalizeWhitespace,
  textFromHtml,
} from "@/gnr8/importer/html-utils";

import type { Gnr8Section, Gnr8SectionProps } from "@/gnr8/types/section";
import { randomUUID } from "crypto";

const PRICE_TEXT_RE =
  /(?:[$€£¥]\s*\d[\d,.\s]*|\b\d[\d,.\s]*(?:\/\s*mo(?:nth)?|\/\s*month|per\s+month|\/\s*yr|\/\s*year|per\s+year)\b|\b(?:usd|eur|gbp)\b)/i;

function countPriceMentions(text: string): number {
  const re = new RegExp(PRICE_TEXT_RE.source, "ig");
  return (text.match(re) ?? []).length;
}

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
  const semantic = extractTopLevelBlocksOrdered(body, ["header", "nav", "section", "footer"]);
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

function isLikelyNavbar(blockHtml: string): boolean {
  const htmlLower = blockHtml.toLowerCase();
  if (htmlLower.includes("<footer")) return false;
  if (PRICE_TEXT_RE.test(textFromHtml(blockHtml))) return false;

  const hasNav = /<nav\b/i.test(blockHtml) || /<header\b/i.test(blockHtml);
  const links = extractAllAnchorLinks(blockHtml, 30);
  const linkCount = links.length;
  if (linkCount < 2 || linkCount > 12) return false;

  const txtLen = textFromHtml(blockHtml).length;
  const pCount = (blockHtml.match(/<p\b/gi) ?? []).length;

  if (hasNav) return txtLen <= 600 && pCount <= 1;
  return txtLen <= 300 && pCount === 0;
}

function detectNavbarBasic(blockHtml: string): Gnr8Section | null {
  if (!isLikelyNavbar(blockHtml)) return null;
  const links = extractAllAnchorLinks(blockHtml, 30);
  if (links.length < 2) return null;

  let brandLabel: string | undefined;
  const htmlLower = blockHtml.toLowerCase();
  if (/\b(brand|logo)\b/.test(htmlLower)) {
    brandLabel = extractFirstImgAlt(blockHtml) ?? undefined;
  }
  if (!brandLabel) {
    const first = links[0];
    if (
      first &&
      (first.href === "/" || first.href === "#" || first.href.startsWith("/")) &&
      first.label.length > 1 &&
      first.label.length <= 30 &&
      !/^home$/i.test(first.label)
    ) {
      brandLabel = first.label;
    }
  }

  return makeSection("navbar.basic", {
    links,
    ...(brandLabel ? { brandLabel } : {}),
  });
}

function isLikelyFooter(blockHtml: string): boolean {
  const htmlLower = blockHtml.toLowerCase();
  if (/^\s*<header\b/i.test(blockHtml) || htmlLower.includes("<nav")) return false;

  const hasFooter = /<footer\b/i.test(blockHtml);
  const txt = textFromHtml(blockHtml);
  const hasFooterWords =
    /©|copyright/i.test(txt) || /\b(privacy|terms|cookies|all rights reserved|contact)\b/i.test(txt);
  if (!hasFooter && !hasFooterWords) return false;

  const links = extractAllAnchorLinks(blockHtml, 60);
  if (links.length < 2 && !/©|copyright/i.test(txt)) return false;

  return txt.length <= 1600;
}

function detectFooterBasic(blockHtml: string): Gnr8Section | null {
  if (!isLikelyFooter(blockHtml)) return null;
  const links = extractAllAnchorLinks(blockHtml, 60);

  const txt = textFromHtml(blockHtml);
  let copyright: string | undefined;
  const idx = txt.search(/©|copyright/i);
  if (idx !== -1) {
    const snippet = txt.slice(idx, Math.min(txt.length, idx + 140));
    copyright = normalizeWhitespace(snippet) || undefined;
  }

  return makeSection("footer.basic", {
    links,
    ...(copyright ? { copyright } : {}),
  });
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

function extractFirstPriceText(html: string): string | undefined {
  const txt = textFromHtml(html);
  const m = PRICE_TEXT_RE.exec(txt);
  if (!m) return undefined;
  const price = normalizeWhitespace(String(m[0] ?? ""));
  return price || undefined;
}

function detectPricingBasic(blockHtml: string): Gnr8Section | null {
  const blockText = textFromHtml(blockHtml);
  if (!PRICE_TEXT_RE.test(blockText)) return null;
  const htmlLower = blockHtml.toLowerCase();
  if (!/\b(pricing|plan|plans|tier|tiers)\b/i.test(htmlLower) && countPriceMentions(blockText) < 2) {
    return null;
  }

  const plans: Array<{
    name: string;
    price?: string;
    description?: string;
    ctaLabel?: string;
    ctaHref?: string;
  }> = [];

  const headingRe = /<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(blockHtml))) {
    const name = normalizeWhitespace(textFromHtml(m[2] ?? ""));
    if (!name || name.length > 80) continue;

    const start = m.index ?? 0;
    const windowHtml = blockHtml.slice(start, Math.min(blockHtml.length, start + 900));
    const price = extractFirstPriceText(windowHtml);
    if (!price) continue;

    const description = extractFirstTagInnerText(windowHtml, "p") ?? undefined;
    const links = extractAllAnchorLinks(windowHtml, 10);
    const cta = links.find((l) => l.label.length <= 40) ?? null;

    plans.push({
      name,
      ...(price ? { price } : {}),
      ...(description ? { description } : {}),
      ...(cta ? { ctaLabel: cta.label, ctaHref: cta.href } : {}),
    });

    if (plans.length >= 6) break;
  }

  const dedupedByName = dedupeKeepOrder(plans.map((p) => p.name)).map((name) => plans.find((p) => p.name === name)!);
  const withPrice = dedupedByName.filter((p) => (p.price ?? "").trim()).slice(0, 6);
  if (withPrice.length < 2) return null;

  return makeSection("pricing.basic", { plans: withPrice });
}

function detectFaqBasic(blockHtml: string): Gnr8Section | null {
  const htmlLower = blockHtml.toLowerCase();
  const hasFaqWord = /\bfaq\b/i.test(htmlLower);
  const hasDetails = /<details\b/i.test(blockHtml) && /<summary\b/i.test(blockHtml);

  const items: Array<{ question: string; answer: string }> = [];

  if (hasDetails) {
    const detailsRe = /<details\b[^>]*>([\s\S]*?)<\s*\/\s*details\s*>/gi;
    let dm: RegExpExecArray | null;
    while ((dm = detailsRe.exec(blockHtml))) {
      const detailsInner = String(dm[1] ?? "");
      const summaryMatch = /<summary\b[^>]*>([\s\S]*?)<\s*\/\s*summary\s*>/i.exec(detailsInner);
      if (!summaryMatch) continue;
      const question = normalizeWhitespace(textFromHtml(summaryMatch[1] ?? ""));
      const answerHtml = detailsInner.replace(summaryMatch[0] ?? "", " ");
      const answer = normalizeWhitespace(textFromHtml(answerHtml));
      if (!question || !answer) continue;
      items.push({ question, answer });
      if (items.length >= 12) break;
    }
  } else {
    const qaRe =
      /<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>\s*(?:<p\b[^>]*>([\s\S]*?)<\s*\/\s*p\s*>|<div\b[^>]*>([\s\S]*?)<\s*\/\s*div\s*>)/gi;
    let qm: RegExpExecArray | null;
    while ((qm = qaRe.exec(blockHtml))) {
      const question = normalizeWhitespace(textFromHtml(qm[2] ?? ""));
      const answer = normalizeWhitespace(textFromHtml(qm[3] ?? qm[4] ?? ""));
      if (!question || !answer) continue;
      items.push({ question, answer });
      if (items.length >= 12) break;
    }
  }

  const cleaned = items
    .map((i) => ({ question: i.question.trim(), answer: i.answer.trim() }))
    .filter((i) => i.question.length >= 5 && i.answer.length >= 10);
  if (cleaned.length < 2) return null;

  const questionyCount = cleaned.filter((i) => i.question.endsWith("?") || /^(what|how|why|can|do|does|is|are)\b/i.test(i.question)).length;
  if (!hasFaqWord && !hasDetails && questionyCount < 1) return null;

  return makeSection("faq.basic", { items: cleaned.slice(0, 12) });
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

function detectCtaSimple(blockHtml: string): Gnr8Section | null {
  const htmlLower = blockHtml.toLowerCase();
  if (/<h1\b/i.test(blockHtml)) return null;
  if (/<details\b/i.test(blockHtml)) return null;
  if (PRICE_TEXT_RE.test(textFromHtml(blockHtml))) return null;

  const links = extractAllAnchorLinks(blockHtml, 20);
  if (links.length === 0 || links.length > 2) return null;

  const headline =
    extractFirstTagInnerText(blockHtml, "h2") ??
    extractFirstTagInnerText(blockHtml, "h3") ??
    extractFirstTagInnerText(blockHtml, "h4") ??
    extractFirstTagInnerText(blockHtml, "strong") ??
    undefined;
  if (!headline) return null;

  const subheadline = extractFirstTagInnerText(blockHtml, "p") ?? undefined;
  const buttonLink = links[0] ?? null;
  const buttonText = extractFirstButtonText(blockHtml) ?? undefined;

  const buttonLabel = buttonLink?.label ?? buttonText;
  const buttonHref = buttonLink?.href ?? undefined;
  if (!buttonLabel) return null;

  return makeSection("cta.simple", {
    ...(headline ? { headline } : {}),
    ...(subheadline ? { subheadline } : {}),
    ...(buttonLabel ? { buttonLabel } : {}),
    ...(buttonHref ? { buttonHref } : {}),
  });
}

export function detectSectionFromHtmlBlock(blockHtml: string): Gnr8Section {
  const html = blockHtml.trim();
  if (!html) return makeSection("legacy.html", { html: "" });

  const navbar = detectNavbarBasic(html);
  if (navbar) return navbar;

  const footer = detectFooterBasic(html);
  if (footer) return footer;

  const hero = detectHero(html);
  if (hero) return hero;

  const pricing = detectPricingBasic(html);
  if (pricing) return pricing;

  const faq = detectFaqBasic(html);
  if (faq) return faq;

  const feature = detectFeatureGrid(html);
  if (feature) return feature;

  const logos = detectLogoCloud(html);
  if (logos) return logos;

  const cta = detectCtaSimple(html);
  if (cta) return cta;

  return makeSection("legacy.html", { html });
}

export function tidyTitleFromHtml(html: string): string | undefined {
  const t = extractFirstTagInnerText(html, "title");
  if (!t) return undefined;
  const cleaned = normalizeWhitespace(t);
  return cleaned || undefined;
}
