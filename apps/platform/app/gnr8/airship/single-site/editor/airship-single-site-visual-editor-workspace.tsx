"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type {
  AirshipSingleSiteDraftPreview,
  AirshipSingleSiteDraftStyleSettings,
  AirshipSingleSiteImprovementDraft,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

type Props = {
  migrationId: string | null;
  importedSite: string;
  sourceUrl: string;
  liveSiteUrl: string;
  draftCandidate: {
    siteVersionId: string | null;
    runtimeArtifactId: string | null;
    route: string | null;
    draftId: string | null;
    draftVersion: number | null;
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
  aiProviderStatus: AirshipOpenAIProviderStatus;
};

type AirshipOpenAIProviderStatus = {
  provider: "openai";
  scope: "airship_editor";
  ownerScope: "internal_superadmin";
  connected: boolean;
  status: "missing" | "connected" | "revoked" | "encryption_not_configured" | "read_error";
  maskedKey: string | null;
  model: string;
  lastTestedAt: string | null;
  lastTestStatus: "passed" | "failed" | null;
  createdAt: string | null;
  updatedAt: string | null;
  canUseAiCommands: boolean;
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

type ProviderActionResponse = {
  ok?: boolean;
  providerStatus?: AirshipOpenAIProviderStatus;
  error?: string;
  diagnostics?: string[];
};

type AICommandActionResponse = {
  ok?: boolean;
  result?: AirshipCommandResult;
  error?: string;
  diagnostics?: string[];
};

type TextFieldKey = "headline" | "subheading" | "ctaLabel";
type EditorSectionKey = "hero" | "cta" | "source";
type EditorViewportKey = "desktop" | "tablet" | "mobile";

const HEADLINE_DRAFT_ID = "airship-chs-home-hero-headline";
const SUBHEADING_DRAFT_ID = "airship-chs-home-hero-value-proposition";
const CTA_DRAFT_ID = "airship-chs-home-contact-cta";

const STYLE_DRAFT_SAVED_MESSAGE = "Style changes are saved to Airship draft only. Not live. Not published.";
const CONNECT_OPENAI_MESSAGE = "Connect OpenAI to use AI commands.";

const tintOptions = [
  { label: "Ice", value: "#ecfeff" },
  { label: "Mist", value: "#eef6ff" },
  { label: "Warm", value: "#fefce8" },
  { label: "Plain", value: "#ffffff" },
];

const ctaOptions = [
  { label: "Teal", value: "#0f766e" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Ink", value: "#111827" },
  { label: "Emerald", value: "#047857" },
];

const sectionOptions: Array<{ key: EditorSectionKey; label: string; detail: string }> = [
  { key: "hero", label: "Hero / intro", detail: "Headline, subheading, spacing, tint" },
  { key: "cta", label: "CTA", detail: "Primary action label and color" },
  { key: "source", label: "Source material", detail: "CHS evidence and internal draft refs" },
];

const viewportOptions: Array<{ key: EditorViewportKey; label: string; width: number }> = [
  { key: "desktop", label: "Desktop", width: 1100 },
  { key: "tablet", label: "Tablet", width: 760 },
  { key: "mobile", label: "Mobile", width: 390 },
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

function controlLabel(label: string, children: React.ReactNode) {
  return (
    <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 12, fontWeight: 850 }}>
      {label}
      {children}
    </label>
  );
}

function inputStyle(multiline = false): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #94a3b8",
    borderRadius: 8,
    padding: "9px 10px",
    color: "#0f172a",
    background: "#fff",
    fontSize: 13,
    lineHeight: multiline ? 1.45 : 1.2,
    resize: multiline ? "vertical" : undefined,
  };
}

function actionButtonStyle(input: {
  tone?: "primary" | "neutral" | "danger";
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
} = {}): CSSProperties {
  const tone = input.tone ?? "neutral";
  const palette = {
    primary: { border: "#1d4ed8", background: "#1d4ed8", color: "#fff" },
    neutral: { border: "#cbd5e1", background: "#fff", color: "#0f172a" },
    danger: { border: "#b91c1c", background: "#fff", color: "#b91c1c" },
  }[tone];
  return {
    border: `1px solid ${input.disabled ? "#dbe3ee" : input.selected ? "#1d4ed8" : palette.border}`,
    borderRadius: 8,
    background: input.disabled ? "#f8fafc" : input.selected ? "#eff6ff" : palette.background,
    color: input.disabled ? "#94a3b8" : input.selected ? "#1d4ed8" : palette.color,
    padding: input.compact ? "7px 10px" : "9px 12px",
    fontSize: 13,
    fontWeight: 850,
    cursor: input.disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

function isAirshipOpenAIProviderConnected(status: AirshipOpenAIProviderStatus): boolean {
  return status.provider === "openai" && status.status === "connected" && status.connected && status.canUseAiCommands && Boolean(status.maskedKey);
}

function providerDiagnosticMessage(error: string | undefined, diagnostics: string[] | undefined): string {
  const codes = new Set([error, ...(diagnostics ?? [])].filter(Boolean));
  if (codes.has("airship_openai_api_key_invalid")) return "OpenAI key format was rejected.";
  if (codes.has("airship_openai_api_key_missing")) return "Enter an OpenAI API key before saving.";
  if (codes.has("airship_openai_encryption_key_missing")) return "OpenAI key storage is not configured on the server.";
  if (codes.has("airship_openai_provider_readback_failed")) return "OpenAI key storage did not pass backend readback, so the provider remains disconnected.";
  if (codes.has("airship_openai_provider_key_rejected")) return "OpenAI rejected the saved key.";
  if (codes.has("airship_openai_provider_access_denied")) return "OpenAI denied access for the saved key or organization.";
  if (codes.has("airship_openai_provider_model_unavailable")) return "The selected OpenAI model is unavailable for this key.";
  if (codes.has("airship_openai_provider_quota_or_rate_limited")) return "OpenAI reported a quota or rate-limit issue for this key.";
  if (codes.has("airship_openai_provider_upstream_unavailable")) return "OpenAI is temporarily unavailable.";
  if (codes.has("airship_openai_provider_missing")) return CONNECT_OPENAI_MESSAGE;
  if (codes.has("airship_openai_provider_storage_failed")) return "OpenAI key storage failed on the server.";
  return "OpenAI provider action failed.";
}

function providerConnectionMessage(status: AirshipOpenAIProviderStatus): string {
  if (isAirshipOpenAIProviderConnected(status)) {
    return `OpenAI connected (${status.maskedKey ?? "masked key"}, ${status.model}).`;
  }
  if (status.status === "read_error") {
    return "OpenAI provider status could not be read. AI commands are disabled until the backend status read succeeds.";
  }
  if (status.status === "encryption_not_configured") {
    return "OpenAI key storage is not configured on the server.";
  }
  return CONNECT_OPENAI_MESSAGE;
}

function providerBadgeLabel(status: AirshipOpenAIProviderStatus): string {
  if (isAirshipOpenAIProviderConnected(status)) return "Connected";
  if (status.status === "encryption_not_configured") return "Encryption setup needed";
  if (status.status === "read_error") return "Status read failed";
  return "Not connected";
}

function draftIdForField(field: "headline" | "subheading" | "ctaLabel"): string {
  if (field === "headline") return HEADLINE_DRAFT_ID;
  if (field === "subheading") return SUBHEADING_DRAFT_ID;
  return CTA_DRAFT_ID;
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
  const draftId = draftIdForField(input.field);
  return {
    fields: { ...input.fields, [input.field]: input.value },
    drafts: input.drafts.map((draft) =>
      draft.id === draftId ? { ...draft, proposedTextContent: input.value, status: draft.status === "accepted" || draft.status === "rejected" || draft.status === "proposed" ? "edited" : draft.status } : draft,
    ),
  };
}

function mergeServerDrafts(current: AirshipSingleSiteImprovementDraft[], serverDraftEdits: AirshipSingleSiteImprovementDraft[]): AirshipSingleSiteImprovementDraft[] {
  return current.map((draft) => {
    const serverDraft = serverDraftEdits.find((item) => item.id === draft.id);
    return serverDraft ? { ...draft, proposedTextContent: serverDraft.proposedTextContent, status: serverDraft.status } : draft;
  });
}

export function AirshipSingleSiteVisualEditorWorkspace(props: Props) {
  const [fields, setFields] = useState(() => initialAirshipHeroEditorFields(props.draftPreview, props.persistence.styleSettings));
  const [editableDrafts, setEditableDrafts] = useState(() => props.drafts);
  const [busy, setBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);
  const [command, setCommand] = useState("");
  const [message, setMessage] = useState(() =>
    `${props.persistence.label}. Draft editor. Internal preview only. Not live. Not published.`,
  );
  const [draftMeta, setDraftMeta] = useState(() => props.persistence);
  const [providerStatus, setProviderStatus] = useState(() => props.aiProviderStatus);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState(() => props.aiProviderStatus.model || "gpt-5");
  const [selectedSection, setSelectedSection] = useState<EditorSectionKey>("hero");
  const [viewport, setViewport] = useState<EditorViewportKey>("desktop");
  const savedStyleKeyRef = useRef(styleKey(initialAirshipHeroEditorFields(props.draftPreview, props.persistence.styleSettings)));
  const styleSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const providerConnected = isAirshipOpenAIProviderConnected(providerStatus);
  const providerSaveDisabled = providerBusy || providerStatus.status === "encryption_not_configured" || apiKeyInput.trim().length === 0 || modelInput.trim().length === 0;
  const providerConnectedActionDisabled = providerBusy || !providerConnected;
  const selectedViewport = viewportOptions.find((option) => option.key === viewport) ?? viewportOptions[0];

  const selectedDrafts = useMemo(
    () => editableDrafts.filter((draft) => draft.id === HEADLINE_DRAFT_ID || draft.id === SUBHEADING_DRAFT_ID || draft.id === CTA_DRAFT_ID),
    [editableDrafts],
  );

  function updateTextField(field: TextFieldKey, value: string) {
    setFields((current) => applyAirshipHeroTextFieldEdit({ fields: current, drafts: editableDrafts, field, value }).fields);
    setEditableDrafts((current) => applyAirshipHeroTextFieldEdit({ fields, drafts: current, field, value }).drafts);
    setMessage("Unsaved draft editor text change. Not live. Not published.");
  }

  function selectSection(section: EditorSectionKey) {
    setSelectedSection(section);
  }

  function updateStyleField(field: "topPadding" | "bottomPadding" | "backgroundTint" | "ctaColor", value: string | number) {
    setFields((current) => {
      if (field === "topPadding") return { ...current, topPadding: clampSpacing(Number(value)) };
      if (field === "bottomPadding") return { ...current, bottomPadding: clampSpacing(Number(value)) };
      if (field === "backgroundTint") return { ...current, backgroundTint: String(value) };
      return { ...current, ctaColor: String(value) };
    });
  }

  async function saveDraftText(draftId: string, proposedTextContent: string) {
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
    setDraftMeta({
      label: "Saved Airship draft",
      draftId: payload.draft.id,
      draftStatus: payload.draft.draftStatus,
      version: payload.draft.version,
      lastSavedAt: payload.draft.updatedAt,
      styleSettings: {
        heroTopPadding: fields.topPadding,
        heroBottomPadding: fields.bottomPadding,
        backgroundTint: fields.backgroundTint as AirshipSingleSiteDraftStyleSettings["backgroundTint"],
        ctaColor: fields.ctaColor as AirshipSingleSiteDraftStyleSettings["ctaColor"],
      },
      notAppliedToLiveSite: true,
      notPublished: true,
    });
  }

  const saveStyleSettings = useCallback(async (nextFields: AirshipHeroEditorFields) => {
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
    setDraftMeta({
      label: "Saved Airship draft",
      draftId: payload.draft.id,
      draftStatus: payload.draft.draftStatus,
      version: payload.draft.version,
      lastSavedAt: payload.draft.updatedAt,
      styleSettings: savedStyleSettings ?? {
        heroTopPadding: nextFields.topPadding,
        heroBottomPadding: nextFields.bottomPadding,
        backgroundTint: nextFields.backgroundTint as AirshipSingleSiteDraftStyleSettings["backgroundTint"],
        ctaColor: nextFields.ctaColor as AirshipSingleSiteDraftStyleSettings["ctaColor"],
      },
      notAppliedToLiveSite: true,
      notPublished: true,
    });
    savedStyleKeyRef.current = styleKey(nextFields);
  }, [props.migrationId]);

  useEffect(() => {
    const nextStyleKey = styleKey(fields);
    if (nextStyleKey === savedStyleKeyRef.current) return undefined;
    if (styleSaveTimeoutRef.current) clearTimeout(styleSaveTimeoutRef.current);
    styleSaveTimeoutRef.current = setTimeout(() => {
      setMessage("Saving style changes to Airship draft only...");
      void saveStyleSettings(fields)
        .then(() => setMessage(STYLE_DRAFT_SAVED_MESSAGE))
        .catch(() => setMessage("Airship style save failed. Editor preview changed locally only; no live site changes were made."));
    }, 350);
    return () => {
      if (styleSaveTimeoutRef.current) clearTimeout(styleSaveTimeoutRef.current);
    };
  }, [fields, saveStyleSettings]);

  async function saveAllTextEdits(nextFields = fields, changedFields: Array<"headline" | "subheading" | "ctaLabel"> = ["headline", "subheading", "ctaLabel"]) {
    setBusy(true);
    setMessage("Saving changes to Airship draft only...");
    try {
      for (const field of changedFields) {
        await saveDraftText(draftIdForField(field), nextFields[field]);
      }
      setMessage("Changes are saved to Airship draft only. Not live. Not published.");
    } catch {
      setMessage("Airship draft save failed. Editor preview changed locally only; no live site changes were made.");
    } finally {
      setBusy(false);
    }
  }

  function applyCommandResult(result: AirshipCommandResult) {
    setFields(result.fields);
    if (!result.supported) {
      setMessage(result.message);
      return false;
    }
    for (const field of result.changedTextFields) {
      const draftId = draftIdForField(field);
      const proposedTextContent = result.fields[field];
      setEditableDrafts((current) =>
        current.map((draft) => draft.id === draftId ? { ...draft, proposedTextContent, status: draft.status === "accepted" || draft.status === "rejected" || draft.status === "proposed" ? "edited" : draft.status } : draft),
      );
    }
    setMessage(result.message);
    return true;
  }

  async function runDeterministicCommand() {
    const result = applyAirshipHeroCommand(fields, command);
    const shouldSave = applyCommandResult(result);
    if (!shouldSave) {
      if (!isAirshipOpenAIProviderConnected(providerStatus)) setMessage(CONNECT_OPENAI_MESSAGE);
      return;
    }
    if (result.changedTextFields.length > 0) {
      await saveAllTextEdits(result.fields, result.changedTextFields);
    }
  }

  async function runProviderCommand() {
    if (!props.migrationId) throw new Error("airship_migration_id_missing");
    setBusy(true);
    setMessage("Running OpenAI command for Airship draft only...");
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/ai-command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          migrationId: props.migrationId,
          command,
          fields,
        }),
      });
      const payload = await response.json() as AICommandActionResponse;
      if (!response.ok || !payload.ok || !payload.result) {
        if (payload.error === "AIRSHIP_OPENAI_PROVIDER_MISSING") {
          setProviderStatus((current) => ({ ...current, connected: false, canUseAiCommands: false, status: "missing", maskedKey: null }));
          setMessage(CONNECT_OPENAI_MESSAGE);
          return;
        }
        throw new Error(payload.error || "airship_ai_command_failed");
      }
      const shouldSave = applyCommandResult(payload.result);
      if (shouldSave && payload.result.changedTextFields.length > 0) {
        await saveAllTextEdits(payload.result.fields, payload.result.changedTextFields);
      }
    } catch {
      setMessage("OpenAI command failed. No live site changes were made; deterministic commands still work locally.");
    } finally {
      setBusy(false);
    }
  }

  async function runCommand() {
    if (!command.trim()) return;
    if (isAirshipOpenAIProviderConnected(providerStatus)) {
      const sentCommand = command;
      setCommand("");
      await runProviderCommand().catch(() => {
        setCommand(sentCommand);
        setMessage("OpenAI command failed. No live site changes were made.");
      });
      return;
    }
    await runDeterministicCommand();
    setCommand("");
  }

  async function submitProviderAction(actionMode: "save_openai" | "test_openai" | "revoke_openai") {
    setProviderBusy(true);
    try {
      const response = await fetch("/api/gnr8/admin/airship/ai/provider", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode,
          apiKey: actionMode === "save_openai" ? apiKeyInput : undefined,
          model: modelInput,
        }),
      });
      const payload = await response.json() as ProviderActionResponse;
      if (payload.providerStatus) {
        setProviderStatus(payload.providerStatus);
        setModelInput(payload.providerStatus.model);
      }
      if (!response.ok || !payload.ok || !payload.providerStatus) {
        setMessage(`${providerDiagnosticMessage(payload.error, payload.diagnostics)} No live site changes were made.`);
        return;
      }
      const confirmedConnected = isAirshipOpenAIProviderConnected(payload.providerStatus);
      if (actionMode === "save_openai" && !confirmedConnected) {
        setMessage("OpenAI key save did not confirm a backend connection. Status remains Not connected.");
        return;
      }
      if (actionMode === "save_openai") setApiKeyInput("");
      setMessage(
        actionMode === "revoke_openai"
          ? "OpenAI key revoked. AI commands are disconnected; no live site changes were made."
          : actionMode === "test_openai"
            ? "OpenAI connection test passed. AI commands remain Airship draft only."
            : "OpenAI key saved and connected after backend readback. AI commands remain Airship draft only.",
      );
    } catch {
      setMessage("OpenAI provider action failed. No API key was exposed to the browser response, and no live site changes were made.");
    } finally {
      setProviderBusy(false);
    }
  }

  return (
    <main className="airship-workspace">
      <style>{`
        .airship-workspace {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          min-height: 100vh;
          background: #e5e7eb;
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .airship-toolbar {
          display: grid;
          grid-template-columns: minmax(190px, 1fr) auto minmax(220px, 1fr);
          gap: 12px;
          align-items: center;
          min-height: 58px;
          border-bottom: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 10px 14px;
        }
        .airship-toolbar-group {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 0;
          flex-wrap: wrap;
        }
        .airship-toolbar-group:last-child {
          justify-content: flex-end;
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
        }
        .airship-device-toggle {
          display: inline-grid;
          grid-auto-flow: column;
          gap: 4px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          padding: 3px;
        }
        .airship-shell {
          display: grid;
          grid-template-columns: 232px minmax(0, 1fr) 360px;
          min-height: 0;
        }
        .airship-left,
        .airship-inspector {
          overflow: auto;
          background: #ffffff;
        }
        .airship-left {
          border-right: 1px solid #cbd5e1;
          padding: 14px;
        }
        .airship-inspector {
          border-left: 1px solid #cbd5e1;
          padding: 14px;
        }
        .airship-panel-title {
          display: grid;
          gap: 4px;
          margin-bottom: 14px;
        }
        .airship-panel-title h2 {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          line-height: 1.25;
        }
        .airship-muted {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
        }
        .airship-section-list {
          display: grid;
          gap: 7px;
        }
        .airship-section-button {
          display: grid;
          gap: 4px;
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          padding: 10px;
          color: #0f172a;
          text-align: left;
          cursor: pointer;
        }
        .airship-section-button[data-selected="true"] {
          border-color: #1d4ed8;
          background: #eff6ff;
          box-shadow: inset 3px 0 0 #1d4ed8;
        }
        .airship-section-button strong {
          font-size: 13px;
          line-height: 1.25;
        }
        .airship-section-button span {
          color: #64748b;
          font-size: 11px;
          line-height: 1.35;
        }
        .airship-left-meta {
          display: grid;
          gap: 8px;
          margin-top: 14px;
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
        }
        .airship-canvas {
          min-width: 0;
          overflow: auto;
          background:
            linear-gradient(#d1d5db 1px, transparent 1px),
            linear-gradient(90deg, #d1d5db 1px, transparent 1px),
            #eef2f7;
          background-size: 28px 28px;
          padding: 18px;
        }
        .airship-canvas-bar {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin: 0 auto 12px;
          max-width: 1100px;
          flex-wrap: wrap;
        }
        .airship-frame-shell {
          margin: 0 auto;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          background: #0f172a;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          overflow: hidden;
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
          overflow: hidden;
          background: #ffffff;
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
          display: inline-flex;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 4px 7px;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.2;
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
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
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
        }
        .airship-preview-cta[data-selected="true"] {
          outline-color: #1d4ed8;
        }
        .airship-source-strip {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 12px 16px;
          cursor: pointer;
          outline: 2px solid transparent;
          outline-offset: -2px;
        }
        .airship-source-strip[data-selected="true"] {
          outline-color: #1d4ed8;
          background: #eff6ff;
        }
        .airship-inspector-content {
          display: grid;
          gap: 13px;
          align-content: start;
        }
        .airship-control-group {
          display: grid;
          gap: 10px;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
        }
        .airship-two-up {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .airship-status {
          border: 1px solid #bae6fd;
          border-radius: 8px;
          background: #f0f9ff;
          color: #075985;
          padding: 10px;
          font-size: 12px;
          line-height: 1.45;
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
          word-break: break-word;
        }
        @media (max-width: 1120px) {
          .airship-toolbar {
            grid-template-columns: 1fr;
          }
          .airship-toolbar-group:last-child {
            justify-content: flex-start;
          }
          .airship-shell {
            grid-template-columns: 190px minmax(0, 1fr);
          }
          .airship-inspector {
            grid-column: 1 / -1;
            border-top: 1px solid #cbd5e1;
            border-left: 0;
          }
        }
        @media (max-width: 760px) {
          .airship-shell {
            grid-template-columns: 1fr;
          }
          .airship-left {
            border-right: 0;
            border-bottom: 1px solid #cbd5e1;
          }
          .airship-section-list {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .airship-canvas {
            padding: 12px;
          }
          .airship-preview-headline {
            font-size: 34px;
          }
        }
      `}</style>

      <header className="airship-toolbar">
        <div className="airship-toolbar-group">
          <a
            href={`/gnr8/airship/single-site${props.migrationId ? `?migrationId=${encodeURIComponent(props.migrationId)}` : ""}`}
            style={actionButtonStyle({ compact: true })}
          >
            Back to Airship
          </a>
          <div className="airship-title">
            <div className="airship-kicker">Draft editor</div>
            <h1>Airship visual editor workspace</h1>
          </div>
        </div>

        <div className="airship-toolbar-group" aria-label="Device viewport controls">
          <div className="airship-device-toggle">
            {viewportOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setViewport(option.key)}
                style={actionButtonStyle({ selected: viewport === option.key, compact: true })}
                aria-pressed={viewport === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="airship-toolbar-group">
          {badge("Draft only", "good")}
          {badge(draftMeta.label, draftMeta.draftId ? "good" : "warn")}
          {badge(providerBadgeLabel(providerStatus), providerConnected ? "good" : "warn")}
          {badge("Not live", "warn")}
          {badge("Not published", "warn")}
          {badge("Live site unchanged", "neutral")}
          {props.draftCandidate?.route ? (
            <a href={props.draftCandidate.route} target="_blank" rel="noreferrer" style={actionButtonStyle({ compact: true })}>
              Open internal preview
            </a>
          ) : null}
          <a href={props.liveSiteUrl} target="_blank" rel="noreferrer" style={actionButtonStyle({ compact: true })}>
            Open live site
          </a>
        </div>
      </header>

      <div className="airship-shell">
        <aside className="airship-left" aria-label="Section navigator">
          <div className="airship-panel-title">
            <div className="airship-kicker">Section navigator</div>
            <h2>{props.importedSite}</h2>
            <div className="airship-muted">Live site unchanged. Text saves update the Airship draft only.</div>
          </div>

          <div className="airship-section-list">
            {sectionOptions.map((section) => (
              <button
                key={section.key}
                type="button"
                className="airship-section-button"
                data-selected={selectedSection === section.key}
                onClick={() => selectSection(section.key)}
              >
                <strong>{section.label}</strong>
                <span>{section.detail}</span>
              </button>
            ))}
          </div>

          <div className="airship-left-meta">
            {badge("Changes are saved to Airship draft only", "good")}
            {badge(STYLE_DRAFT_SAVED_MESSAGE, "neutral")}
            <div className="airship-muted">Source {props.importedSite} from {props.sourceUrl}.</div>
          </div>
        </aside>

        <section className="airship-canvas" aria-label="Draft preview canvas">
          <div className="airship-canvas-bar">
            <div className="airship-toolbar-group">
              {badge(`${selectedViewport.label} canvas`, "neutral")}
              {badge(`${selectedViewport.width}px frame`, "neutral")}
            </div>
            <div className="airship-muted">Internal canvas preview. Live remains separate at {props.liveSiteUrl}.</div>
          </div>

          <div
            className="airship-frame-shell"
            style={{ width: selectedViewport.width, maxWidth: "100%" }}
            data-airship-editor-viewport={viewport}
          >
            <div className="airship-frame-top">
              <span>{props.draftPreview.label}</span>
              <span>Draft only / Not live</span>
            </div>
            <div className="airship-frame-page">
              <section
                data-airship-editor-canvas="hero"
                data-selected={selectedSection === "hero"}
                className="airship-preview-hero"
                aria-label="Homepage hero/intro"
                onClick={() => selectSection("hero")}
                style={{
                  padding: `${fields.topPadding}px ${viewport === "mobile" ? 22 : 44}px ${fields.bottomPadding}px`,
                  background: `linear-gradient(135deg, ${fields.backgroundTint} 0%, #ffffff 58%, #dbeafe 100%)`,
                }}
              >
                {selectedSection === "hero" ? <span className="airship-selection-chip">Selected: Hero / intro</span> : null}
                <div className="airship-preview-eyebrow">{props.draftPreview.hero.eyebrow}</div>
                <h2
                  data-airship-editor-preview="headline"
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
                  className="airship-cta-row"
                  data-airship-editor-canvas="cta"
                  data-selected={selectedSection === "cta"}
                  onClick={(event) => {
                    event.stopPropagation();
                    selectSection("cta");
                  }}
                >
                  {fields.ctaLabel ? (
                    <button
                      type="button"
                      data-airship-editor-preview="cta"
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
              <button
                type="button"
                className="airship-source-strip"
                data-airship-editor-canvas="source"
                data-selected={selectedSection === "source"}
                onClick={() => selectSection("source")}
              >
                <span>
                  <strong>Source material</strong>
                  <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 2 }}>
                    CHS draft evidence stays inside the internal editor workspace.
                  </span>
                </span>
                <span style={{ color: "#0f766e", fontSize: 12, fontWeight: 900 }}>Draft only</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="airship-inspector" aria-label="Selected section controls">
          <div className="airship-inspector-content">
            <div className="airship-panel-title">
              <div className="airship-kicker">Selected section</div>
              <h2>{sectionOptions.find((section) => section.key === selectedSection)?.label ?? "Hero / intro"}</h2>
              <div className="airship-muted">
                {draftMeta.lastSavedAt ? `Last saved ${draftMeta.lastSavedAt}. ` : "Draft will be created on first text save. "}
                Draft only. Not live. Not published.
              </div>
            </div>

            {selectedSection === "hero" ? (
              <div className="airship-control-group" style={{ borderTop: 0, paddingTop: 0 }}>
                {controlLabel("H1/headline text", <textarea rows={3} value={fields.headline} onChange={(event) => updateTextField("headline", event.target.value)} style={inputStyle(true)} />)}
                {controlLabel("Subheading/body text", <textarea rows={5} value={fields.subheading} onChange={(event) => updateTextField("subheading", event.target.value)} style={inputStyle(true)} />)}
                {controlLabel("CTA label", <input value={fields.ctaLabel} onChange={(event) => updateTextField("ctaLabel", event.target.value)} style={inputStyle()} />)}
                {controlLabel("Hero top padding", <input type="range" min={24} max={140} value={fields.topPadding} onChange={(event) => updateStyleField("topPadding", event.target.value)} />)}
                {controlLabel("Hero bottom padding", <input type="range" min={24} max={140} value={fields.bottomPadding} onChange={(event) => updateStyleField("bottomPadding", event.target.value)} />)}
                {controlLabel(
                  "Background tint",
                  <select value={fields.backgroundTint} onChange={(event) => updateStyleField("backgroundTint", event.target.value)} style={inputStyle()}>
                    {tintOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>,
                )}
                {controlLabel(
                  "CTA color",
                  <select value={fields.ctaColor} onChange={(event) => updateStyleField("ctaColor", event.target.value)} style={inputStyle()}>
                    {ctaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>,
                )}
              </div>
            ) : null}

            {selectedSection === "cta" ? (
              <div className="airship-control-group" style={{ borderTop: 0, paddingTop: 0 }}>
                {controlLabel("CTA label", <input value={fields.ctaLabel} onChange={(event) => updateTextField("ctaLabel", event.target.value)} style={inputStyle()} />)}
                {controlLabel(
                  "CTA color",
                  <select value={fields.ctaColor} onChange={(event) => updateStyleField("ctaColor", event.target.value)} style={inputStyle()}>
                    {ctaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>,
                )}
                <div className="airship-muted">CTA text and color save to the Airship draft only.</div>
              </div>
            ) : null}

            {selectedSection === "source" ? (
              <div className="airship-control-group" style={{ borderTop: 0, paddingTop: 0 }}>
                {controlLabel("Imported site", <input readOnly value={props.importedSite} style={inputStyle()} />)}
                {controlLabel("Source URL", <input readOnly value={props.sourceUrl} style={inputStyle()} />)}
                {controlLabel("Live site URL", <input readOnly value={props.liveSiteUrl} style={inputStyle()} />)}
                <div className="airship-muted">Live site link is separate from the internal preview/canvas. Live site unchanged.</div>
              </div>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void saveAllTextEdits()}
              style={actionButtonStyle({ tone: "primary", disabled: busy })}
            >
              Save text edits
            </button>

            <div className="airship-control-group">
              <div className="airship-kicker">AI command</div>
              <div style={{ color: providerConnected ? "#166534" : "#92400e", fontSize: 12, lineHeight: 1.45 }}>
                {providerConnectionMessage(providerStatus)}
              </div>
              <textarea rows={3} value={command} onChange={(event) => setCommand(event.target.value)} placeholder="spremeni CTA v Kontaktirajte CHS" style={inputStyle(true)} />
              <button
                type="button"
                disabled={busy || command.trim().length === 0}
                onClick={() => void runCommand()}
                style={actionButtonStyle({ tone: "primary", disabled: busy || command.trim().length === 0 })}
              >
                Apply command
              </button>
            </div>

            <div className="airship-control-group">
              <div className="airship-kicker">OpenAI provider</div>
              <div className="airship-toolbar-group">
                {badge(providerBadgeLabel(providerStatus), providerConnected ? "good" : "warn")}
                {providerStatus.maskedKey ? badge(providerStatus.maskedKey, "neutral") : null}
                {providerStatus.lastTestStatus ? badge(`Test ${providerStatus.lastTestStatus}`, providerStatus.lastTestStatus === "passed" ? "good" : "warn") : null}
              </div>
              {providerStatus.status === "read_error" ? (
                <div style={{ color: "#92400e", fontSize: 12, lineHeight: 1.45 }}>
                  Provider status read failed. The editor remains available; no API key is shown, and AI commands stay disabled.
                </div>
              ) : null}
              {controlLabel("API key", <input type="password" autoComplete="off" value={apiKeyInput} onChange={(event) => setApiKeyInput(event.target.value)} placeholder="sk-..." style={inputStyle()} />)}
              {controlLabel("Model", <input value={modelInput} onChange={(event) => setModelInput(event.target.value)} placeholder="gpt-5" style={inputStyle()} />)}
              <div className="airship-two-up">
                <button type="button" disabled={providerSaveDisabled} onClick={() => void submitProviderAction("save_openai")} style={actionButtonStyle({ tone: "primary", disabled: providerSaveDisabled })}>
                  Save key
                </button>
                <button type="button" disabled={providerConnectedActionDisabled} onClick={() => void submitProviderAction("test_openai")} style={actionButtonStyle({ tone: "primary", disabled: providerConnectedActionDisabled })}>
                  Test connection
                </button>
              </div>
              <button type="button" disabled={providerConnectedActionDisabled} onClick={() => void submitProviderAction("revoke_openai")} style={actionButtonStyle({ tone: "danger", disabled: providerConnectedActionDisabled })}>
                Revoke key
              </button>
            </div>

            <div role="status" className="airship-status">
              {message}
            </div>

            <details className="airship-details">
              <summary>Details</summary>
              <div className="airship-detail-list">
                <div>{draftMeta.draftId ? `Draft ${draftMeta.draftId}` : "No saved draft id yet"}</div>
                <div>{draftMeta.version ? `Version ${draftMeta.version}` : "No saved version yet"}</div>
                {props.draftCandidate ? (
                  <>
                    <div>Candidate {props.draftCandidate.siteVersionId ?? "unavailable"}</div>
                    <div>Artifact {props.draftCandidate.runtimeArtifactId ?? "unavailable"}</div>
                    <div>Source draft {props.draftCandidate.draftId ?? "unavailable"}</div>
                  </>
                ) : (
                  <div>No materialized Airship candidate is required for this editor preview.</div>
                )}
                <div>Provider updated {providerStatus.updatedAt ?? "not yet"}</div>
              </div>
            </details>

            <div className="airship-details">
              <div className="airship-kicker">Editable draft fields</div>
              <div className="airship-detail-list">
                {selectedDrafts.map((draft) => (
                  <div key={draft.id}>
                    <strong>{draft.targetSectionPage}</strong> - {draft.status}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
