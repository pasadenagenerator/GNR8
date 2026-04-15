import { createSiteTreeDiagnostic, sortSiteTreeDiagnostics } from '@/gnr8/site-tree/diagnostics/site-tree-diagnostics'
import { extractClassifiedLinksFromHtml } from '@/gnr8/site-tree/core/link-extractor'
import { deriveDeterministicPageId, normalizeRoutePath, pathToRouteSegments } from '@/gnr8/site-tree/core/url-normalization'
import type { SiteTree, SiteTreeDiagnostic, SiteTreePageNode, SiteTreeSummary } from '@/gnr8/site-tree/types/site-tree-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function classifyPageRole(pathname: string): SiteTreePageNode['pageRole'] {
  if (pathname === '/') return 'homepage'

  const segments = pathToRouteSegments(pathname)
  const first = segments[0] ?? ''
  const last = segments[segments.length - 1] ?? ''
  const joined = segments.join('/')

  const utilityRoots = new Set(['contact', 'privacy', 'terms', 'legal', 'login', 'signup', 'account', 'cart', 'checkout'])
  const listingRoots = new Set(['blog', 'news', 'articles', 'services', 'products', 'work', 'portfolio', 'projects'])

  if (utilityRoots.has(first) || utilityRoots.has(last)) return 'utility_candidate'
  if (listingRoots.has(last) && segments.length <= 2) return 'listing_candidate'
  if (segments.length >= 2 && listingRoots.has(first)) return 'detail_candidate'
  if (/\/(page|p)\/\d+$/i.test(`/${joined}`)) return 'detail_candidate'
  if (segments.length >= 2 && /^[a-z0-9-]+$/i.test(last)) return 'content'
  return 'unknown'
}

function createSharedLayoutHints(): { headerLikelyShared: boolean; footerLikelyShared: boolean } {
  return {
    headerLikelyShared: true,
    footerLikelyShared: true,
  }
}

function summarizeTree(tree: SiteTree, payloadPath?: string | null): SiteTreeSummary {
  const candidatePageCount = tree.pages.filter((page) => page.isDiscoveredOnly).length
  return {
    rootPageId: tree.rootPageId,
    pageCount: tree.pages.length,
    candidatePageCount,
    internalLinkCount: tree.navigation.internalLinkCount,
    externalLinkCount: tree.navigation.externalLinkCount,
    ignoredLinkCount: tree.navigation.ignoredLinkCount,
    diagnostics: [...new Set(tree.diagnostics.map((diag) => normalizeText(diag.code)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    payloadPath: payloadPath ?? null,
  }
}

function sortPagesDeterministically(pages: SiteTreePageNode[], rootPageId: string): SiteTreePageNode[] {
  return pages.slice().sort((left, right) => {
    if (left.pageId === rootPageId && right.pageId !== rootPageId) return -1
    if (right.pageId === rootPageId && left.pageId !== rootPageId) return 1

    const depthDelta = left.depth - right.depth
    if (depthDelta !== 0) return depthDelta
    const pathDelta = left.normalizedPath.localeCompare(right.normalizedPath)
    if (pathDelta !== 0) return pathDelta
    return left.pageId.localeCompare(right.pageId)
  })
}

export function buildSiteTreeFromSeedPage(input: {
  siteId: string
  seedUrl: string
  seedHtml: string
  sourceSnapshotId?: string
  sourceRunId?: string
}): SiteTree {
  const diagnostics: SiteTreeDiagnostic[] = []
  const seedParsed = new URL(input.seedUrl)
  const seedNormalizedPath = normalizeRoutePath(seedParsed.pathname || '/')
  const seedCanonicalUrl = `${seedParsed.protocol}//${seedParsed.host}${seedNormalizedPath}`
  const seedPageId = deriveDeterministicPageId(seedNormalizedPath)
  const seedSegments = pathToRouteSegments(seedNormalizedPath)

  diagnostics.push(
    createSiteTreeDiagnostic({
      code: 'SITE_TREE_INITIALIZED',
      message: 'Initialized site tree build from seed page.',
      metadata: { siteId: input.siteId },
    }),
  )

  const pagesByPath = new Map<string, SiteTreePageNode>()
  pagesByPath.set(seedNormalizedPath, {
    pageId: seedPageId,
    url: seedCanonicalUrl,
    normalizedPath: seedNormalizedPath,
    routeSegments: seedSegments,
    depth: seedSegments.length,
    discoverySource: 'seed_page',
    pageRole: classifyPageRole(seedNormalizedPath),
    isSeedPage: true,
    isDiscoveredOnly: false,
    sharedLayoutHints: createSharedLayoutHints(),
  })
  diagnostics.push(
    createSiteTreeDiagnostic({
      code: 'SITE_TREE_SEED_PAGE_CREATED',
      message: 'Seed page node created.',
      metadata: { pageId: seedPageId, normalizedPath: seedNormalizedPath },
    }),
  )

  const extractedLinks = extractClassifiedLinksFromHtml({
    html: input.seedHtml,
    baseUrl: input.seedUrl,
  })
  diagnostics.push(
    createSiteTreeDiagnostic({
      code: 'SITE_TREE_LINKS_EXTRACTED',
      message: 'Links extracted from seed page.',
      metadata: { linkCount: extractedLinks.length },
    }),
  )

  let internalLinkCount = 0
  let externalLinkCount = 0
  let ignoredLinkCount = 0

  for (const link of extractedLinks) {
    if (link.normalized.kind === 'external') {
      externalLinkCount += 1
      diagnostics.push(
        createSiteTreeDiagnostic({
          code: 'SITE_TREE_EXTERNAL_LINK_CLASSIFIED',
          message: 'External link classified.',
          metadata: { href: link.href, canonicalUrl: link.normalized.canonicalUrl },
        }),
      )
      continue
    }

    if (link.normalized.kind === 'ignored') {
      ignoredLinkCount += 1
      diagnostics.push(
        createSiteTreeDiagnostic({
          code: 'SITE_TREE_LINK_IGNORED',
          message: 'Link ignored during site tree build.',
          metadata: { href: link.href, reason: link.normalized.reason },
        }),
      )
      continue
    }

    internalLinkCount += 1
    diagnostics.push(
      createSiteTreeDiagnostic({
        code: 'SITE_TREE_INTERNAL_LINK_CLASSIFIED',
        message: 'Internal link classified.',
        metadata: { href: link.href, normalizedPath: link.normalized.normalizedPath },
      }),
    )

    if (pagesByPath.has(link.normalized.normalizedPath)) {
      diagnostics.push(
        createSiteTreeDiagnostic({
          code: 'SITE_TREE_DUPLICATE_PAGE_SKIPPED',
          message: 'Duplicate page candidate skipped.',
          metadata: { normalizedPath: link.normalized.normalizedPath },
        }),
      )
      continue
    }

    const routeSegments = pathToRouteSegments(link.normalized.normalizedPath)
    const pageId = deriveDeterministicPageId(link.normalized.normalizedPath)
    pagesByPath.set(link.normalized.normalizedPath, {
      pageId,
      url: link.normalized.canonicalUrl,
      normalizedPath: link.normalized.normalizedPath,
      routeSegments,
      depth: routeSegments.length,
      discoverySource: 'internal_link',
      pageRole: classifyPageRole(link.normalized.normalizedPath),
      isSeedPage: false,
      isDiscoveredOnly: true,
      linkText: link.linkText || undefined,
      linkContext: link.linkContext || undefined,
      sharedLayoutHints: createSharedLayoutHints(),
    })
    diagnostics.push(
      createSiteTreeDiagnostic({
        code: 'SITE_TREE_PAGE_CANDIDATE_CREATED',
        message: 'Page candidate created from internal link.',
        metadata: { normalizedPath: link.normalized.normalizedPath, pageId },
      }),
    )
  }

  const pages = [...pagesByPath.values()]

  for (const page of pages) {
    if (page.pageId === seedPageId) continue
    const segments = page.routeSegments
    if (segments.length === 0) continue

    const parentPath = segments.length === 1 ? '/' : `/${segments.slice(0, -1).join('/')}`
    const normalizedParentPath = normalizeRoutePath(parentPath)
    const parent = pagesByPath.get(normalizedParentPath)
    if (!parent) continue

    page.parentPageId = parent.pageId
    diagnostics.push(
      createSiteTreeDiagnostic({
        code: 'SITE_TREE_PARENT_INFERRED',
        message: 'Parent page inferred from route structure.',
        metadata: { pageId: page.pageId, parentPageId: parent.pageId },
      }),
    )
  }

  if (internalLinkCount === 0) {
    diagnostics.push(
      createSiteTreeDiagnostic({
        code: 'SITE_TREE_NO_INTERNAL_LINKS_FOUND',
        message: 'No internal links found on seed page.',
      }),
    )
  }

  diagnostics.push(
    createSiteTreeDiagnostic({
      code: 'SITE_TREE_BUILD_COMPLETED',
      message: 'Site tree build completed.',
      metadata: { pageCount: pages.length, internalLinkCount, externalLinkCount, ignoredLinkCount },
    }),
  )

  const tree: SiteTree = {
    siteId: input.siteId,
    rootPageId: seedPageId,
    sourceSnapshotId: normalizeText(input.sourceSnapshotId) || undefined,
    sourceRunId: normalizeText(input.sourceRunId) || undefined,
    pages: sortPagesDeterministically(pages, seedPageId),
    navigation: {
      internalLinkCount,
      externalLinkCount,
      candidatePageCount: pages.filter((page) => page.isDiscoveredOnly).length,
      ignoredLinkCount,
    },
    diagnostics: sortSiteTreeDiagnostics(diagnostics),
  }

  return tree
}

export function buildSafeSiteTreeFromSeedPage(input: {
  siteId: string
  seedUrl: string
  seedHtml: string
  sourceSnapshotId?: string
  sourceRunId?: string
  payloadPath?: string | null
}): {
  tree: SiteTree
  summary: SiteTreeSummary
} {
  const safeSeedUrl = (() => {
    try {
      return new URL(input.seedUrl).toString()
    } catch {
      return 'https://invalid.local/'
    }
  })()

  try {
    const tree = buildSiteTreeFromSeedPage({
      ...input,
      seedUrl: safeSeedUrl,
    })
    return {
      tree,
      summary: summarizeTree(tree, input.payloadPath),
    }
  } catch (error) {
    const fallbackTree = buildSiteTreeFromSeedPage({
      siteId: input.siteId,
      seedUrl: safeSeedUrl,
      seedHtml: '',
      sourceSnapshotId: input.sourceSnapshotId,
      sourceRunId: input.sourceRunId,
    })
    fallbackTree.diagnostics = sortSiteTreeDiagnostics([
      ...fallbackTree.diagnostics,
      createSiteTreeDiagnostic({
        code: 'SITE_TREE_BUILD_FAILED',
        severity: 'warning',
        message: 'Site tree build failed and returned seed-safe fallback.',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      }),
    ])
    return {
      tree: fallbackTree,
      summary: summarizeTree(fallbackTree, input.payloadPath),
    }
  }
}
