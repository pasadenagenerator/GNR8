"use client";

import React, { useMemo, useState } from "react";

type WorkflowStatus = "not_prepared" | "prepared" | "captured" | "mapped" | "applied" | "preview_generated" | "blocked" | "failed";

type CommandDescriptor = {
  commandLine: string;
  cwd: string;
  description: string;
  manualOnly: true;
  launchesProcess: false;
};

type MappingSummary = {
  hasChanges: boolean;
  entryCount: number;
  safeEntryCount: number;
  unsupportedEntryCount: number;
  exactSafeApplyCandidateCount: number;
};

type ProofWorkflowReadback = {
  proofOnly?: true;
  localManualOnly?: true;
  status: string;
  workspacePath: string | null;
  targetUrl?: string;
  targetPort?: number;
  sessionPort?: number;
  expectedAirshipSessionUrl?: string;
  localRunnerCommand?: CommandDescriptor;
  manualAirshipCommand: CommandDescriptor | null;
  preparedSession?: {
    workspacePath: string;
    targetUrl: string;
    targetPort: number;
    sessionPort: number;
    expectedAirshipSessionUrl: string;
    healthReadbackUrl: string | null;
    localRunnerCommand: CommandDescriptor;
    manualAirshipCommand: CommandDescriptor;
    warnings: string[];
  };
  capture?: {
    changedFiles: Array<{ path: string; unifiedDiff?: string }>;
    indexHtmlChanged: boolean;
  };
  initialHashes?: Array<{ path: string; hash: string }>;
  finalHashes?: Array<{ path: string; hash: string }>;
  mappingSummary: MappingSummary | null;
  appliedCount: number;
  skippedCount: number;
  appliedFieldNames?: string[];
  skippedMappings?: Array<{
    draftFieldKey: string | null;
    changedElementMarker: string | null;
    sectionMarker: string | null;
    confidence: string;
    reason: string;
  }>;
  changedDraftFields?: Array<{
    draftFieldKey: string;
    previousText: string;
    nextText: string;
    changedElementMarker: string | null;
    sectionMarker: string | null;
  }>;
  draft: {
    idBefore: string | null;
    versionBefore: number | null;
    idAfter: string | null;
    versionAfter: number | null;
  };
  readback: string;
  nextRecommendedAction: string;
  mutationFlags: Record<string, boolean>;
  safety: Record<string, boolean>;
  diagnostics: string[];
};

type PreviewGenerationReadback = {
  status: "created" | "reused";
  migrationId: string;
  draftId: string;
  draftVersionUsed: number;
  generatedSiteVersionId: string;
  generatedRuntimeArtifactId: string;
  internalPreviewUrl: string;
  artifactValidityResult: {
    valid: boolean;
    reasons: string[];
    polishedComplete?: boolean;
    polishedCompletenessReasons?: string[];
  };
  generatedArtifactContainsAppliedHeadline: boolean;
  readback: string;
  mutationFlags: Record<string, boolean>;
  diagnostics: string[];
};

type CaptureMapReadback = {
  captured: ProofWorkflowReadback;
  mapped: ProofWorkflowReadback;
  status: "mapped";
  mappingSummary: MappingSummary | null;
  nextRecommendedAction: string;
};

type RouteResponse = {
  ok?: boolean;
  readback?: ProofWorkflowReadback | CaptureMapReadback | PreviewGenerationReadback;
  error?: string;
  diagnostics?: string[];
};

type Props = {
  migrationId: string | null;
  savedDraftId: string | null;
  savedDraftVersion: number | null;
  freshDraftProof?: {
    draftId: string;
    draftVersion: number;
    appliedHeadline: string;
  } | null;
};

type ProofWorkflowPanelViewModelInput = Props & {
  status: WorkflowStatus;
  busy: boolean;
  prepared: ProofWorkflowReadback | null;
  captured: ProofWorkflowReadback | null;
  mapped: ProofWorkflowReadback | null;
  result: ProofWorkflowReadback | null;
  previewResult: PreviewGenerationReadback | null;
  confirmed: boolean;
};

export type ProofWorkflowPanelViewModel = ReturnType<typeof deriveAirshipProofWorkflowPanelViewModel>;

function buttonStyle(disabled: boolean, tone: "primary" | "neutral" = "neutral"): React.CSSProperties {
  const active = tone === "primary"
    ? { border: "#0f766e", background: "#0f766e", color: "#fff" }
    : { border: "#cbd5e1", background: "#fff", color: "#334155" };
  return {
    border: `1px solid ${disabled ? "#cbd5e1" : active.border}`,
    borderRadius: 8,
    background: disabled ? "#f8fafc" : active.background,
    color: disabled ? "#94a3b8" : active.color,
    padding: "9px 11px",
    fontSize: 13,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

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
    <span style={{ border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.background, color: palette.color, padding: "4px 7px", fontSize: 11, fontWeight: 900 }}>
      {labelize(value)}
    </span>
  );
}

function fact(label: string, value: React.ReactNode) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 4, color: "#0f172a", fontSize: 13, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function commandBlock(label: string, command: CommandDescriptor | null | undefined) {
  if (!command) return null;
  return (
    <label style={{ display: "grid", gap: 5, color: "#475569", fontSize: 11, fontWeight: 900 }}>
      {label}
      <textarea
        readOnly
        rows={3}
        value={command.commandLine}
        onFocus={(event) => event.currentTarget.select()}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          background: "#fff",
          color: "#0f172a",
          padding: "9px 10px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
          lineHeight: 1.45,
          resize: "vertical",
        }}
      />
      <span style={{ color: "#64748b", fontSize: 11, overflowWrap: "anywhere" }}>cwd: {command.cwd}</span>
    </label>
  );
}

function hashSummary(readback: ProofWorkflowReadback | null) {
  if (!readback) return "No hashes captured yet.";
  const initial = readback.initialHashes?.find((hash) => hash.path === "index.html")?.hash ?? "missing";
  const final = readback.finalHashes?.find((hash) => hash.path === "index.html")?.hash ?? "pending";
  return `index.html initial ${initial}; final ${final}`;
}

function mappedReadback(value: RouteResponse["readback"]): ProofWorkflowReadback | null {
  if (!value) return null;
  if ("mapped" in value) return value.mapped;
  if ("generatedSiteVersionId" in value) return null;
  return value;
}

function previewGenerationReadback(value: RouteResponse["readback"]): PreviewGenerationReadback | null {
  if (!value || !("generatedSiteVersionId" in value)) return null;
  return value;
}

function preparedSession(readback: ProofWorkflowReadback | null | undefined) {
  return readback?.preparedSession ?? null;
}

function targetUrl(readback: ProofWorkflowReadback | null | undefined): string | null {
  return readback?.targetUrl ?? preparedSession(readback)?.targetUrl ?? null;
}

function expectedAirshipSessionUrl(readback: ProofWorkflowReadback | null | undefined): string | null {
  return readback?.expectedAirshipSessionUrl ?? preparedSession(readback)?.expectedAirshipSessionUrl ?? null;
}

function localRunnerCommand(readback: ProofWorkflowReadback | null | undefined): CommandDescriptor | null {
  return readback?.localRunnerCommand ?? preparedSession(readback)?.localRunnerCommand ?? null;
}

function manualAirshipCommand(readback: ProofWorkflowReadback | null | undefined): CommandDescriptor | null {
  return readback?.manualAirshipCommand ?? preparedSession(readback)?.manualAirshipCommand ?? null;
}

function changedFilesCount(readback: ProofWorkflowReadback | null | undefined): number {
  return readback?.capture?.changedFiles?.length ?? 0;
}

function hasCapturedChanges(readback: ProofWorkflowReadback | null | undefined): boolean {
  return Boolean(readback?.capture?.indexHtmlChanged || changedFilesCount(readback) > 0);
}

function mutationFlagText(flags: Record<string, boolean> | null | undefined): string {
  if (!flags) return "not available yet";
  const ordered = Object.entries(flags).sort(([left], [right]) => left.localeCompare(right));
  return ordered.map(([key, value]) => `${labelize(key)}: ${value ? "yes" : "no"}`).join("; ");
}

function safetyFlagText(flags: Record<string, boolean> | null | undefined): string {
  if (!flags) return "not available yet";
  const ordered = Object.entries(flags).sort(([left], [right]) => left.localeCompare(right));
  return ordered.map(([key, value]) => `${labelize(key)}: ${value ? "yes" : "no"}`).join("; ");
}

function hasFreshDraftProof(input: Pick<Props, "freshDraftProof" | "savedDraftId" | "savedDraftVersion">): boolean {
  return Boolean(
    input.freshDraftProof &&
    input.savedDraftId &&
    input.savedDraftVersion &&
    input.freshDraftProof.draftId === input.savedDraftId &&
    input.freshDraftProof.draftVersion === input.savedDraftVersion,
  );
}

export function deriveAirshipProofWorkflowPanelViewModel(input: ProofWorkflowPanelViewModelInput) {
  const currentReadback = input.result ?? input.mapped ?? input.captured ?? input.prepared;
  const captureHasChanges = hasCapturedChanges(input.captured);
  const safeMappingCount = input.mapped?.mappingSummary?.exactSafeApplyCandidateCount ?? 0;
  const hasSafeMappings = safeMappingCount > 0;
  const applySucceeded = input.result?.status === "applied_to_draft";
  const freshDraftProof = hasFreshDraftProof(input);
  const previewUrl = input.previewResult?.internalPreviewUrl ?? null;
  const sessionUrl = expectedAirshipSessionUrl(input.prepared);
  const target = targetUrl(input.prepared);
  const localCommand = localRunnerCommand(input.prepared);
  const airshipCommand = manualAirshipCommand(input.prepared);
  const draftLabel = input.savedDraftId && input.savedDraftVersion
    ? `${input.savedDraftId} v${input.savedDraftVersion}`
    : "Saved draft required before confirmed apply";
  const summary = input.mapped?.mappingSummary;

  return {
    currentReadback,
    canPrepare: Boolean(input.migrationId) && !input.busy,
    canCapture: Boolean(input.migrationId && input.prepared) && !input.busy,
    canMap: Boolean(input.migrationId && input.captured && captureHasChanges) && !input.busy,
    canApply: Boolean(input.migrationId && hasSafeMappings && input.confirmed) && !input.busy,
    canGeneratePreview: Boolean(input.migrationId && (applySucceeded || freshDraftProof)) && !input.busy,
    canOpenPreview: Boolean(previewUrl) && !input.busy,
    hasSafeMappings,
    hasFreshDraftProof: freshDraftProof,
    changedFilesCount: changedFilesCount(input.captured),
    openAirshipHref: sessionUrl,
    openAirshipDisabledReason: sessionUrl
      ? null
      : input.prepared
        ? "Start the local static target and manual Airship CLI command, then use the session URL printed by that command."
        : "Prepare the local proof workspace first.",
    targetUrl: target,
    localRunnerCommand: localCommand,
    manualAirshipCommand: airshipCommand,
    draftLabel,
    mappingText: summary
      ? `${summary.exactSafeApplyCandidateCount} exact/safe; ${summary.safeEntryCount} safe; ${summary.unsupportedEntryCount} unsupported; ${input.result?.skippedCount ?? 0} skipped; ${summary.entryCount} total.`
      : "No captured edits mapped yet.",
    mutationFlagsText: mutationFlagText((input.previewResult ?? input.result ?? currentReadback)?.mutationFlags),
    safetyFlagsText: safetyFlagText(currentReadback?.safety),
    previewUrl,
  };
}

export function AirshipProofWorkflowPanel(props: Props) {
  const [status, setStatus] = useState<WorkflowStatus>("not_prepared");
  const [prepared, setPrepared] = useState<ProofWorkflowReadback | null>(null);
  const [captured, setCaptured] = useState<ProofWorkflowReadback | null>(null);
  const [mapped, setMapped] = useState<ProofWorkflowReadback | null>(null);
  const [result, setResult] = useState<ProofWorkflowReadback | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewGenerationReadback | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("Not prepared. Prepare a local proof workspace before running the manual Airship sidecar command.");
  const [busy, setBusy] = useState(false);

  const view = deriveAirshipProofWorkflowPanelViewModel({
    ...props,
    status,
    busy,
    prepared,
    captured,
    mapped,
    result,
    previewResult,
    confirmed,
  });
  const currentReadback = view.currentReadback;
  const statusTone = status === "applied" ? "good" : status === "blocked" || status === "failed" ? "warn" : "neutral";
  const mappingText = useMemo(() => view.mappingText, [view.mappingText]);
  const appliedFieldText = result?.appliedFieldNames?.length
    ? result.appliedFieldNames.join(", ")
    : "none";
  const skippedMappingText = result?.skippedMappings?.length
    ? result.skippedMappings.map((item) => `${item.draftFieldKey ?? item.changedElementMarker ?? "unknown"}: ${item.reason}`).join("; ")
    : "none";

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/gnr8/admin/airship/single-site/proof-workflow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json() as RouteResponse;
    if (!response.ok || !payload.ok || !payload.readback) {
      throw new Error(payload.diagnostics?.join(", ") || payload.error || "airship_proof_workflow_failed");
    }
    return payload.readback;
  }

  async function prepare() {
    if (!view.canPrepare) return;
    setBusy(true);
    setMessage("Preparing local/manual proof workspace...");
    try {
      const readback = mappedReadback(await post({ actionMode: "prepare", migrationId: props.migrationId }));
      setPrepared(readback);
      setCaptured(null);
      setMapped(null);
      setResult(null);
      setPreviewResult(null);
      setConfirmed(false);
      setStatus("prepared");
      setMessage(readback?.readback ?? "Airship proof workspace prepared.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Airship proof prepare failed.");
    } finally {
      setBusy(false);
    }
  }

  async function captureChanges() {
    if (!view.canCapture) return;
    setBusy(true);
    setMessage("Capturing local Airship workspace changes...");
    try {
      const readback = mappedReadback(await post({ actionMode: "capture", migrationId: props.migrationId, preparedWorkflow: prepared }));
      setCaptured(readback);
      setMapped(null);
      setResult(null);
      setPreviewResult(null);
      setConfirmed(false);
      setStatus("captured");
      setMessage(readback?.readback ?? "Captured local Airship proof edits. Map captured edits next.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Airship proof capture failed.");
    } finally {
      setBusy(false);
    }
  }

  async function mapCapturedEdits() {
    if (!view.canMap) return;
    setBusy(true);
    setMessage("Mapping captured local edits to safe Airship draft fields...");
    try {
      const readback = mappedReadback(await post({ actionMode: "map", migrationId: props.migrationId, capturedWorkflow: captured }));
      setMapped(readback);
      setResult(null);
      setPreviewResult(null);
      setConfirmed(false);
      setStatus("mapped");
      setMessage(readback?.readback ?? "Mapped captured local Airship proof edits.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Airship proof map failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyConfirmed() {
    if (!view.canApply) return;
    setBusy(true);
    setMessage("Applying confirmed exact safe mappings to the saved Airship draft...");
    try {
      const readback = mappedReadback(await post({
        actionMode: "apply_confirmed",
        migrationId: props.migrationId,
        mappedWorkflow: mapped,
        confirmed,
        idempotencyKey: `airship-proof-ui:${props.migrationId}:${props.savedDraftId ?? "draft"}:${props.savedDraftVersion ?? "unknown"}`,
      }));
      setResult(readback);
      setPreviewResult(null);
      setStatus(readback?.status === "blocked" ? "blocked" : "applied");
      setMessage(readback?.readback ?? "Captured edits saved to draft. Preview not regenerated yet.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Airship proof apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generatePreviewFromAppliedDraft() {
    if (!view.canGeneratePreview) return;
    setBusy(true);
    setMessage("Generating a separate internal preview candidate from the saved applied draft...");
    try {
      const readback = previewGenerationReadback(await post({
        actionMode: "generate_internal_preview_from_applied_draft",
        migrationId: props.migrationId,
        appliedWorkflow: result,
        freshDraftProof: props.freshDraftProof ?? undefined,
        idempotencyKey: `airship-proof-preview:${props.migrationId}:${result?.draft.idAfter ?? props.savedDraftId ?? "draft"}:${result?.draft.versionAfter ?? props.savedDraftVersion ?? "unknown"}`,
      }));
      setPreviewResult(readback);
      setStatus("preview_generated");
      setMessage(readback?.readback ?? "Draft was updated first. Internal preview was generated second. Live site unchanged.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Airship proof preview generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #99f6e4", borderRadius: 8, background: "#f0fdfa", padding: 12, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 950 }}>Real Airship sidecar proof</div>
          <div style={{ marginTop: 4, color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
            Proof-only, local/manual operator flow. Draft changes are not live. Applying a draft and generating an internal preview are separate steps.
            Does not publish, regenerate preview automatically, change the live site, mutate DNS/provider state, or replace the current editor route.
            GNR8 demo/live links are unchanged.
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {badge(status, statusTone)}
          {badge("manual only", "neutral")}
          {badge("not live", "warn")}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8 }}>
          <button type="button" disabled={!view.canPrepare} aria-busy={busy && status === "not_prepared"} onClick={() => void prepare()} style={buttonStyle(!view.canPrepare, "primary")}>
            Step 1: Prepare Airship session
          </button>
          {view.openAirshipHref ? (
            <a href={view.openAirshipHref} target="_blank" rel="noreferrer" style={{ ...buttonStyle(false, "primary"), textAlign: "center", textDecoration: "none" }}>
              Step 2: Open Airship editor
            </a>
          ) : (
            <button type="button" disabled style={buttonStyle(true, "primary")} title={view.openAirshipDisabledReason ?? undefined}>
              Step 2: Open Airship editor
            </button>
          )}
          <button type="button" disabled={!view.canCapture} onClick={() => void captureChanges()} style={buttonStyle(!view.canCapture)}>
            Step 3: Capture changes
          </button>
          <button type="button" disabled={!view.canMap} onClick={() => void mapCapturedEdits()} style={buttonStyle(!view.canMap)}>
            Step 4: Map captured edits
          </button>
          <button type="button" disabled={!view.canApply} onClick={() => void applyConfirmed()} style={buttonStyle(!view.canApply, "primary")}>
            Step 5: Apply safe mappings to draft
          </button>
          <button type="button" disabled={!view.canGeneratePreview} onClick={() => void generatePreviewFromAppliedDraft()} style={buttonStyle(!view.canGeneratePreview, "primary")}>
            Step 6: Generate internal preview from applied draft
          </button>
          {view.previewUrl ? (
            <a href={view.previewUrl} target="_blank" rel="noreferrer" style={{ ...buttonStyle(false), textAlign: "center", textDecoration: "none" }}>
              Step 7: Open generated internal preview
            </a>
          ) : (
            <button type="button" disabled style={buttonStyle(true)}>
              Step 7: Open generated internal preview
            </button>
          )}
        </div>
        <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>
          {view.openAirshipDisabledReason ?? "Airship session URL is available after prepare. Start the static target first if the Airship CLI needs the target running."}
        </div>
      </div>

      <div style={{ color: status === "failed" || status === "blocked" ? "#92400e" : "#334155", fontSize: 13, fontWeight: 850, lineHeight: 1.45 }}>
        {message}
      </div>

      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        {fact("Status", labelize(status))}
        {fact("Workflow status", currentReadback?.status ?? "not prepared")}
        {fact("Saved draft", view.draftLabel)}
        {fact("Draft before/after", currentReadback?.draft ? `${currentReadback.draft.idBefore ?? "missing"} v${currentReadback.draft.versionBefore ?? "?"} -> ${currentReadback.draft.idAfter ?? "missing"} v${currentReadback.draft.versionAfter ?? "?"}` : "not available")}
        {fact("Workspace path", currentReadback?.workspacePath ?? "not prepared")}
        {fact("Static target", view.targetUrl ?? "not prepared")}
        {fact("Airship session", view.openAirshipHref ?? "not prepared")}
        {fact("Changed files", view.changedFilesCount)}
        {fact("Hash summary", hashSummary(currentReadback))}
        {fact("Mapping summary", mappingText)}
        {fact("Applied fields", appliedFieldText)}
        {fact("Mutation boundaries", view.mutationFlagsText)}
        {fact("Safety flags", view.safetyFlagsText)}
        {fact("Next action", result?.nextRecommendedAction ?? mapped?.nextRecommendedAction ?? prepared?.nextRecommendedAction ?? "Prepare Airship session")}
      </dl>

      {prepared ? (
        <div style={{ border: "1px solid #ccfbf1", borderRadius: 8, background: "#f8fffe", padding: 10, display: "grid", gap: 8 }}>
          <div style={{ color: "#0f766e", fontSize: 13, fontWeight: 950 }}>Open Airship editor affordance</div>
          <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45, overflowWrap: "anywhere" }}>
            {view.openAirshipHref
              ? `Real local session URL: ${view.openAirshipHref}`
              : view.openAirshipDisabledReason}
          </div>
          <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
            When you finish editing in Airship, return to this GNR8 tab and click Capture changes. Stop the local Airship/static processes from the Codex task or terminal that started them.
          </div>
        </div>
      ) : null}

      {commandBlock("Local static target command", view.localRunnerCommand)}
      {commandBlock("Manual Airship CLI command", view.manualAirshipCommand)}

      <label style={{ display: "flex", gap: 8, alignItems: "start", color: "#334155", fontSize: 13, fontWeight: 850, lineHeight: 1.45 }}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!view.hasSafeMappings || busy}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
          style={{ marginTop: 2 }}
        />
        Confirm applying exact safe mapped text edits to the saved Airship draft only. Captured edits saved to draft; Preview not regenerated yet.
      </label>

      {result ? (
        <div style={{ border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", padding: 10, display: "grid", gap: 8 }}>
          <div style={{ color: "#166534", fontSize: 13, fontWeight: 950 }}>Result readback</div>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            {fact("Applied count", result.appliedCount)}
            {fact("Skipped count", result.skippedCount)}
            {fact("Applied fields", appliedFieldText)}
            {fact("Skipped mappings", skippedMappingText)}
            {fact("Draft before", result.draft.versionBefore === null ? "missing" : `v${result.draft.versionBefore}`)}
            {fact("Draft after", result.draft.versionAfter === null ? "missing" : `v${result.draft.versionAfter}`)}
            {fact("Draft save", "Captured edits saved to draft")}
            {fact("Preview", "Preview not regenerated yet")}
          </dl>
        </div>
      ) : null}

      {previewResult ? (
        <div style={{ border: "1px solid #bae6fd", borderRadius: 8, background: "#f0f9ff", padding: 10, display: "grid", gap: 8 }}>
          <div style={{ color: "#075985", fontSize: 13, fontWeight: 950 }}>Internal preview readback</div>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            {fact("Sequence", "Draft updated first; preview generated second")}
            {fact("Draft version used", `v${previewResult.draftVersionUsed}`)}
            {fact("Generated site version", previewResult.generatedSiteVersionId)}
            {fact("Generated artifact", previewResult.generatedRuntimeArtifactId)}
            {fact("Artifact validity", previewResult.artifactValidityResult.valid ? "passed" : previewResult.artifactValidityResult.reasons.join(", "))}
            {fact("Applied headline", previewResult.generatedArtifactContainsAppliedHeadline ? "found in generated artifact" : "missing from generated artifact")}
            {fact("Live site", "unchanged")}
          </dl>
          <a href={previewResult.internalPreviewUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", fontSize: 13, fontWeight: 900, textDecoration: "none", overflowWrap: "anywhere" }}>
            {previewResult.internalPreviewUrl}
          </a>
        </div>
      ) : null}
    </div>
  );
}
