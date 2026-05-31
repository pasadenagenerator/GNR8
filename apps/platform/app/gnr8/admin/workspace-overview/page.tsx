import Link from "next/link";
import { buildWorkspaceOverviewModel } from "./model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CARD_STYLE = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  backgroundColor: "#f9fafb",
} as const;

export default async function WorkspaceOverviewPage() {
  const model = await buildWorkspaceOverviewModel();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px", fontFamily: "ui-sans-serif, system-ui" }}>
      <header>
        <h1 style={{ margin: 0 }}>Website Workspace Overview</h1>
        <p style={{ marginTop: 8, color: "#4b5563" }}>Website Operating System Runtime v0</p>
      </header>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Twin Source</h2>
        <p style={{ margin: 0 }}>
          {model.sourceId ?? "No imported site available."} → buildWebsiteDigitalTwin() → InMemoryTwinStore → createTwinOverview()
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Overview Cards</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Twin Status</h3>
            <p style={{ margin: 0 }}>{model.overview.status}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Environment Scope</h3>
            <p style={{ margin: 0 }}>{model.overview.environmentScope}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Site Version</h3>
            <p style={{ margin: 0 }}>{model.overview.siteVersionId}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Last Updated</h3>
            <p style={{ margin: 0 }}>{model.overview.lastUpdated}</p>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Domain Sections</h2>
        <dl>
          <dt>Content</dt>
          <dd>{model.overview.contentSummary}</dd>
          <dt>Design</dt>
          <dd>{model.overview.designSummary}</dd>
          <dt>Experience</dt>
          <dd>{model.overview.experienceSummary}</dd>
          <dt>Governance</dt>
          <dd>{model.overview.governanceSummary}</dd>
          <dt>Operations</dt>
          <dd>{model.overview.operationalSummary}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Diagnostics</h2>
        <ul>
          {model.diagnostics.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Import Source Diagnostics</h2>
        <dl>
          <dt>selectedSource</dt>
          <dd>{model.importSourceDiagnostics.selectedSource}</dd>
          <dt>stableArtifactPath</dt>
          <dd>{model.importSourceDiagnostics.stableArtifactPath ?? "n/a"}</dd>
          <dt>importedUrlSnapshotDirectory</dt>
          <dd>{model.importSourceDiagnostics.importedUrlSnapshotDirectory ?? "n/a"}</dd>
          <dt>importedUrlSnapshotCount</dt>
          <dd>{model.importSourceDiagnostics.importedUrlSnapshotCount}</dd>
          <dt>fallbackReason</dt>
          <dd>{model.importSourceDiagnostics.fallbackReason ?? "n/a"}</dd>
          <dt>persistedEvidenceChecked</dt>
          <dd>{String(model.importSourceDiagnostics.persistedEvidenceChecked)}</dd>
          <dt>persistedEvidenceAvailable</dt>
          <dd>{String(model.importSourceDiagnostics.persistedEvidenceAvailable)}</dd>
          <dt>persistedEvidenceSelected</dt>
          <dd>{String(model.importSourceDiagnostics.persistedEvidenceSelected)}</dd>
          <dt>persistedEvidenceReason</dt>
          <dd>{model.importSourceDiagnostics.persistedEvidenceReason ?? "n/a"}</dd>
          <dt>persistedEvidenceSiteVersionId</dt>
          <dd>{model.importSourceDiagnostics.persistedEvidenceSiteVersionId ?? "n/a"}</dd>
          <dt>persistedEvidenceImportId</dt>
          <dd>{model.importSourceDiagnostics.persistedEvidenceImportId ?? "n/a"}</dd>
        </dl>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Validation Surfaces</h2>
        <ul>
          <li><Link href="/gnr8/admin/twin-preview">Twin Preview</Link></li>
          <li><Link href="/gnr8/admin/twin-preview-real">Real Site Twin Preview</Link></li>
          <li><Link href="/gnr8/admin/providers">Provider Governance Cockpit</Link></li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Provider Governance Snapshot</h2>
        <p style={{ margin: 0 }}><strong>Provider Governance Status</strong></p>
        <p style={{ marginTop: 8, marginBottom: 0 }}>Execution Layer:</p>
        <p style={{ marginTop: 4 }}>Blocked</p>
        <p style={{ marginTop: 8, marginBottom: 0 }}>Governance State:</p>
        <p style={{ marginTop: 4 }}>Preview / non-executable</p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Explicit Boundaries</h2>
        <p style={{ margin: 0 }}>Read-only Workspace Runtime Preview</p>
        <p style={{ marginTop: 8, marginBottom: 0 }}>No editing available.</p>
        <p style={{ marginTop: 8, marginBottom: 0 }}>No AI actions available.</p>
        <p style={{ marginTop: 8, marginBottom: 0 }}>No publishing available.</p>
      </section>
    </main>
  );
}
