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
