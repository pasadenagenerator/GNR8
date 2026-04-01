import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const CLIENT_SETUP_PATH = '/gnr8/onboarding/client-setup'

type ClientMembershipSetupRow = {
  id: string | null
  client_organization_id: string | null
  agency_id: string | null
  client_setup_completed?: boolean | null
  first_name?: string | null
  last_name?: string | null
  mobile_number?: string | null
}

type ClientSetupContext = {
  membership_id: string
  client_id: string
  agency_id: string
  client_setup_completed: boolean
  first_name: string | null
  last_name: string | null
  mobile_number: string | null
}

export type ClientSetupStatusForClient = {
  hasClientMembership: boolean
  isCompleted: boolean
  membershipIds: string[]
  firstName: string | null
  surname: string | null
  mobileNumber: string | null
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

async function listClientSetupContexts(supabase: SupabaseClient, userId: string): Promise<ClientSetupContext[]> {
  const result = await supabase
    .from('client_memberships')
    .select('id,client_organization_id,agency_id,client_setup_completed,first_name,last_name,mobile_number')
    .eq('user_id', userId)

  if (result.error) {
    throw new Error(`Client membership setup lookup failed: ${result.error.message}`)
  }

  const rows = Array.isArray(result.data) ? (result.data as ClientMembershipSetupRow[]) : []

  return rows
    .map((row): ClientSetupContext | null => {
      const membershipId = normalizeText(row.id)
      const clientId = normalizeText(row.client_organization_id)
      const agencyId = normalizeText(row.agency_id)
      if (!isUuid(membershipId) || !isUuid(clientId) || !isUuid(agencyId)) return null
      return {
        membership_id: membershipId,
        client_id: clientId,
        agency_id: agencyId,
        client_setup_completed: row.client_setup_completed === true,
        first_name: normalizeText(row.first_name) || null,
        last_name: normalizeText(row.last_name) || null,
        mobile_number: normalizeText(row.mobile_number) || null,
      }
    })
    .filter((row): row is ClientSetupContext => row != null)
}

export function evaluateClientSetupStatusForClient(input: {
  contexts: ClientSetupContext[]
  clientId: string
  agencyId: string
}): ClientSetupStatusForClient {
  const membershipsForClient = input.contexts.filter(
    (context) => context.client_id === input.clientId && context.agency_id === input.agencyId,
  )

  if (membershipsForClient.length === 0) {
    return {
      hasClientMembership: false,
      isCompleted: true,
      membershipIds: [],
      firstName: null,
      surname: null,
      mobileNumber: null,
    }
  }

  const firstName = membershipsForClient.find((membership) => membership.first_name)?.first_name ?? null
  const surname = membershipsForClient.find((membership) => membership.last_name)?.last_name ?? null
  const mobileNumber = membershipsForClient.find((membership) => membership.mobile_number)?.mobile_number ?? null

  return {
    hasClientMembership: true,
    isCompleted: membershipsForClient.every((membership) => membership.client_setup_completed),
    membershipIds: membershipsForClient.map((membership) => membership.membership_id),
    firstName,
    surname,
    mobileNumber,
  }
}

async function getClientSetupStatusForClientWithSupabase(
  supabase: SupabaseClient,
  input: {
    userId: string
    clientId: string
    agencyId: string
  },
): Promise<ClientSetupStatusForClient> {
  const contexts = await listClientSetupContexts(supabase, input.userId)
  return evaluateClientSetupStatusForClient({
    contexts,
    clientId: input.clientId,
    agencyId: input.agencyId,
  })
}

export async function getClientSetupStatusForClientForPage(input: {
  userId: string
  clientId: string
  agencyId: string
}): Promise<ClientSetupStatusForClient> {
  const supabase = await getSupabaseServerClientReadOnly()
  return getClientSetupStatusForClientWithSupabase(supabase, input)
}

export async function getClientSetupStatusForClient(input: {
  userId: string
  clientId: string
  agencyId: string
}): Promise<ClientSetupStatusForClient> {
  const supabase = await getSupabaseServerClientMutating()
  return getClientSetupStatusForClientWithSupabase(supabase, input)
}

export async function listIncompleteClientSetupClientIdsForCurrentUserForPage(): Promise<string[]> {
  const supabase = await getSupabaseServerClientReadOnly()
  const userId = await requireCurrentUserId(supabase)
  const contexts = await listClientSetupContexts(supabase, userId)

  return Array.from(new Set(contexts.filter((context) => !context.client_setup_completed).map((context) => context.client_id)))
}
