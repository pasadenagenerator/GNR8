import {
  type SiteTemplateBootstrapRequestedPayload,
  SITE_TEMPLATE_BOOTSTRAP_MAX_ATTEMPTS,
  SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'
import {
  bootstrapRuntimeFromTemplateSite,
  parseTemplateSiteRuntimeBootstrapError,
} from '@/gnr8/site/site-template-runtime-bootstrap-service'
import { emitSiteRenderRequestedEvent } from '@/gnr8/site/inngest/site-render-events'
import {
  getSiteBootstrapRecordById,
  markSiteBootstrapCompleted,
  markSiteBootstrapFailed,
  markSiteBootstrapStarted,
} from '@/gnr8/site/storage/site-bootstrap-repository'
import { queueSiteRenderJob } from '@/gnr8/site/storage/site-render-repository'
import { getTemplateByIdForClient } from '@/gnr8/template-intake/storage/template-repository'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function parsePayload(value: unknown): SiteTemplateBootstrapRequestedPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const siteId = normalizeText(record.siteId)
  const clientId = normalizeText(record.clientId)
  const agencyId = normalizeText(record.agencyId)
  const templateId = normalizeText(record.templateId)
  if (!siteId || !clientId || !agencyId || !templateId) return null
  return {
    siteId,
    clientId,
    agencyId,
    templateId,
  }
}

function hasBootstrapSourceTruth(template: {
  entryHtmlPath: string | null
  durableSnapshotRootDirAbs: string | null
  importSnapshotId: string | null
  sourceZipStorageBucket: string | null
  sourceZipStorageKey: string | null
}): boolean {
  const entryHtmlPath = normalizeText(template.entryHtmlPath)
  if (!entryHtmlPath) return false

  const durableSnapshotRootDirAbs = normalizeText(template.durableSnapshotRootDirAbs)
  const importSnapshotId = normalizeText(template.importSnapshotId)
  const sourceZipStorageBucket = normalizeText(template.sourceZipStorageBucket)
  const sourceZipStorageKey = normalizeText(template.sourceZipStorageKey)

  return Boolean(
    durableSnapshotRootDirAbs ||
      importSnapshotId ||
      (sourceZipStorageBucket && sourceZipStorageKey),
  )
}

export const SITE_TEMPLATE_BOOTSTRAP_JOB_ID = 'site-template-bootstrap-job'
export const SITE_TEMPLATE_BOOTSTRAP_JOB_TRIGGER_EVENT = SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT

type SiteTemplateBootstrapDeps = {
  parsePayload: typeof parsePayload
  getSiteBootstrapRecordById: typeof getSiteBootstrapRecordById
  getTemplateByIdForClient: typeof getTemplateByIdForClient
  markSiteBootstrapStarted: typeof markSiteBootstrapStarted
  bootstrapRuntimeFromTemplateSite: typeof bootstrapRuntimeFromTemplateSite
  markSiteBootstrapCompleted: typeof markSiteBootstrapCompleted
  queueSiteRenderJob: typeof queueSiteRenderJob
  emitSiteRenderRequestedEvent: typeof emitSiteRenderRequestedEvent
  markSiteBootstrapFailed: typeof markSiteBootstrapFailed
  parseTemplateSiteRuntimeBootstrapError: typeof parseTemplateSiteRuntimeBootstrapError
}

const DEFAULT_DEPS: SiteTemplateBootstrapDeps = {
  parsePayload,
  getSiteBootstrapRecordById,
  getTemplateByIdForClient,
  markSiteBootstrapStarted,
  bootstrapRuntimeFromTemplateSite,
  markSiteBootstrapCompleted,
  queueSiteRenderJob,
  emitSiteRenderRequestedEvent,
  markSiteBootstrapFailed,
  parseTemplateSiteRuntimeBootstrapError,
}

export async function runSiteTemplateBootstrapJob(input: {
  eventData: unknown
  maxAttempts?: number
  deps?: Partial<SiteTemplateBootstrapDeps>
}): Promise<void> {
  const deps = {
    ...DEFAULT_DEPS,
    ...(input.deps ?? {}),
  }
  const payload = deps.parsePayload(input.eventData)
  if (!payload) {
    throw new Error('Invalid site bootstrap event payload.')
  }

  const site = await deps.getSiteBootstrapRecordById({
    siteId: payload.siteId,
  })
  if (!site) {
    throw new Error('Site not found for template bootstrap.')
  }

  if (site.clientId !== payload.clientId || site.agencyId !== payload.agencyId || site.templateId !== payload.templateId) {
    throw new Error('Site bootstrap payload does not match persisted site ownership/template linkage.')
  }

  const template = await deps.getTemplateByIdForClient({
    clientId: payload.clientId,
    templateId: payload.templateId,
  })
  if (!template) {
    throw new Error('Template not found for site bootstrap.')
  }
  if (template.status !== 'ready') {
    throw new Error('Template is not ready for site bootstrap.')
  }
  if (!hasBootstrapSourceTruth(template)) {
    throw new Error('Template is marked ready but does not contain bootstrap source truth.')
  }

  await deps.markSiteBootstrapStarted({
    siteId: payload.siteId,
    clientId: payload.clientId,
    agencyId: payload.agencyId,
    templateId: payload.templateId,
  })

  console.info('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_WORKER_STARTED', {
    siteId: payload.siteId,
    clientId: payload.clientId,
    agencyId: payload.agencyId,
    templateId: payload.templateId,
  })

  const maxAttempts = Math.max(1, Number(input.maxAttempts ?? SITE_TEMPLATE_BOOTSTRAP_MAX_ATTEMPTS) || SITE_TEMPLATE_BOOTSTRAP_MAX_ATTEMPTS)

  try {
    const result = await deps.bootstrapRuntimeFromTemplateSite({
      site,
      template,
    })
    await deps.markSiteBootstrapCompleted({
      siteId: payload.siteId,
      templateId: payload.templateId,
      result,
    })
    try {
      const queuedRender = await deps.queueSiteRenderJob({
        siteId: payload.siteId,
        clientId: payload.clientId,
        agencyId: payload.agencyId,
        templateId: payload.templateId,
        runtimeSiteId: result.runtimeSiteId,
        runtimeSiteVersionId: result.siteVersionId,
      })
      console.info('[site-render-worker] SITE_RENDER_CAPTURE_TRIGGERED', {
        siteId: payload.siteId,
        siteVersionId: result.siteVersionId,
        runtimeSiteId: result.runtimeSiteId,
        triggerAccepted: queuedRender.shouldEmit,
        guardrailStatus: queuedRender.status,
      })
      if (queuedRender.shouldEmit) {
        await deps.emitSiteRenderRequestedEvent({
          siteId: payload.siteId,
          clientId: payload.clientId,
          agencyId: payload.agencyId,
          templateId: payload.templateId,
          runtimeSiteId: result.runtimeSiteId,
          runtimeSiteVersionId: result.siteVersionId,
        })
      }
    } catch (renderTriggerError) {
      console.error('[site-render-worker] SITE_RENDER_CAPTURE_TRIGGER_FAILED', {
        siteId: payload.siteId,
        siteVersionId: result.siteVersionId,
        runtimeSiteId: result.runtimeSiteId,
        message: renderTriggerError instanceof Error ? renderTriggerError.message : String(renderTriggerError),
      })
    }
    console.info('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_WORKER_COMPLETED', {
      siteId: payload.siteId,
      clientId: payload.clientId,
      agencyId: payload.agencyId,
      templateId: payload.templateId,
      siteVersionId: result.siteVersionId,
      runtimeSiteId: result.runtimeSiteId,
      artifactId: result.artifactId,
      sectionCount: result.sectionCount,
    })
  } catch (error) {
    const mapped = deps.parseTemplateSiteRuntimeBootstrapError(error)
    const code = mapped?.code ?? 'TEMPLATE_SITE_BOOTSTRAP_FAILED'
    const message = mapped?.message ?? (error instanceof Error ? error.message : 'Template runtime bootstrap failed.')
    await deps.markSiteBootstrapFailed({
      siteId: payload.siteId,
      templateId: payload.templateId,
      errorCode: code,
      errorMessage: message,
    })
    console.error('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_WORKER_FAILED', {
      siteId: payload.siteId,
      clientId: payload.clientId,
      agencyId: payload.agencyId,
      templateId: payload.templateId,
      code,
      message,
      maxAttempts,
    })
    throw error
  }
}

export const siteTemplateBootstrapJob = inngest.createFunction(
  {
    id: SITE_TEMPLATE_BOOTSTRAP_JOB_ID,
    retries: 2,
  },
  {
    event: SITE_TEMPLATE_BOOTSTRAP_JOB_TRIGGER_EVENT,
  },
  async ({ event }) => {
    await runSiteTemplateBootstrapJob({
      eventData: event.data,
      maxAttempts: SITE_TEMPLATE_BOOTSTRAP_MAX_ATTEMPTS,
    })
  },
)
