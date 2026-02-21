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

async function readJsonSafe(res: Response): Promise<any | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
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
      const json = await readJsonSafe(res)

      if (!res.ok) {
        setProjectsResult({
          ok: false,
          error:
            (json && typeof json.error === 'string' && json.error) ||
            `Failed to load projects (HTTP ${res.status})`,
        })
      } else {
        setProjectsResult({ ok: true, projects: (json?.projects ?? []) as Project[] })
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

  // auto-load projects when orgId changes
  useEffect(() => {
    setResult(null)
    const t = setTimeout(() => {
      void loadProjects(orgId)
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
      const json = await readJsonSafe(res)

      if (!res.ok) {
        setResult({
          ok: false,
          error:
            (json && typeof json.error === 'string' && json.error) ||
            `Request failed (HTTP ${res.status})`,
        })
      } else {
        setResult({ ok: true, project: json?.project })
        await loadProjects()
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
      const json = await readJsonSafe(res)

      if (!res.ok) {
        setResult({
          ok: false,
          error:
            (json && typeof json.error === 'string' && json.error) ||
            `Delete failed (HTTP ${res.status})`,
        })
      } else {
        // tudi če je body prazen, je to OK – delete je uspešen
        setResult({ ok: true, project: json?.project ?? { id: projectId } })
        await loadProjects()
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

  const projects =
    projectsResult && 'ok' in projectsResult && projectsResult.ok
      ? projectsResult.projects
      : []

  return (
    <main style={{ maxWidth: 760, margin: '48px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Admin (test)</h1>
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

      <section style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Org ID</span>
          <input
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
            {projectsBusy ? 'Loading…' : 'Reload projects'}
          </button>
          <span style={{ fontSize: 13, color: '#666' }}>
            {projectsBusy
              ? 'Loading…'
              : projectsResult && 'ok' in projectsResult && projectsResult.ok
                ? `${projects.length} project(s)`
                : '—'}
          </span>
        </div>

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
          disabled={busy || projectsBusy}
          onClick={createProject}
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd',
            cursor: busy || projectsBusy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Creating…' : 'Create project'}
        </button>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Projects</h2>

        {projectsResult && 'ok' in projectsResult && !projectsResult.ok && (
          <div style={{ padding: 12, border: '1px solid #f2c', borderRadius: 8 }}>
            <strong>Error:</strong> {projectsResult.error}
          </div>
        )}

        {projects.length === 0 ? (
          <div style={{ fontSize: 14, color: '#666' }}>No projects.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {projects.map((p) => (
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