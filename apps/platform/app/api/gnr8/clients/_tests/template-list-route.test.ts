import assert from 'node:assert/strict'
import test from 'node:test'

import { createTemplateListRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/templates/template-list-route-handlers'
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
    sourceZipStorageBucket: seed.sourceZipStorageBucket ?? 'template-source-zips',
    sourceZipStorageKey: seed.sourceZipStorageKey ?? 'client/x/template/y/template.zip',
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

function getParams() {
  return Promise.resolve({
    clientId: '00000000-0000-4000-8000-000000000201',
  })
}

test('list route returns 200 and keeps valid row when one row is malformed at card mapping stage', async () => {
  const handlers = createTemplateListRouteHandlers({
    requireScope: async ({ clientIdParam }) => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: clientIdParam,
      organizationId: clientIdParam,
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    queryTemplates: async () => ({
      templates: [createTemplate({ id: 'template-valid-1', name: 'Valid' }), createTemplate({ id: 'template-bad-1', name: 'Malformed' })],
      diagnostics: { normalizedRowCount: 1, skippedRowCount: 0 },
    }),
    mapTemplateToCard: (template) => {
      if (template.name === 'Malformed') throw new Error('Invalid legacy payload')
      return {
        id: template.id,
        name: template.name,
        slug: template.slug,
        sourceType: template.sourceType,
        status: template.status,
        importHealth: template.importHealth,
        tags: template.tags,
        sourceFilename: template.sourceFilename,
        entryHtmlFileName: template.entryHtmlFileName,
        templateType: template.templateType,
        preview: {
          available: template.previewAvailable,
          isFallback: template.previewIsFallback,
          source: template.previewSource,
          imagePath: template.previewImagePath,
        },
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }
    },
    sortCards: (cards) => cards,
    parseStorageError: () => null,
    parseScopeError: () => ({ status: 500, message: 'failed' }),
  })

  const response = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const body = (await response.json()) as { ok: boolean; templates: Array<{ id: string }> }

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.deepEqual(body.templates.map((template) => template.id), ['template-valid-1'])
})

test('list route returns structured error envelope on unknown enum parser failure', async () => {
  const handlers = createTemplateListRouteHandlers({
    requireScope: async ({ clientIdParam }) => ({
      userId: '00000000-0000-4000-8000-000000000101',
      clientId: clientIdParam,
      organizationId: clientIdParam,
      agencyId: '00000000-0000-4000-8000-000000000301',
    }),
    queryTemplates: async () => {
      throw new Error('Unknown template enum parsing failure')
    },
    mapTemplateToCard: () => {
      throw new Error('unused')
    },
    sortCards: (cards) => cards,
    parseStorageError: () => null,
    parseScopeError: () => ({ status: 500, message: 'Unknown template enum parsing failure' }),
  })

  const response = await handlers.GET(new Request('http://localhost'), { params: getParams() })
  const body = (await response.json()) as {
    ok: boolean
    code: string
    templates: unknown[]
    routeError?: { status: number; message: string }
  }

  assert.equal(response.status, 500)
  assert.equal(body.ok, false)
  assert.equal(body.code, 'TEMPLATE_LIST_FAILED')
  assert.deepEqual(body.templates, [])
  assert.equal(body.routeError?.status, 500)
  assert.equal(body.routeError?.message, 'Unknown template enum parsing failure')
})
