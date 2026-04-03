import type { ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceHeaderModel, type WorkspaceTab } from '../../../_components/workspace/WorkspaceLayout'

type ClientContextTab = 'dashboard' | 'settings' | 'users'

type Props = {
  agencyId: string
  requestedAgencyId: string | null
  clientId: string
  clientName: string
  clientSlug?: string | null
  activeTab: ClientContextTab
  children: ReactNode
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

export default function ClientContextLayout(props: Props) {
  const activeAgencyId = props.requestedAgencyId || props.agencyId
  const agencyParam = `agency=${encodeURIComponent(activeAgencyId)}`

  const dashboardHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/dashboard?${agencyParam}`
  const settingsHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/settings?${agencyParam}`
  const usersHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users?${agencyParam}`
  const backToAgencyHref = `/gnr8/agency?${agencyParam}`
  const tabs: WorkspaceTab[] = [
    { key: 'dashboard', label: 'Dashboard', href: dashboardHref, active: props.activeTab === 'dashboard' },
    { key: 'settings', label: 'Settings', href: settingsHref, active: props.activeTab === 'settings' },
    { key: 'users', label: 'Team', href: usersHref, active: props.activeTab === 'users' },
  ]
  const header: WorkspaceHeaderModel = {
    contextLabel: 'Client Context',
    title: props.clientName,
    subtitle: props.clientSlug?.trim() ? `Slug: ${props.clientSlug}` : `ID: ${shortId(props.clientId)}`,
    backHref: backToAgencyHref,
    backLabel: '\u2190 Back to Agency',
    identityPlacement: 'right',
    titleFontSize: 20,
  }

  return (
    <WorkspaceLayout
      maxWidth={1280}
      padding={24}
      header={header}
      tabs={tabs}
      tabsAriaLabel='Client context navigation'
    >
      {props.children}
    </WorkspaceLayout>
  )
}
