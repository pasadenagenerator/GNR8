import type { CSSProperties, ReactNode } from "react";

import type { SourceContentVisualContinuityProjection } from "@/gnr8/architecture/source-content-visual-continuity-projection-contract";
import { loadSourceContentVisualContinuityProjection } from "@/gnr8/architecture/source-content-visual-continuity-projection-loader";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ siteVersionId: string }>;
};

const shellStyle: CSSProperties = {
  maxWidth: 1480,
  margin: "0 auto",
  padding: "32px 28px 64px",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#111827",
};
const sectionStyle: CSSProperties = { marginTop: 30 };
const cardStyle: CSSProperties = { border: "1px solid #d8e2ec", borderRadius: 8, background: "#ffffff", padding: 16 };
const quietCardStyle: CSSProperties = { ...cardStyle, background: "#f8fafc" };
const grid2Style: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 };
const grid3Style: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 };
const linkStyle: CSSProperties = {
  display: "inline-flex",
  minHeight: 38,
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #475569",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 800,
  textDecoration: "none",
};

function SectionTitle(props: { title: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 24 }}>{props.title}</h2>
      {props.children ? <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.55 }}>{props.children}</div> : null}
    </div>
  );
}

function StatusPill(props: { value: string | null | undefined; tone?: "good" | "warn" | "neutral" }) {
  const value = String(props.value ?? "not available").replaceAll("_", " ");
  const lower = value.toLowerCase();
  const warn = props.tone === "warn" || lower.includes("missing") || lower.includes("blocked") || lower.includes("unresolved") || lower.includes("confirmation");
  const good = props.tone === "good" || lower.includes("ready") || lower.includes("available") || lower.includes("ok");
  return (
    <span style={{ display: "inline-block", border: `1px solid ${warn ? "#f5b8a8" : good ? "#9cd8bd" : "#cbd5e1"}`, borderRadius: 999, padding: "4px 9px", background: warn ? "#fff7ed" : good ? "#eefbf4" : "#f8fafc", color: warn ? "#9a3412" : good ? "#166534" : "#334155", fontSize: 12, fontWeight: 800 }}>
      {value}
    </span>
  );
}

function CountCard(props: { label: string; value: number | string; detail?: string }) {
  return (
    <article style={quietCardStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{props.label}</p>
      <strong style={{ display: "block", marginTop: 6, fontSize: 24, overflowWrap: "anywhere" }}>{props.value}</strong>
      {props.detail ? <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.45 }}>{props.detail}</p> : null}
    </article>
  );
}

function EmptyText(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>{props.children}</p>;
}

function TextList(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.55 }}>
      {props.values.map((value) => <li key={value} style={{ marginBottom: 6, overflowWrap: "anywhere" }}>{value}</li>)}
    </ul>
  );
}

function policyLabel(policy: string) {
  return policy.toLowerCase().replaceAll("_", " ");
}

function Summary(props: { projection: SourceContentVisualContinuityProjection }) {
  const p = props.projection;
  return (
    <section style={{ ...cardStyle, background: "#f8fbfd" }}>
      <p style={{ margin: "0 0 8px", color: "#475569", fontWeight: 900 }}>Source Continuity Summary</p>
      <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1 }}>{p.sourceIdentity.hostname ?? "Original website unavailable"}</h1>
      <p style={{ maxWidth: 940, margin: "14px 0 0", color: "#334155", fontSize: 18, lineHeight: 1.55 }}>
        Source content and visual continuity composes original website evidence into deterministic preservation, reuse, and confirmation candidates. Candidate does not mean confirmed brand asset.
      </p>
      <div style={{ ...grid3Style, marginTop: 18 }}>
        <CountCard label="Readiness" value={p.readiness.status.replaceAll("_", " ")} detail={p.readiness.summary} />
        <CountCard label="Confidence" value={p.confidence.level} detail={p.confidence.reasons[0]} />
        <CountCard label="Content Blocks" value={p.contentBlocks.length} />
        <CountCard label="Source Assets" value={p.assetContinuity.length} />
        <CountCard label="Logo Candidates" value={p.visualIdentitySignals.logoCandidates.length} />
        <CountCard label="Image Candidates" value={p.visualIdentitySignals.imageCandidates.length} />
        <CountCard label="Typography Candidates" value={p.visualIdentitySignals.typographyCandidates.length} />
        <CountCard label="Color Signals" value={p.visualIdentitySignals.colorSignals.length} />
        <CountCard label="Source Screenshot" value={p.thumbnailReadiness.originalSourceScreenshotAvailable ? "available" : "unavailable"} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        {p.sourceIdentity.sourceUrl ? <a href={p.sourceIdentity.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ ...linkStyle, background: "#334155", color: "#ffffff" }}>Open Original Website</a> : null}
        <a href={`/gnr8/admin/workspace/${p.siteVersionId}`} style={linkStyle}>Open Knowledge Workspace</a>
        <a href={`/gnr8/admin/website-understanding/${p.siteVersionId}`} style={linkStyle}>Open Website Understanding</a>
        <a href={`/gnr8/admin/business-foundation/${p.siteVersionId}`} style={linkStyle}>Open Business Foundation</a>
        <a href={`/gnr8/admin/evolution/${p.siteVersionId}`} style={linkStyle}>Open Generation Evolution</a>
      </div>
    </section>
  );
}

function Readiness(props: { projection: SourceContentVisualContinuityProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Readiness">
        <p style={{ margin: 0 }}>Ready for design enrichment does not mean ready for generation delivery, approval, publishing, or asset reuse authorization.</p>
      </SectionTitle>
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

function OriginalContent(props: { projection: SourceContentVisualContinuityProjection }) {
  const grouped = (type: string) => props.projection.contentBlocks.filter((block) => block.contentType === type).slice(0, 6);
  const row = (block: SourceContentVisualContinuityProjection["contentBlocks"][number]) => {
    const policy = props.projection.contentTransformationCandidates.find((candidate) => candidate.contentBlockId === block.blockId);
    return `${block.originalText} | ${block.routePath ?? "route unresolved"} | ${block.knowledgeState} | ${block.confidence.level} | ${policy ? policyLabel(policy.proposedPolicy) : "policy unavailable"} | evidence ${block.sourceEvidenceRefs.length}`;
  };
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Original Content" />
      <div style={grid2Style}>
        {[
          ["business identity/name", grouped("title")],
          ["headings", grouped("heading")],
          ["paragraphs", grouped("paragraph")],
          ["CTAs and contact details", [...grouped("cta"), ...grouped("contact_detail")]],
          ["service/offer text", grouped("service_offer_text")],
          ["audience language", grouped("audience_language")],
          ["trust text", grouped("trust_statement")],
          ["footer/legal/alt text", [...grouped("footer_text"), ...grouped("legal_text"), ...grouped("alt_text")]],
        ].map(([label, blocks]) => (
          <article key={String(label)} style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>{label as string}</h3>
            <TextList values={(blocks as SourceContentVisualContinuityProjection["contentBlocks"]).map(row)} empty="No source blocks in this group." />
          </article>
        ))}
      </div>
    </section>
  );
}

function TransformationCandidates(props: { projection: SourceContentVisualContinuityProjection }) {
  const groups = [
    ["Preserve exactly", "PRESERVE_VERBATIM"],
    ["Clean up only", "PRESERVE_WITH_CLEANUP"],
    ["Improve while preserving meaning", "IMPROVE_PRESERVING_MEANING"],
    ["Summarize", "SUMMARIZE"],
    ["Restructure", "RESTRUCTURE"],
    ["Exclude", "EXCLUDE"],
    ["Needs confirmation", "REQUIRE_CONFIRMATION"],
    ["Automatic transformation prohibited", "PROHIBIT_AUTOMATIC_GENERATION"],
  ];
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Transformation Candidates">
        <p style={{ margin: 0 }}>No transformation has been performed.</p>
      </SectionTitle>
      <div style={grid2Style}>
        {groups.map(([label, policy]) => {
          const values = props.projection.contentTransformationCandidates
            .filter((candidate) => candidate.proposedPolicy === policy)
            .slice(0, 8)
            .map((candidate) => {
              const block = props.projection.contentBlocks.find((item) => item.blockId === candidate.contentBlockId);
              return `${block?.originalText ?? candidate.contentBlockId} | ${candidate.reasonCode} | ${candidate.reviewRequirement}`;
            });
          return (
            <article key={policy} style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>{label}</h3>
              <TextList values={values} empty="No candidates in this policy group." />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SourceAssets(props: { projection: SourceContentVisualContinuityProjection }) {
  const counts = (category: string) => props.projection.assetContinuity.filter((asset) => asset.assetCategory === category).length;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Source Assets">
        <p style={{ margin: 0 }}>Asset inventory preserves existing imported asset identity. File existence and preview availability do not authorize reuse.</p>
      </SectionTitle>
      <div style={grid3Style}>
        <CountCard label="Images" value={counts("image")} />
        <CountCard label="SVGs" value={counts("svg")} />
        <CountCard label="Icons" value={counts("icon")} />
        <CountCard label="Fonts" value={counts("font")} />
        <CountCard label="Videos" value={counts("video")} />
        <CountCard label="Documents" value={counts("document")} />
        <CountCard label="Requires Confirmation" value={props.projection.assetContinuity.filter((asset) => asset.reuseCandidate.reuseState === "requires_confirmation").length} />
        <CountCard label="Licensing Unresolved" value={props.projection.assetContinuity.filter((asset) => asset.reuseCandidate.reuseState === "licensing_unresolved").length} />
      </div>
      <div style={{ ...grid3Style, marginTop: 14 }}>
        {props.projection.assetContinuity.slice(0, 18).map((asset) => (
          <article key={asset.assetId} style={cardStyle}>
            <strong style={{ overflowWrap: "anywhere" }}>{asset.filename}</strong>
            <p style={{ margin: "8px 0 0", color: "#475569", overflowWrap: "anywhere" }}>{asset.safeReference}</p>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{asset.assetCategory} / {asset.mediaType}</p>
            <div style={{ marginTop: 8 }}><StatusPill value={asset.reuseCandidate.reuseState} tone="warn" /></div>
            {asset.safePreviewRef ? <a href={asset.safePreviewRef} style={{ ...linkStyle, marginTop: 10 }}>Open Safe Preview</a> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function Candidates(props: { projection: SourceContentVisualContinuityProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Logo and Image Candidates">
        <p style={{ margin: 0 }}>Candidate does not mean confirmed brand asset.</p>
      </SectionTitle>
      <div style={grid2Style}>
        {props.projection.visualIdentitySignals.logoCandidates.map((candidate) => (
          <article key={candidate.candidateId} style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Logo candidate</h3>
            <p style={{ overflowWrap: "anywhere" }}>{candidate.sourceReference}</p>
            <p>{candidate.mediaType} | evidence {candidate.sourceEvidenceRefs.length} | {candidate.confidence.level}</p>
            <StatusPill value={candidate.continuityRecommendation} tone="warn" />
            {candidate.previewRef ? <a href={candidate.previewRef} style={{ ...linkStyle, marginTop: 10 }}>Open Safe Preview</a> : null}
          </article>
        ))}
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Image role candidates</h3>
          <TextList values={props.projection.visualIdentitySignals.imageCandidates.slice(0, 16).map((candidate) => `${candidate.roleCandidate} | ${candidate.sourceReference} | ${candidate.continuityRecommendation} | ${candidate.confidence.level}`)} empty="No image candidates are available." />
        </article>
      </div>
    </section>
  );
}

function TypographyColors(props: { projection: SourceContentVisualContinuityProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Typography and Colors">
        <p style={{ margin: 0 }}>These are source signals, not a canonical palette or canonical typography system.</p>
      </SectionTitle>
      <div style={grid2Style}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Typography</h3>
          <TextList values={props.projection.visualIdentitySignals.typographyCandidates.map((font) => `${font.family} | ${font.roleCandidate} | heading ${font.headingUsage ? "yes" : "no"} | body ${font.bodyUsage ? "yes" : "no"} | icon ${font.iconFontUsage ? "yes" : "no"} | ${font.licenseSourceStatus}`)} empty="No typography candidates are available." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Colors</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {props.projection.visualIdentitySignals.colorSignals.length === 0 ? <EmptyText>No color signals are available.</EmptyText> : props.projection.visualIdentitySignals.colorSignals.map((color) => (
              <div key={color.signalId} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10, alignItems: "center" }}>
                <span style={{ width: 32, height: 32, border: "1px solid #cbd5e1", borderRadius: 6, background: color.normalizedValue }} />
                <span>{color.value} | {color.candidateRole} | evidence {color.evidenceRefs.length} | {color.confidence.level}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function LayoutScreenshots(props: { projection: SourceContentVisualContinuityProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Layout and Screenshot Continuity">
        <p style={{ margin: 0 }}>Observed source layout remains separate from future design intent.</p>
      </SectionTitle>
      <div style={grid2Style}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Source section sequence</h3>
          <TextList values={props.projection.layoutContinuity.sectionSequence.map((section) => `${section.order}. ${section.semanticType ?? "unclassified"} | ${section.heading ?? "no heading"} | ${section.continuityState}`)} empty="No source sections are available." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Source screenshots</h3>
          <TextList values={props.projection.sourceScreenshots.map((screenshot) => `${screenshot.screenshotId} | ${screenshot.completeness} | ${screenshot.availability} | safe reference ${screenshot.safeAccessRef ? "available" : "unavailable"}`)} empty="No existing source screenshot reference is available." />
        </article>
      </div>
    </section>
  );
}

function Gaps(props: { projection: SourceContentVisualContinuityProjection }) {
  const gaps = [
    ...props.projection.readiness.blockers.map((item) => `${item.code}: ${item.message}`),
    ...props.projection.limitations.filter((item) => item.severity !== "info").map((item) => `${item.code}: ${item.message}`),
    ...props.projection.assetContinuity.filter((asset) => asset.reuseCandidate.licensingSourceStatus === "unresolved").slice(0, 8).map((asset) => `Licensing/source unresolved: ${asset.safeReference}`),
  ];
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Confirmation and Licensing Gaps" />
      <div style={{ ...cardStyle, borderColor: "#f5b8a8", background: "#fff7ed" }}>
        <TextList values={gaps} empty="No confirmation or licensing gaps are currently projected." />
      </div>
    </section>
  );
}

function Advanced(props: { projection: SourceContentVisualContinuityProjection }) {
  const refs = [
    ...props.projection.sourceArtifactRefs,
    ...props.projection.evidenceArtifactRefs,
    ...props.projection.candidateArtifactRefs,
    ...props.projection.reviewArtifactRefs,
    ...props.projection.screenshotArtifactRefs,
  ];
  return (
    <section style={sectionStyle}>
      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 900 }}>Source Lineage</summary>
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(160px, 260px) 1fr", gap: "8px 12px", marginTop: 14 }}>
          <dt>contractVersion</dt><dd style={{ margin: 0 }}>{props.projection.contractVersion}</dd>
          <dt>projectionId</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{props.projection.projectionId}</dd>
          <dt>sourceWebsiteUnderstandingProjectionId</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{props.projection.sourceWebsiteUnderstandingProjectionId}</dd>
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
        <summary style={{ cursor: "pointer", fontWeight: 900 }}>Advanced Diagnostics</summary>
        <TextList values={props.projection.diagnostics.map((item) => `${item.code}: ${item.message}`)} empty="No diagnostics are available." />
      </details>
    </section>
  );
}

export default async function SourceContentVisualContinuityPage(props: PageProps) {
  await requireSuperadminUserIdForPage();
  const { siteVersionId } = await props.params;
  const result = await loadSourceContentVisualContinuityProjection({ siteVersionId });
  const projection = result.projection;
  if (!projection) {
    return (
      <main style={shellStyle}>
        <h1 style={{ margin: 0 }}>Source continuity unavailable</h1>
        <p style={{ color: "#475569" }}>The source content and visual continuity projection could not be built for this site version.</p>
        <section style={sectionStyle}>
          <SectionTitle title="Advanced Diagnostics" />
          <TextList values={result.diagnostics.map((item) => `${item.code}: ${item.message}`)} empty="No diagnostics are available." />
        </section>
      </main>
    );
  }
  return (
    <main style={shellStyle}>
      <Summary projection={projection} />
      <Readiness projection={projection} />
      <OriginalContent projection={projection} />
      <TransformationCandidates projection={projection} />
      <SourceAssets projection={projection} />
      <Candidates projection={projection} />
      <TypographyColors projection={projection} />
      <LayoutScreenshots projection={projection} />
      <Gaps projection={projection} />
      <Advanced projection={projection} />
    </main>
  );
}
