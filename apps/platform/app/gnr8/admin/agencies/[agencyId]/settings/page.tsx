import { redirect } from 'next/navigation'

import AgencySettingsClient from '@/app/gnr8/agency/settings/AgencySettingsClient'
import { canPerformAction } from '@/src/auth/rbac'
import { requireSuperadminUserIdForPage } from '@/src/auth/require-superadmin-user-id'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

type PageProps = {
  params: Promise<{
    agencyId: string
  }>
}

type AgencyIdentityRow = {
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

async function getAgencyIdentity(agencyId: string): Promise<AgencyIdentityRow | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const result = await supabase
    .from('agencies')
    .select('id,name,slug')
    .eq('id', agencyId)
    .limit(1)
    .maybeSingle()

  if (result.error) {
    return null
  }

  return (result.data as AgencyIdentityRow | null) ?? null
}

export default async function SuperadminAgencySettingsPage(props: PageProps) {
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
        <h1 style={{ marginBottom: 10 }}>Agency Settings (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Invalid agency id. This admin route requires a target agency.</p>
        </div>
      </main>
    )
  }

  const [agencyIdentity, authResult] = await Promise.all([
    getAgencyIdentity(agencyId),
    (await getSupabaseServerClientReadOnly()).auth.getUser(),
  ])

  if (!agencyIdentity?.id) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 10 }}>Agency Settings (Admin View)</h1>
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 14 }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>Agency not found for the selected admin settings scope.</p>
        </div>
      </main>
    )
  }

  console.info('[gnr8.superadmin.agency_settings.admin_view]', {
    actor_user_id: superadminUserId,
    actor_mode: 'admin_view',
    target_agency_id: agencyId,
  })

  const authUser = authResult.data.user
  const ownerEmail = normalizeText(authUser?.email)
  const ownerNameFromMetadata = normalizeText(authUser?.user_metadata?.full_name)
  const ownerName = ownerNameFromMetadata || normalizeText(authUser?.email?.split('@')[0]) || 'Agency Owner'

  return (
    <AgencySettingsClient
      agencyId={agencyId}
      agencyName={normalizeText(agencyIdentity.name) || 'Unnamed Agency'}
      agencySlug={normalizeText(agencyIdentity.slug)}
      requestedAgencyId={agencyId}
      memberships={[]}
      role="superadmin"
      canEditAgencySettings={canPerformAction('superadmin', 'edit_agency_settings')}
      canEditAgencySlug={canPerformAction('superadmin', 'edit_agency_slug')}
      canEditOwnerProfile={canPerformAction('superadmin', 'edit_owner_profile')}
      canDeleteAgency={canPerformAction('superadmin', 'delete_agency')}
      canChangePassword={canPerformAction('superadmin', 'change_password')}
      ownerName={ownerName}
      ownerEmail={ownerEmail || 'unknown@example.com'}
      actorMode="admin_view"
      adminBackToPath={`/gnr8/admin/agencies/${encodeURIComponent(agencyId)}/dashboard`}
    />
  )
}
