import type { MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";

export type OptimizationActionPlan = {
  suggestion: string;
  actionPrompt: string;
  safe: boolean;
  notes: string[];
};

const SAFE_PREFIXES = ["Move ", "Remove exact duplicate ", "Merge ", "Normalize ", "Fix layout ", "Reorder "] as const;

function isSafeOptimizationSuggestion(suggestion: string): boolean {
  const text = suggestion.trimStart();
  for (const prefix of SAFE_PREFIXES) {
    if (text.startsWith(prefix)) return true;
  }
  return false;
}

export function buildOptimizationActionPlans(review: MigrationReviewSummary): OptimizationActionPlan[] {
  const suggestions = Array.isArray(review.optimizationSuggestions) ? review.optimizationSuggestions : [];
  const plans: OptimizationActionPlan[] = [];

  for (const suggestionRaw of suggestions) {
    if (typeof suggestionRaw !== "string") continue;
    const suggestion = suggestionRaw;
    const actionPrompt = suggestionRaw;
    const safe = isSafeOptimizationSuggestion(suggestionRaw);

    plans.push({
      suggestion,
      actionPrompt,
      safe,
      notes: safe ? ["Safe structural optimization."] : ["Non-safe optimization requires approval."],
    });
  }

  return plans;
}

