'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  initialContactPersonName: string
  initialContactEmail: string
  initialContactPhone: string
  initialLogoUrl?: string | null
  memberships: MembershipOption[]
  role: 'owner' | 'admin' | 'member' | 'superadmin'
  canEditClientSettings: boolean
  canViewDashboard: boolean
  canViewClientUsers: boolean
  embeddedInClientContext?: boolean
}

type Status = 'idle' | 'saving' | 'success' | 'error'

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sectionStyle(): React.CSSProperties {
  return {
    border: '1px solid #dbe6f1',
    borderRadius: 12,
    background: '#fff',
    padding: 16,
  }
}

function fieldStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
  }
}

function actionButtonStyle(): React.CSSProperties {
  return {
    height: 38,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid #0f172a',
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    justifySelf: 'start',
  }
}

function normalizeLogoUrl(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  if (normalized.startsWith('/')) return normalized

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return normalized
  } catch {
    return null
  }

  return null
}

function buildInitials(label: string): string {
  const words = label
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const initials = words
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  return initials || 'C'
}

export default function ClientSettingsClient(props: Props) {
  const router = useRouter()
  const [name, setName] = useState(props.initialName)
  const [slug, setSlug] = useState(props.initialSlug)
  const [contactPersonName, setContactPersonName] = useState(props.initialContactPersonName)
  const [contactEmail, setContactEmail] = useState(props.initialContactEmail)
  const [contactPhone, setContactPhone] = useState(props.initialContactPhone)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(normalizeLogoUrl(props.initialLogoUrl))
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoInputKey, setLogoInputKey] = useState(0)
  const [brandingStatus, setBrandingStatus] = useState<Status>('idle')
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null)

  const activeAgencyId = props.requestedAgencyId || props.agencyId
  const agencyDashboardPath = props.requestedAgencyId
    ? `/gnr8/agency?agency=${encodeURIComponent(props.requestedAgencyId)}`
    : `/gnr8/agency?agency=${encodeURIComponent(props.agencyId)}`
  const clientDashboardPath = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/dashboard?agency=${encodeURIComponent(activeAgencyId)}&client_tab=dashboard`
  const clientUsersPath = `/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users?agency=${encodeURIComponent(activeAgencyId)}`
  const canManageBranding = props.role === 'owner' || props.role === 'admin'
  const brandingBusy = brandingStatus === 'saving'
  const logoPreviewUrl = normalizeLogoUrl(logoUrl)
  const logoInitials = buildInitials(name || props.initialName)

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
    const normalizedContactPersonName = contactPersonName.trim()
    const normalizedContactEmail = contactEmail.trim().toLowerCase()
    const normalizedContactPhone = contactPhone.trim()

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
          contactPersonName: normalizedContactPersonName,
          contactEmail: normalizedContactEmail,
          contactPhone: normalizedContactPhone,
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

  async function onCopyDashboardLink() {
    if (typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(window.location.origin + clientDashboardPath)
      setLinkCopied('Client dashboard URL copied.')
      setTimeout(() => setLinkCopied(null), 2000)
    } catch {
      setLinkCopied('Could not copy link in this browser context.')
      setTimeout(() => setLinkCopied(null), 2500)
    }
  }

  async function onUploadLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBrandingError(null)
    setBrandingSuccess(null)

    if (!canManageBranding) {
      setBrandingStatus('error')
      setBrandingError('Only agency owner/admin can update client branding logo.')
      return
    }
    if (!logoFile) {
      setBrandingStatus('error')
      setBrandingError('Select a logo file before uploading.')
      return
    }

    setBrandingStatus('saving')

    try {
      const formData = new FormData()
      formData.set('agencyId', activeAgencyId)
      formData.set('targetType', 'client')
      formData.set('clientId', props.clientId)
      formData.set('file', logoFile)

      const response = await fetch('/api/gnr8/branding/upload', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as { ok?: unknown; logoUrl?: unknown; error?: unknown } | null
      if (!response.ok) {
        setBrandingStatus('error')
        setBrandingError(String(payload?.error ?? 'Failed to upload client logo.'))
        return
      }

      setLogoUrl(normalizeLogoUrl(payload?.logoUrl))
      setLogoFile(null)
      setLogoInputKey((value) => value + 1)
      setBrandingStatus('success')
      setBrandingSuccess('Client logo updated.')
      router.refresh()
    } catch (cause) {
      setBrandingStatus('error')
      setBrandingError(cause instanceof Error ? cause.message : 'Failed to upload client logo.')
    }
  }

  async function onRemoveLogo() {
    setBrandingError(null)
    setBrandingSuccess(null)

    if (!canManageBranding) {
      setBrandingStatus('error')
      setBrandingError('Only agency owner/admin can update client branding logo.')
      return
    }

    setBrandingStatus('saving')

    try {
      const response = await fetch('/api/gnr8/branding/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          agencyId: activeAgencyId,
          targetType: 'client',
          clientId: props.clientId,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { ok?: unknown; error?: unknown } | null
      if (!response.ok) {
        setBrandingStatus('error')
        setBrandingError(String(payload?.error ?? 'Failed to remove client logo.'))
        return
      }

      setLogoUrl(null)
      setLogoFile(null)
      setLogoInputKey((value) => value + 1)
      setBrandingStatus('success')
      setBrandingSuccess('Client logo removed. Initials fallback is now active.')
      router.refresh()
    } catch (cause) {
      setBrandingStatus('error')
      setBrandingError(cause instanceof Error ? cause.message : 'Failed to remove client logo.')
    }
  }

  const containerStyle: React.CSSProperties = props.embeddedInClientContext
    ? { display: 'grid', gap: 0 }
    : {
        maxWidth: 900,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }

  return (
    <main style={containerStyle}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>Client Settings</h1>
        <p style={{ margin: 0, color: '#334155' }}>
          Canonical client profile surface for identity, contact context, and access links.
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
          Current role: <strong>{props.role}</strong>
          {props.canEditClientSettings ? ' (edit enabled)' : ' (read-only)'}
        </p>
      </header>

      <section style={{ ...sectionStyle(), marginTop: props.embeddedInClientContext ? 14 : 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 6, color: '#0f172a' }}>Client Identity</h2>
        <p style={{ marginTop: 0, marginBottom: 12, color: '#475569', fontSize: 13 }}>
          Core organization identity for this client inside the current agency scope.
        </p>
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
              style={fieldStyle()}
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
              style={fieldStyle()}
            />
          </label>

          <h2 style={{ marginBottom: 6, color: '#0f172a' }}>Client Contact</h2>
          <p style={{ marginTop: 0, marginBottom: 4, color: '#475569', fontSize: 13 }}>
            Organization-level contact details. This does not modify authenticated client user accounts.
          </p>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>Contact Person Name</span>
            <input
              type="text"
              value={contactPersonName}
              onChange={(event) => setContactPersonName(event.currentTarget.value)}
              disabled={status === 'saving' || !props.canEditClientSettings}
              maxLength={120}
              placeholder="Optional"
              style={fieldStyle()}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>Contact Email</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.currentTarget.value)}
              disabled={status === 'saving' || !props.canEditClientSettings}
              maxLength={320}
              placeholder="Optional"
              style={fieldStyle()}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>Contact Phone</span>
            <input
              type="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.currentTarget.value)}
              disabled={status === 'saving' || !props.canEditClientSettings}
              maxLength={40}
              placeholder="Optional"
              style={fieldStyle()}
            />
          </label>

          <button
            type="submit"
            disabled={status === 'saving' || !props.canEditClientSettings}
            style={actionButtonStyle()}
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

      {canManageBranding ? (
        <section style={{ ...sectionStyle(), marginTop: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6, color: '#0f172a' }}>Branding</h2>
          <p style={{ marginTop: 0, marginBottom: 12, color: '#475569', fontSize: 13 }}>
            Upload a logo used in global navigation for this client workspace.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: 12,
              border: '1px solid #dbe6f1',
              background: '#f8fafc',
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt='Client logo preview' style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: '#334155' }}>{logoInitials}</span>
            )}
          </div>

          <form onSubmit={onUploadLogo} style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#334155' }}>Logo File</span>
              <input
                key={logoInputKey}
                type='file'
                accept='.png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml'
                onChange={(event) => setLogoFile(event.currentTarget.files?.[0] ?? null)}
                style={{ ...fieldStyle(), padding: 8 }}
                disabled={brandingBusy}
              />
              <span style={{ fontSize: 12, color: '#475569' }}>Supported: PNG, JPG, SVG. Max size 2 MB.</span>
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type='submit' style={actionButtonStyle()} disabled={brandingBusy || !logoFile}>
                {brandingBusy ? 'Uploading...' : logoPreviewUrl ? 'Replace Logo' : 'Upload Logo'}
              </button>
              <button
                type='button'
                onClick={onRemoveLogo}
                disabled={brandingBusy || !logoPreviewUrl}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  cursor: brandingBusy || !logoPreviewUrl ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  opacity: brandingBusy || !logoPreviewUrl ? 0.55 : 1,
                }}
              >
                Remove Logo
              </button>
            </div>
          </form>

          {brandingError ? (
            <div style={{ marginTop: 10, border: '1px solid #fecaca', borderRadius: 10, background: '#fff5f5', padding: 12 }}>
              <p style={{ margin: 0, color: '#7f1d1d', fontSize: 13 }}>{brandingError}</p>
            </div>
          ) : null}
          {brandingSuccess ? (
            <div style={{ marginTop: 10, border: '1px solid #bbf7d0', borderRadius: 10, background: '#f0fdf4', padding: 12 }}>
              <p style={{ margin: 0, color: '#166534', fontSize: 13 }}>{brandingSuccess}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {!props.embeddedInClientContext && props.memberships.length > 1 ? (
        <section style={{ ...sectionStyle(), marginTop: 12, padding: 12 }}>
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

      <section style={{ ...sectionStyle(), marginTop: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 6, color: '#0f172a' }}>Client Access / Links</h2>
        <p style={{ marginTop: 0, marginBottom: 12, color: '#475569', fontSize: 13 }}>
          Quick entry points for agency-managed client surfaces.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href={clientDashboardPath}
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
              opacity: props.canViewDashboard ? 1 : 0.6,
            }}
          >
            Client Dashboard
          </Link>
          <Link
            href={clientUsersPath}
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
              opacity: props.canViewClientUsers ? 1 : 0.6,
            }}
          >
            Client Team
          </Link>
          <button
            type="button"
            onClick={onCopyDashboardLink}
            style={{
              height: 32,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Copy Dashboard URL
          </button>
        </div>
        {!props.canViewClientUsers ? (
          <p style={{ marginTop: 10, marginBottom: 0, color: '#92400e', fontSize: 12 }}>
            Your role can open settings but cannot access client team management.
          </p>
        ) : null}
        {linkCopied ? <p style={{ marginTop: 10, marginBottom: 0, color: '#166534', fontSize: 12 }}>{linkCopied}</p> : null}
      </section>

      <section style={{ ...sectionStyle(), marginTop: 12, border: '1px solid #fed7aa', background: '#fff7ed' }}>
        <h2 style={{ marginTop: 0, marginBottom: 6, color: '#9a3412' }}>Danger Zone</h2>
        <p style={{ margin: 0, color: '#9a3412', fontSize: 13 }}>
          Client destructive actions are intentionally not enabled in this V2 scope.
        </p>
      </section>

      {!props.embeddedInClientContext ? (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href={agencyDashboardPath}
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
        </div>
      ) : null}
    </main>
  )
}
