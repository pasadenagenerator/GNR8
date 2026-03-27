import assert from "node:assert/strict";
import test from "node:test";

import { PRICING_PLANS } from "@/gnr8/billing/pricing-model";
import { normalizePricingPlanName, simulateFromCostInput } from "@/gnr8/billing/pricing-simulation-service";

const SITE_INPUT = {
  siteId: "11111111-1111-4111-8111-111111111111",
  domain: "example.com",
  clientId: "22222222-2222-4222-8222-222222222222",
  clientName: "Acme",
  agencyId: "33333333-3333-4333-8333-333333333333",
  aiCost: 6.5,
  runtimeCost: 3,
  totalEstimatedCost: 10.25,
};

test("pricing simulation applies included usage and overage math", () => {
  const result = simulateFromCostInput(SITE_INPUT, {
    planName: "GROWTH",
    plan: PRICING_PLANS.GROWTH,
  });

  assert.equal(result.base_price, 50);
  assert.equal(result.ai_overage, 1.5);
  assert.equal(result.runtime_overage, 0);
  assert.equal(result.total_revenue, 51.65);
  assert.equal(result.margin, 41.4);
  assert.equal(result.flags.is_plan_loss_making, false);
});

test("pricing simulation marks loss-making and overage-heavy scenarios", () => {
  const result = simulateFromCostInput(
    {
      ...SITE_INPUT,
      aiCost: 30,
      runtimeCost: 22,
      totalEstimatedCost: 58,
    },
    {
      planName: "STARTER",
      plan: PRICING_PLANS.STARTER,
    },
  );

  assert.equal(result.ai_overage, 29);
  assert.equal(result.runtime_overage, 21);
  assert.equal(result.total_revenue, 80);
  assert.equal(result.margin, 22);
  assert.equal(result.flags.is_overage_heavy, true);
  assert.equal(result.flags.is_plan_fit_good, false);
});

test("plan normalization is case-insensitive and defaults to starter", () => {
  assert.equal(normalizePricingPlanName(undefined), "STARTER");
  assert.equal(normalizePricingPlanName("managed"), "MANAGED");
});

test("plan normalization rejects unsupported plan names", () => {
  assert.throws(
    () => normalizePricingPlanName("enterprise"),
    /plan must be one of: STARTER, GROWTH, MANAGED/,
  );
});
