import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import type {
  BusinessFoundationArtifactLinkProjection,
  BusinessFoundationKnowledgeItemProjection,
  GeneratedIterationLinkProjection,
  GenerationBusinessFoundationProjection,
  ImportedAssetPreviewProjection,
  ProductKnowledgeGapProjection,
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
  maxWidth: 1440,
  margin: "0 auto",
  padding: "32px 28px 64px",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#111827",
};

const sectionStyle: CSSProperties = {
  marginTop: 34,
};

const cardStyle: CSSProperties = {
  border: "1px solid #d8e2ec",
  borderRadius: 8,
  background: "#ffffff",
  padding: 16,
};

const subtleCardStyle: CSSProperties = {
  ...cardStyle,
  background: "#f8fafc",
};

const grid2Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14,
};

const grid3Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const linkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  border: "1px solid #0f766e",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#0f766e",
  background: "#f0fdfa",
  fontWeight: 700,
  textDecoration: "none",
};

function EmptyText(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>{props.children}</p>;
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

function StatusPill(props: { value: string | null | undefined; tone?: "good" | "warn" | "neutral" }) {
  const rawValue = props.value ?? "not available";
  const lower = rawValue.toLowerCase();
  const warning = props.tone === "warn" || lower.includes("missing") || lower.includes("unresolved") || lower.includes("partial") || lower.includes("non_compliant");
  const good = props.tone === "good" || lower.includes("understood") || lower.includes("detected") || lower.includes("improvement");
  const displayValue = rawValue === "non_compliant" ? "non-compliant" : rawValue.replaceAll("_", " ");
  return (
    <span style={{
      display: "inline-block",
      border: `1px solid ${warning ? "#f5b8a8" : good ? "#a7d7c5" : "#cbd5e1"}`,
      borderRadius: 999,
      padding: "4px 9px",
      background: warning ? "#fff7ed" : good ? "#eefbf4" : "#f8fafc",
      color: warning ? "#9a3412" : good ? "#166534" : "#334155",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {displayValue}
    </span>
  );
}

function ExternalLink(props: { href: string | null; children: ReactNode; primary?: boolean }) {
  if (!props.href) return <span style={{ ...linkButtonStyle, borderColor: "#cbd5e1", color: "#64748b", background: "#f8fafc" }}>{props.children}</span>;
  return (
    <a href={props.href} target="_blank" rel="noreferrer noopener" style={props.primary ? { ...linkButtonStyle, background: "#0f766e", color: "#ffffff" } : linkButtonStyle}>
      {props.children}
    </a>
  );
}

function InternalLink(props: { href: string | null; children: ReactNode; primary?: boolean }) {
  if (!props.href) return <span style={{ ...linkButtonStyle, borderColor: "#cbd5e1", color: "#64748b", background: "#f8fafc" }}>{props.children}</span>;
  return <a href={props.href} style={props.primary ? { ...linkButtonStyle, background: "#0f766e", color: "#ffffff" } : linkButtonStyle}>{props.children}</a>;
}

function ListText(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.55 }}>
      {props.values.map((value) => (
        <li key={value} style={{ marginBottom: 6, overflowWrap: "anywhere" }}>{value}</li>
      ))}
    </ul>
  );
}

function KnowledgeItems(props: { items: BusinessFoundationKnowledgeItemProjection[]; empty: string }) {
  if (props.items.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.items.map((item, index) => (
        <div key={`${item.id ?? item.statement}:${index}`} style={subtleCardStyle}>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{item.statement}</p>
          <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 13 }}>
            Confidence: {item.confidence.level ?? "not available"} / Evidence links: {item.evidenceCount}
          </p>
        </div>
      ))}
    </div>
  );
}

function Hero(props: { model: GenerationBusinessFoundationProjection }) {
  const hero = props.model.hero;
  return (
    <section style={{
      border: "1px solid #cfe0ef",
      borderRadius: 8,
      background: "#f8fbfd",
      padding: 24,
    }}>
      <p style={{ margin: "0 0 8px", color: "#0f766e", fontWeight: 800 }}>Business Foundation</p>
      <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1 }}>{hero.businessName ?? "Business identity unavailable"}</h1>
      <p style={{ maxWidth: 860, margin: "14px 0 0", color: "#334155", fontSize: 18, lineHeight: 1.55 }}>
        {hero.description ?? "GNR8 does not yet have a persisted human-readable business description for this site version."}
      </p>
      <div style={{ ...grid3Style, marginTop: 18 }}>
        <div style={cardStyle}>
          <strong>Original Website</strong>
          <p style={{ margin: "8px 0 0", color: "#475569", overflowWrap: "anywhere" }}>
            {hero.sourceWebsite.hostname ?? hero.sourceWebsite.unavailableMessage}
          </p>
          {hero.sourceWebsite.url ? <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b", overflowWrap: "anywhere" }}>{hero.sourceWebsite.url}</p> : null}
        </div>
        <div style={cardStyle}>
          <strong>Website Purpose</strong>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.5 }}>
            {hero.websitePurpose ?? "Website purpose is not available in the current persisted business evidence."}
          </p>
        </div>
        <div style={cardStyle}>
          <strong>Current Understanding</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <StatusPill value={hero.currentState} tone="warn" />
            <StatusPill value={hero.understandingConfidence ?? "confidence unavailable"} />
          </div>
          <p style={{ margin: "10px 0 0", color: "#9a3412", lineHeight: 1.45 }}>{hero.missingKnowledgeSummary}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <ExternalLink href={hero.primaryLinks.originalWebsiteHref} primary>Open Original Website</ExternalLink>
        <InternalLink href={hero.primaryLinks.evolutionHref}>Inspect Generation Evolution</InternalLink>
        <InternalLink href={hero.primaryLinks.latestGeneratedProposalHref}>Open Latest Generated Proposal</InternalLink>
      </div>
    </section>
  );
}

function WebsiteVersions(props: { model: GenerationBusinessFoundationProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Website Versions">
        <p style={{ margin: 0 }}>The original website and generated proposal previews are shown as read-only historical versions. Generated proposals are quarantined generated proposals: not approved, not published, and not deployed.</p>
      </SectionTitle>
      <div style={{ display: "grid", gap: 12 }}>
        <article style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Original Website</h3>
              <p style={{ margin: "6px 0 0", color: "#475569", overflowWrap: "anywhere" }}>{props.model.sourceWebsite.url ?? props.model.sourceWebsite.unavailableMessage}</p>
            </div>
            <StatusPill value={props.model.sourceWebsite.status ?? "import status unavailable"} />
          </div>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>Imported: {props.model.sourceWebsite.importedAt ?? "not available"}</p>
        </article>
        {props.model.generatedIterations.length === 0 ? (
          <div style={subtleCardStyle}><EmptyText>No generated iterations are available in persisted Evolution Dashboard evidence.</EmptyText></div>
        ) : props.model.generatedIterations.map((iteration, index) => (
          <GeneratedVersion key={iteration.label} iteration={iteration} prefix={index === 0 ? "↓" : "↓"} />
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <InternalLink href={props.model.hero.primaryLinks.evolutionHref}>View Website Evolution</InternalLink>
      </div>
    </section>
  );
}

function GeneratedVersion(props: { iteration: GeneratedIterationLinkProjection; prefix: string }) {
  const latestStyle = props.iteration.isLatest
    ? { ...cardStyle, borderColor: "#0f766e", background: "#f0fdfa" }
    : cardStyle;
  return (
    <article style={latestStyle}>
      <p style={{ margin: "0 0 8px", color: "#64748b", fontWeight: 800 }}>{props.prefix}</p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>{props.iteration.label} — Generated Proposal Preview</h3>
          <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.5 }}>{props.iteration.resultSummary}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignContent: "flex-start" }}>
          <StatusPill value={props.iteration.isLatest ? "latest quarantined generated proposal" : "quarantined generated proposal"} tone="warn" />
          <StatusPill value={props.iteration.complianceState ?? "compliance unavailable"} tone="warn" />
        </div>
      </div>
      <p style={{ margin: "10px 0", color: "#64748b", fontSize: 13 }}>
        Created: {props.iteration.createdAt ?? "not available"} / Status: {props.iteration.status} / Not approved / Not published
      </p>
      <InternalLink href={props.iteration.previewHref}>Open {props.iteration.label} Preview</InternalLink>
    </article>
  );
}

function CurrentUnderstanding(props: { model: GenerationBusinessFoundationProjection }) {
  const summary = props.model.productAttentionSummary;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="What GNR8 Understands" />
      <div style={grid2Style}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Business Narrative</h3>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65 }}>{props.model.narrative.headline}</p>
          <p style={{ margin: "14px 0 0", color: "#475569", lineHeight: 1.6 }}>
            {props.model.narrative.websitePurpose ?? "The apparent purpose of the website remains unavailable in the current persisted evidence."}
          </p>
          <div style={{ marginTop: 14 }}>
            <strong>Business goals</strong>
            <ListText values={props.model.narrative.goals} empty="No persisted business goals are available." />
          </div>
          <div style={{ marginTop: 14 }}>
            <strong>Trust and credibility signals</strong>
            <ListText values={props.model.narrative.trustSignals} empty="No persisted trust signals are available." />
          </div>
          <div style={{ marginTop: 14 }}>
            <strong>What remains uncertain</strong>
            <ListText values={props.model.narrative.uncertainties} empty="No uncertainty statements are available in persisted evidence." />
          </div>
        </article>
        <article style={subtleCardStyle}>
          <h3 style={{ marginTop: 0 }}>Current Understanding</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <StatusRow label="Business identity" value={summary.businessIdentity} />
            <StatusRow label="Website purpose" value={summary.websitePurpose} />
            <StatusRow label="Offerings" value={summary.offerings} />
            <StatusRow label="Audience" value={summary.audience} />
            <StatusRow label="Visual identity" value={summary.visualIdentity} />
            <StatusRow label="Generation readiness" value={summary.generationReadiness} />
            <StatusRow label="Latest website evolution" value={summary.latestWebsiteEvolution} />
          </div>
        </article>
      </div>
    </section>
  );
}

function StatusRow(props: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
      <span style={{ color: "#334155" }}>{props.label}</span>
      <StatusPill value={props.value} />
    </div>
  );
}

function OfferingsAudience(props: { model: GenerationBusinessFoundationProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Offerings and Audience" />
      <div style={grid2Style}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Offerings</h3>
          {props.model.offerings.knownOfferings.length === 0 ? (
            <EmptyText>GNR8 has not yet confirmed the service portfolio. This matters because generation cannot reliably structure service hierarchy without confirmed offerings.</EmptyText>
          ) : <KnowledgeItems items={props.model.offerings.knownOfferings} empty="GNR8 has not yet confirmed the service portfolio." />}
          <div style={{ marginTop: 14 }}>
            <strong>Unresolved offering knowledge</strong>
            <ListText values={props.model.offerings.unknownOfferings} empty="No unresolved offering knowledge is recorded." />
          </div>
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Audience</h3>
          {props.model.audience.knownAudience.length === 0 ? (
            <EmptyText>Target audience remains unresolved. This matters because generation cannot confidently tune messaging, proof, or calls to action.</EmptyText>
          ) : <KnowledgeItems items={props.model.audience.knownAudience} empty="Target audience remains unresolved." />}
          <div style={{ marginTop: 14 }}>
            <strong>Missing audience knowledge</strong>
            <ListText values={props.model.audience.missingAudienceKnowledge} empty="No missing audience knowledge is recorded." />
          </div>
        </article>
      </div>
    </section>
  );
}

function VisualIdentity(props: { model: GenerationBusinessFoundationProjection }) {
  const visual = props.model.visualIdentity;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Detected Brand & Visual Identity">
        <p style={{ margin: 0 }}>Only explicitly persisted visual evidence is shown. This page does not infer new colors, fonts, logo meaning, or CGP facts.</p>
      </SectionTitle>
      <div style={grid2Style}>
        <article style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Logo</h3>
            <StatusPill value={visual.logo.status} />
          </div>
          {visual.logo.previewHref ? (
            <img src={visual.logo.previewHref} alt="Imported logo candidate" style={{ display: "block", maxWidth: 220, maxHeight: 120, objectFit: "contain", marginTop: 14, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", padding: 8 }} />
          ) : <div style={{ ...subtleCardStyle, marginTop: 12 }}><EmptyText>{visual.logo.unavailableMessage ?? "Logo preview is unavailable."}</EmptyText></div>}
          <p style={{ margin: "12px 0 0", color: "#475569", overflowWrap: "anywhere" }}>Asset reference: {visual.logo.assetReference ?? "not available"}</p>
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Colors</h3>
          {visual.primaryColors.length + visual.secondaryColors.length === 0 ? (
            <EmptyText>No canonical brand colors are currently persisted.</EmptyText>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {[...visual.primaryColors, ...visual.secondaryColors].map((color) => (
                <div key={`${color.value}:${color.label}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #cbd5e1", background: color.value }} />
                  <span style={{ overflowWrap: "anywhere" }}>{color.value} — {color.source}</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Typography</h3>
          {visual.typography.length === 0 ? (
            <EmptyText>Typography was not captured as canonical brand knowledge.</EmptyText>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {visual.typography.map((font) => (
                <p key={`${font.family}:${font.source}`} style={{ margin: 0, overflowWrap: "anywhere" }}>
                  <strong>{font.family}</strong> — {font.source}; locally available: {font.locallyAvailable === null ? "not available" : font.locallyAvailable ? "yes" : "no"}
                </p>
              ))}
            </div>
          )}
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Tone and Limitations</h3>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{visual.tone ?? "Brand voice is not available as canonical knowledge."}</p>
          <div style={{ marginTop: 12 }}>
            <ListText values={visual.limitations} empty="No visual identity limitations are recorded." />
          </div>
        </article>
      </div>
    </section>
  );
}

function ImportedAssets(props: { model: GenerationBusinessFoundationProjection }) {
  const assets = props.model.importedAssets;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Original Imported Assets">
        <p style={{ margin: 0 }}>Generated proposal assets stay inside their iteration previews. This section shows only the original imported website assets that are available through the existing preview-assets boundary.</p>
      </SectionTitle>
      <div style={grid3Style}>
        <Metric label="logos" value={assets.logos} />
        <Metric label="images" value={assets.images} />
        <Metric label="icons" value={assets.icons} />
        <Metric label="fonts" value={assets.fonts} />
        <Metric label="videos" value={assets.videos} />
        <Metric label="other files" value={assets.otherFiles} />
      </div>
      {assets.previews.length === 0 ? (
        <div style={{ ...subtleCardStyle, marginTop: 12 }}><EmptyText>{assets.unavailableMessage ?? "No imported visual assets are available."}</EmptyText></div>
      ) : (
        <div style={{ ...grid3Style, marginTop: 14 }}>
          {assets.previews.map((asset) => <AssetPreview key={asset.path} asset={asset} />)}
        </div>
      )}
    </section>
  );
}

function Metric(props: { label: string; value: number }) {
  return (
    <div style={subtleCardStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{props.label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800 }}>{props.value}</p>
    </div>
  );
}

function AssetPreview(props: { asset: ImportedAssetPreviewProjection }) {
  const logoPreviewHref = props.asset.type === "logo_candidate" ? props.asset.previewHref : null;
  return (
    <article style={cardStyle}>
      {logoPreviewHref ? (
        <img src={logoPreviewHref} alt={props.asset.filename} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }} />
      ) : (
        <div style={{ display: "grid", placeItems: "center", width: "100%", aspectRatio: "4 / 3", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", color: "#64748b", textAlign: "center", padding: 10 }}>
          {props.asset.type === "font" ? "Font file" : props.asset.previewHref ? "Preview route verified" : "Preview unavailable"}
        </div>
      )}
      <h3 style={{ margin: "10px 0 4px", fontSize: 15, overflowWrap: "anywhere" }}>{props.asset.filename}</h3>
      <p style={{ margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.45 }}>{props.asset.type.replaceAll("_", " ")} / {props.asset.mediaType}</p>
      <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12, overflowWrap: "anywhere" }}>{props.asset.path}</p>
    </article>
  );
}

function MissingKnowledge(props: { gaps: ProductKnowledgeGapProjection[]; additionalCount: number }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="What GNR8 Still Needs to Know" />
      <div style={grid3Style}>
        {props.gaps.map((gap) => (
          <article key={`${gap.label}:${gap.summary}`} style={gap.status === "critical" ? { ...cardStyle, borderColor: "#f59e0b", background: "#fff7ed" } : cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{gap.label}</h3>
              <StatusPill value={gap.status} tone={gap.status === "critical" ? "warn" : "neutral"} />
            </div>
            <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.5 }}>{gap.summary}</p>
            <p style={{ margin: "10px 0 0", color: "#9a3412", fontSize: 13 }}>Generation impact: {gap.generationImpact}</p>
          </article>
        ))}
      </div>
      <p style={{ margin: "12px 0 0", color: "#64748b" }}>{props.additionalCount} additional technical limitations are available in Advanced Technical Details.</p>
    </section>
  );
}

function TransformationStory(props: { model: GenerationBusinessFoundationProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Transformation Story" />
      <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
        {props.model.transformationStory.map((step, index) => (
          <li key={step.label} style={subtleCardStyle}>
            <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>{index + 1}</p>
            <h3 style={{ margin: "6px 0" }}>{step.label}</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.45 }}>{step.contributes}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AdvancedDetails(props: { model: GenerationBusinessFoundationProjection }) {
  return (
    <section style={sectionStyle}>
      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Advanced: Evidence, Lineage & Canonical Artifacts</summary>
        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          <div style={grid3Style}>
            <CodeField label="siteVersionId" value={props.model.advancedTechnical.siteVersionId} />
            <CodeField label="dryRunId" value={props.model.advancedTechnical.dryRunId} />
            <CodeField label="source site id" value={props.model.advancedTechnical.sourceSiteId} />
            <CodeField label="evidence count" value={props.model.advancedTechnical.evidenceCount} />
            <CodeField label="limitation count" value={props.model.advancedTechnical.limitationCount} />
          </div>
          <ArtifactGroup title="Understanding" artifacts={props.model.artifactExplorer.filter((artifact) => ["business_discovery", "digital_business_twin", "business_understanding_report"].includes(artifact.kind))} />
          <ArtifactGroup title="Alignment" artifacts={props.model.artifactExplorer.filter((artifact) => ["business_alignment", "aligned_digital_business_twin"].includes(artifact.kind))} />
          <ArtifactGroup title="Website Intent" artifacts={props.model.artifactExplorer.filter((artifact) => ["website_design_brief", "website_generation_package"].includes(artifact.kind))} />
          <div>
            <h3>Detailed Knowledge Groups</h3>
            {props.model.knowledgeGroups.map((group) => (
              <details key={group.key} style={{ ...subtleCardStyle, marginTop: 8 }}>
                <summary>{group.label} / confidence {group.confidence.level ?? "not available"} / evidence {group.evidenceCount}</summary>
                <KnowledgeItems items={group.statements} empty="No persisted knowledge for this group." />
                <ListText values={group.missing} empty="No missing knowledge recorded for this group." />
              </details>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function CodeField(props: { label: string; value: string | number | null }) {
  return (
    <div style={subtleCardStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{props.label}</p>
      <code style={{ display: "block", marginTop: 6, whiteSpace: "normal", overflowWrap: "anywhere", fontSize: 12 }}>{props.value ?? "missing"}</code>
    </div>
  );
}

function ArtifactGroup(props: { title: string; artifacts: BusinessFoundationArtifactLinkProjection[] }) {
  return (
    <div>
      <h3>{props.title}</h3>
      <div style={grid3Style}>
        {props.artifacts.map((artifact) => (
          <div id={artifact.artifactId ? `artifact-${artifact.artifactId}` : undefined} key={`${artifact.kind}:${artifact.artifactId ?? artifact.label}`} style={subtleCardStyle}>
            <strong>{artifact.label}</strong>
            <p style={{ margin: "6px 0", color: "#475569", fontSize: 13 }}>{artifact.kind}</p>
            <code style={{ display: "block", overflowWrap: "anywhere", whiteSpace: "normal", fontSize: 12 }}>{artifact.artifactId ?? "missing"}</code>
            {artifact.canonicalId ? <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>canonical: {artifact.canonicalId}</p> : null}
          </div>
        ))}
      </div>
    </div>
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
      <Hero model={model} />
      <WebsiteVersions model={model} />
      <CurrentUnderstanding model={model} />
      <OfferingsAudience model={model} />
      <VisualIdentity model={model} />
      <ImportedAssets model={model} />
      <MissingKnowledge gaps={model.productKnowledgeGaps} additionalCount={model.businessHealth.limitationCount} />
      <TransformationStory model={model} />
      <AdvancedDetails model={model} />
    </main>
  );
}
