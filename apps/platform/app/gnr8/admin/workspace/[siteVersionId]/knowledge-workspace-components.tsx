import type { CSSProperties, ReactNode } from "react";

import type {
  KnowledgeWorkspaceAdvancedProjection,
  KnowledgeWorkspaceGapProjection,
  KnowledgeWorkspaceHealthProjection,
  KnowledgeWorkspaceHeroProjection,
  KnowledgeWorkspaceKnowledgeCardProjection,
  KnowledgeWorkspaceProjection,
  KnowledgeWorkspaceStoryStepProjection,
  KnowledgeWorkspaceVersionProjection,
  KnowledgeWorkspaceVisualIdentityProjection,
} from "@/gnr8/architecture/knowledge-workspace-projection";

const cardStyle: CSSProperties = {
  border: "1px solid #d6e0ea",
  borderRadius: 8,
  background: "#ffffff",
  padding: 16,
};

const quietCardStyle: CSSProperties = {
  ...cardStyle,
  background: "#f8fafc",
};

const sectionStyle: CSSProperties = {
  marginTop: 36,
};

const grid2Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 16,
};

const grid3Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const linkButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  border: "1px solid #1d4ed8",
  borderRadius: 8,
  padding: "9px 13px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 800,
  textDecoration: "none",
};

function format(value: string | number | null | undefined) {
  return String(value ?? "not available").replaceAll("_", " ");
}

function EmptyText(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>{props.children}</p>;
}

function SectionTitle(props: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {props.eyebrow ? <p style={{ margin: "0 0 4px", color: "#1d4ed8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{props.eyebrow}</p> : null}
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>{props.title}</h2>
      {props.children ? <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.55 }}>{props.children}</div> : null}
    </div>
  );
}

export function WorkspaceMetric(props: { label: string; value: string | number | null | undefined; tone?: "good" | "warn" | "neutral" }) {
  const value = format(props.value);
  const lower = value.toLowerCase();
  const warn = props.tone === "warn" || lower.includes("missing") || lower.includes("unknown") || lower.includes("partial") || lower.includes("unavailable") || lower.includes("non compliant");
  const good = props.tone === "good" || lower.includes("known") || lower.includes("ready") || lower.includes("improvement") || lower.includes("available");
  return (
    <div style={quietCardStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700 }}>{props.label}</p>
      <p style={{ margin: "6px 0 0", color: warn ? "#9a3412" : good ? "#166534" : "#172033", fontSize: 18, fontWeight: 850, lineHeight: 1.25, overflowWrap: "anywhere" }}>
        {value}
      </p>
    </div>
  );
}

function Badge(props: { children: ReactNode; tone?: "blue" | "green" | "amber" | "neutral" }) {
  const tone = props.tone ?? "neutral";
  const colors: Record<"blue" | "green" | "amber" | "neutral", { border: string; background: string; color: string }> = {
    blue: { border: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" },
    green: { border: "#bbf7d0", background: "#f0fdf4", color: "#166534" },
    amber: { border: "#fed7aa", background: "#fff7ed", color: "#9a3412" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", minHeight: 26, border: `1px solid ${colors[tone].border}`, borderRadius: 999, background: colors[tone].background, color: colors[tone].color, padding: "3px 9px", fontSize: 12, fontWeight: 850, lineHeight: 1.2 }}>
      {props.children}
    </span>
  );
}

function ReadOnlyLink(props: { href: string | null; children: ReactNode; primary?: boolean; external?: boolean }) {
  if (!props.href) {
    return <span style={{ ...linkButtonStyle, borderColor: "#cbd5e1", background: "#f8fafc", color: "#64748b" }}>{props.children}</span>;
  }
  return (
    <a href={props.href} target={props.external ? "_blank" : undefined} rel={props.external ? "noreferrer noopener" : undefined} style={props.primary ? { ...linkButtonStyle, background: "#1d4ed8", color: "#ffffff" } : linkButtonStyle}>
      {props.children}
    </a>
  );
}

export function WorkspaceHero(props: { hero: KnowledgeWorkspaceHeroProjection }) {
  return (
    <section style={{ border: "1px solid #bdd7f2", borderRadius: 8, background: "#f8fbff", padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22, alignItems: "start" }}>
        <div>
          <p style={{ margin: "0 0 7px", color: "#1d4ed8", fontWeight: 900 }}>Knowledge Workspace</p>
          <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.06 }}>{props.hero.businessName}</h1>
          <p style={{ margin: "12px 0 0", maxWidth: 820, color: "#334155", fontSize: 18, lineHeight: 1.55 }}>
            The operator console for this imported website: what GNR8 has observed, where the latest quarantined proposal stands, what improved, and what still needs confirmation.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
            <ReadOnlyLink href={props.hero.links.originalWebsiteHref} external primary>Open Original Website</ReadOnlyLink>
            <ReadOnlyLink href={props.hero.links.latestProposalPreviewHref} primary>Open Latest Preview</ReadOnlyLink>
            <ReadOnlyLink href={props.hero.links.evolutionHref}>Open Evolution</ReadOnlyLink>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <WorkspaceMetric label="Original Website" value={props.hero.originalWebsiteUrl} />
          <WorkspaceMetric label="Latest Iteration" value={props.hero.currentIteration} />
          <WorkspaceMetric label="Generation Status" value={props.hero.currentGenerationCycle} />
          <WorkspaceMetric label="Compliance Status" value={props.hero.currentComplianceState} tone="warn" />
          <WorkspaceMetric label="Improvement Status" value={props.hero.currentEvolutionState} />
          <WorkspaceMetric label="Current Recommendation" value={props.hero.currentRecommendation} tone="warn" />
          <WorkspaceMetric label="Workspace Confidence" value={props.hero.currentConfidence} />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, paddingTop: 18, borderTop: "1px solid #dbeafe" }}>
        <ReadOnlyLink href={props.hero.links.businessFoundationHref}>Open Business Foundation</ReadOnlyLink>
        <ReadOnlyLink href={props.hero.links.websiteUnderstandingHref}>Open Website Understanding</ReadOnlyLink>
        <ReadOnlyLink href={props.hero.links.continuityHref}>Open Content & Visual Continuity</ReadOnlyLink>
      </div>
    </section>
  );
}

function PreviewFrame(props: { version: KnowledgeWorkspaceVersionProjection }) {
  if (props.version.previewImageHref) {
    return <img src={props.version.previewImageHref} alt={`${props.version.label} preview`} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }} />;
  }
  if (props.version.kind === "generated" && props.version.previewHref) {
    return <iframe src={props.version.previewHref} title={`${props.version.label} preview`} style={{ width: "100%", aspectRatio: "16 / 9", border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff" }} />;
  }
  return (
    <div style={{ display: "grid", placeItems: "center", width: "100%", aspectRatio: "16 / 9", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", color: "#64748b", textAlign: "center", padding: 14 }}>
      {props.version.previewUnavailableReason ?? "Preview unavailable"}
    </div>
  );
}

export function VersionCard(props: { version: KnowledgeWorkspaceVersionProjection }) {
  const primary = props.version.emphasis === "primary";
  return (
    <article style={primary ? { ...cardStyle, borderColor: "#2563eb", boxShadow: "0 10px 28px rgba(37, 99, 235, 0.12)" } : props.version.kind === "future" ? quietCardStyle : cardStyle}>
      <PreviewFrame version={props.version} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {props.version.badges.map((badge) => (
          <Badge key={badge} tone={badge.includes("Latest") ? "blue" : badge.includes("Quarantined") ? "amber" : badge.includes("available") ? "green" : "neutral"}>{badge}</Badge>
        ))}
      </div>
      <h3 style={{ margin: "12px 0 8px", fontSize: primary ? 22 : 19 }}>{props.version.label}</h3>
      <div style={{ display: "grid", gap: 8 }}>
        <WorkspaceMetric label="Status" value={props.version.status} />
        <WorkspaceMetric label="Compliance" value={props.version.compliance} />
        <WorkspaceMetric label="Recommendation" value={props.version.recommendation} />
        <WorkspaceMetric label="Improvement" value={props.version.improvementState} />
      </div>
      <div style={{ marginTop: 12 }}>
        <ReadOnlyLink href={props.version.openPreviewHref} external={props.version.kind === "original"}>Open Preview</ReadOnlyLink>
      </div>
    </article>
  );
}

export function WebsiteVersions(props: { versions: KnowledgeWorkspaceVersionProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Website Versions">
        <p style={{ margin: 0 }}>Original source and quarantined generated proposal iterations are shown as read-only timeline cards. The latest persisted iteration is emphasized.</p>
      </SectionTitle>
      <div style={grid3Style}>
        {props.versions.map((version) => <VersionCard key={version.label} version={version} />)}
      </div>
    </section>
  );
}

function StateBlock(props: { label: string; values: string[]; empty: string }) {
  return (
    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 9 }}>
      <strong style={{ display: "block", marginBottom: 5 }}>{props.label}</strong>
      {props.values.length === 0 ? <EmptyText>{props.empty}</EmptyText> : (
        <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", lineHeight: 1.5 }}>
          {props.values.slice(0, 4).map((value) => <li key={value} style={{ overflowWrap: "anywhere" }}>{value}</li>)}
        </ul>
      )}
    </div>
  );
}

export function KnowledgeCard(props: { card: KnowledgeWorkspaceKnowledgeCardProjection }) {
  return (
    <article style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{props.card.label}</h3>
        <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 9px", color: "#334155", fontSize: 12, fontWeight: 800 }}>
          {props.card.confidence}
        </span>
      </div>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <StateBlock label="We know..." values={props.card.known} empty="GNR8 has not confirmed this yet." />
        <StateBlock label="GNR8 has not confirmed..." values={props.card.unknown} empty="No unresolved item is currently highlighted." />
        <StateBlock label="This still requires confirmation..." values={props.card.needsConfirmation} empty="No confirmation item is currently highlighted." />
      </div>
    </article>
  );
}

export function BusinessUnderstanding(props: { cards: KnowledgeWorkspaceKnowledgeCardProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Business Understanding">
        <p style={{ margin: 0 }}>Plain-language business knowledge only. Internal identifiers stay in Advanced.</p>
      </SectionTitle>
      <div style={grid2Style}>
        {props.cards.map((card) => <KnowledgeCard key={card.label} card={card} />)}
      </div>
    </section>
  );
}

export function VisualIdentityCard(props: { visual: KnowledgeWorkspaceVisualIdentityProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Visual Identity">
        <p style={{ margin: 0 }}>Only existing persisted visual evidence is displayed. Missing brand signals are explained instead of fabricated.</p>
      </SectionTitle>
      <div style={grid2Style}>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Logo candidate</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <Badge tone={props.visual.logoCandidate.previewHref ? "green" : "amber"}>{props.visual.logoCandidate.previewHref ? "Candidate" : "Unavailable"}</Badge>
            <Badge>Needs confirmation</Badge>
          </div>
          {props.visual.logoCandidate.previewHref ? (
            <img src={props.visual.logoCandidate.previewHref} alt="Logo candidate" style={{ display: "block", maxWidth: 260, maxHeight: 150, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff", padding: 10 }} />
          ) : <EmptyText>{props.visual.logoCandidate.unavailableReason ?? "Logo candidate unavailable."}</EmptyText>}
          <p style={{ margin: "10px 0 0", color: "#475569", overflowWrap: "anywhere" }}>{props.visual.logoCandidate.label}</p>
          <WorkspaceMetric label="state" value={props.visual.logoCandidate.status} />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Primary colors</h3>
          <VisualStateBadge available={props.visual.primaryColors.length > 0} availableLabel="Observed" />
          {props.visual.primaryColors.length === 0 ? <EmptyText>No canonical brand colors are persisted.</EmptyText> : (
            <div style={{ display: "grid", gap: 9 }}>
              {props.visual.primaryColors.map((color) => (
                <div key={`${color.label}:${color.value}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 34, height: 34, border: "1px solid #cbd5e1", borderRadius: 6, background: color.value }} />
                  <span style={{ overflowWrap: "anywhere" }}>{color.label}: {color.value} ({color.status})</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Typography candidates</h3>
          <VisualStateBadge available={props.visual.typographyCandidates.length > 0} availableLabel="Candidate" />
          {props.visual.typographyCandidates.length === 0 ? <EmptyText>No canonical typography candidates are persisted.</EmptyText> : (
            <div style={{ display: "grid", gap: 8 }}>
              {props.visual.typographyCandidates.map((font) => (
                <p key={`${font.family}:${font.source}`} style={{ margin: 0, overflowWrap: "anywhere" }}><strong>{font.family}</strong> - {font.source} ({font.status})</p>
              ))}
            </div>
          )}
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Imported images</h3>
          <VisualStateBadge available={props.visual.importedImages.length > 0} availableLabel="Observed" />
          <AssetList values={props.visual.importedImages.map((asset) => asset.filename)} empty="No imported image previews are available." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Imported icons</h3>
          <VisualStateBadge available={props.visual.importedIcons.length > 0} availableLabel="Observed" />
          <AssetList values={props.visual.importedIcons.map((asset) => asset.filename)} empty="No imported icons are currently classified." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Imported fonts</h3>
          <VisualStateBadge available={props.visual.importedFonts.length > 0} availableLabel="Candidate" />
          <AssetList values={props.visual.importedFonts.map((asset) => asset.filename)} empty="No imported fonts are currently classified." />
        </article>
      </div>
      {props.visual.unavailableReasons.length > 0 ? (
        <div style={{ ...quietCardStyle, marginTop: 12 }}>
          <strong>Why signals may be unavailable</strong>
          <AssetList values={props.visual.unavailableReasons} empty="All visual signals are available." />
        </div>
      ) : null}
    </section>
  );
}

function VisualStateBadge(props: { available: boolean; availableLabel: "Observed" | "Candidate" }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      <Badge tone={props.available ? "green" : "amber"}>{props.available ? props.availableLabel : "Unavailable"}</Badge>
      {props.available ? <Badge>Needs confirmation</Badge> : null}
    </div>
  );
}

function AssetList(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.5 }}>
      {props.values.slice(0, 8).map((value) => <li key={value} style={{ overflowWrap: "anywhere" }}>{value}</li>)}
    </ul>
  );
}

export function StoryTimeline(props: { steps: KnowledgeWorkspaceStoryStepProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Transformation Story" />
      <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
        {props.steps.map((step, index) => (
          <li key={step.label} style={quietCardStyle}>
            <p style={{ margin: 0, color: "#64748b", fontWeight: 900 }}>{index + 1}</p>
            <h3 style={{ margin: "7px 0 6px", fontSize: 18 }}>{step.label}</h3>
            <p style={{ margin: "0 0 10px", color: "#475569", lineHeight: 1.45 }}>{step.summary}</p>
            <ReadOnlyLink href={step.href}>Open supporting page</ReadOnlyLink>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GapCard(props: { gap: KnowledgeWorkspaceGapProjection }) {
  const urgent = props.gap.state === "critical" || props.gap.state === "missing";
  return (
    <article style={urgent ? { ...cardStyle, borderColor: "#f59e0b", background: "#fff7ed" } : cardStyle}>
      <h3 style={{ margin: 0 }}>{props.gap.label}</h3>
      <WorkspaceMetric label="state" value={props.gap.state} tone={urgent ? "warn" : "neutral"} />
      <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.5 }}>{props.gap.currentEvidence}</p>
      <p style={{ margin: "10px 0 0", color: "#9a3412", lineHeight: 1.45 }}><strong>Why it matters:</strong> {props.gap.whyItMatters}</p>
    </article>
  );
}

export function CurrentKnowledgeGaps(props: { gaps: KnowledgeWorkspaceGapProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Current Knowledge Gaps" />
      <div style={grid3Style}>
        {props.gaps.map((gap) => <GapCard key={gap.label} gap={gap} />)}
      </div>
    </section>
  );
}

export function HealthCard(props: { health: KnowledgeWorkspaceHealthProjection }) {
  return (
    <article style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{props.health.label}</h3>
      <WorkspaceMetric label="state" value={props.health.state} />
      <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.45 }}>{props.health.detail}</p>
    </article>
  );
}

export function WorkspaceHealth(props: { health: KnowledgeWorkspaceHealthProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Workspace Health">
        <p style={{ margin: 0 }}>Health uses existing runtime states and human-readable labels, not invented scores.</p>
      </SectionTitle>
      <div style={grid3Style}>
        {props.health.map((health) => <HealthCard key={health.label} health={health} />)}
      </div>
    </section>
  );
}

export function AdvancedDetails(props: { advanced: KnowledgeWorkspaceAdvancedProjection }) {
  return (
    <section style={sectionStyle}>
      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 900, fontSize: 18 }}>Advanced: artifact IDs, diagnostics, evidence counts, DryRun IDs, Generation IDs, and limitations</summary>
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <details style={quietCardStyle}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Artifact Explorer</summary>
            <div style={{ ...grid3Style, marginTop: 12 }}>
              {props.advanced.artifactExplorer.map((artifact, index) => (
                <div key={`${artifact.kind}:${artifact.artifactId ?? index}`} style={cardStyle}>
                  <strong>{artifact.label}</strong>
                  <p style={{ margin: "6px 0", color: "#475569", fontSize: 13 }}>{artifact.kind}</p>
                  <code style={{ display: "block", overflowWrap: "anywhere", whiteSpace: "normal", fontSize: 12 }}>{artifact.artifactId ?? "missing"}</code>
                  <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>{artifact.status ?? "status unavailable"}</p>
                </div>
              ))}
            </div>
          </details>
          <details style={quietCardStyle}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Diagnostics</summary>
            <AssetList values={props.advanced.diagnostics} empty="No diagnostics are available." />
          </details>
          <details style={quietCardStyle}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>IDs</summary>
            <div style={grid3Style}>
              <CodeField label="siteVersionId" value={props.advanced.siteVersionId} />
              <CodeField label="sourceSiteId" value={props.advanced.sourceSiteId} />
              <CodeField label="DryRun IDs" value={props.advanced.dryRunIds.join(", ") || "missing"} />
              <CodeField label="Generation IDs" value={props.advanced.generationIds.join(", ") || "missing"} />
            </div>
          </details>
          <details style={quietCardStyle}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Evidence counts</summary>
            <div style={grid3Style}>
              {props.advanced.evidenceCounts.map((item) => <WorkspaceMetric key={item.label} label={item.label} value={item.value} />)}
            </div>
          </details>
          <details style={quietCardStyle}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Limitations</summary>
            <AssetList values={props.advanced.limitations} empty="No limitations are available." />
          </details>
        </div>
      </details>
    </section>
  );
}

function CodeField(props: { label: string; value: string | null }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{props.label}</p>
      <code style={{ display: "block", marginTop: 6, whiteSpace: "normal", overflowWrap: "anywhere", fontSize: 12 }}>{props.value ?? "missing"}</code>
    </div>
  );
}

export function KnowledgeWorkspace(props: { model: KnowledgeWorkspaceProjection }) {
  return (
    <>
      <WorkspaceHero hero={props.model.hero} />
      <WebsiteVersions versions={props.model.versions} />
      <BusinessUnderstanding cards={props.model.businessUnderstanding} />
      <VisualIdentityCard visual={props.model.visualIdentity} />
      <CurrentKnowledgeGaps gaps={props.model.gaps} />
      <WorkspaceHealth health={props.model.health} />
      <StoryTimeline steps={props.model.transformationStory} />
      <AdvancedDetails advanced={props.model.advanced} />
    </>
  );
}
