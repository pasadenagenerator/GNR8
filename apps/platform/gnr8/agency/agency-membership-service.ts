import 'server-only'

import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'

import { buildAgencyOwnerInviteRedirectTo } from '@/gnr8/agency/agency-provisioning-service'
import {
  detectMembershipOrgColumnSupport,
  resolveMembershipOrgColumnExpression as resolveSharedMembershipOrgColumnExpression,
  type MembershipOrgColumnSupport,
} from '@/src/auth/membership-org-column-compat'
import { getSuperadminPool } from '@/src/superadmin/db'
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type AgencyMembershipRole = 'owner' | 'admin' | 'member'

export type AgencyMemberStatus = 'active' | 'invited'

export type AgencyMemberRow = {
  membership_id: string
  user_id: string
  role: AgencyMembershipRole
  email: string | null
  name: string | null
  status: AgencyMemberStatus
  invited_at: string | null
  last_sign_in_at: string | null
}

export class AgencyMembersError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgencyMembersError'
  }
}

type OrganizationRow = {
  id: string | null
}

type MembershipRow = {
  id: string | null
  user_id: string | null
  role: string | null
}

type MembershipScopedRow = {
  id: string | null
  user_id: string | null
  role: string | null
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

function normalizeRole(value: unknown): AgencyMembershipRole | null {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'owner' || normalized === 'admin' || normalized === 'member') return normalized
  return null
}

function assertUuid(value: unknown, fieldName: string): string {
  const normalized = normalizeText(value)
  if (!UUID_RE.test(normalized)) {
    throw new AgencyMembersError(`${fieldName} must be a valid UUID`)
  }
  return normalized
}

function normalizeEmail(value: unknown): string {
  const email = normalizeText(value).toLowerCase()
  if (!email) {
    throw new AgencyMembersError('Email is required.')
  }
  const [local, domain] = email.split('@')
  if (!local || !domain || !domain.includes('.')) {
    throw new AgencyMembersError('Email must be a valid email address.')
  }
  return email
}

async function requireAgencyOrganizationId(agencyId: string): Promise<string> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new AgencyMembersError('Supabase service role client is not configured')
  }

  const organizationResult = await supabase
    .from('organizations')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('organization_type', 'agency')
    .limit(1)
    .maybeSingle()

  if (organizationResult.error) {
    throw new AgencyMembersError(`Failed to resolve agency organization: ${organizationResult.error.message}`)
  }

  const organizationId = normalizeText((organizationResult.data as OrganizationRow | null)?.id)
  if (!UUID_RE.test(organizationId)) {
    throw new AgencyMembersError('Agency organization scope is invalid or missing')
  }

  return organizationId
}

function resolveMemberStatus(user: AuthAdminUser): AgencyMemberStatus {
  const confirmedAt = normalizeText(user.confirmed_at) || normalizeText(user.email_confirmed_at)
  const lastSignInAt = normalizeText(user.last_sign_in_at)
  if (confirmedAt || lastSignInAt) return 'active'
  return 'invited'
}

function resolveMemberName(user: AuthAdminUser): string | null {
  const fullName = normalizeText(user.user_metadata?.full_name)
  if (fullName) return fullName

  const email = normalizeText(user.email)
  if (!email.includes('@')) return null

  const local = normalizeText(email.split('@')[0])
  return local || null
}

export function resolveMembershipOrgColumnExpression(columns: MembershipOrgColumnSupport): string {
  try {
    return resolveSharedMembershipOrgColumnExpression({
      columns,
      tableAlias: 'm',
    })
  } catch {
    throw new AgencyMembersError('memberships schema mismatch: expected organization_id and/or org_id')
  }
}

async function resolveMembershipColumnSupport(client: PoolClient): Promise<MembershipOrgColumnSupport> {
  return detectMembershipOrgColumnSupport(client)
}

export function buildListAgencyMembersSql(orgColumnExpression: string): string {
  return `
    select m.id::text as id, m.user_id::text as user_id, m.role::text as role
    from public.memberships m
    where ${orgColumnExpression} = $1::uuid
  `
}

export function buildAgencyMembershipUpsertSql(columns: MembershipOrgColumnSupport): string {
  if (columns.hasOrganizationId && columns.hasOrgId) {
    return `
      with updated as (
        update public.memberships m
           set role = $4,
               organization_id = $3::uuid,
               org_id = $3::uuid
         where m.user_id = $2::uuid
           and coalesce(m.organization_id, m.org_id) = $3::uuid
       returning m.id::text as id, m.user_id::text as user_id, m.role::text as role
      ),
      inserted as (
        insert into public.memberships (id, user_id, organization_id, org_id, role)
        select $1::uuid, $2::uuid, $3::uuid, $3::uuid, $4
        where not exists (select 1 from updated)
        returning id::text as id, user_id::text as user_id, role::text as role
      )
      select id, user_id, role from updated
      union all
      select id, user_id, role from inserted
      limit 1
    `
  }

  if (columns.hasOrganizationId) {
    return `
      with updated as (
        update public.memberships m
           set role = $4,
               organization_id = $3::uuid
         where m.user_id = $2::uuid
           and m.organization_id = $3::uuid
       returning m.id::text as id, m.user_id::text as user_id, m.role::text as role
      ),
      inserted as (
        insert into public.memberships (id, user_id, organization_id, role)
        select $1::uuid, $2::uuid, $3::uuid, $4
        where not exists (select 1 from updated)
        returning id::text as id, user_id::text as user_id, role::text as role
      )
      select id, user_id, role from updated
      union all
      select id, user_id, role from inserted
      limit 1
    `
  }

  if (columns.hasOrgId) {
    return `
      with updated as (
        update public.memberships m
           set role = $4,
               org_id = $3::uuid
         where m.user_id = $2::uuid
           and m.org_id = $3::uuid
       returning m.id::text as id, m.user_id::text as user_id, m.role::text as role
      ),
      inserted as (
        insert into public.memberships (id, user_id, org_id, role)
        select $1::uuid, $2::uuid, $3::uuid, $4
        where not exists (select 1 from updated)
        returning id::text as id, user_id::text as user_id, role::text as role
      )
      select id, user_id, role from updated
      union all
      select id, user_id, role from inserted
      limit 1
    `
  }

  throw new AgencyMembersError('memberships schema mismatch: expected organization_id and/or org_id')
}

export function buildScopedMembershipLookupSql(columns: MembershipOrgColumnSupport): string {
  const orgColumnExpression = resolveMembershipOrgColumnExpression(columns)
  return `
    select m.id::text as id, m.role::text as role, m.user_id::text as user_id
    from public.memberships m
    where m.id = $1::uuid
      and ${orgColumnExpression} = $2::uuid
    limit 1
  `
}

export function buildScopedMembershipRoleUpdateSql(columns: MembershipOrgColumnSupport): string {
  const orgColumnExpression = resolveMembershipOrgColumnExpression(columns)
  return `
    update public.memberships m
       set role = $3
     where m.id = $1::uuid
       and ${orgColumnExpression} = $2::uuid
   returning m.id::text as id, m.role::text as role
  `
}

export function buildScopedMembershipDeleteSql(columns: MembershipOrgColumnSupport): string {
  const orgColumnExpression = resolveMembershipOrgColumnExpression(columns)
  return `
    delete from public.memberships m
    where m.id = $1::uuid
      and ${orgColumnExpression} = $2::uuid
    returning m.id::text as id
  `
}

export async function listAgencyMembers(input: { agencyId: string }): Promise<AgencyMemberRow[]> {
  const agencyId = assertUuid(input.agencyId, 'agencyId')
  const organizationId = await requireAgencyOrganizationId(agencyId)

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new AgencyMembersError('Supabase service role client is not configured')
  }

  const pool = getSuperadminPool()
  const client = await pool.connect()
  let membershipRows: MembershipRow[] = []
  try {
    const membershipColumns = await resolveMembershipColumnSupport(client)
    const orgColumnExpression = resolveMembershipOrgColumnExpression(membershipColumns)
    const membershipResult = await client.query<MembershipRow>(buildListAgencyMembersSql(orgColumnExpression), [
      organizationId,
    ])
    membershipRows = membershipResult.rows
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    throw new AgencyMembersError(`Failed to list agency members: ${message}`)
  } finally {
    client.release()
  }

  const members = await Promise.all(
    membershipRows.map(async (membership): Promise<AgencyMemberRow | null> => {
      const membershipId = normalizeText(membership.id)
      const userId = normalizeText(membership.user_id)
      const role = normalizeRole(membership.role)
      if (!UUID_RE.test(membershipId) || !UUID_RE.test(userId) || role == null) {
        return null
      }

      const userResult = await supabase.auth.admin.getUserById(userId)
      if (userResult.error) {
        return {
          membership_id: membershipId,
          user_id: userId,
          role,
          email: null,
          name: null,
          status: 'invited',
          invited_at: null,
          last_sign_in_at: null,
        }
      }

      const user = (userResult.data.user ?? null) as AuthAdminUser | null
      if (!user) {
        return {
          membership_id: membershipId,
          user_id: userId,
          role,
          email: null,
          name: null,
          status: 'invited',
          invited_at: null,
          last_sign_in_at: null,
        }
      }

      return {
        membership_id: membershipId,
        user_id: userId,
        role,
        email: normalizeText(user.email) || null,
        name: resolveMemberName(user),
        status: resolveMemberStatus(user),
        invited_at: normalizeText(user.invited_at) || null,
        last_sign_in_at: normalizeText(user.last_sign_in_at) || null,
      }
    }),
  )

  return members
    .filter((member): member is AgencyMemberRow => member != null)
    .sort((a, b) => {
      const roleRank: Record<AgencyMembershipRole, number> = {
        owner: 3,
        admin: 2,
        member: 1,
      }
      if (roleRank[b.role] !== roleRank[a.role]) {
        return roleRank[b.role] - roleRank[a.role]
      }

      const aName = normalizeText(a.name || a.email).toLowerCase()
      const bName = normalizeText(b.name || b.email).toLowerCase()
      if (aName && bName && aName !== bName) {
        return aName.localeCompare(bName)
      }

      return a.membership_id.localeCompare(b.membership_id)
    })
}

export async function inviteAgencyMember(input: {
  agencyId: string
  email: string
  role: AgencyMembershipRole
}): Promise<AgencyMemberRow> {
  const agencyId = assertUuid(input.agencyId, 'agencyId')
  const email = normalizeEmail(input.email)
  const role = normalizeRole(input.role)

  if (role == null) {
    throw new AgencyMembersError('Role must be owner, admin, or member.')
  }

  const organizationId = await requireAgencyOrganizationId(agencyId)

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    throw new AgencyMembersError('Supabase service role client is not configured')
  }

  const inviteResult = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: buildAgencyOwnerInviteRedirectTo(
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.GNR8_APP_URL ?? null,
    ),
  })

  if (inviteResult.error) {
    throw new AgencyMembersError(`Failed to send invite: ${inviteResult.error.message}`)
  }

  const userId = normalizeText(inviteResult.data.user?.id)
  if (!UUID_RE.test(userId)) {
    throw new AgencyMembersError('Failed to resolve invited user id')
  }

  const pool = getSuperadminPool()
  const client = await pool.connect()
  let membership: MembershipRow | null = null
  try {
    const columns = await resolveMembershipColumnSupport(client)
    const sql = buildAgencyMembershipUpsertSql(columns)
    const result = await client.query<MembershipRow>(sql, [randomUUID(), userId, organizationId, role])
    membership = result.rows[0] ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    throw new AgencyMembersError(`Failed to assign agency membership: ${message}`)
  } finally {
    client.release()
  }

  const membershipId = normalizeText(membership?.id)
  const normalizedRole = normalizeRole(membership?.role) ?? role

  if (!UUID_RE.test(membershipId)) {
    throw new AgencyMembersError('Failed to persist agency membership')
  }

  return {
    membership_id: membershipId,
    user_id: userId,
    role: normalizedRole,
    email,
    name: resolveMemberName({ email }),
    status: 'invited',
    invited_at: new Date().toISOString(),
    last_sign_in_at: null,
  }
}

export async function updateAgencyMemberRole(input: {
  agencyId: string
  membershipId: string
  role: 'admin' | 'member'
}): Promise<{ membershipId: string; role: 'admin' | 'member' }> {
  const agencyId = assertUuid(input.agencyId, 'agencyId')
  const membershipId = assertUuid(input.membershipId, 'membershipId')
  const role = normalizeRole(input.role)

  if (role !== 'admin' && role !== 'member') {
    throw new AgencyMembersError('Role update is limited to admin or member in V1.')
  }

  const organizationId = await requireAgencyOrganizationId(agencyId)

  const pool = getSuperadminPool()
  const client = await pool.connect()
  try {
    const columns = await resolveMembershipColumnSupport(client)

    const lookupResult = await client.query<MembershipScopedRow>(buildScopedMembershipLookupSql(columns), [
      membershipId,
      organizationId,
    ])

    const currentMembership = lookupResult.rows[0] ?? null
    if (!currentMembership) {
      throw new AgencyMembersError('Member not found in current agency scope.')
    }

    if (normalizeRole(currentMembership.role) === 'owner') {
      throw new AgencyMembersError('Owner role transfer is intentionally blocked in V1.')
    }

    const updateResult = await client.query<{ id: string | null; role: string | null }>(
      buildScopedMembershipRoleUpdateSql(columns),
      [membershipId, organizationId, role],
    )

    const updated = updateResult.rows[0] ?? null
    const updatedId = normalizeText(updated?.id)
    const updatedRole = normalizeRole(updated?.role)

    if (!UUID_RE.test(updatedId) || (updatedRole !== 'admin' && updatedRole !== 'member')) {
      throw new AgencyMembersError('Role update completed with invalid response payload.')
    }

    return {
      membershipId: updatedId,
      role: updatedRole,
    }
  } catch (error) {
    if (error instanceof AgencyMembersError) throw error
    const message = error instanceof Error ? error.message : 'unknown error'
    throw new AgencyMembersError(`Failed to update member role: ${message}`)
  } finally {
    client.release()
  }
}

export async function removeAgencyMember(input: {
  agencyId: string
  membershipId: string
  actorUserId: string
}): Promise<void> {
  const agencyId = assertUuid(input.agencyId, 'agencyId')
  const membershipId = assertUuid(input.membershipId, 'membershipId')
  const actorUserId = assertUuid(input.actorUserId, 'actorUserId')

  const organizationId = await requireAgencyOrganizationId(agencyId)

  const pool = getSuperadminPool()
  const client = await pool.connect()
  try {
    const columns = await resolveMembershipColumnSupport(client)

    const lookupResult = await client.query<MembershipScopedRow>(buildScopedMembershipLookupSql(columns), [
      membershipId,
      organizationId,
    ])

    const currentMembership = lookupResult.rows[0] ?? null
    if (!currentMembership) {
      throw new AgencyMembersError('Member not found in current agency scope.')
    }

    const role = normalizeRole(currentMembership.role)
    if (role === 'owner') {
      throw new AgencyMembersError('Owner removal is intentionally blocked in V1.')
    }

    if (normalizeText(currentMembership.user_id) === actorUserId) {
      throw new AgencyMembersError('Self-removal is blocked in V1.')
    }

    await client.query<{ id: string | null }>(buildScopedMembershipDeleteSql(columns), [membershipId, organizationId])
  } catch (error) {
    if (error instanceof AgencyMembersError) throw error
    const message = error instanceof Error ? error.message : 'unknown error'
    throw new AgencyMembersError(`Failed to remove member: ${message}`)
  } finally {
    client.release()
  }
}
