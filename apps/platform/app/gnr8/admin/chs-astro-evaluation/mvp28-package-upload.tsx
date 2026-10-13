"use client";

import { useState, type FormEvent } from "react";

const MAX_PACKAGE_BYTES = 2_000_000;

type PreparedResult = {
  operationId: string;
  packageSha256: string;
  review: {
    siteVersionId: string;
    artifactId: string;
    artifactBundleSha256: string;
    candidateId: string;
    relativeUrl: string;
  };
};

export function Mvp28PackageUpload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreparedResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("package");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_PACKAGE_BYTES) {
      setError("Select the locally generated MVP 28 JSON package (maximum 2 MB).");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/gnr8/admin/chs-astro-evaluation/mvp28/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await file.text(),
      });
      const payload = await response.json() as PreparedResult & { error?: string; blockerCodes?: string[] };
      if (!response.ok) throw new Error(payload.blockerCodes?.join(", ") || payload.error || "Preparation failed");
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Preparation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #cbd5e1" }}>
      <h2>MVP 28 fresh capture package</h2>
      <p>
        This Preview-only action validates and persists the fixed CHS evaluation package. It prepares a review candidate;
        it does not approve or publish it.
      </p>
      <form onSubmit={submit}>
        <input name="package" type="file" accept="application/json,.json" required disabled={busy} />
        <button type="submit" disabled={busy} style={{ marginLeft: 12, padding: "10px 16px" }}>
          {busy ? "Validating and preparing…" : "Prepare exact candidate for review"}
        </button>
      </form>
      {error ? <p role="alert" style={{ color: "#b91c1c" }}>Blocked: {error}</p> : null}
      {result ? (
        <div style={{ marginTop: 18, padding: 14, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8 }}>
          <p><strong>Exact artifact is ready for human review.</strong></p>
          <p style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
            Operation {result.operationId}<br />
            Package {result.packageSha256}<br />
            Artifact {result.review.artifactId}<br />
            Bundle {result.review.artifactBundleSha256}
          </p>
          <a href={result.review.relativeUrl}>Open exact candidate review</a>
        </div>
      ) : null}
    </section>
  );
}
