import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";
import {
  AIRSHIP_CHS_MIGRATION_ID,
  getAirshipSingleSiteEditorReadonlyProjection,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

import { AirshipSingleSiteVisualEditorWorkspace } from "./airship-single-site-visual-editor-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  migrationId?: string | string[];
  draftId?: string | string[];
};

function param(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
}

export default async function AirshipSingleSiteEditorPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireSuperadminUserIdForPage();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const model = await getAirshipSingleSiteEditorReadonlyProjection({
    migrationId: param(searchParams?.migrationId) ?? AIRSHIP_CHS_MIGRATION_ID,
  });

  if (model.draftPanel.drafts.length === 0 || !model.draftPanel.draftPreview) {
    return (
      <main style={{ minHeight: "100vh", padding: 20, background: "#f8fafc", color: "#0f172a" }}>
        <section style={{ display: "grid", gap: 12, border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", color: "#92400e", padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Draft editor</div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Airship editor unavailable</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
            No homepage hero/intro draft fields are available. Internal preview only. Not live. Not published.
          </p>
          <a href={model.routeHref} style={{ color: "#0369a1", fontSize: 14, fontWeight: 850, textDecoration: "none" }}>
            Back to Airship
          </a>
        </section>
      </main>
    );
  }

  return (
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      draftCandidate={model.previews.airshipDraftCandidate ? {
        siteVersionId: model.previews.airshipDraftCandidate.siteVersionId,
        runtimeArtifactId: model.previews.airshipDraftCandidate.runtimeArtifactId,
        route: model.previews.airshipDraftCandidate.route,
        draftId: model.previews.airshipDraftCandidate.draftId,
        draftVersion: model.previews.airshipDraftCandidate.draftVersion,
      } : null}
      draftPreview={model.draftPanel.draftPreview}
      drafts={model.draftPanel.drafts}
      persistence={model.draftPanel.persistence}
    />
  );
}
