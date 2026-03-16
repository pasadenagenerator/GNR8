import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

export type StrategicAdaptationOrchestratorV1 = {
  adaptationScore: number;
  adaptationLabel: "recovery" | "stabilizing" | "coordinating" | "expanding" | "orchestrating";

  adaptationPhase:
    | "system-recovery"
    | "learning-stabilization"
    | "adaptive-coordination"
    | "guided-expansion"
    | "autonomy-preparation";

  adaptationDirection:
    | "reduce-instability"
    | "improve-learning-quality"
    | "tighten-adaptive-coherence"
    | "expand-semantic-adaptation"
    | "prepare-autonomy-evolution";

  adaptationTempo: "slow" | "controlled" | "progressive" | "accelerated";

  primaryAdaptiveFocus: {
    area: "semantic-quality" | "execution-stability" | "consistency" | "scheduler-pacing" | "autonomy-readiness";
    reason: string;
  };

  adaptivePriorities: Array<{
    area:
      | "semantic-quality"
      | "execution-stability"
      | "consistency"
      | "scheduler-pacing"
      | "autonomy-readiness"
      | "learning-quality";
    priority: "high" | "medium" | "low";
    rationale: string[];
  }>;

  adaptiveConstraints: string[];
  adaptiveDrivers: string[];
  adaptiveRisks: string[];
  adaptiveOpportunities: string[];

  summary: string;
  notes: string[];
};

export type StrategicAdaptationOrchestratorInputV1 = {
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  adaptiveStrategicFeedback?: AdaptiveStrategicFeedbackV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;
  strategicSemanticExecutionReadiness?: StrategicSemanticExecutionReadiness | Record<string, unknown> | null;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;
  unresolvedRatio?: number;
};

type NormalizedLearningHealth = "low" | "medium" | "high";
type NormalizedReadinessLabel = "not-ready" | "phase-ready" | "execution-ready" | "automation-candidate";

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

function normalizeRatio0to1(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function addUniqueLimitedMany(out: string[], values: string[], limit: number): void {
  for (const v of values) addUniqueLimited(out, v, limit);
}

function normalizeScoreFrom(obj: unknown, keys: string[]): number {
  if (!isRecord(obj)) return 0;
  for (const k of keys) {
    const raw = (obj as any)[k] as unknown;
    if (typeof raw === "number" && Number.isFinite(raw)) return clamp0to100(raw);
  }
  return 0;
}

function normalizeStrategicLearningScore(input: StrategicAdaptationOrchestratorInputV1): number {
  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  return normalizeScoreFrom(core, ["strategicLearningScore", "learningScore"]);
}

function normalizeEvolutionScore(input: StrategicAdaptationOrchestratorInputV1): number {
  const model = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  return normalizeScoreFrom(model, ["evolutionScore"]);
}

function normalizePolicyScore(input: StrategicAdaptationOrchestratorInputV1): number {
  const policy = unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy");
  return normalizeScoreFrom(policy, ["policyScore"]);
}

function normalizeFeedbackScore(input: StrategicAdaptationOrchestratorInputV1): number {
  const feedback = unwrapMaybeNested(input.adaptiveStrategicFeedback, "adaptiveStrategicFeedback");
  return normalizeScoreFrom(feedback, ["feedbackScore"]);
}

function normalizeAdaptationHealthScore(input: StrategicAdaptationOrchestratorInputV1): number {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  return normalizeScoreFrom(adaptive, ["adaptationHealthScore"]);
}

function normalizeReadinessScore(input: StrategicAdaptationOrchestratorInputV1): number {
  const readiness = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");
  return normalizeScoreFrom(readiness, ["score"]);
}

function normalizeEvolutionLabel(input: StrategicAdaptationOrchestratorInputV1): StrategicEvolutionModelV1["evolutionLabel"] {
  const model = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  if (!isRecord(model)) return "regressing";
  const raw = String((model as any).evolutionLabel ?? "").trim();
  if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  return "regressing";
}

function normalizePolicyLabel(input: StrategicAdaptationOrchestratorInputV1): AdaptiveStrategicPolicyV1["policyLabel"] {
  const policy = unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy");
  if (!isRecord(policy)) return "constrained";
  const raw = String((policy as any).policyLabel ?? "").trim();
  if (raw === "constrained" || raw === "stabilizing" || raw === "adaptive" || raw === "expansion-ready") return raw;
  return "constrained";
}

function normalizeFeedbackLabel(input: StrategicAdaptationOrchestratorInputV1): AdaptiveStrategicFeedbackV1["feedbackLabel"] {
  const feedback = unwrapMaybeNested(input.adaptiveStrategicFeedback, "adaptiveStrategicFeedback");
  if (!isRecord(feedback)) return "destabilized";
  const raw = String((feedback as any).feedbackLabel ?? "").trim();
  if (raw === "destabilized" || raw === "reactive" || raw === "adjusting" || raw === "adaptive" || raw === "self-optimizing") return raw;
  return "destabilized";
}

function normalizeAdaptationHealthLabel(input: StrategicAdaptationOrchestratorInputV1): AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return "hold";
  const raw = String((adaptive as any).adaptationHealthLabel ?? "").trim();
  if (raw === "ready" || raw === "watch" || raw === "hold") return raw;
  return "hold";
}

function normalizeConsistencyLabel(input: StrategicAdaptationOrchestratorInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const consistency = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(consistency)) return "low";
  const raw = String((consistency as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeMemoryHealthLabel(input: StrategicAdaptationOrchestratorInputV1): ExecutionMemoryV1["memoryHealthLabel"] {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(mem)) return "unstable";
  const raw = String((mem as any).memoryHealthLabel ?? "").trim();
  if (raw === "stable" || raw === "monitoring" || raw === "unstable") return raw;
  return "unstable";
}

function normalizeLearningHealthLabel(input: StrategicAdaptationOrchestratorInputV1): NormalizedLearningHealth {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "low";

  const raw = String((exec as any).learningHealthLabel ?? "").trim();
  if (raw === "strong") return "high";
  if (raw === "watch") return "medium";
  if (raw === "fragile") return "low";

  if (raw === "high") return "high";
  if (raw === "medium") return "medium";
  if (raw === "low") return "low";

  return "low";
}

function normalizeExecutionStability(input: StrategicAdaptationOrchestratorInputV1): ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "unstable";
  const stability = isRecord((exec as any).stabilitySignals) ? (exec as any).stabilitySignals : null;
  const raw = String(stability?.executionStability ?? "").trim();
  if (raw === "stable" || raw === "mixed" || raw === "unstable") return raw;
  return "unstable";
}

function normalizeSchedulerPressureHigh(input: StrategicAdaptationOrchestratorInputV1): boolean {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");

  let cooldownHold = false;
  let previewHigh = false;

  if (isRecord(adaptive)) {
    const cooldown = isRecord((adaptive as any).cooldownSignals) ? (adaptive as any).cooldownSignals : null;
    cooldownHold = String(cooldown?.cooldownStrictness ?? "").trim() === "hold";
    const preview = isRecord((adaptive as any).previewSignals) ? (adaptive as any).previewSignals : null;
    previewHigh = String(preview?.previewDependencyLevel ?? "").trim() === "high";
  }

  if (isRecord(exec)) {
    const pacing = isRecord((exec as any).pacingSignals) ? (exec as any).pacingSignals : null;
    if (pacing && typeof pacing.cooldownPressure === "boolean") cooldownHold = cooldownHold || pacing.cooldownPressure === true;
    if (pacing && typeof pacing.previewDependency === "boolean") previewHigh = previewHigh || pacing.previewDependency === true;
  }

  return cooldownHold || previewHigh;
}

function normalizeSemanticWeaknessClustersHigh(input: StrategicAdaptationOrchestratorInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(mem)) return false;
  const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
  if (!pressure) return false;
  return typeof pressure.semanticWeaknessClustersHigh === "boolean" ? pressure.semanticWeaknessClustersHigh === true : false;
}

function normalizeAutomationCandidatePresent(input: StrategicAdaptationOrchestratorInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(mem)) return false;
  const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
  if (!pressure) return false;
  return typeof pressure.automationCandidatePresent === "boolean" ? pressure.automationCandidatePresent === true : false;
}

function normalizeSemanticHealthLabel(input: StrategicAdaptationOrchestratorInputV1): NormalizedLearningHealth {
  const readiness = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");
  if (isRecord(readiness)) {
    const raw = String((readiness as any).label ?? "").trim();
    if (raw === "execution-ready") return "high";
    if (raw === "phase-ready") return "medium";
    if (raw === "not-ready") return "low";
  }

  const score = normalizeReadinessScore(input);
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function normalizeReadinessLabel(input: StrategicAdaptationOrchestratorInputV1): NormalizedReadinessLabel {
  const readiness = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");
  const score = normalizeReadinessScore(input);

  let base: NormalizedReadinessLabel = "not-ready";
  if (isRecord(readiness)) {
    const raw = String((readiness as any).label ?? "").trim();
    if (raw === "not-ready" || raw === "phase-ready" || raw === "execution-ready") base = raw;
  } else {
    if (score >= 75) base = "execution-ready";
    else if (score >= 40) base = "phase-ready";
  }

  const automationCandidatePresent = normalizeAutomationCandidatePresent(input);
  if (automationCandidatePresent && score >= 70 && base !== "not-ready") return "automation-candidate";
  return base;
}

function adaptationLabelForScore(score: number): StrategicAdaptationOrchestratorV1["adaptationLabel"] {
  if (score <= 19) return "recovery";
  if (score <= 39) return "stabilizing";
  if (score <= 59) return "coordinating";
  if (score <= 79) return "expanding";
  return "orchestrating";
}

function adaptationPhaseForLabel(label: StrategicAdaptationOrchestratorV1["adaptationLabel"]): StrategicAdaptationOrchestratorV1["adaptationPhase"] {
  if (label === "recovery") return "system-recovery";
  if (label === "stabilizing") return "learning-stabilization";
  if (label === "coordinating") return "adaptive-coordination";
  if (label === "expanding") return "guided-expansion";
  return "autonomy-preparation";
}

function summaryForLabel(label: StrategicAdaptationOrchestratorV1["adaptationLabel"]): string {
  if (label === "recovery") return "System adaptation should focus on recovering stability before broader evolution.";
  if (label === "stabilizing") return "System adaptation is stabilizing and should remain controlled.";
  if (label === "coordinating") return "System adaptation is coordinated enough to support structured improvement.";
  if (label === "expanding") return "System adaptation is ready for guided expansion.";
  return "System adaptation shows strong orchestration maturity and can prepare autonomy evolution.";
}

function computeBaseScore(input: StrategicAdaptationOrchestratorInputV1): number {
  const scores = [
    normalizeStrategicLearningScore(input),
    normalizeEvolutionScore(input),
    normalizePolicyScore(input),
    normalizeFeedbackScore(input),
    normalizeAdaptationHealthScore(input),
    normalizeReadinessScore(input),
  ];
  const sum = scores.reduce((a, b) => a + b, 0);
  return clamp0to100(sum / scores.length);
}

function applyDeterministicAdjustments(input: StrategicAdaptationOrchestratorInputV1, base: number): number {
  let score = base;

  const evolutionLabel = normalizeEvolutionLabel(input);
  const policyLabel = normalizePolicyLabel(input);
  const feedbackLabel = normalizeFeedbackLabel(input);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input);
  const readinessLabel = normalizeReadinessLabel(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const unresolvedRatio = normalizeRatio0to1(input.unresolvedRatio, 0);

  if (evolutionLabel === "regressing") score -= 18;
  if (evolutionLabel === "unstable") score -= 10;
  if (policyLabel === "constrained") score -= 12;
  if (feedbackLabel === "destabilized") score -= 15;
  if (adaptationHealthLabel === "hold") score -= 10;
  if (readinessLabel === "not-ready") score -= 15;
  if (consistencyLabel === "low") score -= 12;
  if (unresolvedRatio > 0.3) score -= 10;

  if (evolutionLabel === "accelerating") score += 10;
  if (policyLabel === "expansion-ready") score += 8;
  if (feedbackLabel === "self-optimizing") score += 8;
  if (adaptationHealthLabel === "ready") score += 6;
  if (readinessLabel === "execution-ready" || readinessLabel === "automation-candidate") score += 8;
  if (consistencyLabel === "high") score += 6;

  return clamp0to100(score);
}

function determineAdaptationDirection(input: StrategicAdaptationOrchestratorInputV1): StrategicAdaptationOrchestratorV1["adaptationDirection"] {
  const evolutionLabel = normalizeEvolutionLabel(input);
  const learningHealthLabel = normalizeLearningHealthLabel(input);
  const memoryHealthLabel = normalizeMemoryHealthLabel(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const readinessLabel = normalizeReadinessLabel(input);
  const semanticHealthLabel = normalizeSemanticHealthLabel(input);

  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") return "reduce-instability";

  if (learningHealthLabel === "low" || memoryHealthLabel === "unstable") return "improve-learning-quality";

  if (consistencyLabel !== "high") return "tighten-adaptive-coherence";

  if ((readinessLabel === "phase-ready" || readinessLabel === "execution-ready") && semanticHealthLabel !== "low") {
    return "expand-semantic-adaptation";
  }

  return "prepare-autonomy-evolution";
}

function determineAdaptationTempo(input: StrategicAdaptationOrchestratorInputV1, label: StrategicAdaptationOrchestratorV1["adaptationLabel"]): StrategicAdaptationOrchestratorV1["adaptationTempo"] {
  const feedbackLabel = normalizeFeedbackLabel(input);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input);
  const policyLabel = normalizePolicyLabel(input);
  const evolutionLabel = normalizeEvolutionLabel(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const unresolvedRatio = normalizeRatio0to1(input.unresolvedRatio, 0);

  const slow =
    label === "recovery" || feedbackLabel === "destabilized" || adaptationHealthLabel === "hold" || unresolvedRatio > 0.3;
  if (slow) return "slow";

  const accelerated =
    label === "orchestrating" && consistencyLabel === "high" && evolutionLabel === "accelerating" && adaptationHealthLabel === "ready";
  if (accelerated) return "accelerated";

  const controlled = label === "stabilizing" || policyLabel === "stabilizing" || feedbackLabel === "reactive";
  if (controlled) return "controlled";

  const progressive = label === "coordinating" || label === "expanding";
  if (progressive) return "progressive";

  return "controlled";
}

function determinePrimaryAdaptiveFocus(input: StrategicAdaptationOrchestratorInputV1, direction: StrategicAdaptationOrchestratorV1["adaptationDirection"]): StrategicAdaptationOrchestratorV1["primaryAdaptiveFocus"] {
  const evolutionLabel = normalizeEvolutionLabel(input);
  const feedbackLabel = normalizeFeedbackLabel(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const semanticWeaknessClustersHigh = normalizeSemanticWeaknessClustersHigh(input);
  const semanticHealthLabel = normalizeSemanticHealthLabel(input);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input);
  const schedulerPressureHigh = normalizeSchedulerPressureHigh(input);

  const readinessLabel = normalizeReadinessLabel(input);
  const policyLabel = normalizePolicyLabel(input);

  if (evolutionLabel === "regressing" || evolutionLabel === "unstable" || feedbackLabel === "destabilized") {
    return { area: "execution-stability", reason: "Instability signals require stabilizing execution before expanding adaptation." };
  }

  if (consistencyLabel !== "high") {
    return { area: "consistency", reason: "Semantic consistency is gating adaptive coherence across the site." };
  }

  if (semanticWeaknessClustersHigh || semanticHealthLabel === "low" || semanticHealthLabel === "medium") {
    return { area: "semantic-quality", reason: "Semantic quality signals indicate clustered weaknesses or insufficient baseline health." };
  }

  if (adaptationHealthLabel === "hold" || schedulerPressureHigh) {
    return { area: "scheduler-pacing", reason: "Scheduling signals indicate pacing pressure that requires conservative adaptation tempo." };
  }

  const expansionPotential =
    readinessLabel !== "not-ready" &&
    (policyLabel === "expansion-ready" || feedbackLabel === "self-optimizing" || evolutionLabel === "accelerating" || evolutionLabel === "progressing");
  if (expansionPotential) {
    return { area: "autonomy-readiness", reason: "Readiness and trajectory signals support preparing autonomy evolution under guided conditions." };
  }

  if (direction === "tighten-adaptive-coherence") {
    return { area: "consistency", reason: "Adaptive direction prioritizes tightening coherence through consistency improvements." };
  }
  if (direction === "prepare-autonomy-evolution") {
    return { area: "autonomy-readiness", reason: "Adaptive direction indicates shifting focus toward autonomy preparation." };
  }

  return { area: "semantic-quality", reason: "No dominant blocking signals detected; semantic quality is the safest leverage for improvement." };
}

function priorityForArea(input: {
  area:
    | "semantic-quality"
    | "execution-stability"
    | "consistency"
    | "scheduler-pacing"
    | "autonomy-readiness"
    | "learning-quality";
  primaryArea: StrategicAdaptationOrchestratorV1["primaryAdaptiveFocus"]["area"];
  instabilityBlocking: boolean;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  readinessLabel: NormalizedReadinessLabel;
  schedulerPressureHigh: boolean;
  learningHealthLow: boolean;
  semanticQualityConcern: boolean;
}): "high" | "medium" | "low" {
  if (input.area === input.primaryArea) return "high";

  if (input.area === "execution-stability" && input.instabilityBlocking) return "high";
  if (input.area === "consistency" && input.consistencyLabel === "low") return "high";
  if (input.area === "autonomy-readiness" && input.readinessLabel === "not-ready") return "high";
  if (input.area === "learning-quality" && input.learningHealthLow) return "high";

  if (input.area === "consistency" && input.consistencyLabel === "medium") return "medium";
  if (input.area === "scheduler-pacing" && input.schedulerPressureHigh) return "medium";
  if (input.area === "semantic-quality" && input.semanticQualityConcern) return "medium";
  if (input.area === "autonomy-readiness" && input.readinessLabel !== "not-ready") return "low";

  return "low";
}

function buildRationale(input: {
  area:
    | "semantic-quality"
    | "execution-stability"
    | "consistency"
    | "scheduler-pacing"
    | "autonomy-readiness"
    | "learning-quality";
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  feedbackLabel: AdaptiveStrategicFeedbackV1["feedbackLabel"];
  executionStability: ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"];
  schedulerPressureHigh: boolean;
  readinessLabel: NormalizedReadinessLabel;
  learningHealthLabel: NormalizedLearningHealth;
  memoryHealthLabel: ExecutionMemoryV1["memoryHealthLabel"];
  semanticWeaknessClustersHigh: boolean;
  semanticHealthLabel: NormalizedLearningHealth;
  unresolvedRatioHigh: boolean;
}): string[] {
  const rationale: string[] = [];

  if (input.area === "execution-stability") {
    if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable") addUniqueLimited(rationale, "Evolution signals indicate instability.", 3);
    if (input.feedbackLabel === "destabilized") addUniqueLimited(rationale, "Feedback loop indicates destabilization.", 3);
    if (input.executionStability === "unstable") addUniqueLimited(rationale, "Execution stability is currently unstable.", 3);
  }

  if (input.area === "consistency") {
    if (input.consistencyLabel === "low") addUniqueLimited(rationale, "Site semantic consistency is low.", 3);
    if (input.consistencyLabel === "medium") addUniqueLimited(rationale, "Site semantic consistency is medium and gating coherence.", 3);
  }

  if (input.area === "semantic-quality") {
    if (input.semanticWeaknessClustersHigh) addUniqueLimited(rationale, "Semantic weakness clusters are elevated.", 3);
    if (input.semanticHealthLabel === "low" || input.semanticHealthLabel === "medium") addUniqueLimited(rationale, "Semantic health indicates improvement is needed.", 3);
    if (input.unresolvedRatioHigh) addUniqueLimited(rationale, "High unresolved page ratio reduces semantic signal coverage.", 3);
  }

  if (input.area === "scheduler-pacing") {
    if (input.adaptationHealthLabel === "hold") addUniqueLimited(rationale, "Adaptive scheduling health indicates hold posture.", 3);
    if (input.schedulerPressureHigh) addUniqueLimited(rationale, "Cooldown or preview dependency pressure remains high.", 3);
  }

  if (input.area === "autonomy-readiness") {
    if (input.readinessLabel === "not-ready") addUniqueLimited(rationale, "Strategic semantic execution readiness is not-ready.", 3);
    if (input.readinessLabel === "phase-ready") addUniqueLimited(rationale, "Strategic semantic execution readiness supports phased progression.", 3);
    if (input.readinessLabel === "execution-ready" || input.readinessLabel === "automation-candidate") {
      addUniqueLimited(rationale, "Execution readiness supports broader adaptive scope.", 3);
    }
  }

  if (input.area === "learning-quality") {
    if (input.learningHealthLabel === "low") addUniqueLimited(rationale, "Learning health indicates fragile signal quality.", 3);
    if (input.memoryHealthLabel === "unstable") addUniqueLimited(rationale, "Execution memory health indicates instability.", 3);
  }

  if (rationale.length === 0) addUniqueLimited(rationale, "Signals indicate this area is the safest next leverage.", 3);
  return rationale;
}

function buildAdaptivePriorities(input: {
  primaryArea: StrategicAdaptationOrchestratorV1["primaryAdaptiveFocus"]["area"];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  feedbackLabel: AdaptiveStrategicFeedbackV1["feedbackLabel"];
  executionStability: ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"];
  schedulerPressureHigh: boolean;
  readinessLabel: NormalizedReadinessLabel;
  learningHealthLabel: NormalizedLearningHealth;
  memoryHealthLabel: ExecutionMemoryV1["memoryHealthLabel"];
  semanticWeaknessClustersHigh: boolean;
  semanticHealthLabel: NormalizedLearningHealth;
  unresolvedRatioHigh: boolean;
}): StrategicAdaptationOrchestratorV1["adaptivePriorities"] {
  const instabilityBlocking =
    input.evolutionLabel === "regressing" ||
    input.evolutionLabel === "unstable" ||
    input.feedbackLabel === "destabilized" ||
    input.executionStability === "unstable";

  const semanticQualityConcern =
    input.semanticWeaknessClustersHigh || input.semanticHealthLabel === "low" || input.semanticHealthLabel === "medium" || input.unresolvedRatioHigh;

  const learningHealthLow = input.learningHealthLabel === "low" || input.memoryHealthLabel === "unstable";

  const candidates: Array<{
    area:
      | "semantic-quality"
      | "execution-stability"
      | "consistency"
      | "scheduler-pacing"
      | "autonomy-readiness"
      | "learning-quality";
    include: boolean;
  }> = [
    { area: input.primaryArea, include: true },
    { area: "execution-stability", include: instabilityBlocking },
    { area: "consistency", include: input.consistencyLabel !== "high" },
    { area: "semantic-quality", include: semanticQualityConcern },
    { area: "scheduler-pacing", include: input.adaptationHealthLabel === "hold" || input.schedulerPressureHigh },
    { area: "learning-quality", include: learningHealthLow },
    {
      area: "autonomy-readiness",
      include: input.readinessLabel === "not-ready" || input.readinessLabel === "execution-ready" || input.readinessLabel === "automation-candidate",
    },
  ];

  const out: StrategicAdaptationOrchestratorV1["adaptivePriorities"] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if (!c.include) continue;
    if (out.length >= 6) break;
    if (seen.has(c.area)) continue;
    seen.add(c.area);

    const priority = priorityForArea({
      area: c.area,
      primaryArea: input.primaryArea,
      instabilityBlocking,
      consistencyLabel: input.consistencyLabel,
      readinessLabel: input.readinessLabel,
      schedulerPressureHigh: input.schedulerPressureHigh || input.adaptationHealthLabel === "hold",
      learningHealthLow,
      semanticQualityConcern,
    });

    const rationale = buildRationale({
      area: c.area,
      evolutionLabel: input.evolutionLabel,
      feedbackLabel: input.feedbackLabel,
      executionStability: input.executionStability,
      consistencyLabel: input.consistencyLabel,
      adaptationHealthLabel: input.adaptationHealthLabel,
      schedulerPressureHigh: input.schedulerPressureHigh,
      readinessLabel: input.readinessLabel,
      learningHealthLabel: input.learningHealthLabel,
      memoryHealthLabel: input.memoryHealthLabel,
      semanticWeaknessClustersHigh: input.semanticWeaknessClustersHigh,
      semanticHealthLabel: input.semanticHealthLabel,
      unresolvedRatioHigh: input.unresolvedRatioHigh,
    });

    out.push({ area: c.area, priority, rationale });
  }

  return out;
}

export function buildStrategicAdaptationOrchestratorV1(
  input: StrategicAdaptationOrchestratorInputV1,
): StrategicAdaptationOrchestratorV1 {
  const unresolvedRatio = normalizeRatio0to1(input.unresolvedRatio, 0);
  const baseScore = computeBaseScore(input);
  const adaptationScore = applyDeterministicAdjustments(input, baseScore);

  const evolutionLabel = normalizeEvolutionLabel(input);
  const policyLabel = normalizePolicyLabel(input);
  const feedbackLabel = normalizeFeedbackLabel(input);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input);
  const readinessLabel = normalizeReadinessLabel(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const learningHealthLabel = normalizeLearningHealthLabel(input);
  const memoryHealthLabel = normalizeMemoryHealthLabel(input);
  const semanticWeaknessClustersHigh = normalizeSemanticWeaknessClustersHigh(input);
  const semanticHealthLabel = normalizeSemanticHealthLabel(input);
  const schedulerPressureHigh = normalizeSchedulerPressureHigh(input);
  const executionStability = normalizeExecutionStability(input);
  const unresolvedRatioHigh = unresolvedRatio > 0.3;

  const adaptationLabel = adaptationLabelForScore(adaptationScore);
  const adaptationPhase = adaptationPhaseForLabel(adaptationLabel);
  const adaptationDirection = determineAdaptationDirection(input);
  const adaptationTempo = determineAdaptationTempo(input, adaptationLabel);

  const primaryAdaptiveFocus = determinePrimaryAdaptiveFocus(input, adaptationDirection);

  const adaptivePriorities = buildAdaptivePriorities({
    primaryArea: primaryAdaptiveFocus.area,
    evolutionLabel,
    feedbackLabel,
    executionStability,
    consistencyLabel,
    adaptationHealthLabel,
    schedulerPressureHigh,
    readinessLabel,
    learningHealthLabel,
    memoryHealthLabel,
    semanticWeaknessClustersHigh,
    semanticHealthLabel,
    unresolvedRatioHigh,
  });

  const adaptiveConstraints: string[] = [];
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") {
    addUniqueLimited(adaptiveConstraints, "Evolution remains constrained by instability signals.", 6);
  }
  if (learningHealthLabel === "low" || memoryHealthLabel === "unstable") {
    addUniqueLimited(adaptiveConstraints, "Learning and memory stability signals require cautious adaptation.", 6);
  }
  if (consistencyLabel === "low" || consistencyLabel === "medium") {
    addUniqueLimited(adaptiveConstraints, "Semantic consistency is limiting adaptive expansion.", 6);
  }
  if (adaptationHealthLabel === "hold" || schedulerPressureHigh) {
    addUniqueLimited(adaptiveConstraints, "Scheduler adaptation should remain conservative.", 6);
  }
  if (readinessLabel === "not-ready") {
    addUniqueLimited(adaptiveConstraints, "Execution readiness is not yet sufficient for faster evolution.", 6);
  }
  if (unresolvedRatioHigh) {
    addUniqueLimited(adaptiveConstraints, "Unresolved page pressure is constraining adaptation.", 6);
  }

  const adaptiveDrivers: string[] = [];
  if (normalizeStrategicLearningScore(input) >= 60) addUniqueLimited(adaptiveDrivers, "Strategic learning signals are strengthening.", 6);
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") addUniqueLimited(adaptiveDrivers, "Evolution trajectory is improving.", 6);
  if (policyLabel === "adaptive" || policyLabel === "expansion-ready") addUniqueLimited(adaptiveDrivers, "Adaptive strategic policy supports guided expansion.", 6);
  if (feedbackLabel === "adaptive" || feedbackLabel === "self-optimizing") addUniqueLimited(adaptiveDrivers, "Adaptive feedback indicates improving system self-correction.", 6);
  if (adaptationHealthLabel === "ready") addUniqueLimited(adaptiveDrivers, "Adaptive scheduling signals support controlled expansion.", 6);
  if (consistencyLabel === "high") addUniqueLimited(adaptiveDrivers, "High semantic consistency supports adaptive coordination.", 6);
  if (readinessLabel === "execution-ready" || readinessLabel === "automation-candidate") {
    addUniqueLimited(adaptiveDrivers, "Execution readiness supports broader adaptive scope.", 6);
  }

  const adaptiveRisks: string[] = [];
  if (evolutionLabel === "regressing") addUniqueLimited(adaptiveRisks, "Regression risk remains present.", 6);
  if (executionStability === "unstable" || memoryHealthLabel === "unstable") addUniqueLimited(adaptiveRisks, "Execution instability may disrupt adaptation.", 6);
  if (consistencyLabel !== "high") addUniqueLimited(adaptiveRisks, "Low consistency may fragment adaptive behavior.", 6);
  if (adaptationHealthLabel === "hold" || schedulerPressureHigh) addUniqueLimited(adaptiveRisks, "Scheduler pressure may slow evolution.", 6);
  if (readinessLabel === "not-ready" && (policyLabel === "expansion-ready" || evolutionLabel === "accelerating")) {
    addUniqueLimited(adaptiveRisks, "Autonomy expansion may be premature.", 6);
  }
  if (unresolvedRatioHigh) addUniqueLimited(adaptiveRisks, "Unresolved pages may distort semantic signals.", 6);

  const adaptiveOpportunities: string[] = [];
  if (consistencyLabel === "high" && semanticHealthLabel !== "low" && (readinessLabel === "phase-ready" || readinessLabel === "execution-ready")) {
    addUniqueLimited(adaptiveOpportunities, "Semantic adaptation can expand safely.", 6);
  }
  if (learningHealthLabel !== "low" && memoryHealthLabel !== "unstable") {
    addUniqueLimited(adaptiveOpportunities, "Learning quality is strong enough for broader coordination.", 6);
  }
  if (adaptationTempo === "progressive") addUniqueLimited(adaptiveOpportunities, "Adaptive pacing can become more progressive.", 6);
  if (adaptationLabel === "orchestrating") addUniqueLimited(adaptiveOpportunities, "Autonomy preparation can begin under guided conditions.", 6);
  if (consistencyLabel !== "high") addUniqueLimited(adaptiveOpportunities, "Consistency improvements can unlock faster evolution.", 6);
  if (policyLabel === "expansion-ready") addUniqueLimited(adaptiveOpportunities, "Policy posture supports safe expansion.", 6);

  const notes: string[] = [];
  addUniqueLimited(notes, "Strategic adaptation orchestrator v1 is interpretive only and does not alter system behavior.", 6);

  if (evolutionLabel === "regressing" || evolutionLabel === "unstable" || feedbackLabel === "destabilized") {
    addUniqueLimited(notes, "Instability signals are present; evolution should emphasize stability.", 6);
  }
  if (unresolvedRatioHigh) addUniqueLimited(notes, "Unresolved page ratio is high; semantic signals may be incomplete.", 6);
  if (consistencyLabel !== "high") addUniqueLimited(notes, "Consistency gating is active; coherence improvements should precede expansion.", 6);
  if (adaptationHealthLabel === "hold" || schedulerPressureHigh) addUniqueLimited(notes, "Scheduler pacing signals indicate conservative tempo.", 6);
  if (readinessLabel === "execution-ready" || readinessLabel === "automation-candidate") {
    addUniqueLimited(notes, "Execution readiness is high; guided expansion can be considered.", 6);
  }
  if (semanticWeaknessClustersHigh) addUniqueLimited(notes, "Semantic weakness clusters are elevated; semantic quality should be addressed.", 6);

  const summary = summaryForLabel(adaptationLabel);

  return {
    adaptationScore,
    adaptationLabel,
    adaptationPhase,
    adaptationDirection,
    adaptationTempo,
    primaryAdaptiveFocus,
    adaptivePriorities,
    adaptiveConstraints,
    adaptiveDrivers,
    adaptiveRisks,
    adaptiveOpportunities,
    summary,
    notes,
  };
}

