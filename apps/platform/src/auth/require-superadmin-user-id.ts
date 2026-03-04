// apps/platform/src/auth/require-superadmin-user-id.ts

import { cookies, headers } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

function parseAllowlist(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

async function getHost(): Promise<string> {
  // pri tebi headers() vrača Promise, zato mora biti await
  const h = await headers()
  const xf = h.get('x-forwarded-host')
  const host = (xf ?? h.get('host') ?? '').split(',')[0]?.trim() ?? ''
  return host
}

function withSharedDomain(options: CookieOptions, host: string): CookieOptions {
  const normalizedHost = (host.split(':')[0] ?? '').trim()

  const isLocal =
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost.endsWith('.localhost')

  const isPasadena =
    normalizedHost === 'pasadenagenerator.com' ||
    normalizedHost.endsWith('.pasadenagenerator.com')

  if (isLocal || !isPasadena) return options

  return {
    ...options,
    domain: '.pasadenagenerator.com',
  }
}

export async function requireSuperadminUserId(): Promise<string> {
  const cookieStore = await cookies()
  const host = await getHost()

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
            cookieStore.set(name, value, withSharedDomain(options, host))
          })
        },
      },
    },
  )

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) {
    throw new Error('Unauthorized')
  }

  const email = (data.user.email ?? '').toLowerCase()
  const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAILS)

  if (!email || allowlist.length === 0 || !allowlist.includes(email)) {
    throw new Error('Forbidden: superadmin only')
  }

  return data.user.id
}