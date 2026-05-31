import Link from "next/link";
import { buildRealSiteTwinPreviewModel } from "./model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TwinPreviewRealPage() {
  const model = await buildRealSiteTwinPreviewModel();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "ui-sans-serif, system-ui" }}>
      <header>
        <h1 style={{ margin: 0 }}>Website Digital Twin Runtime Preview (Real Site)</h1>
        <p style={{ marginTop: 8, color: "#4b5563" }}>Read-only validation surface</p>
      </header>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Source</h2>
        <dl>
          <dt>fixtureId</dt>
          <dd>{model.fixtureId}</dd>
          <dt>sourceSiteVersionId</dt>
          <dd>{model.sourceSiteVersionId}</dd>
          <dt>sourceImportId</dt>
          <dd>{model.sourceImportId}</dd>
          <dt>generatedAt</dt>
          <dd>{model.generatedAt}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Identity</h2>
        <dl>
          <dt>twinId</dt>
          <dd>{model.overview.twinId}</dd>
          <dt>siteId</dt>
          <dd>{model.overview.siteId}</dd>
          <dt>siteVersionId</dt>
          <dd>{model.overview.siteVersionId}</dd>
          <dt>workspaceId</dt>
          <dd>{model.overview.workspaceId}</dd>
          <dt>environmentScope</dt>
          <dd>{model.overview.environmentScope}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Status</h2>
        <p>{model.overview.status}</p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Summaries</h2>
        <dl>
          <dt>contentSummary</dt>
          <dd>{model.overview.contentSummary}</dd>
          <dt>designSummary</dt>
          <dd>{model.overview.designSummary}</dd>
          <dt>experienceSummary</dt>
          <dd>{model.overview.experienceSummary}</dd>
          <dt>governanceSummary</dt>
          <dd>{model.overview.governanceSummary}</dd>
          <dt>operationalSummary</dt>
          <dd>{model.overview.operationalSummary}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Website OS Navigation</h2>
        <ul>
          <li><Link href="/gnr8/admin/workspace-overview">Workspace Overview</Link></li>
          <li><Link href="/gnr8/admin/twin-preview">Twin Preview</Link></li>
          <li><Link href="/gnr8/admin/providers">Provider Governance Cockpit</Link></li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Diagnostics</h2>
        <ul>
          {model.diagnostics.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
