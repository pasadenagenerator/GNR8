import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { StrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import type { Gnr8Page } from "@/gnr8/types/page";

export type MixedWaveExecutionDesignReadinessLabel = "not-designed" | "semantic-only" | "mixed-design-ready";

export type MixedWaveExecutionStructuralActionClass =
  | "cleanup"
  | "merge"
  | "normalize"
  | "reorder"
  | "add-section"
  | "replace-section"
  | "redesign"
  | "content-improvement";

export type MixedWaveExecutionRolloutPhase = "never" | "future-phase-1" | "future-phase-2" | "future-phase-3";

export type MixedWaveExecutionStructuralActionClassDesign = {
  actionClass: MixedWaveExecutionStructuralActionClass;
  allowedInMixedWaves: boolean;
  rolloutPhase: MixedWaveExecutionRolloutPhase;
  rationale: string[];
};

export type MixedWaveExecutionDesign = {
  readinessLabel: MixedWaveExecutionDesignReadinessLabel;

  structuralActionClasses: MixedWaveExecutionStructuralActionClassDesign[];

  mixedWaveRules: {
    allowedStructuralClasses: string[];
    blockedStructuralClasses: string[];
    semanticClassesAlwaysAllowed: string[];
    requiresHumanApprovalByDefault: boolean;
    mixedExecutionStrategy: "semantic-first" | "structural-first" | "phase-separated";
  };

  futureWaveShape: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
  };

  blockers: string[];
  opportunities: string[];
  summary: string;
  notes: string[];
};

type StructuralInstabilityLabel = "low" | "medium" | "high";

function clamp0to100(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function anyTruthyRecordValue(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (v === true) return true;
  }
  return false;
}

function structuralInstabilityLabelForScore(score: number): StructuralInstabilityLabel {
  if (score >= 75) return "low";
  if (score >= 50) return "medium";
  return "high";
}

function computeStructuralInstabilityLabel(resolvedPages: Array<{ slug: string; page: Gnr8Page }>): StructuralInstabilityLabel {
  const total = resolvedPages.length;
  if (total === 0) return "high";

  let unstablePages = 0;
  let legacyPages = 0;
  let lowConfidencePages = 0;

  for (const p of resolvedPages) {
    const review = buildMigrationReviewSummary(p.page);

    const legacy = (review.legacySections ?? 0) > 0 || (review.structuredSections ?? 0) < 2;
    const layoutIssues = anyTruthyRecordValue(review.layoutIssues);
    const duplicates = (review.duplicateDetails ?? []).some((d) => d?.similarity === "exact-duplicate" || d?.similarity === "highly-similar");
    const lowConfidence = (review.confidenceLabel ?? "low") === "low";

    const instabilityPoints =
      (legacy ? 2 : 0) + (layoutIssues ? 1 : 0) + (duplicates ? 1 : 0) + (lowConfidence ? 2 : 0);

    if (legacy) legacyPages += 1;
    if (lowConfidence) lowConfidencePages += 1;
    if (instabilityPoints >= 2) unstablePages += 1;
  }

  const unstableRatio = unstablePages / total;
  const legacyRatio = legacyPages / total;
  const lowConfidenceRatio = lowConfidencePages / total;

  const score = clamp0to100(100 - unstableRatio * 60 - legacyRatio * 25 - lowConfidenceRatio * 25);
  return structuralInstabilityLabelForScore(score);
}

function buildStructuralActionClasses(): MixedWaveExecutionStructuralActionClassDesign[] {
  const classes: MixedWaveExecutionStructuralActionClassDesign[] = [
    {
      actionClass: "cleanup",
      allowedInMixedWaves: true,
      rolloutPhase: "future-phase-1",
      rationale: [
        "Cleanup actions are already deterministic and low-risk.",
        "Safe duplicate removal fits early mixed-wave rollout.",
      ],
    },
    {
      actionClass: "merge",
      allowedInMixedWaves: true,
      rolloutPhase: "future-phase-1",
      rationale: [
        "Supported merges are deterministic and bounded.",
        "Merge actions are suitable before larger structural changes.",
      ],
    },
    {
      actionClass: "normalize",
      allowedInMixedWaves: true,
      rolloutPhase: "future-phase-1",
      rationale: [
        "Normalization improves structure without inventing new content.",
        "Normalization fits early mixed-wave stabilization.",
      ],
    },
    {
      actionClass: "reorder",
      allowedInMixedWaves: true,
      rolloutPhase: "future-phase-2",
      rationale: [
        "Reorder actions affect layout structure and should follow early stabilization.",
        "Reordering should be phased after low-risk structural cleanup.",
      ],
    },
    {
      actionClass: "add-section",
      allowedInMixedWaves: true,
      rolloutPhase: "future-phase-2",
      rationale: [
        "Section insertion changes structure and should remain approval-gated.",
        "Add-section actions belong in a later rollout phase.",
      ],
    },
    {
      actionClass: "replace-section",
      allowedInMixedWaves: true,
      rolloutPhase: "future-phase-3",
      rationale: [
        "Replace-section actions are higher risk and should be delayed.",
        "Replacement should follow proven mixed-wave safety.",
      ],
    },
    {
      actionClass: "redesign",
      allowedInMixedWaves: false,
      rolloutPhase: "never",
      rationale: [
        "Redesign remains too open-ended for mixed-wave execution.",
        "Strategic redesign should remain advisory only.",
      ],
    },
    {
      actionClass: "content-improvement",
      allowedInMixedWaves: true,
      rolloutPhase: "future-phase-1",
      rationale: [
        "Semantic content-improvement is already bounded and deterministic.",
        "Semantic execution remains the baseline mixed-wave action class.",
      ],
    },
  ];

  return classes;
}

function buildFutureWaveShape(): MixedWaveExecutionDesign["futureWaveShape"] {
  return {
    phase1: ["content-improvement", "cleanup", "merge", "normalize"],
    phase2: ["reorder", "add-section"],
    phase3: ["replace-section"],
  };
}

function buildMixedWaveRules(structuralActionClasses: MixedWaveExecutionStructuralActionClassDesign[]): MixedWaveExecutionDesign["mixedWaveRules"] {
  const allowedStructuralClasses = structuralActionClasses
    .filter((c) => c.actionClass !== "content-improvement" && c.allowedInMixedWaves)
    .map((c) => c.actionClass);

  const blockedStructuralClasses = structuralActionClasses
    .filter((c) => c.actionClass !== "content-improvement" && !c.allowedInMixedWaves)
    .map((c) => c.actionClass);

  return {
    allowedStructuralClasses,
    blockedStructuralClasses,
    semanticClassesAlwaysAllowed: ["content-improvement"],
    requiresHumanApprovalByDefault: true,
    mixedExecutionStrategy: "phase-separated",
  };
}

function buildDesignBlockers(input: { unresolvedPages: string[] }): string[] {
  const blockers: string[] = [];

  blockers.push("Mixed structural execution is not enabled in the current runtime.");
  if ((input.unresolvedPages?.length ?? 0) > 0) blockers.push("Unresolved pages limit mixed-wave design confidence.");
  blockers.push("Replace-section actions remain too risky for early rollout.");
  blockers.push("Redesign actions remain advisory only.");
  blockers.push("Section insertion still requires stricter phased control.");

  return blockers.slice(0, 6);
}

function buildDesignOpportunities(): string[] {
  const opportunities: string[] = [];

  opportunities.push("Semantic-only execution provides a stable baseline for mixed rollout.");
  opportunities.push("Cleanup and normalization are good candidates for early mixed phases.");
  opportunities.push("Bounded merges can expand mixed-wave capability safely.");
  opportunities.push("Phase-separated rollout can reduce structural execution risk.");
  opportunities.push("Approval-first governance supports gradual mixed execution.");

  return opportunities.slice(0, 6);
}

function buildSummary(input: {
  readinessLabel: MixedWaveExecutionDesignReadinessLabel;
  mixedExecutionStrategy: MixedWaveExecutionDesign["mixedWaveRules"]["mixedExecutionStrategy"];
  blockers: string[];
  opportunities: string[];
}): string {
  const strategy = input.mixedExecutionStrategy === "phase-separated" ? "phase-separated" : input.mixedExecutionStrategy;

  if (input.readinessLabel === "semantic-only") {
    return `Mixed wave execution is not enabled yet; semantic-only execution remains the current safe mode (${strategy}).`;
  }
  if (input.readinessLabel === "mixed-design-ready") {
    return `Mixed wave execution design is ready, but rollout should remain phased and approval-first (${strategy}).`;
  }

  const visibilityHint = input.blockers.some((b) => b.includes("Unresolved pages")) ? " due to incomplete site visibility" : "";
  return `Mixed wave execution design is not reliable yet${visibilityHint} (${strategy}).`;
}

function buildNotes(input: {
  readinessLabel: MixedWaveExecutionDesignReadinessLabel;
  unresolvedPages: string[];
  requiresHumanApprovalByDefault: boolean;
}): string[] {
  const notes: string[] = [];

  notes.push("Mixed wave execution design only; no changes are applied.");
  if ((input.unresolvedPages?.length ?? 0) > 0) notes.push(`Unresolved pages: ${input.unresolvedPages.length}.`);
  if (input.readinessLabel === "semantic-only") notes.push("Runtime remains semantic-only; mixed structural execution is not enabled.");
  notes.push("Phased rollout design: phase1 → phase2 → phase3.");
  if (input.requiresHumanApprovalByDefault) notes.push("Approval-first by default: mixed execution requires human approval.");

  return notes.slice(0, 5);
}

function getMixedWaveReadinessLabel(input: {
  totalInputPages: number;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  strategicSemanticReasoning: StrategicSemanticReasoning;
  eligibleStructuralClasses: MixedWaveExecutionStructuralActionClassDesign[];
}): MixedWaveExecutionDesignReadinessLabel {
  const resolvedCount = input.resolvedPages.length;
  if (resolvedCount === 0) return "not-designed";

  const unresolvedCount = input.unresolvedPages.length;
  const total = input.totalInputPages > 0 ? input.totalInputPages : resolvedCount + unresolvedCount;
  const unresolvedRatio = total > 0 ? unresolvedCount / total : 0;

  if (unresolvedRatio > 0.5) return "not-designed";

  const semanticReadyByReadinessLabel =
    input.strategicSemanticExecutionReadiness?.label === "phase-ready" ||
    input.strategicSemanticExecutionReadiness?.label === "execution-ready";

  const semanticReadyByReasoningLabel =
    input.strategicSemanticReasoning?.strategicReadiness?.label === "medium" ||
    input.strategicSemanticReasoning?.strategicReadiness?.label === "high";

  const structuralInstabilityLabel = computeStructuralInstabilityLabel(input.resolvedPages);
  const lowStructuralInstability = structuralInstabilityLabel === "low";

  const eligibleNonSemanticStructuralClasses = input.eligibleStructuralClasses.filter(
    (c) => c.actionClass !== "content-improvement" && c.allowedInMixedWaves && c.rolloutPhase !== "never",
  );

  if ((semanticReadyByReadinessLabel || semanticReadyByReasoningLabel) && lowStructuralInstability && eligibleNonSemanticStructuralClasses.length > 0) {
    return "mixed-design-ready";
  }

  return "semantic-only";
}

export function buildMixedWaveExecutionDesign(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  strategicSemanticReasoning: StrategicSemanticReasoning;
}): { mixedWaveExecutionDesign: MixedWaveExecutionDesign } {
  const structuralActionClasses = buildStructuralActionClasses();
  const mixedWaveRules = buildMixedWaveRules(structuralActionClasses);
  const futureWaveShape = buildFutureWaveShape();

  const readinessLabel = getMixedWaveReadinessLabel({
    totalInputPages: Array.isArray(input.pages) ? input.pages.length : 0,
    resolvedPages: input.resolvedPages ?? [],
    unresolvedPages: input.unresolvedPages ?? [],
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    strategicSemanticReasoning: input.strategicSemanticReasoning,
    eligibleStructuralClasses: structuralActionClasses,
  });

  const blockers = buildDesignBlockers({ unresolvedPages: input.unresolvedPages ?? [] });
  const opportunities = buildDesignOpportunities();
  const summary = buildSummary({
    readinessLabel,
    mixedExecutionStrategy: mixedWaveRules.mixedExecutionStrategy,
    blockers,
    opportunities,
  });
  const notes = buildNotes({
    readinessLabel,
    unresolvedPages: input.unresolvedPages ?? [],
    requiresHumanApprovalByDefault: mixedWaveRules.requiresHumanApprovalByDefault,
  });

  return {
    mixedWaveExecutionDesign: {
      readinessLabel,
      structuralActionClasses,
      mixedWaveRules,
      futureWaveShape,
      blockers,
      opportunities,
      summary,
      notes,
    },
  };
}

