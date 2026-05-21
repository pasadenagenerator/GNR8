import 'server-only'

import { getSuperadminPool } from '@/src/superadmin/db'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

const UUID_V4_TO_V8_LOOSE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuidLike(value: string): boolean {
  return UUID_V4_TO_V8_LOOSE_REGEX.test(value)
}

export async function resolveAgencyIdForSiteVersion(siteVersionId: string): Promise<string | null> {
  const normalizedSiteVersionId = normalizeText(siteVersionId)
  if (normalizedSiteVersionId.length === 0) return null
  if (!isUuidLike(normalizedSiteVersionId)) return null

  const pool = getSuperadminPool()
  const result = await pool.query<{ agency_id: string | null }>(
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

export async function resolveAgencyIdForSite(siteId: string): Promise<string | null> {
  const normalizedSiteId = normalizeText(siteId)
  if (normalizedSiteId.length === 0) return null
  if (!isUuidLike(normalizedSiteId)) return null

  const pool = getSuperadminPool()
  const result = await pool.query<{ agency_id: string | null }>(
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
