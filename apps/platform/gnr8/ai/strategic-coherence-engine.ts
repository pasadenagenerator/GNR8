import { buildStrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import { buildStrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import type { StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import { buildStrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import { buildStrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import { buildStrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import { buildStrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";
import type { StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";

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

export type StrategicCoherenceEngineV1 = {
  coherenceScore: number;
  coherenceLabel: "fragmented" | "partial" | "coherent" | "systemic";

  strategicCoherenceState:
    | "disconnected-system"
    | "partially-coherent-system"
    | "coherent-system"
    | "systemically-coherent";

  coherenceIntegrity: "weak" | "guarded" | "stable" | "strong";

  coherenceConfidence: number;

  coherenceSignals: string[];
  coherenceFractures: string[];
  coherenceRisks: string[];
  coherenceSupports: string[];
  coherenceRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicCoherenceEngineInputV1 = {
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

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function normalizeConsistencyLabel(input: StrategicCoherenceEngineInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeUnresolvedRatio(input: StrategicCoherenceEngineInputV1): number {
  return clamp0to1(input.unresolvedRatio, 1);
}

function normalizeScoreFrom(value: unknown, nestedKey: string, key: string): number | null {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return null;
  const raw = (obj as any)[key] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : null;
}

function resolveStrategicLearningCore(input: StrategicCoherenceEngineInputV1): StrategicLearningCoreV1 {
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

function resolveStrategicEvolutionModel(input: StrategicCoherenceEngineInputV1): StrategicEvolutionModelV1 {
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

function resolveStrategicRuntimeAdaptationPolicy(input: StrategicCoherenceEngineInputV1): StrategicRuntimeAdaptationPolicyV1 {
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

function resolveStrategicDirectionEngine(input: StrategicCoherenceEngineInputV1): StrategicDirectionEngineV1 {
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

function resolveStrategicSelfAlignment(input: StrategicCoherenceEngineInputV1): StrategicSelfAlignmentV1 {
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

function resolveStrategicDriftDetection(input: StrategicCoherenceEngineInputV1): StrategicDriftDetectionV1 {
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

function resolveStrategicStabilityEngine(input: StrategicCoherenceEngineInputV1): StrategicStabilityEngineV1 {
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

function coherenceLabelForScore(score: number): StrategicCoherenceEngineV1["coherenceLabel"] {
  if (score <= 24) return "fragmented";
  if (score <= 49) return "partial";
  if (score <= 74) return "coherent";
  return "systemic";
}

function coherenceStateForLabel(label: StrategicCoherenceEngineV1["coherenceLabel"]): StrategicCoherenceEngineV1["strategicCoherenceState"] {
  if (label === "fragmented") return "disconnected-system";
  if (label === "partial") return "partially-coherent-system";
  if (label === "coherent") return "coherent-system";
  return "systemically-coherent";
}

function coherenceIntegrityForLabel(label: StrategicCoherenceEngineV1["coherenceLabel"]): StrategicCoherenceEngineV1["coherenceIntegrity"] {
  if (label === "fragmented") return "weak";
  if (label === "partial") return "guarded";
  if (label === "coherent") return "stable";
  return "strong";
}

function summaryForLabel(label: StrategicCoherenceEngineV1["coherenceLabel"]): string {
  if (label === "fragmented") return "Strategic coherence is fragmented and the system is not yet behaving as one intelligence.";
  if (label === "partial") return "Strategic coherence is partial and requires consolidation before broader evolution.";
  if (label === "coherent") return "Strategic coherence is sufficient for coordinated adaptive evolution.";
  return "Strategic coherence is strong enough to support systemic adaptive intelligence.";
}

type CoherenceSnapshot = {
  stability: StrategicStabilityEngineV1;
  selfAlignment: StrategicSelfAlignmentV1;
  direction: StrategicDirectionEngineV1;
  doctrine: StrategicRuntimeAdaptationPolicyV1;
  evolution: StrategicEvolutionModelV1;
  learning: StrategicLearningCoreV1;
  drift: StrategicDriftDetectionV1;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  unresolvedRatio: number;
};

function resolveSnapshot(input: StrategicCoherenceEngineInputV1): CoherenceSnapshot {
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);

  const learning = resolveStrategicLearningCore(input);
  const evolution = resolveStrategicEvolutionModel({ ...input, strategicLearningCore: learning });
  const doctrine = resolveStrategicRuntimeAdaptationPolicy({ ...input, strategicLearningCore: learning, strategicEvolutionModel: evolution });
  const direction = resolveStrategicDirectionEngine({
    ...input,
    strategicLearningCore: learning,
    strategicEvolutionModel: evolution,
    strategicRuntimeAdaptationPolicy: doctrine,
  });
  const selfAlignment = resolveStrategicSelfAlignment({
    ...input,
    strategicLearningCore: learning,
    strategicEvolutionModel: evolution,
    strategicRuntimeAdaptationPolicy: doctrine,
    strategicDirectionEngine: direction,
  });
  const drift = resolveStrategicDriftDetection({
    ...input,
    strategicLearningCore: learning,
    strategicEvolutionModel: evolution,
    strategicRuntimeAdaptationPolicy: doctrine,
    strategicDirectionEngine: direction,
    strategicSelfAlignment: selfAlignment,
  });
  const stability = resolveStrategicStabilityEngine({
    ...input,
    strategicLearningCore: learning,
    strategicEvolutionModel: evolution,
    strategicRuntimeAdaptationPolicy: doctrine,
    strategicDirectionEngine: direction,
    strategicSelfAlignment: selfAlignment,
    strategicDriftDetection: drift,
  });

  return { stability, selfAlignment, direction, doctrine, evolution, learning, drift, consistencyLabel, unresolvedRatio };
}

function normalizeLearningScore(value: StrategicLearningCoreV1): number {
  const raw = (value as any).strategicLearningScore ?? (value as any).learningScore;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return clamp0to100(raw);
}

function computeBaseCoherenceScore(snapshot: CoherenceSnapshot): number {
  const stabilityScore = clamp0to100(snapshot.stability.stabilityScore);
  const alignmentScore = clamp0to100(snapshot.selfAlignment.alignmentScore);
  const directionScore = clamp0to100(snapshot.direction.directionScore);
  const doctrineScore = clamp0to100(snapshot.doctrine.doctrineScore);
  const evolutionScore = clamp0to100(snapshot.evolution.evolutionScore);
  const learningScore = normalizeLearningScore(snapshot.learning);
  const driftComponent = clamp0to100(100 - clamp0to100(snapshot.drift.driftScore));

  const avg = (stabilityScore + alignmentScore + directionScore + doctrineScore + evolutionScore + learningScore + driftComponent) / 7;
  return clamp0to100(avg);
}

function countExplicitConflicts(snapshot: CoherenceSnapshot): number {
  if (!Array.isArray((snapshot.selfAlignment as any).alignmentConflicts)) return 0;
  return (snapshot.selfAlignment as any).alignmentConflicts.map((v: unknown) => String(v ?? "").trim()).filter(Boolean).length;
}

function computeCoherenceScore(snapshot: CoherenceSnapshot): number {
  let score = computeBaseCoherenceScore(snapshot);

  const stabilityLabel = snapshot.stability.stabilityLabel;
  const alignmentLabel = snapshot.selfAlignment.alignmentLabel;
  const driftLabel = snapshot.drift.driftLabel;
  const doctrineLabel = snapshot.doctrine.doctrineLabel;
  const directionLabel = snapshot.direction.directionLabel;
  const evolutionLabel = snapshot.evolution.evolutionLabel;
  const consistencyLabel = snapshot.consistencyLabel;
  const unresolvedRatio = snapshot.unresolvedRatio;

  if (stabilityLabel === "unstable") score -= 18;
  if (stabilityLabel === "fragile") score -= 10;
  if (alignmentLabel === "fragmented") score -= 15;
  if (alignmentLabel === "tense") score -= 8;
  if (driftLabel === "drifting") score -= 12;
  if (driftLabel === "severe-drift") score -= 20;
  if (doctrineLabel === "contained") score -= 12;
  if (doctrineLabel === "guarded") score -= 8;
  if (directionLabel === "recover") score -= 10;
  if (directionLabel === "stabilize") score -= 6;
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") score -= 10;
  if (consistencyLabel === "low") score -= 12;
  if (unresolvedRatio > 0.3) score -= 10;

  const explicitConflicts = countExplicitConflicts(snapshot);
  if (explicitConflicts >= 2) score -= 12;
  if (snapshot.drift.driftType === "compound-drift") score -= 12;
  if (snapshot.drift.driftType === "oscillatory-drift") score -= 8;
  if (snapshot.selfAlignment.strategicAlignmentState === "misaligned") score -= 10;
  if (snapshot.stability.strategicStabilityState === "destabilized") score -= 10;

  if (stabilityLabel === "robust") score += 10;
  if (alignmentLabel === "strongly-aligned") score += 10;
  if (driftLabel === "stable") score += 8;
  if (doctrineLabel === "progressive" || doctrineLabel === "strategic") score += 8;
  if (directionLabel === "advance" || directionLabel === "scale-intelligence") score += 6;
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") score += 6;
  if (consistencyLabel === "high") score += 6;

  return clamp0to100(score);
}

function computeCoherenceConfidence(
  coherenceScore: number,
  snapshot: CoherenceSnapshot,
  hasAnyPrevious: boolean,
  explicitConflicts: number,
): number {
  let confidence = coherenceScore;

  if (hasAnyPrevious) confidence += 5;
  else confidence -= 20;

  if (snapshot.consistencyLabel === "low") confidence -= 10;
  if (snapshot.unresolvedRatio > 0.3) confidence -= 10;
  if (snapshot.selfAlignment.alignmentLabel === "fragmented") confidence -= 10;
  if (snapshot.drift.driftType === "oscillatory-drift") confidence -= 10;
  if (snapshot.drift.driftType === "compound-drift") confidence -= 15;
  if (explicitConflicts >= 2) confidence -= 10;

  if (snapshot.stability.stabilityLabel === "robust") confidence += 5;
  if (snapshot.selfAlignment.alignmentLabel === "strongly-aligned") confidence += 5;
  if (snapshot.drift.driftLabel === "stable") confidence += 5;
  if (snapshot.doctrine.doctrineLabel === "strategic") confidence += 5;

  return clamp0to100(confidence);
}

function buildSignals(snapshot: CoherenceSnapshot, coherenceLabel: StrategicCoherenceEngineV1["coherenceLabel"]): string[] {
  const out: string[] = [];

  if (snapshot.stability.stabilityLabel === "robust" && snapshot.selfAlignment.alignmentLabel === "strongly-aligned") {
    addUniqueLimited(out, "Strategic stability and alignment reinforce each other.", 6);
  }

  if (snapshot.drift.driftLabel === "stable") addUniqueLimited(out, "Low drift supports broader system coherence.", 6);

  const doctrineForward = snapshot.doctrine.doctrineLabel === "progressive" || snapshot.doctrine.doctrineLabel === "strategic";
  const directionForward = snapshot.direction.directionLabel === "advance" || snapshot.direction.directionLabel === "scale-intelligence";
  if (doctrineForward && directionForward) addUniqueLimited(out, "Runtime doctrine remains coherent with strategic direction.", 6);

  if (
    (snapshot.evolution.evolutionLabel === "progressing" || snapshot.evolution.evolutionLabel === "accelerating") &&
    (snapshot.stability.stabilityLabel === "stable" || snapshot.stability.stabilityLabel === "robust")
  ) {
    addUniqueLimited(out, "Strategic evolution is aligned with stable system behavior.", 6);
  }

  if (snapshot.consistencyLabel === "high") addUniqueLimited(out, "High consistency supports a unified strategic system.", 6);

  if (coherenceLabel === "coherent" || coherenceLabel === "systemic") {
    addUniqueLimited(out, "Multiple strategic layers are converging coherently.", 6);
  }

  return out;
}

function buildFractures(snapshot: CoherenceSnapshot, explicitConflicts: number): string[] {
  const out: string[] = [];

  if (snapshot.selfAlignment.alignmentLabel === "fragmented") addUniqueLimited(out, "Strategic alignment remains fragmented.", 6);
  if (snapshot.drift.driftLabel === "drifting" || snapshot.drift.driftLabel === "severe-drift") {
    addUniqueLimited(out, "Drift is weakening broader system coherence.", 6);
  }

  const doctrineRestrictive = snapshot.doctrine.doctrineLabel === "contained" || snapshot.doctrine.doctrineLabel === "guarded";
  const directionForward = snapshot.direction.directionLabel === "advance" || snapshot.direction.directionLabel === "scale-intelligence";
  if (doctrineRestrictive && directionForward) addUniqueLimited(out, "Runtime doctrine is not coherent with strategic direction.", 6);

  if (explicitConflicts >= 2) addUniqueLimited(out, "Conflicting priorities are fracturing system-wide coherence.", 6);
  if (snapshot.consistencyLabel === "low") addUniqueLimited(out, "Low semantic consistency is reducing whole-system integrity.", 6);
  if (snapshot.stability.strategicStabilityState === "destabilized" || snapshot.stability.stabilityLabel === "unstable") {
    addUniqueLimited(out, "Destabilized stability state prevents systemic coherence.", 6);
  }
  if (snapshot.unresolvedRatio > 0.3) addUniqueLimited(out, "Unresolved pressure is reducing global strategic coherence.", 6);

  return out;
}

function buildRisks(
  coherenceLabel: StrategicCoherenceEngineV1["coherenceLabel"],
  confidence: number,
  snapshot: CoherenceSnapshot,
  explicitConflicts: number,
): string[] {
  const out: string[] = [];

  if (coherenceLabel === "fragmented") addUniqueLimited(out, "Fragmented coherence may limit adaptive evolution.", 6);
  if (snapshot.drift.driftType === "compound-drift") addUniqueLimited(out, "Compound drift may prevent system-wide strategic convergence.", 6);
  if (coherenceLabel === "partial") addUniqueLimited(out, "Partial coherence may mask deeper strategic instability.", 6);
  if (confidence < 50) addUniqueLimited(out, "Low confidence reduces trust in coherence progression.", 6);
  if (snapshot.doctrine.doctrineLabel === "contained" || snapshot.doctrine.doctrineLabel === "guarded") {
    addUniqueLimited(out, "Weak doctrine may slow coherence formation.", 6);
  }
  if (explicitConflicts >= 2 || snapshot.consistencyLabel === "low") {
    addUniqueLimited(out, "System may appear stable locally while remaining globally incoherent.", 6);
  }

  return out;
}

function buildSupports(snapshot: CoherenceSnapshot): string[] {
  const out: string[] = [];

  if (snapshot.selfAlignment.alignmentLabel === "strongly-aligned") addUniqueLimited(out, "Strong alignment supports global coherence.", 6);
  if (snapshot.stability.stabilityLabel === "robust") addUniqueLimited(out, "Robust stability reinforces systemic integrity.", 6);
  if (snapshot.drift.driftLabel === "stable") addUniqueLimited(out, "Stable drift profile supports temporal coherence.", 6);
  if (snapshot.consistencyLabel === "high") addUniqueLimited(out, "High consistency supports strategic unification.", 6);
  if (snapshot.doctrine.doctrineLabel === "progressive" || snapshot.doctrine.doctrineLabel === "strategic") {
    addUniqueLimited(out, "Progressive doctrine supports coherent expansion.", 6);
  }

  const doctrineForward = snapshot.doctrine.doctrineLabel === "progressive" || snapshot.doctrine.doctrineLabel === "strategic";
  const directionForward = snapshot.direction.directionLabel === "advance" || snapshot.direction.directionLabel === "scale-intelligence";
  if (doctrineForward && directionForward) addUniqueLimited(out, "Direction and runtime posture are reinforcing one another.", 6);

  return out;
}

function buildRecommendations(
  coherenceLabel: StrategicCoherenceEngineV1["coherenceLabel"],
  confidence: number,
  snapshot: CoherenceSnapshot,
  explicitConflicts: number,
): string[] {
  const out: string[] = [];

  if (explicitConflicts >= 2) addUniqueLimited(out, "Reduce strategic fractures before expanding adaptive scope.", 6);
  if (snapshot.selfAlignment.alignmentLabel === "fragmented" || snapshot.selfAlignment.alignmentLabel === "tense") {
    addUniqueLimited(out, "Use alignment repair to strengthen whole-system coherence.", 6);
  }
  if (snapshot.drift.driftLabel === "drifting" || snapshot.drift.driftLabel === "severe-drift") {
    addUniqueLimited(out, "Stabilize drift before relying on stronger strategic unification.", 6);
  }
  if (snapshot.consistencyLabel === "low") addUniqueLimited(out, "Improve consistency to support systemic coherence.", 6);

  const doctrineRestrictive = snapshot.doctrine.doctrineLabel === "contained" || snapshot.doctrine.doctrineLabel === "guarded";
  const directionForward = snapshot.direction.directionLabel === "advance" || snapshot.direction.directionLabel === "scale-intelligence";
  if (doctrineRestrictive && directionForward) addUniqueLimited(out, "Consolidate runtime doctrine and strategic direction.", 6);

  if (coherenceLabel === "fragmented" || (coherenceLabel === "partial" && confidence < 55)) {
    addUniqueLimited(out, "Delay broader evolution until coherence confidence improves.", 6);
  }

  return out;
}

function buildNotes(
  coherenceConfidence: number,
  snapshot: CoherenceSnapshot,
  hasAnyPrevious: boolean,
  coherenceLabel: StrategicCoherenceEngineV1["coherenceLabel"],
): string[] {
  const out: string[] = [];
  addUniqueLimited(out, "Strategic coherence engine v1 is interpretive only and does not alter system behavior.", 6);

  if (!hasAnyPrevious) {
    addUniqueLimited(out, "Previous strategic baselines were not provided; coherence confidence is conservatively reduced.", 6);
  }
  if (coherenceConfidence < 50) addUniqueLimited(out, "Coherence confidence is low; treat this reading as a guarded signal.", 6);
  if (snapshot.drift.driftLabel === "drifting" || snapshot.drift.driftLabel === "severe-drift") {
    addUniqueLimited(out, "Drift dynamics are present and may erode temporal coherence.", 6);
  }
  if (snapshot.selfAlignment.alignmentLabel === "strongly-aligned") {
    addUniqueLimited(out, "Strong self-alignment is currently supporting global coherence.", 6);
  }
  if (snapshot.consistencyLabel === "low") addUniqueLimited(out, "Low semantic consistency is gating systemic coherence formation.", 6);
  if (coherenceLabel === "systemic" && coherenceConfidence >= 75) {
    addUniqueLimited(out, "Systemic coherence is present; preserve stability, low drift, and alignment to maintain it.", 6);
  }

  return out.slice(0, 6);
}

export function buildStrategicCoherenceEngineV1(input: StrategicCoherenceEngineInputV1): StrategicCoherenceEngineV1 {
  const snapshot = resolveSnapshot(input);

  const coherenceScore = computeCoherenceScore(snapshot);
  const coherenceLabel = coherenceLabelForScore(coherenceScore);
  const strategicCoherenceState = coherenceStateForLabel(coherenceLabel);
  const coherenceIntegrity = coherenceIntegrityForLabel(coherenceLabel);

  const hasAnyPrevious =
    typeof normalizeScoreFrom(input.previousStrategicStabilityEngine, "previousStrategicStabilityEngine", "stabilityScore") === "number" ||
    typeof normalizeScoreFrom(input.previousStrategicDriftDetection, "previousStrategicDriftDetection", "driftScore") === "number" ||
    typeof normalizeScoreFrom(input.previousStrategicSelfAlignment, "previousStrategicSelfAlignment", "alignmentScore") === "number" ||
    typeof normalizeScoreFrom(input.previousStrategicDirectionEngine, "previousStrategicDirectionEngine", "directionScore") === "number" ||
    typeof normalizeScoreFrom(input.previousStrategicRuntimeAdaptationPolicy, "previousStrategicRuntimeAdaptationPolicy", "doctrineScore") === "number" ||
    typeof normalizeScoreFrom(input.previousStrategicEvolutionModel, "previousStrategicEvolutionModel", "evolutionScore") === "number" ||
    typeof normalizeScoreFrom(input.previousStrategicLearningCore, "previousStrategicLearningCore", "strategicLearningScore") === "number" ||
    typeof normalizeScoreFrom(input.previousStrategicLearningCore, "previousStrategicLearningCore", "learningScore") === "number";

  const explicitConflicts = countExplicitConflicts(snapshot);
  const coherenceConfidence = computeCoherenceConfidence(coherenceScore, snapshot, hasAnyPrevious, explicitConflicts);

  const coherenceSignals = buildSignals(snapshot, coherenceLabel);
  const coherenceFractures = buildFractures(snapshot, explicitConflicts);
  const coherenceRisks = buildRisks(coherenceLabel, coherenceConfidence, snapshot, explicitConflicts);
  const coherenceSupports = buildSupports(snapshot);
  const coherenceRecommendations = buildRecommendations(coherenceLabel, coherenceConfidence, snapshot, explicitConflicts);
  const summary = summaryForLabel(coherenceLabel);
  const notes = buildNotes(coherenceConfidence, snapshot, hasAnyPrevious, coherenceLabel);

  const result: StrategicCoherenceEngineV1 = {
    coherenceScore,
    coherenceLabel,
    strategicCoherenceState,
    coherenceIntegrity,
    coherenceConfidence,
    coherenceSignals,
    coherenceFractures,
    coherenceRisks,
    coherenceSupports,
    coherenceRecommendations,
    summary,
    notes,
  };

  return result;
}
