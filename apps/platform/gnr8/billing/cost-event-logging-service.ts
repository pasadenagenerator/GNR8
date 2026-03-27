import "server-only";

import type { PoolClient } from "pg";

import { resolveAgencyBillingAccount } from "@/gnr8/billing/billing-account-service";
import { resolveBillingContextForSite } from "@/gnr8/billing/billing-resolution-service";
import type {
  AIUsageEventInput,
  CostCenterHierarchy,
  LoggedCostEventResult,
  MigrationCostEventInput,
  ResolvedBillingAttribution,
  RuntimeUsageEventInput,
} from "@/gnr8/billing/cost-event-types";
import { getSuperadminPool } from "@/src/superadmin/db";

class CostEventLoggingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostEventLoggingError";
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value: string | null | undefined, fieldName: string): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (!UUID_RE.test(normalized)) {
    throw new CostEventLoggingError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function requireNonEmpty(value: string | null | undefined, fieldName: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new CostEventLoggingError(`${fieldName} is required`);
  }
  return normalized;
}

function toNonNegativeInteger(value: number | undefined, fallback = 0): number {
  if (value == null) return fallback;
  if (!Number.isFinite(value) || value < 0) {
    throw new CostEventLoggingError("numeric usage counters must be finite non-negative numbers");
  }
  return Math.floor(value);
}

function toNonNegativeNumber(value: number | undefined, fallback = 0): number {
  if (value == null) return fallback;
  if (!Number.isFinite(value) || value < 0) {
    throw new CostEventLoggingError("estimated cost and compute units must be finite non-negative numbers");
  }
  return value;
}

function toIsoDate(value: string | Date, fieldName: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CostEventLoggingError(`${fieldName} must be a valid date`);
  }
  return date.toISOString();
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

async function requireTable(client: PoolClient, tableName: string, functionName: string): Promise<void> {
  const exists = await tableExists(client, tableName);
  if (!exists) {
    throw new CostEventLoggingError(`${functionName} cannot run because ${tableName} does not exist in this environment`);
  }
}

async function resolveAgencyCostCenterId(client: PoolClient, agencyId: string): Promise<string | null> {
  if (!(await tableExists(client, "public.cost_centers"))) return null;
  const res = await client.query<{ id: string }>(
    `
    select cc.id::text as id
    from public.cost_centers cc
    where cc.type = 'agency'
      and cc.entity_id = $1::uuid
    order by cc.created_at asc, cc.id asc
    limit 1
    `,
    [agencyId],
  );
  return res.rows[0]?.id ?? null;
}

async function resolveClientCostCenterId(client: PoolClient, clientId: string | null): Promise<string | null> {
  if (!clientId) return null;
  if (!(await tableExists(client, "public.cost_centers"))) return null;
  const res = await client.query<{ id: string }>(
    `
    select cc.id::text as id
    from public.cost_centers cc
    where cc.type = 'client'
      and cc.entity_id = $1::uuid
    order by cc.created_at asc, cc.id asc
    limit 1
    `,
    [clientId],
  );
  return res.rows[0]?.id ?? null;
}

async function ensureAgencyExists(client: PoolClient, agencyId: string): Promise<void> {
  await requireTable(client, "public.agencies", "cost event logging");
  const res = await client.query<{ exists: boolean }>(
    `
    select exists(
      select 1
      from public.agencies a
      where a.id = $1::uuid
    ) as exists
    `,
    [agencyId],
  );
  if (!res.rows[0]?.exists) {
    throw new CostEventLoggingError("agencyId does not map to an existing agency");
  }
}

async function resolveAgencyAttribution(
  client: PoolClient,
  agencyIdInput: string,
  clientIdInput: string | null,
): Promise<ResolvedBillingAttribution> {
  const agencyId = normalizeUuid(agencyIdInput, "agencyId");
  if (!agencyId) throw new CostEventLoggingError("agencyId is required");
  const clientId = normalizeUuid(clientIdInput, "clientId");

  await ensureAgencyExists(client, agencyId);

  const [billingAccount, agencyCostCenterId, clientCostCenterId] = await Promise.all([
    resolveAgencyBillingAccount(agencyId),
    resolveAgencyCostCenterId(client, agencyId),
    resolveClientCostCenterId(client, clientId),
  ]);

  return {
    billingAccountId: billingAccount?.id ?? null,
    agencyId,
    clientId,
    siteId: null,
    costCenterIds: {
      agencyCostCenterId,
      clientCostCenterId,
      siteCostCenterId: null,
    },
  };
}

async function resolveSiteAttribution(siteIdInput: string): Promise<ResolvedBillingAttribution> {
  const siteId = normalizeUuid(siteIdInput, "siteId");
  if (!siteId) throw new CostEventLoggingError("siteId is required");

  const context = await resolveBillingContextForSite(siteId);
  if (!context) {
    throw new CostEventLoggingError("siteId does not resolve to ownership-aware billing context");
  }

  return {
    billingAccountId: context.billingAccountId,
    agencyId: context.agencyId,
    clientId: context.clientId,
    siteId: context.siteId,
    costCenterIds: {
      agencyCostCenterId: context.costCenterIds.agencyCostCenterId,
      clientCostCenterId: context.costCenterIds.clientCostCenterId,
      siteCostCenterId: context.costCenterIds.siteCostCenterId,
    },
  };
}

type InsertedEventRow = {
  id: string;
  created_at: string;
};

function cloneCostCenters(costCenters: CostCenterHierarchy): CostCenterHierarchy {
  return {
    agencyCostCenterId: costCenters.agencyCostCenterId,
    clientCostCenterId: costCenters.clientCostCenterId,
    siteCostCenterId: costCenters.siteCostCenterId,
  };
}

export async function logAIUsageEvent(input: AIUsageEventInput): Promise<LoggedCostEventResult> {
  const operationType = requireNonEmpty(input.operationType, "operationType");
  const featureContext = requireNonEmpty(input.featureContext, "featureContext");
  const siteId = normalizeUuid(input.siteId, "siteId");
  const agencyId = normalizeUuid(input.agencyId, "agencyId");
  const clientId = normalizeUuid(input.clientId, "clientId");
  const siteVersionId = normalizeUuid(input.siteVersionId, "siteVersionId");
  const artifactId = normalizeUuid(input.artifactId, "artifactId");

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    await requireTable(client, "public.ai_usage_events", "logAIUsageEvent");

    const attribution = siteId
      ? await resolveSiteAttribution(siteId)
      : await resolveAgencyAttribution(client, requireNonEmpty(agencyId, "agencyId"), clientId);

    if (agencyId && attribution.agencyId !== agencyId) {
      throw new CostEventLoggingError("agencyId does not match site ownership");
    }

    const promptTokens = toNonNegativeInteger(input.promptTokens, 0);
    const completionTokens = toNonNegativeInteger(input.completionTokens, 0);
    const totalTokens = toNonNegativeInteger(input.totalTokens, promptTokens + completionTokens);
    const estimatedCost = toNonNegativeNumber(input.estimatedCost, 0);

    const insertRes = await client.query<InsertedEventRow>(
      `
      insert into public.ai_usage_events (
        billing_account_id,
        agency_id,
        client_id,
        site_id,
        site_version_id,
        artifact_id,
        operation_type,
        feature_context,
        model_provider,
        model_name,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        estimated_cost,
        trace_id
      )
      values (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6::uuid,
        $7::text,
        $8::text,
        $9::text,
        $10::text,
        $11::integer,
        $12::integer,
        $13::integer,
        $14::numeric(12,6),
        $15::text
      )
      returning id::text as id, created_at::text as created_at
      `,
      [
        attribution.billingAccountId,
        attribution.agencyId,
        attribution.clientId,
        attribution.siteId,
        siteVersionId,
        artifactId,
        operationType,
        featureContext,
        input.modelProvider?.trim() || null,
        input.modelName?.trim() || null,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        input.traceId?.trim() || null,
      ],
    );

    const row = insertRes.rows[0];
    if (!row) throw new CostEventLoggingError("failed to persist AI usage event");

    return {
      id: row.id,
      createdAt: row.created_at,
      attribution: {
        ...attribution,
        costCenterIds: cloneCostCenters(attribution.costCenterIds),
      },
    };
  } finally {
    client.release();
  }
}

export async function logRuntimeUsageEvent(input: RuntimeUsageEventInput): Promise<LoggedCostEventResult> {
  const siteId = requireNonEmpty(input.siteId, "siteId");
  const periodStart = toIsoDate(input.periodStart, "periodStart");
  const periodEnd = toIsoDate(input.periodEnd, "periodEnd");
  if (new Date(periodEnd).getTime() < new Date(periodStart).getTime()) {
    throw new CostEventLoggingError("periodEnd must be greater than or equal to periodStart");
  }

  const artifactId = normalizeUuid(input.artifactId, "artifactId");
  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    await requireTable(client, "public.runtime_usage_events", "logRuntimeUsageEvent");

    const attribution = await resolveSiteAttribution(siteId);
    const requestCount = toNonNegativeInteger(input.requestCount, 0);
    const bandwidthBytes = toNonNegativeInteger(input.bandwidthBytes, 0);
    const computeMs = toNonNegativeInteger(input.computeMs, 0);
    const estimatedCost = toNonNegativeNumber(input.estimatedCost, 0);

    const insertRes = await client.query<InsertedEventRow>(
      `
      insert into public.runtime_usage_events (
        billing_account_id,
        agency_id,
        client_id,
        site_id,
        artifact_id,
        request_count,
        bandwidth_bytes,
        compute_ms,
        estimated_cost,
        period_start,
        period_end
      )
      values (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6::integer,
        $7::bigint,
        $8::bigint,
        $9::numeric(12,6),
        $10::timestamptz,
        $11::timestamptz
      )
      returning id::text as id, created_at::text as created_at
      `,
      [
        attribution.billingAccountId,
        attribution.agencyId,
        attribution.clientId,
        attribution.siteId,
        artifactId,
        requestCount,
        bandwidthBytes,
        computeMs,
        estimatedCost,
        periodStart,
        periodEnd,
      ],
    );

    const row = insertRes.rows[0];
    if (!row) throw new CostEventLoggingError("failed to persist runtime usage event");

    return {
      id: row.id,
      createdAt: row.created_at,
      attribution: {
        ...attribution,
        costCenterIds: cloneCostCenters(attribution.costCenterIds),
      },
    };
  } finally {
    client.release();
  }
}

export async function logMigrationCostEvent(input: MigrationCostEventInput): Promise<LoggedCostEventResult> {
  const costType = requireNonEmpty(input.costType, "costType");
  const siteId = normalizeUuid(input.siteId, "siteId");
  const agencyId = normalizeUuid(input.agencyId, "agencyId");
  if (!agencyId) throw new CostEventLoggingError("agencyId is required");

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    await requireTable(client, "public.migration_cost_events", "logMigrationCostEvent");

    const attribution = siteId
      ? await resolveSiteAttribution(siteId)
      : await resolveAgencyAttribution(client, agencyId, null);

    if (attribution.agencyId !== agencyId) {
      throw new CostEventLoggingError("agencyId does not match resolved ownership");
    }

    const computeUnits = toNonNegativeNumber(input.computeUnits, 0);
    const estimatedCost = toNonNegativeNumber(input.estimatedCost, 0);

    const insertRes = await client.query<InsertedEventRow>(
      `
      insert into public.migration_cost_events (
        billing_account_id,
        agency_id,
        site_id,
        migration_job_id,
        cost_type,
        compute_units,
        estimated_cost
      )
      values (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::text,
        $5::text,
        $6::numeric(12,4),
        $7::numeric(12,6)
      )
      returning id::text as id, created_at::text as created_at
      `,
      [
        attribution.billingAccountId,
        attribution.agencyId,
        attribution.siteId,
        input.migrationJobId?.trim() || null,
        costType,
        computeUnits,
        estimatedCost,
      ],
    );

    const row = insertRes.rows[0];
    if (!row) throw new CostEventLoggingError("failed to persist migration cost event");

    return {
      id: row.id,
      createdAt: row.created_at,
      attribution: {
        ...attribution,
        costCenterIds: cloneCostCenters(attribution.costCenterIds),
      },
    };
  } finally {
    client.release();
  }
}
