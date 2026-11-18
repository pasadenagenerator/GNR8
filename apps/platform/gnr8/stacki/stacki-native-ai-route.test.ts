import assert from "node:assert/strict";
import test from "node:test";
import { createStackiNativeAiRoute } from "./stacki-native-ai-route";

const session = "00000000-0000-4000-8000-000000000001";
const token = "a".repeat(43);
const model = "gpt-5.4-mini-2026-03-17";
const body = { model, max_tokens: 6000, messages: [{ role: "user", content: "Change the title" }] };

function fixture() {
  let calls = 0, reservations = 0, finished = 0, enabled = true;
  let sent: Record<string, unknown> | undefined;
  const route = createStackiNativeAiRoute({
    enabled: () => enabled,
    authorize: async (id, bearer) => { assert.equal(id, session); assert.equal(bearer, token); },
    credential: async () => ({ apiKey: "secret-server-key", model }),
    reserve: async () => { reservations++; return "reservation-1"; },
    finish: async (_id, usage) => { finished++; assert.deepEqual(usage, { inputTokens: 20, outputTokens: 30 }); },
    transport: async (_url, init) => {
      calls++;
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer secret-server-key");
      sent = JSON.parse(String(init?.body));
      return Response.json({ choices: [{ message: { role: "assistant", content: "{\"summary\":\"Updated\",\"changes\":[]}" } }],
        usage: { prompt_tokens: 20, completion_tokens: 30 } });
    },
  });
  const send = async (value: unknown, bearer = token) => route(new Request("https://app.example.test/api/gnr8/stacki/native-ai/chat/completions", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${bearer}`,
      "x-gnr8-stacki-session": session }, body: JSON.stringify(value),
  }));
  return { send, disable: () => { enabled = false; }, get calls() { return calls; },
    get reservations() { return reservations; }, get finished() { return finished; }, get sent() { return sent; } };
}

test("native Stacki request uses the GNR8 key server-side, maps the output cap and records usage", async () => {
  const f = fixture();
  const response = await f.send(body);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).choices[0].message.role, "assistant");
  assert.equal(f.sent?.max_completion_tokens, 6000);
  assert.equal(f.sent?.store, false);
  assert.equal(f.calls, 1); assert.equal(f.reservations, 1); assert.equal(f.finished, 1);
});

test("gate, bearer, image and large input stop before reservation or provider", async () => {
  const f = fixture(); f.disable();
  assert.equal((await f.send(body)).status, 503);
  assert.equal(f.reservations, 0);
  const g = fixture();
  assert.equal((await g.send(body, "bad")).status, 403);
  assert.equal((await g.send({ ...body, messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,AA==" } }] }] })).status, 422);
  assert.equal((await g.send({ ...body, messages: [{ role: "user", content: "x".repeat(260_000) }] })).status, 422);
  assert.equal(g.calls, 0); assert.equal(g.reservations, 0);
});

test("native Stacki accepts a page source larger than the old 64 KB limit", async () => {
  const f = fixture();
  assert.equal((await f.send({ ...body, messages: [{ role: "user", content: "x".repeat(107_000) }] })).status, 200);
  assert.equal(f.calls, 1); assert.equal(f.reservations, 1);
});
