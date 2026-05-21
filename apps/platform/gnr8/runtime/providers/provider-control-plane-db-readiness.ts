import type { PoolClient } from "pg";

import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";

type QueryableClient = Pick<PoolClient, "query">;

export type ProviderControlPlaneDbReadinessStatus = "ready" | "missing_tables" | "blocked";

export type ProviderControlPlaneTableReport = {
  tableName: string;
  exists: boolean;
  missingColumns: string[];
  presentColumns: string[];
};

export type ProviderControlPlaneDbReadinessReport = {
  status: ProviderControlPlaneDbReadinessStatus;
  tables: ProviderControlPlaneTableReport[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

type TableDefinition = {
  schema: string;
  table: string;
  requiredColumns: readonly string[];
};

type TableSnapshot = {
  tableName: string;
  exists: boolean;
  columns: string[];
};

const PROVIDER_CONTROL_PLANE_TABLE_DEFINITIONS: readonly TableDefinition[] = [
  {
    schema: "public",
    table: "gnr8_runtime_provider_jobs",
    requiredColumns: [
      "id",
      "site_id",
      "site_version_id",
      "provider_id",
      "environment",
      "operation_kind",
      "status",
      "intent_payload",
      "dry_run_payload",
      "result_payload",
      "error_payload",
      "correlation_key",
      "created_at",
      "updated_at",
    ],
  },
  {
    schema: "public",
    table: "gnr8_runtime_provider_operation_approvals",
    requiredColumns: [
      "id",
      "artifact_id",
      "site_id",
      "site_version_id",
      "provider_id",
      "environment",
      "capability",
      "operation_kind",
      "approval_status",
      "risk_level",
      "required_approvals",
      "reviewer_checklist",
      "warnings",
      "blockers",
      "correlation_key",
      "created_at",
      "updated_at",
    ],
  },
  {
    schema: "public",
    table: "gnr8_runtime_provider_execution_handoffs",
    requiredColumns: [
      "id",
      "handoff_id",
      "artifact_id",
      "site_id",
      "site_version_id",
      "provider_id",
      "environment",
      "capability",
      "operation_kind",
      "approval_status",
      "risk_level",
      "handoff_status",
      "planned_job_ids",
      "warnings",
      "blockers",
      "correlation_key",
      "created_at",
      "updated_at",
    ],
  },
  {
    schema: "public",
    table: "gnr8_agency_provider_settings",
    requiredColumns: [
      "id",
      "agency_id",
      "provider_id",
      "environment",
      "credential_reference",
      "enabled",
      "capabilities",
      "created_at",
      "updated_at",
    ],
  },
  {
    schema: "public",
    table: "gnr8_provider_credential_references",
    requiredColumns: [
      "id",
      "agency_id",
      "provider_id",
      "reference_key",
      "environment",
      "credential_names",
      "enabled",
      "created_at",
      "updated_at",
    ],
  },
].sort((a, b) => `${a.schema}.${a.table}`.localeCompare(`${b.schema}.${b.table}`));

function normalizeColumnList(columns: readonly string[]): string[] {
  return [...new Set(columns.map((column) => String(column).trim()).filter((column) => column.length > 0))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function fullTableName(input: { schema: string; table: string }): string {
  return `${input.schema}.${input.table}`;
}

function definitionByTableName(): Map<string, TableDefinition> {
  return new Map(PROVIDER_CONTROL_PLANE_TABLE_DEFINITIONS.map((definition) => [fullTableName(definition), definition]));
}

export function createProviderControlPlaneDbReadinessReport(input: {
  hasDatabaseUrl: boolean;
  tableSnapshots: readonly TableSnapshot[];
}): ProviderControlPlaneDbReadinessReport {
  const definitionMap = definitionByTableName();
  const inputMap = new Map(input.tableSnapshots.map((snapshot) => [snapshot.tableName, snapshot]));

  const tables: ProviderControlPlaneTableReport[] = PROVIDER_CONTROL_PLANE_TABLE_DEFINITIONS.map((definition) => {
    const tableName = fullTableName(definition);
    const snapshot = inputMap.get(tableName);
    const exists = snapshot?.exists === true;
    const presentColumns = normalizeColumnList(snapshot?.columns ?? []);
    const requiredColumns = normalizeColumnList(definition.requiredColumns);
    const presentSet = new Set(presentColumns);
    const missingColumns = requiredColumns.filter((column) => !presentSet.has(column));

    return {
      tableName,
      exists,
      missingColumns,
      presentColumns,
    };
  });

  const blockers: string[] = [];
  if (!input.hasDatabaseUrl) blockers.push("missing_database_url");

  for (const table of tables) {
    if (table.exists && table.missingColumns.length > 0) {
      blockers.push(`missing_required_columns:${table.tableName}:${table.missingColumns.join(",")}`);
    }
  }

  const warnings: string[] = [];
  for (const table of tables) {
    if (!table.exists) warnings.push(`missing_table:${table.tableName}`);
  }

  const status: ProviderControlPlaneDbReadinessStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "missing_tables" : "ready";

  const correlationKey = createRuntimeCorrelationKey({
    status,
    hasDatabaseUrl: input.hasDatabaseUrl ? "true" : "false",
    tables: tables
      .map((table) => `${table.tableName}|${table.exists ? "1" : "0"}|${table.presentColumns.join(".")}|${table.missingColumns.join(".")}`)
      .join(";"),
    warnings: warnings.join(","),
    blockers: blockers.join(","),
  });

  return {
    status,
    tables,
    warnings,
    blockers,
    correlationKey,
  };
}

async function loadProviderControlPlaneTableSnapshots(client: QueryableClient): Promise<TableSnapshot[]> {
  const definitions = PROVIDER_CONTROL_PLANE_TABLE_DEFINITIONS;

  const [tableRows, columnRows] = await Promise.all([
    client.query<{ table_schema: string; table_name: string }>(
      `
      select t.table_schema::text as table_schema, t.table_name::text as table_name
      from information_schema.tables t
      where t.table_type = 'BASE TABLE'
        and (
          (t.table_schema = $1::text and t.table_name = $2::text)
          or (t.table_schema = $3::text and t.table_name = $4::text)
          or (t.table_schema = $5::text and t.table_name = $6::text)
          or (t.table_schema = $7::text and t.table_name = $8::text)
          or (t.table_schema = $9::text and t.table_name = $10::text)
        )
      `,
      [
        definitions[0]!.schema,
        definitions[0]!.table,
        definitions[1]!.schema,
        definitions[1]!.table,
        definitions[2]!.schema,
        definitions[2]!.table,
        definitions[3]!.schema,
        definitions[3]!.table,
        definitions[4]!.schema,
        definitions[4]!.table,
      ],
    ),
    client.query<{ table_schema: string; table_name: string; column_name: string }>(
      `
      select c.table_schema::text as table_schema, c.table_name::text as table_name, c.column_name::text as column_name
      from information_schema.columns c
      where
        (c.table_schema = $1::text and c.table_name = $2::text)
        or (c.table_schema = $3::text and c.table_name = $4::text)
        or (c.table_schema = $5::text and c.table_name = $6::text)
        or (c.table_schema = $7::text and c.table_name = $8::text)
        or (c.table_schema = $9::text and c.table_name = $10::text)
      `,
      [
        definitions[0]!.schema,
        definitions[0]!.table,
        definitions[1]!.schema,
        definitions[1]!.table,
        definitions[2]!.schema,
        definitions[2]!.table,
        definitions[3]!.schema,
        definitions[3]!.table,
        definitions[4]!.schema,
        definitions[4]!.table,
      ],
    ),
  ]);

  const tableExists = new Set(tableRows.rows.map((row) => fullTableName({ schema: row.table_schema, table: row.table_name })));
  const columnsByTable = new Map<string, string[]>();

  for (const row of columnRows.rows) {
    const tableName = fullTableName({ schema: row.table_schema, table: row.table_name });
    const existing = columnsByTable.get(tableName) ?? [];
    existing.push(row.column_name);
    columnsByTable.set(tableName, existing);
  }

  return definitions.map((definition) => {
    const tableName = fullTableName(definition);
    return {
      tableName,
      exists: tableExists.has(tableName),
      columns: normalizeColumnList(columnsByTable.get(tableName) ?? []),
    };
  });
}

export async function validateProviderControlPlaneDbReadiness(): Promise<ProviderControlPlaneDbReadinessReport> {
  const hasDatabaseUrl = String(process.env.DATABASE_URL ?? "").trim().length > 0;
  if (!hasDatabaseUrl) {
    return createProviderControlPlaneDbReadinessReport({
      hasDatabaseUrl: false,
      tableSnapshots: [],
    });
  }

  const { getSuperadminPool } = await import("@/src/superadmin/db");
  const pool = getSuperadminPool();
  const snapshots = await loadProviderControlPlaneTableSnapshots(pool);
  return createProviderControlPlaneDbReadinessReport({
    hasDatabaseUrl: true,
    tableSnapshots: snapshots,
  });
}
