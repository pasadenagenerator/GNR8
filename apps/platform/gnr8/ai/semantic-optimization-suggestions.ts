import type { Gnr8Page } from "@/gnr8/types/page";
import { isPromptSupported } from "./execution-capability-matrix";
import { calculateSemanticConfidence, isPlaceholderLike, isWeakCtaLabel, isWeakHeadline } from "./semantic-confidence";

const SUGGEST_IMPROVE_HERO = "Improve hero clarity" as const;
const SUGGEST_IMPROVE_CTA = "Improve CTA clarity" as const;
const SUGGEST_NORMALIZE_FAQ = "Normalize FAQ content" as const;
const SUGGEST_COMPLETE_PRICING = "Complete pricing content" as const;
const SUGGEST_COMPLETE_FEATURE_GRID = "Complete feature grid content" as const;

type SemanticOptimizationSuggestion =
  | typeof SUGGEST_IMPROVE_HERO
  | typeof SUGGEST_IMPROVE_CTA
  | typeof SUGGEST_NORMALIZE_FAQ
  | typeof SUGGEST_COMPLETE_PRICING
  | typeof SUGGEST_COMPLETE_FEATURE_GRID;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getFirstPropsForType(page: Gnr8Page, type: string): unknown | undefined {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const found = sections.find((s) => s && typeof s.type === "string" && s.type === type);
  return found?.props;
}

function isMissingString(value: unknown): boolean {
  return typeof value !== "string";
}

function isEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length === 0;
}

function shouldSuggestImproveHero(input: { page: Gnr8Page; semanticNotes: Set<string> }): boolean {
  const props = getFirstPropsForType(input.page, "hero.split");
  if (props === undefined) return false;
  const rec = isRecord(props) ? props : {};

  const headline = rec.headline;
  const subheadline = rec.subheadline;

  const headlineMissing = isMissingString(headline);
  const headlineEmpty = isEmptyString(headline);
  const headlineWeak = !headlineMissing && !headlineEmpty && isWeakHeadline(headline);
  const subheadlineMissing = isMissingString(subheadline) || isEmptyString(subheadline);

  // Notes are supplemental; section checks are the source of truth for v1.
  const notedWeakness = input.semanticNotes.has("Hero headline is weak or missing.");

  return headlineMissing || headlineEmpty || headlineWeak || subheadlineMissing || notedWeakness;
}

function shouldSuggestImproveCta(input: { page: Gnr8Page; semanticNotes: Set<string> }): boolean {
  const props = getFirstPropsForType(input.page, "cta.simple");
  if (props === undefined) return false;
  const rec = isRecord(props) ? props : {};

  const headline = rec.headline;
  const subheadline = rec.subheadline;
  const buttonLabel = rec.buttonLabel;

  const headlineMissingOrEmpty = isMissingString(headline) || isEmptyString(headline);
  const subheadlineMissingOrEmpty = isMissingString(subheadline) || isEmptyString(subheadline);

  const buttonLabelMissing = isMissingString(buttonLabel);
  const buttonLabelEmpty = isEmptyString(buttonLabel);
  const buttonLabelWeak = !buttonLabelMissing && !buttonLabelEmpty && isWeakCtaLabel(buttonLabel);

  const notedWeakness = input.semanticNotes.has("CTA label is weak or missing.");

  return headlineMissingOrEmpty || subheadlineMissingOrEmpty || buttonLabelMissing || buttonLabelWeak || buttonLabelEmpty || notedWeakness;
}

function shouldSuggestNormalizeFaq(input: { page: Gnr8Page; semanticNotes: Set<string> }): boolean {
  const props = getFirstPropsForType(input.page, "faq.basic");
  if (props === undefined) return false;
  const rec = isRecord(props) ? props : {};

  const items = rec.items;
  if (!Array.isArray(items)) return true;

  for (const raw of items) {
    if (!isRecord(raw)) return true;

    const question = raw.question;
    const answer = raw.answer;

    const qMissingOrEmpty = isMissingString(question) || isEmptyString(question);
    const aMissingOrEmpty = isMissingString(answer) || isEmptyString(answer);

    if (qMissingOrEmpty && aMissingOrEmpty) return true;
    if (qMissingOrEmpty || aMissingOrEmpty) return true;

    if (isPlaceholderLike(question) || isPlaceholderLike(answer)) return true;
  }

  const notedWeakness = input.semanticNotes.has("FAQ content is incomplete.");
  return notedWeakness;
}

function shouldSuggestCompletePricing(input: { page: Gnr8Page; semanticNotes: Set<string> }): boolean {
  const props = getFirstPropsForType(input.page, "pricing.basic");
  if (props === undefined) return false;
  const rec = isRecord(props) ? props : {};

  const plans = rec.plans;
  if (!Array.isArray(plans)) return true;

  for (const raw of plans) {
    if (!isRecord(raw)) return true;

    const description = raw.description;
    const ctaLabel = raw.ctaLabel;

    if (isMissingString(description) || isEmptyString(description)) return true;
    if (isMissingString(ctaLabel) || isEmptyString(ctaLabel)) return true;
  }

  const notedWeakness = input.semanticNotes.has("Pricing plans are missing descriptions.");
  return notedWeakness;
}

function shouldSuggestCompleteFeatureGrid(input: { page: Gnr8Page; semanticNotes: Set<string> }): boolean {
  const props = getFirstPropsForType(input.page, "feature.grid");
  if (props === undefined) return false;
  const rec = isRecord(props) ? props : {};

  const items = rec.items;
  if (!Array.isArray(items)) return true;

  for (const raw of items) {
    if (!isRecord(raw)) return true;

    const title = raw.title;
    const text = raw.text;

    const titleMissingOrEmpty = isMissingString(title) || isEmptyString(title);
    const textMissingOrEmpty = isMissingString(text) || isEmptyString(text);

    if (titleMissingOrEmpty && textMissingOrEmpty) return true;
    if (titleMissingOrEmpty || textMissingOrEmpty) return true;

    if (isPlaceholderLike(title) || isPlaceholderLike(text)) return true;
  }

  const notedWeakness = input.semanticNotes.has("Feature grid items are incomplete.");
  return notedWeakness;
}

export function buildSemanticOptimizationSuggestions(page: Gnr8Page): string[] {
  const semanticConfidence = calculateSemanticConfidence(page);
  const semanticNotes = new Set(semanticConfidence.notes ?? []);

  const orderedChecks: Array<{ suggestion: SemanticOptimizationSuggestion; shouldSuggest: () => boolean }> = [
    {
      suggestion: SUGGEST_IMPROVE_HERO,
      shouldSuggest: () => shouldSuggestImproveHero({ page, semanticNotes }),
    },
    {
      suggestion: SUGGEST_IMPROVE_CTA,
      shouldSuggest: () => shouldSuggestImproveCta({ page, semanticNotes }),
    },
    {
      suggestion: SUGGEST_NORMALIZE_FAQ,
      shouldSuggest: () => shouldSuggestNormalizeFaq({ page, semanticNotes }),
    },
    {
      suggestion: SUGGEST_COMPLETE_PRICING,
      shouldSuggest: () => shouldSuggestCompletePricing({ page, semanticNotes }),
    },
    {
      suggestion: SUGGEST_COMPLETE_FEATURE_GRID,
      shouldSuggest: () => shouldSuggestCompleteFeatureGrid({ page, semanticNotes }),
    },
  ];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const { suggestion, shouldSuggest } of orderedChecks) {
    // Tie suggestions to supported deterministic transform prompts.
    if (!isPromptSupported(suggestion)) continue;
    if (!shouldSuggest()) continue;
    if (seen.has(suggestion)) continue;
    seen.add(suggestion);
    out.push(suggestion);
  }

  return out;
}

