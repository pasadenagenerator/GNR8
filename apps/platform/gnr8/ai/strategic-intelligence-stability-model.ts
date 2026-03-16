import { buildStrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import type { StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import { buildStrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";
import type { StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";
import { buildStrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import type { StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import { buildStrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import { buildStrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import { buildStrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import { buildStrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import { buildStrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";

import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { AdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import type { StrategicAdaptationRuntimeBridgeV1 } from "@/gnr8/ai/strategic-adaptation-runtime-bridge";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

export type StrategicIntelligenceStabilityModelV1 = {
  intelligenceStabilityScore: number;
  intelligenceStabilityLabel: "unstable" | "fragile" | "reliable" | "durable";

  intelligenceTrustState:
    | "low-trust-intelligence"
    | "guarded-intelligence"
    | "trusted-intelligence"
    | "durable-intelligence";

  intelligenceDurability: "breakable" | "pressure-sensitive" | "stable-under-guidance" | "resilient";

  intelligenceTrustConfidence: number;

  intelligenceStabilitySignals: string[];
  intelligenceWeaknesses: string[];
  intelligenceRisks: string[];
  intelligenceSupports: string[];
  intelligenceRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicIntelligenceStabilityModelInputV1 = {
  strategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  strategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  strategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  strategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  strategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  strategicRuntimeAdaptationPolicy?: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;

  strategicAdaptationRuntimeBridge?: StrategicAdaptationRuntimeBridgeV1 | Record<string, unknown> | null;
  adaptiveStrategyRecommendations?: AdaptiveStrategyRecommendationsV1 | Record<string, unknown> | null;
  strategicAdaptationOrchestrator?: StrategicAdaptationOrchestratorV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  adaptiveStrategicFeedback?: AdaptiveStrategicFeedbackV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;
  strategicExecutionRuntimeDecision?: StrategicExecutionRuntimeDecision | Record<string, unknown> | null;
  autonomousExecutionPolicy?: AutonomousExecutionPolicy | Record<string, unknown> | null;
  semiStrategicExecutionController?: SemiStrategicExecutionController | Record<string, unknown> | null;

  strategicSemanticExecutionReadiness?: StrategicSemanticExecutionReadiness | Record<string, unknown> | null;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;
  siteSemanticIntelligence?: SiteSemanticIntelligence | Record<string, unknown> | null;

  unresolvedRatio?: number;

  previousStrategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  previousStrategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  previousStrategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  previousStrategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  previousStrategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  previousStrategicRuntimeAdaptationPolicy?: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;
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

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function normalizeConsistencyLabel(input: StrategicIntelligenceStabilityModelInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeUnresolvedRatio(input: StrategicIntelligenceStabilityModelInputV1): number {
  return clamp0to1(input.unresolvedRatio, 1);
}

function normalizeScoreFrom(value: unknown, nestedKey: string, key: string): number | null {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return null;
  const raw = (obj as any)[key] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : null;
}

function normalizeLabelFrom(value: unknown, nestedKey: string, key: string): string {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return "";
  return String((obj as any)[key] ?? "").trim();
}

function resolveStrategicLearningCore(input: StrategicIntelligenceStabilityModelInputV1): StrategicLearningCoreV1 {
  const obj = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  const score = normalizeScoreFrom(obj, "strategicLearningCore", "strategicLearningScore");
  const legacy = normalizeScoreFrom(obj, "strategicLearningCore", "learningScore");
  if (typeof score === "number" || typeof legacy === "number") return obj as StrategicLearningCoreV1;
  return buildStrategicLearningCoreV1({
    executionLearningSignals: input.executionLearningSignals,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionMemory: input.executionMemory,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicEvolutionModel(input: StrategicIntelligenceStabilityModelInputV1): StrategicEvolutionModelV1 {
  const obj = unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel");
  const score = normalizeScoreFrom(obj, "strategicEvolutionModel", "evolutionScore");
  if (typeof score === "number") return obj as StrategicEvolutionModelV1;
  return buildStrategicEvolutionModelV1({
    strategicLearningCore: input.strategicLearningCore,
    executionLearningSignals: input.executionLearningSignals,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    executionMemory: input.executionMemory,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicRuntimeAdaptationPolicy(input: StrategicIntelligenceStabilityModelInputV1): StrategicRuntimeAdaptationPolicyV1 {
  const obj = unwrapMaybeNested(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy");
  const score = normalizeScoreFrom(obj, "strategicRuntimeAdaptationPolicy", "doctrineScore");
  if (typeof score === "number") return obj as StrategicRuntimeAdaptationPolicyV1;
  return buildStrategicRuntimeAdaptationPolicyV1({
    strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
    adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
    strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
    adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
    strategicEvolutionModel: input.strategicEvolutionModel,
    strategicLearningCore: input.strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicDirectionEngine(input: StrategicIntelligenceStabilityModelInputV1): StrategicDirectionEngineV1 {
  const obj = unwrapMaybeNested(input.strategicDirectionEngine, "strategicDirectionEngine");
  const score = normalizeScoreFrom(obj, "strategicDirectionEngine", "directionScore");
  if (typeof score === "number") return obj as StrategicDirectionEngineV1;
  return buildStrategicDirectionEngineV1({
    strategicRuntimeAdaptationPolicy: input.strategicRuntimeAdaptationPolicy,
    strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
    adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
    strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
    adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
    adaptiveStrategicFeedback: input.adaptiveStrategicFeedback,
    strategicEvolutionModel: input.strategicEvolutionModel,
    strategicLearningCore: input.strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicSelfAlignment(input: StrategicIntelligenceStabilityModelInputV1): StrategicSelfAlignmentV1 {
  const obj = unwrapMaybeNested(input.strategicSelfAlignment, "strategicSelfAlignment");
  const score = normalizeScoreFrom(obj, "strategicSelfAlignment", "alignmentScore");
  if (typeof score === "number") return obj as StrategicSelfAlignmentV1;
  return buildStrategicSelfAlignmentV1({
    strategicDirectionEngine: input.strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy: input.strategicRuntimeAdaptationPolicy,
    strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
    adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
    strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
    adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
    adaptiveStrategicFeedback: input.adaptiveStrategicFeedback,
    strategicEvolutionModel: input.strategicEvolutionModel,
    strategicLearningCore: input.strategicLearningCore,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    unresolvedRatio: input.unresolvedRatio,
  });
}

function resolveStrategicDriftDetection(input: StrategicIntelligenceStabilityModelInputV1): StrategicDriftDetectionV1 {
  const obj = unwrapMaybeNested(input.strategicDriftDetection, "strategicDriftDetection");
  const score = normalizeScoreFrom(obj, "strategicDriftDetection", "driftScore");
  if (typeof score === "number") return obj as StrategicDriftDetectionV1;
  return buildStrategicDriftDetectionV1({
    strategicSelfAlignment: input.strategicSelfAlignment,
    strategicDirectionEngine: input.strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy: input.strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel: input.strategicEvolutionModel,
    strategicLearningCore: input.strategicLearningCore,
    strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
    adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
    strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
    adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
    adaptiveStrategicFeedback: input.adaptiveStrategicFeedback,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicRuntimeAdaptationPolicy: input.previousStrategicRuntimeAdaptationPolicy,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
  });
}

function resolveStrategicStabilityEngine(input: StrategicIntelligenceStabilityModelInputV1): StrategicStabilityEngineV1 {
  const obj = unwrapMaybeNested(input.strategicStabilityEngine, "strategicStabilityEngine");
  const score = normalizeScoreFrom(obj, "strategicStabilityEngine", "stabilityScore");
  if (typeof score === "number") return obj as StrategicStabilityEngineV1;
  return buildStrategicStabilityEngineV1({
    strategicDriftDetection: input.strategicDriftDetection,
    strategicSelfAlignment: input.strategicSelfAlignment,
    strategicDirectionEngine: input.strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy: input.strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel: input.strategicEvolutionModel,
    strategicLearningCore: input.strategicLearningCore,
    strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
    adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
    strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
    adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
    adaptiveStrategicFeedback: input.adaptiveStrategicFeedback,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicRuntimeAdaptationPolicy: input.previousStrategicRuntimeAdaptationPolicy,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
  });
}

function resolveStrategicCoherenceEngine(input: StrategicIntelligenceStabilityModelInputV1): StrategicCoherenceEngineV1 {
  const obj = unwrapMaybeNested(input.strategicCoherenceEngine, "strategicCoherenceEngine");
  const score = normalizeScoreFrom(obj, "strategicCoherenceEngine", "coherenceScore");
  if (typeof score === "number") return obj as StrategicCoherenceEngineV1;
  return buildStrategicCoherenceEngineV1({
    strategicStabilityEngine: input.strategicStabilityEngine,
    strategicDriftDetection: input.strategicDriftDetection,
    strategicSelfAlignment: input.strategicSelfAlignment,
    strategicDirectionEngine: input.strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy: input.strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel: input.strategicEvolutionModel,
    strategicLearningCore: input.strategicLearningCore,
    strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
    adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
    strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
    adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
    adaptiveStrategicFeedback: input.adaptiveStrategicFeedback,
    adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
    executionLearningSignals: input.executionLearningSignals,
    executionMemory: input.executionMemory,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    unresolvedRatio: input.unresolvedRatio,
    previousStrategicStabilityEngine: input.previousStrategicStabilityEngine,
    previousStrategicDriftDetection: input.previousStrategicDriftDetection,
    previousStrategicSelfAlignment: input.previousStrategicSelfAlignment,
    previousStrategicDirectionEngine: input.previousStrategicDirectionEngine,
    previousStrategicRuntimeAdaptationPolicy: input.previousStrategicRuntimeAdaptationPolicy,
    previousStrategicEvolutionModel: input.previousStrategicEvolutionModel,
    previousStrategicLearningCore: input.previousStrategicLearningCore,
  });
}

function intelligenceLabelForScore(score: number): StrategicIntelligenceStabilityModelV1["intelligenceStabilityLabel"] {
  if (score <= 24) return "unstable";
  if (score <= 49) return "fragile";
  if (score <= 74) return "reliable";
  return "durable";
}

function trustStateForLabel(
  label: StrategicIntelligenceStabilityModelV1["intelligenceStabilityLabel"],
): StrategicIntelligenceStabilityModelV1["intelligenceTrustState"] {
  if (label === "unstable") return "low-trust-intelligence";
  if (label === "fragile") return "guarded-intelligence";
  if (label === "reliable") return "trusted-intelligence";
  return "durable-intelligence";
}

function durabilityForLabel(
  label: StrategicIntelligenceStabilityModelV1["intelligenceStabilityLabel"],
): StrategicIntelligenceStabilityModelV1["intelligenceDurability"] {
  if (label === "unstable") return "breakable";
  if (label === "fragile") return "pressure-sensitive";
  if (label === "reliable") return "stable-under-guidance";
  return "resilient";
}

function summaryForLabel(label: StrategicIntelligenceStabilityModelV1["intelligenceStabilityLabel"]): string {
  if (label === "unstable") return "Strategic intelligence is not yet stable enough to be trusted broadly.";
  if (label === "fragile") return "Strategic intelligence is fragile and should be relied on cautiously.";
  if (label === "reliable") return "Strategic intelligence is reliable enough to support guided adaptive evolution.";
  return "Strategic intelligence is durable enough to support resilient adaptive intelligence growth.";
}

function hasAnyPreviousInputs(input: StrategicIntelligenceStabilityModelInputV1): boolean {
  const coherence = normalizeScoreFrom(input.previousStrategicCoherenceEngine, "strategicCoherenceEngine", "coherenceScore");
  const stability = normalizeScoreFrom(input.previousStrategicStabilityEngine, "strategicStabilityEngine", "stabilityScore");
  const drift = normalizeScoreFrom(input.previousStrategicDriftDetection, "strategicDriftDetection", "driftScore");
  const alignment = normalizeScoreFrom(input.previousStrategicSelfAlignment, "strategicSelfAlignment", "alignmentScore");
  const direction = normalizeScoreFrom(input.previousStrategicDirectionEngine, "strategicDirectionEngine", "directionScore");
  const doctrine = normalizeScoreFrom(
    input.previousStrategicRuntimeAdaptationPolicy,
    "strategicRuntimeAdaptationPolicy",
    "doctrineScore",
  );
  const evolution = normalizeScoreFrom(input.previousStrategicEvolutionModel, "strategicEvolutionModel", "evolutionScore");
  const learning =
    normalizeScoreFrom(input.previousStrategicLearningCore, "strategicLearningCore", "strategicLearningScore") ??
    normalizeScoreFrom(input.previousStrategicLearningCore, "strategicLearningCore", "learningScore");

  return [coherence, stability, drift, alignment, direction, doctrine, evolution, learning].some((v) => typeof v === "number");
}

export function buildStrategicIntelligenceStabilityModelV1(
  input: StrategicIntelligenceStabilityModelInputV1,
): StrategicIntelligenceStabilityModelV1 {
  const consistencyLabel = normalizeConsistencyLabel(input);
  const unresolvedRatio = normalizeUnresolvedRatio(input);

  const strategicLearningCore = resolveStrategicLearningCore(input);
  const strategicEvolutionModel = resolveStrategicEvolutionModel({ ...input, strategicLearningCore });
  const strategicRuntimeAdaptationPolicy = resolveStrategicRuntimeAdaptationPolicy({
    ...input,
    strategicLearningCore,
    strategicEvolutionModel,
  });
  const strategicDirectionEngine = resolveStrategicDirectionEngine({
    ...input,
    strategicLearningCore,
    strategicEvolutionModel,
    strategicRuntimeAdaptationPolicy,
  });
  const strategicSelfAlignment = resolveStrategicSelfAlignment({
    ...input,
    strategicLearningCore,
    strategicEvolutionModel,
    strategicRuntimeAdaptationPolicy,
    strategicDirectionEngine,
  });
  const strategicDriftDetection = resolveStrategicDriftDetection({
    ...input,
    strategicLearningCore,
    strategicEvolutionModel,
    strategicRuntimeAdaptationPolicy,
    strategicDirectionEngine,
    strategicSelfAlignment,
  });
  const strategicStabilityEngine = resolveStrategicStabilityEngine({
    ...input,
    strategicLearningCore,
    strategicEvolutionModel,
    strategicRuntimeAdaptationPolicy,
    strategicDirectionEngine,
    strategicSelfAlignment,
    strategicDriftDetection,
  });
  const strategicCoherenceEngine = resolveStrategicCoherenceEngine({
    ...input,
    strategicLearningCore,
    strategicEvolutionModel,
    strategicRuntimeAdaptationPolicy,
    strategicDirectionEngine,
    strategicSelfAlignment,
    strategicDriftDetection,
    strategicStabilityEngine,
  });

  const coherenceScore = normalizeScoreFrom(strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceScore") ?? 0;
  const stabilityScore = normalizeScoreFrom(strategicStabilityEngine, "strategicStabilityEngine", "stabilityScore") ?? 0;
  const alignmentScore = normalizeScoreFrom(strategicSelfAlignment, "strategicSelfAlignment", "alignmentScore") ?? 0;
  const directionScore = normalizeScoreFrom(strategicDirectionEngine, "strategicDirectionEngine", "directionScore") ?? 0;
  const doctrineScore = normalizeScoreFrom(strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineScore") ?? 0;
  const evolutionScore = normalizeScoreFrom(strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore") ?? 0;
  const learningScore =
    normalizeScoreFrom(strategicLearningCore, "strategicLearningCore", "strategicLearningScore") ??
    normalizeScoreFrom(strategicLearningCore, "strategicLearningCore", "learningScore") ??
    0;
  const driftScore = normalizeScoreFrom(strategicDriftDetection, "strategicDriftDetection", "driftScore");
  const driftTerm = typeof driftScore === "number" ? clamp0to100(100 - driftScore) : 0;

  const baseAverage = (coherenceScore + stabilityScore + alignmentScore + directionScore + doctrineScore + evolutionScore + learningScore + driftTerm) / 8;

  const coherenceLabel = normalizeLabelFrom(strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceLabel");
  const stabilityLabel = normalizeLabelFrom(strategicStabilityEngine, "strategicStabilityEngine", "stabilityLabel");
  const alignmentLabel = normalizeLabelFrom(strategicSelfAlignment, "strategicSelfAlignment", "alignmentLabel");
  const driftLabel = normalizeLabelFrom(strategicDriftDetection, "strategicDriftDetection", "driftLabel");
  const doctrineLabel = normalizeLabelFrom(strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineLabel");
  const directionLabel = normalizeLabelFrom(strategicDirectionEngine, "strategicDirectionEngine", "directionLabel");
  const evolutionLabel = normalizeLabelFrom(strategicEvolutionModel, "strategicEvolutionModel", "evolutionLabel");

  const driftType = normalizeLabelFrom(strategicDriftDetection, "strategicDriftDetection", "driftType");
  const strategicAlignmentState = normalizeLabelFrom(strategicSelfAlignment, "strategicSelfAlignment", "strategicAlignmentState");
  const strategicStabilityState = normalizeLabelFrom(strategicStabilityEngine, "strategicStabilityEngine", "strategicStabilityState");
  const strategicCoherenceState = normalizeLabelFrom(strategicCoherenceEngine, "strategicCoherenceEngine", "strategicCoherenceState");

  let intelligenceStabilityScore = clamp0to100(baseAverage);

  if (coherenceLabel === "fragmented") intelligenceStabilityScore -= 18;
  if (coherenceLabel === "partial") intelligenceStabilityScore -= 10;
  if (stabilityLabel === "unstable") intelligenceStabilityScore -= 18;
  if (stabilityLabel === "fragile") intelligenceStabilityScore -= 10;
  if (alignmentLabel === "fragmented") intelligenceStabilityScore -= 12;
  if (alignmentLabel === "tense") intelligenceStabilityScore -= 8;
  if (driftLabel === "drifting") intelligenceStabilityScore -= 12;
  if (driftLabel === "severe-drift") intelligenceStabilityScore -= 20;
  if (doctrineLabel === "contained") intelligenceStabilityScore -= 10;
  if (doctrineLabel === "guarded") intelligenceStabilityScore -= 6;
  if (directionLabel === "recover") intelligenceStabilityScore -= 10;
  if (directionLabel === "stabilize") intelligenceStabilityScore -= 6;
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") intelligenceStabilityScore -= 10;
  if (consistencyLabel === "low") intelligenceStabilityScore -= 12;
  if (unresolvedRatio > 0.3) intelligenceStabilityScore -= 10;

  if (driftType === "compound-drift") intelligenceStabilityScore -= 12;
  if (driftType === "oscillatory-drift") intelligenceStabilityScore -= 8;
  if (strategicAlignmentState === "misaligned") intelligenceStabilityScore -= 10;
  if (strategicStabilityState === "destabilized") intelligenceStabilityScore -= 10;
  if (strategicCoherenceState === "disconnected-system") intelligenceStabilityScore -= 12;

  if (coherenceLabel === "systemic") intelligenceStabilityScore += 10;
  if (stabilityLabel === "robust") intelligenceStabilityScore += 10;
  if (alignmentLabel === "strongly-aligned") intelligenceStabilityScore += 8;
  if (driftLabel === "stable") intelligenceStabilityScore += 8;
  if (doctrineLabel === "progressive" || doctrineLabel === "strategic") intelligenceStabilityScore += 6;
  if (directionLabel === "advance" || directionLabel === "scale-intelligence") intelligenceStabilityScore += 6;
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") intelligenceStabilityScore += 6;
  if (consistencyLabel === "high") intelligenceStabilityScore += 6;

  intelligenceStabilityScore = clamp0to100(intelligenceStabilityScore);

  const intelligenceStabilityLabel = intelligenceLabelForScore(intelligenceStabilityScore);
  const intelligenceTrustState = trustStateForLabel(intelligenceStabilityLabel);
  const intelligenceDurability = durabilityForLabel(intelligenceStabilityLabel);

  const previousInputsAvailable = hasAnyPreviousInputs(input);

  let intelligenceTrustConfidence = intelligenceStabilityScore;
  if (!previousInputsAvailable) intelligenceTrustConfidence -= 20;
  if (consistencyLabel === "low") intelligenceTrustConfidence -= 10;
  if (unresolvedRatio > 0.3) intelligenceTrustConfidence -= 10;
  if (coherenceLabel === "fragmented") intelligenceTrustConfidence -= 10;
  if (driftType === "oscillatory-drift") intelligenceTrustConfidence -= 10;
  if (driftType === "compound-drift") intelligenceTrustConfidence -= 15;
  if (alignmentLabel === "fragmented") intelligenceTrustConfidence -= 10;

  if (previousInputsAvailable) intelligenceTrustConfidence += 5;
  if (coherenceLabel === "systemic") intelligenceTrustConfidence += 5;
  if (stabilityLabel === "robust") intelligenceTrustConfidence += 5;
  if (alignmentLabel === "strongly-aligned") intelligenceTrustConfidence += 5;
  if (driftLabel === "stable") intelligenceTrustConfidence += 5;

  intelligenceTrustConfidence = clamp0to100(intelligenceTrustConfidence);

  const intelligenceStabilitySignals: string[] = [];
  const intelligenceWeaknesses: string[] = [];
  const intelligenceRisks: string[] = [];
  const intelligenceSupports: string[] = [];
  const intelligenceRecommendations: string[] = [];

  if (coherenceLabel === "systemic") {
    addUniqueLimited(intelligenceStabilitySignals, "Strategic coherence supports durable intelligence behavior.", 6);
  } else if (coherenceLabel === "coherent") {
    addUniqueLimited(intelligenceStabilitySignals, "Strategic coherence is sufficient to support stable intelligence behavior.", 6);
  }

  if (stabilityLabel === "robust") {
    addUniqueLimited(intelligenceStabilitySignals, "Strategic stability is sufficient to trust ongoing adaptive evolution.", 6);
  } else if (stabilityLabel === "stable") {
    addUniqueLimited(intelligenceStabilitySignals, "Strategic stability supports guided adaptive evolution.", 6);
  }

  if (driftLabel === "stable") addUniqueLimited(intelligenceStabilitySignals, "Low drift supports intelligence durability.", 6);

  if (alignmentLabel === "strongly-aligned") {
    addUniqueLimited(intelligenceStabilitySignals, "Alignment remains strong enough to sustain trust.", 6);
  } else if (alignmentLabel === "coherent") {
    addUniqueLimited(intelligenceStabilitySignals, "Alignment is coherent enough to sustain trust under guidance.", 6);
  }

  if (doctrineLabel === "progressive" || doctrineLabel === "strategic") {
    addUniqueLimited(intelligenceStabilitySignals, "Runtime doctrine is reinforcing strategic intelligence reliability.", 6);
  }

  if (consistencyLabel === "high") {
    addUniqueLimited(intelligenceStabilitySignals, "High consistency supports a trustworthy intelligence stack.", 6);
  }

  if (driftLabel === "drifting" || driftLabel === "severe-drift") {
    addUniqueLimited(intelligenceWeaknesses, "Strategic drift is reducing intelligence reliability.", 6);
  }
  if (coherenceLabel === "fragmented") {
    addUniqueLimited(intelligenceWeaknesses, "Fragmented coherence weakens trust in the strategic stack.", 6);
  } else if (coherenceLabel === "partial") {
    addUniqueLimited(intelligenceWeaknesses, "Partial coherence weakens trust in the strategic stack.", 6);
  }
  if (stabilityLabel === "unstable" || stabilityLabel === "fragile") {
    addUniqueLimited(intelligenceWeaknesses, "Fragile stability limits intelligence durability.", 6);
  }
  if (directionLabel === "recover" || directionLabel === "stabilize") {
    addUniqueLimited(intelligenceWeaknesses, "Recovery-oriented direction reduces confidence in strategic intelligence.", 6);
  }
  if (consistencyLabel === "low") {
    addUniqueLimited(intelligenceWeaknesses, "Low semantic consistency weakens intelligence trust.", 6);
  }
  if (unresolvedRatio > 0.3) {
    addUniqueLimited(intelligenceWeaknesses, "Unresolved pressure undermines intelligence durability.", 6);
  }

  if (intelligenceStabilityLabel === "unstable") {
    addUniqueLimited(intelligenceRisks, "Low-trust intelligence may not support deeper adaptive reliance.", 6);
  }
  if (driftType === "compound-drift") {
    addUniqueLimited(intelligenceRisks, "Compound drift may destabilize strategic intelligence.", 6);
  }
  if (intelligenceDurability === "pressure-sensitive") {
    addUniqueLimited(intelligenceRisks, "Pressure-sensitive intelligence may not tolerate broader evolution.", 6);
  }
  if (driftType === "oscillatory-drift") {
    addUniqueLimited(intelligenceRisks, "Oscillatory behavior may reduce long-horizon trust.", 6);
  }
  if (coherenceLabel === "fragmented") {
    addUniqueLimited(intelligenceRisks, "Weak coherence may create false confidence in system intelligence.", 6);
  }
  if ((intelligenceStabilityLabel === "unstable" || intelligenceStabilityLabel === "fragile") && (directionLabel === "advance" || directionLabel === "scale-intelligence")) {
    addUniqueLimited(intelligenceRisks, "Expansion under fragile intelligence conditions may be premature.", 6);
  }

  if (coherenceLabel === "systemic") addUniqueLimited(intelligenceSupports, "Systemic coherence supports durable intelligence.", 6);
  if (stabilityLabel === "robust") addUniqueLimited(intelligenceSupports, "Robust stability reinforces intelligence trust.", 6);
  if (alignmentLabel === "strongly-aligned") addUniqueLimited(intelligenceSupports, "Strong alignment supports a reliable strategic stack.", 6);
  if (driftLabel === "stable") addUniqueLimited(intelligenceSupports, "Stable drift profile strengthens long-horizon confidence.", 6);
  if (consistencyLabel === "high") addUniqueLimited(intelligenceSupports, "High consistency supports resilient strategic intelligence.", 6);
  if (doctrineLabel === "progressive" || doctrineLabel === "strategic") {
    addUniqueLimited(intelligenceSupports, "Progressive doctrine supports stronger intelligence durability.", 6);
  }

  if (coherenceLabel === "fragmented" || coherenceLabel === "partial") {
    addUniqueLimited(intelligenceRecommendations, "Strengthen coherence before increasing reliance on strategic intelligence.", 6);
  }
  if (driftLabel === "drifting" || driftLabel === "severe-drift" || driftType === "compound-drift" || driftType === "oscillatory-drift") {
    addUniqueLimited(intelligenceRecommendations, "Reduce drift to improve intelligence durability.", 6);
  }
  if (alignmentLabel === "fragmented" || alignmentLabel === "tense" || strategicAlignmentState === "misaligned") {
    addUniqueLimited(intelligenceRecommendations, "Stabilize alignment before broadening adaptive dependence.", 6);
  }
  if (consistencyLabel === "low") {
    addUniqueLimited(intelligenceRecommendations, "Use consistency improvements to strengthen intelligence trust.", 6);
  }
  if (intelligenceStabilityLabel === "unstable" || intelligenceStabilityLabel === "fragile") {
    addUniqueLimited(intelligenceRecommendations, "Delay higher-order adaptive reliance until fragile intelligence becomes reliable.", 6);
  }
  if (doctrineLabel === "contained" || doctrineLabel === "guarded" || directionLabel === "recover" || directionLabel === "stabilize" || stabilityLabel === "unstable" || stabilityLabel === "fragile") {
    addUniqueLimited(intelligenceRecommendations, "Consolidate doctrine, direction, and stability before scaling intelligence.", 6);
  }

  const notes: string[] = [];
  addUniqueLimited(
    notes,
    "Strategic intelligence stability model v1 is interpretive only and does not alter system behavior.",
    6,
  );

  if (!previousInputsAvailable) {
    addUniqueLimited(notes, "No previous temporal inputs provided; trust confidence is conservatively reduced.", 6);
  }
  if (intelligenceTrustConfidence < 50) {
    addUniqueLimited(notes, "Intelligence trust confidence is low; rely on strategic intelligence cautiously.", 6);
  }
  if (driftLabel === "severe-drift" || driftType === "compound-drift") {
    addUniqueLimited(notes, "Strong drift pressure detected; prioritize drift stabilization.", 6);
  }
  if (coherenceLabel === "systemic") {
    addUniqueLimited(notes, "Strong coherence support detected; intelligence substrate is consolidating.", 6);
  }
  if (intelligenceDurability === "pressure-sensitive") {
    addUniqueLimited(notes, "Intelligence remains pressure-sensitive; avoid broad reliance under high load.", 6);
  }
  if (intelligenceDurability === "resilient") {
    addUniqueLimited(notes, "Intelligence appears resilient under current conditions.", 6);
  }

  return {
    intelligenceStabilityScore,
    intelligenceStabilityLabel,
    intelligenceTrustState,
    intelligenceDurability,
    intelligenceTrustConfidence,
    intelligenceStabilitySignals,
    intelligenceWeaknesses,
    intelligenceRisks,
    intelligenceSupports,
    intelligenceRecommendations,
    summary: summaryForLabel(intelligenceStabilityLabel),
    notes,
  };
}

