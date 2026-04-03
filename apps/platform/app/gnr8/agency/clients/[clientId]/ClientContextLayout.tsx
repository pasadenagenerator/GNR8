import type { ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from '../../../_components/workspace/WorkspaceLayout'
import WorkspaceRecentItems from '../../../_components/workspace/WorkspaceRecentItems'
import WorkspaceQuickSwitcher, {
  type WorkspaceQuickSwitchOption,
} from '../../../_components/workspace/WorkspaceQuickSwitcher'
import WorkspaceStateSync from '../../../_components/workspace/WorkspaceStateSync'
import { buildWorkspaceViewModel, type WorkspaceTabInput } from '../../../_components/workspace/workspace-view-model'

type ClientContextTab = 'dashboard' | 'settings' | 'users'

type Props = {
  agencyId: string
  requestedAgencyId: string | null
  clientId: string
  clientName: string
  clientSlug?: string | null
  clientOptions: { clientId: string; label: string }[]
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
  const baseParams = new URLSearchParams()
  baseParams.set('agency', activeAgencyId)
  const agencyParam = baseParams.toString()

  const activeClientSection = props.activeTab === 'settings' ? 'settings' : props.activeTab === 'users' ? 'users' : 'dashboard'
  const persistedClientTab = props.activeTab === 'users' ? 'team' : props.activeTab
  const clientOptions: WorkspaceQuickSwitchOption[] = props.clientOptions.map((option) => ({
    value: option.clientId,
    label: option.label,
    href: `/gnr8/agency/clients/${encodeURIComponent(option.clientId)}/${activeClientSection}?${agencyParam}`,
  }))

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
      meta:
        clientOptions.length > 1 ? (
          <WorkspaceQuickSwitcher
            label='Switch Client'
            currentValue={props.clientId}
            options={clientOptions}
            persistStateOnChange={(nextClientId) => ({
              activeAgencyId,
              activeClientId: nextClientId,
              lastAgencyTab: 'clients',
              lastClientTab: persistedClientTab,
            })}
          />
        ) : undefined,
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
      afterTabs={
        <WorkspaceRecentItems
          accessibleAgencyIds={[activeAgencyId]}
          accessibleClientIds={props.clientOptions.map((option) => option.clientId)}
          title='Recent Items'
          maxVisible={6}
        />
      }
    >
      <WorkspaceStateSync
        activeAgencyId={activeAgencyId}
        activeClientName={props.clientName}
        activeClientId={props.clientId}
        lastAgencyTab='clients'
        lastClientTab={persistedClientTab}
      />
      {props.children}
    </WorkspaceLayout>
  )
}
