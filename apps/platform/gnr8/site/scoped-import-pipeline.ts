import fs from 'node:fs'
import path from 'node:path'

import { createImportManifest } from '@/gnr8/import/import-manifest'
import { importStaticSite } from '@/gnr8/import/runtime/import-static-site'
import { runLinearMigrationPipeline } from '@/gnr8/migration/runtime/run-linear-migration-pipeline'
import type { LinearMigrationPipelineResult } from '@/gnr8/migration/pipeline-contract'
import type { LayoutPreparationModel } from '@/gnr8/migration/layout-preparation-model'
import type { PreparedSiteModel, SectionSemanticModel } from '@/gnr8/migration/prepared-site-model'
import type { RenderOutput } from '@/gnr8/migration/render-output-model'
import type { PreviewDocument } from '@/gnr8/migration/preview-document-model'
import { importHtmlToPage } from '@/gnr8/importer/html-to-page'
import { migrateImportedPageToCanonicalDraft } from '@/gnr8/runtime/migration-factory'
import { buildDeterministicArtifactBundle } from '@/gnr8/runtime/artifact-builder'
import { deterministicId, normalizePagePath } from '@/gnr8/runtime/deterministic'
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getSiteVersion,
  setSiteVersionImportProvenanceSummary,
} from '@/gnr8/runtime/runtime-store'
import {
  RENDERER_COMPATIBILITY_VERSION,
  type CanonicalPageVersionInput,
  type CanonicalSiteMigrationInput,
  type RuntimeImportProvenanceSummary,
} from '@/gnr8/runtime/types'
import type { UrlSinglePageImportSnapshot } from '@/gnr8/validation/runtime/url-single-page-import'
import type { VisualAnalysisModel } from '@/gnr8/visual-analysis/visual-analysis-model'
import {
  extractStyleSignalModel,
  styleSignalsToSemanticLabels,
  styleSignalsToStyleTokens,
  type StyleSignalModel,
} from '@/gnr8/style-signals'

const SECTION_INTENT_BY_SEMANTIC_TYPE: Record<string, string> = {
  header: 'header_nav',
  navigation: 'header_nav',
  hero: 'hero',
  cta: 'form_contact',
  contact: 'form_contact',
  gallery: 'gallery_media',
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function toCoverage(input: { sampleCount: number; expectedCount?: number }): number {
  const expectedCount = Math.max(1, Math.floor(input.expectedCount ?? 10))
  const sampleCount = Math.max(0, Math.floor(input.sampleCount))
  return Number((sampleCount / expectedCount).toFixed(3))
}

function buildRenderedCaptureExecutionFromSnapshot(snapshot: UrlSinglePageImportSnapshot): RuntimeImportProvenanceSummary['renderedCapture']['execution'] {
  const renderedDiagnostics = Array.isArray(snapshot.renderedCapture.diagnostics) ? snapshot.renderedCapture.diagnostics : []
  const renderedDocuments = Array.isArray(snapshot.renderedCapture.documents) ? snapshot.renderedCapture.documents : []
  const renderedScreenshots = Array.isArray(snapshot.renderedCapture.screenshots) ? snapshot.renderedCapture.screenshots : []
  const renderedStyleSamples = Array.isArray(snapshot.renderedCapture.computedStyleSamples) ? snapshot.renderedCapture.computedStyleSamples : []
  const codes = new Set(
    renderedDiagnostics
      .map((entry) => normalizeText(entry?.code))
      .filter(Boolean),
  )
  const hasCode = (code: string): boolean => codes.has(code)
  const firstCode = (candidates: string[]): string | null => candidates.find((code) => hasCode(code)) ?? null
  const firstDetails = (code: string): Record<string, unknown> | null => {
    for (const entry of renderedDiagnostics) {
      if (normalizeText(entry?.code) !== code) continue
      if (!entry?.details || typeof entry.details !== 'object' || Array.isArray(entry.details)) continue
      return entry.details as Record<string, unknown>
    }
    return null
  }
  const runtimeProbeDetails = firstDetails('RENDERED_CAPTURE_RUNTIME_ENVIRONMENT')
  const supportDecisionDetails = firstDetails('RENDERED_CAPTURE_SUPPORT_DECISION')
  const packageCheckDetails = firstDetails('PLAYWRIGHT_PACKAGE_CHECK')
  const binaryCheckDetails = firstDetails('PLAYWRIGHT_BINARY_CHECK')
  const runtimeKindRaw =
    normalizeText(supportDecisionDetails?.runtimeKind) || normalizeText(runtimeProbeDetails?.runtimeKind) || normalizeText(runtimeProbeDetails?.runtime)
  const runtimeKind: RuntimeImportProvenanceSummary['renderedCapture']['execution']['runtimeKind'] =
    runtimeKindRaw === 'nodejs' || runtimeKindRaw === 'edge' ? runtimeKindRaw : 'unknown'
  const boolOrNull = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null)

  const environmentStatus: RuntimeImportProvenanceSummary['renderedCapture']['execution']['environmentStatus'] =
    hasCode('PLAYWRIGHT_IMPORT_FAILED') ||
    hasCode('PLAYWRIGHT_BROWSER_LAUNCH_FAILED') ||
    hasCode('PLAYWRIGHT_BROWSER_CONTEXT_FAILED') ||
    hasCode('PLAYWRIGHT_LAUNCH_TIMEOUT') ||
    hasCode('PLAYWRIGHT_EXECUTABLE_MISSING') ||
    hasCode('PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED') ||
    hasCode('ENVIRONMENT_UNSUPPORTED') ||
    hasCode('RENDERED_CAPTURE_UNAVAILABLE')
      ? 'unsupported'
      : hasCode('BROWSER_LAUNCH_SUCCEEDED') || hasCode('NAVIGATION_SUCCEEDED')
        ? 'supported'
        : 'unknown'
  const environmentSupported =
    boolOrNull(supportDecisionDetails?.supported) ?? (environmentStatus === 'supported' ? true : environmentStatus === 'unsupported' ? false : false)
  const browserPackageAvailable =
    boolOrNull(packageCheckDetails?.available) ?? boolOrNull(supportDecisionDetails?.browserPackageAvailable) ?? !hasCode('ENVIRONMENT_UNSUPPORTED')
  const browserBinaryAvailable = boolOrNull(binaryCheckDetails?.available) ?? boolOrNull(supportDecisionDetails?.browserBinaryAvailable) ?? false
  const browserLaunch: RuntimeImportProvenanceSummary['renderedCapture']['execution']['browserLaunch'] = hasCode('BROWSER_LAUNCH_FAILED')
    ? 'failed'
    : hasCode('BROWSER_LAUNCH_SUCCEEDED')
      ? 'succeeded'
      : 'not_attempted'
  const navigation: RuntimeImportProvenanceSummary['renderedCapture']['execution']['navigation'] = hasCode('NAVIGATION_FAILED')
    ? 'failed'
    : hasCode('NAVIGATION_SUCCEEDED')
      ? 'succeeded'
      : 'not_attempted'
  const dom: RuntimeImportProvenanceSummary['renderedCapture']['execution']['dom'] =
    renderedDocuments.length > 0
      ? 'captured'
      : hasCode('DOM_EMPTY_AFTER_RENDER') || hasCode('RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION') || hasCode('NAVIGATION_SUCCEEDED')
        ? 'empty_or_failed'
        : 'not_attempted'
  const screenshot: RuntimeImportProvenanceSummary['renderedCapture']['execution']['screenshot'] =
    renderedScreenshots.length > 0 ? 'captured' : 'none'
  const styleSampling: RuntimeImportProvenanceSummary['renderedCapture']['execution']['styleSampling'] =
    renderedStyleSamples.length > 0
      ? 'captured'
      : hasCode('STYLE_SAMPLING_FAILED') || hasCode('RENDERED_CAPTURE_STYLE_SAMPLING_FAILED') || hasCode('STYLE_SAMPLING_STARTED')
        ? 'failed_or_empty'
        : 'not_attempted'

  if (environmentStatus === 'unsupported') {
    return {
      runtimeKind,
      environmentSupported,
      browserPackageAvailable,
      browserBinaryAvailable,
      environmentStatus,
      failureCategory: 'environment',
      failureCode: firstCode([
        'PLAYWRIGHT_IMPORT_FAILED',
        'PLAYWRIGHT_BROWSER_LAUNCH_FAILED',
        'PLAYWRIGHT_BROWSER_CONTEXT_FAILED',
        'PLAYWRIGHT_LAUNCH_TIMEOUT',
        'PLAYWRIGHT_EXECUTABLE_MISSING',
        'PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED',
        'ENVIRONMENT_UNSUPPORTED',
        'RENDERED_CAPTURE_UNAVAILABLE',
      ]),
      browserLaunch,
      navigation,
      dom,
      screenshot,
      styleSampling,
    }
  }

  const pageFailureCode = firstCode([
    'BROWSER_LAUNCH_FAILED',
    'RENDERED_CAPTURE_BROWSER_START_FAILED',
    'NAVIGATION_FAILED',
    'BROWSER_NAVIGATION_FAILED',
    'DOM_EMPTY_AFTER_RENDER',
    'RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION',
    'STYLE_SAMPLING_FAILED',
    'RENDERED_CAPTURE_STYLE_SAMPLING_FAILED',
    'SCREENSHOT_FAILED',
    'SCREENSHOT_CAPTURE_FAILED',
  ])
  const failureCategory: RuntimeImportProvenanceSummary['renderedCapture']['execution']['failureCategory'] =
    pageFailureCode || snapshot.renderedCapture.status === 'failed' ? 'page' : 'none'

  return {
    runtimeKind,
    environmentSupported,
    browserPackageAvailable,
    browserBinaryAvailable,
    environmentStatus,
    failureCategory,
    failureCode: failureCategory === 'none' ? null : pageFailureCode,
    browserLaunch,
    navigation,
    dom,
    screenshot,
    styleSampling,
  }
}

function resolveRenderedCaptureStatus(snapshot: UrlSinglePageImportSnapshot): 'available' | 'partial' | 'failed' {
  if (snapshot.renderedCapture.status === 'failed' || snapshot.renderedCapture.status === 'unavailable') return 'failed'
  const documents = Array.isArray(snapshot.renderedCapture.documents) ? snapshot.renderedCapture.documents : []
  const screenshots = Array.isArray(snapshot.renderedCapture.screenshots) ? snapshot.renderedCapture.screenshots : []
  const computedStyleSamples = Array.isArray(snapshot.renderedCapture.computedStyleSamples) ? snapshot.renderedCapture.computedStyleSamples : []
  const hasDoc = documents.length > 0
  const hasViewport = screenshots.some((shot) => shot.captureType === 'desktop_viewport')
  const hasFull = screenshots.some((shot) => shot.captureType === 'desktop_fullpage')
  const styleCoverage = toCoverage({ sampleCount: computedStyleSamples.length })
  const strongQuality = snapshot.sourceSelection.renderedDomQuality.quality === 'strong'
  if (hasDoc && hasViewport && hasFull && strongQuality && styleCoverage >= 0.2) return 'available'
  return 'partial'
}

function inferPagePathFromSourcePath(sourcePath: string): string {
  const normalized = normalizeText(sourcePath).replaceAll('\\\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized === 'index.html') return '/'
  if (normalized.endsWith('/index.html')) {
    const withoutIndex = normalized.slice(0, -'/index.html'.length)
    return normalizePagePath(`/${withoutIndex}`)
  }
  if (normalized.endsWith('.html') || normalized.endsWith('.htm')) {
    return normalizePagePath(`/${normalized.replace(/\.html?$/i, '')}`)
  }
  return normalizePagePath(`/${normalized}`)
}

function resolveSiteId(sourceUrl: string, entryPath: string): string {
  const testPrefix = String(process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX ?? '').trim()
  const seed = `${sourceUrl}|${entryPath}`
  if (testPrefix) return deterministicId(testPrefix, seed)
  return deterministicId('site', seed)
}

function confidenceToScore(confidence: string): number {
  if (confidence === 'high') return 0.9
  if (confidence === 'medium') return 0.7
  return 0.45
}

function pickTitleFromSemantic(pageType: string | null, sourcePath: string): string {
  if (pageType && pageType !== 'unknown') return pageType.replaceAll('_', ' ')
  return inferPagePathFromSourcePath(sourcePath) === '/' ? 'Home' : path.basename(sourcePath, path.extname(sourcePath)) || 'Page'
}

function extractImageSrcsFromMarkup(markup: string | null): string[] {
  if (!markup) return []
  const out: string[] = []
  const re = /<img[^>]*\ssrc=["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(markup)) !== null) {
    const src = normalizeText(match[1])
    if (!src) continue
    out.push(src)
    if (out.length >= 20) break
  }
  return uniqueSorted(out)
}

function extractLinksFromMarkup(markup: string | null): Array<{ href: string; label: string }> {
  if (!markup) return []
  const out: Array<{ href: string; label: string }> = []
  const seen = new Set<string>()
  const re = /<a[^>]*\shref=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis
  let match: RegExpExecArray | null
  while ((match = re.exec(markup)) !== null) {
    const href = normalizeText(match[1])
    const label = normalizeText(String(match[2] ?? '').replace(/<[^>]+>/g, ' '))
    if (!href || !label) continue
    const key = `${href}::${label}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ href, label })
    if (out.length >= 20) break
  }
  return out
}

function findPipelineStage<T>(pipeline: LinearMigrationPipelineResult, stageId: string): T | null {
  const stage = pipeline.stages.find((entry) => entry.stageId === stageId)
  if (!stage) return null
  return (stage.output as T) ?? null
}

function mapSectionsFromSemantic(input: {
  semanticSections: SectionSemanticModel[]
  blockById: Map<string, { textExcerpt: string | null; preservedMarkupHtml: string | null }>
}): Array<{ id: string; type: string; order: number; props: Record<string, unknown> }> {
  const ordered = [...input.semanticSections].sort((a, b) => a.ordinalIndex - b.ordinalIndex)
  return ordered.map((section, index) => {
    const blocks = section.blockIds.map((blockId) => input.blockById.get(blockId)).filter(Boolean)
    const textExcerpt = normalizeText(
      blocks
        .map((block) => normalizeText(block?.textExcerpt))
        .filter(Boolean)
        .join(' '),
    )
    const preservedMarkupHtml = blocks.find((block) => normalizeText(block?.preservedMarkupHtml))?.preservedMarkupHtml ?? null

    return {
      id: section.sectionId,
      type: section.inferredType === 'unknown' ? 'content' : section.inferredType,
      order: Number.isFinite(section.ordinalIndex) ? section.ordinalIndex : index,
      props: {
        semanticType: section.inferredType,
        confidence: section.confidence,
        rationale: section.rationale,
        dominantRationale: section.dominantRationale,
        classificationDiagnostics: section.classificationDiagnostics,
        sourceDomPaths: section.sourceDomPaths,
        blockIds: section.blockIds,
        mergedBlockCount: section.consolidatedBlockCount,
        candidateSignals: section.candidateSignals,
        layoutStructural: {
          intent: SECTION_INTENT_BY_SEMANTIC_TYPE[section.inferredType] ?? 'body',
          structuralConfidence: confidenceToScore(section.confidence),
        },
        htmlSummary: {
          extractedText: textExcerpt,
          extractedImageSrcs: extractImageSrcsFromMarkup(preservedMarkupHtml),
          extractedLinks: extractLinksFromMarkup(preservedMarkupHtml),
        },
        preservedMarkupHtml,
      },
    }
  })
}

function baselineStyleTokens(): Record<string, string> {
  return {
    'color.background': '#ffffff',
    'color.text': '#111111',
    'spacing.section': '48px',
  }
}

function toStyleSignalConfidence(label: string): number {
  if (label.startsWith('style.diagnostic:STYLE_SIGNAL_WEAK')) return 0.45
  if (label.startsWith('style.diagnostic:')) return 0.62
  return 0.82
}

function buildImportFidelitySignals(snapshot: UrlSinglePageImportSnapshot): Array<{ label: string; confidence: number; source: 'migration' }> {
  const diagnostics = [...new Set(snapshot.importDiagnostics.issues.map((issue) => normalizeText(issue.code)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 16)

  return [
    { label: `import.source_mode:${snapshot.sourceSelection.sourceMode}`, confidence: 1, source: 'migration' },
    { label: `import.fidelity_status:${snapshot.sourceSelection.fidelityStatus}`, confidence: 1, source: 'migration' },
    { label: `import.rendered_capture_status:${resolveRenderedCaptureStatus(snapshot)}`, confidence: 0.95, source: 'migration' },
    { label: `import.rendered_dom_quality:${snapshot.sourceSelection.renderedDomQuality.quality}`, confidence: 0.9, source: 'migration' },
    { label: `import.screenshot_count:${snapshot.renderedCapture.screenshots.length}`, confidence: 1, source: 'migration' },
    {
      label: `import.computed_style_sample_count:${snapshot.renderedCapture.computedStyleSamples.length}`,
      confidence: 1,
      source: 'migration',
    },
    ...diagnostics.map((code) => ({
      label: `import.diagnostic:${code}`,
      confidence: 0.8,
      source: 'migration' as const,
    })),
  ]
}

function resolveEvidencePathIfExists(pathAbs: string): string | null {
  const normalized = normalizeText(pathAbs)
  if (!normalized) return null
  return fs.existsSync(normalized) ? normalized : null
}

function buildImportProvenanceSummary(snapshot: UrlSinglePageImportSnapshot, styleSignals: StyleSignalModel): RuntimeImportProvenanceSummary {
  const captureDiagnostics = (Array.isArray(snapshot.renderedCapture.diagnostics) ? snapshot.renderedCapture.diagnostics : [])
    .map((diag) => normalizeText(diag.code))
    .filter(Boolean)
  const importDiagnostics = snapshot.importDiagnostics.issues.map((issue) => normalizeText(issue.code)).filter(Boolean)

  const renderedCaptureStatus = resolveRenderedCaptureStatus(snapshot)
  const styleSampleCount = snapshot.renderedCapture.computedStyleSamples.length
  const styleCoverage = toCoverage({ sampleCount: styleSampleCount })
  const renderedDomPath = path.resolve(snapshot.snapshotRootDirAbs, 'rendered', 'rendered-dom.html')
  const computedStylesPath = path.resolve(snapshot.snapshotRootDirAbs, 'rendered', 'computed-styles.json')
  const viewportScreenshotPath = path.resolve(snapshot.snapshotRootDirAbs, 'rendered', 'screenshots', 'viewport.png')
  const fullpageScreenshotPath = path.resolve(snapshot.snapshotRootDirAbs, 'rendered', 'screenshots', 'fullpage.png')
  const screenshotPathsResolved = uniqueSorted(
    snapshot.renderedCapture.screenshots.map((shot) => resolveEvidencePathIfExists(shot.filePathAbs) ?? '').filter(Boolean),
  )
  const screenshotPathsDeclared = uniqueSorted(snapshot.renderedCapture.screenshots.map((shot) => normalizeText(shot.filePathAbs)).filter(Boolean))
  const screenshotPaths = screenshotPathsResolved.length > 0 ? screenshotPathsResolved : screenshotPathsDeclared
  const renderedViewportScreenshotPath = resolveEvidencePathIfExists(viewportScreenshotPath)
  const renderedFullpageScreenshotPath = resolveEvidencePathIfExists(fullpageScreenshotPath)
  const screenshotCount = Math.max(screenshotPaths.length, snapshot.renderedCapture.screenshots.length)
  const captureJob = snapshot.renderedCaptureReliability?.job ?? null
  const workerHealth = snapshot.renderedCaptureReliability?.workerHealth ?? null
  const workerResultSuccessful = snapshot.renderedCapture.status === 'available' || snapshot.renderedCapture.status === 'partial'
  const workerCapturedEvidence =
    (Array.isArray(snapshot.renderedCapture.documents) && snapshot.renderedCapture.documents.length > 0) ||
    (Array.isArray(snapshot.renderedCapture.screenshots) && snapshot.renderedCapture.screenshots.length > 0) ||
    styleSampleCount > 0
  const importDiagnosticCodes = uniqueSorted([
    ...captureDiagnostics,
    ...importDiagnostics,
    'RENDERED_CAPTURE_SUMMARY_PERSISTED',
    ...(snapshot.sourceSelection.sourceMode === 'rendered_dom' && workerResultSuccessful ? ['CAPTURE_WORKER_RESULT_PERSISTED'] : []),
    ...(snapshot.sourceSelection.sourceMode === 'raw_html_fallback' && (workerResultSuccessful || workerCapturedEvidence)
      ? ['CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK']
      : []),
  ])

  return {
    kind: 'runtime_import_provenance_summary_v1',
    sourceMode: snapshot.sourceSelection.sourceMode,
    importFidelityStatus: snapshot.sourceSelection.fidelityStatus,
    renderedCaptureStatus,
    renderedDomQuality: snapshot.sourceSelection.renderedDomQuality.quality,
    screenshotCount,
    computedStyleSampleCount: snapshot.renderedCapture.computedStyleSamples.length,
    renderedCapture: {
      used: snapshot.sourceSelection.sourceMode === 'rendered_dom',
      status: renderedCaptureStatus,
      quality: snapshot.sourceSelection.renderedDomQuality.quality,
      domLength: snapshot.sourceSelection.renderedDomQuality.bodyTextLength,
      nodeCount: snapshot.sourceSelection.renderedDomQuality.meaningfulNodeCount,
      styleSampleCount,
      styleCoverage,
      screenshots: {
        viewport: Boolean(renderedViewportScreenshotPath) || snapshot.renderedCapture.screenshots.some((shot) => shot.captureType === 'desktop_viewport'),
        fullPage: Boolean(renderedFullpageScreenshotPath) || snapshot.renderedCapture.screenshots.some((shot) => shot.captureType === 'desktop_fullpage'),
      },
      execution: buildRenderedCaptureExecutionFromSnapshot(snapshot),
    },
    importDiagnosticCodes,
    captureEvidence: {
      selectedSourceHtmlPath: resolveEvidencePathIfExists(snapshot.sourceSelection.selectedSourceHtmlPathAbs),
      responseHtmlPath: resolveEvidencePathIfExists(snapshot.responseHtmlPathAbs),
      entryHtmlPath: resolveEvidencePathIfExists(snapshot.entryHtmlPathAbs),
      renderedCaptureManifestPath: resolveEvidencePathIfExists(path.resolve(snapshot.snapshotRootDirAbs, 'rendered-capture.json')),
      acquisitionEvidencePath: resolveEvidencePathIfExists(path.resolve(snapshot.snapshotRootDirAbs, 'acquisition-evidence.json')),
      renderedDomPath: resolveEvidencePathIfExists(renderedDomPath),
      computedStylesPath: resolveEvidencePathIfExists(computedStylesPath),
      renderedViewportScreenshotPath: renderedViewportScreenshotPath,
      renderedFullpageScreenshotPath: renderedFullpageScreenshotPath,
      screenshotPaths,
    },
    captureJob: captureJob
      ? {
          jobId: captureJob.jobId,
          status: captureJob.status,
          attemptCount: captureJob.attemptCount,
          maxAttempts: captureJob.maxAttempts,
          failureClass: captureJob.failureClass,
          failureCode: captureJob.failureCode,
          timeoutBudgetMs: captureJob.timeoutBudgetMs,
          createdAt: captureJob.createdAt,
          startedAt: captureJob.startedAt,
          completedAt: captureJob.completedAt,
        }
      : null,
    workerHealth: workerHealth
      ? {
          enabled: workerHealth.enabled,
          reachable: workerHealth.reachable,
          browserAvailable: workerHealth.browserAvailable,
          queueHealthy: workerHealth.queueHealthy,
          status: workerHealth.status,
          reason: workerHealth.reason,
          lastSuccessAt: workerHealth.lastSuccessAt,
          lastFailureAt: workerHealth.lastFailureAt,
          lastFailureClass: workerHealth.lastFailureClass,
          lastFailureCode: workerHealth.lastFailureCode,
        }
      : null,
    styleSignals,
  }
}

function summarizeProvenancePayload(summary: RuntimeImportProvenanceSummary): Record<string, unknown> {
  return {
    kind: summary.kind,
    sourceMode: summary.sourceMode,
    importFidelityStatus: summary.importFidelityStatus,
    renderedCaptureStatus: summary.renderedCaptureStatus,
    renderedDomQuality: summary.renderedDomQuality,
    screenshotCount: summary.screenshotCount,
    computedStyleSampleCount: summary.computedStyleSampleCount,
    importDiagnosticCodeCount: Array.isArray(summary.importDiagnosticCodes) ? summary.importDiagnosticCodes.length : 0,
  }
}

function buildCanonicalMigrationInputFromPipeline(input: {
  sourceUrl: string
  actor: string
  preparedSite: PreparedSiteModel
  layoutModel: LayoutPreparationModel | null
  snapshot: UrlSinglePageImportSnapshot
  styleSignals: StyleSignalModel
}): CanonicalSiteMigrationInput {
  const entrySourcePath = input.preparedSite.source.entryHtmlPath ?? input.preparedSite.documents[0]?.path ?? '/'
  const entryPagePath = inferPagePathFromSourcePath(entrySourcePath)
  const siteId = resolveSiteId(input.sourceUrl, entryPagePath)

  const layoutByDocumentId = new Map(input.layoutModel?.pages.map((page) => [page.sourceDocumentId, page]) ?? [])
  const importFidelitySignals = buildImportFidelitySignals(input.snapshot)
  const styleSignals = styleSignalsToSemanticLabels(input.styleSignals).map((label) => ({
    label,
    confidence: toStyleSignalConfidence(label),
    source: 'migration' as const,
  }))
  const styleTokens = {
    ...baselineStyleTokens(),
    ...styleSignalsToStyleTokens(input.styleSignals),
  }

  const pages: CanonicalPageVersionInput[] = input.preparedSite.documents
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((doc) => {
      const pagePath = inferPagePathFromSourcePath(doc.path)
      const pageId = deterministicId('page', `${siteId}:${pagePath}`)
      const layoutPage = layoutByDocumentId.get(doc.id) ?? null
      const blockById = new Map(
        (layoutPage?.blocks ?? []).map((block) => [
          block.id,
          {
            textExcerpt: block.textExcerpt,
            preservedMarkupHtml: block.preservedMarkupHtml,
          },
        ]),
      )

      const semanticSections = doc.semantic?.sections ?? []
      const mappedSections = semanticSections.length
        ? mapSectionsFromSemantic({ semanticSections, blockById })
        : (layoutPage?.blocks ?? []).map((block, index) => ({
            id: block.id,
            type: 'content',
            order: Number.isFinite(block.ordinalIndex) ? block.ordinalIndex : index,
            props: {
              semanticType: 'unknown',
              layoutStructural: {
                intent: 'body',
                structuralConfidence: 0.5,
              },
              htmlSummary: {
                extractedText: normalizeText(block.textExcerpt),
                extractedImageSrcs: extractImageSrcsFromMarkup(block.preservedMarkupHtml),
                extractedLinks: extractLinksFromMarkup(block.preservedMarkupHtml),
              },
              preservedMarkupHtml: block.preservedMarkupHtml,
            },
          }))

      const sections = mappedSections.length
        ? mappedSections
        : [
            {
              id: `${pageId}-fallback-section`,
              type: 'content',
              order: 0,
              props: {
                semanticType: 'unknown',
                layoutStructural: {
                  intent: 'body',
                  structuralConfidence: 0.35,
                },
                htmlSummary: {
                  extractedText: normalizeText(doc.fidelity.metaDescription) || `Imported ${doc.path}`,
                  extractedImageSrcs: [],
                  extractedLinks: [],
                },
              },
            },
          ]

      return {
        pageId,
        path: pagePath,
        title: pickTitleFromSemantic(doc.semantic?.page.pageType ?? null, doc.path),
        structureModel: {
          sections: sections.map((section, index) => ({
            id: section.id,
            type: section.type,
            order: Number.isFinite(section.order) ? section.order : index,
          })),
        },
        contentModel: {
          sectionProps: Object.fromEntries(sections.map((section) => [section.id, section.props])),
        },
        styleTokens,
        assetGraph: [],
        semanticSignals: [
          {
            label: 'pipeline.prepared_site_model',
            confidence: 0.95,
            source: 'migration',
          },
          {
            label: `pipeline.section_consolidation:${doc.semantic?.consolidation.mode ?? 'none'}`,
            confidence: 0.85,
            source: 'migration',
          },
          ...importFidelitySignals,
          ...styleSignals,
        ],
        source: 'migration',
        actor: input.actor,
      }
    })

  return {
    siteId,
    sourceUrl: input.sourceUrl,
    actor: input.actor,
    pages,
  }
}

function extractPipelineArtifacts(pipeline: LinearMigrationPipelineResult): {
  preparedSite: PreparedSiteModel | null
  layoutModel: LayoutPreparationModel | null
  renderOutput: RenderOutput | null
  previewDocument: PreviewDocument | null
} {
  const preparedSite = findPipelineStage<{ preparedSite: PreparedSiteModel }>(pipeline, 'structure_preparation')?.preparedSite ?? null
  const layoutModel = findPipelineStage<{ layoutModel: LayoutPreparationModel }>(pipeline, 'layout_preparation')?.layoutModel ?? null
  const renderOutput = findPipelineStage<{ renderOutput: RenderOutput }>(pipeline, 'render_preparation')?.renderOutput ?? null
  const previewDocument = findPipelineStage<{ previewDocument: PreviewDocument }>(pipeline, 'preview_generation')?.previewDocument ?? null
  return { preparedSite, layoutModel, renderOutput, previewDocument }
}

function computePipelineReporting(input: {
  pipelineResult: LinearMigrationPipelineResult
  preparedSite: PreparedSiteModel | null
  snapshot: UrlSinglePageImportSnapshot
  styleSignals: StyleSignalModel
}): {
  executionStatus: 'success' | 'failed'
  consolidationApplied: boolean
  renderedCaptureUsed: boolean
  sourceMode: UrlSinglePageImportSnapshot['sourceMode']
  fidelityStatus: UrlSinglePageImportSnapshot['sourceSelection']['fidelityStatus']
  fidelityDegraded: boolean
  renderedCaptureStatus: 'available' | 'partial' | 'failed'
  renderedDomQuality: UrlSinglePageImportSnapshot['sourceSelection']['renderedDomQuality']['quality']
  screenshotCount: number
  computedStyleSampleCount: number
  importDiagnosticCodes: string[]
  styleSourceMode: StyleSignalModel['sourceMode']
  stylePrimaryAccent: string | null
  styleBackgroundTone: StyleSignalModel['colors']['backgroundTone']
  styleTypography: string
  styleSpacingDensity: string
  styleCta: string
  styleDiagnostics: string[]
} {
  const consolidationApplied = Boolean(
    input.preparedSite?.documents.some((doc) => {
      const mode = normalizeText(doc.semantic?.consolidation.mode)
      return mode === 'merged' || mode === 'consolidated'
    }),
  )

  const renderedCaptureUsed = input.snapshot.sourceSelection.sourceMode === 'rendered_dom'
  const screenshotCountResolved = uniqueSorted(
    input.snapshot.renderedCapture.screenshots.map((shot) => resolveEvidencePathIfExists(shot.filePathAbs) ?? '').filter(Boolean),
  ).length
  const screenshotCount = Math.max(screenshotCountResolved, input.snapshot.renderedCapture.screenshots.length)

  return {
    executionStatus: input.pipelineResult.status,
    consolidationApplied,
    renderedCaptureUsed,
    sourceMode: input.snapshot.sourceSelection.sourceMode,
    fidelityStatus: input.snapshot.sourceSelection.fidelityStatus,
    fidelityDegraded: input.snapshot.sourceSelection.degraded,
    renderedCaptureStatus: resolveRenderedCaptureStatus(input.snapshot),
    renderedDomQuality: input.snapshot.sourceSelection.renderedDomQuality.quality,
    screenshotCount,
    computedStyleSampleCount: input.snapshot.renderedCapture.computedStyleSamples.length,
    importDiagnosticCodes: uniqueSorted(input.snapshot.importDiagnostics.issues.map((issue) => normalizeText(issue.code)).filter(Boolean)),
    styleSourceMode: input.styleSignals.sourceMode,
    stylePrimaryAccent: input.styleSignals.colors.primaryAccent,
    styleBackgroundTone: input.styleSignals.colors.backgroundTone,
    styleTypography: `${input.styleSignals.typography.headingCategory}/${input.styleSignals.typography.bodyCategory}`,
    styleSpacingDensity: `${input.styleSignals.spacing.rhythm}/${input.styleSignals.spacing.layoutDensity}`,
    styleCta: `${input.styleSignals.cta.styleHint}/${input.styleSignals.cta.prominence}`,
    styleDiagnostics: input.styleSignals.diagnostics.map((diag) => diag.code),
  }
}

export type ScopedImportPipelineSuccess = {
  mode: 'pipeline'
  siteId: string
  siteVersionId: string
  versionNo: number
  artifactId: string
  pipelineResult: LinearMigrationPipelineResult
  preparedSite: PreparedSiteModel
  layoutModel: LayoutPreparationModel | null
  renderOutput: RenderOutput | null
  previewDocument: PreviewDocument | null
  reporting: {
    executionStatus: 'success' | 'failed'
    consolidationApplied: boolean
    renderedCaptureUsed: boolean
    sourceMode: UrlSinglePageImportSnapshot['sourceMode']
    fidelityStatus: UrlSinglePageImportSnapshot['sourceSelection']['fidelityStatus']
    fidelityDegraded: boolean
    renderedCaptureStatus: 'available' | 'partial' | 'failed'
    renderedDomQuality: UrlSinglePageImportSnapshot['sourceSelection']['renderedDomQuality']['quality']
    screenshotCount: number
    computedStyleSampleCount: number
    importDiagnosticCodes: string[]
    styleSourceMode: StyleSignalModel['sourceMode']
    stylePrimaryAccent: string | null
    styleBackgroundTone: StyleSignalModel['colors']['backgroundTone']
    styleTypography: string
    styleSpacingDensity: string
    styleCta: string
    styleDiagnostics: string[]
    artifactGenerated: boolean
    writePath: {
      createdVersionId: string
      provenancePayloadBeforeWrite: Record<string, unknown> | null
      provenanceWriteAttempted: boolean
      provenanceWriteSucceeded: boolean
      provenanceWriteAffectedRows: number
      artifactCreateAttempted: boolean
      artifactCreatedId: string | null
      artifactBindAttempted: boolean
      artifactBindSucceeded: boolean
      artifactBindAffectedRows: number
      verifiedVersionIdAfterWrite: string | null
      verificationRead: {
        versionId: string | null
        artifactId: string | null
        hasImportProvenanceSummary: boolean
      }
    }
  }
}

export type ScopedImportPipelineFallback = {
  mode: 'legacy_fallback'
  siteId: string
  siteVersionId: string
  versionNo: number
  fallbackReason: string
  diagnostics: {
    pipelineStatus: 'success' | 'failed'
    stageSummaries: string[]
    pipelineDiagnosticCodes: string[]
    sourceMode: UrlSinglePageImportSnapshot['sourceMode']
    fidelityStatus: UrlSinglePageImportSnapshot['sourceSelection']['fidelityStatus']
    fidelityDegraded: boolean
    renderedCaptureStatus: 'available' | 'partial' | 'failed'
    renderedDomQuality: UrlSinglePageImportSnapshot['sourceSelection']['renderedDomQuality']['quality']
    screenshotCount: number
    computedStyleSampleCount: number
    importDiagnosticCodes: string[]
    styleSourceMode: StyleSignalModel['sourceMode']
    stylePrimaryAccent: string | null
    styleBackgroundTone: StyleSignalModel['colors']['backgroundTone']
    styleTypography: string
    styleSpacingDensity: string
    styleCta: string
    styleDiagnostics: string[]
    writePath: {
      createdVersionId: string
      provenancePayloadBeforeWrite: Record<string, unknown> | null
      provenanceWriteAttempted: boolean
      provenanceWriteSucceeded: boolean
      provenanceWriteAffectedRows: number
      artifactCreateAttempted: boolean
      artifactCreatedId: null
      artifactBindAttempted: false
      artifactBindSucceeded: false
      artifactBindAffectedRows: 0
      verifiedVersionIdAfterWrite: string | null
      verificationRead: {
        versionId: string | null
        artifactId: null
        hasImportProvenanceSummary: boolean
      }
    }
  }
}

export type ScopedImportPipelineOutcome = ScopedImportPipelineSuccess | ScopedImportPipelineFallback

export type ScopedImportPipelineDependencies = {
  importStaticSite: typeof importStaticSite
  createImportManifest: typeof createImportManifest
  runLinearMigrationPipeline: typeof runLinearMigrationPipeline
  createSiteVersionFromMigration: typeof createSiteVersionFromMigration
  setSiteVersionImportProvenanceSummary: typeof setSiteVersionImportProvenanceSummary
  getSiteVersion: typeof getSiteVersion
  buildDeterministicArtifactBundle: typeof buildDeterministicArtifactBundle
  createArtifact: typeof createArtifact
  bindArtifactToVersion: typeof bindArtifactToVersion
  importHtmlToPage: typeof importHtmlToPage
  migrateImportedPageToCanonicalDraft: typeof migrateImportedPageToCanonicalDraft
}

function defaultDependencies(): ScopedImportPipelineDependencies {
  return {
    importStaticSite,
    createImportManifest,
    runLinearMigrationPipeline,
    createSiteVersionFromMigration,
    setSiteVersionImportProvenanceSummary,
    getSiteVersion,
    buildDeterministicArtifactBundle,
    createArtifact,
    bindArtifactToVersion,
    importHtmlToPage,
    migrateImportedPageToCanonicalDraft,
  }
}

export async function runScopedImportPipeline(input: {
  snapshot: UrlSinglePageImportSnapshot
  sourceUrl: string
  actor: string
  fallbackToLegacyOnPipelineFailure?: boolean
  legacySlug?: string
  legacyTitle?: string
  deps?: Partial<ScopedImportPipelineDependencies>
}): Promise<ScopedImportPipelineOutcome> {
  const deps = { ...defaultDependencies(), ...(input.deps ?? {}) }
  const fallbackToLegacy = input.fallbackToLegacyOnPipelineFailure ?? true

  const importOutput = await deps.importStaticSite({
    rootDir: input.snapshot.snapshotRootDirAbs,
    requestId: `scoped-import-${Date.now()}`,
    source: {
      kind: 'single-entry-html',
      entryHtmlPath: path.basename(input.snapshot.entryHtmlPathAbs),
      assetsDirPath: path.basename(input.snapshot.assetsDirAbs),
    },
  })
  const importManifest = deps.createImportManifest(importOutput)
  const pipelineResult = deps.runLinearMigrationPipeline(
    { importOutput, importManifest },
    {
      computedStyleSamples: input.snapshot.renderedCapture.computedStyleSamples,
      renderedCaptureContext: {
        status: resolveRenderedCaptureStatus(input.snapshot),
        quality: input.snapshot.sourceSelection.renderedDomQuality.quality,
      },
    },
  )
  const { preparedSite, layoutModel, renderOutput, previewDocument } = extractPipelineArtifacts(pipelineResult)
  const visualAnalysis = findPipelineStage<{ visualAnalysis: VisualAnalysisModel }>(pipelineResult, 'visual_analysis')?.visualAnalysis ?? null
  const styleSignals = extractStyleSignalModel({
    computedStyleSamples: input.snapshot.renderedCapture.computedStyleSamples,
    preparedSite,
    visualAnalysis,
    renderedCaptureContext: {
      status: resolveRenderedCaptureStatus(input.snapshot),
      quality: input.snapshot.sourceSelection.renderedDomQuality.quality,
    },
  })
  const importProvenanceSummary = buildImportProvenanceSummary(input.snapshot, styleSignals)

  if (pipelineResult.status === 'success' && preparedSite) {
    const writePathDiagnostics: ScopedImportPipelineSuccess['reporting']['writePath'] = {
      createdVersionId: '',
      provenancePayloadBeforeWrite: null,
      provenanceWriteAttempted: false,
      provenanceWriteSucceeded: false,
      provenanceWriteAffectedRows: 0,
      artifactCreateAttempted: false,
      artifactCreatedId: null,
      artifactBindAttempted: false,
      artifactBindSucceeded: false,
      artifactBindAffectedRows: 0,
      verifiedVersionIdAfterWrite: null,
      verificationRead: {
        versionId: null,
        artifactId: null,
        hasImportProvenanceSummary: false,
      },
    }

    const canonicalInput = buildCanonicalMigrationInputFromPipeline({
      sourceUrl: input.sourceUrl,
      actor: input.actor,
      preparedSite,
      layoutModel,
      snapshot: input.snapshot,
      styleSignals,
    })

    const migrated = await deps.createSiteVersionFromMigration({
      ...canonicalInput,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
      importProvenanceSummary,
    })
    writePathDiagnostics.createdVersionId = migrated.siteVersionId
    writePathDiagnostics.provenancePayloadBeforeWrite = summarizeProvenancePayload(importProvenanceSummary)
    console.info('[scoped-import] write-path:create-version', {
      createdVersionId: migrated.siteVersionId,
    })

    writePathDiagnostics.provenanceWriteAttempted = true
    const provenanceWrite = await deps.setSiteVersionImportProvenanceSummary({
      siteVersionId: migrated.siteVersionId,
      importProvenanceSummary,
    })
    writePathDiagnostics.provenanceWriteAffectedRows = provenanceWrite.affectedRows
    console.info('[scoped-import] write-path:provenance-before-write', {
      createdVersionId: migrated.siteVersionId,
      provenancePayload: writePathDiagnostics.provenancePayloadBeforeWrite,
    })
    console.info('[scoped-import] write-path:provenance-write-result', {
      createdVersionId: migrated.siteVersionId,
      affectedRows: provenanceWrite.affectedRows,
    })
    if (provenanceWrite.affectedRows <= 0) {
      throw new Error(`Provenance write affected 0 rows for site version ${migrated.siteVersionId}.`)
    }
    writePathDiagnostics.provenanceWriteSucceeded = true

    const siteVersion = await deps.getSiteVersion(migrated.siteVersionId)
    if (!siteVersion) {
      throw new Error('Pipeline succeeded but created site version could not be loaded for artifact generation.')
    }

    const artifactBundle = deps.buildDeterministicArtifactBundle({
      siteVersion,
      renderMode: 'PREVIEW',
    })
    if (artifactBundle.siteVersionId !== migrated.siteVersionId) {
      throw new Error(
        `Artifact build version mismatch: createdVersionId=${migrated.siteVersionId} artifactBundleSiteVersionId=${artifactBundle.siteVersionId}`,
      )
    }

    const artifactGovernance = {
      pageGateState: ['SCOPED_IMPORT_READY'],
      pageRolloutPolicyState: ['SCOPED_IMPORT_READY'],
      pageEnforcementState: {
        shadow: ['ALLOW'],
        canary: ['REVIEW'],
        production: ['REVIEW'],
      },
      siteGateState: 'SCOPED_IMPORT_READY',
      siteRolloutPolicyState: 'SCOPED_IMPORT_READY',
      siteEnforcementState: {
        shadow: 'ALLOW',
        canary: 'REVIEW',
        production: 'REVIEW',
      },
      publishStage: 'shadow' as const,
    }

    writePathDiagnostics.artifactCreateAttempted = true
    const artifact = await deps.createArtifact({
      siteId: artifactBundle.siteId,
      siteVersionId: artifactBundle.siteVersionId,
      rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
      bundleSha256: artifactBundle.bundleSha256,
      htmlByPath: artifactBundle.htmlByPath,
      compiledTokenStyles: artifactBundle.compiledTokenStyles,
      assetFingerprintMap: artifactBundle.assetFingerprintMap,
      manifest: {
        ...artifactBundle.manifest,
        sourceKind: 'scoped_pipeline_import',
      },
      publishStage: 'shadow',
      shadowRestricted: false,
      artifactGovernance,
    })
    if (!normalizeText(artifact.artifactId)) {
      throw new Error(`Artifact creation returned an empty artifact id for site version ${migrated.siteVersionId}.`)
    }
    writePathDiagnostics.artifactCreatedId = artifact.artifactId
    console.info('[scoped-import] write-path:artifact-create-result', {
      createdVersionId: migrated.siteVersionId,
      artifactId: artifact.artifactId,
    })

    writePathDiagnostics.artifactBindAttempted = true
    const bindWrite = await deps.bindArtifactToVersion({
      siteVersionId: migrated.siteVersionId,
      artifactId: artifact.artifactId,
      rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    })
    writePathDiagnostics.artifactBindAffectedRows = bindWrite.affectedRows
    console.info('[scoped-import] write-path:artifact-bind-result', {
      createdVersionId: migrated.siteVersionId,
      artifactId: artifact.artifactId,
      affectedRows: bindWrite.affectedRows,
    })
    if (bindWrite.affectedRows <= 0) {
      throw new Error(`Artifact bind affected 0 rows for site version ${migrated.siteVersionId}.`)
    }
    writePathDiagnostics.artifactBindSucceeded = true

    const boundSiteVersion = await deps.getSiteVersion(migrated.siteVersionId)
    if (!boundSiteVersion) {
      throw new Error('Artifact bind completed but site version could not be reloaded for verification.')
    }
    writePathDiagnostics.verifiedVersionIdAfterWrite = boundSiteVersion.id
    writePathDiagnostics.verificationRead = {
      versionId: boundSiteVersion.id,
      artifactId: boundSiteVersion.artifactId ?? null,
      hasImportProvenanceSummary: boundSiteVersion.importProvenanceSummary != null,
    }
    console.info('[scoped-import] write-path:verification-read', {
      createdVersionId: migrated.siteVersionId,
      verificationRead: writePathDiagnostics.verificationRead,
    })
    if (boundSiteVersion.id !== migrated.siteVersionId) {
      throw new Error(
        `Write-path verification failed: createdVersionId=${migrated.siteVersionId} verifiedVersionIdAfterWrite=${boundSiteVersion.id}`,
      )
    }
    if (boundSiteVersion.artifactId !== artifact.artifactId) {
      throw new Error(
        `Artifact bind verification failed for site version ${migrated.siteVersionId}: expected=${artifact.artifactId} actual=${boundSiteVersion.artifactId ?? 'null'}`,
      )
    }
    if (!boundSiteVersion.importProvenanceSummary) {
      throw new Error(`Import provenance summary missing after write on site version ${migrated.siteVersionId}.`)
    }
    if (!Object.keys(boundSiteVersion.importProvenanceSummary).length) {
      throw new Error(`Import provenance summary is empty after write on site version ${migrated.siteVersionId}.`)
    }

    const reporting = computePipelineReporting({
      pipelineResult,
      preparedSite,
      snapshot: input.snapshot,
      styleSignals,
    })

    return {
      mode: 'pipeline',
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      versionNo: migrated.versionNo,
      artifactId: artifact.artifactId,
      pipelineResult,
      preparedSite,
      layoutModel,
      renderOutput,
      previewDocument,
      reporting: {
        ...reporting,
        artifactGenerated: true,
        writePath: writePathDiagnostics,
      },
    }
  }

  if (!fallbackToLegacy) {
    throw new Error(`Scoped pipeline import failed without fallback: ${pipelineResult.summary}`)
  }

  const html = fs.readFileSync(input.snapshot.entryHtmlPathAbs, 'utf8')
  if (!html.trim()) {
    throw new Error('Pipeline failed and legacy fallback cannot run because snapshot entry HTML is empty.')
  }

  const legacyPage = deps.importHtmlToPage({
    slug: input.legacySlug ?? '/',
    title: input.legacyTitle,
    html,
  })

  const legacyMigrated = await deps.migrateImportedPageToCanonicalDraft({
    sourceUrl: input.sourceUrl,
    page: legacyPage,
    actor: `${input.actor}:fallback`,
  })

  const fallbackWritePath: ScopedImportPipelineFallback['diagnostics']['writePath'] = {
    createdVersionId: legacyMigrated.siteVersionId,
    provenancePayloadBeforeWrite: summarizeProvenancePayload(importProvenanceSummary),
    provenanceWriteAttempted: true,
    provenanceWriteSucceeded: false,
    provenanceWriteAffectedRows: 0,
    artifactCreateAttempted: false,
    artifactCreatedId: null,
    artifactBindAttempted: false,
    artifactBindSucceeded: false,
    artifactBindAffectedRows: 0,
    verifiedVersionIdAfterWrite: null,
    verificationRead: {
      versionId: null,
      artifactId: null,
      hasImportProvenanceSummary: false,
    },
  }

  console.info('[scoped-import] write-path:create-version-fallback', {
    createdVersionId: legacyMigrated.siteVersionId,
  })
  console.info('[scoped-import] write-path:provenance-before-write', {
    createdVersionId: legacyMigrated.siteVersionId,
    provenancePayload: fallbackWritePath.provenancePayloadBeforeWrite,
  })
  const fallbackProvenanceWrite = await deps.setSiteVersionImportProvenanceSummary({
    siteVersionId: legacyMigrated.siteVersionId,
    importProvenanceSummary,
  })
  fallbackWritePath.provenanceWriteAffectedRows = fallbackProvenanceWrite.affectedRows
  console.info('[scoped-import] write-path:provenance-write-result', {
    createdVersionId: legacyMigrated.siteVersionId,
    affectedRows: fallbackProvenanceWrite.affectedRows,
  })
  if (fallbackProvenanceWrite.affectedRows <= 0) {
    throw new Error(`Legacy fallback provenance write affected 0 rows for site version ${legacyMigrated.siteVersionId}.`)
  }
  fallbackWritePath.provenanceWriteSucceeded = true

  const fallbackVersion = await deps.getSiteVersion(legacyMigrated.siteVersionId)
  if (!fallbackVersion) {
    throw new Error(`Legacy fallback write-path verification failed: site version ${legacyMigrated.siteVersionId} not found.`)
  }
  fallbackWritePath.verifiedVersionIdAfterWrite = fallbackVersion.id
  fallbackWritePath.verificationRead = {
    versionId: fallbackVersion.id,
    artifactId: null,
    hasImportProvenanceSummary: fallbackVersion.importProvenanceSummary != null,
  }
  console.info('[scoped-import] write-path:verification-read', {
    createdVersionId: legacyMigrated.siteVersionId,
    verificationRead: fallbackWritePath.verificationRead,
  })
  if (fallbackVersion.id !== legacyMigrated.siteVersionId) {
    throw new Error(
      `Legacy fallback write-path verification failed: createdVersionId=${legacyMigrated.siteVersionId} verifiedVersionIdAfterWrite=${fallbackVersion.id}`,
    )
  }
  if (!fallbackVersion.importProvenanceSummary || !Object.keys(fallbackVersion.importProvenanceSummary).length) {
    throw new Error(`Legacy fallback write-path verification failed: import provenance summary missing for ${legacyMigrated.siteVersionId}.`)
  }

  return {
    mode: 'legacy_fallback',
    siteId: legacyMigrated.siteId,
    siteVersionId: legacyMigrated.siteVersionId,
    versionNo: legacyMigrated.versionNo,
    fallbackReason: 'pipeline_failed',
      diagnostics: {
      pipelineStatus: pipelineResult.status,
      stageSummaries: pipelineResult.stages.map((stage) => stage.summary),
      pipelineDiagnosticCodes: uniqueSorted(pipelineResult.diagnostics.map((issue) => issue.code)),
      sourceMode: input.snapshot.sourceSelection.sourceMode,
      fidelityStatus: input.snapshot.sourceSelection.fidelityStatus,
      fidelityDegraded: input.snapshot.sourceSelection.degraded,
      renderedCaptureStatus: resolveRenderedCaptureStatus(input.snapshot),
      renderedDomQuality: input.snapshot.sourceSelection.renderedDomQuality.quality,
      screenshotCount: (() => {
        const resolvedCount = uniqueSorted(
        input.snapshot.renderedCapture.screenshots.map((shot) => resolveEvidencePathIfExists(shot.filePathAbs) ?? '').filter(Boolean),
        ).length
        return Math.max(resolvedCount, input.snapshot.renderedCapture.screenshots.length)
      })(),
        computedStyleSampleCount: input.snapshot.renderedCapture.computedStyleSamples.length,
        importDiagnosticCodes: uniqueSorted(input.snapshot.importDiagnostics.issues.map((issue) => normalizeText(issue.code)).filter(Boolean)),
        styleSourceMode: styleSignals.sourceMode,
        stylePrimaryAccent: styleSignals.colors.primaryAccent,
        styleBackgroundTone: styleSignals.colors.backgroundTone,
      styleTypography: `${styleSignals.typography.headingCategory}/${styleSignals.typography.bodyCategory}`,
      styleSpacingDensity: `${styleSignals.spacing.rhythm}/${styleSignals.spacing.layoutDensity}`,
      styleCta: `${styleSignals.cta.styleHint}/${styleSignals.cta.prominence}`,
      styleDiagnostics: styleSignals.diagnostics.map((diag) => diag.code),
      writePath: fallbackWritePath,
      },
    }
  }

export const __scopedImportPipelineTestUtils = {
  buildCanonicalMigrationInputFromPipeline,
  inferPagePathFromSourcePath,
}
