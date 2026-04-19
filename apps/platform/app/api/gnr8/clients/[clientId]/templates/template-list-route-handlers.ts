import { NextResponse } from 'next/server'

import { listClientTemplatesWithReadDiagnostics } from '@/gnr8/template-intake/core/template-intake-query-service'
import {
  mapTemplateToListCard,
  sortTemplateCardsDeterministically,
  type TemplateListCard,
} from '@/gnr8/template-intake/core/template-list-contract'
import { parseTemplateRepositoryError } from '@/gnr8/template-intake/storage/template-repository'
import { parseThrownScopeError, requireClientTemplateScope } from '@/app/api/gnr8/clients/_lib/client-template-scope'

type Params = {
  clientId: string
}

type ClientScope = Awaited<ReturnType<typeof requireClientTemplateScope>>

type TemplateListRouteDeps = {
  requireScope: typeof requireClientTemplateScope
  queryTemplates: typeof listClientTemplatesWithReadDiagnostics
  mapTemplateToCard: typeof mapTemplateToListCard
  sortCards: typeof sortTemplateCardsDeterministically
  parseStorageError: typeof parseTemplateRepositoryError
  parseScopeError: typeof parseThrownScopeError
}

const DEFAULT_DEPS: TemplateListRouteDeps = {
  requireScope: requireClientTemplateScope,
  queryTemplates: listClientTemplatesWithReadDiagnostics,
  mapTemplateToCard: mapTemplateToListCard,
  sortCards: sortTemplateCardsDeterministically,
  parseStorageError: parseTemplateRepositoryError,
  parseScopeError: parseThrownScopeError,
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function resolveScopeMode(scope: ClientScope): string {
  const maybeMode = (scope as { mode?: unknown }).mode
  const normalized = normalizeText(maybeMode)
  return normalized || 'unclassified'
}

function toFailureBody(input: {
  clientId: string | null
  code: string
  message: string
  status: number
  resolvedScopeMode: string | null
  normalizationApplied: boolean
}) {
  return {
    ok: false,
    code: input.code,
    error: input.message,
    clientId: input.clientId,
    templates: [] as TemplateListCard[],
    routeError: {
      code: input.code,
      message: input.message,
      status: input.status,
      resolvedScopeMode: input.resolvedScopeMode,
      normalizationApplied: input.normalizationApplied,
    },
  }
}

export function createTemplateListRouteHandlers(deps: TemplateListRouteDeps = DEFAULT_DEPS) {
  return {
    GET: async (_request: Request, ctx: { params: Promise<Params> }) => {
      let clientIdForLog: string | null = null
      let resolvedScopeMode: string | null = null
      let normalizationApplied = false

      try {
        const { clientId: clientIdParam } = await ctx.params
        clientIdForLog = clientIdParam
        console.info('[template-list] TEMPLATE_LIST_REQUEST_RECEIVED', {
          clientId: clientIdParam,
        })

        const scope = await deps.requireScope({
          clientIdParam,
        })
        clientIdForLog = scope.clientId
        resolvedScopeMode = resolveScopeMode(scope)

        console.info('[template-list] TEMPLATE_LIST_SCOPE_RESOLVED', {
          clientId: scope.clientId,
          resolvedScopeMode,
        })

        console.info('[template-list] TEMPLATE_LIST_QUERY_STARTED', {
          clientId: scope.clientId,
          resolvedScopeMode,
        })

        const queryResult = await deps.queryTemplates({
          clientId: scope.clientId,
          limit: 250,
        })

        normalizationApplied = queryResult.diagnostics.normalizedRowCount > 0 || queryResult.diagnostics.skippedRowCount > 0

        console.info('[template-list] TEMPLATE_LIST_QUERY_COMPLETED', {
          clientId: scope.clientId,
          resolvedScopeMode,
          templateCount: queryResult.templates.length,
          normalizationApplied,
          normalizedRowCount: queryResult.diagnostics.normalizedRowCount,
          skippedRowCount: queryResult.diagnostics.skippedRowCount,
        })

        const cards: TemplateListCard[] = []
        for (const template of queryResult.templates) {
          try {
            cards.push(deps.mapTemplateToCard(template))
          } catch (error) {
            normalizationApplied = true
            console.warn('[template-list] TEMPLATE_LIST_ROW_SKIPPED', {
              clientId: scope.clientId,
              templateId: normalizeText((template as { id?: unknown }).id) || null,
              cause: error instanceof Error ? error.message : String(error),
              errorClass: error instanceof Error ? error.constructor.name : typeof error,
            })
          }
        }

        const sorted = deps.sortCards(cards)

        console.info('[template-list] TEMPLATE_LIST_RESPONSE_SENT', {
          clientId: scope.clientId,
          resolvedScopeMode,
          templateCount: sorted.length,
          normalizationApplied,
        })

        return NextResponse.json(
          {
            ok: true,
            clientId: scope.clientId,
            templates: sorted,
          },
          { status: 200 },
        )
      } catch (error) {
        const storageError = deps.parseStorageError(error)
        const mappedScopeError = deps.parseScopeError(error)

        const mappedStatus = storageError?.status ?? mappedScopeError.status
        const mappedCode = storageError?.code ?? (mappedStatus === 401 || mappedStatus === 403 ? 'TEMPLATE_UNAUTHORIZED' : 'TEMPLATE_LIST_FAILED')
        const mappedMessage = storageError?.message ?? mappedScopeError.message

        console.error('[template-list] TEMPLATE_LIST_FAILED', {
          clientId: clientIdForLog,
          resolvedScopeMode,
          normalizationApplied,
          errorCode: mappedCode,
          errorMessage: mappedMessage,
          errorClass: error instanceof Error ? error.constructor.name : typeof error,
        })

        return NextResponse.json(
          toFailureBody({
            clientId: clientIdForLog,
            code: mappedCode,
            message: mappedMessage,
            status: mappedStatus,
            resolvedScopeMode,
            normalizationApplied,
          }),
          { status: mappedStatus },
        )
      }
    },
  }
}
