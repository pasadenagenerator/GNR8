import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import {
  loadLatestStructurePlanSurfaceProjection,
  type StructurePlanSurfaceProjection,
} from "@/gnr8/architecture/structure-plan-surface-projection";
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

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
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

function StringList(props: { values: readonly string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {props.values.map((value, index) => <li key={`${index}:${value}`} style={{ overflowWrap: "anywhere" }}>{value}</li>)}
    </ul>
  );
}

function joined(values: readonly string[]) {
  return values.length > 0 ? values.join(", ") : "none";
}

function Notice(props: { children: ReactNode; tone?: "neutral" | "warning" | "blocked" }) {
  const tone = props.tone ?? "neutral";
  const backgroundColor = tone === "blocked" ? "#fef2f2" : tone === "warning" ? "#fff7ed" : "#f8fafc";
  const borderColor = tone === "blocked" ? "#fecaca" : tone === "warning" ? "#fed7aa" : "#dbe6f1";
  return (
    <div style={{ ...panelStyle, backgroundColor, borderColor, marginBottom: 10 }}>
      <EmptyText>{props.children}</EmptyText>
    </div>
  );
}

function AttentionState(props: { model: StructurePlanSurfaceProjection }) {
  if (props.model.state === "missing") {
    return <Notice>No Structure Plan has been persisted for this site version yet.</Notice>;
  }
  if (props.model.state === "stale") {
    return <Notice tone="warning">The latest Structure Plan references an older Reconstruction Package lineage.</Notice>;
  }
  if (props.model.state === "blocked") {
    return <Notice tone="blocked">The latest Structure Plan is blocked. Limitations and diagnostics are shown below.</Notice>;
  }
  return (
    <>
      {props.model.attentionStates.includes("limitations_present") ? (
        <Notice tone="warning">Limitations are present on this Structure Plan.</Notice>
      ) : null}
      {props.model.attentionStates.includes("no_navigation") ? (
        <Notice>No planned navigation entries are present.</Notice>
      ) : null}
      {props.model.attentionStates.includes("no_sections") ? (
        <Notice>No planned sections are present.</Notice>
      ) : null}
    </>
  );
}

function Overview(props: { model: StructurePlanSurfaceProjection }) {
  const model = props.model;
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Overview</h2>
      <AttentionState model={model} />
      <div style={gridStyle}>
        <Field label="artifact reference" value={model.artifact?.artifactRef ?? null} />
        <Field label="structurePlanId" value={model.artifact?.structurePlanId ?? null} />
        <Field label="siteVersionId" value={model.siteVersionId} />
        <Field label="status" value={model.artifact?.status ?? model.state} />
        <Field label="contractVersion" value={model.artifact?.contractVersion ?? null} />
        <Field label="createdAt" value={model.artifact?.createdAt ?? null} />
        <Field label="persistedAt" value={model.artifact?.persistedAt ?? null} />
      </div>
    </section>
  );
}

function Lineage(props: { model: StructurePlanSurfaceProjection }) {
  const lineage = props.model.lineage;
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Lineage</h2>
      <div style={gridStyle}>
        <Field label="Reconstruction Package" value={lineage.reconstructionPackageArtifactId} />
        <Field label="Review Package" value={lineage.candidateReviewPackageArtifactId} />
        <Field label="Discovery Result" value={lineage.candidateDiscoveryArtifactId} />
        <Field label="dryRunId" value={lineage.dryRunId} />
        <Field label="latest Reconstruction Package" value={lineage.latestReconstructionPackageArtifactId} />
        <Field label="lineage state" value={lineage.reconstructionPackageStale ? "stale" : "current"} />
      </div>
    </section>
  );
}

function PlanSummary(props: { model: StructurePlanSurfaceProjection }) {
  const summary = props.model.summary;
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Plan Summary</h2>
      <div style={gridStyle}>
        <Field label="planned routes" value={summary.plannedRoutes} />
        <Field label="planned navigation" value={summary.plannedNavigation} />
        <Field label="planned sections" value={summary.plannedSections} />
        <Field label="assignments" value={summary.assignments} />
        <Field label="blocked candidates" value={summary.blockedCandidates} />
      </div>
    </section>
  );
}

function TableCell(props: { children: ReactNode }) {
  return <td style={{ borderBottom: "1px solid #f1f5f9", padding: 7, overflowWrap: "anywhere", verticalAlign: "top" }}>{props.children}</td>;
}

function TableHead(props: { labels: string[] }) {
  return (
    <thead>
      <tr>
        {props.labels.map((label) => (
          <th key={label} style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 7 }}>{label}</th>
        ))}
      </tr>
    </thead>
  );
}

function PlannedRoutes(props: { model: StructurePlanSurfaceProjection }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Planned Routes</h2>
      {props.model.plannedRoutes.length === 0 ? (
        <div style={panelStyle}><EmptyText>No planned routes.</EmptyText></div>
      ) : (
        <table style={tableStyle}>
          <TableHead labels={["route path", "source candidate", "assignment"]} />
          <tbody>
            {props.model.plannedRoutes.map((route) => (
              <tr key={route.plannedRouteId}>
                <TableCell>{route.routePath}</TableCell>
                <TableCell>{joined(route.sourceCandidateIds)}</TableCell>
                <TableCell>{joined(route.assignmentIds)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlannedNavigation(props: { model: StructurePlanSurfaceProjection }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Planned Navigation</h2>
      {props.model.plannedNavigation.length === 0 ? (
        <div style={panelStyle}><EmptyText>No planned navigation.</EmptyText></div>
      ) : (
        <table style={tableStyle}>
          <TableHead labels={["route", "assignment", "source candidate"]} />
          <tbody>
            {props.model.plannedNavigation.map((navigation) => (
              <tr key={navigation.plannedNavigationId}>
                <TableCell>{joined(navigation.routeAssociations)}</TableCell>
                <TableCell>{joined(navigation.assignmentIds)}</TableCell>
                <TableCell>{joined(navigation.sourceCandidateIds)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlannedSections(props: { model: StructurePlanSurfaceProjection }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Planned Sections</h2>
      {props.model.plannedSections.length === 0 ? (
        <div style={panelStyle}><EmptyText>No planned sections.</EmptyText></div>
      ) : (
        <table style={tableStyle}>
          <TableHead labels={["route", "section order", "assignment", "source candidate"]} />
          <tbody>
            {props.model.plannedSections.map((section) => (
              <tr key={section.plannedSectionId}>
                <TableCell>{section.routeAssociation ?? "not available"}</TableCell>
                <TableCell>{section.sectionOrder}</TableCell>
                <TableCell>{joined(section.assignmentIds)}</TableCell>
                <TableCell>{joined(section.sourceCandidateIds)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Assignments(props: { model: StructurePlanSurfaceProjection }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Assignments</h2>
      {props.model.assignments.length === 0 ? (
        <div style={panelStyle}><EmptyText>No assignments.</EmptyText></div>
      ) : (
        <table style={tableStyle}>
          <TableHead labels={["assignmentId", "candidateId", "candidateType", "target kind", "target id"]} />
          <tbody>
            {props.model.assignments.map((assignment) => (
              <tr key={assignment.assignmentId}>
                <TableCell>{assignment.assignmentId}</TableCell>
                <TableCell>{assignment.candidateId}</TableCell>
                <TableCell>{assignment.candidateType}</TableCell>
                <TableCell>{assignment.targetKind}</TableCell>
                <TableCell>{assignment.targetId ?? "not available"}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Diagnostics(props: { model: StructurePlanSurfaceProjection }) {
  const validation = props.model.validation;
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Diagnostics</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>validation</h3>
          <Field label="validation status" value={validation.status} />
          <div style={{ marginTop: 10 }}>
            <h4 style={{ margin: "0 0 8px" }}>errors</h4>
            <StringList values={validation.errors} empty="No validation errors." />
            <h4 style={{ margin: "14px 0 8px" }}>warnings</h4>
            <StringList values={validation.warnings} empty="No validation warnings." />
          </div>
        </div>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>limitations</h3>
          <StringList values={props.model.limitations} empty="No limitations." />
        </div>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>diagnostics</h3>
          <StringList values={props.model.diagnostics} empty="No diagnostics." />
        </div>
      </div>
    </section>
  );
}

export default async function StructurePlanPage(props: PageProps) {
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
  const model = await loadLatestStructurePlanSurfaceProjection({ siteVersionId });

  return (
    <main style={shellStyle}>
      <header>
        <h1 style={{ margin: 0 }}>Structure Plan</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>Persisted Structure Plan artifact inspection for a site version.</p>
      </header>
      <Overview model={model} />
      <Lineage model={model} />
      <PlanSummary model={model} />
      <PlannedRoutes model={model} />
      <PlannedNavigation model={model} />
      <PlannedSections model={model} />
      <Assignments model={model} />
      <Diagnostics model={model} />
    </main>
  );
}
