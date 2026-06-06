import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import { parse } from 'parse5'
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
import type { buildDeterministicArtifactBundle as buildDeterministicArtifactBundleType } from '@/gnr8/runtime/artifact-builder'
import { deterministicId, normalizePagePath } from '@/gnr8/runtime/deterministic'
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getSiteVersion,
  persistRawImportedSiteArtifact,
  setSiteVersionImportProvenanceSummary,
  upsertContentSlots,
} from '@/gnr8/runtime/runtime-store'
import {
  RENDERER_COMPATIBILITY_VERSION,
  type ImportFidelityScore,
  type CanonicalPageVersionInput,
  type CanonicalSiteMigrationInput,
  type MultiPageHtmlAcquisitionManifest,
  type MultiPageHtmlAcquisitionPageEntry,
  type MultiPageHtmlAcquisitionSummary,
  type MultiPageDiscoveryLinkEntry,
  type MultiPageDiscoveryManifest,
  type MultiPageDiscoverySourceContext,
  type MultiPageDiscoverySummary,
  type MultiPageSitemapDiscoverySummary,
  type MultiPageRawArtifactAssemblyManifest,
  type MultiPageRawArtifactAssemblyRouteEntry,
  type MultiPageRawArtifactAssemblySummary,
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
import { discoverMultipageImportTree, discoverSitemapUrls, summarizeMultipageImportTree, type MultipageImportLimits } from '@/gnr8/multipage-import'
import { evaluateMultipageSameSiteUrl, normalizeInternalHref, normalizeSeedUrl } from '@/gnr8/multipage-import/normalization/route-normalization'
import { buildSafeSiteTreeFromSeedPage, normalizeRoutePath, type SiteTree } from '@/gnr8/site-tree'
import { buildFamilyHandoffModel, summarizeTemplateFamilies, type FamilyHandoffModel } from '@/gnr8/family-mode'
import { runSemanticImportEngine, type SemanticImportResult } from '@/gnr8/import-semantic/semantic-import-engine'
import { inferContentSlotsFromSemanticImport } from '@/gnr8/runtime/content-binding'

const SECTION_INTENT_BY_SEMANTIC_TYPE: Record<string, string> = {
  header: 'header_nav',
  navigation: 'header_nav',
  hero: 'hero',
  cta: 'form_contact',
  contact: 'form_contact',
  gallery: 'gallery_media',
  faq: 'body',
  pricing: 'body',
  services: 'body',
  features: 'body',
  testimonials: 'body',
  about: 'body',
  footer: 'footer_legal',
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeDiagnosticDetails(details: unknown): Record<string, unknown> | null {
  if (details == null) return null
  if (typeof details === 'object' && !Array.isArray(details)) {
    return details as Record<string, unknown>
  }
  if (Array.isArray(details)) {
    return { values: details }
  }
  return { value: details }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export type ScopedMultiPageDiscoveryOption =
  | boolean
  | {
      enabled?: boolean
      acquireHtml?: boolean
      assembleRawArtifactPages?: boolean
      limits?: Partial<MultipageImportLimits>
      htmlAcquisitionLimits?: {
        maxPages?: number
        maxBytesPerPage?: number
        requestTimeoutMs?: number
      }
      generatedAt?: string
    }

const DEFAULT_SCOPED_DISCOVERY_LIMITS: MultipageImportLimits = {
  maxRoutes: 60,
  maxDepth: 1,
  maxLinksPerPage: 120,
  maxTemplateLinksPerRoute: 25,
  maxSitemaps: 6,
  maxUrlsFromSitemaps: 120,
  maxNestedSitemaps: 4,
}

const DEFAULT_SCOPED_HTML_ACQUISITION_LIMITS = {
  maxPages: 20,
  maxBytesPerPage: 1_000_000,
  requestTimeoutMs: 8_000,
}

function disabledMultiPageDiscoverySummary(diagnostics: string[] = []): MultiPageDiscoverySummary {
  return {
    enabled: false,
    discoveredPageCount: 0,
    skippedLinkCount: 0,
    routeCandidateCount: 0,
    manifestRef: null,
    diagnostics,
  }
}

function emptyMultiPageSitemapDiscoverySummary(limits: MultipageImportLimits): MultiPageSitemapDiscoverySummary {
  return {
    attemptedSitemapUrls: [],
    fetchedSitemapUrls: [],
    nestedSitemapCount: 0,
    urlCount: 0,
    skippedUrlCount: 0,
    limitsApplied: {
      maxSitemaps: limits.maxSitemaps,
      maxUrlsFromSitemaps: limits.maxUrlsFromSitemaps,
      maxNestedSitemaps: limits.maxNestedSitemaps,
    },
    diagnostics: [],
  }
}

function resolveMultiPageDiscoveryOption(option: ScopedMultiPageDiscoveryOption | undefined): {
  enabled: boolean
  acquireHtml: boolean
  assembleRawArtifactPages: boolean
  limits: MultipageImportLimits
  htmlAcquisitionLimits: {
    maxPages: number
    maxBytesPerPage: number
    requestTimeoutMs: number
  }
  generatedAt: string | null
} {
  const rawLimits = typeof option === 'object' && option ? option.limits : undefined
  const rawHtmlLimits = typeof option === 'object' && option ? option.htmlAcquisitionLimits : undefined
  const enabled = option === true || (typeof option === 'object' && option?.enabled === true)
  const acquireHtml = typeof option === 'object' && option?.acquireHtml === true
  const assembleRawArtifactPages = typeof option === 'object' && option?.assembleRawArtifactPages === true
  if (acquireHtml && !enabled) {
    throw new Error('Multi-page HTML acquisition requires multiPageDiscovery.enabled=true.')
  }
  if (assembleRawArtifactPages && !enabled) {
    throw new Error('Multi-page raw artifact assembly requires multiPageDiscovery.enabled=true.')
  }
  if (assembleRawArtifactPages && !acquireHtml) {
    throw new Error('Multi-page raw artifact assembly requires multiPageDiscovery.acquireHtml=true.')
  }
  return {
    enabled,
    acquireHtml,
    assembleRawArtifactPages,
    limits: {
      maxRoutes: Math.max(1, Math.floor(rawLimits?.maxRoutes ?? DEFAULT_SCOPED_DISCOVERY_LIMITS.maxRoutes)),
      maxDepth: Math.max(1, Math.floor(rawLimits?.maxDepth ?? DEFAULT_SCOPED_DISCOVERY_LIMITS.maxDepth)),
      maxLinksPerPage: Math.max(1, Math.floor(rawLimits?.maxLinksPerPage ?? DEFAULT_SCOPED_DISCOVERY_LIMITS.maxLinksPerPage)),
      maxTemplateLinksPerRoute: Math.max(1, Math.floor(rawLimits?.maxTemplateLinksPerRoute ?? DEFAULT_SCOPED_DISCOVERY_LIMITS.maxTemplateLinksPerRoute)),
      maxSitemaps: Math.max(1, Math.floor(rawLimits?.maxSitemaps ?? DEFAULT_SCOPED_DISCOVERY_LIMITS.maxSitemaps)),
      maxUrlsFromSitemaps: Math.max(1, Math.floor(rawLimits?.maxUrlsFromSitemaps ?? DEFAULT_SCOPED_DISCOVERY_LIMITS.maxUrlsFromSitemaps)),
      maxNestedSitemaps: Math.max(0, Math.floor(rawLimits?.maxNestedSitemaps ?? DEFAULT_SCOPED_DISCOVERY_LIMITS.maxNestedSitemaps)),
    },
    htmlAcquisitionLimits: {
      maxPages: Math.max(1, Math.floor(rawHtmlLimits?.maxPages ?? DEFAULT_SCOPED_HTML_ACQUISITION_LIMITS.maxPages)),
      maxBytesPerPage: Math.max(1_024, Math.floor(rawHtmlLimits?.maxBytesPerPage ?? DEFAULT_SCOPED_HTML_ACQUISITION_LIMITS.maxBytesPerPage)),
      requestTimeoutMs: Math.max(250, Math.floor(rawHtmlLimits?.requestTimeoutMs ?? DEFAULT_SCOPED_HTML_ACQUISITION_LIMITS.requestTimeoutMs)),
    },
    generatedAt: typeof option === 'object' && option?.generatedAt ? normalizeText(option.generatedAt) || null : null,
  }
}

function toCoverage(input: { sampleCount: number; expectedCount?: number }): number {
  const expectedCount = Math.max(1, Math.floor(input.expectedCount ?? 10))
  const sampleCount = Math.max(0, Math.floor(input.sampleCount))
  return Number((sampleCount / expectedCount).toFixed(3))
}

function persistRenderedCaptureRunEvidence(snapshot: UrlSinglePageImportSnapshot): {
  domPath: string
  screenshotPath: string | null
  metadataPath: string
  domSize: number
  screenshotCount: number
  persisted: boolean
} {
  const renderedDir = path.resolve(snapshot.snapshotRootDirAbs, 'rendered')
  fs.mkdirSync(renderedDir, { recursive: true })

  const domPath = path.resolve(renderedDir, 'dom.html')
  const screenshotPath = path.resolve(renderedDir, 'screenshot.png')
  const metadataPath = path.resolve(renderedDir, 'metadata.json')

  const renderedDomSourcePath = snapshot.renderedCapture.documents[0]?.htmlPathAbs ?? path.resolve(renderedDir, 'rendered-dom.html')
  const renderedDomHtml = (() => {
    try {
      return fs.readFileSync(renderedDomSourcePath, 'utf8')
    } catch {
      return ''
    }
  })()
  fs.writeFileSync(domPath, renderedDomHtml, 'utf8')

  const viewport = snapshot.renderedCapture.screenshots.find((shot) => shot.captureType === 'desktop_viewport')?.filePathAbs ?? null
  const fullpage = snapshot.renderedCapture.screenshots.find((shot) => shot.captureType === 'desktop_fullpage')?.filePathAbs ?? null
  const primaryScreenshotSource = [viewport, fullpage].find((candidate) => {
    if (!candidate) return false
    try {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile() && fs.statSync(candidate).size > 0
    } catch {
      return false
    }
  }) ?? null
  if (primaryScreenshotSource) {
    fs.copyFileSync(primaryScreenshotSource, screenshotPath)
  } else if (fs.existsSync(screenshotPath)) {
    fs.unlinkSync(screenshotPath)
  }

  const domSize = renderedDomHtml.trim().length
  const screenshotCount = Math.max(snapshot.renderedCapture.screenshots.length, primaryScreenshotSource ? 1 : 0)
  const renderedCaptureStatus = resolveRenderedCaptureStatus(snapshot)
  const persisted = domSize > 0 || screenshotCount > 0 || snapshot.renderedCapture.computedStyleSamples.length > 0

  fs.writeFileSync(
    metadataPath,
    `${JSON.stringify(
      {
        kind: 'rendered_capture_metadata_v1',
        status: renderedCaptureStatus === 'available' && persisted ? 'success' : persisted ? 'degraded_usable' : renderedCaptureStatus,
        domSize,
        screenshotCount,
        source: 'worker',
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  return {
    domPath,
    screenshotPath: primaryScreenshotSource ? screenshotPath : null,
    metadataPath,
    domSize,
    screenshotCount,
    persisted,
  }
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
  const documents = Array.isArray(snapshot.renderedCapture.documents) ? snapshot.renderedCapture.documents : []
  const screenshots = Array.isArray(snapshot.renderedCapture.screenshots) ? snapshot.renderedCapture.screenshots : []
  const computedStyleSamples = Array.isArray(snapshot.renderedCapture.computedStyleSamples) ? snapshot.renderedCapture.computedStyleSamples : []
  if (snapshot.renderedCapture.status === 'failed' || snapshot.renderedCapture.status === 'unavailable') {
    return documents.length > 0 || screenshots.length > 0 || computedStyleSamples.length > 0 ? 'partial' : 'failed'
  }
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

function shouldForceCanonicalHomePath(input: {
  snapshot: UrlSinglePageImportSnapshot
  isEntryDocument: boolean
}): boolean {
  if (!input.isEntryDocument) return false
  const captureMode = normalizeText(input.snapshot.captureMode).toLowerCase()
  if (captureMode === 'raw_html_only') return true
  return normalizeText(input.snapshot.semanticImport?.sourceMode).toLowerCase() === 'raw_html_only'
}

function resolveCanonicalPagePathForDocument(input: {
  sourcePath: string
  isEntryDocument: boolean
  snapshot: UrlSinglePageImportSnapshot
}): { pagePath: string; inferredPath: string; forcedToCanonicalHome: boolean } {
  const inferredPath = inferPagePathFromSourcePath(input.sourcePath)
  const forcedToCanonicalHome = shouldForceCanonicalHomePath({
    snapshot: input.snapshot,
    isEntryDocument: input.isEntryDocument,
  })
  if (forcedToCanonicalHome && inferredPath !== '/') {
    return {
      pagePath: '/',
      inferredPath,
      forcedToCanonicalHome: true,
    }
  }
  return {
    pagePath: inferredPath,
    inferredPath,
    forcedToCanonicalHome: false,
  }
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
        sectionRole: section.sectionRole,
        confidence: section.confidence,
        rationale: section.rationale,
        dominantRationale: section.dominantRationale,
        classificationDiagnostics: section.classificationDiagnostics,
        headingHierarchy: section.headingHierarchy,
        layoutInference: section.layoutInference,
        groupingSignals: section.groupingSignals,
        sourceDomPaths: section.sourceDomPaths,
        blockIds: section.blockIds,
        mergedBlockCount: section.consolidatedBlockCount,
        candidateSignals: section.candidateSignals,
        layoutStructural: {
          intent: SECTION_INTENT_BY_SEMANTIC_TYPE[section.inferredType] ?? 'body',
          structuralConfidence: confidenceToScore(section.confidence),
          layoutKind: section.layoutInference.kind,
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

function computeImportFidelityScore(input: {
  preparedSite: PreparedSiteModel | null
  styleSignals: StyleSignalModel
  snapshot: UrlSinglePageImportSnapshot
}): ImportFidelityScore {
  const entrySemantic = input.preparedSite?.documents.find((doc) => doc.isEntry)?.semantic ?? input.preparedSite?.documents[0]?.semantic ?? null
  const semanticScore = entrySemantic?.fidelityScore ?? null

  const structureScore = semanticScore?.structureScore ?? (input.snapshot.sourceSelection.renderedDomQuality.sectionCandidateCount >= 3 ? 0.62 : 0.44)
  const styleScore = semanticScore?.styleScore ?? Number(
    Math.min(
      1,
      input.styleSignals.provenance.computedStyle.coverage * 0.62 +
        (input.styleSignals.colors.primaryAccent ? 0.18 : 0.04) +
        (input.styleSignals.typography.headingCategory !== 'unknown' ? 0.2 : 0.06),
    ).toFixed(3),
  )
  const contentScore = semanticScore?.contentScore ?? Number(
    Math.min(
      1,
      (entrySemantic?.sections.length ?? 0) >= 3 ? 0.56 : 0.4 +
        ((entrySemantic?.ctaCandidates.length ?? 0) > 0 ? 0.16 : 0.04) +
        ((entrySemantic?.sections.some((section) => section.groupingSignals.titleSubtitleBody) ?? false) ? 0.12 : 0.04),
    ).toFixed(3),
  )
  const layoutScore = semanticScore?.layoutScore ?? Number(
    Math.min(
      1,
      (entrySemantic?.sections.filter((section) => section.layoutInference.kind !== 'stack').length ?? 0) /
        Math.max(1, entrySemantic?.sections.length ?? 1) *
        0.68 +
        ((entrySemantic?.sections.some((section) => section.layoutInference.kind === 'grid' || section.layoutInference.kind === 'split') ?? false)
          ? 0.18
          : 0.04),
    ).toFixed(3),
  )
  const overallScore = Number(((structureScore * 0.34 + styleScore * 0.24 + contentScore * 0.22 + layoutScore * 0.2)).toFixed(3))
  return {
    structureScore: Number(structureScore.toFixed(3)),
    styleScore: Number(styleScore.toFixed(3)),
    contentScore: Number(contentScore.toFixed(3)),
    layoutScore: Number(layoutScore.toFixed(3)),
    overallScore,
    fidelityLevel: overallScore >= 0.74 ? 'high' : overallScore >= 0.5 ? 'medium' : 'low',
  }
}

function resolveEvidencePathIfExists(pathAbs: string): string | null {
  const normalized = normalizeText(pathAbs)
  if (!normalized) return null
  return fs.existsSync(normalized) ? normalized : null
}

function resolveSiteTreeSeedContext(input: { sourceUrl: string; snapshot: UrlSinglePageImportSnapshot }): { siteId: string; seedUrl: string } {
  const sourceUrl = normalizeText(input.sourceUrl)
  try {
    const parsed = new URL(sourceUrl)
    return {
      siteId: resolveSiteId(sourceUrl, parsed.pathname || '/'),
      seedUrl: sourceUrl,
    }
  } catch {
    const fallbackSeedUrl = `https://invalid.local${inferPagePathFromSourcePath(path.basename(input.snapshot.entryHtmlPathAbs || 'index.html'))}`
    return {
      siteId: resolveSiteId(fallbackSeedUrl, '/'),
      seedUrl: fallbackSeedUrl,
    }
  }
}

function readSiteTreeSeedHtml(snapshot: UrlSinglePageImportSnapshot): string {
  const candidates = [
    snapshot.sourceSelection.selectedSourceHtmlPathAbs,
    snapshot.entryHtmlPathAbs,
    snapshot.responseHtmlPathAbs,
  ]
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate)
    if (!normalized) continue
    try {
      const html = fs.readFileSync(normalized, 'utf8')
      if (normalizeText(html)) return html
    } catch {
      continue
    }
  }
  return ''
}

function resolveSemanticImportForSnapshot(snapshot: UrlSinglePageImportSnapshot): SemanticImportResult | null {
  if (snapshot.semanticImport && snapshot.semanticImport.sourceMode === 'raw_html_only') {
    return snapshot.semanticImport
  }
  const html = readSiteTreeSeedHtml(snapshot)
  if (!normalizeText(html)) return null
  return runSemanticImportEngine({
    normalizedHtml: html,
    entryHtmlPath: path.basename(snapshot.entryHtmlPathAbs || 'index.html'),
    sourceUrl: snapshot.sourceUrl,
    captureMode: snapshot.captureMode ?? 'raw_html_only',
  })
}

function persistSiteTreePayload(input: {
  snapshot: UrlSinglePageImportSnapshot
  tree: SiteTree
}): string | null {
  try {
    const dir = path.resolve(input.snapshot.snapshotRootDirAbs, 'site-tree')
    fs.mkdirSync(dir, { recursive: true })
    const payloadPath = path.resolve(dir, 'site-tree.json')
    fs.writeFileSync(
      payloadPath,
      `${JSON.stringify(
        {
          kind: 'site_tree_payload_v1',
          generatedAt: new Date().toISOString(),
          tree: input.tree,
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
    return payloadPath
  } catch {
    return null
  }
}

function persistTemplateFamiliesPayload(input: {
  snapshot: UrlSinglePageImportSnapshot
  model: FamilyHandoffModel
}): string | null {
  try {
    const dir = path.resolve(input.snapshot.snapshotRootDirAbs, 'template-families')
    fs.mkdirSync(dir, { recursive: true })
    const payloadPath = path.resolve(dir, 'families.json')
    fs.writeFileSync(
      payloadPath,
      `${JSON.stringify(
        {
          kind: 'template_families_payload_v1',
          generatedAt: new Date().toISOString(),
          model: input.model,
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
    return payloadPath
  } catch {
    return null
  }
}

function collectNodeAttrs(node: unknown): Record<string, string> {
  const attrs = ((node as { attrs?: Array<{ name: string; value: string }> })?.attrs ?? []) as Array<{ name: string; value: string }>
  const out: Record<string, string> = {}
  for (const attr of attrs) out[attr.name.toLowerCase()] = String(attr.value ?? '')
  return out
}

function getNodeName(node: unknown): string {
  return String((node as { nodeName?: string })?.nodeName ?? '').toLowerCase()
}

function classifySeedLinkContext(ancestorNames: string[], attrs: Record<string, string>): MultiPageDiscoverySourceContext {
  const pathHint = ancestorNames.join('/')
  const classHint = `${attrs.class ?? ''} ${attrs.id ?? ''} ${attrs['aria-label'] ?? ''}`.toLowerCase()
  if (pathHint.includes('/header') || classHint.includes('header')) return 'header'
  if (pathHint.includes('/footer') || classHint.includes('footer')) return 'footer'
  if (pathHint.includes('/nav') || classHint.includes('nav')) return 'nav'
  if (pathHint.includes('/main') || pathHint.includes('/section') || pathHint.includes('/article') || pathHint.includes('/body')) return 'body'
  return 'unknown'
}

function collectSeedDiscoveryRefs(seedHtml: string): Array<{
  href: string
  sourceContext: MultiPageDiscoverySourceContext
  sourceClassification: 'anchor' | 'form_action'
  download: boolean
}> {
  const document = parse(seedHtml)
  const out: Array<{
    href: string
    sourceContext: MultiPageDiscoverySourceContext
    sourceClassification: 'anchor' | 'form_action'
    download: boolean
  }> = []

  const walk = (node: unknown, ancestors: string[]): void => {
    const name = getNodeName(node)
    const attrs = collectNodeAttrs(node)
    const nextAncestors = name && name !== '#text' && name !== '#comment' ? [...ancestors, name] : ancestors

    if (name === 'a') {
      const href = normalizeText(attrs.href)
      if (href) {
        out.push({
          href,
          sourceContext: classifySeedLinkContext(nextAncestors, attrs),
          sourceClassification: 'anchor',
          download: Object.prototype.hasOwnProperty.call(attrs, 'download'),
        })
      }
    }

    if (name === 'form') {
      const action = normalizeText(attrs.action)
      if (action) {
        out.push({
          href: action,
          sourceContext: classifySeedLinkContext(nextAncestors, attrs),
          sourceClassification: 'form_action',
          download: false,
        })
      }
    }

    for (const child of ((node as { childNodes?: unknown[] }).childNodes ?? []) as unknown[]) {
      walk(child, nextAncestors)
    }
  }

  walk(document, [])
  return out
}

function resolveAbsoluteUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

function mapNormalizationSkipReason(href: string, reason: string): string {
  const lower = href.trim().toLowerCase()
  if (reason === 'unsupported_scheme' && lower.startsWith('mailto:')) return 'mailto'
  if (reason === 'unsupported_scheme' && lower.startsWith('tel:')) return 'tel'
  return reason
}

function isDiscoveryAuthPath(pathname: string): boolean {
  return /(^|\/)(login|log-in|signin|sign-in|signup|sign-up|auth|account|checkout)(\/|$)/i.test(pathname)
}

function hasUnsafeDiscoveryQueryState(searchParams: URLSearchParams): boolean {
  const entries = [...searchParams.keys()]
  if (entries.length === 0) return false
  const benign = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'msclkid',
    'ref',
    'source',
  ])
  return entries.length > 4 || entries.some((key) => !benign.has(key.toLowerCase()))
}

function resolveDiscoveryPreNormalizationSkip(input: {
  absoluteUrl: string | null
  canonicalHost: string
}): string | null {
  if (!input.absoluteUrl) return null
  try {
    const parsed = new URL(input.absoluteUrl)
    const normalized = normalizeSeedUrl(input.absoluteUrl)
    if (!normalized || normalized.canonicalHost !== input.canonicalHost) return null
    if (isDiscoveryAuthPath(normalized.path)) return 'auth_path'
    if (hasUnsafeDiscoveryQueryState(parsed.searchParams)) return 'unsafe_query_state'
    return null
  } catch {
    return null
  }
}

function buildDiscoveryLinkEntry(input: {
  href: string
  absoluteUrl: string | null
  normalizedUrl: string | null
  normalizedRoutePath: string | null
  sourceContext: MultiPageDiscoverySourceContext
  sourceClassification: 'anchor' | 'form_action'
  status: 'discovered' | 'skipped'
  skippedReason: string | null
}): MultiPageDiscoveryLinkEntry {
  return {
    originalHref: input.href,
    absoluteUrl: input.absoluteUrl,
    normalizedUrl: input.normalizedUrl,
    normalizedRoutePath: input.normalizedRoutePath,
    depth: 1,
    sourceContext: input.sourceContext,
    sourceClassification: input.sourceClassification,
    status: input.status,
    skippedReason: input.skippedReason,
  }
}

function summarizeSitemapDiscoveryForProvenance(input: {
  attemptedSitemapUrls: string[]
  fetchedSitemapUrls: string[]
  nestedSitemapCount: number
  urlCount: number
  skippedUrlCount: number
  limitsApplied: {
    maxSitemaps: number
    maxUrlsFromSitemaps: number
    maxNestedSitemaps: number
  }
  diagnostics: string[]
}): MultiPageSitemapDiscoverySummary {
  return {
    attemptedSitemapUrls: input.attemptedSitemapUrls.slice().sort((a, b) => a.localeCompare(b)),
    fetchedSitemapUrls: input.fetchedSitemapUrls.slice().sort((a, b) => a.localeCompare(b)),
    nestedSitemapCount: Math.max(0, Math.floor(input.nestedSitemapCount)),
    urlCount: Math.max(0, Math.floor(input.urlCount)),
    skippedUrlCount: Math.max(0, Math.floor(input.skippedUrlCount)),
    limitsApplied: {
      maxSitemaps: Math.max(1, Math.floor(input.limitsApplied.maxSitemaps)),
      maxUrlsFromSitemaps: Math.max(1, Math.floor(input.limitsApplied.maxUrlsFromSitemaps)),
      maxNestedSitemaps: Math.max(0, Math.floor(input.limitsApplied.maxNestedSitemaps)),
    },
    diagnostics: uniqueSorted(input.diagnostics),
  }
}

async function fetchScopedSitemap(url: string): Promise<{ url: string; body: string; contentType: string | null } | null> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), 8_000) : null
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller?.signal,
    })
    if (!response.ok) return null
    const body = await response.text()
    if (!body.trim()) return null
    return {
      url: response.url || url,
      body,
      contentType: response.headers.get('content-type'),
    }
  } catch {
    return null
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function disabledHtmlAcquisitionSummary(diagnostics: string[] = []): MultiPageHtmlAcquisitionSummary {
  return {
    enabled: false,
    fetchedPageCount: 0,
    failedPageCount: 0,
    skippedPageCount: 0,
    manifestRef: null,
    diagnostics,
  }
}

function disabledRawArtifactAssemblySummary(diagnostics: string[] = []): MultiPageRawArtifactAssemblySummary {
  return {
    enabled: false,
    assembledPageCount: 0,
    excludedPageCount: 0,
    routeMapRef: null,
    diagnostics,
  }
}

function htmlBodyAppearsHtml(body: string): boolean {
  const sample = body.slice(0, 4096).trim().toLowerCase()
  return sample.startsWith('<!doctype html') || sample.startsWith('<html') || sample.includes('<html') || sample.includes('<body')
}

function normalizeHtmlContentType(value: string | null): string | null {
  const normalized = normalizeText(value).toLowerCase()
  return normalized || null
}

function isHtmlContentType(value: string | null): boolean {
  const normalized = normalizeHtmlContentType(value)
  return normalized ? normalized.includes('text/html') || normalized.includes('application/xhtml+xml') : false
}

function multipageHostDiagnosticDetail(input: {
  seedHost: string | null
  normalizedHost: string | null
  finalHost: string | null
  routePath: string | null
}): string {
  return [
    `seedHost=${input.seedHost ?? ''}`,
    `normalizedHost=${input.normalizedHost ?? ''}`,
    `finalHost=${input.finalHost ?? ''}`,
    `routePath=${input.routePath ?? ''}`,
  ].join(';')
}

function acquisitionBodyFilename(input: { normalizedRoutePath: string | null; bodySha256: string }): string {
  const route = normalizeText(input.normalizedRoutePath ?? '/')
  const routeSlug = route === '/'
    ? 'root'
    : route
        .replace(/^\/+|\/+$/g, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'page'
  return `${routeSlug}-${input.bodySha256.slice(0, 12)}.html`
}

function normalizeRawAssemblyRoutePath(value: string | null): string | null {
  const raw = normalizeText(value)
  if (!raw) return null
  const normalized = normalizeRoutePath(raw)
  if (!normalized || normalized.includes('..') || normalized.includes('\\')) return null
  if (!normalized.startsWith('/')) return null
  return normalized
}

function rawAssemblyFilePathForRoute(routePath: string): string | null {
  const normalized = normalizeRawAssemblyRoutePath(routePath)
  if (!normalized || normalized === '/') return null
  const segments = normalized
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replace(/\.html?$/i, '')
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) return null
  return `pages/${segments.join('/')}/index.html`
}

function resolveRawAssemblyDestination(input: {
  snapshotRootDirAbs: string
  preferredRawFilePath: string
  bodySha256: string
}): string {
  const preferredAbs = path.resolve(input.snapshotRootDirAbs, input.preferredRawFilePath)
  const snapshotRoot = path.resolve(input.snapshotRootDirAbs)
  if (!preferredAbs.startsWith(`${snapshotRoot}${path.sep}`)) {
    throw new Error('MULTIPAGE_RAW_ASSEMBLY_DESTINATION_OUTSIDE_SNAPSHOT')
  }
  if (!fs.existsSync(preferredAbs)) return input.preferredRawFilePath
  try {
    const existing = fs.readFileSync(preferredAbs)
    const existingSha = crypto.createHash('sha256').update(existing).digest('hex')
    if (existingSha === input.bodySha256) return input.preferredRawFilePath
  } catch {
    // Fall through to a deterministic collision-safe filename.
  }
  const extPath = input.preferredRawFilePath.replace(/\/index\.html$/i, `/index-${input.bodySha256.slice(0, 12)}.html`)
  const extAbs = path.resolve(input.snapshotRootDirAbs, extPath)
  if (!extAbs.startsWith(`${snapshotRoot}${path.sep}`)) {
    throw new Error('MULTIPAGE_RAW_ASSEMBLY_DESTINATION_OUTSIDE_SNAPSHOT')
  }
  return extPath
}

async function readResponseBytesWithLimit(response: Response, maxBytes: number): Promise<{ bytes: Buffer; truncated: boolean }> {
  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer())
    return { bytes: bytes.subarray(0, maxBytes + 1), truncated: bytes.byteLength > maxBytes }
  }

  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  let truncated = false
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      const chunk = Buffer.from(next.value)
      total += chunk.byteLength
      chunks.push(chunk)
      if (total > maxBytes) {
        truncated = true
        try {
          await reader.cancel()
        } catch {
          // The response is already over the configured limit.
        }
        break
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // Some runtimes release the lock after cancel automatically.
    }
  }
  return { bytes: Buffer.concat(chunks).subarray(0, maxBytes + 1), truncated }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

function buildSkippedAcquisitionEntry(input: {
  discoveryEntry: MultiPageDiscoveryLinkEntry
  skippedReason: string
  diagnostics: string[]
}): MultiPageHtmlAcquisitionPageEntry {
  return {
    originalHref: input.discoveryEntry.originalHref,
    normalizedUrl: input.discoveryEntry.normalizedUrl,
    finalUrl: null,
    normalizedRoutePath: input.discoveryEntry.normalizedRoutePath,
    finalNormalizedRoutePath: null,
    depth: input.discoveryEntry.depth,
    status: 'skipped',
    httpStatusCode: null,
    contentType: null,
    byteSize: 0,
    bodySha256: null,
    bodyPath: null,
    redirected: false,
    redirectCount: 0,
    diagnostics: input.diagnostics,
    skippedReason: input.skippedReason,
    failureReason: null,
  }
}

async function acquireScopedMultiPageHtml(input: {
  sourceUrl: string
  snapshot: UrlSinglePageImportSnapshot
  discovery: { summary: MultiPageDiscoverySummary; manifest: MultiPageDiscoveryManifest | null }
  option: ReturnType<typeof resolveMultiPageDiscoveryOption>
}): Promise<{ summary: MultiPageHtmlAcquisitionSummary; manifest: MultiPageHtmlAcquisitionManifest | null }> {
  if (!input.option.acquireHtml) return { summary: disabledHtmlAcquisitionSummary(), manifest: null }

  const diagnostics: string[] = ['MULTIPAGE_HTML_ACQUISITION_STARTED']
  const generatedAt = input.option.generatedAt ?? new Date().toISOString()
  const normalizedSeed = normalizeSeedUrl(input.sourceUrl)
  const manifestRef = 'importProvenanceSummary.multiPageDiscovery.acquisition'
  const pages: MultiPageHtmlAcquisitionPageEntry[] = []

  if (!normalizedSeed || !input.discovery.manifest) {
    diagnostics.push(!normalizedSeed ? 'MULTIPAGE_HTML_FETCH_SKIPPED:invalid_seed' : 'MULTIPAGE_HTML_FETCH_SKIPPED:no_discovery_manifest')
    const manifest: MultiPageHtmlAcquisitionManifest = {
      kind: 'multi_page_html_acquisition_manifest_v1',
      seedUrl: input.sourceUrl,
      normalizedSeedUrl: normalizedSeed?.url ?? null,
      pages,
      limitsApplied: input.option.htmlAcquisitionLimits,
      summary: { fetchedPageCount: 0, failedPageCount: 0, skippedPageCount: 0 },
      diagnostics: uniqueSorted([...diagnostics, 'MULTIPAGE_HTML_ACQUISITION_MANIFEST_PERSISTED']),
      generatedAt,
    }
    return {
      summary: {
        enabled: true,
        fetchedPageCount: 0,
        failedPageCount: 0,
        skippedPageCount: 0,
        manifestRef,
        diagnostics: manifest.diagnostics.slice(),
      },
      manifest,
    }
  }

  const acquisitionDir = path.resolve(input.snapshot.snapshotRootDirAbs, 'multipage-html-acquisition')
  const pagesDir = path.resolve(acquisitionDir, 'pages')
  fs.mkdirSync(pagesDir, { recursive: true })

  const candidates = input.discovery.manifest.discoveredPages
    .filter((entry) => entry.status === 'discovered' && normalizeText(entry.normalizedUrl))
    .sort((left, right) => String(left.normalizedRoutePath ?? '').localeCompare(String(right.normalizedRoutePath ?? '')))
  const boundedCandidates = candidates.slice(0, input.option.htmlAcquisitionLimits.maxPages)
  const overflowCandidates = candidates.slice(input.option.htmlAcquisitionLimits.maxPages)

  for (const skipped of input.discovery.manifest.skippedLinks) {
    pages.push(
      buildSkippedAcquisitionEntry({
        discoveryEntry: skipped,
        skippedReason: `discovery_${skipped.skippedReason ?? 'skipped'}`,
        diagnostics: ['MULTIPAGE_HTML_FETCH_SKIPPED'],
      }),
    )
  }

  for (const overflow of overflowCandidates) {
    diagnostics.push('MULTIPAGE_HTML_ACQUISITION_LIMIT_REACHED')
    pages.push(
      buildSkippedAcquisitionEntry({
        discoveryEntry: overflow,
        skippedReason: 'acquisition_page_limit',
        diagnostics: ['MULTIPAGE_HTML_FETCH_SKIPPED', 'MULTIPAGE_HTML_ACQUISITION_LIMIT_REACHED'],
      }),
    )
  }

  for (const candidate of boundedCandidates) {
    const normalizedUrl = normalizeText(candidate.normalizedUrl)
    if (!normalizedUrl) {
      pages.push(
        buildSkippedAcquisitionEntry({
          discoveryEntry: candidate,
          skippedReason: 'missing_normalized_url',
          diagnostics: ['MULTIPAGE_HTML_FETCH_SKIPPED'],
        }),
      )
      continue
    }
    const candidateSameSite = evaluateMultipageSameSiteUrl({
      candidateUrl: normalizedUrl,
      seedUrl: normalizedSeed.url,
      evidenceUrls: [candidate.absoluteUrl, candidate.normalizedUrl],
    })
    if (!candidateSameSite.accepted) {
      const detail = multipageHostDiagnosticDetail(candidateSameSite)
      pages.push(
        buildSkippedAcquisitionEntry({
          discoveryEntry: candidate,
          skippedReason: 'non_same_origin_candidate',
          diagnostics: ['MULTIPAGE_HTML_FETCH_SKIPPED', `MULTIPAGE_FINAL_URL_REJECTED_CROSS_ORIGIN:${detail}`],
        }),
      )
      diagnostics.push(`MULTIPAGE_FINAL_URL_REJECTED_CROSS_ORIGIN:${detail}`)
      continue
    }
    if (candidateSameSite.canonicalHostEquivalent) {
      const detail = multipageHostDiagnosticDetail(candidateSameSite)
      diagnostics.push(`MULTIPAGE_CANONICAL_HOST_EQUIVALENCE_APPLIED:${detail}`)
    }

    try {
      const response = await fetchWithTimeout(normalizedUrl, input.option.htmlAcquisitionLimits.requestTimeoutMs)
      const finalUrl = normalizeText(response.url) || normalizedUrl
      const finalNormalized = normalizeSeedUrl(finalUrl)
      const finalSameSite = evaluateMultipageSameSiteUrl({
        candidateUrl: finalUrl,
        seedUrl: normalizedSeed.url,
        evidenceUrls: [normalizedUrl, finalUrl],
      })
      const redirected = Boolean(response.redirected || finalUrl !== normalizedUrl)
      const contentType = normalizeHtmlContentType(response.headers.get('content-type'))
      const common = {
        originalHref: candidate.originalHref,
        normalizedUrl,
        finalUrl,
        normalizedRoutePath: candidate.normalizedRoutePath,
        finalNormalizedRoutePath: finalNormalized?.path ?? null,
        depth: candidate.depth,
        httpStatusCode: response.status,
        contentType,
        redirected,
        redirectCount: redirected ? 1 : 0,
      }

      if (!finalNormalized || !finalSameSite.accepted) {
        const detail = multipageHostDiagnosticDetail(finalSameSite)
        diagnostics.push('MULTIPAGE_HTML_FETCH_FAILED')
        diagnostics.push(`MULTIPAGE_FINAL_URL_REJECTED_CROSS_ORIGIN:${detail}`)
        pages.push({
          ...common,
          status: 'failed',
          byteSize: 0,
          bodySha256: null,
          bodyPath: null,
          diagnostics: ['MULTIPAGE_HTML_FETCH_FAILED', `MULTIPAGE_FINAL_URL_REJECTED_CROSS_ORIGIN:${detail}`],
          skippedReason: null,
          failureReason: 'final_url_external_origin',
        })
        continue
      }
      const finalCanonicalDiagnostics = finalSameSite.canonicalHostEquivalent
        ? [
            `MULTIPAGE_CANONICAL_HOST_EQUIVALENCE_APPLIED:${multipageHostDiagnosticDetail(finalSameSite)}`,
            `MULTIPAGE_FINAL_URL_ACCEPTED_CANONICAL_HOST:${multipageHostDiagnosticDetail(finalSameSite)}`,
          ]
        : []
      diagnostics.push(...finalCanonicalDiagnostics)

      if (response.status < 200 || response.status >= 300) {
        diagnostics.push('MULTIPAGE_HTML_FETCH_FAILED')
        pages.push({
          ...common,
          status: 'failed',
          byteSize: 0,
          bodySha256: null,
          bodyPath: null,
          diagnostics: ['MULTIPAGE_HTML_FETCH_FAILED'],
          skippedReason: null,
          failureReason: 'non_2xx_status',
        })
        continue
      }

      const { bytes, truncated } = await readResponseBytesWithLimit(response, input.option.htmlAcquisitionLimits.maxBytesPerPage)
      if (truncated) {
        diagnostics.push('MULTIPAGE_HTML_FETCH_SKIPPED')
        pages.push({
          ...common,
          status: 'skipped',
          byteSize: bytes.byteLength,
          bodySha256: null,
          bodyPath: null,
          diagnostics: ['MULTIPAGE_HTML_FETCH_SKIPPED'],
          skippedReason: 'max_bytes_per_page_exceeded',
          failureReason: null,
        })
        continue
      }

      const body = bytes.toString('utf8')
      const appearsHtml = htmlBodyAppearsHtml(body)
      if (!bytes.byteLength || !normalizeText(body)) {
        diagnostics.push('MULTIPAGE_HTML_FETCH_FAILED')
        pages.push({
          ...common,
          status: 'failed',
          byteSize: bytes.byteLength,
          bodySha256: null,
          bodyPath: null,
          diagnostics: ['MULTIPAGE_HTML_FETCH_FAILED'],
          skippedReason: null,
          failureReason: 'empty_body',
        })
        continue
      }

      if (!isHtmlContentType(contentType) && (contentType || !appearsHtml)) {
        diagnostics.push('MULTIPAGE_HTML_FETCH_SKIPPED')
        pages.push({
          ...common,
          status: 'skipped',
          byteSize: bytes.byteLength,
          bodySha256: null,
          bodyPath: null,
          diagnostics: ['MULTIPAGE_HTML_FETCH_SKIPPED'],
          skippedReason: contentType ? 'non_html_content_type' : 'body_not_html',
          failureReason: null,
        })
        continue
      }

      const bodySha256 = crypto.createHash('sha256').update(bytes).digest('hex')
      const bodyPath = path.resolve(pagesDir, acquisitionBodyFilename({ normalizedRoutePath: candidate.normalizedRoutePath, bodySha256 }))
      fs.writeFileSync(bodyPath, body, 'utf8')
      diagnostics.push('MULTIPAGE_HTML_FETCH_SUCCEEDED')
      pages.push({
        ...common,
        status: 'fetched',
        byteSize: bytes.byteLength,
        bodySha256,
        bodyPath: resolveEvidencePathIfExists(bodyPath),
        diagnostics: ['MULTIPAGE_HTML_FETCH_SUCCEEDED', ...finalCanonicalDiagnostics],
        skippedReason: null,
        failureReason: null,
      })
    } catch (error) {
      diagnostics.push('MULTIPAGE_HTML_FETCH_FAILED')
      pages.push({
        originalHref: candidate.originalHref,
        normalizedUrl,
        finalUrl: null,
        normalizedRoutePath: candidate.normalizedRoutePath,
        finalNormalizedRoutePath: null,
        depth: candidate.depth,
        status: 'failed',
        httpStatusCode: null,
        contentType: null,
        byteSize: 0,
        bodySha256: null,
        bodyPath: null,
        redirected: false,
        redirectCount: 0,
        diagnostics: ['MULTIPAGE_HTML_FETCH_FAILED'],
        skippedReason: null,
        failureReason: error instanceof Error && error.name === 'AbortError' ? 'request_timeout' : 'fetch_error',
      })
    }
  }

  const sortedPages = pages.sort((left, right) =>
    `${left.normalizedRoutePath ?? ''}|${left.originalHref}|${left.status}`.localeCompare(
      `${right.normalizedRoutePath ?? ''}|${right.originalHref}|${right.status}`,
    ),
  )
  const fetchedPageCount = sortedPages.filter((entry) => entry.status === 'fetched').length
  const failedPageCount = sortedPages.filter((entry) => entry.status === 'failed').length
  const skippedPageCount = sortedPages.filter((entry) => entry.status === 'skipped').length
  const manifest: MultiPageHtmlAcquisitionManifest = {
    kind: 'multi_page_html_acquisition_manifest_v1',
    seedUrl: input.sourceUrl,
    normalizedSeedUrl: normalizedSeed.url,
    pages: sortedPages,
    limitsApplied: input.option.htmlAcquisitionLimits,
    summary: {
      fetchedPageCount,
      failedPageCount,
      skippedPageCount,
    },
    diagnostics: uniqueSorted([...diagnostics, 'MULTIPAGE_HTML_ACQUISITION_MANIFEST_PERSISTED']),
    generatedAt,
  }

  fs.writeFileSync(path.resolve(acquisitionDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  return {
    summary: {
      enabled: true,
      fetchedPageCount,
      failedPageCount,
      skippedPageCount,
      manifestRef,
      diagnostics: manifest.diagnostics.slice(),
    },
    manifest,
  }
}

function buildRawAssemblyExcludedEntry(input: {
  page: MultiPageHtmlAcquisitionPageEntry
  reason: string
  routePath?: string | null
  rawFilePath?: string | null
}): MultiPageRawArtifactAssemblyManifest['excludedPages'][number] {
  return {
    routePath: input.routePath ?? input.page.finalNormalizedRoutePath ?? input.page.normalizedRoutePath ?? null,
    sourceUrl: input.page.normalizedUrl,
    finalUrl: input.page.finalUrl,
    rawFilePath: input.rawFilePath ?? null,
    bodySha256: input.page.bodySha256,
    byteSize: input.page.byteSize,
    status: 'excluded',
    reason: input.reason,
  }
}

async function assembleScopedMultiPageRawArtifactPages(input: {
  sourceUrl: string
  snapshot: UrlSinglePageImportSnapshot
  acquisition: MultiPageHtmlAcquisitionManifest | null
  option: ReturnType<typeof resolveMultiPageDiscoveryOption>
}): Promise<{ summary: MultiPageRawArtifactAssemblySummary; manifest: MultiPageRawArtifactAssemblyManifest | null }> {
  if (!input.option.assembleRawArtifactPages) return { summary: disabledRawArtifactAssemblySummary(), manifest: null }

  const diagnostics: string[] = ['MULTIPAGE_RAW_ASSEMBLY_STARTED']
  const generatedAt = input.option.generatedAt ?? new Date().toISOString()
  const normalizedSeed = normalizeSeedUrl(input.sourceUrl)
  const routeMapRef = 'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap'
  const manifestDir = path.resolve(input.snapshot.snapshotRootDirAbs, 'multipage-raw-artifact-assembly')
  const manifestPath = path.resolve(manifestDir, 'manifest.json')
  const assembledByRoute = new Map<string, MultiPageRawArtifactAssemblyRouteEntry>()
  const excludedPages: MultiPageRawArtifactAssemblyManifest['excludedPages'] = []
  const failedPages: MultiPageHtmlAcquisitionPageEntry[] = []

  if (!normalizedSeed || !input.acquisition) {
    diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
  } else {
    const candidates = input.acquisition.pages
      .slice()
      .sort((left, right) =>
        `${left.finalNormalizedRoutePath ?? left.normalizedRoutePath ?? ''}|${left.finalUrl ?? ''}|${left.normalizedUrl ?? ''}|${left.bodySha256 ?? ''}`.localeCompare(
          `${right.finalNormalizedRoutePath ?? right.normalizedRoutePath ?? ''}|${right.finalUrl ?? ''}|${right.normalizedUrl ?? ''}|${right.bodySha256 ?? ''}`,
        ),
      )

    for (const page of candidates) {
      if (page.status === 'failed') {
        failedPages.push(page)
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      if (page.status !== 'fetched') {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: page.skippedReason ? `acquisition_${page.skippedReason}` : 'acquisition_skipped' }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      const finalSameSite = page.finalUrl
        ? evaluateMultipageSameSiteUrl({
            candidateUrl: page.finalUrl,
            seedUrl: normalizedSeed.url,
            evidenceUrls: [page.normalizedUrl, page.finalUrl],
          })
        : null
      if (!finalSameSite?.accepted) {
        const detail = multipageHostDiagnosticDetail(
          finalSameSite ?? { seedHost: null, normalizedHost: normalizedSeed.canonicalHost, finalHost: null, routePath: page.finalNormalizedRoutePath ?? page.normalizedRoutePath },
        )
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'final_url_not_same_origin' }))
        diagnostics.push(`MULTIPAGE_FINAL_URL_REJECTED_CROSS_ORIGIN:${detail}`)
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      if (finalSameSite.canonicalHostEquivalent) {
        const detail = multipageHostDiagnosticDetail(finalSameSite)
        diagnostics.push(`MULTIPAGE_CANONICAL_HOST_EQUIVALENCE_APPLIED:${detail}`)
        diagnostics.push(`MULTIPAGE_FINAL_URL_ACCEPTED_CANONICAL_HOST:${detail}`)
      }
      const routePath = normalizeRawAssemblyRoutePath(page.finalNormalizedRoutePath ?? page.normalizedRoutePath)
      if (!routePath) {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'invalid_route_path' }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      if (routePath === '/') {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'seed_route_not_overwritten', routePath }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      if (!page.bodyPath || !page.bodySha256) {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'missing_body_path_or_sha', routePath }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      if (!isHtmlContentType(page.contentType) && page.contentType) {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'non_html_content_type', routePath }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }

      let bodyBytes: Buffer
      try {
        bodyBytes = fs.readFileSync(page.bodyPath)
      } catch {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'body_path_missing', routePath }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      const bodySha256 = crypto.createHash('sha256').update(bodyBytes).digest('hex')
      if (bodySha256 !== page.bodySha256) {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'body_sha256_mismatch', routePath }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      if (!htmlBodyAppearsHtml(bodyBytes.toString('utf8'))) {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'body_not_html', routePath }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      if (assembledByRoute.has(routePath)) {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'duplicate_route', routePath }))
        diagnostics.push('MULTIPAGE_RAW_ROUTE_DUPLICATE')
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }

      const preferredRawFilePath = rawAssemblyFilePathForRoute(routePath)
      if (!preferredRawFilePath) {
        excludedPages.push(buildRawAssemblyExcludedEntry({ page, reason: 'invalid_raw_file_path', routePath }))
        diagnostics.push('MULTIPAGE_RAW_PAGE_SKIPPED')
        continue
      }
      const rawFilePath = resolveRawAssemblyDestination({
        snapshotRootDirAbs: input.snapshot.snapshotRootDirAbs,
        preferredRawFilePath,
        bodySha256,
      })
      const rawFilePathAbs = path.resolve(input.snapshot.snapshotRootDirAbs, rawFilePath)
      fs.mkdirSync(path.dirname(rawFilePathAbs), { recursive: true })
      if (!fs.existsSync(rawFilePathAbs) || crypto.createHash('sha256').update(fs.readFileSync(rawFilePathAbs)).digest('hex') !== bodySha256) {
        fs.writeFileSync(rawFilePathAbs, bodyBytes)
      }

      assembledByRoute.set(routePath, {
        routePath,
        sourceUrl: page.normalizedUrl ?? page.originalHref,
        finalUrl: page.finalUrl ?? page.normalizedUrl ?? page.originalHref,
        rawFilePath,
        bodySha256,
        byteSize: bodyBytes.byteLength,
        status: 'assembled',
      })
      diagnostics.push('MULTIPAGE_RAW_PAGE_ASSEMBLED')
    }
  }

  const routeMap = [...assembledByRoute.values()].sort((left, right) => left.routePath.localeCompare(right.routePath))
  const htmlPathMap = Object.fromEntries(routeMap.map((entry) => [entry.routePath, entry.rawFilePath]))
  const manifestWithoutPath = {
    kind: 'multi_page_raw_artifact_assembly_manifest_v1' as const,
    enabled: true as const,
    seedUrl: input.sourceUrl,
    normalizedSeedUrl: normalizedSeed?.url ?? null,
    assembledPageCount: routeMap.length,
    excludedPageCount: excludedPages.length,
    failedPageCount: failedPages.length,
    routeMap,
    htmlPathMap,
    excludedPages: excludedPages.sort((left, right) => `${left.routePath ?? ''}|${left.reason}|${left.sourceUrl ?? ''}`.localeCompare(`${right.routePath ?? ''}|${right.reason}|${right.sourceUrl ?? ''}`)),
    failedPages: failedPages.sort((left, right) => `${left.normalizedRoutePath ?? ''}|${left.originalHref}`.localeCompare(`${right.normalizedRoutePath ?? ''}|${right.originalHref}`)),
    manifestPath: null,
    diagnostics: [] as string[],
    generatedAt,
  }
  fs.mkdirSync(manifestDir, { recursive: true })
  const manifest: MultiPageRawArtifactAssemblyManifest = {
    ...manifestWithoutPath,
    manifestPath: manifestPath,
    diagnostics: uniqueSorted([...diagnostics, 'MULTIPAGE_RAW_ASSEMBLY_MANIFEST_PERSISTED', 'MULTIPAGE_RAW_ASSEMBLY_COMPLETED']),
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  return {
    summary: {
      enabled: true,
      assembledPageCount: manifest.assembledPageCount,
      excludedPageCount: manifest.excludedPageCount,
      routeMapRef,
      diagnostics: manifest.diagnostics.slice(),
    },
    manifest,
  }
}

async function buildScopedMultiPageDiscovery(input: {
  option?: ScopedMultiPageDiscoveryOption
  sourceUrl: string
  snapshot: UrlSinglePageImportSnapshot
}): Promise<{
  summary: MultiPageDiscoverySummary
  manifest: MultiPageDiscoveryManifest | null
  sitemapDiscovery?: MultiPageSitemapDiscoverySummary | null
  acquisition?: MultiPageHtmlAcquisitionManifest | null
  rawArtifactAssembly?: MultiPageRawArtifactAssemblyManifest | null
}> {
  const option = resolveMultiPageDiscoveryOption(input.option)
  if (!option.enabled) return { summary: disabledMultiPageDiscoverySummary(), manifest: null }

  const diagnostics: string[] = ['MULTIPAGE_DISCOVERY_ONLY_STARTED']
  const generatedAt = option.generatedAt ?? new Date().toISOString()
  const normalizedSeed = normalizeSeedUrl(input.sourceUrl)
  const seedHtml = (() => {
    const selectedSource = normalizeText(input.snapshot.sourceSelection?.selectedSourceHtmlPathAbs)
    const candidates = uniqueSorted([selectedSource, input.snapshot.entryHtmlPathAbs])
    for (const candidate of candidates) {
      try {
        const html = fs.readFileSync(candidate, 'utf8')
        if (html.trim()) return html
      } catch {
        // Try the next available seed source.
      }
    }
    return ''
  })()

  if (!normalizedSeed || !seedHtml.trim()) {
    diagnostics.push(!normalizedSeed ? 'MULTIPAGE_DISCOVERY_DEGRADED:invalid_seed' : 'MULTIPAGE_DISCOVERY_DEGRADED:empty_seed_html')
    const manifest: MultiPageDiscoveryManifest = {
      kind: 'multi_page_discovery_manifest_v1',
      seedUrl: input.sourceUrl,
      normalizedSeedUrl: normalizedSeed?.url ?? null,
      normalizedSeedRoute: normalizedSeed?.path ?? null,
      discoveredPages: [],
      skippedLinks: [],
      routeCandidates: [],
      normalizedUrls: [],
      depth: { seedDepth: 0, maxDiscoveredDepth: 0 },
      limitsApplied: {
        maxDiscoveredUrls: option.limits.maxRoutes,
        maxDepth: option.limits.maxDepth,
        maxLinksPerPage: option.limits.maxLinksPerPage,
        maxTemplateLinksPerRoute: option.limits.maxTemplateLinksPerRoute,
        maxSitemaps: option.limits.maxSitemaps,
        maxUrlsFromSitemaps: option.limits.maxUrlsFromSitemaps,
        maxNestedSitemaps: option.limits.maxNestedSitemaps,
      },
      diagnostics: uniqueSorted(diagnostics),
      generatedAt,
    }
    const acquisition = await acquireScopedMultiPageHtml({
      sourceUrl: input.sourceUrl,
      snapshot: input.snapshot,
      discovery: { summary: { ...disabledMultiPageDiscoverySummary(manifest.diagnostics), enabled: true }, manifest },
      option,
    })
    const assembly = await assembleScopedMultiPageRawArtifactPages({
      sourceUrl: input.sourceUrl,
      snapshot: input.snapshot,
      acquisition: acquisition.manifest,
      option,
    })
    return {
      summary: {
        ...disabledMultiPageDiscoverySummary(manifest.diagnostics),
        enabled: true,
        ...(acquisition.summary.enabled ? { htmlAcquisition: acquisition.summary } : {}),
        ...(assembly.summary.enabled ? { rawArtifactAssembly: assembly.summary } : {}),
      },
      manifest,
      sitemapDiscovery: null,
      acquisition: acquisition.manifest,
      rawArtifactAssembly: assembly.manifest,
    }
  }

  const childFetchesSkipped = new Set<string>()
  const tree = await discoverMultipageImportTree(
    {
      siteId: deterministicId('site', input.sourceUrl),
      seedUrl: input.sourceUrl,
      limits: option.limits,
      discoveredAt: generatedAt,
    },
    {
      fetchPage: async (url) => {
        const normalized = normalizeSeedUrl(url)
        if (normalized?.url === normalizedSeed.url) {
          return { url: normalizedSeed.url, html: seedHtml, title: null }
        }
        childFetchesSkipped.add(url)
        return null
      },
    },
  )
  diagnostics.push(...tree.diagnostics)
  if (childFetchesSkipped.size > 0) diagnostics.push(`MULTIPAGE_DISCOVERY_ONLY_CHILD_FETCH_SKIPPED:${childFetchesSkipped.size}`)

  const sitemapDiscoveryEvidence = await discoverSitemapUrls({
    seedUrl: normalizedSeed.url,
    canonicalHost: normalizedSeed.canonicalHost,
    limits: option.limits,
    fetchSitemap: fetchScopedSitemap,
  })
  const sitemapDiscovery = summarizeSitemapDiscoveryForProvenance(sitemapDiscoveryEvidence)
  diagnostics.push(...sitemapDiscovery.diagnostics)

  const discoveredByRoute = new Map<string, MultiPageDiscoveryLinkEntry>()
  const skippedLinks: MultiPageDiscoveryLinkEntry[] = []
  const normalizedUrls: MultiPageDiscoveryManifest['normalizedUrls'] = []

  const refs = collectSeedDiscoveryRefs(seedHtml)
  const boundedRefs = refs.slice(0, option.limits.maxLinksPerPage)
  const overflowRefs = refs.slice(option.limits.maxLinksPerPage)

  for (const ref of boundedRefs) {
    const absoluteUrl = resolveAbsoluteUrl(ref.href, normalizedSeed.url)
    if (ref.sourceClassification === 'form_action') {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: ref.href,
          absoluteUrl,
          normalizedUrl: null,
          normalizedRoutePath: null,
          sourceContext: ref.sourceContext,
          sourceClassification: ref.sourceClassification,
          status: 'skipped',
          skippedReason: 'form_action',
        }),
      )
      continue
    }
    if (ref.download) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: ref.href,
          absoluteUrl,
          normalizedUrl: null,
          normalizedRoutePath: null,
          sourceContext: ref.sourceContext,
          sourceClassification: ref.sourceClassification,
          status: 'skipped',
          skippedReason: 'download',
        }),
      )
      continue
    }

    const preNormalizationSkip = resolveDiscoveryPreNormalizationSkip({
      absoluteUrl,
      canonicalHost: normalizedSeed.canonicalHost,
    })
    if (preNormalizationSkip) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: ref.href,
          absoluteUrl,
          normalizedUrl: null,
          normalizedRoutePath: null,
          sourceContext: ref.sourceContext,
          sourceClassification: ref.sourceClassification,
          status: 'skipped',
          skippedReason: preNormalizationSkip,
        }),
      )
      continue
    }

    const normalized = normalizeInternalHref({
      href: ref.href,
      currentPageUrl: normalizedSeed.url,
      canonicalHost: normalizedSeed.canonicalHost,
    })

    if ('skip' in normalized) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: ref.href,
          absoluteUrl,
          normalizedUrl: null,
          normalizedRoutePath: null,
          sourceContext: ref.sourceContext,
          sourceClassification: ref.sourceClassification,
          status: 'skipped',
          skippedReason: mapNormalizationSkipReason(ref.href, normalized.skip),
        }),
      )
      continue
    }

    normalizedUrls.push({
      originalHref: ref.href,
      absoluteUrl,
      normalizedUrl: normalized.normalized.url,
      normalizedRoutePath: normalized.normalized.path,
      changed: absoluteUrl !== normalized.normalized.url,
    })

    if (normalized.normalized.path === normalizedSeed.path) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: ref.href,
          absoluteUrl,
          normalizedUrl: normalized.normalized.url,
          normalizedRoutePath: normalized.normalized.path,
          sourceContext: ref.sourceContext,
          sourceClassification: ref.sourceClassification,
          status: 'skipped',
          skippedReason: 'seed_route',
        }),
      )
      continue
    }

    if (discoveredByRoute.size >= option.limits.maxRoutes) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: ref.href,
          absoluteUrl,
          normalizedUrl: normalized.normalized.url,
          normalizedRoutePath: normalized.normalized.path,
          sourceContext: ref.sourceContext,
          sourceClassification: ref.sourceClassification,
          status: 'skipped',
          skippedReason: 'route_limit',
        }),
      )
      continue
    }

    if (discoveredByRoute.has(normalized.normalized.path)) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: ref.href,
          absoluteUrl,
          normalizedUrl: normalized.normalized.url,
          normalizedRoutePath: normalized.normalized.path,
          sourceContext: ref.sourceContext,
          sourceClassification: ref.sourceClassification,
          status: 'skipped',
          skippedReason: 'duplicate_route',
        }),
      )
      continue
    }

    discoveredByRoute.set(
      normalized.normalized.path,
      buildDiscoveryLinkEntry({
        href: ref.href,
        absoluteUrl,
        normalizedUrl: normalized.normalized.url,
        normalizedRoutePath: normalized.normalized.path,
        sourceContext: ref.sourceContext,
        sourceClassification: ref.sourceClassification,
        status: 'discovered',
        skippedReason: null,
      }),
    )
  }

  for (const ref of overflowRefs) {
    skippedLinks.push(
      buildDiscoveryLinkEntry({
        href: ref.href,
        absoluteUrl: resolveAbsoluteUrl(ref.href, normalizedSeed.url),
        normalizedUrl: null,
        normalizedRoutePath: null,
        sourceContext: ref.sourceContext,
        sourceClassification: ref.sourceClassification,
        status: 'skipped',
        skippedReason: 'max_links_per_page',
      }),
    )
  }

  for (const sitemapUrl of sitemapDiscoveryEvidence.discoveredUrls) {
    normalizedUrls.push({
      originalHref: sitemapUrl.originalUrl,
      absoluteUrl: sitemapUrl.originalUrl,
      normalizedUrl: sitemapUrl.normalizedUrl,
      normalizedRoutePath: sitemapUrl.normalizedRoutePath,
      changed: sitemapUrl.originalUrl !== sitemapUrl.normalizedUrl,
    })

    if (sitemapUrl.normalizedRoutePath === normalizedSeed.path) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: sitemapUrl.originalUrl,
          absoluteUrl: sitemapUrl.originalUrl,
          normalizedUrl: sitemapUrl.normalizedUrl,
          normalizedRoutePath: sitemapUrl.normalizedRoutePath,
          sourceContext: 'unknown',
          sourceClassification: 'anchor',
          status: 'skipped',
          skippedReason: 'seed_route',
        }),
      )
      continue
    }

    if (discoveredByRoute.size >= option.limits.maxRoutes) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: sitemapUrl.originalUrl,
          absoluteUrl: sitemapUrl.originalUrl,
          normalizedUrl: sitemapUrl.normalizedUrl,
          normalizedRoutePath: sitemapUrl.normalizedRoutePath,
          sourceContext: 'unknown',
          sourceClassification: 'anchor',
          status: 'skipped',
          skippedReason: 'route_limit',
        }),
      )
      diagnostics.push(`SITEMAP_LIMIT_REACHED:maxDiscoveredUrls:${option.limits.maxRoutes}`)
      continue
    }

    if (discoveredByRoute.has(sitemapUrl.normalizedRoutePath)) {
      skippedLinks.push(
        buildDiscoveryLinkEntry({
          href: sitemapUrl.originalUrl,
          absoluteUrl: sitemapUrl.originalUrl,
          normalizedUrl: sitemapUrl.normalizedUrl,
          normalizedRoutePath: sitemapUrl.normalizedRoutePath,
          sourceContext: 'unknown',
          sourceClassification: 'anchor',
          status: 'skipped',
          skippedReason: 'duplicate_route',
        }),
      )
      continue
    }

    discoveredByRoute.set(
      sitemapUrl.normalizedRoutePath,
      buildDiscoveryLinkEntry({
        href: sitemapUrl.originalUrl,
        absoluteUrl: sitemapUrl.originalUrl,
        normalizedUrl: sitemapUrl.normalizedUrl,
        normalizedRoutePath: sitemapUrl.normalizedRoutePath,
        sourceContext: 'unknown',
        sourceClassification: 'anchor',
        status: 'discovered',
        skippedReason: null,
      }),
    )
  }

  for (const skippedSitemapUrl of sitemapDiscoveryEvidence.skippedUrls) {
    skippedLinks.push(
      buildDiscoveryLinkEntry({
        href: skippedSitemapUrl.originalUrl ?? '',
        absoluteUrl: skippedSitemapUrl.originalUrl,
        normalizedUrl: skippedSitemapUrl.normalizedUrl,
        normalizedRoutePath: skippedSitemapUrl.normalizedRoutePath,
        sourceContext: 'unknown',
        sourceClassification: 'anchor',
        status: 'skipped',
        skippedReason: `sitemap_${skippedSitemapUrl.reason}`,
      }),
    )
  }

  const discoveredPages = [...discoveredByRoute.values()].sort((a, b) =>
    String(a.normalizedRoutePath ?? '').localeCompare(String(b.normalizedRoutePath ?? '')),
  )
  const routeCandidates = discoveredPages.map((entry) => String(entry.normalizedRoutePath ?? '')).filter(Boolean)
  const sortedSkippedLinks = skippedLinks.sort((a, b) =>
    `${a.skippedReason ?? ''}|${a.originalHref}|${a.absoluteUrl ?? ''}`.localeCompare(`${b.skippedReason ?? ''}|${b.originalHref}|${b.absoluteUrl ?? ''}`),
  )

  const manifest: MultiPageDiscoveryManifest = {
    kind: 'multi_page_discovery_manifest_v1',
    seedUrl: input.sourceUrl,
    normalizedSeedUrl: normalizedSeed.url,
    normalizedSeedRoute: normalizedSeed.path,
    discoveredPages,
    skippedLinks: sortedSkippedLinks,
    routeCandidates,
    normalizedUrls: normalizedUrls.sort((a, b) => `${a.normalizedRoutePath ?? ''}|${a.originalHref}`.localeCompare(`${b.normalizedRoutePath ?? ''}|${b.originalHref}`)),
    depth: {
      seedDepth: 0,
      maxDiscoveredDepth: discoveredPages.length > 0 ? 1 : 0,
    },
    limitsApplied: {
      maxDiscoveredUrls: option.limits.maxRoutes,
      maxDepth: option.limits.maxDepth,
      maxLinksPerPage: option.limits.maxLinksPerPage,
      maxTemplateLinksPerRoute: option.limits.maxTemplateLinksPerRoute,
      maxSitemaps: option.limits.maxSitemaps,
      maxUrlsFromSitemaps: option.limits.maxUrlsFromSitemaps,
      maxNestedSitemaps: option.limits.maxNestedSitemaps,
    },
    diagnostics: uniqueSorted(diagnostics),
    generatedAt,
  }

  const manifestRef = 'importProvenanceSummary.multiPageDiscovery.manifest'
  manifest.diagnostics = uniqueSorted([...manifest.diagnostics, 'MULTIPAGE_DISCOVERY_MANIFEST_PERSISTED_TO_PROVENANCE'])

  const discoveryResult = {
    summary: {
      enabled: true,
      discoveredPageCount: discoveredPages.length,
      skippedLinkCount: sortedSkippedLinks.length,
      routeCandidateCount: routeCandidates.length,
      manifestRef,
      diagnostics: manifest.diagnostics.slice(),
    },
    manifest,
  }
  const acquisition = await acquireScopedMultiPageHtml({
    sourceUrl: input.sourceUrl,
    snapshot: input.snapshot,
    discovery: discoveryResult,
    option,
  })
  const assembly = await assembleScopedMultiPageRawArtifactPages({
    sourceUrl: input.sourceUrl,
    snapshot: input.snapshot,
    acquisition: acquisition.manifest,
    option,
  })

  return {
    summary: {
      ...discoveryResult.summary,
      diagnostics: uniqueSorted([
        ...discoveryResult.summary.diagnostics,
        ...(acquisition.summary.enabled ? acquisition.summary.diagnostics : []),
        ...(assembly.summary.enabled ? assembly.summary.diagnostics : []),
      ]),
      ...(acquisition.summary.enabled ? { htmlAcquisition: acquisition.summary } : {}),
      ...(assembly.summary.enabled ? { rawArtifactAssembly: assembly.summary } : {}),
    },
    manifest,
    sitemapDiscovery,
    acquisition: acquisition.manifest,
    rawArtifactAssembly: assembly.manifest,
  }
}

function derivePageSectionsByPathFromPreparedSite(preparedSite: PreparedSiteModel | null): Record<string, Array<{
  kind: string
  order: number
  layoutKind?: string
  hasCardCluster?: boolean
}>> {
  if (!preparedSite) return {}

  const pageSectionsByPath: Record<string, Array<{ kind: string; order: number; layoutKind?: string; hasCardCluster?: boolean }>> = {}
  const orderedDocs = preparedSite.documents.slice().sort((left, right) => left.path.localeCompare(right.path))
  for (const doc of orderedDocs) {
    const normalizedPath = normalizeRoutePath(inferPagePathFromSourcePath(doc.path))
    const sections = (doc.semantic?.sections ?? [])
      .slice()
      .sort((left, right) => left.ordinalIndex - right.ordinalIndex)
      .map((section, index) => ({
        kind: section.inferredType || 'unknown',
        order: Number.isFinite(section.ordinalIndex) ? Math.max(0, Math.floor(section.ordinalIndex)) : index,
        layoutKind: section.layoutInference?.kind,
        hasCardCluster: Boolean(section.groupingSignals?.cardCluster),
      }))
    pageSectionsByPath[normalizedPath] = sections
  }
  return pageSectionsByPath
}

async function buildMultipageImportFromPreparedSite(input: {
  sourceUrl: string
  preparedSite: PreparedSiteModel | null
}): Promise<RuntimeImportProvenanceSummary['multipageImport']> {
  if (!input.preparedSite || input.preparedSite.documents.length === 0) {
    return {
      summary: {
        enabled: false,
        routeCount: 0,
        pageCount: 0,
        primaryNavigationCount: 0,
        footerNavigationCount: 0,
        sharedRegionCount: 0,
        templateFamilyExtraction: {
          enabled: false,
          familyCount: 0,
          assignedRouteCount: 0,
          singletonFamilyCount: 0,
          mixedFamilyCount: 0,
          listingDetailRelationshipCount: 0,
          highConfidenceFamilyCount: 0,
          diagnostics: [],
        },
        sitemapDiscovery: emptyMultiPageSitemapDiscoverySummary(DEFAULT_SCOPED_DISCOVERY_LIMITS),
        depthLimitHit: false,
        routeLimitHit: false,
        diagnostics: ['MULTIPAGE_DISCOVERY_PARTIAL:no_prepared_documents'],
      },
      tree: null,
    }
  }

  const byPath = new Map<string, string>()
  const sourceUrlNormalized = new URL(input.sourceUrl)
  for (const doc of input.preparedSite.documents) {
    const relative = inferPagePathFromSourcePath(doc.path)
    const normalizedPath = normalizePagePath(relative)
    byPath.set(normalizedPath, doc.domOutline?.bodyChildElements.map((entry) => entry.preservedMarkupHtml ?? '').join(' ') ?? doc.fidelity.title ?? '')
  }

  const fallbackDoc = input.preparedSite.documents.find((doc) => doc.isEntry) ?? input.preparedSite.documents[0]
  const fallbackHtml = fallbackDoc?.path
    ? byPath.get(normalizePagePath(inferPagePathFromSourcePath(fallbackDoc.path))) ?? '<html><body></body></html>'
    : '<html><body></body></html>'

  const tree = await discoverMultipageImportTree(
    {
      siteId: deterministicId('site', input.sourceUrl),
      seedUrl: input.sourceUrl,
      limits: {
        maxRoutes: 120,
        maxDepth: 3,
        maxLinksPerPage: 120,
        maxTemplateLinksPerRoute: 30,
        maxSitemaps: 6,
        maxUrlsFromSitemaps: 120,
        maxNestedSitemaps: 4,
      },
      discoveredAt: null,
    },
    {
      fetchPage: async (url) => {
        const parsed = new URL(url)
        const normalizedPath = normalizePagePath(parsed.pathname || '/')
        const html = byPath.get(normalizedPath)
        if (!html) return null
        return {
          url: `${sourceUrlNormalized.protocol}//${sourceUrlNormalized.host}${normalizedPath}`,
          html: html.includes('<a ') ? `<!doctype html><html><body>${html}</body></html>` : fallbackHtml,
          title: null,
        }
      },
    },
  )

  return {
    summary: summarizeMultipageImportTree(tree),
    tree,
  }
}

async function buildImportProvenanceSummary(input: {
  sourceUrl: string
  snapshot: UrlSinglePageImportSnapshot
  styleSignals: StyleSignalModel
  preparedSite: PreparedSiteModel | null
  multiPageDiscovery: {
    summary: MultiPageDiscoverySummary
    manifest: MultiPageDiscoveryManifest | null
    sitemapDiscovery?: MultiPageSitemapDiscoverySummary | null
    acquisition?: MultiPageHtmlAcquisitionManifest | null
    rawArtifactAssembly?: MultiPageRawArtifactAssemblyManifest | null
  } | null
}): Promise<RuntimeImportProvenanceSummary> {
  const { snapshot, styleSignals, preparedSite } = input
  const semanticImport = resolveSemanticImportForSnapshot(snapshot)
  const captureDiagnostics = (Array.isArray(snapshot.renderedCapture.diagnostics) ? snapshot.renderedCapture.diagnostics : [])
    .map((diag) => normalizeText(diag.code))
    .filter(Boolean)
  const importDiagnostics = snapshot.importDiagnostics.issues.map((issue) => normalizeText(issue.code)).filter(Boolean)
  const persistedCaptureEvidence = persistRenderedCaptureRunEvidence(snapshot)

  const renderedCaptureStatus = resolveRenderedCaptureStatus(snapshot)
  const styleSampleCount = snapshot.renderedCapture.computedStyleSamples.length
  const styleCoverage = toCoverage({ sampleCount: styleSampleCount })
  const renderedDomPath = persistedCaptureEvidence.domPath
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
  const screenshotCount = Math.max(screenshotPaths.length, snapshot.renderedCapture.screenshots.length, persistedCaptureEvidence.screenshotCount)
  const importFidelityScore = computeImportFidelityScore({ preparedSite, styleSignals, snapshot })
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
    ...(snapshot.sourceSelection.sourceMode === 'rendered_dom' ? ['RENDERED_CAPTURE_USED'] : ['RENDERED_CAPTURE_FAILED_FALLBACK_USED']),
    'IMPORT_FIDELITY_SCORE_COMPUTED',
    'RENDERED_CAPTURE_SUMMARY_PERSISTED',
    ...(snapshot.sourceSelection.sourceMode === 'rendered_dom' && workerResultSuccessful ? ['RENDERED_SUMMARY_HYDRATED_FROM_WORKER_SUCCESS'] : []),
    'LATEST_EXECUTION_EVIDENCE_SELECTED',
    ...(snapshot.sourceSelection.sourceMode === 'rendered_dom' && workerResultSuccessful ? ['CAPTURE_WORKER_RESULT_PERSISTED'] : []),
    ...(snapshot.sourceSelection.sourceMode === 'rendered_dom' && importDiagnostics.includes('STALE_EVIDENCE_SUPERSEDED')
      ? ['FALLBACK_EVIDENCE_SUPERSEDED_BY_RENDERED_CAPTURE']
      : []),
    ...(snapshot.sourceSelection.sourceMode === 'raw_html_fallback' && (workerResultSuccessful || workerCapturedEvidence)
      ? ['CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK']
      : []),
    ...(persistedCaptureEvidence.persisted ? ['RENDERED_CAPTURE_PERSISTED'] : []),
    ...(semanticImport?.diagnostics.map((diag) => normalizeText(diag.code)).filter(Boolean) ?? []),
    ...(input.multiPageDiscovery?.sitemapDiscovery?.diagnostics ?? []),
    ...(input.multiPageDiscovery?.summary.htmlAcquisition?.diagnostics ?? []),
    ...(input.multiPageDiscovery?.summary.rawArtifactAssembly?.diagnostics ?? []),
  ])

  const multipageImport = await buildMultipageImportFromPreparedSite({
    sourceUrl: input.sourceUrl,
    preparedSite,
  })
  const siteTreeSeedHtml = readSiteTreeSeedHtml(snapshot)
  const siteTreeSeedContext = resolveSiteTreeSeedContext({
    sourceUrl: input.sourceUrl,
    snapshot,
  })
  const siteTreeSeed = buildSafeSiteTreeFromSeedPage({
    siteId: siteTreeSeedContext.siteId,
    seedUrl: siteTreeSeedContext.seedUrl,
    seedHtml: siteTreeSeedHtml,
    sourceSnapshotId: snapshot.snapshotId,
    sourceRunId: snapshot.snapshotRunId,
  })
  const siteTreePayloadPath = persistSiteTreePayload({
    snapshot,
    tree: siteTreeSeed.tree,
  })
  const siteTreeSummary = {
    ...siteTreeSeed.summary,
    payloadPath: siteTreePayloadPath,
  }
  const templateFamiliesModel = buildFamilyHandoffModel({
    siteId: siteTreeSeedContext.siteId,
    siteTree: siteTreeSeed.tree,
    pageSectionsByPath: derivePageSectionsByPathFromPreparedSite(preparedSite),
  })
  const templateFamiliesPayloadPath = persistTemplateFamiliesPayload({
    snapshot,
    model: templateFamiliesModel,
  })
  const templateFamiliesSummary = summarizeTemplateFamilies(templateFamiliesModel, templateFamiliesPayloadPath)

  return {
    kind: 'runtime_import_provenance_summary_v1',
    captureMode: snapshot.captureMode ?? 'raw_html_only',
    executionIdentity: {
      snapshotId: snapshot.snapshotId,
      snapshotRunId: snapshot.snapshotRunId,
      snapshotStableRootDirAbs: snapshot.snapshotStableRootDirAbs,
      snapshotRunRootDirAbs: snapshot.snapshotRootDirAbs,
      requestId: snapshot.requestId ?? null,
    },
    sourceMode: snapshot.sourceSelection.sourceMode,
    importFidelityStatus: snapshot.sourceSelection.fidelityStatus,
    renderedCaptureStatus,
    renderedDomQuality: snapshot.sourceSelection.renderedDomQuality.quality,
    importFidelityScore,
    screenshotCount,
    computedStyleSampleCount: snapshot.renderedCapture.computedStyleSamples.length,
    renderedCapture: {
      used: snapshot.sourceSelection.sourceMode === 'rendered_dom',
      status: renderedCaptureStatus,
      quality: snapshot.sourceSelection.renderedDomQuality.quality,
      domLength: persistedCaptureEvidence.domSize,
      nodeCount: persistedCaptureEvidence.domSize > 0 ? Math.max(1, snapshot.sourceSelection.renderedDomQuality.meaningfulNodeCount) : 0,
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
    semanticImport,
    multipageImport,
    multiPageDiscovery: input.multiPageDiscovery
      ? {
          summary: input.multiPageDiscovery.summary,
          manifest: input.multiPageDiscovery.manifest,
          sitemapDiscovery: input.multiPageDiscovery.sitemapDiscovery ?? null,
          acquisition: input.multiPageDiscovery.acquisition ?? null,
          rawArtifactAssembly: input.multiPageDiscovery.rawArtifactAssembly ?? null,
        }
      : null,
    siteTree: {
      summary: siteTreeSummary,
      tree: siteTreeSeed.tree,
    },
    templateFamilies: {
      summary: templateFamiliesSummary,
      families: templateFamiliesModel,
    },
  }
}

function summarizeProvenancePayload(summary: RuntimeImportProvenanceSummary): Record<string, unknown> {
  return {
    kind: summary.kind,
    captureMode: summary.captureMode ?? 'raw_html_only',
    sourceMode: summary.sourceMode,
    importFidelityStatus: summary.importFidelityStatus,
    importFidelityScore: summary.importFidelityScore ?? null,
    renderedCaptureStatus: summary.renderedCaptureStatus,
    renderedDomQuality: summary.renderedDomQuality,
    screenshotCount: summary.screenshotCount,
    computedStyleSampleCount: summary.computedStyleSampleCount,
    importDiagnosticCodeCount: Array.isArray(summary.importDiagnosticCodes) ? summary.importDiagnosticCodes.length : 0,
    semanticImportSectionCount: summary.semanticImport?.sections.length ?? 0,
    multipageImport: summary.multipageImport?.summary ?? null,
    multiPageDiscovery: summary.multiPageDiscovery?.summary ?? null,
    multiPageHtmlAcquisition: summary.multiPageDiscovery?.summary.htmlAcquisition ?? null,
    multiPageRawArtifactAssembly: summary.multiPageDiscovery?.summary.rawArtifactAssembly ?? null,
    siteTree: summary.siteTree?.summary ?? null,
    templateFamilies: summary.templateFamilies?.summary ?? null,
  }
}

function mapSectionsFromRawSemanticImport(input: {
  semanticSections: NonNullable<SemanticImportResult['sections']>
}): Array<{ id: string; type: string; order: number; props: Record<string, unknown> }> {
  return input.semanticSections.map((section, index) => {
    const normalizedType = section.confidence >= 0.6 ? section.type : 'content'
    return {
      id: section.id,
      type: normalizedType,
      order: index,
      props: {
        semanticType: section.type,
        layoutStructural: {
          intent: SECTION_INTENT_BY_SEMANTIC_TYPE[normalizedType] ?? 'body',
          structuralConfidence: section.confidence,
        },
        htmlSummary: {
          extractedText: normalizeText(section.intro) || normalizeText(section.title),
          extractedImageSrcs: uniqueSorted(section.images.map((image) => normalizeText(image.src)).filter(Boolean)),
          extractedLinks: uniqueSorted(section.ctas.map((cta) => `${normalizeText(cta.url)}::${normalizeText(cta.label)}`).filter(Boolean)).map((entry) => {
            const [href, label] = entry.split('::')
            return { href: href ?? '', label: label ?? '' }
          }),
        },
        importedSemantic: {
          confidence: section.confidence,
          diagnostics: section.diagnostics,
          itemCount: section.items.length,
          ctaCount: section.ctas.length,
          formCount: section.forms.length,
        },
      },
    }
  })
}

function buildCanonicalMigrationInputFromPipeline(input: {
  sourceUrl: string
  actor: string
  preparedSite: PreparedSiteModel
  layoutModel: LayoutPreparationModel | null
  snapshot: UrlSinglePageImportSnapshot
  styleSignals: StyleSignalModel
  siteId?: string
}): CanonicalSiteMigrationInput {
  const entrySourcePath = input.preparedSite.source.entryHtmlPath ?? input.preparedSite.documents[0]?.path ?? '/'
  const entryPagePath = inferPagePathFromSourcePath(entrySourcePath)
  const siteId = normalizeText(input.siteId) || resolveSiteId(input.sourceUrl, entryPagePath)

  const layoutByDocumentId = new Map(input.layoutModel?.pages.map((page) => [page.sourceDocumentId, page]) ?? [])
  const importFidelitySignals = buildImportFidelitySignals(input.snapshot)
  const semanticImport = resolveSemanticImportForSnapshot(input.snapshot)
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
      const pagePathResolution = resolveCanonicalPagePathForDocument({
        sourcePath: doc.path,
        isEntryDocument: Boolean(doc.isEntry),
        snapshot: input.snapshot,
      })
      const pagePath = pagePathResolution.pagePath
      const pageId = deterministicId('page', `${siteId}:${pagePath}`)
      if (pagePathResolution.forcedToCanonicalHome) {
        console.info('[scoped-import] RAW_HTML_PREVIEW_PAGE_CREATED', {
          siteId,
          runtimeSiteId: siteId,
          runtimeSiteVersionId: null,
          candidatePaths: uniqueSorted([pagePathResolution.inferredPath, pagePath]),
          selectedPath: pagePath,
          matchedPage: {
            id: pageId,
            path: pagePath,
          },
          unresolvedPathsCount: 0,
          sourcePath: doc.path,
          captureMode: input.snapshot.captureMode ?? 'raw_html_only',
          sourceMode: input.snapshot.sourceSelection.sourceMode,
        })
      }
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
      const rawSemanticSections = doc.isEntry ? (semanticImport?.sections ?? []) : []
      const mappedSections = semanticSections.length
        ? mapSectionsFromSemantic({ semanticSections, blockById })
        : (rawSemanticSections.length
            ? mapSectionsFromRawSemanticImport({ semanticSections: rawSemanticSections })
            : [])
      const mappedSectionsOrLayout = mappedSections.length
        ? mappedSections
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

      const sections = mappedSectionsOrLayout.length
        ? mappedSectionsOrLayout
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
          ...(doc.semantic?.fidelityScore
            ? [
                {
                  label: `import.fidelity.score.overall:${doc.semantic.fidelityScore.overallScore.toFixed(3)}`,
                  confidence: 0.92,
                  source: 'migration' as const,
                },
                {
                  label: `import.fidelity.score.level:${doc.semantic.fidelityScore.fidelityLevel}`,
                  confidence: 0.92,
                  source: 'migration' as const,
                },
              ]
            : []),
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
  importProvenanceSummary: RuntimeImportProvenanceSummary
}): {
  executionStatus: 'success' | 'failed'
  consolidationApplied: boolean
  renderedCaptureUsed: boolean
  captureMode: UrlSinglePageImportSnapshot['captureMode']
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
  importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore']
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
    captureMode: input.snapshot.captureMode ?? 'raw_html_only',
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
    importFidelityScore: input.importProvenanceSummary.importFidelityScore ?? null,
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
    captureMode: UrlSinglePageImportSnapshot['captureMode']
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
    importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore']
    multiPageDiscovery: MultiPageDiscoverySummary
    cmsContentSlots: ScopedImportCmsSlotMaterializationResult
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
    captureMode: UrlSinglePageImportSnapshot['captureMode']
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
    importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore']
    multiPageDiscovery: MultiPageDiscoverySummary
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

export class ScopedImportPipelineFailureError extends Error {
  readonly code = 'SCOPED_IMPORT_PIPELINE_FAILED' as const
  readonly pipelineSummary: string
  readonly firstFailedStageId: string | null
  readonly firstFailedStageSummary: string | null
  readonly firstFailedStageDiagnostics: Array<{
    severity: string
    code: string
    message: string
    source: string
    details: Record<string, unknown> | null
  }>
  readonly pipelineDiagnosticCodes: string[]
  readonly pipelineDiagnostics: Array<{
    severity: string
    code: string
    message: string
    source: string
    stageId: string | null
    details: Record<string, unknown> | null
  }>
  readonly stageSummaries: string[]
  readonly importInput: {
    rootDir: string
    entryHtmlPath: string
    assetsDirPath: string | null
    snapshotRootDirAbs: string
    entryHtmlPathAbs: string
    assetsDirAbs: string
  }

  constructor(input: {
    pipelineSummary: string
    firstFailedStageId: string | null
    firstFailedStageSummary: string | null
    firstFailedStageDiagnostics: Array<{
      severity: string
      code: string
      message: string
      source: string
      details: Record<string, unknown> | null
    }>
    pipelineDiagnosticCodes: string[]
    pipelineDiagnostics: Array<{
      severity: string
      code: string
      message: string
      source: string
      stageId: string | null
      details: Record<string, unknown> | null
    }>
    stageSummaries: string[]
    importInput: {
      rootDir: string
      entryHtmlPath: string
      assetsDirPath: string | null
      snapshotRootDirAbs: string
      entryHtmlPathAbs: string
      assetsDirAbs: string
    }
  }) {
    const stageSuffix = input.firstFailedStageId ? `; first_failed_stage=${input.firstFailedStageId}` : ''
    super(`Scoped pipeline import failed without fallback: ${input.pipelineSummary}${stageSuffix}`)
    this.name = 'ScopedImportPipelineFailureError'
    this.pipelineSummary = input.pipelineSummary
    this.firstFailedStageId = input.firstFailedStageId
    this.firstFailedStageSummary = input.firstFailedStageSummary
    this.firstFailedStageDiagnostics = input.firstFailedStageDiagnostics
    this.pipelineDiagnosticCodes = input.pipelineDiagnosticCodes
    this.pipelineDiagnostics = input.pipelineDiagnostics
    this.stageSummaries = input.stageSummaries
    this.importInput = input.importInput
  }
}

export type ScopedImportPipelineDependencies = {
  importStaticSite: typeof importStaticSite
  createImportManifest: typeof createImportManifest
  runLinearMigrationPipeline: typeof runLinearMigrationPipeline
  createSiteVersionFromMigration: typeof createSiteVersionFromMigration
  setSiteVersionImportProvenanceSummary: typeof setSiteVersionImportProvenanceSummary
  getSiteVersion: typeof getSiteVersion
  buildDeterministicArtifactBundle: typeof buildDeterministicArtifactBundleType
  createArtifact: typeof createArtifact
  bindArtifactToVersion: typeof bindArtifactToVersion
  persistRawImportedSiteArtifact: typeof persistRawImportedSiteArtifact
  upsertContentSlots: typeof upsertContentSlots
  importHtmlToPage: typeof importHtmlToPage
  migrateImportedPageToCanonicalDraft: typeof migrateImportedPageToCanonicalDraft
}

async function defaultDependencies(overrides: Partial<ScopedImportPipelineDependencies> = {}): Promise<ScopedImportPipelineDependencies> {
  const buildDeterministicArtifactBundle =
    overrides.buildDeterministicArtifactBundle ?? (await import('@/gnr8/runtime/artifact-builder')).buildDeterministicArtifactBundle

  return {
    importStaticSite,
    createImportManifest,
    runLinearMigrationPipeline,
    createSiteVersionFromMigration,
    setSiteVersionImportProvenanceSummary,
    getSiteVersion,
    createArtifact,
    bindArtifactToVersion,
    persistRawImportedSiteArtifact,
    upsertContentSlots,
    importHtmlToPage,
    migrateImportedPageToCanonicalDraft,
    ...overrides,
    buildDeterministicArtifactBundle,
  }
}

export type ScopedImportCmsSlotMaterializationResult = {
  diagnostics: string[]
  inferredSlotCount: number
  persistedSlotCount: number
  skippedSlotCount: number
  persistenceFailed: boolean
  errorMessage: string | null
}

function uniqueSlotsByKey<T extends { slotKey: string }>(slots: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const slot of slots) {
    const key = normalizeText(slot.slotKey)
    if (!key || byKey.has(key)) continue
    byKey.set(key, slot)
  }
  return [...byKey.values()].sort((left, right) => left.slotKey.localeCompare(right.slotKey))
}

export async function materializeCmsContentSlotsForScopedImport(input: {
  siteId: string
  siteVersionId: string
  html: string
  semanticImport: SemanticImportResult | null
  persistContentSlots?: typeof upsertContentSlots
}): Promise<ScopedImportCmsSlotMaterializationResult> {
  const diagnostics: string[] = []
  const html = String(input.html ?? '')
  const persistContentSlots = input.persistContentSlots ?? upsertContentSlots

  if (!normalizeText(html) || !input.semanticImport) {
    diagnostics.push('CMS_SLOT_INFERENCE_SKIPPED')
    return {
      diagnostics,
      inferredSlotCount: 0,
      persistedSlotCount: 0,
      skippedSlotCount: 0,
      persistenceFailed: false,
      errorMessage: null,
    }
  }

  diagnostics.push('CMS_SLOT_INFERENCE_STARTED')
  const inferred = inferContentSlotsFromSemanticImport({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    html,
    semanticImport: input.semanticImport,
  })
  const slots = uniqueSlotsByKey(inferred.slots)
  diagnostics.push(...inferred.diagnostics)
  diagnostics.push('CMS_SLOT_INFERENCE_COMPLETED')

  if (slots.length === 0) {
    return {
      diagnostics,
      inferredSlotCount: 0,
      persistedSlotCount: 0,
      skippedSlotCount: 0,
      persistenceFailed: false,
      errorMessage: null,
    }
  }

  diagnostics.push('CMS_SLOT_PERSISTENCE_STARTED')
  try {
    const persistedSlotCount = await persistContentSlots({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slots,
    })
    diagnostics.push('CMS_SLOT_PERSISTENCE_COMPLETED')
    return {
      diagnostics,
      inferredSlotCount: slots.length,
      persistedSlotCount,
      skippedSlotCount: Math.max(0, slots.length - persistedSlotCount),
      persistenceFailed: false,
      errorMessage: null,
    }
  } catch (error) {
    diagnostics.push('CMS_SLOT_PERSISTENCE_FAILED')
    return {
      diagnostics,
      inferredSlotCount: slots.length,
      persistedSlotCount: 0,
      skippedSlotCount: slots.length,
      persistenceFailed: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

function toSnapshotRelativePath(input: { rootDirAbs: string; targetPathAbs: string; label: 'entryHtmlPath' | 'assetsDirPath' }): string {
  const rootDirAbs = path.resolve(input.rootDirAbs)
  const targetPathAbs = path.resolve(input.targetPathAbs)
  const rel = path.relative(rootDirAbs, targetPathAbs)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Scoped import ${input.label} must resolve inside snapshot root (root=${rootDirAbs}; target=${targetPathAbs}; rel=${rel || '<empty>'}).`,
    )
  }
  return rel.replaceAll('\\', '/')
}

function mediaTypeFromPath(filePath: string): string {
  const ext = path.posix.extname(filePath.toLowerCase())
  if (ext === '.html' || ext === '.htm') return 'text/html; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'application/javascript; charset=utf-8'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.woff') return 'font/woff'
  if (ext === '.woff2') return 'font/woff2'
  if (ext === '.ttf') return 'font/ttf'
  if (ext === '.ico') return 'image/x-icon'
  return 'application/octet-stream'
}

function collectRawImportFiles(snapshotRootDirAbs: string): Array<{ path: string; mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer }> {
  const out: Array<{ path: string; mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer }> = []
  const stack = [snapshotRootDirAbs]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.resolve(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(abs)
        continue
      }
      if (!entry.isFile()) continue
      const rel = path.relative(snapshotRootDirAbs, abs).replaceAll('\\', '/').replace(/^\/+/, '')
      if (!rel || rel.includes('..')) continue
      const bytes = fs.readFileSync(abs)
      out.push({
        path: rel,
        mediaType: mediaTypeFromPath(rel),
        sizeBytes: bytes.byteLength,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        bytes,
      })
    }
  }
  return out
}

export async function runScopedImportPipeline(input: {
  snapshot: UrlSinglePageImportSnapshot
  sourceUrl: string
  actor: string
  fallbackToLegacyOnPipelineFailure?: boolean
  legacySlug?: string
  legacyTitle?: string
  runtimeIdentity?: {
    siteId: string
    siteVersionId: string
  }
  multiPageDiscovery?: ScopedMultiPageDiscoveryOption
  deps?: Partial<ScopedImportPipelineDependencies>
}): Promise<ScopedImportPipelineOutcome> {
  if (
    typeof input.multiPageDiscovery === 'object' &&
    input.multiPageDiscovery?.acquireHtml === true &&
    input.multiPageDiscovery.enabled !== true
  ) {
    throw new Error('Multi-page HTML acquisition requires multiPageDiscovery.enabled=true.')
  }
  if (
    typeof input.multiPageDiscovery === 'object' &&
    input.multiPageDiscovery?.assembleRawArtifactPages === true &&
    input.multiPageDiscovery.enabled !== true
  ) {
    throw new Error('Multi-page raw artifact assembly requires multiPageDiscovery.enabled=true.')
  }
  if (
    typeof input.multiPageDiscovery === 'object' &&
    input.multiPageDiscovery?.assembleRawArtifactPages === true &&
    input.multiPageDiscovery.acquireHtml !== true
  ) {
    throw new Error('Multi-page raw artifact assembly requires multiPageDiscovery.acquireHtml=true.')
  }
  const deps = await defaultDependencies(input.deps)
  const fallbackToLegacy = input.fallbackToLegacyOnPipelineFailure ?? true
  let assetsDirPath: string | null = null
  try {
    const assetsStat = fs.statSync(input.snapshot.assetsDirAbs)
    if (assetsStat.isDirectory()) {
      assetsDirPath = toSnapshotRelativePath({
        rootDirAbs: input.snapshot.snapshotRootDirAbs,
        targetPathAbs: input.snapshot.assetsDirAbs,
        label: 'assetsDirPath',
      })
    }
  } catch {
    assetsDirPath = null
  }
  const importInput = {
    rootDir: path.resolve(input.snapshot.snapshotRootDirAbs),
    entryHtmlPath: toSnapshotRelativePath({
      rootDirAbs: input.snapshot.snapshotRootDirAbs,
      targetPathAbs: input.snapshot.entryHtmlPathAbs,
      label: 'entryHtmlPath',
    }),
    assetsDirPath,
  }

  const importOutput = await deps.importStaticSite({
    rootDir: importInput.rootDir,
    requestId: `scoped-import-${Date.now()}`,
    source: {
      kind: 'single-entry-html',
      entryHtmlPath: importInput.entryHtmlPath,
      assetsDirPath: importInput.assetsDirPath ?? undefined,
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
  const multiPageDiscovery = await buildScopedMultiPageDiscovery({
    option: input.multiPageDiscovery,
    sourceUrl: input.sourceUrl,
    snapshot: input.snapshot,
  })
  const importProvenanceSummary = await buildImportProvenanceSummary({
    sourceUrl: input.sourceUrl,
    snapshot: input.snapshot,
    styleSignals,
    preparedSite,
    multiPageDiscovery: multiPageDiscovery.summary.enabled ? multiPageDiscovery : null,
  })

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
      siteId: input.runtimeIdentity?.siteId,
    })

    const migrated = await deps.createSiteVersionFromMigration({
      ...canonicalInput,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
      importProvenanceSummary,
      siteVersionId: input.runtimeIdentity?.siteVersionId,
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
    console.info('[scoped-import] RAW_IMPORT_ARTIFACT_PERSIST_STARTED', {
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
    })
    console.info('[scoped-import] RAW_IMPORT_ASSET_PERSIST_STARTED', {
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
    })
    const persistedFileRows = collectRawImportFiles(input.snapshot.snapshotRootDirAbs)
    const unresolvedExternalAssets = input.snapshot.fetchManifest.filter((entry) => entry.fetchStatus !== 'fetched' && Boolean(entry.resolvedUrl))
    const rawAssemblySummary = importProvenanceSummary.multiPageDiscovery?.summary.rawArtifactAssembly ?? null
    const rawImportArtifact = await deps.persistRawImportedSiteArtifact({
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      entryHtmlPath: importInput.entryHtmlPath,
      assetBasePath: path.posix.dirname(importInput.entryHtmlPath) || '.',
      fileRows: persistedFileRows,
      metadata: {
        sourceUrl: input.snapshot.sourceUrl,
        finalUrl: input.snapshot.importIntake?.evidence?.finalUrl ?? null,
        htmlByteLength: input.snapshot.importIntake?.htmlByteLength ?? fs.readFileSync(input.snapshot.entryHtmlPathAbs).byteLength,
        diagnostics: {
          codes: [
            'RAW_IMPORT_ARTIFACT_PERSIST_STARTED',
            'RAW_IMPORT_ASSET_PERSIST_STARTED',
            'RAW_IMPORT_ASSET_PERSIST_COMPLETED',
            'RAW_IMPORT_ARTIFACT_PERSIST_COMPLETED',
            ...(unresolvedExternalAssets.length > 0 ? ['RAW_IMPORT_ASSET_EXTERNAL_FALLBACK_USED'] : []),
            ...(rawAssemblySummary?.enabled ? rawAssemblySummary.diagnostics : []),
          ],
        },
        ...(rawAssemblySummary?.enabled
          ? {
              multiPage: {
                enabled: true,
                pageCount: rawAssemblySummary.assembledPageCount + 1,
                routeMapRef: rawAssemblySummary.routeMapRef ?? 'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap',
              },
            }
          : {}),
        assetSummary: {
          persistedAssetCount: persistedFileRows.length,
          externalFallbackAssetCount: unresolvedExternalAssets.length,
        },
      },
    })
    console.info('[scoped-import] RAW_IMPORT_ASSET_PERSIST_COMPLETED', {
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      persistedAssetCount: rawImportArtifact.fileCount,
      externalFallbackAssetCount: unresolvedExternalAssets.length,
    })
    console.info('[scoped-import] RAW_IMPORT_ARTIFACT_PERSIST_COMPLETED', {
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      artifactId: rawImportArtifact.artifactId,
    })

    const rawEntryHtml = (() => {
      try {
        return fs.readFileSync(input.snapshot.entryHtmlPathAbs, 'utf8')
      } catch {
        return ''
      }
    })()
    const cmsContentSlots = await materializeCmsContentSlotsForScopedImport({
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      html: rawEntryHtml,
      semanticImport: importProvenanceSummary.semanticImport ?? resolveSemanticImportForSnapshot(input.snapshot),
      persistContentSlots: deps.upsertContentSlots,
    })
    console.info('[scoped-import] CMS_SLOT_MATERIALIZATION_COMPLETED', {
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      inferredSlotCount: cmsContentSlots.inferredSlotCount,
      persistedSlotCount: cmsContentSlots.persistedSlotCount,
      skippedSlotCount: cmsContentSlots.skippedSlotCount,
      persistenceFailed: cmsContentSlots.persistenceFailed,
      diagnostics: cmsContentSlots.diagnostics,
    })

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
      importProvenanceSummary,
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
        multiPageDiscovery: multiPageDiscovery.summary,
        cmsContentSlots,
        artifactGenerated: true,
        writePath: writePathDiagnostics,
      },
    }
  }

  if (!fallbackToLegacy) {
    const firstFailedStage = pipelineResult.stages.find((stage) => stage.status === 'failed') ?? null
    throw new ScopedImportPipelineFailureError({
      pipelineSummary: pipelineResult.summary,
      firstFailedStageId: firstFailedStage?.stageId ?? null,
      firstFailedStageSummary: firstFailedStage?.summary ?? null,
      firstFailedStageDiagnostics: (firstFailedStage?.diagnostics ?? []).map((issue) => ({
        severity: normalizeText(issue.severity),
        code: normalizeText(issue.code),
        message: normalizeText(issue.message),
        source: normalizeText(issue.source),
        details: normalizeDiagnosticDetails(issue.details),
      })),
      pipelineDiagnosticCodes: uniqueSorted(pipelineResult.diagnostics.map((issue) => normalizeText(issue.code)).filter(Boolean)),
      pipelineDiagnostics: pipelineResult.diagnostics.map((issue) => ({
        severity: normalizeText(issue.severity),
        code: normalizeText(issue.code),
        message: normalizeText(issue.message),
        source: normalizeText(issue.source),
        stageId: normalizeText(issue.stageId) || null,
        details: normalizeDiagnosticDetails(issue.details),
      })),
      stageSummaries: pipelineResult.stages.map((stage) => stage.summary),
      importInput: {
        rootDir: importInput.rootDir,
        entryHtmlPath: importInput.entryHtmlPath,
        assetsDirPath: importInput.assetsDirPath,
        snapshotRootDirAbs: input.snapshot.snapshotRootDirAbs,
        entryHtmlPathAbs: input.snapshot.entryHtmlPathAbs,
        assetsDirAbs: input.snapshot.assetsDirAbs,
      },
    })
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
      captureMode: input.snapshot.captureMode ?? 'raw_html_only',
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
      importFidelityScore: importProvenanceSummary.importFidelityScore ?? null,
      multiPageDiscovery: multiPageDiscovery.summary,
      writePath: fallbackWritePath,
    },
  }
}

export const __scopedImportPipelineTestUtils = {
  buildCanonicalMigrationInputFromPipeline,
  inferPagePathFromSourcePath,
}
