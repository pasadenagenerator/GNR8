import {
  DNS_PROVIDER_CAPABILITIES,
  createDnsCorrelationKey,
  createDnsZoneIdentity,
  type DnsProviderAdapterContract,
  type DnsProviderCapability,
  type DnsRecordSpec,
} from "@/gnr8/runtime/dns/dns-provider-types";
import { stableStringify } from "@/gnr8/runtime/deterministic";

type ContractStatus = "pass" | "fail";

type ContractCheck = {
  id:
    | "required_methods"
    | "provider_id_matches_capability"
    | "unsupported_operations_return_deterministic_result"
    | "unsupported_operations_do_not_throw"
    | "result_shape_is_deterministic"
    | "no_network_calls_made";
  status: ContractStatus;
  detail: string;
};

export type DnsProviderAdapterContractReport = {
  providerId: string;
  contractStatus: ContractStatus;
  checks: ContractCheck[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

type DnsProviderAdapterContractFixture = {
  domain: string;
  zoneId: string;
  verificationRecord: DnsRecordSpec;
};

const REQUIRED_METHODS: Array<keyof DnsProviderAdapterContract> = [
  "checkAvailability",
  "createZone",
  "upsertRecord",
  "deleteRecord",
  "verifyRecord",
];

const DEFAULT_FIXTURE: DnsProviderAdapterContractFixture = {
  domain: "contract-example.test",
  zoneId: "zone_contract_fixture",
  verificationRecord: {
    intent: "verification_txt",
    type: "txt",
    host: "_acme-challenge",
    name: "_acme-challenge.contract-example.test",
    value: "contract-token",
    ttlSeconds: 60,
  },
};

export function createManualDnsProviderAdapterFixture(): DnsProviderAdapterContract {
  const capability = DNS_PROVIDER_CAPABILITIES.manual;
  return {
    providerId: "manual",
    capability,
    checkAvailability: async () => ({ available: false, reason: "unsupported_manual" }),
    createZone: async () => ({ zoneReference: "manual_unsupported" }),
    upsertRecord: async () => ({ recordReference: "manual_unsupported" }),
    deleteRecord: async () => ({ deleted: false }),
    verifyRecord: async () => ({ verified: false, observedValue: null }),
  };
}

async function invokeOperations(input: {
  adapter: DnsProviderAdapterContract;
  fixture: DnsProviderAdapterContractFixture;
}) {
  const zone = {
    ...createDnsZoneIdentity({ providerId: input.adapter.providerId, domain: input.fixture.domain }),
    zoneId: input.fixture.zoneId,
  };

  const recordForDeleteVerify: Pick<DnsRecordSpec, "type" | "host" | "name" | "value"> = {
    type: input.fixture.verificationRecord.type,
    host: input.fixture.verificationRecord.host,
    name: input.fixture.verificationRecord.name,
    value: input.fixture.verificationRecord.value,
  };

  const checkAvailability = await input.adapter.checkAvailability({ domain: input.fixture.domain });
  const createZone = await input.adapter.createZone({ zone });
  const upsertRecord = await input.adapter.upsertRecord({ zone, record: input.fixture.verificationRecord });
  const deleteRecord = await input.adapter.deleteRecord({ zone, record: recordForDeleteVerify });
  const verifyRecord = await input.adapter.verifyRecord({ zone, record: recordForDeleteVerify });

  return {
    checkAvailability,
    createZone,
    upsertRecord,
    deleteRecord,
    verifyRecord,
  };
}

function isDeterministicUnsupportedResultShape(results: Awaited<ReturnType<typeof invokeOperations>>): boolean {
  if (typeof results.checkAvailability.available !== "boolean") return false;
  if (results.checkAvailability.available !== false) return false;
  if (results.checkAvailability.reason !== "unsupported_manual") return false;

  if (results.createZone.zoneReference !== "manual_unsupported") return false;
  if (results.upsertRecord.recordReference !== "manual_unsupported") return false;
  if (results.deleteRecord.deleted !== false) return false;
  if (results.verifyRecord.verified !== false) return false;
  if (results.verifyRecord.observedValue !== null) return false;

  return true;
}

function isDeterministicResultShape(results: Awaited<ReturnType<typeof invokeOperations>>): boolean {
  if (typeof results.checkAvailability.available !== "boolean") return false;
  if (results.checkAvailability.reason != null && typeof results.checkAvailability.reason !== "string") return false;
  if (typeof results.createZone.zoneReference !== "string" || results.createZone.zoneReference.length === 0) return false;
  if (typeof results.upsertRecord.recordReference !== "string" || results.upsertRecord.recordReference.length === 0) return false;
  if (typeof results.deleteRecord.deleted !== "boolean") return false;
  if (typeof results.verifyRecord.verified !== "boolean") return false;
  if (results.verifyRecord.observedValue != null && typeof results.verifyRecord.observedValue !== "string") return false;
  return true;
}

export async function runDnsProviderAdapterContractTest(input: {
  adapter: DnsProviderAdapterContract;
  capability: DnsProviderCapability;
  fixture?: Partial<DnsProviderAdapterContractFixture>;
}): Promise<DnsProviderAdapterContractReport> {
  const fixture: DnsProviderAdapterContractFixture = {
    ...DEFAULT_FIXTURE,
    ...(input.fixture ?? {}),
    verificationRecord: {
      ...DEFAULT_FIXTURE.verificationRecord,
      ...(input.fixture?.verificationRecord ?? {}),
    },
  };

  const checks: ContractCheck[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  const missingMethods = REQUIRED_METHODS.filter((method) => typeof input.adapter[method] !== "function");
  const requiredMethodsPass = missingMethods.length === 0;
  checks.push({
    id: "required_methods",
    status: requiredMethodsPass ? "pass" : "fail",
    detail: requiredMethodsPass ? "all required adapter methods are present" : `missing methods: ${missingMethods.join(",")}`,
  });

  const providerMatch = input.adapter.providerId === input.capability.providerId;
  checks.push({
    id: "provider_id_matches_capability",
    status: providerMatch ? "pass" : "fail",
    detail: providerMatch
      ? `adapter providerId (${input.adapter.providerId}) matches capability`
      : `adapter providerId (${input.adapter.providerId}) does not match capability providerId (${input.capability.providerId})`,
  });

  let noThrowPass = true;
  let deterministicUnsupportedPass = true;
  let deterministicShapePass = true;
  let networkCalls = 0;

  const previousFetch = globalThis.fetch;
  const guardedFetch: typeof fetch = async (..._args: Parameters<typeof fetch>) => {
    networkCalls += 1;
    throw new Error("network_call_not_allowed_in_dns_provider_contract_test");
  };

  try {
    globalThis.fetch = guardedFetch;

    const firstRun = await invokeOperations({ adapter: input.adapter, fixture });
    const secondRun = await invokeOperations({ adapter: input.adapter, fixture });

    deterministicUnsupportedPass =
      input.adapter.providerId === "manual"
        ? isDeterministicUnsupportedResultShape(firstRun)
        : isDeterministicResultShape(firstRun);
    deterministicShapePass = stableStringify(firstRun) === stableStringify(secondRun);
  } catch (error) {
    noThrowPass = false;
    deterministicUnsupportedPass = false;
    deterministicShapePass = false;
    blockers.push(`adapter_threw_on_unsupported_operation:${error instanceof Error ? error.message : "unknown_error"}`);
  } finally {
    globalThis.fetch = previousFetch;
  }

  checks.push({
    id: "unsupported_operations_return_deterministic_result",
    status: deterministicUnsupportedPass ? "pass" : "fail",
    detail: deterministicUnsupportedPass
      ? "unsupported operations returned deterministic manual result"
      : "unsupported operations did not return deterministic manual result",
  });

  checks.push({
    id: "unsupported_operations_do_not_throw",
    status: noThrowPass ? "pass" : "fail",
    detail: noThrowPass ? "unsupported operations resolved without throw" : "unsupported operation threw",
  });

  checks.push({
    id: "result_shape_is_deterministic",
    status: deterministicShapePass ? "pass" : "fail",
    detail: deterministicShapePass ? "repeated invocation produced identical shape" : "repeated invocation produced non-deterministic shape",
  });

  const noNetworkCallsPass = networkCalls === 0;
  checks.push({
    id: "no_network_calls_made",
    status: noNetworkCallsPass ? "pass" : "fail",
    detail: noNetworkCallsPass
      ? "contract test completed without network calls"
      : `detected network call attempts: ${networkCalls}`,
  });

  if (input.adapter.providerId !== "manual") {
    warnings.push(`adapter_provider_is_non_manual_fixture:${input.adapter.providerId}`);
  }

  for (const check of checks) {
    if (check.status === "fail") {
      blockers.push(`contract_check_failed:${check.id}`);
    }
  }

  const contractStatus: ContractStatus = blockers.length === 0 ? "pass" : "fail";
  const correlationKey = createDnsCorrelationKey({
    providerId: input.adapter.providerId,
    capabilityProviderId: input.capability.providerId,
    fixture,
    checks,
    warnings: [...warnings].sort((a, b) => a.localeCompare(b)),
    blockers: [...new Set(blockers)].sort((a, b) => a.localeCompare(b)),
    contractStatus,
  });

  return {
    providerId: input.adapter.providerId,
    contractStatus,
    checks,
    warnings: [...warnings].sort((a, b) => a.localeCompare(b)),
    blockers: [...new Set(blockers)].sort((a, b) => a.localeCompare(b)),
    correlationKey,
  };
}
