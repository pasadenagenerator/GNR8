import type { PoolClient } from 'pg'

export type MembershipOrgColumnSupport = {
  hasOrganizationId: boolean
  hasOrgId: boolean
}

export function normalizeMembershipOrgColumnSupport(input: {
  columnNames: readonly string[]
}): MembershipOrgColumnSupport {
  const normalized = new Set(
    input.columnNames
      .map((columnName) => String(columnName ?? '').trim().toLowerCase())
      .filter((columnName) => columnName.length > 0),
  )
  return {
    hasOrganizationId: normalized.has('organization_id'),
    hasOrgId: normalized.has('org_id'),
  }
}

export async function detectMembershipOrgColumnSupport(
  client: Pick<PoolClient, 'query'>,
): Promise<MembershipOrgColumnSupport> {
  const membershipColumns = await client.query<{ column_name: string }>(
    `
      select column_name::text as column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'memberships'
        and column_name in ('organization_id', 'org_id')
    `,
  )

  return normalizeMembershipOrgColumnSupport({
    columnNames: membershipColumns.rows.map((row) => String(row.column_name ?? '')),
  })
}

export function resolveMembershipOrgColumnExpression(input: {
  columns: MembershipOrgColumnSupport
  tableAlias?: string
  missingColumnMessage?: string
}): string {
  const tableAlias = String(input.tableAlias ?? 'm').trim() || 'm'
  const columns = input.columns
  if (columns.hasOrganizationId && columns.hasOrgId) return `coalesce(${tableAlias}.organization_id, ${tableAlias}.org_id)`
  if (columns.hasOrganizationId) return `${tableAlias}.organization_id`
  if (columns.hasOrgId) return `${tableAlias}.org_id`
  throw new Error(input.missingColumnMessage ?? 'memberships schema mismatch: expected organization_id and/or org_id')
}

export function resolveMembershipCanonicalOrgColumn(input: {
  columns: MembershipOrgColumnSupport
  missingColumnMessage?: string
}): 'organization_id' | 'org_id' {
  const columns = input.columns
  if (columns.hasOrganizationId) return 'organization_id'
  if (columns.hasOrgId) return 'org_id'
  throw new Error(input.missingColumnMessage ?? 'memberships schema mismatch: expected organization_id and/or org_id')
}

export function normalizeMembershipOrganizationId(row: {
  organization_id?: string | null
  org_id?: string | null
}): string | null {
  const organizationId = String(row.organization_id ?? '').trim()
  if (organizationId) return organizationId
  const legacyOrganizationId = String(row.org_id ?? '').trim()
  if (legacyOrganizationId) return legacyOrganizationId
  return null
}

export function buildMembershipSelectAttempts(input: {
  baseColumns: readonly string[]
  includeOwnerSetupCompleted?: boolean
}): Array<{ select: string; inferOwnerSetupCompletedAsFalse: boolean }> {
  const baseColumns = input.baseColumns
    .map((columnName) => String(columnName ?? '').trim())
    .filter((columnName) => columnName.length > 0)

  const includeOwnerSetupCompleted = input.includeOwnerSetupCompleted === true
  const optionalColumns = includeOwnerSetupCompleted ? ['owner_setup_completed'] : []

  const attempts = [
    [...baseColumns, 'organization_id', 'org_id', ...optionalColumns],
    [...baseColumns, 'organization_id', ...optionalColumns],
    [...baseColumns, 'org_id', ...optionalColumns],
    includeOwnerSetupCompleted ? [...baseColumns, 'organization_id', 'org_id'] : [],
    includeOwnerSetupCompleted ? [...baseColumns, 'organization_id'] : [],
    includeOwnerSetupCompleted ? [...baseColumns, 'org_id'] : [],
  ]
    .filter((columns) => columns.length > 0)
    .map((columns) => {
      const deduped = Array.from(new Set(columns))
      const hasOwnerSetup = deduped.includes('owner_setup_completed')
      return {
        select: deduped.join(','),
        inferOwnerSetupCompletedAsFalse: includeOwnerSetupCompleted && !hasOwnerSetup,
      }
    })

  const dedupedAttempts: Array<{ select: string; inferOwnerSetupCompletedAsFalse: boolean }> = []
  const seen = new Set<string>()
  for (const attempt of attempts) {
    if (seen.has(attempt.select)) continue
    seen.add(attempt.select)
    dedupedAttempts.push(attempt)
  }

  return dedupedAttempts
}
