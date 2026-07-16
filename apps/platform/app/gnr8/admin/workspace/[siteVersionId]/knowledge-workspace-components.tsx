import React, { type CSSProperties, type ReactNode } from "react";

import type {
  KnowledgeWorkspaceAdvancedProjection,
  KnowledgeWorkspaceContinuityItemProjection,
  KnowledgeWorkspaceContinuityProjection,
  KnowledgeWorkspaceGapProjection,
  KnowledgeWorkspaceHealthProjection,
  KnowledgeWorkspaceHeroProjection,
  KnowledgeWorkspaceKnowledgeCardProjection,
  KnowledgeWorkspaceNextActionProjection,
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

const storyPanelStyle: CSSProperties = {
  border: "1px solid #d8e2ec",
  borderRadius: 8,
  background: "#fbfcf8",
  padding: 16,
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

function textTone(value: string | number | null | undefined): "green" | "amber" | "blue" | "neutral" {
  const lower = format(value).toLowerCase();
  if (lower.includes("missing") || lower.includes("unknown") || lower.includes("partial") || lower.includes("unavailable") || lower.includes("not generated")) return "amber";
  if (lower.includes("ready") || lower.includes("understood") || lower.includes("available") || lower.includes("observed") || lower.includes("candidate")) return "green";
  if (lower.includes("latest") || lower.includes("improvement")) return "blue";
  return "neutral";
}

function compactUrl(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "not available";
  try {
    return new URL(normalized).hostname;
  } catch {
    return normalized;
  }
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
  const journey = [
    { label: "Original website", value: compactUrl(props.hero.originalWebsiteUrl), tone: "blue" as const },
    { label: "Imported", value: props.hero.importState, tone: textTone(props.hero.importState) },
    { label: "Understood", value: props.hero.overallUnderstandingState, tone: textTone(props.hero.overallUnderstandingState) },
    { label: "Improved", value: props.hero.currentEvolutionState, tone: textTone(props.hero.currentEvolutionState) },
    { label: "Next recommendation", value: props.hero.currentRecommendation, tone: "amber" as const },
  ];
  return (
    <section style={{ border: "1px solid #d7ddbf", borderRadius: 8, background: "#fbfcf8", padding: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 24, alignItems: "start" }}>
        <div>
          <p style={{ margin: "0 0 7px", color: "#64721f", fontWeight: 900 }}>Knowledge Workspace</p>
          <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.04 }}>{props.hero.businessName}</h1>
          <p style={{ margin: "12px 0 0", maxWidth: 820, color: "#334155", fontSize: 18, lineHeight: 1.55 }}>
            A read-only story of the imported website: what it looked like, what GNR8 found, what survives, how the proposal evolved, and what needs attention next.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 20 }}>
            <WorkspaceMetric label="Import" value={props.hero.importState} tone="good" />
            <WorkspaceMetric label="Understanding" value={props.hero.overallUnderstandingState} />
            <WorkspaceMetric label="Latest proposal" value={props.hero.latestProposalState} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {props.hero.unresolvedSignals.length === 0 ? <Badge tone="green">No unresolved product signals highlighted</Badge> : props.hero.unresolvedSignals.map((signal) => <Badge key={signal} tone="amber">{signal}</Badge>)}
          </div>
        </div>
        <div style={{ display: "grid", gap: 0, alignSelf: "stretch" }}>
          {journey.map((step, index) => (
            <div key={step.label} style={{ display: "grid", gridTemplateColumns: "34px minmax(0, 1fr)", gap: 10 }}>
              <div style={{ display: "grid", justifyItems: "center" }}>
                <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 999, background: index === journey.length - 1 ? "#fed7aa" : "#dbeafe", color: index === journey.length - 1 ? "#9a3412" : "#1d4ed8", fontWeight: 900 }}>{index + 1}</span>
                {index < journey.length - 1 ? <span style={{ width: 2, minHeight: 30, background: "#d7dee7", marginTop: 4, marginBottom: 4 }} /> : null}
              </div>
              <div style={{ ...storyPanelStyle, minHeight: 66, padding: "12px 14px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline", justifyContent: "space-between" }}>
                  <Badge tone={step.tone}>{step.label}</Badge>
                  <p style={{ margin: 0, color: index === journey.length - 1 ? "#9a3412" : "#172033", fontSize: 16, fontWeight: 850, lineHeight: 1.25, overflowWrap: "anywhere" }}>{step.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, paddingTop: 18, borderTop: "1px solid #dbeafe" }}>
        <ReadOnlyLink href={props.hero.links.originalWebsiteHref} external primary>Open Original Website</ReadOnlyLink>
        <ReadOnlyLink href={props.hero.links.latestProposalPreviewHref} primary>Open Latest Preview</ReadOnlyLink>
      </div>
    </section>
  );
}

function PreviewFrame(props: { version: KnowledgeWorkspaceVersionProjection }) {
  const openLabel = `Open ${props.version.label} preview`;
  if (props.version.previewImageHref) {
    const image = <img src={props.version.previewImageHref} alt={`${props.version.label} preview`} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", border: "1px solid #d7dee7", borderRadius: 8, background: "#f8fafc" }} />;
    return props.version.openPreviewHref ? <a href={props.version.openPreviewHref} target={props.version.kind === "original" ? "_blank" : undefined} rel={props.version.kind === "original" ? "noreferrer noopener" : undefined} aria-label={openLabel} style={{ display: "block" }}>{image}</a> : image;
  }
  if (props.version.kind === "generated" && props.version.previewHref) {
    return (
      <div style={{ position: "relative" }}>
        <iframe src={props.version.previewHref} title={`${props.version.label} preview`} style={{ width: "100%", aspectRatio: "16 / 9", border: "1px solid #d7dee7", borderRadius: 8, background: "#ffffff" }} />
        <a href={props.version.openPreviewHref ?? props.version.previewHref} aria-label={openLabel} style={{ position: "absolute", inset: 0, borderRadius: 8 }} />
      </div>
    );
  }
  return (
    <div style={{ display: "grid", placeItems: "center", width: "100%", aspectRatio: "16 / 9", border: "1px solid #d7dee7", borderRadius: 8, background: "#f8fafc", color: "#64748b", textAlign: "center", padding: 14 }}>
      {props.version.previewUnavailableReason ?? "Preview unavailable"}
    </div>
  );
}

export function VersionCard(props: { version: KnowledgeWorkspaceVersionProjection }) {
  const primary = props.version.emphasis === "primary";
  return (
    <article style={primary ? { ...cardStyle, borderColor: "#2563eb", boxShadow: "0 18px 36px rgba(37, 99, 235, 0.13)", padding: 20 } : props.version.kind === "future" ? quietCardStyle : cardStyle}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 18, alignItems: "start" }}>
        <PreviewFrame version={props.version} />
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {props.version.badges.map((badge) => (
              <Badge key={badge} tone={badge.includes("Latest") ? "blue" : badge.includes("Quarantined") ? "amber" : badge.includes("available") ? "green" : "neutral"}>{badge}</Badge>
            ))}
          </div>
          <h3 style={{ margin: "14px 0 10px", fontSize: primary ? 25 : 21 }}>{props.version.label}</h3>
          <div style={{ display: "grid", gap: 9 }}>
            <WorkspaceMetric label="Status" value={props.version.status} />
            <WorkspaceMetric label="Major improvement" value={props.version.majorImprovement} />
            <WorkspaceMetric label="Remaining limitation" value={props.version.majorLimitation} tone="warn" />
          </div>
          <div style={{ marginTop: 14 }}>
            <ReadOnlyLink href={props.version.openPreviewHref} external={props.version.kind === "original"} primary={primary}>Open Preview</ReadOnlyLink>
          </div>
        </div>
      </div>
    </article>
  );
}

export function WebsiteVersions(props: { versions: KnowledgeWorkspaceVersionProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle eyebrow="Visual center" title="Website Evolution">
        <p style={{ margin: 0 }}>The imported source and proposal iterations are shown as a read-only visual timeline. Each preview opens the full version in one click.</p>
      </SectionTitle>
      <ol style={{ display: "grid", gap: 16, margin: 0, padding: 0, listStyle: "none" }}>
        {props.versions.map((version, index) => (
          <li key={version.label} style={{ display: "grid", gridTemplateColumns: "42px minmax(0, 1fr)", gap: 12, alignItems: "stretch" }}>
            <div style={{ position: "relative", display: "grid", justifyItems: "center" }}>
              <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 8, background: version.emphasis === "primary" ? "#1d4ed8" : "#eef2f7", color: version.emphasis === "primary" ? "#ffffff" : "#334155", fontWeight: 900 }}>{index + 1}</span>
              {index < props.versions.length - 1 ? <span style={{ width: 2, minHeight: 28, flex: 1, background: "#d7dee7", marginTop: 8 }} /> : null}
            </div>
            <VersionCard version={version} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function StateBlock(props: { label: string; values: string[]; empty: string }) {
  return (
    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 9 }}>
      <strong style={{ display: "block", marginBottom: 6 }}>{props.label}</strong>
      {props.values.length === 0 ? <EmptyText>{props.empty}</EmptyText> : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {props.values.slice(0, 3).map((value) => <span key={value} style={{ border: "1px solid #d7dee7", borderRadius: 8, background: "#ffffff", padding: "6px 8px", color: "#334155", fontSize: 13, lineHeight: 1.35, overflowWrap: "anywhere" }}>{value}</span>)}
        </div>
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
      <SectionTitle title="What GNR8 Understands">
        <p style={{ margin: 0 }}>Short product signals only: known, unknown, and what still needs confirmation.</p>
      </SectionTitle>
      <div style={grid2Style}>
        {props.cards.map((card) => <KnowledgeCard key={card.label} card={card} />)}
      </div>
    </section>
  );
}

function ContinuityCard(props: { item: KnowledgeWorkspaceContinuityItemProjection }) {
  return (
    <article style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <h3 style={{ margin: 0, fontSize: 19 }}>{props.item.label}</h3>
        <Badge tone={props.item.state.includes("unavailable") || props.item.state.includes("unresolved") ? "amber" : "green"}>{props.item.state}</Badge>
      </div>
      {props.item.previewHref ? (
        <img src={props.item.previewHref} alt={`${props.item.label} preview`} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff", padding: 8, marginTop: 12 }} />
      ) : (
        <div style={{ display: "grid", placeItems: "center", width: "100%", aspectRatio: "4 / 3", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", color: "#64748b", textAlign: "center", padding: 12, marginTop: 12 }}>
          No preview in existing evidence
        </div>
      )}
      <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.5 }}>{props.item.detail}</p>
      {props.item.values.length > 0 ? (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "#475569", fontSize: 13, fontWeight: 800 }}>Show source notes</summary>
          <AssetList values={props.item.values} empty="No source material is available for this category." />
        </details>
      ) : null}
    </article>
  );
}

export function SourceContentVisualContinuity(props: { continuity: KnowledgeWorkspaceContinuityProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Source Content & Visual Continuity">
        <p style={{ margin: 0 }}>What appears to survive from the source website: identity, images, colors, type, navigation, CTA, and contact signals.</p>
      </SectionTitle>
      <div style={{ ...storyPanelStyle, marginBottom: 14 }}>
        <p style={{ margin: 0, color: "#334155", lineHeight: 1.55 }}>{props.continuity.summary}</p>
      </div>
      <div style={grid3Style}>
        {props.continuity.items.map((item) => <ContinuityCard key={item.label} item={item} />)}
      </div>
      <div style={{ marginTop: 12 }}>
        <ReadOnlyLink href={props.continuity.href}>Open Content & Visual Continuity</ReadOnlyLink>
      </div>
    </section>
  );
}

export function VisualIdentityCard(props: { visual: KnowledgeWorkspaceVisualIdentityProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Original Visual Signals">
        <p style={{ margin: 0 }}>Only existing persisted visual evidence is displayed. Missing previews are left empty rather than invented.</p>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 9 }}>
              {props.visual.primaryColors.map((color) => (
                <div key={`${color.label}:${color.value}`} style={{ border: "1px solid #d7dee7", borderRadius: 8, overflow: "hidden", background: "#ffffff" }}>
                  <span style={{ display: "block", height: 56, background: color.value }} />
                  <span style={{ display: "block", padding: 8, color: "#334155", fontSize: 13, overflowWrap: "anywhere" }}>{color.label}</span>
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
          <h3 style={{ marginTop: 0 }}>Representative images</h3>
          <VisualStateBadge available={props.visual.importedImages.length > 0} availableLabel="Observed" />
          <AssetPreviewGallery assets={props.visual.importedImages} empty="No representative image previews are available in existing evidence." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Imported icons</h3>
          <VisualStateBadge available={props.visual.importedIcons.length > 0} availableLabel="Observed" />
          <AssetPreviewGallery assets={props.visual.importedIcons} empty="No imported icon previews are currently classified." />
        </article>
        <article style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Imported fonts</h3>
          <VisualStateBadge available={props.visual.importedFonts.length > 0} availableLabel="Candidate" />
          <EmptyText>{props.visual.importedFonts.length > 0 ? "Font candidates exist in source evidence; font files stay in Advanced." : "No imported fonts are currently classified."}</EmptyText>
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

function AssetPreviewGallery(props: { assets: Array<{ filename: string; previewHref: string | null; type: string; dimensions: string | null }>; empty: string }) {
  const previews = props.assets.filter((asset) => Boolean(asset.previewHref)).slice(0, 6);
  if (previews.length === 0) return <EmptyText>{props.empty}</EmptyText>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
      {previews.map((asset) => (
        <figure key={`${asset.filename}:${asset.previewHref}`} style={{ margin: 0 }}>
          <img src={asset.previewHref ?? ""} alt={asset.type} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff" }} />
          <figcaption style={{ marginTop: 5, color: "#64748b", fontSize: 12 }}>{asset.dimensions ?? asset.type}</figcaption>
        </figure>
      ))}
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
      <SectionTitle title="Supporting Inspection Pages">
        <p style={{ margin: 0 }}>Business Foundation, Website Understanding, Source Content & Visual Continuity, and Generation Evolution remain available as supporting inspection pages. Knowledge Workspace is the primary product view.</p>
      </SectionTitle>
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

export function NextRecommendedAction(props: { actions: KnowledgeWorkspaceNextActionProjection[] }) {
  const [primaryAction, ...secondaryActions] = props.actions;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Next Recommended Action">
        <p style={{ margin: 0 }}>The current next step is emphasized first. Everything here is guidance only.</p>
      </SectionTitle>
      {primaryAction ? (
        <article style={{ ...cardStyle, borderColor: "#f59e0b", background: "#fffaf0", padding: 22 }}>
          <Badge tone="amber">Current next step</Badge>
          <h3 style={{ margin: "12px 0 7px", fontSize: 26, lineHeight: 1.15 }}>{primaryAction.label}</h3>
          <p style={{ margin: 0, color: "#334155", fontSize: 17, lineHeight: 1.5 }}>{primaryAction.reason}</p>
          <div style={{ marginTop: 14 }}>
            {primaryAction.targetHref ? <ReadOnlyLink href={primaryAction.targetHref} primary>Inspect Evidence</ReadOnlyLink> : <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>Guidance only</span>}
          </div>
        </article>
      ) : null}
      {secondaryActions.length > 0 ? (
        <ol style={{ display: "grid", gap: 8, margin: "12px 0 0", padding: 0, listStyle: "none" }}>
          {secondaryActions.map((action, index) => (
            <li key={action.label} style={{ ...quietCardStyle, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: "#eef2f7", color: "#475569", fontWeight: 900 }}>{index + 2}</span>
              <div style={{ flex: "1 1 260px" }}>
                <h3 style={{ margin: 0, fontSize: 17 }}>{action.label}</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", lineHeight: 1.4 }}>{action.reason}</p>
              </div>
              {action.targetHref ? <ReadOnlyLink href={action.targetHref}>Inspect</ReadOnlyLink> : <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>Guidance only</span>}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function GapCard(props: { gap: KnowledgeWorkspaceGapProjection }) {
  const urgent = props.gap.state === "critical" || props.gap.state === "missing";
  return (
    <article style={urgent ? { ...cardStyle, borderColor: "#f59e0b", background: "#fff7ed" } : cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <h3 style={{ margin: 0 }}>{props.gap.label}</h3>
        <Badge tone={urgent ? "amber" : "neutral"}>{props.gap.state}</Badge>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <GapFact label="Why it matters" value={props.gap.whyItMatters} />
        <GapFact label="Confirmation unlocks" value={props.gap.afterConfirmation} />
        <GapFact label="Expected impact" value={props.gap.currentEvidence} muted />
      </div>
    </article>
  );
}

function GapFact(props: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ borderTop: "1px solid rgba(148, 163, 184, 0.35)", paddingTop: 8 }}>
      <p style={{ margin: 0, color: props.muted ? "#64748b" : "#9a3412", fontSize: 12, fontWeight: 900 }}>{props.label}</p>
      <p style={{ margin: "3px 0 0", color: "#334155", lineHeight: 1.4 }}>{props.value}</p>
    </div>
  );
}

export function CurrentKnowledgeGaps(props: { gaps: KnowledgeWorkspaceGapProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Knowledge Gaps">
        <p style={{ margin: 0 }}>Only unresolved product knowledge is shown here, ranked by likely impact on the next proposal.</p>
      </SectionTitle>
      {props.gaps.length === 0 ? (
        <div style={quietCardStyle}><EmptyText>No meaningful missing knowledge is currently highlighted.</EmptyText></div>
      ) : (
        <div style={grid3Style}>
          {props.gaps.map((gap) => <GapCard key={gap.label} gap={gap} />)}
        </div>
      )}
    </section>
  );
}

export function KnowledgeProgressCard(props: { health: KnowledgeWorkspaceHealthProjection }) {
  const tone = textTone(props.health.state);
  return (
    <article style={storyPanelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <h3 style={{ margin: 0 }}>{props.health.label}</h3>
        <Badge tone={tone}>{props.health.state}</Badge>
      </div>
      <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.45 }}>{props.health.detail}</p>
    </article>
  );
}

export function KnowledgeProgress(props: { health: KnowledgeWorkspaceHealthProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Knowledge Progress">
        <p style={{ margin: 0 }}>Deterministic readiness states from the existing evidence. No percentages, scores, or inferred precision.</p>
      </SectionTitle>
      <div style={grid3Style}>
        {props.health.map((health) => <KnowledgeProgressCard key={health.label} health={health} />)}
      </div>
    </section>
  );
}

export function AdvancedDetails(props: { advanced: KnowledgeWorkspaceAdvancedProjection }) {
  return (
    <section style={sectionStyle}>
      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 900, fontSize: 18 }}>Advanced: artifact IDs, diagnostics, evidence counts, DryRun IDs, Generation IDs, raw lineage, and limitations</summary>
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
      <KnowledgeProgress health={props.model.health} />
      <BusinessUnderstanding cards={props.model.businessUnderstanding} />
      <VisualIdentityCard visual={props.model.visualIdentity} />
      <SourceContentVisualContinuity continuity={props.model.continuity} />
      <CurrentKnowledgeGaps gaps={props.model.gaps} />
      <NextRecommendedAction actions={props.model.nextActions} />
      <StoryTimeline steps={props.model.transformationStory} />
      <AdvancedDetails advanced={props.model.advanced} />
    </>
  );
}
