import { createSiteCreateRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/sites/site-create-route-handlers'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'
import {
  createSiteFromTemplateRecord,
  parseSiteTemplateInstantiationError,
} from '@/gnr8/site/site-template-instantiation-service'
import {
  bootstrapRuntimeFromTemplateSite,
  parseTemplateSiteRuntimeBootstrapError,
} from '@/gnr8/site/site-template-runtime-bootstrap-service'
import { getClientTemplateById } from '@/gnr8/template-intake/core/template-intake-service'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const handlers = createSiteCreateRouteHandlers({
  requireScope: requireClientTemplateScope,
  getTemplateById: getClientTemplateById,
  createSiteFromTemplate: createSiteFromTemplateRecord,
  bootstrapTemplateSiteRuntime: bootstrapRuntimeFromTemplateSite,
  parseTemplateStorageError: parseTemplateRepositoryError,
  parseSiteCreateError: parseSiteTemplateInstantiationError,
  parseSiteBootstrapError: parseTemplateSiteRuntimeBootstrapError,
  parseScopeError: parseThrownScopeError,
})

export const POST = handlers.POST
