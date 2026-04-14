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

  assert.equal(stableStringify(first as unknown as Record<string, unknown>), stableStringify(second as unknown as Record<string, unknown>))
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
  assert.ok(Array.isArray(summary.diagnostics))
})
