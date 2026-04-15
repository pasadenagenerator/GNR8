import type { FinalPageModel, FinalSectionModel } from '@/gnr8/merge-engine'
import type { FamilyHandoffModel, TemplateFamilyType } from '@/gnr8/family-mode'

export type FamilyRenderMode = 'family_primary' | 'page_fallback' | 'hybrid_family_page'

export type FamilyRenderDiagnosticSeverity = 'info' | 'warning' | 'error'

export type FamilyRenderDiagnosticCode =
  | 'FAMILY_RENDER_MODE_SELECTED'
  | 'FAMILY_RENDER_MODEL_BUILT'
  | 'FAMILY_RENDER_PAGE_INSTANCE_DERIVED'
  | 'FAMILY_RENDER_DEGRADED_TO_PAGE'
  | 'FAMILY_RENDER_NO_FAMILY_MAPPING'
  | 'FAMILY_RENDER_SHARED_STRUCTURE_WEAK'
  | 'FAMILY_RENDER_SINGLETON_FAMILY'
  | 'FAMILY_RENDER_INSTANCE_OVERRIDE_APPLIED'
  | 'FAMILY_RENDER_AMBIGUOUS_STRUCTURE'
  | 'FAMILY_RENDER_ORPHAN_PAGE'
  | 'FAMILY_RENDER_FAMILY_UNUSABLE'

export type FamilyRenderDiagnostics = {
  code: FamilyRenderDiagnosticCode | string
  severity: FamilyRenderDiagnosticSeverity
  detail: string
  familyId?: string | null
  pageId?: string | null
  metadata?: Record<string, unknown>
}

export type FamilyRenderLayoutHints = {
  headerShared: boolean
  footerShared: boolean
}

export type FamilyRenderComponent = {
  componentPatternId: string
  sectionPatternId: string
  kind: FinalSectionModel['components'][number]['kind']
  order: number
  shared: boolean
  confidence: 'low' | 'medium' | 'high'
}

export type FamilyRenderSection = {
  sectionPatternId: string
  semanticRole: FinalSectionModel['semanticRole']
  layoutRole: string
  order: number
  shared: boolean
  confidence: 'low' | 'medium' | 'high'
  ambiguityReason: string | null
}

export type FamilyRenderSharedStructure = {
  layoutHints: FamilyRenderLayoutHints
  sections: FamilyRenderSection[]
  components: FamilyRenderComponent[]
}

export type FamilyRenderBinding = {
  pageId: string
  familyId: string
  assignmentReason: string
}

export type FamilyRenderPageOverride = {
  pageId: string
  hasExceptionalSections: boolean
  exceptionalSectionIds: string[]
  hasStructureMismatch: boolean
  mismatchOrders: number[]
}

export type FamilyRenderModel = {
  familyId: string
  familyKind: TemplateFamilyType
  baseRouteGroup: string
  representativeRoute: string
  sharedLayoutHints: FamilyRenderLayoutHints
  sharedSectionPatterns: FamilyRenderSection[]
  sharedComponentPatterns: FamilyRenderComponent[]
  memberPages: string[]
  pageOverrides: FamilyRenderPageOverride[]
  fallbackFlags: {
    singletonFamily: boolean
    weakSharedStructure: boolean
    ambiguousStructure: boolean
    unusable: boolean
  }
  provenance: {
    source: 'family_handoff_model'
    handoffModelSiteId: string
  }
  diagnostics: FamilyRenderDiagnostics[]
}

export type FamilyPageInstance = {
  pageId: string
  familyId: string | null
  mode: FamilyRenderMode
  routePath: string
  title: string | null
  seo: FinalPageModel['seo']
  sections: FinalPageModel['sections']
  globalRegionIds: string[]
  provenance: FinalPageModel['provenance']
  fallbackToPage: boolean
  diagnostics: FamilyRenderDiagnostics[]
}

export type FamilyRenderSiteModel = {
  siteId: string
  families: FamilyRenderModel[]
  bindings: FamilyRenderBinding[]
  memberPageCount: number
  unmappedPageIds: string[]
  diagnostics: FamilyRenderDiagnostics[]
}

export type FamilyRenderPreparationResult = {
  siteModel: FamilyRenderSiteModel | null
  pageInstance: FamilyPageInstance | null
  selectedMode: FamilyRenderMode
  selectedFamilyId: string | null
  fallbackToPage: boolean
  diagnostics: FamilyRenderDiagnostics[]
}

export type FamilyRenderBuilderPageInput = {
  pageId: string
  path: string
  title: string | null
  finalPage: FinalPageModel
}

export type FamilyRenderBuilderInput = {
  siteId: string
  familyHandoffModel: FamilyHandoffModel
  pages: FamilyRenderBuilderPageInput[]
}

export type FamilyPageInstanceDeriverInput = {
  familyModel: FamilyRenderModel
  page: FinalPageModel
}
