import assert from "node:assert/strict";
import test from "node:test";

import { COST_MODEL, calculateAIEstimatedCost, calculateRuntimeEstimatedCost } from "@/gnr8/billing/cost-model";

test("AI cost model returns zero when tokens are missing", () => {
  assert.equal(calculateAIEstimatedCost({}), 0);
});

test("AI cost model computes input and output token cost", () => {
  const cost = calculateAIEstimatedCost({
    promptTokens: 1_000_000,
    completionTokens: 500_000,
  });

  assert.equal(cost, Number((COST_MODEL.AI.INPUT_PER_1M + COST_MODEL.AI.OUTPUT_PER_1M * 0.5).toFixed(6)));
});

test("runtime cost model computes request and bandwidth cost", () => {
  const oneMb = 1024 * 1024;
  const cost = calculateRuntimeEstimatedCost({
    requestCount: 2,
    bandwidthBytes: oneMb,
  });

  assert.equal(cost, 2 * COST_MODEL.RUNTIME.PER_REQUEST + COST_MODEL.RUNTIME.PER_MB);
});
