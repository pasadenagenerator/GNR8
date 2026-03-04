// apps/platform/src/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

function getCookieDomainForCurrentHost(): string | undefined {
  if (typeof window === 'undefined') return undefined

  const host = window.location.hostname

  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.localhost')

  const isPasadena =
    host === 'pasadenagenerator.com' ||
    host.endsWith('.pasadenagenerator.com')

  // Lokalno: brez domain (host-only)
  // Ne-pasadena host: brez domain
  if (isLocal || !isPasadena) return undefined

  // Prod: deli med app., builder., ...
  return '.pasadenagenerator.com'
}

let _client: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')

  const domain = getCookieDomainForCurrentHost()

  _client = createBrowserClient(url, anon, {
    cookieOptions: {
      // ključni del:
      domain,
      path: '/',
      sameSite: 'lax',
      secure: true, // na https nujno; lokalno (http) domain=undefined, secure true je OK
    },
  })

  return _client
}