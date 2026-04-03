import Link from "next/link";

import { getCommandCenterReadModel } from "@/gnr8/command-center/command-center-read-model";

import { CreateAgencyForm } from "@/app/gnr8/admin/agencies/_components/create-agency-form";
import { ExistingAgenciesTable } from "@/app/gnr8/admin/agencies/_components/existing-agencies-table";

export default async function CommandCenterAgenciesPage() {
  const readModel = await getCommandCenterReadModel({ limit: 1 });

  return (
    <>
      <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <header style={{ marginBottom: 10 }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: 28 }}>Agencies</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            Agency provisioning and superadmin admin-view entry points.
          </p>
        </header>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#334155" }}>
          <span style={{ border: "1px solid #dbe2ea", borderRadius: 999, padding: "4px 8px", background: "#f8fafc" }}>
            <strong>Agencies:</strong> {readModel.agencies.length}
          </span>
          <span style={{ border: "1px solid #dbe2ea", borderRadius: 999, padding: "4px 8px", background: "#f8fafc" }}>
            <strong>Actions:</strong> Create Agency, Agency Dashboard, Agency Settings, Agency Team
          </span>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#475569" }}>
          Client-users admin paths remain reachable through agency admin-view flows, for example from each agency dashboard.
        </p>
      </section>

      <section style={{ marginTop: 12 }}>
        <CreateAgencyForm endpoint="/api/gnr8/admin/create-agency" />
      </section>

      {readModel.agencies.length === 0 ? (
        <section style={{ marginTop: 12, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
          <p style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: "#475569" }}>
            No agencies exist yet. Create your first agency to activate agency workspace operations.
          </p>
          <Link href="/gnr8/command-center/agencies" style={{ fontSize: 13 }}>
            Stay on Agencies surface
          </Link>
        </section>
      ) : (
        <ExistingAgenciesTable agencies={readModel.agencies} />
      )}
    </>
  );
}
