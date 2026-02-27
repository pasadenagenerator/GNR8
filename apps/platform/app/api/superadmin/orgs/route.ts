import { NextResponse, type NextRequest } from 'next/server'
import { ConflictError, DomainError, NotFoundError } from '@gnr8/core'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminOrgService } from '@/src/di/core'

type CreateOrgBody = {
  name?: unknown
  slug?: unknown
}

function toTrimmedString(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  if (value == null) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function mapError(e: unknown) {
  if (e instanceof ConflictError) return { status: 409, message: e.message }
  if (e instanceof NotFoundError) return { status: 404, message: e.message }
  if (e instanceof DomainError) return { status: 400, message: e.message }

  const msg = e instanceof Error ? e.message : 'Internal server error'
  const lower = String(msg).toLowerCase()
  const status = lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
  return { status, message: msg }
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperadminUserId()

    const limit = clampInt(request.nextUrl.searchParams.get('limit'), 1, 500, 500)

    const service = getSuperadminOrgService()
    const out = await service.listOrgs({ limit })

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
    const slug = toTrimmedString(body.slug).toLowerCase()

    const service = getSuperadminOrgService()
    const out = await service.createOrg({ name, slug: slug || null })

    return NextResponse.json(out, { status: 201 })
  } catch (e) {
    const out = mapError(e)
    return NextResponse.json({ error: out.message }, { status: out.status })
  }
}