import { readAirshipAgencyAISettings } from "@/gnr8/single-site/airship-agent-profile-settings";

import { AISettingsView } from "./ai-settings-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommandCenterAISettingsPage() {
  const model = await readAirshipAgencyAISettings();

  return <AISettingsView model={model} />;
}
