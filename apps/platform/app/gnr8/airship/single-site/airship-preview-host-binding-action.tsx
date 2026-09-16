"use client";

import React, { useState } from "react";

import type { AirshipPreviewHostReadback } from "@/gnr8/single-site/airship-preview-host-binding-service";

type Props = {
  migrationId: string | null;
  readback: AirshipPreviewHostReadback | null;
};

type ActionState = "idle" | "creating" | "created" | "failed";

type PreviewHostResponse = {
  ok?: boolean;
  previewHost?: {
    status: "created" | "reused";
    previewUrl: string;
    host: string;
    activationNotice: string | null;
  };
  error?: string;
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${disabled ? "#cbd5e1" : "#0f766e"}`,
    borderRadius: 8,
    background: disabled ? "#f8fafc" : "#0f766e",
    color: disabled ? "#94a3b8" : "#fff",
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function AirshipPreviewHostBindingAction({ migrationId, readback }: Props) {
  const [state, setState] = useState<ActionState>("idle");
  const [message, setMessage] = useState(() =>
    readback?.binding
      ? `Preview host binding ${readback.binding.status.toLowerCase()} for ${readback.suggestedHostname}.`
      : "No GNR8 demo preview-host binding exists for this candidate.",
  );
  if (!readback) return null;
  const disabled = state === "creating" || !migrationId || !readback.action.enabled;

  async function createBinding() {
    if (disabled) return;
    setState("creating");
    setMessage("Creating GNR8 demo preview-host binding without active pointer changes...");
    try {
      const response = await fetch(readback.action.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode: readback.action.actionMode,
          migrationId,
          candidateSiteVersionId: readback.candidateSiteVersionId,
          candidateArtifactId: readback.candidateArtifactId,
          hostname: readback.suggestedHostname,
          idempotencyKey: `airship-preview-host:${readback.suggestedHostname}:${readback.candidateSiteVersionId}:${readback.candidateArtifactId}`,
        }),
      });
      const payload = await response.json() as PreviewHostResponse;
      if (!response.ok || !payload.ok || !payload.previewHost) throw new Error(payload.error || "airship_preview_host_failed");
      setState("created");
      setMessage(
        payload.previewHost.activationNotice ??
          `${payload.previewHost.status === "reused" ? "Reused" : "Created"} preview host binding for ${payload.previewHost.host}.`,
      );
    } catch {
      setState("failed");
      setMessage("Failed to create preview host binding. No active pointer, publish, or customer DNS mutation was requested.");
    }
  }

  return (
    <div style={{ border: "1px solid #99f6e4", borderRadius: 8, background: "#f0fdfa", padding: 12, display: "grid", gap: 9 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900 }}>GNR8 demo preview, not live</div>
          <div style={{ marginTop: 3, color: "#334155", fontSize: 12, lineHeight: 1.45 }}>{message}</div>
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-busy={state === "creating"}
          aria-label="Create GNR8 demo preview host binding"
          onClick={() => void createBinding()}
          style={buttonStyle(disabled)}
        >
          {state === "creating" ? "Creating..." : "Create preview host binding"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 12, fontWeight: 850 }}>
        <span>{state === "failed" ? "failed" : state === "creating" ? "creating" : readback.binding ? "bound" : "missing"}</span>
        <span>candidate preview only</span>
        <span>no active pointer</span>
        <span>no customer DNS</span>
      </div>
      {readback.action.disabledReason ? (
        <div style={{ color: "#92400e", fontSize: 12, lineHeight: 1.45 }}>{readback.action.disabledReason}</div>
      ) : null}
    </div>
  );
}
