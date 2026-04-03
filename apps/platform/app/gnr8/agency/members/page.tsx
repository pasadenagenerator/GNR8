import Link from 'next/link'
import { redirect } from 'next/navigation'

import AgencyContextLayout from '../AgencyContextLayout'
import AgencyMembersClient from './AgencyMembersClient'
import { listAgencyMembers } from '@/gnr8/agency/agency-membership-service'
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

type AgencyRow = {
  id: string | null
  name: string | null
  slug: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeAdminView(value: string | undefined): boolean {
  return value === '1' || value === 'true'
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgencyMembersPage(props: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined
  const requestedAgencyId = normalizeText(resolvedSearchParams?.agency) || null
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
          maxWidth: 980,
          margin: '0 auto',
          padding: 24,
          background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          minHeight: '100vh',
        }}
      >
        <header style={{ display: 'grid', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>Agency Members</h1>
          <p style={{ margin: 0, color: '#334155' }}>
            Agency-scoped user invitation and role management for authenticated memberships.
          </p>
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
                  href={`/gnr8/agency/members?agency=${encodeURIComponent(membership.agency_id)}`}
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

  if (!canPerformAction(currentUserAgency.role, 'view_members')) {
    return (
      <AgencyContextLayout
        agencyId={currentUserAgency.agency_id}
        agencyName={currentUserAgency.agency_name?.trim() || 'Unknown Agency'}
        role={currentUserAgency.role}
        requestedAgencyId={requestedAgencyId}
        memberships={availableAgencyMemberships}
        activeTab='members'
        actorMode={isAdminView ? 'admin_view' : 'membership'}
      >
        <section style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Your role is not authorized to view agency member management for this agency scope.
          </p>
        </section>
      </AgencyContextLayout>
    )
  }

  const [supabase, initialMembers] = await Promise.all([
    getSupabaseServerClientReadOnly(),
    listAgencyMembers({
      agencyId: currentUserAgency.agency_id,
    }),
  ])

  const agencyResult = await supabase
    .from('agencies')
    .select('id,name,slug')
    .eq('id', currentUserAgency.agency_id)
    .limit(1)
    .maybeSingle()

  if (agencyResult.error) {
    return (
      <AgencyContextLayout
        agencyId={currentUserAgency.agency_id}
        agencyName={currentUserAgency.agency_name?.trim() || 'Unknown Agency'}
        role={currentUserAgency.role}
        requestedAgencyId={requestedAgencyId}
        memberships={availableAgencyMemberships}
        activeTab='members'
        actorMode={isAdminView ? 'admin_view' : 'membership'}
      >
        <section style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Failed to load agency context: {agencyResult.error.message}</p>
        </section>
      </AgencyContextLayout>
    )
  }

  const agencyRow = agencyResult.data as AgencyRow | null
  if (!agencyRow) {
    return (
      <AgencyContextLayout
        agencyId={currentUserAgency.agency_id}
        agencyName={currentUserAgency.agency_name?.trim() || 'Unknown Agency'}
        role={currentUserAgency.role}
        requestedAgencyId={requestedAgencyId}
        memberships={availableAgencyMemberships}
        activeTab='members'
        actorMode={isAdminView ? 'admin_view' : 'membership'}
      >
        <section style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>No resolved agency found for this member management view.</p>
        </section>
      </AgencyContextLayout>
    )
  }

  return (
    <AgencyContextLayout
      agencyId={currentUserAgency.agency_id}
      agencyName={normalizeText(agencyRow.name) || 'Unnamed Agency'}
      agencySlug={normalizeText(agencyRow.slug)}
      role={currentUserAgency.role}
      requestedAgencyId={requestedAgencyId}
      memberships={availableAgencyMemberships}
      activeTab='members'
      actorMode={isAdminView ? 'admin_view' : 'membership'}
    >
      <AgencyMembersClient
        agencyId={currentUserAgency.agency_id}
        agencyName={normalizeText(agencyRow.name) || 'Unnamed Agency'}
        requestedAgencyId={requestedAgencyId}
        memberships={availableAgencyMemberships}
        role={currentUserAgency.role}
        initialMembers={initialMembers}
        canInviteUsers={canPerformAction(currentUserAgency.role, 'invite_user')}
        canEditMemberRole={canPerformAction(currentUserAgency.role, 'edit_member_role')}
        canRemoveMember={canPerformAction(currentUserAgency.role, 'remove_member')}
        embeddedInAgencyContext
      />
    </AgencyContextLayout>
  )
}
