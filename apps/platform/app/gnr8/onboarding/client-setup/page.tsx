import Link from 'next/link'
import { redirect } from 'next/navigation'

import ClientSetupForm from './ClientSetupForm'
import { getClientSetupStatusForClientForPage } from '@/src/auth/client-setup-gate'
import {
  listCurrentUserClientMembershipsForPage,
  resolveCurrentUserClientForPage,
  ResolveCurrentClientError,
} from '@/src/auth/resolve-current-client'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchParams = {
  client?: string
}

function buildClientHomePath(clientId: string): string {
  return `/gnr8/client?client=${encodeURIComponent(clientId)}`
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

export default async function ClientSetupPage(props: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = props.searchParams ? await props.searchParams : undefined
  const requestedClientId = String(resolvedSearchParams?.client ?? '').trim() || null

  let availableClientMemberships: Awaited<ReturnType<typeof listCurrentUserClientMembershipsForPage>>['memberships'] = []

  try {
    availableClientMemberships = (await listCurrentUserClientMembershipsForPage()).memberships
  } catch {
    // ignore; resolver below will enforce auth/scope
  }

  try {
    const currentUserClient = await resolveCurrentUserClientForPage({
      activeClientId: requestedClientId,
    })

    const setupStatus = await getClientSetupStatusForClientForPage({
      userId: currentUserClient.user_id,
      clientId: currentUserClient.client_id,
      agencyId: currentUserClient.agency_id,
    })

    if (!setupStatus.hasClientMembership) {
      return (
        <main style={{ maxWidth: 640, margin: '48px auto', padding: 16 }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Client setup unavailable</h1>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Access is blocked because your client membership context is invalid for this workspace.
          </p>
        </main>
      )
    }

    if (setupStatus.isCompleted) {
      redirect(buildClientHomePath(currentUserClient.client_id))
    }

    const supabase = await getSupabaseServerClientReadOnly()
    const authResult = await supabase.auth.getUser()
    if (authResult.error) {
      redirect('/login')
    }

    const email = String(authResult.data.user?.email ?? '').trim()

    return (
      <main style={{ maxWidth: 680, margin: '48px auto', padding: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>
          Welcome to {currentUserClient.client_name?.trim() || shortId(currentUserClient.client_id)}
        </h1>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#334155' }}>
          Finish your client setup to continue into the GNR8 client workspace.
        </p>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 16 }}>
          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: '#334155' }}>Email (read-only)</span>
            <input
              type="email"
              value={email}
              readOnly
              disabled
              style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#475569' }}
            />
          </div>
          <ClientSetupForm
            clientId={currentUserClient.client_id}
            initialName={setupStatus.firstName}
            initialSurname={setupStatus.surname}
            initialMobileNumber={setupStatus.mobileNumber}
          />
        </div>
      </main>
    )
  } catch (error) {
    if (error instanceof ResolveCurrentClientError && error.code === 'UNAUTHORIZED') {
      redirect('/login')
    }

    const title =
      error instanceof ResolveCurrentClientError && error.code === 'ACTIVE_CLIENT_REQUIRED'
        ? 'Select client to continue setup'
        : 'Client setup blocked'

    const body =
      error instanceof ResolveCurrentClientError && error.code === 'NO_MEMBERSHIP'
        ? 'Your account is authenticated but has no client membership.'
        : error instanceof ResolveCurrentClientError && error.code === 'ACTIVE_CLIENT_REQUIRED'
          ? 'Your account belongs to multiple clients. Select one client to continue setup.'
          : error instanceof ResolveCurrentClientError && error.code === 'ACTIVE_CLIENT_INVALID'
            ? 'The selected client is invalid for your membership context.'
            : 'Your membership is invalid or unavailable, so setup cannot continue.'

    return (
      <main style={{ maxWidth: 720, margin: '48px auto', padding: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>{title}</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>{body}</p>
        </div>

        {availableClientMemberships.length > 0 ? (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {availableClientMemberships.map((membership) => (
              <Link
                key={membership.client_id}
                href={`/gnr8/onboarding/client-setup?client=${encodeURIComponent(membership.client_id)}`}
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
                {(membership.client_name?.trim() || membership.client_id).trim()}
              </Link>
            ))}
          </div>
        ) : null}
      </main>
    )
  }
}
