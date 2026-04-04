export type CommandUsageEntry = {
  id: string
  count: number
  lastUsedAt: number
}

const STORAGE_KEY = 'gnr8.workspace.command-palette.usage.v1'
const MAX_USAGE_ITEMS = 240

type NormalizeUsageOptions = {
  validIds?: Iterable<string>
  maxEntries?: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function normalizeCount(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 1
  return Math.floor(numeric)
}

function normalizeTimestamp(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return Date.now()
  return Math.floor(numeric)
}

function normalizeEntry(input: Partial<CommandUsageEntry> | null | undefined): CommandUsageEntry | null {
  if (!input || typeof input !== 'object') return null
  const id = normalizeText(input.id)
  if (!id) return null
  return {
    id,
    count: normalizeCount(input.count),
    lastUsedAt: normalizeTimestamp(input.lastUsedAt),
  }
}

function sortByRecencyAndCount(entries: CommandUsageEntry[]): CommandUsageEntry[] {
  return [...entries].sort((left, right) => {
    const recencyDelta = right.lastUsedAt - left.lastUsedAt
    if (recencyDelta !== 0) return recencyDelta
    const countDelta = right.count - left.count
    if (countDelta !== 0) return countDelta
    return left.id.localeCompare(right.id)
  })
}

function dedupeAndTrim(entries: CommandUsageEntry[], options?: NormalizeUsageOptions): CommandUsageEntry[] {
  const validIds = options?.validIds ? new Set(options.validIds) : null
  const maxEntries = Math.max(1, Math.floor(options?.maxEntries ?? MAX_USAGE_ITEMS))
  const byId = new Map<string, CommandUsageEntry>()

  for (const entry of entries) {
    if (validIds && !validIds.has(entry.id)) continue
    const existing = byId.get(entry.id)
    if (!existing) {
      byId.set(entry.id, entry)
      continue
    }

    byId.set(entry.id, {
      id: entry.id,
      count: Math.max(existing.count, entry.count),
      lastUsedAt: Math.max(existing.lastUsedAt, entry.lastUsedAt),
    })
  }

  return sortByRecencyAndCount([...byId.values()]).slice(0, maxEntries)
}

function entriesEqual(left: CommandUsageEntry[], right: CommandUsageEntry[]): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    const leftEntry = left[index]
    const rightEntry = right[index]
    if (leftEntry.id !== rightEntry.id) return false
    if (leftEntry.count !== rightEntry.count) return false
    if (leftEntry.lastUsedAt !== rightEntry.lastUsedAt) return false
  }
  return true
}

export function normalizeCommandUsage(input: unknown, options?: NormalizeUsageOptions): CommandUsageEntry[] {
  if (!Array.isArray(input)) return []
  const normalized = input
    .map((entry) => normalizeEntry(entry as Partial<CommandUsageEntry>))
    .filter((entry): entry is CommandUsageEntry => entry != null)
  return dedupeAndTrim(normalized, options)
}

function readStoredCommandUsage(options?: NormalizeUsageOptions): CommandUsageEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeCommandUsage(parsed, options)
  } catch {
    return []
  }
}

function writeStoredCommandUsage(entries: CommandUsageEntry[]): void {
  if (!isBrowser()) return
  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeAndTrim(entries)))
  } catch {
    // Ignore localStorage write errors to keep usage ranking fail-safe.
  }
}

export function getCommandUsage(options?: NormalizeUsageOptions): CommandUsageEntry[] {
  const current = readStoredCommandUsage()
  const normalized = normalizeCommandUsage(current, options)
  if (!entriesEqual(current, normalized)) writeStoredCommandUsage(normalized)
  return normalized
}

export function recordCommandUsage(id: string): CommandUsageEntry[] {
  const normalizedId = normalizeText(id)
  if (!normalizedId) return getCommandUsage()

  const now = Date.now()
  const current = getCommandUsage()
  const existing = current.find((entry) => entry.id === normalizedId)
  const next = dedupeAndTrim(
    [
      {
        id: normalizedId,
        count: (existing?.count ?? 0) + 1,
        lastUsedAt: now,
      },
      ...current.filter((entry) => entry.id !== normalizedId),
    ],
    { maxEntries: MAX_USAGE_ITEMS },
  )

  writeStoredCommandUsage(next)
  return next
}

export function clearCommandUsage(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore localStorage clear failures to keep usage ranking fail-safe.
  }
}
