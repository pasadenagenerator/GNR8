import assert from 'node:assert/strict'
import test from 'node:test'

import { createSiteBootstrapStatusRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/bootstrap-status/site-bootstrap-status-route-handlers'
import type { SiteWorkspaceReadModel } from '@/gnr8/site/site-workspace-read-model'

function getParams() {
  return Promise.resolve({
    clientId: '00000000-0000-4000-8000-000000000201',
    siteId: '00000000-0000-4000-8000-000000000777',
  })
}

function createReadModel(seed?: {
  previewReady?: boolean
  bootstrapStatus?: string | null
  reasonCode?: string | null
}): SiteWorkspaceReadModel {
  return {
    site: { id: '00000000-0000-4000-8000-000000000777' },
    pipeline: {
      runtimeSelection: {
        selectedSiteId: '00000000-0000-4000-8000-000000000778',
        selectedVersionId: '00000000-0000-4000-8000-000000000779',
      },
    },
    preview: {
      previewUrl: 'https://preview.example.com',
    },
    overview: {
      previewReady: seed?.previewReady ?? true,
      bootstrapStatus: seed?.bootstrapStatus ?? 'completed',
      reasonCode: seed?.reasonCode ?? null,
      rawTemplateArtifactFound: true,
      rawTemplateEntryHtmlFound: true,
      rawTemplateFileMapCount: 5,
      contentSlotCount: 4,
      publishReady: true,
      createDiagnostics: ['TEMPLATE_SITE_BOOTSTRAP_COMPLETED'],
    },
  } as unknown as SiteWorkspaceReadModel
}

function createDeps(readModel: SiteWorkspaceReadModel | null) {
  return {
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    getReadModel: async () => readModel,
    parseScopeError: (error: unknown) => ({ status: 500, message: error instanceof Error ? error.message : 'failed' }),
  }
}

test('GET bootstrap-status returns preview_ready', async () => {
  const handlers = createSiteBootstrapStatusRouteHandlers(createDeps(createReadModel({ previewReady: true })))
  const response = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const body = (await response.json()) as { ok: boolean; status: string; previewReady: boolean }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.status, 'preview_ready')
  assert.equal(body.previewReady, true)
})

test('GET bootstrap-status returns bootstrap_running', async () => {
  const handlers = createSiteBootstrapStatusRouteHandlers(
    createDeps(createReadModel({ previewReady: false, bootstrapStatus: 'running' })),
  )
  const response = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const body = (await response.json()) as { ok: boolean; status: string; previewReady: boolean }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.status, 'bootstrap_running')
  assert.equal(body.previewReady, false)
})

test('GET bootstrap-status returns failed with reasonCode', async () => {
  const handlers = createSiteBootstrapStatusRouteHandlers(
    createDeps(createReadModel({ previewReady: false, bootstrapStatus: 'failed', reasonCode: 'BOOTSTRAP_JOB_FAILED' })),
  )
  const response = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const body = (await response.json()) as { ok: boolean; status: string; reasonCode?: string | null }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.status, 'failed')
  assert.equal(body.reasonCode, 'BOOTSTRAP_JOB_FAILED')
})
