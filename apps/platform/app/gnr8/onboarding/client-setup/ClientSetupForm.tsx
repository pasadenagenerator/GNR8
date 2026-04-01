'use client'

import { FormEvent, useState } from 'react'

type Props = {
  clientId: string
  initialName?: string | null
  initialSurname?: string | null
  initialMobileNumber?: string | null
}

type FormStatus = 'idle' | 'saving' | 'error'

function normalizeText(value: string): string {
  return value.trim()
}

export default function ClientSetupForm({ clientId, initialName, initialSurname, initialMobileNumber }: Props) {
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialName ?? '')
  const [surname, setSurname] = useState(initialSurname ?? '')
  const [mobileNumber, setMobileNumber] = useState(initialMobileNumber ?? '')

  const isSaving = status === 'saving'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const normalizedName = normalizeText(name)
    const normalizedSurname = normalizeText(surname)
    const normalizedMobileNumber = normalizeText(mobileNumber)

    if (!normalizedName) {
      setError('Name is required.')
      return
    }

    if (!normalizedSurname) {
      setError('Surname is required.')
      return
    }

    if (!normalizedMobileNumber) {
      setError('Mobile number is required.')
      return
    }

    setStatus('saving')

    try {
      const response = await fetch('/gnr8/onboarding/client-setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          clientId,
          name: normalizedName,
          surname: normalizedSurname,
          mobileNumber: normalizedMobileNumber,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { redirectTo?: unknown; error?: unknown }
        | null

      if (!response.ok) {
        setStatus('error')
        setError(String(payload?.error ?? 'Failed to complete client setup.'))
        return
      }

      const redirectTo = String(payload?.redirectTo ?? '/gnr8/client').trim()
      window.location.replace(redirectTo.startsWith('/') ? redirectTo : '/gnr8/client')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Failed to complete client setup.')
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
          autoComplete="given-name"
          disabled={isSaving}
          required
          maxLength={80}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Surname</span>
        <input
          type="text"
          value={surname}
          onChange={(event) => setSurname(event.target.value)}
          style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
          autoComplete="family-name"
          disabled={isSaving}
          required
          maxLength={80}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span>Mobile number</span>
        <input
          type="tel"
          value={mobileNumber}
          onChange={(event) => setMobileNumber(event.target.value)}
          style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
          autoComplete="tel"
          disabled={isSaving}
          required
          maxLength={40}
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
