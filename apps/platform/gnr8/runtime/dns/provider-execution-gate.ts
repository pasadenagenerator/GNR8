import { createDnsCorrelationKey } from "@/gnr8/runtime/dns/dns-provider-types";
import type { ProviderCredentialBoundaryReport } from "@/gnr8/runtime/dns/provider-credentials-boundary";
import type { DnsProviderImplementationReadinessReport } from "@/gnr8/runtime/dns/provider-implementation-readiness";
import type {
  RuntimeDomainExecutionDryRun,
  RuntimeDomainExecutionDryRunAction,
} from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import type { RuntimeDomainExecutionActionKind } from "@/gnr8/runtime/domains/runtime-domain-execution-intent";

export type ProviderExecutionGateEnvironment = "contract" | "sandbox" | "live";

export type ProviderExecutionGateStatus = "open_for_mock" | "open_for_sandbox_dry_run" | "blocked";

export type ProviderExecutionGateReport = {
  providerId: string;
  requestedEnvironment: ProviderExecutionGateEnvironment;
  gateStatus: ProviderExecutionGateStatus;
  allowedActionKinds: RuntimeDomainExecutionActionKind[];
  blockedActionKinds: RuntimeDomainExecutionActionKind[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export type ProviderExecutionGateInput = {
  dryRun: RuntimeDomainExecutionDryRun;
  credentialBoundary: ProviderCredentialBoundaryReport;
  providerReadiness: DnsProviderImplementationReadinessReport;
  requestedEnvironment: ProviderExecutionGateEnvironment;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sortActionKinds(values: readonly RuntimeDomainExecutionActionKind[]): RuntimeDomainExecutionActionKind[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function listActionKinds(actions: readonly RuntimeDomainExecutionDryRunAction[]): RuntimeDomainExecutionActionKind[] {
  return sortActionKinds(actions.map((action) => action.kind));
}

function listBlockedActionKinds(input: {
  dryRunActionKinds: readonly RuntimeDomainExecutionActionKind[];
  allowedActionKinds: readonly RuntimeDomainExecutionActionKind[];
  preBlockedActionKinds: readonly RuntimeDomainExecutionActionKind[];
}): RuntimeDomainExecutionActionKind[] {
  const allowed = new Set(input.allowedActionKinds);
  return sortActionKinds([
    ...input.preBlockedActionKinds,
    ...input.dryRunActionKinds.filter((kind) => !allowed.has(kind)),
  ]);
}

function isSandboxReady(input: ProviderExecutionGateInput): boolean {
  return (
    input.providerReadiness.readinessStatus === "ready_for_sandbox" &&
    (input.credentialBoundary.safetyStatus === "safe" || input.credentialBoundary.safetyStatus === "warning") &&
    (input.dryRun.dryRunStatus === "ready" || input.dryRun.dryRunStatus === "ready_with_warnings")
  );
}

export function evaluateProviderExecutionGate(input: ProviderExecutionGateInput): ProviderExecutionGateReport {
  const dryRunActionKinds = listActionKinds(input.dryRun.dryRunActions);
  const preBlockedActionKinds = sortActionKinds(input.dryRun.blockedActions.map((action) => action.kind));

  const warnings = uniqueSorted([
    ...input.dryRun.warnings,
    ...input.credentialBoundary.warnings,
    ...input.providerReadiness.warnings,
  ]);

  const blockers: string[] = uniqueSorted([
    ...input.dryRun.blockers,
    ...input.credentialBoundary.blockers,
    ...input.providerReadiness.blockers,
  ]);

  let gateStatus: ProviderExecutionGateStatus = "blocked";
  let allowedActionKinds: RuntimeDomainExecutionActionKind[] = [];

  if (input.requestedEnvironment === "live") {
    blockers.push("live_execution_blocked_in_current_phase");
  } else if (input.requestedEnvironment === "contract") {
    if (input.dryRun.executionMode === "manual") {
      gateStatus = "open_for_mock";
      allowedActionKinds = listActionKinds(input.dryRun.dryRunActions.filter((action) => action.actionMode === "manual_instruction"));
    } else {
      blockers.push("contract_environment_requires_manual_execution_mode");
    }
  } else {
    const sandboxReady = isSandboxReady(input);
    if (sandboxReady) {
      gateStatus = "open_for_sandbox_dry_run";
      allowedActionKinds = dryRunActionKinds;
    } else {
      blockers.push("sandbox_execution_gate_not_ready");
    }

    const hasProviderApiFutureAction = input.dryRun.dryRunActions.some((action) => action.actionMode === "provider_api_future");
    if (hasProviderApiFutureAction && input.providerReadiness.readinessStatus !== "ready_for_sandbox") {
      blockers.push("provider_api_future_actions_require_sandbox_readiness");
    }
  }

  const resolvedBlockers = uniqueSorted(blockers);
  const resolvedAllowedActionKinds = sortActionKinds(allowedActionKinds);
  const resolvedBlockedActionKinds = listBlockedActionKinds({
    dryRunActionKinds,
    allowedActionKinds: resolvedAllowedActionKinds,
    preBlockedActionKinds,
  });

  const reportWithoutCorrelation = {
    providerId: input.dryRun.providerId,
    requestedEnvironment: input.requestedEnvironment,
    gateStatus,
    allowedActionKinds: resolvedAllowedActionKinds,
    blockedActionKinds: resolvedBlockedActionKinds,
    warnings,
    blockers: resolvedBlockers,
  };

  return {
    ...reportWithoutCorrelation,
    correlationKey: createDnsCorrelationKey(reportWithoutCorrelation),
  };
}
