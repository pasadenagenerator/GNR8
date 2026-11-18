import "server-only";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";
import { generateWithinBudget, type AIBudget, type AIRequest, type AIResponse } from "./provider";
import { OpenAIProvider } from "./openai-provider";

class SupabaseAIBudget implements AIBudget {
  private client() {
    const client = getSupabaseServiceRoleClient();
    if (!client) throw new Error("gnr8_ai_budget_unavailable");
    return client;
  }
  async reserve(): Promise<string> {
    const { data, error } = await this.client().rpc("gnr8_ai_trial_reserve");
    if (error || typeof data !== "string") throw new Error("gnr8_ai_budget_unavailable_or_exceeded");
    return data;
  }
  async finish(id: string, usage?: AIResponse["usage"]): Promise<void> {
    const { error } = await this.client().rpc("gnr8_ai_trial_finish", {
      reservation_id: id, input_tokens: usage?.inputTokens ?? null, output_tokens: usage?.outputTokens ?? null,
    });
    if (error) throw new Error("gnr8_ai_budget_reconciliation_required");
  }
}

export async function callGnr8OpenAI(input: { apiKey: string; model: string } & AIRequest): Promise<AIResponse> {
  // Deployment and possession of a key do not authorize live execution.
  if (process.env.GNR8_AI_EXECUTION_ENABLED !== "true") throw new Error("gnr8_ai_execution_disabled");
  if (!new Set(["gpt-5.4-mini", "gpt-5.4-mini-2026-03-17"]).has(input.model)) throw new Error("gnr8_ai_model_not_allowed");
  return generateWithinBudget(new OpenAIProvider(input.apiKey), new SupabaseAIBudget(), input);
}
