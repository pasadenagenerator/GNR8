import "server-only";

import { computeDomainDnsInstructions } from "@/src/lib/vercel/domain-dns-instructions";
import { checkDomainStatus, type VercelDomainStatus } from "@/src/lib/vercel/vercel-domain-client";
import {
  listDomainHostBindingsForSite,
  updateDomainHostBindingById,
  type RuntimeDomainHostBinding,
  type RuntimeDomainHostBindingStatus,
} from "@/gnr8/runtime/runtime-store";

export type HostingDomainRecheckResult = {
  siteId: string;
  domainId: string;
  hostname: string;
  previousStatus: RuntimeDomainHostBindingStatus;
  newStatus: RuntimeDomainHostBindingStatus;
  diagnostics: string[];
  timestamp: string;
};

export type HostingDomainRecheckDependencies = {
  listDomainHostBindingsForSite: typeof listDomainHostBindingsForSite;
  updateDomainHostBindingById: typeof updateDomainHostBindingById;
  checkDomainStatus: typeof checkDomainStatus;
  now: () => Date;
};

const DEFAULT_DEPS: HostingDomainRecheckDependencies = {
  listDomainHostBindingsForSite,
  updateDomainHostBindingById,
  checkDomainStatus,
  now: () => new Date(),
};

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveNextStatus(input: {
  binding: RuntimeDomainHostBinding;
  vercelStatus: VercelDomainStatus | null;
  verificationPresent: boolean;
  unsupportedWildcard: boolean;
}): RuntimeDomainHostBindingStatus {
  if (input.unsupportedWildcard) return "failed";
  if (input.vercelStatus?.verified === true) return "active";
  if (input.verificationPresent) return "verifying";
  return "failed";
}

export async function recheckHostingDomain(input: {
  siteId: string;
  domainId: string;
  deps?: Partial<HostingDomainRecheckDependencies>;
}): Promise<HostingDomainRecheckResult | null> {
  const deps = { ...DEFAULT_DEPS, ...(input.deps ?? {}) };
  const siteId = token(input.siteId);
  const domainId = token(input.domainId);
  if (!siteId || !domainId) return null;

  const bindings = await deps.listDomainHostBindingsForSite({ siteId });
  const binding = bindings.find((candidate) => candidate.id === domainId);
  if (!binding) return null;

  const checkedAt = deps.now().toISOString();
  const dnsComputation = computeDomainDnsInstructions({ domain: binding.domain });
  const diagnostics = [...dnsComputation.diagnostics];

  if (dnsComputation.unsupportedWildcard) {
    const updated = await deps.updateDomainHostBindingById({
      bindingId: binding.id,
      status: "failed",
      domainType: dnsComputation.domainType,
      dnsInstructions: [],
      lastCheckedAt: checkedAt,
    });

    return {
      siteId,
      domainId,
      hostname: binding.domain,
      previousStatus: binding.status,
      newStatus: updated?.status ?? "failed",
      diagnostics,
      timestamp: checkedAt,
    };
  }

  const vercelStatus = await deps.checkDomainStatus(binding.domain);
  const refreshedDnsComputation = computeDomainDnsInstructions({
    domain: binding.domain,
    vercelStatus,
  });
  const nextStatus = resolveNextStatus({
    binding,
    vercelStatus,
    verificationPresent: Boolean(refreshedDnsComputation.verificationInstruction),
    unsupportedWildcard: refreshedDnsComputation.unsupportedWildcard,
  });

  const updated = await deps.updateDomainHostBindingById({
    bindingId: binding.id,
    status: nextStatus,
    domainType: refreshedDnsComputation.domainType,
    verificationType:
      refreshedDnsComputation.verificationInstruction?.type === "cname" || refreshedDnsComputation.verificationInstruction?.type === "txt"
        ? refreshedDnsComputation.verificationInstruction.type
        : binding.verificationType,
    verificationValue: refreshedDnsComputation.verificationInstruction?.value ?? binding.verificationValue,
    verificationHost: refreshedDnsComputation.verificationInstruction?.host ?? binding.verificationHost,
    dnsRecordType: refreshedDnsComputation.primaryInstruction?.type ?? binding.dnsRecordType,
    dnsRecordHost: refreshedDnsComputation.primaryInstruction?.host ?? binding.dnsRecordHost,
    dnsRecordValue: refreshedDnsComputation.primaryInstruction?.value ?? binding.dnsRecordValue,
    dnsRecordPurpose: refreshedDnsComputation.primaryInstruction?.purpose ?? binding.dnsRecordPurpose,
    dnsInstructions: refreshedDnsComputation.instructions.length > 0 ? refreshedDnsComputation.instructions : binding.dnsInstructions,
    vercelDomainId: vercelStatus.domainId ?? binding.vercelDomainId,
    lastCheckedAt: vercelStatus.lastCheckedAt,
  });

  return {
    siteId,
    domainId,
    hostname: binding.domain,
    previousStatus: binding.status,
    newStatus: updated?.status ?? nextStatus,
    diagnostics: refreshedDnsComputation.diagnostics,
    timestamp: vercelStatus.lastCheckedAt,
  };
}
