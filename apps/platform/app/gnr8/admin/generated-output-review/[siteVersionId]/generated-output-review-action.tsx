"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GeneratedOutputReviewAction(props: {
  siteVersionId: string;
  artifactId: string;
  artifactBundleSha256: string;
  candidateId: string;
  candidateContentSha256: string;
  contentManifestSha256: string;
  technicalEvaluationSha256: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function approve() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch(
        `/api/gnr8/admin/generated-output-review/${encodeURIComponent(props.siteVersionId)}/approve`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            confirmation: "approve-exact-generated-output-artifact",
            artifactId: props.artifactId,
            artifactBundleSha256: props.artifactBundleSha256,
            candidateId: props.candidateId,
            candidateContentSha256: props.candidateContentSha256,
            contentManifestSha256: props.contentManifestSha256,
            technicalEvaluationSha256: props.technicalEvaluationSha256,
          }),
        },
      );
      const body = await response.json() as Record<string, unknown>;
      setResult(body);
      if (response.ok) router.refresh();
    } catch {
      setResult({ ok: false, error: "review_request_failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <button
        type="button"
        onClick={approve}
        disabled={pending || props.disabled}
        style={{
          justifySelf: "start",
          padding: "12px 18px",
          border: 0,
          borderRadius: 8,
          background: pending || props.disabled ? "#cbd5e1" : "#166534",
          color: pending || props.disabled ? "#475569" : "white",
          fontWeight: 800,
        }}
      >
        {pending ? "Approving exact artifact…" : "Approve this exact artifact for internal shadow publication"}
      </button>
      {result ? <pre role="status" style={{ margin: 0, padding: 12, overflow: "auto", background: "#f1f5f9", borderRadius: 8 }}>{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}
