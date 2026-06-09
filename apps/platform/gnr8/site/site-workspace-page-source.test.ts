import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const PAGE_FILE = new URL('../../app/gnr8/agency/clients/[clientId]/sites/[siteId]/SiteWorkspacePage.tsx', import.meta.url)

test('Site Workspace preview view exposes raw-template Preview Diagnostics controls', async () => {
  const source = await readFile(PAGE_FILE, 'utf8')

  assert.equal(source.includes('buildMultiPageRawTemplatePreviewDiagnostics'), true)
  assert.equal(source.includes('Preview Diagnostics'), true)
  assert.equal(source.includes('selectedRoutePath'), true)
  assert.equal(source.includes('selectedRawFilePath'), true)
  assert.equal(source.includes('htmlByteLengthBeforeRewrite'), true)
  assert.equal(source.includes('htmlByteLengthAfterRewrite'), true)
  assert.equal(source.includes('rewrittenLinkCount'), true)
  assert.equal(source.includes('rawPreviewDiagnostics.links.map'), true)
  assert.equal(source.includes('link.href'), true)
})

test('Site Workspace labels import version metadata and preview modes distinctly', async () => {
  const source = await readFile(PAGE_FILE, 'utf8')

  assert.equal(source.includes('Latest Import Run ID'), true)
  assert.equal(source.includes('Latest Import siteVersionId'), true)
  assert.equal(source.includes('Latest Import artifactId'), true)
  assert.equal(source.includes('Selected Workspace siteVersionId'), true)
  assert.equal(source.includes('GNR8 Transformed Preview (experimental)'), true)
  assert.equal(source.includes('Raw Imported Preview'), true)
  assert.equal(source.includes('Open Original Preview'), true)
  assert.equal(source.includes('Open GNR8 Transformed Preview (experimental)'), true)
  assert.equal(source.includes('primaryPreviewLabel'), true)
  assert.equal(source.includes('showExperimentalTransformedPreview'), true)
  assert.equal(source.includes('Latest Raw Preview Validation'), true)
  assert.equal(source.includes('No raw preview validation evidence captured.'), true)
  assert.equal(source.includes('responseStatus'), true)
  assert.equal(source.includes('responseBytes'), true)
  assert.equal(source.includes('Public/Published Preview'), true)
  assert.equal(source.includes('Root Raw Multi-Page Preview URL'), true)
  assert.equal(source.includes('First Child Raw Multi-Page Preview URL'), true)
  assert.equal(source.includes('Preview Mode Warning'), true)
  assert.equal(source.includes('Open Public/Published Preview'), true)
})
