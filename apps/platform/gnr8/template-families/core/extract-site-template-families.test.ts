import assert from 'node:assert/strict'
import test from 'node:test'

import { stableStringify } from '../../migration/runtime/diagnostics'
import { extractSiteTemplateFamilies, summarizeTemplateFamilyExtraction } from '../index'
import type { RouteTemplateSignals, SiteTemplateFamilyExtractionInput, TemplateFamilyRouteNode } from '../types/contracts'

const ROUTES: TemplateFamilyRouteNode[] = [
  { routeId: 'route_home', normalizedPath: '/', pageRole: 'homepage' },
  { routeId: 'route_services_listing', normalizedPath: '/services', pageRole: 'listing' },
  { routeId: 'route_service_design', normalizedPath: '/services/design', pageRole: 'standard' },
  { routeId: 'route_service_development', normalizedPath: '/services/development', pageRole: 'standard' },
  { routeId: 'route_service_seo', normalizedPath: '/services/seo', pageRole: 'standard' },
  { routeId: 'route_blog_listing', normalizedPath: '/blog', pageRole: 'blog' },
  { routeId: 'route_blog_post_a', normalizedPath: '/blog/post-a', pageRole: 'article' },
  { routeId: 'route_blog_post_b', normalizedPath: '/blog/post-b', pageRole: 'article' },
  { routeId: 'route_products_listing', normalizedPath: '/products', pageRole: 'listing' },
  { routeId: 'route_product_a', normalizedPath: '/products/widget-a', pageRole: 'detail' },
  { routeId: 'route_product_b', normalizedPath: '/products/widget-b', pageRole: 'detail' },
  { routeId: 'route_privacy', normalizedPath: '/privacy-policy', pageRole: 'legal' },
  { routeId: 'route_terms', normalizedPath: '/terms', pageRole: 'legal' },
  { routeId: 'route_contact', normalizedPath: '/support/contact', pageRole: 'contact' },
  { routeId: 'route_status', normalizedPath: '/support/status', pageRole: 'utility' },
  { routeId: 'route_outlier', normalizedPath: '/moonshot-x', pageRole: 'unknown' },
  { routeId: 'route_mixed_article', normalizedPath: '/mixed/story', pageRole: 'article' },
  { routeId: 'route_mixed_legal', normalizedPath: '/mixed/privacy', pageRole: 'legal' },
]

const ROUTE_SIGNALS: RouteTemplateSignals[] = [
  signal('route_home', ['hero', 'feature_block', 'cta_block'], ['media', 'stacked_sections', 'form'], ['h1:1', 'h2:3']),
  signal('route_services_listing', ['hero', 'content_block'], ['media', 'list'], ['h1:1', 'h2:2']),
  signal('route_service_design', ['hero', 'feature_block', 'cta_block'], ['media', 'list', 'form'], ['h1:1', 'h2:2']),
  signal('route_service_development', ['hero', 'feature_block', 'cta_block'], ['media', 'list', 'form'], ['h1:1', 'h2:2']),
  signal('route_service_seo', ['hero', 'content_block', 'cta_block'], ['stack', 'list', 'form'], ['h1:1', 'h2:1']),
  signal('route_blog_listing', ['hero', 'content_block'], ['stack', 'list'], ['h1:1', 'h2:4']),
  signal('route_blog_post_a', ['article_body', 'cta_block'], ['stack', 'media'], ['h1:1', 'h2:1', 'h3:2']),
  signal('route_blog_post_b', ['article_body', 'cta_block'], ['stack', 'media'], ['h1:1', 'h2:1', 'h3:2']),
  signal('route_products_listing', ['hero', 'feature_block'], ['media', 'list'], ['h1:1', 'h2:2']),
  signal('route_product_a', ['hero', 'content_block', 'cta_block'], ['media', 'stack', 'form'], ['h1:1', 'h2:2']),
  signal('route_product_b', ['hero', 'content_block', 'cta_block'], ['media', 'stack', 'form'], ['h1:1', 'h2:2']),
  signal('route_privacy', ['content_block'], ['stack'], ['h1:1', 'h2:3']),
  signal('route_terms', ['content_block'], ['stack'], ['h1:1', 'h2:3']),
  signal('route_contact', ['hero', 'content_block'], ['stack', 'form'], ['h1:1', 'h2:1']),
  signal('route_status', ['content_block'], ['stack'], ['h1:1', 'h2:1']),
  signal('route_outlier', ['content_block'], ['media_list'], ['h1:1']),
  signal('route_mixed_article', ['article_body'], ['stack'], ['h1:1', 'h2:1']),
  signal('route_mixed_legal', ['content_block'], ['stack'], ['h1:1', 'h2:2']),
]

const SHARED_REGIONS = [
  { regionId: 'region_header_global', pageIds: ROUTES.map((route) => route.routeId) },
  { regionId: 'region_footer_global', pageIds: ROUTES.map((route) => route.routeId) },
  { regionId: 'region_services_cta', pageIds: ['route_service_design', 'route_service_development', 'route_service_seo'] },
  { regionId: 'region_blog_footer', pageIds: ['route_blog_listing', 'route_blog_post_a', 'route_blog_post_b'] },
  { regionId: 'region_products_cta', pageIds: ['route_products_listing', 'route_product_a', 'route_product_b'] },
]

function signal(routeId: string, sectionRoleSequence: string[], layoutPatternSequence: string[], headingPatternSequence: string[]): RouteTemplateSignals {
  return {
    routeId,
    sectionRoleSequence,
    layoutPatternSequence,
    headingPatternSequence,
    headingDensityBucket: 'medium',
  }
}

function extractionInput(overrides?: Partial<SiteTemplateFamilyExtractionInput>): SiteTemplateFamilyExtractionInput {
  return {
    siteId: 'site_template_family_test',
    sourceTreeId: 'mtree_test',
    routes: ROUTES,
    routeSignals: ROUTE_SIGNALS,
    sharedRegions: SHARED_REGIONS,
    ...overrides,
  }
}

function findFamilyByRouteId(extraction: ReturnType<typeof extractSiteTemplateFamilies>, routeId: string) {
  const assignment = extraction.routeAssignments.find((entry) => entry.routeId === routeId)
  assert.ok(assignment, `missing assignment for route ${routeId}`)
  const family = extraction.families.find((entry) => entry.familyId === assignment.familyId)
  assert.ok(family, `missing family for assignment ${assignment?.familyId}`)
  return family
}

test('service subpages become one standard page family', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const serviceFamily = findFamilyByRouteId(extraction, 'route_service_design')

  assert.equal(serviceFamily.familyKind, 'standard_page_family')
  assert.deepEqual(
    serviceFamily.routeIds,
    ['route_service_design', 'route_service_development', 'route_service_seo'],
  )
})

test('blog articles become one article family and relate to listing family', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const articleFamily = findFamilyByRouteId(extraction, 'route_blog_post_a')
  const listingFamily = findFamilyByRouteId(extraction, 'route_blog_listing')

  assert.equal(articleFamily.familyKind, 'article_family')
  assert.equal(articleFamily.signature.routePattern, '/blog/:slug')

  const listingToDetail = extraction.relationships.find(
    (relationship) => relationship.kind === 'listing_to_detail' && relationship.sourceFamilyId === listingFamily.familyId,
  )
  assert.ok(listingToDetail)
  assert.equal(listingToDetail?.targetFamilyId, articleFamily.familyId)
})

test('legal pages and utility pages classify correctly', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const legalFamily = findFamilyByRouteId(extraction, 'route_privacy')
  const contactFamily = findFamilyByRouteId(extraction, 'route_contact')
  const statusFamily = findFamilyByRouteId(extraction, 'route_status')

  assert.equal(legalFamily.familyKind, 'legal_family')
  assert.ok(legalFamily.routeIds.includes('route_privacy'))
  assert.ok(legalFamily.routeIds.includes('route_terms'))
  assert.equal(contactFamily.familyKind, 'utility_family')
  assert.equal(statusFamily.familyKind, 'utility_family')
})

test('singleton unmatched route is preserved as unknown family', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const outlierFamily = findFamilyByRouteId(extraction, 'route_outlier')

  assert.equal(outlierFamily.pageCount, 1)
  assert.equal(outlierFamily.familyKind, 'unknown_family')
})

test('mixed incompatible pages do not falsely merge', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const mixedArticleFamily = findFamilyByRouteId(extraction, 'route_mixed_article')
  const mixedLegalFamily = findFamilyByRouteId(extraction, 'route_mixed_legal')

  assert.notEqual(mixedArticleFamily.familyId, mixedLegalFamily.familyId)
  assert.equal(mixedArticleFamily.familyKind, 'article_family')
  assert.equal(mixedLegalFamily.familyKind, 'legal_family')
})

test('route pattern abstraction works for blog and products', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const articleFamily = findFamilyByRouteId(extraction, 'route_blog_post_b')
  const detailFamily = findFamilyByRouteId(extraction, 'route_product_a')

  assert.equal(articleFamily.signature.routePattern, '/blog/:slug')
  assert.equal(detailFamily.signature.routePattern, '/products/:slug')
})

test('representative route selection is deterministic', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const serviceFamily = findFamilyByRouteId(extraction, 'route_service_design')

  assert.equal(serviceFamily.representativeRouteId, 'route_service_design')

  const repeatExtraction = extractSiteTemplateFamilies(extractionInput())
  const repeatServiceFamily = findFamilyByRouteId(repeatExtraction, 'route_service_design')
  assert.equal(repeatServiceFamily.representativeRouteId, serviceFamily.representativeRouteId)
})

test('shared regions influence deterministic grouping', () => {
  const withoutSharedRegions = extractSiteTemplateFamilies(
    extractionInput({
      sharedRegions: [
        { regionId: 'region_header_global', pageIds: ROUTES.map((route) => route.routeId) },
        { regionId: 'region_footer_global', pageIds: ROUTES.map((route) => route.routeId) },
      ],
    }),
  )

  const withSharedRegions = extractSiteTemplateFamilies(extractionInput())
  const withoutServiceFamily = findFamilyByRouteId(withoutSharedRegions, 'route_service_design')
  const withServiceFamily = findFamilyByRouteId(withSharedRegions, 'route_service_design')

  assert.ok(withServiceFamily.pageCount >= withoutServiceFamily.pageCount)
  assert.ok(withServiceFamily.sharedRegionIds.length >= withoutServiceFamily.sharedRegionIds.length)
})

test('identical input repeats identical family extraction output', () => {
  const first = extractSiteTemplateFamilies(extractionInput())
  const second = extractSiteTemplateFamilies(extractionInput())

  assert.equal(stableStringify(first as unknown as Record<string, unknown>), stableStringify(second as unknown as Record<string, unknown>))
})

test('summary projection surfaces template family extraction truth', () => {
  const extraction = extractSiteTemplateFamilies(extractionInput())
  const summary = summarizeTemplateFamilyExtraction(extraction)

  assert.equal(summary.enabled, true)
  assert.equal(summary.familyCount, extraction.families.length)
  assert.equal(summary.assignedRouteCount, extraction.routeAssignments.length)
  assert.equal(summary.listingDetailRelationshipCount, extraction.relationships.filter((entry) => entry.kind === 'listing_to_detail').length)
  assert.ok(summary.highConfidenceFamilyCount >= 1)
  assert.ok(summary.diagnostics.some((entry) => entry.startsWith('TEMPLATE_FAMILY_EXTRACTION_COMPLETED')))
})
