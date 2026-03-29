import Link from "next/link";
import { redirect } from "next/navigation";

import { listClientOrganizationsForCommandCenter } from "@/gnr8/command-center/command-center-assignment-service";
import { mapSiteMargin, type SiteMarginResult } from "@/gnr8/billing/margin-service";
import { compareSiteAcrossPlansFromSummary, type SitePlanComparisonResult } from "@/gnr8/billing/pricing-simulation-service";
import { getUnifiedCostOverview, type UnifiedCostSiteSummary } from "@/gnr8/billing/unified-cost-view-service";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { CommandCenterOpsTable } from "./_components/command-center-ops-table";

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

const COMMAND_CENTER_SITE_LIMIT = 100;

export default async function CommandCenterPage(props: { searchParams?: Promise<SearchParams> }) {
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
  const selectedClientId = normalizeClientFilter(resolvedSearchParams?.clientId);
  const profitability = normalizeProfitability(resolvedSearchParams?.profitability);

  const [overview, clients] = await Promise.all([
    getUnifiedCostOverview({
      clientId: selectedClientId ?? undefined,
      limit: COMMAND_CENTER_SITE_LIMIT,
      topLimit: COMMAND_CENTER_SITE_LIMIT,
    }),
    listClientOrganizationsForCommandCenter(),
  ]);

  const siteMarginBySiteId = new Map<string, SiteMarginResult>();
  for (const siteSummary of overview.site_summaries) {
    const siteMargin = mapSiteMargin(siteSummary);
    siteMarginBySiteId.set(siteMargin.site_id, siteMargin);
  }

  const filteredSummaries = overview.site_summaries.filter((summary) => {
    const margin = siteMarginBySiteId.get(summary.site_id) ?? null;
    return profitabilityMatches(profitability, margin);
  });

  let planSimulationErrorCount = 0;
  const simulationBySiteId = new Map<string, SitePlanComparisonResult>();
  for (const summary of filteredSummaries) {
    try {
      const simulation = compareSiteAcrossPlansFromSummary(summary);
      simulationBySiteId.set(simulation.site_id, simulation);
    } catch {
      planSimulationErrorCount += 1;
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
          <span>
            <strong>Page cap:</strong> {COMMAND_CENTER_SITE_LIMIT}
          </span>
        </div>
        {planSimulationErrorCount > 0 ? (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
            Pricing simulation is partially unavailable for {planSimulationErrorCount} site
            {planSimulationErrorCount === 1 ? "" : "s"}, but core ownership and cost metrics are shown.
          </p>
        ) : null}
      </section>

      <CommandCenterOpsTable
        rows={rows}
        clients={clients}
        agencyNameByAgencyId={Object.fromEntries(agencyNameByAgencyId.entries())}
      />
    </main>
  );
}
