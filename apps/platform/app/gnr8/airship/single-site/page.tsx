import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";
import {
  AIRSHIP_CHS_MIGRATION_ID,
  getAirshipSingleSiteEditorReadonlyProjection,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

import { AirshipSingleSiteEditor } from "./airship-single-site-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  migrationId?: string | string[];
};

function param(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
}

export default async function AirshipSingleSitePage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireSuperadminUserIdForPage();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const model = await getAirshipSingleSiteEditorReadonlyProjection({
    migrationId: param(searchParams?.migrationId) ?? AIRSHIP_CHS_MIGRATION_ID,
  });

  return <AirshipSingleSiteEditor model={model} />;
}
