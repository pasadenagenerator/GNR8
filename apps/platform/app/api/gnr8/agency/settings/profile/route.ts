import { NextResponse } from 'next/server'

import { parseOwnerContextError, requireOwnerAgencyContext } from '@/app/api/gnr8/agency/_lib/owner-access'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'

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
    return { status: 409, message: 'Agency slug already exists.' }
  }
  return { status: 400, message }
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Body

    const requestedAgencyId = normalizeText(body.agencyId)
    const name = normalizeText(body.name)
    const slug = normalizeSlug(body.slug)

    if (!name) {
      return NextResponse.json({ error: 'Agency name is required.' }, { status: 400 })
    }

    if (!slug) {
      return NextResponse.json({ error: 'Agency slug is required.' }, { status: 400 })
    }

    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must use lowercase letters, numbers, and single hyphen separators.' },
        { status: 400 },
      )
    }

    const ownerContext = await requireOwnerAgencyContext({
      requestedAgencyId,
    })

    if (ownerContext.agencyId !== requestedAgencyId && requestedAgencyId.length > 0) {
      return NextResponse.json({ error: 'Agency scope mismatch for requested update.' }, { status: 403 })
    }

    const supabase = await getSupabaseServerClientMutating()

    const existingSlug = await supabase
      .from('agencies')
      .select('id')
      .neq('id', ownerContext.agencyId)
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()

    if (existingSlug.error) {
      return NextResponse.json({ error: existingSlug.error.message }, { status: 400 })
    }

    if (existingSlug.data) {
      return NextResponse.json({ error: 'Agency slug already exists.' }, { status: 409 })
    }

    const updateResult = await supabase
      .from('agencies')
      .update({
        name,
        slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ownerContext.agencyId)
      .select('id,name,slug')
      .limit(1)
      .maybeSingle()

    if (updateResult.error) {
      const mapped = mapMutationError(updateResult.error.message)
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }

    return NextResponse.json({
      ok: true,
      agency: updateResult.data,
    })
  } catch (error) {
    const mapped = parseOwnerContextError(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }
}
