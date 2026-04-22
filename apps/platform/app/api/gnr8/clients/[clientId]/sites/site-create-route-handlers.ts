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
  triggerTemplateSiteBootstrap: (input: {
    site: CreatedSiteRecord
    template: TemplateSelection
  }) => Promise<boolean>
  parseTemplateStorageError: (error: unknown) => ParsedError
  parseSiteCreateError: (error: unknown) => ParsedError
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
        const triggered = await deps.triggerTemplateSiteBootstrap({
          site: created,
          template,
        })
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
            bootstrap: {
              state: triggered ? 'bootstrapping' : 'trigger_failed',
              triggerAccepted: triggered,
            },
            redirectTo,
          },
          { status: triggered ? 201 : 202 },
        )
      } catch (error) {
        const errorCode = String((error as { code?: unknown } | null)?.code ?? '').trim()
        if (errorCode === 'INVALID_AGENCY_ID_FOR_BOOTSTRAP') {
          return NextResponse.json(
            {
              ok: false,
              code: 'INVALID_AGENCY_ID_FOR_BOOTSTRAP',
              error: 'Agency scope is invalid for site bootstrap.',
            },
            { status: 409 },
          )
        }

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

        const scopeError = deps.parseScopeError(error)
        if (scopeError.status === 401 || scopeError.status === 403) {
          return toUnauthorizedResponse(scopeError)
        }
        return toScopeErrorResponse(scopeError)
      }
    },
  }
}
