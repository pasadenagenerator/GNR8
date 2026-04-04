'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { getRecentItems, type WorkspaceRecentItem } from '@/src/workspace/workspace-recents'

export type CommandItem = {
  id: string
  label: string
  sublabel?: string
  aliases?: string[]
  href?: string
  type: 'recent' | 'agency' | 'client' | 'route' | 'action'
  action?: () => void
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
  action: 'Actions',
  recent: 'Recent',
  agency: 'Agencies',
  client: 'Clients',
  route: 'Navigation',
}

const GROUP_ORDER: GroupKey[] = ['action', 'route', 'recent', 'agency', 'client']

type WorkspaceScope = 'agency' | 'client' | 'command-center' | 'other'

type IndexedCommandItem = {
  item: CommandItem
  fields: string[]
  compactFields: string[]
}

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

function scoreIndexedItem(
  indexedItem: IndexedCommandItem,
  normalizedQuery: string,
  queryTokens: string[],
  workspaceScope: WorkspaceScope,
): number {
  if (!normalizedQuery) return 0

  const compactQuery = normalizeCompactText(normalizedQuery)
  let bestScore = -1
  for (let index = 0; index < indexedItem.fields.length; index += 1) {
    const score = scoreField(indexedItem.fields[index], indexedItem.compactFields[index], normalizedQuery, queryTokens, compactQuery)
    if (score > bestScore) bestScore = score
  }
  if (bestScore < 0) return -1

  let total = bestScore
  if (indexedItem.item.type === 'recent') total += indexedItem.item.recentRankBoost ?? 0
  if (indexedItem.item.type === 'action') total += 16
  if (indexedItem.item.type === 'action' && indexedItem.item.contextScope === workspaceScope) total += 18
  if (indexedItem.item.type === 'action' && indexedItem.item.contextScope === 'global') total += 8
  return total
}

export default function CommandPalette(props: Props) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentItems, setRecentItems] = useState<WorkspaceRecentItem[]>([])

  const allowedAgencyIds = useMemo(() => normalizeSet(props.accessibleAgencyIds), [props.accessibleAgencyIds])
  const allowedClientIds = useMemo(() => normalizeSet(props.accessibleClientIds), [props.accessibleClientIds])
  const activeAgencyId = useMemo(() => normalizeText(searchParams?.get('agency') ?? ''), [searchParams])
  const workspaceScope = useMemo<WorkspaceScope>(() => {
    if (pathname.startsWith('/gnr8/agency/clients/')) return 'client'
    if (pathname.startsWith('/gnr8/agency')) return 'agency'
    if (pathname.startsWith('/gnr8/command-center')) return 'command-center'
    return 'other'
  }, [pathname])

  useEffect(() => {
    setRecentItems(getRecentItems())
  }, [pathname, searchParams])

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

  const allItems = useMemo(() => {
    const recents: CommandItem[] = recentItems
      .filter((item) =>
        isVisibleRecentItem(item, {
          allowedAgencyIds,
          allowedClientIds,
          allowCommandCenter: props.allowCommandCenter ?? false,
        }),
      )
      .map((item, index) => ({
        id: `recent:${item.href}`,
        label: item.label,
        href: normalizeText(item.href),
        type: 'recent' as const,
        recentRankBoost: Math.max(0, 14 - index),
        aliases: inferAliases(item.label),
      }))

    const agencies = toStaticItems('agency', props.agencies ?? [], allowedAgencyIds)
    const clients = toStaticItems('client', props.clients ?? [], allowedClientIds)
    const routes = toStaticItems('route', props.routes ?? [])
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

    const actions: CommandItem[] = [
      {
        id: 'action-go-command-center',
        label: 'Go to Command Center',
        sublabel: 'Navigation action',
        type: 'action',
        aliases: ['admin', 'superadmin'],
        contextScope: 'global',
        action: () => router.push('/gnr8/command-center'),
      },
      {
        id: 'action-go-agency-dashboard',
        label: 'Go to Agency Dashboard',
        sublabel: 'Navigation action',
        type: 'action',
        contextScope: 'agency',
        action: () => router.push(agencyDashboardHref),
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
            },
            {
              id: 'action-invite-agency-member',
              label: 'Invite team member',
              sublabel: 'Agency workspace action',
              type: 'action' as const,
              aliases: ['invite user', 'members'],
              contextScope: 'agency' as const,
              action: () => router.push(agencyMembersHref),
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
            },
          ]
        : []),
    ]

    const visibleActions = actions.filter((item) => item.id !== 'action-go-command-center' || Boolean(props.allowCommandCenter))
    return [...visibleActions, ...recents, ...agencies, ...clients, ...routes]
  }, [
    activeAgencyId,
    allowedAgencyIds,
    allowedClientIds,
    pathname,
    props.agencies,
    props.allowCommandCenter,
    props.clients,
    props.routes,
    recentItems,
    router,
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
        fields,
        compactFields,
      }
    })
  }, [allItems])

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery) return allItems

    const queryTokens = tokenizeSearchText(normalizedQuery)
    return indexedItems
      .map((indexedItem) => ({
        item: indexedItem.item,
        score: scoreIndexedItem(indexedItem, normalizedQuery, queryTokens, workspaceScope),
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
  }, [allItems, indexedItems, query, workspaceScope])

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

  function handleSelect(item: CommandItem): void {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(0)
    if (item.href) {
      router.push(item.href)
      return
    }
    item.action?.()
  }

  if (!isOpen) return null

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
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(760px, 100%)',
          maxHeight: '76vh',
          overflow: 'hidden',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          background: '#fff',
          boxShadow: '0 22px 70px rgba(15, 23, 42, 0.22)',
        }}
      >
        <div style={{ borderBottom: '1px solid #e2e8f0', padding: 12 }}>
          <input
            autoFocus
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
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: '9px 11px',
              fontSize: 14,
              color: '#0f172a',
            }}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', textAlign: 'right' }}>⌘K</div>
        </div>

        <div style={{ maxHeight: 'calc(76vh - 70px)', overflowY: 'auto', padding: 8 }}>
          {groupedItems.length === 0 ? (
            <div style={{ padding: '10px 8px', fontSize: 13, color: '#64748b' }}>
              <div>No results found.</div>
              <div style={{ marginTop: 4 }}>Try searching for a client, settings, team, or create.</div>
            </div>
          ) : (
            groupedItems.map((group) => (
              <section key={group.key} aria-label={group.label} style={{ padding: 4 }}>
                <div
                  style={{
                    padding: '6px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: '#64748b',
                  }}
                >
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const itemIndex = itemIndexById.get(item.id) ?? -1
                  const isActive = itemIndex >= 0 && itemIndex === activeIndex

                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: isActive ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                        borderRadius: 8,
                        background: isActive ? '#e9f2ff' : '#fff',
                        padding: '9px 10px',
                        marginBottom: 6,
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 0 0 1px rgba(59, 130, 246, 0.2)' : undefined,
                      }}
                    >
                      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{item.label}</div>
                      {item.sublabel ? <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>{item.sublabel}</div> : null}
                    </button>
                  )
                })}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
