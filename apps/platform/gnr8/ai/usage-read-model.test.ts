import assert from "node:assert/strict";
import test from "node:test";
import { summarizeGnr8AiUsage } from "./usage-read-model";

test("shared pilot summary reports one known call and its conservative reservation", () => {
  assert.deepEqual(summarizeGnr8AiUsage([{
    state: "completed", reserved_micro_usd: 7500, input_tokens: 10, output_tokens: 23,
  }]), {
    status: "available", attempts: 1, completed: 1, unresolved: 0, remaining: 9,
    inputTokens: 10, outputTokens: 23, estimatedUsd: 0.000111, reservedMaximumUsd: 0.0075,
  });
});

test("unknown usage is never presented as zero spend", () => {
  const uncertain = summarizeGnr8AiUsage([{
    state: "uncertain", reserved_micro_usd: 7500, input_tokens: null, output_tokens: null,
  }]);
  assert.equal(uncertain.status, "available");
  if (uncertain.status === "available") {
    assert.equal(uncertain.unresolved, 1);
    assert.equal(uncertain.reservedMaximumUsd, 0.0075);
  }
  assert.deepEqual(summarizeGnr8AiUsage([{
    state: "completed", reserved_micro_usd: 1, input_tokens: 10, output_tokens: 20,
  }]), { status: "unavailable" });
});
