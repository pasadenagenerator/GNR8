import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";
import { getAirshipImportedSiteOnboardingProjection } from "@/gnr8/single-site/airship-imported-site-onboarding-projection";

import { AirshipImportedSiteOnboarding } from "./airship-imported-site-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AirshipOnboardingPage() {
  await requireSuperadminUserIdForPage();
  const model = await getAirshipImportedSiteOnboardingProjection();

  return <AirshipImportedSiteOnboarding model={model} />;
}
