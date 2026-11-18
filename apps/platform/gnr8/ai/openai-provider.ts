import "server-only";
import { GNR8_AI_MODEL, GNR8_AI_LIMITS, type AIProvider, type AIRequest, type AIResponse } from "./provider";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  constructor(private readonly apiKey: string, private readonly transport: typeof fetch = fetch) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    let response: Response;
    try {
      response = await this.transport("https://api.openai.com/v1/responses", {
        method: "POST", signal: AbortSignal.timeout(GNR8_AI_LIMITS.timeoutMs),
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: GNR8_AI_MODEL, input: request.prompt, store: false,
          service_tier: "default", reasoning: { effort: "low" },
          max_output_tokens: GNR8_AI_LIMITS.outputTokens,
          ...(request.schema ? { text: { format: { type: "json_schema", name: "gnr8_draft", strict: true, schema: request.schema } } } : {}),
        }),
      });
    } catch { throw new Error("gnr8_ai_transport_failed"); }
    // Never expose provider error bodies, headers, prompts or credentials.
    if (!response.ok) throw new Error(`gnr8_ai_provider_http_${response.status}`);
    const body = await response.json().catch(() => null);
    if (!body || body.status !== "completed" || !Array.isArray(body.output)) throw new Error("gnr8_ai_response_invalid");
    const outputText = body.output.flatMap((item: { content?: Array<{ type: string; text?: string }> }) =>
      Array.isArray(item.content) ? item.content.filter(c => c.type === "output_text" && typeof c.text === "string").map(c => c.text) : [],
    ).join("\n");
    if (!outputText || outputText.length > 16000) throw new Error("gnr8_ai_response_invalid");
    const u = body.usage;
    const usage = u && Number.isSafeInteger(u.input_tokens) && u.input_tokens >= 0 && Number.isSafeInteger(u.output_tokens) && u.output_tokens >= 0
      ? { inputTokens: u.input_tokens, outputTokens: u.output_tokens } : undefined;
    return { status: response.status, outputText, usage };
  }
}
