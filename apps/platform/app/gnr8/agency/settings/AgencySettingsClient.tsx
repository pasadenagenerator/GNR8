'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

type MembershipOption = {
  agency_id: string
  agency_name: string | null
  role: 'owner' | 'admin' | 'member' | 'superadmin'
}

type Props = {
  agencyId: string
  agencyName: string
  agencySlug: string
  requestedAgencyId: string | null
  memberships: MembershipOption[]
  role: 'owner' | 'admin' | 'member' | 'superadmin'
  canEditAgencySettings: boolean
  canEditAgencySlug: boolean
  canEditOwnerProfile: boolean
  canDeleteAgency: boolean
  canChangePassword: boolean
  ownerName: string
  ownerEmail: string
  actorMode?: 'membership' | 'admin_view'
  adminBackToPath?: string
  adminTeamPath?: string
}

type FormStatus = 'idle' | 'saving' | 'success' | 'error'

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

function buttonStyle(destructive = false): React.CSSProperties {
  if (destructive) {
    return {
      height: 38,
      padding: '0 12px',
      borderRadius: 8,
      border: '1px solid #7f1d1d',
      background: '#991b1b',
      color: '#fff',
      cursor: 'pointer',
      fontSize: 13,
    }
  }

  return {
    height: 38,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid #0f172a',
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  }
}

function statusMessage(status: FormStatus, error: string | null, success: string | null): string | null {
  if (status === 'error') return error
  if (status === 'success') return success
  return null
}

export default function AgencySettingsClient(props: Props) {
  const [agencyName, setAgencyName] = useState(props.agencyName)
  const [agencySlug, setAgencySlug] = useState(props.agencySlug)

  const [ownerName, setOwnerName] = useState(props.ownerName)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const [agencyStatus, setAgencyStatus] = useState<FormStatus>('idle')
  const [agencyError, setAgencyError] = useState<string | null>(null)
  const [agencySuccess, setAgencySuccess] = useState<string | null>(null)

  const [ownerStatus, setOwnerStatus] = useState<FormStatus>('idle')
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [ownerSuccess, setOwnerSuccess] = useState<string | null>(null)

  const [passwordStatus, setPasswordStatus] = useState<FormStatus>('idle')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  const [deleteStatus, setDeleteStatus] = useState<FormStatus>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isDeleteConfirmed = deleteConfirmation.trim() === props.agencySlug

  const passwordValidationMessage = useMemo(() => {
    if (!newPassword) return null
    if (newPassword.length < 8) return 'Password must be at least 8 characters.'
    if (confirmPassword && confirmPassword !== newPassword) return 'Passwords do not match.'
    return null
  }, [newPassword, confirmPassword])

  async function postJson(endpoint: string, payload: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify(payload),
    })

    const body = (await response.json().catch(() => null)) as { ok?: unknown; error?: unknown; redirectTo?: unknown } | null
    return {
      ok: response.ok,
      status: response.status,
      error: body?.error ? String(body.error) : null,
      redirectTo: body?.redirectTo ? String(body.redirectTo) : null,
    }
  }

  async function onAgencySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAgencyError(null)
    setAgencySuccess(null)

    if (!props.canEditAgencySettings) {
      setAgencyError('Your role is read-only for agency settings.')
      return
    }

    setAgencyStatus('saving')

    const result = await postJson('/api/gnr8/agency/settings/profile', {
      agencyId: props.agencyId,
      name: agencyName,
      slug: agencySlug,
    })

    if (!result.ok) {
      setAgencyStatus('error')
      setAgencyError(result.error ?? 'Failed to update agency profile.')
      return
    }

    setAgencyStatus('success')
    setAgencySuccess('Agency profile updated.')
  }

  async function onOwnerSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOwnerError(null)
    setOwnerSuccess(null)

    if (props.role !== 'owner') {
      setOwnerError('Only the agency owner can update owner profile settings.')
      return
    }

    setOwnerStatus('saving')

    const result = await postJson('/api/gnr8/agency/settings/owner', {
      agencyId: props.agencyId,
      fullName: ownerName,
    })

    if (!result.ok) {
      setOwnerStatus('error')
      setOwnerError(result.error ?? 'Failed to update owner profile.')
      return
    }

    setOwnerStatus('success')
    setOwnerSuccess('Owner profile updated.')
  }

  async function onPasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!props.canChangePassword) {
      setPasswordError('Your role is not allowed to change password.')
      return
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordStatus('saving')

    const result = await postJson('/api/gnr8/agency/settings/password', {
      agencyId: props.agencyId,
      newPassword,
      confirmPassword,
    })

    if (!result.ok) {
      setPasswordStatus('error')
      setPasswordError(result.error ?? 'Failed to update password.')
      return
    }

    setPasswordStatus('success')
    setPasswordSuccess('Password updated.')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function onDeleteAgency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteError(null)

    if (!props.canDeleteAgency) {
      setDeleteError('Only the agency owner can delete this agency.')
      return
    }

    if (!isDeleteConfirmed) {
      setDeleteError('Confirmation text must match current agency slug before deletion.')
      return
    }

    setDeleteStatus('saving')

    const result = await postJson('/api/gnr8/agency/delete', {
      agencyId: props.agencyId,
      confirmationSlug: deleteConfirmation,
    })

    if (!result.ok) {
      setDeleteStatus('error')
      setDeleteError(result.error ?? 'Failed to delete agency.')
      return
    }

    const redirectTo = isAdminView
      ? '/gnr8/command-center'
      : result.redirectTo?.startsWith('/')
        ? result.redirectTo
        : '/login'
    window.location.replace(redirectTo)
  }

  const currentAgencyDashboardPath = props.requestedAgencyId
    ? `/gnr8/agency?agency=${encodeURIComponent(props.requestedAgencyId)}`
    : `/gnr8/agency?agency=${encodeURIComponent(props.agencyId)}`
  const actorMode = props.actorMode ?? 'membership'
  const isAdminView = actorMode === 'admin_view'
  const backToPath = isAdminView
    ? props.adminBackToPath || `/gnr8/admin/agencies/${encodeURIComponent(props.agencyId)}/dashboard`
    : currentAgencyDashboardPath

  return (
    <main
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>Agency Settings</h1>
        <p style={{ margin: 0, color: '#334155' }}>
          Manage agency profile, owner profile, security settings, and destructive delete controls.
        </p>
        {isAdminView ? (
          <section
            style={{
              border: '1px solid #7dd3fc',
              borderRadius: 12,
              background: '#f0f9ff',
              padding: 12,
              color: '#0c4a6e',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid #7dd3fc',
                background: '#e0f2fe',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Admin View
            </div>
            <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 13 }}>
              <div>
                <strong>Agency Name:</strong> {props.agencyName}
              </div>
              <div>
                <strong>Agency ID:</strong> {props.agencyId}
              </div>
              <div>
                <strong>Actor Mode:</strong> admin_view
              </div>
            </div>
          </section>
        ) : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href={backToPath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 34,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            {isAdminView ? 'Back to Admin Dashboard' : 'Back to Dashboard'}
          </Link>
          {isAdminView ? (
            <Link
              href={props.adminTeamPath || `/gnr8/admin/agencies/${encodeURIComponent(props.agencyId)}/members`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 34,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0f172a',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              Agency Team
            </Link>
          ) : null}
          {!isAdminView ? (
            <Link
              href="/gnr8/agency/members"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 34,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0f172a',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              Team
            </Link>
          ) : null}

          {!isAdminView && props.memberships.length > 1
            ? props.memberships.map((membership) => {
                const isActive = membership.agency_id === props.agencyId
                return (
                  <Link
                    key={membership.agency_id}
                    href={`/gnr8/agency/settings?agency=${encodeURIComponent(membership.agency_id)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: isActive ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                      background: isActive ? '#eff6ff' : '#fff',
                      color: isActive ? '#1e3a8a' : '#334155',
                      textDecoration: 'none',
                      fontSize: 12,
                    }}
                  >
                    {membership.agency_name?.trim() || membership.agency_id}
                  </Link>
                )
              })
            : null}
        </div>
      </header>

      {props.role === 'member' ? (
        <section style={{ ...sectionStyle(), marginTop: 16, border: '1px solid #fed7aa', background: '#fff7ed' }}>
          <h2 style={{ marginTop: 0, color: '#9a3412' }}>Limited Access</h2>
          <p style={{ marginBottom: 0, color: '#9a3412' }}>
            Member access is read-only in V1. Password update remains available for the currently authenticated user.
          </p>
        </section>
      ) : null}

      <section style={{ ...sectionStyle(), marginTop: 16 }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Agency Settings</h2>
        <form onSubmit={onAgencySave} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>Agency Name</span>
            <input
              type="text"
              value={agencyName}
              onChange={(event) => setAgencyName(event.target.value)}
              style={fieldStyle()}
              disabled={agencyStatus === 'saving' || !props.canEditAgencySettings}
              maxLength={160}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>Slug</span>
            <input
              type="text"
              value={agencySlug}
              onChange={(event) => setAgencySlug(event.target.value.toLowerCase())}
              style={fieldStyle()}
              disabled={agencyStatus === 'saving' || !props.canEditAgencySlug}
              maxLength={120}
              required
            />
            {!props.canEditAgencySlug ? (
              <span style={{ fontSize: 12, color: '#475569' }}>
                Slug changes are restricted by your role permissions.
              </span>
            ) : null}
          </label>

          <div>
            <button type="submit" style={buttonStyle()} disabled={agencyStatus === 'saving' || !props.canEditAgencySettings}>
              {agencyStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {statusMessage(agencyStatus, agencyError, agencySuccess) ? (
            <p style={{ margin: 0, color: agencyStatus === 'error' ? '#991b1b' : '#166534', fontSize: 13 }}>
              {statusMessage(agencyStatus, agencyError, agencySuccess)}
            </p>
          ) : null}
        </form>
      </section>

      {props.canEditOwnerProfile ? (
        <section style={{ ...sectionStyle(), marginTop: 16 }}>
          <h2 style={{ marginTop: 0, color: '#0f172a' }}>Owner Profile</h2>
          <form onSubmit={onOwnerSave} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#334155' }}>Owner Name</span>
              <input
                type="text"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                style={fieldStyle()}
                disabled={ownerStatus === 'saving'}
                maxLength={120}
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#334155' }}>Owner Email</span>
              <input type="email" value={props.ownerEmail} style={fieldStyle()} disabled readOnly />
              <span style={{ fontSize: 12, color: '#475569' }}>
                Email is displayed from current authenticated owner account and is read-only in this V1 to avoid unsafe auth-email mutation.
              </span>
            </label>

            <div>
              <button type="submit" style={buttonStyle()} disabled={ownerStatus === 'saving'}>
                {ownerStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {statusMessage(ownerStatus, ownerError, ownerSuccess) ? (
              <p style={{ margin: 0, color: ownerStatus === 'error' ? '#991b1b' : '#166534', fontSize: 13 }}>
                {statusMessage(ownerStatus, ownerError, ownerSuccess)}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <section style={{ ...sectionStyle(), marginTop: 16 }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Security</h2>
        <form onSubmit={onPasswordUpdate} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              style={fieldStyle()}
              disabled={passwordStatus === 'saving' || !props.canChangePassword}
              autoComplete="new-password"
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              style={fieldStyle()}
              disabled={passwordStatus === 'saving' || !props.canChangePassword}
              autoComplete="new-password"
              required
            />
          </label>

          {passwordValidationMessage ? <p style={{ margin: 0, color: '#991b1b', fontSize: 13 }}>{passwordValidationMessage}</p> : null}

          <div>
            <button type="submit" style={buttonStyle()} disabled={passwordStatus === 'saving' || !props.canChangePassword}>
              {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          {statusMessage(passwordStatus, passwordError, passwordSuccess) ? (
            <p style={{ margin: 0, color: passwordStatus === 'error' ? '#991b1b' : '#166534', fontSize: 13 }}>
              {statusMessage(passwordStatus, passwordError, passwordSuccess)}
            </p>
          ) : null}
        </form>
      </section>

      {props.canDeleteAgency ? (
        <section style={{ ...sectionStyle(), marginTop: 16, border: '1px solid #fecaca', background: '#fff5f5' }}>
          <h2 style={{ marginTop: 0, color: '#991b1b' }}>Danger Zone</h2>
          <p style={{ color: '#7f1d1d', fontSize: 13 }}>
            Deleting this agency permanently removes agency data, organizations, memberships, sites, billing records, and agency-scoped runtime/migration records.
          </p>

          <form onSubmit={onDeleteAgency} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#7f1d1d' }}>
                Type agency slug <strong>{props.agencySlug}</strong> to confirm deletion
              </span>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                style={{ ...fieldStyle(), border: '1px solid #fca5a5' }}
                disabled={deleteStatus === 'saving'}
                required
              />
            </label>

            <div>
              <button type="submit" style={buttonStyle(true)} disabled={deleteStatus === 'saving' || !isDeleteConfirmed}>
                {deleteStatus === 'saving' ? 'Deleting...' : 'Delete Agency'}
              </button>
            </div>

            {!isDeleteConfirmed ? (
              <p style={{ margin: 0, color: '#7f1d1d', fontSize: 12 }}>
                Delete button remains disabled until confirmation exactly matches the current slug.
              </p>
            ) : null}

            {deleteError ? <p style={{ margin: 0, color: '#991b1b', fontSize: 13 }}>{deleteError}</p> : null}
          </form>
        </section>
      ) : null}
    </main>
  )
}
