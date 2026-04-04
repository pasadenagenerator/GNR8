export type SavedCommandType = 'route' | 'action' | 'agency' | 'client'

export type SavedCommandItem = {
  id: string
  label: string
  href?: string
  type: SavedCommandType
  pinned?: boolean
  timestamp: number
}

const STORAGE_KEY = 'gnr8.workspace.command-palette.saved.v1'
const MAX_SAVED_COMMANDS = 80

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function normalizeTimestamp(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return Date.now()
  return Math.floor(numeric)
}

function normalizeType(value: unknown): SavedCommandType | undefined {
  if (value === 'route' || value === 'action' || value === 'agency' || value === 'client') return value
  return undefined
}

function normalizeSavedCommandItem(input: Partial<SavedCommandItem> | null | undefined): SavedCommandItem | null {
  if (!input || typeof input !== 'object') return null

  const id = normalizeText(input.id)
  const label = normalizeText(input.label)
  const type = normalizeType(input.type)

  if (!id || !label || !type) return null

  return {
    id,
    label,
    href: normalizeText(input.href),
    type,
    pinned: input.pinned === true ? true : undefined,
    timestamp: normalizeTimestamp(input.timestamp),
  }
}

function sortByNewest(items: SavedCommandItem[]): SavedCommandItem[] {
  return [...items].sort((left, right) => right.timestamp - left.timestamp)
}

function dedupeByStableId(items: SavedCommandItem[]): SavedCommandItem[] {
  const byId = new Map<string, SavedCommandItem>()
  for (const item of sortByNewest(items)) {
    const existing = byId.get(item.id)
    if (!existing) {
      byId.set(item.id, item)
      continue
    }

    byId.set(item.id, {
      ...item,
      pinned: item.pinned || existing.pinned ? true : undefined,
      timestamp: Math.max(item.timestamp, existing.timestamp),
    })
  }

  return sortByNewest([...byId.values()]).slice(0, MAX_SAVED_COMMANDS)
}

export function normalizeSavedCommands(input: unknown): SavedCommandItem[] {
  if (!Array.isArray(input)) return []
  const normalized = input
    .map((entry) => normalizeSavedCommandItem(entry as Partial<SavedCommandItem>))
    .filter((entry): entry is SavedCommandItem => entry != null)
  return dedupeByStableId(normalized)
}

function readStoredSavedCommands(): SavedCommandItem[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeSavedCommands(parsed)
  } catch {
    return []
  }
}

function writeStoredSavedCommands(items: SavedCommandItem[]): void {
  if (!isBrowser()) return
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeByStableId(items)))
  } catch {
    // Ignore localStorage write errors to keep personalization fail-safe.
  }
}

function upsertSavedCommand(item: SavedCommandItem): SavedCommandItem[] {
  const current = readStoredSavedCommands()
  const deduped = current.filter((entry) => entry.id !== item.id)
  const next = dedupeByStableId([
    {
      ...item,
      timestamp: Date.now(),
    },
    ...deduped,
  ])
  writeStoredSavedCommands(next)
  return next
}

export function getSavedCommands(): SavedCommandItem[] {
  return readStoredSavedCommands()
}

export function saveCommand(item: SavedCommandItem): SavedCommandItem[] {
  const normalized = normalizeSavedCommandItem(item)
  if (!normalized) return readStoredSavedCommands()

  const current = readStoredSavedCommands()
  const existing = current.find((entry) => entry.id === normalized.id)
  return upsertSavedCommand({
    ...normalized,
    pinned: existing?.pinned === true ? true : undefined,
  })
}

export function removeSavedCommand(id: string): SavedCommandItem[] {
  const normalizedId = normalizeText(id)
  if (!normalizedId) return readStoredSavedCommands()

  const next = readStoredSavedCommands().filter((entry) => entry.id !== normalizedId)
  writeStoredSavedCommands(next)
  return next
}

export function pinCommand(item: SavedCommandItem): SavedCommandItem[] {
  const normalized = normalizeSavedCommandItem(item)
  if (!normalized) return readStoredSavedCommands()
  return upsertSavedCommand({ ...normalized, pinned: true })
}

export function unpinCommand(id: string): SavedCommandItem[] {
  const normalizedId = normalizeText(id)
  if (!normalizedId) return readStoredSavedCommands()

  const current = readStoredSavedCommands()
  const existing = current.find((entry) => entry.id === normalizedId)
  if (!existing) return current

  const next = current.map((entry) =>
    entry.id === normalizedId
      ? {
          ...entry,
          pinned: undefined,
          timestamp: Date.now(),
        }
      : entry,
  )
  writeStoredSavedCommands(next)
  return dedupeByStableId(next)
}
