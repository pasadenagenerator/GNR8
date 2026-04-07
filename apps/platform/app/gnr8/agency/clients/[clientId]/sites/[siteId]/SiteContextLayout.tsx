import type { ReactNode } from 'react'

import WorkspaceLayout, { type WorkspaceBreadcrumbItem } from '../../../../../_components/workspace/WorkspaceLayout'
import WorkspaceRecentItems from '../../../../../_components/workspace/WorkspaceRecentItems'
import WorkspaceShortcuts, { type WorkspaceShortcut } from '../../../../../_components/workspace/WorkspaceShortcuts'
import WorkspaceStateSync from '../../../../../_components/workspace/WorkspaceStateSync'
import { buildWorkspaceViewModel, type WorkspaceTabInput } from '../../../../../_components/workspace/workspace-view-model'
import { type SiteWorkspaceReadModel } from '@/gnr8/site/site-workspace-read-model'
import { siteWorkspaceHref, type SiteWorkspaceTab } from '@/gnr8/site/site-workspace-navigation'

type Props = {
  activeTab: SiteWorkspaceTab
  readModel: SiteWorkspaceReadModel
  agencyId: string
  requestedAgencyId: string | null
  adminView: boolean
  memberships: { agency_id: string; agency_name: string | null }[]
  clientOptions: { clientId: string; label: string }[]
  selectedVariantId: string | null
  children: ReactNode
}

const SITE_TAB_LABELS: Record<SiteWorkspaceTab, string> = {
  overview: 'Overview',
  structure: 'Structure',
  design: 'Design',
  preview: 'Preview',
  settings: 'Settings',
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

export default function SiteContextLayout(props: Props) {
  const activeAgencyId = props.requestedAgencyId || props.agencyId
  const query = new URLSearchParams()
  query.set('agency', activeAgencyId)
  if (props.adminView) query.set('admin_view', '1')

  const agencyQuery = query.toString()

  const overviewHref = siteWorkspaceHref({
    clientId: props.readModel.client.clientId,
    siteId: props.readModel.site.id,
    tab: 'overview',
    agencyId: activeAgencyId,
    adminView: props.adminView,
    variantId: props.selectedVariantId,
  })
  const structureHref = siteWorkspaceHref({
    clientId: props.readModel.client.clientId,
    siteId: props.readModel.site.id,
    tab: 'structure',
    agencyId: activeAgencyId,
    adminView: props.adminView,
    variantId: props.selectedVariantId,
  })
  const designHref = siteWorkspaceHref({
    clientId: props.readModel.client.clientId,
    siteId: props.readModel.site.id,
    tab: 'design',
    agencyId: activeAgencyId,
    adminView: props.adminView,
    variantId: props.selectedVariantId,
  })
  const previewHref = siteWorkspaceHref({
    clientId: props.readModel.client.clientId,
    siteId: props.readModel.site.id,
    tab: 'preview',
    agencyId: activeAgencyId,
    adminView: props.adminView,
    variantId: props.selectedVariantId,
  })
  const settingsHref = siteWorkspaceHref({
    clientId: props.readModel.client.clientId,
    siteId: props.readModel.site.id,
    tab: 'settings',
    agencyId: activeAgencyId,
    adminView: props.adminView,
    variantId: props.selectedVariantId,
  })

  const backToClientHref = `/gnr8/agency/clients/${encodeURIComponent(props.readModel.client.clientId)}/dashboard?${agencyQuery}`
  const agencyClientsHref = `/gnr8/agency/clients?${agencyQuery}`
  const agencyHomeHref = `/gnr8/agency?${agencyQuery}`
  const commandCenterHref = props.adminView ? '/gnr8/command-center?admin_view=1' : '/gnr8/command-center'

  const breadcrumbs: WorkspaceBreadcrumbItem[] = [
    { label: 'Command Center', href: commandCenterHref },
    { label: 'Agency', href: agencyHomeHref },
    { label: 'Client', href: backToClientHref },
    { label: props.readModel.site.label, href: overviewHref },
    { label: SITE_TAB_LABELS[props.activeTab] },
  ]

  const tabsInput: WorkspaceTabInput[] = [
    { key: 'overview', label: 'Overview', href: overviewHref },
    { key: 'structure', label: 'Structure', href: structureHref },
    { key: 'design', label: 'Design', href: designHref },
    { key: 'preview', label: 'Preview', href: previewHref },
    { key: 'settings', label: 'Settings', href: settingsHref },
  ]

  const shortcuts: WorkspaceShortcut[] = [
    {
      id: 'site-overview',
      label: 'Overview',
      href: overviewHref,
      description: 'Open site overview',
      icon: 'O',
    },
    {
      id: 'site-preview',
      label: 'Open Preview',
      href: previewHref,
      description: 'Open site preview tab',
      icon: 'P',
    },
    {
      id: 'site-rerun',
      label: 'Re-run Transformation',
      href: overviewHref,
      description: 'Execute re-run from the Site Actions panel',
      icon: 'R',
    },
    {
      id: 'site-structure',
      label: 'View Structure',
      href: structureHref,
      description: 'Inspect detected sections and confidence',
      icon: 'S',
    },
    {
      id: 'site-design',
      label: 'View Design Decisions',
      href: designHref,
      description: 'Inspect design strategy and rationale',
      icon: 'D',
    },
    {
      id: 'back-client',
      label: 'Back to Client',
      href: backToClientHref,
      description: 'Return to client dashboard',
      icon: 'C',
    },
  ]

  const { header, tabs } = buildWorkspaceViewModel({
    header: {
      breadcrumbs,
      contextLabel: 'Site Workspace',
      title: props.readModel.site.label,
      subtitle: props.readModel.site.domain
        ? `${props.readModel.site.domain} · ${props.readModel.overview.statusLabel.replace('_', ' ')}`
        : `Site ID: ${shortId(props.readModel.site.id)} · ${props.readModel.overview.statusLabel.replace('_', ' ')}`,
      backLink: {
        href: backToClientHref,
        label: '\u2190 Back to Client',
      },
      identityPlacement: 'right',
      titleFontSize: 20,
    },
    tabs: tabsInput,
    activeKey: props.activeTab,
    fallbackActiveKey: 'overview',
  })

  const siblingSiteRoutes = props.readModel.siteOptions.flatMap((siteOption) => {
    const label = siteOption.label.trim() || shortId(siteOption.siteId)
    return [
      {
        id: `route-site-${siteOption.siteId}-overview`,
        label: `Open Site: ${label}`,
        href: siteWorkspaceHref({
          clientId: props.readModel.client.clientId,
          siteId: siteOption.siteId,
          tab: 'overview',
          agencyId: activeAgencyId,
          adminView: props.adminView,
          variantId: props.selectedVariantId,
        }),
        sublabel: 'Site route',
      },
      {
        id: `route-site-${siteOption.siteId}-preview`,
        label: `Open Site Preview: ${label}`,
        href: siteWorkspaceHref({
          clientId: props.readModel.client.clientId,
          siteId: siteOption.siteId,
          tab: 'preview',
          agencyId: activeAgencyId,
          adminView: props.adminView,
          variantId: props.selectedVariantId,
        }),
        sublabel: 'Site route',
      },
      {
        id: `route-site-${siteOption.siteId}-design`,
        label: `Open Site Design: ${label}`,
        href: siteWorkspaceHref({
          clientId: props.readModel.client.clientId,
          siteId: siteOption.siteId,
          tab: 'design',
          agencyId: activeAgencyId,
          adminView: props.adminView,
          variantId: props.selectedVariantId,
        }),
        sublabel: 'Site route',
      },
      {
        id: `route-site-${siteOption.siteId}-structure`,
        label: `Open Site Structure: ${label}`,
        href: siteWorkspaceHref({
          clientId: props.readModel.client.clientId,
          siteId: siteOption.siteId,
          tab: 'structure',
          agencyId: activeAgencyId,
          adminView: props.adminView,
          variantId: props.selectedVariantId,
        }),
        sublabel: 'Site route',
      },
    ]
  })

  return (
    <WorkspaceLayout
      maxWidth={1320}
      padding={24}
      header={header}
      tabs={tabs}
      tabsAriaLabel='Site workspace navigation'
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
          href: `/gnr8/agency/clients/${encodeURIComponent(client.clientId)}/dashboard?agency=${encodeURIComponent(activeAgencyId)}${props.adminView ? '&admin_view=1' : ''}`,
        })),
        routes: [
          { id: 'route-command-center', label: 'Command Center', href: commandCenterHref, sublabel: 'Key route' },
          { id: 'route-agency-dashboard', label: 'Agency Dashboard', href: agencyHomeHref, sublabel: 'Key route' },
          { id: 'route-agency-clients', label: 'Agency Clients', href: agencyClientsHref, sublabel: 'Key route' },
          { id: 'route-client-dashboard', label: 'Client Dashboard', href: backToClientHref, sublabel: 'Key route' },
          { id: 'route-site-overview', label: `Open Site: ${props.readModel.site.label}`, href: overviewHref, sublabel: 'Site route' },
          { id: 'route-site-preview', label: 'Open Site Preview', href: previewHref, sublabel: 'Site route' },
          { id: 'route-site-design', label: 'Open Site Design', href: designHref, sublabel: 'Site route' },
          { id: 'route-site-structure', label: 'Open Site Structure', href: structureHref, sublabel: 'Site route' },
          ...siblingSiteRoutes,
        ],
        accessibleAgencyIds: props.memberships.map((membership) => membership.agency_id),
        accessibleClientIds: props.clientOptions.map((option) => option.clientId),
      }}
      afterTabs={
        <div style={{ marginTop: 12 }}>
          <WorkspaceShortcuts
            title='Site Shortcuts'
            helperText='Fast actions for the active site workspace.'
            shortcuts={shortcuts}
          />
          <WorkspaceRecentItems
            accessibleAgencyIds={[activeAgencyId]}
            accessibleClientIds={props.clientOptions.map((option) => option.clientId)}
            title='Recent Items'
            maxVisible={8}
          />
        </div>
      }
    >
      <WorkspaceStateSync
        activeAgencyId={activeAgencyId}
        activeClientName={props.readModel.client.clientName}
        activeClientId={props.readModel.client.clientId}
        activeSiteId={props.readModel.site.id}
        activeSiteName={props.readModel.site.label}
        lastAgencyTab='clients'
        lastClientTab='dashboard'
      />
      {props.children}
    </WorkspaceLayout>
  )
}
