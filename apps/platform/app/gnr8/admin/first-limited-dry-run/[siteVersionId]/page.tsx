import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import {
  loadLatestFirstLimitedDryRunSurfaceProjection,
  type FirstLimitedDryRunSurfaceProjection,
} from "@/gnr8/architecture/first-limited-dry-run-surface-projection";
import type { ReconstructionDryRunLimitation } from "@/gnr8/architecture/reconstruction-dry-run-contract";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    siteVersionId: string;
  }>;
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const labelStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 12,
};

const valueStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 14,
  overflowWrap: "anywhere",
};

function EmptyText(props: { children: string }) {
  return (
    <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
      {props.children}
    </p>
  );
}

function Field(props: { label: string; value: string | number | null }) {
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{props.label}</p>
      <p style={valueStyle}>{props.value ?? "not available"}</p>
    </div>
  );
}

function limitationById(limitations: ReconstructionDryRunLimitation[]): Map<string, ReconstructionDryRunLimitation> {
  return new Map(limitations.map((limitation) => [limitation.limitationId, limitation]));
}

function LimitationList(props: {
  limitationRefs?: string[];
  limitations: ReconstructionDryRunLimitation[];
}) {
  const byId = limitationById(props.limitations);
  const refs = props.limitationRefs ?? props.limitations.map((limitation) => limitation.limitationId);
  const resolved = refs
    .map((ref) => byId.get(ref) ?? {
      limitationId: ref,
      severity: "warning" as const,
      sourceRef: null,
      message: "Limitation reference was not resolved.",
    });

  if (resolved.length === 0) {
    return <EmptyText>No limitations.</EmptyText>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {resolved.map((limitation) => (
        <li key={limitation.limitationId} style={{ marginBottom: 6 }}>
          <strong>{limitation.severity}</strong>: {limitation.message}
          {limitation.sourceRef ? <span> ({limitation.sourceRef})</span> : null}
        </li>
      ))}
    </ul>
  );
}

function EvidenceRefs(props: { refs: string[] }) {
  if (props.refs.length === 0) {
    return <EmptyText>No evidence refs.</EmptyText>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {props.refs.map((ref) => (
        <li key={ref} style={{ overflowWrap: "anywhere" }}>{ref}</li>
      ))}
    </ul>
  );
}

function Overview(props: { model: FirstLimitedDryRunSurfaceProjection }) {
  const model = props.model;

  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Overview</h2>
      {model.artifactStatus === "missing" ? (
        <div style={{ ...panelStyle, backgroundColor: "#f8fafc" }}>
          <EmptyText>No First Limited Dry Run output has been created for this site version yet.</EmptyText>
        </div>
      ) : null}
      {model.artifactStatus === "invalid" ? (
        <div style={{ ...panelStyle, backgroundColor: "#fff7ed", borderColor: "#fed7aa", marginBottom: 10 }}>
          <EmptyText>Latest output is invalid. Validation details are shown below.</EmptyText>
        </div>
      ) : null}
      {model.artifactStatus === "blocked" ? (
        <div style={{ ...panelStyle, backgroundColor: "#fef2f2", borderColor: "#fecaca", marginBottom: 10 }}>
          <EmptyText>Latest output is blocked. Blocker limitations are shown below.</EmptyText>
        </div>
      ) : null}
      <div style={gridStyle}>
        <Field label="artifact status/ref" value={model.artifactRef ? `${model.artifactStatus} / ${model.artifactRef}` : model.artifactStatus} />
        <Field label="artifact kind" value={model.artifactKind} />
        <Field label="siteVersionId" value={model.siteVersionId} />
        <Field label="dryRunId" value={model.dryRunId} />
        <Field label="output status" value={model.outputStatus} />
        <Field label="validation status" value={model.validationStatus} />
        <Field label="route model count" value={model.routeModelCount} />
        <Field label="navigation model count" value={model.navigationModelCount} />
        <Field label="section model count" value={model.sectionModelCount} />
        <Field label="limitations/blockers" value={`${model.limitationsCount} / ${model.blockerLimitationsCount}`} />
        <Field label="createdAt" value={model.createdAt} />
        <Field label="persistedAt" value={model.persistedAt} />
        <Field label="evidence ref count" value={model.evidenceRefCount} />
      </div>
      <div style={{ ...panelStyle, marginTop: 10 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>diagnostics</h3>
        {model.diagnostics.length === 0 ? (
          <EmptyText>No diagnostics.</EmptyText>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {model.diagnostics.map((entry) => (
              <li key={entry} style={{ overflowWrap: "anywhere" }}>{entry}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function RouteModels(props: { model: FirstLimitedDryRunSurfaceProjection }) {
  if (props.model.routeModels.length === 0) {
    return (
      <section style={{ marginTop: 22 }}>
        <h2 style={{ marginBottom: 10 }}>Route Models</h2>
        <div style={panelStyle}>
          <EmptyText>No route models were produced.</EmptyText>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Route Models</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {props.model.routeModels.map((route) => (
          <article key={route.routePath} style={panelStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{route.routePath}</h3>
            <dl style={{ display: "grid", gap: 6, margin: 0 }}>
              <dt>routePath</dt>
              <dd style={{ margin: 0 }}>{route.routePath}</dd>
              <dt>sourceUrl</dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{route.sourceUrl}</dd>
              <dt>section count</dt>
              <dd style={{ margin: 0 }}>{route.sectionRefs.length}</dd>
              <dt>navigation refs</dt>
              <dd style={{ margin: 0 }}>{route.navigationRefs.length ? route.navigationRefs.join(", ") : "none"}</dd>
              <dt>confidence</dt>
              <dd style={{ margin: 0 }}>{route.confidenceLevel}</dd>
              <dt>limitations</dt>
              <dd style={{ margin: 0 }}>
                <LimitationList limitationRefs={route.limitationRefs} limitations={props.model.limitations} />
              </dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function NavigationModels(props: { model: FirstLimitedDryRunSurfaceProjection }) {
  if (props.model.navigationModels.length === 0) {
    return (
      <section style={{ marginTop: 22 }}>
        <h2 style={{ marginBottom: 10 }}>Navigation Models</h2>
        <div style={panelStyle}>
          <EmptyText>No navigation models were produced.</EmptyText>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Navigation Models</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {props.model.navigationModels.map((navigation) => (
          <article key={navigation.navigationId} style={panelStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{navigation.routePath} / {navigation.navigationId}</h3>
            <p style={{ marginTop: 0 }}>item count: {navigation.items.length}</p>
            <p style={{ marginTop: 0 }}>confidence: {navigation.confidenceLevel}</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 6 }}>position</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 6 }}>labels</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 6 }}>hrefs</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 6 }}>confidence</th>
                </tr>
              </thead>
              <tbody>
                {navigation.items.map((item) => (
                  <tr key={`${navigation.navigationId}:${item.position}:${item.href}`}>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 6 }}>{item.position}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 6 }}>{item.label}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 6, overflowWrap: "anywhere" }}>{item.href}</td>
                    <td style={{ borderBottom: "1px solid #f1f5f9", padding: 6 }}>{item.confidenceLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 style={{ marginBottom: 8 }}>evidence refs</h4>
            <EvidenceRefs refs={navigation.sourceEvidenceRefs} />
          </article>
        ))}
      </div>
    </section>
  );
}

function orderedSectionsForRoute(
  model: FirstLimitedDryRunSurfaceProjection,
  routePath: string,
) {
  const route = model.routeModels.find((candidate) => candidate.routePath === routePath);
  const sections = model.sectionModels.filter((section) => section.routePath === routePath);
  if (!route) return sections;

  const byId = new Map(sections.map((section) => [section.sectionId, section]));
  const ordered = route.sectionRefs.flatMap((sectionId) => {
    const section = byId.get(sectionId);
    return section ? [section] : [];
  });
  const orderedIds = new Set(ordered.map((section) => section.sectionId));
  return [...ordered, ...sections.filter((section) => !orderedIds.has(section.sectionId))];
}

function SectionModels(props: { model: FirstLimitedDryRunSurfaceProjection }) {
  if (props.model.sectionModels.length === 0) {
    return (
      <section style={{ marginTop: 22 }}>
        <h2 style={{ marginBottom: 10 }}>Section Models</h2>
        <div style={panelStyle}>
          <EmptyText>No section models were produced.</EmptyText>
        </div>
      </section>
    );
  }

  const routePaths = Array.from(new Set(props.model.sectionModels.map((section) => section.routePath))).sort();

  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Section Models</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {routePaths.map((routePath) => (
          <article key={routePath} style={panelStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{routePath}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {orderedSectionsForRoute(props.model, routePath).map((section, index) => (
                <div key={section.sectionId} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
                  <h4 style={{ marginTop: 0, marginBottom: 8 }}>ordered section {index + 1}: {section.sectionId}</h4>
                  <dl style={{ display: "grid", gap: 6, margin: 0 }}>
                    <dt>region type</dt>
                    <dd style={{ margin: 0 }}>{section.regionType}</dd>
                    <dt>selector</dt>
                    <dd style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowWrap: "anywhere" }}>
                      {section.selector}
                    </dd>
                    <dt>bounding box</dt>
                    <dd style={{ margin: 0 }}>
                      x {section.boundingBox.x}, y {section.boundingBox.y}, width {section.boundingBox.width}, height {section.boundingBox.height}
                    </dd>
                    <dt>confidence</dt>
                    <dd style={{ margin: 0 }}>{section.confidenceLevel}</dd>
                    <dt>evidence refs</dt>
                    <dd style={{ margin: 0 }}><EvidenceRefs refs={section.sourceEvidenceRefs} /></dd>
                    <dt>limitations</dt>
                    <dd style={{ margin: 0 }}>
                      <LimitationList limitationRefs={section.limitationRefs} limitations={props.model.limitations} />
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function FirstLimitedDryRunPage(props: PageProps) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") {
      redirect("/login");
    }
    if (message.startsWith("Forbidden")) {
      redirect("/superadmin");
    }
    throw error;
  }

  const { siteVersionId: rawSiteVersionId } = await props.params;
  const siteVersionId = String(rawSiteVersionId ?? "").trim();
  const model = await loadLatestFirstLimitedDryRunSurfaceProjection({ siteVersionId });

  return (
    <main style={shellStyle}>
      <header>
        <h1 style={{ margin: 0 }}>First Limited Dry Run</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>Persisted output inspection for a site version.</p>
      </header>

      <Overview model={model} />
      <RouteModels model={model} />
      <NavigationModels model={model} />
      <SectionModels model={model} />

      <section style={{ marginTop: 22 }}>
        <h2 style={{ marginBottom: 10 }}>Limitations</h2>
        <div style={panelStyle}>
          <LimitationList limitations={model.limitations} />
        </div>
      </section>
    </main>
  );
}
