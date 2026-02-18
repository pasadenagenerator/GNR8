import {
  AuthorizationError,
  DomainError,
  NotFoundError,
} from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

export async function DELETE(request: NextRequest, context: any) {
  try {
    const orgId = context.params.orgId as string
    const projectId = context.params.projectId as string

    const actorUserId = await requireActorUserId()
    const projectService = getProjectService()

    const project = await projectService.deleteProject({
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}