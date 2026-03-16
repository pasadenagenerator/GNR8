import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

export type AdaptiveStrategicFeedbackLabel = "destabilized" | "reactive" | "adjusting" | "adaptive" | "self-optimizing";
export type AdaptiveStrategicFeedbackPosture = "stabilize" | "correct" | "refine" | "optimize" | "autonomous-ready";
export type AdaptiveStrategicFeedbackTrajectory = "converging" | "oscillating" | "diverging" | "stabilizing";

export type AdaptiveStrategicFeedbackV1 = {
  feedbackScore: number;
  feedbackLabel: AdaptiveStrategicFeedbackLabel;
  strategicFeedbackPosture: AdaptiveStrategicFeedbackPosture;

  adaptiveCorrections: string[];
  optimizationSignals: string[];
  strategicRisks: string[];
  strategicMomentumSignals: string[];

  trajectory: AdaptiveStrategicFeedbackTrajectory;
  summary: string;
  notes: string[];
};

export type AdaptiveStrategicFeedbackInputV1 = {
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  strategicSemanticExecutionReadiness?: StrategicSemanticExecutionReadiness | Record<string, unknown> | null;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;
  unresolvedRatio?: number;
};

type FeedbackPolicyLabel = "reactive" | "adaptive";
type FeedbackLearningHealthLabel = "low" | "medium" | "high";
type FeedbackReadinessLabel = "not-ready" | "ready" | "automation-candidate";

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

function normalizeUnresolvedRatio(input: AdaptiveStrategicFeedbackInputV1): number {
  const raw = input.unresolvedRatio;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

function normalizeStrategicLearningScore(input: AdaptiveStrategicFeedbackInputV1): number {
  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  if (!isRecord(core)) return 0;
  const direct = (core as any).learningScore;
  if (typeof direct === "number" && Number.isFinite(direct)) return clamp0to100(direct);
  return normalizeScore((core as any).strategicLearningScore);
}

function normalizeEvolutionScore(input: AdaptiveStrategicFeedbackInputV1): number {
  const model = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  if (!isRecord(model)) return 0;
  return normalizeScore((model as any).evolutionScore);
}

function normalizePolicyScore(input: AdaptiveStrategicFeedbackInputV1): number {
  const policy = unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy");
  if (!isRecord(policy)) return 0;
  return normalizeScore((policy as any).policyScore);
}

function normalizeLearningHealthScore(input: AdaptiveStrategicFeedbackInputV1): number {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return 0;
  return normalizeScore((exec as any).learningHealthScore);
}

function normalizeAdaptationHealthScore(input: AdaptiveStrategicFeedbackInputV1): number {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return 0;
  return normalizeScore((adaptive as any).adaptationHealthScore);
}

function normalizeReadinessScore(input: AdaptiveStrategicFeedbackInputV1): number {
  const readiness = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");
  if (!isRecord(readiness)) return 0;
  return normalizeScore((readiness as any).score);
}

function normalizeEvolutionLabel(input: AdaptiveStrategicFeedbackInputV1): StrategicEvolutionModelV1["evolutionLabel"] {
  const model = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  if (!isRecord(model)) return "regressing";
  const raw = String((model as any).evolutionLabel ?? "").trim();
  if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  return "regressing";
}

function normalizePolicyLabel(input: AdaptiveStrategicFeedbackInputV1): FeedbackPolicyLabel {
  const policy = unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy");
  if (!isRecord(policy)) return "reactive";

  const labelRaw = String((policy as any).policyLabel ?? "").trim();
  if (labelRaw === "adaptive" || labelRaw === "expansion-ready") return "adaptive";
  if (labelRaw === "reactive" || labelRaw === "constrained" || labelRaw === "stabilizing") return "reactive";

  const modeRaw = String((policy as any).strategicOperatingMode ?? "").trim();
  if (modeRaw === "adaptive" || modeRaw === "evolutionary") return "adaptive";
  return "reactive";
}

function normalizeLearningHealthLabel(input: AdaptiveStrategicFeedbackInputV1): FeedbackLearningHealthLabel {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "low";
  const raw = String((exec as any).learningHealthLabel ?? "").trim();
  if (raw === "high") return "high";
  if (raw === "medium") return "medium";
  if (raw === "low") return "low";
  if (raw === "strong") return "high";
  if (raw === "watch") return "medium";
  if (raw === "fragile") return "low";
  return "low";
}

function normalizeAdaptationHealthLabel(input: AdaptiveStrategicFeedbackInputV1): AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return "hold";
  const raw = String((adaptive as any).adaptationHealthLabel ?? "").trim();
  if (raw === "ready" || raw === "watch" || raw === "hold") return raw;
  return "hold";
}

function normalizeConsistencyLabel(input: AdaptiveStrategicFeedbackInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const consistency = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(consistency)) return "low";
  const raw = String((consistency as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeReadinessLabel(input: AdaptiveStrategicFeedbackInputV1): FeedbackReadinessLabel {
  const readiness = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");
  if (!isRecord(readiness)) return "not-ready";

  const labelRaw = String((readiness as any).label ?? "").trim();
  const score = normalizeScore((readiness as any).score);

  const signals = Array.isArray((readiness as any).readinessSignals) ? ((readiness as any).readinessSignals as unknown[]) : [];
  const hasAutomationDominantSignal = signals.some((s) => String(s ?? "").trim() === "Automation candidate pages are dominant.");

  if (hasAutomationDominantSignal && score >= 70 && labelRaw !== "not-ready") return "automation-candidate";
  if (labelRaw === "not-ready") return "not-ready";
  return "ready";
}

function normalizeSchedulerReliability(input: AdaptiveStrategicFeedbackInputV1): ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "low";
  const stability = isRecord((exec as any).stabilitySignals) ? (exec as any).stabilitySignals : null;
  const raw = String(stability?.schedulerReliability ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizePersistentDrift(input: AdaptiveStrategicFeedbackInputV1): boolean {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return false;
  const drift = isRecord((exec as any).driftSignals) ? (exec as any).driftSignals : null;
  if (!drift) return false;
  const replayDriftPresent = typeof drift.replayDriftPresent === "boolean" ? drift.replayDriftPresent === true : false;
  const riskRaw = String(drift.executionDriftRisk ?? "").trim();
  const executionDriftRiskHigh = riskRaw === "high";
  return replayDriftPresent || executionDriftRiskHigh;
}

function normalizeSemanticBottleneckClustersHigh(input: AdaptiveStrategicFeedbackInputV1): boolean {
  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  if (isRecord(core)) {
    const vectors = Array.isArray((core as any).strategicWeaknessVectors) ? ((core as any).strategicWeaknessVectors as unknown[]) : [];
    const hasBottleneck = vectors.some((v) => String(v ?? "").toLowerCase().includes("bottleneck"));
    if (hasBottleneck) return true;
  }

  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (isRecord(exec)) {
    const notes = Array.isArray((exec as any).notes) ? ((exec as any).notes as unknown[]) : [];
    const hasClusterNote = notes.some((n) => String(n ?? "").toLowerCase().includes("weakness") && String(n ?? "").toLowerCase().includes("cluster"));
    if (hasClusterNote) return true;
  }

  return false;
}

function normalizeAutonomyConstraintsActive(input: AdaptiveStrategicFeedbackInputV1): boolean {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (isRecord(exec)) {
    const learningSignals = isRecord((exec as any).learningSignals) ? (exec as any).learningSignals : null;
    if (learningSignals && typeof learningSignals.shouldStayConservative === "boolean") return learningSignals.shouldStayConservative === true;
  }

  const policy = unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy");
  if (isRecord(policy)) {
    const constraints = Array.isArray((policy as any).adaptiveConstraints) ? ((policy as any).adaptiveConstraints as unknown[]) : [];
    if (constraints.length > 0) return true;
  }

  return false;
}

function feedbackLabelForScore(score: number): AdaptiveStrategicFeedbackLabel {
  if (score <= 24) return "destabilized";
  if (score <= 44) return "reactive";
  if (score <= 64) return "adjusting";
  if (score <= 84) return "adaptive";
  return "self-optimizing";
}

function postureForLabel(label: AdaptiveStrategicFeedbackLabel): AdaptiveStrategicFeedbackPosture {
  switch (label) {
    case "destabilized":
      return "stabilize";
    case "reactive":
      return "correct";
    case "adjusting":
      return "refine";
    case "adaptive":
      return "optimize";
    case "self-optimizing":
      return "autonomous-ready";
  }
}

function summaryForLabel(label: AdaptiveStrategicFeedbackLabel): string {
  if (label === "self-optimizing") return "System strategic feedback indicates self-optimizing adaptive convergence.";
  if (label === "adaptive") return "System strategic feedback indicates stable adaptive optimization capability.";
  if (label === "adjusting") return "System strategic feedback indicates active adjustment and refinement phase.";
  if (label === "reactive") return "System strategic feedback indicates reactive stabilization pressure.";
  return "System strategic feedback indicates systemic instability requiring intervention.";
}

export function buildAdaptiveStrategicFeedbackV1(input: AdaptiveStrategicFeedbackInputV1): AdaptiveStrategicFeedbackV1 {
  const strategicLearningScore = normalizeStrategicLearningScore(input);
  const evolutionScore = normalizeEvolutionScore(input);
  const policyScore = normalizePolicyScore(input);
  const learningHealthScore = normalizeLearningHealthScore(input);
  const adaptationHealthScore = normalizeAdaptationHealthScore(input);
  const readinessScore = normalizeReadinessScore(input);

  const baseScore = clamp0to100(
    (strategicLearningScore + evolutionScore + policyScore + learningHealthScore + adaptationHealthScore + readinessScore) / 6,
  );

  const evolutionLabel = normalizeEvolutionLabel(input);
  const policyLabel = normalizePolicyLabel(input);
  const learningHealthLabel = normalizeLearningHealthLabel(input);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input);
  const readinessLabel = normalizeReadinessLabel(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const unresolvedRatio = normalizeUnresolvedRatio(input);

  let score = baseScore;

  if (evolutionLabel === "regressing") score -= 20;
  if (evolutionLabel === "unstable") score -= 12;
  if (policyLabel === "reactive") score -= 10;
  if (learningHealthLabel === "low") score -= 12;
  if (adaptationHealthLabel === "hold") score -= 10;
  if (readinessLabel === "not-ready") score -= 15;
  if (consistencyLabel === "low") score -= 12;
  if (unresolvedRatio > 0.3) score -= 10;

  if (evolutionLabel === "accelerating") score += 10;
  if (policyLabel === "adaptive") score += 8;
  if (learningHealthLabel === "high") score += 8;
  if (adaptationHealthLabel === "ready") score += 8;
  if (readinessLabel === "automation-candidate") score += 10;
  if (consistencyLabel === "high") score += 6;

  score = clamp0to100(score);

  const feedbackLabel = feedbackLabelForScore(score);
  const strategicFeedbackPosture = postureForLabel(feedbackLabel);

  const adaptiveCorrections: string[] = [];
  if (evolutionLabel === "regressing") addUniqueLimited(adaptiveCorrections, "evolution regressing", 6);
  if (readinessLabel === "not-ready") addUniqueLimited(adaptiveCorrections, "readiness not-ready", 6);
  if (policyLabel === "reactive") addUniqueLimited(adaptiveCorrections, "policy reactive", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(adaptiveCorrections, "unresolvedRatio high", 6);
  if (consistencyLabel === "low") addUniqueLimited(adaptiveCorrections, "consistency low", 6);
  if (learningHealthLabel === "low") addUniqueLimited(adaptiveCorrections, "learningHealth low", 6);

  const optimizationSignals: string[] = [];
  if (evolutionLabel === "accelerating") addUniqueLimited(optimizationSignals, "evolution accelerating", 6);
  if (policyLabel === "adaptive") addUniqueLimited(optimizationSignals, "policy adaptive", 6);
  if (adaptationHealthLabel === "ready") addUniqueLimited(optimizationSignals, "adaptation ready", 6);
  if (readinessLabel === "automation-candidate") addUniqueLimited(optimizationSignals, "readiness automation-candidate", 6);
  if (learningHealthLabel === "high") addUniqueLimited(optimizationSignals, "learningHealth high", 6);
  if (consistencyLabel === "high") addUniqueLimited(optimizationSignals, "consistency high", 6);

  const strategicRisks: string[] = [];
  if (normalizePersistentDrift(input)) addUniqueLimited(strategicRisks, "persistent drift", 6);
  if (normalizeSchedulerReliability(input) === "low") addUniqueLimited(strategicRisks, "scheduler instability", 6);
  if (normalizeSemanticBottleneckClustersHigh(input)) addUniqueLimited(strategicRisks, "semantic bottleneck clusters high", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(strategicRisks, "unresolvedRatio high", 6);
  if (normalizeAutonomyConstraintsActive(input)) addUniqueLimited(strategicRisks, "autonomy constraints active", 6);

  const strategicMomentumSignals: string[] = [];
  const learningCore = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  const learningTrajectory = isRecord(learningCore) ? String((learningCore as any).learningTrajectory ?? "").trim() : "";
  if (learningTrajectory === "evolving") addUniqueLimited(strategicMomentumSignals, "learning trajectory improving", 6);
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") addUniqueLimited(strategicMomentumSignals, "evolution progressing", 6);
  if (normalizeSchedulerReliability(input) === "high") addUniqueLimited(strategicMomentumSignals, "scheduler reliability high", 6);
  if (adaptationHealthLabel === "ready") addUniqueLimited(strategicMomentumSignals, "adaptation readiness improving", 6);
  if (consistencyLabel === "high" || consistencyLabel === "medium") addUniqueLimited(strategicMomentumSignals, "semantic consistency stabilizing", 6);

  let trajectory: AdaptiveStrategicFeedbackTrajectory;
  if (evolutionLabel === "accelerating" && learningHealthLabel === "high" && adaptationHealthLabel === "ready") {
    trajectory = "converging";
  } else if (evolutionLabel === "stagnating" || learningHealthLabel === "medium") {
    trajectory = "oscillating";
  } else if (evolutionLabel === "regressing") {
    trajectory = "diverging";
  } else {
    trajectory = "stabilizing";
  }

  const summary = summaryForLabel(feedbackLabel);

  const notes: string[] = [];
  notes.push("Adaptive strategic feedback v1 is interpretive only and does not alter runtime behavior.");

  if (feedbackLabel === "destabilized") {
    addUniqueLimited(notes, "Strategic posture is destabilized; prioritize stability recovery and reduce adaptive variance.", 6);
  } else if (feedbackLabel === "reactive") {
    addUniqueLimited(notes, "Reactive pressure is elevated; tighten feedback loops before expanding autonomy scope.", 6);
  }

  if (unresolvedRatio > 0.3) addUniqueLimited(notes, "Unresolved page ratio is high; resolve semantic gaps before accelerating strategy.", 6);
  if (readinessLabel === "not-ready") addUniqueLimited(notes, "Execution readiness is not ready; avoid automation escalation until readiness improves.", 6);
  if (adaptationHealthLabel === "hold") addUniqueLimited(notes, "Scheduling adaptation is gated (hold); prioritize signal stabilization before optimization.", 6);
  if (trajectory === "converging") addUniqueLimited(notes, "Trajectory indicates converging convergence; optimization can focus on autonomy progression.", 6);
  if (readinessLabel === "automation-candidate") addUniqueLimited(notes, "Automation candidate signal is strong; optimization can shift toward scalable autonomy.", 6);
  if (learningHealthLabel === "low") addUniqueLimited(notes, "Learning health is low; improve replay determinism and reduce drift risk.", 6);

  return {
    feedbackScore: score,
    feedbackLabel,
    strategicFeedbackPosture,
    adaptiveCorrections,
    optimizationSignals,
    strategicRisks,
    strategicMomentumSignals,
    trajectory,
    summary,
    notes: notes.slice(0, 6),
  };
}

