import assert from 'node:assert/strict'
import test from 'node:test'

import { createContentRouteHandlers } from '@/gnr8/site/content-route-handlers'

const IDS = {
  clientId: '00000000-0000-4000-8000-000000000201',
  siteId: '00000000-0000-4000-8000-000000000501',
  agencyId: '00000000-0000-4000-8000-000000000301',
  siteVersionId: '00000000-0000-4000-8000-000000000701',
  activeSiteVersionId: '00000000-0000-4000-8000-000000000702',
}

function getParams() {
  return Promise.resolve({ clientId: IDS.clientId, siteId: IDS.siteId })
}

function createHandlers(overrides: Partial<Parameters<typeof createContentRouteHandlers>[0]> = {}) {
  return createContentRouteHandlers({
    requireAgencyActionContext: async () => ({ actorMode: 'agency_member', agencyId: IDS.agencyId }) as never,
    parseAgencyActionContextError: () => ({ status: 500, message: 'failed' }),
    resolveRuntimeScopeDetailed: async () => ({
      scope: {
        runtimeSiteId: 'runtime-site-1',
        siteVersionId: IDS.siteVersionId,
        activeSiteVersionId: IDS.activeSiteVersionId,
        reasonCode: 'direct_runtime_version',
      },
      debug: {
        ownershipSiteId: IDS.siteId,
        directVersionIds: [IDS.siteVersionId],
        bootstrapVersionIds: [],
        renderVersionIds: [],
        slotBackedVersionIds: [IDS.siteVersionId],
        selectedSiteVersionId: IDS.siteVersionId,
        selectedReason: 'direct_ownership',
      },
    }),
    listContentSlots: async () => [{ slotKey: 'hero.title', slotType: 'text' } as never],
    listContentOverrides: async () => [],
    queryHistoryCount: async () => 0,
    querySiteScopeContext: async () => null,
    ...overrides,
  })
}

test('GET content resolves version from normal runtime path', async () => {
  const handlers = createHandlers({
    resolveRuntimeScopeDetailed: async () => ({
      scope: {
        runtimeSiteId: 'runtime-site-1',
        siteVersionId: IDS.siteVersionId,
        activeSiteVersionId: IDS.siteVersionId,
        reasonCode: 'direct_runtime_version',
      },
      debug: {
        ownershipSiteId: IDS.siteId,
        directVersionIds: [IDS.siteVersionId],
        bootstrapVersionIds: [],
        renderVersionIds: [],
        slotBackedVersionIds: [],
        selectedSiteVersionId: IDS.siteVersionId,
        selectedReason: 'direct_ownership',
      },
    }),
  })

  const response = await handlers.GET(
    new Request(`http://localhost/api?agencyId=${IDS.agencyId}`),
    { params: getParams() },
  )
  const body = await response.json() as { ok: boolean; siteVersionId: string; activeSiteVersionId: string; reasonCode: string }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.siteVersionId, IDS.siteVersionId)
  assert.equal(body.activeSiteVersionId, IDS.siteVersionId)
  assert.equal(body.reasonCode, 'direct_runtime_version')
})

test('GET content resolves version from fallback/bootstrap path', async () => {
  const handlers = createHandlers({
    resolveRuntimeScopeDetailed: async () => ({
      scope: {
        runtimeSiteId: 'runtime-site-bootstrap',
        siteVersionId: IDS.siteVersionId,
        activeSiteVersionId: IDS.siteVersionId,
        reasonCode: 'fallback_bootstrap_runtime_site_version',
      },
      debug: {
        ownershipSiteId: IDS.siteId,
        directVersionIds: [],
        bootstrapVersionIds: [IDS.siteVersionId],
        renderVersionIds: [],
        slotBackedVersionIds: [],
        selectedSiteVersionId: IDS.siteVersionId,
        selectedReason: 'bootstrap_runtime_site_version',
      },
    }),
  })

  const response = await handlers.GET(
    new Request(`http://localhost/api?agencyId=${IDS.agencyId}`),
    { params: getParams() },
  )
  const body = await response.json() as { ok: boolean; diagnostics: string[]; reasonCode: string }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.reasonCode, 'fallback_bootstrap_runtime_site_version')
  assert.ok(body.diagnostics.includes('CONTENT_GET_VERSION_RESOLUTION_FALLBACK_USED'))
})

test('GET content with explicit siteVersionId works', async () => {
  let requested: string | null = null
  const handlers = createHandlers({
    resolveRuntimeScopeDetailed: async (input) => {
      requested = input.requestedSiteVersionId ?? null
      return {
        scope: {
          runtimeSiteId: 'runtime-site-1',
          siteVersionId: IDS.siteVersionId,
          activeSiteVersionId: IDS.activeSiteVersionId,
          reasonCode: 'requested_site_version_validated',
        },
        debug: {
          ownershipSiteId: IDS.siteId,
          directVersionIds: [IDS.siteVersionId],
          bootstrapVersionIds: [],
          renderVersionIds: [],
          slotBackedVersionIds: [],
          selectedSiteVersionId: IDS.siteVersionId,
          selectedReason: 'requested_site_version_validated',
        },
      }
    },
  })

  const response = await handlers.GET(
    new Request(`http://localhost/api?agencyId=${IDS.agencyId}&siteVersionId=${IDS.siteVersionId}`),
    { params: getParams() },
  )
  const body = await response.json() as { ok: boolean; siteVersionId: string; reasonCode: string }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(requested, IDS.siteVersionId)
  assert.equal(body.siteVersionId, IDS.siteVersionId)
  assert.equal(body.reasonCode, 'requested_site_version_validated')
})

test('GET content returns slots when slots exist', async () => {
  const handlers = createHandlers({
    listContentSlots: async () => [
      { slotKey: 'hero.title', slotType: 'text' },
      { slotKey: 'section.1.title', slotType: 'text' },
    ] as never,
  })

  const response = await handlers.GET(
    new Request(`http://localhost/api?agencyId=${IDS.agencyId}`),
    { params: getParams() },
  )
  const body = await response.json() as { ok: boolean; slotCount: number }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.slotCount, 2)
})

test('GET content hydrates slot effective values with draft > published > original precedence', async () => {
  const handlers = createHandlers({
    listContentSlots: async () => [
      { slotKey: 'hero.title', slotType: 'text', sourceText: 'Original title', sourceAssetPath: null },
      { slotKey: 'hero.cta.href', slotType: 'url', sourceText: '/original', sourceAssetPath: null },
      { slotKey: 'hero.image', slotType: 'image', sourceText: null, sourceAssetPath: '/original.jpg' },
    ] as never,
    listContentOverrides: async ({ status }) => {
      if (status === 'draft') {
        return [{ slotKey: 'hero.title', valueJson: 'Draft title', valueType: 'text' }] as never
      }
      return [
        { slotKey: 'hero.title', valueJson: { value: 'Published title' }, valueType: 'text' },
        { slotKey: 'hero.cta.href', valueJson: { href: '/published' }, valueType: 'url' },
      ] as never
    },
  })

  const response = await handlers.GET(
    new Request(`http://localhost/api?agencyId=${IDS.agencyId}`),
    { params: getParams() },
  )
  const body = await response.json() as {
    ok: boolean
    slots: Array<{ slotKey: string; draftValue: string | null; publishedValue: string | null; effectiveEditorValue: string; originalValue: string }>
    diagnostics: string[]
  }
  const slotsByKey = Object.fromEntries(body.slots.map((slot) => [slot.slotKey, slot]))

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(slotsByKey['hero.title']?.draftValue, 'Draft title')
  assert.equal(slotsByKey['hero.title']?.publishedValue, 'Published title')
  assert.equal(slotsByKey['hero.title']?.effectiveEditorValue, 'Draft title')
  assert.equal(slotsByKey['hero.cta.href']?.effectiveEditorValue, '/published')
  assert.equal(slotsByKey['hero.image']?.effectiveEditorValue, '/original.jpg')
  assert.ok(body.diagnostics.includes('CONTENT_OVERRIDES_HYDRATED'))
  assert.ok(body.diagnostics.includes('CONTENT_SLOT_EFFECTIVE_VALUE_RESOLVED'))
})

test('GET content accepts agency query fallback when agencyId is missing', async () => {
  const handlers = createHandlers()
  const response = await handlers.GET(
    new Request(`http://localhost/api?agency=${IDS.agencyId}`),
    { params: getParams() },
  )
  const body = await response.json() as { ok: boolean; siteVersionId: string }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.siteVersionId, IDS.siteVersionId)
})

test('GET content returns clear error when no version exists', async () => {
  const handlers = createHandlers({
    resolveRuntimeScopeDetailed: async () => ({
      scope: null,
      unresolvedReasonCode: 'CONTENT_VERSION_NOT_FOUND',
      debug: {
        ownershipSiteId: IDS.siteId,
        directVersionIds: [],
        bootstrapVersionIds: [],
        renderVersionIds: [],
        slotBackedVersionIds: [],
        selectedSiteVersionId: null,
        selectedReason: 'no_candidate_found',
      },
    }),
  })

  const response = await handlers.GET(
    new Request(`http://localhost/api?agencyId=${IDS.agencyId}`),
    { params: getParams() },
  )
  const body = await response.json() as { ok: boolean; error: string; reasonCode: string; diagnostics: string[]; debug: unknown }

  assert.equal(response.status, 404)
  assert.equal(body.ok, false)
  assert.equal(body.error, 'Content version could not be resolved for this site.')
  assert.equal(body.reasonCode, 'CONTENT_VERSION_NOT_FOUND')
  assert.ok(body.diagnostics.includes('CONTENT_GET_VERSION_RESOLUTION_FAILED'))
  assert.ok(body.debug)
})
