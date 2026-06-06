import assert from 'node:assert/strict'
import test from 'node:test'

import { stableStringify } from '../../migration/runtime/diagnostics'
import { discoverMultipageImportTree, summarizeMultipageImportTree } from '../index'

type PageMap = Record<string, string>

function page(title: string, body: string): string {
  return `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`
}

function createFetcher(pages: PageMap): (url: string) => Promise<{ url: string; html: string; title: string | null } | null> {
  return async (url) => {
    const parsed = new URL(url)
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/'
    const key = normalizedPath === '' ? '/' : normalizedPath
    const html = pages[key]
    if (!html) return null
    return {
      url,
      html,
      title: null,
    }
  }
}

function createSitemapFetcher(sitemaps: PageMap): (url: string) => Promise<{ url: string; body: string; contentType: string | null } | null> {
  return async (url) => {
    const parsed = new URL(url)
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/'
    const body = sitemaps[normalizedPath]
    if (!body) return null
    return {
      url,
      body,
      contentType: 'application/xml',
    }
  }
}

function createRobotsFetcher(robotsByPath: PageMap): (url: string) => Promise<{ url: string; body: string; contentType: string | null } | null> {
  return async (url) => {
    const parsed = new URL(url)
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/'
    const body = robotsByPath[normalizedPath]
    if (!body) return null
    return {
      url,
      body,
      contentType: 'text/plain',
    }
  }
}

const FIXTURE_PAGES: PageMap = {
  '/': page(
    'Home',
    `
      <header>
        <nav>
          <a href="/about/">About</a>
          <a href="/services">Services</a>
          <a href="/pricing">Pricing</a>
          <a href="/blog">Blog</a>
          <a href="/contact">Contact</a>
        </nav>
      </header>
      <main>
        <a href="/blog/post-a?utm=123">Post A</a>
        <a href="/blog/post-b#intro">Post B</a>
        <a href="/category/widgets">Widgets</a>
        <a href="mailto:hi@example.com">Mail</a>
        <a href="tel:+1234">Phone</a>
        <a href="javascript:void(0)">JS</a>
        <a href="#only">Hash</a>
        <a href="https://external.example.com/about">External</a>
        <a href="/assets/guide.pdf">Guide</a>
        <img src="/images/logo.png" />
      </main>
      <footer>
        <a href="/privacy-policy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/sitemap">Sitemap</a>
      </footer>
      <div class="utility-nav"><a href="/login">Login</a></div>
    `,
  ),
  '/about': page(
    'About',
    `
      <header><nav><a href="/">Home</a><a href="/services">Services</a></nav></header>
      <main><section class="cta-band"><a href="/contact">Book a call</a></section></main>
      <footer><a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a></footer>
    `,
  ),
  '/services': page(
    'Services',
    `
      <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
      <main>
        <a href="/services/design">Design</a>
        <a href="/services/development">Development</a>
      </main>
      <footer><a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a></footer>
    `,
  ),
  '/services/design': page('Design Service', `<header><nav><a href="/services">Services</a></nav></header><footer><a href="/terms">Terms</a></footer>`),
  '/services/development': page('Development Service', `<header><nav><a href="/services">Services</a></nav></header><footer><a href="/terms">Terms</a></footer>`),
  '/pricing': page('Pricing', `<header><nav><a href="/">Home</a></nav></header><footer><a href="/terms">Terms</a></footer>`),
  '/blog': page('Blog', `<header><nav><a href="/">Home</a></nav></header><main><a href="/blog/post-a">A</a><a href="/blog/post-b">B</a></main><footer><a href="/privacy-policy">Privacy</a></footer>`),
  '/blog/post-a': page('Post A', `<header><nav><a href="/blog">Blog</a></nav></header><article>Alpha</article><footer><a href="/privacy-policy">Privacy</a></footer>`),
  '/blog/post-b': page('Post B', `<header><nav><a href="/blog">Blog</a></nav></header><article>Beta</article><footer><a href="/privacy-policy">Privacy</a></footer>`),
  '/contact': page('Contact', `<header><nav><a href="/">Home</a></nav></header><main>Contact</main><footer><a href="/privacy-policy">Privacy</a></footer>`),
  '/privacy-policy': page('Privacy Policy', `<footer><a href="/terms">Terms</a></footer>`),
  '/terms': page('Terms', `<footer><a href="/privacy-policy">Privacy</a></footer>`),
  '/sitemap': page('Sitemap', `<main><a href="/about">About</a><a href="/services">Services</a></main>`),
  '/login': page('Login', `<main>Login</main>`),
  '/category/widgets': page('Widgets', `<main><a href="/category/widgets/item-a">Item A</a></main>`),
  '/category/widgets/item-a': page('Item A', `<main>Widget A detail</main>`),
}

test('seed homepage discovers internal routes only', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_test',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 40, maxDepth: 3, maxLinksPerPage: 50, maxTemplateLinksPerRoute: 10 },
    },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  assert.ok(tree.routes.some((route) => route.normalizedPath === '/about'))
  assert.ok(tree.routes.every((route) => route.url.includes('example.com')))
})

test('external and asset links are skipped', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_test', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  assert.ok(!tree.routes.some((route) => route.url.includes('external.example.com')))
  assert.ok(!tree.routes.some((route) => route.normalizedPath.endsWith('.pdf')))
  assert.ok(tree.diagnostics.some((entry) => entry.startsWith('MULTIPAGE_EXTERNAL_LINK_SKIPPED')))
  assert.ok(tree.diagnostics.some((entry) => entry.startsWith('MULTIPAGE_ASSET_LINK_SKIPPED')))
})

test('route normalization collapses equivalent urls and dedupes deterministically', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_test', seedUrl: 'https://www.example.com/index.html#hero' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  const aboutMatches = tree.routes.filter((route) => route.normalizedPath === '/about')
  assert.equal(aboutMatches.length, 1)
  assert.equal(tree.seedUrl, 'https://example.com/')
})

test('route limit and depth limit are enforced', async () => {
  const routeLimited = await discoverMultipageImportTree(
    {
      siteId: 'site_test',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 5, maxDepth: 5, maxLinksPerPage: 50, maxTemplateLinksPerRoute: 10 },
    },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )
  assert.equal(routeLimited.routeLimitHit, true)

  const depthLimited = await discoverMultipageImportTree(
    {
      siteId: 'site_test',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 40, maxDepth: 1, maxLinksPerPage: 50, maxTemplateLinksPerRoute: 10 },
    },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )
  assert.equal(depthLimited.depthLimitHit, true)
})

test('page role classification covers homepage/contact/legal/blog/article/listing/detail', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_test', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  const roleByPath = new Map(tree.routes.map((route) => [route.normalizedPath, route.pageRole]))
  assert.equal(roleByPath.get('/'), 'homepage')
  assert.equal(roleByPath.get('/contact'), 'contact')
  assert.equal(roleByPath.get('/privacy-policy'), 'legal')
  assert.equal(roleByPath.get('/blog'), 'blog')
  assert.equal(roleByPath.get('/blog/post-a'), 'article')
  assert.equal(roleByPath.get('/category/widgets'), 'listing')
  assert.equal(roleByPath.get('/category/widgets/item-a'), 'detail')
})

test('navigation visibility and trees are inferred deterministically', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_test', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  const byPath = new Map(tree.routes.map((route) => [route.normalizedPath, route.navigationVisibility]))
  assert.equal(byPath.get('/about'), 'header')
  assert.equal(byPath.get('/privacy-policy'), 'footer')

  const primary = tree.navigationTrees.find((entry) => entry.kind === 'primary')
  assert.ok(primary)
  assert.ok((primary?.items ?? []).length >= 1)
})

test('shared header/footer candidates are inferred', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_test', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  assert.ok(tree.sharedRegions.some((region) => region.kind === 'header'))
  assert.ok(tree.sharedRegions.some((region) => region.kind === 'footer'))
})

test('template family and route relationships are inferred', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_test', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  assert.ok(tree.routeFamilies.some((family) => family.kind === 'article_family'))
  assert.ok(tree.pageRelationships.some((relationship) => relationship.kind === 'listing_to_detail'))
  assert.ok(tree.templateFamilyExtraction)
  assert.ok((tree.templateFamilyExtraction?.families.length ?? 0) >= 1)
  assert.ok(tree.templateFamilyExtraction?.diagnostics.some((entry) => entry.startsWith('TEMPLATE_FAMILY_EXTRACTION_COMPLETED')))
})

test('same input repeats identical multipage tree', async () => {
  const first = await discoverMultipageImportTree(
    { siteId: 'site_repeat', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )
  const second = await discoverMultipageImportTree(
    { siteId: 'site_repeat', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )

  assert.equal(stableStringify(first as any), stableStringify(second as any))
})

test('summary projection surfaces multipage truth counts', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_summary', seedUrl: 'https://example.com/' },
    { fetchPage: createFetcher(FIXTURE_PAGES) },
  )
  const summary = summarizeMultipageImportTree(tree)

  assert.equal(summary.enabled, true)
  assert.equal(summary.routeCount, tree.routeCount)
  assert.equal(summary.pageCount, tree.pageCount)
  assert.ok(summary.primaryNavigationCount >= 1)
  assert.equal(summary.templateFamilyExtraction.enabled, true)
  assert.ok(summary.templateFamilyExtraction.familyCount >= 1)
  assert.ok(Array.isArray(summary.diagnostics))
})

test('sitemap.xml discovery adds hidden route candidates', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_sitemap',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 2, maxUrlsFromSitemaps: 10 },
    },
    {
      fetchPage: createFetcher({
        '/': page('Home', '<main><p>No navigation to hidden page.</p></main>'),
        '/hidden': page('Hidden', '<main>Hidden sitemap page</main>'),
      }),
      fetchSitemap: createSitemapFetcher({
        '/sitemap.xml': `<?xml version="1.0"?><urlset><url><loc>https://example.com/hidden</loc></url></urlset>`,
      }),
    },
  )

  const hidden = tree.routes.find((route) => route.normalizedPath === '/hidden')
  assert.equal(hidden?.discoverySource, 'sitemap_like')
  assert.equal(tree.sitemapDiscovery.fetchedSitemapUrls.length, 1)
  assert.equal(tree.sitemapDiscovery.urlCount, 1)
  assert.ok(tree.diagnostics.some((entry) => entry.startsWith('SITEMAP_URL_DISCOVERED:/hidden')))
})

test('sitemap_index.xml discovery traverses nested same-site sitemaps', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_sitemap_index',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 4, maxUrlsFromSitemaps: 10, maxNestedSitemaps: 2 },
    },
    {
      fetchPage: createFetcher({
        '/': page('Home', '<main>Home</main>'),
        '/from-index': page('From Index', '<main>Nested</main>'),
      }),
      fetchSitemap: createSitemapFetcher({
        '/sitemap_index.xml': `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://example.com/nested.xml</loc></sitemap></sitemapindex>`,
        '/nested.xml': `<?xml version="1.0"?><urlset><url><loc>https://example.com/from-index</loc></url></urlset>`,
      }),
    },
  )

  assert.ok(tree.routes.some((route) => route.normalizedPath === '/from-index'))
  assert.equal(tree.sitemapDiscovery.nestedSitemapCount, 1)
  assert.ok(tree.diagnostics.some((entry) => entry.startsWith('SITEMAP_NESTED_DISCOVERY_STARTED')))
  assert.ok(tree.diagnostics.some((entry) => entry.startsWith('SITEMAP_NESTED_DISCOVERY_SUCCEEDED')))
})

test('sitemap discovery dedupes seed and link-discovered routes', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_sitemap_dupe',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 2, maxUrlsFromSitemaps: 10 },
    },
    {
      fetchPage: createFetcher({
        '/': page('Home', '<main><a href="/about">About</a></main>'),
        '/about': page('About', '<main>About</main>'),
        '/hidden': page('Hidden', '<main>Hidden</main>'),
      }),
      fetchSitemap: createSitemapFetcher({
        '/sitemap.xml': `<?xml version="1.0"?><urlset>
          <url><loc>https://example.com/</loc></url>
          <url><loc>https://example.com/about</loc></url>
          <url><loc>https://example.com/about/</loc></url>
          <url><loc>https://example.com/hidden</loc></url>
        </urlset>`,
      }),
    },
  )

  assert.equal(tree.routes.filter((route) => route.normalizedPath === '/').length, 1)
  assert.equal(tree.routes.filter((route) => route.normalizedPath === '/about').length, 1)
  assert.equal(tree.routes.filter((route) => route.normalizedPath === '/hidden').length, 1)
  assert.ok(tree.diagnostics.some((entry) => entry.startsWith('MULTIPAGE_ROUTE_DUPLICATE_SKIPPED:/about')))
})

test('sitemap discovery allows apex/www equivalence and rejects sibling domains', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_sitemap_hosts',
      seedUrl: 'https://www.example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 2, maxUrlsFromSitemaps: 10 },
    },
    {
      fetchPage: createFetcher({
        '/': page('Home', '<main>Home</main>'),
        '/apex': page('Apex', '<main>Apex</main>'),
      }),
      fetchSitemap: createSitemapFetcher({
        '/sitemap.xml': `<?xml version="1.0"?><urlset>
          <url><loc>https://example.com/apex</loc></url>
          <url><loc>https://shop.example.com/sibling</loc></url>
        </urlset>`,
      }),
    },
  )

  assert.ok(tree.routes.some((route) => route.normalizedPath === '/apex'))
  assert.ok(!tree.routes.some((route) => route.url.includes('shop.example.com')))
  assert.ok(tree.sitemapDiscovery.skippedUrls.some((entry) => entry.reason === 'external_host'))
})

test('malformed sitemap records deterministic failure without blocking discovery', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_sitemap_malformed',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 2, maxUrlsFromSitemaps: 10 },
    },
    {
      fetchPage: createFetcher({ '/': page('Home', '<main><a href="/about">About</a></main>'), '/about': page('About', '<main>About</main>') }),
      fetchSitemap: createSitemapFetcher({ '/sitemap.xml': `<not-a-sitemap><loc>https://example.com/ignored</loc></not-a-sitemap>` }),
    },
  )

  assert.ok(tree.routes.some((route) => route.normalizedPath === '/about'))
  assert.equal(tree.sitemapDiscovery.urlCount, 0)
  assert.ok(tree.sitemapDiscovery.diagnostics.some((entry) => entry.startsWith('SITEMAP_DISCOVERY_FAILED')))
})

test('sitemap discovery enforces URL and nested sitemap limits', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_sitemap_limits',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 4, maxUrlsFromSitemaps: 1, maxNestedSitemaps: 1 },
    },
    {
      fetchPage: createFetcher({
        '/': page('Home', '<main>Home</main>'),
        '/one': page('One', '<main>One</main>'),
        '/two': page('Two', '<main>Two</main>'),
      }),
      fetchSitemap: createSitemapFetcher({
        '/sitemap_index.xml': `<?xml version="1.0"?><sitemapindex>
          <sitemap><loc>https://example.com/a.xml</loc></sitemap>
          <sitemap><loc>https://example.com/b.xml</loc></sitemap>
        </sitemapindex>`,
        '/a.xml': `<?xml version="1.0"?><urlset>
          <url><loc>https://example.com/one</loc></url>
          <url><loc>https://example.com/two</loc></url>
        </urlset>`,
      }),
    },
  )

  assert.equal(tree.sitemapDiscovery.nestedSitemapCount, 1)
  assert.equal(tree.sitemapDiscovery.urlCount, 1)
  assert.ok(tree.sitemapDiscovery.skippedUrlCount >= 1)
  assert.ok(tree.sitemapDiscovery.diagnostics.some((entry) => entry.startsWith('SITEMAP_LIMIT_REACHED')))
})

test('robots.txt discovery adds declared sitemap candidates and persists evidence', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_robots_sitemap',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 4, maxUrlsFromSitemaps: 10, maxNestedSitemaps: 1 },
    },
    {
      fetchPage: createFetcher({
        '/': page('Home', '<main>No visible hidden link.</main>'),
        '/from-robots': page('From Robots', '<main>Declared only</main>'),
      }),
      fetchRobots: createRobotsFetcher({
        '/robots.txt': `
          User-agent: *
          Allow: /
          Sitemap: https://example.com/robots-sitemap.xml
        `,
      }),
      fetchSitemap: createSitemapFetcher({
        '/robots-sitemap.xml': `<?xml version="1.0"?><urlset><url><loc>https://example.com/from-robots</loc></url></urlset>`,
      }),
    },
  )
  const summary = summarizeMultipageImportTree(tree)

  assert.equal(tree.robotsDiscovery.fetchedState, 'fetched')
  assert.deepEqual(tree.robotsDiscovery.sitemapDeclarations, ['https://example.com/robots-sitemap.xml'])
  assert.equal(tree.sitemapDiscovery.fetchedSitemapUrls.includes('https://example.com/robots-sitemap.xml'), true)
  assert.ok(tree.routes.some((route) => route.normalizedPath === '/from-robots'))
  assert.equal(summary.robotsDiscovery.routeGovernanceSummary.allowed, tree.routes.length)
  assert.ok(tree.diagnostics.some((entry) => entry.startsWith('ROBOTS_SITEMAP_DECLARATION_FOUND')))
})

test('robots.txt missing records unknown route governance without blocking discovery', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_robots_missing', seedUrl: 'https://example.com/' },
    {
      fetchPage: createFetcher({ '/': page('Home', '<main><a href="/about">About</a></main>'), '/about': page('About', '<main>About</main>') }),
      fetchRobots: createRobotsFetcher({}),
    },
  )

  assert.equal(tree.robotsDiscovery.fetchedState, 'not_found')
  assert.equal(tree.robotsDiscovery.routeGovernanceSummary.unknown, tree.routes.length)
  assert.ok(tree.routes.some((route) => route.normalizedPath === '/about'))
  assert.ok(tree.robotsDiscovery.diagnostics.some((entry) => entry.startsWith('ROBOTS_DISCOVERY_NOT_FOUND')))
})

test('robots.txt supports multiple sitemap declarations', async () => {
  const tree = await discoverMultipageImportTree(
    {
      siteId: 'site_robots_multiple_sitemaps',
      seedUrl: 'https://example.com/',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10, maxSitemaps: 5, maxUrlsFromSitemaps: 10, maxNestedSitemaps: 1 },
    },
    {
      fetchPage: createFetcher({ '/': page('Home', '<main>Home</main>'), '/one': page('One', '<main>One</main>'), '/two': page('Two', '<main>Two</main>') }),
      fetchRobots: createRobotsFetcher({
        '/robots.txt': `
          User-agent: *
          Sitemap: https://example.com/one.xml
          Sitemap: https://example.com/two.xml
        `,
      }),
      fetchSitemap: createSitemapFetcher({
        '/one.xml': `<?xml version="1.0"?><urlset><url><loc>https://example.com/one</loc></url></urlset>`,
        '/two.xml': `<?xml version="1.0"?><urlset><url><loc>https://example.com/two</loc></url></urlset>`,
      }),
    },
  )

  assert.deepEqual(tree.robotsDiscovery.sitemapDeclarations, ['https://example.com/one.xml', 'https://example.com/two.xml'])
  assert.ok(tree.routes.some((route) => route.normalizedPath === '/one'))
  assert.ok(tree.routes.some((route) => route.normalizedPath === '/two'))
})

test('robots.txt allow and disallow rules classify route governance', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_robots_rules', seedUrl: 'https://example.com/', limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 10 } },
    {
      fetchPage: createFetcher({
        '/': page('Home', '<main><a href="/private">Private</a><a href="/private/public">Public Exception</a><a href="/open">Open</a></main>'),
        '/private': page('Private', '<main>Private</main>'),
        '/private/public': page('Public', '<main>Public</main>'),
        '/open': page('Open', '<main>Open</main>'),
      }),
      fetchRobots: createRobotsFetcher({
        '/robots.txt': `
          User-agent: *
          Disallow: /private
          Allow: /private/public
        `,
      }),
    },
  )

  const governance = new Map(tree.robotsDiscovery.routeGovernance.map((entry) => [entry.routePath, entry.status]))
  assert.equal(governance.get('/private'), 'disallowed')
  assert.equal(governance.get('/private/public'), 'allowed')
  assert.equal(governance.get('/open'), 'allowed')
  assert.equal(tree.routes.find((route) => route.normalizedPath === '/private')?.robotsGovernance, 'disallowed')
  assert.equal(tree.robotsDiscovery.routeGovernanceSummary.disallowed, 1)
  assert.ok(tree.robotsDiscovery.diagnostics.some((entry) => entry.startsWith('ROBOTS_ROUTE_DISALLOWED:/private')))
  assert.ok(tree.robotsDiscovery.diagnostics.some((entry) => entry.startsWith('ROBOTS_RULES_APPLIED')))
})

test('malformed robots.txt records parse failure and unknown governance', async () => {
  const tree = await discoverMultipageImportTree(
    { siteId: 'site_robots_malformed', seedUrl: 'https://example.com/' },
    {
      fetchPage: createFetcher({ '/': page('Home', '<main><a href="/about">About</a></main>'), '/about': page('About', '<main>About</main>') }),
      fetchRobots: createRobotsFetcher({ '/robots.txt': `<html><body>not robots directives</body></html>` }),
    },
  )

  assert.equal(tree.robotsDiscovery.fetchedState, 'parse_failed')
  assert.equal(tree.robotsDiscovery.routeGovernanceSummary.unknown, tree.routes.length)
  assert.ok(tree.robotsDiscovery.diagnostics.some((entry) => entry.startsWith('ROBOTS_DISCOVERY_FAILED')))
  assert.ok(tree.routes.some((route) => route.normalizedPath === '/about'))
})
