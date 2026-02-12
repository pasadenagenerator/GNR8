import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
  OrganizationService,
} from '@gnr8/core'
import { PostgresOrganizationRepository } from '@gnr8/data'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAuthenticatedUserId } from '../../../src/server/auth/require-authenticated-user-id'

type RequestBody = {
  name?: string
  slug?: string
}

const repository = new PostgresOrganizationRepository()
const organizationService = new OrganizationService(repository)

export async function POST(request: NextRequest) {
  try {
    const actorUserId = requireAuthenticatedUserId(request)
    const body = (await request.json()) as RequestBody

    const result = await organizationService.createOrganization({
      actorUserId,
      name: body.name ?? '',
      slug: body.slug ?? '',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
