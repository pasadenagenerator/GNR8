// apps/platform/src/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSharedCookieDomainForHost } from '@/src/auth/shared-cookie-domain'

const AUTH_DEBUG_ENABLED = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_AUTH_DEBUG_LOGIN === '1'

function getCookieDomainForCurrentHost(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return getSharedCookieDomainForHost(window.location.hostname)
}

let _client: SupabaseClient | null = null
let _callbackClient: SupabaseClient | null = null

function logAuthDebug(event: string, payload: Record<string, unknown>): void {
  if (!AUTH_DEBUG_ENABLED) return
  console.info(`[auth.browser.${event}]`, payload)
}

function instrumentAuthMethods(client: SupabaseClient, label: 'default' | 'callback'): SupabaseClient {
  const auth = client.auth as unknown as Record<string, unknown>
  const methodNames = [
    'signInWithPassword',
    'getSession',
    'getUser',
    'refreshSession',
    'setSession',
    'exchangeCodeForSession',
    'verifyOtp',
  ] as const

  for (const methodName of methodNames) {
    const originalMethod = auth[methodName]
    if (typeof originalMethod !== 'function') continue
    auth[methodName] = async (...args: unknown[]) => {
      logAuthDebug('method.start', {
        label,
        methodName,
        path: typeof window === 'undefined' ? null : window.location.pathname,
      })
      try {
        const result = await (originalMethod as (...methodArgs: unknown[]) => Promise<unknown>).apply(client.auth, args)
        const error = (result as { error?: unknown } | null | undefined)?.error
        logAuthDebug('method.done', {
          label,
          methodName,
          hasError: Boolean(error),
          errorMessage: error instanceof Error ? error.message : (error as { message?: unknown } | null)?.message ?? null,
        })
        return result
      } catch (error) {
        logAuthDebug('method.exception', {
          label,
          methodName,
          message: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }
  }

  return client
}

function createClientWithOptions(options?: { detectSessionInUrl?: boolean }): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')

  const domain = getCookieDomainForCurrentHost()
  const detectSessionInUrl = options?.detectSessionInUrl ?? false

  const client = createBrowserClient(url, anon, {
    auth: { detectSessionInUrl },
    cookieOptions: {
      // ključni del:
      domain,
      path: '/',
      sameSite: 'lax',
      secure: true, // na https nujno; lokalno (http) domain=undefined, secure true je OK
    },
  })

  logAuthDebug('client.created', {
    detectSessionInUrl,
    domain: domain ?? null,
    path: typeof window === 'undefined' ? null : window.location.pathname,
  })

  return client
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (_client) return _client

  _client = instrumentAuthMethods(createClientWithOptions({ detectSessionInUrl: false }), 'default')
  return _client
}

export function getSupabaseBrowserClientForAuthCallback(): SupabaseClient {
  if (_callbackClient) return _callbackClient
  // Callback page establishes session explicitly and should not double-process URL tokens.
  _callbackClient = instrumentAuthMethods(createClientWithOptions({ detectSessionInUrl: false }), 'callback')
  return _callbackClient
}
