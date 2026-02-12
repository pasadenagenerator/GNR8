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
  params: {
    orgId: string
  }
}

type RequestBody = {
  name?: string
  slug?: string
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await Promise.resolve(context.params)
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
