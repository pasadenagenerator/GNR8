import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const HANDLERS_FILE = new URL(
  "../provider-handoffs/[handoffId]/execution-job-preview/provider-handoff-execution-job-preview-route-handlers.ts",
  import.meta.url,
);

test("provider handoff execution job preview route source: evidence-only preview contract", async () => {
  const source = await readFile(HANDLERS_FILE, "utf8");

  assert.equal(source.includes("createRuntimeProviderExecutionJobPreview"), true);
  assert.equal(source.includes("executionAllowed: false"), true);
  assert.equal(source.includes("executionBlocked: true"), true);
  assert.equal(source.includes("intentOnly: true"), true);
  assert.equal(source.includes("executionJobPreview"), true);
  assert.equal(source.includes("method: \"GET\""), false);
});
