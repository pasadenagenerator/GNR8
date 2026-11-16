import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStackiRuntimeCheckpoint } from "./stacki-runtime-checkpoint";

test("immutable capture survives retries/restart; later operation captures newer files; failed capture retries", async () => {
  const root = await mkdtemp(join(tmpdir(), "stacki-checkpoint-test-"));
  const originalFetch = globalThis.fetch;
  let calls = 0, value = "A", fail = false;
  const files = () => ["astro.config.mjs", "package.json", "src/pages/index.astro"].map(path => ({
    path, base64: Buffer.from(value).toString("base64"),
  }));
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.method, "POST");
    calls++;
    return fail ? new Response(null, { status: 503 }) : Response.json(files());
  };
  try {
    const capture = createStackiRuntimeCheckpoint(root, 1);
    const operation = { operationId: "11111111-1111-4111-8111-111111111111", expectedRevision: 1 };
    const [first, duplicate] = await Promise.all([capture(operation), capture(operation)]);
    assert.equal(first, duplicate); assert.equal(calls, 1);
    const savedA = await readFile(join(root, first), "utf8");
    value = "B";
    assert.equal(await createStackiRuntimeCheckpoint(root, 1)(operation), first);
    assert.equal(await readFile(join(root, first), "utf8"), savedA);
    assert.equal(calls, 1, "retry must not capture B under A's operation");
    const next = { operationId: "22222222-2222-4222-8222-222222222222", expectedRevision: 2 };
    fail = true;
    await assert.rejects(capture(next), /STACKI_RUNTIME_CAPTURE_FAILED/);
    fail = false;
    const second = await capture(next);
    assert.notEqual(second, first);
    assert.deepEqual(JSON.parse(await readFile(join(root, second), "utf8")), files());
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
  }
});
