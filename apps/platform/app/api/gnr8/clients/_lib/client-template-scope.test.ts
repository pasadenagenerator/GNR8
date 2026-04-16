import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { ResolveCurrentClientError } from '@/src/auth/resolve-current-client'
import { parseThrownScopeError, resolveClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'

const CLIENT_ID = '00000000-0000-4000-8000-000000000101'
const AGENCY_ID = '00000000-0000-4000-8000-000000000011'
const USER_ID = '00000000-0000-4000-8000-000000000001'

test('resolveClientTemplateScope resolves direct client membership path when available', async () => {
  const scope = await resolveClientTemplateScope(
    { clientIdParam: CLIENT_ID },
    {
      resolveCurrentUserClientForScope: async () => ({
        user_id: USER_ID,
        client_id: CLIENT_ID,
        client_name: 'Client Alpha',
        client_logo_url: null,
        agency_id: AGENCY_ID,
        agency_name: 'Agency Alpha',
        role: 'owner',
      }),
      resolveClientAgencyByOrganization: async () => {
        throw new Error('agency fallback should not run when direct scope exists')
      },
      requireAgencyTemplateScope: async () => {
        throw new Error('agency fallback should not run when direct scope exists')
      },
    },
  )

  assert.deepEqual(scope, {
    userId: USER_ID,
    clientId: CLIENT_ID,
    organizationId: CLIENT_ID,
    agencyId: AGENCY_ID,
  })
})

test('resolveClientTemplateScope resolves agency-managed client access when direct client membership is missing', async () => {
  const scope = await resolveClientTemplateScope(
    { clientIdParam: CLIENT_ID },
    {
      resolveCurrentUserClientForScope: async () => {
        throw new ResolveCurrentClientError('NO_MEMBERSHIP', 'No client access')
      },
      resolveClientAgencyByOrganization: async () => ({
        clientId: CLIENT_ID,
        agencyId: AGENCY_ID,
      }),
      requireAgencyTemplateScope: async () => ({
        userId: USER_ID,
        agencyId: AGENCY_ID,
      }),
    },
  )

  assert.deepEqual(scope, {
    userId: USER_ID,
    clientId: CLIENT_ID,
    organizationId: CLIENT_ID,
    agencyId: AGENCY_ID,
  })
})

test('resolveClientTemplateScope rejects unauthorized users without attempting agency fallback', async () => {
  let attemptedFallback = false
  await assert.rejects(
    async () =>
      resolveClientTemplateScope(
        { clientIdParam: CLIENT_ID },
        {
          resolveCurrentUserClientForScope: async () => {
            throw new ResolveCurrentClientError('UNAUTHORIZED', 'Unauthorized')
          },
          resolveClientAgencyByOrganization: async () => {
            attemptedFallback = true
            return {
              clientId: CLIENT_ID,
              agencyId: AGENCY_ID,
            }
          },
          requireAgencyTemplateScope: async () => ({
            userId: USER_ID,
            agencyId: AGENCY_ID,
          }),
        },
      ),
    (error) => error instanceof ResolveCurrentClientError && error.code === 'UNAUTHORIZED',
  )
  assert.equal(attemptedFallback, false)
})

test('resolveClientTemplateScope fails closed when neither direct membership nor agency scope exists', async () => {
  await assert.rejects(
    async () =>
      resolveClientTemplateScope(
        { clientIdParam: CLIENT_ID },
        {
          resolveCurrentUserClientForScope: async () => {
            throw new ResolveCurrentClientError('NO_MEMBERSHIP', 'No client access')
          },
          resolveClientAgencyByOrganization: async () => null,
          requireAgencyTemplateScope: async () => ({
            userId: USER_ID,
            agencyId: AGENCY_ID,
          }),
        },
      ),
    (error) =>
      error instanceof Error &&
      parseThrownScopeError(error).status === 403 &&
      parseThrownScopeError(error).message === 'Client scope is invalid for current access context.',
  )
})

test('resolveClientTemplateScope fails closed when agency scope rejects the user', async () => {
  await assert.rejects(
    async () =>
      resolveClientTemplateScope(
        { clientIdParam: CLIENT_ID },
        {
          resolveCurrentUserClientForScope: async () => {
            throw new ResolveCurrentClientError('NO_MEMBERSHIP', 'No client access')
          },
          resolveClientAgencyByOrganization: async () => ({
            clientId: CLIENT_ID,
            agencyId: AGENCY_ID,
          }),
          requireAgencyTemplateScope: async () => {
            throw new Error('403|No agency membership found for current account.')
          },
        },
      ),
    (error) =>
      error instanceof Error &&
      parseThrownScopeError(error).status === 403 &&
      parseThrownScopeError(error).message === 'No agency membership found for current account.',
  )
})

test('templates list and upload routes both use requireClientTemplateScope for deterministic scope decisions', () => {
  const listRouteSource = readFileSync(new URL('../[clientId]/templates/route.ts', import.meta.url), 'utf8')
  const uploadRouteSource = readFileSync(
    new URL('../[clientId]/templates/upload/template-upload-route-handlers.ts', import.meta.url),
    'utf8',
  )
  const detailRouteSource = readFileSync(
    new URL('../[clientId]/templates/[templateId]/template-detail-route-handlers.ts', import.meta.url),
    'utf8',
  )

  assert.match(listRouteSource, /requireClientTemplateScope/)
  assert.match(uploadRouteSource, /requireClientTemplateScope/)
  assert.match(detailRouteSource, /requireClientTemplateScope/)
})

test('client template scope helpers stay read-only and avoid mutating supabase helper', () => {
  const scopeSource = readFileSync(new URL('./client-template-scope.ts', import.meta.url), 'utf8')

  assert.match(scopeSource, /resolveCurrentUserClientForPage/)
  assert.match(scopeSource, /resolveCurrentUserAgencyForPage/)
  assert.match(scopeSource, /requireSuperadminUserIdForPage/)
  assert.match(scopeSource, /getSupabaseServerClientReadOnly/)
  assert.doesNotMatch(scopeSource, /requireAgencyActionContext/)
  assert.doesNotMatch(scopeSource, /getSupabaseServerClientMutating/)
})

test('template routes map repository errors before generic scope parsing', () => {
  const listRouteSource = readFileSync(new URL('../[clientId]/templates/route.ts', import.meta.url), 'utf8')
  const uploadRouteSource = readFileSync(
    new URL('../[clientId]/templates/upload/template-upload-route-handlers.ts', import.meta.url),
    'utf8',
  )
  const detailRouteSource = readFileSync(
    new URL('../[clientId]/templates/[templateId]/template-detail-route-handlers.ts', import.meta.url),
    'utf8',
  )

  assert.match(listRouteSource, /parseTemplateRepositoryError/)
  assert.match(uploadRouteSource, /parseTemplateRepositoryError/)
  assert.match(detailRouteSource, /parseTemplateRepositoryError/)
})

test('mutating Supabase helper still writes cookies in allowed boundaries', () => {
  const mutatingSource = readFileSync(new URL('../../../../../src/auth/supabase-server-mutating.ts', import.meta.url), 'utf8')
  assert.match(mutatingSource, /cookieStore\.set\(/)
})
