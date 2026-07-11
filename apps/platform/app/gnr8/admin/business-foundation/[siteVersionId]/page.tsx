import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import type {
  BusinessFoundationArtifactLinkProjection,
  BusinessFoundationKnowledgeGroupProjection,
  BusinessFoundationKnowledgeItemProjection,
  GenerationBusinessFoundationProjection,
} from "@/gnr8/architecture/generation-business-foundation-projection";
import { loadGenerationBusinessFoundationProjection } from "@/gnr8/architecture/generation-business-foundation-projection";
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

function ListText(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
      {props.values.map((value) => (
        <li key={value} style={{ marginBottom: 6, overflowWrap: "anywhere" }}>{value}</li>
      ))}
    </ul>
  );
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
  const warning = value.includes("missing") || value.includes("LOW") || value.includes("partial") || value.includes("blocked");
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

function ArtifactLinkList(props: { artifacts: BusinessFoundationArtifactLinkProjection[] }) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {props.artifacts.map((artifact, index) => (
        <div
          id={artifact.artifactId ? `artifact-${artifact.artifactId}` : undefined}
          key={`${artifact.kind}:${artifact.label}:${artifact.artifactId ?? artifact.canonicalId ?? index}`}
          style={cardStyle}
        >
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

function KnowledgeItems(props: { items: BusinessFoundationKnowledgeItemProjection[]; empty: string }) {
  if (props.items.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.items.map((item, index) => (
        <div key={`${item.id ?? item.statement}:${index}`} style={{ ...cardStyle, background: "#f8fafc" }}>
          <p style={{ margin: 0 }}>{item.statement}</p>
          <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 13 }}>
            confidence: {item.confidence.level ?? "not available"} / evidence: {item.evidenceCount}
          </p>
          {item.limitations.length > 0 ? (
            <p style={{ margin: "6px 0 0", color: "#9a3412", fontSize: 13 }}>{item.limitations.join("; ")}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BusinessSummary(props: { model: GenerationBusinessFoundationProjection }) {
  const summary = props.model.summary;
  return (
    <section style={bandStyle}>
      <h2>Business Summary</h2>
      <div style={gridStyle}>
        <Field label="business name" value={summary.businessName} />
        <Field label="business identity" value={summary.businessIdentity} />
        <Field label="business purpose" value={summary.businessPurpose} />
        <Field label="business confidence" value={summary.businessConfidence.level} />
        <Field label="business tone" value={summary.businessTone} />
        <Field label="trust strategy" value={summary.trustStrategy} />
        <Field label="digital presence" value={summary.digitalPresence} />
      </div>
      <div style={{ ...cardStyle, marginTop: 10 }}>
        <strong>Business goals</strong>
        <ListText values={summary.businessGoals} empty="No persisted business goals are available." />
      </div>
    </section>
  );
}

function BusinessKnowledge(props: { groups: BusinessFoundationKnowledgeGroupProjection[] }) {
  return (
    <section style={bandStyle}>
      <h2>Business Knowledge</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {props.groups.map((group) => (
          <article key={group.key} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{group.label}</h3>
              <StatusPill value={group.confidence.level} />
            </div>
            <p style={{ margin: "8px 0", color: "#475569", fontSize: 13 }}>
              evidence count: {group.evidenceCount} / limitations: {group.limitations.length}
            </p>
            <KnowledgeItems items={group.statements} empty="No known persisted knowledge for this group." />
            {group.missing.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <strong>limitations</strong>
                <ListText values={group.missing} empty="No missing knowledge recorded." />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function Offerings(props: { model: GenerationBusinessFoundationProjection }) {
  const offerings = props.model.offerings;
  return (
    <section style={bandStyle}>
      <h2>Offerings</h2>
      <div style={gridStyle}>
        <Field label="evidence count" value={offerings.evidenceCount} />
        <Field label="unknown offerings" value={offerings.unknownOfferings.length} />
        <Field label="low confidence markers" value={offerings.lowConfidenceMarkers.length} />
      </div>
      <h3>Known offerings</h3>
      <KnowledgeItems items={offerings.knownOfferings} empty="No known offerings are available." />
      <h3>Known services</h3>
      <KnowledgeItems items={offerings.knownServices} empty="No known services are separately identified." />
      <h3>Known products</h3>
      <KnowledgeItems items={offerings.knownProducts} empty="No known products are separately identified." />
      <div style={{ ...cardStyle, marginTop: 10 }}>
        <strong>Unknown offerings</strong>
        <ListText values={offerings.unknownOfferings} empty="No unknown offering knowledge is recorded." />
      </div>
    </section>
  );
}

function Audience(props: { model: GenerationBusinessFoundationProjection }) {
  const audience = props.model.audience;
  return (
    <section style={bandStyle}>
      <h2>Audience</h2>
      <div style={gridStyle}>
        <Field label="confidence" value={audience.confidence.level} />
        <Field label="known audience items" value={audience.knownAudience.length} />
        <Field label="unknown audience items" value={audience.unknownAudience.length} />
      </div>
      <h3>Known audience</h3>
      <KnowledgeItems items={audience.knownAudience} empty="No known audience is available." />
      <div style={{ ...cardStyle, marginTop: 10 }}>
        <strong>Missing audience knowledge</strong>
        <ListText values={audience.missingAudienceKnowledge} empty="No missing audience knowledge is recorded." />
      </div>
    </section>
  );
}

function MissingKnowledge(props: { model: GenerationBusinessFoundationProjection }) {
  return (
    <section style={bandStyle}>
      <h2>Missing Knowledge</h2>
      <div style={gridStyle}>
        <div style={cardStyle}>
          <strong>Known</strong>
          <KnowledgeItems items={props.model.missingKnowledge.known} empty="No known knowledge is available." />
        </div>
        <div style={cardStyle}>
          <strong>Unknown</strong>
          <ListText values={props.model.missingKnowledge.unknown} empty="No unknown knowledge is recorded." />
        </div>
        <div style={cardStyle}>
          <strong>Assumed</strong>
          <ListText values={props.model.missingKnowledge.assumed} empty="No assumptions are recorded." />
        </div>
      </div>
    </section>
  );
}

function TransformationStory(props: { model: GenerationBusinessFoundationProjection }) {
  return (
    <section style={bandStyle}>
      <h2>Transformation Story</h2>
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {props.model.transformationStory.map((step, index) => (
          <li key={step.label} style={{ marginBottom: 12 }}>
            <strong>{step.label}</strong>
            {index < props.model.transformationStory.length - 1 ? <span style={{ color: "#64748b" }}> ↓</span> : null}
            <p style={{ margin: "4px 0", color: "#475569" }}>{step.contributes}</p>
            <CodeRef value={step.artifactId} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function BusinessHealth(props: { model: GenerationBusinessFoundationProjection }) {
  const health = props.model.businessHealth;
  return (
    <section style={bandStyle}>
      <h2>Business Health</h2>
      <div style={gridStyle}>
        <Field label="business confidence" value={health.businessConfidence.level} />
        <Field label="known knowledge" value={health.knownKnowledgeCount} />
        <Field label="missing knowledge" value={health.missingKnowledgeCount} />
        <Field label="limitations" value={health.limitationCount} />
        <Field label="evidence quality" value={health.evidenceQuality} />
        <Field label="readiness for website generation" value={health.readinessForWebsiteGeneration} />
      </div>
    </section>
  );
}

function AttentionStates(props: { model: GenerationBusinessFoundationProjection }) {
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

export default async function BusinessFoundationPage(props: PageProps) {
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
  const model = await loadGenerationBusinessFoundationProjection({ siteVersionId });

  return (
    <main style={shellStyle}>
      <header>
        <p style={{ margin: "0 0 6px", color: "#0f766e", fontWeight: 700 }}>Read-only GNR8 Runtime UX</p>
        <h1 style={{ margin: 0 }}>Business Foundation</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          Superadmin view of the persisted business understanding that explains why GNR8 created the Website Design Brief and Website Generation Package.
        </p>
        <div style={{ ...gridStyle, marginTop: 14 }}>
          <Field label="siteVersionId" value={model.siteVersionId} />
          <Field label="source site" value={model.sourceSiteId} />
          <Field label="dryRunId" value={model.dryRunId} />
        </div>
      </header>

      <BusinessSummary model={model} />
      <BusinessKnowledge groups={model.knowledgeGroups} />
      <Offerings model={model} />
      <Audience model={model} />
      <MissingKnowledge model={model} />
      <TransformationStory model={model} />
      <BusinessHealth model={model} />
      <AttentionStates model={model} />

      <section style={bandStyle}>
        <h2>Artifact Explorer</h2>
        <ArtifactLinkList artifacts={model.artifactExplorer} />
      </section>
    </main>
  );
}
