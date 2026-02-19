import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
} from '@gnr8/core'
import { NextResponse, NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'

type RequestBody = {
  name?: string
  slug?: string
}

export async function POST(request: NextRequest, context: any) {
  try {
    const orgId = context.params.orgId as string

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
  } catch (error: unknown) {
    // vedno logaj - da Vercel pokaže pravi razlog
    const msg = error instanceof Error ? error.message : String(error)
    console.error('POST /api/orgs/[orgId]/projects failed', {
      msg,
      error,
      orgId: context?.params?.orgId,
    })

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

    // DEBUG: vrni message (kasneje lahko spet skriješ)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}