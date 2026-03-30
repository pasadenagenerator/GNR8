import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import { getAgencyDashboardReadModel, listAgencyScopeOptions } from "@/gnr8/agency/agency-dashboard-read-model";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  agencyId?: string;
  needsAttention?: string;
};

function normalizeAgencyId(value: string | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeNeedsAttention(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function shortId(value: string): string {
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}...`;
}

export default async function AgencyDashboardPage(props: { searchParams?: Promise<SearchParams> }) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") {
      redirect("/login");
    }
    if (message.startsWith("Forbidden")) {
      redirect("/superadmin");
    }
    throw error;
  }

  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined;
  const selectedAgencyId = normalizeAgencyId(resolvedSearchParams?.agencyId);
  const showNeedsAttentionOnly = normalizeNeedsAttention(resolvedSearchParams?.needsAttention);

  const agencyOptions = await listAgencyScopeOptions();
  const selectedAgencyExists = selectedAgencyId
    ? agencyOptions.some((agency) => agency.agency_id === selectedAgencyId)
    : false;

  const readModel = selectedAgencyId && selectedAgencyExists
    ? await getAgencyDashboardReadModel({ agencyId: selectedAgencyId, limit: 120, simulationLimit: 120 })
    : null;

  const filteredSiteRows = showNeedsAttentionOnly && readModel
    ? readModel.site_rows.filter((row) => row.needs_attention)
    : readModel?.site_rows ?? [];

  const unassignedClientSites = readModel?.site_rows.filter((row) => row.client_id == null).length ?? 0;
  const hasNoCostSignal = readModel?.site_rows.some((row) => row.cost_completeness_status === "NO_SIGNAL") ?? false;

  return (
    <main
      style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: 24,
        background: "linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        minHeight: "100vh",
      }}
    >
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, color: "#0f172a" }}>Agency Dashboard</h1>
        <p style={{ margin: 0, color: "#334155", maxWidth: 900 }}>
          Agency-facing migration and economics view. This is a scoped V1 surface that only loads one agency portfolio at a time.
        </p>
        <div
          style={{
            border: "1px solid #f59e0b",
            background: "#fffbeb",
            color: "#92400e",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 13,
            width: "fit-content",
          }}
        >
          Internal-only temporary mode: superadmin selects one agency scope (impersonation-style view).
        </div>
      </header>

      <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <form method="get" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 280 }}>
            <span style={{ fontSize: 12, color: "#334155" }}>Agency scope</span>
            <select
              name="agencyId"
              defaultValue={selectedAgencyId ?? ""}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}
            >
              <option value="">Select one agency...</option>
              {agencyOptions.map((agency) => (
                <option key={agency.agency_id} value={agency.agency_id}>
                  {agency.agency_name?.trim() || agency.agency_id}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13, color: "#334155" }}>
            <input type="checkbox" name="needsAttention" value="1" defaultChecked={showNeedsAttentionOnly} />
            Needs attention only
          </label>

          <button
            type="submit"
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              cursor: "pointer",
            }}
          >
            Apply
          </button>

          <Link
            href="/gnr8/agency"
            style={{
              height: 38,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Reset
          </Link>
        </form>
      </section>

      {!selectedAgencyId ? (
        <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>No agency in scope</h2>
          <p style={{ marginBottom: 0, color: "#475569" }}>
            Select an agency above to load portfolio metrics and site operations. This view fails closed until a single agency scope is chosen.
          </p>
        </section>
      ) : null}

      {selectedAgencyId && !selectedAgencyExists ? (
        <section style={{ marginTop: 16, border: "1px solid #fecaca", borderRadius: 12, background: "#fff5f5", padding: 16 }}>
          <h2 style={{ marginTop: 0, color: "#991b1b" }}>No agency found for selected scope</h2>
          <p style={{ marginBottom: 0, color: "#7f1d1d" }}>
            The selected agency id does not exist in the current environment: <code>{selectedAgencyId}</code>
          </p>
        </section>
      ) : null}

      {readModel ? (
        <>
          <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, color: "#0f172a" }}>
                {readModel.agency.agency_name?.trim() || `Agency ${shortId(readModel.agency.agency_id)}`}
              </h2>
              <span style={{ fontSize: 12, color: "#334155" }}>Agency ID: {readModel.agency.agency_id}</span>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <MetricCard label="Total Sites" value={String(readModel.summary.total_sites)} />
              <MetricCard label="Live Sites" value={String(readModel.summary.live_sites)} tone="good" />
              <MetricCard label="Needs Attention" value={String(readModel.summary.needs_attention_sites)} tone="warn" />
              <MetricCard label="Progress" value={formatPercent(readModel.summary.progress_percentage)} />
              <MetricCard label="Total Estimated Cost" value={formatMoney(readModel.summary.total_estimated_cost)} />
              <MetricCard label="Total Simulated Revenue" value={formatMoney(readModel.summary.total_simulated_revenue)} tone="good" />
              <MetricCard label="Total Margin" value={formatMoney(readModel.summary.total_margin)} tone={readModel.summary.total_margin >= 0 ? "good" : "warn"} />
            </div>

            {readModel.instrumentation.fallback_used ? (
              <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
                Read model fallback mode: {readModel.instrumentation.fallback_reason ?? "unknown"}
              </p>
            ) : null}
            {readModel.instrumentation.optional_enrichment_failed ? (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
                Optional enrichment is partially unavailable; ownership and migration scope remain intact.
              </p>
            ) : null}
            {readModel.instrumentation.plan_simulation_error_count > 0 ? (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
                Pricing simulation unavailable for {readModel.instrumentation.plan_simulation_error_count} site
                {readModel.instrumentation.plan_simulation_error_count === 1 ? "" : "s"}.
              </p>
            ) : null}
            <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#334155" }}>
              Read model queries this render: {readModel.instrumentation.query_count}
            </p>
          </section>

          <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 16 }}>
            <h2 style={{ marginTop: 0, color: "#0f172a" }}>Client Overview</h2>

            {readModel.client_overview.length === 0 ? (
              <p style={{ marginBottom: 0, color: "#475569" }}>No client assignments found for this agency yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
                      <th style={{ padding: "8px 10px" }}>Client</th>
                      <th style={{ padding: "8px 10px" }}>Sites</th>
                      <th style={{ padding: "8px 10px" }}>Estimated Cost</th>
                      <th style={{ padding: "8px 10px" }}>Simulated Revenue</th>
                      <th style={{ padding: "8px 10px" }}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readModel.client_overview.map((client) => (
                      <tr key={client.client_id ?? "__UNASSIGNED__"} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px" }}>{client.client_name?.trim() || "Unassigned"}</td>
                        <td style={{ padding: "8px 10px" }}>{client.site_count}</td>
                        <td style={{ padding: "8px 10px" }}>{formatMoney(client.total_estimated_cost)}</td>
                        <td style={{ padding: "8px 10px" }}>{formatMoney(client.total_simulated_revenue)}</td>
                        <td style={{ padding: "8px 10px", color: client.total_margin >= 0 ? "#166534" : "#991b1b" }}>
                          {formatMoney(client.total_margin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {unassignedClientSites > 0 ? (
              <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
                {unassignedClientSites} site{unassignedClientSites === 1 ? "" : "s"} still need client assignment.
              </p>
            ) : null}
          </section>

          <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 16 }}>
            <h2 style={{ marginTop: 0, color: "#0f172a" }}>Site Table</h2>

            {readModel.site_rows.length === 0 ? (
              <p style={{ marginBottom: 0, color: "#475569" }}>This agency currently has no sites.</p>
            ) : filteredSiteRows.length === 0 ? (
              <p style={{ marginBottom: 0, color: "#475569" }}>No sites match the current filter.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
                      <th style={{ padding: "8px 10px" }}>Domain</th>
                      <th style={{ padding: "8px 10px" }}>Client</th>
                      <th style={{ padding: "8px 10px" }}>Migration Status</th>
                      <th style={{ padding: "8px 10px" }}>Total Cost</th>
                      <th style={{ padding: "8px 10px" }}>Margin</th>
                      <th style={{ padding: "8px 10px" }}>Best Plan</th>
                      <th style={{ padding: "8px 10px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSiteRows.map((row) => (
                      <tr key={row.site_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px" }}>{row.domain || shortId(row.site_id)}</td>
                        <td style={{ padding: "8px 10px" }}>{row.client_name?.trim() || "Unassigned"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <MigrationBadge status={row.migration_status} />
                        </td>
                        <td style={{ padding: "8px 10px" }}>{formatMoney(row.total_estimated_cost)}</td>
                        <td style={{ padding: "8px 10px", color: row.margin >= 0 ? "#166534" : "#991b1b" }}>
                          {formatMoney(row.margin)}
                        </td>
                        <td style={{ padding: "8px 10px" }}>{row.best_plan ?? "N/A"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {row.live_url ? (
                              <a href={row.live_url} target="_blank" rel="noreferrer" style={actionLinkStyle()}>
                                View Site
                              </a>
                            ) : (
                              <span style={disabledActionStyle()}>View Site</span>
                            )}
                            {row.preview_url ? (
                              <a href={row.preview_url} target="_blank" rel="noreferrer" style={actionLinkStyle()}>
                                Open Preview
                              </a>
                            ) : (
                              <span style={disabledActionStyle()}>Open Preview</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasNoCostSignal ? (
              <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#475569" }}>
                Some sites have no cost signal yet. Margin and best-plan metrics may remain near zero until usage events arrive.
              </p>
            ) : null}

            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#475569" }}>
              V1 action set is conservative by design: view live site and preview only.
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}

function cardToneStyles(tone: "default" | "good" | "warn") {
  if (tone === "good") {
    return { border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534" };
  }
  if (tone === "warn") {
    return { border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b" };
  }
  return { border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a" };
}

function MetricCard(props: { label: string; value: string; tone?: "default" | "good" | "warn" }) {
  const tone = props.tone ?? "default";
  const toneStyle = cardToneStyles(tone);

  return (
    <article style={{ borderRadius: 10, padding: "10px 12px", ...toneStyle }}>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>{props.label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700 }}>{props.value}</p>
    </article>
  );
}

function MigrationBadge(props: { status: "NOT_STARTED" | "IMPORTED" | "PREVIEW_READY" | "APPROVED" | "LIVE" | "ERROR" }) {
  const styleByStatus = {
    NOT_STARTED: { color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db" },
    IMPORTED: { color: "#1d4ed8", background: "#dbeafe", border: "1px solid #93c5fd" },
    PREVIEW_READY: { color: "#6b21a8", background: "#f3e8ff", border: "1px solid #d8b4fe" },
    APPROVED: { color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" },
    LIVE: { color: "#166534", background: "#dcfce7", border: "1px solid #86efac" },
    ERROR: { color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5" },
  };

  const style = styleByStatus[props.status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        ...style,
      }}
    >
      {props.status}
    </span>
  );
}

function actionLinkStyle(): CSSProperties {
  return {
    border: "1px solid #cbd5e1",
    borderRadius: 7,
    padding: "4px 7px",
    fontSize: 12,
    textDecoration: "none",
    color: "#0f172a",
    background: "#fff",
  };
}

function disabledActionStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 7,
    padding: "4px 7px",
    fontSize: 12,
    color: "#94a3b8",
    background: "#f8fafc",
  };
}
