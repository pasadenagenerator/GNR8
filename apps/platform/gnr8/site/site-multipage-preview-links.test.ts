import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMultiPageRawTemplatePreviewDiagnostics, buildMultiPageRawTemplatePreviewLinks } from '@/gnr8/site/site-multipage-preview-links'

test('multi-page raw preview links include root and first child controlled routes', () => {
  const links = buildMultiPageRawTemplatePreviewLinks({
    siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
    routes: [
      { routePath: '/', status: 'assembled' },
      { routePath: '/about', status: 'assembled' },
      { routePath: '/contact', status: 'assembled' },
    ],
  })

  assert.deepEqual(
    links.map((link) => link.label),
    ['Open Root Raw Preview', 'Open First Child Raw Preview'],
  )
  assert.equal(
    links[0]?.href,
    '/api/gnr8/runtime/versions/8ce51f31-92ff-4ef4-a543-e1177dfe780d/preview?mode=raw_template_preview&path=%2F',
  )
  assert.equal(
    links[1]?.href,
    '/api/gnr8/runtime/versions/8ce51f31-92ff-4ef4-a543-e1177dfe780d/preview?mode=raw_template_preview&path=%2Fabout',
  )
})

test('multi-page raw preview links use first assembled child path', () => {
  const links = buildMultiPageRawTemplatePreviewLinks({
    siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
    routes: [
      { routePath: '/', status: 'assembled' },
      { routePath: '/missing-child', status: 'missing' },
      { routePath: '/project', status: 'assembled' },
    ],
  })

  assert.equal(
    links[0]?.href,
    '/api/gnr8/runtime/versions/8ce51f31-92ff-4ef4-a543-e1177dfe780d/preview?mode=raw_template_preview&path=%2F',
  )
  assert.equal(
    links[1]?.href,
    '/api/gnr8/runtime/versions/8ce51f31-92ff-4ef4-a543-e1177dfe780d/preview?mode=raw_template_preview&path=%2Fproject',
  )
})

test('multi-page raw preview links skip public production URLs', () => {
  const links = buildMultiPageRawTemplatePreviewLinks({
    siteVersionId: 'site-version-1',
    routes: [{ routePath: '/about', status: 'assembled' }],
  })

  assert.equal(links.length, 2)
  for (const link of links) {
    assert.match(link.href, /^\/api\/gnr8\/runtime\/versions\/site-version-1\/preview\?/)
    assert.match(link.href, /mode=raw_template_preview/)
    assert.doesNotMatch(link.href, /publish|activate|production|public/)
  }
})

test('multi-page raw preview diagnostics exposes persisted trace evidence', () => {
  const diagnostics = buildMultiPageRawTemplatePreviewDiagnostics({
    siteVersionId: 'sv-viroidoc',
    routes: [{ routePath: '/', status: 'assembled', rawFilePath: 'pages/root/index.html' }],
    rawTemplatePreviewEvidence: {
      selectedRoutePath: '/',
      selectedRawFilePath: 'pages/root/index.html',
      htmlByteLengthBeforeRewrite: 128,
      htmlByteLengthAfterRewrite: 256,
      rewrittenLinkCount: 3,
    },
  })

  assert.equal(diagnostics?.evidenceSource, 'persisted_raw_template_preview')
  assert.equal(diagnostics?.selectedRoutePath, '/')
  assert.equal(diagnostics?.selectedRawFilePath, 'pages/root/index.html')
  assert.equal(diagnostics?.htmlByteLengthBeforeRewrite, 128)
  assert.equal(diagnostics?.htmlByteLengthAfterRewrite, 256)
  assert.equal(diagnostics?.rewrittenLinkCount, 3)
})

test('multi-page raw preview diagnostics falls back to route-map expected live trace', () => {
  const diagnostics = buildMultiPageRawTemplatePreviewDiagnostics({
    siteVersionId: 'sv-viroidoc',
    routes: [
      { routePath: '/', status: 'assembled', rawFilePath: 'pages/root/index.html' },
      { routePath: '/project', status: 'assembled', rawFilePath: 'pages/project/index.html' },
    ],
  })

  assert.equal(diagnostics?.evidenceSource, 'route_map_expected_live_preview')
  assert.equal(diagnostics?.selectedRoutePath, '/')
  assert.equal(diagnostics?.selectedRawFilePath, 'pages/root/index.html')
  assert.equal(diagnostics?.htmlByteLengthBeforeRewrite, null)
  assert.equal(diagnostics?.htmlByteLengthAfterRewrite, null)
  assert.equal(diagnostics?.rewrittenLinkCount, null)
  assert.equal(diagnostics?.links.some((link) => link.label === 'Open Root Raw Preview' && link.href.includes('mode=raw_template_preview')), true)
})
