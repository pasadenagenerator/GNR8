import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { SingleSiteMvpSourceCaptureExecutionSurface } from "../_components/SingleSiteMvpSourceCaptureExecutionSurface";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SingleSiteMvpSourceCaptureCommandCenterPage() {
  await requireSuperadminUserIdForPage();
  return <SingleSiteMvpSourceCaptureExecutionSurface />;
}
