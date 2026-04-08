function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function buildHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function normalizePathname(pathname: string | null | undefined): string {
  const normalized = String(pathname ?? '').trim()
  return normalized || '/'
}

function normalizeClientSection(value: unknown): 'dashboard' | 'settings' | 'users' | undefined {
  const normalized = normalizeText(value)?.toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'dashboard') return 'dashboard'
  if (normalized === 'settings') return 'settings'
  if (normalized === 'users' || normalized === 'team') return 'users'
  return undefined
}

function readClientSectionFromParams(params: URLSearchParams): 'dashboard' | 'settings' | 'users' | undefined {
  return (
    normalizeClientSection(params.get('tab')) ??
    normalizeClientSection(params.get('client_tab')) ??
    normalizeClientSection(params.get('agency_tab'))
  )
}

function resolveAgencySwitchPath(pathnameInput: string): string {
  const pathname = normalizePathname(pathnameInput)

  if (pathname === '/gnr8/agency') return '/gnr8/agency'
  if (pathname.startsWith('/gnr8/agency/settings')) return '/gnr8/agency/settings'
  if (pathname.startsWith('/gnr8/agency/members')) return '/gnr8/agency/members'
  if (pathname.startsWith('/gnr8/agency/clients')) return '/gnr8/agency/clients'
  return '/gnr8/agency'
}

function resolveClientSectionFromPath(pathnameInput: string): 'dashboard' | 'settings' | 'users' | null {
  const pathname = normalizePathname(pathnameInput)
  const match = pathname.match(/^\/gnr8\/agency\/clients\/[^/]+\/([^/?#]+)/)
  if (!match) return null
  return normalizeClientSection(match[1]) ?? null
}

export function buildAgencySwitchHref(input: {
  pathname: string
  params?: URLSearchParams
  targetAgencyId: string
}): string {
  const targetAgencyId = normalizeText(input.targetAgencyId)
  if (!targetAgencyId) return '/gnr8/agency'

  const pathname = resolveAgencySwitchPath(input.pathname)
  const sourceParams = new URLSearchParams(input.params?.toString() ?? '')
  const nextParams = new URLSearchParams()

  nextParams.set('agency', targetAgencyId)
  const adminView = normalizeText(sourceParams.get('admin_view'))
  if (adminView) {
    nextParams.set('admin_view', adminView)
  }

  return buildHref(pathname, nextParams)
}

export function buildClientSwitchHref(input: {
  pathname: string
  params?: URLSearchParams
  targetClientId: string
  targetAgencyId?: string
  preferClientSelf?: boolean
}): string {
  const targetClientId = normalizeText(input.targetClientId)
  if (!targetClientId) return '/gnr8/client'

  const pathname = normalizePathname(input.pathname)
  const sourceParams = new URLSearchParams(input.params?.toString() ?? '')
  const agencyId = normalizeText(input.targetAgencyId) ?? normalizeText(sourceParams.get('agency'))
  const adminView = normalizeText(sourceParams.get('admin_view'))
  const preferClientSelf = input.preferClientSelf !== false

  if (pathname.startsWith('/gnr8/client')) {
    const mappedSection = readClientSectionFromParams(sourceParams) ?? 'dashboard'
    if (!preferClientSelf && agencyId && mappedSection !== 'dashboard') {
      const scopedParams = new URLSearchParams()
      scopedParams.set('agency', agencyId)
      if (adminView) scopedParams.set('admin_view', adminView)
      return buildHref(`/gnr8/agency/clients/${encodeURIComponent(targetClientId)}/${mappedSection}`, scopedParams)
    }

    const selfParams = new URLSearchParams()
    selfParams.set('client', targetClientId)
    selfParams.set('client_tab', mappedSection)
    if (agencyId) selfParams.set('agency', agencyId)
    if (adminView) selfParams.set('admin_view', adminView)
    return buildHref('/gnr8/client', selfParams)
  }

  const resolvedSection = resolveClientSectionFromPath(pathname) ?? 'dashboard'
  const scopedParams = new URLSearchParams()
  if (agencyId) scopedParams.set('agency', agencyId)
  if (adminView) scopedParams.set('admin_view', adminView)
  return buildHref(`/gnr8/agency/clients/${encodeURIComponent(targetClientId)}/${resolvedSection}`, scopedParams)
}
