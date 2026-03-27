import "server-only";

import { calculateMarginMetrics } from "@/gnr8/billing/margin-service";
import {
  getUnifiedCostForSite,
  getUnifiedCostOverview,
  type UnifiedCostOverviewFilters,
  type UnifiedCostSiteSummary,
} from "@/gnr8/billing/unified-cost-view-service";
import {
  DEFAULT_PRICING_PLAN,
  PRICING_PLANS,
  PRICING_PLAN_NAMES,
  type PricingPlanDefinition,
  type PricingPlanName,
} from "@/gnr8/billing/pricing-model";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;

export type PricingSimulationSortBy = "margin" | "revenue";

export type PricingSimulationFlags = {
  is_overage_heavy: boolean;
  is_plan_fit_good: boolean;
  is_plan_loss_making: boolean;
};

export type SitePricingSimulationResult = {
  site_id: string;
  domain: string | null;
  client_id: string | null;
  client_name: string | null;
  agency_id: string;
  plan_name: PricingPlanName;
  base_price: number;
  ai_cost: number;
  runtime_cost: number;
  included_ai_cost: number;
  included_runtime_cost: number;
  ai_overage: number;
  runtime_overage: number;
  total_estimated_cost: number;
  total_revenue: number;
  margin: number;
  margin_percentage: number;
  flags: PricingSimulationFlags;
};

export type SitePlanComparisonResult = {
  site_id: string;
  sort_by: PricingSimulationSortBy;
  plan_results: Record<PricingPlanName, SitePricingSimulationResult>;
  ranked_plans: SitePricingSimulationResult[];
};

export type ClientPricingSimulationResult = {
  client_id: string;
  client_name: string | null;
  agency_id: string | null;
  plan_name: PricingPlanName;
  site_count: number;
  total_cost: number;
  total_revenue: number;
  margin: number;
  margin_percentage: number;
  flags: PricingSimulationFlags;
  site_results: SitePricingSimulationResult[];
};

export type ClientPlanComparisonResult = {
  client_id: string;
  sort_by: PricingSimulationSortBy;
  plan_results: Record<PricingPlanName, ClientPricingSimulationResult>;
  ranked_plans: ClientPricingSimulationResult[];
};

class PricingSimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingSimulationError";
  }
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(6));
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string | undefined {
  if (value == null) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!UUID_RE.test(normalized)) {
    throw new PricingSimulationError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function normalizeLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_LIMIT;
  const normalized = Math.floor(value);
  if (normalized < 1) {
    throw new PricingSimulationError("limit must be a positive integer");
  }
  return Math.min(normalized, MAX_LIMIT);
}

export function normalizePricingPlanName(plan: string | null | undefined): PricingPlanName {
  const normalized = (plan ?? DEFAULT_PRICING_PLAN).trim().toUpperCase();
  if ((PRICING_PLAN_NAMES as string[]).includes(normalized)) {
    return normalized as PricingPlanName;
  }
  throw new PricingSimulationError(
    `plan must be one of: ${(PRICING_PLAN_NAMES as string[]).join(", ")}`,
  );
}

function buildFlags(input: {
  margin: number;
  aiOverage: number;
  runtimeOverage: number;
  includedAiCost: number;
  includedRuntimeCost: number;
}): PricingSimulationFlags {
  const includedTotal = input.includedAiCost + input.includedRuntimeCost;
  const overageTotal = input.aiOverage + input.runtimeOverage;
  const overageLoadRatio = overageTotal / Math.max(includedTotal, 0.000001);
  const isPlanLossMaking = input.margin < 0;

  return {
    is_overage_heavy: overageLoadRatio > 1,
    is_plan_fit_good: !isPlanLossMaking && overageLoadRatio <= 0.5,
    is_plan_loss_making: isPlanLossMaking,
  };
}

function simulateFromSummary(summary: UnifiedCostSiteSummary, planName: PricingPlanName): SitePricingSimulationResult {
  const plan = PRICING_PLANS[planName];
  return simulateFromCostInput(
    {
      siteId: summary.site_id,
      domain: summary.domain,
      clientId: summary.client_id,
      clientName: summary.client_name,
      agencyId: summary.agency_id,
      aiCost: summary.ai_estimated_cost_sum,
      runtimeCost: summary.runtime_estimated_cost_sum,
      totalEstimatedCost: summary.total_estimated_cost,
    },
    { planName, plan },
  );
}

export function simulateFromCostInput(
  input: {
    siteId: string;
    domain: string | null;
    clientId: string | null;
    clientName: string | null;
    agencyId: string;
    aiCost: number;
    runtimeCost: number;
    totalEstimatedCost: number;
  },
  config: {
    planName: PricingPlanName;
    plan: PricingPlanDefinition;
  },
): SitePricingSimulationResult {
  const aiCost = Number.isFinite(input.aiCost) ? Math.max(0, input.aiCost) : 0;
  const runtimeCost = Number.isFinite(input.runtimeCost) ? Math.max(0, input.runtimeCost) : 0;
  const totalEstimatedCost = Number.isFinite(input.totalEstimatedCost) ? Math.max(0, input.totalEstimatedCost) : 0;

  const aiOverage = Math.max(0, aiCost - config.plan.included_ai_cost);
  const runtimeOverage = Math.max(0, runtimeCost - config.plan.included_runtime_cost);
  const totalRevenue =
    config.plan.price +
    aiOverage * config.plan.ai_overage_multiplier +
    runtimeOverage * config.plan.runtime_overage_multiplier;

  const metrics = calculateMarginMetrics({
    totalEstimatedCost,
    simulatedRevenue: totalRevenue,
  });
  const flags = buildFlags({
    margin: metrics.margin,
    aiOverage,
    runtimeOverage,
    includedAiCost: config.plan.included_ai_cost,
    includedRuntimeCost: config.plan.included_runtime_cost,
  });

  return {
    site_id: input.siteId,
    domain: input.domain,
    client_id: input.clientId,
    client_name: input.clientName,
    agency_id: input.agencyId,
    plan_name: config.planName,
    base_price: roundCurrency(config.plan.price),
    ai_cost: roundCurrency(aiCost),
    runtime_cost: roundCurrency(runtimeCost),
    included_ai_cost: roundCurrency(config.plan.included_ai_cost),
    included_runtime_cost: roundCurrency(config.plan.included_runtime_cost),
    ai_overage: roundCurrency(aiOverage),
    runtime_overage: roundCurrency(runtimeOverage),
    total_estimated_cost: roundCurrency(totalEstimatedCost),
    total_revenue: metrics.simulated_revenue,
    margin: metrics.margin,
    margin_percentage: metrics.margin_percentage,
    flags,
  };
}

function sortSiteResultsBy(input: PricingSimulationSortBy): (a: SitePricingSimulationResult, b: SitePricingSimulationResult) => number {
  if (input === "revenue") {
    return (a, b) => {
      if (b.total_revenue !== a.total_revenue) return b.total_revenue - a.total_revenue;
      if (b.margin !== a.margin) return b.margin - a.margin;
      return a.plan_name.localeCompare(b.plan_name);
    };
  }

  return (a, b) => {
    if (b.margin !== a.margin) return b.margin - a.margin;
    if (b.total_revenue !== a.total_revenue) return b.total_revenue - a.total_revenue;
    return a.plan_name.localeCompare(b.plan_name);
  };
}

function sortClientResultsBy(
  input: PricingSimulationSortBy,
): (a: ClientPricingSimulationResult, b: ClientPricingSimulationResult) => number {
  if (input === "revenue") {
    return (a, b) => {
      if (b.total_revenue !== a.total_revenue) return b.total_revenue - a.total_revenue;
      if (b.margin !== a.margin) return b.margin - a.margin;
      return a.plan_name.localeCompare(b.plan_name);
    };
  }

  return (a, b) => {
    if (b.margin !== a.margin) return b.margin - a.margin;
    if (b.total_revenue !== a.total_revenue) return b.total_revenue - a.total_revenue;
    return a.plan_name.localeCompare(b.plan_name);
  };
}

export async function simulateSitePricing(
  siteId: string,
  plan: PricingPlanName | string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days">,
): Promise<SitePricingSimulationResult | null> {
  const normalizedSiteId = normalizeUuid(siteId, "siteId");
  if (!normalizedSiteId) {
    throw new PricingSimulationError("siteId is required");
  }

  const planName = normalizePricingPlanName(plan);
  const summary = await getUnifiedCostForSite(normalizedSiteId, options);
  if (!summary) return null;
  return simulateFromSummary(summary, planName);
}

export async function compareSiteAcrossPlans(
  siteId: string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days"> & {
    sortBy?: PricingSimulationSortBy;
  },
): Promise<SitePlanComparisonResult | null> {
  const normalizedSiteId = normalizeUuid(siteId, "siteId");
  if (!normalizedSiteId) {
    throw new PricingSimulationError("siteId is required");
  }

  const summary = await getUnifiedCostForSite(normalizedSiteId, options);
  if (!summary) return null;

  const siteResults = PRICING_PLAN_NAMES.map((planName) => simulateFromSummary(summary, planName));
  const sortBy: PricingSimulationSortBy = options?.sortBy ?? "margin";
  const rankedPlans = [...siteResults].sort(sortSiteResultsBy(sortBy));

  return {
    site_id: normalizedSiteId,
    sort_by: sortBy,
    plan_results: {
      STARTER: siteResults.find((result) => result.plan_name === "STARTER")!,
      GROWTH: siteResults.find((result) => result.plan_name === "GROWTH")!,
      MANAGED: siteResults.find((result) => result.plan_name === "MANAGED")!,
    },
    ranked_plans: rankedPlans,
  };
}

function aggregateClientFlags(siteResults: SitePricingSimulationResult[], margin: number): PricingSimulationFlags {
  const overageHeavySites = siteResults.filter((site) => site.flags.is_overage_heavy).length;
  const lossMakingSites = siteResults.filter((site) => site.flags.is_plan_loss_making).length;
  const fitGoodSites = siteResults.filter((site) => site.flags.is_plan_fit_good).length;
  const siteCount = siteResults.length;

  return {
    is_overage_heavy: siteCount > 0 && overageHeavySites / siteCount >= 0.5,
    is_plan_fit_good: margin > 0 && siteCount > 0 && fitGoodSites / siteCount >= 0.5,
    is_plan_loss_making: margin < 0 || (siteCount > 0 && lossMakingSites / siteCount >= 0.5),
  };
}

export async function simulateClientPricing(
  clientId: string,
  plan: PricingPlanName | string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days" | "limit">,
): Promise<ClientPricingSimulationResult> {
  const normalizedClientId = normalizeUuid(clientId, "clientId");
  if (!normalizedClientId) {
    throw new PricingSimulationError("clientId is required");
  }

  const planName = normalizePricingPlanName(plan);
  const limit = normalizeLimit(options?.limit ?? MAX_LIMIT);
  const overview = await getUnifiedCostOverview({
    clientId: normalizedClientId,
    startDate: options?.startDate,
    endDate: options?.endDate,
    days: options?.days,
    limit,
    topLimit: limit,
  });

  const siteResults = overview.site_summaries.map((summary) => simulateFromSummary(summary, planName));
  const totalRevenue = siteResults.reduce((sum, site) => sum + site.total_revenue, 0);
  const totalCost = siteResults.reduce((sum, site) => sum + site.total_estimated_cost, 0);
  const metrics = calculateMarginMetrics({
    totalEstimatedCost: totalCost,
    simulatedRevenue: totalRevenue,
  });

  return {
    client_id: normalizedClientId,
    client_name: overview.site_summaries[0]?.client_name ?? null,
    agency_id: overview.site_summaries[0]?.agency_id ?? null,
    plan_name: planName,
    site_count: siteResults.length,
    total_cost: roundCurrency(totalCost),
    total_revenue: metrics.simulated_revenue,
    margin: metrics.margin,
    margin_percentage: metrics.margin_percentage,
    flags: aggregateClientFlags(siteResults, metrics.margin),
    site_results: siteResults,
  };
}

export async function compareClientAcrossPlans(
  clientId: string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days" | "limit"> & {
    sortBy?: PricingSimulationSortBy;
  },
): Promise<ClientPlanComparisonResult> {
  const normalizedClientId = normalizeUuid(clientId, "clientId");
  if (!normalizedClientId) {
    throw new PricingSimulationError("clientId is required");
  }

  const simulations = await Promise.all(
    PRICING_PLAN_NAMES.map((planName) => simulateClientPricing(normalizedClientId, planName, options)),
  );
  const sortBy: PricingSimulationSortBy = options?.sortBy ?? "margin";

  return {
    client_id: normalizedClientId,
    sort_by: sortBy,
    plan_results: {
      STARTER: simulations.find((simulation) => simulation.plan_name === "STARTER")!,
      GROWTH: simulations.find((simulation) => simulation.plan_name === "GROWTH")!,
      MANAGED: simulations.find((simulation) => simulation.plan_name === "MANAGED")!,
    },
    ranked_plans: [...simulations].sort(sortClientResultsBy(sortBy)),
  };
}
