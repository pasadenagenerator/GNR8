import Link from "next/link";
import { redirect } from "next/navigation";

import { getClientDashboardReadModelForPage } from "@/gnr8/client/client-dashboard-read-model";
import { CLIENT_SETUP_PATH, getClientSetupStatusForClientForPage } from "@/src/auth/client-setup-gate";
import {
  listCurrentUserClientMembershipsForPage,
  resolveCurrentUserClientForPage,
  ResolveCurrentClientError,
} from "@/src/auth/resolve-current-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  client?: string;
};

function shortId(value: string): string {
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}...`;
}

function buildClientSetupPath(clientId: string): string {
  return `${CLIENT_SETUP_PATH}?client=${encodeURIComponent(clientId)}`;
}

export default async function ClientDashboardPage(props: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined;
  const requestedClientId = String(resolvedSearchParams?.client ?? "").trim() || null;

  let currentUserClient: Awaited<ReturnType<typeof resolveCurrentUserClientForPage>> | null = null;
  let clientAccessErrorCode: ResolveCurrentClientError["code"] | null = null;
  let availableClientMemberships: Awaited<ReturnType<typeof listCurrentUserClientMembershipsForPage>>["memberships"] = [];

  try {
    currentUserClient = await resolveCurrentUserClientForPage({
      activeClientId: requestedClientId,
    });
    const membershipContext = await listCurrentUserClientMembershipsForPage();
    availableClientMemberships = membershipContext.memberships;
  } catch (error) {
    if (error instanceof ResolveCurrentClientError && error.code === "UNAUTHORIZED") {
      redirect("/login");
    }
    if (error instanceof ResolveCurrentClientError) {
      clientAccessErrorCode = error.code;
      try {
        const membershipContext = await listCurrentUserClientMembershipsForPage();
        availableClientMemberships = membershipContext.memberships;
      } catch (membershipError) {
        if (!(membershipError instanceof ResolveCurrentClientError && membershipError.code === "UNAUTHORIZED")) {
          throw membershipError;
        }
      }
    } else {
      throw error;
    }
  }

  if (currentUserClient == null) {
    return (
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: 24,
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 62%)",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          minHeight: "100vh",
        }}
      >
        <header style={{ display: "grid", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 32, color: "#0f172a" }}>Client Dashboard</h1>
          <p style={{ margin: 0, color: "#334155", maxWidth: 900 }}>
            Client-facing website portfolio view, scoped only to your authenticated client membership.
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
            {clientAccessErrorCode === "NO_MEMBERSHIP"
              ? "No client access"
              : clientAccessErrorCode === "ACTIVE_CLIENT_REQUIRED"
                ? "Select client to continue"
                : "Client access unavailable"}
          </h2>
          <p style={{ marginBottom: 0, color: "#7f1d1d" }}>
            {clientAccessErrorCode === "NO_MEMBERSHIP"
              ? "Your account is authenticated but has no client membership."
              : clientAccessErrorCode === "ACTIVE_CLIENT_REQUIRED" || clientAccessErrorCode === "ACTIVE_CLIENT_INVALID"
                ? "Your account belongs to multiple clients. Select one valid client context to continue."
                : "Your client membership context is invalid or unavailable. Access is blocked until this is resolved."}
          </p>
          {availableClientMemberships.length > 0 ? (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {availableClientMemberships.map((membership) => (
                <Link
                  key={membership.client_id}
                  href={`/gnr8/client?client=${encodeURIComponent(membership.client_id)}`}
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
                  {(membership.client_name?.trim() || membership.client_id).trim()}
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 10, marginBottom: 0, color: "#7f1d1d", fontSize: 13 }}>
              Request an invite from your agency or GNR8 administrator.
            </p>
          )}
        </section>
      </main>
    );
  }

  const clientSetupStatus = await getClientSetupStatusForClientForPage({
    userId: currentUserClient.user_id,
    clientId: currentUserClient.client_id,
    agencyId: currentUserClient.agency_id,
  });

  if (!clientSetupStatus.hasClientMembership) {
    return (
      <main style={{ maxWidth: 720, margin: "48px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Client access unavailable</h1>
        <div style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff5f5", padding: 14 }}>
          <p style={{ margin: 0, color: "#7f1d1d" }}>
            Access is blocked because your client membership context is invalid for this workspace.
          </p>
        </div>
      </main>
    );
  }

  if (!clientSetupStatus.isCompleted) {
    redirect(buildClientSetupPath(currentUserClient.client_id));
  }

  const readModel = await getClientDashboardReadModelForPage({
    clientId: currentUserClient.client_id,
    agencyId: currentUserClient.agency_id,
    limit: 120,
  });

  return (
    <main
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: 24,
        background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 62%)",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        minHeight: "100vh",
      }}
    >
      <header style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, color: "#0f172a" }}>Client Dashboard</h1>
        <p style={{ margin: 0, color: "#334155", maxWidth: 900 }}>
          Dashboard foundation with client-scoped site visibility only.
        </p>
      </header>

      <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#334155" }}>
          <div>
            <strong>Client:</strong> {readModel.client.client_name?.trim() || shortId(readModel.client.client_id)}
          </div>
          <div>
            <strong>Parent Agency:</strong> {readModel.agency.agency_name?.trim() || shortId(readModel.agency.agency_id)}
          </div>
          <div>
            <strong>Role:</strong> {currentUserClient.role}
          </div>
        </div>
        {availableClientMemberships.length > 1 ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {availableClientMemberships.map((membership) => {
              const isActive = membership.client_id === currentUserClient.client_id;
              return (
                <Link
                  key={membership.client_id}
                  href={`/gnr8/client?client=${encodeURIComponent(membership.client_id)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: isActive ? "1px solid #0f172a" : "1px solid #cbd5e1",
                    background: isActive ? "#0f172a" : "#fff",
                    color: isActive ? "#fff" : "#0f172a",
                    textDecoration: "none",
                    fontSize: 12,
                  }}
                >
                  {membership.client_name?.trim() || shortId(membership.client_id)}
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      <section
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total Sites</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{readModel.summary.total_sites}</div>
        </article>
        <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Live</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#065f46" }}>{readModel.summary.live_sites}</div>
        </article>
        <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Needs Attention</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#9a3412" }}>
            {readModel.summary.needs_attention_sites}
          </div>
        </article>
      </section>

      <section style={{ marginTop: 16, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontWeight: 600, color: "#0f172a" }}>Client Sites</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>Domain</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>Site Status</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
                  Pipeline Status
                </th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>Runtime State</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {readModel.site_rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "#64748b" }}>
                    No client sites found for this membership scope.
                  </td>
                </tr>
              ) : (
                readModel.site_rows.map((site) => (
                  <tr key={site.site_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", color: "#0f172a" }}>{site.domain?.trim() || shortId(site.site_id)}</td>
                    <td style={{ padding: "10px 12px", color: "#334155" }}>{site.site_status}</td>
                    <td style={{ padding: "10px 12px", color: "#334155" }}>{site.migration_status}</td>
                    <td style={{ padding: "10px 12px", color: "#334155" }}>{site.latest_runtime_state ?? "-"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {site.live_url ? (
                          <a
                            href={site.live_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              textDecoration: "none",
                              color: "#0f172a",
                              fontSize: 12,
                            }}
                          >
                            Open Live
                          </a>
                        ) : null}
                        {site.preview_url ? (
                          <a
                            href={site.preview_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              textDecoration: "none",
                              color: "#0f172a",
                              fontSize: 12,
                            }}
                          >
                            Open Preview
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
