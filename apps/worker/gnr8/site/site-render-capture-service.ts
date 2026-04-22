import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'
import type { RenderedCaptureDiagnostic, RenderedCaptureResult } from '@/gnr8/import-rendered-capture/rendered-capture-contract'
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
  renderedCaptureManifestPath: string
  acquisitionEvidencePath: string
  viewportScreenshotPath: string | null
  fullpageScreenshotPath: string | null
  screenshotPaths: string[]
  domLength: number
  domNodeCount: number
  computedStyleSampleCount: number
}

type RenderedCapturePersistResult = {
  siteVersionId: string
  sourceMode: RuntimeImportProvenanceSummary['sourceMode']
  renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus']
  renderedDomQuality: RuntimeImportProvenanceSummary['renderedDomQuality']
  evidence: RenderedEvidencePaths
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

function resolveCaptureSource(input: { summary: RuntimeImportProvenanceSummary | null }): { snapshotRootDirAbs: string; entryHtmlPathAbs: string } | null {
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
      snapshotRootDirAbs: path.dirname(absPath),
      entryHtmlPathAbs: absPath,
    }
  }
  return null
}

function persistRenderedEvidence(input: {
  snapshotRootDirAbs: string
  renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus']
  renderedDomHtml: string
  diagnostics: RenderedCaptureDiagnostic[]
  screenshotViewportPathAbs: string | null
  screenshotFullpagePathAbs: string | null
  computedStyleSamples: unknown[]
}): RenderedEvidencePaths {
  const renderedDirAbs = path.resolve(input.snapshotRootDirAbs, 'rendered')
  const screenshotsDirAbs = path.resolve(renderedDirAbs, 'screenshots')
  fs.mkdirSync(screenshotsDirAbs, { recursive: true })

  const renderedDomPath = path.resolve(renderedDirAbs, 'rendered-dom.html')
  fs.writeFileSync(renderedDomPath, input.renderedDomHtml, 'utf8')

  const computedStylesPath = path.resolve(renderedDirAbs, 'computed-styles.json')
  fs.writeFileSync(computedStylesPath, `${JSON.stringify(input.computedStyleSamples, null, 2)}\n`, 'utf8')

  let viewportScreenshotPath: string | null = null
  if (input.screenshotViewportPathAbs && fs.existsSync(input.screenshotViewportPathAbs)) {
    viewportScreenshotPath = path.resolve(screenshotsDirAbs, 'viewport.png')
    fs.copyFileSync(input.screenshotViewportPathAbs, viewportScreenshotPath)
  }

  let fullpageScreenshotPath: string | null = null
  if (input.screenshotFullpagePathAbs && fs.existsSync(input.screenshotFullpagePathAbs)) {
    fullpageScreenshotPath = path.resolve(screenshotsDirAbs, 'fullpage.png')
    fs.copyFileSync(input.screenshotFullpagePathAbs, fullpageScreenshotPath)
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
    renderedCaptureManifestPath,
    acquisitionEvidencePath,
    viewportScreenshotPath,
    fullpageScreenshotPath,
    screenshotPaths,
    domLength: normalizeText(input.renderedDomHtml).length,
    domNodeCount,
    computedStyleSampleCount: input.computedStyleSamples.length,
  }
}

function withPatchedProvenanceSummary(input: {
  existingSummary: RuntimeImportProvenanceSummary | null
  evidence: RenderedEvidencePaths
  renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus']
  sourceMode: RuntimeImportProvenanceSummary['sourceMode']
  renderedDomQuality: RuntimeImportProvenanceSummary['renderedDomQuality']
  diagnostics: RenderedCaptureDiagnostic[]
}): RuntimeImportProvenanceSummary {
  const existing = input.existingSummary
  const existingCodes = Array.isArray(existing?.importDiagnosticCodes) ? existing.importDiagnosticCodes : []
  const captureCodes = input.diagnostics.map((entry) => normalizeText(entry.code)).filter(Boolean)
  const importDiagnosticCodes = [...new Set([...existingCodes, ...captureCodes, 'SITE_RENDER_CAPTURE_COMPLETED'])].sort((a, b) => a.localeCompare(b))
  const screenshotCount = input.evidence.screenshotPaths.length
  const fidelityStatus: RuntimeImportProvenanceSummary['importFidelityStatus'] =
    input.sourceMode === 'rendered_dom'
      ? (input.renderedDomQuality === 'strong' && input.renderedCaptureStatus === 'available' ? 'high_fidelity_import' : 'degraded_import')
      : 'capture_failed'
  const styleCoverage = Number((Math.max(0, input.evidence.computedStyleSampleCount) / 10).toFixed(3))
  const failureCode =
    input.renderedCaptureStatus === 'failed'
      ? normalizeText(captureCodes.find((code) => code.endsWith('FAILED')) ?? captureCodes[0] ?? 'RENDERED_CAPTURE_FAILED')
      : null
  const executionIdentity = existing?.executionIdentity
  const captureEvidence = existing?.captureEvidence

  return {
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
        environmentSupported: input.renderedCaptureStatus !== 'failed',
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: input.renderedCaptureStatus === 'failed' ? 'unsupported' : 'supported',
        failureCategory: input.renderedCaptureStatus === 'failed' ? 'page' : 'none',
        failureCode,
        browserLaunch: input.renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded',
        navigation: input.renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded',
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
      renderedViewportScreenshotPath: input.evidence.viewportScreenshotPath,
      renderedFullpageScreenshotPath: input.evidence.fullpageScreenshotPath,
      screenshotPaths: input.evidence.screenshotPaths,
    },
    captureJob: existing?.captureJob ?? null,
    workerHealth: existing?.workerHealth ?? null,
    styleSignals: existing?.styleSignals ?? null,
    multipageImport: existing?.multipageImport ?? null,
    siteTree: existing?.siteTree ?? null,
    templateFamilies: existing?.templateFamilies ?? null,
  }
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
  persistRuntimeVersionImportSummary: (input: { siteVersionId: string; summary: RuntimeImportProvenanceSummary }) => Promise<void>
  runRenderedCapture: (input: { sourceUrl: string; snapshotRootDirAbs: string }) => Promise<RenderedCaptureResult>
}> = {}): Promise<RenderedCapturePersistResult> {
  const resolvedDeps = {
    getRuntimeVersionById: getRuntimeVersionByIdDefault,
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
  const source = resolveCaptureSource({ summary: existingSummary })
  if (!source) {
    throw new SiteRenderCaptureError({
      code: 'SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND',
      message: 'Rendered capture source entry HTML could not be resolved for runtime site version.',
      siteVersionId: input.siteVersionId,
      siteId: input.siteId,
    })
  }

  try {
    const captureResult = await resolvedDeps.runRenderedCapture({
      sourceUrl: pathToFileURL(source.entryHtmlPathAbs).toString(),
      snapshotRootDirAbs: source.snapshotRootDirAbs,
    })
    const renderedCaptureStatus = resolveCaptureStatus(captureResult.status)
    const renderedDomHtml = readRenderedDomFromResult({
      snapshotRootDirAbs: source.snapshotRootDirAbs,
      renderedDocumentPath: captureResult.documents[0]?.htmlPathAbs ?? null,
    })
    const evidence = persistRenderedEvidence({
      snapshotRootDirAbs: source.snapshotRootDirAbs,
      renderedCaptureStatus,
      renderedDomHtml,
      diagnostics: captureResult.diagnostics,
      screenshotViewportPathAbs:
        captureResult.screenshots.find((entry) => entry.captureType === 'desktop_viewport')?.filePathAbs ?? null,
      screenshotFullpagePathAbs:
        captureResult.screenshots.find((entry) => entry.captureType === 'desktop_fullpage')?.filePathAbs ?? null,
      computedStyleSamples: captureResult.computedStyleSamples,
    })
    const renderedDomQuality = toRenderableDomQuality({
      domHtml: renderedDomHtml,
      domNodeCount: evidence.domNodeCount,
    })
    const sourceMode: RuntimeImportProvenanceSummary['sourceMode'] =
      renderedCaptureStatus !== 'failed' && evidence.domNodeCount > 0 ? 'rendered_dom' : 'raw_html_fallback'

    const updatedSummary = withPatchedProvenanceSummary({
      existingSummary,
      evidence,
      renderedCaptureStatus,
      sourceMode,
      renderedDomQuality,
      diagnostics: captureResult.diagnostics,
    })
    await resolvedDeps.persistRuntimeVersionImportSummary({
      siteVersionId: input.siteVersionId,
      summary: updatedSummary,
    })

    return {
      siteVersionId: input.siteVersionId,
      sourceMode,
      renderedCaptureStatus,
      renderedDomQuality,
      evidence,
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
