import "server-only";

import { getSuperadminPool } from "@/src/superadmin/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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
};

export type CommandCenterClientOption = {
  client_id: string;
  client_name: string | null;
  agency_id: string | null;
  agency_name: string | null;
};

export type CommandCenterReadModel = {
  site_summaries: CommandCenterSiteSummary[];
  clients: CommandCenterClientOption[];
  instrumentation: {
    query_count: number;
    fallback_used: boolean;
    fallback_reason: string | null;
    optional_enrichment_failed: boolean;
  };
};

export type CommandCenterReadModelFilters = {
  clientId?: string;
  limit?: number;
};

type MetadataRow = {
  has_sites: boolean;
  has_organizations: boolean;
  has_agencies: boolean;
  has_ai_usage_events: boolean;
  has_runtime_usage_events: boolean;
  has_migration_cost_events: boolean;
  has_runtime_site_versions: boolean;
  has_org_name: boolean;
  has_org_type: boolean;
  has_org_agency_id: boolean;
  has_agency_name: boolean;
  has_site_created_at: boolean;
  has_site_updated_at: boolean;
};

type ConsolidatedPayloadRow = {
  site_rows: unknown;
  client_rows: unknown;
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
  if (!normalized) return undefined;
  if (!UUID_RE.test(normalized)) {
    throw new CommandCenterReadModelError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function normalizeLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_LIMIT;
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
  return normalized ? normalized : null;
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
  if (hasAI && !hasRuntime && !hasMigration) return "AI_ONLY";
  if (!hasAI && hasRuntime && !hasMigration) return "RUNTIME_ONLY";
  if (!hasAI && !hasRuntime && hasMigration) return "MIGRATION_ONLY";
  return "PARTIAL_SIGNAL";
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toObjectArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  const next: Array<Record<string, unknown>> = [];
  for (const item of value) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      next.push(item as Record<string, unknown>);
    }
  }
  return next;
}

function mapSiteRows(rows: Array<Record<string, unknown>>): CommandCenterSiteSummary[] {
  return rows.map((row) => {
    const ai_event_count = toNumber(row.ai_event_count);
    const runtime_event_count = toNumber(row.runtime_event_count);
    const migration_event_count = toNumber(row.migration_event_count);
    const ai_estimated_cost_sum = toNumber(row.ai_estimated_cost_sum);
    const runtime_estimated_cost_sum = toNumber(row.runtime_estimated_cost_sum);
    const migration_estimated_cost_sum = toNumber(row.migration_estimated_cost_sum);
    const total_estimated_cost = ai_estimated_cost_sum + runtime_estimated_cost_sum + migration_estimated_cost_sum;

    return {
      site_id: String(row.site_id ?? ""),
      domain: toTextOrNull(row.domain),
      site_status: String(row.site_status ?? "UNKNOWN"),
      client_id: toTextOrNull(row.client_id),
      client_name: toTextOrNull(row.client_name),
      agency_id: String(row.agency_id ?? ""),
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
      cost_completeness_status: classifyCompleteness({
        ai_event_count,
        runtime_event_count,
        migration_event_count,
      }),
      data_quality_flags: {
        has_zero_token_ai_events: Boolean(row.has_zero_token_ai_events),
        missing_billing_account_in_ai_events: Boolean(row.missing_billing_account_in_ai_events),
        no_runtime_events_seen: runtime_event_count === 0,
        no_migration_events_seen: migration_event_count === 0,
      },
      latest_signal_at: toIsoOrNull(row.latest_signal_at),
      latest_runtime_site_version_id: toTextOrNull(row.latest_runtime_site_version_id),
      latest_runtime_state: toTextOrNull(row.latest_runtime_state),
      has_published_runtime_version: Boolean(row.has_published_runtime_version),
    };
  });
}

function mapClientRows(rows: Array<Record<string, unknown>>): CommandCenterClientOption[] {
  return rows
    .map((row) => ({
      client_id: String(row.client_id ?? ""),
      client_name: toTextOrNull(row.client_name),
      agency_id: toTextOrNull(row.agency_id),
      agency_name: toTextOrNull(row.agency_name),
    }))
    .filter((row) => row.client_id.length > 0);
}

async function readMetadata(): Promise<MetadataRow> {
  const pool = getSuperadminPool();
  const result = await pool.query<MetadataRow>(
    `
      select
        to_regclass('public.sites') is not null as has_sites,
        to_regclass('public.organizations') is not null as has_organizations,
        to_regclass('public.agencies') is not null as has_agencies,
        to_regclass('public.ai_usage_events') is not null as has_ai_usage_events,
        to_regclass('public.runtime_usage_events') is not null as has_runtime_usage_events,
        to_regclass('public.migration_cost_events') is not null as has_migration_cost_events,
        to_regclass('public.gnr8_runtime_site_versions') is not null as has_runtime_site_versions,
        exists(
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'organizations'
            and c.column_name = 'name'
        ) as has_org_name,
        exists(
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'organizations'
            and c.column_name = 'organization_type'
        ) as has_org_type,
        exists(
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'organizations'
            and c.column_name = 'agency_id'
        ) as has_org_agency_id,
        exists(
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'agencies'
            and c.column_name = 'name'
        ) as has_agency_name,
        exists(
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'sites'
            and c.column_name = 'created_at'
        ) as has_site_created_at,
        exists(
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'sites'
            and c.column_name = 'updated_at'
        ) as has_site_updated_at
    `,
  );

  const row = result.rows[0];
  if (!row) {
    throw new CommandCenterReadModelError("Failed to load command center metadata");
  }

  return row;
}

function buildConsolidatedQuery(input: {
  metadata: MetadataRow;
  clientId?: string;
  limit: number;
}): { sql: string; params: unknown[]; optionalEnrichmentEnabled: boolean } {
  const { metadata, clientId, limit } = input;

  const params: unknown[] = [];
  const whereClauses: string[] = [];

  if (clientId) {
    params.push(clientId);
    if (metadata.has_organizations && metadata.has_org_type) {
      whereClauses.push(`s.org_id = $${params.length}::uuid`);
    } else {
      whereClauses.push("false");
    }
  }

  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  params.push(limit);
  const limitPlaceholder = `$${params.length}`;

  const siteScopeJoinSql = metadata.has_organizations ? "left join public.organizations o on o.id = s.org_id" : "";
  const siteScopeClientIdSql = metadata.has_organizations && metadata.has_org_type
    ? "case when o.organization_type::text = 'client' then s.org_id::text else null end as client_id"
    : "null::text as client_id";
  const siteScopeClientNameSql = metadata.has_organizations && metadata.has_org_name && metadata.has_org_type
    ? "case when o.organization_type::text = 'client' then o.name::text else null end as client_name"
    : "null::text as client_name";

  const siteSortSql = metadata.has_site_created_at
    ? "order by s.created_at desc nulls last, s.id asc"
    : metadata.has_site_updated_at
      ? "order by s.updated_at desc nulls last, s.id asc"
      : "order by s.id asc";

  const aiCteSql = metadata.has_ai_usage_events
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
    group by e.site_id
  )`
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
  )`;

  const runtimeCteSql = metadata.has_runtime_usage_events
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
    group by e.site_id
  )`
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
  )`;

  const migrationCteSql = metadata.has_migration_cost_events
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
    group by e.site_id
  )`
    : `
  migration as (
    select
      null::text as site_id,
      0::bigint as migration_event_count,
      0::numeric as migration_compute_units,
      0::numeric as migration_estimated_cost_sum,
      null::timestamptz as migration_latest_event_at
    where false
  )`;

  const runtimeSnapshotCteSql = metadata.has_runtime_site_versions
    ? `
  runtime_snapshot as (
    with ranked as (
      select
        sv.ownership_site_id::text as site_id,
        sv.id::text as latest_runtime_site_version_id,
        sv.state::text as latest_runtime_state,
        row_number() over (
          partition by sv.ownership_site_id
          order by sv.version_no desc, sv.updated_at desc, sv.created_at desc, sv.id::text desc
        ) as row_rank,
        max(case when sv.state = 'PUBLISHED' then 1 else 0 end) over (
          partition by sv.ownership_site_id
        ) as has_published_int
      from public.gnr8_runtime_site_versions sv
      join site_scope ss on ss.site_id = sv.ownership_site_id::text
    )
    select
      site_id,
      latest_runtime_site_version_id,
      latest_runtime_state,
      has_published_int = 1 as has_published_runtime_version
    from ranked
    where row_rank = 1
  )`
    : `
  runtime_snapshot as (
    select
      null::text as site_id,
      null::text as latest_runtime_site_version_id,
      null::text as latest_runtime_state,
      false as has_published_runtime_version
    where false
  )`;

  const clientDirectoryCteSql = metadata.has_organizations && metadata.has_org_type
    ? `
  client_directory as (
    select
      o.id::text as client_id,
      ${metadata.has_org_name ? "o.name::text" : "null::text"} as client_name,
      ${metadata.has_org_agency_id ? "o.agency_id::text" : "null::text"} as agency_id,
      ${metadata.has_agencies && metadata.has_agency_name && metadata.has_org_agency_id ? "a.name::text" : "null::text"} as agency_name,
      ${metadata.has_org_name ? "o.name::text" : "null::text"} as client_sort_name
    from public.organizations o
    ${metadata.has_agencies && metadata.has_org_agency_id ? "left join public.agencies a on a.id = o.agency_id" : ""}
    where o.organization_type::text = 'client'
  )`
    : `
  client_directory as (
    select
      null::text as client_id,
      null::text as client_name,
      null::text as agency_id,
      null::text as agency_name,
      null::text as client_sort_name
    where false
  )`;

  const sql = `
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
    ${siteSortSql}
    limit ${limitPlaceholder}
  ),
  ${aiCteSql},
  ${runtimeCteSql},
  ${migrationCteSql},
  ${runtimeSnapshotCteSql},
  ${clientDirectoryCteSql},
  final_rows as (
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
      end as latest_signal_at,
      rs.latest_runtime_site_version_id,
      rs.latest_runtime_state,
      coalesce(rs.has_published_runtime_version, false) as has_published_runtime_version
    from site_scope ss
    left join ai on ai.site_id = ss.site_id
    left join runtime on runtime.site_id = ss.site_id
    left join migration on migration.site_id = ss.site_id
    left join runtime_snapshot rs on rs.site_id = ss.site_id
  )
select
  coalesce(
    (
      select jsonb_agg(to_jsonb(fr) order by (fr.ai_estimated_cost_sum + fr.runtime_estimated_cost_sum + fr.migration_estimated_cost_sum) desc, fr.site_id asc)
      from final_rows fr
    ),
    '[]'::jsonb
  ) as site_rows,
  coalesce(
    (
      select jsonb_agg(to_jsonb(cd) order by cd.client_sort_name asc nulls last, cd.client_id asc)
      from client_directory cd
    ),
    '[]'::jsonb
  ) as client_rows
`;

  return {
    sql,
    params,
    optionalEnrichmentEnabled:
      metadata.has_ai_usage_events ||
      metadata.has_runtime_usage_events ||
      metadata.has_migration_cost_events ||
      metadata.has_runtime_site_versions,
  };
}

async function runFallbackCoreRead(input: {
  metadata: MetadataRow;
  clientId?: string;
  limit: number;
}): Promise<CommandCenterReadModel> {
  const { metadata, clientId, limit } = input;
  const pool = getSuperadminPool();

  const params: unknown[] = [];
  const whereClauses: string[] = [];
  if (clientId) {
    params.push(clientId);
    if (metadata.has_organizations && metadata.has_org_type) {
      whereClauses.push(`s.org_id = $${params.length}::uuid`);
    } else {
      whereClauses.push("false");
    }
  }
  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  params.push(limit);
  const limitPlaceholder = `$${params.length}`;

  const siteRowsResult = await pool.query<Record<string, unknown>>(
    `
      select
        s.id::text as site_id,
        s.domain::text as domain,
        s.status::text as site_status,
        ${metadata.has_organizations && metadata.has_org_type ? "case when o.organization_type::text = 'client' then s.org_id::text else null end" : "null::text"} as client_id,
        ${metadata.has_organizations && metadata.has_org_name && metadata.has_org_type ? "case when o.organization_type::text = 'client' then o.name::text else null end" : "null::text"} as client_name,
        s.agency_id::text as agency_id,
        0::bigint as ai_event_count,
        0::bigint as ai_prompt_tokens,
        0::bigint as ai_completion_tokens,
        0::bigint as ai_total_tokens,
        0::numeric as ai_estimated_cost_sum,
        false as has_zero_token_ai_events,
        false as missing_billing_account_in_ai_events,
        0::bigint as runtime_event_count,
        0::bigint as runtime_request_count,
        0::bigint as runtime_bandwidth_bytes,
        0::bigint as runtime_compute_ms,
        0::numeric as runtime_estimated_cost_sum,
        0::bigint as migration_event_count,
        0::numeric as migration_compute_units,
        0::numeric as migration_estimated_cost_sum,
        null::timestamptz as latest_signal_at,
        null::text as latest_runtime_site_version_id,
        null::text as latest_runtime_state,
        false as has_published_runtime_version
      from public.sites s
      ${metadata.has_organizations ? "left join public.organizations o on o.id = s.org_id" : ""}
      ${whereSql}
      ${metadata.has_site_created_at ? "order by s.created_at desc nulls last, s.id asc" : "order by s.id asc"}
      limit ${limitPlaceholder}
    `,
    params,
  );

  let clients: CommandCenterClientOption[] = [];
  if (metadata.has_organizations && metadata.has_org_type) {
    const clientsRes = await pool.query<Record<string, unknown>>(
      `
        select
          o.id::text as client_id,
          ${metadata.has_org_name ? "o.name::text" : "null::text"} as client_name,
          ${metadata.has_org_agency_id ? "o.agency_id::text" : "null::text"} as agency_id,
          ${metadata.has_agencies && metadata.has_agency_name && metadata.has_org_agency_id ? "a.name::text" : "null::text"} as agency_name
        from public.organizations o
        ${metadata.has_agencies && metadata.has_org_agency_id ? "left join public.agencies a on a.id = o.agency_id" : ""}
        where o.organization_type::text = 'client'
        order by ${metadata.has_org_name ? "o.name asc nulls last," : ""} o.id asc
      `,
    );
    clients = mapClientRows(clientsRes.rows);
  }

  return {
    site_summaries: mapSiteRows(siteRowsResult.rows),
    clients,
    instrumentation: {
      query_count: metadata.has_organizations && metadata.has_org_type ? 2 : 1,
      fallback_used: true,
      fallback_reason: "consolidated_query_failed",
      optional_enrichment_failed: true,
    },
  };
}

export async function getCommandCenterReadModel(
  filters: CommandCenterReadModelFilters = {},
): Promise<CommandCenterReadModel> {
  const clientId = normalizeUuid(filters.clientId, "clientId");
  const limit = normalizeLimit(filters.limit);

  const metadata = await readMetadata();
  if (!metadata.has_sites) {
    return {
      site_summaries: [],
      clients: [],
      instrumentation: {
        query_count: 1,
        fallback_used: true,
        fallback_reason: "sites_table_missing",
        optional_enrichment_failed: true,
      },
    };
  }

  const { sql, params, optionalEnrichmentEnabled } = buildConsolidatedQuery({
    metadata,
    clientId,
    limit,
  });

  try {
    const pool = getSuperadminPool();
    const result = await pool.query<ConsolidatedPayloadRow>(sql, params);
    const row = result.rows[0];

    const siteRowsRaw = row?.site_rows;
    const clientRowsRaw = row?.client_rows;

    const siteRows = mapSiteRows(toObjectArray(siteRowsRaw));
    const clientRows = mapClientRows(toObjectArray(clientRowsRaw));

    return {
      site_summaries: siteRows,
      clients: clientRows,
      instrumentation: {
        query_count: 2,
        fallback_used: false,
        fallback_reason: null,
        optional_enrichment_failed: !optionalEnrichmentEnabled,
      },
    };
  } catch (error) {
    console.error("[command-center-read-model] consolidated query failed, switching to fallback", {
      message: error instanceof Error ? error.message : String(error),
    });

    const fallback = await runFallbackCoreRead({ metadata, clientId, limit });

    return {
      ...fallback,
      instrumentation: {
        ...fallback.instrumentation,
        query_count: fallback.instrumentation.query_count + 1,
      },
    };
  }
}
