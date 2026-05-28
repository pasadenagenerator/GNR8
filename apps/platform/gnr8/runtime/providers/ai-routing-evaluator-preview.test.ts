import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAIRoutingPreview } from "@/gnr8/runtime/providers/ai-routing-evaluator-preview";

test("matches site migration planning to OpenAI + Anthropic fallback", () => {
  const result = evaluateAIRoutingPreview({
    taskType: "Site Migration Planning",
  });

  assert.equal(result.selectedProviderId, "openai");
  assert.deepEqual(result.fallbackProviderIds, ["anthropic"]);
  assert.equal(result.routingStrategy, "reasoning_priority");
  assert.equal(result.reason, "strongest structured reasoning");
  assert.equal(result.diagnostics[1], "AI_ROUTING_POLICY_MATCHED");
});

test("fallbackAllowed:false returns no fallback providers", () => {
  const result = evaluateAIRoutingPreview({
    taskType: "Site Migration Planning",
    fallbackAllowed: false,
  });

  assert.deepEqual(result.fallbackProviderIds, []);
});

test("unknown task defaults to OpenAI/Anthropic", () => {
  const result = evaluateAIRoutingPreview({
    taskType: "Unknown Task Type",
  });

  assert.equal(result.selectedProviderId, "openai");
  assert.deepEqual(result.fallbackProviderIds, ["anthropic"]);
  assert.equal(result.routingStrategy, "default_reasoning_priority");
  assert.equal(result.reason, "No exact policy match found; default preview routing selected.");
  assert.equal(result.diagnostics[1], "AI_ROUTING_POLICY_DEFAULTED");
});

test("model family resolved from provider registry", () => {
  const result = evaluateAIRoutingPreview({
    taskType: "Long Architecture Review",
  });

  assert.equal(result.selectedProviderId, "anthropic");
  assert.equal(result.selectedModelFamily, "claude-3.5");
});

test("constraintsApplied includes preferences", () => {
  const result = evaluateAIRoutingPreview({
    taskType: "Site Migration Planning",
    inputModality: "code",
    outputModality: "json",
    sensitivityLevel: "high",
    latencyPreference: "balanced",
    costPreference: "low_cost",
    contextRequirement: "large",
    regionPreference: "eu",
  });

  assert.deepEqual(result.constraintsApplied, [
    "input_modality:code",
    "output_modality:json",
    "sensitivity_level:high",
    "latency_preference:balanced",
    "cost_preference:low_cost",
    "context_requirement:large",
    "region_preference:eu",
    "execution_blocked",
    "preview_only",
  ]);
});

test("execution is always blocked", () => {
  const result = evaluateAIRoutingPreview({
    taskType: "Site Migration Planning",
  });

  assert.equal(result.executionAllowed, false);
  assert.equal(result.executionBlocked, true);
});

test("diagnostics are deterministic", () => {
  const resultA = evaluateAIRoutingPreview({
    taskType: "Site Migration Planning",
  });
  const resultB = evaluateAIRoutingPreview({
    taskType: "Site Migration Planning",
  });

  assert.deepEqual(resultA.diagnostics, [
    "AI_ROUTING_EVALUATOR_PREVIEW_CREATED",
    "AI_ROUTING_POLICY_MATCHED",
    "AI_ROUTING_EXECUTION_BLOCKED",
    "AI_ROUTING_PREVIEW_ONLY",
  ]);
  assert.deepEqual(resultA.diagnostics, resultB.diagnostics);
});
