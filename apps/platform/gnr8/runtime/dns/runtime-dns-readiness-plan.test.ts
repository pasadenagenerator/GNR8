import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
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
    domainReadinessStatus: "ready_with_warnings",
    warnings: ["missing_custom_domain"],
    blockers: [],
    correlationKey: "readiness_key",
    ...input,
  };
}

test("runtime dns readiness plan: blocked report produces no records", () => {
  const plan = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "blocked",
      blockers: ["missing_site_id"],
    }),
    providerId: "manual",
  });

  assert.deepEqual(plan.plannedRecords, []);
  assert.deepEqual(plan.blockers, ["missing_site_id"]);
});

test("runtime dns readiness plan: internal host record planned", () => {
  const plan = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
    }),
    providerId: "manual",
  });

  const record = plan.plannedRecords.find((entry) => entry.intent === "internal_preview_host");
  assert.equal(record?.type, "cname");
  assert.equal(record?.domain, "maver.preview.gnr8.test");
});

test("runtime dns readiness plan: apex + www custom domains planned", () => {
  const plan = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
      customDomains: ["example.com", "www.example.com"],
      hasCustomDomain: true,
    }),
    providerId: "manual",
  });

  const intents = plan.plannedRecords.map((entry) => entry.intent);
  assert.equal(intents.includes("custom_apex_domain"), true);
  assert.equal(intents.includes("custom_www_domain"), true);
});

test("runtime dns readiness plan: TXT verification planned", () => {
  const plan = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
      customDomains: ["example.com"],
      hasCustomDomain: true,
    }),
    providerId: "manual",
    verificationToken: "verify-token",
  });

  const txt = plan.plannedRecords.find((entry) => entry.intent === "verification_txt");
  assert.equal(txt?.type, "txt");
  assert.equal(txt?.value, "verify-token");
});

test("runtime dns readiness plan: manual provider emits manual steps", () => {
  const plan = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
    }),
    providerId: "manual",
  });

  assert.equal(plan.requiredManualSteps.length > 0, true);
});

test("runtime dns readiness plan: deterministic ordering", () => {
  const a = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
      customDomains: ["www.example.com", "example.com"],
      hasCustomDomain: true,
    }),
    providerId: "manual",
    verificationToken: "verify-token",
  });

  const b = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
      customDomains: ["example.com", "www.example.com"],
      hasCustomDomain: true,
    }),
    providerId: "manual",
    verificationToken: "verify-token",
  });

  assert.deepEqual(a.plannedRecords, b.plannedRecords);
});

test("runtime dns readiness plan: stable correlation key", () => {
  const a = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
      customDomains: ["www.example.com", "example.com"],
      hasCustomDomain: true,
    }),
    providerId: "manual",
    verificationToken: "verify-token",
  });

  const b = createRuntimeDnsReadinessPlan({
    report: buildReadinessReport({
      domainReadinessStatus: "ready",
      warnings: [],
      customDomains: ["example.com", "www.example.com"],
      hasCustomDomain: true,
    }),
    providerId: "manual",
    verificationToken: "verify-token",
  });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});
