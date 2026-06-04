"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useState } from "react";

import {
  submitMigrationBatchAction,
  type MigrationBatchControlAction,
} from "../../_lib/migration-batch-actions";

type Props = {
  batchId: string;
  runEndpoint: string;
  resumeEndpoint: string;
};

function buttonStyle(disabled: boolean): CSSProperties {
  return {
    height: 36,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: disabled ? "#f8fafc" : "#ffffff",
    color: disabled ? "#94a3b8" : "#111827",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    fontWeight: 700,
  };
}

export function MigrationBatchControls(props: Props) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<MigrationBatchControlAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: MigrationBatchControlAction) {
    setBusyAction(action);
    setMessage(null);
    setError(null);
    const endpoint = action === "run" ? props.runEndpoint : props.resumeEndpoint;
    const result = await submitMigrationBatchAction({ endpoint });
    setBusyAction(null);
    if (result.ok) {
      setMessage(action === "run" ? "Run requested successfully." : "Resume requested successfully.");
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  const busy = busyAction !== null;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={() => void runAction("run")} style={buttonStyle(busy)}>
          {busyAction === "run" ? "Running..." : "Run Batch"}
        </button>
        <button type="button" disabled={busy} onClick={() => void runAction("resume")} style={buttonStyle(busy)}>
          {busyAction === "resume" ? "Resuming..." : "Resume Batch"}
        </button>
      </div>
      {message ? <p style={{ margin: 0, fontSize: 12, color: "#166534" }}>{message}</p> : null}
      {error ? <p style={{ margin: 0, fontSize: 12, color: "#991b1b" }}>{error}</p> : null}
    </div>
  );
}
