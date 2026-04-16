import { canPerformAction, type AgencyRole } from '@/src/auth/rbac'

import { NON_CANONICAL_SCOPED_IMPORT_PATHS, SCOPED_SITE_IMPORT_CANONICAL_PATH } from '@/gnr8/site/site-import-contract'
import { siteWorkspaceHref } from '@/gnr8/site/site-workspace-navigation'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeAdminView(value: unknown): boolean {
  const normalized = normalizeText(value).toLowerCase()
  return normalized === '1' || normalized === 'true'
}

function scopedAgencyQuery(agencyId: string, adminView?: boolean): string {
  const params = new URLSearchParams()
  params.set('agency', agencyId)
  if (adminView) params.set('admin_view', '1')
  return params.toString()
}

export function canAccessClientScopedImporter(role: AgencyRole | null | undefined): boolean {
  return canPerformAction(role ?? null, 'run_migration')
}

export function getScopedSiteImportCanonicalPath(): string {
  return SCOPED_SITE_IMPORT_CANONICAL_PATH
}

export function listNonCanonicalScopedImportPaths(): readonly string[] {
  return NON_CANONICAL_SCOPED_IMPORT_PATHS
}

export function agencyClientSiteImportHref(input: { clientId: string; agencyId: string; adminView?: boolean }): string {
  const query = scopedAgencyQuery(input.agencyId, normalizeAdminView(input.adminView))
  return `/gnr8/agency/clients/${encodeURIComponent(input.clientId)}/sites/import?${query}`
}

export function agencyClientSiteCreateHref(input: { clientId: string; agencyId: string; adminView?: boolean }): string {
  const query = scopedAgencyQuery(input.agencyId, normalizeAdminView(input.adminView))
  return `/gnr8/agency/clients/${encodeURIComponent(input.clientId)}/sites/new?${query}`
}

export function agencyClientDashboardHref(input: { clientId: string; agencyId: string; adminView?: boolean }): string {
  const query = scopedAgencyQuery(input.agencyId, normalizeAdminView(input.adminView))
  return `/gnr8/agency/clients/${encodeURIComponent(input.clientId)}/dashboard?${query}`
}

export function importerSuccessRedirectHref(input: {
  clientId: string
  agencyId: string
  siteId: string
  adminView?: boolean
}): string {
  return siteWorkspaceHref({
    clientId: input.clientId,
    siteId: input.siteId,
    tab: 'overview',
    agencyId: input.agencyId,
    adminView: normalizeAdminView(input.adminView),
  })
}
