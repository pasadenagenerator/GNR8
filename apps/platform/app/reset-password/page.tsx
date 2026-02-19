'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

type Status = 'idle' | 'checking' | 'ready' | 'saving' | 'done' | 'error'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [status, setStatus] = useState<Status>('checking')
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')

  // izpeljano stanje (izven JSX blokov), da TS ne “preozko” sklepa
  const isSaving = status === 'saving'

  useEffect(() => {
    ;(async () => {
      setStatus('checking')
      setError(null)

      try {
        // 1) Če Supabase pošlje PKCE "code" v query string
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          setStatus('ready')
          return
        }

        // 2) Če Supabase pošlje access_token v hash (#...)
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : ''
        const hashParams = new URLSearchParams(hash)

        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (error) throw error
          setStatus('ready')
          return
        }

        // 3) Fallback: preveri, ali že obstaja session
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session) {
          setStatus('error')
          setError(
            'Recovery link is invalid or expired. Please request a new password reset.',
          )
          return
        }

        setStatus('ready')
      } catch (e) {
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Failed to verify recovery link')
      }
    })()
  }, [supabase])

  async function submit() {
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
      router.push('/admin')
      router.refresh()
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Failed to set new password')
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '48px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Set a new password</h1>

      {status === 'checking' && <p>Checking recovery link…</p>}

      {status === 'error' && (
        <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
          <p style={{ margin: 0 }}>
            <strong>Error:</strong> {error ?? 'Unknown error'}
          </p>
        </div>
      )}

      {(status === 'ready' || status === 'saving') && (
        <div style={{ display: 'grid', gap: 12 }}>
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
            <span>Repeat password</span>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
              disabled={isSaving}
            />
          </label>

          <button
            onClick={submit}
            disabled={isSaving}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            {isSaving ? 'Saving…' : 'Save password'}
          </button>

          {error && (
            <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}
        </div>
      )}

      {status === 'done' && <p>Done. Redirecting…</p>}
    </main>
  )
}