// apps/platform/app/api/orgs/[orgId]/projects/[projectId]/route.ts

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

    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}