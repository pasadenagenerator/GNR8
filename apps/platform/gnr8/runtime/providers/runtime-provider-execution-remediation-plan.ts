import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionPreconditionsLedger } from "@/gnr8/runtime/providers/runtime-provider-execution-preconditions-ledger";

export type RuntimeProviderExecutionRemediationPlan = {
  planId: string;
  handoffId: string;
  executionAllowed: false;
  executionBlocked: true;
  intentOnly: true;
  overallStatus: "blocked" | "missing_requirements" | "ready_but_execution_disabled";
  summary: string;
  actions: {
    actionId: string;
    priority: "critical" | "high" | "normal";
    source: "ledger" | "gate" | "handoff";
    reason: string;
    recommendedAction: string;
  }[];
  diagnostics: string[];
  createdAt: string;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function buildSummary(actionCount: number): string {
  if (actionCount === 0) return "All evidence conditions satisfied; execution remains intentionally disabled.";
  return `Execution remains blocked because ${actionCount} remediation actions are still unresolved.`;
}

function dedupeActions(
  actions: RuntimeProviderExecutionRemediationPlan["actions"],
): RuntimeProviderExecutionRemediationPlan["actions"] {
  const map = new Map<string, RuntimeProviderExecutionRemediationPlan["actions"][number]>();
  for (const action of actions) {
    const key = `${action.source}:${action.reason}:${action.recommendedAction}`;
    if (!map.has(key)) map.set(key, action);
  }
  return [...map.values()];
}

export function createRuntimeProviderExecutionRemediationPlan(input: {
  handoffId?: string;
  executionPreconditionsLedger: RuntimeProviderExecutionPreconditionsLedger | null;
  createdAt?: string;
}): RuntimeProviderExecutionRemediationPlan {
  const ledger = input.executionPreconditionsLedger;
  const handoffId = sanitizeToken(input.handoffId) || sanitizeToken(ledger?.handoffId) || "missing_handoff_id";
  const createdAt = sanitizeToken(input.createdAt) || new Date(0).toISOString();

  const rawActions: RuntimeProviderExecutionRemediationPlan["actions"] = [];

  if (ledger?.requirements.some((requirement) => requirement.requirementId === "approval_status_not_blocked" && requirement.status === "blocked")) {
    rawActions.push({
      actionId: "approval_status_blocked",
      priority: "critical",
      source: "ledger",
      reason: "Approval status is blocked.",
      recommendedAction: "Review approval workflow before execution eligibility can be evaluated.",
    });
  }

  if (ledger?.requirements.some((requirement) => requirement.requirementId === "execution_planned_jobs_present" && requirement.status !== "satisfied")) {
    rawActions.push({
      actionId: "missing_planned_jobs",
      priority: "high",
      source: "ledger",
      reason: "No planned jobs are present.",
      recommendedAction: "Create deterministic planned jobs before execution readiness evaluation.",
    });
  }

  if (ledger?.requirements.some((requirement) => requirement.requirementId === "execution_handoff_status_not_blocked" && requirement.status === "blocked")) {
    rawActions.push({
      actionId: "handoff_status_blocked",
      priority: "critical",
      source: "handoff",
      reason: "Handoff status is blocked.",
      recommendedAction: "Resolve handoff blockers and regenerate readiness evidence.",
    });
  }

  if (ledger?.requirements.some((requirement) => requirement.requirementId === "safety_global_execution_boundary_active")) {
    rawActions.push({
      actionId: "global_execution_boundary_active",
      priority: "normal",
      source: "gate",
      reason: "Global execution boundary is active.",
      recommendedAction: "Execution boundary intentionally active. No action required.",
    });
  }

  const actions = dedupeActions(rawActions).map((action, index) => ({
    ...action,
    actionId: `${action.actionId}_${index + 1}`,
  }));

  const overallStatus: RuntimeProviderExecutionRemediationPlan["overallStatus"] =
    actions.some((action) => action.priority === "critical")
      ? "blocked"
      : actions.some((action) => action.priority === "high")
        ? "missing_requirements"
        : "ready_but_execution_disabled";

  const correlationKey = createRuntimeCorrelationKey({
    handoffId,
    overallStatus,
    actionCount: String(actions.length),
    createdAt,
  });

  return {
    planId: createRuntimeCorrelationKey({ executionRemediationPlanCorrelationKey: correlationKey }),
    handoffId,
    executionAllowed: false,
    executionBlocked: true,
    intentOnly: true,
    overallStatus,
    summary: buildSummary(actions.length),
    actions,
    diagnostics: uniqueSorted([
      "EXECUTION_REMEDIATION_PLAN_CREATED",
      "EXECUTION_REMEDIATION_ACTIONS_GENERATED",
      "EXECUTION_REMEDIATION_INTENT_ONLY",
    ]),
    createdAt,
  };
}
