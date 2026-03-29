import "server-only";

import type { PoolClient } from "pg";

type CacheEntry = {
  value: boolean;
  expires_at: number;
};

const SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000;
const tableExistsCache = new Map<string, CacheEntry>();
const columnExistsCache = new Map<string, CacheEntry>();

function getCachedValue(cache: Map<string, CacheEntry>, key: string): boolean | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires_at <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedValue(cache: Map<string, CacheEntry>, key: string, value: boolean): void {
  cache.set(key, {
    value,
    expires_at: Date.now() + SCHEMA_CACHE_TTL_MS,
  });
}

function parseQualifiedTableName(tableName: string): [string, string] | null {
  const [schemaName, plainTableName] = tableName.split(".");
  if (!schemaName || !plainTableName) return null;
  return [schemaName, plainTableName];
}

export async function tableExistsCached(client: PoolClient, tableName: string): Promise<boolean> {
  const key = tableName.trim();
  const cached = getCachedValue(tableExistsCache, key);
  if (cached != null) return cached;

  const res = await client.query<{ exists: boolean }>(
    `
      select to_regclass($1::text) is not null as exists
    `,
    [key],
  );
  const exists = !!res.rows[0]?.exists;
  setCachedValue(tableExistsCache, key, exists);
  return exists;
}

export async function columnExistsCached(client: PoolClient, tableName: string, columnName: string): Promise<boolean> {
  const tableKey = tableName.trim();
  const columnKey = columnName.trim();
  const key = `${tableKey}:${columnKey}`;
  const cached = getCachedValue(columnExistsCache, key);
  if (cached != null) return cached;

  const parsed = parseQualifiedTableName(tableKey);
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
    [schemaName, plainTableName, columnKey],
  );
  const exists = !!res.rows[0]?.exists;
  setCachedValue(columnExistsCache, key, exists);
  return exists;
}
