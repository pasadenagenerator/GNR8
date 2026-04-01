'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'
import { LOGIN_PATH, RESET_PASSWORD_PATH } from '@/src/auth/auth-flow-model'

type Status = 'checking' | 'ready' | 'saving' | 'done' | 'error'

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

function toReadableAuthError(raw: string): string {
  const value = raw.trim()
  if (!value) return 'This recovery link is invalid or expired. Please request a new password reset email.'
  return value
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [status, setStatus] = useState<Status>('checking')
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')

  const isSaving = status === 'saving'

  useEffect(() => {
    ;(async () => {
      setStatus('checking')
      setError(null)

      try {
        const url = new URL(window.location.href)
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
        const hashParams = new URLSearchParams(hash)
        const rawType = String(url.searchParams.get('type') ?? hashParams.get('type') ?? '').trim()
        const callbackType = asEmailOtpType(rawType || null)

        if (rawType && !callbackType) {
          throw new Error('Recovery link type is invalid. Request a new password reset email.')
        }

        if (callbackType && callbackType !== 'recovery') {
          throw new Error('This route only accepts password recovery links. Use the invite or login flow.')
        }

        const explicitError =
          url.searchParams.get('error_description') ??
          hashParams.get('error_description') ??
          url.searchParams.get('error') ??
          hashParams.get('error')
        if (explicitError) {
          throw new Error(toReadableAuthError(explicitError))
        }

        const accessToken =
          url.searchParams.get('access_token') ?? hashParams.get('access_token')
        const refreshToken =
          url.searchParams.get('refresh_token') ?? hashParams.get('refresh_token')
        const tokenHash = url.searchParams.get('token_hash') ?? hashParams.get('token_hash')
        const code = url.searchParams.get('code') ?? hashParams.get('code')

        let attemptedFlow = false
        let lastFlowError: Error | null = null

        if (accessToken && refreshToken) {
          attemptedFlow = true
          const result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (result.error) {
            lastFlowError = result.error
          }
        }

        if (tokenHash) {
          if (callbackType === 'recovery') {
            attemptedFlow = true
            const result = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            })
            if (result.error) {
              lastFlowError = result.error
            }
          } else {
            throw new Error('Recovery link type is invalid. Request a new password reset email.')
          }
        }

        if (code) {
          attemptedFlow = true
          const result = await supabase.auth.exchangeCodeForSession(code)
          if (result.error) {
            lastFlowError = result.error
          }
        }

        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session) {
          if (lastFlowError) {
            throw lastFlowError
          }
          if (!attemptedFlow) {
            throw new Error('Recovery link is missing required credentials. Request a new password reset email.')
          }
          throw new Error('Recovery link is invalid or expired. Please request a new password reset email.')
        }

        window.history.replaceState({}, document.title, RESET_PASSWORD_PATH)
        setStatus('ready')
      } catch (e) {
        setStatus('error')
        setError(
          e instanceof Error
            ? toReadableAuthError(e.message)
            : 'This recovery link could not be verified. Please request a new password reset email.',
        )
      }
    })()
  }, [supabase])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== password2) {
      setError('Passwords do not match.')
      return
    }

    setStatus('saving')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setStatus('done')
      window.setTimeout(() => {
        router.replace(LOGIN_PATH)
        router.refresh()
      }, 1000)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to set new password')
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '48px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Reset your password</h1>
      <p style={{ marginTop: 0, marginBottom: 16, color: '#475569' }}>
        Enter a new password to finish account recovery.
      </p>

      {status === 'checking' && <p>Checking recovery link…</p>}

      {status === 'error' && (
        <div style={{ padding: 12, border: '1px solid #fca5a5', borderRadius: 8 }}>
          <p style={{ margin: 0 }}>
            <strong>Error:</strong> {error ?? 'Unknown error'}
          </p>
          <p style={{ marginTop: 8, marginBottom: 0 }}>
            Request a new reset email, then try again.
          </p>
        </div>
      )}

      {(status === 'ready' || status === 'saving') && (
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
              disabled={isSaving}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Confirm new password</span>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
              disabled={isSaving}
            />
          </label>

          <button
            disabled={isSaving}
            type="submit"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            {isSaving ? 'Updating…' : 'Update password'}
          </button>

          {error && (
            <div style={{ padding: 12, border: '1px solid #fca5a5', borderRadius: 8 }}>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}
        </form>
      )}

      {status === 'done' && <p>Password updated successfully. Redirecting to login…</p>}
    </main>
  )
}
