import type { RuntimeDomainHostBinding, RuntimeHostBinding } from "@/gnr8/runtime/runtime-store";

export type HostingDomainOperationsDnsInstruction = {
  recordType: string;
  host: string;
  value: string;
  expectedStatus: "verification_required" | "routing_required";
};

export type HostingDomainOperationsDomain = {
  id: string;
  hostname: string;
  status: RuntimeDomainHostBinding["status"];
  source: "runtime_domain_host_binding";
  verificationStatus: "pending" | "verifying" | "verified" | "failed";
  active: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
  verificationReason: string | null;
  dnsInstructions: HostingDomainOperationsDnsInstruction[];
  diagnostics: {
    lastDomainCheck: string | null;
    lastVerificationResult: RuntimeDomainHostBinding["status"];
    verificationDiagnostics: string[];
  };
};

export type HostingDomainOperationsWorkingDomain = {
  id: string;
  hostname: string;
  bindingKind: RuntimeHostBinding["bindingKind"];
  status: RuntimeHostBinding["status"];
  active: boolean;
  source: "runtime_host_binding";
  createdAt: string;
  updatedAt: string;
};

export type HostingDomainOperationsReadModel = {
  workingDomains: HostingDomainOperationsWorkingDomain[];
  customDomains: HostingDomainOperationsDomain[];
  domains: HostingDomainOperationsDomain[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function verificationStatusFor(status: RuntimeDomainHostBinding["status"]): HostingDomainOperationsDomain["verificationStatus"] {
  if (status === "active") return "verified";
  return status;
}

function verificationReasonFor(binding: RuntimeDomainHostBinding): string | null {
  if (binding.status === "active") return "domain_binding_active";
  if (binding.domainType === "wildcard_domain") return "wildcard_domain_unsupported";
  if (binding.verificationType || binding.verificationHost || binding.verificationValue) return "verification_record_required";
  if (binding.status === "pending" && !binding.lastCheckedAt) return "verification_not_checked";
  if (binding.status === "pending") return "verification_pending";
  if (binding.status === "failed") return "verification_failed";
  if (binding.status === "verifying") return "verification_in_progress";
  return null;
}

function lastErrorFor(binding: RuntimeDomainHostBinding): string | null {
  if (binding.status !== "failed") return null;
  if (binding.domainType === "wildcard_domain") return "DNS_WILDCARD_UNSUPPORTED";
  return "DOMAIN_VERIFICATION_FAILED";
}

function diagnosticsFor(binding: RuntimeDomainHostBinding): string[] {
  const diagnostics: string[] = [];
  if (binding.lastCheckedAt) diagnostics.push("DOMAIN_STATUS_CHECKED");
  if (binding.vercelDomainId) diagnostics.push("VERCEL_DOMAIN_ID_PRESENT");
  if (binding.verificationType || binding.verificationHost || binding.verificationValue) diagnostics.push("VERIFICATION_RECORD_PRESENT");
  if (binding.dnsInstructions && binding.dnsInstructions.length > 0) diagnostics.push("DNS_INSTRUCTIONS_PRESENT");
  if (binding.domainType === "wildcard_domain") diagnostics.push("DNS_WILDCARD_UNSUPPORTED");
  if (binding.status === "active") diagnostics.push("DOMAIN_BINDING_ACTIVE");
  if (binding.status === "failed") diagnostics.push("DOMAIN_VERIFICATION_FAILED");
  return diagnostics;
}

function mapDnsInstructions(binding: RuntimeDomainHostBinding): HostingDomainOperationsDnsInstruction[] {
  const instructions = binding.dnsInstructions ?? [];
  if (instructions.length > 0) {
    return instructions.map((instruction) => ({
      recordType: instruction.type.toUpperCase(),
      host: instruction.host,
      value: instruction.value,
      expectedStatus: instruction.purpose === "verification" ? "verification_required" : "routing_required",
    }));
  }

  const recordType = normalizeText(binding.dnsRecordType);
  const host = normalizeText(binding.dnsRecordHost);
  const value = normalizeText(binding.dnsRecordValue);
  if (!recordType || !host || !value) return [];
  return [
    {
      recordType: recordType.toUpperCase(),
      host,
      value,
      expectedStatus: binding.dnsRecordPurpose === "verification" ? "verification_required" : "routing_required",
    },
  ];
}

export function createHostingDomainOperationsReadModel(input: {
  domains: readonly RuntimeDomainHostBinding[];
  workingDomains?: readonly RuntimeHostBinding[];
}): HostingDomainOperationsReadModel {
  const customDomains = input.domains.map((binding) => ({
    id: binding.id,
    hostname: binding.domain,
    status: binding.status,
    source: "runtime_domain_host_binding" as const,
    verificationStatus: verificationStatusFor(binding.status),
    active: binding.status === "active",
    lastCheckedAt: binding.lastCheckedAt,
    lastError: lastErrorFor(binding),
    verificationReason: verificationReasonFor(binding),
    dnsInstructions: mapDnsInstructions(binding),
    diagnostics: {
      lastDomainCheck: binding.lastCheckedAt,
      lastVerificationResult: binding.status,
      verificationDiagnostics: diagnosticsFor(binding),
    },
  }));

  return {
    workingDomains: (input.workingDomains ?? []).map((binding) => ({
      id: binding.id,
      hostname: binding.host,
      bindingKind: binding.bindingKind,
      status: binding.status,
      active: binding.status === "ACTIVE",
      source: "runtime_host_binding",
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
    })),
    customDomains,
    domains: customDomains,
  };
}
