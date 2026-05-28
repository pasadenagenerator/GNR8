import { ProviderFleetView } from "@/app/gnr8/admin/providers/provider-fleet-view";
import { PROVIDER_CONTRACT_REGISTRY } from "@/gnr8/runtime/providers/provider-contract-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROVIDER_FLEET_PAYLOAD = {
  title: "Provider Fleet Cockpit",
  subtitle: "Global provider control plane",
  note: "Fleet cockpit is read-only. Provider execution remains disabled.",
  summary: {
    providers: PROVIDER_CONTRACT_REGISTRY.length,
    connected: PROVIDER_CONTRACT_REGISTRY.filter((provider) => provider.status === "connected").length,
    readOnlyCapabilities: PROVIDER_CONTRACT_REGISTRY.reduce(
      (count, provider) =>
        count +
        Number(provider.capabilities.domains) +
        Number(provider.capabilities.dns) +
        Number(provider.capabilities.availability),
      0,
    ),
    execution: "blocked",
  },
  providers: PROVIDER_CONTRACT_REGISTRY.map((provider) => ({
    name: provider.displayName,
    category: provider.providerCategory,
    status: provider.status,
    mode: provider.environment,
    capabilities: provider.capabilities,
    execution: "blocked" as const,
  })),
} as const;

export default function ProviderFleetPage() {
  return <ProviderFleetView payload={PROVIDER_FLEET_PAYLOAD} />;
}
