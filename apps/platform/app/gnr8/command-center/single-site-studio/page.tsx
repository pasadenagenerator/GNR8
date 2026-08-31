import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";
import { getSingleSiteStudioReadonlyProjection } from "@/gnr8/single-site/single-site-studio-readonly-projection";

import { SingleSiteStudio } from "./single-site-studio";

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

export default async function SingleSiteStudioPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireSuperadminUserIdForPage();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const model = await getSingleSiteStudioReadonlyProjection({
    migrationId: param(searchParams?.migrationId),
  });

  return <SingleSiteStudio model={model} />;
}
