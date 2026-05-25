import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const HANDLERS_FILE = new URL(
  "../provider-handoffs/[handoffId]/execution-safety-manifest/provider-handoff-execution-safety-manifest-route-handlers.ts",
  import.meta.url,
);

test("provider handoff execution safety manifest route source: evidence-only blocked manifest contract", async () => {
  const source = await readFile(HANDLERS_FILE, "utf8");

  assert.equal(source.includes("createRuntimeProviderExecutionSafetyManifest"), true);
  assert.equal(source.includes("executionAllowed: false"), true);
  assert.equal(source.includes("executionBlocked: true"), true);
  assert.equal(source.includes("intentOnly: true"), true);
  assert.equal(source.includes("executionSafetyManifest"), true);
});
