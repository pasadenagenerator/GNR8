import Link from "next/link";
import { buildWorkspaceOverviewModel } from "./model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CARD_STYLE = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  backgroundColor: "#ffffff",
} as const;

export default async function WorkspaceOverviewPage() {
  const model = await buildWorkspaceOverviewModel();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px", fontFamily: "ui-sans-serif, system-ui" }}>
      <header>
        <h1 style={{ margin: 0 }}>Website Workspace Overview</h1>
        <p style={{ marginTop: 6, color: "#4b5563" }}>Website Operating System Runtime v0</p>
      </header>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 10 }}>Overview</h2>
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

      <section style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Content</h3>
            <p style={{ margin: 0 }}>{model.overview.contentSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Design</h3>
            <p style={{ margin: 0 }}>{model.overview.designSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Experience</h3>
            <p style={{ margin: 0 }}>{model.overview.experienceSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Governance</h3>
            <p style={{ margin: 0 }}>{model.overview.governanceSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Operations</h3>
            <p style={{ margin: 0 }}>{model.overview.operationalSummary}</p>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Observations</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.observations.map((observation) => (
            <article key={observation.observationId} style={CARD_STYLE}>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>{observation.severity}</strong></p>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{observation.title}</h3>
              <p style={{ margin: 0 }}>{observation.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Validation Surfaces</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <article style={CARD_STYLE}>
            <Link href="/gnr8/admin/twin-preview">Twin Preview</Link>
          </article>
          <article style={CARD_STYLE}>
            <Link href="/gnr8/admin/twin-preview-real">Real Site Twin Preview</Link>
          </article>
          <article style={CARD_STYLE}>
            <Link href="/gnr8/admin/providers">Provider Governance Cockpit</Link>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Provider Governance Snapshot</h2>
        <article style={CARD_STYLE}>
          <p style={{ margin: 0 }}><strong>Provider Governance Status</strong></p>
          <p style={{ marginTop: 8, marginBottom: 0 }}>Execution Layer: Blocked</p>
          <p style={{ marginTop: 6, marginBottom: 0 }}>Governance State: Preview / non-executable</p>
        </article>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Explicit Boundaries</h2>
        <p style={{ margin: 0 }}>Read-only Workspace Runtime Preview</p>
        <p style={{ marginTop: 6, marginBottom: 0 }}>No editing available.</p>
        <p style={{ marginTop: 6, marginBottom: 0 }}>No AI actions available.</p>
        <p style={{ marginTop: 6, marginBottom: 0 }}>No publishing available.</p>
      </section>

      <section style={{ marginTop: 16 }}>
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Debug Diagnostics</summary>
          <div style={{ marginTop: 10 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Twin Source</h3>
            <p style={{ marginTop: 0 }}>
              {model.sourceId ?? "No imported site available."} → buildWebsiteDigitalTwin() → InMemoryTwinStore → createTwinOverview()
            </p>

            <h3 style={{ marginBottom: 8 }}>Diagnostics list</h3>
            <ul>
              {model.diagnostics.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>

            <h3 style={{ marginBottom: 8 }}>Import Source Diagnostics</h3>
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
              <dt>persistedEvidenceShapeStatus</dt>
              <dd>{model.importSourceDiagnostics.persistedEvidenceShapeStatus}</dd>
              <dt>persistedEvidenceMissingFields</dt>
              <dd>
                {model.importSourceDiagnostics.persistedEvidenceMissingFields.length > 0
                  ? model.importSourceDiagnostics.persistedEvidenceMissingFields.join(", ")
                  : "n/a"}
              </dd>
              <dt>persistedEvidenceAvailableFields</dt>
              <dd>
                {model.importSourceDiagnostics.persistedEvidenceAvailableFields.length > 0
                  ? model.importSourceDiagnostics.persistedEvidenceAvailableFields.join(", ")
                  : "n/a"}
              </dd>
              <dt>persistedEvidenceSourceKind</dt>
              <dd>{model.importSourceDiagnostics.persistedEvidenceSourceKind ?? "n/a"}</dd>
            </dl>

            <h3 style={{ marginBottom: 8 }}>Persisted Evidence Diagnostics</h3>
            <p style={{ marginTop: 0, marginBottom: 8 }}>
              selected={String(model.importSourceDiagnostics.persistedEvidenceSelected)}; status=
              {model.importSourceDiagnostics.persistedEvidenceShapeStatus}; reason=
              {model.importSourceDiagnostics.persistedEvidenceReason ?? "n/a"}
            </p>

            <h3 style={{ marginBottom: 8 }}>Branch Diagnostics</h3>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {Object.entries(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics).map(([branch, diagnostic]) => (
                <li key={branch}>
                  {branch}: present={String(diagnostic.present)}; type={diagnostic.type}
                  {diagnostic.keys.length > 0 ? `; keys=${diagnostic.keys.join(",")}` : ""}
                  {diagnostic.itemCount != null ? `; itemCount=${diagnostic.itemCount}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </section>
    </main>
  );
}
