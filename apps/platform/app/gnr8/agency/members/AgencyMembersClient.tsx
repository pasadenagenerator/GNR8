'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

type MembershipOption = {
  agency_id: string
  agency_name: string | null
  role: 'owner' | 'admin' | 'member' | 'superadmin'
}

type AgencyMemberRole = 'owner' | 'admin' | 'member'

type AgencyMemberStatus = 'active' | 'invited'

type AgencyMember = {
  membership_id: string
  user_id: string
  role: AgencyMemberRole
  email: string | null
  name: string | null
  status: AgencyMemberStatus
  invited_at: string | null
  last_sign_in_at: string | null
}

type Props = {
  agencyId: string
  agencyName: string
  requestedAgencyId: string | null
  memberships: MembershipOption[]
  role: 'owner' | 'admin' | 'member' | 'superadmin'
  initialMembers: AgencyMember[]
  canInviteUsers: boolean
  canEditMemberRole: boolean
  canRemoveMember: boolean
  actorMode?: 'membership' | 'admin_view'
  adminBackToPath?: string
  adminSettingsPath?: string
  hideMembershipSwitcher?: boolean
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

function actionButtonStyle(destructive = false): React.CSSProperties {
  if (destructive) {
    return {
      height: 32,
      padding: '0 10px',
      borderRadius: 8,
      border: '1px solid #7f1d1d',
      background: '#991b1b',
      color: '#fff',
      cursor: 'pointer',
      fontSize: 12,
    }
  }

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

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function statusBadgeColor(status: AgencyMemberStatus): { background: string; color: string; border: string } {
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

function roleSortRank(role: AgencyMemberRole): number {
  if (role === 'owner') return 3
  if (role === 'admin') return 2
  return 1
}

export default function AgencyMembersClient(props: Props) {
  const [members, setMembers] = useState<AgencyMember[]>(props.initialMembers)
  const isAdminView = props.actorMode === 'admin_view'

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AgencyMemberRole>('member')

  const [inviteStatus, setInviteStatus] = useState<FormStatus>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [tableError, setTableError] = useState<string | null>(null)

  const currentAgencyDashboardPath = props.requestedAgencyId
    ? `/gnr8/agency?agency=${encodeURIComponent(props.requestedAgencyId)}`
    : `/gnr8/agency?agency=${encodeURIComponent(props.agencyId)}`

  const currentAgencySettingsPath = props.requestedAgencyId
    ? `/gnr8/agency/settings?agency=${encodeURIComponent(props.requestedAgencyId)}`
    : `/gnr8/agency/settings?agency=${encodeURIComponent(props.agencyId)}`

  const backToPath = isAdminView ? props.adminBackToPath || currentAgencyDashboardPath : currentAgencyDashboardPath
  const settingsPath = isAdminView ? props.adminSettingsPath || currentAgencySettingsPath : currentAgencySettingsPath

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (roleSortRank(b.role) !== roleSortRank(a.role)) {
        return roleSortRank(b.role) - roleSortRank(a.role)
      }
      const aName = normalizeText(a.name || a.email).toLowerCase()
      const bName = normalizeText(b.name || b.email).toLowerCase()
      if (aName && bName && aName !== bName) return aName.localeCompare(bName)
      return a.membership_id.localeCompare(b.membership_id)
    })
  }, [members])

  async function fetchMembers() {
    const response = await fetch(`/api/gnr8/agency/members?agency=${encodeURIComponent(props.agencyId)}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    const body = (await response.json().catch(() => null)) as
      | {
          ok?: unknown
          error?: unknown
          members?: AgencyMember[]
        }
      | null

    if (!response.ok || body?.ok !== true || !Array.isArray(body.members)) {
      throw new Error(body?.error ? String(body.error) : 'Failed to refresh members.')
    }

    setMembers(body.members)
  }

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)

    if (!props.canInviteUsers) {
      setInviteError('Your role is read-only for invites.')
      return
    }

    const email = normalizeText(inviteEmail)
    if (!email) {
      setInviteError('Email is required.')
      return
    }

    setInviteStatus('saving')

    const response = await fetch('/api/gnr8/agency/members', {
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

    try {
      await fetchMembers()
    } catch (error) {
      setTableError(error instanceof Error ? error.message : 'Failed to refresh members after invite.')
    }
  }

  async function onRoleChange(member: AgencyMember, nextRole: 'admin' | 'member') {
    setTableError(null)

    if (!props.canEditMemberRole) {
      setTableError('Your role is read-only for member role updates.')
      return
    }

    const response = await fetch(`/api/gnr8/agency/members/${encodeURIComponent(member.membership_id)}`, {
      method: 'PATCH',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        agencyId: props.agencyId,
        role: nextRole,
      }),
    })

    const body = (await response.json().catch(() => null)) as
      | {
          ok?: unknown
          error?: unknown
        }
      | null

    if (!response.ok || body?.ok !== true) {
      setTableError(body?.error ? String(body.error) : 'Failed to update member role.')
      return
    }

    setMembers((current) =>
      current.map((currentMember) =>
        currentMember.membership_id === member.membership_id ? { ...currentMember, role: nextRole } : currentMember,
      ),
    )
  }

  async function onRemoveMember(member: AgencyMember) {
    setTableError(null)

    if (!props.canRemoveMember) {
      setTableError('Your role is read-only for member removal.')
      return
    }

    const confirmation = window.confirm(
      `Remove ${member.email || member.name || member.membership_id} from ${props.agencyName}? This cannot be undone from this screen.`,
    )
    if (!confirmation) {
      return
    }

    const response = await fetch(`/api/gnr8/agency/members/${encodeURIComponent(member.membership_id)}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        agencyId: props.agencyId,
      }),
    })

    const body = (await response.json().catch(() => null)) as
      | {
          ok?: unknown
          error?: unknown
        }
      | null

    if (!response.ok || body?.ok !== true) {
      setTableError(body?.error ? String(body.error) : 'Failed to remove member.')
      return
    }

    setMembers((current) => current.filter((currentMember) => currentMember.membership_id !== member.membership_id))
  }

  return (
    <main
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        padding: 24,
        background: 'linear-gradient(180deg, #f4f8fc 0%, #ffffff 62%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        minHeight: '100vh',
      }}
    >
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>{isAdminView ? 'Agency Team' : 'Agency Members'}</h1>
        <p style={{ margin: 0, color: '#334155' }}>
          {isAdminView
            ? 'Superadmin support mode for team membership actions in explicit admin-view scope.'
            : 'Invite agency users and manage basic team membership roles for the active agency scope.'}
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
            <strong>{isAdminView ? 'Target Agency:' : 'Current Agency:'}</strong> {props.agencyName}
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
          <Link
            href={settingsPath}
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
            {isAdminView ? 'Agency Settings (Admin View)' : 'Open Settings'}
          </Link>
        </div>

        {!props.hideMembershipSwitcher && props.memberships.length > 1 ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {props.memberships.map((membership) => {
              const isActive = membership.agency_id === props.agencyId
              return (
                <Link
                  key={membership.agency_id}
                  href={`/gnr8/agency/members?agency=${encodeURIComponent(membership.agency_id)}`}
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

        {!props.canInviteUsers ? (
          <p style={{ marginTop: 0, color: '#92400e' }}>
            Invite actions are disabled for your current role. Owners can send invites in V1.
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
              placeholder='teammate@example.com'
              required
              disabled={!props.canInviteUsers || inviteStatus === 'saving'}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
            Role
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as AgencyMemberRole)}
              style={fieldStyle()}
              disabled={!props.canInviteUsers || inviteStatus === 'saving'}
            >
              <option value='member'>member</option>
              <option value='admin'>admin</option>
              <option value='owner'>owner</option>
            </select>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type='submit'
              disabled={!props.canInviteUsers || inviteStatus === 'saving'}
              style={{
                ...actionButtonStyle(false),
                opacity: !props.canInviteUsers || inviteStatus === 'saving' ? 0.6 : 1,
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
        <h2 style={{ marginTop: 0, color: '#0f172a' }}>Current Members</h2>
        <p style={{ marginTop: 0, fontSize: 12, color: '#475569' }}>
          Status is inferred from auth state: users with confirmed/sign-in activity are shown as active; others appear as
          invited.
        </p>
        {tableError ? (
          <div style={{ marginBottom: 12, border: '1px solid #fecaca', background: '#fff5f5', borderRadius: 8, padding: 10 }}>
            <span style={{ fontSize: 12, color: '#7f1d1d' }}>{tableError}</span>
          </div>
        ) : null}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Name</th>
                <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Email</th>
                <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Role</th>
                <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Status</th>
                <th style={{ padding: '10px 8px', fontSize: 12, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => {
                const badge = statusBadgeColor(member.status)
                const canRoleEditThisMember = props.canEditMemberRole && member.role !== 'owner'
                const canRemoveThisMember = props.canRemoveMember && member.role !== 'owner'

                return (
                  <tr key={member.membership_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 8px', fontSize: 13, color: '#0f172a' }}>{member.name || 'Unknown user'}</td>
                    <td style={{ padding: '10px 8px', fontSize: 13, color: '#334155' }}>{member.email || 'Email unavailable'}</td>
                    <td style={{ padding: '10px 8px', fontSize: 13, color: '#334155' }}>
                      {canRoleEditThisMember ? (
                        <select
                          value={member.role}
                          onChange={(event) => onRoleChange(member, event.target.value as 'admin' | 'member')}
                          style={{
                            ...fieldStyle(),
                            padding: '6px 8px',
                            fontSize: 12,
                            maxWidth: 120,
                          }}
                        >
                          <option value='admin'>admin</option>
                          <option value='member'>member</option>
                        </select>
                      ) : (
                        <span>{member.role}</span>
                      )}
                    </td>
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
                        {member.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {canRemoveThisMember ? (
                        <button type='button' style={actionButtonStyle(true)} onClick={() => onRemoveMember(member)}>
                          Remove
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#64748b' }}>{member.role === 'owner' ? 'Protected' : 'Read-only'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
