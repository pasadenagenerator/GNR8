"use client";

import React, { useMemo, useState } from "react";

type CandidateSummary = {
  siteVersionId: string;
  runtimeArtifactId: string;
  route: string;
  draftId: string;
  draftVersion: number;
  statusLabel: string;
};

type Props = {
  migrationId: string | null;
  savedDraftId: string | null;
  savedDraftVersion: number | null;
  initialCandidate: CandidateSummary | null;
};

type ApplyState = "idle" | "creating" | "created" | "failed";

type CandidateResponse = {
  ok?: boolean;
  candidate?: CandidateSummary & { status: "created" | "reused" };
  error?: string;
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${disabled ? "#cbd5e1" : "#1d4ed8"}`,
    borderRadius: 8,
    background: disabled ? "#f8fafc" : "#1d4ed8",
    color: disabled ? "#94a3b8" : "#fff",
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function AirshipDraftCandidateAction(props: Props) {
  const [state, setState] = useState<ApplyState>("idle");
  const [candidate, setCandidate] = useState<CandidateSummary | null>(() => props.initialCandidate);
  const [message, setMessage] = useState(() =>
    props.initialCandidate
      ? `Latest internal preview candidate: draft v${props.initialCandidate.draftVersion}.`
      : "No internal preview candidate has been created from the saved draft yet.",
  );
  const disabled = state === "creating" || !props.migrationId || !props.savedDraftId;
  const isCurrentDraftCandidate = Boolean(candidate && props.savedDraftVersion && candidate.draftVersion === props.savedDraftVersion);
  const buttonLabel = useMemo(() => {
    if (state === "creating") return "Creating...";
    if (candidate) return "Apply saved draft to preview";
    return "Create internal preview candidate";
  }, [candidate, state]);

  async function applySavedDraftToPreview() {
    if (disabled) return;
    setState("creating");
    setMessage("Creating internal preview candidate from the saved Airship draft...");
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/draft-candidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode: "create_internal_preview_candidate",
          migrationId: props.migrationId,
          idempotencyKey: `airship-preview-candidate:${props.migrationId}:${props.savedDraftId}:${props.savedDraftVersion ?? "unknown"}`,
        }),
      });
      const payload = await response.json() as CandidateResponse;
      if (!response.ok || !payload.ok || !payload.candidate) throw new Error(payload.error || "airship_preview_candidate_failed");
      setCandidate(payload.candidate);
      setState("created");
      setMessage(
        payload.candidate.status === "reused"
          ? `Reused latest internal preview candidate for draft v${payload.candidate.draftVersion}.`
          : `Created internal preview candidate for draft v${payload.candidate.draftVersion}.`,
      );
    } catch {
      setState("failed");
      setMessage("Failed to create the internal preview candidate. No live site or active pointer changed.");
    }
  }

  return (
    <div style={{ border: "1px solid #bfdbfe", borderRadius: 8, background: "#eff6ff", padding: 12, display: "grid", gap: 9 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#1e40af", fontSize: 12, fontWeight: 900 }}>Saved draft to internal preview</div>
          <div style={{ marginTop: 3, color: "#334155", fontSize: 12, lineHeight: 1.45 }}>{message}</div>
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-busy={state === "creating"}
          aria-label="Apply saved draft to preview"
          onClick={() => void applySavedDraftToPreview()}
          style={buttonStyle(disabled)}
        >
          {buttonLabel}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 12, fontWeight: 850 }}>
        <span>{state === "failed" ? "failed" : state === "creating" ? "creating" : candidate ? "created" : "ready"}</span>
        <span>internal preview only</span>
        <span>not live</span>
        <span>not published</span>
        {candidate && !isCurrentDraftCandidate ? <span>latest candidate is from draft v{candidate.draftVersion}</span> : null}
      </div>
      {candidate?.route ? (
        <a href={candidate.route} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontSize: 13, fontWeight: 900, textDecoration: "none", overflowWrap: "anywhere" }}>
          Open latest internal preview candidate
        </a>
      ) : null}
    </div>
  );
}
