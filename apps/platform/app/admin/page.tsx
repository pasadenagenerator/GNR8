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
  activeProjects: number
  deletedProjects: number
  // allow extra fields from your endpoint without typing fights
  [k: string]: any
}

type OrgStatsResult =
  | { ok: true; stats: OrgStats }
  | { ok?: false; error: string }
  | null

type AuditEvent = {
  id: string
  orgId: string
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  metadata: any
  createdAt: string
}

type ActivityResult =
  | { ok: true; events: AuditEvent[]; nextCursor: string | null }
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

  // Active projects
  const [projectsBusy, setProjectsBusy] = useState(false)
  const [projectsResult, setProjectsResult] = useState<ProjectsResult>(null)

  // Deleted projects
  const [deletedBusy, setDeletedBusy] = useState(false)
  const [deletedResult, setDeletedResult] = useState<ProjectsResult>(null)

  // Org stats
  const [statsBusy, setStatsBusy] = useState(false)
  const [statsResult, setStatsResult] = useState<OrgStatsResult>(null)

  // Activity (audit log)
  const [activityBusy, setActivityBusy] = useState(false)
  const [activityResult, setActivityResult] = useState<ActivityResult>(null)
  const [activityAction, setActivityAction] = useState<string>('') // empty = all
  const [activityEntityType, setActivityEntityType] = useState<string>('') // empty = all
  const [activityEntityId, setActivityEntityId] = useState<string>('') // empty = all
  const [activityLimit, setActivityLimit] = useState<number>(50)

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
      const res = await fetch(`/api/orgs/${effectiveOrgId}/projects`, {
        method: 'GET',
      })
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
      const res = await fetch(`/api/orgs/${effectiveOrgId}/projects/deleted`, {
        method: 'GET',
      })
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
        setStatsResult({ ok: false, error: json?.error ?? 'Failed to load stats' })
      } else {
        setStatsResult({ ok: true, stats: json.stats })
      }
    } catch (e) {
      setStatsResult({ ok: false, error: e instanceof Error ? e.message : 'Failed to load stats' })
    } finally {
      setStatsBusy(false)
    }
  }

  async function loadActivity(opts?: { cursor?: string | null; append?: boolean; nextOrgId?: string }) {
    const effectiveOrgId = (opts?.nextOrgId ?? orgId).trim()
    if (!effectiveOrgId) return

    setActivityBusy(true)
    if (!opts?.append) setActivityResult(null)

    try {
      const qs = new URLSearchParams()
      qs.set('limit', String(activityLimit))

      if (activityAction.trim()) qs.set('action', activityAction.trim())
      if (activityEntityType.trim()) qs.set('entityType', activityEntityType.trim())
      if (activityEntityId.trim()) qs.set('entityId', activityEntityId.trim())
      if (opts?.cursor) qs.set('cursor', opts.cursor)

      const res = await fetch(`/api/orgs/${effectiveOrgId}/activity?${qs.toString()}`, {
        method: 'GET',
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setActivityResult({ ok: false, error: json?.error ?? 'Failed to load activity' })
      } else {
        const incoming: AuditEvent[] = json.events ?? []
        const nextCursor: string | null = json.nextCursor ?? null

        if (opts?.append && activityResult && 'ok' in activityResult && activityResult.ok) {
          setActivityResult({
            ok: true,
            events: [...activityResult.events, ...incoming],
            nextCursor,
          })
        } else {
          setActivityResult({ ok: true, events: incoming, nextCursor })
        }
      }
    } catch (e) {
      setActivityResult({ ok: false, error: e instanceof Error ? e.message : 'Failed to load activity' })
    } finally {
      setActivityBusy(false)
    }
  }

  // Auto-load when orgId changes (debounced-ish)
  useEffect(() => {
    const t = setTimeout(() => {
      void loadProjects(orgId)
      void loadDeletedProjects(orgId)
      void loadStats(orgId)
      void loadActivity({ nextOrgId: orgId })
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
        await loadActivity()
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
      const res = await fetch(`/api/orgs/${orgId}/projects/${projectId}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? `Delete failed (HTTP ${res.status})` })
      } else {
        setResult({ ok: true, project: json.project })
        await loadProjects()
        await loadDeletedProjects()
        await loadStats()
        await loadActivity()
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
      const res = await fetch(`/api/orgs/${orgId}/projects/${projectId}/restore`, {
        method: 'POST',
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? `Restore failed (HTTP ${res.status})` })
      } else {
        setResult({ ok: true, project: json.project })
        await loadProjects()
        await loadDeletedProjects()
        await loadStats()
        await loadActivity()
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

  const activity =
    activityResult && 'ok' in activityResult && activityResult.ok ? activityResult : null

  return (
    <main style={{ maxWidth: 980, margin: '48px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Admin</h1>
        <button
          onClick={logout}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        >
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

      <section style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
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
            disabled={projectsBusy || deletedBusy || statsBusy || activityBusy}
            onClick={() => {
              void loadProjects()
              void loadDeletedProjects()
              void loadStats()
              void loadActivity()
            }}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              cursor: projectsBusy || deletedBusy || statsBusy || activityBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {projectsBusy || deletedBusy || statsBusy || activityBusy ? 'Loading…' : 'Reload all'}
          </button>

          <span style={{ fontSize: 13, color: '#666' }}>
            Active: {activeProjects.length} · Deleted: {deletedProjects.length}
            {stats ? ` · Stats OK` : ''}
          </span>
        </div>
      </section>

      {/* ORG STATS */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Org stats</h2>

        {statsResult && 'ok' in statsResult && !statsResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {statsResult.error}
          </div>
        )}

        <pre
          style={{
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 12,
            overflow: 'auto',
          }}
        >
          {stats ? JSON.stringify(stats, null, 2) : statsBusy ? 'Loading…' : '—'}
        </pre>
      </section>

      {/* CREATE */}
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

      {/* ACTIVE PROJECTS */}
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

      {/* DELETED PROJECTS */}
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
                      <strong>deletedAt:</strong> {p.deletedAt ?? '—'}
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

      {/* ACTIVITY */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Org activity</h2>

        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#555' }}>Action</span>
              <input
                value={activityAction}
                onChange={(e) => setActivityAction(e.target.value)}
                placeholder="e.g. project.delete (empty = all)"
                style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, width: 300 }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#555' }}>Entity type</span>
              <input
                value={activityEntityType}
                onChange={(e) => setActivityEntityType(e.target.value)}
                placeholder="e.g. project (empty = all)"
                style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, width: 220 }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#555' }}>Entity ID</span>
              <input
                value={activityEntityId}
                onChange={(e) => setActivityEntityId(e.target.value)}
                placeholder="(optional)"
                style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, width: 260 }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#555' }}>Limit</span>
              <input
                value={String(activityLimit)}
                onChange={(e) => setActivityLimit(Number(e.target.value || 50))}
                style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, width: 100 }}
              />
            </label>

            <button
              disabled={activityBusy}
              onClick={() => loadActivity()}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                cursor: activityBusy ? 'not-allowed' : 'pointer',
                height: 42,
                marginTop: 18,
              }}
            >
              {activityBusy ? 'Loading…' : 'Reload activity'}
            </button>

            <button
              disabled={activityBusy}
              onClick={() => {
                setActivityAction('')
                setActivityEntityType('')
                setActivityEntityId('')
                void loadActivity()
              }}
              style={{
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ddd',
                cursor: activityBusy ? 'not-allowed' : 'pointer',
                height: 42,
                marginTop: 18,
              }}
            >
              Clear filters
            </button>
          </div>
        </div>

        {activityResult && 'ok' in activityResult && !activityResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {activityResult.error}
          </div>
        )}

        {!activity ? (
          <div style={{ fontSize: 14, color: '#666' }}>
            {activityBusy ? 'Loading…' : '—'}
          </div>
        ) : activity.events.length === 0 ? (
          <div style={{ fontSize: 14, color: '#666' }}>No activity.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              {activity.events.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 10,
                    padding: 12,
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 600 }}>
                      {ev.action}{' '}
                      <span style={{ fontWeight: 400, color: '#666' }}>
                        · {ev.entityType}:{ev.entityId}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>{ev.createdAt}</div>
                  </div>

                  <div style={{ fontSize: 12, color: '#666' }}>
                    <strong>actor:</strong> <span style={{ wordBreak: 'break-all' }}>{ev.actorUserId}</span>
                  </div>

                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 13 }}>metadata</summary>
                    <pre
                      style={{
                        marginTop: 8,
                        background: '#fafafa',
                        border: '1px solid #eee',
                        borderRadius: 8,
                        padding: 10,
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(ev.metadata ?? {}, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                disabled={activityBusy || !activity.nextCursor}
                onClick={() => loadActivity({ cursor: activity.nextCursor, append: true })}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  cursor: activityBusy || !activity.nextCursor ? 'not-allowed' : 'pointer',
                }}
              >
                {activity.nextCursor ? (activityBusy ? 'Loading…' : 'Load more') : 'No more'}
              </button>

              <span style={{ fontSize: 13, color: '#666' }}>
                Showing {activity.events.length} event(s)
              </span>
            </div>
          </>
        )}
      </section>

      {/* RESULT */}
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