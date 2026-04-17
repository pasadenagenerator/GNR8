import assert from 'node:assert/strict'
import test from 'node:test'

import {
  cleanupTemplateArtifacts,
  createTemplateDetailRouteHandlers,
} from '@/app/api/gnr8/clients/[clientId]/templates/[templateId]/template-detail-route-handlers'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function createTemplate(seed: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: seed.id ?? '00000000-0000-4000-8000-000000000901',
    clientId: seed.clientId ?? '00000000-0000-4000-8000-000000000201',
    organizationId: seed.organizationId ?? '00000000-0000-4000-8000-000000000201',
    agencyId: seed.agencyId ?? '00000000-0000-4000-8000-000000000301',
    createdByUserId: seed.createdByUserId ?? '00000000-0000-4000-8000-000000000101',
    name: seed.name ?? 'Template One',
    slug: seed.slug ?? 'template-one',
    sourceType: 'zip_html',
    status: seed.status ?? 'ready',
    importHealth: seed.importHealth ?? 'clean',
    previewImagePath: seed.previewImagePath ?? '/preview.png',
    previewAvailable: seed.previewAvailable ?? true,
    previewIsFallback: seed.previewIsFallback ?? false,
    previewSource: seed.previewSource ?? 'rendered_capture',
    tags: seed.tags ?? ['marketing'],
    sourceFilename: seed.sourceFilename ?? 'template.zip',
    entryHtmlPath: seed.entryHtmlPath ?? 'index.html',
    entryHtmlFileName: seed.entryHtmlFileName ?? 'index.html',
    templateType: seed.templateType ?? 'single_page',
    importSnapshotId: seed.importSnapshotId ?? 'template-zip-aaaaaaaaaaaaaaaa',
    durableSnapshotRootDirAbs: seed.durableSnapshotRootDirAbs ?? null,
    templateManifestSummary: seed.templateManifestSummary ?? null,
    diagnosticsSummary: seed.diagnosticsSummary ?? null,
    importManifestSummary: seed.importManifestSummary ?? null,
    version: seed.version ?? 1,
    visibility: 'private',
    createdAt: seed.createdAt ?? '2026-04-16T10:00:00.000Z',
    updatedAt: seed.updatedAt ?? '2026-04-16T10:01:00.000Z',
  }
}

function createDeps(overrides?: {
  getTemplateById?: (input: { clientId: string; templateId: string }) => Promise<TemplateRecord | null>
  updateTemplateMetadata?: (input: { clientId: string; templateId: string; name: string; tags: string[] }) => Promise<TemplateRecord | null>
  deleteTemplateById?: (input: { clientId: string; templateId: string }) => Promise<TemplateRecord | null>
  requireScope?: (input: { clientIdParam: string }) => Promise<{ userId: string; clientId: string; organizationId: string; agencyId: string }>
}) {
  return {
    requireScope:
      overrides?.requireScope ??
      (async ({ clientIdParam }: { clientIdParam: string }) => ({
        userId: '00000000-0000-4000-8000-000000000101',
        clientId: clientIdParam,
        organizationId: clientIdParam,
        agencyId: '00000000-0000-4000-8000-000000000301',
      })),
    getTemplateById:
      overrides?.getTemplateById ??
      (async () => {
        return createTemplate()
      }),
    updateTemplateMetadata:
      overrides?.updateTemplateMetadata ??
      (async ({ name, tags }: { clientId: string; templateId: string; name: string; tags: string[] }) => {
        return createTemplate({ name, tags })
      }),
    deleteTemplateById:
      overrides?.deleteTemplateById ??
      (async () => {
        return createTemplate()
      }),
    parseStorageError: () => null,
    parseScopeError: (error: unknown) => {
      if (error instanceof Error && error.message.startsWith('403|')) {
        return { status: 403, message: error.message.slice(4) }
      }
      return { status: 500, message: error instanceof Error ? error.message : 'failed' }
    },
    cleanupTemplateArtifacts: async () => ({ status: 'not_performed' as const, path: null, reason: 'test', error: null }),
  }
}

function getParams() {
  return Promise.resolve({
    clientId: '00000000-0000-4000-8000-000000000201',
    templateId: '00000000-0000-4000-8000-000000000901',
  })
}

test('GET detail returns template detail success response', async () => {
  const handlers = createTemplateDetailRouteHandlers(createDeps())

  const response = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const body = (await response.json()) as { ok: boolean; template?: { id: string; entryHtmlFileName: string | null } }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.template?.id, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.template?.entryHtmlFileName, 'index.html')
})

test('PATCH detail updates name/tags successfully', async () => {
  const handlers = createTemplateDetailRouteHandlers(createDeps())

  const response = await handlers.PATCH(
    new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: '  Updated Name  ', tags: ['B2B', 'brand', 'b2b'] }),
      headers: { 'content-type': 'application/json' },
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as { ok: boolean; template?: { name: string; tags: string[] } }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.template?.name, 'Updated Name')
  assert.deepEqual(body.template?.tags, ['b2b', 'brand'])
})

test('PATCH rejects invalid payload shape deterministically', async () => {
  const handlers = createTemplateDetailRouteHandlers(createDeps())

  const response = await handlers.PATCH(
    new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Valid', tags: 'invalid-string-shape' }),
      headers: { 'content-type': 'application/json' },
    }),
    { params: getParams() },
  )
  const body = (await response.json()) as { ok: boolean; code?: string }

  assert.equal(response.status, 400)
  assert.equal(body.ok, false)
  assert.equal(body.code, 'TEMPLATE_INVALID_PAYLOAD')
})

test('DELETE removes template and returns deterministic cleanup envelope', async () => {
  const handlers = createTemplateDetailRouteHandlers(
    createDeps({
      deleteTemplateById: async () => createTemplate({ id: 'template-delete-1' }),
    }),
  )

  const response = await handlers.DELETE(new Request('http://localhost', { method: 'DELETE' }), { params: getParams() })
  const body = (await response.json()) as { ok: boolean; templateId?: string; cleanup?: { status: string } }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.templateId, 'template-delete-1')
  assert.equal(body.cleanup?.status, 'not_performed')
})

test('GET detail maps unauthorized scope failure', async () => {
  const handlers = createTemplateDetailRouteHandlers(
    createDeps({
      requireScope: async () => {
        throw new Error('403|No client membership found for current account.')
      },
    }),
  )

  const response = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const body = (await response.json()) as { ok: boolean; code?: string; error?: string }

  assert.equal(response.status, 403)
  assert.equal(body.ok, false)
  assert.equal(body.code, 'TEMPLATE_UNAUTHORIZED')
  assert.equal(body.error, 'No client membership found for current account.')
})

test('GET and DELETE return not found when template does not exist', async () => {
  const handlers = createTemplateDetailRouteHandlers(
    createDeps({
      getTemplateById: async () => null,
      deleteTemplateById: async () => null,
    }),
  )

  const getResponse = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const getBody = (await getResponse.json()) as { ok: boolean; code?: string }
  assert.equal(getResponse.status, 404)
  assert.equal(getBody.ok, false)
  assert.equal(getBody.code, 'TEMPLATE_NOT_FOUND')

  const deleteResponse = await handlers.DELETE(new Request('http://localhost', { method: 'DELETE' }), { params: getParams() })
  const deleteBody = (await deleteResponse.json()) as { ok: boolean; code?: string }
  assert.equal(deleteResponse.status, 404)
  assert.equal(deleteBody.ok, false)
  assert.equal(deleteBody.code, 'TEMPLATE_NOT_FOUND')
})

test('artifact cleanup returns deterministic not_performed reasons when snapshot id is missing or invalid', async () => {
  const missingSnapshot = await cleanupTemplateArtifacts({ importSnapshotId: null })
  assert.equal(missingSnapshot.status, 'not_performed')
  assert.equal(missingSnapshot.reason, 'missing_snapshot_id')

  const invalidSnapshot = await cleanupTemplateArtifacts({ importSnapshotId: 'manual-snapshot-123' })
  assert.equal(invalidSnapshot.status, 'not_performed')
  assert.equal(invalidSnapshot.reason, 'snapshot_not_template_zip')
})
