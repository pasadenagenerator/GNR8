import type { ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from '../../../_components/workspace/WorkspaceLayout'
import WorkspaceRecentItems from '../../../_components/workspace/WorkspaceRecentItems'
import WorkspaceQuickSwitcher, {
  type WorkspaceQuickSwitchOption,
} from '../../../_components/workspace/WorkspaceQuickSwitcher'
import WorkspaceShortcuts, { type WorkspaceShortcut } from '../../../_components/workspace/WorkspaceShortcuts'
import WorkspaceStateSync from '../../../_components/workspace/WorkspaceStateSync'
import { buildWorkspaceViewModel, type WorkspaceTabInput } from '../../../_components/workspace/workspace-view-model'
import { agencyClientSiteCreateHref, agencyClientSiteImportHref } from '@/gnr8/site/site-importer-routing'
import { buildClientSwitchHref } from '@/src/workspace/context-switching'

type ClientContextTab = 'dashboard' | 'settings' | 'users'

type Props = {
  agencyId: string
  requestedAgencyId: string | null
  memberships: { agency_id: string; agency_name: string | null }[]
  adminView?: boolean
  clientId: string
  clientName: string
  clientSlug?: string | null
  clientOptions: { clientId: string; label: string }[]
  siteOptions?: { siteId: string; label: string }[]
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
  if (props.adminView) baseParams.set('admin_view', '1')
  const agencyParam = baseParams.toString()
  const explicitDashboardParams = new URLSearchParams(baseParams.toString())
  explicitDashboardParams.set('client_tab', 'dashboard')
  const explicitDashboardParam = explicitDashboardParams.toString()

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
  const explicitDashboardHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/dashboard?${explicitDashboardParam}`
  const settingsHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/settings?${agencyParam}`
  const usersHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users?${agencyParam}`
  const importHref = agencyClientSiteImportHref({
    clientId: props.clientId,
    agencyId: activeAgencyId,
    adminView: props.adminView,
  })
  const createWebsiteHref = agencyClientSiteCreateHref({
    clientId: props.clientId,
    agencyId: activeAgencyId,
    adminView: props.adminView,
  })
  const backToAgencyHref = `/gnr8/agency?${agencyParam}`
  const agencyClientsHref = `/gnr8/agency/clients?${agencyParam}`
  const breadcrumbs: WorkspaceBreadcrumbItem[] = [
    { label: 'Agency', href: backToAgencyHref },
    { label: 'Clients', href: agencyClientsHref },
    { label: props.clientName, href: explicitDashboardHref },
    { label: CLIENT_TAB_LABELS[props.activeTab] },
  ]
  const tabsInput: WorkspaceTabInput[] = [
    { key: 'dashboard', label: 'Dashboard', href: explicitDashboardHref },
    { key: 'settings', label: 'Settings', href: settingsHref },
    { key: 'users', label: 'Team', href: usersHref },
  ]
  const siteRouteEntries =
    props.siteOptions?.flatMap((site) => {
      const siteLabel = site.label.trim() || shortId(site.siteId)
      const siteOverviewHref = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(site.siteId)}/overview?${agencyParam}`
      return [
        { id: `route-site-${site.siteId}-overview`, label: `Open Site: ${siteLabel}`, href: siteOverviewHref, sublabel: 'Site route' },
        {
          id: `route-site-${site.siteId}-preview`,
          label: `Open Site Preview: ${siteLabel}`,
          href: `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(site.siteId)}/preview?${agencyParam}`,
          sublabel: 'Site route',
        },
        {
          id: `route-site-${site.siteId}-design`,
          label: `Open Site Design: ${siteLabel}`,
          href: `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(site.siteId)}/design?${agencyParam}`,
          sublabel: 'Site route',
        },
        {
          id: `route-site-${site.siteId}-structure`,
          label: `Open Site Structure: ${siteLabel}`,
          href: `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(site.siteId)}/structure?${agencyParam}`,
          sublabel: 'Site route',
        },
      ]
    }) ?? []
  const clientShortcuts: WorkspaceShortcut[] = [
    {
      id: 'view-sites',
      label: 'View Sites',
      href: explicitDashboardHref,
      description: 'Open client dashboard and sites overview',
      icon: 'S',
    },
    {
      id: 'import-site',
      label: 'Import Site',
      href: importHref,
      description: 'Import a website into this client workspace',
      icon: 'I',
    },
    {
      id: 'add-website',
      label: 'Add Website',
      href: createWebsiteHref,
      description: 'Create a new website from a template',
      icon: 'W',
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
          href: `/gnr8/agency?agency=${encodeURIComponent(membership.agency_id)}${props.adminView ? '&admin_view=1' : ''}`,
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
          { id: 'route-client-dashboard', label: 'Client Dashboard', href: explicitDashboardHref, sublabel: 'Key route' },
          { id: 'route-client-import', label: 'Import Site', href: importHref, sublabel: 'Key route' },
          { id: 'route-client-create-site', label: 'Add New Website', href: createWebsiteHref, sublabel: 'Key route' },
          { id: 'route-client-settings', label: 'Client Settings', href: settingsHref, sublabel: 'Key route' },
          { id: 'route-client-team', label: 'Client Team', href: usersHref, sublabel: 'Key route' },
          ...siteRouteEntries,
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
