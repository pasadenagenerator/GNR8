import "server-only";

export const PRICING_PLANS = {
  STARTER: {
    price: 20,
    included_ai_cost: 1,
    included_runtime_cost: 1,
    ai_overage_multiplier: 1.2,
    runtime_overage_multiplier: 1.2,
  },
  GROWTH: {
    price: 50,
    included_ai_cost: 5,
    included_runtime_cost: 5,
    ai_overage_multiplier: 1.1,
    runtime_overage_multiplier: 1.1,
  },
  MANAGED: {
    price: 150,
    included_ai_cost: 20,
    included_runtime_cost: 20,
    ai_overage_multiplier: 1.05,
    runtime_overage_multiplier: 1.05,
  },
} as const;

export type PricingPlanName = keyof typeof PRICING_PLANS;
export type PricingPlanDefinition = (typeof PRICING_PLANS)[PricingPlanName];

export const DEFAULT_PRICING_PLAN: PricingPlanName = "STARTER";
export const PRICING_PLAN_NAMES = Object.keys(PRICING_PLANS) as PricingPlanName[];

// Backward-compatible flat pricing values used by existing margin-service logic.
export const PRICING_MODEL = {
  SITE_MONTHLY_PRICE: PRICING_PLANS[DEFAULT_PRICING_PLAN].price,
  INCLUDED_AI_COST: PRICING_PLANS[DEFAULT_PRICING_PLAN].included_ai_cost,
  INCLUDED_RUNTIME_COST: PRICING_PLANS[DEFAULT_PRICING_PLAN].included_runtime_cost,
} as const;
