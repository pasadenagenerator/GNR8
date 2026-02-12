import {
  ConflictError,
  DomainError,
  NotFoundError,
} from '@gnr8/core'
import { NextResponse, type NextRequest } from 'next/server'
import { getOrganizationService } from '@/src/di/core'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'

type RequestBody = {
  name?: string
  slug?: string
}

export async function POST(request: NextRequest) {
  try {
    const actorUserId = await requireActorUserId()
    const body = (await request.json()) as RequestBody
    const organizationService = getOrganizationService()

    const result = await organizationService.createOrganization({
      actorUserId,
      name: body.name ?? '',
      slug: body.slug ?? '',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
