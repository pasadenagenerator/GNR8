"use client";

import Link from "next/link";
import { useState } from "react";

type PublicationInput = {
  siteVersionId: string;
  candidateId: string;
  runtimeSiteId: string;
  sourceArtifactId: string;
  sourceContentSha256: string;
  sourceStorageSha256: string;
  expectedActiveSiteVersionId: string;
  expectedActiveArtifactId: string;
  expectedInternalHost: string;
};

type PublicationResult = {
  ok?: boolean;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

export function AstroSuccessorPublicationAction(props: PublicationInput) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [result, setResult] = useState<PublicationResult | null>(null);

  async function publish() {
    setPending(true);
    setStatus(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/gnr8/admin/astro-candidates/${encodeURIComponent(props.siteVersionId)}/${encodeURIComponent(props.candidateId)}/publish-successor`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode: "shadow_publish",
            confirmation: "publish-generated-astro-successor-to-shadow",
            runtimeSiteId: props.runtimeSiteId,
            sourceArtifactId: props.sourceArtifactId,
            sourceContentSha256: props.sourceContentSha256,
            sourceStorageSha256: props.sourceStorageSha256,
            expectedActiveSiteVersionId: props.expectedActiveSiteVersionId,
            expectedActiveArtifactId: props.expectedActiveArtifactId,
            expectedInternalHost: props.expectedInternalHost,
          }),
        },
      );
      setStatus(response.status);
      setResult(await response.json() as PublicationResult);
    } catch {
      setResult({ ok: false, code: "publication_request_failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 16, maxWidth: 960 }}>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 16px", margin: 0 }}>
        <dt>Runtime site</dt><dd><code>{props.runtimeSiteId}</code></dd>
        <dt>Source version</dt><dd><code>{props.siteVersionId}</code></dd>
        <dt>Source candidate</dt><dd><code>{props.candidateId}</code></dd>
        <dt>Source artifact</dt><dd><code>{props.sourceArtifactId}</code></dd>
        <dt>Expected active version</dt><dd><code>{props.expectedActiveSiteVersionId}</code></dd>
        <dt>Expected active artifact</dt><dd><code>{props.expectedActiveArtifactId}</code></dd>
        <dt>Internal host</dt><dd><code>{props.expectedInternalHost}</code></dd>
      </dl>
      <p style={{ margin: 0, color: "#475569" }}>
        This guarded action creates or reuses the deterministic successor, persists exact build and content evidence,
        and stops for explicit artifact-bound review. After approval, run it again to publish only to the internal shadow stage.
      </p>
      <button
        type="button"
        onClick={publish}
        disabled={pending || result?.ok === true}
        style={{
          justifySelf: "start",
          minHeight: 44,
          padding: "10px 16px",
          border: "1px solid #0f766e",
          borderRadius: 8,
          background: pending || result?.ok === true ? "#e2e8f0" : "#0f766e",
          color: pending || result?.ok === true ? "#475569" : "white",
          fontWeight: 800,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Publishing…" : result?.ok === true ? "Published to shadow" : "Publish approved successor to shadow"}
      </button>
      {result ? (
        <section role="status" style={{ padding: 16, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
          <strong>{result.ok ? "Publication complete" : "Publication refused"}{status ? ` · HTTP ${status}` : ""}</strong>
          <pre style={{ margin: "12px 0 0", overflow: "auto", whiteSpace: "pre-wrap", fontSize: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          {typeof result.reviewUrl === "string" ? (
            <p style={{ margin: "12px 0 0" }}><Link href={result.reviewUrl}>Review and approve the exact generated artifact</Link></p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
