import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRedirectAliasDiscoveryEvidence } from './redirect-alias-discovery'

test('alias evidence groups html, trailing slash, index html, duplicate sitemap/link, and canonical URL aliases', () => {
  const evidence = buildRedirectAliasDiscoveryEvidence({
    seedUrl: 'https://example.com/',
    observedUrls: [
      { url: 'https://example.com/about', routePath: '/about', source: 'link' },
      { url: 'https://example.com/about/', routePath: '/about', source: 'link' },
      { url: 'https://example.com/about/index.html', routePath: '/about', source: 'sitemap' },
      { url: 'https://example.com/about.html', routePath: '/about.html', source: 'sitemap' },
    ],
    canonicalDiscovery: {
      canonicalEntries: [
        {
          pageUrl: 'https://example.com/about-copy',
          pageRoutePath: '/about-copy',
          canonicalUrl: 'https://example.com/about',
          normalizedCanonicalRoutePath: '/about',
          sameSite: true,
          sameSiteStatus: 'same_site',
          canonicalEquivalenceStatus: 'different_route',
        },
      ],
      alternateLanguageEntries: [],
      duplicates: [],
      conflicts: [],
      hreflangGroups: [],
      diagnostics: [],
    },
  })

  const group = evidence.aliasDiscovery.aliasGroups.find((entry) => entry.canonicalRoute === '/about')
  assert.ok(group)
  assert.deepEqual(group?.aliases, [
    'https://example.com/about',
    'https://example.com/about-copy',
    'https://example.com/about.html',
    'https://example.com/about/',
    'https://example.com/about/index.html',
  ])
  assert.deepEqual(group?.sources, ['canonical', 'link', 'sitemap'])
  assert.equal(evidence.aliasDiscovery.routeCollisions.some((entry) => entry.canonicalRoute === '/about'), true)
  assert.ok(evidence.aliasDiscovery.diagnostics.some((entry) => entry.startsWith('ALIAS_GROUP_CREATED:/about')))
})

test('redirect evidence classifies same-site, canonical host, route changed, and cross-origin chains', () => {
  const evidence = buildRedirectAliasDiscoveryEvidence({
    seedUrl: 'https://example.com/',
    observedUrls: [],
    observedRedirects: [
      { originalUrl: 'https://example.com/about/', finalUrl: 'https://example.com/about', redirectCount: 1, statusCodes: [200] },
      { originalUrl: 'http://example.com/secure', finalUrl: 'https://example.com/secure', redirectCount: 1, statusCodes: [200] },
      { originalUrl: 'https://www.example.com/team', finalUrl: 'https://example.com/team', redirectCount: 1, statusCodes: [200] },
      { originalUrl: 'https://example.com/old', finalUrl: 'https://example.com/new', redirectCount: 1, statusCodes: [301, 200] },
      { originalUrl: 'https://example.com/offsite', finalUrl: 'https://external.example/offsite', redirectCount: 1, statusCodes: [302, 200] },
    ],
  })
  const bySource = new Map(evidence.redirectDiscovery.redirectEntries.map((entry) => [entry.normalizedSourceRoute, entry]))

  assert.equal(bySource.get('/about')?.classification, 'same_route_redirect')
  assert.equal(bySource.get('/secure')?.classification, 'canonical_host_redirect')
  assert.equal(bySource.get('/team')?.classification, 'canonical_host_redirect')
  assert.equal(bySource.get('/old')?.classification, 'route_changed_redirect')
  assert.equal(bySource.get('/offsite')?.classification, 'cross_origin_redirect')
  assert.equal(bySource.get('/offsite')?.sameSite, false)
  assert.deepEqual(bySource.get('/old')?.statusCodes, [301, 200])
  assert.equal(evidence.redirectDiscovery.counts.redirectCount, 5)
  assert.equal(evidence.redirectDiscovery.counts.crossOriginRedirectCount, 1)
  assert.equal(evidence.redirectDiscovery.counts.canonicalHostRedirectCount, 2)
})
