import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import { buildAdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import { buildAdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import type { AdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import { buildStrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import type { StrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import { buildStrategicAdaptationRuntimeBridgeV1 } from "@/gnr8/ai/strategic-adaptation-runtime-bridge";
import type { StrategicAdaptationRuntimeBridgeV1 } from "@/gnr8/ai/strategic-adaptation-runtime-bridge";
import { buildStrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";

export type StrategicDirectionEngineV1 = {
  directionScore: number;
  directionLabel: "recover" | "stabilize" | "focus" | "advance" | "scale-intelligence";

  strategicDirection:
    | "reduce-system-instability"
    | "stabilize-adaptive-core"
    | "deepen-intelligence"
    | "expand-adaptive-runtime"
    | "prepare-system-scale";

  strategicDirectionHorizon: "immediate" | "near-term" | "mid-term" | "expansion-term";

  nextSystemPriority:
    | "execution-stability"
    | "semantic-quality"
    | "consistency"
    | "learning-quality"
    | "adaptive-runtime"
    | "autonomy-preparation";

  directionSignals: string[];
  directionConstraints: string[];
  directionRisks: string[];
  directionOpportunities: string[];
  directionRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicDirectionEngineInputV1 = {
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

function clamp0to1(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 1;
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

function normalizeScoreFrom(value: unknown, nestedKey: string, key: string): number {
  const unwrapped = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(unwrapped)) return 0;
  const raw = (unwrapped as any)[key] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : 0;
}

function normalizeUnresolvedRatio(input: StrategicDirectionEngineInputV1): number {
  const raw = input.unresolvedRatio;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 1;
  return clamp0to1(raw);
}

function doctrineLabelForScore(score: number): StrategicRuntimeAdaptationPolicyV1["doctrineLabel"] {
  if (score <= 19) return "contained";
  if (score <= 39) return "guarded";
  if (score <= 59) return "adaptive";
  if (score <= 79) return "progressive";
  return "strategic";
}

function normalizeDoctrineLabel(value: unknown, doctrineScore: number): StrategicRuntimeAdaptationPolicyV1["doctrineLabel"] {
  const obj = unwrapMaybeNested(value, "strategicRuntimeAdaptationPolicy");
  if (isRecord(obj)) {
    const raw = String((obj as any).doctrineLabel ?? "").trim();
    if (raw === "contained" || raw === "guarded" || raw === "adaptive" || raw === "progressive" || raw === "strategic") return raw;
  }
  return doctrineLabelForScore(doctrineScore);
}

function bridgeLabelForScore(score: number): StrategicAdaptationRuntimeBridgeV1["bridgeLabel"] {
  if (score <= 24) return "disconnected";
  if (score <= 49) return "guarded";
  if (score <= 74) return "aligned";
  return "runtime-ready";
}

function normalizeBridgeLabel(value: unknown, bridgeScore: number): StrategicAdaptationRuntimeBridgeV1["bridgeLabel"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationRuntimeBridge");
  if (isRecord(obj)) {
    const raw = String((obj as any).bridgeLabel ?? "").trim();
    if (raw === "disconnected" || raw === "guarded" || raw === "aligned" || raw === "runtime-ready") return raw;
  }
  return bridgeLabelForScore(bridgeScore);
}

function normalizeRecommendationLabel(value: unknown): AdaptiveStrategyRecommendationsV1["recommendationLabel"] {
  const obj = unwrapMaybeNested(value, "adaptiveStrategyRecommendations");
  if (!isRecord(obj)) return "restructure";
  const raw = String((obj as any).recommendationLabel ?? "").trim();
  if (raw === "stabilize" || raw === "optimize" || raw === "accelerate" || raw === "consolidate" || raw === "restructure" || raw === "prepare-scale") {
    return raw;
  }
  return "restructure";
}

function evolutionLabelForScore(score: number): StrategicEvolutionModelV1["evolutionLabel"] {
  if (score <= 24) return "regressing";
  if (score <= 44) return "unstable";
  if (score <= 64) return "stagnating";
  if (score <= 84) return "progressing";
  return "accelerating";
}

function normalizeEvolutionLabel(value: unknown, evolutionScore: number): StrategicEvolutionModelV1["evolutionLabel"] {
  const obj = unwrapMaybeNested(value, "strategicEvolutionModel");
  if (isRecord(obj)) {
    const raw = String((obj as any).evolutionLabel ?? "").trim();
    if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  }
  return evolutionLabelForScore(evolutionScore);
}

function policyLabelForScore(score: number): AdaptiveStrategicPolicyV1["policyLabel"] {
  if (score <= 24) return "constrained";
  if (score <= 49) return "stabilizing";
  if (score <= 74) return "adaptive";
  return "expansion-ready";
}

function normalizePolicyLabel(value: unknown, policyScore: number): AdaptiveStrategicPolicyV1["policyLabel"] {
  const obj = unwrapMaybeNested(value, "adaptiveStrategicPolicy");
  if (isRecord(obj)) {
    const raw = String((obj as any).policyLabel ?? "").trim();
    if (raw === "constrained" || raw === "stabilizing" || raw === "adaptive" || raw === "expansion-ready") return raw;
  }
  return policyLabelForScore(policyScore);
}

function normalizeAdaptationPhase(value: unknown): StrategicAdaptationOrchestratorV1["adaptationPhase"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationOrchestrator");
  if (isRecord(obj)) {
    const raw = String((obj as any).adaptationPhase ?? "").trim();
    if (
      raw === "system-recovery" ||
      raw === "learning-stabilization" ||
      raw === "adaptive-coordination" ||
      raw === "guided-expansion" ||
      raw === "autonomy-preparation"
    ) {
      return raw;
    }
  }
  return "system-recovery";
}

function normalizeAdaptationTempo(value: unknown): StrategicAdaptationOrchestratorV1["adaptationTempo"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationOrchestrator");
  if (!isRecord(obj)) return "slow";
  const raw = String((obj as any).adaptationTempo ?? "").trim();
  if (raw === "slow" || raw === "controlled" || raw === "progressive" || raw === "accelerated") return raw;
  return "slow";
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

function normalizeRuntimeConstraintMode(value: unknown): StrategicRuntimeAdaptationPolicyV1["runtimeConstraintMode"] {
  const obj = unwrapMaybeNested(value, "strategicRuntimeAdaptationPolicy");
  if (!isRecord(obj)) return "strict";
  const raw = String((obj as any).runtimeConstraintMode ?? "").trim();
  if (raw === "strict" || raw === "controlled" || raw === "managed" || raw === "open-guided") return raw;
  return "strict";
}

function normalizeRuntimeBridgePosture(value: unknown): StrategicAdaptationRuntimeBridgeV1["runtimeBridgePosture"] {
  const obj = unwrapMaybeNested(value, "strategicAdaptationRuntimeBridge");
  if (!isRecord(obj)) return "hold-runtime";
  const raw = String((obj as any).runtimeBridgePosture ?? "").trim();
  if (raw === "hold-runtime" || raw === "guided-runtime" || raw === "adaptive-runtime" || raw === "expand-runtime") return raw;
  return "hold-runtime";
}

function normalizeRuntimeDecision(value: unknown): StrategicExecutionRuntimeDecision["executionDecision"] {
  const obj = unwrapMaybeNested(value, "strategicExecutionRuntimeDecision");
  if (!isRecord(obj)) return "blocked";
  const raw = String((obj as any).executionDecision ?? "").trim();
  if (
    raw === "blocked" ||
    raw === "preview-only" ||
    raw === "semantic-execution" ||
    raw === "structural-execution" ||
    raw === "mixed-execution"
  ) {
    return raw;
  }
  return "blocked";
}

function normalizeAdaptationHealthLabel(value: unknown): AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] {
  const obj = unwrapMaybeNested(value, "adaptiveSchedulingSignals");
  if (!isRecord(obj)) return "hold";
  const raw = String((obj as any).adaptationHealthLabel ?? "").trim();
  if (raw === "ready" || raw === "watch" || raw === "hold") return raw;
  return "hold";
}

function normalizeConsistencyLabel(input: StrategicDirectionEngineInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (isRecord(obj)) {
    const raw = String((obj as any).consistencyLabel ?? "").trim();
    if (raw === "low" || raw === "medium" || raw === "high") return raw;
  }

  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
    if (pressure && typeof pressure.consistencyLow === "boolean" && pressure.consistencyLow === true) return "low";
  }

  return "low";
}

function normalizeSemanticHealthLabel(input: StrategicDirectionEngineInputV1): SiteSemanticIntelligence["semanticHealthLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticIntelligence, "siteSemanticIntelligence");
  if (isRecord(obj)) {
    const raw = String((obj as any).semanticHealthLabel ?? "").trim();
    if (raw === "low" || raw === "medium" || raw === "high") return raw;
  }
  return "low";
}

function normalizeSemanticWeaknessClustersHigh(input: StrategicDirectionEngineInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(mem)) return false;
  const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
  return pressure && typeof pressure.semanticWeaknessClustersHigh === "boolean" ? pressure.semanticWeaknessClustersHigh === true : false;
}

function normalizeLearningHealthLabel(input: StrategicDirectionEngineInputV1): "low" | "medium" | "high" {
  const obj = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).learningHealthLabel ?? "").trim();
  if (raw === "strong") return "high";
  if (raw === "watch") return "medium";
  if (raw === "fragile") return "low";
  return "low";
}

function normalizeFeedbackLabel(input: StrategicDirectionEngineInputV1): AdaptiveStrategicFeedbackV1["feedbackLabel"] {
  const obj = unwrapMaybeNested(input.adaptiveStrategicFeedback, "adaptiveStrategicFeedback");
  if (!isRecord(obj)) return "destabilized";
  const raw = String((obj as any).feedbackLabel ?? "").trim();
  if (raw === "destabilized" || raw === "reactive" || raw === "adjusting" || raw === "adaptive" || raw === "self-optimizing") return raw;
  return "destabilized";
}

function normalizeFeedbackPosture(input: StrategicDirectionEngineInputV1): AdaptiveStrategicFeedbackV1["strategicFeedbackPosture"] {
  const obj = unwrapMaybeNested(input.adaptiveStrategicFeedback, "adaptiveStrategicFeedback");
  if (!isRecord(obj)) return "stabilize";
  const raw = String((obj as any).strategicFeedbackPosture ?? "").trim();
  if (raw === "stabilize" || raw === "correct" || raw === "refine" || raw === "optimize" || raw === "autonomous-ready") return raw;
  return "stabilize";
}

function directionLabelForScore(score: number): StrategicDirectionEngineV1["directionLabel"] {
  if (score <= 19) return "recover";
  if (score <= 39) return "stabilize";
  if (score <= 59) return "focus";
  if (score <= 79) return "advance";
  return "scale-intelligence";
}

function summaryForDirectionLabel(label: StrategicDirectionEngineV1["directionLabel"]): string {
  switch (label) {
    case "recover":
      return "System direction should focus on recovering stability before broader evolution.";
    case "stabilize":
      return "System direction should stabilize the adaptive core before expansion.";
    case "focus":
      return "System direction should concentrate on deepening adaptive intelligence.";
    case "advance":
      return "System direction can advance through guided adaptive expansion.";
    case "scale-intelligence":
      return "System direction supports scaling intelligence under strong strategic alignment.";
    default:
      return "System direction should stabilize the adaptive core before expansion.";
  }
}

function computeNextSystemPriority(input: {
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  semanticWeaknessClustersHigh: boolean;
  semanticHealthLabel: SiteSemanticIntelligence["semanticHealthLabel"];
  learningHealthLabel: "low" | "medium" | "high";
  strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown";
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  runtimeScopeGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"];
  runtimeConstraintMode: StrategicRuntimeAdaptationPolicyV1["runtimeConstraintMode"];
  runtimeBridgePosture: StrategicAdaptationRuntimeBridgeV1["runtimeBridgePosture"];
  feedbackLabel: AdaptiveStrategicFeedbackV1["feedbackLabel"];
  feedbackPosture: AdaptiveStrategicFeedbackV1["strategicFeedbackPosture"];
  directionLabel: StrategicDirectionEngineV1["directionLabel"];
}): StrategicDirectionEngineV1["nextSystemPriority"] {
  const destabilizedFeedback = input.feedbackLabel === "destabilized" || input.feedbackLabel === "reactive";
  const destabilizedPosture = input.feedbackPosture === "stabilize" || input.feedbackPosture === "correct";

  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable" || input.runtimeDecision === "blocked" || destabilizedFeedback || destabilizedPosture) {
    return "execution-stability";
  }

  if (input.consistencyLabel !== "high") return "consistency";

  if (input.semanticWeaknessClustersHigh || input.semanticHealthLabel === "low" || input.semanticHealthLabel === "medium") return "semantic-quality";

  const recommendationImpliesLearning =
    input.strategicPriorityDirection === "learning" || input.strategicPriorityDirection === "consistency";
  if (input.learningHealthLabel !== "high" || recommendationImpliesLearning) return "learning-quality";

  const safeExpansionPotential =
    (input.bridgeLabel === "aligned" || input.bridgeLabel === "runtime-ready") &&
    input.runtimeConstraintMode !== "strict" &&
    input.runtimeScopeGuidance !== "preview-only" &&
    input.runtimeBridgePosture !== "hold-runtime" &&
    (input.doctrineLabel === "adaptive" || input.doctrineLabel === "progressive" || input.doctrineLabel === "strategic");
  if (safeExpansionPotential) return "adaptive-runtime";

  const autonomyReady =
    input.doctrineLabel === "strategic" &&
    input.directionLabel === "scale-intelligence" &&
    input.bridgeLabel === "runtime-ready" &&
    input.runtimeConstraintMode === "open-guided";
  if (autonomyReady) return "autonomy-preparation";

  return "learning-quality";
}

function computeStrategicDirection(input: {
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
  policyLabel: AdaptiveStrategicPolicyV1["policyLabel"];
  adaptationPhase: StrategicAdaptationOrchestratorV1["adaptationPhase"];
  recommendationLabel: AdaptiveStrategyRecommendationsV1["recommendationLabel"];
  nextSystemPriority: StrategicDirectionEngineV1["nextSystemPriority"];
  runtimeScopeGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"];
}): StrategicDirectionEngineV1["strategicDirection"] {
  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable" || input.doctrineLabel === "contained") {
    return "reduce-system-instability";
  }

  if (
    input.policyLabel === "constrained" ||
    input.policyLabel === "stabilizing" ||
    input.adaptationPhase === "system-recovery" ||
    input.adaptationPhase === "learning-stabilization"
  ) {
    return "stabilize-adaptive-core";
  }

  const intelligencePriority =
    input.nextSystemPriority === "learning-quality" || input.nextSystemPriority === "consistency" || input.nextSystemPriority === "semantic-quality";
  if (input.recommendationLabel === "consolidate" || input.recommendationLabel === "optimize" || intelligencePriority) {
    return "deepen-intelligence";
  }

  if (
    input.doctrineLabel === "adaptive" ||
    input.doctrineLabel === "progressive" ||
    input.runtimeScopeGuidance === "semantic-preferred" ||
    input.runtimeScopeGuidance === "mixed-phase-1-preferred" ||
    input.runtimeScopeGuidance === "broad-guided-runtime"
  ) {
    return "expand-adaptive-runtime";
  }

  return "prepare-system-scale";
}

function computeStrategicHorizon(input: {
  directionLabel: StrategicDirectionEngineV1["directionLabel"];
  unresolvedRatio: number;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  adaptationTempo: StrategicAdaptationOrchestratorV1["adaptationTempo"];
  runtimeConstraintMode: StrategicRuntimeAdaptationPolicyV1["runtimeConstraintMode"];
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
}): StrategicDirectionEngineV1["strategicDirectionHorizon"] {
  if (
    input.directionLabel === "recover" ||
    input.unresolvedRatio > 0.3 ||
    input.consistencyLabel === "low" ||
    input.runtimeDecision === "blocked"
  ) {
    return "immediate";
  }

  if (input.directionLabel === "stabilize" || input.adaptationTempo === "slow" || input.runtimeConstraintMode === "strict" || input.runtimeConstraintMode === "controlled") {
    return "near-term";
  }

  const expansionTermEligible =
    input.directionLabel === "scale-intelligence" &&
    input.doctrineLabel === "strategic" &&
    input.consistencyLabel === "high" &&
    input.evolutionLabel === "accelerating";
  if (expansionTermEligible) return "expansion-term";

  return "mid-term";
}

function pushDeterministicInsights(input: {
  directionSignals: string[];
  directionConstraints: string[];
  directionRisks: string[];
  directionOpportunities: string[];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  policyLabel: AdaptiveStrategicPolicyV1["policyLabel"];
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
  recommendationLabel: AdaptiveStrategyRecommendationsV1["recommendationLabel"];
  adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  unresolvedRatio: number;
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
}): void {
  const limit = 6;

  if (input.evolutionLabel === "progressing" || input.evolutionLabel === "accelerating") {
    addUniqueLimited(input.directionSignals, "Strategic evolution is supporting forward system movement.", limit);
  }
  if (input.bridgeLabel === "aligned" || input.bridgeLabel === "runtime-ready") {
    addUniqueLimited(input.directionSignals, "Adaptive runtime alignment supports broader system direction.", limit);
  }
  if (input.consistencyLabel === "high") {
    addUniqueLimited(input.directionSignals, "High consistency supports a stronger long-horizon direction.", limit);
  }
  if (input.policyLabel === "expansion-ready") {
    addUniqueLimited(input.directionSignals, "Strategic policy is aligned with expansion.", limit);
  }
  if (input.recommendationLabel === "accelerate" || input.recommendationLabel === "prepare-scale") {
    addUniqueLimited(input.directionSignals, "Recommendation layer supports higher-leverage progression.", limit);
  }
  if (input.doctrineLabel === "strategic") {
    addUniqueLimited(input.directionSignals, "System direction is becoming more coherent.", limit);
  }

  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable" || input.doctrineLabel === "contained") {
    addUniqueLimited(input.directionConstraints, "System direction remains constrained by instability signals.", limit);
  }
  if (input.consistencyLabel === "low") {
    addUniqueLimited(input.directionConstraints, "Low consistency limits long-horizon expansion.", limit);
  }
  if (input.policyLabel === "constrained" || input.policyLabel === "stabilizing") {
    addUniqueLimited(input.directionConstraints, "Adaptive core still requires stabilization.", limit);
  }
  if (input.doctrineLabel === "contained" || input.doctrineLabel === "guarded") {
    addUniqueLimited(input.directionConstraints, "Runtime doctrine is not yet open enough for broader direction.", limit);
  }
  if (input.unresolvedRatio > 0.3) {
    addUniqueLimited(input.directionConstraints, "Unresolved page pressure narrows strategic direction.", limit);
  }
  if (input.adaptationHealthLabel === "hold") {
    addUniqueLimited(input.directionConstraints, "Strategic expansion should be delayed until learning quality improves.", limit);
  }

  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable") {
    addUniqueLimited(input.directionRisks, "Regression risk may reverse strategic progress.", limit);
  }
  if (input.adaptationHealthLabel === "hold" || input.doctrineLabel === "contained") {
    addUniqueLimited(input.directionRisks, "Adaptive instability may fragment long-horizon direction.", limit);
  }
  if (input.consistencyLabel === "low") {
    addUniqueLimited(input.directionRisks, "Low semantic consistency increases direction risk.", limit);
  }
  if (input.recommendationLabel === "restructure") {
    addUniqueLimited(input.directionRisks, "Weak learning quality may limit strategic depth.", limit);
  }
  if (input.doctrineLabel === "guarded" || input.bridgeLabel === "guarded") {
    addUniqueLimited(input.directionRisks, "Runtime caution may slow broader evolution.", limit);
  }
  if (input.doctrineLabel !== "contained" && input.directionSignals.length >= 4 && input.consistencyLabel !== "high") {
    addUniqueLimited(input.directionRisks, "System may scale direction prematurely.", limit);
  }

  if (input.recommendationLabel === "consolidate" || input.recommendationLabel === "optimize") {
    addUniqueLimited(input.directionOpportunities, "System is ready to deepen adaptive intelligence.", limit);
  }
  if (input.bridgeLabel === "aligned" && input.doctrineLabel !== "contained") {
    addUniqueLimited(input.directionOpportunities, "Semantic adaptation can expand safely.", limit);
  }
  if (input.consistencyLabel === "medium") {
    addUniqueLimited(input.directionOpportunities, "Consistency gains can unlock stronger direction.", limit);
  }
  if (input.doctrineLabel === "progressive" || input.doctrineLabel === "strategic") {
    addUniqueLimited(input.directionOpportunities, "Runtime doctrine can support broader strategic movement.", limit);
  }
  if (input.bridgeLabel === "runtime-ready" && input.doctrineLabel !== "guarded" && input.runtimeDecision !== "blocked") {
    addUniqueLimited(input.directionOpportunities, "Strategic expansion can begin under guided conditions.", limit);
  }
  if (input.doctrineLabel === "strategic" && input.consistencyLabel === "high" && input.evolutionLabel === "accelerating") {
    addUniqueLimited(input.directionOpportunities, "System is approaching scalable intelligence maturity.", limit);
  }
}

function computeRecommendations(input: {
  directionRecommendations: string[];
  strategicDirection: StrategicDirectionEngineV1["strategicDirection"];
  nextSystemPriority: StrategicDirectionEngineV1["nextSystemPriority"];
  directionLabel: StrategicDirectionEngineV1["directionLabel"];
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  learningHealthLabel: "low" | "medium" | "high";
  semanticHealthLabel: SiteSemanticIntelligence["semanticHealthLabel"];
}): void {
  const limit = 6;
  const add = (value: string) => addUniqueLimited(input.directionRecommendations, value, limit);

  if (input.nextSystemPriority === "execution-stability") add("Prioritize execution stability before expanding adaptive scope.");
  if (input.strategicDirection === "stabilize-adaptive-core") add("Stabilize the adaptive core before broader runtime growth.");
  if (input.learningHealthLabel !== "high") add("Deepen learning quality before accelerating system scale.");
  if (input.nextSystemPriority === "adaptive-runtime" || input.strategicDirection === "expand-adaptive-runtime") {
    add("Expand semantic adaptation under guided runtime conditions.");
  }
  if (input.consistencyLabel !== "high") add("Use consistency improvements to unlock stronger strategic direction.");
  if (input.semanticHealthLabel !== "high" && input.nextSystemPriority !== "consistency") add("Prioritize semantic quality improvements before broader autonomy preparation.");

  const autonomyReadyHint = input.doctrineLabel === "strategic" && input.directionLabel === "scale-intelligence" && input.bridgeLabel === "runtime-ready";
  if (autonomyReadyHint) add("Prepare autonomy only after adaptive-runtime alignment is stable.");
}

function buildNotes(input: {
  notes: string[];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  nextSystemPriority: StrategicDirectionEngineV1["nextSystemPriority"];
  directionLabel: StrategicDirectionEngineV1["directionLabel"];
  strategicDirection: StrategicDirectionEngineV1["strategicDirection"];
  runtimeScopeGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"];
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
}): void {
  const limit = 6;
  addUniqueLimited(
    input.notes,
    "Strategic direction engine v1 is interpretive only and does not alter system behavior.",
    limit,
  );

  if (input.runtimeDecision === "blocked") addUniqueLimited(input.notes, "Runtime execution is currently blocked; prioritize removing blocking constraints.", limit);
  if (input.nextSystemPriority === "semantic-quality" || input.runtimeScopeGuidance === "semantic-preferred") {
    addUniqueLimited(input.notes, "Semantic-first strengthening is prioritized before broader scope expansion.", limit);
  }
  if (input.directionLabel === "recover" || input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable") {
    addUniqueLimited(input.notes, "Stability recovery pressure is present and should precede expansion.", limit);
  }
  if (input.strategicDirection === "stabilize-adaptive-core") {
    addUniqueLimited(input.notes, "Adaptive core strengthening is the dominant near-horizon direction.", limit);
  }
  if (input.strategicDirection === "expand-adaptive-runtime" && input.bridgeLabel !== "disconnected") {
    addUniqueLimited(input.notes, "Runtime-guided expansion is viable under current bridge posture.", limit);
  }
  if (input.doctrineLabel === "strategic" && input.bridgeLabel === "runtime-ready" && input.consistencyLabel === "high") {
    addUniqueLimited(input.notes, "Scale-readiness potential is emerging under strong alignment signals.", limit);
  }
}

export function buildStrategicDirectionEngineV1(input: StrategicDirectionEngineInputV1): StrategicDirectionEngineV1 {
  const unresolvedRatio = normalizeUnresolvedRatio(input);

  const strategicLearningCore = input.strategicLearningCore ?? null;
  const executionLearningSignals = input.executionLearningSignals ?? null;
  const adaptiveSchedulingSignals = input.adaptiveSchedulingSignals ?? null;
  const executionMemory = input.executionMemory ?? null;
  const strategicSemanticExecutionReadiness = input.strategicSemanticExecutionReadiness ?? null;
  const siteSemanticConsistency = input.siteSemanticConsistency ?? null;
  const siteSemanticIntelligence = input.siteSemanticIntelligence ?? null;
  const strategicExecutionRuntimeDecision = input.strategicExecutionRuntimeDecision ?? null;
  const autonomousExecutionPolicy = input.autonomousExecutionPolicy ?? null;
  const semiStrategicExecutionController = input.semiStrategicExecutionController ?? null;
  const adaptiveStrategicFeedback = input.adaptiveStrategicFeedback ?? null;

  const strategicEvolutionModel: StrategicEvolutionModelV1 =
    isRecord(unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel")) && typeof (unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel") as any).evolutionScore === "number"
      ? (unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel") as StrategicEvolutionModelV1)
      : buildStrategicEvolutionModelV1({
          strategicLearningCore,
          executionLearningSignals,
          adaptiveSchedulingSignals,
          strategicSemanticExecutionReadiness,
          executionMemory,
          siteSemanticConsistency,
          siteSemanticIntelligence,
          unresolvedRatio,
        });

  const adaptiveStrategicPolicy: AdaptiveStrategicPolicyV1 =
    isRecord(unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy")) && typeof (unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy") as any).policyScore === "number"
      ? (unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy") as AdaptiveStrategicPolicyV1)
      : buildAdaptiveStrategicPolicyV1({
          strategicEvolutionModel,
          strategicLearningCore,
          adaptiveSchedulingSignals,
          executionLearningSignals,
          executionMemory,
          strategicSemanticExecutionReadiness,
          siteSemanticConsistency,
          unresolvedRatio,
        });

  const strategicAdaptationOrchestrator: StrategicAdaptationOrchestratorV1 =
    isRecord(unwrapMaybeNested(input.strategicAdaptationOrchestrator, "strategicAdaptationOrchestrator")) &&
    typeof (unwrapMaybeNested(input.strategicAdaptationOrchestrator, "strategicAdaptationOrchestrator") as any).adaptationScore === "number"
      ? (unwrapMaybeNested(input.strategicAdaptationOrchestrator, "strategicAdaptationOrchestrator") as StrategicAdaptationOrchestratorV1)
      : buildStrategicAdaptationOrchestratorV1({
          strategicLearningCore,
          strategicEvolutionModel,
          adaptiveStrategicPolicy,
          adaptiveStrategicFeedback,
          adaptiveSchedulingSignals,
          executionLearningSignals,
          executionMemory,
          strategicSemanticExecutionReadiness,
          siteSemanticConsistency,
          unresolvedRatio,
        });

  const adaptiveStrategyRecommendations: AdaptiveStrategyRecommendationsV1 =
    isRecord(unwrapMaybeNested(input.adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations")) &&
    typeof (unwrapMaybeNested(input.adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations") as any).recommendationScore === "number"
      ? (unwrapMaybeNested(input.adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations") as AdaptiveStrategyRecommendationsV1)
      : buildAdaptiveStrategyRecommendationsV1({
          adaptiveStrategicPolicy,
          strategicAdaptationOrchestrator,
          strategicEvolutionModel,
          strategicLearningCore,
          executionLearningSignals,
          adaptiveSchedulingSignals,
          executionMemory,
          unresolvedRatio,
        });

  const strategicAdaptationRuntimeBridge: StrategicAdaptationRuntimeBridgeV1 =
    isRecord(unwrapMaybeNested(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge")) &&
    typeof (unwrapMaybeNested(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge") as any).bridgeScore === "number"
      ? (unwrapMaybeNested(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge") as StrategicAdaptationRuntimeBridgeV1)
      : buildStrategicAdaptationRuntimeBridgeV1({
          adaptiveStrategyRecommendations,
          strategicAdaptationOrchestrator,
          adaptiveStrategicPolicy,
          adaptiveStrategicFeedback,
          strategicEvolutionModel,
          strategicLearningCore,
          adaptiveSchedulingSignals,
          executionLearningSignals,
          executionMemory,
          strategicExecutionRuntimeDecision,
          autonomousExecutionPolicy,
          semiStrategicExecutionController,
          strategicSemanticExecutionReadiness,
          siteSemanticConsistency,
          siteSemanticIntelligence,
          unresolvedRatio,
        });

  const strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1 =
    isRecord(unwrapMaybeNested(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy")) &&
    typeof (unwrapMaybeNested(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy") as any).doctrineScore === "number"
      ? (unwrapMaybeNested(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy") as StrategicRuntimeAdaptationPolicyV1)
      : buildStrategicRuntimeAdaptationPolicyV1({
          strategicAdaptationRuntimeBridge,
          adaptiveStrategicPolicy,
          strategicAdaptationOrchestrator,
          adaptiveStrategyRecommendations,
          strategicEvolutionModel,
          strategicLearningCore,
          adaptiveSchedulingSignals,
          executionLearningSignals,
          executionMemory,
          strategicExecutionRuntimeDecision,
          autonomousExecutionPolicy,
          semiStrategicExecutionController,
          strategicSemanticExecutionReadiness,
          siteSemanticConsistency,
          siteSemanticIntelligence,
          unresolvedRatio,
        });

  const doctrineScore = normalizeScoreFrom(strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineScore");
  const bridgeScore = normalizeScoreFrom(strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge", "bridgeScore");
  const recommendationScore = normalizeScoreFrom(adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations", "recommendationScore");
  const adaptationScore = normalizeScoreFrom(strategicAdaptationOrchestrator, "strategicAdaptationOrchestrator", "adaptationScore");
  const policyScore = normalizeScoreFrom(adaptiveStrategicPolicy, "adaptiveStrategicPolicy", "policyScore");
  const evolutionScore = normalizeScoreFrom(strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore");

  const baseDirectionScore = (doctrineScore + bridgeScore + recommendationScore + adaptationScore + policyScore + evolutionScore) / 6;

  const doctrineLabel = normalizeDoctrineLabel(strategicRuntimeAdaptationPolicy, doctrineScore);
  const bridgeLabel = normalizeBridgeLabel(strategicAdaptationRuntimeBridge, bridgeScore);
  const recommendationLabel = normalizeRecommendationLabel(adaptiveStrategyRecommendations);
  const evolutionLabel = normalizeEvolutionLabel(strategicEvolutionModel, evolutionScore);
  const policyLabel = normalizePolicyLabel(adaptiveStrategicPolicy, policyScore);

  const adaptationPhase = normalizeAdaptationPhase(strategicAdaptationOrchestrator);
  const adaptationTempo = normalizeAdaptationTempo(strategicAdaptationOrchestrator);
  const runtimeScopeGuidance = normalizeRuntimeScopeGuidance(strategicAdaptationRuntimeBridge);
  const runtimeConstraintMode = normalizeRuntimeConstraintMode(strategicRuntimeAdaptationPolicy);
  const runtimeBridgePosture = normalizeRuntimeBridgePosture(strategicAdaptationRuntimeBridge);
  const runtimeDecision = normalizeRuntimeDecision(strategicExecutionRuntimeDecision);

  const adaptationHealthLabel = normalizeAdaptationHealthLabel(adaptiveSchedulingSignals);
  const consistencyLabel = normalizeConsistencyLabel({ ...input, executionMemory, siteSemanticConsistency });
  const semanticHealthLabel = normalizeSemanticHealthLabel({ ...input, siteSemanticIntelligence });
  const semanticWeaknessClustersHigh = normalizeSemanticWeaknessClustersHigh({ ...input, executionMemory });
  const learningHealthLabel = normalizeLearningHealthLabel({ ...input, executionLearningSignals });

  const feedbackLabel = normalizeFeedbackLabel({ ...input, adaptiveStrategicFeedback });
  const feedbackPosture = normalizeFeedbackPosture({ ...input, adaptiveStrategicFeedback });

  let directionScore = baseDirectionScore;

  if (doctrineLabel === "contained") directionScore -= 18;
  if (doctrineLabel === "guarded") directionScore -= 10;
  if (bridgeLabel === "disconnected") directionScore -= 15;
  if (recommendationLabel === "restructure") directionScore -= 15;
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") directionScore -= 12;
  if (policyLabel === "constrained") directionScore -= 12;
  if (adaptationHealthLabel === "hold") directionScore -= 10;
  if (consistencyLabel === "low") directionScore -= 12;
  if (unresolvedRatio > 0.3) directionScore -= 10;

  if (doctrineLabel === "strategic") directionScore += 10;
  if (bridgeLabel === "runtime-ready") directionScore += 8;
  if (recommendationLabel === "accelerate" || recommendationLabel === "prepare-scale") directionScore += 8;
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") directionScore += 8;
  if (policyLabel === "expansion-ready") directionScore += 8;
  if (adaptationHealthLabel === "ready") directionScore += 6;
  if (consistencyLabel === "high") directionScore += 6;

  directionScore = clamp0to100(directionScore);
  const directionLabel = directionLabelForScore(directionScore);

  const strategicPriorityDirectionRaw = String((unwrapMaybeNested(adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations") as any)?.strategicPriorityDirection ?? "").trim();
  const strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown" =
    strategicPriorityDirectionRaw === "structure" ||
    strategicPriorityDirectionRaw === "semantic" ||
    strategicPriorityDirectionRaw === "consistency" ||
    strategicPriorityDirectionRaw === "automation" ||
    strategicPriorityDirectionRaw === "learning" ||
    strategicPriorityDirectionRaw === "adaptive-balance"
      ? (strategicPriorityDirectionRaw as any)
      : "unknown";

  const nextSystemPriority = computeNextSystemPriority({
    evolutionLabel,
    runtimeDecision,
    consistencyLabel,
    semanticWeaknessClustersHigh,
    semanticHealthLabel,
    learningHealthLabel,
    strategicPriorityDirection,
    doctrineLabel,
    bridgeLabel,
    runtimeScopeGuidance,
    runtimeConstraintMode,
    runtimeBridgePosture,
    feedbackLabel,
    feedbackPosture,
    directionLabel,
  });

  const strategicDirection = computeStrategicDirection({
    evolutionLabel,
    doctrineLabel,
    policyLabel,
    adaptationPhase,
    recommendationLabel,
    nextSystemPriority,
    runtimeScopeGuidance,
  });

  const strategicDirectionHorizon = computeStrategicHorizon({
    directionLabel,
    unresolvedRatio,
    consistencyLabel,
    runtimeDecision,
    adaptationTempo,
    runtimeConstraintMode,
    doctrineLabel,
    evolutionLabel,
  });

  const directionSignals: string[] = [];
  const directionConstraints: string[] = [];
  const directionRisks: string[] = [];
  const directionOpportunities: string[] = [];
  const directionRecommendations: string[] = [];

  pushDeterministicInsights({
    directionSignals,
    directionConstraints,
    directionRisks,
    directionOpportunities,
    evolutionLabel,
    bridgeLabel,
    policyLabel,
    doctrineLabel,
    recommendationLabel,
    adaptationHealthLabel,
    consistencyLabel,
    unresolvedRatio,
    runtimeDecision,
  });

  computeRecommendations({
    directionRecommendations,
    strategicDirection,
    nextSystemPriority,
    directionLabel,
    bridgeLabel,
    doctrineLabel,
    consistencyLabel,
    learningHealthLabel,
    semanticHealthLabel,
  });

  const notes: string[] = [];
  buildNotes({
    notes,
    runtimeDecision,
    nextSystemPriority,
    directionLabel,
    strategicDirection,
    runtimeScopeGuidance,
    doctrineLabel,
    bridgeLabel,
    evolutionLabel,
    consistencyLabel,
  });

  return {
    directionScore,
    directionLabel,

    strategicDirection,
    strategicDirectionHorizon,
    nextSystemPriority,

    directionSignals,
    directionConstraints,
    directionRisks,
    directionOpportunities,
    directionRecommendations,

    summary: summaryForDirectionLabel(directionLabel),
    notes,
  };
}

