import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getProjectService } from '@/src/di/core'
import { mapDomainError } from '@/src/http/map-domain-error'

type RequestBody = {
  name?: string
  slug?: string
}

export async function GET(_req: NextRequest, context: any) {
  try {
    const orgId = context.params.orgId as string
    const actorUserId = await requireActorUserId()

    const service = getProjectService()
    const projects = await service.listProjects({ actorUserId, orgId })

    return NextResponse.json({ projects }, { status: 200 })
  } catch (e) {
    const { status, message } = mapDomainError(e)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    const orgId = context.params.orgId as string
    const actorUserId = await requireActorUserId()
    const body = (await req.json()) as RequestBody

    const service = getProjectService()
    const project = await service.createProject({
      actorUserId,
      orgId,
      name: body.name ?? '',
      slug: body.slug ?? '',
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (e) {
    const { status, message } = mapDomainError(e)
    return NextResponse.json({ error: message }, { status })
  }
}