import Link from "next/link";

import { CommandCenterOpsTable } from "../_components/command-center-ops-table";
import {
  COMMAND_CENTER_SIMULATION_LIMIT,
  COMMAND_CENTER_SITE_LIMIT,
  getCommandCenterSitesViewModel,
  MIGRATION_STATUS_ORDER,
  normalizeClientFilter,
  normalizeProfitability,
} from "../_lib/command-center-view-model";

type SearchParams = {
  clientId?: string;
  profitability?: string;
};

export default async function CommandCenterSitesPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined;
  const selectedClientId = normalizeClientFilter(resolvedSearchParams?.clientId);
  const profitability = normalizeProfitability(resolvedSearchParams?.profitability);

  const model = await getCommandCenterSitesViewModel({
    clientId: selectedClientId ?? undefined,
    profitability,
  });

  const {
    readModel,
    rows,
    agencyNameByAgencyId,
    portfolioMetrics,
    planSimulationErrorCount,
    skippedPlanSimulationCount,
  } = model;

  return (
    <>
      <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <header style={{ marginBottom: 10 }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 28 }}>Sites</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            Site operations, migration controls, assignment management, and bulk actions.
          </p>
        </header>

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
            href="/gnr8/command-center/sites"
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

      <section style={{ marginTop: 12, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
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
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "#374151" }}>
            No sites available yet. Import a site or assign ownership to begin operations.
          </p>
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
              <strong>Success Rate:</strong> {portfolioMetrics.success_rate}% ({portfolioMetrics.live_sites}/
              {portfolioMetrics.started_sites} started sites)
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
            {COMMAND_CENTER_SIMULATION_LIMIT > 1 ? "s" : ""} in this render to protect DB/session capacity.
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

      {rows.length === 0 ? (
        <section style={{ marginTop: 12, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            No sites match the current filters. Reset filters or add sites to continue.
          </p>
        </section>
      ) : (
        <CommandCenterOpsTable
          rows={rows}
          clients={readModel.clients}
          agencyNameByAgencyId={agencyNameByAgencyId}
          actorRole="superadmin"
        />
      )}
    </>
  );
}
