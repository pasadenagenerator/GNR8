import { NextResponse, type NextRequest } from 'next/server'
import { ConflictError, DomainError } from '@gnr8/core'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminOrgService } from '@/src/di/core'

type CreateOrgBody = {
  name?: unknown
  slug?: unknown
}

function toTrimmedString(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function mapError(e: unknown) {
  if (e instanceof ConflictError) return { status: 409, message: e.message }
  if (e instanceof DomainError) return { status: 400, message: e.message }

  const msg = e instanceof Error ? e.message : 'Internal server error'
  const lower = String(msg).toLowerCase()
  const status = lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
  return { status, message: msg }
}

export async function GET(_request: NextRequest) {
  try {
    await requireSuperadminUserId()

    const service = getSuperadminOrgService()
    const out = await service.listOrgs({ limit: 500 })

    return NextResponse.json(out, { status: 200 })
  } catch (e) {
    const out = mapError(e)
    return NextResponse.json({ error: out.message }, { status: out.status })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperadminUserId()

    const body = ((await request.json().catch(() => null)) ?? {}) as CreateOrgBody
    const name = toTrimmedString(body.name)
    const slug = toTrimmedString(body.slug)

    const service = getSuperadminOrgService()
    const out = await service.createOrg({ name, slug: slug || null })

    return NextResponse.json(out, { status: 201 })
  } catch (e) {
    const out = mapError(e)
    return NextResponse.json({ error: out.message }, { status: out.status })
  }
}