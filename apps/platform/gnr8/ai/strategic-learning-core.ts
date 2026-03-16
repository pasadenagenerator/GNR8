import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { StrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";

export type StrategicLearningCoreV1 = {
  strategicLearningScore: number;
  strategicLearningLabel: "immature" | "developing" | "adaptive" | "self-stabilizing";

  learningTrajectory: "regressing" | "unstable" | "stabilizing" | "evolving";

  autonomyEvolutionSignal: "blocked" | "premature" | "preparing" | "safe-to-expand";

  adaptationMaturity: "signal-fragmented" | "partially-integrated" | "coherent" | "systemic";

  strategicSystemPressure: {
    semanticPressure: "low" | "medium" | "high";
    executionPressure: "low" | "medium" | "high";
    consistencyPressure: "low" | "medium" | "high";
    autonomyPressure: "low" | "medium" | "high";
  };

  strategicWeaknessVectors: string[];
  strategicStabilitySignals: string[];
  strategicGrowthSignals: string[];

  summary: string;
  notes: string[];
};

export type StrategicLearningCoreInputV1 = {
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;
  adaptiveSchedulingSignals?: AdaptiveSchedulingSignalsV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;

  siteSemanticIntelligence?: SiteSemanticIntelligence | Record<string, unknown> | null;
  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;

  strategicSemanticReasoning?: StrategicSemanticReasoning | Record<string, unknown> | null;
  strategicSemanticExecutionReadiness?: StrategicSemanticExecutionReadiness | Record<string, unknown> | null;

  strategicExecutionRuntimeDecision?: StrategicExecutionRuntimeDecision | Record<string, unknown> | null;
  autonomousExecutionPolicy?: AutonomousExecutionPolicy | Record<string, unknown> | null;
  semiStrategicExecutionController?: SemiStrategicExecutionController | Record<string, unknown> | null;

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

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function normalizeUnresolvedRatio(input: StrategicLearningCoreInputV1): number {
  const unresolvedRatio = typeof input.unresolvedRatio === "number" && Number.isFinite(input.unresolvedRatio) ? input.unresolvedRatio : null;
  if (unresolvedRatio === null) return 1;
  if (unresolvedRatio < 0) return 0;
  if (unresolvedRatio > 1) return 1;
  return unresolvedRatio;
}

function normalizeSemanticIntelligence(input: StrategicLearningCoreInputV1): {
  semanticHealthScore: number;
  semanticHealthLabel: SiteSemanticIntelligence["semanticHealthLabel"];
  semanticAutomationReadinessLabel: SiteSemanticIntelligence["semanticAutomationReadiness"]["label"];
  semanticWeaknessClusters: string[];
  semanticCoverage: SiteSemanticIntelligence["semanticCoverage"];
} {
  const obj = unwrapMaybeNested(input.siteSemanticIntelligence, "siteSemanticIntelligence");
  const fallback = {
    semanticHealthScore: 0,
    semanticHealthLabel: "low" as const,
    semanticAutomationReadinessLabel: "not-ready" as const,
    semanticWeaknessClusters: [] as string[],
    semanticCoverage: {
      heroCoverage: 0,
      ctaCoverage: 0,
      faqCoverage: 0,
      pricingCoverage: 0,
      featureGridCoverage: 0,
    },
  };

  if (!isRecord(obj)) return fallback;

  const scoreRaw = (obj as any).semanticHealthScore;
  const semanticHealthScore = typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? clamp0to100(scoreRaw) : fallback.semanticHealthScore;

  const labelRaw = String((obj as any).semanticHealthLabel ?? "").trim();
  const semanticHealthLabel: SiteSemanticIntelligence["semanticHealthLabel"] =
    labelRaw === "high" || labelRaw === "medium" || labelRaw === "low" ? labelRaw : fallback.semanticHealthLabel;

  const readinessObj = isRecord((obj as any).semanticAutomationReadiness) ? (obj as any).semanticAutomationReadiness : null;
  const readinessLabelRaw = String(readinessObj?.label ?? "").trim();
  const semanticAutomationReadinessLabel: SiteSemanticIntelligence["semanticAutomationReadiness"]["label"] =
    readinessLabelRaw === "not-ready" || readinessLabelRaw === "review-needed" || readinessLabelRaw === "automation-candidate"
      ? readinessLabelRaw
      : fallback.semanticAutomationReadinessLabel;

  const weaknessClustersRaw = (obj as any).semanticWeaknessClusters;
  const semanticWeaknessClusters = Array.isArray(weaknessClustersRaw)
    ? weaknessClustersRaw.map((c: unknown) => (typeof c === "string" ? c.trim() : "")).filter(Boolean)
    : fallback.semanticWeaknessClusters;

  const coverageObj = isRecord((obj as any).semanticCoverage) ? (obj as any).semanticCoverage : null;
  const normalizePercent = (v: unknown): number => {
    const n = typeof v === "number" && Number.isFinite(v) ? v : null;
    if (n === null) return 0;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return Math.round(n);
  };
  const semanticCoverage: SiteSemanticIntelligence["semanticCoverage"] = {
    heroCoverage: normalizePercent(coverageObj?.heroCoverage),
    ctaCoverage: normalizePercent(coverageObj?.ctaCoverage),
    faqCoverage: normalizePercent(coverageObj?.faqCoverage),
    pricingCoverage: normalizePercent(coverageObj?.pricingCoverage),
    featureGridCoverage: normalizePercent(coverageObj?.featureGridCoverage),
  };

  return {
    semanticHealthScore,
    semanticHealthLabel,
    semanticAutomationReadinessLabel,
    semanticWeaknessClusters,
    semanticCoverage,
  };
}

function normalizeConsistency(input: StrategicLearningCoreInputV1): {
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  lowDimensionCount: number;
} {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  const fallback = { consistencyLabel: "low" as const, lowDimensionCount: 4 };
  if (!isRecord(obj)) return fallback;

  const labelRaw = String((obj as any).consistencyLabel ?? "").trim();
  const consistencyLabel: SiteSemanticConsistency["consistencyLabel"] =
    labelRaw === "high" || labelRaw === "medium" || labelRaw === "low" ? labelRaw : fallback.consistencyLabel;

  const dims = isRecord((obj as any).consistencyDimensions) ? (obj as any).consistencyDimensions : null;
  const dimValues = [
    String(dims?.heroConsistency ?? "").trim(),
    String(dims?.ctaConsistency ?? "").trim(),
    String(dims?.faqConsistency ?? "").trim(),
    String(dims?.pricingConsistency ?? "").trim(),
  ].filter((v) => v === "low" || v === "medium" || v === "high") as Array<"low" | "medium" | "high">;
  const lowDimensionCount = dimValues.filter((v) => v === "low").length;

  return { consistencyLabel, lowDimensionCount };
}

function normalizeReadiness(input: StrategicLearningCoreInputV1): {
  readinessScore: number;
  readinessLabel: StrategicSemanticExecutionReadiness["label"];
} {
  const obj = unwrapMaybeNested(input.strategicSemanticExecutionReadiness, "strategicSemanticExecutionReadiness");
  const fallback = { readinessScore: 0, readinessLabel: "not-ready" as const };
  if (!isRecord(obj)) return fallback;

  const scoreRaw = (obj as any).score;
  const readinessScore = typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? clamp0to100(scoreRaw) : fallback.readinessScore;

  const labelRaw = String((obj as any).label ?? "").trim();
  const readinessLabel: StrategicSemanticExecutionReadiness["label"] =
    labelRaw === "not-ready" || labelRaw === "phase-ready" || labelRaw === "execution-ready" ? labelRaw : fallback.readinessLabel;

  return { readinessScore, readinessLabel };
}

function normalizeExecutionLearning(input: StrategicLearningCoreInputV1): {
  learningHealthScore: number;
  learningHealthLabel: ExecutionLearningSignalsV1["learningHealthLabel"];
  driftDetected: boolean;
  cooldownActive: boolean;
  previewDependency: boolean;
  consistencyDriftPressure: boolean;
  executionStability: ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"];
  replayDeterminism: ExecutionLearningSignalsV1["stabilitySignals"]["replayDeterminism"];
  schedulerReliability: ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"];
} {
  const obj = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  const fallback = {
    learningHealthScore: 0,
    learningHealthLabel: "fragile" as const,
    driftDetected: false,
    cooldownActive: false,
    previewDependency: true,
    consistencyDriftPressure: true,
    executionStability: "unstable" as const,
    replayDeterminism: "low" as const,
    schedulerReliability: "low" as const,
  };
  if (!isRecord(obj)) return fallback;

  const scoreRaw = (obj as any).learningHealthScore;
  const learningHealthScore = typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? clamp0to100(scoreRaw) : fallback.learningHealthScore;

  const labelRaw = String((obj as any).learningHealthLabel ?? "").trim();
  const learningHealthLabel: ExecutionLearningSignalsV1["learningHealthLabel"] =
    labelRaw === "strong" || labelRaw === "watch" || labelRaw === "fragile" ? labelRaw : fallback.learningHealthLabel;

  const driftObj = isRecord((obj as any).driftSignals) ? (obj as any).driftSignals : null;
  const driftDetected = typeof driftObj?.replayDriftPresent === "boolean" ? driftObj.replayDriftPresent === true : fallback.driftDetected;
  const consistencyDriftPressure =
    typeof driftObj?.consistencyDriftPressure === "boolean" ? driftObj.consistencyDriftPressure === true : fallback.consistencyDriftPressure;

  const pacingObj = isRecord((obj as any).pacingSignals) ? (obj as any).pacingSignals : null;
  const cooldownActive = typeof pacingObj?.cooldownPressure === "boolean" ? pacingObj.cooldownPressure === true : fallback.cooldownActive;
  const previewDependency = typeof pacingObj?.previewDependency === "boolean" ? pacingObj.previewDependency === true : fallback.previewDependency;

  const stabObj = isRecord((obj as any).stabilitySignals) ? (obj as any).stabilitySignals : null;
  const execStabRaw = String(stabObj?.executionStability ?? "").trim();
  const executionStability: ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"] =
    execStabRaw === "stable" || execStabRaw === "mixed" || execStabRaw === "unstable" ? execStabRaw : fallback.executionStability;

  const replayDetRaw = String(stabObj?.replayDeterminism ?? "").trim();
  const replayDeterminism: ExecutionLearningSignalsV1["stabilitySignals"]["replayDeterminism"] =
    replayDetRaw === "high" || replayDetRaw === "medium" || replayDetRaw === "low" ? replayDetRaw : fallback.replayDeterminism;

  const schedRelRaw = String(stabObj?.schedulerReliability ?? "").trim();
  const schedulerReliability: ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"] =
    schedRelRaw === "high" || schedRelRaw === "medium" || schedRelRaw === "low" ? schedRelRaw : fallback.schedulerReliability;

  return {
    learningHealthScore,
    learningHealthLabel,
    driftDetected,
    cooldownActive,
    previewDependency,
    consistencyDriftPressure,
    executionStability,
    replayDeterminism,
    schedulerReliability,
  };
}

function normalizeAdaptiveScheduling(input: StrategicLearningCoreInputV1): {
  adaptationHealthScore: number;
  adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"];
  cooldownStrictness: AdaptiveSchedulingSignalsV1["cooldownSignals"]["cooldownStrictness"];
  previewDependencyLevel: AdaptiveSchedulingSignalsV1["previewSignals"]["previewDependencyLevel"];
  safeToExpandApplyScheduling: boolean;
} {
  const obj = unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals");
  const fallback = {
    adaptationHealthScore: 0,
    adaptationHealthLabel: "hold" as const,
    cooldownStrictness: "hold" as const,
    previewDependencyLevel: "high" as const,
    safeToExpandApplyScheduling: false,
  };
  if (!isRecord(obj)) return fallback;

  const scoreRaw = (obj as any).adaptationHealthScore;
  const adaptationHealthScore = typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? clamp0to100(scoreRaw) : fallback.adaptationHealthScore;

  const labelRaw = String((obj as any).adaptationHealthLabel ?? "").trim();
  const adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] =
    labelRaw === "ready" || labelRaw === "watch" || labelRaw === "hold" ? labelRaw : fallback.adaptationHealthLabel;

  const cooldownObj = isRecord((obj as any).cooldownSignals) ? (obj as any).cooldownSignals : null;
  const cooldownStrictnessRaw = String(cooldownObj?.cooldownStrictness ?? "").trim();
  const cooldownStrictness: AdaptiveSchedulingSignalsV1["cooldownSignals"]["cooldownStrictness"] =
    cooldownStrictnessRaw === "hold" || cooldownStrictnessRaw === "monitor" || cooldownStrictnessRaw === "relax"
      ? cooldownStrictnessRaw
      : fallback.cooldownStrictness;

  const previewObj = isRecord((obj as any).previewSignals) ? (obj as any).previewSignals : null;
  const previewLevelRaw = String(previewObj?.previewDependencyLevel ?? "").trim();
  const previewDependencyLevel: AdaptiveSchedulingSignalsV1["previewSignals"]["previewDependencyLevel"] =
    previewLevelRaw === "high" || previewLevelRaw === "medium" || previewLevelRaw === "low" ? previewLevelRaw : fallback.previewDependencyLevel;

  const schedulerObj = isRecord((obj as any).schedulerAdaptationSignals) ? (obj as any).schedulerAdaptationSignals : null;
  const safeToExpandApplyScheduling =
    typeof schedulerObj?.safeToExpandApplyScheduling === "boolean" ? schedulerObj.safeToExpandApplyScheduling === true : fallback.safeToExpandApplyScheduling;

  return {
    adaptationHealthScore,
    adaptationHealthLabel,
    cooldownStrictness,
    previewDependencyLevel,
    safeToExpandApplyScheduling,
  };
}

function normalizeExecutionMemory(input: StrategicLearningCoreInputV1): {
  driftDetectedRecent: boolean;
  cooldownActive: boolean;
  executionSuccessTrend: ExecutionMemoryV1["stabilitySignals"]["executionSuccessTrend"];
  idempotentSkipsRecent: boolean;
  lastMode: ExecutionMemoryV1["recentExecutionSummary"]["lastMode"];
  memoryHealthLabel: ExecutionMemoryV1["memoryHealthLabel"];
  consistencyLow: boolean;
  automationCandidatePresent: boolean;
} {
  const obj = unwrapMaybeNested(input.executionMemory, "executionMemory");
  const fallback = {
    driftDetectedRecent: false,
    cooldownActive: false,
    executionSuccessTrend: "unknown" as const,
    idempotentSkipsRecent: false,
    lastMode: null as ExecutionMemoryV1["recentExecutionSummary"]["lastMode"],
    memoryHealthLabel: "unstable" as const,
    consistencyLow: true,
    automationCandidatePresent: false,
  };
  if (!isRecord(obj)) return fallback;

  const stabilityObj = isRecord((obj as any).stabilitySignals) ? (obj as any).stabilitySignals : null;
  const driftDetectedRecent =
    typeof stabilityObj?.driftDetectedRecent === "boolean" ? stabilityObj.driftDetectedRecent === true : fallback.driftDetectedRecent;
  const cooldownActive = typeof stabilityObj?.cooldownActive === "boolean" ? stabilityObj.cooldownActive === true : fallback.cooldownActive;

  const trendRaw = String(stabilityObj?.executionSuccessTrend ?? "").trim();
  const executionSuccessTrend: ExecutionMemoryV1["stabilitySignals"]["executionSuccessTrend"] =
    trendRaw === "improving" || trendRaw === "stable" || trendRaw === "degrading" || trendRaw === "unknown"
      ? trendRaw
      : fallback.executionSuccessTrend;

  const idempotentSkipsRecent =
    typeof stabilityObj?.idempotentSkipsRecent === "boolean" ? stabilityObj.idempotentSkipsRecent === true : fallback.idempotentSkipsRecent;

  const recentObj = isRecord((obj as any).recentExecutionSummary) ? (obj as any).recentExecutionSummary : null;
  const lastModeRaw = String(recentObj?.lastMode ?? "").trim();
  const lastMode: ExecutionMemoryV1["recentExecutionSummary"]["lastMode"] =
    lastModeRaw === "blocked" || lastModeRaw === "preview-only" || lastModeRaw === "idempotent-skip" || lastModeRaw === "executed"
      ? lastModeRaw
      : fallback.lastMode;

  const labelRaw = String((obj as any).memoryHealthLabel ?? "").trim();
  const memoryHealthLabel: ExecutionMemoryV1["memoryHealthLabel"] =
    labelRaw === "stable" || labelRaw === "monitoring" || labelRaw === "unstable" ? labelRaw : fallback.memoryHealthLabel;

  const pressureObj = isRecord((obj as any).executionPressureSignals) ? (obj as any).executionPressureSignals : null;
  const consistencyLow = typeof pressureObj?.consistencyLow === "boolean" ? pressureObj.consistencyLow === true : fallback.consistencyLow;
  const automationCandidatePresent =
    typeof pressureObj?.automationCandidatePresent === "boolean" ? pressureObj.automationCandidatePresent === true : fallback.automationCandidatePresent;

  return {
    driftDetectedRecent,
    cooldownActive,
    executionSuccessTrend,
    idempotentSkipsRecent,
    lastMode,
    memoryHealthLabel,
    consistencyLow,
    automationCandidatePresent,
  };
}

function normalizeRuntimeSignals(input: StrategicLearningCoreInputV1): {
  runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  autonomyStage: AutonomousExecutionPolicy["autonomyStage"];
  semiStrategicPosture: SemiStrategicExecutionController["executionPosture"];
} {
  const decisionObj = unwrapMaybeNested(input.strategicExecutionRuntimeDecision, "strategicExecutionRuntimeDecision");
  const policyObj = unwrapMaybeNested(input.autonomousExecutionPolicy, "autonomousExecutionPolicy");
  const semiObj = unwrapMaybeNested(input.semiStrategicExecutionController, "semiStrategicExecutionController");

  const runtimeDecisionRaw = isRecord(decisionObj) ? String((decisionObj as any)?.executionDecision ?? "").trim() : "";
  const runtimeDecision: StrategicExecutionRuntimeDecision["executionDecision"] =
    runtimeDecisionRaw === "blocked" ||
    runtimeDecisionRaw === "preview-only" ||
    runtimeDecisionRaw === "semantic-execution" ||
    runtimeDecisionRaw === "structural-execution" ||
    runtimeDecisionRaw === "mixed-execution"
      ? runtimeDecisionRaw
      : "blocked";

  const autonomyStageRaw = isRecord(policyObj) ? String((policyObj as any)?.autonomyStage ?? "").trim() : "";
  const autonomyStage: AutonomousExecutionPolicy["autonomyStage"] =
    autonomyStageRaw === "manual-only" ||
    autonomyStageRaw === "pilot-assist" ||
    autonomyStageRaw === "guided-autonomy" ||
    autonomyStageRaw === "future-autonomy"
      ? autonomyStageRaw
      : "manual-only";

  const semiPostureRaw = isRecord(semiObj) ? String((semiObj as any)?.executionPosture ?? "").trim() : "";
  const semiStrategicPosture: SemiStrategicExecutionController["executionPosture"] =
    semiPostureRaw === "blocked" ||
    semiPostureRaw === "pilot-mode" ||
    semiPostureRaw === "guided-execution" ||
    semiPostureRaw === "full-execution-ready"
      ? semiPostureRaw
      : "blocked";

  return { runtimeDecision, autonomyStage, semiStrategicPosture };
}

function labelForScore(score: number): StrategicLearningCoreV1["strategicLearningLabel"] {
  if (score <= 29) return "immature";
  if (score <= 54) return "developing";
  if (score <= 79) return "adaptive";
  return "self-stabilizing";
}

function summaryForLabel(label: StrategicLearningCoreV1["strategicLearningLabel"]): string {
  switch (label) {
    case "immature":
      return "Strategic learning capacity is not yet established.";
    case "developing":
      return "Strategic learning signals are forming but remain unstable.";
    case "adaptive":
      return "Strategic learning state supports controlled adaptive evolution.";
    case "self-stabilizing":
      return "Strategic learning core indicates systemic adaptive maturity.";
    default:
      return "Strategic learning state is unavailable.";
  }
}

function isStabilitySignalsStrong(input: {
  executionLearning: ReturnType<typeof normalizeExecutionLearning>;
  adaptive: ReturnType<typeof normalizeAdaptiveScheduling>;
  memory: ReturnType<typeof normalizeExecutionMemory>;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
}): boolean {
  const stableExec =
    input.executionLearning.executionStability === "stable" &&
    input.executionLearning.replayDeterminism === "high" &&
    input.executionLearning.schedulerReliability !== "low";
  const stableMemory = input.memory.memoryHealthLabel === "stable" && input.memory.cooldownActive !== true;
  const stableAdaptation = input.adaptive.adaptationHealthLabel === "ready" && input.adaptive.cooldownStrictness !== "hold";
  const stableConsistency = input.consistencyLabel === "high";

  return stableExec && stableMemory && stableAdaptation && stableConsistency && input.executionLearning.driftDetected !== true && input.memory.driftDetectedRecent !== true;
}

function hasMixedSignals(input: {
  semanticHealthScore: number;
  readinessScore: number;
  learningHealthScore: number;
  adaptationHealthScore: number;
}): boolean {
  const highs = [input.semanticHealthScore, input.readinessScore, input.learningHealthScore, input.adaptationHealthScore].filter((v) => v >= 70).length;
  const lows = [input.semanticHealthScore, input.readinessScore, input.learningHealthScore, input.adaptationHealthScore].filter((v) => v <= 45).length;
  return highs >= 1 && lows >= 1;
}

export function buildStrategicLearningCoreV1(input: StrategicLearningCoreInputV1): StrategicLearningCoreV1 {
  const unresolvedRatio = normalizeUnresolvedRatio(input);
  const semantic = normalizeSemanticIntelligence(input);
  const consistency = normalizeConsistency(input);
  const readiness = normalizeReadiness(input);
  const execLearning = normalizeExecutionLearning(input);
  const adaptive = normalizeAdaptiveScheduling(input);
  const memory = normalizeExecutionMemory(input);
  const runtime = normalizeRuntimeSignals(input);

  const baseAverage = (semantic.semanticHealthScore + readiness.readinessScore + execLearning.learningHealthScore + adaptive.adaptationHealthScore) / 4;

  const driftDetected = execLearning.driftDetected === true || memory.driftDetectedRecent === true;
  const cooldownActive = adaptive.cooldownStrictness === "hold" || execLearning.cooldownActive === true || memory.cooldownActive === true;
  const consistencyLow = consistency.consistencyLabel === "low";
  const weaknessClustersHigh = semantic.semanticWeaknessClusters.length >= 3;
  const automationCandidatePresent =
    semantic.semanticAutomationReadinessLabel === "automation-candidate" || memory.automationCandidatePresent === true;
  const stabilitySignalsStrong = isStabilitySignalsStrong({
    executionLearning: execLearning,
    adaptive,
    memory,
    consistencyLabel: consistency.consistencyLabel,
  });
  const schedulerReliabilityHigh = execLearning.schedulerReliability === "high";

  let strategicLearningScore = baseAverage;
  const adjustments: string[] = [];

  if (driftDetected) {
    strategicLearningScore -= 15;
    adjustments.push("driftDetected (-15)");
  }
  if (cooldownActive) {
    strategicLearningScore -= 10;
    adjustments.push("cooldownActive (-10)");
  }
  if (unresolvedRatio > 0.3) {
    strategicLearningScore -= 10;
    adjustments.push("unresolvedRatio>0.3 (-10)");
  }
  if (consistencyLow) {
    strategicLearningScore -= 12;
    adjustments.push("consistency=low (-12)");
  }
  if (weaknessClustersHigh) {
    strategicLearningScore -= 8;
    adjustments.push("weaknessClustersHigh (-8)");
  }
  if (automationCandidatePresent) {
    strategicLearningScore += 8;
    adjustments.push("automationCandidatePresent (+8)");
  }
  if (stabilitySignalsStrong) {
    strategicLearningScore += 6;
    adjustments.push("stabilitySignalsStrong (+6)");
  }
  if (schedulerReliabilityHigh) {
    strategicLearningScore += 6;
    adjustments.push("schedulerReliability=high (+6)");
  }

  strategicLearningScore = clamp0to100(strategicLearningScore);
  const strategicLearningLabel = labelForScore(strategicLearningScore);

  const mixedSignals = hasMixedSignals({
    semanticHealthScore: semantic.semanticHealthScore,
    readinessScore: readiness.readinessScore,
    learningHealthScore: execLearning.learningHealthScore,
    adaptationHealthScore: adaptive.adaptationHealthScore,
  });

  const learningTrajectory: StrategicLearningCoreV1["learningTrajectory"] =
    driftDetected && memory.executionSuccessTrend === "degrading"
      ? "regressing"
      : cooldownActive || mixedSignals
        ? "unstable"
        : execLearning.learningHealthScore >= 75 && stabilitySignalsStrong && !driftDetected
          ? "evolving"
          : (memory.memoryHealthLabel === "stable" || execLearning.executionStability === "stable") &&
              (execLearning.schedulerReliability === "high" || execLearning.schedulerReliability === "medium") &&
              adaptive.adaptationHealthScore >= 55
            ? "stabilizing"
            : strategicLearningScore >= 55
              ? "stabilizing"
              : "unstable";

  const autonomyEvolutionSignal: StrategicLearningCoreV1["autonomyEvolutionSignal"] =
    runtime.autonomyStage === "manual-only" || runtime.runtimeDecision === "blocked" || runtime.semiStrategicPosture === "blocked"
      ? "blocked"
      : semantic.semanticHealthScore < 50 || consistency.consistencyLabel === "low"
        ? "premature"
        : readiness.readinessLabel === "execution-ready" && semantic.semanticHealthLabel === "high" && consistency.consistencyLabel === "high"
          ? "safe-to-expand"
          : readiness.readinessLabel === "phase-ready" &&
              adaptive.adaptationHealthLabel === "ready" &&
              adaptive.cooldownStrictness !== "hold"
            ? "preparing"
            : readiness.readinessLabel === "phase-ready" || adaptive.adaptationHealthLabel === "ready"
              ? "preparing"
              : "premature";

  const hasLearningSignals = isRecord(unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals"));
  const hasAdaptiveSignals = isRecord(unwrapMaybeNested(input.adaptiveSchedulingSignals, "adaptiveSchedulingSignals"));
  const hasExecutionMemory = isRecord(unwrapMaybeNested(input.executionMemory, "executionMemory"));

  const missingCriticalSignals = !hasLearningSignals || !hasAdaptiveSignals || !hasExecutionMemory;

  const adaptationMaturity: StrategicLearningCoreV1["adaptationMaturity"] =
    adaptive.adaptationHealthLabel === "ready" && execLearning.learningHealthScore >= 75 && stabilitySignalsStrong
      ? "systemic"
      : hasLearningSignals &&
          hasExecutionMemory &&
          hasAdaptiveSignals &&
          !driftDetected &&
          !cooldownActive &&
          execLearning.schedulerReliability !== "low" &&
          memory.memoryHealthLabel !== "unstable"
        ? "coherent"
        : missingCriticalSignals || mixedSignals
          ? "signal-fragmented"
          : "partially-integrated";

  const strategicSystemPressure: StrategicLearningCoreV1["strategicSystemPressure"] = {
    semanticPressure:
      semantic.semanticHealthScore < 50 || weaknessClustersHigh ? "high" : semantic.semanticWeaknessClusters.length > 0 || semantic.semanticHealthScore < 80 ? "medium" : "low",
    executionPressure:
      runtime.runtimeDecision === "blocked" || cooldownActive
        ? "high"
        : runtime.runtimeDecision === "preview-only" || execLearning.previewDependency === true || adaptive.previewDependencyLevel !== "low"
          ? "medium"
          : "low",
    consistencyPressure: consistency.consistencyLabel === "low" ? "high" : consistency.consistencyLabel === "medium" ? "medium" : "low",
    autonomyPressure:
      readiness.readinessLabel === "execution-ready" && runtime.autonomyStage !== "future-autonomy" ? "high" : readiness.readinessLabel === "phase-ready" ? "medium" : "low",
  };

  const strategicWeaknessVectors: string[] = [];
  if (driftDetected) addUniqueLimited(strategicWeaknessVectors, "Persistent drift detected.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(strategicWeaknessVectors, "High unresolved page ratio.", 6);
  if (runtime.runtimeDecision === "preview-only" && (adaptive.previewDependencyLevel === "high" || execLearning.previewDependency === true)) {
    addUniqueLimited(strategicWeaknessVectors, "Repeated preview-only execution cycles.", 6);
  }
  if (semantic.semanticHealthScore < 50) addUniqueLimited(strategicWeaknessVectors, "Low semantic health baseline.", 6);
  if (consistency.consistencyLabel === "low" || consistency.lowDimensionCount >= 2) {
    addUniqueLimited(strategicWeaknessVectors, "Low cross-page semantic consistency.", 6);
  }
  if (semantic.semanticCoverage.heroCoverage < 60 || semantic.semanticCoverage.ctaCoverage < 60 || semantic.semanticCoverage.pricingCoverage < 50) {
    addUniqueLimited(strategicWeaknessVectors, "Low semantic coverage on key sections (hero/CTA/pricing).", 6);
  }

  const strategicStabilitySignals: string[] = [];
  if (memory.idempotentSkipsRecent && memory.memoryHealthLabel !== "unstable") addUniqueLimited(strategicStabilitySignals, "Idempotent skips are stable.", 6);
  if (memory.executionSuccessTrend === "improving") addUniqueLimited(strategicStabilitySignals, "Execution success trend improving.", 6);
  if (execLearning.replayDeterminism === "high") addUniqueLimited(strategicStabilitySignals, "Replay determinism is high.", 6);
  if (execLearning.schedulerReliability === "high") addUniqueLimited(strategicStabilitySignals, "Scheduler reliability is high.", 6);
  if (consistency.consistencyLabel === "high") addUniqueLimited(strategicStabilitySignals, "Semantic consistency is high.", 6);
  if (stabilitySignalsStrong) addUniqueLimited(strategicStabilitySignals, "Stability signals are strongly aligned.", 6);

  const strategicGrowthSignals: string[] = [];
  if (automationCandidatePresent) addUniqueLimited(strategicGrowthSignals, "Automation candidate conditions present.", 6);
  if (readiness.readinessLabel === "phase-ready") addUniqueLimited(strategicGrowthSignals, "Strategic semantic execution readiness is progressing.", 6);
  if (readiness.readinessLabel === "execution-ready") addUniqueLimited(strategicGrowthSignals, "Strategic semantic execution readiness is execution-ready.", 6);
  if (adaptive.safeToExpandApplyScheduling === true) addUniqueLimited(strategicGrowthSignals, "Adaptive scheduler signals indicate safe apply expansion.", 6);
  if (consistency.consistencyLabel === "medium" && consistency.lowDimensionCount === 0) {
    addUniqueLimited(strategicGrowthSignals, "Cross-page consistency is normalizing.", 6);
  }
  if (autonomyEvolutionSignal === "preparing") addUniqueLimited(strategicGrowthSignals, "Governance posture indicates preparation for autonomy expansion.", 6);

  const notes: string[] = [];
  addUniqueLimited(
    notes,
    "Strategic learning core v1 interprets existing system signals and does not alter execution behavior.",
    6,
  );
  addUniqueLimited(
    notes,
    `Scoring: baseAverage=avg(semanticHealthScore=${semantic.semanticHealthScore}, readinessScore=${readiness.readinessScore}, learningHealthScore=${execLearning.learningHealthScore}, adaptationHealthScore=${adaptive.adaptationHealthScore}); adjustments=${adjustments.length ? adjustments.join(", ") : "none"}; final=${strategicLearningScore}.`,
    6,
  );
  if (!hasLearningSignals) addUniqueLimited(notes, "Execution learning signals missing; conservative defaults applied.", 6);
  if (!hasAdaptiveSignals) addUniqueLimited(notes, "Adaptive scheduling signals missing; conservative defaults applied.", 6);
  if (!hasExecutionMemory) addUniqueLimited(notes, "Execution memory missing; conservative defaults applied.", 6);
  if (unresolvedRatio > 0.3) addUniqueLimited(notes, "Unresolved pages ratio exceeds 0.3 and reduces learning stability.", 6);

  return {
    strategicLearningScore,
    strategicLearningLabel,
    learningTrajectory,
    autonomyEvolutionSignal,
    adaptationMaturity,
    strategicSystemPressure,
    strategicWeaknessVectors: strategicWeaknessVectors.slice(0, 6),
    strategicStabilitySignals: strategicStabilitySignals.slice(0, 6),
    strategicGrowthSignals: strategicGrowthSignals.slice(0, 6),
    summary: summaryForLabel(strategicLearningLabel),
    notes: notes.slice(0, 6),
  };
}

