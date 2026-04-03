import type { ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from '../../../_components/workspace/WorkspaceLayout'
import { buildWorkspaceViewModel, type WorkspaceTabInput } from '../../../_components/workspace/workspace-view-model'

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

const CLIENT_TAB_LABELS: Record<ClientContextTab, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  users: 'Team',
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
  const agencyClientsHref = `/gnr8/agency/clients?${agencyParam}`
  const breadcrumbs: WorkspaceBreadcrumbItem[] = [
    { label: 'Agency', href: backToAgencyHref },
    { label: 'Clients', href: agencyClientsHref },
    { label: props.clientName, href: dashboardHref },
    { label: CLIENT_TAB_LABELS[props.activeTab] },
  ]
  const tabsInput: WorkspaceTabInput[] = [
    { key: 'dashboard', label: 'Dashboard', href: dashboardHref },
    { key: 'settings', label: 'Settings', href: settingsHref },
    { key: 'users', label: 'Team', href: usersHref },
  ]
  const { header, tabs } = buildWorkspaceViewModel({
    header: {
      breadcrumbs,
      contextLabel: 'Client Context',
      title: props.clientName,
      subtitle: props.clientSlug?.trim() ? `Slug: ${props.clientSlug}` : `ID: ${shortId(props.clientId)}`,
      backLink: {
        href: backToAgencyHref,
        label: '\u2190 Back to Agency',
      },
      identityPlacement: 'right',
      titleFontSize: 20,
    },
    tabs: tabsInput,
    activeKey: props.activeTab,
    fallbackActiveKey: 'dashboard',
  })

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
