import 'server-only'

import type { PoolClient } from 'pg'

import { getSuperadminPool } from '@/src/superadmin/db'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type QueryResultRowCount = { rowCount: number }

export type DeprovisionSiteResult = {
  siteId: string
  clientId: string
  agencyId: string
  runtimeSiteIds: string[]
  deletedCounts: {
    runtimeSitesDeleted: number
    sitesDeleted: number
  }
}

export class SiteDeprovisioningError extends Error {
  readonly code: 'INVALID_INPUT' | 'SITE_NOT_FOUND' | 'DEPENDENCY_BLOCK'

  constructor(code: SiteDeprovisioningError['code'], message: string) {
    super(message)
    this.name = 'SiteDeprovisioningError'
    this.code = code
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function assertUuid(value: unknown, fieldName: string): string {
  const normalized = normalizeText(value)
  if (!normalized || !isUuid(normalized)) {
    throw new SiteDeprovisioningError('INVALID_INPUT', `${fieldName} must be a valid UUID`)
  }
  return normalized
}

function quoteIdentifier(input: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input)) {
    throw new SiteDeprovisioningError('INVALID_INPUT', `invalid SQL identifier: ${input}`)
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

async function countByRuntimeSiteIds(client: PoolClient, tableName: string, runtimeSiteIds: string[]): Promise<number> {
  if (runtimeSiteIds.length === 0 || !(await tableExists(client, tableName))) return 0
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count from public.${quoteIdentifier(tableName)} where site_id = any($1::text[])`,
    [runtimeSiteIds],
  )
  const count = Number(result.rows[0]?.count ?? '0')
  return Number.isFinite(count) ? count : 0
}

async function countByOwnershipSiteId(client: PoolClient, siteId: string): Promise<number> {
  if (!(await tableExists(client, 'gnr8_runtime_site_versions'))) return 0
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count from public.gnr8_runtime_site_versions where ownership_site_id = $1::uuid`,
    [siteId],
  )
  const count = Number(result.rows[0]?.count ?? '0')
  return Number.isFinite(count) ? count : 0
}

async function countBySiteUuid(client: PoolClient, tableName: string, siteId: string): Promise<number> {
  if (!(await tableExists(client, tableName))) return 0
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count from public.${quoteIdentifier(tableName)} where site_id = $1::uuid`,
    [siteId],
  )
  const count = Number(result.rows[0]?.count ?? '0')
  return Number.isFinite(count) ? count : 0
}

export async function deprovisionSite(input: {
  siteId: string
  clientId: string
  agencyId: string
}): Promise<DeprovisionSiteResult> {
  const siteId = assertUuid(input.siteId, 'siteId')
  const clientId = assertUuid(input.clientId, 'clientId')
  const agencyId = assertUuid(input.agencyId, 'agencyId')

  const pool = getSuperadminPool()
  const client = await pool.connect()

  try {
    await client.query('begin')

    const siteScope = await client.query<{ id: string }>(
      `
      select s.id::text as id
      from public.sites s
      where s.id = $1::uuid
        and s.org_id = $2::uuid
        and s.agency_id = $3::uuid
      limit 1
      for update
      `,
      [siteId, clientId, agencyId],
    )
    if (!siteScope.rows[0]) {
      throw new SiteDeprovisioningError('SITE_NOT_FOUND', 'Site was not found in the requested client/agency scope.')
    }

    let runtimeSiteIds: string[] = []
    let runtimeSiteVersionIds: string[] = []
    if (await tableExists(client, 'gnr8_runtime_site_versions')) {
      const runtimeSiteRows = await client.query<{ id: string; site_id: string | null }>(
        `
        select id::text as id, site_id::text as site_id
        from public.gnr8_runtime_site_versions
        where ownership_site_id = $1::uuid
        `,
        [siteId],
      )
      runtimeSiteIds = [...new Set(runtimeSiteRows.rows.map((row) => normalizeText(row.site_id)).filter(Boolean))]
      if (runtimeSiteIds.length > 0) {
        const allVersionRows = await client.query<{ id: string; ownership_site_id: string | null }>(
          `select id::text as id, ownership_site_id::text as ownership_site_id
           from public.gnr8_runtime_site_versions where site_id = any($1::text[])`,
          [runtimeSiteIds],
        )
        if (allVersionRows.rows.some((row) => row.ownership_site_id && row.ownership_site_id !== siteId)) {
          throw new SiteDeprovisioningError('DEPENDENCY_BLOCK', 'Runtime site contains a version owned by another site.')
        }
        runtimeSiteVersionIds = allVersionRows.rows.map((row) => row.id)
      }
    }

    if (await tableExists(client, 'gnr8_ddom_readiness_snapshots')) {
      const snapshots = await client.query<{ count: string }>(
        `select count(*)::text as count from public.gnr8_ddom_readiness_snapshots
         where ownership_site_id = $1::uuid or site_id = any($2::text[])`,
        [siteId, runtimeSiteIds],
      )
      if (Number(snapshots.rows[0]?.count ?? '0') > 0) {
        throw new SiteDeprovisioningError('DEPENDENCY_BLOCK', 'Site has retained domain-readiness snapshots.')
      }
    }

    if (
      runtimeSiteVersionIds.length > 0 &&
      (await tableExists(client, 'gnr8_airship_publish_readiness_packages')) &&
      (await tableExists(client, 'gnr8_airship_internal_preview_candidate_reviews'))
    ) {
      await client.query(
        `delete from public.gnr8_airship_publish_readiness_packages
         where reviewed_candidate_site_version_id = any($1::uuid[])
            or review_record_id in (
              select id from public.gnr8_airship_internal_preview_candidate_reviews
              where candidate_site_version_id = any($1::uuid[])
            )`,
        [runtimeSiteVersionIds],
      )
    }
    if (runtimeSiteVersionIds.length > 0 && (await tableExists(client, 'gnr8_airship_internal_preview_candidate_reviews'))) {
      await client.query(
        `delete from public.gnr8_airship_internal_preview_candidate_reviews
         where candidate_site_version_id = any($1::uuid[])`,
        [runtimeSiteVersionIds],
      )
    }

    if (await tableExists(client, 'gnr8_astro_candidate_records')) {
      // The database trigger permits only DELETEs for this exact site in this transaction.
      await client.query(`select set_config('gnr8.deprovision_ownership_site_id', $1::text, true)`, [siteId])
      if (await tableExists(client, 'gnr8_astro_candidate_access_events')) {
        await client.query(
          `delete from public.gnr8_astro_candidate_access_events as event
           using public.gnr8_astro_candidate_records as candidate
           where event.candidate_id = candidate.candidate_id
             and candidate.ownership_site_id = $1::uuid`,
          [siteId],
        )
      }
      if (await tableExists(client, 'gnr8_astro_candidate_access_states')) {
        await client.query(
          `delete from public.gnr8_astro_candidate_access_states as state
           using public.gnr8_astro_candidate_records as candidate
           where state.candidate_id = candidate.candidate_id
             and candidate.ownership_site_id = $1::uuid`,
          [siteId],
        )
      }
      await client.query(`delete from public.gnr8_astro_candidate_records where ownership_site_id = $1::uuid`, [siteId])
    }

    let runtimeSitesDeleted = 0
    if (runtimeSiteIds.length > 0 && (await tableExists(client, 'gnr8_runtime_sites'))) {
      const runtimeDelete = await client.query<QueryResultRowCount>(
        `delete from public.gnr8_runtime_sites where id = any($1::text[])`,
        [runtimeSiteIds],
      )
      runtimeSitesDeleted = runtimeDelete.rowCount ?? 0
      if (runtimeSitesDeleted <= 0) {
        throw new SiteDeprovisioningError(
          'DEPENDENCY_BLOCK',
          `Runtime linkage delete affected 0 rows for site ${siteId}.`,
        )
      }
    }

    const siteDelete = await client.query<QueryResultRowCount>(
      `delete from public.sites where id = $1::uuid and org_id = $2::uuid and agency_id = $3::uuid`,
      [siteId, clientId, agencyId],
    )
    const sitesDeleted = siteDelete.rowCount ?? 0
    if (sitesDeleted !== 1) {
      throw new SiteDeprovisioningError('DEPENDENCY_BLOCK', `Site delete affected ${sitesDeleted} rows for site ${siteId}.`)
    }

    const leftoverOwnershipRuntimeVersions = await countByOwnershipSiteId(client, siteId)
    const leftoverRuntimeVersions = await countByRuntimeSiteIds(client, 'gnr8_runtime_site_versions', runtimeSiteIds)
    const leftoverRuntimeArtifacts = await countByRuntimeSiteIds(client, 'gnr8_runtime_artifacts', runtimeSiteIds)
    const leftoverRuntimePointers = await countByRuntimeSiteIds(client, 'gnr8_runtime_active_pointers', runtimeSiteIds)
    const leftoverSiteActions = await countBySiteUuid(client, 'gnr8_site_actions', siteId)
    const leftoverSiteVariants = await countBySiteUuid(client, 'gnr8_site_variants', siteId)
    const leftoverSitePublishEvents = await countBySiteUuid(client, 'gnr8_site_publish_events', siteId)

    const orphanChecks: Array<[string, number]> = [
      ['runtime_versions_by_ownership', leftoverOwnershipRuntimeVersions],
      ['runtime_versions_by_runtime_site', leftoverRuntimeVersions],
      ['runtime_artifacts_by_runtime_site', leftoverRuntimeArtifacts],
      ['runtime_pointers_by_runtime_site', leftoverRuntimePointers],
      ['site_actions', leftoverSiteActions],
      ['site_variants', leftoverSiteVariants],
      ['site_publish_events', leftoverSitePublishEvents],
    ]

    const remainingOrphans = orphanChecks.filter((entry) => entry[1] > 0)

    if (remainingOrphans.length > 0) {
      const summary = remainingOrphans.map(([name, count]) => `${name}=${count}`).join(', ')
      throw new SiteDeprovisioningError('DEPENDENCY_BLOCK', `Site delete left linked rows: ${summary}`)
    }

    await client.query('commit')

    return {
      siteId,
      clientId,
      agencyId,
      runtimeSiteIds,
      deletedCounts: {
        runtimeSitesDeleted,
        sitesDeleted,
      },
    }
  } catch (error) {
    await client.query('rollback')
    if (error instanceof SiteDeprovisioningError) throw error
    const message = error instanceof Error ? error.message : 'Site delete failed'
    throw new SiteDeprovisioningError('DEPENDENCY_BLOCK', message)
  } finally {
    client.release()
  }
}
