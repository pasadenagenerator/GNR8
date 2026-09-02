"use client";

import React, { useMemo, useState, type CSSProperties, type ChangeEvent } from "react";

import type {
  AirshipSingleSiteDraftPreview,
  AirshipSingleSiteImprovementDraft,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

type Props = {
  drafts: AirshipSingleSiteImprovementDraft[];
  draftPreview: AirshipSingleSiteDraftPreview;
  controlNote: string;
};

export type AirshipSingleSiteLocalDraftFields = {
  headline: string;
  subheading: string;
  primaryCtaLabel: string;
};

const HEADLINE_DRAFT_ID = "airship-chs-home-hero-headline";
const SUBHEADING_DRAFT_ID = "airship-chs-home-hero-value-proposition";
const CTA_DRAFT_ID = "airship-chs-home-contact-cta";

export function initialAirshipSingleSiteLocalDraftFields(preview: AirshipSingleSiteDraftPreview): AirshipSingleSiteLocalDraftFields {
  return {
    headline: preview.hero.headline,
    subheading: preview.hero.subheading,
    primaryCtaLabel: preview.hero.primaryCtaLabel ?? "",
  };
}

export function applyAirshipSingleSiteLocalDraftEdit(input: {
  drafts: AirshipSingleSiteImprovementDraft[];
  draftPreview: AirshipSingleSiteDraftPreview;
  fields: AirshipSingleSiteLocalDraftFields;
}): {
  drafts: AirshipSingleSiteImprovementDraft[];
  draftPreview: AirshipSingleSiteDraftPreview;
} {
  const nextTextByDraftId = new Map([
    [HEADLINE_DRAFT_ID, input.fields.headline],
    [SUBHEADING_DRAFT_ID, input.fields.subheading],
    [CTA_DRAFT_ID, input.fields.primaryCtaLabel],
  ]);

  return {
    drafts: input.drafts.map((draft) => {
      const nextText = nextTextByDraftId.get(draft.id);
      if (nextText === undefined) return draft;
      return {
        ...draft,
        proposedTextContent: nextText,
        status: nextText === draft.proposedTextContent ? draft.status : "edited",
      };
    }),
    draftPreview: {
      ...input.draftPreview,
      hero: {
        ...input.draftPreview.hero,
        headline: input.fields.headline,
        subheading: input.fields.subheading,
        primaryCtaLabel: input.fields.primaryCtaLabel || null,
      },
    },
  };
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
      {value.replaceAll("_", " ")}
    </span>
  );
}

function localField(input: {
  id: string;
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const commonStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #94a3b8",
    borderRadius: 8,
    padding: "9px 10px",
    color: "#0f172a",
    background: "#fff",
    fontSize: 13,
    lineHeight: 1.45,
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => input.onChange(event.target.value);

  return (
    <label htmlFor={input.id} style={{ display: "grid", gap: 5, minWidth: 0, color: "#334155", fontSize: 12, fontWeight: 850 }}>
      {input.label}
      {input.multiline ? (
        <textarea id={input.id} value={input.value} rows={4} onChange={handleChange} style={{ ...commonStyle, resize: "vertical" }} />
      ) : (
        <input id={input.id} value={input.value} onChange={handleChange} style={commonStyle} />
      )}
    </label>
  );
}

function readonlyField(label: string, value: string, multiline = false) {
  return (
    <label style={{ display: "grid", gap: 5, minWidth: 0, color: "#475569", fontSize: 12, fontWeight: 850 }}>
      {label}
      {multiline ? (
        <textarea
          readOnly
          value={value}
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
          value={value}
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

function localDraftPreview(previewState: AirshipSingleSiteDraftPreview) {
  return (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{previewState.label}</h3>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 12 }}>
            Proposed changes only - local draft only, not saved to production
          </div>
        </div>
        {badge(previewState.persistence, "warn")}
      </div>
      <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#ecfeff", minHeight: 360 }}>
        <div style={{ minHeight: 360, display: "grid", alignContent: "center", gap: 16, padding: 28, background: "linear-gradient(135deg, #ecfeff 0%, #ffffff 58%, #fefce8 100%)" }}>
          <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0 }}>
            {previewState.hero.eyebrow}
          </div>
          <h3 data-airship-local-preview="headline" style={{ margin: 0, maxWidth: 760, color: "#0f172a", fontSize: 36, lineHeight: 1.06 }}>
            {previewState.hero.headline}
          </h3>
          <p data-airship-local-preview="subheading" style={{ margin: 0, maxWidth: 760, color: "#334155", fontSize: 17, lineHeight: 1.55 }}>
            {previewState.hero.subheading}
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {previewState.hero.primaryCtaLabel ? (
              <span data-airship-local-preview="cta" style={{ display: "inline-flex", border: "1px solid #0f766e", borderRadius: 8, background: "#0f766e", color: "#fff", padding: "10px 13px", fontSize: 14, fontWeight: 900 }}>
                {previewState.hero.primaryCtaLabel}
              </span>
            ) : null}
            {previewState.hero.secondaryContactText ? (
              <span style={{ color: "#475569", fontSize: 13, fontWeight: 800 }}>
                {previewState.hero.secondaryContactText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div style={{ color: "#92400e", fontSize: 12, lineHeight: 1.45 }}>{previewState.note}</div>
    </div>
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
        {readonlyField("Target section/page", draft.targetSectionPage)}
        {readonlyField("Status", draft.status)}
        {readonlyField("Current text/content summary", draft.currentTextContentSummary, true)}
        {readonlyField("Proposed text/content", draft.proposedTextContent, true)}
        {readonlyField("Reason for change", draft.reasonForChange, true)}
        {readonlyField("Preview impact", draft.previewImpact, true)}
      </div>
    </article>
  );
}

export function AirshipSingleSiteLocalDraftEditor({ drafts, draftPreview, controlNote }: Props) {
  const [fields, setFields] = useState(() => initialAirshipSingleSiteLocalDraftFields(draftPreview));
  const localDraft = useMemo(() => applyAirshipSingleSiteLocalDraftEdit({ drafts, draftPreview, fields }), [drafts, draftPreview, fields]);

  function updateField(key: keyof AirshipSingleSiteLocalDraftFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ border: "1px solid #bae6fd", borderRadius: 8, background: "#f0f9ff", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>Local draft editor</h3>
            <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 12, lineHeight: 1.45 }}>
              Local draft only, not saved to production.
            </p>
          </div>
          {badge("persistence_not_enabled", "warn")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {localField({
            id: "airship-local-headline",
            label: "Editable hero headline",
            value: fields.headline,
            onChange: (value) => updateField("headline", value),
          })}
          {localField({
            id: "airship-local-subheading",
            label: "Editable hero subheading",
            value: fields.subheading,
            multiline: true,
            onChange: (value) => updateField("subheading", value),
          })}
          {localField({
            id: "airship-local-cta",
            label: "Editable contact CTA",
            value: fields.primaryCtaLabel,
            onChange: (value) => updateField("primaryCtaLabel", value),
          })}
        </div>
      </div>

      {localDraftPreview(localDraft.draftPreview)}

      <div style={{ display: "grid", gap: 10 }}>{localDraft.drafts.map(draftRow)}</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" disabled style={disabledButtonStyle()}>
          Accept disabled
        </button>
        <button type="button" disabled style={disabledButtonStyle()}>
          Reject disabled
        </button>
        <button type="button" disabled style={disabledButtonStyle()}>
          Save disabled - persistence not enabled
        </button>
      </div>
      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
        {controlNote}
      </div>
    </div>
  );
}

function disabledButtonStyle(): CSSProperties {
  return {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#64748b",
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 850,
  };
}
