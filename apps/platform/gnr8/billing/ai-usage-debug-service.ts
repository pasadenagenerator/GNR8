import "server-only";

import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type AIUsageDebugFilters = {
  siteId?: string;
  agencyId?: string;
  clientId?: string;
  featureContext?: string;
  operationType?: string;
  limit?: number;
};

export type AIUsageAttributionClass =
  | "fully_attributed"
  | "agency_only"
  | "missing_site"
  | "missing_billing_account"
  | "zero_tokens";

export type AIUsageDebugEvent = {
  id: string;
  created_at: string;
  billing_account_id: string | null;
  agency_id: string;
  client_id: string | null;
  site_id: string | null;
  site_version_id: string | null;
  artifact_id: string | null;
  feature_context: string;
  operation_type: string;
  model_provider: string | null;
  model_name: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  trace_id: string | null;
  attribution_classification: AIUsageAttributionClass;
};

export type AIUsageDebugSummary = {
  total_events_returned: number;
  events_with_site_id: number;
  events_with_client_id: number;
  events_missing_billing_account_id: number;
  events_with_zero_total_tokens: number;
  classification_counts: Record<AIUsageAttributionClass, number>;
};

export type AIUsageDebugResult = {
  filters: {
    site_id: string | null;
    agency_id: string | null;
    client_id: string | null;
    feature_context: string | null;
    operation_type: string | null;
    limit: number;
  };
  summary: AIUsageDebugSummary;
  events: AIUsageDebugEvent[];
};

type RawAIUsageRow = {
  id: string;
  created_at: string | Date;
  billing_account_id: string | null;
  agency_id: string;
  client_id: string | null;
  site_id: string | null;
  site_version_id: string | null;
  artifact_id: string | null;
  feature_context: string;
  operation_type: string;
  model_provider: string | null;
  model_name: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: string | number;
  trace_id: string | null;
};

class AIUsageDebugError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIUsageDebugError";
  }
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string | undefined {
  if (value == null) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!UUID_RE.test(normalized)) {
    throw new AIUsageDebugError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function normalizeTextFilter(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  const normalized = Math.floor(value as number);
  if (normalized < 1) return DEFAULT_LIMIT;
  return Math.min(normalized, MAX_LIMIT);
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

function classifyAttribution(row: RawAIUsageRow): AIUsageAttributionClass {
  if (Number(row.total_tokens) === 0) return "zero_tokens";
  if (!row.billing_account_id) return "missing_billing_account";
  if (row.site_id && row.client_id && row.agency_id) return "fully_attributed";
  if (row.agency_id && !row.client_id && !row.site_id) return "agency_only";
  return "missing_site";
}

function buildSummary(events: AIUsageDebugEvent[]): AIUsageDebugSummary {
  const classificationCounts: Record<AIUsageAttributionClass, number> = {
    fully_attributed: 0,
    agency_only: 0,
    missing_site: 0,
    missing_billing_account: 0,
    zero_tokens: 0,
  };

  for (const event of events) {
    classificationCounts[event.attribution_classification] += 1;
  }

  return {
    total_events_returned: events.length,
    events_with_site_id: events.filter((event) => !!event.site_id).length,
    events_with_client_id: events.filter((event) => !!event.client_id).length,
    events_missing_billing_account_id: events.filter((event) => !event.billing_account_id).length,
    events_with_zero_total_tokens: events.filter((event) => event.total_tokens === 0).length,
    classification_counts: classificationCounts,
  };
}

export async function readAIUsageDebug(input: AIUsageDebugFilters): Promise<AIUsageDebugResult> {
  const siteId = normalizeUuid(input.siteId, "siteId");
  const agencyId = normalizeUuid(input.agencyId, "agencyId");
  const clientId = normalizeUuid(input.clientId, "clientId");
  const featureContext = normalizeTextFilter(input.featureContext);
  const operationType = normalizeTextFilter(input.operationType);
  const limit = normalizeLimit(input.limit);

  const filters = {
    site_id: siteId ?? null,
    agency_id: agencyId ?? null,
    client_id: clientId ?? null,
    feature_context: featureContext ?? null,
    operation_type: operationType ?? null,
    limit,
  };

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (siteId) {
    params.push(siteId);
    whereClauses.push(`e.site_id = $${params.length}::uuid`);
  }

  if (agencyId) {
    params.push(agencyId);
    whereClauses.push(`e.agency_id = $${params.length}::uuid`);
  }

  if (clientId) {
    params.push(clientId);
    whereClauses.push(`e.client_id = $${params.length}::uuid`);
  }

  if (featureContext) {
    params.push(featureContext);
    whereClauses.push(`e.feature_context = $${params.length}::text`);
  }

  if (operationType) {
    params.push(operationType);
    whereClauses.push(`e.operation_type = $${params.length}::text`);
  }

  const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

  params.push(limit);
  const limitPlaceholder = `$${params.length}`;

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const hasTable = await tableExists(client, "public.ai_usage_events");
    if (!hasTable) {
      throw new AIUsageDebugError("ai_usage_events table does not exist in this environment");
    }

    const query = `
      select
        e.id::text as id,
        e.created_at,
        e.billing_account_id::text as billing_account_id,
        e.agency_id::text as agency_id,
        e.client_id::text as client_id,
        e.site_id::text as site_id,
        e.site_version_id::text as site_version_id,
        e.artifact_id::text as artifact_id,
        e.feature_context,
        e.operation_type,
        e.model_provider,
        e.model_name,
        e.prompt_tokens,
        e.completion_tokens,
        e.total_tokens,
        e.estimated_cost,
        e.trace_id
      from public.ai_usage_events e
      ${whereSql}
      order by e.created_at desc, e.id desc
      limit ${limitPlaceholder}::int
    `;

    const res = await client.query<RawAIUsageRow>(query, params);
    const events: AIUsageDebugEvent[] = res.rows.map((row) => ({
      ...row,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
      estimated_cost: typeof row.estimated_cost === "number" ? row.estimated_cost : Number(row.estimated_cost),
      attribution_classification: classifyAttribution(row),
    }));

    return {
      filters,
      summary: buildSummary(events),
      events,
    };
  } finally {
    client.release();
  }
}
