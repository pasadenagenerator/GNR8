export type SiteLifecycleStatus =
  | 'draft'
  | 'migrating'
  | 'shadow'
  | 'live'
  | 'archived'
  | 'imported'
  | 'processed'
  | 'preview_ready'
  | 'published'
  | 'unknown'

export type SiteEntity = {
  id: string
  clientId: string
  agencyId: string | null
  templateId: string | null
  name: string | null
  label: string
  domain: string | null
  status: SiteLifecycleStatus
  createdAt: string | null
  updatedAt: string | null
}

export type RawSiteRow = {
  id: string | null
  org_id: string | null
  agency_id: string | null
  template_id?: string | null
  name?: string | null
  domain: string | null
  status: string | null
  created_at?: string | null
  updated_at?: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

export function normalizeSiteStatus(value: unknown): SiteLifecycleStatus {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return 'unknown'

  if (normalized === 'draft') return 'draft'
  if (normalized === 'migrating') return 'migrating'
  if (normalized === 'shadow') return 'shadow'
  if (normalized === 'live') return 'live'
  if (normalized === 'archived') return 'archived'
  if (normalized === 'imported') return 'imported'
  if (normalized === 'processed') return 'processed'
  if (normalized === 'preview_ready' || normalized === 'preview-ready') return 'preview_ready'
  if (normalized === 'published') return 'published'
  return 'unknown'
}

export function inferSiteLabel(input: {
  id: string
  domain?: string | null
  explicitLabel?: string | null
}): string {
  const explicit = normalizeText(input.explicitLabel)
  if (explicit) return explicit

  const domain = normalizeText(input.domain)
  if (domain) return domain

  return `Site ${shortId(input.id)}`
}

export function toSiteEntity(row: RawSiteRow | null): SiteEntity | null {
  if (!row) return null

  const id = normalizeText(row.id)
  const clientId = normalizeText(row.org_id)
  if (!id || !clientId) return null

  const domain = normalizeText(row.domain) || null
  const name = normalizeText(row.name) || null
  return {
    id,
    clientId,
    agencyId: normalizeText(row.agency_id) || null,
    templateId: normalizeText(row.template_id) || null,
    name,
    label: inferSiteLabel({
      id,
      domain,
      explicitLabel: name,
    }),
    domain,
    status: normalizeSiteStatus(row.status),
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at),
  }
}
