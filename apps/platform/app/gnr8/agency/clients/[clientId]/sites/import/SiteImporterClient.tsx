'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { agencyClientDashboardHref } from '@/gnr8/site/site-importer-routing'

type Props = {
  clientId: string
  clientName: string
  agencyId: string
  adminView?: boolean
}

type ImportResponse =
  | {
      ok: true
      siteId: string
      siteVersionId: string
      redirectTo: string
    }
  | {
      ok: false
      error?: string
    }

export default function SiteImporterClient(props: Props) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dashboardHref = useMemo(
    () =>
      agencyClientDashboardHref({
        clientId: props.clientId,
        agencyId: props.agencyId,
        adminView: props.adminView,
      }),
    [props.adminView, props.agencyId, props.clientId],
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const normalizedUrl = url.trim()
    if (!normalizedUrl) {
      setError('Website URL is required.')
      return
    }

    try {
      const response = await fetch(`/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          agencyId: props.agencyId,
          adminView: props.adminView ?? false,
        }),
      })
      const payload = (await response.json().catch(() => null)) as ImportResponse | null
      if (!payload) {
        setError(`Import failed (HTTP ${response.status})`)
        return
      }
      if (payload.ok !== true) {
        setError(payload.error ?? `Import failed (HTTP ${response.status})`)
        return
      }
      if (!response.ok) {
        setError(`Import failed (HTTP ${response.status})`)
        return
      }

      startTransition(() => {
        router.push(payload.redirectTo)
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Import failed due to an unexpected error.')
    }
  }

  return (
    <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
      <header style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Import site for {props.clientName}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Paste a public website URL to import it directly into this client workspace.
        </p>
      </header>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>Website URL</span>
          <input
            type='url'
            required
            value={url}
            placeholder='https://example.com'
            onChange={(event) => setUrl(event.currentTarget.value)}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 14,
            }}
          />
        </label>

        {error ? (
          <div
            role='alert'
            style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#7f1d1d', borderRadius: 8, padding: 10, fontSize: 13 }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type='submit'
            disabled={isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#fff',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 700,
              opacity: isPending ? 0.8 : 1,
            }}
          >
            {isPending ? 'Importing...' : 'Import Website'}
          </button>
          <Link
            href={dashboardHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Back to Client
          </Link>
        </div>
      </form>
    </section>
  )
}
