'use client'

import { FormEvent, useMemo, useState } from 'react'

type Props = {
  agencyId: string
}

type FormStatus = 'idle' | 'saving' | 'error'

export default function OwnerSetupForm({ agencyId }: Props) {
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const isSaving = status === 'saving'

  const passwordError = useMemo(() => {
    if (!password) return null
    if (password.length < 8) return 'Password must be at least 8 characters.'
    return null
  }, [password])

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) return null
    if (confirmPassword !== password) return 'Passwords do not match.'
    return null
  }, [confirmPassword, password])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setStatus('saving')

    try {
      const response = await fetch('/gnr8/onboarding/owner-setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          agencyId,
          password,
          confirmPassword,
          fullName,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { redirectTo?: unknown; error?: unknown }
        | null

      if (!response.ok) {
        setStatus('error')
        setError(String(payload?.error ?? 'Failed to complete owner setup.'))
        return
      }

      const redirectTo = String(payload?.redirectTo ?? '/gnr8/agency').trim()
      window.location.replace(redirectTo.startsWith('/') ? redirectTo : '/gnr8/agency')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Failed to complete owner setup.')
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
          autoComplete="new-password"
          disabled={isSaving}
          required
        />
      </label>

      {passwordError ? (
        <p style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>{passwordError}</p>
      ) : null}

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Confirm Password</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
          autoComplete="new-password"
          disabled={isSaving}
          required
        />
      </label>

      {confirmPasswordError ? (
        <p style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>{confirmPasswordError}</p>
      ) : null}

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Full Name (optional)</span>
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
          autoComplete="name"
          disabled={isSaving}
          maxLength={120}
        />
      </label>

      <button
        type="submit"
        disabled={isSaving}
        style={{
          marginTop: 4,
          padding: '10px 12px',
          border: '1px solid #0f172a',
          borderRadius: 8,
          background: '#0f172a',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        {isSaving ? 'Completing setup...' : 'Complete setup'}
      </button>

      {error ? (
        <div style={{ border: '1px solid #fecaca', borderRadius: 8, padding: 10, background: '#fff5f5' }}>
          <p style={{ margin: 0, color: '#7f1d1d' }}>{error}</p>
        </div>
      ) : null}
    </form>
  )
}
