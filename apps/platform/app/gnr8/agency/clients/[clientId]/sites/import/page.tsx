import { redirect } from 'next/navigation'

import { listSwitchableAgencyClientsForPage } from '../../../client-switcher-options'
import ClientContextLayout from '../../ClientContextLayout'
import SiteImporterClient from './SiteImporterClient'
import { getClientDashboardReadModelForPage } from '@/gnr8/client/client-dashboard-read-model'
import { canAccessClientScopedImporter } from '@/gnr8/site/site-importer-routing'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { requireSuperadminUserIdForPage } from '@/src/auth/require-superadmin-user-id'
import type { AgencyRole } from '@/src/auth/rbac'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

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

type PageAgencyContext = Omit<Awaited<ReturnType<typeof resolveCurrentUserAgencyForPage>>, 'role'> & {
  role: AgencyRole
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

export default async function AgencyClientSiteImportPage(props: {
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
        <h1 style={{ marginTop: 0 }}>Site Import</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Client scope is required.</p>
        </div>
      </main>
    )
  }

  let currentUserAgency: PageAgencyContext | null = null
  let availableAgencyMemberships: Awaited<ReturnType<typeof listCurrentUserAgencyMembershipsForPage>>['memberships'] = []

  if (adminView && requestedAgencyId) {
    try {
      const userId = await requireSuperadminUserIdForPage()
      currentUserAgency = {
        user_id: userId,
        agency_id: requestedAgencyId,
        agency_name: null,
        agency_logo_url: null,
        role: 'superadmin',
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') redirect('/login')
      throw error
    }
  } else {
    try {
      const resolvedAgency = await resolveCurrentUserAgencyForPage({
        activeAgencyId: requestedAgencyId,
      })
      currentUserAgency = resolvedAgency
      const membershipContext = await listCurrentUserAgencyMembershipsForPage()
      availableAgencyMemberships = membershipContext.memberships
    } catch (error) {
      if (error instanceof ResolveCurrentAgencyError && error.code === 'UNAUTHORIZED') {
        redirect('/login')
      }
      if (!(error instanceof ResolveCurrentAgencyError)) {
        throw error
      }
    }
  }

  if (currentUserAgency == null) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Site Import</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Agency scope is unavailable for this client import workflow.</p>
        </div>
      </main>
    )
  }

  if (!canAccessClientScopedImporter(currentUserAgency.role)) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Site Import</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Your role is not authorized to import sites for this client.
          </p>
        </div>
      </main>
    )
  }

  let client: ClientOrganizationRow | null = null
  let clientLookupError: string | null = null

  if (currentUserAgency.role === 'superadmin') {
    const supabase = getSupabaseServiceRoleClient()
    if (!supabase) {
      clientLookupError = 'Server-owned client scope lookup is unavailable.'
    } else {
      const clientResult = await supabase
        .from('organizations')
        .select('id,name,agency_id,organization_type')
        .eq('id', clientId)
        .eq('agency_id', currentUserAgency.agency_id)
        .eq('organization_type', 'client')
        .limit(1)
        .maybeSingle()
      clientLookupError = clientResult.error?.message ?? null
      client = (clientResult.data as ClientOrganizationRow | null) ?? null
    }
  } else {
    const supabase = await getSupabaseServerClientReadOnly()
    const clientResult = await supabase
      .from('organizations')
      .select('id,name,agency_id,organization_type')
      .eq('id', clientId)
      .eq('agency_id', currentUserAgency.agency_id)
      .eq('organization_type', 'client')
      .limit(1)
      .maybeSingle()
    clientLookupError = clientResult.error?.message ?? null
    client = (clientResult.data as ClientOrganizationRow | null) ?? null
  }

  if (clientLookupError) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Site Import</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Failed to resolve client scope: {clientLookupError}</p>
        </div>
      </main>
    )
  }

  if (!client) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Site Import</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Client scope is invalid for this agency context. Access is blocked by fail-closed policy.
          </p>
        </div>
      </main>
    )
  }

  const [switchableClients, readModel] = await Promise.all([
    listSwitchableAgencyClientsForPage({
      agencyId: currentUserAgency.agency_id,
      serverOwned: currentUserAgency.role === 'superadmin',
    }),
    getClientDashboardReadModelForPage({
      clientId,
      agencyId: currentUserAgency.agency_id,
      limit: 120,
      serverOwned: currentUserAgency.role === 'superadmin',
    }),
  ])

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
        label: site.name?.trim() || site.domain?.trim() || shortId(site.site_id),
      }))}
      activeTab='dashboard'
    >
      <SiteImporterClient
        clientId={clientId}
        clientName={readModel.client.client_name?.trim() || shortId(clientId)}
        agencyId={currentUserAgency.agency_id}
        adminView={adminView}
      />
    </ClientContextLayout>
  )
}
