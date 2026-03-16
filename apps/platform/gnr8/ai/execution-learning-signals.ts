import type { AutonomousExecutionPolicy, AutonomousExecutionAutonomyStage } from "@/gnr8/ai/autonomous-execution-policy";
import type { AutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import type { ExecutionCycleSchedulerV1, ExecutionCycleSchedulingDecision } from "@/gnr8/ai/execution-cycle-scheduler";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { ExecutionReplayResultV1, ExecutionReplayStatus } from "@/gnr8/ai/execution-replay-engine";
import type { MixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import type { SemiStrategicExecutionController, SemiStrategicExecutionPosture } from "@/gnr8/ai/semi-strategic-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";

export type ExecutionLearningSignalsV1 = {
  signalsVersion: "v1";

  stabilitySignals: {
    executionStability: "stable" | "mixed" | "unstable";
    replayDeterminism: "high" | "medium" | "low";
    schedulerReliability: "high" | "medium" | "low";
  };

  autonomySignals: {
    autonomyProgressionReadiness: "low" | "medium" | "high";
    semanticAutonomyConfidence: "low" | "medium" | "high";
    structuralAutonomyConfidence: "locked" | "future-phase-1" | "future-phase-2";
  };

  pacingSignals: {
    pacingPressure: "low" | "medium" | "high";
    cooldownPressure: boolean;
    previewDependency: boolean;
  };

  driftSignals: {
    replayDriftPresent: boolean;
    executionDriftRisk: "low" | "medium" | "high";
    consistencyDriftPressure: boolean;
  };

  learningSignals: {
    safeToTightenAutonomy: boolean;
    safeToExpandPilotScope: boolean;
    shouldStayConservative: boolean;
  };

  learningHealthScore: number;
  learningHealthLabel: "strong" | "watch" | "fragile";

  summary: string;
  notes: string[];
};

export type ExecutionLearningSignalsInputV1 = {
  runtimeLedger?: AutonomousExecutionRuntimeLedgerV1 | Record<string, unknown> | null;
  executionReplay?: ExecutionReplayResultV1 | Record<string, unknown> | null;
  executionCycleScheduler?: ExecutionCycleSchedulerV1 | Record<string, unknown> | null;
  executionMemory?: ExecutionMemoryV1 | Record<string, unknown> | null;

  strategicExecutionRuntimeDecision?: StrategicExecutionRuntimeDecision | Record<string, unknown> | null;
  autonomousExecutionPolicy?: AutonomousExecutionPolicy | Record<string, unknown> | null;
  strategicWaveExecutionController?: StrategicWaveExecutionController | Record<string, unknown> | null;
  semiStrategicExecutionController?: SemiStrategicExecutionController | Record<string, unknown> | null;
  mixedWavePreviewDesign?: MixedWavePreviewDesign | Record<string, unknown> | null;

  siteSemanticIntelligence?: SiteSemanticIntelligence | Record<string, unknown> | null;
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

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function unwrapMaybeNested(value: unknown, nestedKey: string): unknown {
  if (!isRecord(value)) return value;
  const nested = (value as any)[nestedKey] as unknown;
  if (isRecord(nested)) return nested;
  return value;
}

function normalizeReplayStatus(replay: unknown): ExecutionReplayStatus | null {
  const obj = unwrapMaybeNested(replay, "executionReplay");
  if (!isRecord(obj)) return null;
  const raw = typeof (obj as any).replayStatus === "string" ? String((obj as any).replayStatus).trim() : "";
  switch (raw) {
    case "match":
    case "drift-detected":
    case "invalid-ledger":
    case "unreplayable":
      return raw;
    default:
      return null;
  }
}

function normalizeOutcomeMode(ledger: unknown): AutonomousExecutionRuntimeLedgerV1["outcome"]["mode"] | null {
  if (!isRecord(ledger)) return null;
  const raw = String((ledger as any)?.outcome?.mode ?? "").trim();
  switch (raw) {
    case "blocked":
    case "preview-only":
    case "idempotent-skip":
    case "executed":
      return raw;
    default:
      return null;
  }
}

function normalizeSchedulerDecision(scheduler: unknown): ExecutionCycleSchedulingDecision | null {
  const obj = unwrapMaybeNested(scheduler, "executionCycleScheduler");
  if (!isRecord(obj)) return null;
  const raw = String((obj as any)?.schedulingDecision ?? "").trim();
  switch (raw) {
    case "run-now":
    case "preview-first":
    case "cooldown":
    case "blocked":
      return raw;
    default:
      return null;
  }
}

function normalizeRecommendedCycleMode(scheduler: unknown): ExecutionCycleSchedulerV1["recommendedCycleMode"] | null {
  const obj = unwrapMaybeNested(scheduler, "executionCycleScheduler");
  if (!isRecord(obj)) return null;
  const raw = String((obj as any)?.recommendedCycleMode ?? "").trim();
  switch (raw) {
    case "none":
    case "preview":
    case "apply":
      return raw;
    default:
      return null;
  }
}

function extractCooldownActive(scheduler: unknown, executionMemory: unknown): boolean {
  const sched = unwrapMaybeNested(scheduler, "executionCycleScheduler");
  if (isRecord(sched) && typeof (sched as any).cooldownActive === "boolean") return (sched as any).cooldownActive === true;

  const mem = unwrapMaybeNested(executionMemory, "executionMemory");
  if (isRecord(mem) && typeof (mem as any)?.stabilitySignals?.cooldownActive === "boolean") {
    return (mem as any).stabilitySignals.cooldownActive === true;
  }

  return false;
}

function normalizeMemoryHealthLabel(memory: unknown): ExecutionMemoryV1["memoryHealthLabel"] | null {
  const obj = unwrapMaybeNested(memory, "executionMemory");
  if (!isRecord(obj)) return null;
  const raw = String((obj as any)?.memoryHealthLabel ?? "").trim();
  switch (raw) {
    case "stable":
    case "monitoring":
    case "unstable":
      return raw;
    default:
      return null;
  }
}

function normalizeConsistencyLabel(consistency: unknown): SiteSemanticConsistency["consistencyLabel"] | null {
  const obj = unwrapMaybeNested(consistency, "siteSemanticConsistency");
  if (!isRecord(obj)) return null;
  const raw = String((obj as any)?.consistencyLabel ?? "").trim();
  switch (raw) {
    case "high":
    case "medium":
    case "low":
      return raw;
    default:
      return null;
  }
}

function normalizeSemanticHealthLabel(intelligence: unknown): SiteSemanticIntelligence["semanticHealthLabel"] | null {
  const obj = unwrapMaybeNested(intelligence, "siteSemanticIntelligence");
  if (!isRecord(obj)) return null;
  const raw = String((obj as any)?.semanticHealthLabel ?? "").trim();
  switch (raw) {
    case "high":
    case "medium":
    case "low":
      return raw;
    default:
      return null;
  }
}

function normalizeAutonomyStage(value: unknown): AutonomousExecutionAutonomyStage | null {
  const raw = String(value ?? "").trim();
  switch (raw) {
    case "manual-only":
    case "pilot-assist":
    case "guided-autonomy":
    case "future-autonomy":
      return raw;
    default:
      return null;
  }
}

function extractAutonomyStage(input: ExecutionLearningSignalsInputV1): AutonomousExecutionAutonomyStage {
  const policy = unwrapMaybeNested(input.autonomousExecutionPolicy, "autonomousExecutionPolicy");
  if (isRecord(policy)) {
    const stage = normalizeAutonomyStage((policy as any)?.autonomyStage);
    if (stage) return stage;
  }

  const ledger = input.runtimeLedger;
  if (isRecord(ledger)) {
    const stage = normalizeAutonomyStage((ledger as any)?.snapshot?.autonomyStage);
    if (stage) return stage;
  }

  const mem = unwrapMaybeNested(input.executionMemory, "executionMemory");
  if (isRecord(mem)) {
    const stage = normalizeAutonomyStage((mem as any)?.autonomyProgressSignals?.autonomyStage);
    if (stage) return stage;
  }

  return "manual-only";
}

function decisionForStage(stage: AutonomousExecutionAutonomyStage): AutonomousExecutionPolicy["autonomyDecision"] {
  if (stage === "manual-only") return "blocked";
  if (stage === "pilot-assist") return "pilot-allowed";
  if (stage === "guided-autonomy") return "approval-required";
  return "autonomy-allowed";
}

function extractAutonomyDecision(input: ExecutionLearningSignalsInputV1, stage: AutonomousExecutionAutonomyStage): AutonomousExecutionPolicy["autonomyDecision"] {
  const policy = unwrapMaybeNested(input.autonomousExecutionPolicy, "autonomousExecutionPolicy");
  if (isRecord(policy)) {
    const raw = String((policy as any)?.autonomyDecision ?? "").trim();
    switch (raw) {
      case "blocked":
      case "approval-required":
      case "pilot-allowed":
      case "autonomy-allowed":
        return raw;
      default:
        break;
    }
  }
  return decisionForStage(stage);
}

function extractAllowedScopes(input: ExecutionLearningSignalsInputV1, stage: AutonomousExecutionAutonomyStage): {
  semanticAutoAllowed: boolean;
  structuralAutoAllowed: boolean;
  mixedAutoAllowed: boolean;
} {
  const policy = unwrapMaybeNested(input.autonomousExecutionPolicy, "autonomousExecutionPolicy");
  if (isRecord(policy)) {
    const scopes = (policy as any)?.allowedScopes as unknown;
    if (isRecord(scopes)) {
      return {
        semanticAutoAllowed: scopes.semanticAutoAllowed === true,
        structuralAutoAllowed: scopes.structuralAutoAllowed === true,
        mixedAutoAllowed: scopes.mixedAutoAllowed === true,
      };
    }
  }

  return {
    semanticAutoAllowed: stage === "future-autonomy",
    structuralAutoAllowed: false,
    mixedAutoAllowed: false,
  };
}

function extractUnresolvedRatio(input: ExecutionLearningSignalsInputV1): number {
  const direct = input.unresolvedRatio;
  if (typeof direct === "number" && Number.isFinite(direct) && direct >= 0) return direct;

  const ledger = input.runtimeLedger;
  if (!isRecord(ledger)) return 0;
  const unresolved = Array.isArray((ledger as any)?.input?.unresolvedPages) ? (ledger as any).input.unresolvedPages.length : 0;
  const resolved = Number.isFinite((ledger as any)?.input?.resolvedPages) ? Number((ledger as any).input.resolvedPages) : 0;
  const total = resolved + unresolved;
  if (total > 0) return unresolved / total;
  return unresolved > 0 ? 1 : 0;
}

function inferControllerExecutionDecisionFromLedger(ledger: unknown): StrategicWaveExecutionController["executionDecision"] | null {
  if (!isRecord(ledger)) return null;
  const mode = String((ledger as any)?.routing?.executionMode ?? "").trim();
  const eligible = (ledger as any)?.guards?.eligible === true || (ledger as any)?.attempt?.eligible === true;
  if (mode === "none") return "blocked";
  if (!eligible && mode === "preview") return "blocked";
  if (mode === "pilot") return "pilot-only";
  if (mode === "guided") return "approval-required";
  if (mode === "full") return "execution-allowed";
  if (mode === "preview") return eligible ? "approval-required" : "blocked";
  return null;
}

function extractControllerExecutionDecision(input: ExecutionLearningSignalsInputV1): StrategicWaveExecutionController["executionDecision"] {
  const controller = unwrapMaybeNested(input.strategicWaveExecutionController, "strategicWaveExecutionController");
  if (isRecord(controller)) {
    const raw = String((controller as any)?.executionDecision ?? "").trim();
    switch (raw) {
      case "blocked":
      case "pilot-only":
      case "approval-required":
      case "execution-allowed":
        return raw;
      default:
        break;
    }
  }

  const inferred = inferControllerExecutionDecisionFromLedger(input.runtimeLedger);
  return inferred ?? "blocked";
}

const EARLY_STRUCTURAL_CLASS_SET = new Set<string>(["cleanup", "merge", "normalize"]);

function collectMixedStructuralActionClasses(preview: unknown): string[] {
  if (!preview) return [];
  const design = unwrapMaybeNested(preview, "mixedWavePreviewDesign");
  if (!isRecord(design)) return [];
  const previews = Array.isArray((design as any)?.wavePreviews) ? (design as any).wavePreviews : [];
  const out: string[] = [];
  for (const w of previews) {
    if (!isRecord(w)) continue;
    const classes = Array.isArray((w as any)?.structuralActionClasses) ? (w as any).structuralActionClasses : [];
    for (const c of classes) {
      const v = String(c ?? "").trim();
      if (v) out.push(v);
    }
  }
  return out;
}

function hasGuidedExecutionPosture(semiStrategicController: unknown): boolean {
  const ctrl = unwrapMaybeNested(semiStrategicController, "semiStrategicExecutionController");
  if (!isRecord(ctrl)) return false;
  const raw = String((ctrl as any)?.executionPosture ?? "").trim();
  const posture = raw as SemiStrategicExecutionPosture;
  return posture === "guided-execution" || posture === "full-execution-ready";
}

function resolveStructuralAutonomyConfidence(input: {
  structuralAutoAllowed: boolean;
  mixedAutoAllowed: boolean;
  mixedWavePreviewDesign?: unknown;
  semiStrategicExecutionController?: unknown;
}): ExecutionLearningSignalsV1["autonomySignals"]["structuralAutonomyConfidence"] {
  if (input.structuralAutoAllowed === false && input.mixedAutoAllowed === false) return "locked";

  const classes = collectMixedStructuralActionClasses(input.mixedWavePreviewDesign);
  const postureOk = hasGuidedExecutionPosture(input.semiStrategicExecutionController);

  if (classes.length > 0 && postureOk) {
    const onlyEarly = classes.every((c) => EARLY_STRUCTURAL_CLASS_SET.has(c));
    if (onlyEarly) return "future-phase-1";
    return "future-phase-2";
  }

  return "locked";
}

function labelForScore(score: number): ExecutionLearningSignalsV1["learningHealthLabel"] {
  if (score >= 75) return "strong";
  if (score >= 40) return "watch";
  return "fragile";
}

function summaryForLabel(label: ExecutionLearningSignalsV1["learningHealthLabel"]): string {
  if (label === "strong") {
    return "Execution learning signals indicate a strong foundation for controlled autonomy progression.";
  }
  if (label === "watch") {
    return "Execution learning signals indicate mixed conditions that require monitoring.";
  }
  return "Execution learning signals indicate fragile execution conditions and conservative handling.";
}

export function buildExecutionLearningSignalsV1(input: ExecutionLearningSignalsInputV1): ExecutionLearningSignalsV1 {
  const replayStatus = normalizeReplayStatus(input.executionReplay);
  const schedulerDecision = normalizeSchedulerDecision(input.executionCycleScheduler);
  const schedulerCooldownActive = extractCooldownActive(input.executionCycleScheduler, input.executionMemory);
  const recommendedCycleMode = normalizeRecommendedCycleMode(input.executionCycleScheduler);
  const outcomeMode = normalizeOutcomeMode(input.runtimeLedger);
  const memoryHealthLabel = normalizeMemoryHealthLabel(input.executionMemory) ?? "unstable";
  const consistencyLabel = normalizeConsistencyLabel(input.siteSemanticConsistency) ?? "low";
  const semanticHealthLabel = normalizeSemanticHealthLabel(input.siteSemanticIntelligence) ?? "low";
  const unresolvedRatio = extractUnresolvedRatio(input);

  const autonomyStage = extractAutonomyStage(input);
  const autonomyDecision = extractAutonomyDecision(input, autonomyStage);
  const allowedScopes = extractAllowedScopes(input, autonomyStage);

  const replayDeterminism: ExecutionLearningSignalsV1["stabilitySignals"]["replayDeterminism"] =
    replayStatus === "match" ? "high" : replayStatus === "drift-detected" ? "medium" : "low";

  const schedulerReliability: ExecutionLearningSignalsV1["stabilitySignals"]["schedulerReliability"] =
    schedulerDecision === "cooldown"
      ? "medium"
      : schedulerDecision === "blocked" || schedulerDecision === null
        ? "low"
        : (schedulerDecision === "run-now" || schedulerDecision === "preview-first") && schedulerCooldownActive === false
          ? "high"
          : "medium";

  const replayDriftPresent = replayStatus === "drift-detected";

  const unstableConditions =
    memoryHealthLabel === "unstable" || schedulerDecision === "blocked" || outcomeMode === "blocked";
  const mixedConditions =
    memoryHealthLabel === "monitoring" || replayStatus === "drift-detected" || schedulerDecision === "preview-first";
  const stableConditions =
    memoryHealthLabel === "stable" &&
    (outcomeMode === "preview-only" || outcomeMode === "executed" || outcomeMode === "idempotent-skip") &&
    replayStatus !== "drift-detected";

  const executionStability: ExecutionLearningSignalsV1["stabilitySignals"]["executionStability"] = unstableConditions
    ? "unstable"
    : mixedConditions
      ? "mixed"
      : stableConditions
        ? "stable"
        : "mixed";

  const autonomyProgressionReadiness: ExecutionLearningSignalsV1["autonomySignals"]["autonomyProgressionReadiness"] =
    (autonomyStage === "guided-autonomy" || autonomyStage === "future-autonomy") &&
    memoryHealthLabel === "stable" &&
    consistencyLabel === "high"
      ? "high"
      : (autonomyStage === "pilot-assist" || autonomyStage === "guided-autonomy") && memoryHealthLabel !== "unstable"
        ? "medium"
        : "low";

  const semanticAutonomyConfidence: ExecutionLearningSignalsV1["autonomySignals"]["semanticAutonomyConfidence"] =
    allowedScopes.semanticAutoAllowed === true && semanticHealthLabel === "high" && replayStatus === "match"
      ? "high"
      : (autonomyDecision === "pilot-allowed" || autonomyDecision === "approval-required") &&
          (semanticHealthLabel === "medium" || semanticHealthLabel === "high")
        ? "medium"
        : "low";

  const structuralAutonomyConfidence = resolveStructuralAutonomyConfidence({
    structuralAutoAllowed: allowedScopes.structuralAutoAllowed,
    mixedAutoAllowed: allowedScopes.mixedAutoAllowed,
    mixedWavePreviewDesign: input.mixedWavePreviewDesign,
    semiStrategicExecutionController: input.semiStrategicExecutionController,
  });

  const pacingPressure: ExecutionLearningSignalsV1["pacingSignals"]["pacingPressure"] =
    schedulerDecision === "cooldown" ||
    schedulerCooldownActive === true ||
    replayStatus === "drift-detected"
      ? "high"
      : schedulerDecision === "preview-first" || autonomyDecision === "pilot-allowed"
        ? "medium"
        : "low";

  const cooldownPressure = schedulerCooldownActive === true;

  const controllerExecutionDecision = extractControllerExecutionDecision(input);
  const previewDependency =
    recommendedCycleMode === "preview" ||
    outcomeMode === "preview-only" ||
    controllerExecutionDecision === "pilot-only" ||
    controllerExecutionDecision === "approval-required";

  const executionDriftRisk: ExecutionLearningSignalsV1["driftSignals"]["executionDriftRisk"] =
    replayStatus === "invalid-ledger" || replayStatus === "unreplayable" || consistencyLabel === "low"
      ? "high"
      : replayStatus === "drift-detected" || unresolvedRatio > 0.25
        ? "medium"
        : "low";

  const consistencyDriftPressure = consistencyLabel !== "high";

  const safeToTightenAutonomy =
    memoryHealthLabel === "stable" &&
    replayStatus === "match" &&
    schedulerDecision !== "blocked" &&
    (autonomyDecision === "pilot-allowed" || autonomyDecision === "autonomy-allowed") &&
    consistencyLabel === "high";

  const safeToExpandPilotScope =
    (controllerExecutionDecision === "pilot-only" ||
      controllerExecutionDecision === "approval-required" ||
      controllerExecutionDecision === "execution-allowed") &&
    memoryHealthLabel !== "unstable" &&
    replayStatus !== "invalid-ledger" &&
    (schedulerDecision === "run-now" || schedulerDecision === "preview-first") &&
    unresolvedRatio <= 0.25;

  const shouldStayConservative =
    memoryHealthLabel === "unstable" ||
    replayDriftPresent ||
    schedulerDecision === "blocked" ||
    consistencyLabel === "low" ||
    unresolvedRatio > 0.25;

  let learningHealthScore = 100;
  if (executionStability === "mixed") learningHealthScore -= 15;
  if (executionStability === "unstable") learningHealthScore -= 30;
  if (replayDeterminism === "medium") learningHealthScore -= 10;
  if (replayDeterminism === "low") learningHealthScore -= 25;
  if (schedulerReliability === "medium") learningHealthScore -= 10;
  if (schedulerReliability === "low") learningHealthScore -= 20;
  if (pacingPressure === "high") learningHealthScore -= 15;
  if (executionDriftRisk === "high") learningHealthScore -= 20;
  if (consistencyDriftPressure === true) learningHealthScore -= 10;
  if (shouldStayConservative === true) learningHealthScore -= 10;

  if (safeToTightenAutonomy === true) learningHealthScore += 10;
  if (safeToExpandPilotScope === true) learningHealthScore += 5;

  learningHealthScore = clamp0to100(learningHealthScore);
  const learningHealthLabel = labelForScore(learningHealthScore);

  const notes: string[] = [];
  addUniqueLimited(notes, "Execution learning signals v1 are observational and do not alter runtime behavior.", 6);
  if (replayDeterminism === "high") addUniqueLimited(notes, "Replay determinism is currently high.", 6);
  if (replayDriftPresent || replayDeterminism === "medium") addUniqueLimited(notes, "Replay drift is reducing learning reliability.", 6);
  if (cooldownPressure) addUniqueLimited(notes, "Scheduler cooldown is contributing to pacing pressure.", 6);
  if (previewDependency) addUniqueLimited(notes, "Preview dependency remains high.", 6);
  if (memoryHealthLabel === "unstable") addUniqueLimited(notes, "Execution memory indicates unstable recent cycles.", 6);
  if (shouldStayConservative) addUniqueLimited(notes, "Autonomy expansion should remain conservative.", 6);
  if (safeToExpandPilotScope) addUniqueLimited(notes, "Pilot scope may expand safely under current signals.", 6);

  return {
    signalsVersion: "v1",

    stabilitySignals: {
      executionStability,
      replayDeterminism,
      schedulerReliability,
    },

    autonomySignals: {
      autonomyProgressionReadiness,
      semanticAutonomyConfidence,
      structuralAutonomyConfidence,
    },

    pacingSignals: {
      pacingPressure,
      cooldownPressure,
      previewDependency,
    },

    driftSignals: {
      replayDriftPresent,
      executionDriftRisk,
      consistencyDriftPressure,
    },

    learningSignals: {
      safeToTightenAutonomy,
      safeToExpandPilotScope,
      shouldStayConservative,
    },

    learningHealthScore,
    learningHealthLabel,

    summary: summaryForLabel(learningHealthLabel),
    notes: notes.slice(0, 6),
  };
}

