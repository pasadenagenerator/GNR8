import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

type MembershipOption = {
  agency_id: string
  agency_name: string | null
}

type AgencyContextTab = 'dashboard' | 'clients' | 'members' | 'settings'

type Props = {
  agencyId: string
  agencyName: string
  agencySlug?: string | null
  role: 'owner' | 'admin' | 'member' | 'superadmin'
  requestedAgencyId: string | null
  memberships: MembershipOption[]
  activeTab: AgencyContextTab
  actorMode?: 'membership' | 'admin_view'
  children: ReactNode
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

function tabStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 12px',
    borderRadius: 8,
    border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1e3a8a' : '#0f172a',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
  }
}

function membershipSwitchStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    border: active ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1e3a8a' : '#334155',
    textDecoration: 'none',
    fontSize: 12,
  }
}

function buildHref(path: string, params: URLSearchParams): string {
  const query = params.toString()
  if (!query) return path
  return `${path}?${query}`
}

export default function AgencyContextLayout(props: Props) {
  const actorMode = props.actorMode ?? 'membership'
  const isAdminView = actorMode === 'admin_view'
  const activeAgencyId = props.requestedAgencyId || props.agencyId

  const queryParams = new URLSearchParams()
  queryParams.set('agency', activeAgencyId)
  if (isAdminView) {
    queryParams.set('admin_view', '1')
  }

  const dashboardHref = buildHref('/gnr8/agency', queryParams)
  const clientsHref = buildHref('/gnr8/agency/clients', queryParams)
  const membersHref = buildHref('/gnr8/agency/members', queryParams)
  const settingsHref = buildHref('/gnr8/agency/settings', queryParams)

  return (
    <main
      style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <section
        style={{
          border: '1px solid #dbe6f1',
          borderRadius: 12,
          background: '#fff',
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            {isAdminView ? (
              <Link
                href='/gnr8/command-center'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: 'fit-content',
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                  textDecoration: 'none',
                  fontSize: 12,
                }}
              >
                ← Back to Command Center
              </Link>
            ) : null}
            <div style={{ margin: 0, fontSize: 12, color: '#475569' }}>{isAdminView ? 'Agency Context (Admin View)' : 'Agency Context'}</div>
            <div style={{ margin: 0, fontSize: 28, color: '#0f172a', fontWeight: 700 }}>Agency: {props.agencyName}</div>
            <div style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              {props.agencySlug?.trim() ? `Slug: ${props.agencySlug.trim()}` : `ID: ${shortId(props.agencyId)}`}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4, justifyItems: 'end', fontSize: 12, color: '#334155' }}>
            {isAdminView ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  padding: '4px 10px',
                  border: '1px solid #7dd3fc',
                  background: '#e0f2fe',
                  color: '#0c4a6e',
                  fontWeight: 700,
                }}
              >
                Admin View
              </span>
            ) : null}
            <span>
              <strong>Role:</strong> {props.role}
            </span>
            <span>
              <strong>Agency ID:</strong> {props.agencyId}
            </span>
          </div>
        </div>

        <nav style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label='Agency context navigation'>
          <Link href={dashboardHref} style={tabStyle(props.activeTab === 'dashboard')}>
            Dashboard
          </Link>
          <Link href={clientsHref} style={tabStyle(props.activeTab === 'clients')}>
            Clients
          </Link>
          <Link href={membersHref} style={tabStyle(props.activeTab === 'members')}>
            Team
          </Link>
          <Link href={settingsHref} style={tabStyle(props.activeTab === 'settings')}>
            Settings
          </Link>
        </nav>

        {!isAdminView && props.memberships.length > 1 ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {props.memberships.map((membership) => (
              <Link
                key={membership.agency_id}
                href={buildHref('/gnr8/agency', new URLSearchParams([['agency', membership.agency_id]]))}
                style={membershipSwitchStyle(membership.agency_id === activeAgencyId)}
              >
                {membership.agency_name?.trim() || membership.agency_id}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <div style={{ marginTop: 14 }}>{props.children}</div>
    </main>
  )
}
