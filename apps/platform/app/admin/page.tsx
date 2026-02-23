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
  | { ok: true; project: Project }
  | { ok?: false; error: string }
  | null

type ProjectsResult =
  | { ok: true; projects: Project[] }
  | { ok?: false; error: string }
  | null

type OrgStats = {
  org: {
    id: string
    name: string
    slug: string | null
    createdAt?: string | null
    updatedAt?: string | null
  }
  counts: {
    users: number
    projectsActive: number
    projectsDeleted: number
  }
  billing: {
    planKey: string | null
    status: string | null
    currentPeriodEnd: string | null
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
  } | null
}

type OrgStatsResult =
  | { ok: true; stats: OrgStats }
  | { ok?: false; error: string }
  | null

type RequestBody = {
  name?: string
  slug?: string
}

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

  async function safeJson(res: Response) {
    // Včasih (proxy/edge) lahko vrne prazen body -> no "Unexpected end of JSON"
    const text = await res.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
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
      const json = await safeJson(res)

      if (!res.ok) {
        setProjectsResult({
          ok: false,
          error: (json as any)?.error ?? `Failed to load projects (HTTP ${res.status})`,
        })
      } else {
        setProjectsResult({ ok: true, projects: (json as any)?.projects ?? [] })
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
      const json = await safeJson(res)

      if (!res.ok) {
        setDeletedResult({
          ok: false,
          error:
            (json as any)?.error ?? `Failed to load deleted projects (HTTP ${res.status})`,
        })
      } else {
        setDeletedResult({ ok: true, projects: (json as any)?.projects ?? [] })
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
      const res = await fetch(`/api/orgs/${effectiveOrgId}/stats`, {
        method: 'GET',
      })
      const json = await safeJson(res)

      if (!res.ok) {
        setStatsResult({
          ok: false,
          error: (json as any)?.error ?? `Failed to load stats (HTTP ${res.status})`,
        })
      } else {
        setStatsResult({ ok: true, stats: (json as any) as OrgStats })
      }
    } catch (e) {
      setStatsResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to load stats',
      })
    } finally {
      setStatsBusy(false)
    }
  }

  // auto-load when orgId changes (debounced-ish)
  useEffect(() => {
    const t = setTimeout(() => {
      void loadProjects(orgId)
      void loadDeletedProjects(orgId)
      void loadStats(orgId)
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function createProject() {
    setBusy(true)
    setResult(null)

    try {
      const body: RequestBody = { name, slug }
      const res = await fetch(`/api/orgs/${orgId}/projects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await safeJson(res)

      if (!res.ok) {
        setResult({
          ok: false,
          error: (json as any)?.error ?? `Create failed (HTTP ${res.status})`,
        })
      } else {
        setResult({ ok: true, project: (json as any).project })
        await loadProjects()
        await loadStats()
      }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Create failed' })
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
      const json = await safeJson(res)

      if (!res.ok) {
        setResult({
          ok: false,
          error: (json as any)?.error ?? `Delete failed (HTTP ${res.status})`,
        })
      } else {
        setResult({ ok: true, project: (json as any).project })
        await loadProjects()
        await loadDeletedProjects()
        await loadStats()
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Delete failed',
      })
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
      const json = await safeJson(res)

      if (!res.ok) {
        setResult({
          ok: false,
          error: (json as any)?.error ?? `Restore failed (HTTP ${res.status})`,
        })
      } else {
        setResult({ ok: true, project: (json as any).project })
        await loadProjects()
        await loadDeletedProjects()
        await loadStats()
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Restore failed',
      })
    } finally {
      setDeletedBusy(false)
    }
  }

  const activeProjects =
    projectsResult && 'ok' in projectsResult && projectsResult.ok
      ? projectsResult.projects
      : []

  const deletedProjects =
    deletedResult && 'ok' in deletedResult && deletedResult.ok
      ? deletedResult.projects
      : []

  const stats =
    statsResult && 'ok' in statsResult && statsResult.ok ? statsResult.stats : null

  return (
    <main style={{ maxWidth: 860, margin: '48px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Admin (test)</h1>
          <div style={{ fontSize: 13, color: '#666' }}>
            Active + Deleted projects + Org stats
          </div>
        </div>

        <button
          onClick={logout}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        >
          Logout
        </button>
      </div>

      <section style={{ marginTop: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 14, color: '#444' }}>
          <div>
            <strong>User:</strong> {userEmail ?? '—'}
          </div>
          <div style={{ wordBreak: 'break-all' }}>
            <strong>User ID:</strong> {userId ?? '—'}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Org ID</span>
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            disabled={projectsBusy || deletedBusy || statsBusy}
            onClick={() => {
              void loadProjects()
              void loadDeletedProjects()
              void loadStats()
            }}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              cursor: projectsBusy || deletedBusy || statsBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {projectsBusy || deletedBusy || statsBusy ? 'Loading…' : 'Reload all'}
          </button>

          <span style={{ fontSize: 13, color: '#666', alignSelf: 'center' }}>
            {projectsResult && 'ok' in projectsResult && projectsResult.ok
              ? `${activeProjects.length} active`
              : '—'}
            {' · '}
            {deletedResult && 'ok' in deletedResult && deletedResult.ok
              ? `${deletedProjects.length} deleted`
              : '—'}
          </span>
        </div>
      </section>

      {/* ORG OVERVIEW */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Org overview</h2>

        {statsResult && 'ok' in statsResult && !statsResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {statsResult.error}
          </div>
        )}

        {!stats && !statsBusy ? (
          <div style={{ fontSize: 14, color: '#666' }}>No stats loaded.</div>
        ) : stats ? (
          <div
            style={{
              border: '1px solid #eee',
              borderRadius: 10,
              padding: 12,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{stats.org.name}</div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  <div style={{ wordBreak: 'break-all' }}>
                    <strong>orgId:</strong> {stats.org.id}
                  </div>
                  <div>
                    <strong>slug:</strong> {stats.org.slug ?? '—'}
                  </div>
                </div>
              </div>

              <button
                disabled={statsBusy}
                onClick={() => loadStats()}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  cursor: statsBusy ? 'not-allowed' : 'pointer',
                  height: 'fit-content',
                }}
              >
                {statsBusy ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#444' }}>
                <strong>Counts:</strong>{' '}
                {stats.counts.users} users · {stats.counts.projectsActive} active projects ·{' '}
                {stats.counts.projectsDeleted} deleted
              </div>

              <div style={{ fontSize: 13, color: '#444' }}>
                <strong>Billing:</strong>{' '}
                {stats.billing
                  ? `${stats.billing.planKey ?? '—'} · ${stats.billing.status ?? '—'} · period end: ${
                      stats.billing.currentPeriodEnd ?? '—'
                    }`
                  : '—'}
              </div>

              {stats.billing && (
                <div style={{ fontSize: 12, color: '#666' }}>
                  <div style={{ wordBreak: 'break-all' }}>
                    <strong>stripeCustomerId:</strong> {stats.billing.stripeCustomerId ?? '—'}
                  </div>
                  <div style={{ wordBreak: 'break-all' }}>
                    <strong>stripeSubscriptionId:</strong>{' '}
                    {stats.billing.stripeSubscriptionId ?? '—'}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: '#666' }}>Loading…</div>
        )}
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

      {/* ACTIVE */}
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
                  disabled={projectsBusy || deletedBusy}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    cursor: projectsBusy || deletedBusy ? 'not-allowed' : 'pointer',
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

      {/* DELETED */}
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
                  disabled={deletedBusy || projectsBusy}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    cursor: deletedBusy || projectsBusy ? 'not-allowed' : 'pointer',
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