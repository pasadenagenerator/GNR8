import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

export type StrategicEvolutionModelV1 = {
  evolutionScore: number;
  evolutionLabel: "regressing" | "unstable" | "stagnating" | "progressing" | "accelerating";

  evolutionTrajectory: {
    direction: "negative" | "flat" | "positive";
    stability: "low" | "medium" | "high";
    predictability: "low" | "medium" | "high";
  };

  autonomyEvolutionSignal: {
    expansionReadiness: "blocked" | "cautious" | "guided" | "ready";
    autonomyPressure: "low" | "medium" | "high";
    expansionConfidence: number;
  };

  strategicEvolutionPosture:
    | "stabilize-system"
    | "optimize-learning"
    | "expand-semantic-scope"
    | "prepare-structural-evolution"
    | "prepare-autonomy";

  evolutionDrivers: string[];
  evolutionRisks: string[];
  evolutionOpportunities: string[];

  summary: string;
  notes: string[];
};

export type StrategicEvolutionModelInputV1 = {
  strategicLearningCore?: StrategicLearningCoreV1 | Record<string, unknown> | null;
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  strategicSemanticExecutionReadiness?: StrategicSemanticExecutionReadiness | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;

  siteSemanticIntelligence?: SiteSemanticIntelligence | Record<string, unknown> | null;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;

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
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function normalizeUnresolvedRatio(input: StrategicEvolutionModelInputV1): number {
  const unresolvedRatio = typeof input.unresolvedRatio === "number" && Number.isFinite(input.unresolvedRatio) ? input.unresolvedRatio : null;
  if (unresolvedRatio === null) return 1;
  if (unresolvedRatio < 0) return 0;
  if (unresolvedRatio > 1) return 1;
  return unresolvedRatio;
}

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function normalizeScoreFrom(obj: unknown, keys: string[]): number {
  if (!isRecord(obj)) return 0;
  for (const key of keys) {
    const raw = (obj as any)[key] as unknown;
    if (typeof raw === "number" && Number.isFinite(raw)) return clamp0to100(raw);
  }
  return 0;
}

function normalizeConsistencyLabel(input: StrategicEvolutionModelInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any)?.consistencyLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeSemanticHealthLabel(input: StrategicEvolutionModelInputV1): SiteSemanticIntelligence["semanticHealthLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticIntelligence, "siteSemanticIntelligence");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any)?.semanticHealthLabel ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeAutomationCandidatePresent(input: StrategicEvolutionModelInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
    if (pressure && typeof pressure.automationCandidatePresent === "boolean") return pressure.automationCandidatePresent === true;
  }

  const intel = unwrapMaybeNested(input.siteSemanticIntelligence, "siteSemanticIntelligence");
  if (isRecord(intel)) {
    const readiness = isRecord((intel as any).semanticAutomationReadiness) ? (intel as any).semanticAutomationReadiness : null;
    if (readiness && String(readiness.label ?? "").trim() === "automation-candidate") return true;
  }

  return false;
}

function normalizeSemanticWeaknessClustersHigh(input: StrategicEvolutionModelInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const pressure = isRecord((mem as any).executionPressureSignals) ? (mem as any).executionPressureSignals : null;
    if (pressure && typeof pressure.semanticWeaknessClustersHigh === "boolean") return pressure.semanticWeaknessClustersHigh === true;
  }

  const intel = unwrapMaybeNested(input.siteSemanticIntelligence, "siteSemanticIntelligence");
  if (isRecord(intel)) {
    const clusters = (intel as any).semanticWeaknessClusters as unknown;
    if (Array.isArray(clusters)) {
      const clusterCount = clusters.filter((c) => typeof c === "string" && c.trim()).length;
      return clusterCount >= 2;
    }
  }

  return false;
}

function normalizeDriftDetected(input: StrategicEvolutionModelInputV1): boolean {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (isRecord(exec)) {
    const drift = isRecord((exec as any).driftSignals) ? (exec as any).driftSignals : null;
    if (drift && typeof drift.replayDriftPresent === "boolean") return drift.replayDriftPresent === true;
  }

  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const stability = isRecord((mem as any).stabilitySignals) ? (mem as any).stabilitySignals : null;
    if (stability && typeof stability.driftDetectedRecent === "boolean") return stability.driftDetectedRecent === true;
  }

  return false;
}

function normalizeSchedulerReliability(input: StrategicEvolutionModelInputV1): ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "low";
  const stability = isRecord((exec as any).stabilitySignals) ? (exec as any).stabilitySignals : null;
  const raw = String(stability?.schedulerReliability ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeReplayDeterminism(input: StrategicEvolutionModelInputV1): ExecutionLearningSignalsV1["stabilitySignals"]["replayDeterminism"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "low";
  const stability = isRecord((exec as any).stabilitySignals) ? (exec as any).stabilitySignals : null;
  const raw = String(stability?.replayDeterminism ?? "").trim();
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function normalizeExecutionStability(input: StrategicEvolutionModelInputV1): ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"] {
  const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  if (!isRecord(exec)) return "unstable";
  const stability = isRecord((exec as any).stabilitySignals) ? (exec as any).stabilitySignals : null;
  const raw = String(stability?.executionStability ?? "").trim();
  if (raw === "stable" || raw === "mixed" || raw === "unstable") return raw;
  return "unstable";
}

function normalizeIdempotentSkipsRecent(input: StrategicEvolutionModelInputV1): boolean {
  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(mem)) return false;
  const stability = isRecord((mem as any).stabilitySignals) ? (mem as any).stabilitySignals : null;
  if (!stability) return false;
  return typeof stability.idempotentSkipsRecent === "boolean" ? stability.idempotentSkipsRecent === true : false;
}

function normalizeAdaptationReady(input: StrategicEvolutionModelInputV1): boolean {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return false;
  const raw = String((adaptive as any).adaptationHealthLabel ?? "").trim();
  return raw === "ready";
}

function normalizeCooldownTighteningRequired(input: StrategicEvolutionModelInputV1): boolean {
  const adaptive = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  if (!isRecord(adaptive)) return false;
  const cooldown = isRecord((adaptive as any).cooldownSignals) ? (adaptive as any).cooldownSignals : null;
  const strictness = String(cooldown?.cooldownStrictness ?? "").trim();
  return strictness === "hold";
}

function isStabilitySignalsStrong(input: {
  driftDetected: boolean;
  schedulerReliability: ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"];
  replayDeterminism: ExecutionLearningSignalsV1["stabilitySignals"]["replayDeterminism"];
  executionStability: ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"];
  adaptationReady: boolean;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
}): boolean {
  const stableScheduler = input.schedulerReliability !== "low";
  return (
    input.driftDetected !== true &&
    input.executionStability === "stable" &&
    input.replayDeterminism === "high" &&
    stableScheduler &&
    input.adaptationReady === true &&
    input.consistencyLabel === "high"
  );
}

function evolutionLabelForScore(score: number): StrategicEvolutionModelV1["evolutionLabel"] {
  if (score <= 24) return "regressing";
  if (score <= 44) return "unstable";
  if (score <= 64) return "stagnating";
  if (score <= 84) return "progressing";
  return "accelerating";
}

function summaryForLabel(label: StrategicEvolutionModelV1["evolutionLabel"]): string {
  switch (label) {
    case "regressing":
      return "System learning trajectory is deteriorating.";
    case "unstable":
      return "System learning trajectory is unstable.";
    case "stagnating":
      return "System learning trajectory shows limited improvement.";
    case "progressing":
      return "System learning trajectory is improving.";
    case "accelerating":
      return "System learning trajectory is rapidly improving.";
    default:
      return "System learning trajectory is unavailable.";
  }
}

function normalizeEvolutionDelta(input: StrategicEvolutionModelInputV1): number {
  const core = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  if (isRecord(core)) {
    const raw = String((core as any).learningTrajectory ?? "").trim();
    if (raw === "regressing") return -15;
    if (raw === "unstable") return -11;
    if (raw === "stabilizing") return 5;
    if (raw === "evolving") return 15;
  }

  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const stability = isRecord((mem as any).stabilitySignals) ? (mem as any).stabilitySignals : null;
    const raw = String(stability?.executionSuccessTrend ?? "").trim();
    if (raw === "degrading") return -15;
    if (raw === "improving") return 15;
    if (raw === "stable") return 0;
  }

  return 0;
}

function trajectoryDirectionForDelta(delta: number): StrategicEvolutionModelV1["evolutionTrajectory"]["direction"] {
  if (delta < -10) return "negative";
  if (Math.abs(delta) <= 10) return "flat";
  return "positive";
}

function postureForSignals(input: {
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  expansionReadiness: StrategicEvolutionModelV1["autonomyEvolutionSignal"]["expansionReadiness"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  structuralInstabilityLow: boolean;
}): StrategicEvolutionModelV1["strategicEvolutionPosture"] {
  if (input.evolutionLabel === "regressing" || input.evolutionLabel === "unstable") return "stabilize-system";
  if (input.evolutionLabel === "stagnating") return "optimize-learning";
  if (input.evolutionLabel === "accelerating" && input.expansionReadiness === "ready") return "prepare-autonomy";

  if (input.evolutionLabel === "progressing") {
    if (input.structuralInstabilityLow === true) return "prepare-structural-evolution";
    if (input.consistencyLabel === "high" || input.consistencyLabel === "medium") return "expand-semantic-scope";
    return "optimize-learning";
  }

  return "optimize-learning";
}

function computeAutonomyPressure(input: {
  semanticWeaknessClustersHigh: boolean;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  semanticHealthLabel: SiteSemanticIntelligence["semanticHealthLabel"];
}): StrategicEvolutionModelV1["autonomyEvolutionSignal"]["autonomyPressure"] {
  if (input.semanticWeaknessClustersHigh === true || input.consistencyLabel === "low") return "high";
  if (input.semanticHealthLabel === "high" && input.consistencyLabel === "high") return "low";
  return "medium";
}

function computeExpansionReadiness(evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"]): StrategicEvolutionModelV1["autonomyEvolutionSignal"]["expansionReadiness"] {
  if (evolutionLabel === "regressing" || evolutionLabel === "unstable") return "blocked";
  if (evolutionLabel === "stagnating") return "cautious";
  if (evolutionLabel === "progressing") return "guided";
  return "ready";
}

function computeDriversRisksOpportunities(input: {
  evolutionLabel: StrategicEvolutionModelV1["evolutionLabel"];
  strategicLearningScore: number;
  learningHealthScore: number;
  adaptationHealthScore: number;
  readinessScore: number;
  driftDetected: boolean;
  cooldownTighteningRequired: boolean;
  unresolvedRatio: number;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  semanticHealthLabel: SiteSemanticIntelligence["semanticHealthLabel"];
  semanticWeaknessClustersHigh: boolean;
  automationCandidatePresent: boolean;
  stabilitySignalsStrong: boolean;
  schedulerReliability: ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"];
  replayDeterminism: ExecutionLearningSignalsV1["stabilitySignals"]["replayDeterminism"];
}): Pick<StrategicEvolutionModelV1, "evolutionDrivers" | "evolutionRisks" | "evolutionOpportunities"> {
  const evolutionDrivers: string[] = [];
  const evolutionRisks: string[] = [];
  const evolutionOpportunities: string[] = [];

  // Drivers (fixed priority)
  if (input.strategicLearningScore >= 65) addUniqueLimited(evolutionDrivers, "Strategic learning score is strong.", 6);
  if (input.learningHealthScore >= 65) addUniqueLimited(evolutionDrivers, "Execution learning health is strong.", 6);
  if (input.adaptationHealthScore >= 65) addUniqueLimited(evolutionDrivers, "Adaptive scheduling health is strong.", 6);
  if (input.readinessScore >= 65) addUniqueLimited(evolutionDrivers, "Semantic execution readiness score is strong.", 6);
  if (input.automationCandidatePresent === true) addUniqueLimited(evolutionDrivers, "Automation candidate signals are present.", 6);
  if (input.stabilitySignalsStrong === true) addUniqueLimited(evolutionDrivers, "Stability signals are strong.", 6);

  // Risks (fixed priority)
  if (input.driftDetected === true) addUniqueLimited(evolutionRisks, "Replay drift detected.", 6);
  if (input.cooldownTighteningRequired === true) addUniqueLimited(evolutionRisks, "Cooldown tightening required.", 6);
  if (input.unresolvedRatio > 0.3) addUniqueLimited(evolutionRisks, "Unresolved page ratio is high.", 6);
  if (input.consistencyLabel === "low") addUniqueLimited(evolutionRisks, "Semantic consistency is low.", 6);
  if (input.semanticWeaknessClustersHigh === true) addUniqueLimited(evolutionRisks, "Semantic weakness clusters are high.", 6);
  if (input.schedulerReliability === "low") addUniqueLimited(evolutionRisks, "Scheduler reliability is low.", 6);

  // Opportunities (fixed priority)
  if (input.automationCandidatePresent === true) addUniqueLimited(evolutionOpportunities, "Automation candidate available for guided expansion.", 6);
  if (input.unresolvedRatio > 0.3) addUniqueLimited(evolutionOpportunities, "Reduce unresolved pages to strengthen learning signals.", 6);
  if (input.consistencyLabel === "low") addUniqueLimited(evolutionOpportunities, "Improve consistency to unlock safer expansion.", 6);
  if (input.replayDeterminism !== "high") addUniqueLimited(evolutionOpportunities, "Increase replay determinism to improve predictability.", 6);
  if (input.evolutionLabel === "progressing" && (input.consistencyLabel === "high" || input.consistencyLabel === "medium")) {
    addUniqueLimited(evolutionOpportunities, "Expand semantic scope under guided constraints.", 6);
  }
  if (input.semanticHealthLabel === "high" && input.consistencyLabel === "high" && input.driftDetected !== true) {
    addUniqueLimited(evolutionOpportunities, "Leverage high semantic health for safe autonomy expansion.", 6);
  }

  return {
    evolutionDrivers,
    evolutionRisks,
    evolutionOpportunities,
  };
}

export function buildStrategicEvolutionModelV1(input: StrategicEvolutionModelInputV1): StrategicEvolutionModelV1 {
  const strategicLearningCoreObj = unwrapMaybeNested(input.strategicLearningCore, "strategicLearningCore");
  const executionLearningSignalsObj = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  const adaptiveSchedulingSignalsObj = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  const readinessObj = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");

  const strategicLearningScore = normalizeScoreFrom(strategicLearningCoreObj, ["learningScore", "strategicLearningScore"]);
  const learningHealthScore = normalizeScoreFrom(executionLearningSignalsObj, ["learningHealthScore"]);
  const adaptationHealthScore = normalizeScoreFrom(adaptiveSchedulingSignalsObj, ["adaptationHealthScore"]);
  const readinessScore = normalizeScoreFrom(readinessObj, ["score", "readinessScore"]);

  const driftDetected = normalizeDriftDetected(input);
  const cooldownTighteningRequired = normalizeCooldownTighteningRequired(input);
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const semanticHealthLabel = normalizeSemanticHealthLabel(input);
  const semanticWeaknessClustersHigh = normalizeSemanticWeaknessClustersHigh(input);
  const automationCandidatePresent = normalizeAutomationCandidatePresent(input);
  const adaptationReady = normalizeAdaptationReady(input);
  const schedulerReliability = normalizeSchedulerReliability(input);
  const schedulerReliabilityHigh = schedulerReliability === "high";
  const replayDeterminism = normalizeReplayDeterminism(input);
  const executionStability = normalizeExecutionStability(input);
  const idempotentSkipsRecent = normalizeIdempotentSkipsRecent(input);

  const stabilitySignalsStrong = isStabilitySignalsStrong({
    driftDetected,
    schedulerReliability,
    replayDeterminism,
    executionStability,
    adaptationReady,
    consistencyLabel,
  });

  const baseEvolutionScore = (strategicLearningScore + learningHealthScore + adaptationHealthScore + readinessScore) / 4;

  let evolutionScore = baseEvolutionScore;
  if (driftDetected === true) evolutionScore -= 15;
  if (cooldownTighteningRequired === true) evolutionScore -= 10;
  if (unresolvedRatio > 0.3) evolutionScore -= 10;
  if (consistencyLabel === "low") evolutionScore -= 12;
  if (semanticWeaknessClustersHigh === true) evolutionScore -= 8;
  if (automationCandidatePresent === true) evolutionScore += 8;
  if (stabilitySignalsStrong === true) evolutionScore += 6;
  if (schedulerReliabilityHigh === true) evolutionScore += 6;
  if (adaptationReady === true) evolutionScore += 6;
  evolutionScore = clamp0to100(evolutionScore);

  const evolutionLabel = evolutionLabelForScore(evolutionScore);

  const evolutionDelta = normalizeEvolutionDelta(input);

  const trajectoryStability: StrategicEvolutionModelV1["evolutionTrajectory"]["stability"] =
    stabilitySignalsStrong === true ? "high" : driftDetected === true || schedulerReliability === "low" ? "low" : "medium";

  const trajectoryPredictability: StrategicEvolutionModelV1["evolutionTrajectory"]["predictability"] =
    driftDetected === true || idempotentSkipsRecent === true
      ? "low"
      : replayDeterminism === "high" && schedulerReliability !== "low"
        ? "high"
        : "medium";

  const evolutionTrajectory: StrategicEvolutionModelV1["evolutionTrajectory"] = {
    direction: trajectoryDirectionForDelta(evolutionDelta),
    stability: trajectoryStability,
    predictability: trajectoryPredictability,
  };

  const expansionReadiness = computeExpansionReadiness(evolutionLabel);
  const autonomyPressure = computeAutonomyPressure({
    semanticWeaknessClustersHigh,
    consistencyLabel,
    semanticHealthLabel,
  });

  let expansionConfidence = evolutionScore;
  if (driftDetected === true) expansionConfidence -= 10;
  if (evolutionTrajectory.stability === "high") expansionConfidence += 5;
  if (adaptationReady === true) expansionConfidence += 5;
  expansionConfidence = clamp0to100(expansionConfidence);

  const structuralInstabilityLow =
    driftDetected !== true &&
    executionStability !== "unstable" &&
    (() => {
      const exec = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
      if (!isRecord(exec)) return false;
      const drift = isRecord((exec as any).driftSignals) ? (exec as any).driftSignals : null;
      const risk = String(drift?.executionDriftRisk ?? "").trim();
      return risk === "low";
    })();

  const strategicEvolutionPosture = postureForSignals({
    evolutionLabel,
    expansionReadiness,
    consistencyLabel,
    structuralInstabilityLow,
  });

  const { evolutionDrivers, evolutionRisks, evolutionOpportunities } = computeDriversRisksOpportunities({
    evolutionLabel,
    strategicLearningScore,
    learningHealthScore,
    adaptationHealthScore,
    readinessScore,
    driftDetected,
    cooldownTighteningRequired,
    unresolvedRatio,
    consistencyLabel,
    semanticHealthLabel,
    semanticWeaknessClustersHigh,
    automationCandidatePresent,
    stabilitySignalsStrong,
    schedulerReliability,
    replayDeterminism,
  });

  const notes: string[] = [];
  addUniqueLimited(notes, "Strategic evolution model v1 is interpretive and does not alter system behavior.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(notes, "High unresolvedRatio reduces confidence in semantic interpretation.", 6);
  if (driftDetected === true) addUniqueLimited(notes, "Replay drift reduces stability and predictability signals.", 6);
  if (cooldownTighteningRequired === true) addUniqueLimited(notes, "Cooldown signals indicate constrained safe expansion.", 6);
  if (consistencyLabel === "low") addUniqueLimited(notes, "Low semantic consistency increases autonomy pressure.", 6);
  if (semanticWeaknessClustersHigh === true) addUniqueLimited(notes, "Clustered semantic weaknesses increase autonomy pressure.", 6);

  return {
    evolutionScore,
    evolutionLabel,
    evolutionTrajectory,
    autonomyEvolutionSignal: {
      expansionReadiness,
      autonomyPressure,
      expansionConfidence,
    },
    strategicEvolutionPosture,
    evolutionDrivers,
    evolutionRisks,
    evolutionOpportunities,
    summary: summaryForLabel(evolutionLabel),
    notes,
  };
}

