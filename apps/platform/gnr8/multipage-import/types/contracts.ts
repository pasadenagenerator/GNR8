import type {
  SiteTemplateFamilyExtraction,
  TemplateFamilyExtractionSummary,
} from '@/gnr8/template-families'

export type MultipagePageRole =
  | 'homepage'
  | 'standard'
  | 'listing'
  | 'detail'
  | 'legal'
  | 'utility'
  | 'contact'
  | 'blog'
  | 'article'
  | 'unknown'

export type NavigationVisibility = 'header' | 'footer' | 'utility' | 'discovered_only' | 'unknown'

export type DiscoverySource = 'seed' | 'header_nav' | 'footer_nav' | 'body_link' | 'sitemap_like' | 'other'

export type MultipageImportLimits = {
  maxRoutes: number
  maxDepth: number
  maxLinksPerPage: number
  maxTemplateLinksPerRoute: number
  maxSitemaps: number
  maxUrlsFromSitemaps: number
  maxNestedSitemaps: number
}

export type SitemapDiscoverySkippedUrl = {
  originalUrl: string | null
  normalizedUrl: string | null
  normalizedRoutePath: string | null
  sourceSitemapUrl: string
  reason: string
}

export type SitemapDiscoveryDiscoveredUrl = {
  originalUrl: string
  normalizedUrl: string
  normalizedRoutePath: string
  sourceSitemapUrl: string
}

export type SitemapDiscoveryEvidence = {
  attemptedSitemapUrls: string[]
  fetchedSitemapUrls: string[]
  nestedSitemapCount: number
  urlCount: number
  skippedUrlCount: number
  discoveredUrls: SitemapDiscoveryDiscoveredUrl[]
  skippedUrls: SitemapDiscoverySkippedUrl[]
  limitsApplied: {
    maxSitemaps: number
    maxUrlsFromSitemaps: number
    maxNestedSitemaps: number
  }
  diagnostics: string[]
}

export type CanonicalSameSiteStatus = 'same_site' | 'external_site' | 'invalid_url' | 'unsupported_scheme'

export type CanonicalEquivalenceStatus = 'same_route' | 'different_route' | 'not_same_site' | 'invalid_url'

export type CanonicalDiscoveryEntry = {
  pageUrl: string
  pageRoutePath: string
  canonicalUrl: string | null
  normalizedCanonicalRoutePath: string | null
  sameSite: boolean
  sameSiteStatus: CanonicalSameSiteStatus
  canonicalEquivalenceStatus: CanonicalEquivalenceStatus
}

export type HreflangDiscoveryEntry = {
  pageUrl: string
  pageRoutePath: string
  hreflang: string
  url: string | null
  normalizedRoutePath: string | null
  sameSite: boolean
  sameSiteStatus: CanonicalSameSiteStatus
}

export type CanonicalDiscoveryDuplicate = {
  normalizedCanonicalRoutePath: string
  pageRoutePaths: string[]
  pageUrls: string[]
  canonicalUrls: string[]
}

export type CanonicalDiscoveryConflict = {
  pageUrl: string
  pageRoutePath: string
  canonicalUrls: string[]
  normalizedCanonicalRoutePaths: string[]
  reason: string
}

export type HreflangDiscoveryGroup = {
  pageRoutePath: string
  entries: HreflangDiscoveryEntry[]
}

export type CanonicalDiscoveryEvidence = {
  canonicalEntries: CanonicalDiscoveryEntry[]
  alternateLanguageEntries: HreflangDiscoveryEntry[]
  duplicates: CanonicalDiscoveryDuplicate[]
  conflicts: CanonicalDiscoveryConflict[]
  hreflangGroups: HreflangDiscoveryGroup[]
  diagnostics: string[]
}

export type RedirectDiscoveryClassification =
  | 'same_route_redirect'
  | 'route_changed_redirect'
  | 'cross_origin_redirect'
  | 'canonical_host_redirect'

export type RedirectDiscoveryEntry = {
  originalUrl: string
  finalUrl: string
  statusCodes: number[]
  redirectCount: number
  sameSite: boolean
  normalizedSourceRoute: string | null
  normalizedFinalRoute: string | null
  classification: RedirectDiscoveryClassification
  diagnostics: string[]
}

export type RedirectDiscoveryEvidence = {
  redirectEntries: RedirectDiscoveryEntry[]
  crossOriginRedirects: RedirectDiscoveryEntry[]
  counts: {
    redirectCount: number
    crossOriginRedirectCount: number
    canonicalHostRedirectCount: number
  }
  diagnostics: string[]
}

export type AliasDiscoverySource = 'seed' | 'link' | 'sitemap' | 'canonical' | 'acquisition' | 'redirect'

export type AliasDiscoveryGroup = {
  canonicalRoute: string
  aliases: string[]
  sources: AliasDiscoverySource[]
  diagnostics: string[]
}

export type AliasRouteCollision = {
  canonicalRoute: string
  sourceRoutes: string[]
  aliases: string[]
  sources: AliasDiscoverySource[]
  reason: string
}

export type AliasDiscoveryEvidence = {
  aliasGroups: AliasDiscoveryGroup[]
  routeCollisions: AliasRouteCollision[]
  conflicts: AliasRouteCollision[]
  counts: {
    aliasGroupCount: number
    routeCollisionCount: number
  }
  diagnostics: string[]
}

export type RobotsFetchResult = {
  url: string
  body: string
  contentType: string | null
}

export type RobotsDiscoveryFetchedState = 'fetched' | 'not_found' | 'failed' | 'unavailable' | 'invalid_seed' | 'parse_failed'

export type RobotsDiscoveryRule = {
  userAgent: string
  path: string
}

export type RobotsRouteGovernanceStatus = 'allowed' | 'disallowed' | 'unknown'

export type RobotsRouteGovernanceEntry = {
  routePath: string
  normalizedUrl: string | null
  status: RobotsRouteGovernanceStatus
  matchedRule: {
    directive: 'allow' | 'disallow'
    userAgent: string
    path: string
  } | null
}

export type RobotsDiscoveryEvidence = {
  robotsUrl: string | null
  fetchedState: RobotsDiscoveryFetchedState
  sitemapDeclarations: string[]
  allowRules: RobotsDiscoveryRule[]
  disallowRules: RobotsDiscoveryRule[]
  routeGovernance: RobotsRouteGovernanceEntry[]
  routeGovernanceSummary: {
    allowed: number
    disallowed: number
    unknown: number
  }
  diagnostics: string[]
}

export type RouteNode = {
  routeId: string
  url: string
  path: string
  normalizedPath: string
  parentRouteId: string | null
  depth: number
  pageRole: MultipagePageRole
  navigationVisibility: NavigationVisibility
  discoverySource: DiscoverySource
  title: string | null
  isPrimaryCandidate: boolean
  isHtmlPageCandidate: boolean
  robotsGovernance?: RobotsRouteGovernanceStatus
}

export type NavigationTreeItem = {
  routeId: string
  path: string
  title: string | null
  children: NavigationTreeItem[]
}

export type NavigationTree = {
  treeId: string
  kind: 'primary' | 'utility' | 'footer'
  items: NavigationTreeItem[]
}

export type SharedRegionCandidate = {
  regionId: string
  kind: 'header' | 'footer' | 'cta_band' | 'nav_block' | 'other'
  pageIds: string[]
  confidence: 'low' | 'medium' | 'high'
  signature: string
}

export type RouteFamily = {
  familyId: string
  kind: 'listing_detail' | 'article_family' | 'standard_family' | 'prefix_family'
  rootPath: string
  memberRouteIds: string[]
  signature: string
}

export type PageRelationship = {
  relationshipId: string
  kind: 'listing_to_detail' | 'family_member'
  sourceRouteId: string
  targetRouteId: string
  confidence: 'low' | 'medium' | 'high'
}

export type MultipageImportTree = {
  siteId: string
  seedUrl: string
  canonicalHost: string
  discoveredAt: string | null
  pageCount: number
  routeCount: number
  routes: RouteNode[]
  navigationTrees: NavigationTree[]
  sharedRegions: SharedRegionCandidate[]
  routeFamilies: RouteFamily[]
  pageRelationships: PageRelationship[]
  templateFamilyExtraction: SiteTemplateFamilyExtraction | null
  limits: MultipageImportLimits
  canonicalDiscovery: CanonicalDiscoveryEvidence
  redirectDiscovery: RedirectDiscoveryEvidence
  aliasDiscovery: AliasDiscoveryEvidence
  robotsDiscovery: RobotsDiscoveryEvidence
  sitemapDiscovery: SitemapDiscoveryEvidence
  depthLimitHit: boolean
  routeLimitHit: boolean
  diagnostics: string[]
}

export type MultipageImportSummary = {
  enabled: boolean
  routeCount: number
  pageCount: number
  primaryNavigationCount: number
  footerNavigationCount: number
  sharedRegionCount: number
  templateFamilyExtraction: TemplateFamilyExtractionSummary
  canonicalDiscovery: CanonicalDiscoveryEvidence
  redirectDiscovery: RedirectDiscoveryEvidence
  aliasDiscovery: AliasDiscoveryEvidence
  robotsDiscovery: RobotsDiscoveryEvidence
  sitemapDiscovery: SitemapDiscoveryEvidence
  depthLimitHit: boolean
  routeLimitHit: boolean
  diagnostics: string[]
}

export type PageFetchResult = {
  url: string
  html: string
  title: string | null
}

export type SitemapFetchResult = {
  url: string
  body: string
  contentType: string | null
}

export type MultipageDiscoveryDependencies = {
  fetchPage: (url: string) => Promise<PageFetchResult | null>
  fetchSitemap?: (url: string) => Promise<SitemapFetchResult | null>
  fetchRobots?: (url: string) => Promise<RobotsFetchResult | null>
}

export type MultipageDiscoveryInput = {
  siteId: string
  seedUrl: string
  limits?: Partial<MultipageImportLimits>
  discoveredAt?: string | null
}
