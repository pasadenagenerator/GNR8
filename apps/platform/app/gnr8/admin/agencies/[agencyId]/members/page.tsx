import { redirect } from 'next/navigation'

import AgencyMembersClient from '@/app/gnr8/agency/members/AgencyMembersClient'
import { listAgencyMembers } from '@/gnr8/agency/agency-membership-service'
import { canPerformAction } from '@/src/auth/rbac'
import { requireSuperadminUserIdForPage } from '@/src/auth/require-superadmin-user-id'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

type PageProps = {
  params: Promise<{
    agencyId: string
  }>
}

type AgencyIdentityRow = {
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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SuperadminAgencyMembersPage(props: PageProps) {
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

  const { agencyId: rawAgencyId } = await props.params
  const agencyId = normalizeText(rawAgencyId)

  if (!agencyId) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Agency Team (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Invalid agency id. This admin route requires a target agency.</p>
        </div>
      </main>
    )
  }

  if (!canPerformAction('superadmin', 'view_members')) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Agency Team (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Superadmin role is not authorized to view agency members.</p>
        </div>
      </main>
    )
  }

  const [agencyIdentity, initialMembers] = await Promise.all([
    getAgencyIdentity(agencyId),
    listAgencyMembers({
      agencyId,
    }),
  ])

  if (!agencyIdentity?.id) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Agency Team (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Agency not found for this admin-view scope.</p>
        </div>
      </main>
    )
  }

  console.info('[gnr8.superadmin.agency_members.admin_view]', {
    actor_user_id: superadminUserId,
    actor_mode: 'admin_view',
    target_agency_id: agencyId,
  })

  return (
    <AgencyMembersClient
      agencyId={agencyId}
      agencyName={normalizeText(agencyIdentity.name) || 'Unnamed Agency'}
      requestedAgencyId={agencyId}
      memberships={[]}
      role='superadmin'
      initialMembers={initialMembers}
      canInviteUsers={canPerformAction('superadmin', 'invite_user')}
      canEditMemberRole={canPerformAction('superadmin', 'edit_member_role')}
      canRemoveMember={canPerformAction('superadmin', 'remove_member')}
      actorMode='admin_view'
      adminBackToPath={`/gnr8/admin/agencies/${encodeURIComponent(agencyId)}/dashboard`}
      adminSettingsPath={`/gnr8/admin/agencies/${encodeURIComponent(agencyId)}/settings`}
      hideMembershipSwitcher
    />
  )
}
