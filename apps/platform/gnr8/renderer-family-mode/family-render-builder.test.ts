import assert from 'node:assert/strict'
import test from 'node:test'

import type { FamilyHandoffModel } from '@/gnr8/family-mode'
import type { FinalPageModel } from '@/gnr8/merge-engine'
import { buildFamilyRenderSiteModel } from '@/gnr8/renderer-family-mode'

function component(input: {
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
    slots: [],
    tokenRefs: [],
    fallback: {
      wrappedAsGeneric: false,
      reason: null,
      rawMetadata: null,
    },
    provenance: {
      source: 'merged',
      sourceId: input.id,
      rationale: 'test',
      confidence: 1,
    },
  }
}

function section(input: {
  id: string
  pageId: string
  order: number
  semanticRole: FinalPageModel['sections'][number]['semanticRole']
  layoutRole: string
  componentKinds: Array<FinalPageModel['sections'][number]['components'][number]['kind']>
}): FinalPageModel['sections'][number] {
  return {
    id: input.id,
    pageId: input.pageId,
    semanticRole: input.semanticRole,
    layoutRole: input.layoutRole,
    order: input.order,
    components: input.componentKinds.map((kind, index) => component({ id: `${input.id}_c${index}`, sectionId: input.id, kind, order: index })),
    contentBindings: [],
    styleRefs: {
      colorTokenIds: [],
      typographyTokenIds: [],
      spacingTokenIds: [],
      gradientIds: [],
    },
    provenance: {
      source: 'merged',
      sourceId: input.id,
      rationale: 'test',
      confidence: 1,
    },
  }
}

function page(input: {
  id: string
  path: string
  sections: FinalPageModel['sections']
}): FinalPageModel {
  return {
    id: input.id,
    path: input.path,
    role: input.path === '/' ? 'home' : 'content',
    title: input.id,
    routeNodeId: `route_${input.id}`,
    seo: {
      titleContentIds: [],
      descriptionContentIds: [],
    },
    sections: input.sections,
    globalRegionIds: [],
    provenance: {
      source: 'merged',
      sourceId: input.id,
      rationale: 'test',
      confidence: 1,
    },
  }
}

function handoffFixture(): FamilyHandoffModel {
  return {
    siteId: 'site-1',
    families: [
      {
        familyId: 'family_marketing_root',
        familyType: 'marketing',
        pageIds: ['page-home', 'page-about'],
        sharedLayout: {
          header: { refId: 'layout_header_shared_v1', source: 'site_tree_hint' },
          footer: { refId: 'layout_footer_shared_v1', source: 'site_tree_hint' },
        },
        sectionPattern: [
          { kind: 'hero', order: 0 },
          { kind: 'text_block', order: 1 },
        ],
        diagnostics: [],
      },
    ],
    pageMappings: [
      { pageId: 'page-home', familyId: 'family_marketing_root', assignmentReason: 'root' },
      { pageId: 'page-about', familyId: 'family_marketing_root', assignmentReason: 'root' },
    ],
    summary: {
      familyCount: 1,
      largestFamilySize: 2,
      orphanPageCount: 0,
    },
    diagnostics: [],
  }
}

test('basic family render model build from multi-page family', () => {
  const pages = [
    page({
      id: 'page-home',
      path: '/',
      sections: [
        section({ id: 'home_s0', pageId: 'page-home', order: 0, semanticRole: 'hero', layoutRole: 'hero', componentKinds: ['hero'] }),
        section({ id: 'home_s1', pageId: 'page-home', order: 1, semanticRole: 'content', layoutRole: 'stack', componentKinds: ['rich_text'] }),
      ],
    }),
    page({
      id: 'page-about',
      path: '/about',
      sections: [
        section({ id: 'about_s0', pageId: 'page-about', order: 0, semanticRole: 'hero', layoutRole: 'hero', componentKinds: ['hero'] }),
        section({ id: 'about_s1', pageId: 'page-about', order: 1, semanticRole: 'content', layoutRole: 'stack', componentKinds: ['rich_text'] }),
      ],
    }),
  ]

  const model = buildFamilyRenderSiteModel({
    siteId: 'site-1',
    familyHandoffModel: handoffFixture(),
    pages: pages.map((entry) => ({ pageId: entry.id, path: entry.path, title: entry.title, finalPage: entry })),
  })

  assert.equal(model.families.length, 1)
  assert.equal(model.families[0]?.familyId, 'family_marketing_root')
  assert.equal(model.families[0]?.sharedSectionPatterns.length, 2)
  assert.equal(model.families[0]?.fallbackFlags.unusable, false)
})

test('singleton family still builds and emits weak/singleton diagnostics', () => {
  const handoff = handoffFixture()
  handoff.pageMappings = [{ pageId: 'page-home', familyId: 'family_marketing_root', assignmentReason: 'root' }]
  handoff.families[0]!.pageIds = ['page-home']

  const singlePage = page({
    id: 'page-home',
    path: '/',
    sections: [section({ id: 'home_s0', pageId: 'page-home', order: 0, semanticRole: 'hero', layoutRole: 'hero', componentKinds: ['hero'] })],
  })

  const model = buildFamilyRenderSiteModel({
    siteId: 'site-1',
    familyHandoffModel: handoff,
    pages: [{ pageId: singlePage.id, path: singlePage.path, title: singlePage.title, finalPage: singlePage }],
  })

  const familyDiagnostics = model.families[0]?.diagnostics.map((entry) => entry.code) ?? []
  assert.equal(familyDiagnostics.includes('FAMILY_RENDER_SINGLETON_FAMILY'), true)
  assert.equal(model.families[0]?.fallbackFlags.singletonFamily, true)
})

test('mixed ambiguous family marks weak shared structure and ambiguity deterministically', () => {
  const pages = [
    page({
      id: 'page-home',
      path: '/',
      sections: [section({ id: 'home_s0', pageId: 'page-home', order: 0, semanticRole: 'hero', layoutRole: 'hero', componentKinds: ['hero'] })],
    }),
    page({
      id: 'page-about',
      path: '/about',
      sections: [section({ id: 'about_s0', pageId: 'page-about', order: 0, semanticRole: 'content', layoutRole: 'stack', componentKinds: ['rich_text'] })],
    }),
  ]

  const model = buildFamilyRenderSiteModel({
    siteId: 'site-1',
    familyHandoffModel: handoffFixture(),
    pages: pages.map((entry) => ({ pageId: entry.id, path: entry.path, title: entry.title, finalPage: entry })),
  })

  assert.equal(model.families[0]?.fallbackFlags.ambiguousStructure, true)
  assert.equal(model.families[0]?.diagnostics.some((entry) => entry.code === 'FAMILY_RENDER_AMBIGUOUS_STRUCTURE'), true)
})

test('page without family mapping is explicit and safe', () => {
  const orphan = page({
    id: 'page-orphan',
    path: '/orphan',
    sections: [section({ id: 'orphan_s0', pageId: 'page-orphan', order: 0, semanticRole: 'content', layoutRole: 'stack', componentKinds: ['rich_text'] })],
  })

  const model = buildFamilyRenderSiteModel({
    siteId: 'site-1',
    familyHandoffModel: handoffFixture(),
    pages: [{ pageId: orphan.id, path: orphan.path, title: orphan.title, finalPage: orphan }],
  })

  assert.equal(model.unmappedPageIds.includes('page-orphan'), true)
  assert.equal(model.diagnostics.some((entry) => entry.code === 'FAMILY_RENDER_ORPHAN_PAGE' && entry.pageId === 'page-orphan'), true)
})

test('deterministic repeated run gives identical output and sorted diagnostics', () => {
  const pages = [
    page({
      id: 'page-home',
      path: '/',
      sections: [section({ id: 'home_s0', pageId: 'page-home', order: 0, semanticRole: 'hero', layoutRole: 'hero', componentKinds: ['hero'] })],
    }),
    page({
      id: 'page-about',
      path: '/about',
      sections: [section({ id: 'about_s0', pageId: 'page-about', order: 0, semanticRole: 'hero', layoutRole: 'hero', componentKinds: ['hero'] })],
    }),
  ]

  const input = {
    siteId: 'site-1',
    familyHandoffModel: handoffFixture(),
    pages: pages.map((entry) => ({ pageId: entry.id, path: entry.path, title: entry.title, finalPage: entry })),
  }
  const first = buildFamilyRenderSiteModel(input)
  const second = buildFamilyRenderSiteModel(input)

  assert.deepEqual(first, second)
  const codes = first.diagnostics.map((entry) => String(entry.code))
  const sortedCodes = [...codes].sort((a, b) => a.localeCompare(b))
  assert.deepEqual(codes, sortedCodes)
})
