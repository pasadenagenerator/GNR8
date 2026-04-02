import 'server-only'

import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type InviteRow = {
  id: string | null
  email: string | null
  client_organization_id: string | null
  agency_id: string | null
  role: string | null
  status: string | null
}

type MembershipRow = {
  role: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeRole(value: unknown): 'owner' | 'member' | null {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'owner' || normalized === 'member') return normalized
  return null
}

function rankRole(role: 'owner' | 'member'): number {
  if (role === 'owner') return 2
  return 1
}

export async function reconcilePendingClientMembershipInvitesForCurrentUser(input?: {
  userId?: string | null
  email?: string | null
}): Promise<{
  processedInvites: number
}> {
  const sessionSupabase = await getSupabaseServerClientMutating()
  let userId = normalizeText(input?.userId)
  let email = normalizeText(input?.email).toLowerCase()

  if (!UUID_RE.test(userId) || !email) {
    const authUserResult = await sessionSupabase.auth.getUser()
    userId = normalizeText(authUserResult.data.user?.id)
    email = normalizeText(authUserResult.data.user?.email).toLowerCase()
    if (authUserResult.error || !UUID_RE.test(userId) || !email) {
      return { processedInvites: 0 }
    }
  }

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    return { processedInvites: 0 }
  }

  const pendingInviteResult = await supabase
    .from('client_membership_invites')
    .select('id,email,client_organization_id,agency_id,role,status')
    .eq('email', email)
    .eq('status', 'pending')

  if (pendingInviteResult.error) {
    throw new Error(`Client invite reconciliation failed during pending lookup: ${pendingInviteResult.error.message}`)
  }

  const pendingInvites = Array.isArray(pendingInviteResult.data) ? (pendingInviteResult.data as InviteRow[]) : []
  if (pendingInvites.length === 0) {
    return { processedInvites: 0 }
  }

  let processedInvites = 0
  for (const invite of pendingInvites) {
    const inviteId = normalizeText(invite.id)
    const inviteClientId = normalizeText(invite.client_organization_id)
    const inviteAgencyId = normalizeText(invite.agency_id)
    const inviteRole = normalizeRole(invite.role)

    if (!UUID_RE.test(inviteId) || !UUID_RE.test(inviteClientId) || !UUID_RE.test(inviteAgencyId) || inviteRole == null) {
      continue
    }

    const existingMembershipResult = await supabase
      .from('client_memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('client_organization_id', inviteClientId)
      .eq('agency_id', inviteAgencyId)
      .limit(1)
      .maybeSingle()

    if (existingMembershipResult.error) {
      throw new Error(
        `Client invite reconciliation failed during existing membership lookup: ${existingMembershipResult.error.message}`,
      )
    }

    const existingMembership = existingMembershipResult.data as MembershipRow | null
    const existingRole = normalizeRole(existingMembership?.role)
    const resolvedRole =
      existingRole == null || rankRole(inviteRole) > rankRole(existingRole) ? inviteRole : existingRole

    const membershipUpsertResult = await supabase
      .from('client_memberships')
      .upsert(
        {
          user_id: userId,
          client_organization_id: inviteClientId,
          agency_id: inviteAgencyId,
          role: resolvedRole,
        },
        {
          onConflict: 'user_id,client_organization_id',
        },
      )

    if (membershipUpsertResult.error) {
      throw new Error(`Client invite reconciliation failed during membership upsert: ${membershipUpsertResult.error.message}`)
    }

    const inviteAcceptResult = await supabase
      .from('client_membership_invites')
      .update({
        status: 'accepted',
        accepted_by_user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', inviteId)
      .eq('status', 'pending')

    if (inviteAcceptResult.error) {
      throw new Error(`Client invite reconciliation failed during invite acceptance: ${inviteAcceptResult.error.message}`)
    }

    processedInvites += 1
  }

  return { processedInvites }
}
