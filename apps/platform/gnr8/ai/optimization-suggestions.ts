import type { DuplicateDetail, DuplicateSimilarity, MigrationReviewSummary } from "./migration-review-logic";

type BuildOptimizationSuggestionsInput = {
  review: MigrationReviewSummary;
  suggestedActions?: string[];
  maxSuggestions?: number;
};

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

function hasType(countsByType: Record<string, number> | undefined, type: string): boolean {
  return (countsByType?.[type] ?? 0) > 0;
}

function suggestionForDuplicate(detail: DuplicateDetail): string | undefined {
  const displayByType: Record<string, string> = {
    "pricing.basic": "pricing",
    "faq.basic": "FAQ",
    "cta.simple": "CTA",
    "hero.split": "hero",
    "footer.basic": "footer",
    "navbar.basic": "navbar",
    "feature.grid": "feature grid",
    "logo.cloud": "logo cloud",
  };

  const name = displayByType[detail.type];
  if (!name) return undefined;

  const similarity: DuplicateSimilarity = detail.similarity ?? "different-content";
  if (similarity === "exact-duplicate") return `Remove duplicate ${name} section`;
  if (similarity === "highly-similar") return `Review similar ${name} sections`;

  if (detail.type === "faq.basic") return "Review multiple FAQ sections for consolidation";
  if (detail.type === "pricing.basic") return "Review multiple pricing sections for consolidation";

  return undefined;
}

function getStructureBasedSuggestions(review: MigrationReviewSummary): string[] {
  const suggestions: string[] = [];

  if (review.confidenceScore < 50) suggestions.push("Improve page structure before optimization");

  if (review.legacySections > 0) suggestions.push("Reduce legacy HTML blocks");

  const layout = review.layoutIssues;
  if (layout?.navbarNotFirst) suggestions.push("Move navbar to the top");
  if (layout?.heroNotTop) suggestions.push("Move hero near the top");
  if (layout?.footerNotLast) suggestions.push("Move footer to the bottom");

  if (layout?.ctaMisplaced) {
    const hasFaq = hasType(review.countsByType, "faq.basic");
    const hasPricing = hasType(review.countsByType, "pricing.basic");
    if (hasFaq) suggestions.push("Move CTA below FAQ");
    else if (hasPricing) suggestions.push("Move CTA below pricing");
    else suggestions.push("Move CTA near the bottom");
  }

  if (layout?.legacyMisplaced) suggestions.push("Move legacy HTML blocks below structured sections");

  for (const d of review.duplicateDetails ?? []) {
    const s = d ? suggestionForDuplicate(d) : undefined;
    if (s) suggestions.push(s);
  }

  if (review.intent === "unknown" && review.confidenceScore < 80) {
    suggestions.push("Improve page structure before optimization");
  }

  return uniqStable(suggestions);
}

function getIntentBasedSuggestions(review: MigrationReviewSummary): string[] {
  const suggestions: string[] = [];
  const counts = review.countsByType;

  const hasHero = hasType(counts, "hero.split");
  const hasCta = hasType(counts, "cta.simple");
  const hasLogoCloud = hasType(counts, "logo.cloud");
  const hasPricing = hasType(counts, "pricing.basic");
  const hasFaq = hasType(counts, "faq.basic");
  const hasFeatureGrid = hasType(counts, "feature.grid");
  const hasFooter = hasType(counts, "footer.basic");

  const addIfMissing = (type: string, suggestion: string) => {
    if (!hasType(counts, type)) suggestions.push(suggestion);
  };

  switch (review.intent) {
    case "saas_homepage": {
      if (hasHero && !hasCta) suggestions.push("Add CTA below the hero");
      if (!hasPricing) suggestions.push("Add pricing section");
      if (!hasFaq && hasPricing) suggestions.push("Add FAQ below pricing");
      if (!hasFaq && !hasPricing) suggestions.push("Add FAQ below the hero");
      if (!hasLogoCloud && hasPricing) suggestions.push("Add logo cloud above pricing");
      if (!hasLogoCloud && !hasPricing) suggestions.push("Add logo cloud for trust signals");
      if (!hasFooter) suggestions.push("Add footer at the bottom");
      break;
    }
    case "marketing_landing": {
      if (hasHero && !hasCta) suggestions.push("Add CTA below the hero");
      if (hasHero && !hasFeatureGrid) suggestions.push("Add feature grid below the hero");
      if (!hasLogoCloud) suggestions.push("Add logo cloud for trust signals");
      if (!hasFooter) suggestions.push("Add footer at the bottom");
      break;
    }
    case "product_page": {
      if (hasHero && !hasCta) suggestions.push("Add CTA below the hero");
      if (hasHero && !hasFeatureGrid) suggestions.push("Add feature grid below the hero");
      if (!hasFooter) suggestions.push("Add footer at the bottom");
      break;
    }
    case "documentation": {
      if (!hasFooter) suggestions.push("Add footer at the bottom");
      if (review.confidenceScore < 80 || review.legacySections > 0) suggestions.push("Improve page structure before optimization");
      break;
    }
    case "blog_article": {
      if (!hasFooter) suggestions.push("Add footer at the bottom");
      if (review.confidenceScore < 80 || review.legacySections > 0) suggestions.push("Improve page structure before optimization");
      suggestions.push("Keep structure content-focused");
      break;
    }
    case "ecommerce_listing": {
      if (hasHero && !hasCta) suggestions.push("Add CTA below the hero");
      if (!hasFeatureGrid) suggestions.push("Improve product discovery layout");
      if (!hasFooter) suggestions.push("Add footer at the bottom");
      break;
    }
    case "ecommerce_product": {
      if (hasHero && !hasCta) suggestions.push("Add CTA below the hero");
      if (!hasFaq) suggestions.push("Add FAQ below product details");
      if (!hasFooter) suggestions.push("Add footer at the bottom");
      break;
    }
    case "unknown":
    default: {
      addIfMissing("footer.basic", "Add footer at the bottom");
      if (review.confidenceScore < 80) suggestions.push("Improve page structure before optimization");
      break;
    }
  }

  return uniqStable(suggestions);
}

function getPolishSuggestions(review: MigrationReviewSummary): string[] {
  const suggestions: string[] = [];

  const intentStrong = review.intent !== "unknown" && (review.intentConfidence ?? 0) >= 70;
  if (review.confidenceScore >= 80 && intentStrong) {
    if (!hasType(review.countsByType, "logo.cloud") && (review.intent === "product_page" || review.intent === "marketing_landing")) {
      suggestions.push("Add logo cloud for trust signals");
    }
  }

  return uniqStable(suggestions);
}

export function buildOptimizationSuggestions(input: BuildOptimizationSuggestionsInput): string[] {
  const maxSuggestions = typeof input.maxSuggestions === "number" ? input.maxSuggestions : 8;
  const suggestedActions = Array.isArray(input.suggestedActions) ? input.suggestedActions : [];

  const critical = getStructureBasedSuggestions(input.review);
  const intent = getIntentBasedSuggestions(input.review);
  const polish = getPolishSuggestions(input.review);

  const combined = uniqStable([...critical, ...intent, ...polish]);

  const filtered = suggestedActions.length > 0 ? combined.filter((s) => !suggestedActions.includes(s)) : combined;
  const out = filtered.length > 0 ? filtered : combined;

  return out.slice(0, Math.max(0, Math.min(12, maxSuggestions)));
}

