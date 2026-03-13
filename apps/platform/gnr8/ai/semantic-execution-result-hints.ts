import type { Gnr8Page } from "@/gnr8/types/page";
import { isPlaceholderLike, isWeakCtaLabel, isWeakHeadline } from "./semantic-confidence";

const RESULT_HINTS = {
  heroHeadlineClarified: "Hero headline was clarified.",
  heroSupportingAdded: "Hero supporting text was added.",
  ctaHeadlineClarified: "CTA headline was added or clarified.",
  ctaHelperAdded: "CTA helper text was added.",
  ctaButtonLabelClarified: "CTA button label was clarified.",
  faqPlaceholdersNormalized: "FAQ placeholders were normalized.",
  faqIncompleteCompleted: "Incomplete FAQ entries were completed.",
  pricingDescriptionsCompleted: "Pricing plan descriptions were completed.",
  pricingCtaCompleted: "Pricing CTA text was completed.",
  featureGridCompleted: "Feature grid items were completed.",
  featureDescriptionsClarified: "Feature descriptions were clarified.",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeWhitespace(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
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

function getFirstPropsForType(page: Gnr8Page, type: string): Record<string, unknown> | null {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const found = sections.find((s) => s && typeof s.type === "string" && s.type === type);
  if (!found) return null;
  return isRecord(found.props) ? found.props : {};
}

function isWeakOrPlaceholderHeadlineText(value: string): boolean {
  return isWeakHeadline(value) || isPlaceholderLike(value);
}

function isMeaningfulTextChange(before: unknown, after: unknown): boolean {
  return normalizeWhitespace(before) !== normalizeWhitespace(after);
}

function improvedFromWeakToStrong(before: unknown, after: unknown, isWeak: (text: string) => boolean): boolean {
  const beforeText = normalizeWhitespace(before);
  const afterText = normalizeWhitespace(after);
  if (!isMeaningfulTextChange(beforeText, afterText)) return false;
  const beforeWeak = !beforeText || isWeak(beforeText);
  const afterStrong = !!afterText && !isWeak(afterText);
  return beforeWeak && afterStrong;
}

function addedFromEmpty(before: unknown, after: unknown): boolean {
  const beforeText = normalizeWhitespace(before);
  const afterText = normalizeWhitespace(after);
  return !beforeText && !!afterText;
}

function buildHeroResultHints(pageBefore: Gnr8Page, pageAfter: Gnr8Page): string[] {
  const beforeProps = getFirstPropsForType(pageBefore, "hero.split");
  const afterProps = getFirstPropsForType(pageAfter, "hero.split");
  if (!beforeProps || !afterProps) return [];

  const hints: string[] = [];

  if (
    improvedFromWeakToStrong(beforeProps.headline, afterProps.headline, (t) => isWeakOrPlaceholderHeadlineText(t))
  ) {
    hints.push(RESULT_HINTS.heroHeadlineClarified);
  }

  if (addedFromEmpty(beforeProps.subheadline, afterProps.subheadline)) {
    hints.push(RESULT_HINTS.heroSupportingAdded);
  }

  return hints;
}

function buildCtaResultHints(pageBefore: Gnr8Page, pageAfter: Gnr8Page): string[] {
  const beforeProps = getFirstPropsForType(pageBefore, "cta.simple");
  const afterProps = getFirstPropsForType(pageAfter, "cta.simple");
  if (!beforeProps || !afterProps) return [];

  const hints: string[] = [];

  if (
    improvedFromWeakToStrong(beforeProps.headline, afterProps.headline, (t) => isWeakOrPlaceholderHeadlineText(t))
  ) {
    hints.push(RESULT_HINTS.ctaHeadlineClarified);
  }

  if (addedFromEmpty(beforeProps.subheadline, afterProps.subheadline)) {
    hints.push(RESULT_HINTS.ctaHelperAdded);
  }

  if (improvedFromWeakToStrong(beforeProps.buttonLabel, afterProps.buttonLabel, (t) => isWeakCtaLabel(t))) {
    hints.push(RESULT_HINTS.ctaButtonLabelClarified);
  }

  return hints;
}

type ArrayFieldStats = {
  isArray: boolean;
  itemsLen: number;
  nonRecordCount: number;
  fullyEmptyCount: number;
  filledFieldCount: number;
  missingFieldCount: number;
  placeholderFieldCount: number;
};

function statsForFaqItems(props: Record<string, unknown>): ArrayFieldStats {
  const raw = props.items;
  const isArray = Array.isArray(raw);
  const items = isArray ? raw : [];

  let nonRecordCount = 0;
  let fullyEmptyCount = 0;
  let filledFieldCount = 0;
  let missingFieldCount = 0;
  let placeholderFieldCount = 0;

  for (const it of items) {
    if (!isRecord(it)) {
      nonRecordCount += 1;
      missingFieldCount += 2;
      continue;
    }

    const q = normalizeWhitespace(it.question);
    const a = normalizeWhitespace(it.answer);
    const qEmpty = !q;
    const aEmpty = !a;

    if (qEmpty && aEmpty) {
      fullyEmptyCount += 1;
      missingFieldCount += 2;
      continue;
    }

    if (qEmpty) missingFieldCount += 1;
    else filledFieldCount += 1;

    if (aEmpty) missingFieldCount += 1;
    else filledFieldCount += 1;

    if (isPlaceholderLike(q)) placeholderFieldCount += 1;
    if (isPlaceholderLike(a)) placeholderFieldCount += 1;
  }

  return {
    isArray,
    itemsLen: items.length,
    nonRecordCount,
    fullyEmptyCount,
    filledFieldCount,
    missingFieldCount,
    placeholderFieldCount,
  };
}

function buildFaqResultHints(pageBefore: Gnr8Page, pageAfter: Gnr8Page): string[] {
  const beforeProps = getFirstPropsForType(pageBefore, "faq.basic");
  const afterProps = getFirstPropsForType(pageAfter, "faq.basic");
  if (!beforeProps || !afterProps) return [];

  const before = statsForFaqItems(beforeProps);
  const after = statsForFaqItems(afterProps);

  const hints: string[] = [];

  const placeholdersReduced = before.placeholderFieldCount > 0 && after.placeholderFieldCount < before.placeholderFieldCount;
  if (placeholdersReduced && (after.filledFieldCount >= before.filledFieldCount || after.itemsLen < before.itemsLen)) {
    hints.push(RESULT_HINTS.faqPlaceholdersNormalized);
  }

  const hadIncompleteBefore = !before.isArray || before.nonRecordCount > 0 || before.missingFieldCount > 0;
  const filledIncreased = after.filledFieldCount > before.filledFieldCount;
  if (hadIncompleteBefore && filledIncreased) {
    hints.push(RESULT_HINTS.faqIncompleteCompleted);
  }

  return hints;
}

type PricingStats = {
  isArray: boolean;
  filledDescriptionCount: number;
  filledCtaLabelCount: number;
};

function statsForPricingPlans(props: Record<string, unknown>): PricingStats {
  const raw = props.plans;
  const isArray = Array.isArray(raw);
  const plans = isArray ? raw : [];

  let filledDescriptionCount = 0;
  let filledCtaLabelCount = 0;

  for (const plan of plans) {
    if (!isRecord(plan)) continue;
    if (normalizeWhitespace(plan.description)) filledDescriptionCount += 1;
    if (normalizeWhitespace(plan.ctaLabel)) filledCtaLabelCount += 1;
  }

  return { isArray, filledDescriptionCount, filledCtaLabelCount };
}

function buildPricingResultHints(pageBefore: Gnr8Page, pageAfter: Gnr8Page): string[] {
  const beforeProps = getFirstPropsForType(pageBefore, "pricing.basic");
  const afterProps = getFirstPropsForType(pageAfter, "pricing.basic");
  if (!beforeProps || !afterProps) return [];

  const before = statsForPricingPlans(beforeProps);
  const after = statsForPricingPlans(afterProps);

  const hints: string[] = [];

  if (after.filledDescriptionCount > before.filledDescriptionCount) {
    hints.push(RESULT_HINTS.pricingDescriptionsCompleted);
  }

  if (after.filledCtaLabelCount > before.filledCtaLabelCount) {
    hints.push(RESULT_HINTS.pricingCtaCompleted);
  }

  return hints;
}

function statsForFeatureGridItems(props: Record<string, unknown>): ArrayFieldStats {
  const raw = props.items;
  const isArray = Array.isArray(raw);
  const items = isArray ? raw : [];

  let nonRecordCount = 0;
  let fullyEmptyCount = 0;
  let filledFieldCount = 0;
  let missingFieldCount = 0;
  let placeholderFieldCount = 0;

  for (const it of items) {
    if (!isRecord(it)) {
      nonRecordCount += 1;
      missingFieldCount += 2;
      continue;
    }

    const title = normalizeWhitespace(it.title);
    const text = normalizeWhitespace(it.text);
    const titleEmpty = !title;
    const textEmpty = !text;

    if (titleEmpty && textEmpty) {
      fullyEmptyCount += 1;
      missingFieldCount += 2;
      continue;
    }

    if (titleEmpty) missingFieldCount += 1;
    else filledFieldCount += 1;

    if (textEmpty) missingFieldCount += 1;
    else filledFieldCount += 1;

    if (isPlaceholderLike(title)) placeholderFieldCount += 1;
    if (isPlaceholderLike(text)) placeholderFieldCount += 1;
  }

  return {
    isArray,
    itemsLen: items.length,
    nonRecordCount,
    fullyEmptyCount,
    filledFieldCount,
    missingFieldCount,
    placeholderFieldCount,
  };
}

function hasPlaceholderReplacementByIndex(beforeProps: Record<string, unknown>, afterProps: Record<string, unknown>): boolean {
  const beforeRaw = Array.isArray(beforeProps.items) ? beforeProps.items : [];
  const afterRaw = Array.isArray(afterProps.items) ? afterProps.items : [];
  const max = Math.min(beforeRaw.length, afterRaw.length);

  for (let i = 0; i < max; i += 1) {
    const b = isRecord(beforeRaw[i]) ? beforeRaw[i] : {};
    const a = isRecord(afterRaw[i]) ? afterRaw[i] : {};

    const bTitle = normalizeWhitespace(b.title);
    const aTitle = normalizeWhitespace(a.title);
    if (isPlaceholderLike(bTitle) && aTitle && !isPlaceholderLike(aTitle) && isMeaningfulTextChange(bTitle, aTitle)) return true;

    const bText = normalizeWhitespace(b.text);
    const aText = normalizeWhitespace(a.text);
    if (isPlaceholderLike(bText) && aText && !isPlaceholderLike(aText) && isMeaningfulTextChange(bText, aText)) return true;
  }

  return false;
}

function buildFeatureGridResultHints(pageBefore: Gnr8Page, pageAfter: Gnr8Page): string[] {
  const beforeProps = getFirstPropsForType(pageBefore, "feature.grid");
  const afterProps = getFirstPropsForType(pageAfter, "feature.grid");
  if (!beforeProps || !afterProps) return [];

  const before = statsForFeatureGridItems(beforeProps);
  const after = statsForFeatureGridItems(afterProps);

  const hints: string[] = [];

  const hadIncompleteBefore = !before.isArray || before.nonRecordCount > 0 || before.missingFieldCount > 0 || before.fullyEmptyCount > 0;
  const filledIncreased = after.filledFieldCount > before.filledFieldCount;
  const fullyEmptyReduced = after.fullyEmptyCount < before.fullyEmptyCount;
  if (hadIncompleteBefore && (filledIncreased || fullyEmptyReduced)) {
    hints.push(RESULT_HINTS.featureGridCompleted);
  }

  if (hasPlaceholderReplacementByIndex(beforeProps, afterProps)) {
    hints.push(RESULT_HINTS.featureDescriptionsClarified);
  }

  return hints;
}

export function buildSemanticExecutionResultHints(input: { pageBefore: Gnr8Page; pageAfter: Gnr8Page }): string[] {
  const hints: string[] = [];

  // Order is part of the stable API shape.
  hints.push(...buildHeroResultHints(input.pageBefore, input.pageAfter));
  hints.push(...buildCtaResultHints(input.pageBefore, input.pageAfter));
  hints.push(...buildFaqResultHints(input.pageBefore, input.pageAfter));
  hints.push(...buildPricingResultHints(input.pageBefore, input.pageAfter));
  hints.push(...buildFeatureGridResultHints(input.pageBefore, input.pageAfter));

  return uniqStable(hints).slice(0, 5);
}

