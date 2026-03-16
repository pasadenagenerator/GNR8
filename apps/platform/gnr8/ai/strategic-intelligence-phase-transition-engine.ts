import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildStrategicCoherenceEngineV1, type StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import { buildStrategicDirectionEngineV1, type StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import { buildStrategicDriftDetectionV1, type StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import { buildStrategicEvolutionModelV1, type StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import { buildStrategicIntelligenceReadinessGateV1, type StrategicIntelligenceReadinessGateV1 } from "@/gnr8/ai/strategic-intelligence-readiness-gate";
import { buildStrategicIntelligenceStabilityModelV1, type StrategicIntelligenceStabilityModelV1 } from "@/gnr8/ai/strategic-intelligence-stability-model";
import { buildStrategicLearningCoreV1, type StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicSelfAlignmentV1, type StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import { buildStrategicStabilityEngineV1, type StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";

export type StrategicIntelligencePhaseTransitionLabelV1 = "regressing" | "unstable" | "stagnant" | "progressing" | "transition-ready";

export type StrategicIntelligencePhaseTransitionStateV1 =
  | "phase-rollback-required"
  | "phase-hold-required"
  | "phase-stabilization-required"
  | "phase-preparation"
  | "phase-advance-allowed";

export type StrategicIntelligencePhaseTransitionDirectionV1 =
  | "regression"
  | "stabilization"
  | "recovery"
  | "advancement"
  | "consolidation";

export type StrategicIntelligencePhaseTransitionEngineV1 = {
  transitionScore: number;
  phaseTransitionLabel: StrategicIntelligencePhaseTransitionLabelV1;
  phaseTransitionState: StrategicIntelligencePhaseTransitionStateV1;
  transitionDirection: StrategicIntelligencePhaseTransitionDirectionV1;
  transitionConfidence: number;

  signals: string[];
  blockers: string[];
  risks: string[];
  opportunities: string[];

  summary: string;
  notes: string[];
};

export type StrategicIntelligencePhaseTransitionEngineInputV1 = {
  strategicIntelligenceReadinessGate?: StrategicIntelligenceReadinessGateV1 | Record<string, unknown> | null;
  strategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;

  strategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  strategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  strategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  strategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  strategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;

  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;
  unresolvedRatio?: number;

  previousStrategicIntelligenceState?: Record<string, unknown> | null;
  previousStrategicIntelligenceReadinessGate?: StrategicIntelligenceReadinessGateV1 | Record<string, unknown> | null;
  previousStrategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  previousStrategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  previousStrategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  previousStrategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
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

function normalizeOptionalScoreFrom(value: unknown, nestedKey: string, key: string): number | null {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return null;
  const raw = (obj as any)[key] as unknown;
  if (typeof raw !== "number" || !Number.isFinite(raw) || Number.isNaN(raw)) return null;
  return clamp0to100(raw);
}

function normalizeOptionalScoreFromKeys(value: unknown, nestedKey: string, keys: string[]): number | null {
  for (const key of keys) {
    const score = normalizeOptionalScoreFrom(value, nestedKey, key);
    if (typeof score === "number") return score;
  }
  return null;
}

function normalizeLabelFrom(value: unknown, nestedKey: string, key: string): string {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return "";
  return String((obj as any)[key] ?? "").trim();
}

function normalizeConsistencyLabel(input: StrategicIntelligencePhaseTransitionEngineInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeUnresolvedRatio(input: StrategicIntelligencePhaseTransitionEngineInputV1): number {
  return clamp0to1(input.unresolvedRatio, 1);
}

function readinessBucket(score: number | null): "blocked" | "limited" | "conditional" | "ready" | "advanced" {
  const s = typeof score === "number" ? score : 0;
  if (s <= 24) return "blocked";
  if (s <= 44) return "limited";
  if (s <= 64) return "conditional";
  if (s <= 84) return "ready";
  return "advanced";
}

function phaseTransitionLabelFor(score: number): StrategicIntelligencePhaseTransitionLabelV1 {
  if (score <= 24) return "regressing";
  if (score <= 44) return "unstable";
  if (score <= 64) return "stagnant";
  if (score <= 84) return "progressing";
  return "transition-ready";
}

function phaseTransitionStateFor(label: StrategicIntelligencePhaseTransitionLabelV1): StrategicIntelligencePhaseTransitionStateV1 {
  if (label === "regressing") return "phase-rollback-required";
  if (label === "unstable") return "phase-hold-required";
  if (label === "stagnant") return "phase-stabilization-required";
  if (label === "progressing") return "phase-preparation";
  return "phase-advance-allowed";
}

function summaryFor(label: StrategicIntelligencePhaseTransitionLabelV1): string {
  if (label === "regressing") return "Strategic intelligence is regressing; phase rollback required.";
  if (label === "unstable") return "Strategic intelligence unstable; phase hold recommended.";
  if (label === "stagnant") return "Strategic intelligence stagnating; stabilization required.";
  if (label === "progressing") return "Strategic intelligence progressing; phase preparation possible.";
  return "Strategic intelligence ready for phase advancement.";
}

function mapDriftAdjustment(label: string): number {
  if (label === "severe-drift") return -20;
  if (label === "drifting") return -12;
  if (label === "watch") return -6;
  if (label === "stable") return 6;
  return 0;
}

function mapCoherenceAdjustment(label: string): number {
  if (label === "fragmented") return -18;
  if (label === "partial") return -10;
  if (label === "coherent") return 6;
  if (label === "systemic") return 10;
  return 0;
}

function mapStabilityAdjustment(label: string): number {
  if (label === "fragile" || label === "unstable") return -12;
  if (label === "tense") return -8;
  if (label === "robust") return 6;
  return 0;
}

function mapAlignmentAdjustment(label: string): number {
  if (label === "fragmented") return -14;
  if (label === "tense") return -8;
  if (label === "aligned" || label === "coherent" || label === "strongly-aligned") return 6;
  return 0;
}

function mapReadinessAdjustment(bucket: "blocked" | "limited" | "conditional" | "ready" | "advanced"): number {
  if (bucket === "blocked") return -18;
  if (bucket === "limited") return -10;
  if (bucket === "conditional") return -6;
  if (bucket === "ready") return 6;
  return 10;
}

function mapConsistencyAdjustment(label: SiteSemanticConsistency["consistencyLabel"]): number {
  if (label === "low") return -10;
  if (label === "medium") return -5;
  return 5;
}

function mapUnresolvedRatioAdjustment(unresolvedRatio: number): number {
  if (unresolvedRatio > 0.4) return -12;
  if (unresolvedRatio > 0.3) return -8;
  return 0;
}

function normalizeMaybePreviousFromState(state: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!isRecord(state)) return null;
  const raw = (state as any)[key] as unknown;
  if (raw === null || typeof raw === "undefined") return null;
  return raw;
}

function hasAnyPreviousSignals(previousScores: Array<number | null>): boolean {
  return previousScores.some((v) => typeof v === "number");
}

export function buildStrategicIntelligencePhaseTransitionEngineV1(
  input: StrategicIntelligencePhaseTransitionEngineInputV1,
): StrategicIntelligencePhaseTransitionEngineV1 {
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);

  const strategicLearningCore =
    input.strategicLearningCore ?? buildStrategicLearningCoreV1({ siteSemanticConsistency: input.siteSemanticConsistency, unresolvedRatio });
  const strategicEvolutionModel =
    input.strategicEvolutionModel ??
    buildStrategicEvolutionModelV1({ strategicLearningCore, siteSemanticConsistency: input.siteSemanticConsistency, unresolvedRatio });
  const strategicDirectionEngine =
    input.strategicDirectionEngine ??
    buildStrategicDirectionEngineV1({
      strategicLearningCore,
      strategicEvolutionModel,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });
  const strategicSelfAlignment =
    input.strategicSelfAlignment ??
    buildStrategicSelfAlignmentV1({
      strategicLearningCore,
      strategicEvolutionModel,
      strategicDirectionEngine,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });
  const strategicDriftDetection =
    input.strategicDriftDetection ??
    buildStrategicDriftDetectionV1({
      strategicLearningCore,
      strategicEvolutionModel,
      strategicDirectionEngine,
      strategicSelfAlignment,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });
  const strategicStabilityEngine =
    input.strategicStabilityEngine ??
    buildStrategicStabilityEngineV1({
      strategicLearningCore,
      strategicEvolutionModel,
      strategicDirectionEngine,
      strategicSelfAlignment,
      strategicDriftDetection,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });
  const strategicCoherenceEngine =
    input.strategicCoherenceEngine ??
    buildStrategicCoherenceEngineV1({
      strategicLearningCore,
      strategicEvolutionModel,
      strategicDirectionEngine,
      strategicSelfAlignment,
      strategicDriftDetection,
      strategicStabilityEngine,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });

  const strategicIntelligenceStabilityModel =
    input.strategicIntelligenceStabilityModel ??
    buildStrategicIntelligenceStabilityModelV1({
      strategicLearningCore,
      strategicEvolutionModel,
      strategicDirectionEngine,
      strategicSelfAlignment,
      strategicDriftDetection,
      strategicStabilityEngine,
      strategicCoherenceEngine,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });

  const strategicIntelligenceReadinessGate =
    input.strategicIntelligenceReadinessGate ??
    buildStrategicIntelligenceReadinessGateV1({
      strategicIntelligenceStabilityModel,
      strategicLearningCore,
      strategicEvolutionModel,
      strategicDirectionEngine,
      strategicSelfAlignment,
      strategicDriftDetection,
      strategicStabilityEngine,
      strategicCoherenceEngine,
      siteSemanticConsistency: input.siteSemanticConsistency,
      unresolvedRatio,
    });

  const readinessScore = normalizeOptionalScoreFrom(strategicIntelligenceReadinessGate, "strategicIntelligenceReadinessGate", "readinessScore");
  const intelligenceStabilityScore = normalizeOptionalScoreFrom(
    strategicIntelligenceStabilityModel,
    "strategicIntelligenceStabilityModel",
    "intelligenceStabilityScore",
  );
  const coherenceScore = normalizeOptionalScoreFrom(strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceScore");
  const stabilityScore = normalizeOptionalScoreFrom(strategicStabilityEngine, "strategicStabilityEngine", "stabilityScore");
  const alignmentScore = normalizeOptionalScoreFrom(strategicSelfAlignment, "strategicSelfAlignment", "alignmentScore");
  const directionScore = normalizeOptionalScoreFrom(strategicDirectionEngine, "strategicDirectionEngine", "directionScore");
  const evolutionScore = normalizeOptionalScoreFrom(strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore");
  const strategicLearningScore = normalizeOptionalScoreFromKeys(strategicLearningCore, "strategicLearningCore", [
    "strategicLearningScore",
    "learningScore",
  ]);
  const driftScore = normalizeOptionalScoreFrom(strategicDriftDetection, "strategicDriftDetection", "driftScore");

  const driftContribution = typeof driftScore === "number" ? clamp0to100(100 - driftScore) : 0;

  const baseSum =
    (readinessScore ?? 0) +
    (intelligenceStabilityScore ?? 0) +
    (coherenceScore ?? 0) +
    (stabilityScore ?? 0) +
    (alignmentScore ?? 0) +
    (directionScore ?? 0) +
    (evolutionScore ?? 0) +
    (strategicLearningScore ?? 0) +
    driftContribution;
  const baseAverage = baseSum / 9;

  const driftLabel = normalizeLabelFrom(strategicDriftDetection, "strategicDriftDetection", "driftLabel");
  const coherenceLabel = normalizeLabelFrom(strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceLabel");
  const stabilityLabel = normalizeLabelFrom(strategicStabilityEngine, "strategicStabilityEngine", "stabilityLabel");
  const alignmentLabel = normalizeLabelFrom(strategicSelfAlignment, "strategicSelfAlignment", "alignmentLabel");
  const readinessBucketValue = readinessBucket(readinessScore);

  let transitionScoreRaw = baseAverage;
  transitionScoreRaw += mapDriftAdjustment(driftLabel);
  transitionScoreRaw += mapCoherenceAdjustment(coherenceLabel);
  transitionScoreRaw += mapStabilityAdjustment(stabilityLabel);
  transitionScoreRaw += mapAlignmentAdjustment(alignmentLabel);
  transitionScoreRaw += mapReadinessAdjustment(readinessBucketValue);
  transitionScoreRaw += mapConsistencyAdjustment(consistencyLabel);
  transitionScoreRaw += mapUnresolvedRatioAdjustment(unresolvedRatio);

  const previousState = input.previousStrategicIntelligenceState ?? null;
  const previousReadinessGate =
    input.previousStrategicIntelligenceReadinessGate ?? (normalizeMaybePreviousFromState(previousState, "strategicIntelligenceReadinessGate") as any);
  const previousStabilityModel =
    input.previousStrategicIntelligenceStabilityModel ??
    (normalizeMaybePreviousFromState(previousState, "strategicIntelligenceStabilityModel") as any);
  const previousCoherence =
    input.previousStrategicCoherenceEngine ?? (normalizeMaybePreviousFromState(previousState, "strategicCoherenceEngine") as any);
  const previousStability =
    input.previousStrategicStabilityEngine ?? (normalizeMaybePreviousFromState(previousState, "strategicStabilityEngine") as any);
  const previousDrift =
    input.previousStrategicDriftDetection ?? (normalizeMaybePreviousFromState(previousState, "strategicDriftDetection") as any);

  const previousReadinessScore = normalizeOptionalScoreFrom(previousReadinessGate, "strategicIntelligenceReadinessGate", "readinessScore");
  const previousIntelligenceStabilityScore = normalizeOptionalScoreFrom(
    previousStabilityModel,
    "strategicIntelligenceStabilityModel",
    "intelligenceStabilityScore",
  );
  const previousCoherenceScore = normalizeOptionalScoreFrom(previousCoherence, "strategicCoherenceEngine", "coherenceScore");
  const previousStabilityScore = normalizeOptionalScoreFrom(previousStability, "strategicStabilityEngine", "stabilityScore");
  const previousDriftScore = normalizeOptionalScoreFrom(previousDrift, "strategicDriftDetection", "driftScore");

  const hasPrevious = hasAnyPreviousSignals([
    previousReadinessScore,
    previousIntelligenceStabilityScore,
    previousCoherenceScore,
    previousStabilityScore,
    previousDriftScore,
  ]);

  if (typeof previousReadinessScore === "number" && typeof readinessScore === "number" && readinessScore < previousReadinessScore) {
    transitionScoreRaw -= 10;
  }
  if (
    typeof previousIntelligenceStabilityScore === "number" &&
    typeof intelligenceStabilityScore === "number" &&
    intelligenceStabilityScore < previousIntelligenceStabilityScore
  ) {
    transitionScoreRaw -= 10;
  }
  if (typeof previousCoherenceScore === "number" && typeof coherenceScore === "number" && coherenceScore < previousCoherenceScore) {
    transitionScoreRaw -= 10;
  }
  if (typeof previousDriftScore === "number" && typeof driftScore === "number" && driftScore > previousDriftScore) {
    transitionScoreRaw -= 8;
  }

  const transitionScore = clamp0to100(transitionScoreRaw);
  const phaseTransitionLabel = phaseTransitionLabelFor(transitionScore);
  const phaseTransitionState = phaseTransitionStateFor(phaseTransitionLabel);

  const stabilityIsFragile = stabilityLabel === "fragile" || stabilityLabel === "unstable";
  const transitionDirection: StrategicIntelligencePhaseTransitionDirectionV1 =
    driftLabel === "severe-drift"
      ? "regression"
      : coherenceLabel === "fragmented"
        ? "stabilization"
        : stabilityIsFragile
          ? "stabilization"
          : readinessBucketValue === "blocked"
            ? "recovery"
            : phaseTransitionLabel === "transition-ready"
              ? "advancement"
              : "consolidation";

  let transitionConfidenceRaw = transitionScore;
  if (!hasPrevious) transitionConfidenceRaw -= 20;
  if (driftLabel === "severe-drift") transitionConfidenceRaw -= 10;
  if (coherenceLabel === "systemic") transitionConfidenceRaw += 6;
  if (stabilityLabel === "robust") transitionConfidenceRaw += 6;
  if (alignmentLabel === "coherent" || alignmentLabel === "strongly-aligned") transitionConfidenceRaw += 5;
  const transitionConfidence = clamp0to100(transitionConfidenceRaw);

  const signals: string[] = [];
  const blockers: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  if (hasPrevious) addUniqueLimited(signals, "Temporal comparison available for strategic intelligence signals.", 6);
  if (!hasPrevious) addUniqueLimited(signals, "No previous strategic intelligence signals available for comparison.", 6);

  if (typeof previousReadinessScore === "number" && typeof readinessScore === "number") {
    if (readinessScore > previousReadinessScore) addUniqueLimited(signals, "Systemic readiness increasing.", 6);
    if (readinessScore < previousReadinessScore) addUniqueLimited(signals, "Systemic readiness decreasing.", 6);
  }
  if (typeof previousCoherenceScore === "number" && typeof coherenceScore === "number") {
    if (coherenceScore > previousCoherenceScore) addUniqueLimited(signals, "Structural coherence improving.", 6);
    if (coherenceScore < previousCoherenceScore) addUniqueLimited(signals, "Structural coherence worsening.", 6);
  }
  if (typeof previousStabilityScore === "number" && typeof stabilityScore === "number") {
    if (stabilityScore > previousStabilityScore) addUniqueLimited(signals, "System stability strengthening.", 6);
    if (stabilityScore < previousStabilityScore) addUniqueLimited(signals, "System stability weakening.", 6);
  }
  if (typeof previousDriftScore === "number" && typeof driftScore === "number" && driftScore > previousDriftScore) {
    addUniqueLimited(signals, "Systemic drift increasing over time.", 6);
  }

  if (driftLabel === "severe-drift") addUniqueLimited(blockers, "Systemic drift escalation.", 6);
  if (driftLabel === "drifting") addUniqueLimited(blockers, "Active strategic drift detected.", 6);
  if (coherenceLabel === "fragmented") addUniqueLimited(blockers, "Strategic intelligence fragmentation detected.", 6);
  if (stabilityIsFragile) addUniqueLimited(blockers, "System stability is fragile.", 6);
  if (alignmentLabel === "fragmented" || alignmentLabel === "tense") addUniqueLimited(blockers, "Strategic self-alignment is not yet stable.", 6);
  if (readinessBucketValue === "blocked" || readinessBucketValue === "limited") addUniqueLimited(blockers, "Readiness insufficient for phase transition.", 6);
  if (unresolvedRatio > 0.4) addUniqueLimited(blockers, "High unresolved ratio constrains phase transition.", 6);
  if (consistencyLabel === "low") addUniqueLimited(blockers, "Low site semantic consistency reduces transition safety.", 6);

  addUniqueLimited(risks, "Premature phase transition.", 6);
  if (!hasPrevious) addUniqueLimited(risks, "Limited temporal evidence may hide instability.", 6);
  if (coherenceLabel === "partial" || coherenceLabel === "fragmented") addUniqueLimited(risks, "Hidden systemic fracture may surface under expansion.", 6);
  if (driftLabel === "watch" || driftLabel === "drifting" || driftLabel === "severe-drift") addUniqueLimited(risks, "Drift volatility may undermine higher-phase stability.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(risks, "Unresolved semantic instability may compound during transition.", 6);

  if (phaseTransitionLabel === "transition-ready") addUniqueLimited(opportunities, "Transition window emerging.", 6);
  if (phaseTransitionLabel === "progressing") addUniqueLimited(opportunities, "Phase preparation can consolidate intelligence maturation.", 6);
  if (coherenceLabel === "systemic") addUniqueLimited(opportunities, "Systemic coherence supports higher-phase expansion.", 6);
  if (stabilityLabel === "robust") addUniqueLimited(opportunities, "Robust stability enables controlled advancement.", 6);
  if (driftLabel === "stable") addUniqueLimited(opportunities, "Stable drift profile supports phase advancement.", 6);
  if (readinessBucketValue === "advanced") addUniqueLimited(opportunities, "Advanced readiness supports safe phase advancement.", 6);

  const notes: string[] = [];
  addUniqueLimited(
    notes,
    "Strategic intelligence phase transition is interpretive only and does not alter runtime behavior.",
    6,
  );
  addUniqueLimited(notes, "Transition score uses missing scores as 0 and clamps results to [0,100].", 6);
  if (!hasPrevious) addUniqueLimited(notes, "Temporal comparison unavailable; transition confidence is reduced.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(notes, "Unresolved ratio penalty applied due to elevated unresolved content.", 6);
  if (consistencyLabel !== "high") addUniqueLimited(notes, "Semantic consistency adjustment applied due to non-high consistency.", 6);
  addUniqueLimited(notes, `Direction determined as '${transitionDirection}' via deterministic precedence.`, 6);

  return {
    transitionScore,
    phaseTransitionLabel,
    phaseTransitionState,
    transitionDirection,
    transitionConfidence,
    signals,
    blockers,
    risks,
    opportunities,
    summary: summaryFor(phaseTransitionLabel),
    notes: notes.slice(0, 6),
  };
}

