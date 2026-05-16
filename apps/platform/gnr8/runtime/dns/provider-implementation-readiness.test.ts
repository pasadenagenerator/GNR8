import assert from "node:assert/strict";
import test from "node:test";

import { DNS_PROVIDER_CAPABILITIES } from "@/gnr8/runtime/dns/dns-provider-types";
import { createManualDnsProviderAdapterFixture } from "@/gnr8/runtime/dns/provider-adapter-contract-test";
import { evaluateDnsProviderImplementationReadiness } from "@/gnr8/runtime/dns/provider-implementation-readiness";

test("provider implementation readiness: manual provider ready_for_mock", () => {
  const report = evaluateDnsProviderImplementationReadiness({
    providerId: "manual",
    capability: DNS_PROVIDER_CAPABILITIES.manual,
    adapter: createManualDnsProviderAdapterFixture(),
    contractReport: {
      providerId: "manual",
      contractStatus: "pass",
      checks: [],
      warnings: [],
      blockers: [],
      correlationKey: "contract_key",
    },
  });

  assert.equal(report.readinessStatus, "ready_for_mock");
  assert.deepEqual(report.blockers, []);
});

test("provider implementation readiness: future provider without adapter blocked", () => {
  const report = evaluateDnsProviderImplementationReadiness({
    providerId: "inwx",
    capability: DNS_PROVIDER_CAPABILITIES.inwx,
    contractReport: {
      providerId: "inwx",
      contractStatus: "pass",
      checks: [],
      warnings: [],
      blockers: [],
      correlationKey: "contract_key",
    },
  });

  assert.equal(report.readinessStatus, "blocked");
  assert.ok(report.blockers.includes("adapter_not_registered_for_provider"));
});

test("provider implementation readiness: failing contract blocked", () => {
  const report = evaluateDnsProviderImplementationReadiness({
    providerId: "manual",
    capability: DNS_PROVIDER_CAPABILITIES.manual,
    adapter: createManualDnsProviderAdapterFixture(),
    contractReport: {
      providerId: "manual",
      contractStatus: "fail",
      checks: [],
      warnings: [],
      blockers: ["contract_check_failed:required_methods"],
      correlationKey: "contract_key",
    },
  });

  assert.equal(report.readinessStatus, "blocked");
  assert.ok(report.blockers.includes("contract_not_passing"));
});

test("provider implementation readiness: missing capability blocked", () => {
  const report = evaluateDnsProviderImplementationReadiness({
    providerId: "manual",
    adapter: createManualDnsProviderAdapterFixture(),
    contractReport: {
      providerId: "manual",
      contractStatus: "pass",
      checks: [],
      warnings: [],
      blockers: [],
      correlationKey: "contract_key",
    },
  });

  assert.equal(report.readinessStatus, "blocked");
  assert.ok(report.blockers.includes("capability_missing_or_mismatched"));
});

test("provider implementation readiness: stable ordering", () => {
  const report = evaluateDnsProviderImplementationReadiness({
    providerId: "manual",
    capability: DNS_PROVIDER_CAPABILITIES.manual,
    adapter: createManualDnsProviderAdapterFixture(),
    contractReport: {
      providerId: "manual",
      contractStatus: "pass",
      checks: [],
      warnings: [],
      blockers: [],
      correlationKey: "contract_key",
    },
  });

  assert.deepEqual(
    report.checklist.map((item) => item.id),
    [
      "capability_defined",
      "adapter_registered",
      "contract_passes",
      "credentials_not_required_for_contract",
      "sandbox_mode_required_before_live",
      "no_live_execution_enabled",
    ],
  );
  assert.deepEqual(report.warnings, ["live_execution_must_remain_disabled_in_current_phase", "sandbox_mode_required_before_live"]);
});

test("provider implementation readiness: stable correlation key", () => {
  const a = evaluateDnsProviderImplementationReadiness({
    providerId: "inwx",
    capability: DNS_PROVIDER_CAPABILITIES.inwx,
    contractReport: {
      providerId: "inwx",
      contractStatus: "pass",
      checks: [],
      warnings: [],
      blockers: [],
      correlationKey: "contract_key",
    },
  });

  const b = evaluateDnsProviderImplementationReadiness({
    providerId: "inwx",
    capability: DNS_PROVIDER_CAPABILITIES.inwx,
    contractReport: {
      providerId: "inwx",
      contractStatus: "pass",
      checks: [],
      warnings: [],
      blockers: [],
      correlationKey: "contract_key",
    },
  });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});
