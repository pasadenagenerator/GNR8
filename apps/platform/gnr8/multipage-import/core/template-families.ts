import {
  extractSiteTemplateFamilies,
  toLegacyPageRelationships,
  toLegacyRouteFamilies,
  type RouteTemplateSignals,
  type SiteTemplateFamilyExtraction,
} from '@/gnr8/template-families'

import type { PageRelationship, RouteFamily, RouteNode, SharedRegionCandidate } from '../types/contracts'

export type InferRouteFamiliesInput = {
  siteId: string
  sourceTreeId?: string | null
  routes: RouteNode[]
  sharedRegions: SharedRegionCandidate[]
  routeSignals: RouteTemplateSignals[]
}

export type InferRouteFamiliesResult = {
  routeFamilies: RouteFamily[]
  pageRelationships: PageRelationship[]
  templateFamilyExtraction: SiteTemplateFamilyExtraction
}

export function inferRouteFamilies(input: InferRouteFamiliesInput): InferRouteFamiliesResult {
  const extraction = extractSiteTemplateFamilies({
    siteId: input.siteId,
    sourceTreeId: input.sourceTreeId ?? null,
    routes: input.routes,
    sharedRegions: input.sharedRegions,
    routeSignals: input.routeSignals,
  })

  return {
    routeFamilies: toLegacyRouteFamilies(extraction),
    pageRelationships: toLegacyPageRelationships(extraction),
    templateFamilyExtraction: extraction,
  }
}
