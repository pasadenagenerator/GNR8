import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { AutonomousExecutionRuntime, AutonomousExecutionRuntimeLoopOutputV1 } from "@/gnr8/ai/autonomous-execution-runtime-loop";
import type { AutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import type { ExecutionReplayResultV1 } from "@/gnr8/ai/execution-replay-engine";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";

export type ExecutionCycleSchedulingDecision = "run-now" | "preview-first" | "cooldown" | "blocked";

export type ExecutionCycleRecommendedMode = "none" | "preview" | "apply";

export type ExecutionCycleSchedulerV1 = {
  schedulingDecision: ExecutionCycleSchedulingDecision;
  schedulingConfidence: number;
  cooldownActive: boolean;

  nextAllowedAt: string | null;
  cooldownReason: string | null;

  recommendedCycleMode: ExecutionCycleRecommendedMode;
  recommendedWaveId: string | null;

  schedulerSignals: string[];
  schedulerConstraints: string[];
  schedulerRisks: string[];
  recommendedNextSteps: string[];

  summary: string;
  notes: string[];
};

export type ExecutionCycleSchedulerInputV1 = {
  waveId?: string;

  unresolvedRatio: number;

  autonomousExecutionRuntime: AutonomousExecutionRuntime;
  runtimeLedger: AutonomousExecutionRuntimeLedgerV1;

  strategicExecutionRuntimeDecision: StrategicExecutionRuntimeDecision;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  strategicWaveExecutionController: StrategicWaveExecutionController;

  lastRuntimeLedger?: AutonomousExecutionRuntimeLedgerV1;
  lastReplay?: ExecutionReplayResultV1;
};

function clamp0to100(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function parseIsoTimestamp(timestamp: string | null | undefined): number | null {
  const raw = String(timestamp ?? "").trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

function addMinutesToIso(timestampIso: string, minutes: number): string | null {
  const ms = parseIsoTimestamp(timestampIso);
  if (ms === null) return null;
  const next = ms + Math.round(minutes) * 60_000;
  return new Date(next).toISOString();
}

function summarizeDecision(input: { schedulingDecision: ExecutionCycleSchedulingDecision; cooldownActive: boolean; recommendedCycleMode: ExecutionCycleRecommendedMode }): string {
  if (input.schedulingDecision === "blocked") {
    return "Execution scheduling is blocked under the current runtime and governance conditions.";
  }
  if (input.schedulingDecision === "cooldown" || input.cooldownActive) {
    return "Execution scheduling is paused until the current cooldown period ends.";
  }
  if (input.schedulingDecision === "preview-first" || input.recommendedCycleMode === "preview") {
    return "Execution scheduling should remain in preview mode before the next apply cycle.";
  }
  return "Execution may be scheduled now under the current runtime conditions.";
}

function deriveRecommendedWaveId(input: {
  requestWaveId?: string;
  autonomousExecutionRuntime: AutonomousExecutionRuntime;
  strategicExecutionRuntimeDecision: StrategicExecutionRuntimeDecision;
}): string | null {
  const requestWaveId = typeof input.requestWaveId === "string" ? String(input.requestWaveId).trim() : "";
  if (requestWaveId) return requestWaveId;

  const runtimeWaveId = String(input.autonomousExecutionRuntime?.waveId ?? "").trim();
  if (runtimeWaveId) return runtimeWaveId;

  const candidateKeys = ["recommendedWaveId", "selectedWaveId", "waveId"] as const;
  for (const key of candidateKeys) {
    const v = String((input.strategicExecutionRuntimeDecision as any)?.[key] ?? "").trim();
    if (v) return v;
  }

  return null;
}

function computeCooldown(input: {
  lastRuntimeLedger?: AutonomousExecutionRuntimeLedgerV1;
  currentRuntimeLedger: AutonomousExecutionRuntimeLedgerV1;
  autonomousExecutionRuntime: AutonomousExecutionRuntime;
  replayStatus?: ExecutionReplayResultV1["replayStatus"];
}): {
  cooldownTriggered: boolean;
  cooldownMinutes: number;
  cooldownReason: string | null;
  nextAllowedAt: string | null;
  cooldownNotes: string[];
} {
  const triggers: Array<{ kind: "executed" | "idempotent-skip" | "drift-detected"; minutes: number }> = [];

  const lastOutcomeMode = input.lastRuntimeLedger?.outcome?.mode ?? null;
  if (lastOutcomeMode === "executed") triggers.push({ kind: "executed", minutes: 15 });
  if (lastOutcomeMode === "idempotent-skip") triggers.push({ kind: "idempotent-skip", minutes: 5 });

  const currentMode = input.autonomousExecutionRuntime?.mode ?? null;
  if (currentMode === "executed") triggers.push({ kind: "executed", minutes: 15 });

  if (input.replayStatus === "drift-detected") triggers.push({ kind: "drift-detected", minutes: 20 });

  if (triggers.length === 0) {
    return { cooldownTriggered: false, cooldownMinutes: 0, cooldownReason: null, nextAllowedAt: null, cooldownNotes: [] };
  }

  let selected = triggers[0]!;
  for (const t of triggers) {
    if (t.minutes > selected.minutes) selected = t;
  }

  const cooldownReason =
    selected.kind === "drift-detected"
      ? "Replay drift requires cooldown before another cycle."
      : selected.kind === "executed"
        ? "A recent executed cycle requires cooldown before the next run."
        : "A recent idempotent skip requires a short cooldown.";

  const cooldownNotes: string[] = [];

  const preferredTimestamp = input.lastRuntimeLedger?.timestamp ?? input.currentRuntimeLedger?.timestamp ?? null;
  const preferredMs = parseIsoTimestamp(preferredTimestamp);
  const nextAllowedAt = preferredTimestamp ? addMinutesToIso(preferredTimestamp, selected.minutes) : null;

  if (!preferredTimestamp || preferredMs === null || nextAllowedAt === null) {
    addUniqueLimited(cooldownNotes, "Cooldown derived without a valid source timestamp; nextAllowedAt is unavailable.", 2);
  } else {
    addUniqueLimited(cooldownNotes, "Cooldown derived from the most recent observable runtime timestamp.", 2);
  }

  return {
    cooldownTriggered: true,
    cooldownMinutes: selected.minutes,
    cooldownReason,
    nextAllowedAt,
    cooldownNotes,
  };
}

function computeSchedulingConfidence(input: {
  schedulingDecision: ExecutionCycleSchedulingDecision;
  cooldownActive: boolean;
  strategicExecutionRuntimeDecision: StrategicExecutionRuntimeDecision;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  strategicWaveExecutionController: StrategicWaveExecutionController;
  lastReplay?: ExecutionReplayResultV1;
}): number {
  let score = typeof input.strategicExecutionRuntimeDecision?.confidence === "number" ? input.strategicExecutionRuntimeDecision.confidence : 50;

  if (input.schedulingDecision === "blocked") score -= 15;
  if (input.schedulingDecision === "preview-first") score -= 10;
  if (input.cooldownActive) score -= 10;

  const replayStatus = input.lastReplay?.replayStatus ?? null;
  if (replayStatus === "drift-detected") score -= 15;
  if (replayStatus === "invalid-ledger") score -= 20;

  const autonomyDecision = input.autonomousExecutionPolicy?.autonomyDecision ?? "blocked";
  if (autonomyDecision === "autonomy-allowed") score += 10;
  if (autonomyDecision === "pilot-allowed") score += 5;

  if ((input.strategicWaveExecutionController?.executionDecision ?? "blocked") === "execution-allowed") score += 5;

  return clamp0to100(score);
}

function computeDecision(input: {
  unresolvedRatio: number;
  strategicExecutionRuntimeDecision: StrategicExecutionRuntimeDecision;
  autonomousExecutionRuntime: AutonomousExecutionRuntime;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  strategicWaveExecutionController: StrategicWaveExecutionController;
  lastReplay?: ExecutionReplayResultV1;
  lastRuntimeLedger?: AutonomousExecutionRuntimeLedgerV1;
  runtimeLedger: AutonomousExecutionRuntimeLedgerV1;
}): {
  schedulingDecision: ExecutionCycleSchedulingDecision;
  cooldownActive: boolean;
  nextAllowedAt: string | null;
  cooldownReason: string | null;
} {
  const executionDecision = input.strategicExecutionRuntimeDecision?.executionDecision ?? "blocked";
  const runtimeMode = input.autonomousExecutionRuntime?.mode ?? "blocked";
  const autonomyDecision = input.autonomousExecutionPolicy?.autonomyDecision ?? "blocked";
  const controllerDecision = input.strategicWaveExecutionController?.executionDecision ?? "blocked";
  const replayStatus = input.lastReplay?.replayStatus ?? null;

  const blocked =
    executionDecision === "blocked" ||
    runtimeMode === "blocked" ||
    autonomyDecision === "blocked" ||
    replayStatus === "invalid-ledger" ||
    (typeof input.unresolvedRatio === "number" && input.unresolvedRatio > 0.5);

  if (blocked) {
    return { schedulingDecision: "blocked", cooldownActive: false, nextAllowedAt: null, cooldownReason: null };
  }

  const cooldown = computeCooldown({
    lastRuntimeLedger: input.lastRuntimeLedger,
    currentRuntimeLedger: input.runtimeLedger,
    autonomousExecutionRuntime: input.autonomousExecutionRuntime,
    replayStatus: replayStatus ?? undefined,
  });

  if (cooldown.cooldownTriggered) {
    return {
      schedulingDecision: "cooldown",
      cooldownActive: true,
      nextAllowedAt: cooldown.nextAllowedAt,
      cooldownReason: cooldown.cooldownReason,
    };
  }

  const previewFirst =
    executionDecision === "preview-only" ||
    runtimeMode === "preview-only" ||
    autonomyDecision === "approval-required" ||
    autonomyDecision === "pilot-allowed" ||
    controllerDecision === "pilot-only" ||
    replayStatus === "unreplayable";

  if (previewFirst) {
    return { schedulingDecision: "preview-first", cooldownActive: false, nextAllowedAt: null, cooldownReason: null };
  }

  const executionCapableDecision =
    executionDecision === "semantic-execution" || executionDecision === "structural-execution" || executionDecision === "mixed-execution";

  const routingExecutionCapable = input.strategicExecutionRuntimeDecision?.selectedExecutor !== null;

  const runtimeModeOk = runtimeMode === "executed" || routingExecutionCapable;

  const autonomyOk = autonomyDecision === "autonomy-allowed";

  const canRunNow = executionCapableDecision && runtimeModeOk && autonomyOk && controllerDecision !== "blocked";

  if (canRunNow) {
    return { schedulingDecision: "run-now", cooldownActive: false, nextAllowedAt: null, cooldownReason: null };
  }

  return { schedulingDecision: "preview-first", cooldownActive: false, nextAllowedAt: null, cooldownReason: null };
}

export function buildExecutionCycleSchedulerV1(input: ExecutionCycleSchedulerInputV1): {
  executionCycleScheduler: ExecutionCycleSchedulerV1;
} {
  const replayStatus = input.lastReplay?.replayStatus ?? null;
  const controllerDecision = input.strategicWaveExecutionController?.executionDecision ?? "blocked";
  const autonomyDecision = input.autonomousExecutionPolicy?.autonomyDecision ?? "blocked";
  const unresolvedRatio = typeof input.unresolvedRatio === "number" ? input.unresolvedRatio : 0;

  const decision = computeDecision({
    unresolvedRatio,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
    autonomousExecutionRuntime: input.autonomousExecutionRuntime,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    strategicWaveExecutionController: input.strategicWaveExecutionController,
    lastReplay: input.lastReplay,
    lastRuntimeLedger: input.lastRuntimeLedger,
    runtimeLedger: input.runtimeLedger,
  });

  const recommendedWaveId = deriveRecommendedWaveId({
    requestWaveId: input.waveId,
    autonomousExecutionRuntime: input.autonomousExecutionRuntime,
    strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
  });

  const recommendedCycleMode: ExecutionCycleRecommendedMode =
    decision.schedulingDecision === "run-now" ? "apply" : decision.schedulingDecision === "preview-first" ? "preview" : "none";

  const signals: string[] = [];
  const constraints: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];

  const executionDecision = input.strategicExecutionRuntimeDecision?.executionDecision ?? "blocked";

  if (decision.schedulingDecision === "run-now") {
    addUniqueLimited(signals, "Execution is currently permitted by runtime governance.", 6);
  }
  if (autonomyDecision === "autonomy-allowed" || autonomyDecision === "pilot-allowed") {
    addUniqueLimited(signals, "Autonomy policy allows a new cycle.", 6);
  }
  if (recommendedWaveId) {
    addUniqueLimited(signals, "A wave is available for the next cycle.", 6);
  }
  if (!decision.cooldownActive) {
    addUniqueLimited(signals, "No cooldown is active.", 6);
  }
  if (replayStatus === "match") {
    addUniqueLimited(signals, "Replay did not detect drift.", 6);
  }

  if (executionDecision === "blocked" || input.autonomousExecutionRuntime?.mode === "blocked" || autonomyDecision === "blocked") {
    addUniqueLimited(constraints, "Execution is blocked by current runtime governance.", 6);
  }
  if (decision.cooldownActive) {
    addUniqueLimited(constraints, "Cooldown must complete before the next cycle.", 6);
  }
  if (decision.schedulingDecision === "preview-first") {
    addUniqueLimited(constraints, "Preview is required before apply mode.", 6);
  }
  if (autonomyDecision === "approval-required" || autonomyDecision === "blocked") {
    addUniqueLimited(constraints, "Autonomy policy does not allow apply mode.", 6);
  }
  if (unresolvedRatio > 0.5) {
    addUniqueLimited(constraints, "Too many unresolved pages limit scheduling.", 6);
  }

  if (replayStatus === "drift-detected") {
    addUniqueLimited(risks, "Replay drift reduces confidence in immediate scheduling.", 6);
  }
  if (decision.cooldownActive && (input.lastRuntimeLedger?.outcome?.mode ?? null) === "executed") {
    addUniqueLimited(risks, "Recent execution increases short-term rollout risk.", 6);
  }
  if ((input.lastRuntimeLedger?.outcome?.mode ?? null) === "idempotent-skip") {
    addUniqueLimited(risks, "Idempotent repeat attempts should be paced.", 6);
  }
  if (controllerDecision === "pilot-only") {
    addUniqueLimited(risks, "Pilot-only posture limits broader execution.", 6);
  }
  if (autonomyDecision === "approval-required") {
    addUniqueLimited(risks, "Execution remains constrained by approval requirements.", 6);
  }

  if (decision.schedulingDecision === "cooldown") {
    addUniqueLimited(nextSteps, "Wait for cooldown before the next cycle.", 6);
  }
  if (decision.schedulingDecision === "preview-first") {
    addUniqueLimited(nextSteps, "Run preview before scheduling apply mode.", 6);
  }
  if (replayStatus === "drift-detected" || replayStatus === "unreplayable") {
    addUniqueLimited(nextSteps, "Replay the last cycle before attempting execution again.", 6);
  }
  if (unresolvedRatio > 0.5) {
    addUniqueLimited(nextSteps, "Resolve unresolved pages before the next cycle.", 6);
  }
  if (controllerDecision === "pilot-only") {
    addUniqueLimited(nextSteps, "Proceed with a pilot-scoped cycle only.", 6);
  }

  const cooldownDetails = computeCooldown({
    lastRuntimeLedger: input.lastRuntimeLedger,
    currentRuntimeLedger: input.runtimeLedger,
    autonomousExecutionRuntime: input.autonomousExecutionRuntime,
    replayStatus: replayStatus ?? undefined,
  });

  const notes: string[] = [];
  addUniqueLimited(notes, "Execution cycle scheduler only; no runtime cycle was executed.", 5);
  if (input.lastRuntimeLedger) addUniqueLimited(notes, "lastRuntimeLedger was provided.", 5);
  if (input.lastReplay) addUniqueLimited(notes, "executionReplay was provided.", 5);
  for (const n of cooldownDetails.cooldownNotes) addUniqueLimited(notes, n, 5);
  addUniqueLimited(notes, "Scheduling remains request-scoped only; no persistence is used.", 5);

  const executionCycleScheduler: ExecutionCycleSchedulerV1 = {
    schedulingDecision: decision.schedulingDecision,
    schedulingConfidence: computeSchedulingConfidence({
      schedulingDecision: decision.schedulingDecision,
      cooldownActive: decision.cooldownActive,
      strategicExecutionRuntimeDecision: input.strategicExecutionRuntimeDecision,
      autonomousExecutionPolicy: input.autonomousExecutionPolicy,
      strategicWaveExecutionController: input.strategicWaveExecutionController,
      lastReplay: input.lastReplay,
    }),
    cooldownActive: decision.cooldownActive,

    nextAllowedAt: decision.nextAllowedAt,
    cooldownReason: decision.cooldownActive ? decision.cooldownReason : null,

    recommendedCycleMode:
      decision.schedulingDecision === "blocked" ? "none" : (recommendedCycleMode satisfies ExecutionCycleRecommendedMode),
    recommendedWaveId,

    schedulerSignals: signals.slice(0, 6),
    schedulerConstraints: constraints.slice(0, 6),
    schedulerRisks: risks.slice(0, 6),
    recommendedNextSteps: nextSteps.slice(0, 6),

    summary: summarizeDecision({
      schedulingDecision: decision.schedulingDecision,
      cooldownActive: decision.cooldownActive,
      recommendedCycleMode,
    }),
    notes: notes.slice(0, 5),
  };

  return { executionCycleScheduler };
}

export type ExecutionCycleSchedulerEndpointOutputV1 = {
  executionCycleScheduler: ExecutionCycleSchedulerV1;
};

export function buildExecutionCycleSchedulerEndpointOutputV1(input: ExecutionCycleSchedulerInputV1): ExecutionCycleSchedulerEndpointOutputV1 {
  const { executionCycleScheduler } = buildExecutionCycleSchedulerV1(input);
  return { executionCycleScheduler };
}

export type ExecutionCycleSchedulerDependenciesV1 = Pick<
  AutonomousExecutionRuntimeLoopOutputV1,
  "autonomousExecutionRuntime" | "runtimeLedger" | "strategicExecutionRuntimeDecision"
> & {
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  strategicWaveExecutionController: StrategicWaveExecutionController;
  unresolvedRatio: number;
};
