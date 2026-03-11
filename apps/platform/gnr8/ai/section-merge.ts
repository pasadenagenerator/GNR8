import type { DuplicateDetail, DuplicateSimilarity } from "@/gnr8/ai/migration-review-logic";
import type { Gnr8Page } from "@/gnr8/types/page";
import type { Gnr8Section } from "@/gnr8/types/section";

type MergeSupportedType = "faq.basic" | "pricing.basic" | "feature.grid" | "logo.cloud" | "cta.simple";

export type SectionMergeResult = {
  page: Gnr8Page;
  notes: string[];
  mergedTypes: Array<{ type: MergeSupportedType; mergedCount: number }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeKeyText(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLogoKey(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed === "/") return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function nonEmptyCount(values: Array<unknown>): number {
  let count = 0;
  for (const v of values) {
    if (typeof v === "string" && v.trim()) count += 1;
  }
  return count;
}

function mergeFaqProps(propsList: Array<unknown>): { items: Array<{ question: string; answer: string }> } | null {
  const merged: Array<{ question: string; answer: string }> = [];
  const indexByQuestion = new Map<string, number>();

  for (const props of propsList) {
    if (!isRecord(props)) continue;
    const items = getArray(props.items).filter((i) => isRecord(i)) as Array<Record<string, unknown>>;

    for (const item of items) {
      const question = getString(item.question);
      const answer = getString(item.answer);
      const key = normalizeKeyText(question);
      if (!key) continue;

      const existingIndex = indexByQuestion.get(key);
      if (existingIndex == null) {
        indexByQuestion.set(key, merged.length);
        merged.push({ question, answer });
        continue;
      }

      const existing = merged[existingIndex]!;
      const existingAnswerEmpty = !existing.answer || !existing.answer.trim();
      const nextAnswerNonEmpty = !!answer.trim();
      if (existingAnswerEmpty && nextAnswerNonEmpty) {
        merged[existingIndex] = { ...existing, answer };
      }
    }
  }

  return { items: merged };
}

function mergeLogoCloudProps(propsList: Array<unknown>): { logos: string[] } | null {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const props of propsList) {
    if (!isRecord(props)) continue;
    const logosRaw = getArray(props.logos);
    for (const logoRaw of logosRaw) {
      if (typeof logoRaw !== "string") continue;
      const logo = logoRaw.trim();
      const key = normalizeLogoKey(logo);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(logo);
    }
  }

  return { logos: merged };
}

type CtaSimpleProps = {
  headline?: string;
  subheadline?: string;
  buttonLabel?: string;
  buttonHref?: string;
};

function isClearlyMoreCompleteText(current: string, next: string): boolean {
  const cur = current.trim();
  const nxt = next.trim();
  if (!cur || !nxt) return false;
  // Conservative: only upgrade when later copy is materially longer.
  return nxt.length >= cur.length + 12;
}

function mergeCtaSimpleProps(propsList: Array<unknown>): CtaSimpleProps | null {
  const first = propsList[0];
  if (!isRecord(first)) return { ...{} };

  const merged: CtaSimpleProps = {
    headline: getString(first.headline) || undefined,
    subheadline: getString(first.subheadline) || undefined,
    buttonLabel: getString(first.buttonLabel) || undefined,
    buttonHref: getString(first.buttonHref) || undefined,
  };

  for (const props of propsList.slice(1)) {
    if (!isRecord(props)) continue;
    const nextHeadline = getString(props.headline);
    const nextSubheadline = getString(props.subheadline);
    const nextButtonLabel = getString(props.buttonLabel);
    const nextButtonHref = getString(props.buttonHref);

    if ((!merged.headline || !merged.headline.trim()) && nextHeadline?.trim()) merged.headline = nextHeadline;
    else if (merged.headline && nextHeadline && isClearlyMoreCompleteText(merged.headline, nextHeadline)) merged.headline = nextHeadline;

    if ((!merged.subheadline || !merged.subheadline.trim()) && nextSubheadline?.trim()) merged.subheadline = nextSubheadline;
    else if (merged.subheadline && nextSubheadline && isClearlyMoreCompleteText(merged.subheadline, nextSubheadline))
      merged.subheadline = nextSubheadline;

    if ((!merged.buttonLabel || !merged.buttonLabel.trim()) && nextButtonLabel?.trim()) merged.buttonLabel = nextButtonLabel;
    if ((!merged.buttonHref || !merged.buttonHref.trim()) && nextButtonHref?.trim()) merged.buttonHref = nextButtonHref;
  }

  const cleaned: CtaSimpleProps = {};
  if (merged.headline?.trim()) cleaned.headline = merged.headline;
  if (merged.subheadline?.trim()) cleaned.subheadline = merged.subheadline;
  if (merged.buttonLabel?.trim()) cleaned.buttonLabel = merged.buttonLabel;
  if (merged.buttonHref?.trim()) cleaned.buttonHref = merged.buttonHref;
  return cleaned;
}

type PricingPlan = {
  name: string;
  price?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

function planCompletenessScore(plan: PricingPlan): number {
  return nonEmptyCount([plan.price, plan.description, plan.ctaLabel, plan.ctaHref]);
}

function mergePricingProps(propsList: Array<unknown>): { plans: PricingPlan[] } | null {
  const merged: PricingPlan[] = [];
  const indexByName = new Map<string, number>();

  for (const props of propsList) {
    if (!isRecord(props)) continue;
    const plans = getArray(props.plans).filter((p) => isRecord(p)) as Array<Record<string, unknown>>;

    for (const planRaw of plans) {
      const plan: PricingPlan = {
        name: getString(planRaw.name),
        price: getString(planRaw.price) || undefined,
        description: getString(planRaw.description) || undefined,
        ctaLabel: getString(planRaw.ctaLabel) || undefined,
        ctaHref: getString(planRaw.ctaHref) || undefined,
      };

      const key = normalizeKeyText(plan.name);
      if (!key) continue;

      const existingIndex = indexByName.get(key);
      if (existingIndex == null) {
        indexByName.set(key, merged.length);
        merged.push(plan);
        continue;
      }

      const existing = merged[existingIndex]!;
      if (planCompletenessScore(plan) > planCompletenessScore(existing)) {
        merged[existingIndex] = plan;
      }
    }
  }

  return { plans: merged };
}

type FeatureGridItem = { title: string; text: string };

function featureGridItemScore(item: FeatureGridItem): number {
  const title = item.title.trim();
  const text = item.text.trim();
  // Prefer items with text, then longer text (more complete).
  return nonEmptyCount([title, text]) * 1000 + text.length;
}

function mergeFeatureGridProps(propsList: Array<unknown>): { items: FeatureGridItem[] } | null {
  const merged: FeatureGridItem[] = [];
  const indexByTitle = new Map<string, number>();

  for (const props of propsList) {
    if (!isRecord(props)) continue;
    const items = getArray(props.items).filter((i) => isRecord(i)) as Array<Record<string, unknown>>;

    for (const itemRaw of items) {
      const title = getString(itemRaw.title);
      const text = getString(itemRaw.text);
      const key = normalizeKeyText(title);
      if (!key) continue;

      const existingIndex = indexByTitle.get(key);
      if (existingIndex == null) {
        indexByTitle.set(key, merged.length);
        merged.push({ title, text });
        continue;
      }

      const existing = merged[existingIndex]!;
      const existingTextEmpty = !existing.text || !existing.text.trim();
      const nextTextNonEmpty = !!text.trim();

      // Keep first item by default, but upgrade when later duplicate is more complete.
      if (existingTextEmpty && nextTextNonEmpty) {
        merged[existingIndex] = { ...existing, text };
        continue;
      }

      const existingScore = featureGridItemScore(existing);
      const nextScore = featureGridItemScore({ title: existing.title || title, text });
      if (nextScore > existingScore) {
        merged[existingIndex] = {
          title: existing.title.trim() ? existing.title : title,
          text,
        };
      }
    }
  }

  return { items: merged };
}

function mergeLabel(type: MergeSupportedType): string {
  switch (type) {
    case "faq.basic":
      return "FAQ";
    case "pricing.basic":
      return "pricing";
    case "feature.grid":
      return "feature grid";
    case "logo.cloud":
      return "logo cloud";
    case "cta.simple":
      return "CTA";
  }
}

function isMergeEligibleSimilarity(sim: DuplicateSimilarity | undefined): boolean {
  return sim === "highly-similar" || sim === "exact-duplicate";
}

function resolveMergeCandidates(page: Gnr8Page, ids: string[], type: string): Gnr8Section[] {
  const idSet = new Set(ids.filter(Boolean));
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections.filter((s) => s && s.type === type && idSet.has(s.id));
}

function mergeType(
  page: Gnr8Page,
  type: MergeSupportedType,
  dup: DuplicateDetail,
): { page: Gnr8Page; mergedCount: number } {
  const ids = Array.isArray(dup.sectionIds) ? dup.sectionIds : [];
  const candidates = resolveMergeCandidates(page, ids, type);
  if (candidates.length <= 1) return { page, mergedCount: 0 };

  const primary = candidates[0]!;
  const primaryIdx = (page.sections ?? []).findIndex((s) => s.id === primary.id);
  if (primaryIdx === -1) return { page, mergedCount: 0 };

  const propsList = candidates.map((s) => s.props ?? {});

  let mergedProps: Record<string, unknown> | null = null;
  if (type === "faq.basic") mergedProps = mergeFaqProps(propsList);
  else if (type === "pricing.basic") mergedProps = mergePricingProps(propsList);
  else if (type === "feature.grid") mergedProps = mergeFeatureGridProps(propsList);
  else if (type === "logo.cloud") mergedProps = mergeLogoCloudProps(propsList);
  else mergedProps = mergeCtaSimpleProps(propsList);

  if (!mergedProps) return { page, mergedCount: 0 };

  const idsToRemove = new Set(candidates.slice(1).map((s) => s.id));
  const nextSections = [...(page.sections ?? [])];
  nextSections[primaryIdx] = { ...primary, props: { ...(isRecord(primary.props) ? primary.props : {}), ...mergedProps } };

  const filteredSections = nextSections.filter((s) => !idsToRemove.has(s.id));

  return {
    page: filteredSections.length === (page.sections?.length ?? 0) ? page : { ...page, sections: filteredSections },
    mergedCount: candidates.length,
  };
}

export function mergeSupportedDuplicateSections(page: Gnr8Page, duplicateDetails: DuplicateDetail[] | undefined): SectionMergeResult {
  if (!Array.isArray(duplicateDetails) || duplicateDetails.length === 0) {
    return { page, notes: [], mergedTypes: [] };
  }

  let nextPage = page;
  const mergedTypes: Array<{ type: MergeSupportedType; mergedCount: number }> = [];

  for (const dup of duplicateDetails) {
    const type = dup?.type;
    if (
      type !== "faq.basic" &&
      type !== "pricing.basic" &&
      type !== "feature.grid" &&
      type !== "logo.cloud" &&
      type !== "cta.simple"
    )
      continue;
    if (!isMergeEligibleSimilarity(dup.similarity)) continue;

    const { page: mergedPage, mergedCount } = mergeType(nextPage, type, dup);
    if (mergedCount >= 2 && mergedPage !== nextPage) {
      nextPage = mergedPage;
      mergedTypes.push({ type, mergedCount });
    }
  }

  const notes: string[] = [];
  for (const m of mergedTypes) {
    const label = mergeLabel(m.type);
    if (m.mergedCount === 2) notes.push(`Merged 2 ${label} sections into one.`);
    else notes.push(`Merged ${m.mergedCount} ${label} sections into one.`);
  }

  return { page: nextPage, notes, mergedTypes };
}
