// apps/platform/src/auth/require-actor-user-id.ts

import { cookies, headers } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

async function getHost(): Promise<string> {
  // pri tebi headers() vrača Promise, zato mora biti await
  const h = await headers()

  // Next/Vercel pogosto uporablja x-forwarded-host
  const xf = h.get('x-forwarded-host')
  const host = (xf ?? h.get('host') ?? '').split(',')[0]?.trim() ?? ''
  return host
}

function withSharedDomain(options: CookieOptions, host: string): CookieOptions {
  // Shared cookie domain samo na pravem apex domainu,
  // da auth piškotki delijo app.* in builder.*
  // Ne nastavljaj domain za localhost ali *.vercel.app
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

export async function requireActorUserId(): Promise<string> {
  // pri tebi cookies() vrača Promise, zato mora biti await
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

  return data.user.id
}