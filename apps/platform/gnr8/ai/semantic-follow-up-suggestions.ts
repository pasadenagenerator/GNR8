import type { Gnr8Page } from "@/gnr8/types/page";

import { buildSemanticOptimizationSuggestions } from "./semantic-optimization-suggestions";

/**
 * Deterministic post-execution semantic guidance.
 *
 * Source of truth: the after-state page only.
 * Implementation: reuse the existing optimization suggestion builder to avoid
 * duplicating weakness detection logic.
 */
export function buildSemanticFollowUpSuggestions(pageAfter: Gnr8Page): string[] {
  return buildSemanticOptimizationSuggestions(pageAfter);
}

