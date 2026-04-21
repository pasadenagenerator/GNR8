import { NextResponse } from 'next/server'

import { parseCreateSiteFromTemplatePayload } from '@/gnr8/site/site-create-contract'
import { siteWorkspaceHref } from '@/gnr8/site/site-workspace-navigation'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

type Params = {
  clientId: string
}

type Scope = {
  userId: string
  clientId: string
  organizationId: string
  agencyId: string
}

type TemplateSelection = Pick<
  TemplateRecord,
  | 'id'
  | 'status'
  | 'sourceFilename'
  | 'sourceZipStorageBucket'
  | 'sourceZipStorageKey'
  | 'importSnapshotId'
  | 'durableSnapshotRootDirAbs'
  | 'entryHtmlPath'
  | 'entryHtmlFileName'
  | 'importManifestSummary'
>

type CreatedSiteRecord = {
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

type ParsedError = { status: number; code: string; message: string } | null

export type SiteCreateRouteDeps = {
  requireScope: (input: { clientIdParam: string }) => Promise<Scope>
  getTemplateById: (input: { clientId: string; templateId: string }) => Promise<TemplateSelection | null>
  createSiteFromTemplate: (input: {
    clientId: string
    agencyId: string
    templateId: string
    name: string
    domain: string
  }) => Promise<CreatedSiteRecord>
  bootstrapTemplateSiteRuntime: (input: {
    site: CreatedSiteRecord
    template: TemplateSelection
    request: Request
  }) => Promise<{
    siteVersionId: string
    siteVersionNo: number
    runtimeSiteId: string
    artifactId: string | null
    previewSeeded: boolean
    sectionCount: number
  }>
  parseTemplateStorageError: (error: unknown) => ParsedError
  parseSiteCreateError: (error: unknown) => ParsedError
  parseSiteBootstrapError: (
    error: unknown,
  ) => { status: number; code: string; message: string; siteId: string; templateId: string } | null
  rollbackSiteOnBootstrapFailure: (input: { siteId: string; clientId: string; agencyId: string }) => Promise<unknown>
  parseScopeError: (error: unknown) => { status: number; message: string }
}

function toUnauthorizedResponse(mapped: { status: number; message: string }) {
  return NextResponse.json(
    {
      ok: false,
      code: 'SITE_UNAUTHORIZED',
      error: mapped.message,
    },
    { status: mapped.status },
  )
}

function toScopeErrorResponse(mapped: { status: number; message: string }) {
  return NextResponse.json(
    {
      ok: false,
      code: 'SITE_SCOPE_ERROR',
      error: mapped.message,
    },
    { status: mapped.status },
  )
}

function hasBootstrapSourceTruth(template: TemplateSelection): boolean {
  const entryHtmlPath = String(template.entryHtmlPath ?? '').trim()
  if (!entryHtmlPath) return false

  const durableSnapshotRootDirAbs = String(template.durableSnapshotRootDirAbs ?? '').trim()
  const importSnapshotId = String(template.importSnapshotId ?? '').trim()
  const sourceZipStorageBucket = String(template.sourceZipStorageBucket ?? '').trim()
  const sourceZipStorageKey = String(template.sourceZipStorageKey ?? '').trim()

  return Boolean(
    durableSnapshotRootDirAbs ||
      importSnapshotId ||
      (sourceZipStorageBucket && sourceZipStorageKey),
  )
}

export function createSiteCreateRouteHandlers(deps: SiteCreateRouteDeps) {
  return {
    POST: async (request: Request, ctx: { params: Promise<Params> }) => {
      try {
        const { clientId: clientIdParam } = await ctx.params
        const scope = await deps.requireScope({ clientIdParam })
        const payload = await request.json().catch(() => null)
        const parsed = parseCreateSiteFromTemplatePayload(payload)
        if (!parsed.ok) {
          return NextResponse.json(
            {
              ok: false,
              code: 'SITE_INVALID_PAYLOAD',
              error: parsed.error,
            },
            { status: 400 },
          )
        }

        const template = await deps.getTemplateById({
          clientId: scope.clientId,
          templateId: parsed.value.templateId,
        })
        if (!template) {
          return NextResponse.json(
            {
              ok: false,
              code: 'TEMPLATE_NOT_FOUND',
              error: 'Template was not found for the current client scope.',
            },
            { status: 404 },
          )
        }
        if (template.status !== 'ready') {
          return NextResponse.json(
            {
              ok: false,
              code: 'TEMPLATE_NOT_READY',
              error: 'Template is still processing and cannot be used for site creation yet.',
            },
            { status: 409 },
          )
        }
        if (!hasBootstrapSourceTruth(template)) {
          console.error('[site-create] TEMPLATE_READY_WITHOUT_BOOTSTRAP_SOURCE', {
            templateId: template.id,
            durableSnapshotRootDirAbs: template.durableSnapshotRootDirAbs,
            importSnapshotId: template.importSnapshotId,
            sourceZipStorageBucket: template.sourceZipStorageBucket,
            sourceZipStorageKey: template.sourceZipStorageKey,
            entryHtmlPath: template.entryHtmlPath,
          })
          return NextResponse.json(
            {
              ok: false,
              code: 'TEMPLATE_READY_WITHOUT_BOOTSTRAP_SOURCE',
              error: 'Template is marked ready but does not contain bootstrap source truth.',
            },
            { status: 409 },
          )
        }

        const created = await deps.createSiteFromTemplate({
          clientId: scope.clientId,
          agencyId: scope.agencyId,
          templateId: parsed.value.templateId,
          name: parsed.value.name,
          domain: parsed.value.domain,
        })
        try {
          await deps.bootstrapTemplateSiteRuntime({
            site: created,
            template,
            request,
          })
        } catch (error) {
          try {
            await deps.rollbackSiteOnBootstrapFailure({
              siteId: created.siteId,
              clientId: scope.clientId,
              agencyId: scope.agencyId,
            })
          } catch (rollbackError) {
            console.error('[site-create] SITE_BOOTSTRAP_ROLLBACK_FAILED', {
              siteId: created.siteId,
              templateId: template.id,
              reason: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            })
          }
          throw error
        }
        const redirectTo = siteWorkspaceHref({
          clientId: scope.clientId,
          siteId: created.siteId,
          tab: 'overview',
          agencyId: scope.agencyId,
        })

        return NextResponse.json(
          {
            ok: true,
            site: {
              siteId: created.siteId,
              clientId: created.clientId,
              agencyId: created.agencyId,
              templateId: created.templateId,
              name: created.name,
              domain: created.domain,
              status: created.status,
              createdAt: created.createdAt,
              updatedAt: created.updatedAt,
            },
            redirectTo,
          },
          { status: 201 },
        )
      } catch (error) {
        const templateStorageError = deps.parseTemplateStorageError(error)
        if (templateStorageError) {
          return NextResponse.json(
            {
              ok: false,
              code: templateStorageError.code,
              error: templateStorageError.message,
            },
            { status: templateStorageError.status },
          )
        }

        const siteStorageError = deps.parseSiteCreateError(error)
        if (siteStorageError) {
          return NextResponse.json(
            {
              ok: false,
              code: siteStorageError.code,
              error: siteStorageError.message,
            },
            { status: siteStorageError.status },
          )
        }

        const bootstrapError = deps.parseSiteBootstrapError(error)
        if (bootstrapError) {
          return NextResponse.json(
            {
              ok: false,
              code: bootstrapError.code,
              error: bootstrapError.message,
              siteId: bootstrapError.siteId,
              templateId: bootstrapError.templateId,
            },
            { status: bootstrapError.status },
          )
        }

        const scopeError = deps.parseScopeError(error)
        if (scopeError.status === 401 || scopeError.status === 403) {
          return toUnauthorizedResponse(scopeError)
        }
        return toScopeErrorResponse(scopeError)
      }
    },
  }
}
