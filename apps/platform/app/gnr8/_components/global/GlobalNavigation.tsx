'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { getWorkspaceState, type WorkspaceState } from '@/src/workspace/workspace-state'

type Props = {
  showCommandCenter: boolean
  showAgency: boolean
  showClient: boolean
}

type NavItem = {
  key: 'command-center' | 'agency' | 'client'
  label: string
  href: string
  isActive: boolean
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function toHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

function buildAgencyHref(input: { activeAgencyId?: string; activeAdminView?: string }): string {
  const params = new URLSearchParams()
  if (input.activeAgencyId) {
    params.set('agency', input.activeAgencyId)
  }
  if (input.activeAdminView) {
    params.set('admin_view', input.activeAdminView)
  }
  return toHref('/gnr8/agency', params)
}

function buildClientHref(input: { activeAgencyId?: string; activeClientId?: string; activeAdminView?: string }): string {
  const params = new URLSearchParams()
  if (input.activeClientId) {
    params.set('client', input.activeClientId)
  }
  if (input.activeAgencyId) {
    params.set('agency', input.activeAgencyId)
  }
  if (input.activeAdminView) {
    params.set('admin_view', input.activeAdminView)
  }
  return toHref('/gnr8/client', params)
}

function getActiveNavKey(pathname: string): NavItem['key'] | null {
  if (pathname.startsWith('/gnr8/command-center')) return 'command-center'
  if (pathname.startsWith('/gnr8/agency')) return 'agency'
  if (pathname.startsWith('/gnr8/client')) return 'client'
  return null
}

export default function GlobalNavigation(props: Props) {
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() => getWorkspaceState())

  useEffect(() => {
    setWorkspaceState(getWorkspaceState())
  }, [pathname, searchParams])

  const currentAgencyId = useMemo(
    () => normalizeText(searchParams?.get('agency')) ?? workspaceState.activeAgencyId,
    [searchParams, workspaceState.activeAgencyId],
  )
  const currentClientId = useMemo(
    () => normalizeText(searchParams?.get('client')) ?? workspaceState.activeClientId,
    [searchParams, workspaceState.activeClientId],
  )
  const currentAdminView = useMemo(() => normalizeText(searchParams?.get('admin_view')), [searchParams])
  const activeKey = getActiveNavKey(pathname)

  const navItems = useMemo(() => {
    const items: NavItem[] = []

    if (props.showCommandCenter) {
      items.push({
        key: 'command-center',
        label: 'Command Center',
        href: '/gnr8/command-center',
        isActive: activeKey === 'command-center',
      })
    }

    if (props.showAgency) {
      items.push({
        key: 'agency',
        label: 'Agency',
        href: buildAgencyHref({
          activeAgencyId: currentAgencyId,
          activeAdminView: currentAdminView,
        }),
        isActive: activeKey === 'agency',
      })
    }

    if (props.showClient) {
      items.push({
        key: 'client',
        label: 'Client',
        href: buildClientHref({
          activeAgencyId: currentAgencyId,
          activeClientId: currentClientId,
          activeAdminView: currentAdminView,
        }),
        isActive: activeKey === 'client',
      })
    }

    return items
  }, [activeKey, currentAdminView, currentAgencyId, currentClientId, props.showAgency, props.showClient, props.showCommandCenter])

  if (navItems.length === 0) return null

  return (
    <header
      aria-label='Global navigation'
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        borderBottom: '1px solid #e2e8f0',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 20px',
          minHeight: 56,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, minWidth: 0, overflowX: 'auto' }}>
          <Link
            href='/gnr8'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            GNR8
          </Link>
          <div aria-hidden='true' style={{ width: 1, background: '#e2e8f0', margin: '12px 6px' }} />
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.isActive ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 12px',
                fontSize: 14,
                fontWeight: item.isActive ? 700 : 500,
                color: item.isActive ? '#0f172a' : '#334155',
                textDecoration: 'none',
                borderBottom: item.isActive ? '2px solid #0f172a' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 4px',
            color: '#475569',
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          Account
        </div>
      </div>
    </header>
  )
}
