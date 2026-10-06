import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { readGeneratedOutputReviewModel } from "@/gnr8/output-adapters/generated-output-publication-composition";
import { isCanonicalUuid } from "@/gnr8/output-adapters/astro-production-candidate-record";
import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { GeneratedOutputReviewAction } from "./generated-output-review-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function GeneratedOutputReviewPage(props: { params: Promise<{ siteVersionId: string }> }) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") redirect("/login");
    if (message.startsWith("Forbidden")) redirect("/superadmin");
    throw error;
  }
  if (process.env.VERCEL_ENV !== "preview" || !isAstroProductionCandidatePreviewFeatureEnabled()) notFound();
  const { siteVersionId } = await props.params;
  if (!isCanonicalUuid(siteVersionId)) notFound();
  const model = await readGeneratedOutputReviewModel(siteVersionId).catch(() => null);
  if (!model) notFound();

  const candidatePreview = (path: string) => `/api/gnr8/admin/astro-candidates/${encodeURIComponent(siteVersionId)}/${encodeURIComponent(model.candidateId)}/preview?path=${encodeURIComponent(path)}`;
  const technicalPass = model.decision.technical.status === "PASS";
  const approved = model.decision.review.status === "APPROVED";
  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px", background: "#e2e8f0", color: "#0f172a" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={{ padding: 22, border: "1px solid #cbd5e1", borderRadius: 12, background: "white" }}>
          <p style={{ margin: "0 0 8px", color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Authenticated generated-output review</p>
          <h1 style={{ margin: "0 0 10px" }}>Astro website candidate</h1>
          <p style={{ margin: "0 0 16px", color: "#475569" }}>Review the exact candidate bytes below. Approval is bound to this artifact, candidate, content manifest, technical evaluation, policy version, reviewer identity, and internal shadow stage.</p>
          <dl style={{ display: "grid", gridTemplateColumns: "max-content minmax(0, 1fr)", gap: "6px 14px", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
            <dt>Version</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.siteVersionId} · {model.state}</dd>
            <dt>Artifact</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.artifactId}</dd>
            <dt>Artifact SHA-256</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.artifactBundleSha256}</dd>
            <dt>Candidate</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.candidateId}</dd>
            <dt>Candidate SHA-256</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.candidateContentSha256}</dd>
            <dt>Adapter</dt><dd style={{ margin: 0 }}>{model.adapterId}</dd>
            <dt>Producer</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.producer}</dd>
            <dt>Capture</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.sourceCapture.snapshotId} / {model.sourceCapture.snapshotRunId}</dd>
            <dt>Captured at</dt><dd style={{ margin: 0 }}>{model.sourceCapture.capturedAt}</dd>
            <dt>Build evidence</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.buildEvidenceSha256}</dd>
            <dt>Technical evaluation</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{model.decision.technical.evidenceSha256}</dd>
            <dt>Technical status</dt><dd style={{ margin: 0 }}>{model.decision.technical.status}</dd>
            <dt>Review status</dt><dd style={{ margin: 0 }}>{model.decision.review.status}</dd>
            <dt>Owned assets</dt><dd style={{ margin: 0 }}>{model.requiredAssetCount}</dd>
          </dl>
          <section style={{ margin: "16px 0", padding: 12, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
            <strong>Captured routes</strong>
            <ul>{model.outputPaths.map((path) => <li key={path}><Link href={candidatePreview(path)} target="_blank" rel="noreferrer">{path}</Link></li>)}</ul>
            <p style={{ marginBottom: 0 }}>Outside the static adapter scope: {model.unsupportedCapabilities.join(", ") || "none"}.</p>
          </section>
          {model.decision.blockerReasons.length > 0 ? (
            <ul>{model.decision.blockerReasons.map((item) => <li key={item.code}><code>{item.code}</code>: {item.message}</li>)}</ul>
          ) : null}
          <p><Link href={candidatePreview("/")} target="_blank" rel="noreferrer">Open exact candidate in a new tab</Link></p>
          {approved ? (
            <p style={{ padding: 12, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8 }}>This exact artifact is approved and ready for the existing target-readiness and shadow-activation workflow.</p>
          ) : (
            <GeneratedOutputReviewAction
              siteVersionId={model.siteVersionId}
              artifactId={model.artifactId}
              artifactBundleSha256={model.artifactBundleSha256}
              candidateId={model.candidateId}
              candidateContentSha256={model.candidateContentSha256}
              contentManifestSha256={model.contentManifestSha256}
              technicalEvaluationSha256={model.decision.technical.evidenceSha256}
              disabled={!technicalPass || model.state !== "READY_FOR_REVIEW"}
            />
          )}
        </section>
        <iframe title="Exact generated Astro candidate" src={candidatePreview("/")} style={{ display: "block", width: "100%", minHeight: "78vh", border: "1px solid #94a3b8", borderRadius: 12, background: "white" }} />
      </div>
    </main>
  );
}
