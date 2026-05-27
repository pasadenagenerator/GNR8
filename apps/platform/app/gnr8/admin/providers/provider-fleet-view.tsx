type BadgeLevel = "success" | "warning" | "critical" | "neutral";
type ProviderStatus = "connected" | "not_configured";
type ProviderMode = "sandbox" | "unknown";
type CapabilityKey = "domains" | "dns" | "availability" | "registration" | "execution";

type ProviderRecord = {
  name: "Openprovider" | "Realtime Register" | "INWX" | "Netim";
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

const BADGE_THEME: Record<BadgeLevel, { bg: string; border: string; text: string }> = {
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  warning: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  critical: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  neutral: { bg: "#e5e7eb", border: "#d1d5db", text: "#1f2937" },
};

function resolveBadgeLevel(value: string | boolean): BadgeLevel {
  if (value === true) return "success";
  if (value === false) return "neutral";
  if (value === "connected") return "success";
  if (value === "not_configured") return "warning";
  if (value === "blocked") return "critical";
  return "neutral";
}

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
                <td style={{ padding: "10px 6px", borderBottom: "1px solid #f3f4f6", fontWeight: 700 }}>{provider.name}</td>
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
    </main>
  );
}
