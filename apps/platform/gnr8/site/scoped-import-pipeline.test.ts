import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  __scopedImportPipelineTestUtils,
  materializeCmsContentSlotsForScopedImport,
  runScopedImportPipeline,
} from '@/gnr8/site/scoped-import-pipeline'
import { applyContentOverridesToRawHtml, type ContentOverride, type ContentSlot } from '@/gnr8/runtime/content-binding'
import { planBatchDraftUpserts } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/batch/batch-overrides-route-helpers'

function createSuccessPipelineFixture() {
  const preparedSite = {
    kind: 'prepared_site_model_v1',
    modelVersion: '1.7.0',
    status: 'ready',
    source: {
      importContractVersion: '1.1.1',
      importManifestVersion: '1.0.0',
      fingerprints: {
        inputContentSha256: 'a',
        inputSpecSha256: 'b',
      },
      sourceKind: 'single-entry-html',
      entryHtmlPath: 'index.html',
      htmlFilePaths: ['index.html'],
      assetsDirPath: 'assets',
    },
    siteSummary: {
      documentCount: 1,
      entryDocumentId: 'doc-home',
      documentsWithNormalizedHtmlCount: 1,
      documentsWithDomCount: 1,
      totalNodeCount: 10,
      totalParseWarningCount: 0,
      effectivelyEmpty: false,
    },
    preparedAssets: {
      assetFiles: { totalCount: 0 },
      references: {
        totalCount: 0,
        referencesByAssetKind: { image: 0, stylesheet: 0, script: 0, unknown: 0 },
        referencesByReferenceKind: {
          absolute_url: 0,
          data_url: 0,
          empty_invalid: 0,
          relative_local: 0,
          root_relative: 0,
        },
        referencesByValidationStatus: {
          invalid_asset_reference: 0,
          missing_local_asset: 0,
          ok: 0,
          path_traversal_blocked: 0,
          unsupported_data_url_asset: 0,
          unsupported_remote_asset: 0,
        },
        existingLocalCount: 0,
        missingLocalCount: 0,
      },
    },
    diagnostics: {
      import: {
        totalCount: 0,
        infoCount: 0,
        warningCount: 0,
        errorCount: 0,
        fatalCount: 0,
        codes: [],
        issueIds: [],
      },
    },
    documents: [
      {
        id: 'doc-home',
        path: 'index.html',
        isEntry: true,
        originalKind: 'entry_html',
        normalizedHtmlAvailable: true,
        serializedDomAvailable: true,
        nodeCount: 10,
        parseWarningCount: 0,
        decodingHadErrors: false,
        effectivelyEmpty: false,
        contentSha256: 'doc-sha',
        byteLength: 256,
        assetReferenceIds: [],
        domOutline: null,
        fidelity: {
          kind: 'prepared_document_fidelity_projection_v1',
          htmlLang: 'en',
          title: 'Home',
          metaCharset: 'utf-8',
          metaViewport: 'width=device-width,initial-scale=1',
          metaDescription: 'Imported home page',
          bodyClass: null,
          bodyId: null,
          stylesheetLinks: [],
        },
        semantic: {
          kind: 'prepared_page_semantic_model_v1',
          consolidation: {
            mode: 'merged',
            deepFragmentationDetected: false,
            inputBlockCount: 3,
            outputSectionCount: 2,
          },
          page: {
            pageType: 'home',
            confidence: 'high',
            rationale: ['home'],
            styleFamily: 'corporate',
          },
          sections: [
            {
              sectionId: 'sec-hero',
              sourceDomPath: 'html>body>main>section:nth-of-type(1)',
              sourceDomPaths: ['html>body>main>section:nth-of-type(1)'],
              blockIds: ['block-hero'],
              domIndexStart: 0,
              domIndexEnd: 1,
              consolidatedBlockCount: 1,
              consolidationConfidence: 0.9,
              consolidationRationale: ['merged blocks'],
              consolidationMergeDecisions: ['merge:hero'],
              ordinalIndex: 0,
              inferredType: 'hero',
              confidence: 'high',
              rationale: ['hero'],
              candidateSignals: {
                heroCandidate: 1,
                ctaCandidate: 0,
                contentCandidate: 0,
                footerCandidate: 0,
                servicesCandidate: 0.1,
                galleryCandidate: 0.2,
                dominantCandidate: 'hero',
              },
              dominantRationale: 'dominant_candidate=hero:1.00 runner_up=unknown:0.20',
              classificationDiagnostics: [],
              sectionRole: 'hero',
              headingHierarchy: [{ level: 1, text: 'Hero headline' }],
              layoutInference: { kind: 'split', confidence: 'medium', rationale: ['fixture hero layout'] },
              groupingSignals: { titleSubtitleBody: true, cardCluster: false },
              heroComposition: 'split_media',
              mediaDensity: 0.6,
              galleryLikeConfidence: 'low',
              ctaCandidates: [],
              likelyPrimaryCta: null,
              density: {
                textDensity: 0.6,
                imageDensity: 0.5,
                headingDensity: 0.4,
                ctaDensity: 0.2,
                repetitionDensity: 0.1,
                readabilityTendency: 'balanced',
              },
            },
            {
              sectionId: 'sec-footer',
              sourceDomPath: 'html>body>footer',
              sourceDomPaths: ['html>body>footer'],
              blockIds: ['block-footer'],
              domIndexStart: 2,
              domIndexEnd: 3,
              consolidatedBlockCount: 1,
              consolidationConfidence: 0.8,
              consolidationRationale: ['footer'],
              consolidationMergeDecisions: ['keep:footer'],
              ordinalIndex: 1,
              inferredType: 'footer',
              confidence: 'medium',
              rationale: ['footer'],
              candidateSignals: {
                heroCandidate: 0,
                ctaCandidate: 0,
                contentCandidate: 0.4,
                footerCandidate: 1,
                servicesCandidate: 0,
                galleryCandidate: 0,
                dominantCandidate: 'footer',
              },
              dominantRationale: 'dominant_candidate=footer:1.00 runner_up=content:0.40',
              classificationDiagnostics: [],
              sectionRole: 'footer',
              headingHierarchy: [],
              layoutInference: { kind: 'stack', confidence: 'medium', rationale: ['fixture footer layout'] },
              groupingSignals: { titleSubtitleBody: false, cardCluster: false },
              heroComposition: null,
              mediaDensity: 0,
              galleryLikeConfidence: 'low',
              ctaCandidates: [],
              likelyPrimaryCta: null,
              density: {
                textDensity: 0.4,
                imageDensity: 0,
                headingDensity: 0.2,
                ctaDensity: 0,
                repetitionDensity: 0.2,
                readabilityTendency: 'readable',
              },
            },
          ],
          ctaCandidates: [],
          primaryCta: null,
          brandSignals: {
            dominantColors: [],
            accentColors: [],
            neutralPaletteHints: [],
            fontFamilyHints: [],
            fontCategoryHints: ['sans'],
            visualTone: 'neutral',
            confidence: 'medium',
            rationale: [],
          },
          diagnostics: [],
        },
      },
    ],
  }

  const layoutModel = {
    pages: [
      {
        sourceDocumentId: 'doc-home',
        blocks: [
          {
            id: 'block-hero',
            ordinalIndex: 0,
            textExcerpt: 'Hero headline',
            preservedMarkupHtml: '<section><h1>Hero headline</h1></section>',
          },
          {
            id: 'block-footer',
            ordinalIndex: 1,
            textExcerpt: 'Footer text',
            preservedMarkupHtml: '<footer><p>Footer text</p></footer>',
          },
        ],
      },
    ],
  }

  return {
    status: 'success',
    summary: 'ok',
    diagnostics: [],
    input: {
      importOutput: {
        documentMeta: {
          source: { kind: 'single-entry-html' },
        },
      },
    },
    stages: [
      { stageId: 'structure_preparation', output: { preparedSite }, summary: 'structure ok' },
      { stageId: 'layout_preparation', output: { layoutModel }, summary: 'layout ok' },
      { stageId: 'render_preparation', output: { renderOutput: { kind: 'render_output_v1' } }, summary: 'render ok' },
      { stageId: 'preview_generation', output: { previewDocument: { kind: 'preview_document_v1' } }, summary: 'preview ok' },
    ],
  } as any
}

test('canonical scoped import materializes CMS content slots after raw import artifact persistence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-pipeline-cms-slots-'))
  const entryAbs = path.resolve(root, 'index.html')
  fs.writeFileSync(
    entryAbs,
    '<!doctype html><html><body><main><section><h1>Original Hero</h1><p>Original subtitle</p><a href="/book">Book now</a></section></main></body></html>',
    'utf8',
  )
  fs.mkdirSync(path.join(root, 'assets'))

  const pipeline = createSuccessPipelineFixture()
  let linkedArtifactId: string | null = null
  let persistedSlots: Array<Omit<ContentSlot, 'id' | 'createdAt' | 'updatedAt'>> = []

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: root,
      entryHtmlPathAbs: entryAbs,
      assetsDirAbs: path.join(root, 'assets'),
      sourceUrl: 'https://cms-slots.example/',
      captureMode: 'raw_html_only',
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: entryAbs,
        renderedDomQuality: {
          quality: 'strong',
          bodyTextLength: 80,
          meaningfulNodeCount: 6,
          sectionCandidateCount: 1,
          hasHeading: true,
          reason: 'cms_slots_fixture',
        },
        degraded: false,
      },
      renderedCapture: {
        status: 'unavailable',
        documents: [],
        screenshots: [],
        computedStyleSamples: [],
        diagnostics: [],
      },
      importDiagnostics: {
        issues: [],
      },
      fetchManifest: [],
      semanticImport: {
        sourceMode: 'raw_html_only',
        hero: {
          title: 'Original Hero',
          subtitle: 'Original subtitle',
          cta: { label: 'Book now', url: '/book' },
          image: null,
        },
        sections: [],
        assets: {
          images: [],
          links: [],
          groupedByRole: {
            logo: [],
            hero_image: [],
            gallery_image: [],
            service_image: [],
            testimonial_avatar: [],
            content_image: [],
            icon: [],
            unknown: [],
          },
        },
        diagnostics: [],
      },
    } as any,
    sourceUrl: 'https://cms-slots.example/',
    actor: 'test:cms-slots',
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async () => ({ siteId: 'runtime-site-cms', siteVersionId: '11111111-1111-4111-8111-111111111111', versionNo: 1 }),
      setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
      getSiteVersion: async () =>
        ({
          id: '11111111-1111-4111-8111-111111111111',
          siteId: 'runtime-site-cms',
          versionNo: 1,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: { kind: 'runtime_import_provenance_summary_v1' },
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site-cms',
          siteVersionId: '11111111-1111-4111-8111-111111111111',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async () => ({ artifactId: '22222222-2222-4222-8222-222222222222' }),
      bindArtifactToVersion: async (input) => {
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      persistRawImportedSiteArtifact: async () =>
        ({
          artifactId: 'raw-artifact-1',
          artifactType: 'raw_imported_site',
          entryHtmlPath: 'index.html',
          assetBasePath: '.',
          fileMap: {},
          fileCount: 1,
        }) as any,
      upsertContentSlots: async (input) => {
        persistedSlots = input.slots
        return input.slots.length
      },
      importHtmlToPage: () => ({}) as any,
      migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
    },
  })

  assert.equal(outcome.mode, 'pipeline')
  assert.equal(outcome.reporting.cmsContentSlots.inferredSlotCount > 0, true)
  assert.equal(outcome.reporting.cmsContentSlots.persistedSlotCount, outcome.reporting.cmsContentSlots.inferredSlotCount)
  assert.ok(outcome.reporting.cmsContentSlots.diagnostics.includes('CMS_SLOT_INFERENCE_STARTED'))
  assert.ok(outcome.reporting.cmsContentSlots.diagnostics.includes('CMS_SLOT_PERSISTENCE_COMPLETED'))
  assert.ok(persistedSlots.some((slot) => slot.slotKey === 'hero.title'))
})

test('CMS slot materialization is idempotent and preserves draft and published overrides', async () => {
  const html = '<!doctype html><html><body><h1>Original Hero</h1><p>Original subtitle</p></body></html>'
  const semanticImport = {
    sourceMode: 'raw_html_only',
    hero: { title: 'Original Hero', subtitle: 'Original subtitle', cta: null, image: null },
    sections: [],
    assets: {
      images: [],
      links: [],
      groupedByRole: {
        logo: [],
        hero_image: [],
        gallery_image: [],
        service_image: [],
        testimonial_avatar: [],
        content_image: [],
        icon: [],
        unknown: [],
      },
    },
    diagnostics: [],
  } as any
  const slots = new Map<string, Omit<ContentSlot, 'id' | 'createdAt' | 'updatedAt'>>()
  const overrides = new Map<string, ContentOverride>([
    ['hero.title:draft', {
      id: 'draft-1',
      siteId: 'site-cms',
      siteVersionId: '33333333-3333-4333-8333-333333333333',
      slotKey: 'hero.title',
      valueType: 'text',
      valueJson: { value: 'Draft Hero' },
      status: 'draft',
    }],
    ['hero.title:published', {
      id: 'published-1',
      siteId: 'site-cms',
      siteVersionId: '33333333-3333-4333-8333-333333333333',
      slotKey: 'hero.title',
      valueType: 'text',
      valueJson: { value: 'Published Hero' },
      status: 'published',
    }],
  ])
  const persistContentSlots = async (input: {
    slots: Array<Omit<ContentSlot, 'id' | 'createdAt' | 'updatedAt'>>
  }) => {
    for (const slot of input.slots) slots.set(slot.slotKey, slot)
    return input.slots.length
  }

  const first = await materializeCmsContentSlotsForScopedImport({
    siteId: 'site-cms',
    siteVersionId: '33333333-3333-4333-8333-333333333333',
    html,
    semanticImport,
    persistContentSlots: persistContentSlots as any,
  })
  const countAfterFirst = slots.size
  const second = await materializeCmsContentSlotsForScopedImport({
    siteId: 'site-cms',
    siteVersionId: '33333333-3333-4333-8333-333333333333',
    html,
    semanticImport,
    persistContentSlots: persistContentSlots as any,
  })

  assert.equal(first.inferredSlotCount > 0, true)
  assert.equal(second.inferredSlotCount, first.inferredSlotCount)
  assert.equal(slots.size, countAfterFirst)
  assert.deepEqual(overrides.get('hero.title:draft')?.valueJson, { value: 'Draft Hero' })
  assert.deepEqual(overrides.get('hero.title:published')?.valueJson, { value: 'Published Hero' })
})

test('import-created slots support draft save planning, publish promotion, and raw render override application', () => {
  const html = '<!doctype html><html><body><h1>Original Hero</h1></body></html>'
  const slot: ContentSlot = {
    id: 'slot-hero-title',
    siteId: 'site-cms',
    siteVersionId: '44444444-4444-4444-8444-444444444444',
    slotKey: 'hero.title',
    slotType: 'text',
    sourceSelector: 'html > body:nth-of-type(1) > h1:nth-of-type(1)',
    sourceText: 'Original Hero',
    sourceAssetPath: null,
    confidence: 0.9,
    diagnostics: { inferredFrom: 'hero.title' },
  }
  const plan = planBatchDraftUpserts({
    slots: [{ slotKey: slot.slotKey, slotType: slot.slotType }],
    overrides: [{ slotKey: slot.slotKey, value: 'Published Hero', status: 'draft' }],
  })
  const draftOverride: ContentOverride = {
    id: 'draft-hero-title',
    siteId: slot.siteId,
    siteVersionId: slot.siteVersionId,
    slotKey: slot.slotKey,
    valueType: slot.slotType,
    valueJson: plan.valid[0]?.valueJson,
    status: 'draft',
  }
  const publishedOverride: ContentOverride = { ...draftOverride, id: 'published-hero-title', status: 'published' }
  const rendered = applyContentOverridesToRawHtml({
    html,
    slots: [slot],
    overrides: [publishedOverride],
  })

  assert.equal(plan.valid.length, 1)
  assert.equal(draftOverride.status, 'draft')
  assert.equal(publishedOverride.status, 'published')
  assert.equal(rendered.appliedCount, 1)
  assert.match(rendered.html, /Published Hero/)
  assert.ok(!rendered.html.includes('Original Hero'))
})

test('scoped pipeline import uses pipeline path, maps consolidated sections, and links artifact', async () => {
  const pipeline = createSuccessPipelineFixture()
  let createInput: any = null
  let persistedImportSummary: any = null
  let legacyImportCalls = 0
  let legacyMigrateCalls = 0
  let bindCalls = 0
  let bindInput: any = null
  let linkedArtifactId: string | null = null

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: '/tmp/snapshot',
      entryHtmlPathAbs: '/tmp/snapshot/index.html',
      assetsDirAbs: '/tmp/snapshot/assets',
      sourceMode: 'rendered_dom',
      sourceSelection: {
        sourceMode: 'rendered_dom',
        fidelityStatus: 'high_fidelity_import',
        selectedSourceHtmlPathAbs: '/tmp/snapshot/rendered-capture/rendered-dom.html',
        renderedDomQuality: {
          quality: 'strong',
          bodyTextLength: 280,
          meaningfulNodeCount: 40,
          sectionCandidateCount: 3,
          hasHeading: true,
          reason: 'test_fixture',
        },
        degraded: false,
      },
      renderedCapture: {
        status: 'available',
        screenshots: [{}, {}],
        computedStyleSamples: [{}, {}, {}],
      },
      renderedCaptureReliability: {
        job: {
          jobId: 'capture-job-1',
          status: 'completed',
          attemptCount: 2,
          maxAttempts: 2,
          failureClass: 'none',
          failureCode: null,
          timeoutBudgetMs: 30_000,
          createdAt: '2026-04-10T08:00:00.000Z',
          startedAt: '2026-04-10T08:00:01.000Z',
          completedAt: '2026-04-10T08:00:05.000Z',
          resultSummary: {
            workerStatus: 'available',
            renderedDomArtifactAvailable: true,
            screenshotArtifactCount: 2,
            computedStyleSampleCount: 3,
          },
        },
        workerHealth: {
          enabled: true,
          reachable: true,
          browserAvailable: true,
          queueHealthy: true,
          status: 'healthy',
          reason: null,
          lastSuccessAt: '2026-04-10T08:00:05.000Z',
          lastFailureAt: null,
          lastFailureClass: 'none',
          lastFailureCode: null,
        },
      },
      importDiagnostics: {
        issues: [{ code: 'RENDERED_CAPTURE_RECOVERED_ON_RETRY' }],
      },
    } as any,
    sourceUrl: 'https://example.com/',
    actor: 'test:scoped-import',
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async (input) => {
        createInput = input
        return { siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 7 }
      },
      setSiteVersionImportProvenanceSummary: async (input) => {
        persistedImportSummary = input
        return { affectedRows: 1 }
      },
      getSiteVersion: async () =>
        ({
          id: 'site-version-1',
          siteId: 'runtime-site',
          versionNo: 7,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
          pages: [
            {
              id: 'page-version-1',
              siteVersionId: 'site-version-1',
              pageId: 'page-1',
              path: '/',
              title: 'Home',
              structureModel: { sections: [{ id: 'sec-hero', type: 'hero', order: 0 }, { id: 'sec-footer', type: 'footer', order: 1 }] },
              contentModel: { sectionProps: {} },
              styleTokens: {},
              assetGraph: [],
              semanticSignals: [],
              source: 'migration',
              actor: 'test',
              createdAt: new Date().toISOString(),
            },
          ],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site',
          siteVersionId: 'site-version-1',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async () => ({ artifactId: 'artifact-1' }),
      bindArtifactToVersion: async (input) => {
        bindCalls += 1
        bindInput = input
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      importHtmlToPage: () => {
        legacyImportCalls += 1
        return {} as any
      },
      migrateImportedPageToCanonicalDraft: async () => {
        legacyMigrateCalls += 1
        return { siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }
      },
    },
  })

  assert.equal(outcome.mode, 'pipeline')
  assert.equal(outcome.artifactId, 'artifact-1')
  assert.equal(outcome.reporting.artifactGenerated, true)
  assert.equal(outcome.reporting.consolidationApplied, true)
  assert.equal(outcome.reporting.sourceMode, 'rendered_dom')
  assert.equal(outcome.reporting.fidelityStatus, 'high_fidelity_import')
  assert.equal(outcome.reporting.fidelityDegraded, false)
  assert.equal(outcome.reporting.renderedDomQuality, 'strong')
  assert.equal(outcome.reporting.screenshotCount, 2)
  assert.equal(outcome.reporting.computedStyleSampleCount, 3)
  assert.equal(typeof outcome.reporting.styleSourceMode, 'string')
  assert.equal(typeof outcome.reporting.styleTypography, 'string')
  assert.equal(typeof outcome.reporting.styleCta, 'string')
  assert.ok(outcome.reporting.importDiagnosticCodes.includes('RENDERED_CAPTURE_RECOVERED_ON_RETRY'))
  assert.equal(bindCalls, 1)
  assert.equal(bindInput.siteVersionId, 'site-version-1')
  assert.equal(bindInput.artifactId, 'artifact-1')
  assert.equal(legacyImportCalls, 0)
  assert.equal(legacyMigrateCalls, 0)
  assert.ok(createInput)
  assert.equal(createInput.importProvenanceSummary.sourceMode, 'rendered_dom')
  assert.equal(createInput.importProvenanceSummary.multiPageDiscovery ?? null, null)
  assert.equal(outcome.reporting.multiPageDiscovery.enabled, false)
  assert.equal(createInput.importProvenanceSummary.importFidelityStatus, 'high_fidelity_import')
  assert.equal(createInput.importProvenanceSummary.screenshotCount, 2)
  assert.equal(createInput.importProvenanceSummary.computedStyleSampleCount, 3)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.used, true)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.status, 'partial')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.styleCoverage, 0.3)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.runtimeKind, 'unknown')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.environmentSupported, false)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.browserPackageAvailable, true)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.browserBinaryAvailable, false)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.environmentStatus, 'unknown')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.failureCategory, 'none')
  assert.equal(createInput.importProvenanceSummary.captureJob?.jobId, 'capture-job-1')
  assert.equal(createInput.importProvenanceSummary.captureJob?.status, 'completed')
  assert.equal(createInput.importProvenanceSummary.captureJob?.attemptCount, 2)
  assert.equal(createInput.importProvenanceSummary.workerHealth?.reachable, true)
  assert.equal(createInput.importProvenanceSummary.workerHealth?.status, 'healthy')
  assert.equal(createInput.importProvenanceSummary.workerHealth?.reason, null)
  assert.ok(createInput.importProvenanceSummary.styleSignals != null)
  assert.equal(createInput.importProvenanceSummary.styleSignals.kind, 'style_signal_model_v2')
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_PERSISTED'))
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('RENDERED_CAPTURE_SUMMARY_PERSISTED'))
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('RENDERED_SUMMARY_HYDRATED_FROM_WORKER_SUCCESS'))
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('RENDERED_CAPTURE_PERSISTED'))
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('RENDERED_CAPTURE_USED'))
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('IMPORT_FIDELITY_SCORE_COMPUTED'))
  assert.ok(createInput.importProvenanceSummary.importFidelityScore != null)
  assert.equal(createInput.importProvenanceSummary.importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK'), false)
  assert.match(String(createInput.importProvenanceSummary.captureEvidence.renderedDomPath ?? ''), /\/rendered\/dom\.html$/)
  assert.equal(createInput.importProvenanceSummary.siteTree?.summary.rootPageId, 'page_home')
  assert.equal(createInput.importProvenanceSummary.siteTree?.summary.pageCount >= 1, true)
  assert.ok(Array.isArray(createInput.importProvenanceSummary.siteTree?.summary.diagnostics))
  assert.equal(createInput.importProvenanceSummary.templateFamilies?.summary.familyCount >= 1, true)
  assert.equal(createInput.importProvenanceSummary.templateFamilies?.summary.largestFamilySize >= 1, true)
  assert.ok(Array.isArray(createInput.importProvenanceSummary.templateFamilies?.summary.diagnostics))
  assert.equal(persistedImportSummary.siteVersionId, 'site-version-1')
  assert.equal(persistedImportSummary.importProvenanceSummary.renderedCaptureStatus, 'partial')
  assert.equal(persistedImportSummary.importProvenanceSummary.siteTree?.summary.pageCount >= 1, true)
  assert.equal(persistedImportSummary.importProvenanceSummary.templateFamilies?.summary.familyCount >= 1, true)
  assert.equal(outcome.reporting.writePath.createdVersionId, 'site-version-1')
  assert.ok(outcome.reporting.writePath.provenancePayloadBeforeWrite)
  assert.equal(outcome.reporting.writePath.provenanceWriteAttempted, true)
  assert.equal(outcome.reporting.writePath.provenanceWriteSucceeded, true)
  assert.equal(outcome.reporting.writePath.provenanceWriteAffectedRows, 1)
  assert.equal(outcome.reporting.writePath.artifactCreateAttempted, true)
  assert.equal(outcome.reporting.writePath.artifactCreatedId, 'artifact-1')
  assert.equal(outcome.reporting.writePath.artifactBindAttempted, true)
  assert.equal(outcome.reporting.writePath.artifactBindSucceeded, true)
  assert.equal(outcome.reporting.writePath.artifactBindAffectedRows, 1)
  assert.equal(outcome.reporting.writePath.verifiedVersionIdAfterWrite, 'site-version-1')
  assert.equal(outcome.reporting.writePath.verificationRead.versionId, 'site-version-1')
  assert.equal(outcome.reporting.writePath.verificationRead.artifactId, 'artifact-1')
  assert.equal(outcome.reporting.writePath.verificationRead.hasImportProvenanceSummary, true)
  assert.ok(createInput.pages[0].structureModel.sections.length > 1, 'expected consolidated sections to persist into runtime structure model')
})

test('scoped pipeline import can persist seed-only multi-page discovery manifest', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-pipeline-multipage-discovery-'))
  const entryAbs = path.resolve(root, 'index.html')
  const assetsDir = path.resolve(root, 'assets')
  fs.mkdirSync(assetsDir)
  fs.writeFileSync(
    entryAbs,
    `<!doctype html><html><head><title>Discovery</title></head><body>
      <header><nav>
        <a href="/about/">About</a>
        <a href="/about/index.html">About Duplicate</a>
        <a href="https://www.example.com/services?utm_source=nav">Services</a>
        <a href="https://external.example.net/page">External</a>
        <a href="mailto:hello@example.com">Mail</a>
        <a href="tel:+1234567">Phone</a>
        <a href="#top">Top</a>
        <a href="/guide.pdf" download>Guide</a>
        <a href="/assets/archive.zip">Archive</a>
        <a href="/login">Login</a>
        <a href="/search?q=private">Search</a>
      </nav></header>
      <main><a href="/contact/index.html">Contact</a><form action="/lead"><button>Lead</button></form></main>
    </body></html>`,
    'utf8',
  )

  const pipeline = createSuccessPipelineFixture()
  let createInput: any = null
  let persistedImportSummary: any = null
  let artifactInput: any = null
  let rawImportFilePaths: string[] = []
  let linkedArtifactId: string | null = null
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = String(url)
    if (requestUrl === 'https://example.com/robots.txt') {
      return new Response(
        `
        User-agent: *
        Disallow: /contact
        Allow: /services
        Sitemap: https://example.com/robots-sitemap.xml
        Sitemap: https://example.com/missing-sitemap.xml
        `,
        { status: 200, headers: { 'content-type': 'text/plain' } },
      )
    }
    if (requestUrl === 'https://example.com/robots-sitemap.xml') {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <urlset>
          <url><loc>https://example.com/robots-only</loc></url>
        </urlset>`,
        { status: 200, headers: { 'content-type': 'application/xml' } },
      )
    }
    if (requestUrl === 'https://example.com/sitemap.xml') {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <urlset>
          <url><loc>https://example.com/sitemap-only</loc></url>
          <url><loc>https://external.example.net/sitemap-page</loc></url>
        </urlset>`,
        { status: 200, headers: { 'content-type': 'application/xml' } },
      )
    }
    return new Response('', { status: 404 })
  }) as typeof fetch

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: root,
      snapshotStableRootDirAbs: root,
      snapshotId: 'snapshot-discovery',
      snapshotRunId: 'snapshot-run-discovery',
      requestId: 'request-discovery',
      entryHtmlPathAbs: entryAbs,
      assetsDirAbs: assetsDir,
      sourceUrl: 'https://www.example.com/index.html',
      normalizedUrl: 'https://example.com/',
      captureMode: 'raw_html_only',
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: entryAbs,
        renderedDomQuality: {
          quality: 'strong',
          bodyTextLength: 120,
          meaningfulNodeCount: 12,
          sectionCandidateCount: 2,
          hasHeading: true,
          reason: 'discovery_fixture',
        },
        rawHtmlQuality: {
          quality: 'strong',
          bodyTextLength: 120,
          meaningfulNodeCount: 12,
          sectionCandidateCount: 2,
          hasHeading: true,
          reason: 'discovery_fixture',
        },
        degraded: false,
      },
      renderedCapture: {
        status: 'unavailable',
        documents: [],
        screenshots: [],
        computedStyleSamples: [],
        diagnostics: [],
      },
      renderedCaptureReliability: { job: null, workerHealth: null },
      importDiagnostics: { summary: { infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0 }, issues: [] },
      fetchManifest: [],
      importIntake: { ok: true, rawHtmlAvailable: true, htmlByteLength: fs.statSync(entryAbs).size },
    } as any,
    sourceUrl: 'https://www.example.com/index.html',
    actor: 'test:multi-page-discovery',
    multiPageDiscovery: {
      enabled: true,
      generatedAt: '2026-06-06T00:00:00.000Z',
      limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 20, maxTemplateLinksPerRoute: 10, maxSitemaps: 4, maxUrlsFromSitemaps: 10, maxNestedSitemaps: 1 },
    },
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async (input) => {
        createInput = input
        return { siteId: 'runtime-site-discovery', siteVersionId: 'site-version-discovery', versionNo: 3 }
      },
      setSiteVersionImportProvenanceSummary: async (input) => {
        persistedImportSummary = input
        return { affectedRows: 1 }
      },
      getSiteVersion: async () =>
        ({
          id: 'site-version-discovery',
          siteId: 'runtime-site-discovery',
          versionNo: 3,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: '2026-06-06T00:00:00.000Z',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site-discovery',
          siteVersionId: 'site-version-discovery',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview only</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async (input) => {
        artifactInput = input
        return { artifactId: 'artifact-discovery' }
      },
      bindArtifactToVersion: async (input) => {
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      persistRawImportedSiteArtifact: async (input) => {
        rawImportFilePaths = input.fileRows.map((row: { path: string }) => row.path)
        return {
          artifactId: 'raw-artifact-discovery',
          artifactType: 'raw_imported_site',
          entryHtmlPath: 'index.html',
          assetBasePath: '.',
          fileMap: {},
          fileCount: input.fileRows.length,
        } as any
      },
      upsertContentSlots: async () => 0,
      importHtmlToPage: () => ({}) as any,
      migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
    },
  })

  assert.equal(outcome.mode, 'pipeline')
  assert.equal(outcome.reporting.multiPageDiscovery.enabled, true)
  assert.equal(outcome.reporting.multiPageDiscovery.discoveredPageCount, 5)
  assert.equal(outcome.reporting.multiPageDiscovery.routeCandidateCount, 5)
  assert.equal(outcome.reporting.multiPageDiscovery.manifestRef, 'importProvenanceSummary.multiPageDiscovery.manifest')

  const persistedDiscovery = persistedImportSummary.importProvenanceSummary.multiPageDiscovery
  const manifest = persistedDiscovery.manifest
  assert.equal(persistedDiscovery.summary.discoveredPageCount, 5)
  assert.deepEqual(manifest.routeCandidates, ['/about', '/contact', '/robots-only', '/services', '/sitemap-only'])
  assert.equal(manifest.normalizedSeedRoute, '/')
  assert.equal(manifest.generatedAt, '2026-06-06T00:00:00.000Z')
  assert.equal(manifest.limitsApplied.maxSitemaps, 4)
  assert.equal(manifest.limitsApplied.maxUrlsFromSitemaps, 10)
  assert.equal(manifest.limitsApplied.maxNestedSitemaps, 1)
  assert.equal(manifest.discoveredPages.some((entry: any) => entry.normalizedRoutePath === '/about' && entry.sourceContext === 'header'), true)
  assert.equal(manifest.discoveredPages.some((entry: any) => entry.normalizedRoutePath === '/sitemap-only' && entry.originalHref === 'https://example.com/sitemap-only'), true)
  assert.equal(manifest.discoveredPages.some((entry: any) => entry.normalizedRoutePath === '/robots-only' && entry.originalHref === 'https://example.com/robots-only'), true)
  assert.equal(manifest.routeGovernance.some((entry: any) => entry.routePath === '/contact' && entry.status === 'disallowed'), true)
  assert.equal(manifest.routeGovernance.some((entry: any) => entry.routePath === '/services' && entry.status === 'allowed'), true)
  assert.equal(manifest.normalizedUrls.some((entry: any) => entry.originalHref === '/about/' && entry.normalizedUrl === 'https://example.com/about'), true)
  assert.equal(manifest.normalizedUrls.some((entry: any) => entry.originalHref === '/about/index.html' && entry.normalizedRoutePath === '/about'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === 'https://external.example.net/page' && entry.skippedReason === 'external_host'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === 'mailto:hello@example.com' && entry.skippedReason === 'mailto'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === 'tel:+1234567' && entry.skippedReason === 'tel'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === '#top' && entry.skippedReason === 'hash_only'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === '/guide.pdf' && entry.skippedReason === 'download'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === '/assets/archive.zip' && entry.skippedReason === 'asset_link'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === '/login' && entry.skippedReason === 'auth_path'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.originalHref === '/search?q=private' && entry.skippedReason === 'unsafe_query_state'), true)
  assert.equal(manifest.skippedLinks.some((entry: any) => entry.sourceClassification === 'form_action' && entry.skippedReason === 'form_action'), true)
  assert.equal(manifest.diagnostics.some((entry: string) => entry.startsWith('MULTIPAGE_IMPORT_STARTED')), true)
  assert.equal(manifest.diagnostics.some((entry: string) => entry.startsWith('MULTIPAGE_DISCOVERY_ONLY_CHILD_FETCH_SKIPPED')), true)
  assert.equal(manifest.diagnostics.some((entry: string) => entry.startsWith('SITEMAP_DISCOVERY_STARTED')), true)
  assert.equal(manifest.diagnostics.some((entry: string) => entry.startsWith('SITEMAP_DISCOVERY_SUCCEEDED')), true)
  assert.equal(manifest.diagnostics.some((entry: string) => entry.startsWith('SITEMAP_URL_DISCOVERED:/sitemap-only')), true)
  assert.equal(manifest.diagnostics.some((entry: string) => entry.startsWith('ROBOTS_DISCOVERY_SUCCEEDED')), true)
  assert.equal(manifest.diagnostics.some((entry: string) => entry.startsWith('ROBOTS_ROUTE_DISALLOWED:/contact')), true)
  assert.deepEqual(persistedDiscovery.robotsDiscovery.sitemapDeclarations, ['https://example.com/missing-sitemap.xml', 'https://example.com/robots-sitemap.xml'])
  assert.equal(persistedDiscovery.robotsDiscovery.routeGovernanceSummary.disallowed, 1)
  assert.equal(persistedDiscovery.robotsDiscovery.diagnostics.some((entry: string) => entry.startsWith('ROBOTS_SITEMAP_DECLARATION_MISSING')), true)
  assert.deepEqual(persistedDiscovery.sitemapDiscovery.fetchedSitemapUrls, ['https://example.com/robots-sitemap.xml', 'https://example.com/sitemap.xml'])
  assert.equal(persistedDiscovery.sitemapDiscovery.urlCount, 2)
  assert.equal(persistedDiscovery.sitemapDiscovery.skippedUrlCount, 1)
  assert.equal(persistedDiscovery.sitemapDiscovery.limitsApplied.maxSitemaps, 4)
  assert.deepEqual(Object.keys(artifactInput.htmlByPath), ['/'])
  assert.equal(rawImportFilePaths.some((filePath) => /(^|\/)(about|contact|services|sitemap-only|robots-only)(\/index)?\.html$/.test(filePath)), false)
})

test('scoped pipeline multi-page HTML acquisition fetches child evidence without public serving changes', async () => {
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/'
    if (url === '/about') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end('<!doctype html><html><body><h1>About</h1></body></html>')
      return
    }
    if (url === '/final') {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('<!doctype html><html><body><h1>Redirected</h1></body></html>')
      return
    }
    if (url === '/redirect') {
      res.writeHead(302, { location: '/final' })
      res.end('')
      return
    }
    if (url === '/broken') {
      res.writeHead(503, { 'content-type': 'text/html' })
      res.end('<!doctype html><html><body>unavailable</body></html>')
      return
    }
    if (url === '/data') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
      return
    }
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><html><body>seed</body></html>')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const sourceUrl = `http://127.0.0.1:${address.port}/`

  try {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-pipeline-multipage-acquisition-'))
    const entryAbs = path.resolve(root, 'index.html')
    const assetsDir = path.resolve(root, 'assets')
    fs.mkdirSync(assetsDir)
    fs.writeFileSync(
      entryAbs,
      `<!doctype html><html><body>
        <header><nav>
          <a href="/about">About</a>
          <a href="/redirect">Redirect</a>
          <a href="/broken">Broken</a>
          <a href="/data">Data</a>
          <a href="https://external.example.net/page">External</a>
          <a href="/login">Login</a>
          <a href="/search?q=private">Search</a>
        </nav></header>
      </body></html>`,
      'utf8',
    )

    const pipeline = createSuccessPipelineFixture()
    let createInput: any = null
    let persistedImportSummary: any = null
    let artifactInput: any = null
    let rawImportFilePaths: string[] = []
    let linkedArtifactId: string | null = null

    const outcome = await runScopedImportPipeline({
      snapshot: {
        snapshotRootDirAbs: root,
        snapshotStableRootDirAbs: root,
        snapshotId: 'snapshot-acquisition',
        snapshotRunId: 'snapshot-run-acquisition',
        requestId: 'request-acquisition',
        entryHtmlPathAbs: entryAbs,
        assetsDirAbs: assetsDir,
        sourceUrl,
        normalizedUrl: sourceUrl,
        captureMode: 'raw_html_only',
        sourceMode: 'raw_html_fallback',
        sourceSelection: {
          sourceMode: 'raw_html_fallback',
          fidelityStatus: 'degraded_import',
          selectedSourceHtmlPathAbs: entryAbs,
          renderedDomQuality: {
            quality: 'strong',
            bodyTextLength: 120,
            meaningfulNodeCount: 12,
            sectionCandidateCount: 2,
            hasHeading: true,
            reason: 'acquisition_fixture',
          },
          rawHtmlQuality: {
            quality: 'strong',
            bodyTextLength: 120,
            meaningfulNodeCount: 12,
            sectionCandidateCount: 2,
            hasHeading: true,
            reason: 'acquisition_fixture',
          },
          degraded: false,
        },
        renderedCapture: {
          status: 'unavailable',
          documents: [],
          screenshots: [],
          computedStyleSamples: [],
          diagnostics: [],
        },
        renderedCaptureReliability: { job: null, workerHealth: null },
        importDiagnostics: { summary: { infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0 }, issues: [] },
        fetchManifest: [],
        importIntake: { ok: true, rawHtmlAvailable: true, htmlByteLength: fs.statSync(entryAbs).size },
      } as any,
      sourceUrl,
      actor: 'test:multi-page-acquisition',
      multiPageDiscovery: {
        enabled: true,
        acquireHtml: true,
        generatedAt: '2026-06-06T00:00:00.000Z',
        limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 20, maxTemplateLinksPerRoute: 10 },
        htmlAcquisitionLimits: { maxPages: 10, maxBytesPerPage: 20_000, requestTimeoutMs: 5_000 },
      },
      deps: {
        importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
        createImportManifest: () => ({ status: 'success' }) as any,
        runLinearMigrationPipeline: () => pipeline as any,
        createSiteVersionFromMigration: async (input) => {
          createInput = input
          return { siteId: 'runtime-site-acquisition', siteVersionId: 'site-version-acquisition', versionNo: 4 }
        },
        setSiteVersionImportProvenanceSummary: async (input) => {
          persistedImportSummary = input
          return { affectedRows: 1 }
        },
        getSiteVersion: async () =>
          ({
            id: 'site-version-acquisition',
            siteId: 'runtime-site-acquisition',
            versionNo: 4,
            state: 'DRAFT',
            source: 'migration',
            actor: 'test',
            createdAt: '2026-06-06T00:00:00.000Z',
            rendererCompatibilityVersion: 'gnr8-renderer-v1',
            artifactId: linkedArtifactId,
            importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
            pages: [],
          }) as any,
        buildDeterministicArtifactBundle: () =>
          ({
            siteId: 'runtime-site-acquisition',
            siteVersionId: 'site-version-acquisition',
            rendererCompatibilityVersion: 'gnr8-renderer-v1',
            bundleSha256: 'bundle-sha',
            htmlByPath: { '/': '<!doctype html><html><body>preview only</body></html>' },
            compiledTokenStyles: ':root{}',
            assetFingerprintMap: {},
            manifest: {},
          }) as any,
        createArtifact: async (input) => {
          artifactInput = input
          return { artifactId: 'artifact-acquisition' }
        },
        bindArtifactToVersion: async (input) => {
          linkedArtifactId = input.artifactId
          return { affectedRows: 1 }
        },
        persistRawImportedSiteArtifact: async (input) => {
          rawImportFilePaths = input.fileRows.map((row: { path: string }) => row.path)
          return {
            artifactId: 'raw-artifact-acquisition',
            artifactType: 'raw_imported_site',
            entryHtmlPath: 'index.html',
            assetBasePath: '.',
            fileMap: {},
            fileCount: input.fileRows.length,
          } as any
        },
        upsertContentSlots: async () => 0,
        importHtmlToPage: () => ({}) as any,
        migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
      },
    })

    assert.equal(outcome.mode, 'pipeline')
    assert.equal(outcome.reporting.multiPageDiscovery.htmlAcquisition?.enabled, true)
    assert.equal(outcome.reporting.multiPageDiscovery.htmlAcquisition?.fetchedPageCount, 2)
    assert.equal(outcome.reporting.multiPageDiscovery.htmlAcquisition?.failedPageCount, 1)
    assert.equal(outcome.reporting.multiPageDiscovery.htmlAcquisition?.manifestRef, 'importProvenanceSummary.multiPageDiscovery.acquisition')
    assert.ok(outcome.reporting.multiPageDiscovery.htmlAcquisition?.skippedPageCount ?? 0 >= 4)
    assert.equal(outcome.reporting.multiPageDiscovery.rawArtifactAssembly, undefined)

    const acquisition = persistedImportSummary.importProvenanceSummary.multiPageDiscovery.acquisition
    assert.equal(persistedImportSummary.importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly ?? null, null)
    assert.equal(acquisition.kind, 'multi_page_html_acquisition_manifest_v1')
    assert.equal(acquisition.summary.fetchedPageCount, 2)
    assert.equal(acquisition.summary.failedPageCount, 1)
    assert.ok(acquisition.diagnostics.includes('MULTIPAGE_HTML_ACQUISITION_STARTED'))
    assert.ok(acquisition.diagnostics.includes('MULTIPAGE_HTML_FETCH_SUCCEEDED'))
    assert.ok(acquisition.diagnostics.includes('MULTIPAGE_HTML_FETCH_FAILED'))
    assert.ok(acquisition.diagnostics.includes('MULTIPAGE_HTML_FETCH_SKIPPED'))
    assert.ok(acquisition.diagnostics.includes('MULTIPAGE_HTML_ACQUISITION_MANIFEST_PERSISTED'))

    const about = acquisition.pages.find((entry: any) => entry.normalizedRoutePath === '/about')
    assert.equal(about.status, 'fetched')
    assert.equal(about.httpStatusCode, 200)
    assert.match(about.contentType, /text\/html/)
    assert.equal(about.byteSize, Buffer.byteLength('<!doctype html><html><body><h1>About</h1></body></html>'))
    assert.equal(about.bodySha256, crypto.createHash('sha256').update('<!doctype html><html><body><h1>About</h1></body></html>').digest('hex'))
    assert.match(about.bodyPath, /multipage-html-acquisition\/pages\/about-/)

    const redirected = acquisition.pages.find((entry: any) => entry.normalizedRoutePath === '/redirect')
    assert.equal(redirected.status, 'fetched')
    assert.equal(redirected.redirected, true)
    assert.equal(redirected.redirectCount, 1)
    assert.equal(redirected.finalNormalizedRoutePath, '/final')

    const broken = acquisition.pages.find((entry: any) => entry.normalizedRoutePath === '/broken')
    assert.equal(broken.status, 'failed')
    assert.equal(broken.httpStatusCode, 503)
    assert.equal(broken.failureReason, 'non_2xx_status')

    const data = acquisition.pages.find((entry: any) => entry.normalizedRoutePath === '/data')
    assert.equal(data.status, 'skipped')
    assert.equal(data.skippedReason, 'non_html_content_type')
    assert.equal(data.contentType, 'application/json')

    assert.equal(acquisition.pages.some((entry: any) => entry.originalHref === 'https://external.example.net/page' && entry.skippedReason === 'discovery_external_host'), true)
    assert.equal(acquisition.pages.some((entry: any) => entry.originalHref === '/login' && entry.skippedReason === 'discovery_auth_path'), true)
    assert.equal(acquisition.pages.some((entry: any) => entry.originalHref === '/search?q=private' && entry.skippedReason === 'discovery_unsafe_query_state'), true)
    assert.deepEqual(Object.keys(artifactInput.htmlByPath), ['/'])
    assert.equal(rawImportFilePaths.some((filePath) => filePath.startsWith('multipage-html-acquisition/pages/about-')), true)
    assert.equal(rawImportFilePaths.some((filePath) => filePath.startsWith('multipage-html-acquisition/pages/redirect-')), true)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test('scoped pipeline raw multi-page assembly creates deterministic raw artifact evidence without public serving changes', async () => {
  const aboutHtml = '<!doctype html><html><body><h1>About</h1></body></html>'
  const contactHtml = '<!doctype html><html><body><h1>Contact</h1></body></html>'
  const rootHtml = '<!doctype html><html><body><h1>Seed</h1></body></html>'
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/'
    if (url === '/about') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(aboutHtml)
      return
    }
    if (url === '/company') {
      res.writeHead(302, { location: '/about' })
      res.end('')
      return
    }
    if (url === '/contact') {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(contactHtml)
      return
    }
    if (url === '/home') {
      res.writeHead(302, { location: '/' })
      res.end('')
      return
    }
    if (url === '/broken') {
      res.writeHead(500, { 'content-type': 'text/html' })
      res.end('<!doctype html><html><body>broken</body></html>')
      return
    }
    if (url === '/data') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
      return
    }
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(rootHtml)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const sourceUrl = `http://127.0.0.1:${address.port}/`

  try {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-pipeline-multipage-raw-assembly-'))
    const entryAbs = path.resolve(root, 'index.html')
    const assetsDir = path.resolve(root, 'assets')
    fs.mkdirSync(assetsDir)
    fs.writeFileSync(
      entryAbs,
      `<!doctype html><html><body>
        <header><nav>
          <a href="/about">About</a>
          <a href="/company">Company</a>
          <a href="/contact">Contact</a>
          <a href="/home">Home Redirect</a>
          <a href="/broken">Broken</a>
          <a href="/data">Data</a>
        </nav></header>
      </body></html>`,
      'utf8',
    )

    const pipeline = createSuccessPipelineFixture()
    let createInput: any = null
    let persistedImportSummary: any = null
    let artifactInput: any = null
    let rawImportRows: Array<{ path: string; bytes: Buffer; sha256: string }> = []
    let rawImportMetadata: any = null
    let linkedArtifactId: string | null = null
    let upsertSlotCallCount = 0

    const outcome = await runScopedImportPipeline({
      snapshot: {
        snapshotRootDirAbs: root,
        snapshotStableRootDirAbs: root,
        snapshotId: 'snapshot-raw-assembly',
        snapshotRunId: 'snapshot-run-raw-assembly',
        requestId: 'request-raw-assembly',
        entryHtmlPathAbs: entryAbs,
        assetsDirAbs: assetsDir,
        sourceUrl,
        normalizedUrl: sourceUrl,
        captureMode: 'raw_html_only',
        sourceMode: 'raw_html_fallback',
        sourceSelection: {
          sourceMode: 'raw_html_fallback',
          fidelityStatus: 'degraded_import',
          selectedSourceHtmlPathAbs: entryAbs,
          renderedDomQuality: {
            quality: 'strong',
            bodyTextLength: 120,
            meaningfulNodeCount: 12,
            sectionCandidateCount: 2,
            hasHeading: true,
            reason: 'raw_assembly_fixture',
          },
          rawHtmlQuality: {
            quality: 'strong',
            bodyTextLength: 120,
            meaningfulNodeCount: 12,
            sectionCandidateCount: 2,
            hasHeading: true,
            reason: 'raw_assembly_fixture',
          },
          degraded: false,
        },
        renderedCapture: {
          status: 'unavailable',
          documents: [],
          screenshots: [],
          computedStyleSamples: [],
          diagnostics: [],
        },
        renderedCaptureReliability: { job: null, workerHealth: null },
        importDiagnostics: { summary: { infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0 }, issues: [] },
        fetchManifest: [],
        importIntake: { ok: true, rawHtmlAvailable: true, htmlByteLength: fs.statSync(entryAbs).size },
      } as any,
      sourceUrl,
      actor: 'test:multi-page-raw-assembly',
      multiPageDiscovery: {
        enabled: true,
        acquireHtml: true,
        assembleRawArtifactPages: true,
        generatedAt: '2026-06-06T00:00:00.000Z',
        limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 20, maxTemplateLinksPerRoute: 10 },
        htmlAcquisitionLimits: { maxPages: 10, maxBytesPerPage: 20_000, requestTimeoutMs: 5_000 },
      },
      deps: {
        importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
        createImportManifest: () => ({ status: 'success' }) as any,
        runLinearMigrationPipeline: () => pipeline as any,
        createSiteVersionFromMigration: async (input) => {
          createInput = input
          return { siteId: 'runtime-site-raw-assembly', siteVersionId: 'site-version-raw-assembly', versionNo: 5 }
        },
        setSiteVersionImportProvenanceSummary: async (input) => {
          persistedImportSummary = input
          return { affectedRows: 1 }
        },
        getSiteVersion: async () =>
          ({
            id: 'site-version-raw-assembly',
            siteId: 'runtime-site-raw-assembly',
            versionNo: 5,
            state: 'DRAFT',
            source: 'migration',
            actor: 'test',
            createdAt: '2026-06-06T00:00:00.000Z',
            rendererCompatibilityVersion: 'gnr8-renderer-v1',
            artifactId: linkedArtifactId,
            importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
            pages: [],
          }) as any,
        buildDeterministicArtifactBundle: () =>
          ({
            siteId: 'runtime-site-raw-assembly',
            siteVersionId: 'site-version-raw-assembly',
            rendererCompatibilityVersion: 'gnr8-renderer-v1',
            bundleSha256: 'bundle-sha',
            htmlByPath: { '/': '<!doctype html><html><body>preview only</body></html>' },
            compiledTokenStyles: ':root{}',
            assetFingerprintMap: {},
            manifest: {},
          }) as any,
        createArtifact: async (input) => {
          artifactInput = input
          return { artifactId: 'artifact-raw-assembly' }
        },
        bindArtifactToVersion: async (input) => {
          linkedArtifactId = input.artifactId
          return { affectedRows: 1 }
        },
        persistRawImportedSiteArtifact: async (input) => {
          rawImportRows = input.fileRows.map((row: { path: string; bytes: Buffer; sha256: string }) => ({
            path: row.path,
            bytes: row.bytes,
            sha256: row.sha256,
          }))
          rawImportMetadata = input.metadata
          return {
            artifactId: 'raw-artifact-raw-assembly',
            artifactType: 'raw_imported_site',
            entryHtmlPath: 'index.html',
            assetBasePath: '.',
            fileMap: {},
            fileCount: input.fileRows.length,
          } as any
        },
        upsertContentSlots: async () => {
          upsertSlotCallCount += 1
          return 0
        },
        importHtmlToPage: () => ({}) as any,
        migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
      },
    })

    assert.equal(outcome.mode, 'pipeline')
    assert.equal(outcome.reporting.multiPageDiscovery.rawArtifactAssembly?.enabled, true)
    assert.equal(outcome.reporting.multiPageDiscovery.rawArtifactAssembly?.assembledPageCount, 2)
    assert.equal(outcome.reporting.multiPageDiscovery.rawArtifactAssembly?.excludedPageCount, 3)
    assert.equal(
      outcome.reporting.multiPageDiscovery.rawArtifactAssembly?.routeMapRef,
      'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap',
    )
    assert.deepEqual(Object.keys(artifactInput.htmlByPath), ['/'])
    assert.equal(upsertSlotCallCount, 1)

    const assembly = persistedImportSummary.importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly
    assert.equal(assembly.kind, 'multi_page_raw_artifact_assembly_manifest_v1')
    assert.equal(assembly.generatedAt, '2026-06-06T00:00:00.000Z')
    assert.deepEqual(assembly.htmlPathMap, {
      '/about': 'pages/about/index.html',
      '/contact': 'pages/contact/index.html',
    })
    assert.equal(assembly.routeMap.length, 2)
    assert.equal(assembly.routeMap.find((entry: any) => entry.routePath === '/about').rawFilePath, 'pages/about/index.html')
    assert.equal(assembly.routeMap.find((entry: any) => entry.routePath === '/about').bodySha256, crypto.createHash('sha256').update(aboutHtml).digest('hex'))
    assert.equal(assembly.routeMap.find((entry: any) => entry.routePath === '/contact').byteSize, Buffer.byteLength(contactHtml))
    assert.equal(assembly.excludedPages.some((entry: any) => entry.routePath === '/about' && entry.reason === 'duplicate_route'), true)
    assert.equal(assembly.excludedPages.some((entry: any) => entry.routePath === '/' && entry.reason === 'seed_route_not_overwritten'), true)
    assert.equal(assembly.excludedPages.some((entry: any) => entry.routePath === '/data' && entry.reason === 'acquisition_non_html_content_type'), true)
    assert.equal(assembly.failedPages.some((entry: any) => entry.normalizedRoutePath === '/broken' && entry.failureReason === 'non_2xx_status'), true)
    assert.ok(assembly.diagnostics.includes('MULTIPAGE_RAW_ASSEMBLY_STARTED'))
    assert.ok(assembly.diagnostics.includes('MULTIPAGE_RAW_PAGE_ASSEMBLED'))
    assert.ok(assembly.diagnostics.includes('MULTIPAGE_RAW_PAGE_SKIPPED'))
    assert.ok(assembly.diagnostics.includes('MULTIPAGE_RAW_ROUTE_DUPLICATE'))
    assert.ok(assembly.diagnostics.includes('MULTIPAGE_RAW_ASSEMBLY_MANIFEST_PERSISTED'))
    assert.ok(assembly.diagnostics.includes('MULTIPAGE_RAW_ASSEMBLY_COMPLETED'))

    assert.equal(fs.readFileSync(entryAbs, 'utf8').includes('Home Redirect'), true)
    assert.equal(rawImportRows.some((row) => row.path === 'pages/about/index.html' && row.bytes.toString('utf8') === aboutHtml), true)
    assert.equal(rawImportRows.some((row) => row.path === 'pages/contact/index.html' && row.bytes.toString('utf8') === contactHtml), true)
    assert.equal(rawImportRows.some((row) => row.path === 'multipage-raw-artifact-assembly/manifest.json'), true)
    assert.equal(rawImportMetadata.multiPage.enabled, true)
    assert.equal(rawImportMetadata.multiPage.pageCount, 3)
    assert.equal(rawImportMetadata.multiPage.routeMapRef, 'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap')
    assert.ok(rawImportMetadata.diagnostics.codes.includes('MULTIPAGE_RAW_ASSEMBLY_COMPLETED'))
    assert.ok(persistedImportSummary.importProvenanceSummary.importDiagnosticCodes.includes('MULTIPAGE_RAW_ASSEMBLY_COMPLETED'))
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test('scoped pipeline raw assembly keeps acquisition-accepted apex/www canonical final URLs', async () => {
  const aboutHtml = '<!doctype html><html><body><h1>About canonical host</h1></body></html>'
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-pipeline-multipage-canonical-host-'))
  const entryAbs = path.resolve(root, 'index.html')
  const assetsDir = path.resolve(root, 'assets')
  fs.mkdirSync(assetsDir)
  fs.writeFileSync(
    entryAbs,
    '<!doctype html><html><body><nav><a href="https://example.com/about">About</a></nav></body></html>',
    'utf8',
  )

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request) => {
    const requestedUrl = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
    assert.equal(requestedUrl, 'https://example.com/about')
    const response = new Response(aboutHtml, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
    Object.defineProperty(response, 'url', { value: 'https://www.example.com/about' })
    Object.defineProperty(response, 'redirected', { value: true })
    return response
  }) as typeof fetch

  try {
    const pipeline = createSuccessPipelineFixture()
    let createInput: any = null
    let persistedImportSummary: any = null
    let linkedArtifactId: string | null = null
    let rawImportRows: Array<{ path: string; bytes: Buffer; sha256: string }> = []

    const outcome = await runScopedImportPipeline({
      snapshot: {
        snapshotRootDirAbs: root,
        snapshotStableRootDirAbs: root,
        snapshotId: 'snapshot-canonical-host',
        snapshotRunId: 'snapshot-run-canonical-host',
        requestId: 'request-canonical-host',
        entryHtmlPathAbs: entryAbs,
        assetsDirAbs: assetsDir,
        sourceUrl: 'https://www.example.com/',
        normalizedUrl: 'https://www.example.com/',
        captureMode: 'raw_html_only',
        sourceMode: 'raw_html_fallback',
        sourceSelection: {
          sourceMode: 'raw_html_fallback',
          fidelityStatus: 'degraded_import',
          selectedSourceHtmlPathAbs: entryAbs,
          renderedDomQuality: {
            quality: 'strong',
            bodyTextLength: 80,
            meaningfulNodeCount: 6,
            sectionCandidateCount: 1,
            hasHeading: true,
            reason: 'canonical_host_fixture',
          },
          rawHtmlQuality: {
            quality: 'strong',
            bodyTextLength: 80,
            meaningfulNodeCount: 6,
            sectionCandidateCount: 1,
            hasHeading: true,
            reason: 'canonical_host_fixture',
          },
          degraded: false,
        },
        renderedCapture: {
          status: 'unavailable',
          documents: [],
          screenshots: [],
          computedStyleSamples: [],
          diagnostics: [],
        },
        renderedCaptureReliability: { job: null, workerHealth: null },
        importDiagnostics: { summary: { infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0 }, issues: [] },
        fetchManifest: [],
        importIntake: { ok: true, rawHtmlAvailable: true, htmlByteLength: fs.statSync(entryAbs).size },
      } as any,
      sourceUrl: 'https://www.example.com/',
      actor: 'test:multi-page-canonical-host',
      multiPageDiscovery: {
        enabled: true,
        acquireHtml: true,
        assembleRawArtifactPages: true,
        generatedAt: '2026-06-06T00:00:00.000Z',
        limits: { maxRoutes: 10, maxDepth: 1, maxLinksPerPage: 20, maxTemplateLinksPerRoute: 10 },
        htmlAcquisitionLimits: { maxPages: 10, maxBytesPerPage: 20_000, requestTimeoutMs: 5_000 },
      },
      deps: {
        importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
        createImportManifest: () => ({ status: 'success' }) as any,
        runLinearMigrationPipeline: () => pipeline as any,
        createSiteVersionFromMigration: async (input) => {
          createInput = input
          return { siteId: 'runtime-site-canonical-host', siteVersionId: 'site-version-canonical-host', versionNo: 1 }
        },
        setSiteVersionImportProvenanceSummary: async (input) => {
          persistedImportSummary = input
          return { affectedRows: 1 }
        },
        getSiteVersion: async () =>
          ({
            id: 'site-version-canonical-host',
            siteId: 'runtime-site-canonical-host',
            versionNo: 1,
            state: 'DRAFT',
            source: 'migration',
            actor: 'test',
            createdAt: '2026-06-06T00:00:00.000Z',
            rendererCompatibilityVersion: 'gnr8-renderer-v1',
            artifactId: linkedArtifactId,
            importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
            pages: [],
          }) as any,
        buildDeterministicArtifactBundle: () =>
          ({
            siteId: 'runtime-site-canonical-host',
            siteVersionId: 'site-version-canonical-host',
            rendererCompatibilityVersion: 'gnr8-renderer-v1',
            bundleSha256: 'bundle-sha',
            htmlByPath: { '/': '<!doctype html><html><body>preview only</body></html>' },
            compiledTokenStyles: ':root{}',
            assetFingerprintMap: {},
            manifest: {},
          }) as any,
        createArtifact: async () => ({ artifactId: 'artifact-canonical-host' }),
        bindArtifactToVersion: async (input) => {
          linkedArtifactId = input.artifactId
          return { affectedRows: 1 }
        },
        persistRawImportedSiteArtifact: async (input) => {
          rawImportRows = input.fileRows.map((row: { path: string; bytes: Buffer; sha256: string }) => ({
            path: row.path,
            bytes: row.bytes,
            sha256: row.sha256,
          }))
          return {
            artifactId: 'raw-artifact-canonical-host',
            artifactType: 'raw_imported_site',
            entryHtmlPath: 'index.html',
            assetBasePath: '.',
            fileMap: {},
            fileCount: input.fileRows.length,
          } as any
        },
        upsertContentSlots: async () => 0,
        importHtmlToPage: () => ({}) as any,
        migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
      },
    })

    const discovery = persistedImportSummary.importProvenanceSummary.multiPageDiscovery.manifest
    const acquisition = persistedImportSummary.importProvenanceSummary.multiPageDiscovery.acquisition
    const assembly = persistedImportSummary.importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly

    assert.equal(outcome.mode, 'pipeline')
    assert.equal(outcome.reporting.multiPageDiscovery.discoveredPageCount, 1)
    assert.equal(acquisition.summary.fetchedPageCount, 1)
    assert.equal(acquisition.pages[0].normalizedUrl, 'https://example.com/about')
    assert.equal(acquisition.pages[0].finalUrl, 'https://www.example.com/about')
    assert.equal(assembly.assembledPageCount, 1)
    assert.equal(assembly.excludedPageCount, 0)
    assert.deepEqual(assembly.htmlPathMap, { '/about': 'pages/about/index.html' })
    assert.deepEqual(discovery.routeCandidates, ['/about'])
    assert.equal(assembly.excludedPages.some((entry: any) => entry.reason === 'final_url_not_same_origin'), false)
    assert.ok(acquisition.diagnostics.some((entry: string) => entry.startsWith('MULTIPAGE_FINAL_URL_ACCEPTED_CANONICAL_HOST')))
    assert.ok(assembly.diagnostics.some((entry: string) => entry.startsWith('MULTIPAGE_FINAL_URL_ACCEPTED_CANONICAL_HOST')))
    assert.equal(rawImportRows.some((row) => row.path === 'pages/about/index.html' && row.bytes.toString('utf8') === aboutHtml), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('scoped pipeline rejects HTML acquisition when multi-page discovery is not enabled', async () => {
  const pipeline = createSuccessPipelineFixture()
  await assert.rejects(
    runScopedImportPipeline({
      snapshot: {
        snapshotRootDirAbs: '/tmp/snapshot',
        entryHtmlPathAbs: '/tmp/snapshot/index.html',
        assetsDirAbs: '/tmp/snapshot/assets',
        sourceMode: 'raw_html_fallback',
        sourceSelection: {
          sourceMode: 'raw_html_fallback',
          fidelityStatus: 'degraded_import',
          selectedSourceHtmlPathAbs: '/tmp/snapshot/index.html',
          renderedDomQuality: {
            quality: 'weak',
            bodyTextLength: 80,
            meaningfulNodeCount: 8,
            sectionCandidateCount: 1,
            hasHeading: true,
            reason: 'acquisition_requires_discovery',
          },
          degraded: true,
        },
        renderedCapture: {
          status: 'unavailable',
          screenshots: [],
          computedStyleSamples: [],
        },
        importDiagnostics: {
          issues: [],
        },
      } as any,
      sourceUrl: 'https://example.com/',
      actor: 'test:acquisition-requires-discovery',
      multiPageDiscovery: { acquireHtml: true },
      deps: {
        importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
        createImportManifest: () => ({ status: 'success' }) as any,
        runLinearMigrationPipeline: () => pipeline as any,
      },
    }),
    /HTML acquisition requires multiPageDiscovery\.enabled=true/,
  )
})

test('scoped pipeline rejects raw artifact assembly unless discovery and HTML acquisition are enabled', async () => {
  const pipeline = createSuccessPipelineFixture()
  const baseInput = {
    snapshot: {
      snapshotRootDirAbs: '/tmp/snapshot',
      entryHtmlPathAbs: '/tmp/snapshot/index.html',
      assetsDirAbs: '/tmp/snapshot/assets',
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: '/tmp/snapshot/index.html',
        renderedDomQuality: {
          quality: 'weak',
          bodyTextLength: 80,
          meaningfulNodeCount: 8,
          sectionCandidateCount: 1,
          hasHeading: true,
          reason: 'assembly_requires_acquisition',
        },
        degraded: true,
      },
      renderedCapture: {
        status: 'unavailable',
        screenshots: [],
        computedStyleSamples: [],
      },
      importDiagnostics: {
        issues: [],
      },
    } as any,
    sourceUrl: 'https://example.com/',
    actor: 'test:assembly-requires-acquisition',
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
    },
  }

  await assert.rejects(
    runScopedImportPipeline({
      ...baseInput,
      multiPageDiscovery: { assembleRawArtifactPages: true },
    }),
    /raw artifact assembly requires multiPageDiscovery\.enabled=true/,
  )
  await assert.rejects(
    runScopedImportPipeline({
      ...baseInput,
      multiPageDiscovery: { enabled: true, assembleRawArtifactPages: true },
    }),
    /raw artifact assembly requires multiPageDiscovery\.acquireHtml=true/,
  )
})

test('scoped pipeline import resolves nested snapshot entry and assets paths relative to snapshot root', async () => {
  const pipeline = createSuccessPipelineFixture()
  let capturedImportInput: any = null
  let linkedArtifactId: string | null = null

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: '/tmp/snapshot-root',
      entryHtmlPathAbs: '/tmp/snapshot-root/nested/site/index.html',
      assetsDirAbs: '/tmp/snapshot-root/nested/site/assets',
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: '/tmp/snapshot-root/nested/site/index.html',
        renderedDomQuality: {
          quality: 'weak',
          bodyTextLength: 80,
          meaningfulNodeCount: 8,
          sectionCandidateCount: 1,
          hasHeading: true,
          reason: 'nested_fixture',
        },
        degraded: true,
      },
      renderedCapture: {
        status: 'unavailable',
        screenshots: [],
        computedStyleSamples: [],
      },
      importDiagnostics: {
        issues: [],
      },
    } as any,
    sourceUrl: 'https://example.com/nested',
    actor: 'test:scoped-import-nested',
    deps: {
      importStaticSite: async (input) => {
        capturedImportInput = input
        return { status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } } as any
      },
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async () => ({ siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 1 }),
      setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
      getSiteVersion: async () =>
        ({
          id: 'site-version-1',
          siteId: 'runtime-site',
          versionNo: 1,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: { kind: 'runtime_import_provenance_summary_v1' },
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site',
          siteVersionId: 'site-version-1',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async () => ({ artifactId: 'artifact-1' }),
      bindArtifactToVersion: async (input) => {
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      importHtmlToPage: () => ({}) as any,
      migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
    },
  })

  assert.equal(outcome.mode, 'pipeline')
  assert.ok(capturedImportInput)
  assert.equal(capturedImportInput.rootDir, '/tmp/snapshot-root')
  assert.equal(capturedImportInput.source.entryHtmlPath, 'nested/site/index.html')
  assert.equal(capturedImportInput.source.assetsDirPath, 'nested/site/assets')
})

test('scoped pipeline import passes null assetsDirPath when snapshot assets directory is missing', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-pipeline-missing-assets-'))
  const entryAbs = path.resolve(root, 'index.html')
  fs.writeFileSync(entryAbs, '<!doctype html><html><body>hello</body></html>', 'utf8')

  const pipeline = createSuccessPipelineFixture()
  let capturedImportInput: any = null
  let linkedArtifactId: string | null = null

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: root,
      entryHtmlPathAbs: entryAbs,
      assetsDirAbs: path.resolve(root, 'assets'),
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: entryAbs,
        renderedDomQuality: {
          quality: 'weak',
          bodyTextLength: 80,
          meaningfulNodeCount: 8,
          sectionCandidateCount: 1,
          hasHeading: true,
          reason: 'missing_assets_fixture',
        },
        degraded: true,
      },
      renderedCapture: {
        status: 'unavailable',
        screenshots: [],
        computedStyleSamples: [],
      },
      importDiagnostics: {
        issues: [],
      },
    } as any,
    sourceUrl: 'https://example.com/missing-assets',
    actor: 'test:scoped-import-missing-assets',
    deps: {
      importStaticSite: async (input) => {
        capturedImportInput = input
        return { status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } } as any
      },
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async () => ({ siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 1 }),
      setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
      getSiteVersion: async () =>
        ({
          id: 'site-version-1',
          siteId: 'runtime-site',
          versionNo: 1,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: { kind: 'runtime_import_provenance_summary_v1' },
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site',
          siteVersionId: 'site-version-1',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async () => ({ artifactId: 'artifact-1' }),
      bindArtifactToVersion: async (input) => {
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      importHtmlToPage: () => ({}) as any,
      migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
    },
  })

  assert.equal(outcome.mode, 'pipeline')
  assert.ok(capturedImportInput)
  assert.equal(capturedImportInput.rootDir, root)
  assert.equal(capturedImportInput.source.entryHtmlPath, 'index.html')
  assert.equal(capturedImportInput.source.assetsDirPath, null)
})

test('scoped pipeline import falls back to legacy when pipeline fails', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scoped-pipeline-fallback-'))
  const entryHtmlPath = path.join(tmp, 'index.html')
  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><h1>Fallback</h1></body></html>', 'utf8')
  fs.mkdirSync(path.join(tmp, 'assets'))

  let legacyImportCalls = 0
  let legacyMigrateCalls = 0
  let persistedImportSummary: any = null

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: tmp,
      entryHtmlPathAbs: entryHtmlPath,
      assetsDirAbs: path.join(tmp, 'assets'),
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: path.join(tmp, 'response-html.raw.html'),
        renderedDomQuality: {
          quality: 'weak',
          bodyTextLength: 32,
          meaningfulNodeCount: 7,
          sectionCandidateCount: 1,
          hasHeading: false,
          reason: 'test_fixture',
        },
        degraded: true,
      },
      renderedCapture: {
        status: 'unavailable',
        screenshots: [],
        computedStyleSamples: [],
      },
      importDiagnostics: {
        issues: [{ code: 'RAW_HTML_FALLBACK_USED' }],
      },
    } as any,
    sourceUrl: 'https://fallback.example/',
    actor: 'test:fallback',
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () =>
        ({
          status: 'failed',
          summary: 'pipeline failed',
          diagnostics: [{ code: 'PIPELINE_BLOCKED_BY_IMPORT' }],
          stages: [{ stageId: 'import_intake', summary: 'import failed' }],
          input: { importOutput: { documentMeta: { source: { kind: 'single-entry-html' } } } },
        }) as any,
      createSiteVersionFromMigration: async () => {
        throw new Error('should not be called')
      },
      setSiteVersionImportProvenanceSummary: async (input) => {
        persistedImportSummary = input
        return { affectedRows: 1 }
      },
      getSiteVersion: async () =>
        ({
          id: 'legacy-version',
          siteId: 'legacy-site',
          versionNo: 2,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: null,
          importProvenanceSummary: persistedImportSummary?.importProvenanceSummary ?? { kind: 'runtime_import_provenance_summary_v1' },
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () => ({}) as any,
      createArtifact: async () => ({ artifactId: 'artifact-unused' }),
      bindArtifactToVersion: async () => ({ affectedRows: 1 }),
      importHtmlToPage: () => {
        legacyImportCalls += 1
        return {} as any
      },
      migrateImportedPageToCanonicalDraft: async () => {
        legacyMigrateCalls += 1
        return { siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 2 }
      },
    },
  })

  assert.equal(outcome.mode, 'legacy_fallback')
  assert.equal(outcome.siteVersionId, 'legacy-version')
  assert.equal(outcome.fallbackReason, 'pipeline_failed')
  assert.ok(outcome.diagnostics.pipelineDiagnosticCodes.includes('PIPELINE_BLOCKED_BY_IMPORT'))
  assert.equal(outcome.diagnostics.sourceMode, 'raw_html_fallback')
  assert.equal(outcome.diagnostics.fidelityStatus, 'degraded_import')
  assert.equal(outcome.diagnostics.fidelityDegraded, true)
  assert.equal(persistedImportSummary.siteVersionId, 'legacy-version')
  assert.equal(persistedImportSummary.importProvenanceSummary.sourceMode, 'raw_html_fallback')
  assert.equal(persistedImportSummary.importProvenanceSummary.renderedCaptureStatus, 'failed')
  assert.equal(persistedImportSummary.importProvenanceSummary.screenshotCount, 0)
  assert.equal(persistedImportSummary.importProvenanceSummary.computedStyleSampleCount, 0)
  assert.ok(persistedImportSummary.importProvenanceSummary.importDiagnosticCodes.includes('RENDERED_CAPTURE_SUMMARY_PERSISTED'))
  assert.ok(persistedImportSummary.importProvenanceSummary.importDiagnosticCodes.includes('RENDERED_CAPTURE_FAILED_FALLBACK_USED'))
  assert.ok(persistedImportSummary.importProvenanceSummary.importDiagnosticCodes.includes('IMPORT_FIDELITY_SCORE_COMPUTED'))
  assert.equal(
    persistedImportSummary.importProvenanceSummary.importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK'),
    false,
  )
  assert.equal(persistedImportSummary.importProvenanceSummary.siteTree?.summary.pageCount >= 1, true)
  assert.equal(persistedImportSummary.importProvenanceSummary.siteTree?.summary.rootPageId, 'page_home')
  assert.equal(persistedImportSummary.importProvenanceSummary.templateFamilies?.summary.familyCount >= 1, true)
  assert.equal(outcome.diagnostics.writePath.createdVersionId, 'legacy-version')
  assert.ok(outcome.diagnostics.writePath.provenancePayloadBeforeWrite)
  assert.equal(outcome.diagnostics.writePath.provenanceWriteAttempted, true)
  assert.equal(outcome.diagnostics.writePath.provenanceWriteSucceeded, true)
  assert.equal(outcome.diagnostics.writePath.provenanceWriteAffectedRows, 1)
  assert.equal(outcome.diagnostics.writePath.artifactCreateAttempted, false)
  assert.equal(outcome.diagnostics.writePath.artifactCreatedId, null)
  assert.equal(outcome.diagnostics.writePath.artifactBindAttempted, false)
  assert.equal(outcome.diagnostics.writePath.artifactBindSucceeded, false)
  assert.equal(outcome.diagnostics.writePath.artifactBindAffectedRows, 0)
  assert.equal(outcome.diagnostics.writePath.verifiedVersionIdAfterWrite, 'legacy-version')
  assert.equal(outcome.diagnostics.writePath.verificationRead.versionId, 'legacy-version')
  assert.equal(outcome.diagnostics.writePath.verificationRead.artifactId, null)
  assert.equal(outcome.diagnostics.writePath.verificationRead.hasImportProvenanceSummary, true)
  assert.equal(legacyImportCalls, 1)
  assert.equal(legacyMigrateCalls, 1)
})

test('scoped pipeline persists environment-level rendered capture failure truth', async () => {
  const pipeline = createSuccessPipelineFixture()
  let createInput: any = null
  let linkedArtifactId: string | null = null

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: '/tmp/snapshot',
      entryHtmlPathAbs: '/tmp/snapshot/index.html',
      assetsDirAbs: '/tmp/snapshot/assets',
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: '/tmp/snapshot/response-html.raw.html',
        renderedDomQuality: {
          quality: 'unusable',
          bodyTextLength: 0,
          meaningfulNodeCount: 0,
          sectionCandidateCount: 0,
          hasHeading: false,
          reason: 'env_unsupported',
        },
        degraded: true,
      },
      renderedCapture: {
        status: 'unavailable',
        documents: [],
        screenshots: [],
        computedStyleSamples: [],
        diagnostics: [
          { code: 'RENDERED_CAPTURE_RUNTIME_ENVIRONMENT', details: { runtimeKind: 'edge' } },
          { code: 'PLAYWRIGHT_PACKAGE_CHECK', details: { available: false } },
          { code: 'PLAYWRIGHT_BINARY_CHECK', details: { available: false } },
          {
            code: 'RENDERED_CAPTURE_SUPPORT_DECISION',
            details: {
              supported: false,
              runtimeKind: 'edge',
              browserPackageAvailable: false,
              browserBinaryAvailable: false,
            },
          },
          { code: 'ENVIRONMENT_UNSUPPORTED' },
          { code: 'RENDERED_CAPTURE_UNAVAILABLE' },
        ],
      },
      importDiagnostics: {
        issues: [{ code: 'ENVIRONMENT_UNSUPPORTED' }, { code: 'RAW_HTML_FALLBACK_USED' }],
      },
    } as any,
    sourceUrl: 'https://env-unsupported.example/',
    actor: 'test:env-failure',
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async (input) => {
        createInput = input
        return { siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 8 }
      },
      setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
      getSiteVersion: async () =>
        ({
          id: 'site-version-1',
          siteId: 'runtime-site',
          versionNo: 8,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site',
          siteVersionId: 'site-version-1',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async () => ({ artifactId: 'artifact-1' }),
      bindArtifactToVersion: async (input) => {
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      importHtmlToPage: () => ({}) as any,
      migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
    },
  })

  assert.equal(outcome.mode, 'pipeline')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.environmentStatus, 'unsupported')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.failureCategory, 'environment')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.failureCode, 'ENVIRONMENT_UNSUPPORTED')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.runtimeKind, 'edge')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.environmentSupported, false)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.browserPackageAvailable, false)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.browserBinaryAvailable, false)
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.browserLaunch, 'not_attempted')
  assert.equal(createInput.importProvenanceSummary.renderedCapture.execution.navigation, 'not_attempted')
})

test('scoped pipeline marks worker result superseded when fallback source is selected despite worker evidence', async () => {
  const pipeline = createSuccessPipelineFixture()
  let createInput: any = null
  let linkedArtifactId: string | null = null

  const outcome = await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: '/tmp/snapshot',
      entryHtmlPathAbs: '/tmp/snapshot/index.html',
      assetsDirAbs: '/tmp/snapshot/assets',
      sourceMode: 'raw_html_fallback',
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        selectedSourceHtmlPathAbs: '/tmp/snapshot/response-html.raw.html',
        renderedDomQuality: {
          quality: 'weak',
          bodyTextLength: 22,
          meaningfulNodeCount: 8,
          sectionCandidateCount: 1,
          hasHeading: true,
          reason: 'worker_dom_weak',
        },
        degraded: true,
      },
      renderedCapture: {
        status: 'partial',
        documents: [{ htmlPathAbs: '/tmp/snapshot/rendered-capture/rendered-dom.html' }],
        screenshots: [{ captureType: 'desktop_viewport' }],
        computedStyleSamples: [{ selector: 'body' }],
        diagnostics: [{ code: 'CAPTURE_WORKER_RESULT_OVERRIDDEN_BY_FALLBACK' }],
      },
      importDiagnostics: {
        issues: [{ code: 'CAPTURE_WORKER_RESULT_OVERRIDDEN_BY_FALLBACK' }],
      },
    } as any,
    sourceUrl: 'https://worker-fallback.example/',
    actor: 'test:worker-fallback',
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async (input) => {
        createInput = input
        return { siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 9 }
      },
      setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
      getSiteVersion: async () =>
        ({
          id: 'site-version-1',
          siteId: 'runtime-site',
          versionNo: 9,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site',
          siteVersionId: 'site-version-1',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async () => ({ artifactId: 'artifact-1' }),
      bindArtifactToVersion: async (input) => {
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      importHtmlToPage: () => ({}) as any,
      migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
    },
  })

  assert.equal(outcome.mode, 'pipeline')
  assert.equal(createInput.importProvenanceSummary.sourceMode, 'raw_html_fallback')
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK'))
  assert.ok(createInput.importProvenanceSummary.importDiagnosticCodes.includes('RENDERED_CAPTURE_SUMMARY_PERSISTED'))
})

test('scoped pipeline import fails hard when artifact bind does not persist on created version row', async () => {
  const pipeline = createSuccessPipelineFixture()
  let getSiteVersionCalls = 0

  await assert.rejects(
    () =>
      runScopedImportPipeline({
        snapshot: {
          snapshotRootDirAbs: '/tmp/snapshot',
          entryHtmlPathAbs: '/tmp/snapshot/index.html',
          assetsDirAbs: '/tmp/snapshot/assets',
          sourceMode: 'rendered_dom',
          sourceSelection: {
            sourceMode: 'rendered_dom',
            fidelityStatus: 'high_fidelity_import',
            selectedSourceHtmlPathAbs: '/tmp/snapshot/rendered-capture/rendered-dom.html',
            renderedDomQuality: {
              quality: 'strong',
              bodyTextLength: 280,
              meaningfulNodeCount: 40,
              sectionCandidateCount: 3,
              hasHeading: true,
              reason: 'test_fixture',
            },
            degraded: false,
          },
          renderedCapture: {
            status: 'available',
            screenshots: [{}, {}],
            computedStyleSamples: [{}, {}, {}],
          },
          importDiagnostics: {
            issues: [],
          },
        } as any,
        sourceUrl: 'https://example.com/',
        actor: 'test:scoped-import',
        deps: {
          importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
          createImportManifest: () => ({ status: 'success' }) as any,
          runLinearMigrationPipeline: () => pipeline as any,
          createSiteVersionFromMigration: async () => ({ siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 7 }),
          setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
          getSiteVersion: async () => {
            getSiteVersionCalls += 1
            return {
              id: 'site-version-1',
              siteId: 'runtime-site',
              versionNo: 7,
              state: 'DRAFT',
              source: 'migration',
              actor: 'test',
              createdAt: new Date().toISOString(),
              rendererCompatibilityVersion: 'gnr8-renderer-v1',
              artifactId: getSiteVersionCalls >= 2 ? null : null,
              importProvenanceSummary: { kind: 'runtime_import_provenance_summary_v1' },
              pages: [],
            } as any
          },
          buildDeterministicArtifactBundle: () =>
            ({
              siteId: 'runtime-site',
              siteVersionId: 'site-version-1',
              rendererCompatibilityVersion: 'gnr8-renderer-v1',
              bundleSha256: 'bundle-sha',
              htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
              compiledTokenStyles: ':root{}',
              assetFingerprintMap: {},
              manifest: {},
            }) as any,
          createArtifact: async () => ({ artifactId: 'artifact-1' }),
          bindArtifactToVersion: async () => ({ affectedRows: 1 }),
          importHtmlToPage: () => ({} as any),
          migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
        },
      }),
    /Artifact bind verification failed/,
  )
})

test('scoped pipeline import fails hard when provenance write affects zero rows', async () => {
  const pipeline = createSuccessPipelineFixture()

  await assert.rejects(
    () =>
      runScopedImportPipeline({
        snapshot: {
          snapshotRootDirAbs: '/tmp/snapshot',
          entryHtmlPathAbs: '/tmp/snapshot/index.html',
          assetsDirAbs: '/tmp/snapshot/assets',
          sourceMode: 'rendered_dom',
          sourceSelection: {
            sourceMode: 'rendered_dom',
            fidelityStatus: 'high_fidelity_import',
            selectedSourceHtmlPathAbs: '/tmp/snapshot/rendered-capture/rendered-dom.html',
            renderedDomQuality: {
              quality: 'strong',
              bodyTextLength: 280,
              meaningfulNodeCount: 40,
              sectionCandidateCount: 3,
              hasHeading: true,
              reason: 'test_fixture',
            },
            degraded: false,
          },
          renderedCapture: {
            status: 'available',
            screenshots: [{}, {}],
            computedStyleSamples: [{}, {}, {}],
          },
          importDiagnostics: {
            issues: [],
          },
        } as any,
        sourceUrl: 'https://example.com/',
        actor: 'test:scoped-import',
        deps: {
          importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
          createImportManifest: () => ({ status: 'success' }) as any,
          runLinearMigrationPipeline: () => pipeline as any,
          createSiteVersionFromMigration: async () => ({ siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 7 }),
          setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 0 }),
          getSiteVersion: async () => null as any,
          buildDeterministicArtifactBundle: () => ({} as any),
          createArtifact: async () => ({ artifactId: 'artifact-1' }),
          bindArtifactToVersion: async () => ({ affectedRows: 1 }),
          importHtmlToPage: () => ({} as any),
          migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
        },
      }),
    /Provenance write affected 0 rows/,
  )
})

test('scoped pipeline import fails hard when artifact bind affects zero rows', async () => {
  const pipeline = createSuccessPipelineFixture()

  await assert.rejects(
    () =>
      runScopedImportPipeline({
        snapshot: {
          snapshotRootDirAbs: '/tmp/snapshot',
          entryHtmlPathAbs: '/tmp/snapshot/index.html',
          assetsDirAbs: '/tmp/snapshot/assets',
          sourceMode: 'rendered_dom',
          sourceSelection: {
            sourceMode: 'rendered_dom',
            fidelityStatus: 'high_fidelity_import',
            selectedSourceHtmlPathAbs: '/tmp/snapshot/rendered-capture/rendered-dom.html',
            renderedDomQuality: {
              quality: 'strong',
              bodyTextLength: 280,
              meaningfulNodeCount: 40,
              sectionCandidateCount: 3,
              hasHeading: true,
              reason: 'test_fixture',
            },
            degraded: false,
          },
          renderedCapture: {
            status: 'available',
            screenshots: [{}, {}],
            computedStyleSamples: [{}, {}, {}],
          },
          importDiagnostics: {
            issues: [],
          },
        } as any,
        sourceUrl: 'https://example.com/',
        actor: 'test:scoped-import',
        deps: {
          importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
          createImportManifest: () => ({ status: 'success' }) as any,
          runLinearMigrationPipeline: () => pipeline as any,
          createSiteVersionFromMigration: async () => ({ siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 7 }),
          setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
          getSiteVersion: async () =>
            ({
              id: 'site-version-1',
              siteId: 'runtime-site',
              versionNo: 7,
              state: 'DRAFT',
              source: 'migration',
              actor: 'test',
              createdAt: new Date().toISOString(),
              rendererCompatibilityVersion: 'gnr8-renderer-v1',
              artifactId: null,
              importProvenanceSummary: { kind: 'runtime_import_provenance_summary_v1' },
              pages: [],
            }) as any,
          buildDeterministicArtifactBundle: () =>
            ({
              siteId: 'runtime-site',
              siteVersionId: 'site-version-1',
              rendererCompatibilityVersion: 'gnr8-renderer-v1',
              bundleSha256: 'bundle-sha',
              htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
              compiledTokenStyles: ':root{}',
              assetFingerprintMap: {},
              manifest: {},
            }) as any,
          createArtifact: async () => ({ artifactId: 'artifact-1' }),
          bindArtifactToVersion: async () => ({ affectedRows: 0 }),
          importHtmlToPage: () => ({} as any),
          migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
        },
      }),
    /Artifact bind affected 0 rows/,
  )
})

test('scoped pipeline import fails hard when provenance summary is missing after write', async () => {
  const pipeline = createSuccessPipelineFixture()
  let getSiteVersionCalls = 0

  await assert.rejects(
    () =>
      runScopedImportPipeline({
        snapshot: {
          snapshotRootDirAbs: '/tmp/snapshot',
          entryHtmlPathAbs: '/tmp/snapshot/index.html',
          assetsDirAbs: '/tmp/snapshot/assets',
          sourceMode: 'rendered_dom',
          sourceSelection: {
            sourceMode: 'rendered_dom',
            fidelityStatus: 'high_fidelity_import',
            selectedSourceHtmlPathAbs: '/tmp/snapshot/rendered-capture/rendered-dom.html',
            renderedDomQuality: {
              quality: 'strong',
              bodyTextLength: 280,
              meaningfulNodeCount: 40,
              sectionCandidateCount: 3,
              hasHeading: true,
              reason: 'test_fixture',
            },
            degraded: false,
          },
          renderedCapture: {
            status: 'available',
            screenshots: [{}, {}],
            computedStyleSamples: [{}, {}, {}],
          },
          importDiagnostics: {
            issues: [],
          },
        } as any,
        sourceUrl: 'https://example.com/',
        actor: 'test:scoped-import',
        deps: {
          importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
          createImportManifest: () => ({ status: 'success' }) as any,
          runLinearMigrationPipeline: () => pipeline as any,
          createSiteVersionFromMigration: async () => ({ siteId: 'runtime-site', siteVersionId: 'site-version-1', versionNo: 7 }),
          setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
          getSiteVersion: async () => {
            getSiteVersionCalls += 1
            return {
              id: 'site-version-1',
              siteId: 'runtime-site',
              versionNo: 7,
              state: 'DRAFT',
              source: 'migration',
              actor: 'test',
              createdAt: new Date().toISOString(),
              rendererCompatibilityVersion: 'gnr8-renderer-v1',
              artifactId: getSiteVersionCalls >= 2 ? 'artifact-1' : null,
              importProvenanceSummary: getSiteVersionCalls >= 2 ? null : { kind: 'runtime_import_provenance_summary_v1' },
              pages: [],
            } as any
          },
          buildDeterministicArtifactBundle: () =>
            ({
              siteId: 'runtime-site',
              siteVersionId: 'site-version-1',
              rendererCompatibilityVersion: 'gnr8-renderer-v1',
              bundleSha256: 'bundle-sha',
              htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
              compiledTokenStyles: ':root{}',
              assetFingerprintMap: {},
              manifest: {},
            }) as any,
          createArtifact: async () => ({ artifactId: 'artifact-1' }),
          bindArtifactToVersion: async () => ({ affectedRows: 1 }),
          importHtmlToPage: () => ({} as any),
          migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
        },
      }),
    /Import provenance summary missing after write/,
  )
})

test('canonical input uses semantic import sections when prepared semantic sections are unavailable', () => {
  const preparedSite = {
    source: {
      entryHtmlPath: 'nested/site/index.html',
    },
    documents: [
      {
        id: 'doc-1',
        path: 'nested/site/index.html',
        isEntry: true,
        semantic: {
          sections: [],
          consolidation: { mode: 'none' },
          page: { pageType: 'unknown' },
        },
        fidelity: { metaDescription: 'Imported page' },
      },
    ],
  } as any

  const canonical = __scopedImportPipelineTestUtils.buildCanonicalMigrationInputFromPipeline({
    sourceUrl: 'https://example.com/',
    actor: 'test',
    preparedSite,
    layoutModel: { pages: [] } as any,
    snapshot: {
      sourceSelection: {
        sourceMode: 'raw_html_fallback',
        fidelityStatus: 'degraded_import',
        renderedDomQuality: { quality: 'weak' },
      },
      renderedCapture: { screenshots: [], computedStyleSamples: [] },
      importDiagnostics: { issues: [] },
      semanticImport: {
        sourceMode: 'raw_html_only',
        captureMode: 'raw_html_only',
        title: 'Example',
        language: 'en',
        navigation: [],
        hero: null,
        sections: [
          {
            id: 'sem-hero',
            type: 'hero',
            title: 'Hero',
            intro: 'Intro',
            items: [],
            images: [],
            ctas: [],
            forms: [],
            confidence: 0.91,
            diagnostics: [],
          },
          {
            id: 'sem-ambiguous',
            type: 'services',
            title: 'Services',
            intro: 'Ambiguous section',
            items: [],
            images: [],
            ctas: [],
            forms: [],
            confidence: 0.42,
            diagnostics: ['LOW_CONFIDENCE_SECTION_CLASSIFICATION'],
          },
        ],
        assets: {
          images: [],
          groupedByRole: {
            logo: [],
            hero_image: [],
            gallery_image: [],
            service_image: [],
            testimonial_avatar: [],
            content_image: [],
            icon: [],
            unknown: [],
          },
          knownAssets: [],
        },
        diagnostics: [],
      },
    } as any,
    styleSignals: {
      sourceMode: 'html_css_inference',
      provenance: { computedStyle: { coverage: 0 }, fallbackUsed: true },
      colors: { backgroundTone: 'neutral', primaryAccent: null },
      typography: { headingCategory: 'sans', bodyCategory: 'sans' },
      spacing: { rhythm: 'balanced', layoutDensity: 'balanced' },
      cta: { styleHint: 'unknown', prominence: 'unknown' },
      diagnostics: [],
    } as any,
  })

  const sections = canonical.pages[0]?.structureModel.sections ?? []
  assert.equal(canonical.pages[0]?.path, '/')
  assert.equal(sections.length, 2)
  assert.equal(sections[0]?.type, 'hero')
  assert.equal(sections[1]?.type, 'content')
})

test('canonical input preserves inferred nested entry path when raw_html_only semantic forcing is not active', () => {
  const preparedSite = {
    source: {
      entryHtmlPath: 'nested/site/index.html',
    },
    documents: [
      {
        id: 'doc-1',
        path: 'nested/site/index.html',
        isEntry: true,
        semantic: {
          sections: [],
          consolidation: { mode: 'none' },
          page: { pageType: 'unknown' },
        },
        fidelity: { metaDescription: 'Imported page' },
      },
    ],
  } as any

  const canonical = __scopedImportPipelineTestUtils.buildCanonicalMigrationInputFromPipeline({
    sourceUrl: 'https://example.com/nested/site',
    actor: 'test',
    preparedSite,
    layoutModel: { pages: [] } as any,
    snapshot: {
      captureMode: 'dom_parsed',
      sourceSelection: {
        sourceMode: 'rendered_dom',
        fidelityStatus: 'high_fidelity_import',
        renderedDomQuality: { quality: 'strong' },
      },
      renderedCapture: { screenshots: [], computedStyleSamples: [] },
      importDiagnostics: { issues: [] },
    } as any,
    styleSignals: {
      sourceMode: 'html_css_inference',
      provenance: { computedStyle: { coverage: 0 }, fallbackUsed: true },
      colors: { backgroundTone: 'neutral', primaryAccent: null },
      typography: { headingCategory: 'sans', bodyCategory: 'sans' },
      spacing: { rhythm: 'balanced', layoutDensity: 'balanced' },
      cta: { styleHint: 'unknown', prominence: 'unknown' },
      diagnostics: [],
    } as any,
  })

  assert.equal(canonical.pages[0]?.path, '/nested/site')
})

test('scoped pipeline forwards preallocated runtime identity to migration write path', async () => {
  const pipeline = createSuccessPipelineFixture()
  let createInput: any = null
  let linkedArtifactId: string | null = null

  await runScopedImportPipeline({
    snapshot: {
      snapshotRootDirAbs: '/tmp/snapshot-root',
      entryHtmlPathAbs: '/tmp/snapshot-root/index.html',
      assetsDirAbs: '/tmp/snapshot-root/assets',
      sourceMode: 'rendered_dom',
      sourceSelection: {
        sourceMode: 'rendered_dom',
        fidelityStatus: 'high_fidelity_import',
        selectedSourceHtmlPathAbs: '/tmp/snapshot-root/index.html',
        renderedDomQuality: { quality: 'strong' },
        degraded: false,
      },
      renderedCapture: { status: 'available', screenshots: [], computedStyleSamples: [] },
      importDiagnostics: { issues: [] },
      renderedCaptureReliability: { job: null, workerHealth: null },
      fetchManifest: [],
      sourceUrl: 'https://example.com/',
    } as any,
    sourceUrl: 'https://example.com/',
    actor: 'test:scoped-import',
    runtimeIdentity: {
      siteId: 'runtime-site-preallocated',
      siteVersionId: '11111111-1111-4111-8111-111111111111',
    },
    deps: {
      importStaticSite: async () => ({ status: 'ok', documentMeta: { source: { kind: 'single-entry-html' } } }) as any,
      createImportManifest: () => ({ status: 'success' }) as any,
      runLinearMigrationPipeline: () => pipeline as any,
      createSiteVersionFromMigration: async (input) => {
        createInput = input
        return { siteId: 'runtime-site-preallocated', siteVersionId: '11111111-1111-4111-8111-111111111111', versionNo: 7 }
      },
      setSiteVersionImportProvenanceSummary: async () => ({ affectedRows: 1 }),
      getSiteVersion: async () =>
        ({
          id: '11111111-1111-4111-8111-111111111111',
          siteId: 'runtime-site-preallocated',
          versionNo: 7,
          state: 'DRAFT',
          source: 'migration',
          actor: 'test',
          createdAt: new Date().toISOString(),
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          artifactId: linkedArtifactId,
          importProvenanceSummary: createInput?.importProvenanceSummary ?? null,
          pages: [],
        }) as any,
      buildDeterministicArtifactBundle: () =>
        ({
          siteId: 'runtime-site-preallocated',
          siteVersionId: '11111111-1111-4111-8111-111111111111',
          rendererCompatibilityVersion: 'gnr8-renderer-v1',
          bundleSha256: 'bundle-sha',
          htmlByPath: { '/': '<!doctype html><html><body>preview</body></html>' },
          compiledTokenStyles: ':root{}',
          assetFingerprintMap: {},
          manifest: {},
        }) as any,
      createArtifact: async () => ({ artifactId: 'artifact-1' }),
      bindArtifactToVersion: async (input) => {
        linkedArtifactId = input.artifactId
        return { affectedRows: 1 }
      },
      persistRawImportedSiteArtifact: async () => ({ artifactId: 'raw-artifact-1', fileCount: 1 }),
      importHtmlToPage: () => ({} as any),
      migrateImportedPageToCanonicalDraft: async () => ({ siteId: 'legacy-site', siteVersionId: 'legacy-version', versionNo: 1 }),
    },
  })

  assert.ok(createInput)
  assert.equal(createInput.siteId, 'runtime-site-preallocated')
  assert.equal(createInput.siteVersionId, '11111111-1111-4111-8111-111111111111')
})
