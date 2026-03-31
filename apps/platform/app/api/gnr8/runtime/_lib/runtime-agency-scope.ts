import 'server-only'

import { getSuperadminPool } from '@/src/superadmin/db'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export async function resolveAgencyIdForSiteVersion(siteVersionId: string): Promise<string | null> {
  const normalizedSiteVersionId = normalizeText(siteVersionId)
  if (normalizedSiteVersionId.length === 0) return null

  const pool = getSuperadminPool()
  const client = await pool.connect()

  try {
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
  } finally {
    client.release()
  }
}
