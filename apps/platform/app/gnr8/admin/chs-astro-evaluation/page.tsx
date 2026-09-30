import { redirect } from "next/navigation";

import { bootstrapChsAstroEvaluationTarget } from "@/gnr8/output-adapters/chs-astro-evaluation-bootstrap-service";
import { CHS_ASTRO_EVALUATION } from "@/gnr8/output-adapters/chs-astro-evaluation-contract";
import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function bootstrapAction() {
  "use server";
  const actor = await requireSuperadminUserIdForPage();
  if (process.env.VERCEL_ENV !== "preview" || !isAstroProductionCandidatePreviewFeatureEnabled()) {
    throw new Error("CHS_ASTRO_EVALUATION_PREVIEW_ONLY");
  }
  const result = await bootstrapChsAstroEvaluationTarget(actor);
  redirect(`/gnr8/admin/chs-astro-evaluation?bootstrapped=1&actorUserId=${encodeURIComponent(result.actorUserId)}&baselineArtifactId=${encodeURIComponent(result.baselineArtifactId)}&sourceArtifactId=${encodeURIComponent(result.sourceArtifactId)}`);
}

export default async function ChsAstroEvaluationPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") redirect("/login");
    if (message.startsWith("Forbidden")) redirect("/superadmin");
    throw error;
  }
  const searchParams = await props.searchParams;
  const bootstrapped = searchParams.bootstrapped === "1";
  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc", color: "#0f172a" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: 24, border: "1px solid #cbd5e1", borderRadius: 12, background: "white" }}>
        <p style={{ color: "#475569", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Preview-only internal operation</p>
        <h1>CHS Astro evaluation target</h1>
        <p>Creates or verifies the isolated staging runtime target and its authoritative CHS ownership lineage. It does not alter the existing CHS runtime site, bindings, or pointer.</p>
        <dl style={{ display: "grid", gridTemplateColumns: "max-content minmax(0, 1fr)", gap: "6px 14px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}>
          <dt>Runtime site</dt><dd style={{ margin: 0 }}>{CHS_ASTRO_EVALUATION.runtimeSiteId}</dd>
          <dt>Internal host</dt><dd style={{ margin: 0 }}>{CHS_ASTRO_EVALUATION.internalHost}</dd>
          <dt>Source version</dt><dd style={{ margin: 0 }}>{CHS_ASTRO_EVALUATION.sourceSiteVersionId}</dd>
        </dl>
        {bootstrapped ? (
          <p style={{ marginTop: 20, padding: 12, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8 }}>
            Evaluation target verified. Actor: {String(searchParams.actorUserId ?? "unknown")}; baseline artifact: {String(searchParams.baselineArtifactId ?? "unknown")}; source artifact: {String(searchParams.sourceArtifactId ?? "unknown")}.
          </p>
        ) : null}
        <form action={bootstrapAction} style={{ marginTop: 20 }}>
          <button type="submit" style={{ padding: "10px 16px", border: 0, borderRadius: 8, background: "#0f172a", color: "white", fontWeight: 700 }}>
            Create or verify isolated CHS target
          </button>
        </form>
      </div>
    </main>
  );
}
