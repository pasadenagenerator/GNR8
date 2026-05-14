import {
  createDnsCorrelationKey,
  normalizeDnsDomain,
  normalizeDnsHost,
  normalizeDnsRecordName,
  type DnsProviderId,
  type DnsRecordIntent,
  type DnsRecordType,
} from "@/gnr8/runtime/dns/dns-provider-types";
import type {
  RuntimeDomainReadinessReport,
  RuntimeDomainReadinessStatus,
} from "@/gnr8/runtime/readiness/runtime-domain-readiness";

const DEFAULT_TARGET_VALUE = "76.76.21.21";
const DEFAULT_INTERNAL_PREVIEW_TARGET = "cname.vercel-dns.com";
const DEFAULT_TTL_SECONDS = 300;
const DEFAULT_VERIFICATION_HOST = "_acme-challenge";
const DEFAULT_VERIFICATION_TTL_SECONDS = 60;

export type RuntimeDnsReadinessPlannedRecord = {
  intent: DnsRecordIntent;
  domain: string;
  host: string;
  name: string;
  type: DnsRecordType;
  value: string;
  ttlSeconds: number;
};

export type RuntimeDnsReadinessPlan = {
  siteId: string;
  providerId: DnsProviderId;
  domainReadinessStatus: RuntimeDomainReadinessStatus;
  plannedRecords: RuntimeDnsReadinessPlannedRecord[];
  requiredManualSteps: string[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export type RuntimeDnsReadinessPlanInput = {
  report: RuntimeDomainReadinessReport;
  providerId: DnsProviderId;
  verificationToken?: string | null;
  targetHostOverride?: string | null;
  targetValueOverride?: string | null;
};

function normalizeToken(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCustomDomain(value: string): string {
  return normalizeDnsDomain(value);
}

function classifyCustomDomainIntent(domain: string): DnsRecordIntent | null {
  const normalized = normalizeCustomDomain(domain);
  if (!normalized) return null;
  const labels = normalized.split(".").filter(Boolean);
  if (labels.length === 2) return "custom_apex_domain";
  if (labels[0] === "www") return "custom_www_domain";
  return null;
}

function resolveTypeForIntent(intent: DnsRecordIntent): DnsRecordType {
  if (intent === "custom_apex_domain") return "a";
  if (intent === "verification_txt") return "txt";
  return "cname";
}

function resolveHostForIntent(input: {
  intent: DnsRecordIntent;
  domain: string;
  targetHostOverride?: string | null;
}): string {
  if (input.intent === "custom_apex_domain") return "@";
  if (input.intent === "custom_www_domain") return "@";
  if (input.intent === "verification_txt") {
    return normalizeDnsHost(input.targetHostOverride ?? DEFAULT_VERIFICATION_HOST, input.domain);
  }
  return normalizeDnsHost(input.domain);
}

function sortRecords(records: RuntimeDnsReadinessPlannedRecord[]): RuntimeDnsReadinessPlannedRecord[] {
  return records.sort((a, b) => {
    if (a.intent !== b.intent) return a.intent.localeCompare(b.intent);
    if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.host !== b.host) return a.host.localeCompare(b.host);
    if (a.value !== b.value) return a.value.localeCompare(b.value);
    return a.ttlSeconds - b.ttlSeconds;
  });
}

function createRecord(input: {
  intent: DnsRecordIntent;
  domain: string;
  value: string;
  ttlSeconds: number;
  targetHostOverride?: string | null;
}): RuntimeDnsReadinessPlannedRecord {
  const domain = normalizeCustomDomain(input.domain);
  const host = resolveHostForIntent({
    intent: input.intent,
    domain,
    targetHostOverride: input.targetHostOverride,
  });
  return {
    intent: input.intent,
    domain,
    host,
    name: normalizeDnsRecordName({ domain, host }),
    type: resolveTypeForIntent(input.intent),
    value: input.value,
    ttlSeconds: input.ttlSeconds,
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function createRuntimeDnsReadinessPlan(input: RuntimeDnsReadinessPlanInput): RuntimeDnsReadinessPlan {
  const siteId = String(input.report.siteId ?? "").trim();
  const providerId = input.providerId;
  const domainReadinessStatus = input.report.domainReadinessStatus;
  const warnings = uniqueSorted(input.report.warnings);
  const blockers = uniqueSorted(input.report.blockers);

  if (domainReadinessStatus === "blocked") {
    const planned: RuntimeDnsReadinessPlan = {
      siteId,
      providerId,
      domainReadinessStatus,
      plannedRecords: [],
      requiredManualSteps: [],
      warnings,
      blockers,
      correlationKey: "",
    };
    planned.correlationKey = createDnsCorrelationKey(planned);
    return planned;
  }

  const resolvedTargetValue = normalizeToken(input.targetValueOverride) ?? DEFAULT_TARGET_VALUE;
  const plannedRecords: RuntimeDnsReadinessPlannedRecord[] = [];

  if (input.report.internalPreviewHost) {
    plannedRecords.push(
      createRecord({
        intent: "internal_preview_host",
        domain: input.report.internalPreviewHost,
        value: DEFAULT_INTERNAL_PREVIEW_TARGET,
        ttlSeconds: DEFAULT_TTL_SECONDS,
      }),
    );
  }

  const normalizedCustomDomains = uniqueSorted(input.report.customDomains.map((domain) => normalizeCustomDomain(domain)).filter(Boolean));
  for (const customDomain of normalizedCustomDomains) {
    const intent = classifyCustomDomainIntent(customDomain);
    if (!intent) continue;
    plannedRecords.push(
      createRecord({
        intent,
        domain: customDomain,
        value: resolvedTargetValue,
        ttlSeconds: DEFAULT_TTL_SECONDS,
      }),
    );
  }

  const verificationToken = normalizeToken(input.verificationToken);
  if (verificationToken) {
    const verificationDomain = normalizedCustomDomains[0] ?? input.report.primaryHost ?? input.report.internalPreviewHost;
    if (verificationDomain) {
      plannedRecords.push(
        createRecord({
          intent: "verification_txt",
          domain: verificationDomain,
          value: verificationToken,
          ttlSeconds: DEFAULT_VERIFICATION_TTL_SECONDS,
          targetHostOverride: input.targetHostOverride,
        }),
      );
    }
  }

  const sortedRecords = sortRecords(plannedRecords);
  const requiredManualSteps =
    providerId === "manual" && sortedRecords.length > 0
      ? [
          "open_dns_provider_console",
          "create_or_update_listed_records_manually",
          "wait_for_dns_propagation_and_recheck_runtime_domain_readiness",
        ]
      : [];

  const plan: RuntimeDnsReadinessPlan = {
    siteId,
    providerId,
    domainReadinessStatus,
    plannedRecords: sortedRecords,
    requiredManualSteps,
    warnings,
    blockers,
    correlationKey: "",
  };
  plan.correlationKey = createDnsCorrelationKey(plan);
  return plan;
}
