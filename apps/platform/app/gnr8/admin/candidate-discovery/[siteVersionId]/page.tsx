import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import type {
  CandidateDiscoverySurfaceCandidate,
  CandidateDiscoverySurfaceProjection,
} from "@/gnr8/architecture/candidate-discovery-surface-projection";
import { loadLatestCandidateDiscoverySurfaceProjection } from "@/gnr8/architecture/candidate-discovery-surface-projection";
import type { CandidateEvidenceRef, CandidateLimitation } from "@/gnr8/architecture/candidate-discovery-contract";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ siteVersionId: string }>;
};

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
      <p style={{ margin: "4px 0 0", fontSize: 14, overflowWrap: "anywhere" }}>
        {props.value ?? "not available"}
      </p>
    </div>
  );
}

function StringList(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {props.values.map((value, index) => <li key={`${index}:${value}`}>{value}</li>)}
    </ul>
  );
}

function EvidenceRefs(props: { refs: CandidateEvidenceRef[]; empty: string }) {
  if (props.refs.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {props.refs.map((ref, index) => (
        <li key={`${index}:${ref.sourceKind}:${ref.refId}`} style={{ overflowWrap: "anywhere" }}>
          {ref.sourceKind}: {ref.refId}{ref.routePath ? ` (${ref.routePath})` : ""}
        </li>
      ))}
    </ul>
  );
}

function Limitations(props: { limitations: CandidateLimitation[] }) {
  if (props.limitations.length === 0) return <EmptyText>No limitations.</EmptyText>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {props.limitations.map((limitation, index) => (
        <li key={`${index}:${limitation.limitationId}`} style={{ marginBottom: 6 }}>
          <strong>{limitation.severity}</strong>: {limitation.code} - {limitation.message}
          {limitation.sourceRef ? ` (${limitation.sourceRef})` : ""}
        </li>
      ))}
    </ul>
  );
}

function AttentionState(props: { model: CandidateDiscoverySurfaceProjection }) {
  const messages: Partial<Record<CandidateDiscoverySurfaceProjection["emptyState"], string>> = {
    missing: "No Candidate Discovery result is available for this site version.",
    invalid: "The latest Candidate Discovery result is invalid. Validation diagnostics are shown below.",
    blocked: "Candidate Discovery is blocked. Blocker details are shown below.",
    no_candidates: "No candidates were discovered.",
    candidates_with_limitations: "Candidates include limitations. Details remain visible with each candidate.",
    candidates_with_blockers: "Candidates include blockers. All candidates and blocker details remain visible.",
  };
  const message = messages[props.model.emptyState];
  if (!message) return null;
  const isBlocker = props.model.emptyState === "blocked" || props.model.emptyState === "candidates_with_blockers";
  return (
    <div style={{
      ...panelStyle,
      marginTop: 14,
      backgroundColor: isBlocker ? "#fef2f2" : props.model.emptyState === "invalid" ? "#fff7ed" : "#f8fafc",
      borderColor: isBlocker ? "#fecaca" : props.model.emptyState === "invalid" ? "#fed7aa" : "#dbe6f1",
    }}>
      <EmptyText>{message}</EmptyText>
    </div>
  );
}

function Overview(props: { model: CandidateDiscoverySurfaceProjection }) {
  const { artifact, counts, model } = { artifact: props.model.artifact, counts: props.model.counts, model: props.model };
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Overview</h2>
      <AttentionState model={model} />
      <div style={{ ...gridStyle, marginTop: 10 }}>
        <Field label="artifact ref" value={artifact?.artifactId ?? null} />
        <Field label="artifact kind" value={artifact?.kind ?? null} />
        <Field label="discoveryId" value={artifact?.discoveryId ?? null} />
        <Field label="siteVersionId" value={model.siteVersionId} />
        <Field label="dryRunId" value={artifact?.dryRunId ?? null} />
        <Field label="createdAt" value={artifact?.createdAt ?? null} />
        <Field label="persistedAt" value={artifact?.persistedAt ?? null} />
        <Field label="validation status" value={model.validation.status} />
        <Field label="candidate count" value={counts.total} />
        <Field label="candidate types present" value={model.candidateTypesPresent.join(", ") || "none"} />
        <Field label="limitation count" value={counts.limitations} />
        <Field label="blocker count" value={counts.blockers} />
        <Field label="builder version" value={artifact?.builderVersion ?? null} />
        <Field label="contract version" value={artifact?.contractVersion ?? null} />
      </div>
    </section>
  );
}

function CandidateSummary(props: { model: CandidateDiscoverySurfaceProjection }) {
  const { counts } = props.model;
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Candidate Summary</h2>
      <div style={gridStyle}>
        <Field label="route count" value={counts.byType.route} />
        <Field label="navigation count" value={counts.byType.navigation} />
        <Field label="section count" value={counts.byType.section} />
        <Field label="LOW confidence" value={counts.byConfidence.LOW} />
        <Field label="MEDIUM confidence" value={counts.byConfidence.MEDIUM} />
        <Field label="HIGH confidence" value={counts.byConfidence.HIGH} />
        <Field label="limitations/blockers" value={`${counts.limitations} / ${counts.blockers}`} />
      </div>
    </section>
  );
}

function CandidateCard(props: { candidate: CandidateDiscoverySurfaceCandidate }) {
  const candidate = props.candidate;
  return (
    <article style={panelStyle}>
      <h4 style={{ marginTop: 0, marginBottom: 10 }}>{candidate.candidateId}</h4>
      <dl style={{ display: "grid", gap: 7, margin: 0 }}>
        <dt>candidateId</dt><dd style={{ margin: 0 }}>{candidate.candidateId}</dd>
        <dt>candidateType</dt><dd style={{ margin: 0 }}>{candidate.candidateType}</dd>
        <dt>candidateStatus</dt><dd style={{ margin: 0 }}>{candidate.candidateStatus}</dd>
        <dt>confidence</dt><dd style={{ margin: 0 }}>{candidate.confidence.level}</dd>
        <dt>confidence reasons</dt><dd style={{ margin: 0 }}><StringList values={candidate.confidence.reasons} empty="No confidence reasons." /></dd>
        <dt>routePath</dt><dd style={{ margin: 0 }}>{candidate.routePath ?? "not available"}</dd>
        <dt>sourceEvidenceRefs</dt><dd style={{ margin: 0 }}><EvidenceRefs refs={candidate.sourceEvidenceRefs} empty="No source evidence refs." /></dd>
        <dt>sourceDryRunRefs</dt><dd style={{ margin: 0 }}><EvidenceRefs refs={candidate.sourceDryRunRefs} empty="No source dry-run refs." /></dd>
        <dt>limitations</dt><dd style={{ margin: 0 }}><Limitations limitations={candidate.limitations} /></dd>
        <dt>diagnostics</dt><dd style={{ margin: 0 }}><StringList values={candidate.diagnostics} empty="No candidate diagnostics." /></dd>
      </dl>
    </article>
  );
}

function CandidateGroup(props: { title: string; candidates: CandidateDiscoverySurfaceCandidate[]; empty: string }) {
  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ marginBottom: 10 }}>{props.title}</h3>
      {props.candidates.length === 0 ? (
        <div style={panelStyle}><EmptyText>{props.empty}</EmptyText></div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {props.candidates.map((candidate) => <CandidateCard key={candidate.candidateId} candidate={candidate} />)}
        </div>
      )}
    </section>
  );
}

function CandidateList(props: { model: CandidateDiscoverySurfaceProjection }) {
  const groups = props.model.groups;
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Candidate List</h2>
      <CandidateGroup title="Route Candidates" candidates={groups.routes} empty="No route candidates." />
      <CandidateGroup title="Navigation Candidates" candidates={groups.navigation} empty="No navigation candidates." />
      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>Section Candidates By Route</h3>
        {groups.sectionsByRoute.length === 0 && groups.unscopedSections.length === 0 ? (
          <div style={panelStyle}><EmptyText>No section candidates.</EmptyText></div>
        ) : null}
        {groups.sectionsByRoute.map((group) => (
          <CandidateGroup key={group.routePath} title={group.routePath} candidates={group.candidates} empty="No section candidates for this route." />
        ))}
        {groups.unscopedSections.length > 0 ? (
          <CandidateGroup title="Unscoped Sections" candidates={groups.unscopedSections} empty="No unscoped section candidates." />
        ) : null}
      </section>
    </section>
  );
}

function Diagnostics(props: { model: CandidateDiscoverySurfaceProjection }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Diagnostics</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Validation errors</h3>
          <StringList values={props.model.validation.errors} empty="No validation errors." />
          <h3>Validation warnings</h3>
          <StringList values={props.model.validation.warnings} empty="No validation warnings." />
          <h3>Result diagnostics</h3>
          <StringList values={props.model.diagnostics} empty="No result diagnostics." />
        </div>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Result Limitations</h3>
          <Limitations limitations={props.model.limitations} />
        </div>
      </div>
    </section>
  );
}

export default async function CandidateDiscoveryPage(props: PageProps) {
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
  const model = await loadLatestCandidateDiscoverySurfaceProjection({ siteVersionId });

  return (
    <main style={shellStyle}>
      <header>
        <h1 style={{ margin: 0 }}>Candidate Discovery</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>Persisted candidate diagnostics for a site version.</p>
      </header>
      <Overview model={model} />
      <CandidateSummary model={model} />
      <CandidateList model={model} />
      <Diagnostics model={model} />
    </main>
  );
}
