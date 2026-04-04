import type { ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from '../../../_components/workspace/WorkspaceLayout'
import WorkspaceRecentItems from '../../../_components/workspace/WorkspaceRecentItems'
import WorkspaceQuickSwitcher, {
  type WorkspaceQuickSwitchOption,
} from '../../../_components/workspace/WorkspaceQuickSwitcher'
import WorkspaceShortcuts, { type WorkspaceShortcut } from '../../../_components/workspace/WorkspaceShortcuts'
import WorkspaceStateSync from '../../../_components/workspace/WorkspaceStateSync'
import { buildWorkspaceViewModel, type WorkspaceTabInput } from '../../../_components/workspace/workspace-view-model'
import { buildClientSwitchHref } from '@/src/workspace/context-switching'

type ClientContextTab = 'dashboard' | 'settings' | 'users'

type Props = {
  agencyId: string
  requestedAgencyId: string | null
  memberships: { agency_id: string; agency_name: string | null }[]
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
  const activeClientPathname = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/${activeClientSection}`
  const clientOptions: WorkspaceQuickSwitchOption[] = props.clientOptions.map((option) => ({
    value: option.clientId,
    label: option.label,
    href: buildClientSwitchHref({
      pathname: activeClientPathname,
      params: baseParams,
      targetClientId: option.clientId,
      targetAgencyId: activeAgencyId,
    }),
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
  const clientShortcuts: WorkspaceShortcut[] = [
    {
      id: 'view-sites',
      label: 'View Sites',
      href: dashboardHref,
      description: 'Open client dashboard and sites overview',
      icon: 'S',
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      href: settingsHref,
      description: 'Open client settings',
      icon: 'G',
    },
    {
      id: 'open-team',
      label: 'Open Team',
      href: usersHref,
      description: 'Open client user access',
      icon: 'T',
    },
    {
      id: 'back-to-agency',
      label: 'Back to Agency',
      href: backToAgencyHref,
      description: 'Return to parent agency workspace',
      icon: 'A',
    },
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
            persistStateOnChange={{
              activeAgencyId,
            }}
            persistStateValueKey='activeClientId'
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
      commandPalette={{
        agencies: props.memberships.map((membership) => ({
          id: membership.agency_id,
          label: membership.agency_name?.trim() || membership.agency_id,
          sublabel: `Agency ID: ${membership.agency_id}`,
          href: `/gnr8/agency?agency=${encodeURIComponent(membership.agency_id)}`,
        })),
        clients: props.clientOptions.map((client) => ({
          id: client.clientId,
          label: client.label,
          sublabel: `Agency ID: ${activeAgencyId}`,
          href: buildClientSwitchHref({
            pathname: activeClientPathname,
            params: baseParams,
            targetClientId: client.clientId,
            targetAgencyId: activeAgencyId,
          }),
        })),
        routes: [
          { id: 'route-agency-dashboard', label: 'Agency Dashboard', href: backToAgencyHref, sublabel: 'Key route' },
          { id: 'route-agency-clients', label: 'Agency Clients', href: agencyClientsHref, sublabel: 'Key route' },
          { id: 'route-agency-settings', label: 'Agency Settings', href: `/gnr8/agency/settings?${agencyParam}`, sublabel: 'Key route' },
          { id: 'route-client-dashboard', label: 'Client Dashboard', href: dashboardHref, sublabel: 'Key route' },
          { id: 'route-client-settings', label: 'Client Settings', href: settingsHref, sublabel: 'Key route' },
          { id: 'route-client-team', label: 'Client Team', href: usersHref, sublabel: 'Key route' },
        ],
        accessibleAgencyIds: props.memberships.map((membership) => membership.agency_id),
        accessibleClientIds: props.clientOptions.map((option) => option.clientId),
      }}
      afterTabs={
        <div style={{ marginTop: 12 }}>
          {props.activeTab !== 'dashboard' ? (
            <WorkspaceShortcuts
              title='Productivity Shortcuts'
              helperText='Fast actions for current client workspace scope.'
              shortcuts={clientShortcuts}
            />
          ) : null}
          <WorkspaceRecentItems
            accessibleAgencyIds={[activeAgencyId]}
            accessibleClientIds={props.clientOptions.map((option) => option.clientId)}
            title='Recent Items'
            maxVisible={6}
          />
        </div>
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
