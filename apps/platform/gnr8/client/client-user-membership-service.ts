import 'server-only'

import { randomUUID } from 'node:crypto'

import { buildAgencyOwnerInviteRedirectTo } from '@/gnr8/agency/agency-provisioning-service'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ClientMembershipRole = 'owner' | 'member'
export type ClientUserStatus = 'active' | 'pending'

export type ClientUserRow = {
  row_id: string
  user_id: string | null
  invite_id: string | null
  role: ClientMembershipRole
  email: string | null
  name: string | null
  status: ClientUserStatus
  invited_at: string | null
  last_sign_in_at: string | null
}

export class ClientUserMembershipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClientUserMembershipError'
  }
}

type OrganizationRow = {
  id: string | null
  name: string | null
  agency_id: string | null
  organization_type: string | null
}

type ClientMembershipRow = {
  id: string | null
  user_id: string | null
  role: string | null
  created_at: string | null
}

type ClientMembershipInviteRow = {
  id: string | null
  email: string | null
  role: string | null
  status: string | null
  created_at: string | null
}

type AuthAdminUser = {
  id?: unknown
  email?: unknown
  invited_at?: unknown
  last_sign_in_at?: unknown
  confirmed_at?: unknown
  email_confirmed_at?: unknown
  user_metadata?: {
    full_name?: unknown
  } | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function assertUuid(value: unknown, fieldName: string): string {
  const normalized = normalizeText(value)
  if (!UUID_RE.test(normalized)) {
    throw new ClientUserMembershipError(`${fieldName} must be a valid UUID`)
  }
  return normalized
}

function normalizeRole(value: unknown): ClientMembershipRole | null {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'owner' || normalized === 'member') return normalized
  return null
}

function normalizeEmail(value: unknown): string {
  const email = normalizeText(value).toLowerCase()
  if (!email) {
    throw new ClientUserMembershipError('Email is required.')
  }
  const [local, domain] = email.split('@')
  if (!local || !domain || !domain.includes('.')) {
    throw new ClientUserMembershipError('Email must be a valid email address.')
  }
  return email
}

function resolveUserName(user: AuthAdminUser): string | null {
  const fullName = normalizeText(user.user_metadata?.full_name)
  if (fullName) return fullName

  const email = normalizeText(user.email)
  if (!email.includes('@')) return null
  return normalizeText(email.split('@')[0]) || null
}

function roleRank(role: ClientMembershipRole): number {
  if (role === 'owner') return 2
  return 1
}

async function requireClientScope(input: {
  agencyId: string
  clientOrganizationId: string
}): Promise<{ clientId: string; clientName: string | null; agencyId: string }> {
  const agencyId = assertUuid(input.agencyId, 'agencyId')
  const clientId = assertUuid(input.clientOrganizationId, 'clientOrganizationId')

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new ClientUserMembershipError('Supabase service role client is not configured')
  }

  const organizationResult = await supabase
    .from('organizations')
    .select('id,name,agency_id,organization_type')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()

  if (organizationResult.error) {
    throw new ClientUserMembershipError(`Failed to resolve client scope: ${organizationResult.error.message}`)
  }

  const organization = organizationResult.data as OrganizationRow | null
  if (!organization) {
    throw new ClientUserMembershipError('Client scope not found under current agency.')
  }

  return {
    clientId,
    clientName: normalizeText(organization.name) || null,
    agencyId,
  }
}

export async function listClientUsers(input: {
  agencyId: string
  clientOrganizationId: string
}): Promise<ClientUserRow[]> {
  const { agencyId, clientId } = await requireClientScope(input)

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new ClientUserMembershipError('Supabase service role client is not configured')
  }

  const membershipResult = await supabase
    .from('client_memberships')
    .select('id,user_id,role,created_at')
    .eq('agency_id', agencyId)
    .eq('client_organization_id', clientId)

  if (membershipResult.error) {
    throw new ClientUserMembershipError(`Failed to list client memberships: ${membershipResult.error.message}`)
  }

  const membershipRows = Array.isArray(membershipResult.data)
    ? (membershipResult.data as ClientMembershipRow[])
    : []

  const activeRows = await Promise.all(
    membershipRows.map(async (membership): Promise<ClientUserRow | null> => {
      const membershipId = normalizeText(membership.id)
      const userId = normalizeText(membership.user_id)
      const role = normalizeRole(membership.role)
      if (!UUID_RE.test(membershipId) || !UUID_RE.test(userId) || role == null) {
        return null
      }

      const userResult = await supabase.auth.admin.getUserById(userId)
      if (userResult.error) {
        return {
          row_id: membershipId,
          user_id: userId,
          invite_id: null,
          role,
          email: null,
          name: null,
          status: 'active',
          invited_at: normalizeText(membership.created_at) || null,
          last_sign_in_at: null,
        }
      }

      const user = (userResult.data.user ?? null) as AuthAdminUser | null
      if (!user) {
        return {
          row_id: membershipId,
          user_id: userId,
          invite_id: null,
          role,
          email: null,
          name: null,
          status: 'active',
          invited_at: normalizeText(membership.created_at) || null,
          last_sign_in_at: null,
        }
      }

      return {
        row_id: membershipId,
        user_id: userId,
        invite_id: null,
        role,
        email: normalizeText(user.email) || null,
        name: resolveUserName(user),
        status: 'active',
        invited_at: normalizeText(user.invited_at) || normalizeText(membership.created_at) || null,
        last_sign_in_at: normalizeText(user.last_sign_in_at) || null,
      }
    }),
  )

  const activeMembers = activeRows.filter((row): row is ClientUserRow => row != null)
  const activeEmailSet = new Set(activeMembers.map((row) => normalizeText(row.email).toLowerCase()).filter(Boolean))

  const invitesResult = await supabase
    .from('client_membership_invites')
    .select('id,email,role,status,created_at')
    .eq('agency_id', agencyId)
    .eq('client_organization_id', clientId)
    .eq('status', 'pending')

  if (invitesResult.error) {
    throw new ClientUserMembershipError(`Failed to list client invites: ${invitesResult.error.message}`)
  }

  const inviteRows = Array.isArray(invitesResult.data)
    ? (invitesResult.data as ClientMembershipInviteRow[])
    : []

  const pendingRows = inviteRows
    .map((invite): ClientUserRow | null => {
      const inviteId = normalizeText(invite.id)
      const email = normalizeText(invite.email).toLowerCase()
      const role = normalizeRole(invite.role)
      const status = normalizeText(invite.status).toLowerCase()

      if (!UUID_RE.test(inviteId) || !email || role == null || status !== 'pending') {
        return null
      }

      if (activeEmailSet.has(email)) {
        return null
      }

      return {
        row_id: inviteId,
        user_id: null,
        invite_id: inviteId,
        role,
        email,
        name: normalizeText(email.split('@')[0]) || null,
        status: 'pending',
        invited_at: normalizeText(invite.created_at) || null,
        last_sign_in_at: null,
      }
    })
    .filter((row): row is ClientUserRow => row != null)

  return [...activeMembers, ...pendingRows].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    if (roleRank(b.role) !== roleRank(a.role)) return roleRank(b.role) - roleRank(a.role)

    const aName = normalizeText(a.name || a.email).toLowerCase()
    const bName = normalizeText(b.name || b.email).toLowerCase()
    if (aName && bName && aName !== bName) {
      return aName.localeCompare(bName)
    }

    return a.row_id.localeCompare(b.row_id)
  })
}

export async function inviteClientUser(input: {
  agencyId: string
  clientOrganizationId: string
  email: string
  role: ClientMembershipRole
  invitedByUserId: string
}): Promise<ClientUserRow> {
  const { agencyId, clientId } = await requireClientScope(input)
  const email = normalizeEmail(input.email)
  const role = normalizeRole(input.role)
  const invitedByUserId = assertUuid(input.invitedByUserId, 'invitedByUserId')

  if (role == null) {
    throw new ClientUserMembershipError('Role must be owner or member.')
  }

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new ClientUserMembershipError('Supabase service role client is not configured')
  }

  const pendingInviteResult = await supabase
    .from('client_membership_invites')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('client_organization_id', clientId)
    .eq('status', 'pending')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (pendingInviteResult.error) {
    throw new ClientUserMembershipError(`Failed to check pending invites: ${pendingInviteResult.error.message}`)
  }

  if (pendingInviteResult.data) {
    throw new ClientUserMembershipError('A pending invite for this email already exists in the selected client scope.')
  }

  const inviteResult = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: buildAgencyOwnerInviteRedirectTo(
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.GNR8_APP_URL ?? null,
    ),
  })

  if (inviteResult.error) {
    throw new ClientUserMembershipError(`Failed to send invite: ${inviteResult.error.message}`)
  }

  const invitedUserId = normalizeText(inviteResult.data.user?.id)
  if (UUID_RE.test(invitedUserId)) {
    const existingMembershipResult = await supabase
      .from('client_memberships')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('client_organization_id', clientId)
      .eq('user_id', invitedUserId)
      .limit(1)
      .maybeSingle()

    if (existingMembershipResult.error) {
      throw new ClientUserMembershipError(
        `Failed to check existing client membership after invite: ${existingMembershipResult.error.message}`,
      )
    }

    if (existingMembershipResult.data) {
      throw new ClientUserMembershipError('This user already has client access for the selected client.')
    }
  }

  const invitePayload = {
    id: randomUUID(),
    email,
    client_organization_id: clientId,
    agency_id: agencyId,
    role,
    status: 'pending' as const,
    invited_by_user_id: invitedByUserId,
  }

  const inviteInsertResult = await supabase
    .from('client_membership_invites')
    .insert(invitePayload)
    .select('id,email,role,status,created_at')
    .limit(1)
    .maybeSingle()

  if (inviteInsertResult.error) {
    throw new ClientUserMembershipError(`Failed to persist client invite: ${inviteInsertResult.error.message}`)
  }

  const inviteRow = inviteInsertResult.data as ClientMembershipInviteRow | null
  const inviteId = normalizeText(inviteRow?.id)

  if (!UUID_RE.test(inviteId)) {
    throw new ClientUserMembershipError('Failed to persist client invite row id.')
  }

  return {
    row_id: inviteId,
    user_id: null,
    invite_id: inviteId,
    role,
    email,
    name: normalizeText(email.split('@')[0]) || null,
    status: 'pending',
    invited_at: normalizeText(inviteRow?.created_at) || new Date().toISOString(),
    last_sign_in_at: null,
  }
}
