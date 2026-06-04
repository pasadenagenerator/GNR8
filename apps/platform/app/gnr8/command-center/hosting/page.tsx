import Link from "next/link";

import { getCommandCenterSitesViewModel } from "../_lib/command-center-view-model";

function valueOrDash(value: string | number | null | undefined): string {
  const normalized = String(value ?? "").trim();
  return normalized || "-";
}

export default async function CommandCenterHostingPage() {
  const model = await getCommandCenterSitesViewModel();
  const rows = model.rows;

  return (
    <>
      <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <header style={{ marginBottom: 10 }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 28 }}>Hosting Overview</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            Read-only serving state for active runtime versions, domains, and hosting health.
          </p>
        </header>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", background: "#f9fafb" }}>
            <strong>Sites:</strong> {rows.length}
          </span>
          <span style={{ border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 10px", color: "#166534", background: "#f0fdf4" }}>
            <strong>Live:</strong> {model.portfolioMetrics.live_sites}
          </span>
          <span style={{ border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", color: "#991b1b", background: "#fff1f2" }}>
            <strong>Needs Attention:</strong> {model.portfolioMetrics.needs_attention_sites}
          </span>
        </div>
      </section>

      <section style={{ marginTop: 12, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        {rows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No sites are available for hosting operations.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#475569" }}>
                  <th style={{ padding: "8px 6px" }}>Site</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                  <th style={{ padding: "8px 6px" }}>Active Version</th>
                  <th style={{ padding: "8px 6px" }}>Working Domain</th>
                  <th style={{ padding: "8px 6px" }}>Latest Runtime State</th>
                  <th style={{ padding: "8px 6px" }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.summary.site_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "9px 6px", color: "#111827", fontWeight: 700 }}>
                      {valueOrDash(row.summary.client_name ?? row.summary.domain ?? row.summary.site_id)}
                      <div style={{ marginTop: 3, fontSize: 11, color: "#64748b", fontWeight: 400 }}>{row.summary.site_id}</div>
                    </td>
                    <td style={{ padding: "9px 6px" }}>{row.migration.status}</td>
                    <td style={{ padding: "9px 6px", fontFamily: "monospace" }}>{valueOrDash(row.migration.latest_site_version_id)}</td>
                    <td style={{ padding: "9px 6px" }}>{valueOrDash(row.summary.domain)}</td>
                    <td style={{ padding: "9px 6px" }}>{valueOrDash(row.migration.latest_runtime_state)}</td>
                    <td style={{ padding: "9px 6px" }}>
                      <Link href={`/gnr8/command-center/hosting/${encodeURIComponent(row.summary.site_id)}`} style={{ color: "#1d4ed8" }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
