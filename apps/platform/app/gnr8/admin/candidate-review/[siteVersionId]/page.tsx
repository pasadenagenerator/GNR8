import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import {
  loadLatestCandidateReviewSurfaceProjection,
  type CandidateReviewSurfaceCandidateContext,
  type CandidateReviewSurfaceCandidateGroups,
  type CandidateReviewSurfaceDecision,
  type CandidateReviewSurfaceProjection,
} from "@/gnr8/architecture/candidate-review-surface-projection";
import type { CandidateLimitation } from "@/gnr8/architecture/candidate-discovery-contract";
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
}) {
  const { candidate, decision } = props;
  return (
    <details style={{ marginTop: 14 }}>
      <summary style={{ cursor: "pointer", color: "#475569", fontWeight: 600 }}>Technical details</summary>
      <dl style={{ display: "grid", gap: 7, margin: "12px 0 0" }}>
        <dt>Candidate ID</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{candidate.candidateId}</dd>
        <dt>Candidate status</dt><dd style={{ margin: 0 }}>{candidate.candidateStatus}</dd>
        <dt>Confidence reasons</dt><dd style={{ margin: 0 }}><StringList values={candidate.confidence.reasons} empty="No confidence reasons." /></dd>
        <dt>Limitations</dt><dd style={{ margin: 0 }}><Limitations values={candidate.limitations} /></dd>
        <dt>Candidate diagnostics</dt><dd style={{ margin: 0 }}><StringList values={candidate.diagnostics} empty="No candidate diagnostics." /></dd>
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

function CandidateCard(props: {
  candidate: CandidateReviewSurfaceCandidateContext;
  decision?: CandidateReviewSurfaceDecision;
  actionTarget: ActionTarget | null;
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
      <CandidateTechnicalDetails candidate={candidate} decision={decision} />
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
        render={(decision) => <CandidateCard candidate={decision.candidate} decision={decision} actionTarget={actionTarget} />}
      />
      <CandidateGroup
        title="Rejected"
        groups={model.groupedLatestDecisions.rejected}
        render={(decision) => <CandidateCard candidate={decision.candidate} decision={decision} actionTarget={actionTarget} />}
      />
      <CandidateGroup
        title="Deferred"
        groups={model.groupedLatestDecisions.deferred}
        render={(decision) => <CandidateCard candidate={decision.candidate} decision={decision} actionTarget={actionTarget} />}
      />
      <CandidateGroup
        title="Needs review"
        groups={model.unreviewedCandidates}
        render={(candidate) => <CandidateCard candidate={candidate} actionTarget={actionTarget} />}
      />

      <TechnicalDetails model={model} />
    </main>
  );
}
