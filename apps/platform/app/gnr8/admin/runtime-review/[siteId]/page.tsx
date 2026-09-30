import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import {
  getActiveHostBindingForHost,
  getActivePointerForSite,
  getRuntimeSiteSummary,
} from "@/gnr8/runtime/runtime-store";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const STAGING_INTERNAL_HOST_SUFFIX = ".staging.gnr8.test";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function RuntimeReviewPage(props: PageProps) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") redirect("/login");
    if (message.startsWith("Forbidden")) redirect("/superadmin");
    throw error;
  }

  if (process.env.VERCEL_ENV !== "preview" || !isAstroProductionCandidatePreviewFeatureEnabled()) {
    notFound();
  }

  const { siteId } = await props.params;
  if (!/^[a-z0-9_-]{8,160}$/.test(siteId)) notFound();
  const site = await getRuntimeSiteSummary(siteId);
  const host = site?.sourceHost?.trim().toLowerCase() ?? "";
  if (!site || host !== site.sourceHost || !host.endsWith(STAGING_INTERNAL_HOST_SUFFIX)) notFound();

  let sourceHost = "";
  try {
    sourceHost = new URL(site.sourceUrl).hostname.toLowerCase();
  } catch {
    notFound();
  }
  if (sourceHost !== host) notFound();

  const [binding, pointer] = await Promise.all([
    getActiveHostBindingForHost(host),
    getActivePointerForSite(siteId),
  ]);
  if (
    !binding ||
    binding.siteId !== siteId ||
    binding.host !== host ||
    binding.status !== "ACTIVE" ||
    binding.bindingKind !== "shadow" ||
    !pointer
  ) {
    notFound();
  }

  const runtimePath = `/api/gnr8/admin/runtime-review/${encodeURIComponent(siteId)}?path=%2F`;
  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px", background: "#e2e8f0", color: "#0f172a" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ marginBottom: 16, padding: 20, border: "1px solid #cbd5e1", borderRadius: 12, background: "white" }}>
          <p style={{ margin: "0 0 8px", color: "#475569", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Internal shadow publication review
          </p>
          <h1 style={{ margin: "0 0 10px" }}>Active runtime artifact</h1>
          <p style={{ margin: "0 0 12px", color: "#475569" }}>
            This view executes the published runtime path for the server-owned target below. It is not candidate-preview HTML.
          </p>
          <dl style={{ display: "grid", gridTemplateColumns: "max-content minmax(0, 1fr)", gap: "6px 14px", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}>
            <dt>Host</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{host}</dd>
            <dt>Version</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{pointer.siteVersionId}</dd>
            <dt>Artifact</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{pointer.artifactId}</dd>
          </dl>
          <p style={{ margin: "14px 0 0" }}>
            <Link href={runtimePath} target="_blank" rel="noreferrer">Open active runtime artifact in a new tab</Link>
          </p>
        </div>
        <iframe
          title="CHS active runtime artifact"
          src={runtimePath}
          style={{ display: "block", width: "100%", minHeight: "78vh", border: "1px solid #94a3b8", borderRadius: 12, background: "white" }}
        />
      </div>
    </main>
  );
}
