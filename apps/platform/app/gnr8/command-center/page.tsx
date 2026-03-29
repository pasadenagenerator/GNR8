import Link from "next/link";
import { redirect } from "next/navigation";

import { mapSiteMargin, type SiteMarginResult } from "@/gnr8/billing/margin-service";
import { compareSiteAcrossPlansFromSummary, type SitePlanComparisonResult } from "@/gnr8/billing/pricing-simulation-service";
import {
  getCommandCenterReadModel,
  type CommandCenterSiteSummary,
} from "@/gnr8/command-center/command-center-read-model";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { CommandCenterOpsTable } from "./_components/command-center-ops-table";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  clientId?: string;
  profitability?: string;
};

type MigrationStatus = "NOT_STARTED" | "IMPORTED" | "PREVIEW_READY" | "APPROVED" | "LIVE" | "ERROR";

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
  summary: CommandCenterSiteSummary;
  margin: SiteMarginResult | null;
  simulation: SitePlanComparisonResult | null;
  migration: {
    status: MigrationStatus;
    auto_advanced: boolean;
    automation_reason: string | null;
    latest_site_version_id: string | null;
    preview_url: string | null;
    live_url: string | null;
    latest_runtime_state: string | null;
  };
};

const COMMAND_CENTER_SITE_LIMIT: number = 50;
const COMMAND_CENTER_SIMULATION_LIMIT: number = 50;
const MIGRATION_STATUS_ORDER: MigrationStatus[] = ["NOT_STARTED", "IMPORTED", "PREVIEW_READY", "APPROVED", "LIVE", "ERROR"];

function toHttpsLiveUrl(domain: string | null | undefined): string | null {
  const raw = String(domain ?? "").trim();
  if (!raw) return null;

  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function deriveMigrationStatus(summary: CommandCenterSiteSummary): CommandCenterRow["migration"] {
  const liveUrl = toHttpsLiveUrl(summary.domain);
  const siteVersionId = summary.latest_runtime_site_version_id;

  return {
    status: summary.effective_status,
    auto_advanced: summary.auto_advanced,
    automation_reason: summary.automation_reason,
    latest_site_version_id: siteVersionId,
    preview_url: siteVersionId ? `/api/gnr8/runtime/versions/${siteVersionId}/preview` : null,
    live_url: liveUrl,
    latest_runtime_state: summary.latest_runtime_state ? String(summary.latest_runtime_state) : null,
  };
}

function computePortfolioMetrics(rows: CommandCenterRow[]) {
  const statusCounts: Record<MigrationStatus, number> = {
    NOT_STARTED: 0,
    IMPORTED: 0,
    PREVIEW_READY: 0,
    APPROVED: 0,
    LIVE: 0,
    ERROR: 0,
  };

  for (const row of rows) {
    statusCounts[row.migration.status] += 1;
  }

  const totalSites = rows.length;
  const liveSites = statusCounts.LIVE;
  const notStartedSites = statusCounts.NOT_STARTED;
  const previewReadySites = statusCounts.PREVIEW_READY;
  const errorSites = statusCounts.ERROR;
  const needsAttentionSites = errorSites + notStartedSites + previewReadySites;
  const progressPercentage = totalSites === 0 ? 0 : Math.round((liveSites / totalSites) * 100);
  const startedSites = totalSites - notStartedSites;
  const successRate = startedSites === 0 ? 0 : Math.round((liveSites / startedSites) * 100);

  return {
    total_sites: totalSites,
    live_sites: liveSites,
    approved_sites: statusCounts.APPROVED,
    preview_ready_sites: previewReadySites,
    imported_sites: statusCounts.IMPORTED,
    not_started_sites: notStartedSites,
    error_sites: errorSites,
    needs_attention_sites: needsAttentionSites,
    started_sites: startedSites,
    progress_percentage: progressPercentage,
    success_rate: successRate,
    status_distribution: statusCounts,
  };
}

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

  const readModel = await getCommandCenterReadModel({
    clientId: selectedClientId ?? undefined,
    limit: COMMAND_CENTER_SITE_LIMIT,
  });

  const siteMarginBySiteId = new Map<string, SiteMarginResult>();
  for (const siteSummary of readModel.site_summaries) {
    const siteMargin = mapSiteMargin(siteSummary);
    siteMarginBySiteId.set(siteMargin.site_id, siteMargin);
  }

  const filteredSummaries = readModel.site_summaries.filter((summary) => {
    const margin = siteMarginBySiteId.get(summary.site_id) ?? null;
    return profitabilityMatches(profitability, margin);
  });

  let planSimulationErrorCount = 0;
  const simulationInputSummaries = filteredSummaries.slice(0, COMMAND_CENTER_SIMULATION_LIMIT);
  const skippedPlanSimulationCount = Math.max(0, filteredSummaries.length - simulationInputSummaries.length);
  const simulationBySiteId = new Map<string, SitePlanComparisonResult>();
  for (const summary of simulationInputSummaries) {
    try {
      const simulation = compareSiteAcrossPlansFromSummary(summary);
      simulationBySiteId.set(simulation.site_id, simulation);
    } catch {
      planSimulationErrorCount += 1;
    }
  }

  const agencyNameByAgencyId = new Map<string, string>();
  for (const client of readModel.clients) {
    if (client.agency_id && client.agency_name) {
      agencyNameByAgencyId.set(client.agency_id, client.agency_name);
    }
  }

  const rows: CommandCenterRow[] = filteredSummaries.map((summary) => ({
    summary,
    margin: siteMarginBySiteId.get(summary.site_id) ?? null,
    simulation: simulationBySiteId.get(summary.site_id) ?? null,
    migration: deriveMigrationStatus(summary),
  }));

  const portfolioMetrics = computePortfolioMetrics(rows);

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
        <h1 style={{ margin: 0, fontSize: 30 }}>GNR8 Migration Command Center</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Site migration pipeline visibility and actions (import → preview → approve → publish), with ownership and profitability context.
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
              {readModel.clients.map((client) => (
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
            <strong>Total in scope:</strong> {readModel.site_summaries.length}
          </span>
          <span>
            <strong>Page cap:</strong> {COMMAND_CENTER_SITE_LIMIT}
          </span>
        </div>
        {portfolioMetrics.total_sites === 0 ? (
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "#374151" }}>No sites available</p>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#111827", background: "#f9fafb" }}>
                <strong>Total:</strong> {portfolioMetrics.total_sites}
              </span>
              <span style={{ border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#166534", background: "#f0fdf4" }}>
                <strong>Live:</strong> {portfolioMetrics.live_sites}
              </span>
              <span style={{ border: "1px solid #d8b4fe", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#6b21a8", background: "#faf5ff" }}>
                <strong>Preview Ready:</strong> {portfolioMetrics.preview_ready_sites}
              </span>
              <span style={{ border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#991b1b", background: "#fff1f2", fontWeight: 800 }}>
                <strong>Needs Attention:</strong> {portfolioMetrics.needs_attention_sites}
              </span>
              <span style={{ border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#991b1b", background: "#fef2f2" }}>
                <strong>Errors:</strong> {portfolioMetrics.error_sites}
              </span>
              <span style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#1d4ed8", background: "#eff6ff" }}>
                <strong>Progress:</strong> {portfolioMetrics.progress_percentage}%
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#374151" }}>
              {MIGRATION_STATUS_ORDER.map((status) => (
                <span key={status} style={{ border: "1px solid #e5e7eb", borderRadius: 999, padding: "4px 8px", background: "#ffffff" }}>
                  <strong>{status}:</strong> {portfolioMetrics.status_distribution[status]}
                </span>
              ))}
            </div>

            <p style={{ margin: 0, fontSize: 12, color: "#4b5563" }}>
              <strong>Success Rate:</strong> {portfolioMetrics.success_rate}% (
              {portfolioMetrics.live_sites}/{portfolioMetrics.started_sites} started sites)
            </p>
          </div>
        )}
        {planSimulationErrorCount > 0 ? (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
            Pricing simulation is partially unavailable for {planSimulationErrorCount} site
            {planSimulationErrorCount === 1 ? "" : "s"}, but core ownership and cost metrics are shown.
          </p>
        ) : null}
        {skippedPlanSimulationCount > 0 ? (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#1f2937" }}>
            Pricing comparison is bounded to the first {COMMAND_CENTER_SIMULATION_LIMIT} site
            {COMMAND_CENTER_SIMULATION_LIMIT === 1 ? "" : "s"} in this render to protect DB/session capacity.
          </p>
        ) : null}
        {readModel.instrumentation.optional_enrichment_failed ? (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
            Optional runtime/cost enrichment is partially unavailable; core ownership and migration visibility remain shown.
          </p>
        ) : null}
        {readModel.instrumentation.fallback_used ? (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#7c2d12" }}>
            Command Center is running in fallback read mode ({readModel.instrumentation.fallback_reason ?? "unknown"}) to prevent page failure.
          </p>
        ) : null}
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#374151" }}>
          Read model query count this render: {readModel.instrumentation.query_count}
        </p>
        <p style={{ marginTop: 4, marginBottom: 0, fontSize: 12, color: "#374151" }}>
          DB access mode: {readModel.instrumentation.db_access_mode} (
          {readModel.instrumentation.stateless_read_path ? "stateless" : "session-bound"})
        </p>
      </section>

      <CommandCenterOpsTable
        rows={rows}
        clients={readModel.clients}
        agencyNameByAgencyId={Object.fromEntries(agencyNameByAgencyId.entries())}
      />
    </main>
  );
}
