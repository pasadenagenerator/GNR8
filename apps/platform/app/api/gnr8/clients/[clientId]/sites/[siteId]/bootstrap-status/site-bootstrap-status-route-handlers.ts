import { NextResponse } from 'next/server'

import type { SiteWorkspaceReadModel } from '@/gnr8/site/site-workspace-read-model'
import type { TemplateSiteBootstrapStatusResult } from '@/gnr8/site/site-create-contract'

type Params = {
  clientId: string
  siteId: string
}

type Scope = {
  userId: string
  clientId: string
  organizationId: string
  agencyId: string
}

export type SiteBootstrapStatusRouteDeps = {
  requireScope: (input: { clientIdParam: string }) => Promise<Scope>
  getReadModel: (input: { agencyId: string; clientId: string; siteId: string }) => Promise<SiteWorkspaceReadModel | null>
  parseScopeError: (error: unknown) => { status: number; message: string }
}

function failedResult(input: {
  status?: 'failed'
  diagnostics?: string[]
  reasonCode: string
}): TemplateSiteBootstrapStatusResult {
  return {
    ok: false,
    siteId: null,
    runtimeSiteId: null,
    siteVersionId: null,
    status: input.status ?? 'failed',
    previewReady: false,
    previewUrl: null,
    rawTemplateArtifactFound: false,
    entryHtmlFound: false,
    fileMapCount: 0,
    slotCount: 0,
    publishReady: false,
    diagnostics: input.diagnostics ?? [],
    reasonCode: input.reasonCode,
  }
}

function mapReadModelToResult(readModel: SiteWorkspaceReadModel): TemplateSiteBootstrapStatusResult {
  const status = readModel.overview.previewReady
    ? 'preview_ready'
    : readModel.overview.bootstrapStatus === 'failed'
      ? 'failed'
      : 'bootstrap_running'
  const diagnostics = [
    'TEMPLATE_SITE_STATUS_REQUESTED',
    ...readModel.overview.createDiagnostics,
    status === 'failed' ? 'TEMPLATE_SITE_STATUS_FAILED' : null,
    'TEMPLATE_SITE_STATUS_RESOLVED',
  ].filter((value): value is string => Boolean(value))
  return {
    ok: true,
    siteId: readModel.site.id,
    runtimeSiteId: readModel.pipeline.runtimeSelection.selectedSiteId,
    siteVersionId: readModel.pipeline.runtimeSelection.selectedVersionId,
    status,
    previewReady: readModel.overview.previewReady,
    previewUrl: readModel.preview.previewUrl,
    rawTemplateArtifactFound: readModel.overview.rawTemplateArtifactFound,
    entryHtmlFound: readModel.overview.rawTemplateEntryHtmlFound,
    fileMapCount: readModel.overview.rawTemplateFileMapCount,
    slotCount: readModel.overview.contentSlotCount,
    publishReady: readModel.overview.publishReady,
    diagnostics,
    reasonCode: status === 'failed' ? (readModel.overview.reasonCode ?? 'TEMPLATE_SITE_BOOTSTRAP_FAILED') : null,
  }
}

export function createSiteBootstrapStatusRouteHandlers(deps: SiteBootstrapStatusRouteDeps) {
  return {
    GET: async (_request: Request, ctx: { params: Promise<Params> }) => {
      try {
        const { clientId: clientIdParam, siteId } = await ctx.params
        const scope = await deps.requireScope({ clientIdParam })
        const readModel = await deps.getReadModel({
          agencyId: scope.agencyId,
          clientId: scope.clientId,
          siteId,
        })

        if (!readModel) {
          return NextResponse.json(
            failedResult({
              reasonCode: 'SITE_NOT_FOUND',
              diagnostics: ['TEMPLATE_SITE_STATUS_REQUESTED', 'TEMPLATE_SITE_STATUS_FAILED'],
            }),
            { status: 404 },
          )
        }

        return NextResponse.json(mapReadModelToResult(readModel), { status: 200 })
      } catch (error) {
        const scopeError = deps.parseScopeError(error)
        if (scopeError.status === 401 || scopeError.status === 403) {
          return NextResponse.json(
            failedResult({
              reasonCode: 'SITE_UNAUTHORIZED',
              diagnostics: ['TEMPLATE_SITE_STATUS_REQUESTED', 'TEMPLATE_SITE_STATUS_FAILED', scopeError.message],
            }),
            { status: scopeError.status },
          )
        }

        return NextResponse.json(
          failedResult({
            reasonCode: 'SITE_SCOPE_ERROR',
            diagnostics: ['TEMPLATE_SITE_STATUS_REQUESTED', 'TEMPLATE_SITE_STATUS_FAILED', scopeError.message],
          }),
          { status: scopeError.status },
        )
      }
    },
  }
}
