import Link from "next/link";

import {
  getCommandCenterSitesViewModel,
  MIGRATION_STATUS_ORDER,
} from "./_lib/command-center-view-model";

export default async function CommandCenterOverviewPage() {
  const model = await getCommandCenterSitesViewModel();
  const { readModel, portfolioMetrics } = model;

  return (
    <>
      <section style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <header style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Overview</h1>
          <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
            Portfolio-level migration and operating signals for superadmin actions.
          </p>
        </header>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Sites In Scope</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
              {portfolioMetrics.total_sites}
            </div>
          </article>
          <article style={{ border: "1px solid #bbf7d0", borderRadius: 12, background: "#f0fdf4", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#166534" }}>Live Sites</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#166534" }}>
              {portfolioMetrics.live_sites}
            </div>
          </article>
          <article style={{ border: "1px solid #fecaca", borderRadius: 12, background: "#fff1f2", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#991b1b" }}>Needs Attention</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#991b1b" }}>
              {portfolioMetrics.needs_attention_sites}
            </div>
          </article>
          <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Agencies</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{readModel.agencies.length}</div>
          </article>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MIGRATION_STATUS_ORDER.map((status) => (
            <span key={status} style={{ border: "1px solid #e5e7eb", borderRadius: 999, padding: "4px 8px", fontSize: 12, background: "#fff" }}>
              <strong>{status}:</strong> {portfolioMetrics.status_distribution[status]}
            </span>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 12, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 20 }}>Workspace Surfaces</h2>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <article style={{ border: "1px solid #dbe6f1", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Sites</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Site migration operations, ownership assignment, and bulk actions.
            </p>
            <Link href="/gnr8/command-center/sites" style={{ display: "inline-flex", marginTop: 10, fontSize: 13 }}>
              Open Sites Surface
            </Link>
          </article>

          <article style={{ border: "1px solid #dbe6f1", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Hosting</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Active runtime pointers, domains, readiness, assets, diagnostics, and rollback candidates.
            </p>
            <Link href="/gnr8/command-center/hosting" style={{ display: "inline-flex", marginTop: 10, fontSize: 13 }}>
              Open Hosting
            </Link>
          </article>

          <article style={{ border: "1px solid #dbe6f1", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Agencies</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Agency provisioning and admin-view action entry points.
            </p>
            <Link href="/gnr8/command-center/agencies" style={{ display: "inline-flex", marginTop: 10, fontSize: 13 }}>
              Open Agencies Surface
            </Link>
          </article>

          <article style={{ border: "1px solid #dbe6f1", borderRadius: 10, padding: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Migration Batches</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Durable migration batch summary, diagnostics, failures, and timeline.
            </p>
            <Link href="/gnr8/command-center/migration-batches" style={{ display: "inline-flex", marginTop: 10, fontSize: 13 }}>
              Open Migration Batches
            </Link>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 12, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 20 }}>Operational Signals</h2>
        {readModel.instrumentation.optional_enrichment_failed ? (
          <p style={{ marginTop: 0, marginBottom: 8, fontSize: 12, color: "#7c2d12" }}>
            Optional runtime/cost enrichment is partially unavailable; core ownership and migration visibility remain shown.
          </p>
        ) : null}
        {readModel.instrumentation.fallback_used ? (
          <p style={{ marginTop: 0, marginBottom: 8, fontSize: 12, color: "#7c2d12" }}>
            Fallback read mode is active ({readModel.instrumentation.fallback_reason ?? "unknown"}) to prevent page failure.
          </p>
        ) : null}
        <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>
          Read model queries: {readModel.instrumentation.query_count} | DB access mode: {readModel.instrumentation.db_access_mode} (
          {readModel.instrumentation.stateless_read_path ? "stateless" : "session-bound"})
        </p>
      </section>
    </>
  );
}
