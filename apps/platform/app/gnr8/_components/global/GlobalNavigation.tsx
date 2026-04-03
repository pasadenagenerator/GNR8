'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

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

type BrandModel = {
  label: string
  logo?: ReactNode
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

function BrandSlot(props: { model: BrandModel }) {
  return (
    <div
      aria-label='Workspace brand'
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        border: '1px solid #dbe6f1',
        borderRadius: 10,
        background: '#fff',
        minHeight: 36,
      }}
    >
      {props.model.logo ? (
        <span
          aria-hidden='true'
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {props.model.logo}
        </span>
      ) : null}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{props.model.label}</span>
    </div>
  )
}

function navItemStyle(isActive: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 12px',
    borderRadius: 8,
    border: isActive ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
    background: isActive ? '#eff6ff' : '#fff',
    color: isActive ? '#1e3a8a' : '#334155',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: isActive ? 600 : 500,
    whiteSpace: 'nowrap',
  } as const
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
  const brandModel = useMemo<BrandModel>(
    () => ({
      label: 'GNR8',
      logo: undefined,
    }),
    [],
  )

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
        borderBottom: '1px solid #dbe6f1',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflowX: 'auto', paddingBottom: 1 }}>
          <BrandSlot model={brandModel} />
          <div aria-hidden='true' style={{ width: 1, alignSelf: 'stretch', background: '#dbe6f1' }} />
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.isActive ? 'page' : undefined}
              style={navItemStyle(item.isActive)}
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
