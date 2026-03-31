'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setBusy(false)
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
        setBusy(false)
        setError(String(payload?.error ?? 'Sign-in succeeded, but home routing could not be resolved.'))
        return
      }

      const target = typeof payload?.target === 'string' && payload.target.startsWith('/') ? payload.target : null
      if (!target) {
        setBusy(false)
        setError('Sign-in succeeded, but home routing returned an invalid target.')
        return
      }

      setBusy(false)
      router.replace(target)
      router.refresh()
    } catch (cause) {
      setBusy(false)
      setError(cause instanceof Error ? cause.message : 'Failed to complete sign-in.')
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
            required
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        {error ? (
          <div style={{ color: 'crimson', fontSize: 14 }}>{error}</div>
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
      </form>
    </main>
  )
}
