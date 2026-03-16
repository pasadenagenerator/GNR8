import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import { buildAdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import { buildAdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { AdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import { buildAdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import { buildStrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import { buildStrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

export type StrategicAdaptationRuntimeBridgeV1 = {
  bridgeScore: number;
  bridgeLabel: "disconnected" | "guarded" | "aligned" | "runtime-ready";

  runtimeBridgePosture: "hold-runtime" | "guided-runtime" | "adaptive-runtime" | "expand-runtime";

  runtimeScopeGuidance:
    | "preview-only"
    | "semantic-preferred"
    | "structural-phase-1-preferred"
    | "mixed-phase-1-preferred"
    | "broad-guided-runtime";

  runtimeTempoGuidance: "slow" | "controlled" | "progressive" | "accelerated";

  runtimeGuardrailSignals: string[];
  runtimeExpansionSignals: string[];
  runtimeCautionSignals: string[];
  runtimeBridgeRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicAdaptationRuntimeBridgeInputV1 = {
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

function normalizeScoreFrom(obj: unknown, keys: string[], nestedKey?: string): number {
  const unwrapped = nestedKey ? unwrapMaybeNested(obj, nestedKey) : obj;
  if (!isRecord(unwrapped)) return 0;
  for (const key of keys) {
    const raw = (unwrapped as any)[key] as unknown;
    if (typeof raw === "number" && Number.isFinite(raw)) return clamp0to100(raw);
  }
  return 0;
}

function normalizeRecommendationLabel(value: unknown): AdaptiveStrategyRecommendationsV1["recommendationLabel"] {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategyRecommendations");
  if (!isRecord(unwrapped)) return "restructure";
  const raw = String((unwrapped as any).recommendationLabel ?? "").trim();
  if (
    raw === "stabilize" ||
    raw === "optimize" ||
    raw === "accelerate" ||
    raw === "consolidate" ||
    raw === "restructure" ||
    raw === "prepare-scale"
  ) {
    return raw;
  }
  return "restructure";
}

function normalizeStrategicPriorityDirection(value: unknown): AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown" {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategyRecommendations");
  if (!isRecord(unwrapped)) return "unknown";
  const raw = String((unwrapped as any).strategicPriorityDirection ?? "").trim();
  if (raw === "structure" || raw === "semantic" || raw === "consistency" || raw === "automation" || raw === "learning" || raw === "adaptive-balance")
    return raw;
  return "unknown";
}

function normalizePolicyLabel(value: unknown): AdaptiveStrategicPolicyV1["policyLabel"] {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategicPolicy");
  if (!isRecord(unwrapped)) return "constrained";
  const raw = String((unwrapped as any).policyLabel ?? "").trim();
  if (raw === "constrained" || raw === "stabilizing" || raw === "adaptive" || raw === "expansion-ready") return raw;
  return "constrained";
}

function normalizeAdaptivePosture(value: unknown): AdaptiveStrategicPolicyV1["adaptivePosture"] {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategicPolicy");
  if (!isRecord(unwrapped)) return "hold-evolution";
  const raw = String((unwrapped as any).adaptivePosture ?? "").trim();
  if (raw === "hold-evolution" || raw === "stabilize-learning" || raw === "guided-adaptation" || raw === "accelerated-adaptation") return raw;
  return "hold-evolution";
}

function normalizeFeedbackLabel(value: unknown): AdaptiveStrategicFeedbackV1["feedbackLabel"] {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategicFeedback");
  if (!isRecord(unwrapped)) return "destabilized";
  const raw = String((unwrapped as any).feedbackLabel ?? "").trim();
  if (raw === "destabilized" || raw === "reactive" || raw === "adjusting" || raw === "adaptive" || raw === "self-optimizing") return raw;
  return "destabilized";
}

function normalizeEvolutionLabel(value: unknown): StrategicEvolutionModelV1["evolutionLabel"] {
  const unwrapped = unwrapMaybeNested(value, "strategicEvolutionModel");
  if (!isRecord(unwrapped)) return "regressing";
  const raw = String((unwrapped as any).evolutionLabel ?? "").trim();
  if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  return "regressing";
}

function normalizeAdaptationTempo(value: unknown): StrategicAdaptationOrchestratorV1["adaptationTempo"] {
  const unwrapped = unwrapMaybeNested(value, "strategicAdaptationOrchestrator");
  if (!isRecord(unwrapped)) return "slow";
  const raw = String((unwrapped as any).adaptationTempo ?? "").trim();
  if (raw === "slow" || raw === "controlled" || raw === "progressive" || raw === "accelerated") return raw;
  return "slow";
}

function normalizeAdaptationHealthLabel(value: unknown): AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] {
  const unwrapped = unwrapMaybeNested(value, "adaptiveSchedulingSignals");
  if (!isRecord(unwrapped)) return "hold";
  const raw = String((unwrapped as any).adaptationHealthLabel ?? "").trim();
  if (raw === "ready" || raw === "watch" || raw === "hold") return raw;
  return "hold";
}

function normalizeConsistencyLabel(value: unknown): SiteSemanticConsistency["consistencyLabel"] {
  const unwrapped = unwrapMaybeNested(value, "siteSemanticConsistency");
  if (!isRecord(unwrapped)) return "low";
  const raw = String((unwrapped as any).consistencyLabel ?? "").trim();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "low";
}

function normalizeRuntimeDecision(value: unknown): StrategicExecutionRuntimeDecision["executionDecision"] {
  const unwrapped = unwrapMaybeNested(value, "strategicExecutionRuntimeDecision");
  if (!isRecord(unwrapped)) return "blocked";
  const raw = String((unwrapped as any).executionDecision ?? "").trim();
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

function labelFromBridgeScore(score: number): StrategicAdaptationRuntimeBridgeV1["bridgeLabel"] {
  if (score <= 24) return "disconnected";
  if (score <= 49) return "guarded";
  if (score <= 74) return "aligned";
  return "runtime-ready";
}

function postureFromBridgeLabel(label: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"]): StrategicAdaptationRuntimeBridgeV1["runtimeBridgePosture"] {
  if (label === "disconnected") return "hold-runtime";
  if (label === "guarded") return "guided-runtime";
  if (label === "aligned") return "adaptive-runtime";
  return "expand-runtime";
}

function summaryFromBridgeLabel(label: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"]): string {
  if (label === "disconnected") return "Adaptive intelligence is not yet sufficiently connected to runtime behavior.";
  if (label === "guarded") return "Adaptive intelligence supports runtime only under guarded conditions.";
  if (label === "aligned") return "Adaptive intelligence is aligned enough to guide runtime evolution.";
  return "Adaptive intelligence is strongly aligned with runtime expansion.";
}

function resolveScopeGuidance(input: {
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown";
  adaptivePosture: AdaptiveStrategicPolicyV1["adaptivePosture"];
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
}): StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"] {
  if (input.runtimeDecision === "blocked") return "preview-only";
  if (input.strategicPriorityDirection === "semantic") return "semantic-preferred";
  if (input.strategicPriorityDirection === "structure") return "structural-phase-1-preferred";
  if (
    (input.adaptivePosture === "guided-adaptation" || input.adaptivePosture === "accelerated-adaptation") &&
    input.runtimeDecision === "mixed-execution"
  ) {
    return "mixed-phase-1-preferred";
  }
  if (
    input.bridgeLabel === "runtime-ready" &&
    (input.runtimeDecision === "semantic-execution" || input.runtimeDecision === "structural-execution" || input.runtimeDecision === "mixed-execution")
  ) {
    return "broad-guided-runtime";
  }
  return "preview-only";
}

function resolveTempoGuidance(input: {
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  feedbackLabel: AdaptiveStrategicFeedbackV1["feedbackLabel"];
  adaptationTempo: StrategicAdaptationOrchestratorV1["adaptationTempo"];
  unresolvedRatio: number;
  policyLabel: AdaptiveStrategicPolicyV1["policyLabel"];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
}): StrategicAdaptationRuntimeBridgeV1["runtimeTempoGuidance"] {
  if (input.bridgeLabel === "disconnected" || input.feedbackLabel === "destabilized" || input.adaptationTempo === "slow" || input.unresolvedRatio > 0.3)
    return "slow";

  const accelerated =
    input.bridgeLabel === "runtime-ready" &&
    input.adaptationTempo === "accelerated" &&
    input.consistencyLabel === "high" &&
    input.evolutionLabel === "accelerating";
  if (accelerated) return "accelerated";

  if (input.bridgeLabel === "guarded" || input.policyLabel === "stabilizing" || input.runtimeDecision === "preview-only") return "controlled";
  if (input.bridgeLabel === "aligned" || input.adaptationTempo === "progressive") return "progressive";

  return "controlled";
}

function computeBridgeScore(input: {
  adaptiveStrategyRecommendations: unknown;
  strategicAdaptationOrchestrator: unknown;
  adaptiveStrategicPolicy: unknown;
  adaptiveStrategicFeedback: unknown;
  strategicEvolutionModel: unknown;
  strategicExecutionRuntimeDecision: unknown;
  unresolvedRatio: number;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  recommendationLabel: AdaptiveStrategyRecommendationsV1["recommendationLabel"];
  policyLabel: AdaptiveStrategicPolicyV1["policyLabel"];
  feedbackLabel: AdaptiveStrategicFeedbackV1["feedbackLabel"];
  adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
}): number {
  const baseAvg =
    (normalizeScoreFrom(input.adaptiveStrategyRecommendations, ["recommendationScore"], "adaptiveStrategyRecommendations") +
      normalizeScoreFrom(input.strategicAdaptationOrchestrator, ["adaptationScore"], "strategicAdaptationOrchestrator") +
      normalizeScoreFrom(input.adaptiveStrategicPolicy, ["policyScore"], "adaptiveStrategicPolicy") +
      normalizeScoreFrom(input.adaptiveStrategicFeedback, ["feedbackScore"], "adaptiveStrategicFeedback") +
      normalizeScoreFrom(input.strategicEvolutionModel, ["evolutionScore"], "strategicEvolutionModel") +
      normalizeScoreFrom(input.strategicExecutionRuntimeDecision, ["confidence"], "strategicExecutionRuntimeDecision")) /
    6;

  let score = clamp0to100(baseAvg);

  if (input.recommendationLabel === "restructure") score -= 18;
  if (input.policyLabel === "constrained") score -= 12;
  if (input.feedbackLabel === "destabilized") score -= 15;
  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable") score -= 12;
  if (input.adaptationHealthLabel === "hold") score -= 10;
  if (input.runtimeDecision === "blocked") score -= 20;
  if (input.consistencyLabel === "low") score -= 12;
  if (input.unresolvedRatio > 0.3) score -= 10;

  if (input.recommendationLabel === "accelerate" || input.recommendationLabel === "prepare-scale") score += 8;
  if (input.policyLabel === "expansion-ready") score += 8;
  if (input.feedbackLabel === "adaptive" || input.feedbackLabel === "self-optimizing") score += 8;
  if (input.evolutionLabel === "progressing" || input.evolutionLabel === "accelerating") score += 8;
  if (input.adaptationHealthLabel === "ready") score += 6;
  if (input.runtimeDecision === "semantic-execution" || input.runtimeDecision === "structural-execution" || input.runtimeDecision === "mixed-execution")
    score += 6;
  if (input.consistencyLabel === "high") score += 6;

  return clamp0to100(score);
}

function buildDeterministicSignals(input: {
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  runtimeScopeGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"];
  runtimeTempoGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeTempoGuidance"];
  recommendationLabel: AdaptiveStrategyRecommendationsV1["recommendationLabel"];
  strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown";
  policyLabel: AdaptiveStrategicPolicyV1["policyLabel"];
  adaptivePosture: AdaptiveStrategicPolicyV1["adaptivePosture"];
  feedbackLabel: AdaptiveStrategicFeedbackV1["feedbackLabel"];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"];
  adaptationTempo: StrategicAdaptationOrchestratorV1["adaptationTempo"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  unresolvedRatio: number;
}): Pick<
  StrategicAdaptationRuntimeBridgeV1,
  "runtimeGuardrailSignals" | "runtimeExpansionSignals" | "runtimeCautionSignals" | "runtimeBridgeRecommendations"
> {
  const runtimeGuardrailSignals: string[] = [];
  const runtimeExpansionSignals: string[] = [];
  const runtimeCautionSignals: string[] = [];
  const runtimeBridgeRecommendations: string[] = [];

  if (input.runtimeDecision === "blocked" || input.runtimeScopeGuidance === "preview-only") {
    addUniqueLimited(runtimeGuardrailSignals, "Runtime should remain preview-first under current strategic conditions.", 6);
  }
  if (input.consistencyLabel === "low") addUniqueLimited(runtimeGuardrailSignals, "Consistency limits broader runtime expansion.", 6);
  if (input.feedbackLabel === "destabilized" || input.adaptationHealthLabel === "hold") {
    addUniqueLimited(runtimeGuardrailSignals, "Adaptive state requires controlled runtime pacing.", 6);
  }
  if (input.unresolvedRatio > 0.3) addUniqueLimited(runtimeGuardrailSignals, "Unresolved page pressure limits runtime confidence.", 6);
  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable") {
    addUniqueLimited(runtimeGuardrailSignals, "Bridge remains guarded until strategic evolution stabilizes.", 6);
  }
  if (input.runtimeTempoGuidance === "controlled") addUniqueLimited(runtimeGuardrailSignals, "Execution instability still constrains runtime scope.", 6);

  if (input.runtimeDecision !== "blocked" && input.strategicPriorityDirection === "semantic") {
    addUniqueLimited(runtimeExpansionSignals, "Semantic runtime expansion is strategically supported.", 6);
  }
  if (input.bridgeLabel === "aligned" || input.bridgeLabel === "runtime-ready") {
    addUniqueLimited(runtimeExpansionSignals, "Adaptive state aligns with guided runtime expansion.", 6);
  }
  if (input.consistencyLabel === "high") addUniqueLimited(runtimeExpansionSignals, "High consistency supports broader runtime confidence.", 6);
  if (input.evolutionLabel === "progressing" || input.evolutionLabel === "accelerating") {
    addUniqueLimited(runtimeExpansionSignals, "Strategic evolution supports runtime progression.", 6);
  }
  if (input.runtimeDecision === "semantic-execution" || input.runtimeDecision === "structural-execution" || input.runtimeDecision === "mixed-execution") {
    addUniqueLimited(runtimeExpansionSignals, "Runtime scope may expand cautiously beyond preview.", 6);
  }
  if (input.bridgeLabel === "runtime-ready") addUniqueLimited(runtimeExpansionSignals, "System is approaching runtime-ready adaptive alignment.", 6);

  if (input.policyLabel === "constrained" || input.feedbackLabel === "reactive") {
    addUniqueLimited(runtimeCautionSignals, "Adaptive drift still requires caution.", 6);
  }
  if (input.consistencyLabel === "low") addUniqueLimited(runtimeCautionSignals, "Low semantic consistency increases runtime risk.", 6);
  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable") {
    addUniqueLimited(runtimeCautionSignals, "Strategic instability may invalidate fast runtime expansion.", 6);
  }
  if (input.feedbackLabel === "destabilized" || input.adaptationHealthLabel === "hold") {
    addUniqueLimited(runtimeCautionSignals, "Learning quality remains insufficient for faster runtime pacing.", 6);
  }
  if (input.runtimeDecision === "mixed-execution" && input.consistencyLabel !== "high") {
    addUniqueLimited(runtimeCautionSignals, "Runtime should avoid broad mixed execution under current conditions.", 6);
  }
  if (input.unresolvedRatio > 0.3) addUniqueLimited(runtimeCautionSignals, "High unresolved pressure increases runtime risk.", 6);

  if (input.runtimeDecision === "blocked" || input.runtimeScopeGuidance === "preview-only") {
    addUniqueLimited(runtimeBridgeRecommendations, "Keep runtime in preview-first mode until strategic stability improves.", 6);
  }
  if (input.strategicPriorityDirection === "semantic") {
    addUniqueLimited(runtimeBridgeRecommendations, "Prefer semantic runtime expansion before structural broadening.", 6);
  }
  if (input.strategicPriorityDirection === "structure") {
    addUniqueLimited(runtimeBridgeRecommendations, "Prefer structural phase-1 execution only under controlled conditions.", 6);
  }
  if (input.runtimeTempoGuidance === "slow" || input.runtimeTempoGuidance === "controlled") {
    addUniqueLimited(runtimeBridgeRecommendations, "Use controlled runtime pacing while consistency improves.", 6);
  }
  if (input.runtimeDecision === "mixed-execution" && input.consistencyLabel !== "high") {
    addUniqueLimited(runtimeBridgeRecommendations, "Prepare mixed runtime only under high-consistency conditions.", 6);
  }
  if (input.unresolvedRatio > 0.3) addUniqueLimited(runtimeBridgeRecommendations, "Reduce runtime aggression until unresolved pressure drops.", 6);

  if (input.bridgeLabel === "runtime-ready" && runtimeBridgeRecommendations.length < 6) {
    addUniqueLimited(runtimeBridgeRecommendations, "Expand guided runtime scope only after adaptive alignment strengthens.", 6);
  }

  return { runtimeGuardrailSignals, runtimeExpansionSignals, runtimeCautionSignals, runtimeBridgeRecommendations };
}

function buildDeterministicNotes(input: {
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  runtimeScopeGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"];
  strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown";
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  unresolvedRatio: number;
}): string[] {
  const notes: string[] = [];
  addUniqueLimited(
    notes,
    "Strategic adaptation runtime bridge v1 is interpretive only and does not alter runtime behavior.",
    6,
  );

  if (input.runtimeDecision === "blocked") addUniqueLimited(notes, "Runtime is currently blocked; bridge posture holds runtime until unblocked.", 6);
  if (input.runtimeScopeGuidance === "preview-only") addUniqueLimited(notes, "Runtime scope remains preview-only under current bridge guidance.", 6);
  if (input.strategicPriorityDirection === "semantic") addUniqueLimited(notes, "Strategic direction prefers semantic-first runtime scope.", 6);
  if (input.strategicPriorityDirection === "structure" && input.bridgeLabel !== "runtime-ready") {
    addUniqueLimited(notes, "Structural expansion remains phase-1 only until adaptive alignment strengthens.", 6);
  }
  if (input.consistencyLabel === "low") addUniqueLimited(notes, "Low semantic consistency constrains runtime expansion.", 6);
  if (input.unresolvedRatio > 0.3) addUniqueLimited(notes, "High unresolved ratio limits runtime confidence.", 6);
  if (input.bridgeLabel === "runtime-ready") addUniqueLimited(notes, "Bridge indicates runtime-ready potential for guided expansion.", 6);

  return notes;
}

function maybeBuildMissingModels(input: StrategicAdaptationRuntimeBridgeInputV1): {
  strategicLearningCore: StrategicLearningCoreV1 | Record<string, unknown> | null;
  strategicEvolutionModel: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  adaptiveStrategicFeedback: AdaptiveStrategicFeedbackV1 | Record<string, unknown> | null;
  strategicAdaptationOrchestrator: StrategicAdaptationOrchestratorV1 | Record<string, unknown> | null;
  adaptiveStrategyRecommendations: AdaptiveStrategyRecommendationsV1 | Record<string, unknown> | null;
} {
  const unresolvedRatio = typeof input.unresolvedRatio === "number" ? clamp0to1(input.unresolvedRatio) : 1;

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

  return {
    strategicLearningCore,
    strategicEvolutionModel,
    adaptiveStrategicPolicy,
    adaptiveStrategicFeedback,
    strategicAdaptationOrchestrator,
    adaptiveStrategyRecommendations,
  };
}

export function buildStrategicAdaptationRuntimeBridgeV1(input: StrategicAdaptationRuntimeBridgeInputV1): StrategicAdaptationRuntimeBridgeV1 {
  const unresolvedRatio = typeof input.unresolvedRatio === "number" ? clamp0to1(input.unresolvedRatio) : 1;

  const {
    strategicLearningCore,
    strategicEvolutionModel,
    adaptiveStrategicPolicy,
    adaptiveStrategicFeedback,
    strategicAdaptationOrchestrator,
    adaptiveStrategyRecommendations,
  } = maybeBuildMissingModels({ ...input, unresolvedRatio });

  const strategicExecutionRuntimeDecision = input.strategicExecutionRuntimeDecision ?? null;
  const siteSemanticConsistency = input.siteSemanticConsistency ?? null;
  const adaptiveSchedulingSignals = input.adaptiveSchedulingSignals ?? null;

  const recommendationLabel = normalizeRecommendationLabel(adaptiveStrategyRecommendations);
  const strategicPriorityDirection = normalizeStrategicPriorityDirection(adaptiveStrategyRecommendations);
  const policyLabel = normalizePolicyLabel(adaptiveStrategicPolicy);
  const adaptivePosture = normalizeAdaptivePosture(adaptiveStrategicPolicy);
  const feedbackLabel = normalizeFeedbackLabel(adaptiveStrategicFeedback);
  const evolutionLabel = normalizeEvolutionLabel(strategicEvolutionModel);
  const adaptationTempo = normalizeAdaptationTempo(strategicAdaptationOrchestrator);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(adaptiveSchedulingSignals);
  const runtimeDecision = normalizeRuntimeDecision(strategicExecutionRuntimeDecision);
  const consistencyLabel = normalizeConsistencyLabel(siteSemanticConsistency);

  const bridgeScore = computeBridgeScore({
    adaptiveStrategyRecommendations,
    strategicAdaptationOrchestrator,
    adaptiveStrategicPolicy,
    adaptiveStrategicFeedback,
    strategicEvolutionModel,
    strategicExecutionRuntimeDecision,
    unresolvedRatio,
    consistencyLabel,
    evolutionLabel,
    recommendationLabel,
    policyLabel,
    feedbackLabel,
    adaptationHealthLabel,
    runtimeDecision,
  });

  const bridgeLabel = labelFromBridgeScore(bridgeScore);
  const runtimeBridgePosture = postureFromBridgeLabel(bridgeLabel);

  const runtimeScopeGuidance = resolveScopeGuidance({
    runtimeDecision,
    strategicPriorityDirection,
    adaptivePosture,
    bridgeLabel,
  });

  const runtimeTempoGuidance = resolveTempoGuidance({
    bridgeLabel,
    feedbackLabel,
    adaptationTempo,
    unresolvedRatio,
    policyLabel,
    runtimeDecision,
    consistencyLabel,
    evolutionLabel,
  });

  const signals = buildDeterministicSignals({
    bridgeLabel,
    runtimeDecision,
    runtimeScopeGuidance,
    runtimeTempoGuidance,
    recommendationLabel,
    strategicPriorityDirection,
    policyLabel,
    adaptivePosture,
    feedbackLabel,
    evolutionLabel,
    adaptationHealthLabel,
    adaptationTempo,
    consistencyLabel,
    unresolvedRatio,
  });

  const summary = summaryFromBridgeLabel(bridgeLabel);
  const notes = buildDeterministicNotes({
    bridgeLabel,
    runtimeDecision,
    runtimeScopeGuidance,
    strategicPriorityDirection,
    consistencyLabel,
    unresolvedRatio,
  });

  void strategicLearningCore;

  return {
    bridgeScore,
    bridgeLabel,
    runtimeBridgePosture,
    runtimeScopeGuidance,
    runtimeTempoGuidance,
    runtimeGuardrailSignals: signals.runtimeGuardrailSignals,
    runtimeExpansionSignals: signals.runtimeExpansionSignals,
    runtimeCautionSignals: signals.runtimeCautionSignals,
    runtimeBridgeRecommendations: signals.runtimeBridgeRecommendations,
    summary,
    notes,
  };
}

