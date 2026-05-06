import { createSiteBootstrapStatusRouteHandlers } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/bootstrap-status/site-bootstrap-status-route-handlers'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'
import { getSiteWorkspaceReadModelForPage } from '@/gnr8/site/site-workspace-read-model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const handlers = createSiteBootstrapStatusRouteHandlers({
  requireScope: requireClientTemplateScope,
  getReadModel: getSiteWorkspaceReadModelForPage,
  parseScopeError: parseThrownScopeError,
})

export const GET = handlers.GET
