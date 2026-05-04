import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveRuntimeScopeDetailed } from '@/gnr8/site/content-route-version-resolution'

const IDS = {
  clientId: '00000000-0000-4000-8000-000000000201',
  siteId: '00000000-0000-4000-8000-000000000501',
  agencyId: '00000000-0000-4000-8000-000000000301',
  direct: '00000000-0000-4000-8000-000000000701',
  bootstrap: '00000000-0000-4000-8000-000000000702',
  render: '00000000-0000-4000-8000-000000000703',
  slotLinked: '00000000-0000-4000-8000-000000000704',
  unrelated: '00000000-0000-4000-8000-000000000799',
}

function makePoolRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    direct_version_ids: [],
    bootstrap_version_ids: [],
    render_version_ids: [],
    slot_backed_version_ids: [],
    selected_site_version_id: null,
    selected_runtime_site_id: null,
    selected_reason: 'no_candidate_found',
    ...overrides,
  }
}

function createMockPool(row: Record<string, unknown>) {
  return {
    query: async () => ({ rows: [row] }),
  }
}

test('direct ownership match works', async () => {
  const result = await resolveRuntimeScopeDetailed(
    { clientId: IDS.clientId, siteId: IDS.siteId, agencyId: IDS.agencyId },
    {
      pool: createMockPool(
        makePoolRow({
          direct_version_ids: [IDS.direct],
          slot_backed_version_ids: [IDS.direct],
          selected_site_version_id: IDS.direct,
          selected_runtime_site_id: 'runtime-site-direct',
          selected_reason: 'direct_ownership',
        }),
      ),
    },
  )

  assert.equal(result.scope?.siteVersionId, IDS.direct)
  assert.equal(result.scope?.reasonCode, 'direct_runtime_version')
})

test('bootstrap job fallback works', async () => {
  const result = await resolveRuntimeScopeDetailed(
    { clientId: IDS.clientId, siteId: IDS.siteId, agencyId: IDS.agencyId },
    {
      pool: createMockPool(
        makePoolRow({
          bootstrap_version_ids: [IDS.bootstrap],
          selected_site_version_id: IDS.bootstrap,
          selected_runtime_site_id: 'runtime-site-bootstrap',
          selected_reason: 'bootstrap_runtime_site_version',
        }),
      ),
    },
  )

  assert.equal(result.scope?.siteVersionId, IDS.bootstrap)
  assert.equal(result.scope?.reasonCode, 'fallback_bootstrap_runtime_site_version')
})

test('render job fallback works', async () => {
  const result = await resolveRuntimeScopeDetailed(
    { clientId: IDS.clientId, siteId: IDS.siteId, agencyId: IDS.agencyId },
    {
      pool: createMockPool(
        makePoolRow({
          render_version_ids: [IDS.render],
          selected_site_version_id: IDS.render,
          selected_runtime_site_id: 'runtime-site-render',
          selected_reason: 'render_runtime_site_version',
        }),
      ),
    },
  )

  assert.equal(result.scope?.siteVersionId, IDS.render)
  assert.equal(result.scope?.reasonCode, 'fallback_render_runtime_site_version')
})

test('slot-backed fallback works only when linked to site', async () => {
  const result = await resolveRuntimeScopeDetailed(
    { clientId: IDS.clientId, siteId: IDS.siteId, agencyId: IDS.agencyId },
    {
      pool: createMockPool(
        makePoolRow({
          slot_backed_version_ids: [IDS.slotLinked],
          selected_site_version_id: IDS.slotLinked,
          selected_runtime_site_id: 'runtime-site-slot-linked',
          selected_reason: 'slot_linked_bootstrap',
        }),
      ),
    },
  )

  assert.equal(result.scope?.siteVersionId, IDS.slotLinked)
  assert.equal(result.scope?.reasonCode, 'fallback_slot_linked_bootstrap')
})

test('unrelated slot version is rejected', async () => {
  const result = await resolveRuntimeScopeDetailed(
    { clientId: IDS.clientId, siteId: IDS.siteId, agencyId: IDS.agencyId, requestedSiteVersionId: IDS.unrelated },
    {
      pool: createMockPool(
        makePoolRow({
          slot_backed_version_ids: [IDS.slotLinked],
          selected_site_version_id: IDS.slotLinked,
          selected_runtime_site_id: 'runtime-site-slot-linked',
          selected_reason: 'slot_linked_bootstrap',
        }),
      ),
    },
  )

  assert.equal(result.scope, null)
  assert.equal(result.unresolvedReasonCode, 'requested_site_version_not_in_scope')
  assert.deepEqual(result.debug.slotBackedVersionIds, [IDS.slotLinked])
})
