'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/src/supabase/browser'

type Project = {
  id: string
  orgId: string
  name: string
  slug: string
  createdAt: string
  deletedAt: string | null
}

type ApiResult =
  | { ok: true; project: any }
  | { ok?: false; error: string }
  | null

type ProjectsResult =
  | { ok: true; projects: Project[] }
  | { ok?: false; error: string }
  | null

type OrgStats = {
  orgId: string
  activeProjectsCount: number
  deletedProjectsCount: number
  membersCount: number
  lastActivityAt: string | null
}

type OrgStatsResult =
  | { ok: true; stats: OrgStats }
  | { ok?: false; error: string }
  | null

type ActivityEvent = {
  id: string
  at: string
  actorUserId: string
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string
  metadata: unknown
}

type ActivityResult =
  | { ok: true; events: ActivityEvent[] }
  | { ok?: false; error: string }
  | null

export default function AdminPage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // default test org id
  const [orgId, setOrgId] = useState('f3bf88ca-8a6a-4218-8ad2-21ac1be05488')

  const [name, setName] = useState('Test projekt')
  const [slug, setSlug] = useState('test-projekt')

  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ApiResult>(null)

  const [projectsBusy, setProjectsBusy] = useState(false)
  const [projectsResult, setProjectsResult] = useState<ProjectsResult>(null)

  const [deletedBusy, setDeletedBusy] = useState(false)
  const [deletedResult, setDeletedResult] = useState<ProjectsResult>(null)

  const [statsBusy, setStatsBusy] = useState(false)
  const [statsResult, setStatsResult] = useState<OrgStatsResult>(null)

  const [activityBusy, setActivityBusy] = useState(false)
  const [activityResult, setActivityResult] = useState<ActivityResult>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        router.push('/login')
        router.refresh()
        return
      }
      setUserId(data.user.id)
      setUserEmail(data.user.email ?? null)
    })()
  }, [router, supabase])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function loadProjects(nextOrgId?: string) {
    const effectiveOrgId = (nextOrgId ?? orgId).trim()
    if (!effectiveOrgId) return

    setProjectsBusy(true)
    setProjectsResult(null)

    try {
      const res = await fetch(`/api/orgs/${effectiveOrgId}/projects`, { method: 'GET' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setProjectsResult({
          ok: false,
          error: json?.error ?? 'Failed to load projects',
        })
      } else {
        setProjectsResult({ ok: true, projects: json.projects ?? [] })
      }
    } catch (e) {
      setProjectsResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to load projects',
      })
    } finally {
      setProjectsBusy(false)
    }
  }

  async function loadDeletedProjects(nextOrgId?: string) {
    const effectiveOrgId = (nextOrgId ?? orgId).trim()
    if (!effectiveOrgId) return

    setDeletedBusy(true)
    setDeletedResult(null)

    try {
      const res = await fetch(`/api/orgs/${effectiveOrgId}/projects/deleted`, { method: 'GET' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setDeletedResult({
          ok: false,
          error: json?.error ?? 'Failed to load deleted projects',
        })
      } else {
        setDeletedResult({ ok: true, projects: json.projects ?? [] })
      }
    } catch (e) {
      setDeletedResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to load deleted projects',
      })
    } finally {
      setDeletedBusy(false)
    }
  }

  async function loadStats(nextOrgId?: string) {
    const effectiveOrgId = (nextOrgId ?? orgId).trim()
    if (!effectiveOrgId) return

    setStatsBusy(true)
    setStatsResult(null)

    try {
      const res = await fetch(`/api/orgs/${effectiveOrgId}/stats`, { method: 'GET' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatsResult({ ok: false, error: json?.error ?? 'Failed to load org stats' })
      } else {
        setStatsResult({ ok: true, stats: json.stats })
      }
    } catch (e) {
      setStatsResult({ ok: false, error: e instanceof Error ? e.message : 'Failed to load org stats' })
    } finally {
      setStatsBusy(false)
    }
  }

  async function loadActivity(nextOrgId?: string, limit = 50) {
    const effectiveOrgId = (nextOrgId ?? orgId).trim()
    if (!effectiveOrgId) return

    setActivityBusy(true)
    setActivityResult(null)

    try {
      const res = await fetch(`/api/orgs/${effectiveOrgId}/activity?limit=${limit}`, { method: 'GET' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setActivityResult({ ok: false, error: json?.error ?? 'Failed to load activity' })
      } else {
        setActivityResult({ ok: true, events: json.events ?? [] })
      }
    } catch (e) {
      setActivityResult({ ok: false, error: e instanceof Error ? e.message : 'Failed to load activity' })
    } finally {
      setActivityBusy(false)
    }
  }

  // auto-load everything when orgId changes (debounced-ish)
  useEffect(() => {
    const t = setTimeout(() => {
      void loadProjects(orgId)
      void loadDeletedProjects(orgId)
      void loadStats(orgId)
      void loadActivity(orgId, 50)
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function createProject() {
    setBusy(true)
    setResult(null)

    try {
      const res = await fetch(`/api/orgs/${orgId}/projects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? 'Request failed' })
      } else {
        setResult({ ok: true, project: json.project })
        await loadProjects()
        await loadStats()
        await loadActivity(undefined, 50)
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setBusy(false)
    }
  }

  async function deleteProject(projectId: string) {
    const confirmed = window.confirm('Delete this project? (soft delete)')
    if (!confirmed) return

    setProjectsBusy(true)
    setResult(null)

    try {
      const res = await fetch(`/api/orgs/${orgId}/projects/${projectId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? `Delete failed (HTTP ${res.status})` })
      } else {
        setResult({ ok: true, project: json.project })
        await loadProjects()
        await loadDeletedProjects()
        await loadStats()
        await loadActivity(undefined, 50)
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Delete failed' })
    } finally {
      setProjectsBusy(false)
    }
  }

  async function restoreProject(projectId: string) {
    const confirmed = window.confirm('Restore this project?')
    if (!confirmed) return

    setDeletedBusy(true)
    setResult(null)

    try {
      const res = await fetch(`/api/orgs/${orgId}/projects/${projectId}/restore`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? `Restore failed (HTTP ${res.status})` })
      } else {
        setResult({ ok: true, project: json.project })
        await loadProjects()
        await loadDeletedProjects()
        await loadStats()
        await loadActivity(undefined, 50)
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Restore failed' })
    } finally {
      setDeletedBusy(false)
    }
  }

  const activeProjects =
    projectsResult && 'ok' in projectsResult && projectsResult.ok ? projectsResult.projects : []

  const deletedProjects =
    deletedResult && 'ok' in deletedResult && deletedResult.ok ? deletedResult.projects : []

  const stats =
    statsResult && 'ok' in statsResult && statsResult.ok ? statsResult.stats : null

  const events =
    activityResult && 'ok' in activityResult && activityResult.ok ? activityResult.events : []

  return (
    <main style={{ maxWidth: 900, margin: '48px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Admin (test)</h1>
        <button onClick={logout} style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}>
          Logout
        </button>
      </div>

      <section style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: '#444' }}>
          <div>
            <strong>User:</strong> {userEmail ?? '—'}
          </div>
          <div>
            <strong>User ID:</strong> {userId ?? '—'}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Org ID</span>
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            disabled={projectsBusy}
            onClick={() => loadProjects()}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              cursor: projectsBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {projectsBusy ? 'Loading…' : 'Reload active'}
          </button>

          <button
            disabled={deletedBusy}
            onClick={() => loadDeletedProjects()}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              cursor: deletedBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {deletedBusy ? 'Loading…' : 'Reload deleted'}
          </button>

          <button
            disabled={statsBusy}
            onClick={() => loadStats()}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              cursor: statsBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {statsBusy ? 'Loading…' : 'Reload stats'}
          </button>

          <button
            disabled={activityBusy}
            onClick={() => loadActivity(undefined, 50)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              cursor: activityBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {activityBusy ? 'Loading…' : 'Reload activity'}
          </button>

          <span style={{ fontSize: 13, color: '#666' }}>
            {projectsBusy
              ? 'Loading…'
              : projectsResult && 'ok' in projectsResult && projectsResult.ok
                ? `${activeProjects.length} active`
                : '—'}
            {' · '}
            {deletedBusy
              ? 'Loading…'
              : deletedResult && 'ok' in deletedResult && deletedResult.ok
                ? `${deletedProjects.length} deleted`
                : '—'}
          </span>
        </div>
      </section>

      {/* Org stats */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Org stats</h2>

        {statsResult && 'ok' in statsResult && !statsResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {statsResult.error}
          </div>
        )}

        {!stats ? (
          <div style={{ fontSize: 14, color: '#666' }}>
            {statsBusy ? 'Loading…' : 'No stats.'}
          </div>
        ) : (
          <div
            style={{
              border: '1px solid #eee',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              display: 'grid',
              gap: 6,
            }}
          >
            <div>
              <strong>orgId:</strong> {stats.orgId}
            </div>
            <div>
              <strong>members:</strong> {stats.membersCount}
            </div>
            <div>
              <strong>active projects:</strong> {stats.activeProjectsCount}
            </div>
            <div>
              <strong>deleted projects:</strong> {stats.deletedProjectsCount}
            </div>
            <div>
              <strong>last activity:</strong> {stats.lastActivityAt ?? '—'}
            </div>
          </div>
        )}
      </section>

      {/* Create project */}
      <section style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 0 }}>Create project</h2>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Project name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Project slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <button
          disabled={busy}
          onClick={createProject}
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Creating…' : 'Create project'}
        </button>
      </section>

      {/* Active projects */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Active projects</h2>

        {projectsResult && 'ok' in projectsResult && !projectsResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {projectsResult.error}
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
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
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
                  onClick={() => deleteProject(p.id)}
                  disabled={projectsBusy}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    cursor: projectsBusy ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Deleted projects */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Deleted projects</h2>

        {deletedResult && 'ok' in deletedResult && !deletedResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {deletedResult.error}
          </div>
        )}

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
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
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
                  onClick={() => restoreProject(p.id)}
                  disabled={deletedBusy}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    cursor: deletedBusy ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Org activity */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Org activity</h2>

        {activityResult && 'ok' in activityResult && !activityResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {activityResult.error}
          </div>
        )}

        {events.length === 0 ? (
          <div style={{ fontSize: 14, color: '#666' }}>
            {activityBusy ? 'Loading…' : 'No activity yet.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 10,
                  padding: 12,
                  display: 'grid',
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 600 }}>
                    {ev.action} · {ev.entityType}
                  </div>
                  <div style={{ color: '#666' }}>{ev.at}</div>
                </div>

                <div style={{ color: '#666' }}>
                  <strong>actor:</strong> {ev.actorEmail ?? ev.actorUserId}
                </div>

                <div style={{ color: '#666', wordBreak: 'break-all' }}>
                  <strong>entityId:</strong> {ev.entityId}
                </div>

                <details>
                  <summary style={{ cursor: 'pointer' }}>metadata</summary>
                  <pre
                    style={{
                      background: '#fafafa',
                      border: '1px solid #eee',
                      borderRadius: 8,
                      padding: 10,
                      overflow: 'auto',
                      marginTop: 8,
                    }}
                  >
                    {JSON.stringify(ev.metadata ?? {}, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Result */}
      <section>
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