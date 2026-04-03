export type WorkspaceRecentItem = {
  type: 'agency' | 'client' | 'command-center'
  label: string
  href: string
  agencyId?: string
  clientId?: string
  timestamp: number
}

const STORAGE_KEY = 'gnr8.workspace.recents.v1'
const MAX_RECENT_ITEMS = 12

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function sanitizeType(value: unknown): WorkspaceRecentItem['type'] | undefined {
  if (value === 'agency' || value === 'client' || value === 'command-center') return value
  return undefined
}

function normalizeTimestamp(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return Date.now()
  return Math.floor(numeric)
}

export function normalizeRecentItem(input: Partial<WorkspaceRecentItem> | null | undefined): WorkspaceRecentItem | null {
  if (!input || typeof input !== 'object') return null

  const type = sanitizeType(input.type)
  const label = normalizeText(input.label)
  const href = normalizeText(input.href)

  if (!type || !label || !href) return null

  return {
    type,
    label,
    href,
    agencyId: normalizeText(input.agencyId),
    clientId: normalizeText(input.clientId),
    timestamp: normalizeTimestamp(input.timestamp),
  }
}

function sortAndTrim(items: WorkspaceRecentItem[]): WorkspaceRecentItem[] {
  return [...items].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECENT_ITEMS)
}

function readStoredItems(): WorkspaceRecentItem[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const normalized = parsed
      .map((entry) => normalizeRecentItem(entry))
      .filter((entry): entry is WorkspaceRecentItem => entry != null)

    return sortAndTrim(normalized)
  } catch {
    return []
  }
}

function writeStoredItems(items: WorkspaceRecentItem[]): void {
  if (!isBrowser()) return
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortAndTrim(items)))
  } catch {
    // Ignore storage write failures to keep recents fail-safe.
  }
}

export function getRecentItems(): WorkspaceRecentItem[] {
  return readStoredItems()
}

export function addRecentItem(item: WorkspaceRecentItem): WorkspaceRecentItem[] {
  const normalized = normalizeRecentItem(item)
  if (!normalized) return readStoredItems()

  const current = readStoredItems()
  const deduped = current.filter((entry) => entry.href !== normalized.href)
  const next = sortAndTrim([
    {
      ...normalized,
      timestamp: Date.now(),
    },
    ...deduped,
  ])

  writeStoredItems(next)
  return next
}

export function clearRecentItems(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage clear failures to keep recents fail-safe.
  }
}
