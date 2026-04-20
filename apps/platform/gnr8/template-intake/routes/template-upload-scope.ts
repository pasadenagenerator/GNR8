import { createServerClient, type CookieOptions } from '@supabase/ssr'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value)
  if (!normalized || !UUID_RE.test(normalized)) return null
  return normalized
}

function parseAllowlist(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

function parseRequestCookies(request: Request): { name: string; value: string }[] {
  const cookieHeader = normalizeText(request.headers.get('cookie'))
  if (!cookieHeader) return []
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=')
      if (separator < 0) return null
      const name = part.slice(0, separator).trim()
      const value = part.slice(separator + 1).trim()
      if (!name) return null
      return { name, value }
    })
    .filter((cookie): cookie is { name: string; value: string } => cookie != null)
}

function createRequestSupabaseClient(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl) throw new Error('500|NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!supabaseAnon) throw new Error('500|NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')

  const requestCookies = parseRequestCookies(request)
  return createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return requestCookies
      },
      setAll(_cookiesToSet: CookieToSet[]) {
        // Upload scope checks are read-only and do not mutate cookies.
      },
    },
  })
}

async function requireActorUser(input: {
  request: Request
}): Promise<{ id: string; email: string }> {
  const supabase = createRequestSupabaseClient(input.request)
  const authResult = await supabase.auth.getUser()
  const userId = normalizeUuid(authResult.data.user?.id)
  const email = normalizeText(authResult.data.user?.email).toLowerCase()
  if (authResult.error || !userId) {
    throw new Error('401|You must be signed in.')
  }
  return {
    id: userId,
    email,
  }
}

async function resolveClientAgencyByOrganization(input: {
  request: Request
  clientId: string
}): Promise<{ clientId: string; agencyId: string } | null> {
  const supabase = createRequestSupabaseClient(input.request)
  const organizationResult = await supabase
    .from('organizations')
    .select('id,agency_id,organization_type')
    .eq('id', input.clientId)
    .eq('organization_type', 'client')
    .limit(1)
    .maybeSingle()
  if (organizationResult.error) {
    throw new Error(`500|Failed to resolve client organization scope: ${organizationResult.error.message}`)
  }

  const resolvedClientId = normalizeUuid(organizationResult.data?.id)
  const resolvedAgencyId = normalizeUuid(organizationResult.data?.agency_id)
  if (!resolvedClientId || !resolvedAgencyId) return null
  return {
    clientId: resolvedClientId,
    agencyId: resolvedAgencyId,
  }
}

async function resolveClientMembershipForUser(input: {
  request: Request
  userId: string
  clientId: string
}): Promise<{ clientId: string; agencyId: string } | null> {
  const supabase = createRequestSupabaseClient(input.request)
  const membershipResult = await supabase
    .from('client_memberships')
    .select('client_organization_id,agency_id')
    .eq('user_id', input.userId)
    .eq('client_organization_id', input.clientId)
    .limit(1)
    .maybeSingle()
  if (membershipResult.error) {
    throw new Error(`500|Client membership lookup failed: ${membershipResult.error.message}`)
  }

  const membershipClientId = normalizeUuid(membershipResult.data?.client_organization_id)
  const membershipAgencyId = normalizeUuid(membershipResult.data?.agency_id)
  if (!membershipClientId || !membershipAgencyId) return null
  return {
    clientId: membershipClientId,
    agencyId: membershipAgencyId,
  }
}

async function hasAgencyMembership(input: {
  request: Request
  userId: string
  agencyId: string
}): Promise<boolean> {
  const supabase = createRequestSupabaseClient(input.request)

  const primaryResult = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', input.userId)
    .eq('organization_id', input.agencyId)
    .limit(1)
    .maybeSingle()
  if (!primaryResult.error) {
    return normalizeUuid(primaryResult.data?.organization_id) === input.agencyId
  }

  const fallbackResult = await supabase
    .from('memberships')
    .select('org_id')
    .eq('user_id', input.userId)
    .eq('org_id', input.agencyId)
    .limit(1)
    .maybeSingle()
  if (fallbackResult.error) {
    throw new Error(`500|Agency membership lookup failed: ${fallbackResult.error.message}`)
  }

  return normalizeUuid(fallbackResult.data?.org_id) === input.agencyId
}

async function isSuperadminUser(input: {
  request: Request
}): Promise<{ userId: string } | null> {
  const actor = await requireActorUser({
    request: input.request,
  })
  const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAILS)
  if (!actor.email || allowlist.length === 0 || !allowlist.includes(actor.email)) return null
  return { userId: actor.id }
}

export function parseThrownScopeError(error: unknown): { status: number; message: string } {
  if (error instanceof Error && error.message.includes('|')) {
    const [statusRaw, ...parts] = error.message.split('|')
    const status = Number(statusRaw)
    if (Number.isFinite(status) && status >= 400 && status < 600) {
      return {
        status,
        message: parts.join('|').trim() || 'Template scope validation failed.',
      }
    }
  }

  if (error instanceof Error) return { status: 500, message: error.message }
  return { status: 500, message: 'Template scope resolution failed.' }
}

export async function requireClientTemplateScopeForUpload(input: {
  request: Request
  clientIdParam: string
}): Promise<{ userId: string; clientId: string; organizationId: string; agencyId: string }> {
  const clientId = normalizeUuid(input.clientIdParam)
  if (!clientId) {
    throw new Error('400|clientId must be a valid UUID.')
  }

  const superadmin = await isSuperadminUser({
    request: input.request,
  })
  const clientAgencyScope = await resolveClientAgencyByOrganization({
    request: input.request,
    clientId,
  })
  if (!clientAgencyScope) {
    throw new Error('403|Client scope is invalid for current access context.')
  }

  if (superadmin) {
    return {
      userId: superadmin.userId,
      clientId: clientAgencyScope.clientId,
      organizationId: clientAgencyScope.clientId,
      agencyId: clientAgencyScope.agencyId,
    }
  }

  const actor = await requireActorUser({
    request: input.request,
  })

  const directMembership = await resolveClientMembershipForUser({
    request: input.request,
    userId: actor.id,
    clientId: clientAgencyScope.clientId,
  })
  if (directMembership) {
    return {
      userId: actor.id,
      clientId: directMembership.clientId,
      organizationId: directMembership.clientId,
      agencyId: directMembership.agencyId,
    }
  }

  const hasAgencyAccess = await hasAgencyMembership({
    request: input.request,
    userId: actor.id,
    agencyId: clientAgencyScope.agencyId,
  })
  if (!hasAgencyAccess) {
    throw new Error('403|No agency membership found for current account.')
  }

  return {
    userId: actor.id,
    clientId: clientAgencyScope.clientId,
    organizationId: clientAgencyScope.clientId,
    agencyId: clientAgencyScope.agencyId,
  }
}
