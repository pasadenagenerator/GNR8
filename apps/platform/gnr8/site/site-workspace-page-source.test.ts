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
