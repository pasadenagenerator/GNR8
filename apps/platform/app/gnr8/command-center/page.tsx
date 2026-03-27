import Link from "next/link";

import { listClientOrganizationsForCommandCenter } from "@/gnr8/command-center/command-center-assignment-service";
import { getMarginDebugOverview, type SiteMarginResult } from "@/gnr8/billing/margin-service";
import { compareSiteAcrossPlans, type SitePlanComparisonResult } from "@/gnr8/billing/pricing-simulation-service";
import { getUnifiedCostOverview, type UnifiedCostSiteSummary } from "@/gnr8/billing/unified-cost-view-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

import { SiteAssignmentControl } from "./_components/site-assignment-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  clientId?: string;
  profitability?: string;
};

function normalizeClientFilter(value: string | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeProfitability(value: string | undefined): "all" | "profitable" | "loss-making" {
  if (value === "profitable") return "profitable";
  if (value === "loss-making") return "loss-making";
  return "all";
}

function shortId(value: string): string {
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}...`;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

function displayClientName(input: { client_name: string | null; client_id: string | null }): string {
  if (input.client_name?.trim()) return input.client_name;
  if (input.client_id?.trim()) return shortId(input.client_id);
  return "Unassigned";
}

function profitabilityMatches(filter: "all" | "profitable" | "loss-making", margin: SiteMarginResult | null): boolean {
  if (filter === "all") return true;
  if (!margin) return false;
  if (filter === "profitable") return margin.flags.is_profitable;
  return margin.flags.is_loss_making;
}

type CommandCenterRow = {
  summary: UnifiedCostSiteSummary;
  margin: SiteMarginResult | null;
  simulation: SitePlanComparisonResult | null;
};

export default async function CommandCenterPage(props: { searchParams?: Promise<SearchParams> }) {
  await requireSuperadminUserId();

  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined;
  const selectedClientId = normalizeClientFilter(resolvedSearchParams?.clientId);
  const profitability = normalizeProfitability(resolvedSearchParams?.profitability);

  const [overview, marginOverview, clients] = await Promise.all([
    getUnifiedCostOverview({
      clientId: selectedClientId ?? undefined,
      limit: 250,
      topLimit: 250,
    }),
    getMarginDebugOverview({
      clientId: selectedClientId ?? undefined,
      limit: 250,
    }),
    listClientOrganizationsForCommandCenter(),
  ]);

  const siteMarginBySiteId = new Map<string, SiteMarginResult>();
  for (const siteMargin of marginOverview.site_margins) {
    siteMarginBySiteId.set(siteMargin.site_id, siteMargin);
  }

  const filteredSummaries = overview.site_summaries.filter((summary) => {
    const margin = siteMarginBySiteId.get(summary.site_id) ?? null;
    return profitabilityMatches(profitability, margin);
  });

  const planComparisons = await Promise.all(filteredSummaries.map((summary) => compareSiteAcrossPlans(summary.site_id)));
  const simulationBySiteId = new Map<string, SitePlanComparisonResult>();
  for (const simulation of planComparisons) {
    if (simulation) {
      simulationBySiteId.set(simulation.site_id, simulation);
    }
  }

  const agencyNameByAgencyId = new Map<string, string>();
  for (const client of clients) {
    if (client.agency_id && client.agency_name) {
      agencyNameByAgencyId.set(client.agency_id, client.agency_name);
    }
  }

  const rows: CommandCenterRow[] = filteredSummaries.map((summary) => ({
    summary,
    margin: siteMarginBySiteId.get(summary.site_id) ?? null,
    simulation: simulationBySiteId.get(summary.site_id) ?? null,
  }));

  return (
    <main
      style={{
        maxWidth: 1800,
        margin: "0 auto",
        padding: 20,
        background: "#f5f7fb",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        minHeight: "100vh",
      }}
    >
      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>GNR8 Command Center</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Ownership and profitability operations surface (agency → client → site) with plan simulation.
        </p>
      </header>

      <section style={{ marginTop: 16, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Filter by client</span>
            <select
              name="clientId"
              defaultValue={selectedClientId ?? ""}
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff" }}
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.client_name?.trim() || client.client_id}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Filter by profitability</span>
            <select
              name="profitability"
              defaultValue={profitability}
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff" }}
            >
              <option value="all">All</option>
              <option value="profitable">Profitable</option>
              <option value="loss-making">Loss-making</option>
            </select>
          </label>

          <button
            type="submit"
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              cursor: "pointer",
            }}
          >
            Apply
          </button>

          <Link
            href="/gnr8/command-center"
            style={{
              height: 38,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              textDecoration: "none",
              color: "#111827",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Reset
          </Link>
        </form>
      </section>

      <section style={{ marginTop: 14, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13, color: "#374151" }}>
          <span>
            <strong>Sites:</strong> {rows.length}
          </span>
          <span>
            <strong>Total in scope:</strong> {overview.site_summaries.length}
          </span>
        </div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1800 }}>
            <thead>
              <tr>
                {[
                  "Domain",
                  "Site ID",
                  "Client",
                  "Agency",
                  "AI",
                  "Runtime",
                  "Total Cost",
                  "Margin",
                  "Margin %",
                  "Best Plan",
                  "Plan Simulation (STARTER / GROWTH / MANAGED)",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      textAlign: "left",
                      fontSize: 12,
                      color: "#4b5563",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "8px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const bestPlan = row.simulation?.ranked_plans?.[0] ?? null;
                const starter = row.simulation?.plan_results.STARTER ?? null;
                const growth = row.simulation?.plan_results.GROWTH ?? null;
                const managed = row.simulation?.plan_results.MANAGED ?? null;
                const agencyDisplay = agencyNameByAgencyId.get(row.summary.agency_id) ?? shortId(row.summary.agency_id);

                return (
                  <tr key={row.summary.site_id}>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", fontSize: 13 }}>
                      {row.summary.domain ?? "—"}
                    </td>
                    <td
                      style={{
                        borderTop: "1px solid #f3f4f6",
                        padding: "10px",
                        fontSize: 12,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      }}
                    >
                      {shortId(row.summary.site_id)}
                    </td>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", fontSize: 13 }}>
                      {displayClientName(row.summary)}
                    </td>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", fontSize: 13 }}>{agencyDisplay}</td>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", fontSize: 13 }}>
                      {formatMoney(row.summary.ai_estimated_cost_sum)}
                    </td>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", fontSize: 13 }}>
                      {formatMoney(row.summary.runtime_estimated_cost_sum)}
                    </td>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", fontSize: 13 }}>
                      {formatMoney(row.summary.total_estimated_cost)}
                    </td>
                    <td
                      style={{
                        borderTop: "1px solid #f3f4f6",
                        padding: "10px",
                        fontSize: 13,
                        color: row.margin && row.margin.margin < 0 ? "#991b1b" : "#065f46",
                        fontWeight: 600,
                      }}
                    >
                      {row.margin ? formatMoney(row.margin.margin) : "—"}
                    </td>
                    <td
                      style={{
                        borderTop: "1px solid #f3f4f6",
                        padding: "10px",
                        fontSize: 13,
                        color: row.margin && row.margin.margin_percentage < 0 ? "#991b1b" : "#065f46",
                      }}
                    >
                      {row.margin ? formatPercent(row.margin.margin_percentage) : "—"}
                    </td>
                    <td
                      style={{
                        borderTop: "1px solid #f3f4f6",
                        padding: "10px",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {bestPlan ? `${bestPlan.plan_name} (${formatMoney(bestPlan.margin)})` : "—"}
                    </td>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", fontSize: 12, lineHeight: "18px" }}>
                      <div style={{ fontWeight: bestPlan?.plan_name === "STARTER" ? 700 : 500 }}>
                        STARTER: {starter ? formatMoney(starter.margin) : "—"}
                      </div>
                      <div style={{ fontWeight: bestPlan?.plan_name === "GROWTH" ? 700 : 500 }}>
                        GROWTH: {growth ? formatMoney(growth.margin) : "—"}
                      </div>
                      <div style={{ fontWeight: bestPlan?.plan_name === "MANAGED" ? 700 : 500 }}>
                        MANAGED: {managed ? formatMoney(managed.margin) : "—"}
                      </div>
                    </td>
                    <td style={{ borderTop: "1px solid #f3f4f6", padding: "10px", verticalAlign: "top" }}>
                      <SiteAssignmentControl siteId={row.summary.site_id} currentClientId={row.summary.client_id} clients={clients} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
