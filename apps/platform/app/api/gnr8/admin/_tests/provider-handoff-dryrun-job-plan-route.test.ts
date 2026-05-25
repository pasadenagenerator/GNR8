import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const HANDLERS_FILE = new URL(
  "../provider-handoffs/[handoffId]/dryrun-job-plan/provider-handoff-dryrun-job-plan-route-handlers.ts",
  import.meta.url,
);

test("provider handoff dryrun job plan route source: read-only simulation contract", async () => {
  const source = await readFile(HANDLERS_FILE, "utf8");

  assert.equal(source.includes("createRuntimeProviderDryRunJobPlan"), true);
  assert.equal(source.includes("executionAllowed: false"), true);
  assert.equal(source.includes("executionBlocked: true"), true);
  assert.equal(source.includes("intentOnly: true"), true);
  assert.equal(source.includes("dryRunJobPlan"), true);
  assert.equal(source.includes("method: \"GET\""), false);
});
