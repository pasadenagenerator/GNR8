import { normalizeRoutePath } from '@/gnr8/site-tree'
import { classifyPageFamilyType, inferRouteGroup } from '@/gnr8/family-mode/core/family-classifier'
import type {
  FamilyHandoffModel,
  FamilyModeBuildInput,
  FamilyModePageSectionSignal,
  PageFamilyMapping,
  SectionPattern,
  TemplateFamiliesSummary,
  TemplateFamily,
  TemplateFamilyDiagnostic,
  TemplateFamilyDiagnosticCode,
  TemplateFamilyDiagnosticSeverity,
  TemplateFamilyType,
} from '@/gnr8/family-mode/types/template-family-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizePatternKind(value: unknown): string {
  const normalized = normalizeText(value).toLowerCase()
  if (!normalized) return 'unknown'
  if (normalized === 'header' || normalized === 'navigation') return 'text_block'
  if (normalized === 'about' || normalized === 'services' || normalized === 'features' || normalized === 'testimonials' || normalized === 'faq') {
    return 'text_block'
  }
  if (normalized === 'contact') return 'cta'
  if (normalized === 'gallery' || normalized === 'grid' || normalized === 'cards') return 'grid'
  if (normalized === 'hero' || normalized === 'cta' || normalized === 'text_block' || normalized === 'image' || normalized === 'unknown') return normalized
  return 'unknown'
}

function createDiagnostic(input: {
  code: TemplateFamilyDiagnosticCode | string
  message: string
  severity?: TemplateFamilyDiagnosticSeverity
  metadata?: Record<string, unknown>
}): TemplateFamilyDiagnostic {
  return {
    code: input.code,
    severity: input.severity ?? 'info',
    message: input.message,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  }
}

function sortDiagnostics(diagnostics: TemplateFamilyDiagnostic[]): TemplateFamilyDiagnostic[] {
  return diagnostics.slice().sort((left, right) => {
    const codeDelta = String(left.code).localeCompare(String(right.code))
    if (codeDelta !== 0) return codeDelta
    const severityDelta = left.severity.localeCompare(right.severity)
    if (severityDelta !== 0) return severityDelta
    const messageDelta = left.message.localeCompare(right.message)
    if (messageDelta !== 0) return messageDelta
    const leftMeta = JSON.stringify(left.metadata ?? {})
    const rightMeta = JSON.stringify(right.metadata ?? {})
    return leftMeta.localeCompare(rightMeta)
  })
}

function sortMappings(mappings: PageFamilyMapping[]): PageFamilyMapping[] {
  return mappings.slice().sort((left, right) => {
    const familyDelta = left.familyId.localeCompare(right.familyId)
    if (familyDelta !== 0) return familyDelta
    return left.pageId.localeCompare(right.pageId)
  })
}

function inferFamilySectionPattern(pagePatterns: SectionPattern[][]): SectionPattern[] {
  const nonEmpty = pagePatterns.filter((pattern) => pattern.length > 0)
  if (!nonEmpty.length) return []

  const maxLength = nonEmpty.reduce((max, pattern) => Math.max(max, pattern.length), 0)
  const out: SectionPattern[] = []

  for (let order = 0; order < maxLength; order += 1) {
    const counts = new Map<string, number>()
    for (const pattern of nonEmpty) {
      const kind = normalizePatternKind(pattern[order]?.kind)
      if (!kind) continue
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    if (counts.size === 0) continue

    const winningKind = [...counts.entries()]
      .sort((left, right) => {
        const countDelta = right[1] - left[1]
        if (countDelta !== 0) return countDelta
        return left[0].localeCompare(right[0])
      })[0]?.[0]

    if (!winningKind) continue
    out.push({ kind: winningKind, order })
  }

  return out
}

function sanitizeFamilySegment(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return sanitized || 'misc'
}

function deterministicFamilyId(familyType: TemplateFamilyType, routeGroup: string): string {
  return `family_${sanitizeFamilySegment(familyType)}_${sanitizeFamilySegment(routeGroup)}`
}

function normalizeSectionPattern(sections: FamilyModePageSectionSignal[]): SectionPattern[] {
  return sections
    .slice()
    .sort((left, right) => left.order - right.order || left.kind.localeCompare(right.kind))
    .map((section, index) => ({
      kind: normalizePatternKind(section.kind),
      order: Number.isFinite(section.order) ? Math.max(0, Math.floor(section.order)) : index,
    }))
}

export function buildFamilyHandoffModel(input: FamilyModeBuildInput): FamilyHandoffModel {
  const diagnostics: TemplateFamilyDiagnostic[] = []
  const pageSectionsByPath = input.pageSectionsByPath ?? {}
  const familyBuckets = new Map<
    string,
    {
      familyType: TemplateFamilyType
      routeGroup: string
      pageIds: string[]
      pagePatterns: SectionPattern[][]
      pageNormalizedPaths: string[]
      headerShared: boolean
      footerShared: boolean
      diagnostics: TemplateFamilyDiagnostic[]
    }
  >()
  const pageMappings: PageFamilyMapping[] = []
  let orphanPageCount = 0

  diagnostics.push(
    createDiagnostic({
      code: 'FAMILY_MODE_INITIALIZED',
      message: 'Initialized deterministic family-mode extraction.',
      metadata: { siteId: input.siteId, pageCount: input.siteTree.pages.length },
    }),
  )

  for (const page of input.siteTree.pages.slice().sort((left, right) => left.normalizedPath.localeCompare(right.normalizedPath))) {
    const normalizedPath = normalizeRoutePath(page.normalizedPath || '/')
    const rawSections = Array.isArray(pageSectionsByPath[normalizedPath]) ? pageSectionsByPath[normalizedPath]! : []
    const sections = normalizeSectionPattern(rawSections)
    const classified = classifyPageFamilyType({
      normalizedPath,
      sections: rawSections,
    })
    const routeGroup = inferRouteGroup(normalizedPath, classified.familyType)
    const familyId = deterministicFamilyId(classified.familyType, routeGroup)

    diagnostics.push(
      createDiagnostic({
        code: 'FAMILY_CLASSIFIED',
        message: 'Page classified into deterministic family type.',
        metadata: {
          pageId: page.pageId,
          normalizedPath,
          familyType: classified.familyType,
          assignmentReason: classified.reason,
        },
      }),
    )

    if (classified.ambiguous) {
      diagnostics.push(
        createDiagnostic({
          code: 'FAMILY_PAGE_AMBIGUOUS_ASSIGNMENT',
          severity: 'warning',
          message: 'Page classification is ambiguous; path classification was preferred.',
          metadata: {
            pageId: page.pageId,
            normalizedPath,
            assignmentReason: classified.reason,
          },
        }),
      )
    }

    if (classified.familyType === 'unknown') {
      orphanPageCount += 1
      diagnostics.push(
        createDiagnostic({
          code: 'FAMILY_ORPHAN_PAGE',
          severity: 'warning',
          message: 'Page assigned to unknown fallback family.',
          metadata: { pageId: page.pageId, normalizedPath },
        }),
      )
    }

    if (!familyBuckets.has(familyId)) {
      familyBuckets.set(familyId, {
        familyType: classified.familyType,
        routeGroup,
        pageIds: [],
        pagePatterns: [],
        pageNormalizedPaths: [],
        headerShared: true,
        footerShared: true,
        diagnostics: [
          createDiagnostic({
            code: 'FAMILY_CREATED',
            message: 'Template family bucket created.',
            metadata: {
              familyId,
              familyType: classified.familyType,
              routeGroup,
            },
          }),
        ],
      })
    }

    const bucket = familyBuckets.get(familyId)!
    bucket.pageIds.push(page.pageId)
    bucket.pagePatterns.push(sections)
    bucket.pageNormalizedPaths.push(normalizedPath)
    bucket.headerShared = bucket.headerShared && Boolean(page.sharedLayoutHints?.headerLikelyShared)
    bucket.footerShared = bucket.footerShared && Boolean(page.sharedLayoutHints?.footerLikelyShared)
    bucket.diagnostics.push(
      createDiagnostic({
        code: 'FAMILY_PAGE_ASSIGNED',
        message: 'Page assigned to template family.',
        metadata: {
          familyId,
          pageId: page.pageId,
          normalizedPath,
          assignmentReason: classified.reason,
        },
      }),
    )

    pageMappings.push({
      pageId: page.pageId,
      familyId,
      assignmentReason: classified.reason,
    })
  }

  const families: TemplateFamily[] = [...familyBuckets.entries()]
    .map(([familyId, bucket]) => {
      const sectionPattern = inferFamilySectionPattern(bucket.pagePatterns)
      if (sectionPattern.length > 0) {
        bucket.diagnostics.push(
          createDiagnostic({
            code: 'FAMILY_PATTERN_INFERRED',
            message: 'Family section pattern inferred from available pages.',
            metadata: {
              familyId,
              patternLength: sectionPattern.length,
            },
          }),
        )
      } else {
        bucket.diagnostics.push(
          createDiagnostic({
            code: 'FAMILY_PATTERN_EMPTY',
            severity: 'warning',
            message: 'Family section pattern is empty.',
            metadata: {
              familyId,
            },
          }),
        )
      }

      const pageIds = bucket.pageIds.slice().sort((a, b) => a.localeCompare(b))
      return {
        familyId,
        familyType: bucket.familyType,
        pageIds,
        sharedLayout: {
          ...(bucket.headerShared ? { header: { refId: 'layout_header_shared_v1', source: 'site_tree_hint' as const } } : {}),
          ...(bucket.footerShared ? { footer: { refId: 'layout_footer_shared_v1', source: 'site_tree_hint' as const } } : {}),
        },
        sectionPattern,
        diagnostics: sortDiagnostics(bucket.diagnostics),
      }
    })
    .sort((left, right) => left.familyId.localeCompare(right.familyId))

  diagnostics.push(
    createDiagnostic({
      code: 'FAMILY_BUILD_COMPLETED',
      message: 'Family-mode model build completed.',
      metadata: {
        familyCount: families.length,
        pageMappingCount: pageMappings.length,
        orphanPageCount,
      },
    }),
  )

  return {
    siteId: input.siteId,
    families,
    pageMappings: sortMappings(pageMappings),
    summary: {
      familyCount: families.length,
      largestFamilySize: families.reduce((max, family) => Math.max(max, family.pageIds.length), 0),
      orphanPageCount,
    },
    diagnostics: sortDiagnostics(diagnostics),
  }
}

export function summarizeTemplateFamilies(model: FamilyHandoffModel, payloadPath?: string | null): TemplateFamiliesSummary {
  return {
    familyCount: model.summary.familyCount,
    largestFamilySize: model.summary.largestFamilySize,
    orphanPageCount: model.summary.orphanPageCount,
    diagnostics: [...new Set(model.diagnostics.map((diag) => normalizeText(diag.code)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    payloadPath: payloadPath ?? null,
  }
}

