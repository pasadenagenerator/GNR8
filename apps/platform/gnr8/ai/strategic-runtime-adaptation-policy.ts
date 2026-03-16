import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
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
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

export type StrategicRuntimeAdaptationPolicyV1 = {
  doctrineScore: number;
  doctrineLabel: "contained" | "guarded" | "adaptive" | "progressive" | "strategic";

  runtimeOperatingDoctrine:
    | "conservative-execution"
    | "guided-adaptive-execution"
    | "progressive-execution"
    | "strategic-expansion-execution";

  runtimeExpansionPolicy: "hold-scope" | "expand-semantic-first" | "expand-guided-runtime" | "prepare-broader-runtime";

  runtimeConstraintMode: "strict" | "controlled" | "managed" | "open-guided";

  doctrineSignals: string[];
  doctrineConstraints: string[];
  doctrineRisks: string[];
  doctrineOpportunities: string[];
  doctrineRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicRuntimeAdaptationPolicyInputV1 = {
  strategicAdaptationRuntimeBridge?: StrategicAdaptationRuntimeBridgeV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  strategicAdaptationOrchestrator?: StrategicAdaptationOrchestratorV1 | Record<string, unknown> | null;
  adaptiveStrategyRecommendations?: AdaptiveStrategyRecommendationsV1 | Record<string, unknown> | null;
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
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
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

function normalizeRuntimeConfidence(value: unknown): number {
  const unwrapped = unwrapMaybeNested(value, "strategicExecutionRuntimeDecision");
  if (!isRecord(unwrapped)) return 0;
  const raw = (unwrapped as any).confidence as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : 0;
}

function labelFromBridgeScore(score: number): StrategicAdaptationRuntimeBridgeV1["bridgeLabel"] {
  if (score <= 24) return "disconnected";
  if (score <= 49) return "guarded";
  if (score <= 74) return "aligned";
  return "runtime-ready";
}

function normalizeBridgeLabel(input: StrategicRuntimeAdaptationPolicyInputV1, bridgeScore: number): StrategicAdaptationRuntimeBridgeV1["bridgeLabel"] {
  const bridge = unwrapMaybeNested(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge");
  if (isRecord(bridge)) {
    const raw = String((bridge as any).bridgeLabel ?? "").trim();
    if (raw === "disconnected" || raw === "guarded" || raw === "aligned" || raw === "runtime-ready") return raw;
  }
  return labelFromBridgeScore(bridgeScore);
}

function postureFromBridgeLabel(label: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"]): StrategicAdaptationRuntimeBridgeV1["runtimeBridgePosture"] {
  if (label === "disconnected") return "hold-runtime";
  if (label === "guarded") return "guided-runtime";
  if (label === "aligned") return "adaptive-runtime";
  return "expand-runtime";
}

function normalizeRuntimeBridgePosture(input: StrategicRuntimeAdaptationPolicyInputV1, bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"]) {
  const bridge = unwrapMaybeNested(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge");
  if (isRecord(bridge)) {
    const raw = String((bridge as any).runtimeBridgePosture ?? "").trim();
    if (raw === "hold-runtime" || raw === "guided-runtime" || raw === "adaptive-runtime" || raw === "expand-runtime") return raw;
  }
  return postureFromBridgeLabel(bridgeLabel);
}

function normalizeRuntimeScopeGuidance(input: StrategicRuntimeAdaptationPolicyInputV1): StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"] {
  const bridge = unwrapMaybeNested(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge");
  if (isRecord(bridge)) {
    const raw = String((bridge as any).runtimeScopeGuidance ?? "").trim();
    if (
      raw === "preview-only" ||
      raw === "semantic-preferred" ||
      raw === "structural-phase-1-preferred" ||
      raw === "mixed-phase-1-preferred" ||
      raw === "broad-guided-runtime"
    ) {
      return raw;
    }
  }

  const runtimeDecision = normalizeRuntimeDecision(input.strategicExecutionRuntimeDecision);
  if (runtimeDecision === "blocked" || runtimeDecision === "preview-only") return "preview-only";

  const recommendations = unwrapMaybeNested(input.adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations");
  const strategicPriorityDirection = isRecord(recommendations) ? String((recommendations as any).strategicPriorityDirection ?? "").trim() : "";
  if (strategicPriorityDirection === "semantic") return "semantic-preferred";
  if (strategicPriorityDirection === "structure") return "structural-phase-1-preferred";

  const policy = unwrapMaybeNested(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy");
  const adaptivePosture = isRecord(policy) ? String((policy as any).adaptivePosture ?? "").trim() : "";
  if ((adaptivePosture === "guided-adaptation" || adaptivePosture === "accelerated-adaptation") && runtimeDecision === "mixed-execution") {
    return "mixed-phase-1-preferred";
  }

  return "preview-only";
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

function normalizeEvolutionLabel(value: unknown): StrategicEvolutionModelV1["evolutionLabel"] {
  const unwrapped = unwrapMaybeNested(value, "strategicEvolutionModel");
  if (!isRecord(unwrapped)) return "regressing";
  const raw = String((unwrapped as any).evolutionLabel ?? "").trim();
  if (raw === "regressing" || raw === "unstable" || raw === "stagnating" || raw === "progressing" || raw === "accelerating") return raw;
  return "regressing";
}

function normalizeDoctrineLabel(score: number): StrategicRuntimeAdaptationPolicyV1["doctrineLabel"] {
  if (score <= 19) return "contained";
  if (score <= 39) return "guarded";
  if (score <= 59) return "adaptive";
  if (score <= 79) return "progressive";
  return "strategic";
}

function operatingDoctrineFor(label: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"]): StrategicRuntimeAdaptationPolicyV1["runtimeOperatingDoctrine"] {
  if (label === "contained") return "conservative-execution";
  if (label === "guarded") return "guided-adaptive-execution";
  if (label === "adaptive") return "guided-adaptive-execution";
  if (label === "progressive") return "progressive-execution";
  return "strategic-expansion-execution";
}

function normalizeRecommendationLabel(value: unknown): AdaptiveStrategyRecommendationsV1["recommendationLabel"] {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategyRecommendations");
  if (!isRecord(unwrapped)) return "restructure";
  const raw = String((unwrapped as any).recommendationLabel ?? "").trim();
  if (raw === "stabilize" || raw === "optimize" || raw === "accelerate" || raw === "consolidate" || raw === "restructure" || raw === "prepare-scale") {
    return raw;
  }
  return "restructure";
}

function normalizePolicyLabel(value: unknown): AdaptiveStrategicPolicyV1["policyLabel"] {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategicPolicy");
  if (!isRecord(unwrapped)) return "constrained";
  const raw = String((unwrapped as any).policyLabel ?? "").trim();
  if (raw === "constrained" || raw === "stabilizing" || raw === "adaptive" || raw === "expansion-ready") return raw;
  return "constrained";
}

function normalizeStrategicPriorityDirection(value: unknown): AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown" {
  const unwrapped = unwrapMaybeNested(value, "adaptiveStrategyRecommendations");
  if (!isRecord(unwrapped)) return "unknown";
  const raw = String((unwrapped as any).strategicPriorityDirection ?? "").trim();
  if (
    raw === "structure" ||
    raw === "semantic" ||
    raw === "consistency" ||
    raw === "automation" ||
    raw === "learning" ||
    raw === "adaptive-balance"
  ) {
    return raw;
  }
  return "unknown";
}

function normalizeUnresolvedRatio(input: StrategicRuntimeAdaptationPolicyInputV1): number {
  if (typeof input.unresolvedRatio === "number" && Number.isFinite(input.unresolvedRatio)) return clamp0to1(input.unresolvedRatio);

  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
    if (pressure && typeof pressure.unresolvedRatioHigh === "boolean") return pressure.unresolvedRatioHigh === true ? 0.31 : 0;
  }

  return 0;
}

type EffectiveFeedbackLabel = "destabilized" | "reactive" | "adjusting" | "adaptive" | "self-optimizing";

function effectiveFeedbackLabelFromOrchestrator(orchestrator: unknown): EffectiveFeedbackLabel {
  const unwrapped = unwrapMaybeNested(orchestrator, "strategicAdaptationOrchestrator");
  if (!isRecord(unwrapped)) return "destabilized";
  const labelRaw = String((unwrapped as any).adaptationLabel ?? "").trim();
  if (labelRaw === "recovery") return "destabilized";
  if (labelRaw === "stabilizing") return "adjusting";
  if (labelRaw === "coordinating" || labelRaw === "expanding") return "adaptive";
  if (labelRaw === "orchestrating") return "self-optimizing";
  return "destabilized";
}

function resolveRuntimeExpansionPolicy(input: {
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  strategicPriorityDirection: AdaptiveStrategyRecommendationsV1["strategicPriorityDirection"] | "unknown";
  runtimeScopeGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"];
  bridgeLabel: StrategicAdaptationRuntimeBridgeV1["bridgeLabel"];
  runtimeBridgePosture: StrategicAdaptationRuntimeBridgeV1["runtimeBridgePosture"];
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
}): StrategicRuntimeAdaptationPolicyV1["runtimeExpansionPolicy"] {
  if (input.runtimeDecision === "blocked") return "hold-scope";

  if (input.strategicPriorityDirection === "semantic" || input.runtimeScopeGuidance === "semantic-preferred") {
    return "expand-semantic-first";
  }

  if (input.bridgeLabel === "guarded" || input.bridgeLabel === "aligned" || input.runtimeBridgePosture === "guided-runtime" || input.runtimeBridgePosture === "adaptive-runtime") {
    return "expand-guided-runtime";
  }

  if (
    (input.doctrineLabel === "progressive" || input.doctrineLabel === "strategic") &&
    (input.runtimeScopeGuidance === "mixed-phase-1-preferred" || input.runtimeScopeGuidance === "broad-guided-runtime")
  ) {
    return "prepare-broader-runtime";
  }

  return "hold-scope";
}

function resolveRuntimeConstraintMode(input: {
  doctrineLabel: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"];
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  effectiveFeedbackLabel: EffectiveFeedbackLabel;
  unresolvedRatio: number;
  adaptationTempo: StrategicAdaptationOrchestratorV1["adaptationTempo"];
  runtimeScopeGuidance: StrategicAdaptationRuntimeBridgeV1["runtimeScopeGuidance"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
}): StrategicRuntimeAdaptationPolicyV1["runtimeConstraintMode"] {
  const openGuided =
    input.doctrineLabel === "strategic" &&
    (input.runtimeDecision === "semantic-execution" || input.runtimeDecision === "structural-execution" || input.runtimeDecision === "mixed-execution") &&
    input.consistencyLabel === "high" &&
    input.evolutionLabel === "accelerating";
  if (openGuided) return "open-guided";

  const strict =
    input.doctrineLabel === "contained" ||
    input.runtimeDecision === "blocked" ||
    input.effectiveFeedbackLabel === "destabilized" ||
    input.unresolvedRatio > 0.3;
  if (strict) return "strict";

  const controlled =
    input.doctrineLabel === "guarded" || input.adaptationTempo === "slow" || input.runtimeScopeGuidance === "preview-only";
  if (controlled) return "controlled";

  const managed = input.doctrineLabel === "adaptive" || input.doctrineLabel === "progressive";
  if (managed) return "managed";

  return "managed";
}

function summaryForDoctrineLabel(label: StrategicRuntimeAdaptationPolicyV1["doctrineLabel"]): string {
  if (label === "contained") return "Runtime doctrine should remain conservative under current adaptive conditions.";
  if (label === "guarded") return "Runtime doctrine supports only guarded adaptive behavior.";
  if (label === "adaptive") return "Runtime doctrine supports adaptive behavior under controlled conditions.";
  if (label === "progressive") return "Runtime doctrine supports progressive runtime expansion.";
  return "Runtime doctrine supports strategic runtime expansion under strong adaptive alignment.";
}

export function buildStrategicRuntimeAdaptationPolicyV1(input: StrategicRuntimeAdaptationPolicyInputV1): StrategicRuntimeAdaptationPolicyV1 {
  const bridgeScore = normalizeScoreFrom(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge", "bridgeScore");
  const policyScore = normalizeScoreFrom(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy", "policyScore");
  const adaptationScore = normalizeScoreFrom(input.strategicAdaptationOrchestrator, "strategicAdaptationOrchestrator", "adaptationScore");
  const recommendationScore = normalizeScoreFrom(input.adaptiveStrategyRecommendations, "adaptiveStrategyRecommendations", "recommendationScore");
  const evolutionScore = normalizeScoreFrom(input.strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore");
  const runtimeConfidence = normalizeRuntimeConfidence(input.strategicExecutionRuntimeDecision);

  const baseDoctrineScore = clamp0to100((bridgeScore + policyScore + adaptationScore + recommendationScore + evolutionScore + runtimeConfidence) / 6);

  const bridgeLabel = normalizeBridgeLabel(input, bridgeScore);
  const policyLabel = normalizePolicyLabel(input.adaptiveStrategicPolicy);
  const recommendationLabel = normalizeRecommendationLabel(input.adaptiveStrategyRecommendations);
  const evolutionLabel = normalizeEvolutionLabel(input.strategicEvolutionModel);
  const runtimeDecision = normalizeRuntimeDecision(input.strategicExecutionRuntimeDecision);
  const adaptationHealthLabel = normalizeAdaptationHealthLabel(input.adaptiveSchedulingSignals);
  const consistencyLabel = normalizeConsistencyLabel(input.siteSemanticConsistency);
  const unresolvedRatio = normalizeUnresolvedRatio(input);

  let doctrineScore = baseDoctrineScore;

  if (bridgeLabel === "disconnected") doctrineScore -= 18;
  if (bridgeLabel === "guarded") doctrineScore -= 10;
  if (policyLabel === "constrained") doctrineScore -= 12;
  if (recommendationLabel === "restructure") doctrineScore -= 15;
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") doctrineScore -= 12;
  if (runtimeDecision === "blocked") doctrineScore -= 20;
  if (adaptationHealthLabel === "hold") doctrineScore -= 10;
  if (consistencyLabel === "low") doctrineScore -= 12;
  if (unresolvedRatio > 0.3) doctrineScore -= 10;

  if (bridgeLabel === "runtime-ready") doctrineScore += 10;
  if (policyLabel === "expansion-ready") doctrineScore += 8;
  if (recommendationLabel === "accelerate" || recommendationLabel === "prepare-scale") doctrineScore += 8;
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") doctrineScore += 8;
  if (runtimeDecision === "semantic-execution" || runtimeDecision === "structural-execution" || runtimeDecision === "mixed-execution") doctrineScore += 6;
  if (adaptationHealthLabel === "ready") doctrineScore += 6;
  if (consistencyLabel === "high") doctrineScore += 6;

  doctrineScore = clamp0to100(doctrineScore);

  const doctrineLabel = normalizeDoctrineLabel(doctrineScore);
  const runtimeOperatingDoctrine = operatingDoctrineFor(doctrineLabel);

  const strategicPriorityDirection = normalizeStrategicPriorityDirection(input.adaptiveStrategyRecommendations);
  const runtimeScopeGuidance = normalizeRuntimeScopeGuidance(input);
  const runtimeBridgePosture = normalizeRuntimeBridgePosture(input, bridgeLabel);

  const runtimeExpansionPolicy = resolveRuntimeExpansionPolicy({
    runtimeDecision,
    strategicPriorityDirection,
    runtimeScopeGuidance,
    bridgeLabel,
    runtimeBridgePosture,
    doctrineLabel,
  });

  const adaptationTempo = normalizeAdaptationTempo(input.strategicAdaptationOrchestrator);
  const effectiveFeedbackLabel = effectiveFeedbackLabelFromOrchestrator(input.strategicAdaptationOrchestrator);
  const runtimeConstraintMode = resolveRuntimeConstraintMode({
    doctrineLabel,
    runtimeDecision,
    effectiveFeedbackLabel,
    unresolvedRatio,
    adaptationTempo,
    runtimeScopeGuidance,
    consistencyLabel,
    evolutionLabel,
  });

  const doctrineSignals: string[] = [];
  const doctrineConstraints: string[] = [];
  const doctrineRisks: string[] = [];
  const doctrineOpportunities: string[] = [];
  const doctrineRecommendations: string[] = [];

  if (bridgeLabel === "aligned" || bridgeLabel === "runtime-ready") {
    addUniqueLimited(doctrineSignals, "Adaptive intelligence is aligned with runtime behavior.", 6);
  }
  if (runtimeExpansionPolicy !== "hold-scope" && runtimeConstraintMode !== "strict") {
    addUniqueLimited(doctrineSignals, "Runtime expansion can proceed under guided conditions.", 6);
  }
  if (evolutionLabel === "progressing" || evolutionLabel === "accelerating") {
    addUniqueLimited(doctrineSignals, "Strategic evolution supports broader runtime confidence.", 6);
  }
  if (consistencyLabel === "high") addUniqueLimited(doctrineSignals, "High consistency supports a stronger runtime doctrine.", 6);
  if (recommendationLabel === "accelerate" || recommendationLabel === "prepare-scale" || recommendationLabel === "optimize") {
    addUniqueLimited(doctrineSignals, "Adaptive recommendations support controlled progression.", 6);
  }
  if (bridgeLabel === "runtime-ready") addUniqueLimited(doctrineSignals, "Runtime bridge indicates stable operational alignment.", 6);

  if (bridgeLabel === "guarded") addUniqueLimited(doctrineConstraints, "Runtime remains constrained by guarded adaptive posture.", 6);
  if (bridgeLabel === "disconnected") addUniqueLimited(doctrineConstraints, "Adaptive state does not yet support strategic expansion.", 6);
  if (runtimeDecision === "blocked") addUniqueLimited(doctrineConstraints, "Blocked runtime decisions prevent broader doctrine expansion.", 6);
  if (consistencyLabel === "low") addUniqueLimited(doctrineConstraints, "Low consistency limits doctrine openness.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(doctrineConstraints, "Unresolved pressure requires stricter runtime control.", 6);
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") {
    addUniqueLimited(doctrineConstraints, "Doctrinal openness must remain limited until evolution stabilizes.", 6);
  }

  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") {
    addUniqueLimited(doctrineRisks, "Strategic instability may invalidate runtime expansion.", 6);
  }
  if (policyLabel === "constrained" || bridgeLabel === "disconnected") {
    addUniqueLimited(doctrineRisks, "Adaptive drift may weaken runtime doctrine reliability.", 6);
  }
  if (consistencyLabel === "low") addUniqueLimited(doctrineRisks, "Low semantic consistency increases doctrine risk.", 6);
  if (runtimeConfidence < 60) addUniqueLimited(doctrineRisks, "Execution confidence is insufficient for open-guided runtime.", 6);
  if ((doctrineLabel === "progressive" || doctrineLabel === "strategic") && runtimeConstraintMode !== "open-guided" && consistencyLabel !== "high") {
    addUniqueLimited(doctrineRisks, "Scope expansion may be premature under current conditions.", 6);
  }
  if (bridgeLabel === "guarded" || bridgeLabel === "disconnected") addUniqueLimited(doctrineRisks, "Guarded runtime posture may still be necessary.", 6);

  if (runtimeExpansionPolicy === "expand-semantic-first") addUniqueLimited(doctrineOpportunities, "Semantic-first runtime expansion is supported.", 6);
  if (runtimeExpansionPolicy === "expand-guided-runtime") addUniqueLimited(doctrineOpportunities, "Guided runtime growth can proceed safely.", 6);
  if (runtimeExpansionPolicy === "prepare-broader-runtime" && consistencyLabel === "high") {
    addUniqueLimited(doctrineOpportunities, "Broader runtime preparation can begin under high consistency.", 6);
  }
  if (policyLabel === "expansion-ready" && (bridgeLabel === "aligned" || bridgeLabel === "runtime-ready")) {
    addUniqueLimited(doctrineOpportunities, "Adaptive intelligence is ready to shape runtime more strongly.", 6);
  }
  if (doctrineLabel === "progressive" || doctrineLabel === "strategic") {
    addUniqueLimited(doctrineOpportunities, "Strategic expansion posture is becoming viable.", 6);
  }
  if (doctrineLabel !== "contained") addUniqueLimited(doctrineOpportunities, "Operational doctrine can move beyond conservative execution.", 6);

  if (doctrineLabel === "contained") {
    addUniqueLimited(doctrineRecommendations, "Keep runtime in conservative execution mode until doctrine stabilizes.", 6);
  }
  if (doctrineLabel === "guarded" || doctrineLabel === "adaptive") {
    addUniqueLimited(doctrineRecommendations, "Use guided adaptive execution while consistency strengthens.", 6);
  }
  if (runtimeExpansionPolicy === "expand-semantic-first") {
    addUniqueLimited(doctrineRecommendations, "Prefer semantic-first runtime growth before broader expansion.", 6);
  }
  if (runtimeExpansionPolicy === "prepare-broader-runtime") {
    addUniqueLimited(doctrineRecommendations, "Prepare broader runtime only under high-consistency conditions.", 6);
  }
  if (runtimeDecision === "blocked") {
    addUniqueLimited(doctrineRecommendations, "Avoid strategic expansion until blocked constraints are cleared.", 6);
  }
  if (doctrineLabel === "strategic" && runtimeConstraintMode !== "open-guided") {
    addUniqueLimited(doctrineRecommendations, "Increase runtime openness only when adaptive alignment remains strong.", 6);
  }

  const summary = summaryForDoctrineLabel(doctrineLabel);

  const notes: string[] = [];
  addUniqueLimited(
    notes,
    "Strategic runtime adaptation policy v1 is interpretive only and does not alter runtime behavior.",
    6,
  );
  if (runtimeDecision === "blocked") addUniqueLimited(notes, "Runtime decision is blocked; doctrine must hold scope.", 6);
  if (runtimeExpansionPolicy === "expand-semantic-first") addUniqueLimited(notes, "Doctrine favors semantic-first expansion under current guidance.", 6);
  if (doctrineLabel === "guarded") addUniqueLimited(notes, "Doctrine posture remains guarded and limits expansion.", 6);
  if (runtimeConstraintMode === "strict") addUniqueLimited(notes, "Runtime constraint mode is strict under current governance signals.", 6);
  if (runtimeConstraintMode === "open-guided") addUniqueLimited(notes, "Open-guided constraint mode is permitted under strong readiness conditions.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(notes, "Unresolved pressure remains high and requires conservative governance.", 6);

  return {
    doctrineScore,
    doctrineLabel,
    runtimeOperatingDoctrine,
    runtimeExpansionPolicy,
    runtimeConstraintMode,
    doctrineSignals,
    doctrineConstraints,
    doctrineRisks,
    doctrineOpportunities,
    doctrineRecommendations,
    summary,
    notes,
  };
}

