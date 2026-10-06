import { NextRequest, NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { requiredAgencyActionForSiteAction, runSiteAction } from '@/gnr8/site-actions/site-action-service'
import type { SiteActionRequest, SiteActionType } from '@/gnr8/site-actions/site-action-model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SiteActionsBody = {
  siteId?: unknown
  actionType?: unknown
  strategy?: unknown
  variantId?: unknown
  outputAdapterId?: unknown
  acceptedFunctionalReductions?: unknown
  agencyId?: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function parseActionType(value: unknown): SiteActionType | null {
  const normalized = normalizeText(value)
  if (normalized === 'rerun_transformation') return 'rerun_transformation'
  if (normalized === 'generate_redesign') return 'generate_redesign'
  if (normalized === 'publish_site') return 'publish_site'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as SiteActionsBody

    const actionType = parseActionType(body.actionType)
    if (!actionType) {
      return NextResponse.json({ ok: false, error: 'actionType is required' }, { status: 400 })
    }

    const siteId = normalizeText(body.siteId)
    if (!siteId) {
      return NextResponse.json({ ok: false, error: 'siteId is required' }, { status: 400 })
    }
    const requestedOutputAdapterId = normalizeText(body.outputAdapterId)
    if (
      actionType === 'generate_redesign' &&
      requestedOutputAdapterId &&
      requestedOutputAdapterId !== 'astro-static-site' &&
      requestedOutputAdapterId !== 'html-static-artifact'
    ) {
      return NextResponse.json({ ok: false, error: 'outputAdapterId is unsupported' }, { status: 400 })
    }

    const requestedAgencyId = normalizeText(body.agencyId)
    const actionContext = await requireAgencyActionContext({
      action: requiredAgencyActionForSiteAction(actionType),
      requestedAgencyId: requestedAgencyId || undefined,
    })

    const baseRequest: Pick<SiteActionRequest, 'siteId' | 'agencyId' | 'actor'> = {
      siteId,
      agencyId: actionContext.agencyId,
      actor: `user:${actionContext.userId}`,
    }

    const requestedReductions = body.acceptedFunctionalReductions && typeof body.acceptedFunctionalReductions === 'object'
      ? body.acceptedFunctionalReductions as Record<string, unknown>
      : null
    const reductionKind = normalizeText(requestedReductions?.kind)
    const reductionContactEmail = normalizeText(requestedReductions?.contactEmail).toLowerCase()
    const reductionCommentLinks = normalizeText(requestedReductions?.commentLinks)
    if (
      requestedReductions &&
      (
        actionType !== 'generate_redesign' ||
        reductionKind !== 'legacy-forms-to-disclosed-links-v1' ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reductionContactEmail) ||
        reductionCommentLinks !== 'source-article'
      )
    ) {
      return NextResponse.json({ ok: false, error: 'acceptedFunctionalReductions is invalid' }, { status: 400 })
    }

    const actionRequest: SiteActionRequest =
      actionType === 'rerun_transformation'
        ? {
            ...baseRequest,
            type: 'rerun_transformation',
          }
        : actionType === 'generate_redesign'
          ? {
              ...baseRequest,
              type: 'generate_redesign',
              strategy: normalizeText(body.strategy),
              outputAdapterId:
                requestedOutputAdapterId === 'html-static-artifact'
                  ? 'html-static-artifact'
                  : requestedOutputAdapterId === 'astro-static-site'
                    ? 'astro-static-site'
                    : undefined,
              acceptedFunctionalReductions: requestedReductions
                ? {
                    kind: 'legacy-forms-to-disclosed-links-v1',
                    contactEmail: reductionContactEmail,
                    commentLinks: 'source-article',
                  }
                : undefined,
            }
          : {
              ...baseRequest,
              type: 'publish_site',
              variantId: normalizeText(body.variantId) || undefined,
            }

    const result = await runSiteAction(actionRequest)

    return NextResponse.json(
      {
        ok: result.ok,
        actor_mode: actionContext.actorMode,
        result,
      },
      { status: result.ok ? 200 : 422 },
    )
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    if (mapped.status >= 400 && mapped.status < 500) {
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
