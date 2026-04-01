import { redirect } from 'next/navigation'

import ClientUsersClient from '@/app/gnr8/agency/clients/[clientId]/users/ClientUsersClient'
import { canPerformAction } from '@/src/auth/rbac'
import { requireSuperadminUserIdForPage } from '@/src/auth/require-superadmin-user-id'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

type PageProps = {
  params: Promise<{
    agencyId: string
    clientId: string
  }>
}

type AgencyIdentityRow = {
  id: string | null
  name: string | null
}

type ClientOrganizationRow = {
  id: string | null
  name: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

async function getAgencyIdentity(agencyId: string): Promise<AgencyIdentityRow | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const result = await supabase.from('agencies').select('id,name').eq('id', agencyId).limit(1).maybeSingle()
  if (result.error) return null
  return (result.data as AgencyIdentityRow | null) ?? null
}

async function getClientScope(input: { agencyId: string; clientId: string }): Promise<ClientOrganizationRow | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const result = await supabase
    .from('organizations')
    .select('id,name')
    .eq('id', input.clientId)
    .eq('agency_id', input.agencyId)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()

  if (result.error) return null
  return (result.data as ClientOrganizationRow | null) ?? null
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SuperadminClientUsersPage(props: PageProps) {
  let superadminUserId: string
  try {
    superadminUserId = await requireSuperadminUserIdForPage()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message === 'Unauthorized') {
      redirect('/login')
    }
    if (message.startsWith('Forbidden')) {
      redirect('/superadmin')
    }
    throw error
  }

  const { agencyId: rawAgencyId, clientId: rawClientId } = await props.params
  const agencyId = normalizeText(rawAgencyId)
  const clientId = normalizeText(rawClientId)

  if (!agencyId || !clientId) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client Users (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Invalid admin route scope. Both agency id and client id are required.
          </p>
        </div>
      </main>
    )
  }

  if (!canPerformAction('superadmin', 'view_client_users')) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client Users (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Superadmin role is not authorized to view client users.</p>
        </div>
      </main>
    )
  }

  const [agencyIdentity, clientScope] = await Promise.all([
    getAgencyIdentity(agencyId),
    getClientScope({
      agencyId,
      clientId,
    }),
  ])

  if (!agencyIdentity?.id) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client Users (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Agency not found for this admin-view scope.</p>
        </div>
      </main>
    )
  }

  if (!clientScope?.id) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Client Users (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Client scope is invalid for the selected agency. Access is denied by fail-closed policy.
          </p>
        </div>
      </main>
    )
  }

  console.info('[gnr8.superadmin.client_users.admin_view]', {
    actor_user_id: superadminUserId,
    actor_mode: 'admin_view',
    target_agency_id: agencyId,
    target_client_id: clientId,
  })

  return (
    <ClientUsersClient
      agencyId={agencyId}
      agencyName={normalizeText(agencyIdentity.name) || 'Unnamed Agency'}
      clientId={clientId}
      clientName={normalizeText(clientScope.name) || 'Unnamed Client'}
      requestedAgencyId={agencyId}
      memberships={[]}
      role='superadmin'
      canInviteClientUsers={canPerformAction('superadmin', 'invite_client_user')}
      actorMode='admin_view'
      adminBackToPath={`/gnr8/admin/agencies/${encodeURIComponent(agencyId)}/dashboard`}
      hideMembershipSwitcher
    />
  )
}
