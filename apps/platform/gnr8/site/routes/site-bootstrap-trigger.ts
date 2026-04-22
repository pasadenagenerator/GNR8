import { SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT } from '@gnr8/runtime-contracts'
import { emitSiteTemplateBootstrapRequestedEvent } from '@/gnr8/site/inngest/site-template-bootstrap-events'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function toErrorDetails(error: unknown): { name: string; message: string; code: string | null } {
  if (error instanceof Error) {
    return {
      name: normalizeText(error.name) || 'Error',
      message: normalizeText(error.message) || 'Unknown enqueue error.',
      code: normalizeText((error as { code?: unknown }).code) || null,
    }
  }

  return {
    name: 'UnknownError',
    message: normalizeText(error) || 'Unknown enqueue error.',
    code: null,
  }
}

type SiteBootstrapEnqueueDiagnostics = {
  eventName: string
  sendTarget: string
  hasInngestEventKey: boolean
  hasInngestSigningKey: boolean
  hasInngestBaseUrl: boolean
  hasInngestEventApiBaseUrl: boolean
  hasInngestApiBaseUrl: boolean
}

export function getSiteBootstrapEnqueueDiagnostics(env: NodeJS.ProcessEnv = process.env): SiteBootstrapEnqueueDiagnostics {
  const eventApiBaseUrl = normalizeText(env.INNGEST_EVENT_API_BASE_URL)
  const baseUrl = normalizeText(env.INNGEST_BASE_URL)
  const eventKey = normalizeText(env.INNGEST_EVENT_KEY)
  const sendTarget = eventApiBaseUrl || baseUrl || 'default:https://inn.gs/e/<event-key>'

  return {
    eventName: SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
    sendTarget,
    hasInngestEventKey: Boolean(eventKey),
    hasInngestSigningKey: Boolean(normalizeText(env.INNGEST_SIGNING_KEY)),
    hasInngestBaseUrl: Boolean(baseUrl),
    hasInngestEventApiBaseUrl: Boolean(eventApiBaseUrl),
    hasInngestApiBaseUrl: Boolean(normalizeText(env.INNGEST_API_BASE_URL)),
  }
}

type TriggerSiteBootstrapJobDeps = {
  emit: typeof emitSiteTemplateBootstrapRequestedEvent
}

const DEFAULT_DEPS: TriggerSiteBootstrapJobDeps = {
  emit: emitSiteTemplateBootstrapRequestedEvent,
}

export function triggerSiteTemplateBootstrapJob(input: {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
}, deps: Partial<TriggerSiteBootstrapJobDeps> = {}): Promise<boolean> {
  const resolved = {
    ...DEFAULT_DEPS,
    ...deps,
  }
  const diagnostics = getSiteBootstrapEnqueueDiagnostics()

  return resolved
    .emit({
      siteId: input.siteId,
      clientId: input.clientId,
      agencyId: input.agencyId,
      templateId: input.templateId,
    })
    .then(() => {
      console.info('[site-create] TEMPLATE_SITE_BOOTSTRAP_TRIGGERED', {
        siteId: input.siteId,
        clientId: input.clientId,
        agencyId: input.agencyId,
        templateId: input.templateId,
        ...diagnostics,
      })
      return true
    })
    .catch((error) => {
      const details = toErrorDetails(error)
      console.error('[site-create] TEMPLATE_SITE_BOOTSTRAP_TRIGGER_FAILED', {
        siteId: input.siteId,
        clientId: input.clientId,
        agencyId: input.agencyId,
        templateId: input.templateId,
        ...diagnostics,
        errorName: details.name,
        errorCode: details.code,
        errorMessage: details.message,
      })
      return false
    })
}
