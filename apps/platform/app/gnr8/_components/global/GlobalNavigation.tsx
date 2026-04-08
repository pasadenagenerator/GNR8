'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { getWorkspaceState, type WorkspaceState } from '@/src/workspace/workspace-state'

type BrandVariant = 'command-center' | 'agency' | 'client'

type Props = {
  showCommandCenter: boolean
  showAgency: boolean
  showClient: boolean
  agencyBrands: { id: string; label: string; logoUrl?: string | null }[]
  clientBrands: { id: string; label: string; logoUrl?: string | null }[]
}

type NavItem = {
  key: 'command-center' | 'agency' | 'client'
  label: string
  href: string
  isActive: boolean
}

type BrandModel = {
  variant: BrandVariant
  label: string
  subtitle?: string
  logoUrl?: string
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : undefined
}

function sanitizeLogoUrl(value: unknown): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized) return undefined
  if (normalized.startsWith('/')) return normalized

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return normalized
    }
  } catch {
    return undefined
  }

  return undefined
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
  params.set('client_tab', 'dashboard')
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

function buildInitials(label: string): string {
  const words = label
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const initials = words
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  return initials || 'G'
}

function BrandSlot(props: { model: BrandModel }) {
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    setLogoFailed(false)
  }, [props.model.logoUrl])

  const hasRenderableLogo = Boolean(props.model.logoUrl) && !logoFailed
  const initials = buildInitials(props.model.label)
  const logoFrameBackground =
    props.model.variant === 'command-center' ? '#eff6ff' : props.model.variant === 'client' ? '#f1f5f9' : '#f8fafc'

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
        minWidth: 0,
      }}
    >
      <span
        aria-hidden='true'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 20,
          borderRadius: 6,
          overflow: 'hidden',
          background: logoFrameBackground,
          border: '1px solid #dbe6f1',
          flexShrink: 0,
        }}
      >
        {hasRenderableLogo ? (
          <img
            src={props.model.logoUrl}
            alt=''
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', lineHeight: 1 }}>{initials}</span>
        )}
      </span>
      <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 220,
          }}
        >
          {props.model.label}
        </span>
        {props.model.subtitle ? (
          <span style={{ fontSize: 10, lineHeight: 1.2, color: '#64748b', whiteSpace: 'nowrap' }}>{props.model.subtitle}</span>
        ) : null}
      </span>
    </div>
  )
}

function navItemStyle(isActive: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 2px',
    color: isActive ? '#0f172a' : '#64748b',
    textDecoration: 'none',
    fontSize: 12,
    lineHeight: 1.25,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    fontWeight: isActive ? 600 : 500,
    whiteSpace: 'nowrap',
  } as const
}

export default function GlobalNavigation(props: Props) {
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() => getWorkspaceState())
  const [hoveredItemKey, setHoveredItemKey] = useState<NavItem['key'] | null>(null)

  useEffect(() => {
    setWorkspaceState(getWorkspaceState())
  }, [pathname, searchParams])

  const activeKey = getActiveNavKey(pathname)

  const currentAgencyId = useMemo(() => {
    const fromParams = normalizeText(searchParams?.get('agency'))
    if (fromParams) return fromParams
    if (workspaceState.activeAgencyId) return workspaceState.activeAgencyId
    if (props.agencyBrands.length === 1) return props.agencyBrands[0].id
    return undefined
  }, [props.agencyBrands, searchParams, workspaceState.activeAgencyId])

  const currentClientId = useMemo(() => {
    const fromParams = normalizeText(searchParams?.get('client'))
    if (fromParams) return fromParams
    if (workspaceState.activeClientId) return workspaceState.activeClientId
    if (props.clientBrands.length === 1) return props.clientBrands[0].id
    return undefined
  }, [props.clientBrands, searchParams, workspaceState.activeClientId])

  const currentAdminView = useMemo(() => normalizeText(searchParams?.get('admin_view')), [searchParams])

  const agencyBrandById = useMemo(() => {
    return new Map(props.agencyBrands.map((brand) => [brand.id, brand]))
  }, [props.agencyBrands])

  const clientBrandById = useMemo(() => {
    return new Map(props.clientBrands.map((brand) => [brand.id, brand]))
  }, [props.clientBrands])

  const brandModel = useMemo<BrandModel>(() => {
    if (activeKey === 'agency') {
      const agencyBrand = currentAgencyId ? agencyBrandById.get(currentAgencyId) : undefined
      return {
        variant: 'agency',
        label: agencyBrand?.label || 'Agency',
        subtitle: 'Agency Workspace',
        logoUrl: sanitizeLogoUrl(agencyBrand?.logoUrl),
      }
    }

    if (activeKey === 'client') {
      const clientBrand = currentClientId ? clientBrandById.get(currentClientId) : undefined
      return {
        variant: 'client',
        label: clientBrand?.label || 'Client',
        subtitle: 'Client Workspace',
        logoUrl: sanitizeLogoUrl(clientBrand?.logoUrl),
      }
    }

    return {
      variant: 'command-center',
      label: 'GNR8',
      subtitle: 'Command Center',
      logoUrl: undefined,
    }
  }, [activeKey, agencyBrandById, clientBrandById, currentAgencyId, currentClientId])

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
        background: '#ffffff',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, overflowX: 'auto', paddingBottom: 1 }}>
          <BrandSlot model={brandModel} />
          <div aria-hidden='true' style={{ width: 1, alignSelf: 'stretch', background: '#dbe6f1' }} />
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.isActive ? 'page' : undefined}
              onMouseEnter={() => setHoveredItemKey(item.key)}
              onMouseLeave={() => setHoveredItemKey((current) => (current === item.key ? null : current))}
              style={{
                ...navItemStyle(item.isActive),
                color: item.isActive ? '#0f172a' : hoveredItemKey === item.key ? '#334155' : '#64748b',
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
            fontSize: 12,
            lineHeight: 1.25,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          Account
        </div>
      </div>
    </header>
  )
}
