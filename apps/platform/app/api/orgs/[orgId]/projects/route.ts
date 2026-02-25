import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
} from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type RequestBody = {
  name?: unknown
  slug?: unknown
}

function isMissingEntitlementError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.trim().toLowerCase().includes('missing required entitlement')
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
    const projects = await projectService.listProjects({ actorUserId, orgId })

    return NextResponse.json({ projects }, { status: 200 })
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (e instanceof DomainError) {
      const status = isMissingEntitlementError(e) ? 403 : 400
      return NextResponse.json({ error: e.message }, { status })
    }
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody

    const projectService = getProjectService()
    const project = await projectService.createProject({
      actorUserId,
      orgId,
      name: body.name == null ? '' : String(body.name),
      slug: body.slug == null ? '' : String(body.slug),
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    if (e instanceof ConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 })
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (e instanceof DomainError) {
      const status = isMissingEntitlementError(e) ? 403 : 400
      return NextResponse.json({ error: e.message }, { status })
    }
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}