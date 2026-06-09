import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { rawTemplatePreviewTraceHeaders } from '@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/preview-route-trace-headers'

const ROUTE_FILE = new URL('../versions/[siteVersionId]/preview/route.ts', import.meta.url)

test('preview route trace headers expose raw-template preview evidence', () => {
  const headers = rawTemplatePreviewTraceHeaders({
    previewMode: 'raw_template_preview',
    previewRuntimeSummary: {
      rawTemplatePreviewEvidence: {
        selectedRoutePath: '/',
        selectedRawFilePath: 'pages/root/index.html',
        rewrittenLinkCount: 3,
        rewrittenAssetCount: 2,
        disabledScriptCount: 4,
        dbReadCount: 3,
        dbClientAcquisitionCount: 1,
      },
    },
  })

  assert.equal(headers['x-gnr8-preview-selected-route'], '/')
  assert.equal(headers['x-gnr8-preview-selected-raw-file'], 'pages/root/index.html')
  assert.equal(headers['x-gnr8-preview-rewritten-links-count'], '3')
  assert.equal(headers['x-gnr8-preview-rewritten-assets-count'], '2')
  assert.equal(headers['x-gnr8-preview-disabled-scripts-count'], '4')
  assert.equal(headers['x-gnr8-preview-db-read-count'], '3')
  assert.equal(headers['x-gnr8-preview-db-client-acquisition-count'], '1')
})

test('preview route trace headers fall back to top-level raw-template evidence', () => {
  const headers = rawTemplatePreviewTraceHeaders({
    previewMode: 'raw_template_preview',
    rawTemplatePreviewEvidence: {
      selectedRoutePath: '/project',
      selectedRawFilePath: 'pages/project/index.html',
      rewrittenLinkCount: 1,
    },
  })

  assert.equal(headers['x-gnr8-preview-selected-route'], '/project')
  assert.equal(headers['x-gnr8-preview-selected-raw-file'], 'pages/project/index.html')
  assert.equal(headers['x-gnr8-preview-rewritten-links-count'], '1')
})

test('preview route trace headers do not expose raw-template evidence for transformed mode', () => {
  const headers = rawTemplatePreviewTraceHeaders({
    previewMode: 'transformed',
    rawTemplatePreviewEvidence: {
      selectedRoutePath: '/project',
      selectedRawFilePath: 'pages/project/index.html',
      rewrittenLinkCount: 1,
    },
  })

  assert.equal(headers['x-gnr8-preview-selected-route'], '')
  assert.equal(headers['x-gnr8-preview-selected-raw-file'], '')
  assert.equal(headers['x-gnr8-preview-rewritten-links-count'], '0')
  assert.equal(headers['x-gnr8-preview-disabled-scripts-count'], '0')
})

test('preview route HTML response uses raw-template trace header helper', async () => {
  const source = await readFile(ROUTE_FILE, 'utf8')

  assert.equal(source.includes('rawTemplatePreviewTraceHeaders'), true)
  assert.equal(source.includes('...rawTraceHeaders'), true)
})
