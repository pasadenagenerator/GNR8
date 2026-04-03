export type WorkspaceState = {
  activeAgencyId?: string
  activeClientId?: string
  lastAgencyTab?: string
  lastClientTab?: string
}

export type AgencyWorkspaceTab = 'dashboard' | 'clients' | 'team' | 'settings'
export type ClientWorkspaceTab = 'dashboard' | 'settings' | 'team'

const STORAGE_KEY = 'gnr8.workspace.state.v1'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function sanitizeState(input: Partial<WorkspaceState> | null | undefined): WorkspaceState {
  if (!input || typeof input !== 'object') return {}
  return {
    activeAgencyId: normalizeText(input.activeAgencyId),
    activeClientId: normalizeText(input.activeClientId),
    lastAgencyTab: normalizeAgencyTab(input.lastAgencyTab),
    lastClientTab: normalizeClientTab(input.lastClientTab),
  }
}

function hasAnyState(state: WorkspaceState): boolean {
  return Boolean(state.activeAgencyId || state.activeClientId || state.lastAgencyTab || state.lastClientTab)
}

function readStoredState(): WorkspaceState {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return sanitizeState(JSON.parse(raw))
  } catch {
    return {}
  }
}

function writeStoredState(state: WorkspaceState): void {
  if (!isBrowser()) return
  try {
    if (!hasAnyState(state)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage write failures to keep navigation fail-safe.
  }
}

export function getWorkspaceState(): WorkspaceState {
  return readStoredState()
}

export function setWorkspaceState(partial: Partial<WorkspaceState>): WorkspaceState {
  const nextState = sanitizeState({
    ...readStoredState(),
    ...partial,
  })
  writeStoredState(nextState)
  return nextState
}

export function clearWorkspaceState(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage clear failures to keep navigation fail-safe.
  }
}

export function syncFromUrl(urlParams?: URLSearchParams): WorkspaceState {
  const params = urlParams ?? (isBrowser() ? new URLSearchParams(window.location.search) : new URLSearchParams())

  const partial: Partial<WorkspaceState> = {}
  const agencyId = normalizeText(params.get('agency'))
  const clientId = normalizeText(params.get('client'))

  if (agencyId) partial.activeAgencyId = agencyId
  if (clientId) partial.activeClientId = clientId

  if (!partial.activeAgencyId && !partial.activeClientId) {
    return getWorkspaceState()
  }

  return setWorkspaceState(partial)
}

export function syncToUrl(input?: { state?: WorkspaceState; replace?: boolean }): string | null {
  if (!isBrowser()) return null

  const state = sanitizeState(input?.state ?? getWorkspaceState())
  const params = new URLSearchParams(window.location.search)
  let changed = false

  if (state.activeAgencyId && params.get('agency') !== state.activeAgencyId) {
    params.set('agency', state.activeAgencyId)
    changed = true
  }
  if (state.activeClientId && params.get('client') !== state.activeClientId) {
    params.set('client', state.activeClientId)
    changed = true
  }

  if (!changed) return null

  const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`
  if (input?.replace === false) {
    window.history.pushState({}, '', nextUrl)
  } else {
    window.history.replaceState({}, '', nextUrl)
  }
  return nextUrl
}

function normalizePathname(pathname: string | null | undefined): string {
  const normalized = String(pathname ?? '').trim()
  return normalized || '/'
}

function buildHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

function readExplicitTabParam(params: URLSearchParams): string | undefined {
  return normalizeText(params.get('tab')) ?? normalizeText(params.get('agency_tab')) ?? normalizeText(params.get('client_tab'))
}

function agencyPathForTab(tab: AgencyWorkspaceTab): string {
  if (tab === 'clients') return '/gnr8/agency/clients'
  if (tab === 'team') return '/gnr8/agency/members'
  if (tab === 'settings') return '/gnr8/agency/settings'
  return '/gnr8/agency'
}

function clientSectionForTab(tab: ClientWorkspaceTab): 'dashboard' | 'settings' | 'users' {
  if (tab === 'settings') return 'settings'
  if (tab === 'team') return 'users'
  return 'dashboard'
}

function parseAgencyManagedClientDashboardPath(pathname: string): { clientId: string } | null {
  const match = pathname.match(/^\/gnr8\/agency\/clients\/([^/]+)\/dashboard$/)
  if (!match) return null
  return { clientId: decodePathSegment(match[1]) }
}

export function normalizeAgencyTab(value: unknown): AgencyWorkspaceTab | undefined {
  const normalized = normalizeText(value)?.toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'dashboard') return 'dashboard'
  if (normalized === 'clients') return 'clients'
  if (normalized === 'team' || normalized === 'members') return 'team'
  if (normalized === 'settings') return 'settings'
  return undefined
}

export function normalizeClientTab(value: unknown): ClientWorkspaceTab | undefined {
  const normalized = normalizeText(value)?.toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'dashboard') return 'dashboard'
  if (normalized === 'settings') return 'settings'
  if (normalized === 'team' || normalized === 'users') return 'team'
  return undefined
}

export function getRestoredAgencyTab(input: {
  pathname: string
  params: URLSearchParams
  state?: WorkspaceState
}): AgencyWorkspaceTab | undefined {
  const pathname = normalizePathname(input.pathname)
  if (pathname !== '/gnr8/agency') return undefined

  const explicitTab = normalizeAgencyTab(readExplicitTabParam(input.params))
  if (explicitTab) return explicitTab
  return normalizeAgencyTab((input.state ?? getWorkspaceState()).lastAgencyTab)
}

export function getRestoredClientTab(input: {
  pathname: string
  params: URLSearchParams
  state?: WorkspaceState
}): ClientWorkspaceTab | undefined {
  const pathname = normalizePathname(input.pathname)
  const supportsClientRestore = pathname === '/gnr8/client' || parseAgencyManagedClientDashboardPath(pathname) != null
  if (!supportsClientRestore) return undefined

  const explicitTab = normalizeClientTab(readExplicitTabParam(input.params))
  if (explicitTab) return explicitTab
  return normalizeClientTab((input.state ?? getWorkspaceState()).lastClientTab)
}

export function buildAgencyRestoreHref(input: {
  pathname: string
  params: URLSearchParams
  state?: WorkspaceState
}): string | null {
  const pathname = normalizePathname(input.pathname)
  if (pathname !== '/gnr8/agency') return null

  const state = sanitizeState(input.state ?? getWorkspaceState())
  const params = new URLSearchParams(input.params.toString())
  const targetTab = getRestoredAgencyTab({ pathname, params, state }) ?? 'dashboard'

  if (!normalizeText(params.get('agency')) && state.activeAgencyId) {
    params.set('agency', state.activeAgencyId)
  }

  const targetPath = agencyPathForTab(targetTab)
  const targetHref = buildHref(targetPath, params)
  const currentHref = buildHref(pathname, params)
  if (targetHref === currentHref) return null
  return targetHref
}

export function buildClientRestoreHref(input: {
  pathname: string
  params: URLSearchParams
  state?: WorkspaceState
}): string | null {
  const pathname = normalizePathname(input.pathname)
  const state = sanitizeState(input.state ?? getWorkspaceState())
  const params = new URLSearchParams(input.params.toString())
  const restoredTab = getRestoredClientTab({ pathname, params, state }) ?? 'dashboard'

  const dashboardPathMatch = parseAgencyManagedClientDashboardPath(pathname)
  if (dashboardPathMatch) {
    if (state.activeClientId && state.activeClientId !== dashboardPathMatch.clientId) {
      return null
    }
    if (!normalizeText(params.get('agency')) && state.activeAgencyId) {
      params.set('agency', state.activeAgencyId)
    }
    if (restoredTab === 'dashboard') return null
    const targetPath = `/gnr8/agency/clients/${encodeURIComponent(dashboardPathMatch.clientId)}/${clientSectionForTab(restoredTab)}`
    return buildHref(targetPath, params)
  }

  if (pathname !== '/gnr8/client') return null

  const clientId = normalizeText(params.get('client')) ?? state.activeClientId
  if (!clientId) return null
  if (!normalizeText(params.get('client'))) {
    params.set('client', clientId)
  }

  if (!normalizeText(params.get('agency')) && state.activeAgencyId) {
    params.set('agency', state.activeAgencyId)
  }

  if (restoredTab === 'dashboard' || !normalizeText(params.get('agency'))) {
    return null
  }

  const targetPath = `/gnr8/agency/clients/${encodeURIComponent(clientId)}/${clientSectionForTab(restoredTab)}`
  return buildHref(targetPath, params)
}
