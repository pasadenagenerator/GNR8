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
  params: Promise<{ orgId: string; projectId: string }>
}

async function getIds(context: RouteContext): Promise<{ orgId: string; projectId: string }> {
  const { orgId: rawOrgId, projectId: rawProjectId } = await context.params
  return {
    orgId: String(rawOrgId ?? '').trim(),
    projectId: String(rawProjectId ?? '').trim(),
  }
}

function requireParam(value: string, name: string): NextResponse | null {
  if (!value) {
    return NextResponse.json({ error: `${name} is required` }, { status: 400 })
  }
  return null
}

function mapError(e: unknown): { status: number; message: string } {
  if (e instanceof MissingEntitlementError) return { status: 403, message: e.message }
  if (e instanceof AuthorizationError) return { status: 403, message: e.message }
  if (e instanceof NotFoundError) return { status: 404, message: e.message }
  if (e instanceof DomainError) return { status: 400, message: e.message }

  const msg = e instanceof Error ? e.message : String(e ?? 'Internal server error')
  return { status: 500, message: msg }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()
    const { orgId, projectId } = await getIds(context)

    const missingOrg = requireParam(orgId, 'orgId')
    if (missingOrg) return missingOrg

    const missingProject = requireParam(projectId, 'projectId')
    if (missingProject) return missingProject

    const projectService = getProjectService()
    const project = await projectService.restoreProject({
      actorUserId,
      orgId,
      projectId,
    })

    return NextResponse.json({ project }, { status: 200 })
  } catch (e) {
    const out = mapError(e)
    return NextResponse.json({ error: out.message }, { status: out.status })
  }
}