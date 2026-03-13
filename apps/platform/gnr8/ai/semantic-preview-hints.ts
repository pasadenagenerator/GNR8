import type { Gnr8Page } from "@/gnr8/types/page";
import { isPlaceholderLike, isWeakCtaLabel, isWeakHeadline } from "./semantic-confidence";

const SUPPORTED_SEMANTIC_PROMPTS = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
] as const;

export type SupportedSemanticPrompt = (typeof SUPPORTED_SEMANTIC_PROMPTS)[number];

function isSupportedSemanticPrompt(value: string): value is SupportedSemanticPrompt {
  return (SUPPORTED_SEMANTIC_PROMPTS as readonly string[]).includes(value);
}

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

function capHints(hints: string[], max: number): string[] {
  return uniqStable(hints).slice(0, Math.max(0, max));
}

function buildHeroPreviewHints(page: Gnr8Page): string[] {
  const props = getFirstPropsForType(page, "hero.split");
  if (props === undefined) return [];
  const rec = isRecord(props) ? props : {};

  const headline = rec.headline;
  const subheadline = rec.subheadline;

  const headlineMissing = isMissingString(headline);
  const headlineEmpty = isEmptyString(headline);
  const headlineWeak = !headlineMissing && !headlineEmpty && isWeakHeadline(headline);
  const subheadlineMissingOrEmpty = isMissingString(subheadline) || isEmptyString(subheadline);

  const hints: string[] = [];
  if (headlineMissing || headlineEmpty || headlineWeak) hints.push("Hero headline may be clarified.");
  if (subheadlineMissingOrEmpty) hints.push("Hero subheadline may be added.");

  return capHints(hints, 3);
}

function buildCtaPreviewHints(page: Gnr8Page): string[] {
  const props = getFirstPropsForType(page, "cta.simple");
  if (props === undefined) return [];
  const rec = isRecord(props) ? props : {};

  const headline = rec.headline;
  const subheadline = rec.subheadline;
  const buttonLabel = rec.buttonLabel;

  const headlineMissingOrEmpty = isMissingString(headline) || isEmptyString(headline);
  const subheadlineMissingOrEmpty = isMissingString(subheadline) || isEmptyString(subheadline);

  const buttonLabelMissing = isMissingString(buttonLabel);
  const buttonLabelEmpty = isEmptyString(buttonLabel);
  const buttonLabelWeak = !buttonLabelMissing && !buttonLabelEmpty && isWeakCtaLabel(buttonLabel);

  const hints: string[] = [];
  if (headlineMissingOrEmpty) hints.push("CTA headline may be added or clarified.");
  if (subheadlineMissingOrEmpty) hints.push("CTA helper text may be added.");
  if (buttonLabelMissing || buttonLabelEmpty || buttonLabelWeak) hints.push("CTA button label may be clarified.");

  return capHints(hints, 3);
}

function buildFaqPreviewHints(page: Gnr8Page): string[] {
  const props = getFirstPropsForType(page, "faq.basic");
  if (props === undefined) return [];
  const rec = isRecord(props) ? props : {};

  const items = rec.items;
  if (!Array.isArray(items)) return ["FAQ content may be normalized."];

  let hasPlaceholders = false;
  let hasIncomplete = false;

  for (const raw of items) {
    if (!isRecord(raw)) {
      hasIncomplete = true;
      continue;
    }

    const question = raw.question;
    const answer = raw.answer;

    const qMissingOrEmpty = isMissingString(question) || isEmptyString(question);
    const aMissingOrEmpty = isMissingString(answer) || isEmptyString(answer);

    if (qMissingOrEmpty || aMissingOrEmpty) hasIncomplete = true;
    if (isPlaceholderLike(question) || isPlaceholderLike(answer)) hasPlaceholders = true;
  }

  const hints: string[] = [];
  if (hasPlaceholders) hints.push("FAQ placeholders may be normalized.");
  if (hasIncomplete) hints.push("Incomplete FAQ entries may be completed.");

  return capHints(hints, 2);
}

function buildPricingPreviewHints(page: Gnr8Page): string[] {
  const props = getFirstPropsForType(page, "pricing.basic");
  if (props === undefined) return [];
  const rec = isRecord(props) ? props : {};

  const plans = rec.plans;
  if (!Array.isArray(plans)) {
    return capHints(["Pricing plan descriptions may be completed.", "Pricing calls-to-action may be completed."], 2);
  }

  let missingDescriptions = false;
  let missingCtaLabels = false;

  for (const raw of plans) {
    if (!isRecord(raw)) {
      missingDescriptions = true;
      missingCtaLabels = true;
      continue;
    }

    const description = raw.description;
    const ctaLabel = raw.ctaLabel;

    if (isMissingString(description) || isEmptyString(description)) missingDescriptions = true;
    if (isMissingString(ctaLabel) || isEmptyString(ctaLabel)) missingCtaLabels = true;
  }

  const hints: string[] = [];
  if (missingDescriptions) hints.push("Pricing plan descriptions may be completed.");
  if (missingCtaLabels) hints.push("Pricing calls-to-action may be completed.");

  return capHints(hints, 3);
}

function buildFeatureGridPreviewHints(page: Gnr8Page): string[] {
  const props = getFirstPropsForType(page, "feature.grid");
  if (props === undefined) return [];
  const rec = isRecord(props) ? props : {};

  const items = rec.items;
  if (!Array.isArray(items)) return ["Feature grid items may be completed."];

  let hasIncomplete = false;
  let hasPlaceholders = false;

  for (const raw of items) {
    if (!isRecord(raw)) {
      hasIncomplete = true;
      continue;
    }

    const title = raw.title;
    const text = raw.text;

    const titleMissingOrEmpty = isMissingString(title) || isEmptyString(title);
    const textMissingOrEmpty = isMissingString(text) || isEmptyString(text);

    if (titleMissingOrEmpty || textMissingOrEmpty) hasIncomplete = true;
    if (isPlaceholderLike(title) || isPlaceholderLike(text)) hasPlaceholders = true;
  }

  const hints: string[] = [];
  if (hasIncomplete || hasPlaceholders) hints.push("Feature grid items may be completed.");
  if (hasPlaceholders) hints.push("Feature descriptions may be clarified.");

  return capHints(hints, 3);
}

export function buildSemanticPreviewHints(page: Gnr8Page, actionPrompt: string): string[] {
  if (!isSupportedSemanticPrompt(actionPrompt)) return [];

  switch (actionPrompt) {
    case "Improve hero clarity":
      return buildHeroPreviewHints(page);
    case "Improve CTA clarity":
      return buildCtaPreviewHints(page);
    case "Normalize FAQ content":
      return buildFaqPreviewHints(page);
    case "Complete pricing content":
      return buildPricingPreviewHints(page);
    case "Complete feature grid content":
      return buildFeatureGridPreviewHints(page);
    default:
      return [];
  }
}

