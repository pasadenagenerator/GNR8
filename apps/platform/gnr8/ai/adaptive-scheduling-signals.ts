import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { AutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import type { ExecutionCycleSchedulerV1, ExecutionCycleSchedulingDecision } from "@/gnr8/ai/execution-cycle-scheduler";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { ExecutionReplayResultV1, ExecutionReplayStatus } from "@/gnr8/ai/execution-replay-engine";
import type { SemiStrategicExecutionController, SemiStrategicExecutionPosture } from "@/gnr8/ai/semi-strategic-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicWaveExecutionController, StrategicWaveExecutionDecision } from "@/gnr8/ai/strategic-wave-execution-controller";

export type AdaptiveSchedulingSignalsV1 = {
  signalsVersion: "v1";

  cooldownSignals: {
    cooldownStrictness: "hold" | "monitor" | "relax";
    cooldownTighteningSafe: boolean;
    cooldownRelaxationSafe: boolean;
  };

  previewSignals: {
    previewDependencyLevel: "high" | "medium" | "low";
    previewRelaxationSafe: boolean;
    previewFirstShouldPersist: boolean;
  };

  pilotSignals: {
    pilotScopePressure: "narrow" | "steady" | "expand";
    pilotExpansionSafe: boolean;
    pilotContractionRecommended: boolean;
  };

  schedulerAdaptationSignals: {
    safeToReduceCooldown: boolean;
    safeToExpandApplyScheduling: boolean;
    shouldRemainConservative: boolean;
  };

  adaptationHealthScore: number;
  adaptationHealthLabel: "ready" | "watch" | "hold";

  summary: string;
  notes: string[];
};

export type AdaptiveSchedulingSignalsInputV1 = {
  runtimeLedger?: AutonomousExecutionRuntimeLedgerV1 | Record<string, unknown> | null;
  executionReplay?: ExecutionReplayResultV1 | Record<string, unknown> | null;
  executionCycleScheduler?: ExecutionCycleSchedulerV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;
  executionLearningSignals?: ExecutionLearningSignalsV1 | Record<string, unknown> | null;

  strategicExecutionRuntimeDecision?: StrategicExecutionRuntimeDecision | Record<string, unknown> | null;
  autonomousExecutionPolicy?: AutonomousExecutionPolicy | Record<string, unknown> | null;
  strategicWaveExecutionController?: StrategicWaveExecutionController | Record<string, unknown> | null;
  semiStrategicExecutionController?: SemiStrategicExecutionController | Record<string, unknown> | null;

  siteSemanticConsistency?: SiteSemanticConsistency | Record<string, unknown> | null;

  unresolvedRatio?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clamp0to100(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function unwrapMaybeNested(value: unknown, nestedKey: string): unknown {
  if (!isRecord(value)) return value;
  const nested = (value as any)[nestedKey] as unknown;
  if (isRecord(nested)) return nested;
  return value;
}

function normalizeExecutionLearningSignals(input: AdaptiveSchedulingSignalsInputV1): Required<ExecutionLearningSignalsV1> {
  const obj = unwrapMaybeNested(input.executionLearningSignals, "executionLearningSignals");
  const fallback: Required<ExecutionLearningSignalsV1> = {
    signalsVersion: "v1",
    stabilitySignals: {
      executionStability: "unstable",
      replayDeterminism: "low",
      schedulerReliability: "low",
    },
    autonomySignals: {
      autonomyProgressionReadiness: "low",
      semanticAutonomyConfidence: "low",
      structuralAutonomyConfidence: "locked",
    },
    pacingSignals: {
      pacingPressure: "high",
      cooldownPressure: false,
      previewDependency: false,
    },
    driftSignals: {
      replayDriftPresent: false,
      executionDriftRisk: "high",
      consistencyDriftPressure: true,
    },
    learningSignals: {
      safeToTightenAutonomy: false,
      safeToExpandPilotScope: false,
      shouldStayConservative: true,
    },
    learningHealthScore: 0,
    learningHealthLabel: "fragile",
    summary: "",
    notes: [],
  };

  if (!isRecord(obj)) return fallback;

  const learningHealthLabelRaw = String((obj as any).learningHealthLabel ?? "").trim();
  const learningHealthLabel: ExecutionLearningSignalsV1["learningHealthLabel"] =
    learningHealthLabelRaw === "strong" || learningHealthLabelRaw === "watch" || learningHealthLabelRaw === "fragile"
      ? learningHealthLabelRaw
      : fallback.learningHealthLabel;

  const stabilitySignalsObj = isRecord((obj as any).stabilitySignals) ? (obj as any).stabilitySignals : null;
  const stabilityExecutionRaw = String(stabilitySignalsObj?.executionStability ?? "").trim();
  const executionStability: ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"] =
    stabilityExecutionRaw === "stable" || stabilityExecutionRaw === "mixed" || stabilityExecutionRaw === "unstable"
      ? stabilityExecutionRaw
      : fallback.stabilitySignals.executionStability;

  const replayDetRaw = String(stabilitySignalsObj?.replayDeterminism ?? "").trim();
  const replayDeterminism: ExecutionLearningSignalsV1["stabilitySignals"]["replayDeterminism"] =
    replayDetRaw === "high" || replayDetRaw === "medium" || replayDetRaw === "low" ? replayDetRaw : fallback.stabilitySignals.replayDeterminism;

  const schedRelRaw = String(stabilitySignalsObj?.schedulerReliability ?? "").trim();
  const schedulerReliability: ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"] =
    schedRelRaw === "high" || schedRelRaw === "medium" || schedRelRaw === "low" ? schedRelRaw : fallback.stabilitySignals.schedulerReliability;

  const autonomySignalsObj = isRecord((obj as any).autonomySignals) ? (obj as any).autonomySignals : null;
  const readinessRaw = String(autonomySignalsObj?.autonomyProgressionReadiness ?? "").trim();
  const autonomyProgressionReadiness: ExecutionLearningSignalsV1["autonomySignals"]["autonomyProgressionReadiness"] =
    readinessRaw === "low" || readinessRaw === "medium" || readinessRaw === "high" ? readinessRaw : fallback.autonomySignals.autonomyProgressionReadiness;

  const pacingSignalsObj = isRecord((obj as any).pacingSignals) ? (obj as any).pacingSignals : null;
  const cooldownPressure = typeof pacingSignalsObj?.cooldownPressure === "boolean" ? pacingSignalsObj.cooldownPressure === true : fallback.pacingSignals.cooldownPressure;
  const previewDependency = typeof pacingSignalsObj?.previewDependency === "boolean" ? pacingSignalsObj.previewDependency === true : fallback.pacingSignals.previewDependency;

  const driftSignalsObj = isRecord((obj as any).driftSignals) ? (obj as any).driftSignals : null;
  const replayDriftPresent = typeof driftSignalsObj?.replayDriftPresent === "boolean" ? driftSignalsObj.replayDriftPresent === true : fallback.driftSignals.replayDriftPresent;
  const driftRiskRaw = String(driftSignalsObj?.executionDriftRisk ?? "").trim();
  const executionDriftRisk: ExecutionLearningSignalsV1["driftSignals"]["executionDriftRisk"] =
    driftRiskRaw === "low" || driftRiskRaw === "medium" || driftRiskRaw === "high" ? driftRiskRaw : fallback.driftSignals.executionDriftRisk;

  const learningSignalsObj = isRecord((obj as any).learningSignals) ? (obj as any).learningSignals : null;
  const safeToTightenAutonomy =
    typeof learningSignalsObj?.safeToTightenAutonomy === "boolean" ? learningSignalsObj.safeToTightenAutonomy === true : fallback.learningSignals.safeToTightenAutonomy;
  const safeToExpandPilotScope =
    typeof learningSignalsObj?.safeToExpandPilotScope === "boolean" ? learningSignalsObj.safeToExpandPilotScope === true : fallback.learningSignals.safeToExpandPilotScope;
  const shouldStayConservative =
    typeof learningSignalsObj?.shouldStayConservative === "boolean" ? learningSignalsObj.shouldStayConservative === true : fallback.learningSignals.shouldStayConservative;

  return {
    ...fallback,
    learningHealthLabel,
    stabilitySignals: {
      ...fallback.stabilitySignals,
      executionStability,
      replayDeterminism,
      schedulerReliability,
    },
    autonomySignals: {
      ...fallback.autonomySignals,
      autonomyProgressionReadiness,
    },
    pacingSignals: {
      ...fallback.pacingSignals,
      cooldownPressure,
      previewDependency,
    },
    driftSignals: {
      ...fallback.driftSignals,
      replayDriftPresent,
      executionDriftRisk,
    },
    learningSignals: {
      ...fallback.learningSignals,
      safeToTightenAutonomy,
      safeToExpandPilotScope,
      shouldStayConservative,
    },
  };
}

function normalizeSchedulingDecision(input: AdaptiveSchedulingSignalsInputV1): ExecutionCycleSchedulingDecision {
  const obj = unwrapMaybeNested(input.executionCycleScheduler, "executionCycleScheduler");
  if (!isRecord(obj)) return "blocked";
  const raw = String((obj as any)?.schedulingDecision ?? "").trim();
  switch (raw) {
    case "run-now":
    case "preview-first":
    case "cooldown":
    case "blocked":
      return raw;
    default:
      return "blocked";
  }
}

function normalizeMemoryHealthLabel(input: AdaptiveSchedulingSignalsInputV1): ExecutionMemoryV1["memoryHealthLabel"] {
  const obj = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (!isRecord(obj)) return "unstable";
  const raw = String((obj as any)?.memoryHealthLabel ?? "").trim();
  switch (raw) {
    case "stable":
    case "monitoring":
    case "unstable":
      return raw;
    default:
      return "unstable";
  }
}

function normalizeReplayStatus(input: AdaptiveSchedulingSignalsInputV1): ExecutionReplayStatus {
  const obj = unwrapMaybeNested(input.executionReplay, "executionReplay");
  if (!isRecord(obj)) return "unreplayable";
  const raw = String((obj as any)?.replayStatus ?? "").trim();
  switch (raw) {
    case "match":
    case "drift-detected":
    case "invalid-ledger":
    case "unreplayable":
      return raw;
    default:
      return "unreplayable";
  }
}

function normalizeConsistencyLabel(input: AdaptiveSchedulingSignalsInputV1): SiteSemanticConsistency["consistencyLabel"] {
  const obj = unwrapMaybeNested(input.siteSemanticConsistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return "low";
  const raw = String((obj as any)?.consistencyLabel ?? "").trim();
  switch (raw) {
    case "high":
    case "medium":
    case "low":
      return raw;
    default:
      return "low";
  }
}

function normalizeAutonomyDecision(input: AdaptiveSchedulingSignalsInputV1): AutonomousExecutionPolicy["autonomyDecision"] {
  const obj = unwrapMaybeNested(input.autonomousExecutionPolicy, "autonomousExecutionPolicy");
  if (!isRecord(obj)) return "blocked";
  const raw = String((obj as any)?.autonomyDecision ?? "").trim();
  switch (raw) {
    case "blocked":
    case "approval-required":
    case "pilot-allowed":
    case "autonomy-allowed":
      return raw;
    default:
      return "blocked";
  }
}

function normalizeStrategicWaveDecision(input: AdaptiveSchedulingSignalsInputV1): StrategicWaveExecutionDecision {
  const obj = unwrapMaybeNested(input.strategicWaveExecutionController, "strategicWaveExecutionController");
  if (!isRecord(obj)) return "blocked";
  const raw = String((obj as any)?.executionDecision ?? "").trim();
  switch (raw) {
    case "blocked":
    case "pilot-only":
    case "approval-required":
    case "execution-allowed":
      return raw;
    default:
      return "blocked";
  }
}

function normalizeSemiStrategicPosture(input: AdaptiveSchedulingSignalsInputV1): SemiStrategicExecutionPosture {
  const obj = unwrapMaybeNested(input.semiStrategicExecutionController, "semiStrategicExecutionController");
  if (!isRecord(obj)) return "blocked";
  const raw = String((obj as any)?.executionPosture ?? "").trim();
  switch (raw) {
    case "blocked":
    case "pilot-mode":
    case "guided-execution":
    case "full-execution-ready":
      return raw;
    default:
      return "blocked";
  }
}

function normalizeUnresolvedRatio(input: AdaptiveSchedulingSignalsInputV1): number {
  const unresolvedRatio = typeof input.unresolvedRatio === "number" && Number.isFinite(input.unresolvedRatio) ? input.unresolvedRatio : null;
  if (unresolvedRatio === null) return 1;
  if (unresolvedRatio < 0) return 0;
  if (unresolvedRatio > 1) return 1;
  return unresolvedRatio;
}

export function buildAdaptiveSchedulingSignalsV1(input: AdaptiveSchedulingSignalsInputV1): AdaptiveSchedulingSignalsV1 {
  const executionLearningSignals = normalizeExecutionLearningSignals(input);
  const schedulingDecision = normalizeSchedulingDecision(input);
  const memoryHealthLabel = normalizeMemoryHealthLabel(input);
  const replayStatus = normalizeReplayStatus(input);
  const consistencyLabel = normalizeConsistencyLabel(input);
  const autonomyDecision = normalizeAutonomyDecision(input);
  const strategicWaveDecision = normalizeStrategicWaveDecision(input);
  const semiStrategicPosture = normalizeSemiStrategicPosture(input);
  const unresolvedRatio = normalizeUnresolvedRatio(input);

  const cooldownStrictness: AdaptiveSchedulingSignalsV1["cooldownSignals"]["cooldownStrictness"] =
    executionLearningSignals.learningHealthLabel === "fragile" ||
    executionLearningSignals.driftSignals.replayDriftPresent === true ||
    executionLearningSignals.pacingSignals.cooldownPressure === true ||
    schedulingDecision === "cooldown"
      ? "hold"
      : executionLearningSignals.learningHealthLabel === "watch" ||
          schedulingDecision === "preview-first" ||
          memoryHealthLabel === "monitoring"
        ? "monitor"
        : "relax";

  const cooldownTighteningSafe =
    cooldownStrictness === "hold" &&
    executionLearningSignals.stabilitySignals.executionStability === "stable" &&
    executionLearningSignals.stabilitySignals.replayDeterminism === "high" &&
    executionLearningSignals.stabilitySignals.schedulerReliability !== "low" &&
    consistencyLabel === "high";

  const cooldownRelaxationSafe =
    cooldownStrictness === "relax" &&
    executionLearningSignals.learningSignals.safeToTightenAutonomy === true &&
    memoryHealthLabel === "stable" &&
    schedulingDecision !== "blocked";

  const previewDependencyLevel: AdaptiveSchedulingSignalsV1["previewSignals"]["previewDependencyLevel"] =
    executionLearningSignals.pacingSignals.previewDependency === true ||
    schedulingDecision === "preview-first" ||
    autonomyDecision === "blocked" ||
    autonomyDecision === "approval-required"
      ? "high"
      : autonomyDecision === "pilot-allowed" ||
          strategicWaveDecision === "pilot-only" ||
          executionLearningSignals.learningHealthLabel === "watch"
        ? "medium"
        : "low";

  const previewRelaxationSafe =
    previewDependencyLevel === "low" &&
    executionLearningSignals.stabilitySignals.replayDeterminism === "high" &&
    executionLearningSignals.learningSignals.safeToExpandPilotScope === true &&
    executionLearningSignals.learningHealthLabel === "strong";

  const previewFirstShouldPersist =
    previewDependencyLevel === "high" ||
    executionLearningSignals.learningSignals.shouldStayConservative === true ||
    schedulingDecision === "blocked" ||
    schedulingDecision === "preview-first" ||
    consistencyLabel !== "high";

  const pilotScopePressure: AdaptiveSchedulingSignalsV1["pilotSignals"]["pilotScopePressure"] =
    executionLearningSignals.learningSignals.shouldStayConservative === true ||
    executionLearningSignals.driftSignals.executionDriftRisk === "high" ||
    schedulingDecision === "blocked" ||
    unresolvedRatio > 0.25
      ? "narrow"
      : executionLearningSignals.learningHealthLabel === "watch" ||
          autonomyDecision === "pilot-allowed" ||
          semiStrategicPosture === "pilot-mode" ||
          semiStrategicPosture === "guided-execution"
        ? "steady"
        : "expand";

  const pilotExpansionSafe =
    pilotScopePressure === "expand" &&
    executionLearningSignals.learningSignals.safeToExpandPilotScope === true &&
    executionLearningSignals.stabilitySignals.executionStability === "stable" &&
    replayStatus === "match" &&
    consistencyLabel === "high";

  const pilotContractionRecommended =
    pilotScopePressure === "narrow" ||
    executionLearningSignals.driftSignals.replayDriftPresent === true ||
    schedulingDecision === "cooldown" ||
    memoryHealthLabel === "unstable";

  const safeToReduceCooldown =
    cooldownRelaxationSafe === true &&
    executionLearningSignals.stabilitySignals.replayDeterminism === "high" &&
    memoryHealthLabel === "stable";

  const safeToExpandApplyScheduling =
    previewRelaxationSafe === true &&
    pilotExpansionSafe === true &&
    executionLearningSignals.autonomySignals.autonomyProgressionReadiness === "high" &&
    (autonomyDecision === "pilot-allowed" || autonomyDecision === "autonomy-allowed");

  const shouldRemainConservative =
    cooldownStrictness === "hold" ||
    previewFirstShouldPersist === true ||
    pilotContractionRecommended === true ||
    executionLearningSignals.learningHealthLabel === "fragile";

  let score = 100;
  if (cooldownStrictness === "hold") score -= 20;
  if (previewDependencyLevel === "high") score -= 20;
  if (pilotScopePressure === "narrow") score -= 15;
  if (shouldRemainConservative === true) score -= 15;
  if (executionLearningSignals.stabilitySignals.replayDeterminism === "medium") score -= 10;
  if (executionLearningSignals.stabilitySignals.replayDeterminism === "low") score -= 20;
  if (executionLearningSignals.driftSignals.executionDriftRisk === "high") score -= 20;
  if (executionLearningSignals.learningHealthLabel === "watch") score -= 10;
  if (executionLearningSignals.learningHealthLabel === "fragile") score -= 25;

  if (safeToReduceCooldown === true) score += 10;
  if (safeToExpandApplyScheduling === true) score += 10;

  const adaptationHealthScore = clamp0to100(score);
  const adaptationHealthLabel: AdaptiveSchedulingSignalsV1["adaptationHealthLabel"] =
    adaptationHealthScore >= 75 ? "ready" : adaptationHealthScore >= 40 ? "watch" : "hold";

  const summary =
    adaptationHealthLabel === "ready"
      ? "Adaptive scheduling signals indicate readiness for carefully expanded runtime pacing."
      : adaptationHealthLabel === "watch"
        ? "Adaptive scheduling signals indicate mixed conditions that require monitoring before scheduler expansion."
        : "Adaptive scheduling signals indicate that conservative scheduling should remain in place.";

  const notes: string[] = [];
  const tryAddNote = (condition: boolean, note: string) => {
    if (!condition) return;
    if (notes.length >= 5) return;
    notes.push(note);
  };

  tryAddNote(executionLearningSignals.pacingSignals.cooldownPressure === true, "Cooldown pressure remains active.");
  tryAddNote(previewDependencyLevel === "high", "Preview dependency is still high.");
  tryAddNote(pilotScopePressure === "narrow", "Pilot scope should remain narrow.");
  tryAddNote(executionLearningSignals.stabilitySignals.replayDeterminism === "high", "Replay determinism supports scheduler relaxation.");
  tryAddNote(shouldRemainConservative === true, "Adaptive scheduling should remain conservative.");
  tryAddNote(safeToExpandApplyScheduling === true, "Apply scheduling may expand safely under current signals.");
  tryAddNote(pilotExpansionSafe === true, "Pilot expansion appears safe under current signals.");

  notes.push("Adaptive scheduling signals v1 are observational and do not alter scheduler behavior.");

  return {
    signalsVersion: "v1",
    cooldownSignals: {
      cooldownStrictness,
      cooldownTighteningSafe,
      cooldownRelaxationSafe,
    },
    previewSignals: {
      previewDependencyLevel,
      previewRelaxationSafe,
      previewFirstShouldPersist,
    },
    pilotSignals: {
      pilotScopePressure,
      pilotExpansionSafe,
      pilotContractionRecommended,
    },
    schedulerAdaptationSignals: {
      safeToReduceCooldown,
      safeToExpandApplyScheduling,
      shouldRemainConservative,
    },
    adaptationHealthScore,
    adaptationHealthLabel,
    summary,
    notes,
  };
}

