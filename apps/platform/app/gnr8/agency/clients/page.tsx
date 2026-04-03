import Link from 'next/link'
import { redirect } from 'next/navigation'

import AgencyClientsOverviewSection from '../AgencyClientsOverviewSection'
import AgencyContextLayout from '../AgencyContextLayout'
import { getAgencyDashboardReadModel } from '@/gnr8/agency/agency-dashboard-read-model'
import { OWNER_SETUP_PATH, getOwnerSetupStatusForAgencyForPage } from '@/src/auth/owner-setup-gate'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { canPerformAction } from '@/src/auth/rbac'

type SearchParams = {
  agency?: string
  admin_view?: string
}

function normalizeAdminView(value: string | undefined): boolean {
  return value === '1' || value === 'true'
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyClientsPage(props: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined
  const requestedAgencyId = String(resolvedSearchParams?.agency ?? '').trim() || null
  const isAdminView = normalizeAdminView(resolvedSearchParams?.admin_view)

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
      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 24,
          background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          minHeight: '100vh',
        }}
      >
        <header style={{ display: 'grid', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 32, color: '#0f172a' }}>Agency Clients</h1>
          <p style={{ margin: 0, color: '#334155', maxWidth: 900 }}>
            Client management view scoped by authenticated agency membership.
          </p>
        </header>

        <section
          style={{
            marginTop: 18,
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
                  href={`/gnr8/agency/clients?agency=${encodeURIComponent(membership.agency_id)}`}
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

  if (currentUserAgency.role === 'owner') {
    const ownerSetupStatus = await getOwnerSetupStatusForAgencyForPage({
      userId: currentUserAgency.user_id,
      agencyId: currentUserAgency.agency_id,
    })
    if (!ownerSetupStatus.hasOwnerMembership) {
      return (
        <main
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: 24,
            background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
            minHeight: '100vh',
          }}
        >
          <section
            style={{
              marginTop: 18,
              border: '1px solid #fecaca',
              borderRadius: 12,
              background: '#fff5f5',
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0, color: '#991b1b' }}>Agency access unavailable</h2>
            <p style={{ marginBottom: 0, color: '#7f1d1d' }}>
              Owner membership context is invalid for this agency. Access is blocked until membership is corrected.
            </p>
          </section>
        </main>
      )
    }
    if (!ownerSetupStatus.isCompleted) {
      redirect(`${OWNER_SETUP_PATH}?agency=${encodeURIComponent(currentUserAgency.agency_id)}`)
    }
  }

  const readModel = await getAgencyDashboardReadModel({
    agencyId: currentUserAgency.agency_id,
    limit: 120,
    simulationLimit: 120,
  })

  const canCreateClient = canPerformAction(currentUserAgency.role, 'create_client')
  const canViewClientUsers = canPerformAction(currentUserAgency.role, 'view_client_users')
  const canEditClientSettings = canPerformAction(currentUserAgency.role, 'edit_client_settings')

  return (
    <AgencyContextLayout
      agencyId={currentUserAgency.agency_id}
      agencyName={currentUserAgency.agency_name?.trim() || readModel.agency.agency_name?.trim() || `Agency ${shortId(currentUserAgency.agency_id)}`}
      role={currentUserAgency.role}
      requestedAgencyId={requestedAgencyId}
      memberships={availableAgencyMemberships}
      activeTab='clients'
      actorMode={isAdminView ? 'admin_view' : 'membership'}
    >
      <AgencyClientsOverviewSection
        agencyId={currentUserAgency.agency_id}
        canCreateClient={canCreateClient}
        canEditClientSettings={canEditClientSettings}
        canViewClientUsers={canViewClientUsers}
        clientDirectory={readModel.client_directory}
      />
    </AgencyContextLayout>
  )
}
