import {
  DNS_PROVIDER_CAPABILITIES,
  createDnsCorrelationKey,
  type DnsProviderId,
} from "@/gnr8/runtime/dns/dns-provider-types";
import type { RuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
import type { RuntimeDomainLifecyclePlan } from "@/gnr8/runtime/domains/runtime-domain-lifecycle";

export type RuntimeDomainProviderSelectionStatus = "selected" | "manual_required" | "blocked";

export type RuntimeDomainProviderCandidate = {
  providerId: DnsProviderId;
  compatible: boolean;
  reasons: string[];
};

export type RuntimeDomainProviderSelection = {
  selectedProviderId: DnsProviderId;
  selectionStatus: RuntimeDomainProviderSelectionStatus;
  providerCandidates: RuntimeDomainProviderCandidate[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

type RequiredCapabilityFlags = {
  requiresTxtVerification: boolean;
  requiresHostRedirect: boolean;
  requiresApexAliasOrFlattenedCname: boolean;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function requiredCapabilitiesFromDnsPlan(plan: RuntimeDnsReadinessPlan): RequiredCapabilityFlags {
  const intents = new Set(plan.plannedRecords.map((record) => record.intent));
  return {
    requiresTxtVerification: intents.has("verification_txt"),
    requiresHostRedirect: intents.has("redirect_host"),
    requiresApexAliasOrFlattenedCname: intents.has("custom_apex_domain"),
  };
}

function evaluateProviderCompatibility(input: {
  providerId: DnsProviderId;
  requiredFlags: RequiredCapabilityFlags;
}): RuntimeDomainProviderCandidate {
  const capability = DNS_PROVIDER_CAPABILITIES[input.providerId];
  const reasons: string[] = [];
  let compatible = true;

  if (input.requiredFlags.requiresTxtVerification && !capability.supportsTxtVerification) {
    compatible = false;
    reasons.push("missing_txt_verification_support");
  }
  if (input.requiredFlags.requiresHostRedirect && !capability.supportsHostRedirect) {
    compatible = false;
    reasons.push("missing_host_redirect_support");
  }
  if (input.requiredFlags.requiresApexAliasOrFlattenedCname && !capability.supportsApexAlias && !capability.supportsFlattenedCname) {
    compatible = false;
    reasons.push("missing_apex_alias_or_flattened_cname_support");
  }

  return {
    providerId: input.providerId,
    compatible,
    reasons: uniqueSorted(reasons),
  };
}

export function selectRuntimeDomainProvider(input: {
  lifecyclePlan: RuntimeDomainLifecyclePlan;
  dnsReadinessPlan: RuntimeDnsReadinessPlan;
  preferredProviderId?: DnsProviderId | null;
  allowedProviderIds?: readonly DnsProviderId[] | null;
}): RuntimeDomainProviderSelection {
  const blockers = uniqueSorted(input.lifecyclePlan.blockers);
  const warnings = uniqueSorted([...input.lifecyclePlan.warnings, ...input.dnsReadinessPlan.warnings]);
  const preferredProviderId = input.preferredProviderId ?? undefined;

  const allowedSet = input.allowedProviderIds ? new Set(input.allowedProviderIds) : null;
  const providerIds = uniqueSorted(
    (Object.keys(DNS_PROVIDER_CAPABILITIES) as DnsProviderId[]).filter(
      (providerId) => providerId === "manual" || !allowedSet || allowedSet.has(providerId),
    ),
  ) as DnsProviderId[];

  const requiredFlags = requiredCapabilitiesFromDnsPlan(input.dnsReadinessPlan);
  const providerCandidates = providerIds
    .map((providerId) => evaluateProviderCompatibility({ providerId, requiredFlags }))
    .sort((a, b) => a.providerId.localeCompare(b.providerId));

  if (blockers.length > 0) {
    const correlationKey = createDnsCorrelationKey({
      lifecycleCorrelationKey: input.lifecyclePlan.correlationKey,
      dnsCorrelationKey: input.dnsReadinessPlan.correlationKey,
      preferredProviderId: preferredProviderId ?? null,
      allowedProviderIds: providerIds,
      selectedProviderId: "manual",
      selectionStatus: "blocked",
      providerCandidates,
      warnings,
      blockers,
    });
    return {
      selectedProviderId: "manual",
      selectionStatus: "blocked",
      providerCandidates,
      warnings,
      blockers,
      correlationKey,
    };
  }

  const preferredCandidate = preferredProviderId
    ? providerCandidates.find((candidate) => candidate.providerId === preferredProviderId)
    : undefined;

  const selectionWarnings = [...warnings];
  let selectedProviderId: DnsProviderId | null = null;

  if (preferredCandidate?.compatible) {
    selectedProviderId = preferredCandidate.providerId;
  } else {
    if (preferredProviderId && preferredCandidate && !preferredCandidate.compatible) {
      selectionWarnings.push(`preferred_provider_incompatible:${preferredProviderId}`);
    }
    if (preferredProviderId && !preferredCandidate) {
      selectionWarnings.push(`preferred_provider_not_allowed_or_unknown:${preferredProviderId}`);
    }
    const compatibleAutomated = providerCandidates.filter((candidate) => candidate.compatible && candidate.providerId !== "manual");
    selectedProviderId = compatibleAutomated[0]?.providerId ?? null;
  }

  if (!selectedProviderId) {
    selectedProviderId = "manual";
    selectionWarnings.push("no_compatible_provider_available_falling_back_to_manual");
  }

  const selectionStatus: RuntimeDomainProviderSelectionStatus =
    selectedProviderId === "manual" && preferredProviderId !== "manual" ? "manual_required" : "selected";

  const finalWarnings = uniqueSorted(selectionWarnings);
  const correlationKey = createDnsCorrelationKey({
    lifecycleCorrelationKey: input.lifecyclePlan.correlationKey,
    dnsCorrelationKey: input.dnsReadinessPlan.correlationKey,
    preferredProviderId: preferredProviderId ?? null,
    allowedProviderIds: providerIds,
    selectedProviderId,
    selectionStatus,
    providerCandidates,
    warnings: finalWarnings,
    blockers: [],
  });

  return {
    selectedProviderId,
    selectionStatus,
    providerCandidates,
    warnings: finalWarnings,
    blockers: [],
    correlationKey,
  };
}
