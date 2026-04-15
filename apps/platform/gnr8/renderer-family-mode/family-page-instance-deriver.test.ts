import assert from 'node:assert/strict'
import test from 'node:test'

import type { FamilyRenderModel } from '@/gnr8/renderer-family-mode'
import type { FinalPageModel, FinalSiteModel } from '@/gnr8/merge-engine'
import {
  applyFamilyPageInstanceToFinalSiteModel,
  deriveFamilyPageInstance,
  prepareFamilyRenderForRoute,
} from '@/gnr8/renderer-family-mode'

function makeComponent(input: {
  id: string
  sectionId: string
  kind: FinalPageModel['sections'][number]['components'][number]['kind']
  order: number
}): FinalPageModel['sections'][number]['components'][number] {
  return {
    id: input.id,
    sectionId: input.sectionId,
    kind: input.kind,
    mappedType: input.kind,
    variant: 'default',
    order: input.order,
    slots: [{ key: 'heading', valueType: 'text', sourceHint: 'test' }],
    tokenRefs: [],
    fallback: { wrappedAsGeneric: false, reason: null, rawMetadata: null },
    provenance: { source: 'merged', sourceId: input.id, rationale: 'test', confidence: 1 },
  }
}

function makePage(input: { id: string; path: string; title?: string; includeExceptional?: boolean }): FinalPageModel {
  const sections: FinalPageModel['sections'] = [
    {
      id: `${input.id}_s0`,
      pageId: input.id,
      semanticRole: 'hero',
      layoutRole: 'hero',
      order: 0,
      components: [makeComponent({ id: `${input.id}_c0`, sectionId: `${input.id}_s0`, kind: 'hero', order: 0 })],
      contentBindings: [
        {
          id: `${input.id}_b0`,
          componentId: `${input.id}_c0`,
          sectionId: `${input.id}_s0`,
          slotPath: `${input.id}_c0.heading`,
          contentId: `${input.id}_content_hero`,
          confidence: 1,
          source: 'heuristic',
        },
      ],
      styleRefs: { colorTokenIds: [], typographyTokenIds: [], spacingTokenIds: [], gradientIds: [] },
      provenance: { source: 'merged', sourceId: `${input.id}_s0`, rationale: 'test', confidence: 1 },
    },
    {
      id: `${input.id}_s1`,
      pageId: input.id,
      semanticRole: 'content',
      layoutRole: 'stack',
      order: 1,
      components: [makeComponent({ id: `${input.id}_c1`, sectionId: `${input.id}_s1`, kind: 'rich_text', order: 0 })],
      contentBindings: [
        {
          id: `${input.id}_b1`,
          componentId: `${input.id}_c1`,
          sectionId: `${input.id}_s1`,
          slotPath: `${input.id}_c1.heading`,
          contentId: `${input.id}_content_body`,
          confidence: 1,
          source: 'heuristic',
        },
      ],
      styleRefs: { colorTokenIds: [], typographyTokenIds: [], spacingTokenIds: [], gradientIds: [] },
      provenance: { source: 'merged', sourceId: `${input.id}_s1`, rationale: 'test', confidence: 1 },
    },
  ]

  if (input.includeExceptional) {
    sections.push({
      id: `${input.id}_s2`,
      pageId: input.id,
      semanticRole: 'content',
      layoutRole: 'stack',
      order: 2,
      components: [makeComponent({ id: `${input.id}_c2`, sectionId: `${input.id}_s2`, kind: 'faq', order: 0 })],
      contentBindings: [],
      styleRefs: { colorTokenIds: [], typographyTokenIds: [], spacingTokenIds: [], gradientIds: [] },
      provenance: { source: 'merged', sourceId: `${input.id}_s2`, rationale: 'test', confidence: 1 },
    })
  }

  return {
    id: input.id,
    path: input.path,
    role: input.path === '/' ? 'home' : 'content',
    title: input.title ?? input.id,
    routeNodeId: `route_${input.id}`,
    seo: { titleContentIds: [], descriptionContentIds: [] },
    sections,
    globalRegionIds: [],
    provenance: { source: 'merged', sourceId: input.id, rationale: 'test', confidence: 1 },
  }
}

function makeFamilyModel(): FamilyRenderModel {
  return {
    familyId: 'family_marketing_root',
    familyKind: 'marketing',
    baseRouteGroup: 'root',
    representativeRoute: '/',
    sharedLayoutHints: { headerShared: true, footerShared: true },
    sharedSectionPatterns: [
      {
        sectionPatternId: 'fsp_hero',
        semanticRole: 'hero',
        layoutRole: 'hero',
        order: 0,
        shared: true,
        confidence: 'high',
        ambiguityReason: null,
      },
      {
        sectionPatternId: 'fsp_content',
        semanticRole: 'content',
        layoutRole: 'stack',
        order: 1,
        shared: true,
        confidence: 'high',
        ambiguityReason: null,
      },
    ],
    sharedComponentPatterns: [
      { componentPatternId: 'fcp_hero', sectionPatternId: 'fsp_hero', kind: 'hero', order: 0, shared: true, confidence: 'high' },
      {
        componentPatternId: 'fcp_content',
        sectionPatternId: 'fsp_content',
        kind: 'rich_text',
        order: 0,
        shared: true,
        confidence: 'high',
      },
    ],
    memberPages: ['page-home', 'page-about'],
    pageOverrides: [],
    fallbackFlags: {
      singletonFamily: false,
      weakSharedStructure: false,
      ambiguousStructure: false,
      unusable: false,
    },
    provenance: {
      source: 'family_handoff_model',
      handoffModelSiteId: 'site-1',
    },
    diagnostics: [],
  }
}

function makeSiteModel(pages: FinalPageModel[]): FinalSiteModel {
  return {
    site: {
      id: 'site-1',
      locale: 'en',
      defaultPageId: pages[0]?.id ?? null,
      routes: pages.map((page, index) => ({
        id: `route_${page.id}`,
        path: page.path,
        pageId: page.id,
        parentRouteId: null,
        titleHint: page.title,
        order: index,
        status: 'resolved' as const,
      })),
      navigation: [],
      provenance: {
        importRunId: 'sv-1',
        sourceFingerprint: 'fingerprint',
        capturedAtIso: '2026-04-15T00:00:00.000Z',
        mergeModes: {
          structureMode: 'hybrid',
          styleMode: 'hybrid',
          contentMode: 'preserve_import',
          unknownComponentPolicy: 'wrap_as_generic',
        },
        designPagesCount: 0,
        designWarningsCount: 0,
      },
    },
    pages,
    globalRegions: [],
    tokens: {
      colors: [],
      typography: [],
      spacing: [],
      surface: { radiusScalePx: [0], borderStyle: 'subtle', shadowStyle: 'soft', provenance: [] },
      componentProfile: {
        buttons: { variants: ['solid'], cornerStyle: 'rounded', prominence: 'medium' },
        inputs: { border: 'thin', cornerStyle: 'rounded' },
        media: { treatment: 'edge_to_edge', saturationHint: 'balanced' },
        sectionTone: 'corporate',
        provenance: [],
      },
      gradients: [],
    },
    reusableComponents: [],
    diagnostics: [],
    conflicts: [],
  }
}

test('page instance derives shared structure from family and preserves page overrides', () => {
  const derived = deriveFamilyPageInstance({
    familyModel: makeFamilyModel(),
    page: makePage({ id: 'page-about', path: '/about', includeExceptional: true }),
  })

  assert.equal(derived.familyId, 'family_marketing_root')
  assert.equal(derived.mode, 'hybrid_family_page')
  assert.equal(derived.routePath, '/about')
  assert.equal(derived.sections.length, 3)
  assert.equal(derived.sections[0]?.semanticRole, 'hero')
  assert.equal(derived.sections[1]?.semanticRole, 'content')
})

test('page-specific route/title/content bindings are preserved in family-derived instance', () => {
  const pageInput = makePage({ id: 'page-home', path: '/', title: 'Home Custom' })
  const derived = deriveFamilyPageInstance({
    familyModel: makeFamilyModel(),
    page: pageInput,
  })

  assert.equal(derived.routePath, '/')
  assert.equal(derived.title, 'Home Custom')
  const bindings = derived.sections.flatMap((section) => section.contentBindings)
  assert.equal(bindings.length >= 2, true)
})

test('unusable family model degrades to page fallback', () => {
  const family = makeFamilyModel()
  family.fallbackFlags.unusable = true
  const inputPage = makePage({ id: 'page-home', path: '/' })

  const derived = deriveFamilyPageInstance({
    familyModel: family,
    page: inputPage,
  })

  assert.equal(derived.mode, 'page_fallback')
  assert.equal(derived.sections[0]?.id, inputPage.sections[0]?.id)
})

test('compatibility bridge adapts family instance into existing final-site renderer contract', () => {
  const pages = [makePage({ id: 'page-home', path: '/' }), makePage({ id: 'page-about', path: '/about' })]
  const finalSiteModel = makeSiteModel(pages)
  const derived = deriveFamilyPageInstance({
    familyModel: makeFamilyModel(),
    page: pages[1]!,
  })

  const bridged = applyFamilyPageInstanceToFinalSiteModel({
    finalSiteModel,
    pageInstance: derived,
  })

  const bridgedPage = bridged.pages.find((page) => page.id === 'page-about')
  assert.equal(bridgedPage?.path, '/about')
  assert.equal(bridgedPage?.sections.length, derived.sections.length)
})

test('page without family mapping falls back safely via preparation orchestrator', () => {
  const pageHome = makePage({ id: 'page-home', path: '/' })
  const pageOrphan = makePage({ id: 'page-orphan', path: '/orphan' })
  const finalSiteModel = makeSiteModel([pageHome, pageOrphan])

  const prepared = prepareFamilyRenderForRoute({
    siteId: 'site-1',
    routePath: '/orphan',
    finalSiteModel,
    familyHandoffModel: {
      siteId: 'site-1',
      families: [
        {
          familyId: 'family_marketing_root',
          familyType: 'marketing',
          pageIds: ['page-home'],
          sharedLayout: {},
          sectionPattern: [],
          diagnostics: [],
        },
      ],
      pageMappings: [{ pageId: 'page-home', familyId: 'family_marketing_root', assignmentReason: 'root' }],
      summary: { familyCount: 1, largestFamilySize: 1, orphanPageCount: 1 },
      diagnostics: [],
    },
  })

  assert.equal(prepared.selectedMode, 'page_fallback')
  assert.equal(prepared.fallbackToPage, true)
  assert.equal(prepared.diagnostics.some((entry) => entry.code === 'FAMILY_RENDER_NO_FAMILY_MAPPING'), true)
})
