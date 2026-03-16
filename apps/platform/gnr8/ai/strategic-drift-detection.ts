import { buildStrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
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

export type StrategicDriftDetectionV1 = {
  driftScore: number;
  driftLabel: "stable" | "watch" | "drifting" | "severe-drift";

  driftState: "no-meaningful-drift" | "early-drift" | "active-drift" | "destabilizing-drift";

  driftType: "none" | "directional-drift" | "coherence-drift" | "oscillatory-drift" | "compound-drift";

  driftDirection: "improving" | "flat" | "worsening" | "volatile";

  temporalConfidence: number;

  driftSignals: string[];
  driftCauses: string[];
  driftRisks: string[];
  driftStabilizers: string[];
  driftRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicDriftDetectionInputV1 = {
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

function normalizeConsistencyLabel(input: StrategicDriftDetectionInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeUnresolvedRatio(input: StrategicDriftDetectionInputV1): number {
  return clamp0to1(input.unresolvedRatio, 1);
}

function normalizeMajorScore(value: unknown, nestedKey: string, scoreKey: string): number | null {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return null;
  const raw = (obj as any)[scoreKey] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : null;
}

function normalizeLabel(value: unknown, nestedKey: string, labelKey: string): string {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return "";
  return String((obj as any)[labelKey] ?? "").trim();
}

function normalizeStringArray(value: unknown, nestedKey: string, key: string): string[] {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return [];
  const raw = (obj as any)[key] as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
}

function driftLabelForScore(driftScore: number): StrategicDriftDetectionV1["driftLabel"] {
  if (driftScore <= 19) return "stable";
  if (driftScore <= 39) return "watch";
  if (driftScore <= 64) return "drifting";
  return "severe-drift";
}

function driftStateForLabel(label: StrategicDriftDetectionV1["driftLabel"]): StrategicDriftDetectionV1["driftState"] {
  if (label === "stable") return "no-meaningful-drift";
  if (label === "watch") return "early-drift";
  if (label === "drifting") return "active-drift";
  return "destabilizing-drift";
}

function summaryForLabel(label: StrategicDriftDetectionV1["driftLabel"]): string {
  switch (label) {
    case "stable":
      return "Strategic drift is currently low and the system remains temporally stable.";
    case "watch":
      return "Early strategic drift signals are present and should be monitored.";
    case "drifting":
      return "Strategic drift is active and requires corrective stabilization.";
    case "severe-drift":
      return "Strategic drift is severe and broader evolution should pause until coherence improves.";
    default:
      return "Strategic drift is currently low and the system remains temporally stable.";
  }
}

type MajorScoreKey = "alignmentScore" | "directionScore" | "doctrineScore" | "evolutionScore" | "strategicLearningScore";

type MajorScores = Record<MajorScoreKey, number>;

type MajorDeltas = Partial<Record<MajorScoreKey, number>>;

function computeDeltas(current: MajorScores, previous: Partial<MajorScores>): MajorDeltas {
  const deltas: MajorDeltas = {};
  (Object.keys(current) as MajorScoreKey[]).forEach((key) => {
    const prev = previous[key];
    if (typeof prev !== "number" || !Number.isFinite(prev)) return;
    deltas[key] = current[key] - prev;
  });
  return deltas;
}

function countDeltas(deltas: MajorDeltas, predicate: (delta: number) => boolean): number {
  let count = 0;
  for (const key of Object.keys(deltas) as MajorScoreKey[]) {
    const delta = deltas[key];
    if (typeof delta === "number" && Number.isFinite(delta) && predicate(delta)) count += 1;
  }
  return count;
}

function hasAnyDelta(deltas: MajorDeltas, predicate: (delta: number) => boolean): boolean {
  return countDeltas(deltas, predicate) >= 1;
}

export function buildStrategicDriftDetectionV1(input: StrategicDriftDetectionInputV1): StrategicDriftDetectionV1 {
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);

  const strategicLearningCore: StrategicLearningCoreV1 =
    (unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore") as any)?.strategicLearningScore !== undefined
      ? (unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore") as StrategicLearningCoreV1)
      : buildStrategicLearningCoreV1({
          executionLearningSignals: input.executionLearningSignals,
          adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
          executionMemory: input.executionMemory,
          siteSemanticConsistency: input.siteSemanticConsistency,
          siteSemanticIntelligence: input.siteSemanticIntelligence,
          strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
          strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
          autonomousExecutionPolicy: input.autonomousExecutionPolicy,
          semiStrategicExecutionController: input.semiStrategicExecutionController,
          unresolvedRatio,
        });

  const strategicEvolutionModel: StrategicEvolutionModelV1 =
    (unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel") as any)?.evolutionScore !== undefined
      ? (unwrapMaybeNested(input.strategicEvolutionModel, "strategicEvolutionModel") as StrategicEvolutionModelV1)
      : buildStrategicEvolutionModelV1({
          strategicLearningCore,
          executionLearningSignals: input.executionLearningSignals,
          adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
          strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
          executionMemory: input.executionMemory,
          siteSemanticIntelligence: input.siteSemanticIntelligence,
          siteSemanticConsistency: input.siteSemanticConsistency,
          unresolvedRatio,
        });

  const strategicRuntimeAdaptationPolicy: StrategicRuntimeAdaptationPolicyV1 =
    (unwrapMaybeNested(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy") as any)?.doctrineScore !== undefined
      ? (unwrapMaybeNested(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy") as StrategicRuntimeAdaptationPolicyV1)
      : buildStrategicRuntimeAdaptationPolicyV1({
          strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
          adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
          strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
          adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
          strategicEvolutionModel,
          strategicLearningCore,
          adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
          executionLearningSignals: input.executionLearningSignals,
          executionMemory: input.executionMemory,
          strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
          autonomousExecutionPolicy: input.autonomousExecutionPolicy,
          semiStrategicExecutionController: input.semiStrategicExecutionController,
          strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
          siteSemanticConsistency: input.siteSemanticConsistency,
          siteSemanticIntelligence: input.siteSemanticIntelligence,
          unresolvedRatio,
        });

  const strategicDirectionEngine: StrategicDirectionEngineV1 =
    (unwrapMaybeNested(input.strategicDirectionEngine, "strategicDirectionEngine") as any)?.directionScore !== undefined
      ? (unwrapMaybeNested(input.strategicDirectionEngine, "strategicDirectionEngine") as StrategicDirectionEngineV1)
      : buildStrategicDirectionEngineV1({
          strategicRuntimeAdaptationPolicy,
          strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
          adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
          strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
          adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
          adaptiveStrategicFeedback: input.adaptiveStrategicFeedback,
          strategicEvolutionModel,
          strategicLearningCore,
          adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
          executionLearningSignals: input.executionLearningSignals,
          executionMemory: input.executionMemory,
          strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
          autonomousExecutionPolicy: input.autonomousExecutionPolicy,
          semiStrategicExecutionController: input.semiStrategicExecutionController,
          strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
          siteSemanticConsistency: input.siteSemanticConsistency,
          siteSemanticIntelligence: input.siteSemanticIntelligence,
          unresolvedRatio,
        });

  const strategicSelfAlignment: StrategicSelfAlignmentV1 =
    (unwrapMaybeNested(input.strategicSelfAlignment, "strategicSelfAlignment") as any)?.alignmentScore !== undefined
      ? (unwrapMaybeNested(input.strategicSelfAlignment, "strategicSelfAlignment") as StrategicSelfAlignmentV1)
      : buildStrategicSelfAlignmentV1({
          strategicDirectionEngine,
          strategicRuntimeAdaptationPolicy,
          strategicAdaptationRuntimeBridge: input.strategicAdaptationRuntimeBridge,
          adaptiveStrategyRecommendations: input.adaptiveStrategyRecommendations,
          strategicAdaptationOrchestrator: input.strategicAdaptationOrchestrator,
          adaptiveStrategicPolicy: input.adaptiveStrategicPolicy,
          adaptiveStrategicFeedback: input.adaptiveStrategicFeedback,
          strategicEvolutionModel,
          strategicLearningCore,
          adaptiveSchedulingSignals: input.adaptiveSchedulingSignals,
          executionLearningSignals: input.executionLearningSignals,
          executionMemory: input.executionMemory,
          strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
          autonomousExecutionPolicy: input.autonomousExecutionPolicy,
          semiStrategicExecutionController: input.semiStrategicExecutionController,
          strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
          siteSemanticConsistency: input.siteSemanticConsistency,
          siteSemanticIntelligence: input.siteSemanticIntelligence,
          unresolvedRatio,
        });

  const policyLabelRaw = normalizeLabel(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy", "policyLabel");
  const policyLabel: AdaptiveStrategicPolicyV1["policyLabel"] = policyLabelRaw === "constrained" || policyLabelRaw === "stabilizing" || policyLabelRaw === "adaptive" || policyLabelRaw === "expansion-ready" ? (policyLabelRaw as any) : "constrained";

  const currentScores: MajorScores = {
    alignmentScore: clamp0to100(strategicSelfAlignment.alignmentScore),
    directionScore: clamp0to100(strategicDirectionEngine.directionScore),
    doctrineScore: clamp0to100(strategicRuntimeAdaptationPolicy.doctrineScore),
    evolutionScore: clamp0to100(strategicEvolutionModel.evolutionScore),
    strategicLearningScore: clamp0to100(strategicLearningCore.strategicLearningScore),
  };

  const previousScoresPartial: Partial<MajorScores> = {
    alignmentScore: normalizeMajorScore(input.previousStrategicSelfAlignment, "strategicSelfAlignment", "alignmentScore") ?? undefined,
    directionScore: normalizeMajorScore(input.previousStrategicDirectionEngine, "strategicDirectionEngine", "directionScore") ?? undefined,
    doctrineScore: normalizeMajorScore(input.previousStrategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineScore") ?? undefined,
    evolutionScore: normalizeMajorScore(input.previousStrategicEvolutionModel, "strategicEvolutionModel", "evolutionScore") ?? undefined,
    strategicLearningScore: normalizeMajorScore(input.previousStrategicLearningCore, "strategicLearningCore", "strategicLearningScore") ?? undefined,
  };

  const previousAvailable =
    Object.values(previousScoresPartial).filter((v) => typeof v === "number" && Number.isFinite(v)).length >= 1 ||
    isRecord(input.previousStrategicSelfAlignment) ||
    isRecord(input.previousStrategicDirectionEngine) ||
    isRecord(input.previousStrategicRuntimeAdaptationPolicy) ||
    isRecord(input.previousStrategicEvolutionModel) ||
    isRecord(input.previousStrategicLearningCore);

  const deltas = previousAvailable ? computeDeltas(currentScores, previousScoresPartial) : ({} as MajorDeltas);
  const improvedCount = previousAvailable ? countDeltas(deltas, (d) => d >= 10) : 0;
  const worsenedCount = previousAvailable ? countDeltas(deltas, (d) => d <= -10) : 0;

  let driftScore = 0;

  if (strategicSelfAlignment.alignmentLabel === "fragmented") driftScore += 20;
  else if (strategicSelfAlignment.alignmentLabel === "tense") driftScore += 10;

  if (strategicDirectionEngine.directionLabel === "recover") driftScore += 15;
  else if (strategicDirectionEngine.directionLabel === "stabilize") driftScore += 8;

  if (strategicRuntimeAdaptationPolicy.doctrineLabel === "contained") driftScore += 15;
  else if (strategicRuntimeAdaptationPolicy.doctrineLabel === "guarded") driftScore += 8;

  if (strategicEvolutionModel.evolutionLabel === "regressing") driftScore += 15;
  else if (strategicEvolutionModel.evolutionLabel === "unstable") driftScore += 10;

  if (policyLabel === "constrained") driftScore += 10;

  if (consistencyLabel === "low") driftScore += 12;

  if (unresolvedRatio > 0.3) driftScore += 10;

  if (previousAvailable) {
    if (typeof deltas.alignmentScore === "number" && deltas.alignmentScore <= -10) driftScore += 12;
    if (typeof deltas.directionScore === "number" && deltas.directionScore <= -10) driftScore += 10;
    if (typeof deltas.doctrineScore === "number" && deltas.doctrineScore <= -10) driftScore += 10;
    if (typeof deltas.evolutionScore === "number" && deltas.evolutionScore <= -10) driftScore += 10;
    if (typeof deltas.strategicLearningScore === "number" && deltas.strategicLearningScore <= -10) driftScore += 8;

    if (typeof deltas.alignmentScore === "number" && deltas.alignmentScore >= 10) driftScore -= 8;
    if (typeof deltas.directionScore === "number" && deltas.directionScore >= 10) driftScore -= 8;
    if (typeof deltas.doctrineScore === "number" && deltas.doctrineScore >= 10) driftScore -= 8;
    if (typeof deltas.evolutionScore === "number" && deltas.evolutionScore >= 10) driftScore -= 8;
    if (typeof deltas.strategicLearningScore === "number" && deltas.strategicLearningScore >= 10) driftScore -= 6;
  }

  driftScore = clamp0to100(driftScore);

  const driftLabel = driftLabelForScore(driftScore);
  const driftState = driftStateForLabel(driftLabel);

  const conflictCount = normalizeStringArray(strategicSelfAlignment, "strategicSelfAlignment", "alignmentConflicts").length;
  const coherenceDrift = conflictCount >= 2 || strategicSelfAlignment.alignmentLabel === "fragmented";
  const directionalDrift = previousAvailable && worsenedCount >= 2;
  const hasMeaningfulImprovement = previousAvailable && hasAnyDelta(deltas, (d) => d >= 10);
  const hasMeaningfulWorsening = previousAvailable && hasAnyDelta(deltas, (d) => d <= -10);

  const forwardWhileConstrained =
    (strategicDirectionEngine.directionLabel === "advance" || strategicDirectionEngine.directionLabel === "scale-intelligence") &&
    (strategicRuntimeAdaptationPolicy.doctrineLabel === "contained" ||
      strategicRuntimeAdaptationPolicy.doctrineLabel === "guarded" ||
      policyLabel === "constrained" ||
      strategicSelfAlignment.alignmentLabel === "fragmented");

  const oscillatoryDrift = (hasMeaningfulImprovement && hasMeaningfulWorsening) || forwardWhileConstrained;

  const driftType: StrategicDriftDetectionV1["driftType"] = (() => {
    if (!previousAvailable && driftScore < 20) return "none";
    if (coherenceDrift && directionalDrift) return "compound-drift";
    if (coherenceDrift) return "coherence-drift";
    if (directionalDrift) return "directional-drift";
    if (oscillatoryDrift) return "oscillatory-drift";
    return "none";
  })();

  const driftDirection: StrategicDriftDetectionV1["driftDirection"] = (() => {
    if (!previousAvailable) return "flat";
    const anyImproved = improvedCount >= 2 && worsenedCount === 0;
    const anyWorsened = worsenedCount >= 2 && improvedCount === 0;
    if (anyImproved) return "improving";
    if (anyWorsened) return "worsening";
    if (hasMeaningfulImprovement && hasMeaningfulWorsening) return "volatile";
    return "flat";
  })();

  let temporalConfidence = 100;
  if (!previousAvailable) temporalConfidence -= 25;
  else temporalConfidence += 5;
  if (consistencyLabel === "low") temporalConfidence -= 15;
  if (unresolvedRatio > 0.3) temporalConfidence -= 10;
  if (strategicSelfAlignment.alignmentLabel === "fragmented") temporalConfidence -= 10;
  if (driftType === "oscillatory-drift") temporalConfidence -= 10;
  if (driftType === "compound-drift") temporalConfidence -= 15;
  if (strategicSelfAlignment.alignmentLabel === "coherent" || strategicSelfAlignment.alignmentLabel === "strongly-aligned") temporalConfidence += 5;
  if (strategicRuntimeAdaptationPolicy.doctrineLabel === "progressive" || strategicRuntimeAdaptationPolicy.doctrineLabel === "strategic")
    temporalConfidence += 5;
  temporalConfidence = clamp0to100(temporalConfidence);

  const driftSignals: string[] = [];
  const driftCauses: string[] = [];
  const driftRisks: string[] = [];
  const driftStabilizers: string[] = [];
  const driftRecommendations: string[] = [];
  const notes: string[] = [];

  addUniqueLimited(notes, "Strategic drift detection v1 is interpretive only and does not alter system behavior.", 6);

  if (!previousAvailable) addUniqueLimited(notes, "No previous strategic snapshots were provided; temporal inference is conservative.", 6);
  if (temporalConfidence <= 49) addUniqueLimited(notes, "Temporal confidence is low; treat the strategic trajectory as provisional.", 6);
  if (driftType === "coherence-drift" || driftType === "compound-drift") addUniqueLimited(notes, "Coherence drift is present; internal conflicts are materially increasing drift pressure.", 6);
  if (driftDirection === "worsening") addUniqueLimited(notes, "Directional worsening is detected across major strategic scores.", 6);
  if (driftType === "oscillatory-drift") addUniqueLimited(notes, "Oscillatory drift is present; major signals show contradictory movement.", 6);
  if (driftType === "compound-drift") addUniqueLimited(notes, "Compound drift is present; both coherence and directional drift conditions are active.", 6);
  if (improvedCount >= 2 && !hasMeaningfulWorsening) addUniqueLimited(notes, "Stabilization signals are present across temporal comparison.", 6);

  if (!previousAvailable) {
    addUniqueLimited(driftSignals, "No prior strategic snapshot available for comparison.", 6);
  } else if (improvedCount === 0 && worsenedCount === 0) {
    addUniqueLimited(driftSignals, "Strategic scores are stable across temporal comparison.", 6);
  } else if (driftDirection === "improving") {
    addUniqueLimited(driftSignals, "Multiple major strategic scores improved compared with the prior state.", 6);
  } else if (driftDirection === "worsening") {
    addUniqueLimited(driftSignals, "Multiple major strategic scores worsened compared with the prior state.", 6);
  } else if (driftDirection === "volatile") {
    addUniqueLimited(driftSignals, "Major strategic scores show mixed improvement and regression across temporal comparison.", 6);
  }

  if (strategicSelfAlignment.alignmentLabel === "coherent" || strategicSelfAlignment.alignmentLabel === "strongly-aligned") {
    addUniqueLimited(driftSignals, "Strategic alignment remains consistent and coherent.", 6);
  }

  if (strategicDirectionEngine.directionLabel === "focus" || strategicDirectionEngine.directionLabel === "advance" || strategicDirectionEngine.directionLabel === "scale-intelligence") {
    addUniqueLimited(driftSignals, "Strategic direction remains oriented toward forward progress.", 6);
  }

  if (typeof deltas.alignmentScore === "number" && deltas.alignmentScore <= -10) {
    addUniqueLimited(driftCauses, "Strategic alignment weakened compared with the prior state.", 6);
  }
  if (strategicDirectionEngine.directionLabel === "recover" || strategicDirectionEngine.directionLabel === "stabilize") {
    addUniqueLimited(driftCauses, "Strategic direction is shifting toward recovery/stabilization.", 6);
  }
  if (strategicRuntimeAdaptationPolicy.doctrineLabel === "contained" || strategicRuntimeAdaptationPolicy.doctrineLabel === "guarded") {
    addUniqueLimited(driftCauses, "Runtime doctrine has become more constrained.", 6);
  }
  if (strategicEvolutionModel.evolutionLabel === "regressing" || strategicEvolutionModel.evolutionLabel === "unstable") {
    addUniqueLimited(driftCauses, "Evolution posture is regressing.", 6);
  }
  if (consistencyLabel === "low") {
    addUniqueLimited(driftCauses, "Low semantic consistency is amplifying strategic drift.", 6);
  }
  if (unresolvedRatio > 0.3) {
    addUniqueLimited(driftCauses, "Unresolved system pressure is contributing to temporal instability.", 6);
  }

  if (driftLabel === "watch" || driftLabel === "drifting" || driftLabel === "severe-drift") {
    addUniqueLimited(driftRisks, "Strategic drift may reduce adaptive coherence.", 6);
  }
  if (driftType === "directional-drift") {
    addUniqueLimited(driftRisks, "Directional drift may invalidate current expansion plans.", 6);
  }
  if (driftType === "oscillatory-drift") {
    addUniqueLimited(driftRisks, "Oscillatory drift may create unstable adaptive behavior.", 6);
  }
  if (driftType === "compound-drift") {
    addUniqueLimited(driftRisks, "Compound drift may fragment system intelligence.", 6);
  }
  if (temporalConfidence <= 49) {
    addUniqueLimited(driftRisks, "Low temporal confidence limits trust in strategic trajectory.", 6);
  }
  if (driftLabel === "severe-drift") {
    addUniqueLimited(driftRisks, "Severe drift may require strategic stabilization before expansion.", 6);
  }

  if (consistencyLabel === "high") {
    addUniqueLimited(driftStabilizers, "High consistency supports temporal stabilization.", 6);
  }
  if (strategicSelfAlignment.alignmentLabel === "strongly-aligned") {
    addUniqueLimited(driftStabilizers, "Strong strategic alignment reduces drift pressure.", 6);
  }
  if (typeof deltas.doctrineScore === "number" && deltas.doctrineScore >= 10) {
    addUniqueLimited(driftStabilizers, "Improving doctrine score supports drift recovery.", 6);
  }
  if (typeof deltas.strategicLearningScore === "number" && deltas.strategicLearningScore >= 10) {
    addUniqueLimited(driftStabilizers, "Stable learning signals reduce temporal volatility.", 6);
  }
  if (policyLabel === "adaptive" || policyLabel === "expansion-ready") {
    addUniqueLimited(driftStabilizers, "Adaptive policy remains aligned with strategic direction.", 6);
  }
  const bridgeLabelRaw = normalizeLabel(input.strategicAdaptationRuntimeBridge, "strategicAdaptationRuntimeBridge", "bridgeLabel");
  if (bridgeLabelRaw === "aligned" || bridgeLabelRaw === "runtime-ready") {
    addUniqueLimited(driftStabilizers, "Runtime bridge stability supports strategic continuity.", 6);
  }

  if (coherenceDrift) addUniqueLimited(driftRecommendations, "Reduce strategic conflicts before expanding adaptive scope.", 6);
  if (consistencyLabel === "low" && (coherenceDrift || driftLabel !== "stable")) addUniqueLimited(driftRecommendations, "Repair consistency to reduce coherence drift.", 6);
  if (strategicRuntimeAdaptationPolicy.doctrineLabel === "contained" || strategicRuntimeAdaptationPolicy.doctrineLabel === "guarded") {
    addUniqueLimited(driftRecommendations, "Stabilize runtime doctrine before broader strategic progression.", 6);
  }
  if (directionalDrift && driftDirection !== "improving") addUniqueLimited(driftRecommendations, "Delay expansion while directional drift remains active.", 6);
  if (driftType === "oscillatory-drift") addUniqueLimited(driftRecommendations, "Monitor oscillatory signals before increasing adaptive tempo.", 6);
  if (driftType === "compound-drift") addUniqueLimited(driftRecommendations, "Use alignment consolidation to counter compound drift.", 6);
  if (driftLabel === "severe-drift") addUniqueLimited(driftRecommendations, "Prioritize strategic stabilization before any additional evolution.", 6);

  return {
    driftScore,
    driftLabel,
    driftState,
    driftType,
    driftDirection,
    temporalConfidence,
    driftSignals,
    driftCauses,
    driftRisks,
    driftStabilizers,
    driftRecommendations,
    summary: summaryForLabel(driftLabel),
    notes,
  };
}
