import {
  createGovernanceAuthorizationInsertRows,
  mapGovernanceAuthorizationArtifactRow,
  type RuntimeProviderGovernanceAuthorizationArtifactRecord,
  type RuntimeProviderGovernanceAuthorizationArtifactRow,
} from "@/gnr8/runtime/providers/runtime-provider-governance-authorization-store";
import { getSuperadminPool } from "@/src/superadmin/db";

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export async function createProviderGovernanceAuthorizationArtifacts(
  input: readonly RuntimeProviderGovernanceAuthorizationArtifactRecord[],
): Promise<RuntimeProviderGovernanceAuthorizationArtifactRecord[]> {
  const rows = createGovernanceAuthorizationInsertRows(input);
  if (rows.length === 0) return [];

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderGovernanceAuthorizationArtifactRow>(
    `
    insert into public.gnr8_runtime_provider_governance_authorizations (
      authorization_id,
      handoff_id,
      correlation_key,
      authorization_status,
      authorization_reason,
      intent_only,
      execution_blocked,
      diagnostics,
      created_at
    )
    select
      t.authorization_id::text,
      t.handoff_id::text,
      t.correlation_key::text,
      t.authorization_status::text,
      t.authorization_reason::text,
      t.intent_only::boolean,
      t.execution_blocked::boolean,
      t.diagnostics::jsonb,
      t.created_at::timestamptz
    from unnest(
      $1::text[],
      $2::text[],
      $3::text[],
      $4::text[],
      $5::text[],
      $6::boolean[],
      $7::boolean[],
      $8::jsonb[],
      $9::timestamptz[]
    ) as t(
      authorization_id,
      handoff_id,
      correlation_key,
      authorization_status,
      authorization_reason,
      intent_only,
      execution_blocked,
      diagnostics,
      created_at
    )
    on conflict do nothing
    returning
      authorization_id::text as authorization_id,
      handoff_id::text as handoff_id,
      correlation_key::text as correlation_key,
      authorization_status::text as authorization_status,
      authorization_reason::text as authorization_reason,
      intent_only as intent_only,
      execution_blocked as execution_blocked,
      diagnostics as diagnostics,
      created_at::text as created_at
    `,
    [
      rows.map((row) => row.authorization_id),
      rows.map((row) => row.handoff_id),
      rows.map((row) => row.correlation_key),
      rows.map((row) => row.authorization_status),
      rows.map((row) => row.authorization_reason),
      rows.map((row) => row.intent_only),
      rows.map((row) => row.execution_blocked),
      rows.map((row) => JSON.stringify(row.diagnostics)),
      rows.map((row) => row.created_at),
    ],
  );

  return res.rows.map(mapGovernanceAuthorizationArtifactRow);
}

export async function getProviderGovernanceAuthorizationsByHandoffId(
  handoffId: string,
): Promise<{ authorizations: RuntimeProviderGovernanceAuthorizationArtifactRecord[]; diagnostics: string[] }> {
  const normalizedHandoffId = sanitizeToken(handoffId);
  if (!normalizedHandoffId) {
    return { authorizations: [], diagnostics: ["GOVERNANCE_AUTHORIZATION_FAILED_CLOSED:MISSING_HANDOFF_ID"] };
  }

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderGovernanceAuthorizationArtifactRow>(
    `
    select
      authorization_id::text as authorization_id,
      handoff_id::text as handoff_id,
      correlation_key::text as correlation_key,
      authorization_status::text as authorization_status,
      authorization_reason::text as authorization_reason,
      intent_only as intent_only,
      execution_blocked as execution_blocked,
      diagnostics as diagnostics,
      created_at::text as created_at
    from public.gnr8_runtime_provider_governance_authorizations
    where handoff_id = $1::text
    order by created_at asc, authorization_id asc
    `,
    [normalizedHandoffId],
  );

  return {
    authorizations: res.rows.map(mapGovernanceAuthorizationArtifactRow),
    diagnostics: uniqueSorted(["GOVERNANCE_AUTHORIZATION_READ"]),
  };
}
