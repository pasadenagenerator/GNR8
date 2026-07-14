import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import { loadKnowledgeWorkspaceProjection } from "@/gnr8/architecture/knowledge-workspace-projection";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { KnowledgeWorkspace } from "./knowledge-workspace-components";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ siteVersionId: string }>;
};

const shellStyle: CSSProperties = {
  maxWidth: 1560,
  margin: "0 auto",
  padding: "32px 30px 64px",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  color: "#111827",
};

export default async function KnowledgeWorkspacePage(props: PageProps) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") redirect("/login");
    if (message.startsWith("Forbidden")) redirect("/superadmin");
    throw error;
  }

  const { siteVersionId: rawSiteVersionId } = await props.params;
  const siteVersionId = String(rawSiteVersionId ?? "").trim();
  const model = await loadKnowledgeWorkspaceProjection({ siteVersionId });

  return (
    <main style={shellStyle}>
      <KnowledgeWorkspace model={model} />
    </main>
  );
}
