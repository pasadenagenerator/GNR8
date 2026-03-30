import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseServerClient, getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type AgencyMembershipRole = 'owner' | 'admin' | 'member'

export type ResolvedCurrentUserAgency = {
  user_id: string
  agency_id: string
  agency_name: string | null
  role: AgencyMembershipRole
}

export type CurrentUserAgencyMembership = {
  agency_id: string
  agency_name: string | null
  role: AgencyMembershipRole
}

export class ResolveCurrentAgencyError extends Error {
  readonly code:
    | 'UNAUTHORIZED'
    | 'NO_MEMBERSHIP'
    | 'INVALID_MEMBERSHIP'
    | 'AMBIGUOUS_MEMBERSHIP'
    | 'ACTIVE_AGENCY_REQUIRED'
    | 'ACTIVE_AGENCY_INVALID'

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

type AgencyMembershipCandidate = {
  organization_id: string
  role: AgencyMembershipRole
  agency_id: string
  agency_name: string | null
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

function dedupeMembershipCandidates(candidates: AgencyMembershipCandidate[]): CurrentUserAgencyMembership[] {
  const roleRank: Record<AgencyMembershipRole, number> = {
    owner: 3,
    admin: 2,
    member: 1,
  }
  const byAgencyId = new Map<string, CurrentUserAgencyMembership>()

  for (const candidate of candidates) {
    const existing = byAgencyId.get(candidate.agency_id)
    if (!existing) {
      byAgencyId.set(candidate.agency_id, {
        agency_id: candidate.agency_id,
        agency_name: candidate.agency_name,
        role: candidate.role,
      })
      continue
    }

    if (roleRank[candidate.role] > roleRank[existing.role]) {
      byAgencyId.set(candidate.agency_id, {
        agency_id: candidate.agency_id,
        agency_name: candidate.agency_name ?? existing.agency_name,
        role: candidate.role,
      })
      continue
    }

    if (!existing.agency_name && candidate.agency_name) {
      byAgencyId.set(candidate.agency_id, {
        ...existing,
        agency_name: candidate.agency_name,
      })
    }
  }

  return Array.from(byAgencyId.values()).sort((a, b) => {
    const aName = normalizeText(a.agency_name).toLowerCase()
    const bName = normalizeText(b.agency_name).toLowerCase()
    if (aName && bName && aName !== bName) return aName.localeCompare(bName)
    if (aName && !bName) return -1
    if (!aName && bName) return 1
    return a.agency_id.localeCompare(b.agency_id)
  })
}

export function selectCurrentAgencyMembership(input: {
  memberships: CurrentUserAgencyMembership[]
  activeAgencyId?: string | null
}): CurrentUserAgencyMembership {
  const memberships = input.memberships
  if (memberships.length === 0) {
    throw new ResolveCurrentAgencyError('NO_MEMBERSHIP', 'No agency access')
  }

  const activeAgencyId = normalizeText(input.activeAgencyId)
  if (memberships.length === 1) {
    const onlyMembership = memberships[0]
    if (activeAgencyId && activeAgencyId !== onlyMembership.agency_id) {
      throw new ResolveCurrentAgencyError('ACTIVE_AGENCY_INVALID', 'Active agency is invalid for current user membership')
    }
    return onlyMembership
  }

  if (!activeAgencyId) {
    throw new ResolveCurrentAgencyError(
      'ACTIVE_AGENCY_REQUIRED',
      'Multiple agency memberships detected; active agency selection is required',
    )
  }

  const matched = memberships.find((membership) => membership.agency_id === activeAgencyId)
  if (!matched) {
    throw new ResolveCurrentAgencyError('ACTIVE_AGENCY_INVALID', 'Active agency is invalid for current user membership')
  }

  return matched
}

async function requireCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const authResult = await supabase.auth.getUser()
  const userId = normalizeText(authResult.data.user?.id)
  if (authResult.error || !userId || !isUuid(userId)) {
    throw new ResolveCurrentAgencyError('UNAUTHORIZED', 'Unauthorized')
  }
  return userId
}

async function listAgencyMembershipCandidates(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentUserAgencyMembership[]> {
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

  if (normalizedMemberships.length === 0) return []

  const uniqueOrganizationIds = Array.from(new Set(normalizedMemberships.map((membership) => membership.organization_id)))

  const organizationResult = await supabase
    .from('organizations')
    .select('id,agency_id,organization_type')
    .in('id', uniqueOrganizationIds)

  if (organizationResult.error) {
    throw new ResolveCurrentAgencyError('INVALID_MEMBERSHIP', `Organization lookup failed: ${organizationResult.error.message}`)
  }

  const organizations = Array.isArray(organizationResult.data)
    ? (organizationResult.data as OrganizationRow[])
    : []
  const organizationsById = new Map<string, OrganizationRow>()
  for (const organization of organizations) {
    const organizationId = normalizeText(organization.id)
    if (!organizationId || !isUuid(organizationId)) continue
    organizationsById.set(organizationId, organization)
  }

  const validAgencyMemberships = normalizedMemberships
    .map((membership) => {
      const organization = organizationsById.get(membership.organization_id)
      if (!organization) return null
      const organizationType = normalizeText(organization.organization_type).toLowerCase()
      const agencyId = normalizeText(organization.agency_id)
      if (organizationType !== 'agency' || !isUuid(agencyId)) return null
      return {
        organization_id: membership.organization_id,
        role: membership.role,
        agency_id: agencyId,
      }
    })
    .filter(
      (membership): membership is { organization_id: string; role: AgencyMembershipRole; agency_id: string } =>
        membership != null,
    )

  if (validAgencyMemberships.length === 0) {
    return []
  }

  const uniqueAgencyIds = Array.from(new Set(validAgencyMemberships.map((membership) => membership.agency_id)))
  const agencyResult = await supabase
    .from('agencies')
    .select('id,name')
    .in('id', uniqueAgencyIds)

  if (agencyResult.error) {
    throw new ResolveCurrentAgencyError('INVALID_MEMBERSHIP', `Agency lookup failed: ${agencyResult.error.message}`)
  }

  const agencies = Array.isArray(agencyResult.data) ? (agencyResult.data as AgencyRow[]) : []
  const agencyNameById = new Map<string, string | null>()
  for (const agency of agencies) {
    const agencyId = normalizeText(agency.id)
    if (!agencyId || !isUuid(agencyId)) continue
    agencyNameById.set(agencyId, normalizeText(agency.name) || null)
  }

  const candidates: AgencyMembershipCandidate[] = validAgencyMemberships.map((membership) => ({
    organization_id: membership.organization_id,
    role: membership.role,
    agency_id: membership.agency_id,
    agency_name: agencyNameById.get(membership.agency_id) ?? null,
  }))

  return dedupeMembershipCandidates(candidates)
}

export async function listCurrentUserAgencyMemberships(): Promise<{
  user_id: string
  memberships: CurrentUserAgencyMembership[]
}> {
  const supabase = await getSupabaseServerClient()
  const userId = await requireCurrentUserId(supabase)
  const memberships = await listAgencyMembershipCandidates(supabase, userId)
  return {
    user_id: userId,
    memberships,
  }
}

export async function listCurrentUserAgencyMembershipsForPage(): Promise<{
  user_id: string
  memberships: CurrentUserAgencyMembership[]
}> {
  const supabase = await getSupabaseServerClientReadOnly()
  const userId = await requireCurrentUserId(supabase)
  const memberships = await listAgencyMembershipCandidates(supabase, userId)
  return {
    user_id: userId,
    memberships,
  }
}

export async function resolveCurrentUserAgency(input?: {
  activeAgencyId?: string | null
}): Promise<ResolvedCurrentUserAgency> {
  const supabase = await getSupabaseServerClient()
  const userId = await requireCurrentUserId(supabase)
  const memberships = await listAgencyMembershipCandidates(supabase, userId)
  const selectedMembership = selectCurrentAgencyMembership({
    memberships,
    activeAgencyId: input?.activeAgencyId ?? null,
  })

  return {
    user_id: userId,
    agency_id: selectedMembership.agency_id,
    agency_name: selectedMembership.agency_name ?? null,
    role: selectedMembership.role,
  }
}

export async function resolveCurrentUserAgencyForPage(input?: {
  activeAgencyId?: string | null
}): Promise<ResolvedCurrentUserAgency> {
  const supabase = await getSupabaseServerClientReadOnly()
  const userId = await requireCurrentUserId(supabase)
  const memberships = await listAgencyMembershipCandidates(supabase, userId)
  const selectedMembership = selectCurrentAgencyMembership({
    memberships,
    activeAgencyId: input?.activeAgencyId ?? null,
  })

  return {
    user_id: userId,
    agency_id: selectedMembership.agency_id,
    agency_name: selectedMembership.agency_name ?? null,
    role: selectedMembership.role,
  }
}
