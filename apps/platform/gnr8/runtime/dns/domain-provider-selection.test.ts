import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
import { selectRuntimeDomainProvider } from "@/gnr8/runtime/dns/domain-provider-selection";
import { createRuntimeDomainLifecyclePlan, type RuntimeDomainLifecyclePlan } from "@/gnr8/runtime/domains/runtime-domain-lifecycle";
import type { RuntimeDomainReadinessReport } from "@/gnr8/runtime/readiness/runtime-domain-readiness";

function buildReadinessReport(input?: Partial<RuntimeDomainReadinessReport>): RuntimeDomainReadinessReport {
  return {
    siteId: "site_1",
    canonicalSlug: "maver",
    primaryHost: "source.example.com",
    internalPreviewHost: "maver.preview.gnr8.test",
    customDomains: [],
    hasInternalHost: true,
    hasCustomDomain: false,
    hasActiveDomainBinding: true,
    domainReadinessStatus: "ready",
    warnings: [],
    blockers: [],
    correlationKey: "readiness_key",
    ...input,
  };
}

function buildPlans(input?: { lifecycleBlockers?: string[]; customDomains?: string[] }) {
  const report = buildReadinessReport({
    customDomains: input?.customDomains ?? [],
    hasCustomDomain: (input?.customDomains?.length ?? 0) > 0,
  });
  const dnsPlan = createRuntimeDnsReadinessPlan({
    report,
    providerId: "manual",
  });
  const lifecyclePlan = createRuntimeDomainLifecyclePlan({
    report,
    dnsPlan,
    intent: report.hasCustomDomain ? "connect_existing_domain" : "internal_preview_only",
    providerId: "manual",
  });
  if ((input?.lifecycleBlockers?.length ?? 0) > 0) {
    const patchedLifecyclePlan: RuntimeDomainLifecyclePlan = {
      ...lifecyclePlan,
      blockers: [...input.lifecycleBlockers!].sort((a, b) => a.localeCompare(b)),
    };
    return { dnsPlan, lifecyclePlan: patchedLifecyclePlan };
  }
  return { dnsPlan, lifecyclePlan };
}

test("domain provider selection: preferred provider selected", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans();
  const selection = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    preferredProviderId: "inwx",
  });
  assert.equal(selection.selectedProviderId, "inwx");
  assert.equal(selection.selectionStatus, "selected");
});

test("domain provider selection: fallback compatible provider selected", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans();
  const selection = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    preferredProviderId: "openprovider",
    allowedProviderIds: ["inwx", "netim"],
  });
  assert.equal(selection.selectedProviderId, "inwx");
  assert.equal(selection.selectionStatus, "selected");
});

test("domain provider selection: manual fallback", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans({ customDomains: ["example.com"] });
  const selection = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    preferredProviderId: "openprovider",
    allowedProviderIds: ["manual"],
  });
  assert.equal(selection.selectedProviderId, "manual");
  assert.equal(selection.selectionStatus, "manual_required");
});

test("domain provider selection: mock provider can be selected when allowed and preferred", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans({ customDomains: ["example.com"] });
  const selection = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    preferredProviderId: "mock_provider",
    allowedProviderIds: ["mock_provider", "manual"],
  });
  assert.equal(selection.selectedProviderId, "mock_provider");
  assert.equal(selection.selectionStatus, "selected");
});

test("domain provider selection: blocked lifecycle blocks selection", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans({ lifecycleBlockers: ["missing_custom_domain_for_connect_existing_domain"] });
  const selection = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    preferredProviderId: "inwx",
  });
  assert.equal(selection.selectionStatus, "blocked");
  assert.deepEqual(selection.blockers, ["missing_custom_domain_for_connect_existing_domain"]);
});

test("domain provider selection: allowed provider filter", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans();
  const selection = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    allowedProviderIds: ["netim"],
  });
  assert.deepEqual(
    selection.providerCandidates.map((candidate) => candidate.providerId),
    ["manual", "netim"],
  );
  assert.equal(selection.selectedProviderId, "netim");
});

test("domain provider selection: deterministic ordering", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans();
  const a = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    allowedProviderIds: ["openprovider", "inwx", "netim"],
  });
  const b = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    allowedProviderIds: ["netim", "openprovider", "inwx"],
  });
  assert.deepEqual(a.providerCandidates, b.providerCandidates);
  assert.equal(
    a.providerCandidates.map((candidate) => candidate.providerId).join(","),
    "inwx,manual,netim,openprovider",
  );
});

test("domain provider selection: stable correlation key", () => {
  const { dnsPlan, lifecyclePlan } = buildPlans();
  const a = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    allowedProviderIds: ["openprovider", "inwx", "netim"],
  });
  const b = selectRuntimeDomainProvider({
    lifecyclePlan,
    dnsReadinessPlan: dnsPlan,
    allowedProviderIds: ["netim", "openprovider", "inwx"],
  });
  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});
