import Link from 'next/link'
import { redirect } from 'next/navigation'

import CreateClientForm from './CreateClientForm'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'
import { canPerformAction } from '@/src/auth/rbac'

type SearchParams = {
  agency?: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyCreateClientPage(props: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined
  const requestedAgencyId = normalizeText(resolvedSearchParams?.agency) || null

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
        <h1 style={{ marginTop: 0 }}>Add Client</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            {agencyAccessErrorCode === 'NO_MEMBERSHIP'
              ? 'No agency membership found for this account.'
              : agencyAccessErrorCode === 'ACTIVE_AGENCY_REQUIRED'
                ? 'Select an agency before creating a client.'
                : 'Agency scope is unavailable for client creation.'}
          </p>
          {availableAgencyMemberships.length > 0 ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {availableAgencyMemberships.map((membership) => (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency/clients/new?agency=${encodeURIComponent(membership.agency_id)}`}
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

  if (!canPerformAction(currentUserAgency.role, 'create_client')) {
    return (
      <main style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Add Client</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Your role is not authorized to create clients for this agency.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        maxWidth: 880,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>Add Client</h1>
        <p style={{ margin: 0, color: '#334155' }}>
          Create a new client organization under the current agency scope.
        </p>
      </header>

      <section style={{ marginTop: 16, border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 16 }}>
        <CreateClientForm agencyId={currentUserAgency.agency_id} />
      </section>

      <div style={{ marginTop: 12 }}>
        <Link
          href={`/gnr8/agency?agency=${encodeURIComponent(currentUserAgency.agency_id)}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            textDecoration: 'none',
            fontSize: 12,
          }}
        >
          Back to Agency Dashboard
        </Link>
      </div>
    </main>
  )
}
