'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'
import { RESET_PASSWORD_PATH } from '@/src/auth/auth-flow-model'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const submitInFlightRef = useRef(false)
  const lastSubmitAtRef = useRef(0)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (busy || submitInFlightRef.current) return

    const now = Date.now()
    if (now - lastSubmitAtRef.current < 500) return
    lastSubmitAtRef.current = now

    submitInFlightRef.current = true
    setBusy(true)
    setError(null)
    setRecoveryMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      const nextPath = typeof window === 'undefined' ? '' : String(new URL(window.location.href).searchParams.get('next') ?? '').trim()
      const resolver = await fetch(`/api/auth/post-login-home${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })
      const payload = (await resolver.json().catch(() => null)) as { target?: unknown; error?: unknown } | null

      if (!resolver.ok) {
        setError(String(payload?.error ?? 'Sign-in succeeded, but home routing could not be resolved.'))
        return
      }

      const target = typeof payload?.target === 'string' && payload.target.startsWith('/') ? payload.target : null
      if (!target) {
        setError('Sign-in succeeded, but home routing returned an invalid target.')
        return
      }

      router.replace(target)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to complete sign-in.')
    } finally {
      submitInFlightRef.current = false
      setBusy(false)
    }
  }

  async function sendRecoveryEmail() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setRecoveryMessage('Enter your email first, then request a reset link.')
      return
    }

    setRecoveryBusy(true)
    setError(null)
    setRecoveryMessage(null)

    try {
      const redirectTo = new URL(RESET_PASSWORD_PATH, window.location.origin).toString()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      })
      if (resetError) {
        setRecoveryMessage(resetError.message)
        setRecoveryBusy(false)
        return
      }

      setRecoveryMessage('Recovery email sent. Use the link in your inbox to set a new password.')
      setRecoveryBusy(false)
    } catch (cause) {
      setRecoveryMessage(cause instanceof Error ? cause.message : 'Failed to send recovery email.')
      setRecoveryBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '48px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            disabled={busy}
            required
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            disabled={busy}
            required
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        {error ? (
          <div style={{ color: 'crimson', fontSize: 14 }}>{error}</div>
        ) : null}

        {recoveryMessage ? (
          <div style={{ color: recoveryMessage.startsWith('Recovery email sent') ? '#166534' : 'crimson', fontSize: 14 }}>
            {recoveryMessage}
          </div>
        ) : null}

        <button
          disabled={busy}
          type="submit"
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          disabled={recoveryBusy || busy}
          onClick={sendRecoveryEmail}
          type="button"
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: recoveryBusy || busy ? 'not-allowed' : 'pointer',
          }}
        >
          {recoveryBusy ? 'Sending reset link…' : 'Forgot password? Send reset link'}
        </button>
      </form>
    </main>
  )
}
