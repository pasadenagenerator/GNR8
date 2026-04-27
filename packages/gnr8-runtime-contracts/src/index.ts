export const TEMPLATE_PROCESSING_REQUESTED_EVENT = 'template/processing.requested'
export const TEMPLATE_PROCESSING_MAX_ATTEMPTS = 3
export const TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES = 10
export const SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT = 'site/bootstrap.requested'
export const SITE_TEMPLATE_BOOTSTRAP_MAX_ATTEMPTS = 3
export const SITE_RENDER_REQUESTED_EVENT = 'site/render.requested'
export const SITE_RENDER_MAX_ATTEMPTS = 3
export const DOMAIN_VERIFICATION_CHECK_EVENT = 'domain/verification.check'
export const DOMAIN_ACTIVATED_EVENT = 'domain/activated'

export type TemplateProcessingRequestedPayload = {
  templateId: string
  clientId: string
  sourceZipStorageBucket: string
  sourceZipStorageKey: string
}

export type TemplateRuntimeStatus = 'uploaded' | 'processing' | 'ready' | 'failed'

export type SiteTemplateBootstrapRequestedPayload = {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
}

export type SiteRenderRequestedPayload = {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
  runtimeSiteId: string
  runtimeSiteVersionId: string
}

export type DomainVerificationCheckPayload = {
  source?: 'schedule' | 'manual' | 'publish'
  requestedAt?: string
}

export type DomainActivatedPayload = {
  bindingId: string
  siteId: string
  siteVersionId: string
  domain: string
  previousStatus: 'pending' | 'verifying' | 'active' | 'failed'
  activatedAt: string
  vercelDomainId: string | null
}

export {
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  validateTemplateProcessingEventName,
} from './template-processing-event-validation'

export {
  CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  validateSiteTemplateBootstrapEventName,
} from './site-template-bootstrap-event-validation'

export {
  CANONICAL_SITE_RENDER_REQUESTED_EVENT,
  validateSiteRenderEventName,
} from './site-render-event-validation'

export {
  CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT,
  validateDomainVerificationCheckEventName,
} from './domain-verification-check-event-validation'
