import type { AutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import type { ExecutionReplayResultV1 } from "@/gnr8/ai/execution-replay-engine";
import type { ExecutionCycleSchedulerV1 } from "@/gnr8/ai/execution-cycle-scheduler";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";

export type ExecutionMemoryV1 = {
  memoryVersion: "v1";

  recentExecutionSummary: {
    lastMode: "blocked" | "preview-only" | "idempotent-skip" | "executed" | null;
    lastExecutor: "semantic" | "structural" | "mixed" | null;
    lastWaveId: string | null;
    lastConfidence: number | null;
    lastRiskLevel: "low" | "medium" | "high" | null;
  };

  stabilitySignals: {
    idempotentSkipsRecent: boolean;
    driftDetectedRecent: boolean;
    cooldownActive: boolean;
    executionSuccessTrend: "improving" | "stable" | "degrading" | "unknown";
  };

  autonomyProgressSignals: {
    autonomyStage: string | null;
    readinessLabel: string | null;
    orchestrationMode: string | null;
    strategicMaturity: "early" | "mid" | "advanced" | null;
  };

  executionPressureSignals: {
    unresolvedRatioHigh: boolean;
    semanticWeaknessClustersHigh: boolean;
    consistencyLow: boolean;
    automationCandidatePresent: boolean;
  };

  memoryHealthScore: number;
  memoryHealthLabel: "stable" | "monitoring" | "unstable";

  summary: string;
  notes: string[];
};

type ExecutionMemoryInputV1 = {
  runtimeLedger?: AutonomousExecutionRuntimeLedgerV1 | Record<string, unknown> | null;
  executionReplay?: ExecutionReplayResultV1 | Record<string, unknown> | null;
  scheduler?: ExecutionCycleSchedulerV1 | Record<string, unknown> | null;
  unresolvedRatio: number;
  siteSemanticIntelligence?: SiteSemanticIntelligence | null;
  siteSemanticConsistency?: SiteSemanticConsistency | null;
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

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function normalizeMaybeUnknown(value: unknown): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  if (v === "unknown") return null;
  return v;
}

function normalizeMode(value: unknown): ExecutionMemoryV1["recentExecutionSummary"]["lastMode"] {
  switch (value) {
    case "blocked":
    case "preview-only":
    case "idempotent-skip":
    case "executed":
      return value;
    default:
      return null;
  }
}

function normalizeRiskLevel(value: unknown): ExecutionMemoryV1["recentExecutionSummary"]["lastRiskLevel"] {
  switch (value) {
    case "low":
    case "medium":
    case "high":
      return value;
    default:
      return null;
  }
}

function normalizeExecutor(value: unknown): ExecutionMemoryV1["recentExecutionSummary"]["lastExecutor"] {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.includes("mixed")) return "mixed";
  if (raw.includes("structural")) return "structural";
  if (raw.includes("semantic")) return "semantic";
  return null;
}

function extractReplayStatus(replay: unknown): string | null {
  if (!replay) return null;
  if (!isRecord(replay)) return null;

  const statusDirect = typeof replay.status === "string" ? String(replay.status) : null;
  if (statusDirect) return statusDirect;

  const replayStatusDirect = typeof replay.replayStatus === "string" ? String(replay.replayStatus) : null;
  if (replayStatusDirect) return replayStatusDirect;

  const nested = replay.executionReplay;
  if (isRecord(nested) && typeof nested.replayStatus === "string") return String(nested.replayStatus);

  return null;
}

function extractCooldownActive(scheduler: unknown): boolean {
  if (!scheduler) return false;
  if (!isRecord(scheduler)) return false;

  if (typeof scheduler.recommendedAction === "string") {
    return String(scheduler.recommendedAction).trim() === "cooldown";
  }

  if (typeof scheduler.cooldownActive === "boolean") return scheduler.cooldownActive === true;
  if (typeof scheduler.schedulingDecision === "string") return String(scheduler.schedulingDecision).trim() === "cooldown";

  const nested = scheduler.executionCycleScheduler;
  if (!isRecord(nested)) return false;

  if (typeof nested.cooldownActive === "boolean") return nested.cooldownActive === true;
  if (typeof nested.schedulingDecision === "string") return String(nested.schedulingDecision).trim() === "cooldown";

  return false;
}

function labelForScore(score: number): ExecutionMemoryV1["memoryHealthLabel"] {
  if (score >= 75) return "stable";
  if (score >= 40) return "monitoring";
  return "unstable";
}

function summaryForLabel(label: ExecutionMemoryV1["memoryHealthLabel"]): string {
  if (label === "unstable") return "Execution memory indicates instability and requires monitoring.";
  if (label === "monitoring") return "Execution memory shows mixed stability signals.";
  return "Execution memory indicates stable execution conditions.";
}

function deriveStrategicMaturity(semanticHealthScore: number | null): ExecutionMemoryV1["autonomyProgressSignals"]["strategicMaturity"] {
  if (semanticHealthScore === null) return null;
  if (semanticHealthScore >= 75) return "advanced";
  if (semanticHealthScore >= 40) return "mid";
  return "early";
}

function deriveExecutionSuccessTrend(input: {
  lastMode: ExecutionMemoryV1["recentExecutionSummary"]["lastMode"];
  driftDetectedRecent: boolean;
}): ExecutionMemoryV1["stabilitySignals"]["executionSuccessTrend"] {
  if (input.driftDetectedRecent) return "degrading";
  if (input.lastMode === "executed") return "improving";
  if (input.lastMode === "preview-only") return "stable";
  return "unknown";
}

export function buildExecutionMemoryV1(input: ExecutionMemoryInputV1): ExecutionMemoryV1 {
  const runtimeLedger = input.runtimeLedger ?? null;
  const siteSemanticIntelligence = input.siteSemanticIntelligence ?? null;
  const siteSemanticConsistency = input.siteSemanticConsistency ?? null;

  const lastMode = normalizeMode((runtimeLedger as any)?.outcome?.mode);
  const lastExecutor = normalizeExecutor((runtimeLedger as any)?.routing?.selectedExecutor);
  const lastWaveId = normalizeMaybeUnknown((runtimeLedger as any)?.snapshot?.waveId);

  const lastConfidenceRaw = (runtimeLedger as any)?.routing?.confidence;
  const lastConfidence =
    typeof lastConfidenceRaw === "number" && Number.isFinite(lastConfidenceRaw) ? clamp0to100(lastConfidenceRaw) : null;

  const lastRiskLevel = normalizeRiskLevel((runtimeLedger as any)?.routing?.riskLevel);

  const driftStatus = extractReplayStatus(input.executionReplay);
  const driftDetectedRecent = driftStatus === "drift-detected";

  const idempotentSkipsRecent = lastMode === "idempotent-skip";
  const cooldownActive = extractCooldownActive(input.scheduler);

  const executionSuccessTrend = deriveExecutionSuccessTrend({ lastMode, driftDetectedRecent });

  const readinessLabel = normalizeMaybeUnknown(siteSemanticIntelligence?.semanticAutomationReadiness?.label);
  const consistencyLabel = normalizeMaybeUnknown(siteSemanticConsistency?.consistencyLabel);

  const semanticHealthScoreRaw = siteSemanticIntelligence?.semanticHealthScore;
  const semanticHealthScore =
    typeof semanticHealthScoreRaw === "number" && Number.isFinite(semanticHealthScoreRaw)
      ? clamp0to100(semanticHealthScoreRaw)
      : null;

  const semanticWeaknessClusters = Array.isArray(siteSemanticIntelligence?.semanticWeaknessClusters)
    ? siteSemanticIntelligence!.semanticWeaknessClusters
    : [];

  const unresolvedRatio = typeof input.unresolvedRatio === "number" && Number.isFinite(input.unresolvedRatio) ? input.unresolvedRatio : 0;

  const unresolvedRatioHigh = unresolvedRatio > 0.25;
  const semanticWeaknessClustersHigh = semanticWeaknessClusters.length >= 2;
  const consistencyLow = consistencyLabel === "low";
  const automationCandidatePresent = readinessLabel === "automation-candidate";

  let memoryHealthScore = 100;
  if (driftDetectedRecent) memoryHealthScore -= 25;
  if (idempotentSkipsRecent) memoryHealthScore -= 10;
  if (cooldownActive) memoryHealthScore -= 10;
  if (unresolvedRatioHigh) memoryHealthScore -= 15;
  if (consistencyLow) memoryHealthScore -= 15;
  if (semanticWeaknessClustersHigh) memoryHealthScore -= 10;
  if (executionSuccessTrend === "improving") memoryHealthScore += 5;

  memoryHealthScore = clamp0to100(memoryHealthScore);
  const memoryHealthLabel = labelForScore(memoryHealthScore);

  const notes: string[] = [];
  addUniqueLimited(notes, "Execution memory v1 is observational and does not alter execution behavior.", 5);
  if (idempotentSkipsRecent) addUniqueLimited(notes, "Recent idempotent execution attempts detected.", 5);
  if (driftDetectedRecent) addUniqueLimited(notes, "Execution replay drift detected.", 5);
  if (cooldownActive) addUniqueLimited(notes, "Scheduler cooldown currently active.", 5);
  if (unresolvedRatioHigh) addUniqueLimited(notes, "High unresolved page ratio impacting execution.", 5);
  if (consistencyLow) addUniqueLimited(notes, "Low semantic consistency affecting stability.", 5);
  if (executionSuccessTrend === "improving") addUniqueLimited(notes, "Execution memory reflects improving execution outcomes.", 5);

  return {
    memoryVersion: "v1",

    recentExecutionSummary: {
      lastMode,
      lastExecutor,
      lastWaveId,
      lastConfidence,
      lastRiskLevel,
    },

    stabilitySignals: {
      idempotentSkipsRecent,
      driftDetectedRecent,
      cooldownActive,
      executionSuccessTrend,
    },

    autonomyProgressSignals: {
      autonomyStage: normalizeMaybeUnknown((runtimeLedger as any)?.snapshot?.autonomyStage),
      readinessLabel,
      orchestrationMode: normalizeMaybeUnknown((runtimeLedger as any)?.snapshot?.orchestrationMode),
      strategicMaturity: deriveStrategicMaturity(semanticHealthScore),
    },

    executionPressureSignals: {
      unresolvedRatioHigh,
      semanticWeaknessClustersHigh,
      consistencyLow,
      automationCandidatePresent,
    },

    memoryHealthScore,
    memoryHealthLabel,

    summary: summaryForLabel(memoryHealthLabel),
    notes: notes.slice(0, 5),
  };
}
