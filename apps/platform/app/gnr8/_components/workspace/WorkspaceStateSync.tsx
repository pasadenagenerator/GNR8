'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import {
  buildAgencyRestoreHref,
  buildClientRestoreHref,
  getWorkspaceState,
  setWorkspaceState,
  syncFromUrl,
} from '@/src/workspace/workspace-state'
import { addRecentItem, normalizeRecentItem } from '@/src/workspace/workspace-recents'

type Props = {
  activeAgencyId?: string | null
  activeAgencyName?: string | null
  activeClientId?: string | null
  activeClientName?: string | null
  lastAgencyTab?: string
  lastClientTab?: string
  trackRecents?: boolean
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function shouldRestoreAgency(pathname: string): boolean {
  return pathname.startsWith('/gnr8/agency')
}

function shouldRestoreClient(pathname: string): boolean {
  return pathname.startsWith('/gnr8/client')
}

type RecentRouteContext = {
  type: 'agency' | 'client' | 'command-center'
  section: string
  agencyId?: string
  clientId?: string
}

function normalizePathSegment(segment: string | undefined): string | undefined {
  if (!segment) return undefined
  try {
    const decoded = decodeURIComponent(segment).trim()
    return decoded || undefined
  } catch {
    const normalized = segment.trim()
    return normalized || undefined
  }
}

function resolveRecentRouteContext(pathname: string, searchParams: URLSearchParams): RecentRouteContext | null {
  if (pathname.startsWith('/gnr8/agency/clients/')) {
    const match = pathname.match(/^\/gnr8\/agency\/clients\/([^/]+)\/([^/?#]+)/)
    if (!match) return null
    const clientId = normalizePathSegment(match[1])
    const rawSection = normalizePathSegment(match[2])?.toLowerCase()
    if (!clientId || !rawSection) return null

    if (rawSection === 'dashboard') {
      return { type: 'client', section: 'Dashboard', agencyId: normalizeText(searchParams.get('agency')), clientId }
    }
    if (rawSection === 'settings') {
      return { type: 'client', section: 'Settings', agencyId: normalizeText(searchParams.get('agency')), clientId }
    }
    if (rawSection === 'users') {
      return { type: 'client', section: 'Team', agencyId: normalizeText(searchParams.get('agency')), clientId }
    }
    return null
  }

  if (pathname.startsWith('/gnr8/agency')) {
    const agencyId = normalizeText(searchParams.get('agency'))
    if (pathname === '/gnr8/agency') return { type: 'agency', section: 'Dashboard', agencyId }
    if (pathname.startsWith('/gnr8/agency/clients')) return { type: 'agency', section: 'Clients', agencyId }
    if (pathname.startsWith('/gnr8/agency/settings')) return { type: 'agency', section: 'Settings', agencyId }
    if (pathname.startsWith('/gnr8/agency/members')) return { type: 'agency', section: 'Team', agencyId }
    return null
  }

  if (pathname.startsWith('/gnr8/client')) {
    const clientId = normalizeText(searchParams.get('client'))
    if (!clientId) return null
    return { type: 'client', section: 'Dashboard', clientId, agencyId: normalizeText(searchParams.get('agency')) }
  }

  if (pathname.startsWith('/gnr8/command-center')) {
    if (pathname.startsWith('/gnr8/command-center/sites')) return { type: 'command-center', section: 'Sites' }
    if (pathname.startsWith('/gnr8/command-center/agencies')) return { type: 'command-center', section: 'Agencies' }
    return { type: 'command-center', section: 'Overview' }
  }

  return null
}

function buildRecentLabel(input: {
  type: 'agency' | 'client' | 'command-center'
  section: string
  agencyName?: string
  clientName?: string
}): string {
  if (input.type === 'command-center') return `Command Center / ${input.section}`
  if (input.type === 'agency') return `${input.agencyName || 'My Agency'} / ${input.section}`
  return `${input.clientName || 'Client'} / ${input.section}`
}

export default function WorkspaceStateSync(props: Props) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()

  useEffect(() => {
    syncFromUrl(searchParams ? new URLSearchParams(searchParams.toString()) : undefined)

    const partial = {
      activeAgencyId: normalizeText(props.activeAgencyId),
      activeClientId: normalizeText(props.activeClientId),
      lastAgencyTab: normalizeText(props.lastAgencyTab),
      lastClientTab: normalizeText(props.lastClientTab),
    }

    if (partial.activeAgencyId || partial.activeClientId || partial.lastAgencyTab || partial.lastClientTab) {
      setWorkspaceState(partial)
    }
  }, [props.activeAgencyId, props.activeClientId, props.lastAgencyTab, props.lastClientTab, searchParams])

  useEffect(() => {
    if (!pathname || !searchParams) return

    const params = new URLSearchParams(searchParams.toString())
    const state = getWorkspaceState()
    const agencyRestoreHref = buildAgencyRestoreHref({
      pathname,
      params,
      state,
    })
    if (agencyRestoreHref) {
      router.replace(agencyRestoreHref, { scroll: false })
      return
    }
    const clientRestoreHref = buildClientRestoreHref({
      pathname,
      params,
      state,
    })
    if (clientRestoreHref) {
      router.replace(clientRestoreHref, { scroll: false })
      return
    }

    const scopedParams = new URLSearchParams(params.toString())
    let changed = false

    if (shouldRestoreAgency(pathname) && !normalizeText(scopedParams.get('agency')) && state.activeAgencyId) {
      scopedParams.set('agency', state.activeAgencyId)
      changed = true
    }

    if (shouldRestoreClient(pathname) && !normalizeText(scopedParams.get('client')) && state.activeClientId) {
      scopedParams.set('client', state.activeClientId)
      changed = true
    }

    if (!changed) return
    const query = scopedParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (props.trackRecents === false) return
    if (!pathname || !searchParams) return

    const params = new URLSearchParams(searchParams.toString())
    const context = resolveRecentRouteContext(pathname, params)
    if (!context) return

    const hrefQuery = params.toString()
    const href = hrefQuery ? `${pathname}?${hrefQuery}` : pathname
    const normalizedItem = normalizeRecentItem({
      type: context.type,
      href,
      agencyId: context.agencyId ?? normalizeText(props.activeAgencyId),
      clientId: context.clientId ?? normalizeText(props.activeClientId),
      label: buildRecentLabel({
        type: context.type,
        section: context.section,
        agencyName: normalizeText(props.activeAgencyName),
        clientName: normalizeText(props.activeClientName),
      }),
      timestamp: Date.now(),
    })
    if (!normalizedItem) return
    addRecentItem(normalizedItem)
  }, [
    pathname,
    props.activeAgencyId,
    props.activeAgencyName,
    props.activeClientId,
    props.activeClientName,
    props.trackRecents,
    searchParams,
  ])

  return null
}
