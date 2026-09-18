"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type {
  AirshipImportedSiteEditorModel,
  AirshipImportedSiteEditableSection,
  AirshipImportedSiteEditorSectionKey,
  AirshipSingleSiteDraftFieldKey,
  AirshipSingleSiteDraftPreview,
  AirshipSingleSiteDraftStyleSettings,
  AirshipSingleSiteImprovementDraft,
  AirshipMvpDemoReadiness,
  AirshipEditorArtifactCanvasRender,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import type {
  AirshipAgentProfileSelection,
  AirshipOpenAIProviderStatusReadModel,
} from "@/gnr8/single-site/airship-agent-profile-types";

type Props = {
  migrationId: string | null;
  importedSite: string;
  sourceUrl: string;
  liveSiteUrl: string;
  importedSiteModel?: AirshipImportedSiteEditorModel;
  demoReadiness?: AirshipMvpDemoReadiness | null;
  artifactCanvasRender?: AirshipEditorArtifactCanvasRender | null;
  draftCandidate: {
    siteVersionId: string | null;
    runtimeArtifactId: string | null;
    route: string | null;
    draftId: string | null;
    draftVersion: number | null;
    statusLabel?: string | null;
  } | null;
  draftPreview: AirshipSingleSiteDraftPreview;
  drafts: AirshipSingleSiteImprovementDraft[];
  persistence: {
    label: "Saved Airship draft" | "Unsaved Airship draft";
    draftId: string | null;
    draftStatus: string | null;
    version: number | null;
    lastSavedAt: string | null;
    styleSettings: AirshipSingleSiteDraftStyleSettings;
    notAppliedToLiveSite: true;
    notPublished: true;
  };
  aiProviderStatus: AirshipOpenAIProviderStatusReadModel;
  agentProfileSelection: AirshipAgentProfileSelection;
};

export type AirshipHeroEditorFields = {
  headline: string;
  subheading: string;
  ctaLabel: string;
  topPadding: number;
  bottomPadding: number;
  backgroundTint: string;
  ctaColor: string;
};

export type AirshipCommandResult = {
  fields: AirshipHeroEditorFields;
  changedTextFields: Array<"headline" | "subheading" | "ctaLabel">;
  changedStyleFields: Array<"topPadding" | "bottomPadding" | "backgroundTint" | "ctaColor">;
  message: string;
  supported: boolean;
};

type DraftActionResponse = {
  ok?: boolean;
  draft?: {
    id: string;
    draftStatus: string;
    version: number;
    updatedAt: string;
    draftEdits: AirshipSingleSiteImprovementDraft[];
    metadata?: Record<string, unknown>;
  } | null;
  error?: string;
};

type TextFieldKey = AirshipSingleSiteDraftFieldKey;
type StyleFieldKey = "topPadding" | "bottomPadding" | "backgroundTint" | "ctaColor";
type EditorSectionKey = AirshipImportedSiteEditorSectionKey;
type EditorViewportKey = "desktop" | "tablet" | "mobile";
type InspectorTabKey = "agent" | "edit" | "css" | "dom";
type EditorToolKey = "select" | "pan" | "text";
export type DraftSaveState = "saved" | "unsaved" | "saving" | "failed";
export type CandidateApplyState = "idle" | "creating" | "created" | "failed";
type PreviewCandidateState = NonNullable<Props["draftCandidate"]>;

export type AirshipSelectedElementMetadata = {
  section: EditorSectionKey;
  selectionLevel: "section-level" | "element-level";
  label: string;
  domSectionId: string;
  role: string;
  sourceStatus: string;
  draftStatus: string;
  mappedDraftFieldIds: string[];
  sizeLabel: string;
  internalRefs: Array<{ label: string; value: string }>;
};

export type AirshipArtifactOverlayRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  source: "dom-marker";
};

type AirshipDomRectLike = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type EditorSnapshot = {
  fields: AirshipHeroEditorFields;
  drafts: AirshipSingleSiteImprovementDraft[];
};

type RecentChange = {
  id: string;
  label: string;
  scope: "text" | "style" | "command" | "undo" | "reset" | "draft";
  state: "local" | "saved";
  createdAt: string;
};

type DraftCandidateActionResponse = {
  ok?: boolean;
  candidate?: PreviewCandidateState & { status: "created" | "reused" };
  error?: string;
};

const STYLE_DRAFT_SAVED_MESSAGE = "Style changes are saved to Airship draft only. Not live. Not published.";
const CONNECT_OPENAI_MESSAGE = "Connect OpenAI to use AI commands.";

const fallbackSectionOptions: AirshipImportedSiteEditableSection[] = [
  { key: "hero", label: "Hero / intro", detail: "Headline, subheading, spacing, tint", mappedDraftFieldIds: [], sourceStatus: "partial source-supported hero draft fields" },
  { key: "offers", label: "Offers / Services", detail: "Offer/service copy and cards", mappedDraftFieldIds: [], sourceStatus: "services section draft unavailable" },
  { key: "proof", label: "Proof / Benefits", detail: "Proof points and benefits", mappedDraftFieldIds: [], sourceStatus: "proof section draft unavailable" },
  { key: "approach", label: "Approach / Process", detail: "Process or approach copy", mappedDraftFieldIds: [], sourceStatus: "approach section draft unavailable" },
  { key: "cta", label: "CTA / Contact", detail: "Primary action label and color", mappedDraftFieldIds: [], sourceStatus: "CTA draft field unavailable from source evidence" },
  { key: "footer", label: "Footer / Demo note", detail: "Preview boundary note", mappedDraftFieldIds: [], sourceStatus: "footer demo note unavailable" },
  { key: "source", label: "Source material", detail: "Imported-site evidence and internal draft refs", mappedDraftFieldIds: [], sourceStatus: "source material readback only" },
];

const viewportOptions: Array<{ key: EditorViewportKey; label: string; width: number }> = [
  { key: "desktop", label: "Desktop", width: 1100 },
  { key: "tablet", label: "Tablet", width: 760 },
  { key: "mobile", label: "Mobile", width: 390 },
];

const MIN_CANVAS_ZOOM = 0.38;
const MAX_CANVAS_ZOOM = 1.35;
const CANVAS_ZOOM_STEP = 0.08;

const inspectorTabs: Array<{ key: InspectorTabKey; label: string }> = [
  { key: "agent", label: "Agent" },
  { key: "edit", label: "Edit" },
  { key: "css", label: "CSS" },
  { key: "dom", label: "DOM" },
];

const toolOptions: Array<{ key: EditorToolKey; label: string; icon: string }> = [
  { key: "select", label: "Select", icon: "▸" },
  { key: "pan", label: "Pan", icon: "↔" },
  { key: "text", label: "Text", icon: "T" },
];

function styleKey(fields: Pick<AirshipHeroEditorFields, "topPadding" | "bottomPadding" | "backgroundTint" | "ctaColor">): string {
  return JSON.stringify({
    heroTopPadding: fields.topPadding,
    heroBottomPadding: fields.bottomPadding,
    backgroundTint: fields.backgroundTint,
    ctaColor: fields.ctaColor,
  });
}

export function initialAirshipHeroEditorFields(
  preview: AirshipSingleSiteDraftPreview,
  styleSettings?: AirshipSingleSiteDraftStyleSettings,
): AirshipHeroEditorFields {
  return {
    headline: preview.hero.headline,
    subheading: preview.hero.subheading,
    ctaLabel: preview.hero.primaryCtaLabel ?? "",
    topPadding: styleSettings?.heroTopPadding ?? 72,
    bottomPadding: styleSettings?.heroBottomPadding ?? 72,
    backgroundTint: styleSettings?.backgroundTint ?? "#ecfeff",
    ctaColor: styleSettings?.ctaColor ?? "#0f766e",
  };
}

function clampSpacing(value: number): number {
  return Math.max(24, Math.min(140, Math.round(value)));
}

function shorterHeadline(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 42) return trimmed;
  const sentences = trimmed.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  if (sentences.length > 1 && sentences[0]) return sentences[0];
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.slice(0, Math.min(words.length, 6)).join(" ");
}

function ctaTextFromCommand(command: string): string | null {
  const slovenian = command.match(/spremeni\s+cta\s+v\s+(.+)$/i);
  if (slovenian?.[1]) return slovenian[1].trim();
  const english = command.match(/(?:change|set)\s+(?:the\s+)?cta\s+(?:to|as)\s+(.+)$/i);
  if (english?.[1]) return english[1].trim();
  return null;
}

export function applyAirshipHeroCommand(fields: AirshipHeroEditorFields, rawCommand: string): AirshipCommandResult {
  const command = rawCommand.trim();
  const normalized = command.toLocaleLowerCase("sl-SI");
  const next: AirshipHeroEditorFields = { ...fields };
  const changedTextFields: AirshipCommandResult["changedTextFields"] = [];
  const changedStyleFields: AirshipCommandResult["changedStyleFields"] = [];

  const nextCta = ctaTextFromCommand(command);
  if (nextCta) {
    next.ctaLabel = nextCta;
    changedTextFields.push("ctaLabel");
  } else if (/make\s+(?:the\s+)?headline\s+shorter/.test(normalized)) {
    next.headline = shorterHeadline(fields.headline);
    changedTextFields.push("headline");
  } else if (/pove[cč]aj.*spodnji\s+odmik|increase.*bottom\s+spacing|increase.*bottom\s+padding/.test(normalized)) {
    next.bottomPadding = clampSpacing(fields.bottomPadding + 12);
    changedStyleFields.push("bottomPadding");
  } else if (/zmanj[sš]aj.*zgornji\s+odmik|decrease.*top\s+spacing|decrease.*top\s+padding|reduce.*top\s+padding/.test(normalized)) {
    next.topPadding = clampSpacing(fields.topPadding - 12);
    changedStyleFields.push("topPadding");
  } else if (/make\s+(?:the\s+)?cta\s+more\s+prominent|poudari\s+cta|izpostavi\s+cta/.test(normalized)) {
    next.ctaColor = "#1d4ed8";
    next.bottomPadding = clampSpacing(fields.bottomPadding + 8);
    changedStyleFields.push("ctaColor", "bottomPadding");
  } else {
    return {
      fields,
      changedTextFields,
      changedStyleFields,
      message: "Command not supported yet. Try changing the CTA, shortening the headline, or adjusting hero spacing.",
      supported: false,
    };
  }

  const textMessage = changedTextFields.length > 0 ? "Text changes are saved to Airship draft only." : "";
  const styleMessage = changedStyleFields.length > 0 ? STYLE_DRAFT_SAVED_MESSAGE : "";
  return {
    fields: next,
    changedTextFields,
    changedStyleFields,
    message: [textMessage, styleMessage].filter(Boolean).join(" "),
    supported: true,
  };
}

function badge(value: string, tone: "good" | "warn" | "neutral" = "neutral") {
  const palette = {
    good: { border: "#86efac", background: "#f0fdf4", color: "#166534" },
    warn: { border: "#fbbf24", background: "#fffbeb", color: "#92400e" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  }[tone];

  return (
    <span style={{ display: "inline-flex", border: `1px solid ${palette.border}`, borderRadius: 8, padding: "4px 8px", background: palette.background, color: palette.color, fontSize: 12, fontWeight: 850, lineHeight: 1.2 }}>
      {value}
    </span>
  );
}

function SelectionOverlay({ metadata }: { metadata: AirshipSelectedElementMetadata }) {
  return (
    <span className="airship-selection-chip" aria-label={`Selected canvas element: ${metadata.label}`}>
      <strong>{metadata.label}</strong>
      <span>{metadata.role}</span>
      <span>{metadata.sizeLabel}</span>
    </span>
  );
}

const artifactCanvasSections: Array<Exclude<EditorSectionKey, "source">> = ["hero", "offers", "proof", "approach", "cta", "footer"];
const AIRSHIP_ARTIFACT_CANVAS_FALLBACK_MIN_HEIGHT = 1180;

function artifactSectionBandStyle(section: Exclude<EditorSectionKey, "source">): CSSProperties {
  const bands: Record<Exclude<EditorSectionKey, "source">, CSSProperties> = {
    hero: { top: "0%", left: "0%", width: "100%", height: "30%" },
    offers: { top: "30%", left: "0%", width: "50%", height: "23%" },
    proof: { top: "30%", left: "50%", width: "50%", height: "23%" },
    approach: { top: "53%", left: "0%", width: "50%", height: "25%" },
    cta: { top: "53%", left: "50%", width: "50%", height: "25%" },
    footer: { top: "78%", left: "0%", width: "100%", height: "22%" },
  };
  return bands[section];
}

function artifactCanvasHeight(viewport: EditorViewportKey): number {
  if (viewport === "mobile") return 1320;
  if (viewport === "tablet") return 1240;
  return AIRSHIP_ARTIFACT_CANVAS_FALLBACK_MIN_HEIGHT;
}

export function airshipArtifactSectionSelector(section: Exclude<EditorSectionKey, "source">): string {
  return `[data-airship-section="${section}"]`;
}

export function airshipElementSelectorsForSection(section: EditorSectionKey): string[] {
  const selectors: Record<EditorSectionKey, string[]> = {
    hero: [
      '[data-airship-element="hero-headline"]',
      '[data-airship-element="hero-cta"]',
    ],
    offers: ['[data-airship-element="offer-card"]'],
    proof: ['[data-airship-element="proof-card"]'],
    approach: ['[data-airship-element="approach-card"]'],
    cta: [
      '[data-airship-element="contact-card"]',
      '[data-airship-element="contact-cta"]',
    ],
    footer: [],
    source: [],
  };
  return selectors[section];
}

export function measuredAirshipArtifactCanvasHeight(input: {
  documentElementScrollHeight?: number | null;
  bodyScrollHeight?: number | null;
  bodyOffsetHeight?: number | null;
  fallbackHeight: number;
}): number {
  const measured = Math.max(
    Number(input.documentElementScrollHeight ?? 0),
    Number(input.bodyScrollHeight ?? 0),
    Number(input.bodyOffsetHeight ?? 0),
  );
  return Number.isFinite(measured) && measured > 0 ? Math.max(input.fallbackHeight, Math.ceil(measured)) : input.fallbackHeight;
}

export function airshipArtifactOverlayRectFromDomRect(input: {
  iframeElementRect: AirshipDomRectLike;
  targetElementRect: AirshipDomRectLike | null | undefined;
  zoomScale: number;
  overlayHostElementRect?: AirshipDomRectLike | null;
  iframeScrollX?: number;
  iframeScrollY?: number;
}): AirshipArtifactOverlayRect | null {
  const target = input.targetElementRect;
  const zoomScale = Number.isFinite(input.zoomScale) && input.zoomScale > 0 ? input.zoomScale : 1;
  const overlayHost = input.overlayHostElementRect ?? { top: 0, left: 0, width: 0, height: 0 };
  if (
    !target ||
    !Number.isFinite(input.iframeElementRect.top) ||
    !Number.isFinite(input.iframeElementRect.left) ||
    !Number.isFinite(overlayHost.top) ||
    !Number.isFinite(overlayHost.left) ||
    !Number.isFinite(target.top) ||
    !Number.isFinite(target.left) ||
    !Number.isFinite(target.width) ||
    !Number.isFinite(target.height) ||
    target.width <= 0 ||
    target.height <= 0
  ) {
    return null;
  }
  const iframeTopInOverlayHost = (input.iframeElementRect.top - overlayHost.top) / zoomScale;
  const iframeLeftInOverlayHost = (input.iframeElementRect.left - overlayHost.left) / zoomScale;
  return {
    top: Math.max(0, Math.round(iframeTopInOverlayHost + target.top + (input.iframeScrollY ?? 0))),
    left: Math.max(0, Math.round(iframeLeftInOverlayHost + target.left + (input.iframeScrollX ?? 0))),
    width: Math.max(1, Math.round(target.width)),
    height: Math.max(1, Math.round(target.height)),
    source: "dom-marker",
  };
}

function actionButtonStyle(input: {
  tone?: "primary" | "neutral" | "danger";
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  dark?: boolean;
} = {}): CSSProperties {
  const tone = input.tone ?? "neutral";
  const palette = input.dark
    ? {
        primary: { border: "#38bdf8", background: "#0ea5e9", color: "#f8fafc" },
        neutral: { border: "rgba(148, 163, 184, 0.34)", background: "rgba(255, 255, 255, 0.07)", color: "#e2e8f0" },
        danger: { border: "#f87171", background: "rgba(127, 29, 29, 0.24)", color: "#fecaca" },
      }[tone]
    : {
        primary: { border: "#1d4ed8", background: "#1d4ed8", color: "#fff" },
        neutral: { border: "#cbd5e1", background: "#fff", color: "#0f172a" },
        danger: { border: "#b91c1c", background: "#fff", color: "#b91c1c" },
      }[tone];
  return {
    border: `1px solid ${input.disabled ? (input.dark ? "rgba(148, 163, 184, 0.16)" : "#dbe3ee") : input.selected ? (input.dark ? "#38bdf8" : "#1d4ed8") : palette.border}`,
    borderRadius: 8,
    background: input.disabled ? (input.dark ? "rgba(148, 163, 184, 0.08)" : "#f8fafc") : input.selected ? (input.dark ? "rgba(14, 165, 233, 0.18)" : "#eff6ff") : palette.background,
    color: input.disabled ? "#94a3b8" : input.selected ? (input.dark ? "#e0f2fe" : "#1d4ed8") : palette.color,
    padding: input.compact ? "7px 10px" : "9px 12px",
    fontSize: 13,
    fontWeight: 850,
    cursor: input.disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

function isAirshipOpenAIProviderConnected(status: AirshipOpenAIProviderStatusReadModel): boolean {
  return status.provider === "openai" && status.status === "connected" && status.connected && status.canUseAiCommands && Boolean(status.maskedKey);
}

function clampCanvasZoom(value: number): number {
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, Number(value.toFixed(2))));
}

function sameSitePreviewHost(input: { importedSite: string; previewUrl: string | null | undefined }): string | null {
  if (!input.previewUrl) return null;
  const sitePrefix = input.importedSite.split(".")[0]?.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "");
  if (!sitePrefix) return null;
  try {
    const host = new URL(input.previewUrl).hostname.toLocaleLowerCase("en-US");
    return host.startsWith(`${sitePrefix}-airship.`) ? input.previewUrl : null;
  } catch {
    return null;
  }
}

function draftFieldKey(draft: AirshipSingleSiteImprovementDraft): TextFieldKey | null {
  if (draft.fieldKey === "headline" || draft.fieldKey === "subheading" || draft.fieldKey === "ctaLabel") return draft.fieldKey;
  const haystack = `${draft.id} ${draft.targetSectionPage}`.toLocaleLowerCase("en-US");
  if (/cta|call.to.action|button|contact/.test(haystack)) return "ctaLabel";
  if (/subheading|subheadline|subtitle|value.proposition|body|description/.test(haystack)) return "subheading";
  if (/headline|heading|hero|h1|title/.test(haystack)) return "headline";
  return null;
}

function draftSectionKey(draft: AirshipSingleSiteImprovementDraft): Exclude<EditorSectionKey, "source"> | null {
  if (
    draft.sectionKey === "hero" ||
    draft.sectionKey === "offers" ||
    draft.sectionKey === "proof" ||
    draft.sectionKey === "approach" ||
    draft.sectionKey === "cta" ||
    draft.sectionKey === "footer"
  ) {
    return draft.sectionKey;
  }
  const field = draftFieldKey(draft);
  if (field === "headline" || field === "subheading") return "hero";
  if (field === "ctaLabel") return "cta";
  const haystack = `${draft.id} ${draft.targetSectionPage}`.toLocaleLowerCase("en-US");
  if (/offer|service|product|ponud/.test(haystack)) return "offers";
  if (/proof|benefit|trust|brand|category|reference|partner/.test(haystack)) return "proof";
  if (/approach|process|method|workflow|delivery/.test(haystack)) return "approach";
  if (/footer|demo.note|boundary/.test(haystack)) return "footer";
  if (/cta|contact|inquiry|call.to.action/.test(haystack)) return "cta";
  return null;
}

function draftIdForField(field: TextFieldKey, drafts: AirshipSingleSiteImprovementDraft[]): string | null {
  return drafts.find((draft) => draftFieldKey(draft) === field)?.id ?? null;
}

export function applyAirshipHeroTextFieldEdit(input: {
  fields: AirshipHeroEditorFields;
  drafts: AirshipSingleSiteImprovementDraft[];
  field: TextFieldKey;
  value: string;
}): {
  fields: AirshipHeroEditorFields;
  drafts: AirshipSingleSiteImprovementDraft[];
} {
  const draftId = draftIdForField(input.field, input.drafts);
  if (!draftId) return {
    fields: { ...input.fields, [input.field]: input.value },
    drafts: input.drafts,
  };
  return {
    fields: { ...input.fields, [input.field]: input.value },
    drafts: input.drafts.map((draft) =>
      draft.id === draftId ? { ...draft, proposedTextContent: input.value, status: draft.status === "accepted" || draft.status === "rejected" || draft.status === "proposed" ? "edited" : draft.status } : draft,
    ),
  };
}

export function sectionTextFields(section: EditorSectionKey): TextFieldKey[] {
  if (section === "cta") return ["ctaLabel"];
  if (section === "source") return [];
  if (section !== "hero") return [];
  return ["headline", "subheading"];
}

export function sectionStyleFields(section: EditorSectionKey): StyleFieldKey[] {
  if (section === "cta") return ["ctaColor"];
  if (section === "source") return [];
  if (section === "offers" || section === "proof" || section === "approach" || section === "footer") return ["backgroundTint"];
  return ["topPadding", "bottomPadding", "backgroundTint"];
}

export function mappedAirshipDraftFieldIdsForSection(section: EditorSectionKey, drafts: AirshipSingleSiteImprovementDraft[] = []): string[] {
  if (section !== "source") return drafts.filter((draft) => draftSectionKey(draft) === section).map((draft) => draft.id);
  return drafts.map((draft) => draft.id);
}

export function airshipCanvasSelectorForSection(section: EditorSectionKey): string {
  return `[data-airship-editor-canvas="${section}"]`;
}

export function deriveAirshipStyleValueRows(section: EditorSectionKey, fields: AirshipHeroEditorFields): Array<{ label: string; value: string }> {
  if (section === "cta") {
    return [
      { label: "background-color", value: fields.ctaColor },
      { label: "border-color", value: fields.ctaColor },
      { label: "border-radius", value: "8px" },
    ];
  }
  if (section === "source") {
    return [
      { label: "background", value: "#f8fafc" },
      { label: "border-top", value: "1px solid #e2e8f0" },
    ];
  }
  if (section === "offers" || section === "proof" || section === "approach" || section === "footer") {
    return [
      { label: "background", value: fields.backgroundTint },
      { label: "accent-color", value: fields.ctaColor },
      { label: "card-style", value: section === "footer" ? "compact boundary note" : "compact bordered cards" },
      { label: "spacing", value: "section padding 34px" },
    ];
  }
  return [
    { label: "padding-top", value: `${fields.topPadding}px` },
    { label: "padding-bottom", value: `${fields.bottomPadding}px` },
    { label: "background-tint", value: fields.backgroundTint },
  ];
}

export function deriveAirshipSelectedElementMetadata(input: {
  section: EditorSectionKey;
  migrationId: string | null;
  importedSite: string;
  sourceUrl: string;
  liveSiteUrl: string;
  viewportLabel: string;
  viewportWidth: number;
  draftMeta: Pick<Props["persistence"], "label" | "draftId" | "draftStatus" | "version" | "lastSavedAt">;
  draftCandidate: Props["draftCandidate"];
  editableSections?: AirshipImportedSiteEditableSection[];
}): AirshipSelectedElementMetadata {
  const sections = input.editableSections?.length ? input.editableSections : fallbackSectionOptions;
  const option = sections.find((section) => section.key === input.section);
  const sectionLabel = option?.label ?? "Hero / intro";
  const draftStatus = input.draftMeta.draftStatus ?? input.draftMeta.label;
  const baseRefs = [
    { label: "migration", value: input.migrationId ?? "missing" },
    { label: "imported site", value: input.importedSite },
    { label: "source url", value: input.sourceUrl },
    { label: "live url", value: input.liveSiteUrl },
  ];
  const candidateRefs = input.draftCandidate
    ? [
        { label: "candidate version", value: input.draftCandidate.siteVersionId ?? "unavailable" },
        { label: "runtime artifact", value: input.draftCandidate.runtimeArtifactId ?? "unavailable" },
        { label: "candidate draft", value: input.draftCandidate.draftId ?? "unavailable" },
        { label: "candidate route", value: input.draftCandidate.route ?? "unavailable" },
      ]
    : [{ label: "candidate", value: "not materialized for this editor preview" }];
  const savedDraftRefs = [
    { label: "saved draft", value: input.draftMeta.draftId ?? "unsaved" },
    { label: "saved version", value: input.draftMeta.version ? String(input.draftMeta.version) : "unsaved" },
    { label: "last saved", value: input.draftMeta.lastSavedAt ?? "not saved yet" },
  ];

  if (input.section === "cta") {
    return {
      section: "cta",
      selectionLevel: "section-level",
      label: sectionLabel,
      domSectionId: "airship-preview-cta",
      role: "section / CTA and contact action",
      sourceStatus: option?.sourceStatus ?? "source-supported CTA draft field",
      draftStatus,
      mappedDraftFieldIds: option?.mappedDraftFieldIds ?? [],
      sizeLabel: `rendered section box in ${input.viewportLabel}`,
      internalRefs: [...baseRefs, ...savedDraftRefs, ...candidateRefs],
    };
  }
  if (input.section === "source") {
    return {
      section: "source",
      selectionLevel: "section-level",
      label: sectionLabel,
      domSectionId: "airship-preview-source-material",
      role: "source evidence strip",
      sourceStatus: option?.sourceStatus ?? "source material readback only",
      draftStatus,
      mappedDraftFieldIds: option?.mappedDraftFieldIds ?? [],
      sizeLabel: `full frame width in ${input.viewportLabel}`,
      internalRefs: [...baseRefs, ...savedDraftRefs, ...candidateRefs],
    };
  }
  if (input.section === "offers" || input.section === "proof" || input.section === "approach" || input.section === "footer") {
    const roleBySection: Record<"offers" | "proof" | "approach" | "footer", string> = {
      offers: "section / offers and services",
      proof: "section / proof and benefits",
      approach: "section / approach and process",
      footer: "contentinfo / internal demo note",
    };
    return {
      section: input.section,
      selectionLevel: "section-level",
      label: sectionLabel,
      domSectionId: `airship-preview-${input.section}`,
      role: roleBySection[input.section],
      sourceStatus: option?.sourceStatus ?? "draft section metadata",
      draftStatus,
      mappedDraftFieldIds: option?.mappedDraftFieldIds ?? [],
      sizeLabel: `full frame width in ${input.viewportLabel}`,
      internalRefs: [...baseRefs, ...savedDraftRefs, ...candidateRefs],
    };
  }
  return {
    section: "hero",
    selectionLevel: "section-level",
    label: sectionLabel,
    domSectionId: "airship-preview-hero-intro",
    role: "region / homepage hero intro",
    sourceStatus: option?.sourceStatus ?? "source-supported hero draft fields",
    draftStatus,
    mappedDraftFieldIds: option?.mappedDraftFieldIds ?? [],
    sizeLabel: `${input.viewportWidth}px frame, min-height 498px`,
    internalRefs: [...baseRefs, ...savedDraftRefs, ...candidateRefs],
  };
}

function textFieldsChanged(fields: AirshipHeroEditorFields, savedFields: AirshipHeroEditorFields): boolean {
  return fields.headline !== savedFields.headline || fields.subheading !== savedFields.subheading || fields.ctaLabel !== savedFields.ctaLabel;
}

function styleFieldsChanged(fields: AirshipHeroEditorFields, savedFields: AirshipHeroEditorFields): boolean {
  return styleKey(fields) !== styleKey(savedFields);
}

export function deriveAirshipDraftSaveState(input: {
  fields: AirshipHeroEditorFields;
  savedFields: AirshipHeroEditorFields;
  saving?: boolean;
  saveFailed?: boolean;
}): DraftSaveState {
  if (input.saving) return "saving";
  if (input.saveFailed) return "failed";
  return textFieldsChanged(input.fields, input.savedFields) || styleFieldsChanged(input.fields, input.savedFields) ? "unsaved" : "saved";
}

export function airshipCanApplySavedDraftToPreview(input: {
  migrationId: string | null;
  draftId: string | null;
  saveState: DraftSaveState;
  busy: boolean;
  candidateApplyState: CandidateApplyState;
}): boolean {
  return Boolean(input.migrationId && input.draftId) && input.saveState === "saved" && !input.busy && input.candidateApplyState !== "creating";
}

export function resetAirshipSectionTextToSavedValues(input: {
  section: EditorSectionKey;
  fields: AirshipHeroEditorFields;
  drafts: AirshipSingleSiteImprovementDraft[];
  savedFields: AirshipHeroEditorFields;
}): EditorSnapshot & { changedFields: TextFieldKey[] } {
  const changedFields: TextFieldKey[] = [];
  let nextFields = input.fields;
  let nextDrafts = input.drafts;
  for (const field of sectionTextFields(input.section)) {
    const savedValue = input.savedFields[field];
    if (nextFields[field] === savedValue) continue;
    changedFields.push(field);
    const edited = applyAirshipHeroTextFieldEdit({
      fields: nextFields,
      drafts: nextDrafts,
      field,
      value: savedValue,
    });
    nextFields = edited.fields;
    nextDrafts = edited.drafts;
  }
  return { fields: nextFields, drafts: nextDrafts, changedFields };
}

export function resetAirshipSectionStyleToSavedValues(input: {
  section: EditorSectionKey;
  fields: AirshipHeroEditorFields;
  drafts: AirshipSingleSiteImprovementDraft[];
  savedFields: AirshipHeroEditorFields;
}): EditorSnapshot & { changedFields: StyleFieldKey[] } {
  const changedFields: StyleFieldKey[] = [];
  const nextFields = { ...input.fields };
  for (const field of sectionStyleFields(input.section)) {
    if (nextFields[field] === input.savedFields[field]) continue;
    changedFields.push(field);
    if (field === "topPadding" || field === "bottomPadding") {
      nextFields[field] = clampSpacing(input.savedFields[field]);
    } else {
      nextFields[field] = input.savedFields[field];
    }
  }
  return { fields: nextFields, drafts: input.drafts, changedFields };
}

export function undoAirshipEditorLastLocalChange(input: {
  undoStack: EditorSnapshot[];
  fallback: EditorSnapshot;
}): EditorSnapshot & { undoStack: EditorSnapshot[]; undone: boolean } {
  const previous = input.undoStack.at(-1);
  if (!previous) return { ...input.fallback, undoStack: [], undone: false };
  return {
    fields: previous.fields,
    drafts: previous.drafts,
    undoStack: input.undoStack.slice(0, -1),
    undone: true,
  };
}

function mergeServerDrafts(current: AirshipSingleSiteImprovementDraft[], serverDraftEdits: AirshipSingleSiteImprovementDraft[]): AirshipSingleSiteImprovementDraft[] {
  return current.map((draft) => {
    const serverDraft = serverDraftEdits.find((item) => item.id === draft.id);
    return serverDraft ? { ...draft, proposedTextContent: serverDraft.proposedTextContent, status: serverDraft.status } : draft;
  });
}

export function AirshipSingleSiteVisualEditorWorkspace(props: Props) {
  const initialFieldsRef = useRef<AirshipHeroEditorFields | null>(null);
  if (!initialFieldsRef.current) {
    initialFieldsRef.current = initialAirshipHeroEditorFields(props.draftPreview, props.persistence.styleSettings);
  }
  const [fields, setFields] = useState(() => initialFieldsRef.current as AirshipHeroEditorFields);
  const [savedFields, setSavedFields] = useState(() => initialFieldsRef.current as AirshipHeroEditorFields);
  const [editableDrafts, setEditableDrafts] = useState(() => props.drafts);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>(() =>
    props.persistence.lastSavedAt
      ? [{
          id: `loaded:${props.persistence.lastSavedAt}`,
          label: "Loaded saved Airship draft",
          scope: "draft",
          state: "saved",
          createdAt: props.persistence.lastSavedAt,
        }]
      : [],
  );
  const [busy, setBusy] = useState(false);
  const [command, setCommand] = useState("");
  const [message, setMessage] = useState(() =>
    `${props.persistence.label}. Draft editor. Internal preview only. Not live. Not published.`,
  );
  const [saveState, setSaveState] = useState<DraftSaveState>(() => props.persistence.draftId ? "saved" : "unsaved");
  const [draftMeta, setDraftMeta] = useState(() => props.persistence);
  const [previewCandidate, setPreviewCandidate] = useState<PreviewCandidateState | null>(() => props.draftCandidate);
  const [candidateApplyState, setCandidateApplyState] = useState<CandidateApplyState>("idle");
  const [providerStatus] = useState(() => props.aiProviderStatus);
  const [selectedSection, setSelectedSection] = useState<EditorSectionKey>("hero");
  const [viewport, setViewport] = useState<EditorViewportKey>("desktop");
  const [canvasZoom, setCanvasZoom] = useState(0.86);
  const [selectedTool, setSelectedTool] = useState<EditorToolKey>("select");
  const [inspectorTab, setInspectorTab] = useState<InspectorTabKey>("agent");
  const [artifactCanvasMeasuredHeight, setArtifactCanvasMeasuredHeight] = useState<number | null>(null);
  const [artifactOverlayRects, setArtifactOverlayRects] = useState<Partial<Record<Exclude<EditorSectionKey, "source">, AirshipArtifactOverlayRect>>>({});
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const artifactIframeRef = useRef<HTMLIFrameElement | null>(null);
  const savedFieldsRef = useRef(savedFields);
  const savedStyleKeyRef = useRef(styleKey(initialFieldsRef.current));
  const styleSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styleSaveRequestRef = useRef(0);
  const selectedViewport = viewportOptions.find((option) => option.key === viewport) ?? viewportOptions[0];
  const sectionOptions = props.importedSiteModel?.editableSections.length ? props.importedSiteModel.editableSections : fallbackSectionOptions;
  const selectedSectionLabel = sectionOptions.find((section) => section.key === selectedSection)?.label ?? "Hero / intro";
  const previewSections = props.draftPreview.sections ?? [];
  const selectedElementMetadata = deriveAirshipSelectedElementMetadata({
    section: selectedSection,
    migrationId: props.migrationId,
    importedSite: props.importedSite,
    sourceUrl: props.sourceUrl,
    liveSiteUrl: props.liveSiteUrl,
    viewportLabel: selectedViewport.label,
    viewportWidth: selectedViewport.width,
    draftMeta,
    draftCandidate: previewCandidate,
    editableSections: sectionOptions,
  });
  const selectedStyleValueRows = deriveAirshipStyleValueRows(selectedSection, fields);
  const previewHostUrl = props.demoReadiness?.demoUrl ?? sameSitePreviewHost({
    importedSite: props.importedSite,
    previewUrl: props.importedSiteModel?.latestInternalPreviewHost?.previewUrl,
  });
  const previewHostLabel = props.demoReadiness ? "GNR8 demo preview" : "Latest GNR8 preview host";
  const artifactCanvasRender = props.artifactCanvasRender ?? null;
  const artifactCanvasFallbackHeight = artifactCanvasHeight(viewport);
  const artifactCanvasFrameHeight = artifactCanvasMeasuredHeight ?? artifactCanvasFallbackHeight;
  const zoomPercent = `${Math.round(canvasZoom * 100)}%`;
  const scaledCanvasWidth = Math.ceil(selectedViewport.width * canvasZoom);
  const canApplySavedDraftToPreview = airshipCanApplySavedDraftToPreview({
    migrationId: props.migrationId,
    draftId: draftMeta.draftId,
    saveState,
    busy,
    candidateApplyState,
  });

  const selectedDrafts = useMemo(
    () => {
      const ids = new Set(sectionOptions.find((section) => section.key === selectedSection)?.mappedDraftFieldIds ?? mappedAirshipDraftFieldIdsForSection(selectedSection, editableDrafts));
      return editableDrafts.filter((draft) => ids.has(draft.id));
    },
    [editableDrafts, sectionOptions, selectedSection],
  );

  useEffect(() => {
    savedFieldsRef.current = savedFields;
  }, [savedFields]);

  function recordChange(change: Omit<RecentChange, "id" | "createdAt">) {
    setRecentChanges((current) => [
      {
        ...change,
        id: `${Date.now()}:${change.scope}:${change.label}`,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 5));
  }

  function rememberUndoSnapshot() {
    setUndoStack((current) => [...current, { fields, drafts: editableDrafts }].slice(-12));
  }

  function markLocalChange(messageText: string, change: Omit<RecentChange, "id" | "createdAt">) {
    setSaveState("unsaved");
    setMessage(messageText);
    recordChange(change);
  }

  function updateSavedFields(nextSavedFields: AirshipHeroEditorFields, currentFields: AirshipHeroEditorFields) {
    savedFieldsRef.current = nextSavedFields;
    setSavedFields(nextSavedFields);
    setSaveState(deriveAirshipDraftSaveState({ fields: currentFields, savedFields: nextSavedFields }));
  }

  function selectSection(section: EditorSectionKey) {
    setSelectedTool("select");
    setSelectedSection(section);
  }

  function selectTool(tool: EditorToolKey) {
    setSelectedTool(tool);
    if (tool === "text") setInspectorTab("edit");
  }

  function updateTextField(field: TextFieldKey, value: string) {
    rememberUndoSnapshot();
    const edited = applyAirshipHeroTextFieldEdit({
      fields,
      drafts: editableDrafts,
      field,
      value,
    });
    setFields(edited.fields);
    setEditableDrafts(edited.drafts);
    markLocalChange(`${selectedSectionLabel} text changed locally. Save draft before generating an internal preview.`, {
      label: `Edited ${field}`,
      scope: "text",
      state: "local",
    });
  }

  function updateMappedDraftText(draftId: string, proposedTextContent: string) {
    rememberUndoSnapshot();
    setEditableDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              proposedTextContent,
              status: draft.status === "accepted" || draft.status === "rejected" || draft.status === "proposed" ? "edited" : draft.status,
            }
          : draft,
      ),
    );
    markLocalChange(`${selectedSectionLabel} draft content changed locally. Save draft before generating an internal preview.`, {
      label: `Edited ${selectedSectionLabel}`,
      scope: "text",
      state: "local",
    });
  }

  function updateStyleField(field: StyleFieldKey, value: string | number) {
    rememberUndoSnapshot();
    setFields((current) => ({
      ...current,
      [field]: field === "topPadding" || field === "bottomPadding" ? clampSpacing(Number(value)) : String(value),
    }));
    markLocalChange(`${selectedSectionLabel} style changed locally. Autosaving to Airship draft only.`, {
      label: `Edited ${field}`,
      scope: "style",
      state: "local",
    });
  }

  const measureArtifactCanvas = useCallback(() => {
    const iframe = artifactIframeRef.current;
    let doc: Document | null | undefined = null;
    try {
      doc = iframe?.contentDocument;
    } catch {
      doc = null;
    }
    if (!iframe || !doc) {
      setArtifactCanvasMeasuredHeight(null);
      setArtifactOverlayRects({});
      return;
    }

    const nextHeight = measuredAirshipArtifactCanvasHeight({
      documentElementScrollHeight: doc.documentElement?.scrollHeight,
      bodyScrollHeight: doc.body?.scrollHeight,
      bodyOffsetHeight: doc.body?.offsetHeight,
      fallbackHeight: artifactCanvasFallbackHeight,
    });
    const scrollX = doc.defaultView?.scrollX ?? doc.documentElement?.scrollLeft ?? doc.body?.scrollLeft ?? 0;
    const scrollY = doc.defaultView?.scrollY ?? doc.documentElement?.scrollTop ?? doc.body?.scrollTop ?? 0;
    const iframeRect = iframe.getBoundingClientRect();
    const overlayHostRect = iframe.parentElement?.getBoundingClientRect() ?? iframeRect;
    const nextRects: Partial<Record<Exclude<EditorSectionKey, "source">, AirshipArtifactOverlayRect>> = {};

    for (const section of artifactCanvasSections) {
      const element = doc.querySelector(airshipArtifactSectionSelector(section));
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const overlayRect = airshipArtifactOverlayRectFromDomRect({
        iframeElementRect: iframeRect,
        overlayHostElementRect: overlayHostRect,
        targetElementRect: rect,
        zoomScale: canvasZoom,
        iframeScrollX: scrollX,
        iframeScrollY: scrollY,
      });
      if (overlayRect) nextRects[section] = overlayRect;
    }

    setArtifactCanvasMeasuredHeight(nextHeight);
    setArtifactOverlayRects(nextRects);
  }, [artifactCanvasFallbackHeight, canvasZoom]);

  useEffect(() => {
    if (!artifactCanvasRender) {
      setArtifactCanvasMeasuredHeight(null);
      setArtifactOverlayRects({});
      return undefined;
    }
    setArtifactCanvasMeasuredHeight(artifactCanvasFallbackHeight);
    setArtifactOverlayRects({});
    const timers = [
      window.setTimeout(measureArtifactCanvas, 0),
      window.setTimeout(measureArtifactCanvas, 120),
      window.setTimeout(measureArtifactCanvas, 600),
    ];
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [artifactCanvasRender, artifactCanvasFallbackHeight, measureArtifactCanvas]);

  function artifactOverlayStyle(section: Exclude<EditorSectionKey, "source">): CSSProperties {
    const rect = artifactOverlayRects[section];
    if (!rect) return artifactSectionBandStyle(section);
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  const fitCanvasWidth = useCallback(() => {
    const canvasWidth = canvasScrollRef.current?.clientWidth ?? (typeof window === "undefined" ? selectedViewport.width : window.innerWidth);
    const inspectorReserve = typeof window !== "undefined" && window.innerWidth > 1220 ? 408 : 0;
    const availableWidth = Math.max(220, canvasWidth - inspectorReserve - 72);
    setCanvasZoom(clampCanvasZoom(Math.min(1, availableWidth / selectedViewport.width)));
  }, [selectedViewport.width]);

  useEffect(() => {
    fitCanvasWidth();
  }, [fitCanvasWidth, viewport]);

  function zoomCanvas(delta: number) {
    setCanvasZoom((current) => clampCanvasZoom(current + delta));
  }

  function clearPendingStyleSave() {
    styleSaveRequestRef.current += 1;
    if (styleSaveTimeoutRef.current) {
      clearTimeout(styleSaveTimeoutRef.current);
      styleSaveTimeoutRef.current = null;
    }
  }

  function draftMetaFromSavedDraft(
    draft: NonNullable<DraftActionResponse["draft"]>,
    styleSettings: AirshipSingleSiteDraftStyleSettings,
  ): Props["persistence"] {
    return {
      label: "Saved Airship draft",
      draftId: draft.id,
      draftStatus: draft.draftStatus,
      version: draft.version,
      lastSavedAt: draft.updatedAt,
      styleSettings,
      notAppliedToLiveSite: true,
      notPublished: true,
    };
  }

  async function saveDraftText(draftId: string, proposedTextContent: string): Promise<NonNullable<DraftActionResponse["draft"]>> {
    if (!props.migrationId) throw new Error("airship_migration_id_missing");
    const response = await fetch("/api/gnr8/admin/airship/single-site/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actionMode: "update_edit",
        migrationId: props.migrationId,
        draftEditId: draftId,
        proposedTextContent,
      }),
    });
    const payload = await response.json() as DraftActionResponse;
    if (!response.ok || !payload.ok || !payload.draft) throw new Error(payload.error || "airship_draft_action_failed");
    setEditableDrafts((current) => mergeServerDrafts(current, payload.draft?.draftEdits ?? []));
    const savedStyleSettings = payload.draft.metadata?.styleSettings as AirshipSingleSiteDraftStyleSettings | undefined;
    setDraftMeta(draftMetaFromSavedDraft(payload.draft, savedStyleSettings ?? draftMeta.styleSettings));
    return payload.draft;
  }

  const saveStyleSettings = useCallback(async (nextFields: AirshipHeroEditorFields): Promise<NonNullable<DraftActionResponse["draft"]>> => {
    if (!props.migrationId) throw new Error("airship_migration_id_missing");
    const response = await fetch("/api/gnr8/admin/airship/single-site/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actionMode: "update_style_settings",
        migrationId: props.migrationId,
        styleSettings: {
          heroTopPadding: nextFields.topPadding,
          heroBottomPadding: nextFields.bottomPadding,
          backgroundTint: nextFields.backgroundTint,
          ctaColor: nextFields.ctaColor,
        },
      }),
    });
    const payload = await response.json() as DraftActionResponse;
    if (!response.ok || !payload.ok || !payload.draft) throw new Error(payload.error || "airship_draft_style_save_failed");
    const savedStyleSettings = payload.draft.metadata?.styleSettings as AirshipSingleSiteDraftStyleSettings | undefined;
    const nextStyleSettings = savedStyleSettings ?? {
      heroTopPadding: nextFields.topPadding,
      heroBottomPadding: nextFields.bottomPadding,
      backgroundTint: nextFields.backgroundTint as AirshipSingleSiteDraftStyleSettings["backgroundTint"],
      ctaColor: nextFields.ctaColor as AirshipSingleSiteDraftStyleSettings["ctaColor"],
    };
    setDraftMeta(draftMetaFromSavedDraft(payload.draft, nextStyleSettings));
    const nextSavedFields = {
      ...savedFieldsRef.current,
      topPadding: nextStyleSettings.heroTopPadding,
      bottomPadding: nextStyleSettings.heroBottomPadding,
      backgroundTint: nextStyleSettings.backgroundTint,
      ctaColor: nextStyleSettings.ctaColor,
    };
    savedStyleKeyRef.current = styleKey(nextSavedFields);
    updateSavedFields(nextSavedFields, nextFields);
    recordChange({
      label: "Style saved to Airship draft",
      scope: "style",
      state: "saved",
    });
    return payload.draft;
  }, [props.migrationId]);

  useEffect(() => {
    const nextStyleKey = styleKey(fields);
    if (nextStyleKey === savedStyleKeyRef.current) return undefined;
    if (styleSaveTimeoutRef.current) clearTimeout(styleSaveTimeoutRef.current);
    const requestId = styleSaveRequestRef.current + 1;
    styleSaveRequestRef.current = requestId;
    styleSaveTimeoutRef.current = setTimeout(() => {
      setSaveState("saving");
      setMessage("Saving style changes to Airship draft only...");
      void saveStyleSettings(fields)
        .then(() => {
          if (requestId === styleSaveRequestRef.current) setMessage(STYLE_DRAFT_SAVED_MESSAGE);
        })
        .catch(() => {
          if (requestId === styleSaveRequestRef.current) {
            setSaveState("failed");
            setMessage("Airship style save failed. Editor preview changed locally only; no live site changes were made.");
          }
        });
    }, 350);
    return () => {
      if (styleSaveTimeoutRef.current) clearTimeout(styleSaveTimeoutRef.current);
    };
  }, [fields, saveStyleSettings]);

  async function saveAllTextEdits(nextFields = fields, changedFields: Array<"headline" | "subheading" | "ctaLabel"> = ["headline", "subheading", "ctaLabel"]) {
    setBusy(true);
    setSaveState("saving");
    setMessage("Saving changes to Airship draft only...");
    try {
      clearPendingStyleSave();
      let latestDraft: NonNullable<DraftActionResponse["draft"]> | null = null;
      for (const field of changedFields) {
        const draftId = draftIdForField(field, editableDrafts);
        if (!draftId) continue;
        latestDraft = await saveDraftText(draftId, nextFields[field]);
      }
      for (const draft of editableDrafts) {
        if (draftFieldKey(draft)) continue;
        latestDraft = await saveDraftText(draft.id, draft.proposedTextContent);
      }
      if (styleKey(nextFields) !== savedStyleKeyRef.current) {
        latestDraft = await saveStyleSettings(nextFields);
      }
      const nextSavedFields = {
        ...savedFieldsRef.current,
        headline: nextFields.headline,
        subheading: nextFields.subheading,
        ctaLabel: nextFields.ctaLabel,
      };
      updateSavedFields(nextSavedFields, nextFields);
      recordChange({
        label: latestDraft ? "Text saved to Airship draft" : "Text save confirmed",
        scope: "text",
        state: "saved",
      });
      setMessage("Changes are saved to Airship draft only. Not live. Not published.");
    } catch {
      setSaveState("failed");
      setMessage("Airship draft save failed. Editor preview changed locally only; no live site changes were made.");
    } finally {
      setBusy(false);
    }
  }

  async function createInternalPreviewCandidate() {
    if (!canApplySavedDraftToPreview) {
      setMessage("Save the Airship draft first, then create the internal preview candidate. Not live. Not published.");
      return;
    }
    clearPendingStyleSave();
    if (styleKey(fields) !== savedStyleKeyRef.current) {
      setSaveState("saving");
      setMessage("Saving style changes to Airship draft only before creating the internal preview candidate...");
      try {
        await saveStyleSettings(fields);
      } catch {
        setCandidateApplyState("failed");
        setSaveState("failed");
        setMessage("Airship style save failed. Internal preview candidate was not created; no live site or active pointer changed.");
        return;
      }
    }
    if (deriveAirshipDraftSaveState({ fields, savedFields: savedFieldsRef.current }) !== "saved") {
      setSaveState("unsaved");
      setMessage("Save the Airship draft first, then create the internal preview candidate. Not live. Not published.");
      return;
    }
    setCandidateApplyState("creating");
    setMessage("Creating internal preview candidate from the saved Airship draft...");
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/draft-candidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode: "create_internal_preview_candidate",
          migrationId: props.migrationId,
          idempotencyKey: `airship-preview-candidate:${props.migrationId}:${draftMeta.draftId}:${draftMeta.version ?? "unknown"}`,
        }),
      });
      const payload = await response.json() as DraftCandidateActionResponse;
      if (!response.ok || !payload.ok || !payload.candidate) throw new Error(payload.error || "airship_preview_candidate_failed");
      setPreviewCandidate(payload.candidate);
      setCandidateApplyState("created");
      setMessage(
        payload.candidate.status === "reused"
          ? `Reused internal preview candidate for saved draft v${payload.candidate.draftVersion}. Not live. Not published.`
          : `Created internal preview candidate for saved draft v${payload.candidate.draftVersion}. Not live. Not published.`,
      );
      recordChange({
        label: "Created internal preview candidate",
        scope: "draft",
        state: "saved",
      });
    } catch {
      setCandidateApplyState("failed");
      setMessage("Internal preview candidate creation failed. No live site or active pointer changed.");
    }
  }

  function applyCommandResult(result: AirshipCommandResult) {
    if (!result.supported) {
      setMessage(result.message);
      return false;
    }
    rememberUndoSnapshot();
    setFields(result.fields);
    for (const field of result.changedTextFields) {
      const draftId = draftIdForField(field, editableDrafts);
      if (!draftId) continue;
      const proposedTextContent = result.fields[field];
      setEditableDrafts((current) =>
        current.map((draft) => draft.id === draftId ? { ...draft, proposedTextContent, status: draft.status === "accepted" || draft.status === "rejected" || draft.status === "proposed" ? "edited" : draft.status } : draft),
      );
    }
    markLocalChange(result.message, {
      label: "AI command changed draft preview",
      scope: "command",
      state: "local",
    });
    return true;
  }

  async function runDeterministicCommand() {
    const result = applyAirshipHeroCommand(fields, command);
    const shouldSave = applyCommandResult(result);
    if (!shouldSave) {
      if (!isAirshipOpenAIProviderConnected(providerStatus)) setMessage(CONNECT_OPENAI_MESSAGE);
      return false;
    }
    if (result.changedTextFields.length > 0) {
      await saveAllTextEdits(result.fields, result.changedTextFields);
    }
    return true;
  }

  async function runCommand() {
    if (!command.trim()) return;
    const applied = await runDeterministicCommand();
    if (applied && isAirshipOpenAIProviderConnected(providerStatus)) {
      setMessage("Applied local Airship command only. OpenAI command execution is disabled in this editor shell while quota is blocked.");
    }
    setCommand("");
  }

  function undoLastLocalChange() {
    const undone = undoAirshipEditorLastLocalChange({
      undoStack,
      fallback: { fields, drafts: editableDrafts },
    });
    if (!undone.undone) {
      setMessage("No local change to undo. Airship draft storage and live site were not touched.");
      return;
    }
    clearPendingStyleSave();
    setUndoStack(undone.undoStack);
    setFields(undone.fields);
    setEditableDrafts(undone.drafts);
    setSaveState(deriveAirshipDraftSaveState({ fields: undone.fields, savedFields: savedFieldsRef.current }));
    setMessage("Undid the last local editor change. Not live. Not published.");
    recordChange({
      label: "Undid last local change",
      scope: "undo",
      state: "local",
    });
  }

  function resetSelectedSectionText() {
    const reset = resetAirshipSectionTextToSavedValues({
      section: selectedSection,
      fields,
      drafts: editableDrafts,
      savedFields: savedFieldsRef.current,
    });
    if (reset.changedFields.length === 0) {
      setMessage(`${selectedSectionLabel} text already matches saved Airship draft values.`);
      return;
    }
    rememberUndoSnapshot();
    setFields(reset.fields);
    setEditableDrafts(reset.drafts);
    setSaveState(deriveAirshipDraftSaveState({ fields: reset.fields, savedFields: savedFieldsRef.current }));
    setMessage(`Reset ${selectedSectionLabel} text to saved Airship draft values. Not live. Not published.`);
    recordChange({
      label: `Reset ${selectedSectionLabel} text to saved values`,
      scope: "reset",
      state: "local",
    });
  }

  function resetSelectedSectionStyle() {
    const reset = resetAirshipSectionStyleToSavedValues({
      section: selectedSection,
      fields,
      drafts: editableDrafts,
      savedFields: savedFieldsRef.current,
    });
    if (reset.changedFields.length === 0) {
      setMessage(`${selectedSectionLabel} style already matches saved Airship draft values.`);
      return;
    }
    rememberUndoSnapshot();
    clearPendingStyleSave();
    setFields(reset.fields);
    setEditableDrafts(reset.drafts);
    setSaveState(deriveAirshipDraftSaveState({ fields: reset.fields, savedFields: savedFieldsRef.current }));
    setMessage(`Reset ${selectedSectionLabel} style to saved Airship draft values. Not live. Not published.`);
    recordChange({
      label: `Reset ${selectedSectionLabel} style to saved values`,
      scope: "reset",
      state: "local",
    });
  }

  return (
    <main className="airship-workspace">
      <style>{`
        .airship-workspace {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          height: calc(100vh - 76px);
          min-height: 0;
          width: 100%;
          max-width: 100vw;
          overflow: hidden;
          background: #e2e8f0;
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .airship-workspace *,
        .airship-workspace *::before,
        .airship-workspace *::after {
          box-sizing: border-box;
        }
        .airship-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          min-width: 0;
          min-height: 48px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(248, 250, 252, 0.9);
          padding: 7px 12px;
          backdrop-filter: blur(12px);
        }
        .airship-toolbar-group {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 0;
          flex-wrap: wrap;
        }
        .airship-title {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .airship-title h1 {
          margin: 0;
          overflow: hidden;
          color: #0f172a;
          font-size: 16px;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .airship-kicker {
          color: #475569;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.2;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .airship-device-toggle {
          display: inline-grid;
          grid-auto-flow: column;
          gap: 4px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          padding: 3px;
          flex: 0 0 auto;
        }
        .airship-shell {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          min-height: 0;
          overflow: hidden;
        }
        .airship-muted {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
        }
        .airship-canvas {
          position: relative;
          min-width: 0;
          overflow: hidden;
          background:
            linear-gradient(#cbd5e1 1px, transparent 1px),
            linear-gradient(90deg, #cbd5e1 1px, transparent 1px),
            #eef2f7;
          background-size: 28px 28px;
        }
        .airship-canvas-scroll {
          display: block;
          gap: 12px;
          height: 100%;
          min-width: 0;
          overflow: auto;
          padding: 20px 408px 126px 28px;
          box-sizing: border-box;
        }
        .airship-canvas-stage {
          display: grid;
          justify-items: center;
          align-content: start;
          gap: 12px;
          width: max-content;
          min-width: 100%;
        }
        .airship-canvas-bar {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          width: min(100%, 1100px);
          margin: 0 auto;
          max-width: 1100px;
          flex-wrap: wrap;
        }
        .airship-canvas-zoom-shell {
          display: block;
          transform-origin: top left;
        }
        .airship-frame-shell {
          width: var(--airship-frame-width);
          margin: 0 auto;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          background: #0f172a;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          overflow: hidden;
          transform: scale(var(--airship-canvas-zoom));
          transform-origin: top left;
        }
        .airship-frame-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          min-height: 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          padding: 0 12px;
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 800;
        }
        .airship-frame-page {
          min-height: 100%;
          overflow: visible;
          background: #ffffff;
        }
        .airship-artifact-canvas-frame {
          position: relative;
          min-height: var(--airship-artifact-canvas-height);
          background: #ffffff;
          overflow: hidden;
        }
        .airship-artifact-canvas-frame iframe {
          display: block;
          width: 100%;
          height: var(--airship-artifact-canvas-height);
          border: 0;
          background: #ffffff;
          pointer-events: none;
        }
        .airship-artifact-overlay {
          position: absolute;
          z-index: 2;
          border: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          outline: none;
        }
        .airship-artifact-overlay[data-selected="true"] {
          border-color: #1d4ed8;
          background: rgba(29, 78, 216, 0.055);
          box-shadow: inset 0 0 0 9999px rgba(29, 78, 216, 0.025);
        }
        .airship-artifact-overlay .airship-selection-chip {
          top: 12px;
          left: 12px;
        }
        .airship-artifact-source-strip {
          position: relative;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          width: 100%;
          border: 0;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 12px 16px;
          color: #0f172a;
          cursor: pointer;
          text-align: left;
        }
        .airship-artifact-source-strip[data-selected="true"] {
          outline: 2px solid #1d4ed8;
          outline-offset: -2px;
          background: #eff6ff;
          padding-top: 54px;
        }
        .airship-preview-hero {
          position: relative;
          display: grid;
          align-content: center;
          gap: 18px;
          min-height: 498px;
          outline: 2px solid transparent;
          outline-offset: -2px;
          transition: outline-color 120ms ease, box-shadow 120ms ease;
        }
        .airship-preview-hero[data-selected="true"] {
          outline-color: #1d4ed8;
          box-shadow: inset 0 0 0 9999px rgba(29, 78, 216, 0.025);
        }
        .airship-selection-chip {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2;
          display: grid;
          gap: 2px;
          max-width: min(310px, calc(100% - 24px));
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 5px 7px;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.2;
          pointer-events: none;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
        }
        .airship-selection-chip strong {
          color: #1e40af;
          font-size: 11px;
          line-height: 1.2;
        }
        .airship-selection-chip span {
          min-width: 0;
          overflow-wrap: anywhere;
          color: #334155;
          font-size: 10px;
          line-height: 1.25;
        }
        .airship-preview-eyebrow {
          color: #0f766e;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .airship-preview-headline {
          margin: 0;
          max-width: 820px;
          color: #0f172a;
          font-size: 46px;
          line-height: 1.04;
        }
        .airship-preview-copy {
          margin: 0;
          max-width: 760px;
          color: #334155;
          font-size: 18px;
          line-height: 1.55;
        }
        .airship-cta-row {
          position: relative;
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          width: fit-content;
          max-width: 100%;
          outline: 2px solid transparent;
          outline-offset: 6px;
          border-radius: 8px;
          transition: outline-color 120ms ease, box-shadow 120ms ease;
        }
        .airship-cta-row[data-selected="true"] {
          outline-color: #1d4ed8;
          box-shadow: 0 0 0 6px rgba(29, 78, 216, 0.08);
        }
        .airship-cta-row .airship-selection-chip {
          top: -60px;
          left: 0;
        }
        .airship-preview-cta {
          display: inline-flex;
          border-radius: 8px;
          color: #ffffff;
          padding: 12px 15px;
          font-size: 14px;
          font-weight: 900;
          outline: 2px solid transparent;
          outline-offset: 3px;
          cursor: pointer;
        }
        .airship-preview-cta[data-selected="true"] {
          outline-color: #1d4ed8;
        }
        .airship-source-strip {
          position: relative;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          width: 100%;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 12px 16px;
          cursor: pointer;
          outline: 2px solid transparent;
          outline-offset: -2px;
          text-align: left;
        }
        .airship-source-strip[data-selected="true"] {
          outline-color: #1d4ed8;
          background: #eff6ff;
          padding-top: 54px;
        }
        .airship-preview-section {
          position: relative;
          display: grid;
          gap: 12px;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 34px 44px;
          cursor: pointer;
          outline: 2px solid transparent;
          outline-offset: -2px;
        }
        .airship-preview-section[data-selected="true"] {
          outline-color: #1d4ed8;
          background: #f8fbff;
          padding-top: 58px;
        }
        .airship-preview-section h3 {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
          line-height: 1.22;
        }
        .airship-preview-section p {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.55;
        }
        .airship-preview-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .airship-preview-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          padding: 12px;
          color: #334155;
          font-size: 13px;
          line-height: 1.45;
        }
        .airship-inspector {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 3;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          width: 388px;
          max-width: calc(100vw - 132px);
          max-height: calc(100% - 112px);
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 10px;
          background: rgba(34, 34, 35, 0.96);
          color: #e2e8f0;
          box-shadow: 0 26px 72px rgba(2, 6, 23, 0.34);
          backdrop-filter: blur(18px);
        }
        .airship-inspector-header {
          display: grid;
          gap: 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          padding: 0;
        }
        .airship-inspector-titlebar {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          min-width: 0;
          padding: 12px 14px;
        }
        .airship-inspector-titlebar h2 {
          margin: 0;
          min-width: 0;
          overflow: hidden;
          color: #f8fafc;
          font-size: 14px;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .airship-inspector-titlebar .airship-muted,
        .airship-inspector .airship-muted {
          color: #94a3b8;
        }
        .airship-inspector-tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.1);
          padding: 0;
        }
        .airship-inspector-tab {
          min-width: 0;
          border: 0;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          background: transparent;
          color: #94a3b8;
          padding: 12px 6px 10px;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.2;
          cursor: pointer;
        }
        .airship-inspector-tab[data-selected="true"] {
          border-bottom-color: #0ea5e9;
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
          box-shadow: none;
        }
        .airship-inspector-body {
          min-height: 0;
          overflow: auto;
          padding: 14px;
        }
        .airship-inspector-content {
          display: grid;
          gap: 13px;
          align-content: start;
        }
        .airship-tab-panel {
          display: none;
        }
        .airship-tab-panel[data-active="true"] {
          display: grid;
          gap: 13px;
          align-content: start;
        }
        .airship-control-group {
          display: grid;
          gap: 10px;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
          padding-top: 12px;
        }
        .airship-two-up {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .airship-status {
          border: 1px solid rgba(56, 189, 248, 0.22);
          border-radius: 8px;
          background: rgba(14, 165, 233, 0.1);
          color: #bae6fd;
          padding: 10px;
          font-size: 12px;
          line-height: 1.45;
        }
        .airship-save-panel {
          display: grid;
          gap: 8px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          padding: 10px;
        }
        .airship-save-row,
        .airship-change-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .airship-scope-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .airship-scope-cell {
          display: grid;
          gap: 3px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.42);
          padding: 8px;
          min-width: 0;
        }
        .airship-scope-cell strong,
        .airship-change-row strong {
          color: #f8fafc;
          font-size: 12px;
          line-height: 1.25;
        }
        .airship-scope-cell span,
        .airship-change-row span {
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.35;
        }
        .airship-change-list {
          display: grid;
          gap: 7px;
        }
        .airship-control-note {
          display: inline-flex;
          width: fit-content;
          border: 1px solid rgba(56, 189, 248, 0.24);
          border-radius: 8px;
          background: rgba(14, 165, 233, 0.12);
          color: #bae6fd;
          padding: 3px 7px;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.2;
        }
        .airship-details {
          display: grid;
          gap: 8px;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
        }
        .airship-details summary {
          color: #334155;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }
        .airship-detail-list {
          display: grid;
          gap: 6px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .airship-detail-row {
          display: grid;
          grid-template-columns: minmax(92px, 0.38fr) minmax(0, 1fr);
          gap: 8px;
          min-width: 0;
        }
        .airship-detail-row strong {
          color: #334155;
          font-size: 12px;
          line-height: 1.35;
        }
        .airship-detail-row span,
        .airship-detail-row code {
          min-width: 0;
          overflow-wrap: anywhere;
          color: #64748b;
          font-size: 12px;
          line-height: 1.35;
        }
        .airship-value-list {
          display: grid;
          gap: 6px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          padding: 8px;
        }
        .airship-inspector .airship-details {
          border-top-color: rgba(148, 163, 184, 0.18);
        }
        .airship-inspector .airship-details summary {
          color: #cbd5e1;
        }
        .airship-inspector .airship-detail-list {
          color: #94a3b8;
        }
        .airship-inspector .airship-detail-row strong {
          color: #cbd5e1;
        }
        .airship-inspector .airship-detail-row span,
        .airship-inspector .airship-detail-row code {
          color: #94a3b8;
        }
        .airship-inspector .airship-value-list {
          border-color: rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.42);
        }
        .airship-command-card {
          display: grid;
          gap: 10px;
          min-height: 208px;
          align-content: end;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
            rgba(15, 23, 42, 0.36);
          padding: 12px;
        }
        .airship-agent-transcript {
          display: grid;
          gap: 8px;
          align-content: start;
        }
        .airship-agent-bubble {
          width: fit-content;
          max-width: 88%;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          padding: 8px 10px;
          font-size: 13px;
          line-height: 1.35;
        }
        .airship-agent-step {
          color: #cbd5e1;
          font-size: 12px;
          line-height: 1.45;
        }
        .airship-agent-step strong {
          color: #f8fafc;
        }
        input[type="range"] {
          width: 100%;
        }
        .airship-inspector input::placeholder,
        .airship-inspector textarea::placeholder {
          color: #64748b;
        }
        .airship-bottom-toolbar {
          position: absolute;
          left: 50%;
          bottom: 18px;
          z-index: 4;
          display: flex;
          gap: 6px;
          align-items: center;
          max-width: calc(100% - 40px);
          overflow-x: auto;
          border: 1px solid rgba(148, 163, 184, 0.26);
          border-radius: 10px;
          background: rgba(34, 34, 35, 0.95);
          box-shadow: 0 18px 44px rgba(2, 6, 23, 0.26);
          padding: 6px;
          backdrop-filter: blur(16px);
          transform: translateX(-50%);
        }
        .airship-toolbar-separator {
          width: 1px;
          align-self: stretch;
          background: rgba(148, 163, 184, 0.22);
          flex: 0 0 auto;
        }
        @media (max-width: 1220px) {
          .airship-canvas-scroll {
            padding-right: 28px;
          }
          .airship-inspector {
            position: relative;
            inset: auto;
            grid-column: 1 / -1;
            width: auto;
            max-width: none;
            max-height: 430px;
            margin: 0 12px 88px;
          }
          .airship-shell {
            overflow: auto;
          }
        }
        @media (max-width: 760px) {
          .airship-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }
          .airship-shell {
            grid-template-columns: 1fr;
          }
          .airship-canvas-scroll {
            padding: 12px 12px 104px;
          }
          .airship-preview-headline {
            font-size: 34px;
          }
          .airship-preview-section {
            padding: 26px 22px;
          }
          .airship-preview-card-grid {
            grid-template-columns: 1fr;
          }
          .airship-bottom-toolbar {
            left: 12px;
            right: 12px;
            max-width: none;
            transform: none;
          }
        }
        .airship-workspace {
          grid-template-rows: 78px minmax(0, 1fr);
          background: #f6f6f5;
          color: #171717;
        }
        .airship-toolbar {
          min-height: 78px;
          border-bottom: 1px solid rgba(23, 23, 23, 0.05);
          background: rgba(246, 246, 245, 0.96);
          padding: 0 76px;
        }
        .airship-brand-link {
          display: inline-flex;
          align-items: center;
          gap: 18px;
          color: #171717;
          font-size: 30px;
          font-weight: 760;
          line-height: 1;
          text-decoration: none;
        }
        .airship-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          color: currentColor;
          font-size: 30px;
          font-weight: 950;
          line-height: 1;
        }
        .airship-shell,
        .airship-canvas {
          background: #f6f6f5;
        }
        .airship-canvas {
          background-image: none;
        }
        .airship-canvas-scroll {
          padding: 46px 620px 122px 98px;
        }
        .airship-canvas-stage {
          justify-items: start;
          width: max-content;
          min-width: 100%;
        }
        .airship-canvas-bar,
        .airship-frame-top {
          display: none;
        }
        .airship-frame-shell {
          border: 0;
          border-radius: 0;
          background: #ffffff;
          box-shadow: none;
        }
        .airship-artifact-canvas-frame,
        .airship-frame-page {
          background: #ffffff;
        }
        .airship-artifact-overlay[data-selected="true"],
        .airship-preview-hero[data-selected="true"],
        .airship-preview-section[data-selected="true"],
        .airship-source-strip[data-selected="true"],
        .airship-artifact-source-strip[data-selected="true"],
        .airship-cta-row[data-selected="true"],
        .airship-preview-cta[data-selected="true"] {
          outline-color: #149ce7;
          border-color: #149ce7;
          background: rgba(20, 156, 231, 0.035);
          box-shadow: none;
        }
        .airship-selection-chip {
          display: inline-flex;
          grid-template-columns: none;
          gap: 8px;
          align-items: center;
          border: 0;
          border-radius: 4px;
          background: #149ce7;
          color: #ffffff;
          padding: 5px 9px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
          font-weight: 760;
          box-shadow: none;
        }
        .airship-selection-chip strong,
        .airship-selection-chip span {
          color: #ffffff;
          font-size: inherit;
          line-height: 1.1;
        }
        .airship-selection-chip span:last-child {
          opacity: 0.85;
        }
        .airship-inspector {
          top: 20px;
          right: 34px;
          width: 546px;
          max-width: calc(100vw - 132px);
          max-height: calc(100% - 32px);
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 12px;
          background: #292929;
          color: #e7e7e7;
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
          backdrop-filter: none;
        }
        .airship-inspector-titlebar {
          min-height: 84px;
          padding: 0 42px;
        }
        .airship-inspector-title {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          color: #f4f4f4;
          font-size: 21px;
          font-weight: 760;
        }
        .airship-panel-actions {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          min-width: 0;
        }
        .airship-header-actions {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .airship-state-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          border: 1px solid rgba(23, 23, 23, 0.08);
          border-radius: 8px;
          background: #ffffff;
          color: #3f3f46;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 820;
          white-space: nowrap;
        }
        .airship-panel-pill {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.07);
          color: #d4d4d4;
        }
        .airship-shell-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          border: 1px solid rgba(23, 23, 23, 0.1);
          border-radius: 8px;
          background: #171717;
          color: #ffffff;
          padding: 0 11px;
          font-size: 12px;
          font-weight: 840;
          line-height: 1;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }
        .airship-shell-action[data-tone="secondary"] {
          background: #ffffff;
          color: #171717;
        }
        .airship-shell-action[data-dark="true"] {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          color: #f4f4f4;
        }
        .airship-shell-action[data-dark="true"][data-tone="primary"] {
          border-color: #149ce7;
          background: #149ce7;
          color: #ffffff;
        }
        .airship-shell-action:disabled,
        .airship-shell-action[aria-disabled="true"] {
          border-color: rgba(148, 163, 184, 0.14);
          background: rgba(148, 163, 184, 0.12);
          color: #8a8a8a;
          cursor: not-allowed;
        }
        .airship-inspector-tabs {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
        }
        .airship-inspector-tab {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 64px;
          border-bottom-width: 3px;
          color: #8f8f8f;
          padding: 0 10px;
          font-size: 22px;
          font-weight: 520;
        }
        .airship-inspector-tab[data-selected="true"] {
          border-bottom-color: #149ce7;
          background: transparent;
          color: #efefef;
        }
        .airship-tab-icon {
          color: currentColor;
          font-size: 21px;
          line-height: 1;
          opacity: 0.82;
        }
        .airship-inspector-body {
          padding: 0;
        }
        .airship-tab-panel[data-active="true"] {
          gap: 0;
        }
        .airship-panel-section {
          display: grid;
          gap: 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 22px 42px 30px;
        }
        .airship-panel-section:first-child {
          border-top: 0;
        }
        .airship-panel-heading,
        .airship-row-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #909090;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 17px;
          font-weight: 760;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .airship-panel-value {
          color: #9c9c9c;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 18px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }
        .airship-icon-row {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          gap: 2px;
          color: #a4a4a4;
          font-size: 28px;
        }
        .airship-icon-row span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
        }
        .airship-size-grid,
        .airship-appearance-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 42px;
          color: #e0e0e0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 21px;
        }
        .airship-size-grid span,
        .airship-appearance-grid span {
          color: #777;
          font-size: 16px;
          margin-right: 14px;
        }
        .airship-collapsed-row {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 18px 42px;
        }
        .airship-fill-row {
          display: grid;
          grid-template-columns: 42px 1fr auto auto;
          gap: 28px;
          align-items: center;
          color: #e5e5e5;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 20px;
        }
        .airship-fill-swatch {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          background: var(--airship-swatch);
        }
        .airship-agent-panel {
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          min-height: 0;
          height: 100%;
        }
        .airship-agent-transcript-shell {
          display: grid;
          align-content: start;
          gap: 32px;
          min-height: 0;
          padding: 34px 42px;
        }
        .airship-agent-user-bubble {
          justify-self: end;
          max-width: 76%;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #f2f2f2;
          padding: 15px 20px;
          font-size: 24px;
          line-height: 1.2;
        }
        .airship-agent-result {
          display: grid;
          gap: 14px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 20px 22px;
          color: #a8a8a8;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 18px;
          line-height: 1.35;
        }
        .airship-agent-step {
          color: #a7a7a7;
          font-size: 18px;
        }
        .airship-agent-step strong {
          color: #f0f0f0;
        }
        .airship-diff-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: #202020;
        }
        .airship-diff-header {
          background: rgba(255, 255, 255, 0.06);
          padding: 11px 16px;
          color: #efefef;
          font-weight: 760;
        }
        .airship-diff-line {
          padding: 7px 16px;
        }
        .airship-diff-line[data-tone="remove"] {
          background: rgba(239, 68, 68, 0.24);
          color: #ff7d7d;
        }
        .airship-diff-line[data-tone="add"] {
          background: rgba(34, 197, 94, 0.22);
          color: #4ade80;
        }
        .airship-agent-input-shell {
          display: grid;
          gap: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 22px 34px;
        }
        .airship-selected-element-token {
          width: fit-content;
          max-width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #d8d8d8;
          padding: 8px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 18px;
          overflow-wrap: anywhere;
        }
        .airship-agent-input-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 42px;
          gap: 10px;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(24, 24, 24, 0.7);
          padding: 8px 8px 8px 14px;
        }
        .airship-agent-input-row textarea {
          min-height: 42px;
          max-height: 96px;
          border: 0;
          background: transparent;
          color: #f1f1f1;
          resize: none;
          outline: none;
          font: inherit;
          font-size: 20px;
        }
        .airship-agent-input-row button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.07);
          color: #a7a7a7;
          cursor: pointer;
        }
        .airship-field-grid {
          display: grid;
          gap: 12px;
        }
        .airship-field-label {
          display: grid;
          gap: 7px;
          color: #a8a8a8;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 13px;
          font-weight: 760;
          line-height: 1.25;
          text-transform: uppercase;
        }
        .airship-field-label input,
        .airship-field-label textarea {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(15, 15, 15, 0.62);
          color: #f4f4f4;
          padding: 10px 11px;
          font: inherit;
          font-size: 15px;
          font-weight: 520;
          line-height: 1.35;
          text-transform: none;
          outline: none;
        }
        .airship-field-label textarea {
          min-height: 86px;
          resize: vertical;
        }
        .airship-field-label input[type="color"] {
          height: 42px;
          padding: 4px;
        }
        .airship-style-control-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }
        .airship-style-control-row output {
          color: #f4f4f4;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 14px;
        }
        .airship-code-readback {
          display: grid;
          gap: 10px;
          color: #bebebe;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 15px;
          line-height: 1.5;
        }
        .airship-code-readback code {
          color: #dcdcdc;
          overflow-wrap: anywhere;
        }
        .airship-bottom-toolbar {
          gap: 7px;
          bottom: 28px;
          border-color: rgba(255, 255, 255, 0.11);
          border-radius: 11px;
          background: #292929;
          padding: 8px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.23);
        }
        .airship-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 41px;
          height: 41px;
          border: 1px solid transparent;
          border-radius: 6px;
          background: transparent;
          color: #cfcfcf;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          text-decoration: none;
        }
        .airship-icon-button[data-selected="true"] {
          background: #149ce7;
          color: #ffffff;
        }
        .airship-icon-button:disabled {
          color: #666;
          cursor: not-allowed;
        }
        .airship-bottom-segmented {
          display: inline-grid;
          grid-auto-flow: column;
          grid-auto-columns: max-content;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          padding: 4px;
        }
        .airship-bottom-segmented button {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
          min-width: 74px;
          height: 36px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #a8a8a8;
          font-size: 17px;
          font-weight: 650;
          cursor: pointer;
        }
        .airship-bottom-segmented button[data-selected="true"] {
          background: rgba(255, 255, 255, 0.08);
          color: #f1f1f1;
        }
        .airship-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          border-radius: 999px;
          background: #149ce7;
          color: #ffffff;
          font-size: 17px;
          font-weight: 760;
        }
        .airship-hidden-ops summary {
          list-style: none;
        }
        .airship-hidden-ops summary::-webkit-details-marker {
          display: none;
        }
        .airship-hidden-ops[open] {
          position: absolute;
          right: 0;
          bottom: 58px;
          display: grid;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 10px;
          background: #292929;
          padding: 8px;
        }
        @media (max-width: 1220px) {
          .airship-canvas-scroll {
            padding: 28px 28px 118px;
          }
          .airship-inspector {
            position: absolute;
            right: 18px;
            width: min(546px, calc(100vw - 36px));
            max-width: calc(100vw - 36px);
            max-height: calc(100% - 118px);
            margin: 0;
          }
          .airship-shell {
            overflow: hidden;
          }
        }
        @media (max-width: 760px) {
          .airship-toolbar {
            padding: 0 24px;
          }
          .airship-brand-link {
            font-size: 26px;
          }
          .airship-inspector {
            top: 12px;
            right: 12px;
            width: calc(100vw - 24px);
            max-width: calc(100vw - 24px);
          }
          .airship-inspector-titlebar,
          .airship-panel-section,
          .airship-collapsed-row,
          .airship-agent-transcript-shell {
            padding-left: 22px;
            padding-right: 22px;
          }
          .airship-inspector-tab {
            font-size: 16px;
          }
          .airship-bottom-toolbar {
            left: 50%;
            right: auto;
            transform: translateX(-50%);
          }
        }
      `}</style>

      <header className="airship-toolbar">
        <a
          className="airship-brand-link"
          href={`/gnr8/airship/single-site${props.migrationId ? `?migrationId=${encodeURIComponent(props.migrationId)}` : ""}`}
          aria-label="Back to Airship"
        >
          <span className="airship-mark" aria-hidden="true">A</span>
          <span>airship</span>
        </a>
        <div className="airship-header-actions" aria-label="Airship draft actions">
          <span className="airship-state-pill" aria-label={`Draft save state: ${saveState}`}>
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving" : saveState === "failed" ? "Save failed" : "Unsaved"}
          </span>
          <button
            type="button"
            className="airship-shell-action"
            data-tone="secondary"
            aria-label="Save draft"
            disabled={busy}
            onClick={() => void saveAllTextEdits()}
          >
            Save draft
          </button>
          <button
            type="button"
            className="airship-shell-action"
            data-tone="primary"
            aria-label="Apply / generate preview"
            aria-busy={candidateApplyState === "creating"}
            disabled={!canApplySavedDraftToPreview}
            onClick={() => void createInternalPreviewCandidate()}
          >
            Apply / generate preview
          </button>
          {previewCandidate?.route ? (
            <a className="airship-shell-action" data-tone="secondary" aria-label="Open internal preview" href={previewCandidate.route} target="_blank" rel="noreferrer">
              Internal preview
            </a>
          ) : null}
          {previewHostUrl ? (
            <a className="airship-shell-action" data-tone="secondary" aria-label="Open GNR8 demo preview" href={previewHostUrl} target="_blank" rel="noreferrer">
              GNR8 demo
            </a>
          ) : null}
          <a className="airship-shell-action" data-tone="secondary" aria-label="Open live external preview" href={props.liveSiteUrl} target="_blank" rel="noreferrer">
            Live
          </a>
        </div>
      </header>

      <div className="airship-shell">
        <section className="airship-canvas" aria-label="Draft preview canvas">
          <div className="airship-canvas-scroll" ref={canvasScrollRef}>
            <div className="airship-canvas-stage">
              <div className="airship-canvas-bar">
                <div className="airship-toolbar-group">
                  {badge(`${selectedViewport.label} canvas`, "neutral")}
                  {badge(`${selectedViewport.width}px frame`, "neutral")}
                  {badge(`Zoom ${zoomPercent}`, "neutral")}
                </div>
                <div className="airship-muted">
                  Full-page internal canvas preview. Live remains separate at {props.liveSiteUrl}.
                  {previewHostUrl ? (
                    <>
                      {" "}
                      <a href={previewHostUrl} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontWeight: 900, textDecoration: "none" }}>
                        Open GNR8 demo
                      </a>
                    </>
                  ) : null}
                </div>
                {props.demoReadiness ? (
                  <details className="airship-detail-list" aria-label="MVP demo readiness" style={{ width: "100%" }}>
                    <summary style={{ color: "#334155", cursor: "pointer", fontSize: 12, fontWeight: 900 }}>MVP demo readiness</summary>
                    <div className="airship-detail-row">
                      <strong>{previewHostLabel}</strong>
                      <code>{props.demoReadiness.demoUrl}</code>
                    </div>
                    <div className="airship-detail-row">
                      <strong>demo text</strong>
                      <span>{props.demoReadiness.expectedBodyText}</span>
                    </div>
                    <div className="airship-detail-row">
                      <strong>active target</strong>
                      <code>{`${props.demoReadiness.activePointerTarget.siteVersionId} / ${props.demoReadiness.activePointerTarget.runtimeArtifactId}`}</code>
                    </div>
                    <div className="airship-detail-row">
                      <strong>external domain</strong>
                      <code>{props.demoReadiness.externalProductionSite.status.replaceAll("_", " ")}</code>
                    </div>
                  </details>
                ) : previewHostUrl ? (
                  <div className="airship-detail-list" aria-label="GNR8 preview host parity" style={{ width: "100%" }}>
                    <div className="airship-detail-row">
                      <strong>{previewHostLabel}</strong>
                      <code>{previewHostUrl}</code>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="airship-canvas-zoom-shell"
                style={{ width: scaledCanvasWidth, minWidth: scaledCanvasWidth }}
              >
                <div
                  className="airship-frame-shell"
                  style={{
                    "--airship-frame-width": `${selectedViewport.width}px`,
                    "--airship-canvas-zoom": canvasZoom,
                  } as CSSProperties}
                  data-airship-editor-viewport={viewport}
                  data-airship-full-page-canvas="true"
                  data-airship-canvas-zoom={canvasZoom.toFixed(2)}
                >
                  <div className="airship-frame-top">
                    <span>{artifactCanvasRender?.label ?? props.draftPreview.label}</span>
                    <span>{artifactCanvasRender ? "Artifact renderer / Not live" : "Draft only / Not live"}</span>
                  </div>
                  <div className="airship-frame-page">
                    {artifactCanvasRender ? (
                      <>
                        <div
                          className="airship-artifact-canvas-frame"
                          style={{ "--airship-artifact-canvas-height": `${artifactCanvasFrameHeight}px` } as CSSProperties}
                          data-airship-artifact-canvas-render="true"
                          data-airship-artifact-render-source={artifactCanvasRender.source}
                          data-airship-artifact-site-version-id={artifactCanvasRender.siteVersionId}
                          data-airship-artifact-runtime-artifact-id={artifactCanvasRender.runtimeArtifactId}
                          data-airship-artifact-sandbox={artifactCanvasRender.safety.sandbox}
                          data-airship-artifact-raw-scripts-execute={String(artifactCanvasRender.safety.rawScriptsExecute)}
                          data-airship-artifact-canvas-height={artifactCanvasFrameHeight}
                          data-airship-artifact-canvas-height-source={artifactCanvasMeasuredHeight ? "iframe-scroll-height" : "fallback-min-height"}
                          aria-label={artifactCanvasRender.label}
                        >
                          <iframe
                            title={artifactCanvasRender.label}
                            sandbox="allow-same-origin"
                            ref={artifactIframeRef}
                            referrerPolicy="no-referrer"
                            srcDoc={artifactCanvasRender.sanitizedHtml}
                            onLoad={measureArtifactCanvas}
                          />
                          {artifactCanvasSections.map((section) => (
                            <button
                              key={section}
                              type="button"
                              className="airship-artifact-overlay"
                              data-airship-editor-canvas={section}
                              data-airship-artifact-section-anchor={section}
                              data-airship-artifact-section-selector={airshipArtifactSectionSelector(section)}
                              data-airship-artifact-geometry-source={artifactOverlayRects[section] ? "dom-marker" : "fallback-band"}
                              data-selected={selectedSection === section}
                              aria-label={`Select ${sectionOptions.find((option) => option.key === section)?.label ?? section} artifact section`}
                              onClick={() => selectSection(section)}
                              style={artifactOverlayStyle(section)}
                            >
                              {selectedSection === section ? <SelectionOverlay metadata={selectedElementMetadata} /> : null}
                            </button>
                          ))}
                        </div>
                        <button
                          id="airship-preview-source-material"
                          type="button"
                          className="airship-artifact-source-strip"
                          data-airship-editor-canvas="source"
                          data-selected={selectedSection === "source"}
                          onClick={() => selectSection("source")}
                        >
                          {selectedSection === "source" ? <SelectionOverlay metadata={selectedElementMetadata} /> : null}
                          <span>
                            <strong>Source material</strong>
                            <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 2 }}>
                              Artifact canvas is rendered from sanitized demo/candidate HTML; scripts are disabled in the editor sandbox.
                            </span>
                          </span>
                          <span style={{ color: "#0f766e", fontSize: 12, fontWeight: 900 }}>{artifactCanvasRender.label}</span>
                        </button>
                      </>
                    ) : (
                      <>
                    <section
                      id="airship-preview-hero-intro"
                      data-airship-editor-canvas="hero"
                      data-airship-section="hero"
                      data-selected={selectedSection === "hero"}
                      className="airship-preview-hero"
                      aria-label="Homepage hero/intro"
                      onClick={() => selectSection("hero")}
                      style={{
                        padding: `${fields.topPadding}px ${viewport === "mobile" ? 22 : 44}px ${fields.bottomPadding}px`,
                        background: `linear-gradient(135deg, ${fields.backgroundTint} 0%, #ffffff 58%, #dbeafe 100%)`,
                      }}
                    >
                      {selectedSection === "hero" ? <SelectionOverlay metadata={selectedElementMetadata} /> : null}
                      <div className="airship-preview-eyebrow">{props.draftPreview.hero.eyebrow}</div>
                      <h2
                        data-airship-editor-preview="headline"
                        data-airship-element="hero-headline"
                        className="airship-preview-headline"
                        style={{ fontSize: viewport === "mobile" ? 34 : viewport === "tablet" ? 40 : 46 }}
                      >
                        {fields.headline}
                      </h2>
                      <p
                        data-airship-editor-preview="subheading"
                        className="airship-preview-copy"
                        style={{ fontSize: viewport === "mobile" ? 16 : 18 }}
                      >
                        {fields.subheading}
                      </p>
                      <div
                        id="airship-preview-primary-cta"
                        className="airship-cta-row"
                        data-airship-editor-canvas="cta"
                        data-selected={selectedSection === "cta"}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectSection("cta");
                        }}
                      >
                        {selectedSection === "cta" ? <SelectionOverlay metadata={selectedElementMetadata} /> : null}
                        {fields.ctaLabel ? (
                          <button
                            type="button"
                            data-airship-editor-preview="cta"
                            data-airship-element="hero-cta"
                            data-selected={selectedSection === "cta"}
                            className="airship-preview-cta"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectSection("cta");
                            }}
                            style={{ border: `1px solid ${fields.ctaColor}`, background: fields.ctaColor }}
                          >
                            {fields.ctaLabel}
                          </button>
                        ) : null}
                        {props.draftPreview.hero.secondaryContactText ? (
                          <span style={{ color: "#475569", fontSize: 13, fontWeight: 800 }}>
                            {props.draftPreview.hero.secondaryContactText}
                          </span>
                        ) : null}
                      </div>
                    </section>
                    {previewSections.filter((section) => section.key !== "hero").map((section) => (
                      <section
                        key={section.key}
                        id={`airship-preview-${section.key}`}
                        data-airship-editor-canvas={section.key}
                        data-airship-section={section.key}
                        data-selected={selectedSection === section.key}
                        className="airship-preview-section"
                        aria-label={section.label}
                        onClick={() => selectSection(section.key)}
                        style={{
                          background: section.key === "footer" ? "#f8fafc" : "#ffffff",
                        }}
                      >
                        {selectedSection === section.key ? <SelectionOverlay metadata={selectedElementMetadata} /> : null}
                        <div className="airship-preview-eyebrow">{section.eyebrow}</div>
                        <h3>{section.heading}</h3>
                        {section.body ? <p>{section.body}</p> : null}
                        {section.items.length > 0 ? (
                          <div className="airship-preview-card-grid">
                            {section.items.map((item, itemIndex) => (
                              <div
                                key={item}
                                className="airship-preview-card"
                                data-airship-element={section.key === "offers" ? "offer-card" : section.key === "proof" ? "proof-card" : section.key === "approach" ? "approach-card" : undefined}
                                data-airship-element-index={section.key === "offers" || section.key === "proof" || section.key === "approach" ? itemIndex : undefined}
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {section.ctaLabel ? (
                          <button
                            type="button"
                            className="airship-preview-cta"
                            data-airship-element="contact-cta"
                            style={{ border: `1px solid ${fields.ctaColor}`, background: fields.ctaColor, width: "fit-content" }}
                          >
                            {section.ctaLabel}
                          </button>
                        ) : null}
                      </section>
                    ))}
                    <button
                      id="airship-preview-source-material"
                      type="button"
                      className="airship-source-strip"
                      data-airship-editor-canvas="source"
                      data-selected={selectedSection === "source"}
                      onClick={() => selectSection("source")}
                    >
                      {selectedSection === "source" ? <SelectionOverlay metadata={selectedElementMetadata} /> : null}
                      <span>
                        <strong>Source material</strong>
                        <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 2 }}>
                          Imported-site draft evidence stays inside the internal editor workspace.
                        </span>
                      </span>
                      <span style={{ color: "#0f766e", fontSize: 12, fontWeight: 900 }}>Draft only</span>
                    </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="airship-bottom-toolbar" aria-label="Canvas editor controls">
            <button
              type="button"
              className="airship-icon-button"
              aria-label="Undo last local change"
              disabled={undoStack.length === 0}
              onClick={undoLastLocalChange}
              title="Undo"
            >
              ↶
            </button>
            {toolOptions.map((tool) => (
              <button
                key={tool.key}
                type="button"
                className="airship-icon-button"
                data-selected={selectedTool === tool.key}
                aria-label={`${tool.label} ${tool.key === "select" ? "pointer " : ""}tool`}
                aria-pressed={selectedTool === tool.key}
                onClick={() => selectTool(tool.key)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
            <span className="airship-toolbar-separator" />
            <button
              type="button"
              className="airship-icon-button"
              aria-label="Zoom out"
              onClick={() => zoomCanvas(-CANVAS_ZOOM_STEP)}
              title={`Zoom out (${zoomPercent})`}
            >
              −
            </button>
            <button
              type="button"
              className="airship-icon-button"
              aria-label="Fit width canvas"
              onClick={fitCanvasWidth}
              title={`Fit width (${zoomPercent})`}
            >
              ⛶
            </button>
            <button
              type="button"
              className="airship-icon-button"
              aria-label="Zoom in"
              onClick={() => zoomCanvas(CANVAS_ZOOM_STEP)}
              title={`Zoom in (${zoomPercent})`}
            >
              +
            </button>
            <span className="airship-toolbar-separator" />
            <div className="airship-bottom-segmented" aria-label="Viewport size">
              {viewportOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  data-selected={viewport === option.key}
                  aria-pressed={viewport === option.key}
                  aria-label={`${option.label} viewport`}
                  onClick={() => setViewport(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="airship-count-badge" aria-label={`${recentChanges.length} recent changes`}>
              {Math.max(1, recentChanges.length)}
            </span>
            <button
              type="button"
              aria-label="Reset selected section text"
              disabled={sectionTextFields(selectedSection).length === 0}
              onClick={resetSelectedSectionText}
              style={actionButtonStyle({ disabled: sectionTextFields(selectedSection).length === 0, compact: true, dark: true })}
            >
              Reset text
            </button>
            <button
              type="button"
              aria-label="Save text edits to Airship draft"
              disabled={busy}
              onClick={() => void saveAllTextEdits()}
              style={actionButtonStyle({ tone: "primary", disabled: busy, compact: true, dark: true })}
            >
              Save draft
            </button>
            <button
              type="button"
              aria-label="Apply saved draft to preview"
              aria-busy={candidateApplyState === "creating"}
              disabled={!canApplySavedDraftToPreview}
              onClick={() => void createInternalPreviewCandidate()}
              style={actionButtonStyle({
                tone: "primary",
                disabled: !canApplySavedDraftToPreview,
                compact: true,
                dark: true,
              })}
            >
              Apply
            </button>
            {previewCandidate?.route ? (
              <a aria-label="Open internal preview shortcut" href={previewCandidate.route} target="_blank" rel="noreferrer" style={actionButtonStyle({ compact: true, dark: true })}>
                Internal
              </a>
            ) : null}
            {previewHostUrl ? (
              <a aria-label="Open GNR8 demo preview shortcut" href={previewHostUrl} target="_blank" rel="noreferrer" style={actionButtonStyle({ compact: true, dark: true })}>
                Demo
              </a>
            ) : null}
            <a aria-label="Open live external preview shortcut" href={props.liveSiteUrl} target="_blank" rel="noreferrer" style={actionButtonStyle({ compact: true, dark: true })}>
              Live
            </a>
            <details className="airship-hidden-ops">
              <summary>
                <span className="airship-icon-button" aria-label="More draft actions" title="More">⋯</span>
              </summary>
              <button
                type="button"
                aria-label="Reset selected section style"
                disabled={sectionStyleFields(selectedSection).length === 0}
                onClick={resetSelectedSectionStyle}
                style={actionButtonStyle({ disabled: sectionStyleFields(selectedSection).length === 0, compact: true, dark: true })}
              >
                Reset CSS
              </button>
              <button
                type="button"
                aria-label="Reset selected section text"
                disabled={sectionTextFields(selectedSection).length === 0}
                onClick={resetSelectedSectionText}
                style={actionButtonStyle({ disabled: sectionTextFields(selectedSection).length === 0, compact: true, dark: true })}
              >
                Reset Text
              </button>
              <button
                type="button"
                aria-label="Save text edits to Airship draft"
                disabled={busy}
                onClick={() => void saveAllTextEdits()}
                style={actionButtonStyle({ tone: "primary", disabled: busy, compact: true, dark: true })}
              >
                Save
              </button>
              <button
                type="button"
                aria-label="Apply saved draft to preview"
                aria-busy={candidateApplyState === "creating"}
                disabled={!canApplySavedDraftToPreview}
                onClick={() => void createInternalPreviewCandidate()}
                style={actionButtonStyle({
                  tone: "primary",
                  disabled: !canApplySavedDraftToPreview,
                  compact: true,
                  dark: true,
                })}
              >
                Apply
              </button>
              {previewCandidate?.route ? (
                <a aria-label="Open internal preview" href={previewCandidate.route} target="_blank" rel="noreferrer" style={actionButtonStyle({ compact: true, dark: true })}>
                  Preview
                </a>
              ) : null}
              <a aria-label="Open live site" href={props.liveSiteUrl} target="_blank" rel="noreferrer" style={actionButtonStyle({ compact: true, dark: true })}>
                Live
              </a>
            </details>
          </div>
        </section>

        <aside className="airship-inspector" aria-label="Floating inspector panel">
          <div className="airship-inspector-header">
            <div className="airship-inspector-titlebar">
              <div className="airship-inspector-title">
                <span className="airship-mark" aria-hidden="true">A</span>
                <span>Airship</span>
              </div>
              <div className="airship-panel-actions" aria-label="Airship panel actions">
                <span className="airship-state-pill airship-panel-pill" aria-label={`Draft save state: ${saveState}`}>
                  {saveState}
                </span>
                <button
                  type="button"
                  className="airship-shell-action"
                  data-dark="true"
                  data-tone="primary"
                  aria-label="Save draft from panel"
                  disabled={busy}
                  onClick={() => void saveAllTextEdits()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="airship-shell-action"
                  data-dark="true"
                  data-tone="primary"
                  aria-label="Apply / generate preview from panel"
                  aria-busy={candidateApplyState === "creating"}
                  disabled={!canApplySavedDraftToPreview}
                  onClick={() => void createInternalPreviewCandidate()}
                >
                  Apply
                </button>
                {previewCandidate?.route ? (
                  <a className="airship-shell-action" data-dark="true" aria-label="Open internal preview from panel" href={previewCandidate.route} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                ) : null}
              </div>
            </div>
            <div className="airship-inspector-tabs" role="tablist" aria-label="Inspector tabs">
              {inspectorTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  className="airship-inspector-tab"
                  data-selected={inspectorTab === tab.key}
                  aria-selected={inspectorTab === tab.key}
                  aria-controls={`airship-inspector-${tab.key}`}
                  onClick={() => setInspectorTab(tab.key)}
                >
                  <span className="airship-tab-icon" aria-hidden="true">
                    {tab.key === "agent" ? "A" : tab.key === "edit" ? "✎" : tab.key === "css" ? "<>" : "▱"}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="airship-inspector-body">
            <div
              id="airship-inspector-agent"
              role="tabpanel"
              className="airship-tab-panel"
              data-active={inspectorTab === "agent"}
              aria-hidden={inspectorTab !== "agent"}
            >
              <div className="airship-agent-panel">
                <div className="airship-agent-transcript-shell" aria-label="Local deterministic transcript">
                  <div className="airship-agent-result">
                    <div className="airship-agent-step"><strong>● Target</strong> {selectedElementMetadata.label}</div>
                    <div className="airship-agent-step">│ {selectedElementMetadata.role}</div>
                    <div className="airship-agent-step"><strong>● Command mode</strong> local deterministic Airship draft command</div>
                    <div className="airship-agent-step">│ Supported: change CTA, shorten headline, adjust hero spacing, make CTA prominent</div>
                    <div className="airship-agent-step"><strong>● Save state</strong> {saveState}; candidate {candidateApplyState}</div>
                    <div className="airship-agent-step">│ Draft only, not live, not published; external customer domain unchanged.</div>
                    {recentChanges.length > 0 ? (
                      <div className="airship-diff-card" aria-label="Recent real draft changes">
                        <div className="airship-diff-header">Recent draft activity</div>
                        {recentChanges.map((change) => (
                          <div key={change.id} className="airship-diff-line">
                            {change.scope}: {change.label} ({change.state})
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div role="status" className="airship-panel-value">{message}</div>
                </div>
                <div className="airship-agent-input-shell">
                  <div className="airship-selected-element-token">{selectedElementMetadata.label} ×</div>
                  <div className="airship-agent-input-row">
                    <textarea
                      rows={1}
                      value={command}
                      onChange={(event) => setCommand(event.target.value)}
                      placeholder="Describe the change..."
                    />
                    <button
                      type="button"
                      disabled={busy || command.trim().length === 0}
                      onClick={() => void runCommand()}
                      aria-label="Apply local deterministic command"
                      title="Apply"
                    >
                      ⌃
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              id="airship-inspector-edit"
              role="tabpanel"
              className="airship-tab-panel"
              data-active={inspectorTab === "edit"}
              aria-hidden={inspectorTab !== "edit"}
            >
              <div className="airship-panel-section">
                <div className="airship-panel-heading">SELECTED <span>⌃</span></div>
                <div className="airship-panel-value">{selectedElementMetadata.label}</div>
                <div className="airship-panel-value">{selectedElementMetadata.sourceStatus}</div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">DRAFT FIELDS <span>⌃</span></div>
                <div className="airship-field-grid" aria-label="Real selected-section editable fields">
                  {sectionTextFields(selectedSection).includes("headline") ? (
                    <label className="airship-field-label">
                      H1/headline text
                      <textarea
                        value={fields.headline}
                        onChange={(event) => updateTextField("headline", event.target.value)}
                        aria-label="Edit selected hero headline"
                      />
                    </label>
                  ) : null}
                  {sectionTextFields(selectedSection).includes("subheading") ? (
                    <label className="airship-field-label">
                      Subheading/body text
                      <textarea
                        value={fields.subheading}
                        onChange={(event) => updateTextField("subheading", event.target.value)}
                        aria-label="Edit selected hero subheading"
                      />
                    </label>
                  ) : null}
                  {sectionTextFields(selectedSection).includes("ctaLabel") ? (
                    <label className="airship-field-label">
                      CTA label
                      <input
                        value={fields.ctaLabel}
                        onChange={(event) => updateTextField("ctaLabel", event.target.value)}
                        aria-label="Edit selected CTA label"
                      />
                    </label>
                  ) : null}
                  {selectedDrafts.filter((draft) => !draftFieldKey(draft)).map((draft) => (
                    <label key={draft.id} className="airship-field-label">
                      {draft.targetSectionPage}
                      <textarea
                        value={draft.proposedTextContent}
                        onChange={(event) => updateMappedDraftText(draft.id, event.target.value)}
                        aria-label={`Edit ${draft.targetSectionPage}`}
                      />
                    </label>
                  ))}
                  {sectionTextFields(selectedSection).length === 0 && selectedDrafts.filter((draft) => !draftFieldKey(draft)).length === 0 ? (
                    <div className="airship-panel-value">No editable text field is mapped to this selection.</div>
                  ) : null}
                </div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">SIZE <span>⌃</span></div>
                <div className="airship-size-grid">
                  <div><span>W</span>{selectedSection === "cta" ? "122" : selectedViewport.width}</div>
                  <div><span>H</span>{selectedSection === "cta" ? "45" : selectedElementMetadata.sizeLabel.replace(/.*×\s*/, "")}</div>
                </div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">APPEARANCE <span>⌃</span></div>
                <div className="airship-appearance-grid">
                  <div><span>◐</span>100%</div>
                  <div><span>Blend</span>Normal</div>
                </div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">FILL <span>⌃</span></div>
                <div className="airship-fill-row">
                  <span className="airship-fill-swatch" style={{ "--airship-swatch": fields.ctaColor } as CSSProperties} />
                  <span>{fields.ctaColor.replace("#", "").toUpperCase()}</span>
                  <span>100%</span>
                  <span>-</span>
                </div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">ACTIONS <span>⌃</span></div>
                <div className="airship-toolbar-group">
                  <button
                    type="button"
                    aria-label="Reset selected section text from edit panel"
                    disabled={sectionTextFields(selectedSection).length === 0}
                    onClick={resetSelectedSectionText}
                    style={actionButtonStyle({ disabled: sectionTextFields(selectedSection).length === 0, compact: true, dark: true })}
                  >
                    Reset text
                  </button>
                  <button
                    type="button"
                    aria-label="Save selected section draft fields"
                    disabled={busy}
                    onClick={() => void saveAllTextEdits()}
                    style={actionButtonStyle({ tone: "primary", disabled: busy, compact: true, dark: true })}
                  >
                    Save draft
                  </button>
                </div>
              </div>
            </div>

            <div
              id="airship-inspector-css"
              role="tabpanel"
              className="airship-tab-panel"
              data-active={inspectorTab === "css"}
              aria-hidden={inspectorTab !== "css"}
            >
              <div className="airship-panel-section">
                <div className="airship-panel-heading">CONTROLS <span>⌃</span></div>
                <div className="airship-field-grid" aria-label="Real selected-section style controls">
                  {sectionStyleFields(selectedSection).includes("topPadding") ? (
                    <label className="airship-field-label">
                      Hero top padding
                      <div className="airship-style-control-row">
                        <input
                          type="range"
                          min="24"
                          max="140"
                          step="1"
                          value={fields.topPadding}
                          onChange={(event) => updateStyleField("topPadding", event.target.value)}
                          aria-label="Hero top padding"
                        />
                        <output>{fields.topPadding}px</output>
                      </div>
                    </label>
                  ) : null}
                  {sectionStyleFields(selectedSection).includes("bottomPadding") ? (
                    <label className="airship-field-label">
                      Hero bottom padding
                      <div className="airship-style-control-row">
                        <input
                          type="range"
                          min="24"
                          max="140"
                          step="1"
                          value={fields.bottomPadding}
                          onChange={(event) => updateStyleField("bottomPadding", event.target.value)}
                          aria-label="Hero bottom padding"
                        />
                        <output>{fields.bottomPadding}px</output>
                      </div>
                    </label>
                  ) : null}
                  {sectionStyleFields(selectedSection).includes("backgroundTint") ? (
                    <label className="airship-field-label">
                      Background tint
                      <input
                        type="color"
                        value={fields.backgroundTint}
                        onChange={(event) => updateStyleField("backgroundTint", event.target.value)}
                        aria-label="Background tint"
                      />
                    </label>
                  ) : null}
                  {sectionStyleFields(selectedSection).includes("ctaColor") ? (
                    <label className="airship-field-label">
                      CTA color
                      <input
                        type="color"
                        value={fields.ctaColor}
                        onChange={(event) => updateStyleField("ctaColor", event.target.value)}
                        aria-label="CTA color"
                      />
                    </label>
                  ) : null}
                  {sectionStyleFields(selectedSection).length === 0 ? (
                    <div className="airship-panel-value">No draft style controls are mapped to this selection.</div>
                  ) : null}
                </div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">STYLE <span>⌃</span></div>
                <div className="airship-code-readback" aria-label="Selected element current CSS values">
                  <code>{airshipCanvasSelectorForSection(selectedSection)} {"{"}</code>
                  {selectedStyleValueRows.map((row) => (
                    <code key={row.label}>  {row.label}: {row.value};</code>
                  ))}
                  <code>{"}"}</code>
                </div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">DRAFT TOKENS <span>⌃</span></div>
                <div className="airship-code-readback">
                  <code>--airship-fill: {fields.ctaColor};</code>
                  <code>--airship-background: {fields.backgroundTint};</code>
                  <code>--airship-top: {fields.topPadding}px;</code>
                  <code>--airship-bottom: {fields.bottomPadding}px;</code>
                </div>
              </div>
              <div className="airship-panel-section">
                <div className="airship-panel-heading">ACTIONS <span>⌃</span></div>
                <div className="airship-toolbar-group">
                  <button
                    type="button"
                    aria-label="Reset selected section style from CSS panel"
                    disabled={sectionStyleFields(selectedSection).length === 0}
                    onClick={resetSelectedSectionStyle}
                    style={actionButtonStyle({ disabled: sectionStyleFields(selectedSection).length === 0, compact: true, dark: true })}
                  >
                    Reset CSS
                  </button>
                </div>
              </div>
            </div>

            <div
              id="airship-inspector-dom"
              role="tabpanel"
              className="airship-tab-panel"
              data-active={inspectorTab === "dom"}
              aria-hidden={inspectorTab !== "dom"}
            >
              <div className="airship-panel-section" aria-label="Selected element metadata">
                <div className="airship-panel-heading">SELECTED NODE <span>⌃</span></div>
                <div className="airship-code-readback">
                  <code>section: {selectedElementMetadata.section}</code>
                  <code>level: {selectedElementMetadata.selectionLevel}</code>
                  <code>domId: {selectedElementMetadata.domSectionId}</code>
                  <code>role: {selectedElementMetadata.role}</code>
                  <code>canvas: {airshipCanvasSelectorForSection(selectedSection)}</code>
                  <code>artifact: {selectedSection === "source" ? "source strip" : airshipArtifactSectionSelector(selectedSection)}</code>
                </div>
              </div>
              <div className="airship-panel-section" aria-label="Element-level selection markers">
                <div className="airship-panel-heading">MARKERS <span>⌃</span></div>
                <div className="airship-code-readback">
                  {airshipElementSelectorsForSection(selectedSection).length > 0
                    ? airshipElementSelectorsForSection(selectedSection).map((selector) => <code key={selector}>{selector}</code>)
                    : <code>none</code>}
                </div>
              </div>
              <div className="airship-panel-section" aria-label="Mapped draft field ids">
                <div className="airship-panel-heading">FIELDS <span>⌃</span></div>
                <div className="airship-code-readback">
                  {selectedElementMetadata.mappedDraftFieldIds.length > 0
                    ? selectedElementMetadata.mappedDraftFieldIds.map((id) => <code key={id}>{id}</code>)
                    : <code>none</code>}
                </div>
              </div>
              <div className="airship-panel-section" aria-label="Selected element internal references">
                <div className="airship-panel-heading">INTERNAL REFS <span>⌃</span></div>
                <div className="airship-code-readback">
                  {selectedElementMetadata.internalRefs.map((ref) => (
                    <code key={`${ref.label}:${ref.value}`}>{ref.label}: {ref.value}</code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
