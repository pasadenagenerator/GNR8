'use client'

import type { EmailOtpType } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

type CallbackStatus = 'checking' | 'done' | 'error'

function normalizeNextPath(candidate: string | null): string {
  const value = String(candidate ?? '').trim()
  if (!value.startsWith('/')) return '/admin'
  if (value.startsWith('//')) return '/admin'
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
  const router = useRouter()
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
            const otpType = asEmailOtpType(url.searchParams.get('type'))
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

        window.history.replaceState({}, document.title, '/auth/callback')
        setStatus('done')
        router.replace(nextPath)
        router.refresh()
      } catch (cause) {
        setStatus('error')
        setError(cause instanceof Error ? cause.message : 'Failed to complete auth callback.')
      }
    })()
  }, [router, supabase])

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
