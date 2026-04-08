import Link from "next/link";

import WorkspaceShortcuts, { type WorkspaceShortcut } from "@/app/gnr8/_components/workspace/WorkspaceShortcuts";
import type { ClientDashboardReadModel } from "@/gnr8/client/client-dashboard-read-model";

type Props = {
  readModel: ClientDashboardReadModel;
  roleLabel: string;
  viewMode: "agency-managed" | "client-self";
  backToAgencyHref?: string;
  settingsHref?: string;
  teamHref?: string;
  clientSelfHref?: string;
  importSiteHref?: string;
  siteWorkspaceHrefBuilder?: (siteId: string) => string | null;
};

function shortId(value: string): string {
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}...`;
}

function statusChipColor(value: string): { background: string; border: string; color: string } {
  const normalized = value.trim().toUpperCase();
  if (normalized === "LIVE" || normalized === "PUBLISHED" || normalized === "ACTIVE") {
    return { background: "#ecfdf5", border: "#a7f3d0", color: "#065f46" };
  }
  if (normalized === "ERROR" || normalized === "FAILED") {
    return { background: "#fff1f2", border: "#fecdd3", color: "#9f1239" };
  }
  if (normalized === "PREVIEW_READY") {
    return { background: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" };
  }
  return { background: "#f8fafc", border: "#cbd5e1", color: "#334155" };
}

function StatusChip(props: { label: string; value: string | null | undefined }) {
  const displayValue = String(props.value ?? "-").trim() || "-";
  const colors = statusChipColor(displayValue);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.color,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {props.label}: {displayValue}
    </span>
  );
}

function ActionLink(props: { href: string; label: string; external?: boolean }) {
  if (props.external) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#fff",
          color: "#0f172a",
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {props.label}
      </a>
    );
  }

  return (
    <Link
      href={props.href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        background: "#fff",
        color: "#0f172a",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {props.label}
    </Link>
  );
}

export default function ClientDashboardHome(props: Props) {
  const hasSites = props.readModel.site_rows.length > 0;
  const hasImportAction = Boolean(props.importSiteHref);
  const hasManagementActions = Boolean(props.settingsHref || props.teamHref);
  const latestSiteHref = props.readModel.site_rows[0]?.live_url ?? props.readModel.site_rows[0]?.preview_url ?? null;
  const workspaceShortcuts: WorkspaceShortcut[] = [
    { id: "view-sites", label: "View Sites", href: "#client-sites", description: "Jump to sites overview", icon: "S" },
    ...(latestSiteHref
      ? [{ id: "open-latest-site", label: "Open Latest Site", href: latestSiteHref, description: "Open most recent connected site", icon: "L", external: true }]
      : []),
    ...(props.settingsHref
      ? [{ id: "open-settings", label: "Open Settings", href: props.settingsHref, description: "Open client settings", icon: "G" }]
      : []),
    ...(props.teamHref ? [{ id: "open-team", label: "Open Team", href: props.teamHref, description: "Open client team", icon: "T" }] : []),
    ...(props.backToAgencyHref
      ? [{ id: "back-to-agency", label: "Back to Agency", href: props.backToAgencyHref, description: "Return to agency workspace", icon: "A" }]
      : []),
  ];
  const statusSummary =
    props.readModel.summary.needs_attention_sites > 0
      ? `${props.readModel.summary.needs_attention_sites} site${props.readModel.summary.needs_attention_sites === 1 ? "" : "s"} need attention.`
      : props.readModel.summary.total_sites > 0
        ? "All connected sites are currently stable."
        : "No sites are connected yet.";

  return (
    <>
      <section style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gap: 3 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Client Workspace Summary</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              {props.viewMode === "agency-managed"
                ? "Agency-managed client view with scoped workspace actions."
                : "Your client workspace overview. Only your resolved client scope is shown."}
            </p>
          </div>

          <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#334155" }}>
            <div>
              <strong>Client:</strong> {props.readModel.client.client_name?.trim() || shortId(props.readModel.client.client_id)}
            </div>
            <div>
              <strong>Parent Agency:</strong> {props.readModel.agency.agency_name?.trim() || shortId(props.readModel.agency.agency_id)}
            </div>
            <div>
              <strong>Access Role:</strong> {props.roleLabel}
            </div>
            <div>
              <strong>Status:</strong> {statusSummary}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total Sites</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{props.readModel.summary.total_sites}</div>
        </article>
        <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Live</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#065f46" }}>{props.readModel.summary.live_sites}</div>
        </article>
        <article style={{ border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Needs Attention</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, color: "#9a3412" }}>
            {props.readModel.summary.needs_attention_sites}
          </div>
        </article>
      </section>

      <WorkspaceShortcuts
        title="Productivity Shortcuts"
        helperText={
          props.viewMode === "agency-managed"
            ? "Fast actions for this agency-managed client workspace."
            : "Fast actions for your current client workspace."
        }
        shortcuts={workspaceShortcuts}
      />

      <section
        id="client-sites"
        style={{ marginTop: 14, border: "1px solid #dbe6f1", borderRadius: 12, background: "#fff", padding: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Sites Overview</h3>
          {hasSites && hasImportAction ? <ActionLink href={props.importSiteHref!} label="Import Site" /> : null}
        </div>
        {hasSites ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {props.readModel.site_rows.map((site) => (
              <article key={site.site_id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{site.domain?.trim() || shortId(site.site_id)}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Site ID: {shortId(site.site_id)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <StatusChip label="Site" value={site.site_status} />
                    <StatusChip label="Migration" value={site.migration_status} />
                    <StatusChip label="Runtime" value={site.latest_runtime_state} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {props.siteWorkspaceHrefBuilder?.(site.site_id) ? (
                      <ActionLink href={props.siteWorkspaceHrefBuilder(site.site_id)!} label="Open Workspace" />
                    ) : null}
                    {site.live_url ? <ActionLink href={site.live_url} label="Open Live" external /> : null}
                    {site.preview_url ? <ActionLink href={site.preview_url} label="Open Preview" external /> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: 12,
              border: "1px dashed #cbd5e1",
              borderRadius: 10,
              padding: 14,
              background: "#f8fafc",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>No sites connected yet</div>
            <p style={{ margin: 0, fontSize: 13, color: "#475569", maxWidth: 760 }}>
              {hasManagementActions
                ? "This client does not have any connected sites in the current scoped workspace. You can still manage team and settings, then return here when sites are connected."
                : "This client does not have any connected sites in the current scoped workspace yet. Contact your agency manager if you need help connecting the first site."}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {hasImportAction ? (
                <Link
                  href={props.importSiteHref!}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: "1px solid #0f172a",
                    background: "#0f172a",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Import Existing Website
                </Link>
              ) : null}
              {props.settingsHref ? <ActionLink href={props.settingsHref} label="Open Settings" /> : null}
              {props.teamHref ? <ActionLink href={props.teamHref} label="Open Team" /> : null}
              {props.backToAgencyHref ? <ActionLink href={props.backToAgencyHref} label="Back to Agency" /> : null}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
