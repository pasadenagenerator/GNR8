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

function isIntentClear(review: MigrationReviewSummary): boolean {
  const intent = review.intent ?? "unknown";
  const intentConfidence = review.intentConfidence ?? 0;
  return intent !== "unknown" && intentConfidence >= 70;
}

function isStructurallyHealthy(review: MigrationReviewSummary): boolean {
  const layoutIssueCount = countLayoutIssues(review.layoutIssues);
  const hasDupes = hasDuplicateDetails(review.duplicateDetails);

  return (
    review.confidenceScore >= 80 &&
    review.legacySections === 0 &&
    layoutIssueCount === 0 &&
    !hasDupes &&
    isIntentClear(review)
  );
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

  const intent = review.intent ?? "unknown";
  const intentConfidence = review.intentConfidence ?? 0;
  const hasDupes = hasDuplicateDetails(review.duplicateDetails);
  const complexDupes = hasComplexDuplicates(review.duplicateDetails);

  // Clean + high confidence + clear intent => low urgency (incremental tune-ups only).
  if (isStructurallyHealthy(review)) return "low";

  const severeByConfidence = review.confidenceScore < 50;
  const severeByLegacy = review.legacySections >= 2 || review.legacySections > review.structuredSections;
  const severeByLayout = layoutIssueCount >= 3;
  const severeByDupes = complexDupes && (review.confidenceScore < 80 || layoutIssueCount > 0 || review.legacySections > 0);
  const severeByIntent = intent === "unknown" && intentConfidence < 60;

  if (severeByConfidence || severeByLegacy || severeByLayout || severeByDupes || severeByIntent) return "high";

  const mediumByConfidence = review.confidenceScore < 80;
  const mediumByLegacy = review.legacySections === 1;
  const mediumByLayout = layoutIssueCount >= 1;
  const mediumByDupes = hasDupes;
  const mediumByIntent = intent === "unknown" || intentConfidence < 70;

  if (mediumByConfidence || mediumByLegacy || mediumByLayout || mediumByDupes || mediumByIntent) return "medium";

  // High migration confidence but with minor imperfections (e.g. one layout flag) should not be "high".
  return "medium";
}

function strategyForReview(review: MigrationReviewSummary): RedesignStrategy {
  const layoutIssueCount = countLayoutIssues(review.layoutIssues);
  const intent = review.intent ?? "unknown";
  const intentConfidence = review.intentConfidence ?? 0;
  const hasDupes = hasDuplicateDetails(review.duplicateDetails);

  const fullRebuild =
    review.confidenceScore < 45 ||
    (review.legacySections > review.structuredSections && review.legacySections >= 2) ||
    layoutIssueCount >= 4 ||
    (intent === "unknown" && review.confidenceScore < 70 && review.legacySections > 0);

  if (fullRebuild) return "full-rebuild";

  const incremental =
    isStructurallyHealthy(review) ||
    (review.confidenceScore >= 85 &&
      review.legacySections === 0 &&
      layoutIssueCount <= 1 &&
      !hasDupes &&
      intent !== "unknown" &&
      intentConfidence >= 70);

  if (incremental) return "incremental";

  const structural =
    (review.confidenceScore >= 45 && review.confidenceScore < 85) ||
    hasComplexDuplicates(review.duplicateDetails) ||
    (intent === "unknown" && intentConfidence < 70) ||
    (review.legacySections > 0 && review.legacySections <= review.structuredSections) ||
    layoutIssueCount >= 1;

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
