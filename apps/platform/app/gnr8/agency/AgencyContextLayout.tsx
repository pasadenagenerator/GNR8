import type { ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from '../_components/workspace/WorkspaceLayout'
import WorkspaceRecentItems from '../_components/workspace/WorkspaceRecentItems'
import WorkspaceQuickSwitcher, { type WorkspaceQuickSwitchOption } from '../_components/workspace/WorkspaceQuickSwitcher'
import WorkspaceShortcuts, { type WorkspaceShortcut } from '../_components/workspace/WorkspaceShortcuts'
import WorkspaceStateSync from '../_components/workspace/WorkspaceStateSync'
import { buildWorkspaceViewModel, type WorkspaceTabInput } from '../_components/workspace/workspace-view-model'
import { listSwitchableAgencyClientsForPage } from './clients/client-switcher-options'
import { buildAgencySwitchHref } from '@/src/workspace/context-switching'
import { canPerformAction } from '@/src/auth/rbac'

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

const AGENCY_TAB_LABELS: Record<AgencyContextTab, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  members: 'Team',
  settings: 'Settings',
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

function buildHref(path: string, params: URLSearchParams): string {
  const query = params.toString()
  if (!query) return path
  return `${path}?${query}`
}

function buildAgencyBreadcrumbs(input: {
  isAdminView: boolean
  activeTab: AgencyContextTab
  agencyName: string
  dashboardHref: string
}): WorkspaceBreadcrumbItem[] {
  const activeLabel = AGENCY_TAB_LABELS[input.activeTab]

  if (input.isAdminView) {
    const breadcrumbs: WorkspaceBreadcrumbItem[] = [
      { label: 'Command Center', href: '/gnr8/command-center' },
      { label: 'Agencies', href: '/gnr8/command-center/agencies' },
      { label: input.agencyName, href: input.dashboardHref },
      { label: activeLabel },
    ]
    return breadcrumbs
  }

  return [{ label: 'Agency', href: input.dashboardHref }, { label: activeLabel }]
}

function agencyPathForTab(tab: AgencyContextTab): string {
  if (tab === 'clients') return '/gnr8/agency/clients'
  if (tab === 'members') return '/gnr8/agency/members'
  if (tab === 'settings') return '/gnr8/agency/settings'
  return '/gnr8/agency'
}

export default async function AgencyContextLayout(props: Props) {
  const actorMode = props.actorMode ?? 'membership'
  const isAdminView = actorMode === 'admin_view'
  const activeAgencyId = props.requestedAgencyId || props.agencyId

  const queryParams = new URLSearchParams()
  queryParams.set('agency', activeAgencyId)
  if (isAdminView) {
    queryParams.set('admin_view', '1')
  }
  const explicitDashboardTabParams = new URLSearchParams(queryParams.toString())
  explicitDashboardTabParams.set('agency_tab', 'dashboard')

  const dashboardHref = buildHref('/gnr8/agency', queryParams)
  const explicitDashboardTabHref = buildHref('/gnr8/agency', explicitDashboardTabParams)
  const clientsHref = buildHref('/gnr8/agency/clients', queryParams)
  const membersHref = buildHref('/gnr8/agency/members', queryParams)
  const settingsHref = buildHref('/gnr8/agency/settings', queryParams)
  const activeAgencyPath = agencyPathForTab(props.activeTab)
  const agencyOptions: WorkspaceQuickSwitchOption[] = props.memberships.map((membership) => ({
    value: membership.agency_id,
    label: membership.agency_name?.trim() || membership.agency_id,
    href: buildAgencySwitchHref({
      pathname: activeAgencyPath,
      params: queryParams,
      targetAgencyId: membership.agency_id,
    }),
  }))
  const switchableClients = await listSwitchableAgencyClientsForPage({ agencyId: activeAgencyId })
  const scopedAgencyIds = props.memberships.map((membership) => membership.agency_id)
  const scopedClientIds = switchableClients.map((client) => client.clientId)
  const clientDashboardHref = switchableClients[0]
    ? buildHref(
        `/gnr8/agency/clients/${encodeURIComponent(switchableClients[0].clientId)}/dashboard`,
        new URLSearchParams(
          isAdminView
            ? [
                ['agency', activeAgencyId],
                ['admin_view', '1'],
              ]
            : [['agency', activeAgencyId]],
        ),
      )
    : null
  const clientSettingsHref = switchableClients[0]
    ? buildHref(
        `/gnr8/agency/clients/${encodeURIComponent(switchableClients[0].clientId)}/settings`,
        new URLSearchParams([['agency', activeAgencyId]]),
      )
    : null
  const clientTeamHref = switchableClients[0]
    ? buildHref(
        `/gnr8/agency/clients/${encodeURIComponent(switchableClients[0].clientId)}/users`,
        new URLSearchParams([['agency', activeAgencyId]]),
      )
    : null
  const tabsInput: WorkspaceTabInput[] = [
    { key: 'dashboard', label: 'Dashboard', href: explicitDashboardTabHref },
    { key: 'clients', label: 'Clients', href: clientsHref },
    { key: 'members', label: 'Team', href: membersHref },
    { key: 'settings', label: 'Settings', href: settingsHref },
  ]
  const agencyShortcuts: WorkspaceShortcut[] = [
    ...(canPerformAction(props.role, 'create_client') && !isAdminView
      ? [
          {
            id: 'add-client',
            label: 'Add Client',
            href: buildHref('/gnr8/agency/clients/new', queryParams),
            description: 'Start client provisioning in current scope',
            icon: '+',
          },
        ]
      : []),
    {
      id: 'open-clients',
      label: 'Open Clients',
      href: clientsHref,
      description: 'Go to current agency client list',
      icon: 'C',
    },
    {
      id: 'open-team',
      label: 'Open Team',
      href: membersHref,
      description: 'Open agency membership workspace',
      icon: 'T',
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      href: settingsHref,
      description: 'Open agency settings and profile',
      icon: 'S',
    },
  ]
  const persistedAgencyTab = props.activeTab === 'members' ? 'team' : props.activeTab
  const { header, tabs } = buildWorkspaceViewModel({
    header: {
      breadcrumbs: buildAgencyBreadcrumbs({
        isAdminView,
        activeTab: props.activeTab,
        agencyName: props.agencyName,
        dashboardHref,
      }),
      contextLabel: isAdminView ? 'Agency Context (Admin View)' : 'Agency Context',
      title: `Agency: ${props.agencyName}`,
      subtitle: props.agencySlug?.trim() ? `Slug: ${props.agencySlug.trim()}` : `ID: ${shortId(props.agencyId)}`,
      backLink: isAdminView
        ? {
            href: '/gnr8/command-center',
            label: '\u2190 Back to Command Center',
          }
        : undefined,
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
    },
    tabs: tabsInput,
    activeKey: props.activeTab,
    fallbackActiveKey: 'dashboard',
  })

  return (
    <WorkspaceLayout
      maxWidth={1440}
      padding={24}
      header={header}
      tabs={tabs}
      tabsAriaLabel='Agency context navigation'
      commandPalette={{
        agencies: props.memberships.map((membership) => ({
          id: membership.agency_id,
          label: membership.agency_name?.trim() || membership.agency_id,
          sublabel: `Agency ID: ${membership.agency_id}`,
          href: buildAgencySwitchHref({
            pathname: activeAgencyPath,
            params: queryParams,
            targetAgencyId: membership.agency_id,
          }),
        })),
        clients: switchableClients.map((client) => ({
          id: client.clientId,
          label: client.label,
          sublabel: `Agency: ${props.agencyName}`,
          href: `/gnr8/agency/clients/${encodeURIComponent(client.clientId)}/dashboard?agency=${encodeURIComponent(activeAgencyId)}`,
        })),
        routes: [
          ...(isAdminView
            ? [{ id: 'route-command-center', label: 'Command Center', href: '/gnr8/command-center', sublabel: 'Global route' }]
            : []),
          { id: 'route-agency-dashboard', label: 'Agency Dashboard', href: dashboardHref, sublabel: 'Key route' },
          { id: 'route-agency-clients', label: 'Agency Clients', href: clientsHref, sublabel: 'Key route' },
          { id: 'route-agency-settings', label: 'Agency Settings', href: settingsHref, sublabel: 'Key route' },
          ...(clientDashboardHref
            ? [{ id: 'route-client-dashboard', label: 'Client Dashboard', href: clientDashboardHref, sublabel: 'Key route' }]
            : []),
          ...(clientSettingsHref
            ? [{ id: 'route-client-settings', label: 'Client Settings', href: clientSettingsHref, sublabel: 'Key route' }]
            : []),
          ...(clientTeamHref ? [{ id: 'route-client-team', label: 'Client Team', href: clientTeamHref, sublabel: 'Key route' }] : []),
        ],
        accessibleAgencyIds: scopedAgencyIds,
        accessibleClientIds: scopedClientIds,
        allowCommandCenter: isAdminView,
      }}
      afterTabs={
        <div style={{ marginTop: 12 }}>
          <WorkspaceShortcuts
            title='Productivity Shortcuts'
            helperText='Fast routes for common agency workspace actions.'
            shortcuts={agencyShortcuts}
          />
          {!isAdminView && props.memberships.length > 1 ? (
            <div>
              <WorkspaceQuickSwitcher
                label='Switch Agency'
                currentValue={activeAgencyId}
                options={agencyOptions}
                persistStateOnChange={{
                  activeClientId: undefined,
                }}
                persistStateValueKey='activeAgencyId'
              />
            </div>
          ) : null}
          <WorkspaceRecentItems
            accessibleAgencyIds={scopedAgencyIds}
            accessibleClientIds={scopedClientIds}
            allowCommandCenter={isAdminView}
            title='Recent Items'
            maxVisible={6}
          />
        </div>
      }
    >
      <WorkspaceStateSync
        activeAgencyId={activeAgencyId}
        activeAgencyName={props.agencyName}
        lastAgencyTab={persistedAgencyTab}
      />
      {props.children}
    </WorkspaceLayout>
  )
}
