import { buildAutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import { buildExecutionCycleSchedulerV1 } from "@/gnr8/ai/execution-cycle-scheduler";

function assert(condition: unknown, label: string) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}

const baseTimestamp = "2026-03-16T00:00:00.000Z";

function baseStrategicDecision(overrides: Partial<any> = {}) {
  return {
    executionDecision: "semantic-execution",
    executionMode: "pilot",
    selectedExecutor: "semantic-wave-executor",
    confidence: 70,
    riskLevel: "medium",
    reasons: [],
    nextActions: [],
    notes: [],
    ...overrides,
  };
}

function basePolicy(overrides: Partial<any> = {}) {
  return {
    autonomyStage: "pilot-assist",
    autonomyDecision: "pilot-allowed",
    allowedScopes: {
      semanticAutoAllowed: false,
      structuralAutoAllowed: false,
      mixedAutoAllowed: false,
      pilotExecutionAllowed: true,
      guidedExecutionAllowed: false,
    },
    policyConstraints: [],
    policySignals: [],
    policyRisks: [],
    recommendedAutonomyProgression: [],
    summary: "",
    notes: [],
    ...overrides,
  };
}

function baseController(overrides: Partial<any> = {}) {
  return {
    executionDecision: "execution-allowed",
    executionConfidence: 80,
    executionRiskLevel: "low",
    recommendedExecutionMode: "pilot",
    blockingReasons: [],
    riskFactors: [],
    safetySignals: [],
    recommendedNextActions: [],
    summary: "",
    notes: [],
    ...overrides,
  };
}

function baseRuntime(overrides: Partial<any> = {}) {
  return {
    mode: "preview-only",
    selectedExecutor: "semantic-wave-executor",
    waveId: "w1",
    runtimeDecision: "semantic-execution",
    executionMode: "pilot",
    applied: false,
    executionAttempt: {
      attempted: false,
      idempotentSkip: false,
      eligible: true,
      executionPath: "semantic",
      reasoning: [],
    },
    executionSnapshot: {
      waveId: "w1",
      orchestrationMode: "guided",
      autonomyStage: "pilot-assist",
      executionScope: "semantic-only",
    },
    result: { kind: "preview", payload: {} },
    summary: "",
    notes: [],
    ...overrides,
  };
}

function baseLedger(outcomeMode: "blocked" | "preview-only" | "idempotent-skip" | "executed", timestamp = baseTimestamp) {
  return buildAutonomousExecutionRuntimeLedgerV1({
    timestamp,
    applyRequested: false,
    waveId: "w1",
    resolvedPages: 1,
    unresolvedPages: [],
    runtimeDecision: outcomeMode === "blocked" ? "blocked" : "semantic-execution",
    selectedExecutor: outcomeMode === "blocked" ? null : "semantic-wave-executor",
    executionMode: outcomeMode === "blocked" ? "none" : "pilot",
    guardsEligible: true,
    guardsExecutionPath: outcomeMode === "blocked" ? "none" : "semantic",
    guardReason: null,
    currentFingerprint: null,
    previousFingerprint: null,
    fingerprintMatched: false,
    snapshot: { waveId: "w1", orchestrationMode: "guided", autonomyStage: "pilot-assist", executionScope: "semantic-only" },
    attempt: { attempted: false, idempotentSkip: false, eligible: true, executionPath: "semantic", reasoning: [] },
    outcomeMode,
    outcomeApplied: false,
    resultKind: outcomeMode === "blocked" ? "blocked" : "preview",
  });
}

// Scenario A — blocked via unresolvedRatio
{
  const { executionCycleScheduler } = buildExecutionCycleSchedulerV1({
    unresolvedRatio: 0.75,
    waveId: "w1",
    autonomousExecutionRuntime: baseRuntime(),
    runtimeLedger: baseLedger("preview-only"),
    strategicExecutionRuntimeDecision: baseStrategicDecision(),
    autonomousExecutionPolicy: basePolicy(),
    strategicWaveExecutionController: baseController(),
  } as any);

  assert(executionCycleScheduler.schedulingDecision === "blocked", "Scenario A: schedulingDecision=blocked");
  assert(executionCycleScheduler.recommendedCycleMode === "none", "Scenario A: recommendedCycleMode=none");
  assert(executionCycleScheduler.nextAllowedAt === null, "Scenario A: nextAllowedAt=null");
}

// Scenario B — cooldown after last executed
{
  const { executionCycleScheduler } = buildExecutionCycleSchedulerV1({
    unresolvedRatio: 0,
    waveId: "w1",
    autonomousExecutionRuntime: baseRuntime(),
    runtimeLedger: baseLedger("preview-only"),
    strategicExecutionRuntimeDecision: baseStrategicDecision(),
    autonomousExecutionPolicy: basePolicy(),
    strategicWaveExecutionController: baseController(),
    lastRuntimeLedger: baseLedger("executed", baseTimestamp),
  } as any);

  assert(executionCycleScheduler.schedulingDecision === "cooldown", "Scenario B: schedulingDecision=cooldown");
  assert(executionCycleScheduler.cooldownActive === true, "Scenario B: cooldownActive=true");
  assert(executionCycleScheduler.nextAllowedAt === "2026-03-16T00:15:00.000Z", "Scenario B: nextAllowedAt=+15m");
}

// Scenario C — preview-first on approval-required
{
  const { executionCycleScheduler } = buildExecutionCycleSchedulerV1({
    unresolvedRatio: 0,
    waveId: "w1",
    autonomousExecutionRuntime: baseRuntime({ mode: "preview-only" }),
    runtimeLedger: baseLedger("preview-only"),
    strategicExecutionRuntimeDecision: baseStrategicDecision({ executionDecision: "preview-only", executionMode: "preview", selectedExecutor: null }),
    autonomousExecutionPolicy: basePolicy({ autonomyDecision: "approval-required", autonomyStage: "guided-autonomy" }),
    strategicWaveExecutionController: baseController({ executionDecision: "approval-required" }),
  } as any);

  assert(executionCycleScheduler.schedulingDecision === "preview-first", "Scenario C: schedulingDecision=preview-first");
  assert(executionCycleScheduler.recommendedCycleMode === "preview", "Scenario C: recommendedCycleMode=preview");
}

// Scenario D — run-now happy path
{
  const { executionCycleScheduler } = buildExecutionCycleSchedulerV1({
    unresolvedRatio: 0,
    waveId: "w1",
    autonomousExecutionRuntime: baseRuntime({ mode: "preview-only" }),
    runtimeLedger: baseLedger("preview-only"),
    strategicExecutionRuntimeDecision: baseStrategicDecision({ executionDecision: "semantic-execution", executionMode: "pilot", selectedExecutor: "semantic-wave-executor" }),
    autonomousExecutionPolicy: basePolicy({ autonomyDecision: "autonomy-allowed", autonomyStage: "future-autonomy" }),
    strategicWaveExecutionController: baseController({ executionDecision: "execution-allowed" }),
  } as any);

  assert(executionCycleScheduler.schedulingDecision === "run-now", "Scenario D: schedulingDecision=run-now");
  assert(executionCycleScheduler.recommendedCycleMode === "apply", "Scenario D: recommendedCycleMode=apply");
}

