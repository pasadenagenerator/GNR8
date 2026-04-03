'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { getWorkspaceState, setWorkspaceState, syncFromUrl } from '@/src/workspace/workspace-state'

type Props = {
  activeAgencyId?: string | null
  activeClientId?: string | null
  lastAgencyTab?: string
  lastClientTab?: string
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
    let changed = false

    if (shouldRestoreAgency(pathname) && !normalizeText(params.get('agency')) && state.activeAgencyId) {
      params.set('agency', state.activeAgencyId)
      changed = true
    }

    if (shouldRestoreClient(pathname) && !normalizeText(params.get('client')) && state.activeClientId) {
      params.set('client', state.activeClientId)
      changed = true
    }

    if (!changed) return
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return null
}
