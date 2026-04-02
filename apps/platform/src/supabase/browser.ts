// apps/platform/src/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSharedCookieDomainForHost } from '@/src/auth/shared-cookie-domain'

function getCookieDomainForCurrentHost(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return getSharedCookieDomainForHost(window.location.hostname)
}

let _client: SupabaseClient | null = null
let _callbackClient: SupabaseClient | null = null

function createClientWithOptions(options?: { detectSessionInUrl?: boolean }): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')

  const domain = getCookieDomainForCurrentHost()

  return createBrowserClient(url, anon, {
    auth: options?.detectSessionInUrl === undefined ? undefined : { detectSessionInUrl: options.detectSessionInUrl },
    cookieOptions: {
      // ključni del:
      domain,
      path: '/',
      sameSite: 'lax',
      secure: true, // na https nujno; lokalno (http) domain=undefined, secure true je OK
    },
  })
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (_client) return _client

  _client = createClientWithOptions()
  return _client
}

export function getSupabaseBrowserClientForAuthCallback(): SupabaseClient {
  if (_callbackClient) return _callbackClient
  // Callback page establishes session explicitly and should not double-process URL tokens.
  _callbackClient = createClientWithOptions({ detectSessionInUrl: false })
  return _callbackClient
}
