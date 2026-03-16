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

export type StrategicStabilityEngineV1 = {
  stabilityScore: number;
  stabilityLabel: "unstable" | "fragile" | "stable" | "robust";

  strategicStabilityState: "destabilized" | "recovering-stability" | "evolution-stable" | "stability-resilient";

  stabilityTolerance: "cannot-tolerate-expansion" | "limited-tolerance" | "guided-tolerance" | "high-tolerance";

  stabilityConfidence: number;

  stabilitySignals: string[];
  stabilityWeaknesses: string[];
  stabilityRisks: string[];
  stabilitySupports: string[];
  stabilityRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicStabilityEngineInputV1 = {
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

function normalizeConsistencyLabel(input: StrategicStabilityEngineInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeUnresolvedRatio(input: StrategicStabilityEngineInputV1): number {
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

function resolveStrategicSelfAlignment(input: StrategicStabilityEngineInputV1): StrategicSelfAlignmentV1 {
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

function resolveStrategicDirectionEngine(input: StrategicStabilityEngineInputV1): StrategicDirectionEngineV1 {
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

function resolveStrategicRuntimeAdaptationPolicy(input: StrategicStabilityEngineInputV1): StrategicRuntimeAdaptationPolicyV1 {
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

function resolveStrategicEvolutionModel(input: StrategicStabilityEngineInputV1): StrategicEvolutionModelV1 {
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

function resolveStrategicLearningCore(input: StrategicStabilityEngineInputV1): StrategicLearningCoreV1 {
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

function resolveStrategicDriftDetection(
  input: StrategicStabilityEngineInputV1,
  resolved: {
    strategicSelfAlignment: StrategicSelfAlignmentV1;
    strategicDirectionEngine: StrategicDirectionEngineV1;
    strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1;
    strategicEvolutionModel: StrategicEvolutionModelV1;
    strategicLearningCore: StrategicLearningCoreV1;
  },
): StrategicDriftDetectionV1 {
  const obj = unwrapMaybeNested(input.strategicDriftDetection, "strategicDriftDetection");
  const score = normalizeScoreFrom(obj, "strategicDriftDetection", "driftScore");
  if (typeof score === "number") return obj as StrategicDriftDetectionV1;
  return buildStrategicDriftDetectionV1({
    strategicSelfAlignment: resolved.strategicSelfAlignment,
    strategicDirectionEngine: resolved.strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy: resolved.strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel: resolved.strategicEvolutionModel,
    strategicLearningCore: resolved.strategicLearningCore,
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

function stabilityLabelForScore(score: number): StrategicStabilityEngineV1["stabilityLabel"] {
  if (score <= 24) return "unstable";
  if (score <= 49) return "fragile";
  if (score <= 74) return "stable";
  return "robust";
}

function strategicStabilityStateForLabel(label: StrategicStabilityEngineV1["stabilityLabel"]): StrategicStabilityEngineV1["strategicStabilityState"] {
  if (label === "unstable") return "destabilized";
  if (label === "fragile") return "recovering-stability";
  if (label === "stable") return "evolution-stable";
  return "stability-resilient";
}

function stabilityToleranceForLabel(label: StrategicStabilityEngineV1["stabilityLabel"]): StrategicStabilityEngineV1["stabilityTolerance"] {
  if (label === "unstable") return "cannot-tolerate-expansion";
  if (label === "fragile") return "limited-tolerance";
  if (label === "stable") return "guided-tolerance";
  return "high-tolerance";
}

function summaryForLabel(label: StrategicStabilityEngineV1["stabilityLabel"]): string {
  switch (label) {
    case "unstable":
      return "Strategic stability is insufficient and broader evolution should pause.";
    case "fragile":
      return "Strategic stability is fragile and further evolution should remain limited.";
    case "stable":
      return "Strategic stability is sufficient for guided adaptive progression.";
    case "robust":
      return "Strategic stability is strong enough to support resilient adaptive evolution.";
    default:
      return "Strategic stability is insufficient and broader evolution should pause.";
  }
}

function rankForLabel(label: string, order: readonly string[]): number | null {
  const idx = order.indexOf(label);
  return idx >= 0 ? idx : null;
}

function isWorseLabel(current: string, previous: string, order: readonly string[]): boolean {
  const c = rankForLabel(current, order);
  const p = rankForLabel(previous, order);
  if (c === null || p === null) return false;
  return c > p;
}

function hasAnyPreviousInputs(input: StrategicStabilityEngineInputV1): boolean {
  return (
    isRecord(unwrapMaybeNested(input.previousStrategicDriftDetection, "strategicDriftDetection")) ||
    isRecord(unwrapMaybeNested(input.previousStrategicSelfAlignment, "strategicSelfAlignment")) ||
    isRecord(unwrapMaybeNested(input.previousStrategicDirectionEngine, "strategicDirectionEngine")) ||
    isRecord(unwrapMaybeNested(input.previousStrategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy")) ||
    isRecord(unwrapMaybeNested(input.previousStrategicEvolutionModel, "strategicEvolutionModel")) ||
    isRecord(unwrapMaybeNested(input.previousStrategicLearningCore, "strategicLearningCore"))
  );
}

export function buildStrategicStabilityEngineV1(input: StrategicStabilityEngineInputV1): StrategicStabilityEngineV1 {
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);

  const strategicSelfAlignment = resolveStrategicSelfAlignment(input);
  const strategicDirectionEngine = resolveStrategicDirectionEngine(input);
  const strategicRuntimeAdaptationPolicy = resolveStrategicRuntimeAdaptationPolicy(input);
  const strategicEvolutionModel = resolveStrategicEvolutionModel(input);
  const strategicLearningCore = resolveStrategicLearningCore(input);

  const strategicDriftDetection = resolveStrategicDriftDetection(input, {
    strategicSelfAlignment,
    strategicDirectionEngine,
    strategicRuntimeAdaptationPolicy,
    strategicEvolutionModel,
    strategicLearningCore,
  });

  const alignmentScore = normalizeScoreFrom(strategicSelfAlignment, "strategicSelfAlignment", "alignmentScore") ?? 0;
  const directionScore = normalizeScoreFrom(strategicDirectionEngine, "strategicDirectionEngine", "directionScore") ?? 0;
  const doctrineScore = normalizeScoreFrom(strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineScore") ?? 0;
  const evolutionScore = normalizeScoreFrom(strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore") ?? 0;

  const strategicLearningScore =
    normalizeScoreFrom(strategicLearningCore, "strategicLearningCore", "strategicLearningScore") ??
    normalizeScoreFrom(strategicLearningCore, "strategicLearningCore", "learningScore") ??
    0;

  const driftScoreRaw = normalizeScoreFrom(strategicDriftDetection, "strategicDriftDetection", "driftScore");
  const invertedDriftScore = typeof driftScoreRaw === "number" ? clamp0to100(100 - driftScoreRaw) : 0;

  const baseAverage = clamp0to100((alignmentScore + directionScore + doctrineScore + evolutionScore + strategicLearningScore + invertedDriftScore) / 6);

  const driftLabel = normalizeLabelFrom(strategicDriftDetection, "strategicDriftDetection", "driftLabel");
  const driftType = normalizeLabelFrom(strategicDriftDetection, "strategicDriftDetection", "driftType");
  const alignmentLabel = normalizeLabelFrom(strategicSelfAlignment, "strategicSelfAlignment", "alignmentLabel");
  const doctrineLabel = normalizeLabelFrom(strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineLabel");
  const directionLabel = normalizeLabelFrom(strategicDirectionEngine, "strategicDirectionEngine", "directionLabel");
  const evolutionLabel = normalizeLabelFrom(strategicEvolutionModel, "strategicEvolutionModel", "evolutionLabel");

  let stabilityScore = baseAverage;

  if (driftLabel === "drifting") stabilityScore -= 12;
  if (driftLabel === "severe-drift") stabilityScore -= 20;
  if (alignmentLabel === "fragmented") stabilityScore -= 15;
  if (alignmentLabel === "tense") stabilityScore -= 8;
  if (doctrineLabel === "contained") stabilityScore -= 15;
  if (doctrineLabel === "guarded") stabilityScore -= 8;
  if (directionLabel === "recover") stabilityScore -= 12;
  if (directionLabel === "stabilize") stabilityScore -= 8;
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") stabilityScore -= 10;
  if (consistencyLabel === "low") stabilityScore -= 12;
  if (unresolvedRatio > 0.3) stabilityScore -= 10;

  const previousAvailable = hasAnyPreviousInputs(input);
  if (previousAvailable) {
    const prevDriftLabel = normalizeLabelFrom(input.previousStrategicDriftDetection, "strategicDriftDetection", "driftLabel");
    const prevAlignmentLabel = normalizeLabelFrom(input.previousStrategicSelfAlignment, "strategicSelfAlignment", "alignmentLabel");
    const prevDoctrineLabel = normalizeLabelFrom(input.previousStrategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineLabel");
    const prevDirectionLabel = normalizeLabelFrom(input.previousStrategicDirectionEngine, "strategicDirectionEngine", "directionLabel");
    const prevEvolutionLabel = normalizeLabelFrom(input.previousStrategicEvolutionModel, "strategicEvolutionModel", "evolutionLabel");

    if (isWorseLabel(driftLabel, prevDriftLabel, ["stable", "watch", "drifting", "severe-drift"] as const)) stabilityScore -= 8;
    if (isWorseLabel(alignmentLabel, prevAlignmentLabel, ["strongly-aligned", "coherent", "tense", "fragmented"] as const))
      stabilityScore -= 8;
    if (isWorseLabel(doctrineLabel, prevDoctrineLabel, ["strategic", "progressive", "adaptive", "guarded", "contained"] as const))
      stabilityScore -= 8;
    if (isWorseLabel(directionLabel, prevDirectionLabel, ["scale-intelligence", "advance", "focus", "stabilize", "recover"] as const))
      stabilityScore -= 6;
    if (isWorseLabel(evolutionLabel, prevEvolutionLabel, ["accelerating", "progressing", "stagnating", "unstable", "regressing"] as const))
      stabilityScore -= 6;
  }

  if (driftLabel === "stable") stabilityScore += 8;
  if (alignmentLabel === "coherent" || alignmentLabel === "strongly-aligned") stabilityScore += 8;
  if (doctrineLabel === "progressive" || doctrineLabel === "strategic") stabilityScore += 8;
  if (directionLabel === "advance" || directionLabel === "scale-intelligence") stabilityScore += 6;
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") stabilityScore += 6;
  if (consistencyLabel === "high") stabilityScore += 6;

  stabilityScore = clamp0to100(stabilityScore);

  const stabilityLabel = stabilityLabelForScore(stabilityScore);
  const strategicStabilityState = strategicStabilityStateForLabel(stabilityLabel);
  const stabilityTolerance = stabilityToleranceForLabel(stabilityLabel);

  let stabilityConfidence = stabilityScore;
  if (!previousAvailable) stabilityConfidence -= 20;
  if (driftType === "oscillatory-drift") stabilityConfidence -= 10;
  if (driftType === "compound-drift") stabilityConfidence -= 15;
  if (consistencyLabel === "low") stabilityConfidence -= 10;
  if (unresolvedRatio > 0.3) stabilityConfidence -= 10;
  if (alignmentLabel === "fragmented") stabilityConfidence -= 10;

  if (previousAvailable) stabilityConfidence += 5;
  if (driftLabel === "stable") stabilityConfidence += 5;
  if (alignmentLabel === "strongly-aligned") stabilityConfidence += 5;
  if (doctrineLabel === "strategic") stabilityConfidence += 5;

  stabilityConfidence = clamp0to100(stabilityConfidence);

  const stabilitySignals: string[] = [];
  const stabilityWeaknesses: string[] = [];
  const stabilityRisks: string[] = [];
  const stabilitySupports: string[] = [];
  const stabilityRecommendations: string[] = [];

  if (alignmentLabel === "coherent" || alignmentLabel === "strongly-aligned") {
    addUniqueLimited(stabilitySignals, "Strategic alignment is supporting system stability.", 6);
  }
  if (driftLabel === "stable") addUniqueLimited(stabilitySignals, "Low drift supports ongoing adaptive evolution.", 6);
  if (doctrineLabel === "adaptive" || doctrineLabel === "progressive" || doctrineLabel === "strategic") {
    addUniqueLimited(stabilitySignals, "Runtime doctrine remains consistent with stable operation.", 6);
  }
  if (directionLabel === "focus" || directionLabel === "advance" || directionLabel === "scale-intelligence") {
    addUniqueLimited(stabilitySignals, "Strategic direction is stable enough for guided progression.", 6);
  }
  if ((evolutionLabel === "progressing" || evolutionLabel === "accelerating") && strategicLearningScore >= 55) {
    addUniqueLimited(stabilitySignals, "Learning and evolution signals reinforce current stability.", 6);
  }
  if (consistencyLabel === "high") addUniqueLimited(stabilitySignals, "High consistency supports resilient strategic behavior.", 6);

  if (driftLabel === "drifting" || driftLabel === "severe-drift") {
    addUniqueLimited(stabilityWeaknesses, "Strategic drift is weakening overall stability.", 6);
  }
  if (alignmentLabel === "fragmented") addUniqueLimited(stabilityWeaknesses, "Alignment fragmentation is reducing system resilience.", 6);
  if (alignmentLabel === "tense") addUniqueLimited(stabilityWeaknesses, "Alignment tension is reducing system resilience.", 6);
  if (doctrineLabel === "contained") addUniqueLimited(stabilityWeaknesses, "Contained runtime doctrine is limiting stability confidence.", 6);
  if (doctrineLabel === "guarded") addUniqueLimited(stabilityWeaknesses, "Guarded runtime doctrine is limiting stability confidence.", 6);
  if (consistencyLabel === "low") addUniqueLimited(stabilityWeaknesses, "Low semantic consistency weakens adaptive stability.", 6);
  if (directionLabel === "recover") addUniqueLimited(stabilityWeaknesses, "Recovery-oriented direction indicates incomplete stabilization.", 6);
  if (directionLabel === "stabilize") addUniqueLimited(stabilityWeaknesses, "Recovery-oriented direction indicates incomplete stabilization.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(stabilityWeaknesses, "Unresolved system pressure is undermining stable progression.", 6);

  if (driftLabel === "drifting" || driftLabel === "severe-drift") {
    addUniqueLimited(stabilityRisks, "Destabilizing drift may invalidate current adaptive progression.", 6);
  }
  if (stabilityLabel === "fragile" || stabilityLabel === "unstable") {
    addUniqueLimited(stabilityRisks, "Fragile stability may not tolerate broader expansion.", 6);
  }
  if (driftType === "compound-drift") addUniqueLimited(stabilityRisks, "Compound drift may reduce resilience across strategic layers.", 6);
  if (driftType === "oscillatory-drift") addUniqueLimited(stabilityRisks, "Oscillatory movement may weaken stability confidence.", 6);
  if (alignmentLabel === "fragmented" || alignmentLabel === "tense") addUniqueLimited(stabilityRisks, "Low coherence may amplify future instability.", 6);
  if (stabilityTolerance === "cannot-tolerate-expansion" || stabilityTolerance === "limited-tolerance") {
    addUniqueLimited(stabilityRisks, "Expansion under current conditions may exceed safe stability tolerance.", 6);
  }

  if (consistencyLabel === "high") addUniqueLimited(stabilitySupports, "High consistency strengthens strategic resilience.", 6);
  if (alignmentLabel === "strongly-aligned") addUniqueLimited(stabilitySupports, "Strong alignment supports stable adaptive evolution.", 6);
  if (doctrineLabel === "progressive" || doctrineLabel === "strategic") addUniqueLimited(stabilitySupports, "Progressive doctrine supports broader stability tolerance.", 6);
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") addUniqueLimited(stabilitySupports, "Improving evolution posture supports recovery.", 6);
  if (strategicLearningScore >= 70) addUniqueLimited(stabilitySupports, "Stable learning signals reinforce long-horizon resilience.", 6);
  if (driftLabel === "stable") addUniqueLimited(stabilitySupports, "Low drift pressure supports continued adaptation.", 6);

  if (driftLabel === "drifting" || driftLabel === "severe-drift" || stabilityLabel === "unstable" || stabilityLabel === "fragile") {
    addUniqueLimited(stabilityRecommendations, "Reduce drift before expanding adaptive scope.", 6);
  }
  if (alignmentLabel === "fragmented" || alignmentLabel === "tense") {
    addUniqueLimited(stabilityRecommendations, "Stabilize alignment before broadening runtime doctrine.", 6);
  }
  if (consistencyLabel === "low") addUniqueLimited(stabilityRecommendations, "Use consistency improvements to reinforce system stability.", 6);
  if (stabilityLabel === "stable") addUniqueLimited(stabilityRecommendations, "Maintain guided evolution until stability becomes robust.", 6);
  if (stabilityLabel === "fragile") addUniqueLimited(stabilityRecommendations, "Delay broader expansion until fragile stability improves.", 6);
  if (doctrineLabel === "contained" || doctrineLabel === "guarded" || directionLabel === "recover" || directionLabel === "stabilize") {
    addUniqueLimited(stabilityRecommendations, "Consolidate doctrine, direction, and recommendations before accelerating.", 6);
  }
  if (stabilityLabel === "robust") addUniqueLimited(stabilityRecommendations, "Continue adaptive evolution with periodic stability checks.", 6);

  const notes: string[] = [];
  addUniqueLimited(notes, "Strategic stability engine v1 is interpretive only and does not alter system behavior.", 6);

  if (!previousAvailable) {
    addUniqueLimited(notes, "Previous-state inputs were not provided; temporal comparisons used conservative defaults.", 6);
  }
  if (stabilityConfidence < 50) addUniqueLimited(notes, "Stability confidence is low; apply stability tolerance conservatively.", 6);
  if (driftLabel === "drifting" || driftLabel === "severe-drift") addUniqueLimited(notes, "Elevated drift pressure suggests stabilization before expansion.", 6);
  if (alignmentLabel === "strongly-aligned") addUniqueLimited(notes, "Strong alignment is acting as a primary stabilizer.", 6);
  if (stabilityTolerance === "cannot-tolerate-expansion" || stabilityTolerance === "limited-tolerance") {
    addUniqueLimited(notes, "Current stability tolerance is limited; broader expansion is not advised.", 6);
  }
  if (stabilityTolerance === "high-tolerance") addUniqueLimited(notes, "High stability tolerance supports resilient guided expansion.", 6);

  return {
    stabilityScore,
    stabilityLabel,
    strategicStabilityState,
    stabilityTolerance,
    stabilityConfidence,
    stabilitySignals,
    stabilityWeaknesses,
    stabilityRisks,
    stabilitySupports,
    stabilityRecommendations,
    summary: summaryForLabel(stabilityLabel),
    notes,
  };
}

