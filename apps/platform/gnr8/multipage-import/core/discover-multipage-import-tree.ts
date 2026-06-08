import crypto from 'node:crypto'

import { parse } from 'parse5'
import { summarizeTemplateFamilyExtraction } from '@/gnr8/template-families'

import { classifyNavigationVisibility, classifyPageRole } from '../classification/page-classification'
import { diagnosticEntry, sortDiagnostics } from '../diagnostics/multipage-diagnostics'
import { buildNavigationTrees } from '../navigation/navigation-tree'
import { normalizeInternalHref, normalizeMultipageHost, normalizeSeedUrl, parentPath } from '../normalization/route-normalization'
import { inferSharedRegions, type PageRegionSignals } from '../shared-regions/shared-region-detection'
import { buildCanonicalDiscoveryEvidence, emptyCanonicalDiscoveryEvidence } from './canonical-discovery'
import {
  buildRedirectAliasDiscoveryEvidence,
  emptyAliasDiscoveryEvidence,
  emptyRedirectDiscoveryEvidence,
  type RedirectAliasObservedRedirect,
  type RedirectAliasObservedUrl,
} from './redirect-alias-discovery'
import { applyRobotsRouteGovernance, discoverRobotsTxt } from './robots-discovery'
import { discoverSitemapUrls } from './sitemap-discovery'
import { inferRouteFamilies } from './template-families'
import type { RouteTemplateSignals } from '@/gnr8/template-families'
import type {
  DiscoverySource,
  MultipageDiscoveryDependencies,
  MultipageDiscoveryInput,
  MultipageImportLimits,
  MultipageImportSummary,
  MultipageImportTree,
  NavigationVisibility,
  PageFetchResult,
  RouteNode,
  RobotsDiscoveryEvidence,
  SitemapDiscoveryEvidence,
} from '../types/contracts'

type ExtractedLink = {
  href: string
  source: DiscoverySource
  visibilityHint: NavigationVisibility
}

type DiscoveredRouteState = {
  routeId: string
  url: string
  path: string
  normalizedPath: string
  depth: number
  title: string | null
  discoverySource: DiscoverySource
  discoveredBy: Set<DiscoverySource>
  visibilityHints: Set<NavigationVisibility>
}

type PageSignals = PageRegionSignals & {
  routePath: string
  sectionRoleSequence: string[]
  layoutPatternSequence: string[]
  headingPatternSequence: string[]
  headingDensityBucket: 'none' | 'low' | 'medium' | 'high'
}

const DEFAULT_LIMITS: MultipageImportLimits = {
  maxRoutes: 60,
  maxDepth: 3,
  maxLinksPerPage: 120,
  maxTemplateLinksPerRoute: 25,
  maxSitemaps: 6,
  maxUrlsFromSitemaps: 120,
  maxNestedSitemaps: 4,
}

function stableId(prefix: string, parts: string[]): string {
  const suffix = crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
  return `${prefix}_${suffix}`
}

function mergeLimits(limits: Partial<MultipageImportLimits> | undefined): MultipageImportLimits {
  return {
    maxRoutes: Math.max(1, Math.floor(limits?.maxRoutes ?? DEFAULT_LIMITS.maxRoutes)),
    maxDepth: Math.max(0, Math.floor(limits?.maxDepth ?? DEFAULT_LIMITS.maxDepth)),
    maxLinksPerPage: Math.max(1, Math.floor(limits?.maxLinksPerPage ?? DEFAULT_LIMITS.maxLinksPerPage)),
    maxTemplateLinksPerRoute: Math.max(1, Math.floor(limits?.maxTemplateLinksPerRoute ?? DEFAULT_LIMITS.maxTemplateLinksPerRoute)),
    maxSitemaps: Math.max(1, Math.floor(limits?.maxSitemaps ?? DEFAULT_LIMITS.maxSitemaps)),
    maxUrlsFromSitemaps: Math.max(1, Math.floor(limits?.maxUrlsFromSitemaps ?? DEFAULT_LIMITS.maxUrlsFromSitemaps)),
    maxNestedSitemaps: Math.max(0, Math.floor(limits?.maxNestedSitemaps ?? DEFAULT_LIMITS.maxNestedSitemaps)),
  }
}

function emptySitemapDiscoveryEvidence(limits: MultipageImportLimits, diagnostics: string[] = []): SitemapDiscoveryEvidence {
  return {
    attemptedSitemapUrls: [],
    fetchedSitemapUrls: [],
    nestedSitemapCount: 0,
    urlCount: 0,
    skippedUrlCount: 0,
    discoveredUrls: [],
    skippedUrls: [],
    limitsApplied: {
      maxSitemaps: limits.maxSitemaps,
      maxUrlsFromSitemaps: limits.maxUrlsFromSitemaps,
      maxNestedSitemaps: limits.maxNestedSitemaps,
    },
    diagnostics: sortDiagnostics(diagnostics),
  }
}

function emptyRobotsDiscoveryEvidence(diagnostics: string[] = []): RobotsDiscoveryEvidence {
  return {
    robotsUrl: null,
    fetchedState: 'invalid_seed',
    sitemapDeclarations: [],
    allowRules: [],
    disallowRules: [],
    routeGovernance: [],
    routeGovernanceSummary: { allowed: 0, disallowed: 0, unknown: 0 },
    diagnostics: sortDiagnostics(diagnostics),
  }
}

function sameSitemapLocation(left: string, right: string): boolean {
  try {
    const leftUrl = new URL(left)
    const rightUrl = new URL(right)
    leftUrl.hostname = normalizeMultipageHost(leftUrl.hostname)
    rightUrl.hostname = normalizeMultipageHost(rightUrl.hostname)
    leftUrl.hash = ''
    rightUrl.hash = ''
    leftUrl.search = ''
    rightUrl.search = ''
    return leftUrl.toString() === rightUrl.toString()
  } catch {
    return left === right
  }
}

function absoluteObservedUrl(href: string, baseUrl: string): string | null {
  try {
    const parsed = new URL(href, baseUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString()
  } catch {
    return null
  }
}

function toTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return null
  const text = String(match[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text || null
}

function collectAttrs(node: unknown): Record<string, string> {
  const attrs = ((node as { attrs?: Array<{ name: string; value: string }> })?.attrs ?? []) as Array<{ name: string; value: string }>
  const out: Record<string, string> = {}
  for (const attr of attrs) out[attr.name.toLowerCase()] = String(attr.value ?? '')
  return out
}

function nodeName(node: unknown): string {
  return String((node as { nodeName?: string })?.nodeName ?? '').toLowerCase()
}

function classifyNodeContext(ancestorNames: string[], attrs: Record<string, string>): {
  source: DiscoverySource
  visibilityHint: NavigationVisibility
} {
  const path = ancestorNames.join('/')
  const classId = `${attrs.class ?? ''} ${attrs.id ?? ''} ${attrs['aria-label'] ?? ''}`.toLowerCase()

  if (path.includes('/header') || path.includes('/nav') || classId.includes('header') || classId.includes('nav')) {
    return { source: 'header_nav', visibilityHint: 'header' }
  }
  if (path.includes('/footer') || classId.includes('footer')) {
    return { source: 'footer_nav', visibilityHint: 'footer' }
  }
  if (classId.includes('utility') || classId.includes('meta-nav') || classId.includes('topbar')) {
    return { source: 'other', visibilityHint: 'utility' }
  }
  if (path.includes('/main') || path.includes('/section') || path.includes('/article') || path.includes('/body')) {
    return { source: 'body_link', visibilityHint: 'discovered_only' }
  }
  return { source: 'other', visibilityHint: 'unknown' }
}

function extractLinksAndSignals(input: {
  html: string
  routeId: string
  routePath: string
}): { links: ExtractedLink[]; signals: PageSignals } {
  const document = parse(input.html)
  const links: ExtractedLink[] = []
  const headerLinks: string[] = []
  const footerLinks: string[] = []
  const navBlockSignatures: string[] = []
  const sectionRoleSequence: string[] = []
  const layoutPatternSequence: string[] = []
  const headingCounts = new Map<string, number>()
  let ctaBandSignature: string | null = null

  const walk = (node: unknown, ancestors: string[]): void => {
    const name = nodeName(node)
    const attrs = collectAttrs(node)
    const nextAncestors = name && name !== '#text' && name !== '#comment' ? [...ancestors, name] : ancestors

    if (name === 'a') {
      const href = String(attrs.href ?? '').trim()
      if (href) {
        const context = classifyNodeContext(nextAncestors, attrs)
        links.push({ href, source: context.source, visibilityHint: context.visibilityHint })
      }
    }

    if (name === 'nav') {
      const navSignatureLinks = ((node as { childNodes?: unknown[] }).childNodes ?? [])
        .flatMap((child) => collectAnchorHrefs(child))
        .map((href) => href.toLowerCase())
        .sort((a, b) => a.localeCompare(b))
      if (navSignatureLinks.length > 0) navBlockSignatures.push(navSignatureLinks.join(','))
    }

    if (name === 'main' || name === 'article' || name === 'section' || name === 'aside') {
      const descriptor = `${attrs.class ?? ''} ${attrs.id ?? ''} ${attrs['aria-label'] ?? ''}`.toLowerCase()
      const role =
        name === 'main'
          ? 'main'
          : name === 'article'
            ? 'article_body'
            : descriptor.includes('hero')
              ? 'hero'
              : descriptor.includes('faq')
                ? 'faq'
                : descriptor.includes('feature')
                  ? 'feature_block'
                  : descriptor.includes('testimonial')
                    ? 'testimonial_block'
                    : descriptor.includes('pricing')
                      ? 'pricing_block'
                      : descriptor.includes('cta')
                        ? 'cta_block'
                        : descriptor.includes('footer')
                          ? 'footer_block'
                          : 'content_block'
      sectionRoleSequence.push(role)

      const children = ((node as { childNodes?: unknown[] }).childNodes ?? []) as unknown[]
      let directSectionChildren = 0
      let hasMedia = false
      let hasList = false
      let hasForm = false
      let headingCount = 0
      for (const child of children) {
        const childName = nodeName(child)
        if (childName === 'section' || childName === 'article') directSectionChildren += 1
        if (childName === 'img' || childName === 'picture' || childName === 'video') hasMedia = true
        if (childName === 'ul' || childName === 'ol') hasList = true
        if (childName === 'form') hasForm = true
        if (childName === 'h1' || childName === 'h2' || childName === 'h3' || childName === 'h4') headingCount += 1
      }

      const layout =
        hasForm ? 'form' : hasMedia && hasList ? 'media_list' : directSectionChildren >= 2 ? 'stacked_sections' : hasList ? 'list' : hasMedia ? 'media' : 'stack'
      layoutPatternSequence.push(layout)
      if (headingCount > 0) {
        const current = headingCounts.get('within_sections') ?? 0
        headingCounts.set('within_sections', current + headingCount)
      }
    }

    if (name === 'h1' || name === 'h2' || name === 'h3' || name === 'h4') {
      headingCounts.set(name, (headingCounts.get(name) ?? 0) + 1)
    }

    const descriptor = `${attrs.class ?? ''} ${attrs.id ?? ''} ${attrs['aria-label'] ?? ''}`.toLowerCase()
    if (!ctaBandSignature && (descriptor.includes('cta') || descriptor.includes('newsletter') || descriptor.includes('subscribe'))) {
      const ctaLinks = collectAnchorHrefs(node).map((href) => href.toLowerCase()).sort((a, b) => a.localeCompare(b))
      if (ctaLinks.length > 0) ctaBandSignature = ctaLinks.join(',')
    }

    const children = ((node as { childNodes?: unknown[] }).childNodes ?? []) as unknown[]
    for (const child of children) walk(child, nextAncestors)
  }

  walk(document, [])

  for (const link of links) {
    if (link.visibilityHint === 'header') headerLinks.push(link.href)
    if (link.visibilityHint === 'footer') footerLinks.push(link.href)
  }

  const sortedLinks = links
    .slice()
    .sort((a, b) => (a.href === b.href ? a.source.localeCompare(b.source) : a.href.localeCompare(b.href)))

  const headingPatternSequence = [...headingCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([level, count]) => `${level}:${count}`)

  const headingWeighted = headingPatternSequence.reduce((acc, entry) => {
    const [level, countRaw] = entry.split(':')
    const count = Number(countRaw ?? 0)
    if (!Number.isFinite(count) || count <= 0) return acc
    if (level === 'h1') return acc + count * 2
    if (level === 'h2') return acc + count * 1.2
    if (level === 'h3') return acc + count
    return acc + count * 0.7
  }, 0)
  const headingDensityBucket: PageSignals['headingDensityBucket'] =
    headingWeighted <= 0 ? 'none' : headingWeighted < 3 ? 'low' : headingWeighted < 8 ? 'medium' : 'high'

  return {
    links: sortedLinks,
    signals: {
      routeId: input.routeId,
      routePath: input.routePath,
      headerLinks: [...new Set(headerLinks)].sort((a, b) => a.localeCompare(b)),
      footerLinks: [...new Set(footerLinks)].sort((a, b) => a.localeCompare(b)),
      navBlockSignatures: [...new Set(navBlockSignatures)].sort((a, b) => a.localeCompare(b)),
      ctaBandSignature,
      sectionRoleSequence: [...new Set(sectionRoleSequence)],
      layoutPatternSequence: [...new Set(layoutPatternSequence)],
      headingPatternSequence,
      headingDensityBucket,
    },
  }
}

function collectAnchorHrefs(node: unknown): string[] {
  const out: string[] = []
  const walk = (next: unknown): void => {
    const name = nodeName(next)
    if (name === 'a') {
      const href = String(collectAttrs(next).href ?? '').trim()
      if (href) out.push(href)
    }
    for (const child of ((next as { childNodes?: unknown[] }).childNodes ?? []) as unknown[]) walk(child)
  }
  walk(node)
  return out
}

function summarizeVisibility(hints: Set<NavigationVisibility>): {
  headerSeen: boolean
  footerSeen: boolean
  utilitySeen: boolean
  bodySeen: boolean
} {
  return {
    headerSeen: hints.has('header'),
    footerSeen: hints.has('footer'),
    utilitySeen: hints.has('utility'),
    bodySeen: hints.has('discovered_only'),
  }
}

export async function discoverMultipageImportTree(
  input: MultipageDiscoveryInput,
  deps: MultipageDiscoveryDependencies,
): Promise<MultipageImportTree> {
  const limits = mergeLimits(input.limits)
  const diagnostics: string[] = [diagnosticEntry('MULTIPAGE_IMPORT_STARTED', input.seedUrl)]

  const normalizedSeed = normalizeSeedUrl(input.seedUrl)
  if (!normalizedSeed) {
    diagnostics.push(diagnosticEntry('MULTIPAGE_DISCOVERY_DEGRADED', 'invalid_seed'))
    return {
      siteId: input.siteId,
      seedUrl: input.seedUrl,
      canonicalHost: '',
      discoveredAt: input.discoveredAt ?? null,
      pageCount: 0,
      routeCount: 0,
      routes: [],
      navigationTrees: [
        { treeId: 'nav_primary', kind: 'primary', items: [] },
        { treeId: 'nav_utility', kind: 'utility', items: [] },
        { treeId: 'nav_footer', kind: 'footer', items: [] },
      ],
      sharedRegions: [],
      routeFamilies: [],
      pageRelationships: [],
      templateFamilyExtraction: null,
      limits,
      canonicalDiscovery: emptyCanonicalDiscoveryEvidence(['CANONICAL_DISCOVERY_STARTED:0']),
      redirectDiscovery: emptyRedirectDiscoveryEvidence(['REDIRECT_DISCOVERY_STARTED:0']),
      aliasDiscovery: emptyAliasDiscoveryEvidence(['ALIAS_DISCOVERY_STARTED:0', 'ALIAS_DISCOVERY_COMPLETED:0']),
      robotsDiscovery: emptyRobotsDiscoveryEvidence(['ROBOTS_DISCOVERY_FAILED:invalid_seed']),
      sitemapDiscovery: emptySitemapDiscoveryEvidence(limits, ['SITEMAP_DISCOVERY_NOT_FOUND:invalid_seed']),
      depthLimitHit: false,
      routeLimitHit: false,
      diagnostics: sortDiagnostics(diagnostics),
    }
  }

  const discovered = new Map<string, DiscoveredRouteState>()
  const pageSignals: PageSignals[] = []
  const canonicalDiscoveryPages: Array<{ pageUrl: string; pageRoutePath: string; html: string }> = []
  const observedAliasUrls: RedirectAliasObservedUrl[] = []
  const observedRedirects: RedirectAliasObservedRedirect[] = []
  const queue: Array<{ path: string; depth: number }> = []
  const routePathCounts = new Map<string, number>()
  const sourceGroups = new Map<string, number>()

  let depthLimitHit = false
  let routeLimitHit = false

  const addRoute = (entry: {
    path: string
    url: string
    depth: number
    title: string | null
    source: DiscoverySource
    visibilityHint: NavigationVisibility
  }): { accepted: boolean; route: DiscoveredRouteState | null } => {
    const existing = discovered.get(entry.path)
    if (existing) {
      existing.discoveredBy.add(entry.source)
      existing.visibilityHints.add(entry.visibilityHint)
      if (!existing.title && entry.title) existing.title = entry.title
      diagnostics.push(diagnosticEntry('MULTIPAGE_ROUTE_DUPLICATE_SKIPPED', entry.path))
      return { accepted: false, route: existing }
    }

    if (discovered.size >= limits.maxRoutes) {
      routeLimitHit = true
      diagnostics.push(diagnosticEntry('MULTIPAGE_ROUTE_LIMIT_REACHED', `${limits.maxRoutes}`))
      return { accepted: false, route: null }
    }

    const routeId = stableId('route', [entry.path])
    const next: DiscoveredRouteState = {
      routeId,
      url: entry.url,
      path: entry.path,
      normalizedPath: entry.path,
      depth: entry.depth,
      title: entry.title,
      discoverySource: entry.source,
      discoveredBy: new Set([entry.source]),
      visibilityHints: new Set([entry.visibilityHint]),
    }
    discovered.set(entry.path, next)
    diagnostics.push(diagnosticEntry('MULTIPAGE_ROUTE_DISCOVERED', entry.path))
    return { accepted: true, route: next }
  }

  const seed = addRoute({
    path: normalizedSeed.path,
    url: normalizedSeed.url,
    depth: 0,
    title: null,
    source: 'seed',
    visibilityHint: 'unknown',
  })
  observedAliasUrls.push({ url: input.seedUrl, routePath: normalizedSeed.path, source: 'seed' })
  if (seed.route) queue.push({ path: seed.route.path, depth: 0 })

  let robotsDiscoveryInitial = await discoverRobotsTxt({
    seedUrl: normalizedSeed.url,
    canonicalHost: normalizedSeed.canonicalHost,
    fetchRobots: deps.fetchRobots,
  })
  diagnostics.push(...robotsDiscoveryInitial.diagnostics)

  let sitemapDiscovery = await discoverSitemapUrls({
    seedUrl: normalizedSeed.url,
    canonicalHost: normalizedSeed.canonicalHost,
    limits,
    fetchSitemap: deps.fetchSitemap,
    initialSitemapUrls: robotsDiscoveryInitial.sitemapDeclarations,
  })
  diagnostics.push(...sitemapDiscovery.diagnostics)
  const missingRobotsSitemaps = robotsDiscoveryInitial.sitemapDeclarations.filter(
    (url) => !sitemapDiscovery.fetchedSitemapUrls.some((fetchedUrl) => sameSitemapLocation(url, fetchedUrl)),
  )
  if (missingRobotsSitemaps.length > 0) {
    const missingDiagnostics = missingRobotsSitemaps.map((url) => diagnosticEntry('ROBOTS_SITEMAP_DECLARATION_MISSING', url))
    robotsDiscoveryInitial = {
      ...robotsDiscoveryInitial,
      diagnostics: sortDiagnostics([...robotsDiscoveryInitial.diagnostics, ...missingDiagnostics]),
    }
    sitemapDiscovery = {
      ...sitemapDiscovery,
      diagnostics: sortDiagnostics([
        ...sitemapDiscovery.diagnostics,
        ...missingDiagnostics,
      ]),
    }
  }
  for (const sitemapUrl of sitemapDiscovery.discoveredUrls) {
    observedAliasUrls.push({ url: sitemapUrl.originalUrl, routePath: sitemapUrl.normalizedRoutePath, source: 'sitemap' })
    observedAliasUrls.push({ url: sitemapUrl.normalizedUrl, routePath: sitemapUrl.normalizedRoutePath, source: 'sitemap' })
    if (sitemapUrl.normalizedRoutePath === normalizedSeed.path) {
      diagnostics.push(diagnosticEntry('SITEMAP_URL_SKIPPED', `seed_route:${sitemapUrl.normalizedRoutePath}`))
      continue
    }
    const added = addRoute({
      path: sitemapUrl.normalizedRoutePath,
      url: sitemapUrl.normalizedUrl,
      depth: 1,
      title: null,
      source: 'sitemap_like',
      visibilityHint: 'discovered_only',
    })
    if (added.accepted && added.route) {
      queue.push({ path: added.route.path, depth: 1 })
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    const currentRoute = discovered.get(current.path)
    if (!currentRoute) continue

    if (current.depth > limits.maxDepth) {
      depthLimitHit = true
      diagnostics.push(diagnosticEntry('MULTIPAGE_DEPTH_LIMIT_REACHED', `${limits.maxDepth}`))
      continue
    }

    const fetched = await deps.fetchPage(currentRoute.url)
    if (!fetched) {
      diagnostics.push(diagnosticEntry('MULTIPAGE_DISCOVERY_PARTIAL', currentRoute.path))
      continue
    }

    currentRoute.title = currentRoute.title ?? fetched.title ?? toTitleFromHtml(fetched.html)
    if (fetched.url && fetched.url !== currentRoute.url) {
      observedRedirects.push({
        originalUrl: currentRoute.url,
        finalUrl: fetched.url,
        redirectCount: 1,
      })
    }
    observedAliasUrls.push({ url: fetched.url || currentRoute.url, routePath: currentRoute.path, source: 'acquisition' })
    canonicalDiscoveryPages.push({
      pageUrl: fetched.url || currentRoute.url,
      pageRoutePath: currentRoute.path,
      html: fetched.html,
    })

    const extracted = extractLinksAndSignals({
      html: fetched.html,
      routeId: currentRoute.routeId,
      routePath: currentRoute.path,
    })

    pageSignals.push(extracted.signals)

    const boundedLinks = extracted.links.slice(0, limits.maxLinksPerPage)
    const templateCapCounts = new Map<string, number>()

    for (const link of boundedLinks) {
      const normalized = normalizeInternalHref({
        href: link.href,
        currentPageUrl: currentRoute.url,
        canonicalHost: normalizedSeed.canonicalHost,
      })

      if ('skip' in normalized) {
        if (normalized.skip === 'external_host') diagnostics.push(diagnosticEntry('MULTIPAGE_EXTERNAL_LINK_SKIPPED', link.href))
        if (normalized.skip === 'asset_link') diagnostics.push(diagnosticEntry('MULTIPAGE_ASSET_LINK_SKIPPED', link.href))
        continue
      }

      observedAliasUrls.push({
        url: absoluteObservedUrl(link.href, currentRoute.url) ?? normalized.normalized.url,
        routePath: normalized.normalized.path,
        source: 'link',
      })

      const groupKey = normalized.normalized.path.split('/').slice(0, 2).join('/') || '/'
      const templateCount = (templateCapCounts.get(groupKey) ?? 0) + 1
      templateCapCounts.set(groupKey, templateCount)
      if (templateCount > limits.maxTemplateLinksPerRoute) continue

      const nextDepth = current.depth + 1
      if (nextDepth > limits.maxDepth) {
        depthLimitHit = true
        diagnostics.push(diagnosticEntry('MULTIPAGE_DEPTH_LIMIT_REACHED', `${limits.maxDepth}`))
        continue
      }

      const added = addRoute({
        path: normalized.normalized.path,
        url: normalized.normalized.url,
        depth: nextDepth,
        title: null,
        source: link.source,
        visibilityHint: link.visibilityHint,
      })
      if (added.accepted && added.route) {
        queue.push({ path: added.route.path, depth: nextDepth })
      }
    }
  }

  for (const route of discovered.values()) {
    const key = route.path.split('/').slice(0, 2).join('/') || '/'
    routePathCounts.set(key, (routePathCounts.get(key) ?? 0) + 1)

    for (const source of route.discoveredBy) {
      sourceGroups.set(source, (sourceGroups.get(source) ?? 0) + 1)
    }
  }

  const sortedStates = [...discovered.values()].sort((a, b) => a.path.localeCompare(b.path))
  const canonicalDiscovery = buildCanonicalDiscoveryEvidence({
    seedCanonicalHost: normalizedSeed.canonicalHost,
    pages: canonicalDiscoveryPages,
  })
  diagnostics.push(...canonicalDiscovery.diagnostics)
  const { redirectDiscovery, aliasDiscovery } = buildRedirectAliasDiscoveryEvidence({
    seedUrl: normalizedSeed.url,
    observedUrls: observedAliasUrls,
    observedRedirects,
    canonicalDiscovery,
  })
  diagnostics.push(...redirectDiscovery.diagnostics, ...aliasDiscovery.diagnostics)

  const nodes: RouteNode[] = sortedStates.map((state) => {
    const visibilityState = summarizeVisibility(state.visibilityHints)
    const siblingCountByPrefix = routePathCounts.get(state.path.split('/').slice(0, 2).join('/') || '/') ?? 0
    const pageRole = classifyPageRole({
      path: state.path,
      title: state.title,
      depth: state.depth,
      siblingCountByPrefix,
      ...visibilityState,
    })

    const navigationVisibility = classifyNavigationVisibility({
      path: state.path,
      title: state.title,
      depth: state.depth,
      siblingCountByPrefix,
      ...visibilityState,
    })

    diagnostics.push(diagnosticEntry('MULTIPAGE_ROUTE_CLASSIFIED', `${state.path}:${pageRole}:${navigationVisibility}`))

    const parent = parentPath(state.path)
    const parentRouteId = parent ? discovered.get(parent)?.routeId ?? null : null

    return {
      routeId: state.routeId,
      url: state.url,
      path: state.path,
      normalizedPath: state.path,
      parentRouteId,
      depth: state.depth,
      pageRole,
      navigationVisibility,
      discoverySource: state.discoverySource,
      title: state.title,
      isPrimaryCandidate: navigationVisibility === 'header' || pageRole === 'homepage',
      isHtmlPageCandidate: true,
    }
  })

  const robotsDiscovery = applyRobotsRouteGovernance(
    robotsDiscoveryInitial,
    nodes.map((node) => ({ routePath: node.path, normalizedUrl: node.url })),
  )
  diagnostics.push(...robotsDiscovery.diagnostics)

  for (const node of nodes) {
    node.robotsGovernance = robotsDiscovery.routeGovernance.find((entry) => entry.routePath === node.path)?.status ?? 'unknown'
  }

  const navigationTrees = buildNavigationTrees(nodes)
  diagnostics.push(diagnosticEntry('MULTIPAGE_NAV_TREE_BUILT', `${navigationTrees.length}`))

  const sharedRegions = inferSharedRegions(pageSignals)
  if (sharedRegions.length > 0) diagnostics.push(diagnosticEntry('MULTIPAGE_SHARED_REGION_INFERRED', `${sharedRegions.length}`))

  const routeSignals: RouteTemplateSignals[] = pageSignals
    .map((signal) => ({
      routeId: signal.routeId,
      sectionRoleSequence: signal.sectionRoleSequence.slice(),
      layoutPatternSequence: signal.layoutPatternSequence.slice(),
      headingPatternSequence: signal.headingPatternSequence.slice(),
      headingDensityBucket: signal.headingDensityBucket,
    }))
    .sort((a, b) => a.routeId.localeCompare(b.routeId))

  const familyResult = inferRouteFamilies({
    siteId: input.siteId,
    sourceTreeId: stableId('mtree', [input.siteId, normalizedSeed.url]),
    routes: nodes,
    sharedRegions,
    routeSignals,
  })
  if (familyResult.routeFamilies.length > 0) diagnostics.push(diagnosticEntry('MULTIPAGE_TEMPLATE_FAMILY_INFERRED', `${familyResult.routeFamilies.length}`))
  diagnostics.push(...familyResult.templateFamilyExtraction.diagnostics)

  diagnostics.push(diagnosticEntry('MULTIPAGE_DISCOVERY_COMPLETED', `${nodes.length}`))

  return {
    siteId: input.siteId,
    seedUrl: normalizedSeed.url,
    canonicalHost: normalizedSeed.canonicalHost,
    discoveredAt: input.discoveredAt ?? null,
    pageCount: nodes.length,
    routeCount: nodes.length,
    routes: nodes,
    navigationTrees,
    sharedRegions,
    routeFamilies: familyResult.routeFamilies,
    pageRelationships: familyResult.pageRelationships,
    templateFamilyExtraction: familyResult.templateFamilyExtraction,
    limits,
    canonicalDiscovery,
    redirectDiscovery,
    aliasDiscovery,
    robotsDiscovery,
    sitemapDiscovery,
    depthLimitHit,
    routeLimitHit,
    diagnostics: sortDiagnostics(diagnostics),
  }
}

export function summarizeMultipageImportTree(tree: MultipageImportTree): MultipageImportSummary {
  const primaryTree = tree.navigationTrees.find((item) => item.kind === 'primary')
  const footerTree = tree.navigationTrees.find((item) => item.kind === 'footer')
  const countItems = (items: Array<{ children: unknown[] }>): number => {
    let count = 0
    const stack = [...items]
    while (stack.length > 0) {
      const item = stack.pop()
      if (!item) continue
      count += 1
      for (const child of item.children) stack.push(child as { children: unknown[] })
    }
    return count
  }

  return {
    enabled: true,
    routeCount: tree.routeCount,
    pageCount: tree.pageCount,
    primaryNavigationCount: countItems(primaryTree?.items ?? []),
    footerNavigationCount: countItems(footerTree?.items ?? []),
    sharedRegionCount: tree.sharedRegions.length,
    templateFamilyExtraction: summarizeTemplateFamilyExtraction(tree.templateFamilyExtraction),
    canonicalDiscovery: tree.canonicalDiscovery,
    redirectDiscovery: tree.redirectDiscovery,
    aliasDiscovery: tree.aliasDiscovery,
    robotsDiscovery: tree.robotsDiscovery,
    sitemapDiscovery: tree.sitemapDiscovery,
    depthLimitHit: tree.depthLimitHit,
    routeLimitHit: tree.routeLimitHit,
    diagnostics: tree.diagnostics.slice(),
  }
}

export async function discoverMultipageImportTreeWithFetch(input: MultipageDiscoveryInput): Promise<MultipageImportTree> {
  return discoverMultipageImportTree(input, {
    fetchPage: async (url): Promise<PageFetchResult | null> => {
      try {
        const response = await fetch(url, { redirect: 'follow' })
        if (!response.ok) return null
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.toLowerCase().includes('text/html')) return null
        const html = await response.text()
        if (!html.trim()) return null
        return {
          url: response.url || url,
          html,
          title: toTitleFromHtml(html),
        }
      } catch {
        return null
      }
    },
    fetchSitemap: async (url) => {
      try {
        const response = await fetch(url, { redirect: 'follow' })
        if (!response.ok) return null
        const body = await response.text()
        if (!body.trim()) return null
        return {
          url: response.url || url,
          body,
          contentType: response.headers.get('content-type'),
        }
      } catch {
        return null
      }
    },
    fetchRobots: async (url) => {
      try {
        const response = await fetch(url, { redirect: 'follow' })
        if (!response.ok) return null
        const body = await response.text()
        if (!body.trim()) return null
        return {
          url: response.url || url,
          body,
          contentType: response.headers.get('content-type'),
        }
      } catch {
        return null
      }
    },
  })
}
