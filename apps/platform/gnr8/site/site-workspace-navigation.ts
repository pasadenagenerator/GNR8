export type SiteWorkspaceTab = 'overview' | 'structure' | 'design' | 'preview' | 'settings'

export const SITE_WORKSPACE_TABS: SiteWorkspaceTab[] = ['overview', 'structure', 'design', 'preview', 'settings']

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeSiteWorkspaceTab(value: unknown): SiteWorkspaceTab {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'structure') return 'structure'
  if (normalized === 'design') return 'design'
  if (normalized === 'preview') return 'preview'
  if (normalized === 'settings') return 'settings'
  return 'overview'
}

export function siteWorkspaceHref(input: {
  clientId: string
  siteId: string
  tab: SiteWorkspaceTab
  agencyId: string
  adminView?: boolean
  variantId?: string | null
}): string {
  const base = `/gnr8/agency/clients/${encodeURIComponent(input.clientId)}/sites/${encodeURIComponent(input.siteId)}`
  const path = input.tab === 'overview' ? `${base}/overview` : `${base}/${input.tab}`
  const params = new URLSearchParams()
  params.set('agency', input.agencyId)
  if (input.adminView) params.set('admin_view', '1')
  if (input.variantId) params.set('variant', input.variantId)
  return `${path}?${params.toString()}`
}
