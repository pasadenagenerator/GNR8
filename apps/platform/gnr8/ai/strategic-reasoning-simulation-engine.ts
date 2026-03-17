import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";

import { buildSemiIntelligentStrategicReasoningV1, type SemiIntelligentStrategicReasoningV1 } from "@/gnr8/ai/semi-intelligent-strategic-reasoning";
import { buildStrategicCoherenceEngineV1, type StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import { buildStrategicDirectionEngineV1, type StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import { buildStrategicDriftDetectionV1, type StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import { buildStrategicEvolutionModelV1, type StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import {
  buildStrategicIntelligencePhaseTransitionEngineV1,
  type StrategicIntelligencePhaseTransitionEngineV1,
} from "@/gnr8/ai/strategic-intelligence-phase-transition-engine";
import { buildStrategicIntelligenceReadinessGateV1, type StrategicIntelligenceReadinessGateV1 } from "@/gnr8/ai/strategic-intelligence-readiness-gate";
import {
  buildStrategicIntelligenceStabilityModelV1,
  type StrategicIntelligenceStabilityModelV1,
} from "@/gnr8/ai/strategic-intelligence-stability-model";
import { buildStrategicLearningCoreV1, type StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicPhaseEvolutionMapV1, type StrategicPhaseEvolutionMapV1 } from "@/gnr8/ai/strategic-phase-evolution-map";
import { buildStrategicRuntimeAdaptationPolicyV1, type StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import { buildStrategicSelfAlignmentV1, type StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import { buildStrategicStabilityEngineV1, type StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";

export type StrategicReasoningSimulationEngineV1 = {
  simulationScore: number;
  simulationLabel: "breakdown-risk" | "stalled" | "stabilizing" | "compounding" | "breakthrough-ready";

  dominantSimulatedPath:
    | "reasoning-recovery"
    | "reasoning-consolidation"
    | "reasoning-stabilization"
    | "reasoning-growth"
    | "reasoning-expansion";

  simulationConfidence: number;

  scenarioSet: Array<{
    scenarioId: string;
    scenarioLabel: "breakdown" | "stagnation" | "stabilization" | "growth" | "breakthrough";
    likelihood: "low" | "medium" | "high";
    rationale: string[];
  }>;

  simulationSignals: string[];
  simulationRisks: string[];
  simulationSupports: string[];
  simulationConstraints: string[];
  simulationRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicReasoningSimulationEngineInputV1 = {
  semiStrategicReasoning?: SemiIntelligentStrategicReasoningV1 | Record<string, unknown> | null;
  strategicPhaseEvolutionMap?: StrategicPhaseEvolutionMapV1 | Record<string, unknown> | null;
  strategicIntelligencePhaseTransitionEngine?: StrategicIntelligencePhaseTransitionEngineV1 | Record<string, unknown> | null;
  strategicIntelligenceReadinessGate?: StrategicIntelligenceReadinessGateV1 | Record<string, unknown> | null;
  strategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  strategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  strategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  strategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  strategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  strategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  strategicRuntimeAdaptationPolicy?: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;

  unresolvedRatio?: number;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;
  siteSemanticIntelligence?: SiteSemanticIntelligence | Record<string, unknown> | null;

  previousSemiStrategicReasoning?: SemiIntelligentStrategicReasoningV1 | Record<string, unknown> | null;
  previousStrategicPhaseEvolutionMap?: StrategicPhaseEvolutionMapV1 | Record<string, unknown> | null;
  previousStrategicIntelligencePhaseTransition?: StrategicIntelligencePhaseTransitionEngineV1 | Record<string, unknown> | null;
  previousStrategicIntelligenceReadinessGate?: StrategicIntelligenceReadinessGateV1 | Record<string, unknown> | null;
  previousStrategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  previousStrategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  previousStrategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  previousStrategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  previousStrategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  previousStrategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  previousStrategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  previousStrategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
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

function clamp0to1(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Number.isNaN(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function uniqStableLimited(values: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeUnresolvedRatio(input: StrategicReasoningSimulationEngineInputV1): number {
  return clamp0to1(input.unresolvedRatio, 1);
}

function normalizeConsistencyLabel(input: StrategicReasoningSimulationEngineInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeOptionalScoreFrom(value: unknown, nestedKey: string, key: string): number | null {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return null;
  const raw = (obj as any)[key] as unknown;
  if (typeof raw !== "number" || !Number.isFinite(raw) || Number.isNaN(raw)) return null;
  return clamp0to100(raw);
}

function normalizeLabelFrom(value: unknown, nestedKey: string, key: string): string {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return "";
  return String((obj as any)[key] ?? "").trim();
}

function hasAnyPreviousInputs(input: StrategicReasoningSimulationEngineInputV1): boolean {
  const keys: Array<keyof StrategicReasoningSimulationEngineInputV1> = [
    "previousSemiStrategicReasoning",
    "previousStrategicPhaseEvolutionMap",
    "previousStrategicIntelligencePhaseTransition",
    "previousStrategicIntelligenceReadinessGate",
    "previousStrategicIntelligenceStabilityModel",
    "previousStrategicCoherenceEngine",
    "previousStrategicStabilityEngine",
    "previousStrategicDriftDetection",
    "previousStrategicSelfAlignment",
    "previousStrategicDirectionEngine",
    "previousStrategicEvolutionModel",
    "previousStrategicLearningCore",
  ];
  for (const k of keys) {
    const v = input[k] as unknown;
    if (v === null || typeof v === "undefined") continue;
    if (isRecord(v)) return true;
  }
  return false;
}

function resolveStrategicLearningCore(input: StrategicReasoningSimulationEngineInputV1): StrategicLearningCoreV1 {
  const obj = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  const score = normalizeOptionalScoreFrom(obj, "strategicLearningCore", "strategicLearningScore");
  if (typeof score === "number") return obj as StrategicLearningCoreV1;
  return buildStrategicLearningCoreV1({
    executionLearningSignals: input.executionLearningSignals,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicEvolutionModel(input: StrategicReasoningSimulationEngineInputV1, strategicLearningCore: StrategicLearningCoreV1): StrategicEvolutionModelV1 {
  const obj = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  const score = normalizeOptionalScoreFrom(obj, "strategicEvolutionModel", "evolutionScore");
  if (typeof score === "number") return obj as StrategicEvolutionModelV1;
  return buildStrategicEvolutionModelV1({
    strategicLearningCore,
    executionLearningSignals: input.executionLearningSignals,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicRuntimeAdaptationPolicy(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicRuntimeAdaptationPolicyV1 {
  const obj = unwrapMaybeNested(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy");
  const score = normalizeOptionalScoreFrom(obj, "strategicRuntimeAdaptationPolicy", "doctrineScore");
  if (typeof score === "number") return obj as StrategicRuntimeAdaptationPolicyV1;
  return buildStrategicRuntimeAdaptationPolicyV1({
    strategicEvolutionModel,
    strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicDirectionEngine(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicDirectionEngineV1 {
  const obj = unwrapMaybeNested(input.strategicDirectionEngine, "strategicDirectionEngine");
  const score = normalizeOptionalScoreFrom(obj, "strategicDirectionEngine", "directionScore");
  if (typeof score === "number") return obj as StrategicDirectionEngineV1;
  return buildStrategicDirectionEngineV1({
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicSelfAlignment(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicSelfAlignmentV1 {
  const obj = unwrapMaybeNested(input.strategicSelfAlignment, "strategicSelfAlignment");
  const score = normalizeOptionalScoreFrom(obj, "strategicSelfAlignment", "alignmentScore");
  if (typeof score === "number") return obj as StrategicSelfAlignmentV1;
  return buildStrategicSelfAlignmentV1({
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicDriftDetection(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicSelfAlignment: StrategicSelfAlignmentV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicDriftDetectionV1 {
  const obj = unwrapMaybeNested(input.strategicDriftDetection, "strategicDriftDetection");
  const score = normalizeOptionalScoreFrom(obj, "strategicDriftDetection", "driftScore");
  if (typeof score === "number") return obj as StrategicDriftDetectionV1;
  return buildStrategicDriftDetectionV1({
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
  });
}

function resolveStrategicStabilityEngine(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicDriftDetection: StrategicDriftDetectionV1,
  strategicSelfAlignment: StrategicSelfAlignmentV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicStabilityEngineV1 {
  const obj = unwrapMaybeNested(input.strategicStabilityEngine, "strategicStabilityEngine");
  const score = normalizeOptionalScoreFrom(obj, "strategicStabilityEngine", "stabilityScore");
  if (typeof score === "number") return obj as StrategicStabilityEngineV1;
  return buildStrategicStabilityEngineV1({
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
  });
}

function resolveStrategicCoherenceEngine(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicStabilityEngine: StrategicStabilityEngineV1,
  strategicDriftDetection: StrategicDriftDetectionV1,
  strategicSelfAlignment: StrategicSelfAlignmentV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicCoherenceEngineV1 {
  const obj = unwrapMaybeNested(input.strategicCoherenceEngine, "strategicCoherenceEngine");
  const score = normalizeOptionalScoreFrom(obj, "strategicCoherenceEngine", "coherenceScore");
  if (typeof score === "number") return obj as StrategicCoherenceEngineV1;
  return buildStrategicCoherenceEngineV1({
    strategicStabilityEngine,
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
  });
}

function resolveStrategicIntelligenceStabilityModel(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicCoherenceEngine: StrategicCoherenceEngineV1,
  strategicStabilityEngine: StrategicStabilityEngineV1,
  strategicDriftDetection: StrategicDriftDetectionV1,
  strategicSelfAlignment: StrategicSelfAlignmentV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicIntelligenceStabilityModelV1 {
  const obj = unwrapMaybeNested(input.strategicIntelligenceStabilityModel, "strategicIntelligenceStabilityModel");
  const score = normalizeOptionalScoreFrom(obj, "strategicIntelligenceStabilityModel", "intelligenceStabilityScore");
  if (typeof score === "number") return obj as StrategicIntelligenceStabilityModelV1;
  return buildStrategicIntelligenceStabilityModelV1({
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicCoherenceEngine: input.previousStrategicCoherenceEngine,
    previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
  });
}

function resolveStrategicIntelligenceReadinessGate(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicIntelligenceStabilityModel: StrategicIntelligenceStabilityModelV1,
  strategicCoherenceEngine: StrategicCoherenceEngineV1,
  strategicStabilityEngine: StrategicStabilityEngineV1,
  strategicSelfAlignment: StrategicSelfAlignmentV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
  strategicDriftDetection: StrategicDriftDetectionV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
): StrategicIntelligenceReadinessGateV1 {
  const obj = unwrapMaybeNested(input.strategicIntelligenceReadinessGate, "strategicIntelligenceReadinessGate");
  const score = normalizeOptionalScoreFrom(obj, "strategicIntelligenceReadinessGate", "readinessScore");
  if (typeof score === "number") return obj as StrategicIntelligenceReadinessGateV1;
  return buildStrategicIntelligenceReadinessGateV1({
    strategicIntelligenceStabilityModel,
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicEvolutionModel,
    strategicLearningCore,
    strategicDriftDetection,
    strategicRuntimeAdaptationPolicy,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicIntelligenceStabilityModel: input.previousStrategicIntelligenceStabilityModel,
    previousStrategicCoherenceEngine: input.previousStrategicCoherenceEngine,
    previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
  });
}

function resolveStrategicIntelligencePhaseTransitionEngine(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicIntelligenceReadinessGate: StrategicIntelligenceReadinessGateV1,
  strategicIntelligenceStabilityModel: StrategicIntelligenceStabilityModelV1,
  strategicCoherenceEngine: StrategicCoherenceEngineV1,
  strategicStabilityEngine: StrategicStabilityEngineV1,
  strategicDriftDetection: StrategicDriftDetectionV1,
  strategicSelfAlignment: StrategicSelfAlignmentV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicIntelligencePhaseTransitionEngineV1 {
  const obj = unwrapMaybeNested(input.strategicIntelligencePhaseTransitionEngine, "strategicIntelligencePhaseTransitionEngine");
  const score = normalizeOptionalScoreFrom(obj, "strategicIntelligencePhaseTransitionEngine", "transitionScore");
  if (typeof score === "number") return obj as StrategicIntelligencePhaseTransitionEngineV1;
  return buildStrategicIntelligencePhaseTransitionEngineV1({
    strategicIntelligenceReadinessGate,
    strategicIntelligenceStabilityModel,
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicEvolutionModel,
    strategicLearningCore,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicIntelligenceReadinessGate: input.previousStrategicIntelligenceReadinessGate,
    previousStrategicIntelligenceStabilityModel: input.previousStrategicIntelligenceStabilityModel,
    previousStrategicCoherenceEngine: input.previousStrategicCoherenceEngine,
    previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
  });
}

function resolveStrategicPhaseEvolutionMap(
  input: StrategicReasoningSimulationEngineInputV1,
  strategicIntelligencePhaseTransitionEngine: StrategicIntelligencePhaseTransitionEngineV1,
  strategicIntelligenceReadinessGate: StrategicIntelligenceReadinessGateV1,
  strategicIntelligenceStabilityModel: StrategicIntelligenceStabilityModelV1,
  strategicCoherenceEngine: StrategicCoherenceEngineV1,
  strategicStabilityEngine: StrategicStabilityEngineV1,
  strategicSelfAlignment: StrategicSelfAlignmentV1,
  strategicDirectionEngine: StrategicDirectionEngineV1,
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1,
  strategicEvolutionModel: StrategicEvolutionModelV1,
  strategicLearningCore: StrategicLearningCoreV1,
): StrategicPhaseEvolutionMapV1 {
  const obj = unwrapMaybeNested(input.strategicPhaseEvolutionMap, "strategicPhaseEvolutionMap");
  const score = normalizeOptionalScoreFrom(obj, "strategicPhaseEvolutionMap", "phaseEvolutionScore");
  if (typeof score === "number") return obj as StrategicPhaseEvolutionMapV1;
  return buildStrategicPhaseEvolutionMapV1({
    strategicIntelligencePhaseTransition: strategicIntelligencePhaseTransitionEngine,
    strategicIntelligenceReadinessGate,
    strategicIntelligenceStabilityModel,
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
    previousStrategicPhaseEvolutionMap: input.previousStrategicPhaseEvolutionMap,
  });
}

function resolveSemiStrategicReasoning(
  input: StrategicReasoningSimulationEngineInputV1,
  resolved: {
    strategicLearningCore: StrategicLearningCoreV1;
    strategicEvolutionModel: StrategicEvolutionModelV1;
    strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1;
    strategicDirectionEngine: StrategicDirectionEngineV1;
    strategicSelfAlignment: StrategicSelfAlignmentV1;
    strategicDriftDetection: StrategicDriftDetectionV1;
    strategicStabilityEngine: StrategicStabilityEngineV1;
    strategicCoherenceEngine: StrategicCoherenceEngineV1;
    strategicIntelligenceStabilityModel: StrategicIntelligenceStabilityModelV1;
    strategicIntelligenceReadinessGate: StrategicIntelligenceReadinessGateV1;
    strategicIntelligencePhaseTransitionEngine: StrategicIntelligencePhaseTransitionEngineV1;
    strategicPhaseEvolutionMap: StrategicPhaseEvolutionMapV1;
  },
): SemiIntelligentStrategicReasoningV1 {
  const obj = unwrapMaybeNested(input.semiStrategicReasoning, "semiStrategicReasoning");
  const score = normalizeOptionalScoreFrom(obj, "semiStrategicReasoning", "reasoningScore");
  if (typeof score === "number") return obj as SemiIntelligentStrategicReasoningV1;
  return buildSemiIntelligentStrategicReasoningV1({
    strategicIntelligenceStabilityModel: resolved.strategicIntelligenceStabilityModel,
    strategicCoherenceEngine: resolved.strategicCoherenceEngine,
    strategicStabilityEngine: resolved.strategicStabilityEngine,
    strategicSelfAlignment: resolved.strategicSelfAlignment,
    strategicDirectionEngine: resolved.strategicDirectionEngine,
    strategicEvolutionModel: resolved.strategicEvolutionModel,
    strategicLearningCore: resolved.strategicLearningCore,
    strategicIntelligenceReadinessGate: resolved.strategicIntelligenceReadinessGate,
    strategicIntelligencePhaseTransitionEngine: resolved.strategicIntelligencePhaseTransitionEngine,
    strategicPhaseEvolutionMap: resolved.strategicPhaseEvolutionMap,
    strategicDriftDetection: resolved.strategicDriftDetection,
    unresolvedRatio: input.unresolvedRatio,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    previousStrategicIntelligenceStabilityModel: input.previousStrategicIntelligenceStabilityModel,
    previousStrategicCoherenceEngine: input.previousStrategicCoherenceEngine,
    previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
    previousStrategicIntelligenceReadinessGate: input.previousStrategicIntelligenceReadinessGate,
    previousStrategicPhaseEvolutionMap: input.previousStrategicPhaseEvolutionMap,
  }).semiStrategicReasoning;
}

function simulationLabelForScore(score: number): StrategicReasoningSimulationEngineV1["simulationLabel"] {
  if (score <= 19) return "breakdown-risk";
  if (score <= 39) return "stalled";
  if (score <= 59) return "stabilizing";
  if (score <= 79) return "compounding";
  return "breakthrough-ready";
}

function summaryForSimulationLabel(label: StrategicReasoningSimulationEngineV1["simulationLabel"]): string {
  switch (label) {
    case "breakdown-risk":
      return "Strategic reasoning simulation currently carries meaningful breakdown risk.";
    case "stalled":
      return "Strategic reasoning simulation is currently stalled and requires consolidation.";
    case "stabilizing":
      return "Strategic reasoning simulation is stabilizing under current conditions.";
    case "compounding":
      return "Strategic reasoning simulation is compounding toward stronger maturity.";
    case "breakthrough-ready":
      return "Strategic reasoning simulation is approaching breakthrough-level strategic maturity.";
    default:
      return "Strategic reasoning simulation is stabilizing under current conditions.";
  }
}

function dominantSimulatedPathFrom(input: {
  reasoningLabel: string;
  reasoningMode: string;
  phaseLabel: string;
  transitionLabel: string;
  readinessLabel: string;
  intelligenceStabilityLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  driftLabel: string;
  directionLabel: string;
}): StrategicReasoningSimulationEngineV1["dominantSimulatedPath"] {
  if (input.reasoningLabel === "incoherent" || input.driftLabel === "severe-drift" || input.coherenceLabel === "fragmented") {
    return "reasoning-recovery";
  }

  if (
    input.readinessLabel === "not-ready" ||
    input.readinessLabel === "fragile" ||
    input.stabilityLabel === "unstable" ||
    input.stabilityLabel === "fragile"
  ) {
    return "reasoning-stabilization";
  }

  if (
    input.transitionLabel === "unstable" ||
    input.transitionLabel === "stagnant" ||
    input.phaseLabel === "phase-forming" ||
    input.reasoningMode === "stabilization-reasoning" ||
    input.reasoningMode === "constraint-reasoning"
  ) {
    return "reasoning-consolidation";
  }

  if (input.directionLabel === "advance" || input.transitionLabel === "progressing" || input.reasoningLabel === "structured") {
    return "reasoning-growth";
  }

  return "reasoning-expansion";
}

function clampScenarioScore(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function likelihoodFromComparativeScores(score: number, maxScore: number): "low" | "medium" | "high" {
  const s = clampScenarioScore(score);
  const max = clampScenarioScore(maxScore);
  if (s >= Math.max(70, max - 10)) return "high";
  if (s >= Math.max(40, max - 30)) return "medium";
  return "low";
}

type ScenarioKey = "breakdown" | "stagnation" | "stabilization" | "growth" | "breakthrough";

function buildScenarioRationale(
  scenario: ScenarioKey,
  ctx: {
    reasoningLabel: string;
    reasoningMode: string;
    phaseLabel: string;
    transitionLabel: string;
    readinessLabel: string;
    intelligenceStabilityLabel: string;
    coherenceLabel: string;
    stabilityLabel: string;
    driftLabel: string;
    directionLabel: string;
    consistencyLabel: string;
    unresolvedRatio: number;
  },
): string[] {
  const out: string[] = [];

  if (scenario === "breakdown") {
    if (ctx.reasoningLabel === "incoherent") addUniqueLimited(out, "Incoherent reasoning increases breakdown risk.", 3);
    if (ctx.driftLabel === "severe-drift") addUniqueLimited(out, "Severe drift increases breakdown risk.", 3);
    if (ctx.coherenceLabel === "fragmented") addUniqueLimited(out, "Fragmented coherence increases breakdown risk.", 3);
    if (ctx.readinessLabel === "not-ready") addUniqueLimited(out, "Blocked readiness increases breakdown risk.", 3);
    if (ctx.stabilityLabel === "unstable") addUniqueLimited(out, "Unstable stability increases breakdown risk.", 3);
    if (ctx.consistencyLabel === "low") addUniqueLimited(out, "Low consistency increases breakdown risk.", 3);
    if (ctx.unresolvedRatio > 0.3) addUniqueLimited(out, "High unresolved ratio reduces simulation reliability.", 3);
  }

  if (scenario === "stagnation") {
    if (ctx.transitionLabel === "stagnant") addUniqueLimited(out, "Stagnant transition increases stagnation likelihood.", 3);
    if (ctx.phaseLabel === "phase-forming") addUniqueLimited(out, "Phase-forming posture increases stagnation risk.", 3);
    if (ctx.reasoningMode === "constraint-reasoning") addUniqueLimited(out, "Constraint reasoning supports stagnation risk.", 3);
    if (ctx.reasoningMode === "recovery-reasoning") addUniqueLimited(out, "Recovery reasoning can sustain stagnation pressure.", 3);
    if (ctx.readinessLabel === "fragile") addUniqueLimited(out, "Fragile readiness can slow progression into growth.", 3);
  }

  if (scenario === "stabilization") {
    if (ctx.stabilityLabel === "fragile" || ctx.stabilityLabel === "unstable") addUniqueLimited(out, "Stability weakness increases stabilization necessity.", 3);
    if (ctx.reasoningMode === "stabilization-reasoning") addUniqueLimited(out, "Stabilization reasoning supports a stabilization scenario.", 3);
    if (ctx.reasoningMode === "recovery-reasoning") addUniqueLimited(out, "Recovery reasoning supports stabilization work.", 3);
    if (ctx.driftLabel === "stable" || ctx.driftLabel === "watch") addUniqueLimited(out, "Drift is not severe, supporting recoverable stabilization.", 3);
    if (ctx.coherenceLabel !== "fragmented") addUniqueLimited(out, "Coherence appears recoverable, supporting stabilization.", 3);
  }

  if (scenario === "growth") {
    if (ctx.transitionLabel === "progressing") addUniqueLimited(out, "Progressing transition supports a growth path.", 3);
    if (ctx.directionLabel === "advance") addUniqueLimited(out, "Strategic direction aligns with forward growth.", 3);
    if (ctx.readinessLabel === "ready" || ctx.readinessLabel === "scaling-ready") addUniqueLimited(out, "Readiness supports near-term strategic growth.", 3);
    if (ctx.reasoningLabel === "structured") addUniqueLimited(out, "Structured reasoning supports a growth path.", 3);
    if (ctx.coherenceLabel === "systemic") addUniqueLimited(out, "Systemic coherence supports growth projection.", 3);
    if (ctx.intelligenceStabilityLabel === "durable") addUniqueLimited(out, "Durable intelligence stability supports growth confidence.", 3);
  }

  if (scenario === "breakthrough") {
    if (ctx.reasoningLabel === "strategic") addUniqueLimited(out, "Strategic reasoning supports breakthrough assumptions.", 3);
    if (ctx.phaseLabel === "phase-mature") addUniqueLimited(out, "Phase-mature state supports breakthrough readiness.", 3);
    if (ctx.transitionLabel === "transition-ready") addUniqueLimited(out, "Transition-ready signals support breakthrough projection.", 3);
    if (ctx.readinessLabel === "scaling-ready") addUniqueLimited(out, "Scaling-ready readiness supports breakthrough readiness.", 3);
    if (ctx.intelligenceStabilityLabel === "durable") addUniqueLimited(out, "Durable intelligence stability supports breakthrough readiness.", 3);
    if (ctx.coherenceLabel === "systemic") addUniqueLimited(out, "Systemic coherence supports breakthrough trajectory.", 3);
  }

  return uniqStableLimited(out, 3);
}

function scenarioScoresFrom(ctx: {
  reasoningLabel: string;
  reasoningMode: string;
  phaseLabel: string;
  transitionLabel: string;
  readinessLabel: string;
  intelligenceStabilityLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  driftLabel: string;
  directionLabel: string;
  consistencyLabel: string;
  unresolvedRatio: number;
}): Record<ScenarioKey, number> {
  let breakdownScore = 0;
  if (ctx.reasoningLabel === "incoherent") breakdownScore += 50;
  if (ctx.driftLabel === "severe-drift") breakdownScore += 35;
  if (ctx.coherenceLabel === "fragmented") breakdownScore += 30;
  if (ctx.readinessLabel === "not-ready") breakdownScore += 20;
  if (ctx.readinessLabel === "fragile") breakdownScore += 10;
  if (ctx.stabilityLabel === "unstable") breakdownScore += 20;
  if (ctx.stabilityLabel === "fragile") breakdownScore += 12;
  if (ctx.phaseLabel === "phase-collapse") breakdownScore += 20;
  if (ctx.transitionLabel === "regressing") breakdownScore += 20;
  if (ctx.consistencyLabel === "low") breakdownScore += 15;
  if (ctx.unresolvedRatio > 0.3) breakdownScore += 15;

  let stagnationScore = 10;
  if (ctx.transitionLabel === "stagnant" || ctx.transitionLabel === "unstable") stagnationScore += 25;
  if (ctx.phaseLabel === "phase-forming") stagnationScore += 15;
  if (ctx.reasoningMode === "constraint-reasoning") stagnationScore += 20;
  if (ctx.reasoningMode === "recovery-reasoning") stagnationScore += 16;
  if (ctx.readinessLabel === "fragile") stagnationScore += 14;
  if (ctx.stabilityLabel === "fragile") stagnationScore += 12;
  if (ctx.coherenceLabel === "partial") stagnationScore += 10;
  if (ctx.consistencyLabel === "low") stagnationScore += 10;

  let stabilizationScore = 5;
  if (ctx.stabilityLabel === "unstable") stabilizationScore += 25;
  if (ctx.stabilityLabel === "fragile") stabilizationScore += 18;
  if (ctx.readinessLabel === "not-ready") stabilizationScore += 16;
  if (ctx.readinessLabel === "fragile") stabilizationScore += 10;
  if (ctx.reasoningMode === "stabilization-reasoning") stabilizationScore += 18;
  if (ctx.reasoningMode === "recovery-reasoning") stabilizationScore += 14;
  if (ctx.driftLabel !== "severe-drift") stabilizationScore += 12;
  if (ctx.coherenceLabel !== "fragmented") stabilizationScore += 10;

  let growthScore = 0;
  if (ctx.directionLabel === "advance") growthScore += 25;
  if (ctx.transitionLabel === "progressing") growthScore += 22;
  if (ctx.readinessLabel === "ready") growthScore += 18;
  if (ctx.readinessLabel === "scaling-ready") growthScore += 22;
  if (ctx.stabilityLabel === "stable") growthScore += 12;
  if (ctx.stabilityLabel === "robust") growthScore += 16;
  if (ctx.coherenceLabel === "coherent") growthScore += 10;
  if (ctx.coherenceLabel === "systemic") growthScore += 16;
  if (ctx.reasoningLabel === "structured") growthScore += 16;
  if (ctx.reasoningLabel === "strategic") growthScore += 22;
  if (ctx.intelligenceStabilityLabel === "durable") growthScore += 12;
  if (ctx.driftLabel === "stable") growthScore += 10;

  let breakthroughScore = 0;
  if (ctx.reasoningLabel === "strategic") breakthroughScore += 30;
  if (ctx.phaseLabel === "phase-mature") breakthroughScore += 20;
  if (ctx.transitionLabel === "transition-ready") breakthroughScore += 25;
  if (ctx.readinessLabel === "scaling-ready") breakthroughScore += 25;
  if (ctx.readinessLabel === "ready") breakthroughScore += 15;
  if (ctx.intelligenceStabilityLabel === "durable") breakthroughScore += 20;
  if (ctx.coherenceLabel === "systemic") breakthroughScore += 20;
  if (ctx.stabilityLabel === "robust") breakthroughScore += 10;
  if (ctx.driftLabel === "stable") breakthroughScore += 10;
  if (ctx.consistencyLabel === "high") breakthroughScore += 6;

  return {
    breakdown: clampScenarioScore(breakdownScore),
    stagnation: clampScenarioScore(stagnationScore),
    stabilization: clampScenarioScore(stabilizationScore),
    growth: clampScenarioScore(growthScore),
    breakthrough: clampScenarioScore(breakthroughScore),
  };
}

function buildSignals(ctx: {
  reasoningLabel: string;
  reasoningMode: string;
  coherenceLabel: string;
  driftLabel: string;
  readinessLabel: string;
  stabilityLabel: string;
  intelligenceStabilityLabel: string;
  transitionLabel: string;
  directionLabel: string;
  hasPreviousInputs: boolean;
}): string[] {
  const out: string[] = [];
  if (ctx.reasoningLabel === "strategic") addUniqueLimited(out, "Strategic reasoning supports a forward simulation path.", 6);
  if (ctx.driftLabel === "stable") addUniqueLimited(out, "Low drift supports a stable reasoning future.", 6);
  if ((ctx.readinessLabel === "ready" || ctx.readinessLabel === "scaling-ready") && (ctx.coherenceLabel === "coherent" || ctx.coherenceLabel === "systemic")) {
    addUniqueLimited(out, "Readiness and coherence jointly support growth simulation.", 6);
  }
  if (ctx.intelligenceStabilityLabel === "durable") addUniqueLimited(out, "Durable intelligence stability supports a higher-order reasoning trajectory.", 6);
  if (ctx.hasPreviousInputs) addUniqueLimited(out, "Temporal signals indicate reasoning consolidation.", 6);
  if (ctx.directionLabel === "advance") addUniqueLimited(out, "System direction remains compatible with strategic growth.", 6);
  return uniqStableLimited(out, 6);
}

function buildRisks(ctx: {
  reasoningLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  readinessLabel: string;
  consistencyLabel: string;
  unresolvedRatio: number;
  hasPreviousInputs: boolean;
}): string[] {
  const out: string[] = [];
  if (ctx.reasoningLabel === "incoherent") addUniqueLimited(out, "Incoherent reasoning may force breakdown recovery.", 6);
  if (ctx.coherenceLabel === "fragmented") addUniqueLimited(out, "Fragmented coherence may block future reasoning growth.", 6);
  if (ctx.stabilityLabel === "fragile" || ctx.stabilityLabel === "unstable") addUniqueLimited(out, "Fragile stability increases stagnation risk.", 6);
  if (ctx.readinessLabel === "not-ready" || ctx.readinessLabel === "fragile") addUniqueLimited(out, "Low readiness may cap near-term reasoning progression.", 6);
  if (ctx.consistencyLabel === "low") addUniqueLimited(out, "Weak consistency may slow reasoning growth.", 6);
  if (!ctx.hasPreviousInputs || ctx.unresolvedRatio > 0.3) addUniqueLimited(out, "Temporal volatility may reduce simulation trust.", 6);
  return uniqStableLimited(out, 6);
}

function buildSupports(ctx: {
  intelligenceStabilityLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  readinessLabel: string;
  driftLabel: string;
  directionLabel: string;
}): string[] {
  const out: string[] = [];
  if (ctx.intelligenceStabilityLabel === "durable") addUniqueLimited(out, "Durable intelligence stability supports reasoning advancement.", 6);
  if (ctx.coherenceLabel === "systemic") addUniqueLimited(out, "Systemic coherence strengthens the growth path.", 6);
  if (ctx.stabilityLabel === "robust") addUniqueLimited(out, "Robust stability supports continued reasoning consolidation.", 6);
  if (ctx.readinessLabel === "ready" || ctx.readinessLabel === "scaling-ready") addUniqueLimited(out, "High readiness supports phase progression.", 6);
  if (ctx.driftLabel === "stable") addUniqueLimited(out, "Low drift increases simulation confidence.", 6);
  if (ctx.directionLabel === "advance") addUniqueLimited(out, "Strategic direction remains compatible with future reasoning expansion.", 6);
  return uniqStableLimited(out, 6);
}

function buildConstraints(ctx: {
  readinessLabel: string;
  stabilityLabel: string;
  reasoningMode: string;
  consistencyLabel: string;
  simulationConfidence: number;
  reasoningLabel: string;
}): string[] {
  const out: string[] = [];
  if (ctx.readinessLabel === "not-ready" || ctx.readinessLabel === "fragile") addUniqueLimited(out, "Current readiness constrains reasoning expansion.", 6);
  if (ctx.stabilityLabel === "unstable" || ctx.stabilityLabel === "fragile") addUniqueLimited(out, "Instability constrains near-term strategic progression.", 6);
  if (ctx.reasoningMode === "constraint-reasoning" || ctx.reasoningMode === "stabilization-reasoning") {
    addUniqueLimited(out, "Consolidation is required before broader reasoning growth.", 6);
  }
  if (ctx.reasoningLabel === "incoherent" || ctx.reasoningMode === "recovery-reasoning") addUniqueLimited(out, "Recovery signals limit future acceleration.", 6);
  if (ctx.consistencyLabel === "low") addUniqueLimited(out, "Consistency weaknesses constrain long-horizon reasoning.", 6);
  if (ctx.simulationConfidence < 40) addUniqueLimited(out, "Temporal confidence remains too low for strong expansion assumptions.", 6);
  return uniqStableLimited(out, 6);
}

function buildRecommendations(ctx: {
  dominantSimulatedPath: StrategicReasoningSimulationEngineV1["dominantSimulatedPath"];
  simulationLabel: StrategicReasoningSimulationEngineV1["simulationLabel"];
  readinessLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  intelligenceStabilityLabel: string;
  driftLabel: string;
}): string[] {
  const out: string[] = [];

  if (ctx.dominantSimulatedPath === "reasoning-recovery") addUniqueLimited(out, "Prioritize reasoning stabilization before attempting strategic growth.", 6);
  if (ctx.dominantSimulatedPath === "reasoning-consolidation" || ctx.simulationLabel === "stalled") {
    addUniqueLimited(out, "Use consolidation to reduce stagnation risk.", 6);
  }
  if (ctx.coherenceLabel === "fragmented") addUniqueLimited(out, "Strengthen coherence before relying on breakthrough assumptions.", 6);
  if (ctx.readinessLabel === "not-ready" || ctx.readinessLabel === "fragile") addUniqueLimited(out, "Improve readiness and stability before scaling intelligence reasoning.", 6);
  if (ctx.driftLabel === "drifting" || ctx.driftLabel === "severe-drift") addUniqueLimited(out, "Maintain guided advancement while drift remains controlled.", 6);
  if (ctx.intelligenceStabilityLabel !== "durable" && ctx.simulationLabel !== "breakdown-risk") {
    addUniqueLimited(out, "Delay expansion assumptions until intelligence durability is stronger.", 6);
  }

  return uniqStableLimited(out, 6);
}

function buildNotes(ctx: {
  hasPreviousInputs: boolean;
  simulationConfidence: number;
  simulationLabel: StrategicReasoningSimulationEngineV1["simulationLabel"];
  dominantSimulatedPath: StrategicReasoningSimulationEngineV1["dominantSimulatedPath"];
}): string[] {
  const notes: string[] = [];
  addUniqueLimited(notes, "Strategic reasoning simulation engine v1 is interpretive only and does not alter system behavior.", 6);

  if (!ctx.hasPreviousInputs) addUniqueLimited(notes, "No previous strategic snapshots provided; temporal confidence reduced.", 6);
  if (ctx.simulationConfidence < 40) addUniqueLimited(notes, "Simulation confidence is low; treat scenario likelihoods conservatively.", 6);
  if (ctx.simulationLabel === "breakdown-risk") addUniqueLimited(notes, "Breakdown-risk dominates; prioritize recovery and stabilization signals.", 6);
  if (ctx.dominantSimulatedPath === "reasoning-consolidation") addUniqueLimited(notes, "Consolidation bias detected; defer expansion until consolidation improves.", 6);
  if (ctx.simulationLabel === "compounding" || ctx.simulationLabel === "breakthrough-ready") {
    addUniqueLimited(notes, "Growth supports are strong; maintain disciplined progression.", 6);
  }
  if (ctx.simulationLabel === "breakthrough-ready") addUniqueLimited(notes, "Breakthrough potential detected; preserve coherence and stability under scale.", 6);

  return uniqStableLimited(notes, 6);
}

export function buildStrategicReasoningSimulationEngineV1(
  input: StrategicReasoningSimulationEngineInputV1,
): StrategicReasoningSimulationEngineV1 {
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const hasPreviousInputs = hasAnyPreviousInputs(input);

  const strategicLearningCore = resolveStrategicLearningCore(input);
  const strategicEvolutionModel = resolveStrategicEvolutionModel(input, strategicLearningCore);
  const strategicRuntimeAdaptationPolicy = resolveStrategicRuntimeAdaptationPolicy(input, strategicEvolutionModel, strategicLearningCore);
  const strategicDirectionEngine = resolveStrategicDirectionEngine(input, strategicRuntimeAdaptationPolicy, strategicEvolutionModel, strategicLearningCore);
  const strategicSelfAlignment = resolveStrategicSelfAlignment(
    input,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
  );

  const strategicDriftDetection = resolveStrategicDriftDetection(
    input,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
  );

  const strategicStabilityEngine = resolveStrategicStabilityEngine(
    input,
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
  );

  const strategicCoherenceEngine = resolveStrategicCoherenceEngine(
    input,
    strategicStabilityEngine,
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
  );

  const strategicIntelligenceStabilityModel = resolveStrategicIntelligenceStabilityModel(
    input,
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
  );

  const strategicIntelligenceReadinessGate = resolveStrategicIntelligenceReadinessGate(
    input,
    strategicIntelligenceStabilityModel,
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicEvolutionModel,
    strategicLearningCore,
    strategicDriftDetection,
    strategicRuntimeAdaptationPolicy,
  );

  const strategicIntelligencePhaseTransitionEngine = resolveStrategicIntelligencePhaseTransitionEngine(
    input,
    strategicIntelligenceReadinessGate,
    strategicIntelligenceStabilityModel,
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicDriftDetection,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicEvolutionModel,
    strategicLearningCore,
  );

  const strategicPhaseEvolutionMap = resolveStrategicPhaseEvolutionMap(
    input,
    strategicIntelligencePhaseTransitionEngine,
    strategicIntelligenceReadinessGate,
    strategicIntelligenceStabilityModel,
    strategicCoherenceEngine,
    strategicStabilityEngine,
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
  );

  const semiStrategicReasoning = resolveSemiStrategicReasoning(input, {
    strategicLearningCore,
    strategicEvolutionModel,
    strategicRuntimeAdaptationPolicy,
    strategicDirectionEngine,
    strategicSelfAlignment,
    strategicDriftDetection,
    strategicStabilityEngine,
    strategicCoherenceEngine,
    strategicIntelligenceStabilityModel,
    strategicIntelligenceReadinessGate,
    strategicIntelligencePhaseTransitionEngine,
    strategicPhaseEvolutionMap,
  });

  const reasoningScore = normalizeOptionalScoreFrom(semiStrategicReasoning, "semiStrategicReasoning", "reasoningScore") ?? 0;
  const phaseEvolutionScore = clamp0to100(strategicPhaseEvolutionMap.phaseEvolutionScore);
  const transitionScore = clamp0to100(strategicIntelligencePhaseTransitionEngine.transitionScore);
  const readinessScore = clamp0to100(strategicIntelligenceReadinessGate.readinessScore);
  const intelligenceStabilityScore = clamp0to100(strategicIntelligenceStabilityModel.intelligenceStabilityScore);
  const coherenceScore = clamp0to100(strategicCoherenceEngine.coherenceScore);
  const stabilityScore = clamp0to100(strategicStabilityEngine.stabilityScore);
  const alignmentScore = clamp0to100(strategicSelfAlignment.alignmentScore);
  const directionScore = clamp0to100(strategicDirectionEngine.directionScore);
  const evolutionScore = clamp0to100(strategicEvolutionModel.evolutionScore);
  const strategicLearningScore = clamp0to100(strategicLearningCore.strategicLearningScore);

  const baseSimulationScore = clamp0to100(
    (reasoningScore +
      phaseEvolutionScore +
      transitionScore +
      readinessScore +
      intelligenceStabilityScore +
      coherenceScore +
      stabilityScore +
      alignmentScore +
      directionScore +
      evolutionScore +
      strategicLearningScore) /
      11,
  );

  const reasoningLabel = String(semiStrategicReasoning.reasoningLabel ?? "").trim();
  const reasoningMode = String(semiStrategicReasoning.reasoningMode ?? "").trim();
  const phaseLabel = String(strategicPhaseEvolutionMap.phaseLabel ?? "").trim();
  const transitionLabel = String(strategicIntelligencePhaseTransitionEngine.phaseTransitionLabel ?? "").trim();
  const readinessLabel = String(strategicIntelligenceReadinessGate.readinessLabel ?? "").trim();
  const intelligenceStabilityLabel = String(strategicIntelligenceStabilityModel.intelligenceStabilityLabel ?? "").trim();
  const coherenceLabel = String(strategicCoherenceEngine.coherenceLabel ?? "").trim();
  const stabilityLabel = String(strategicStabilityEngine.stabilityLabel ?? "").trim();
  const driftLabel = String(strategicDriftDetection.driftLabel ?? "").trim();
  const driftType = String(strategicDriftDetection.driftType ?? "").trim();
  const directionLabel = String(strategicDirectionEngine.directionLabel ?? "").trim();

  let simulationScore = baseSimulationScore;

  if (reasoningLabel === "incoherent") simulationScore -= 20;
  if (reasoningLabel === "unstable") simulationScore -= 12;
  if (reasoningMode === "crisis-reasoning") simulationScore -= 15;
  if (reasoningMode === "recovery-reasoning") simulationScore -= 10;
  if (phaseLabel === "phase-collapse") simulationScore -= 18;
  if (transitionLabel === "regressing") simulationScore -= 15;
  if (readinessLabel === "not-ready") simulationScore -= 15;
  if (intelligenceStabilityLabel === "unstable") simulationScore -= 15;
  if (coherenceLabel === "fragmented") simulationScore -= 15;
  if (stabilityLabel === "unstable") simulationScore -= 12;
  if (driftLabel === "severe-drift") simulationScore -= 15;
  if (driftLabel === "drifting") simulationScore -= 8;
  if (consistencyLabel === "low") simulationScore -= 10;
  if (unresolvedRatio > 0.3) simulationScore -= 10;

  if (reasoningLabel === "strategic") simulationScore += 10;
  if (reasoningMode === "strategic-reasoning") simulationScore += 8;
  if (phaseLabel === "phase-mature") simulationScore += 8;
  if (transitionLabel === "transition-ready") simulationScore += 8;
  if (readinessLabel === "ready" || readinessLabel === "scaling-ready") simulationScore += 8;
  if (intelligenceStabilityLabel === "durable") simulationScore += 8;
  if (coherenceLabel === "systemic") simulationScore += 8;
  if (stabilityLabel === "robust") simulationScore += 6;
  if (driftLabel === "stable") simulationScore += 6;
  if (consistencyLabel === "high") simulationScore += 6;

  simulationScore = clamp0to100(simulationScore);
  const simulationLabel = simulationLabelForScore(simulationScore);

  const dominantSimulatedPath = dominantSimulatedPathFrom({
    reasoningLabel,
    reasoningMode,
    phaseLabel,
    transitionLabel,
    readinessLabel,
    intelligenceStabilityLabel,
    coherenceLabel,
    stabilityLabel,
    driftLabel,
    directionLabel,
  });

  let simulationConfidence = simulationScore;
  if (!hasPreviousInputs) simulationConfidence -= 20;
  if (reasoningLabel === "incoherent") simulationConfidence -= 10;
  if (driftType === "oscillatory-drift") simulationConfidence -= 10;
  if (driftType === "compound-drift") simulationConfidence -= 15;
  if (coherenceLabel === "fragmented") simulationConfidence -= 10;
  if (consistencyLabel === "low") simulationConfidence -= 10;
  if (unresolvedRatio > 0.3) simulationConfidence -= 10;

  if (hasPreviousInputs) simulationConfidence += 5;
  if (reasoningLabel === "strategic") simulationConfidence += 6;
  if (phaseLabel === "phase-mature") simulationConfidence += 6;
  if (coherenceLabel === "systemic") simulationConfidence += 5;
  if (intelligenceStabilityLabel === "durable") simulationConfidence += 5;
  if (driftLabel === "stable") simulationConfidence += 5;

  simulationConfidence = clamp0to100(simulationConfidence);

  const scenarioCtx = {
    reasoningLabel,
    reasoningMode,
    phaseLabel,
    transitionLabel,
    readinessLabel,
    intelligenceStabilityLabel,
    coherenceLabel,
    stabilityLabel,
    driftLabel,
    directionLabel,
    consistencyLabel,
    unresolvedRatio,
  };

  const scores = scenarioScoresFrom(scenarioCtx);
  const maxScenarioScore = Math.max(scores.breakdown, scores.stagnation, scores.stabilization, scores.growth, scores.breakthrough);

  const scenarioSet: StrategicReasoningSimulationEngineV1["scenarioSet"] = [
    {
      scenarioId: "scenario-breakdown-v1",
      scenarioLabel: "breakdown",
      likelihood: likelihoodFromComparativeScores(scores.breakdown, maxScenarioScore),
      rationale: buildScenarioRationale("breakdown", scenarioCtx),
    },
    {
      scenarioId: "scenario-stagnation-v1",
      scenarioLabel: "stagnation",
      likelihood: likelihoodFromComparativeScores(scores.stagnation, maxScenarioScore),
      rationale: buildScenarioRationale("stagnation", scenarioCtx),
    },
    {
      scenarioId: "scenario-stabilization-v1",
      scenarioLabel: "stabilization",
      likelihood: likelihoodFromComparativeScores(scores.stabilization, maxScenarioScore),
      rationale: buildScenarioRationale("stabilization", scenarioCtx),
    },
    {
      scenarioId: "scenario-growth-v1",
      scenarioLabel: "growth",
      likelihood: likelihoodFromComparativeScores(scores.growth, maxScenarioScore),
      rationale: buildScenarioRationale("growth", scenarioCtx),
    },
    {
      scenarioId: "scenario-breakthrough-v1",
      scenarioLabel: "breakthrough",
      likelihood: likelihoodFromComparativeScores(scores.breakthrough, maxScenarioScore),
      rationale: buildScenarioRationale("breakthrough", scenarioCtx),
    },
  ];

  const simulationSignals = buildSignals({
    reasoningLabel,
    reasoningMode,
    coherenceLabel,
    driftLabel,
    readinessLabel,
    stabilityLabel,
    intelligenceStabilityLabel,
    transitionLabel,
    directionLabel,
    hasPreviousInputs,
  });

  const simulationRisks = buildRisks({
    reasoningLabel,
    coherenceLabel,
    stabilityLabel,
    readinessLabel,
    consistencyLabel,
    unresolvedRatio,
    hasPreviousInputs,
  });

  const simulationSupports = buildSupports({
    intelligenceStabilityLabel,
    coherenceLabel,
    stabilityLabel,
    readinessLabel,
    driftLabel,
    directionLabel,
  });

  const simulationConstraints = buildConstraints({
    readinessLabel,
    stabilityLabel,
    reasoningMode,
    consistencyLabel,
    simulationConfidence,
    reasoningLabel,
  });

  const simulationRecommendations = buildRecommendations({
    dominantSimulatedPath,
    simulationLabel,
    readinessLabel,
    coherenceLabel,
    stabilityLabel,
    intelligenceStabilityLabel,
    driftLabel,
  });

  const summary = summaryForSimulationLabel(simulationLabel);
  const notes = buildNotes({ hasPreviousInputs, simulationConfidence, simulationLabel, dominantSimulatedPath });

  return {
    simulationScore,
    simulationLabel,
    dominantSimulatedPath,
    simulationConfidence,
    scenarioSet,
    simulationSignals,
    simulationRisks,
    simulationSupports,
    simulationConstraints,
    simulationRecommendations,
    summary,
    notes,
  };
}
