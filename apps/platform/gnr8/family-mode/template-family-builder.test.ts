import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFamilyHandoffModel, summarizeTemplateFamilies } from '@/gnr8/family-mode'
import type { SiteTree } from '@/gnr8/site-tree'

function siteTreeFixture(paths: string[]): SiteTree {
  const pages = paths.map((normalizedPath, index) => {
    const slug = normalizedPath === '/' ? 'home' : normalizedPath.slice(1).replace(/[^a-z0-9]+/gi, '_')
    return {
      pageId: `page_${slug}`,
      url: `https://example.com${normalizedPath}`,
      normalizedPath,
      routeSegments: normalizedPath === '/' ? [] : normalizedPath.slice(1).split('/'),
      depth: normalizedPath === '/' ? 0 : normalizedPath.slice(1).split('/').length,
      discoverySource: index === 0 ? ('seed_page' as const) : ('internal_link' as const),
      pageRole: 'unknown' as const,
      isSeedPage: index === 0,
      isDiscoveredOnly: index !== 0,
      sharedLayoutHints: {
        headerLikelyShared: true,
        footerLikelyShared: true,
      },
    }
  })

  return {
    siteId: 'site-1',
    rootPageId: pages[0]?.pageId ?? 'page_home',
    pages,
    navigation: {
      internalLinkCount: Math.max(0, pages.length - 1),
      externalLinkCount: 0,
      candidatePageCount: Math.max(0, pages.length - 1),
      ignoredLinkCount: 0,
    },
    diagnostics: [],
  }
}

test('single page creates one deterministic family classified as marketing', () => {
  const model = buildFamilyHandoffModel({
    siteId: 'site-1',
    siteTree: siteTreeFixture(['/']),
    pageSectionsByPath: {
      '/': [
        { kind: 'hero', order: 0 },
        { kind: 'text_block', order: 1 },
        { kind: 'cta', order: 2 },
      ],
    },
  })

  assert.equal(model.families.length, 1)
  assert.equal(model.families[0]?.familyId, 'family_marketing_root')
  assert.equal(model.families[0]?.familyType, 'marketing')
  assert.deepEqual(model.families[0]?.pageIds, ['page_home'])
})

test('marketing pages cluster into one family', () => {
  const model = buildFamilyHandoffModel({
    siteId: 'site-1',
    siteTree: siteTreeFixture(['/', '/about', '/contact']),
  })

  assert.equal(model.families.length, 1)
  assert.equal(model.families[0]?.familyId, 'family_marketing_root')
  assert.equal(model.families[0]?.pageIds.length, 3)
})

test('listing/detail split groups /products and /products/* into different families', () => {
  const model = buildFamilyHandoffModel({
    siteId: 'site-1',
    siteTree: siteTreeFixture(['/', '/products', '/products/a', '/products/b']),
    pageSectionsByPath: {
      '/products': [{ kind: 'grid', order: 0, hasCardCluster: true }],
      '/products/a': [
        { kind: 'image', order: 0 },
        { kind: 'text_block', order: 1 },
      ],
      '/products/b': [
        { kind: 'image', order: 0 },
        { kind: 'text_block', order: 1 },
      ],
    },
  })

  assert.ok(model.families.some((family) => family.familyId === 'family_listing_products'))
  assert.ok(model.families.some((family) => family.familyId === 'family_detail_products'))
  assert.equal(model.pageMappings.find((mapping) => mapping.pageId === 'page_products')?.familyId, 'family_listing_products')
  assert.equal(model.pageMappings.find((mapping) => mapping.pageId === 'page_products_a')?.familyId, 'family_detail_products')
})

test('unknown routes are assigned to unknown fallback family', () => {
  const model = buildFamilyHandoffModel({
    siteId: 'site-1',
    siteTree: siteTreeFixture(['/x-odd', '/x-odd/alpha', '/zeta/q']),
  })

  const unknownFamily = model.families.find((family) => family.familyId === 'family_unknown_misc')
  assert.ok(unknownFamily)
  assert.equal(model.summary.orphanPageCount >= 1, true)
})

test('same input yields deterministic families and mappings', () => {
  const input = {
    siteId: 'site-1',
    siteTree: siteTreeFixture(['/', '/products', '/products/a', '/login']),
    pageSectionsByPath: {
      '/': [
        { kind: 'hero', order: 0 },
        { kind: 'cta', order: 1 },
      ],
      '/products': [{ kind: 'grid', order: 0 }],
      '/products/a': [
        { kind: 'image', order: 0 },
        { kind: 'text_block', order: 1 },
      ],
    },
  } as const

  const first = buildFamilyHandoffModel(input)
  const second = buildFamilyHandoffModel(input)

  assert.deepEqual(first, second)
})

test('families still form when sections are empty and summary remains deterministic', () => {
  const model = buildFamilyHandoffModel({
    siteId: 'site-1',
    siteTree: siteTreeFixture(['/', '/about', '/products', '/products/a']),
    pageSectionsByPath: {},
  })
  const summary = summarizeTemplateFamilies(model, '/tmp/snapshot/template-families/families.json')

  assert.equal(model.families.length, 3)
  assert.equal(summary.familyCount, 3)
  assert.equal(summary.largestFamilySize, 2)
  assert.equal(summary.payloadPath, '/tmp/snapshot/template-families/families.json')
})

