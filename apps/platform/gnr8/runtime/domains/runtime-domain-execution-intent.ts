import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeDnsReadinessPlannedRecord, RuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
import type { RuntimeDomainProviderSelection } from "@/gnr8/runtime/dns/domain-provider-selection";
import type { RuntimeDomainLifecycleAction, RuntimeDomainLifecyclePlan } from "@/gnr8/runtime/domains/runtime-domain-lifecycle";

export type RuntimeDomainExecutionActionKind =
  | "check_domain_availability"
  | "purchase_domain"
  | "create_dns_zone"
  | "upsert_dns_record"
  | "verify_dns_record"
  | "activate_domain_binding"
  | "manual_instruction";

export type RuntimeDomainExecutionAction = {
  kind: RuntimeDomainExecutionActionKind;
  reason: string;
  domain?: string;
  host?: string;
  name?: string;
  type?: string;
  value?: string;
  ttlSeconds?: number;
  manualStep?: string;
};

export type RuntimeDomainExecutionIntent = {
  siteId: string;
  providerId: string;
  executionMode: "manual" | "provider_api_future";
  executableActions: RuntimeDomainExecutionAction[];
  blockedActions: RuntimeDomainExecutionAction[];
  manualActions: RuntimeDomainExecutionAction[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeToken(value: string | null | undefined, fallback: string): string {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function mapLifecycleAction(action: RuntimeDomainLifecycleAction): RuntimeDomainExecutionAction[] {
  if (action === "check_domain_availability") return [{ kind: "check_domain_availability", reason: "lifecycle_recommended" }];
  if (action === "purchase_domain") return [{ kind: "purchase_domain", reason: "lifecycle_recommended" }];
  if (action === "configure_dns_records") return [{ kind: "create_dns_zone", reason: "lifecycle_recommended" }];
  if (action === "wait_for_dns_propagation" || action === "verify_domain_ownership") {
    return [{ kind: "verify_dns_record", reason: "lifecycle_recommended" }];
  }
  if (action === "attach_domain_binding" || action === "monitor_domain_activation") {
    return [{ kind: "activate_domain_binding", reason: "lifecycle_recommended" }];
  }
  return [];
}

function fromRecord(record: RuntimeDnsReadinessPlannedRecord): RuntimeDomainExecutionAction {
  return {
    kind: "upsert_dns_record",
    reason: `dns_planned_record:${record.intent}`,
    domain: record.domain,
    host: record.host,
    name: record.name,
    type: record.type,
    value: record.value,
    ttlSeconds: record.ttlSeconds,
  };
}

function sortActions(actions: RuntimeDomainExecutionAction[]): RuntimeDomainExecutionAction[] {
  return actions.sort((a, b) => {
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

export function createRuntimeDomainExecutionIntent(input: {
  lifecyclePlan: RuntimeDomainLifecyclePlan;
  dnsReadinessPlan: RuntimeDnsReadinessPlan;
  providerSelection: RuntimeDomainProviderSelection;
}): RuntimeDomainExecutionIntent {
  const siteId = normalizeToken(input.dnsReadinessPlan.siteId, "unknown_site");
  const providerId = normalizeToken(input.providerSelection.selectedProviderId, "manual");
  const executionMode = providerId === "manual" ? "manual" : "provider_api_future";

  const lifecycleActions = input.lifecyclePlan.nextRecommendedActions.flatMap(mapLifecycleAction);
  const dnsUpserts = input.dnsReadinessPlan.plannedRecords.map(fromRecord);
  const manualInstructions = input.dnsReadinessPlan.requiredManualSteps.map((step) => ({
    kind: "manual_instruction" as const,
    reason: "dns_manual_step",
    manualStep: step,
  }));

  const stagedActions = sortActions([...lifecycleActions, ...dnsUpserts, ...manualInstructions]);
  const blockers = uniqueSorted([...input.lifecyclePlan.blockers, ...input.providerSelection.blockers]);
  const warnings = uniqueSorted([...input.lifecyclePlan.warnings, ...input.dnsReadinessPlan.warnings, ...input.providerSelection.warnings]);

  let executableActions: RuntimeDomainExecutionAction[] = [];
  let blockedActions: RuntimeDomainExecutionAction[] = [];
  let manualActions: RuntimeDomainExecutionAction[] = [];

  if (executionMode === "manual") {
    manualActions = stagedActions;
  } else if (blockers.length > 0) {
    blockedActions = stagedActions.filter((action) => action.kind !== "manual_instruction");
    manualActions = stagedActions.filter((action) => action.kind === "manual_instruction");
  } else {
    executableActions = stagedActions.filter((action) => action.kind !== "manual_instruction");
    manualActions = stagedActions.filter((action) => action.kind === "manual_instruction");
  }

  const intent: RuntimeDomainExecutionIntent = {
    siteId,
    providerId,
    executionMode,
    executableActions: sortActions(executableActions),
    blockedActions: sortActions(blockedActions),
    manualActions: sortActions(manualActions),
    warnings,
    blockers,
    correlationKey: "",
  };

  intent.correlationKey = createRuntimeCorrelationKey({
    siteId: intent.siteId,
    providerId: intent.providerId,
    executionMode: intent.executionMode,
    executableActions: JSON.stringify(intent.executableActions),
    blockedActions: JSON.stringify(intent.blockedActions),
    manualActions: JSON.stringify(intent.manualActions),
    warnings: intent.warnings.join(","),
    blockers: intent.blockers.join(","),
    lifecycleCorrelationKey: input.lifecyclePlan.correlationKey,
    dnsCorrelationKey: input.dnsReadinessPlan.correlationKey,
    providerSelectionCorrelationKey: input.providerSelection.correlationKey,
  });

  return intent;
}
