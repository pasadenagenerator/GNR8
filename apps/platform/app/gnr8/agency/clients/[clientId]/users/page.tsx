import Link from 'next/link'
import { redirect } from 'next/navigation'

import ClientUsersClient from './ClientUsersClient'
import { listSwitchableAgencyClientsForPage } from '../../client-switcher-options'
import ClientContextLayout from '../ClientContextLayout'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { canPerformAction } from '@/src/auth/rbac'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

type SearchParams = {
  agency?: string
}

type Params = {
  clientId?: string
}

type ClientOrganizationRow = {
  id: string | null
  name: string | null
  slug: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClientUsersPage(props: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const resolvedParams = await props.params
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined

  const clientId = normalizeText(resolvedParams.clientId)
  const requestedAgencyId = normalizeText(resolvedSearchParams?.agency) || null

  if (!clientId) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client User Access</h1>
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
      <main
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: 24,
          background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          minHeight: '100vh',
        }}
      >
        <header style={{ display: 'grid', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>Client User Access</h1>
          <p style={{ margin: 0, color: '#334155' }}>Agency-scoped client user management for authenticated memberships.</p>
        </header>

        <section
          style={{
            marginTop: 16,
            border: '1px solid #fecaca',
            borderRadius: 12,
            background: '#fff5f5',
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, color: '#991b1b' }}>
            {agencyAccessErrorCode === 'NO_MEMBERSHIP'
              ? 'No agency access'
              : agencyAccessErrorCode === 'ACTIVE_AGENCY_REQUIRED'
                ? 'Select agency to continue'
                : 'Agency access unavailable'}
          </h2>
          <p style={{ marginBottom: 0, color: '#7f1d1d' }}>
            {agencyAccessErrorCode === 'NO_MEMBERSHIP'
              ? 'Your account is authenticated but has no agency membership yet.'
              : agencyAccessErrorCode === 'ACTIVE_AGENCY_REQUIRED' || agencyAccessErrorCode === 'ACTIVE_AGENCY_INVALID'
                ? 'Your account belongs to multiple agencies. Select one valid agency context to continue.'
                : 'Your membership is invalid or ambiguous. Access is blocked until this is resolved.'}
          </p>

          {availableAgencyMemberships.length > 0 ? (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {availableAgencyMemberships.map((membership) => (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency/clients/${encodeURIComponent(clientId)}/users?agency=${encodeURIComponent(membership.agency_id)}`}
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
        </section>
      </main>
    )
  }

  if (!canPerformAction(currentUserAgency.role, 'view_client_users')) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client User Access</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Your role is not authorized to view client user management for this agency scope.
          </p>
        </div>
      </main>
    )
  }

  const supabase = await getSupabaseServerClientReadOnly()
  const clientResult = await supabase
    .from('organizations')
    .select('id,name,slug')
    .eq('id', clientId)
    .eq('agency_id', currentUserAgency.agency_id)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()

  if (clientResult.error) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client User Access</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Failed to resolve client scope: {clientResult.error.message}</p>
        </div>
      </main>
    )
  }

  const clientRow = clientResult.data as ClientOrganizationRow | null
  if (!clientRow) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client User Access</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Client scope is invalid for this agency context. Access is blocked by fail-closed policy.
          </p>
        </div>
      </main>
    )
  }

  return (
    <ClientContextLayout
      agencyId={currentUserAgency.agency_id}
      requestedAgencyId={requestedAgencyId}
      memberships={availableAgencyMemberships}
      clientId={clientId}
      clientName={normalizeText(clientRow.name) || 'Unnamed Client'}
      clientSlug={normalizeText(clientRow.slug)}
      clientOptions={switchableClients}
      activeTab='users'
    >
      <ClientUsersClient
        agencyId={currentUserAgency.agency_id}
        agencyName={currentUserAgency.agency_name?.trim() || 'Unnamed Agency'}
        clientId={clientId}
        clientName={normalizeText(clientRow.name) || 'Unnamed Client'}
        requestedAgencyId={requestedAgencyId}
        memberships={availableAgencyMemberships}
        role={currentUserAgency.role}
        canInviteClientUsers={canPerformAction(currentUserAgency.role, 'invite_client_user')}
        embeddedInClientContext
      />
    </ClientContextLayout>
  )
}
