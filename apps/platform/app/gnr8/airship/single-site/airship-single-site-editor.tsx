import React, { type ReactNode } from "react";

import type {
  AirshipSingleSiteEditorReadonlyProjection,
  AirshipSingleSiteImprovementDraft,
  AirshipSingleSiteRecommendationMaterial,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import type { SingleSiteStudioPreviewState } from "@/gnr8/single-site/single-site-studio-readonly-projection";

type Props = {
  model: AirshipSingleSiteEditorReadonlyProjection;
};

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function badge(value: string, tone: "good" | "warn" | "neutral" = "neutral") {
  const palette = {
    good: { border: "#86efac", background: "#f0fdf4", color: "#166534" },
    warn: { border: "#fbbf24", background: "#fffbeb", color: "#92400e" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        padding: "4px 8px",
        background: palette.background,
        color: palette.color,
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {labelize(value)}
    </span>
  );
}

function fact(label: string, value: ReactNode) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 850 }}>{label}</div>
      <div style={{ marginTop: 5, color: "#0f172a", fontSize: 15, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function section(title: string, children: ReactNode) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, color: "#0f172a", fontSize: 20, lineHeight: 1.2 }}>{title}</h2>
      {children}
    </section>
  );
}

function preview(previewState: Omit<SingleSiteStudioPreviewState, "label"> & { label: string }) {
  return (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{previewState.label}</h3>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 12, overflowWrap: "anywhere" }}>
            {previewState.siteVersionId ? `Runtime site version ${previewState.siteVersionId}` : "No runtime site version ref"}
          </div>
        </div>
        {badge(previewState.available ? "internal_preview" : "internal_preview_unavailable", previewState.available ? "good" : "warn")}
      </div>
      {previewState.available && previewState.route ? (
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#fff", minHeight: 360 }}>
          <iframe
            title={previewState.label}
            src={previewState.route}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            style={{ display: "block", width: "100%", height: 360, border: 0, background: "#fff" }}
          />
        </div>
      ) : (
        <div style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", padding: 12, color: "#92400e", fontSize: 13 }}>
          <strong>Internal preview unavailable.</strong> {previewState.unavailableReason}
        </div>
      )}
      <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>{previewState.authNote}</div>
    </div>
  );
}

function field(label: string, value: string, multiline = false) {
  return (
    <label style={{ display: "grid", gap: 5, minWidth: 0, color: "#475569", fontSize: 12, fontWeight: 850 }}>
      {label}
      {multiline ? (
        <textarea
          readOnly
          defaultValue={value}
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "9px 10px",
            color: "#0f172a",
            background: "#fff",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        />
      ) : (
        <input
          readOnly
          defaultValue={value}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "9px 10px",
            color: "#0f172a",
            background: "#fff",
            fontSize: 13,
          }}
        />
      )}
    </label>
  );
}

function draftRow(draft: AirshipSingleSiteImprovementDraft) {
  return (
    <article key={draft.id} style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
        <strong style={{ color: "#0f172a", fontSize: 14 }}>{draft.targetSectionPage}</strong>
        {badge(draft.status, draft.status === "accepted" ? "good" : draft.status === "rejected" ? "warn" : "neutral")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {field("Target section/page", draft.targetSectionPage)}
        {field("Status", draft.status)}
        {field("Current text/content summary", draft.currentTextContentSummary, true)}
        {field("Proposed text/content", draft.proposedTextContent, true)}
        {field("Reason for change", draft.reasonForChange, true)}
        {field("Preview impact", draft.previewImpact, true)}
      </div>
    </article>
  );
}

function recommendationRow(item: AirshipSingleSiteRecommendationMaterial) {
  return (
    <article key={item.id} style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
        <strong style={{ color: "#0f172a", fontSize: 14, lineHeight: 1.3 }}>{item.title}</strong>
        {badge(item.sourceStatus, item.sourceStatus === "applied" ? "good" : "warn")}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, overflowWrap: "anywhere" }}>{item.key}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {field("Target section/page", item.targetSectionPage)}
        {field("Current text/content summary", item.currentTextContentSummary, true)}
        {field("Proposed text/content", item.proposedTextContent, true)}
        {field("Reason for change", item.reasonForChange, true)}
        {field("Status", item.sourceStatus)}
        {field("Preview impact", item.previewImpact, true)}
      </div>
    </article>
  );
}

export function AirshipSingleSiteEditor({ model }: Props) {
  const improvementTone = model.aiImprovementStatus.deterministicEditableChangesGenerated ? "good" : "warn";

  return (
    <main style={{ display: "grid", gap: 22, padding: 20, color: "#0f172a", background: "#f8fafc", minHeight: "100vh" }}>
      <section style={{ display: "grid", gap: 16, border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Airship</div>
            <h1 style={{ margin: "4px 0 0", color: "#0f172a", fontSize: 30, lineHeight: 1.1 }}>chs.si single-site editor</h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={model.links.liveSite} target="_blank" rel="noreferrer" style={{ border: "1px solid #0f766e", borderRadius: 8, background: "#0f766e", color: "#fff", padding: "10px 13px", fontSize: 14, fontWeight: 900, textDecoration: "none" }}>
              Open live site
            </a>
            <a href={model.links.singleSiteStudio} style={{ border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#334155", padding: "10px 13px", fontSize: 14, fontWeight: 850, textDecoration: "none" }}>
              Open Single-Site Studio
            </a>
          </div>
        </div>

        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {fact("Imported site", model.importedSite)}
          {fact(
            "Source URL",
            <a href={model.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
              {model.sourceUrl}
            </a>,
          )}
          {fact("MVP status", badge(model.mvpStatus, "good"))}
          {fact("AI improvement status", badge(model.aiImprovementStatus.label, improvementTone))}
          {fact(
            "Live site link",
            <a href={model.liveSiteUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
              {model.liveSiteUrl}
            </a>,
          )}
          {fact("Migration", model.migrationId ?? "lookup required")}
        </dl>
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
          {model.aiImprovementStatus.detail}
        </div>
      </section>

      {section(
        "Previews",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
          {preview(model.previews.originalClone)}
          {preview({ ...model.previews.currentImprovedPublished, label: "Current improved/published preview" })}
        </div>,
      )}

      {section(
        model.draftPanel.title,
        <div style={{ display: "grid", gap: 12 }}>
          {model.draftPanel.drafts.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>{model.draftPanel.drafts.map(draftRow)}</div>
          ) : (
            <div style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", color: "#92400e", padding: 12, fontSize: 14, fontWeight: 850 }}>
              {model.draftPanel.emptyMessage}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" disabled style={{ border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#64748b", padding: "9px 12px", fontSize: 13, fontWeight: 850 }}>
              Accept draft
            </button>
            <button type="button" disabled style={{ border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#64748b", padding: "9px 12px", fontSize: 13, fontWeight: 850 }}>
              Reject draft
            </button>
            <button type="button" disabled style={{ border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#64748b", padding: "9px 12px", fontSize: 13, fontWeight: 850 }}>
              Save edit
            </button>
          </div>
        </div>,
      )}

      {section(
        "Recommendation source material",
        <div style={{ display: "grid", gap: 10 }}>
          {model.draftPanel.recommendationMaterial.map(recommendationRow)}
        </div>,
      )}
    </main>
  );
}
