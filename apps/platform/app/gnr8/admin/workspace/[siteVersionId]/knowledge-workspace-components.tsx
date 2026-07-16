import React, { type CSSProperties, type ReactNode } from "react";

import type {
  KnowledgeWorkspaceAdvancedProjection,
  KnowledgeWorkspaceGapProjection,
  KnowledgeWorkspaceHealthProjection,
  KnowledgeWorkspaceHeroProjection,
  KnowledgeWorkspaceKnownUnknownProjection,
  KnowledgeWorkspaceNextActionProjection,
  KnowledgeWorkspaceProjection,
  KnowledgeWorkspaceRecognizableProjection,
  KnowledgeWorkspaceStoryStepProjection,
  KnowledgeWorkspaceVersionProjection,
  KnowledgeWorkspaceVisualPreviewProjection,
} from "@/gnr8/architecture/knowledge-workspace-projection";

const sectionStyle: CSSProperties = { marginTop: 30 };
const panelStyle: CSSProperties = { border: "1px solid #d8e2ec", borderRadius: 8, background: "#ffffff" };
const quietPanelStyle: CSSProperties = { ...panelStyle, background: "#f8fafc" };
const linkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  border: "1px solid #1d4ed8",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 850,
  textDecoration: "none",
};

function format(value: string | number | null | undefined) {
  return String(value ?? "not available").replaceAll("_", " ");
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

function toneFor(value: string | number | null | undefined): "blue" | "green" | "amber" | "neutral" {
  const lower = format(value).toLowerCase();
  if (lower.includes("non compliant") || lower.includes("missing") || lower.includes("unresolved") || lower.includes("unavailable") || lower.includes("not ready")) return "amber";
  if (lower.includes("meaningful") || lower.includes("latest") || lower.includes("preview")) return "blue";
  if (lower.includes("observed") || lower.includes("available") || lower.includes("ready") || lower.includes("candidate")) return "green";
  return "neutral";
}

function Badge(props: { children: ReactNode; tone?: "blue" | "green" | "amber" | "neutral" }) {
  const tone = props.tone ?? "neutral";
  const colors = {
    blue: { border: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" },
    green: { border: "#bbf7d0", background: "#f0fdf4", color: "#166534" },
    amber: { border: "#fed7aa", background: "#fff7ed", color: "#9a3412" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", minHeight: 25, border: `1px solid ${colors.border}`, borderRadius: 999, background: colors.background, color: colors.color, padding: "3px 9px", fontSize: 12, fontWeight: 850, lineHeight: 1.2 }}>
      {props.children}
    </span>
  );
}

function ReadOnlyLink(props: { href: string | null; children: ReactNode; primary?: boolean; external?: boolean }) {
  if (!props.href) {
    return <span style={{ ...linkStyle, borderColor: "#cbd5e1", background: "#f8fafc", color: "#64748b" }}>{props.children}</span>;
  }
  return (
    <a
      href={props.href}
      target={props.external ? "_blank" : undefined}
      rel={props.external ? "noreferrer noopener" : undefined}
      style={props.primary ? { ...linkStyle, background: "#1d4ed8", color: "#ffffff" } : linkStyle}
    >
      {props.children}
    </a>
  );
}

function SectionTitle(props: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {props.eyebrow ? <p style={{ margin: "0 0 4px", color: "#1d4ed8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{props.eyebrow}</p> : null}
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>{props.title}</h2>
      {props.children ? <div style={{ marginTop: 6, color: "#475569", lineHeight: 1.5 }}>{props.children}</div> : null}
    </div>
  );
}

function EmptyState(props: { children: ReactNode }) {
  return <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.45 }}>{props.children}</p>;
}

function StatePill(props: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ ...quietPanelStyle, padding: 12 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12, fontWeight: 800 }}>{props.label}</p>
      <p style={{ margin: "5px 0 0", color: "#172033", fontSize: 16, fontWeight: 850, lineHeight: 1.25, overflowWrap: "anywhere" }}>{format(props.value)}</p>
    </div>
  );
}

function PreviewSurface(props: { preview: KnowledgeWorkspaceVisualPreviewProjection; compact?: boolean }) {
  const aspectRatio = props.compact ? "16 / 10" : "16 / 9";
  if (props.preview.imageHref) {
    return (
      <img
        src={props.preview.imageHref}
        alt={props.preview.altText}
        style={{ display: "block", width: "100%", aspectRatio, objectFit: "cover", border: "1px solid #d7dee7", borderRadius: 8, background: "#f8fafc" }}
      />
    );
  }
  if (props.preview.kind === "live_generated_proposal_preview" && props.preview.href) {
    return (
      <div style={{ position: "relative", aspectRatio, border: "1px solid #d7dee7", borderRadius: 8, overflow: "hidden", background: "#ffffff" }}>
        <iframe src={props.preview.href} title={props.preview.altText} style={{ display: "block", width: "100%", height: "100%", border: 0, background: "#ffffff" }} />
        <a href={props.preview.href} aria-label={`Open ${props.preview.title}`} style={{ position: "absolute", inset: 0 }} />
      </div>
    );
  }
  return (
    <div style={{ display: "grid", placeItems: "center", width: "100%", aspectRatio, border: "1px solid #d7dee7", borderRadius: 8, background: "#f8fafc", color: "#64748b", textAlign: "center", padding: 18 }}>
      <span style={{ maxWidth: 360, lineHeight: 1.45 }}>{props.preview.unavailableReason ?? props.preview.label}</span>
    </div>
  );
}

function VisualPreviewPanel(props: { preview: KnowledgeWorkspaceVisualPreviewProjection; primary?: boolean }) {
  return (
    <article style={{ ...panelStyle, padding: 14, borderColor: props.primary ? "#2563eb" : "#d8e2ec", boxShadow: props.primary ? "0 18px 38px rgba(37, 99, 235, 0.15)" : undefined }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div>
          <p style={{ margin: 0, color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{props.preview.label}</p>
          <h2 style={{ margin: "3px 0 0", fontSize: 24, lineHeight: 1.1 }}>{props.preview.title}</h2>
        </div>
        <Badge tone={toneFor(props.preview.kind)}>{format(props.preview.kind)}</Badge>
      </div>
      <PreviewSurface preview={props.preview} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
        {props.preview.badges.map((badge) => <Badge key={badge} tone={toneFor(badge)}>{badge}</Badge>)}
      </div>
      <div style={{ marginTop: 12 }}>
        <ReadOnlyLink href={props.preview.href} primary={props.primary} external={props.preview.title === "Original Website"}>
          {props.preview.title === "Original Website" ? "Open Original Website" : "Open Latest Preview"}
        </ReadOnlyLink>
      </div>
    </article>
  );
}

export function OriginalLatestComparison(props: { hero: KnowledgeWorkspaceHeroProjection }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 500px), 1fr))", gap: 16, marginTop: 20 }}>
      <VisualPreviewPanel preview={props.hero.originalVisual} />
      <VisualPreviewPanel preview={props.hero.latestPreview} primary />
    </div>
  );
}

export function WorkspaceCommandHero(props: { hero: KnowledgeWorkspaceHeroProjection }) {
  return (
    <section style={{ ...panelStyle, padding: 24, background: "#fbfcf8", borderColor: "#d7ddbf" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(340px, 0.75fr)", gap: 18, alignItems: "start" }}>
        <div>
          <p style={{ margin: "0 0 6px", color: "#64721f", fontWeight: 900 }}>Knowledge Workspace</p>
          <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.04 }}>{props.hero.businessName}</h1>
          <p style={{ margin: "10px 0 0", color: "#334155", fontSize: 16, lineHeight: 1.55 }}>
            {props.hero.overallInterpretation}
          </p>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <StatePill label="Original website" value={compactUrl(props.hero.originalWebsiteUrl)} />
          <StatePill label="Cycle" value={props.hero.currentGenerationCycle} />
          <StatePill label="Current recommendation" value={props.hero.overallRecommendation} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 16 }}>
        <StatePill label="Latest iteration" value={`Iteration ${props.hero.currentIteration}`} />
        <StatePill label="Proposal state" value={props.hero.latestProposalState} />
        <StatePill label="Evolution" value={props.hero.currentEvolutionState} />
        <StatePill label="Compliance" value={props.hero.currentComplianceState} />
      </div>
      <OriginalLatestComparison hero={props.hero} />
    </section>
  );
}

function VersionPreview(props: { version: KnowledgeWorkspaceVersionProjection }) {
  const preview: KnowledgeWorkspaceVisualPreviewProjection = {
    title: props.version.label,
    kind: props.version.previewKind,
    label: props.version.previewLabel,
    href: props.version.openPreviewHref ?? props.version.previewHref,
    imageHref: props.version.previewImageHref,
    unavailableReason: props.version.previewUnavailableReason,
    altText: `${props.version.label} ${props.version.previewLabel}`,
    badges: props.version.badges,
  };
  return <PreviewSurface preview={preview} compact={props.version.kind === "future"} />;
}

function EvolutionTransition(props: { text: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px minmax(0, 1fr)", gap: 10, alignItems: "center", margin: "6px 0" }}>
      <div style={{ display: "grid", justifyItems: "center" }}>
        <span aria-hidden="true" style={{ width: 2, height: 28, background: "#cbd5e1" }} />
      </div>
      <p style={{ margin: 0, color: "#475569", fontWeight: 750, lineHeight: 1.4 }}>{props.text}</p>
    </div>
  );
}

function VersionTimelineItem(props: { version: KnowledgeWorkspaceVersionProjection; index: number }) {
  const latest = props.version.emphasis === "primary";
  const future = props.version.kind === "future";
  return (
    <article style={{ ...panelStyle, padding: future ? 14 : 18, borderColor: latest ? "#2563eb" : "#d8e2ec", background: future ? "#f8fafc" : "#ffffff", boxShadow: latest ? "0 18px 36px rgba(37, 99, 235, 0.13)" : undefined }}>
      <div style={{ display: "grid", gridTemplateColumns: future ? "minmax(0, 0.7fr) minmax(260px, 1fr)" : "minmax(360px, 0.9fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <VersionPreview version={props.version} />
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            <Badge tone={latest ? "blue" : future ? "neutral" : "green"}>{future ? "Future step" : latest ? "Latest iteration" : "Historical iteration"}</Badge>
            <Badge tone={toneFor(props.version.quarantineState)}>{props.version.quarantineState}</Badge>
            {props.version.badges.slice(0, 4).map((badge) => <Badge key={badge} tone={toneFor(badge)}>{badge}</Badge>)}
          </div>
          <h3 style={{ margin: "12px 0 10px", fontSize: latest ? 27 : future ? 20 : 23, lineHeight: 1.1 }}>{props.version.label}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 9 }}>
            <StatePill label="State" value={props.version.status} />
            <StatePill label="Primary improvement" value={props.version.majorImprovement} />
            <StatePill label="Remaining limitation" value={props.version.majorLimitation} />
            <StatePill label="Compliance" value={props.version.badges.find((badge) => badge.includes("compliant")) ?? "not available"} />
          </div>
          <div style={{ marginTop: 12 }}>
            <ReadOnlyLink href={props.version.openPreviewHref} primary={latest} external={props.version.kind === "original"}>Open Preview</ReadOnlyLink>
          </div>
        </div>
      </div>
    </article>
  );
}

export function WebsiteEvolutionTimeline(props: { versions: KnowledgeWorkspaceVersionProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle eyebrow="Evolution" title="Website Evolution">
        <p style={{ margin: 0 }}>Original Website to Iteration 1 to Iteration 2 to Future. Iteration 2 is the latest quarantined generated proposal.</p>
      </SectionTitle>
      <ol style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
        {props.versions.map((version, index) => (
          <li key={version.label}>
            {version.transitionFromPrevious ? <EvolutionTransition text={version.transitionFromPrevious} /> : null}
            <VersionTimelineItem version={version} index={index} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function SummaryItem(props: { label: string; state: string; detail: string }) {
  return (
    <li style={{ ...quietPanelStyle, padding: 12, listStyle: "none" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>{props.label}</h3>
        <Badge tone={toneFor(props.state)}>{props.state}</Badge>
      </div>
      <p style={{ margin: "7px 0 0", color: "#475569", lineHeight: 1.45 }}>{props.detail}</p>
    </li>
  );
}

export function KnownUnknownSummary(props: { summary: KnowledgeWorkspaceKnownUnknownProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="What GNR8 Understands">
        <p style={{ margin: 0 }}>Known or observed signals are separated from the items that need confirmation before the next generation.</p>
      </SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))", gap: 14 }}>
        <div style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>Known Or Observed</h3>
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
            {props.summary.knownObserved.map((item) => <SummaryItem key={item.label} {...item} />)}
          </ul>
        </div>
        <div style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>Needs Confirmation</h3>
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
            {props.summary.needsConfirmation.map((item) => <SummaryItem key={item.label} {...item} />)}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ColorSignalSwatches(props: { colors: KnowledgeWorkspaceRecognizableProjection["colorSignals"] }) {
  if (props.colors.length === 0) return <EmptyState>No observed color signals are available.</EmptyState>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 9 }}>
      {props.colors.map((color) => (
        <div key={`${color.value}:${color.role}`} style={{ border: "1px solid #d7dee7", borderRadius: 8, overflow: "hidden", background: "#ffffff" }}>
          <span aria-label={`Observed color signal ${color.value}`} style={{ display: "block", height: 54, background: color.value }} />
          <div style={{ padding: 8 }}>
            <strong style={{ display: "block", overflowWrap: "anywhere" }}>{color.value}</strong>
            <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 3 }}>{color.role}</span>
            <span style={{ display: "block", color: "#64748b", fontSize: 12 }}>{color.state}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TypographySummary(props: { fonts: KnowledgeWorkspaceRecognizableProjection["typographySummary"] }) {
  if (props.fonts.length === 0) return <EmptyState>No typography candidates are available.</EmptyState>;
  return (
    <ul style={{ display: "grid", gap: 7, margin: 0, padding: 0 }}>
      {props.fonts.map((font) => (
        <li key={`${font.family}:${font.role}`} style={{ ...quietPanelStyle, padding: 10, listStyle: "none" }}>
          <strong>{font.family}</strong>
          <span style={{ color: "#475569" }}> - {font.role}</span>
          <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 2 }}>{font.state}</span>
        </li>
      ))}
    </ul>
  );
}

export function RepresentativeImageGallery(props: { images: KnowledgeWorkspaceRecognizableProjection["representativeImages"] }) {
  const images = props.images.slice(0, 6);
  if (images.length === 0) return <EmptyState>No representative imported image preview is safely available.</EmptyState>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 10 }}>
      {images.map((image) => (
        <figure key={`${image.previewHref}:${image.label}`} style={{ margin: 0 }}>
          <img src={image.previewHref} alt={image.altText} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", border: "1px solid #d7dee7", borderRadius: 8, background: "#f8fafc" }} />
          <figcaption style={{ marginTop: 5, color: "#475569", fontSize: 12 }}>{image.label} - {image.state}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function TextChips(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyState>{props.empty}</EmptyState>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {props.values.map((value) => <span key={value} style={{ border: "1px solid #d7dee7", borderRadius: 8, background: "#ffffff", padding: "6px 8px", color: "#334155", fontSize: 13 }}>{value}</span>)}
    </div>
  );
}

export function ContinuityShowcase(props: { recognizable: KnowledgeWorkspaceRecognizableProjection }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="What Will Remain Recognizable">
        <p style={{ margin: 0 }}>{props.recognizable.summary}</p>
      </SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 0.75fr) minmax(0, 1.25fr)", gap: 14, alignItems: "start" }}>
        <article style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>Candidate logo - confirmation required</h3>
          {props.recognizable.logoCandidate.previewHref ? (
            <img src={props.recognizable.logoCandidate.previewHref} alt="Candidate logo preview requiring confirmation" style={{ display: "block", maxWidth: "100%", maxHeight: 170, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff", padding: 10 }} />
          ) : <EmptyState>{props.recognizable.logoCandidate.unavailableReason ?? "No logo candidate preview is available."}</EmptyState>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            <Badge tone="amber">{props.recognizable.logoCandidate.confirmationRequirement}</Badge>
            <Badge>{props.recognizable.logoCandidate.confidence}</Badge>
          </div>
        </article>
        <article style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>Representative imported images</h3>
          <RepresentativeImageGallery images={props.recognizable.representativeImages} />
        </article>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 14 }}>
        <article style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Observed color signals</h3>
          <ColorSignalSwatches colors={props.recognizable.colorSignals} />
        </article>
        <article style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Typography candidates</h3>
          <TypographySummary fonts={props.recognizable.typographySummary} />
        </article>
        <article style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Site elements</h3>
          <h4 style={{ margin: "0 0 6px" }}>Navigation</h4>
          <TextChips values={props.recognizable.navigationLabels} empty="Navigation labels are unavailable." />
          <h4 style={{ margin: "12px 0 6px" }}>CTA</h4>
          <TextChips values={props.recognizable.ctaLabels} empty="CTA signal unavailable." />
          <h4 style={{ margin: "12px 0 6px" }}>Contact</h4>
          <TextChips values={props.recognizable.contactSignals} empty="Contact detail unavailable or unresolved." />
        </article>
        <article style={{ ...panelStyle, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Content and layout continuity</h3>
          <TextChips values={[...props.recognizable.keyContent, ...props.recognizable.layoutContinuity].slice(0, 10)} empty="No content or layout continuity signals are available." />
        </article>
      </div>
      <div style={{ marginTop: 12 }}>
        <ReadOnlyLink href={props.recognizable.href}>Open Content & Visual Continuity</ReadOnlyLink>
      </div>
    </section>
  );
}

export function KnowledgeProgressRail(props: { health: KnowledgeWorkspaceHealthProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Knowledge Progress">
        <p style={{ margin: 0 }}>Readiness states from existing evidence only.</p>
      </SectionTitle>
      <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
        {props.health.map((health, index) => (
          <li key={health.label} style={{ ...quietPanelStyle, padding: 12 }}>
            <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, background: "#eef2f7", color: "#475569", fontWeight: 900 }}>{index + 1}</span>
            <h3 style={{ margin: "9px 0 5px", fontSize: 16 }}>{health.label}</h3>
            <Badge tone={toneFor(health.state)}>{health.state}</Badge>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.4 }}>{health.detail}</p>
          </li>
        ))}
      </ol>
      <div style={{ ...quietPanelStyle, marginTop: 10, padding: 12 }}>
        <strong>The latest proposal is better than the previous proposal, but it still does not satisfy the generation contract.</strong>
        <p style={{ margin: "5px 0 0", color: "#475569" }}>It is ready for focused improvement, not approval or publishing.</p>
      </div>
    </section>
  );
}

function GapCard(props: { gap: KnowledgeWorkspaceGapProjection }) {
  return (
    <article style={{ ...quietPanelStyle, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 17 }}>{props.gap.label}</h4>
        <Badge tone={toneFor(props.gap.state)}>{props.gap.state}</Badge>
      </div>
      <p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.4 }}><strong>Why it matters:</strong> {props.gap.whyItMatters}</p>
      <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.4 }}><strong>Confirmation unlocks:</strong> {props.gap.afterConfirmation}</p>
    </article>
  );
}

export function PrioritizedGapGroup(props: { title: string; gaps: KnowledgeWorkspaceGapProjection[] }) {
  if (props.gaps.length === 0) return null;
  return (
    <div style={{ ...panelStyle, padding: 16 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>{props.title}</h3>
      <div style={{ display: "grid", gap: 9 }}>
        {props.gaps.map((gap) => <GapCard key={gap.label} gap={gap} />)}
      </div>
    </div>
  );
}

export function KnowledgeGaps(props: { gaps: KnowledgeWorkspaceGapProjection[] }) {
  const critical = props.gaps.filter((gap) => gap.group === "critical_before_next_generation").slice(0, 2);
  const recognizable = props.gaps.filter((gap) => gap.group === "important_for_recognizability").slice(0, 3);
  const future = props.gaps.filter((gap) => gap.group === "future_enrichment").slice(0, 2);
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Knowledge Gaps">
        <p style={{ margin: 0 }}>Only the highest-impact unresolved knowledge stays in the primary flow.</p>
      </SectionTitle>
      {props.gaps.length === 0 ? <div style={{ ...quietPanelStyle, padding: 14 }}><EmptyState>No high-impact gap is currently highlighted.</EmptyState></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <PrioritizedGapGroup title="Critical Before Next Generation" gaps={critical} />
          <PrioritizedGapGroup title="Important For Recognizability" gaps={recognizable} />
          <PrioritizedGapGroup title="Future Enrichment" gaps={future} />
        </div>
      )}
    </section>
  );
}

export function PrimaryRecommendation(props: { actions: KnowledgeWorkspaceNextActionProjection[] }) {
  const [primary, ...remaining] = props.actions;
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Next Recommended Action">
        <p style={{ margin: 0 }}>One current recommendation is primary. The Workspace remains read-only.</p>
      </SectionTitle>
      {primary ? (
        <article style={{ ...panelStyle, borderColor: "#f59e0b", background: "#fffaf0", padding: 20 }}>
          <Badge tone="amber">Current next step</Badge>
          <h3 style={{ margin: "11px 0 7px", fontSize: 28, lineHeight: 1.1 }}>{primary.label}</h3>
          <p style={{ margin: 0, color: "#334155", fontSize: 16, lineHeight: 1.5 }}>{primary.reason}</p>
          <div style={{ marginTop: 13 }}>
            {primary.targetHref ? <ReadOnlyLink href={primary.targetHref} primary>Inspect Evidence</ReadOnlyLink> : <span style={{ color: "#64748b", fontWeight: 800 }}>Future step</span>}
          </div>
        </article>
      ) : null}
      {remaining.length > 0 ? (
        <ol style={{ display: "grid", gap: 8, margin: "10px 0 0", padding: 0, listStyle: "none" }}>
          {remaining.map((action, index) => (
            <li key={action.label} style={{ ...quietPanelStyle, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: 12 }}>
              <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: "#eef2f7", color: "#475569", fontWeight: 900 }}>{index + 2}</span>
              <div style={{ flex: "1 1 280px" }}>
                <h3 style={{ margin: 0, fontSize: 17 }}>{action.label}</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", lineHeight: 1.4 }}>{action.reason}</p>
              </div>
              {action.targetHref ? <ReadOnlyLink href={action.targetHref}>Inspect</ReadOnlyLink> : <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>Future step</span>}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function SupportingInspectionLinks(props: { steps: KnowledgeWorkspaceStoryStepProjection[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle title="Supporting Inspection Pages">
        <p style={{ margin: 0 }}>These pages remain secondary inspection views for the same persisted truth.</p>
      </SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
        {props.steps.map((step) => (
          <article key={step.label} style={{ ...quietPanelStyle, padding: 14 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>{step.label}</h3>
            <p style={{ margin: "0 0 10px", color: "#475569", lineHeight: 1.4 }}>{step.summary}</p>
            <ReadOnlyLink href={step.href}>Open supporting page</ReadOnlyLink>
          </article>
        ))}
      </div>
    </section>
  );
}

function TextList(props: { values: string[]; empty: string }) {
  if (props.values.length === 0) return <EmptyState>{props.empty}</EmptyState>;
  return (
    <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.45 }}>
      {props.values.slice(0, 10).map((value) => <li key={value} style={{ overflowWrap: "anywhere" }}>{value}</li>)}
    </ul>
  );
}

function CodeField(props: { label: string; value: string | null }) {
  return (
    <div style={{ ...quietPanelStyle, padding: 10 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>{props.label}</p>
      <code style={{ display: "block", marginTop: 5, whiteSpace: "normal", overflowWrap: "anywhere", fontSize: 12 }}>{props.value ?? "missing"}</code>
    </div>
  );
}

export function WorkspaceAdvancedDetails(props: { advanced: KnowledgeWorkspaceAdvancedProjection }) {
  return (
    <section style={sectionStyle}>
      <details style={{ ...panelStyle, padding: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 900, fontSize: 18 }}>Advanced</summary>
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <details style={{ ...quietPanelStyle, padding: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 850 }}>Artifact IDs and lineage</summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginTop: 10 }}>
              <CodeField label="siteVersionId" value={props.advanced.siteVersionId} />
              <CodeField label="sourceSiteId" value={props.advanced.sourceSiteId} />
              <CodeField label="DryRun IDs" value={props.advanced.dryRunIds.join(", ") || "missing"} />
              <CodeField label="Generation IDs" value={props.advanced.generationIds.join(", ") || "missing"} />
            </div>
          </details>
          <details style={{ ...quietPanelStyle, padding: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 850 }}>Artifact Explorer</summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginTop: 10 }}>
              {props.advanced.artifactExplorer.map((artifact, index) => (
                <div key={`${artifact.kind}:${artifact.artifactId ?? index}`} style={{ ...panelStyle, padding: 10 }}>
                  <strong>{artifact.label}</strong>
                  <p style={{ margin: "5px 0", color: "#475569", fontSize: 13 }}>{artifact.kind}</p>
                  <code style={{ display: "block", overflowWrap: "anywhere", whiteSpace: "normal", fontSize: 12 }}>{artifact.artifactId ?? "missing"}</code>
                  <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12 }}>{artifact.status ?? "status unavailable"}</p>
                </div>
              ))}
            </div>
          </details>
          <details style={{ ...quietPanelStyle, padding: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 850 }}>Diagnostics</summary>
            <TextList values={props.advanced.diagnostics} empty="No diagnostics are available." />
          </details>
          <details style={{ ...quietPanelStyle, padding: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 850 }}>Evidence counts</summary>
            <TextList values={props.advanced.evidenceCounts.map((item) => `${item.label}: ${item.value}`)} empty="No evidence counts are available." />
          </details>
          <details style={{ ...quietPanelStyle, padding: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 850 }}>Raw limitations</summary>
            <TextList values={props.advanced.limitations} empty="No limitations are available." />
          </details>
        </div>
      </details>
    </section>
  );
}

export function KnowledgeWorkspace(props: { model: KnowledgeWorkspaceProjection }) {
  return (
    <>
      <WorkspaceCommandHero hero={props.model.hero} />
      <WebsiteEvolutionTimeline versions={props.model.versions} />
      <KnownUnknownSummary summary={props.model.businessUnderstanding} />
      <ContinuityShowcase recognizable={props.model.recognizable} />
      <KnowledgeProgressRail health={props.model.health} />
      <KnowledgeGaps gaps={props.model.gaps} />
      <PrimaryRecommendation actions={props.model.nextActions} />
      <SupportingInspectionLinks steps={props.model.transformationStory} />
      <WorkspaceAdvancedDetails advanced={props.model.advanced} />
    </>
  );
}
