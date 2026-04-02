import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'

type CreateClientBody = {
  agencyId?: unknown
  name?: unknown
  slug?: unknown
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeSlug(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

function mapMutationError(message: string): { status: number; message: string } {
  const normalized = message.toLowerCase()
  if (normalized.includes('duplicate') || normalized.includes('already exists')) {
    return { status: 409, message: 'Client slug already exists in this agency.' }
  }
  return { status: 400, message }
}

function createClientId(): string {
  const id = randomUUID()
  if (!UUID_RE.test(id)) {
    throw new Error('Failed to generate valid client id.')
  }
  return id
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as CreateClientBody

    const requestedAgencyId = normalizeText(body.agencyId)
    const name = normalizeText(body.name)
    const slug = normalizeSlug(body.slug)

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Client name is required.' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Client slug is required.' }, { status: 400 })
    }
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { ok: false, error: 'Slug must use lowercase letters, numbers, and single hyphen separators.' },
        { status: 400 },
      )
    }

    const actionContext = await requireAgencyActionContext({
      action: 'create_client',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId && requestedAgencyId.length > 0) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for client create.' }, { status: 403 })
    }

    const supabase = await getSupabaseServerClientMutating()

    const existingClientSlug = await supabase
      .from('organizations')
      .select('id')
      .eq('agency_id', actionContext.agencyId)
      .eq('organization_type', 'client')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()

    if (existingClientSlug.error) {
      return NextResponse.json({ ok: false, error: existingClientSlug.error.message }, { status: 400 })
    }
    if (existingClientSlug.data) {
      return NextResponse.json({ ok: false, error: 'Client slug already exists in this agency.' }, { status: 409 })
    }

    const insertResult = await supabase
      .from('organizations')
      .insert({
        id: createClientId(),
        name,
        slug,
        agency_id: actionContext.agencyId,
        organization_type: 'client',
      })
      .select('id,name,slug,agency_id,organization_type')
      .limit(1)
      .maybeSingle()

    if (insertResult.error) {
      const mapped = mapMutationError(insertResult.error.message)
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    const created = insertResult.data

    return NextResponse.json(
      {
        ok: true,
        client: created,
        redirectTo: `/gnr8/agency/clients/${encodeURIComponent(String(created?.id ?? ''))}/settings?agency=${encodeURIComponent(actionContext.agencyId)}`,
      },
      { status: 201 },
    )
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
