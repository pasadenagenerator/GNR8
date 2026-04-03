'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { getRecentItems, type WorkspaceRecentItem } from '@/src/workspace/workspace-recents'

type Props = {
  accessibleAgencyIds?: string[]
  accessibleClientIds?: string[]
  allowCommandCenter?: boolean
  title?: string
  maxVisible?: number
}

function normalizeSet(values?: string[]): Set<string> | null {
  if (!values || values.length === 0) return null
  const normalized = values.map((value) => String(value ?? '').trim()).filter(Boolean)
  if (normalized.length === 0) return null
  return new Set(normalized)
}

function isVisibleItem(
  item: WorkspaceRecentItem,
  options: {
    allowedAgencyIds: Set<string> | null
    allowedClientIds: Set<string> | null
    allowCommandCenter: boolean
  },
): boolean {
  if (item.type === 'command-center') {
    return options.allowCommandCenter
  }

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

function listContainerStyle() {
  return {
    display: 'grid',
    gap: 6,
    marginTop: 12,
  } as const
}

function itemLinkStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    maxWidth: '100%',
    color: '#1e3a8a',
    textDecoration: 'none',
    borderBottom: '1px dashed #cbd5e1',
    paddingBottom: 2,
    fontSize: 12,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const
}

export default function WorkspaceRecentItems(props: Props) {
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const [items, setItems] = useState<WorkspaceRecentItem[]>([])

  const allowedAgencyIds = useMemo(() => normalizeSet(props.accessibleAgencyIds), [props.accessibleAgencyIds])
  const allowedClientIds = useMemo(() => normalizeSet(props.accessibleClientIds), [props.accessibleClientIds])

  useEffect(() => {
    setItems(getRecentItems())
  }, [pathname, searchParams])

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) =>
      isVisibleItem(item, {
        allowedAgencyIds,
        allowedClientIds,
        allowCommandCenter: props.allowCommandCenter ?? false,
      }),
    )
    const maxVisible = Math.max(1, Math.min(props.maxVisible ?? 6, 15))
    return filtered.slice(0, maxVisible)
  }, [allowedAgencyIds, allowedClientIds, items, props.allowCommandCenter, props.maxVisible])

  if (visibleItems.length === 0) return null

  return (
    <section
      aria-label='Recent workspace items'
      style={{
        marginTop: 12,
        borderTop: '1px solid #e2e8f0',
        paddingTop: 10,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{props.title ?? 'Recent Items'}</div>
      <div style={listContainerStyle()}>
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href} style={itemLinkStyle()} title={item.label}>
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
