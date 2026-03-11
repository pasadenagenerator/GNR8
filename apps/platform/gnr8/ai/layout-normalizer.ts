import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";

type CanonicalBucket =
  | "navbar"
  | "hero"
  | "featureOrLogo"
  | "pricing"
  | "faq"
  | "cta"
  | "legacy"
  | "footer";

export function normalizeSectionLayout(page: Gnr8Page): {
  page: Gnr8Page;
  changed: boolean;
  notes: string[];
} {
  const originalSections = Array.isArray(page.sections) ? page.sections : [];

  const buckets: Record<CanonicalBucket, Gnr8Section[]> = {
    navbar: [],
    hero: [],
    featureOrLogo: [],
    pricing: [],
    faq: [],
    cta: [],
    legacy: [],
    footer: [],
  };

  for (const section of originalSections) {
    const bucket = bucketForType(typeof section?.type === "string" ? section.type : "legacy.html");
    buckets[bucket].push(section);
  }

  const normalizedSections: Gnr8Section[] = [
    ...buckets.navbar,
    ...buckets.hero,
    ...buckets.featureOrLogo,
    ...buckets.pricing,
    ...buckets.faq,
    ...buckets.cta,
    ...buckets.legacy,
    ...buckets.footer,
  ];

  const changed = !sameSectionOrder(originalSections, normalizedSections);

  const clonedPage: Gnr8Page = {
    ...page,
    sections: normalizedSections,
  };

  if (!changed) return { page: clonedPage, changed: false, notes: [] };

  const notes: string[] = [];

  const originalNavbarIndex = firstIndexByType(originalSections, "navbar.basic");
  if (originalNavbarIndex > 0) notes.push("Moved navbar to top.");

  const originalFooterIndex = lastIndexByType(originalSections, "footer.basic");
  if (originalFooterIndex !== -1 && originalFooterIndex !== originalSections.length - 1) {
    notes.push("Moved footer to bottom.");
  }

  const navbarCount = buckets.navbar.length;
  const originalHeroIndex = firstIndexByType(originalSections, "hero.split");
  if (originalHeroIndex !== -1) {
    const expectedHeroIndex = navbarCount;
    if (originalHeroIndex !== expectedHeroIndex) notes.push("Moved hero to top.");
  }

  const originalFirstCtaIndex = firstIndexByType(originalSections, "cta.simple");
  const originalLastPricingIndex = lastIndexByType(originalSections, "pricing.basic");
  const originalLastFaqIndex = lastIndexByType(originalSections, "faq.basic");
  const originalLastPricingOrFaq = Math.max(originalLastPricingIndex, originalLastFaqIndex);

  if (originalFirstCtaIndex !== -1 && originalLastPricingOrFaq !== -1 && originalFirstCtaIndex < originalLastPricingOrFaq) {
    if (originalLastPricingIndex !== -1) notes.push("Placed CTA after pricing.");
    else notes.push("Placed CTA after FAQ.");
  }

  const originalLegacyIndex = firstIndexByBucket(originalSections, "legacy");
  if (originalLegacyIndex !== -1) {
    const hasStructuredAfterLegacy = originalSections
      .slice(originalLegacyIndex + 1)
      .some((s) => {
        const bucket = bucketForType(typeof s?.type === "string" ? s.type : "legacy.html");
        return bucket !== "legacy" && bucket !== "footer";
      });

    if (hasStructuredAfterLegacy) notes.push("Moved legacy sections after structured sections.");
  }

  if (notes.length === 0) notes.push("Reordered sections to canonical structure.");

  return { page: clonedPage, changed: true, notes };
}

function bucketForType(type: string): CanonicalBucket {
  switch (type) {
    case "navbar.basic":
      return "navbar";
    case "hero.split":
      return "hero";
    case "feature.grid":
    case "logo.cloud":
      return "featureOrLogo";
    case "pricing.basic":
      return "pricing";
    case "faq.basic":
      return "faq";
    case "cta.simple":
      return "cta";
    case "footer.basic":
      return "footer";
    case "legacy.html":
    default:
      // Unknown section types are treated as legacy.html for structural ordering.
      return "legacy";
  }
}

function sameSectionOrder(a: Gnr8Section[], b: Gnr8Section[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

function firstIndexByType(sections: Gnr8Section[], type: string): number {
  return sections.findIndex((s) => s?.type === type);
}

function lastIndexByType(sections: Gnr8Section[], type: string): number {
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    if (sections[i]?.type === type) return i;
  }
  return -1;
}

function firstIndexByBucket(sections: Gnr8Section[], bucket: CanonicalBucket): number {
  for (let i = 0; i < sections.length; i += 1) {
    const type = typeof sections[i]?.type === "string" ? sections[i].type : "legacy.html";
    if (bucketForType(type) === bucket) return i;
  }
  return -1;
}
