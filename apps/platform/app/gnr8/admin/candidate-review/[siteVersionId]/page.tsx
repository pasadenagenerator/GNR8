import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import type { CSSProperties, ReactNode } from "react";

import {
  loadLatestCandidateReviewSurfaceProjection,
  type CandidateReviewSurfaceCandidateContext,
  type CandidateReviewSurfaceCandidateGroups,
  type CandidateReviewSurfaceDecision,
  type CandidateReviewSurfaceProjection,
} from "@/gnr8/architecture/candidate-review-surface-projection";
import type { CandidateLimitation } from "@/gnr8/architecture/candidate-discovery-contract";
import type { CandidateContextProjection } from "@/gnr8/architecture/candidate-context-projection";
import { loadCandidateContextProjectionsForReview } from "@/gnr8/architecture/candidate-context-review-runtime";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { CandidateReviewActionControls } from "./CandidateReviewActionControls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ siteVersionId: string }> };

const shellStyle: CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  padding: "32px 20px 56px",
  fontFamily: "ui-sans-serif, system-ui",
  color: "#0f172a",
};
const panelStyle: CSSProperties = {
  border: "1px solid #dbe6f1",
  borderRadius: 10,
  backgroundColor: "#ffffff",
  padding: 16,
};
const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

function EmptyText(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{props.children}</p>;
}

function Field(props: { label: string; value: string | number | null }) {
  return (
    <div style={panelStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{props.label}</p>
      <p style={{ margin: "5px 0 0", fontSize: 16, fontWeight: 650, overflowWrap: "anywhere" }}>
        {props.value ?? "Not available"}
      </p>
    </div>
  );
}

function StringList(props: { values: readonly string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return <ul style={{ margin: 0, paddingLeft: 18 }}>{props.values.map((value, index) => <li key={`${index}:${value}`}>{value}</li>)}</ul>;
}

function Limitations(props: { values: CandidateLimitation[] }) {
  if (props.values.length === 0) return <EmptyText>No limitations.</EmptyText>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {props.values.map((item, index) => (
        <li key={`${index}:${item.limitationId}`}>
          <strong>{item.severity}</strong>: {item.code} - {item.message}{item.sourceRef ? ` (${item.sourceRef})` : ""}
        </li>
      ))}
    </ul>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function candidateTypeLabel(candidate: CandidateReviewSurfaceCandidateContext) {
  if (candidate.candidateType === "navigation") return "Navigation";
  return titleCase(candidate.candidateType);
}

function candidateName(candidate: CandidateReviewSurfaceCandidateContext) {
  const route = candidate.routePath ?? "an unspecified route";
  if (candidate.candidateType === "navigation") return `Navigation section on ${route}`;
  if (candidate.candidateType === "section") return `Section on ${route}`;
  return `Route ${route}`;
}

function reviewStatus(model: CandidateReviewSurfaceProjection) {
  if (model.state === "invalid") return "Needs attention";
  if (model.state === "missing") return "Needs review";
  if (model.counts.unreviewed > 0) return "Needs review";
  return "Review complete";
}

function CandidateTechnicalDetails(props: {
  candidate: CandidateReviewSurfaceCandidateContext;
  decision?: CandidateReviewSurfaceDecision;
  context?: CandidateContextProjection;
}) {
  const { candidate, decision, context } = props;
  return (
    <details style={{ marginTop: 14 }}>
      <summary style={{ cursor: "pointer", color: "#475569", fontWeight: 600 }}>Technical details</summary>
      <dl style={{ display: "grid", gap: 7, margin: "12px 0 0" }}>
        <dt>Candidate ID</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{candidate.candidateId}</dd>
        <dt>Candidate status</dt><dd style={{ margin: 0 }}>{candidate.candidateStatus}</dd>
        <dt>Confidence reasons</dt><dd style={{ margin: 0 }}><StringList values={candidate.confidence.reasons} empty="No confidence reasons." /></dd>
        <dt>Limitations</dt><dd style={{ margin: 0 }}><Limitations values={candidate.limitations} /></dd>
        <dt>Candidate diagnostics</dt><dd style={{ margin: 0 }}><StringList values={candidate.diagnostics} empty="No candidate diagnostics." /></dd>
        {context ? <>
          <dt>Context state</dt><dd style={{ margin: 0 }}>{context.state}</dd>
          <dt>Screenshot artifact path</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{context.screenshot?.artifactPath ?? "None"}</dd>
          <dt>Screenshot evidence ref</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{context.screenshot?.screenshotEvidenceRef ?? "None"}</dd>
          <dt>Geometry evidence refs</dt><dd style={{ margin: 0 }}><StringList values={context.highlight?.sourceGeometryEvidenceRefs ?? []} empty="No geometry evidence refs." /></dd>
          <dt>Candidate evidence refs</dt><dd style={{ margin: 0 }}><StringList values={context.evidenceSummary.candidateEvidenceRefs} empty="No candidate evidence refs." /></dd>
          <dt>Model evidence refs</dt><dd style={{ margin: 0 }}><StringList values={context.evidenceSummary.modelEvidenceRefs} empty="No model evidence refs." /></dd>
          <dt>Dry Run refs</dt><dd style={{ margin: 0 }}><StringList values={context.evidenceSummary.dryRunRefs} empty="No Dry Run refs." /></dd>
          <dt>Context diagnostics</dt><dd style={{ margin: 0 }}><StringList values={context.diagnostics.map((item) => `${item.code}: ${item.message}${item.sourceRef ? ` (${item.sourceRef})` : ""}`)} empty="No context diagnostics." /></dd>
        </> : null}
        {decision ? <>
          <dt>Review event ID</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{decision.reviewEventId}</dd>
          <dt>Reviewer ref</dt><dd style={{ margin: 0 }}>{decision.reviewerRef}</dd>
          <dt>Decided at</dt><dd style={{ margin: 0 }}>{decision.decidedAt}</dd>
          <dt>Supersedes review event ID</dt><dd style={{ margin: 0 }}>{decision.supersedesReviewEventId ?? "None"}</dd>
          <dt>Event diagnostics</dt><dd style={{ margin: 0 }}><StringList values={decision.diagnostics} empty="No event diagnostics." /></dd>
        </> : null}
      </dl>
    </details>
  );
}

type ActionTarget = {
  siteVersionId: string;
  candidateDiscoveryArtifactId: string;
  candidateReviewPackageArtifactId: string;
};

type CandidateContextPresentation = {
  projection: CandidateContextProjection;
  screenshotSrc: string | null;
};

async function screenshotSource(projection: CandidateContextProjection): Promise<string | null> {
  const path = projection.screenshot?.artifactPath;
  if (!path) return null;
  if (path.startsWith("data:image/") || path.startsWith("https://") || path.startsWith("http://")) return path;
  try {
    const bytes = await readFile(path);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function ContextLimitations(props: { projection: CandidateContextProjection }) {
  if (props.projection.limitations.length === 0) return <EmptyText>No known limitations.</EmptyText>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {props.projection.limitations.map((item, index) => (
        <li key={`${index}:${item.code}`}><strong>{titleCase(item.severity)}</strong>: {item.message}</li>
      ))}
    </ul>
  );
}

function EvidenceSummary(props: { projection: CandidateContextProjection }) {
  const summary = props.projection.evidenceSummary;
  const items = [
    summary.candidateEvidenceRefs.length ? `${summary.candidateEvidenceRefs.length} candidate evidence ref${summary.candidateEvidenceRefs.length === 1 ? "" : "s"}` : null,
    summary.modelEvidenceRefs.length ? `${summary.modelEvidenceRefs.length} model evidence ref${summary.modelEvidenceRefs.length === 1 ? "" : "s"}` : null,
    summary.dryRunRefs.length ? `${summary.dryRunRefs.length} Dry Run ref${summary.dryRunRefs.length === 1 ? "" : "s"}` : null,
  ].filter((item): item is string => Boolean(item));
  return <StringList values={items} empty="No additional evidence refs." />;
}

function ContextScreenshot(props: CandidateContextPresentation) {
  const { projection, screenshotSrc } = props;
  if (!screenshotSrc) return null;
  const highlight = projection.highlight;
  return (
    <div
      data-candidate-context-screenshot={projection.lineage.candidateType}
      style={{ position: "relative", width: "100%", overflow: "hidden", border: "1px solid #cbd5e1", borderRadius: 8, backgroundColor: "#e2e8f0" }}
    >
      {/* The persisted bitmap is reused as-is; only the projected rectangle is scaled in CSS. */}
      <img src={screenshotSrc} alt={`Full-page screenshot for ${projection.candidateLabel ?? "candidate"}`} style={{ display: "block", width: "100%", height: "auto" }} />
      {highlight ? (
        <div
          data-candidate-context-overlay={highlight.kind}
          aria-label={`${highlight.label} highlight`}
          style={{
            position: "absolute",
            pointerEvents: "none",
            left: `${(highlight.x / highlight.sourceViewportWidth) * 100}%`,
            top: `${(highlight.y / highlight.sourceDocumentHeight) * 100}%`,
            width: `${(highlight.width / highlight.sourceViewportWidth) * 100}%`,
            height: `${(highlight.height / highlight.sourceDocumentHeight) * 100}%`,
            border: "3px solid #f97316",
            backgroundColor: "rgba(249, 115, 22, 0.2)",
            boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.85)",
          }}
        />
      ) : null}
    </div>
  );
}

function CandidateContextPanel(props: { context?: CandidateContextPresentation }) {
  const context = props.context;
  return (
    <details data-candidate-context-panel style={{ ...panelStyle, marginTop: 14, backgroundColor: "#f8fafc" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>View Context</summary>
      {!context ? (
        <div role="status" style={{ marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: "#fff7ed", color: "#9a3412" }}>
          <strong>Visual evidence unavailable</strong>
          <p style={{ margin: "5px 0 0" }}>Candidate context could not be resolved from the review package lineage. Consider Defer until evidence is available.</p>
        </div>
      ) : <>
        {context.projection.state === "incomplete" ? (
          <div role="status" style={{ marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: "#fffbeb", color: "#92400e" }}>
            <strong>Visual context incomplete</strong>
            <p style={{ margin: "5px 0 0" }}>The available screenshot is shown, but some contextual evidence is missing or ambiguous.</p>
          </div>
        ) : null}
        {context.projection.state === "unavailable" || !context.screenshotSrc ? (
          <div role="status" style={{ marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: "#fff7ed", color: "#9a3412" }}>
            <strong>Visual evidence unavailable</strong>
            <p style={{ margin: "5px 0 0" }}>The exact persisted screenshot could not be displayed. Consider Defer until evidence is available.</p>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}><ContextScreenshot {...context} /></div>
        )}
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 16px", margin: "16px 0 0" }}>
          <dt style={{ color: "#64748b" }}>Route path</dt><dd style={{ margin: 0 }}>{context.projection.lineage.routePath ?? "Not available"}</dd>
          <dt style={{ color: "#64748b" }}>Confidence</dt><dd style={{ margin: 0 }}>{context.projection.confidence ? titleCase(context.projection.confidence) : "Not available"}</dd>
          {context.projection.evidenceSummary.route ? <>
            <dt style={{ color: "#64748b" }}>Route summary</dt>
            <dd style={{ margin: 0 }}>{context.projection.evidenceSummary.route.navigationCount} navigation and {context.projection.evidenceSummary.route.sectionCount} section candidates</dd>
          </> : null}
          {context.projection.evidenceSummary.navigation ? <>
            <dt style={{ color: "#64748b" }}>Navigation item count</dt><dd style={{ margin: 0 }}>{context.projection.evidenceSummary.navigation.itemCount}</dd>
            <dt style={{ color: "#64748b" }}>Ordered labels</dt><dd style={{ margin: 0 }}><StringList values={context.projection.evidenceSummary.navigation.orderedLabels} empty="No navigation labels." /></dd>
          </> : null}
          {context.projection.evidenceSummary.section ? <>
            <dt style={{ color: "#64748b" }}>Structural label</dt><dd style={{ margin: 0 }}>{context.projection.evidenceSummary.section.structuralLabel}</dd>
          </> : null}
          <dt style={{ color: "#64748b" }}>Evidence summary</dt><dd style={{ margin: 0 }}><EvidenceSummary projection={context.projection} /></dd>
          <dt style={{ color: "#64748b" }}>Limitations</dt><dd style={{ margin: 0 }}><ContextLimitations projection={context.projection} /></dd>
        </dl>
      </>}
    </details>
  );
}

function CandidateCard(props: {
  candidate: CandidateReviewSurfaceCandidateContext;
  decision?: CandidateReviewSurfaceDecision;
  actionTarget: ActionTarget | null;
  context?: CandidateContextPresentation;
}) {
  const { candidate, decision } = props;
  const name = candidateName(candidate);
  const decisionLabel = decision ? titleCase(decision.decision) : "Needs review";
  return (
    <article style={panelStyle}>
      <h3 style={{ margin: 0, fontSize: 18 }}>{name}</h3>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: "14px 0 0" }}>
        <dt style={{ color: "#64748b" }}>Type</dt><dd style={{ margin: 0 }}>{candidateTypeLabel(candidate)}</dd>
        <dt style={{ color: "#64748b" }}>Route path</dt><dd style={{ margin: 0 }}>{candidate.routePath ?? "Not available"}</dd>
        <dt style={{ color: "#64748b" }}>Confidence</dt><dd style={{ margin: 0 }}>{titleCase(candidate.confidence.level)}</dd>
        <dt style={{ color: "#64748b" }}>Current decision</dt><dd style={{ margin: 0, fontWeight: 650 }}>{decisionLabel}</dd>
        {decision?.rationale ? <><dt style={{ color: "#64748b" }}>Rationale</dt><dd style={{ margin: 0 }}>{decision.rationale}</dd></> : null}
      </dl>
      <CandidateContextPanel context={props.context} />
      <CandidateTechnicalDetails candidate={candidate} decision={decision} context={props.context?.projection} />
      {props.actionTarget ? (
        <CandidateReviewActionControls
          {...props.actionTarget}
          candidateId={candidate.candidateId}
          candidateLabel={name}
        />
      ) : null}
    </article>
  );
}

function groupedValues<T>(groups: CandidateReviewSurfaceCandidateGroups<T>): T[] {
  return [
    ...groups.routes,
    ...groups.navigation,
    ...groups.sectionsByRoute.flatMap((group) => group.candidates),
    ...groups.unscopedSections,
  ];
}

function CandidateGroup<T>(props: {
  title: "Approved" | "Rejected" | "Deferred" | "Needs review";
  groups: CandidateReviewSurfaceCandidateGroups<T>;
  render: (item: T) => ReactNode;
}) {
  const values = groupedValues(props.groups);
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ marginBottom: 12 }}>{props.title}</h2>
      {values.length === 0 ? (
        <div style={panelStyle}><EmptyText>No candidates in this group.</EmptyText></div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>{values.map((item, index) => <div key={index}>{props.render(item)}</div>)}</div>
      )}
    </section>
  );
}

function OverviewDetails(props: { model: CandidateReviewSurfaceProjection }) {
  const artifact = props.model.artifact;
  const linked = props.model.linkedCandidateDiscovery;
  return (
    <section>
      <h3>Artifact refs and lineage</h3>
      <div style={gridStyle}>
        <Field label="Artifact ref" value={artifact?.artifactId ?? null} />
        <Field label="Review package ID" value={artifact?.reviewPackageId ?? null} />
        <Field label="Candidate Discovery artifact ID" value={artifact?.candidateDiscoveryArtifactId ?? null} />
        <Field label="Dry run ID" value={artifact?.dryRunId ?? null} />
        <Field label="Created at" value={artifact?.createdAt ?? null} />
        <Field label="Persisted at" value={artifact?.persistedAt ?? null} />
        <Field label="Contract version" value={artifact?.contractVersion ?? null} />
        <Field label="Latest review artifact" value={artifact ? String(artifact.isLatestReviewArtifact) : null} />
        <Field label="Linked discovery ID" value={linked?.discoveryId ?? null} />
        <Field label="Latest Candidate Discovery artifact" value={linked?.latestArtifactId ?? null} />
      </div>
    </section>
  );
}

function EventHistory(props: { model: CandidateReviewSurfaceProjection }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h3>Review event history and supersession details</h3>
      {props.model.reviewEventHistory.length === 0 ? <EmptyText>No immutable review events.</EmptyText> : (
        <div style={{ display: "grid", gap: 10 }}>
          {props.model.reviewEventHistory.map((event) => (
            <article key={event.reviewEventId} style={panelStyle}>
              <dl style={{ display: "grid", gap: 7, margin: 0 }}>
                <dt>Review event ID</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{event.reviewEventId}</dd>
                <dt>Candidate ID</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{event.candidateId}</dd>
                <dt>Decision</dt><dd style={{ margin: 0 }}>{event.decision}</dd>
                <dt>Reviewer ref</dt><dd style={{ margin: 0 }}>{event.reviewerRef}</dd>
                <dt>Decided at</dt><dd style={{ margin: 0 }}>{event.decidedAt}</dd>
                <dt>Supersedes review event ID</dt><dd style={{ margin: 0 }}>{event.supersedesReviewEventId ?? "None"}</dd>
                <dt>Supersession status</dt><dd style={{ margin: 0 }}>{event.superseded ? "Superseded" : "Chain head"}</dd>
                <dt>Chain head review event ID</dt><dd style={{ margin: 0 }}>{event.chainHeadReviewEventId ?? "None"}</dd>
                <dt>Rationale</dt><dd style={{ margin: 0 }}>{event.rationale ?? "Not provided"}</dd>
                <dt>Diagnostics</dt><dd style={{ margin: 0 }}><StringList values={event.diagnostics} empty="No event diagnostics." /></dd>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Diagnostics(props: { model: CandidateReviewSurfaceProjection }) {
  const entries: Array<[string, string[]]> = [
    ["Validation errors", props.model.validation.errors],
    ["Validation warnings", props.model.validation.warnings],
    ["Artifact diagnostics", props.model.diagnostics.artifact],
    ["Package diagnostics", props.model.diagnostics.package],
    ["Review event diagnostics", props.model.diagnostics.reviewEvents],
    ["Candidate Discovery diagnostics", props.model.diagnostics.candidateDiscovery],
  ];
  return (
    <section style={{ marginTop: 24 }}>
      <h3>Validation details and diagnostics</h3>
      <Field label="Validation status" value={props.model.validation.status} />
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {entries.map(([title, values]) => (
          <section key={title} style={panelStyle}>
            <h4 style={{ marginTop: 0 }}>{title}</h4>
            <StringList values={values} empty={`No ${title.toLowerCase()}.`} />
          </section>
        ))}
      </div>
    </section>
  );
}

function TechnicalDetails(props: { model: CandidateReviewSurfaceProjection }) {
  return (
    <details style={{ ...panelStyle, marginTop: 32, backgroundColor: "#f8fafc" }}>
      <summary style={{ cursor: "pointer", fontSize: 18, fontWeight: 700 }}>Technical details</summary>
      <OverviewDetails model={props.model} />
      <EventHistory model={props.model} />
      <Diagnostics model={props.model} />
    </details>
  );
}

export default async function CandidateReviewPage(props: PageProps) {
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
  const model = await loadLatestCandidateReviewSurfaceProjection({ siteVersionId });
  const artifact = model.artifact;
  const actionTarget: ActionTarget | null = (
    model.state !== "ready" || !artifact?.artifactId || !artifact.candidateDiscoveryArtifactId
  ) ? null : {
    siteVersionId: model.siteVersionId,
    candidateDiscoveryArtifactId: artifact.candidateDiscoveryArtifactId,
    candidateReviewPackageArtifactId: artifact.artifactId,
  };
  const contextProjections = (
    model.state === "ready" && artifact?.candidateDiscoveryArtifactId && artifact.dryRunId
  ) ? await loadCandidateContextProjectionsForReview({
    siteVersionId: model.siteVersionId,
    candidateDiscoveryArtifactId: artifact.candidateDiscoveryArtifactId,
    dryRunId: artifact.dryRunId,
  }) : new Map<string, CandidateContextProjection>();
  const contexts = new Map<string, CandidateContextPresentation>();
  await Promise.all([...contextProjections].map(async ([candidateId, projection]) => {
    contexts.set(candidateId, { projection, screenshotSrc: await screenshotSource(projection) });
  }));

  return (
    <main style={shellStyle}>
      <header>
        <h1 style={{ margin: 0 }}>Candidate Review</h1>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>Review each discovered candidate and record a clear operator decision.</p>
        <div style={{ ...gridStyle, marginTop: 18 }}>
          <Field label="Site version" value={model.siteVersionId} />
          <Field label="Review status" value={reviewStatus(model)} />
          <Field label="Reviewed / total candidates" value={`${model.counts.reviewed} / ${model.counts.candidates}`} />
        </div>
      </header>

      <section style={{ marginTop: 28 }} aria-labelledby="review-summary-heading">
        <h2 id="review-summary-heading" style={{ marginBottom: 12 }}>Review summary</h2>
        <div style={gridStyle}>
          <Field label="Approved" value={model.counts.approved} />
          <Field label="Rejected" value={model.counts.rejected} />
          <Field label="Deferred" value={model.counts.deferred} />
          <Field label="Needs review" value={model.counts.unreviewed} />
        </div>
      </section>

      <CandidateGroup
        title="Approved"
        groups={model.groupedLatestDecisions.approved}
        render={(decision) => <CandidateCard candidate={decision.candidate} decision={decision} actionTarget={actionTarget} context={contexts.get(decision.candidateId)} />}
      />
      <CandidateGroup
        title="Rejected"
        groups={model.groupedLatestDecisions.rejected}
        render={(decision) => <CandidateCard candidate={decision.candidate} decision={decision} actionTarget={actionTarget} context={contexts.get(decision.candidateId)} />}
      />
      <CandidateGroup
        title="Deferred"
        groups={model.groupedLatestDecisions.deferred}
        render={(decision) => <CandidateCard candidate={decision.candidate} decision={decision} actionTarget={actionTarget} context={contexts.get(decision.candidateId)} />}
      />
      <CandidateGroup
        title="Needs review"
        groups={model.unreviewedCandidates}
        render={(candidate) => <CandidateCard candidate={candidate} actionTarget={actionTarget} context={contexts.get(candidate.candidateId)} />}
      />

      <TechnicalDetails model={model} />
    </main>
  );
}
