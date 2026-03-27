import assert from "node:assert/strict";
import test from "node:test";

import { calculateMarginMetrics } from "@/gnr8/billing/margin-service";

test("margin metrics compute profitable scenario", () => {
  const result = calculateMarginMetrics({
    totalEstimatedCost: 4,
    simulatedRevenue: 20,
  });

  assert.equal(result.simulated_revenue, 20);
  assert.equal(result.margin, 16);
  assert.equal(result.margin_percentage, 0.8);
});

test("margin metrics compute loss-making scenario", () => {
  const result = calculateMarginMetrics({
    totalEstimatedCost: 24.5,
    simulatedRevenue: 20,
  });

  assert.equal(result.simulated_revenue, 20);
  assert.equal(result.margin, -4.5);
  assert.equal(result.margin_percentage, -0.225);
});

test("margin metrics handle zero revenue safely", () => {
  const result = calculateMarginMetrics({
    totalEstimatedCost: 4,
    simulatedRevenue: 0,
  });

  assert.equal(result.simulated_revenue, 0);
  assert.equal(result.margin, -4);
  assert.equal(result.margin_percentage, 0);
});
