import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildMembershipSelectAttempts,
  normalizeMembershipOrganizationId,
} from '@/src/auth/membership-org-column-compat'
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

export type OwnerSetupStatusForAgency = {
  hasOwnerMembership: boolean
  isCompleted: boolean
  membershipIds: string[]
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
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
  const attempts = buildMembershipSelectAttempts({
    baseColumns: ['id', 'role'],
    includeOwnerSetupCompleted: true,
  })

  let lastError: Error | null = null

  for (const attempt of attempts) {
    const result = await supabase.from('memberships').select(attempt.select).eq('user_id', userId)
    if (result.error) {
      lastError = new Error(result.error.message)
      continue
    }

    const rows = Array.isArray(result.data) ? (result.data as unknown as MembershipRow[]) : []
    if (!attempt.inferOwnerSetupCompletedAsFalse) {
      return rows
    }

    return rows.map((row) => ({ ...row, owner_setup_completed: false }))
  }

  throw new Error(`Membership lookup failed: ${lastError?.message ?? 'unknown error'}`)
}

async function listOwnerMembershipContexts(supabase: SupabaseClient, userId: string): Promise<OwnerMembershipContext[]> {
  const membershipRows = await listMembershipRows(supabase, userId)

  const ownerRows = membershipRows
    .map((row) => {
      const membershipId = normalizeText(row.id)
      const role = normalizeText(row.role).toLowerCase()
      const organizationId = normalizeMembershipOrganizationId(row)
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

export function evaluateOwnerSetupStatusForAgency(input: {
  contexts: OwnerMembershipContext[]
  agencyId: string
}): OwnerSetupStatusForAgency {
  const contexts = input.contexts
  const agencyId = input.agencyId
  const ownerMembershipsForAgency = contexts.filter((context) => context.agency_id === agencyId)

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

async function getOwnerSetupStatusForAgencyWithClient(
  supabase: SupabaseClient,
  input: { userId: string; agencyId: string },
): Promise<OwnerSetupStatusForAgency> {
  const contexts = await listOwnerMembershipContexts(supabase, input.userId)
  return evaluateOwnerSetupStatusForAgency({
    contexts,
    agencyId: input.agencyId,
  })
}

export async function getOwnerSetupStatusForAgencyForPage(input: {
  userId: string
  agencyId: string
}): Promise<OwnerSetupStatusForAgency> {
  const supabase = await getSupabaseServerClientReadOnly()
  return getOwnerSetupStatusForAgencyWithClient(supabase, input)
}

export async function getOwnerSetupStatusForAgency(input: {
  userId: string
  agencyId: string
}): Promise<OwnerSetupStatusForAgency> {
  const supabase = await getSupabaseServerClientMutating()
  return getOwnerSetupStatusForAgencyWithClient(supabase, input)
}

export async function listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage(input?: {
  userId?: string | null
}): Promise<string[]> {
  const supabase = await getSupabaseServerClientReadOnly()
  const providedUserId = normalizeText(input?.userId)
  const userId = providedUserId && isUuid(providedUserId) ? providedUserId : await requireCurrentUserId(supabase)
  const contexts = await listOwnerMembershipContexts(supabase, userId)
  return Array.from(
    new Set(
      contexts
        .filter((context) => !context.owner_setup_completed)
        .map((context) => context.agency_id),
    ),
  )
}
