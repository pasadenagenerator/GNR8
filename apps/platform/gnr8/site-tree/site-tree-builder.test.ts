import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSiteTreeFromSeedPage } from '@/gnr8/site-tree/core/site-tree-builder'

test('seed page only produces one page node and no-internal-links diagnostic', () => {
  const tree = buildSiteTreeFromSeedPage({
    siteId: 'site-1',
    seedUrl: 'https://example.com/',
    seedHtml: '<html><body><h1>Home</h1></body></html>',
  })

  assert.equal(tree.pages.length, 1)
  assert.equal(tree.rootPageId, 'page_home')
  assert.equal(tree.pages[0]?.isSeedPage, true)
  assert.equal(tree.navigation.internalLinkCount, 0)
  assert.ok(tree.diagnostics.some((diag) => diag.code === 'SITE_TREE_NO_INTERNAL_LINKS_FOUND'))
})

test('internal and external links are classified and only internal become page candidates', () => {
  const tree = buildSiteTreeFromSeedPage({
    siteId: 'site-1',
    seedUrl: 'https://example.com/',
    seedHtml: `
      <a href="/about">About</a>
      <a href="https://example.com/services">Services</a>
      <a href="https://outside.example/news">News</a>
    `,
  })

  assert.equal(tree.navigation.internalLinkCount, 2)
  assert.equal(tree.navigation.externalLinkCount, 1)
  assert.equal(tree.pages.length, 3)
  assert.ok(tree.pages.some((page) => page.normalizedPath === '/about'))
  assert.ok(tree.pages.some((page) => page.normalizedPath === '/services'))
})

test('duplicate internal links create one candidate page and duplicate diagnostic', () => {
  const tree = buildSiteTreeFromSeedPage({
    siteId: 'site-1',
    seedUrl: 'https://example.com/',
    seedHtml: `
      <a href="/about">About 1</a>
      <a href="/about">About 2</a>
      <a href="/about/">About 3</a>
    `,
  })

  const aboutPages = tree.pages.filter((page) => page.normalizedPath === '/about')
  assert.equal(aboutPages.length, 1)
  assert.ok(tree.diagnostics.some((diag) => diag.code === 'SITE_TREE_DUPLICATE_PAGE_SKIPPED'))
})

test('path normalization dedupes equivalent routes to same deterministic page identity', () => {
  const tree = buildSiteTreeFromSeedPage({
    siteId: 'site-1',
    seedUrl: 'https://example.com/',
    seedHtml: `
      <a href="/about">About</a>
      <a href="/about/">About slash</a>
      <a href="/about?x=1">About query</a>
      <a href="/about#index">About hash</a>
    `,
  })

  const aboutPages = tree.pages.filter((page) => page.normalizedPath === '/about')
  assert.equal(aboutPages.length, 1)
  assert.equal(aboutPages[0]?.pageId, 'page_about')
})

test('ignored links exclude non-page links and emit ignored diagnostics', () => {
  const tree = buildSiteTreeFromSeedPage({
    siteId: 'site-1',
    seedUrl: 'https://example.com/',
    seedHtml: `
      <a href="mailto:test@example.com">mail</a>
      <a href="tel:+123456">tel</a>
      <a href="javascript:void(0)">js</a>
      <a href="#hero">hash</a>
      <a href="/assets/logo.svg">logo</a>
      <a href="/app.css">css</a>
    `,
  })

  assert.equal(tree.navigation.ignoredLinkCount, 6)
  assert.equal(tree.pages.length, 1)
  assert.ok(tree.diagnostics.some((diag) => diag.code === 'SITE_TREE_LINK_IGNORED'))
})

test('parent inference maps /products as parent of /products/item-a', () => {
  const tree = buildSiteTreeFromSeedPage({
    siteId: 'site-1',
    seedUrl: 'https://example.com/',
    seedHtml: `
      <a href="/products">Products</a>
      <a href="/products/item-a">Item A</a>
    `,
  })

  const products = tree.pages.find((page) => page.normalizedPath === '/products')
  const itemA = tree.pages.find((page) => page.normalizedPath === '/products/item-a')

  assert.ok(products)
  assert.ok(itemA)
  assert.equal(itemA?.parentPageId, products?.pageId)
  assert.ok(tree.diagnostics.some((diag) => diag.code === 'SITE_TREE_PARENT_INFERRED'))
})

test('same input twice yields identical page order, ids, and diagnostics order', () => {
  const input = {
    siteId: 'site-1',
    seedUrl: 'https://example.com/',
    seedHtml: `
      <a href="/services">Services</a>
      <a href="/services/seo">SEO</a>
      <a href="https://outside.example/">Outside</a>
    `,
  }

  const first = buildSiteTreeFromSeedPage(input)
  const second = buildSiteTreeFromSeedPage(input)

  assert.deepEqual(first.pages, second.pages)
  assert.deepEqual(first.diagnostics, second.diagnostics)
  assert.equal(first.rootPageId, second.rootPageId)
})

test('non-root seed page remains authoritative root with deterministic depth and path', () => {
  const tree = buildSiteTreeFromSeedPage({
    siteId: 'site-1',
    seedUrl: 'https://example.com/services/seo',
    seedHtml: `
      <a href="/services">Services</a>
      <a href="/services/ppc">PPC</a>
      <a href="/">Home</a>
    `,
  })

  const rootPage = tree.pages.find((page) => page.pageId === tree.rootPageId)
  assert.equal(rootPage?.normalizedPath, '/services/seo')
  assert.equal(rootPage?.isSeedPage, true)
  assert.equal(rootPage?.depth, 2)
  assert.equal(tree.rootPageId, 'page_services_seo')
})
