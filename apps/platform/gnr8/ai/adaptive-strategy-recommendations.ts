import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { StrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";

export type AdaptiveStrategyRecommendationsV1 = {
  recommendationScore: number;
  recommendationLabel: "stabilize" | "optimize" | "accelerate" | "consolidate" | "restructure" | "prepare-scale";

  strategicPriorityDirection: "structure" | "semantic" | "consistency" | "automation" | "learning" | "adaptive-balance";

  strategicRecommendations: string[];
  strategicWarnings: string[];
  strategicOpportunities: string[];
  strategicFocusAreas: string[];
  summary: string;
  notes: string[];
};

export type AdaptiveStrategyRecommendationsInputV1 = {
  adaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  strategicAdaptationOrchestrator?: StrategicAdaptationOrchestratorV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;

  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;

  unresolvedRatio?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function unwrapMaybeNested(value: unknown, nestedKey: string): unknown {
  if (!isRecord(value)) return value;
  const nested = (value as any)[nestedKey] as unknown;
  if (isRecord(nested)) return nested;
  return value;
}

function clamp0to100(score: number): number {
  if (!Number.isFinite(score) || Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function normalizeScoreFrom(obj: unknown, keys: string[], nestedKey?: string): number {
  const unwrapped = nestedKey ? unwrapMaybeNested(obj, nestedKey) : obj;
  if (!isRecord(unwrapped)) return 0;
  for (const key of keys) {
    const raw = (unwrapped as any)[key] as unknown;
    if (typeof raw === "number" && Number.isFinite(raw)) return clamp0to100(raw);
  }
  return 0;
}

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function normalizeEvolutionLabel(model: unknown): StrategicEvolutionModelV1["evolutionLabel"] {
  const unwrapped = unwrapMaybeNested(model, "strategicEvolutionModel");
  if (!isRecord(unwrapped)) return "regressing";
  const raw = String((unwrapped as any).evolutionLabel ?? "").trim();
  if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  return "regressing";
}

function normalizeAdaptationTempo(orchestrator: unknown): StrategicAdaptationOrchestratorV1["adaptationTempo"] {
  const unwrapped = unwrapMaybeNested(orchestrator, "strategicAdaptationOrchestrator");
  if (!isRecord(unwrapped)) return "slow";
  const raw = String((unwrapped as any).adaptationTempo ?? "").trim();
  if (raw === "slow" || raw === "controlled" || raw === "progressive" || raw === "accelerated") return raw;
  return "slow";
}

function normalizeAdaptationPhaseRecovery(orchestrator: unknown): boolean {
  const unwrapped = unwrapMaybeNested(orchestrator, "strategicAdaptationOrchestrator");
  if (!isRecord(unwrapped)) return false;

  const labelRaw = String((unwrapped as any).adaptationLabel ?? "").trim();
  if (labelRaw === "recovery") return true;

  const phaseRaw = String((unwrapped as any).adaptationPhase ?? "").trim();
  if (phaseRaw === "recovery") return true;
  if (phaseRaw === "system-recovery") return true;

  return false;
}

function normalizeAdaptivePostureCategory(policy: unknown): "stabilizing" | "progressive" | "other" {
  const unwrapped = unwrapMaybeNested(policy, "adaptiveStrategicPolicy");
  if (!isRecord(unwrapped)) return "stabilizing";

  const policyLabelRaw = String((unwrapped as any).policyLabel ?? "").trim();
  if (policyLabelRaw === "stabilizing") return "stabilizing";

  const postureRaw = String((unwrapped as any).adaptivePosture ?? "").trim();
  if (postureRaw === "stabilize-learning") return "stabilizing";
  if (postureRaw === "hold-evolution") return "stabilizing";
  if (postureRaw === "guided-adaptation") return "progressive";
  if (postureRaw === "accelerated-adaptation") return "progressive";

  if (postureRaw === "stabilizing") return "stabilizing";
  if (postureRaw === "progressive") return "progressive";

  return "other";
}

function normalizeAdaptationHealthLabel(signals: unknown): AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] {
  const unwrapped = unwrapMaybeNested(signals, "adaptiveSchedulingSignals");
  if (!isRecord(unwrapped)) return "hold";
  const raw = String((unwrapped as any).adaptationHealthLabel ?? "").trim();
  if (raw === "ready" || raw === "watch" || raw === "hold") return raw;
  return "hold";
}

function normalizeLearningHealth(input: {
  executionLearningSignals: unknown;
}): { learningHealthScore: number; learningHealthLabel: "low" | "medium" | "high" } {
  const unwrapped = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(unwrapped)) return { learningHealthScore: 0, learningHealthLabel: "low" };

  const scoreRaw = (unwrapped as any).learningHealthScore as unknown;
  const learningHealthScore = typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? clamp0to100(scoreRaw) : 0;

  const labelRaw = String((unwrapped as any).learningHealthLabel ?? "").trim();
  if (labelRaw === "strong") return { learningHealthScore, learningHealthLabel: "high" };
  if (labelRaw === "watch") return { learningHealthScore, learningHealthLabel: "medium" };
  if (labelRaw === "fragile") return { learningHealthScore, learningHealthLabel: "low" };

  if (labelRaw === "high" || labelRaw === "medium" || labelRaw === "low") return { learningHealthScore, learningHealthLabel: labelRaw };

  return { learningHealthScore, learningHealthLabel: "low" };
}

function normalizeExecutionMemoryFlags(memory: unknown): {
  automationCandidatePresent: boolean;
  semanticWeaknessClustersHigh: boolean;
  consistencyLow: boolean;
  driftPresent: boolean;
  cooldownActive: boolean;
  unresolvedRatioHighFlag: boolean;
  executionSuccessTrend: "improving" | "stable" | "degrading" | "unknown";
} {
  const unwrapped = unwrapMaybeNested(memory, "executionMemory");
  if (!isRecord(unwrapped)) {
    return {
      automationCandidatePresent: false,
      semanticWeaknessClustersHigh: false,
      consistencyLow: true,
      driftPresent: false,
      cooldownActive: false,
      unresolvedRatioHighFlag: false,
      executionSuccessTrend: "unknown",
    };
  }

  const pressure = isRecord((unwrapped as any).executionPressureSignals) ? (unwrapped as any).executionPressureSignals : null;
  const stability = isRecord((unwrapped as any).stabilitySignals) ? (unwrapped as any).stabilitySignals : null;

  const automationCandidatePresent = typeof pressure?.automationCandidatePresent === "boolean" ? pressure.automationCandidatePresent === true : false;
  const semanticWeaknessClustersHigh = typeof pressure?.semanticWeaknessClustersHigh === "boolean" ? pressure.semanticWeaknessClustersHigh === true : false;
  const consistencyLow = typeof pressure?.consistencyLow === "boolean" ? pressure.consistencyLow === true : true;
  const unresolvedRatioHighFlag = typeof pressure?.unresolvedRatioHigh === "boolean" ? pressure.unresolvedRatioHigh === true : false;

  const driftPresent = typeof stability?.driftDetectedRecent === "boolean" ? stability.driftDetectedRecent === true : false;
  const cooldownActive = typeof stability?.cooldownActive === "boolean" ? stability.cooldownActive === true : false;

  const trendRaw = String(stability?.executionSuccessTrend ?? "").trim();
  const executionSuccessTrend: "improving" | "stable" | "degrading" | "unknown" =
    trendRaw === "improving" || trendRaw === "stable" || trendRaw === "degrading" || trendRaw === "unknown" ? trendRaw : "unknown";

  return {
    automationCandidatePresent,
    semanticWeaknessClustersHigh,
    consistencyLow,
    driftPresent,
    cooldownActive,
    unresolvedRatioHighFlag,
    executionSuccessTrend,
  };
}

function normalizeConsistencyLabel(input: {
  strategicLearningCore: unknown;
  executionMemory: unknown;
}): "high" | "medium" | "low" {
  const memFlags = normalizeExecutionMemoryFlags(input.executionMemory);
  if (memFlags.consistencyLow) return "low";

  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  if (isRecord(core)) {
    const pressure = isRecord((core as any).strategicSystemPressure) ? (core as any).strategicSystemPressure : null;
    const raw = String(pressure?.consistencyPressure ?? "").trim();
    if (raw === "high") return "low";
    if (raw === "medium") return "medium";
    if (raw === "low") return "high";
  }

  return "low";
}

function normalizeSemanticWeaknessClustersHigh(input: {
  strategicLearningCore: unknown;
  executionMemory: unknown;
}): boolean {
  const memFlags = normalizeExecutionMemoryFlags(input.executionMemory);
  if (memFlags.semanticWeaknessClustersHigh) return true;

  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  if (!isRecord(core)) return false;
  const pressure = isRecord((core as any).strategicSystemPressure) ? (core as any).strategicSystemPressure : null;
  return String(pressure?.semanticPressure ?? "").trim() === "high";
}

function normalizeDriftPresent(executionLearningSignals: unknown, executionMemory: unknown): boolean {
  const memFlags = normalizeExecutionMemoryFlags(executionMemory);
  if (memFlags.driftPresent) return true;

  const exec = unwrapMaybeNested(executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return false;
  const drift = isRecord((exec as any).driftSignals) ? (exec as any).driftSignals : null;
  return typeof drift?.replayDriftPresent === "boolean" ? drift.replayDriftPresent === true : false;
}

function normalizeCooldownPersistent(adaptiveSchedulingSignals: unknown, executionMemory: unknown): boolean {
  const memFlags = normalizeExecutionMemoryFlags(executionMemory);
  if (memFlags.cooldownActive) return true;

  const adaptive = unwrapMaybeNested(adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return false;
  const cooldown = isRecord((adaptive as any).cooldownSignals) ? (adaptive as any).cooldownSignals : null;
  const raw = String(cooldown?.cooldownStrictness ?? "").trim();
  return raw === "hold";
}

function normalizeLearningInstability(input: {
  strategicLearningCore: unknown;
  executionLearningSignals: unknown;
}): boolean {
  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  if (isRecord(core)) {
    const trajectoryRaw = String((core as any).learningTrajectory ?? "").trim();
    if (trajectoryRaw === "regressing" || trajectoryRaw === "unstable") return true;
  }

  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (isRecord(exec)) {
    const labelRaw = String((exec as any).learningHealthLabel ?? "").trim();
    if (labelRaw === "fragile") return true;
  }

  return false;
}

function normalizeUnresolvedRatio(input: AdaptiveStrategyRecommendationsInputV1): { ratio: number | null; highFlag: boolean } {
  const ratioRaw = input.unresolvedRatio;
  const ratio = typeof ratioRaw === "number" && Number.isFinite(ratioRaw) ? Math.max(0, Math.min(1, ratioRaw)) : null;
  const memFlags = normalizeExecutionMemoryFlags(input.executionMemory);
  return { ratio, highFlag: memFlags.unresolvedRatioHighFlag };
}

function labelForScore(score: number): AdaptiveStrategyRecommendationsV1["recommendationLabel"] {
  if (score <= 24) return "restructure";
  if (score <= 39) return "stabilize";
  if (score <= 59) return "consolidate";
  if (score <= 74) return "optimize";
  if (score <= 89) return "accelerate";
  return "prepare-scale";
}

function focusAreaForDirection(direction: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"]): string {
  switch (direction) {
    case "structure":
      return "Structural stabilization";
    case "semantic":
      return "Semantic refinement";
    case "consistency":
      return "Consistency normalization";
    case "automation":
      return "Automation readiness";
    case "learning":
      return "Learning stabilization";
    default:
      return "Adaptive equilibrium";
  }
}

function summaryFor(input: {
  recommendationLabel: AdaptiveStrategyRecommendationsV1["recommendationLabel"];
  strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"];
  adaptationRecovery: boolean;
}): string {
  if (input.adaptationRecovery || input.strategicPriorityDirection === "structure") {
    return "System requires structural stabilization before adaptive expansion.";
  }
  if (input.recommendationLabel === "prepare-scale") {
    return "System approaching scalable adaptive autonomy readiness.";
  }
  if (input.recommendationLabel === "accelerate") {
    return "System shows stable adaptive progression with acceleration potential.";
  }
  if (input.recommendationLabel === "optimize") {
    return "System shows stable adaptive progression with optimization potential.";
  }
  if (input.recommendationLabel === "consolidate") {
    return "System requires consolidation before acceleration.";
  }
  if (input.recommendationLabel === "stabilize") {
    return "System requires stabilization before optimization.";
  }
  return "System requires restructuring to restore adaptive stability.";
}

export function buildAdaptiveStrategyRecommendationsV1(input: AdaptiveStrategyRecommendationsInputV1): AdaptiveStrategyRecommendationsV1 {
  const policyScore = normalizeScoreFrom(input.adaptiveStrategicPolicy, ["policyScore"], "adaptiveStrategicPolicy");
  const adaptationScore = normalizeScoreFrom(input.strategicAdaptationOrchestrator, ["adaptationScore"], "strategicAdaptationOrchestrator");
  const evolutionScore = normalizeScoreFrom(input.strategicEvolutionModel, ["evolutionScore"], "strategicEvolutionModel");
  const learningScore = normalizeScoreFrom(input.strategicLearningCore, ["learningScore", "strategicLearningScore"], "strategicLearningCore");

  const evolutionLabel = normalizeEvolutionLabel(input.strategicEvolutionModel);
  const adaptivePostureCategory = normalizeAdaptivePostureCategory(input.adaptiveStrategicPolicy);
  const adaptationRecovery = normalizeAdaptationPhaseRecovery(input.strategicAdaptationOrchestrator);
  const adaptationTempo = normalizeAdaptationTempo(input.strategicAdaptationOrchestrator);

  const memFlags = normalizeExecutionMemoryFlags(input.executionMemory);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input.adaptiveSchedulingSignals);
  const { learningHealthScore, learningHealthLabel } = normalizeLearningHealth({ executionLearningSignals: input.executionLearningSignals });

  const semanticWeaknessClustersHigh = normalizeSemanticWeaknessClustersHigh({
    strategicLearningCore: input.strategicLearningCore,
    executionMemory: input.executionMemory,
  });
  const consistencyLabel = normalizeConsistencyLabel({ strategicLearningCore: input.strategicLearningCore, executionMemory: input.executionMemory });

  const baseScore = (policyScore + adaptationScore + evolutionScore + learningScore) / 4;

  let score = baseScore;
  if (evolutionLabel === "regressing") score -= 20;
  if (evolutionLabel === "unstable") score -= 12;
  if (adaptivePostureCategory === "stabilizing") score -= 10;
  if (adaptationRecovery) score -= 12;
  if (adaptationTempo === "slow") score -= 6;
  if (adaptationTempo === "accelerated") score += 6;
  if (memFlags.automationCandidatePresent) score += 8;
  if (adaptationHealthLabel === "ready") score += 6;
  if (learningHealthLabel === "high") score += 6;
  if (consistencyLabel === "low") score -= 10;
  if (semanticWeaknessClustersHigh) score -= 8;

  const recommendationScore = clamp0to100(score);
  const recommendationLabel = labelForScore(recommendationScore);

  let strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] = "adaptive-balance";
  if (adaptationRecovery) strategicPriorityDirection = "structure";
  else if (semanticWeaknessClustersHigh) strategicPriorityDirection = "semantic";
  else if (consistencyLabel !== "high") strategicPriorityDirection = "consistency";
  else if (adaptivePostureCategory === "progressive") strategicPriorityDirection = "automation";
  else if (learningHealthScore < 50) strategicPriorityDirection = "learning";
  else strategicPriorityDirection = "adaptive-balance";

  const strategicRecommendations: string[] = [];
  if (strategicPriorityDirection === "structure") addUniqueLimited(strategicRecommendations, "Stabilize structural baseline before scaling.", 6);
  if (strategicPriorityDirection === "semantic") addUniqueLimited(strategicRecommendations, "Resolve recurring semantic weakness clusters.", 6);
  if (strategicPriorityDirection === "consistency") addUniqueLimited(strategicRecommendations, "Normalize cross-page semantic consistency.", 6);
  if (strategicPriorityDirection === "automation") addUniqueLimited(strategicRecommendations, "Expand safe automation surface gradually.", 6);
  if (strategicPriorityDirection === "learning") addUniqueLimited(strategicRecommendations, "Strengthen execution learning stability.", 6);
  if (strategicPriorityDirection === "adaptive-balance") addUniqueLimited(strategicRecommendations, "Maintain balanced adaptation across structure, semantics, and learning.", 6);

  if (adaptationTempo === "slow") addUniqueLimited(strategicRecommendations, "Increase adaptive iteration frequency cautiously.", 6);
  if (adaptationTempo === "accelerated") addUniqueLimited(strategicRecommendations, "Maintain adaptive acceleration under safety constraints.", 6);
  if (evolutionLabel === "accelerating") addUniqueLimited(strategicRecommendations, "Prepare system for scalable adaptive autonomy.", 6);

  const strategicWarnings: string[] = [];
  if (evolutionLabel === "regressing") addUniqueLimited(strategicWarnings, "Evolution appears regressing; prioritize stabilization over expansion.", 6);
  if (consistencyLabel === "low") addUniqueLimited(strategicWarnings, "Consistency signals are low; avoid aggressive scaling until normalized.", 6);
  if (normalizeDriftPresent(input.executionLearningSignals, input.executionMemory))
    addUniqueLimited(strategicWarnings, "Drift signals present; tighten determinism and replay safeguards.", 6);
  if (normalizeCooldownPersistent(input.adaptiveSchedulingSignals, input.executionMemory))
    addUniqueLimited(strategicWarnings, "Cooldown signals persist; keep iteration cadence controlled.", 6);

  const unresolved = normalizeUnresolvedRatio(input);
  if ((unresolved.ratio !== null && unresolved.ratio > 0.3) || (unresolved.ratio === null && unresolved.highFlag))
    addUniqueLimited(strategicWarnings, "Unresolved work remains high; resolve blockers before scaling.", 6);

  if (normalizeLearningInstability({ strategicLearningCore: input.strategicLearningCore, executionLearningSignals: input.executionLearningSignals }))
    addUniqueLimited(strategicWarnings, "Learning stability is fragile; reduce variance and improve signal quality.", 6);

  const strategicOpportunities: string[] = [];
  if (memFlags.automationCandidatePresent) addUniqueLimited(strategicOpportunities, "Automation candidate surface identified; expand safely with constraints.", 6);
  if (adaptationHealthLabel === "ready") addUniqueLimited(strategicOpportunities, "Adaptation health is ready; pursue controlled acceleration.", 6);
  if (learningHealthLabel === "high") addUniqueLimited(strategicOpportunities, "Learning health is high; use signals to optimize adaptation quality.", 6);
  if (consistencyLabel === "high") addUniqueLimited(strategicOpportunities, "Consistency is high; broaden semantic scope confidently.", 6);
  if (evolutionLabel === "accelerating") addUniqueLimited(strategicOpportunities, "Evolution is accelerating; prepare scalable autonomy pathways.", 6);

  const inferredWeakClustersDecreasing = memFlags.executionSuccessTrend === "improving" && !semanticWeaknessClustersHigh && evolutionLabel !== "regressing";
  if (inferredWeakClustersDecreasing) addUniqueLimited(strategicOpportunities, "Semantic weakness pressure appears decreasing; reinforce gains and expand coverage.", 6);

  const strategicFocusAreas: string[] = [];
  addUniqueLimited(strategicFocusAreas, focusAreaForDirection(strategicPriorityDirection), 5);
  if (adaptationRecovery) addUniqueLimited(strategicFocusAreas, "Structural stabilization", 5);
  if (semanticWeaknessClustersHigh) addUniqueLimited(strategicFocusAreas, "Semantic refinement", 5);
  if (consistencyLabel !== "high") addUniqueLimited(strategicFocusAreas, "Consistency normalization", 5);
  if (memFlags.automationCandidatePresent) addUniqueLimited(strategicFocusAreas, "Automation readiness", 5);
  if (learningHealthScore < 50) addUniqueLimited(strategicFocusAreas, "Learning stabilization", 5);

  const summary = summaryFor({ recommendationLabel, strategicPriorityDirection, adaptationRecovery });

  const notes: string[] = [];
  addUniqueLimited(
    notes,
    "Adaptive strategy recommendations are interpretive only and do not alter execution behavior.",
    6,
  );

  const missingSignals: string[] = [];
  if (!isRecord(unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy"))) missingSignals.push("adaptiveStrategicPolicy");
  if (!isRecord(unwrapMaybeNested(input.strategicAdaptationOrchestrator, "strategicAdaptationOrchestrator"))) missingSignals.push("strategicAdaptationOrchestrator");
  if (!isRecord(unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel"))) missingSignals.push("strategicEvolutionModel");
  if (!isRecord(unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore"))) missingSignals.push("strategicLearningCore");
  if (missingSignals.length) addUniqueLimited(notes, `Signal gaps: missing ${missingSignals.join(", ")}; missing scores default to 0.`, 6);

  if (!isRecord(unwrapMaybeNested(input.executionMemory, "executionMemory")))
    addUniqueLimited(notes, "Execution memory not provided; automation/consistency/weakness flags fall back conservatively.", 6);
  if (!isRecord(unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals")))
    addUniqueLimited(notes, "Execution learning signals not provided; learning health defaults to low.", 6);
  if (!isRecord(unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals")))
    addUniqueLimited(notes, "Adaptive scheduling signals not provided; adaptation health defaults to hold.", 6);

  if (unresolved.ratio === null && unresolved.highFlag)
    addUniqueLimited(notes, "Unresolved ratio warning inferred from execution memory unresolvedRatioHigh flag.", 6);

  if (inferredWeakClustersDecreasing)
    addUniqueLimited(notes, "Weak-cluster improvement opportunity inferred from improving execution trend and absence of high-cluster flags.", 6);

  return {
    recommendationScore,
    recommendationLabel,
    strategicPriorityDirection,
    strategicRecommendations,
    strategicWarnings,
    strategicOpportunities,
    strategicFocusAreas,
    summary,
    notes,
  };
}

