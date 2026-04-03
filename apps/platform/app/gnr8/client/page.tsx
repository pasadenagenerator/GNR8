import Link from "next/link";
import { redirect } from "next/navigation";

import ClientDashboardHome from "@/app/gnr8/_components/client-dashboard/ClientDashboardHome";
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

      <ClientDashboardHome readModel={readModel} roleLabel={currentUserClient.role} viewMode="client-self" />

      {availableClientMemberships.length > 1 ? (
        <section style={{ marginTop: 14, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Switch Client</h2>
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
        </section>
      ) : null}
    </main>
  );
}
