'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import {
  buildAgencyRestoreHref,
  buildClientRestoreHref,
  getWorkspaceState,
  normalizeAgencyTab,
  normalizeClientTab,
  setAgencyContextState,
  setClientContextState,
  setWorkspaceState,
  syncFromUrl,
} from '@/src/workspace/workspace-state'
import { addRecentItem, normalizeRecentItem } from '@/src/workspace/workspace-recents'

type Props = {
  activeAgencyId?: string | null
  activeAgencyName?: string | null
  activeClientId?: string | null
  activeClientName?: string | null
  activeSiteId?: string | null
  activeSiteName?: string | null
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
  siteId?: string
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
    const siteMatch = pathname.match(/^\/gnr8\/agency\/clients\/([^/]+)\/sites\/([^/]+)\/([^/?#]+)/)
    if (siteMatch) {
      const clientId = normalizePathSegment(siteMatch[1])
      const siteId = normalizePathSegment(siteMatch[2])
      const rawSection = normalizePathSegment(siteMatch[3])?.toLowerCase()
      if (!clientId || !siteId) return null
      const section =
        rawSection === 'structure'
          ? 'Structure'
          : rawSection === 'design'
            ? 'Design'
            : rawSection === 'preview'
              ? 'Preview'
              : rawSection === 'settings'
                ? 'Settings'
                : 'Overview'
      return {
        type: 'client',
        section,
        agencyId: normalizeText(searchParams.get('agency')),
        clientId,
        siteId,
      }
    }
  }

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
  siteName?: string
}): string {
  if (input.type === 'command-center') return `Command Center / ${input.section}`
  if (input.type === 'agency') return `${input.agencyName || 'My Agency'} / ${input.section}`
  if (input.siteName) return `${input.clientName || 'Client'} / ${input.siteName} / ${input.section}`
  return `${input.clientName || 'Client'} / ${input.section}`
}

export default function WorkspaceStateSync(props: Props) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()

  useEffect(() => {
    syncFromUrl(searchParams ? new URLSearchParams(searchParams.toString()) : undefined)

    const activeAgencyId = normalizeText(props.activeAgencyId)
    const activeClientId = normalizeText(props.activeClientId)
    const lastAgencyTab = normalizeAgencyTab(props.lastAgencyTab)
    const lastClientTab = normalizeClientTab(props.lastClientTab)

    if (activeAgencyId || activeClientId) {
      setWorkspaceState({
        activeAgencyId,
        activeClientId,
      })
    }

    if (activeAgencyId && lastAgencyTab) {
      setAgencyContextState(activeAgencyId, { lastTab: lastAgencyTab })
    }

    if (activeClientId && (lastClientTab || activeAgencyId)) {
      setClientContextState(activeClientId, {
        lastTab: lastClientTab,
        agencyId: activeAgencyId,
      })
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
        siteName:
          context.siteId && normalizeText(props.activeSiteId) === context.siteId
            ? normalizeText(props.activeSiteName) || context.siteId
            : undefined,
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
    props.activeSiteId,
    props.activeSiteName,
    props.trackRecents,
    searchParams,
  ])

  return null
}
