import { createSiteCreateRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/sites/site-create-route-handlers'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'
import {
  createSiteFromTemplateRecord,
  parseSiteTemplateInstantiationError,
} from '@/gnr8/site/site-template-instantiation-service'
import { triggerSiteTemplateBootstrapJob } from '@/gnr8/site/routes/site-bootstrap-trigger'
import { getClientTemplateById } from '@/gnr8/template-intake/core/template-intake-query-service'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function triggerTemplateSiteBootstrap(input: {
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
}): Promise<boolean> {
  return triggerSiteTemplateBootstrapJob({
    siteId: input.site.siteId,
    clientId: input.site.clientId,
    agencyId: input.site.agencyId,
    templateId: input.template.id,
  })
}

const handlers = createSiteCreateRouteHandlers({
  requireScope: requireClientTemplateScope,
  getTemplateById: getClientTemplateById,
  createSiteFromTemplate: createSiteFromTemplateRecord,
  triggerTemplateSiteBootstrap,
  parseTemplateStorageError: parseTemplateRepositoryError,
  parseSiteCreateError: parseSiteTemplateInstantiationError,
  parseScopeError: parseThrownScopeError,
})

export const POST = handlers.POST
