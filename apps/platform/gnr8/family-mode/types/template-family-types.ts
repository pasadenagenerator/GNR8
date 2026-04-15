import type { SiteTree } from '@/gnr8/site-tree'

export type TemplateFamilyType = 'marketing' | 'listing' | 'detail' | 'utility' | 'unknown'

export type LayoutBlockRef = {
  refId: string
  source: 'site_tree_hint'
}

export type SectionPattern = {
  kind: string
  order: number
}

export type TemplateFamilyDiagnosticSeverity = 'info' | 'warning' | 'error'

export type TemplateFamilyDiagnosticCode =
  | 'FAMILY_MODE_INITIALIZED'
  | 'FAMILY_CREATED'
  | 'FAMILY_CLASSIFIED'
  | 'FAMILY_PAGE_ASSIGNED'
  | 'FAMILY_PAGE_AMBIGUOUS_ASSIGNMENT'
  | 'FAMILY_ORPHAN_PAGE'
  | 'FAMILY_PATTERN_INFERRED'
  | 'FAMILY_PATTERN_EMPTY'
  | 'FAMILY_BUILD_COMPLETED'

export type TemplateFamilyDiagnostic = {
  code: TemplateFamilyDiagnosticCode | string
  severity: TemplateFamilyDiagnosticSeverity
  message: string
  metadata?: Record<string, unknown>
}

export type TemplateFamily = {
  familyId: string
  familyType: TemplateFamilyType
  pageIds: string[]
  sharedLayout: {
    header?: LayoutBlockRef
    footer?: LayoutBlockRef
  }
  sectionPattern: SectionPattern[]
  diagnostics: TemplateFamilyDiagnostic[]
}

export type PageFamilyMapping = {
  pageId: string
  familyId: string
  assignmentReason: string
}

export type FamilyHandoffModel = {
  siteId: string
  families: TemplateFamily[]
  pageMappings: PageFamilyMapping[]
  summary: {
    familyCount: number
    largestFamilySize: number
    orphanPageCount: number
  }
  diagnostics: TemplateFamilyDiagnostic[]
}

export type FamilyModePageSectionSignal = {
  kind: string
  order: number
  layoutKind?: string
  hasCardCluster?: boolean
}

export type FamilyModeBuildInput = {
  siteId: string
  siteTree: SiteTree
  pageSectionsByPath?: Record<string, FamilyModePageSectionSignal[]>
}

export type TemplateFamiliesSummary = {
  familyCount: number
  largestFamilySize: number
  orphanPageCount: number
  diagnostics: string[]
  payloadPath?: string | null
}
