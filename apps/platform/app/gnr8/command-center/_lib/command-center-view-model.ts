import {
  mapSiteMargin,
  type SiteMarginResult,
} from "@/gnr8/billing/margin-service";
import {
  compareSiteAcrossPlansFromSummary,
  type SitePlanComparisonResult,
} from "@/gnr8/billing/pricing-simulation-service";
import {
  getCommandCenterReadModel,
  type CommandCenterReadModel,
  type CommandCenterSiteSummary,
} from "@/gnr8/command-center/command-center-read-model";

export type ProfitabilityFilter = "all" | "profitable" | "loss-making";
export type MigrationStatus =
  | "NOT_STARTED"
  | "IMPORTED"
  | "PREVIEW_READY"
  | "APPROVED"
  | "LIVE"
  | "ERROR";

export type CommandCenterRow = {
  summary: CommandCenterSiteSummary;
  margin: SiteMarginResult | null;
  simulation: SitePlanComparisonResult | null;
  migration: {
    status: MigrationStatus;
    auto_advanced: boolean;
    automation_reason: string | null;
    latest_site_version_id: string | null;
    preview_url: string | null;
    live_url: string | null;
    latest_runtime_state: string | null;
  };
};

export type CommandCenterPortfolioMetrics = {
  total_sites: number;
  live_sites: number;
  approved_sites: number;
  preview_ready_sites: number;
  imported_sites: number;
  not_started_sites: number;
  error_sites: number;
  needs_attention_sites: number;
  started_sites: number;
  progress_percentage: number;
  success_rate: number;
  status_distribution: Record<MigrationStatus, number>;
};

export type CommandCenterSitesViewModel = {
  readModel: CommandCenterReadModel;
  rows: CommandCenterRow[];
  agencyNameByAgencyId: Record<string, string>;
  selectedClientId: string | null;
  profitability: ProfitabilityFilter;
  portfolioMetrics: CommandCenterPortfolioMetrics;
  planSimulationErrorCount: number;
  skippedPlanSimulationCount: number;
};

export const COMMAND_CENTER_SITE_LIMIT = 50;
export const COMMAND_CENTER_SIMULATION_LIMIT = 50;

export const MIGRATION_STATUS_ORDER: MigrationStatus[] = [
  "NOT_STARTED",
  "IMPORTED",
  "PREVIEW_READY",
  "APPROVED",
  "LIVE",
  "ERROR",
];

export function normalizeClientFilter(value: string | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function normalizeProfitability(value: string | undefined): ProfitabilityFilter {
  if (value === "profitable") return "profitable";
  if (value === "loss-making") return "loss-making";
  return "all";
}

function profitabilityMatches(filter: ProfitabilityFilter, margin: SiteMarginResult | null): boolean {
  if (filter === "all") return true;
  if (!margin) return false;
  if (filter === "profitable") return margin.flags.is_profitable;
  return margin.flags.is_loss_making;
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

function deriveMigrationStatus(summary: CommandCenterSiteSummary): CommandCenterRow["migration"] {
  const liveUrl = toHttpsLiveUrl(summary.domain);
  const siteVersionId = summary.latest_runtime_site_version_id;

  return {
    status: summary.effective_status,
    auto_advanced: summary.auto_advanced,
    automation_reason: summary.automation_reason,
    latest_site_version_id: siteVersionId,
    preview_url: siteVersionId ? `/api/gnr8/runtime/versions/${siteVersionId}/preview` : null,
    live_url: liveUrl,
    latest_runtime_state: summary.latest_runtime_state
      ? String(summary.latest_runtime_state)
      : null,
  };
}

export function computePortfolioMetrics(rows: CommandCenterRow[]): CommandCenterPortfolioMetrics {
  const statusCounts: Record<MigrationStatus, number> = {
    NOT_STARTED: 0,
    IMPORTED: 0,
    PREVIEW_READY: 0,
    APPROVED: 0,
    LIVE: 0,
    ERROR: 0,
  };

  for (const row of rows) {
    statusCounts[row.migration.status] += 1;
  }

  const totalSites = rows.length;
  const liveSites = statusCounts.LIVE;
  const notStartedSites = statusCounts.NOT_STARTED;
  const previewReadySites = statusCounts.PREVIEW_READY;
  const errorSites = statusCounts.ERROR;
  const needsAttentionSites = errorSites + notStartedSites + previewReadySites;
  const progressPercentage =
    totalSites === 0 ? 0 : Math.round((liveSites / totalSites) * 100);
  const startedSites = totalSites - notStartedSites;
  const successRate =
    startedSites === 0 ? 0 : Math.round((liveSites / startedSites) * 100);

  return {
    total_sites: totalSites,
    live_sites: liveSites,
    approved_sites: statusCounts.APPROVED,
    preview_ready_sites: previewReadySites,
    imported_sites: statusCounts.IMPORTED,
    not_started_sites: notStartedSites,
    error_sites: errorSites,
    needs_attention_sites: needsAttentionSites,
    started_sites: startedSites,
    progress_percentage: progressPercentage,
    success_rate: successRate,
    status_distribution: statusCounts,
  };
}

export async function getCommandCenterSitesViewModel(input?: {
  clientId?: string;
  profitability?: ProfitabilityFilter;
  limit?: number;
}): Promise<CommandCenterSitesViewModel> {
  const selectedClientId = normalizeClientFilter(input?.clientId);
  const profitability = input?.profitability ?? "all";

  const readModel = await getCommandCenterReadModel({
    clientId: selectedClientId ?? undefined,
    limit: input?.limit ?? COMMAND_CENTER_SITE_LIMIT,
  });

  const siteMarginBySiteId = new Map<string, SiteMarginResult>();
  for (const siteSummary of readModel.site_summaries) {
    const siteMargin = mapSiteMargin(siteSummary);
    siteMarginBySiteId.set(siteMargin.site_id, siteMargin);
  }

  const filteredSummaries = readModel.site_summaries.filter((summary) => {
    const margin = siteMarginBySiteId.get(summary.site_id) ?? null;
    return profitabilityMatches(profitability, margin);
  });

  let planSimulationErrorCount = 0;
  const simulationInputSummaries = filteredSummaries.slice(
    0,
    COMMAND_CENTER_SIMULATION_LIMIT,
  );
  const skippedPlanSimulationCount = Math.max(
    0,
    filteredSummaries.length - simulationInputSummaries.length,
  );

  const simulationBySiteId = new Map<string, SitePlanComparisonResult>();
  for (const summary of simulationInputSummaries) {
    try {
      const simulation = compareSiteAcrossPlansFromSummary(summary);
      simulationBySiteId.set(simulation.site_id, simulation);
    } catch {
      planSimulationErrorCount += 1;
    }
  }

  const agencyNameByAgencyId = new Map<string, string>();
  for (const client of readModel.clients) {
    if (client.agency_id && client.agency_name) {
      agencyNameByAgencyId.set(client.agency_id, client.agency_name);
    }
  }

  const rows: CommandCenterRow[] = filteredSummaries.map((summary) => ({
    summary,
    margin: siteMarginBySiteId.get(summary.site_id) ?? null,
    simulation: simulationBySiteId.get(summary.site_id) ?? null,
    migration: deriveMigrationStatus(summary),
  }));

  return {
    readModel,
    rows,
    agencyNameByAgencyId: Object.fromEntries(agencyNameByAgencyId.entries()),
    selectedClientId,
    profitability,
    portfolioMetrics: computePortfolioMetrics(rows),
    planSimulationErrorCount,
    skippedPlanSimulationCount,
  };
}
