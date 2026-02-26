import { NextResponse, type NextRequest } from 'next/server'
import {
  AuthorizationError,
  DomainError,
  MissingEntitlementError,
  NotFoundError,
} from '@gnr8/core'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function requireParam(value: string, name: string): NextResponse | null {
  if (!value) {
    return NextResponse.json({ error: `${name} is required` }, { status: 400 })
  }
  return null
}

async function getOrgId(context: RouteContext): Promise<string> {
  const { orgId: rawOrgId } = await context.params
  return String(rawOrgId ?? '').trim()
}

function mapError(e: unknown): { status: number; message: string } {
  if (e instanceof MissingEntitlementError) return { status: 403, message: e.message }
  if (e instanceof AuthorizationError) return { status: 403, message: e.message }
  if (e instanceof NotFoundError) return { status: 404, message: e.message }
  if (e instanceof DomainError) return { status: 400, message: e.message }

  const msg = e instanceof Error ? e.message : String(e ?? 'Internal server error')
  return { status: 500, message: msg }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()
    const orgId = await getOrgId(context)

    const missing = requireParam(orgId, 'orgId')
    if (missing) return missing

    const projectService = getProjectService()
    const projects = await projectService.listDeletedProjects({ actorUserId, orgId })

    return NextResponse.json({ projects }, { status: 200 })
  } catch (e) {
    const out = mapError(e)
    return NextResponse.json({ error: out.message }, { status: out.status })
  }
}