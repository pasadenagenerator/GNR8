import type { StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicIntelligencePhaseTransitionEngineV1 } from "@/gnr8/ai/strategic-intelligence-phase-transition-engine";
import type { StrategicIntelligenceReadinessGateV1 } from "@/gnr8/ai/strategic-intelligence-readiness-gate";
import type { StrategicIntelligenceStabilityModelV1 } from "@/gnr8/ai/strategic-intelligence-stability-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";

export type StrategicPhaseEvolutionLabelV1 =
  | "phase-collapse"
  | "phase-unstable"
  | "phase-forming"
  | "phase-progressing"
  | "phase-mature";

export type StrategicPhaseEvolutionPhaseV1 =
  | "intelligence-recovery"
  | "stabilization-loop"
  | "structural-formation"
  | "strategic-growth"
  | "system-expansion";

export type StrategicPhaseProgressionDirectionV1 = "forward" | "regressing" | "oscillating";

export type StrategicPhaseMomentumV1 = "accelerating" | "decelerating" | "steady";

export type StrategicPhaseStabilityV1 = "stable" | "unstable";

export type StrategicEvolutionContinuityV1 = "continuous" | "fragmented";

export type StrategicPhaseEvolutionMapV1 = {
  phaseEvolutionScore: number;
  phaseEvolutionDelta: number;

  phaseLabel: StrategicPhaseEvolutionLabelV1;
  evolutionPhase: StrategicPhaseEvolutionPhaseV1;

  phaseProgressionDirection: StrategicPhaseProgressionDirectionV1;
  phaseMomentum: StrategicPhaseMomentumV1;
  phaseStability: StrategicPhaseStabilityV1;
  evolutionContinuity: StrategicEvolutionContinuityV1;

  temporalEvolutionConfidence: number;

  scoreInputs: {
    transitionScore: number;
    readinessScore: number;
    intelligenceStabilityScore: number;
    coherenceScore: number;
    stabilityScore: number;
    alignmentScore: number;
    directionScore: number;
    evolutionScore: number;
    strategicLearningScore: number;
  };

  phaseSignals: string[];
  phaseBlockers: string[];
  phaseRisks: string[];
  phaseOpportunities: string[];

  summary: string;
  notes: string[];
};

export type StrategicPhaseEvolutionMapInputV1 = {
  strategicIntelligencePhaseTransition?: StrategicIntelligencePhaseTransitionEngineV1 | Record<string, unknown> | null;
  strategicIntelligenceReadinessGate?: StrategicIntelligenceReadinessGateV1 | Record<string, unknown> | null;
  strategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  strategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  strategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  strategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  strategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  strategicRuntimeAdaptationPolicy?: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;

  previousStrategicPhaseEvolutionMap?: StrategicPhaseEvolutionMapV1 | Record<string, unknown> | null;
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

function clampDelta(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.round(value);
}

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function normalizeScoreFrom(value: unknown, nestedKey: string, scoreKey: string): number {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return 0;
  const raw = (obj as any)[scoreKey] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : 0;
}

function normalizeOptionalScoreFrom(value: unknown, nestedKey: string, scoreKey: string): number | null {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return null;
  const raw = (obj as any)[scoreKey] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : null;
}

function normalizeLabelFrom(value: unknown, nestedKey: string, key: string): string {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return "";
  return String((obj as any)[key] ?? "").trim();
}

function phaseLabelForScore(score: number): StrategicPhaseEvolutionLabelV1 {
  if (score <= 19) return "phase-collapse";
  if (score <= 39) return "phase-unstable";
  if (score <= 59) return "phase-forming";
  if (score <= 79) return "phase-progressing";
  return "phase-mature";
}

function evolutionPhaseForLabel(label: StrategicPhaseEvolutionLabelV1): StrategicPhaseEvolutionPhaseV1 {
  if (label === "phase-collapse") return "intelligence-recovery";
  if (label === "phase-unstable") return "stabilization-loop";
  if (label === "phase-forming") return "structural-formation";
  if (label === "phase-progressing") return "strategic-growth";
  return "system-expansion";
}

function summaryForLabel(label: StrategicPhaseEvolutionLabelV1): string {
  if (label === "phase-collapse") return "System intelligence phase has collapsed and requires recovery.";
  if (label === "phase-unstable") return "System is transitioning through unstable evolutionary phase.";
  if (label === "phase-forming") return "System is forming structural intelligence foundations.";
  if (label === "phase-progressing") return "System intelligence is progressing toward maturity.";
  return "System intelligence phase has reached maturity.";
}

function normalizeTransitionState(value: unknown): "regressive" | "advancing" | "neutral" {
  const label = normalizeLabelFrom(value, "strategicIntelligencePhaseTransition", "phaseTransitionLabel");
  if (label === "regressing") return "regressive";
  if (label === "progressing" || label === "transition-ready") return "advancing";
  return "neutral";
}

function normalizeReadinessState(value: unknown): "blocked" | "ready" | "conditional" {
  const readinessLabel = normalizeLabelFrom(value, "strategicIntelligenceReadinessGate", "readinessLabel");
  if (readinessLabel === "ready" || readinessLabel === "scaling-ready") return "ready";
  if (readinessLabel === "not-ready") return "blocked";
  return "conditional";
}

function normalizeCoherenceIntegrity(value: unknown): "fragmented" | "integrated" | "partial" {
  const coherenceLabel = normalizeLabelFrom(value, "strategicCoherenceEngine", "coherenceLabel");
  if (coherenceLabel === "fragmented") return "fragmented";
  if (coherenceLabel === "coherent" || coherenceLabel === "systemic") return "integrated";
  return "partial";
}

function normalizeStabilityState(value: unknown): "unstable" | "stable" | "fragile" {
  const stabilityLabel = normalizeLabelFrom(value, "strategicStabilityEngine", "stabilityLabel");
  if (stabilityLabel === "stable" || stabilityLabel === "robust") return "stable";
  if (stabilityLabel === "unstable") return "unstable";
  return "fragile";
}

function normalizeAlignmentState(value: unknown): "conflicted" | "aligned" {
  const alignmentLabel = normalizeLabelFrom(value, "strategicSelfAlignment", "alignmentLabel");
  if (alignmentLabel === "coherent" || alignmentLabel === "strongly-aligned") return "aligned";
  return "conflicted";
}

function normalizeIntelligenceTrustState(value: unknown): "trusted" | "untrusted" {
  const trustState = normalizeLabelFrom(value, "strategicIntelligenceStabilityModel", "intelligenceTrustState");
  if (trustState === "trusted-intelligence" || trustState === "durable-intelligence") return "trusted";
  return "untrusted";
}

function normalizeLearningTrajectory(value: unknown): "improving" | "not-improving" {
  const trajectory = normalizeLabelFrom(value, "strategicLearningCore", "learningTrajectory");
  if (trajectory === "stabilizing" || trajectory === "evolving") return "improving";
  return "not-improving";
}

function normalizeDoctrineLabel(value: unknown): StrategicRuntimeAdaptationPolicyV1["doctrineLabel"] | "unknown" {
  const label = normalizeLabelFrom(value, "strategicRuntimeAdaptationPolicy", "doctrineLabel");
  if (label === "contained" || label === "guarded" || label === "adaptive" || label === "progressive" || label === "strategic") return label;
  return "unknown";
}

function inferDriftState(input: {
  intelligenceStabilityLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  learningTrajectory: string;
}): "minimal" | "moderate" | "severe" {
  const unstableIntel = input.intelligenceStabilityLabel === "unstable";
  const fragileIntel = input.intelligenceStabilityLabel === "fragile";
  const coherenceFragmented = input.coherenceLabel === "fragmented";
  const stabilityUnstable = input.stabilityLabel === "unstable";

  const learningRegressing = input.learningTrajectory === "regressing" || input.learningTrajectory === "unstable";

  if (unstableIntel || (coherenceFragmented && stabilityUnstable) || (coherenceFragmented && learningRegressing)) return "severe";
  if (fragileIntel || coherenceFragmented || stabilityUnstable || learningRegressing) return "moderate";
  return "minimal";
}

function computePhaseStability(input: {
  coherenceScore: number;
  coherenceLabel: string;
  alignmentScore: number;
  alignmentLabel: string;
  stabilityScore: number;
  stabilityLabel: string;
  driftState: "minimal" | "moderate" | "severe";
}): StrategicPhaseStabilityV1 {
  const coherenceHigh = input.coherenceScore >= 70 && input.coherenceLabel !== "fragmented";
  const alignmentStrong = input.alignmentScore >= 70 && (input.alignmentLabel === "coherent" || input.alignmentLabel === "strongly-aligned");
  const stabilityRobust = input.stabilityScore >= 70 && (input.stabilityLabel === "stable" || input.stabilityLabel === "robust");
  const driftMinimal = input.driftState === "minimal";

  const weakCount = [coherenceHigh, alignmentStrong, stabilityRobust, driftMinimal].filter((v) => v !== true).length;
  return weakCount >= 2 ? "unstable" : "stable";
}

function computeEvolutionContinuity(input: {
  driftState: "minimal" | "moderate" | "severe";
  transitionState: "regressive" | "advancing" | "neutral";
  readinessState: "blocked" | "ready" | "conditional";
}): StrategicEvolutionContinuityV1 {
  if (input.driftState === "severe") return "fragmented";
  if (input.transitionState === "regressive") return "fragmented";
  if (input.readinessState === "blocked") return "fragmented";
  return "continuous";
}

function computePhaseMomentum(delta: number): StrategicPhaseMomentumV1 {
  if (delta > 10) return "accelerating";
  if (delta < -10) return "decelerating";
  return "steady";
}

function computeProgressionDirection(improving: number, degrading: number): StrategicPhaseProgressionDirectionV1 {
  if (improving > degrading) return "forward";
  if (degrading > improving) return "regressing";
  return "oscillating";
}

function normalizePreviousMap(value: unknown): StrategicPhaseEvolutionMapV1 | null {
  const obj = unwrapMaybeNested(value, "previousStrategicPhaseEvolutionMap");
  if (!isRecord(obj)) return null;
  const score = (obj as any).phaseEvolutionScore as unknown;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return obj as StrategicPhaseEvolutionMapV1;
}

function computeSignalTrends(current: StrategicPhaseEvolutionMapV1["scoreInputs"], previous: StrategicPhaseEvolutionMapV1["scoreInputs"] | null): {
  improving: number;
  degrading: number;
} {
  if (!previous) return { improving: 0, degrading: 0 };

  const keys: (keyof StrategicPhaseEvolutionMapV1["scoreInputs"])[] = [
    "transitionScore",
    "readinessScore",
    "intelligenceStabilityScore",
    "coherenceScore",
    "stabilityScore",
    "alignmentScore",
    "directionScore",
    "evolutionScore",
    "strategicLearningScore",
  ];

  let improving = 0;
  let degrading = 0;

  for (const key of keys) {
    const delta = (current[key] ?? 0) - (previous[key] ?? 0);
    if (delta > 1) improving += 1;
    if (delta < -1) degrading += 1;
  }

  return { improving, degrading };
}

export function buildStrategicPhaseEvolutionMapV1(input: StrategicPhaseEvolutionMapInputV1): StrategicPhaseEvolutionMapV1 {
  const transitionScore = normalizeScoreFrom(input.strategicIntelligencePhaseTransition, "strategicIntelligencePhaseTransition", "transitionScore");
  const readinessScore = normalizeScoreFrom(input.strategicIntelligenceReadinessGate, "strategicIntelligenceReadinessGate", "readinessScore");
  const intelligenceStabilityScore = normalizeScoreFrom(
    input.strategicIntelligenceStabilityModel,
    "strategicIntelligenceStabilityModel",
    "intelligenceStabilityScore",
  );
  const coherenceScore = normalizeScoreFrom(input.strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceScore");
  const stabilityScore = normalizeScoreFrom(input.strategicStabilityEngine, "strategicStabilityEngine", "stabilityScore");
  const alignmentScore = normalizeScoreFrom(input.strategicSelfAlignment, "strategicSelfAlignment", "alignmentScore");
  const directionScore = normalizeScoreFrom(input.strategicDirectionEngine, "strategicDirectionEngine", "directionScore");
  const evolutionScore = normalizeScoreFrom(input.strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore");

  const learningScoreDirect = normalizeOptionalScoreFrom(input.strategicLearningCore, "strategicLearningCore", "strategicLearningScore");
  const learningScoreLegacy = normalizeOptionalScoreFrom(input.strategicLearningCore, "strategicLearningCore", "learningScore");
  const strategicLearningScore = clamp0to100((learningScoreDirect ?? learningScoreLegacy ?? 0) as number);

  const scoreInputs = {
    transitionScore,
    readinessScore,
    intelligenceStabilityScore,
    coherenceScore,
    stabilityScore,
    alignmentScore,
    directionScore,
    evolutionScore,
    strategicLearningScore,
  } as const;

  const baseScore = clamp0to100(
    (transitionScore +
      readinessScore +
      intelligenceStabilityScore +
      coherenceScore +
      stabilityScore +
      alignmentScore +
      directionScore +
      evolutionScore +
      strategicLearningScore) /
      9,
  );

  const transitionState = normalizeTransitionState(input.strategicIntelligencePhaseTransition);
  const readinessState = normalizeReadinessState(input.strategicIntelligenceReadinessGate);
  const coherenceIntegrity = normalizeCoherenceIntegrity(input.strategicCoherenceEngine);
  const stabilityState = normalizeStabilityState(input.strategicStabilityEngine);
  const alignmentState = normalizeAlignmentState(input.strategicSelfAlignment);
  const doctrineLabel = normalizeDoctrineLabel(input.strategicRuntimeAdaptationPolicy);
  const intelligenceTrustState = normalizeIntelligenceTrustState(input.strategicIntelligenceStabilityModel);
  const learningTrajectory = normalizeLearningTrajectory(input.strategicLearningCore);

  const intelligenceStabilityLabel = normalizeLabelFrom(
    input.strategicIntelligenceStabilityModel,
    "strategicIntelligenceStabilityModel",
    "intelligenceStabilityLabel",
  );
  const coherenceLabel = normalizeLabelFrom(input.strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceLabel");
  const stabilityLabel = normalizeLabelFrom(input.strategicStabilityEngine, "strategicStabilityEngine", "stabilityLabel");
  const alignmentLabel = normalizeLabelFrom(input.strategicSelfAlignment, "strategicSelfAlignment", "alignmentLabel");
  const learningTrajectoryRaw = normalizeLabelFrom(input.strategicLearningCore, "strategicLearningCore", "learningTrajectory");

  const driftState = inferDriftState({
    intelligenceStabilityLabel,
    coherenceLabel,
    stabilityLabel,
    learningTrajectory: learningTrajectoryRaw,
  });

  let adjusted = baseScore;

  if (transitionState === "regressive") adjusted -= 20;
  if (readinessState === "blocked") adjusted -= 15;
  if (coherenceIntegrity === "fragmented") adjusted -= 12;
  if (stabilityState === "unstable") adjusted -= 10;
  if (alignmentState === "conflicted") adjusted -= 10;
  if (doctrineLabel === "contained") adjusted -= 8;
  if (driftState === "severe") adjusted -= 8;

  if (transitionState === "advancing") adjusted += 10;
  if (readinessState === "ready") adjusted += 8;
  if (intelligenceTrustState === "trusted") adjusted += 8;
  if (coherenceIntegrity === "integrated") adjusted += 6;
  if (stabilityState === "stable") adjusted += 6;
  if (learningTrajectory === "improving") adjusted += 6;

  const phaseEvolutionScore = clamp0to100(adjusted);
  const phaseLabel = phaseLabelForScore(phaseEvolutionScore);
  const evolutionPhase = evolutionPhaseForLabel(phaseLabel);

  const previousMap = normalizePreviousMap(input.previousStrategicPhaseEvolutionMap);
  const previousScore = typeof previousMap?.phaseEvolutionScore === "number" ? previousMap.phaseEvolutionScore : null;
  const phaseEvolutionDelta = clampDelta(phaseEvolutionScore - (previousScore ?? phaseEvolutionScore));
  const phaseMomentum = computePhaseMomentum(phaseEvolutionDelta);

  const previousScoreInputs = isRecord(previousMap?.scoreInputs) ? (previousMap!.scoreInputs as StrategicPhaseEvolutionMapV1["scoreInputs"]) : null;
  const trends = computeSignalTrends(scoreInputs, previousScoreInputs);
  const phaseProgressionDirection = computeProgressionDirection(
    trends.improving || trends.degrading ? trends.improving : phaseEvolutionDelta > 1 ? 1 : 0,
    trends.improving || trends.degrading ? trends.degrading : phaseEvolutionDelta < -1 ? 1 : 0,
  );

  const phaseStability = computePhaseStability({
    coherenceScore,
    coherenceLabel,
    alignmentScore,
    alignmentLabel,
    stabilityScore,
    stabilityLabel,
    driftState,
  });

  const evolutionContinuity = computeEvolutionContinuity({
    driftState,
    transitionState,
    readinessState,
  });

  const phaseSignals: string[] = [];
  const phaseBlockers: string[] = [];
  const phaseRisks: string[] = [];
  const phaseOpportunities: string[] = [];

  if (transitionState === "advancing" && coherenceIntegrity === "integrated") {
    addUniqueLimited(phaseSignals, "Strategic phase is advancing with improving intelligence cohesion.", 6);
  } else if (transitionState === "regressive") {
    addUniqueLimited(phaseSignals, "Strategic phase is regressing and requires recovery-oriented stabilization.", 6);
  } else if (phaseLabel === "phase-unstable") {
    addUniqueLimited(phaseSignals, "System remains in stabilization-loop phase.", 6);
  } else {
    addUniqueLimited(phaseSignals, `System remains in ${evolutionPhase} phase.`, 6);
  }

  if (phaseProgressionDirection === "oscillating") addUniqueLimited(phaseSignals, "Phase progression is oscillating between forward movement and regression.", 6);
  if (phaseMomentum === "accelerating") addUniqueLimited(phaseSignals, "Phase momentum is accelerating based on recent score deltas.", 6);
  if (phaseMomentum === "decelerating") addUniqueLimited(phaseSignals, "Phase momentum is decelerating based on recent score deltas.", 6);
  if (phaseStability === "unstable") addUniqueLimited(phaseSignals, "Phase stability is weakened by multiple structural weaknesses.", 6);

  if (readinessState === "blocked") addUniqueLimited(phaseBlockers, "Readiness blocked prevents phase transition.", 6);
  if (coherenceIntegrity === "fragmented") addUniqueLimited(phaseBlockers, "Fragmented coherence halts phase progression.", 6);
  if (transitionState === "regressive") addUniqueLimited(phaseBlockers, "Regressive transition state constrains forward phase evolution.", 6);
  if (stabilityState === "unstable") addUniqueLimited(phaseBlockers, "Unstable stability posture blocks durable phase progression.", 6);
  if (alignmentState === "conflicted") addUniqueLimited(phaseBlockers, "Conflicted alignment prevents stable phase advancement.", 6);
  if (driftState === "severe") addUniqueLimited(phaseBlockers, "Severe drift disrupts continuity and blocks phase evolution.", 6);

  if (phaseProgressionDirection === "oscillating") addUniqueLimited(phaseRisks, "Oscillating progression increases strategic uncertainty.", 6);
  if (intelligenceTrustState !== "trusted") addUniqueLimited(phaseRisks, "Low intelligence trust weakens phase durability.", 6);
  if (phaseStability === "unstable") addUniqueLimited(phaseRisks, "Instability increases risk of phase regression under pressure.", 6);
  if (evolutionContinuity === "fragmented") addUniqueLimited(phaseRisks, "Fragmented continuity reduces confidence in near-term evolution forecasting.", 6);
  if (doctrineLabel === "contained") addUniqueLimited(phaseRisks, "Contained doctrine may slow evolution and delay expansion readiness.", 6);

  if (coherenceIntegrity === "integrated" && phaseMomentum !== "decelerating") addUniqueLimited(phaseOpportunities, "High coherence enables phase acceleration.", 6);
  if (alignmentState === "aligned" && stabilityState === "stable") addUniqueLimited(phaseOpportunities, "Stable alignment supports expansion phase.", 6);
  if (intelligenceTrustState === "trusted") addUniqueLimited(phaseOpportunities, "Trusted intelligence supports durable phase progression.", 6);
  if (readinessState === "ready") addUniqueLimited(phaseOpportunities, "Readiness enables controlled transition into the next evolution phase.", 6);
  if (phaseMomentum === "accelerating") addUniqueLimited(phaseOpportunities, "Acceleration momentum can be leveraged to advance maturity faster.", 6);

  const notes: string[] = [];
  addUniqueLimited(notes, "Strategic phase evolution map is interpretive only and does not alter runtime behavior.", 6);
  if (!previousMap) addUniqueLimited(notes, "No previous strategic phase evolution map provided; temporal comparisons are limited.", 6);
  if (driftState === "severe") addUniqueLimited(notes, "Drift inference indicates severe discontinuity risk based on available stability/coherence signals.", 6);
  if (doctrineLabel === "contained") addUniqueLimited(notes, "Runtime doctrine is contained; long-horizon expansion should remain conservative.", 6);
  if (readinessState === "blocked") addUniqueLimited(notes, "Readiness indicates blocked posture; prioritize prerequisites before attempting phase advancement.", 6);

  let temporalEvolutionConfidence = phaseEvolutionScore;
  if (!previousMap) temporalEvolutionConfidence -= 20;
  if (phaseProgressionDirection === "oscillating") temporalEvolutionConfidence -= 10;
  if (phaseStability === "unstable") temporalEvolutionConfidence -= 10;
  if (evolutionContinuity === "fragmented") temporalEvolutionConfidence -= 10;
  if (phaseStability === "stable") temporalEvolutionConfidence += 8;
  if (evolutionContinuity === "continuous") temporalEvolutionConfidence += 6;
  if (phaseMomentum === "accelerating") temporalEvolutionConfidence += 6;
  temporalEvolutionConfidence = clamp0to100(temporalEvolutionConfidence);

  return {
    phaseEvolutionScore,
    phaseEvolutionDelta,
    phaseLabel,
    evolutionPhase,
    phaseProgressionDirection,
    phaseMomentum,
    phaseStability,
    evolutionContinuity,
    temporalEvolutionConfidence,
    scoreInputs: { ...scoreInputs },
    phaseSignals,
    phaseBlockers,
    phaseRisks,
    phaseOpportunities,
    summary: summaryForLabel(phaseLabel),
    notes,
  };
}

