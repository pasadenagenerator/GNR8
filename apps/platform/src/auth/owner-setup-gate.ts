import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const OWNER_SETUP_PATH = '/gnr8/onboarding/owner-setup'

type MembershipRow = {
  id: string | null
  role: string | null
  organization_id?: string | null
  org_id?: string | null
  owner_setup_completed?: boolean | null
}

type OrganizationRow = {
  id: string | null
  agency_id: string | null
  organization_type: string | null
}

type OwnerMembershipContext = {
  membership_id: string
  agency_id: string
  owner_setup_completed: boolean
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function normalizeOrganizationId(row: MembershipRow): string | null {
  const organizationId = normalizeText(row.organization_id)
  if (organizationId) return organizationId
  const legacyOrganizationId = normalizeText(row.org_id)
  if (legacyOrganizationId) return legacyOrganizationId
  return null
}

async function requireCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const authResult = await supabase.auth.getUser()
  const userId = normalizeText(authResult.data.user?.id)
  if (authResult.error || !userId || !isUuid(userId)) {
    throw new Error('Unauthorized')
  }
  return userId
}

async function listMembershipRows(supabase: SupabaseClient, userId: string): Promise<MembershipRow[]> {
  const preferred = await supabase
    .from('memberships')
    .select('id,role,organization_id,org_id,owner_setup_completed')
    .eq('user_id', userId)

  if (preferred.error == null) {
    return Array.isArray(preferred.data) ? (preferred.data as MembershipRow[]) : []
  }

  const fallback = await supabase
    .from('memberships')
    .select('id,role,organization_id,org_id')
    .eq('user_id', userId)

  if (fallback.error == null) {
    return Array.isArray(fallback.data)
      ? (fallback.data as MembershipRow[]).map((row) => ({ ...row, owner_setup_completed: false }))
      : []
  }

  const legacyFallback = await supabase
    .from('memberships')
    .select('id,role,org_id')
    .eq('user_id', userId)

  if (legacyFallback.error) {
    throw new Error(`Membership lookup failed: ${legacyFallback.error.message}`)
  }

  return Array.isArray(legacyFallback.data)
    ? (legacyFallback.data as MembershipRow[]).map((row) => ({ ...row, owner_setup_completed: false }))
    : []
}

async function listOwnerMembershipContexts(supabase: SupabaseClient, userId: string): Promise<OwnerMembershipContext[]> {
  const membershipRows = await listMembershipRows(supabase, userId)

  const ownerRows = membershipRows
    .map((row) => {
      const membershipId = normalizeText(row.id)
      const role = normalizeText(row.role).toLowerCase()
      const organizationId = normalizeOrganizationId(row)
      if (!membershipId || !isUuid(membershipId)) return null
      if (role !== 'owner') return null
      if (!organizationId || !isUuid(organizationId)) return null
      return {
        membership_id: membershipId,
        organization_id: organizationId,
        owner_setup_completed: row.owner_setup_completed === true,
      }
    })
    .filter(
      (
        row,
      ): row is { membership_id: string; organization_id: string; owner_setup_completed: boolean } => row != null,
    )

  if (ownerRows.length === 0) return []

  const organizationIds = Array.from(new Set(ownerRows.map((row) => row.organization_id)))

  const organizationResult = await supabase
    .from('organizations')
    .select('id,agency_id,organization_type')
    .in('id', organizationIds)

  if (organizationResult.error) {
    throw new Error(`Organization lookup failed: ${organizationResult.error.message}`)
  }

  const organizations = Array.isArray(organizationResult.data)
    ? (organizationResult.data as OrganizationRow[])
    : []
  const agencyIdByOrganizationId = new Map<string, string>()

  for (const organization of organizations) {
    const organizationId = normalizeText(organization.id)
    const agencyId = normalizeText(organization.agency_id)
    const organizationType = normalizeText(organization.organization_type).toLowerCase()
    if (!organizationId || !isUuid(organizationId)) continue
    if (!agencyId || !isUuid(agencyId)) continue
    if (organizationType !== 'agency') continue
    agencyIdByOrganizationId.set(organizationId, agencyId)
  }

  return ownerRows
    .map((row) => {
      const agencyId = agencyIdByOrganizationId.get(row.organization_id)
      if (!agencyId) return null
      return {
        membership_id: row.membership_id,
        agency_id: agencyId,
        owner_setup_completed: row.owner_setup_completed,
      }
    })
    .filter((row): row is OwnerMembershipContext => row != null)
}

async function getOwnerSetupStatusForAgencyWithClient(
  supabase: SupabaseClient,
  input: { userId: string; agencyId: string },
): Promise<{ hasOwnerMembership: boolean; isCompleted: boolean; membershipIds: string[] }> {
  const contexts = await listOwnerMembershipContexts(supabase, input.userId)
  const ownerMembershipsForAgency = contexts.filter((context) => context.agency_id === input.agencyId)

  if (ownerMembershipsForAgency.length === 0) {
    return {
      hasOwnerMembership: false,
      isCompleted: true,
      membershipIds: [],
    }
  }

  return {
    hasOwnerMembership: true,
    isCompleted: ownerMembershipsForAgency.every((context) => context.owner_setup_completed),
    membershipIds: ownerMembershipsForAgency.map((context) => context.membership_id),
  }
}

export async function getOwnerSetupStatusForAgencyForPage(input: {
  userId: string
  agencyId: string
}): Promise<{ hasOwnerMembership: boolean; isCompleted: boolean; membershipIds: string[] }> {
  const supabase = await getSupabaseServerClientReadOnly()
  return getOwnerSetupStatusForAgencyWithClient(supabase, input)
}

export async function getOwnerSetupStatusForAgency(input: {
  userId: string
  agencyId: string
}): Promise<{ hasOwnerMembership: boolean; isCompleted: boolean; membershipIds: string[] }> {
  const supabase = await getSupabaseServerClientMutating()
  return getOwnerSetupStatusForAgencyWithClient(supabase, input)
}

export async function listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage(): Promise<string[]> {
  const supabase = await getSupabaseServerClientReadOnly()
  const userId = await requireCurrentUserId(supabase)
  const contexts = await listOwnerMembershipContexts(supabase, userId)
  return Array.from(
    new Set(
      contexts
        .filter((context) => !context.owner_setup_completed)
        .map((context) => context.agency_id),
    ),
  )
}
