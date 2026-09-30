import { redirect } from "next/navigation";

import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { AstroSuccessorPublicationAction } from "./astro-successor-publication-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ siteVersionId: string; candidateId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function requiredQueryValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required publication input: ${key}`);
  }
  return value;
}

export default async function AstroSuccessorPublicationPage(props: PageProps) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") redirect("/login");
    if (message.startsWith("Forbidden")) redirect("/superadmin");
    throw error;
  }

  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", background: "#f8fafc", color: "#0f172a" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: 24, border: "1px solid #cbd5e1", borderRadius: 12, background: "white" }}>
        <h1 style={{ marginTop: 0 }}>Astro successor shadow publication</h1>
        <AstroSuccessorPublicationAction
          siteVersionId={params.siteVersionId}
          candidateId={params.candidateId}
          runtimeSiteId={requiredQueryValue(searchParams, "runtimeSiteId")}
          sourceArtifactId={requiredQueryValue(searchParams, "sourceArtifactId")}
          sourceContentSha256={requiredQueryValue(searchParams, "sourceContentSha256")}
          sourceStorageSha256={requiredQueryValue(searchParams, "sourceStorageSha256")}
          expectedActiveSiteVersionId={requiredQueryValue(searchParams, "expectedActiveSiteVersionId")}
          expectedActiveArtifactId={requiredQueryValue(searchParams, "expectedActiveArtifactId")}
          expectedInternalHost={requiredQueryValue(searchParams, "expectedInternalHost")}
        />
      </div>
    </main>
  );
}
