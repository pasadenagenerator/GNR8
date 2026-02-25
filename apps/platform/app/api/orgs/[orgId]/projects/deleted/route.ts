import { AuthorizationError, DomainError, NotFoundError } from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

function isMissingEntitlementError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return msg.toLowerCase().includes('missing required entitlement')
}

export async function GET(request: NextRequest, context: any) {
  try {
    const orgId = context.params.orgId as string
    const actorUserId = await requireActorUserId()
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
      const status = isMissingEntitlementError(error) ? 403 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}