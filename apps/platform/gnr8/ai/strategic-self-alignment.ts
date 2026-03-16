import { buildAdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import type { AdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import { buildAdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import { buildAdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import type { AdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import { buildStrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import type { StrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import { buildStrategicAdaptationRuntimeBridgeV1 } from "@/gnr8/ai/strategic-adaptation-runtime-bridge";
import type { StrategicAdaptationRuntimeBridgeV1 } from "@/gnr8/ai/strategic-adaptation-runtime-bridge";
import { buildStrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import { buildStrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import { buildStrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";

export type StrategicSelfAlignmentV1 = {
  alignmentScore: number;
  alignmentLabel: "fragmented" | "tense" | "coherent" | "strongly-aligned";

  strategicAlignmentState: "misaligned" | "partially-aligned" | "operationally-aligned" | "strategically-aligned";

  alignmentDirection: "conflict-reduction" | "coherence-repair" | "alignment-consolidation" | "strategic-unification";

  alignmentConfidence: number;

  alignmentSignals: string[];
  alignmentConflicts: string[];
  alignmentRisks: string[];
  alignmentOpportunities: string[];
  alignmentRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicSelfAlignmentInputV1 = {
  strategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  strategicRuntimeAdaptationPolicy?: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;
  strategicAdaptationRuntimeBridge?: StrategicAdaptationRuntimeBridgeV1 | Record<string, unknown> | null;
  adaptiveStrategyRecommendations?: AdaptiveStrategyRecommendationsV1 | Record<string, unknown> | null;
  strategicAdaptationOrchestrator?: StrategicAdaptationOrchestratorV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  adaptiveStrategicFeedback?: AdaptiveStrategicFeedbackV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
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

function normalizeScoreFrom(value: unknown, nestedKey: string, key: string): number {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return 0;
  const raw = (obj as any)[key] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : 0;
}

function normalizeDirectionLabel(value: unknown): StrategicDirectionEngineV1["directionLabel"] {
  const obj = unwrapMaybeNested(value, "strategicDirectionEngine");
  if (!isRecord(obj)) return "recover";
  const raw = String((obj as any).directionLabel ?? "").trim();
  if (raw === "recover" || raw === "stabilize" || raw === "focus" || raw === "advance" || raw === "scale-intelligence") return raw;
  return "recover";
}

function normalizeStrategicDirection(value: unknown): StrategicDirectionEngineV1["strategicDirection"] {
  const obj = unwrapMaybeNested(value, "strategicDirectionEngine");
  if (!isRecord(obj)) return "reduce-system-instability";
  const raw = String((obj as any).strategicDirection ?? "").trim();
  if (
    raw === "reduce-system-instability" ||
    raw === "stabilize-adaptive-core" ||
    raw === "deepen-intelligence" ||
    raw === "expand-adaptive-runtime" ||
    raw === "prepare-system-scale"
  ) {
    return raw;
  }
  return "reduce-system-instability";
}

function normalizeNextSystemPriority(value: unknown): StrategicDirectionEngineV1["nextSystemPriority"] {
  const obj = unwrapMaybeNested(value, "strategicDirectionEngine");
  if (!isRecord(obj)) return "execution-stability";
  const raw = String((obj as any).nextSystemPriority ?? "").trim();
  if (
    raw === "execution-stability" ||
    raw === "semantic-quality" ||
    raw === "consistency" ||
    raw === "learning-quality" ||
    raw === "adaptive-runtime" ||
    raw === "autonomy-preparation"
  ) {
    return raw;
  }
  return "execution-stability";
}

function normalizeDoctrineLabel(value: unknown): StrategicRuntimeAdaptationPolicyV1["doctrineLabel"] {
  const obj = unwrapMaybeNested(value, "strategicRuntimeAdaptationPolicy");
  if (!isRecord(obj)) return "contained";
  const raw = String((obj as any).doctrineLabel ?? "").trim();
  if (raw === "contained" || raw === "guarded" || raw === "adaptive" || raw === "progressive" || raw === "strategic") return raw;
  return "contained";
}

function normalizeRuntimeExpansionPolicy(value: unknown): StrategicRuntimeAdaptationPolicyV1["runtimeExpansionPolicy"] {
  const obj = unwrapMaybeNested(value, "strategicRuntimeAdaptationPolicy");
  if (!isRecord(obj)) return "hold-scope";
  const raw = String((obj as any).runtimeExpansionPolicy ?? "").trim();
  if (raw === "hold-scope" || raw === "expand-semantic-first" || raw === "expand-guided-runtime" || raw === "prepare-broader-runtime") return raw;
  return "hold-scope";
}

function normalizeBridgeLabel(value: unknown): StrategicAdaptationRuntimeBridgeV1["bridgeLabel"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationRuntimeBridge");
  if (!isRecord(obj)) return "disconnected";
  const raw = String((obj as any).bridgeLabel ?? "").trim();
  if (raw === "disconnected" || raw === "guarded" || raw === "aligned" || raw === "runtime-ready") return raw;
  return "disconnected";
}

function normalizeRuntimeBridgePosture(value: unknown): StrategicAdaptationRuntimeBridgeV1["runtimeBridgePosture"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationRuntimeBridge");
  if (!isRecord(obj)) return "hold-runtime";
  const raw = String((obj as any).runtimeBridgePosture ?? "").trim();
  if (raw === "hold-runtime" || raw === "guided-runtime" || raw === "adaptive-runtime" || raw === "expand-runtime") return raw;
  return "hold-runtime";
}

function normalizeRuntimeScopeGuidance(value: unknown): StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationRuntimeBridge");
  if (!isRecord(obj)) return "preview-only";
  const raw = String((obj as any).runtimeScopeGuidance ?? "").trim();
  if (
    raw === "preview-only" ||
    raw === "semantic-preferred" ||
    raw === "structural-phase-1-preferred" ||
    raw === "mixed-phase-1-preferred" ||
    raw === "broad-guided-runtime"
  ) {
    return raw;
  }
  return "preview-only";
}

function normalizeRecommendationLabel(value: unknown): AdaptiveStrategyRecommendationsV1["recommendationLabel"] {
  const obj = unwrapMaybeNested(value, "adaptiveStrategyRecommendations");
  if (!isRecord(obj)) return "stabilize";
  const raw = String((obj as any).recommendationLabel ?? "").trim();
  if (raw === "stabilize" || raw === "optimize" || raw === "accelerate" || raw === "consolidate" || raw === "restructure" || raw === "prepare-scale")
    return raw;
  return "stabilize";
}

function normalizeStrategicPriorityDirection(value: unknown): AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] {
  const obj = unwrapMaybeNested(value, "adaptiveStrategyRecommendations");
  if (!isRecord(obj)) return "learning";
  const raw = String((obj as any).strategicPriorityDirection ?? "").trim();
  if (raw === "structure" || raw === "semantic" || raw === "consistency" || raw === "automation" || raw === "learning" || raw === "adaptive-balance") return raw;
  return "learning";
}

function normalizePolicyLabel(value: unknown): AdaptiveStrategicPolicyV1["policyLabel"] {
  const obj = unwrapMaybeNested(value, "adaptiveStrategicPolicy");
  if (!isRecord(obj)) return "constrained";
  const raw = String((obj as any).policyLabel ?? "").trim();
  if (raw === "constrained" || raw === "stabilizing" || raw === "adaptive" || raw === "expansion-ready") return raw;
  return "constrained";
}

function normalizeAdaptivePosture(value: unknown): AdaptiveStrategicPolicyV1["adaptivePosture"] {
  const obj = unwrapMaybeNested(value, "adaptiveStrategicPolicy");
  if (!isRecord(obj)) return "hold-evolution";
  const raw = String((obj as any).adaptivePosture ?? "").trim();
  if (raw === "hold-evolution" || raw === "stabilize-learning" || raw === "guided-adaptation" || raw === "accelerated-adaptation") return raw;
  return "hold-evolution";
}

function normalizeEvolutionLabel(value: unknown): StrategicEvolutionModelV1["evolutionLabel"] {
  const obj = unwrapMaybeNested(value, "strategicEvolutionModel");
  if (!isRecord(obj)) return "regressing";
  const raw = String((obj as any).evolutionLabel ?? "").trim();
  if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  return "regressing";
}

function normalizeConsistencyLabel(value: unknown): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(value, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "low";
}

function normalizePrimaryAdaptiveFocusArea(value: unknown): StrategicAdaptationOrchestratorV1["primaryAdaptiveFocus"]["area"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationOrchestrator");
  if (!isRecord(obj)) return "execution-stability";
  const primary = (obj as any).primaryAdaptiveFocus as unknown;
  if (!isRecord(primary)) return "execution-stability";
  const raw = String((primary as any).area ?? "").trim();
  if (raw === "semantic-quality" || raw === "execution-stability" || raw === "consistency" || raw === "scheduler-pacing" || raw === "autonomy-readiness") return raw;
  return "execution-stability";
}

function expansionPostureFromDirectionLabel(label: StrategicDirectionEngineV1["directionLabel"]): "stabilize" | "expand" {
  if (label === "advance" || label === "scale-intelligence") return "expand";
  return "stabilize";
}

function expansionPostureFromDoctrineLabel(label: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"]): "stabilize" | "expand" {
  if (label === "adaptive" || label === "progressive" || label === "strategic") return "expand";
  return "stabilize";
}

function nextPriorityFamilies(priority: StrategicDirectionEngineV1["nextSystemPriority"]): Array<StrategicAdaptationOrchestratorV1["primaryAdaptiveFocus"]["area"] | "learning-quality"> {
  if (priority === "execution-stability") return ["execution-stability"];
  if (priority === "consistency") return ["consistency"];
  if (priority === "semantic-quality") return ["semantic-quality"];
  if (priority === "learning-quality") return ["learning-quality"];
  if (priority === "autonomy-preparation") return ["autonomy-readiness"];
  return ["scheduler-pacing", "autonomy-readiness"];
}

function maybeBuildMissingModels(input: StrategicSelfAlignmentInputV1): {
  strategicLearningCore: StrategicLearningCoreV1 | Record<string, unknown> | null;
  strategicEvolutionModel: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  adaptiveStrategicFeedback: AdaptiveStrategicFeedbackV1 | Record<string, unknown> | null;
  strategicAdaptationOrchestrator: StrategicAdaptationOrchestratorV1 | Record<string, unknown> | null;
  adaptiveStrategyRecommendations: AdaptiveStrategyRecommendationsV1 | Record<string, unknown> | null;
  strategicAdaptationRuntimeBridge: StrategicAdaptationRuntimeBridgeV1 | Record<string, unknown> | null;
  strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;
  strategicDirectionEngine: StrategicDirectionEngineV1 | Record<string, unknown> | null;
} {
  const unresolvedRatio = clamp0to1(input.unresolvedRatio, 1);

  const strategicLearningCore =
    input.strategicLearningCore ??
    buildStrategicLearningCoreV1({
      executionLearningSignals: input.executionLearningSignals ?? null,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      executionMemory: input.executionMemory ?? null,
      siteSemanticIntelligence: input.siteSemanticIntelligence ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision ?? null,
      autonomousExecutionPolicy: input.autonomousExecutionPolicy ?? null,
      semiStrategicExecutionController: input.semiStrategicExecutionController ?? null,
      unresolvedRatio,
    });

  const strategicEvolutionModel =
    input.strategicEvolutionModel ??
    buildStrategicEvolutionModelV1({
      strategicLearningCore,
      executionLearningSignals: input.executionLearningSignals ?? null,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      executionMemory: input.executionMemory ?? null,
      siteSemanticIntelligence: input.siteSemanticIntelligence ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      unresolvedRatio,
    });

  const adaptiveStrategicPolicy =
    input.adaptiveStrategicPolicy ??
    buildAdaptiveStrategicPolicyV1({
      strategicEvolutionModel,
      strategicLearningCore,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      executionLearningSignals: input.executionLearningSignals ?? null,
      executionMemory: input.executionMemory ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      unresolvedRatio,
    });

  const adaptiveStrategicFeedback =
    input.adaptiveStrategicFeedback ??
    buildAdaptiveStrategicFeedbackV1({
      strategicLearningCore,
      strategicEvolutionModel,
      adaptiveStrategicPolicy,
      executionLearningSignals: input.executionLearningSignals ?? null,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      unresolvedRatio,
    });

  const strategicAdaptationOrchestrator =
    input.strategicAdaptationOrchestrator ??
    buildStrategicAdaptationOrchestratorV1({
      strategicLearningCore,
      strategicEvolutionModel,
      adaptiveStrategicPolicy,
      adaptiveStrategicFeedback,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      executionLearningSignals: input.executionLearningSignals ?? null,
      executionMemory: input.executionMemory ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      unresolvedRatio,
    });

  const adaptiveStrategyRecommendations =
    input.adaptiveStrategyRecommendations ??
    buildAdaptiveStrategyRecommendationsV1({
      adaptiveStrategicPolicy,
      strategicAdaptationOrchestrator,
      strategicEvolutionModel,
      strategicLearningCore,
      executionLearningSignals: input.executionLearningSignals ?? null,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      executionMemory: input.executionMemory ?? null,
      unresolvedRatio,
    });

  const strategicAdaptationRuntimeBridge =
    input.strategicAdaptationRuntimeBridge ??
    buildStrategicAdaptationRuntimeBridgeV1({
      strategicLearningCore,
      strategicEvolutionModel,
      adaptiveStrategicPolicy,
      adaptiveStrategicFeedback,
      strategicAdaptationOrchestrator,
      adaptiveStrategyRecommendations,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      executionLearningSignals: input.executionLearningSignals ?? null,
      executionMemory: input.executionMemory ?? null,
      strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision ?? null,
      autonomousExecutionPolicy: input.autonomousExecutionPolicy ?? null,
      semiStrategicExecutionController: input.semiStrategicExecutionController ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      siteSemanticIntelligence: input.siteSemanticIntelligence ?? null,
      unresolvedRatio,
    });

  const strategicRuntimeAdaptationPolicy =
    input.strategicRuntimeAdaptationPolicy ??
    buildStrategicRuntimeAdaptationPolicyV1({
      strategicAdaptationRuntimeBridge,
      adaptiveStrategicPolicy,
      strategicAdaptationOrchestrator,
      adaptiveStrategyRecommendations,
      strategicEvolutionModel,
      strategicLearningCore,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      executionLearningSignals: input.executionLearningSignals ?? null,
      executionMemory: input.executionMemory ?? null,
      strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision ?? null,
      autonomousExecutionPolicy: input.autonomousExecutionPolicy ?? null,
      semiStrategicExecutionController: input.semiStrategicExecutionController ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      siteSemanticIntelligence: input.siteSemanticIntelligence ?? null,
      unresolvedRatio,
    });

  const strategicDirectionEngine =
    input.strategicDirectionEngine ??
    buildStrategicDirectionEngineV1({
      strategicRuntimeAdaptationPolicy,
      strategicAdaptationRuntimeBridge,
      adaptiveStrategyRecommendations,
      strategicAdaptationOrchestrator,
      adaptiveStrategicPolicy,
      adaptiveStrategicFeedback,
      strategicEvolutionModel,
      strategicLearningCore,
      adaptiveSchedulingSignals: input.adaptiveSchedulingSignals ?? null,
      executionLearningSignals: input.executionLearningSignals ?? null,
      executionMemory: input.executionMemory ?? null,
      strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision ?? null,
      autonomousExecutionPolicy: input.autonomousExecutionPolicy ?? null,
      semiStrategicExecutionController: input.semiStrategicExecutionController ?? null,
      strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness ?? null,
      siteSemanticConsistency: input.siteSemanticConsistency ?? null,
      siteSemanticIntelligence: input.siteSemanticIntelligence ?? null,
      unresolvedRatio,
    });

  return {
    strategicLearningCore,
    strategicEvolutionModel,
    adaptiveStrategicPolicy,
    adaptiveStrategicFeedback,
    strategicAdaptationOrchestrator,
    adaptiveStrategyRecommendations,
    strategicAdaptationRuntimeBridge,
    strategicRuntimeAdaptationPolicy,
    strategicDirectionEngine,
  };
}

function alignmentLabelFromScore(score: number): StrategicSelfAlignmentV1["alignmentLabel"] {
  if (score <= 24) return "fragmented";
  if (score <= 49) return "tense";
  if (score <= 74) return "coherent";
  return "strongly-aligned";
}

function alignmentStateFromLabel(label: StrategicSelfAlignmentV1["alignmentLabel"]): StrategicSelfAlignmentV1["strategicAlignmentState"] {
  if (label === "fragmented") return "misaligned";
  if (label === "tense") return "partially-aligned";
  if (label === "coherent") return "operationally-aligned";
  return "strategically-aligned";
}

function summaryFromAlignmentLabel(label: StrategicSelfAlignmentV1["alignmentLabel"]): string {
  if (label === "fragmented") return "Strategic layers are fragmented and require conflict reduction before broader evolution.";
  if (label === "tense") return "Strategic layers are only partially aligned and require coherence repair.";
  if (label === "coherent") return "Strategic layers are operationally aligned and support coordinated evolution.";
  return "Strategic layers are strongly aligned and support unified system evolution.";
}

export function buildStrategicSelfAlignmentV1(input: StrategicSelfAlignmentInputV1): StrategicSelfAlignmentV1 {
  const normalizedUnresolvedRatio = clamp0to1(input.unresolvedRatio, 1);
  const { strategicDirectionEngine, strategicRuntimeAdaptationPolicy, strategicAdaptationRuntimeBridge, adaptiveStrategyRecommendations, strategicAdaptationOrchestrator, adaptiveStrategicPolicy, strategicEvolutionModel } =
    maybeBuildMissingModels(input);

  const directionScore = normalizeScoreFrom(strategicDirectionEngine, "strategicDirectionEngine", "directionScore");
  const doctrineScore = normalizeScoreFrom(strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineScore");
  const bridgeScore = normalizeScoreFrom(strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge", "bridgeScore");
  const recommendationScore = normalizeScoreFrom(adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations", "recommendationScore");
  const adaptationScore = normalizeScoreFrom(strategicAdaptationOrchestrator, "strategicAdaptationOrchestrator", "adaptationScore");
  const policyScore = normalizeScoreFrom(adaptiveStrategicPolicy, "adaptiveStrategicPolicy", "policyScore");
  const evolutionScore = normalizeScoreFrom(strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore");

  const baseAlignmentScore = clamp0to100((directionScore + doctrineScore + bridgeScore + recommendationScore + adaptationScore + policyScore + evolutionScore) / 7);

  const directionLabel = normalizeDirectionLabel(strategicDirectionEngine);
  const strategicDirection = normalizeStrategicDirection(strategicDirectionEngine);
  const nextSystemPriority = normalizeNextSystemPriority(strategicDirectionEngine);

  const doctrineLabel = normalizeDoctrineLabel(strategicRuntimeAdaptationPolicy);
  const runtimeExpansionPolicy = normalizeRuntimeExpansionPolicy(strategicRuntimeAdaptationPolicy);

  const bridgeLabel = normalizeBridgeLabel(strategicAdaptationRuntimeBridge);
  const runtimeBridgePosture = normalizeRuntimeBridgePosture(strategicAdaptationRuntimeBridge);
  const runtimeScopeGuidance = normalizeRuntimeScopeGuidance(strategicAdaptationRuntimeBridge);

  const recommendationLabel = normalizeRecommendationLabel(adaptiveStrategyRecommendations);
  const strategicPriorityDirection = normalizeStrategicPriorityDirection(adaptiveStrategyRecommendations);

  const policyLabel = normalizePolicyLabel(adaptiveStrategicPolicy);
  const adaptivePosture = normalizeAdaptivePosture(adaptiveStrategicPolicy);

  const evolutionLabel = normalizeEvolutionLabel(strategicEvolutionModel);
  const consistencyLabel = normalizeConsistencyLabel(input.siteSemanticConsistency);
  const primaryAdaptiveFocusArea = normalizePrimaryAdaptiveFocusArea(strategicAdaptationOrchestrator);

  const alignmentConflicts: string[] = [];

  const conflict1_directionVsRuntimeExpansion =
    strategicDirection === "reduce-system-instability" && (runtimeExpansionPolicy === "expand-guided-runtime" || runtimeExpansionPolicy === "prepare-broader-runtime");
  if (conflict1_directionVsRuntimeExpansion) {
    addUniqueLimited(alignmentConflicts, "Strategic direction favors stabilization while runtime policy favors expansion.", 6);
  }

  const conflict2_doctrineVsRecommendation =
    (doctrineLabel === "contained" || doctrineLabel === "guarded") && (recommendationLabel === "accelerate" || recommendationLabel === "prepare-scale");
  if (conflict2_doctrineVsRecommendation) {
    addUniqueLimited(alignmentConflicts, "Recommendation layer promotes scale before runtime doctrine is ready.", 6);
  }

  const conflict3_priorityVsRuntimeScope =
    (strategicPriorityDirection === "structure" && (runtimeScopeGuidance === "semantic-preferred" || runtimeScopeGuidance === "broad-guided-runtime")) ||
    (strategicPriorityDirection === "semantic" && runtimeScopeGuidance === "structural-phase-1-preferred");
  if (conflict3_priorityVsRuntimeScope) {
    addUniqueLimited(alignmentConflicts, "Runtime scope preference conflicts with the current strategic priority.", 6);
  }

  const conflict4_adaptivePostureVsRuntimePosture =
    ((adaptivePosture === "hold-evolution" || adaptivePosture === "stabilize-learning") &&
      (runtimeBridgePosture === "adaptive-runtime" || runtimeBridgePosture === "expand-runtime")) ||
    ((adaptivePosture === "guided-adaptation" || adaptivePosture === "accelerated-adaptation") && runtimeBridgePosture === "hold-runtime");
  if (conflict4_adaptivePostureVsRuntimePosture) {
    addUniqueLimited(alignmentConflicts, "Adaptive posture and runtime bridge posture are not aligned.", 6);
  }

  const nextFamilies = nextPriorityFamilies(nextSystemPriority);
  const primaryIsNeutralBridge = strategicPriorityDirection === "adaptive-balance";
  const nextIsNeutralBridge = nextSystemPriority === "learning-quality";
  const conflict5_nextPriorityVsPrimaryFocus =
    !nextIsNeutralBridge &&
    !primaryIsNeutralBridge &&
    !nextFamilies.includes(primaryAdaptiveFocusArea) &&
    !(nextFamilies.includes("learning-quality") && (primaryAdaptiveFocusArea === "scheduler-pacing" || primaryAdaptiveFocusArea === "autonomy-readiness"));
  if (conflict5_nextPriorityVsPrimaryFocus) {
    addUniqueLimited(alignmentConflicts, "Next system priority conflicts with the primary adaptive focus.", 6);
  }

  let score = baseAlignmentScore;

  if (doctrineLabel === "contained") score -= 15;
  if (bridgeLabel === "disconnected") score -= 15;
  if (recommendationLabel === "restructure") score -= 12;
  if (policyLabel === "constrained") score -= 12;
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") score -= 10;
  if (consistencyLabel === "low") score -= 12;
  if (normalizedUnresolvedRatio > 0.3) score -= 10;

  if (conflict1_directionVsRuntimeExpansion) score -= 10;
  if (conflict5_nextPriorityVsPrimaryFocus) score -= 8;
  if (conflict3_priorityVsRuntimeScope) score -= 8;

  const directionPosture = expansionPostureFromDirectionLabel(directionLabel);
  const doctrinePosture = expansionPostureFromDoctrineLabel(doctrineLabel);
  const conflict_directionVsDoctrineExpansionPosture = directionPosture !== doctrinePosture;
  if (conflict_directionVsDoctrineExpansionPosture) score -= 10;

  if (conflict4_adaptivePostureVsRuntimePosture) score -= 8;

  if ((directionLabel === "advance" || directionLabel === "scale-intelligence") && (doctrineLabel === "progressive" || doctrineLabel === "strategic")) score += 8;
  if (bridgeLabel === "aligned" || bridgeLabel === "runtime-ready") score += 8;
  if (recommendationLabel === "optimize" || recommendationLabel === "accelerate" || recommendationLabel === "prepare-scale") score += 6;
  if (policyLabel === "adaptive" || policyLabel === "expansion-ready") score += 6;
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") score += 6;
  if (consistencyLabel === "high") score += 6;

  const alignmentScore = clamp0to100(score);
  const alignmentLabel = alignmentLabelFromScore(alignmentScore);
  const strategicAlignmentState = alignmentStateFromLabel(alignmentLabel);

  const alignmentDirection: StrategicSelfAlignmentV1["alignmentDirection"] =
    alignmentLabel === "fragmented" || alignmentConflicts.length >= 2
      ? "conflict-reduction"
      : alignmentLabel === "tense" || consistencyLabel !== "high"
        ? "coherence-repair"
        : alignmentLabel === "coherent"
          ? "alignment-consolidation"
          : "strategic-unification";

  let confidence = alignmentScore;
  if (alignmentConflicts.length >= 2) confidence -= 10;
  if (consistencyLabel === "low") confidence -= 15;
  if (normalizedUnresolvedRatio > 0.3) confidence -= 10;
  if (bridgeLabel === "runtime-ready") confidence += 5;
  if (evolutionLabel === "accelerating") confidence += 5;
  if (policyLabel === "expansion-ready") confidence += 5;
  const alignmentConfidence = clamp0to100(confidence);

  const alignmentSignals: string[] = [];
  if (!conflict_directionVsDoctrineExpansionPosture) {
    addUniqueLimited(alignmentSignals, "Strategic direction and runtime doctrine point toward the same expansion posture.", 6);
  }
  if (!conflict2_doctrineVsRecommendation && (policyLabel === "adaptive" || policyLabel === "expansion-ready") && (recommendationLabel === "optimize" || recommendationLabel === "accelerate" || recommendationLabel === "prepare-scale")) {
    addUniqueLimited(alignmentSignals, "Adaptive policy and recommendations are aligned.", 6);
  }
  if (!conflict1_directionVsRuntimeExpansion && (bridgeLabel === "aligned" || bridgeLabel === "runtime-ready")) {
    addUniqueLimited(alignmentSignals, "Runtime bridge is aligned with strategic direction.", 6);
  }
  if (consistencyLabel === "high") addUniqueLimited(alignmentSignals, "Consistency supports stronger strategic coherence.", 6);
  if ((evolutionLabel === "progressing" || evolutionLabel === "accelerating") && (doctrineLabel === "progressive" || doctrineLabel === "strategic")) {
    addUniqueLimited(alignmentSignals, "Strategic evolution and runtime doctrine reinforce each other.", 6);
  }
  if (!conflict5_nextPriorityVsPrimaryFocus) addUniqueLimited(alignmentSignals, "System priorities are converging.", 6);

  const alignmentRisks: string[] = [];
  if (alignmentLabel === "fragmented") addUniqueLimited(alignmentRisks, "Strategic fragmentation may reduce adaptive reliability.", 6);
  if (consistencyLabel === "low") addUniqueLimited(alignmentRisks, "Low consistency weakens strategic coherence.", 6);
  if (conflict1_directionVsRuntimeExpansion) addUniqueLimited(alignmentRisks, "Runtime doctrine may expand faster than strategic direction supports.", 6);
  if (conflict2_doctrineVsRecommendation || (recommendationLabel === "accelerate" && policyLabel !== "expansion-ready")) {
    addUniqueLimited(alignmentRisks, "Recommendation pressure may outpace policy readiness.", 6);
  }
  if (normalizedUnresolvedRatio > 0.3) addUniqueLimited(alignmentRisks, "Unresolved system pressure may distort strategic alignment.", 6);
  if (alignmentConflicts.length >= 2) addUniqueLimited(alignmentRisks, "Conflicting priorities may slow adaptive progress.", 6);

  const alignmentOpportunities: string[] = [];
  if (alignmentLabel === "coherent" || alignmentLabel === "strongly-aligned") {
    addUniqueLimited(alignmentOpportunities, "Strategic layers are converging toward a unified direction.", 6);
  }
  if (bridgeLabel === "aligned" || bridgeLabel === "runtime-ready") {
    addUniqueLimited(alignmentOpportunities, "Runtime and adaptive policy can be consolidated into a stronger doctrine.", 6);
  }
  if (consistencyLabel === "high") addUniqueLimited(alignmentOpportunities, "High consistency supports stronger strategic unification.", 6);
  if (!conflict2_doctrineVsRecommendation && (recommendationLabel === "optimize" || recommendationLabel === "accelerate" || recommendationLabel === "prepare-scale")) {
    addUniqueLimited(alignmentOpportunities, "Aligned recommendations can accelerate coherent system evolution.", 6);
  }
  if (alignmentLabel === "strongly-aligned") {
    addUniqueLimited(alignmentOpportunities, "Strategic coherence is strong enough to support deeper adaptive intelligence.", 6);
  }
  if (alignmentLabel === "coherent" || alignmentLabel === "strongly-aligned") {
    addUniqueLimited(alignmentOpportunities, "System direction can be simplified through stronger internal alignment.", 6);
  }

  const alignmentRecommendations: string[] = [];
  if (alignmentConflicts.length >= 1) addUniqueLimited(alignmentRecommendations, "Reduce conflicts between strategic direction and runtime expansion policy.", 6);
  if (conflict2_doctrineVsRecommendation) addUniqueLimited(alignmentRecommendations, "Align recommendation pressure with current runtime doctrine.", 6);
  if (conflict4_adaptivePostureVsRuntimePosture) addUniqueLimited(alignmentRecommendations, "Consolidate adaptive posture before broadening runtime scope.", 6);
  if (consistencyLabel !== "high") addUniqueLimited(alignmentRecommendations, "Use consistency normalization to improve cross-layer coherence.", 6);
  if (recommendationLabel === "accelerate" && policyLabel !== "expansion-ready") {
    addUniqueLimited(alignmentRecommendations, "Keep strategic expansion aligned with policy readiness.", 6);
  }
  if (conflict5_nextPriorityVsPrimaryFocus || conflict3_priorityVsRuntimeScope) {
    addUniqueLimited(alignmentRecommendations, "Strengthen priority coherence before accelerating system evolution.", 6);
  }

  const notes: string[] = [];
  addUniqueLimited(notes, "Strategic self-alignment v1 is interpretive only and does not alter system behavior.", 6);
  if (alignmentConflicts.length >= 2) addUniqueLimited(notes, "Two or more explicit cross-layer conflicts are present.", 6);
  if (consistencyLabel === "low") addUniqueLimited(notes, "Consistency is low; coherence gating applies.", 6);
  if (conflict1_directionVsRuntimeExpansion) addUniqueLimited(notes, "Runtime expansion posture is ahead of stabilization-first strategic direction.", 6);
  if (conflict2_doctrineVsRecommendation) addUniqueLimited(notes, "Recommendations indicate scale while doctrine indicates containment/guarding.", 6);
  if (alignmentLabel === "strongly-aligned" && consistencyLabel === "high") addUniqueLimited(notes, "Strategic unification potential is high under current consistency.", 6);
  if (normalizedUnresolvedRatio > 0.3) addUniqueLimited(notes, "Unresolved ratio is elevated and may reduce alignment reliability.", 6);

  return {
    alignmentScore,
    alignmentLabel,
    strategicAlignmentState,
    alignmentDirection,
    alignmentConfidence,
    alignmentSignals,
    alignmentConflicts,
    alignmentRisks,
    alignmentOpportunities,
    alignmentRecommendations,
    summary: summaryFromAlignmentLabel(alignmentLabel),
    notes,
  };
}

