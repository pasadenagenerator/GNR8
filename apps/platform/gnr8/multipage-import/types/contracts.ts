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
  depthLimitHit: boolean
  routeLimitHit: boolean
  diagnostics: string[]
}

export type PageFetchResult = {
  url: string
  html: string
  title: string | null
}

export type MultipageDiscoveryDependencies = {
  fetchPage: (url: string) => Promise<PageFetchResult | null>
}

export type MultipageDiscoveryInput = {
  siteId: string
  seedUrl: string
  limits?: Partial<MultipageImportLimits>
  discoveredAt?: string | null
}
