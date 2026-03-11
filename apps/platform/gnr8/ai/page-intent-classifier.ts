import type { Gnr8Page } from "@/gnr8/types/page";

export type PageIntent =
  | "marketing_landing"
  | "saas_homepage"
  | "product_page"
  | "documentation"
  | "blog_article"
  | "ecommerce_listing"
  | "ecommerce_product"
  | "unknown";

export type PageIntentResult = {
  intent: PageIntent;
  confidence: number; // 0–100
  signals: string[]; // human-readable reasoning
};

type ScoreCard = Record<PageIntent, number>;
type SignalsByIntent = Record<PageIntent, string[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.round(value);
}

function uniqStable(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function isWeakHero(props: unknown): boolean {
  if (!isRecord(props)) return true;
  const headline = getString(props.headline).trim();
  const subheadline = getString(props.subheadline).trim();
  const hasStrongHeadline = headline.length >= 12;
  const hasStrongSub = subheadline.length >= 18;
  return !(hasStrongHeadline || hasStrongSub);
}

function legacyHtmlIsDense(props: unknown): boolean {
  if (!isRecord(props)) return false;
  // Very light heuristic: treat very large HTML blobs as "dense content".
  const html = getString(props.html);
  const content = getString(props.content);
  const body = html || content;
  return body.trim().length >= 2000;
}

export function classifyPageIntent(page: Gnr8Page): PageIntentResult {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  const countsByType: Record<string, number> = {};
  const indicesByType: Record<string, number[]> = {};
  let denseLegacyCount = 0;

  for (let i = 0; i < sections.length; i += 1) {
    const type = typeof sections[i]?.type === "string" ? sections[i].type : "unknown";
    countsByType[type] = (countsByType[type] ?? 0) + 1;
    (indicesByType[type] ??= []).push(i);

    if (type === "legacy.html" && legacyHtmlIsDense(sections[i]?.props)) denseLegacyCount += 1;
  }

  const totalSections = sections.length;
  const count = (type: string) => countsByType[type] ?? 0;

  const navbarCount = count("navbar.basic");
  const footerCount = count("footer.basic");
  const heroCount = count("hero.split");
  const ctaCount = count("cta.simple");
  const featureGridCount = count("feature.grid");
  const logoCloudCount = count("logo.cloud");
  const pricingCount = count("pricing.basic");
  const faqCount = count("faq.basic");
  const legacyCount = count("legacy.html");

  const legacyRatio = totalSections > 0 ? legacyCount / totalSections : 0;

  const heroProps = heroCount > 0 ? sections[indicesByType["hero.split"]?.[0] ?? 0]?.props : undefined;
  const heroWeak = heroCount > 0 ? isWeakHero(heroProps) : true;

  const score: ScoreCard = {
    marketing_landing: 0,
    saas_homepage: 0,
    product_page: 0,
    documentation: 0,
    blog_article: 0,
    ecommerce_listing: 0,
    ecommerce_product: 0,
    unknown: 0,
  };

  const signalsByIntent: SignalsByIntent = {
    marketing_landing: [],
    saas_homepage: [],
    product_page: [],
    documentation: [],
    blog_article: [],
    ecommerce_listing: [],
    ecommerce_product: [],
    unknown: [],
  };

  const add = (intent: PageIntent, points: number, signal: string) => {
    if (points === 0) return;
    score[intent] += points;
    signalsByIntent[intent].push(`${signal} (+${points})`);
  };

  // Global feature facts (added to winning intent signals at the end).
  const factSignals: string[] = [
    `sections.total=${totalSections}`,
    `count.navbar.basic=${navbarCount}`,
    `count.footer.basic=${footerCount}`,
    `count.hero.split=${heroCount}`,
    `count.cta.simple=${ctaCount}`,
    `count.feature.grid=${featureGridCount}`,
    `count.logo.cloud=${logoCloudCount}`,
    `count.pricing.basic=${pricingCount}`,
    `count.faq.basic=${faqCount}`,
    `count.legacy.html=${legacyCount}`,
    `legacy.ratio=${clampInt(legacyRatio * 100, 0, 100)}%`,
    heroCount > 0 ? `hero.weak=${heroWeak}` : "hero.present=false",
    `legacy.dense.count=${denseLegacyCount}`,
  ];

  // --- Core signals ---
  if (navbarCount > 0) {
    add("marketing_landing", 4, "navbar.basic present");
    add("saas_homepage", 6, "navbar.basic present");
    add("documentation", 4, "navbar.basic present");
    add("blog_article", 2, "navbar.basic present");
  }

  if (footerCount > 0) {
    add("marketing_landing", 4, "footer.basic present");
    add("saas_homepage", 6, "footer.basic present");
    add("documentation", 3, "footer.basic present");
    add("blog_article", 2, "footer.basic present");
  }

  if (heroCount > 0) {
    add("marketing_landing", 18, "hero.split present");
    add("saas_homepage", 18, "hero.split present");
    add("product_page", 16, "hero.split present");
    add("ecommerce_product", 14, "hero.split present");

    if (heroWeak) {
      add("documentation", 6, "hero is weak");
      add("blog_article", 4, "hero is weak");
      add("ecommerce_listing", 8, "hero is weak");
    } else {
      add("documentation", -6, "hero is strong");
      add("ecommerce_listing", -10, "hero is strong");
    }
  } else {
    add("documentation", 18, "no hero.split");
    add("blog_article", 10, "no hero.split");
    add("ecommerce_listing", 18, "no hero.split");

    add("marketing_landing", -12, "missing hero.split");
    add("saas_homepage", -12, "missing hero.split");
    add("product_page", -10, "missing hero.split");
    add("ecommerce_product", -10, "missing hero.split");
  }

  if (ctaCount > 0) {
    add("marketing_landing", 16, "cta.simple present");
    add("product_page", 18, "cta.simple present");
    add("ecommerce_product", 18, "cta.simple present");
    add("documentation", -8, "CTA present (docs usually low CTA)");
    add("blog_article", -10, "CTA present (blog usually no CTA)");
    add("ecommerce_listing", -6, "CTA present (listing usually minimal CTA)");
  } else {
    add("documentation", 8, "no cta.simple");
    add("blog_article", 14, "no cta.simple");
    add("ecommerce_listing", 6, "no cta.simple");
  }

  if (featureGridCount > 0) {
    add("saas_homepage", 16, "feature.grid present");
    add("marketing_landing", 10, "feature.grid present");
    add("product_page", 8, "feature.grid present");
    add("ecommerce_listing", 22, "feature.grid present");
    add("ecommerce_product", 6, "feature.grid present (optional)");
    add("documentation", -10, "feature.grid present (docs usually content-heavy)");
    add("blog_article", -12, "feature.grid present (blog usually content-only)");
  } else {
    add("documentation", 6, "no feature.grid");
    add("blog_article", 6, "no feature.grid");
  }

  if (logoCloudCount > 0) {
    add("marketing_landing", 10, "logo.cloud present");
    add("saas_homepage", 8, "logo.cloud present");
    add("product_page", -8, "logo.cloud present (more landing-like)");
    add("ecommerce_product", -6, "logo.cloud present (more landing-like)");
    add("documentation", -8, "logo.cloud present (docs usually none)");
    add("blog_article", -8, "logo.cloud present (blog usually none)");
  } else {
    add("documentation", 4, "no logo.cloud");
    add("blog_article", 4, "no logo.cloud");
  }

  if (pricingCount > 0) {
    add("saas_homepage", 30, "pricing.basic present");
    add("marketing_landing", 8, "pricing.basic present (optional)");
    add("product_page", -18, "pricing.basic present (product page usually no pricing.basic)");
    add("ecommerce_product", -18, "pricing.basic present (ecom product usually no pricing.basic)");
    add("ecommerce_listing", -16, "pricing.basic present (listing usually no pricing.basic)");
    add("documentation", -30, "pricing.basic present (docs usually none)");
    add("blog_article", -30, "pricing.basic present (blog usually none)");
  } else {
    add("product_page", 8, "no pricing.basic");
    add("ecommerce_product", 10, "no pricing.basic");
    add("ecommerce_listing", 8, "no pricing.basic");
    add("documentation", 6, "no pricing.basic");
    add("blog_article", 6, "no pricing.basic");
  }

  if (faqCount > 0) {
    add("saas_homepage", 18, "faq.basic present");
    add("marketing_landing", 6, "faq.basic present (optional)");
    add("product_page", -12, "faq.basic present (product page usually no FAQ)");
    add("ecommerce_product", -14, "faq.basic present (ecom product usually no FAQ)");
    add("ecommerce_listing", -10, "faq.basic present (listing usually no FAQ)");
    add("documentation", -12, "faq.basic present (docs usually none)");
    add("blog_article", -12, "faq.basic present (blog usually none)");
  } else {
    add("product_page", 6, "no faq.basic");
    add("ecommerce_product", 8, "no faq.basic");
    add("ecommerce_listing", 6, "no faq.basic");
    add("documentation", 4, "no faq.basic");
    add("blog_article", 4, "no faq.basic");
  }

  if (legacyCount > 0) {
    add("documentation", 18, "legacy.html present");
    add("blog_article", 18, "legacy.html present");
    add("product_page", denseLegacyCount > 0 ? 10 : 4, denseLegacyCount > 0 ? "dense legacy.html present" : "legacy.html present");

    if (legacyRatio >= 0.75) {
      add("documentation", 10, "legacy.html dominates");
      add("blog_article", 14, "legacy.html dominates");
      add("saas_homepage", -10, "legacy-heavy (homepage usually structured)");
      add("marketing_landing", -8, "legacy-heavy (landing usually structured)");
      add("ecommerce_listing", -8, "legacy-heavy (listing usually structured)");
    } else if (legacyRatio >= 0.5) {
      add("documentation", 6, "legacy.html is majority");
      add("blog_article", 6, "legacy.html is majority");
      add("saas_homepage", -6, "legacy-heavy (homepage usually structured)");
    }

    if (legacyCount >= 3) add("documentation", 8, "many legacy.html sections");
    if (legacyCount <= 2) add("blog_article", 4, "few legacy.html sections");
  } else {
    add("saas_homepage", 4, "no legacy.html");
    add("marketing_landing", 4, "no legacy.html");
    add("ecommerce_listing", 4, "no legacy.html");
    add("documentation", -10, "no legacy.html (docs usually content sections)");
    add("blog_article", -12, "no legacy.html (blog article usually content sections)");
  }

  // --- Intent-specific tie breakers / structure heuristics ---
  // SaaS homepage: hero + feature + pricing + faq is the defining signature.
  if (heroCount > 0 && featureGridCount > 0 && pricingCount > 0 && faqCount > 0) {
    add("saas_homepage", 25, "hero+feature+pricing+faq signature");
    add("marketing_landing", -6, "has full SaaS homepage signature");
  }

  // Marketing landing: hero + CTA + (feature OR logos), without requiring pricing+faq.
  if (heroCount > 0 && ctaCount > 0 && (featureGridCount > 0 || logoCloudCount > 0)) {
    add("marketing_landing", 20, "hero+CTA+(feature|logos) signature");
    if (featureGridCount > 0 && logoCloudCount > 0) add("marketing_landing", 8, "feature+logos combination");
  }

  // Product page: hero + CTA, avoid pricing+faq; benefits from feature grid or dense legacy content.
  if (heroCount > 0 && ctaCount > 0 && pricingCount === 0 && faqCount === 0) {
    add("product_page", 18, "hero+CTA with no pricing/FAQ");
    if (featureGridCount > 0 || denseLegacyCount > 0) add("product_page", 8, "has supporting product content");
    if (totalSections <= 2) add("product_page", 6, "minimal product structure (hero+CTA)");
  }

  // Tie-break: if the page looks like a classic landing (logos + feature grid) and has no legacy content,
  // prefer marketing_landing over product_page/ecommerce_product.
  if (logoCloudCount > 0 && featureGridCount > 0 && legacyCount === 0) {
    add("marketing_landing", 10, "no legacy + logos+feature looks like landing");
    add("product_page", -10, "logos+feature with no legacy is less product-like");
    add("ecommerce_product", -10, "logos+feature with no legacy is less product-like");
  }

  // Ecommerce listing: feature grid without a strong hero, and without pricing/FAQ.
  if (featureGridCount > 0 && pricingCount === 0 && faqCount === 0) {
    if (heroCount === 0 || heroWeak) add("ecommerce_listing", 16, "feature grid listing signature");
    else add("ecommerce_listing", -8, "strong hero present (less listing-like)");
  }

  // Ecommerce product: hero + CTA, but not ultra-minimal; avoid pricing/FAQ.
  if (heroCount > 0 && ctaCount > 0 && pricingCount === 0 && faqCount === 0) {
    add("ecommerce_product", 10, "hero+CTA with no pricing/FAQ");
    if (totalSections >= 3) add("ecommerce_product", 8, "more than minimal structure");
    else add("ecommerce_product", -12, "too minimal for ecommerce_product");
  }

  // Documentation: legacy-heavy, low CTA, no pricing/logo, and no/weak hero.
  if ((heroCount === 0 || heroWeak) && legacyRatio >= 0.6 && pricingCount === 0 && logoCloudCount === 0) {
    add("documentation", 16, "docs signature (legacy-heavy, low CTA, no pricing/logo)");
  }

  // Blog article: mostly legacy, minimal structured sections, no CTA/feature/pricing.
  if (legacyRatio >= 0.75 && ctaCount === 0 && pricingCount === 0 && featureGridCount === 0) {
    add("blog_article", 16, "blog signature (mostly legacy, no CTA/feature/pricing)");
  }

  // --- Pick best intent ---
  const intents: PageIntent[] = [
    "saas_homepage",
    "marketing_landing",
    "product_page",
    "ecommerce_listing",
    "ecommerce_product",
    "documentation",
    "blog_article",
    "unknown",
  ];

  let best: PageIntent = "unknown";
  let bestScore = -Infinity;
  let secondBestScore = -Infinity;

  for (const intent of intents) {
    const s = score[intent];
    if (s > bestScore) {
      secondBestScore = bestScore;
      bestScore = s;
      best = intent;
      continue;
    }
    if (s > secondBestScore) secondBestScore = s;
  }

  const unknownThreshold = 25;
  if (!Number.isFinite(bestScore) || bestScore < unknownThreshold) {
    return {
      intent: "unknown",
      confidence: clampInt(Math.max(0, bestScore) * 1.5, 0, 49),
      signals: uniqStable(["low overall score; falling back to unknown", ...factSignals]),
    };
  }

  const gap = bestScore - (Number.isFinite(secondBestScore) ? secondBestScore : 0);

  let confidence: number;
  if (bestScore >= 85 && gap >= 18) confidence = 95;
  else if (bestScore >= 70 && gap >= 14) confidence = 90;
  else if (bestScore >= 55 && gap >= 10) confidence = 80;
  else if (bestScore >= 40 && gap >= 7) confidence = 70;
  else if (bestScore >= 30 && gap >= 5) confidence = 60;
  else confidence = 50;

  if (gap <= 3) confidence = Math.min(confidence, 60);
  if (gap <= 1) confidence = Math.min(confidence, 55);

  // If "unknown" wins above threshold (should be rare), cap confidence.
  if (best === "unknown") confidence = Math.min(confidence, 60);

  const winningSignals = uniqStable([...signalsByIntent[best], ...factSignals]);

  return {
    intent: best,
    confidence: clampInt(confidence, 0, 100),
    signals: winningSignals,
  };
}
