"use client";

import React, { useMemo, useState } from "react";

import type { AirshipMvpDemoReadiness } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

type Props = {
  migrationId: string | null;
  demoReadiness: AirshipMvpDemoReadiness;
};

type RollbackState = "idle" | "confirming" | "running" | "complete" | "failed";

type RollbackResponse = {
  ok?: boolean;
  outcome?: string;
  restoredPointer?: { siteVersionId: string; artifactId: string };
  error?: string;
  diagnostics?: string[];
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${disabled ? "#fecaca" : "#b91c1c"}`,
    borderRadius: 8,
    background: disabled ? "#fef2f2" : "#b91c1c",
    color: disabled ? "#991b1b" : "#fff",
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function pointerLabel(pointer: { siteVersionId: string; runtimeArtifactId: string }) {
  return `${pointer.siteVersionId} / ${pointer.runtimeArtifactId}`;
}

export function AirshipSimplePromoteRollbackAction(props: Props) {
  const [state, setState] = useState<RollbackState>("idle");
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState("Ready for superadmin rollback review. No action has been executed from this page load.");
  const rollbackAuditRow = props.demoReadiness.rollbackRefs.promoteAuditRows[0] ?? null;
  const idempotencyKey = useMemo(
    () =>
      `airship-simple-promote-rollback:${props.migrationId ?? "missing"}:${props.demoReadiness.rollbackRefs.currentSiteVersionId}:${props.demoReadiness.rollbackRefs.previousSiteVersionId}`,
    [props.demoReadiness.rollbackRefs.currentSiteVersionId, props.demoReadiness.rollbackRefs.previousSiteVersionId, props.migrationId],
  );
  const disabled = state === "running" || !armed || !props.migrationId || !rollbackAuditRow;

  async function executeRollback() {
    if (disabled) return;
    setState("running");
    setMessage("Requesting rollback readiness checks before pointer restore...");
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/rollback-simple-promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          migrationId: props.migrationId,
          currentSiteVersionId: props.demoReadiness.rollbackRefs.currentSiteVersionId,
          currentArtifactId: props.demoReadiness.rollbackRefs.currentRuntimeArtifactId,
          rollbackSiteVersionId: props.demoReadiness.rollbackRefs.previousSiteVersionId,
          rollbackArtifactId: props.demoReadiness.rollbackRefs.previousRuntimeArtifactId,
          promoteAuditRowId: rollbackAuditRow,
          idempotencyKey,
          reason: "Superadmin Airship simple promote rollback action from readiness UI.",
        }),
      });
      const payload = await response.json() as RollbackResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.diagnostics?.join("; ") || payload.error || "airship_simple_promote_rollback_failed");
      }
      setState("complete");
      setMessage(
        payload.outcome === "noop_already_rolled_back"
          ? `No-op: active pointer already matches rollback target ${pointerLabel({
              siteVersionId: props.demoReadiness.rollbackRefs.previousSiteVersionId,
              runtimeArtifactId: props.demoReadiness.rollbackRefs.previousRuntimeArtifactId,
            })}.`
          : `Rollback completed. Restored ${payload.restoredPointer?.siteVersionId ?? "unknown"} / ${payload.restoredPointer?.artifactId ?? "unknown"}.`,
      );
    } catch (error) {
      setState("failed");
      setMessage(error instanceof Error ? error.message : "Rollback request failed.");
    }
  }

  return (
    <div style={{ border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#991b1b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Admin-only destructive rollback</div>
          <div style={{ marginTop: 4, color: "#7f1d1d", fontSize: 13, lineHeight: 1.45 }}>
            Restores the active pointer from the current Airship demo target to the captured previous pointer after server-side audit and pointer checks.
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-busy={state === "running"}
          aria-label="Rollback active pointer to previous target"
          onClick={() => void executeRollback()}
          style={buttonStyle(disabled)}
        >
          {state === "running" ? "Checking..." : "Rollback active pointer"}
        </button>
      </div>
      <label style={{ display: "flex", alignItems: "start", gap: 8, color: "#7f1d1d", fontSize: 12, fontWeight: 850, lineHeight: 1.4 }}>
        <input
          type="checkbox"
          checked={armed}
          onChange={(event) => {
            setArmed(event.currentTarget.checked);
            setState(event.currentTarget.checked ? "confirming" : "idle");
          }}
          style={{ marginTop: 2 }}
        />
        I understand this is a superadmin-only active-pointer restore for the GNR8 demo runtime site.
      </label>
      <div style={{ color: state === "failed" ? "#991b1b" : "#334155", fontSize: 12, lineHeight: 1.45, overflowWrap: "anywhere" }}>{message}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 12, fontWeight: 850 }}>
        <span>{state}</span>
        <span>audit checked</span>
        <span>pointer restore only</span>
        <span>no provider call</span>
      </div>
    </div>
  );
}
