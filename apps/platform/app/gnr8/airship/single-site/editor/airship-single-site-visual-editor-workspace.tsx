"use client";

import React, { useMemo, useState, type CSSProperties } from "react";

import type {
  AirshipSingleSiteDraftPreview,
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
  status: "missing" | "connected" | "revoked" | "encryption_not_configured";
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

const HEADLINE_DRAFT_ID = "airship-chs-home-hero-headline";
const SUBHEADING_DRAFT_ID = "airship-chs-home-hero-value-proposition";
const CTA_DRAFT_ID = "airship-chs-home-contact-cta";

const STYLE_LOCAL_ONLY_MESSAGE = "Style changes are local preview only. Not live. Not published.";
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

export function initialAirshipHeroEditorFields(preview: AirshipSingleSiteDraftPreview): AirshipHeroEditorFields {
  return {
    headline: preview.hero.headline,
    subheading: preview.hero.subheading,
    ctaLabel: preview.hero.primaryCtaLabel ?? "",
    topPadding: 72,
    bottomPadding: 72,
    backgroundTint: "#ecfeff",
    ctaColor: "#0f766e",
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
  const styleMessage = changedStyleFields.length > 0 ? STYLE_LOCAL_ONLY_MESSAGE : "";
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
  const [fields, setFields] = useState(() => initialAirshipHeroEditorFields(props.draftPreview));
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
  const providerConnected = isAirshipOpenAIProviderConnected(providerStatus);
  const providerSaveDisabled = providerBusy || providerStatus.status === "encryption_not_configured" || apiKeyInput.trim().length === 0 || modelInput.trim().length === 0;
  const providerConnectedActionDisabled = providerBusy || !providerConnected;

  const selectedDrafts = useMemo(
    () => editableDrafts.filter((draft) => draft.id === HEADLINE_DRAFT_ID || draft.id === SUBHEADING_DRAFT_ID || draft.id === CTA_DRAFT_ID),
    [editableDrafts],
  );

  function updateTextField(field: TextFieldKey, value: string) {
    setFields((current) => applyAirshipHeroTextFieldEdit({ fields: current, drafts: editableDrafts, field, value }).fields);
    setEditableDrafts((current) => applyAirshipHeroTextFieldEdit({ fields, drafts: current, field, value }).drafts);
    setMessage("Unsaved draft editor text change. Not live. Not published.");
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
      notAppliedToLiveSite: true,
      notPublished: true,
    });
  }

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
    <main style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr) auto", minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid #dbe3ee", background: "#fff", padding: "14px 18px" }}>
        <div style={{ display: "grid", gap: 5 }}>
          <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Draft editor</div>
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15 }}>Airship visual editor workspace</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {badge("Internal preview only", "warn")}
          {badge("Not live", "warn")}
          {badge("Not published", "warn")}
          <a href={`/gnr8/airship/single-site${props.migrationId ? `?migrationId=${encodeURIComponent(props.migrationId)}` : ""}`} style={{ border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#334155", padding: "9px 12px", fontSize: 13, fontWeight: 850, textDecoration: "none" }}>
            Back to Airship
          </a>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 360px)", gap: 0, minHeight: 0 }}>
        <section aria-label="Draft preview canvas" style={{ minWidth: 0, overflow: "auto", padding: 18 }}>
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {badge("Changes are saved to Airship draft only", "good")}
              {badge(STYLE_LOCAL_ONLY_MESSAGE, "neutral")}
            </div>
            <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
              Source {props.importedSite} from {props.sourceUrl}. Live remains separate at {props.liveSiteUrl}.
            </div>
          </div>
          <div data-airship-editor-canvas="hero" style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            <div
              style={{
                display: "grid",
                alignContent: "center",
                gap: 18,
                minHeight: 520,
                padding: `${fields.topPadding}px 44px ${fields.bottomPadding}px`,
                background: `linear-gradient(135deg, ${fields.backgroundTint} 0%, #ffffff 60%, #e0f2fe 100%)`,
              }}
            >
              <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0 }}>{props.draftPreview.hero.eyebrow}</div>
              <h2 data-airship-editor-preview="headline" style={{ margin: 0, maxWidth: 820, color: "#0f172a", fontSize: 46, lineHeight: 1.04 }}>
                {fields.headline}
              </h2>
              <p data-airship-editor-preview="subheading" style={{ margin: 0, maxWidth: 760, color: "#334155", fontSize: 18, lineHeight: 1.55 }}>
                {fields.subheading}
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {fields.ctaLabel ? (
                  <span data-airship-editor-preview="cta" style={{ display: "inline-flex", border: `1px solid ${fields.ctaColor}`, borderRadius: 8, background: fields.ctaColor, color: "#fff", padding: "12px 15px", fontSize: 14, fontWeight: 900 }}>
                    {fields.ctaLabel}
                  </span>
                ) : null}
                {props.draftPreview.hero.secondaryContactText ? <span style={{ color: "#475569", fontSize: 13, fontWeight: 800 }}>{props.draftPreview.hero.secondaryContactText}</span> : null}
              </div>
            </div>
          </div>
        </section>

        <aside aria-label="Selected section controls" style={{ display: "grid", alignContent: "start", gap: 14, borderLeft: "1px solid #dbe3ee", background: "#fff", padding: 16, overflow: "auto" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Selected section</div>
            <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}>Homepage hero/intro</h2>
            <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
              {draftMeta.draftId ? `Draft ${draftMeta.draftId}` : "Draft will be created on first text save"}. {draftMeta.version ? `Version ${draftMeta.version}.` : ""}
            </div>
            {props.draftCandidate ? (
              <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                Candidate {props.draftCandidate.siteVersionId ?? "unavailable"}.
                {props.draftCandidate.runtimeArtifactId ? ` Artifact ${props.draftCandidate.runtimeArtifactId}.` : ""}
                {props.draftCandidate.draftId ? ` Source draft ${props.draftCandidate.draftId}.` : ""}
              </div>
            ) : (
              <div style={{ color: "#92400e", fontSize: 12, lineHeight: 1.45 }}>
                No materialized Airship candidate is required for this editor preview.
              </div>
            )}
          </div>

          {controlLabel("H1/headline text", <textarea rows={3} value={fields.headline} onChange={(event) => updateTextField("headline", event.target.value)} style={inputStyle(true)} />)}
          {controlLabel("Subheading/body text", <textarea rows={5} value={fields.subheading} onChange={(event) => updateTextField("subheading", event.target.value)} style={inputStyle(true)} />)}
          {controlLabel("CTA label", <input value={fields.ctaLabel} onChange={(event) => updateTextField("ctaLabel", event.target.value)} style={inputStyle()} />)}

          {controlLabel("Hero top padding", <input type="range" min={24} max={140} value={fields.topPadding} onChange={(event) => setFields((current) => ({ ...current, topPadding: clampSpacing(Number(event.target.value)) }))} />)}
          {controlLabel("Hero bottom padding", <input type="range" min={24} max={140} value={fields.bottomPadding} onChange={(event) => setFields((current) => ({ ...current, bottomPadding: clampSpacing(Number(event.target.value)) }))} />)}
          {controlLabel(
            "Background tint",
            <select value={fields.backgroundTint} onChange={(event) => setFields((current) => ({ ...current, backgroundTint: event.target.value }))} style={inputStyle()}>
              {tintOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>,
          )}
          {controlLabel(
            "CTA color",
            <select value={fields.ctaColor} onChange={(event) => setFields((current) => ({ ...current, ctaColor: event.target.value }))} style={inputStyle()}>
              {ctaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>,
          )}

          <button type="button" disabled={busy} onClick={() => void saveAllTextEdits()} style={{ border: "1px solid #0f766e", borderRadius: 8, background: busy ? "#f8fafc" : "#0f766e", color: busy ? "#94a3b8" : "#fff", padding: "10px 13px", fontSize: 14, fontWeight: 900, cursor: busy ? "not-allowed" : "pointer" }}>
            Save text edits
          </button>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "grid", gap: 8 }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>AI command</div>
            <div style={{ color: providerConnected ? "#166534" : "#92400e", fontSize: 12, lineHeight: 1.45 }}>
              {providerConnected
                ? `OpenAI connected (${providerStatus.maskedKey ?? "masked key"}, ${providerStatus.model}).`
                : CONNECT_OPENAI_MESSAGE}
            </div>
            <textarea rows={3} value={command} onChange={(event) => setCommand(event.target.value)} placeholder="spremeni CTA v Kontaktirajte CHS" style={inputStyle(true)} />
            <button type="button" disabled={busy || command.trim().length === 0} onClick={() => void runCommand()} style={{ border: "1px solid #1d4ed8", borderRadius: 8, background: busy || command.trim().length === 0 ? "#f8fafc" : "#1d4ed8", color: busy || command.trim().length === 0 ? "#94a3b8" : "#fff", padding: "10px 13px", fontSize: 14, fontWeight: 900, cursor: busy || command.trim().length === 0 ? "not-allowed" : "pointer" }}>
              Apply command
            </button>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "grid", gap: 8 }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>OpenAI provider</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {badge(providerConnected ? "Connected" : providerStatus.status === "encryption_not_configured" ? "Encryption setup needed" : "Not connected", providerConnected ? "good" : "warn")}
              {providerStatus.maskedKey ? badge(providerStatus.maskedKey, "neutral") : null}
              {providerStatus.lastTestStatus ? badge(`Test ${providerStatus.lastTestStatus}`, providerStatus.lastTestStatus === "passed" ? "good" : "warn") : null}
            </div>
            {providerStatus.updatedAt ? (
              <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                Updated {providerStatus.updatedAt}.
              </div>
            ) : null}
            {controlLabel("API key", <input type="password" autoComplete="off" value={apiKeyInput} onChange={(event) => setApiKeyInput(event.target.value)} placeholder="sk-..." style={inputStyle()} />)}
            {controlLabel("Model", <input value={modelInput} onChange={(event) => setModelInput(event.target.value)} placeholder="gpt-5" style={inputStyle()} />)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" disabled={providerSaveDisabled} onClick={() => void submitProviderAction("save_openai")} style={{ border: "1px solid #0f766e", borderRadius: 8, background: providerSaveDisabled ? "#f8fafc" : "#0f766e", color: providerSaveDisabled ? "#94a3b8" : "#fff", padding: "10px 13px", fontSize: 13, fontWeight: 900, cursor: providerSaveDisabled ? "not-allowed" : "pointer" }}>
                Save key
              </button>
              <button type="button" disabled={providerConnectedActionDisabled} onClick={() => void submitProviderAction("test_openai")} style={{ border: "1px solid #1d4ed8", borderRadius: 8, background: providerConnectedActionDisabled ? "#f8fafc" : "#1d4ed8", color: providerConnectedActionDisabled ? "#94a3b8" : "#fff", padding: "10px 13px", fontSize: 13, fontWeight: 900, cursor: providerConnectedActionDisabled ? "not-allowed" : "pointer" }}>
                Test connection
              </button>
            </div>
            <button type="button" disabled={providerConnectedActionDisabled} onClick={() => void submitProviderAction("revoke_openai")} style={{ border: "1px solid #b91c1c", borderRadius: 8, background: providerConnectedActionDisabled ? "#f8fafc" : "#fff", color: providerConnectedActionDisabled ? "#94a3b8" : "#b91c1c", padding: "10px 13px", fontSize: 13, fontWeight: 900, cursor: providerConnectedActionDisabled ? "not-allowed" : "pointer" }}>
              Revoke key
            </button>
          </div>

          <div role="status" style={{ border: "1px solid #bae6fd", borderRadius: 8, background: "#f0f9ff", color: "#075985", padding: 10, fontSize: 12, lineHeight: 1.45 }}>
            {message}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Editable draft fields</div>
            {selectedDrafts.map((draft) => (
              <div key={draft.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, fontSize: 12, lineHeight: 1.4 }}>
                <strong>{draft.targetSectionPage}</strong>
                <div style={{ color: "#64748b" }}>{draft.status}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
