export const MULTI_PAGE_IMPORT_STATIC_SITE_GUARDRAIL =
  'Multi-page import is for static websites. Dynamic content, forms, authenticated areas, and commerce are not imported yet.'

export const DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS = {
  maxRoutes: 60,
  maxDepth: 2,
  maxLinksPerPage: 150,
  maxTemplateLinksPerRoute: 30,
  maxSitemaps: 5,
  maxUrlsFromSitemaps: 100,
  maxNestedSitemaps: 5,
} as const

export const DEFAULT_MULTI_PAGE_IMPORT_HTML_ACQUISITION_LIMITS = {
  maxPages: 20,
  maxBytesPerPage: 1_000_000,
  requestTimeoutMs: 8_000,
} as const

export type SiteImportMultiPageLimitState = {
  maxRoutes: number
  maxDepth: number
  maxLinksPerPage: number
  maxAcquiredPages: number
  maxBytesPerPage: number
  requestTimeoutMs: number
}

export const DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE: SiteImportMultiPageLimitState = {
  maxRoutes: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS.maxRoutes,
  maxDepth: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS.maxDepth,
  maxLinksPerPage: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS.maxLinksPerPage,
  maxAcquiredPages: DEFAULT_MULTI_PAGE_IMPORT_HTML_ACQUISITION_LIMITS.maxPages,
  maxBytesPerPage: DEFAULT_MULTI_PAGE_IMPORT_HTML_ACQUISITION_LIMITS.maxBytesPerPage,
  requestTimeoutMs: DEFAULT_MULTI_PAGE_IMPORT_HTML_ACQUISITION_LIMITS.requestTimeoutMs,
}

export type SiteImportRequestPayload = {
  url: string
  siteName: string | null
  agencyId: string
  adminView: boolean
  multiPageDiscovery?: {
    enabled: true
    acquireHtml: true
    assembleRawArtifactPages: true
    limits: {
      maxRoutes: number
      maxDepth: number
      maxLinksPerPage: number
      maxTemplateLinksPerRoute: number
      maxSitemaps: number
      maxUrlsFromSitemaps: number
      maxNestedSitemaps: number
    }
    htmlAcquisitionLimits: {
      maxPages: number
      maxBytesPerPage: number
      requestTimeoutMs: number
    }
  }
}

function positiveInteger(value: unknown, fallback: number, minimum = 1): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(minimum, Math.floor(numeric))
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeSiteImportMultiPageLimits(input?: Partial<SiteImportMultiPageLimitState> | null): SiteImportMultiPageLimitState {
  return {
    maxRoutes: positiveInteger(input?.maxRoutes, DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE.maxRoutes),
    maxDepth: positiveInteger(input?.maxDepth, DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE.maxDepth),
    maxLinksPerPage: positiveInteger(input?.maxLinksPerPage, DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE.maxLinksPerPage),
    maxAcquiredPages: positiveInteger(input?.maxAcquiredPages, DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE.maxAcquiredPages),
    maxBytesPerPage: positiveInteger(input?.maxBytesPerPage, DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE.maxBytesPerPage, 1_024),
    requestTimeoutMs: positiveInteger(input?.requestTimeoutMs, DEFAULT_SITE_IMPORT_MULTI_PAGE_LIMIT_STATE.requestTimeoutMs, 250),
  }
}

export function buildSiteImportRequestPayload(input: {
  url: string
  siteName?: string | null
  agencyId: string
  adminView?: boolean
  multiPageImportEnabled?: boolean
  multiPageLimits?: Partial<SiteImportMultiPageLimitState> | null
}): SiteImportRequestPayload {
  const payload: SiteImportRequestPayload = {
    url: normalizeText(input.url),
    siteName: normalizeText(input.siteName) || null,
    agencyId: normalizeText(input.agencyId),
    adminView: input.adminView ?? false,
  }

  if (!input.multiPageImportEnabled) return payload

  const limits = normalizeSiteImportMultiPageLimits(input.multiPageLimits)
  payload.multiPageDiscovery = {
    enabled: true,
    acquireHtml: true,
    assembleRawArtifactPages: true,
    limits: {
      maxRoutes: limits.maxRoutes,
      maxDepth: limits.maxDepth,
      maxLinksPerPage: limits.maxLinksPerPage,
      maxTemplateLinksPerRoute: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS.maxTemplateLinksPerRoute,
      maxSitemaps: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS.maxSitemaps,
      maxUrlsFromSitemaps: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS.maxUrlsFromSitemaps,
      maxNestedSitemaps: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS.maxNestedSitemaps,
    },
    htmlAcquisitionLimits: {
      maxPages: limits.maxAcquiredPages,
      maxBytesPerPage: limits.maxBytesPerPage,
      requestTimeoutMs: limits.requestTimeoutMs,
    },
  }

  return payload
}

export function siteImportSuccessStatusText(input: {
  warning?: string | null
  multiPageValidationStatus?: string | null
  multiPageWarningCount?: number | null
}): string {
  const hasWarning =
    normalizeText(input.warning).length > 0 ||
    input.multiPageValidationStatus === 'ready_with_warnings' ||
    positiveInteger(input.multiPageWarningCount, 0, 0) > 0

  if (hasWarning) {
    return 'Import completed with warnings. Review Multi-Page Import summary in Site Workspace.'
  }

  return 'Import completed. Opening Site Workspace.'
}
