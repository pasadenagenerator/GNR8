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
import { buildStrategicSelfAlignmentV1, type StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import { buildStrategicStabilityEngineV1, type StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";

import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { StrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import type { StrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";

export type SemiStrategicReasoningLabelV1 = "incoherent" | "unstable" | "emerging" | "structured" | "strategic";

export type SemiStrategicReasoningModeV1 =
  | "crisis-reasoning"
  | "recovery-reasoning"
  | "stabilization-reasoning"
  | "constraint-reasoning"
  | "adaptive-reasoning"
  | "strategic-reasoning"
  | "exploratory-reasoning";

export type SemiIntelligentStrategicReasoningV1 = {
  reasoningScore: number;
  reasoningLabel: SemiStrategicReasoningLabelV1;
  reasoningMode: SemiStrategicReasoningModeV1;
  reasoningConfidence: number;
  reasoningHypotheses: string[];
  reasoningTensions: string[];
  reasoningSignals: string[];
  reasoningRisks: string[];
  reasoningOpportunities: string[];
  summary: string;
  notes: string[];
};

export type SemiIntelligentStrategicReasoningInputV1 = {
  strategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  strategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  strategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  strategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  strategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  strategicIntelligenceReadinessGate?: StrategicIntelligenceReadinessGateV1 | Record<string, unknown> | null;
  strategicIntelligencePhaseTransitionEngine?: StrategicIntelligencePhaseTransitionEngineV1 | Record<string, unknown> | null;
  strategicPhaseEvolutionMap?: StrategicPhaseEvolutionMapV1 | Record<string, unknown> | null;
  strategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;

  unresolvedRatio?: number;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;
  siteSemanticIntelligence?: SiteSemanticIntelligence | Record<string, unknown> | null;
  strategicSemanticReasoning?: StrategicSemanticReasoning | Record<string, unknown> | null;
  strategicSemanticPlan?: StrategicSemanticPlan | Record<string, unknown> | null;
  strategicSemanticExecutionReadiness?: StrategicSemanticExecutionReadiness | Record<string, unknown> | null;

  previousStrategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  previousStrategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  previousStrategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  previousStrategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  previousStrategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  previousStrategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  previousStrategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  previousStrategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  previousStrategicIntelligenceReadinessGate?: StrategicIntelligenceReadinessGateV1 | Record<string, unknown> | null;
  previousStrategicPhaseEvolutionMap?: StrategicPhaseEvolutionMapV1 | Record<string, unknown> | null;
  previousStrategicIntelligenceState?: Record<string, unknown> | null;
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

function normalizeUnresolvedRatio(input: SemiIntelligentStrategicReasoningInputV1): number {
  return clamp0to1(input.unresolvedRatio, 1);
}

function normalizeOptionalScoreFrom(value: unknown, nestedKey: string, key: string): number | null {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return null;
  const raw = (obj as any)[key] as unknown;
  if (typeof raw !== "number" || !Number.isFinite(raw) || Number.isNaN(raw)) return null;
  return clamp0to100(raw);
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

function reasoningLabelForScore(score: number): SemiStrategicReasoningLabelV1 {
  if (score <= 24) return "incoherent";
  if (score <= 44) return "unstable";
  if (score <= 64) return "emerging";
  if (score <= 84) return "structured";
  return "strategic";
}

function summaryForLabel(label: SemiStrategicReasoningLabelV1): string {
  switch (label) {
    case "incoherent":
      return "Strategic reasoning structure is critically unstable.";
    case "unstable":
      return "Strategic reasoning shows high systemic volatility.";
    case "emerging":
      return "Strategic reasoning structure is forming but incomplete.";
    case "structured":
      return "Strategic reasoning is becoming stable and actionable.";
    case "strategic":
      return "Strategic reasoning capability is fully consolidated.";
    default:
      return "Strategic reasoning structure is forming but incomplete.";
  }
}

function hasPreviousTemporalSignalsFromDriftDetection(drift: StrategicDriftDetectionV1): boolean {
  const notes = Array.isArray(drift.notes) ? drift.notes : [];
  const signals = Array.isArray(drift.driftSignals) ? drift.driftSignals : [];
  const haystack = [...notes, ...signals].join(" ").toLowerCase();
  if (haystack.includes("no previous strategic snapshots were provided")) return false;
  if (haystack.includes("no prior strategic snapshot available for comparison")) return false;
  return true;
}

function isReadinessBlocked(label: string): boolean {
  return label === "not-ready";
}

function isReadinessReady(label: string): boolean {
  return label === "ready" || label === "scaling-ready";
}

function isAlignmentFragmented(input: StrategicSelfAlignmentV1): boolean {
  return input.alignmentLabel === "fragmented" || input.strategicAlignmentState === "misaligned";
}

function isIntelligenceDurabilityHigh(model: StrategicIntelligenceStabilityModelV1): boolean {
  return (
    model.intelligenceStabilityLabel === "durable" ||
    model.intelligenceDurability === "resilient" ||
    model.intelligenceTrustState === "durable-intelligence"
  );
}

type ResolvedStrategicIntelligenceOutputs = {
  strategicLearningCore: StrategicLearningCoreV1;
  strategicEvolutionModel: StrategicEvolutionModelV1;
  strategicDirectionEngine: StrategicDirectionEngineV1;
  strategicSelfAlignment: StrategicSelfAlignmentV1;
  strategicDriftDetection: StrategicDriftDetectionV1;
  strategicStabilityEngine: StrategicStabilityEngineV1;
  strategicCoherenceEngine: StrategicCoherenceEngineV1;
  strategicIntelligenceStabilityModel: StrategicIntelligenceStabilityModelV1;
  strategicIntelligenceReadinessGate: StrategicIntelligenceReadinessGateV1;
  strategicIntelligencePhaseTransitionEngine: StrategicIntelligencePhaseTransitionEngineV1;
  strategicPhaseEvolutionMap: StrategicPhaseEvolutionMapV1;
};

function resolveStrategicIntelligenceOutputs(input: SemiIntelligentStrategicReasoningInputV1): ResolvedStrategicIntelligenceOutputs {
  const unresolvedRatio = normalizeUnresolvedRatio(input);

  const strategicLearningCore: StrategicLearningCoreV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
    const score = normalizeOptionalScoreFrom(provided, "strategicLearningCore", "strategicLearningScore");
    const legacy = normalizeOptionalScoreFrom(provided, "strategicLearningCore", "learningScore");
    if (typeof score === "number" || typeof legacy === "number") return provided as StrategicLearningCoreV1;
    return buildStrategicLearningCoreV1({
      executionLearningSignals: null,
      adaptiveSchedulingSignals: null,
      executionMemory: null,
      siteSemanticConsistency: input.siteSemanticConsistency,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      strategicSemanticReasoning: input.strategicSemanticReasoning,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      strategicExecutionRuntimeDecision: null,
      autonomousExecutionPolicy: null,
      semiStrategicExecutionController: null,
      unresolvedRatio,
    });
  })();

  const strategicEvolutionModel: StrategicEvolutionModelV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
    const score = normalizeOptionalScoreFrom(provided, "strategicEvolutionModel", "evolutionScore");
    if (typeof score === "number") return provided as StrategicEvolutionModelV1;
    return buildStrategicEvolutionModelV1({
      strategicLearningCore,
      executionLearningSignals: null,
      adaptiveSchedulingSignals: null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      executionMemory: null,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });
  })();

  const strategicDirectionEngine: StrategicDirectionEngineV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicDirectionEngine, "strategicDirectionEngine");
    const score = normalizeOptionalScoreFrom(provided, "strategicDirectionEngine", "directionScore");
    if (typeof score === "number") return provided as StrategicDirectionEngineV1;
    return buildStrategicDirectionEngineV1({
      strategicRuntimeAdaptationPolicy: null,
      strategicAdaptationRuntimeBridge: null,
      adaptiveStrategyRecommendations: null,
      strategicAdaptationOrchestrator: null,
      adaptiveStrategicPolicy: null,
      adaptiveStrategicFeedback: null,
      strategicEvolutionModel,
      strategicLearningCore,
      adaptiveSchedulingSignals: null,
      executionLearningSignals: null,
      executionMemory: null,
      strategicExecutionRuntimeDecision: null,
      autonomousExecutionPolicy: null,
      semiStrategicExecutionController: null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      siteSemanticConsistency: input.siteSemanticConsistency,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      unresolvedRatio,
    });
  })();

  const strategicSelfAlignment: StrategicSelfAlignmentV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicSelfAlignment, "strategicSelfAlignment");
    const score = normalizeOptionalScoreFrom(provided, "strategicSelfAlignment", "alignmentScore");
    if (typeof score === "number") return provided as StrategicSelfAlignmentV1;
    return buildStrategicSelfAlignmentV1({
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy: null,
      strategicAdaptationRuntimeBridge: null,
      adaptiveStrategyRecommendations: null,
      strategicAdaptationOrchestrator: null,
      adaptiveStrategicPolicy: null,
      adaptiveStrategicFeedback: null,
      strategicEvolutionModel,
      strategicLearningCore,
      adaptiveSchedulingSignals: null,
      executionLearningSignals: null,
      executionMemory: null,
      strategicExecutionRuntimeDecision: null,
      autonomousExecutionPolicy: null,
      semiStrategicExecutionController: null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      siteSemanticConsistency: input.siteSemanticConsistency,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      unresolvedRatio,
    });
  })();

  const strategicDriftDetection: StrategicDriftDetectionV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicDriftDetection, "strategicDriftDetection");
    const score = normalizeOptionalScoreFrom(provided, "strategicDriftDetection", "driftScore");
    if (typeof score === "number") return provided as StrategicDriftDetectionV1;
    return buildStrategicDriftDetectionV1({
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy: null,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicAdaptationRuntimeBridge: null,
      adaptiveStrategyRecommendations: null,
      strategicAdaptationOrchestrator: null,
      adaptiveStrategicPolicy: null,
      adaptiveStrategicFeedback: null,
      adaptiveSchedulingSignals: null,
      executionLearningSignals: null,
      executionMemory: null,
      strategicExecutionRuntimeDecision: null,
      autonomousExecutionPolicy: null,
      semiStrategicExecutionController: null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      siteSemanticConsistency: input.siteSemanticConsistency,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      unresolvedRatio,
      previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
      previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
      previousStrategicRuntimeAdaptationPolicy: null,
      previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
      previousStrategicLearningCore: input.previousStrategicLearningCore,
    });
  })();

  const strategicStabilityEngine: StrategicStabilityEngineV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicStabilityEngine, "strategicStabilityEngine");
    const score = normalizeOptionalScoreFrom(provided, "strategicStabilityEngine", "stabilityScore");
    if (typeof score === "number") return provided as StrategicStabilityEngineV1;
    return buildStrategicStabilityEngineV1({
      strategicDriftDetection,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy: null,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicAdaptationRuntimeBridge: null,
      adaptiveStrategyRecommendations: null,
      strategicAdaptationOrchestrator: null,
      adaptiveStrategicPolicy: null,
      adaptiveStrategicFeedback: null,
      adaptiveSchedulingSignals: null,
      executionLearningSignals: null,
      executionMemory: null,
      strategicExecutionRuntimeDecision: null,
      autonomousExecutionPolicy: null,
      semiStrategicExecutionController: null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      siteSemanticConsistency: input.siteSemanticConsistency,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      unresolvedRatio,
      previousStrategicDriftDetection: input.previousStrategicDriftDetection,
      previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
      previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
      previousStrategicRuntimeAdaptationPolicy: null,
      previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
      previousStrategicLearningCore: input.previousStrategicLearningCore,
    });
  })();

  const strategicCoherenceEngine: StrategicCoherenceEngineV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicCoherenceEngine, "strategicCoherenceEngine");
    const score = normalizeOptionalScoreFrom(provided, "strategicCoherenceEngine", "coherenceScore");
    if (typeof score === "number") return provided as StrategicCoherenceEngineV1;
    return buildStrategicCoherenceEngineV1({
      strategicStabilityEngine,
      strategicDriftDetection,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy: null,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicAdaptationRuntimeBridge: null,
      adaptiveStrategyRecommendations: null,
      strategicAdaptationOrchestrator: null,
      adaptiveStrategicPolicy: null,
      adaptiveStrategicFeedback: null,
      adaptiveSchedulingSignals: null,
      executionLearningSignals: null,
      executionMemory: null,
      strategicExecutionRuntimeDecision: null,
      autonomousExecutionPolicy: null,
      semiStrategicExecutionController: null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      siteSemanticConsistency: input.siteSemanticConsistency,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      unresolvedRatio,
      previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
      previousStrategicDriftDetection: input.previousStrategicDriftDetection,
      previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
      previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
      previousStrategicRuntimeAdaptationPolicy: null,
      previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
      previousStrategicLearningCore: input.previousStrategicLearningCore,
    });
  })();

  const strategicIntelligenceStabilityModel: StrategicIntelligenceStabilityModelV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicIntelligenceStabilityModel, "strategicIntelligenceStabilityModel");
    const score = normalizeOptionalScoreFrom(provided, "strategicIntelligenceStabilityModel", "intelligenceStabilityScore");
    if (typeof score === "number") return provided as StrategicIntelligenceStabilityModelV1;
    return buildStrategicIntelligenceStabilityModelV1({
      strategicCoherenceEngine,
      strategicStabilityEngine,
      strategicDriftDetection,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy: null,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicAdaptationRuntimeBridge: null,
      adaptiveStrategyRecommendations: null,
      strategicAdaptationOrchestrator: null,
      adaptiveStrategicPolicy: null,
      adaptiveStrategicFeedback: null,
      adaptiveSchedulingSignals: null,
      executionLearningSignals: null,
      executionMemory: null,
      strategicExecutionRuntimeDecision: null,
      autonomousExecutionPolicy: null,
      semiStrategicExecutionController: null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
      siteSemanticConsistency: input.siteSemanticConsistency,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      unresolvedRatio,
      previousStrategicCoherenceEngine: input.previousStrategicCoherenceEngine,
      previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
      previousStrategicDriftDetection: input.previousStrategicDriftDetection,
      previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
      previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
      previousStrategicRuntimeAdaptationPolicy: null,
      previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
      previousStrategicLearningCore: input.previousStrategicLearningCore,
    });
  })();

  const strategicIntelligenceReadinessGate: StrategicIntelligenceReadinessGateV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicIntelligenceReadinessGate, "strategicIntelligenceReadinessGate");
    const score = normalizeOptionalScoreFrom(provided, "strategicIntelligenceReadinessGate", "readinessScore");
    if (typeof score === "number") return provided as StrategicIntelligenceReadinessGateV1;
    return buildStrategicIntelligenceReadinessGateV1({
      strategicIntelligenceStabilityModel,
      strategicCoherenceEngine,
      strategicStabilityEngine,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicDriftDetection,
      adaptiveStrategicPolicy: null,
      strategicRuntimeAdaptationPolicy: null,
      unresolvedRatio,
      siteSemanticConsistency: input.siteSemanticConsistency,
      previousStrategicIntelligenceStabilityModel: input.previousStrategicIntelligenceStabilityModel,
      previousStrategicCoherenceEngine: input.previousStrategicCoherenceEngine,
      previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
      previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
      previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
      previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
      previousStrategicLearningCore: input.previousStrategicLearningCore,
      previousStrategicDriftDetection: input.previousStrategicDriftDetection,
      previousAdaptiveStrategicPolicy: null,
      previousStrategicRuntimeAdaptationPolicy: null,
    });
  })();

  const strategicIntelligencePhaseTransitionEngine: StrategicIntelligencePhaseTransitionEngineV1 = (() => {
    const provided = unwrapMaybeNested(
      input.strategicIntelligencePhaseTransitionEngine,
      "strategicIntelligencePhaseTransitionEngine",
    );
    const score = normalizeOptionalScoreFrom(provided, "strategicIntelligencePhaseTransitionEngine", "transitionScore");
    if (typeof score === "number") return provided as StrategicIntelligencePhaseTransitionEngineV1;
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
      unresolvedRatio,
      previousStrategicIntelligenceState: input.previousStrategicIntelligenceState,
      previousStrategicIntelligenceReadinessGate: input.previousStrategicIntelligenceReadinessGate,
      previousStrategicIntelligenceStabilityModel: input.previousStrategicIntelligenceStabilityModel,
      previousStrategicCoherenceEngine: input.previousStrategicCoherenceEngine,
      previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
      previousStrategicDriftDetection: input.previousStrategicDriftDetection,
    });
  })();

  const strategicPhaseEvolutionMap: StrategicPhaseEvolutionMapV1 = (() => {
    const provided = unwrapMaybeNested(input.strategicPhaseEvolutionMap, "strategicPhaseEvolutionMap");
    const score = normalizeOptionalScoreFrom(provided, "strategicPhaseEvolutionMap", "phaseEvolutionScore");
    if (typeof score === "number") return provided as StrategicPhaseEvolutionMapV1;
    return buildStrategicPhaseEvolutionMapV1({
      strategicIntelligencePhaseTransition: strategicIntelligencePhaseTransitionEngine,
      strategicIntelligenceReadinessGate,
      strategicIntelligenceStabilityModel,
      strategicCoherenceEngine,
      strategicStabilityEngine,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy: null,
      strategicEvolutionModel,
      strategicLearningCore,
      previousStrategicPhaseEvolutionMap: input.previousStrategicPhaseEvolutionMap,
    });
  })();

  return {
    strategicLearningCore,
    strategicEvolutionModel,
    strategicDirectionEngine,
    strategicSelfAlignment,
    strategicDriftDetection,
    strategicStabilityEngine,
    strategicCoherenceEngine,
    strategicIntelligenceStabilityModel,
    strategicIntelligenceReadinessGate,
    strategicIntelligencePhaseTransitionEngine,
    strategicPhaseEvolutionMap,
  };
}

function computeReasoningScore(input: {
  intelligenceStabilityScore: number;
  coherenceScore: number;
  stabilityScore: number;
  alignmentScore: number;
  directionScore: number;
  evolutionScore: number;
  strategicLearningScore: number;
  readinessScore: number;
  phaseTransitionScore: number;
  phaseEvolutionScore: number;
  driftLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  alignmentFragmented: boolean;
  readinessLabel: string;
  unresolvedRatio: number;
  intelligenceStabilityLabel: string;
}): number {
  const base =
    (input.intelligenceStabilityScore +
      input.coherenceScore +
      input.stabilityScore +
      input.alignmentScore +
      input.directionScore +
      input.evolutionScore +
      input.strategicLearningScore +
      input.readinessScore +
      input.phaseTransitionScore +
      input.phaseEvolutionScore) /
    10;

  let score = base;

  if (input.driftLabel === "severe-drift") score -= 18;
  if (input.driftLabel === "drifting") score -= 10;
  if (input.coherenceLabel === "fragmented") score -= 14;
  if (input.stabilityLabel === "fragile") score -= 12;
  if (input.alignmentFragmented) score -= 12;
  if (isReadinessBlocked(input.readinessLabel)) score -= 20;
  if (input.unresolvedRatio > 0.3) score -= 10;
  if (input.intelligenceStabilityLabel === "durable") score += 8;
  if (input.coherenceLabel === "coherent") score += 6;
  if (input.stabilityLabel === "robust") score += 6;
  if (isReadinessReady(input.readinessLabel)) score += 8;

  return clamp0to100(score);
}

function computeReasoningMode(input: {
  driftLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  readinessLabel: string;
  reasoningLabel: SemiStrategicReasoningLabelV1;
}): SemiStrategicReasoningModeV1 {
  if (input.driftLabel === "severe-drift") return "crisis-reasoning";
  if (input.coherenceLabel === "fragmented") return "recovery-reasoning";
  if (input.stabilityLabel === "fragile") return "stabilization-reasoning";
  if (isReadinessBlocked(input.readinessLabel)) return "constraint-reasoning";
  if (input.reasoningLabel === "structured") return "adaptive-reasoning";
  if (input.reasoningLabel === "strategic") return "strategic-reasoning";
  return "exploratory-reasoning";
}

function computeReasoningConfidence(input: {
  reasoningScore: number;
  driftLabel: string;
  coherenceLabel: string;
  hasPreviousTemporalSignals: boolean;
  readinessLabel: string;
  intelligenceDurabilityHigh: boolean;
}): number {
  let confidence = input.reasoningScore;
  if (input.driftLabel === "severe-drift") confidence -= 15;
  if (input.coherenceLabel === "fragmented") confidence -= 10;
  if (!input.hasPreviousTemporalSignals) confidence -= 20;
  if (isReadinessReady(input.readinessLabel)) confidence += 8;
  if (input.intelligenceDurabilityHigh) confidence += 6;
  return clamp0to100(confidence);
}

function buildHypotheses(input: {
  driftLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  readinessLabel: string;
  alignmentFragmented: boolean;
  directionLabel: string;
  intelligenceStabilityLabel: string;
  evolutionScore: number;
  evolutionLabel: string;
  strategicLearningLabel: string;
  phaseTransitionLabel: string;
}): string[] {
  const out: string[] = [];

  if (
    (input.driftLabel === "drifting" || input.driftLabel === "severe-drift") &&
    (input.coherenceLabel === "fragmented" || input.coherenceLabel === "partial") &&
    (input.stabilityLabel === "fragile" || input.stabilityLabel === "unstable")
  ) {
    addUniqueLimited(out, "System instability driven by drift-coherence interaction.", 6);
  }

  if (isReadinessBlocked(input.readinessLabel) && input.alignmentFragmented) {
    addUniqueLimited(out, "Execution maturity blocked by strategic misalignment.", 6);
  }

  if (!isReadinessReady(input.readinessLabel) && input.evolutionScore >= 55 && input.evolutionLabel !== "regressing") {
    addUniqueLimited(out, "Adaptive capacity emerging but constrained by readiness gate.", 6);
  }

  if ((input.directionLabel === "advance" || input.directionLabel === "scale-intelligence") && input.intelligenceStabilityLabel !== "durable") {
    addUniqueLimited(out, "Strategic direction stable but intelligence durability lagging.", 6);
  }

  if (input.evolutionLabel === "unstable" && (input.phaseTransitionLabel === "progressing" || input.phaseTransitionLabel === "transition-ready")) {
    addUniqueLimited(out, "Evolution trajectory inconsistent with policy posture.", 6);
  }

  if (input.driftLabel === "drifting" || input.driftLabel === "severe-drift") {
    if (input.strategicLearningLabel === "adaptive" || input.strategicLearningLabel === "self-stabilizing") {
      addUniqueLimited(out, "Temporal drift disrupting long-horizon learning consolidation.", 6);
    }
  }

  return out;
}

function buildTensions(input: {
  driftLabel: string;
  stabilityLabel: string;
  directionLabel: string;
  evolutionScore: number;
  readinessLabel: string;
  coherenceLabel: string;
  alignmentLabel: string;
  strategicLearningScore: number;
  phaseTransitionLabel: string;
}): string[] {
  const out: string[] = [];

  const driftHigh = input.driftLabel === "drifting" || input.driftLabel === "severe-drift";
  const stabilityHigh = input.stabilityLabel === "stable" || input.stabilityLabel === "robust";
  const stabilityLow = input.stabilityLabel === "unstable" || input.stabilityLabel === "fragile";
  if ((driftHigh && stabilityHigh) || (!driftHigh && stabilityLow)) {
    addUniqueLimited(out, "drift vs stability mismatch", 6);
  }

  if ((input.directionLabel === "advance" || input.directionLabel === "scale-intelligence") && input.evolutionScore <= 44) {
    addUniqueLimited(out, "direction vs policy contradiction", 6);
  }

  if ((input.evolutionScore >= 70 && isReadinessBlocked(input.readinessLabel)) || (input.evolutionScore <= 34 && isReadinessReady(input.readinessLabel))) {
    addUniqueLimited(out, "evolution vs readiness conflict", 6);
  }

  const coherenceHigh = input.coherenceLabel === "coherent" || input.coherenceLabel === "systemic";
  const coherenceLow = input.coherenceLabel === "fragmented";
  const alignmentHigh = input.alignmentLabel === "coherent" || input.alignmentLabel === "strongly-aligned";
  const alignmentLow = input.alignmentLabel === "fragmented";
  if ((coherenceHigh && alignmentLow) || (coherenceLow && alignmentHigh)) {
    addUniqueLimited(out, "coherence vs alignment fracture", 6);
  }

  if ((input.strategicLearningScore >= 70 && !isReadinessReady(input.readinessLabel)) || (input.strategicLearningScore <= 44 && isReadinessReady(input.readinessLabel))) {
    addUniqueLimited(out, "learning vs execution maturity gap", 6);
  }

  if ((input.phaseTransitionLabel === "transition-ready" || input.phaseTransitionLabel === "progressing") && driftHigh) {
    addUniqueLimited(out, "phase transition vs system pressure conflict", 6);
  }

  return out;
}

function buildSignals(input: {
  intelligenceStabilityLabel: string;
  coherenceLabel: string;
  directionScore: number;
  readinessLabel: string;
  learningTrajectory: string;
  evolutionLabel: string;
}): string[] {
  const out: string[] = [];

  if (input.intelligenceStabilityLabel === "durable") addUniqueLimited(out, "intelligence durability strengthening", 6);
  if (input.coherenceLabel === "coherent" || input.coherenceLabel === "systemic") addUniqueLimited(out, "strategic coherence consolidating", 6);
  if (input.directionScore >= 55) addUniqueLimited(out, "adaptive signals emerging", 6);
  if (isReadinessReady(input.readinessLabel)) addUniqueLimited(out, "execution readiness stabilizing", 6);
  if (input.learningTrajectory === "stabilizing" || input.learningTrajectory === "evolving") addUniqueLimited(out, "learning convergence detected", 6);
  if (input.evolutionLabel === "accelerating") addUniqueLimited(out, "system evolution accelerating", 6);

  return out;
}

function buildRisks(input: {
  reasoningLabel: SemiStrategicReasoningLabelV1;
  driftLabel: string;
  directionLabel: string;
  readinessLabel: string;
  coherenceLabel: string;
  alignmentLabel: string;
  driftDirection: string;
  evolutionLabel: string;
  intelligenceStabilityLabel: string;
  autonomyPressure: string;
}): string[] {
  const out: string[] = [];

  if (input.reasoningLabel === "incoherent" || input.reasoningLabel === "unstable" || input.driftLabel === "severe-drift") {
    addUniqueLimited(out, "systemic reasoning collapse risk", 6);
  }

  if ((input.directionLabel === "advance" || input.directionLabel === "scale-intelligence") && !isReadinessReady(input.readinessLabel)) {
    addUniqueLimited(out, "adaptive overextension risk", 6);
  }

  if (input.coherenceLabel === "fragmented" || input.alignmentLabel === "fragmented") {
    addUniqueLimited(out, "strategic fragmentation risk", 6);
  }

  if (input.autonomyPressure === "high" && !isReadinessReady(input.readinessLabel)) {
    addUniqueLimited(out, "premature autonomy reasoning risk", 6);
  }

  const regression =
    input.driftDirection === "worsening" ||
    input.evolutionLabel === "regressing" ||
    (input.intelligenceStabilityLabel !== "durable" && input.driftLabel === "drifting");
  if (regression) addUniqueLimited(out, "temporal intelligence regression risk", 6);

  return out;
}

function buildOpportunities(input: {
  reasoningLabel: SemiStrategicReasoningLabelV1;
  coherenceLabel: string;
  readinessLabel: string;
  evolutionLabel: string;
  alignmentLabel: string;
  learningTrajectory: string;
  driftLabel: string;
}): string[] {
  const out: string[] = [];

  if ((input.reasoningLabel === "emerging" || input.reasoningLabel === "structured") && input.coherenceLabel !== "fragmented") {
    addUniqueLimited(out, "reasoning consolidation opportunity", 6);
  }

  if (
    (input.reasoningLabel === "structured" || input.reasoningLabel === "strategic") &&
    isReadinessReady(input.readinessLabel) &&
    (input.evolutionLabel === "progressing" || input.evolutionLabel === "accelerating")
  ) {
    addUniqueLimited(out, "adaptive intelligence expansion window", 6);
  }

  if (input.learningTrajectory === "stabilizing" && (input.driftLabel === "stable" || input.driftLabel === "watch")) {
    addUniqueLimited(out, "strategic learning stabilization phase", 6);
  }

  if ((input.alignmentLabel === "tense" || input.alignmentLabel === "fragmented") && (input.coherenceLabel === "coherent" || input.coherenceLabel === "systemic")) {
    addUniqueLimited(out, "systemic alignment reinforcement window", 6);
  }

  return out;
}

function buildNotes(input: {
  reasoningMode: SemiStrategicReasoningModeV1;
  driftLabel: string;
  coherenceLabel: string;
  stabilityLabel: string;
  alignmentLabel: string;
  readinessLabel: string;
  unresolvedRatio: number;
}): string[] {
  const notes: string[] = [];

  addUniqueLimited(notes, "Semi-intelligent strategic reasoning is interpretive only and does not alter system execution.", 6);

  if (input.driftLabel === "severe-drift") addUniqueLimited(notes, "Drift is severe; prioritize stabilization and coherence recovery.", 6);
  if (input.coherenceLabel === "fragmented") addUniqueLimited(notes, "Coherence is fragmented; constrain strategic expansion until fractures close.", 6);
  if (input.stabilityLabel === "fragile") addUniqueLimited(notes, "Stability is fragile; reduce system load and reinforce stabilizers.", 6);
  if (input.alignmentLabel === "fragmented") addUniqueLimited(notes, "Alignment is fragmented; resolve conflicts before advancing direction.", 6);
  if (isReadinessBlocked(input.readinessLabel)) addUniqueLimited(notes, "Readiness gate is blocked; execution scaling should remain constrained.", 6);
  if (input.unresolvedRatio > 0.3) addUniqueLimited(notes, "Unresolved page ratio is high; interpretation confidence is reduced.", 6);

  addUniqueLimited(notes, `Reasoning mode: ${input.reasoningMode}.`, 6);

  return uniqStableLimited(notes, 6);
}

export function buildSemiIntelligentStrategicReasoningV1(input: SemiIntelligentStrategicReasoningInputV1): {
  semiStrategicReasoning: SemiIntelligentStrategicReasoningV1;
} {
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const resolved = resolveStrategicIntelligenceOutputs(input);

  const intelligenceStabilityScore = clamp0to100(resolved.strategicIntelligenceStabilityModel.intelligenceStabilityScore);
  const coherenceScore = clamp0to100(resolved.strategicCoherenceEngine.coherenceScore);
  const stabilityScore = clamp0to100(resolved.strategicStabilityEngine.stabilityScore);
  const alignmentScore = clamp0to100(resolved.strategicSelfAlignment.alignmentScore);
  const directionScore = clamp0to100(resolved.strategicDirectionEngine.directionScore);
  const evolutionScore = clamp0to100(resolved.strategicEvolutionModel.evolutionScore);
  const strategicLearningScore = clamp0to100(resolved.strategicLearningCore.strategicLearningScore);
  const readinessScore = clamp0to100(resolved.strategicIntelligenceReadinessGate.readinessScore);
  const phaseTransitionScore = clamp0to100(resolved.strategicIntelligencePhaseTransitionEngine.transitionScore);
  const phaseEvolutionScore = clamp0to100(resolved.strategicPhaseEvolutionMap.phaseEvolutionScore);

  const driftLabel = resolved.strategicDriftDetection.driftLabel;
  const driftDirection = resolved.strategicDriftDetection.driftDirection;
  const coherenceLabel = resolved.strategicCoherenceEngine.coherenceLabel;
  const stabilityLabel = resolved.strategicStabilityEngine.stabilityLabel;
  const alignmentLabel = resolved.strategicSelfAlignment.alignmentLabel;
  const readinessLabel = resolved.strategicIntelligenceReadinessGate.readinessLabel;
  const intelligenceStabilityLabel = resolved.strategicIntelligenceStabilityModel.intelligenceStabilityLabel;
  const phaseTransitionLabel = resolved.strategicIntelligencePhaseTransitionEngine.phaseTransitionLabel;
  const strategicLearningLabel = resolved.strategicLearningCore.strategicLearningLabel;
  const learningTrajectory = resolved.strategicLearningCore.learningTrajectory;
  const evolutionLabel = resolved.strategicEvolutionModel.evolutionLabel;
  const autonomyPressure = resolved.strategicEvolutionModel.autonomyEvolutionSignal?.autonomyPressure ?? "low";

  const alignmentFragmented = isAlignmentFragmented(resolved.strategicSelfAlignment);
  const reasoningScore = computeReasoningScore({
    intelligenceStabilityScore,
    coherenceScore,
    stabilityScore,
    alignmentScore,
    directionScore,
    evolutionScore,
    strategicLearningScore,
    readinessScore,
    phaseTransitionScore,
    phaseEvolutionScore,
    driftLabel,
    coherenceLabel,
    stabilityLabel,
    alignmentFragmented,
    readinessLabel,
    unresolvedRatio,
    intelligenceStabilityLabel,
  });

  const reasoningLabel = reasoningLabelForScore(reasoningScore);
  const reasoningMode = computeReasoningMode({ driftLabel, coherenceLabel, stabilityLabel, readinessLabel, reasoningLabel });

  const hasPreviousTemporalSignals = hasPreviousTemporalSignalsFromDriftDetection(resolved.strategicDriftDetection);
  const intelligenceDurabilityHigh = isIntelligenceDurabilityHigh(resolved.strategicIntelligenceStabilityModel);
  const reasoningConfidence = computeReasoningConfidence({
    reasoningScore,
    driftLabel,
    coherenceLabel,
    hasPreviousTemporalSignals,
    readinessLabel,
    intelligenceDurabilityHigh,
  });

  const reasoningHypotheses = buildHypotheses({
    driftLabel,
    coherenceLabel,
    stabilityLabel,
    readinessLabel,
    alignmentFragmented,
    directionLabel: resolved.strategicDirectionEngine.directionLabel,
    intelligenceStabilityLabel,
    evolutionScore,
    evolutionLabel,
    strategicLearningLabel,
    phaseTransitionLabel,
  });

  const reasoningTensions = buildTensions({
    driftLabel,
    stabilityLabel,
    directionLabel: resolved.strategicDirectionEngine.directionLabel,
    evolutionScore,
    readinessLabel,
    coherenceLabel,
    alignmentLabel,
    strategicLearningScore,
    phaseTransitionLabel,
  });

  const reasoningSignals = buildSignals({
    intelligenceStabilityLabel,
    coherenceLabel,
    directionScore,
    readinessLabel,
    learningTrajectory,
    evolutionLabel,
  });

  const reasoningRisks = buildRisks({
    reasoningLabel,
    driftLabel,
    directionLabel: resolved.strategicDirectionEngine.directionLabel,
    readinessLabel,
    coherenceLabel,
    alignmentLabel,
    driftDirection,
    evolutionLabel,
    intelligenceStabilityLabel,
    autonomyPressure,
  });

  const reasoningOpportunities = buildOpportunities({
    reasoningLabel,
    coherenceLabel,
    readinessLabel,
    evolutionLabel,
    alignmentLabel,
    learningTrajectory,
    driftLabel,
  });

  const notes = buildNotes({
    reasoningMode,
    driftLabel,
    coherenceLabel,
    stabilityLabel,
    alignmentLabel,
    readinessLabel,
    unresolvedRatio,
  });

  const semiStrategicReasoning: SemiIntelligentStrategicReasoningV1 = {
    reasoningScore,
    reasoningLabel,
    reasoningMode,
    reasoningConfidence,
    reasoningHypotheses: uniqStableLimited(reasoningHypotheses, 6),
    reasoningTensions: uniqStableLimited(reasoningTensions, 6),
    reasoningSignals: uniqStableLimited(reasoningSignals, 6),
    reasoningRisks: uniqStableLimited(reasoningRisks, 6),
    reasoningOpportunities: uniqStableLimited(reasoningOpportunities, 6),
    summary: summaryForLabel(reasoningLabel),
    notes: uniqStableLimited(notes, 6),
  };

  return { semiStrategicReasoning };
}
