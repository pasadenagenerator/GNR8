import "server-only";

import type { PoolClient } from "pg";

import { columnExistsCached, tableExistsCached } from "@/gnr8/db/schema-introspection-cache";
import { getSuperadminPool } from "@/src/superadmin/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;
const DEFAULT_TOP_LIMIT = 10;

export type UnifiedCostCompletenessStatus =
  | "FULL_SIGNAL"
  | "AI_ONLY"
  | "RUNTIME_ONLY"
  | "MIGRATION_ONLY"
  | "PARTIAL_SIGNAL"
  | "NO_SIGNAL";

export type UnifiedCostDataQualityFlags = {
  has_zero_token_ai_events: boolean;
  missing_billing_account_in_ai_events: boolean;
  no_runtime_events_seen: boolean;
  no_migration_events_seen: boolean;
};

export type UnifiedCostSiteSummary = {
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
  cost_completeness_status: UnifiedCostCompletenessStatus;
  data_quality_flags: UnifiedCostDataQualityFlags;
  latest_signal_at: string | null;
};

export type UnifiedCostTotals = {
  site_count: number;
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
};

export type UnifiedCostSummaryCounts = {
  full_signal_sites: number;
  partial_signal_sites: number;
  ai_only_sites: number;
  runtime_only_sites: number;
  migration_only_sites: number;
  no_signal_sites: number;
  sites_with_any_signal: number;
  sites_with_zero_token_ai_events: number;
  sites_with_missing_ai_billing_account: number;
};

export type UnifiedCostOverviewFilters = {
  siteId?: string;
  clientId?: string;
  agencyId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  days?: number;
  limit?: number;
  topLimit?: number;
};

export type UnifiedCostOverviewResult = {
  filters: {
    site_id: string | null;
    client_id: string | null;
    agency_id: string | null;
    start_date: string | null;
    end_date: string | null;
    limit: number;
    top_limit: number;
  };
  table_availability: {
    sites: boolean;
    organizations: boolean;
    ai_usage_events: boolean;
    runtime_usage_events: boolean;
    migration_cost_events: boolean;
  };
  site_summaries: UnifiedCostSiteSummary[];
  aggregate_totals: UnifiedCostTotals;
  summary_counts: UnifiedCostSummaryCounts;
  top_cost_sites: UnifiedCostSiteSummary[];
};

type NormalizedFilters = {
  siteId?: string;
  clientId?: string;
  agencyId?: string;
  startDateIso?: string;
  endDateIso?: string;
  limit: number;
  topLimit: number;
};

type TableAvailability = {
  sites: boolean;
  organizations: boolean;
  ai_usage_events: boolean;
  runtime_usage_events: boolean;
  migration_cost_events: boolean;
};

type RawUnifiedCostRow = {
  site_id: string;
  domain: string | null;
  site_status: string;
  client_id: string | null;
  client_name: string | null;
  agency_id: string;
  ai_event_count: string | number;
  ai_prompt_tokens: string | number;
  ai_completion_tokens: string | number;
  ai_total_tokens: string | number;
  ai_estimated_cost_sum: string | number;
  has_zero_token_ai_events: boolean;
  missing_billing_account_in_ai_events: boolean;
  runtime_event_count: string | number;
  runtime_request_count: string | number;
  runtime_bandwidth_bytes: string | number;
  runtime_compute_ms: string | number;
  runtime_estimated_cost_sum: string | number;
  migration_event_count: string | number;
  migration_compute_units: string | number;
  migration_estimated_cost_sum: string | number;
  latest_signal_at: string | Date | null;
};

class UnifiedCostViewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnifiedCostViewError";
  }
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string | undefined {
  if (value == null) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!UUID_RE.test(normalized)) {
    throw new UnifiedCostViewError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function normalizePositiveInt(value: number | undefined, fallback: number, max: number, fieldName: string): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized < 1) {
    throw new UnifiedCostViewError(`${fieldName} must be a positive integer`);
  }
  return Math.min(normalized, max);
}

function normalizeDate(value: string | Date | undefined, fieldName: string): string | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new UnifiedCostViewError(`${fieldName} must be a valid date`);
  }
  return date.toISOString();
}

function normalizeFilters(input: UnifiedCostOverviewFilters): NormalizedFilters {
  const siteId = normalizeUuid(input.siteId, "siteId");
  const clientId = normalizeUuid(input.clientId, "clientId");
  const agencyId = normalizeUuid(input.agencyId, "agencyId");
  const limit = normalizePositiveInt(input.limit, DEFAULT_LIMIT, MAX_LIMIT, "limit");
  const topLimit = normalizePositiveInt(input.topLimit, DEFAULT_TOP_LIMIT, MAX_LIMIT, "topLimit");

  let startDateIso = normalizeDate(input.startDate, "startDate");
  let endDateIso = normalizeDate(input.endDate, "endDate");

  if (input.days != null) {
    if (!Number.isFinite(input.days) || Math.floor(input.days) < 1) {
      throw new UnifiedCostViewError("days must be a positive integer");
    }
    const days = Math.floor(input.days);
    const now = Date.now();
    startDateIso = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
    endDateIso = endDateIso ?? new Date(now).toISOString();
  }

  if (startDateIso && endDateIso && new Date(startDateIso).getTime() > new Date(endDateIso).getTime()) {
    throw new UnifiedCostViewError("startDate must be earlier than or equal to endDate");
  }

  return {
    siteId,
    clientId,
    agencyId,
    startDateIso,
    endDateIso,
    limit,
    topLimit,
  };
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function classifyCompleteness(summary: {
  ai_event_count: number;
  runtime_event_count: number;
  migration_event_count: number;
}): UnifiedCostCompletenessStatus {
  const hasAI = summary.ai_event_count > 0;
  const hasRuntime = summary.runtime_event_count > 0;
  const hasMigration = summary.migration_event_count > 0;
  const signalCount = Number(hasAI) + Number(hasRuntime) + Number(hasMigration);

  if (signalCount === 0) return "NO_SIGNAL";
  if (signalCount === 3) return "FULL_SIGNAL";
  if (hasAI && !hasRuntime && !hasMigration) return "AI_ONLY";
  if (!hasAI && hasRuntime && !hasMigration) return "RUNTIME_ONLY";
  if (!hasAI && !hasRuntime && hasMigration) return "MIGRATION_ONLY";
  return "PARTIAL_SIGNAL";
}

function buildOverviewFilters(
  normalized: NormalizedFilters,
): UnifiedCostOverviewResult["filters"] {
  return {
    site_id: normalized.siteId ?? null,
    client_id: normalized.clientId ?? null,
    agency_id: normalized.agencyId ?? null,
    start_date: normalized.startDateIso ?? null,
    end_date: normalized.endDateIso ?? null,
    limit: normalized.limit,
    top_limit: normalized.topLimit,
  };
}

function toIsoOrNull(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mapSummaryRow(row: RawUnifiedCostRow): UnifiedCostSiteSummary {
  const ai_event_count = toNumber(row.ai_event_count);
  const runtime_event_count = toNumber(row.runtime_event_count);
  const migration_event_count = toNumber(row.migration_event_count);
  const ai_estimated_cost_sum = toNumber(row.ai_estimated_cost_sum);
  const runtime_estimated_cost_sum = toNumber(row.runtime_estimated_cost_sum);
  const migration_estimated_cost_sum = toNumber(row.migration_estimated_cost_sum);

  const total_estimated_cost = ai_estimated_cost_sum + runtime_estimated_cost_sum + migration_estimated_cost_sum;
  const cost_completeness_status = classifyCompleteness({
    ai_event_count,
    runtime_event_count,
    migration_event_count,
  });

  return {
    site_id: row.site_id,
    domain: row.domain,
    site_status: row.site_status,
    client_id: row.client_id,
    client_name: row.client_name,
    agency_id: row.agency_id,
    ai_event_count,
    ai_prompt_tokens: toNumber(row.ai_prompt_tokens),
    ai_completion_tokens: toNumber(row.ai_completion_tokens),
    ai_total_tokens: toNumber(row.ai_total_tokens),
    ai_estimated_cost_sum,
    runtime_event_count,
    runtime_request_count: toNumber(row.runtime_request_count),
    runtime_bandwidth_bytes: toNumber(row.runtime_bandwidth_bytes),
    runtime_compute_ms: toNumber(row.runtime_compute_ms),
    runtime_estimated_cost_sum,
    migration_event_count,
    migration_compute_units: toNumber(row.migration_compute_units),
    migration_estimated_cost_sum,
    total_estimated_cost,
    cost_completeness_status,
    data_quality_flags: {
      has_zero_token_ai_events: !!row.has_zero_token_ai_events,
      missing_billing_account_in_ai_events: !!row.missing_billing_account_in_ai_events,
      no_runtime_events_seen: runtime_event_count === 0,
      no_migration_events_seen: migration_event_count === 0,
    },
    latest_signal_at: toIsoOrNull(row.latest_signal_at),
  };
}

function sortByCostAndSignal(a: UnifiedCostSiteSummary, b: UnifiedCostSiteSummary): number {
  if (b.total_estimated_cost !== a.total_estimated_cost) {
    return b.total_estimated_cost - a.total_estimated_cost;
  }

  const at = a.latest_signal_at ? new Date(a.latest_signal_at).getTime() : 0;
  const bt = b.latest_signal_at ? new Date(b.latest_signal_at).getTime() : 0;
  return bt - at;
}

function summarizeTotals(siteSummaries: UnifiedCostSiteSummary[]): UnifiedCostTotals {
  return siteSummaries.reduce<UnifiedCostTotals>(
    (acc, site) => {
      acc.site_count += 1;
      acc.ai_event_count += site.ai_event_count;
      acc.ai_prompt_tokens += site.ai_prompt_tokens;
      acc.ai_completion_tokens += site.ai_completion_tokens;
      acc.ai_total_tokens += site.ai_total_tokens;
      acc.ai_estimated_cost_sum += site.ai_estimated_cost_sum;
      acc.runtime_event_count += site.runtime_event_count;
      acc.runtime_request_count += site.runtime_request_count;
      acc.runtime_bandwidth_bytes += site.runtime_bandwidth_bytes;
      acc.runtime_compute_ms += site.runtime_compute_ms;
      acc.runtime_estimated_cost_sum += site.runtime_estimated_cost_sum;
      acc.migration_event_count += site.migration_event_count;
      acc.migration_compute_units += site.migration_compute_units;
      acc.migration_estimated_cost_sum += site.migration_estimated_cost_sum;
      acc.total_estimated_cost += site.total_estimated_cost;
      return acc;
    },
    {
      site_count: 0,
      ai_event_count: 0,
      ai_prompt_tokens: 0,
      ai_completion_tokens: 0,
      ai_total_tokens: 0,
      ai_estimated_cost_sum: 0,
      runtime_event_count: 0,
      runtime_request_count: 0,
      runtime_bandwidth_bytes: 0,
      runtime_compute_ms: 0,
      runtime_estimated_cost_sum: 0,
      migration_event_count: 0,
      migration_compute_units: 0,
      migration_estimated_cost_sum: 0,
      total_estimated_cost: 0,
    },
  );
}

function summarizeCounts(siteSummaries: UnifiedCostSiteSummary[]): UnifiedCostSummaryCounts {
  return siteSummaries.reduce<UnifiedCostSummaryCounts>(
    (acc, site) => {
      if (site.cost_completeness_status === "FULL_SIGNAL") acc.full_signal_sites += 1;
      if (site.cost_completeness_status === "PARTIAL_SIGNAL") acc.partial_signal_sites += 1;
      if (site.cost_completeness_status === "AI_ONLY") acc.ai_only_sites += 1;
      if (site.cost_completeness_status === "RUNTIME_ONLY") acc.runtime_only_sites += 1;
      if (site.cost_completeness_status === "MIGRATION_ONLY") acc.migration_only_sites += 1;
      if (site.cost_completeness_status === "NO_SIGNAL") acc.no_signal_sites += 1;
      if (site.cost_completeness_status !== "NO_SIGNAL") acc.sites_with_any_signal += 1;
      if (site.data_quality_flags.has_zero_token_ai_events) acc.sites_with_zero_token_ai_events += 1;
      if (site.data_quality_flags.missing_billing_account_in_ai_events) acc.sites_with_missing_ai_billing_account += 1;
      return acc;
    },
    {
      full_signal_sites: 0,
      partial_signal_sites: 0,
      ai_only_sites: 0,
      runtime_only_sites: 0,
      migration_only_sites: 0,
      no_signal_sites: 0,
      sites_with_any_signal: 0,
      sites_with_zero_token_ai_events: 0,
      sites_with_missing_ai_billing_account: 0,
    },
  );
}

async function readOverviewRows(
  client: PoolClient,
  normalized: NormalizedFilters,
  availability: TableAvailability,
): Promise<RawUnifiedCostRow[]> {
  if (!availability.sites) {
    throw new UnifiedCostViewError("sites table does not exist in this environment");
  }

  const hasOrganizationName = availability.organizations
    ? await columnExistsCached(client, "public.organizations", "name")
    : false;

  const whereClauses: string[] = [];
  const params: Array<string> = [];

  if (normalized.siteId) {
    params.push(normalized.siteId);
    whereClauses.push(`s.id = $${params.length}::uuid`);
  }

  if (normalized.clientId) {
    params.push(normalized.clientId);
    if (availability.organizations) {
      whereClauses.push(`s.org_id = $${params.length}::uuid`);
      whereClauses.push(`o.organization_type::text = 'client'`);
    } else {
      whereClauses.push(`false`);
    }
  }

  if (normalized.agencyId) {
    params.push(normalized.agencyId);
    whereClauses.push(`s.agency_id = $${params.length}::uuid`);
  }

  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  const startDateFilter = normalized.startDateIso
    ? `and e.created_at >= $${params.push(normalized.startDateIso)}::timestamptz`
    : "";
  const endDateFilter = normalized.endDateIso
    ? `and e.created_at <= $${params.push(normalized.endDateIso)}::timestamptz`
    : "";
  const eventDateFilter = `${startDateFilter} ${endDateFilter}`.trim();

  const siteScopeClientIdSql = availability.organizations
    ? `case when o.organization_type::text = 'client' then s.org_id::text else null end as client_id`
    : `null::text as client_id`;
  const siteScopeClientNameSql = availability.organizations && hasOrganizationName
    ? `case when o.organization_type::text = 'client' then o.name::text else null end as client_name`
    : `null::text as client_name`;
  const siteScopeJoinSql = availability.organizations
    ? `left join public.organizations o on o.id = s.org_id`
    : "";

  const aiCteSql = availability.ai_usage_events
    ? `
  ai as (
    select
      e.site_id::text as site_id,
      count(*)::bigint as ai_event_count,
      coalesce(sum(e.prompt_tokens), 0)::bigint as ai_prompt_tokens,
      coalesce(sum(e.completion_tokens), 0)::bigint as ai_completion_tokens,
      coalesce(sum(e.total_tokens), 0)::bigint as ai_total_tokens,
      coalesce(sum(e.estimated_cost), 0)::numeric as ai_estimated_cost_sum,
      (count(*) filter (where e.total_tokens = 0) > 0) as has_zero_token_ai_events,
      (count(*) filter (where e.billing_account_id is null) > 0) as missing_billing_account_in_ai_events,
      max(e.created_at) as ai_latest_event_at
    from public.ai_usage_events e
    join site_scope ss on ss.site_id = e.site_id::text
    where e.site_id is not null
      ${eventDateFilter}
    group by e.site_id
  )
`
    : `
  ai as (
    select
      null::text as site_id,
      0::bigint as ai_event_count,
      0::bigint as ai_prompt_tokens,
      0::bigint as ai_completion_tokens,
      0::bigint as ai_total_tokens,
      0::numeric as ai_estimated_cost_sum,
      false as has_zero_token_ai_events,
      false as missing_billing_account_in_ai_events,
      null::timestamptz as ai_latest_event_at
    where false
  )
`;

  const runtimeCteSql = availability.runtime_usage_events
    ? `
  runtime as (
    select
      e.site_id::text as site_id,
      count(*)::bigint as runtime_event_count,
      coalesce(sum(e.request_count), 0)::bigint as runtime_request_count,
      coalesce(sum(e.bandwidth_bytes), 0)::bigint as runtime_bandwidth_bytes,
      coalesce(sum(e.compute_ms), 0)::bigint as runtime_compute_ms,
      coalesce(sum(e.estimated_cost), 0)::numeric as runtime_estimated_cost_sum,
      max(e.created_at) as runtime_latest_event_at
    from public.runtime_usage_events e
    join site_scope ss on ss.site_id = e.site_id::text
    where true
      ${eventDateFilter}
    group by e.site_id
  )
`
    : `
  runtime as (
    select
      null::text as site_id,
      0::bigint as runtime_event_count,
      0::bigint as runtime_request_count,
      0::bigint as runtime_bandwidth_bytes,
      0::bigint as runtime_compute_ms,
      0::numeric as runtime_estimated_cost_sum,
      null::timestamptz as runtime_latest_event_at
    where false
  )
`;

  const migrationCteSql = availability.migration_cost_events
    ? `
  migration as (
    select
      e.site_id::text as site_id,
      count(*)::bigint as migration_event_count,
      coalesce(sum(e.compute_units), 0)::numeric as migration_compute_units,
      coalesce(sum(e.estimated_cost), 0)::numeric as migration_estimated_cost_sum,
      max(e.created_at) as migration_latest_event_at
    from public.migration_cost_events e
    join site_scope ss on ss.site_id = e.site_id::text
    where e.site_id is not null
      ${eventDateFilter}
    group by e.site_id
  )
`
    : `
  migration as (
    select
      null::text as site_id,
      0::bigint as migration_event_count,
      0::numeric as migration_compute_units,
      0::numeric as migration_estimated_cost_sum,
      null::timestamptz as migration_latest_event_at
    where false
  )
`;

  const query = `
with
  site_scope as (
    select
      s.id::text as site_id,
      s.domain::text as domain,
      s.status::text as site_status,
      s.agency_id::text as agency_id,
      ${siteScopeClientIdSql},
      ${siteScopeClientNameSql}
    from public.sites s
    ${siteScopeJoinSql}
    ${whereSql}
  ),
  ${aiCteSql},
  ${runtimeCteSql},
  ${migrationCteSql}
select
  ss.site_id,
  ss.domain,
  ss.site_status,
  ss.client_id,
  ss.client_name,
  ss.agency_id,
  coalesce(ai.ai_event_count, 0)::bigint as ai_event_count,
  coalesce(ai.ai_prompt_tokens, 0)::bigint as ai_prompt_tokens,
  coalesce(ai.ai_completion_tokens, 0)::bigint as ai_completion_tokens,
  coalesce(ai.ai_total_tokens, 0)::bigint as ai_total_tokens,
  coalesce(ai.ai_estimated_cost_sum, 0)::numeric as ai_estimated_cost_sum,
  coalesce(ai.has_zero_token_ai_events, false) as has_zero_token_ai_events,
  coalesce(ai.missing_billing_account_in_ai_events, false) as missing_billing_account_in_ai_events,
  coalesce(runtime.runtime_event_count, 0)::bigint as runtime_event_count,
  coalesce(runtime.runtime_request_count, 0)::bigint as runtime_request_count,
  coalesce(runtime.runtime_bandwidth_bytes, 0)::bigint as runtime_bandwidth_bytes,
  coalesce(runtime.runtime_compute_ms, 0)::bigint as runtime_compute_ms,
  coalesce(runtime.runtime_estimated_cost_sum, 0)::numeric as runtime_estimated_cost_sum,
  coalesce(migration.migration_event_count, 0)::bigint as migration_event_count,
  coalesce(migration.migration_compute_units, 0)::numeric as migration_compute_units,
  coalesce(migration.migration_estimated_cost_sum, 0)::numeric as migration_estimated_cost_sum,
  case
    when ai.ai_latest_event_at is null
      and runtime.runtime_latest_event_at is null
      and migration.migration_latest_event_at is null
    then null
    else greatest(
      coalesce(ai.ai_latest_event_at, to_timestamp(0)),
      coalesce(runtime.runtime_latest_event_at, to_timestamp(0)),
      coalesce(migration.migration_latest_event_at, to_timestamp(0))
    )
  end as latest_signal_at
from site_scope ss
left join ai on ai.site_id = ss.site_id
left join runtime on runtime.site_id = ss.site_id
left join migration on migration.site_id = ss.site_id
`;

  const result = await client.query<RawUnifiedCostRow>(query, params);
  return result.rows;
}

export async function getUnifiedCostOverview(
  filters: UnifiedCostOverviewFilters = {},
  options?: { dbClient?: PoolClient },
): Promise<UnifiedCostOverviewResult> {
  const normalized = normalizeFilters(filters);
  const pool = options?.dbClient ? null : getSuperadminPool();
  const client = options?.dbClient ?? (await pool!.connect());
  const shouldReleaseClient = !options?.dbClient;

  try {
    const availability: TableAvailability = {
      sites: await tableExistsCached(client, "public.sites"),
      organizations: await tableExistsCached(client, "public.organizations"),
      ai_usage_events: await tableExistsCached(client, "public.ai_usage_events"),
      runtime_usage_events: await tableExistsCached(client, "public.runtime_usage_events"),
      migration_cost_events: await tableExistsCached(client, "public.migration_cost_events"),
    };

    const rows = await readOverviewRows(client, normalized, availability);
    const summaries = rows.map(mapSummaryRow).sort(sortByCostAndSignal);

    return {
      filters: buildOverviewFilters(normalized),
      table_availability: availability,
      site_summaries: summaries.slice(0, normalized.limit),
      aggregate_totals: summarizeTotals(summaries),
      summary_counts: summarizeCounts(summaries),
      top_cost_sites: summaries.slice(0, normalized.topLimit),
    };
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
}

export async function getUnifiedCostForSite(
  siteId: string,
  options?: Pick<UnifiedCostOverviewFilters, "startDate" | "endDate" | "days">,
): Promise<UnifiedCostSiteSummary | null> {
  const normalizedSiteId = normalizeUuid(siteId, "siteId");
  if (!normalizedSiteId) {
    throw new UnifiedCostViewError("siteId is required");
  }

  const overview = await getUnifiedCostOverview({
    siteId: normalizedSiteId,
    startDate: options?.startDate,
    endDate: options?.endDate,
    days: options?.days,
    limit: 1,
    topLimit: 1,
  });

  return overview.site_summaries[0] ?? null;
}
