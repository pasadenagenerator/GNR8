'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

type Project = {
  id: string
  orgId: string
  name: string
  slug: string
  createdAt: string
  deletedAt: string | null
}

type OrgDetail = {
  org: {
    id: string
    name: string
    createdAt: string
    trialStartedAt?: string | null
    trialEndsAt?: string | null
  }
  projects: Project[]
  deletedProjects: Project[]
}

type Billing = {
  org: {
    id: string
    name: string
    slug: string
    createdAt: string
    updatedAt: string | null
  }
  subscription: null | {
    id: string
    orgId: string
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    status: string | null
    planKey: string | null
    currentPeriodEnd: string | null
    createdAt: string | null
    updatedAt: string | null
  }
}

type OrgUser = {
  userId: string
  email: string | null
  role: string
  membershipCreatedAt: string
  userCreatedAt: string | null
  lastSignInAt: string | null
}

type LoadState<T> =
  | { ok: true; data: T }
  | { ok?: false; error: string }
  | null

function safeIsoToDate(input: string | null | undefined): Date | null {
  if (!input) return null
  const d = new Date(String(input))
  return Number.isNaN(d.getTime()) ? null : d
}

function daysBetween(now: Date, future: Date): number {
  const ms = future.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

async function safeReadJson(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

export default function SuperadminOrgPage() {
  const router = useRouter()
  const params = useParams<{ orgId: string }>()
  const orgId = String(params?.orgId ?? '').trim()

  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [busy, setBusy] = useState(false)

  const [detail, setDetail] = useState<LoadState<OrgDetail>>(null)
  const [billing, setBilling] = useState<LoadState<Billing>>(null)

  const [usersBusy, setUsersBusy] = useState(false)
  const [users, setUsers] = useState<LoadState<{ users: OrgUser[] }>>(null)

  const [result, setResult] = useState<any>(null)

  // trial action busy state (da ne blokira celotnega UI po nepotrebnem)
  const [trialBusy, setTrialBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        router.push('/login')
        router.refresh()
        return
      }
      await loadAll()
      await loadUsers()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function loadAll() {
    if (!orgId) return
    setBusy(true)
    setResult(null)

    try {
      const [dRes, bRes] = await Promise.all([
        fetch(`/api/superadmin/orgs/${orgId}`, { method: 'GET' }),
        fetch(`/api/superadmin/orgs/${orgId}/billing`, { method: 'GET' }),
      ])

      const dJson = await safeReadJson(dRes)
      const bJson = await safeReadJson(bRes)

      if (!dRes.ok) {
        setDetail({
          ok: false,
          error: dJson?.error ?? 'Failed to load org detail',
        })
      } else {
        setDetail({ ok: true, data: dJson })
      }

      if (!bRes.ok) {
        setBilling({
          ok: false,
          error: bJson?.error ?? 'Failed to load billing',
        })
      } else {
        setBilling({ ok: true, data: bJson })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setDetail({ ok: false, error: msg })
      setBilling({ ok: false, error: msg })
    } finally {
      setBusy(false)
    }
  }

  async function loadUsers() {
    if (!orgId) return
    setUsersBusy(true)
    setUsers(null)

    try {
      const res = await fetch(`/api/superadmin/orgs/${orgId}/users`, {
        method: 'GET',
      })
      const json = await safeReadJson(res)

      if (!res.ok) {
        setUsers({ ok: false, error: json?.error ?? 'Failed to load users' })
      } else {
        setUsers({ ok: true, data: { users: json.users ?? [] } })
      }
    } catch (e) {
      setUsers({
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to load users',
      })
    } finally {
      setUsersBusy(false)
    }
  }

  async function softDeleteProject(projectId: string) {
    const confirmed = window.confirm('Delete this project? (soft delete)')
    if (!confirmed) return

    setBusy(true)
    setResult(null)
    try {
      const res = await fetch(`/api/orgs/${orgId}/projects/${projectId}`, {
        method: 'DELETE',
      })
      const json = await safeReadJson(res)
      if (!res.ok) setResult({ ok: false, error: json?.error ?? 'Delete failed' })
      else setResult({ ok: true, project: json.project })
      await loadAll()
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Delete failed',
      })
    } finally {
      setBusy(false)
    }
  }

  async function restoreProject(projectId: string) {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch(`/api/orgs/${orgId}/projects/${projectId}/restore`, {
        method: 'POST',
      })
      const json = await safeReadJson(res)
      if (!res.ok) setResult({ ok: false, error: json?.error ?? 'Restore failed' })
      else setResult({ ok: true, project: json.project })
      await loadAll()
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Restore failed',
      })
    } finally {
      setBusy(false)
    }
  }

  /**
   * Trial actions
   * Endpoint: PUT /api/superadmin/orgs/[orgId]/trial
   *
   * Body: { action: "start" | "extend" | "end", days?: number }
   */
  async function updateTrial(action: 'start' | 'extend' | 'end', days?: number) {
    if (!orgId) return

    if (action === 'start') {
      const ok = window.confirm(
        `Start/reset trial to ${days ?? 14} days from now?\n\nThis overwrites trialStartedAt/trialEndsAt.`,
      )
      if (!ok) return
    }

    if (action === 'end') {
      const ok = window.confirm(
        'End trial immediately?\n\nThis sets trialEndsAt to now.',
      )
      if (!ok) return
    }

    setTrialBusy(true)
    setResult(null)

    try {
      const res = await fetch(`/api/superadmin/orgs/${orgId}/trial`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, days }),
      })

      const json = await safeReadJson(res)

      if (!res.ok) {
        setResult({
          ok: false,
          error: json?.error ?? `Trial update failed (HTTP ${res.status})`,
        })
      } else {
        setResult({ ok: true, trial: json })
      }

      await loadAll()
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Trial update failed',
      })
    } finally {
      setTrialBusy(false)
    }
  }

  const orgName = detail && 'ok' in detail && detail.ok ? detail.data.org.name : '—'

  const trialStartedAt =
    detail && 'ok' in detail && detail.ok
      ? (detail.data.org.trialStartedAt ?? null)
      : null

  const trialEndsAt =
    detail && 'ok' in detail && detail.ok ? (detail.data.org.trialEndsAt ?? null) : null

  const activeProjects = detail && 'ok' in detail && detail.ok ? detail.data.projects : []

  const deletedProjects =
    detail && 'ok' in detail && detail.ok ? detail.data.deletedProjects : []

  const orgUsers = users && 'ok' in users && users.ok ? users.data.users : []

  const now = new Date()
  const endsDate = safeIsoToDate(trialEndsAt)
  const startedDate = safeIsoToDate(trialStartedAt)

  const trialStatus: 'ACTIVE' | 'ENDED' | 'NOT_STARTED' = (() => {
    if (!startedDate && !endsDate) return 'NOT_STARTED'
    if (endsDate && endsDate.getTime() >= now.getTime()) return 'ACTIVE'
    return 'ENDED'
  })()

  const endsInDays =
    trialStatus === 'ACTIVE' && endsDate ? daysBetween(now, endsDate) : null

  const allBusy = busy || usersBusy || trialBusy

  return (
    <main style={{ maxWidth: 980, margin: '48px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Org: {orgName}</h1>
          <div style={{ fontSize: 13, color: '#666', wordBreak: 'break-all' }}>
            <strong>orgId:</strong> {orgId}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/superadmin/orgs"
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              textDecoration: 'none',
            }}
          >
            Back
          </Link>

          <button
            disabled={allBusy}
            onClick={async () => {
              await loadAll()
              await loadUsers()
            }}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            {allBusy ? 'Loading…' : 'Reload'}
          </button>
        </div>
      </div>

      {/* === TRIAL === */}
      <section style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Trial</h2>

            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 999,
                border: '1px solid #ddd',
                background: '#fafafa',
              }}
              title={
                trialStatus === 'ACTIVE'
                  ? 'Trial is currently active'
                  : trialStatus === 'ENDED'
                    ? 'Trial ended (trialEndsAt is in the past)'
                    : 'Trial not started'
              }
            >
              {trialStatus}
              {endsInDays !== null ? ` • ends in ${endsInDays}d` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              disabled={trialBusy}
              onClick={() => updateTrial('start', 14)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                cursor: trialBusy ? 'not-allowed' : 'pointer',
              }}
              title="Start (or reset) trial to 14 days from now"
            >
              {trialBusy ? 'Working…' : 'Start 14d'}
            </button>

            <button
              disabled={trialBusy}
              onClick={() => updateTrial('extend', 7)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                cursor: trialBusy ? 'not-allowed' : 'pointer',
              }}
              title="Extend trial by 7 days"
            >
              {trialBusy ? 'Working…' : 'Extend +7d'}
            </button>

            <button
              disabled={trialBusy}
              onClick={() => updateTrial('extend', 14)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                cursor: trialBusy ? 'not-allowed' : 'pointer',
              }}
              title="Extend trial by 14 days"
            >
              {trialBusy ? 'Working…' : 'Extend +14d'}
            </button>

            <button
              disabled={trialBusy}
              onClick={() => updateTrial('extend', 30)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                cursor: trialBusy ? 'not-allowed' : 'pointer',
              }}
              title="Extend trial by 30 days"
            >
              {trialBusy ? 'Working…' : 'Extend +30d'}
            </button>

            <button
              disabled={trialBusy}
              onClick={() => updateTrial('end')}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                cursor: trialBusy ? 'not-allowed' : 'pointer',
              }}
              title="End trial immediately (set trial_ends_at to now)"
            >
              {trialBusy ? 'Working…' : 'End now'}
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 14 }}>
            <div>
              <strong>trialStartedAt:</strong> {trialStartedAt ?? '—'}
            </div>
            <div>
              <strong>trialEndsAt:</strong> {trialEndsAt ?? '—'}
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
            Trial je fallback entitlement (če ni plačljivih entitlements). Limits se še vedno
            enforce-ajo (npr. 1 aktiven projekt, če ni unlimited).
          </div>
        </div>
      </section>

      {/* === BILLING === */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Billing</h2>

        {billing && 'ok' in billing && !billing.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {billing.error}
          </div>
        )}

        {billing && 'ok' in billing && billing.ok ? (
          <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, color: '#666' }}>
              <div>
                <strong>org slug:</strong> {billing.data.org.slug}
              </div>
              <div>
                <strong>updated:</strong> {billing.data.org.updatedAt ?? '—'}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              {billing.data.subscription ? (
                <div style={{ fontSize: 14 }}>
                  <div>
                    <strong>status:</strong> {billing.data.subscription.status ?? '—'}
                  </div>
                  <div>
                    <strong>plan:</strong> {billing.data.subscription.planKey ?? '—'}
                  </div>
                  <div>
                    <strong>period end:</strong>{' '}
                    {billing.data.subscription.currentPeriodEnd ?? '—'}
                  </div>
                  <div style={{ wordBreak: 'break-all' }}>
                    <strong>stripe customer:</strong>{' '}
                    {billing.data.subscription.stripeCustomerId ?? '—'}
                  </div>
                  <div style={{ wordBreak: 'break-all' }}>
                    <strong>stripe subscription:</strong>{' '}
                    {billing.data.subscription.stripeSubscriptionId ?? '—'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: '#666' }}>No active subscription row.</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#666' }}>{busy ? 'Loading…' : '—'}</div>
        )}
      </section>

      {/* === USERS === */}
      <section style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>Users</h2>
          <button
            disabled={usersBusy}
            onClick={loadUsers}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          >
            {usersBusy ? 'Loading…' : 'Reload users'}
          </button>
        </div>

        {users && 'ok' in users && !users.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {users.error}
          </div>
        )}

        {orgUsers.length === 0 ? (
          <div style={{ fontSize: 14, color: '#666' }}>
            {usersBusy ? 'Loading…' : 'No users in org.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {orgUsers.map((u) => (
              <div
                key={u.userId}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>
                    {u.email ?? '— (email hidden/unavailable)'}
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    <div>
                      <strong>role:</strong> {u.role}
                    </div>
                    <div style={{ wordBreak: 'break-all' }}>
                      <strong>userId:</strong> {u.userId}
                    </div>
                    <div>
                      <strong>membership created:</strong> {u.membershipCreatedAt}
                    </div>
                    {u.userCreatedAt ? (
                      <div>
                        <strong>user created:</strong> {u.userCreatedAt}
                      </div>
                    ) : null}
                    {u.lastSignInAt ? (
                      <div>
                        <strong>last sign-in:</strong> {u.lastSignInAt}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === ACTIVE PROJECTS === */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Active projects</h2>

        {detail && 'ok' in detail && !detail.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {detail.error}
          </div>
        )}

        {activeProjects.length === 0 ? (
          <div style={{ fontSize: 14, color: '#666' }}>No active projects.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {activeProjects.map((p) => (
              <div
                key={p.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    <div>
                      <strong>slug:</strong> {p.slug}
                    </div>
                    <div style={{ wordBreak: 'break-all' }}>
                      <strong>id:</strong> {p.id}
                    </div>
                    <div>
                      <strong>created:</strong> {p.createdAt}
                    </div>
                  </div>
                </div>

                <button
                  disabled={busy}
                  onClick={() => softDeleteProject(p.id)}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === DELETED PROJECTS === */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Deleted projects</h2>

        {deletedProjects.length === 0 ? (
          <div style={{ fontSize: 14, color: '#666' }}>No deleted projects.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {deletedProjects.map((p) => (
              <div
                key={p.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    <div>
                      <strong>slug:</strong> {p.slug}
                    </div>
                    <div style={{ wordBreak: 'break-all' }}>
                      <strong>id:</strong> {p.id}
                    </div>
                    <div>
                      <strong>deleted:</strong> {p.deletedAt ?? '—'}
                    </div>
                  </div>
                </div>

                <button
                  disabled={busy}
                  onClick={() => restoreProject(p.id)}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === RESULT === */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Result</h2>
        <pre
          style={{
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 12,
            overflow: 'auto',
          }}
        >
          {result ? JSON.stringify(result, null, 2) : '—'}
        </pre>
      </section>
    </main>
  )
}