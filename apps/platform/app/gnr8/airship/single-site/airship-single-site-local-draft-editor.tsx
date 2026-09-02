"use client";

import React, { useMemo, useState, type CSSProperties } from "react";

import type {
  AirshipSingleSiteDraftPreview,
  AirshipSingleSiteImprovementDraft,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

type Props = {
  migrationId: string | null;
  drafts: AirshipSingleSiteImprovementDraft[];
  draftPreview: AirshipSingleSiteDraftPreview;
  controlNote: string;
  persistence: {
    label: "Saved Airship draft" | "Unsaved Airship draft";
    draftId: string | null;
    draftStatus: string | null;
    version: number | null;
    lastSavedAt: string | null;
    notAppliedToLiveSite: true;
    notPublished: true;
  };
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

function draftPreviewValue(input: {
  draftId: string;
  drafts: AirshipSingleSiteImprovementDraft[];
  baselinePreview: AirshipSingleSiteDraftPreview;
}): string | null {
  const draft = input.drafts.find((item) => item.id === input.draftId);
  if (!draft) return null;
  if (draft.status !== "rejected") return draft.proposedTextContent;
  if (input.draftId === HEADLINE_DRAFT_ID) return input.baselinePreview.hero.headline;
  if (input.draftId === SUBHEADING_DRAFT_ID) return input.baselinePreview.hero.subheading;
  if (input.draftId === CTA_DRAFT_ID) return input.baselinePreview.hero.primaryCtaLabel;
  return draft.proposedTextContent;
}

function draftPreviewFromDrafts(input: {
  drafts: AirshipSingleSiteImprovementDraft[];
  baselinePreview: AirshipSingleSiteDraftPreview;
}): AirshipSingleSiteDraftPreview {
  return {
    ...input.baselinePreview,
    hero: {
      ...input.baselinePreview.hero,
      headline: draftPreviewValue({ ...input, draftId: HEADLINE_DRAFT_ID }) ?? input.baselinePreview.hero.headline,
      subheading: draftPreviewValue({ ...input, draftId: SUBHEADING_DRAFT_ID }) ?? input.baselinePreview.hero.subheading,
      primaryCtaLabel: draftPreviewValue({ ...input, draftId: CTA_DRAFT_ID }) || null,
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
            Saved Airship draft - Not applied to live site - Not published
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

function draftTextField(input: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={input.id} style={{ display: "grid", gap: 5, minWidth: 0, color: "#475569", fontSize: 12, fontWeight: 850 }}>
      Proposed text/content
      <textarea
        id={input.id}
        value={input.value}
        rows={4}
        onChange={(event) => input.onChange(event.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          border: "1px solid #94a3b8",
          borderRadius: 8,
          padding: "9px 10px",
          color: "#0f172a",
          background: "#fff",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      />
    </label>
  );
}

function actionButtonStyle(tone: "primary" | "neutral" | "warn", disabled = false): CSSProperties {
  const palette = {
    primary: { border: "#0f766e", background: "#0f766e", color: "#fff" },
    neutral: { border: "#cbd5e1", background: "#fff", color: "#334155" },
    warn: { border: "#fbbf24", background: "#fffbeb", color: "#92400e" },
  }[tone];
  return {
    border: `1px solid ${disabled ? "#cbd5e1" : palette.border}`,
    borderRadius: 8,
    background: disabled ? "#f8fafc" : palette.background,
    color: disabled ? "#94a3b8" : palette.color,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function draftRow(input: {
  draft: AirshipSingleSiteImprovementDraft;
  busy: boolean;
  onTextChange: (draftId: string, value: string) => void;
  onSave: (draftId: string) => void;
  onAccept: (draftId: string) => void;
  onReject: (draftId: string) => void;
}) {
  const draft = input.draft;
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
        {draftTextField({
          id: `airship-draft-edit-${draft.id}`,
          value: draft.proposedTextContent,
          onChange: (value) => input.onTextChange(draft.id, value),
        })}
        {readonlyField("Reason for change", draft.reasonForChange, true)}
        {readonlyField("Preview impact", draft.previewImpact, true)}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" disabled={input.busy} onClick={() => input.onSave(draft.id)} style={actionButtonStyle("primary", input.busy)}>
          Save edit
        </button>
        <button type="button" disabled={input.busy} onClick={() => input.onAccept(draft.id)} style={actionButtonStyle("neutral", input.busy)}>
          Accept draft edit
        </button>
        <button type="button" disabled={input.busy} onClick={() => input.onReject(draft.id)} style={actionButtonStyle("warn", input.busy)}>
          Reject draft edit
        </button>
      </div>
    </article>
  );
}

type DraftActionResponse = {
  ok?: boolean;
  draft?: {
    id: string;
    draftStatus: string;
    version: number;
    updatedAt: string;
    draftEdits: AirshipSingleSiteImprovementDraft[];
  } | null;
  error?: string;
};

function mergeServerDrafts(
  current: AirshipSingleSiteImprovementDraft[],
  serverDraftEdits: AirshipSingleSiteImprovementDraft[],
): AirshipSingleSiteImprovementDraft[] {
  return current.map((draft) => {
    const serverDraft = serverDraftEdits.find((item) => item.id === draft.id);
    return serverDraft ? { ...draft, proposedTextContent: serverDraft.proposedTextContent, status: serverDraft.status } : draft;
  });
}

export function AirshipSingleSiteLocalDraftEditor({ migrationId, drafts, draftPreview, controlNote, persistence }: Props) {
  const initialPersistence = persistence ?? {
    label: "Unsaved Airship draft" as const,
    draftId: null,
    draftStatus: null,
    version: null,
    lastSavedAt: null,
    notAppliedToLiveSite: true as const,
    notPublished: true as const,
  };
  const [editableDrafts, setEditableDrafts] = useState(() => drafts);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string>(() =>
    initialPersistence.draftId
      ? `${initialPersistence.label}. Not applied to live site. Not published.`
      : "Unsaved Airship draft. Not applied to live site. Not published.",
  );
  const [draftMeta, setDraftMeta] = useState(() => initialPersistence);
  const localDraftPreviewState = useMemo(() => draftPreviewFromDrafts({ drafts: editableDrafts, baselinePreview: draftPreview }), [draftPreview, editableDrafts]);

  function updateDraftText(draftId: string, value: string) {
    setEditableDrafts((current) =>
      current.map((draft) => draft.id === draftId ? { ...draft, proposedTextContent: value, status: draft.status === "accepted" || draft.status === "rejected" ? "edited" : draft.status === "proposed" ? "edited" : draft.status } : draft),
    );
  }

  async function runDraftAction(actionMode: "update_edit" | "mark_accepted" | "mark_rejected", draftId: string) {
    const draft = editableDrafts.find((item) => item.id === draftId);
    if (!draft || !migrationId) return;
    setBusyDraftId(draftId);
    setSaveMessage("Saving Airship draft...");
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode,
          migrationId,
          draftEditId: draftId,
          proposedTextContent: draft.proposedTextContent,
        }),
      });
      const payload = await response.json() as DraftActionResponse;
      if (!response.ok || !payload.ok || !payload.draft) {
        throw new Error(payload.error || "airship_draft_action_failed");
      }
      setEditableDrafts((current) => mergeServerDrafts(current, payload.draft?.draftEdits ?? []));
      setDraftMeta({
        label: "Saved Airship draft",
        draftId: payload.draft.id,
        draftStatus: payload.draft.draftStatus,
        version: payload.draft.version,
        lastSavedAt: payload.draft.updatedAt,
        notAppliedToLiveSite: true,
        notPublished: true,
      });
      setSaveMessage("Saved Airship draft. Not applied to live site. Not published.");
    } catch {
      setSaveMessage("Airship draft action failed. No live site changes were made.");
    } finally {
      setBusyDraftId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ border: "1px solid #bae6fd", borderRadius: 8, background: "#f0f9ff", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>Saved Airship draft</h3>
            <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 12, lineHeight: 1.45 }}>
              Not applied to live site. Not published.
            </p>
          </div>
          {badge(draftMeta.label, "good")}
        </div>
        <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>
          {saveMessage}
          {draftMeta.draftId ? ` Draft ${draftMeta.draftId}.` : ""}
          {draftMeta.version ? ` Version ${draftMeta.version}.` : ""}
          {draftMeta.lastSavedAt ? ` Last saved ${draftMeta.lastSavedAt}.` : ""}
        </div>
      </div>

      {localDraftPreview(localDraftPreviewState)}

      <div style={{ display: "grid", gap: 10 }}>
        {editableDrafts.map((draft) =>
          draftRow({
            draft,
            busy: busyDraftId === draft.id,
            onTextChange: updateDraftText,
            onSave: (draftId) => void runDraftAction("update_edit", draftId),
            onAccept: (draftId) => void runDraftAction("mark_accepted", draftId),
            onReject: (draftId) => void runDraftAction("mark_rejected", draftId),
          }),
        )}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
        {controlNote}
      </div>
    </div>
  );
}
