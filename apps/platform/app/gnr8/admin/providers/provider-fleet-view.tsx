type BadgeLevel = "success" | "warning" | "critical" | "neutral";
type ProviderStatus = "connected" | "not_configured";
type ProviderMode = "sandbox" | "unknown";
type CapabilityKey = "domains" | "dns" | "availability" | "registration" | "execution";
type CapabilityStatus = "working" | "disabled" | "blocked";
type CapabilityReadiness = "sandbox_verified" | "not_enabled" | "control_plane_only";

type ProviderRecord = {
  name: "Openprovider" | "Realtime Register" | "INWX" | "Netim";
  status: ProviderStatus;
  mode: ProviderMode;
  capabilities: Record<CapabilityKey, boolean>;
  execution: "blocked";
};

type PlaceholderIdentity = {
  providerId: "realtime_register";
  providerType: "registrar";
  environment: "unknown";
};

type PlaceholderContract = {
  capabilities: Record<CapabilityKey, false>;
  readiness: readonly ["not_configured", "control_plane_only"];
  boundary: readonly ["execution_blocked", "read_only"];
  identity: PlaceholderIdentity;
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

const BADGE_THEME: Record<BadgeLevel, { bg: string; border: string; text: string }> = {
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  warning: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  critical: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  neutral: { bg: "#e5e7eb", border: "#d1d5db", text: "#1f2937" },
};

function resolveBadgeLevel(value: string | boolean): BadgeLevel {
  if (value === true) return "success";
  if (value === false) return "neutral";
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
  if (value === "control_plane_only") return "critical";
  return "neutral";
}

type AdvisorCard = {
  title: "Current State" | "Current Limitations" | "Missing Requirements" | "Recommended Next Step";
  items: readonly string[];
};

const FLEET_READINESS_ADVISOR: readonly AdvisorCard[] = [
  {
    title: "Current State",
    items: [
      "one provider connected",
      "multi-provider registry initialized",
      "provider fleet navigation operational",
    ],
  },
  {
    title: "Current Limitations",
    items: [
      "only Openprovider connected",
      "no production execution providers",
      "no orchestration layer",
    ],
  },
  {
    title: "Missing Requirements",
    items: [
      "provider abstraction layer",
      "execution governance",
      "multi-provider failover",
      "production verification",
    ],
  },
  {
    title: "Recommended Next Step",
    items: [
      "connect second provider",
      "normalize provider capabilities",
      "introduce provider orchestration contracts",
    ],
  },
];

const REALTIME_REGISTER_CONTRACT: PlaceholderContract = {
  capabilities: {
    domains: false,
    dns: false,
    availability: false,
    registration: false,
    execution: false,
  },
  readiness: ["not_configured", "control_plane_only"],
  boundary: ["execution_blocked", "read_only"],
  identity: {
    providerId: "realtime_register",
    providerType: "registrar",
    environment: "unknown",
  },
};

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
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        width: 10,
        height: 10,
        minWidth: 10,
        minHeight: 10,
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
      }}
    />
  );
}

function Pill(props: { label: string; value: string | boolean }) {
  const level = resolveBadgeLevel(props.value);
  const theme = BADGE_THEME[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        color: theme.text,
        fontSize: 12,
        lineHeight: "16px",
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
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

const CAPABILITY_KEYS: CapabilityKey[] = ["domains", "dns", "availability", "registration", "execution"];
const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  domains: "Domains",
  dns: "DNS",
  availability: "Availability",
  registration: "Registration",
  execution: "Execution",
};

const CAPABILITY_STATUS_DETAILS: Record<
  CapabilityKey,
  { status: CapabilityStatus; readiness: CapabilityReadiness; explanation: string }
> = {
  domains: {
    status: "working",
    readiness: "sandbox_verified",
    explanation: "Real provider domain inventory reads are operational through Openprovider read-only APIs.",
  },
  dns: {
    status: "working",
    readiness: "sandbox_verified",
    explanation: "Real provider DNS inventory reads are operational through Openprovider read-only APIs.",
  },
  availability: {
    status: "working",
    readiness: "sandbox_verified",
    explanation: "Real provider availability lookups are operational through Openprovider read-only APIs.",
  },
  registration: {
    status: "disabled",
    readiness: "not_enabled",
    explanation: "Provider registration flows are intentionally blocked by execution boundaries.",
  },
  execution: {
    status: "blocked",
    readiness: "control_plane_only",
    explanation: "Queue, worker, and provider execution layers remain intentionally disabled.",
  },
};

export function ProviderFleetView(props: { payload: ProviderFleetPayload }) {
  return (
    <main
      style={{
        padding: 16,
        maxWidth: 1180,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <section style={{ border: "1px solid #dbe3ea", borderRadius: 12, padding: 14, background: "#ffffff" }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>{props.payload.title}</h1>
        <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 700 }}>{props.payload.subtitle}</p>
      </section>

      <section
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryCard label="Providers" value={String(props.payload.summary.providers)} />
        <SummaryCard label="Connected" value={String(props.payload.summary.connected)} />
        <SummaryCard label="Read-only Capabilities" value={String(props.payload.summary.readOnlyCapabilities)} />
        <SummaryCard label="Execution" value={props.payload.summary.execution} />
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
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
            {props.payload.providers.map((provider) => (
              <tr key={provider.name}>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6", fontWeight: 700 }}>
                  {provider.name === "Openprovider" ? (
                    <Link href="/gnr8/admin/providers/openprovider" style={{ color: "#0f172a", textDecoration: "underline" }}>
                      {provider.name}
                    </Link>
                  ) : (
                    provider.name
                  )}
                </td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                  <Pill label={provider.status} value={provider.status} />
                </td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                  <Pill label={provider.mode} value={provider.mode === "sandbox"} />
                </td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {CAPABILITY_KEYS.map((capability) => (
                      <Pill key={capability} label={capability} value={provider.capabilities[capability]} />
                    ))}
                  </div>
                </td>
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6" }}>
                  <Pill label={provider.execution} value={provider.execution} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "10px 0 0 0", color: "#374151", fontSize: 13 }}>
          Fleet cockpit is read-only. Provider execution remains disabled.
        </p>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Provider Capability Status</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {CAPABILITY_KEYS.map((capability) => {
            const details = CAPABILITY_STATUS_DETAILS[capability];
            return (
              <section key={capability} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{CAPABILITY_LABELS[capability]}</h3>
                <div style={{ marginTop: 4 }}>
                  <strong>Status:</strong> <Pill label={details.status} value={details.status} />
                </div>
                <p style={{ margin: "8px 0 0 0", color: "#374151" }}>
                  <strong>Explanation:</strong> {details.explanation}
                </p>
                <div style={{ marginTop: 8 }}>
                  <strong>Readiness:</strong> <Pill label={details.readiness} value={details.readiness} />
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Readiness Advisor</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {FLEET_READINESS_ADVISOR.map((card) => (
            <section key={card.title} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{card.title}</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {card.items.map((item) => (
                  <li key={item} style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    {item}
                    <DotBadge level={resolveBadgeLevel(item)} />
                  </li>
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
              <li>providerId: {REALTIME_REGISTER_CONTRACT.identity.providerId}</li>
              <li>providerType: {REALTIME_REGISTER_CONTRACT.identity.providerType}</li>
              <li>environment: {REALTIME_REGISTER_CONTRACT.identity.environment}</li>
            </ul>
          </section>
          <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Capabilities</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {CAPABILITY_KEYS.map((capability) => (
                <li key={capability}>
                  {capability}: {String(REALTIME_REGISTER_CONTRACT.capabilities[capability])}
                </li>
              ))}
            </ul>
          </section>
          <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Readiness</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {REALTIME_REGISTER_CONTRACT.readiness.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>Boundary</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {REALTIME_REGISTER_CONTRACT.boundary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginTop: 10 }}>
          {REALTIME_REGISTER_ADVISOR.map((card) => (
            <section key={card.title} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{card.title}</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {card.items.map((item) => (
                  <li key={item} style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    {item}
                    <DotBadge level={resolveBadgeLevel(item)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
import Link from "next/link";
