// apps/platform/app/api/orgs/[orgId]/projects/deleted/route.ts

import { AuthorizationError, DomainError, NotFoundError } from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function isEntitlementGateError(message: string): boolean {
  const m = String(message || '').toLowerCase()
  return m.includes('missing required entitlement:')
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const projectService = getProjectService()
    const projects = await projectService.listDeletedProjects({ actorUserId, orgId })

    return NextResponse.json({ projects }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof DomainError) {
      const status = isEntitlementGateError(error.message) ? 403 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}