import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

export type AdaptiveStrategicPolicyLabel = "constrained" | "stabilizing" | "adaptive" | "expansion-ready";
export type AdaptiveStrategicPosture = "hold-evolution" | "stabilize-learning" | "guided-adaptation" | "accelerated-adaptation";
export type StrategicOperatingMode = "conservative" | "controlled" | "adaptive" | "evolutionary";
export type EvolutionDirection =
  | "regression-risk"
  | "stability-recovery"
  | "incremental-improvement"
  | "systemic-acceleration";

export type AdaptiveStrategicPolicyV1 = {
  policyScore: number;
  policyLabel: AdaptiveStrategicPolicyLabel;

  adaptivePosture: AdaptiveStrategicPosture;
  strategicOperatingMode: StrategicOperatingMode;
  evolutionDirection: EvolutionDirection;

  adaptiveConstraints: string[];
  adaptiveSignals: string[];
  adaptiveRisks: string[];
  adaptiveOpportunities: string[];

  summary: string;
  notes: string[];
};

export type AdaptiveStrategicPolicyInputV1 = {
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;
  strategicSemanticExecutionReadiness?: StrategicSemanticExecutionReadiness | Record<string, unknown> | null;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;

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

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function clamp0to100(score: number): number {
  if (!Number.isFinite(score) || Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function normalizeScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? clamp0to100(value) : 0;
}

function normalizeUnresolvedRatio(input: AdaptiveStrategicPolicyInputV1): number {
  const raw = input.unresolvedRatio;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

function normalizeEvolutionLabel(input: AdaptiveStrategicPolicyInputV1): StrategicEvolutionModelV1["evolutionLabel"] {
  const model = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  if (!isRecord(model)) return "regressing";
  const raw = String((model as any).evolutionLabel ?? "").trim();
  if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  return "regressing";
}

function normalizeEvolutionScore(input: AdaptiveStrategicPolicyInputV1): number {
  const model = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  if (!isRecord(model)) return 0;
  return normalizeScore((model as any).evolutionScore);
}

function normalizeStrategicLearningScore(input: AdaptiveStrategicPolicyInputV1): number {
  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  if (!isRecord(core)) return 0;
  const direct = (core as any).learningScore;
  if (typeof direct === "number" && Number.isFinite(direct)) return clamp0to100(direct);
  return normalizeScore((core as any).strategicLearningScore);
}

function normalizeAdaptationHealthScore(input: AdaptiveStrategicPolicyInputV1): number {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return 0;
  return normalizeScore((adaptive as any).adaptationHealthScore);
}

function normalizeAdaptationHealthLabel(input: AdaptiveStrategicPolicyInputV1): AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return "hold";
  const raw = String((adaptive as any).adaptationHealthLabel ?? "").trim();
  if (raw === "ready" || raw === "watch" || raw === "hold") return raw;
  return "hold";
}

function normalizeCooldownStrictness(input: AdaptiveStrategicPolicyInputV1): AdaptiveSchedulingSignalsV1["cooldownSignals"]["cooldownStrictness"] {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return "hold";
  const cooldown = isRecord((adaptive as any).cooldownSignals) ? (adaptive as any).cooldownSignals : null;
  const raw = String(cooldown?.cooldownStrictness ?? "").trim();
  if (raw === "hold" || raw === "monitor" || raw === "relax") return raw;
  return "hold";
}

function normalizeLearningHealthScore(input: AdaptiveStrategicPolicyInputV1): number {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return 0;
  return normalizeScore((exec as any).learningHealthScore);
}

function normalizeLearningHealthLabel(input: AdaptiveStrategicPolicyInputV1): ExecutionLearningSignalsV1["learningHealthLabel"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "fragile";
  const raw = String((exec as any).learningHealthLabel ?? "").trim();
  if (raw === "strong" || raw === "watch" || raw === "fragile") return raw;
  return "fragile";
}

function normalizeSchedulerReliability(input: AdaptiveStrategicPolicyInputV1): ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "low";
  const stability = isRecord((exec as any).stabilitySignals) ? (exec as any).stabilitySignals : null;
  const raw = String(stability?.schedulerReliability ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeExecutionStability(input: AdaptiveStrategicPolicyInputV1): ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "unstable";
  const stability = isRecord((exec as any).stabilitySignals) ? (exec as any).stabilitySignals : null;
  const raw = String(stability?.executionStability ?? "").trim();
  if (raw === "stable" || raw === "mixed" || raw === "unstable") return raw;
  return "unstable";
}

function normalizeDriftDetected(input: AdaptiveStrategicPolicyInputV1): boolean {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (isRecord(exec)) {
    const drift = isRecord((exec as any).driftSignals) ? (exec as any).driftSignals : null;
    if (drift && typeof drift.replayDriftPresent === "boolean") return drift.replayDriftPresent === true;
  }

  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const stability = isRecord((mem as any).stabilitySignals) ? (mem as any).stabilitySignals : null;
    if (stability && typeof stability.driftDetectedRecent === "boolean") return stability.driftDetectedRecent === true;
  }

  return false;
}

function normalizeAutomationCandidatePresent(input: AdaptiveStrategicPolicyInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(mem)) return false;
  const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
  return pressure && typeof pressure.automationCandidatePresent === "boolean" ? pressure.automationCandidatePresent === true : false;
}

function normalizeSemanticWeaknessClustersHigh(input: AdaptiveStrategicPolicyInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(mem)) return false;
  const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
  return pressure && typeof pressure.semanticWeaknessClustersHigh === "boolean" ? pressure.semanticWeaknessClustersHigh === true : false;
}

function normalizeConsistencyLabel(input: AdaptiveStrategicPolicyInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const consistency = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(consistency)) return "low";
  const raw = String((consistency as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeReadiness(input: AdaptiveStrategicPolicyInputV1): { score: number; label: StrategicSemanticExecutionReadiness["label"] } {
  const readiness = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");
  if (!isRecord(readiness)) return { score: 0, label: "not-ready" };

  const score = normalizeScore((readiness as any).score);
  const labelRaw = String((readiness as any).label ?? "").trim();
  const label: StrategicSemanticExecutionReadiness["label"] =
    labelRaw === "not-ready" || labelRaw === "phase-ready" || labelRaw === "execution-ready" ? labelRaw : "not-ready";
  return { score, label };
}

function evolutionDirectionForLabel(label: StrategicEvolutionModelV1["evolutionLabel"]): EvolutionDirection {
  if (label === "regressing") return "regression-risk";
  if (label === "unstable") return "stability-recovery";
  if (label === "accelerating") return "systemic-acceleration";
  return "incremental-improvement";
}

function policyLabelForScore(score: number): AdaptiveStrategicPolicyLabel {
  if (score <= 24) return "constrained";
  if (score <= 49) return "stabilizing";
  if (score <= 74) return "adaptive";
  return "expansion-ready";
}

function postureForLabel(label: AdaptiveStrategicPolicyLabel): AdaptiveStrategicPosture {
  if (label === "constrained") return "hold-evolution";
  if (label === "stabilizing") return "stabilize-learning";
  if (label === "adaptive") return "guided-adaptation";
  return "accelerated-adaptation";
}

function operatingModeForLabel(label: AdaptiveStrategicPolicyLabel): StrategicOperatingMode {
  if (label === "constrained") return "conservative";
  if (label === "stabilizing") return "controlled";
  if (label === "adaptive") return "adaptive";
  return "evolutionary";
}

function summaryForLabel(label: AdaptiveStrategicPolicyLabel): string {
  if (label === "constrained") return "System evolution is constrained; adaptive expansion should be avoided.";
  if (label === "stabilizing") return "System is stabilizing; adaptive growth should remain controlled.";
  if (label === "adaptive") return "System shows adaptive stability; guided evolution is appropriate.";
  return "System demonstrates strong adaptive maturity and is ready for accelerated evolution.";
}

export function buildAdaptiveStrategicPolicyV1(input: AdaptiveStrategicPolicyInputV1): AdaptiveStrategicPolicyV1 {
  const evolutionLabel = normalizeEvolutionLabel(input);
  const evolutionDirection = evolutionDirectionForLabel(evolutionLabel);

  const baseEvolutionScore = normalizeEvolutionScore(input);
  const baseStrategicLearningScore = normalizeStrategicLearningScore(input);
  const baseAdaptationHealthScore = normalizeAdaptationHealthScore(input);
  const baseLearningHealthScore = normalizeLearningHealthScore(input);
  const readiness = normalizeReadiness(input);

  const basePolicyScore = (baseEvolutionScore + baseStrategicLearningScore + baseAdaptationHealthScore + baseLearningHealthScore + readiness.score) / 5;

  const driftDetected = normalizeDriftDetected(input);
  const cooldownStrictness = normalizeCooldownStrictness(input);
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const semanticWeaknessClustersHigh = normalizeSemanticWeaknessClustersHigh(input);
  const automationCandidatePresent = normalizeAutomationCandidatePresent(input);
  const schedulerReliability = normalizeSchedulerReliability(input);
  const schedulerReliabilityHigh = schedulerReliability === "high";
  const schedulerReliabilityLow = schedulerReliability === "low";
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input);
  const executionStability = normalizeExecutionStability(input);
  const learningHealthLabel = normalizeLearningHealthLabel(input);

  let score = basePolicyScore;

  if (evolutionLabel === "regressing") score -= 20;
  if (evolutionLabel === "unstable") score -= 12;
  if (evolutionLabel === "accelerating") score += 10;
  if (driftDetected) score -= 15;
  if (cooldownStrictness === "hold") score -= 10;
  if (unresolvedRatio > 0.3) score -= 10;
  if (consistencyLabel === "low") score -= 12;
  if (semanticWeaknessClustersHigh) score -= 8;
  if (automationCandidatePresent) score += 8;
  if (schedulerReliabilityHigh) score += 6;
  if (adaptationHealthLabel === "ready") score += 6;

  const policyScore = clamp0to100(score);
  const policyLabel = policyLabelForScore(policyScore);

  const adaptivePosture = postureForLabel(policyLabel);
  const strategicOperatingMode = operatingModeForLabel(policyLabel);

  const adaptiveConstraints: string[] = [];
  if (driftDetected) addUniqueLimited(adaptiveConstraints, "Constraint: driftDetected=true; restrict evolution until drift clears.", 6);
  if (cooldownStrictness === "hold") addUniqueLimited(adaptiveConstraints, "Constraint: cooldownStrictness=hold; hold adaptive expansion.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(adaptiveConstraints, "Constraint: unresolvedRatio>0.3; prioritize stabilization over expansion.", 6);
  if (consistencyLabel === "low") addUniqueLimited(adaptiveConstraints, "Constraint: consistencyLabel=low; require semantic consistency recovery.", 6);
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") {
    addUniqueLimited(adaptiveConstraints, `Constraint: evolutionLabel=${evolutionLabel}; avoid aggressive evolution.`, 6);
  }
  if (readiness.label === "not-ready") addUniqueLimited(adaptiveConstraints, "Constraint: readiness.label=not-ready; block strategic evolution expansion.", 6);

  const adaptiveSignals: string[] = [];
  if (schedulerReliabilityHigh) addUniqueLimited(adaptiveSignals, "Signal: schedulerReliability=high.", 6);
  if (adaptationHealthLabel === "ready") addUniqueLimited(adaptiveSignals, "Signal: adaptationHealthLabel=ready.", 6);
  if (executionStability === "stable") addUniqueLimited(adaptiveSignals, "Signal: executionStability=stable.", 6);
  if (consistencyLabel === "high") addUniqueLimited(adaptiveSignals, "Signal: consistencyLabel=high.", 6);
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") {
    addUniqueLimited(adaptiveSignals, `Signal: evolutionLabel=${evolutionLabel}.`, 6);
  }
  if (automationCandidatePresent) addUniqueLimited(adaptiveSignals, "Signal: automationCandidatePresent=true.", 6);

  const adaptiveRisks: string[] = [];
  if (evolutionDirection === "regression-risk") addUniqueLimited(adaptiveRisks, "Risk: regression-risk; evolution posture may be degrading.", 6);
  if (evolutionLabel === "unstable") addUniqueLimited(adaptiveRisks, "Risk: instability; evolution signals indicate low stability.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(adaptiveRisks, "Risk: unresolvedRatio high; system baseline is incomplete.", 6);
  if (learningHealthLabel === "fragile") addUniqueLimited(adaptiveRisks, "Risk: learning health fragile; avoid aggressive adaptation.", 6);
  if (driftDetected) addUniqueLimited(adaptiveRisks, "Risk: drift present; replay drift indicates potential regression.", 6);
  if (schedulerReliabilityLow) addUniqueLimited(adaptiveRisks, "Risk: schedulerReliability low; adaptive pacing may be unreliable.", 6);

  const adaptiveOpportunities: string[] = [];
  if (evolutionLabel === "accelerating") addUniqueLimited(adaptiveOpportunities, "Opportunity: accelerating evolution; systemic acceleration is feasible.", 6);
  if (adaptationHealthLabel === "ready") addUniqueLimited(adaptiveOpportunities, "Opportunity: adaptation health ready; broaden controlled adaptation.", 6);
  if (executionStability === "stable") addUniqueLimited(adaptiveOpportunities, "Opportunity: stable execution; expand guided evolution safely.", 6);
  if (consistencyLabel === "high") addUniqueLimited(adaptiveOpportunities, "Opportunity: high semantic health (consistency high).", 6);
  if (readiness.label === "execution-ready") addUniqueLimited(adaptiveOpportunities, "Opportunity: high readiness; increase evolution cadence.", 6);
  if (!semanticWeaknessClustersHigh) addUniqueLimited(adaptiveOpportunities, "Opportunity: no weakness clusters; scale adaptation scope.", 6);

  const notes: string[] = [];
  addUniqueLimited(notes, "Adaptive strategic policy v1 interprets system evolution state and does not trigger execution.", 5);
  addUniqueLimited(
    notes,
    `Policy score base average: evolution=${baseEvolutionScore}, strategicLearning=${baseStrategicLearningScore}, adaptationHealth=${baseAdaptationHealthScore}, executionLearning=${baseLearningHealthScore}, readiness=${readiness.score}.`,
    5,
  );
  if (driftDetected) addUniqueLimited(notes, "Drift detected; policy penalizes stability to prevent unsafe evolution.", 5);
  if (cooldownStrictness === "hold") addUniqueLimited(notes, "Cooldown strictness is hold; policy discourages expansion.", 5);
  if (readiness.label === "not-ready") addUniqueLimited(notes, "Readiness is not-ready; policy enforces conservative evolution posture.", 5);

  return {
    policyScore,
    policyLabel,

    adaptivePosture,
    strategicOperatingMode,
    evolutionDirection,

    adaptiveConstraints: adaptiveConstraints.slice(0, 6),
    adaptiveSignals: adaptiveSignals.slice(0, 6),
    adaptiveRisks: adaptiveRisks.slice(0, 6),
    adaptiveOpportunities: adaptiveOpportunities.slice(0, 6),

    summary: summaryForLabel(policyLabel),
    notes: notes.slice(0, 5),
  };
}

