import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'
import type { RenderedCaptureDiagnostic, RenderedCaptureResult } from '@/gnr8/import-rendered-capture/rendered-capture-contract'
import type { LayoutGeometryEvidence } from '@/gnr8/architecture/evidence-capture-layout-contract'
import { resolveRenderedCaptureWorkerClientConfigFromEnv } from '@/gnr8/import-rendered-capture-worker/worker-config'
import { attachEvidenceCaptureBaselineArtifact } from '@/gnr8/architecture/evidence-capture-baseline-artifact'
import { getSuperadminPool } from '@/src/superadmin/db'

type RuntimeVersionRow = {
  id: string
  site_id: string
  ownership_site_id: string
  import_provenance_summary: unknown
}

type RenderedEvidencePaths = {
  snapshotRootDirAbs: string
  renderedDomPath: string | null
  computedStylesPath: string | null
  layoutGeometryPath: string | null
  renderedCaptureManifestPath: string
  acquisitionEvidencePath: string
  viewportScreenshotPath: string | null
  fullpageScreenshotPath: string | null
  screenshotPaths: string[]
  domLength: number
  domNodeCount: number
  computedStyleSampleCount: number
  layoutGeometryEvidence: LayoutGeometryEvidence[]
}

type RenderedCapturePersistResult = {
  runtimeSiteId: string
  runtimeSiteVersionId: string
  siteVersionId: string
  sourceMode: RuntimeImportProvenanceSummary['sourceMode']
  renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus']
  renderedDomQuality: RuntimeImportProvenanceSummary['renderedDomQuality']
  hasUsableEvidence: boolean
  failureReason: string | null
  evidence: RenderedEvidencePaths
  importProvenanceSummary: RuntimeImportProvenanceSummary
}

type RawImportArtifactHtmlLookupResult =
  | {
      status: 'found'
      artifactId: string
      artifactCreatedAt: string | null
      artifactEntryHtmlPath: string
      selectedHtmlPath: string
      mediaType: string
      sizeBytes: number
      sha256: string
      htmlBytes: Buffer
    }
  | {
      status: 'artifact_not_found'
    }
  | {
      status: 'html_missing'
      artifactId: string
      artifactCreatedAt: string | null
      artifactEntryHtmlPath: string
      candidateHtmlPaths: string[]
    }

type CaptureSourceResolution = {
  snapshotRootDirAbs: string
  entryHtmlPathAbs: string
  diagnostics: RenderedCaptureDiagnostic[]
}

const DEFAULT_CAPTURE_VIEWPORT = { width: 1366, height: 768 }
const DEFAULT_CAPTURE_READINESS_POLICY = {
  navigationTimeoutMs: 20_000,
  networkQuietTimeoutMs: 4_000,
  domStabilizationWindowMs: 2_500,
  domStabilizationPollMs: 250,
  maxTotalCaptureMs: 30_000,
  shellContentMinLength: 120,
  shellDetectionRetryCount: 1,
  shellDetectionRetryDelayMs: 1_500,
}

export type SiteRenderCaptureErrorCode =
  | 'SITE_RENDER_RUNTIME_SITE_VERSION_NOT_FOUND'
  | 'SITE_RENDER_RUNTIME_SITE_VERSION_SCOPE_MISMATCH'
  | 'SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND'
  | 'SITE_RENDER_CAPTURE_FAILED'

export class SiteRenderCaptureError extends Error {
  readonly code: SiteRenderCaptureErrorCode
  readonly siteVersionId: string
  readonly siteId: string

  constructor(input: {
    code: SiteRenderCaptureErrorCode
    message: string
    siteVersionId: string
    siteId: string
  }) {
    super(input.message)
    this.name = 'SiteRenderCaptureError'
    this.code = input.code
    this.siteVersionId = input.siteVersionId
    this.siteId = input.siteId
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toRenderableDomQuality(input: { domHtml: string; domNodeCount: number }): RuntimeImportProvenanceSummary['renderedDomQuality'] {
  const domLength = normalizeText(input.domHtml).length
  if (input.domNodeCount >= 12 && domLength >= 300) return 'strong'
  if (input.domNodeCount >= 3 && domLength >= 60) return 'weak'
  return 'unusable'
}

function countMeaningfulDomNodes(domHtml: string): number {
  return (domHtml.match(/<(p|h1|h2|h3|h4|h5|h6|li|a|button|img|section|article|header|main|footer)\b/gi) ?? []).length
}

function resolveCaptureStatus(status: string): RuntimeImportProvenanceSummary['renderedCaptureStatus'] {
  if (status === 'available' || status === 'partial') return status
  return 'failed'
}

function hasUsableRenderedEvidence(input: {
  evidence: RenderedEvidencePaths
}): boolean {
  return input.evidence.domNodeCount > 0 || input.evidence.screenshotPaths.length > 0 || input.evidence.domLength > 0
}

function hasDiagnosticCode(input: {
  diagnostics: RenderedCaptureDiagnostic[]
  code: string
}): boolean {
  return input.diagnostics.some((entry) => normalizeText(entry.code) === input.code)
}

function toDiagnostic(input: {
  code: RenderedCaptureDiagnostic['code']
  message: string
  severity?: RenderedCaptureDiagnostic['severity']
  details?: Record<string, unknown>
}): RenderedCaptureDiagnostic {
  return {
    code: input.code,
    message: input.message,
    severity: input.severity ?? 'info',
    details: input.details,
  }
}

function emitSourceResolutionDiagnostics(input: {
  siteId: string
  runtimeSiteId: string
  siteVersionId: string
  diagnostics: RenderedCaptureDiagnostic[]
}): void {
  for (const diagnostic of input.diagnostics) {
    const logPayload = {
      siteId: input.siteId,
      runtimeSiteId: input.runtimeSiteId,
      runtimeSiteVersionId: input.siteVersionId,
      message: diagnostic.message,
      details: diagnostic.details ?? {},
    }
    if (diagnostic.severity === 'error') {
      console.error(`[site-render-worker] ${diagnostic.code}`, logPayload)
    } else if (diagnostic.severity === 'warning') {
      console.warn(`[site-render-worker] ${diagnostic.code}`, logPayload)
    } else {
      console.info(`[site-render-worker] ${diagnostic.code}`, logPayload)
    }
  }
}

function resolveFailureCodeFromDiagnostics(input: {
  diagnostics: RenderedCaptureDiagnostic[]
  emptySuccess: boolean
  renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus']
}): string | null {
  if (input.emptySuccess) return 'SITE_RENDER_CAPTURE_EMPTY_SUCCESS'
  if (input.renderedCaptureStatus !== 'failed') return null
  const prioritizedCodes = [
    'CAPTURE_WORKER_EMPTY_RENDER_RESULT',
    'CAPTURE_WORKER_NOT_CONFIGURED',
    'CAPTURE_WORKER_DISABLED',
    'CAPTURE_WORKER_TIMEOUT',
    'CAPTURE_WORKER_UNAUTHORIZED',
    'CAPTURE_WORKER_HTTP_ERROR',
    'CAPTURE_WORKER_RESPONSE_INVALID',
    'CAPTURE_WORKER_EXECUTION_FAILED',
    'CAPTURE_WORKER_UNAVAILABLE',
    'RENDERED_CAPTURE_TIMEOUT',
    'DOM_EMPTY_AFTER_RENDER',
    'RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION',
    'RENDERED_CAPTURE_FAILED',
  ]
  for (const prioritizedCode of prioritizedCodes) {
    if (hasDiagnosticCode({ diagnostics: input.diagnostics, code: prioritizedCode })) {
      return prioritizedCode
    }
  }
  const captureCodes = input.diagnostics.map((entry) => normalizeText(entry.code)).filter(Boolean)
  return normalizeText(captureCodes.find((code) => code.endsWith('FAILED')) ?? captureCodes[0] ?? 'RENDERED_CAPTURE_FAILED')
}

function readRenderedDomFromResult(input: {
  snapshotRootDirAbs: string
  renderedDocumentPath: string | null
}): string {
  if (input.renderedDocumentPath) {
    try {
      return fs.readFileSync(input.renderedDocumentPath, 'utf8')
    } catch {
      // fall through to fallback path
    }
  }
  const fallback = path.resolve(input.snapshotRootDirAbs, 'rendered-capture', 'rendered-dom.html')
  try {
    return fs.readFileSync(fallback, 'utf8')
  } catch {
    return ''
  }
}

function normalizeArtifactFilePath(value: unknown): string {
  const normalized = normalizeText(value).replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.') return ''
  const clean = path.posix.normalize(normalized)
  if (!clean || clean === '.' || clean.startsWith('../') || clean === '..' || path.posix.isAbsolute(clean)) return ''
  return clean
}

function resolveLocalCaptureSource(input: { summary: RuntimeImportProvenanceSummary | null }): {
  source: CaptureSourceResolution | null
  candidatePaths: string[]
} {
  const fromEvidenceEntry = normalizeText(input.summary?.captureEvidence?.entryHtmlPath)
  const fromEvidenceSelected = normalizeText(input.summary?.captureEvidence?.selectedSourceHtmlPath)
  const fromExecutionRoot = normalizeText(input.summary?.executionIdentity?.snapshotRunRootDirAbs)

  const candidates = [
    fromEvidenceEntry,
    fromEvidenceSelected,
    fromExecutionRoot ? path.resolve(fromExecutionRoot, 'index.html') : '',
  ].filter(Boolean)

  for (const entryHtmlPathAbs of candidates) {
    const absPath = path.resolve(entryHtmlPathAbs)
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue
    return {
      source: {
        snapshotRootDirAbs: path.dirname(absPath),
        entryHtmlPathAbs: absPath,
        diagnostics: [],
      },
      candidatePaths: candidates,
    }
  }
  return { source: null, candidatePaths: candidates }
}

function getRawImportCandidateHtmlPaths(entryHtmlPath: string): string[] {
  const candidates = [normalizeArtifactFilePath(entryHtmlPath), 'index.html'].filter(Boolean)
  return [...new Set(candidates)]
}

function resolveWithinRoot(rootAbs: string, filePath: string): string {
  const normalizedFilePath = normalizeArtifactFilePath(filePath)
  if (!normalizedFilePath) throw new Error('RAW_IMPORT_HTML_PATH_INVALID')
  const resolved = path.resolve(rootAbs, normalizedFilePath)
  const rootWithSep = rootAbs.endsWith(path.sep) ? rootAbs : `${rootAbs}${path.sep}`
  if (resolved !== rootAbs && !resolved.startsWith(rootWithSep)) throw new Error('RAW_IMPORT_HTML_PATH_ESCAPED_ROOT')
  return resolved
}

function safePathSegment(value: string): string {
  return normalizeText(value).replace(/[^a-zA-Z0-9._-]/g, '_') || 'unknown'
}

function persistRehydratedRawImportHtml(input: {
  siteVersionId: string
  lookup: Extract<RawImportArtifactHtmlLookupResult, { status: 'found' }>
}): CaptureSourceResolution {
  const snapshotRootDirAbs = path.resolve(
    os.tmpdir(),
    'gnr8',
    'rendered-capture-source-rehydration',
    safePathSegment(input.siteVersionId),
    safePathSegment(input.lookup.artifactId),
  )
  const entryHtmlPathAbs = resolveWithinRoot(snapshotRootDirAbs, input.lookup.selectedHtmlPath)
  fs.mkdirSync(path.dirname(entryHtmlPathAbs), { recursive: true })
  fs.writeFileSync(entryHtmlPathAbs, input.lookup.htmlBytes)
  return {
    snapshotRootDirAbs,
    entryHtmlPathAbs,
    diagnostics: [
      toDiagnostic({
        code: 'RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT',
        message: 'Rendered capture source HTML resolved from durable raw_imported_site artifact bytes.',
        details: {
          artifactId: input.lookup.artifactId,
          selectedHtmlPath: input.lookup.selectedHtmlPath,
          mediaType: input.lookup.mediaType,
          sizeBytes: input.lookup.sizeBytes,
          sha256: input.lookup.sha256,
          rehydratedEntryHtmlPathAbs: entryHtmlPathAbs,
        },
      }),
    ],
  }
}

async function getRawImportArtifactHtmlForCaptureDefault(input: {
  siteVersionId: string
}): Promise<RawImportArtifactHtmlLookupResult> {
  const client = await getSuperadminPool().connect()
  try {
    const artifactResult = await client.query<{
      id: string
      entry_html_path: string
      created_at: string | null
    }>(
      `
      select
        id::text as id,
        entry_html_path::text as entry_html_path,
        created_at::text as created_at
      from public.gnr8_runtime_raw_template_artifacts
      where site_version_id = $1::uuid
        and artifact_type = 'raw_imported_site'
      order by created_at desc, id desc
      limit 1
      `,
      [input.siteVersionId],
    )
    const artifact = artifactResult.rows[0]
    if (!artifact) return { status: 'artifact_not_found' }

    const candidateHtmlPaths = getRawImportCandidateHtmlPaths(artifact.entry_html_path)
    for (const candidateHtmlPath of candidateHtmlPaths) {
      const fileResult = await client.query<{
        file_path: string
        media_type: string
        file_size_bytes: number
        sha256: string
        content_bytes: Buffer | Uint8Array
      }>(
        `
        select
          file_path::text as file_path,
          media_type::text as media_type,
          file_size_bytes::integer as file_size_bytes,
          sha256::text as sha256,
          content_bytes
        from public.gnr8_runtime_raw_template_artifact_files
        where artifact_id = $1::uuid
          and file_path = $2::text
        limit 1
        `,
        [artifact.id, candidateHtmlPath],
      )
      const file = fileResult.rows[0]
      if (!file) continue
      return {
        status: 'found',
        artifactId: artifact.id,
        artifactCreatedAt: artifact.created_at,
        artifactEntryHtmlPath: normalizeArtifactFilePath(artifact.entry_html_path) || artifact.entry_html_path,
        selectedHtmlPath: file.file_path,
        mediaType: file.media_type,
        sizeBytes: Math.max(0, Math.floor(Number(file.file_size_bytes) || 0)),
        sha256: file.sha256,
        htmlBytes: Buffer.isBuffer(file.content_bytes) ? file.content_bytes : Buffer.from(file.content_bytes),
      }
    }
    return {
      status: 'html_missing',
      artifactId: artifact.id,
      artifactCreatedAt: artifact.created_at,
      artifactEntryHtmlPath: normalizeArtifactFilePath(artifact.entry_html_path) || artifact.entry_html_path,
      candidateHtmlPaths,
    }
  } finally {
    client.release()
  }
}

async function resolveCaptureSource(input: {
  siteVersionId: string
  summary: RuntimeImportProvenanceSummary | null
  getRawImportArtifactHtmlForCapture: (input: { siteVersionId: string }) => Promise<RawImportArtifactHtmlLookupResult>
}): Promise<CaptureSourceResolution | null> {
  const local = resolveLocalCaptureSource({ summary: input.summary })
  if (local.source) return local.source

  const diagnostics: RenderedCaptureDiagnostic[] = [
    toDiagnostic({
      code: 'RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING',
      message: 'Rendered capture local provenance source HTML was missing.',
      severity: 'warning',
      details: { candidatePaths: local.candidatePaths },
    }),
    toDiagnostic({
      code: 'RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED',
      message: 'Rendered capture raw_imported_site artifact source lookup started.',
      details: { siteVersionId: input.siteVersionId },
    }),
  ]
  const lookup = await input.getRawImportArtifactHtmlForCapture({ siteVersionId: input.siteVersionId })
  if (lookup.status === 'artifact_not_found') return { snapshotRootDirAbs: '', entryHtmlPathAbs: '', diagnostics }

  diagnostics.push(
    toDiagnostic({
      code: 'RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND',
      message: 'Rendered capture raw_imported_site artifact found.',
      details: {
        artifactId: lookup.artifactId,
        artifactCreatedAt: lookup.artifactCreatedAt,
        artifactEntryHtmlPath: lookup.artifactEntryHtmlPath,
      },
    }),
  )

  if (lookup.status === 'html_missing') {
    diagnostics.push(
      toDiagnostic({
        code: 'RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_MISSING',
        message: 'Rendered capture raw_imported_site root HTML was missing.',
        severity: 'error',
        details: {
          artifactId: lookup.artifactId,
          artifactEntryHtmlPath: lookup.artifactEntryHtmlPath,
          candidateHtmlPaths: lookup.candidateHtmlPaths,
        },
      }),
    )
    return { snapshotRootDirAbs: '', entryHtmlPathAbs: '', diagnostics }
  }

  diagnostics.push(
    toDiagnostic({
      code: 'RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND',
      message: 'Rendered capture raw_imported_site root HTML bytes found.',
      details: {
        artifactId: lookup.artifactId,
        selectedHtmlPath: lookup.selectedHtmlPath,
        mediaType: lookup.mediaType,
        sizeBytes: lookup.sizeBytes,
        sha256: lookup.sha256,
      },
    }),
  )
  const rehydrated = persistRehydratedRawImportHtml({ siteVersionId: input.siteVersionId, lookup })
  return {
    snapshotRootDirAbs: rehydrated.snapshotRootDirAbs,
    entryHtmlPathAbs: rehydrated.entryHtmlPathAbs,
    diagnostics: [...diagnostics, ...rehydrated.diagnostics],
  }
}

function persistRenderedEvidence(input: {
  snapshotRootDirAbs: string
  renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus']
  renderedDomHtml: string
  diagnostics: RenderedCaptureDiagnostic[]
  screenshotViewportPathAbs: string | null
  screenshotFullpagePathAbs: string | null
  computedStyleSamples: unknown[]
  layoutGeometryEvidence: LayoutGeometryEvidence[]
}): RenderedEvidencePaths {
  const renderedDirAbs = path.resolve(input.snapshotRootDirAbs, 'rendered')
  const screenshotsDirAbs = path.resolve(renderedDirAbs, 'screenshots')
  fs.mkdirSync(screenshotsDirAbs, { recursive: true })

  const renderedDomPath = path.resolve(renderedDirAbs, 'rendered-dom.html')
  fs.writeFileSync(renderedDomPath, input.renderedDomHtml, 'utf8')

  const computedStylesPath = path.resolve(renderedDirAbs, 'computed-styles.json')
  fs.writeFileSync(computedStylesPath, `${JSON.stringify(input.computedStyleSamples, null, 2)}\n`, 'utf8')

  const layoutGeometryPath = path.resolve(renderedDirAbs, 'layout-geometry.json')
  fs.writeFileSync(layoutGeometryPath, `${JSON.stringify(input.layoutGeometryEvidence, null, 2)}\n`, 'utf8')

  let viewportScreenshotPath: string | null = null
  const screenshotViewportPathAbs = input.screenshotViewportPathAbs
  if (screenshotViewportPathAbs !== null && fs.existsSync(screenshotViewportPathAbs)) {
    viewportScreenshotPath = path.resolve(screenshotsDirAbs, 'viewport.png')
    fs.copyFileSync(screenshotViewportPathAbs, viewportScreenshotPath)
  }

  let fullpageScreenshotPath: string | null = null
  const screenshotFullpagePathAbs = input.screenshotFullpagePathAbs
  if (screenshotFullpagePathAbs !== null && fs.existsSync(screenshotFullpagePathAbs)) {
    fullpageScreenshotPath = path.resolve(screenshotsDirAbs, 'fullpage.png')
    fs.copyFileSync(screenshotFullpagePathAbs, fullpageScreenshotPath)
  }

  const screenshotPaths = [viewportScreenshotPath, fullpageScreenshotPath].filter((value): value is string => Boolean(value))
  const renderedCaptureManifestPath = path.resolve(input.snapshotRootDirAbs, 'rendered-capture.json')
  fs.writeFileSync(
    renderedCaptureManifestPath,
    `${JSON.stringify(
      {
        kind: 'rendered_capture_result_v1',
        status: input.renderedCaptureStatus,
        renderedDomPath,
        computedStylesPath,
        layoutGeometryPath,
        screenshotPaths,
        diagnostics: input.diagnostics,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const domNodeCount = countMeaningfulDomNodes(input.renderedDomHtml)
  const acquisitionEvidencePath = path.resolve(input.snapshotRootDirAbs, 'acquisition-evidence.json')
  fs.writeFileSync(
    acquisitionEvidencePath,
    `${JSON.stringify(
      {
        kind: 'import_acquisition_evidence_v1',
        sourceMode: input.renderedCaptureStatus === 'failed' ? 'raw_html_fallback' : 'rendered_dom',
        renderedCaptureStatus: input.renderedCaptureStatus,
        renderedDomPath,
        computedStylesPath,
        layoutGeometryPath,
        screenshotPaths,
        domNodeCount,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  return {
    snapshotRootDirAbs: input.snapshotRootDirAbs,
    renderedDomPath,
    computedStylesPath,
    layoutGeometryPath,
    renderedCaptureManifestPath,
    acquisitionEvidencePath,
    viewportScreenshotPath,
    fullpageScreenshotPath,
    screenshotPaths,
    domLength: normalizeText(input.renderedDomHtml).length,
    domNodeCount,
    computedStyleSampleCount: input.computedStyleSamples.length,
    layoutGeometryEvidence: input.layoutGeometryEvidence,
  }
}

function withPatchedProvenanceSummary(input: {
  existingSummary: RuntimeImportProvenanceSummary | null
  evidence: RenderedEvidencePaths
  hasUsableEvidence: boolean
  renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus']
  sourceMode: RuntimeImportProvenanceSummary['sourceMode']
  renderedDomQuality: RuntimeImportProvenanceSummary['renderedDomQuality']
  diagnostics: RenderedCaptureDiagnostic[]
  emptySuccess: boolean
  failureCode: string | null
}): RuntimeImportProvenanceSummary {
  const existing = input.existingSummary
  const existingCodes = Array.isArray(existing?.importDiagnosticCodes) ? existing.importDiagnosticCodes : []
  const captureCodes = input.diagnostics.map((entry) => normalizeText(entry.code)).filter(Boolean)
  const importDiagnosticCodes = [
    ...new Set([
      ...existingCodes,
      ...captureCodes,
      'SITE_RENDER_CAPTURE_COMPLETED',
      ...(input.emptySuccess ? ['SITE_RENDER_CAPTURE_EMPTY_SUCCESS'] : []),
      ...(!input.hasUsableEvidence ? ['NO_USABLE_RENDERED_RUN_FOUND'] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b))
  const screenshotCount = input.evidence.screenshotPaths.length
  const fidelityStatus: RuntimeImportProvenanceSummary['importFidelityStatus'] =
    input.sourceMode === 'rendered_dom'
      ? (input.renderedDomQuality === 'strong' && input.renderedCaptureStatus === 'available' ? 'high_fidelity_import' : 'degraded_import')
      : 'capture_failed'
  const styleCoverage = Number((Math.max(0, input.evidence.computedStyleSampleCount) / 10).toFixed(3))
  const executionIdentity = existing?.executionIdentity
  const captureEvidence = existing?.captureEvidence

  const nextSummary: RuntimeImportProvenanceSummary = {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: executionIdentity
      ? {
          snapshotId: executionIdentity.snapshotId,
          snapshotRunId: executionIdentity.snapshotRunId,
          snapshotStableRootDirAbs: executionIdentity.snapshotStableRootDirAbs,
          snapshotRunRootDirAbs: executionIdentity.snapshotRunRootDirAbs,
          requestId: executionIdentity.requestId ?? null,
        }
      : undefined,
    captureMode: existing?.captureMode ?? 'raw_html_only',
    sourceMode: input.sourceMode,
    importFidelityStatus: fidelityStatus,
    renderedCaptureStatus: input.renderedCaptureStatus,
    renderedDomQuality: input.renderedDomQuality,
    importFidelityScore: existing?.importFidelityScore ?? null,
    screenshotCount,
    computedStyleSampleCount: input.evidence.computedStyleSampleCount,
    renderedCapture: {
      used: input.sourceMode === 'rendered_dom',
      status: input.renderedCaptureStatus,
      quality: input.renderedDomQuality,
      domLength: input.evidence.domLength,
      nodeCount: input.evidence.domNodeCount,
      styleSampleCount: input.evidence.computedStyleSampleCount,
      styleCoverage,
      screenshots: {
        viewport: Boolean(input.evidence.viewportScreenshotPath),
        fullPage: Boolean(input.evidence.fullpageScreenshotPath),
      },
      execution: {
        runtimeKind: 'nodejs',
        environmentSupported: !input.emptySuccess && input.renderedCaptureStatus !== 'failed',
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: input.emptySuccess ? 'supported' : (input.renderedCaptureStatus === 'failed' ? 'unsupported' : 'supported'),
        failureCategory: input.emptySuccess ? 'page' : (input.renderedCaptureStatus === 'failed' ? 'page' : 'none'),
        failureCode: input.failureCode,
        browserLaunch: input.emptySuccess ? 'succeeded' : (input.renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded'),
        navigation: input.emptySuccess ? 'succeeded' : (input.renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded'),
        dom: input.evidence.domNodeCount > 0 ? 'captured' : 'empty_or_failed',
        screenshot: screenshotCount > 0 ? 'captured' : 'none',
        styleSampling: input.evidence.computedStyleSampleCount > 0 ? 'captured' : 'failed_or_empty',
      },
    },
    importDiagnosticCodes,
    captureEvidence: {
      selectedSourceHtmlPath: captureEvidence?.selectedSourceHtmlPath ?? null,
      responseHtmlPath: captureEvidence?.responseHtmlPath ?? null,
      entryHtmlPath: captureEvidence?.entryHtmlPath ?? null,
      renderedCaptureManifestPath: input.evidence.renderedCaptureManifestPath,
      acquisitionEvidencePath: input.evidence.acquisitionEvidencePath,
      renderedDomPath: input.evidence.renderedDomPath,
      computedStylesPath: input.evidence.computedStylesPath,
      layoutGeometryPath: input.evidence.layoutGeometryPath,
      renderedViewportScreenshotPath: input.evidence.viewportScreenshotPath,
      renderedFullpageScreenshotPath: input.evidence.fullpageScreenshotPath,
      screenshotPaths: input.evidence.screenshotPaths,
    },
    captureJob: existing?.captureJob ?? null,
    workerHealth: existing?.workerHealth ?? null,
    styleSignals: existing?.styleSignals ?? null,
    semanticImport: existing?.semanticImport ?? null,
    multipageImport: existing?.multipageImport ?? null,
    siteTree: existing?.siteTree ?? null,
    templateFamilies: existing?.templateFamilies ?? null,
  }

  return attachEvidenceCaptureBaselineArtifact({
    siteVersionId: existing?.evidenceCaptureBaselineArtifact?.siteVersionId ?? null,
    sourceUrl: existing?.evidenceCaptureBaselineArtifact?.sourceUrl ?? '',
    finalUrl: existing?.evidenceCaptureBaselineArtifact?.finalUrl ?? null,
    routePath: existing?.evidenceCaptureBaselineArtifact?.routePath ?? '/',
    layoutGeometryEvidence: input.evidence.layoutGeometryEvidence,
    importProvenanceSummary: nextSummary,
    rawImportArtifact: existing?.evidenceCaptureBaselineArtifact
      ? {
          artifactId: existing.evidenceCaptureBaselineArtifact.persistedRefs.rawImportArtifactId,
          entryHtmlPath: existing.evidenceCaptureBaselineArtifact.evidence.route.rawFilePath,
          metadata: {
            sourceUrl: existing.evidenceCaptureBaselineArtifact.sourceUrl,
            finalUrl: existing.evidenceCaptureBaselineArtifact.finalUrl,
            assetSummary: {
              persistedAssetCount: existing.evidenceCaptureBaselineArtifact.summaries.assetInventory.persistedAssetCount ?? undefined,
              externalFallbackAssetCount: existing.evidenceCaptureBaselineArtifact.summaries.assetInventory.externalFallbackAssetCount ?? undefined,
            },
          },
        }
      : null,
  })
}

async function getRuntimeVersionByIdDefault(input: {
  siteVersionId: string
}): Promise<RuntimeVersionRow | null> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<RuntimeVersionRow>(
      `
      select
        sv.id::text as id,
        sv.site_id::text as site_id,
        sv.ownership_site_id::text as ownership_site_id,
        sv.import_provenance_summary as import_provenance_summary
      from public.gnr8_runtime_site_versions sv
      where sv.id = $1::uuid
      limit 1
      `,
      [input.siteVersionId],
    )
    return result.rows[0] ?? null
  } finally {
    client.release()
  }
}

async function persistRuntimeVersionImportSummaryDefault(input: {
  siteVersionId: string
  summary: RuntimeImportProvenanceSummary
}): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      update public.gnr8_runtime_site_versions
      set import_provenance_summary = $2::jsonb, updated_at = now()
      where id = $1::uuid
      `,
      [input.siteVersionId, JSON.stringify(input.summary)],
    )
  } finally {
    client.release()
  }
}

function parseExistingSummary(value: unknown): RuntimeImportProvenanceSummary | null {
  if (!isRecord(value)) return null
  if (normalizeText(value.kind) !== 'runtime_import_provenance_summary_v1') return null
  return value as unknown as RuntimeImportProvenanceSummary
}

async function executeRenderedCaptureViaWorker(input: {
  sourceUrl: string
  snapshotRootDirAbs: string
}): Promise<RenderedCaptureResult> {
  const [workerClientMod, workerContractMod, workerAdapterMod] = await Promise.all([
    import('@/gnr8/import-rendered-capture-worker/worker-client'),
    import('@/gnr8/import-rendered-capture-worker/worker-contract'),
    import('@/gnr8/import-rendered-capture-worker/worker-adapter'),
  ])
  const workerClient = workerClientMod.createRenderedCaptureWorkerClientFromEnv()
  const request = workerContractMod.createRenderedCaptureWorkerRequest({
    requestId: `site-render-${Date.now()}`,
    importId: `site-render:${Date.now()}`,
    sourceUrl: input.sourceUrl,
    viewport: DEFAULT_CAPTURE_VIEWPORT,
    readinessPolicy: DEFAULT_CAPTURE_READINESS_POLICY,
    timeoutBudgetMs: DEFAULT_CAPTURE_READINESS_POLICY.maxTotalCaptureMs,
  })
  const response = await workerClient.execute(request)
  return workerAdapterMod.mapWorkerResponseToRenderedCaptureResult({
    response,
    snapshotRootDirAbs: input.snapshotRootDirAbs,
    sourceUrl: input.sourceUrl,
  })
}

export async function runSiteRenderCapture(input: {
  siteId: string
  siteVersionId: string
}, deps: Partial<{
  getRuntimeVersionById: (input: { siteVersionId: string }) => Promise<RuntimeVersionRow | null>
  getRawImportArtifactHtmlForCapture: (input: { siteVersionId: string }) => Promise<RawImportArtifactHtmlLookupResult>
  persistRuntimeVersionImportSummary: (input: { siteVersionId: string; summary: RuntimeImportProvenanceSummary }) => Promise<void>
  runRenderedCapture: (input: { sourceUrl: string; snapshotRootDirAbs: string }) => Promise<RenderedCaptureResult>
}> = {}): Promise<RenderedCapturePersistResult> {
  const resolvedDeps = {
    getRuntimeVersionById: getRuntimeVersionByIdDefault,
    getRawImportArtifactHtmlForCapture: getRawImportArtifactHtmlForCaptureDefault,
    persistRuntimeVersionImportSummary: persistRuntimeVersionImportSummaryDefault,
    runRenderedCapture: executeRenderedCaptureViaWorker,
    ...deps,
  }
  const runtimeVersion = await resolvedDeps.getRuntimeVersionById({ siteVersionId: input.siteVersionId })
  if (!runtimeVersion) {
    throw new SiteRenderCaptureError({
      code: 'SITE_RENDER_RUNTIME_SITE_VERSION_NOT_FOUND',
      message: 'Runtime site version not found for rendered capture.',
      siteVersionId: input.siteVersionId,
      siteId: input.siteId,
    })
  }

  if (normalizeText(runtimeVersion.ownership_site_id) !== normalizeText(input.siteId)) {
    throw new SiteRenderCaptureError({
      code: 'SITE_RENDER_RUNTIME_SITE_VERSION_SCOPE_MISMATCH',
      message: 'Runtime site version ownership does not match site render request scope.',
      siteVersionId: input.siteVersionId,
      siteId: input.siteId,
    })
  }

  const existingSummary = parseExistingSummary(runtimeVersion.import_provenance_summary)
  const source = await resolveCaptureSource({
    siteVersionId: input.siteVersionId,
    summary: existingSummary,
    getRawImportArtifactHtmlForCapture: resolvedDeps.getRawImportArtifactHtmlForCapture,
  })
  if (source?.diagnostics.length) {
    emitSourceResolutionDiagnostics({
      siteId: input.siteId,
      runtimeSiteId: runtimeVersion.site_id,
      siteVersionId: input.siteVersionId,
      diagnostics: source.diagnostics,
    })
  }
  if (!source?.entryHtmlPathAbs) {
    throw new SiteRenderCaptureError({
      code: 'SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND',
      message: 'Rendered capture source entry HTML could not be resolved from local provenance or durable raw_imported_site artifact HTML.',
      siteVersionId: input.siteVersionId,
      siteId: input.siteId,
    })
  }

  try {
    const workerClientConfig = resolveRenderedCaptureWorkerClientConfigFromEnv()
    const workerConfigState = {
      enabled: workerClientConfig.enabled,
      baseUrlPresent: Boolean(workerClientConfig.resolvedBaseUrl),
      tokenPresent: Boolean(workerClientConfig.sharedToken),
    }
    const captureResultRaw = await resolvedDeps.runRenderedCapture({
      sourceUrl: pathToFileURL(source.entryHtmlPathAbs).toString(),
      snapshotRootDirAbs: source.snapshotRootDirAbs,
    })
    const captureResult: RenderedCaptureResult = {
      ...captureResultRaw,
      diagnostics: [...source.diagnostics, ...captureResultRaw.diagnostics],
    }
    const workerCaptureStatus = resolveCaptureStatus(captureResult.status)
    const renderedDomHtml = readRenderedDomFromResult({
      snapshotRootDirAbs: source.snapshotRootDirAbs,
      renderedDocumentPath: captureResult.documents[0]?.htmlPathAbs ?? null,
    })
    console.info('[site-render-worker] SITE_RENDER_CAPTURE_OUTPUT_SUMMARY', {
      siteId: input.siteId,
      runtimeSiteId: runtimeVersion.site_id,
      runtimeSiteVersionId: input.siteVersionId,
      snapshotRootDirAbs: source.snapshotRootDirAbs,
      workerStatus: captureResult.status,
      normalizedWorkerStatus: workerCaptureStatus,
      output: {
        documentCount: captureResult.documents.length,
        computedStyleSampleCount: captureResult.computedStyleSamples.length,
        screenshotCount: captureResult.screenshots.length,
        screenshotRefs: captureResult.screenshots.map((entry) => entry.filePathAbs),
        diagnostics: captureResult.diagnostics.map((entry) => entry.code),
      },
    })
    const evidence = persistRenderedEvidence({
      snapshotRootDirAbs: source.snapshotRootDirAbs,
      renderedCaptureStatus: workerCaptureStatus,
      renderedDomHtml,
      diagnostics: captureResult.diagnostics,
      screenshotViewportPathAbs:
        captureResult.screenshots.find((entry) => entry.captureType === 'desktop_viewport')?.filePathAbs ?? null,
      screenshotFullpagePathAbs:
        captureResult.screenshots.find((entry) => entry.captureType === 'desktop_fullpage')?.filePathAbs ?? null,
      computedStyleSamples: captureResult.computedStyleSamples,
      layoutGeometryEvidence: captureResult.layoutGeometryEvidence,
    })
    const renderedDomQuality = toRenderableDomQuality({
      domHtml: renderedDomHtml,
      domNodeCount: evidence.domNodeCount,
    })
    const hasUsableEvidence = hasUsableRenderedEvidence({ evidence })
    const emptySuccess = workerCaptureStatus !== 'failed' && !hasUsableEvidence
    const renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus'] = emptySuccess ? 'failed' : workerCaptureStatus
    const failureReason = resolveFailureCodeFromDiagnostics({
      diagnostics: captureResult.diagnostics,
      emptySuccess,
      renderedCaptureStatus,
    })
    const sourceMode: RuntimeImportProvenanceSummary['sourceMode'] =
      renderedCaptureStatus !== 'failed' && hasUsableEvidence ? 'rendered_dom' : 'raw_html_fallback'
    const renderedDomPath = evidence.renderedDomPath
    const computedStylesPath = evidence.computedStylesPath
    const acquisitionEvidencePath = evidence.acquisitionEvidencePath
    const layoutGeometryPath = evidence.layoutGeometryPath
    const renderedDomExists = renderedDomPath !== null ? fs.existsSync(renderedDomPath) : false
    const computedStylesExists = computedStylesPath !== null ? fs.existsSync(computedStylesPath) : false
    const acquisitionEvidenceExists = acquisitionEvidencePath !== null ? fs.existsSync(acquisitionEvidencePath) : false
    const layoutGeometryExists = layoutGeometryPath !== null ? fs.existsSync(layoutGeometryPath) : false

    console.info('[site-render-worker] SITE_RENDER_CAPTURE_PERSISTED_EVIDENCE', {
      siteId: input.siteId,
      runtimeSiteId: runtimeVersion.site_id,
      runtimeSiteVersionId: input.siteVersionId,
      renderedDomExists,
      renderedDomLength: evidence.domLength,
      renderedDomNodeCount: evidence.domNodeCount,
      computedStylesExists,
      acquisitionEvidenceExists,
      layoutGeometryExists,
      layoutRegionCount: evidence.layoutGeometryEvidence.reduce((count, item) => count + item.regions.length, 0),
      screenshotCount: evidence.screenshotPaths.length,
      evidenceRefs: {
        renderedDomPath,
        computedStylesPath,
        layoutGeometryPath,
        acquisitionEvidencePath,
        renderedCaptureManifestPath: evidence.renderedCaptureManifestPath,
        screenshotPaths: evidence.screenshotPaths,
      },
    })

    const updatedSummary = withPatchedProvenanceSummary({
      existingSummary,
      evidence,
      renderedCaptureStatus,
      sourceMode,
      renderedDomQuality,
      diagnostics: captureResult.diagnostics,
      emptySuccess,
      hasUsableEvidence,
      failureCode: failureReason,
    })
    await resolvedDeps.persistRuntimeVersionImportSummary({
      siteVersionId: input.siteVersionId,
      summary: updatedSummary,
    })

    console.info('[site-render-worker] SITE_RENDER_CAPTURE_PERSISTED_RUNTIME_TRUTH', {
      siteId: input.siteId,
      runtimeSiteId: runtimeVersion.site_id,
      runtimeSiteVersionId: input.siteVersionId,
      sourceMode,
      renderedCaptureStatus,
      renderedDomQuality,
      summary: {
        screenshotCount: updatedSummary.screenshotCount,
        computedStyleSampleCount: updatedSummary.computedStyleSampleCount,
        importFidelityStatus: updatedSummary.importFidelityStatus,
        importDiagnosticCodes: updatedSummary.importDiagnosticCodes,
        captureEvidence: {
          renderedDomPath: updatedSummary.captureEvidence.renderedDomPath,
          computedStylesPath: updatedSummary.captureEvidence.computedStylesPath,
          layoutGeometryPath: updatedSummary.captureEvidence.layoutGeometryPath,
          acquisitionEvidencePath: updatedSummary.captureEvidence.acquisitionEvidencePath,
          renderedCaptureManifestPath: updatedSummary.captureEvidence.renderedCaptureManifestPath,
          screenshotPaths: updatedSummary.captureEvidence.screenshotPaths,
        },
      },
    })
    if (!hasUsableEvidence && hasDiagnosticCode({ diagnostics: captureResult.diagnostics, code: 'CAPTURE_WORKER_UNAVAILABLE' })) {
      console.warn('[site-render-worker] SITE_RENDER_CAPTURE_WORKER_UNAVAILABLE', {
        siteId: input.siteId,
        runtimeSiteId: runtimeVersion.site_id,
        runtimeSiteVersionId: input.siteVersionId,
        renderedCaptureStatus,
        sourceMode,
        workerConfigState,
        diagnostics: captureResult.diagnostics.map((entry) => entry.code),
      })
    }
    if (emptySuccess) {
      console.warn('[site-render-worker] SITE_RENDER_CAPTURE_EMPTY_SUCCESS', {
        siteId: input.siteId,
        runtimeSiteId: runtimeVersion.site_id,
        runtimeSiteVersionId: input.siteVersionId,
        renderedDomLength: evidence.domLength,
        renderedDomNodeCount: evidence.domNodeCount,
        screenshotCount: evidence.screenshotPaths.length,
        computedStyleSampleCount: evidence.computedStyleSampleCount,
        workerConfigState,
        diagnostics: captureResult.diagnostics.map((entry) => entry.code),
      })
    }

    return {
      runtimeSiteId: runtimeVersion.site_id,
      runtimeSiteVersionId: input.siteVersionId,
      siteVersionId: input.siteVersionId,
      sourceMode,
      renderedCaptureStatus,
      renderedDomQuality,
      hasUsableEvidence,
      failureReason,
      evidence,
      importProvenanceSummary: updatedSummary,
    }
  } catch (error) {
    if (error instanceof SiteRenderCaptureError) throw error
    throw new SiteRenderCaptureError({
      code: 'SITE_RENDER_CAPTURE_FAILED',
      message: normalizeText((error as Error | null)?.message) || 'Site rendered capture failed.',
      siteVersionId: input.siteVersionId,
      siteId: input.siteId,
    })
  }
}

export function parseSiteRenderCaptureError(
  error: unknown,
): { status: number; code: SiteRenderCaptureErrorCode; message: string; siteId: string; siteVersionId: string } | null {
  if (error instanceof SiteRenderCaptureError) {
    return {
      status: 500,
      code: error.code,
      message: error.message,
      siteId: error.siteId,
      siteVersionId: error.siteVersionId,
    }
  }
  return null
}
