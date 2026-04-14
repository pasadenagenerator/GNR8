import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { runScopedImportPipeline } from '@/gnr8/site/scoped-import-pipeline'

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
  assert.equal(createInput.importProvenanceSummary.importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK'), false)
  assert.equal(persistedImportSummary.siteVersionId, 'site-version-1')
  assert.equal(persistedImportSummary.importProvenanceSummary.renderedCaptureStatus, 'partial')
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
  assert.equal(
    persistedImportSummary.importProvenanceSummary.importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK'),
    false,
  )
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
