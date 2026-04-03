export type WorkspaceState = {
  activeAgencyId?: string
  activeClientId?: string
  lastAgencyTab?: string
  lastClientTab?: string
}

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
    lastAgencyTab: normalizeText(input.lastAgencyTab),
    lastClientTab: normalizeText(input.lastClientTab),
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
