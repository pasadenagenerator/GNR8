import { deterministicId, normalizePagePath } from '@/gnr8/runtime/deterministic'
import { dedupeAndSortFamilyRenderDiagnostics, createFamilyRenderDiagnostic } from '@/gnr8/renderer-family-mode/diagnostics/family-render-diagnostics'
import type {
  FamilyRenderBuilderInput,
  FamilyRenderComponent,
  FamilyRenderModel,
  FamilyRenderPageOverride,
  FamilyRenderSection,
  FamilyRenderSiteModel,
} from '@/gnr8/renderer-family-mode/types/family-render-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeRouteGroup(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || 'misc'
}

function routeGroupFromRepresentativeRoute(route: string): string {
  const normalized = normalizePagePath(route)
  if (normalized === '/') return 'root'
  const first = normalized.slice(1).split('/')[0] ?? ''
  return normalizeRouteGroup(first || 'misc')
}

type SectionSignature = {
  semanticRole: string
  layoutRole: string
  componentKinds: string[]
}

function sectionSignature(page: FamilyRenderBuilderInput['pages'][number]): SectionSignature[] {
  return page.finalPage.sections
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((section) => ({
      semanticRole: section.semanticRole,
      layoutRole: section.layoutRole,
      componentKinds: section.components
        .slice()
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map((component) => component.kind),
    }))
}

function confidenceFromCoverage(input: { matchCount: number; totalCount: number }): 'low' | 'medium' | 'high' {
  if (input.totalCount <= 0) return 'low'
  const ratio = input.matchCount / input.totalCount
  if (ratio >= 0.999) return 'high'
  if (ratio >= 0.6) return 'medium'
  return 'low'
}

function buildSharedSections(input: {
  familyId: string
  memberSignatures: Array<{ pageId: string; signature: SectionSignature[] }>
  diagnostics: ReturnType<typeof createFamilyRenderDiagnostic>[]
}): FamilyRenderSection[] {
  const maxLength = input.memberSignatures.reduce((max, entry) => Math.max(max, entry.signature.length), 0)
  const out: FamilyRenderSection[] = []

  for (let order = 0; order < maxLength; order += 1) {
    const roleCounts = new Map<string, number>()
    const layoutCounts = new Map<string, number>()
    let coverageCount = 0

    for (const member of input.memberSignatures) {
      const section = member.signature[order]
      if (!section) continue
      coverageCount += 1
      roleCounts.set(section.semanticRole, (roleCounts.get(section.semanticRole) ?? 0) + 1)
      layoutCounts.set(section.layoutRole, (layoutCounts.get(section.layoutRole) ?? 0) + 1)
    }

    if (coverageCount === 0) continue

    const dominantRole = [...roleCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    const dominantLayout = [...layoutCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    if (!dominantRole || !dominantLayout) continue

    const dominantCount = Math.min(dominantRole[1], dominantLayout[1])
    const confidence = confidenceFromCoverage({
      matchCount: dominantCount,
      totalCount: input.memberSignatures.length,
    })
    const shared = dominantCount === input.memberSignatures.length && coverageCount === input.memberSignatures.length
    const ambiguityReason = shared ? null : 'section_pattern_not_consistent_across_family_members'

    if (!shared) {
      input.diagnostics.push(
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_AMBIGUOUS_STRUCTURE',
          severity: 'warning',
          familyId: input.familyId,
          detail: 'Family section pattern differs across members; hybrid derivation may be required.',
          metadata: { order, coverageCount, totalMembers: input.memberSignatures.length },
        }),
      )
    }

    out.push({
      sectionPatternId: deterministicId('fr_section_pattern', `${input.familyId}:${order}`),
      semanticRole: dominantRole[0] as FamilyRenderSection['semanticRole'],
      layoutRole: dominantLayout[0],
      order,
      shared,
      confidence,
      ambiguityReason,
    })
  }

  return out.sort((a, b) => a.order - b.order || a.sectionPatternId.localeCompare(b.sectionPatternId))
}

function buildSharedComponents(input: {
  familyId: string
  memberSignatures: Array<{ pageId: string; signature: SectionSignature[] }>
  sections: FamilyRenderSection[]
}): FamilyRenderComponent[] {
  const out: FamilyRenderComponent[] = []
  for (const sectionPattern of input.sections) {
    const counts = new Map<string, number>()
    let coverageCount = 0

    for (const member of input.memberSignatures) {
      const componentKinds = member.signature[sectionPattern.order]?.componentKinds
      if (!Array.isArray(componentKinds)) continue
      coverageCount += 1
      for (let i = 0; i < componentKinds.length; i += 1) {
        const key = `${i}:${componentKinds[i]}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }

    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    for (const [key, count] of ranked) {
      const [orderRaw, kindRaw] = key.split(':')
      const order = Number(orderRaw)
      if (!Number.isFinite(order) || !kindRaw) continue
      const confidence = confidenceFromCoverage({
        matchCount: count,
        totalCount: input.memberSignatures.length,
      })
      if (confidence === 'low' && coverageCount < 2) continue
      out.push({
        componentPatternId: deterministicId('fr_component_pattern', `${sectionPattern.sectionPatternId}:${order}:${kindRaw}`),
        sectionPatternId: sectionPattern.sectionPatternId,
        kind: kindRaw as FamilyRenderComponent['kind'],
        order,
        shared: count === input.memberSignatures.length,
        confidence,
      })
    }
  }

  return out.sort((a, b) => {
    const sectionDelta = a.sectionPatternId.localeCompare(b.sectionPatternId)
    if (sectionDelta !== 0) return sectionDelta
    const orderDelta = a.order - b.order
    if (orderDelta !== 0) return orderDelta
    return a.componentPatternId.localeCompare(b.componentPatternId)
  })
}

function buildPageOverrides(input: {
  memberPages: FamilyRenderBuilderInput['pages']
  sharedSections: FamilyRenderSection[]
}): FamilyRenderPageOverride[] {
  return input.memberPages
    .map((page) => {
      const sections = page.finalPage.sections.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      const sharedOrders = new Set(input.sharedSections.map((section) => section.order))
      const mismatchOrders: number[] = []

      for (const section of input.sharedSections) {
        const pageSection = sections.find((entry) => entry.order === section.order)
        if (!pageSection) {
          mismatchOrders.push(section.order)
          continue
        }
        if (pageSection.semanticRole !== section.semanticRole || pageSection.layoutRole !== section.layoutRole) mismatchOrders.push(section.order)
      }

      const exceptional = sections.filter((section) => !sharedOrders.has(section.order)).map((section) => section.id)
      return {
        pageId: page.pageId,
        hasExceptionalSections: exceptional.length > 0,
        exceptionalSectionIds: exceptional.sort((a, b) => a.localeCompare(b)),
        hasStructureMismatch: mismatchOrders.length > 0,
        mismatchOrders: mismatchOrders.sort((a, b) => a - b),
      }
    })
    .sort((a, b) => a.pageId.localeCompare(b.pageId))
}

export function buildFamilyRenderSiteModel(input: FamilyRenderBuilderInput): FamilyRenderSiteModel {
  const pagesById = new Map(input.pages.map((page) => [page.pageId, page]))
  const mappings = input.familyHandoffModel.pageMappings
    .slice()
    .sort((a, b) => a.familyId.localeCompare(b.familyId) || a.pageId.localeCompare(b.pageId))

  const diagnostics: ReturnType<typeof createFamilyRenderDiagnostic>[] = []
  const families: FamilyRenderModel[] = []
  const mappedPageIds = new Set<string>()

  for (const family of input.familyHandoffModel.families.slice().sort((a, b) => a.familyId.localeCompare(b.familyId))) {
    const memberMappings = mappings.filter((mapping) => mapping.familyId === family.familyId)
    const memberPages = memberMappings
      .map((mapping) => pagesById.get(mapping.pageId) ?? null)
      .filter((page): page is NonNullable<typeof page> => page != null)
      .sort((a, b) => normalizePagePath(a.path).localeCompare(normalizePagePath(b.path)) || a.pageId.localeCompare(b.pageId))

    for (const page of memberPages) mappedPageIds.add(page.pageId)

    const familyDiagnostics: ReturnType<typeof createFamilyRenderDiagnostic>[] = []
    if (memberPages.length <= 1) {
      familyDiagnostics.push(
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_SINGLETON_FAMILY',
          severity: 'warning',
          familyId: family.familyId,
          detail: 'Family has a single member page; shared structure confidence is weak.',
          metadata: { memberCount: memberPages.length },
        }),
      )
    }

    const signatures = memberPages.map((page) => ({ pageId: page.pageId, signature: sectionSignature(page) }))
    const sharedSections = buildSharedSections({
      familyId: family.familyId,
      memberSignatures: signatures,
      diagnostics: familyDiagnostics,
    })
    const sharedComponents = buildSharedComponents({
      familyId: family.familyId,
      memberSignatures: signatures,
      sections: sharedSections,
    })

    const weakSharedStructure = sharedSections.length === 0 || sharedSections.every((section) => section.confidence === 'low')
    if (weakSharedStructure) {
      familyDiagnostics.push(
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_SHARED_STRUCTURE_WEAK',
          severity: 'warning',
          familyId: family.familyId,
          detail: 'Family shared structure is weak; renderer may degrade to page fallback.',
          metadata: { sectionPatternCount: sharedSections.length },
        }),
      )
    }

    const pageOverrides = buildPageOverrides({
      memberPages,
      sharedSections,
    })

    const representativeRoute = memberPages[0] ? normalizePagePath(memberPages[0].path) : '/'
    const baseRouteGroup = routeGroupFromRepresentativeRoute(representativeRoute)
    const ambiguousStructure = familyDiagnostics.some((entry) => entry.code === 'FAMILY_RENDER_AMBIGUOUS_STRUCTURE')
    const unusable = weakSharedStructure && memberPages.length > 0

    const model: FamilyRenderModel = {
      familyId: family.familyId,
      familyKind: family.familyType,
      baseRouteGroup,
      representativeRoute,
      sharedLayoutHints: {
        headerShared: Boolean(family.sharedLayout.header),
        footerShared: Boolean(family.sharedLayout.footer),
      },
      sharedSectionPatterns: sharedSections,
      sharedComponentPatterns: sharedComponents,
      memberPages: memberPages.map((page) => page.pageId).sort((a, b) => a.localeCompare(b)),
      pageOverrides,
      fallbackFlags: {
        singletonFamily: memberPages.length <= 1,
        weakSharedStructure,
        ambiguousStructure,
        unusable,
      },
      provenance: {
        source: 'family_handoff_model',
        handoffModelSiteId: input.familyHandoffModel.siteId,
      },
      diagnostics: dedupeAndSortFamilyRenderDiagnostics([
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_MODEL_BUILT',
          familyId: family.familyId,
          detail: 'Family render model built from deterministic family handoff truth.',
          metadata: {
            memberPageCount: memberPages.length,
            sharedSectionPatternCount: sharedSections.length,
            sharedComponentPatternCount: sharedComponents.length,
            weakSharedStructure,
            ambiguousStructure,
            unusable,
          },
        }),
        ...familyDiagnostics,
      ]),
    }

    families.push(model)
    diagnostics.push(...model.diagnostics)
  }

  const unmappedPageIds = input.pages
    .filter((page) => !mappedPageIds.has(page.pageId))
    .map((page) => page.pageId)
    .sort((a, b) => a.localeCompare(b))

  for (const pageId of unmappedPageIds) {
    diagnostics.push(
      createFamilyRenderDiagnostic({
        code: 'FAMILY_RENDER_ORPHAN_PAGE',
        severity: 'warning',
        pageId,
        detail: 'Page has no family mapping and will remain in page fallback mode.',
      }),
    )
  }

  return {
    siteId: input.siteId,
    families: families.sort((a, b) => a.familyId.localeCompare(b.familyId)),
    bindings: mappings.map((mapping) => ({
      pageId: mapping.pageId,
      familyId: mapping.familyId,
      assignmentReason: normalizeText(mapping.assignmentReason) || 'family_mapping',
    })),
    memberPageCount: mappedPageIds.size,
    unmappedPageIds,
    diagnostics: dedupeAndSortFamilyRenderDiagnostics(diagnostics),
  }
}
