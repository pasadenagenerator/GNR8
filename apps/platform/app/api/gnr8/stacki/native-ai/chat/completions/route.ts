import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from "@/gnr8/output-adapters/astro-production-candidate-object-store";
import { AirshipOpenAIByokProviderService } from "@/gnr8/single-site/airship-openai-byok-provider";
import { StackiSessionStore } from "@/gnr8/stacki/stacki-session-store";
import { createStackiNativeAiRoute } from "@/gnr8/stacki/stacki-native-ai-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
function client() {
  const value = getSupabaseServiceRoleClient();
  if (!value) throw new Error("gnr8_ai_storage_unavailable");
  return value;
}
export const POST = createStackiNativeAiRoute({
  enabled: () => process.env.GNR8_AI_EXECUTION_ENABLED === "true" &&
    process.env.GNR8_STACKI_SESSIONS_ENABLED === "1",
  authorize: async (sessionId, token) => {
    await new StackiSessionStore(client(), process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? "")
      .authorizedAiSession(sessionId, token);
  },
  credential: () => new AirshipOpenAIByokProviderService().readServerCredential(),
  reserve: async () => {
    const { data, error } = await client().rpc("gnr8_stacki_native_ai_reserve");
    if (error || typeof data !== "string") throw new Error("gnr8_stacki_ai_budget_unavailable");
    return data;
  },
  finish: async (id, usage) => {
    const { error } = await client().rpc("gnr8_stacki_native_ai_finish", {
      reservation_id: id, input_tokens: usage?.inputTokens ?? null, output_tokens: usage?.outputTokens ?? null,
    });
    if (error) throw new Error("gnr8_stacki_ai_reconciliation_required");
  },
});
