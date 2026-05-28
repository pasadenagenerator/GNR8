import assert from "node:assert/strict";
import test from "node:test";
import { AI_ROUTING_POLICY_PREVIEW_REGISTRY } from "@/gnr8/runtime/providers/ai-routing-policy-registry";
import { PROVIDER_CONTRACT_BY_ID } from "@/gnr8/runtime/providers/provider-contract-registry";

test("ai routing policy registry exports all 6 preview rows", () => {
  assert.equal(AI_ROUTING_POLICY_PREVIEW_REGISTRY.length, 6);
});

test("ai routing policy registry provider ids exist in provider contract registry", () => {
  for (const row of AI_ROUTING_POLICY_PREVIEW_REGISTRY) {
    assert.notEqual(PROVIDER_CONTRACT_BY_ID[row.preferredProviderId], undefined);
    assert.notEqual(PROVIDER_CONTRACT_BY_ID[row.secondaryProviderId], undefined);
  }
});

test("ai routing policy registry rows are preview_only execution state", () => {
  for (const row of AI_ROUTING_POLICY_PREVIEW_REGISTRY) {
    assert.equal(row.executionState, "preview_only");
  }
});
