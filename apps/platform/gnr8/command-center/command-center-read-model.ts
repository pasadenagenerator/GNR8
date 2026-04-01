import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveMigrationPipelineStatus, type MigrationPipelineStatus } from "@/gnr8/command-center/migration-state-automation";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const POSTGREST_PAGE_SIZE = 1000;
const OPTIONAL_EVENT_MAX_ROWS = 10000;
const RUNTIME_VERSION_MAX_ROWS = 5000;

type DbAccessMode = "supabase_postgrest_service_role" | "none";

export type CommandCenterCostCompletenessStatus =
  | "FULL_SIGNAL"
  | "AI_ONLY"
  | "RUNTIME_ONLY"
  | "MIGRATION_ONLY"
  | "PARTIAL_SIGNAL"
  | "NO_SIGNAL";

export type CommandCenterDataQualityFlags = {
  has_zero_token_ai_events: boolean;
  missing_billing_account_in_ai_events: boolean;
  no_runtime_events_seen: boolean;
  no_migration_events_seen: boolean;
};

export type CommandCenterSiteSummary = {
  site_id: string;
  domain: string | null;
  site_status: string;
  client_id: string | null;
  client_name: string | null;
  agency_id: string;
  ai_event_count: number;
  ai_prompt_tokens: number;
  ai_completion_tokens: number;
  ai_total_tokens: number;
  ai_estimated_cost_sum: number;
  runtime_event_count: number;
  runtime_request_count: number;
  runtime_bandwidth_bytes: number;
  runtime_compute_ms: number;
  runtime_estimated_cost_sum: number;
  migration_event_count: number;
  migration_compute_units: number;
  migration_estimated_cost_sum: number;
  total_estimated_cost: number;
  cost_completeness_status: CommandCenterCostCompletenessStatus;
  data_quality_flags: CommandCenterDataQualityFlags;
  latest_signal_at: string | null;
  latest_runtime_site_version_id: string | null;
  latest_runtime_state: string | null;
  has_published_runtime_version: boolean;
  effective_status: MigrationPipelineStatus;
  auto_advanced: boolean;
  automation_reason: string | null;
};

export type CommandCenterClientOption = {
  client_id: string;
  client_name: string | null;
  agency_id: string | null;
  agency_name: string | null;
};

export type CommandCenterAgencySummary = {
  id: string;
  name: string | null;
  slug: string | null;
  created_at: string | null;
};

export type CommandCenterReadModel = {
  site_summaries: CommandCenterSiteSummary[];
  clients: CommandCenterClientOption[];
  agencies: CommandCenterAgencySummary[];
  instrumentation: {
    query_count: number;
    fallback_used: boolean;
    fallback_reason: string | null;
    optional_enrichment_failed: boolean;
    db_access_mode: DbAccessMode;
    stateless_read_path: boolean;
  };
};

export type CommandCenterReadModelFilters = {
  clientId?: string;
  agencyId?: string;
  limit?: number;
};

type QueryTracker = {
  query_count: number;
};

type SiteRow = {
  id: string;
  domain: string | null;
  status: string | null;
  agency_id: string | null;
  org_id: string | null;
};

type OrganizationRow = {
  id: string;
  name: string | null;
  agency_id: string | null;
  organization_type: string | null;
};

type AgencyRow = {
  id: string;
  name: string | null;
  slug: string | null;
  created_at: string | null;
};

type AiUsageEventRow = {
  site_id: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost: number | null;
  billing_account_id: string | null;
  created_at: string | null;
};

type RuntimeUsageEventRow = {
  site_id: string | null;
  request_count: number | null;
  bandwidth_bytes: number | null;
  compute_ms: number | null;
  estimated_cost: number | null;
  created_at: string | null;
};

type MigrationCostEventRow = {
  site_id: string | null;
  compute_units: number | null;
  estimated_cost: number | null;
  created_at: string | null;
};

type RuntimeVersionRow = {
  ownership_site_id: string | null;
  id: string | null;
  state: string | null;
  version_no: number | null;
  updated_at: string | null;
  created_at: string | null;
};

type SiteCostAccumulator = {
  ai_event_count: number;
  ai_prompt_tokens: number;
  ai_completion_tokens: number;
  ai_total_tokens: number;
  ai_estimated_cost_sum: number;
  has_zero_token_ai_events: boolean;
  missing_billing_account_in_ai_events: boolean;
  runtime_event_count: number;
  runtime_request_count: number;
  runtime_bandwidth_bytes: number;
  runtime_compute_ms: number;
  runtime_estimated_cost_sum: number;
  migration_event_count: number;
  migration_compute_units: number;
  migration_estimated_cost_sum: number;
  ai_latest_event_at: string | null;
  runtime_latest_event_at: string | null;
  migration_latest_event_at: string | null;
};

type RuntimeSnapshotAccumulator = {
  latest_runtime_site_version_id: string | null;
  latest_runtime_state: string | null;
  latest_runtime_version_no: number;
  latest_runtime_updated_at: string | null;
  latest_runtime_created_at: string | null;
  has_published_runtime_version: boolean;
};

class CommandCenterReadModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandCenterReadModelError";
  }
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string | undefined {
  if (value == null) return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return undefined;
  if (UUID_RE.test(normalized) === false) {
    throw new CommandCenterReadModelError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function normalizeLimit(value: number | undefined): number {
  if (value == null || Number.isFinite(value) === false) return DEFAULT_LIMIT;
  const normalized = Math.floor(value);
  if (normalized < 1) {
    throw new CommandCenterReadModelError("limit must be a positive integer");
  }
  return Math.min(normalized, MAX_LIMIT);
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toTextOrNull(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function maxIso(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return a >= b ? a : b;
}

function classifyCompleteness(summary: {
  ai_event_count: number;
  runtime_event_count: number;
  migration_event_count: number;
}): CommandCenterCostCompletenessStatus {
  const hasAI = summary.ai_event_count > 0;
  const hasRuntime = summary.runtime_event_count > 0;
  const hasMigration = summary.migration_event_count > 0;
  const signalCount = Number(hasAI) + Number(hasRuntime) + Number(hasMigration);

  if (signalCount === 0) return "NO_SIGNAL";
  if (signalCount === 3) return "FULL_SIGNAL";
  if (hasAI && hasRuntime === false && hasMigration === false) return "AI_ONLY";
  if (hasAI === false && hasRuntime && hasMigration === false) return "RUNTIME_ONLY";
  if (hasAI === false && hasRuntime === false && hasMigration) return "MIGRATION_ONLY";
  return "PARTIAL_SIGNAL";
}

function createEmptyReadModel(input: {
  tracker: QueryTracker;
  fallbackReason: string;
  dbAccessMode: DbAccessMode;
}): CommandCenterReadModel {
  return {
    site_summaries: [],
    clients: [],
    agencies: [],
    instrumentation: {
      query_count: input.tracker.query_count,
      fallback_used: true,
      fallback_reason: input.fallbackReason,
      optional_enrichment_failed: true,
      db_access_mode: input.dbAccessMode,
      stateless_read_path: input.dbAccessMode === "supabase_postgrest_service_role",
    },
  };
}

async function fetchBatchedRows<T>(
  tracker: QueryTracker,
  runPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
  maxRows: number,
): Promise<{ rows: T[]; capped: boolean }> {
  let from = 0;
  const rows: T[] = [];

  while (from < maxRows) {
    const to = from + POSTGREST_PAGE_SIZE - 1;
    tracker.query_count += 1;
    const { data, error } = await runPage(from, to);
    if (error) {
      throw new CommandCenterReadModelError(error.message);
    }

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < POSTGREST_PAGE_SIZE) {
      return { rows, capped: false };
    }

    from += POSTGREST_PAGE_SIZE;
  }

  return { rows, capped: true };
}

function createZeroAccumulator(): SiteCostAccumulator {
  return {
    ai_event_count: 0,
    ai_prompt_tokens: 0,
    ai_completion_tokens: 0,
    ai_total_tokens: 0,
    ai_estimated_cost_sum: 0,
    has_zero_token_ai_events: false,
    missing_billing_account_in_ai_events: false,
    runtime_event_count: 0,
    runtime_request_count: 0,
    runtime_bandwidth_bytes: 0,
    runtime_compute_ms: 0,
    runtime_estimated_cost_sum: 0,
    migration_event_count: 0,
    migration_compute_units: 0,
    migration_estimated_cost_sum: 0,
    ai_latest_event_at: null,
    runtime_latest_event_at: null,
    migration_latest_event_at: null,
  };
}

async function fetchSites(
  supabase: SupabaseClient,
  tracker: QueryTracker,
  input: { clientId?: string; agencyId?: string; limit: number },
): Promise<SiteRow[]> {
  const orderAttempts: Array<{ column: "created_at" | "updated_at" | "id"; ascending: boolean }> = [
    { column: "created_at", ascending: false },
    { column: "updated_at", ascending: false },
    { column: "id", ascending: true },
  ];

  let lastMessage: string | null = null;

  for (let index = 0; index < orderAttempts.length; index += 1) {
    const orderAttempt = orderAttempts[index];
    tracker.query_count += 1;

    let query = supabase
      .from("sites")
      .select("id,domain,status,agency_id,org_id")
      .order(orderAttempt.column, { ascending: orderAttempt.ascending })
      .range(0, input.limit - 1);

    if (input.clientId) {
      query = query.eq("org_id", input.clientId);
    }
    if (input.agencyId) {
      query = query.eq("agency_id", input.agencyId);
    }

    const { data, error } = await query;
    if (error == null) {
      return Array.isArray(data) ? (data as SiteRow[]) : [];
    }

    lastMessage = error.message;
    const lowered = error.message.toLowerCase();
    const mentionsColumn = lowered.includes(orderAttempt.column);
    const missingColumn = lowered.includes("does not exist");

    if (mentionsColumn && missingColumn && index < orderAttempts.length - 1) {
      continue;
    }

    throw new CommandCenterReadModelError(error.message);
  }

  throw new CommandCenterReadModelError(lastMessage ?? "sites query failed");
}

async function fetchClientDirectory(
  supabase: SupabaseClient,
  tracker: QueryTracker,
  input?: { agencyId?: string },
): Promise<{
  clients: CommandCenterClientOption[];
  clientsById: Map<string, CommandCenterClientOption>;
  agencies: CommandCenterAgencySummary[];
}> {
  const organizationsOrderAttempts: Array<"name" | "id"> = ["name", "id"];
  let organizationsData: OrganizationRow[] = [];
  let organizationsError: string | null = null;

  for (let index = 0; index < organizationsOrderAttempts.length; index += 1) {
    const orderColumn = organizationsOrderAttempts[index];
    tracker.query_count += 1;

    let query = supabase
      .from("organizations")
      .select("id,name,agency_id,organization_type")
      .eq("organization_type", "client")
      .order(orderColumn, { ascending: true });

    if (input?.agencyId) {
      query = query.eq("agency_id", input.agencyId);
    }

    const { data, error } = await query;

    if (error == null) {
      organizationsData = Array.isArray(data) ? (data as OrganizationRow[]) : [];
      organizationsError = null;
      break;
    }

    organizationsError = error.message;
    const isLastAttempt = index === organizationsOrderAttempts.length - 1;
    if (isLastAttempt) {
      throw new CommandCenterReadModelError(error.message);
    }
  }

  if (organizationsError != null) {
    throw new CommandCenterReadModelError(organizationsError);
  }

  tracker.query_count += 1;
  const agenciesRes = await supabase
    .from("agencies")
    .select("id,name,slug,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const agencyRows = agenciesRes.error == null && Array.isArray(agenciesRes.data) ? (agenciesRes.data as AgencyRow[]) : [];
  const agencyNameById = new Map<string, string>();
  const agencies: CommandCenterAgencySummary[] = [];
  for (const agencyRow of agencyRows) {
    const agencyId = toTextOrNull(agencyRow.id);
    if (agencyId == null) continue;
    const agencyName = toTextOrNull(agencyRow.name);
    if (agencyName != null) {
      agencyNameById.set(agencyId, agencyName);
    }
    agencies.push({
      id: agencyId,
      name: agencyName,
      slug: toTextOrNull(agencyRow.slug),
      created_at: toIsoOrNull(agencyRow.created_at),
    });
  }

  const clients: CommandCenterClientOption[] = [];
  const clientsById = new Map<string, CommandCenterClientOption>();
  for (const org of organizationsData) {
    const organizationType = toTextOrNull(org.organization_type)?.toLowerCase();
    if (organizationType !== "client") continue;

    const clientId = toTextOrNull(org.id);
    if (clientId == null) continue;

    const client: CommandCenterClientOption = {
      client_id: clientId,
      client_name: toTextOrNull(org.name),
      agency_id: toTextOrNull(org.agency_id),
      agency_name: toTextOrNull(org.agency_id) ? agencyNameById.get(String(org.agency_id)) ?? null : null,
    };

    clients.push(client);
    clientsById.set(client.client_id, client);
  }

  return { clients, clientsById, agencies };
}

function compareRuntimeVersions(a: RuntimeVersionRow, b: RuntimeSnapshotAccumulator): number {
  const aVersion = toNumber(a.version_no);
  if (aVersion !== b.latest_runtime_version_no) return aVersion - b.latest_runtime_version_no;

  const aUpdatedAt = toIsoOrNull(a.updated_at);
  const bUpdatedAt = b.latest_runtime_updated_at;
  if (aUpdatedAt !== bUpdatedAt) {
    return String(aUpdatedAt ?? "").localeCompare(String(bUpdatedAt ?? ""));
  }

  const aCreatedAt = toIsoOrNull(a.created_at);
  const bCreatedAt = b.latest_runtime_created_at;
  if (aCreatedAt !== bCreatedAt) {
    return String(aCreatedAt ?? "").localeCompare(String(bCreatedAt ?? ""));
  }

  return String(a.id ?? "").localeCompare(String(b.latest_runtime_site_version_id ?? ""));
}

function mapSiteSummary(input: {
  site: SiteRow;
  clientLookup: Map<string, CommandCenterClientOption>;
  accumulator: SiteCostAccumulator;
  runtimeSnapshot: RuntimeSnapshotAccumulator | undefined;
}): CommandCenterSiteSummary {
  const siteClient = input.site.org_id ? input.clientLookup.get(input.site.org_id) : undefined;
  const siteAgencyId = toTextOrNull(input.site.agency_id);
  const scopedClient =
    siteClient && siteAgencyId && siteClient.agency_id && siteClient.agency_id === siteAgencyId ? siteClient : null;
  const totalEstimatedCost =
    input.accumulator.ai_estimated_cost_sum +
    input.accumulator.runtime_estimated_cost_sum +
    input.accumulator.migration_estimated_cost_sum;

  const latestSignalAt = maxIso(
    maxIso(input.accumulator.ai_latest_event_at, input.accumulator.runtime_latest_event_at),
    input.accumulator.migration_latest_event_at,
  );
  const migrationAutomation = resolveMigrationPipelineStatus({
    evidence: {
      site_status: String(input.site.status ?? ""),
      migration_event_count: input.accumulator.migration_event_count,
      latest_runtime_state: input.runtimeSnapshot?.latest_runtime_state ?? null,
      latest_runtime_site_version_id: input.runtimeSnapshot?.latest_runtime_site_version_id ?? null,
      has_published_runtime_version: input.runtimeSnapshot?.has_published_runtime_version ?? false,
    },
  });

  return {
    site_id: String(input.site.id ?? ""),
    domain: toTextOrNull(input.site.domain),
    site_status: String(input.site.status ?? "UNKNOWN"),
    client_id: scopedClient?.client_id ?? null,
    client_name: scopedClient?.client_name ?? null,
    agency_id: String(input.site.agency_id ?? ""),
    ai_event_count: input.accumulator.ai_event_count,
    ai_prompt_tokens: input.accumulator.ai_prompt_tokens,
    ai_completion_tokens: input.accumulator.ai_completion_tokens,
    ai_total_tokens: input.accumulator.ai_total_tokens,
    ai_estimated_cost_sum: input.accumulator.ai_estimated_cost_sum,
    runtime_event_count: input.accumulator.runtime_event_count,
    runtime_request_count: input.accumulator.runtime_request_count,
    runtime_bandwidth_bytes: input.accumulator.runtime_bandwidth_bytes,
    runtime_compute_ms: input.accumulator.runtime_compute_ms,
    runtime_estimated_cost_sum: input.accumulator.runtime_estimated_cost_sum,
    migration_event_count: input.accumulator.migration_event_count,
    migration_compute_units: input.accumulator.migration_compute_units,
    migration_estimated_cost_sum: input.accumulator.migration_estimated_cost_sum,
    total_estimated_cost: totalEstimatedCost,
    cost_completeness_status: classifyCompleteness({
      ai_event_count: input.accumulator.ai_event_count,
      runtime_event_count: input.accumulator.runtime_event_count,
      migration_event_count: input.accumulator.migration_event_count,
    }),
    data_quality_flags: {
      has_zero_token_ai_events: input.accumulator.has_zero_token_ai_events,
      missing_billing_account_in_ai_events: input.accumulator.missing_billing_account_in_ai_events,
      no_runtime_events_seen: input.accumulator.runtime_event_count === 0,
      no_migration_events_seen: input.accumulator.migration_event_count === 0,
    },
    latest_signal_at: latestSignalAt,
    latest_runtime_site_version_id: input.runtimeSnapshot?.latest_runtime_site_version_id ?? null,
    latest_runtime_state: input.runtimeSnapshot?.latest_runtime_state ?? null,
    has_published_runtime_version: input.runtimeSnapshot?.has_published_runtime_version ?? false,
    effective_status: migrationAutomation.effective_status,
    auto_advanced: migrationAutomation.auto_advanced,
    automation_reason: migrationAutomation.automation_reason,
  };
}

export async function getCommandCenterReadModel(
  filters: CommandCenterReadModelFilters = {},
): Promise<CommandCenterReadModel> {
  const tracker: QueryTracker = { query_count: 0 };
  const clientId = normalizeUuid(filters.clientId, "clientId");
  const agencyId = normalizeUuid(filters.agencyId, "agencyId");
  const limit = normalizeLimit(filters.limit);

  const supabase = getSupabaseServiceRoleClient();
  if (supabase == null) {
    return createEmptyReadModel({
      tracker,
      fallbackReason: "supabase_service_role_not_configured",
      dbAccessMode: "none",
    });
  }

  const dbAccessMode: DbAccessMode = "supabase_postgrest_service_role";
  let fallbackReason: string | null = null;
  let optionalEnrichmentFailed = false;

  let sites: SiteRow[] = [];
  try {
    sites = await fetchSites(supabase, tracker, { clientId, agencyId, limit });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createEmptyReadModel({
      tracker,
      fallbackReason: `sites_query_failed:${message}`,
      dbAccessMode,
    });
  }

  let clients: CommandCenterClientOption[] = [];
  let clientsById = new Map<string, CommandCenterClientOption>();
  let agencies: CommandCenterAgencySummary[] = [];
  try {
    const clientDirectory = await fetchClientDirectory(supabase, tracker, { agencyId });
    clients = clientDirectory.clients;
    clientsById = clientDirectory.clientsById;
    agencies = clientDirectory.agencies;
  } catch (error) {
    fallbackReason = "client_directory_unavailable";
  }

  const siteIds = sites.map((site) => String(site.id ?? "")).filter((value) => value.length > 0);
  const accumulators = new Map<string, SiteCostAccumulator>();
  for (const siteId of siteIds) {
    accumulators.set(siteId, createZeroAccumulator());
  }

  const optionalFailureReasons: string[] = [];

  if (siteIds.length > 0) {
    try {
      const aiEventsResult = await fetchBatchedRows<AiUsageEventRow>(
        tracker,
        async (from, to) => {
          const response = await supabase
            .from("ai_usage_events")
            .select("site_id,prompt_tokens,completion_tokens,total_tokens,estimated_cost,billing_account_id,created_at")
            .in("site_id", siteIds)
            .order("created_at", { ascending: false })
            .range(from, to);

          return {
            data: Array.isArray(response.data) ? (response.data as AiUsageEventRow[]) : [],
            error: response.error ? { message: response.error.message } : null,
          };
        },
        OPTIONAL_EVENT_MAX_ROWS,
      );

      if (aiEventsResult.capped) {
        optionalEnrichmentFailed = true;
        optionalFailureReasons.push("ai_events_scan_capped");
      }

      for (const row of aiEventsResult.rows) {
        const siteId = toTextOrNull(row.site_id);
        if (siteId == null) continue;
        const accumulator = accumulators.get(siteId);
        if (accumulator == null) continue;

        accumulator.ai_event_count += 1;
        accumulator.ai_prompt_tokens += toNumber(row.prompt_tokens);
        accumulator.ai_completion_tokens += toNumber(row.completion_tokens);
        accumulator.ai_total_tokens += toNumber(row.total_tokens);
        accumulator.ai_estimated_cost_sum += toNumber(row.estimated_cost);
        if (toNumber(row.total_tokens) === 0) {
          accumulator.has_zero_token_ai_events = true;
        }
        if (toTextOrNull(row.billing_account_id) == null) {
          accumulator.missing_billing_account_in_ai_events = true;
        }
        accumulator.ai_latest_event_at = maxIso(accumulator.ai_latest_event_at, toIsoOrNull(row.created_at));
      }
    } catch (error) {
      optionalEnrichmentFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      optionalFailureReasons.push(`ai_usage_events_unavailable:${message}`);
    }

    try {
      const runtimeEventsResult = await fetchBatchedRows<RuntimeUsageEventRow>(
        tracker,
        async (from, to) => {
          const response = await supabase
            .from("runtime_usage_events")
            .select("site_id,request_count,bandwidth_bytes,compute_ms,estimated_cost,created_at")
            .in("site_id", siteIds)
            .order("created_at", { ascending: false })
            .range(from, to);

          return {
            data: Array.isArray(response.data) ? (response.data as RuntimeUsageEventRow[]) : [],
            error: response.error ? { message: response.error.message } : null,
          };
        },
        OPTIONAL_EVENT_MAX_ROWS,
      );

      if (runtimeEventsResult.capped) {
        optionalEnrichmentFailed = true;
        optionalFailureReasons.push("runtime_events_scan_capped");
      }

      for (const row of runtimeEventsResult.rows) {
        const siteId = toTextOrNull(row.site_id);
        if (siteId == null) continue;
        const accumulator = accumulators.get(siteId);
        if (accumulator == null) continue;

        accumulator.runtime_event_count += 1;
        accumulator.runtime_request_count += toNumber(row.request_count);
        accumulator.runtime_bandwidth_bytes += toNumber(row.bandwidth_bytes);
        accumulator.runtime_compute_ms += toNumber(row.compute_ms);
        accumulator.runtime_estimated_cost_sum += toNumber(row.estimated_cost);
        accumulator.runtime_latest_event_at = maxIso(accumulator.runtime_latest_event_at, toIsoOrNull(row.created_at));
      }
    } catch (error) {
      optionalEnrichmentFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      optionalFailureReasons.push(`runtime_usage_events_unavailable:${message}`);
    }

    try {
      const migrationEventsResult = await fetchBatchedRows<MigrationCostEventRow>(
        tracker,
        async (from, to) => {
          const response = await supabase
            .from("migration_cost_events")
            .select("site_id,compute_units,estimated_cost,created_at")
            .in("site_id", siteIds)
            .order("created_at", { ascending: false })
            .range(from, to);

          return {
            data: Array.isArray(response.data) ? (response.data as MigrationCostEventRow[]) : [],
            error: response.error ? { message: response.error.message } : null,
          };
        },
        OPTIONAL_EVENT_MAX_ROWS,
      );

      if (migrationEventsResult.capped) {
        optionalEnrichmentFailed = true;
        optionalFailureReasons.push("migration_events_scan_capped");
      }

      for (const row of migrationEventsResult.rows) {
        const siteId = toTextOrNull(row.site_id);
        if (siteId == null) continue;
        const accumulator = accumulators.get(siteId);
        if (accumulator == null) continue;

        accumulator.migration_event_count += 1;
        accumulator.migration_compute_units += toNumber(row.compute_units);
        accumulator.migration_estimated_cost_sum += toNumber(row.estimated_cost);
        accumulator.migration_latest_event_at = maxIso(accumulator.migration_latest_event_at, toIsoOrNull(row.created_at));
      }
    } catch (error) {
      optionalEnrichmentFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      optionalFailureReasons.push(`migration_cost_events_unavailable:${message}`);
    }
  }

  const runtimeSnapshots = new Map<string, RuntimeSnapshotAccumulator>();
  if (siteIds.length > 0) {
    try {
      const runtimeVersionsResult = await fetchBatchedRows<RuntimeVersionRow>(
        tracker,
        async (from, to) => {
          const response = await supabase
            .from("gnr8_runtime_site_versions")
            .select("ownership_site_id,id,state,version_no,updated_at,created_at")
            .in("ownership_site_id", siteIds)
            .range(from, to);

          return {
            data: Array.isArray(response.data) ? (response.data as RuntimeVersionRow[]) : [],
            error: response.error ? { message: response.error.message } : null,
          };
        },
        RUNTIME_VERSION_MAX_ROWS,
      );

      if (runtimeVersionsResult.capped) {
        optionalEnrichmentFailed = true;
        optionalFailureReasons.push("runtime_versions_scan_capped");
      }

      for (const row of runtimeVersionsResult.rows) {
        const siteId = toTextOrNull(row.ownership_site_id);
        if (siteId == null) continue;
        const snapshot = runtimeSnapshots.get(siteId);
        const isPublished = String(row.state ?? "").toUpperCase() === "PUBLISHED";

        if (snapshot == null) {
          runtimeSnapshots.set(siteId, {
            latest_runtime_site_version_id: toTextOrNull(row.id),
            latest_runtime_state: toTextOrNull(row.state),
            latest_runtime_version_no: toNumber(row.version_no),
            latest_runtime_updated_at: toIsoOrNull(row.updated_at),
            latest_runtime_created_at: toIsoOrNull(row.created_at),
            has_published_runtime_version: isPublished,
          });
          continue;
        }

        snapshot.has_published_runtime_version = snapshot.has_published_runtime_version || isPublished;
        if (compareRuntimeVersions(row, snapshot) > 0) {
          snapshot.latest_runtime_site_version_id = toTextOrNull(row.id);
          snapshot.latest_runtime_state = toTextOrNull(row.state);
          snapshot.latest_runtime_version_no = toNumber(row.version_no);
          snapshot.latest_runtime_updated_at = toIsoOrNull(row.updated_at);
          snapshot.latest_runtime_created_at = toIsoOrNull(row.created_at);
        }
      }
    } catch (error) {
      optionalEnrichmentFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      optionalFailureReasons.push(`runtime_site_versions_unavailable:${message}`);
    }
  }

  const siteSummaries = sites.map((site) => {
    const siteId = String(site.id ?? "");
    const accumulator = accumulators.get(siteId) ?? createZeroAccumulator();
    const runtimeSnapshot = runtimeSnapshots.get(siteId);
    return mapSiteSummary({
      site,
      clientLookup: clientsById,
      accumulator,
      runtimeSnapshot,
    });
  });

  siteSummaries.sort((a, b) => {
    if (b.total_estimated_cost !== a.total_estimated_cost) {
      return b.total_estimated_cost - a.total_estimated_cost;
    }
    return a.site_id.localeCompare(b.site_id);
  });

  if (fallbackReason == null && optionalFailureReasons.length > 0) {
    fallbackReason = optionalFailureReasons[0] ?? null;
  }

  console.info("[command-center-read-model] loaded", {
    db_access_mode: dbAccessMode,
    stateless_read_path: true,
    query_count: tracker.query_count,
    fallback_used: fallbackReason != null,
    fallback_reason: fallbackReason,
    optional_enrichment_failed: optionalEnrichmentFailed,
  });

  return {
    site_summaries: siteSummaries,
    clients,
    agencies,
    instrumentation: {
      query_count: tracker.query_count,
      fallback_used: fallbackReason != null,
      fallback_reason: fallbackReason,
      optional_enrichment_failed: optionalEnrichmentFailed,
      db_access_mode: dbAccessMode,
      stateless_read_path: true,
    },
  };
}
