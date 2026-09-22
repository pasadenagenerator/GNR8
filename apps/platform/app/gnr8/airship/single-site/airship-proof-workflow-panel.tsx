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
  status: string;
  workspacePath: string | null;
  targetUrl?: string;
  targetPort?: number;
  sessionPort?: number;
  expectedAirshipSessionUrl?: string;
  localRunnerCommand?: CommandDescriptor;
  manualAirshipCommand: CommandDescriptor | null;
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
};

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

export function AirshipProofWorkflowPanel(props: Props) {
  const [status, setStatus] = useState<WorkflowStatus>("not_prepared");
  const [prepared, setPrepared] = useState<ProofWorkflowReadback | null>(null);
  const [mapped, setMapped] = useState<ProofWorkflowReadback | null>(null);
  const [result, setResult] = useState<ProofWorkflowReadback | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewGenerationReadback | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("Not prepared. Prepare a local proof workspace before running the manual Airship sidecar command.");
  const [busy, setBusy] = useState(false);

  const currentReadback = result ?? mapped ?? prepared;
  const canPrepare = Boolean(props.migrationId) && !busy;
  const canCaptureMap = Boolean(props.migrationId && prepared) && !busy;
  const hasSafeMappings = Boolean((mapped?.mappingSummary?.exactSafeApplyCandidateCount ?? 0) > 0);
  const canApply = Boolean(props.migrationId && hasSafeMappings && confirmed) && !busy;
  const canGeneratePreview = Boolean(props.migrationId && result?.status === "applied_to_draft") && !busy;
  const statusTone = status === "applied" ? "good" : status === "blocked" || status === "failed" ? "warn" : "neutral";
  const draftLabel = props.savedDraftId && props.savedDraftVersion
    ? `${props.savedDraftId} v${props.savedDraftVersion}`
    : "Saved draft required before confirmed apply";
  const mappingText = useMemo(() => {
    const summary = mapped?.mappingSummary;
    if (!summary) return "No captured edits mapped yet.";
    return `${summary.exactSafeApplyCandidateCount} exact/safe; ${summary.unsupportedEntryCount} skipped/unsupported; ${summary.entryCount} total.`;
  }, [mapped]);
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
    if (!canPrepare) return;
    setBusy(true);
    setMessage("Preparing local/manual proof workspace...");
    try {
      const readback = mappedReadback(await post({ actionMode: "prepare", migrationId: props.migrationId }));
      setPrepared(readback);
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

  async function captureAndMap() {
    if (!canCaptureMap) return;
    setBusy(true);
    setMessage("Capturing local workspace changes and mapping safe draft edits...");
    try {
      const readback = await post({ actionMode: "capture_map", migrationId: props.migrationId, preparedWorkflow: prepared });
      const mappedWorkflow = mappedReadback(readback);
      setMapped(mappedWorkflow);
      setResult(null);
      setPreviewResult(null);
      setConfirmed(false);
      setStatus("mapped");
      setMessage(mappedWorkflow?.readback ?? "Captured and mapped local Airship proof edits.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Airship proof capture/map failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyConfirmed() {
    if (!canApply) return;
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
    if (!canGeneratePreview) return;
    setBusy(true);
    setMessage("Generating a separate internal preview candidate from the saved applied draft...");
    try {
      const readback = previewGenerationReadback(await post({
        actionMode: "generate_internal_preview_from_applied_draft",
        migrationId: props.migrationId,
        appliedWorkflow: result,
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
            Proof-only, local/manual. Does not publish, regenerate preview, change the live site, mutate DNS/provider state, or replace the current editor route.
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {badge(status, statusTone)}
          {badge("manual only", "neutral")}
          {badge("not live", "warn")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={!canPrepare} aria-busy={busy && status === "not_prepared"} onClick={() => void prepare()} style={buttonStyle(!canPrepare, "primary")}>
          Prepare Airship session
        </button>
        <button type="button" disabled={!canCaptureMap} onClick={() => void captureAndMap()} style={buttonStyle(!canCaptureMap)}>
          Capture changes
        </button>
        <button type="button" disabled={!canCaptureMap} onClick={() => void captureAndMap()} style={buttonStyle(!canCaptureMap)}>
          Map captured edits
        </button>
        <button type="button" disabled={!canApply} onClick={() => void applyConfirmed()} style={buttonStyle(!canApply, "primary")}>
          Apply safe mappings to draft
        </button>
        <button type="button" disabled={!canGeneratePreview} onClick={() => void generatePreviewFromAppliedDraft()} style={buttonStyle(!canGeneratePreview, "primary")}>
          Generate internal preview from applied draft
        </button>
      </div>

      <div style={{ color: status === "failed" || status === "blocked" ? "#92400e" : "#334155", fontSize: 13, fontWeight: 850, lineHeight: 1.45 }}>
        {message}
      </div>

      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        {fact("Status", labelize(status))}
        {fact("Saved draft", draftLabel)}
        {fact("Workspace path", currentReadback?.workspacePath ?? "not prepared")}
        {fact("Static target", prepared?.targetUrl ?? "not prepared")}
        {fact("Airship session", prepared?.expectedAirshipSessionUrl ?? "not prepared")}
        {fact("Hash summary", hashSummary(currentReadback))}
        {fact("Mapping summary", mappingText)}
        {fact("Next action", result?.nextRecommendedAction ?? mapped?.nextRecommendedAction ?? prepared?.nextRecommendedAction ?? "Prepare Airship session")}
      </dl>

      {commandBlock("Local static target command", prepared?.localRunnerCommand)}
      {commandBlock("Manual Airship CLI command", prepared?.manualAirshipCommand)}

      <label style={{ display: "flex", gap: 8, alignItems: "start", color: "#334155", fontSize: 13, fontWeight: 850, lineHeight: 1.45 }}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!hasSafeMappings || busy}
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
