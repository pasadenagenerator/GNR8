import { normalizePagePath } from '@/gnr8/runtime/deterministic'
import { createFamilyRenderDiagnostic, dedupeAndSortFamilyRenderDiagnostics } from '@/gnr8/renderer-family-mode/diagnostics/family-render-diagnostics'
import { buildFamilyRenderSiteModel } from '@/gnr8/renderer-family-mode/core/family-render-builder'
import { deriveFamilyPageInstance } from '@/gnr8/renderer-family-mode/core/family-page-instance-deriver'
import type { FinalSiteModel } from '@/gnr8/merge-engine'
import type { FamilyHandoffModel } from '@/gnr8/family-mode'
import type { FamilyRenderPreparationResult } from '@/gnr8/renderer-family-mode/types/family-render-types'

export function prepareFamilyRenderForRoute(input: {
  siteId: string
  routePath: string
  finalSiteModel: FinalSiteModel
  familyHandoffModel: FamilyHandoffModel | null | undefined
}): FamilyRenderPreparationResult {
  const fallbackDiagnostics = dedupeAndSortFamilyRenderDiagnostics([
    createFamilyRenderDiagnostic({
      code: 'FAMILY_RENDER_DEGRADED_TO_PAGE',
      detail: 'Family render mode degraded to page fallback.',
      severity: 'warning',
    }),
  ])

  const normalizedRoutePath = normalizePagePath(input.routePath)
  const targetPage = input.finalSiteModel.pages.find((page) => normalizePagePath(page.path) === normalizedRoutePath) ?? null
  if (!targetPage) {
    return {
      siteModel: null,
      pageInstance: null,
      selectedMode: 'page_fallback',
      selectedFamilyId: null,
      fallbackToPage: true,
      diagnostics: dedupeAndSortFamilyRenderDiagnostics([
        ...fallbackDiagnostics,
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_NO_FAMILY_MAPPING',
          detail: 'No page matched requested route path for family derivation.',
          severity: 'warning',
          metadata: { routePath: normalizedRoutePath },
        }),
      ]),
    }
  }

  if (!input.familyHandoffModel) {
    return {
      siteModel: null,
      pageInstance: null,
      selectedMode: 'page_fallback',
      selectedFamilyId: null,
      fallbackToPage: true,
      diagnostics: dedupeAndSortFamilyRenderDiagnostics([
        ...fallbackDiagnostics,
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_NO_FAMILY_MAPPING',
          detail: 'No family handoff model was available in provenance.',
          severity: 'warning',
          pageId: targetPage.id,
        }),
      ]),
    }
  }

  const siteModel = buildFamilyRenderSiteModel({
    siteId: input.siteId,
    familyHandoffModel: input.familyHandoffModel,
    pages: input.finalSiteModel.pages.map((page) => ({
      pageId: page.id,
      path: page.path,
      title: page.title,
      finalPage: page,
    })),
  })

  const binding = siteModel.bindings.find((candidate) => candidate.pageId === targetPage.id) ?? null
  if (!binding) {
    return {
      siteModel,
      pageInstance: null,
      selectedMode: 'page_fallback',
      selectedFamilyId: null,
      fallbackToPage: true,
      diagnostics: dedupeAndSortFamilyRenderDiagnostics([
        ...siteModel.diagnostics,
        ...fallbackDiagnostics,
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_NO_FAMILY_MAPPING',
          detail: 'Page has no family mapping in family handoff model.',
          severity: 'warning',
          pageId: targetPage.id,
        }),
      ]),
    }
  }

  const familyModel = siteModel.families.find((family) => family.familyId === binding.familyId) ?? null
  if (!familyModel) {
    return {
      siteModel,
      pageInstance: null,
      selectedMode: 'page_fallback',
      selectedFamilyId: binding.familyId,
      fallbackToPage: true,
      diagnostics: dedupeAndSortFamilyRenderDiagnostics([
        ...siteModel.diagnostics,
        ...fallbackDiagnostics,
        createFamilyRenderDiagnostic({
          code: 'FAMILY_RENDER_NO_FAMILY_MAPPING',
          detail: 'Family mapping exists but family render model was missing.',
          severity: 'warning',
          familyId: binding.familyId,
          pageId: targetPage.id,
        }),
      ]),
    }
  }

  const pageInstance = deriveFamilyPageInstance({
    familyModel,
    page: targetPage,
  })

  const selectedMode = pageInstance.mode
  const selectedFamilyId = familyModel.familyId
  const fallbackToPage = pageInstance.mode === 'page_fallback' || pageInstance.fallbackToPage
  const selectionDiagnosticCode = fallbackToPage ? 'FAMILY_RENDER_DEGRADED_TO_PAGE' : 'FAMILY_RENDER_MODE_SELECTED'

  const diagnostics = dedupeAndSortFamilyRenderDiagnostics([
    ...siteModel.diagnostics,
    ...familyModel.diagnostics,
    ...pageInstance.diagnostics,
    createFamilyRenderDiagnostic({
      code: selectionDiagnosticCode,
      detail: fallbackToPage
        ? 'Family rendering degraded to page fallback for selected route.'
        : 'Family rendering selected for the requested route.',
      severity: fallbackToPage ? 'warning' : 'info',
      familyId: selectedFamilyId,
      pageId: targetPage.id,
      metadata: {
        mode: selectedMode,
      },
    }),
  ])

  return {
    siteModel,
    pageInstance,
    selectedMode,
    selectedFamilyId,
    fallbackToPage,
    diagnostics,
  }
}
