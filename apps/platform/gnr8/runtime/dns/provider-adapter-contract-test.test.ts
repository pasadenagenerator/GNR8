import assert from "node:assert/strict";
import test from "node:test";

import { DNS_PROVIDER_CAPABILITIES, type DnsProviderAdapterContract } from "@/gnr8/runtime/dns/dns-provider-types";
import {
  createManualDnsProviderAdapterFixture,
  runDnsProviderAdapterContractTest,
} from "@/gnr8/runtime/dns/provider-adapter-contract-test";
import { createMockDnsProviderAdapter } from "@/gnr8/runtime/dns/mock-provider-adapter";

test("provider adapter contract: manual adapter passes", async () => {
  const adapter = createManualDnsProviderAdapterFixture();
  const report = await runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES.manual,
  });

  assert.equal(report.providerId, "manual");
  assert.equal(report.contractStatus, "pass");
  assert.equal(report.warnings.length, 0);
  assert.equal(report.blockers.length, 0);
  assert.deepEqual(
    report.checks.map((check) => check.id),
    [
      "required_methods",
      "provider_id_matches_capability",
      "unsupported_operations_return_deterministic_result",
      "unsupported_operations_do_not_throw",
      "result_shape_is_deterministic",
      "no_network_calls_made",
    ],
  );
  assert.ok(report.checks.every((check) => check.status === "pass"));
});

test("provider adapter contract: mismatched providerId fails", async () => {
  const adapter = createManualDnsProviderAdapterFixture();
  const report = await runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES.inwx,
  });

  assert.equal(report.contractStatus, "fail");
  assert.ok(report.blockers.includes("contract_check_failed:provider_id_matches_capability"));
});

test("provider adapter contract: mock provider adapter passes", async () => {
  const adapter = createMockDnsProviderAdapter();
  const report = await runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES.mock_provider,
  });

  assert.equal(report.providerId, "mock_provider");
  assert.equal(report.contractStatus, "pass");
  assert.equal(report.blockers.length, 0);
});

test("provider adapter contract: missing method fails", async () => {
  const adapter = createManualDnsProviderAdapterFixture();
  const brokenAdapter = {
    ...adapter,
    verifyRecord: undefined,
  } as unknown as DnsProviderAdapterContract;

  const report = await runDnsProviderAdapterContractTest({
    adapter: brokenAdapter,
    capability: DNS_PROVIDER_CAPABILITIES.manual,
  });

  assert.equal(report.contractStatus, "fail");
  assert.ok(report.blockers.includes("contract_check_failed:required_methods"));
});

test("provider adapter contract: throwing unsupported operation fails", async () => {
  const adapter = createManualDnsProviderAdapterFixture();
  const throwingAdapter: DnsProviderAdapterContract = {
    ...adapter,
    verifyRecord: async () => {
      throw new Error("unsupported must resolve without throw");
    },
  };

  const report = await runDnsProviderAdapterContractTest({
    adapter: throwingAdapter,
    capability: DNS_PROVIDER_CAPABILITIES.manual,
  });

  assert.equal(report.contractStatus, "fail");
  assert.ok(report.blockers.includes("contract_check_failed:unsupported_operations_do_not_throw"));
  assert.ok(report.blockers.some((blocker) => blocker.startsWith("adapter_threw_on_unsupported_operation:")));
});

test("provider adapter contract: deterministic correlation key", async () => {
  const adapter = createManualDnsProviderAdapterFixture();
  const reportA = await runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES.manual,
  });
  const reportB = await runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES.manual,
  });

  assert.equal(reportA.correlationKey, reportB.correlationKey);
  assert.equal(reportA.correlationKey.length, 64);
});

test("provider adapter contract: stable check ordering", async () => {
  const adapter = createManualDnsProviderAdapterFixture();
  const reportA = await runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES.manual,
  });
  const reportB = await runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES.manual,
  });

  assert.deepEqual(
    reportA.checks.map((check) => check.id),
    reportB.checks.map((check) => check.id),
  );
});
