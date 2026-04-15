import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapTemplateRow,
  normalizeTemplateTypeForStorage,
  parseTemplateRepositoryError,
  TemplateRepositoryError,
} from '@/gnr8/template-intake/storage/template-repository'

test('parseTemplateRepositoryError maps missing gnr8_templates relation to deterministic error', () => {
  const mapped = parseTemplateRepositoryError({
    code: '42P01',
    message: 'relation "public.gnr8_templates" does not exist',
  })

  assert.deepEqual(mapped, {
    status: 500,
    code: 'TEMPLATE_TABLE_NOT_FOUND',
    message: 'Template storage is not provisioned. Run DB migrations and retry.',
  })
})

test('parseTemplateRepositoryError maps explicit TemplateRepositoryError instances', () => {
  const mapped = parseTemplateRepositoryError(
    new TemplateRepositoryError('TEMPLATE_REPOSITORY_FAILURE', 'Template storage request failed.'),
  )

  assert.deepEqual(mapped, {
    status: 500,
    code: 'TEMPLATE_REPOSITORY_FAILURE',
    message: 'Template storage request failed.',
  })
})

test('mapTemplateRow maps entry metadata and template type fields', () => {
  const mapped = mapTemplateRow({
    id: 'template-1',
    client_id: 'client-1',
    organization_id: 'org-1',
    agency_id: 'agency-1',
    created_by_user_id: 'user-1',
    name: 'Template One',
    slug: 'template-one',
    source_type: 'zip_html',
    status: 'ready',
    import_health: 'clean',
    preview_image_path: '/tmp/preview.png',
    preview_available: true,
    preview_is_fallback: false,
    preview_source: 'rendered_capture',
    tags: ['marketing'],
    source_filename: 'template.zip',
    entry_html_path: 'index.html',
    entry_html_file_name: 'index.html',
    template_type: 'single_page',
    import_snapshot_id: 'snapshot-1',
    template_manifest_summary: null,
    diagnostics_summary: null,
    import_manifest_summary: null,
    version: 1,
    visibility: 'private',
    created_at: '2026-04-15T10:00:00.000Z',
    updated_at: '2026-04-15T10:01:00.000Z',
  })

  assert.equal(mapped.entryHtmlPath, 'index.html')
  assert.equal(mapped.entryHtmlFileName, 'index.html')
  assert.equal(mapped.templateType, 'single_page')
})

test('mapTemplateRow keeps legacy null entry fields safe and defaults templateType to unknown', () => {
  const mapped = mapTemplateRow({
    id: 'template-2',
    client_id: 'client-1',
    organization_id: null,
    agency_id: null,
    created_by_user_id: null,
    name: 'Legacy Template',
    slug: 'legacy-template',
    source_type: 'zip_html',
    status: 'ready',
    import_health: 'clean',
    preview_image_path: null,
    preview_available: false,
    preview_is_fallback: true,
    preview_source: 'fallback',
    tags: null,
    source_filename: 'legacy.zip',
    entry_html_path: null,
    entry_html_file_name: null,
    template_type: null,
    import_snapshot_id: null,
    template_manifest_summary: null,
    diagnostics_summary: null,
    import_manifest_summary: null,
    version: 1,
    visibility: 'private',
    created_at: '2026-04-15T10:00:00.000Z',
    updated_at: '2026-04-15T10:01:00.000Z',
  })

  assert.equal(mapped.entryHtmlPath, null)
  assert.equal(mapped.entryHtmlFileName, null)
  assert.equal(mapped.templateType, 'unknown')
})

test('normalizeTemplateTypeForStorage allows expected values and rejects invalid values', () => {
  assert.equal(normalizeTemplateTypeForStorage('single_page'), 'single_page')
  assert.equal(normalizeTemplateTypeForStorage('multi_page'), 'multi_page')
  assert.equal(normalizeTemplateTypeForStorage('unknown'), 'unknown')

  assert.throws(
    () => normalizeTemplateTypeForStorage('unexpected_value'),
    /Invalid template_type value "unexpected_value"/,
  )
})
