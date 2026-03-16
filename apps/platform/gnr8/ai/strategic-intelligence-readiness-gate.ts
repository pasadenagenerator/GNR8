import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicIntelligenceStabilityModelV1 } from "@/gnr8/ai/strategic-intelligence-stability-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";

export type StrategicIntelligenceReadinessGateV1 = {
  readinessScore: number;
  readinessLabel: "not-ready" | "fragile" | "developing" | "ready" | "scaling-ready";

  readinessState:
    | "intelligence-unstable"
    | "intelligence-fragile"
    | "intelligence-developing"
    | "intelligence-operational"
    | "intelligence-scaling";

  readinessConfidence: number;

  readinessSignals: string[];
  readinessBlockers: string[];
  readinessRisks: string[];
  readinessSupports: string[];
  readinessRecommendations: string[];

  summary: string;
  notes: string[];
};

export type StrategicIntelligenceReadinessGateInputV1 = {
  strategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  strategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  strategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  strategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  strategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  strategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  strategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  adaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  strategicRuntimeAdaptationPolicy?: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;

  unresolvedRatio?: number;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;

  previousStrategicIntelligenceStabilityModel?: StrategicIntelligenceStabilityModelV1 | Record<string, unknown> | null;
  previousStrategicCoherenceEngine?: StrategicCoherenceEngineV1 | Record<string, unknown> | null;
  previousStrategicStabilityEngine?: StrategicStabilityEngineV1 | Record<string, unknown> | null;
  previousStrategicSelfAlignment?: StrategicSelfAlignmentV1 | Record<string, unknown> | null;
  previousStrategicDirectionEngine?: StrategicDirectionEngineV1 | Record<string, unknown> | null;
  previousStrategicEvolutionModel?: StrategicEvolutionModelV1 | Record<string, unknown> | null;
  previousStrategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  previousStrategicDriftDetection?: StrategicDriftDetectionV1 | Record<string, unknown> | null;
  previousAdaptiveStrategicPolicy?: AdaptiveStrategicPolicyV1 | Record<string, unknown> | null;
  previousStrategicRuntimeAdaptationPolicy?: StrategicRuntimeAdaptationPolicyV1 | Record<string, unknown> | null;
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

function normalizeScoreFrom(value: unknown, nestedKey: string, key: string): number {
  const obj = unwrapMaybeNested(value, nestedKey);
  if (!isRecord(obj)) return 0;
  const raw = (obj as any)[key] as unknown;
  return typeof raw === "number" && Number.isFinite(raw) ? clamp0to100(raw) : 0;
}

function normalizeOptionalScoreFrom(value: unknown, nestedKey: string, key: string): number | null {
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

function normalizeConsistencyLabel(input: StrategicIntelligenceReadinessGateInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any).consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeUnresolvedRatio(input: StrategicIntelligenceReadinessGateInputV1): number {
  return clamp0to1(input.unresolvedRatio, 1);
}

function hasTemporalSignals(input: StrategicIntelligenceReadinessGateInputV1): boolean {
  const pairs: Array<{ value: unknown; nestedKey: string; scoreKey: string }> = [
    { value: input.previousStrategicIntelligenceStabilityModel, nestedKey: "strategicIntelligenceStabilityModel", scoreKey: "intelligenceStabilityScore" },
    { value: input.previousStrategicCoherenceEngine, nestedKey: "strategicCoherenceEngine", scoreKey: "coherenceScore" },
    { value: input.previousStrategicStabilityEngine, nestedKey: "strategicStabilityEngine", scoreKey: "stabilityScore" },
    { value: input.previousStrategicSelfAlignment, nestedKey: "strategicSelfAlignment", scoreKey: "alignmentScore" },
    { value: input.previousStrategicDirectionEngine, nestedKey: "strategicDirectionEngine", scoreKey: "directionScore" },
    { value: input.previousStrategicEvolutionModel, nestedKey: "strategicEvolutionModel", scoreKey: "evolutionScore" },
    { value: input.previousStrategicLearningCore, nestedKey: "strategicLearningCore", scoreKey: "strategicLearningScore" },
    { value: input.previousStrategicDriftDetection, nestedKey: "strategicDriftDetection", scoreKey: "driftScore" },
    { value: input.previousAdaptiveStrategicPolicy, nestedKey: "adaptiveStrategicPolicy", scoreKey: "policyScore" },
    { value: input.previousStrategicRuntimeAdaptationPolicy, nestedKey: "strategicRuntimeAdaptationPolicy", scoreKey: "doctrineScore" },
  ];

  for (const p of pairs) {
    const v = normalizeOptionalScoreFrom(p.value, p.nestedKey, p.scoreKey);
    if (typeof v === "number") return true;
  }

  return false;
}

function readinessLabelFor(score: number): StrategicIntelligenceReadinessGateV1["readinessLabel"] {
  if (score <= 24) return "not-ready";
  if (score <= 44) return "fragile";
  if (score <= 64) return "developing";
  if (score <= 84) return "ready";
  return "scaling-ready";
}

function readinessStateFor(label: StrategicIntelligenceReadinessGateV1["readinessLabel"]): StrategicIntelligenceReadinessGateV1["readinessState"] {
  if (label === "not-ready") return "intelligence-unstable";
  if (label === "fragile") return "intelligence-fragile";
  if (label === "developing") return "intelligence-developing";
  if (label === "ready") return "intelligence-operational";
  return "intelligence-scaling";
}

function summaryFor(label: StrategicIntelligenceReadinessGateV1["readinessLabel"]): string {
  if (label === "not-ready") return "Strategic intelligence system is not yet stable enough for operational scaling.";
  if (label === "fragile") return "Strategic intelligence remains fragile and requires further stabilization.";
  if (label === "developing") return "Strategic intelligence is developing but not yet fully operational.";
  if (label === "ready") return "Strategic intelligence is operationally ready under controlled conditions.";
  return "Strategic intelligence demonstrates maturity suitable for scaling execution.";
}

function mapDriftAdjustment(label: string): number {
  if (label === "severe-drift") return -20;
  if (label === "drifting") return -15;
  if (label === "watch") return -10;
  if (label === "stable") return 6;
  return 0;
}

function mapCoherenceAdjustment(label: string): number {
  if (label === "fragmented") return -18;
  if (label === "partial") return -10;
  if (label === "coherent" || label === "systemic") return 8;
  return 0;
}

function mapStabilityAdjustment(label: string): number {
  if (label === "unstable") return -15;
  if (label === "fragile") return -8;
  if (label === "robust") return 6;
  return 0;
}

function mapAlignmentAdjustment(label: string): number {
  if (label === "fragmented") return -14;
  if (label === "tense") return -7;
  return 0;
}

function mapPolicyAdjustment(label: string): number {
  if (label === "constrained") return -10;
  if (label === "stabilizing") return -5;
  if (label === "adaptive" || label === "expansion-ready") return 5;
  return 0;
}

function mapDoctrineAdjustment(label: string): number {
  if (label === "contained") return -12;
  if (label === "guarded") return -6;
  if (label === "strategic") return 6;
  return 0;
}

function mapIntelligenceStabilityAdjustment(label: string): number {
  if (label === "durable") return 10;
  return 0;
}

export function buildStrategicIntelligenceReadinessGateV1(
  input: StrategicIntelligenceReadinessGateInputV1,
): StrategicIntelligenceReadinessGateV1 {
  const intelligenceStabilityScore = normalizeScoreFrom(
    input.strategicIntelligenceStabilityModel,
    "strategicIntelligenceStabilityModel",
    "intelligenceStabilityScore",
  );
  const coherenceScore = normalizeScoreFrom(input.strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceScore");
  const stabilityScore = normalizeScoreFrom(input.strategicStabilityEngine, "strategicStabilityEngine", "stabilityScore");
  const alignmentScore = normalizeScoreFrom(input.strategicSelfAlignment, "strategicSelfAlignment", "alignmentScore");
  const directionScore = normalizeScoreFrom(input.strategicDirectionEngine, "strategicDirectionEngine", "directionScore");
  const evolutionScore = normalizeScoreFrom(input.strategicEvolutionModel, "strategicEvolutionModel", "evolutionScore");

  const learningScoreDirect = normalizeOptionalScoreFrom(input.strategicLearningCore, "strategicLearningCore", "strategicLearningScore");
  const learningScoreLegacy = normalizeOptionalScoreFrom(input.strategicLearningCore, "strategicLearningCore", "learningScore");
  const strategicLearningScore = clamp0to100((learningScoreDirect ?? learningScoreLegacy ?? 0) as number);

  const baseReadinessScore = clamp0to100(
    Math.round(
      (intelligenceStabilityScore +
        coherenceScore +
        stabilityScore +
        alignmentScore +
        directionScore +
        evolutionScore +
        strategicLearningScore) /
        7,
    ),
  );

  const driftLabel = normalizeLabelFrom(input.strategicDriftDetection, "strategicDriftDetection", "driftLabel");
  const coherenceLabel = normalizeLabelFrom(input.strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceLabel");
  const stabilityLabel = normalizeLabelFrom(input.strategicStabilityEngine, "strategicStabilityEngine", "stabilityLabel");
  const alignmentLabel = normalizeLabelFrom(input.strategicSelfAlignment, "strategicSelfAlignment", "alignmentLabel");
  const policyLabel = normalizeLabelFrom(input.adaptiveStrategicPolicy, "adaptiveStrategicPolicy", "policyLabel");
  const doctrineLabel = normalizeLabelFrom(input.strategicRuntimeAdaptationPolicy, "strategicRuntimeAdaptationPolicy", "doctrineLabel");
  const intelligenceStabilityLabel = normalizeLabelFrom(
    input.strategicIntelligenceStabilityModel,
    "strategicIntelligenceStabilityModel",
    "intelligenceStabilityLabel",
  );

  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);

  let adjustedScore = baseReadinessScore;
  adjustedScore += mapDriftAdjustment(driftLabel);
  adjustedScore += mapCoherenceAdjustment(coherenceLabel);
  adjustedScore += mapStabilityAdjustment(stabilityLabel);
  adjustedScore += mapAlignmentAdjustment(alignmentLabel);
  adjustedScore += mapPolicyAdjustment(policyLabel);
  adjustedScore += mapDoctrineAdjustment(doctrineLabel);
  adjustedScore += mapIntelligenceStabilityAdjustment(intelligenceStabilityLabel);

  if (unresolvedRatio > 0.3) adjustedScore -= 10;
  if (consistencyLabel === "low") adjustedScore -= 12;

  const readinessScore = clamp0to100(adjustedScore);
  const readinessLabel = readinessLabelFor(readinessScore);
  const readinessState = readinessStateFor(readinessLabel);

  const driftConfidence = normalizeScoreFrom(input.strategicDriftDetection, "strategicDriftDetection", "temporalConfidence");
  const coherenceConfidence = normalizeScoreFrom(input.strategicCoherenceEngine, "strategicCoherenceEngine", "coherenceConfidence");
  const stabilityConfidence = normalizeScoreFrom(input.strategicStabilityEngine, "strategicStabilityEngine", "stabilityConfidence");
  const alignmentConfidence = normalizeScoreFrom(input.strategicSelfAlignment, "strategicSelfAlignment", "alignmentConfidence");
  const intelligenceTrustConfidence = normalizeScoreFrom(
    input.strategicIntelligenceStabilityModel,
    "strategicIntelligenceStabilityModel",
    "intelligenceTrustConfidence",
  );

  let readinessConfidence = readinessScore;
  const temporal = hasTemporalSignals(input);
  if (!temporal) readinessConfidence -= 20;
  if (driftConfidence < 40) readinessConfidence -= 10;
  if (coherenceConfidence < 50) readinessConfidence -= 8;
  if (stabilityConfidence < 50) readinessConfidence -= 8;
  if (alignmentConfidence < 50) readinessConfidence -= 6;
  if (intelligenceTrustConfidence < 50) readinessConfidence -= 10;
  if (intelligenceTrustConfidence > 80) readinessConfidence += 8;
  if (coherenceConfidence > 75) readinessConfidence += 6;
  if (stabilityConfidence > 75) readinessConfidence += 6;
  if (alignmentConfidence > 75) readinessConfidence += 5;
  readinessConfidence = clamp0to100(readinessConfidence);

  const readinessSignals: string[] = [];
  const readinessBlockers: string[] = [];
  const readinessRisks: string[] = [];
  const readinessSupports: string[] = [];
  const readinessRecommendations: string[] = [];

  if (intelligenceStabilityLabel === "durable" || intelligenceStabilityLabel === "reliable") {
    addUniqueLimited(readinessSignals, "Strategic intelligence stability is high", 6);
    addUniqueLimited(readinessSupports, "Trusted intelligence durability", 6);
  } else if (intelligenceStabilityLabel === "fragile" || intelligenceStabilityLabel === "unstable") {
    addUniqueLimited(readinessSignals, "Strategic intelligence stability is insufficient", 6);
    addUniqueLimited(readinessBlockers, "Intelligence durability insufficient", 6);
    addUniqueLimited(readinessRisks, "Intelligence regression risk", 6);
  }

  if (coherenceLabel === "coherent" || coherenceLabel === "systemic") {
    addUniqueLimited(readinessSignals, "System coherence is integrated", 6);
    addUniqueLimited(readinessSupports, "Coherent strategic direction", 6);
  } else if (coherenceLabel === "fragmented") {
    addUniqueLimited(readinessSignals, "System coherence is fragmented", 6);
    addUniqueLimited(readinessBlockers, "Coherence fragmentation present", 6);
    addUniqueLimited(readinessRisks, "Coherence breakdown risk", 6);
  } else if (coherenceLabel === "partial") {
    addUniqueLimited(readinessSignals, "System coherence is weak", 6);
    addUniqueLimited(readinessBlockers, "Coherence fragmentation present", 6);
    addUniqueLimited(readinessRisks, "Coherence breakdown risk", 6);
  }

  if (stabilityLabel === "robust") {
    addUniqueLimited(readinessSignals, "Strategic stability is resilient", 6);
    addUniqueLimited(readinessSupports, "Stable execution patterns", 6);
  } else if (stabilityLabel === "unstable" || stabilityLabel === "fragile") {
    addUniqueLimited(readinessSignals, "Strategic stability is fragile", 6);
    addUniqueLimited(readinessBlockers, "Stability weakness detected", 6);
    addUniqueLimited(readinessRisks, "Adaptive instability risk", 6);
  }

  if (alignmentLabel === "coherent" || alignmentLabel === "strongly-aligned") {
    addUniqueLimited(readinessSignals, "Strategic alignment is strong", 6);
  } else if (alignmentLabel === "fragmented" || alignmentLabel === "tense") {
    addUniqueLimited(readinessSignals, "Strategic alignment is conflicted", 6);
    addUniqueLimited(readinessBlockers, "Alignment conflicts detected", 6);
    addUniqueLimited(readinessRisks, "Strategic misdirection risk", 6);
  }

  if (driftLabel === "stable") {
    addUniqueLimited(readinessSignals, "Drift is minimal", 6);
    addUniqueLimited(readinessSupports, "Strong learning trajectory", 6);
  } else if (driftLabel === "watch") {
    addUniqueLimited(readinessSignals, "Drift indicators require monitoring", 6);
    addUniqueLimited(readinessBlockers, "Strategic drift detected", 6);
    addUniqueLimited(readinessRisks, "Strategic misdirection risk", 6);
  } else if (driftLabel === "drifting" || driftLabel === "severe-drift") {
    addUniqueLimited(readinessSignals, "Strategic drift detected", 6);
    addUniqueLimited(readinessBlockers, "Strategic drift detected", 6);
    addUniqueLimited(readinessRisks, "Strategic misdirection risk", 6);
  }

  if (policyLabel === "adaptive" || policyLabel === "expansion-ready") {
    addUniqueLimited(readinessSignals, "Adaptive strategic policy is progressive", 6);
    addUniqueLimited(readinessSupports, "Adaptive policy maturity", 6);
  } else if (policyLabel === "stabilizing") {
    addUniqueLimited(readinessSignals, "Adaptive strategic policy is conservative", 6);
  } else if (policyLabel === "constrained") {
    addUniqueLimited(readinessSignals, "Adaptive strategic policy is defensive", 6);
    addUniqueLimited(readinessRisks, "Runtime scaling risk", 6);
  }

  if (doctrineLabel === "strategic") {
    addUniqueLimited(readinessSignals, "Runtime doctrine supports scaling", 6);
    addUniqueLimited(readinessSupports, "Runtime scaling doctrine maturity", 6);
  } else if (doctrineLabel === "contained") {
    addUniqueLimited(readinessSignals, "Runtime doctrine is contained", 6);
    addUniqueLimited(readinessBlockers, "Runtime doctrine is constrained", 6);
    addUniqueLimited(readinessRisks, "Runtime scaling risk", 6);
  } else if (doctrineLabel === "guarded") {
    addUniqueLimited(readinessSignals, "Runtime doctrine is guarded", 6);
    addUniqueLimited(readinessRisks, "Runtime scaling risk", 6);
  }

  if (unresolvedRatio > 0.3) {
    addUniqueLimited(readinessSignals, "Unresolved ratio is high", 6);
    addUniqueLimited(readinessBlockers, "High unresolved page ratio", 6);
    addUniqueLimited(readinessRisks, "Content integrity risk", 6);
  }

  if (consistencyLabel === "low") {
    addUniqueLimited(readinessSignals, "Site semantic consistency is low", 6);
    addUniqueLimited(readinessRisks, "Semantic consistency risk", 6);
  }

  if (readinessLabel === "not-ready") addUniqueLimited(readinessRecommendations, "Continue intelligence stabilization", 6);
  if (readinessLabel === "fragile") addUniqueLimited(readinessRecommendations, "Continue intelligence stabilization", 6);
  if (readinessLabel === "developing") addUniqueLimited(readinessRecommendations, "Deepen strategic alignment signals", 6);
  if (readinessLabel === "ready") addUniqueLimited(readinessRecommendations, "Maintain controlled operational conditions", 6);
  if (readinessLabel === "scaling-ready") addUniqueLimited(readinessRecommendations, "Prepare system for operational scaling", 6);

  if (driftLabel && driftLabel !== "stable") addUniqueLimited(readinessRecommendations, "Reduce drift before scaling execution", 6);
  if (coherenceLabel && coherenceLabel !== "coherent" && coherenceLabel !== "systemic")
    addUniqueLimited(readinessRecommendations, "Strengthen coherence before expansion", 6);
  if (alignmentLabel && alignmentLabel !== "coherent" && alignmentLabel !== "strongly-aligned")
    addUniqueLimited(readinessRecommendations, "Deepen strategic alignment signals", 6);
  if (intelligenceStabilityLabel && intelligenceStabilityLabel !== "reliable" && intelligenceStabilityLabel !== "durable")
    addUniqueLimited(readinessRecommendations, "Continue intelligence stabilization", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(readinessRecommendations, "Reduce unresolved page ratio", 6);
  if (consistencyLabel === "low") addUniqueLimited(readinessRecommendations, "Improve site semantic consistency", 6);

  const notes: string[] = [];
  addUniqueLimited(
    notes,
    "Strategic intelligence readiness gate is interpretive only and does not alter execution behavior.",
    6,
  );
  addUniqueLimited(notes, "Readiness score is a deterministic average plus deterministic adjustments.", 6);
  addUniqueLimited(notes, "Missing strategic component scores are treated as 0.", 6);
  addUniqueLimited(notes, "Readiness confidence is readinessScore with deterministic penalties/boosts.", 6);
  addUniqueLimited(notes, "Unresolved ratio defaults to 1 and consistency defaults to low when missing.", 6);
  addUniqueLimited(notes, "All signal lists are deduplicated and capped at 6 items.", 6);

  return {
    readinessScore,
    readinessLabel,
    readinessState,
    readinessConfidence,
    readinessSignals,
    readinessBlockers,
    readinessRisks,
    readinessSupports,
    readinessRecommendations,
    summary: summaryFor(readinessLabel),
    notes,
  };
}

