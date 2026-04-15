import { deterministicId } from '@/gnr8/runtime/deterministic'
import { createFamilyRenderDiagnostic, dedupeAndSortFamilyRenderDiagnostics } from '@/gnr8/renderer-family-mode/diagnostics/family-render-diagnostics'
import type { FinalComponentModel, FinalPageModel, FinalSectionModel } from '@/gnr8/merge-engine'
import type {
  FamilyPageInstance,
  FamilyPageInstanceDeriverInput,
  FamilyRenderComponent,
  FamilyRenderSection,
} from '@/gnr8/renderer-family-mode/types/family-render-types'

function selectSourceSection(page: FinalPageModel, order: number): FinalSectionModel | null {
  const sorted = page.sections.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return sorted.find((section) => section.order === order) ?? null
}

function createFallbackComponent(input: {
  pageId: string
  sectionId: string
  componentPattern: FamilyRenderComponent
}): FinalComponentModel {
  return {
    id: deterministicId('fr_component', `${input.pageId}:${input.sectionId}:${input.componentPattern.componentPatternId}`),
    sectionId: input.sectionId,
    kind: input.componentPattern.kind,
    mappedType: input.componentPattern.kind,
    variant: 'default',
    order: input.componentPattern.order,
    slots: [],
    tokenRefs: [],
    fallback: {
      wrappedAsGeneric: input.componentPattern.kind === 'generic',
      reason: 'family_component_pattern_without_page_match',
      rawMetadata: {
        componentPatternId: input.componentPattern.componentPatternId,
      },
    },
    provenance: {
      source: 'merged',
      sourceId: input.componentPattern.componentPatternId,
      rationale: 'Deterministic family-mode fallback component derived from shared family pattern.',
      confidence: input.componentPattern.confidence === 'high' ? 1 : input.componentPattern.confidence === 'medium' ? 0.8 : 0.6,
    },
  }
}

function buildDerivedSection(input: {
  page: FinalPageModel
  sectionPattern: FamilyRenderSection
  componentPatterns: FamilyRenderComponent[]
  diagnostics: ReturnType<typeof createFamilyRenderDiagnostic>[]
}): FinalSectionModel {
  const sourceSection = selectSourceSection(input.page, input.sectionPattern.order)
  const sectionId = deterministicId('fr_section', `${input.page.id}:${input.sectionPattern.sectionPatternId}`)

  const sourceComponents = sourceSection?.components
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    ?? []

  const usedComponentIds = new Set<string>()
  const derivedComponents: FinalComponentModel[] = input.componentPatterns
    .slice()
    .sort((a, b) => a.order - b.order || a.componentPatternId.localeCompare(b.componentPatternId))
    .map((pattern): FinalComponentModel => {
      const matched = sourceComponents.find((component) => component.kind === pattern.kind && !usedComponentIds.has(component.id))
      if (!matched) {
        input.diagnostics.push(
          createFamilyRenderDiagnostic({
            code: 'FAMILY_RENDER_INSTANCE_OVERRIDE_APPLIED',
            severity: 'warning',
            familyId: null,
            pageId: input.page.id,
            detail: 'Family component pattern had no page match; using deterministic fallback component.',
            metadata: {
              sectionPatternId: input.sectionPattern.sectionPatternId,
              componentPatternId: pattern.componentPatternId,
              componentKind: pattern.kind,
            },
          }),
        )
        return createFallbackComponent({
          pageId: input.page.id,
          sectionId,
          componentPattern: pattern,
        })
      }

      usedComponentIds.add(matched.id)

      return {
        ...matched,
        sectionId,
        order: pattern.order,
        provenance: {
          source: 'merged',
          sourceId: pattern.componentPatternId,
          rationale: 'Page component matched and bound to shared family component pattern.',
          confidence: pattern.confidence === 'high' ? 1 : pattern.confidence === 'medium' ? 0.8 : 0.6,
        },
      }
    })

  const retainedComponentIds = new Set(derivedComponents.map((component) => component.id))
  const contentBindings = (sourceSection?.contentBindings ?? [])
    .filter((binding) => retainedComponentIds.has(binding.componentId))
    .sort((a, b) => a.id.localeCompare(b.id))

  return {
    id: sectionId,
    pageId: input.page.id,
    semanticRole: input.sectionPattern.semanticRole,
    layoutRole: input.sectionPattern.layoutRole,
    order: input.sectionPattern.order,
    components: derivedComponents,
    contentBindings,
    styleRefs: sourceSection?.styleRefs ?? {
      colorTokenIds: [],
      typographyTokenIds: [],
      spacingTokenIds: [],
      gradientIds: [],
    },
    provenance: {
      source: 'merged',
      sourceId: input.sectionPattern.sectionPatternId,
      rationale: 'Page section derived from shared family section pattern with deterministic page-instance binding.',
      confidence: input.sectionPattern.confidence === 'high' ? 1 : input.sectionPattern.confidence === 'medium' ? 0.8 : 0.6,
    },
  }
}

export function deriveFamilyPageInstance(input: FamilyPageInstanceDeriverInput): FamilyPageInstance {
  const diagnostics: ReturnType<typeof createFamilyRenderDiagnostic>[] = []

  if (input.familyModel.fallbackFlags.unusable || input.familyModel.sharedSectionPatterns.length === 0) {
    diagnostics.push(
      createFamilyRenderDiagnostic({
        code: 'FAMILY_RENDER_FAMILY_UNUSABLE',
        severity: 'warning',
        familyId: input.familyModel.familyId,
        pageId: input.page.id,
        detail: 'Family model is unusable for deterministic derivation; returning page fallback instance.',
      }),
    )

    return {
      pageId: input.page.id,
      familyId: input.familyModel.familyId,
      mode: 'page_fallback',
      routePath: input.page.path,
      title: input.page.title,
      seo: input.page.seo,
      sections: input.page.sections,
      globalRegionIds: input.page.globalRegionIds,
      provenance: input.page.provenance,
      fallbackToPage: true,
      diagnostics: dedupeAndSortFamilyRenderDiagnostics(diagnostics),
    }
  }

  const sections = input.familyModel.sharedSectionPatterns
    .slice()
    .sort((a, b) => a.order - b.order || a.sectionPatternId.localeCompare(b.sectionPatternId))
    .map((sectionPattern) =>
      buildDerivedSection({
        page: input.page,
        sectionPattern,
        componentPatterns: input.familyModel.sharedComponentPatterns.filter((component) => component.sectionPatternId === sectionPattern.sectionPatternId),
        diagnostics,
      }),
    )

  const sourceSectionsByOrder = new Set(input.page.sections.map((section) => section.order))
  const coveredOrders = new Set(input.familyModel.sharedSectionPatterns.map((section) => section.order))
  const exceptionalSections = input.page.sections
    .filter((section) => !coveredOrders.has(section.order))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  let mode: FamilyPageInstance['mode'] = 'family_primary'
  if (input.familyModel.fallbackFlags.ambiguousStructure || input.familyModel.fallbackFlags.weakSharedStructure) mode = 'hybrid_family_page'
  if (exceptionalSections.length > 0) {
    diagnostics.push(
      createFamilyRenderDiagnostic({
        code: 'FAMILY_RENDER_INSTANCE_OVERRIDE_APPLIED',
        severity: 'warning',
        familyId: input.familyModel.familyId,
        pageId: input.page.id,
        detail: 'Page contains exceptional sections outside family-shared structure; appended as page overrides.',
        metadata: { exceptionalSectionCount: exceptionalSections.length },
      }),
    )
    mode = 'hybrid_family_page'
  }

  for (const sharedSection of input.familyModel.sharedSectionPatterns) {
    if (sourceSectionsByOrder.has(sharedSection.order)) continue
    diagnostics.push(
      createFamilyRenderDiagnostic({
        code: 'FAMILY_RENDER_INSTANCE_OVERRIDE_APPLIED',
        severity: 'warning',
        familyId: input.familyModel.familyId,
        pageId: input.page.id,
        detail: 'Page is missing a family-shared section order; derived section emitted without source bindings.',
        metadata: { missingOrder: sharedSection.order },
      }),
    )
    mode = 'hybrid_family_page'
  }

  const derivedSections = [...sections, ...exceptionalSections]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((section, index) => ({ ...section, order: index }))

  diagnostics.push(
    createFamilyRenderDiagnostic({
      code: 'FAMILY_RENDER_PAGE_INSTANCE_DERIVED',
      familyId: input.familyModel.familyId,
      pageId: input.page.id,
      detail: 'Page render instance derived from family render model.',
      metadata: {
        mode,
        sharedSectionCount: sections.length,
        exceptionalSectionCount: exceptionalSections.length,
      },
    }),
  )

  return {
    pageId: input.page.id,
    familyId: input.familyModel.familyId,
    mode,
    routePath: input.page.path,
    title: input.page.title,
    seo: input.page.seo,
    sections: derivedSections,
    globalRegionIds: input.page.globalRegionIds,
    provenance: {
      ...input.page.provenance,
      rationale: `Page derived from family render model ${input.familyModel.familyId}.`,
    },
    fallbackToPage: false,
    diagnostics: dedupeAndSortFamilyRenderDiagnostics(diagnostics),
  }
}