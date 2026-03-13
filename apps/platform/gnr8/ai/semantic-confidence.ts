import type { Gnr8Page } from "@/gnr8/types/page";

export type SemanticConfidenceLabel = "low" | "medium" | "high";

export type SemanticConfidenceResult = {
  score: number;
  label: SemanticConfidenceLabel;
  notes: string[];
};

const SUPPORTED_TYPES = new Set([
  "hero.split",
  "cta.simple",
  "faq.basic",
  "pricing.basic",
  "feature.grid",
]);

function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function labelForScore(score: number): SemanticConfidenceLabel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function normalizeShort(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return !!value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isMissingString(value: unknown): boolean {
  return typeof value !== "string";
}

function isEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length === 0;
}

export function isPlaceholderLike(value: unknown): boolean {
  const text = typeof value === "string" ? normalizeShort(value) : "";
  if (!text) return false;
  return (
    text === "tbd" ||
    text === "todo" ||
    text.includes("lorem ipsum") ||
    text.includes("coming soon")
  );
}

export function isWeakHeadline(value: unknown): boolean {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return false;
  if (text.length < 4) return true;
  const norm = normalizeShort(text);
  return norm === "hi" || norm === "hello" || norm === "welcome" || norm === "title" || norm === "headline";
}

export function isWeakCtaLabel(value: unknown): boolean {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return false;
  const norm = normalizeShort(text);
  return (
    norm === "click here" ||
    norm === "submit" ||
    norm === "learn more" ||
    norm === "more" ||
    norm === "go"
  );
}

function addNote(notes: string[], seen: Set<string>, note: string): void {
  if (notes.length >= 5) return;
  if (seen.has(note)) return;
  seen.add(note);
  notes.push(note);
}

export function scoreHero(props: unknown): { penalty: number; note?: string } {
  const rec = getRecord(props) ?? {};
  const headline = rec.headline;
  const subheadline = rec.subheadline;

  let penalty = 0;
  let missingOrWeakHeadline = false;

  if (isMissingString(headline)) {
    penalty += 18;
    missingOrWeakHeadline = true;
  } else if (isEmptyString(headline)) {
    penalty += 18;
    missingOrWeakHeadline = true;
  } else if (isWeakHeadline(headline)) {
    penalty += 10;
    missingOrWeakHeadline = true;
  }

  if (isMissingString(subheadline)) penalty += 8;
  else if (isEmptyString(subheadline)) penalty += 8;

  return {
    penalty,
    note: missingOrWeakHeadline ? "Hero headline is weak or missing." : undefined,
  };
}

export function scoreCta(props: unknown): { penalty: number; note?: string } {
  const rec = getRecord(props) ?? {};
  const headline = rec.headline;
  const subheadline = rec.subheadline;
  const buttonLabel = rec.buttonLabel;

  let penalty = 0;
  let weakOrMissingLabel = false;

  if (isMissingString(headline)) penalty += 10;
  else if (isEmptyString(headline)) penalty += 10;

  if (isMissingString(subheadline)) penalty += 6;
  else if (isEmptyString(subheadline)) penalty += 6;

  if (isMissingString(buttonLabel)) {
    penalty += 14;
    weakOrMissingLabel = true;
  } else if (isEmptyString(buttonLabel)) {
    penalty += 14;
    weakOrMissingLabel = true;
  } else if (isWeakCtaLabel(buttonLabel)) {
    penalty += 10;
    weakOrMissingLabel = true;
  }

  return {
    penalty,
    note: weakOrMissingLabel ? "CTA label is weak or missing." : undefined,
  };
}

export function scoreFaq(props: unknown): { penalty: number; note?: string } {
  const rec = getRecord(props) ?? {};
  const items = rec.items;

  if (!Array.isArray(items)) {
    return { penalty: 18, note: "FAQ content is incomplete." };
  }

  let penalty = 0;
  let incomplete = false;

  for (const item of items) {
    const r = getRecord(item);
    const question = r ? getString(r.question) : undefined;
    const answer = r ? getString(r.answer) : undefined;

    const qText = (question ?? "").trim();
    const aText = (answer ?? "").trim();

    if (!qText && !aText) {
      penalty += 6;
      incomplete = true;
      continue;
    }

    if (!question || !qText) {
      penalty += 4;
      incomplete = true;
    }
    if (!answer || !aText) {
      penalty += 4;
      incomplete = true;
    }
    if (isPlaceholderLike(qText) || isPlaceholderLike(aText)) {
      penalty += 3;
      incomplete = true;
    }
  }

  if (penalty > 20) penalty = 20;
  return { penalty, note: incomplete ? "FAQ content is incomplete." : undefined };
}

export function scorePricing(props: unknown): { penalty: number; note?: string } {
  const rec = getRecord(props) ?? {};
  const plans = rec.plans;

  if (!Array.isArray(plans)) {
    return { penalty: 18, note: "Pricing plans are missing descriptions." };
  }

  let penalty = 0;
  let missingDescriptions = false;

  for (const plan of plans) {
    const r = getRecord(plan);
    const description = r ? getString(r.description) : undefined;
    const ctaLabel = r ? getString(r.ctaLabel) : undefined;

    if (!description || description.trim().length === 0) {
      penalty += 4;
      missingDescriptions = true;
    }
    if (!ctaLabel || ctaLabel.trim().length === 0) {
      penalty += 4;
    }
  }

  if (penalty > 18) penalty = 18;
  return { penalty, note: missingDescriptions ? "Pricing plans are missing descriptions." : undefined };
}

export function scoreFeatureGrid(props: unknown): { penalty: number; note?: string } {
  const rec = getRecord(props) ?? {};
  const items = rec.items;

  if (!Array.isArray(items)) {
    return { penalty: 18, note: "Feature grid items are incomplete." };
  }

  let penalty = 0;
  let incomplete = false;

  for (const item of items) {
    const r = getRecord(item);
    const title = r ? getString(r.title) : undefined;
    const text = r ? getString(r.text) : undefined;

    const tText = (title ?? "").trim();
    const bodyText = (text ?? "").trim();

    if (!tText && !bodyText) {
      penalty += 6;
      incomplete = true;
      continue;
    }

    if (!title || !tText) {
      penalty += 4;
      incomplete = true;
    }
    if (!text || !bodyText) {
      penalty += 4;
      incomplete = true;
    }
    if (isPlaceholderLike(tText) || isPlaceholderLike(bodyText)) {
      penalty += 3;
      incomplete = true;
    }
  }

  if (penalty > 18) penalty = 18;
  return { penalty, note: incomplete ? "Feature grid items are incomplete." : undefined };
}

function hasSupportedSemanticSections(page: Gnr8Page): boolean {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections.some((s) => s && typeof s.type === "string" && SUPPORTED_TYPES.has(s.type));
}

function firstPropsForType(page: Gnr8Page, type: string): unknown | undefined {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const found = sections.find((s) => s && typeof s.type === "string" && s.type === type);
  return found?.props;
}

export function calculateSemanticConfidence(page: Gnr8Page): SemanticConfidenceResult {
  if (!hasSupportedSemanticSections(page)) {
    return {
      score: 0,
      label: "low",
      notes: ["No supported structured content was available for semantic scoring."],
    };
  }

  let penalty = 0;
  const notes: string[] = [];
  const seen = new Set<string>();

  const heroProps = firstPropsForType(page, "hero.split");
  if (heroProps !== undefined) {
    const r = scoreHero(heroProps);
    penalty += r.penalty;
    if (r.note) addNote(notes, seen, r.note);
  }

  const ctaProps = firstPropsForType(page, "cta.simple");
  if (ctaProps !== undefined) {
    const r = scoreCta(ctaProps);
    penalty += r.penalty;
    if (r.note) addNote(notes, seen, r.note);
  }

  const faqProps = firstPropsForType(page, "faq.basic");
  if (faqProps !== undefined) {
    const r = scoreFaq(faqProps);
    penalty += r.penalty;
    if (r.note) addNote(notes, seen, r.note);
  }

  const pricingProps = firstPropsForType(page, "pricing.basic");
  if (pricingProps !== undefined) {
    const r = scorePricing(pricingProps);
    penalty += r.penalty;
    if (r.note) addNote(notes, seen, r.note);
  }

  const gridProps = firstPropsForType(page, "feature.grid");
  if (gridProps !== undefined) {
    const r = scoreFeatureGrid(gridProps);
    penalty += r.penalty;
    if (r.note) addNote(notes, seen, r.note);
  }

  const score = clampScore(100 - penalty);
  return {
    score,
    label: labelForScore(score),
    notes,
  };
}

