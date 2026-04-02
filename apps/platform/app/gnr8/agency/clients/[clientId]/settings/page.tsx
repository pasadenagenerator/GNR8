import { redirect } from 'next/navigation'

import ClientSettingsClient from './ClientSettingsClient'
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
  agency_id: string | null
  organization_type: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyClientSettingsPage(props: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const resolvedParams = await props.params
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined

  const clientId = normalizeText(resolvedParams.clientId)
  const requestedAgencyId = normalizeText(resolvedSearchParams?.agency) || null

  if (!clientId) {
    return (
      <main style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Settings</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Client scope is required.</p>
        </div>
      </main>
    )
  }

  let currentUserAgency: Awaited<ReturnType<typeof resolveCurrentUserAgencyForPage>> | null = null
  let agencyAccessErrorCode: ResolveCurrentAgencyError['code'] | null = null
  let availableAgencyMemberships: Awaited<ReturnType<typeof listCurrentUserAgencyMembershipsForPage>>['memberships'] = []

  try {
    currentUserAgency = await resolveCurrentUserAgencyForPage({
      activeAgencyId: requestedAgencyId,
    })
    const membershipContext = await listCurrentUserAgencyMembershipsForPage()
    availableAgencyMemberships = membershipContext.memberships
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
      <main style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Settings</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            {agencyAccessErrorCode === 'NO_MEMBERSHIP'
              ? 'No agency membership found for this account.'
              : agencyAccessErrorCode === 'ACTIVE_AGENCY_REQUIRED'
                ? 'Select an agency before opening client settings.'
                : 'Agency scope is unavailable for this client.'}
          </p>
        </div>
      </main>
    )
  }

  const supabase = await getSupabaseServerClientReadOnly()
  const clientResult = await supabase
    .from('organizations')
    .select('id,name,slug,agency_id,organization_type')
    .eq('id', clientId)
    .eq('agency_id', currentUserAgency.agency_id)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()

  if (clientResult.error) {
    return (
      <main style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Settings</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Failed to resolve client scope: {clientResult.error.message}</p>
        </div>
      </main>
    )
  }

  const client = clientResult.data as ClientOrganizationRow | null
  if (!client) {
    return (
      <main style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Client Settings</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Client scope is invalid for this agency context. Access is blocked by fail-closed policy.
          </p>
        </div>
      </main>
    )
  }

  return (
    <ClientSettingsClient
      agencyId={currentUserAgency.agency_id}
      requestedAgencyId={requestedAgencyId}
      clientId={clientId}
      initialName={normalizeText(client.name) || 'Unnamed Client'}
      initialSlug={normalizeText(client.slug)}
      memberships={availableAgencyMemberships}
      canEditClientSettings={canPerformAction(currentUserAgency.role, 'edit_client_settings')}
    />
  )
}
