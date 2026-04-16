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
    status: seed.status ?? 'ready',
    importHealth: seed.importHealth ?? 'degraded',
    previewImagePath: seed.previewImagePath ?? null,
    previewAvailable: seed.previewAvailable ?? false,
    previewIsFallback: seed.previewIsFallback ?? true,
    previewSource: seed.previewSource ?? 'html_snapshot',
    tags: seed.tags ?? ['marketing'],
    sourceFilename: seed.sourceFilename ?? 'template.zip',
    entryHtmlPath: seed.entryHtmlPath ?? 'index.html',
    entryHtmlFileName: seed.entryHtmlFileName ?? 'index.html',
    templateType: seed.templateType ?? 'single_page',
    importSnapshotId: seed.importSnapshotId ?? 'template-zip-aaaaaaaaaaaaaaaa',
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
  formData.set('file', new File([bytes], fileName, { type: 'application/zip' }))
  return new Request('http://localhost', { method: 'POST', body: formData })
}

function getParams() {
  return Promise.resolve({
    clientId: '00000000-0000-4000-8000-000000000201',
  })
}

test('upload route returns success for degraded no-preview template intake', async () => {
  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    runTemplateZipIntake: async () => ({
      ok: true as const,
      template: createTemplate({
        status: 'ready',
        importHealth: 'degraded',
        previewAvailable: false,
        previewIsFallback: true,
        previewSource: 'html_snapshot',
      }),
    }),
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.POST(buildUploadRequest('valid.zip', new Uint8Array([1, 2, 3])), { params: getParams() })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.id, '00000000-0000-4000-8000-000000000901')
  assert.equal(body.status, 'ready')
  assert.equal(body.health, 'degraded')
  assert.equal(body.importHealth, 'degraded')
  assert.equal(body.sourceType, 'zip_html')
  assert.equal((body.preview as { source: string }).source, 'html_snapshot')
})

test('upload route returns deterministic error for invalid ZIP failure', async () => {
  const handlers = createTemplateUploadRouteHandlers({
    requireScope: async () => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    runTemplateZipIntake: async () => ({
      ok: false as const,
      templateId: '00000000-0000-4000-8000-000000000901',
      status: 'failed',
      importHealth: 'failed',
      diagnosticsSummary: { issues: [], counts: { info: 0, warning: 0, error: 0, fatal: 0 } },
      errorMessage: 'ZIP file could not be processed.',
    }),
    parseTemplateRepositoryError: () => null,
    parseThrownScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.POST(buildUploadRequest('invalid.zip', new Uint8Array([9, 9, 9])), { params: getParams() })
  const body = (await response.json()) as Record<string, unknown>

  assert.equal(response.status, 400)
  assert.equal(body.ok, false)
  assert.equal(body.health, 'failed')
  assert.equal(body.error, 'ZIP file could not be processed.')
})
