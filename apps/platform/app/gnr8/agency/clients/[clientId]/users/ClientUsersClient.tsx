'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'

type AgencyMembershipOption = {
  agency_id: string
  agency_name: string | null
  role: 'owner' | 'admin' | 'member' | 'superadmin'
}

type ClientMembershipRole = 'owner' | 'member'
type ClientUserStatus = 'active' | 'pending'

type ClientUserRow = {
  row_id: string
  user_id: string | null
  invite_id: string | null
  role: ClientMembershipRole
  email: string | null
  name: string | null
  status: ClientUserStatus
  invited_at: string | null
  last_sign_in_at: string | null
}

type Props = {
  agencyId: string
  agencyName: string
  clientId: string
  clientName: string
  requestedAgencyId: string | null
  memberships: AgencyMembershipOption[]
  role: 'owner' | 'admin' | 'member' | 'superadmin'
  canInviteClientUsers: boolean
  actorMode?: 'membership' | 'admin_view'
  adminBackToPath?: string
  hideMembershipSwitcher?: boolean
  embeddedInClientContext?: boolean
}

type FormStatus = 'idle' | 'saving' | 'success' | 'error'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
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
    height: 32,
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid #0f172a',
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
  }
}

function roleSortRank(role: ClientMembershipRole): number {
  if (role === 'owner') return 2
  return 1
}

function statusBadgeColor(status: ClientUserStatus): { background: string; color: string; border: string } {
  if (status === 'active') {
    return {
      background: '#ecfdf3',
      color: '#166534',
      border: '#86efac',
    }
  }

  return {
    background: '#fffbeb',
    color: '#92400e',
    border: '#fcd34d',
  }
}

export default function ClientUsersClient(props: Props) {
  const isAdminView = props.actorMode === 'admin_view'
  const [users, setUsers] = useState<ClientUserRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [tableError, setTableError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ClientMembershipRole>('member')
  const [inviteStatus, setInviteStatus] = useState<FormStatus>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const dashboardPath = props.requestedAgencyId
    ? `/gnr8/agency?agency=${encodeURIComponent(props.requestedAgencyId)}`
    : `/gnr8/agency?agency=${encodeURIComponent(props.agencyId)}`
  const backToPath = isAdminView ? props.adminBackToPath || dashboardPath : dashboardPath

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      if (roleSortRank(b.role) !== roleSortRank(a.role)) {
        return roleSortRank(b.role) - roleSortRank(a.role)
      }
      const aName = normalizeText(a.name || a.email).toLowerCase()
      const bName = normalizeText(b.name || b.email).toLowerCase()
      if (aName && bName && aName !== bName) return aName.localeCompare(bName)
      return a.row_id.localeCompare(b.row_id)
    })
  }, [users])

  async function fetchUsers() {
    setLoadingUsers(true)
    setTableError(null)
    try {
      const response = await fetch(
        `/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users?agency=${encodeURIComponent(props.agencyId)}`,
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        },
      )

      const body = (await response.json().catch(() => null)) as
        | {
            ok?: unknown
            error?: unknown
            users?: ClientUserRow[]
          }
        | null

      if (!response.ok || body?.ok !== true || !Array.isArray(body.users)) {
        throw new Error(body?.error ? String(body.error) : 'Failed to load client users.')
      }

      setUsers(body.users)
    } catch (error) {
      setTableError(error instanceof Error ? error.message : 'Failed to load client users.')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.agencyId, props.clientId])

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)

    if (!props.canInviteClientUsers) {
      setInviteError('Your role is read-only for client invites.')
      return
    }

    const email = normalizeText(inviteEmail)
    if (!email) {
      setInviteError('Email is required.')
      return
    }

    setInviteStatus('saving')

    const response = await fetch(`/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users/invite`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        agencyId: props.agencyId,
        email,
        role: inviteRole,
      }),
    })

    const body = (await response.json().catch(() => null)) as
      | {
          ok?: unknown
          error?: unknown
        }
      | null

    if (!response.ok || body?.ok !== true) {
      setInviteStatus('error')
      setInviteError(body?.error ? String(body.error) : 'Failed to send invite.')
      return
    }

    setInviteStatus('success')
    setInviteSuccess(`Invite sent to ${email}.`)
    setInviteEmail('')
    await fetchUsers()
  }

  const containerStyle: React.CSSProperties = props.embeddedInClientContext
    ? { display: 'grid', gap: 0 }
    : {
        maxWidth: 1040,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }

  return (
    <main style={containerStyle}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>{isAdminView ? 'Client Users' : 'Client User Access'}</h1>
        <p style={{ margin: 0, color: '#334155' }}>
          {isAdminView
            ? 'Superadmin support mode for client-user access in explicit admin-view scope.'
            : 'Invite and manage users for one client scope. Client users are separate from agency memberships.'}
        </p>
      </header>

      <section style={{ ...sectionStyle(), marginTop: 14 }}>
        {isAdminView ? (
          <div
            style={{
              display: 'inline-flex',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: '#e0f2fe',
              color: '#0c4a6e',
              border: '1px solid #7dd3fc',
              marginBottom: 8,
            }}
          >
            Admin View
          </div>
        ) : null}
        <div style={{ display: 'grid', gap: 4, fontSize: 13, color: '#334155' }}>
          <div>
            <strong>Client:</strong> {props.clientName}
          </div>
          <div>
            <strong>Client ID:</strong> {props.clientId}
          </div>
          <div>
            <strong>{isAdminView ? 'Target Agency:' : 'Parent Agency:'}</strong> {props.agencyName}
          </div>
          <div>
            <strong>Agency ID:</strong> {props.agencyId}
          </div>
          <div>
            <strong>Your Role:</strong> {props.role}
          </div>
          {isAdminView ? (
            <div>
              <strong>Actor Mode:</strong> admin_view
            </div>
          ) : null}
        </div>

        {!props.embeddedInClientContext || isAdminView ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link
              href={backToPath}
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
              {isAdminView ? 'Back to Agency Dashboard' : 'Back to Dashboard'}
            </Link>
          </div>
        ) : null}

        {!props.embeddedInClientContext && !props.hideMembershipSwitcher && props.memberships.length > 1 ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {props.memberships.map((membership) => {
              const isActive = membership.agency_id === props.agencyId
              return (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/users?agency=${encodeURIComponent(membership.agency_id)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: 999,
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
            })}
          </div>
        ) : null}
      </section>

      <section style={{ ...sectionStyle(), marginTop: 14 }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Invite User</h2>
        {!props.canInviteClientUsers ? (
          <p style={{ marginTop: 0, color: '#92400e' }}>
            Invite actions are disabled for your current role. Owner and admin can invite in V1.
          </p>
        ) : null}

        <form onSubmit={onInvite} style={{ display: 'grid', gap: 12, maxWidth: 540 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
            Email
            <input
              type='email'
              inputMode='email'
              autoComplete='email'
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              style={fieldStyle()}
              placeholder='client-user@example.com'
              required
              disabled={!props.canInviteClientUsers || inviteStatus === 'saving'}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
            Access
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as ClientMembershipRole)}
              style={fieldStyle()}
              disabled={!props.canInviteClientUsers || inviteStatus === 'saving'}
            >
              <option value='member'>member</option>
              <option value='owner'>owner</option>
            </select>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type='submit'
              disabled={!props.canInviteClientUsers || inviteStatus === 'saving'}
              style={{
                ...actionButtonStyle(),
                opacity: !props.canInviteClientUsers || inviteStatus === 'saving' ? 0.6 : 1,
              }}
            >
              {inviteStatus === 'saving' ? 'Sending Invite…' : 'Send Invite'}
            </button>
            {inviteError ? <span style={{ fontSize: 12, color: '#b91c1c' }}>{inviteError}</span> : null}
            {inviteSuccess ? <span style={{ fontSize: 12, color: '#166534' }}>{inviteSuccess}</span> : null}
          </div>
        </form>
      </section>

      <section style={{ ...sectionStyle(), marginTop: 14 }}>
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Current Client Users</h2>
        <p style={{ marginTop: 0, fontSize: 12, color: '#475569' }}>
          Status is explicit: `active` rows come from `client_memberships`; `pending` rows come from
          `client_membership_invites`.
        </p>

        {loadingUsers ? <p style={{ marginBottom: 0, color: '#64748b' }}>Loading client users…</p> : null}
        {tableError ? (
          <div style={{ marginBottom: 12, border: '1px solid #fecaca', background: '#fff5f5', borderRadius: 8, padding: 10 }}>
            <span style={{ fontSize: 12, color: '#7f1d1d' }}>{tableError}</span>
          </div>
        ) : null}

        {!loadingUsers && !tableError ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Name</th>
                  <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Email</th>
                  <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Access</th>
                  <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '12px 8px', fontSize: 13, color: '#64748b' }}>
                      No client users found yet.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => {
                    const badge = statusBadgeColor(user.status)
                    return (
                      <tr key={user.row_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 8px', fontSize: 13, color: '#0f172a' }}>{user.name || 'Unknown user'}</td>
                        <td style={{ padding: '10px 8px', fontSize: 13, color: '#334155' }}>{user.email || 'Email unavailable'}</td>
                        <td style={{ padding: '10px 8px', fontSize: 13, color: '#334155' }}>{user.role}</td>
                        <td style={{ padding: '10px 8px', fontSize: 13 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 999,
                              border: `1px solid ${badge.border}`,
                              background: badge.background,
                              color: badge.color,
                              fontSize: 12,
                            }}
                          >
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  )
}
