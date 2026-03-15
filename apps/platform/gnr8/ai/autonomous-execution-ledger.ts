import type { AutonomousRuntimeOutcome, RuntimeExecutionFingerprint } from "@/gnr8/ai/autonomous-execution-runtime-guards";

export type AutonomousExecutionRuntimeLedgerV1 = {
  ledgerVersion: "v1";
  cycleId: string;
  timestamp: string;

  input: {
    apply: boolean;
    waveId: string | null;
    resolvedPages: number;
    unresolvedPages: string[];
  };

  routing: {
    runtimeDecision: "blocked" | "preview-only" | "semantic-execution" | "structural-execution" | "mixed-execution";
    selectedExecutor: "semantic-wave-executor" | "structural-wave-executor" | "mixed-wave-executor" | null;
    executionMode: "none" | "preview" | "pilot" | "guided" | "full";
  };

  guards: {
    eligible: boolean;
    executionPath: "semantic" | "structural" | "mixed" | "none";
    guardReason: string | null;
  };

  fingerprint: {
    current: RuntimeExecutionFingerprint | null;
    previous: RuntimeExecutionFingerprint | null;
    matched: boolean;
  };

  snapshot: {
    waveId: string | null;
    orchestrationMode: string;
    autonomyStage: string;
    executionScope: string;
  };

  attempt: {
    attempted: boolean;
    idempotentSkip: boolean;
    eligible: boolean;
    executionPath: string;
    reasoning: string[];
  };

  outcome: {
    mode: "blocked" | "preview-only" | "idempotent-skip" | "executed";
    applied: boolean;
    resultKind: "blocked" | "preview" | "semantic-wave-execution" | "structural-wave-execution" | "mixed-wave-execution";
  };

  summary: string;
  notes: string[];
};

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hex8(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

function datePartYYYYMMDD(timestampIso: string): string {
  const d = String(timestampIso ?? "").slice(0, 10);
  return d && d.length === 10 ? d.replaceAll("-", "") : "unknown";
}

function buildCycleIdV1(timestampIso: string, seed: string): string {
  const datePart = datePartYYYYMMDD(timestampIso);
  const suffix = hex8(fnv1a32(`${timestampIso}|${seed}`));
  return `rt_${datePart}_${suffix}`;
}

function summaryForLedger(input: {
  outcomeMode: AutonomousExecutionRuntimeLedgerV1["outcome"]["mode"];
  selectedExecutor: AutonomousExecutionRuntimeLedgerV1["routing"]["selectedExecutor"];
  applied: boolean;
}): string {
  if (input.outcomeMode === "blocked") return "Runtime cycle blocked before execution.";
  if (input.outcomeMode === "preview-only") return "Runtime cycle completed in preview mode.";
  if (input.outcomeMode === "idempotent-skip") return "Runtime cycle skipped execution due to idempotent fingerprint match.";

  if (input.applied && input.selectedExecutor) {
    return `Runtime cycle executed successfully through the selected executor (${input.selectedExecutor}).`;
  }
  return "Runtime cycle executed successfully through the selected executor.";
}

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function notesForLedger(input: {
  applyRequested: boolean;
  waveId: string | null;
  unresolvedPages: string[];
  fingerprintMatched: boolean;
  selectedExecutor: AutonomousExecutionRuntimeLedgerV1["routing"]["selectedExecutor"];
  outcomeMode: AutonomousExecutionRuntimeLedgerV1["outcome"]["mode"];
}): string[] {
  const notes: string[] = [];
  addUniqueLimited(notes, "Runtime ledger v1 records this execution cycle without persistence.", 5);

  if (!input.applyRequested) addUniqueLimited(notes, "apply=false; preview cycle only.", 5);
  if (!input.waveId) addUniqueLimited(notes, "No safe waveId available.", 5);
  if (input.unresolvedPages.length > 0) addUniqueLimited(notes, "Unresolved pages present.", 5);
  if (input.fingerprintMatched) addUniqueLimited(notes, "Idempotent skip occurred.", 5);
  if (input.outcomeMode === "executed" && input.selectedExecutor) {
    addUniqueLimited(notes, `Selected executor path used: ${input.selectedExecutor}.`, 5);
  }

  return notes.slice(0, 5);
}

export function buildAutonomousExecutionRuntimeLedgerV1(input: {
  timestamp: string;
  applyRequested: boolean;
  waveId: string | null;
  resolvedPages: number;
  unresolvedPages: string[];

  runtimeDecision: AutonomousExecutionRuntimeLedgerV1["routing"]["runtimeDecision"];
  selectedExecutor: AutonomousExecutionRuntimeLedgerV1["routing"]["selectedExecutor"];
  executionMode: AutonomousExecutionRuntimeLedgerV1["routing"]["executionMode"];

  guardsEligible: boolean;
  guardsExecutionPath: AutonomousExecutionRuntimeLedgerV1["guards"]["executionPath"];
  guardReason: string | null;

  currentFingerprint: RuntimeExecutionFingerprint | null;
  previousFingerprint: RuntimeExecutionFingerprint | null;
  fingerprintMatched: boolean;

  snapshot: AutonomousExecutionRuntimeLedgerV1["snapshot"];
  attempt: AutonomousExecutionRuntimeLedgerV1["attempt"];

  outcomeMode: AutonomousRuntimeOutcome;
  outcomeApplied: boolean;
  resultKind: AutonomousExecutionRuntimeLedgerV1["outcome"]["resultKind"];
}): AutonomousExecutionRuntimeLedgerV1 {
  const timestamp = String(input.timestamp ?? "").trim() || new Date().toISOString();
  const cycleIdSeed = JSON.stringify({
    apply: input.applyRequested,
    waveId: input.waveId,
    resolvedPages: input.resolvedPages,
    unresolvedPages: input.unresolvedPages,
    runtimeDecision: input.runtimeDecision,
    selectedExecutor: input.selectedExecutor,
    executionMode: input.executionMode,
  });

  const ledger: AutonomousExecutionRuntimeLedgerV1 = {
    ledgerVersion: "v1",
    cycleId: buildCycleIdV1(timestamp, cycleIdSeed),
    timestamp,

    input: {
      apply: input.applyRequested === true,
      waveId: input.waveId ?? null,
      resolvedPages: Number.isFinite(input.resolvedPages) ? input.resolvedPages : 0,
      unresolvedPages: Array.isArray(input.unresolvedPages) ? input.unresolvedPages.map((p) => String(p ?? "")).filter(Boolean) : [],
    },

    routing: {
      runtimeDecision: input.runtimeDecision,
      selectedExecutor: input.selectedExecutor,
      executionMode: input.executionMode,
    },

    guards: {
      eligible: input.guardsEligible === true,
      executionPath: input.guardsExecutionPath,
      guardReason: input.guardReason ? String(input.guardReason) : null,
    },

    fingerprint: {
      current: input.currentFingerprint ?? null,
      previous: input.previousFingerprint ?? null,
      matched: input.fingerprintMatched === true,
    },

    snapshot: {
      waveId: input.snapshot?.waveId ?? null,
      orchestrationMode: String(input.snapshot?.orchestrationMode ?? "unknown"),
      autonomyStage: String(input.snapshot?.autonomyStage ?? "unknown"),
      executionScope: String(input.snapshot?.executionScope ?? "none"),
    },

    attempt: {
      attempted: input.attempt?.attempted === true,
      idempotentSkip: input.attempt?.idempotentSkip === true,
      eligible: input.attempt?.eligible === true,
      executionPath: String(input.attempt?.executionPath ?? "none"),
      reasoning: Array.isArray(input.attempt?.reasoning) ? input.attempt.reasoning.map((r) => String(r ?? "")).filter(Boolean).slice(0, 5) : [],
    },

    outcome: {
      mode: input.outcomeMode,
      applied: input.outcomeApplied === true,
      resultKind: input.resultKind,
    },

    summary: summaryForLedger({
      outcomeMode: input.outcomeMode,
      selectedExecutor: input.selectedExecutor,
      applied: input.outcomeApplied === true,
    }),
    notes: notesForLedger({
      applyRequested: input.applyRequested === true,
      waveId: input.waveId ?? null,
      unresolvedPages: Array.isArray(input.unresolvedPages) ? input.unresolvedPages : [],
      fingerprintMatched: input.fingerprintMatched === true,
      selectedExecutor: input.selectedExecutor,
      outcomeMode: input.outcomeMode,
    }),
  };

  return ledger;
}

