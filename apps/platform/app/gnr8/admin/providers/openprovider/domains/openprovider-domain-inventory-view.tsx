import type { OpenproviderDomainInventoryResult } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-inventory";

type BadgeLevel = "success" | "warning" | "critical" | "neutral";
type InventoryStatus = "empty" | "loaded" | "failed_closed";
type InventoryPayload = OpenproviderDomainInventoryResult & { error?: string };

const BADGE_THEME: Record<BadgeLevel, { bg: string; border: string; text: string }> = {
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  warning: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  critical: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  neutral: { bg: "#e5e7eb", border: "#d1d5db", text: "#1f2937" },
};

function Badge(props: { level: BadgeLevel; text: string }) {
  const theme = BADGE_THEME[props.level];
  return (
    <span
      style={{
        display: "inline-block",
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        color: theme.text,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {props.text}
    </span>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "unknown";
  return parsed.toISOString();
}

function deriveInventoryStatus(payload: InventoryPayload): InventoryStatus {
  if (payload.error || payload.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED")) return "failed_closed";
  if (payload.domains.length === 0) return "empty";
  return "loaded";
}

function resolveStatusBadge(status: InventoryStatus): { level: BadgeLevel; text: string } {
  if (status === "loaded") return { level: "success", text: "loaded" };
  if (status === "empty") return { level: "warning", text: "empty" };
  return { level: "critical", text: "failed_closed" };
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
      <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, letterSpacing: 0.2 }}>{props.label}</div>
      <div style={{ color: "#111827", fontSize: 18, fontWeight: 700, marginTop: 4 }}>{props.value}</div>
    </section>
  );
}

export function OpenproviderDomainInventoryView(props: { payload: InventoryPayload }) {
  const inventoryStatus = deriveInventoryStatus(props.payload);
  const statusBadge = resolveStatusBadge(inventoryStatus);

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 1080,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <section
        style={{
          border: "1px solid #dbe3ea",
          borderRadius: 12,
          padding: 14,
          background: "#ffffff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Openprovider Domain Inventory</h1>
        <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 700 }}>Read-only provider boundary active</p>
      </section>

      <section
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryCard label="Provider:" value="openprovider" />
        <SummaryCard label="Mode:" value="read only" />
        <SummaryCard label="Execution:" value="blocked" />
        <SummaryCard label="Domains:" value={String(props.payload.domains.length)} />
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Inventory Summary</h2>
        <div><strong>fetchedAt:</strong> {formatDate(props.payload.fetchedAt)}</div>
        <div><strong>diagnostic count:</strong> {props.payload.diagnostics.length}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <strong>inventory status:</strong>
          <Badge level={statusBadge.level} text={statusBadge.text} />
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Domains</h2>
        {props.payload.domains.length === 0 ? (
          <p style={{ margin: 0, color: "#4b5563" }}>No domains found in current Openprovider sandbox account.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 6px" }}>domain</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 6px" }}>status</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 6px" }}>expiration</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 6px" }}>nameservers count</th>
                </tr>
              </thead>
              <tbody>
                {props.payload.domains.map((domain) => (
                  <tr key={domain.domain}>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "8px 6px" }}>{domain.domain}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "8px 6px" }}>{domain.status || "unknown"}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "8px 6px" }}>{formatDate(domain.expiryDate)}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: "8px 6px" }}>{domain.nameservers.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Diagnostics</summary>
        <div style={{ marginTop: 10 }}>
          {props.payload.diagnostics.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {props.payload.diagnostics.map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#4b5563" }}>No diagnostics available.</p>
          )}
        </div>
      </details>

      <details style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Raw payload</summary>
        <pre
          style={{
            marginTop: 10,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 8,
            padding: 12,
          }}
        >
          {JSON.stringify(props.payload, null, 2)}
        </pre>
      </details>
    </main>
  );
}
