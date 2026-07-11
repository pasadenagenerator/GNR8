import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import type {
  GenerationArtifactLinkProjection,
  GenerationEvolutionDashboardProjection,
  GenerationIterationProjection,
} from "@/gnr8/architecture/generation-evolution-dashboard-projection";
import { loadGenerationEvolutionDashboardProjection } from "@/gnr8/architecture/generation-evolution-dashboard-projection";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ siteVersionId: string }>;
};

const shellStyle: CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "28px 20px 56px",
  fontFamily: "ui-sans-serif, system-ui",
  color: "#111827",
};

const bandStyle: CSSProperties = {
  borderTop: "1px solid #d7e2ee",
  paddingTop: 18,
  marginTop: 24,
};

const cardStyle: CSSProperties = {
  border: "1px solid #d7e2ee",
  borderRadius: 8,
  background: "#ffffff",
  padding: 14,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

function EmptyText(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{props.children}</p>;
}

function Field(props: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{props.label}</p>
      <p style={{ margin: "5px 0 0", fontSize: 14, overflowWrap: "anywhere" }}>
        {props.value ?? "not available"}
      </p>
    </div>
  );
}

function CodeRef(props: { value: string | null }) {
  return (
    <code style={{
      display: "block",
      border: "1px solid #d7e2ee",
      borderRadius: 6,
      padding: "7px 8px",
      background: "#f8fafc",
      fontSize: 12,
      overflowWrap: "anywhere",
      whiteSpace: "normal",
    }}>
      {props.value ?? "missing"}
    </code>
  );
}

function StatusPill(props: { value: string | null | undefined }) {
  const value = props.value ?? "missing";
  const warning = value.includes("missing") || value.includes("unavailable") || value.includes("non_compliant");
  return (
    <span style={{
      display: "inline-block",
      border: `1px solid ${warning ? "#f5b8a8" : "#a7d7c5"}`,
      borderRadius: 999,
      padding: "3px 8px",
      background: warning ? "#fff7ed" : "#eefbf4",
      color: warning ? "#9a3412" : "#166534",
      fontSize: 12,
    }}>
      {value}
    </span>
  );
}

function ArtifactLinkList(props: { artifacts: GenerationArtifactLinkProjection[] }) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {props.artifacts.map((artifact) => (
        <div id={artifact.artifactId ? `artifact-${artifact.artifactId}` : undefined} key={`${artifact.kind}:${artifact.label}`} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{artifact.label}</strong>
            <StatusPill value={artifact.status ?? (artifact.missing ? "missing" : "reference")} />
          </div>
          <p style={{ margin: "8px 0 5px", color: "#475569", fontSize: 13 }}>{artifact.kind}</p>
          <CodeRef value={artifact.artifactId} />
          {artifact.canonicalId ? <p style={{ margin: "7px 0 0", color: "#475569", fontSize: 13 }}>canonical: {artifact.canonicalId}</p> : null}
        </div>
      ))}
    </div>
  );
}

function Summary(props: { model: GenerationEvolutionDashboardProjection }) {
  const cycle = props.model.cycle;
  return (
    <section style={bandStyle}>
      <h2>Generation Cycle Summary</h2>
      <div style={gridStyle}>
        <Field label="website/project" value={`${cycle.websiteIdentity} / ${cycle.projectIdentity}`} />
        <Field label="siteVersionId" value={cycle.siteVersionId} />
        <Field label="dryRunId" value={cycle.dryRunId} />
        <Field label="Generation Cycle" value={cycle.generationCycleLabel} />
        <Field label="current iteration" value={cycle.currentIteration} />
        <Field label="cycle state" value={cycle.cycleState} />
        <Field label="overall trajectory" value={cycle.overallTrajectory} />
        <Field label="latest compliance" value={cycle.latestComplianceStatus} />
        <Field label="latest evolution assessment" value={cycle.latestEvolutionAssessment} />
        <Field label="latest recommendation" value={cycle.latestRecommendation} />
        <Field label="business confidence" value={cycle.businessConfidence} />
        <Field label="unresolved knowledge" value={cycle.unresolvedKnowledgeSummary} />
      </div>
    </section>
  );
}

function Timeline(props: { model: GenerationEvolutionDashboardProjection }) {
  return (
    <section style={bandStyle}>
      <h2>Evolution Timeline</h2>
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {props.model.timeline.map((item, index) => (
          <li key={item} style={{ marginBottom: 10 }}>
            <strong>{item}</strong>
            {index < props.model.timeline.length - 1 ? <span style={{ color: "#64748b" }}> ↓</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function PreviewLinks(props: { iteration: GenerationIterationProjection }) {
  return (
    <div style={{ ...cardStyle, background: "#f8fafc" }}>
      <h4 style={{ margin: "0 0 8px" }}>Generated Website</h4>
      <p style={{ margin: "0 0 8px" }}><StatusPill value={props.iteration.preview.available ? "preview available" : "preview unavailable"} /></p>
      <a href={props.iteration.preview.route} style={{ color: "#0f766e", fontWeight: 700 }}>Open Website Preview</a>
      <p style={{ margin: "8px 0 4px", color: "#475569", fontSize: 13 }}>Open Source Proposal reference</p>
      <CodeRef value={props.iteration.preview.sourceProposalReference} />
      <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
        {props.iteration.preview.bundleLabel ?? "bundle missing"} / {props.iteration.preview.entryFile}
      </p>
      {props.iteration.preview.unavailableReason ? (
        <p style={{ margin: "8px 0 0", color: "#9a3412", fontSize: 13 }}>{props.iteration.preview.unavailableReason}</p>
      ) : null}
    </div>
  );
}

function IterationCard(props: { iteration: GenerationIterationProjection }) {
  const iteration = props.iteration;
  const compliance = iteration.compliance;
  return (
    <article style={{ ...cardStyle, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{iteration.label}</h3>
        <StatusPill value={iteration.status} />
      </div>
      <div style={{ ...gridStyle, marginTop: 12 }}>
        <Field label="generated-at" value={iteration.generatedAt} />
        <Field label="Generated Proposal status" value={iteration.generatedProposalStatus} />
        <Field label="Observed Website readiness" value={iteration.observedWebsiteReadiness} />
        <Field label="Compliance status" value={compliance.status} />
        <Field label="compliant / partial / non-compliant" value={`${compliance.compliantCategoryCount} / ${compliance.partialCategoryCount} / ${compliance.nonCompliantCategoryCount}`} />
        <Field label="evidence count" value={compliance.evidenceCount} />
        <Field label="limitation count" value={compliance.limitationCount} />
        <Field label="recommendation" value={compliance.recommendation} />
      </div>
      <div style={{ marginTop: 12 }}>
        <PreviewLinks iteration={iteration} />
      </div>
      {iteration.evolution ? (
        <div style={{ ...cardStyle, marginTop: 12 }}>
          <h4 style={{ margin: "0 0 8px" }}>Evolution Result</h4>
          <div style={gridStyle}>
            <Field label="meaningful improvement" value={iteration.evolution.meaningfulImprovement ? "yes" : "no"} />
            <Field label="newly compliant categories" value={iteration.evolution.newlyCompliantCategories.join(", ") || "none"} />
            <Field label="improved categories" value={iteration.evolution.improvedCategories.join(", ") || "none"} />
            <Field label="unresolved categories" value={iteration.evolution.unresolvedCategories.join(", ") || "none"} />
            <Field label="no regressions" value={iteration.evolution.noRegressions ? "yes" : "no"} />
          </div>
        </div>
      ) : null}
      <h4>Read-Only Artifact References</h4>
      <ArtifactLinkList artifacts={iteration.artifacts} />
    </article>
  );
}

function AttentionStates(props: { model: GenerationEvolutionDashboardProjection }) {
  return (
    <section style={bandStyle}>
      <h2>Attention States</h2>
      {props.model.attentionStates.length === 0 ? (
        <div style={cardStyle}><EmptyText>No attention states.</EmptyText></div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {props.model.attentionStates.map((state) => <StatusPill key={state} value={state} />)}
        </div>
      )}
    </section>
  );
}

export default async function GenerationEvolutionDashboardPage(props: PageProps) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") redirect("/login");
    if (message.startsWith("Forbidden")) redirect("/superadmin");
    throw error;
  }

  const { siteVersionId: rawSiteVersionId } = await props.params;
  const siteVersionId = String(rawSiteVersionId ?? "").trim();
  const model = await loadGenerationEvolutionDashboardProjection({ siteVersionId });

  return (
    <main style={shellStyle}>
      <header>
        <p style={{ margin: "0 0 6px", color: "#0f766e", fontWeight: 700 }}>Read-only GNR8 Runtime UX</p>
        <h1 style={{ margin: 0 }}>Generation Evolution Dashboard</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          ODV generation history, generated proposal previews, compliance results, evolution analysis, and canonical artifact lineage.
        </p>
      </header>

      <Summary model={model} />

      <section style={bandStyle}>
        <h2>Business Foundation</h2>
        <ArtifactLinkList artifacts={model.sharedBusinessArtifacts} />
      </section>

      <Timeline model={model} />

      <section style={bandStyle}>
        <h2>Iteration Cards</h2>
        {model.iterations.map((iteration) => <IterationCard key={iteration.iteration} iteration={iteration} />)}
      </section>

      <section style={bandStyle}>
        <h2>Evolution Analysis</h2>
        {model.evolution ? (
          <div style={gridStyle}>
            <Field label="artifact" value={model.evolution.artifactId} />
            <Field label="status" value={model.evolution.status} />
            <Field label="overall assessment" value={model.evolution.overallAssessment} />
            <Field label="recommended next action" value={model.evolution.recommendedNextAction} />
            <Field label="regression count" value={model.evolution.regressionCount} />
          </div>
        ) : (
          <div style={cardStyle}><EmptyText>No Evolution Analysis artifact is available.</EmptyText></div>
        )}
      </section>

      <AttentionStates model={model} />

      <section style={bandStyle}>
        <h2>Artifact Lineage</h2>
        <ArtifactLinkList artifacts={model.artifactLineage} />
      </section>
    </main>
  );
}
