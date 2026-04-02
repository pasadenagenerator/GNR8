'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

type Props = {
  agencyId: string
  suggestedName?: string
}

type Status = 'idle' | 'saving' | 'error'

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreateClientForm(props: Props) {
  const [name, setName] = useState(props.suggestedName ?? '')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const isSaving = status === 'saving'
  const slugHint = useMemo(() => normalizeSlug(name) || 'client-slug', [name])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const normalizedName = name.trim()
    const normalizedSlug = normalizeSlug(slug || slugHint)

    if (!normalizedName) {
      setError('Client name is required.')
      return
    }
    if (!normalizedSlug) {
      setError('Client slug is required.')
      return
    }

    setStatus('saving')

    try {
      const response = await fetch('/api/gnr8/agency/clients/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          agencyId: props.agencyId,
          name: normalizedName,
          slug: normalizedSlug,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { ok?: unknown; error?: unknown; redirectTo?: unknown }
        | null

      if (!response.ok) {
        setStatus('error')
        setError(String(payload?.error ?? 'Failed to create client.'))
        return
      }

      const redirectTo = String(payload?.redirectTo ?? '').trim()
      if (redirectTo.startsWith('/')) {
        window.location.replace(redirectTo)
        return
      }

      window.location.replace(`/gnr8/agency?agency=${encodeURIComponent(props.agencyId)}`)
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Failed to create client.')
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#334155' }}>Client Name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          disabled={isSaving}
          required
          maxLength={120}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#334155' }}>Slug</span>
        <input
          type="text"
          value={slug}
          onChange={(event) => setSlug(normalizeSlug(event.currentTarget.value))}
          placeholder={slugHint}
          disabled={isSaving}
          required
          maxLength={120}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
      </label>

      <button
        type="submit"
        disabled={isSaving}
        style={{
          height: 38,
          padding: '0 12px',
          borderRadius: 8,
          border: '1px solid #0f172a',
          background: '#0f172a',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          justifySelf: 'start',
        }}
      >
        {isSaving ? 'Creating...' : 'Create Client'}
      </button>

      {error ? (
        <div style={{ border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 12 }}>
          <p style={{ margin: 0, color: '#7f1d1d', fontSize: 13 }}>{error}</p>
        </div>
      ) : null}
    </form>
  )
}
