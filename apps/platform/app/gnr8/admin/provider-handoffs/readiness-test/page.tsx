import { redirect } from "next/navigation";

import { ProviderHandoffReadinessTestClient } from "@/app/gnr8/admin/provider-handoffs/readiness-test/readiness-test-client";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProviderHandoffReadinessTestPage() {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") {
      redirect("/login");
    }
    if (message.startsWith("Forbidden")) {
      redirect("/superadmin");
    }
    throw error;
  }

  return <ProviderHandoffReadinessTestClient />;
}
