import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const HANDLERS_FILE = new URL(
  "../provider-handoffs/[handoffId]/worker-envelope-preview/provider-handoff-worker-envelope-preview-route-handlers.ts",
  import.meta.url,
);

test("provider handoff worker envelope preview route source: evidence-only envelope contract", async () => {
  const source = await readFile(HANDLERS_FILE, "utf8");

  assert.equal(source.includes("createRuntimeProviderWorkerEnvelopePreview"), true);
  assert.equal(source.includes("executionAllowed: false"), true);
  assert.equal(source.includes("executionBlocked: true"), true);
  assert.equal(source.includes("intentOnly: true"), true);
  assert.equal(source.includes("workerEnvelopePreview"), true);
  assert.equal(source.includes("method: \"GET\""), false);
});
