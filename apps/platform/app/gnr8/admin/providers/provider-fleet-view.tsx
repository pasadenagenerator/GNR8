import Link from "next/link";
import { AIRoutingEvaluatorPreview } from "@/app/gnr8/admin/providers/ai-routing-evaluator-preview";
import { AI_ROUTING_POLICY_PREVIEW_REGISTRY } from "@/gnr8/runtime/providers/ai-routing-policy-registry";
import { PROVIDER_CONTRACT_BY_ID } from "@/gnr8/runtime/providers/provider-contract-registry";

type BadgeLevel = "success" | "warning" | "critical" | "neutral";
type ProviderStatus = "connected" | "not_configured";
type ProviderMode = "sandbox" | "unknown";
type ProviderCategory =
  | "registrar"
  | "deployment"
  | "communication"
  | "erp_accounting"
  | "edge_infrastructure"
  | "commerce"
  | "execution"
  | "source_control"
  | "ai"
  | "storage"
  | "identity";
type CapabilityKey =
  | "domains"
  | "email_delivery"
  | "transactional_email"
  | "inbound_email"
  | "dns"
  | "edge_compute"
  | "availability"
  | "registration"
  | "execution"
  | "deployments"
  | "previews"
  | "rollbacks"
  | "environment_variables"
  | "billing"
  | "subscriptions"
  | "invoices"
  | "accounting"
  | "invoicing"
  | "bookkeeping"
  | "tax"
  | "synchronization"
  | "webhooks"
  | "checkout"
  | "jobs"
  | "workflows"
  | "retries"
  | "schedules"
  | "events"
  | "repositories"
  | "branches"
  | "pull_requests"
  | "commits"
  | "model_metadata"
  | "routing_policy"
  | "inference"
  | "embeddings"
  | "multimodal"
  | "database"
  | "object_storage"
  | "cdn"
  | "routing"
  | "backups"
  | "vector_search"
  | "file_storage"
  | "auth"
  | "users"
  | "sessions"
  | "oauth"
  | "sso";
type CapabilityStatus = "working" | "disabled" | "blocked";
type CapabilityReadiness = "sandbox_verified" | "not_enabled" | "control_plane_only";

type ProviderRecord = {
  name: string;
  category: ProviderCategory;
  status: ProviderStatus;
  mode: ProviderMode;
  capabilities: Record<CapabilityKey, boolean>;
  execution: "blocked";
};

type FleetSummary = {
  providers: number;
  connected: number;
  readOnlyCapabilities: number;
  execution: "blocked";
};

export type ProviderFleetPayload = {
  title: "Provider Fleet Cockpit";
  subtitle: "Global provider control plane";
  note: "Fleet cockpit is read-only. Provider execution remains disabled.";
  summary: FleetSummary;
  providers: readonly ProviderRecord[];
};

const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  registrar: "Registrar / Domain Providers",
  deployment: "Deployment Providers",
  communication: "Communication Providers",
  erp_accounting: "ERP / Accounting Providers",
  edge_infrastructure: "Edge Infrastructure Providers",
  commerce: "Commerce / Billing Providers",
  execution: "Execution Providers",
  source_control: "Source Control Providers",
  ai: "AI Providers",
  storage: "Storage / Data Providers",
  identity: "Identity Providers",
};

const CATEGORY_ORDER: readonly ProviderCategory[] = [
  "registrar",
  "deployment",
  "communication",
  "erp_accounting",
  "edge_infrastructure",
  "commerce",
  "execution",
  "source_control",
  "ai",
  "storage",
  "identity",
];

const CATEGORY_CAPABILITY_KEYS: Readonly<Record<ProviderCategory, readonly CapabilityKey[]>> = {
  registrar: ["domains", "dns", "availability", "registration", "execution"],
  deployment: ["deployments", "previews", "rollbacks", "domains", "environment_variables"],
  communication: ["email_delivery", "transactional_email", "inbound_email", "domains", "webhooks"],
  erp_accounting: ["accounting", "invoicing", "bookkeeping", "tax", "synchronization"],
  edge_infrastructure: ["dns", "edge_compute", "object_storage", "cdn", "routing"],
  commerce: ["billing", "subscriptions", "invoices", "webhooks", "checkout"],
  execution: ["jobs", "workflows", "retries", "schedules", "events"],
  source_control: ["repositories", "branches", "pull_requests", "webhooks", "commits"],
  ai: ["model_metadata", "routing_policy", "inference", "embeddings", "multimodal"],
  storage: ["database", "object_storage", "backups", "vector_search", "file_storage"],
  identity: ["auth", "users", "sessions", "oauth", "sso"],
};

const BADGE_THEME: Record<BadgeLevel, { bg: string; border: string; text: string }> = {
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  warning: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  critical: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  neutral: { bg: "#e5e7eb", border: "#d1d5db", text: "#1f2937" },
};

function resolveBadgeLevel(value: string | boolean): BadgeLevel {
  if (value === true) return "success";
  if (value === false) return "neutral";
  if (value === "low latency") return "success";
  if (value === "high cost") return "warning";
  if (value.includes("operational")) return "success";
  if (value.includes("verified")) return "success";
  if (value.includes("limited")) return "warning";
  if (value.includes("missing")) return "warning";
  if (value.includes("disabled")) return "critical";
  if (value === "connected") return "success";
  if (value === "working") return "success";
  if (value === "sandbox_verified") return "success";
  if (value === "not_enabled") return "warning";
  if (value === "not_configured") return "warning";
  if (value === "blocked") return "critical";
  if (value === "control_plane_only") return "neutral";
  if (value === "execution_blocked") return "critical";
  if (value === "metadata_ready") return "success";
  if (value === "preview_ready") return "success";
  if (value === "missing") return "warning";
  if (value === "not_connected") return "warning";
  if (value === "no_runtime_routing") return "critical";
  if (value === "premium") return "warning";
  return "neutral";
}

type AdvisorCard = {
  title: "Current State" | "Current Limitations" | "Missing Requirements" | "Recommended Next Step";
  items: readonly string[];
};

type AIRoutingAdvisorCard = {
  title: "Current State" | "Current Limitations" | "Missing Requirements" | "Recommended Next Step";
  items: readonly { label: string; status: string }[];
};

const AI_ROUTING_READINESS_ADVISOR: readonly AIRoutingAdvisorCard[] = [
  {
    title: "Current State",
    items: [
      { label: "AI provider metadata exists", status: "metadata_ready" },
      { label: "routing policy preview exists", status: "preview_ready" },
      { label: "provider mappings are registry-backed", status: "metadata_ready" },
      { label: "no model calls are performed", status: "execution_blocked" },
    ],
  },
  {
    title: "Current Limitations",
    items: [
      { label: "no runtime routing engine", status: "no_runtime_routing" },
      { label: "no live AI credentials connected", status: "not_connected" },
      { label: "no model invocation layer", status: "missing" },
      { label: "no cost governance", status: "missing" },
    ],
  },
  {
    title: "Missing Requirements",
    items: [
      { label: "routing policy evaluator", status: "missing" },
      { label: "provider credential boundary", status: "missing" },
      { label: "model execution adapter", status: "missing" },
      { label: "audit/logging model", status: "missing" },
      { label: "cost/latency guardrails", status: "missing" },
    ],
  },
  {
    title: "Recommended Next Step",
    items: [
      { label: "define routing evaluator contract", status: "preview_ready" },
      { label: "add AI provider credential reference model", status: "preview_ready" },
      { label: "keep execution blocked until governance is ready", status: "execution_blocked" },
    ],
  },
];

const REALTIME_REGISTER_CONTRACT = PROVIDER_CONTRACT_BY_ID.realtime_register;
const AI_PROVIDER_CAPABILITY_ROWS = Object.values(PROVIDER_CONTRACT_BY_ID).filter((provider) => provider.providerCategory === "ai");

const LATENCY_CLASS_LABELS = {
  ultra_low: "ultra low latency",
  low: "low latency",
  medium: "medium latency",
} as const;

const COST_CLASS_LABELS = {
  economy: "low cost",
  balanced: "balanced cost",
  premium: "high cost",
} as const;

const CONTEXT_WINDOW_CLASS_LABELS = {
  standard: "standard context",
  extended: "extended context",
  long: "long context",
} as const;

const REALTIME_REGISTER_ADVISOR: readonly AdvisorCard[] = [
  {
    title: "Current State",
    items: ["provider placeholder initialized", "orchestration contract compatible"],
  },
  {
    title: "Current Limitations",
    items: ["no credentials configured", "no provider APIs connected"],
  },
  {
    title: "Missing Requirements",
    items: ["provider auth layer", "provider capability normalization", "sandbox verification"],
  },
  {
    title: "Recommended Next Step",
    items: ["implement read-only provider inventory", "validate provider contract compatibility"],
  },
];

function DotBadge(props: { level: BadgeLevel }) {
  const theme = BADGE_THEME[props.level];
  return <span aria-hidden style={{ display: "inline-flex", width: 10, height: 10, minWidth: 10, minHeight: 10, borderRadius: 999, border: `1px solid ${theme.border}`, background: theme.bg }} />;
}

function Pill(props: { label: string; value: string | boolean }) {
  const level = resolveBadgeLevel(props.value);
  const theme = BADGE_THEME[level];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12, lineHeight: "16px", padding: "3px 8px", whiteSpace: "nowrap" }}>
      {props.label}
      <DotBadge level={level} />
    </span>
  );
}

function SummaryCard(props: { label: string; value: string }) {
  const level = resolveBadgeLevel(props.value);
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
      <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, letterSpacing: 0.2 }}>{props.label}</div>
      <div style={{ color: "#111827", fontSize: 18, fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
        {props.value}
        <DotBadge level={level} />
      </div>
    </section>
  );
}

const REGISTRAR_CAPABILITY_KEYS = ["domains", "dns", "availability", "registration", "execution"] as const satisfies readonly CapabilityKey[];
type RegistrarCapabilityKey = (typeof REGISTRAR_CAPABILITY_KEYS)[number];

const CAPABILITY_LABELS: Record<RegistrarCapabilityKey, string> = {
  domains: "Domains",
  dns: "DNS",
  availability: "Availability",
  registration: "Registration",
  execution: "Execution",
};

const CAPABILITY_STATUS_DETAILS: Record<RegistrarCapabilityKey, { status: CapabilityStatus; readiness: CapabilityReadiness; explanation: string }> = {
  domains: { status: "working", readiness: "sandbox_verified", explanation: "Real provider domain inventory reads are operational through Openprovider read-only APIs." },
  dns: { status: "working", readiness: "sandbox_verified", explanation: "Real provider DNS inventory reads are operational through Openprovider read-only APIs." },
  availability: { status: "working", readiness: "sandbox_verified", explanation: "Real provider availability lookups are operational through Openprovider read-only APIs." },
  registration: { status: "disabled", readiness: "not_enabled", explanation: "Provider registration flows are intentionally blocked by execution boundaries." },
  execution: { status: "blocked", readiness: "control_plane_only", explanation: "Queue, worker, and provider execution layers remain intentionally disabled." },
};

function groupProvidersByCategory(providers: readonly ProviderRecord[]): Readonly<Record<ProviderCategory, ProviderRecord[]>> {
  const grouped: Record<ProviderCategory, ProviderRecord[]> = {
    registrar: [],
    deployment: [],
    communication: [],
    erp_accounting: [],
    edge_infrastructure: [],
    commerce: [],
    execution: [],
    source_control: [],
    ai: [],
    storage: [],
    identity: [],
  };
  for (const provider of providers) grouped[provider.category].push(provider);
  return grouped;
}

function resolveProviderDisplayName(providerId: keyof typeof PROVIDER_CONTRACT_BY_ID): string {
  return PROVIDER_CONTRACT_BY_ID[providerId]?.displayName ?? providerId;
}

export function ProviderFleetView(props: { payload: ProviderFleetPayload }) {
  const providersByCategory = groupProvidersByCategory(props.payload.providers);

  return (
    <main style={{ padding: 16, maxWidth: 1180, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial", background: "#f3f6fb" }}>
      <section style={{ border: "1px solid #dbe3ea", borderRadius: 12, padding: 14, background: "#ffffff" }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>{props.payload.title}</h1>
        <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 700 }}>{props.payload.subtitle}</p>
      </section>

      <section style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <SummaryCard label="Providers" value={String(props.payload.summary.providers)} />
        <SummaryCard label="Connected" value={String(props.payload.summary.connected)} />
        <SummaryCard label="Read-only Capabilities" value={String(props.payload.summary.readOnlyCapabilities)} />
        <SummaryCard label="Execution" value={props.payload.summary.execution} />
      </section>

      {CATEGORY_ORDER.map((category) => {
        const categoryProviders = providersByCategory[category];
        if (categoryProviders.length === 0) return null;
        return (
          <section key={category} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{CATEGORY_LABELS[category]}</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Provider</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Mode</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Capabilities</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Execution</th>
                </tr>
              </thead>
              <tbody>
                {categoryProviders.map((provider) => (
                  <tr key={provider.name}>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6", fontWeight: 700 }}>
                      {provider.name === "Openprovider" ? <Link href="/gnr8/admin/providers/openprovider" style={{ color: "#0f172a", textDecoration: "underline" }}>{provider.name}</Link> : provider.name}
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}><Pill label={provider.status} value={provider.status} /></td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}><Pill label={provider.mode} value={provider.mode === "sandbox"} /></td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {CATEGORY_CAPABILITY_KEYS[provider.category].map((capability) => <Pill key={capability} label={capability} value={provider.capabilities[capability]} />)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}><Pill label={provider.execution} value={provider.execution} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>AI Provider Capability Matrix</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Provider</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Status</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Model Families</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Strengths</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Routing Hints</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Latency</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Cost</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Context</th>
            </tr>
          </thead>
          <tbody>
            {AI_PROVIDER_CAPABILITY_ROWS.map((provider) => (
              <tr key={provider.providerId}>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6", fontWeight: 700 }}>{provider.displayName}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Pill label={provider.status} value={provider.status} />
                    <Pill label={provider.readiness[1]} value={provider.readiness[1]} />
                    <Pill label={provider.boundaries[0]} value={provider.boundaries[0]} />
                  </div>
                </td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>{provider.aiRouting?.modelFamilies.join(", ") ?? "n/a"}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>{provider.aiRouting?.strengths.join(", ") ?? "n/a"}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>{provider.aiRouting?.routingHints.join(", ") ?? "n/a"}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                  <Pill label={provider.aiRouting ? LATENCY_CLASS_LABELS[provider.aiRouting.latencyClass] : "n/a"} value={provider.aiRouting ? LATENCY_CLASS_LABELS[provider.aiRouting.latencyClass] : "n/a"} />
                </td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                  <Pill label={provider.aiRouting ? COST_CLASS_LABELS[provider.aiRouting.costClass] : "n/a"} value={provider.aiRouting ? COST_CLASS_LABELS[provider.aiRouting.costClass] : "n/a"} />
                </td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>{provider.aiRouting ? CONTEXT_WINDOW_CLASS_LABELS[provider.aiRouting.contextWindowClass] : "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "10px 0 0 0", color: "#374151", fontSize: 13 }}>
          AI routing metadata is advisory only. No model calls are performed.
        </p>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>AI Routing Policy Preview</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Task Type</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Preferred Provider</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Secondary Provider</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Routing Strategy</th>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            {AI_ROUTING_POLICY_PREVIEW_REGISTRY.map((row) => (
              <tr key={row.taskType}>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6", fontWeight: 700 }}>{row.taskType}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>{resolveProviderDisplayName(row.preferredProviderId)}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>{resolveProviderDisplayName(row.secondaryProviderId)}</td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}><Pill label={row.routingStrategy} value={row.routingStrategy} /></td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>{row.reasoning}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "10px 0 0 0", color: "#374151", fontSize: 13 }}>
          Routing policy preview is strategic only. No live AI routing is performed.
        </p>
      </section>

      <AIRoutingEvaluatorPreview />

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <p style={{ margin: 0, color: "#374151", fontSize: 13 }}>Fleet cockpit is read-only. Provider execution remains disabled.</p>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Provider Capability Status</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {REGISTRAR_CAPABILITY_KEYS.map((capability) => {
            const details = CAPABILITY_STATUS_DETAILS[capability];
            return (
              <section key={capability} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{CAPABILITY_LABELS[capability]}</h3>
                <div style={{ marginTop: 4 }}><strong>Status:</strong> <Pill label={details.status} value={details.status} /></div>
                <p style={{ margin: "8px 0 0 0", color: "#374151" }}><strong>Explanation:</strong> {details.explanation}</p>
                <div style={{ marginTop: 8 }}><strong>Readiness:</strong> <Pill label={details.readiness} value={details.readiness} /></div>
              </section>
            );
          })}
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>AI Routing Readiness Advisor</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {AI_ROUTING_READINESS_ADVISOR.map((card) => (
            <section key={card.title} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{card.title}</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {card.items.map((item) => (
                  <li key={item.label} style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>{item.label}<DotBadge level={resolveBadgeLevel(item.status)} /></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Realtime Register Contract Readiness</h2>
        <p style={{ margin: "0 0 10px 0", color: "#374151", fontSize: 13 }}>
          Placeholder provider contract in the fleet cockpit. Explicitly separate from Openprovider operational provider.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Provider Identity</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>providerId: {REALTIME_REGISTER_CONTRACT.providerId}</li>
              <li>providerType: {REALTIME_REGISTER_CONTRACT.providerType}</li>
              <li>environment: {REALTIME_REGISTER_CONTRACT.environment}</li>
            </ul>
          </section>
          <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Capabilities</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {CATEGORY_CAPABILITY_KEYS[REALTIME_REGISTER_CONTRACT.providerCategory].map((capability) => (
                <li key={capability}>{capability}: {String(REALTIME_REGISTER_CONTRACT.capabilities[capability])}</li>
              ))}
            </ul>
          </section>
          <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Readiness</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {REALTIME_REGISTER_CONTRACT.readiness.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Boundary</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {REALTIME_REGISTER_CONTRACT.boundaries.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginTop: 10 }}>
          {REALTIME_REGISTER_ADVISOR.map((card) => (
            <section key={card.title} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{card.title}</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {card.items.map((item) => (
                  <li key={item} style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>{item}<DotBadge level={resolveBadgeLevel(item)} /></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
