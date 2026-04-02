import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import { getAgencyDashboardReadModel } from "@/gnr8/agency/agency-dashboard-read-model";
import { OWNER_SETUP_PATH, getOwnerSetupStatusForAgencyForPage } from "@/src/auth/owner-setup-gate";
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from "@/src/auth/resolve-current-agency";
import { canPerformAction } from "@/src/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  needsAttention?: string;
  agency?: string;
};

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
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined;
  const requestedAgencyId = String(resolvedSearchParams?.agency ?? "").trim() || null;
  const showNeedsAttentionOnly = normalizeNeedsAttention(resolvedSearchParams?.needsAttention);

  let currentUserAgency: Awaited<ReturnType<typeof resolveCurrentUserAgencyForPage>> | null = null;
  let agencyAccessErrorCode: ResolveCurrentAgencyError["code"] | null = null;
  let availableAgencyMemberships: Awaited<ReturnType<typeof listCurrentUserAgencyMembershipsForPage>>["memberships"] = [];

  try {
    currentUserAgency = await resolveCurrentUserAgencyForPage({
      activeAgencyId: requestedAgencyId,
    });
    const membershipContext = await listCurrentUserAgencyMembershipsForPage();
    availableAgencyMemberships = membershipContext.memberships;
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError && error.code === "UNAUTHORIZED") {
      redirect("/login");
    }
    if (error instanceof ResolveCurrentAgencyError) {
      agencyAccessErrorCode = error.code;
      try {
        const membershipContext = await listCurrentUserAgencyMembershipsForPage();
        availableAgencyMemberships = membershipContext.memberships;
      } catch (membershipError) {
        if (!(membershipError instanceof ResolveCurrentAgencyError && membershipError.code === "UNAUTHORIZED")) {
          throw membershipError;
        }
      }
    } else {
      throw error;
    }
  }

  if (currentUserAgency == null) {
    return (
      <main
        style={{
          maxWidth: 1200,
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
            Agency-facing migration and economics view, scoped by authenticated membership.
          </p>
        </header>

        <section
          style={{
            marginTop: 18,
            border: "1px solid #fecaca",
            borderRadius: 12,
            background: "#fff5f5",
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#991b1b" }}>
            {agencyAccessErrorCode === "NO_MEMBERSHIP"
              ? "No agency access"
              : agencyAccessErrorCode === "ACTIVE_AGENCY_REQUIRED"
                ? "Select agency to continue"
                : "Agency access unavailable"}
          </h2>
          <p style={{ marginBottom: 0, color: "#7f1d1d" }}>
            {agencyAccessErrorCode === "NO_MEMBERSHIP"
              ? "Your account is authenticated but has no agency membership yet."
              : agencyAccessErrorCode === "ACTIVE_AGENCY_REQUIRED" || agencyAccessErrorCode === "ACTIVE_AGENCY_INVALID"
                ? "Your account belongs to multiple agencies. Select one valid agency context to continue."
              : "Your membership is invalid or ambiguous. Access is blocked until this is resolved."}
          </p>
          {availableAgencyMemberships.length > 0 ? (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {availableAgencyMemberships.map((membership) => (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency?agency=${encodeURIComponent(membership.agency_id)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #fecaca",
                    background: "#fff",
                    color: "#991b1b",
                    textDecoration: "none",
                    fontSize: 12,
                  }}
                >
                  {(membership.agency_name?.trim() || membership.agency_id).trim()}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  if (currentUserAgency.role === "owner") {
    const ownerSetupStatus = await getOwnerSetupStatusForAgencyForPage({
      userId: currentUserAgency.user_id,
      agencyId: currentUserAgency.agency_id,
    });
    if (!ownerSetupStatus.hasOwnerMembership) {
      return (
        <main
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: 24,
            background: "linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            minHeight: "100vh",
          }}
        >
          <section
            style={{
              marginTop: 18,
              border: "1px solid #fecaca",
              borderRadius: 12,
              background: "#fff5f5",
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0, color: "#991b1b" }}>Agency access unavailable</h2>
            <p style={{ marginBottom: 0, color: "#7f1d1d" }}>
              Owner membership context is invalid for this agency. Access is blocked until membership is corrected.
            </p>
          </section>
        </main>
      );
    }
    if (!ownerSetupStatus.isCompleted) {
      redirect(`${OWNER_SETUP_PATH}?agency=${encodeURIComponent(currentUserAgency.agency_id)}`);
    }
  }

  const readModel = await getAgencyDashboardReadModel({
    agencyId: currentUserAgency.agency_id,
    limit: 120,
    simulationLimit: 120,
  });

  const filteredSiteRows = showNeedsAttentionOnly
    ? readModel.site_rows.filter((row) => row.needs_attention)
    : readModel.site_rows;

  const unassignedClientSites = readModel.site_rows.filter((row) => row.client_id == null).length;
  const hasNoCostSignal = readModel.site_rows.some((row) => row.cost_completeness_status === "NO_SIGNAL");
  const canRunMigrations = canPerformAction(currentUserAgency.role, "run_migration");
  const canRunBulkActions = canPerformAction(currentUserAgency.role, "bulk_actions");
  const canViewClientUsers = canPerformAction(currentUserAgency.role, "view_client_users");
  const canCreateClient = canPerformAction(currentUserAgency.role, "create_client");
  const canEditClientSettings = canPerformAction(currentUserAgency.role, "edit_client_settings");

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
          Agency-facing migration and economics view. Scope is resolved from your authenticated agency membership.
        </p>
      </header>

      <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#334155" }}>
          <div>
            <strong>Current Agency:</strong> {currentUserAgency.agency_name?.trim() || readModel.agency.agency_name?.trim() || "Unknown agency"}
          </div>
          <div>
            <strong>Agency ID:</strong> {currentUserAgency.agency_id}
          </div>
          <div>
            <strong>Role:</strong> {currentUserAgency.role}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Link
            href={`/gnr8/agency/settings?agency=${encodeURIComponent(currentUserAgency.agency_id)}`}
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
            Open Settings
          </Link>
          <Link
            href="/gnr8/agency/members"
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginLeft: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              textDecoration: "none",
              fontSize: 12,
            }}
          >
            Team
          </Link>
        </div>
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#475569" }}>
          {canRunMigrations
            ? `Operational actions are enabled for ${currentUserAgency.role} role.`
            : "Read-only role: migration, publish, assignment, and bulk mutation actions are blocked."}
          {canRunBulkActions ? " Bulk actions are enabled by role policy." : " Bulk actions are disabled by role policy."}
        </p>
        {availableAgencyMemberships.length > 1 ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {availableAgencyMemberships.map((membership) => {
              const isActive = membership.agency_id === currentUserAgency?.agency_id;
              return (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency?agency=${encodeURIComponent(membership.agency_id)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: isActive ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                    background: isActive ? "#eff6ff" : "#fff",
                    color: isActive ? "#1e3a8a" : "#334155",
                    textDecoration: "none",
                    fontSize: 12,
                  }}
                >
                  {membership.agency_name?.trim() || shortId(membership.agency_id)}
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      <section style={{ marginTop: 12, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <form method="get" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          {requestedAgencyId ? <input type="hidden" name="agency" value={requestedAgencyId} /> : null}
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
            href={requestedAgencyId ? `/gnr8/agency?agency=${encodeURIComponent(requestedAgencyId)}` : "/gnr8/agency"}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, color: "#0f172a" }}>Client Overview</h2>
              {canCreateClient ? (
                <Link
                  href={`/gnr8/agency/clients/new?agency=${encodeURIComponent(currentUserAgency.agency_id)}`}
                  style={actionLinkStyle()}
                >
                  Add Client
                </Link>
              ) : (
                <span style={disabledActionStyle()}>Add Client</span>
              )}
            </div>

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
                      <th style={{ padding: "8px 10px" }}>Actions</th>
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
                        <td style={{ padding: "8px 10px" }}>
                          {client.client_id ? (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Link
                                href={`/gnr8/agency/clients/${encodeURIComponent(client.client_id)}/dashboard?agency=${encodeURIComponent(currentUserAgency.agency_id)}`}
                                style={actionLinkStyle()}
                              >
                                Client Dashboard
                              </Link>
                              {canEditClientSettings ? (
                                <Link
                                  href={`/gnr8/agency/clients/${encodeURIComponent(client.client_id)}/settings?agency=${encodeURIComponent(currentUserAgency.agency_id)}`}
                                  style={actionLinkStyle()}
                                >
                                  Client Settings
                                </Link>
                              ) : (
                                <span style={disabledActionStyle()}>Client Settings</span>
                              )}
                              {canViewClientUsers ? (
                                <Link
                                  href={`/gnr8/agency/clients/${encodeURIComponent(client.client_id)}/users?agency=${encodeURIComponent(currentUserAgency.agency_id)}`}
                                  style={actionLinkStyle()}
                                >
                                  Client Team
                                </Link>
                              ) : (
                                <span style={disabledActionStyle()}>Client Team</span>
                              )}
                            </div>
                          ) : (
                            <span style={disabledActionStyle()}>Unassigned</span>
                          )}
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
