import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapTemplateToDetailCard,
  normalizeTemplateMetadataPatchPayload,
} from '@/gnr8/template-intake/core/template-management-contract'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function createTemplateRecord(seed?: Partial<TemplateRecord>): TemplateRecord {
  return {
    id: seed?.id ?? 'template-1',
    clientId: seed?.clientId ?? 'client-1',
    organizationId: seed?.organizationId ?? 'client-1',
    agencyId: seed?.agencyId ?? 'agency-1',
    createdByUserId: seed?.createdByUserId ?? 'user-1',
    name: seed?.name ?? 'Template One',
    slug: seed?.slug ?? 'template-one',
    sourceType: 'zip_html',
    status: seed?.status ?? 'ready',
    importHealth: seed?.importHealth ?? 'clean',
    previewImagePath: seed?.previewImagePath ?? '/preview.png',
    previewAvailable: seed?.previewAvailable ?? true,
    previewIsFallback: seed?.previewIsFallback ?? false,
    previewSource: seed?.previewSource ?? 'rendered_capture',
    tags: seed?.tags ?? ['brand'],
    sourceFilename: seed?.sourceFilename ?? 'template.zip',
    sourceZipStorageBucket: seed?.sourceZipStorageBucket ?? 'template-source-zips',
    sourceZipStorageKey: seed?.sourceZipStorageKey ?? 'client/x/template/y/template.zip',
    entryHtmlPath: seed?.entryHtmlPath ?? 'index.html',
    entryHtmlFileName: seed?.entryHtmlFileName ?? 'index.html',
    templateType: seed?.templateType ?? 'single_page',
    importSnapshotId: seed?.importSnapshotId ?? 'template-zip-aaaaaaaaaaaaaaaa',
    durableSnapshotRootDirAbs: seed?.durableSnapshotRootDirAbs ?? null,
    templateManifestSummary: seed?.templateManifestSummary ?? null,
    diagnosticsSummary: seed?.diagnosticsSummary ?? null,
    importManifestSummary: seed?.importManifestSummary ?? null,
    version: seed?.version ?? 1,
    visibility: 'private',
    createdAt: seed?.createdAt ?? '2026-04-16T10:00:00.000Z',
    updatedAt: seed?.updatedAt ?? '2026-04-16T10:01:00.000Z',
  }
}

test('mapTemplateToDetailCard keeps deterministic summary fields', () => {
  const mapped = mapTemplateToDetailCard(createTemplateRecord())

  assert.equal(mapped.id, 'template-1')
  assert.equal(mapped.sourceType, 'zip_html')
  assert.equal(mapped.entryHtmlFileName, 'index.html')
  assert.equal(mapped.preview.available, true)
})

test('mapTemplateToDetailCard preserves ready/degraded html_snapshot state', () => {
  const mapped = mapTemplateToDetailCard(
    createTemplateRecord({
      status: 'ready',
      importHealth: 'degraded',
      previewAvailable: false,
      previewIsFallback: true,
      previewSource: 'html_snapshot',
      previewImagePath: null,
    }),
  )

  assert.equal(mapped.status, 'ready')
  assert.equal(mapped.importHealth, 'degraded')
  assert.equal(mapped.preview.source, 'html_snapshot')
  assert.equal(mapped.preview.available, false)
})

test('normalizeTemplateMetadataPatchPayload trims name and normalizes tags', () => {
  const normalized = normalizeTemplateMetadataPatchPayload({
    name: '  New Template Name  ',
    tags: ['Brand', 'marketing', 'brand', 'landing page'],
  })

  assert.equal(normalized.ok, true)
  if (normalized.ok) {
    assert.equal(normalized.value.name, 'New Template Name')
    assert.deepEqual(normalized.value.tags, ['brand', 'landing-page', 'marketing'])
  }
})

test('normalizeTemplateMetadataPatchPayload rejects invalid payload shapes', () => {
  const invalidMissingTags = normalizeTemplateMetadataPatchPayload({ name: 'Only Name' })
  assert.equal(invalidMissingTags.ok, false)

  const invalidName = normalizeTemplateMetadataPatchPayload({ name: '   ', tags: ['valid'] })
  assert.equal(invalidName.ok, false)

  const invalidTags = normalizeTemplateMetadataPatchPayload({ name: 'Valid', tags: 'not-array' })
  assert.equal(invalidTags.ok, false)
})
