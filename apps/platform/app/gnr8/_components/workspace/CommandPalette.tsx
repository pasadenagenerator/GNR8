'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getSavedCommands,
  normalizeSavedCommands,
  pinCommand,
  removeSavedCommand,
  saveCommand,
  unpinCommand,
  type SavedCommandItem,
  type SavedCommandType,
} from '@/src/workspace/command-palette-saved'
import { getCommandUsage, recordCommandUsage, type CommandUsageEntry } from '@/src/workspace/command-palette-usage'
import { addRecentItem, getRecentItems, type WorkspaceRecentItem } from '@/src/workspace/workspace-recents'

export type CommandResultAction = {
  id: string
  label: string
  href?: string
  action?: () => void
}

export type CommandItem = {
  id: string
  label: string
  sublabel?: string
  aliases?: string[]
  href?: string
  type: 'pinned' | 'saved' | 'recent' | 'agency' | 'client' | 'route' | 'action'
  action?: () => void
  sourceItemId?: string
  sourceType?: SavedCommandType
  preview?: {
    title?: string
    lines?: string[]
    meta?: string[]
  }
  secondaryActions?: CommandResultAction[]
  recentRankBoost?: number
  contextScope?: WorkspaceScope | 'global'
}

export type CommandPaletteOption = {
  id: string
  label: string
  href: string
  sublabel?: string
  aliases?: string[]
}

type Props = {
  agencies?: CommandPaletteOption[]
  clients?: CommandPaletteOption[]
  routes?: CommandPaletteOption[]
  accessibleAgencyIds?: string[]
  accessibleClientIds?: string[]
  allowCommandCenter?: boolean
}

type GroupKey = CommandItem['type']

const GROUP_LABELS: Record<GroupKey, string> = {
  pinned: 'Pinned',
  saved: 'Saved',
  action: 'Actions',
  recent: 'Recent',
  agency: 'Agencies',
  client: 'Clients',
  route: 'Navigation',
}

const GROUP_ORDER: GroupKey[] = ['pinned', 'saved', 'action', 'route', 'recent', 'agency', 'client']

type WorkspaceScope = 'agency' | 'client' | 'command-center' | 'other'

type IndexedCommandItem = {
  item: CommandItem
  usageId: string
  fields: string[]
  compactFields: string[]
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeSearchText(value: unknown): string {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ')
}

function normalizeCompactText(value: string): string {
  return value.replace(/[\s/_-]+/g, '')
}

function tokenizeSearchText(value: string): string[] {
  return value.split(' ').map((token) => token.trim()).filter(Boolean)
}

function buildHref(path: string, params: URLSearchParams): string {
  const query = params.toString()
  if (!query) return path
  return `${path}?${query}`
}

function toQueryParams(href: string): URLSearchParams {
  const normalized = normalizeText(href)
  if (!normalized) return new URLSearchParams()
  const queryIndex = normalized.indexOf('?')
  return queryIndex >= 0 ? new URLSearchParams(normalized.slice(queryIndex + 1)) : new URLSearchParams()
}

function resolveUsageId(item: Pick<CommandItem, 'id' | 'sourceItemId' | 'type'>): string {
  const sourceId = normalizeText(item.sourceItemId)
  if ((item.type === 'pinned' || item.type === 'saved') && sourceId) return sourceId
  return normalizeText(item.id)
}

function itemTypeLabel(type: CommandItem['type']): string {
  if (type === 'pinned') return 'Pinned'
  if (type === 'saved') return 'Saved'
  if (type === 'agency') return 'Agency'
  if (type === 'client') return 'Client'
  if (type === 'route') return 'Route'
  if (type === 'action') return 'Action'
  return 'Recent'
}

function buildRoutePreviewLine(label: string): string {
  const normalized = normalizeSearchText(label)
  if (normalized.includes('dashboard')) return 'Opens the workspace dashboard view.'
  if (normalized.includes('settings')) return 'Opens workspace configuration settings.'
  if (normalized.includes('team') || normalized.includes('members') || normalized.includes('users')) return 'Opens workspace team and member management.'
  if (normalized.includes('clients')) return 'Opens the client list and management area.'
  if (normalized.includes('command center')) return 'Opens the platform-level operations workspace.'
  return 'Navigates to this destination.'
}

function normalizeSet(values?: string[]): Set<string> | null {
  if (!values || values.length === 0) return null
  const normalized = values.map((value) => normalizeText(value)).filter(Boolean)
  if (normalized.length === 0) return null
  return new Set(normalized)
}

function isVisibleRecentItem(
  item: WorkspaceRecentItem,
  options: {
    allowedAgencyIds: Set<string> | null
    allowedClientIds: Set<string> | null
    allowCommandCenter: boolean
  },
): boolean {
  if (item.type === 'action') {
    if (options.allowedClientIds) {
      if (!item.clientId) return false
      return options.allowedClientIds.has(item.clientId)
    }
    if (options.allowedAgencyIds) {
      if (!item.agencyId) return false
      return options.allowedAgencyIds.has(item.agencyId)
    }
    return true
  }

  if (item.type === 'command-center') return options.allowCommandCenter

  if (item.type === 'agency') {
    if (!options.allowedAgencyIds) return true
    if (!item.agencyId) return false
    return options.allowedAgencyIds.has(item.agencyId)
  }

  if (options.allowedClientIds) {
    if (!item.clientId) return false
    return options.allowedClientIds.has(item.clientId)
  }

  if (options.allowedAgencyIds) {
    if (!item.agencyId) return false
    return options.allowedAgencyIds.has(item.agencyId)
  }

  return true
}

function uniqueAliases(values: string[]): string[] | undefined {
  const seen = new Set<string>()
  const aliases: string[] = []
  for (const value of values) {
    const normalized = normalizeSearchText(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    aliases.push(normalizeText(value))
  }
  return aliases.length > 0 ? aliases : undefined
}

function inferAliases(label: string): string[] | undefined {
  const normalized = normalizeSearchText(label)
  if (!normalized) return undefined

  const aliases: string[] = []
  if (normalized === 'client team') aliases.push('users', 'members')
  if (normalized === 'agency settings' || normalized === 'client settings') aliases.push('config', 'preferences')
  if (normalized.includes('command center')) aliases.push('admin', 'superadmin')
  return uniqueAliases(aliases)
}

function prependMeta(meta: string[] | undefined, value: string): string[] {
  const values = [value, ...(meta ?? [])]
  return uniqueAliases(values) ?? [value]
}

function buildPersonalizedItem(item: CommandItem, type: 'pinned' | 'saved'): CommandItem {
  return {
    ...item,
    id: `${type}:${item.id}`,
    type,
    sourceItemId: item.id,
    sourceType: item.type === 'action' || item.type === 'route' || item.type === 'agency' || item.type === 'client' ? item.type : undefined,
    preview: {
      ...item.preview,
      meta: prependMeta(item.preview?.meta, type === 'pinned' ? 'Pinned' : 'Saved'),
    },
  }
}

function resolvePersonalizationType(item: CommandItem): SavedCommandType | null {
  if (item.type === 'action' || item.type === 'route' || item.type === 'agency' || item.type === 'client') return item.type
  if (item.sourceType) return item.sourceType
  return null
}

function resolvePersonalizationId(item: CommandItem): string | null {
  const id = normalizeText(item.sourceItemId ?? item.id)
  return id || null
}

function toSavedCommandInput(item: CommandItem): SavedCommandItem | null {
  const id = resolvePersonalizationId(item)
  const type = resolvePersonalizationType(item)
  const label = normalizeText(item.label)
  if (!id || !type || !label) return null

  return {
    id,
    type,
    label,
    href: normalizeText(item.href),
    timestamp: Date.now(),
  }
}

function toStaticItems(
  type: 'agency' | 'client' | 'route',
  options: CommandPaletteOption[],
  allowedIds?: Set<string> | null,
): CommandItem[] {
  const items: CommandItem[] = []
  for (const option of options) {
    const id = normalizeText(option.id)
    const label = normalizeText(option.label)
    const href = normalizeText(option.href)
    if (!id || !label || !href) continue
    if (allowedIds && (type === 'agency' || type === 'client') && !allowedIds.has(id)) continue

    items.push({
      id: `${type}:${id}`,
      label,
      href,
      sublabel: normalizeText(option.sublabel) || undefined,
      aliases: uniqueAliases([...(option.aliases ?? []), ...(inferAliases(label) ?? [])]),
      type,
    })
  }
  return items
}

function fuzzySubsequenceScore(needle: string, haystack: string): number {
  if (!needle || !haystack) return -1

  let previousIndex = -1
  let firstMatch = -1
  let totalGap = 0
  let contiguousStreak = 0
  let contiguousBonus = 0

  for (const char of needle) {
    const nextIndex = haystack.indexOf(char, previousIndex + 1)
    if (nextIndex === -1) return -1

    if (firstMatch === -1) firstMatch = nextIndex
    if (previousIndex >= 0) {
      const gap = nextIndex - previousIndex - 1
      totalGap += gap
      if (gap === 0) {
        contiguousStreak += 1
        contiguousBonus += 10 + Math.min(contiguousStreak, 4)
      } else {
        contiguousStreak = 0
      }
    }
    previousIndex = nextIndex
  }

  const spread = previousIndex - firstMatch + 1
  const spreadPenalty = Math.max(0, spread - needle.length) * 4
  const startPenalty = Math.max(0, firstMatch) * 2
  return Math.max(0, 420 - totalGap * 8 - spreadPenalty - startPenalty + contiguousBonus)
}

function includesWordBoundary(text: string, token: string): boolean {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[\\s/_-])${escapedToken}`).test(text)
}

function scoreField(field: string, compactField: string, normalizedQuery: string, queryTokens: string[], compactQuery: string): number {
  if (!field) return -1

  let best = -1
  if (field === normalizedQuery) best = 1300

  if (field.startsWith(normalizedQuery)) {
    best = Math.max(best, 1100 - Math.min(field.length - normalizedQuery.length, 120))
  }

  const includesIndex = field.indexOf(normalizedQuery)
  if (includesIndex >= 0) {
    best = Math.max(best, 900 - Math.min(includesIndex * 4, 220))
  }

  if (queryTokens.length > 0) {
    const tokenIncludesCount = queryTokens.reduce((count, token) => (field.includes(token) ? count + 1 : count), 0)
    const tokenBoundaryCount = queryTokens.reduce(
      (count, token) => (includesWordBoundary(field, token) ? count + 1 : count),
      0,
    )

    if (tokenBoundaryCount === queryTokens.length) {
      best = Math.max(best, 960 + tokenBoundaryCount * 16)
    } else if (tokenIncludesCount === queryTokens.length) {
      best = Math.max(best, 820 + tokenIncludesCount * 10)
    } else if (tokenIncludesCount > 0) {
      best = Math.max(best, 620 + tokenIncludesCount * 8)
    }
  }

  if (compactQuery.length > 0) {
    const fuzzy = fuzzySubsequenceScore(compactQuery, compactField)
    if (fuzzy >= 0) best = Math.max(best, 520 + Math.round(fuzzy / 2))
  }

  return best
}

function scoreUsageFrequencyBoost(entry: CommandUsageEntry | undefined): number {
  if (!entry) return 0
  if (entry.count <= 1) return 6
  return Math.min(28, Math.round(Math.log2(entry.count + 1) * 8))
}

function scoreUsageRecencyBoost(entry: CommandUsageEntry | undefined, now: number): number {
  if (!entry) return 0
  const ageMs = Math.max(0, now - entry.lastUsedAt)
  const ageHours = ageMs / (1000 * 60 * 60)
  if (ageHours <= 1) return 10
  if (ageHours <= 24) return 8
  if (ageHours <= 24 * 7) return 5
  if (ageHours <= 24 * 30) return 2
  return 0
}

function scoreIndexedItem(
  indexedItem: IndexedCommandItem,
  normalizedQuery: string,
  queryTokens: string[],
  workspaceScope: WorkspaceScope,
  usageById: Map<string, CommandUsageEntry>,
  now: number,
): number {
  if (!normalizedQuery) return 0

  const compactQuery = normalizeCompactText(normalizedQuery)
  let bestScore = -1
  for (let index = 0; index < indexedItem.fields.length; index += 1) {
    const score = scoreField(indexedItem.fields[index], indexedItem.compactFields[index], normalizedQuery, queryTokens, compactQuery)
    if (score > bestScore) bestScore = score
  }
  if (bestScore < 0) return -1

  const usageEntry = usageById.get(indexedItem.usageId)

  // Additive and deterministic score components, highest-priority boosts first.
  // Order of influence:
  // pinned > saved > text match quality > usage frequency > usage recency > context relevance.
  let total = bestScore
  if (indexedItem.item.type === 'recent') total += indexedItem.item.recentRankBoost ?? 0
  if (indexedItem.item.type === 'saved') total += 28
  if (indexedItem.item.type === 'pinned') total += 42
  if (indexedItem.item.type === 'action') total += 16
  total += scoreUsageFrequencyBoost(usageEntry)
  total += scoreUsageRecencyBoost(usageEntry, now)
  if (indexedItem.item.type === 'action' && indexedItem.item.contextScope === workspaceScope) total += 18
  if (indexedItem.item.type === 'action' && indexedItem.item.contextScope === 'global') total += 8
  return total
}

export default function CommandPalette(props: Props) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const modalRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const previousFocusedElementRef = useRef<HTMLElement | null>(null)
  const itemRowRefs = useRef(new Map<string, HTMLDivElement>())

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentItems, setRecentItems] = useState<WorkspaceRecentItem[]>([])
  const [savedCommands, setSavedCommands] = useState<SavedCommandItem[]>([])
  const [commandUsage, setCommandUsage] = useState<CommandUsageEntry[]>([])
  const [isCompactLayout, setIsCompactLayout] = useState(false)

  const allowedAgencyIds = useMemo(() => normalizeSet(props.accessibleAgencyIds), [props.accessibleAgencyIds])
  const allowedClientIds = useMemo(() => normalizeSet(props.accessibleClientIds), [props.accessibleClientIds])
  const activeAgencyId = useMemo(() => normalizeText(searchParams?.get('agency') ?? ''), [searchParams])
  const isAdminView = useMemo(() => normalizeText(searchParams?.get('admin_view') ?? '') === '1', [searchParams])
  const workspaceScope = useMemo<WorkspaceScope>(() => {
    if (pathname.startsWith('/gnr8/agency/clients/')) return 'client'
    if (pathname.startsWith('/gnr8/agency')) return 'agency'
    if (pathname.startsWith('/gnr8/command-center')) return 'command-center'
    return 'other'
  }, [pathname])
  const siteWorkspaceContext = useMemo(() => {
    const match = pathname.match(/^\/gnr8\/agency\/clients\/([^/]+)\/sites\/([^/]+)\/([^/?#]+)/)
    if (!match) return null
    const clientId = normalizeText(match[1])
    const siteId = normalizeText(match[2])
    if (!clientId || !siteId) return null
    return {
      clientId,
      siteId,
    }
  }, [pathname])

  useEffect(() => {
    setRecentItems(getRecentItems())
  }, [pathname, searchParams])

  useEffect(() => {
    setSavedCommands(getSavedCommands())
  }, [pathname, searchParams, isOpen])

  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== 'k') return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      setIsOpen((current) => !current)
    }

    window.addEventListener('keydown', handleGlobalKeydown)
    return () => window.removeEventListener('keydown', handleGlobalKeydown)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 900px)')
    const syncLayout = (): void => {
      setIsCompactLayout(mediaQuery.matches)
    }
    syncLayout()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncLayout)
      return () => mediaQuery.removeEventListener('change', syncLayout)
    }

    mediaQuery.addListener(syncLayout)
    return () => mediaQuery.removeListener(syncLayout)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    function handleOpenKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => current + 1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => current - 1)
      }
    }

    window.addEventListener('keydown', handleOpenKeydown)
    return () => window.removeEventListener('keydown', handleOpenKeydown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const body = document.body
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      previousFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const focusFrame = window.requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
      return () => window.cancelAnimationFrame(focusFrame)
    }

    const previousFocusedElement = previousFocusedElementRef.current
    if (previousFocusedElement && document.contains(previousFocusedElement)) {
      previousFocusedElement.focus()
    }
    previousFocusedElementRef.current = null
  }, [isOpen])

  const allItems = useMemo(() => {
    const buildPrimaryHrefAction = (id: string, label: string, href?: string): CommandResultAction | null => {
      if (!href) return null
      return { id, label, href }
    }

    const recents: CommandItem[] = recentItems
      .filter((item) =>
        isVisibleRecentItem(item, {
          allowedAgencyIds,
          allowedClientIds,
          allowCommandCenter: props.allowCommandCenter ?? false,
        }),
      )
      .map((item, index) => {
        const href = normalizeText(item.href)
        const typeLabel =
          item.type === 'agency' ? 'Agency' : item.type === 'client' ? 'Client' : item.type === 'action' ? 'Action' : 'Command Center'
        return {
          id: `recent:${item.href}`,
          label: item.label,
          href,
          type: 'recent' as const,
          recentRankBoost: Math.max(0, 14 - index),
          aliases: inferAliases(item.label),
          preview: {
            title: item.label,
            lines: ['Recently visited', `${typeLabel} destination`],
            meta: ['Recent item'],
          },
          secondaryActions: buildPrimaryHrefAction(`recent-open:${item.href}`, 'Open', href)
            ? [{ id: `recent-open:${item.href}`, label: 'Open', href }]
            : undefined,
        }
      })

    const agencies = toStaticItems('agency', props.agencies ?? [], allowedAgencyIds).map((item) => {
      const agencyId = item.id.replace(/^agency:/, '')
      const params = new URLSearchParams()
      params.set('agency', agencyId)
      if (isAdminView) params.set('admin_view', '1')

      const dashboardHref = buildHref('/gnr8/agency', params)
      const settingsHref = buildHref('/gnr8/agency/settings', params)
      const teamHref = buildHref('/gnr8/agency/members', params)

      return {
        ...item,
        preview: {
          title: item.label,
          lines: ['Agency workspace', 'Clients, team, and settings available'],
          meta: item.sublabel ? [item.sublabel] : undefined,
        },
        secondaryActions: [
          { id: `${item.id}:open-dashboard`, label: 'Open Dashboard', href: dashboardHref },
          { id: `${item.id}:open-settings`, label: 'Open Settings', href: settingsHref },
          { id: `${item.id}:open-team`, label: 'Open Team', href: teamHref },
        ],
      }
    })

    const clients = toStaticItems('client', props.clients ?? [], allowedClientIds).map((item) => {
      const clientId = item.id.replace(/^client:/, '')
      const queryParams = toQueryParams(item.href ?? '')
      const scopedAgencyId = normalizeText(queryParams.get('agency') ?? activeAgencyId)
      const scopedAgencyLabel = item.sublabel?.trim()
      const secondaryActions: CommandResultAction[] = []
      if (item.href) secondaryActions.push({ id: `${item.id}:open-dashboard`, label: 'Open Dashboard', href: item.href })
      if (clientId && scopedAgencyId) {
        secondaryActions.push({
          id: `${item.id}:open-settings`,
          label: 'Open Settings',
          href: `/gnr8/agency/clients/${encodeURIComponent(clientId)}/settings?agency=${encodeURIComponent(scopedAgencyId)}`,
        })
        secondaryActions.push({
          id: `${item.id}:open-team`,
          label: 'Open Team',
          href: `/gnr8/agency/clients/${encodeURIComponent(clientId)}/users?agency=${encodeURIComponent(scopedAgencyId)}`,
        })
      }

      return {
        ...item,
        preview: {
          title: item.label,
          lines: ['Client dashboard', 'Settings and team available'],
          meta: scopedAgencyLabel ? [scopedAgencyLabel] : undefined,
        },
        secondaryActions: secondaryActions.length > 0 ? secondaryActions : undefined,
      }
    })

    const routes = toStaticItems('route', props.routes ?? []).map((item) => ({
      ...item,
      preview: {
        title: item.label,
        lines: [buildRoutePreviewLine(item.label)],
        meta: item.sublabel ? [item.sublabel] : undefined,
      },
      secondaryActions: item.href ? [{ id: `${item.id}:open`, label: 'Open', href: item.href }] : undefined,
    }))
    const routeById = new Map(routes.map((route) => [route.id, route]))
    const clientDashboardHref =
      routeById.get('route-client-dashboard')?.href ??
      clients[0]?.href ??
      (workspaceScope === 'client' ? pathname : '')
    const clientSettingsHref = routeById.get('route-client-settings')?.href
    const clientTeamHref = routeById.get('route-client-team')?.href
    const agencyDashboardHref = routeById.get('route-agency-dashboard')?.href ?? '/gnr8/agency'
    const agencySettingsHref =
      routeById.get('route-agency-settings')?.href ??
      (activeAgencyId ? `/gnr8/agency/settings?agency=${encodeURIComponent(activeAgencyId)}` : '/gnr8/agency/settings')
    const agencyMembersHref =
      activeAgencyId ? `/gnr8/agency/members?agency=${encodeURIComponent(activeAgencyId)}` : '/gnr8/agency/members'
    const createClientHref =
      activeAgencyId ? `/gnr8/agency/clients/new?agency=${encodeURIComponent(activeAgencyId)}` : '/gnr8/agency/clients/new'

    const runSiteActionFromPalette = (actionType: 'rerun_transformation' | 'generate_redesign' | 'publish_site', strategy?: string) => {
      if (!siteWorkspaceContext?.siteId || !activeAgencyId) return
      void (async () => {
        try {
          const response = await fetch('/api/gnr8/site-actions', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              siteId: siteWorkspaceContext.siteId,
              actionType,
              strategy,
              agencyId: activeAgencyId,
            }),
          })
          const json = (await response.json().catch(() => null)) as
            | {
                ok?: boolean
                result?: {
                  ok?: boolean
                  variant?: { id?: string }
                }
                error?: string
              }
            | null
          if (!response.ok || !json?.ok || json.result?.ok !== true) {
            window.alert(json?.error || `Action failed (HTTP ${response.status})`)
            return
          }

          const params = new URLSearchParams(searchParams?.toString() ?? '')
          if (json.result?.variant?.id) {
            params.set('variant', json.result.variant.id)
          }
          const query = params.toString()
          const href = query ? `${pathname}?${query}` : pathname
          addRecentItem({
            type: 'action',
            label: `${siteWorkspaceContext.siteId} / ${actionType}`,
            href,
            agencyId: activeAgencyId,
            clientId: siteWorkspaceContext.clientId,
            timestamp: Date.now(),
          })
          router.replace(href)
          router.refresh()
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'Action failed')
        }
      })()
    }

    const actions: CommandItem[] = [
      {
        id: 'action-go-command-center',
        label: 'Go to Command Center',
        sublabel: 'Navigation action',
        type: 'action',
        aliases: ['admin', 'superadmin'],
        contextScope: 'global',
        action: () => router.push('/gnr8/command-center'),
        preview: {
          title: 'Go to Command Center',
          lines: ['Opens platform-level operations workspace.'],
          meta: ['Action'],
        },
      },
      {
        id: 'action-go-agency-dashboard',
        label: 'Go to Agency Dashboard',
        sublabel: 'Navigation action',
        type: 'action',
        contextScope: 'agency',
        action: () => router.push(agencyDashboardHref),
        preview: {
          title: 'Go to Agency Dashboard',
          lines: ['Navigates to the current agency dashboard.'],
          meta: ['Action'],
        },
      },
      ...(clientDashboardHref
        ? [
            {
              id: 'action-go-client-dashboard',
              label: 'Go to Client Dashboard',
              sublabel: 'Navigation action',
              type: 'action' as const,
              contextScope: 'client' as const,
              action: () => router.push(clientDashboardHref),
              preview: {
                title: 'Go to Client Dashboard',
                lines: ['Navigates to the active client dashboard.'],
                meta: ['Action'],
              },
            },
          ]
        : []),
      ...(workspaceScope === 'agency'
        ? [
            {
              id: 'action-create-client',
              label: 'Create new client',
              sublabel: 'Agency workspace action',
              type: 'action' as const,
              aliases: ['new client', 'add client'],
              contextScope: 'agency' as const,
              action: () => router.push(createClientHref),
              preview: {
                title: 'Create new client',
                lines: ['Starts client creation in the current agency.'],
                meta: ['Action'],
              },
            },
            {
              id: 'action-invite-agency-member',
              label: 'Invite team member',
              sublabel: 'Agency workspace action',
              type: 'action' as const,
              aliases: ['invite user', 'members'],
              contextScope: 'agency' as const,
              action: () => router.push(agencyMembersHref),
              preview: {
                title: 'Invite team member',
                lines: ['Opens agency team area to invite or manage members.'],
                meta: ['Action'],
              },
            },
          ]
        : []),
      ...(workspaceScope === 'agency'
        ? [
            {
              id: 'action-open-agency-settings',
              label: 'Open Agency Settings',
              sublabel: 'Settings action',
              type: 'action' as const,
              aliases: ['config', 'preferences'],
              contextScope: 'agency' as const,
              action: () => router.push(agencySettingsHref),
              preview: {
                title: 'Open Agency Settings',
                lines: ['Navigates to agency configuration.'],
                meta: ['Action'],
              },
            },
          ]
        : []),
      ...(workspaceScope === 'client' && clientSettingsHref
        ? [
            {
              id: 'action-open-client-settings',
              label: 'Open Client Settings',
              sublabel: 'Client workspace action',
              type: 'action' as const,
              aliases: ['config', 'preferences'],
              contextScope: 'client' as const,
              action: () => router.push(clientSettingsHref),
              preview: {
                title: 'Open Client Settings',
                lines: ['Navigates to the active client settings view.'],
                meta: ['Action'],
              },
            },
          ]
        : []),
      ...(workspaceScope === 'client' && clientTeamHref
        ? [
            {
              id: 'action-open-client-team',
              label: 'Open Client Team',
              sublabel: 'Client workspace action',
              type: 'action' as const,
              aliases: ['users', 'members'],
              contextScope: 'client' as const,
              action: () => router.push(clientTeamHref),
              preview: {
                title: 'Open Client Team',
                lines: ['Navigates to the active client team management view.'],
                meta: ['Action'],
              },
            },
          ]
        : []),
      ...(siteWorkspaceContext
        ? [
            {
              id: 'action-site-rerun-transformation',
              label: 'Re-run Site Transformation',
              sublabel: 'Site workspace action',
              type: 'action' as const,
              aliases: ['rerun', 'run pipeline', 'transform'],
              contextScope: 'client' as const,
              action: () => runSiteActionFromPalette('rerun_transformation'),
              preview: {
                title: 'Re-run Site Transformation',
                lines: ['Executes deterministic site transformation against the active site.'],
                meta: ['Action'],
              },
            },
            {
              id: 'action-site-generate-redesign',
              label: 'Generate Redesign Variant',
              sublabel: 'Site workspace action',
              type: 'action' as const,
              aliases: ['variant', 'redesign', 'design strategy'],
              contextScope: 'client' as const,
              action: () => runSiteActionFromPalette('generate_redesign', 'More visual'),
              preview: {
                title: 'Generate Redesign Variant',
                lines: ['Creates a deterministic redesign variant for the active site.'],
                meta: ['Action'],
              },
            },
            {
              id: 'action-site-publish',
              label: 'Publish Site',
              sublabel: 'Site workspace action',
              type: 'action' as const,
              aliases: ['publish', 'release'],
              contextScope: 'client' as const,
              action: () => runSiteActionFromPalette('publish_site'),
              preview: {
                title: 'Publish Site',
                lines: ['Runs V1 simulated publish and records metadata.'],
                meta: ['Action'],
              },
            },
          ]
        : []),
    ]

    const visibleActions = actions
      .filter((item) => item.id !== 'action-go-command-center' || Boolean(props.allowCommandCenter))
      .map((item) => ({
        ...item,
        secondaryActions: [{ id: `${item.id}:run`, label: 'Run', action: item.action }],
      }))
    const baseItems = [...visibleActions, ...recents, ...agencies, ...clients, ...routes]
    const persistableById = new Map(
      baseItems
        .filter((item) => resolvePersonalizationType(item) != null)
        .map((item) => [item.id, item]),
    )
    const savedState = normalizeSavedCommands(savedCommands)

    const pinnedItems: CommandItem[] = []
    const savedItems: CommandItem[] = []
    const personalizedIds = new Set<string>()

    for (const savedItem of savedState) {
      const currentItem = persistableById.get(savedItem.id)
      if (!currentItem || resolvePersonalizationType(currentItem) !== savedItem.type) continue
      personalizedIds.add(currentItem.id)
      if (savedItem.pinned) {
        pinnedItems.push(buildPersonalizedItem(currentItem, 'pinned'))
      } else {
        savedItems.push(buildPersonalizedItem(currentItem, 'saved'))
      }
    }

    const nonPersonalizedItems = baseItems.filter((item) => !personalizedIds.has(item.id))
    return [...pinnedItems, ...savedItems, ...nonPersonalizedItems]
  }, [
    activeAgencyId,
    allowedAgencyIds,
    allowedClientIds,
    isAdminView,
    pathname,
    props.agencies,
    props.allowCommandCenter,
    props.clients,
    props.routes,
    recentItems,
    savedCommands,
    router,
    searchParams,
    siteWorkspaceContext,
    workspaceScope,
  ])

  const indexedItems = useMemo<IndexedCommandItem[]>(() => {
    return allItems.map((item) => {
      const fields = [item.label, item.sublabel ?? '', ...(item.aliases ?? [])]
        .map((value) => normalizeSearchText(value))
        .filter(Boolean)
      const compactFields = fields.map((field) => normalizeCompactText(field))
      return {
        item,
        usageId: resolveUsageId(item),
        fields,
        compactFields,
      }
    })
  }, [allItems])

  useEffect(() => {
    if (!isOpen) return
    const validIds = new Set(allItems.map((item) => resolveUsageId(item)).filter(Boolean))
    setCommandUsage(getCommandUsage({ validIds }))
  }, [allItems, isOpen])

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery) return allItems

    const queryTokens = tokenizeSearchText(normalizedQuery)
    const usageById = new Map(commandUsage.map((entry) => [entry.id, entry]))
    const now = Date.now()
    return indexedItems
      .map((indexedItem) => ({
        item: indexedItem.item,
        score: scoreIndexedItem(indexedItem, normalizedQuery, queryTokens, workspaceScope, usageById, now),
      }))
      .filter((candidate) => candidate.score >= 0)
      .sort((left, right) => {
        const scoreDelta = right.score - left.score
        if (scoreDelta !== 0) return scoreDelta
        const leftGroupRank = GROUP_ORDER.indexOf(left.item.type)
        const rightGroupRank = GROUP_ORDER.indexOf(right.item.type)
        if (leftGroupRank !== rightGroupRank) return leftGroupRank - rightGroupRank
        const labelDelta = left.item.label.localeCompare(right.item.label)
        if (labelDelta !== 0) return labelDelta
        return left.item.id.localeCompare(right.item.id)
      })
      .map((candidate) => candidate.item)
  }, [allItems, commandUsage, indexedItems, query, workspaceScope])

  useEffect(() => {
    if (filteredItems.length === 0) {
      setActiveIndex(0)
      return
    }
    if (activeIndex < 0) {
      setActiveIndex(filteredItems.length - 1)
      return
    }
    if (activeIndex >= filteredItems.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, filteredItems])

  useEffect(() => {
    if (!isOpen) return
    const activeItem = filteredItems[activeIndex]
    if (!activeItem) return
    const activeRow = itemRowRefs.current.get(activeItem.id)
    if (!activeRow) return
    activeRow.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, filteredItems, isOpen])

  const groupedItems = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      key: group,
      label: GROUP_LABELS[group],
      items: filteredItems.filter((item) => item.type === group),
    })).filter((group) => group.items.length > 0)
  }, [filteredItems])

  const itemIndexById = useMemo(() => {
    return new Map(filteredItems.map((item, index) => [item.id, index]))
  }, [filteredItems])

  const savedStateById = useMemo(() => {
    const entries = normalizeSavedCommands(savedCommands)
    return new Map(entries.map((entry) => [entry.id, entry]))
  }, [savedCommands])

  const activeItem = filteredItems[activeIndex]

  function getFocusableElements(): HTMLElement[] {
    if (!modalRef.current) return []
    return Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
      if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') return false
      return element.getClientRects().length > 0
    })
  }

  function isPersonalizable(item: CommandItem): boolean {
    return toSavedCommandInput(item) != null
  }

  function isSaved(item: CommandItem): boolean {
    const id = resolvePersonalizationId(item)
    if (!id) return false
    return savedStateById.has(id)
  }

  function isPinned(item: CommandItem): boolean {
    const id = resolvePersonalizationId(item)
    if (!id) return false
    return savedStateById.get(id)?.pinned === true
  }

  function toggleSaved(item: CommandItem): void {
    const commandInput = toSavedCommandInput(item)
    if (!commandInput) return
    const next = isSaved(item) ? removeSavedCommand(commandInput.id) : saveCommand(commandInput)
    setSavedCommands(next)
  }

  function togglePinned(item: CommandItem): void {
    const commandInput = toSavedCommandInput(item)
    if (!commandInput) return
    const next = isPinned(item) ? unpinCommand(commandInput.id) : pinCommand(commandInput)
    setSavedCommands(next)
  }

  function handleSelect(item: CommandItem): void {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(0)
    const usageId = resolveUsageId(item)
    if (item.href) {
      router.push(item.href)
      setCommandUsage(recordCommandUsage(usageId))
      return
    }
    if (item.action) {
      item.action()
      setCommandUsage(recordCommandUsage(usageId))
    }
  }

  function handleAction(action: CommandResultAction, parentItem: CommandItem): void {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(0)
    const usageId = resolveUsageId(parentItem)
    if (action.href) {
      router.push(action.href)
      setCommandUsage(recordCommandUsage(usageId))
      return
    }
    if (action.action) {
      action.action()
      setCommandUsage(recordCommandUsage(usageId))
    }
  }

  if (!isOpen) return null
  const commandPaletteFontFamily = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial'

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Command palette'
      onClick={() => setIsOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15, 23, 42, 0.38)',
        display: 'grid',
        placeItems: 'start center',
        padding: '10vh 16px 16px',
        overscrollBehavior: 'contain',
        fontFamily: commandPaletteFontFamily,
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const focusableElements = getFocusableElements()
          if (focusableElements.length === 0) {
            event.preventDefault()
            modalRef.current?.focus()
            return
          }

          const currentFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
          const currentIndex = currentFocus ? focusableElements.indexOf(currentFocus) : -1
          const firstElement = focusableElements[0]
          const lastElement = focusableElements[focusableElements.length - 1]

          if (event.shiftKey) {
            if (currentIndex <= 0) {
              event.preventDefault()
              lastElement.focus()
            }
            return
          }

          if (currentIndex === focusableElements.length - 1 || currentIndex === -1) {
            event.preventDefault()
            firstElement.focus()
          }
        }}
        style={{
          width: 'min(980px, 100%)',
          maxHeight: '76vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          background: '#fff',
          boxShadow: '0 22px 70px rgba(15, 23, 42, 0.22)',
          overscrollBehavior: 'contain',
          fontFamily: commandPaletteFontFamily,
        }}
      >
        <div
          style={{
            paddingTop: 12,
            paddingBottom: 12,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            fontFamily: commandPaletteFontFamily,
          }}
        >
          <div style={{ borderBottom: '1px solid #e2e8f0', padding: '14px 20px 12px', fontFamily: commandPaletteFontFamily }}>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value)
                setActiveIndex(0)
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                const selected = filteredItems[activeIndex]
                if (selected) handleSelect(selected)
              }}
              placeholder='Type a command or destination'
              aria-label='Search commands'
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                padding: '10px 12px',
                fontSize: 14,
                color: '#0f172a',
                lineHeight: 1.4,
                fontFamily: commandPaletteFontFamily,
              }}
            />
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b', textAlign: 'right', fontFamily: commandPaletteFontFamily }}>
              ⌘K • Enter
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isCompactLayout ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(260px, 320px)',
              columnGap: isCompactLayout ? 0 : 18,
              rowGap: isCompactLayout ? 12 : 0,
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              padding: '0 20px',
              fontFamily: commandPaletteFontFamily,
            }}
          >
            <div
              style={{
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                minHeight: 0,
                minWidth: 0,
                padding: '12px 0',
                fontFamily: commandPaletteFontFamily,
              }}
            >
              {groupedItems.length === 0 ? (
                <div style={{ padding: '16px 0', fontSize: 13, color: '#64748b', lineHeight: 1.45, fontFamily: commandPaletteFontFamily }}>
                  <div style={{ fontSize: 14, color: '#334155', fontWeight: 600, fontFamily: commandPaletteFontFamily }}>No results found.</div>
                  <div style={{ marginTop: 6, fontFamily: commandPaletteFontFamily }}>Try searching for a client, settings, team, or create.</div>
                </div>
              ) : (
                groupedItems.map((group, groupIndex) => (
                  <section
                    key={group.key}
                    aria-label={group.label}
                    style={{
                      marginTop: groupIndex === 0 ? 0 : 10,
                      fontFamily: commandPaletteFontFamily,
                    }}
                  >
                    <div
                      style={{
                        padding: '5px 8px 7px',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.45,
                        textTransform: 'uppercase',
                        color: '#64748b',
                        fontFamily: commandPaletteFontFamily,
                      }}
                    >
                      {group.label}
                    </div>
                    {group.items.map((item) => {
                      const itemIndex = itemIndexById.get(item.id) ?? -1
                      const isActive = itemIndex >= 0 && itemIndex === activeIndex
                      const hasSecondaryActions = Boolean(item.secondaryActions && item.secondaryActions.length > 0)
                      const itemIsPinned = isPinned(item)
                      const itemIsSaved = isSaved(item)
                      const canPersonalize = isPersonalizable(item)

                      return (
                        <div
                          key={item.id}
                          ref={(node) => {
                            if (node) {
                              itemRowRefs.current.set(item.id, node)
                              return
                            }
                            itemRowRefs.current.delete(item.id)
                          }}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          style={{
                            border: isActive ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                            borderRadius: 10,
                            background: isActive ? '#f8fbff' : '#fff',
                            marginBottom: 7,
                            boxShadow: isActive ? '0 0 0 1px rgba(59, 130, 246, 0.08)' : undefined,
                            transition: 'background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
                            fontFamily: commandPaletteFontFamily,
                          }}
                        >
                          <button
                            type='button'
                            onClick={() => handleSelect(item)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              border: 0,
                              borderRadius: 10,
                              background: 'transparent',
                              padding: '10px 11px',
                              cursor: 'pointer',
                              fontFamily: commandPaletteFontFamily,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, lineHeight: 1.35, fontFamily: commandPaletteFontFamily }}>
                                {item.label}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {canPersonalize ? (
                                  <>
                                    <button
                                      type='button'
                                      aria-label={itemIsPinned ? 'Unpin result' : 'Pin result'}
                                      title={itemIsPinned ? 'Unpin' : 'Pin'}
                                      onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        togglePinned(item)
                                      }}
                                      style={{
                                        border: itemIsPinned ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                                        background: itemIsPinned ? '#eff6ff' : '#fff',
                                        color: itemIsPinned ? '#1d4ed8' : '#475569',
                                        borderRadius: 999,
                                        padding: '2px 7px',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.2,
                                        fontFamily: commandPaletteFontFamily,
                                      }}
                                    >
                                      {itemIsPinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                      type='button'
                                      aria-label={itemIsSaved ? 'Remove saved result' : 'Save result'}
                                      title={itemIsSaved ? 'Remove saved' : 'Save'}
                                      onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        toggleSaved(item)
                                      }}
                                      style={{
                                        border: itemIsSaved ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                                        background: itemIsSaved ? '#ecfdf5' : '#fff',
                                        color: itemIsSaved ? '#047857' : '#475569',
                                        borderRadius: 999,
                                        padding: '2px 7px',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.2,
                                        fontFamily: commandPaletteFontFamily,
                                      }}
                                    >
                                      {itemIsSaved ? 'Saved' : 'Save'}
                                    </button>
                                  </>
                                ) : null}
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 999,
                                    padding: '2px 7px',
                                    background: '#f8fafc',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.3,
                                    fontFamily: commandPaletteFontFamily,
                                  }}
                                >
                                  {itemTypeLabel(item.type)}
                                </span>
                              </div>
                            </div>
                            {item.sublabel ? (
                              <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', lineHeight: 1.35, fontFamily: commandPaletteFontFamily }}>
                                {item.sublabel}
                              </div>
                            ) : null}
                          </button>
                          {isActive && hasSecondaryActions ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 11px 10px', fontFamily: commandPaletteFontFamily }}>
                              {item.secondaryActions?.map((secondaryAction) => (
                                <button
                                  key={secondaryAction.id}
                                  type='button'
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleAction(secondaryAction, item)
                                  }}
                                  style={{
                                    border: '1px solid #bfdbfe',
                                    background: '#eff6ff',
                                    color: '#1e40af',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '4px 9px',
                                    cursor: 'pointer',
                                    fontFamily: commandPaletteFontFamily,
                                  }}
                                >
                                  {secondaryAction.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </section>
                ))
              )}
            </div>

            <aside
              aria-label='Result preview'
              style={{
                borderTop: isCompactLayout ? '1px solid #e2e8f0' : undefined,
                borderLeft: isCompactLayout ? undefined : '1px solid #e2e8f0',
                padding: isCompactLayout ? '12px 0 14px' : '14px 0 16px 12px',
                background: '#fcfdff',
                minHeight: 0,
                minWidth: 0,
                fontFamily: commandPaletteFontFamily,
              }}
            >
            {activeItem ? (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    fontFamily: commandPaletteFontFamily,
                  }}
                >
                  Preview
                </div>
                <div style={{ marginTop: 9, fontSize: 16, color: '#0f172a', fontWeight: 700, lineHeight: 1.3, fontFamily: commandPaletteFontFamily }}>
                  {activeItem.preview?.title || activeItem.label}
                </div>
                {isPersonalizable(activeItem) ? (
                  <div style={{ marginTop: 9, display: 'flex', gap: 6, flexWrap: 'wrap', fontFamily: commandPaletteFontFamily }}>
                    <button
                      type='button'
                      onClick={(event) => {
                        event.preventDefault()
                        togglePinned(activeItem)
                      }}
                      style={{
                        border: isPinned(activeItem) ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                        background: isPinned(activeItem) ? '#eff6ff' : '#fff',
                        color: isPinned(activeItem) ? '#1d4ed8' : '#334155',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 9px',
                        cursor: 'pointer',
                        fontFamily: commandPaletteFontFamily,
                      }}
                    >
                      {isPinned(activeItem) ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type='button'
                      onClick={(event) => {
                        event.preventDefault()
                        toggleSaved(activeItem)
                      }}
                      style={{
                        border: isSaved(activeItem) ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                        background: isSaved(activeItem) ? '#ecfdf5' : '#fff',
                        color: isSaved(activeItem) ? '#047857' : '#334155',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 9px',
                        cursor: 'pointer',
                        fontFamily: commandPaletteFontFamily,
                      }}
                    >
                      {isSaved(activeItem) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                ) : null}
                {(activeItem.preview?.lines ?? []).map((line, index) => (
                  <div
                    key={`${activeItem.id}:line:${index}`}
                    style={{ marginTop: 7, fontSize: 12, color: '#334155', lineHeight: 1.42, fontFamily: commandPaletteFontFamily }}
                  >
                    {line}
                  </div>
                ))}
                {activeItem.preview?.meta?.length ? (
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', fontFamily: commandPaletteFontFamily }}>
                    {activeItem.preview.meta.map((meta, index) => (
                      <span
                        key={`${activeItem.id}:meta:${index}`}
                        style={{
                          fontSize: 11,
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: 999,
                          padding: '3px 8px',
                          background: '#fff',
                          fontFamily: commandPaletteFontFamily,
                        }}
                      >
                        {meta}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#64748b', fontFamily: commandPaletteFontFamily }}>
                Select a result to view details.
              </div>
            )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
