import "server-only";

import type { PoolClient } from "pg";

import { PRICING_MODEL } from "@/gnr8/billing/pricing-model";
import {
  getUnifiedCostForSite,
  getUnifiedCostOverview,
  type UnifiedCostOverviewFilters,
  type UnifiedCostSiteSummary,
} from "@/gnr8/billing/unified-cost-view-service";
import { getSuperadminPool } from "@/src/superadmin/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;

export type MarginMetrics = {
  simulated_revenue: number;
  margin: number;
  margin_percentage: number;
};

export type SiteMarginFlags = {
  is_profitable: boolean;
  cost_exceeds_included: boolean;
  is_high_cost: boolean;
  is_loss_making: boolean;
};

export type SiteMarginResult = {
  site_id: string;
  domain: string | null;
  site_status: string;
  client_id: string | null;
  client_name: string | null;
  agency_id: string;
  total_estimated_cost: number;
  simulated_revenue: number;
  margin: number;
  margin_percentage: number;
  ai_cost: number;
  runtime_cost: number;
  migration_cost: number;
  flags: SiteMarginFlags;
};

export type ClientMarginResult = {
  client_id: string;
  client_name: string | null;
  agency_id: string | null;
  site_count: number;
  total_estimated_cost: number;
  simulated_revenue: number;
  margin: number;
  margin_percentage: number;
  profitable_site_count: number;
  loss_making_site_count: number;
  is_profitable: boolean;
  site_margins: SiteMarginResult[];
};

export type AgencyMarginResult = {
  agency_id: string;
  client_count: number;
  site_count: number;
  total_estimated_cost: number;
  simulated_revenue: number;
  margin: number;
  margin_percentage: number;
  profitable_site_count: number;
  loss_making_site_count: number;
  is_profitable: boolean;
  client_margins: ClientMarginResult[];
};

export type MarginDebugFilters = Pick<UnifiedCostOverviewFilters, "siteId" | "clientId" | "agencyId"> & {
  limit?: number;
};

export type MarginDebugOverviewResult = {
  filters: {
    site_id: string | null;
    client_id: string | null;
    agency_id: string | null;
    limit: number;
  };
  pricing_model: typeof PRICING_MODEL;
  site_margins: SiteMarginResult[];
  client_margins: ClientMarginResult[];
  agency_summary: AgencyMarginResult | null;
  top_expensive_sites: SiteMarginResult[];
  top_unprofitable_sites: SiteMarginResult[];
};

class MarginServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarginServiceError";
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
    throw new MarginServiceError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function normalizeLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_LIMIT;
  const normalized = Math.floor(value);
  if (normalized < 1) {
    throw new MarginServiceError("limit must be a positive integer");
  }
  return Math.min(normalized, MAX_LIMIT);
}

function tableNameToSchema(tableName: string): [string, string] | null {
  const [schemaName, plainTableName] = tableName.split(".");
  if (!schemaName || !plainTableName) return null;
  return [schemaName, plainTableName];
}

async function tableExists(client: PoolClient, tableName: string): Promise<boolean> {
  const res = await client.query<{ exists: boolean }>(
    `
      select to_regclass($1::text) is not null as exists
    `,
    [tableName],
  );
  return !!res.rows[0]?.exists;
}

async function columnExists(client: PoolClient, tableName: string, columnName: string): Promise<boolean> {
  const parsed = tableNameToSchema(tableName);
  if (!parsed) return false;
  const [schemaName, plainTableName] = parsed;

  const res = await client.query<{ exists: boolean }>(
    `
      select exists(
        select 1
        from information_schema.columns c
        where c.table_schema = $1::text
          and c.table_name = $2::text
          and c.column_name = $3::text
      ) as exists
    `,
    [schemaName, plainTableName, columnName],
  );

  return !!res.rows[0]?.exists;
}

export function calculateMarginMetrics(input: {
  totalEstimatedCost: number;
  simulatedRevenue: number;
}): MarginMetrics {
  const totalEstimatedCost = Number.isFinite(input.totalEstimatedCost) ? input.totalEstimatedCost : 0;
  const simulatedRevenue = Number.isFinite(input.simulatedRevenue) ? input.simulatedRevenue : 0;
  const margin = simulatedRevenue - totalEstimatedCost;
  const marginPercentage = simulatedRevenue > 0 ? margin / simulatedRevenue : 0;

  return {
    simulated_revenue: roundCurrency(simulatedRevenue),
    margin: roundCurrency(margin),
    margin_percentage: roundCurrency(marginPercentage),
  };
}

function mapSiteMargin(summary: UnifiedCostSiteSummary): SiteMarginResult {
  const includedCostTotal = PRICING_MODEL.INCLUDED_AI_COST + PRICING_MODEL.INCLUDED_RUNTIME_COST;
  const metrics = calculateMarginMetrics({
    totalEstimatedCost: summary.total_estimated_cost,
    simulatedRevenue: PRICING_MODEL.SITE_MONTHLY_PRICE,
  });

  const flags: SiteMarginFlags = {
    is_profitable: metrics.margin > 0,
    cost_exceeds_included:
      summary.ai_estimated_cost_sum > PRICING_MODEL.INCLUDED_AI_COST ||
      summary.runtime_estimated_cost_sum > PRICING_MODEL.INCLUDED_RUNTIME_COST ||
      summary.total_estimated_cost > includedCostTotal,
    is_high_cost: summary.total_estimated_cost > metrics.simulated_revenue * 0.5,
    is_loss_making: metrics.margin < 0,
  };

  return {
    site_id: summary.site_id,
    domain: summary.domain,
    site_status: summary.site_status,
    client_id: summary.client_id,
    client_name: summary.client_name,
    agency_id: summary.agency_id,
    total_estimated_cost: roundCurrency(summary.total_estimated_cost),
    simulated_revenue: metrics.simulated_revenue,
    margin: metrics.margin,
    margin_percentage: metrics.margin_percentage,
    ai_cost: roundCurrency(summary.ai_estimated_cost_sum),
    runtime_cost: roundCurrency(summary.runtime_estimated_cost_sum),
    migration_cost: roundCurrency(summary.migration_estimated_cost_sum),
    flags,
  };
}

function sortByCostDesc(a: SiteMarginResult, b: SiteMarginResult): number {
  if (b.total_estimated_cost !== a.total_estimated_cost) {
    return b.total_estimated_cost - a.total_estimated_cost;
  }
  return a.site_id.localeCompare(b.site_id);
}

function sortByMarginAsc(a: SiteMarginResult, b: SiteMarginResult): number {
  if (a.margin !== b.margin) {
    return a.margin - b.margin;
  }
  return a.site_id.localeCompare(b.site_id);
}

function summarizeSiteProfitability(siteMargins: SiteMarginResult[]): {
  profitableSiteCount: number;
  lossMakingSiteCount: number;
} {
  let profitableSiteCount = 0;
  let lossMakingSiteCount = 0;

  for (const site of siteMargins) {
    if (site.flags.is_profitable) profitableSiteCount += 1;
    if (site.flags.is_loss_making) lossMakingSiteCount += 1;
  }

  return {
    profitableSiteCount,
    lossMakingSiteCount,
  };
}

async function readClientRowsForAgency(
  agencyId: string,
): Promise<Array<{ client_id: string; client_name: string | null }>> {
  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const hasOrganizations = await tableExists(client, "public.organizations");
    if (!hasOrganizations) {
      return [];
    }

    const hasName = await columnExists(client, "public.organizations", "name");
    const hasAgencyId = await columnExists(client, "public.organizations", "agency_id");
    const hasType = await columnExists(client, "public.organizations", "organization_type");

    if (!hasAgencyId || !hasType) {
      return [];
    }

    const nameSql = hasName ? "o.name::text as client_name" : "null::text as client_name";
    const rows = await client.query<{ client_id: string; client_name: string | null }>(
      `
        select
          o.id::text as client_id,
          ${nameSql}
        from public.organizations o
        where o.agency_id = $1::uuid
          and o.organization_type::text = 'client'
        order by o.created_at asc, o.id asc
      `,
      [agencyId],
    );

    return rows.rows;
  } finally {
    client.release();
  }
}

export async function getSiteMargin(
  siteId: string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days">,
): Promise<SiteMarginResult | null> {
  const normalizedSiteId = normalizeUuid(siteId, "siteId");
  if (!normalizedSiteId) {
    throw new MarginServiceError("siteId is required");
  }

  const summary = await getUnifiedCostForSite(normalizedSiteId, options);
  if (!summary) {
    return null;
  }

  return mapSiteMargin(summary);
}

export async function getClientMargin(
  clientId: string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days">,
): Promise<ClientMarginResult> {
  const normalizedClientId = normalizeUuid(clientId, "clientId");
  if (!normalizedClientId) {
    throw new MarginServiceError("clientId is required");
  }

  const overview = await getUnifiedCostOverview({
    clientId: normalizedClientId,
    startDate: options?.startDate,
    endDate: options?.endDate,
    days: options?.days,
    limit: MAX_LIMIT,
    topLimit: MAX_LIMIT,
  });

  const siteMargins = overview.site_summaries.map(mapSiteMargin);
  const siteCount = overview.aggregate_totals.site_count;
  const simulatedRevenue = siteCount * PRICING_MODEL.SITE_MONTHLY_PRICE;
  const metrics = calculateMarginMetrics({
    totalEstimatedCost: overview.aggregate_totals.total_estimated_cost,
    simulatedRevenue,
  });

  const firstSite = overview.site_summaries[0];
  const { profitableSiteCount, lossMakingSiteCount } = summarizeSiteProfitability(siteMargins);

  return {
    client_id: normalizedClientId,
    client_name: firstSite?.client_name ?? null,
    agency_id: firstSite?.agency_id ?? null,
    site_count: siteCount,
    total_estimated_cost: roundCurrency(overview.aggregate_totals.total_estimated_cost),
    simulated_revenue: metrics.simulated_revenue,
    margin: metrics.margin,
    margin_percentage: metrics.margin_percentage,
    profitable_site_count: profitableSiteCount,
    loss_making_site_count: lossMakingSiteCount,
    is_profitable: metrics.margin > 0,
    site_margins: siteMargins,
  };
}

export async function getAgencyMargin(
  agencyId: string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days">,
): Promise<AgencyMarginResult> {
  const normalizedAgencyId = normalizeUuid(agencyId, "agencyId");
  if (!normalizedAgencyId) {
    throw new MarginServiceError("agencyId is required");
  }

  const [overview, clientRows] = await Promise.all([
    getUnifiedCostOverview({
      agencyId: normalizedAgencyId,
      startDate: options?.startDate,
      endDate: options?.endDate,
      days: options?.days,
      limit: 1,
      topLimit: 1,
    }),
    readClientRowsForAgency(normalizedAgencyId),
  ]);

  const clientMargins = await Promise.all(clientRows.map((row) => getClientMargin(row.client_id, options)));
  const sortedClientMargins = clientMargins.sort((a, b) => {
    if (b.total_estimated_cost !== a.total_estimated_cost) {
      return b.total_estimated_cost - a.total_estimated_cost;
    }
    return a.client_id.localeCompare(b.client_id);
  });

  const siteCount = overview.aggregate_totals.site_count;
  const simulatedRevenue = siteCount * PRICING_MODEL.SITE_MONTHLY_PRICE;
  const metrics = calculateMarginMetrics({
    totalEstimatedCost: overview.aggregate_totals.total_estimated_cost,
    simulatedRevenue,
  });

  const profitableSiteCount = sortedClientMargins.reduce((sum, client) => sum + client.profitable_site_count, 0);
  const lossMakingSiteCount = sortedClientMargins.reduce((sum, client) => sum + client.loss_making_site_count, 0);

  return {
    agency_id: normalizedAgencyId,
    client_count: sortedClientMargins.length,
    site_count: siteCount,
    total_estimated_cost: roundCurrency(overview.aggregate_totals.total_estimated_cost),
    simulated_revenue: metrics.simulated_revenue,
    margin: metrics.margin,
    margin_percentage: metrics.margin_percentage,
    profitable_site_count: profitableSiteCount,
    loss_making_site_count: lossMakingSiteCount,
    is_profitable: metrics.margin > 0,
    client_margins: sortedClientMargins,
  };
}

export async function getMarginDebugOverview(filters: MarginDebugFilters = {}): Promise<MarginDebugOverviewResult> {
  const siteId = normalizeUuid(filters.siteId, "siteId");
  const clientId = normalizeUuid(filters.clientId, "clientId");
  const agencyId = normalizeUuid(filters.agencyId, "agencyId");
  const limit = normalizeLimit(filters.limit);

  let siteMargins: SiteMarginResult[] = [];
  let clientMargins: ClientMarginResult[] = [];
  let agencySummary: AgencyMarginResult | null = null;

  if (siteId) {
    const siteMargin = await getSiteMargin(siteId);
    if (siteMargin) {
      siteMargins = [siteMargin];
    }

    if (siteMargin?.client_id) {
      clientMargins = [await getClientMargin(siteMargin.client_id)];
    }

    if (siteMargin?.agency_id) {
      agencySummary = await getAgencyMargin(siteMargin.agency_id);
    } else if (agencyId) {
      agencySummary = await getAgencyMargin(agencyId);
    }
  } else if (clientId) {
    const [clientMargin, scopedOverview] = await Promise.all([
      getClientMargin(clientId),
      getUnifiedCostOverview({ clientId, limit, topLimit: limit }),
    ]);

    clientMargins = [clientMargin];
    siteMargins = scopedOverview.site_summaries.map(mapSiteMargin);

    const derivedAgencyId = clientMargin.agency_id;
    if (derivedAgencyId) {
      agencySummary = await getAgencyMargin(derivedAgencyId);
    }
  } else if (agencyId) {
    const [summary, scopedOverview] = await Promise.all([
      getAgencyMargin(agencyId),
      getUnifiedCostOverview({ agencyId, limit, topLimit: limit }),
    ]);

    agencySummary = summary;
    clientMargins = summary.client_margins.slice(0, limit);
    siteMargins = scopedOverview.site_summaries.map(mapSiteMargin);
  } else {
    const scopedOverview = await getUnifiedCostOverview({ limit, topLimit: limit });
    siteMargins = scopedOverview.site_summaries.map(mapSiteMargin);

    const distinctClientIds = Array.from(
      new Set(siteMargins.map((site) => site.client_id).filter((id): id is string => !!id)),
    ).slice(0, limit);

    clientMargins = await Promise.all(distinctClientIds.map((id) => getClientMargin(id)));
  }

  const topExpensiveSites = [...siteMargins].sort(sortByCostDesc).slice(0, limit);
  const topUnprofitableSites = [...siteMargins].filter((site) => site.margin < 0).sort(sortByMarginAsc).slice(0, limit);

  return {
    filters: {
      site_id: siteId ?? null,
      client_id: clientId ?? null,
      agency_id: agencyId ?? null,
      limit,
    },
    pricing_model: PRICING_MODEL,
    site_margins: siteMargins,
    client_margins: clientMargins,
    agency_summary: agencySummary,
    top_expensive_sites: topExpensiveSites,
    top_unprofitable_sites: topUnprofitableSites,
  };
}
