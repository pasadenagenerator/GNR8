import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const VIEW_FILE = new URL("./ai-routing-evaluator-preview.tsx", import.meta.url);

test("ai routing evaluator preview source: evaluator preview renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI Routing Evaluator Preview"), true);
  assert.equal(source.includes("Task Selector"), true);
  assert.equal(source.includes("Preview Routing Result"), true);
  assert.equal(source.includes("evaluateAIRoutingPreview"), true);
});

test("ai routing evaluator preview source: supported preview tasks are present", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("site_migration_planning"), true);
  assert.equal(source.includes("long_architecture_review"), true);
  assert.equal(source.includes("layout_visual_understanding"), true);
  assert.equal(source.includes("fast_interactive_generation"), true);
  assert.equal(source.includes("eu_sensitive_workloads"), true);
  assert.equal(source.includes("structured_tool_orchestration"), true);
});

test("ai routing evaluator preview source: task switching updates preview", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("useState"), true);
  assert.equal(source.includes("onChange"), true);
  assert.equal(source.includes("useMemo"), true);
  assert.equal(source.includes("selectedTask.policyTaskType"), true);
});

test("ai routing evaluator preview source: diagnostics render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Diagnostics"), true);
  assert.equal(source.includes("preview.diagnostics.map"), true);
});

test("ai routing evaluator preview source: constraints and execution blocked render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Constraints"), true);
  assert.equal(source.includes("preview.constraintsApplied.map"), true);
  assert.equal(source.includes("Execution State"), true);
  assert.equal(source.includes("executionAllowed: {String(preview.executionAllowed)}"), true);
  assert.equal(source.includes("executionBlocked: {String(preview.executionBlocked)}"), true);
  assert.equal(source.includes("state: blocked"), true);
});

test("ai routing evaluator preview source: advisory note renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Routing evaluator preview is deterministic and non-executable. No AI providers are called."), true);
});

test("ai routing evaluator preview source: no network api or model call behavior", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("axios"), false);
  assert.equal(source.includes("/api/"), false);
  assert.equal(source.includes("invokeModel"), false);
  assert.equal(source.includes("dispatchProvider"), false);
});
