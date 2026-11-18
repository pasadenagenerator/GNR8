import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";
import { readAirshipAgencyAISettings } from "@/gnr8/single-site/airship-agent-profile-settings";
import { readGnr8AiUsage } from "@/gnr8/ai/usage-read-model";

import { AISettingsView } from "./ai-settings-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommandCenterAISettingsPage() {
  await requireSuperadminUserIdForPage();

  const [model, usage] = await Promise.all([readAirshipAgencyAISettings(), readGnr8AiUsage()]);

  return <AISettingsView model={model} usage={usage} />;
}
