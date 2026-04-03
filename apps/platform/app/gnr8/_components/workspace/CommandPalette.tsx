'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { getRecentItems, type WorkspaceRecentItem } from '@/src/workspace/workspace-recents'

export type CommandItem = {
  id: string
  label: string
  sublabel?: string
  href: string
  type: 'recent' | 'agency' | 'client' | 'route'
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
  recent: 'Recent',
  agency: 'Agencies',
  client: 'Clients',
  route: 'Routes',
}

const GROUP_ORDER: GroupKey[] = ['recent', 'agency', 'client', 'route']

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
  if (label === query || sublabel === query) return 0
  if (label.startsWith(query) || sublabel.startsWith(query)) return 1
  return 2
}

function toStaticItems(type: Exclude<CommandItem['type'], 'recent'>, options: CommandPaletteOption[]): CommandItem[] {
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
        href: item.href,
        type: 'recent' as const,
      }))

    const agencies = toStaticItems('agency', props.agencies ?? [])
    const clients = toStaticItems('client', props.clients ?? [])
    const routes = toStaticItems('route', props.routes ?? [])

    return [...recents, ...agencies, ...clients, ...routes]
  }, [allowedAgencyIds, allowedClientIds, props.agencies, props.allowCommandCenter, props.clients, props.routes, recentItems])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return allItems

    return allItems
      .filter((item) => {
        const label = item.label.toLowerCase()
        const sublabel = (item.sublabel ?? '').toLowerCase()
        return label.includes(normalizedQuery) || sublabel.includes(normalizedQuery)
      })
      .sort((left, right) => scoreMatch(left, normalizedQuery) - scoreMatch(right, normalizedQuery))
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
    router.push(item.href)
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
