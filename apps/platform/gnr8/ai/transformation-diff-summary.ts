import type { MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import type { Gnr8Page } from "@/gnr8/types/page";

export type TransformationDiffSummary = {
  changed: boolean;
  summary: string;
  changes: string[];
  metrics: {
    sectionsBefore: number;
    sectionsAfter: number;
    structuredBefore: number;
    structuredAfter: number;
    legacyBefore: number;
    legacyAfter: number;
    confidenceBefore: number;
    confidenceAfter: number;
  };
};

function toSafeInt(value: unknown): number {
  const n = typeof value === "number" ? value : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function getSectionTypeSignature(page: Gnr8Page): string {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections.map((s) => (typeof s?.type === "string" ? s.type : "unknown")).join("|");
}

function formatStepsApplied(count: number): string {
  return `Applied ${count} approved transformation step${count === 1 ? "" : "s"}.`;
}

export function buildTransformationDiffSummary(input: {
  pageBefore: Gnr8Page;
  pageAfter: Gnr8Page;
  reviewBefore: MigrationReviewSummary;
  reviewAfter: MigrationReviewSummary;
  appliedSteps: string[];
  skippedSteps: string[];
}): TransformationDiffSummary {
  const pageBefore = input.pageBefore;
  const pageAfter = input.pageAfter;

  const appliedSteps = Array.isArray(input.appliedSteps) ? input.appliedSteps : [];
  const skippedSteps = Array.isArray(input.skippedSteps) ? input.skippedSteps : [];

  const sectionsBefore = Array.isArray(pageBefore.sections) ? pageBefore.sections.length : 0;
  const sectionsAfter = Array.isArray(pageAfter.sections) ? pageAfter.sections.length : 0;

  const signatureBefore = getSectionTypeSignature(pageBefore);
  const signatureAfter = getSectionTypeSignature(pageAfter);

  const structuredBefore = toSafeInt(input.reviewBefore?.structuredSections);
  const structuredAfter = toSafeInt(input.reviewAfter?.structuredSections);

  const legacyBefore = toSafeInt(input.reviewBefore?.legacySections);
  const legacyAfter = toSafeInt(input.reviewAfter?.legacySections);

  const confidenceBefore = toSafeInt(input.reviewBefore?.confidenceScore);
  const confidenceAfter = toSafeInt(input.reviewAfter?.confidenceScore);

  const changed =
    appliedSteps.length > 0 ||
    sectionsBefore !== sectionsAfter ||
    signatureBefore !== signatureAfter ||
    structuredBefore !== structuredAfter ||
    legacyBefore !== legacyAfter ||
    confidenceBefore !== confidenceAfter;

  const changes: string[] = [];

  if (changed) {
    if (appliedSteps.length > 0) {
      changes.push(formatStepsApplied(appliedSteps.length));
    }

    if (signatureBefore !== signatureAfter) {
      changes.push("Section order changed.");
    }

    if (sectionsAfter < sectionsBefore) {
      changes.push(`Section count decreased from ${sectionsBefore} to ${sectionsAfter}.`);
    } else if (sectionsAfter > sectionsBefore) {
      changes.push(`Section count increased from ${sectionsBefore} to ${sectionsAfter}.`);
    }

    if (structuredAfter > structuredBefore) {
      changes.push(`Structured sections increased from ${structuredBefore} to ${structuredAfter}.`);
    } else if (structuredAfter < structuredBefore) {
      changes.push(`Structured sections decreased from ${structuredBefore} to ${structuredAfter}.`);
    }

    if (legacyAfter < legacyBefore) {
      changes.push(`Legacy sections reduced from ${legacyBefore} to ${legacyAfter}.`);
    } else if (legacyAfter > legacyBefore) {
      changes.push(`Legacy sections increased from ${legacyBefore} to ${legacyAfter}.`);
    }

    if (confidenceAfter > confidenceBefore) {
      changes.push(`Confidence score improved from ${confidenceBefore} to ${confidenceAfter}.`);
    } else if (confidenceAfter < confidenceBefore) {
      changes.push(`Confidence score dropped from ${confidenceBefore} to ${confidenceAfter}.`);
    }
  }

  const hasMeasurableImprovement =
    confidenceAfter > confidenceBefore || legacyAfter < legacyBefore || structuredAfter > structuredBefore;
  const hasMeasurableRegression =
    confidenceAfter < confidenceBefore || legacyAfter > legacyBefore || structuredAfter < structuredBefore;

  const summary = (() => {
    if (!changed) {
      if (skippedSteps.length > 0) return "No approved transformation steps changed the page.";
      return "No structural page changes were applied.";
    }

    if (hasMeasurableImprovement && !hasMeasurableRegression) {
      return "Transformation applied successfully with measurable structural improvement.";
    }

    return "Transformation applied successfully.";
  })();

  return {
    changed,
    summary,
    changes,
    metrics: {
      sectionsBefore,
      sectionsAfter,
      structuredBefore,
      structuredAfter,
      legacyBefore,
      legacyAfter,
      confidenceBefore,
      confidenceAfter,
    },
  };
}

