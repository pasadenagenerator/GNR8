import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseServerClient } from '@/src/auth/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type AgencyMembershipRole = 'owner' | 'admin' | 'member'

export type ResolvedCurrentUserAgency = {
  user_id: string
  agency_id: string
  agency_name: string | null
  role: AgencyMembershipRole
}

export class ResolveCurrentAgencyError extends Error {
  readonly code: 'UNAUTHORIZED' | 'NO_MEMBERSHIP' | 'INVALID_MEMBERSHIP' | 'AMBIGUOUS_MEMBERSHIP'

  constructor(code: ResolveCurrentAgencyError['code'], message: string) {
    super(message)
    this.name = 'ResolveCurrentAgencyError'
    this.code = code
  }
}

type MembershipRow = {
  user_id: string | null
  role: string | null
  organization_id?: string | null
  org_id?: string | null
}

type OrganizationRow = {
  id: string | null
  agency_id: string | null
  organization_type: string | null
}

type AgencyRow = {
  id: string | null
  name: string | null
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function normalizeMembershipRole(value: string): AgencyMembershipRole | null {
  if (value === 'owner' || value === 'admin' || value === 'member') return value
  return null
}

function normalizeOrganizationId(row: MembershipRow): string | null {
  const organizationId = normalizeText(row.organization_id)
  if (organizationId) return organizationId
  const legacyOrganizationId = normalizeText(row.org_id)
  if (legacyOrganizationId) return legacyOrganizationId
  return null
}

async function listMembershipRows(supabase: SupabaseClient, userId: string): Promise<MembershipRow[]> {
  const preferred = await supabase
    .from('memberships')
    .select('user_id,role,organization_id,org_id')
    .eq('user_id', userId)

  if (preferred.error == null) {
    return Array.isArray(preferred.data) ? (preferred.data as MembershipRow[]) : []
  }

  const fallback = await supabase
    .from('memberships')
    .select('user_id,role,org_id')
    .eq('user_id', userId)

  if (fallback.error) {
    throw new ResolveCurrentAgencyError('INVALID_MEMBERSHIP', `Membership lookup failed: ${fallback.error.message}`)
  }

  return Array.isArray(fallback.data) ? (fallback.data as MembershipRow[]) : []
}

export async function resolveCurrentUserAgency(): Promise<ResolvedCurrentUserAgency> {
  const supabase = await getSupabaseServerClient()

  const authResult = await supabase.auth.getUser()
  const userId = normalizeText(authResult.data.user?.id)
  if (authResult.error || !userId || !isUuid(userId)) {
    throw new ResolveCurrentAgencyError('UNAUTHORIZED', 'Unauthorized')
  }

  const rawMemberships = await listMembershipRows(supabase, userId)
  const normalizedMemberships = rawMemberships
    .map((row) => {
      const role = normalizeMembershipRole(normalizeText(row.role).toLowerCase())
      const organizationId = normalizeOrganizationId(row)
      if (role == null || organizationId == null || !isUuid(organizationId)) return null
      return {
        role,
        organization_id: organizationId,
      }
    })
    .filter((row): row is { role: AgencyMembershipRole; organization_id: string } => row != null)

  if (normalizedMemberships.length === 0) {
    throw new ResolveCurrentAgencyError('NO_MEMBERSHIP', 'No agency access')
  }

  const uniqueMemberships = Array.from(
    new Map(
      normalizedMemberships.map((row) => [`${row.organization_id}:${row.role}`, row]),
    ).values(),
  )

  if (uniqueMemberships.length !== 1) {
    throw new ResolveCurrentAgencyError('AMBIGUOUS_MEMBERSHIP', 'Ambiguous memberships for current user')
  }

  const membership = uniqueMemberships[0]
  const organizationResult = await supabase
    .from('organizations')
    .select('id,agency_id,organization_type')
    .eq('id', membership.organization_id)
    .limit(1)
    .maybeSingle()

  if (organizationResult.error) {
    throw new ResolveCurrentAgencyError('INVALID_MEMBERSHIP', `Organization lookup failed: ${organizationResult.error.message}`)
  }

  const organization = organizationResult.data as OrganizationRow | null
  const organizationType = normalizeText(organization?.organization_type).toLowerCase()
  const agencyId = normalizeText(organization?.agency_id)
  if (!organization || organizationType !== 'agency' || !isUuid(agencyId)) {
    throw new ResolveCurrentAgencyError('INVALID_MEMBERSHIP', 'Membership does not map to a valid agency organization')
  }

  const agencyResult = await supabase
    .from('agencies')
    .select('id,name')
    .eq('id', agencyId)
    .limit(1)
    .maybeSingle()

  if (agencyResult.error) {
    throw new ResolveCurrentAgencyError('INVALID_MEMBERSHIP', `Agency lookup failed: ${agencyResult.error.message}`)
  }

  const agency = agencyResult.data as AgencyRow | null
  if (!agency || !isUuid(normalizeText(agency.id))) {
    throw new ResolveCurrentAgencyError('INVALID_MEMBERSHIP', 'Membership does not map to a valid agency')
  }

  const agencyName = normalizeText(agency.name)

  return {
    user_id: userId,
    agency_id: agencyId,
    agency_name: agencyName || null,
    role: membership.role,
  }
}
