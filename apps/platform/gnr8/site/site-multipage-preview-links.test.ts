import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMultiPageRawTemplatePreviewDiagnostics,
  buildMultiPageRawTemplatePreviewLinks,
  buildPreviewModeGuardrailWarning,
  isTransformedPreviewUrl,
} from '@/gnr8/site/site-multipage-preview-links'

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

test('Viroidoc-like raw menu routes stay on controlled raw preview URLs', () => {
  const routes = ['/', '/project', '/people', '/news', '/learn', '/blog']
  const links = routes.map((routePath) => ({
    routePath,
    href: buildMultiPageRawTemplatePreviewLinks({
      siteVersionId: 'sv-viroidoc-menu',
      routes: [{ routePath, status: 'assembled' }],
    }).find((link) => link.routePath === routePath || (routePath === '/' && link.routePath === '/'))?.href,
  }))

  assert.deepEqual(links.map((link) => link.routePath), routes)
  for (const link of links) {
    assert.equal(typeof link.href, 'string')
    assert.match(link.href ?? '', /^\/api\/gnr8\/runtime\/versions\/sv-viroidoc-menu\/preview\?/)
    assert.match(link.href ?? '', /mode=raw_template_preview/)
    assert.doesNotMatch(link.href ?? '', /mode=transformed|publish|activate|production|public/)
  }
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

test('multi-page raw preview links use the supplied latest siteVersionId', () => {
  const links = buildMultiPageRawTemplatePreviewLinks({
    siteVersionId: 'latest-site-version-id',
    routes: [
      { routePath: '/', status: 'assembled' },
      { routePath: '/about', status: 'assembled' },
    ],
  })

  assert.equal(links.every((link) => link.href.includes('/versions/latest-site-version-id/preview?')), true)
  assert.equal(links.every((link) => link.href.includes('mode=raw_template_preview')), true)
  assert.equal(links.some((link) => link.href.includes('/versions/older-site-version-id/preview?')), false)
})

test('transformed preview URL is not treated as raw multi-page preview', () => {
  const transformedUrl = '/api/gnr8/runtime/versions/e9257245-0256-4291-9989-66a33ee6741e/preview?mode=transformed'
  const rawLinks = buildMultiPageRawTemplatePreviewLinks({
    siteVersionId: 'latest-site-version-id',
    routes: [{ routePath: '/', status: 'assembled' }],
  })

  assert.equal(isTransformedPreviewUrl(transformedUrl), true)
  assert.equal(rawLinks[0]?.href.includes('mode=raw_template_preview'), true)
  assert.equal(rawLinks[0]?.href.includes('mode=transformed'), false)
})

test('guardrail warns when transformed workspace preview coexists with raw multi-page routes', () => {
  const warning = buildPreviewModeGuardrailWarning({
    workspacePreviewUrl: '/api/gnr8/runtime/versions/e9257245-0256-4291-9989-66a33ee6741e/preview?mode=transformed',
    rawPreviewLinks: buildMultiPageRawTemplatePreviewLinks({
      siteVersionId: 'latest-site-version-id',
      routes: [{ routePath: '/', status: 'assembled' }],
    }),
  })

  assert.equal(warning?.code, 'TRANSFORMED_PREVIEW_WITH_RAW_MULTIPAGE_ROUTES')
  assert.match(warning?.message ?? '', /transformed while raw multi-page preview routes exist/i)
})
