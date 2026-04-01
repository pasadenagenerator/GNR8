import Link from "next/link";

import type { CommandCenterAgencySummary } from "@/gnr8/command-center/command-center-read-model";

type ExistingAgenciesTableProps = {
  agencies: CommandCenterAgencySummary[];
};

export function ExistingAgenciesTable({ agencies }: ExistingAgenciesTableProps) {
  return (
    <section
      style={{
        marginTop: 16,
        border: "1px solid #d1d5db",
        borderRadius: 12,
        background: "#fff",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 20 }}>Existing Agencies</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "8px 6px" }}>Name</th>
              <th style={{ padding: "8px 6px" }}>Slug</th>
              <th style={{ padding: "8px 6px" }}>Agency ID</th>
              <th style={{ padding: "8px 6px" }}>Created At</th>
              <th style={{ padding: "8px 6px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agencies.length === 0 ? (
              <tr>
                <td style={{ padding: "10px 6px", color: "#6b7280" }} colSpan={5}>
                  No agencies available.
                </td>
              </tr>
            ) : (
              agencies.map((agency) => (
                <tr key={agency.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 6px" }}>{String(agency.name ?? "").trim() || "-"}</td>
                  <td style={{ padding: "10px 6px" }}>{String(agency.slug ?? "").trim() || "-"}</td>
                  <td
                    style={{
                      padding: "10px 6px",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                    }}
                    title={String(agency.id ?? "").trim() || undefined}
                  >
                    {String(agency.id ?? "").trim() || "-"}
                  </td>
                  <td style={{ padding: "10px 6px" }}>{agency.created_at ?? "-"}</td>
                  <td style={{ padding: "10px 6px" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        href={`/gnr8/admin/agencies/${encodeURIComponent(agency.id)}/dashboard`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#0f172a",
                          textDecoration: "none",
                          fontSize: 12,
                        }}
                      >
                        Agency Dashboard
                      </Link>
                      <Link
                        href={`/gnr8/admin/agencies/${encodeURIComponent(agency.id)}/settings`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#0f172a",
                          textDecoration: "none",
                          fontSize: 12,
                        }}
                      >
                        Agency Settings
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
