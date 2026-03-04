// apps/platform/app/api/debug/whoami/route.ts

import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

export async function GET() {
  const cookieStore = await cookies()
  const h = await headers()
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0]?.trim() ?? ''

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return NextResponse.json(
      { ok: false, error: 'Not authenticated', host },
      { status: 401 },
    )
  }

  return NextResponse.json({
    ok: true,
    host,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  })
}
