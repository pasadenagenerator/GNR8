import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
import {
  createRuntimeDomainLifecyclePlan,
  type RuntimeDomainLifecycleIntent,
} from "@/gnr8/runtime/domains/runtime-domain-lifecycle";
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
    hasActiveDomainBinding: false,
    domainReadinessStatus: "ready_with_warnings",
    warnings: ["missing_custom_domain", "missing_active_domain_binding"],
    blockers: [],
    correlationKey: "readiness_key",
    ...input,
  };
}

function planFor(input: {
  intent: RuntimeDomainLifecycleIntent;
  report?: Partial<RuntimeDomainReadinessReport>;
  withDnsPlan?: boolean;
}) {
  const report = buildReadinessReport(input.report);
  const dnsPlan = input.withDnsPlan
    ? createRuntimeDnsReadinessPlan({
        report,
        providerId: "manual",
      })
    : undefined;
  return createRuntimeDomainLifecyclePlan({
    report,
    dnsPlan,
    intent: input.intent,
    providerId: "manual",
  });
}

test("runtime domain lifecycle: preview only path", () => {
  const plan = planFor({
    intent: "internal_preview_only",
    report: { hasInternalHost: true },
  });

  assert.equal(plan.currentStage, "active");
  assert.equal(plan.nextRecommendedActions.includes("monitor_domain_activation"), false);
});

test("runtime domain lifecycle: connect existing domain path", () => {
  const plan = planFor({
    intent: "connect_existing_domain",
    withDnsPlan: true,
    report: {
      customDomains: ["maver.example.com"],
      hasCustomDomain: true,
      hasActiveDomainBinding: false,
      warnings: ["missing_active_domain_binding"],
    },
  });

  assert.equal(plan.currentStage, "dns_pending");
  assert.equal(plan.nextRecommendedActions.includes("configure_dns_records"), true);
});

test("runtime domain lifecycle: purchase flow path", () => {
  const plan = planFor({
    intent: "purchase_new_domain",
    report: {
      customDomains: [],
      hasCustomDomain: false,
      hasActiveDomainBinding: false,
    },
  });

  assert.equal(plan.currentStage, "purchase_pending");
  assert.deepEqual(plan.nextRecommendedActions, ["check_domain_availability", "purchase_domain"]);
});

test("runtime domain lifecycle: transfer flow path", () => {
  const plan = planFor({
    intent: "transfer_domain",
    report: {
      customDomains: ["maver.example.com"],
      hasCustomDomain: true,
      hasActiveDomainBinding: false,
      warnings: ["missing_active_domain_binding"],
    },
  });

  assert.equal(plan.nextRecommendedActions.includes("initiate_domain_transfer"), true);
  assert.equal(["verification_pending", "dns_pending", "dns_configured"].includes(plan.currentStage), true);
});

test("runtime domain lifecycle: deterministic ordering", () => {
  const reportA = buildReadinessReport({
    customDomains: ["z.example.com", "a.example.com"],
    hasCustomDomain: true,
    hasActiveDomainBinding: false,
    warnings: ["warn_b", "warn_a"],
    blockers: ["block_b", "block_a"],
  });
  const reportB = buildReadinessReport({
    customDomains: ["a.example.com", "z.example.com"],
    hasCustomDomain: true,
    hasActiveDomainBinding: false,
    warnings: ["warn_a", "warn_b"],
    blockers: ["block_a", "block_b"],
  });

  const a = createRuntimeDomainLifecyclePlan({
    report: reportA,
    dnsPlan: createRuntimeDnsReadinessPlan({ report: reportA, providerId: "manual" }),
    intent: "connect_existing_domain",
    providerId: "manual",
  });
  const b = createRuntimeDomainLifecyclePlan({
    report: reportB,
    dnsPlan: createRuntimeDnsReadinessPlan({ report: reportB, providerId: "manual" }),
    intent: "connect_existing_domain",
    providerId: "manual",
  });

  assert.deepEqual(a.nextRecommendedActions, b.nextRecommendedActions);
  assert.deepEqual(a.blockers, b.blockers);
  assert.deepEqual(a.warnings, b.warnings);
});

test("runtime domain lifecycle: stable correlation key", () => {
  const a = planFor({
    intent: "connect_existing_domain",
    withDnsPlan: true,
    report: {
      customDomains: ["www.example.com", "example.com"],
      hasCustomDomain: true,
      hasActiveDomainBinding: false,
    },
  });
  const b = planFor({
    intent: "connect_existing_domain",
    withDnsPlan: true,
    report: {
      customDomains: ["example.com", "www.example.com"],
      hasCustomDomain: true,
      hasActiveDomainBinding: false,
    },
  });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});
