import { getSingleSitePublishOperatorReadonlyProjection } from "@/gnr8/single-site/single-site-publish-operator-readonly-projection";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { SingleSitePublishOperatorPanel } from "./_components/SingleSitePublishOperatorPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  migrationId?: string | string[];
  siteId?: string | string[];
  candidateSiteVersionRef?: string | string[];
};

function param(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
}

export default async function SingleSitePublishOperatorCommandCenterPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireSuperadminUserIdForPage();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const model = await getSingleSitePublishOperatorReadonlyProjection({
    migrationId: param(searchParams?.migrationId),
    siteId: param(searchParams?.siteId),
    candidateSiteVersionRef: param(searchParams?.candidateSiteVersionRef),
    limit: 12,
  });

  return <SingleSitePublishOperatorPanel model={model} />;
}
