import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeDomainExecutionAction, RuntimeDomainExecutionIntent } from "@/gnr8/runtime/domains/runtime-domain-execution-intent";

export type RuntimeDomainExecutionDryRunActionMode = "manual_instruction" | "provider_api_future";

export type RuntimeDomainExecutionDryRunAction = RuntimeDomainExecutionAction & {
  actionMode: RuntimeDomainExecutionDryRunActionMode;
};

export type RuntimeDomainExecutionDryRunStatus = "ready" | "ready_with_warnings" | "blocked";

export type RuntimeDomainExecutionDryRun = {
  siteId: string;
  providerId: string;
  executionMode: RuntimeDomainExecutionIntent["executionMode"];
  dryRunActions: RuntimeDomainExecutionDryRunAction[];
  skippedActions: RuntimeDomainExecutionDryRunAction[];
  blockedActions: RuntimeDomainExecutionAction[];
  warnings: string[];
  blockers: string[];
  dryRunStatus: RuntimeDomainExecutionDryRunStatus;
  correlationKey: string;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sortActions<T extends RuntimeDomainExecutionAction>(actions: readonly T[]): T[] {
  return [...actions].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if ((a.reason ?? "") !== (b.reason ?? "")) return (a.reason ?? "").localeCompare(b.reason ?? "");
    if ((a.domain ?? "") !== (b.domain ?? "")) return (a.domain ?? "").localeCompare(b.domain ?? "");
    if ((a.host ?? "") !== (b.host ?? "")) return (a.host ?? "").localeCompare(b.host ?? "");
    if ((a.name ?? "") !== (b.name ?? "")) return (a.name ?? "").localeCompare(b.name ?? "");
    if ((a.type ?? "") !== (b.type ?? "")) return (a.type ?? "").localeCompare(b.type ?? "");
    if ((a.value ?? "") !== (b.value ?? "")) return (a.value ?? "").localeCompare(b.value ?? "");
    if ((a.manualStep ?? "") !== (b.manualStep ?? "")) return (a.manualStep ?? "").localeCompare(b.manualStep ?? "");
    return (a.ttlSeconds ?? 0) - (b.ttlSeconds ?? 0);
  });
}

function sortDryRunActions(actions: readonly RuntimeDomainExecutionDryRunAction[]): RuntimeDomainExecutionDryRunAction[] {
  return [...actions].sort((a, b) => {
    if (a.actionMode !== b.actionMode) return a.actionMode.localeCompare(b.actionMode);
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if ((a.reason ?? "") !== (b.reason ?? "")) return (a.reason ?? "").localeCompare(b.reason ?? "");
    if ((a.domain ?? "") !== (b.domain ?? "")) return (a.domain ?? "").localeCompare(b.domain ?? "");
    if ((a.host ?? "") !== (b.host ?? "")) return (a.host ?? "").localeCompare(b.host ?? "");
    if ((a.name ?? "") !== (b.name ?? "")) return (a.name ?? "").localeCompare(b.name ?? "");
    if ((a.type ?? "") !== (b.type ?? "")) return (a.type ?? "").localeCompare(b.type ?? "");
    if ((a.value ?? "") !== (b.value ?? "")) return (a.value ?? "").localeCompare(b.value ?? "");
    if ((a.manualStep ?? "") !== (b.manualStep ?? "")) return (a.manualStep ?? "").localeCompare(b.manualStep ?? "");
    return (a.ttlSeconds ?? 0) - (b.ttlSeconds ?? 0);
  });
}

export function createRuntimeDomainExecutionDryRun(intent: RuntimeDomainExecutionIntent): RuntimeDomainExecutionDryRun {
  const manualDryRunActions = intent.manualActions.map((action) => ({
    ...action,
    actionMode: "manual_instruction" as const,
  }));
  const providerFutureActions = intent.executableActions.map((action) => ({
    ...action,
    actionMode: "provider_api_future" as const,
  }));
  const dryRunActions = sortDryRunActions([...manualDryRunActions, ...providerFutureActions]);
  const blockedActions = sortActions(intent.blockedActions);
  const blockers = uniqueSorted(intent.blockers);

  const dryRunStatus: RuntimeDomainExecutionDryRunStatus =
    blockers.length > 0
      ? "blocked"
      : providerFutureActions.length > 0
        ? "ready"
        : manualDryRunActions.length > 0
          ? "ready_with_warnings"
          : "ready";

  const warnings = uniqueSorted([
    ...intent.warnings,
    ...(manualDryRunActions.length > 0 && providerFutureActions.length === 0 ? ["manual_execution_required"] : []),
  ]);

  const result: RuntimeDomainExecutionDryRun = {
    siteId: intent.siteId,
    providerId: intent.providerId,
    executionMode: intent.executionMode,
    dryRunActions,
    skippedActions: [],
    blockedActions,
    warnings,
    blockers,
    dryRunStatus,
    correlationKey: "",
  };

  result.correlationKey = createRuntimeCorrelationKey({
    intentCorrelationKey: intent.correlationKey,
    siteId: result.siteId,
    providerId: result.providerId,
    executionMode: result.executionMode,
    dryRunStatus: result.dryRunStatus,
    dryRunActions: JSON.stringify(result.dryRunActions),
    skippedActions: JSON.stringify(result.skippedActions),
    blockedActions: JSON.stringify(result.blockedActions),
    warnings: result.warnings.join(","),
    blockers: result.blockers.join(","),
  });

  return result;
}
