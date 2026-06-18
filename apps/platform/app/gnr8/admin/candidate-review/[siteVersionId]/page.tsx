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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ siteVersionId: string }> };

const shellStyle: CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "28px 20px 48px",
  fontFamily: "ui-sans-serif, system-ui",
  color: "#111827",
};
const panelStyle: CSSProperties = {
  border: "1px solid #dbe6f1",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  padding: 14,
};
const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10,
};

function EmptyText(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{props.children}</p>;
}

function Field(props: { label: string; value: string | number | null }) {
  return (
    <div style={panelStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{props.label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 14, overflowWrap: "anywhere" }}>{props.value ?? "not available"}</p>
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

function AttentionStates(props: { model: CandidateReviewSurfaceProjection }) {
  const messages = [
    props.model.state === "missing" ? "No Candidate Review package is available for this site version." : null,
    props.model.state === "invalid" ? "The latest Candidate Review package is invalid. Safe diagnostics are shown below." : null,
    props.model.attentionStates.includes("empty_review_package") ? "This review package contains no review events." : null,
    props.model.attentionStates.includes("all_candidates_unreviewed") ? "All linked candidates are unreviewed." : null,
    props.model.attentionStates.includes("stale") ? "This review package is stale relative to the latest Candidate Discovery artifact." : null,
    props.model.attentionStates.includes("has_superseded_events") ? "This review package contains superseded history." : null,
  ].filter((message): message is string => message !== null);
  if (messages.length === 0) return null;
  return (
    <div style={{ ...panelStyle, marginTop: 12, backgroundColor: props.model.state === "invalid" ? "#fff7ed" : "#f8fafc" }}>
      <StringList values={messages} empty="No attention states." />
    </div>
  );
}

function Overview(props: { model: CandidateReviewSurfaceProjection }) {
  const { artifact, linkedCandidateDiscovery, model } = {
    artifact: props.model.artifact,
    linkedCandidateDiscovery: props.model.linkedCandidateDiscovery,
    model: props.model,
  };
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Overview</h2>
      <AttentionStates model={model} />
      <div style={{ ...gridStyle, marginTop: 10 }}>
        <Field label="artifact ref" value={artifact?.artifactId ?? null} />
        <Field label="reviewPackageId" value={artifact?.reviewPackageId ?? null} />
        <Field label="candidateDiscoveryArtifactId" value={artifact?.candidateDiscoveryArtifactId ?? null} />
        <Field label="siteVersionId" value={model.siteVersionId} />
        <Field label="dryRunId" value={artifact?.dryRunId ?? null} />
        <Field label="createdAt" value={artifact?.createdAt ?? null} />
        <Field label="persistedAt" value={artifact?.persistedAt ?? null} />
        <Field label="validation status" value={model.validation.status} />
        <Field label="contract version" value={artifact?.contractVersion ?? null} />
        <Field label="latest review artifact" value={artifact ? String(artifact.isLatestReviewArtifact) : null} />
        <Field label="linked discoveryId" value={linkedCandidateDiscovery?.discoveryId ?? null} />
        <Field label="latest Candidate Discovery artifact" value={linkedCandidateDiscovery?.latestArtifactId ?? null} />
      </div>
    </section>
  );
}

function DecisionSummary(props: { model: CandidateReviewSurfaceProjection }) {
  const counts = props.model.counts;
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Decision Summary</h2>
      <div style={gridStyle}>
        <Field label="candidate count" value={counts.candidates} />
        <Field label="reviewed count" value={counts.reviewed} />
        <Field label="approved count" value={counts.approved} />
        <Field label="rejected count" value={counts.rejected} />
        <Field label="deferred count" value={counts.deferred} />
        <Field label="unreviewed count" value={counts.unreviewed} />
        <Field label="review event count" value={counts.reviewEvents} />
        <Field label="superseded event count" value={counts.supersededEvents} />
      </div>
    </section>
  );
}

function CandidateContext(props: { candidate: CandidateReviewSurfaceCandidateContext }) {
  const candidate = props.candidate;
  return (
    <section style={{ marginTop: 12 }}>
      <h4 style={{ marginBottom: 8 }}>Candidate Context</h4>
      <dl style={{ display: "grid", gap: 7, margin: 0 }}>
        <dt>candidate type</dt><dd style={{ margin: 0 }}>{candidate.candidateType}</dd>
        <dt>candidate status</dt><dd style={{ margin: 0 }}>{candidate.candidateStatus}</dd>
        <dt>route path</dt><dd style={{ margin: 0 }}>{candidate.routePath ?? "not available"}</dd>
        <dt>confidence</dt><dd style={{ margin: 0 }}>{candidate.confidence.level}</dd>
        <dt>confidence reasons</dt><dd style={{ margin: 0 }}><StringList values={candidate.confidence.reasons} empty="No confidence reasons." /></dd>
        <dt>limitations</dt><dd style={{ margin: 0 }}><Limitations values={candidate.limitations} /></dd>
        <dt>candidate diagnostics</dt><dd style={{ margin: 0 }}><StringList values={candidate.diagnostics} empty="No candidate diagnostics." /></dd>
      </dl>
    </section>
  );
}

function DecisionCard(props: { item: CandidateReviewSurfaceDecision }) {
  const item = props.item;
  return (
    <article style={panelStyle}>
      <h4 style={{ marginTop: 0 }}>{item.candidateId}</h4>
      <dl style={{ display: "grid", gap: 7, margin: 0 }}>
        <dt>candidateId</dt><dd style={{ margin: 0 }}>{item.candidateId}</dd>
        <dt>decision</dt><dd style={{ margin: 0 }}>{item.decision}</dd>
        <dt>reviewerRef</dt><dd style={{ margin: 0 }}>{item.reviewerRef}</dd>
        <dt>decidedAt</dt><dd style={{ margin: 0 }}>{item.decidedAt}</dd>
        <dt>rationale</dt><dd style={{ margin: 0 }}>{item.rationale ?? "not provided"}</dd>
        <dt>reviewEventId</dt><dd style={{ margin: 0 }}>{item.reviewEventId}</dd>
        <dt>supersedesReviewEventId</dt><dd style={{ margin: 0 }}>{item.supersedesReviewEventId ?? "none"}</dd>
        <dt>event diagnostics</dt><dd style={{ margin: 0 }}><StringList values={item.diagnostics} empty="No event diagnostics." /></dd>
      </dl>
      <CandidateContext candidate={item.candidate} />
    </article>
  );
}

function CandidateCard(props: { candidate: CandidateReviewSurfaceCandidateContext }) {
  return (
    <article style={panelStyle}>
      <h4 style={{ marginTop: 0 }}>{props.candidate.candidateId}</h4>
      <CandidateContext candidate={props.candidate} />
    </article>
  );
}

function GroupedCandidates<T>(props: {
  groups: CandidateReviewSurfaceCandidateGroups<T>;
  empty: string;
  render: (item: T) => ReactNode;
}) {
  const { groups } = props;
  const count = groups.routes.length + groups.navigation.length + groups.unscopedSections.length +
    groups.sectionsByRoute.reduce((total, group) => total + group.candidates.length, 0);
  if (count === 0) return <div style={panelStyle}><EmptyText>{props.empty}</EmptyText></div>;
  const renderItems = (title: string, values: T[]) => values.length > 0 ? (
    <section style={{ marginTop: 12 }}>
      <h4>{title}</h4>
      <div style={{ display: "grid", gap: 10 }}>{values.map((item, index) => <div key={index}>{props.render(item)}</div>)}</div>
    </section>
  ) : null;
  return (
    <div>
      {renderItems("Route", groups.routes)}
      {renderItems("Navigation", groups.navigation)}
      {groups.sectionsByRoute.map((group) => (
        <section key={group.routePath} style={{ marginTop: 12 }}>
          <h4>Sections for {group.routePath}</h4>
          <div style={{ display: "grid", gap: 10 }}>{group.candidates.map((item, index) => <div key={index}>{props.render(item)}</div>)}</div>
        </section>
      ))}
      {renderItems("Unscoped Sections", groups.unscopedSections)}
    </div>
  );
}

function LatestDecisions(props: { model: CandidateReviewSurfaceProjection }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Latest Decisions</h2>
      {(["approved", "rejected", "deferred"] as const).map((decision) => (
        <section key={decision} style={{ marginTop: 16 }}>
          <h3 style={{ textTransform: "capitalize" }}>{decision}</h3>
          <GroupedCandidates
            groups={props.model.groupedLatestDecisions[decision]}
            empty={`No ${decision} candidates.`}
            render={(item) => <DecisionCard item={item} />}
          />
        </section>
      ))}
      <section style={{ marginTop: 16 }}>
        <h3>Unreviewed</h3>
        <GroupedCandidates
          groups={props.model.unreviewedCandidates}
          empty="No unreviewed candidates."
          render={(candidate) => <CandidateCard candidate={candidate} />}
        />
      </section>
    </section>
  );
}

function EventHistory(props: { model: CandidateReviewSurfaceProjection }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Event History</h2>
      {props.model.reviewEventHistory.length === 0 ? (
        <div style={panelStyle}><EmptyText>No immutable review events.</EmptyText></div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {props.model.reviewEventHistory.map((event) => (
            <article key={event.reviewEventId} style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>{event.reviewEventId}</h3>
              <dl style={{ display: "grid", gap: 7, margin: 0 }}>
                <dt>candidateId</dt><dd style={{ margin: 0 }}>{event.candidateId}</dd>
                <dt>decision</dt><dd style={{ margin: 0 }}>{event.decision}</dd>
                <dt>reviewerRef</dt><dd style={{ margin: 0 }}>{event.reviewerRef}</dd>
                <dt>decidedAt</dt><dd style={{ margin: 0 }}>{event.decidedAt}</dd>
                <dt>attribution</dt><dd style={{ margin: 0 }}>{event.reviewerRef} at {event.decidedAt}</dd>
                <dt>supersedesReviewEventId</dt><dd style={{ margin: 0 }}>{event.supersedesReviewEventId ?? "none"}</dd>
                <dt>supersession status</dt><dd style={{ margin: 0 }}>{event.superseded ? "superseded" : "chain head"}</dd>
                <dt>chainHeadReviewEventId</dt><dd style={{ margin: 0 }}>{event.chainHeadReviewEventId ?? "none"}</dd>
                <dt>rationale</dt><dd style={{ margin: 0 }}>{event.rationale ?? "not provided"}</dd>
                <dt>diagnostics</dt><dd style={{ margin: 0 }}><StringList values={event.diagnostics} empty="No event diagnostics." /></dd>
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
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Diagnostics</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map(([title, values]) => (
          <section key={title} style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            <StringList values={values} empty={`No ${title.toLowerCase()}.`} />
          </section>
        ))}
      </div>
    </section>
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

  return (
    <main style={shellStyle}>
      <header>
        <h1 style={{ margin: 0 }}>Candidate Review</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>Read-only persisted review package diagnostics for a site version.</p>
      </header>
      <Overview model={model} />
      <DecisionSummary model={model} />
      <LatestDecisions model={model} />
      <EventHistory model={model} />
      <Diagnostics model={model} />
    </main>
  );
}
