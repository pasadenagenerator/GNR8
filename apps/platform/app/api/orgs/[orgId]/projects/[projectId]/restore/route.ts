// apps/platform/app/api/orgs/[orgId]/projects/[projectId]/restore/route.ts

import { AuthorizationError, DomainError, NotFoundError } from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

function isEntitlementGateError(message: string): boolean {
  const m = String(message || '').toLowerCase()
  return m.includes('missing required entitlement:')
}

export async function POST(_request: NextRequest, context: any) {
  try {
    const orgId = String(context.params?.orgId ?? '').trim()
    const projectId = String(context.params?.projectId ?? '').trim()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const actorUserId = await requireActorUserId()
    const projectService = getProjectService()

    const project = await projectService.restoreProject({
      actorUserId,
      orgId,
      projectId,
    })

    return NextResponse.json({ project }, { status: 200 })
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