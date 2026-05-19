import {
  DNS_PROVIDER_CAPABILITIES,
  type DnsProviderAdapterContract,
  type DnsProviderId,
} from "@/gnr8/runtime/dns/dns-provider-types";
import {
  createManualDnsProviderAdapterFixture,
  runDnsProviderAdapterContractTest,
  type DnsProviderAdapterContractReport,
} from "@/gnr8/runtime/dns/provider-adapter-contract-test";
import { createMockDnsProviderAdapter } from "@/gnr8/runtime/dns/mock-provider-adapter";
import { createOpenproviderSandboxAdapter } from "@/gnr8/runtime/dns/openprovider-sandbox-adapter";

export type DnsProviderAdapterRegistryEntry = {
  providerId: DnsProviderId;
  adapter: DnsProviderAdapterContract | null;
};

const PROVIDER_ORDER: readonly DnsProviderId[] = [
  "mock_provider",
  "manual",
  "openprovider",
  "realtime_register",
  "netim",
  "inwx",
];

const MANUAL_ADAPTER_FIXTURE: DnsProviderAdapterContract = createManualDnsProviderAdapterFixture();

const ADAPTER_REGISTRY: Record<DnsProviderId, DnsProviderAdapterContract | null> = {
  mock_provider: createMockDnsProviderAdapter(),
  manual: MANUAL_ADAPTER_FIXTURE,
  openprovider: createOpenproviderSandboxAdapter(),
  realtime_register: null,
  netim: null,
  inwx: null,
};

export function getDnsProviderAdapter(providerId: string): DnsProviderAdapterContract | null {
  if (!Object.prototype.hasOwnProperty.call(ADAPTER_REGISTRY, providerId)) {
    return null;
  }
  return ADAPTER_REGISTRY[providerId as DnsProviderId];
}

export function listDnsProviderAdapters(): DnsProviderAdapterRegistryEntry[] {
  return PROVIDER_ORDER.map((providerId) => ({
    providerId,
    adapter: ADAPTER_REGISTRY[providerId],
  }));
}

export function hasDnsProviderAdapter(providerId: string): boolean {
  return getDnsProviderAdapter(providerId) !== null;
}

export async function assertDnsProviderAdapterContract(
  providerId: string,
): Promise<DnsProviderAdapterContractReport | null> {
  const adapter = getDnsProviderAdapter(providerId);
  if (!adapter) {
    return null;
  }

  return runDnsProviderAdapterContractTest({
    adapter,
    capability: DNS_PROVIDER_CAPABILITIES[adapter.providerId],
  });
}
