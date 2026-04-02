'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import { useState } from 'react'

type MembershipOption = {
  agency_id: string
  agency_name: string | null
  role: 'owner' | 'admin' | 'member' | 'superadmin'
}

type Props = {
  agencyId: string
  requestedAgencyId: string | null
  clientId: string
  initialName: string
  initialSlug: string
  memberships: MembershipOption[]
  canEditClientSettings: boolean
}

type Status = 'idle' | 'saving' | 'success' | 'error'

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ClientSettingsClient(props: Props) {
  const [name, setName] = useState(props.initialName)
  const [slug, setSlug] = useState(props.initialSlug)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const dashboardPath = props.requestedAgencyId
    ? `/gnr8/agency?agency=${encodeURIComponent(props.requestedAgencyId)}`
    : `/gnr8/agency?agency=${encodeURIComponent(props.agencyId)}`

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!props.canEditClientSettings) {
      setStatus('error')
      setError('Your role is not authorized to edit client settings.')
      return
    }

    const normalizedName = name.trim()
    const normalizedSlug = normalizeSlug(slug)

    if (!normalizedName) {
      setStatus('error')
      setError('Client name is required.')
      return
    }
    if (!normalizedSlug) {
      setStatus('error')
      setError('Client slug is required.')
      return
    }

    setStatus('saving')

    try {
      const response = await fetch(`/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/settings`, {
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
        | { ok?: unknown; error?: unknown }
        | null

      if (!response.ok) {
        setStatus('error')
        setError(String(payload?.error ?? 'Failed to update client settings.'))
        return
      }

      setStatus('success')
      setSuccess('Client settings updated.')
      setSlug(normalizedSlug)
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Failed to update client settings.')
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>Client Settings</h1>
        <p style={{ margin: 0, color: '#334155' }}>
          Manage client identity fields used by agency-side client operations.
        </p>
      </header>

      <section style={{ marginTop: 16, border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 16 }}>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>Client Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              disabled={status === 'saving' || !props.canEditClientSettings}
              maxLength={120}
              required
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
              disabled={status === 'saving' || !props.canEditClientSettings}
              maxLength={120}
              required
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
            disabled={status === 'saving' || !props.canEditClientSettings}
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
            {status === 'saving' ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        {error ? (
          <div style={{ marginTop: 10, border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 12 }}>
            <p style={{ margin: 0, color: '#7f1d1d', fontSize: 13 }}>{error}</p>
          </div>
        ) : null}
        {success ? (
          <div style={{ marginTop: 10, border: '1px solid #bbf7d0', borderRadius: 10, background: '#f0fdf4', padding: 12 }}>
            <p style={{ margin: 0, color: '#166534', fontSize: 13 }}>{success}</p>
          </div>
        ) : null}
      </section>

      {props.memberships.length > 1 ? (
        <section style={{ marginTop: 12, border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 12 }}>
          <p style={{ marginTop: 0, marginBottom: 8, color: '#334155', fontSize: 13 }}>Switch agency context:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {props.memberships.map((membership) => (
              <Link
                key={membership.agency_id}
                href={`/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/settings?agency=${encodeURIComponent(membership.agency_id)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  textDecoration: 'none',
                  fontSize: 12,
                }}
              >
                {membership.agency_name?.trim() || membership.agency_id}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link
          href={dashboardPath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            textDecoration: 'none',
            fontSize: 12,
          }}
        >
          Back to Agency Dashboard
        </Link>
        <Link
          href={`/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users?agency=${encodeURIComponent(props.agencyId)}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            textDecoration: 'none',
            fontSize: 12,
          }}
        >
          Client Team
        </Link>
      </div>
    </main>
  )
}
