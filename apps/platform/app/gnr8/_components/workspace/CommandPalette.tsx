'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { getRecentItems, type WorkspaceRecentItem } from '@/src/workspace/workspace-recents'

export type CommandItem = {
  id: string
  label: string
  sublabel?: string
  href?: string
  type: 'recent' | 'agency' | 'client' | 'route' | 'action'
  action?: () => void
}

export type CommandPaletteOption = {
  id: string
  label: string
  href: string
  sublabel?: string
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

type ScoreBucket = 0 | 1 | 2 | 3

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
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

function scoreMatch(item: CommandItem, query: string): number {
  const label = item.label.toLowerCase()
  const sublabel = (item.sublabel ?? '').toLowerCase()
  let bucket: ScoreBucket = 3
  if (label === query || sublabel === query) bucket = 0
  else if (label.startsWith(query) || sublabel.startsWith(query)) bucket = 1
  else if (label.includes(query) || sublabel.includes(query)) bucket = 2
  const actionBoost = item.type === 'action' ? -0.15 : 0
  return bucket + actionBoost
}

function toStaticItems(type: 'agency' | 'client' | 'route', options: CommandPaletteOption[]): CommandItem[] {
  const items: CommandItem[] = []
  for (const option of options) {
    const id = normalizeText(option.id)
    const label = normalizeText(option.label)
    const href = normalizeText(option.href)
    if (!id || !label || !href) continue

    items.push({
      id: `${type}:${id}`,
      label,
      href,
      sublabel: normalizeText(option.sublabel) || undefined,
      type,
    })
  }
  return items
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
      .map((item) => ({
        id: `recent:${item.href}`,
        label: item.label,
        href: normalizeText(item.href),
        type: 'recent' as const,
      }))

    const agencies = toStaticItems('agency', props.agencies ?? [])
    const clients = toStaticItems('client', props.clients ?? [])
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
        action: () => router.push('/gnr8/command-center'),
      },
      {
        id: 'action-go-agency-dashboard',
        label: 'Go to Agency Dashboard',
        sublabel: 'Navigation action',
        type: 'action',
        action: () => router.push(agencyDashboardHref),
      },
      ...(clientDashboardHref
        ? [
            {
              id: 'action-go-client-dashboard',
              label: 'Go to Client Dashboard',
              sublabel: 'Navigation action',
              type: 'action' as const,
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
              action: () => router.push(createClientHref),
            },
            {
              id: 'action-invite-agency-member',
              label: 'Invite team member',
              sublabel: 'Agency workspace action',
              type: 'action' as const,
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

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return allItems

    return allItems
      .filter((item) => {
        const label = item.label.toLowerCase()
        const sublabel = (item.sublabel ?? '').toLowerCase()
        return label.includes(normalizedQuery) || sublabel.includes(normalizedQuery)
      })
      .sort((left, right) => {
        const scoreDelta = scoreMatch(left, normalizedQuery) - scoreMatch(right, normalizedQuery)
        if (scoreDelta !== 0) return scoreDelta
        return left.label.localeCompare(right.label)
      })
  }, [allItems, query])

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
            <div style={{ padding: '10px 8px', fontSize: 13, color: '#64748b' }}>No results</div>
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
                  const itemIndex = filteredItems.findIndex((candidate) => candidate.id === item.id)
                  const isActive = itemIndex === activeIndex

                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        background: isActive ? '#eff6ff' : '#fff',
                        padding: '9px 10px',
                        marginBottom: 6,
                        cursor: 'pointer',
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
