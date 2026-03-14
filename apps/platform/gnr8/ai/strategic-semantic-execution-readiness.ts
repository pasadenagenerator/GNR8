import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import type { StrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import type { Gnr8Page } from "@/gnr8/types/page";

export type StrategicSemanticExecutionReadinessLabel = "not-ready" | "phase-ready" | "execution-ready";
export type StrategicSemanticExecutionMode = "blocked" | "phased" | "full";

export type StrategicSemanticExecutionReadiness = {
  score: number;
  label: StrategicSemanticExecutionReadinessLabel;
  executionMode: StrategicSemanticExecutionMode;
  blockers: string[];
  risks: string[];
  readinessSignals: string[];
  summary: string;
  notes: string[];
};

type PlanReadinessMode = "foundation" | "structure-first" | "optimization" | "other";

function clamp0to100(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function readinessLabelForScore(score: number): StrategicSemanticExecutionReadinessLabel {
  if (score <= 39) return "not-ready";
  if (score <= 74) return "phase-ready";
  return "execution-ready";
}

function inferPlanReadinessMode(input: {
  strategicSemanticPlan: StrategicSemanticPlan;
  strategicSemanticReasoning: StrategicSemanticReasoning;
}): PlanReadinessMode {
  const planMode = input.strategicSemanticPlan?.planMode ?? "stabilize";
  const focusArea = input.strategicSemanticPlan?.focusArea ?? "semantic-content";
  const strategyType = input.strategicSemanticReasoning?.semanticStrategyType ?? "content-first";

  if (strategyType === "foundation-needed" || planMode === "stabilize" || planMode === "improve") return "foundation";
  if (strategyType === "structure-first" || focusArea === "structure") return "structure-first";
  if (
    planMode === "prepare-automation" &&
    (strategyType === "optimization-phase" || strategyType === "automation-phase")
  ) {
    return "optimization";
  }

  return "other";
}

function computeAutomationCandidateRatio(resolvedPages: Array<{ slug: string; page: Gnr8Page }>): {
  ratio: number;
  count: number;
  total: number;
} {
  const total = resolvedPages.length;
  if (total === 0) return { ratio: 0, count: 0, total };

  let count = 0;
  for (const p of resolvedPages) {
    const review = buildMigrationReviewSummary(p.page);
    const label = review.semanticAutomationReadiness?.label ?? "not-ready";
    if (label === "automation-candidate") count += 1;
  }

  return { ratio: count / total, count, total };
}

export function buildStrategicSemanticExecutionReadiness(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticReasoning: StrategicSemanticReasoning;
  strategicSemanticPlan: StrategicSemanticPlan;
}): StrategicSemanticExecutionReadiness {
  const resolvedCount = Array.isArray(input.resolvedPages) ? input.resolvedPages.length : 0;
  const totalInputs = Array.isArray(input.pages) ? input.pages.length : resolvedCount;
  const unresolvedCount = Array.isArray(input.unresolvedPages) ? input.unresolvedPages.length : 0;

  const semanticHealthScore = input.siteSemanticIntelligence?.semanticHealthScore ?? 0;
  const consistencyLabel = input.siteSemanticConsistency?.consistencyLabel ?? "low";

  const bottleneckPages = input.siteSemanticIntelligence?.semanticBottleneckPages ?? [];
  const bottleneckRatio = resolvedCount > 0 ? bottleneckPages.length / resolvedCount : 0;

  const weaknessClusters = input.siteSemanticIntelligence?.semanticWeaknessClusters ?? [];
  const weaknessClustersCount = weaknessClusters.length;

  const unresolvedRatio = totalInputs > 0 ? unresolvedCount / totalInputs : 0;

  const automationCandidate = computeAutomationCandidateRatio(input.resolvedPages ?? []);
  const automationCandidateRatio = automationCandidate.ratio;

  const planReadinessMode = inferPlanReadinessMode({
    strategicSemanticPlan: input.strategicSemanticPlan,
    strategicSemanticReasoning: input.strategicSemanticReasoning,
  });

  const baseScore = input.strategicSemanticReasoning?.strategicReadiness?.score ?? 0;
  let score = baseScore;

  const appliedPenalties: string[] = [];
  const appliedBoosts: string[] = [];

  if (semanticHealthScore < 40) {
    score -= 25;
    appliedPenalties.push("semanticHealthScore<40 (-25)");
  }
  if (consistencyLabel === "low") {
    score -= 20;
    appliedPenalties.push("consistencyLabel=low (-20)");
  }
  if (bottleneckRatio > 0.3) {
    score -= 15;
    appliedPenalties.push("bottleneckPagesRatio>0.3 (-15)");
  }
  if (weaknessClustersCount >= 3) {
    score -= 10;
    appliedPenalties.push("weaknessClusters>=3 (-10)");
  }
  if (unresolvedRatio > 0.25) {
    score -= 10;
    appliedPenalties.push("unresolvedPagesRatio>0.25 (-10)");
  }
  if (planReadinessMode === "foundation") {
    score -= 20;
    appliedPenalties.push("planning.planMode=foundation (-20)");
  }
  if (planReadinessMode === "structure-first") {
    score -= 10;
    appliedPenalties.push("planning.planMode=structure-first (-10)");
  }

  if (semanticHealthScore >= 80) {
    score += 10;
    appliedBoosts.push("semanticHealthScore>=80 (+10)");
  }
  if (consistencyLabel === "high") {
    score += 10;
    appliedBoosts.push("consistencyLabel=high (+10)");
  }
  if (automationCandidateRatio >= 0.5) {
    score += 10;
    appliedBoosts.push("automationCandidatePagesRatio>=0.5 (+10)");
  }

  score = clamp0to100(score);
  const label = readinessLabelForScore(score);

  const blockedByRules = label === "not-ready" || planReadinessMode === "foundation" || semanticHealthScore < 40;
  const fullByRules =
    label === "execution-ready" &&
    consistencyLabel === "high" &&
    semanticHealthScore >= 75 &&
    planReadinessMode === "optimization";
  const phasedByRules =
    label === "phase-ready" || consistencyLabel === "medium" || bottleneckRatio > 0.15 || (label === "execution-ready" && !fullByRules);

  const executionMode: StrategicSemanticExecutionMode = blockedByRules ? "blocked" : fullByRules ? "full" : phasedByRules ? "phased" : "phased";

  const blockers: string[] = [];
  if (semanticHealthScore < 40) addUniqueLimited(blockers, "Site semantic baseline is too weak.", 5);
  if (consistencyLabel === "low") addUniqueLimited(blockers, "Cross-page semantic consistency is insufficient.", 5);
  if (bottleneckRatio > 0.3) addUniqueLimited(blockers, "Too many semantic bottleneck pages.", 5);
  if (planReadinessMode === "foundation") addUniqueLimited(blockers, "Strategic plan indicates foundational restructuring.", 5);
  if (unresolvedRatio > 0.25) addUniqueLimited(blockers, "Semantic coverage across pages is insufficient.", 5);

  const risks: string[] = [];
  if (resolvedCount > 0 && automationCandidateRatio > 0 && automationCandidateRatio < 0.5) {
    addUniqueLimited(risks, "Semantic automation readiness is uneven across pages.", 5);
  }
  if (weaknessClustersCount >= 3) {
    addUniqueLimited(risks, "Semantic weaknesses are clustered across multiple areas.", 5);
  }
  if (consistencyLabel !== "high" || planReadinessMode === "structure-first") {
    addUniqueLimited(risks, "Site structure may not support large-scale semantic execution.", 5);
  }
  if (consistencyLabel !== "high") {
    addUniqueLimited(risks, "Execution plan may create inconsistent messaging.", 5);
  }

  const readinessSignals: string[] = [];
  if (semanticHealthScore >= 80) addUniqueLimited(readinessSignals, "Semantic baseline is strong.", 5);
  if (consistencyLabel === "high") addUniqueLimited(readinessSignals, "Consistency across pages is high.", 5);
  if (planReadinessMode === "optimization") addUniqueLimited(readinessSignals, "Strategic plan is optimization-oriented.", 5);
  if (automationCandidateRatio >= 0.5) addUniqueLimited(readinessSignals, "Automation candidate pages are dominant.", 5);
  if (resolvedCount > 0 && bottleneckRatio <= 0.15) {
    addUniqueLimited(readinessSignals, "Semantic bottlenecks are minimal.", 5);
  }

  const summary =
    executionMode === "blocked"
      ? "Site is not ready for strategic semantic execution."
      : executionMode === "phased"
        ? "Site is partially ready; phased execution is recommended."
        : "Site is ready for full strategic semantic execution.";

  const notes: string[] = [];
  notes.push("Strategic semantic execution readiness only; no changes are applied.");
  notes.push(
    `Readiness score: start=${clamp0to100(baseScore)}; penalties=${appliedPenalties.length ? appliedPenalties.join(", ") : "none"}; boosts=${appliedBoosts.length ? appliedBoosts.join(", ") : "none"}; final=${score}.`,
  );

  const modeReasons: string[] = [];
  if (executionMode === "blocked") {
    if (label === "not-ready") modeReasons.push("label=not-ready");
    if (planReadinessMode === "foundation") modeReasons.push("planning.planMode=foundation");
    if (semanticHealthScore < 40) modeReasons.push("semanticHealthScore<40");
  } else if (executionMode === "phased") {
    if (label === "phase-ready") modeReasons.push("label=phase-ready");
    if (consistencyLabel === "medium") modeReasons.push("consistencyLabel=medium");
    if (bottleneckRatio > 0.15) modeReasons.push("bottleneckPagesRatio>0.15");
    if (label === "execution-ready" && !fullByRules) modeReasons.push("full-execution preconditions unmet");
  } else {
    modeReasons.push("label=execution-ready");
    modeReasons.push("consistencyLabel=high");
    modeReasons.push("semanticHealthScore>=75");
    modeReasons.push("planning.planMode=optimization");
  }

  notes.push(`Execution mode: ${executionMode}; reasons=${modeReasons.join(", ") || "n/a"}.`);
  notes.push(`Diagnostics: bottleneckPagesRatio=${Math.round(bottleneckRatio * 100)}%; unresolvedPagesRatio=${Math.round(unresolvedRatio * 100)}%; automationCandidatePagesRatio=${Math.round(automationCandidateRatio * 100)}%.`);
  notes.push(`Planning mode mapping: inferred=${planReadinessMode} (source planMode=${input.strategicSemanticPlan.planMode}, strategyType=${input.strategicSemanticReasoning.semanticStrategyType}).`);

  return {
    score,
    label,
    executionMode,
    blockers: blockers.slice(0, 5),
    risks: risks.slice(0, 5),
    readinessSignals: readinessSignals.slice(0, 5),
    summary,
    notes: notes.slice(0, 5),
  };
}

