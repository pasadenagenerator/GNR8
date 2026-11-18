import { callGnr8OpenAI } from "@/gnr8/ai/server-gateway";
import { AirshipOpenAIByokProviderService } from "@/gnr8/single-site/airship-openai-byok-provider";
import { createStackiAiTextRoute } from "@/gnr8/stacki/stacki-ai-text-route";
import { authorizeConfiguredStackiPilot } from "@/gnr8/stacki/stacki-draft-composition";
import { configuredStackiStore } from "@/gnr8/stacki/stacki-github-composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handlers = createStackiAiTextRoute({
  enabled: () => process.env.GNR8_STACKI_DRAFTS_ENABLED === "1",
  canGenerate: () => process.env.GNR8_AI_EXECUTION_ENABLED === "true",
  authorize: authorizeConfiguredStackiPilot,
  store: configuredStackiStore,
  generate: async (prompt, schema) => {
    const credential = await new AirshipOpenAIByokProviderService().readServerCredential();
    if (!credential) throw new Error("gnr8_ai_credential_missing");
    const response = await callGnr8OpenAI({ ...credential, prompt, schema });
    return response.outputText;
  },
});
export const POST = handlers.POST;
