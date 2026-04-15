export type SiteTreePageRole =
  | 'homepage'
  | 'content'
  | 'listing_candidate'
  | 'detail_candidate'
  | 'utility_candidate'
  | 'unknown'

export type SiteTreeDiscoverySource = 'seed_page' | 'internal_link'

export type SiteTreeDiagnosticSeverity = 'info' | 'warning' | 'error'

export type SiteTreeDiagnosticCode =
  | 'SITE_TREE_INITIALIZED'
  | 'SITE_TREE_SEED_PAGE_CREATED'
  | 'SITE_TREE_LINKS_EXTRACTED'
  | 'SITE_TREE_INTERNAL_LINK_CLASSIFIED'
  | 'SITE_TREE_EXTERNAL_LINK_CLASSIFIED'
  | 'SITE_TREE_LINK_IGNORED'
  | 'SITE_TREE_PAGE_CANDIDATE_CREATED'
  | 'SITE_TREE_DUPLICATE_PAGE_SKIPPED'
  | 'SITE_TREE_PARENT_INFERRED'
  | 'SITE_TREE_BUILD_COMPLETED'
  | 'SITE_TREE_NO_INTERNAL_LINKS_FOUND'
  | 'SITE_TREE_BUILD_FAILED'

export type SiteTreeDiagnostic = {
  code: SiteTreeDiagnosticCode | string
  severity: SiteTreeDiagnosticSeverity
  message: string
  metadata?: Record<string, unknown>
}

export type SiteTreePageNode = {
  pageId: string
  url: string
  normalizedPath: string
  routeSegments: string[]
  parentPageId?: string
  depth: number
  discoverySource: SiteTreeDiscoverySource
  pageRole: SiteTreePageRole
  isSeedPage: boolean
  isDiscoveredOnly: boolean
  linkText?: string
  linkContext?: string
  sharedLayoutHints?: {
    headerLikelyShared: boolean
    footerLikelyShared: boolean
  }
}

export type SiteTreeNavigationSummary = {
  internalLinkCount: number
  externalLinkCount: number
  candidatePageCount: number
  ignoredLinkCount: number
}

export type SiteTree = {
  siteId: string
  rootPageId: string
  sourceSnapshotId?: string
  sourceRunId?: string
  pages: SiteTreePageNode[]
  navigation: SiteTreeNavigationSummary
  diagnostics: SiteTreeDiagnostic[]
}

export type SiteTreeSummary = {
  rootPageId: string
  pageCount: number
  candidatePageCount: number
  internalLinkCount: number
  externalLinkCount: number
  ignoredLinkCount: number
  diagnostics: string[]
  payloadPath?: string | null
}
