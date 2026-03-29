import Link from "next/link";
import { redirect } from "next/navigation";

import { listClientOrganizationsForCommandCenter } from "@/gnr8/command-center/command-center-assignment-service";
import {
  getRuntimeMigrationSnapshotsBySiteId,
  type CommandCenterMigrationRuntimeSnapshot,
} from "@/gnr8/command-center/command-center-migration-service";
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
  migration: {
    status: "NOT_STARTED" | "IMPORTED" | "PREVIEW_READY" | "APPROVED" | "LIVE" | "ERROR";
    latest_site_version_id: string | null;
    preview_url: string | null;
    live_url: string | null;
    latest_runtime_state: string | null;
  };
};

const COMMAND_CENTER_SITE_LIMIT = 100;

function looksLikeErrorStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes("error") || normalized.includes("fail");
}

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

function deriveMigrationStatus(input: {
  summary: UnifiedCostSiteSummary;
  runtimeSnapshot: CommandCenterMigrationRuntimeSnapshot | null;
}): CommandCenterRow["migration"] {
  const { summary, runtimeSnapshot } = input;
  const liveUrl = toHttpsLiveUrl(summary.domain);
  const siteVersionId = runtimeSnapshot?.latest_site_version_id ?? null;
  const latestStateRaw = runtimeSnapshot?.latest_state ?? null;

  if (runtimeSnapshot) {
    const latestState = String(latestStateRaw ?? "").toUpperCase();
    let status: CommandCenterRow["migration"]["status"];

    if (latestState === "DRAFT") {
      status = "IMPORTED";
    } else if (latestState === "READY_FOR_REVIEW") {
      status = "PREVIEW_READY";
    } else if (latestState === "APPROVED") {
      status = "APPROVED";
    } else if (latestState === "PUBLISHED") {
      status = "LIVE";
    } else if (latestState === "ARCHIVED") {
      status = runtimeSnapshot.has_published_version ? "LIVE" : "IMPORTED";
    } else {
      status = "ERROR";
    }

    return {
      status,
      latest_site_version_id: siteVersionId,
      preview_url: siteVersionId ? `/api/gnr8/runtime/versions/${siteVersionId}/preview` : null,
      live_url: liveUrl,
      latest_runtime_state: latestStateRaw ? String(latestStateRaw) : null,
    };
  }

  if (looksLikeErrorStatus(summary.site_status)) {
    return {
      status: "ERROR",
      latest_site_version_id: null,
      preview_url: null,
      live_url: liveUrl,
      latest_runtime_state: null,
    };
  }

  if (summary.migration_event_count > 0) {
    return {
      status: "IMPORTED",
      latest_site_version_id: null,
      preview_url: null,
      live_url: liveUrl,
      latest_runtime_state: null,
    };
  }

  return {
    status: "NOT_STARTED",
    latest_site_version_id: null,
    preview_url: null,
    live_url: liveUrl,
    latest_runtime_state: null,
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

  const migrationSnapshotsBySiteId = await getRuntimeMigrationSnapshotsBySiteId(filteredSummaries.map((summary) => summary.site_id));

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
    migration: deriveMigrationStatus({
      summary,
      runtimeSnapshot: migrationSnapshotsBySiteId.get(summary.site_id) ?? null,
    }),
  }));

  const liveCount = rows.filter((row) => row.migration.status === "LIVE").length;
  const migrationProgressPercent = rows.length === 0 ? 0 : Math.round((liveCount / rows.length) * 100);

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
        <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13, color: "#111827" }}>
            <strong>Migration Progress:</strong> {liveCount}/{rows.length} LIVE ({migrationProgressPercent}%)
          </div>
          <div
            aria-label="Migration progress bar"
            style={{ width: 320, maxWidth: "100%", height: 10, borderRadius: 999, overflow: "hidden", background: "#e5e7eb" }}
          >
            <div
              style={{
                width: `${migrationProgressPercent}%`,
                height: "100%",
                background: migrationProgressPercent >= 100 ? "#16a34a" : "#2563eb",
                transition: "width 160ms ease-out",
              }}
            />
          </div>
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
