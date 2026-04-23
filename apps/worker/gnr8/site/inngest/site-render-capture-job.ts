import {
  type SiteRenderRequestedPayload,
  SITE_RENDER_MAX_ATTEMPTS,
  SITE_RENDER_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'
import { parseSiteRenderCaptureError, runSiteRenderCapture } from '@/gnr8/site/site-render-capture-service'
import {
  markSiteRenderCompleted,
  markSiteRenderFailed,
  markSiteRenderStarted,
} from '@/gnr8/site/storage/site-render-repository'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function parsePayload(value: unknown): SiteRenderRequestedPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const siteId = normalizeText(record.siteId)
  const clientId = normalizeText(record.clientId)
  const agencyId = normalizeText(record.agencyId)
  const templateId = normalizeText(record.templateId)
  const runtimeSiteId = normalizeText(record.runtimeSiteId)
  const runtimeSiteVersionId = normalizeText(record.runtimeSiteVersionId)
  if (!siteId || !clientId || !agencyId || !templateId || !runtimeSiteId || !runtimeSiteVersionId) return null
  return {
    siteId,
    clientId,
    agencyId,
    templateId,
    runtimeSiteId,
    runtimeSiteVersionId,
  }
}

type SiteRenderCaptureJobDeps = {
  parsePayload: typeof parsePayload
  markSiteRenderStarted: typeof markSiteRenderStarted
  runSiteRenderCapture: typeof runSiteRenderCapture
  markSiteRenderCompleted: typeof markSiteRenderCompleted
  markSiteRenderFailed: typeof markSiteRenderFailed
  parseSiteRenderCaptureError: typeof parseSiteRenderCaptureError
}

const DEFAULT_DEPS: SiteRenderCaptureJobDeps = {
  parsePayload,
  markSiteRenderStarted,
  runSiteRenderCapture,
  markSiteRenderCompleted,
  markSiteRenderFailed,
  parseSiteRenderCaptureError,
}

export const SITE_RENDER_CAPTURE_JOB_ID = 'site-render-capture-job'
export const SITE_RENDER_CAPTURE_JOB_TRIGGER_EVENT = SITE_RENDER_REQUESTED_EVENT

export async function runSiteRenderCaptureJob(input: {
  eventData: unknown
  maxAttempts?: number
  deps?: Partial<SiteRenderCaptureJobDeps>
}): Promise<void> {
  const deps = {
    ...DEFAULT_DEPS,
    ...(input.deps ?? {}),
  }
  const payload = deps.parsePayload(input.eventData)
  if (!payload) {
    throw new Error('Invalid site render event payload.')
  }

  const start = await deps.markSiteRenderStarted({
    siteVersionId: payload.runtimeSiteVersionId,
  })
  if (!start.started) {
    console.info('[site-render-worker] SITE_RENDER_CAPTURE_TRIGGERED', {
      siteId: payload.siteId,
      siteVersionId: payload.runtimeSiteVersionId,
      triggerAccepted: false,
      reason: start.currentStatus ?? 'job_not_queued',
    })
    return
  }

  const maxAttempts = Math.max(1, Number(input.maxAttempts ?? SITE_RENDER_MAX_ATTEMPTS) || SITE_RENDER_MAX_ATTEMPTS)
  console.info('[site-render-worker] SITE_RENDER_CAPTURE_STARTED', {
    siteId: payload.siteId,
    siteVersionId: payload.runtimeSiteVersionId,
    runtimeSiteId: payload.runtimeSiteId,
    templateId: payload.templateId,
    maxAttempts,
  })

  try {
    const result = await deps.runSiteRenderCapture({
      siteId: payload.siteId,
      siteVersionId: payload.runtimeSiteVersionId,
    })
    await deps.markSiteRenderCompleted({
      siteVersionId: payload.runtimeSiteVersionId,
      renderedDomPath: result.evidence.renderedDomPath,
      computedStylesPath: result.evidence.computedStylesPath,
      acquisitionEvidencePath: result.evidence.acquisitionEvidencePath,
      screenshotCount: result.evidence.screenshotPaths.length,
      computedStyleSampleCount: result.evidence.computedStyleSampleCount,
      domNodeCount: result.evidence.domNodeCount,
    })
    const renderedDomExists = Boolean(result.evidence.renderedDomPath)
    const computedStylesExists = Boolean(result.evidence.computedStylesPath)
    const acquisitionEvidenceExists = Boolean(result.evidence.acquisitionEvidencePath)
    const evidenceRefs = [
      result.evidence.renderedDomPath,
      result.evidence.computedStylesPath,
      result.evidence.acquisitionEvidencePath,
      result.evidence.renderedCaptureManifestPath,
      ...result.evidence.screenshotPaths,
    ].filter((value): value is string => Boolean(value))
    console.info('[site-render-worker] SITE_RENDER_CAPTURE_PERSISTED_EVIDENCE', {
      siteId: payload.siteId,
      runtimeSiteId: payload.runtimeSiteId,
      runtimeSiteVersionId: payload.runtimeSiteVersionId,
      renderedDomExists,
      renderedDomLength: result.evidence.domLength,
      renderedDomNodeCount: result.evidence.domNodeCount,
      computedStylesExists,
      acquisitionEvidenceExists,
      screenshotCount: result.evidence.screenshotPaths.length,
      evidenceRefs,
    })
    const importSummary = result.importProvenanceSummary
    console.info('[site-render-worker] SITE_RENDER_CAPTURE_PERSISTED_RUNTIME_TRUTH', {
      siteId: payload.siteId,
      runtimeSiteId: payload.runtimeSiteId,
      runtimeSiteVersionId: payload.runtimeSiteVersionId,
      sourceMode: result.sourceMode,
      renderedCaptureStatus: result.renderedCaptureStatus,
      renderedDomQuality: result.renderedDomQuality,
      summary: {
        importFidelityStatus: importSummary.importFidelityStatus,
        screenshotCount: importSummary.screenshotCount,
        computedStyleSampleCount: importSummary.computedStyleSampleCount,
        importDiagnosticCodes: importSummary.importDiagnosticCodes,
        captureEvidence: {
          renderedDomPath: importSummary.captureEvidence.renderedDomPath,
          computedStylesPath: importSummary.captureEvidence.computedStylesPath,
          acquisitionEvidencePath: importSummary.captureEvidence.acquisitionEvidencePath,
          renderedCaptureManifestPath: importSummary.captureEvidence.renderedCaptureManifestPath,
          screenshotPaths: importSummary.captureEvidence.screenshotPaths,
        },
      },
    })
    if (!result.hasUsableEvidence) {
      console.warn('[site-render-worker] SITE_RENDER_CAPTURE_EMPTY_SUCCESS', {
        siteId: payload.siteId,
        runtimeSiteId: payload.runtimeSiteId,
        runtimeSiteVersionId: payload.runtimeSiteVersionId,
        renderedDomLength: result.evidence.domLength,
        renderedDomNodeCount: result.evidence.domNodeCount,
        screenshotCount: result.evidence.screenshotPaths.length,
        computedStyleSampleCount: result.evidence.computedStyleSampleCount,
        sourceMode: result.sourceMode,
        renderedCaptureStatus: result.renderedCaptureStatus,
      })
    }
    console.info('[site-render-worker] SITE_RENDER_CAPTURE_COMPLETED', {
      siteId: payload.siteId,
      siteVersionId: payload.runtimeSiteVersionId,
      runtimeSiteId: payload.runtimeSiteId,
      sourceMode: result.sourceMode,
      renderedCaptureStatus: result.renderedCaptureStatus,
      renderedDomQuality: result.renderedDomQuality,
      domNodeCount: result.evidence.domNodeCount,
      screenshotCount: result.evidence.screenshotPaths.length,
      computedStyleSampleCount: result.evidence.computedStyleSampleCount,
    })
  } catch (error) {
    const mapped = deps.parseSiteRenderCaptureError(error)
    const code = mapped?.code ?? 'SITE_RENDER_CAPTURE_FAILED'
    const message = mapped?.message ?? (error instanceof Error ? error.message : 'Site render capture failed.')
    await deps.markSiteRenderFailed({
      siteVersionId: payload.runtimeSiteVersionId,
      errorCode: code,
      errorMessage: message,
    })
    console.error('[site-render-worker] SITE_RENDER_CAPTURE_FAILED', {
      siteId: payload.siteId,
      siteVersionId: payload.runtimeSiteVersionId,
      runtimeSiteId: payload.runtimeSiteId,
      code,
      message,
      maxAttempts,
    })
    throw error
  }
}

export const siteRenderCaptureJob = inngest.createFunction(
  {
    id: SITE_RENDER_CAPTURE_JOB_ID,
    retries: 2,
  },
  {
    event: SITE_RENDER_CAPTURE_JOB_TRIGGER_EVENT,
  },
  async ({ event }) => {
    await runSiteRenderCaptureJob({
      eventData: event.data,
      maxAttempts: SITE_RENDER_MAX_ATTEMPTS,
    })
  },
)
