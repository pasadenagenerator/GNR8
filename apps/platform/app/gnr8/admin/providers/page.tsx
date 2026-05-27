import { ProviderFleetView } from "@/app/gnr8/admin/providers/provider-fleet-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROVIDER_FLEET_PAYLOAD = {
  title: "Provider Fleet Cockpit",
  subtitle: "Global provider control plane",
  note: "Fleet cockpit is read-only. Provider execution remains disabled.",
  summary: {
    providers: 4,
    connected: 1,
    readOnlyCapabilities: 3,
    execution: "blocked",
  },
  providers: [
    {
      name: "Openprovider",
      status: "connected",
      mode: "sandbox",
      capabilities: {
        domains: true,
        dns: true,
        availability: true,
        registration: false,
        execution: false,
      },
      execution: "blocked",
    },
    {
      name: "Realtime Register",
      status: "not_configured",
      mode: "unknown",
      capabilities: {
        domains: false,
        dns: false,
        availability: false,
        registration: false,
        execution: false,
      },
      execution: "blocked",
    },
    {
      name: "INWX",
      status: "not_configured",
      mode: "unknown",
      capabilities: {
        domains: false,
        dns: false,
        availability: false,
        registration: false,
        execution: false,
      },
      execution: "blocked",
    },
    {
      name: "Netim",
      status: "not_configured",
      mode: "unknown",
      capabilities: {
        domains: false,
        dns: false,
        availability: false,
        registration: false,
        execution: false,
      },
      execution: "blocked",
    },
  ],
} as const;

export default function ProviderFleetPage() {
  return <ProviderFleetView payload={PROVIDER_FLEET_PAYLOAD} />;
}
