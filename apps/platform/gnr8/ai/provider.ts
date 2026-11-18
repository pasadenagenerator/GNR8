/** Provider-neutral boundary. Sference must implement this contract explicitly;
 * OpenAI wire compatibility is not assumed. Credentials never cross this boundary. */
export type AIRequest = { prompt: string; schema?: Record<string, unknown> };
export type AIResponse = {
  status: number;
  outputText: string;
  usage?: { inputTokens: number; outputTokens: number };
};
export interface AIProvider {
  readonly id: "openai" | "sference";
  generate(request: AIRequest): Promise<AIResponse>;
}

export const GNR8_AI_MODEL = "gpt-5.4-mini-2026-03-17";
export const GNR8_AI_LIMITS = Object.freeze({
  inputTokens: 4000, outputTokens: 1000, trialRequests: 10,
  dailyMicroUsd: 1_000_000, monthlyMicroUsd: 5_000_000,
  // Worst-case uncached list price, not a promise of a free request.
  reservationMicroUsd: 7500, timeoutMs: 45_000,
});

export interface AIBudget {
  reserve(): Promise<string>;
  finish(id: string, usage?: AIResponse["usage"]): Promise<void>;
}

export async function generateWithinBudget(provider: AIProvider, budget: AIBudget, request: AIRequest): Promise<AIResponse> {
  // UTF-8 bytes are a conservative bound for byte-level tokenization. Include
  // schema bytes and framing headroom; never silently truncate user input.
  const bytes = Buffer.byteLength(request.prompt + JSON.stringify(request.schema ?? {}), "utf8") + 512;
  if (bytes > GNR8_AI_LIMITS.inputTokens) throw new Error("gnr8_ai_input_limit");
  const id = await budget.reserve();
  let response: AIResponse | undefined;
  try {
    response = await provider.generate(request);
    return response;
  } finally {
    // Keep the full reservation even on timeout/invalid response: the provider
    // may have billed it. Failed reconciliation blocks further execution.
    await budget.finish(id, response?.usage);
  }
}
