import type { Gnr8Page } from "@/gnr8/types/page";
import { scoreCta, scoreFaq, scoreHero, scorePricing } from "@/gnr8/ai/semantic-confidence";

export type SiteSemanticConsistencyLabel = "low" | "medium" | "high";

export type SiteSemanticConsistencyStatus = "absent" | "weak" | "complete";
export type SiteSemanticConsistencyCompletenessStatus = "absent" | "incomplete" | "complete";

export type SiteSemanticConsistency = {
  consistencyScore: number;
  consistencyLabel: SiteSemanticConsistencyLabel;

  consistencyDimensions: {
    heroConsistency: SiteSemanticConsistencyLabel;
    ctaConsistency: SiteSemanticConsistencyLabel;
    faqConsistency: SiteSemanticConsistencyLabel;
    pricingConsistency: SiteSemanticConsistencyLabel;
  };

  inconsistentPages: string[];
  consistencyGaps: string[];

  consistencySummary: {
    heroPatternCount: number;
    ctaPatternCount: number;
    faqPatternCount: number;
    pricingPatternCount: number;
  };

  recommendations: string[];
  summary: string;
  notes: string[];
};

function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function labelForScore(score: number): SiteSemanticConsistencyLabel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function firstPropsForType(page: Gnr8Page, type: string): unknown | undefined {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const found = sections.find((s) => s && typeof s.type === "string" && s.type === type);
  return found?.props;
}

function getHeroSemanticStatus(page: Gnr8Page): SiteSemanticConsistencyStatus {
  const props = firstPropsForType(page, "hero.split");
  if (props === undefined) return "absent";
  const scored = scoreHero(props);
  return scored.penalty > 0 ? "weak" : "complete";
}

function getCtaSemanticStatus(page: Gnr8Page): SiteSemanticConsistencyStatus {
  const props = firstPropsForType(page, "cta.simple");
  if (props === undefined) return "absent";
  const scored = scoreCta(props);
  return scored.penalty > 0 ? "weak" : "complete";
}

function getFaqSemanticStatus(page: Gnr8Page): SiteSemanticConsistencyCompletenessStatus {
  const props = firstPropsForType(page, "faq.basic");
  if (props === undefined) return "absent";
  const scored = scoreFaq(props);
  return scored.penalty > 0 ? "incomplete" : "complete";
}

function getPricingSemanticStatus(page: Gnr8Page): SiteSemanticConsistencyCompletenessStatus {
  const props = firstPropsForType(page, "pricing.basic");
  if (props === undefined) return "absent";
  const scored = scorePricing(props);
  return scored.penalty > 0 ? "incomplete" : "complete";
}

function distinctCount(values: string[]): number {
  return new Set(values).size;
}

function dominantPattern(values: string[]): { value: string | null; count: number; tied: boolean; ratio: number } {
  if (values.length === 0) return { value: null, count: 0, tied: false, ratio: 0 };
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

  let bestValue: string | null = null;
  let bestCount = 0;
  let tied = false;

  for (const [value, count] of counts.entries()) {
    if (count > bestCount) {
      bestValue = value;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }

  return {
    value: bestValue,
    count: bestCount,
    tied,
    ratio: values.length > 0 ? bestCount / values.length : 0,
  };
}

function scoreConsistencyDimension(input: {
  statuses: string[];
  severeMix: { a: string; b: string };
}): SiteSemanticConsistencyLabel {
  const patterns = distinctCount(input.statuses);
  if (patterns <= 1) return "high";
  if (patterns >= 3) return "low";

  const dom = dominantPattern(input.statuses);
  const aCount = input.statuses.filter((s) => s === input.severeMix.a).length;
  const bCount = input.statuses.filter((s) => s === input.severeMix.b).length;

  const hasSevereMix = aCount > 0 && bCount > 0;
  if (hasSevereMix) {
    const minority = Math.min(aCount, bCount);
    return minority <= 1 ? "medium" : "low";
  }

  if (dom.tied) return "low";
  if (dom.ratio >= 0.8) return "medium";
  return "low";
}

function findOutlierPages(input: {
  slugs: string[];
  statuses: string[];
}): string[] {
  if (input.slugs.length !== input.statuses.length) return [];
  if (input.statuses.length === 0) return [];

  const dom = dominantPattern(input.statuses);
  if (!dom.value) return [];
  if (dom.tied) return [];
  if (dom.ratio < 0.6) return [];

  const outliers: string[] = [];
  for (let i = 0; i < input.statuses.length; i += 1) {
    if (input.statuses[i] !== dom.value) outliers.push(input.slugs[i]);
  }
  return outliers;
}

function uniqStable(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const value = typeof v === "string" ? v.trim() : "";
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function buildConsistencyGaps(input: {
  heroConsistency: SiteSemanticConsistencyLabel;
  ctaConsistency: SiteSemanticConsistencyLabel;
  faqConsistency: SiteSemanticConsistencyLabel;
  pricingConsistency: SiteSemanticConsistencyLabel;
  sparseBaseline: boolean;
  unresolvedRatioHigh: boolean;
}): string[] {
  const gaps: string[] = [];

  if (input.heroConsistency !== "high") gaps.push("Hero quality is inconsistent across pages.");
  if (input.ctaConsistency !== "high") gaps.push("CTA clarity is inconsistent across key pages.");
  if (input.faqConsistency !== "high") gaps.push("FAQ completeness varies across the site.");
  if (input.pricingConsistency !== "high") gaps.push("Pricing messaging completeness is inconsistent.");
  if (input.sparseBaseline) gaps.push("Too few pages have structured semantic content for reliable comparison.");
  if (input.unresolvedRatioHigh) gaps.push("Too many pages are unresolved for reliable consistency analysis.");

  return gaps.slice(0, 6);
}

function buildConsistencyRecommendations(gaps: string[]): string[] {
  const recs: string[] = [];
  const add = (rec: string) => {
    if (recs.length >= 8) return;
    if (recs.includes(rec)) return;
    recs.push(rec);
  };

  for (const gap of gaps) {
    switch (gap) {
      case "Hero quality is inconsistent across pages.":
        add("Normalize hero clarity across key pages.");
        break;
      case "CTA clarity is inconsistent across key pages.":
        add("Standardize CTA clarity before automation.");
        break;
      case "FAQ completeness varies across the site.":
        add("Improve FAQ completeness across support pages.");
        break;
      case "Pricing messaging completeness is inconsistent.":
        add("Complete pricing messaging consistently.");
        break;
      case "Too few pages have structured semantic content for reliable comparison.":
        add("Expand structured semantic coverage before cross-page optimization.");
        break;
      case "Too many pages are unresolved for reliable consistency analysis.":
        add("Resolve missing page data before consistency analysis.");
        break;
      default:
        break;
    }
  }

  return recs;
}

function buildSummary(input: {
  label: SiteSemanticConsistencyLabel;
  gaps: string[];
  unresolvedRatioHigh: boolean;
}): string {
  let base = "Site semantic consistency is moderate with some cross-page gaps.";
  if (input.label === "high") {
    base =
      input.gaps.length === 0
        ? "Site semantic consistency is high across key structured content."
        : "Site semantic consistency is high with minor cross-page gaps.";
  } else if (input.label === "low") {
    base = "Site semantic consistency is weak and requires normalization.";
  }

  if (input.unresolvedRatioHigh) {
    return `${base} Missing page data may affect this assessment.`;
  }
  return base;
}

export function buildSiteSemanticConsistency(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
}): SiteSemanticConsistency {
  const resolved = Array.isArray(input.resolvedPages) ? input.resolvedPages : [];
  const unresolved = Array.isArray(input.unresolvedPages) ? input.unresolvedPages : [];
  const totalInputs = Array.isArray(input.pages) ? input.pages.length : resolved.length + unresolved.length;

  const slugs = resolved.map((p) => p.slug);

  const heroStatuses = resolved.map((p) => getHeroSemanticStatus(p.page));
  const ctaStatuses = resolved.map((p) => getCtaSemanticStatus(p.page));
  const faqStatuses = resolved.map((p) => getFaqSemanticStatus(p.page));
  const pricingStatuses = resolved.map((p) => getPricingSemanticStatus(p.page));

  const heroPatternCount = distinctCount(heroStatuses);
  const ctaPatternCount = distinctCount(ctaStatuses);
  const faqPatternCount = distinctCount(faqStatuses);
  const pricingPatternCount = distinctCount(pricingStatuses);

  const heroConsistency = scoreConsistencyDimension({
    statuses: heroStatuses,
    severeMix: { a: "weak", b: "complete" },
  });
  const ctaConsistency = scoreConsistencyDimension({
    statuses: ctaStatuses,
    severeMix: { a: "weak", b: "complete" },
  });
  const faqConsistency = scoreConsistencyDimension({
    statuses: faqStatuses,
    severeMix: { a: "incomplete", b: "complete" },
  });
  const pricingConsistency = scoreConsistencyDimension({
    statuses: pricingStatuses,
    severeMix: { a: "incomplete", b: "complete" },
  });

  const outlierSlugs = uniqStable([
    ...findOutlierPages({ slugs, statuses: heroStatuses }),
    ...findOutlierPages({ slugs, statuses: ctaStatuses }),
    ...findOutlierPages({ slugs, statuses: faqStatuses }),
    ...findOutlierPages({ slugs, statuses: pricingStatuses }),
  ]);

  const heroWeakCompleteMix = heroStatuses.includes("weak") && heroStatuses.includes("complete");
  const ctaWeakCompleteMix = ctaStatuses.includes("weak") && ctaStatuses.includes("complete");
  const faqIncompleteCompleteMix = faqStatuses.includes("incomplete") && faqStatuses.includes("complete");
  const pricingIncompleteCompleteMix = pricingStatuses.includes("incomplete") && pricingStatuses.includes("complete");

  const pagesWithAnySupported = resolved.filter((p) => {
    const hero = firstPropsForType(p.page, "hero.split") !== undefined;
    const cta = firstPropsForType(p.page, "cta.simple") !== undefined;
    const faq = firstPropsForType(p.page, "faq.basic") !== undefined;
    const pricing = firstPropsForType(p.page, "pricing.basic") !== undefined;
    return hero || cta || faq || pricing;
  }).length;

  const sparseBaseline = pagesWithAnySupported < 2;
  const unresolvedRatio = totalInputs > 0 ? unresolved.length / totalInputs : 0;
  const unresolvedRatioHigh = unresolvedRatio > 0.25;

  const lowDimensions = [heroConsistency, ctaConsistency, faqConsistency, pricingConsistency].filter(
    (l) => l === "low",
  ).length;

  let consistencyScore = 100;
  if (heroWeakCompleteMix) consistencyScore -= 12;
  if (ctaWeakCompleteMix) consistencyScore -= 12;
  if (faqIncompleteCompleteMix) consistencyScore -= 10;
  if (pricingIncompleteCompleteMix) consistencyScore -= 10;
  if (sparseBaseline) consistencyScore -= 20;
  if (unresolvedRatioHigh) consistencyScore -= 10;
  if (lowDimensions >= 2) consistencyScore -= 12;

  consistencyScore = clampScore(consistencyScore);
  const consistencyLabel = labelForScore(consistencyScore);

  const consistencyGaps = buildConsistencyGaps({
    heroConsistency,
    ctaConsistency,
    faqConsistency,
    pricingConsistency,
    sparseBaseline,
    unresolvedRatioHigh,
  });

  const recommendations = buildConsistencyRecommendations(consistencyGaps);

  const summary = buildSummary({
    label: consistencyLabel,
    gaps: consistencyGaps,
    unresolvedRatioHigh,
  });

  const notes: string[] = [];
  notes.push("Site semantic consistency only; no changes are applied.");
  if (resolved.length === 0) {
    notes.push("No pages were resolved; site-level consistency is based on 0 resolved pages.");
  } else if (unresolved.length > 0) {
    notes.push(`Unresolved pages: ${unresolved.length}/${totalInputs}.`);
  }
  if (sparseBaseline) {
    notes.push("Sparse semantic baseline; fewer than 2 resolved pages include supported structured sections.");
  }
  if (outlierSlugs.length > 0 && resolved.length > 0) {
    notes.push(`Outlier pages detected: ${outlierSlugs.length}/${resolved.length}.`);
  }

  return {
    consistencyScore,
    consistencyLabel,
    consistencyDimensions: {
      heroConsistency,
      ctaConsistency,
      faqConsistency,
      pricingConsistency,
    },
    inconsistentPages: outlierSlugs,
    consistencyGaps,
    consistencySummary: {
      heroPatternCount,
      ctaPatternCount,
      faqPatternCount,
      pricingPatternCount,
    },
    recommendations,
    summary,
    notes: notes.slice(0, 4),
  };
}

