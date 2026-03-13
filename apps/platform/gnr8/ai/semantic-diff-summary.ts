import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";

export type SemanticDiffSummary = {
  changed: boolean;
  summary: string;
  changes: string[];
  metrics: {
    semanticFieldsBefore: number;
    semanticFieldsAfter: number;
    semanticImprovements: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeWhitespace(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function isMeaningfulTextChange(before: unknown, after: unknown): boolean {
  return normalizeWhitespace(before) !== normalizeWhitespace(after);
}

function isWeakHeadline(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (t.length < 10) return true;
  if (
    low === "headline" ||
    low === "title" ||
    low === "hero" ||
    low === "welcome" ||
    low === "hello" ||
    low === "hi" ||
    low === "lorem ipsum" ||
    low === "coming soon" ||
    low === "your product"
  )
    return true;
  return false;
}

function isWeakSubheadline(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (t.length < 14) return true;
  return low === "subheadline" || low === "subtitle" || low === "tagline" || low === "lorem ipsum";
}

function isWeakButtonLabel(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  return low === "click here" || low === "submit" || low === "learn more";
}

function isWeakFaqQuestion(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (t.length < 8) return true;
  return low === "question" || low === "faq" || low === "questions";
}

function isWeakFaqAnswer(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  if (t.length < 20) return true;
  const low = t.toLowerCase();
  return low === "answer" || low === "tbd" || low === "todo";
}

function countFilledText(value: unknown): number {
  return normalizeWhitespace(value) ? 1 : 0;
}

function getSupportedSections(page: Gnr8Page): Gnr8Section[] {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections.filter((s) =>
    s &&
    typeof s.id === "string" &&
    (s.type === "hero.split" ||
      s.type === "cta.simple" ||
      s.type === "faq.basic" ||
      s.type === "pricing.basic" ||
      s.type === "feature.grid"),
  );
}

function buildSectionById(sections: Gnr8Section[]): Map<string, Gnr8Section> {
  const map = new Map<string, Gnr8Section>();
  for (const s of sections) {
    if (typeof s.id !== "string") continue;
    if (!map.has(s.id)) map.set(s.id, s);
  }
  return map;
}

function getProps(section: Gnr8Section | undefined): Record<string, unknown> {
  return isRecord(section?.props) ? section!.props! : {};
}

function extractFaqStats(props: Record<string, unknown>): {
  itemsIsArray: boolean;
  nonRecordCount: number;
  fullyEmptyCount: number;
  weakFieldCount: number;
  filledFieldCount: number;
} {
  const raw = props.items;
  const itemsIsArray = Array.isArray(raw);
  const items = itemsIsArray ? raw : [];

  let nonRecordCount = 0;
  let fullyEmptyCount = 0;
  let weakFieldCount = 0;
  let filledFieldCount = 0;

  for (const it of items) {
    if (!isRecord(it)) {
      nonRecordCount += 1;
      continue;
    }
    const q = normalizeWhitespace(it.question);
    const a = normalizeWhitespace(it.answer);
    const qEmpty = !q;
    const aEmpty = !a;
    if (qEmpty && aEmpty) {
      fullyEmptyCount += 1;
      continue;
    }

    filledFieldCount += qEmpty ? 0 : 1;
    filledFieldCount += aEmpty ? 0 : 1;

    if (isWeakFaqQuestion(q)) weakFieldCount += 1;
    if (isWeakFaqAnswer(a)) weakFieldCount += 1;
  }

  return { itemsIsArray, nonRecordCount, fullyEmptyCount, weakFieldCount, filledFieldCount };
}

function extractFeatureGridStats(props: Record<string, unknown>): {
  itemsIsArray: boolean;
  nonRecordCount: number;
  fullyEmptyCount: number;
  missingFieldCount: number;
  filledFieldCount: number;
} {
  const raw = props.items;
  const itemsIsArray = Array.isArray(raw);
  const items = itemsIsArray ? raw : [];

  let nonRecordCount = 0;
  let fullyEmptyCount = 0;
  let missingFieldCount = 0;
  let filledFieldCount = 0;

  for (const it of items) {
    if (!isRecord(it)) {
      nonRecordCount += 1;
      continue;
    }
    const title = normalizeWhitespace(it.title);
    const text = normalizeWhitespace(it.text);
    const titleEmpty = !title;
    const textEmpty = !text;
    if (titleEmpty && textEmpty) {
      fullyEmptyCount += 1;
      continue;
    }

    filledFieldCount += titleEmpty ? 0 : 1;
    filledFieldCount += textEmpty ? 0 : 1;

    if (titleEmpty) missingFieldCount += 1;
    if (textEmpty) missingFieldCount += 1;
  }

  return { itemsIsArray, nonRecordCount, fullyEmptyCount, missingFieldCount, filledFieldCount };
}

function extractPricingStats(props: Record<string, unknown>): {
  plansIsArray: boolean;
  nonRecordCount: number;
  filledDescriptionCount: number;
  filledCtaLabelCount: number;
  filledFieldCount: number;
} {
  const raw = props.plans;
  const plansIsArray = Array.isArray(raw);
  const plans = plansIsArray ? raw : [];

  let nonRecordCount = 0;
  let filledDescriptionCount = 0;
  let filledCtaLabelCount = 0;

  for (const plan of plans) {
    if (!isRecord(plan)) {
      nonRecordCount += 1;
      continue;
    }
    if (normalizeWhitespace(plan.description)) filledDescriptionCount += 1;
    if (normalizeWhitespace(plan.ctaLabel)) filledCtaLabelCount += 1;
  }

  return {
    plansIsArray,
    nonRecordCount,
    filledDescriptionCount,
    filledCtaLabelCount,
    filledFieldCount: filledDescriptionCount + filledCtaLabelCount,
  };
}

function pluralSuffix(count: number): string {
  return count === 1 ? "" : "s";
}

function withSectionsSuffix(count: number): string {
  return count > 1 ? ` (${count} sections)` : "";
}

export function buildSemanticDiffSummary(input: {
  pageBefore: Gnr8Page;
  pageAfter: Gnr8Page;
}): SemanticDiffSummary {
  const beforeSupported = getSupportedSections(input.pageBefore);
  const afterSupported = getSupportedSections(input.pageAfter);

  const beforeById = buildSectionById(beforeSupported);
  const afterById = buildSectionById(afterSupported);

  const typeOrder = ["hero.split", "cta.simple", "faq.basic", "pricing.basic", "feature.grid"] as const;

  let semanticFieldsBefore = 0;
  let semanticFieldsAfter = 0;
  let semanticImprovements = 0;

  let hasSemanticChange = false;
  const changes: string[] = [];

  for (const type of typeOrder) {
    const ids = [...beforeById.values()]
      .filter((s) => s.type === type)
      .map((s) => s.id)
      .filter((id) => afterById.has(id))
      .sort((a, b) => a.localeCompare(b));

    if (ids.length === 0) continue;

    if (type === "hero.split") {
      let headlineImproved = 0;
      let headlineChanged = 0;
      let subAdded = 0;
      let subImproved = 0;
      let subChanged = 0;

      for (const id of ids) {
        const a = beforeById.get(id);
        const b = afterById.get(id);
        if (!a || !b || a.type !== b.type) continue;

        const beforeProps = getProps(a);
        const afterProps = getProps(b);

        semanticFieldsBefore += countFilledText(beforeProps.headline) + countFilledText(beforeProps.subheadline);
        semanticFieldsAfter += countFilledText(afterProps.headline) + countFilledText(afterProps.subheadline);

        const beforeHeadline = normalizeWhitespace(beforeProps.headline);
        const afterHeadline = normalizeWhitespace(afterProps.headline);
        if (isMeaningfulTextChange(beforeHeadline, afterHeadline)) {
          hasSemanticChange = true;
          if (isWeakHeadline(beforeHeadline) && !isWeakHeadline(afterHeadline)) {
            headlineImproved += 1;
            semanticImprovements += 1;
          } else {
            headlineChanged += 1;
          }
        }

        const beforeSub = normalizeWhitespace(beforeProps.subheadline);
        const afterSub = normalizeWhitespace(afterProps.subheadline);
        const beforeSubEmpty = !beforeSub;
        const afterSubEmpty = !afterSub;
        if (beforeSubEmpty && !afterSubEmpty) {
          hasSemanticChange = true;
          subAdded += 1;
          semanticImprovements += 1;
        } else if (isMeaningfulTextChange(beforeSub, afterSub)) {
          hasSemanticChange = true;
          if (isWeakSubheadline(beforeSub) && !isWeakSubheadline(afterSub)) {
            subImproved += 1;
            semanticImprovements += 1;
          } else {
            subChanged += 1;
          }
        }
      }

      if (headlineImproved > 0) changes.push(`Hero headline improved${withSectionsSuffix(headlineImproved)}.`);
      if (headlineChanged > 0 && headlineImproved === 0)
        changes.push(`Hero headline updated${withSectionsSuffix(headlineChanged)}.`);
      if (subAdded > 0) changes.push(`Hero subheadline added${withSectionsSuffix(subAdded)}.`);
      if (subImproved > 0) changes.push(`Hero subheadline improved${withSectionsSuffix(subImproved)}.`);
      if (subChanged > 0 && subImproved === 0) changes.push(`Hero subheadline updated${withSectionsSuffix(subChanged)}.`);
    } else if (type === "cta.simple") {
      let headlineAdded = 0;
      let headlineImproved = 0;
      let headlineChanged = 0;

      let subAdded = 0;
      let subImproved = 0;
      let subChanged = 0;

      let labelUpgraded = 0;
      let labelChanged = 0;

      for (const id of ids) {
        const a = beforeById.get(id);
        const b = afterById.get(id);
        if (!a || !b || a.type !== b.type) continue;

        const beforeProps = getProps(a);
        const afterProps = getProps(b);

        semanticFieldsBefore +=
          countFilledText(beforeProps.headline) + countFilledText(beforeProps.subheadline) + countFilledText(beforeProps.buttonLabel);
        semanticFieldsAfter +=
          countFilledText(afterProps.headline) + countFilledText(afterProps.subheadline) + countFilledText(afterProps.buttonLabel);

        const beforeHeadline = normalizeWhitespace(beforeProps.headline);
        const afterHeadline = normalizeWhitespace(afterProps.headline);
        if (!beforeHeadline && afterHeadline) {
          hasSemanticChange = true;
          headlineAdded += 1;
          semanticImprovements += 1;
        } else if (isMeaningfulTextChange(beforeHeadline, afterHeadline)) {
          hasSemanticChange = true;
          if (isWeakHeadline(beforeHeadline) && !isWeakHeadline(afterHeadline)) {
            headlineImproved += 1;
            semanticImprovements += 1;
          } else {
            headlineChanged += 1;
          }
        }

        const beforeSub = normalizeWhitespace(beforeProps.subheadline);
        const afterSub = normalizeWhitespace(afterProps.subheadline);
        if (!beforeSub && afterSub) {
          hasSemanticChange = true;
          subAdded += 1;
          semanticImprovements += 1;
        } else if (isMeaningfulTextChange(beforeSub, afterSub)) {
          hasSemanticChange = true;
          if (isWeakSubheadline(beforeSub) && !isWeakSubheadline(afterSub)) {
            subImproved += 1;
            semanticImprovements += 1;
          } else {
            subChanged += 1;
          }
        }

        const beforeLabel = normalizeWhitespace(beforeProps.buttonLabel);
        const afterLabel = normalizeWhitespace(afterProps.buttonLabel);
        if (isMeaningfulTextChange(beforeLabel, afterLabel)) {
          hasSemanticChange = true;
          if (isWeakButtonLabel(beforeLabel) && !isWeakButtonLabel(afterLabel)) {
            labelUpgraded += 1;
            semanticImprovements += 1;
          } else {
            labelChanged += 1;
          }
        }
      }

      if (headlineAdded > 0) changes.push(`CTA headline added${withSectionsSuffix(headlineAdded)}.`);
      if (headlineImproved > 0) changes.push(`CTA headline improved${withSectionsSuffix(headlineImproved)}.`);
      if (headlineChanged > 0 && headlineImproved === 0 && headlineAdded === 0)
        changes.push(`CTA headline updated${withSectionsSuffix(headlineChanged)}.`);

      if (subAdded > 0) changes.push(`CTA subheadline added${withSectionsSuffix(subAdded)}.`);
      if (subImproved > 0) changes.push(`CTA subheadline improved${withSectionsSuffix(subImproved)}.`);
      if (subChanged > 0 && subImproved === 0 && subAdded === 0)
        changes.push(`CTA subheadline updated${withSectionsSuffix(subChanged)}.`);

      if (labelUpgraded > 0) changes.push(`CTA button label clarified${withSectionsSuffix(labelUpgraded)}.`);
      if (labelChanged > 0 && labelUpgraded === 0) changes.push(`CTA button label updated${withSectionsSuffix(labelChanged)}.`);
    } else if (type === "faq.basic") {
      let sectionsWithArrayNormalized = 0;
      let sectionsWithPlaceholderImprovements = 0;
      let removedEmptyItems = 0;

      for (const id of ids) {
        const a = beforeById.get(id);
        const b = afterById.get(id);
        if (!a || !b || a.type !== b.type) continue;

        const beforeProps = getProps(a);
        const afterProps = getProps(b);

        const beforeStats = extractFaqStats(beforeProps);
        const afterStats = extractFaqStats(afterProps);

        semanticFieldsBefore += beforeStats.filledFieldCount;
        semanticFieldsAfter += afterStats.filledFieldCount;

        const beforeFullyEmpty = beforeStats.fullyEmptyCount;
        const afterFullyEmpty = afterStats.fullyEmptyCount;
        const beforeItemsLen = Array.isArray(beforeProps.items) ? beforeProps.items.length : 0;
        const afterItemsLen = Array.isArray(afterProps.items) ? afterProps.items.length : 0;

        const hadNormalization =
          beforeStats.itemsIsArray !== afterStats.itemsIsArray ||
          (beforeStats.nonRecordCount > 0 && afterStats.nonRecordCount === 0);
        if (hadNormalization) {
          hasSemanticChange = true;
          sectionsWithArrayNormalized += 1;
          semanticImprovements += 1;
        }

        const weakReduction = Math.max(0, beforeStats.weakFieldCount - afterStats.weakFieldCount);
        if (weakReduction > 0) {
          hasSemanticChange = true;
          sectionsWithPlaceholderImprovements += 1;
          semanticImprovements += weakReduction;
        }

        const likelyRemovedFullyEmpty =
          beforeFullyEmpty > 0 &&
          afterItemsLen < beforeItemsLen &&
          beforeItemsLen - afterItemsLen <= beforeFullyEmpty &&
          afterFullyEmpty <= beforeFullyEmpty;

        if (likelyRemovedFullyEmpty) {
          hasSemanticChange = true;
          const diff = beforeItemsLen - afterItemsLen;
          removedEmptyItems += diff;
          semanticImprovements += diff;
        }
      }

      if (sectionsWithArrayNormalized > 0) changes.push(`FAQ items normalized${withSectionsSuffix(sectionsWithArrayNormalized)}.`);
      if (sectionsWithPlaceholderImprovements > 0)
        changes.push(`FAQ placeholders normalized${withSectionsSuffix(sectionsWithPlaceholderImprovements)}.`);
      if (removedEmptyItems > 0)
        changes.push(`FAQ empty entries removed (${removedEmptyItems} item${pluralSuffix(removedEmptyItems)}).`);
    } else if (type === "pricing.basic") {
      let sectionsWithDescriptionsAdded = 0;
      let sectionsWithCtaAdded = 0;

      for (const id of ids) {
        const a = beforeById.get(id);
        const b = afterById.get(id);
        if (!a || !b || a.type !== b.type) continue;

        const beforeProps = getProps(a);
        const afterProps = getProps(b);

        const beforeStats = extractPricingStats(beforeProps);
        const afterStats = extractPricingStats(afterProps);

        semanticFieldsBefore += beforeStats.filledFieldCount;
        semanticFieldsAfter += afterStats.filledFieldCount;

        const descIncrease = Math.max(0, afterStats.filledDescriptionCount - beforeStats.filledDescriptionCount);
        const ctaIncrease = Math.max(0, afterStats.filledCtaLabelCount - beforeStats.filledCtaLabelCount);

        if (descIncrease > 0) {
          hasSemanticChange = true;
          sectionsWithDescriptionsAdded += 1;
          semanticImprovements += descIncrease;
        }

        if (ctaIncrease > 0) {
          hasSemanticChange = true;
          sectionsWithCtaAdded += 1;
          semanticImprovements += ctaIncrease;
        }
      }

      if (sectionsWithDescriptionsAdded > 0)
        changes.push(`Pricing descriptions added${withSectionsSuffix(sectionsWithDescriptionsAdded)}.`);
      if (sectionsWithCtaAdded > 0) changes.push(`Pricing CTA labels added${withSectionsSuffix(sectionsWithCtaAdded)}.`);

      // If something changed but didn't count as an "added" improvement, still report deterministically.
      if (sectionsWithDescriptionsAdded === 0 && sectionsWithCtaAdded === 0) {
        let sectionsWithPricingUpdates = 0;
        for (const id of ids) {
          const a = beforeById.get(id);
          const b = afterById.get(id);
          if (!a || !b || a.type !== b.type) continue;
          const beforeProps = getProps(a);
          const afterProps = getProps(b);
          const beforePlans = Array.isArray(beforeProps.plans) ? beforeProps.plans : [];
          const afterPlans = Array.isArray(afterProps.plans) ? afterProps.plans : [];
          const max = Math.max(beforePlans.length, afterPlans.length);
          let anyTextChangeInSection = false;
          for (let i = 0; i < max; i += 1) {
            const bp = isRecord(beforePlans[i]) ? beforePlans[i] : {};
            const ap = isRecord(afterPlans[i]) ? afterPlans[i] : {};
            if (isMeaningfulTextChange(bp.description, ap.description) || isMeaningfulTextChange(bp.ctaLabel, ap.ctaLabel)) {
              anyTextChangeInSection = true;
              break;
            }
          }
          if (anyTextChangeInSection) sectionsWithPricingUpdates += 1;
        }
        if (sectionsWithPricingUpdates > 0) {
          hasSemanticChange = true;
          changes.push(`Pricing content updated${withSectionsSuffix(sectionsWithPricingUpdates)}.`);
        }
      }
    } else if (type === "feature.grid") {
      let sectionsWithContentFilled = 0;
      let sectionsWithEmptyRemoved = 0;
      let emptyRemoved = 0;

      for (const id of ids) {
        const a = beforeById.get(id);
        const b = afterById.get(id);
        if (!a || !b || a.type !== b.type) continue;

        const beforeProps = getProps(a);
        const afterProps = getProps(b);

        const beforeStats = extractFeatureGridStats(beforeProps);
        const afterStats = extractFeatureGridStats(afterProps);

        semanticFieldsBefore += beforeStats.filledFieldCount;
        semanticFieldsAfter += afterStats.filledFieldCount;

        const filledIncrease = Math.max(0, afterStats.filledFieldCount - beforeStats.filledFieldCount);
        if (filledIncrease > 0) {
          hasSemanticChange = true;
          sectionsWithContentFilled += 1;
          semanticImprovements += filledIncrease;
        }

        const beforeItemsLen = Array.isArray(beforeProps.items) ? beforeProps.items.length : 0;
        const afterItemsLen = Array.isArray(afterProps.items) ? afterProps.items.length : 0;
        const likelyRemovedFullyEmpty =
          beforeStats.fullyEmptyCount > 0 &&
          afterItemsLen < beforeItemsLen &&
          beforeItemsLen - afterItemsLen <= beforeStats.fullyEmptyCount &&
          afterStats.fullyEmptyCount <= beforeStats.fullyEmptyCount;

        if (likelyRemovedFullyEmpty) {
          hasSemanticChange = true;
          sectionsWithEmptyRemoved += 1;
          const diff = beforeItemsLen - afterItemsLen;
          emptyRemoved += diff;
          semanticImprovements += diff;
        }
      }

      if (sectionsWithContentFilled > 0) changes.push(`Feature grid content completed${withSectionsSuffix(sectionsWithContentFilled)}.`);
      if (sectionsWithEmptyRemoved > 0)
        changes.push(`Feature grid empty items removed (${emptyRemoved} item${pluralSuffix(emptyRemoved)}).`);
    }
  }

  const changed = hasSemanticChange;
  const summary = (() => {
    if (!changed) return "Semantic content unchanged.";
    if (semanticImprovements > 0) return "Semantic content improved with clearer structured messaging.";
    return "Semantic content updated.";
  })();

  return {
    changed,
    summary,
    changes: changed ? changes : [],
    metrics: {
      semanticFieldsBefore,
      semanticFieldsAfter,
      semanticImprovements,
    },
  };
}
