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

export type TemplateFamilyRouteNode = {
  routeId: string
  normalizedPath: string
  pageRole: MultipagePageRole
}

export type TemplateFamilySharedRegionCandidate = {
  regionId: string
  pageIds: string[]
}

export type TemplateFamilyKind =
  | 'homepage_family'
  | 'standard_page_family'
  | 'listing_family'
  | 'detail_family'
  | 'article_family'
  | 'legal_family'
  | 'utility_family'
  | 'mixed_family'
  | 'unknown_family'

export type TemplateFamilyConfidence = 'low' | 'medium' | 'high'

export type RouteTemplateSignals = {
  routeId: string
  sectionRoleSequence: string[]
  layoutPatternSequence: string[]
  headingPatternSequence: string[]
  headingDensityBucket: 'none' | 'low' | 'medium' | 'high'
}

export type TemplateFamilySignature = {
  sectionRoleSequence: string[]
  layoutPatternSequence: string[]
  headingPatternSequence: string[]
  routePattern: string
  pageRoleDistribution: Record<string, number>
  sharedRegionSignature: string[]
}

export type TemplateFamily = {
  familyId: string
  familyKind: TemplateFamilyKind
  routeIds: string[]
  pageCount: number
  signature: TemplateFamilySignature
  confidence: TemplateFamilyConfidence
  representativeRouteId?: string | null
  sharedRegionIds: string[]
}

export type TemplateFamilyAssignment = {
  assignmentId: string
  routeId: string
  familyId: string
  confidence: TemplateFamilyConfidence
  evidence: string[]
}

export type TemplateFamilyRelationship = {
  relationshipId: string
  kind: 'listing_to_detail' | 'parent_to_child' | 'sibling_family' | 'shared_template_variant'
  sourceFamilyId: string
  targetFamilyId: string
  confidence: TemplateFamilyConfidence
}

export type TemplateFamilyExtractionSummary = {
  enabled: boolean
  familyCount: number
  assignedRouteCount: number
  singletonFamilyCount: number
  mixedFamilyCount: number
  listingDetailRelationshipCount: number
  highConfidenceFamilyCount: number
  diagnostics: string[]
}

export type SiteTemplateFamilyExtraction = {
  siteId: string
  sourceTreeId?: string | null
  familyCount: number
  families: TemplateFamily[]
  routeAssignments: TemplateFamilyAssignment[]
  relationships: TemplateFamilyRelationship[]
  diagnostics: string[]
}

export type SiteTemplateFamilyExtractionInput = {
  siteId: string
  sourceTreeId?: string | null
  routes: TemplateFamilyRouteNode[]
  sharedRegions: TemplateFamilySharedRegionCandidate[]
  routeSignals: RouteTemplateSignals[]
}

export type RouteTemplateProfile = {
  routeId: string
  normalizedPath: string
  pageRole: MultipagePageRole
  sectionRoleSequence: string[]
  layoutPatternSequence: string[]
  headingPatternSequence: string[]
  headingDensityBucket: 'none' | 'low' | 'medium' | 'high'
  routePrefix: string
  sharedRegionIds: string[]
}
