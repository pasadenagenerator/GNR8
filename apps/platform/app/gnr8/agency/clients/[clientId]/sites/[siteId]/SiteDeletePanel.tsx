'use client'

import { FormEvent, type CSSProperties, useMemo, useState } from 'react'

type Props = {
  clientId: string
  siteId: string
  agencyId: string
  adminView: boolean
  siteName: string
  canDeleteSite: boolean
}

type DeleteStatus = 'idle' | 'saving' | 'error'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function buttonStyle(destructive = false): CSSProperties {
  if (destructive) {
    return {
      height: 36,
      padding: '0 12px',
      borderRadius: 8,
      border: '1px solid #7f1d1d',
      background: '#991b1b',
      color: '#fff',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 700,
    }
  }
  return {
    height: 36,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  }
}

export default function SiteDeletePanel(props: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<DeleteStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const isConfirmed = useMemo(() => normalizeText(confirmation).toUpperCase() === 'DELETE', [confirmation])

  async function onDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!props.canDeleteSite) {
      setStatus('error')
      setError('Only agency owner/admin can delete this site.')
      return
    }

    if (!isConfirmed) {
      setStatus('error')
      setError('Type DELETE to confirm permanent deletion.')
      return
    }

    setStatus('saving')
    const response = await fetch(
      `/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/delete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          agencyId: props.agencyId,
          confirmation: 'DELETE',
          adminView: props.adminView ? '1' : '0',
        }),
      },
    )

    const payload = (await response.json().catch(() => null)) as { ok?: unknown; error?: unknown; redirectTo?: unknown } | null
    if (!response.ok) {
      setStatus('error')
      setError(String(payload?.error ?? 'Site deletion failed.'))
      return
    }

    const redirectTo = normalizeText(payload?.redirectTo)
    window.location.replace(redirectTo.startsWith('/') ? redirectTo : '/gnr8/agency')
  }

  return (
    <section
      style={{
        border: '1px solid #fecaca',
        borderRadius: 12,
        background: '#fff5f5',
        padding: 14,
        marginTop: 12,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, color: '#7f1d1d' }}>Danger Zone</h3>
      <p style={{ margin: '8px 0 0', color: '#7f1d1d', fontSize: 13 }}>
        Deleting this site is irreversible. This removes site workspace records and runtime linkage.
      </p>
      <div style={{ marginTop: 10 }}>
        <button
          type='button'
          onClick={() => {
            setDialogOpen(true)
            setStatus('idle')
            setError(null)
          }}
          style={buttonStyle(true)}
          disabled={!props.canDeleteSite}
        >
          Delete this site
        </button>
      </div>
      {!props.canDeleteSite ? (
        <p style={{ margin: '8px 0 0', color: '#7f1d1d', fontSize: 12 }}>
          Only agency owner/admin can perform this action.
        </p>
      ) : null}

      {dialogOpen ? (
        <div
          role='dialog'
          aria-modal='true'
          style={{
            marginTop: 12,
            border: '1px solid #fca5a5',
            borderRadius: 10,
            background: '#fff',
            padding: 12,
            display: 'grid',
            gap: 10,
          }}
        >
          <h4 style={{ margin: 0, fontSize: 15, color: '#7f1d1d' }}>Confirm Site Deletion</h4>
          <p style={{ margin: 0, color: '#7f1d1d', fontSize: 13 }}>
            You are deleting <strong>{props.siteName}</strong>. This action permanently deletes the site and cannot be undone.
          </p>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#7f1d1d' }}>
            Type <strong>DELETE</strong> to continue
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder='DELETE'
              style={{
                width: '100%',
                height: 36,
                borderRadius: 8,
                border: '1px solid #fca5a5',
                padding: '0 10px',
                fontSize: 13,
              }}
            />
          </label>
          {error ? (
            <p style={{ margin: 0, color: '#7f1d1d', fontSize: 12 }}>{error}</p>
          ) : null}
          <form onSubmit={onDelete} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type='submit' style={buttonStyle(true)} disabled={status === 'saving' || !isConfirmed}>
              {status === 'saving' ? 'Deleting…' : 'Delete this site'}
            </button>
            <button
              type='button'
              style={buttonStyle(false)}
              onClick={() => {
                setDialogOpen(false)
                setConfirmation('')
                setStatus('idle')
                setError(null)
              }}
              disabled={status === 'saving'}
            >
              Cancel
            </button>
          </form>
        </div>
      ) : null}
    </section>
  )
}
