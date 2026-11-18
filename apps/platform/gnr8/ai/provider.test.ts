import test from "node:test";
import assert from "node:assert/strict";
import { generateWithinBudget, GNR8_AI_MODEL, type AIBudget } from "./provider";
import { OpenAIProvider } from "./openai-provider";
import { callGnr8OpenAI } from "./server-gateway";

test("actual OpenAI adapter sends bounded request, parses usage, and never retries", async () => {
  let calls = 0;
  const provider = new OpenAIProvider("test-credential", (async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, GNR8_AI_MODEL);
    assert.equal(body.max_output_tokens, 1000);
    assert.equal(body.reasoning.effort, "low");
    assert.equal(body.service_tier, "default");
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.ok(init?.signal);
    return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: '{"ok":true}' }] }], usage: { input_tokens: 25, output_tokens: 10 } });
  }) as typeof fetch);
  let finished = false;
  const budget: AIBudget = { reserve: async () => "r1", finish: async (id, usage) => {
    assert.equal(id, "r1"); assert.deepEqual(usage, { inputTokens: 25, outputTokens: 10 }); finished = true;
  } };
  const result = await generateWithinBudget(provider, budget, { prompt: "test", schema: { type: "object" } });
  assert.equal(result.outputText, '{"ok":true}'); assert.equal(calls, 1); assert.ok(finished);
});

test("budget rejection and oversized UTF-8 input stop before transport", async () => {
  let calls = 0;
  const provider = { id: "sference" as const, generate: async () => { calls++; return { status: 200, outputText: "ok" }; } };
  const budget = { reserve: async () => { throw new Error("limit"); }, finish: async () => {} };
  await assert.rejects(generateWithinBudget(provider, budget, { prompt: "test" }), /limit/);
  await assert.rejects(generateWithinBudget(provider, budget, { prompt: "😀".repeat(1100) }), /input_limit/);
  assert.equal(calls, 0);
});

test("provider error body is redacted and uncertainty is reconciled once", async () => {
  let calls = 0; let finishes = 0;
  const provider = new OpenAIProvider("secret", (async () => { calls++; return new Response("secret payload", { status: 429 }); }) as typeof fetch);
  const budget = { reserve: async () => "r", finish: async (_id: string, usage: unknown) => { finishes++; assert.equal(usage, undefined); } };
  await assert.rejects(generateWithinBudget(provider, budget, { prompt: "test" }), /^Error: gnr8_ai_provider_http_429$/);
  assert.equal(calls, 1); assert.equal(finishes, 1);
});

test("live gateway is closed without explicit execution enablement", async () => {
  const old = process.env.GNR8_AI_EXECUTION_ENABLED;
  delete process.env.GNR8_AI_EXECUTION_ENABLED;
  try { await assert.rejects(callGnr8OpenAI({ apiKey: "unused", model: GNR8_AI_MODEL, prompt: "test" }), /execution_disabled/); }
  finally { if (old === undefined) delete process.env.GNR8_AI_EXECUTION_ENABLED; else process.env.GNR8_AI_EXECUTION_ENABLED = old; }
});
