import type { PageIntent } from "./page-intent-classifier";
import type { DuplicateDetail, MigrationReviewSummary } from "./migration-review-logic";

export type RedesignPriority = "low" | "medium" | "high";
export type RedesignStrategy = "incremental" | "structural" | "full-rebuild";

export type RedesignPlan = {
  priority: RedesignPriority;
  strategy: RedesignStrategy;
  goals: string[];
  recommendedChanges: string[];
  structuralChanges: string[];
};

function pushUnique(list: string[], value: string): void {
  if (!value) return;
  if (list.includes(value)) return;
  list.push(value);
}

function countLayoutIssues(layoutIssues: MigrationReviewSummary["layoutIssues"]): number {
  if (!layoutIssues) return 0;
  return Object.values(layoutIssues).filter(Boolean).length;
}

function hasDuplicateDetails(details: DuplicateDetail[] | undefined): boolean {
  return Array.isArray(details) && details.length > 0;
}

function hasComplexDuplicates(details: DuplicateDetail[] | undefined): boolean {
  return (details ?? []).some((d) => d.similarity === "highly-similar" || d.similarity === "different-content");
}

function goalsForIntent(intent: PageIntent): string[] {
  switch (intent) {
    case "saas_homepage":
      return ["Improve conversion clarity", "Strengthen pricing visibility", "Optimize CTA hierarchy"];
    case "marketing_landing":
      return ["Increase CTA prominence", "Reduce content density", "Improve visual storytelling"];
    case "ecommerce_product":
      return ["Improve product clarity", "Strengthen purchase flow", "Optimize trust signals"];
    case "blog_article":
      return ["Improve readability", "Reduce visual noise", "Improve content hierarchy"];
    case "unknown":
    default:
      return ["Clarify page purpose", "Establish structural layout", "Improve content organization"];
  }
}

function priorityForReview(review: MigrationReviewSummary): RedesignPriority {
  const layoutIssueCount = countLayoutIssues(review.layoutIssues);
  const intentConfidence = review.intentConfidence ?? 0;

  if (review.confidenceScore < 50 || review.legacySections > 0 || intentConfidence < 60) return "high";
  if (review.confidenceScore >= 50 && review.confidenceScore <= 80) return "medium";
  if (review.confidenceScore > 80 && layoutIssueCount === 0) return "low";
  return "medium";
}

function strategyForReview(review: MigrationReviewSummary): RedesignStrategy {
  const layoutIssueCount = countLayoutIssues(review.layoutIssues);
  const intent = review.intent ?? "unknown";
  const intentConfidence = review.intentConfidence ?? 0;
  const hasDupes = hasDuplicateDetails(review.duplicateDetails);

  const fullRebuild =
    review.confidenceScore < 40 ||
    review.legacySections > review.structuredSections ||
    intent === "unknown" ||
    layoutIssueCount >= 3;

  if (fullRebuild) return "full-rebuild";

  const incremental =
    review.confidenceScore > 70 && layoutIssueCount <= 1 && review.legacySections === 0 && !hasDupes;

  if (incremental) return "incremental";

  const structural =
    (review.confidenceScore >= 40 && review.confidenceScore <= 70) ||
    hasComplexDuplicates(review.duplicateDetails) ||
    intentConfidence < 60;

  if (structural) return "structural";

  return "structural";
}

function recommendedChangesForReview(review: MigrationReviewSummary): string[] {
  const changes: string[] = [];

  const intent = review.intent ?? "unknown";
  const hasCta = (review.countsByType["cta.simple"] ?? 0) > 0;
  const hasPricing = (review.countsByType["pricing.basic"] ?? 0) > 0;
  const hasDupes = hasDuplicateDetails(review.duplicateDetails);

  if (hasDupes) pushUnique(changes, "Consolidate duplicate sections");
  if (review.layoutIssues?.heroNotTop) pushUnique(changes, "Move hero near top");
  if (review.layoutIssues?.footerNotLast) pushUnique(changes, "Move footer to bottom");
  if (review.legacySections > 0) pushUnique(changes, "Convert legacy blocks into structured sections");
  if (!hasCta && intent !== "blog_article") pushUnique(changes, "Add clear CTA");
  if (!hasPricing && (intent === "saas_homepage" || intent === "marketing_landing")) {
    pushUnique(changes, "Introduce pricing section");
  }

  return changes;
}

function structuralChangesForStrategy(strategy: RedesignStrategy): string[] {
  if (strategy === "full-rebuild") {
    return ["Reconstruct page section hierarchy", "Replace legacy blocks", "Redefine content flow"];
  }
  if (strategy === "structural") {
    return ["Reorder sections", "Merge similar content", "Optimize hierarchy"];
  }
  return ["Improve micro-copy", "Adjust CTA placement", "Refine layout spacing"];
}

export function buildRedesignStrategy(review: MigrationReviewSummary): RedesignPlan {
  const intent = review.intent ?? "unknown";
  const strategy = strategyForReview(review);

  return {
    priority: priorityForReview(review),
    strategy,
    goals: goalsForIntent(intent),
    recommendedChanges: recommendedChangesForReview(review),
    structuralChanges: structuralChangesForStrategy(strategy),
  };
}

