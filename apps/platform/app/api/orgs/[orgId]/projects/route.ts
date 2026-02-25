import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
} from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

type RequestBody = {
  name?: string
  slug?: string
}

function isEntitlementGateError(message: string): boolean {
  const m = String(message || '').toLowerCase()
  // EntitlementService.assert throws: "Missing required entitlement: <key>"
  return m.includes('missing required entitlement:')
}

export async function GET(_request: NextRequest, context: any) {
  try {
    const orgId = String(context.params?.orgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const actorUserId = await requireActorUserId()
    const projectService = getProjectService()

    const projects = await projectService.listProjects({ actorUserId, orgId })
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

export async function POST(request: NextRequest, context: any) {
  try {
    const orgId = String(context.params?.orgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const actorUserId = await requireActorUserId()
    const body = (await request.json()) as RequestBody
    const projectService = getProjectService()

    const project = await projectService.createProject({
      actorUserId,
      orgId,
      name: body.name ?? '',
      slug: body.slug ?? '',
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
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