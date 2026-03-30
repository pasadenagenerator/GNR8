import { redirect } from "next/navigation";

import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import { CreateAgencyForm } from "./_components/create-agency-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AgencyListRow = {
  id: string | null;
  name: string | null;
  slug: string | null;
  created_at: string | null;
};

async function listAgencies(): Promise<AgencyListRow[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return [];

  const result = await supabase
    .from("agencies")
    .select("id,name,slug,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (result.error) {
    return [];
  }

  return Array.isArray(result.data) ? (result.data as AgencyListRow[]) : [];
}

export default async function SuperadminAgencyProvisioningPage() {
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

  const agencies = await listAgencies();

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 20,
        background: "#f8fafc",
        minHeight: "100vh",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>Superadmin Agency Provisioning</h1>
        <p style={{ margin: "8px 0 0 0", color: "#475569" }}>
          Create a new agency, invite an owner, and initialize organization, billing, and ownership records.
        </p>
      </header>

      <CreateAgencyForm endpoint="/api/gnr8/admin/create-agency" />

      <section
        style={{
          marginTop: 16,
          border: "1px solid #d1d5db",
          borderRadius: 12,
          background: "#fff",
          padding: 16,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 20 }}>Existing Agencies</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "8px 6px" }}>Name</th>
                <th style={{ padding: "8px 6px" }}>Slug</th>
                <th style={{ padding: "8px 6px" }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr>
                  <td style={{ padding: "10px 6px", color: "#6b7280" }} colSpan={3}>
                    No agencies available.
                  </td>
                </tr>
              ) : (
                agencies.map((agency, index) => (
                  <tr key={`${agency.id ?? "agency"}-${index}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 6px" }}>{String(agency.name ?? "").trim() || "-"}</td>
                    <td style={{ padding: "10px 6px" }}>{String(agency.slug ?? "").trim() || "-"}</td>
                    <td style={{ padding: "10px 6px" }}>
                      {agency.created_at ? new Date(agency.created_at).toISOString() : "-"}
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
