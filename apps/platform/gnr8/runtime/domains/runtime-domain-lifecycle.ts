import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
import type { RuntimeDomainReadinessReport } from "@/gnr8/runtime/readiness/runtime-domain-readiness";

export type RuntimeDomainLifecycleStage =
  | "requested"
  | "availability_unknown"
  | "availability_checked"
  | "purchase_pending"
  | "purchased"
  | "dns_pending"
  | "dns_configured"
  | "verification_pending"
  | "verified"
  | "active";

export type RuntimeDomainLifecycleIntent =
  | "internal_preview_only"
  | "connect_existing_domain"
  | "purchase_new_domain"
  | "transfer_domain";

export type RuntimeDomainLifecycleAction =
  | "check_domain_availability"
  | "purchase_domain"
  | "initiate_domain_transfer"
  | "configure_dns_records"
  | "wait_for_dns_propagation"
  | "verify_domain_ownership"
  | "attach_domain_binding"
  | "monitor_domain_activation";

export type RuntimeDomainLifecycleStatusReport = {
  hasDomainSignals: boolean;
  hasCustomDomain: boolean;
  hasActiveDomainBinding: boolean;
  hasDnsPlan: boolean;
  hasPendingDnsWork: boolean;
  hasVerifiedSignals: boolean;
};

export type RuntimeDomainLifecyclePlan = {
  intent: RuntimeDomainLifecycleIntent;
  providerId: string;
  currentStage: RuntimeDomainLifecycleStage;
  nextRecommendedActions: RuntimeDomainLifecycleAction[];
  blockers: string[];
  warnings: string[];
  statusReport: RuntimeDomainLifecycleStatusReport;
  correlationKey: string;
};

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => normalizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function hasDomainSignals(report: RuntimeDomainReadinessReport): boolean {
  return Boolean(
    report.primaryHost || report.internalPreviewHost || report.customDomains.length > 0 || normalizeToken(report.canonicalSlug).length > 0,
  );
}

export function createRuntimeDomainLifecyclePlan(input: {
  report: RuntimeDomainReadinessReport;
  dnsPlan?: RuntimeDnsReadinessPlan;
  intent: RuntimeDomainLifecycleIntent;
  providerId: string;
}): RuntimeDomainLifecyclePlan {
  const report = input.report;
  const dnsPlan = input.dnsPlan;

  const domainSignalsPresent = hasDomainSignals(report);
  const hasCustomDomain = report.hasCustomDomain;
  const hasActiveDomainBinding = report.hasActiveDomainBinding;
  const hasVerifiedSignals = hasCustomDomain && hasActiveDomainBinding;
  const hasDnsPlan = Boolean(dnsPlan);

  const dnsPlanBlockers = dnsPlan ? uniqueSorted(dnsPlan.blockers) : [];
  const dnsPlanWarnings = dnsPlan ? uniqueSorted(dnsPlan.warnings) : [];
  const hasPendingDnsWork = Boolean(dnsPlan && (dnsPlan.plannedRecords.length > 0 || dnsPlan.requiredManualSteps.length > 0));

  const blockers = uniqueSorted([...report.blockers, ...dnsPlanBlockers]);
  const warnings = uniqueSorted([...report.warnings, ...dnsPlanWarnings]);
  const actions = new Set<RuntimeDomainLifecycleAction>();

  let currentStage: RuntimeDomainLifecycleStage = "requested";

  if (!domainSignalsPresent) {
    currentStage = "availability_unknown";
    actions.add("check_domain_availability");
  } else if (input.intent === "internal_preview_only") {
    currentStage = report.hasInternalHost ? "active" : "requested";
    if (!report.hasInternalHost) actions.add("attach_domain_binding");
  } else if (input.intent === "purchase_new_domain" && !hasCustomDomain) {
    currentStage = "purchase_pending";
    actions.add("purchase_domain");
    actions.add("check_domain_availability");
  } else if (hasVerifiedSignals) {
    currentStage = "verified";
    actions.add("monitor_domain_activation");
  } else if (hasDnsPlan && hasPendingDnsWork) {
    currentStage = "dns_pending";
    actions.add("configure_dns_records");
    actions.add("wait_for_dns_propagation");
    actions.add("verify_domain_ownership");
  } else if (hasDnsPlan && !hasPendingDnsWork) {
    currentStage = "dns_configured";
    actions.add("verify_domain_ownership");
  } else if (hasCustomDomain && !hasActiveDomainBinding) {
    currentStage = "verification_pending";
    actions.add("attach_domain_binding");
    actions.add("verify_domain_ownership");
  } else if (hasCustomDomain) {
    currentStage = input.intent === "purchase_new_domain" ? "purchased" : "availability_checked";
  }

  if (input.intent === "connect_existing_domain" && !hasCustomDomain) {
    blockers.push("missing_custom_domain_for_connect_existing_domain");
    actions.add("attach_domain_binding");
  }

  if (input.intent === "transfer_domain") {
    actions.add("initiate_domain_transfer");
    if (!hasCustomDomain) blockers.push("missing_custom_domain_for_transfer_domain");
  }

  const nextRecommendedActions = uniqueSorted([...actions]) as RuntimeDomainLifecycleAction[];
  const sortedBlockers = uniqueSorted(blockers);
  const sortedWarnings = uniqueSorted(warnings);

  const statusReport: RuntimeDomainLifecycleStatusReport = {
    hasDomainSignals: domainSignalsPresent,
    hasCustomDomain,
    hasActiveDomainBinding,
    hasDnsPlan,
    hasPendingDnsWork,
    hasVerifiedSignals,
  };

  const correlationKey = createRuntimeCorrelationKey({
    siteId: report.siteId || "unknown_site",
    intent: input.intent,
    providerId: normalizeToken(input.providerId) || "unknown_provider",
    currentStage,
    nextRecommendedActions: nextRecommendedActions.join(","),
    blockers: sortedBlockers.join(","),
    warnings: sortedWarnings.join(","),
    readinessCorrelationKey: report.correlationKey,
    dnsCorrelationKey: dnsPlan?.correlationKey ?? "none",
  });

  return {
    intent: input.intent,
    providerId: normalizeToken(input.providerId) || "unknown_provider",
    currentStage,
    nextRecommendedActions,
    blockers: sortedBlockers,
    warnings: sortedWarnings,
    statusReport,
    correlationKey,
  };
}
