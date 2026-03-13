import type { Gnr8Page } from "@/gnr8/types/page";

const SUPPORTED_SEMANTIC_PROMPTS = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
] as const;

type SupportedSemanticPrompt = (typeof SUPPORTED_SEMANTIC_PROMPTS)[number];

function isSupportedSemanticPrompt(value: string): value is SupportedSemanticPrompt {
  return (SUPPORTED_SEMANTIC_PROMPTS as readonly string[]).includes(value);
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

function hasHint(semanticPreviewHints: string[], hint: string): boolean {
  return semanticPreviewHints.some((h) => h === hint);
}

function buildHeroApprovalRationale(semanticPreviewHints: string[]): string[] {
  const hints: string[] = [];
  if (hasHint(semanticPreviewHints, "Hero headline may be clarified.")) {
    hints.push("Changes the primary hero message shown to visitors.");
  }
  if (hasHint(semanticPreviewHints, "Hero subheadline may be added.")) {
    hints.push("May add or revise hero supporting text.");
  }
  return capHints(hints, 2);
}

function buildCtaApprovalRationale(semanticPreviewHints: string[]): string[] {
  const hints: string[] = [];

  if (hasHint(semanticPreviewHints, "CTA button label may be clarified.")) {
    hints.push("Changes user-facing CTA wording.");
  }

  if (hasHint(semanticPreviewHints, "CTA helper text may be added.")) {
    hints.push("May add CTA helper text to guide the next action.");
  } else if (hasHint(semanticPreviewHints, "CTA headline may be added or clarified.")) {
    hints.push("May add or revise visitor-facing CTA headline text.");
  }

  return capHints(hints, 2);
}

function buildFaqApprovalRationale(semanticPreviewHints: string[]): string[] {
  const hints: string[] = [];
  if (hasHint(semanticPreviewHints, "Incomplete FAQ entries may be completed.")) {
    hints.push("Completes missing FAQ entries in visitor-facing content.");
  }
  if (hasHint(semanticPreviewHints, "FAQ placeholders may be normalized.")) {
    hints.push("May replace placeholder FAQ text with clearer structured content.");
  }
  return capHints(hints, 2);
}

function buildPricingApprovalRationale(semanticPreviewHints: string[]): string[] {
  const hints: string[] = [];
  if (hasHint(semanticPreviewHints, "Pricing plan descriptions may be completed.")) {
    hints.push("Completes visitor-facing pricing descriptions.");
  }
  if (hasHint(semanticPreviewHints, "Pricing calls-to-action may be completed.")) {
    hints.push("May add pricing CTA text for incomplete plans.");
  }
  return capHints(hints, 2);
}

function buildFeatureGridApprovalRationale(semanticPreviewHints: string[]): string[] {
  const hints: string[] = [];
  if (hasHint(semanticPreviewHints, "Feature grid items may be completed.")) {
    hints.push("Completes missing feature descriptions in visitor-facing content.");
  }
  if (hasHint(semanticPreviewHints, "Feature descriptions may be clarified.")) {
    hints.push("May clarify incomplete feature messaging.");
  }
  return capHints(hints, 2);
}

export function buildSemanticApprovalRationaleHints(input: {
  page: Gnr8Page;
  actionPrompt: string;
  semanticPreviewHints: string[];
}): string[] {
  void input.page;

  if (!isSupportedSemanticPrompt(input.actionPrompt)) return [];

  const previewHints = Array.isArray(input.semanticPreviewHints) ? input.semanticPreviewHints : [];

  switch (input.actionPrompt) {
    case "Improve hero clarity":
      return buildHeroApprovalRationale(previewHints);
    case "Improve CTA clarity":
      return buildCtaApprovalRationale(previewHints);
    case "Normalize FAQ content":
      return buildFaqApprovalRationale(previewHints);
    case "Complete pricing content":
      return buildPricingApprovalRationale(previewHints);
    case "Complete feature grid content":
      return buildFeatureGridApprovalRationale(previewHints);
    default:
      return [];
  }
}

