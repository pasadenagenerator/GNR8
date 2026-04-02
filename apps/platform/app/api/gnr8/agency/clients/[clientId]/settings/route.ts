import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'

type Params = {
  params: Promise<{
    clientId?: string
  }>
}

type Body = {
  agencyId?: unknown
  name?: unknown
  slug?: unknown
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

export async function POST(request: Request, props: Params) {
  try {
    const { clientId: routeClientId = '' } = await props.params
    const clientId = normalizeText(routeClientId)
    const body = ((await request.json().catch(() => null)) ?? {}) as Body

    const requestedAgencyId = normalizeText(body.agencyId)
    const name = normalizeText(body.name)
    const slug = normalizeSlug(body.slug)

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'Client scope is required.' }, { status: 400 })
    }
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
      action: 'edit_client_settings',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId && requestedAgencyId.length > 0) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for client settings.' }, { status: 403 })
    }

    const supabase = await getSupabaseServerClientMutating()

    const currentClientResult = await supabase
      .from('organizations')
      .select('id,agency_id,organization_type')
      .eq('id', clientId)
      .eq('agency_id', actionContext.agencyId)
      .eq('organization_type', 'client')
      .limit(1)
      .maybeSingle()

    if (currentClientResult.error) {
      return NextResponse.json({ ok: false, error: currentClientResult.error.message }, { status: 400 })
    }
    if (!currentClientResult.data) {
      return NextResponse.json(
        { ok: false, error: 'Client scope is invalid for this agency context.' },
        { status: 404 },
      )
    }

    const existingSlug = await supabase
      .from('organizations')
      .select('id')
      .eq('agency_id', actionContext.agencyId)
      .eq('organization_type', 'client')
      .neq('id', clientId)
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()

    if (existingSlug.error) {
      return NextResponse.json({ ok: false, error: existingSlug.error.message }, { status: 400 })
    }
    if (existingSlug.data) {
      return NextResponse.json({ ok: false, error: 'Client slug already exists in this agency.' }, { status: 409 })
    }

    const updateResult = await supabase
      .from('organizations')
      .update({
        name,
        slug,
      })
      .eq('id', clientId)
      .eq('agency_id', actionContext.agencyId)
      .eq('organization_type', 'client')
      .select('id,name,slug,agency_id,organization_type')
      .limit(1)
      .maybeSingle()

    if (updateResult.error) {
      const mapped = mapMutationError(updateResult.error.message)
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    return NextResponse.json({
      ok: true,
      client: updateResult.data,
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
