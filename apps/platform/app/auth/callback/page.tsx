'use client'

import type { EmailOtpType } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

type CallbackStatus = 'checking' | 'done' | 'error'

const AUTH_CALLBACK_PATH = '/auth/callback'
const RESET_PASSWORD_PATH = '/reset-password'
const DEFAULT_AUTH_SUCCESS_PATH = '/gnr8/agency'
const DEFAULT_ONBOARDING_RESOLVER_PATH = '/api/auth/callback/next'

function normalizeNextPath(candidate: string | null): string {
  const value = String(candidate ?? '').trim()
  if (!value.startsWith('/')) return DEFAULT_AUTH_SUCCESS_PATH
  if (value.startsWith('//')) return DEFAULT_AUTH_SUCCESS_PATH
  if (value === AUTH_CALLBACK_PATH || value.startsWith(`${AUTH_CALLBACK_PATH}?`)) {
    return DEFAULT_AUTH_SUCCESS_PATH
  }
  return value
}

function asEmailOtpType(rawType: string | null): EmailOtpType | null {
  const normalized = String(rawType ?? '').trim()
  if (!normalized) return null
  if (
    normalized === 'signup' ||
    normalized === 'invite' ||
    normalized === 'magiclink' ||
    normalized === 'recovery' ||
    normalized === 'email_change' ||
    normalized === 'email'
  ) {
    return normalized
  }
  return null
}

export default function AuthCallbackPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [status, setStatus] = useState<CallbackStatus>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setStatus('checking')
        setError(null)

        const url = new URL(window.location.href)
        const nextPath = normalizeNextPath(url.searchParams.get('next'))
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
        const hashParams = new URLSearchParams(hash)
        const callbackType = asEmailOtpType(url.searchParams.get('type') ?? hashParams.get('type'))

        const explicitError =
          url.searchParams.get('error_description') ??
          hashParams.get('error_description') ??
          url.searchParams.get('error') ??
          hashParams.get('error')
        if (explicitError) {
          throw new Error(explicitError)
        }

        const code = url.searchParams.get('code')
        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code)
          if (result.error) throw result.error
        } else {
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          if (accessToken && refreshToken) {
            const result = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (result.error) throw result.error
          } else {
            const tokenHash = url.searchParams.get('token_hash')
            const otpType = callbackType
            if (tokenHash && otpType) {
              const result = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: otpType,
              })
              if (result.error) throw result.error
            }
          }
        }

        const sessionResult = await supabase.auth.getSession()
        if (sessionResult.error) throw sessionResult.error
        if (!sessionResult.data.session) {
          throw new Error('Invite or auth link is invalid or expired. Please request a new invite.')
        }

        if (callbackType === 'recovery') {
          window.history.replaceState({}, document.title, AUTH_CALLBACK_PATH)
          setStatus('done')
          window.setTimeout(() => {
            window.location.replace(RESET_PASSWORD_PATH)
          }, 0)
          return
        }

        const resolverResponse = await fetch(
          `${DEFAULT_ONBOARDING_RESOLVER_PATH}?next=${encodeURIComponent(nextPath)}`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              Accept: 'application/json',
            },
            cache: 'no-store',
          },
        )
        const resolverPayload = (await resolverResponse.json().catch(() => null)) as
          | { target?: unknown; error?: unknown }
          | null
        if (!resolverResponse.ok) {
          throw new Error(String(resolverPayload?.error ?? 'Failed to resolve post-auth redirect path.'))
        }
        const resolvedTarget = normalizeNextPath(
          typeof resolverPayload?.target === 'string' ? resolverPayload.target : null,
        )

        window.history.replaceState({}, document.title, AUTH_CALLBACK_PATH)
        setStatus('done')
        window.setTimeout(() => {
          window.location.replace(resolvedTarget)
        }, 0)
      } catch (cause) {
        setStatus('error')
        setError(cause instanceof Error ? cause.message : 'Failed to complete auth callback.')
      }
    })()
  }, [supabase])

  return (
    <main style={{ maxWidth: 640, margin: '48px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Completing sign-in</h1>
      {status === 'checking' && <p>We are verifying your invite and establishing your session...</p>}
      {status === 'done' && <p>Sign-in complete. Redirecting...</p>}
      {status === 'error' && (
        <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
          <p style={{ margin: 0 }}>
            <strong>Auth error:</strong> {error ?? 'Unknown callback error'}
          </p>
          <p style={{ marginTop: 8 }}>
            Please request a fresh invite link from your administrator and try again.
          </p>
        </div>
      )}
    </main>
  )
}
