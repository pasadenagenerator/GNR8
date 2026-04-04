export type AgencyWorkspaceTab = 'dashboard' | 'clients' | 'team' | 'settings'
export type ClientWorkspaceTab = 'dashboard' | 'settings' | 'team'

export type AgencyContextState = {
  lastTab?: AgencyWorkspaceTab
}

export type ClientContextState = {
  lastTab?: ClientWorkspaceTab
  agencyId?: string
}

export type WorkspaceState = {
  activeAgencyId?: string
  activeClientId?: string
  agencyStateById?: Record<string, AgencyContextState>
  clientStateById?: Record<string, ClientContextState>
  // Legacy compatibility fields. Read-only compatibility path; new writes are V2-only.
  lastAgencyTab?: AgencyWorkspaceTab
  lastClientTab?: ClientWorkspaceTab
}

const STORAGE_KEY_V2 = 'gnr8.workspace.state.v2'
const STORAGE_KEY_V1 = 'gnr8.workspace.state.v1'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
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

function sanitizeAgencyContextState(input: unknown): AgencyContextState | undefined {
  if (!input || typeof input !== 'object') return undefined
  const candidate = input as AgencyContextState
  const state: AgencyContextState = {
    lastTab: normalizeAgencyTab(candidate.lastTab),
  }
  return state.lastTab ? state : undefined
}

function sanitizeClientContextState(input: unknown): ClientContextState | undefined {
  if (!input || typeof input !== 'object') return undefined
  const candidate = input as ClientContextState
  const state: ClientContextState = {
    lastTab: normalizeClientTab(candidate.lastTab),
    agencyId: normalizeText(candidate.agencyId),
  }
  return state.lastTab || state.agencyId ? state : undefined
}

function sanitizeAgencyStateById(input: unknown): Record<string, AgencyContextState> | undefined {
  if (!input || typeof input !== 'object') return undefined

  const next: Record<string, AgencyContextState> = {}
  for (const [rawId, rawState] of Object.entries(input as Record<string, unknown>)) {
    const id = normalizeText(rawId)
    if (!id) continue
    const contextState = sanitizeAgencyContextState(rawState)
    if (!contextState) continue
    next[id] = contextState
  }

  return Object.keys(next).length ? next : undefined
}

function sanitizeClientStateById(input: unknown): Record<string, ClientContextState> | undefined {
  if (!input || typeof input !== 'object') return undefined

  const next: Record<string, ClientContextState> = {}
  for (const [rawId, rawState] of Object.entries(input as Record<string, unknown>)) {
    const id = normalizeText(rawId)
    if (!id) continue
    const contextState = sanitizeClientContextState(rawState)
    if (!contextState) continue
    next[id] = contextState
  }

  return Object.keys(next).length ? next : undefined
}

function sanitizeState(input: Partial<WorkspaceState> | null | undefined): WorkspaceState {
  if (!input || typeof input !== 'object') return {}

  const activeAgencyId = normalizeText(input.activeAgencyId)
  const activeClientId = normalizeText(input.activeClientId)
  const lastAgencyTab = normalizeAgencyTab(input.lastAgencyTab)
  const lastClientTab = normalizeClientTab(input.lastClientTab)

  const agencyStateById: Record<string, AgencyContextState> = {
    ...(sanitizeAgencyStateById(input.agencyStateById) ?? {}),
  }
  const clientStateById: Record<string, ClientContextState> = {
    ...(sanitizeClientStateById(input.clientStateById) ?? {}),
  }

  // V1 -> V2 migration path: if legacy global tabs exist, project them into active context entries.
  if (activeAgencyId && lastAgencyTab && !agencyStateById[activeAgencyId]?.lastTab) {
    agencyStateById[activeAgencyId] = {
      ...(agencyStateById[activeAgencyId] ?? {}),
      lastTab: lastAgencyTab,
    }
  }

  if (activeClientId && lastClientTab && !clientStateById[activeClientId]?.lastTab) {
    clientStateById[activeClientId] = {
      ...(clientStateById[activeClientId] ?? {}),
      lastTab: lastClientTab,
      agencyId: clientStateById[activeClientId]?.agencyId ?? activeAgencyId,
    }
  }

  return {
    activeAgencyId,
    activeClientId,
    agencyStateById: Object.keys(agencyStateById).length ? agencyStateById : undefined,
    clientStateById: Object.keys(clientStateById).length ? clientStateById : undefined,
    // Keep legacy fields in-memory for compatibility reads only.
    lastAgencyTab,
    lastClientTab,
  }
}

function getPersistedState(state: WorkspaceState): Omit<WorkspaceState, 'lastAgencyTab' | 'lastClientTab'> {
  const sanitized = sanitizeState(state)
  return {
    activeAgencyId: sanitized.activeAgencyId,
    activeClientId: sanitized.activeClientId,
    agencyStateById: sanitized.agencyStateById,
    clientStateById: sanitized.clientStateById,
  }
}

function hasAnyState(state: WorkspaceState): boolean {
  return Boolean(
    state.activeAgencyId ||
      state.activeClientId ||
      (state.agencyStateById && Object.keys(state.agencyStateById).length) ||
      (state.clientStateById && Object.keys(state.clientStateById).length) ||
      state.lastAgencyTab ||
      state.lastClientTab,
  )
}

function readStoredState(): WorkspaceState {
  if (!isBrowser()) return {}

  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2)
    if (rawV2) {
      const normalized = sanitizeState(JSON.parse(rawV2))
      if (normalized.lastAgencyTab || normalized.lastClientTab) {
        writeStoredState(normalized)
      }
      return normalized
    }

    const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1)
    if (!rawV1) return {}

    const normalized = sanitizeState(JSON.parse(rawV1))
    if (hasAnyState(normalized)) {
      writeStoredState(normalized)
    }
    return normalized
  } catch {
    return {}
  }
}

function writeStoredState(state: WorkspaceState): void {
  if (!isBrowser()) return

  try {
    const persisted = getPersistedState(state)
    const hasPersistedState = Boolean(
      persisted.activeAgencyId ||
        persisted.activeClientId ||
        (persisted.agencyStateById && Object.keys(persisted.agencyStateById).length) ||
        (persisted.clientStateById && Object.keys(persisted.clientStateById).length),
    )

    if (!hasPersistedState) {
      window.localStorage.removeItem(STORAGE_KEY_V2)
      window.localStorage.removeItem(STORAGE_KEY_V1)
      return
    }

    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(persisted))
    // Cleanup legacy entry once V2 has been persisted.
    window.localStorage.removeItem(STORAGE_KEY_V1)
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

export function getAgencyContextState(agencyId: string): AgencyContextState | undefined {
  const normalizedAgencyId = normalizeText(agencyId)
  if (!normalizedAgencyId) return undefined
  const state = getWorkspaceState()
  return sanitizeAgencyContextState(state.agencyStateById?.[normalizedAgencyId])
}

export function setAgencyContextState(agencyId: string, partial: Partial<AgencyContextState>): WorkspaceState {
  const normalizedAgencyId = normalizeText(agencyId)
  if (!normalizedAgencyId) return getWorkspaceState()

  const currentState = readStoredState()
  const currentEntry = sanitizeAgencyContextState(currentState.agencyStateById?.[normalizedAgencyId]) ?? {}
  const nextEntry = sanitizeAgencyContextState({ ...currentEntry, ...partial })

  const nextMap = { ...(currentState.agencyStateById ?? {}) }
  if (nextEntry) {
    nextMap[normalizedAgencyId] = nextEntry
  } else {
    delete nextMap[normalizedAgencyId]
  }

  const nextState = sanitizeState({
    ...currentState,
    agencyStateById: Object.keys(nextMap).length ? nextMap : undefined,
  })
  writeStoredState(nextState)
  return nextState
}

export function getClientContextState(clientId: string): ClientContextState | undefined {
  const normalizedClientId = normalizeText(clientId)
  if (!normalizedClientId) return undefined
  const state = getWorkspaceState()
  return sanitizeClientContextState(state.clientStateById?.[normalizedClientId])
}

export function setClientContextState(clientId: string, partial: Partial<ClientContextState>): WorkspaceState {
  const normalizedClientId = normalizeText(clientId)
  if (!normalizedClientId) return getWorkspaceState()

  const currentState = readStoredState()
  const currentEntry = sanitizeClientContextState(currentState.clientStateById?.[normalizedClientId]) ?? {}
  const nextEntry = sanitizeClientContextState({ ...currentEntry, ...partial })

  const nextMap = { ...(currentState.clientStateById ?? {}) }
  if (nextEntry) {
    nextMap[normalizedClientId] = nextEntry
  } else {
    delete nextMap[normalizedClientId]
  }

  const nextState = sanitizeState({
    ...currentState,
    clientStateById: Object.keys(nextMap).length ? nextMap : undefined,
  })
  writeStoredState(nextState)
  return nextState
}

export function clearWorkspaceState(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY_V2)
    window.localStorage.removeItem(STORAGE_KEY_V1)
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

function resolveAgencyTabForRestore(input: {
  state: WorkspaceState
  agencyId?: string
}): AgencyWorkspaceTab | undefined {
  const agencyId = normalizeText(input.agencyId)
  if (agencyId) {
    const scopedTab = normalizeAgencyTab(input.state.agencyStateById?.[agencyId]?.lastTab)
    if (scopedTab) return scopedTab
  }

  return normalizeAgencyTab(input.state.lastAgencyTab)
}

function resolveClientTabForRestore(input: {
  state: WorkspaceState
  clientId?: string
  agencyId?: string
}): ClientWorkspaceTab | undefined {
  const clientId = normalizeText(input.clientId)
  const agencyId = normalizeText(input.agencyId)

  if (clientId) {
    const clientState = sanitizeClientContextState(input.state.clientStateById?.[clientId])
    if (clientState?.lastTab) {
      if (clientState.agencyId && agencyId && clientState.agencyId !== agencyId) {
        return undefined
      }
      return clientState.lastTab
    }
  }

  return normalizeClientTab(input.state.lastClientTab)
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

  const state = sanitizeState(input.state ?? getWorkspaceState())
  const agencyId = normalizeText(input.params.get('agency')) ?? state.activeAgencyId
  return resolveAgencyTabForRestore({ state, agencyId })
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

  const state = sanitizeState(input.state ?? getWorkspaceState())
  const dashboardPathMatch = parseAgencyManagedClientDashboardPath(pathname)
  const clientId = dashboardPathMatch?.clientId ?? normalizeText(input.params.get('client')) ?? state.activeClientId
  const agencyId = normalizeText(input.params.get('agency')) ?? state.activeAgencyId

  return resolveClientTabForRestore({ state, clientId, agencyId })
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
