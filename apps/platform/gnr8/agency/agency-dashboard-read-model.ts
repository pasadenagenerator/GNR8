import "server-only";

import { mapSiteMargin, type SiteMarginResult } from "@/gnr8/billing/margin-service";
import { compareSiteAcrossPlansFromSummary, type SitePlanComparisonResult } from "@/gnr8/billing/pricing-simulation-service";
import {
  getCommandCenterReadModel,
  type CommandCenterReadModel,
  type CommandCenterSiteSummary,
} from "@/gnr8/command-center/command-center-read-model";
import { createServiceRoleSupabaseClient } from "@/src/supabase/service-role-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const DEFAULT_PLAN_SIMULATION_LIMIT = 100;

type MigrationStatus = "NOT_STARTED" | "IMPORTED" | "PREVIEW_READY" | "APPROVED" | "LIVE" | "ERROR";

type AgencyRow = {
  id: string | null;
  name: string | null;
};

export type AgencyClientOverviewRow = {
  client_id: string | null;
  client_name: string | null;
  site_count: number;
  total_estimated_cost: number;
  total_simulated_revenue: number;
  total_margin: number;
};

export type AgencySiteDashboardRow = {
  site_id: string;
  domain: string | null;
  client_id: string | null;
  client_name: string | null;
  migration_status: MigrationStatus;
  total_estimated_cost: number;
  total_simulated_revenue: number;
  margin: number;
  best_plan: SitePlanComparisonResult["ranked_plans"][number]["plan_name"] | null;
  latest_site_version_id: string | null;
  preview_url: string | null;
  live_url: string | null;
  needs_attention: boolean;
  cost_completeness_status: CommandCenterSiteSummary["cost_completeness_status"];
};

export type AgencyDashboardSummaryMetrics = {
  total_sites: number;
  live_sites: number;
  needs_attention_sites: number;
  progress_percentage: number;
  total_estimated_cost: number;
  total_simulated_revenue: number;
  total_margin: number;
};

export type AgencyDashboardReadModel = {
  agency: {
    agency_id: string;
    agency_name: string | null;
  };
  summary: AgencyDashboardSummaryMetrics;
  client_overview: AgencyClientOverviewRow[];
  site_rows: AgencySiteDashboardRow[];
  instrumentation: CommandCenterReadModel["instrumentation"] & {
    plan_simulation_error_count: number;
    skipped_plan_simulation_count: number;
  };
};

function normalizeUuid(value: string | null | undefined, fieldName: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  if (!UUID_RE.test(normalized)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function normalizeLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_LIMIT;
  const normalized = Math.floor(value);
  if (normalized < 1) {
    throw new Error("limit must be a positive integer");
  }
  return Math.min(normalized, MAX_LIMIT);
}

function toHttpsLiveUrl(domain: string | null | undefined): string | null {
  const raw = String(domain ?? "").trim();
  if (!raw) return null;

  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function computeNeedsAttention(status: MigrationStatus): boolean {
  return status === "ERROR" || status === "NOT_STARTED" || status === "PREVIEW_READY";
}

function roundMoney(value: number): number {
  return Number(value.toFixed(6));
}

async function getAgencyById(agencyId: string): Promise<AgencyRow | null> {
  const supabase = createServiceRoleSupabaseClient();
  if (supabase == null) {
    return null;
  }

  const result = await supabase
    .from("agencies")
    .select("id,name")
    .eq("id", agencyId)
    .limit(1)
    .maybeSingle();

  if (result.error) {
    return null;
  }

  return result.data ? (result.data as AgencyRow) : null;
}

function computeSummary(siteRows: AgencySiteDashboardRow[]): AgencyDashboardSummaryMetrics {
  const totalSites = siteRows.length;
  let liveSites = 0;
  let needsAttentionSites = 0;
  let totalEstimatedCost = 0;
  let totalSimulatedRevenue = 0;
  let totalMargin = 0;

  for (const row of siteRows) {
    if (row.migration_status === "LIVE") liveSites += 1;
    if (row.needs_attention) needsAttentionSites += 1;
    totalEstimatedCost += row.total_estimated_cost;
    totalSimulatedRevenue += row.total_simulated_revenue;
    totalMargin += row.margin;
  }

  const progressPercentage = totalSites === 0 ? 0 : Math.round((liveSites / totalSites) * 100);

  return {
    total_sites: totalSites,
    live_sites: liveSites,
    needs_attention_sites: needsAttentionSites,
    progress_percentage: progressPercentage,
    total_estimated_cost: roundMoney(totalEstimatedCost),
    total_simulated_revenue: roundMoney(totalSimulatedRevenue),
    total_margin: roundMoney(totalMargin),
  };
}

function deriveClientOverview(rows: AgencySiteDashboardRow[]): AgencyClientOverviewRow[] {
  const byClient = new Map<string, AgencyClientOverviewRow>();

  for (const row of rows) {
    const key = row.client_id ?? "__UNASSIGNED__";
    const existing = byClient.get(key);
    if (existing) {
      existing.site_count += 1;
      existing.total_estimated_cost = roundMoney(existing.total_estimated_cost + row.total_estimated_cost);
      existing.total_simulated_revenue = roundMoney(existing.total_simulated_revenue + row.total_simulated_revenue);
      existing.total_margin = roundMoney(existing.total_margin + row.margin);
      continue;
    }

    byClient.set(key, {
      client_id: row.client_id,
      client_name: row.client_name,
      site_count: 1,
      total_estimated_cost: roundMoney(row.total_estimated_cost),
      total_simulated_revenue: roundMoney(row.total_simulated_revenue),
      total_margin: roundMoney(row.margin),
    });
  }

  return Array.from(byClient.values()).sort((a, b) => {
    if (b.site_count !== a.site_count) return b.site_count - a.site_count;
    const aName = String(a.client_name ?? "");
    const bName = String(b.client_name ?? "");
    return aName.localeCompare(bName);
  });
}

export async function getAgencyDashboardReadModel(input: {
  agencyId: string;
  limit?: number;
  simulationLimit?: number;
}): Promise<AgencyDashboardReadModel> {
  const agencyId = normalizeUuid(input.agencyId, "agencyId");
  const limit = normalizeLimit(input.limit);
  const simulationLimit = Math.min(Math.max(1, Math.floor(input.simulationLimit ?? DEFAULT_PLAN_SIMULATION_LIMIT)), limit);

  const [agencyRow, readModel] = await Promise.all([
    getAgencyById(agencyId),
    getCommandCenterReadModel({
      agencyId,
      limit,
    }),
  ]);

  const selectedAgency = {
    agency_id: agencyId,
    agency_name: String(agencyRow?.name ?? "").trim() || null,
  };

  const siteMarginBySiteId = new Map<string, SiteMarginResult>();
  for (const summary of readModel.site_summaries) {
    const siteMargin = mapSiteMargin(summary);
    siteMarginBySiteId.set(siteMargin.site_id, siteMargin);
  }

  let planSimulationErrorCount = 0;
  const simulationInputSummaries = readModel.site_summaries.slice(0, simulationLimit);
  const skippedPlanSimulationCount = Math.max(0, readModel.site_summaries.length - simulationInputSummaries.length);
  const simulationBySiteId = new Map<string, SitePlanComparisonResult>();

  for (const summary of simulationInputSummaries) {
    try {
      simulationBySiteId.set(summary.site_id, compareSiteAcrossPlansFromSummary(summary));
    } catch {
      planSimulationErrorCount += 1;
    }
  }

  const siteRows: AgencySiteDashboardRow[] = readModel.site_summaries.map((summary) => {
    const margin = siteMarginBySiteId.get(summary.site_id) ?? null;
    const simulation = simulationBySiteId.get(summary.site_id) ?? null;
    const migrationStatus = summary.effective_status;

    return {
      site_id: summary.site_id,
      domain: summary.domain,
      client_id: summary.client_id,
      client_name: summary.client_name,
      migration_status: migrationStatus,
      total_estimated_cost: margin?.total_estimated_cost ?? 0,
      total_simulated_revenue: margin?.simulated_revenue ?? 0,
      margin: margin?.margin ?? 0,
      best_plan: simulation?.ranked_plans[0]?.plan_name ?? null,
      latest_site_version_id: summary.latest_runtime_site_version_id,
      preview_url: summary.latest_runtime_site_version_id
        ? `/api/gnr8/runtime/versions/${summary.latest_runtime_site_version_id}/preview`
        : null,
      live_url: toHttpsLiveUrl(summary.domain),
      needs_attention: computeNeedsAttention(migrationStatus),
      cost_completeness_status: summary.cost_completeness_status,
    };
  });

  const summary = computeSummary(siteRows);
  const clientOverview = deriveClientOverview(siteRows);

  return {
    agency: {
      agency_id: selectedAgency.agency_id,
      agency_name: selectedAgency.agency_name,
    },
    summary,
    client_overview: clientOverview,
    site_rows: siteRows,
    instrumentation: {
      ...readModel.instrumentation,
      plan_simulation_error_count: planSimulationErrorCount,
      skipped_plan_simulation_count: skippedPlanSimulationCount,
    },
  };
}
