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
  type ImportFidelityScore,
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
import { discoverMultipageImportTree, summarizeMultipageImportTree } from '@/gnr8/multipage-import'
import { buildSafeSiteTreeFromSeedPage, normalizeRoutePath, type SiteTree } from '@/gnr8/site-tree'
import { buildFamilyHandoffModel, summarizeTemplateFamilies, type FamilyHandoffModel } from '@/gnr8/family-mode'
import { runSemanticImportEngine, type SemanticImportResult } from '@/gnr8/import-semantic/semantic-import-engine'

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
}): CanonicalSiteMigrationInput {
  const entrySourcePath = input.preparedSite.source.entryHtmlPath ?? input.preparedSite.documents[0]?.path ?? '/'
  const entryPagePath = inferPagePathFromSourcePath(entrySourcePath)
  const siteId = resolveSiteId(input.sourceUrl, entryPagePath)

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
  const importProvenanceSummary = await buildImportProvenanceSummary({
    sourceUrl: input.sourceUrl,
    snapshot: input.snapshot,
    styleSignals,
    preparedSite,
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
      writePath: fallbackWritePath,
    },
  }
}

export const __scopedImportPipelineTestUtils = {
  buildCanonicalMigrationInputFromPipeline,
  inferPagePathFromSourcePath,
}
