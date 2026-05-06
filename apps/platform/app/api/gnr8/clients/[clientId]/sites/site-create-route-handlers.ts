import { NextResponse } from 'next/server'

import { parseCreateSiteFromTemplatePayload, type CreateSiteFromTemplateResult } from '@/gnr8/site/site-create-contract'
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
    failedResult({
      reasonCode: 'SITE_UNAUTHORIZED',
      diagnostics: [mapped.message],
    }),
    { status: mapped.status },
  )
}

function toScopeErrorResponse(mapped: { status: number; message: string }) {
  return NextResponse.json(
    failedResult({
      reasonCode: 'SITE_SCOPE_ERROR',
      diagnostics: [mapped.message],
    }),
    { status: mapped.status },
  )
}

function hasRawArtifactSource(template: TemplateSelection): boolean {
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

function okResult(input: Omit<CreateSiteFromTemplateResult, 'ok'>): CreateSiteFromTemplateResult {
  return { ok: true, ...input }
}

function failedResult(input: {
  status?: 'failed'
  templateId?: string | null
  diagnostics?: string[]
  nextUrl?: string | null
  reasonCode: string
}): CreateSiteFromTemplateResult {
  return {
    ok: false,
    siteId: null,
    runtimeSiteId: null,
    siteVersionId: null,
    templateId: input.templateId ?? null,
    status: 'failed',
    diagnostics: input.diagnostics ?? [],
    nextUrl: input.nextUrl ?? null,
    reasonCode: input.reasonCode,
  }
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
            failedResult({
              reasonCode: 'SITE_INVALID_PAYLOAD',
              diagnostics: [parsed.error],
            }),
            { status: 400 },
          )
        }

        const template = await deps.getTemplateById({
          clientId: scope.clientId,
          templateId: parsed.value.templateId,
        })
        if (!template) {
          return NextResponse.json(
            failedResult({
              reasonCode: 'TEMPLATE_NOT_FOUND',
              templateId: parsed.value.templateId,
              diagnostics: ['Template was not found for the current client scope.'],
            }),
            { status: 404 },
          )
        }
        if (template.status !== 'ready') {
          return NextResponse.json(
            failedResult({
              reasonCode: 'TEMPLATE_NOT_READY',
              templateId: template.id,
              diagnostics: ['Template is still processing and cannot be used for site creation yet.'],
            }),
            { status: 409 },
          )
        }
        if (!String(template.entryHtmlPath ?? '').trim()) {
          return NextResponse.json(
            failedResult({
              reasonCode: 'TEMPLATE_ENTRY_HTML_MISSING',
              templateId: template.id,
              diagnostics: ['Template is ready but entry HTML path is missing.'],
            }),
            { status: 409 },
          )
        }
        if (!hasRawArtifactSource(template)) {
          console.error('[site-create] TEMPLATE_READY_WITHOUT_BOOTSTRAP_SOURCE', {
            templateId: template.id,
            durableSnapshotRootDirAbs: template.durableSnapshotRootDirAbs,
            importSnapshotId: template.importSnapshotId,
            sourceZipStorageBucket: template.sourceZipStorageBucket,
            sourceZipStorageKey: template.sourceZipStorageKey,
            entryHtmlPath: template.entryHtmlPath,
          })
          return NextResponse.json(
            failedResult({
              reasonCode: 'TEMPLATE_RAW_ARTIFACT_MISSING',
              templateId: template.id,
              diagnostics: ['Template is marked ready but does not contain bootstrap source truth.'],
            }),
            { status: 409 },
          )
        }

        console.info('[site-create] TEMPLATE_SITE_CREATE_STARTED', {
          templateId: template.id,
          clientId: scope.clientId,
          agencyId: scope.agencyId,
          name: parsed.value.name,
          domain: parsed.value.domain,
        })

        const created = await deps.createSiteFromTemplate({
          clientId: scope.clientId,
          agencyId: scope.agencyId,
          templateId: parsed.value.templateId,
          name: parsed.value.name,
          domain: parsed.value.domain,
        })
        console.info('[site-create] TEMPLATE_SITE_CREATE_COMPLETED', {
          siteId: created.siteId,
          templateId: created.templateId,
          clientId: created.clientId,
          agencyId: created.agencyId,
          domain: created.domain,
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

        if (!triggered) {
          return NextResponse.json(
            {
              ok: false,
              siteId: created.siteId,
              runtimeSiteId: null,
              siteVersionId: null,
              templateId: created.templateId,
              status: 'failed',
              diagnostics: [
                'TEMPLATE_SITE_CREATE_STARTED',
                'TEMPLATE_SITE_CREATE_COMPLETED',
                'TEMPLATE_SITE_CREATE_FAILED',
                'TEMPLATE_SITE_BOOTSTRAP_TRIGGER_FAILED',
              ],
              nextUrl: redirectTo,
              reasonCode: 'TEMPLATE_SITE_BOOTSTRAP_TRIGGER_FAILED',
            } satisfies CreateSiteFromTemplateResult,
            { status: 202 },
          )
        }

        return NextResponse.json(
          okResult({
            siteId: created.siteId,
            runtimeSiteId: null,
            siteVersionId: null,
            templateId: created.templateId,
            status: 'bootstrap_running',
            diagnostics: ['TEMPLATE_SITE_CREATE_STARTED', 'TEMPLATE_SITE_CREATE_COMPLETED', 'TEMPLATE_SITE_BOOTSTRAP_STARTED'],
            nextUrl: redirectTo,
          }),
          { status: 201 },
        )
      } catch (error) {
        const errorCode = String((error as { code?: unknown } | null)?.code ?? '').trim()
        if (errorCode === 'INVALID_AGENCY_ID_FOR_BOOTSTRAP') {
          return NextResponse.json(
            failedResult({
              reasonCode: 'INVALID_AGENCY_ID_FOR_BOOTSTRAP',
              diagnostics: ['Agency scope is invalid for site bootstrap.', 'TEMPLATE_SITE_CREATE_FAILED'],
            }),
            { status: 409 },
          )
        }

        const templateStorageError = deps.parseTemplateStorageError(error)
        if (templateStorageError) {
          return NextResponse.json(
            failedResult({
              reasonCode: templateStorageError.code,
              diagnostics: [templateStorageError.message, 'TEMPLATE_SITE_CREATE_FAILED'],
            }),
            { status: templateStorageError.status },
          )
        }

        const siteStorageError = deps.parseSiteCreateError(error)
        if (siteStorageError) {
          return NextResponse.json(
            failedResult({
              reasonCode: siteStorageError.code,
              diagnostics: [siteStorageError.message, 'TEMPLATE_SITE_CREATE_FAILED'],
            }),
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
