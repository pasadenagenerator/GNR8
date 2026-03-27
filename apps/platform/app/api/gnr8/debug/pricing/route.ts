import { NextRequest, NextResponse } from "next/server";

import {
  compareClientAcrossPlans,
  compareSiteAcrossPlans,
  normalizePricingPlanName,
  simulateClientPricing,
  simulateSitePricing,
  type PricingSimulationSortBy,
} from "@/gnr8/billing/pricing-simulation-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseOptionalInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.floor(parsed);
}

function parseSortBy(value: string | null): PricingSimulationSortBy {
  if (!value) return "margin";
  const normalized = value.trim().toLowerCase();
  return normalized === "revenue" ? "revenue" : "margin";
}

function mapError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "Internal server error";
  if (message === "Unauthorized") return { status: 401, message };
  if (message.startsWith("Forbidden")) return { status: 403, message };
  if (
    message.includes("must be a valid UUID") ||
    message.includes("must be a positive integer") ||
    message.includes("plan must be one of")
  ) {
    return { status: 400, message };
  }
  return { status: 500, message };
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperadminUserId();

    const search = request.nextUrl.searchParams;
    const siteId = search.get("siteId") ?? undefined;
    const clientId = search.get("clientId") ?? undefined;
    const planParam = search.get("plan");
    const limit = parseOptionalInt(search.get("limit"));
    const sortBy = parseSortBy(search.get("sortBy"));
    const plan = planParam ? normalizePricingPlanName(planParam) : undefined;

    if (!siteId && !clientId) {
      return NextResponse.json(
        { ok: false, error: "siteId or clientId is required" },
        { status: 400 },
      );
    }

    const siteSimulation = siteId && plan ? await simulateSitePricing(siteId, plan) : null;
    const sitePlanComparison = siteId ? await compareSiteAcrossPlans(siteId, { sortBy }) : null;
    const clientSimulation = clientId && plan ? await simulateClientPricing(clientId, plan, { limit }) : null;
    const clientPlanComparison = clientId ? await compareClientAcrossPlans(clientId, { limit, sortBy }) : null;

    const topProfitablePlans = [
      ...(sitePlanComparison?.ranked_plans ?? []),
      ...(clientPlanComparison?.ranked_plans ?? []),
    ]
      .filter((result) => result.margin > 0)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, limit ?? 3);

    const worstPlans = [
      ...(sitePlanComparison?.ranked_plans ?? []),
      ...(clientPlanComparison?.ranked_plans ?? []),
    ]
      .sort((a, b) => a.margin - b.margin)
      .slice(0, limit ?? 3);

    return NextResponse.json(
      {
        ok: true,
        filters: {
          site_id: siteId ?? null,
          client_id: clientId ?? null,
          plan: plan ?? null,
          limit: limit ?? null,
          sort_by: sortBy,
        },
        per_site_simulation: siteSimulation,
        per_client_simulation: clientSimulation,
        site_plan_comparison: sitePlanComparison,
        client_plan_comparison: clientPlanComparison,
        top_profitable_plans: topProfitablePlans,
        worst_plans: worstPlans,
      },
      { status: 200 },
    );
  } catch (error) {
    const out = mapError(error);
    return NextResponse.json({ ok: false, error: out.message }, { status: out.status });
  }
}
