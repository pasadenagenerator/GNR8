import { NextResponse } from 'next/server'

import { parseCreateSiteFromTemplatePayload } from '@/gnr8/site/site-create-contract'
import { siteWorkspaceHref } from '@/gnr8/site/site-workspace-navigation'

type Params = {
  clientId: string
}

type Scope = {
  userId: string
  clientId: string
  organizationId: string
  agencyId: string
}

type TemplateRecord = {
  id: string
}

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
  getTemplateById: (input: { clientId: string; templateId: string }) => Promise<TemplateRecord | null>
  createSiteFromTemplate: (input: {
    clientId: string
    agencyId: string
    templateId: string
    name: string
    domain: string
  }) => Promise<CreatedSiteRecord>
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

        const created = await deps.createSiteFromTemplate({
          clientId: scope.clientId,
          agencyId: scope.agencyId,
          templateId: parsed.value.templateId,
          name: parsed.value.name,
          domain: parsed.value.domain,
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

        const scopeError = deps.parseScopeError(error)
        if (scopeError.status === 401 || scopeError.status === 403) {
          return toUnauthorizedResponse(scopeError)
        }
        return toScopeErrorResponse(scopeError)
      }
    },
  }
}
