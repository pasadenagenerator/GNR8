import Link from "next/link";
import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import type { BuildWebsiteDigitalTwinInput } from "@/gnr8/runtime/twin/twin-builder";
import { InMemoryTwinStore } from "@/gnr8/runtime/twin/twin-store";
import { createTwinOverview } from "@/gnr8/runtime/twin/twin-viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TWIN_PREVIEW_FIXTURE = {
  siteId: "site_fixture_pasadena_primary",
  siteVersionId: "site_version_fixture_2026_05_30",
  workspaceId: "workspace_fixture_admin_validation",
  environmentScope: "preview",
  sourceImportId: "import_fixture_runtime_preview",
  sourceModels: ["content_model", "design_model", "experience_model", "governance_model", "operational_model"],
  generatedBy: "twin_preview_page_v1",
  nowIso: "2026-05-30T00:00:00.000Z",
} satisfies BuildWebsiteDigitalTwinInput;

export default function TwinPreviewPage() {
  const twin = buildWebsiteDigitalTwin(TWIN_PREVIEW_FIXTURE);
  const store = new InMemoryTwinStore();
  store.saveTwin(twin);

  const storedTwin = store.getTwinBySiteVersion(TWIN_PREVIEW_FIXTURE.siteVersionId);

  if (!storedTwin) {
    throw new Error("TWIN_PREVIEW_RUNTIME_INVARIANT: stored twin missing for fixture site version");
  }

  const overview = createTwinOverview(storedTwin);
  const diagnostics = [
    ...storedTwin.diagnostics,
    ...storedTwin.metadata.diagnostics,
    ...store.diagnostics,
    ...overview.diagnostics,
  ];

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "ui-sans-serif, system-ui" }}>
      <header>
        <h1 style={{ margin: 0 }}>Website Digital Twin Runtime Preview</h1>
        <p style={{ marginTop: 8, color: "#4b5563" }}>Read-only validation surface</p>
      </header>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Identity</h2>
        <dl>
          <dt>twinId</dt>
          <dd>{overview.twinId}</dd>
          <dt>siteId</dt>
          <dd>{overview.siteId}</dd>
          <dt>siteVersionId</dt>
          <dd>{overview.siteVersionId}</dd>
          <dt>workspaceId</dt>
          <dd>{overview.workspaceId}</dd>
          <dt>environmentScope</dt>
          <dd>{overview.environmentScope}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Status</h2>
        <p>{overview.status}</p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Summaries</h2>
        <dl>
          <dt>contentSummary</dt>
          <dd>{overview.contentSummary}</dd>
          <dt>designSummary</dt>
          <dd>{overview.designSummary}</dd>
          <dt>experienceSummary</dt>
          <dd>{overview.experienceSummary}</dd>
          <dt>governanceSummary</dt>
          <dd>{overview.governanceSummary}</dd>
          <dt>operationalSummary</dt>
          <dd>{overview.operationalSummary}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Website OS Navigation</h2>
        <ul>
          <li><Link href="/gnr8/admin/workspace-overview">Workspace Overview</Link></li>
          <li><Link href="/gnr8/admin/twin-preview-real">Real Site Twin Preview</Link></li>
          <li><Link href="/gnr8/admin/providers">Provider Governance Cockpit</Link></li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Diagnostics</h2>
        <ul>
          {diagnostics.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
