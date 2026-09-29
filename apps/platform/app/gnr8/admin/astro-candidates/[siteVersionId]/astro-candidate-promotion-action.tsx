"use client";

import React, { useState } from "react";

type PromotionResponse = {
  ok: boolean;
  status?: "materialized" | "idempotent";
  runtimeArtifactId?: string;
  runtimeBundleSha256?: string;
  governance?: {
    status: "evaluated" | "blocked";
    decision: string | null;
    blockerCodes: string[];
  };
  workflowHandoff?: {
    recognized: boolean;
    approvalState: string;
    servingEligible: boolean;
    servingEligibilityReason: string;
    readyForShadowActivation: boolean;
    blockerCodes: string[];
  };
  blockerCodes?: string[];
};

export function AstroCandidatePromotionAction(props: {
  siteVersionId: string;
  candidateId: string;
  contentSha256: string;
  storageSha256: string;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PromotionResponse | null>(null);

  async function promote() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch(
        `/api/gnr8/admin/astro-candidates/${encodeURIComponent(props.siteVersionId)}/${encodeURIComponent(props.candidateId)}/promote`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contentSha256: props.contentSha256,
            storageSha256: props.storageSha256,
            idempotencyKey: `astro-promotion:${props.siteVersionId}:${props.candidateId}:${props.contentSha256}`,
          }),
        },
      );
      setResult(await response.json() as PromotionResponse);
    } catch {
      setResult({ ok: false, blockerCodes: ["promotion_request_failed"] });
    } finally {
      setPending(false);
    }
  }

  const blockers = result?.workflowHandoff?.blockerCodes ?? result?.blockerCodes ?? [];
  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={promote}
        disabled={pending}
        style={{
          minHeight: 40,
          padding: "8px 12px",
          border: "1px solid #0f766e",
          borderRadius: 8,
          background: pending ? "#e2e8f0" : "#f0fdfa",
          color: pending ? "#64748b" : "#0f766e",
          fontWeight: 800,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Materializing…" : "Materialize for governed workflow"}
      </button>
      <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
        This action does not publish, activate a pointer, or change a preview binding.
      </div>
      {result ? (
        <section role="status" style={{ marginTop: 12, padding: 12, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
          {result.ok ? (
            <>
              <strong>{result.status === "idempotent" ? "Already materialized" : "Materialization complete"}</strong>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                Runtime artifact: <code>{result.runtimeArtifactId}</code><br />
                Bundle: <code>{result.runtimeBundleSha256}</code><br />
                Governance: {result.governance?.status}{result.governance?.decision ? ` · ${result.governance.decision}` : ""}<br />
                Approval state: {result.workflowHandoff?.approvalState}<br />
                Workflow handoff: {result.workflowHandoff?.recognized ? "recognized" : "not recognized"}<br />
                Shadow activation readiness: {result.workflowHandoff?.readyForShadowActivation ? "ready" : "blocked"}
              </div>
            </>
          ) : <strong>Materialization refused</strong>}
          {blockers.length > 0 ? (
            <div style={{ marginTop: 8, color: "#9a3412", fontSize: 13 }}>
              Blocking reasons: {blockers.join(", ")}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
