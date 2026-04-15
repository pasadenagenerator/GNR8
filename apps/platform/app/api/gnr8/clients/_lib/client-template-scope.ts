import { requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { ResolveCurrentClientError, resolveCurrentUserClientForPage } from '@/src/auth/resolve-current-client'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value)
  if (!normalized || !UUID_RE.test(normalized)) return null
  return normalized
}

export function parseTemplateScopeError(error: unknown): { status: number; message: string } {
  if (error instanceof ResolveCurrentClientError) {
    if (error.code === 'UNAUTHORIZED') return { status: 401, message: 'You must be signed in.' }
    if (error.code === 'NO_MEMBERSHIP') return { status: 403, message: 'No client membership found for current account.' }
    if (error.code === 'ACTIVE_CLIENT_REQUIRED') {
      return { status: 400, message: 'Select an active client before using template intake.' }
    }
    if (error.code === 'ACTIVE_CLIENT_INVALID') {
      return { status: 403, message: 'Requested client scope is invalid for current membership.' }
    }
    return { status: 403, message: 'Invalid client membership context.' }
  }

  if (error instanceof Error) return { status: 500, message: error.message }
  return { status: 500, message: 'Template scope resolution failed.' }
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

  return parseTemplateScopeError(error)
}

type ClientTemplateScope = { userId: string; clientId: string; organizationId: string; agencyId: string }

type ClientTemplateScopeDeps = {
  resolveCurrentUserClientForScope: typeof resolveCurrentUserClientForPage
  resolveClientAgencyByOrganization: (input: { clientId: string }) => Promise<{ clientId: string; agencyId: string } | null>
  requireAgencyTemplateScope: (input: { agencyId: string }) => Promise<{ userId: string; agencyId: string }>
}

async function resolveClientAgencyByOrganization(input: {
  clientId: string
}): Promise<{ clientId: string; agencyId: string } | null> {
  const supabase = await getSupabaseServerClientReadOnly()
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

  const organization = organizationResult.data
  const resolvedClientId = normalizeUuid(organization?.id)
  const resolvedAgencyId = normalizeUuid(organization?.agency_id)
  if (!resolvedClientId || !resolvedAgencyId) return null
  return {
    clientId: resolvedClientId,
    agencyId: resolvedAgencyId,
  }
}

const DEFAULT_CLIENT_TEMPLATE_SCOPE_DEPS: ClientTemplateScopeDeps = {
  resolveCurrentUserClientForScope: resolveCurrentUserClientForPage,
  resolveClientAgencyByOrganization,
  requireAgencyTemplateScope: async (input) => {
    const context = await requireAgencyActionContext({
      action: 'view_dashboard',
      requestedAgencyId: input.agencyId,
    })
    return {
      userId: context.userId,
      agencyId: context.agencyId,
    }
  },
}

export async function resolveClientTemplateScope(
  input: {
    clientIdParam: string
  },
  deps: ClientTemplateScopeDeps = DEFAULT_CLIENT_TEMPLATE_SCOPE_DEPS,
): Promise<ClientTemplateScope> {
  const clientId = normalizeUuid(input.clientIdParam)
  if (!clientId) {
    throw new Error('400|clientId must be a valid UUID.')
  }

  try {
    const currentClient = await deps.resolveCurrentUserClientForScope({
      activeClientId: clientId,
    })
    if (currentClient.client_id !== clientId) {
      throw new Error('403|Client scope mismatch for template operation.')
    }
    return {
      userId: currentClient.user_id,
      clientId: currentClient.client_id,
      organizationId: currentClient.client_id,
      agencyId: currentClient.agency_id,
    }
  } catch (error) {
    if (!(error instanceof ResolveCurrentClientError) || error.code === 'UNAUTHORIZED') {
      throw error
    }
  }

  const clientAgencyScope = await deps.resolveClientAgencyByOrganization({
    clientId,
  })
  if (!clientAgencyScope) {
    throw new Error('403|Client scope is invalid for current access context.')
  }

  const agencyScope = await deps.requireAgencyTemplateScope({
    agencyId: clientAgencyScope.agencyId,
  })
  if (agencyScope.agencyId !== clientAgencyScope.agencyId) {
    throw new Error('403|Agency scope mismatch for template operation.')
  }

  return {
    userId: agencyScope.userId,
    clientId: clientAgencyScope.clientId,
    organizationId: clientAgencyScope.clientId,
    agencyId: clientAgencyScope.agencyId,
  }
}

export async function requireClientTemplateScope(input: {
  clientIdParam: string
}): Promise<{ userId: string; clientId: string; organizationId: string; agencyId: string }> {
  return resolveClientTemplateScope(input)
}
