import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceHeaderModel, type WorkspaceTab } from '../_components/workspace/WorkspaceLayout'

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
  const tabs: WorkspaceTab[] = [
    { key: 'dashboard', label: 'Dashboard', href: dashboardHref, active: props.activeTab === 'dashboard' },
    { key: 'clients', label: 'Clients', href: clientsHref, active: props.activeTab === 'clients' },
    { key: 'members', label: 'Team', href: membersHref, active: props.activeTab === 'members' },
    { key: 'settings', label: 'Settings', href: settingsHref, active: props.activeTab === 'settings' },
  ]
  const header: WorkspaceHeaderModel = {
    contextLabel: isAdminView ? 'Agency Context (Admin View)' : 'Agency Context',
    title: `Agency: ${props.agencyName}`,
    subtitle: props.agencySlug?.trim() ? `Slug: ${props.agencySlug.trim()}` : `ID: ${shortId(props.agencyId)}`,
    backHref: isAdminView ? '/gnr8/command-center' : undefined,
    backLabel: isAdminView ? '\u2190 Back to Command Center' : undefined,
    meta: (
      <>
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
      </>
    ),
  }

  return (
    <WorkspaceLayout
      maxWidth={1440}
      padding={24}
      header={header}
      tabs={tabs}
      tabsAriaLabel='Agency context navigation'
      afterTabs={
        !isAdminView && props.memberships.length > 1 ? (
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
        ) : null
      }
    >
      {props.children}
    </WorkspaceLayout>
  )
}
