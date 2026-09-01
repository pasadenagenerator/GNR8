import 'server-only'

import type { PoolClient } from 'pg'

import { getSuperadminPool } from '@/src/superadmin/db'

type RuntimeAgencyScopeDbOptions = {
  dbClient?: Pick<PoolClient, 'query'>
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

const UUID_V4_TO_V8_LOOSE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuidLike(value: string): boolean {
  return UUID_V4_TO_V8_LOOSE_REGEX.test(value)
}

export async function resolveAgencyIdForSiteVersion(
  siteVersionId: string,
  options: RuntimeAgencyScopeDbOptions = {},
): Promise<string | null> {
  const normalizedSiteVersionId = normalizeText(siteVersionId)
  if (normalizedSiteVersionId.length === 0) return null
  if (!isUuidLike(normalizedSiteVersionId)) return null

  const client = options.dbClient ?? getSuperadminPool()
  const result = await client.query<{ agency_id: string | null }>(
    `
    select s.agency_id::text as agency_id
    from public.gnr8_runtime_site_versions sv
    join public.sites s on s.id = sv.ownership_site_id
    where sv.id = $1::uuid
    limit 1
    `,
    [normalizedSiteVersionId],
  )

  return normalizeText(result.rows[0]?.agency_id) || null
}

export async function resolveAgencyIdForPreviewSiteVersion(
  siteVersionId: string,
  options: RuntimeAgencyScopeDbOptions = {},
): Promise<string | null> {
  const normalizedSiteVersionId = normalizeText(siteVersionId)
  if (normalizedSiteVersionId.length === 0) return null
  if (!isUuidLike(normalizedSiteVersionId)) return null

  const client = options.dbClient ?? getSuperadminPool()
  const result = await client.query<{ agency_id: string | null }>(
    `
    with requested_version as (
      select
        sv.id,
        sv.site_id,
        sv.ownership_site_id
      from public.gnr8_runtime_site_versions sv
      where sv.id = $1::uuid
      limit 1
    ),
    ownership_candidates as (
      select
        rv.ownership_site_id,
        0 as resolution_rank,
        rv.id::text as tiebreaker
      from requested_version rv
      where rv.ownership_site_id is not null

      union all

      select
        sibling.ownership_site_id,
        1 as resolution_rank,
        sibling.id::text as tiebreaker
      from requested_version rv
      join public.gnr8_runtime_site_versions sibling
        on sibling.site_id = rv.site_id
      where sibling.ownership_site_id is not null
    )
    select s.agency_id::text as agency_id
    from ownership_candidates candidate
    join public.sites s on s.id = candidate.ownership_site_id
    order by candidate.resolution_rank asc, candidate.tiebreaker desc
    limit 1
    `,
    [normalizedSiteVersionId],
  )

  return normalizeText(result.rows[0]?.agency_id) || null
}

export async function resolveAgencyIdForSite(
  siteId: string,
  options: RuntimeAgencyScopeDbOptions = {},
): Promise<string | null> {
  const normalizedSiteId = normalizeText(siteId)
  if (normalizedSiteId.length === 0) return null
  if (!isUuidLike(normalizedSiteId)) return null

  const client = options.dbClient ?? getSuperadminPool()
  const result = await client.query<{ agency_id: string | null }>(
    `
    select s.agency_id::text as agency_id
    from public.sites s
    where s.id = $1::uuid
    limit 1
    `,
    [normalizedSiteId],
  )

  return normalizeText(result.rows[0]?.agency_id) || null
}
