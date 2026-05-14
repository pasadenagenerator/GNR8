import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
import { selectRuntimeDomainProvider } from "@/gnr8/runtime/dns/domain-provider-selection";
import {
  createRuntimeDomainExecutionIntent,
  type RuntimeDomainExecutionIntent,
} from "@/gnr8/runtime/domains/runtime-domain-execution-intent";
import { createRuntimeDomainLifecyclePlan, type RuntimeDomainLifecyclePlan } from "@/gnr8/runtime/domains/runtime-domain-lifecycle";
import type { RuntimeDomainReadinessReport } from "@/gnr8/runtime/readiness/runtime-domain-readiness";

function buildReadinessReport(input?: Partial<RuntimeDomainReadinessReport>): RuntimeDomainReadinessReport {
  return {
    siteId: "site_1",
    canonicalSlug: "maver",
    primaryHost: "source.example.com",
    internalPreviewHost: "maver.preview.gnr8.test",
    customDomains: ["maver.example.com", "www.maver.example.com"],
    hasInternalHost: true,
    hasCustomDomain: true,
    hasActiveDomainBinding: false,
    domainReadinessStatus: "ready",
    warnings: [],
    blockers: [],
    correlationKey: "readiness_key",
    ...input,
  };
}

function buildIntent(input?: {
  providerId?: "manual" | "inwx";
  lifecycleBlockers?: string[];
  customDomains?: string[];
}): RuntimeDomainExecutionIntent {
  const reportPatch: Partial<RuntimeDomainReadinessReport> = {};
  if (input?.customDomains) {
    reportPatch.customDomains = input.customDomains;
    reportPatch.hasCustomDomain = input.customDomains.length > 0;
  }
  const report = buildReadinessReport(reportPatch);
  const dnsPlan = createRuntimeDnsReadinessPlan({ report, providerId: "manual" });
  const lifecyclePlanBase = createRuntimeDomainLifecyclePlan({
    report,
    dnsPlan,
    intent: "connect_existing_domain",
    providerId: "manual",
  });

  const lifecyclePlan: RuntimeDomainLifecyclePlan = {
    ...lifecyclePlanBase,
    blockers: [...(input?.lifecycleBlockers ?? [])].sort((a, b) => a.localeCompare(b)),
  };

  const providerSelection = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    preferredProviderId: input?.providerId ?? "manual",
  });

  return createRuntimeDomainExecutionIntent({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    providerSelection,
  });
}

test("runtime domain execution intent: manual provider creates manual actions", () => {
  const intent = buildIntent({ providerId: "manual" });
  assert.equal(intent.executionMode, "manual");
  assert.equal(intent.executableActions.length, 0);
  assert.equal(intent.blockedActions.length, 0);
  assert.equal(intent.manualActions.length > 0, true);
});

test("runtime domain execution intent: non-manual provider creates executable future actions", () => {
  const intent = buildIntent({ providerId: "inwx" });
  assert.equal(intent.executionMode, "provider_api_future");
  assert.equal(intent.blockedActions.length, 0);
  assert.equal(intent.executableActions.some((entry) => entry.kind === "upsert_dns_record"), true);
});

test("runtime domain execution intent: blocked lifecycle blocks actions", () => {
  const report = buildReadinessReport();
  const dnsPlan = createRuntimeDnsReadinessPlan({ report, providerId: "manual" });
  const lifecyclePlanBase = createRuntimeDomainLifecyclePlan({
    report,
    dnsPlan,
    intent: "connect_existing_domain",
    providerId: "manual",
  });
  const lifecyclePlan: RuntimeDomainLifecyclePlan = {
    ...lifecyclePlanBase,
    blockers: ["missing_custom_domain_for_connect_existing_domain"],
  };
  const intent = createRuntimeDomainExecutionIntent({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    providerSelection: {
      selectedProviderId: "inwx",
      selectionStatus: "blocked",
      providerCandidates: [],
      warnings: [],
      blockers: ["missing_custom_domain_for_connect_existing_domain"],
      correlationKey: "selection_blocked",
    },
  });
  assert.equal(intent.blockers.includes("missing_custom_domain_for_connect_existing_domain"), true);
  assert.equal(intent.executableActions.length, 0);
  assert.equal(intent.blockedActions.length > 0, true);
});

test("runtime domain execution intent: DNS planned records map to upsert actions", () => {
  const intent = buildIntent({ providerId: "inwx" });
  const expectedUpserts = intent.executableActions.filter((entry) => entry.kind === "upsert_dns_record");
  assert.equal(expectedUpserts.length >= 2, true);
  assert.equal(expectedUpserts.every((entry) => entry.name && entry.type && entry.value), true);
});

test("runtime domain execution intent: deterministic ordering", () => {
  const a = buildIntent({ providerId: "inwx", customDomains: ["www.maver.example.com", "maver.example.com"] });
  const b = buildIntent({ providerId: "inwx", customDomains: ["maver.example.com", "www.maver.example.com"] });

  assert.deepEqual(a.executableActions, b.executableActions);
  assert.deepEqual(a.manualActions, b.manualActions);
  assert.deepEqual(a.blockedActions, b.blockedActions);
});

test("runtime domain execution intent: stable correlation key", () => {
  const a = buildIntent({ providerId: "inwx", customDomains: ["www.maver.example.com", "maver.example.com"] });
  const b = buildIntent({ providerId: "inwx", customDomains: ["maver.example.com", "www.maver.example.com"] });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});
