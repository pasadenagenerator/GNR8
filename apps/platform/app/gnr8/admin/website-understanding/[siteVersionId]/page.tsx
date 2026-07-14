import type { CSSProperties, ReactNode } from "react";

import type { SourceWebsiteUnderstandingProjection } from "@/gnr8/architecture/source-website-understanding-projection-contract";
import { loadSourceWebsiteUnderstandingProjection } from "@/gnr8/architecture/source-website-understanding-projection-loader";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ siteVersionId: string }>;
};

const shellStyle: CSSProperties = {
  maxWidth: 1440,
  margin: "0 auto",
  padding: "32px 28px 64px",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#111827",
};

const sectionStyle: CSSProperties = { marginTop: 30 };
const cardStyle: CSSProperties = {
  border: "1px solid #d8e2ec",
  borderRadius: 8,
  background: "#ffffff",
  padding: 16,
};
const subtleCardStyle: CSSProperties = { ...cardStyle, background: "#f8fafc" };
const grid2Style: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 };
const grid3Style: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const linkStyle: CSSProperties = {
  display: "inline-flex",
  minHeight: 38,
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #0f766e",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#f0fdfa",
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

function StatusPill(props: { value: string | null | undefined; tone?: "good" | "warn" | "neutral" }) {
  const raw = props.value ?? "not available";
  const lower = raw.toLowerCase();
  const warn = props.tone === "warn" || lower.includes("missing") || lower.includes("partial") || lower.includes("blocked") || lower.includes("unresolved");
  const good = props.tone === "good" || lower.includes("ready") || lower.includes("available") || lower.includes("ok");
  return (
    <span style={{
      display: "inline-block",
      border: `1px solid ${warn ? "#f5b8a8" : good ? "#9cd8bd" : "#cbd5e1"}`,
      borderRadius: 999,
      padding: "4px 9px",
      background: warn ? "#fff7ed" : good ? "#eefbf4" : "#f8fafc",
      color: warn ? "#9a3412" : good ? "#166534" : "#334155",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {raw.replaceAll("_", " ")}
    </span>
  );
}

function SectionTitle(props: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {props.eyebrow ? <p style={{ margin: "0 0 4px", color: "#0f766e", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>{props.eyebrow}</p> : null}
      <h2 style={{ margin: 0, fontSize: 24 }}>{props.title}</h2>
      {props.children ? <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.55 }}>{props.children}</div> : null}
    </div>
  );
}

function EmptyText(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>{props.children}</p>;
}

function CountCard(props: { label: string; value: number | string; detail?: string }) {
  return (
    <article style={subtleCardStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{props.label}</p>
      <strong style={{ display: "block", marginTop: 6, fontSize: 26 }}>{props.value}</strong>
      {props.detail ? <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.45 }}>{props.detail}</p> : null}
    </article>
  );
}

function TextList(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.55 }}>
      {props.values.map((value) => <li key={value} style={{ marginBottom: 6, overflowWrap: "anywhere" }}>{value}</li>)}
    </ul>
  );
}

function SourceHero(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const source = props.projection.sourceIdentity;
  return (
    <section style={{ ...cardStyle, background: "#f8fbfd" }}>
      <p style={{ margin: "0 0 8px", color: "#0f766e", fontWeight: 800 }}>Website Understanding</p>
      <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1 }}>{source.hostname ?? "Source website unavailable"}</h1>
      <p style={{ maxWidth: 920, margin: "14px 0 0", color: "#334155", fontSize: 18, lineHeight: 1.55 }}>
        Source-site understanding explains what GNR8 has observed, structured, and still cannot classify about the imported original website. Candidate does not mean confirmed brand identity or business truth.
      </p>
      <div style={{ ...grid3Style, marginTop: 18 }}>
        <CountCard label="Source URL" value={source.sourceUrl ?? "not available"} detail={source.finalUrl ? `Final URL: ${source.finalUrl}` : undefined} />
        <CountCard label="Readiness" value={props.projection.readiness.status.replaceAll("_", " ")} detail={props.projection.readiness.summary} />
        <CountCard label="Confidence" value={props.projection.confidence.level} detail={props.projection.confidence.reasons[0]} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ ...linkStyle, background: "#0f766e", color: "#ffffff" }}>Open Original Website</a> : <span style={{ ...linkStyle, color: "#64748b", borderColor: "#cbd5e1", background: "#f8fafc" }}>Original Website Unavailable</span>}
        <a href={`/gnr8/admin/business-foundation/${props.projection.siteVersionId}`} style={linkStyle}>Open Business Foundation</a>
        <a href={`/gnr8/admin/evolution/${props.projection.siteVersionId}`} style={linkStyle}>Inspect Generation Evolution</a>
      </div>
    </section>
  );
}

function Readiness(props: { projection: SourceWebsiteUnderstandingProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Understanding Readiness">
        <p style={{ margin: 0 }}>Ready for Business Discovery means conservative discovery can proceed with visible gaps. It does not mean offerings, audience, logo, colors, or typography are confirmed.</p>
      </SectionTitle>
      <div style={{ ...grid3Style, marginBottom: 12 }}>
        <CountCard label="Business Discovery" value={props.projection.readiness.conservativeBusinessDiscoveryCanProceed ? "can proceed" : "not ready"} />
        <CountCard label="Limitations" value={props.projection.limitations.length} />
        <CountCard label="Diagnostics" value={props.projection.diagnostics.length} />
      </div>
      <div style={grid2Style}>
        {props.projection.readiness.dimensions.map((dimension) => (
          <article key={dimension.key} style={cardStyle}>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "flex-start" }}>
              <strong>{dimension.key.replaceAll("_", " ")}</strong>
              <StatusPill value={dimension.status} tone={dimension.status === "ok" ? "good" : "warn"} />
            </div>
            <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.45 }}>{dimension.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PagesNavigation(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const navLabels = props.projection.navigation.slice(0, 12).map((item) => `${item.label}${item.href ? ` -> ${item.href}` : ""}`);
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Pages and Navigation" />
      <div style={grid3Style}>
        <CountCard label="Pages" value={props.projection.pages.length} />
        <CountCard label="Routes" value={props.projection.routes.length} />
        <CountCard label="Navigation Items" value={props.projection.navigation.length} />
        <CountCard label="Reviewed Candidates" value={props.projection.navigation.filter((item) => item.reviewState !== "unreviewed" && item.reviewState !== "not_applicable").length} />
      </div>
      <div style={{ ...grid2Style, marginTop: 14 }}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Routes</h3>
          <TextList values={props.projection.routes.map((route) => `${route.routePath} (${route.state})`)} empty="No routes are available." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Navigation</h3>
          <TextList values={navLabels} empty="No navigation is available." />
        </article>
      </div>
    </section>
  );
}

function StructureContent(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const semanticTypes = [...new Set(props.projection.sections.map((section) => section.semanticType).filter((value): value is string => Boolean(value)))];
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Structure and Content" />
      <div style={grid3Style}>
        <CountCard label="Source Sections" value={props.projection.sections.filter((section) => !section.plannedOnly).length} />
        <CountCard label="Planning-Only Context" value={props.projection.sections.filter((section) => section.plannedOnly).length} />
        <CountCard label="Headings" value={props.projection.content.reduce((total, item) => total + item.headings.length, 0)} />
        <CountCard label="Body Text" value={props.projection.content.some((item) => item.bodyTextAvailable) ? "available" : "unavailable"} />
      </div>
      <div style={{ ...grid2Style, marginTop: 14 }}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Semantic Section Types</h3>
          <TextList values={semanticTypes} empty="No semantic section types are materialized." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Content Signals</h3>
          <TextList values={props.projection.content.flatMap((item) => item.visibleMessages).slice(0, 12)} empty="No visible messages are materialized." />
        </article>
      </div>
    </section>
  );
}

function Assets(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const counts = {
    images: props.projection.assets.filter((asset) => asset.assetKind === "image" || asset.assetKind === "svg").length,
    icons: props.projection.assets.filter((asset) => asset.assetKind === "icon").length,
    fonts: props.projection.assets.filter((asset) => asset.assetKind === "font").length,
    videos: props.projection.assets.filter((asset) => asset.assetKind === "video").length,
    documents: props.projection.assets.filter((asset) => asset.assetKind === "document").length,
    unresolved: props.projection.assets.filter((asset) => asset.candidateMeaningState === "unavailable" || asset.candidateMeaningState === "missing").length,
  };
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Imported Assets">
        <p style={{ margin: 0 }}>Asset inventory means the file exists. Asset meaning remains candidate, unresolved, or unavailable unless existing evidence says otherwise.</p>
      </SectionTitle>
      <div style={grid3Style}>
        <CountCard label="Total Assets" value={props.projection.assets.length} />
        <CountCard label="Images / SVGs" value={counts.images} />
        <CountCard label="Icons" value={counts.icons} />
        <CountCard label="Fonts" value={counts.fonts} />
        <CountCard label="Videos" value={counts.videos} />
        <CountCard label="Documents" value={counts.documents} />
        <CountCard label="Unresolved Meaning" value={counts.unresolved} />
      </div>
      <div style={{ ...grid3Style, marginTop: 14 }}>
        {props.projection.assets.slice(0, 12).map((asset) => (
          <article key={asset.assetId} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <strong style={{ overflowWrap: "anywhere" }}>{asset.filename}</strong>
              <StatusPill value={asset.candidateMeaningState} tone={asset.candidateMeaningState === "candidate" ? "warn" : "neutral"} />
            </div>
            <p style={{ margin: "8px 0 0", color: "#475569", overflowWrap: "anywhere" }}>{asset.path}</p>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{asset.assetKind} / {asset.mediaType}</p>
            {asset.previewHref ? <a href={asset.previewHref} style={{ ...linkStyle, marginTop: 10 }}>View Safe Preview</a> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function VisualIdentity(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const visual = props.projection.visualIdentitySignals;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Visual Identity Signals">
        <p style={{ margin: 0 }}>Candidate does not mean confirmed brand identity.</p>
      </SectionTitle>
      <div style={grid3Style}>
        <CountCard label="Logo Candidates" value={visual.logoCandidates.length} />
        <CountCard label="Color Signals" value={visual.colorSignals.length} />
        <CountCard label="Typography Signals" value={visual.typographySignals.length} />
        <CountCard label="Icon Font Signals" value={visual.iconStyleSignals.length} />
      </div>
      <div style={{ ...grid2Style, marginTop: 14 }}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Logo Candidates</h3>
          <TextList values={visual.logoCandidates.map((item) => `${item.label} (${item.state}, ${item.confidence.level})`)} empty="No logo candidate is materialized from existing evidence." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Typography</h3>
          <TextList values={visual.typographySignals.map((item) => `${item.family} - ${item.role} (${item.state})`)} empty="No typography signal is materialized." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Colors</h3>
          <TextList values={visual.colorSignals.map((item) => `${item.label}: ${item.value ?? "unresolved"} (${item.state})`)} empty="Color evidence is unavailable or unresolved." />
        </article>
      </div>
    </section>
  );
}

function BusinessSignals(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const signals = props.projection.businessSignalCandidates;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Business Signal Candidates">
        <p style={{ margin: 0 }}>These are source-level candidates and unresolved evidence gaps. They are not DBT facts.</p>
      </SectionTitle>
      <div style={grid3Style}>
        <CountCard label="Offerings" value={signals.offerings.length} />
        <CountCard label="Audience" value={signals.audiences.length} />
        <CountCard label="Trust" value={signals.trust.length} />
        <CountCard label="Identity" value={signals.identity.length} />
        <CountCard label="Languages" value={signals.languages.length} />
      </div>
      <div style={{ ...grid2Style, marginTop: 14 }}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Offering Evidence</h3>
          <TextList values={signals.offerings.map((item) => `${item.label} (${item.state})`)} empty="Offering evidence is unresolved or not classified upstream." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Audience Evidence</h3>
          <TextList values={signals.audiences.map((item) => `${item.label} (${item.state})`)} empty="Audience evidence is unresolved or not classified upstream." />
        </article>
      </div>
    </section>
  );
}

function TechnicalSeo(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const tech = props.projection.technicalSignals;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Technical and SEO Signals" />
      <div style={grid3Style}>
        <CountCard label="Title" value={tech.title ?? "not available"} />
        <CountCard label="Canonical URL" value={tech.canonicalUrl ?? "not available"} />
        <CountCard label="Structured Data" value={tech.structuredDataAvailable ? "available" : "unavailable"} />
        <CountCard label="Robots Evidence" value={tech.robotsEvidence.length} />
        <CountCard label="Sitemap Evidence" value={tech.sitemapEvidence.length} />
      </div>
    </section>
  );
}

function MissingConflicting(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const gaps = [
    ...props.projection.businessSignalCandidates.unresolvedEvidence,
    ...props.projection.visualIdentitySignals.unresolvedSignals,
    ...props.projection.limitations
      .filter((item) => item.severity !== "info")
      .map((item) => `${item.code}: ${item.message}`),
  ];
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Missing / Conflicting Understanding" />
      <div style={{ ...cardStyle, borderColor: "#f5b8a8", background: "#fff7ed" }}>
        <TextList values={gaps} empty="No missing or conflicting understanding is currently projected." />
      </div>
    </section>
  );
}

function Advanced(props: { projection: SourceWebsiteUnderstandingProjection }) {
  const refs = [
    ...props.projection.sourceArtifactRefs,
    ...props.projection.evidenceArtifactRefs,
    ...props.projection.candidateArtifactRefs,
    ...props.projection.reviewArtifactRefs,
    ...props.projection.reconstructionArtifactRefs,
    ...props.projection.planningContextArtifactRefs,
  ];
  return (
    <section style={sectionStyle}>
      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Source Artifact Lineage</summary>
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(160px, 260px) 1fr", gap: "8px 12px", marginTop: 14 }}>
          <dt>contractVersion</dt><dd style={{ margin: 0 }}>{props.projection.contractVersion}</dd>
          <dt>projectionId</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{props.projection.projectionId}</dd>
          <dt>siteVersionId</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{props.projection.siteVersionId}</dd>
          <dt>dryRunId</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{props.projection.dryRunId ?? "not available"}</dd>
        </dl>
        <ul style={{ marginTop: 14, paddingLeft: 18 }}>
          {refs.map((ref, index) => (
            <li key={`${ref.kind}:${ref.artifactId}:${index}`} style={{ marginBottom: 8, overflowWrap: "anywhere" }}>
              {ref.source} / {ref.kind} / {ref.artifactId ?? ref.canonicalId ?? "not available"} / {ref.status ?? "status unavailable"}
            </li>
          ))}
        </ul>
      </details>
      <details style={{ ...cardStyle, marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Advanced Diagnostics</summary>
        <TextList values={props.projection.diagnostics.map((item) => `${item.code}: ${item.message}`)} empty="No diagnostics are available." />
      </details>
    </section>
  );
}

export default async function WebsiteUnderstandingPage(props: PageProps) {
  await requireSuperadminUserIdForPage();
  const { siteVersionId } = await props.params;
  const result = await loadSourceWebsiteUnderstandingProjection({ siteVersionId });
  const projection = result.projection;
  if (!projection) {
    return (
      <main style={shellStyle}>
        <h1 style={{ margin: 0 }}>Website Understanding unavailable</h1>
        <p style={{ color: "#475569" }}>The source website understanding projection could not be built for this site version.</p>
        <Advanced projection={{
          projectionId: "unavailable",
          contractVersion: "WU-2",
          generatedAt: new Date(0).toISOString(),
          siteVersionId,
          dryRunId: null,
          connectorType: null,
          sourceIdentity: {
            siteVersionId,
            dryRunId: null,
            sourceUrl: null,
            finalUrl: null,
            hostname: null,
            connectorType: null,
            importIdentity: null,
            importedAt: null,
            captureCompletedAt: null,
            sourceAvailability: "unavailable",
            languageSignals: [],
            evidenceRefs: [],
          },
          sourceArtifactRefs: [],
          evidenceArtifactRefs: [],
          candidateArtifactRefs: [],
          reviewArtifactRefs: [],
          reconstructionArtifactRefs: [],
          planningContextArtifactRefs: [],
          pages: [],
          routes: [],
          navigation: [],
          sections: [],
          content: [],
          assets: [],
          visualIdentitySignals: { logoCandidates: [], colorSignals: [], typographySignals: [], iconStyleSignals: [], imageStyleSignals: [], unresolvedSignals: [], limitations: [] },
          businessSignalCandidates: { offerings: [], audiences: [], trust: [], goals: [], identity: [], differentiators: [], geography: [], languages: [], unresolvedEvidence: [], limitations: [] },
          technicalSignals: { title: null, meta: {}, canonicalUrl: null, headingStructure: [], structuredDataAvailable: false, robotsEvidence: [], sitemapEvidence: [], languageMetadata: [], accessibilityObservations: [], externalScripts: [], technologyHints: [], widgets: [], socialMetadata: [], confidence: { level: "LOW", reasons: [] }, evidenceRefs: [] },
          readiness: { status: "blocked", conservativeBusinessDiscoveryCanProceed: false, summary: "Projection unavailable.", dimensions: [], blockers: [] },
          confidence: { level: "LOW", reasons: [] },
          limitations: [],
          diagnostics: result.diagnostics,
          lineage: { siteVersionId, dryRunId: null, contractVersion: "WU-2", sourceArtifactRefs: [], evidenceArtifactRefs: [], candidateArtifactRefs: [], reviewArtifactRefs: [], reconstructionArtifactRefs: [], planningContextArtifactRefs: [], deterministicInputs: { siteVersionId, dryRunId: null, contractVersion: "WU-2", artifactIds: [] } },
        }} />
      </main>
    );
  }
  return (
    <main style={shellStyle}>
      <SourceHero projection={projection} />
      <Readiness projection={projection} />
      <PagesNavigation projection={projection} />
      <StructureContent projection={projection} />
      <Assets projection={projection} />
      <VisualIdentity projection={projection} />
      <BusinessSignals projection={projection} />
      <TechnicalSeo projection={projection} />
      <MissingConflicting projection={projection} />
      <Advanced projection={projection} />
    </main>
  );
}
