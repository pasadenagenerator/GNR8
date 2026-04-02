import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PoolClient } from 'pg'

import {
  detectMembershipOrgColumnSupport,
  resolveMembershipOrgColumnExpression,
} from '@/src/auth/membership-org-column-compat'
import { getSuperadminPool } from '@/src/superadmin/db'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type OrganizationType = 'agency' | 'client' | 'internal'

type AgencyDeleteCounters = {
  ai_usage_events_deleted: number
  runtime_usage_events_deleted: number
  migration_cost_events_deleted: number
  migration_jobs_deleted: number
  runtime_sites_deleted: number
  pages_deleted: number
  sites_deleted: number
  memberships_deleted: number
  organizations_deleted: number
  billing_accounts_deleted: number
  cost_centers_deleted: number
  agencies_deleted: number
}

export type DeprovisionAgencyResult = {
  agencyId: string
  agencySlug: string
  organizationIds: string[]
  siteIds: string[]
  runtimeSiteIds: string[]
  deletedCounts: AgencyDeleteCounters
  authUserCleanup: {
    candidateUserIds: string[]
    attemptedDeleteUserIds: string[]
    deletedUserIds: string[]
    skippedUserIds: string[]
    failed: Array<{ userId: string; error: string }>
  }
}

export class AgencyDeprovisioningError extends Error {
  readonly code:
    | 'INVALID_INPUT'
    | 'UNSUPPORTED_HOME_AGENCY_DELETE'
    | 'AGENCY_NOT_FOUND'
    | 'DEPENDENCY_BLOCK'
    | 'AUTH_CLEANUP_FAILED'
    | 'SERVICE_ROLE_UNAVAILABLE'

  constructor(code: AgencyDeprovisioningError['code'], message: string) {
    super(message)
    this.name = 'AgencyDeprovisioningError'
    this.code = code
  }
}

type QueryResultRowCount = { rowCount: number }

type AgencyActorMode = 'membership' | 'admin_view'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function parseEmailAllowlist(value: string | undefined): Set<string> {
  return new Set(
    String(value ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )
}

function assertUuid(value: unknown, fieldName: string): string {
  const normalized = normalizeText(value)
  if (!normalized || !isUuid(normalized)) {
    throw new AgencyDeprovisioningError('INVALID_INPUT', `${fieldName} must be a valid UUID`)
  }
  return normalized
}

function quoteIdentifier(input: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input)) {
    throw new AgencyDeprovisioningError('INVALID_INPUT', `invalid SQL identifier: ${input}`)
  }
  return `"${input}"`
}

async function tableExists(client: PoolClient, tableName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = $1::text
      ) as exists
    `,
    [tableName],
  )
  return result.rows[0]?.exists === true
}

async function deleteByAgencyId(
  client: PoolClient,
  tableName: string,
  agencyId: string,
): Promise<number> {
  if (!(await tableExists(client, tableName))) return 0
  const query = `delete from public.${quoteIdentifier(tableName)} where agency_id = $1::uuid`
  const result = await client.query<QueryResultRowCount>(query, [agencyId])
  return result.rowCount ?? 0
}

async function deleteByEntityIds(
  client: PoolClient,
  tableName: string,
  whereSql: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0
  if (!(await tableExists(client, tableName))) return 0
  const query = `delete from public.${quoteIdentifier(tableName)} where ${whereSql}`
  const result = await client.query<QueryResultRowCount>(query, [ids])
  return result.rowCount ?? 0
}

async function listAgencyScopeRows(client: PoolClient, agencyId: string): Promise<{
  agencySlug: string
  organizationIds: string[]
  siteIds: string[]
  runtimeSiteIds: string[]
  candidateUserIds: string[]
  authDeleteEligibleUserIds: string[]
}> {
  const agencyRow = await client.query<{ slug: string; is_home_agency: boolean }>(
    `
      select slug::text as slug, is_home_agency
      from public.agencies
      where id = $1::uuid
      limit 1
      for update
    `,
    [agencyId],
  )

  const agency = agencyRow.rows[0]
  if (!agency) {
    throw new AgencyDeprovisioningError('AGENCY_NOT_FOUND', 'Agency does not exist in current scope')
  }

  if (agency.is_home_agency) {
    throw new AgencyDeprovisioningError(
      'UNSUPPORTED_HOME_AGENCY_DELETE',
      'Home agency deletion is blocked for safety',
    )
  }

  const organizations = await client.query<{ id: string; organization_type: OrganizationType | null }>(
    `
      select id::text as id, organization_type::text as organization_type
      from public.organizations
      where agency_id = $1::uuid
      order by organization_type asc, id asc
    `,
    [agencyId],
  )

  const organizationIds = organizations.rows
    .map((row) => normalizeText(row.id))
    .filter((id) => id.length > 0)

  const sites = await client.query<{ id: string }>(
    `
      select id::text as id
      from public.sites
      where agency_id = $1::uuid
      order by id asc
    `,
    [agencyId],
  )

  const siteIds = sites.rows
    .map((row) => normalizeText(row.id))
    .filter((id) => id.length > 0)

  let runtimeSiteIds: string[] = []
  if (siteIds.length > 0 && (await tableExists(client, 'gnr8_runtime_site_versions'))) {
    const runtimeSites = await client.query<{ site_id: string | null }>(
      `
        select distinct site_id::text as site_id
        from public.gnr8_runtime_site_versions
        where ownership_site_id = any($1::uuid[])
          and site_id is not null
      `,
      [siteIds],
    )

    runtimeSiteIds = runtimeSites.rows
      .map((row) => normalizeText(row.site_id))
      .filter((siteId) => siteId.length > 0)
  }

  const membershipColumns = await detectMembershipOrgColumnSupport(client)
  let orgExpr: string
  try {
    orgExpr = resolveMembershipOrgColumnExpression({
      columns: membershipColumns,
      tableAlias: 'm',
      missingColumnMessage: 'memberships schema mismatch: expected organization_id and/or org_id',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'memberships schema mismatch'
    throw new AgencyDeprovisioningError('DEPENDENCY_BLOCK', message)
  }

  let candidateUserIds: string[] = []
  let authDeleteEligibleUserIds: string[] = []

  if (organizationIds.length > 0) {
    const candidateRows = await client.query<{ user_id: string }>(
      `
        select distinct m.user_id::text as user_id
        from public.memberships m
        where ${orgExpr} = any($1::uuid[])
          and m.user_id is not null
      `,
      [organizationIds],
    )

    candidateUserIds = candidateRows.rows
      .map((row) => normalizeText(row.user_id))
      .filter((id) => id.length > 0)

    if (candidateUserIds.length > 0) {
      const eligibleRows = await client.query<{ user_id: string }>(
        `
          select distinct m.user_id::text as user_id
          from public.memberships m
          join public.organizations o
            on o.id = ${orgExpr}
          where m.user_id = any($1::uuid[])
          group by m.user_id
          having bool_and(o.agency_id = $2::uuid)
        `,
        [candidateUserIds, agencyId],
      )

      authDeleteEligibleUserIds = eligibleRows.rows
        .map((row) => normalizeText(row.user_id))
        .filter((id) => id.length > 0)
    }
  }

  return {
    agencySlug: normalizeText(agency.slug),
    organizationIds,
    siteIds,
    runtimeSiteIds,
    candidateUserIds,
    authDeleteEligibleUserIds,
  }
}

async function countRowsByAgencyId(client: PoolClient, tableName: string, agencyId: string): Promise<number> {
  if (!(await tableExists(client, tableName))) return 0
  const query = `select count(*)::text as count from public.${quoteIdentifier(tableName)} where agency_id = $1::uuid`
  const result = await client.query<{ count: string }>(query, [agencyId])
  const count = Number(result.rows[0]?.count ?? '0')
  return Number.isFinite(count) ? count : 0
}

async function assertNoDependencyBlockers(client: PoolClient, agencyId: string): Promise<void> {
  const checks: Array<{ table: string; count: number }> = []
  const tablesWithAgencyId = [
    'organizations',
    'sites',
    'billing_accounts',
    'migration_jobs',
    'ai_usage_events',
    'runtime_usage_events',
    'migration_cost_events',
  ]

  for (const tableName of tablesWithAgencyId) {
    const count = await countRowsByAgencyId(client, tableName, agencyId)
    if (count > 0) {
      checks.push({ table: tableName, count })
    }
  }

  if (await tableExists(client, 'cost_centers')) {
    const costCenterResult = await client.query<{ count: string }>(
      `select count(*)::text as count from public.cost_centers where type = 'agency' and entity_id = $1::uuid`,
      [agencyId],
    )
    const costCenterCount = Number(costCenterResult.rows[0]?.count ?? '0')
    if (Number.isFinite(costCenterCount) && costCenterCount > 0) {
      checks.push({ table: 'cost_centers(type=agency)', count: costCenterCount })
    }
  }

  if (checks.length === 0) return
  const summary = checks.map((row) => `${row.table}=${row.count}`).join(', ')
  throw new AgencyDeprovisioningError('DEPENDENCY_BLOCK', `agency delete blocked by unresolved dependencies: ${summary}`)
}

async function deleteAgencyDataInTx(
  client: PoolClient,
  input: {
    agencyId: string
    organizationIds: string[]
    siteIds: string[]
    runtimeSiteIds: string[]
  },
): Promise<AgencyDeleteCounters> {
  const counters: AgencyDeleteCounters = {
    ai_usage_events_deleted: 0,
    runtime_usage_events_deleted: 0,
    migration_cost_events_deleted: 0,
    migration_jobs_deleted: 0,
    runtime_sites_deleted: 0,
    pages_deleted: 0,
    sites_deleted: 0,
    memberships_deleted: 0,
    organizations_deleted: 0,
    billing_accounts_deleted: 0,
    cost_centers_deleted: 0,
    agencies_deleted: 0,
  }

  counters.ai_usage_events_deleted = await deleteByAgencyId(client, 'ai_usage_events', input.agencyId)
  counters.runtime_usage_events_deleted = await deleteByAgencyId(client, 'runtime_usage_events', input.agencyId)
  counters.migration_cost_events_deleted = await deleteByAgencyId(client, 'migration_cost_events', input.agencyId)
  counters.migration_jobs_deleted = await deleteByAgencyId(client, 'migration_jobs', input.agencyId)

  counters.runtime_sites_deleted = await deleteByEntityIds(
    client,
    'gnr8_runtime_sites',
    'id = any($1::text[])',
    input.runtimeSiteIds,
  )

  counters.pages_deleted = await deleteByEntityIds(
    client,
    'gnr8_pages',
    'org_id = any($1::uuid[])',
    input.organizationIds,
  )

  counters.sites_deleted = await deleteByAgencyId(client, 'sites', input.agencyId)

  const membershipColumns = await detectMembershipOrgColumnSupport(client)
  let orgExpr: string
  try {
    orgExpr = resolveMembershipOrgColumnExpression({
      columns: membershipColumns,
      tableAlias: 'm',
      missingColumnMessage: 'memberships schema mismatch: expected organization_id and/or org_id',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'memberships schema mismatch'
    throw new AgencyDeprovisioningError('DEPENDENCY_BLOCK', message)
  }

  if (input.organizationIds.length > 0 && (await tableExists(client, 'memberships'))) {
    const membershipDeleteResult = await client.query<QueryResultRowCount>(
      `
        delete from public.memberships m
        where ${orgExpr} = any($1::uuid[])
      `,
      [input.organizationIds],
    )
    counters.memberships_deleted = membershipDeleteResult.rowCount ?? 0
  }

  counters.organizations_deleted = await deleteByAgencyId(client, 'organizations', input.agencyId)
  counters.billing_accounts_deleted = await deleteByAgencyId(client, 'billing_accounts', input.agencyId)

  if (await tableExists(client, 'cost_centers')) {
    const siteCostCentersDeleted = await deleteByEntityIds(
      client,
      'cost_centers',
      `type = 'site' and entity_id = any($1::uuid[])`,
      input.siteIds,
    )

    const clientCostCentersDeleted = await deleteByEntityIds(
      client,
      'cost_centers',
      `type = 'client' and entity_id = any($1::uuid[])`,
      input.organizationIds,
    )

    const agencyCostCentersDelete = await client.query<QueryResultRowCount>(
      `delete from public.cost_centers where type = 'agency' and entity_id = $1::uuid`,
      [input.agencyId],
    )

    counters.cost_centers_deleted =
      siteCostCentersDeleted +
      clientCostCentersDeleted +
      (agencyCostCentersDelete.rowCount ?? 0)
  }

  const agencyDeleteResult = await client.query<QueryResultRowCount>(
    'delete from public.agencies where id = $1::uuid',
    [input.agencyId],
  )
  counters.agencies_deleted = agencyDeleteResult.rowCount ?? 0

  if (counters.agencies_deleted !== 1) {
    throw new AgencyDeprovisioningError(
      'DEPENDENCY_BLOCK',
      'agency delete did not remove exactly one row',
    )
  }

  await assertNoDependencyBlockers(client, input.agencyId)

  return counters
}

async function deleteAuthUsers(
  supabase: SupabaseClient,
  userIds: string[],
  options: {
    actorUserId: string
    actorMode: AgencyActorMode
    superadminEmails: Set<string>
  },
): Promise<DeprovisionAgencyResult['authUserCleanup']> {
  const attemptedDeleteUserIds: string[] = []
  const deletedUserIds: string[] = []
  const skippedUserIds: string[] = []
  const failed: Array<{ userId: string; error: string }> = []

  for (const userId of userIds) {
    if (!isUuid(userId)) {
      skippedUserIds.push(userId)
      continue
    }

    if (options.actorMode === 'admin_view' && userId === options.actorUserId) {
      // Explicit admin_view safety guard: never delete the current actor auth identity.
      skippedUserIds.push(userId)
      continue
    }

    if (userId === options.actorUserId) {
      skippedUserIds.push(userId)
      continue
    }

    const userResult = await supabase.auth.admin.getUserById(userId)
    if (userResult.error) {
      failed.push({ userId, error: userResult.error.message })
      continue
    }

    const normalizedEmail = normalizeText(userResult.data.user?.email).toLowerCase()
    if (normalizedEmail && options.superadminEmails.has(normalizedEmail)) {
      skippedUserIds.push(userId)
      continue
    }

    attemptedDeleteUserIds.push(userId)
    const result = await supabase.auth.admin.deleteUser(userId)
    if (result.error) {
      failed.push({ userId, error: result.error.message })
      continue
    }

    deletedUserIds.push(userId)
  }

  return {
    candidateUserIds: userIds,
    attemptedDeleteUserIds,
    deletedUserIds,
    skippedUserIds,
    failed,
  }
}

export async function deprovisionAgency(input: {
  agencyId: string
  actorUserId: string
  actorMode: AgencyActorMode
}): Promise<DeprovisionAgencyResult> {
  const agencyId = assertUuid(input.agencyId, 'agencyId')
  const actorUserId = assertUuid(input.actorUserId, 'actorUserId')

  const pool = getSuperadminPool()
  const client = await pool.connect()

  let scope: Awaited<ReturnType<typeof listAgencyScopeRows>> | null = null
  let deletedCounts: AgencyDeleteCounters | null = null

  try {
    await client.query('begin')

    scope = await listAgencyScopeRows(client, agencyId)

    deletedCounts = await deleteAgencyDataInTx(client, {
      agencyId,
      organizationIds: scope.organizationIds,
      siteIds: scope.siteIds,
      runtimeSiteIds: scope.runtimeSiteIds,
    })

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    if (error instanceof AgencyDeprovisioningError) throw error
    const message = error instanceof Error ? error.message : 'Agency deprovisioning failed'
    throw new AgencyDeprovisioningError('DEPENDENCY_BLOCK', message)
  } finally {
    client.release()
  }

  if (!scope || !deletedCounts) {
    throw new AgencyDeprovisioningError('DEPENDENCY_BLOCK', 'Agency deprovisioning aborted before completion')
  }

  const supabaseServiceRole = getSupabaseServiceRoleClient()
  if (supabaseServiceRole == null) {
    throw new AgencyDeprovisioningError(
      'SERVICE_ROLE_UNAVAILABLE',
      'Agency data was deleted, but auth-user cleanup could not start because service role is unavailable',
    )
  }

  const superadminEmails = parseEmailAllowlist(process.env.SUPERADMIN_EMAILS)
  const authUserCleanup = await deleteAuthUsers(supabaseServiceRole, scope.authDeleteEligibleUserIds, {
    actorUserId,
    actorMode: input.actorMode,
    superadminEmails,
  })

  if (authUserCleanup.failed.length > 0) {
    const sample = authUserCleanup.failed
      .slice(0, 5)
      .map((entry) => `${entry.userId}: ${entry.error}`)
      .join('; ')

    throw new AgencyDeprovisioningError(
      'AUTH_CLEANUP_FAILED',
      `Agency was deleted but auth cleanup failed for ${authUserCleanup.failed.length} user(s). ${sample}`,
    )
  }

  return {
    agencyId,
    agencySlug: scope.agencySlug,
    organizationIds: scope.organizationIds,
    siteIds: scope.siteIds,
    runtimeSiteIds: scope.runtimeSiteIds,
    deletedCounts,
    authUserCleanup,
  }
}
