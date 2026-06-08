import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMultiPageRawTemplatePreviewLinks } from '@/gnr8/site/site-multipage-preview-links'

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
