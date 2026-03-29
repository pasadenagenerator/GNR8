import "server-only";

import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";

type RuntimeLifecycleState = "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export type CommandCenterMigrationRuntimeSnapshot = {
  site_id: string;
  latest_site_version_id: string | null;
  latest_state: RuntimeLifecycleState | string | null;
  has_published_version: boolean;
};

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

export async function getRuntimeMigrationSnapshotsBySiteId(
  siteIds: string[],
): Promise<Map<string, CommandCenterMigrationRuntimeSnapshot>> {
  const normalizedSiteIds = Array.from(
    new Set(
      siteIds
        .map((id) => String(id).trim())
        .filter(Boolean),
    ),
  );

  if (normalizedSiteIds.length === 0) return new Map();

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const hasRuntimeSiteVersions = await tableExists(client, "public.gnr8_runtime_site_versions");
    if (!hasRuntimeSiteVersions) return new Map();

    const [hasOwnershipSiteId, hasVersionNo, hasState, hasUpdatedAt, hasCreatedAt] = await Promise.all([
      columnExists(client, "public.gnr8_runtime_site_versions", "ownership_site_id"),
      columnExists(client, "public.gnr8_runtime_site_versions", "version_no"),
      columnExists(client, "public.gnr8_runtime_site_versions", "state"),
      columnExists(client, "public.gnr8_runtime_site_versions", "updated_at"),
      columnExists(client, "public.gnr8_runtime_site_versions", "created_at"),
    ]);

    if (!hasOwnershipSiteId || !hasVersionNo || !hasState || !hasUpdatedAt || !hasCreatedAt) return new Map();

    const rows = await client.query<{
      ownership_site_id: string;
      site_version_id: string;
      state: string;
      has_published_version: boolean;
    }>(
      `
      with ranked as (
        select
          sv.ownership_site_id::text as ownership_site_id,
          sv.id::text as site_version_id,
          sv.state::text as state,
          row_number() over (
            partition by sv.ownership_site_id
            order by sv.version_no desc, sv.updated_at desc, sv.created_at desc, sv.id::text desc
          ) as row_rank,
          max(case when sv.state = 'PUBLISHED' then 1 else 0 end) over (
            partition by sv.ownership_site_id
          ) as has_published_int
        from public.gnr8_runtime_site_versions sv
        where sv.ownership_site_id = any($1::uuid[])
      )
      select
        ownership_site_id,
        site_version_id,
        state,
        has_published_int = 1 as has_published_version
      from ranked
      where row_rank = 1
      `,
      [normalizedSiteIds],
    );

    const result = new Map<string, CommandCenterMigrationRuntimeSnapshot>();
    for (const row of rows.rows) {
      result.set(row.ownership_site_id, {
        site_id: row.ownership_site_id,
        latest_site_version_id: row.site_version_id,
        latest_state: row.state,
        has_published_version: !!row.has_published_version,
      });
    }
    return result;
  } finally {
    client.release();
  }
}
