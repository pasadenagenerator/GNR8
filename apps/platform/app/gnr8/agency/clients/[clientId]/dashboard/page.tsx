import Link from 'next/link'
import { redirect } from 'next/navigation'

import ClientDashboardHome from '@/app/gnr8/_components/client-dashboard/ClientDashboardHome'
import { parseThrownScopeError, resolveClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'
import { listSwitchableAgencyClientsForPage } from '../../client-switcher-options'
import ClientContextLayout from '../ClientContextLayout'
import { getClientDashboardReadModelForPage } from '@/gnr8/client/client-dashboard-read-model'
import { agencyClientSiteImportHref } from '@/gnr8/site/site-importer-routing'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { canPerformAction } from '@/src/auth/rbac'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

type SearchParams = {
  agency?: string
  admin_view?: string
}

type Params = {
  clientId?: string
}

type ClientOrganizationRow = {
  id: string | null
  name: string | null
  agency_id: string | null
  organization_type: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyClientDashboardEntryPage(props: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const resolvedParams = await props.params
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined

  const clientId = normalizeText(resolvedParams.clientId)
  const requestedAgencyId = normalizeText(resolvedSearchParams?.agency) || null
  const adminView = normalizeText(resolvedSearchParams?.admin_view) === '1'

  if (!clientId) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Client scope is required.</p>
        </div>
      </main>
    )
  }

  let currentUserAgency: Awaited<ReturnType<typeof resolveCurrentUserAgencyForPage>> | null = null
  let agencyAccessErrorCode: ResolveCurrentAgencyError['code'] | null = null
  let availableAgencyMemberships: Awaited<ReturnType<typeof listCurrentUserAgencyMembershipsForPage>>['memberships'] = []
  let switchableClients: Awaited<ReturnType<typeof listSwitchableAgencyClientsForPage>> = []

  try {
    const resolvedAgency = await resolveCurrentUserAgencyForPage({
      activeAgencyId: requestedAgencyId,
    })
    currentUserAgency = resolvedAgency
    const membershipContext = await listCurrentUserAgencyMembershipsForPage()
    availableAgencyMemberships = membershipContext.memberships
    switchableClients = await listSwitchableAgencyClientsForPage({ agencyId: resolvedAgency.agency_id })
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError && error.code === 'UNAUTHORIZED') {
      redirect('/login')
    }
    if (error instanceof ResolveCurrentAgencyError) {
      agencyAccessErrorCode = error.code
      try {
        const membershipContext = await listCurrentUserAgencyMembershipsForPage()
        availableAgencyMemberships = membershipContext.memberships
      } catch (membershipError) {
        if (!(membershipError instanceof ResolveCurrentAgencyError && membershipError.code === 'UNAUTHORIZED')) {
          throw membershipError
        }
      }
    } else {
      throw error
    }
  }

  if (currentUserAgency == null) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            {agencyAccessErrorCode === 'NO_MEMBERSHIP'
              ? 'No agency membership found for this account.'
              : agencyAccessErrorCode === 'ACTIVE_AGENCY_REQUIRED'
                ? 'Select an agency before opening a client dashboard.'
                : 'Agency scope is unavailable for this client view.'}
          </p>
          {availableAgencyMemberships.length > 0 ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {availableAgencyMemberships.map((membership) => (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency/clients/${encodeURIComponent(clientId)}/dashboard?agency=${encodeURIComponent(membership.agency_id)}&client_tab=dashboard`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid #fecaca',
                    background: '#fff',
                    color: '#991b1b',
                    textDecoration: 'none',
                    fontSize: 12,
                  }}
                >
                  {(membership.agency_name?.trim() || membership.agency_id).trim()}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </main>
    )
  }

  if (!canPerformAction(currentUserAgency.role, 'view_dashboard')) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Your role is not authorized to view agency-managed client dashboard data.
          </p>
        </div>
      </main>
    )
  }

  const supabase = await getSupabaseServerClientReadOnly()
  const clientResult = await supabase
    .from('organizations')
    .select('id,name,agency_id,organization_type')
    .eq('id', clientId)
    .eq('agency_id', currentUserAgency.agency_id)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()

  if (clientResult.error) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Failed to resolve client scope: {clientResult.error.message}</p>
        </div>
      </main>
    )
  }

  const client = clientResult.data as ClientOrganizationRow | null
  if (!client) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Dashboard</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Client scope is invalid for this agency context. Access is blocked by fail-closed policy.
          </p>
        </div>
      </main>
    )
  }

  const readModel = await getClientDashboardReadModelForPage({
    clientId,
    agencyId: currentUserAgency.agency_id,
    limit: 120,
  })
  const agencyParam = `agency=${encodeURIComponent(currentUserAgency.agency_id)}${adminView ? '&admin_view=1' : ''}`
  const settingsHref = `/gnr8/agency/clients/${encodeURIComponent(clientId)}/settings?${agencyParam}`
  const teamHref = `/gnr8/agency/clients/${encodeURIComponent(clientId)}/users?${agencyParam}`
  const backToAgencyHref = `/gnr8/agency?${agencyParam}`
  const clientSelfHref = `/gnr8/client?client=${encodeURIComponent(clientId)}&client_tab=dashboard`
  const importSiteHref = agencyClientSiteImportHref({
    clientId,
    agencyId: currentUserAgency.agency_id,
    adminView,
  })
  let templateScopeErrorMessage: string | null = null
  try {
    await resolveClientTemplateScope({ clientIdParam: clientId })
  } catch (error) {
    templateScopeErrorMessage = parseThrownScopeError(error).message
  }

  return (
    <ClientContextLayout
      agencyId={currentUserAgency.agency_id}
      requestedAgencyId={requestedAgencyId}
      memberships={availableAgencyMemberships}
      adminView={adminView}
      clientId={clientId}
      clientName={readModel.client.client_name?.trim() || shortId(clientId)}
      clientOptions={switchableClients}
      siteOptions={readModel.site_rows.map((site) => ({
        siteId: site.site_id,
        label: site.domain?.trim() || shortId(site.site_id),
      }))}
      activeTab='dashboard'
    >
      <ClientDashboardHome
        clientId={clientId}
        readModel={readModel}
        roleLabel={currentUserAgency.role}
        viewMode='agency-managed'
        templateScopeErrorMessage={templateScopeErrorMessage}
        backToAgencyHref={backToAgencyHref}
        settingsHref={settingsHref}
        teamHref={teamHref}
        clientSelfHref={clientSelfHref}
        importSiteHref={importSiteHref}
        siteWorkspaceHrefBuilder={(siteId) =>
          `/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/overview?${agencyParam}`
        }
      />
    </ClientContextLayout>
  )
}
