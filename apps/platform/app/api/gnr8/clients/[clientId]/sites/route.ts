import { createSiteCreateRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/sites/site-create-route-handlers'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'
import {
  createSiteFromTemplateRecord,
  parseSiteTemplateInstantiationError,
} from '@/gnr8/site/site-template-instantiation-service'
import { deprovisionSite } from '@/gnr8/site/site-deprovisioning-service'
import { getClientTemplateById } from '@/gnr8/template-intake/core/template-intake-query-service'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SiteBootstrapResult = {
  siteVersionId: string
  siteVersionNo: number
  runtimeSiteId: string
  artifactId: string | null
  previewSeeded: boolean
  sectionCount: number
}

async function bootstrapTemplateSiteRuntimeViaInternalRoute(input: {
  site: {
    siteId: string
    clientId: string
    agencyId: string
    templateId: string
    name: string
    domain: string
    status: string
    createdAt: string
    updatedAt: string
  }
  template: {
    id: string
    sourceFilename: string
    sourceZipStorageBucket: string | null
    sourceZipStorageKey: string | null
    importSnapshotId: string | null
    durableSnapshotRootDirAbs: string | null
    entryHtmlPath: string | null
    entryHtmlFileName: string | null
    importManifestSummary: unknown
  }
  request: Request
}): Promise<SiteBootstrapResult> {
  const endpoint = new URL('/api/internal/gnr8/template-site-bootstrap', input.request.url)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      site: input.site,
      template: input.template,
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean
        result?: SiteBootstrapResult
        code?: string
        error?: string
        siteId?: string
        templateId?: string
      }
    | null

  if (!response.ok || !payload?.ok || !payload.result) {
    throw {
      code: payload?.code ?? 'TEMPLATE_SITE_BOOTSTRAP_FAILED',
      message: payload?.error ?? 'Template runtime bootstrap failed.',
      siteId: payload?.siteId ?? input.site.siteId,
      templateId: payload?.templateId ?? input.template.id,
    }
  }

  return payload.result
}

function parseTemplateSiteRuntimeBootstrapErrorFromInternalPayload(
  error: unknown,
): { status: number; code: string; message: string; siteId: string; templateId: string } | null {
  const raw = error as Record<string, unknown> | null
  const code = String(raw?.code ?? '').trim()
  const siteId = String(raw?.siteId ?? '').trim()
  const templateId = String(raw?.templateId ?? '').trim()
  const message = String(raw?.message ?? '').trim() || 'Template runtime bootstrap failed.'
  if (!code || !siteId || !templateId) return null
  return {
    status: 500,
    code,
    message,
    siteId,
    templateId,
  }
}

const handlers = createSiteCreateRouteHandlers({
  requireScope: requireClientTemplateScope,
  getTemplateById: getClientTemplateById,
  createSiteFromTemplate: createSiteFromTemplateRecord,
  bootstrapTemplateSiteRuntime: bootstrapTemplateSiteRuntimeViaInternalRoute,
  parseTemplateStorageError: parseTemplateRepositoryError,
  parseSiteCreateError: parseSiteTemplateInstantiationError,
  parseSiteBootstrapError: parseTemplateSiteRuntimeBootstrapErrorFromInternalPayload,
  rollbackSiteOnBootstrapFailure: deprovisionSite,
  parseScopeError: parseThrownScopeError,
})

export const POST = handlers.POST
