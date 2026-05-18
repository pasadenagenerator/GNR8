import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { ProviderExecutionGateReport } from "@/gnr8/runtime/dns/provider-execution-gate";
import type {
  RuntimeDomainExecutionAction,
  RuntimeDomainExecutionActionKind,
} from "@/gnr8/runtime/domains/runtime-domain-execution-intent";
import type {
  RuntimeDomainExecutionDryRun,
  RuntimeDomainExecutionDryRunAction,
} from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import type {
  RuntimeProviderJob,
  RuntimeProviderJobEnvironment,
  RuntimeProviderJobOperationKind,
  RuntimeProviderJobStatus,
} from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";

type RuntimeProviderPlannerAction = {
  action: RuntimeDomainExecutionAction | RuntimeDomainExecutionDryRunAction;
  actionMode: "manual_instruction" | "provider_api_future" | "blocked";
};

type CreateRuntimeProviderJobInput = {
  siteId: string;
  siteVersionId?: string;
  providerId: string;
  environment: RuntimeProviderJobEnvironment;
  status: RuntimeProviderJobStatus;
  operationKind: RuntimeProviderJobOperationKind;
  intentPayload: Record<string, unknown>;
  dryRunPayload?: Record<string, unknown>;
  resultPayload?: Record<string, unknown>;
  errorPayload?: Record<string, unknown>;
  correlationSeed: string;
  createdAt: string;
  updatedAt: string;
  orderIndex: number;
};

function normalizeToken(value: string | null | undefined, fallback: string): string {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function sortPlannerActions(values: readonly RuntimeProviderPlannerAction[]): RuntimeProviderPlannerAction[] {
  return [...values].sort((a, b) => {
    if (a.actionMode !== b.actionMode) return a.actionMode.localeCompare(b.actionMode);
    if (a.action.kind !== b.action.kind) return a.action.kind.localeCompare(b.action.kind);
    if ((a.action.reason ?? "") !== (b.action.reason ?? "")) return (a.action.reason ?? "").localeCompare(b.action.reason ?? "");
    if ((a.action.domain ?? "") !== (b.action.domain ?? "")) return (a.action.domain ?? "").localeCompare(b.action.domain ?? "");
    if ((a.action.host ?? "") !== (b.action.host ?? "")) return (a.action.host ?? "").localeCompare(b.action.host ?? "");
    if ((a.action.name ?? "") !== (b.action.name ?? "")) return (a.action.name ?? "").localeCompare(b.action.name ?? "");
    if ((a.action.type ?? "") !== (b.action.type ?? "")) return (a.action.type ?? "").localeCompare(b.action.type ?? "");
    if ((a.action.value ?? "") !== (b.action.value ?? "")) return (a.action.value ?? "").localeCompare(b.action.value ?? "");
    if ((a.action.manualStep ?? "") !== (b.action.manualStep ?? "")) return (a.action.manualStep ?? "").localeCompare(b.action.manualStep ?? "");
    return (a.action.ttlSeconds ?? 0) - (b.action.ttlSeconds ?? 0);
  });
}

function toOperationKind(kind: RuntimeDomainExecutionActionKind): RuntimeProviderJobOperationKind {
  return kind;
}

function toIntentPayload(action: RuntimeDomainExecutionAction | RuntimeDomainExecutionDryRunAction): Record<string, unknown> {
  return {
    kind: action.kind,
    reason: action.reason,
    domain: action.domain,
    host: action.host,
    name: action.name,
    type: action.type,
    value: action.value,
    ttlSeconds: action.ttlSeconds,
    manualStep: action.manualStep,
  };
}

function gateAllowsSandboxQueue(gateReport: ProviderExecutionGateReport): boolean {
  return gateReport.gateStatus === "open_for_sandbox_dry_run" && gateReport.requestedEnvironment === "sandbox";
}

export function createRuntimeProviderJobCorrelationKey(input: {
  siteId: string;
  siteVersionId?: string;
  providerId: string;
  environment: RuntimeProviderJobEnvironment;
  operationKind: RuntimeProviderJobOperationKind;
  status: RuntimeProviderJobStatus;
  actionMode: string;
  correlationSeed: string;
  orderIndex: number;
}): string {
  return createRuntimeCorrelationKey({
    siteId: normalizeToken(input.siteId, "unknown_site"),
    siteVersionId: normalizeToken(input.siteVersionId, ""),
    providerId: normalizeToken(input.providerId, "manual"),
    environment: input.environment,
    operationKind: input.operationKind,
    status: input.status,
    actionMode: normalizeToken(input.actionMode, "unknown_action_mode"),
    correlationSeed: normalizeToken(input.correlationSeed, "unknown_seed"),
    orderIndex: String(input.orderIndex),
  });
}

export function createRuntimeProviderJob(input: CreateRuntimeProviderJobInput): RuntimeProviderJob {
  const correlationKey = createRuntimeProviderJobCorrelationKey({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    providerId: input.providerId,
    environment: input.environment,
    operationKind: input.operationKind,
    status: input.status,
    actionMode: "planner",
    correlationSeed: input.correlationSeed,
    orderIndex: input.orderIndex,
  });

  return {
    id: `provider_job_${correlationKey.slice(0, 24)}`,
    siteId: normalizeToken(input.siteId, "unknown_site"),
    siteVersionId: input.siteVersionId ? normalizeToken(input.siteVersionId, "unknown_site_version") : undefined,
    providerId: normalizeToken(input.providerId, "manual"),
    environment: input.environment,
    operationKind: input.operationKind,
    status: input.status,
    intentPayload: input.intentPayload,
    dryRunPayload: input.dryRunPayload,
    resultPayload: input.resultPayload,
    errorPayload: input.errorPayload,
    correlationKey,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function createRuntimeProviderJobPlan(input: {
  dryRun: RuntimeDomainExecutionDryRun;
  executionGate: ProviderExecutionGateReport;
  environment: RuntimeProviderJobEnvironment;
  siteVersionId?: string;
  nowIso?: string;
}): RuntimeProviderJob[] {
  const timestamp = normalizeToken(input.nowIso, "1970-01-01T00:00:00.000Z");
  const siteId = normalizeToken(input.dryRun.siteId, "unknown_site");
  const providerId = normalizeToken(input.dryRun.providerId, "manual");

  const queuedManualActions: RuntimeProviderPlannerAction[] = input.dryRun.dryRunActions
    .filter((action) => action.actionMode === "manual_instruction")
    .map((action) => ({ action, actionMode: "manual_instruction" }));

  const queuedSandboxActions: RuntimeProviderPlannerAction[] =
    input.environment === "sandbox" && gateAllowsSandboxQueue(input.executionGate)
      ? input.dryRun.dryRunActions
          .filter((action) => action.actionMode === "provider_api_future")
          .map((action) => ({ action, actionMode: "provider_api_future" }))
      : [];

  const blockedFutureActions: RuntimeProviderPlannerAction[] =
    input.environment === "live"
      ? input.dryRun.dryRunActions
          .filter((action) => action.actionMode === "provider_api_future")
          .map((action) => ({ action, actionMode: "provider_api_future" }))
      : [];

  const blockedDryRunActions: RuntimeProviderPlannerAction[] = input.dryRun.blockedActions.map((action) => ({
    action,
    actionMode: "blocked",
  }));

  const queued = sortPlannerActions([...queuedManualActions, ...queuedSandboxActions]);
  const blocked = sortPlannerActions([...blockedFutureActions, ...blockedDryRunActions]);
  const ordered = [...queued, ...blocked];
  const correlationSeed = createRuntimeCorrelationKey({
    dryRunCorrelationKey: input.dryRun.correlationKey,
    gateCorrelationKey: input.executionGate.correlationKey,
    environment: input.environment,
    siteVersionId: normalizeToken(input.siteVersionId, ""),
  });

  return ordered.map((entry, index) => {
    const status: RuntimeProviderJobStatus = index < queued.length ? "queued" : "blocked";
    return createRuntimeProviderJob({
      siteId,
      siteVersionId: input.siteVersionId,
      providerId,
      environment: input.environment,
      status,
      operationKind: toOperationKind(entry.action.kind),
      intentPayload: toIntentPayload(entry.action),
      dryRunPayload:
        "actionMode" in entry.action
          ? ({ actionMode: entry.action.actionMode, dryRunStatus: input.dryRun.dryRunStatus } as Record<string, unknown>)
          : ({ actionMode: entry.actionMode, dryRunStatus: input.dryRun.dryRunStatus } as Record<string, unknown>),
      correlationSeed,
      createdAt: timestamp,
      updatedAt: timestamp,
      orderIndex: index,
    });
  });
}
