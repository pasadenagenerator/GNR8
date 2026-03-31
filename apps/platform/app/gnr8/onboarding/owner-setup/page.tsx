import Link from 'next/link'
import { redirect } from 'next/navigation'

import OwnerSetupForm from './OwnerSetupForm'
import { getOwnerSetupStatusForAgencyForPage } from '@/src/auth/owner-setup-gate'
import {
  listCurrentUserAgencyMembershipsForPage,
  resolveCurrentUserAgencyForPage,
  ResolveCurrentAgencyError,
} from '@/src/auth/resolve-current-agency'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchParams = {
  agency?: string
}

function buildAgencyWorkspacePath(agencyId: string): string {
  return `/gnr8/agency?agency=${encodeURIComponent(agencyId)}`
}

export default async function OwnerSetupPage(props: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined
  const requestedAgencyId = String(resolvedSearchParams?.agency ?? '').trim() || null

  let availableAgencyMemberships: Awaited<
    ReturnType<typeof listCurrentUserAgencyMembershipsForPage>
  >['memberships'] = []

  try {
    availableAgencyMemberships = (await listCurrentUserAgencyMembershipsForPage()).memberships
  } catch {
    // ignore; unauthorized is handled by main resolver below
  }

  try {
    const currentUserAgency = await resolveCurrentUserAgencyForPage({
      activeAgencyId: requestedAgencyId,
    })

    if (currentUserAgency.role !== 'owner') {
      redirect(buildAgencyWorkspacePath(currentUserAgency.agency_id))
    }

    const ownerSetup = await getOwnerSetupStatusForAgencyForPage({
      userId: currentUserAgency.user_id,
      agencyId: currentUserAgency.agency_id,
    })

    if (!ownerSetup.hasOwnerMembership) {
      return (
        <main style={{ maxWidth: 640, margin: '48px auto', padding: 16 }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Owner setup unavailable</h1>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Access is blocked because your owner membership context is invalid for this agency.
          </p>
        </main>
      )
    }

    if (ownerSetup.isCompleted) {
      redirect(buildAgencyWorkspacePath(currentUserAgency.agency_id))
    }

    return (
      <main style={{ maxWidth: 640, margin: '48px auto', padding: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Complete owner account setup</h1>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#334155' }}>
          Set your password before entering the agency workspace.
        </p>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 16 }}>
          <OwnerSetupForm agencyId={currentUserAgency.agency_id} />
        </div>
      </main>
    )
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError && error.code === 'UNAUTHORIZED') {
      redirect('/login')
    }

    const title =
      error instanceof ResolveCurrentAgencyError && error.code === 'ACTIVE_AGENCY_REQUIRED'
        ? 'Select agency to continue setup'
        : 'Owner setup blocked'

    const body =
      error instanceof ResolveCurrentAgencyError && error.code === 'NO_MEMBERSHIP'
        ? 'Your account is authenticated but has no agency membership.'
        : error instanceof ResolveCurrentAgencyError && error.code === 'ACTIVE_AGENCY_REQUIRED'
          ? 'Your account belongs to multiple agencies. Select one agency to continue owner setup.'
          : error instanceof ResolveCurrentAgencyError && error.code === 'ACTIVE_AGENCY_INVALID'
            ? 'The selected agency is invalid for your membership context.'
            : 'Your membership is invalid or unavailable, so setup cannot continue.'

    return (
      <main style={{ maxWidth: 720, margin: '48px auto', padding: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>{title}</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>{body}</p>
        </div>

        {availableAgencyMemberships.length > 0 ? (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {availableAgencyMemberships.map((membership) => (
              <Link
                key={membership.agency_id}
                href={`/gnr8/onboarding/owner-setup?agency=${encodeURIComponent(membership.agency_id)}`}
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
      </main>
    )
  }
}
