import "server-only";
import { GNR8_AI_MODEL } from "../ai/provider";

const MAX_BODY_BYTES = 256_000;
const MAX_OUTPUT_TOKENS = 6_000;
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type Input = { model: string; max_tokens: number; messages: ChatMessage[] };
type Usage = { prompt_tokens: number; completion_tokens: number };

function validInput(value: unknown): value is Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join() !== "max_tokens,messages,model" || row.model !== GNR8_AI_MODEL ||
      !Number.isInteger(row.max_tokens) || Number(row.max_tokens) < 1 || Number(row.max_tokens) > MAX_OUTPUT_TOKENS ||
      !Array.isArray(row.messages) || row.messages.length < 1 || row.messages.length > 26) return false;
  return row.messages.every(message => message && typeof message === "object" && !Array.isArray(message) &&
    Object.keys(message).sort().join() === "content,role" &&
    ["system", "user", "assistant"].includes(message.role) && typeof message.content === "string");
}

async function boundedJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type") !== "application/json" ||
      Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw new Error("invalid_body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > MAX_BODY_BYTES) throw new Error("invalid_body");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createStackiNativeAiRoute(deps: {
  enabled(): boolean;
  authorize(sessionId: string, token: string): Promise<void>;
  credential(): Promise<{ apiKey: string; model: string } | null>;
  reserve(): Promise<string>;
  finish(id: string, usage?: { inputTokens: number; outputTokens: number }): Promise<void>;
  transport?: typeof fetch;
}) {
  return async function POST(request: Request): Promise<Response> {
    const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
    if (!deps.enabled()) return Response.json({ error: "AI unavailable" }, { status: 503, headers });
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "")?.[1];
    const sessionId = request.headers.get("x-gnr8-stacki-session") ?? "";
    if (!token || !/^[a-f0-9-]{36}$/.test(sessionId))
      return Response.json({ error: "Unauthorized" }, { status: 403, headers });
    try { await deps.authorize(sessionId, token); }
    catch { return Response.json({ error: "Unauthorized" }, { status: 403, headers }); }
    let input: unknown;
    try { input = await boundedJson(request); }
    catch { return Response.json({ error: "Invalid AI request" }, { status: 422, headers }); }
    if (!validInput(input)) return Response.json({ error: "Invalid AI request" }, { status: 422, headers });
    const credential = await deps.credential().catch(() => null);
    if (!credential || credential.model !== GNR8_AI_MODEL)
      return Response.json({ error: "AI unavailable" }, { status: 503, headers });
    let reservation: string;
    try { reservation = await deps.reserve(); }
    catch { return Response.json({ error: "AI test budget reached" }, { status: 429, headers }); }
    let usage: { inputTokens: number; outputTokens: number } | undefined;
    let result: Response;
    try {
      const provider = await (deps.transport ?? fetch)("https://api.openai.com/v1/chat/completions", {
        method: "POST", signal: AbortSignal.timeout(50_000),
        headers: { authorization: `Bearer ${credential.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model: GNR8_AI_MODEL, messages: input.messages,
          max_completion_tokens: input.max_tokens, reasoning_effort: "none", service_tier: "default", store: false }),
      });
      if (!provider.ok) throw new Error("provider_failed");
      const payload = await provider.json() as { choices?: unknown[]; usage?: Usage };
      if (!Array.isArray(payload.choices) || payload.choices.length < 1) throw new Error("provider_invalid");
      const u = payload.usage;
      if (u && Number.isSafeInteger(u.prompt_tokens) && Number.isSafeInteger(u.completion_tokens) &&
          u.prompt_tokens >= 0 && u.prompt_tokens <= 256_000 && u.completion_tokens >= 0 && u.completion_tokens <= MAX_OUTPUT_TOKENS)
        usage = { inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens };
      result = Response.json(payload, { headers });
    } catch {
      result = Response.json({ error: "AI provider unavailable" }, { status: 502, headers });
    }
    try { await deps.finish(reservation, usage); }
    catch { return Response.json({ error: "AI usage reconciliation required" }, { status: 503, headers }); }
    return result;
  };
}
