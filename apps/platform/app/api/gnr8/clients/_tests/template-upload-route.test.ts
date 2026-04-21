import assert from 'node:assert/strict'
import test from 'node:test'

import { createTemplateUploadRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/templates/upload/template-upload-route-handlers'
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
    status: seed.status ?? 'processing',
    importHealth: seed.importHealth ?? 'degraded',
    previewImagePath: seed.previewImagePath ?? null,
    previewAvailable: seed.previewAvailable ?? false,
    previewIsFallback: seed.previewIsFallback ?? true,
    previewSource: seed.previewSource ?? 'html_snapshot',
    tags: seed.tags ?? ['marketing'],
    sourceFilename: seed.sourceFilename ?? 'template.zip',
    sourceZipStorageBucket: seed.sourceZipStorageBucket ?? 'bucket',
    sourceZipStorageKey: seed.sourceZipStorageKey ?? 'key',
    entryHtmlPath: seed.entryHtmlPath ?? null,
    entryHtmlFileName: seed.entryHtmlFileName ?? null,
    templateType: seed.templateType ?? 'unknown',
    importSnapshotId: seed.importSnapshotId ?? null,
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

function buildUploadRequest(fileName: string, bytes: Uint8Array): Request {
  const formData = new FormData()
  const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  formData.set('file', new File([fileBytes], fileName, { type: 'application/zip' }))
  return new Request('http://localhost', { method: 'POST', body: formData })
}

function getParams() {
  return Promise.resolve({
    clientId: '00000000-0000-4000-8000-000000000201',
  })
}

test('upload route stores zip, creates processing template row, and triggers processing job', async () => {
  let triggerCalled = false
  let triggeredTemplateId: string | null = null
  let triggeredBucket: string | null = null
  let triggeredKey: string | null = null

  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    validateTemplateZipUploadInput: () => ({ ok: true }),
    createProcessingTemplateFromZipUpload: async () =>
      createTemplate({
        status: 'processing',
        importHealth: 'degraded',
      }),
    triggerTemplateProcessingJob: async ({ templateId, sourceZipStorageBucket, sourceZipStorageKey }) => {
      triggerCalled = true
      triggeredTemplateId = templateId
      triggeredBucket = sourceZipStorageBucket
      triggeredKey = sourceZipStorageKey
      return true
    },
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.POST(buildUploadRequest('valid.zip', new Uint8Array([1, 2, 3])), { params: getParams() })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.id, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.status, 'processing')
  assert.equal(body.health, 'degraded')
  assert.equal(body.importHealth, 'degraded')
  assert.equal(body.sourceType, 'zip_html')
  assert.equal(triggerCalled, true)
  assert.equal(triggeredTemplateId, '00000000-0000-4000-8000-000000000901')
  assert.equal(triggeredBucket, 'bucket')
  assert.equal(triggeredKey, 'key')
})

test('upload route returns deterministic validation error when input is not a zip', async () => {
  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    validateTemplateZipUploadInput: () => ({ ok: false, status: 400, error: 'Template upload only accepts ZIP files.' }),
    createProcessingTemplateFromZipUpload: async () => createTemplate(),
    triggerTemplateProcessingJob: async () => true,
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.POST(buildUploadRequest('invalid.txt', new Uint8Array([9, 9, 9])), { params: getParams() })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(body.ok, false)
  assert.equal(body.error, 'Template upload only accepts ZIP files.')
})

test('direct client member can upload and trigger processing', async () => {
  let createdBy: { actorUserId: string; clientId: string; organizationId: string; agencyId: string } | null = null

  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    validateTemplateZipUploadInput: () => ({ ok: true }),
    createProcessingTemplateFromZipUpload: async (input) => {
      createdBy = {
        actorUserId: input.actorUserId,
        clientId: input.clientId,
        organizationId: input.organizationId,
        agencyId: input.agencyId,
      }
      return createTemplate({
        status: 'processing',
      })
    },
    triggerTemplateProcessingJob: async () => true,
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.POST(buildUploadRequest('direct.zip', new Uint8Array([1, 2, 3])), { params: getParams() })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.deepEqual(createdBy, {
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
  })
})

test('upload route returns deterministic partial-success error when enqueue fails', async () => {
  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    validateTemplateZipUploadInput: () => ({ ok: true }),
    createProcessingTemplateFromZipUpload: async () =>
      createTemplate({
        status: 'processing',
        importHealth: 'degraded',
      }),
    triggerTemplateProcessingJob: async () => false,
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.POST(buildUploadRequest('valid.zip', new Uint8Array([1, 2, 3])), { params: getParams() })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 500)
  assert.equal(body.ok, false)
  assert.equal(body.templateId, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.status, 'processing')
  assert.equal(body.error, 'Template upload was saved but processing event could not be enqueued.')
})

test('agency-managed user can upload for owned client workspace', async () => {
  let createdBy: { actorUserId: string; clientId: string; organizationId: string; agencyId: string } | null = null

  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000777',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    validateTemplateZipUploadInput: () => ({ ok: true }),
    createProcessingTemplateFromZipUpload: async (input) => {
      createdBy = {
        actorUserId: input.actorUserId,
        clientId: input.clientId,
        organizationId: input.organizationId,
        agencyId: input.agencyId,
      }
      return createTemplate({
        status: 'processing',
      })
    },
    triggerTemplateProcessingJob: async () => true,
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.POST(buildUploadRequest('agency.zip', new Uint8Array([7, 8, 9])), { params: getParams() })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.deepEqual(createdBy, {
    actorUserId: '00000000-0000-4000-8000-000000000777',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
  })
})

test('unauthorized user is denied before upload intake runs', async () => {
  let intakeCalled = false

  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => {
      throw new Error('401|You must be signed in.')
    },
    validateTemplateZipUploadInput: () => ({ ok: true }),
    createProcessingTemplateFromZipUpload: async () => {
      intakeCalled = true
      return createTemplate()
    },
    triggerTemplateProcessingJob: async () => true,
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: (error) => {
      if (error instanceof Error && error.message.startsWith('401|')) {
        return { status: 401, message: 'You must be signed in.' }
      }
      return { status: 500, message: 'failed' }
    },
  })

  const response = await handlers.POST(buildUploadRequest('unauthorized.zip', new Uint8Array([1, 1, 1])), {
    params: getParams(),
  })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 401)
  assert.equal(body.ok, false)
  assert.equal(body.error, 'You must be signed in.')
  assert.equal(intakeCalled, false)
})
